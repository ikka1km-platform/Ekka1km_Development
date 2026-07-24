/*
============================================================
EKKA1KM FRONTEND
App.js
V2.2 - Phase 3 Dashboard + Interest + Promotion Support
============================================================
*/

let CURRENT_LAT =
  CONFIG.DEFAULT_LATITUDE;

let CURRENT_LNG =
  CONFIG.DEFAULT_LONGITUDE;


/*
============================================================
LOGIN UI
============================================================
*/

function refreshLoginUI() {

  const loggedIn =
    isLoggedIn();

  document
    .querySelectorAll(
      ".login-only"
    )
    .forEach(el => {
      el.style.display =
        loggedIn
          ? "block"
          : "none";
    });

  document
    .querySelectorAll(
      ".guest-only"
    )
    .forEach(el => {
      el.style.display =
        loggedIn
          ? "none"
          : "block";
    });
}


/*
============================================================
PAGE NAVIGATION
============================================================
*/

function openPage(pageId) {

  const pages =
    document.querySelectorAll(
      ".page"
    );

  pages.forEach(page => {
    page.classList.remove(
      "activePage"
    );
  });

  const target =
    document.getElementById(
      pageId
    );

  if (target) {
    target.classList.add(
      "activePage"
    );
  }

  const header =
    document.getElementById(
      "appHeader"
    );

  const bottomNav =
    document.getElementById(
      "bottomNav"
    );

  if (
    pageId === "login" ||
    pageId === "register"
  ) {
    if (header)
      header.style.display =
        "none";

    if (bottomNav)
      bottomNav.style.display =
        "none";

    if (
      typeof autoFillMobile ===
      "function"
    ) {
      autoFillMobile();
    }
  }
  else {
    if (header)
      header.style.display =
        "flex";

    if (bottomNav)
      bottomNav.style.display =
        "flex";
  }

  if (pageId === "adcenter") {
    if (typeof openAdCenterPage === "function") {
      setTimeout(openAdCenterPage, 100);
    }
  }

  window.scrollTo(0, 0);
}


/*
============================================================
GPS
============================================================
*/

function loadLocation() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  if (
    !navigator.geolocation
  ) {

    if (gpsText) {
      gpsText.innerText =
        "GPS not supported. Using demo location.";
    }

    loadAll();
    return;
  }

  navigator.geolocation
    .getCurrentPosition(

      position => {

        CURRENT_LAT =
          position.coords.latitude;

        CURRENT_LNG =
          position.coords.longitude;

        saveLocation(
          CURRENT_LAT,
          CURRENT_LNG
        );

        if (gpsText) {
          gpsText.innerText =
            `GPS: ${CURRENT_LAT.toFixed(4)}, ${CURRENT_LNG.toFixed(4)}`;
        }

        loadAll();
      },

      () => {

        const saved =
          getSavedLocation();

        CURRENT_LAT =
          saved.lat;

        CURRENT_LNG =
          saved.lng;

        if (gpsText) {
          gpsText.innerText =
            "GPS blocked. Using saved location.";
        }

        loadAll();
      },

      {
        enableHighAccuracy:
          CONFIG.GPS.HIGH_ACCURACY,

        timeout:
          CONFIG.GPS.TIMEOUT,

        maximumAge:
          CONFIG.GPS.MAXIMUM_AGE
      }
    );
}


/*
============================================================
RADIUS
============================================================
*/

function getRadius() {

  const radius =
    document.getElementById(
      "radius"
    );

  if (!radius) {
    return CONFIG.DEFAULT_RADIUS;
  }

  return radius.value;
}


function initRadius() {

  const radius =
    document.getElementById(
      "radius"
    );

  if (!radius)
    return;

  radius.value =
    getCurrentRadius();

  radius.addEventListener(
    "change",
    () => {

      saveRadius(
        radius.value
      );

      loadAll();
    }
  );
}


/*
============================================================
LOAD EVERYTHING
============================================================
*/

