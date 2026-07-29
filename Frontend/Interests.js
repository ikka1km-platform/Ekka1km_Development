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
      '<p style="font-size:12px;color:#888;margin-top:6px;">Browse products, businesses, or properties and express your interest!</p></div>';
    return;
  }

  var html = '';

  interests.forEach(function(item) {
    var type = interestSafeRender(item.Type) || interestSafeRender(item.type) || "General";
    var title = interestSafeRender(item.Title) || interestSafeRender(item.title) || "-";
    var refId = interestSafeRender(item.ReferenceID) || interestSafeRender(item.referenceId) || interestSafeRender(item.id) || "";
    var interestId = interestSafeRender(item.InterestID) || interestSafeRender(item.interestId) || "";
    var status = interestSafeRender(item.Status) || interestSafeRender(item.status) || "";
    var createdAt = interestSafeRender(item.CreatedDate) || interestSafeRender(item.createdAt) || "";

    html += '<div class="interest-hij-card">';
    html += '<div class="interest-hij-left">';
    html += '<div class="interest-hij-type">' + type + '</div>';
    html += '<div class="interest-hij-title">' + title + '</div>';
    html += '<div class="interest-hij-meta">' +
      (status ? '<span>Status: ' + status + '</span>' : '') +
      (createdAt ? ' <span>' + createdAt + '</span>' : '') +
      '</div>';
    html += '</div>';

    // Remove button
    if (interestId) {
      html += '<button class="interest-hij-remove" onclick="removeInterest(\'' + interestId + '\')">Remove</button>';
    } else if (refId && type) {
      html += '<button class="interest-hij-remove" onclick="removeInterestByRef(\'' + type + '\',\'' + refId + '\')">Remove</button>';
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