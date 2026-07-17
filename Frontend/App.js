/*
============================================================
EKKA1KM FRONTEND
App.js
V2.0 - Global Application Functions + Login Gates
V2.1 - Phase 4 PIP Integration
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

    // Auto-fill mobile number when login page opens
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

  // Phase 4: Initialize Ad Center when adcenter page opens
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

  /*
  ============================================================
  Phase 4: PIP Advertisement Initialization
  Replaced old loadPipAd() with loadPipQueue()
  Old code kept for backward compatibility (see below)
  ============================================================
  */

  // DEPRECATED: Old PIP system using ?action=pipads
  // Keep for backward compatibility
  if (
    typeof loadPipAd ===
    "function"
  ) {
    // loadPipAd(); // Disabled - replaced by Phase 4 PIP Queue
  }

  // Phase 4: Load PIP Queue after a short delay to let other content render
  if (typeof loadPipQueue === "function") {
    setTimeout(function() {
      console.log("Phase4: PIP initialization started");
      loadPipQueue();
    }, 2000);
  }
}


/*
============================================================
OPEN POST FORM WITH LOGIN CHECK
Requires login for:
- Post Product
- Post Property
- Post Advertisement
- Post Business
- Post News
- Post Promotion
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

    // Auto-fill mobile on page load
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