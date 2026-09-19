/*
============================================================
EKKA1KM FRONTEND
PostProduct.js
Phase 4.1 - Product Posting System
============================================================
*/

/*
============================================================
OPEN POST PRODUCT FORM
============================================================
*/

function openPostProductForm() {
  if (!requireLogin()) return;
  openPage("postProduct");
  clearProductForm();
  if (typeof setPublishAsChoice === "function") {
    setPublishAsChoice("product", "", "Personal Listing", "Sell from your personal profile.");
  }
  // Use existing proven init from Post.js (expects prodImageUpload1/2/3 in HTML)
  if (typeof initProductImageUploads === "function") {
    initProductImageUploads();
  }
  if (typeof showPublishAsCard === "function") showPublishAsCard("product");
}

/*
============================================================
CLEAR PRODUCT FORM
============================================================
*/

function clearProductForm() {
  document.getElementById("prodTitle").value = "";
  document.getElementById("prodDesc").value = "";
  document.getElementById("prodPrice").value = "";
  document.getElementById("prodCategory").value = "";
  document.getElementById("prodCondition").value = "New";
  document.getElementById("prodBrand").value = "";
  document.getElementById("prodModel").value = "";
  document.getElementById("prodImage").value = "";
  document.getElementById("prodImage2").value = "";
  document.getElementById("prodImage3").value = "";

  var cityEl = document.getElementById("prodCity");
  var stateEl = document.getElementById("prodState");
  var pinEl = document.getElementById("prodPincode");
  var phoneEl = document.getElementById("prodPhone");
  var waEl = document.getElementById("prodWhatsapp");

  if (cityEl) { cityEl.value = ""; cityEl.style.display = ""; }
  if (stateEl) { stateEl.value = ""; stateEl.style.display = ""; }
  if (pinEl) { pinEl.value = ""; pinEl.style.display = ""; }
  if (phoneEl) { phoneEl.value = ""; phoneEl.style.display = ""; }
  if (waEl) { waEl.value = ""; waEl.style.display = ""; }

  document.getElementById("prodDelivery").value = "No";
  document.getElementById("prodCOD").value = "No";
  document.getElementById("prodNegotiable").value = "No";

  // Remove any business posting banner if present
  var banner = document.getElementById("prodBusinessPostingBanner");
  if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
}

/*
============================================================
OPEN ADD PRODUCT FOR BUSINESS
============================================================
*/

function openAddProductForBusiness(businessId) {
  if (!requireLogin()) return;
  var userId = getUserId();
  if (!userId) return;

  // Resolve business
  var business = (typeof CURRENT_BUSINESS !== "undefined" && CURRENT_BUSINESS && String(CURRENT_BUSINESS.BusinessID || CURRENT_BUSINESS.businessId) === String(businessId))
    ? CURRENT_BUSINESS
    : ((typeof CURRENT_BUSINESSES !== "undefined" && CURRENT_BUSINESSES) ? CURRENT_BUSINESSES.find(function(b) {
        return String(b.BusinessID || b.businessId) === String(businessId);
      }) : null);

  if (!business) {
    // If not in cache, fetch
    fetch(getApiUrl() + "?action=business&id=" + encodeURIComponent(businessId))
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res && res.success && res.data) {
          var norm = typeof normalizeBusinessRecord === "function" ? normalizeBusinessRecord(res.data) : res.data;
          openAddProductForBusinessWithData(norm);
        } else {
          alert("Business not found");
        }
      })
      .catch(function(err) {
        console.log("openAddProductForBusiness fetch error:", err);
        alert("Unable to load business details");
      });
    return;
  }

  openAddProductForBusinessWithData(business);
}

