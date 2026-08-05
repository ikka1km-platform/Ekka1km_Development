/*
============================================================
EKKA1KM FRONTEND
Interests.js
Stage 4HIJ - Interests Management Experience
V2.0
Preserves canonical interest functionality
============================================================
*/

/*
============================================================
NAMESPACED HELPERS (Stage 4HIJ)
============================================================
*/

function interestSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}


/*
============================================================
SAVED-DATE FORMATTING
============================================================
*/

function interestFormatDate(dateVal) {
  if (!dateVal) return "";
  if (typeof timeAgo === "function") {
    var ago = timeAgo(dateVal);
    if (ago) return ago;
  }
  var d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d.toLocaleDateString();
  return String(dateVal).substring(0, 10);
}


/*
============================================================
USER INTEREST STATE CACHE  (one client-side source of truth)
Backed by ?action=getmyinterests -> UserInterests sheet.
============================================================
*/

var USER_INTEREST_CACHE = null;         // Set of "Type|TargetID" keys
var USER_INTEREST_CACHE_TS = 0;         // last successful resolve (ms)
var USER_INTEREST_CACHE_PROMISE = null; // in-flight promise (dedupes loads)

function getInterestCacheKey(type, id) {
  return String(type) + "|" + String(id);
}

// Loads the current user's ACTIVE interests once and caches for 30s.
// Returns a Promise resolving to a Set of "Type|TargetID" keys.
function loadUserInterestSet() {
  var userId = getUserId();
  if (!userId) {
    USER_INTEREST_CACHE = null;
    USER_INTEREST_CACHE_PROMISE = null;
    return Promise.resolve(new Set());
  }
  if (USER_INTEREST_CACHE && (Date.now() - USER_INTEREST_CACHE_TS < 30000)) {
    return Promise.resolve(USER_INTEREST_CACHE);
  }
  if (USER_INTEREST_CACHE_PROMISE) return USER_INTEREST_CACHE_PROMISE;

  var url = getApiUrl() + "?action=getmyinterests&userId=" + encodeURIComponent(userId);
  USER_INTEREST_CACHE_PROMISE = fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var set = new Set();
      if (res && res.success && res.data) {
        var arr = Array.isArray(res.data) ? res.data : (res.data.data || []);
        arr.forEach(function(it) {
          var t = it.targetType || it.Type || "";
          var id = it.targetId || it.ReferenceID || "";
          if (t && id) set.add(getInterestCacheKey(t, id));
        });
      }
      USER_INTEREST_CACHE = set;
      USER_INTEREST_CACHE_TS = Date.now();
      USER_INTEREST_CACHE_PROMISE = null;
      return set;
    })
    .catch(function() {
      USER_INTEREST_CACHE = null;
      USER_INTEREST_CACHE_PROMISE = null;
      return new Set();
    });
  return USER_INTEREST_CACHE_PROMISE;
}

// Force the next read to refetch (call after add/remove).
function invalidateUserInterestCache() {
  USER_INTEREST_CACHE = null;
  USER_INTEREST_CACHE_TS = 0;
  USER_INTEREST_CACHE_PROMISE = null;
}

// Sync every visible wishlist heart on the current page to the saved state.
function refreshInterestHearts() {
  return loadUserInterestSet().then(function(set) {
    var hearts = document.querySelectorAll("[data-interest-type][data-interest-id]");
    for (var i = 0; i < hearts.length; i++) {
      var el = hearts[i];
      var t = el.getAttribute("data-interest-type") || "";
      var id = el.getAttribute("data-interest-id") || "";
      if (!t || !id) continue;
      var icon = el.querySelector("i");
      if (set.has(getInterestCacheKey(t, id))) {
        el.classList.add("active");
        if (icon) icon.textContent = "favorite";
      } else {
        el.classList.remove("active");
        if (icon) icon.textContent = "favorite_border";
      }
    }
    return set;
  });
}


/*
============================================================
UNIFIED INTEREST -> DETAIL NAVIGATION
Reuses the existing detail pages (by ID) for all 4 content types.
============================================================
*/

