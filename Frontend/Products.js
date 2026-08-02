/*
============================================================
EKKA1KM FRONTEND
Products.js
Stage 4HIJ - Products Browsing & Detail Experience
V2.0
Preserves all canonical functionality
============================================================
*/

let CURRENT_PRODUCT = null;
let CURRENT_PRODUCTS = [];

/*
============================================================
NAMESPACED HELPERS (Stage 4HIJ)
============================================================
*/

function productSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}

function productTimeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    var now = new Date();
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    var seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "Just now";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    return date.toLocaleDateString();
  } catch (e) {
    return "";
  }
}

/*
ESCAPE HTML
*/

function escapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  var am = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var qt = String.fromCharCode(38) + "quot;";
  var ap = String.fromCharCode(38) + "#39;";
  return s.replace(/&/g, am).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, qt).replace(/'/g, ap);
}


/*
============================================================
PRODUCT VIEW ANALYTICS
============================================================
*/

function trackProductView() {
  const key = CONFIG.STORAGE_KEYS.PRODUCT_VIEWS;
  const count = (parseInt(localStorage.getItem(key) || "0") || 0) + 1;
  localStorage.setItem(key, count.toString());

  // Analytics trackevent call
  if (CURRENT_PRODUCT) {
    const userId = getUserId();
    const product = CURRENT_PRODUCT;
    
    // Client-side skip for owner (optional but clean)
    const isOwner = userId && (String(product.UserID) === String(userId) || String(product.OwnerUserID) === String(userId));
    if (isOwner) return;

    fetch(`${getApiUrl()}?action=trackevent&eventType=ProductView&entityType=Product&entityId=${product.ProductID}&userId=${userId || ""}&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`)
      .catch(err => console.log("trackProductView error:", err));
  }
}


/*
============================================================
LOAD PRODUCTS — Stage 4HIJ Redesign
============================================================
*/