function openAddProductForBusinessWithData(business) {
  var userId = getUserId();
  var ownerId = String(business.OwnerUserID || business.UserID || "").trim();
  if (!ownerId || ownerId !== String(userId).trim()) {
    alert("You are not authorized to add products for this business.");
    return;
  }

  openPage("postProduct");
  clearProductForm();

  // Pre-populate inherited fields & apply Option A (hide from owner)
  var cityEl = document.getElementById("prodCity");
  var stateEl = document.getElementById("prodState");
  var pinEl = document.getElementById("prodPincode");
  var phoneEl = document.getElementById("prodPhone");
  var waEl = document.getElementById("prodWhatsapp");

  if (cityEl) { cityEl.value = business.City || ""; cityEl.style.display = "none"; }
  if (stateEl) { stateEl.value = business.State || ""; stateEl.style.display = "none"; }
  if (pinEl) { pinEl.value = business.Pincode || ""; pinEl.style.display = "none"; }
  var bizPhone = business.Phone || business.Mobile || "";
  if (phoneEl) { phoneEl.value = bizPhone; phoneEl.style.display = "none"; }
  if (waEl) { waEl.value = business.WhatsApp || ""; waEl.style.display = "none"; }

  // Set PublishAs choice
  var bizId = business.BusinessID || business.businessId || "";
  var bizName = business.BusinessName || business.Title || "Business";
  if (typeof setPublishAsChoice === "function") {
    setPublishAsChoice("product", bizId, bizName, "Posting under business profile.");
  }

  // Use existing init from Post.js
  if (typeof initProductImageUploads === "function") {
    initProductImageUploads();
  }
  if (typeof showPublishAsCard === "function") {
    showPublishAsCard("product");
  }

  // Add notification banner above the form
  var postProductPage = document.getElementById("postProduct");
  if (postProductPage) {
    var existingBanner = document.getElementById("prodBusinessPostingBanner");
    if (existingBanner && existingBanner.parentNode) existingBanner.parentNode.removeChild(existingBanner);

    var banner = document.createElement("div");
    banner.id = "prodBusinessPostingBanner";
    banner.style.cssText = "margin:10px 0 14px 0;padding:12px 14px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:10px;font-size:13px;color:#2e7d32;display:flex;align-items:center;gap:8px;";
    banner.innerHTML = '<i class="material-icons" style="font-size:20px;">store</i><span>Posting for <strong>' + (typeof escapeHtml === "function" ? escapeHtml(bizName) : bizName) + '</strong>. Location & contact details are inherited automatically.</span>';

    var card = postProductPage.querySelector(".card");
    if (card) {
      card.insertBefore(banner, card.firstChild);
    }
  }
}

/*
============================================================
SUBMIT PRODUCT
============================================================
*/

function submitProduct() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var title = document.getElementById("prodTitle").value.trim();
  var price = document.getElementById("prodPrice").value.trim();

  if (!title || !price) {
    alert("Title and Price are required");
    return;
  }

  // Detect edit mode via stored data-product-id
  var container = document.getElementById("postProduct");
  var existingId = container ? container.getAttribute("data-product-id") : null;
  var isEdit = !!existingId;

  var formData = {
    userId: userId,
    businessId: (typeof getPublishAsBusinessId === "function" && !isEdit) ? getPublishAsBusinessId("product") : "",
    title: title,
    description: document.getElementById("prodDesc").value.trim(),
    price: price,
    category: document.getElementById("prodCategory").value.trim(),
    condition: document.getElementById("prodCondition").value,
    brand: document.getElementById("prodBrand").value.trim(),
    model: document.getElementById("prodModel").value.trim(),
    imageURL: document.getElementById("prodImage").value.trim(),
    image2: document.getElementById("prodImage2").value.trim(),
    image3: document.getElementById("prodImage3").value.trim(),
    city: document.getElementById("prodCity").value.trim(),
    state: document.getElementById("prodState").value.trim(),
    pincode: document.getElementById("prodPincode").value.trim(),
    latitude: getCenterLat(),
    longitude: getCenterLng(),
    phone: document.getElementById("prodPhone").value.trim(),
    whatsapp: document.getElementById("prodWhatsapp").value.trim(),
    delivery: document.getElementById("prodDelivery").value,
    cod: document.getElementById("prodCOD").value,
    negotiable: document.getElementById("prodNegotiable").value,
    status: "Pending"
  };

  var action = isEdit ? "updateproduct" : "createproduct";
  var url = getApiUrl() + "?action=" + action;

  var params = new URLSearchParams();
  Object.keys(formData).forEach(function(key) {
    if (formData[key]) params.append(key, formData[key]);
  });

  if (isEdit) {
    params.append("productId", existingId);
  }

  fetch(url + "&" + params.toString())
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert(isEdit ? "Product updated successfully!" : "Product posted successfully!");
        // Clear edit state
        if (container) container.removeAttribute("data-product-id");
        openPage("products");
      } else {
        alert(res.message || (isEdit ? "Failed to update product" : "Failed to post product"));
      }
    })
    .catch(function(err) {
      console.log(isEdit ? "Update product error:" : "Post product error:", err);
      alert(isEdit ? "Error updating product" : "Error posting product");
    });
}

