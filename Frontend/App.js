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

  // Keep active state in sync whenever drawer opens
  updateDrawerActiveState(getCurrentPageId());
  updateDrawerNotificationBadge();
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
  setTimeout(() => {
    openPage(pageId);
    updateDrawerActiveState(pageId);
  }, 180);
}

/*
DRAWER ACTIVE STATE SYNC
Only ONE active item at a time, driven by navigation state.
*/

function updateDrawerActiveState(pageId) {
  const drawer = document.getElementById("sideDrawer");
  if (!drawer) return;

  // Remove active from all drawer items
  drawer.querySelectorAll(".sideDrawer-item").forEach(item => {
    item.classList.remove("active");
  });

  if (!pageId) return;

  // Find matching drawer item by data-page attribute
  const match = drawer.querySelector('.sideDrawer-item[data-page="' + pageId + '"]');
  if (match) {
    match.classList.add("active");
  }
}

function getCurrentPageId() {
  const activePage = document.querySelector(".page.activePage");
  return activePage ? activePage.id : "";
}

/*
DRAWER NOTIFICATION BADGE SYNC
Reuses existing unread count logic — no duplicate implementation.
*/

function updateDrawerNotificationBadge() {
  const badge = document.getElementById("drawerNotifBadge");
  if (!badge) return;

  const count = (typeof getUnreadNotificationCount === "function")
    ? getUnreadNotificationCount()
    : 0;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "inline-flex";
  } else {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

/*
DRAWER KEYBOARD NAVIGATION
Supports ArrowUp/ArrowDown/Enter/Space on menu items.
Maintains existing minimum 48px touch targets and a11y.
*/

function initDrawerKeyboardNav() {
  const drawer = document.getElementById("sideDrawer");
  if (!drawer) return;

  const items = drawer.querySelectorAll(".sideDrawer-item, .sideDrawer-logout");

  items.forEach(item => {
    item.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = Array.from(items);
        const index = list.indexOf(this);
        const nextIndex = e.key === "ArrowDown"
          ? (index + 1) % list.length
          : (index - 1 + list.length) % list.length;
        list[nextIndex].focus();
      }
    });
  });
}

function refreshDrawerIdentity() {
  const nameEl = document.getElementById("drawerUserName");
  const balanceEl = document.getElementById("drawerBalance");
  const avatarEl = document.getElementById("drawerAvatar");
  const phoneEl = document.getElementById("drawerPhone");
  const emailEl = document.getElementById("drawerEmail");
  const verifEl = document.getElementById("drawerVerifBadge");
  const walletChipEl = document.getElementById("drawerWalletChip");
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
    nameEl.textContent = user && (user.name || user.FullName || user.Name) ? (user.name || user.FullName || user.Name) : "Guest User";
  }

  // Avatar: profile photo if available, otherwise initial
  if (avatarEl) {
    const photo = user && (user.ProfilePhoto || user.profilePhoto) ? (user.ProfilePhoto || user.profilePhoto) : "";
    const name = user && (user.name || user.FullName || user.Name) ? (user.name || user.FullName || user.Name) : "Guest User";
    const initial = (name || "G").charAt(0).toUpperCase();
    if (photo && photo.indexOf("http") === 0) {
      avatarEl.innerHTML = '<img src="' + photo + '" alt="Profile">';
      const img = avatarEl.querySelector("img");
      if (img) {
        img.onerror = function() {
          avatarEl.innerHTML = '<span class="sideDrawer-avatarInitial">' + initial + '</span>';
        };
      }
    } else {
      avatarEl.innerHTML = '<span class="sideDrawer-avatarInitial">' + initial + '</span>';
    }
  }

  // Phone
  if (phoneEl) {
    const phone = user && (user.Mobile || user.Phone || user.mobile) ? (user.Mobile || user.Phone || user.mobile) : "";
    phoneEl.textContent = phone;
    phoneEl.style.display = phone ? "block" : "none";
  }

  // Email
  if (emailEl) {
    const email = user && (user.Email || user.email) ? (user.Email || user.email) : "";
    emailEl.textContent = email;
    emailEl.style.display = email ? "block" : "none";
  }

  // Verification badge (only when status is active/verified)
  if (verifEl) {
    const status = user && (user.Status || user.VerificationStatus) ? (user.Status || user.VerificationStatus) : "";
    const isVerified = (status.toLowerCase() === "active" || status.toLowerCase() === "verified");
    verifEl.style.display = isVerified ? "inline-flex" : "none";
  }

  // Wallet / coin chip
  if (balanceEl && user) {
    const wallet = user.walletBalance || 0;
    const coins = user.coins || 0;
    balanceEl.textContent = "₹" + wallet + " | " + coins + " coins";
    if (walletChipEl) {
      walletChipEl.style.display = (wallet || coins) ? "flex" : "none";
    } else {
      balanceEl.style.display = (wallet || coins) ? "block" : "none";
    }
  }
}


