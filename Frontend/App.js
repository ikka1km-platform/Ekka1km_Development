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
SIDE DRAWER (Stage 3E)
============================================================
*/

function openSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !backdrop) return;

  drawer.classList.add("open");
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !backdrop) return;

  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

function navigateFromDrawer(pageId) {
  closeSideDrawer();
  setTimeout(() => openPage(pageId), 180);
}

function refreshDrawerIdentity() {
  const nameEl = document.getElementById("drawerUserName");
  const balanceEl = document.getElementById("drawerBalance");
  if (!nameEl && !balanceEl) return;

  const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW);
  const sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
  let user = null;
  if (userData) {
    try { user = JSON.parse(userData); } catch (e) { /* silent */ }
  } else if (sessionData) {
    try { user = JSON.parse(sessionData); } catch (e) { /* silent */ }
  }

  if (nameEl) {
    nameEl.textContent = user && user.name ? user.name : "Guest User";
  }

  if (balanceEl && user) {
    const wallet = user.walletBalance || 0;
    const coins = user.coins || 0;
    balanceEl.textContent = "₹" + wallet + " | " + coins + " coins";
    balanceEl.style.display = (wallet || coins) ? "block" : "none";
  }
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

  const disco =
    document.getElementById(
      "globalDisco"
    );

  if (disco) {
    const discoPages = ["home"];
    const compactPages = ["products","businesses","properties","news","live"];

    if (discoPages.includes(pageId)) {
      disco.classList.remove("disco-compact");
      disco.classList.add("disco-full");
    } else if (compactPages.includes(pageId)) {
      disco.classList.remove("disco-full");
      disco.classList.add("disco-compact");
      syncDiscoCompact();
    } else {
      disco.classList.remove("disco-full","disco-compact");
      disco.style.display = "none";
    }
  }

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

  if (pageId === "dashboard") {
    loadDashboard();
  }

  if (pageId === "myContent") {
    if (typeof loadMyContent === "function") {
      loadMyContent();
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
            "GPS: " + CURRENT_LAT.toFixed(4) + ", " + CURRENT_LNG.toFixed(4);
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


function syncDiscoCompact() {
  const radius = document.getElementById("radius");
  const label = document.getElementById("discoCompactRadiusLabel");
  if (radius && label) {
    label.textContent = radius.options[radius.selectedIndex].text;
  }
  const gpsText = document.getElementById("gpsText");
  const compactText = document.getElementById("discoCompactText");
  if (gpsText && compactText) {
    compactText.textContent = gpsText.textContent.replace("GPS: ","");
  }
}

function toggleDiscoRadiusPicker(forceClose) {
  const picker = document.getElementById("discoRadiusPicker");
  if (!picker) return;
  if (forceClose === true) {
    picker.classList.remove("open");
    return;
  }
  picker.classList.toggle("open");
}

function pickDiscoRadius(value) {
  const radius = document.getElementById("radius");
  if (!radius) return;
  radius.value = value;
  const event = new Event("change");
  radius.dispatchEvent(event);
  toggleDiscoRadiusPicker(true);
  syncDiscoCompact();
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

      syncDiscoCompact();

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
  refreshDrawerIdentity();

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
    typeof loadPromotedNearYou ===
    "function"
  ) {
    loadPromotedNearYou();
  }

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
  if (!userId) {
    renderGuestDashboard();
    return;
  }

  const url = getApiUrl() +
    "?action=dashboard" +
    "&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderDashboard(res.data);
      } else {
        renderGuestDashboard();
      }
    })
    .catch(function(err) {
      console.log("Dashboard load error:", err);
      renderGuestDashboard();
    });
}


/*
============================================================
RENDER DASHBOARD
============================================================
*/

function renderGuestDashboard() {
  var container = document.getElementById("dashboardContent");
  if (!container) return;

  var html = '';
  html += '<div class="card" style="text-align:center;padding:40px 20px;">';
  html += '<h3 style="margin-bottom:10px;">My Dashboard</h3>';
  html += '<p style="color:#666;margin-bottom:20px;">Please login to access your personal dashboard, view your activity, and manage your content.</p>';
  html += '<button onclick="openPage(\'login\')">Login</button>';
  html += '<button onclick="openPage(\'register\')" class="btn-gray" style="margin-top:10px;">Create Account</button>';
  html += '<button onclick="openPage(\'home\')" class="btn-gray" style="margin-top:10px;">Continue As Guest</button>';
  html += '</div>';

  container.innerHTML = html;
}