/*
============================================================
UPDATE PRODUCT
============================================================
*/

function updateProductForm(productId) {
  if (typeof clearPublishAsIndicator === "function") clearPublishAsIndicator("product");
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() + "?action=product&id=" + encodeURIComponent(productId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        var product = res.data;
        openPage("postProduct");
        if (typeof initProductImageUploads === "function") {
          initProductImageUploads();
        }

      document.getElementById("prodTitle").value = product.Title || "";
      document.getElementById("prodDesc").value = product.Description || "";
      document.getElementById("prodPrice").value = product.Price || "";
      document.getElementById("prodCategory").value = product.Category || "";
      document.getElementById("prodCondition").value = product.Condition || "New";
      document.getElementById("prodBrand").value = product.Brand || "";
      document.getElementById("prodModel").value = product.Model || "";
      document.getElementById("prodImage").value = product.ImageURL || "";
        document.getElementById("prodImage2").value = product.Image2 || "";
        document.getElementById("prodImage3").value = product.Image3 || "";
        document.getElementById("prodCity").value = product.City || "";
        document.getElementById("prodState").value = product.State || "";
        document.getElementById("prodPincode").value = product.Pincode || "";
        document.getElementById("prodPhone").value = product.Phone || "";
        document.getElementById("prodWhatsapp").value = product.WhatsApp || "";
        document.getElementById("prodDelivery").value = product.Delivery || "No";
        document.getElementById("prodCOD").value = product.COD || "No";
        document.getElementById("prodNegotiable").value = product.Negotiable || "No";

        // Ensure product ID is set for edit mode
        var container = document.getElementById("postProduct");
        if (container) {
          container.setAttribute("data-product-id", productId);
        }
      } else {
        alert("Product not found");
      }
    })
    .catch(function(err) {
      console.log("Load product error:", err);
    });
}

/*
============================================================
DELETE PRODUCT
============================================================
*/

function deleteProductConfirm(productId) {
  if (!confirm("Are you sure you want to delete this product?")) {
    return;
  }

  var userId = getUserId();
  var url = getApiUrl() + "?action=deleteproduct&productId=" + encodeURIComponent(productId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Product deleted successfully");
        loadMyProducts();
      } else {
        alert(res.message || "Failed to delete product");
      }
    })
    .catch(function(err) {
      console.log("Delete product error:", err);
    });
}

/*
============================================================
LOAD MY PRODUCTS
============================================================
*/

function loadMyProducts() {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=products&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyProducts(res.data.data || []);
      }
    })
    .catch(function(err) {
      console.log("My products error:", err);
    });
}

/*
============================================================
RENDER MY PRODUCTS
============================================================
*/

function renderMyProducts(products) {
  var container = document.getElementById("myProductsList");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<div class="dashboardEmpty">No products yet</div>';
    return;
  }

  var html = "";
  products.forEach(function(p) {
    var statusColor = p.Status === "Published" ? "#0f9d58" : p.Status === "Deleted" ? "#d32f2f" : "#888";
    html += '<div class="dashboardActivityCard">';
    html += '<div class="dashboardActivityItem">';
    html += '<div class="title">' + (p.Title || "Product") + '</div>';
    html += '<div class="meta">₹' + (p.Price || "0") + " | " + (p.Status || "") + "</div>";
    html += '<div class="meta" style="font-size:10px;color:#aaa;">' + (p.CreatedDate || "") + "</div>";
    html += '<button onclick="updateProductForm(\'' + p.ProductID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Edit</button>';
    html += '<button class="btn-danger" onclick="deleteProductConfirm(\'' + p.ProductID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Delete</button>';
    html += "</div></div>";
  });

  container.innerHTML = html;
}