/*
============================================================
EKKA1KM FRONTEND
admin-users.js
V5.11.0 - ADMIN USER MANAGEMENT MODULE (Phase 5.4)
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
      html += '        <th>Actions</th>';
      html += '      </tr>';
      html += '    </thead>';
      html += '    <tbody>';

      if (usersData.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No users found</td></tr>';
      } else {
        usersData.forEach(function(user) {
          var statusClass = (user.Status || "Active").toLowerCase();
          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(user.UserID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(user.FullName || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(user.Email || "") + '</td>';
          html += '        <td>' + escapeHtml(user.Mobile || "") + '</td>';
          html += '        <td>' + escapeHtml(user.City || "") + '</td>';
          html += '        <td><span class="status-badge status-' + statusClass + '">' + escapeHtml(user.Status || "Active") + '</span></td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._userView(\'' + escapeHtml(user.UserID || "") + '\')" title="View Profile">👁️</button>';
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(user.UserID || "") + '\',\'Active\')" title="Activate">✅</button>';
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(user.UserID || "") + '\',\'Suspended\')" title="Suspend">⏸️</button>';
          html += '          <button class="module-action-btn" onclick="window._userStatus(\'' + escapeHtml(user.UserID || "") + '\',\'Deactivated\')" title="Deactivate">🔴</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._userStatus(\'' + escapeHtml(user.UserID || "") + '\',\'Deleted\')" title="Delete">🗑️</button>';
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

console.log("Admin Users module loaded (Phase 5.4)");