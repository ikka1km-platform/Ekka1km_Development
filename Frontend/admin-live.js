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
  let _currentLiveTab = "streams"; // 'streams' | 'channels' | 'allocations'
  let _currentLiveStreams = [];
  let _currentChannels = [];
  let _currentAllocations = [];
  let _liveSearchQuery = "";
  let _liveStatusFilter = "";
  let _channelSearchQuery = "";
  let _allocationSearchQuery = "";
  let _activeLiveIdInModal = null;
  let _activeChatTab = "chat"; // 'chat' or 'moderators'
  let _oauthListenerBound = false;

  function _esc(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" }[c];
    });
  }

  function renderLiveNavTabs(activeTab) {
    let tabs = "";
    tabs += '<div class="live-nav-tabs" style="display:flex;gap:10px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;padding-bottom:8px;">';
    tabs += '  <button class="module-btn ' + (activeTab === "streams" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'streams\')">🔴 Live Streams</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "channels" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'channels\')">📺 YouTube Channels</button>';
    tabs += '  <button class="module-btn ' + (activeTab === "allocations" ? "module-btn-primary" : "module-btn-secondary") + '" style="border-radius:6px;font-weight:600;" onclick="window._switchLiveMainTab(\'allocations\')">👥 Broadcaster Allocations</button>';
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
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Live Monitoring Center...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminlivestreams&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
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

        renderMonitoringCenter(container, summary, _currentLiveStreams);

        // Resume timer if previously enabled by user
        if (_liveAutoRefreshEnabled) {
          _startLiveTimer();
        }

      } catch (err) {
        console.error("Live monitoring load error:", err);
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Error Loading Live Monitoring</h3><p>' + escapeHtml(err.message || String(err)) + '</p><button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Retry</button></div>';
      }
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
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading YouTube Channels...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminyoutubechannels&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
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
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
        return;
      }

      container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Broadcaster Allocations...</p></div>';

      try {
        const url = getApiUrl() + "?action=adminlistallocations&session=" + encodeURIComponent(session);
        const response = await fetch(url);
        const json = await response.json();

        if (!json || !json.success) {
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
    // GLOBAL HANDLERS FOR CHANNELS & ALLOCATIONS TABS
    // ============================================================

    window._switchLiveMainTab = function (tab) {
      _currentLiveTab = tab || "streams";
      if (_currentLiveTab === "streams") {
        loadAndRender();
      } else if (_currentLiveTab === "channels") {
        loadAndRenderChannels();
      } else if (_currentLiveTab === "allocations") {
        loadAndRenderAllocations();
      }
    };

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
    } else {
      await loadAndRender();
    }
  });

  console.log("Admin Live Monitoring & Moderation module loaded (Phase 5.8)");
})();

