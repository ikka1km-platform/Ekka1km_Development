/*
============================================================
TOGGLE ANNOUNCER AUTO-PUBLISH (Admin Browser Handler)
Exposed both as top-level function and on window for all execution contexts
============================================================
*/
async function adminToggleAutoPublish(announcerId, targetVal) {
  var isEnabling = (String(targetVal).trim().toLowerCase() === "true" || targetVal === true);
  var autoPublishParam = isEnabling ? "true" : "false";
  var confirmMsg = (isEnabling ? "Enable Auto-Publish for announcer " : "Disable Auto-Publish for announcer ") + announcerId + "?\n\n" +
    (isEnabling 
      ? "✓ Valid announcements will be published LIVE immediately upon submission without pending moderation review." 
      : "✓ Future announcements from this announcer will require admin approval in the Moderation Queue.");

  if (!confirm(confirmMsg)) {
    console.log("[AutoPublish] Operation cancelled by admin user.");
    return { cancelled: true };
  }

  var session = typeof AdminAuth !== "undefined" && AdminAuth.getSession ? AdminAuth.getSession() : null;
  if (!session) {
    console.error("[AutoPublish] Admin session is missing or expired.");
    if (typeof showToast === "function") showToast("Session expired. Please login again.", "error");
    return { success: false, message: "Session expired" };
  }

  try {
    var url = getApiUrl() + "?action=admintoggleautopublish" +
      "&session=" + encodeURIComponent(session) +
      "&announcerId=" + encodeURIComponent(announcerId) +
      "&autoPublish=" + encodeURIComponent(autoPublishParam);

    var safeLoggedUrl = url.replace(/session=[^&]+/, "session=[REDACTED]");
    console.log("[AutoPublish] Sending request to:", safeLoggedUrl);

    var response = await fetch(url);
    console.log("[AutoPublish] HTTP Status:", response.status, response.statusText);

    var text = await response.text();
    console.log("[AutoPublish] Raw Response Body:", text);

    var json = null;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error("[AutoPublish] JSON Parse Error. Response was not valid JSON:", parseErr);
      if (typeof showToast === "function") showToast("Server returned invalid response format", "error");
      return { success: false, raw: text, error: parseErr.message };
    }

    console.log("[AutoPublish] Parsed Backend Response:", json);

    if (json && json.success) {
      if (typeof showToast === "function") showToast(json.message || "Auto-Publish setting updated successfully", "success");
      // Trigger live re-render if active in Admin module
      if (typeof window._modRefresh === "function") {
        window._modRefresh();
      }
    } else {
      if (typeof showToast === "function") showToast(json && json.message || "Failed to update Auto-Publish setting", "error");
    }
    return json;
  } catch (err) {
    console.error("[AutoPublish] Fetch/Network Error:", err);
    if (typeof showToast === "function") showToast("Connection error: " + err.message, "error");
    return { success: false, error: err.message };
  }
}

window.adminToggleAutoPublish = adminToggleAutoPublish;
window._toggleAnnouncerAutoPublish = adminToggleAutoPublish;