function openInterestDetail(type, id) {
  if (!type || !id) return;
  type = String(type);
  id = String(id);

  var pageMap = { "Product": "products", "Business": "businesses", "Property": "properties", "News": "news" };
  var fnMap   = { "Product": "showProductDetailsById", "Business": "showBusinessDetailsById", "Property": "showPropertyDetailsById", "News": "showNewsDetailsById" };

  var page = pageMap[type];
  var fn = fnMap[type] ? window[fnMap[type]] : null;

  if (!page || typeof fn !== "function") {
    alert("Unable to open this item.");
    return;
  }

  // openPage() is a no-op when already on the target page.
  openPage(page);
  // Allow the target page container to become active before rendering the detail.
  setTimeout(function() { fn(id); }, 100);
}


/*
============================================================
LOAD MY INTERESTS — Stage 4HIJ Redesign
============================================================
*/

function loadMyInterests() {
  var userId = getUserId();
  if (!userId) {
    document.getElementById("interestsList").innerHTML =
      '<div class="hij-empty"><i class="material-icons">favorite_border</i><p>Please login to see your interests</p></div>';
    return;
  }

  var container = document.getElementById("interestsList");

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">favorite</i><p>Loading interests...</p></div>';

  var url = getApiUrl() +
    "?action=getmyinterests" +
    "&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyInterests(res.data);
      } else {
        container.innerHTML = '<div class="hij-empty"><i class="material-icons">favorite_border</i><p>No interests found</p></div>';
      }
    })
    .catch(function(err) {
      console.log("Interests error:", err);
      container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Error loading interests</p></div>';
    });
}


/*
============================================================
RENDER MY INTERESTS — Stage 4HIJ Redesign
============================================================
*/

