/*
============================================================
EKKA1KM FRONTEND
admin-news.js
V5.11.0 - ADMIN NEWS MANAGEMENT MODULE (Phase 5.4)
Professional data table with search, status management
============================================================
*/


AdminModules.register("news", async function(container) {

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

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading news...</p></div>';

    try {
      var url = getApiUrl() + "?action=adminnews&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load News</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var news = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📰 News Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total articles</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="newsSearch" class="module-input" placeholder="Search by title, category, author..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._newsSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._newsSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="newsStatusFilter" onchange="window._newsStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="published"' + (currentStatus === "published" ? " selected" : "") + '>Published</option>';
      html += '    <option value="unpublished"' + (currentStatus === "unpublished" ? " selected" : "") + '>Unpublished</option>';
      html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
      html += '    <option value="deleted"' + (currentStatus === "deleted" ? " selected" : "") + '>Deleted</option>';
      html += '  </select>';
      html += '</div>';

      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>ID</th><th>Title</th><th>Category</th><th>Author</th><th>Date</th><th>Status</th><th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (news.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No news articles found</td></tr>';
      } else {
        news.forEach(function(article) {
          var sClass = (article.Status || "Pending").toLowerCase();
          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(article.NewsID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(article.Title || article.Headline || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(article.Category || "") + '</td>';
          html += '        <td>' + escapeHtml(article.Author || "") + '</td>';
          html += '        <td>' + escapeHtml(article.CreatedDate || article.Date || "") + '</td>';
          html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(article.Status || "Pending") + '</span></td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._newsStatus(\'' + escapeHtml(article.NewsID || "") + '\',\'Published\')" title="Publish">📰</button>';
          html += '          <button class="module-action-btn" onclick="window._newsStatus(\'' + escapeHtml(article.NewsID || "") + '\',\'Featured\')" title="Mark Featured">⭐</button>';
          html += '          <button class="module-action-btn" onclick="window._newsStatus(\'' + escapeHtml(article.NewsID || "") + '\',\'Unpublished\')" title="Unpublish">⏸️</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._newsStatus(\'' + escapeHtml(article.NewsID || "") + '\',\'Deleted\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._newsPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._newsPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }

  window._newsSearch = function() {
    var input = document.getElementById("newsSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._newsStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._newsPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  window._newsStatus = async function(newsId, status) {
    var labels = { "Published": "publish", "Featured": "feature", "Unpublished": "unpublish", "Deleted": "delete" };
    var confirmed = confirm("Are you sure you want to " + (labels[status] || status) + " article " + newsId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminnewsstatus&session=" + encodeURIComponent(session) + "&newsId=" + encodeURIComponent(newsId) + "&status=" + encodeURIComponent(status));
      var json = await response.json();
      if (json && json.success) {
        showToast("Article " + newsId + " " + (labels[status] || status) + "ed successfully", "success");
        render();
      } else {
        showToast(json.message || "Failed to update news status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  await render();
});

console.log("Admin News module loaded (Phase 5.4)");