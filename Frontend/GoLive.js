/*
============================================================
EKKA1KM FRONTEND
GoLive.js
Stage 4: Complete Camera Person Live System UI & Bridge
Integrates broadcaster authorization discovery, authoritative
native GPS acquisition, and production native streaming launcher.
============================================================
*/

let CURRENT_AUTHORIZED_CHANNEL = null;
let LOCKED_GPS = null;
let IS_ACQUIRING_GPS = false;

/**
 * ============================================================
 * CHECK BROADCASTER ALLOCATION
 * ?action=myauthorizedchannels&session=TOKEN
 * Invoked on app startup and login to toggle Go Live drawer visibility.
 * Strictly checks that authenticated user has an active LiveAllocation.
 * ============================================================
 */
async function checkBroadcasterAllocation() {
  const drawerItem = document.getElementById("drawerGoLiveItem");

  // Check login state
  const session = (typeof getSessionToken === "function") ? getSessionToken() :
    localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);

  if (!session) {
    if (drawerItem) drawerItem.style.display = "none";
    CURRENT_AUTHORIZED_CHANNEL = null;
    return;
  }

  try {
    const url = getApiUrl() + "?action=myauthorizedchannels&session=" + encodeURIComponent(session);
    const res = await fetch(url);
    const json = await res.json();

    if (json && json.success && json.data && json.data.channels && json.data.channels.length > 0) {
      CURRENT_AUTHORIZED_CHANNEL = json.data.channels[0];
      if (drawerItem) {
        drawerItem.style.display = "flex";
      }
      // If currently on Go Live page, refresh channel info
      const activePage = document.querySelector(".page.activePage");
      if (activePage && activePage.id === "golive") {
        renderGoLiveChannelInfo();
      }
    } else {
      CURRENT_AUTHORIZED_CHANNEL = null;
      if (drawerItem) {
        drawerItem.style.display = "none";
      }
    }
  } catch (err) {
    console.log("Broadcaster allocation check notice:", err);
    if (drawerItem) drawerItem.style.display = "none";
  }
}

/**
 * ============================================================
 * INITIALIZE GO LIVE STUDIO PAGE
 * Triggered when navigating to 'golive' page.
 * Displays authorized channel and captures authoritative GPS.
 * ============================================================
 */
function initGoLiveStudio() {
  renderGoLiveChannelInfo();
  acquireAuthoritativeGps();
  checkHardwarePermissionsStatus();
}

/**
 * Renders authorized channel details for the broadcaster.
 */
function renderGoLiveChannelInfo() {
  const titleEl = document.getElementById("goLiveChannelTitle");
  const urlEl = document.getElementById("goLiveChannelHandle");
  const badgeEl = document.getElementById("goLiveChannelStatusBadge");

  if (!CURRENT_AUTHORIZED_CHANNEL) {
    if (titleEl) titleEl.textContent = "Checking authorization...";
    if (urlEl) urlEl.textContent = "";
    if (badgeEl) {
      badgeEl.textContent = "Verifying";
      badgeEl.style.background = "#64748b";
    }
    checkBroadcasterAllocation();
    return;
  }

  if (titleEl) {
    titleEl.textContent = CURRENT_AUTHORIZED_CHANNEL.channelTitle || "Ekka1Km LiveNews";
  }
  if (urlEl) {
    urlEl.textContent = CURRENT_AUTHORIZED_CHANNEL.channelCustomUrl || "@ekka1kmlivenews";
  }
  if (badgeEl) {
    badgeEl.textContent = "Authorized & Active";
    badgeEl.style.background = "#10b981";
  }
}

function getLiveBroadcasterPlugin() {
  if (typeof getEkkaLiveBroadcaster === "function") {
    const p = getEkkaLiveBroadcaster();
    if (p) return p;
  }
  return (
    window.EkkaLiveBroadcaster ||
    (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.EkkaLiveBroadcaster) ||
    null
  );
}

function getNativeLocationPluginInstance() {
  if (typeof getEkkaNativeLocation === "function") {
    const p = getEkkaNativeLocation();
    if (p) return p;
  }
  return (
    window.EkkaNativeLocation ||
    (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.EkkaNativeLocation) ||
    null
  );
}

/**
 * ============================================================
 * ACQUIRE AUTHORITATIVE GPS
 * Reuses existing EkkaNativeLocationPlugin on Android.
 * Broadcaster GPS is authoritative; validates range [-90..90, -180..180].
 * ============================================================
 */
