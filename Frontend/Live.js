/*
============================================================
EKKA1KM FRONTEND
Live.js
Stage 5 — Viewer GPS Filtering + Persistent Live PIP
- Authoritative source: LiveSessions (Status === 'Active')
- Haversine distance filtering vs viewer Hero GPS & radius
- Pulsing Live icon/switch when active streams exist
- Dedicated LIVE NOW screen (no auto-play)
- Persistent floating PIP player across all app navigation
- Clean single-player switching (zero audio/video overlap)
- Stream termination teardown (no auto-play fallback)
- READ-ONLY viewer (no viewer writes or heartbeat pings)
============================================================
*/

let CURRENT_LIVE_DATA = [];
let ACTIVE_LIVE_SESSIONS = [];
let CURRENT_ACTIVE_PIP_SESSION = null;
let IS_PIP_MINIMIZED = false;

/*
============================================================
HAVERSINE DISTANCE CALCULATION (km)
============================================================
*/
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  lat1 = Number(lat1);
  lng1 = Number(lng1);
  lat2 = Number(lat2);
  lng2 = Number(lng2);

  if (!lat1 || !lng1 || !lat2 || !lng2) return null;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/*
============================================================
FILTER & SORT LIVE SESSIONS FOR VIEWER HERO GPS & RADIUS
============================================================
*/
function filterLiveSessionsForViewer(items) {
  if (!items || !Array.isArray(items)) return [];

  const savedLoc = typeof getSavedLocation === "function" ? getSavedLocation() : null;
  const userLat = savedLoc && savedLoc.lat ? Number(savedLoc.lat) : null;
  const userLng = savedLoc && savedLoc.lng ? Number(savedLoc.lng) : null;

  const rawRadius = typeof getCurrentRadius === "function" ? getCurrentRadius() : "5";
  const isAllRadius = !rawRadius || String(rawRadius).toLowerCase() === "all" || String(rawRadius).toLowerCase() === "all india";
  const radiusNum = Number(rawRadius) || 5;

  const activeOnly = items.filter(function(item) {
    const status = String(item.Status || (item.IsLive === "yes" ? "Active" : "")).trim().toLowerCase();
    return status === "active";
  });

  const processed = [];

  activeOnly.forEach(function(item) {
    const sessionLat = Number(item.Latitude || item.latitude);
    const sessionLng = Number(item.Longitude || item.longitude);

    let distance = null;
    if (userLat && userLng && sessionLat && sessionLng) {
      distance = calculateDistanceKm(userLat, userLng, sessionLat, sessionLng);
    } else if (item.DistanceKm !== undefined && item.DistanceKm !== null) {
      distance = Number(item.DistanceKm);
    }

    // Filter by radius if not 'all'
    if (!isAllRadius && distance !== null && distance > radiusNum) {
      return; // Outside viewer radius
    }

    const copy = Object.assign({}, item);
    copy.DistanceKm = distance;
    copy.LiveSessionID = String(copy.LiveSessionID || copy.LiveID || copy.id || "");
    copy.Title = copy.Title || copy.title || "Live Broadcast";
    copy.CameraPersonName = copy.CameraPersonName || copy.cameraPersonName || copy.Announcer || copy.Streamer || "Broadcaster";
    copy.LocationEventName = copy.LocationEventName || copy.locationEventName || copy.City || "";
    copy.CurrentViewers = Number(copy.CurrentViewers || copy.ViewerCount || copy.viewerCount || 0);

    processed.push(copy);
  });

  // Sort by nearest distance first
  if (userLat && userLng) {
    processed.sort(function(a, b) {
      if (a.DistanceKm === null) return 1;
      if (b.DistanceKm === null) return -1;
      return a.DistanceKm - b.DistanceKm;
    });
  }

  return processed;
}