/*
============================================================
PAGE NAVIGATION — WITH INTERNAL HISTORY STACK
============================================================
*/

let navStack = []; // Array of stage descriptors: { pageId, stage, entityId }

// Pages that represent "root" sections; navigating to them clears history
const ROOT_PAGES = [
  "home",
  "login",
  "register"
];

// List pages whose data is overwritten by in-page detail views
// Functions are resolved at call-time because they are defined in later scripts
const LIST_PAGE_IDS = [
  "businesses",
  "products",
  "properties",
  "news"
];

function buildStage(pageId, stage, entityId) {
  return { pageId: pageId, stage: stage, entityId: entityId || null };
}

function inferStage(pageId) {
  if (!pageId) return "root";
  if (ROOT_PAGES.includes(pageId)) return "root";
  if (LIST_PAGE_IDS.includes(pageId)) return "list";
  return "page";
}

function stageEquals(a, b) {
  if (!a || !b) return a === b;
  return a.pageId === b.pageId && a.stage === b.stage;
}

function getCurrentStage() {
  if (navStack.length > 0) {
    return navStack[navStack.length - 1];
  }
  return buildStage(getCurrentPageId(), inferStage(getCurrentPageId()));
}

function getListRestoreFn(pageId) {
  switch (pageId) {
    case "businesses": return typeof loadBusinesses === "function" ? loadBusinesses : null;
    case "products":   return typeof loadProducts   === "function" ? loadProducts   : null;
    case "properties": return typeof loadProperties === "function" ? loadProperties : null;
    case "news":       return typeof loadNews       === "function" ? loadNews       : null;
    default:           return null;
  }
}

function canGoBack() {
  return navStack.length > 0;
}

function switchPage(pageId) {

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

  // Update Bottom Navigation Active State
  updateBottomNavActiveState(pageId);

  // Sync drawer active pill with current page
  updateDrawerActiveState(pageId);

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

  if (pageId === "orders") {
    if (typeof loadOrdersPage === "function") {
      loadOrdersPage();
    }
  }

  if (pageId === "promotions") {
    if (typeof openPromotionsPage === "function") {
      openPromotionsPage();
    }
  }

  window.scrollTo(0, 0);
}

function pushStage(pageId, stage, entityId) {
  const descriptor = buildStage(pageId, stage, entityId);
  navStack.push(descriptor);

  if (navStack.length > 50) {
    navStack = navStack.slice(navStack.length - 50);
  }

  if (window.history && window.history.pushState) {
    try {
      history.pushState(descriptor, "", "#" + pageId);
    } catch (e) {
      // silent
    }
  }
}

function enterDetailView(pageId, entityId) {
  const currentStage = getCurrentStage();

  // Push the current stage if it's not already on top of navStack
  if (navStack.length === 0 || !stageEquals(navStack[navStack.length - 1], currentStage)) {
    pushStage(currentStage.pageId, currentStage.stage, currentStage.entityId);
  }

  // Push the detail stage
  pushStage(pageId, "detail", entityId);

  switchPage(pageId);
}

function openPage(pageId) {

  const current = getCurrentPageId();

  // Avoid no-op navigations
  if (current === pageId) return;

  const isRoot = ROOT_PAGES.includes(pageId);

  // Root pages clear previous history
  if (isRoot) {
    navStack = [];
  }

  const currentStage = getCurrentStage();

  // Push the current stage if it's not already on top of navStack
  if (!isRoot && (navStack.length === 0 || !stageEquals(navStack[navStack.length - 1], currentStage))) {
    pushStage(currentStage.pageId, currentStage.stage, currentStage.entityId);
  }

  // Push the target stage
  pushStage(pageId, inferStage(pageId));

  switchPage(pageId);
}