function renderDashboard(data) {
  var container = document.getElementById("dashboardContent");
  if (!container) return;

  var profile = data.profile || {};
  var activity = data.activity || {};
  var quickStats = data.quickStats || {};

  // My Posts aggregate from canonical realCounts
  var realCounts = data.realCounts || {};
  var myPosts =
    Number(realCounts.products || 0) +
    Number(realCounts.businesses || 0) +
    Number(realCounts.properties || 0) +
    Number(realCounts.news || 0);

  var profilePhotoHtml = profile.profilePhoto
    ? '<img class="dashboardProfilePhoto" src="' + profile.profilePhoto + '" alt="Profile">'
    : '<div class="dashboardProfilePhotoPlaceholder">' + (profile.name ? profile.name.charAt(0).toUpperCase() : "U") + '</div>';

  var verifBadge = profile.verificationStatus === "Active" || profile.verificationStatus === "Verified"
    ? '<span class="dashboardBadge verified">Verified</span>'
    : '<span class="dashboardBadge pending">Pending</span>';

  var html = '';

  // User Summary
  html += '<div class="dashboardProfileCard">';
  html += '<div class="dashboardProfileHeader">';
  html += profilePhotoHtml;
  html += '<div class="dashboardProfileInfo">';
  html += '<h3>' + (profile.name || "User") + '</h3>';
  html += '<p>' + (profile.mobile || "") + ' ' + verifBadge + '</p>';
  html += '</div></div>';
  html += '<div class="dashboardProfileBody">';
  html += '<div class="dashboardStatItem"><h2>' + (profile.coins || 0) + '</h2><p>Coins</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + myPosts + '</h2><p>My Posts</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (quickStats.activePromotions || 0) + '</h2><p>Active Promotions</p></div>';
  html += '<div class="dashboardStatItem"><h2>' + (quickStats.unreadNotifications || 0) + '</h2><p>Unread Notifications</p></div>';
  html += '</div></div>';

  // Quick Actions
  html += '<div class="dashboardSection"><h3>Quick Actions</h3>';
  html += '<div class="dashboardQuickActions">';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'product\')"><i class="material-icons">shopping_bag</i><span>Post Something</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'wallet\')"><i class="material-icons">account_balance_wallet</i><span>Wallet</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'profile\')"><i class="material-icons">person</i><span>Profile</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'promotions\')"><i class="material-icons">trending_up</i><span>Promotions</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'notifications\')"><i class="material-icons">notifications</i><span>Notifications</span></div>';
  html += '</div></div>';

   // My Content
   var realCounts = data.realCounts || {};
   var productsCount = realCounts.products || 0;
   var businessesCount = realCounts.businesses || 0;
   var propertiesCount = realCounts.properties || 0;
   var newsCount = realCounts.news || 0;
   var totalContent = productsCount + businessesCount + propertiesCount + newsCount;

   html += '<div class="dashboardSection"><h3>My Content</h3>';
   if (totalContent === 0) {
     html += '<div class="dashboardEmpty">You haven\'t posted anything yet.</div>';
   } else {
     html += '<div class="myContentGrid">';
     html += '<div class="myContentCard" onclick="openMyContent(\'products\')"><div class="myContentLabel">Products</div><div class="myContentCount">' + productsCount + '</div></div>';
     html += '<div class="myContentCard" onclick="openMyContent(\'businesses\')"><div class="myContentLabel">Businesses</div><div class="myContentCount">' + businessesCount + '</div></div>';
     html += '<div class="myContentCard" onclick="openMyContent(\'properties\')"><div class="myContentLabel">Properties</div><div class="myContentCount">' + propertiesCount + '</div></div>';
     html += '<div class="myContentCard" onclick="openMyContent(\'news\')"><div class="myContentLabel">News</div><div class="myContentCount">' + newsCount + '</div></div>';
     html += '</div>';
   }
   html += '</div>';

  // Recent Activity
  var recentActivity = (data.recentActivity && data.recentActivity.unified) || [];
  if (recentActivity.length > 0) {
    html += '<div class="dashboardSection"><h3>Recent Activity</h3>';
    html += '<div class="recentActivityList">';
    recentActivity.forEach(function(item) {
      var meta = '';
      if (item.price) {
        var priceVal = Number(item.price);
        var priceStr = String(item.price);
        var hasReasonableDecimals = !priceStr.includes('.') || (priceStr.split('.')[1] && priceStr.split('.')[1].length <= 2);
        if (isFinite(priceVal) && priceVal > 0 && priceVal < 1e9 && hasReasonableDecimals) {
          meta += '<span class="recentPrice">' + item.price + '</span>';
        }
      }
      if (item.status) {
        var statusStr = String(item.status).trim();
        var isValidStatus = statusStr.length > 0 && statusStr.length <= 20 && isNaN(Number(statusStr));
        if (isValidStatus) {
          meta += '<span class="recentStatus">' + statusStr + '</span>';
        }
      }
      html += '<div class="recentActivityItem">';
      html += '<div class="recentType">' + item.type + '</div>';
      html += '<div class="recentBody">';
      html += '<div class="recentTitle">' + item.title + '</div>';
      html += '<div class="recentMeta">' + meta + '</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
  }

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

    refreshDrawerIdentity();

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