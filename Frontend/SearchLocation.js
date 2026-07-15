/*
============================================================
EKKA1KM FRONTEND
SearchLocation.js
Universal Search Location Engine
Phase 3.1
============================================================

Provides:
- APP.searchCenter global object
- Manual location search via OpenStreetMap Nominatim
- Override GPS coordinates with user-selected location
- Persistence via localStorage
- Header display of current location
============================================================
*/

/*
============================================================
APP SEARCH CENTER GLOBAL
============================================================

APP.searchCenter = {
  latitude:  number,
  longitude: number,
  name:      string (display name),
  source:    "gps" | "manual"
};

When source is "manual", the APP.searchCenter coordinates
override CURRENT_LAT / CURRENT_LNG globally.

When source is "gps" or not set, GPS coordinates are used.
============================================================
*/

if (!window.APP) window.APP = {};

APP.searchCenter = null;

const SEARCH_CENTER_KEY = "ekka1km_search_center";


/*
============================================================
INIT SEARCH LOCATION
============================================================

Restore persisted search center on app startup.
============================================================
*/

function initSearchLocation() {

  try {

    const stored =
      localStorage.getItem(
        SEARCH_CENTER_KEY
      );

    if (stored) {

      const parsed =
        JSON.parse(stored);

      if (
        parsed &&
        parsed.latitude &&
        parsed.longitude &&
        parsed.source === "manual"
      ) {

        APP.searchCenter = {
          latitude:
            parsed.latitude,
          longitude:
            parsed.longitude,
          name:
            parsed.name ||
            "Selected Location",
          source: "manual"
        };

        // Override GPS globals
        CURRENT_LAT =
          parsed.latitude;

        CURRENT_LNG =
          parsed.longitude;
      }
    }
  }
  catch (e) {

    console.log(
      "SearchLocation init error:",
      e
    );

    APP.searchCenter = null;
  }

  // Update header display
  updateSearchLocationDisplay();
}


/*
============================================================
SAVE SEARCH CENTER
============================================================
*/

function saveSearchCenter(
  latitude,
  longitude,
  name
) {

  APP.searchCenter = {
    latitude: latitude,
    longitude: longitude,
    name: name || "Selected Location",
    source: "manual"
  };

  // Persist
  try {

    localStorage.setItem(
      SEARCH_CENTER_KEY,
      JSON.stringify(
        APP.searchCenter
      )
    );
  }
  catch (e) {

    console.log(
      "Save search center error:",
      e
    );
  }

  // Override GPS globals
  CURRENT_LAT = latitude;
  CURRENT_LNG = longitude;

  // Update header
  updateSearchLocationDisplay();

  // Reload all data with new center
  loadAll();
}


/*
============================================================
CLEAR SEARCH CENTER
============================================================

Revert to GPS mode.
============================================================
*/

function clearSearchCenter() {

  APP.searchCenter = null;

  try {

    localStorage.removeItem(
      SEARCH_CENTER_KEY
    );
  }
  catch (e) {

    console.log(
      "Clear search center error:",
      e
    );
  }

  // Update header
  updateSearchLocationDisplay();

  // Restore GPS
  // GPS will re-acquire and set CURRENT_LAT/LNG
  loadLocation();
}


/*
============================================================
GET EFFECTIVE CENTER
============================================================

Returns the active center coordinates for API calls.

Usage:
  const center = getEffectiveCenter();
  // center.lat, center.lng

This is used by all modules that need coordinates.
============================================================
*/

function getEffectiveCenter() {

  if (
    APP.searchCenter &&
    APP.searchCenter.source === "manual"
  ) {

    return {
      lat:
        APP.searchCenter.latitude,
      lng:
        APP.searchCenter.longitude,
      name:
        APP.searchCenter.name,
      source: "manual"
    };
  }

  // Fall back to GPS globals
  return {
    lat: CURRENT_LAT,
    lng: CURRENT_LNG,
    name: "Current Location",
    source: "gps"
  };
}


/*
============================================================
GET CENTER LATITUDE
============================================================

Convenience function for template strings.
============================================================
*/

function getCenterLat() {

  return getEffectiveCenter().lat;
}


/*
============================================================
GET CENTER LONGITUDE
============================================================

Convenience function for template strings.
============================================================
*/

function getCenterLng() {

  return getEffectiveCenter().lng;
}


/*
============================================================
GET CENTER DISPLAY NAME
============================================================

Returns the name to display in the header.
============================================================
*/