/*
============================================================
UPDATE LIVE DISCOVERY INDICATORS (Pulse / Badges / Home Section)
============================================================
*/
function updateLiveDiscoveryUI() {
  const count = ACTIVE_LIVE_SESSIONS.length;
  const hasActive = count > 0;

  // 1. Home Category Live Icon
  const homeCatIcon = document.getElementById("homeLiveCatIcon");
  if (homeCatIcon) {
    if (hasActive) {
      homeCatIcon.classList.add("live-icon-pulsing");
    } else {
      homeCatIcon.classList.remove("live-icon-pulsing");
    }
  }

  // 2. Side Drawer Live Badge
  const drawerLiveBadge = document.getElementById("drawerLiveBadge");
  if (drawerLiveBadge) {
    if (hasActive) {
      drawerLiveBadge.style.display = "inline-block";
      drawerLiveBadge.classList.add("live-badge-pulsing");
      drawerLiveBadge.textContent = count > 1 ? count + " LIVE" : "LIVE";
    } else {
      drawerLiveBadge.style.display = "none";
      drawerLiveBadge.classList.remove("live-badge-pulsing");
    }
  }

  // 3. Home Live Section (NO permanent section when no live is active)
  const homeLiveSection = document.getElementById("homeLiveAroundYou");
  if (homeLiveSection) {
    homeLiveSection.style.display = hasActive ? "block" : "none";
  }

  // 4. LIVE NOW Header Count Badge
  const liveActiveCountBadge = document.getElementById("liveActiveCountBadge");
  if (liveActiveCountBadge) {
    if (hasActive) {
      liveActiveCountBadge.style.display = "inline-block";
      liveActiveCountBadge.textContent = count + " LIVE";
    } else {
      liveActiveCountBadge.style.display = "none";
    }
  }
}

/*
============================================================
CHECK IF PLAYING STREAM HAS ENDED
============================================================
*/
function reconcilePlayingLiveSession() {
  if (!CURRENT_ACTIVE_PIP_SESSION) return;

  const currentId = String(CURRENT_ACTIVE_PIP_SESSION.LiveSessionID || "");
  if (!currentId) return;

  const isStillActive = ACTIVE_LIVE_SESSIONS.some(function(s) {
    return String(s.LiveSessionID) === currentId;
  });

  if (!isStillActive) {
    console.log("[Live] Active stream ended or left radius. Closing PIP player:", currentId);
    stopAndDestroyLivePlayer();

    if (typeof showToast === "function") {
      showToast("The live stream has ended.", "info");
    }
  }
}

/*
============================================================
LOAD LIVE
?action=live&lat=...&lng=...&radius=...
============================================================
*/
async function loadLive() {
  const homeContainer = document.getElementById("homeLiveAroundYouContent");
  const liveContainer = document.getElementById("liveList");

  if (homeContainer) {
    homeContainer.innerHTML = '<div class="homeSection-empty">Loading live broadcasts...</div>';
  }

  if (liveContainer) {
    liveContainer.innerHTML = '<div class="card" style="text-align:center;padding:24px;">Loading live broadcasts...</div>';
  }

  updateLiveGpsContextBar();

  try {
    const savedLoc = typeof getSavedLocation === "function" ? getSavedLocation() : null;
    const radius = typeof getCurrentRadius === "function" ? getCurrentRadius() : "5";

    let url = getApiUrl() + "?action=live";
    if (savedLoc && savedLoc.lat && savedLoc.lng) {
      url += "&lat=" + encodeURIComponent(savedLoc.lat) + "&lng=" + encodeURIComponent(savedLoc.lng);
    }
    if (radius) {
      url += "&radius=" + encodeURIComponent(radius);
    }

    const response = await fetch(url);
    const json = await response.json();

    let items = [];
    if (json && json.data) {
      if (Array.isArray(json.data.data)) {
        items = json.data.data;
      } else if (Array.isArray(json.data)) {
        items = json.data;
      }
    }

    CURRENT_LIVE_DATA = items;
    ACTIVE_LIVE_SESSIONS = filterLiveSessionsForViewer(items);

    updateLiveDiscoveryUI();
    renderHomeLivePreview(ACTIVE_LIVE_SESSIONS);
    renderLivePage(ACTIVE_LIVE_SESSIONS);
    reconcilePlayingLiveSession();

  } catch (err) {
    console.log("Live load error:", err);

    CURRENT_LIVE_DATA = [];
    ACTIVE_LIVE_SESSIONS = [];
    updateLiveDiscoveryUI();

    if (homeContainer) {
      homeContainer.innerHTML = '<div class="homeSection-empty">Unable to load live right now.</div>';
    }

    if (liveContainer) {
      liveContainer.innerHTML = '<div class="card" style="text-align:center;padding:24px;color:#ef4444;">Unable to load live right now. Please try again.</div>';
    }
  }
}

