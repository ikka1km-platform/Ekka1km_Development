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
  let _currentLiveStreams = [];
  let _liveSearchQuery = "";
  let _liveStatusFilter = "";
  let _activeLiveIdInModal = null;
  let _activeChatTab = "chat"; // 'chat' or 'moderators'

  AdminModules.register("live", async function (container) {

    // Clean up any previous auto-refresh interval
    if (_liveAutoRefreshTimer) {
      clearInterval(_liveAutoRefreshTimer);
      _liveAutoRefreshTimer = null;
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
      html += '      <input type="checkbox" id="liveAutoRefreshCheck" ' + (_liveAutoRefreshTimer ? 'checked' : '') + ' onchange="window._toggleLiveAutoRefresh(this.checked)" /> Auto-Refresh (20s)';
      html += '    </label>';
      html += '    <button class="module-btn module-btn-primary" onclick="window._refreshLiveMonitoring()">🔄 Refresh</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="window._openCreateLiveModal()">➕ New Stream</button>';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Dashboard</button>';
      html += '  </div>';
      html += '</div>';

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
      if (_liveAutoRefreshTimer) {
        clearInterval(_liveAutoRefreshTimer);
        _liveAutoRefreshTimer = null;
      }
      if (enabled) {
        _liveAutoRefreshTimer = setInterval(function () {
          // If modal is open, refresh chat; otherwise reload table
          if (_activeLiveIdInModal) {
            window._refreshModalChat();
          } else {
            loadAndRender();
          }
        }, 20000);
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

    // Initial load
    await loadAndRender();
  });

  console.log("Admin Live Monitoring & Moderation module loaded (Phase 5.8)");
})();