function getCenterDisplayName() {

  const center =
    getEffectiveCenter();

  if (
    center.source === "manual"
  ) {

    return center.name;
  }

  return "Current Location";
}


/*
============================================================
UPDATE SEARCH LOCATION DISPLAY
============================================================

Updates the header dropdown to show current location.
============================================================
*/

function updateSearchLocationDisplay() {

  const select =
    document.getElementById(
      "searchLocation"
    );

  if (!select) return;

  const center =
    getEffectiveCenter();

  const displayName =
    getCenterDisplayName();

  // Update the dropdown display
  if (
    center.source === "manual"
  ) {

    select.value = "manual";
    select.title = displayName;
  }
  else {

    select.value = "gps";
    select.title = "Using GPS location";
  }

  // Update the GPS text on home page
  const gpsText =
    document.getElementById(
      "gpsText"
    );

  if (gpsText) {

    gpsText.innerText =
      "\uD83D\uDCCD " + displayName + " (" + center.lat.toFixed(4) + ", " + center.lng.toFixed(4) + ")";
  }
}


/*
============================================================
OPEN SEARCH LOCATION MODAL
============================================================
*/

function openSearchModal() {

  const modal =
    document.getElementById(
      "searchLocationModal"
    );

  if (!modal) return;

  modal.style.display =
    "flex";

  // Focus input
  const input =
    document.getElementById(
      "searchLocationInput"
    );

  if (input) {

    input.value = "";
    input.focus();
  }

  // Clear previous results
  const results =
    document.getElementById(
      "searchLocationResults"
    );

  if (results) {

    results.innerHTML = "";
  }

  // Clear error
  const error =
    document.getElementById(
      "searchLocationError"
    );

  if (error) {

    error.style.display =
      "none";
  }
}


/*
============================================================
CLOSE SEARCH LOCATION MODAL
============================================================
*/

function closeSearchModal() {

  const modal =
    document.getElementById(
      "searchLocationModal"
    );

  if (!modal) return;

  modal.style.display =
    "none";
}


/*
============================================================
SEARCH LOCATION VIA NOMINATIM
============================================================

Uses OpenStreetMap Nominatim geocoding API.
============================================================
*/