function acquireAuthoritativeGps() {
  const gpsStatusEl = document.getElementById("goLiveGpsStatus");
  const gpsCoordsEl = document.getElementById("goLiveGpsCoords");
  const gpsBadgeEl = document.getElementById("goLiveGpsBadge");
  const refreshBtn = document.getElementById("btnRefreshGps");

  if (refreshBtn) {
    refreshBtn.textContent = "Acquiring...";
    refreshBtn.disabled = true;
  }
  if (gpsStatusEl) gpsStatusEl.textContent = "Acquiring authoritative GPS...";
  if (gpsCoordsEl) gpsCoordsEl.textContent = "Contacting GPS satellites...";
  if (gpsBadgeEl) {
    gpsBadgeEl.textContent = "Acquiring";
    gpsBadgeEl.style.background = "#f59e0b";
  }

  IS_ACQUIRING_GPS = true;
  LOCKED_GPS = null;

  // 1. Check if EkkaNativeLocation Capacitor plugin is available (Android app)
  const nativeLocation = getNativeLocationPluginInstance();
  if (nativeLocation && typeof nativeLocation.getCurrentLocation === "function") {
    nativeLocation.getCurrentLocation()
      .then(function(loc) {
        handleGpsSuccess(loc.latitude, loc.longitude, loc.accuracy);
      })
      .catch(function(err) {
        console.warn("Native GPS acquisition fallback:", err);
        fallbackToBrowserGps();
      });
  } else {
    fallbackToBrowserGps();
  }
}

function fallbackToBrowserGps() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        handleGpsSuccess(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      function(err) {
        handleGpsError(err.message || "Location access denied");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  } else {
    handleGpsError("Geolocation is not supported by this device");
  }
}

function resetGpsButton() {
  const refreshBtn = document.getElementById("btnRefreshGps");
  if (refreshBtn) {
    refreshBtn.textContent = "Refresh GPS";
    refreshBtn.disabled = false;
  }
}

function handleGpsSuccess(lat, lng, accuracy) {
  IS_ACQUIRING_GPS = false;
  resetGpsButton();

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  if (isNaN(numLat) || numLat < -90 || numLat > 90 || isNaN(numLng) || numLng < -180 || numLng > 180) {
    handleGpsError("Invalid coordinates acquired: " + lat + ", " + lng);
    return;
  }

  LOCKED_GPS = {
    lat: numLat,
    lng: numLng,
    accuracy: accuracy || 0,
    timestamp: Date.now()
  };

  const gpsStatusEl = document.getElementById("goLiveGpsStatus");
  const gpsCoordsEl = document.getElementById("goLiveGpsCoords");
  const gpsBadgeEl = document.getElementById("goLiveGpsBadge");

  if (gpsStatusEl) gpsStatusEl.textContent = "GPS Locked (Authoritative)";
  if (gpsCoordsEl) gpsCoordsEl.textContent = numLat.toFixed(4) + "° N, " + numLng.toFixed(4) + "° E";
  if (gpsBadgeEl) {
    gpsBadgeEl.textContent = "GPS Ready";
    gpsBadgeEl.style.background = "#10b981";
  }

  // Also save to app location cache for consistency
  if (typeof saveLocation === "function") {
    saveLocation(numLat, numLng, "", "", "", "Current Location");
  }
}

function handleGpsError(errMsg) {
  IS_ACQUIRING_GPS = false;
  resetGpsButton();
  LOCKED_GPS = null;

  const gpsStatusEl = document.getElementById("goLiveGpsStatus");
  const gpsCoordsEl = document.getElementById("goLiveGpsCoords");
  const gpsBadgeEl = document.getElementById("goLiveGpsBadge");

  if (gpsStatusEl) gpsStatusEl.textContent = "GPS Error: " + errMsg;
  if (gpsCoordsEl) gpsCoordsEl.textContent = "Please enable GPS/Location in device settings";
  if (gpsBadgeEl) {
    gpsBadgeEl.textContent = "GPS Required";
    gpsBadgeEl.style.background = "#ef4444";
  }
}

/**
 * Updates UI badges for Camera & Microphone permissions.
 */
function updateMediaBadgeUI(cameraGranted, micGranted) {
  const camBadge = document.getElementById("goLiveCamBadge");
  const micBadge = document.getElementById("goLiveMicBadge");
  const hintEl = document.getElementById("goLivePermHint");

  if (camBadge) {
    if (cameraGranted) {
      camBadge.textContent = "Camera Ready";
      camBadge.style.background = "#10b981";
      camBadge.title = "Camera permission granted";
    } else {
      camBadge.textContent = "Permission Needed";
      camBadge.style.background = "#f59e0b";
      camBadge.title = "Tap to grant Camera permission";
    }
  }

  if (micBadge) {
    if (micGranted) {
      micBadge.textContent = "Mic Ready";
      micBadge.style.background = "#10b981";
      micBadge.title = "Microphone permission granted";
    } else {
      micBadge.textContent = "Permission Needed";
      micBadge.style.background = "#f59e0b";
      micBadge.title = "Tap to grant Microphone permission";
    }
  }

  if (hintEl) {
    if (cameraGranted && micGranted) {
      hintEl.textContent = "Hardware Ready";
      hintEl.style.color = "#059669";
    } else {
      hintEl.textContent = "Tap badges to grant permission";
      hintEl.style.color = "#d97706";
    }
  }
}

/**
 * Checks Camera & Microphone permissions status.
 * On Android, authoritatively queries native OS permissions via Capacitor plugin.
 * On Web, checks navigator.permissions or getUserMedia.
 */
