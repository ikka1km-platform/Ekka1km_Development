/*
============================================================
EKKA1KM FRONTEND
Store.js
V2.0 - Enhanced Store Page with Follow/Unfollow
============================================================
*/

/*
============================================================
OPEN STORE
============================================================
*/

function openStore(businessId) {
  openPage("store");

  var container =
    document.getElementById(
      "storeContent"
    );

  container.innerHTML =
    '<div class="card" style="text-align:center;padding:30px;">' +
    '<p>Loading store...</p></div>';

  var userId = getUserId();

  var url =
    getApiUrl() +
    "?action=getstore" +
    "&businessId=" +
    encodeURIComponent(
      businessId
    );

  if (userId) {
    url +=
      "&userId=" +
      encodeURIComponent(userId);
  }

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        renderStore(
          res.data,
          businessId
        );
      } else {
        container.innerHTML =
          '<div class="card" style="text-align:center;padding:30px;">' +
          "<p>Store not found</p>" +
          '<button class="btn-gray" onclick="openPage(\'home\')">Back</button>' +
          "</div>";
      }
    })
    .catch(function(err) {
      console.log(
        "Store error:",
        err
      );
      container.innerHTML =
        '<div class="card" style="text-align:center;padding:30px;">' +
        "<p>Error loading store</p>" +
        '<button class="btn-gray" onclick="openPage(\'home\')">Back</button>' +
        "</div>";
    });
}


/*
============================================================
RENDER STORE
============================================================
*/

function renderStore(data, businessId) {
  var container =
    document.getElementById(
      "storeContent"
    );

  if (!container) return;

  var business =
    data.business || {};
  var owner =
    data.owner || {};

  var logoHtml = business.Logo
    ? '<img class="storeLogo" src="' + business.Logo + '" alt="Logo">'
    : '<div class="storeLogoPlaceholder">' +
      (business.Title
        ? business.Title.charAt(0).toUpperCase()
        : "S") +
      "</div>";

  var coverHtml = business.CoverImage
    ? '<img class="storeCoverImg" src="' + business.CoverImage + '" alt="Cover">'
    : '<div class="storeCoverPlaceholder"></div>';

  var badgeHtml = data.verificationBadge
    ? '<span class="badge">Verified</span>'
    : "";

  var followBtnHtml = "";

  if (getUserId()) {
    if (data.isFollowing) {
      followBtnHtml =
        '<button class="btn-gray" onclick="unfollowStore(\'' +
        businessId +
        '\')" style="margin-top:10px;">Unfollow Store</button>';
    } else {
      followBtnHtml =
        '<button onclick="followStore(\'' +
        businessId +
        '\')" style="margin-top:10px;">Follow Store</button>';
    }
  }

  var html = "";

  // Store Header
  html += '<div class="storeHeader">';
  html +=
    '<div class="storeCover">' +
    coverHtml +
    "</div>";
  html += '<div class="storeInfo">';
  html += logoHtml;
  html +=
    '<h2 class="storeName">' +
    (business.Title ||
      "Store") +
    " " +
    badgeHtml +
    "</h2>";
  html +=
    '<p class="storeCategory">' +
    (business.Category ||
      "") +
    "</p>";

  if (
    business.Description
  ) {
    html +=
      '<p style="margin-top:8px;font-size:13px;color:#555;">' +
      business.Description +
      "</p>";
  }

  html +=
    '<div class="storeStats">' +
    "👤 " +
    (data.followerCount ||
      0) +
    " followers | 📦 " +
    (data.productsCount ||
      0) +
    " products" +
    "</div>";

  html += followBtnHtml;
  html +=
    '<button class="btn-gray" onclick="shareStore(\'' +
    businessId +
    '\')" style="margin-top:8px;font-size:13px;">Share Store</button>';

  // Owner Info
  if (owner && owner.name) {
    html +=
      '<div style="margin-top:15px;padding:12px;background:#f9f9f9;border-radius:12px;">' +
      '<p style="font-size:13px;color:#888;margin:0;">Owner</p>' +
      '<p style="font-weight:500;font-size:14px;margin:0;">' +
      owner.name +
      "</p>" +
      '<p style="font-size:12px;color:#888;margin:0;">' +
      (owner.mobile || "") +
      "</p>" +
      "</div>";
  }

  html += "</div>"; // storeInfo
  html += "</div>"; // storeHeader

  // Contact Info
  html += '<div class="card">';
  html += "<h3>Contact</h3>";
  if (business.Phone)
    html +=
      '<p>📞 ' +
      business.Phone +
      "</p>";
  if (business.Email)
    html +=
      '<p>📧 ' +
      business.Email +
      "</p>";
  if (business.Website)
    html +=
      '<p>🌐 ' +
      business.Website +
      "</p>";
  if (business.Address)
    html +=
      '<p>📍 ' +
      business.Address +
      "</p>";
  html += "</div>";

  // Load Store Products
  html += '<div class="card">';
  html += "<h3>Products</h3>";
  html +=
    '<div id="storeProductsList">' +
    '<p style="text-align:center;color:#888;font-size:13px;">Loading products...</p>' +
    "</div>";
  html += "</div>";

  // Back button
  html +=
    '<button class="btn-gray" onclick="openPage(\'home\')" style="margin-top:10px;">Back</button>';

  container.innerHTML = html;

  // Load products separately
  loadStoreProducts(
    businessId,
    business.UserID
  );
}


