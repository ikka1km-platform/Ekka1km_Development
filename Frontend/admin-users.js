/*
============================================================
EKKA1KM FRONTEND
admin-users.js
V5.11.0 - ADMIN USER MANAGEMENT MODULE (Phase 5.4)
V5.12.0 - Verified Announcer Admin Integration (Phase 5.7C)
Professional data table with search, pagination, status management
============================================================
*/


/*
============================================================
USER MANAGEMENT MODULE
============================================================
*/

AdminModules.register("users", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var totalPages = 1;
  var usersData = [];
  var announcersData = [];


  /*
  ============================================================
  FETCH ANNOUNCERS
  Fetches all announcer records for client-side join by UserID
  ============================================================
  */

  async function fetchAnnouncers() {
    try {
      var session = AdminAuth.getSession();
      if (!session) return [];

      var url = getApiUrl() + "?action=getallannouncers&session=" + encodeURIComponent(session);
      var response = await fetch(url);
      var json = await response.json();

      if (json && json.success && json.data && json.data.data) {
        return json.data.data;
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch announcers:", err.message);
      return [];
    }
  }


  /*
  ============================================================
  BUILD ANNOUNCER LOOKUP
  Returns a map: UserID -> [announcer records]
  ============================================================
  */

  function buildAnnouncerLookup(announcers) {
    var map = {};
    for (var i = 0; i < announcers.length; i++) {
      var a = announcers[i];
      var uid = String(a.UserID || "").trim();
      if (!uid) continue;
      if (!map[uid]) map[uid] = [];
      map[uid].push(a);
    }
    return map;
  }


  /*
  ============================================================
  GET ANNOUNCER DISPLAY TEXT
  Returns compact status representation for the table
  ============================================================
  */

  function getAnnouncerDisplay(records) {
    if (!records || records.length === 0) {
      return '<span class="status-badge" style="color:var(--text-muted);background:rgba(255,255,255,0.04);">—</span>';
    }

    if (records.length === 1) {
      var a = records[0];
      var status = (a.Status || "").toLowerCase();
      var label = a.Status || "Unknown";
      var icon = "";

      switch (status) {
        case "active":
          icon = "✓ ";
          return '<span class="status-badge status-active">' + icon + label + '</span>';
        case "pending":
          return '<span class="status-badge status-pending">' + label + '</span>';
        case "suspended":
          return '<span class="status-badge status-suspended">' + label + '</span>';
        case "revoked":
          return '<span class="status-badge" style="background:rgba(160,160,192,0.15);color:#a0a0c0;">' + label + '</span>';
        default:
          return '<span class="status-badge">' + label + '</span>';
      }
    }

    // Multiple records
    var activeCount = 0;
    var pendingCount = 0;
    for (var i = 0; i < records.length; i++) {
      var s = (records[i].Status || "").toLowerCase();
      if (s === "active") activeCount++;
      else if (s === "pending") pendingCount++;
    }

    var summary = records.length + " Announcer Role" + (records.length > 1 ? "s" : "");
    if (activeCount > 0) summary += " (" + activeCount + " Active)";
    return '<span class="status-badge" style="background:rgba(124,92,191,0.15);color:var(--accent-purple);">' + summary + '</span>';
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

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading users...</p></div>';

    try {

      var url = getApiUrl() + "?action=adminusers&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Users</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      usersData = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      // Fetch announcers for client-side join
      announcersData = await fetchAnnouncers();
      var announcerLookup = buildAnnouncerLookup(announcersData);

      var html = "";

      // Header
      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">👥 User Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total users</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Filters
      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="userSearch" class="module-input" placeholder="Search by name, email, mobile, ID, city..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._userSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._userSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="userStatusFilter" onchange="window._userStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="active"' + (currentStatus === "active" ? " selected" : "") + '>Active</option>';
      html += '    <option value="suspended"' + (currentStatus === "suspended" ? " selected" : "") + '>Suspended</option>';
      html += '    <option value="deactivated"' + (currentStatus === "deactivated" ? " selected" : "") + '>Deactivated</option>';
      html += '    <option value="deleted"' + (currentStatus === "deleted" ? " selected" : "") + '>Deleted</option>';
      html += '  </select>';
      html += '</div>';

      // Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead>';
      html += '      <tr>';
      html += '        <th>ID</th>';
      html += '        <th>Name</th>';
      html += '        <th>Email</th>';
      html += '        <th>Mobile</th>';
      html += '        <th>City</th>';
      html += '        <th>Status</th>';
      html += '        <th>Announcer</th>';
      html += '        <th>Actions</th>';
      html += '      </tr>';
      html += '    </thead>';
      html += '    <tbody>';

      if (usersData.length === 0) {
        html += '      <tr><td colspan="8" class="module-empty">No users found</td></tr>';
      } else {
        usersData.forEach(function(user) {
          var statusClass = (user.Status || "Active").toLowerCase();
          var userId = user.UserID || "";
          var userAnnouncers = announcerLookup[userId] || null;

          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(userId) + '</span></td>';
          html += '        <td><strong>' + escapeHtml(user.FullName || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(user.Email || "") + '</td>';
          html += '        <td>' + escapeHtml(user.Mobile || "") + '</td>';
          html += '        <td>' + escapeHtml(user.City || "") + '</td>';
          html += '        <td><span class="status-badge status-' + statusClass + '">' + escapeHtml(user.Status || "Active") + '</span></td>';
          html += '        <td>' + getAnnouncerDisplay(userAnnouncers) + '</td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._userView(\'' + escapeHtml(userId) + '\')" title="View Profile">👁️</button>';
          if (userAnnouncers && userAnnouncers.length > 0) {
            html += '          <button class="module-action-btn" onclick="window._userAnnouncerDetail(\'' + escapeHtml(userId) + '\')" title="Announcer Details" style="color:var(--accent-cyan);">📢</button>';
          }
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(userId) + '\',\'Active\')" title="Activate">✅</button>';
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(userId) + '\',\'Suspended\')" title="Suspend">⏸️</button>';
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(userId) + '\',\'Deactivated\')" title="Deactivate">🔴</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._userStatus(\'' + escapeHtml(userId) + '\',\'Deleted\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      // Pagination
      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._userPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._userPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }


  /*
  ============================================================
  GLOBAL HELPERS
  ============================================================
  */

  window._userSearch = function() {
    var input = document.getElementById("userSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._userStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._userPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  window._userStatus = async function(userId, status) {
    var actionLabels = { "Active": "activate", "Suspended": "suspend", "Deactivated": "deactivate", "Deleted": "delete" };
    var confirmed = confirm("Are you sure you want to " + (actionLabels[status] || status) + " user " + userId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminuserstatus&session=" + encodeURIComponent(session) + "&userId=" + encodeURIComponent(userId) + "&status=" + encodeURIComponent(status));
      var json = await response.json();
      if (json && json.success) {
        showToast("User " + userId + " " + (actionLabels[status] || status) + "d successfully", "success");
        render();
      } else {
        showToast(json.message || "Failed to update user status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  window._userView = async function(userId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminuserdetail&session=" + encodeURIComponent(session) + "&userId=" + encodeURIComponent(userId));
      var json = await response.json();
      if (json && json.success && json.data) {
        var data = json.data;
        var user = data.user || {};
        var wallet = data.wallet || {};
        var stats = data.stats || {};

        var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
        mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
        mhtml += '    <div class="modal-header">';
        mhtml += '      <h3>👤 User Profile: ' + escapeHtml(user.FullName || "N/A") + '</h3>';
        mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
        mhtml += '    </div>';
        mhtml += '    <div class="modal-body">';
        mhtml += '      <div class="profile-grid">';
        mhtml += '        <div class="profile-field"><label>User ID</label><span>' + escapeHtml(user.UserID || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Full Name</label><span>' + escapeHtml(user.FullName || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Email</label><span>' + escapeHtml(user.Email || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Mobile</label><span>' + escapeHtml(user.Mobile || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>City</label><span>' + escapeHtml(user.City || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>State</label><span>' + escapeHtml(user.State || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Status</label><span class="status-badge status-' + (user.Status || "active").toLowerCase() + '">' + escapeHtml(user.Status || "Active") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Registered</label><span>' + escapeHtml(user.CreatedDate || user.RegisteredDate || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Last Login</label><span>' + escapeHtml(user.LastLogin || "") + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Wallet Balance</label><span>₹' + (wallet.Balance || 0) + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Products</label><span>' + (stats.products || 0) + '</span></div>';
        mhtml += '        <div class="profile-field"><label>Businesses</label><span>' + (stats.businesses || 0) + '</span></div>';
        mhtml += '      </div>';
        mhtml += '    </div>';
        mhtml += '    <div class="modal-footer">';
        mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
        mhtml += '    </div>';
        mhtml += '  </div>';
        mhtml += '</div>';

        document.body.insertAdjacentHTML("beforeend", mhtml);
      } else {
        showToast(json.message || "Failed to load user details", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };


  /*
  ============================================================
  ANNOUNCER DETAIL / REVIEW MODAL
  Shows full announcer information and lifecycle actions
  ============================================================
  */

  window._userAnnouncerDetail = async function(userId) {
    var session = AdminAuth.getSession();
    if (!session) return;

    // Find announcer records for this user from already-fetched data
    var announcerLookup = buildAnnouncerLookup(announcersData);
    var records = announcerLookup[userId] || [];

    if (records.length === 0) {
      showToast("No announcer records found for this user", "info");
      return;
    }

    // Build modal for each announcer record
    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>📢 Announcer Details: ' + escapeHtml(userId) + '</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';

    for (var i = 0; i < records.length; i++) {
      var a = records[i];
      var status = (a.Status || "").toLowerCase();
      var statusBadge = "";

      switch (status) {
        case "active":
          statusBadge = '<span class="status-badge status-active">✓ Active</span>';
          break;
        case "pending":
          statusBadge = '<span class="status-badge status-pending">Pending</span>';
          break;
        case "suspended":
          statusBadge = '<span class="status-badge status-suspended">Suspended</span>';
          break;
        case "revoked":
          statusBadge = '<span class="status-badge" style="background:rgba(160,160,192,0.15);color:#a0a0c0;">Revoked</span>';
          break;
        default:
          statusBadge = '<span class="status-badge">' + escapeHtml(a.Status || "Unknown") + '</span>';
      }

      if (records.length > 1) {
        mhtml += '      <div class="panel" style="margin-bottom:16px;">';
        mhtml += '        <div class="panel-header"><span class="panel-title">Announcer #' + (i + 1) + ': ' + escapeHtml(a.AnnouncerID || "") + '</span> ' + statusBadge + '</div>';
        mhtml += '        <div class="panel-body">';
      } else {
        mhtml += '      <div class="panel" style="margin-bottom:16px;">';
        mhtml += '        <div class="panel-header"><span class="panel-title">' + escapeHtml(a.AnnouncerID || "") + '</span> ' + statusBadge + '</div>';
        mhtml += '        <div class="panel-body">';
      }

      mhtml += '          <div class="profile-grid">';
      mhtml += '            <div class="profile-field"><label>Announcer ID</label><span class="module-id">' + escapeHtml(a.AnnouncerID || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>User ID</label><span class="module-id">' + escapeHtml(a.UserID || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Department / Authority</label><span>' + escapeHtml(a.DepartmentName || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Designation</label><span>' + escapeHtml(a.Designation || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Authority Type</label><span>' + escapeHtml(a.AuthorityType || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Address</label><span>' + escapeHtml(a.Address || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>City / Jurisdiction</label><span>' + escapeHtml(a.City || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>District</label><span>' + escapeHtml(a.District || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>State</label><span>' + escapeHtml(a.State || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Country</label><span>' + escapeHtml(a.Country || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Max Radius</label><span>' + escapeHtml(a.MaxRadius || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Requested Date</label><span>' + escapeHtml(a.RequestedDate || "") + '</span></div>';
      mhtml += '            <div class="profile-field"><label>Status</label><span>' + statusBadge + '</span></div>';

      if (a.VerifiedBy) {
        mhtml += '            <div class="profile-field"><label>Verified By</label><span>' + escapeHtml(a.VerifiedBy || "") + '</span></div>';
        mhtml += '            <div class="profile-field"><label>Verified Date</label><span>' + escapeHtml(a.VerifiedDate || "") + '</span></div>';
      }

      if (a.SuspendedDate) {
        mhtml += '            <div class="profile-field"><label>Suspended Date</label><span>' + escapeHtml(a.SuspendedDate || "") + '</span></div>';
      }

      if (a.RevokedDate) {
        mhtml += '            <div class="profile-field"><label>Revoked Date</label><span>' + escapeHtml(a.RevokedDate || "") + '</span></div>';
      }

      if (a.AdminNotes) {
        mhtml += '            <div class="profile-field"><label>Admin Notes</label><span>' + escapeHtml(a.AdminNotes || "") + '</span></div>';
      }

      // Proof Document
      if (a.ProofDocument) {
        var proofUrl = String(a.ProofDocument).trim();
        mhtml += '            <div class="profile-field" style="grid-column:1/-1;">';
        mhtml += '              <label>Proof Document</label>';
        mhtml += '              <span><a href="' + escapeHtml(proofUrl) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);text-decoration:underline;">📄 View Proof Document</a></span>';
        mhtml += '            </div>';
      }

      mhtml += '          </div>';

      // Action buttons based on status
      mhtml += '          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">';

      var announcerId = a.AnnouncerID || "";

      if (status === "pending") {
        mhtml += '            <button class="module-btn module-btn-primary" onclick="window._announcerVerify(\'' + escapeHtml(announcerId) + '\')">✅ Verify / Activate</button>';
        mhtml += '            <button class="module-btn module-btn-secondary" style="border-color:var(--accent-red);color:var(--accent-red);" onclick="window._announcerRevoke(\'' + escapeHtml(announcerId) + '\')">🚫 Revoke</button>';
      } else if (status === "active") {
        mhtml += '            <button class="module-btn module-btn-secondary" style="border-color:var(--accent-orange);color:var(--accent-orange);" onclick="window._announcerSuspend(\'' + escapeHtml(announcerId) + '\')">⏸️ Suspend</button>';
        mhtml += '            <button class="module-btn module-btn-secondary" style="border-color:var(--accent-red);color:var(--accent-red);" onclick="window._announcerRevoke(\'' + escapeHtml(announcerId) + '\')">🚫 Revoke</button>';
      } else if (status === "suspended") {
        mhtml += '            <button class="module-btn module-btn-primary" onclick="window._announcerReactivate(\'' + escapeHtml(announcerId) + '\')">🔄 Reactivate</button>';
        mhtml += '            <button class="module-btn module-btn-secondary" style="border-color:var(--accent-red);color:var(--accent-red);" onclick="window._announcerRevoke(\'' + escapeHtml(announcerId) + '\')">🚫 Revoke</button>';
      } else if (status === "revoked") {
        mhtml += '            <span style="color:var(--text-muted);font-size:12px;padding:8px 0;">Revoked — No further actions available in V1.</span>';
      }

      mhtml += '          </div>';
      mhtml += '        </div>';
      mhtml += '      </div>';
    }

    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';

    document.body.insertAdjacentHTML("beforeend", mhtml);
  };


  /*
  ============================================================
  ANNOUNCER LIFECYCLE ACTIONS
  All use existing backend endpoints with requireAdminSession
  ============================================================
  */

  window._announcerVerify = async function(announcerId) {
    var confirmed = confirm("Verify and activate announcer " + announcerId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminverifyannouncer&session=" + encodeURIComponent(session) + "&announcerId=" + encodeURIComponent(announcerId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " verified and activated successfully", "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to verify announcer", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  window._announcerSuspend = async function(announcerId) {
    var confirmed = confirm("Suspend announcer " + announcerId + "?\n\n- User account will remain Active\n- Historical announcements will remain untouched\n- Announcer posting privilege will be temporarily removed");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminsuspendannouncer&session=" + encodeURIComponent(session) + "&announcerId=" + encodeURIComponent(announcerId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " suspended successfully", "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to suspend announcer", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  window._announcerReactivate = async function(announcerId) {
    var confirmed = confirm("Reactivate announcer " + announcerId + "?\n\n- Same AnnouncerID will be reused\n- Status will become Active");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminreactivateannouncer&session=" + encodeURIComponent(session) + "&announcerId=" + encodeURIComponent(announcerId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " reactivated successfully", "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to reactivate announcer", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  window._announcerRevoke = async function(announcerId) {
    var confirmed = confirm("⚠️ REVOKE announcer " + announcerId + "?\n\n- User account will remain intact\n- Announcer posting privilege will be permanently removed\n- Historical announcements will remain\n- This action cannot be undone in V1");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminrevokeannouncer&session=" + encodeURIComponent(session) + "&announcerId=" + encodeURIComponent(announcerId));
      var json = await response.json();
      if (json && json.success) {
        showToast("Announcer " + announcerId + " revoked. User account remains active.", "success");
        closeModal();
        render();
      } else {
        showToast(json.message || "Failed to revoke announcer", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  // Initial render
  await render();
});


/*
============================================================
UTILITY FUNCTIONS
============================================================
*/

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/[&]/g, String.fromCharCode(38, 97, 109, 112, 59))
    .replace(/[<]/g, String.fromCharCode(38, 108, 116, 59))
    .replace(/[>]/g, String.fromCharCode(38, 103, 116, 59))
    .replace(/["]/g, String.fromCharCode(38, 113, 117, 111, 116, 59))
    .replace(/[']/g, String.fromCharCode(38, 35, 48, 51, 57, 59));
}

function showToast(message, type) {
  var existing = document.querySelector(".toast-container");
  if (existing) existing.remove();

  var container = document.createElement("div");
  container.className = "toast-container";
  container.innerHTML = '<div class="toast toast-' + (type || "info") + '">' + escapeHtml(message) + '</div>';
  document.body.appendChild(container);

  setTimeout(function() {
    container.classList.add("toast-fade");
    setTimeout(function() { container.remove(); }, 300);
  }, 3000);
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  var modal = document.querySelector(".modal-overlay");
  if (modal) modal.remove();
}

console.log("Admin Users module loaded (Phase 5.4 + Announcer Integration)");