function checkHardwarePermissionsStatus() {
  const broadcaster = getLiveBroadcasterPlugin();

  // 1. Native Android check
  if (broadcaster && typeof broadcaster.checkMediaPermissions === "function") {
    broadcaster.checkMediaPermissions()
      .then(function(res) {
        const camGranted = res && (res.camera === "granted" || res.allGranted === true);
        const micGranted = res && (res.microphone === "granted" || res.allGranted === true);
        updateMediaBadgeUI(camGranted, micGranted);
      })
      .catch(function(err) {
        console.warn("Native media permission check notice:", err);
        checkBrowserMediaPermissions();
      });
    return;
  }

  // 2. Web fallback
  checkBrowserMediaPermissions();
}

function checkBrowserMediaPermissions() {
  if (navigator.permissions && navigator.permissions.query) {
    Promise.all([
      navigator.permissions.query({ name: "camera" }).catch(function() { return { state: "prompt" }; }),
      navigator.permissions.query({ name: "microphone" }).catch(function() { return { state: "prompt" }; })
    ]).then(function(results) {
      const camOk = results[0] && results[0].state === "granted";
      const micOk = results[1] && results[1].state === "granted";
      updateMediaBadgeUI(camOk, micOk);
    }).catch(function() {
      updateMediaBadgeUI(false, false);
    });
  } else {
    updateMediaBadgeUI(false, false);
  }
}

/**
 * Requests Camera & Microphone permissions interactively.
 * Tapping on badges calls this method.
 */
function requestHardwarePermissions() {
  const broadcaster = getLiveBroadcasterPlugin();

  // 1. Native Android request
  if (broadcaster && typeof broadcaster.requestMediaPermissions === "function") {
    broadcaster.requestMediaPermissions()
      .then(function(res) {
        const camGranted = res && (res.camera === "granted" || res.allGranted === true);
        const micGranted = res && (res.microphone === "granted" || res.allGranted === true);
        updateMediaBadgeUI(camGranted, micGranted);
      })
      .catch(function(err) {
        console.warn("Native media permission request notice:", err);
        checkHardwarePermissionsStatus();
      });
    return;
  }

  // 2. Browser request
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(function(stream) {
        updateMediaBadgeUI(true, true);
        stream.getTracks().forEach(function(t) { t.stop(); });
      })
      .catch(function() {
        updateMediaBadgeUI(false, false);
      });
  }
}

/**
 * ============================================================
 * LAUNCH LIVE BROADCASTER
 * Validates inputs and triggers the native Capacitor plugin.
 * ============================================================
 */
function launchLiveBroadcaster() {
  const errorEl = document.getElementById("goLiveErrorMsg");
  if (errorEl) errorEl.style.display = "none";

  // 1. Validate Channel
  if (!CURRENT_AUTHORIZED_CHANNEL || !CURRENT_AUTHORIZED_CHANNEL.channelId) {
    showGoLiveError("No authorized YouTube channel allocated to your account.");
    return;
  }

  // 2. Validate Title
  const titleInput = document.getElementById("goLiveTitleInput");
  const title = (titleInput ? titleInput.value : "").trim();
  if (!title) {
    showGoLiveError("Please enter a Live Broadcast Title.");
    if (titleInput) titleInput.focus();
    return;
  }

  const descInput = document.getElementById("goLiveDescInput");
  const description = (descInput ? descInput.value : "").trim();

  // 3. Validate Authoritative GPS
  if (!LOCKED_GPS || LOCKED_GPS.lat === undefined || LOCKED_GPS.lng === undefined) {
    showGoLiveError("Authoritative GPS location is required. Please wait for GPS lock.");
    acquireAuthoritativeGps();
    return;
  }

  // 4. Validate Session
  const session = (typeof getSessionToken === "function") ? getSessionToken() :
    localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
  if (!session) {
    showGoLiveError("Session expired. Please log in again.");
    if (typeof openPage === "function") openPage("login");
    return;
  }

  // 5. Invoke Capacitor Native Bridge
  const broadcaster = getLiveBroadcasterPlugin();
  if (broadcaster && typeof broadcaster.launchBroadcaster === "function") {
    const btn = document.getElementById("btnLaunchBroadcaster");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Opening Live Studio...";
    }

    broadcaster.launchBroadcaster({
      apiUrl: getApiUrl(),
      sessionToken: session,
      channelId: CURRENT_AUTHORIZED_CHANNEL.channelId,
      channelTitle: CURRENT_AUTHORIZED_CHANNEL.channelTitle || "Ekka1Km LiveNews",
      title: title,
      description: description,
      latitude: LOCKED_GPS.lat,
      longitude: LOCKED_GPS.lng
    }).then(function() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Launch Live Studio";
      }
    }).catch(function(err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Launch Live Studio";
      }
      showGoLiveError("Failed to launch Live Studio: " + (err.message || err));
    });
  } else {
    // Non-native fallback / browser notice
    showGoLiveError("Native RootEncoder live streaming is only available inside the Android APK. Web client validated.");
  }
}

function showGoLiveError(msg) {
  const errorEl = document.getElementById("goLiveErrorMsg");
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  } else {
    alert(msg);
  }
}

