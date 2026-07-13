/*
============================================================
EKKA1KM FRONTEND
Config.js
V1.1 Trial
Backward Compatible + Guest Analytics
============================================================
*/

const CONFIG = {

  /*
  ============================================================
  APP
  ============================================================
  */

  APP_NAME: "Ekka1km",
  APP_VERSION: "1.0.0",

  /*
  ============================================================
  BACKEND URL
  ============================================================
  */

  API_BASE_URL:
"https://script.google.com/macros/s/AKfycbxYdxeTloiDx986zDV529oi1WfpoUGZ4m58s9Bl6cY92fLYe3qgqHM-mj-bim2tXxvOnw/exec", 

  /*
  ============================================================
  DEFAULT LOCATION
  ============================================================
  */

  DEFAULT_LATITUDE: 26.9124,
  DEFAULT_LONGITUDE: 75.7873,
  DEFAULT_RADIUS: "51",

  /*
  ============================================================
  GPS SETTINGS
  ============================================================
  */

  GPS: {
    HIGH_ACCURACY: true,
    TIMEOUT: 10000,
    MAXIMUM_AGE: 300000
  },

  /*
  ============================================================
  STORAGE KEYS
  ============================================================
  */

  STORAGE_KEYS: {
    USER: "ekka_user",
    TOKEN: "ekka_token",

    LOCATION: "ekka_location",
    RADIUS: "ekka_radius",

    GUEST_ID: "ekka_guest_id",
    INSTALL_DATE: "ekka_install_date",
    LAST_VISIT_DATE: "ekka_last_visit_date",
    TOTAL_VISITS: "ekka_total_visits",
    DAILY_VISITS: "ekka_daily_visits",
    PRODUCT_VIEWS: "ekka_product_views"
  }
};


/*
============================================================
API URL
============================================================
*/

function getApiUrl() {
  return CONFIG.API_BASE_URL;
}


/*
============================================================
LOCATION HELPERS
============================================================
*/

function saveLocation(
  lat,
  lng
) {

  localStorage.setItem(
    CONFIG.STORAGE_KEYS.LOCATION,
    JSON.stringify({
      lat: lat,
      lng: lng
    })
  );
}


function getSavedLocation() {

  const data =
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.LOCATION
    );

  if (!data) {
    return {
      lat:
        CONFIG.DEFAULT_LATITUDE,
      lng:
        CONFIG.DEFAULT_LONGITUDE
    };
  }

  try {

    return JSON.parse(
      data
    );

  }
  catch (e) {

    return {
      lat:
        CONFIG.DEFAULT_LATITUDE,
      lng:
        CONFIG.DEFAULT_LONGITUDE
    };
  }
}


/*
============================================================
RADIUS HELPERS
============================================================
*/

function saveRadius(
  radius
) {

  localStorage.setItem(
    CONFIG.STORAGE_KEYS.RADIUS,
    radius
  );
}


function getCurrentRadius() {

  return (
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.RADIUS
    ) ||
    CONFIG.DEFAULT_RADIUS
  );
}


/*
============================================================
GUEST USER SYSTEM
============================================================
*/

(function initializeGuestUser() {

  const keys =
    CONFIG.STORAGE_KEYS;

  let guestId =
    localStorage.getItem(
      keys.GUEST_ID
    );

  if (!guestId) {

    guestId =
      "Guest_" +
      Math.floor(
        100000 +
        Math.random() *
        900000
      );

    localStorage.setItem(
      keys.GUEST_ID,
      guestId
    );

    localStorage.setItem(
      keys.INSTALL_DATE,
      new Date().toISOString()
    );

    localStorage.setItem(
      keys.TOTAL_VISITS,
      "1"
    );

    localStorage.setItem(
      keys.DAILY_VISITS,
      "1"
    );
  }

  const today =
    new Date().toDateString();

  const lastVisit =
    localStorage.getItem(
      keys.LAST_VISIT_DATE
    );

  if (
    lastVisit !== today
  ) {

    localStorage.setItem(
      keys.LAST_VISIT_DATE,
      today
    );

    const total =
      parseInt(
        localStorage.getItem(
          keys.TOTAL_VISITS
        ) || "0"
      ) + 1;

    localStorage.setItem(
      keys.TOTAL_VISITS,
      total.toString()
    );
  }

})();


/*
============================================================
ANALYTICS
============================================================
*/

const Analytics = {

  getGuestId() {
    return (
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.GUEST_ID
      ) || ""
    );
  },

  isLoggedIn() {
    return !!localStorage.getItem(
      CONFIG.STORAGE_KEYS.USER
    );
  },

  getTotalVisits() {
    return parseInt(
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.TOTAL_VISITS
      ) || "1"
    );
  },

  getProductViews() {
    return parseInt(
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.PRODUCT_VIEWS
      ) || "0"
    );
  },

  addProductView() {

    const count =
      this.getProductViews() + 1;

    localStorage.setItem(
      CONFIG.STORAGE_KEYS.PRODUCT_VIEWS,
      count.toString()
    );
  },

  getAnalytics() {
    return {
      guestId:
        this.getGuestId(),
      loggedIn:
        this.isLoggedIn(),
      totalVisits:
        this.getTotalVisits(),
      productViews:
        this.getProductViews()
    };
  }
};


/*
============================================================
GLOBAL EXPORTS
============================================================
*/

window.CONFIG = CONFIG;

window.EKKA = {
  config: CONFIG,
  analytics: Analytics
};

console.log(
  "EKKA1KM Guest Session Started",
  Analytics.getAnalytics()
);