async function searchLocation() {

  const input =
    document.getElementById(
      "searchLocationInput"
    );

  const error =
    document.getElementById(
      "searchLocationError"
    );

  const results =
    document.getElementById(
      "searchLocationResults"
    );

  if (!input) return;

  const query =
    input.value.trim();

  if (!query) {

    if (error) {

      error.style.display =
        "block";

      error.innerText =
        "Please enter a city, area, village or landmark.";
    }

    return;
  }

  // Show loading
  if (results) {

    results.innerHTML =
      "<div class='card' style='text-align:center;padding:20px;'>Searching...</div>";
  }

  if (error) {

    error.style.display =
      "none";
  }

  try {

    const encoded =
      encodeURIComponent(
        query
      );

    const response =
      await fetch(
        "https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=5&countrycodes=IN"
      );

    const data =
      await response.json();

    if (
      !data ||
      data.length === 0
    ) {

      if (results) {

        results.innerHTML =
          "<div class='card' style='text-align:center;padding:20px;color:#888;'>No results found. Try a different search term.</div>";
      }

      return;
    }

    // Render results using data attributes to avoid escaping issues
    let html = "";

    data.forEach(
      function(place) {

        var lat =
          parseFloat(
            place.lat
          );

        var lng =
          parseFloat(
            place.lon
          );

        var displayName =
          place.display_name
            .split(",")
            .slice(0, 3)
            .join(",")
            .trim() ||
          place.display_name;

        // Build result item using data attributes for lat/lng
        // Name is read from element text when selected
        html +=
          '<div ' +
          'class="searchResultItem" ' +
          'data-lat="' + lat + '" ' +
          'data-lng="' + lng + '" ' +
          'onclick="selectSearchResult(this, \'' + displayName.replace(/'/g, "") + '\')" ' +
          'style="padding:12px 16px;border-bottom:1px solid #eee;cursor:pointer;display:flex;align-items:center;gap:12px;transition:background .2s;" ' +
          'onmouseover="this.style.background=\'#f5f5f5\'" ' +
          'onmouseout="this.style.background=\'transparent\'">' +
          '<i class="material-icons" style="color:var(--primary);">location_on</i>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:500;font-size:14px;">' + displayName + '</div>' +
          '<div style="font-size:11px;color:#888;margin-top:2px;">' + lat.toFixed(4) + ", " + lng.toFixed(4) + '</div>' +
          '</div>' +
          '<i class="material-icons" style="color:#999;font-size:18px;">chevron_right</i>' +
          '</div>';
      }
    );

    if (results) {

      results.innerHTML =
        html;
    }
  }
  catch (err) {

    console.log(
      "Nominatim search error:",
      err
    );

    if (error) {

      error.style.display =
        "block";

      error.innerText =
        "Search failed. Please check your internet and try again.";
    }

    if (results) {

      results.innerHTML = "";
    }
  }
}


/*
============================================================
SELECT SEARCH RESULT (via data attributes)
============================================================

Called when user clicks a search result item.
Reads lat/lng/name from data attributes.
============================================================
*/

function selectSearchResult(el, name) {

  var lat =
    parseFloat(
      el.getAttribute(
        "data-lat"
      )
    );

  var lng =
    parseFloat(
      el.getAttribute(
        "data-lng"
      )
    );

  if (
    isNaN(lat) ||
    isNaN(lng)
  ) {

    return;
  }

  // Use provided name, fallback to element text
  if (!name) {
    name = el.textContent.trim().substring(0, 100);
  }

  // Save and apply
  saveSearchCenter(
    lat,
    lng,
    name
  );

  // Close modal
  closeSearchModal();

  // Show confirmation toast
  showLocationToast(
    name
  );
}


/*
============================================================
SEARCH ON ENTER KEY
============================================================
*/

function searchLocationOnEnter(
  event
) {

  if (
    event.key === "Enter"
  ) {

    event.preventDefault();
    searchLocation();
  }
}


/*
============================================================
SHOW LOCATION TOAST
============================================================
*/

function showLocationToast(
  name
) {

  // Remove existing toast if any
  var existing =
    document.getElementById(
      "locationToast"
    );

  if (existing) {

    existing.remove();
  }

  var toast =
    document.createElement(
      "div"
    );

  toast.id =
    "locationToast";

  toast.style.cssText =
    "position: fixed; bottom: 140px; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 12px 24px; border-radius: 30px; font-size: 14px; z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; max-width: 90%;";

  toast.innerText =
    "\uD83D\uDCCD Location set to " + name;

  document.body.appendChild(
    toast
  );

  // Auto remove after 3 seconds
  setTimeout(
    function() {

      if (toast.parentNode) {

        toast.remove();
      }
    },
    3000
  );
}


/*
============================================================
HANDLE SEARCH LOCATION CHANGE
============================================================

Called when the header dropdown changes.
============================================================
*/

function onSearchLocationChange() {

  var select =
    document.getElementById(
      "searchLocation"
    );

  if (!select) return;

  var value =
    select.value;

  if (value === "search") {

    // Reset dropdown back to current
    updateSearchLocationDisplay();

    // Open search modal
    openSearchModal();
  }
  else if (
    value === "clear"
  ) {

    // Reset dropdown back to current
    updateSearchLocationDisplay();

    // Clear manual location
    clearSearchCenter();
  }
}


/*
============================================================
INIT SEARCH LOCATION DROPDOWN
============================================================
*/

function initSearchLocationUI() {

  initSearchLocation();

  var select =
    document.getElementById(
      "searchLocation"
    );

  if (!select) return;

  select.addEventListener(
    "change",
    onSearchLocationChange
  );

  // Initial display update
  updateSearchLocationDisplay();
}


/*
============================================================
EXPORT GLOBALS
============================================================
*/

window.APP = APP;
window.initSearchLocation = initSearchLocation;
window.initSearchLocationUI = initSearchLocationUI;
window.saveSearchCenter = saveSearchCenter;
window.clearSearchCenter = clearSearchCenter;
window.getEffectiveCenter = getEffectiveCenter;
window.getCenterLat = getCenterLat;
window.getCenterLng = getCenterLng;
window.getCenterDisplayName = getCenterDisplayName;
window.updateSearchLocationDisplay = updateSearchLocationDisplay;
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.searchLocation = searchLocation;
window.searchLocationOnEnter = searchLocationOnEnter;
window.selectSearchResult = selectSearchResult;
window.onSearchLocationChange = onSearchLocationChange;

console.log("SearchLocation Engine loaded.");