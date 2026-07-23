/*
============================================================
EKKA1KM FRONTEND
admin-wallet.js
V5.13.0 - PHASE 5.7A WALLET & REWARDS ECONOMY CONTROL CENTER
Read-only economy visibility for Super Admin
============================================================
*/

AdminModules.register("wallet", async function(container) {

  var currentView = "overview";
  var currentPage = 1;
  var currentSearch = "";
  var currentTxSearch = "";
  var currentTxType = "";
  var currentTxSource = "";
  var currentTxStatus = "";
  var currentRewardSearch = "";
  var currentCampaignSearch = "";
  var totalPages = 1;
  var walletData = [];
  var economySummary = {};
  var walletDetailData = null;
  var detailUserId = null;

  var ENT_AMP = "&" + "amp;";
  var ENT_LT = "&" + "lt;";
  var ENT_GT = "&" + "gt;";
  var ENT_QUOT = "&" + "quot;";
  var ENT_APOS = "&#x27;";

  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/[&]/g, ENT_AMP)
      .replace(/[<]/g, ENT_LT)
      .replace(/[>]/g, ENT_GT)
      .replace(/["]/g, ENT_QUOT)
      .replace(/[']/g, ENT_APOS);
  }

  async function render() {
    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\uD83D\uDD12</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }
    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Wallet & Economy Control Center...</p></div>';
    try {
      if (currentView === "overview") {
        await loadEconomySummary(session);
      } else if (currentView === "explorer") {
        await loadWalletExplorer(session);
      } else if (currentView === "detail") {
        await loadWalletDetail(session);
      } else if (currentView === "transactions") {
        await loadTransactions(session);
      } else if (currentView === "rewards") {
        await loadRewardActivity(session);
      } else if (currentView === "campaigns") {
        await loadCampaignEconomy(session);
      }
    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Connection Error</h3><p>' + esc(err.message) + '</p></div>';
    }
  }

  async function loadEconomySummary(session) {
    var response = await fetch(getApiUrl() + "?action=admineconomysummary&session=" + encodeURIComponent(session));
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Economy Data</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    economySummary = json.data || {};
    renderEconomyOverview(session);
  }

  function renderEconomyOverview(session) {
    var s = economySummary;
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCB0 Wallet & Economy Control Center</h2>';
    html += '    <span class="module-count">Read-only visibility</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">\u2190 Back to Dashboard</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin:15px 0;flex-wrap:wrap;">';
    html += '  <button class="module-btn ' + (currentView === "overview" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._econView(\'overview\')">\uD83D\uDCCA Economy Overview</button>';
    html += '  <button class="module-btn ' + (currentView === "explorer" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._econView(\'explorer\')">\uD83D\uDC5B Wallet Explorer</button>';
    html += '  <button class="module-btn ' + (currentView === "transactions" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._econView(\'transactions\')">\uD83D\uDCB3 Transactions</button>';
    html += '  <button class="module-btn ' + (currentView === "rewards" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._econView(\'rewards\')">\uD83C\uDF81 Reward Activity</button>';
    html += '  <button class="module-btn ' + (currentView === "campaigns" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._econView(\'campaigns\')">\uD83D\uDCE2 Campaign Economy</button>';
    html += '</div>';
    html += '<div style="margin-bottom:20px;">';
    html += '  <h3 style="color:var(--text-secondary);margin-bottom:12px;font-size:15px;">\uD83D\uDCCA Economy Overview</h3>';
    html += '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">';
    html += kpiCard("Users With Wallets", s.totalUsersWithWallets || 0, "#5b8def");
    html += kpiCard("Total Coins in Circulation", fmt(s.aggregateCoinBalance || 0), "#4caf88");
    html += kpiCard("Wallet Transactions", s.walletTransactionCount || 0, "#ff9f43");
    html += kpiCard("Total Credits", fmt(s.totalCredits || 0), "#4caf88");
    html += kpiCard("Total Debits", fmt(s.totalDebits || 0), "#ff4757");
    html += kpiCard("Rewards Given", s.rewardTransactionCount || 0, "#7c5cbf");
    html += kpiCard("Reward Coins Distributed", fmt(s.totalRewardCoinsDistributed || 0), "#45d0e6");
    html += kpiCard("Total Coins Spent", fmt(s.totalCoinsSpent || 0), "#ff9f43");
    html += kpiCard("Total Reward Pool", fmt(s.totalRewardPool || 0), "#4caf88");
    html += kpiCard("Platform Reserve", fmt(s.totalPlatformReserve || 0), "#5b8def");
    html += kpiCard("Remaining Reward Coins", fmt(s.totalRemainingRewardCoins || 0), "#45d0e6");
    html += kpiCard("Active Campaigns", s.activeCampaignCount || 0, "#4caf88");
    html += '</div>';
    html += '</div>';
    html += '<div style="margin-bottom:20px;">';
    html += '  <h3 style="color:var(--text-secondary);margin-bottom:12px;font-size:15px;">\u26A1 Quick Actions</h3>';
    html += '  <div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html += '    <button class="module-btn module-btn-primary" onclick="window._econView(\'explorer\')">\uD83D\uDD0D Explore Wallets</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'transactions\')">\uD83D\uDCB3 View Transactions</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'rewards\')">\uD83C\uDF81 View Rewards</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'campaigns\')">\uD83D\uDCE2 Campaign Economy</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);margin-top:10px;">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 <strong>Read-Only Mode:</strong> This dashboard provides visibility into the platform economy. No wallet balances, transactions, rewards, or campaign pools can be modified from this interface.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadWalletExplorer(session) {
    var url = getApiUrl() + "?action=adminwalletexplorer&session=" + encodeURIComponent(session) +
      "&page=" + currentPage + "&limit=25";
    if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Wallets</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderWalletExplorer(session);
  }

  function renderWalletExplorer(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDC5B Wallet Explorer</h2>';
    html += '    <span class="module-count">' + (walletData.length > 0 ? 'Showing wallets' : '') + '</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'overview\')">\u2190 Back to Overview</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="walletSearch" class="module-input" placeholder="Search by UserID, WalletID, Name, Mobile..." value="' + esc(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._walletSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._walletSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearWalletSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Wallet ID</th>';
    html += '      <th>User ID</th>';
    html += '      <th>Name</th>';
    html += '      <th>Mobile</th>';
    html += '      <th>Balance</th>';
    html += '      <th>Earned</th>';
    html += '      <th>Txs</th>';
    html += '      <th>Rewards</th>';
    html += '      <th>Last TX</th>';
    html += '      <th>Action</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="10" class="module-empty">No wallets found</td></tr>';
    } else {
      walletData.forEach(function(w) {
        html += '      <tr>';
        html += '        <td><span class="module-id">' + esc(w.WalletID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(w.UserID || "") + '</span></td>';
        html += '        <td><strong>' + esc(w.UserName || "\u2014") + '</strong></td>';
        html += '        <td>' + esc(w.Mobile || "\u2014") + '</td>';
        html += '        <td><span style="color:var(--accent-green);font-weight:600;">' + fmt(w.Balance || 0) + '</span></td>';
        html += '        <td>' + fmt(w.TotalEarned || 0) + '</td>';
        html += '        <td>' + (w.TransactionCount || 0) + '</td>';
        html += '        <td>' + (w.RewardCount || 0) + '</td>';
        html += '        <td><span style="font-size:11px;color:var(--text-muted);">' + fdt(w.LastTransactionDate) + '</span></td>';
        html += '        <td><button class="module-btn module-btn-primary" style="padding:4px 10px;font-size:11px;" onclick="window._viewWalletDetail(\'' + esc(w.UserID) + '\')">View</button></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._walletPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._walletPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadWalletDetail(session) {
    if (!detailUserId) {
      render();
      return;
    }
    var url = getApiUrl() + "?action=adminwalletdetail&session=" + encodeURIComponent(session) +
      "&userId=" + encodeURIComponent(detailUserId);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Wallet Detail</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletDetailData = json.data || {};
    renderWalletDetail(session);
  }

  function renderWalletDetail(session) {
    var d = walletDetailData;
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDC5B Wallet Detail</h2>';
    html += '    <span class="module-count">User: ' + esc(detailUserId) + '</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._backToExplorer()">\u2190 Back to Explorer</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';
    html += '  <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;border:1px solid var(--border-color);">';
    html += '    <h4 style="color:var(--text-secondary);margin-bottom:12px;">User Information</h4>';
    if (d.user) {
      html += '    <div class="profile-field"><label>User ID</label><span>' + esc(d.user.UserID || "") + '</span></div>';
      html += '    <div class="profile-field"><label>Name</label><span>' + esc(d.user.FullName || "\u2014") + '</span></div>';
      html += '    <div class="profile-field"><label>Mobile</label><span>' + esc(d.user.Mobile || "\u2014") + '</span></div>';
      html += '    <div class="profile-field"><label>Email</label><span>' + esc(d.user.Email || "\u2014") + '</span></div>';
      html += '    <div class="profile-field"><label>City</label><span>' + esc(d.user.City || "\u2014") + '</span></div>';
      html += '    <div class="profile-field"><label>Status</label><span>' + esc(d.user.Status || "\u2014") + '</span></div>';
    } else {
      html += '    <p style="color:var(--text-muted);">User data not available</p>';
    }
    html += '  </div>';
    html += '  <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;border:1px solid var(--border-color);">';
    html += '    <h4 style="color:var(--text-secondary);margin-bottom:12px;">Wallet Information</h4>';
    if (d.wallet) {
      html += '    <div class="profile-field"><label>Wallet ID</label><span class="module-id">' + esc(d.wallet.WalletID || "") + '</span></div>';
      html += '    <div class="profile-field"><label>Balance</label><span style="font-size:20px;font-weight:700;color:var(--accent-green);">' + fmt(d.wallet.Balance || 0) + ' coins</span></div>';
      html += '    <div class="profile-field"><label>Total Earned</label><span>' + fmt(d.wallet.TotalEarned || 0) + '</span></div>';
      html += '    <div class="profile-field"><label>Total Spent</label><span>' + fmt(d.wallet.TotalSpent || 0) + '</span></div>';
      html += '    <div class="profile-field"><label>Last Updated</label><span>' + fdt(d.wallet.LastUpdated) + '</span></div>';
      html += '    <div class="profile-field"><label>Transactions</label><span>' + (d.transactionCount || 0) + '</span></div>';
      html += '    <div class="profile-field"><label>Rewards</label><span>' + (d.rewardCount || 0) + '</span></div>';
    } else {
      html += '    <p style="color:var(--text-muted);">No wallet found</p>';
    }
    html += '  </div>';
    html += '</div>';
    html += '<div style="margin-bottom:20px;">';
    html += '  <h4 style="color:var(--text-secondary);margin-bottom:12px;">Recent Transactions (' + (d.transactionCount || 0) + ')</h4>';
    html += '  <div class="module-table-container">';
    html += '    <table class="module-table">';
    html += '      <thead><tr>';
    html += '        <th>Tx ID</th>';
    html += '        <th>Type</th>';
    html += '        <th>Source</th>';
    html += '        <th>Reference</th>';
    html += '        <th>Amount</th>';
    html += '        <th>Before</th>';
    html += '        <th>After</th>';
    html += '        <th>Status</th>';
    html += '        <th>Date</th>';
    html += '      </tr></thead>';
    html += '      <tbody>';
    var txs = d.transactions || [];
    if (txs.length === 0) {
      html += '        <tr><td colspan="9" class="module-empty">No transactions found</td></tr>';
    } else {
      txs.forEach(function(tx) {
        var amount = Number(tx.Amount || 0);
        html += '      <tr>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(tx.TransactionID || "") + '</span></td>';
        html += '        <td>' + esc(tx.Type || "\u2014") + '</td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.Source || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.ReferenceID || "\u2014") + '</span></td>';
        html += '        <td><span style="color:' + (amount > 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';font-weight:600;">' + (amount > 0 ? '+' : '') + amount + '</span></td>';
        html += '        <td>' + fmt(tx.Before || 0) + '</td>';
        html += '        <td>' + fmt(tx.After || 0) + '</td>';
        html += '        <td><span class="status-badge status-' + (tx.Status || "").toLowerCase() + '">' + esc(tx.Status || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;color:var(--text-muted);">' + fdt(tx.CreatedDate || tx.CreatedAt) + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody></table></div>';
    html += '</div>';
    html += '<div style="margin-bottom:20px;">';
    html += '  <h4 style="color:var(--text-secondary);margin-bottom:12px;">Recent Rewards (' + (d.rewardCount || 0) + ')</h4>';
    html += '  <div class="module-table-container">';
    html += '    <table class="module-table">';
    html += '      <thead><tr>';
    html += '        <th>Reward ID</th>';
    html += '        <th>Ad ID</th>';
    html += '        <th>Coins Earned</th>';
    html += '        <th>Watched (sec)</th>';
    html += '        <th>Completed</th>';
    html += '        <th>Date</th>';
    html += '      </tr></thead>';
    html += '      <tbody>';
    var rewards = d.rewards || [];
    if (rewards.length === 0) {
      html += '        <tr><td colspan="6" class="module-empty">No rewards found</td></tr>';
    } else {
      rewards.forEach(function(r) {
        html += '      <tr>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(r.RewardID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(r.AdID || "\u2014") + '</span></td>';
        html += '        <td><span style="color:var(--accent-green);font-weight:600;">' + fmt(r.CoinsEarned || 0) + '</span></td>';
        html += '        <td>' + (r.LastWatchSecond || r.WatchedSeconds || 0) + '</td>';
        html += '        <td>' + (r.Completed === "Yes" ? "\u2705" : "\u274C") + '</td>';
        html += '        <td><span style="font-size:11px;color:var(--text-muted);">' + fdt(r.CreatedAt || r.LastWatchedAt) + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody></table></div>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 Read-Only View \u2014 Wallet balances, transactions, and rewards cannot be modified.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadTransactions(session) {
    var url = getApiUrl() + "?action=adminwallettransactions&session=" + encodeURIComponent(session) +
      "&page=" + currentPage + "&limit=25";
    if (currentTxSearch) url += "&search=" + encodeURIComponent(currentTxSearch);
    if (currentTxType) url += "&type=" + encodeURIComponent(currentTxType);
    if (currentTxSource) url += "&source=" + encodeURIComponent(currentTxSource);
    if (currentTxStatus) url += "&status=" + encodeURIComponent(currentTxStatus);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Transactions</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderTransactions(session);
  }

  function renderTransactions(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCB3 Wallet Transactions</h2>';
    html += '    <span class="module-count">Read-only view</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'overview\')">\u2190 Back to Overview</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="txSearch" class="module-input" placeholder="Search by TxID, UserID, WalletID, Reference..." value="' + esc(currentTxSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._txSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._txSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearTxSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '  <select class="module-select" id="txTypeFilter" onchange="window._txTypeChange(this.value)" style="max-width:130px;">';
    html += '    <option value="">All Types</option>';
    html += '    <option value="REWARD"' + (currentTxType === "REWARD" ? " selected" : "") + '>REWARD</option>';
    html += '    <option value="PURCHASE"' + (currentTxType === "PURCHASE" ? " selected" : "") + '>PURCHASE</option>';
    html += '    <option value="REDEMPTION"' + (currentTxType === "REDEMPTION" ? " selected" : "") + '>REDEMPTION</option>';
    html += '  </select>';
    html += '  <select class="module-select" id="txSourceFilter" onchange="window._txSourceChange(this.value)" style="max-width:140px;">';
    html += '    <option value="">All Sources</option>';
    html += '    <option value="ADVERTISEMENT"' + (currentTxSource === "ADVERTISEMENT" ? " selected" : "") + '>ADVERTISEMENT</option>';
    html += '    <option value="PROMOTION"' + (currentTxSource === "PROMOTION" ? " selected" : "") + '>PROMOTION</option>';
    html += '  </select>';
    html += '  <select class="module-select" id="txStatusFilter" onchange="window._txStatusChange(this.value)" style="max-width:140px;">';
    html += '    <option value="">All Status</option>';
    html += '    <option value="SUCCESS"' + (currentTxStatus === "SUCCESS" ? " selected" : "") + '>SUCCESS</option>';
    html += '    <option value="PENDING"' + (currentTxStatus === "PENDING" ? " selected" : "") + '>PENDING</option>';
    html += '    <option value="FAILED"' + (currentTxStatus === "FAILED" ? " selected" : "") + '>FAILED</option>';
    html += '  </select>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Transaction ID</th>';
    html += '      <th>User ID</th>';
    html += '      <th>Wallet ID</th>';
    html += '      <th>Type</th>';
    html += '      <th>Source</th>';
    html += '      <th>Reference</th>';
    html += '      <th>Amount</th>';
    html += '      <th>Before</th>';
    html += '      <th>After</th>';
    html += '      <th>Status</th>';
    html += '      <th>Date</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="11" class="module-empty">No transactions found</td></tr>';
    } else {
      walletData.forEach(function(tx) {
        var amount = Number(tx.Amount || 0);
        html += '      <tr>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(tx.TransactionID || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.UserID || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.WalletID || "\u2014") + '</span></td>';
        html += '        <td>' + esc(tx.Type || "\u2014") + '</td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.Source || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(tx.ReferenceID || "\u2014") + '</span></td>';
        html += '        <td><span style="color:' + (amount > 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';font-weight:600;">' + (amount > 0 ? '+' : '') + amount + '</span></td>';
        html += '        <td>' + fmt(tx.Before || 0) + '</td>';
        html += '        <td>' + fmt(tx.After || 0) + '</td>';
        html += '        <td><span class="status-badge status-' + (tx.Status || "").toLowerCase() + '">' + esc(tx.Status || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;color:var(--text-muted);">' + fdt(tx.CreatedDate || tx.CreatedAt) + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._txPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._txPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);margin-top:10px;">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 Read-Only \u2014 Transactions cannot be modified or deleted from this view.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadRewardActivity(session) {
    var url = getApiUrl() + "?action=adminrewardactivity&session=" + encodeURIComponent(session) +
      "&page=" + currentPage + "&limit=25";
    if (currentRewardSearch) url += "&search=" + encodeURIComponent(currentRewardSearch);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Rewards</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderRewardActivity(session);
  }

  function renderRewardActivity(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83C\uDF81 Reward Activity</h2>';
    html += '    <span class="module-count">From AdRewardHistory</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'overview\')">\u2190 Back to Overview</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="rewardSearch" class="module-input" placeholder="Search by RewardID, UserID, AdID..." value="' + esc(currentRewardSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._rewardSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._rewardSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearRewardSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Reward ID</th>';
    html += '      <th>User ID</th>';
    html += '      <th>Ad ID</th>';
    html += '      <th>Coins Earned</th>';
    html += '      <th>Watched (sec)</th>';
    html += '      <th>Completed</th>';
    html += '      <th>Date</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="7" class="module-empty">No reward activity found</td></tr>';
    } else {
      walletData.forEach(function(r) {
        html += '      <tr>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(r.RewardID || "\u2014") + '</span></td>';
        html += '        <td>' + esc(r.UserID || "\u2014") + '</td>';
        html += '        <td><span style="font-size:11px;">' + esc(r.AdID || "\u2014") + '</span></td>';
        html += '        <td><span style="color:var(--accent-green);font-weight:600;">' + fmt(r.CoinsEarned || 0) + '</span></td>';
        html += '        <td>' + (r.LastWatchSecond || r.WatchedSeconds || 0) + '</td>';
        html += '        <td>' + (r.Completed === "Yes" ? "\u2705" : "\u274C") + '</td>';
        html += '        <td><span style="font-size:11px;color:var(--text-muted);">' + fdt(r.CreatedAt || r.LastWatchedAt) + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._rewardPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._rewardPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);margin-top:10px;">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 Read-Only \u2014 Reward records cannot be modified from this view.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadCampaignEconomy(session) {
    var url = getApiUrl() + "?action=admincampaigneconomy&session=" + encodeURIComponent(session) +
      "&page=" + currentPage + "&limit=25";
    if (currentCampaignSearch) url += "&search=" + encodeURIComponent(currentCampaignSearch);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Campaign Economy</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderCampaignEconomy(session);
  }

  function renderCampaignEconomy(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCE2 Campaign Economy</h2>';
    html += '    <span class="module-count">Financial view of PromotionCampaigns</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'overview\')">\u2190 Back to Overview</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div style="background:var(--bg-warning);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--accent-orange);margin-bottom:12px;">';
    html += '  <p style="font-size:12px;color:var(--text-secondary);">\uD83D\uDCCC <strong>Financial Focus:</strong> This view focuses on the reward economy of campaigns. For full campaign management (status, creative, lifecycle), use the <a href="#" onclick="AdminModules.open(\'advertisements\');return false;" style="color:var(--accent-blue);text-decoration:underline;">Advertisement & Promotion Control Center</a>.</p>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="campEconSearch" class="module-input" placeholder="Search by CampaignID, Owner, Type..." value="' + esc(currentCampaignSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._campEconSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._campEconSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearCampEconSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Campaign ID</th>';
    html += '      <th>Owner</th>';
    html += '      <th>Type</th>';
    html += '      <th>Coins Spent</th>';
    html += '      <th>Reward Pool</th>';
    html += '      <th>Reserve</th>';
    html += '      <th>Remaining</th>';
    html += '      <th>Used</th>';
    html += '      <th>Per View</th>';
    html += '      <th>Status</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="10" class="module-empty">No campaigns found</td></tr>';
    } else {
      walletData.forEach(function(c) {
        var usagePercent = c.RewardPool > 0 ? ((c.RewardPoolUsed / c.RewardPool) * 100).toFixed(1) : "0.0";
        html += '      <tr>';
        html += '        <td><span class="module-id">' + esc(c.CampaignID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(c.OwnerUserID || "\u2014") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc((c.CampaignType || "").replace("PROMOTE_", "")) + '</span></td>';
        html += '        <td>' + fmt(c.CoinsSpent || 0) + '</td>';
        html += '        <td>' + fmt(c.RewardPool || 0) + '</td>';
        html += '        <td>' + fmt(c.PlatformReserve || 0) + '</td>';
        html += '        <td><span style="color:var(--accent-green);font-weight:600;">' + fmt(c.RemainingRewardCoins || 0) + '</span></td>';
        html += '        <td>' + fmt(c.RewardPoolUsed || 0) + ' (' + usagePercent + '%)</td>';
        html += '        <td>' + (c.RewardCoins || 0) + '</td>';
        html += '        <td><span class="status-badge status-' + (c.Status || "").toLowerCase() + '">' + esc(c.Status || "") + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._campEconPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._campEconPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);margin-top:10px;">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 Read-Only \u2014 Campaign reward pools cannot be modified from this view.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  function kpiCard(label, value, color) {
    return '<div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:14px;border:1px solid var(--border-color);">' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:' + color + ';">' + value + '</div></div>';
  }

  function fmt(n) {
    n = Number(n);
    if (n >= 10000000) return (n / 10000000).toFixed(2) + "Cr";
    if (n >= 100000) return (n / 100000).toFixed(2) + "L";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function fdt(d) {
    if (!d) return "\u2014";
    try {
      var date = new Date(d);
      if (isNaN(date.getTime())) return String(d).substring(0, 10);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return String(d).substring(0, 10);
    }
  }

  window._econView = function(view) {
    currentView = view;
    currentPage = 1;
    currentSearch = "";
    render();
  };

  window._walletSearch = function() {
    var input = document.getElementById("walletSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    loadWalletExplorer(AdminAuth.getSession());
  };

  window._clearWalletSearch = function() {
    currentSearch = "";
    currentPage = 1;
    loadWalletExplorer(AdminAuth.getSession());
  };

  window._walletPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadWalletExplorer(AdminAuth.getSession());
  };

  window._viewWalletDetail = function(userId) {
    detailUserId = userId;
    currentView = "detail";
    render();
  };

  window._backToExplorer = function() {
    currentView = "explorer";
    currentPage = 1;
    render();
  };

  window._txSearch = function() {
    var input = document.getElementById("txSearch");
    currentTxSearch = input ? input.value.trim() : "";
    currentPage = 1;
    loadTransactions(AdminAuth.getSession());
  };

  window._clearTxSearch = function() {
    currentTxSearch = "";
    currentTxType = "";
    currentTxSource = "";
    currentTxStatus = "";
    currentPage = 1;
    loadTransactions(AdminAuth.getSession());
  };

  window._txTypeChange = function(value) {
    currentTxType = value;
    currentPage = 1;
    loadTransactions(AdminAuth.getSession());
  };

  window._txSourceChange = function(value) {
    currentTxSource = value;
    currentPage = 1;
    loadTransactions(AdminAuth.getSession());
  };

  window._txStatusChange = function(value) {
    currentTxStatus = value;
    currentPage = 1;
    loadTransactions(AdminAuth.getSession());
  };

  window._txPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadTransactions(AdminAuth.getSession());
  };

  window._rewardSearch = function() {
    var input = document.getElementById("rewardSearch");
    currentRewardSearch = input ? input.value.trim() : "";
    currentPage = 1;
    loadRewardActivity(AdminAuth.getSession());
  };

  window._clearRewardSearch = function() {
    currentRewardSearch = "";
    currentPage = 1;
    loadRewardActivity(AdminAuth.getSession());
  };

  window._rewardPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadRewardActivity(AdminAuth.getSession());
  };

  window._campEconSearch = function() {
    var input = document.getElementById("campEconSearch");
    currentCampaignSearch = input ? input.value.trim() : "";
    currentPage = 1;
    loadCampaignEconomy(AdminAuth.getSession());
  };

  window._clearCampEconSearch = function() {
    currentCampaignSearch = "";
    currentPage = 1;
    loadCampaignEconomy(AdminAuth.getSession());
  };

  window._campEconPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadCampaignEconomy(AdminAuth.getSession());
  };

  await render();
});

console.log("Admin Wallet & Economy module loaded (Phase 5.7A)");