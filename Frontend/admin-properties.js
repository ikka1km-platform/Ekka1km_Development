/*
============================================================
EKKA1KM FRONTEND
admin-properties.js
V5.11.0 - ADMIN PROPERTY MANAGEMENT MODULE (Phase 5.4)
Professional data table with search, purpose filter, status management
============================================================
*/


AdminModules.register("properties", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var currentPurpose = "";
  var totalPages = 1;

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading properties...</p></div>';

    try {
      var url = getApiUrl() + "?action=adminproperties&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);
      if (currentPurpose) url += "&purpose=" + encodeURIComponent(currentPurpose);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Properties</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var properties = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">🏠 Property Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total properties</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="propSearch" class="module-input" placeholder="Search by title, category, owner..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._propSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._propSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="propStatusFilter" onchange="window._propStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="active"' + (currentStatus === "active" ? " selected" : "") + '>Active</option>';
      html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
      html += '    <option value="rejected"' + (currentStatus === "rejected" ? " selected" : "") + '>Rejected</option>';
      html += '    <option value="deleted"' + (currentStatus === "deleted" ? " selected" : "") + '>Deleted</option>';
      html += '  </select>';
      html += '  <select class="module-select" id="propPurposeFilter" onchange="window._propPurposeChange(this.value)">';
      html += '    <option value="">All Purpose</option>';
      html += '    <option value="sell"' + (currentPurpose === "sell" ? " selected" : "") + '>Sell</option>';
      html += '    <option value="rent"' + (currentPurpose === "rent" ? " selected" : "") + '>Rent</option>';
      html += '    <option value="lease"' + (currentPurpose === "lease" ? " selected" : "") + '>Lease</option>';
      html += '  </select>';
      html += '</div>';

      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>ID</th><th>Title</th><th>Category</th><th>Owner</th><th>Purpose</th><th>Status</th><th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (properties.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No properties found</td></tr>';
      } else {
        properties.forEach(function(prop) {
          var sClass = (prop.Status || "Pending").toLowerCase();
          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(prop.PropertyID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(prop.Title || prop.Name || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(prop.Category || "") + '</td>';
          html += '        <td>' + escapeHtml(prop.OwnerName || "") + '</td>';
          html += '        <td>' + escapeHtml(prop.Purpose || "") + '</td>';
          html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(prop.Status || "Pending") + '</span></td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._propStatus(\'' + escapeHtml(prop.PropertyID || "") + '\',\'Active\')" title="Approve">✅</button>';
          html += '          <button class="module-action-btn" onclick="window._propStatus(\'' + escapeHtml(prop.PropertyID || "") + '\',\'Rejected\')" title="Reject">❌</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._propStatus(\'' + escapeHtml(prop.PropertyID || "") + '\',\'Deleted\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._propPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._propPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }

  window._propSearch = function() {
    var input = document.getElementById("propSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._propStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._propPurposeChange = function(value) {
    currentPurpose = value;
    currentPage = 1;
    render();
  };

  window._propPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  window._propStatus = async function(propId, status) {
    var labels = { "Active": "approve", "Rejected": "reject", "Deleted": "delete" };
    var confirmed = confirm("Are you sure you want to " + (labels[status] || status) + " property " + propId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminpropertystatus&session=" + encodeURIComponent(session) + "&propertyId=" + encodeURIComponent(propId) + "&status=" + encodeURIComponent(status));
      var json = await response.json();
      if (json && json.success) {
        showToast("Property " + propId + " " + (labels[status] || status) + "d successfully", "success");
        render();
      } else {
        showToast(json.message || "Failed to update property status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  await render();
});

console.log("Admin Properties module loaded (Phase 5.4)");