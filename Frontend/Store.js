/*
============================================================
EKKA1KM FRONTEND
Store.js
Stage 4HIJ - Store Page Redesign
V2.1
Preserves: openStore, follow/unfollow, share, store products
============================================================
*/

var CURRENT_STORE = null;

/*
============================================================
ALIAS FUNCTION — called from Businesses.js
============================================================
*/

function openStorePage(business) {
  const businessId = business.BusinessID || business.id;
  if (businessId) {
    openStore(businessId);
  } else {
    console.log("openStorePage: No BusinessID found");
  }
}


/*
============================================================
OPEN STORE — Stage 4HIJ Redesign
============================================================
*/

function openStore(businessId) {
  if (typeof enterDetailView === "function") {
    enterDetailView("store", businessId);
  } else {
    openPage("store");
  }

  var container = document.getElementById("storeContent");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">store</i><p>Loading store...</p></div>';

  var userId = getUserId();

  var url = getApiUrl() +
    "?action=getstore" +
    "&businessId=" + encodeURIComponent(businessId);

  if (userId) {
    url += "&userId=" + encodeURIComponent(userId);
  }

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        CURRENT_STORE = res.data;
        CURRENT_STORE.businessId = businessId;
        renderStore(res.data, businessId);
      } else {
        CURRENT_STORE = null;
        container.innerHTML =
          '<div class="hij-empty"><i class="material-icons">store</i><p>Store not found</p></div>' +
          '<button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back</button>';
      }
    })
    .catch(function(err) {
      console.log("Store error:", err);
      CURRENT_STORE = null;
      container.innerHTML =
        '<div class="hij-error"><i class="material-icons">error_outline</i><p>Error loading store</p></div>' +
        '<button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back</button>';
    });
}


/*
============================================================
RENDER STORE — Stage 4HIJ Redesign
============================================================
*/

function renderStore(data, businessId) {
  var container = document.getElementById("storeContent");
  if (!container) return;

  var business = data.business || {};
  var owner = data.owner || {};

  var name = business.Title || business.BusinessName || "Store";
  var category = business.Category || "";
  var description = business.Description || "";
  var address = business.Address || "";
  var phone = business.Phone || "";
  var email = business.Email || "";
  var website = business.Website || "";
  var logo = business.Logo || "";
  var coverImage = business.CoverImage || "";

  var followerCount = data.followerCount || 0;
  var productsCount = data.productsCount || 0;

  var followBtnHtml = "";
  if (getUserId()) {
    if (data.isFollowing) {
      followBtnHtml = '<button class="productCard-btnSecondary" onclick="unfollowStore(\'' + businessId + '\')" style="margin-top:10px;">Unfollow Store</button>';
    } else {
      followBtnHtml = '<button class="productCard-btnPrimary" onclick="followStore(\'' + businessId + '\')" style="margin-top:10px;">Follow Store</button>';
    }
  }

  // Owner Info
  var ownerHtml = "";
  if (owner && owner.name) {
    ownerHtml = '<div class="store-hij-section" style="margin-top:10px;">' +
      '<h3>Owner</h3>' +
      '<p style="font-size:14px;font-weight:500;color:var(--text-primary);">' + (owner.name || "") + '</p>' +
      '<p style="font-size:12px;color:#888;">' + (owner.mobile || "") + '</p>' +
      '</div>';
  }

  var html = "";

  // Back button
  html += '<button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back</button>';

  // Store Header
  html += '<div class="store-hij-header">';
  // Cover
  html += '<div class="store-hij-cover">';
  if (coverImage) {
    html += '<img src="' + coverImage + '" alt="Cover" onerror="this.style.display=\'none\'">';
  }
  html += '</div>';

  // Info section
  html += '<div class="store-hij-info">';
  // Logo
  html += '<div class="store-hij-logo">';
  if (logo) {
    html += '<img src="' + logo + '" alt="Logo" onerror="this.parentElement.innerHTML=\'<span class=\\\'store-hij-logoPlaceholder\\\'>' + name.charAt(0).toUpperCase() + '</span>\'">';
  } else {
    html += '<span class="store-hij-logoPlaceholder">' + name.charAt(0).toUpperCase() + '</span>';
  }
  html += '</div>';

  html += '<div class="store-hij-name">' + name + '</div>';
  if (category) html += '<div class="store-hij-category">' + category + '</div>';
  if (description) html += '<div class="store-hij-desc">' + description + '</div>';

  // Stats
  html += '<div class="store-hij-stats">';
  html += '<span>👤 ' + followerCount + ' followers</span>';
  html += '<span>📦 ' + productsCount + ' products</span>';
  html += '</div>';

  // Actions
  html += '<div class="store-hij-actions">';
  html += followBtnHtml;
  html += '<button class="productCard-btnSecondary" onclick="shareStore(\'' + businessId + '\')" style="font-size:12px;">Share Store</button>';
  html += '</div>';

  html += '</div>'; // store-hij-info
  html += '</div>'; // store-hij-header

  // Owner info
  html += ownerHtml;

  // Contact Section
  html += '<div class="store-hij-section">';
  html += '<h3>Contact</h3>';
  if (phone) html += '<div class="store-hij-contactItem"><i class="material-icons">phone</i>' + phone + '</div>';
  if (email) html += '<div class="store-hij-contactItem"><i class="material-icons">email</i>' + email + '</div>';
  if (website) html += '<div class="store-hij-contactItem"><i class="material-icons">language</i>' + website + '</div>';
  if (address) html += '<div class="store-hij-contactItem"><i class="material-icons">location_on</i>' + address + '</div>';
  html += '</div>';

  // Products Section
  html += '<div class="store-hij-section">';
  html += '<h3>Products</h3>';
  html += '<div id="storeProductsList"><p style="text-align:center;color:#888;font-size:13px;">Loading products...</p></div>';
  html += '</div>';

  // Properties Section
  html += '<div class="store-hij-section">';
  html += '<h3>Properties</h3>';
  html += '<div id="storePropertiesList"><p style="text-align:center;color:#888;font-size:13px;">Loading properties...</p></div>';
  html += '</div>';

  container.innerHTML = html;

  // Load products separately
  loadStoreProducts(businessId);
  // Load properties separately
  loadStoreProperties(businessId);
}