/*
============================================================
LOAD STORE PRODUCTS
============================================================
*/

function loadStoreProducts(
  businessId,
  ownerUserId
) {
  var url =
    getApiUrl() +
    "?action=getstoreproducts" +
    "&businessId=" +
    encodeURIComponent(
      businessId
    );

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      var list =
        document.getElementById(
          "storeProductsList"
        );

      if (!list) return;

      if (
        res &&
        res.success &&
        res.data &&
        res.data.data &&
        res.data.data.length > 0
      ) {
        var html = "";
        res.data.data.forEach(
          function(p) {
            html +=
              '<div class="dashboardActivityItem">' +
              '<div class="title">' +
              (p.Title ||
                "Product") +
              "</div>" +
              '<div class="meta">₹' +
              (p.Price || "0") +
              " | " +
              (p.Status ||
                "") +
              "</div>" +
              "</div>";
          }
        );
        list.innerHTML = html;
      } else {
        list.innerHTML =
          '<p style="text-align:center;color:#888;font-size:13px;">No products yet</p>';
      }
    })
    .catch(function(err) {
      console.log(
        "Store products error:",
        err
      );
    });
}


/*
============================================================
FOLLOW STORE
============================================================
*/

function followStore(businessId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url =
    getApiUrl() +
    "?action=followstore" +
    "&userId=" +
    encodeURIComponent(userId) +
    "&businessId=" +
    encodeURIComponent(
      businessId
    );

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        openStore(businessId);
      } else {
        alert(
          res.message ||
            "Failed to follow store"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Follow error:",
        err
      );
    });
}


/*
============================================================
UNFOLLOW STORE
============================================================
*/

function unfollowStore(businessId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url =
    getApiUrl() +
    "?action=unfollowstore" +
    "&userId=" +
    encodeURIComponent(userId) +
    "&businessId=" +
    encodeURIComponent(
      businessId
    );

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        openStore(businessId);
      } else {
        alert(
          res.message ||
            "Failed to unfollow store"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Unfollow error:",
        err
      );
    });
}


/*
============================================================
SHARE STORE
============================================================
*/

function shareStore(businessId) {
  var shareUrl =
    window.location
      .href +
    "?store=" +
    businessId;

  if (
    navigator.share
  ) {
    navigator
      .share({
        title:
          "Check out this store",
        url: shareUrl
      })
      .catch(function() {});
  } else {
    // Fallback - copy to clipboard
    var tempInput =
      document.createElement(
        "input"
      );
    tempInput.value =
      shareUrl;
    document.body.appendChild(
      tempInput
    );
    tempInput.select();
    document.execCommand(
      "copy"
    );
    document.body.removeChild(
      tempInput
    );
    alert(
      "Store link copied to clipboard!"
    );
  }

  // Track share
  var userId = getUserId();
  var url2 =
    getApiUrl() +
    "?action=sharestore" +
    "&businessId=" +
    encodeURIComponent(
      businessId
    );

  if (userId) {
    url2 +=
      "&userId=" +
      encodeURIComponent(
        userId
      );
  }

  fetch(url2).catch(
    function() {}
  );
}