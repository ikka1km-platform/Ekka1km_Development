/*
============================================================
EKKA1KM FRONTEND
admin-live.js
V5.8.0 - ADMIN LIVE MONITORING & MODERATION CENTER (Phase 5.8)
Real-time operational stream monitoring, chat moderation, 
moderator management, and stream lifecycle controls
============================================================
*/

(function () {

  let _liveAutoRefreshTimer = null;
  let _liveAutoRefreshEnabled = false;
  let _currentLiveTab = "cctv"; // 'cctv' | 'streams' | 'channels' | 'allocations' | 'history' | 'locations' | 'events'
  let _currentLiveStreams = [];
  let _currentChannels = [];
  let _currentAllocations = [];
  let _currentHistorySessions = [];
  let _historySearchQuery = "";
  let _historyStatusFilter = "";
  let _historyDateFilter = "";
  let _historyPage = 1;
  let _historyPagination = { page: 1, limit: 25, totalCount: 0, totalPages: 1 };
  let _currentLiveLocations = [];
  let _locationSearchQuery = "";
  let _currentLiveEvents = [];
  let _eventSearchQuery = "";
  let _liveSearchQuery = "";
  let _liveStatusFilter = "";
  let _channelSearchQuery = "";
  let _allocationSearchQuery = "";
  let _activeLiveIdInModal = null;
  let _activeChatTab = "chat"; // 'chat' or 'moderators'
  let _oauthListenerBound = false;
  let _activeAudibleSessionId = null;

  // Admin Hero GPS & Radius Storage helpers (Admin Monitoring ONLY - isolated from Broadcaster & Viewer)
  function _getAdminLocation() {
    try {
      const raw = localStorage.getItem("ekka_admin_cctv_location");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          return parsed;
        }
      }
    } catch (e) {}
    return { lat: 20.9374, lng: 77.7796, name: "Amravati (Default)" };
  }

  function _saveAdminLocation(loc) {
    try {
      localStorage.setItem("ekka_admin_cctv_location", JSON.stringify(loc));
    } catch (e) {}
  }

  function _getAdminRadius() {
    try {
      const raw = localStorage.getItem("ekka_admin_cctv_radius");
      if (raw !== null && raw !== undefined) {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (e) {}
    return 50;
  }

  function _saveAdminRadius(radius) {
    try {
      localStorage.setItem("ekka_admin_cctv_radius", String(radius));
    } catch (e) {}
  }

  function _sendIframeCommand(iframe, func, args) {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func: func,
        args: args || []
      }), "*");
    } catch (e) {
      console.warn("Error sending postMessage to iframe:", e);
    }
  }

  function _stopAllCctvFeeds() {
    _activeAudibleSessionId = null;
    const iframes = document.querySelectorAll("iframe.cctv-iframe");
    iframes.forEach(function (iframe) {
      try {
        iframe.src = "about:blank";
      } catch (e) {}
    });
    const cards = document.querySelectorAll(".cctv-card.cctv-audio-active");
    cards.forEach(function (card) {
      card.classList.remove("cctv-audio-active");
    });
    const btns = document.querySelectorAll(".cctv-audio-btn");
    btns.forEach(function (btn) {
      btn.innerHTML = "🔇 Audio Off";
      btn.classList.remove("active");
    });
  }

  function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modals = document.querySelectorAll(".modal-overlay");
    modals.forEach(function (m) { m.remove(); });
  }
  if (typeof window.closeModal !== "function") {
    window.closeModal = closeModal;
  }

  function _esc(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" }[c];
    });
  }
  const escapeHtml = typeof window.escapeHtml === "function" ? window.escapeHtml : _esc;

  function formatDuration(sec) {
    const s = Math.max(0, parseInt(sec, 10) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remS = s % 60;
    if (h > 0) {
      return h + "h " + (m < 10 ? "0" : "") + m + "m " + (remS < 10 ? "0" : "") + remS + "s";
    }
    return m + "m " + (remS < 10 ? "0" : "") + remS + "s";
  }

  function renderLiveNavTabs(activeTab) {
    let tabs = "";
    tabs += '<div class="live-nav-tabs" style="display:flex;gap:8px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;padding-bottom:8px;overflow-x:auto;white-space:nowrap;">';
    tabs += '  <button class="module-btn ' + (activeTab === "cctv" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'cctv\')">📹 CCTV Monitor</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "streams" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'streams\')">🔴 Live Streams</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "channels" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'channels\')">📺 YouTube Channels</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "allocations" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'allocations\')">👥 Broadcaster Allocations</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "history" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'history\')">📜 Live History</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "locations" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'locations\')">📍 Locations</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "events" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'events\')">🎪 Events</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "analytics" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'analytics\')">📊 Live Analytics</button>';
    tabs += '</div>';
    return tabs;
  }

  function _stopLiveTimer() {
    if (_liveAutoRefreshTimer) {
      clearInterval(_liveAutoRefreshTimer);
      _liveAutoRefreshTimer = null;
    }
  }

  // Register cleanup with AdminModules when leaving Live module
  if (typeof AdminModules !== "undefined" && typeof AdminModules.registerCleanup === "function") {
    AdminModules.registerCleanup("live", function () {
      _stopLiveTimer();
      _stopAllCctvFeeds();
    });
  }

  AdminModules.register("live", async function (container) {

    // Clean up any previous auto-refresh interval
    _stopLiveTimer();

    function _startLiveTimer() {
      _stopLiveTimer();
      _liveAutoRefreshTimer = setInterval(function () {
        if (_activeLiveIdInModal) {
          if (typeof window._refreshModalChat === "function") {
            window._refreshModalChat();
          }
        } else {
          loadAndRender();
        }
      }, 20000);
    }

    async function loadAndRender() {
      const session = AdminAuth.getSession();
      if (!session) {
        _stopAllCctvFeeds();
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Monitoring Center...</p></div>';

      try {
        const adminLoc = _getAdminLocation();
        const adminRadius = _getAdminRadius();

        let url = getApiUrl() + "?action=adminlivestreams&session=" + encodeURIComponent(session);
        if (_currentLiveTab === "cctv") {
          url += "&lat=" + encodeURIComponent(adminLoc.lat) + "&lng=" + encodeURIComponent(adminLoc.lng) + "&radius=" + encodeURIComponent(adminRadius);
        }

        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          _stopAllCctvFeeds();
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access the Live Moderation Center.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Live Streams</h3><p>' + escapeHtml(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Retry</button></div>';
          return;
        }

        const summary = json.data && json.data.summary || {
          totalStreams: 0,
          activeLiveStreams: 0,
          totalConcurrentViewers: 0,
          totalLikes: 0,
          totalShares: 0,
          totalChatMessages: 0,
          totalModerators: 0
        };

        _currentLiveStreams = json.data && json.data.data || [];

        if (_currentLiveTab === "cctv") {
          renderCctvMonitoringCenter(container, summary, _currentLiveStreams, adminLoc, adminRadius);
        } else {
          renderMonitoringCenter(container, summary, _currentLiveStreams);
        }

        // Resume timer if previously enabled by user
        if (_liveAutoRefreshEnabled) {
          _startLiveTimer();
        }

      } catch (err) {
        _stopAllCctvFeeds();
        console.error("Live monitoring load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Live Monitoring</h3><p>' + escapeHtml(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Retry</button></div>';
      }
    }

    function renderCctvMonitoringCenter(parent, summary, streams, adminLoc, adminRadius) {
      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📹 Admin Live Center — CCTV Monitor</h2>';
      html += '    <span class="module-count">' + streams.length + ' feeds online</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:6px 10px;border-radius:6px;">';
      html += '      <input type="checkbox" id="cctvAutoRefreshCheck" ' + (_liveAutoRefreshEnabled ? 'checked' : '') + ' onchange="window._toggleLiveAutoRefresh(this.checked)" /> Auto-Refresh (20s)';
      html += '    </label>';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Refresh Feeds</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="window._stopAllCctvFeeds()">⏹️ Stop All Feeds</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("cctv");

      // Hero GPS & Surveillance Radius Bar
      const radiusOptions = [5, 10, 25, 50, 100, 9999];
      html += '<div class="cctv-hero-bar">';
      html += '  <div class="cctv-hero-top">';
      html += '    <div class="cctv-location-display">';
      html += '      <span class="cctv-location-icon">📍</span>';
      html += '      <div class="cctv-location-details">';
      html += '        <div class="cctv-location-name">' + escapeHtml(adminLoc.name || "Amravati (Default)") + '</div>';
      html += '        <div class="cctv-coords-badge">LAT: ' + Number(adminLoc.lat).toFixed(4) + ' • LNG: ' + Number(adminLoc.lng).toFixed(4) + '</div>';
      html += '      </div>';
      html += '    </div>';
      html += '    <div class="cctv-hero-actions">';
      html += '      <button class="module-btn cctv-btn-gps" onclick="window._useAdminCurrentGps()">🎯 Use My GPS</button>';
      html += '      <button class="module-btn cctv-btn-change-loc" onclick="window._openAdminLocationModal()">✏️ Change Location</button>';
      html += '    </div>';
      html += '  </div>';

      html += '  <div class="cctv-radius-row">';
      html += '    <span class="cctv-radius-label">SURVEILLANCE RADIUS:</span>';
      html += '    <div class="cctv-radius-chips">';
      radiusOptions.forEach(function (r) {
        const isSelected = (adminRadius === r) || (r === 9999 && adminRadius >= 9000);
        const label = r === 9999 ? "🌐 All (Global)" : (r + " km");
        html += '      <button class="cctv-radius-chip' + (isSelected ? ' active' : '') + '" onclick="window._setAdminRadius(' + r + ')">' + label + '</button>';
      });
      html += '    </div>';
      html += '    <div class="cctv-hero-count">' + streams.length + ' camera feed' + (streams.length === 1 ? '' : 's') + ' in range</div>';
      html += '  </div>';
      html += '</div>';

      // CCTV Video Grid / Empty State
      if (!streams || streams.length === 0) {
        html += '<div class="cctv-empty-container">';
        html += '  <div class="cctv-empty-icon">📡</div>';
        html += '  <div class="cctv-empty-title">NO ACTIVE CAMERAS IN RANGE</div>';
        html += '  <p class="cctv-empty-desc">No live broadcasts detected within ' + (adminRadius >= 9000 ? 'global range' : (adminRadius + ' km of ' + escapeHtml(adminLoc.name || 'monitoring center'))) + '.</p>';
        html += '  <div class="cctv-empty-actions">';
        html += '    <button class="module-btn module-btn-primary" onclick="window._setAdminRadius(9999)">🌐 Expand to Global</button>';
        html += '    <button class="module-btn module-btn-secondary" onclick="window._refreshLiveMonitoring()">🔄 Refresh Feeds</button>';
        html += '  </div>';
        html += '</div>';
      } else {
        html += '<div class="cctv-grid">';
        streams.forEach(function (s, idx) {
          const camIndex = idx + 1;
          const camTag = "CAM " + (camIndex < 10 ? "0" + camIndex : camIndex);
          const videoId = s.YouTubeLiveVideoId || s.StreamID;
          const isAudible = (_activeAudibleSessionId === s.LiveID);

          // YouTube embed URL with autoplay=1&mute=1&enablejsapi=1
          const embedUrl = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&mute=1&enablejsapi=1&playsinline=1&modestbranding=1&rel=0';

          html += '  <div class="cctv-card' + (isAudible ? ' cctv-audio-active' : '') + '" id="cctv-card-' + escapeHtml(s.LiveID) + '">';

          // Card header
          html += '    <div class="cctv-card-header">';
          html += '      <div class="cctv-card-header-left">';
          html += '        <span class="cctv-cam-tag">' + camTag + '</span>';
          html += '        <span class="cctv-live-pulse-badge">● LIVE</span>';
          html += '      </div>';
          html += '      <div class="cctv-card-header-right">';
          html += '        <span class="cctv-viewers-count">👥 ' + Number(s.ViewerCount || s.ConcurrentViewers || 0).toLocaleString() + '</span>';
          html += '      </div>';
          html += '    </div>';

          // Video wrap with iframe
          html += '    <div class="cctv-video-wrap">';
          html += '      <iframe class="cctv-iframe" id="cctv-iframe-' + escapeHtml(s.LiveID) + '" src="' + embedUrl + '" title="' + escapeHtml(s.Title) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
          html += '    </div>';

          // Info area
          html += '    <div class="cctv-card-info">';
          html += '      <div class="cctv-card-title" title="' + escapeHtml(s.Title) + '">' + escapeHtml(s.Title) + '</div>';
          html += '      <div class="cctv-card-meta">';
          html += '        <span>📹 ' + escapeHtml(s.Streamer || s.CameraPersonName || 'Broadcaster') + '</span>';
          if (s.ChannelTitle) {
            html += '        <span> • 📺 ' + escapeHtml(s.ChannelTitle) + '</span>';
          }
          html += '      </div>';
          html += '      <div class="cctv-card-meta">';
          html += '        <span>📍 ' + escapeHtml(s.City || s.LocationName || 'Location') + '</span>';
          if (s.DistanceKm !== undefined && s.DistanceKm !== null) {
            html += '        <span style="font-weight:700;color:var(--text-main);"> • 📏 ' + s.DistanceKm + ' km</span>';
          }
          html += '      </div>';
          html += '      <div class="cctv-card-meta" style="font-size:11px;color:#94a3b8;">';
          html += '        <span>⏱️ ' + (s.StartTime ? escapeHtml(s.StartTime.replace("T", " ").substring(11, 16)) : 'Active') + '</span>';
          html += '        <span> • ID: <code>' + escapeHtml(s.LiveID) + '</code></span>';
          html += '      </div>';
          html += '    </div>';

          // Action buttons: Audio toggle, Moderate modal
          html += '    <div class="cctv-card-actions">';
          html += '      <button class="cctv-audio-btn' + (isAudible ? ' active' : '') + '" id="cctv-audio-btn-' + escapeHtml(s.LiveID) + '" onclick="window._toggleCctvAudio(\'' + escapeHtml(s.LiveID) + '\')">';
          html +=          (isAudible ? '🔊 Listening' : '🔇 Audio Off');
          html += '      </button>';
          html += '      <button class="module-btn module-btn-sm module-btn-primary" onclick="window._openLiveDetailModal(\'' + escapeHtml(s.LiveID) + '\')" title="Inspect Chat & Moderate">🛡️ Mod</button>';
          html += '    </div>';

          html += '  </div>';
        });
        html += '</div>';
      }

      parent.innerHTML = html;
    }

    function renderMonitoringCenter(parent, summary, streams) {
      let filtered = streams.filter(function (s) {
        // Search query
        if (_liveSearchQuery) {
          const q = _liveSearchQuery.toLowerCase();
          const matchTitle = (s.Title || "").toLowerCase().includes(q);
          const matchStreamer = (s.Streamer || "").toLowerCase().includes(q);
          const matchCategory = (s.Category || "").toLowerCase().includes(q);
          const matchCity = (s.City || "").toLowerCase().includes(q);
          const matchId = (s.LiveID || "").toLowerCase().includes(q);
          if (!matchTitle && !matchStreamer && !matchCategory && !matchCity && !matchId) return false;
        }
        // Status filter
        if (_liveStatusFilter === "live_now") {
          return s.IsLive === "Yes" && s.Status.toLowerCase() !== "deleted";
        } else if (_liveStatusFilter === "featured") {
          return s.IsFeatured === "Yes";
        } else if (_liveStatusFilter === "inactive") {
          return s.IsLive !== "Yes" && s.Status.toLowerCase() !== "deleted" && s.Status.toLowerCase() !== "suspended";
        } else if (_liveStatusFilter === "suspended") {
          return s.Status.toLowerCase() === "suspended" || s.Status.toLowerCase() === "deleted";
        }
        return true;
      });

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">🔴 Live Monitoring & Moderation Center</h2>';
      html += '    <span class="module-count">' + summary.activeLiveStreams + ' streams active right now</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:6px 10px;border-radius:6px;">';
      html += '      <input type="checkbox" id="liveAutoRefreshCheck" ' + (_liveAutoRefreshEnabled ? 'checked' : '') + ' onchange="window._toggleLiveAutoRefresh(this.checked)" /> Auto-Refresh (20s)';
      html += '    </label>';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="window._openCreateLiveModal()">➕ New Stream</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("streams");

      // KPI Summary Grid
      html += '<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Active Streams</span><div class="stat-card-icon red">🔴</div></div>';
      html += '    <div class="stat-card-value">' + summary.activeLiveStreams + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Live Viewers</span><div class="stat-card-icon blue">👥</div></div>';
      html += '    <div class="stat-card-value">' + Number(summary.totalConcurrentViewers).toLocaleString() + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Chat Messages</span><div class="stat-card-icon purple">💬</div></div>';
      html += '    <div class="stat-card-value">' + Number(summary.totalChatMessages).toLocaleString() + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Engagement (Likes)</span><div class="stat-card-icon orange">❤️</div></div>';
      html += '    <div class="stat-card-value">' + Number(summary.totalLikes).toLocaleString() + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Live Moderators</span><div class="stat-card-icon green">🛡️</div></div>';
      html += '    <div class="stat-card-value">' + summary.totalModerators + '</div>';
      html += '  </div>';
      html += '</div>';

      // Filter Toolbar
      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="liveSearchInput" class="module-input" placeholder="Search by title, host, category, city, ID..." value="' + escapeHtml(_liveSearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchLive(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._searchLive()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="liveStatusFilterSelect" onchange="window._filterLiveStatus(this.value)">';
      html += '    <option value=""' + (_liveStatusFilter === "" ? " selected" : "") + '>All Streams (' + streams.length + ')</option>';
      html += '    <option value="live_now"' + (_liveStatusFilter === "live_now" ? " selected" : "") + '>🔴 Live Now (' + summary.activeLiveStreams + ')</option>';
      html += '    <option value="featured"' + (_liveStatusFilter === "featured" ? " selected" : "") + '>⭐ Featured</option>';
      html += '    <option value="inactive"' + (_liveStatusFilter === "inactive" ? " selected" : "") + '>Ended / Inactive</option>';
      html += '    <option value="suspended"' + (_liveStatusFilter === "suspended" ? " selected" : "") + '>Suspended / Deleted</option>';
      html += '  </select>';
      html += '</div>';

      // Streams Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Live ID</th>';
      html += '      <th>Stream Title & Category</th>';
      html += '      <th>Host / Streamer</th>';
      html += '      <th>Location</th>';
      html += '      <th>Viewers</th>';
      html += '      <th>Chat / Likes</th>';
      html += '      <th>Attributes</th>';
      html += '      <th>Live State</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (filtered.length === 0) {
        html += '      <tr><td colspan="9" class="module-empty">No live streams found matching current filters</td></tr>';
      } else {
        filtered.forEach(function (s) {
          const isLiveNow = s.IsLive === "Yes" && s.Status.toLowerCase() !== "deleted";
          const isSuspended = s.Status.toLowerCase() === "suspended" || s.Status.toLowerCase() === "deleted";
          
          let stateBadge = '';
          if (isSuspended) {
            stateBadge = '<span class="status-badge suspended" style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">🚫 ' + escapeHtml(s.Status) + '</span>';
          } else if (isLiveNow) {
            stateBadge = '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">🔴 LIVE NOW</span>';
          } else {
            stateBadge = '<span class="status-badge inactive" style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">Offline</span>';
          }

          let attrBadges = '';
          if (s.IsFeatured === "Yes") {
            attrBadges += '<span style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-right:4px;">⭐ Featured</span>';
          }
          if (s.AllowPIP === "Yes") {
            attrBadges += '<span style="background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">📺 PIP</span>';
          }

          html += '      <tr>';
          html += '        <td><strong style="color:var(--primary);">' + escapeHtml(s.LiveID) + '</strong></td>';
          html += '        <td>';
          html += '          <div style="font-weight:600;color:var(--text-main);">' + escapeHtml(s.Title) + '</div>';
          html += '          <div style="font-size:11px;color:var(--text-muted);">' + escapeHtml(s.Category) + '</div>';
          html += '        </td>';
          html += '        <td>' + escapeHtml(s.Streamer) + '</td>';
          html += '        <td>' + (s.City ? escapeHtml(s.City) : '<span style="color:#94a3b8;">—</span>') + '</td>';
          html += '        <td><span style="font-weight:600;color:#2563eb;">👥 ' + Number(s.ViewerCount || 0) + '</span></td>';
          html += '        <td>';
          html += '          <span style="font-size:12px;margin-right:6px;">💬 ' + (s.ChatCount || 0) + '</span>';
          html += '          <span style="font-size:12px;color:#e11d48;">❤️ ' + (s.LikeCount || 0) + '</span>';
          html += '        </td>';
          html += '        <td>' + (attrBadges || '<span style="color:#94a3b8;font-size:11px;">Standard</span>') + '</td>';
          html += '        <td>' + stateBadge + '</td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-primary" onclick="window._openLiveDetailModal(\'' + escapeHtml(s.LiveID) + '\')" title="Inspect and Moderate Live Stream">🛡️ Moderate</button>';
          if (isLiveNow) {
            html += '          <button class="module-btn module-btn-sm module-btn-danger" style="margin-left:4px;" onclick="window._toggleStreamLiveState(\'' + escapeHtml(s.LiveID) + '\', \'No\')" title="Force Stop Stream">⏹️ Stop</button>';
          } else {
            html += '          <button class="module-btn module-btn-sm module-btn-success" style="margin-left:4px;" onclick="window._toggleStreamLiveState(\'' + escapeHtml(s.LiveID) + '\', \'Yes\')" title="Set Stream Live">▶️ Start</button>';
          }
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // Global Handlers
    window._refreshLiveMonitoring = function () {
      loadAndRender();
    };

    window._searchLive = function () {
      const input = document.getElementById("liveSearchInput");
      _liveSearchQuery = input ? input.value.trim() : "";
      loadAndRender();
    };

    window._filterLiveStatus = function (val) {
      _liveStatusFilter = val || "";
      loadAndRender();
    };

    window._toggleLiveAutoRefresh = function (enabled) {
      _liveAutoRefreshEnabled = !!enabled;
      _stopLiveTimer();
      if (_liveAutoRefreshEnabled) {
        _startLiveTimer();
      }
    };

    window._toggleStreamLiveState = async function (liveId, newIsLive) {
      const actionText = newIsLive === "Yes" ? "Set stream to LIVE?" : "Force STOP this live stream?";
      if (!confirm(actionText)) return;

      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminupdatelivestatus&liveId=" + encodeURIComponent(liveId) +
          "&isLive=" + encodeURIComponent(newIsLive) +
          "&status=" + encodeURIComponent(newIsLive === "Yes" ? "Active" : "Completed") +
          "&session=" + encodeURIComponent(session);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast(newIsLive === "Yes" ? "Stream is now LIVE" : "Stream has been STOPPED", "success");
          loadAndRender();
        } else {
          showToast(json && json.message || "Failed to update stream state", "error");
        }
      } catch (e) {
        showToast("Error updating stream: " + e.message, "error");
      }
    };

    window._openCreateLiveModal = function () {
      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:550px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>➕ Create New Live Channel</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Stream Title *</label>';
      mhtml += '        <input type="text" id="newLiveTitle" class="module-input" placeholder="e.g. City Market Live Tour" style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Category</label>';
      mhtml += '          <input type="text" id="newLiveCategory" class="module-input" placeholder="e.g. Shopping, Events, News" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">City / Location</label>';
      mhtml += '          <input type="text" id="newLiveCity" class="module-input" placeholder="e.g. Indore" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Streamer Name / Announcer</label>';
      mhtml += '        <input type="text" id="newLiveStreamer" class="module-input" placeholder="e.g. Verified Reporter" style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Stream URL / Video Source (Optional)</label>';
      mhtml += '        <input type="text" id="newLiveUrl" class="module-input" placeholder="https://..." style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="display:flex;gap:16px;margin-top:14px;">';
      mhtml += '        <label style="font-size:13px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="newLiveFeatured" /> Featured Stream</label>';
      mhtml += '        <label style="font-size:13px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="newLivePip" checked /> Picture-in-Picture (PIP)</label>';
      mhtml += '        <label style="font-size:13px;display:flex;align-items:center;gap:6px;"><input type="checkbox" id="newLiveIsLive" checked /> Go Live Immediately</label>';
      mhtml += '      </div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer">';
      mhtml += '      <button class="module-btn module-btn-primary" onclick="window._submitCreateLive()">Create Channel</button>';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      closeModal();
      document.body.insertAdjacentHTML("beforeend", mhtml);
    };

    window._submitCreateLive = async function () {
      const title = document.getElementById("newLiveTitle") ? document.getElementById("newLiveTitle").value.trim() : "";
      if (!title) {
        alert("Please enter a stream title.");
        return;
      }
      const category = document.getElementById("newLiveCategory") ? document.getElementById("newLiveCategory").value.trim() : "General";
      const city = document.getElementById("newLiveCity") ? document.getElementById("newLiveCity").value.trim() : "";
      const streamer = document.getElementById("newLiveStreamer") ? document.getElementById("newLiveStreamer").value.trim() : "Host";
      const streamUrl = document.getElementById("newLiveUrl") ? document.getElementById("newLiveUrl").value.trim() : "";
      const isFeatured = document.getElementById("newLiveFeatured") && document.getElementById("newLiveFeatured").checked ? "Yes" : "No";
      const allowPip = document.getElementById("newLivePip") && document.getElementById("newLivePip").checked ? "Yes" : "No";
      const isLive = document.getElementById("newLiveIsLive") && document.getElementById("newLiveIsLive").checked ? "Yes" : "No";

      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminaddlive&session=" + encodeURIComponent(session) +
          "&title=" + encodeURIComponent(title) +
          "&category=" + encodeURIComponent(category) +
          "&city=" + encodeURIComponent(city) +
          "&streamer=" + encodeURIComponent(streamer) +
          "&streamUrl=" + encodeURIComponent(streamUrl) +
          "&isFeatured=" + encodeURIComponent(isFeatured) +
          "&allowPip=" + encodeURIComponent(allowPip) +
          "&isLive=" + encodeURIComponent(isLive);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Live stream channel created successfully!", "success");
          closeModal();
          loadAndRender();
        } else {
          showToast(json && json.message || "Failed to create channel", "error");
        }
      } catch (e) {
        showToast("Error creating channel: " + e.message, "error");
      }
    };

    // Live Stream Inspection & Moderation Modal
    window._openLiveDetailModal = async function (liveId) {
      _activeLiveIdInModal = liveId;
      _activeChatTab = "chat";
      const stream = _currentLiveStreams.find(s => s.LiveID === liveId);
      if (!stream) return;

      const session = AdminAuth.getSession();
      if (!session) return;

      let mhtml = '<div class="modal-overlay" onclick="window._closeLiveDetailModal(event)">';
      mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()" style="max-width:850px;max-height:90vh;display:flex;flex-direction:column;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>🛡️ Live Stream Control & Moderation: <span style="color:var(--primary);">' + escapeHtml(stream.LiveID) + '</span></h3>';
      mhtml += '      <button class="modal-close" onclick="window._closeLiveDetailModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;overflow-y:auto;flex:1;">';

      // Stream Metadata Overview
      mhtml += '      <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px;border:1px solid #e2e8f0;">';
      mhtml += '        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">';
      mhtml += '          <div>';
      mhtml += '            <h4 style="margin:0 0 4px 0;font-size:16px;">' + escapeHtml(stream.Title) + '</h4>';
      mhtml += '            <span style="font-size:12px;color:var(--text-muted);">' + escapeHtml(stream.Category) + ' • Host: <strong>' + escapeHtml(stream.Streamer) + '</strong> • ' + (stream.City || 'Global') + '</span>';
      mhtml += '          </div>';
      mhtml += '          <div>';
      mhtml += '            <span style="font-size:13px;font-weight:700;padding:4px 10px;border-radius:12px;background:' + (stream.IsLive === "Yes" ? "#dcfce7;color:#15803d;" : "#f1f5f9;color:#64748b;") + '">' + (stream.IsLive === "Yes" ? "🔴 LIVE" : "Offline") + '</span>';
      mhtml += '          </div>';
      mhtml += '        </div>';

      // Control Action Badges
      mhtml += '        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">';
      mhtml += '          <button class="module-btn module-btn-sm ' + (stream.IsFeatured === "Yes" ? "module-btn-secondary" : "module-btn-primary") + '" onclick="window._modToggleFeatured(\'' + stream.LiveID + '\', \'' + (stream.IsFeatured === "Yes" ? "No" : "Yes") + '\')">' + (stream.IsFeatured === "Yes" ? "⭐ Remove Featured" : "⭐ Set Featured") + '</button>';
      mhtml += '          <button class="module-btn module-btn-sm ' + (stream.AllowPIP === "Yes" ? "module-btn-secondary" : "module-btn-primary") + '" onclick="window._modTogglePIP(\'' + stream.LiveID + '\', \'' + (stream.AllowPIP === "Yes" ? "No" : "Yes") + '\')">' + (stream.AllowPIP === "Yes" ? "📺 Disable PIP" : "📺 Enable PIP") + '</button>';
      if (stream.IsLive === "Yes") {
        mhtml += '          <button class="module-btn module-btn-sm module-btn-danger" onclick="window._modSuspendStream(\'' + stream.LiveID + '\')">🚫 Suspend / Force Stop</button>';
      } else {
        mhtml += '          <button class="module-btn module-btn-sm module-btn-success" onclick="window._modReactivateStream(\'' + stream.LiveID + '\')">▶️ Start Live</button>';
      }
      mhtml += '        </div>';
      mhtml += '      </div>';

      // Tab bar for Chat vs Moderators
      mhtml += '      <div style="display:flex;border-bottom:2px solid #e2e8f0;margin-bottom:12px;">';
      mhtml += '        <button id="liveTabBtnChat" class="module-btn" style="background:none;border:none;border-bottom:3px solid var(--primary);border-radius:0;font-weight:600;padding:8px 16px;color:var(--primary);" onclick="window._switchLiveModalTab(\'chat\')">💬 Live Chat Moderation</button>';
      mhtml += '        <button id="liveTabBtnMods" class="module-btn" style="background:none;border:none;border-bottom:3px solid transparent;border-radius:0;font-weight:600;padding:8px 16px;color:#64748b;" onclick="window._switchLiveModalTab(\'moderators\')">🛡️ Stream Moderators</button>';
      mhtml += '      </div>';

      // Tab Content Containers
      mhtml += '      <div id="liveModalChatContent">';
      mhtml += '        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      mhtml += '          <span style="font-size:12px;font-weight:600;color:var(--text-muted);">Chat Feed (Auto-refreshes every 20s)</span>';
      mhtml += '          <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._refreshModalChat()">🔄 Refresh Chat</button>';
      mhtml += '        </div>';
      mhtml += '        <div id="liveChatMessagesList" style="max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:8px;background:#fff;">';
      mhtml += '          <div style="text-align:center;padding:16px;color:#94a3b8;">Loading chat messages...</div>';
      mhtml += '        </div>';
      mhtml += '      </div>';

      mhtml += '      <div id="liveModalModsContent" style="display:none;">';
      mhtml += '        <div style="display:flex;gap:8px;margin-bottom:12px;">';
      mhtml += '          <input type="text" id="newModUserId" class="module-input" placeholder="Enter User ID (e.g. U001) to assign as moderator" style="flex:1;" />';
      mhtml += '          <button class="module-btn module-btn-primary" onclick="window._addModeratorToStream(\'' + stream.LiveID + '\')">➕ Add Moderator</button>';
      mhtml += '        </div>';
      mhtml += '        <div id="liveModeratorsList" style="max-height:240px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:8px;background:#fff;">';
      mhtml += '          <div style="text-align:center;padding:16px;color:#94a3b8;">Loading moderators...</div>';
      mhtml += '        </div>';
      mhtml += '      </div>';

      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer">';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="window._closeLiveDetailModal()">Close</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      closeModal();
      document.body.insertAdjacentHTML("beforeend", mhtml);

      // Fetch Chat & Mods
      window._refreshModalChat();
      window._refreshModalMods();
    };

    window._closeLiveDetailModal = function () {
      _activeLiveIdInModal = null;
      closeModal();
    };

    window._switchLiveModalTab = function (tab) {
      _activeChatTab = tab;
      const chatSection = document.getElementById("liveModalChatContent");
      const modsSection = document.getElementById("liveModalModsContent");
      const btnChat = document.getElementById("liveTabBtnChat");
      const btnMods = document.getElementById("liveTabBtnMods");

      if (tab === "chat") {
        if (chatSection) chatSection.style.display = "block";
        if (modsSection) modsSection.style.display = "none";
        if (btnChat) { btnChat.style.borderBottomColor = "var(--primary)"; btnChat.style.color = "var(--primary)"; }
        if (btnMods) { btnMods.style.borderBottomColor = "transparent"; btnMods.style.color = "#64748b"; }
      } else {
        if (chatSection) chatSection.style.display = "none";
        if (modsSection) modsSection.style.display = "block";
        if (btnMods) { btnMods.style.borderBottomColor = "var(--primary)"; btnMods.style.color = "var(--primary)"; }
        if (btnChat) { btnChat.style.borderBottomColor = "transparent"; btnChat.style.color = "#64748b"; }
      }
    };

    window._refreshModalChat = async function () {
      if (!_activeLiveIdInModal) return;
      const container = document.getElementById("liveChatMessagesList");
      if (!container) return;

      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminlivechat&liveId=" + encodeURIComponent(_activeLiveIdInModal) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        const messages = json && json.data || [];

        if (messages.length === 0) {
          container.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8;">No chat messages in this stream yet.</div>';
          return;
        }

        let html = '';
        messages.forEach(function (m) {
          const isDeleted = m.isDeleted === true;
          const isPinned = m.isPinned === true;

          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9;' + (isDeleted ? 'background:#fef2f2;opacity:0.6;' : (isPinned ? 'background:#fffbeb;' : '')) + '">';
          html += '  <div style="flex:1;margin-right:8px;">';
          html += '    <div style="font-size:11px;color:#64748b;">';
          html += '      <strong style="color:var(--text-main);">' + escapeHtml(m.userId) + '</strong>';
          if (isPinned) html += ' <span style="background:#fef3c7;color:#b45309;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">📌 PINNED</span>';
          if (isDeleted) html += ' <span style="background:#fee2e2;color:#b91c1c;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">PURGED</span>';
          html += '    </div>';
          html += '    <div style="font-size:13px;color:' + (isDeleted ? '#991b1b;text-decoration:line-through;' : 'var(--text-main);') + 'margin-top:2px;">' + escapeHtml(m.message) + '</div>';
          html += '  </div>';
          html += '  <div style="display:flex;gap:4px;">';
          if (!isDeleted) {
            html += '    <button class="module-btn module-btn-sm module-btn-danger" style="padding:2px 6px;font-size:11px;" onclick="window._modDeleteChatMessage(\'' + m.messageId + '\')" title="Purge/Delete Message">🗑️ Delete</button>';
            if (isPinned) {
              html += '    <button class="module-btn module-btn-sm module-btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="window._modUnpinChatMessage(\'' + m.messageId + '\')" title="Unpin">Unpin</button>';
            } else {
              html += '    <button class="module-btn module-btn-sm module-btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="window._modPinChatMessage(\'' + m.messageId + '\')" title="Pin">📌 Pin</button>';
            }
          }
          html += '  </div>';
          html += '</div>';
        });

        container.innerHTML = html;

      } catch (e) {
        container.innerHTML = '<div style="color:#ef4444;padding:8px;font-size:12px;">Failed to load chat: ' + escapeHtml(e.message) + '</div>';
      }
    };

    window._modDeleteChatMessage = async function (messageId) {
      if (!confirm("Purge this chat message from live viewers?")) return;
      try {
        const url = getApiUrl() + "?action=deletelivemessage&messageId=" + encodeURIComponent(messageId);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Message purged from chat", "success");
          window._refreshModalChat();
        } else {
          showToast(json && json.message || "Failed to purge message", "error");
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modPinChatMessage = async function (messageId) {
      try {
        const url = getApiUrl() + "?action=pinlivemessage&messageId=" + encodeURIComponent(messageId);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Message pinned to top of live chat", "success");
          window._refreshModalChat();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modUnpinChatMessage = async function (messageId) {
      try {
        const url = getApiUrl() + "?action=unpinlivemessage&messageId=" + encodeURIComponent(messageId);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Message unpinned", "success");
          window._refreshModalChat();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._refreshModalMods = async function () {
      if (!_activeLiveIdInModal) return;
      const container = document.getElementById("liveModeratorsList");
      if (!container) return;

      try {
        const url = getApiUrl() + "?action=getlivemoderators&liveId=" + encodeURIComponent(_activeLiveIdInModal);
        const res = await fetch(url);
        const json = await res.json();
        const mods = json && json.data || [];

        if (mods.length === 0) {
          container.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8;">No moderators assigned to this live channel.</div>';
          return;
        }

        let html = '';
        mods.forEach(function (m) {
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9;">';
          html += '  <div>';
          html += '    <strong style="color:var(--text-main);font-size:13px;">🛡️ ' + escapeHtml(m.userId) + '</strong>';
          html += '    <div style="font-size:10px;color:#94a3b8;">ID: ' + escapeHtml(m.moderatorId) + '</div>';
          html += '  </div>';
          html += '  <button class="module-btn module-btn-sm module-btn-danger" style="padding:2px 8px;font-size:11px;" onclick="window._removeModeratorFromStream(\'' + m.moderatorId + '\')">Remove</button>';
          html += '</div>';
        });

        container.innerHTML = html;

      } catch (e) {
        container.innerHTML = '<div style="color:#ef4444;padding:8px;font-size:12px;">Failed to load moderators: ' + escapeHtml(e.message) + '</div>';
      }
    };

    window._addModeratorToStream = async function (liveId) {
      const input = document.getElementById("newModUserId");
      const userId = input ? input.value.trim() : "";
      if (!userId) {
        alert("Please enter a User ID to add as moderator.");
        return;
      }

      try {
        const url = getApiUrl() + "?action=addlivemoderator&liveId=" + encodeURIComponent(liveId) + "&userId=" + encodeURIComponent(userId);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Moderator assigned to stream", "success");
          if (input) input.value = "";
          window._refreshModalMods();
        } else {
          showToast(json && json.message || "Failed to add moderator", "error");
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._removeModeratorFromStream = async function (moderatorId) {
      if (!confirm("Revoke moderator status for this user?")) return;

      try {
        const url = getApiUrl() + "?action=removelivemoderator&moderatorId=" + encodeURIComponent(moderatorId);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Moderator revoked", "success");
          window._refreshModalMods();
        } else {
          showToast(json && json.message || "Failed to revoke moderator", "error");
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modToggleFeatured = async function (liveId, newFeatured) {
      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminupdatelivestatus&liveId=" + encodeURIComponent(liveId) +
          "&isFeatured=" + encodeURIComponent(newFeatured) +
          "&session=" + encodeURIComponent(session);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Featured status updated to " + newFeatured, "success");
          loadAndRender();
          closeModal();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modTogglePIP = async function (liveId, newPip) {
      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminupdatelivestatus&liveId=" + encodeURIComponent(liveId) +
          "&allowPip=" + encodeURIComponent(newPip) +
          "&session=" + encodeURIComponent(session);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("PIP status updated to " + newPip, "success");
          loadAndRender();
          closeModal();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modSuspendStream = async function (liveId) {
      if (!confirm("Suspend / Force Stop this live stream? This will immediately terminate it for all viewers.")) return;

      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminupdatelivestatus&liveId=" + encodeURIComponent(liveId) +
          "&isLive=No&status=Suspended&session=" + encodeURIComponent(session);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Stream suspended and stopped", "success");
          loadAndRender();
          closeModal();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    window._modReactivateStream = async function (liveId) {
      if (!confirm("Reactivate and set this stream to LIVE?")) return;

      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminupdatelivestatus&liveId=" + encodeURIComponent(liveId) +
          "&isLive=Yes&status=Active&session=" + encodeURIComponent(session);

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Stream reactivated to LIVE", "success");
          loadAndRender();
          closeModal();
        }
      } catch (e) {
        showToast("Error: " + e.message, "error");
      }
    };

    // ============================================================
    // STAGE 3D: YOUTUBE CHANNELS TAB CONTROLLERS & RENDERING
    // ============================================================

    async function loadAndRenderChannels() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading YouTube Channels...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminyoutubechannels&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access YouTube Channels.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Channels</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshChannelsTab()">🔄 Retry</button></div>';
          return;
        }

        _currentChannels = (json.data && json.data.channels) || [];
        const summary = (json.data && json.data.summary) || {
          totalChannels: _currentChannels.length,
          activeHealthy: 0,
          needsAttention: 0,
          disconnected: 0
        };

        renderChannelsCenter(container, summary, _currentChannels);
      } catch (err) {
        console.error("YouTube channels load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Channels</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshChannelsTab()">🔄 Retry</button></div>';
      }
    }

    function renderChannelsCenter(parent, summary, channels) {
      let filtered = channels.filter(function (c) {
        if (_channelSearchQuery) {
          const q = _channelSearchQuery.toLowerCase();
          const matchTitle = (c.channelTitle || "").toLowerCase().includes(q);
          const matchHandle = (c.channelCustomUrl || "").toLowerCase().includes(q);
          const matchId = (c.channelId || "").toLowerCase().includes(q);
          if (!matchTitle && !matchHandle && !matchId) return false;
        }
        return true;
      });

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📺 YouTube Channel Management</h2>';
      html += '    <span class="module-count">' + summary.activeHealthy + ' active / ' + summary.totalChannels + ' total connected corporate channels</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshChannelsTab()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-success" style="background:#16a34a;color:#fff;" onclick="window._openYouTubeConnectPopup()">➕ Connect YouTube Channel</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("channels");

      // KPI Summary Grid
      html += '<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Total Channels</span><div class="stat-card-icon blue">📺</div></div>';
      html += '    <div class="stat-card-value">' + summary.totalChannels + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Active & Healthy</span><div class="stat-card-icon green">🟢</div></div>';
      html += '    <div class="stat-card-value" style="color:#15803d;">' + summary.activeHealthy + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Needs Attention</span><div class="stat-card-icon orange">⚠️</div></div>';
      html += '    <div class="stat-card-value" style="color:#d97706;">' + summary.needsAttention + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Disconnected</span><div class="stat-card-icon red">🔌</div></div>';
      html += '    <div class="stat-card-value" style="color:#b91c1c;">' + summary.disconnected + '</div>';
      html += '  </div>';
      html += '</div>';

      // Filter Toolbar
      html += '<div class="module-filters" style="margin-bottom:16px;">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="channelSearchInput" class="module-input" placeholder="Search by title, handle, channel ID..." value="' + _esc(_channelSearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchChannels(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._searchChannels()">🔍 Search</button>';
      html += '  </div>';
      html += '</div>';

      // Channels Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Channel</th>';
      html += '      <th>Channel ID</th>';
      html += '      <th>OAuth Health</th>';
      html += '      <th>Status</th>';
      html += '      <th>Last Validated</th>';
      html += '      <th>Connected By / Date</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (filtered.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty" style="text-align:center;padding:32px;">No YouTube channels connected yet. Click <strong>➕ Connect YouTube Channel</strong> to connect a channel via Google OAuth.</td></tr>';
      } else {
        filtered.forEach(function (c) {
          const isHealthy = String(c.oAuthStatus || "").toLowerCase() === "active" && String(c.status || "").toLowerCase() === "active";
          const isRevoked = String(c.oAuthStatus || "").toLowerCase() === "revoked" || String(c.status || "").toLowerCase() === "disconnected";
          const isError = String(c.oAuthStatus || "").toLowerCase() === "error";

          let healthBadge = "";
          if (isRevoked) {
            healthBadge = '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">🚫 Revoked</span>';
          } else if (isError) {
            healthBadge = '<span class="status-badge" style="background:#fef3c7;color:#b45309;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">⚠️ Auth Error</span>';
          } else if (isHealthy) {
            healthBadge = '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">🟢 Healthy</span>';
          } else {
            healthBadge = '<span class="status-badge" style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">⚪ Expired</span>';
          }

          const avatarImg = c.channelThumbnail ? '<img src="' + _esc(c.channelThumbnail) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;border:1px solid #e2e8f0;" />' : '<div style="width:36px;height:36px;border-radius:50%;background:#fee2e2;color:#ef4444;display:inline-flex;align-items:center;justify-content:center;font-weight:700;margin-right:10px;">▶</div>';

          html += '      <tr>';
          html += '        <td>';
          html += '          <div style="display:flex;align-items:center;">';
          html += '            ' + avatarImg;
          html += '            <div>';
          html += '              <div style="font-weight:700;color:var(--text-main);">' + _esc(c.channelTitle) + '</div>';
          html += '              <div style="font-size:11px;color:var(--text-muted);">' + (c.channelCustomUrl ? _esc(c.channelCustomUrl) : '—') + '</div>';
          html += '            </div>';
          html += '          </div>';
          html += '        </td>';
          html += '        <td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(c.channelId) + '</code></td>';
          html += '        <td>' + healthBadge;
          if (c.disconnectReason) {
            html += '<div style="font-size:10px;color:#b91c1c;margin-top:2px;max-width:180px;" title="' + _esc(c.disconnectReason) + '">' + _esc(c.disconnectReason.substring(0, 35)) + (c.disconnectReason.length > 35 ? '...' : '') + '</div>';
          }
          html += '        </td>';
          html += '        <td><span style="font-weight:600;font-size:12px;">' + _esc(c.status || "Active") + '</span></td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + (c.lastValidatedAt ? _esc(c.lastValidatedAt.replace("T", " ").substring(0, 19)) : 'Never') + '</td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + _esc(c.connectedByAdminId || 'Admin') + '<br/>' + (c.connectedAt ? _esc(c.connectedAt.replace("T", " ").substring(0, 10)) : '—') + '</td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-primary" onclick="window._validateChannelHealth(\'' + _esc(c.channelId) + '\')" title="Validate API and Token Health">🔄 Validate</button>';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" style="margin-left:4px;" onclick="window._openYouTubeConnectPopup()" title="Reconnect OAuth for this channel">🔗 Reconnect</button>';
          if (c.status !== "Disconnected") {
            html += '          <button class="module-btn module-btn-sm module-btn-danger" style="margin-left:4px;" onclick="window._disconnectChannel(\'' + _esc(c.channelId) + '\', \'' + _esc(c.channelTitle).replace(/'/g, "\\'") + '\')" title="Revoke Authorization and Disconnect Channel">🔌 Disconnect</button>';
          }
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // STAGE 3E: BROADCASTER ALLOCATIONS TAB CONTROLLERS & RENDERING
    // ============================================================

    async function loadAndRenderAllocations() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Broadcaster Allocations...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminlistallocations&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access Broadcaster Allocations.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Allocations</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshAllocationsTab()">🔄 Retry</button></div>';
          return;
        }

        _currentAllocations = (json.data && json.data.allocations) || [];
        const summary = (json.data && json.data.summary) || {
          totalAllocations: _currentAllocations.length,
          activeAllocations: 0,
          revokedAllocations: 0
        };

        renderAllocationsCenter(container, summary, _currentAllocations);
      } catch (err) {
        console.error("Allocations load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Allocations</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshAllocationsTab()">🔄 Retry</button></div>';
      }
    }

    function renderAllocationsCenter(parent, summary, allocations) {
      let filtered = allocations.filter(function (a) {
        if (_allocationSearchQuery) {
          const q = _allocationSearchQuery.toLowerCase();
          const matchPerson = (a.cameraPersonName || "").toLowerCase().includes(q);
          const matchUser = (a.userId || "").toLowerCase().includes(q);
          const matchChannel = (a.channelTitle || "").toLowerCase().includes(q);
          const matchAllocId = (a.allocationId || "").toLowerCase().includes(q);
          if (!matchPerson && !matchUser && !matchChannel && !matchAllocId) return false;
        }
        return true;
      });

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">👥 Broadcaster ↔ Channel Allocations</h2>';
      html += '    <span class="module-count">' + summary.activeAllocations + ' active / ' + summary.totalAllocations + ' total many-to-many authorizations</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshAllocationsTab()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-success" style="background:#16a34a;color:#fff;" onclick="window._openAssignBroadcasterModal()">➕ Assign Broadcaster</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("allocations");

      // KPI Summary Grid
      html += '<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Total Allocations</span><div class="stat-card-icon purple">📋</div></div>';
      html += '    <div class="stat-card-value">' + summary.totalAllocations + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Active Broadcasters</span><div class="stat-card-icon green">📹</div></div>';
      html += '    <div class="stat-card-value" style="color:#15803d;">' + summary.activeAllocations + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Revoked / Archived</span><div class="stat-card-icon gray">📁</div></div>';
      html += '    <div class="stat-card-value" style="color:#64748b;">' + summary.revokedAllocations + '</div>';
      html += '  </div>';
      html += '</div>';

      // Filter Toolbar
      html += '<div class="module-filters" style="margin-bottom:16px;">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="allocationSearchInput" class="module-input" placeholder="Search by broadcaster, user ID, channel..." value="' + _esc(_allocationSearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchAllocations(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._searchAllocations()">🔍 Search</button>';
      html += '  </div>';
      html += '</div>';

      // Allocations Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Allocation ID</th>';
      html += '      <th>Camera Person</th>';
      html += '      <th>YouTube Channel</th>';
      html += '      <th>Status</th>';
      html += '      <th>Allocated Date</th>';
      html += '      <th>Revoked Date</th>';
      html += '      <th>Notes</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (filtered.length === 0) {
        html += '      <tr><td colspan="8" class="module-empty" style="text-align:center;padding:32px;">No broadcaster allocations found. Click <strong>➕ Assign Broadcaster</strong> to authorize a Camera Person for a connected YouTube channel.</td></tr>';
      } else {
        filtered.forEach(function (a) {
          const isActive = String(a.status || "").toLowerCase() === "active";
          const statusBadge = isActive
            ? '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">✓ Active</span>'
            : '<span class="status-badge" style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Revoked</span>';

          html += '      <tr>';
          html += '        <td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(a.allocationId) + '</code></td>';
          html += '        <td>';
          html += '          <div style="font-weight:700;color:var(--text-main);">' + _esc(a.cameraPersonName) + '</div>';
          html += '          <div style="font-size:11px;color:var(--text-muted);">' + _esc(a.userId) + '</div>';
          html += '        </td>';
          html += '        <td>';
          html += '          <div style="font-weight:600;color:var(--text-main);">' + _esc(a.channelTitle) + '</div>';
          html += '          <div style="font-size:11px;color:var(--text-muted);">' + (a.channelCustomUrl ? _esc(a.channelCustomUrl) + ' • ' : '') + '<code style="font-size:10px;">' + _esc(a.channelId) + '</code></div>';
          html += '        </td>';
          html += '        <td>' + statusBadge + '</td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + (a.allocatedAt ? _esc(a.allocatedAt.replace("T", " ").substring(0, 10)) : '—') + '<br/><small>by ' + _esc(a.allocatedByAdminId || 'Admin') + '</small></td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + (a.revokedAt ? _esc(a.revokedAt.replace("T", " ").substring(0, 10)) : '—') + '</td>';
          html += '        <td style="font-size:12px;color:var(--text-muted);max-width:160px;">' + (a.notes ? _esc(a.notes) : '<span style="color:#94a3b8;">—</span>') + '</td>';
          html += '        <td style="white-space:nowrap;">';
          if (isActive) {
            html += '          <button class="module-btn module-btn-sm module-btn-danger" onclick="window._revokeAllocation(\'' + _esc(a.allocationId) + '\', \'' + _esc(a.cameraPersonName).replace(/'/g, "\\'") + '\', \'' + _esc(a.channelTitle).replace(/'/g, "\\'") + '\')" title="Revoke Authorization">🚫 Revoke</button>';
          } else {
            html += '          <span style="color:#94a3b8;font-size:12px;">Archived</span>';
          }
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // STAGE 7A: LIVE HISTORY TAB CONTROLLERS & RENDERING
    // ============================================================

    async function loadAndRenderHistory() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Session History...</p></div>';

      try {
        let url = getApiUrl() + "?action=adminlivehistory&session=" + encodeURIComponent(session) +
          "&page=" + encodeURIComponent(_historyPage) +
          "&limit=" + encodeURIComponent((_historyPagination && _historyPagination.limit) || 25);

        if (_historyStatusFilter) {
          url += "&status=" + encodeURIComponent(_historyStatusFilter);
        }
        if (_historyDateFilter) {
          url += "&date=" + encodeURIComponent(_historyDateFilter);
        }
        if (_historySearchQuery) {
          url += "&q=" + encodeURIComponent(_historySearchQuery);
        }

        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access Live History.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Live History</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshHistoryTab()">🔄 Retry</button></div>';
          return;
        }

        _currentHistorySessions = (json.data && (json.data.sessions || json.data.history)) || [];
        const summary = (json.data && json.data.summary) || {
          totalHistoricalStreams: _currentHistorySessions.length,
          totalHistoricalSeconds: 0,
          endedNormally: 0,
          endedTerminated: 0
        };
        _historyPagination = (json.data && json.data.pagination) || {
          page: _historyPage,
          limit: 25,
          totalCount: _currentHistorySessions.length,
          totalPages: 1
        };

        renderHistoryCenter(container, summary, _currentHistorySessions, _historyPagination);
      } catch (err) {
        console.error("Live history load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Live History</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshHistoryTab()">🔄 Retry</button></div>';
      }
    }

    function renderHistoryCenter(parent, summary, sessions, pagination) {
      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📜 Live Broadcast History</h2>';
      html += '    <span class="module-count">' + (pagination.totalCount || 0) + ' completed broadcasts recorded</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshHistoryTab()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("history");

      // KPI Summary Grid
      html += '<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 20px;">';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Total Past Broadcasts</span><div class="stat-card-icon blue">📜</div></div>';
      html += '    <div class="stat-card-value">' + (summary.totalHistoricalStreams || 0) + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Total Air Time</span><div class="stat-card-icon purple">⏱️</div></div>';
      html += '    <div class="stat-card-value" style="font-size:18px;">' + formatDuration(summary.totalHistoricalSeconds || summary.totalDurationSeconds || 0) + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Ended Normally</span><div class="stat-card-icon green">✅</div></div>';
      html += '    <div class="stat-card-value" style="color:#15803d;">' + (summary.endedNormally || 0) + '</div>';
      html += '  </div>';
      html += '  <div class="stat-card">';
      html += '    <div class="stat-card-header"><span class="stat-card-label">Terminated / Stopped</span><div class="stat-card-icon orange">⏹️</div></div>';
      html += '    <div class="stat-card-value" style="color:#d97706;">' + (summary.endedTerminated || 0) + '</div>';
      html += '  </div>';
      html += '</div>';

      // Filter Toolbar
      html += '<div class="module-filters" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">';
      html += '  <div style="flex:1;min-width:200px;">';
      html += '    <input type="text" id="historySearchInput" class="module-input" style="width:100%;" placeholder="Search ID, title, broadcaster, city, event..." value="' + _esc(_historySearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchHistory(); }" />';
      html += '  </div>';
      html += '  <div>';
      html += '    <select id="historyStatusSelect" class="module-input" style="padding:7px 10px;" onchange="window._filterHistoryStatus(this.value)">';
      html += '      <option value="" ' + (_historyStatusFilter === "" ? "selected" : "") + '>All Statuses</option>';
      html += '      <option value="Ended" ' + (_historyStatusFilter === "Ended" ? "selected" : "") + '>Ended</option>';
      html += '      <option value="Terminated" ' + (_historyStatusFilter === "Terminated" ? "selected" : "") + '>Terminated</option>';
      html += '      <option value="Expired" ' + (_historyStatusFilter === "Expired" ? "selected" : "") + '>Expired</option>';
      html += '    </select>';
      html += '  </div>';
      html += '  <div>';
      html += '    <input type="date" id="historyDateInput" class="module-input" style="padding:6px 10px;" value="' + _esc(_historyDateFilter) + '" onchange="window._filterHistoryDate(this.value)" title="Filter by broadcast date" />';
      html += '  </div>';
      html += '  <button class="module-btn module-btn-primary" onclick="window._searchHistory()">🔍 Search</button>';
      if (_historySearchQuery || _historyStatusFilter || _historyDateFilter) {
        html += '  <button class="module-btn module-btn-secondary" onclick="window._resetHistoryFilters()">✕ Clear</button>';
      }
      html += '</div>';

      // History Sessions Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Session ID</th>';
      html += '      <th>Title & Topic</th>';
      html += '      <th>Broadcaster</th>';
      html += '      <th>YouTube Channel</th>';
      html += '      <th>Location / Event</th>';
      html += '      <th>Timing</th>';
      html += '      <th>Duration</th>';
      html += '      <th>Status</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (sessions.length === 0) {
        html += '      <tr><td colspan="9" class="module-empty" style="text-align:center;padding:32px;">No historical live broadcasts found. Completed broadcasts will appear here automatically.</td></tr>';
      } else {
        sessions.forEach(function (s) {
          const sid = s.liveId || s.LiveSessionID || "";
          const sTitle = s.title || s.Title || "Untitled Live";
          const sTopic = s.topic || s.Topic || "General";
          const sBroadcaster = s.cameraPersonName || s.CameraPersonName || "Broadcaster";
          const sUserId = s.userId || s.CameraPersonID || "";
          const sChannel = s.channelTitle || s.ChannelTitle || "Corporate Channel";
          const sChannelId = s.channelId || s.YouTubeChannelID || "";
          const sLocName = s.locationDisplayName || s.LocationEventName || s.city || "—";
          const sEvtName = s.eventName || "";
          const sStarted = s.startedAt || s.StartedAt || "";
          const sEnded = s.endedAt || s.EndedAt || "";
          const sDur = Number(s.totalDurationSeconds || s.DurationSeconds || 0);
          const sStatus = s.status || s.Status || "Ended";
          const sReason = s.endReason || s.TerminationReason || "";
          const sWatch = s.youtubeWatchUrl || s.WatchUrl || "";

          const st = String(sStatus).toLowerCase();
          let statusBadge = "";
          if (st === "ended") {
            statusBadge = '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Ended</span>';
          } else if (st === "terminated") {
            statusBadge = '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Terminated</span>';
          } else {
            statusBadge = '<span class="status-badge" style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">' + _esc(sStatus) + '</span>';
          }

          const startStr = sStarted ? _esc(sStarted.replace("T", " ").substring(0, 16)) : "—";
          const endStr = sEnded ? _esc(sEnded.replace("T", " ").substring(0, 16)) : "—";

          html += '      <tr>';
          html += '        <td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(sid) + '</code></td>';
          html += '        <td>';
          html += '          <div style="font-weight:700;color:var(--text-main);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + _esc(sTitle) + '">' + _esc(sTitle) + '</div>';
          html += '          <div style="font-size:11px;color:var(--text-muted);">' + _esc(sTopic) + '</div>';
          html += '        </td>';
          html += '        <td>';
          html += '          <div style="font-weight:600;color:var(--text-main);">' + _esc(sBroadcaster) + '</div>';
          html += '          <div style="font-size:11px;color:var(--text-muted);">' + _esc(sUserId) + '</div>';
          html += '        </td>';
          html += '        <td>';
          html += '          <div style="font-weight:600;color:var(--text-main);">' + _esc(sChannel) + '</div>';
          html += '          <div style="font-size:10px;color:var(--text-muted);"><code style="font-size:10px;">' + _esc(sChannelId) + '</code></div>';
          html += '        </td>';
          html += '        <td>';
          html += '          <div style="font-size:12px;font-weight:600;color:var(--text-main);">📍 ' + _esc(sLocName) + '</div>';
          if (sEvtName) {
            html += '          <div style="font-size:11px;color:#2563eb;font-weight:600;">🎪 ' + _esc(sEvtName) + '</div>';
          } else {
            html += '          <div style="font-size:11px;color:#94a3b8;">No event linked</div>';
          }
          html += '        </td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);white-space:nowrap;">';
          html += '          <div>Start: ' + startStr + '</div>';
          html += '          <div>End: ' + endStr + '</div>';
          html += '        </td>';
          html += '        <td><span style="font-weight:700;font-size:12px;">' + formatDuration(sDur) + '</span></td>';
          html += '        <td>' + statusBadge;
          if (sReason) {
            html += '          <div style="font-size:10px;color:#64748b;margin-top:2px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + _esc(sReason) + '">' + _esc(sReason) + '</div>';
          }
          html += '        </td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-primary" onclick="window._openHistoricalSessionModal(\'' + _esc(sid) + '\')" title="View Details">🔍 Details</button>';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" style="margin-left:4px;" onclick="window._openAssociateSessionModal(\'' + _esc(sid) + '\', \'' + _esc(sTitle).replace(/'/g, "\\'") + '\')" title="Link Event">🎪 Link</button>';
          if (sWatch) {
            html += '          <a href="' + _esc(sWatch) + '" target="_blank" rel="noopener noreferrer" class="module-btn module-btn-sm module-btn-secondary" style="margin-left:4px;text-decoration:none;display:inline-block;" title="Watch on YouTube">▶ Watch</a>';
          }
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      // Pagination Toolbar
      const totalPages = (pagination && pagination.totalPages) || 1;
      const currentPage = (pagination && pagination.page) || 1;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">';
      html += '  <div style="font-size:12px;color:var(--text-muted);">';
      html += '    Page <strong>' + currentPage + '</strong> of <strong>' + totalPages + '</strong> (' + ((pagination && pagination.totalCount) || 0) + ' total sessions)';
      html += '  </div>';
      html += '  <div style="display:flex;gap:6px;">';
      html += '    <button class="module-btn module-btn-sm module-btn-secondary" ' + (currentPage <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + ' onclick="window._changeHistoryPage(' + (currentPage - 1) + ')">← Previous</button>';
      html += '    <button class="module-btn module-btn-sm module-btn-secondary" ' + (currentPage >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + ' onclick="window._changeHistoryPage(' + (currentPage + 1) + ')">Next →</button>';
      html += '  </div>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // STAGE 7B: LIVE LOCATIONS TAB CONTROLLERS & RENDERING
    // ============================================================

    async function loadAndRenderLocations() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Locations...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminlivelocations&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access Live Locations.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Locations</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshLocationsTab()">🔄 Retry</button></div>';
          return;
        }

        _currentLiveLocations = (json.data && json.data.locations) || [];
        renderLocationsCenter(container, _currentLiveLocations);
      } catch (err) {
        console.error("Live locations load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Locations</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshLocationsTab()">🔄 Retry</button></div>';
      }
    }

    function renderLocationsCenter(parent, locations) {
      let filtered = locations.filter(function (loc) {
        if (_locationSearchQuery) {
          const q = _locationSearchQuery.toLowerCase();
          const matchName = (loc.displayName || loc.DisplayName || "").toLowerCase().includes(q);
          const matchCity = (loc.city || loc.City || "").toLowerCase().includes(q);
          const matchState = (loc.state || loc.State || "").toLowerCase().includes(q);
          const matchCat = (loc.category || loc.Category || "").toLowerCase().includes(q);
          const matchId = (loc.locationEventId || loc.LocationEventID || "").toLowerCase().includes(q);
          if (!matchName && !matchCity && !matchState && !matchCat && !matchId) return false;
        }
        return true;
      });

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📍 Live Locations Management</h2>';
      html += '    <span class="module-count">' + locations.length + ' reusable broadcast locations</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshLocationsTab()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-success" style="background:#16a34a;color:#fff;" onclick="window._openLocationModal()">➕ Add Location</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("locations");

      // Filter Toolbar
      html += '<div class="module-filters" style="margin-bottom:16px;">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="locationSearchInput" class="module-input" placeholder="Search by name, city, state, category, ID..." value="' + _esc(_locationSearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchLocations(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._searchLocations()">🔍 Search</button>';
      html += '  </div>';
      html += '</div>';

      // Locations Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Location ID</th>';
      html += '      <th>Display Name</th>';
      html += '      <th>City / State</th>';
      html += '      <th>GPS Coordinates</th>';
      html += '      <th>Category</th>';
      html += '      <th>Sessions</th>';
      html += '      <th>Air Time</th>';
      html += '      <th>Status</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (filtered.length === 0) {
        html += '      <tr><td colspan="9" class="module-empty" style="text-align:center;padding:32px;">No live locations found. Click <strong>➕ Add Location</strong> to create reusable broadcast locations.</td></tr>';
      } else {
        filtered.forEach(function (loc) {
          const locId = loc.locationEventId || loc.LocationEventID || "";
          const locName = loc.displayName || loc.DisplayName || "";
          const locCity = loc.city || loc.City || "";
          const locState = loc.state || loc.State || "";
          const locLat = loc.latitude !== undefined ? loc.latitude : loc.Latitude;
          const locLng = loc.longitude !== undefined ? loc.longitude : loc.Longitude;
          const locCat = loc.category || loc.Category || "General";
          const locCount = loc.totalSessionsCount || loc.TotalSessionsCount || 0;
          const locSecs = loc.totalLiveSeconds || loc.TotalLiveSeconds || 0;
          const locStatus = loc.status || loc.Status || "Active";

          const isActive = String(locStatus).toLowerCase() === "active";
          const statusBadge = isActive
            ? '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">✓ Active</span>'
            : '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Inactive</span>';

          const mapLink = (locLat && locLng)
            ? '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(locLat + ',' + locLng) + '" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:3px;" title="Open in Google Maps">🌐 ' + _esc(locLat) + ', ' + _esc(locLng) + '</a>'
            : '<span style="color:#94a3b8;font-size:11px;">No GPS</span>';

          html += '      <tr>';
          html += '        <td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(locId) + '</code></td>';
          html += '        <td><div style="font-weight:700;color:var(--text-main);">' + _esc(locName) + '</div></td>';
          html += '        <td>' + _esc(locCity || "—") + (locState ? ', ' + _esc(locState) : '') + '</td>';
          html += '        <td>' + mapLink + '</td>';
          html += '        <td><span style="font-size:12px;background:#f1f5f9;padding:2px 8px;border-radius:4px;">' + _esc(locCat) + '</span></td>';
          html += '        <td style="font-weight:600;">' + locCount + '</td>';
          html += '        <td style="font-size:12px;">' + formatDuration(locSecs) + '</td>';
          html += '        <td>' + statusBadge + '</td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._openLocationModal(\'' + _esc(locId) + '\')" title="Edit Location">✏️ Edit</button>';
          html += '          <button class="module-btn module-btn-sm ' + (isActive ? "module-btn-danger" : "module-btn-primary") + '" style="margin-left:4px;" onclick="window._toggleLocationStatus(\'' + _esc(locId) + '\', \'' + _esc(locStatus) + '\')" title="' + (isActive ? "Deactivate" : "Activate") + '">' + (isActive ? "Disable" : "Enable") + '</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // STAGE 7C: LIVE EVENTS TAB CONTROLLERS & RENDERING
    // ============================================================

    async function loadAndRenderEvents() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Events...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminliveevents&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access Live Events.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Live Events</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshEventsTab()">🔄 Retry</button></div>';
          return;
        }

        _currentLiveEvents = (json.data && json.data.events) || [];
        renderEventsCenter(container, _currentLiveEvents);
      } catch (err) {
        console.error("Live events load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Live Events</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshEventsTab()">🔄 Retry</button></div>';
      }
    }

    function renderEventsCenter(parent, events) {
      let filtered = events.filter(function (ev) {
        if (_eventSearchQuery) {
          const q = _eventSearchQuery.toLowerCase();
          const matchName = (ev.eventName || ev.EventName || "").toLowerCase().includes(q);
          const matchDesc = (ev.description || ev.Description || "").toLowerCase().includes(q);
          const matchLoc = (ev.locationName || ev.LocationName || "").toLowerCase().includes(q);
          const matchCity = (ev.city || ev.City || "").toLowerCase().includes(q);
          const matchId = (ev.eventId || ev.EventID || "").toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchLoc && !matchCity && !matchId) return false;
        }
        return true;
      });

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">🎪 Live Events Management</h2>';
      html += '    <span class="module-count">' + events.length + ' live events</span>';
      html += '  </div>';
      html += '  <div class="module-header-right" style="display:flex;gap:8px;align-items:center;">';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshEventsTab()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-success" style="background:#16a34a;color:#fff;" onclick="window._openEventModal()">➕ Create Event</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-tabs navigation
      html += renderLiveNavTabs("events");

      // Filter Toolbar
      html += '<div class="module-filters" style="margin-bottom:16px;">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="eventSearchInput" class="module-input" placeholder="Search by event name, location, city, ID..." value="' + _esc(_eventSearchQuery) + '" onkeyup="if(event.key===\'Enter\'){ window._searchEvents(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._searchEvents()">🔍 Search</button>';
      html += '  </div>';
      html += '</div>';

      // Events Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Event ID</th>';
      html += '      <th>Event Name & Description</th>';
      html += '      <th>Location</th>';
      html += '      <th>Start Date</th>';
      html += '      <th>End Date</th>';
      html += '      <th>Sessions</th>';
      html += '      <th>Status</th>';
      html += '      <th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (filtered.length === 0) {
        html += '      <tr><td colspan="8" class="module-empty" style="text-align:center;padding:32px;">No live events found. Click <strong>➕ Create Event</strong> to organize broadcasts under events or festivals.</td></tr>';
      } else {
        filtered.forEach(function (ev) {
          const eId = ev.eventId || ev.EventID || "";
          const eName = ev.eventName || ev.EventName || "";
          const eDesc = ev.description || ev.Description || "";
          const eLocName = ev.locationName || ev.LocationName || "—";
          const eCity = ev.city || ev.City || "";
          const eStart = ev.startDate || ev.StartDate || "";
          const eEnd = ev.endDate || ev.EndDate || "";
          const eCount = ev.totalSessionsCount || ev.TotalSessionsCount || 0;
          const eStatus = ev.status || ev.Status || "Upcoming";

          const st = String(eStatus).toLowerCase();
          let statusBadge = "";
          if (st === "active") {
            statusBadge = '<span class="status-badge active" style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Active</span>';
          } else if (st === "upcoming") {
            statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Upcoming</span>';
          } else if (st === "completed") {
            statusBadge = '<span class="status-badge" style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">Completed</span>';
          } else {
            statusBadge = '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;">' + _esc(eStatus) + '</span>';
          }

          html += '      <tr>';
          html += '        <td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(eId) + '</code></td>';
          html += '        <td>';
          html += '          <div style="font-weight:700;color:var(--text-main);">' + _esc(eName) + '</div>';
          if (eDesc) {
            html += '          <div style="font-size:11px;color:var(--text-muted);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + _esc(eDesc) + '">' + _esc(eDesc) + '</div>';
          }
          html += '        </td>';
          html += '        <td>';
          html += '          <div style="font-weight:600;font-size:12px;">' + _esc(eLocName) + '</div>';
          if (eCity) {
            html += '          <div style="font-size:11px;color:var(--text-muted);">' + _esc(eCity) + '</div>';
          }
          html += '        </td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + (eStart ? _esc(eStart.replace("T", " ").substring(0, 16)) : "—") + '</td>';
          html += '        <td style="font-size:11px;color:var(--text-muted);">' + (eEnd ? _esc(eEnd.replace("T", " ").substring(0, 16)) : "—") + '</td>';
          html += '        <td style="font-weight:600;">' + eCount + '</td>';
          html += '        <td>' + statusBadge + '</td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._openEventModal(\'' + _esc(eId) + '\')" title="Edit Event">✏️ Edit</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // STAGE 8: LIVE ANALYTICS CONTROLLER & RENDERING
    // ============================================================

    async function loadAndRenderAnalytics() {
      _stopLiveTimer();
      const session = AdminAuth.getSession();
      if (!session) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Analytics & Metrics...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminliveanalytics&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
          if (json && (json.status === "UNAUTHORIZED" || json.message === "Unauthorized access.")) {
            if (typeof AdminAuth !== "undefined" && typeof AdminAuth.clearSession === "function") {
              AdminAuth.clearSession();
            }
            container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired or Unauthorized</h3><p>Your admin session has expired or is invalid. Please log in again to access Live Analytics.</p><button class="module-btn module-btn-primary" onclick="AdminAuth.redirectToLogin()" style="margin-top:12px;">🔑 Login Again</button></div>';
            return;
          }
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Live Analytics</h3><p>' + _esc(json && json.message || "Unknown error") + '</p><button class="module-btn module-btn-primary" onclick="window._refreshAnalyticsTab()">🔄 Retry</button></div>';
          return;
        }

        _currentLiveAnalytics = json.data || {};
        renderAnalyticsCenter(container, _currentLiveAnalytics);
      } catch (err) {
        console.error("Live analytics load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Live Analytics</h3><p>' + _esc(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshAnalyticsTab()">🔄 Retry</button></div>';
      }
    }

    function renderAnalyticsCenter(parent, data) {
      const d = data || {};
      const activeStreams = d.activeStreams || [];
      const channelsList = d.sessionsByChannel || [];
      const broadcastersList = d.sessionsByBroadcaster || [];
      const locationsList = d.sessionsByLocation || [];
      const eventsList = d.sessionsByEvent || [];
      const reasonsObj = d.terminationReasons || {};

      let html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📊 Live Metrics & Analytics</h2>';
      html += '    <span class="module-count">' + (d.totalLiveSessions || 0) + ' total sessions</span>';
      html += '  </div>';
      html += '  <div class="module-header-actions">';
      html += '    <button class="module-btn module-btn-secondary" onclick="window._refreshAnalyticsTab()">🔄 Refresh Analytics</button>';
      html += '  </div>';
      html += '</div>';

      // Navigation Tabs
      html += renderLiveNavTabs("analytics");

      // Real-time vs Delayed Indicator Banner
      html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:10px 16px;border-radius:6px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">';
      html += '  <div>';
      html += '    <span style="font-size:12px;font-weight:700;color:#15803d;margin-right:8px;">🟢 REAL-TIME:</span>';
      html += '    <span style="font-size:12px;color:#166534;">Concurrent Viewers (' + (d.currentConcurrentViewers || 0) + ') & Active Streams (' + (d.activeLiveSessionsCount || 0) + ')</span>';
      html += '    <span style="margin:0 10px;color:#94a3b8;">|</span>';
      html += '    <span style="font-size:12px;font-weight:700;color:#0369a1;margin-right:8px;">⏱️ DELAYED:</span>';
      html += '    <span style="font-size:12px;color:#075985;">Aggregated YouTube Views (' + (d.totalViews || 0) + ') & Statistics</span>';
      html += '  </div>';
      html += '  <span style="font-size:11px;color:var(--text-muted);">' + (d.generatedAt ? ('Updated: ' + _esc(d.generatedAt.replace('T', ' ').substring(0, 19))) : '') + '</span>';
      html += '</div>';

      // KPI Summary Cards
      html += '<div class="live-stats-row" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:14px;margin-bottom:24px;">';

      // Total Sessions
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Total Broadcasts</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#1e293b;margin-top:4px;">' + (d.totalLiveSessions || 0) + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + (d.completedLiveSessionsCount || 0) + ' completed · ' + (d.activeLiveSessionsCount || 0) + ' active</div>';
      html += '  </div>';

      // Active Now
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;">🔴 Active Now</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#dc2626;margin-top:4px;">' + (d.activeLiveSessionsCount || 0) + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + (d.currentConcurrentViewers || 0) + ' concurrent viewers</div>';
      html += '  </div>';

      // Total Airtime
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Total Airtime</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#0284c7;margin-top:4px;">' + formatDuration(d.totalDurationSeconds || 0) + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Cumulative broadcast duration</div>';
      html += '  </div>';

      // Average Duration
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Avg Stream Duration</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#7c3aed;margin-top:4px;">' + formatDuration(d.averageDurationSeconds || 0) + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Across completed broadcasts</div>';
      html += '  </div>';

      // Total Views
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Total Views</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#059669;margin-top:4px;">' + (d.totalViews || 0).toLocaleString() + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">YouTube recorded views</div>';
      html += '  </div>';

      // Peak Viewers
      html += '  <div class="stat-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">';
      html += '    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">All-Time Peak</div>';
      html += '    <div style="font-size:24px;font-weight:800;color:#d97706;margin-top:4px;">' + (d.peakConcurrentViewers || 0).toLocaleString() + '</div>';
      html += '    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Max concurrent recorded</div>';
      html += '  </div>';

      html += '</div>';

      // Active Streams Real-Time Telemetry Section
      html += '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin-bottom:24px;">';
      html += '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">';
      html += '    <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0;">🔴 Active Streams Real-Time Telemetry</h3>';
      html += '    <span style="font-size:12px;color:var(--text-muted);">' + activeStreams.length + ' active broadcast' + (activeStreams.length === 1 ? '' : 's') + '</span>';
      html += '  </div>';

      if (activeStreams.length === 0) {
        html += '  <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;background:#f8fafc;border-radius:6px;">No live streams currently broadcasting. Real-time telemetry will appear here when a stream goes live.</div>';
      } else {
        html += '  <div class="module-table-wrapper" style="overflow-x:auto;">';
        html += '    <table class="module-table" style="width:100%;font-size:13px;">';
        html += '      <thead>';
        html += '        <tr>';
        html += '          <th>Broadcast Title</th>';
        html += '          <th>Broadcaster</th>';
        html += '          <th>Channel</th>';
        html += '          <th>Location / Event</th>';
        html += '          <th>Live Duration</th>';
        html += '          <th>Concurrent Viewers</th>';
        html += '          <th>Peak</th>';
        html += '          <th>Actions</th>';
        html += '        </tr>';
        html += '      </thead>';
        html += '      <tbody>';
        activeStreams.forEach(function(as) {
          html += '      <tr>';
          html += '        <td><div style="font-weight:600;">' + _esc(as.title) + '</div><div style="font-size:11px;color:var(--text-muted);">' + _esc(as.liveId) + '</div></td>';
          html += '        <td>' + _esc(as.cameraPersonName) + '</td>';
          html += '        <td>' + _esc(as.channelTitle) + '</td>';
          html += '        <td>' + _esc(as.locationName || "—") + '</td>';
          html += '        <td style="font-weight:600;color:#0284c7;">' + formatDuration(as.durationSeconds) + '</td>';
          html += '        <td><span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:12px;font-weight:700;font-size:12px;">👥 ' + (as.currentViewers !== null ? as.currentViewers : '—') + '</span></td>';
          html += '        <td style="font-weight:600;">' + as.peakViewers + '</td>';
          html += '        <td style="white-space:nowrap;">';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._openSessionMetricsModal(\'' + _esc(as.liveId) + '\')">📈 Metrics</button> ';
          html += '          <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._captureLiveSnapshot(\'' + _esc(as.liveId) + '\')">📸 Snapshot</button>';
          html += '        </td>';
          html += '      </tr>';
        });
        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
      }
      html += '</div>';

      // 2-Column Breakdown Grids
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:20px;margin-bottom:24px;">';

      // Breakdown: Channels
      html += '  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;">';
      html += '    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px 0;">📺 Activity by YouTube Channel</h3>';
      if (channelsList.length === 0) {
        html += '    <div style="font-size:12px;color:var(--text-muted);padding:12px;text-align:center;">No channel data recorded.</div>';
      } else {
        html += '    <table class="module-table" style="width:100%;font-size:12px;">';
        html += '      <thead><tr><th>Channel</th><th>Sessions</th><th>Total Airtime</th><th>Views</th></tr></thead>';
        html += '      <tbody>';
        channelsList.forEach(function(c) {
          html += '      <tr>';
          html += '        <td style="font-weight:600;">' + _esc(c.channelTitle) + '</td>';
          html += '        <td>' + c.sessionCount + '</td>';
          html += '        <td>' + formatDuration(c.totalDurationSeconds) + '</td>';
          html += '        <td>' + (c.totalViews || 0).toLocaleString() + '</td>';
          html += '      </tr>';
        });
        html += '      </tbody>';
        html += '    </table>';
      }
      html += '  </div>';

      // Breakdown: Broadcasters
      html += '  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;">';
      html += '    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px 0;">👥 Activity by Camera Person</h3>';
      if (broadcastersList.length === 0) {
        html += '    <div style="font-size:12px;color:var(--text-muted);padding:12px;text-align:center;">No broadcaster data recorded.</div>';
      } else {
        html += '    <table class="module-table" style="width:100%;font-size:12px;">';
        html += '      <thead><tr><th>Broadcaster</th><th>Sessions</th><th>Total Airtime</th><th>Views</th></tr></thead>';
        html += '      <tbody>';
        broadcastersList.forEach(function(b) {
          html += '      <tr>';
          html += '        <td style="font-weight:600;">' + _esc(b.cameraPersonName) + '</td>';
          html += '        <td>' + b.sessionCount + '</td>';
          html += '        <td>' + formatDuration(b.totalDurationSeconds) + '</td>';
          html += '        <td>' + (b.totalViews || 0).toLocaleString() + '</td>';
          html += '      </tr>';
        });
        html += '      </tbody>';
        html += '    </table>';
      }
      html += '  </div>';

      // Breakdown: Locations
      html += '  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;">';
      html += '    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px 0;">📍 Activity by Location</h3>';
      if (locationsList.length === 0) {
        html += '    <div style="font-size:12px;color:var(--text-muted);padding:12px;text-align:center;">No location associations recorded.</div>';
      } else {
        html += '    <table class="module-table" style="width:100%;font-size:12px;">';
        html += '      <thead><tr><th>Location</th><th>Sessions</th><th>Total Airtime</th></tr></thead>';
        html += '      <tbody>';
        locationsList.forEach(function(l) {
          html += '      <tr>';
          html += '        <td style="font-weight:600;">' + _esc(l.locationName) + '</td>';
          html += '        <td>' + l.sessionCount + '</td>';
          html += '        <td>' + formatDuration(l.totalDurationSeconds) + '</td>';
          html += '      </tr>';
        });
        html += '      </tbody>';
        html += '    </table>';
      }
      html += '  </div>';

      // Breakdown: Termination Reasons
      html += '  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;">';
      html += '    <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px 0;">🛑 Termination Reasons</h3>';
      const reasonKeys = Object.keys(reasonsObj);
      if (reasonKeys.length === 0) {
        html += '    <div style="font-size:12px;color:var(--text-muted);padding:12px;text-align:center;">No termination reasons recorded.</div>';
      } else {
        html += '    <table class="module-table" style="width:100%;font-size:12px;">';
        html += '      <thead><tr><th>Reason</th><th>Count</th></tr></thead>';
        html += '      <tbody>';
        reasonKeys.forEach(function(r) {
          html += '      <tr>';
          html += '        <td style="font-weight:600;">' + _esc(r) + '</td>';
          html += '        <td>' + reasonsObj[r] + '</td>';
          html += '      </tr>';
        });
        html += '      </tbody>';
        html += '    </table>';
      }
      html += '  </div>';

      html += '</div>';

      parent.innerHTML = html;
    }

    // ============================================================
    // GLOBAL HANDLERS FOR CHANNELS, ALLOCATIONS, HISTORY, LOCATIONS, EVENTS & ANALYTICS
    // ============================================================

    window._switchLiveMainTab = function (tab) {
      _stopAllCctvFeeds();
      _stopLiveTimer();
      _currentLiveTab = tab || "cctv";
      if (_currentLiveTab === "cctv" || _currentLiveTab === "streams") {
        loadAndRender();
      } else if (_currentLiveTab === "channels") {
        loadAndRenderChannels();
      } else if (_currentLiveTab === "allocations") {
        loadAndRenderAllocations();
      } else if (_currentLiveTab === "history") {
        loadAndRenderHistory();
      } else if (_currentLiveTab === "locations") {
        loadAndRenderLocations();
      } else if (_currentLiveTab === "events") {
        loadAndRenderEvents();
      } else if (_currentLiveTab === "analytics") {
        loadAndRenderAnalytics();
      }
    };

    window._refreshAnalyticsTab = function () {
      loadAndRenderAnalytics();
    };

    window._openSessionMetricsModal = async function (liveId) {
      if (!liveId) return;
      const session = AdminAuth.getSession();
      if (!session) {
        if (typeof AdminAuth !== "undefined" && typeof AdminAuth.redirectToLogin === "function") {
          AdminAuth.redirectToLogin();
        }
        return;
      }

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-container" style="max-width:680px;" onclick="event.stopPropagation()">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3 class="modal-title">📈 Live Session Operational Metrics</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" id="sessionMetricsModalBody">';
      mhtml += '      <div class="module-loading" style="padding:30px 0;"><div class="loader"></div><p>Fetching server-side metrics...</p></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">';
      mhtml += '      <button class="module-btn module-btn-sm module-btn-secondary" id="captureSnapBtn" onclick="window._captureLiveSnapshot(\'' + _esc(liveId) + '\', true)">📸 Capture Snapshot Now</button>';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);

      try {
        const url = getApiUrl() + "?action=adminlivesessionmetrics&liveId=" + encodeURIComponent(liveId) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        const mBody = document.getElementById("sessionMetricsModalBody");
        if (!mBody) return;

        if (!json || !json.success || !json.data) {
          mBody.innerHTML = '<div style="color:#b91c1c;padding:16px;background:#fee2e2;border-radius:6px;">⚠️ Failed to load session metrics: ' + _esc(json && json.message || "Unknown error") + '</div>';
          return;
        }

        const s = json.data;
        const durStr = formatDuration(s.durationSeconds || s.DurationSeconds || 0);
        const isLive = s.isLive || String(s.status || "").toLowerCase() === "active";
        const viewersVal = s.currentViewers !== null ? s.currentViewers : "Unavailable / Offline";
        const viewsVal = s.totalViews !== null ? s.totalViews.toLocaleString() : "Unavailable / Offline";

        let bhtml = '';
        bhtml += '<div style="background:#f8fafc;border-left:4px solid ' + (isLive ? '#16a34a' : '#64748b') + ';padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;display:flex;justify-content:space-between;align-items:center;">';
        bhtml += '  <div><strong>Status:</strong> <span class="status-badge" style="background:' + (isLive ? '#dcfce7;color:#15803d' : '#f1f5f9;color:#475569') + ';padding:2px 8px;border-radius:10px;font-size:11px;">' + _esc(s.status || s.Status) + '</span> · ' + (isLive ? 'Live Stream Ongoing' : 'Concluded Stream Archive') + '</div>';
        bhtml += '  <div style="font-size:11px;color:var(--text-muted);">' + (s.metricFreshness && s.metricFreshness.isRealTimeViewers ? '🟢 Real-Time Verified' : '⏱️ Delayed / Cached') + '</div>';
        bhtml += '</div>';

        bhtml += '<div style="margin-bottom:14px;">';
        bhtml += '  <h4 style="margin:0 0 4px 0;font-size:15px;font-weight:700;">' + _esc(s.title || s.Title) + '</h4>';
        bhtml += '  <div style="font-size:12px;color:var(--text-muted);">' + _esc(s.channelTitle || s.YouTubeChannelID) + ' · Broadcaster: ' + _esc(s.cameraPersonName || s.CameraPersonID) + '</div>';
        bhtml += '</div>';

        // 4 KPI Mini-Cards
        bhtml += '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:16px;">';
        bhtml += '  <div style="background:#f1f5f9;padding:10px;border-radius:6px;text-align:center;">';
        bhtml += '    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Viewers</div>';
        bhtml += '    <div style="font-size:18px;font-weight:800;color:' + (isLive ? '#15803d' : '#475569') + ';">' + (typeof viewersVal === "number" ? viewersVal.toLocaleString() : viewersVal) + '</div>';
        bhtml += '  </div>';
        bhtml += '  <div style="background:#f1f5f9;padding:10px;border-radius:6px;text-align:center;">';
        bhtml += '    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Total Views</div>';
        bhtml += '    <div style="font-size:18px;font-weight:800;color:#0284c7;">' + viewsVal + '</div>';
        bhtml += '  </div>';
        bhtml += '  <div style="background:#f1f5f9;padding:10px;border-radius:6px;text-align:center;">';
        bhtml += '    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Peak Recorded</div>';
        bhtml += '    <div style="font-size:18px;font-weight:800;color:#d97706;">' + (s.peakViewers || 0) + '</div>';
        bhtml += '  </div>';
        bhtml += '  <div style="background:#f1f5f9;padding:10px;border-radius:6px;text-align:center;">';
        bhtml += '    <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Duration</div>';
        bhtml += '    <div style="font-size:16px;font-weight:800;color:#7c3aed;line-height:24px;">' + durStr + '</div>';
        bhtml += '  </div>';
        bhtml += '</div>';

        // Additional stats
        bhtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:12px;">';
        bhtml += '  <div><strong>Started At:</strong> ' + (s.startedAt ? _esc(s.startedAt.replace('T', ' ').substring(0, 19)) : '—') + '</div>';
        bhtml += '  <div><strong>Ended At:</strong> ' + (s.endedAt ? _esc(s.endedAt.replace('T', ' ').substring(0, 19)) : (isLive ? 'Currently Live' : '—')) + '</div>';
        bhtml += '  <div><strong>Termination Reason:</strong> ' + _esc(s.terminationReason || s.TerminationReason || "Normal") + '</div>';
        bhtml += '  <div><strong>Location / Event:</strong> ' + _esc(s.locationEventName || "—") + '</div>';
        bhtml += '</div>';

        // Snapshots list
        bhtml += '<div style="border-top:1px solid #e2e8f0;padding-top:12px;">';
        bhtml += '  <h5 style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e293b;">📸 Captured Metric Snapshots</h5>';
        const snaps = s.snapshots || [];
        if (snaps.length === 0) {
          bhtml += '  <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No metric snapshots recorded for this session yet.</div>';
        } else {
          bhtml += '  <div style="max-height:160px;overflow-y:auto;">';
          bhtml += '    <table class="module-table" style="width:100%;font-size:11px;">';
          bhtml += '      <thead><tr><th>Captured At</th><th>Viewers</th><th>Total Views</th><th>Duration</th><th>Status</th></tr></thead>';
          bhtml += '      <tbody>';
          snaps.forEach(function(snap) {
            bhtml += '      <tr>';
            bhtml += '        <td>' + _esc(snap.capturedAt ? snap.capturedAt.replace('T', ' ').substring(0, 19) : '—') + '</td>';
            bhtml += '        <td>' + (snap.currentViewers !== null ? snap.currentViewers : '—') + '</td>';
            bhtml += '        <td>' + (snap.totalViews !== null ? snap.totalViews.toLocaleString() : '—') + '</td>';
            bhtml += '        <td>' + formatDuration(snap.durationSeconds) + '</td>';
            bhtml += '        <td>' + _esc(snap.status) + '</td>';
            bhtml += '      </tr>';
          });
          bhtml += '      </tbody>';
          bhtml += '    </table>';
          bhtml += '  </div>';
        }
        bhtml += '</div>';

        mBody.innerHTML = bhtml;

      } catch (err) {
        const mBody = document.getElementById("sessionMetricsModalBody");
        if (mBody) {
          mBody.innerHTML = '<div style="color:#b91c1c;padding:16px;background:#fee2e2;border-radius:6px;">⚠️ Exception: ' + _esc(err.message) + '</div>';
        }
      }
    };

    window._captureLiveSnapshot = async function (liveId, reloadModal) {
      if (!liveId) return;
      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=admincapturesnapshot&liveId=" + encodeURIComponent(liveId) + "&force=true&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          showToast("Snapshot captured successfully", "success");
          if (reloadModal && typeof window._openSessionMetricsModal === "function") {
            window._openSessionMetricsModal(liveId);
          }
        } else {
          showToast("Snapshot: " + (json && json.message || "Failed"), "error");
        }
      } catch (e) {
        showToast("Error capturing snapshot: " + e.message, "error");
      }
    };

    window._toggleCctvAudio = function (liveId) {
      const targetCard = document.getElementById("cctv-card-" + liveId);
      const targetIframe = document.getElementById("cctv-iframe-" + liveId);
      const targetBtn = document.getElementById("cctv-audio-btn-" + liveId);
      if (!targetIframe) return;

      if (_activeAudibleSessionId === liveId) {
        // Already active -> mute it
        _sendIframeCommand(targetIframe, "mute");
        _activeAudibleSessionId = null;
        if (targetCard) targetCard.classList.remove("cctv-audio-active");
        if (targetBtn) {
          targetBtn.innerHTML = "🔇 Audio Off";
          targetBtn.classList.remove("active");
        }
      } else {
        // Mute previous audible feed if any (Single-Audio Enforcement)
        if (_activeAudibleSessionId) {
          const prevIframe = document.getElementById("cctv-iframe-" + _activeAudibleSessionId);
          const prevCard = document.getElementById("cctv-card-" + _activeAudibleSessionId);
          const prevBtn = document.getElementById("cctv-audio-btn-" + _activeAudibleSessionId);
          if (prevIframe) _sendIframeCommand(prevIframe, "mute");
          if (prevCard) prevCard.classList.remove("cctv-audio-active");
          if (prevBtn) {
            prevBtn.innerHTML = "🔇 Audio Off";
            prevBtn.classList.remove("active");
          }
        }

        // Unmute new feed
        _activeAudibleSessionId = liveId;
        _sendIframeCommand(targetIframe, "unMute");
        _sendIframeCommand(targetIframe, "setVolume", [100]);
        if (targetCard) targetCard.classList.add("cctv-audio-active");
        if (targetBtn) {
          targetBtn.innerHTML = "🔊 Listening";
          targetBtn.classList.add("active");
        }
      }
    };

    window._openAdminLocationModal = function () {
      closeModal();
      const currentLoc = _getAdminLocation();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:500px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>📍 Change Admin Monitoring Location</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Select a preset city or enter custom coordinates for the Admin CCTV Surveillance Center. (This only filters admin monitoring feeds and does not alter broadcaster or viewer coordinates).</p>';

      mhtml += '      <div style="font-weight:700;font-size:12px;margin-bottom:8px;">Quick Preset Cities:</div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">';
      const presets = [
        { name: "Amravati", lat: 20.9374, lng: 77.7796 },
        { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
        { name: "Pune", lat: 18.5204, lng: 73.8567 },
        { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
        { name: "Akola", lat: 20.7002, lng: 77.0082 },
        { name: "Wardha", lat: 20.7453, lng: 78.6022 },
        { name: "Yavatmal", lat: 20.3888, lng: 78.1204 }
      ];
      presets.forEach(function (p) {
        mhtml += '        <button class="module-btn module-btn-secondary module-btn-sm" style="text-align:left;font-size:11px;padding:6px 8px;" onclick="window._selectAdminPresetCity(\'' + p.name + '\', ' + p.lat + ', ' + p.lng + ')">🏛️ ' + p.name + '</button>';
      });
      mhtml += '      </div>';

      mhtml += '      <hr style="border:0;border-top:1px solid #e2e8f0;margin:12px 0;" />';

      mhtml += '      <div style="font-weight:700;font-size:12px;margin-bottom:8px;">Custom Location Coordinates:</div>';
      mhtml += '      <div style="margin-bottom:10px;">';
      mhtml += '        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Location Name / Label</label>';
      mhtml += '        <input type="text" id="adminCustomLocName" class="module-input" placeholder="e.g. Headquarters" value="' + escapeHtml(currentLoc.name || '') + '" style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Latitude</label>';
      mhtml += '          <input type="number" step="any" id="adminCustomLocLat" class="module-input" placeholder="e.g. 20.9374" value="' + (currentLoc.lat !== undefined ? currentLoc.lat : '') + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Longitude</label>';
      mhtml += '          <input type="number" step="any" id="adminCustomLocLng" class="module-input" placeholder="e.g. 77.7796" value="' + (currentLoc.lng !== undefined ? currentLoc.lng : '') + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div id="adminLocModalError" style="display:none;color:#b91c1c;font-size:12px;margin-top:6px;padding:6px;background:#fee2e2;border-radius:4px;"></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer">';
      mhtml += '      <button class="module-btn module-btn-primary" onclick="window._submitCustomAdminLocation()">Save Location</button>';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);
    };

    window._selectAdminPresetCity = function (name, lat, lng) {
      _saveAdminLocation({ name: name, lat: Number(lat), lng: Number(lng) });
      closeModal();
      if (typeof showToast === "function") showToast("Admin location set to " + name, "success");
      loadAndRender();
    };

    window._submitCustomAdminLocation = function () {
      const nameInput = document.getElementById("adminCustomLocName");
      const latInput = document.getElementById("adminCustomLocLat");
      const lngInput = document.getElementById("adminCustomLocLng");
      const errBox = document.getElementById("adminLocModalError");

      const name = nameInput ? nameInput.value.trim() : "";
      const lat = latInput ? parseFloat(latInput.value) : NaN;
      const lng = lngInput ? parseFloat(lngInput.value) : NaN;

      if (isNaN(lat) || lat < -90 || lat > 90) {
        if (errBox) { errBox.textContent = "Please enter a valid Latitude (-90 to +90)."; errBox.style.display = "block"; }
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        if (errBox) { errBox.textContent = "Please enter a valid Longitude (-180 to +180)."; errBox.style.display = "block"; }
        return;
      }

      _saveAdminLocation({ name: name || "Custom Coordinates", lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
      closeModal();
      if (typeof showToast === "function") showToast("Admin location updated", "success");
      loadAndRender();
    };

    window._useAdminCurrentGps = function () {
      if (!navigator.geolocation) {
        if (typeof showToast === "function") showToast("Geolocation not supported by this browser", "error");
        else alert("Geolocation not supported by this browser");
        return;
      }
      if (typeof showToast === "function") showToast("Acquiring GPS fix...", "info");
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const loc = {
            lat: Math.round(pos.coords.latitude * 10000) / 10000,
            lng: Math.round(pos.coords.longitude * 10000) / 10000,
            name: "Admin GPS Location"
          };
          _saveAdminLocation(loc);
          if (typeof showToast === "function") showToast("Admin GPS updated: " + loc.lat + ", " + loc.lng, "success");
          loadAndRender();
        },
        function (err) {
          console.warn("Admin GPS error:", err);
          if (typeof showToast === "function") showToast("Failed to acquire GPS: " + err.message, "error");
          else alert("Failed to acquire GPS: " + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    };

    window._setAdminRadius = function (r) {
      _saveAdminRadius(r);
      loadAndRender();
    };

    window._stopAllCctvFeeds = _stopAllCctvFeeds;

    window._refreshChannelsTab = function () {
      loadAndRenderChannels();
    };

    window._searchChannels = function () {
      const input = document.getElementById("channelSearchInput");
      _channelSearchQuery = input ? input.value.trim() : "";
      renderChannelsCenter(container, {
        totalChannels: _currentChannels.length,
        activeHealthy: _currentChannels.filter(c => String(c.oAuthStatus).toLowerCase() === "active" && String(c.status).toLowerCase() === "active").length,
        needsAttention: _currentChannels.filter(c => String(c.oAuthStatus).toLowerCase() !== "active" && String(c.status).toLowerCase() !== "disconnected").length,
        disconnected: _currentChannels.filter(c => String(c.status).toLowerCase() === "disconnected").length
      }, _currentChannels);
    };

    window._openYouTubeConnectPopup = async function () {
      const session = AdminAuth.getSession();
      if (!session) return;
      try {
        const url = getApiUrl() + "?action=adminyoutubeauthurl&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        if (!json || !json.success || !json.data || !json.data.authUrl) {
          alert((json && json.message) || "Failed to generate YouTube authorization URL");
          return;
        }

        const width = 600;
        const height = 700;
        const left = Math.max(0, (window.screen.width - width) / 2);
        const top = Math.max(0, (window.screen.height - height) / 2);

        window.open(json.data.authUrl, "EkkaYouTubeOAuth", "width=" + width + ",height=" + height + ",top=" + top + ",left=" + left + ",scrollbars=yes,resizable=yes");
      } catch (e) {
        alert("Error opening connection popup: " + e.message);
      }
    };

    window._validateChannelHealth = async function (channelId) {
      const session = AdminAuth.getSession();
      if (!session) return;
      try {
        if (typeof showToast === "function") showToast("Validating channel health...", "info");
        const url = getApiUrl() + "?action=adminvalidateyoutubechannel&channelId=" + encodeURIComponent(channelId) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          if (typeof showToast === "function") showToast("Channel health verified: Active", "success");
          else alert("Channel health verified successfully!");
          loadAndRenderChannels();
        } else {
          if (typeof showToast === "function") showToast((json && json.message) || "Health check failed", "error");
          else alert("Health check failed: " + (json && json.message));
          loadAndRenderChannels();
        }
      } catch (e) {
        alert("Error validating health: " + e.message);
      }
    };

    window._disconnectChannel = async function (channelId, title) {
      if (!confirm("Are you sure you want to disconnect YouTube channel '" + title + "'?\n\nThis will revoke authorization with Google, remove stored credentials, and prevent any broadcasters from using this channel.")) {
        return;
      }
      const session = AdminAuth.getSession();
      if (!session) return;
      try {
        const url = getApiUrl() + "?action=admindisconnectyoutubechannel&channelId=" + encodeURIComponent(channelId) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          if (typeof showToast === "function") showToast("Channel disconnected successfully", "success");
          else alert("Channel disconnected successfully");
          loadAndRenderChannels();
        } else {
          alert("Failed to disconnect channel: " + (json && json.message));
        }
      } catch (e) {
        alert("Error disconnecting channel: " + e.message);
      }
    };

    window._refreshAllocationsTab = function () {
      loadAndRenderAllocations();
    };

    window._searchAllocations = function () {
      const input = document.getElementById("allocationSearchInput");
      _allocationSearchQuery = input ? input.value.trim() : "";
      renderAllocationsCenter(container, {
        totalAllocations: _currentAllocations.length,
        activeAllocations: _currentAllocations.filter(a => String(a.status).toLowerCase() === "active").length,
        revokedAllocations: _currentAllocations.filter(a => String(a.status).toLowerCase() === "revoked").length
      }, _currentAllocations);
    };

    window._openAssignBroadcasterModal = async function () {
      const session = AdminAuth.getSession();
      if (!session) return;

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:520px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>➕ Assign Broadcaster to Channel</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <div style="margin-bottom:14px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Camera Person / User ID *</label>';
      mhtml += '        <input type="text" id="assignUserIdInput" class="module-input" placeholder="e.g. U20260101001" style="width:100%;" />';
      mhtml += '        <small style="color:var(--text-muted);font-size:11px;">Enter the Ekka1km User ID of the authorized Camera Person.</small>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:14px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Target YouTube Channel *</label>';
      mhtml += '        <select id="assignChannelSelect" class="module-select" style="width:100%;">';
      mhtml += '          <option value="">Loading active channels...</option>';
      mhtml += '        </select>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:14px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Notes (Optional)</label>';
      mhtml += '        <textarea id="assignNotesInput" class="module-input" placeholder="e.g. Assigned for Tarkhedi Hanuman Mandir Live" style="width:100%;min-height:60px;resize:vertical;"></textarea>';
      mhtml += '      </div>';
      mhtml += '      <div id="assignModalError" style="display:none;color:#b91c1c;font-size:12px;margin-top:8px;padding:8px;background:#fee2e2;border-radius:6px;"></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer">';
      mhtml += '      <button class="module-btn module-btn-success" style="background:#16a34a;color:#fff;" id="btnSubmitAssign" onclick="window._submitAssignBroadcaster()">Assign Broadcaster</button>';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);

      // Fetch active channels for dropdown
      try {
        const url = getApiUrl() + "?action=adminyoutubechannels&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        const channels = (json && json.data && json.data.channels) || [];
        const activeChannels = channels.filter(function (c) {
          return String(c.status || "").toLowerCase() === "active" && String(c.oAuthStatus || "").toLowerCase() === "active";
        });

        const select = document.getElementById("assignChannelSelect");
        if (select) {
          if (activeChannels.length === 0) {
            select.innerHTML = '<option value="">-- No active connected channels available --</option>';
          } else {
            let opts = '<option value="">-- Select Active Channel --</option>';
            activeChannels.forEach(function (c) {
              opts += '<option value="' + _esc(c.channelId) + '">' + _esc(c.channelTitle) + ' (' + (c.channelCustomUrl || c.channelId) + ')</option>';
            });
            select.innerHTML = opts;
          }
        }
      } catch (e) {
        const errBox = document.getElementById("assignModalError");
        if (errBox) {
          errBox.textContent = "Error loading channels: " + e.message;
          errBox.style.display = "block";
        }
      }
    };

    window._submitAssignBroadcaster = async function () {
      const userIdInput = document.getElementById("assignUserIdInput");
      const channelSelect = document.getElementById("assignChannelSelect");
      const notesInput = document.getElementById("assignNotesInput");
      const errBox = document.getElementById("assignModalError");
      const btn = document.getElementById("btnSubmitAssign");

      const userId = userIdInput ? userIdInput.value.trim() : "";
      const channelId = channelSelect ? channelSelect.value.trim() : "";
      const notes = notesInput ? notesInput.value.trim() : "";

      if (!userId) {
        if (errBox) { errBox.textContent = "Please enter a valid User ID."; errBox.style.display = "block"; }
        return;
      }
      if (!channelId) {
        if (errBox) { errBox.textContent = "Please select an active YouTube channel."; errBox.style.display = "block"; }
        return;
      }

      const session = AdminAuth.getSession();
      if (!session) return;

      if (btn) btn.disabled = true;
      if (errBox) errBox.style.display = "none";

      try {
        const url = getApiUrl() + "?action=adminallocatechannel&session=" + encodeURIComponent(session) +
          "&userId=" + encodeURIComponent(userId) +
          "&channelId=" + encodeURIComponent(channelId) +
          "&notes=" + encodeURIComponent(notes);

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success) {
          if (typeof showToast === "function") showToast("Broadcaster assigned successfully!", "success");
          else alert("Broadcaster assigned successfully!");
          closeModal();
          loadAndRenderAllocations();
        } else {
          if (errBox) {
            errBox.textContent = (json && json.message) || "Failed to assign broadcaster";
            errBox.style.display = "block";
          } else {
            alert((json && json.message) || "Failed to assign broadcaster");
          }
        }
      } catch (e) {
        if (errBox) {
          errBox.textContent = "Network error: " + e.message;
          errBox.style.display = "block";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    window._revokeAllocation = async function (allocationId, person, channel) {
      if (!confirm("Revoke live broadcasting authorization for " + person + " on " + channel + "?\n\nThis will immediately remove access for future sessions while preserving historical session integrity.")) {
        return;
      }
      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=adminrevokeallocation&allocationId=" + encodeURIComponent(allocationId) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.success) {
          if (typeof showToast === "function") showToast("Authorization revoked", "success");
          else alert("Authorization revoked");
          loadAndRenderAllocations();
        } else {
          alert("Failed to revoke: " + (json && json.message));
        }
      } catch (e) {
        alert("Error revoking allocation: " + e.message);
      }
    };

    // ============================================================
    // STAGE 7: GLOBAL HANDLERS FOR HISTORY, LOCATIONS & EVENTS
    // ============================================================

    // --- History Handlers ---
    window._refreshHistoryTab = function () {
      loadAndRenderHistory();
    };

    window._searchHistory = function () {
      const input = document.getElementById("historySearchInput");
      _historySearchQuery = input ? input.value.trim() : "";
      _historyPage = 1;
      loadAndRenderHistory();
    };

    window._filterHistoryStatus = function (status) {
      _historyStatusFilter = status || "";
      _historyPage = 1;
      loadAndRenderHistory();
    };

    window._filterHistoryDate = function (dateVal) {
      _historyDateFilter = dateVal || "";
      _historyPage = 1;
      loadAndRenderHistory();
    };

    window._resetHistoryFilters = function () {
      _historySearchQuery = "";
      _historyStatusFilter = "";
      _historyDateFilter = "";
      _historyPage = 1;
      loadAndRenderHistory();
    };

    window._changeHistoryPage = function (newPage) {
      const maxPages = (_historyPagination && _historyPagination.totalPages) || 1;
      if (newPage < 1 || newPage > maxPages) return;
      _historyPage = newPage;
      loadAndRenderHistory();
    };

    window._openHistoricalSessionModal = async function (liveId) {
      const session = AdminAuth.getSession();
      if (!session) return;

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:680px;max-height:90vh;overflow-y:auto;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>📜 Historical Broadcast Details</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" id="historicalModalBody" style="padding:16px;">';
      mhtml += '      <div style="text-align:center;padding:24px;color:var(--text-muted);"><div class="loader" style="margin:0 auto 10px;"></div>Loading broadcast session record...</div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">';
      mhtml += '      <button class="module-btn module-btn-sm module-btn-secondary" onclick="window._openSessionMetricsModal(\'' + _esc(liveId) + '\')">📈 View Metrics & Snapshots</button>';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);

      try {
        const url = getApiUrl() + "?action=adminlivesessiondetails&liveId=" + encodeURIComponent(liveId) + "&session=" + encodeURIComponent(session);
        const res = await fetch(url);
        const json = await res.json();
        const mBody = document.getElementById("historicalModalBody");
        if (!mBody) return;

        if (!json || !json.success || !json.data) {
          mBody.innerHTML = '<div style="color:#b91c1c;padding:16px;background:#fee2e2;border-radius:6px;">⚠️ Failed to load session details: ' + _esc(json && json.message || "Unknown error") + '</div>';
          return;
        }

        const s = json.data;
        const durStr = formatDuration(s.totalDurationSeconds || s.DurationSeconds || 0);
        const lat = s.latitude !== undefined && s.latitude !== null ? s.latitude : s.Latitude;
        const lng = s.longitude !== undefined && s.longitude !== null ? s.longitude : s.Longitude;
        const mapLink = (lat && lng)
          ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lat + ',' + lng)
          : '';

        let bhtml = '';
        bhtml += '<div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px;color:var(--text-muted);">';
        bhtml += '  🔒 <strong>Read-Only Historical Record:</strong> This broadcast has concluded. Its recorded coordinates and telemetry are strictly preserved.';
        bhtml += '</div>';

        bhtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Session ID</label>';
        bhtml += '    <div><code style="font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">' + _esc(s.liveId || s.LiveSessionID) + '</code></div>';
        bhtml += '  </div>';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Status & End Reason</label>';
        bhtml += '    <div style="font-size:13px;font-weight:600;"><span class="status-badge" style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:11px;">' + _esc(s.status || s.Status) + '</span> ' + (_esc(s.endReason || s.TerminationReason) ? '— ' + _esc(s.endReason || s.TerminationReason) : '') + '</div>';
        bhtml += '  </div>';
        bhtml += '</div>';

        bhtml += '<div style="margin-bottom:14px;">';
        bhtml += '  <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Broadcast Title & Topic</label>';
        bhtml += '  <div style="font-size:15px;font-weight:700;color:var(--text-main);">' + _esc(s.title || s.Title || "Untitled Live") + '</div>';
        bhtml += '  <div style="font-size:12px;color:var(--text-muted);">' + _esc(s.topic || s.Topic || "General") + ((s.description || s.Description) ? ' • ' + _esc(s.description || s.Description) : '') + '</div>';
        bhtml += '</div>';

        bhtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;">';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Broadcaster</label>';
        bhtml += '    <div style="font-weight:700;color:var(--text-main);">' + _esc(s.cameraPersonName || s.CameraPersonName || "Camera Person") + '</div>';
        bhtml += '    <div style="font-size:12px;color:var(--text-muted);">' + _esc(s.userId || s.CameraPersonID || "") + ((s.cameraPersonPhone || s.CameraPersonPhone) ? ' • ' + _esc(s.cameraPersonPhone || s.CameraPersonPhone) : '') + '</div>';
        bhtml += '  </div>';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">YouTube Channel</label>';
        bhtml += '    <div style="font-weight:700;color:var(--text-main);">' + _esc(s.channelTitle || s.ChannelTitle || "Corporate Channel") + '</div>';
        bhtml += '    <div style="font-size:11px;color:var(--text-muted);"><code style="font-size:11px;">' + _esc(s.channelId || s.YouTubeChannelID || "") + '</code></div>';
        bhtml += '  </div>';
        bhtml += '</div>';

        bhtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Broadcast Location (Preserved)</label>';
        bhtml += '    <div style="font-weight:600;font-size:13px;">📍 ' + _esc(s.locationDisplayName || s.LocationEventName || s.city || "—") + (s.state ? ', ' + _esc(s.state) : '') + '</div>';
        if (lat && lng) {
          bhtml += '    <div style="font-size:11px;margin-top:2px;"><a href="' + mapLink + '" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;">🌐 ' + _esc(lat) + ', ' + _esc(lng) + '</a></div>';
        }
        bhtml += '  </div>';
        bhtml += '  <div>';
        bhtml += '    <label style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Associated Event</label>';
        if (s.eventName || s.LocationEventName) {
          bhtml += '    <div style="font-weight:700;color:#2563eb;font-size:13px;">🎪 ' + _esc(s.eventName || s.LocationEventName) + '</div>';
          bhtml += '    <div style="font-size:11px;color:var(--text-muted);"><code style="font-size:10px;">' + _esc(s.locationEventId || s.LocationEventID || "") + '</code></div>';
        } else {
          bhtml += '    <div style="font-size:12px;color:#94a3b8;margin-top:4px;">No event associated</div>';
        }
        bhtml += '  </div>';
        bhtml += '</div>';

        const peak = s.peakViewers !== undefined ? s.peakViewers : (s.EkkaSampledPeak || 0);
        const likes = s.totalLikes !== undefined ? s.totalLikes : (s.TotalLikes || 0);
        const viewerSecs = s.totalViewerSeconds !== undefined ? s.totalViewerSeconds : (s.TotalViewerSeconds || 0);

        bhtml += '<div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:16px;background:#f1f5f9;padding:12px;border-radius:6px;text-align:center;">';
        bhtml += '  <div><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Duration</div><div style="font-size:14px;font-weight:700;">' + durStr + '</div></div>';
        bhtml += '  <div><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Peak Viewers</div><div style="font-size:14px;font-weight:700;">' + peak + '</div></div>';
        bhtml += '  <div><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Total Likes</div><div style="font-size:14px;font-weight:700;">' + likes + '</div></div>';
        bhtml += '  <div><div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Viewer Seconds</div><div style="font-size:14px;font-weight:700;">' + viewerSecs + 's</div></div>';
        bhtml += '</div>';

        const watch = s.youtubeWatchUrl || s.WatchUrl || "";
        if (watch) {
          bhtml += '<div style="text-align:center;padding:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;">';
          bhtml += '  <a href="' + _esc(watch) + '" target="_blank" rel="noopener noreferrer" class="module-btn module-btn-primary" style="text-decoration:none;display:inline-block;">▶ Watch Concluded Stream on YouTube</a>';
          bhtml += '</div>';
        }

        mBody.innerHTML = bhtml;

      } catch (e) {
        const mBody = document.getElementById("historicalModalBody");
        if (mBody) {
          mBody.innerHTML = '<div style="color:#b91c1c;padding:16px;background:#fee2e2;border-radius:6px;">⚠️ Error loading session details: ' + _esc(e.message) + '</div>';
        }
      }
    };

    window._openAssociateSessionModal = async function (liveId, streamTitle) {
      const session = AdminAuth.getSession();
      if (!session) return;

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:480px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>🎪 Associate Stream with Event</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Stream Title</label>';
      mhtml += '        <div style="font-weight:700;font-size:13px;color:var(--text-main);">' + _esc(streamTitle || liveId) + '</div>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:16px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">Select Live Event</label>';
      mhtml += '        <select id="assocEventSelect" class="module-input" style="width:100%;">';
      mhtml += '          <option value="">-- No Event / Disassociate --</option>';
      if (_currentLiveEvents && _currentLiveEvents.length > 0) {
        _currentLiveEvents.forEach(function (ev) {
          const eId = ev.eventId || ev.EventID || "";
          const eName = ev.eventName || ev.EventName || "";
          mhtml += '          <option value="' + _esc(eId) + '">' + _esc(eName) + ' (' + _esc(eId) + ')' + '</option>';
        });
      }
      mhtml += '        </select>';
      mhtml += '        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">Associating an event organizes historical sessions without altering broadcast lifecycle.</small>';
      mhtml += '      </div>';
      mhtml += '      <div id="assocModalError" style="display:none;color:#b91c1c;font-size:12px;margin-bottom:10px;"></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;">';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '      <button class="module-btn module-btn-primary" id="btnSubmitAssoc" onclick="window._submitAssociateSession(\'' + _esc(liveId) + '\')">Save Association</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);

      // If events weren't loaded yet, fetch in background and populate select
      if (!_currentLiveEvents || _currentLiveEvents.length === 0) {
        try {
          const url = getApiUrl() + "?action=adminliveevents&session=" + encodeURIComponent(session);
          const res = await fetch(url);
          const json = await res.json();
          if (json && json.success && json.data && json.data.events) {
            _currentLiveEvents = json.data.events;
            const sel = document.getElementById("assocEventSelect");
            if (sel) {
              let opts = '<option value="">-- No Event / Disassociate --</option>';
              _currentLiveEvents.forEach(function (ev) {
                const eId = ev.eventId || ev.EventID || "";
                const eName = ev.eventName || ev.EventName || "";
                opts += '<option value="' + _esc(eId) + '">' + _esc(eName) + ' (' + _esc(eId) + ')' + '</option>';
              });
              sel.innerHTML = opts;
            }
          }
        } catch (e) {}
      }
    };

    window._submitAssociateSession = async function (liveId) {
      const select = document.getElementById("assocEventSelect");
      const errBox = document.getElementById("assocModalError");
      const btn = document.getElementById("btnSubmitAssoc");
      const eventId = select ? select.value.trim() : "";

      const session = AdminAuth.getSession();
      if (!session) return;

      if (btn) btn.disabled = true;
      if (errBox) errBox.style.display = "none";

      try {
        const url = getApiUrl() + "?action=adminassociatesessionevent&session=" + encodeURIComponent(session) +
          "&liveId=" + encodeURIComponent(liveId) +
          "&eventId=" + encodeURIComponent(eventId);

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success) {
          if (typeof showToast === "function") showToast("Session event association updated!", "success");
          else alert("Session event association updated!");
          closeModal();
          loadAndRenderHistory();
        } else {
          if (errBox) {
            errBox.textContent = (json && json.message) || "Failed to update association";
            errBox.style.display = "block";
          } else {
            alert((json && json.message) || "Failed to update association");
          }
        }
      } catch (e) {
        if (errBox) {
          errBox.textContent = "Network error: " + e.message;
          errBox.style.display = "block";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    // --- Locations Handlers ---
    window._refreshLocationsTab = function () {
      loadAndRenderLocations();
    };

    window._searchLocations = function () {
      const input = document.getElementById("locationSearchInput");
      _locationSearchQuery = input ? input.value.trim() : "";
      renderLocationsCenter(container, _currentLiveLocations);
    };

    window._openLocationModal = function (locationEventId) {
      const isEdit = Boolean(locationEventId);
      let existing = null;
      if (isEdit && _currentLiveLocations) {
        existing = _currentLiveLocations.find(function (l) {
          return (l.locationEventId || l.LocationEventID) === locationEventId;
        });
      }

      const generatedId = existing ? (existing.locationEventId || existing.LocationEventID) : ("LOC-" + Math.floor(1000 + Math.random() * 9000));

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:540px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>' + (isEdit ? "✏️ Edit Live Location" : "➕ Add Reusable Live Location") + '</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:8px 12px;border-radius:4px;margin-bottom:14px;font-size:11px;color:var(--text-muted);">';
      mhtml += '        ℹ️ Creating or updating reusable locations sets coordinate benchmarks for broadcasts. Existing historical session coordinates are strictly preserved.';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Location ID</label>';
      mhtml += '        <input type="text" id="locIdInput" class="module-input" value="' + _esc(generatedId) + '" ' + (isEdit ? 'readonly style="background:#f1f5f9;"' : '') + ' style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Display Name *</label>';
      mhtml += '        <input type="text" id="locNameInput" class="module-input" placeholder="e.g. Rajwada Chowk Live Ground" value="' + _esc(existing && (existing.displayName || existing.DisplayName) || "") + '" style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
      mhtml += '        <div>';
      const curLat = existing ? (existing.latitude !== undefined ? existing.latitude : existing.Latitude) : "";
      const curLng = existing ? (existing.longitude !== undefined ? existing.longitude : existing.Longitude) : "";
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Latitude (GPS) *</label>';
      mhtml += '          <input type="number" step="any" id="locLatInput" class="module-input" placeholder="e.g. 20.9374" value="' + _esc(curLat !== undefined ? curLat : "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Longitude (GPS) *</label>';
      mhtml += '          <input type="number" step="any" id="locLngInput" class="module-input" placeholder="e.g. 77.7796" value="' + _esc(curLng !== undefined ? curLng : "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">City</label>';
      mhtml += '          <input type="text" id="locCityInput" class="module-input" placeholder="e.g. Amravati" value="' + _esc(existing && (existing.city || existing.City) || "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">State</label>';
      mhtml += '          <input type="text" id="locStateInput" class="module-input" placeholder="e.g. Maharashtra" value="' + _esc(existing && (existing.state || existing.State) || "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Category</label>';
      mhtml += '          <select id="locCatInput" class="module-input" style="width:100%;">';
      const cats = ["General", "Market", "Temple", "Festival", "Sports", "News", "Public Square", "Campus", "Other"];
      const curCat = (existing && (existing.category || existing.Category)) || "General";
      cats.forEach(function (c) {
        mhtml += '<option value="' + c + '" ' + (curCat === c ? 'selected' : '') + '>' + c + '</option>';
      });
      mhtml += '          </select>';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Status</label>';
      const curStatus = (existing && (existing.status || existing.Status)) || "Active";
      mhtml += '          <select id="locStatusInput" class="module-input" style="width:100%;">';
      mhtml += '            <option value="Active" ' + (curStatus === "Active" ? 'selected' : '') + '>Active</option>';
      mhtml += '            <option value="Inactive" ' + (curStatus === "Inactive" ? 'selected' : '') + '>Inactive</option>';
      mhtml += '          </select>';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div id="locModalError" style="display:none;color:#b91c1c;font-size:12px;margin-bottom:10px;"></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;">';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '      <button class="module-btn module-btn-primary" id="btnSubmitLocation" onclick="window._submitSaveLocation(' + (isEdit ? 'true' : 'false') + ')">' + (isEdit ? "Update Location" : "Save Location") + '</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);
    };

    window._submitSaveLocation = async function (isEdit) {
      const idInput = document.getElementById("locIdInput");
      const nameInput = document.getElementById("locNameInput");
      const latInput = document.getElementById("locLatInput");
      const lngInput = document.getElementById("locLngInput");
      const cityInput = document.getElementById("locCityInput");
      const stateInput = document.getElementById("locStateInput");
      const catInput = document.getElementById("locCatInput");
      const statusInput = document.getElementById("locStatusInput");
      const errBox = document.getElementById("locModalError");
      const btn = document.getElementById("btnSubmitLocation");

      const locId = idInput ? idInput.value.trim() : "";
      const displayName = nameInput ? nameInput.value.trim() : "";
      const lat = latInput ? latInput.value.trim() : "";
      const lng = lngInput ? lngInput.value.trim() : "";
      const city = cityInput ? cityInput.value.trim() : "";
      const state = stateInput ? stateInput.value.trim() : "";
      const category = catInput ? catInput.value.trim() : "General";
      const status = statusInput ? statusInput.value.trim() : "Active";

      if (!displayName) {
        if (errBox) { errBox.textContent = "Please enter a display name."; errBox.style.display = "block"; }
        return;
      }
      if (!lat || isNaN(parseFloat(lat))) {
        if (errBox) { errBox.textContent = "Please enter a valid GPS Latitude."; errBox.style.display = "block"; }
        return;
      }
      if (!lng || isNaN(parseFloat(lng))) {
        if (errBox) { errBox.textContent = "Please enter a valid GPS Longitude."; errBox.style.display = "block"; }
        return;
      }

      const session = AdminAuth.getSession();
      if (!session) return;

      if (btn) btn.disabled = true;
      if (errBox) errBox.style.display = "none";

      try {
        const url = getApiUrl() + "?action=adminsavelivelocation&session=" + encodeURIComponent(session) +
          "&locationEventId=" + encodeURIComponent(locId) +
          "&displayName=" + encodeURIComponent(displayName) +
          "&latitude=" + encodeURIComponent(lat) +
          "&longitude=" + encodeURIComponent(lng) +
          "&city=" + encodeURIComponent(city) +
          "&state=" + encodeURIComponent(state) +
          "&category=" + encodeURIComponent(category) +
          "&status=" + encodeURIComponent(status);

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success) {
          if (typeof showToast === "function") showToast("Location saved successfully!", "success");
          else alert("Location saved successfully!");
          closeModal();
          loadAndRenderLocations();
        } else {
          if (errBox) {
            errBox.textContent = (json && json.message) || "Failed to save location";
            errBox.style.display = "block";
          } else {
            alert((json && json.message) || "Failed to save location");
          }
        }
      } catch (e) {
        if (errBox) {
          errBox.textContent = "Network error: " + e.message;
          errBox.style.display = "block";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    window._toggleLocationStatus = async function (locationEventId, currentStatus) {
      const newStatus = String(currentStatus || "").toLowerCase() === "active" ? "Inactive" : "Active";
      const session = AdminAuth.getSession();
      if (!session) return;

      try {
        const url = getApiUrl() + "?action=admintogglelivelocationstatus&session=" + encodeURIComponent(session) +
          "&locationEventId=" + encodeURIComponent(locationEventId) +
          "&status=" + encodeURIComponent(newStatus);

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success) {
          if (typeof showToast === "function") showToast("Location status set to " + newStatus, "success");
          else alert("Location status set to " + newStatus);
          loadAndRenderLocations();
        } else {
          alert("Failed to update status: " + (json && json.message));
        }
      } catch (e) {
        alert("Error updating location status: " + e.message);
      }
    };

    // --- Events Handlers ---
    window._refreshEventsTab = function () {
      loadAndRenderEvents();
    };

    window._searchEvents = function () {
      const input = document.getElementById("eventSearchInput");
      _eventSearchQuery = input ? input.value.trim() : "";
      renderEventsCenter(container, _currentLiveEvents);
    };

    window._openEventModal = async function (eventId) {
      const isEdit = Boolean(eventId);
      let existing = null;
      if (isEdit && _currentLiveEvents) {
        existing = _currentLiveEvents.find(function (e) {
          return (e.eventId || e.EventID) === eventId;
        });
      }

      const generatedId = existing ? (existing.eventId || existing.EventID) : ("EVT-" + Math.floor(1000 + Math.random() * 9000));

      closeModal();

      let mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
      mhtml += '  <div class="modal-content" onclick="event.stopPropagation()" style="max-width:540px;">';
      mhtml += '    <div class="modal-header">';
      mhtml += '      <h3>' + (isEdit ? "✏️ Edit Live Event" : "➕ Create Live Event") + '</h3>';
      mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-body" style="padding:16px;">';
      mhtml += '      <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:8px 12px;border-radius:4px;margin-bottom:14px;font-size:11px;color:var(--text-muted);">';
      mhtml += '        ℹ️ Live sessions can exist with or without an event. Associating an event organizes sessions without modifying broadcaster lifecycle.';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Event ID</label>';
      mhtml += '        <input type="text" id="evtIdInput" class="module-input" value="' + _esc(generatedId) + '" ' + (isEdit ? 'readonly style="background:#f1f5f9;"' : '') + ' style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Event Name *</label>';
      mhtml += '        <input type="text" id="evtNameInput" class="module-input" placeholder="e.g. Amravati Diwali Mela 2026" value="' + _esc(existing && (existing.eventName || existing.EventName) || "") + '" style="width:100%;" />';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Description</label>';
      mhtml += '        <textarea id="evtDescInput" class="module-input" placeholder="Brief event description or theme..." style="width:100%;height:60px;resize:vertical;">' + _esc(existing && (existing.description || existing.Description) || "") + '</textarea>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:12px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Linked Location (Optional)</label>';
      mhtml += '        <select id="evtLocSelect" class="module-input" style="width:100%;">';
      mhtml += '          <option value="">-- No specific location linked --</option>';
      const curLocId = (existing && (existing.locationEventId || existing.LocationEventID)) || "";
      if (_currentLiveLocations && _currentLiveLocations.length > 0) {
        _currentLiveLocations.forEach(function (loc) {
          const lId = loc.locationEventId || loc.LocationEventID || "";
          const lName = loc.displayName || loc.DisplayName || "";
          const lCity = loc.city || loc.City || "—";
          mhtml += '<option value="' + _esc(lId) + '" ' + (curLocId === lId ? 'selected' : '') + '>' + _esc(lName) + ' (' + _esc(lCity) + ')</option>';
        });
      }
      mhtml += '        </select>';
      mhtml += '      </div>';
      mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
      mhtml += '        <div>';
      const curStart = existing ? (existing.startDate || existing.StartDate || "") : "";
      const curEnd = existing ? (existing.endDate || existing.EndDate || "") : "";
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Start Date</label>';
      mhtml += '          <input type="datetime-local" id="evtStartDate" class="module-input" value="' + _esc(curStart ? curStart.substring(0, 16) : "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '        <div>';
      mhtml += '          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">End Date</label>';
      mhtml += '          <input type="datetime-local" id="evtEndDate" class="module-input" value="' + _esc(curEnd ? curEnd.substring(0, 16) : "") + '" style="width:100%;" />';
      mhtml += '        </div>';
      mhtml += '      </div>';
      mhtml += '      <div style="margin-bottom:14px;">';
      mhtml += '        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Status</label>';
      const curEvtStatus = (existing && (existing.status || existing.Status)) || "Upcoming";
      mhtml += '        <select id="evtStatusSelect" class="module-input" style="width:100%;">';
      const evtStatuses = ["Upcoming", "Active", "Completed", "Cancelled"];
      evtStatuses.forEach(function (st) {
        mhtml += '<option value="' + st + '" ' + (curEvtStatus === st ? 'selected' : '') + '>' + st + '</option>';
      });
      mhtml += '        </select>';
      mhtml += '      </div>';
      mhtml += '      <div id="evtModalError" style="display:none;color:#b91c1c;font-size:12px;margin-bottom:10px;"></div>';
      mhtml += '    </div>';
      mhtml += '    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;">';
      mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
      mhtml += '      <button class="module-btn module-btn-primary" id="btnSubmitEvent" onclick="window._submitSaveEvent(' + (isEdit ? 'true' : 'false') + ')">' + (isEdit ? "Update Event" : "Create Event") + '</button>';
      mhtml += '    </div>';
      mhtml += '  </div>';
      mhtml += '</div>';

      document.body.insertAdjacentHTML("beforeend", mhtml);

      // If locations haven't been loaded yet, fetch in background and populate select
      if (!_currentLiveLocations || _currentLiveLocations.length === 0) {
        const session = AdminAuth.getSession();
        if (session) {
          try {
            const url = getApiUrl() + "?action=adminlivelocations&session=" + encodeURIComponent(session);
            const res = await fetch(url);
            const json = await res.json();
            if (json && json.success && json.data && json.data.locations) {
              _currentLiveLocations = json.data.locations;
              const sel = document.getElementById("evtLocSelect");
              if (sel) {
                let opts = '<option value="">-- No specific location linked --</option>';
                _currentLiveLocations.forEach(function (loc) {
                  const lId = loc.locationEventId || loc.LocationEventID || "";
                  const lName = loc.displayName || loc.DisplayName || "";
                  const lCity = loc.city || loc.City || "—";
                  opts += '<option value="' + _esc(lId) + '" ' + (curLocId === lId ? 'selected' : '') + '>' + _esc(lName) + ' (' + _esc(lCity) + ')</option>';
                });
                sel.innerHTML = opts;
              }
            }
          } catch (e) {}
        }
      }
    };

    window._submitSaveEvent = async function (isEdit) {
      const idInput = document.getElementById("evtIdInput");
      const nameInput = document.getElementById("evtNameInput");
      const descInput = document.getElementById("evtDescInput");
      const locSelect = document.getElementById("evtLocSelect");
      const startInput = document.getElementById("evtStartDate");
      const endInput = document.getElementById("evtEndDate");
      const statusSelect = document.getElementById("evtStatusSelect");
      const errBox = document.getElementById("evtModalError");
      const btn = document.getElementById("btnSubmitEvent");

      const eventId = idInput ? idInput.value.trim() : "";
      const eventName = nameInput ? nameInput.value.trim() : "";
      const description = descInput ? descInput.value.trim() : "";
      const locationEventId = locSelect ? locSelect.value.trim() : "";
      const startDate = startInput ? startInput.value.trim() : "";
      const endDate = endInput ? endInput.value.trim() : "";
      const status = statusSelect ? statusSelect.value.trim() : "Upcoming";

      if (!eventName) {
        if (errBox) { errBox.textContent = "Please enter an event name."; errBox.style.display = "block"; }
        return;
      }

      const session = AdminAuth.getSession();
      if (!session) return;

      if (btn) btn.disabled = true;
      if (errBox) errBox.style.display = "none";

      try {
        const url = getApiUrl() + "?action=adminsaveliveevent&session=" + encodeURIComponent(session) +
          "&eventId=" + encodeURIComponent(eventId) +
          "&eventName=" + encodeURIComponent(eventName) +
          "&description=" + encodeURIComponent(description) +
          "&locationEventId=" + encodeURIComponent(locationEventId) +
          "&startDate=" + encodeURIComponent(startDate) +
          "&endDate=" + encodeURIComponent(endDate) +
          "&status=" + encodeURIComponent(status);

        const res = await fetch(url);
        const json = await res.json();

        if (json && json.success) {
          if (typeof showToast === "function") showToast("Event saved successfully!", "success");
          else alert("Event saved successfully!");
          closeModal();
          loadAndRenderEvents();
        } else {
          if (errBox) {
            errBox.textContent = (json && json.message) || "Failed to save event";
            errBox.style.display = "block";
          } else {
            alert((json && json.message) || "Failed to save event");
          }
        }
      } catch (e) {
        if (errBox) {
          errBox.textContent = "Network error: " + e.message;
          errBox.style.display = "block";
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };

    // Attach OAuth window message listener once
    if (!_oauthListenerBound) {
      window.addEventListener("message", function (event) {
        if (event.data && event.data.type === "EKKA_YOUTUBE_OAUTH") {
          if (event.data.success) {
            const chTitle = event.data.channelTitle ? (" (" + event.data.channelTitle + ")") : "";
            if (typeof showToast === "function") {
              showToast("YouTube channel connected successfully" + chTitle, "success");
            } else {
              alert("YouTube channel connected successfully" + chTitle);
            }
            if (_currentLiveTab === "channels") {
              loadAndRenderChannels();
            }
          } else {
            if (typeof showToast === "function") {
              showToast(event.data.message || "YouTube authorization cancelled or failed", "error");
            } else {
              alert(event.data.message || "YouTube authorization cancelled or failed");
            }
          }
        }
      });
      _oauthListenerBound = true;
    }

    // Initial load based on active tab
    if (_currentLiveTab === "channels") {
      await loadAndRenderChannels();
    } else if (_currentLiveTab === "allocations") {
      await loadAndRenderAllocations();
    } else if (_currentLiveTab === "history") {
      await loadAndRenderHistory();
    } else if (_currentLiveTab === "locations") {
      await loadAndRenderLocations();
    } else if (_currentLiveTab === "events") {
      await loadAndRenderEvents();
    } else {
      await loadAndRender();
    }
  });

  console.log("Admin Live Monitoring & Moderation module loaded (Phase 5.8)");
})();

