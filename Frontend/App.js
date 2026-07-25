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

  // Close side drawer on page change
  closeSideDrawer();

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

    // Stage 2: Initialize new header and location features
    initStage2();

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

/*
SIDE DRAWER
Stage 1 shell functions
*/

function openSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const overlay = document.getElementById("drawerOverlay");
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("open");
}

function closeSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const overlay = document.getElementById("drawerOverlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}


/*
LOCATION SELECTOR BOTTOM SHEET (Stage 2)
*/

function openLocationSelector() {
  const selector = document.getElementById("locationSelector");
  if (selector) {
    selector.style.display = "flex";
    updateSelectorGpsStatus();
  }
}

function closeLocationSelector() {
  const selector = document.getElementById("locationSelector");
  if (selector) {
    selector.style.display = "none";
  }
}

function updateSelectorGpsStatus() {
  const statusEl = document.getElementById("selectorGpsStatus");
  if (!statusEl) return;

  const center = getEffectiveCenter();
  if (center.source === "manual") {
    statusEl.innerText = "Using manual location";
  } else {
    statusEl.innerText = "Detecting GPS...";
  }
}

function useCurrentLocation() {
  closeLocationSelector();
  clearSearchCenter();
  showLocationToast("Current Location");
}

function openSearchFromSelector() {
  closeLocationSelector();
  openSearchModal();
}

function handleRadiusChange() {
  const radius = getRadius();
  saveRadius(radius);
  loadAll();
}

function handleDiscoverySearch() {
  const input = document.getElementById("discoverySearchInput");
  if (!input) return;

  const query = input.value.trim();
  if (!query) return;

  // Store the search query and navigate to appropriate page
  // For now, navigate to products page with search term
  input.value = "";

  // Could be enhanced to show search results page
  openPage("products");
}


/*
UPDATE DISCOVERY CARD (Stage 2)
*/

function updateDiscoveryCard() {
  const nameEl = document.getElementById("discoveryLocationName");
  const subtitleEl = document.getElementById("discoveryLocationSubtitle");

  if (!nameEl || !subtitleEl) return;

  const center = getEffectiveCenter();

  if (center.source === "manual") {
    nameEl.innerText = center.name || "Selected Location";
    subtitleEl.innerText = "Manual location";
  } else {
    nameEl.innerText = "Current Location";
    subtitleEl.innerText = "Detecting GPS...";
  }
}


/*
NOTIFICATION BADGE (Stage 2)
*/

function updateNotificationBadge() {
  const dot = document.getElementById("headerNotifDot");
  if (!dot) return;

  // Check if user has unread notifications
  // This is a simple implementation - can be enhanced
  const hasUnread = checkUnreadNotifications();

  if (hasUnread) {
    dot.classList.add("visible");
  } else {
    dot.classList.remove("visible");
  }
}

function checkUnreadNotifications() {
  // Placeholder - integrate with actual notification system
  // For now, return false
  return false;
}


/*
LOCATION TOAST (Stage 2 - enhanced)
*/

function showLocationToast(name) {
  // Remove existing toast if any
  var existing = document.getElementById("locationToast");
  if (existing) {
    existing.remove();
  }

  var toast = document.createElement("div");
  toast.id = "locationToast";
  toast.style.cssText = "position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 12px 24px; border-radius: 30px; font-size: 14px; z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; max-width: 90%; animation: fadeInUp 0.3s ease;";

  toast.innerText = "📍 Location set to " + name;

  document.body.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(function() {
    if (toast.parentNode) {
      toast.style.animation = "fadeOutDown 0.3s ease";
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, 3000);
}


/*
RECENT LOCATIONS (Stage 2 - localStorage)
*/

const RECENT_LOCATIONS_KEY = "ekka1km_recent_locations";
const MAX_RECENT_LOCATIONS = 5;

function getRecentLocations() {
  try {
    const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log("Get recent locations error:", e);
  }
  return [];
}

function saveRecentLocation(lat, lng, name) {
  try {
    let recent = getRecentLocations();

    // Remove if already exists
    recent = recent.filter(function(loc) {
      return !(loc.lat === lat && loc.lng === lng);
    });

    // Add to beginning
    recent.unshift({
      lat: lat,
      lng: lng,
      name: name,
      timestamp: Date.now()
    });

    // Keep only MAX_RECENT_LOCATIONS
    if (recent.length > MAX_RECENT_LOCATIONS) {
      recent = recent.slice(0, MAX_RECENT_LOCATIONS);
    }

    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recent));
  } catch (e) {
    console.log("Save recent location error:", e);
  }
}

function addLocationToRecent(lat, lng, name) {
  saveRecentLocation(lat, lng, name);
  renderRecentLocations();
}

function removeRecentLocation(lat, lng) {
  try {
    let recent = getRecentLocations();
    recent = recent.filter(function(loc) {
      return !(loc.lat === lat && loc.lng === lng);
    });
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recent));
    renderRecentLocations();
  } catch (e) {
    console.log("Remove recent location error:", e);
  }
}