/*
============================================================
LOAD STORE PRODUCTS (Preserved)
============================================================
*/

function loadStoreProducts(businessId) {
  var url = getApiUrl() +
    "?action=getstoreproducts" +
    "&businessId=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var list = document.getElementById("storeProductsList");
      if (!list) return;

      if (res && res.success && res.data && res.data.data && res.data.data.length > 0) {
        var html = "";
        res.data.data.forEach(function(p) {
          html += '<div class="store-hij-productItem">' +
            '<span class="store-hij-productName">' + (p.Title || "Product") + '</span>' +
            '<span class="store-hij-productPrice">₹' + (p.Price || "0") + '</span>' +
            '</div>';
        });
        list.innerHTML = html;
      } else {
        list.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;">No products yet</p>';
      }
    })
    .catch(function(err) {
      console.log("Store products error:", err);
    });
}


/* ============================================================
   LOAD STORE PROPERTIES
   ============================================================ */

function loadStoreProperties(businessId) {
  var url = getApiUrl() +
    "?action=getstoreproperties" +
    "&businessId=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var list = document.getElementById("storePropertiesList");
      if (!list) return;

      if (res && res.success && res.data && res.data.data && res.data.data.length > 0) {
        var html = "";
        res.data.data.forEach(function(p) {
          html += '<div class="store-hij-productItem">' +
            '<span class="store-hij-productName">' + (p.Title || "Property") + '</span>' +
            '<span class="store-hij-productPrice">₹' + (p.Price || "0") + '</span>' +
            '</div>';
        });
        list.innerHTML = html;
      } else {
        list.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;">No properties yet</p>';
      }
    })
    .catch(function(err) {
      console.log("Store properties error:", err);
    });
}


/*
============================================================
FOLLOW STORE (Preserved)
============================================================
*/

function followStore(businessId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() +
    "?action=followstore" +
    "&userId=" + encodeURIComponent(userId) +
    "&businessId=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        openStore(businessId);
      } else {
        alert(res.message || "Failed to follow store");
      }
    })
    .catch(function(err) {
      console.log("Follow error:", err);
    });
}


