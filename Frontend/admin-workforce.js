/*
============================================================
EKKA1KM FRONTEND
admin-workforce.js
V5.11.0 - ADMIN WORKFORCE MANAGEMENT MODULE (Phase 5.4)
Employee list with online status, roles, departments
============================================================
*/


AdminModules.register("workforce", async function(container) {

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading workforce...</p></div>';

    try {
      var response = await fetch(getApiUrl() + "?action=adminworkforce&session=" + encodeURIComponent(session));
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Workforce</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var workforce = json.data.data || [];

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">💼 Workforce Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' team members</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      // Summary cards
      var onlineCount = 0;
      var activeCount = 0;
      var roles = {};
      workforce.forEach(function(m) {
        if (m.online) onlineCount++;
        if (m.status === "Active") activeCount++;
        roles[m.role] = (roles[m.role] || 0) + 1;
      });

      html += '<div class="wf-summary">';
      html += '  <div class="wf-summary-card"><span class="wf-summary-value">' + workforce.length + '</span><span class="wf-summary-label">Total</span></div>';
      html += '  <div class="wf-summary-card"><span class="wf-summary-value wf-online">' + onlineCount + '</span><span class="wf-summary-label">Online</span></div>';
      html += '  <div class="wf-summary-card"><span class="wf-summary-value wf-active">' + activeCount + '</span><span class="wf-summary-label">Active</span></div>';
      html += '  <div class="wf-summary-card"><span class="wf-summary-value">' + Object.keys(roles).length + '</span><span class="wf-summary-label">Roles</span></div>';
      html += '</div>';

      // Table
      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>Status</th><th>Admin ID</th><th>Name</th><th>Role</th><th>Department</th><th>Designation</th><th>Last Activity</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (workforce.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No workforce data found</td></tr>';
      } else {
        workforce.forEach(function(m) {
          var onlineDot = m.online ? '<span class="wf-dot wf-dot-online" title="Online"></span>' : '<span class="wf-dot wf-dot-offline" title="Offline"></span>';
          var statusClass = (m.status || "").toLowerCase();
          html += '      <tr>';
          html += '        <td>' + onlineDot + '</td>';
          html += '        <td><span class="module-id">' + escapeHtml(m.adminId || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(m.fullName || "N/A") + '</strong></td>';
          html += '        <td><span class="status-badge status-' + (m.role || "").toLowerCase() + '">' + escapeHtml(m.role || "") + '</span></td>';
          html += '        <td>' + escapeHtml(m.department || "") + '</td>';
          html += '        <td>' + escapeHtml(m.designation || "") + '</td>';
          html += '        <td><span class="wf-status status-' + statusClass + '">' + escapeHtml(m.status || "") + '</span><br/><small>' + escapeHtml(m.lastActivity || "") + '</small></td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }

  await render();
});

console.log("Admin Workforce module loaded (Phase 5.4)");