function loadAll() {

  refreshLoginUI();

  if (
    typeof loadProducts ===
    "function"
  ) {
    loadProducts();
  }

  if (
    typeof loadBusinesses ===
    "function"
  ) {
    loadBusinesses();
  }

  if (
    typeof loadProperties ===
    "function"
  ) {
    loadProperties();
  }

  if (
    typeof loadNews ===
    "function"
  ) {
    loadNews();
  }

  if (
    typeof loadLive ===
    "function"
  ) {
    loadLive();
  }

  if (
    typeof loadAnnouncements ===
    "function"
  ) {
    loadAnnouncements();
  }

  if (
    typeof loadWallet ===
    "function"
  ) {
    loadWallet();
  }

  if (
    typeof loadProfile ===
    "function"
  ) {
    loadProfile();
  }

  if (
    typeof loadNotifications ===
    "function"
  ) {
    loadNotifications();
  }

  if (
    typeof loadAdvertisements ===
    "function"
  ) {
    loadAdvertisements();
  }

  if (
    typeof loadDashboard ===
    "function"
  ) {
    loadDashboard();
  }

  // Phase 4: Load PIP Queue after a short delay
  if (typeof loadPipQueue === "function") {
    setTimeout(function() {
      console.log("Phase4: PIP initialization started");
      loadPipQueue();
    }, 2000);
  }
}


/*
============================================================
LOAD DASHBOARD
?action=dashboard&userId=U001
============================================================
*/

function loadDashboard() {
  const userId = getUserId();
  if (!userId) return;

  const url = getApiUrl() +
    "?action=dashboard" +
    "&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderDashboard(res.data);
      }
    })
    .catch(function(err) {
      console.log("Dashboard load error:", err);
    });
}


/*
============================================================
RENDER DASHBOARD
============================================================
*/