function renderMyInterests(data) {
  var container = document.getElementById("interestsList");
  if (!container) return;

  // data can be an array directly or have a data property
  var interests = Array.isArray(data) ? data : (data.data || data.interests || []);

  if (!interests || interests.length === 0) {
    container.innerHTML = '<div class="hij-empty"><i class="material-icons">favorite_border</i><p>No interests yet</p>' +
      '<p style="font-size:12px;color:#888;margin-top:6px;">Browse products, businesses, properties or news and tap the ❤️ to save them here.</p></div>';
    return;
  }

  var html = '';

  interests.forEach(function(item) {
    var type = interestSafeRender(item.Type) || interestSafeRender(item.type) || "General";

    // Nested target row — the actual Product/Business/Property/News record
    var targetData = item.targetData || item.targetdata || {};

    // Title — read from the nested target row first (per content type), then the interest envelope
    var title = interestSafeRender(targetData.Title) || interestSafeRender(targetData.BusinessName) || interestSafeRender(targetData.Name) || interestSafeRender(item.Title) || interestSafeRender(item.title) || "-";
    var refId = interestSafeRender(item.ReferenceID) || interestSafeRender(item.referenceId) || interestSafeRender(item.targetId) || interestSafeRender(item.id) || "";
    var interestId = interestSafeRender(item.InterestID) || interestSafeRender(item.interestId) || "";
    var status = interestSafeRender(item.Status) || interestSafeRender(item.status) || "";
    var createdAt = interestSafeRender(item.CreatedDate) || interestSafeRender(item.createdAt) || interestSafeRender(item.date) || "";

    // Image extraction from nested targetData (per content type)
    // Product → ImageURL (then Image2..Image5, like getProductImages()),
    // Property → Images (CSV, first), News → Image, Business → CoverImage then Logo
    var img = "";
    if (targetData.ImageURL) {
      img = String(targetData.ImageURL).trim();
    } else if (targetData.Image2) {
      img = String(targetData.Image2).trim();
    } else if (targetData.Image3) {
      img = String(targetData.Image3).trim();
    } else if (targetData.Image4) {
      img = String(targetData.Image4).trim();
    } else if (targetData.Image5) {
      img = String(targetData.Image5).trim();
    } else if (targetData.Images) {
      img = String(targetData.Images).split(",")[0].trim();
    } else if (targetData.Image) {
      img = String(targetData.Image).trim();
    } else if (targetData.CoverImage) {
      img = String(targetData.CoverImage).trim();
    } else if (targetData.Logo) {
      img = String(targetData.Logo).trim();
    }

    // Price extraction (Product/Property only; absent for Business/News)
    var price = "";
    if (targetData.Price !== undefined && targetData.Price !== null && targetData.Price !== "") {
      var priceNum = Number(targetData.Price);
      if (!isNaN(priceNum)) {
        price = "₹ " + priceNum.toLocaleString();
      }
    }

    // Per-type placeholder icon (matches Home preview cards)
    var placeholderIcon = "favorite";
    if (type === "Product") placeholderIcon = "shopping_bag";
    else if (type === "Business") placeholderIcon = "store";
    else if (type === "Property") placeholderIcon = "real_estate_agent";
    else if (type === "News") placeholderIcon = "newspaper";

    // Escaped args for inline onclick handlers (IDs are UUID-based, but guard anyway)
    var navArg = String(refId).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    var typeArg = String(type).replace(/'/g, "\\'");
    var interestIdArg = String(interestId).replace(/'/g, "\\'");
    var savedLabel = interestFormatDate(createdAt);

    html += '<div class="interest-hij-card" data-interest-type="' + type + '" data-interest-id="' + refId + '">';
    // Clicking anywhere on the card content opens the ORIGINAL detail page.
    html += '<div class="interest-hij-left" style="cursor:pointer;" onclick="openInterestDetail(\'' + typeArg + '\',\'' + navArg + '\')">';

    // Thumbnail — matches Home preview card style; placeholder shows through if image fails
    html += '<div class="homePreviewCard-img homePreviewCard-imgPlaceholder" style="position:relative;flex-shrink:0;">';
    html += '<span class="material-icons">' + placeholderIcon + '</span>';
    if (img) {
      html += '<img src="' + img + '" alt="' + title.replace(/"/g, "&quot;") + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
    }
    html += '</div>';

    html += '<div class="interest-hij-type">' + type + '</div>';
    html += '<div class="interest-hij-title">' + title + '</div>';
    if (price) {
      html += '<div class="interest-hij-price" style="font-weight:600;color:var(--primary);font-size:14px;margin-top:2px;">' + price + '</div>';
    }
    html += '<div class="interest-hij-meta">';
    if (savedLabel) html += '<span>Saved ' + savedLabel + '</span>';
    if (status && status !== "Active") html += ' <span>· ' + status + '</span>';
    html += '</div>';
    html += '</div>';

    // Remove button (stopPropagation so it never triggers card navigation)
    if (interestId) {
      html += '<button class="interest-hij-remove" onclick="event.stopPropagation();removeInterest(\'' + interestIdArg + '\')">Remove</button>';
    } else if (refId && type) {
      html += '<button class="interest-hij-remove" onclick="event.stopPropagation();removeInterestByRef(\'' + typeArg + '\',\'' + navArg + '\')">Remove</button>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
}


/*
============================================================
REMOVE INTEREST (Preserved)
============================================================
*/

function removeInterest(interestId) {
  if (!interestId) return;
  var userId = getUserId();
  if (!userId) { requireLogin(); return; }

  var url = getApiUrl() +
    "?action=removeinterest" +
    "&userId=" + encodeURIComponent(userId) +
    "&interestId=" + encodeURIComponent(interestId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        invalidateUserInterestCache();
        loadMyInterests();
      } else {
        alert(res.message || "Failed to remove interest");
      }
    })
    .catch(function(err) {
      console.log("Remove interest error:", err);
      alert("Error removing interest");
    });
}


/*
============================================================
REMOVE INTEREST BY REFERENCE (backward compatible)
============================================================
*/

function removeInterestByRef(type, refId) {
  if (!type || !refId) return;
  var userId = getUserId();
  if (!userId) { requireLogin(); return; }

  var url = getApiUrl() +
    "?action=removeinterest" +
    "&userId=" + encodeURIComponent(userId) +
    "&type=" + encodeURIComponent(type) +
    "&referenceId=" + encodeURIComponent(refId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        invalidateUserInterestCache();
        loadMyInterests();
      } else {
        alert(res.message || "Failed to remove interest");
      }
    })
    .catch(function(err) {
      console.log("Remove interest error:", err);
      alert("Error removing interest");
    });
}