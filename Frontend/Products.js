/*
============================================================
EKKA1KM FRONTEND
Products.js
Products + Product Details + Image Slider + Full Screen
V1.2
Phase 3 - Product Images System
============================================================
*/

let CURRENT_PRODUCT = null;


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
LOAD PRODUCTS
============================================================
*/

async function loadProducts() {
  const container = document.getElementById("productList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading Products...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=products&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const products = (json.data && json.data.data) || [];

    if (products.length === 0) {
      container.innerHTML = "<div class='card'>No Products Found.</div>";
      return;
    }

    let html = "";

    products.forEach(product => {
      const images = getProductImages(product);
      const firstImage = images.length > 0 ? images[0] : "";
      const imageCount = images.length;

      html += `
        <div class="product" onclick='showProductDetails(${JSON.stringify(product)})' style="cursor:pointer;">
          ${productThumbnailHTML(product, { height: "180px" })}

          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3>${product.Title || "-"}</h3>
            <span style="font-weight:700;color:var(--primary);font-size:18px;">
              ₹ ${(product.Price || 0).toLocaleString()}
            </span>
          </div>

          <p style="margin-top:6px;">
            ${product.Category || ""}
          </p>

          <p style="font-size:14px;color:#555;">
            ${product.City || ""} ${product.State ? `, ${product.State}` : ""}
          </p>

          ${product.Description
            ? `<p style="font-size:13px;color:#777;margin-top:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                ${product.Description}
              </p>`
            : ""
          }

          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            ${product.DistanceKm
              ? `<span class="badge">${product.DistanceKm} KM Away</span>`
              : ""
            }
            ${product.Condition
              ? `<span class="badge">${product.Condition}</span>`
              : ""
            }
            ${product.Negotiable === "Yes"
              ? `<span class="badge">Negotiable</span>`
              : ""
            }
          </div>

          <button
            onclick='event.stopPropagation();showProductDetails(${JSON.stringify(product)})'
            style="margin-top:10px;">
            View Details
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load products.</div>";
  }
}


/*
============================================================
PRODUCT DETAILS
============================================================
*/

function showProductDetails(product) {
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

  let html = `
  <div class="card">

    <!-- Image Slider -->
    ${productImageSliderHTML(product)}

    <h2 style="margin-top:15px;">
      ${product.Title || "-"}
    </h2>

    <p style="font-size:24px;font-weight:700;color:var(--primary);margin-top:8px;">
      ₹ ${(product.Price || 0).toLocaleString()}
    </p>

    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      ${product.Condition
        ? `<span class="badge">${product.Condition}</span>`
        : ""
      }
      ${product.Negotiable === "Yes"
        ? `<span class="badge">Negotiable</span>`
        : ""
      }
      ${product.Delivery === "Yes"
        ? `<span class="badge">Delivery Available</span>`
        : ""
      }
      ${product.COD === "Yes"
        ? `<span class="badge">COD Available</span>`
        : ""
      }
      ${product.DistanceKm
        ? `<span class="badge">${product.DistanceKm} KM Away</span>`
        : ""
      }
    </div>

    <p style="margin-top:12px;">
      ${product.Description || ""}
    </p>

    <!-- Details Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;padding:15px;background:#f9f9f9;border-radius:12px;">
      ${product.Category ? `<div><strong>Category:</strong> ${product.Category}</div>` : ""}
      ${product.Brand ? `<div><strong>Brand:</strong> ${product.Brand}</div>` : ""}
      ${product.Model ? `<div><strong>Model:</strong> ${product.Model}</div>` : ""}
      ${product.City ? `<div><strong>City:</strong> ${product.City}</div>` : ""}
      ${product.State ? `<div><strong>State:</strong> ${product.State}</div>` : ""}
      ${product.Pincode ? `<div><strong>Pincode:</strong> ${product.Pincode}</div>` : ""}
      ${product.SellerName ? `<div><strong>Seller:</strong> ${product.SellerName}</div>` : ""}
      ${product.Views !== undefined ? `<div><strong>Views:</strong> ${product.Views}</div>` : ""}
    </div>

    <!-- Price Details -->
    <div style="margin-top:15px;padding:15px;background:#fff3e0;border-radius:12px;">
      <p style="font-size:14px;">
        <strong>Price:</strong> ₹ ${(product.Price || 0).toLocaleString()}
      </p>
      ${product.Negotiable === "Yes"
        ? `<p style="font-size:14px;color:var(--primary);">Price is negotiable</p>`
        : `<p style="font-size:14px;color:#666;">Fixed price</p>`
      }
    </div>
  `;

  /*
  ============================================================
  LOGIN USER - Action Buttons
  ============================================================
  */

  if (isLogin) {
    if (isOwner) {
      html += `
        <!-- Owner view: Hide Interested & Contact Seller, show "This is your product" -->
        <div style="margin-top:15px;padding:15px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:10px;color:#2e7d32;text-align:center;font-weight:600;font-size:16px;">
          <i class="material-icons" style="font-size:20px;vertical-align:middle;">check_circle</i> This is your product
        </div>

        ${product.Phone
          ? `<button onclick="callSeller('${product.Phone}')" style="margin-top:15px;background:#25D366;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller
            </button>`
          : ""
        }

        ${product.WhatsApp
          ? `<button onclick="whatsappSeller('${product.WhatsApp}')" style="background:#25D366;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> WhatsApp
            </button>`
          : ""
        }

        <button onclick="getProductDirections()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
        </button>
      `;
    } else {
      html += `
        <button onclick="sendInterest()" style="margin-top:15px;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">favorite</i> I'm Interested
        </button>

        <button onclick="contactSeller()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> Contact Seller
        </button>

        ${product.Phone
          ? `<button onclick="callSeller('${product.Phone}')" style="background:#25D366;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller
            </button>`
          : ""
        }

        ${product.WhatsApp
          ? `<button onclick="whatsappSeller('${product.WhatsApp}')" style="background:#25D366;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> WhatsApp
            </button>`
          : ""
        }

        <button onclick="getProductDirections()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
        </button>
      `;
    }
  }

  /*
  ============================================================
  GUEST USER
  ============================================================
  */

  else {
    html += `
      <div style="margin-top:15px;padding:12px;border:1px solid #ddd;border-radius:10px;">
        <p>Login to contact seller or show your interest.</p>
        <button onclick="openPage('login')">Login</button>
        <button onclick="openPage('register')" style="background:#666;">Register</button>
      </div>
    `;
  }

  // Share button for everyone
  html += `
    <button onclick="shareProduct()">
      <i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share
    </button>

    <button onclick="reportProduct()" class="btn-danger">
      <i class="material-icons" style="font-size:18px;vertical-align:middle;">flag</i> Report Listing
    </button>

    <button onclick="loadProducts()" style="background:#666;">
      <i class="material-icons" style="font-size:18px;vertical-align:middle;">arrow_back</i> Back
    </button>
  </div>
  `;

  container.innerHTML = html;
  openPage("products");
}


/*
============================================================
SELLER ACTIONS
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