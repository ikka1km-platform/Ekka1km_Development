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

        html += '<div class="module-filters" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
        html += '  <div class="module-search" style="flex:1;min-width:240px;">';
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
        html += '  <button class="module-btn module-btn-primary" style="background:#2e7d32;border-color:#2e7d32;color:#fff;font-weight:600;" onclick="window._annDirectAuthoriseModal()">+ Direct Authorise User</button>';
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

            // Actions column — Final Five-Icon Order: 1. View 👁️, 2. Edit ✏️, 3. Approve ✅, 4. Reject/Revoke ❌, 5. Delete 🗑️
            html += '        <td class="module-actions" style="white-space:nowrap;vertical-align:middle;">';

            // 1. View (Eye) — Enabled for all
            html += '          <button class="module-action-btn" onclick="window._annViewDetails(\'' + escapeHtml(aId) + '\')" title="View Announcer Details" aria-label="View Announcer Details">👁️</button>';

            // 2. Edit (Pencil) — Enabled for all
            html += '          <button class="module-action-btn" onclick="window._annEdit(\'' + escapeHtml(aId) + '\')" title="Edit Announcer Profile" aria-label="Edit Announcer Profile" style="color:var(--accent-cyan);">✏️</button>';

            // 3. Approve (Green Check) — Enabled for Pending, Rejected, Revoked, Suspended; Disabled for Active
            if (aStatus === "active") {
              html += '          <button class="module-action-btn module-action-btn-disabled" disabled aria-disabled="true" title="Approve (Disabled: Already Active)" aria-label="Approve (Disabled: Already Active)" style="opacity:0.38;cursor:not-allowed;pointer-events:none;">✅</button>';
            } else {
              var approveTip = (aStatus === "pending") ? "Approve Announcer" : "Re-activate / Approve Announcer";
              html += '          <button class="module-action-btn" onclick="window._annApprove(\'' + escapeHtml(aId) + '\')" title="' + escapeHtml(approveTip) + '" aria-label="' + escapeHtml(approveTip) + '" style="color:#4caf50;">✅</button>';
            }

            // 4. Reject / Revoke (Red X) — Enabled for Pending (Reject) & Active (Revoke); Disabled for Rejected, Revoked, Suspended
            if (aStatus === "pending") {
              html += '          <button class="module-action-btn" onclick="window._annReject(\'' + escapeHtml(aId) + '\', false)" title="Reject Application" aria-label="Reject Application" style="color:#f44336;">❌</button>';
            } else if (aStatus === "active") {
              html += '          <button class="module-action-btn" onclick="window._annReject(\'' + escapeHtml(aId) + '\', true)" title="Revoke Announcer Authorisation" aria-label="Revoke Announcer Authorisation" style="color:#f44336;">❌</button>';
            } else {
              var rejectTip = (aStatus === "rejected") ? "Reject (Disabled: Already Rejected)" : "Revoke (Disabled: Already Inactive)";
              html += '          <button class="module-action-btn module-action-btn-disabled" disabled aria-disabled="true" title="' + escapeHtml(rejectTip) + '" aria-label="' + escapeHtml(rejectTip) + '" style="opacity:0.38;cursor:not-allowed;pointer-events:none;">❌</button>';
            }

            // 5. Delete (Trash) — Enabled for all
            html += '          <button class="module-action-btn module-action-danger" onclick="window._annDelete(\'' + escapeHtml(aId) + '\')" title="Delete Announcer Record" aria-label="Delete Announcer Record">🗑️</button>';

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

  // ============================================================
  // ANNOUNCER ACTION 1: EDIT (Interactive Form)
  // ============================================================
  window._annEdit = function(announcerId) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    if (!a) {
      showToast("Announcer record not found", "error");
      return;
    }

    var isAuto = String(a.AutoPublish || "").trim().toLowerCase() === "true" ||
                 String(a.AutoPublish || "").trim().toLowerCase() === "yes" ||
                 String(a.AutoPublish || "").trim().toLowerCase() === "1";
    var aStatus = String(a.Status || "Pending").toLowerCase();

    var authorityTypes = [
      "Municipal Corporation",
      "Nagar Palika",
      "Government Department",
      "Police",
      "Education Authority",
      "Health Authority",
      "Utility / Service",
      "Business / Store",
      "Platform Authority",
      "Society / Association",
      "Other"
    ];

    var radiusOptions = ["1", "5", "10", "25", "51", "100", "All India"];

    var formHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:var(--text-muted);">Announcer ID</label>';
    formHtml += '  <input type="text" class="module-input" value="' + escapeHtml(a.AnnouncerID || "") + '" disabled style="opacity:0.75;" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:var(--text-muted);">Linked User ID</label>';
    formHtml += '  <input type="text" class="module-input" value="' + escapeHtml(a.UserID || "") + '" disabled style="opacity:0.75;" /></div>';

    formHtml += '  <div style="grid-column:1/-1;"><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Department / Authority Name *</label>';
    formHtml += '  <input type="text" id="editAnnDept" class="module-input" value="' + escapeHtml(a.DepartmentName || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Designation</label>';
    formHtml += '  <input type="text" id="editAnnDesig" class="module-input" value="' + escapeHtml(a.Designation || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Authority Type</label>';
    formHtml += '  <select id="editAnnAuthType" class="module-select" style="width:100%;">';
    for (var i = 0; i < authorityTypes.length; i++) {
      var at = authorityTypes[i];
      formHtml += '    <option value="' + escapeHtml(at) + '"' + (String(a.AuthorityType || "").toLowerCase() === at.toLowerCase() ? " selected" : "") + '>' + escapeHtml(at) + '</option>';
    }
    formHtml += '  </select></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">City *</label>';
    formHtml += '  <input type="text" id="editAnnCity" class="module-input" value="' + escapeHtml(a.City || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">District</label>';
    formHtml += '  <input type="text" id="editAnnDistrict" class="module-input" value="' + escapeHtml(a.District || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">State</label>';
    formHtml += '  <input type="text" id="editAnnState" class="module-input" value="' + escapeHtml(a.State || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Office Address</label>';
    formHtml += '  <input type="text" id="editAnnAddress" class="module-input" value="' + escapeHtml(a.Address || "") + '" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Latitude</label>';
    formHtml += '  <input type="text" id="editAnnLat" class="module-input" value="' + escapeHtml(a.Latitude || "") + '" placeholder="e.g. 22.7196" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Longitude</label>';
    formHtml += '  <input type="text" id="editAnnLng" class="module-input" value="' + escapeHtml(a.Longitude || "") + '" placeholder="e.g. 75.8577" /></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Maximum Jurisdiction Radius</label>';
    formHtml += '  <select id="editAnnRadius" class="module-select" style="width:100%;">';
    for (var r = 0; r < radiusOptions.length; r++) {
      var rad = radiusOptions[r];
      var isRadSel = String(a.MaxRadius || "").toLowerCase() === rad.toLowerCase();
      formHtml += '    <option value="' + escapeHtml(rad) + '"' + (isRadSel ? " selected" : "") + '>' + escapeHtml(rad === "All India" ? rad : rad + " KM") + '</option>';
    }
    formHtml += '  </select></div>';

    formHtml += '  <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">⚡ Auto-Publish Permission</label>';
    formHtml += '  <select id="editAnnAutoPublish" class="module-select" style="width:100%;">';
    formHtml += '    <option value="true"' + (isAuto ? " selected" : "") + '>⚡ ON (Instant Publishing)</option>';
    formHtml += '    <option value="false"' + (!isAuto ? " selected" : "") + '>⏳ OFF (Moderation Required)</option>';
    formHtml += '  </select></div>';

    formHtml += '  <div style="grid-column:1/-1;"><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Admin Notes</label>';
    formHtml += '  <input type="text" id="editAnnNotes" class="module-input" value="' + escapeHtml(a.AdminNotes || "") + '" placeholder="Notes / Authorization reference..." /></div>';

    formHtml += '</div>';

    var footerActions = '<button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
    if (aStatus === "active") {
      footerActions = '<button class="module-btn module-btn-secondary" style="border-color:#f44336;color:#f44336;margin-right:auto;" onclick="window._annReject(\'' + escapeHtml(a.AnnouncerID) + '\', true)">🚫 Revoke Authorisation</button>' + footerActions;
    }
    footerActions += '<button class="module-btn module-btn-primary" onclick="window._annSubmitEdit(\'' + escapeHtml(a.AnnouncerID) + '\')">💾 Save Changes</button>';

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>✏️ Edit Announcer: ' + escapeHtml(a.DepartmentName || a.AnnouncerID) + '</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    mhtml += formHtml;
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += footerActions;
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  // ============================================================
  // ANNOUNCER ACTION: VIEW DETAILS (Read-only Modal)
  // ============================================================
  window._annViewDetails = function(announcerId) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    if (!a) {
      showToast("Announcer details not found", "error");
      return;
    }

    var isAuto = String(a.AutoPublish || "").trim().toLowerCase() === "true" ||
                 String(a.AutoPublish || "").trim().toLowerCase() === "yes" ||
                 String(a.AutoPublish || "").trim().toLowerCase() === "1";
    var aStatus = String(a.Status || "Pending").toLowerCase();

    var body = '<div class="profile-grid">';
    body += '  <div class="profile-section-header">📢 Official Announcer Profile</div>';
    body += '  <div class="profile-field"><label>Announcer ID</label><span class="module-id">' + escapeHtml(a.AnnouncerID || "") + '</span></div>';
    body += '  <div class="profile-field"><label>Linked User ID</label><span class="module-id">' + escapeHtml(a.UserID || "") + '</span></div>';
    body += '  <div class="profile-field"><label>Department Name</label><span>' + escapeHtml(a.DepartmentName || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Designation</label><span>' + escapeHtml(a.Designation || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Authority Type</label><span>' + escapeHtml(a.AuthorityType || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Jurisdiction</label><span>' + escapeHtml(a.City || "") + (a.District ? ", " + escapeHtml(a.District) : "") + (a.State ? ", " + escapeHtml(a.State) : "") + '</span></div>';
    body += '  <div class="profile-field"><label>Office Address</label><span>' + escapeHtml(a.Address || "N/A") + '</span></div>';
    body += '  <div class="profile-field"><label>Coordinates</label><span>' + (a.Latitude && a.Longitude ? escapeHtml(a.Latitude) + ", " + escapeHtml(a.Longitude) : "Not Set") + '</span></div>';
    body += '  <div class="profile-field"><label>Allowed Radius</label><span>' + escapeHtml(String(a.MaxRadius || "N/A")) + (String(a.MaxRadius || "").toLowerCase() === "all india" ? "" : " KM") + '</span></div>';
    body += '  <div class="profile-field"><label>Status</label><span class="status-badge status-' + aStatus + '">' + escapeHtml(a.Status || "Pending") + '</span></div>';
    body += '  <div class="profile-field"><label>Auto-Publish Permission</label><span>' + (isAuto ? '⚡ <strong style="color:#4caf50;">ON (Instant Publish)</strong>' : '⏳ <strong style="color:#ff9800;">OFF (Moderation Required)</strong>') + '</span></div>';
    body += '  <div class="profile-field"><label>Requested Date</label><span>' + escapeHtml(formatDate(a.RequestedDate || a.CreatedDate || "")) + '</span></div>';
    if (a.VerifiedBy) body += '  <div class="profile-field"><label>Verified By</label><span>' + escapeHtml(a.VerifiedBy) + ' (' + escapeHtml(formatDate(a.VerifiedDate)) + ')</span></div>';
    if (a.AdminNotes) body += '  <div class="profile-field" style="grid-column:1/-1;"><label>Admin Notes</label><span>' + escapeHtml(a.AdminNotes) + '</span></div>';
    if (a.ProofDocument) {
      body += '  <div class="profile-field" style="grid-column:1/-1;"><label>Proof Document</label><span><a href="' + escapeHtml(a.ProofDocument) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);text-decoration:underline;">📄 View Uploaded Proof</a></span></div>';
    }
    body += '</div>';

    var footerActions = '<button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    footerActions += '<button class="module-btn module-btn-primary" onclick="closeModal(); window._annEdit(\'' + escapeHtml(a.AnnouncerID) + '\')">✏️ Edit Details</button>';

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>📢 Announcer Details: ' + escapeHtml(a.DepartmentName || a.AnnouncerID) + '</h3>';
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

  window._annSubmitEdit = async function(announcerId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    var dept = (document.getElementById("editAnnDept") ? document.getElementById("editAnnDept").value : "").trim();
    var city = (document.getElementById("editAnnCity") ? document.getElementById("editAnnCity").value : "").trim();

    if (!dept) { alert("Department Name is required"); return; }
    if (!city) { alert("City is required"); return; }

    var desig = (document.getElementById("editAnnDesig") ? document.getElementById("editAnnDesig").value : "").trim();
    var authType = document.getElementById("editAnnAuthType") ? document.getElementById("editAnnAuthType").value : "";
    var district = (document.getElementById("editAnnDistrict") ? document.getElementById("editAnnDistrict").value : "").trim();
    var state = (document.getElementById("editAnnState") ? document.getElementById("editAnnState").value : "").trim();
    var address = (document.getElementById("editAnnAddress") ? document.getElementById("editAnnAddress").value : "").trim();
    var lat = (document.getElementById("editAnnLat") ? document.getElementById("editAnnLat").value : "").trim();
    var lng = (document.getElementById("editAnnLng") ? document.getElementById("editAnnLng").value : "").trim();
    var radius = document.getElementById("editAnnRadius") ? document.getElementById("editAnnRadius").value : "25";
    var autoPub = document.getElementById("editAnnAutoPublish") ? document.getElementById("editAnnAutoPublish").value : "false";
    var notes = (document.getElementById("editAnnNotes") ? document.getElementById("editAnnNotes").value : "").trim();

    try {
      var url = getApiUrl() + "?action=adminupdateannouncer&session=" + encodeURIComponent(session)
        + "&announcerId=" + encodeURIComponent(announcerId)
        + "&departmentName=" + encodeURIComponent(dept)
        + "&designation=" + encodeURIComponent(desig)
        + "&authorityType=" + encodeURIComponent(authType)
        + "&city=" + encodeURIComponent(city)
        + "&district=" + encodeURIComponent(district)
        + "&state=" + encodeURIComponent(state)
        + "&address=" + encodeURIComponent(address)
        + "&latitude=" + encodeURIComponent(lat)
        + "&longitude=" + encodeURIComponent(lng)
        + "&maxRadius=" + encodeURIComponent(radius)
        + "&autoPublish=" + encodeURIComponent(autoPub)
        + "&adminNotes=" + encodeURIComponent(notes);

      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " updated successfully", "success");
        closeModal();
        render();
      } else {
        showToast((json && json.message) || "Failed to update announcer", "error");
      }
    } catch (err) {
      showToast("Error updating announcer: " + err.message, "error");
    }
  };


  // ============================================================
  // ANNOUNCER ACTION 2: APPROVE (Activate with Auto-Publish choice)
  // ============================================================
  window._annApprove = function(announcerId) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    if (!a) {
      showToast("Announcer record not found", "error");
      return;
    }

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-md" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>✅ Approve Official Announcer</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    mhtml += '      <p style="font-size:13px;margin-bottom:14px;">Activate official posting privileges for this applicant:</p>';
    mhtml += '      <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:8px;font-size:12px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.08);">';
    mhtml += '        <div><strong>Announcer ID:</strong> <span class="module-id">' + escapeHtml(a.AnnouncerID || "") + '</span></div>';
    mhtml += '        <div><strong>Department:</strong> ' + escapeHtml(a.DepartmentName || "N/A") + '</div>';
    mhtml += '        <div><strong>User ID:</strong> ' + escapeHtml(a.UserID || "") + '</div>';
    mhtml += '        <div><strong>Jurisdiction:</strong> ' + escapeHtml(a.City || "") + (a.State ? ", " + escapeHtml(a.State) : "") + ' (' + escapeHtml(String(a.MaxRadius || "25")) + ')</div>';
    mhtml += '      </div>';
    mhtml += '      <div style="margin-bottom:12px;">';
    mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;">Auto-Publish Permission</label>';
    mhtml += '        <select id="approveAnnAutoPublish" class="module-select" style="width:100%;">';
    mhtml += '          <option value="false" selected>⏳ OFF — Moderation Required (Default)</option>';
    mhtml += '          <option value="true">⚡ ON — Instant Publishing (Bypass moderation queue)</option>';
    mhtml += '        </select>';
    mhtml += '      </div>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
    mhtml += '      <button class="module-btn module-btn-primary" style="background:#2e7d32;" onclick="window._annSubmitApprove(\'' + escapeHtml(a.AnnouncerID) + '\')">✅ Confirm & Activate</button>';
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  window._annSubmitApprove = async function(announcerId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    var autoPub = document.getElementById("approveAnnAutoPublish") ? document.getElementById("approveAnnAutoPublish").value : "false";

    try {
      var url = getApiUrl() + "?action=adminverifyannouncer&session=" + encodeURIComponent(session)
        + "&announcerId=" + encodeURIComponent(announcerId)
        + "&autoPublish=" + encodeURIComponent(autoPub);

      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " verified and activated successfully!", "success");
        closeModal();
        render();
      } else {
        showToast((json && json.message) || "Failed to activate announcer", "error");
      }
    } catch (err) {
      showToast("Error verifying announcer: " + err.message, "error");
    }
  };


  // ============================================================
  // ANNOUNCER ACTION 3: REJECT / REVOKE (with Reason)
  // ============================================================
  window._annReject = function(announcerId, isRevoking) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    if (!a) {
      showToast("Announcer record not found", "error");
      return;
    }

    var isRevoke = !!isRevoking || (String(a.Status || "").toLowerCase() === "active");

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-md" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>' + (isRevoke ? "🚫 Revoke Announcer Authorisation" : "❌ Reject Announcer Application") + '</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    if (isRevoke) {
      mhtml += '      <div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3);padding:10px;border-radius:8px;font-size:12px;color:#f44336;margin-bottom:12px;">';
      mhtml += '        ⚠️ <strong>Notice:</strong> This will revoke active posting privileges for this announcer. Historical announcements and the user account will remain intact.';
      mhtml += '      </div>';
    }
    mhtml += '      <p style="font-size:13px;margin-bottom:12px;">Announcer ID: <strong>' + escapeHtml(a.AnnouncerID || "") + '</strong> (' + escapeHtml(a.DepartmentName || "N/A") + ')</p>';
    mhtml += '      <div>';
    mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Rejection / Revocation Reason *</label>';
    mhtml += '        <textarea id="annRejectReasonInput" class="module-input" placeholder="State the reason for this decision..." style="width:100%;height:80px;"></textarea>';
    mhtml += '      </div>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
    mhtml += '      <button class="module-btn module-btn-danger" onclick="window._annSubmitReject(\'' + escapeHtml(a.AnnouncerID) + '\')">' + (isRevoke ? "🚫 Confirm Revocation" : "❌ Confirm Rejection") + '</button>';
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  window._annSubmitReject = async function(announcerId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    var reasonInput = document.getElementById("annRejectReasonInput");
    var reason = reasonInput ? reasonInput.value.trim() : "";
    if (!reason) {
      alert("A reason is required to reject/revoke an announcer.");
      return;
    }

    try {
      var url = getApiUrl() + "?action=adminrejectannouncer&session=" + encodeURIComponent(session)
        + "&announcerId=" + encodeURIComponent(announcerId)
        + "&reason=" + encodeURIComponent(reason);

      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success) {
        showToast("Announcer status updated successfully", "success");
        closeModal();
        render();
      } else {
        showToast((json && json.message) || "Failed to reject announcer", "error");
      }
    } catch (err) {
      showToast("Error rejecting announcer: " + err.message, "error");
    }
  };


  // ============================================================
  // ANNOUNCER ACTION 4: DELETE (Permanent deletion with strong confirm)
  // ============================================================
  window._annDelete = async function(announcerId) {
    var a = announcersList.find(function(x) { return x.AnnouncerID === announcerId; }) || null;
    var userId = a ? a.UserID : "N/A";
    var dept = a ? a.DepartmentName : "N/A";

    var confirmed = confirm("⚠️ PERMANENT ANNOUNCER RECORD DELETION\n\n" +
      "Are you sure you want to permanently delete Announcer Record:\n" +
      "• Announcer ID: " + announcerId + "\n" +
      "• Linked User ID: " + userId + "\n" +
      "• Department: " + dept + "\n\n" +
      "This will ONLY delete the Announcer profile. The user's account, wallet, businesses, and all other user data will remain completely untouched.\n\n" +
      "Click OK to permanently delete this announcer record.");

    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var url = getApiUrl() + "?action=admindeleteannouncer&session=" + encodeURIComponent(session)
        + "&announcerId=" + encodeURIComponent(announcerId);

      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " permanently deleted", "success");
        render();
      } else {
        showToast((json && json.message) || "Failed to delete announcer", "error");
      }
    } catch (err) {
      showToast("Error deleting announcer: " + err.message, "error");
    }
  };


  // ============================================================
  // DIRECT USER AUTHORISATION MODAL (+ Direct Authorise User)
  // ============================================================
  window._annDirectAuthoriseModal = function() {
    var authorityTypes = [
      "Municipal Corporation",
      "Nagar Palika",
      "Government Department",
      "Police",
      "Education Authority",
      "Health Authority",
      "Utility / Service",
      "Business / Store",
      "Platform Authority",
      "Society / Association",
      "Other"
    ];

    var radiusOptions = ["1", "5", "10", "25", "51", "100", "All India"];

    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>📢 Direct Authorise Official Announcer</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';

    // Step 1: User ID Lookup
    mhtml += '      <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);margin-bottom:14px;">';
    mhtml += '        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;">Step 1: Enter User ID *</label>';
    mhtml += '        <div style="display:flex;gap:8px;">';
    mhtml += '          <input type="text" id="directAuthUserId" class="module-input" placeholder="e.g. U20260804134234" style="flex:1;" onkeyup="if(event.key===\'Enter\'){ window._annVerifyUserLookup(); }" />';
    mhtml += '          <button type="button" class="module-btn module-btn-primary" onclick="window._annVerifyUserLookup()">🔍 Lookup User</button>';
    mhtml += '        </div>';
    mhtml += '        <div id="directAuthUserPreview" style="display:none;margin-top:12px;"></div>';
    mhtml += '      </div>';

    // Step 2: Announcer Details Form (revealed once user is confirmed)
    mhtml += '      <div id="directAuthFormFields" style="display:none;">';
    mhtml += '        <h4 style="margin:0 0 10px;font-size:13px;color:var(--text-muted);border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;">Step 2: Announcer Official Details & Jurisdiction</h4>';
    mhtml += '        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">';

    mhtml += '          <div style="grid-column:1/-1;"><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Department / Authority / Business Name *</label>';
    mhtml += '          <input type="text" id="directAuthDept" class="module-input" placeholder="e.g. Md Shopping Rajgarh / Municipal Council" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Designation</label>';
    mhtml += '          <input type="text" id="directAuthDesig" class="module-input" placeholder="e.g. Official Publisher / Director" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Authority Type</label>';
    mhtml += '          <select id="directAuthAuthType" class="module-select" style="width:100%;">';
    for (var i = 0; i < authorityTypes.length; i++) {
      mhtml += '            <option value="' + escapeHtml(authorityTypes[i]) + '">' + escapeHtml(authorityTypes[i]) + '</option>';
    }
    mhtml += '          </select></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">City *</label>';
    mhtml += '          <input type="text" id="directAuthCity" class="module-input" placeholder="City" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">District</label>';
    mhtml += '          <input type="text" id="directAuthDistrict" class="module-input" placeholder="District" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">State</label>';
    mhtml += '          <input type="text" id="directAuthState" class="module-input" placeholder="State" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Office Address</label>';
    mhtml += '          <input type="text" id="directAuthAddress" class="module-input" placeholder="Office / Store Address" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Latitude</label>';
    mhtml += '          <input type="text" id="directAuthLat" class="module-input" placeholder="e.g. 22.6770" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Longitude</label>';
    mhtml += '          <input type="text" id="directAuthLng" class="module-input" placeholder="e.g. 74.9469" /></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Maximum Jurisdiction Radius</label>';
    mhtml += '          <select id="directAuthRadius" class="module-select" style="width:100%;">';
    for (var r = 0; r < radiusOptions.length; r++) {
      mhtml += '            <option value="' + escapeHtml(radiusOptions[r]) + '"' + (radiusOptions[r] === "25" ? " selected" : "") + '>' + escapeHtml(radiusOptions[r] === "All India" ? radiusOptions[r] : radiusOptions[r] + " KM") + '</option>';
    }
    mhtml += '          </select></div>';

    mhtml += '          <div><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Auto-Publish Permission</label>';
    mhtml += '          <select id="directAuthAutoPublish" class="module-select" style="width:100%;">';
    mhtml += '            <option value="false">⏳ OFF — Moderation Required</option>';
    mhtml += '            <option value="true">⚡ ON — Instant Publishing</option>';
    mhtml += '          </select></div>';

    mhtml += '          <div style="grid-column:1/-1;"><label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;">Admin Notes</label>';
    mhtml += '          <input type="text" id="directAuthNotes" class="module-input" placeholder="Internal authorization note..." /></div>';

    mhtml += '        </div>';
    mhtml += '      </div>';

    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Cancel</button>';
    mhtml += '      <button id="directAuthSubmitBtn" class="module-btn module-btn-primary" style="display:none;background:#2e7d32;" onclick="window._annSubmitDirectAuthorise()">✅ Authorise & Activate Announcer</button>';
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    closeModal();
    document.body.insertAdjacentHTML("beforeend", mhtml);
  };

  window._annVerifyUserLookup = async function() {
    var session = AdminAuth.getSession();
    if (!session) return;

    var userIdInput = document.getElementById("directAuthUserId");
    var userId = userIdInput ? userIdInput.value.trim() : "";
    if (!userId) {
      alert("Please enter a User ID to lookup.");
      return;
    }

    var previewDiv = document.getElementById("directAuthUserPreview");
    var formFieldsDiv = document.getElementById("directAuthFormFields");
    var submitBtn = document.getElementById("directAuthSubmitBtn");

    previewDiv.style.display = "block";
    previewDiv.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Searching user...</span>';

    try {
      var url = getApiUrl() + "?action=adminusers&session=" + encodeURIComponent(session) + "&search=" + encodeURIComponent(userId);
      var res = await fetch(url);
      var json = await res.json();

      var users = (json && json.data && json.data.data) || [];
      var matchedUser = null;
      for (var i = 0; i < users.length; i++) {
        if (String(users[i].UserID || "").toLowerCase() === userId.toLowerCase()) {
          matchedUser = users[i];
          break;
        }
      }

      if (!matchedUser && users.length > 0) {
        matchedUser = users[0];
      }

      if (!matchedUser) {
        previewDiv.innerHTML = '<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3);padding:10px;border-radius:8px;font-size:12px;color:#f44336;">❌ User not found with ID: ' + escapeHtml(userId) + '. Please verify the User ID.</div>';
        formFieldsDiv.style.display = "none";
        submitBtn.style.display = "none";
        return;
      }

      // Check existing announcer status
      var existingAnnouncer = announcersList.find(function(a) {
        return String(a.UserID || "").toLowerCase() === String(matchedUser.UserID || "").toLowerCase();
      }) || null;

      var annStatusNotice = "";
      var allowSubmit = true;

      if (existingAnnouncer) {
        var existingStatus = String(existingAnnouncer.Status || "").toLowerCase();
        if (existingStatus === "active") {
          annStatusNotice = '<div style="margin-top:8px;background:rgba(244,67,54,0.1);color:#f44336;padding:8px;border-radius:6px;font-size:12px;">⚠️ User already has an ACTIVE Announcer profile (' + escapeHtml(existingAnnouncer.AnnouncerID) + ' - ' + escapeHtml(existingAnnouncer.DepartmentName || "") + '). You can edit their existing profile directly from the table.</div>';
          allowSubmit = false;
        } else if (existingStatus === "pending") {
          annStatusNotice = '<div style="margin-top:8px;background:rgba(255,152,0,0.1);color:#ff9800;padding:8px;border-radius:6px;font-size:12px;">ℹ️ User has a PENDING application (' + escapeHtml(existingAnnouncer.AnnouncerID) + '). Direct authorisation will activate and link to this record.</div>';
        }
      }

      var uhtml = '<div style="background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.25);padding:10px;border-radius:8px;font-size:12px;">';
      uhtml += '  <div style="font-weight:600;font-size:13px;color:#4caf50;">✓ User Verified: ' + escapeHtml(matchedUser.FullName || "User") + '</div>';
      uhtml += '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;color:var(--text-muted);font-size:11px;">';
      uhtml += '    <div>User ID: <span class="module-id">' + escapeHtml(matchedUser.UserID || "") + '</span></div>';
      uhtml += '    <div>Mobile: ' + escapeHtml(matchedUser.Mobile || "N/A") + '</div>';
      uhtml += '    <div>Email: ' + escapeHtml(matchedUser.Email || "N/A") + '</div>';
      uhtml += '    <div>City: ' + escapeHtml(matchedUser.City || "N/A") + '</div>';
      uhtml += '  </div>';
      uhtml += annStatusNotice;
      uhtml += '</div>';

      previewDiv.innerHTML = uhtml;

      if (allowSubmit) {
        formFieldsDiv.style.display = "block";
        submitBtn.style.display = "inline-block";

        // Pre-populate City and State from user
        if (matchedUser.City && document.getElementById("directAuthCity") && !document.getElementById("directAuthCity").value) {
          document.getElementById("directAuthCity").value = matchedUser.City;
        }
        if (matchedUser.State && document.getElementById("directAuthState") && !document.getElementById("directAuthState").value) {
          document.getElementById("directAuthState").value = matchedUser.State;
        }
        if (existingAnnouncer) {
          if (existingAnnouncer.DepartmentName && document.getElementById("directAuthDept")) {
            document.getElementById("directAuthDept").value = existingAnnouncer.DepartmentName;
          }
          if (existingAnnouncer.Designation && document.getElementById("directAuthDesig")) {
            document.getElementById("directAuthDesig").value = existingAnnouncer.Designation;
          }
        }
      } else {
        formFieldsDiv.style.display = "none";
        submitBtn.style.display = "none";
      }

    } catch (err) {
      previewDiv.innerHTML = '<span style="font-size:12px;color:#f44336;">Error verifying user: ' + escapeHtml(err.message) + '</span>';
      formFieldsDiv.style.display = "none";
      submitBtn.style.display = "none";
    }
  };

  window._annSubmitDirectAuthorise = async function() {
    var session = AdminAuth.getSession();
    if (!session) return;

    var userId = (document.getElementById("directAuthUserId") ? document.getElementById("directAuthUserId").value : "").trim();
    var dept = (document.getElementById("directAuthDept") ? document.getElementById("directAuthDept").value : "").trim();
    var city = (document.getElementById("directAuthCity") ? document.getElementById("directAuthCity").value : "").trim();

    if (!userId) { alert("User ID is required"); return; }
    if (!dept) { alert("Department / Authority Name is required"); return; }
    if (!city) { alert("City is required"); return; }

    var desig = (document.getElementById("directAuthDesig") ? document.getElementById("directAuthDesig").value : "").trim();
    var authType = document.getElementById("directAuthAuthType") ? document.getElementById("directAuthAuthType").value : "";
    var district = (document.getElementById("directAuthDistrict") ? document.getElementById("directAuthDistrict").value : "").trim();
    var state = (document.getElementById("directAuthState") ? document.getElementById("directAuthState").value : "").trim();
    var address = (document.getElementById("directAuthAddress") ? document.getElementById("directAuthAddress").value : "").trim();
    var lat = (document.getElementById("directAuthLat") ? document.getElementById("directAuthLat").value : "").trim();
    var lng = (document.getElementById("directAuthLng") ? document.getElementById("directAuthLng").value : "").trim();
    var radius = document.getElementById("directAuthRadius") ? document.getElementById("directAuthRadius").value : "25";
    var autoPub = document.getElementById("directAuthAutoPublish") ? document.getElementById("directAuthAutoPublish").value : "false";
    var notes = (document.getElementById("directAuthNotes") ? document.getElementById("directAuthNotes").value : "").trim();

    try {
      var url = getApiUrl() + "?action=admincreateannouncer&session=" + encodeURIComponent(session)
        + "&userId=" + encodeURIComponent(userId)
        + "&departmentName=" + encodeURIComponent(dept)
        + "&designation=" + encodeURIComponent(desig)
        + "&authorityType=" + encodeURIComponent(authType)
        + "&city=" + encodeURIComponent(city)
        + "&district=" + encodeURIComponent(district)
        + "&state=" + encodeURIComponent(state)
        + "&address=" + encodeURIComponent(address)
        + "&latitude=" + encodeURIComponent(lat)
        + "&longitude=" + encodeURIComponent(lng)
        + "&maxRadius=" + encodeURIComponent(radius)
        + "&autoPublish=" + encodeURIComponent(autoPub)
        + "&adminNotes=" + encodeURIComponent(notes);

      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success) {
        showToast("User " + userId + " successfully authorised as Official Announcer!", "success");
        closeModal();
        render();
      } else {
        showToast((json && json.message) || "Failed to authorise announcer", "error");
      }
    } catch (err) {
      showToast("Error authorising announcer: " + err.message, "error");
    }
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