async function renderAdminModerationModule(container) {

  var currentData = [];
  var currentStatus = "Pending";
  var annData = {};
  var activeTab = window._adminModActiveTab || "queue";
  var announcersList = [];
  var announcerSearch = "";
  var announcerStatusFilter = "";


  /*
  ============================================================
  FETCH ANNOUNCER BY ID
  ============================================================
  */

  async function fetchAnnouncer(announcerId) {
    if (!announcerId || annData[announcerId]) return annData[announcerId] || null;
    var session = AdminAuth.getSession();
    if (!session) return null;
    try {
      var response = await fetch(getApiUrl() + "?action=getannouncerbyid&announcerId=" + encodeURIComponent(announcerId) + "&session=" + encodeURIComponent(session));
      var json = await response.json();
      if (json && json.success && json.data) {
        annData[announcerId] = json.data;
        return json.data;
      }
    } catch (e) { /* ignore */ }
    return null;
  }


  /*
  ============================================================
  FETCH ALL ANNOUNCERS
  ============================================================
  */

  async function fetchAllAnnouncers() {
    var session = AdminAuth.getSession();
    if (!session) return [];
    try {
      var response = await fetch(getApiUrl() + "?action=getallannouncers&session=" + encodeURIComponent(session));
      var json = await response.json();
      if (json && json.success && json.data && json.data.data) {
        return json.data.data;
      }
    } catch (e) { /* ignore */ }
    return [];
  }


  /*
  ============================================================
  FETCH ANNOUNCEMENT BY ID
  ============================================================
  */

  async function fetchAnnouncement(contentId) {
    var session = AdminAuth.getSession();
    if (!session) return null;
    try {
      var response = await fetch(getApiUrl() + "?action=announcement&id=" + encodeURIComponent(contentId) + "&session=" + encodeURIComponent(session));
      var json = await response.json();
      if (json && json.success && json.data) {
        return json.data;
      }
    } catch (e) { /* ignore */ }
    return null;
  }


  /*
  ============================================================
  FORMAT DATE
  ============================================================
  */

  function formatDate(val) {
    if (!val) return "N/A";
    try {
      var d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return val;
    }
  }


  /*
  ============================================================
  RENDER
  ============================================================
  */

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading announcements & moderation...</p></div>';

    try {
      // Header with tabs
      var html = "";
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📢 Announcements & Moderation Control Center</h2>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Sub-Tabs
      html += '<div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">';
      html += '  <button class="module-btn ' + (activeTab === "queue" ? "module-btn-primary" : "module-btn-secondary") + '" onclick="window._modSwitchTab(\'queue\')">🛡️ Moderation Queue</button>';
      html += '  <button class="module-btn ' + (activeTab === "announcers" ? "module-btn-primary" : "module-btn-secondary") + '" onclick="window._modSwitchTab(\'announcers\')">📢 Official Announcers & Auto-Publish</button>';
      html += '</div>';

      if (activeTab === "announcers") {
        // ============================================================
        // TAB 2: OFFICIAL ANNOUNCERS & AUTO-PUBLISH CONTROLS
        // ============================================================
        announcersList = await fetchAllAnnouncers();

        var filteredAnnouncers = announcersList.filter(function(a) {
          if (announcerStatusFilter && String(a.Status || "").toLowerCase() !== announcerStatusFilter.toLowerCase()) {
            return false;
          }
          if (announcerSearch) {
            var s = announcerSearch.toLowerCase();
            var matches = String(a.AnnouncerID || "").toLowerCase().includes(s) ||
                          String(a.DepartmentName || "").toLowerCase().includes(s) ||
                          String(a.Designation || "").toLowerCase().includes(s) ||
                          String(a.City || "").toLowerCase().includes(s) ||
                          String(a.UserID || "").toLowerCase().includes(s);
            if (!matches) return false;
          }
          return true;
        });

        html += '<div class="module-filters">';
        html += '  <div class="module-search">';
        html += '    <input type="text" id="annSearchInput" class="module-input" placeholder="Search Announcer ID, Department, City, User..." value="' + escapeHtml(announcerSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._annSearch(); }" />';
        html += '    <button class="module-btn module-btn-primary" onclick="window._annSearch()">🔍 Search</button>';
        html += '  </div>';
        html += '  <select class="module-select" id="annStatusFilter" onchange="window._annStatusChange(this.value)">';
        html += '    <option value="">All Announcers</option>';
        html += '    <option value="Active"' + (announcerStatusFilter === "Active" ? " selected" : "") + '>Active</option>';
        html += '    <option value="Pending"' + (announcerStatusFilter === "Pending" ? " selected" : "") + '>Pending</option>';
        html += '    <option value="Suspended"' + (announcerStatusFilter === "Suspended" ? " selected" : "") + '>Suspended</option>';
        html += '    <option value="Revoked"' + (announcerStatusFilter === "Revoked" ? " selected" : "") + '>Revoked</option>';
        html += '  </select>';
        html += '  <button class="module-btn module-btn-secondary" onclick="window._modRefresh()">🔄 Refresh</button>';
        html += '</div>';

        html += '<div style="margin-bottom:14px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:12px;color:var(--text-muted);">';
        html += '  💡 <strong>Per-Announcer Auto-Publish:</strong> When Auto-Publish is <strong style="color:#4caf50;">ON</strong> for an approved active announcer, their valid announcements publish immediately without entering pending moderation. When <strong style="color:#ff9800;">OFF</strong>, announcements follow standard moderation review.';
        html += '</div>';

        html += '<div class="module-table-container">';
        html += '  <table class="module-table">';
        html += '    <thead><tr>';
        html += '      <th>Announcer ID</th><th>Department / Authority</th><th>Jurisdiction</th><th>Max Radius</th><th>Status</th><th>Auto-Publish Permission</th><th>Actions</th>';
        html += '    </tr></thead>';
        html += '    <tbody>';

        if (filteredAnnouncers.length === 0) {
          html += '      <tr><td colspan="7" class="module-empty">No announcers found</td></tr>';
        } else {
          for (var i = 0; i < filteredAnnouncers.length; i++) {
            var a = filteredAnnouncers[i];
            var aStatus = String(a.Status || "Pending").toLowerCase();
            var aId = a.AnnouncerID || "";
            var isAutoPub = String(a.AutoPublish || "").trim().toLowerCase() === "true" ||
                            String(a.AutoPublish || "").trim().toLowerCase() === "yes" ||
                            String(a.AutoPublish || "").trim().toLowerCase() === "1";

            html += '      <tr>';
            html += '        <td><span class="module-id">' + escapeHtml(aId) + '</span></td>';
            html += '        <td><strong>' + escapeHtml(a.DepartmentName || "N/A") + '</strong>' + (a.Designation ? '<br><span style="font-size:11px;color:var(--text-muted);">' + escapeHtml(a.Designation) + '</span>' : '') + '</td>';
            html += '        <td>' + escapeHtml(a.City || "") + (a.State ? ", " + escapeHtml(a.State) : "") + '</td>';
            html += '        <td>' + escapeHtml(String(a.MaxRadius || "N/A")) + (String(a.MaxRadius || "").toLowerCase() === "all india" ? "" : " KM") + '</td>';
            html += '        <td><span class="status-badge status-' + aStatus + '">' + escapeHtml(a.Status || "Pending") + '</span></td>';

            // Auto-Publish column
            html += '        <td>';
            if (aStatus === "active") {
              if (isAutoPub) {
                html += '          <button class="module-btn module-btn-primary" style="background:#2e7d32;border-color:#2e7d32;color:#fff;font-weight:600;padding:5px 12px;font-size:12px;" onclick="window.adminToggleAutoPublish(\'' + escapeHtml(aId) + '\', \'false\')" title="Click to turn Auto-Publish OFF">⚡ ON</button>';
              } else {
                html += '          <button class="module-btn module-btn-secondary" style="border-color:#ff9800;color:#ff9800;font-weight:600;padding:5px 12px;font-size:12px;" onclick="window.adminToggleAutoPublish(\'' + escapeHtml(aId) + '\', \'true\')" title="Click to turn Auto-Publish ON">⏳ OFF</button>';
              }
            } else {
              html += '          <span style="color:var(--text-muted);font-size:11px;">Disabled (' + escapeHtml(a.Status || "Inactive") + ')</span>';
            }
            html += '        </td>';

            // Actions column
            html += '        <td class="module-actions">';
            html += '          <button class="module-action-btn" onclick="window._annViewDetails(\'' + escapeHtml(aId) + '\')" title="View Announcer Profile">👁️ Details</button>';
            html += '        </td>';
            html += '      </tr>';
          }
        }

        html += '    </tbody>';
        html += '  </table>';
        html += '</div>';

      } else {
        // ============================================================
        // TAB 1: MODERATION QUEUE
        // ============================================================
        var url = getApiUrl() + "?action=getmoderationqueue&session=" + encodeURIComponent(session);
        if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);

        var response = await fetch(url);
        var json = await response.json();

        if (!json || !json.success) {
          container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Moderation Queue</h3><p>' + (json && json.message || "Unknown error") + '</p></div>';
          return;
        }

        currentData = json.data.data || [];

        // For Announcement records, fetch their full data
        var announcementsMap = {};
        var announcerIds = [];
        for (var i = 0; i < currentData.length; i++) {
          var item = currentData[i];
          if (String(item.ContentType || "").toLowerCase() === "announcement" && item.ContentID) {
            var ann = await fetchAnnouncement(item.ContentID);
            if (ann) {
              announcementsMap[item.ContentID] = ann;
              if (ann.AnnouncerID && !annData[ann.AnnouncerID]) {
                announcerIds.push(ann.AnnouncerID);
              }
            }
          }
        }

        // Batch fetch announcers
        for (var a = 0; a < announcerIds.length; a++) {
          await fetchAnnouncer(announcerIds[a]);
        }

        html += '<div class="module-filters">';
        html += '  <div class="module-search">';
        html += '    <input type="text" id="modSearch" class="module-input" placeholder="Search Queue ID, Content ID, User..." onkeyup="if(event.key===\'Enter\'){ window._modSearch(); }" />';
        html += '    <button class="module-btn module-btn-primary" onclick="window._modSearch()">🔍 Search</button>';
        html += '  </div>';
        html += '  <select class="module-select" id="modStatusFilter" onchange="window._modStatusChange(this.value)">';
        html += '    <option value="Pending"' + (currentStatus === "Pending" ? " selected" : "") + '>Pending</option>';
        html += '    <option value="Approved"' + (currentStatus === "Approved" ? " selected" : "") + '>Approved</option>';
        html += '    <option value="Rejected"' + (currentStatus === "Rejected" ? " selected" : "") + '>Rejected</option>';
        html += '    <option value="Flagged"' + (currentStatus === "Flagged" ? " selected" : "") + '>Flagged</option>';
        html += '    <option value="">All Status</option>';
        html += '  </select>';
        html += '  <button class="module-btn module-btn-secondary" onclick="window._modRefresh()">🔄 Refresh</button>';
        html += '</div>';

        html += '<div class="module-table-container">';
        html += '  <table class="module-table">';
        html += '    <thead><tr>';
        html += '      <th>Queue ID</th><th>Type</th><th>Content ID</th><th>User</th><th>Reason</th><th>Submitted</th><th>Status</th><th>Actions</th>';
        html += '    </tr></thead>';
        html += '    <tbody>';

        if (currentData.length === 0) {
          html += '      <tr><td colspan="8" class="module-empty">No moderation items found</td></tr>';
        } else {
          for (var i = 0; i < currentData.length; i++) {
            var item = currentData[i];
            var sClass = (item.Status || "Pending").toLowerCase();
            var ann = announcementsMap[item.ContentID] || null;

            html += '      <tr style="cursor:pointer;" onclick="window._modView(\'' + escapeHtml(item.QueueID || "") + '\')">';
            html += '        <td><span class="module-id">' + escapeHtml(item.QueueID || "") + '</span></td>';
            html += '        <td><span class="status-badge status-' + String(item.ContentType || "").toLowerCase() + '">' + escapeHtml(item.ContentType || "") + '</span></td>';
            html += '        <td><span class="module-id">' + escapeHtml(item.ContentID || "") + '</span></td>';
            html += '        <td>' + escapeHtml(item.UserID || "") + '</td>';
            html += '        <td>' + escapeHtml(item.Reason || "") + '</td>';
            html += '        <td>' + escapeHtml(formatDate(item.CreatedDate || "")) + '</td>';
            html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(item.Status || "Pending") + '</span></td>';
            html += '        <td class="module-actions" onclick="event.stopPropagation()">';
            
            if (String(item.Status || "").toLowerCase() === "pending") {
              html += '          <button class="module-action-btn" onclick="event.stopPropagation(); window._modApprove(\'' + escapeHtml(item.QueueID || "") + '\')" title="Approve" style="color:#4caf88">✅</button>';
              html += '          <button class="module-action-btn module-action-danger" onclick="event.stopPropagation(); window._modReject(\'' + escapeHtml(item.QueueID || "") + '\')" title="Reject">❌</button>';
            } else {
              html += '          <button class="module-action-btn" onclick="event.stopPropagation(); window._modView(\'' + escapeHtml(item.QueueID || "") + '\')" title="View Details">👁️</button>';
            }
            
            html += '        </td>';
            html += '      </tr>';

            // If announcement data available, show enrichment row
            if (ann) {
              var announcer = ann.AnnouncerID ? (annData[ann.AnnouncerID] || null) : null;
              html += '      <tr class="mod-enrichment-row">';
              html += '        <td colspan="8" class="mod-enrichment-cell">';
              html += '          <div class="mod-enrichment">';
              html += '            <div class="mod-enrichment-grid">';
              html += '              <div class="mod-enrichment-field"><label>Title</label><span>' + escapeHtml(ann.Title || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Description</label><span>' + escapeHtml((ann.Description || "").substring(0, 100)) + (ann.Description && ann.Description.length > 100 ? "..." : "") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Category</label><span>' + escapeHtml(ann.Category || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Priority</label><span>' + escapeHtml(ann.Priority || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>City</label><span>' + escapeHtml(ann.City || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Radius</label><span>' + escapeHtml(String(ann.Radius || "N/A")) + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Announcer ID</label><span>' + escapeHtml(ann.AnnouncerID || "N/A") + '</span></div>';

              if (announcer) {
                var annIsAuto = String(announcer.AutoPublish || "").trim().toLowerCase() === "true" || String(announcer.AutoPublish || "").trim().toLowerCase() === "yes";
                html += '              <div class="mod-enrichment-field"><label>Department</label><span>' + escapeHtml(announcer.DepartmentName || "N/A") + '</span></div>';
                html += '              <div class="mod-enrichment-field"><label>Designation</label><span>' + escapeHtml(announcer.Designation || "N/A") + '</span></div>';
                html += '              <div class="mod-enrichment-field"><label>Auto-Publish Setting</label><span>' + (annIsAuto ? '⚡ ON' : '⏳ OFF') + '</span></div>';
              }

              html += '            </div>';
              html += '          </div>';
              html += '        </td>';
              html += '      </tr>';
            }
          }
        }

        html += '    </tbody>';
        html += '  </table>';
        html += '</div>';
      }

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }


  /*
  ============================================================
  UPDATE MODERATION STATUS
  Shared by Approve and Reject
  ============================================================
  */

  async function updateModeration(queueId, status) {
    var session = AdminAuth.getSession();
    if (!session) return { success: false, message: "No active session" };

    try {
      var response = await fetch(getApiUrl() + "?action=updatemoderation&queueId=" + encodeURIComponent(queueId) + "&status=" + encodeURIComponent(status) + "&session=" + encodeURIComponent(session));
      var json = await response.json();
      return json || { success: false, message: "No response" };
    } catch (err) {
      return { success: false, message: "Connection error: " + err.message };
    }
  }


  /*
  ============================================================
  WINDOW HELPERS
  ============================================================
  */

  window._modSwitchTab = function(tabName) {
    activeTab = tabName;
    window._adminModActiveTab = tabName;
    render();
  };

  window._annSearch = function() {
    var input = document.getElementById("annSearchInput");
    announcerSearch = input ? input.value.trim() : "";
    render();
  };

  window._annStatusChange = function(val) {
    announcerStatusFilter = val || "";
    render();
  };

  window._annViewDetails = function(announcerId) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    if (!a) {
      showToast("Announcer details not found", "error");
      return;
    }

    var isAuto = String(a.AutoPublish || "").trim().toLowerCase() === "true" || String(a.AutoPublish || "").trim().toLowerCase() === "yes";
    var aStatus = String(a.Status || "").toLowerCase();

    var body = '<div class="profile-grid">';
    body += '  <div class="profile-section-header">📢 Official Announcer Profile</div>';
    body += '  <div class="profile-field"><label>Announcer ID</label><span class="module-id">' + escapeHtml(a.AnnouncerID || "") + '</span></div>';
    body += '  <div class="profile-field"><label>User ID</label><span>' + escapeHtml(a.UserID || "") + '</span></div>';
    body += '  <div class="profile-field"><label>Department Name</label><span>' + escapeHtml(a.DepartmentName || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Designation</label><span>' + escapeHtml(a.Designation || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Authority Type</label><span>' + escapeHtml(a.AuthorityType || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Jurisdiction</label><span>' + escapeHtml(a.City || "") + (a.District ? ", " + escapeHtml(a.District) : "") + (a.State ? ", " + escapeHtml(a.State) : "") + '</span></div>';
    body += '  <div class="profile-field"><label>Allowed Radius</label><span>' + escapeHtml(String(a.MaxRadius || "N/A")) + (String(a.MaxRadius || "").toLowerCase() === "all india" ? "" : " KM") + '</span></div>';
    body += '  <div class="profile-field"><label>Status</label><span class="status-badge status-' + aStatus + '">' + escapeHtml(a.Status || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Auto-Publish Mode</label><span>' + (isAuto ? '⚡ <strong style="color:#4caf50;">ON (Instant Publish)</strong>' : '⏳ <strong style="color:#ff9800;">OFF (Moderation Required)</strong>') + '</span></div>';
    body += '  <div class="profile-field"><label>Requested Date</label><span>' + escapeHtml(formatDate(a.RequestedDate || "")) + '</span></div>';
    if (a.VerifiedBy) body += '  <div class="profile-field"><label>Verified By</label><span>' + escapeHtml(a.VerifiedBy) + ' (' + escapeHtml(formatDate(a.VerifiedDate)) + ')</span></div>';
    body += '</div>';

    var footerActions = '<button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    if (aStatus === "active") {
      if (isAuto) {
        footerActions = '<button class="module-btn module-btn-secondary" style="border-color:#ff9800;color:#ff9800;" onclick="closeModal(); window.adminToggleAutoPublish(\'' + escapeHtml(a.AnnouncerID) + '\', \'false\')">Turn Auto-Publish OFF</button>' + footerActions;
      } else {
        footerActions = '<button class="module-btn module-btn-primary" style="background:#2e7d32;" onclick="closeModal(); window.adminToggleAutoPublish(\'' + escapeHtml(a.AnnouncerID) + '\', \'true\')">⚡ Turn Auto-Publish ON</button>' + footerActions;
      }
    }

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>📢 Announcer: ' + escapeHtml(a.DepartmentName || a.AnnouncerID) + '</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    mhtml += body;
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += footerActions;
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  window._modSearch = function() {
    render();
  };

  window._modStatusChange = function(value) {
    currentStatus = value;
    render();
  };

  window._modRefresh = function() {
    render();
  };

  window._modView = async function(queueId) {
    var item = currentData.find(function(x) { return x.QueueID === queueId; }) || null;
    if (!item) {
      showToast("Item not found", "error");
      return;
    }

    var ann = null;
    if (String(item.ContentType || "").toLowerCase() === "announcement" && item.ContentID) {
      ann = await fetchAnnouncement(item.ContentID);
    }

    var announcer = null;
    if (ann && ann.AnnouncerID) {
      announcer = await fetchAnnouncer(ann.AnnouncerID);
    }

    var body = "";
    body += '<div class="profile-grid">';
    
    // Moderation Information Section
    body += '  <div class="profile-section-header">📋 Moderation Information</div>';
    body += '  <div class="profile-field"><label>Queue ID</label><span>' + escapeHtml(item.QueueID || "") + '</span></div>';
    body += '  <div class="profile-field"><label>Status</label><span>' + escapeHtml(item.Status || "Pending") + '</span></div>';
    body += '  <div class="profile-field"><label>Reason</label><span>' + escapeHtml(item.Reason || "") + '</span></div>';
    body += '  <div class="profile-field"><label>Submitted Date</label><span>' + escapeHtml(formatDate(item.CreatedDate || "")) + '</span></div>';
    body += '  <div class="profile-field"><label>User ID</label><span>' + escapeHtml(item.UserID || "") + '</span></div>';

    if (ann) {
      // Announcement Information Section
      body += '  <div class="profile-section-header">📢 Announcement Information</div>';
      body += '  <div class="profile-field"><label>Announcement ID</label><span>' + escapeHtml(ann.AnnouncementID || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Title</label><span>' + escapeHtml(ann.Title || "N/A") + '</span></div>';
      body += '  <div class="profile-field full-width"><label>Description</label><span>' + escapeHtml(ann.Description || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Category</label><span>' + escapeHtml(ann.Category || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Priority</label><span>' + escapeHtml(ann.Priority || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Address</label><span>' + escapeHtml(ann.Address || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>City</label><span>' + escapeHtml(ann.City || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>District</label><span>' + escapeHtml(ann.District || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>State</label><span>' + escapeHtml(ann.State || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Country</label><span>' + escapeHtml(ann.Country || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Latitude</label><span>' + escapeHtml(String(ann.Latitude || "N/A")) + '</span></div>';
      body += '  <div class="profile-field"><label>Longitude</label><span>' + escapeHtml(String(ann.Longitude || "N/A")) + '</span></div>';
      body += '  <div class="profile-field"><label>Radius</label><span>' + escapeHtml(String(ann.Radius || "N/A")) + '</span></div>';
      body += '  <div class="profile-field"><label>Start Date</label><span>' + escapeHtml(formatDate(ann.StartDate || "")) + '</span></div>';
      body += '  <div class="profile-field"><label>End Date</label><span>' + escapeHtml(formatDate(ann.EndDate || "")) + '</span></div>';
      body += '  <div class="profile-field"><label>Status</label><span>' + escapeHtml(ann.Status || "N/A") + '</span></div>';
      body += '  <div class="profile-field"><label>Created Date</label><span>' + escapeHtml(formatDate(ann.CreatedDate || "")) + '</span></div>';
      body += '  <div class="profile-field"><label>Updated Date</label><span>' + escapeHtml(formatDate(ann.UpdatedDate || "")) + '</span></div>';

      if (announcer) {
        var annIsAuto = String(announcer.AutoPublish || "").trim().toLowerCase() === "true" || String(announcer.AutoPublish || "").trim().toLowerCase() === "yes";
        // Verified Announcer Information Section
        body += '  <div class="profile-section-header">✅ Verified Announcer Information</div>';
        body += '  <div class="profile-field"><label>Announcer ID</label><span>' + escapeHtml(announcer.AnnouncerID || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Department Name</label><span>' + escapeHtml(announcer.DepartmentName || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Designation</label><span>' + escapeHtml(announcer.Designation || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Authority Type</label><span>' + escapeHtml(announcer.AuthorityType || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Address</label><span>' + escapeHtml(announcer.Address || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>City</label><span>' + escapeHtml(announcer.City || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Max Radius</label><span>' + escapeHtml(String(announcer.MaxRadius || "N/A")) + '</span></div>';
        body += '  <div class="profile-field"><label>Announcer Status</label><span>' + escapeHtml(announcer.Status || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Auto-Publish Permission</label><span>' + (annIsAuto ? '⚡ <strong style="color:#4caf50;">ON</strong>' : '⏳ <strong style="color:#ff9800;">OFF</strong>') + '</span></div>';
      }
    }

    body += '</div>';

    // Add action buttons for Pending items
    var footerActions = "";
    if (String(item.Status || "").toLowerCase() === "pending") {
      footerActions = '<button class="module-btn module-btn-primary" onclick="window._modApproveFromModal(\'' + escapeHtml(item.QueueID || "") + '\')">✅ Approve</button>' +
        '<button class="module-btn module-btn-danger" onclick="window._modRejectFromModal(\'' + escapeHtml(item.QueueID || "") + '\')">❌ Reject</button>' +
        '<button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    } else {
      footerActions = '<button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    }

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>🛡️ Moderation Item Details</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    mhtml += body;
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += footerActions;
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  window._modApprove = async function(queueId) {
    if (!confirm("Approve this moderation item? This will activate the content if applicable.")) return;

    var result = await updateModeration(queueId, "Approved");
    if (result && result.success) {
      showToast("Item approved successfully", "success");
      closeModal();
      render();
    } else {
      showToast(result && result.message || "Failed to approve", "error");
    }
  };

  window._modReject = async function(queueId) {
    if (!confirm("Reject this moderation item? This will prevent it from becoming public.")) return;

    var result = await updateModeration(queueId, "Rejected");
    if (result && result.success) {
      showToast("Item rejected", "success");
      closeModal();
      render();
    } else {
      showToast(result && result.message || "Failed to reject", "error");
    }
  };

  window._modApproveFromModal = async function(queueId) {
    if (!confirm("Approve this moderation item? This will activate the content if applicable.")) return;

    var result = await updateModeration(queueId, "Approved");
    if (result && result.success) {
      showToast("Item approved successfully", "success");
      closeModal();
      render();
    } else {
      showToast(result && result.message || "Failed to approve", "error");
    }
  };

  window._modRejectFromModal = async function(queueId) {
    if (!confirm("Reject this moderation item? This will prevent it from becoming public.")) return;

    var result = await updateModeration(queueId, "Rejected");
    if (result && result.success) {
      showToast("Item rejected", "success");
      closeModal();
      render();
    } else {
      showToast(result && result.message || "Failed to reject", "error");
    }
  };


  /*
  ============================================================
  INIT
  ============================================================
  */

  await render();
}

// Register for both "moderation" and "announcements" module keys
AdminModules.register("moderation", renderAdminModerationModule);
AdminModules.register("announcements", renderAdminModerationModule);

console.log("Admin Announcements & Moderation module loaded (Phase 5.7D / V5.13.0)");