function goBack() {

  if (navStack.length <= 1) return;

  navStack.pop(); // Remove current stage
  const prev = navStack[navStack.length - 1];

  const current = getCurrentPageId();
  const restoreFn = getListRestoreFn(current);
  if (restoreFn) {
    restoreFn();
  }

  // Update browser history to reflect the back navigation
  if (window.history && window.history.replaceState) {
    try {
      history.replaceState(prev, "", "#" + prev.pageId);
    } catch (e) {
      // silent
    }
  }

  switchPage(prev.pageId);
}

// Android / WebView hardware back button support
window.addEventListener(
  "popstate",
  function(e) {
    const state = e.state;
    if (!state || !state.pageId) return;

    const stage = buildStage(
      state.pageId,
      state.stage || inferStage(state.pageId),
      state.entityId
    );

    // Reconcile navStack with the browser's current position
    while (navStack.length > 0 && !stageEquals(navStack[navStack.length - 1], stage)) {
      navStack.pop();
    }

    // Ensure navStack describes the visible stage
    if (navStack.length === 0 || !stageEquals(navStack[navStack.length - 1], stage)) {
      navStack.push(stage);
    }

    const current = getCurrentPageId();
    const restoreFn = current && current !== stage.pageId ? getListRestoreFn(current) : null;
    if (restoreFn) {
      restoreFn();
    }

    switchPage(stage.pageId);
  }
);

/*
BOTTOM NAVIGATION ACTIVE STATE
*/

function updateBottomNavActiveState(pageId) {
  const bottomNav = document.getElementById("bottomNav");
  if (!bottomNav) return;

  // Remove active class from all items
  const allItems = bottomNav.querySelectorAll(".bottomNav-item");
  allItems.forEach(item => {
    item.classList.remove("active");
  });

  // Map pageId to bottom nav tab
  let activeTab = null;
  
  if (pageId === "home") {
    activeTab = "home";
  } else if (["products", "businesses", "properties"].includes(pageId)) {
    activeTab = "discover";
  } else if (pageId === "dashboard" || pageId === "myContent" || pageId === "orders") {
    activeTab = "activity";
  } else if (pageId === "wallet" || pageId === "promotions") {
    activeTab = "wallet";
  } else if (pageId === "profile" || pageId === "notifications" || pageId === "announcements") {
    // These pages don't have a dedicated bottom nav tab, keep current active or default to home
    activeTab = null;
  } else if (["login", "register", "postProduct", "postProperty", "postBusiness", "postNews", "postAdvertisement", "postPromotion", "postAnnouncement"].includes(pageId)) {
    // Post forms - keep current active or default to home
    activeTab = null;
  }

  // Set active state
  if (activeTab) {
    const activeItem = bottomNav.querySelector(`[data-page="${activeTab}"]`);
    if (activeItem) {
      activeItem.classList.add("active");
    }
  }
}


/*
============================================================
LOCATION — CANONICAL DOM UPDATE
============================================================

Reads the SINGLE canonical location object (getSavedLocation)
and pushes it to the Hero Card DOM. Every location change
(GPS, manual search, clear) funnels through this so the Hero
Card always shows the same resolved object used by the toast.
*/

function updateLocationCard() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  const saved =
    getSavedLocation();

  if (!saved) return;

  // Hero Card line 1 = Area
  if (gpsText) {
    gpsText.innerText =
      saved.area || "Current Area";
  }

  // Hero Card line 2 = City, State
  if (locationSubtitle) {
    const city = saved.city || "";
    const state = saved.state || "";
    locationSubtitle.innerText =
      (city + (state ? ", " + state : "")) ||
      "City, State";
  }
}


/*
============================================================
LOCATION — REVERSE GEOCODING (GPS)
============================================================

Resolves GPS coordinates into a named location using the same
OpenStreetMap Nominatim engine the search modal uses. On
success it writes the full resolved object into the canonical
location store and refreshes the Hero Card.
*/