function renderDashboard(data) {
  var container = document.getElementById("dashboardContent");
  if (!container) return;

  var profile = data.profile || {};
  var activity = data.activity || {};
  var analytics = data.analytics || {};
  var recent = data.recentActivity || {};
  var quickStats = data.quickStats || {};

  var profilePhotoHtml = profile.profilePhoto
    ? '<img class="dashboardProfilePhoto" src="' + profile.profilePhoto + '" alt="Profile">'
    : '<div class="dashboardProfilePhotoPlaceholder">' + (profile.name ? profile.name.charAt(0).toUpperCase() : "U") + '</div>';

  var verifBadge = profile.verificationStatus === "Active" || profile.verificationStatus === "Verified"
    ? '<span class="dashboardBadge verified">Verified</span>'
    : '<span class="dashboardBadge pending">Pending</span>';

  var html = '';

  // Profile Card
  html += '<div class="dashboardProfileCard">';
  html += '<div class="dashboardProfileHeader">';
  html += profilePhotoHtml;
  html += '<div class="dashboardProfileInfo">';
  html += '<h3>' + (profile.name || "User") + '</h3>';
  html += '<p>' + (profile.mobile || "") + ' ' + verifBadge + '</p>';
  html += '</div></div>';
  html += '<div class="dashboardProfileBody">';
  html += '<div class="dashboardStatItem"><h2>₹' + (profile.walletBalance || 0) + '</h2><p>Wallet</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (profile.coins || 0) + '</h2><p>Coins</p></div>';
  html += '</div></div>';

  // Quick Actions
  html += '<div class="dashboardSection"><h3>Quick Actions</h3>';
  html += '<div class="dashboardQuickActions">';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'product\')"><i class="material-icons">shopping_bag</i><span>Post Product</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'property\')"><i class="material-icons">real_estate_agent</i><span>Post Property</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'business\')"><i class="material-icons">store</i><span>Create Business</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'promotion\')"><i class="material-icons">trending_up</i><span>Promote</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'wallet\')"><i class="material-icons">account_balance_wallet</i><span>Wallet</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'notifications\')"><i class="material-icons">notifications</i><span>Notifications</span></div>';
  html += '</div></div>';

  // Activity Cards
  html += '<div class="dashboardSection"><h3>My Activity</h3>';
  html += '<div class="dashboardGrid">';
  html += '<div class="dashboardStatItem"><h2>' + (activity.productsPosted || 0) + '</h2><p>Products</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (activity.businessesCreated || 0) + '</h2><p>Businesses</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (activity.propertiesPosted || 0) + '</h2><p>Properties</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (activity.newsPosted || 0) + '</h2><p>News</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (activity.interestsCount || 0) + '</h2><p>Interests</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (activity.promotionsCount || 0) + '</h2><p>Promotions</p></div>';
  html += '</div></div>';

  // Analytics Cards
  html += '<div class="dashboardSection"><h3>Analytics</h3>';
  html += '<div class="dashboardGrid">';
  html += '<div class="dashboardStatItem"><h2>' + (analytics.totalViews || 0) + '</h2><p>Views</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (analytics.totalEnquiries || 0) + '</h2><p>Enquiries</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (analytics.followers || 0) + '</h2><p>Followers</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (analytics.productInterestedCount || 0) + '</h2><p>Interested</p></div>';
  html += '</div></div>';

  // Recent Activity
  html += '<div class="dashboardSection"><h3>Recent Activity</h3>';

  // Latest Products
  html += '<div class="dashboardActivityCard"><h4>Latest Products</h4>';
  if (recent.latestProducts && recent.latestProducts.length > 0) {
    recent.latestProducts.forEach(function(p) {
      html += '<div class="dashboardActivityItem">';
      html += '<div class="title">' + (p.title || "Product") + '</div>';
      html += '<div class="meta">₹' + (p.price || "0") + ' | ' + (p.status || "") + '</div>';
      html += '</div>';
    });
  } else {
    html += '<div class="dashboardEmpty">No products yet</div>';
  }
  html += '</div>';

  // Latest Notifications
  html += '<div class="dashboardActivityCard"><h4>Latest Notifications</h4>';
  if (recent.latestNotifications && recent.latestNotifications.length > 0) {
    recent.latestNotifications.forEach(function(n) {
      html += '<div class="dashboardActivityItem">';
      html += '<div class="title">' + (n.title || "Notification") + '</div>';
      html += '<div class="meta">' + (n.message || "") + '</div>';
      html += '</div>';
    });
  } else {
    html += '<div class="dashboardEmpty">No notifications</div>';
  }
  html += '</div>';

  // Latest Interests
  html += '<div class="dashboardActivityCard"><h4>Latest Interests</h4>';
  if (recent.latestInterests && recent.latestInterests.length > 0) {
    recent.latestInterests.forEach(function(i) {
      html += '<div class="dashboardActivityItem">';
      html += '<div class="title">Someone interested in your ' + (i.targetType || "item") + '</div>';
      html += '<div class="meta">' + (i.date || "") + '</div>';
      html += '</div>';
    });
  } else {
    html += '<div class="dashboardEmpty">No interests yet</div>';
  }
  html += '</div>';

  // Quick Stats
  html += '<div class="dashboardSection"><h3>Quick Stats</h3>';
  html += '<div class="dashboardGrid">';
  html += '<div class="dashboardStatItem"><h2>' + (quickStats.activeProducts || 0) + '</h2><p>Active Products</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (quickStats.activePromotions || 0) + '</h2><p>Active Promotions</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (quickStats.unreadNotifications || 0) + '</h2><p>Unread</p></div>';
  html += '<div class="dashboardStatItem"><h2>₹' + (quickStats.totalEarned || 0) + '</h2><p>Total Earned</p></div>';
  html += '</div></div>';

  container.innerHTML = html;
}


/*
============================================================
GET USER ID
============================================================
*/

function getUserId() {
  try {
    var userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW);
    if (userData) {
      var user = JSON.parse(userData);
      return user.UserID || user.userId || "";
    }
    var sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionData) {
      var session = JSON.parse(sessionData);
      return session.UserID || session.userId || "";
    }
  } catch (e) {
    // silent
  }
  return "";
}


/*
============================================================
OPEN POST FORM WITH LOGIN CHECK
============================================================
*/

function openPostFormWithLogin(type) {

  if (!requireLogin()) {
    return;
  }

  openPostForm(type);
}


/*
============================================================
APP START
============================================================
*/

window.addEventListener(
  "load",
  () => {

    initRadius();

    initSearchLocationUI();

    refreshLoginUI();

    openPage("home");

    loadLocation();

    if (
      typeof autoFillMobile ===
      "function"
    ) {
      setTimeout(
        autoFillMobile,
        500
      );
    }
  }
);