async function loadProducts() {
  const container = document.getElementById("productList");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">shopping_bag</i><p>Loading Products...</p></div>';

  try {
    const response = await fetch(
      `${getApiUrl()}?action=products&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const products = (json.data && json.data.data) || [];

    if (products.length === 0) {
      container.innerHTML = '<div class="hij-empty"><i class="material-icons">shopping_bag</i><p>No Products Found.</p></div>';
      if (typeof renderHomeProductsPreview === "function") {
        renderHomeProductsPreview(products);
      }
      return;
    }

    // Marketplace Toolbar (full-width, outside product grid)
    let toolbarHtml = `
      <div class="product-marketplace-toolbar">
        <div class="product-marketplace-count">
          <strong>${products.length}</strong> ${products.length === 1 ? 'Product' : 'Products'} Found
        </div>
        <div class="product-marketplace-actions">
          <button class="product-marketplace-actionBtn" onclick="event.stopPropagation(); alert('Filters coming soon')">
            <i class="material-icons">filter_list</i>
            Filter
          </button>
          <button class="product-marketplace-actionBtn" onclick="event.stopPropagation(); alert('Sort coming soon')">
            <i class="material-icons">sort</i>
            Sort
          </button>
        </div>
      </div>
    `;

    let html = '<div class="product-listing">';

    products.forEach(product => {
      const images = getProductImages(product);
      const firstImage = images.length > 0 ? images[0] : "";
      const imageCount = images.length;
      const title = productSafeRender(product.Title) || "-";
      const price = (product.Price || 0).toLocaleString();
      const category = productSafeRender(product.Category);
      const city = productSafeRender(product.City);
      const state = productSafeRender(product.State);
      const desc = productSafeRender(product.Description);
      const distance = productSafeRender(product.DistanceKm);
      const condition = productSafeRender(product.Condition);
      const negotiable = product.Negotiable === "Yes";

      const productId = product.ProductID || product.productId || "";
      
      html += `
        <div class="productCard" onclick='showProductDetailsById("${productId}")'>
          ${firstImage
            ? `<div class="productCard-img"><img src="${firstImage}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'productCard-img productCard-imgPlaceholder\\'><i class=\\'material-icons\\'>broken_image</i></div>'"></div>`
            : `<div class="productCard-img productCard-imgPlaceholder"><i class="material-icons">shopping_bag</i></div>`
          }
          <div class="productCard-body">
            <div class="productCard-title">${title}</div>
            <div class="productCard-price">₹ ${price}</div>
            <div class="productCard-meta">
              ${category ? `<span>${category}</span>` : ""}
              ${city ? `<span>${city}${state ? ", " + state : ""}</span>` : ""}
            </div>
            ${desc ? `<div class="productCard-desc">${desc}</div>` : ""}
            <div class="productCard-badges">
              ${distance ? `<span class="productCard-badge distance">${distance} KM</span>` : ""}
              ${condition ? `<span class="productCard-badge condition">${condition}</span>` : ""}
              ${negotiable ? `<span class="productCard-badge negotiable">Negotiable</span>` : ""}
              ${imageCount > 1 ? `<span class="productCard-badge">+${imageCount - 1} photos</span>` : ""}
            </div>
            <div class="productCard-actions">
              <button class="productCard-btnPrimary" onclick='event.stopPropagation();showProductDetailsById("${productId}")'>View Details</button>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    
    // Combine toolbar + product grid
    container.innerHTML = toolbarHtml + html;

    // Store products for detail view lookup
    CURRENT_PRODUCTS = products;
    
    // Also render Home preview from the same dataset
    if (typeof renderHomeProductsPreview === "function") {
      renderHomeProductsPreview(products);
    }
  } catch (err) {
    console.log(err);
    container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Unable to load products.</p></div>';
  }
}


/*
HOME PREVIEW — NEARBY PRODUCTS (Preserved)
*/

function renderHomeProductsPreview(products) {
  const container = document.getElementById("homeNearbyProductsContent");
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = '<div class="homeSection-empty">No products found nearby.</div>';
    return;
  }

  const preview = products.slice(0, 4);
  let html = '<div class="homePreviewGrid">';

  preview.forEach(product => {
    const images = getProductImages(product);
    const firstImage = images.length > 0 ? images[0] : "";
    const productId = product.ProductID || product.productId || "";

    html += `
      <div class="homePreviewCard" onclick='showProductDetailsById("${productId}")'>
        ${firstImage
          ? `<div class="homePreviewCard-img"><img src="${firstImage}" alt="${escapeHtml(product.Title || "")}" loading="lazy"></div>`
          : `<div class="homePreviewCard-img homePreviewCard-imgPlaceholder"><span class="material-icons">shopping_bag</span></div>`
        }
        <div class="homePreviewCard-body">
          <div class="homePreviewCard-title">${product.Title || "-"}</div>
          <div class="homePreviewCard-price">₹ ${(product.Price || 0).toLocaleString()}</div>
          ${product.DistanceKm
            ? `<div class="homePreviewCard-meta">${product.DistanceKm} KM away</div>`
            : product.City
              ? `<div class="homePreviewCard-meta">${product.City}</div>`
              : ""
          }
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}


/*
============================================================
PRODUCT DETAILS — Stage 4HIJ Redesign
============================================================
*/

function showProductDetailsById(productId) {
  // Find product in loaded data first
  const product = CURRENT_PRODUCTS && CURRENT_PRODUCTS.length > 0 
    ? CURRENT_PRODUCTS.find(p => String(p.ProductID || p.productId) === String(productId))
    : null;
  
  if (product) {
    showProductDetails(product);
  } else {
    // Fetch from server
    fetch(`${getApiUrl()}?action=product&id=${encodeURIComponent(productId)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          showProductDetails(res.data);
        } else {
          alert("Product not found.");
        }
      })
      .catch(err => {
        console.log("Product fetch error:", err);
        alert("Unable to load product details.");
      });
  }
}