/*
============================================================
UNFOLLOW STORE (Preserved)
============================================================
*/

function unfollowStore(businessId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() +
    "?action=unfollowstore" +
    "&userId=" + encodeURIComponent(userId) +
    "&businessId=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        openStore(businessId);
      } else {
        alert(res.message || "Failed to unfollow store");
      }
    })
    .catch(function(err) {
      console.log("Unfollow error:", err);
    });
}


/*
============================================================
SHARE STORE (Preserved)
============================================================
*/

function shareStore(businessId) {
  if (!businessId) return;

  var baseUrl = (window.location && window.location.origin) ? window.location.origin : "https://ekka1km.ikka1-km.workers.dev";
  var canonicalUrl = baseUrl + "/store/" + encodeURIComponent(businessId);

  var biz = (CURRENT_STORE && CURRENT_STORE.business) ? CURRENT_STORE.business : (CURRENT_STORE || {});
  var storeName = String(biz.Title || biz.BusinessName || "Store").trim();
  var category = String(biz.Category || "").trim();
  var city = String(biz.City || "").trim();

  var shareTitle = (storeName !== "Store" ? storeName : "Ekka1km Store") + " — Ekka1km";
  var shareText = "Check out " + storeName + " on Ekka1km.";
  if (category && city) {
    shareText = storeName + " (" + category + ") in " + city + " — on Ekka1km.";
  } else if (category) {
    shareText = storeName + " (" + category + ") — on Ekka1km.";
  } else if (city) {
    shareText = storeName + " in " + city + " — on Ekka1km.";
  }

  var shareData = {
    title: shareTitle,
    text: shareText,
    url: canonicalUrl
  };

  var shareFn = (typeof ekkaNativeShare === "function") ? ekkaNativeShare : (navigator.share ? navigator.share.bind(navigator) : null);

  if (shareFn) {
    shareFn(shareData)
      .then(function(res) {
        if (res && res.canceled) return;
        trackStoreShare(businessId);
      })
      .catch(function(err) {
        if (err && (err.name === "AbortError" || String(err).indexOf("AbortError") !== -1 || String(err).toLowerCase().includes("cancel"))) {
          return;
        }
        copyStoreUrlToClipboard(canonicalUrl, businessId);
      });
  } else {
    copyStoreUrlToClipboard(canonicalUrl, businessId);
  }
}

function copyStoreUrlToClipboard(url, businessId) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText(url)
      .then(function() {
        showStoreShareToast("Store link copied to clipboard!");
        trackStoreShare(businessId);
      })
      .catch(function() {
        fallbackExecCommandStoreCopy(url, businessId);
      });
  } else {
    fallbackExecCommandStoreCopy(url, businessId);
  }
}

function fallbackExecCommandStoreCopy(url, businessId) {
  try {
    var temp = document.createElement("input");
    temp.style.position = "fixed";
    temp.style.top = "-9999px";
    temp.style.opacity = "0";
    temp.value = url;
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    var success = document.execCommand("copy");
    document.body.removeChild(temp);
    if (success) {
      showStoreShareToast("Store link copied to clipboard!");
      trackStoreShare(businessId);
    } else {
      showStoreShareToast("Unable to copy store link");
    }
  } catch (e) {
    showStoreShareToast("Unable to copy store link");
  }
}

function showStoreShareToast(msg) {
  if (typeof showToast === "function") {
    showToast(msg);
    return;
  }
  var existing = document.getElementById("storeShareToast");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  var toast = document.createElement("div");
  toast.id = "storeShareToast";
  toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1f2937;color:#ffffff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:999999;box-shadow:0 4px 14px rgba(0,0,0,0.25);max-width:90%;text-align:center;pointer-events:none;transition:opacity 0.25s ease;";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = "0";
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 2500);
}

function trackStoreShare(businessId) {
  if (!businessId) return;
  try {
    var userId = typeof getUserId === "function" ? getUserId() : "";
    var url2 = (typeof getApiUrl === "function" ? getApiUrl() : "") +
      "?action=sharestore" +
      "&businessId=" + encodeURIComponent(businessId);

    if (userId) {
      url2 += "&userId=" + encodeURIComponent(userId);
    }

    fetch(url2).catch(function() {});
  } catch (e) {}
}