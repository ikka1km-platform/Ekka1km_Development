/*
============================================================
EKKA1KM FRONTEND
admin-moderation.js
V5.12.0 - ADMIN MODERATION MODULE (Phase 5.7D)
Content moderation queue with Approve/Reject workflow
============================================================
*/


AdminModules.register("moderation", async function(container) {

  var currentData = [];
  var currentStatus = "Pending";
  var annData = {};


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
  FETCH ANNOUNCEMENT BY ID
  ============================================================
  */

  async function fetchAnnouncement(contentId) {
    var session = AdminAuth.getSession();
    if (!session) return null;
    try {
      var response = await fetch(getApiUrl() + "?action=announcement&announcementId=" + encodeURIComponent(contentId) + "&session=" + encodeURIComponent(session));
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

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading moderation queue...</p></div>';

    try {
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

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">🛡️ Content Moderation</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' items</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

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
            html += '              <div class="mod-enrichment-field"><label>District</label><span>' + escapeHtml(ann.District || "N/A") + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>State</label><span>' + escapeHtml(ann.State || "N/A") + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>Radius</label><span>' + escapeHtml(String(ann.Radius || "N/A")) + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>Start Date</label><span>' + escapeHtml(formatDate(ann.StartDate || "")) + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>End Date</label><span>' + escapeHtml(formatDate(ann.EndDate || "")) + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>User ID</label><span>' + escapeHtml(ann.UserID || "N/A") + '</span></div>';
            html += '              <div class="mod-enrichment-field"><label>Announcer ID</label><span>' + escapeHtml(ann.AnnouncerID || "N/A") + '</span></div>';

            if (announcer) {
              html += '              <div class="mod-enrichment-field"><label>Department</label><span>' + escapeHtml(announcer.DepartmentName || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Designation</label><span>' + escapeHtml(announcer.Designation || "N/A") + '</span></div>';
              html += '              <div class="mod-enrichment-field"><label>Authority Type</label><span>' + escapeHtml(announcer.AuthorityType || "N/A") + '</span></div>';
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
        // Verified Announcer Information Section
        body += '  <div class="profile-section-header">✅ Verified Announcer Information</div>';
        body += '  <div class="profile-field"><label>Announcer ID</label><span>' + escapeHtml(announcer.AnnouncerID || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Department Name</label><span>' + escapeHtml(announcer.DepartmentName || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Designation</label><span>' + escapeHtml(announcer.Designation || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Authority Type</label><span>' + escapeHtml(announcer.AuthorityType || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Address</label><span>' + escapeHtml(announcer.Address || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>City</label><span>' + escapeHtml(announcer.City || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>District</label><span>' + escapeHtml(announcer.District || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>State</label><span>' + escapeHtml(announcer.State || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Country</label><span>' + escapeHtml(announcer.Country || "N/A") + '</span></div>';
        body += '  <div class="profile-field"><label>Max Radius</label><span>' + escapeHtml(String(announcer.MaxRadius || "N/A")) + '</span></div>';
        body += '  <div class="profile-field"><label>Announcer Status</label><span>' + escapeHtml(announcer.Status || "N/A") + '</span></div>';
      }
    }

    body += '</div>';

    // Add action buttons for Pending items
    var actions = "";
    if (String(item.Status || "").toLowerCase() === "pending") {
      actions = '<div class="modal-actions">' +
        '<button class="module-btn module-btn-primary" onclick="window._modApproveFromModal(\'' + escapeHtml(item.QueueID || "") + '\')">✅ Approve</button>' +
        '<button class="module-btn module-btn-danger" onclick="window._modRejectFromModal(\'' + escapeHtml(item.QueueID || "") + '\')">❌ Reject</button>' +
        '<button class="module-btn module-btn-secondary" onclick="showModal(\'Moderation Item Details\', \'\');">Close</button>' +
        '</div>';
    } else {
      actions = '<div class="modal-actions">' +
        '<button class="module-btn module-btn-secondary" onclick="showModal(\'Moderation Item Details\', \'\');">Close</button>' +
        '</div>';
    }

    showModal("Moderation Item Details", body + actions);
  };

  window._modApprove = async function(queueId) {
    if (!confirm("Approve this moderation item? This will activate the content if applicable.")) return;

    var result = await updateModeration(queueId, "Approved");
    if (result && result.success) {
      showToast("Item approved successfully", "success");
      showModal("Moderation Item Details", ""); // Close modal
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
      showModal("Moderation Item Details", ""); // Close modal
      render();
    } else {
      showToast(result && result.message || "Failed to reject", "error");
    }
  };

  // Modal action handlers (called from within the modal)
  window._modApproveFromModal = async function(queueId) {
    if (!confirm("Approve this moderation item? This will activate the content if applicable.")) return;

    var result = await updateModeration(queueId, "Approved");
    if (result && result.success) {
      showToast("Item approved successfully", "success");
      showModal("Moderation Item Details", ""); // Close modal
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
      showModal("Moderation Item Details", ""); // Close modal
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
});

console.log("Admin Moderation module loaded (Phase 5.7D)");