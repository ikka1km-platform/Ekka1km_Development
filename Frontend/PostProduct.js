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
  // Use existing proven init from Post.js (expects prodImageUpload1/2/3 in HTML)
  if (typeof initProductImageUploads === "function") {
    initProductImageUploads();
  }
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
  document.getElementById("prodCity").value = "";
  document.getElementById("prodState").value = "";
  document.getElementById("prodPincode").value = "";
  document.getElementById("prodPhone").value = "";
  document.getElementById("prodWhatsapp").value = "";
  document.getElementById("prodDelivery").value = "No";
  document.getElementById("prodCOD").value = "No";
  document.getElementById("prodNegotiable").value = "No";
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