function renderRecentLocations() {
  const section = document.getElementById("recentLocationsSection");
  const list = document.getElementById("recentLocationsList");

  if (!section || !list) return;

  const recent = getRecentLocations();

  if (recent.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  let html = "";
  recent.forEach(function(loc) {
    html += '<div class="locationSelectorSectionItem" onclick="selectRecentLocation(' + loc.lat + ', ' + loc.lng + ', \'' + loc.name.replace(/'/g, "") + '\')">';
    html += '<div class="locationSelectorSectionItemIcon"><i class="material-icons">history</i></div>';
    html += '<div class="locationSelectorSectionItemContent">';
    html += '<div class="locationSelectorSectionItemTitle">' + loc.name + '</div>';
    html += '<div class="locationSelectorSectionItemSubtitle">' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + '</div>';
    html += '</div>';
    html += '<button class="locationSelectorSectionItemRemove" onclick="event.stopPropagation();removeRecentLocation(' + loc.lat + ', ' + loc.lng + ')" title="Remove">&times;</button>';
    html += '</div>';
  });

  list.innerHTML = html;
}

function selectRecentLocation(lat, lng, name) {
  saveSearchCenter(lat, lng, name);
  addLocationToRecent(lat, lng, name);
  closeLocationSelector();
  showLocationToast(name);
}


/*
SAVED LOCATIONS (Stage 2 - localStorage)
*/

const SAVED_LOCATIONS_KEY = "ekka1km_saved_locations";

function getSavedLocations() {
  try {
    const stored = localStorage.getItem(SAVED_LOCATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log("Get saved locations error:", e);
  }
  return [];
}

function saveLocationToSaved(lat, lng, name) {
  try {
    let saved = getSavedLocations();

    // Check if already exists
    const exists = saved.some(function(loc) {
      return loc.lat === lat && loc.lng === lng;
    });

    if (!exists) {
      saved.push({
        lat: lat,
        lng: lng,
        name: name,
        timestamp: Date.now()
      });

      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(saved));
    }
  } catch (e) {
    console.log("Save location error:", e);
  }
}

function removeSavedLocation(lat, lng) {
  try {
    let saved = getSavedLocations();
    saved = saved.filter(function(loc) {
      return !(loc.lat === lat && loc.lng === lng);
    });
    localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(saved));
    renderSavedLocations();
  } catch (e) {
    console.log("Remove saved location error:", e);
  }
}

function renderSavedLocations() {
  const section = document.getElementById("savedLocationsSection");
  const list = document.getElementById("savedLocationsList");

  if (!section || !list) return;

  const saved = getSavedLocations();

  if (saved.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  let html = "";
  saved.forEach(function(loc) {
    html += '<div class="locationSelectorSectionItem" onclick="selectSavedLocation(' + loc.lat + ', ' + loc.lng + ', \'' + loc.name.replace(/'/g, "") + '\')">';
    html += '<div class="locationSelectorSectionItemIcon"><i class="material-icons">star</i></div>';
    html += '<div class="locationSelectorSectionItemContent">';
    html += '<div class="locationSelectorSectionItemTitle">' + loc.name + '</div>';
    html += '<div class="locationSelectorSectionItemSubtitle">' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + '</div>';
    html += '</div>';
    html += '<button class="locationSelectorSectionItemRemove" onclick="event.stopPropagation();removeSavedLocation(' + loc.lat + ', ' + loc.lng + ')" title="Remove">&times;</button>';
    html += '</div>';
  });

  list.innerHTML = html;
}

function selectSavedLocation(lat, lng, name) {
  saveSearchCenter(lat, lng, name);
  closeLocationSelector();
  showLocationToast(name);
}


/*
ENHANCED SEARCH LOCATION FUNCTIONS (Stage 2)
*/

// Override selectSearchResult to also save to recent locations
var originalSelectSearchResult = window.selectSearchResult;

window.selectSearchResult = function(el, name) {
  var lat = parseFloat(el.getAttribute("data-lat"));
  var lng = parseFloat(el.getAttribute("data-lng"));

  if (isNaN(lat) || isNaN(lng)) {
    return;
  }

  // Use provided name, fallback to element text
  if (!name) {
    name = el.textContent.trim().substring(0, 100);
  }

  // Save and apply
  saveSearchCenter(lat, lng, name);

  // Add to recent locations
  addLocationToRecent(lat, lng, name);

  // Add to saved locations
  saveLocationToSaved(lat, lng, name);

  // Close modal
  closeSearchModal();

  // Show confirmation toast
  showLocationToast(name);
};


/*
APP INITIALIZATION (Stage 2)
*/

function initStage2() {
  // Update discovery card with current location
  updateDiscoveryCard();

  // Render recent and saved locations
  renderRecentLocations();
  renderSavedLocations();

  // Update notification badge
  updateNotificationBadge();

  // Show header elements on mobile
  const menuBtn = document.querySelector(".header-menu-btn");
  const notifBtn = document.querySelector(".header-notif-btn");

  if (menuBtn) menuBtn.style.display = "flex";
  if (notifBtn) notifBtn.style.display = "flex";

  // Listen for search center changes to update discovery card
  window.addEventListener("searchCenterUpdated", function() {
    updateDiscoveryCard();
    updateSelectorGpsStatus();
  });
}

// Override saveSearchCenter to trigger event
var originalSaveSearchCenter = window.saveSearchCenter;
window.saveSearchCenter = function(latitude, longitude, name) {
  originalSaveSearchCenter(latitude, longitude, name);
  window.dispatchEvent(new Event("searchCenterUpdated"));
};

// Override clearSearchCenter to trigger event
var originalClearSearchCenter = window.clearSearchCenter;
window.clearSearchCenter = function() {
  originalClearSearchCenter();
  window.dispatchEvent(new Event("searchCenterUpdated"));
};