function showProductDetails(product) {
  if (!product) return;
  CURRENT_PRODUCT = product;
  trackProductView();

  const container = document.getElementById("productList");
  if (!container) return;

  const isLogin = !!getCurrentUser();
  const userId = getUserId();
  const isOwner = userId && (String(product.UserID) === String(userId) || String(product.OwnerUserID) === String(userId));
  const images = getProductImages(product);
  
  // Frontend validation: Log self-view for debugging
  if (isOwner) {
    console.log("Seller self-view skipped for product:", product.ProductID);
  }

  const title = productSafeRender(product.Title) || "-";
  const price = (product.Price || 0).toLocaleString();
  const desc = productSafeRender(product.Description);
  const category = productSafeRender(product.Category);
  const city = productSafeRender(product.City);
  const state = productSafeRender(product.State);
  const pincode = productSafeRender(product.Pincode);
  const condition = productSafeRender(product.Condition);
  const brand = productSafeRender(product.Brand);
  const model = productSafeRender(product.Model);
  const sellerName = productSafeRender(product.SellerName);
  const phone = productSafeRender(product.Phone);
  const whatsapp = productSafeRender(product.WhatsApp);
  const delivery = product.Delivery === "Yes";
  const cod = product.COD === "Yes";
  const negotiable = product.Negotiable === "Yes";
  const distance = productSafeRender(product.DistanceKm);
  const views = product.Views !== undefined ? product.Views : null;

  let html = '<div class="hij-detail">';

  // Back button
  html += `<button class="hij-backBtn" onclick="loadProducts()"><i class="material-icons">arrow_back</i> Back to Products</button>`;

  // Image section
  if (images.length > 0) {
    html += productImageSliderHTML(product);
  } else {
    html += `
      <div class="hij-detail-image">
        <i class="material-icons">shopping_bag</i>
      </div>
    `;
  }

  // Title & Price
  html += `
    <div class="hij-detail-title">${title}</div>
    <div class="hij-detail-price">₹ ${price}</div>
  `;

  // Badges
  html += '<div class="hij-detail-badges">';
  if (condition) html += `<span class="hij-detail-badge">${condition}</span>`;
  if (negotiable) html += `<span class="hij-detail-badge">Negotiable</span>`;
  if (delivery) html += `<span class="hij-detail-badge">Delivery Available</span>`;
  if (cod) html += `<span class="hij-detail-badge">COD Available</span>`;
  if (distance) html += `<span class="hij-detail-badge">${distance} KM Away</span>`;
  html += '</div>';

  // Description
  if (desc) {
    html += `<div class="hij-detail-desc">${desc}</div>`;
  }

  // Details Grid
  html += '<div class="hij-detail-grid">';
  if (category) html += `<div class="hij-detail-gridItem"><strong>Category</strong>${category}</div>`;
  if (brand) html += `<div class="hij-detail-gridItem"><strong>Brand</strong>${brand}</div>`;
  if (model) html += `<div class="hij-detail-gridItem"><strong>Model</strong>${model}</div>`;
  if (city) html += `<div class="hij-detail-gridItem"><strong>City</strong>${city}</div>`;
  if (state) html += `<div class="hij-detail-gridItem"><strong>State</strong>${state}</div>`;
  if (pincode) html += `<div class="hij-detail-gridItem"><strong>Pincode</strong>${pincode}</div>`;
  if (sellerName) html += `<div class="hij-detail-gridItem"><strong>Seller</strong>${sellerName}</div>`;
  if (views !== null) html += `<div class="hij-detail-gridItem"><strong>Views</strong>${views}</div>`;
  html += '</div>';

  // Price Box
  html += '<div class="hij-detail-priceBox">';
  html += `<p style="font-size:14px;"><strong>Price:</strong> ₹ ${price}</p>`;
  if (negotiable) {
    html += `<p style="font-size:14px;color:var(--primary);">Price is negotiable</p>`;
  } else {
    html += `<p style="font-size:14px;color:#666;">Fixed price</p>`;
  }
  html += '</div>';

  /*
  ============================================================
  LOGIN USER - Action Buttons
  ============================================================
  */

  html += '<div class="hij-detail-actions">';

  if (isLogin) {
    if (isOwner) {
      html += `
        <div style="padding:12px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:10px;color:#2e7d32;text-align:center;font-weight:600;font-size:14px;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">check_circle</i> This is your product
        </div>
      `;

      if (phone) {
        html += `<button onclick="callSeller('${phone}')" style="background:#25D366;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller
        </button>`;
      }

      if (whatsapp) {
        html += `<button onclick="whatsappSeller('${whatsapp}')" style="background:#25D366;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> WhatsApp
        </button>`;
      }

      html += `<button onclick="getProductDirections()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
      </button>`;
    } else {
      html += `<button onclick="sendInterest()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">favorite</i> I'm Interested
      </button>`;

      html += `<button onclick="contactSeller()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> Contact Seller
      </button>`;

      if (phone) {
        html += `<button onclick="callSeller('${phone}')" style="background:#25D366;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller
        </button>`;
      }

      if (whatsapp) {
        html += `<button onclick="whatsappSeller('${whatsapp}')" style="background:#25D366;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> WhatsApp
        </button>`;
      }

      html += `<button onclick="getProductDirections()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
      </button>`;
    }
  }

  /*
  ============================================================
  GUEST USER
  ============================================================
  */

  else {
    html += `
      <div class="hij-detail-guest">
        <p>Login to contact seller or show your interest.</p>
        <button class="btnLogin" onclick="openPage('login')">Login</button>
        <button class="btnRegister" onclick="openPage('register')">Register</button>
      </div>
    `;
  }

  // Share button for everyone
  html += `<button onclick="shareProduct()" style="background:#666;">
    <i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share
  </button>`;

  // Report
  html += `<button onclick="reportProduct()" class="btn-danger" style="background:var(--danger);">
    <i class="material-icons" style="font-size:18px;vertical-align:middle;">flag</i> Report Listing
  </button>`;

  html += '</div>'; // actions
  html += '</div>'; // hij-detail

  container.innerHTML = html;
  openPage("products");
}


