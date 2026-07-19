/*
============================================================
EKKA1KM FRONTEND
admin-businesses.js
V5.11.0 - ADMIN BUSINESS MANAGEMENT MODULE (Phase 5.4)
Professional data table with search, filters, status management
============================================================
*/


AdminModules.register("businesses", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var totalPages = 1;

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading businesses...</p></div>';

    try {
      var url = getApiUrl() + "?action=adminbusinesses&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Businesses</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var businesses = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">🏪 Business Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total businesses</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="bizSearch" class="module-input" placeholder="Search by name, owner, category, city, ID..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._bizSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._bizSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="bizStatusFilter" onchange="window._bizStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="active"' + (currentStatus === "active" ? " selected" : "") + '>Active</option>';
      html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
      html += '    <option value="rejected"' + (currentStatus === "rejected" ? " selected" : "") + '>Rejected</option>';
      html += '    <option value="suspended"' + (currentStatus === "suspended" ? " selected" : "") + '>Suspended</option>';
      html += '    <option value="deleted"' + (currentStatus === "deleted" ? " selected" : "") + '>Deleted</option>';
      html += '  </select>';
      html += '</div>';

      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>ID</th><th>Business Name</th><th>Owner</th><th>Category</th><th>City</th><th>Status</th><th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (businesses.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No businesses found</td></tr>';
      } else {
        businesses.forEach(function(biz) {
          var sClass = (biz.Status || "Pending").toLowerCase();
          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(biz.BusinessID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(biz.BusinessName || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(biz.OwnerName || "") + '</td>';
          html += '        <td>' + escapeHtml(biz.Category || "") + '</td>';
          html += '        <td>' + escapeHtml(biz.City || "") + '</td>';
          html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(biz.Status || "Pending") + '</span></td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._bizStatus(\'' + escapeHtml(biz.BusinessID || "") + '\',\'Active\')" title="Approve">✅</button>';
          html += '          <button class="module-action-btn" onclick="window._bizStatus(\'' + escapeHtml(biz.BusinessID || "") + '\',\'Suspended\')" title="Suspend">⏸️</button>';
          html += '          <button class="module-action-btn" onclick="window._bizStatus(\'' + escapeHtml(biz.BusinessID || "") + '\',\'Rejected\')" title="Reject">❌</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._bizStatus(\'' + escapeHtml(biz.BusinessID || "") + '\',\'Deleted\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._bizPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._bizPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }

  window._bizSearch = function() {
    var input = document.getElementById("bizSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._bizStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._bizPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  window._bizStatus = async function(bizId, status) {
    var labels = { "Active": "approve", "Suspended": "suspend", "Rejected": "reject", "Deleted": "delete" };
    var confirmed = confirm("Are you sure you want to " + (labels[status] || status) + " business " + bizId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminbusinessstatus&session=" + encodeURIComponent(session) + "&businessId=" + encodeURIComponent(bizId) + "&status=" + encodeURIComponent(status));
      var json = await response.json();
      if (json && json.success) {
        showToast("Business " + bizId + " " + (labels[status] || status) + "d successfully", "success");
        render();
      } else {
        showToast(json.message || "Failed to update business status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  await render();
});

console.log("Admin Businesses module loaded (Phase 5.4)");