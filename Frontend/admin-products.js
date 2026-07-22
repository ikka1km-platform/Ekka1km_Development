/*
============================================================
EKKA1KM FRONTEND
admin-products.js
V5.11.0 - ADMIN PRODUCT MANAGEMENT MODULE (Phase 5.4)
Professional data table with search, category filter, status management
============================================================
*/


AdminModules.register("products", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var currentCategory = "";
  var totalPages = 1;

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading products...</p></div>';

    try {
      var url = getApiUrl() + "?action=adminproducts&session=" + encodeURIComponent(session) + "&page=" + currentPage + "&limit=20";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);
      if (currentCategory) url += "&category=" + encodeURIComponent(currentCategory);

      var response = await fetch(url);
      var json = await response.json();

      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Products</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }

      var products = json.data.data || [];
      totalPages = json.data.totalPages || 1;

      var html = "";

      html += '<div class="module-header">';
      html += '  <div class="module-header-left">';
      html += '    <h2 class="module-title">📦 Product Management</h2>';
      html += '    <span class="module-count">' + (json.data.count || 0) + ' total products</span>';
      html += '  </div>';
      html += '  <div class="module-header-right">';
      html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
      html += '  </div>';
      html += '</div>';

      html += '<div class="module-filters">';
      html += '  <div class="module-search">';
      html += '    <input type="text" id="prodSearch" class="module-input" placeholder="Search by name, category, seller..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._prodSearch(); }" />';
      html += '    <button class="module-btn module-btn-primary" onclick="window._prodSearch()">🔍 Search</button>';
      html += '  </div>';
      html += '  <select class="module-select" id="prodStatusFilter" onchange="window._prodStatusChange(this.value)">';
      html += '    <option value="">All Status</option>';
      html += '    <option value="active"' + (currentStatus === "active" ? " selected" : "") + '>Active</option>';
      html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
      html += '    <option value="rejected"' + (currentStatus === "rejected" ? " selected" : "") + '>Rejected</option>';
      html += '    <option value="deleted"' + (currentStatus === "deleted" ? " selected" : "") + '>Deleted</option>';
      html += '    <option value="featured"' + (currentStatus === "featured" ? " selected" : "") + '>Featured</option>';
      html += '  </select>';
      html += '  <input type="text" id="prodCategory" class="module-input" style="max-width:150px" placeholder="Category" value="' + escapeHtml(currentCategory) + '" onkeyup="if(event.key===\'Enter\'){ window._prodCategoryFilter(); }" />';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._prodCategoryFilter()">Filter</button>';
      html += '</div>';

      html += '<div class="module-table-container">';
      html += '  <table class="module-table">';
      html += '    <thead><tr>';
      html += '      <th>ID</th><th>Product Name</th><th>Category</th><th>Seller</th><th>Price</th><th>Status</th><th>Actions</th>';
      html += '    </tr></thead>';
      html += '    <tbody>';

      if (products.length === 0) {
        html += '      <tr><td colspan="7" class="module-empty">No products found</td></tr>';
      } else {
        products.forEach(function(prod) {
          var sClass = (prod.Status || "Pending").toLowerCase();
          var price = prod.Price || prod.price || 0;
          html += '      <tr>';
          html += '        <td><span class="module-id">' + escapeHtml(prod.ProductID || "") + '</span></td>';
          html += '        <td><strong>' + escapeHtml(prod.ProductName || prod.Name || "N/A") + '</strong></td>';
          html += '        <td>' + escapeHtml(prod.Category || "") + '</td>';
          html += '        <td>' + escapeHtml(prod.SellerName || "") + '</td>';
          html += '        <td>₹' + price + '</td>';
          html += '        <td><span class="status-badge status-' + sClass + '">' + escapeHtml(prod.Status || "Pending") + '</span></td>';
          html += '        <td class="module-actions">';
          html += '          <button class="module-action-btn" onclick="window._prodStatus(\'' + escapeHtml(prod.ProductID || "") + '\',\'Active\')" title="Approve">✅</button>';
          html += '          <button class="module-action-btn" onclick="window._prodStatus(\'' + escapeHtml(prod.ProductID || "") + '\',\'Featured\')" title="Mark Featured">⭐</button>';
          html += '          <button class="module-action-btn" onclick="window._prodStatus(\'' + escapeHtml(prod.ProductID || "") + '\',\'Rejected\')" title="Reject">❌</button>';
          html += '          <button class="module-action-btn module-action-danger" onclick="window._prodStatus(\'' + escapeHtml(prod.ProductID || "") + '\',\'Deleted\')" title="Delete">🗑️</button>';
          html += '        </td>';
          html += '      </tr>';
        });
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';

      html += '<div class="module-pagination">';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._prodPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
      html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '  <button class="module-btn module-btn-secondary" onclick="window._prodPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
      html += '</div>';

      container.innerHTML = html;

    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + err.message + '</p></div>';
    }
  }

  window._prodSearch = function() {
    var input = document.getElementById("prodSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._prodStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };

  window._prodCategoryFilter = function() {
    var input = document.getElementById("prodCategory");
    currentCategory = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };

  window._prodPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };

  window._prodStatus = async function(prodId, status) {
    var labels = { "Active": "approve", "Featured": "feature", "Rejected": "reject", "Deleted": "delete" };
    var confirmed = confirm("Are you sure you want to " + (labels[status] || status) + " product " + prodId + "?");
    if (!confirmed) return;

    var session = AdminAuth.getSession();
    if (!session) return;

    try {
      var response = await fetch(getApiUrl() + "?action=adminproductstatus&session=" + encodeURIComponent(session) + "&productId=" + encodeURIComponent(prodId) + "&status=" + encodeURIComponent(status));
      var json = await response.json();
      if (json && json.success) {
        showToast("Product " + prodId + " " + (labels[status] || status) + "d successfully", "success");
        render();
      } else {
        showToast(json.message || "Failed to update product status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  await render();
});

console.log("Admin Products module loaded (Phase 5.4)");