/*
============================================================
SELLER ACTIONS (Preserved)
============================================================
*/

function contactSeller() {
  if (!requireLogin()) return;
  if (!CURRENT_PRODUCT) return;

  // Frontend validation: Prevent seller from contacting themselves
  const userId = getUserId();
  const sellerId = CURRENT_PRODUCT.OwnerUserID || CURRENT_PRODUCT.UserID || "";
  if (userId && sellerId && String(userId) === String(sellerId)) {
    alert("You cannot interact with your own product.");
    return;
  }

  if (typeof notifyProductInterest === "function") {
    notifyProductInterest(CURRENT_PRODUCT);
  }

  alert("Your interest has been sent to the seller.");
}

function callSeller(phone) {
  if (!phone) {
    alert("Seller phone number not available.");
    return;
  }
  window.location.href = `tel:${phone}`;
}

function whatsappSeller(wa) {
  if (!wa) {
    alert("WhatsApp number not available.");
    return;
  }
  window.open(`https://wa.me/${wa.replace(/[^0-9]/g, "")}`, "_blank");
}

function getProductDirections() {
  if (!CURRENT_PRODUCT) return;
  const lat = CURRENT_PRODUCT.Latitude || CURRENT_LAT;
  const lng = CURRENT_PRODUCT.Longitude || CURRENT_LNG;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}

function shareProduct() {
  if (!CURRENT_PRODUCT) return;
  const text = `${CURRENT_PRODUCT.Title || ""}\n₹ ${(CURRENT_PRODUCT.Price || 0).toLocaleString()}\n${CURRENT_PRODUCT.Description || ""}\n${CURRENT_PRODUCT.City || ""}`;
  if (navigator.share) {
    navigator.share({ title: CURRENT_PRODUCT.Title, text });
  } else {
    navigator.clipboard.writeText(text);
    alert("Product details copied.");
  }
}

function reportProduct() {
  if (!CURRENT_PRODUCT) return;
  alert("Report submitted. We will review this listing.");
}


/*
============================================================
INTEREST (backward compatible)
============================================================
*/

async function sendInterest() {
  if (!requireLogin()) return;
  if (!CURRENT_PRODUCT) return;

  // Frontend validation: Prevent seller from expressing interest in their own product
  const userId = getUserId();
  const sellerId = CURRENT_PRODUCT.OwnerUserID || CURRENT_PRODUCT.UserID || "";
  if (userId && sellerId && String(userId) === String(sellerId)) {
    alert("You cannot interact with your own product.");
    return;
  }

  if (typeof notifyProductInterest === "function") {
    notifyProductInterest(CURRENT_PRODUCT);
  }

  alert("Interest request sent to seller.");
}


/*
============================================================
SELLER CONTACT (backward compatible)
============================================================
*/

function requestSellerContact() {
  if (!requireLogin()) return;
  if (!CURRENT_PRODUCT) return;
  alert("Seller contact permission request sent.");
}