function reverseGeocodeLocation(lat, lng) {

  const url =
    "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
    lat + "&lon=" + lng + "&zoom=16&addressdetails=1";

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {

      if (!res || !res.address) {
        // Save GPS coords with a readable name even when
        // reverse geocoding returns no structured address.
        const displayName =
          (res && (res.display_name || res.name)) ||
          "Current Location";

        saveLocation(
          lat,
          lng,
          "Current Location",
          "",
          "",
          displayName
        );

        updateLocationCard();
        loadAll();
        return;
      }

      const addr = res.address;

      // Prefer a meaningful area; fall back to county/town/city
      const area =
        addr.neighbourhood ||
        addr.suburb ||
        addr.city_district ||
        addr.town_district ||
        addr.road ||
        addr.county ||
        addr.city ||
        addr.town ||
        res.name ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        "";

      const state =
        addr.state ||
        addr.state_district ||
        addr.region ||
        "";

      const name =
        area + (city ? ", " + city : "") + (state ? ", " + state : "");

      // Write the SAME resolved object used by the toast system
      saveLocation(lat, lng, area, city, state, name);

      // GPS coords already flow into discovery through
      // getEffectiveCenter()'s fallback to CURRENT_LAT/LNG.
      updateLocationCard();
      loadAll();
    })
    .catch(function() {
      // Save GPS coords even when reverse geocoding fails
      // so the location is persisted for future launches.
      saveLocation(
        lat,
        lng,
        "Current Location",
        "",
        "",
        "Current Location"
      );

      updateLocationCard();
      loadAll();
    });
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

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  // Determine whether this is a first launch.
  // A first launch means no persisted location object yet.
  const savedLocationData =
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.LOCATION
    );

  if (savedLocationData) {

    // Subsequent launch — use stored location immediately.
    // GPS refresh only happens when the user explicitly
    // taps "Use Current Location".
    updateLocationCard();
    loadAll();
    return;
  }

  // First launch — show the canonical fallback location
  // immediately, then attempt GPS in the background.
  updateLocationCard();

  if (
    !navigator.geolocation
  ) {

    // No geolocation support — persist the fallback
    // so future launches skip GPS auto-detection.
    const fallback =
      getSavedLocation();

    saveLocation(
      fallback.lat,
      fallback.lng,
      fallback.area,
      fallback.city,
      fallback.state,
      fallback.name ||
        fallback.area + ", " + fallback.city + ", " + fallback.state
    );

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

        // Reverse geocode so the canonical location object
        // carries real names, not placeholders.
        reverseGeocodeLocation(
          CURRENT_LAT,
          CURRENT_LNG
        );
      },

      () => {

        // GPS failed on first launch — persist the exact
        // fallback location (Ranthambore Temple) so it is
        // reused on subsequent launches instead of Jaipur.
        const fallback =
          getSavedLocation();

        saveLocation(
          fallback.lat,
          fallback.lng,
          fallback.area,
          fallback.city,
          fallback.state,
          fallback.name ||
            fallback.area + ", " + fallback.city + ", " + fallback.state
        );

        updateLocationCard();
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
USE CURRENT LOCATION (HERO BUTTON)
============================================================

Forces a GPS refresh when the user taps the Hero Card
"Use Current Location" button. Updates the Hero Card,
persists the new coordinates/address, and refreshes all
discovery modules WITHOUT a page reload.
*/
function useCurrentLocation() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  if (
    !navigator.geolocation
  ) {

    if (gpsText) {
      gpsText.innerText =
        "Area not available";
    }

    if (locationSubtitle) {
      locationSubtitle.innerText =
        "Location service unavailable";
    }

    loadAll();
    return;
  }

  // Show temporary loading state
  if (gpsText) {
    gpsText.innerText =
      "Detecting location...";
  }

  if (locationSubtitle) {
    locationSubtitle.innerText =
      "Please wait";
  }

  navigator.geolocation
    .getCurrentPosition(

      position => {

        CURRENT_LAT =
          position.coords.latitude;

        CURRENT_LNG =
          position.coords.longitude;

        reverseGeocodeLocation(
          CURRENT_LAT,
          CURRENT_LNG
        );
      },

      () => {

        // GPS failed — restore saved coordinates and
        // refresh UI/content without changing location.
        const saved =
          getSavedLocation();

        CURRENT_LAT =
          saved.lat;

        CURRENT_LNG =
          saved.lng;

        updateLocationCard();
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

  // Sync drawer notification badge with latest unread count
  updateDrawerNotificationBadge();

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
  var wallet = data.wallet || {};
  var orders = data.orders || [];
  var notifications = data.notifications || [];

  // My Posts aggregate from canonical realCounts
  var realCounts = data.realCounts || {};
  var myPosts =
    Number(realCounts.products || 0) +
    Number(realCounts.businesses || 0) +
    Number(realCounts.properties || 0) +
    Number(realCounts.news || 0);

  var productsCount = realCounts.products || 0;
  var businessesCount = realCounts.businesses || 0;
  var propertiesCount = realCounts.properties || 0;
  var newsCount = realCounts.news || 0;
  var liveCount = realCounts.live || 0;

  var profilePhotoHtml = profile.profilePhoto
    ? '<img class="dashboardProfilePhoto" src="' + profile.profilePhoto + '" alt="Profile">'
    : '<div class="dashboardProfilePhotoPlaceholder">' + (profile.name ? profile.name.charAt(0).toUpperCase() : "U") + '</div>';

  var verifBadge = profile.verificationStatus === "Active" || profile.verificationStatus === "Verified"
    ? '<span class="dashboardBadge verified">Verified</span>'
    : '<span class="dashboardBadge pending">Pending</span>';

  // Wallet derived values
  var totalCoins = Number(profile.coins || 0);
  var availableCoins = Number(wallet.balance || 0);
  var reservedCoins = Math.max(0, totalCoins - availableCoins);

  var html = '';

  // 1. PREMIUM HEADER
  html += '<div class="dashboardPremiumHeader">';
  html += '<button class="dashboardBackBtn" onclick="goBack()"><i class="material-icons">arrow_back</i></button>';
  html += '<h2 class="dashboardHeaderTitle">Dashboard</h2>';
  html += '<button class="dashboardSettingsBtn" onclick="openPage(\'profile\')"><i class="material-icons">settings</i></button>';
  html += '</div>';

  // 2. PREMIUM USER CARD WITH STATS
  html += '<div class="dashboardSection">';
  html += '<div class="dashboardProfileCard dashboardHeroCard">';
  html += '<div class="dashboardProfileHeader">';
  html += profilePhotoHtml;
  html += '<div class="dashboardProfileInfo">';
  html += '<h3>' + escapeHtml(profile.name || "User") + ' ' + verifBadge + '</h3>';
  html += '<p class="dashboardProfileContact"><i class="material-icons">phone</i> ' + escapeHtml(profile.mobile || "") + '</p>';
  html += '<p class="dashboardProfileContact"><i class="material-icons">email</i> ' + escapeHtml(profile.email || "") + '</p>';
  html += '<p class="dashboardMemberSince"><i class="material-icons">calendar_today</i> Member since ' + escapeHtml(profile.memberSince || "") + '</p>';
  html += '</div></div>';

  // Stats row inside hero card
  html += '<div class="dashboardPremiumStats">';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + totalCoins + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Coins</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + myPosts + '</div>';
  html += '<div class="dashboardPremiumStatLabel">My Posts</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + (quickStats.leads || 0) + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Leads</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + (quickStats.orders || 0) + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Orders</div>';
  html += '</div>';
  html += '</div>';

  html += '</div>';
  html += '</div>';

  // 3. QUICK ACTIONS (8 actions, 4x2 grid)
  html += '<div class="dashboardSection"><h3 class="dashboardSectionTitle">Quick Actions</h3>';
  html += '<div class="dashboardQuickActions">';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'product\')"><div class="dashboardQuickActionIcon"><i class="material-icons">shopping_bag</i></div><span>Post Product</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'business\')"><div class="dashboardQuickActionIcon"><i class="material-icons">store</i></div><span>Post Business</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'property\')"><div class="dashboardQuickActionIcon"><i class="material-icons">real_estate_agent</i></div><span>Post Property</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'news\')"><div class="dashboardQuickActionIcon"><i class="material-icons">newspaper</i></div><span>Post News</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'live\')"><div class="dashboardQuickActionIcon"><i class="material-icons">live_tv</i></div><span>Go Live</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'promotions\')"><div class="dashboardQuickActionIcon"><i class="material-icons">trending_up</i></div><span>Create Promotion</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'wallet\')"><div class="dashboardQuickActionIcon"><i class="material-icons">account_balance_wallet</i></div><span>Wallet</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'invite\')"><div class="dashboardQuickActionIcon"><i class="material-icons">person_add</i></div><span>Invite & Earn</span></div>';
  html += '</div></div>';

  // 4. MY ACTIVITY (Compact rows)
  html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">My Activity</h3><span class="dashboardViewAll" onclick="openPage(\'myContent\')">View All</span></div>';
  if (myPosts === 0) {
    html += '<div class="dashboardEmpty">No activity yet. Start posting to see your content here.</div>';
  } else {
    html += '<div class="dashboardActivityListCompact">';
    if (productsCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'products\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">shopping_bag</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Products</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + productsCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + productsCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (businessesCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'businesses\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">store</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Businesses</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + businessesCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + businessesCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (propertiesCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'properties\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">real_estate_agent</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Properties</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + propertiesCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + propertiesCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (newsCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'news\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">newspaper</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">News</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + newsCount + ' Published</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + newsCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (liveCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'live\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">live_tv</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Live</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + liveCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + liveCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  // 5. WALLET (Compact card)
  html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">My Wallet</h3><span class="dashboardViewAll" onclick="openPage(\'wallet\')">View All</span></div>';
  html += '<div class="dashboardWalletCard">';
  html += '<div class="dashboardWalletRow">';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Total Coins</div>';
  html += '<div class="dashboardWalletItemValue">' + totalCoins + '</div>';
  html += '</div>';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Available Coins</div>';
  html += '<div class="dashboardWalletItemValue">' + availableCoins + '</div>';
  html += '</div>';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Locked / Reserve</div>';
  html += '<div class="dashboardWalletItemValue">' + reservedCoins + '</div>';
  html += '</div>';
  html += '</div>';
  html += '<button onclick="openPage(\'wallet\')" class="dashboardWalletTopupBtn"><i class="material-icons">add</i> Top Up</button>';
  html += '</div></div>';

  // 6. RECENT ORDERS (Compact list)
  if (orders.length > 0) {
    html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">Recent Orders / Leads</h3><span class="dashboardViewAll" onclick="openPage(\'orders\')">View All</span></div>';
    html += '<div class="dashboardOrdersListCompact">';
    orders.slice(0, 5).forEach(function(order) {
      var statusClass = order.type === 'lead' ? 'lead' : 'order';
      var statusLabel = order.type === 'lead' ? 'Lead' : 'Order';
      html += '<div class="dashboardOrderRow" onclick="openPage(\'orders\')">';
      html += '<div class="dashboardOrderRowThumb"><i class="material-icons">' + (order.type === 'lead' ? 'handshake' : 'receipt_long') + '</i></div>';
      html += '<div class="dashboardOrderRowInfo">';
      html += '<div class="dashboardOrderRowTitle">' + escapeHtml(order.title || "Order") + '</div>';
      html += '<div class="dashboardOrderRowTime">' + escapeHtml(order.date || "") + '</div>';
      html += '</div>';
      html += '<span class="dashboardOrderRowStatus ' + statusClass + '">' + statusLabel + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  // 7. RECENT NOTIFICATIONS (Compact list)
  if (notifications.length > 0) {
    html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">Recent Notifications</h3><span class="dashboardViewAll" onclick="openPage(\'notifications\')">View All</span></div>';
    html += '<div class="dashboardNotificationsListCompact">';
    notifications.slice(0, 5).forEach(function(notif) {
      html += '<div class="dashboardNotificationRow" onclick="openPage(\'notifications\')">';
      html += '<div class="dashboardNotificationRowIcon"><i class="material-icons">' + (notif.icon || 'notifications') + '</i></div>';
      html += '<div class="dashboardNotificationRowInfo">';
      html += '<div class="dashboardNotificationRowTitle">' + escapeHtml(notif.title || "Notification") + '</div>';
      html += '</div>';
      html += '<div class="dashboardNotificationRowTime">' + escapeHtml(notif.time || "") + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
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

    // Initialize drawer keyboard navigation (a11y)
    initDrawerKeyboardNav();

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