/*
============================================================
UPDATE LIVE GPS CONTEXT BAR
============================================================
*/
function updateLiveGpsContextBar() {
  const barText = document.getElementById("liveGpsContextText");
  if (!barText) return;

  const savedLoc = typeof getSavedLocation === "function" ? getSavedLocation() : null;
  const rawRadius = typeof getCurrentRadius === "function" ? getCurrentRadius() : "5";

  const locName = (savedLoc && (savedLoc.area || savedLoc.city || savedLoc.name)) || "your location";
  const radiusText = (String(rawRadius).toLowerCase() === "all" || String(rawRadius).toLowerCase() === "all india")
    ? "All India"
    : rawRadius + " km";

  barText.innerHTML = '<i class="material-icons" style="font-size:14px;vertical-align:middle;color:#0f9d58;margin-right:3px;">location_on</i>' +
    'Showing broadcasts within <strong>' + escapeHtml(radiusText) + '</strong> of <strong>' + escapeHtml(locName) + '</strong>';
}

/*
============================================================
RENDER HOME LIVE PREVIEW
============================================================
*/
function renderHomeLivePreview(items) {
  const container = document.getElementById("homeLiveAroundYouContent");
  if (!container) return;

  const previewItems = (items || []).slice(0, 4);

  if (previewItems.length === 0) {
    container.innerHTML = '<div class="homeSection-empty">No live streams right now.</div>';
    return;
  }

  let html = '<div class="homePreviewGrid">';

  previewItems.forEach(function(item) {
    const liveId = item.LiveSessionID || "";
    const title = escapeHtml(item.Title || "Live");
    const broadcaster = escapeHtml(item.CameraPersonName || "");
    const locationName = escapeHtml(item.LocationEventName || "");
    const distanceText = item.DistanceKm !== null && item.DistanceKm !== undefined ? item.DistanceKm + " km away" : "";
    const viewers = Number(item.CurrentViewers || 0);

    html += '<div class="liveCard" onclick="openPage(\'live\')">';
    html += '  <div class="liveCard-img liveCard-imgPlaceholder"><i class="material-icons" style="color:#ef4444;">videocam</i></div>';
    html += '  <div class="liveCard-body">';
    html += '    <div class="homeSectionCard-top">';
    html += '      <span class="liveCard-badge-live">LIVE</span>';
    if (viewers > 0) {
      html += '    <span class="liveCard-category">' + viewers + ' watching</span>';
    }
    html += '    </div>';
    html += '    <div class="liveCard-title" title="' + title + '">' + title + '</div>';
    if (broadcaster) {
      html += '    <div class="liveCard-announcer">' + broadcaster + '</div>';
    }
    if (distanceText) {
      html += '    <div class="liveCard-meta"><i class="material-icons">place</i> ' + distanceText + '</div>';
    } else if (locationName) {
      html += '    <div class="liveCard-meta">' + locationName + '</div>';
    }
    html += '    <div class="liveCard-actions">';
    html += '      <button onclick="event.stopPropagation();watchLiveStream(\'' + liveId + '\')">Watch Live</button>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

/*
============================================================
RENDER LIVE NOW FULL PAGE
Lists all relevant active Live sessions.
Zero auto-play. Deliberate selection.
============================================================
*/
function renderLivePage(items) {
  const container = document.getElementById("liveList");
  if (!container) return;

  const liveItems = items || [];

  if (liveItems.length === 0) {
    const rawRadius = typeof getCurrentRadius === "function" ? getCurrentRadius() : "5";
    const radiusLabel = (String(rawRadius).toLowerCase() === "all" || String(rawRadius).toLowerCase() === "all india") ? "All India" : rawRadius + " km";

    container.innerHTML =
      '<div class="card" style="text-align:center;padding:36px 16px;border-radius:16px;">' +
      '  <div style="margin-bottom:12px;">' +
      '    <i class="material-icons" style="font-size:54px;color:#9ca3af;">videocam_off</i>' +
      '  </div>' +
      '  <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#374151;">No Active Live Streams</h3>' +
      '  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">' +
      '    There are currently no active live broadcasts within your selected radius (<strong>' + escapeHtml(radiusLabel) + '</strong>).' +
      '  </p>' +
      '</div>';
    return;
  }

  let html = '<div class="liveNow-grid">';

  liveItems.forEach(function(item) {
    const liveId = item.LiveSessionID || "";
    const title = escapeHtml(item.Title || "Live Broadcast");
    const broadcaster = escapeHtml(item.CameraPersonName || "Ekka Broadcaster");
    const locationName = escapeHtml(item.LocationEventName || "");
    const distanceText = item.DistanceKm !== null && item.DistanceKm !== undefined ? item.DistanceKm + " km away" : "";
    const viewers = Number(item.CurrentViewers || 0);

    html += '<div class="liveNow-card" data-live-id="' + liveId + '">';
    html += '  <div class="liveNow-media">';
    html += '    <i class="material-icons" style="font-size:54px;color:#ef4444;opacity:0.85;">live_tv</i>';
    html += '    <span class="liveNow-badge">LIVE</span>';
    if (viewers > 0) {
      html += '    <span class="liveNow-viewers"><i class="material-icons" style="font-size:12px;">visibility</i> ' + viewers + '</span>';
    }
    html += '  </div>';

    html += '  <div class="liveNow-body">';
    html += '    <div class="liveNow-title">' + title + '</div>';

    html += '    <div class="liveNow-metaRow">';
    html += '      <span class="liveNow-metaItem"><i class="material-icons" style="font-size:14px;color:#0f9d58;">videocam</i> ' + broadcaster + '</span>';
    if (distanceText) {
      html += '      <span class="liveNow-metaItem"><i class="material-icons" style="font-size:14px;color:#ef4444;">place</i> ' + distanceText + '</span>';
    } else if (locationName) {
      html += '      <span class="liveNow-metaItem"><i class="material-icons" style="font-size:14px;color:#6b7280;">place</i> ' + locationName + '</span>';
    }
    html += '    </div>';

    html += '    <button class="liveNow-btnWatch" onclick="watchLiveStream(\'' + liveId + '\')">';
    html += '      <i class="material-icons" style="font-size:16px;">play_arrow</i> Watch Live';
    html += '    </button>';
    html += '  </div>';
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

/*
============================================================
PERSISTENT FLOATING PIP PLAYER
- Single selected Live at a time
- Persists across app navigation (Home, Discover, Products, etc.)
- Stop / Teardown cleanly before starting any new stream
- Minimize / Expand toggle
- Close / Stop control
============================================================
*/

/**
 * Deliberately launches a live stream in the persistent PIP container.
 * Enforces single-player lifecycle: completely kills prior player before starting new one.
 */
function watchLiveStream(sessionId) {
  if (!sessionId) return;

  const session = ACTIVE_LIVE_SESSIONS.find(function(s) {
    return String(s.LiveSessionID) === String(sessionId);
  }) || CURRENT_LIVE_DATA.find(function(s) {
    return String(s.LiveSessionID || s.LiveID) === String(sessionId);
  });

  if (!session) {
    console.warn("[Live] Session not found for playback:", sessionId);
    return;
  }

  // 1. STREAM SWITCHING: Stop and destroy any existing player first
  stopAndDestroyLivePlayer();

  // 2. Set active PIP session
  CURRENT_ACTIVE_PIP_SESSION = session;

  // 3. Resolve YouTube Embed URL
  let embedUrl = String(session.EmbedUrl || "").trim();
  const videoId = String(session.YouTubeVideoID || session.YouTubeBroadcastID || "").trim();

  if (!embedUrl && videoId) {
    embedUrl = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?autoplay=1&playsinline=1&modestbranding=1&rel=0";
  } else if (embedUrl) {
    // Ensure autoplay and playsinline query params are present
    const separator = embedUrl.indexOf("?") === -1 ? "?" : "&";
    if (embedUrl.indexOf("autoplay=") === -1) {
      embedUrl += separator + "autoplay=1&playsinline=1";
    }
  }

  if (!embedUrl) {
    console.error("[Live] No embed URL or videoId found for session:", session);
    alert("Unable to load video stream for this broadcast.");
    return;
  }

  // 4. Mount persistent PIP player
  const container = document.getElementById("persistentLivePipContainer");
  const iframeWrap = document.getElementById("livePipIframeWrap");
  const titleEl = document.getElementById("livePipTitle");
  const broadcasterEl = document.getElementById("livePipBroadcaster");
  const distanceEl = document.getElementById("livePipDistance");

  if (titleEl) titleEl.textContent = session.Title || "Live Stream";
  if (broadcasterEl) broadcasterEl.textContent = session.CameraPersonName || "Broadcaster";

  if (distanceEl) {
    if (session.DistanceKm !== null && session.DistanceKm !== undefined) {
      distanceEl.textContent = session.DistanceKm + " km";
      distanceEl.style.display = "inline";
    } else {
      distanceEl.style.display = "none";
    }
  }

  if (iframeWrap) {
    iframeWrap.innerHTML =
      '<iframe id="livePipIframe"' +
      ' src="' + embedUrl + '"' +
      ' frameborder="0"' +
      ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
      ' allowfullscreen>' +
      '</iframe>';
  }

  if (container) {
    container.style.display = "block";
    container.classList.remove("live-pip-minimized");
    IS_PIP_MINIMIZED = false;

    const minIcon = document.getElementById("livePipMinIcon");
    if (minIcon) minIcon.textContent = "unfold_less";
  }
}

/**
 * Minimizes / Expands the persistent PIP player without killing audio.
 */
function toggleMinimizeLivePip() {
  const container = document.getElementById("persistentLivePipContainer");
  const minIcon = document.getElementById("livePipMinIcon");
  if (!container) return;

  IS_PIP_MINIMIZED = !IS_PIP_MINIMIZED;

  if (IS_PIP_MINIMIZED) {
    container.classList.add("live-pip-minimized");
    if (minIcon) minIcon.textContent = "unfold_more";
  } else {
    container.classList.remove("live-pip-minimized");
    if (minIcon) minIcon.textContent = "unfold_less";
  }
}

/**
 * Stops playback, removes iframe, and resets PIP state.
 */
function stopAndDestroyLivePlayer() {
  const iframeWrap = document.getElementById("livePipIframeWrap");
  if (iframeWrap) {
    const frame = iframeWrap.querySelector("iframe");
    if (frame) {
      frame.src = "about:blank"; // Instantly stops audio & video
    }
    iframeWrap.innerHTML = "";
  }

  const container = document.getElementById("persistentLivePipContainer");
  if (container) {
    container.style.display = "none";
    container.classList.remove("live-pip-minimized");
  }

  CURRENT_ACTIVE_PIP_SESSION = null;
  IS_PIP_MINIMIZED = false;
}

/**
 * User-initiated Close button handler.
 */
function closeLivePip() {
  stopAndDestroyLivePlayer();
}

/*
============================================================
BACKWARD COMPATIBILITY ALIASES
============================================================
*/
function openLiveWatchModal(liveId) {
  watchLiveStream(liveId);
}

function closeLiveWatchModal() {
  closeLivePip();
}

/*
============================================================
ESCAPE HTML
============================================================
*/
function escapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  var am = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var qt = String.fromCharCode(38) + "quot;";
  var ap = String.fromCharCode(38) + "#39;";
  return s.replace(/&/g, am).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, qt).replace(/'/g, ap);
}

/*
============================================================
VALID IMAGE URL CHECK
============================================================
*/
function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.trim().toLowerCase().startsWith("http");
}
