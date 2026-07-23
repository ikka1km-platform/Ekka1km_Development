/*
============================================================
EKKA1KM FRONTEND
admin-wallet.js
V5.13.1 - PHASE 5.7B WALLET & REWARDS ECONOMY CONTROL CENTER
+ ECONOMY RECONCILIATION & INTEGRITY MONITORING
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

  // Phase 5.7B Integrity Monitor state
  var integrityView = "summary";
  var integrityPage = 1;
  var integritySearch = "";
  var integrityCategory = "";
  var integritySeverity = "";
  var integrityUserId = "";
  var integrityWalletId = "";
  var integrityCampaignId = "";
  var walletIntegrityData = null;

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
      } else if (currentView === "integrity") {
        await loadIntegrityView(session);
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
    html += '  <button class="module-btn ' + (currentView === "integrity" ? 'module-btn-primary' : 'module-btn-danger') + '" onclick="window._econView(\'integrity\')">\uD83D\uDD0D Integrity Monitor</button>';
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
    html += '    <button class="module-btn module-btn-danger" onclick="window._econView(\'integrity\')">\uD83D\uDD0D Integrity Monitor</button>';
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
    // Load both regular detail and integrity data
    var detailUrl = getApiUrl() + "?action=adminwalletdetail&session=" + encodeURIComponent(session) +
      "&userId=" + encodeURIComponent(detailUserId);
    var integrityUrl = getApiUrl() + "?action=adminwalletdetailintegrity&session=" + encodeURIComponent(session) +
      "&userId=" + encodeURIComponent(detailUserId);

    var [detailResp, integrityResp] = await Promise.all([
      fetch(detailUrl),
      fetch(integrityUrl)
    ]);

    var detailJson = await detailResp.json();
    var integrityJson = await integrityResp.json();

    if (!detailJson || !detailJson.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Wallet Detail</h3><p>' + (detailJson.message || "Unknown error") + '</p></div>';
      return;
    }
    walletDetailData = detailJson.data || {};
    walletIntegrityData = integrityJson.success ? (integrityJson.data || null) : null;
    renderWalletDetail(session);
  }

  function renderWalletDetail(session) {
    var d = walletDetailData;
    var integ = walletIntegrityData;
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

    // Phase 5.7B: Integrity / Reconciliation Section
    if (integ && integ.reconciliation) {
      var rec = integ.reconciliation;
      var recStatus = rec.Status || "UNKNOWN";
      var recColor = recStatus === "MATCHED" ? "var(--accent-green)" : (recStatus === "MISMATCH" ? "var(--accent-red)" : "var(--accent-orange)");
      var chainColor = rec.ChainStatus === "OK" ? "var(--accent-green)" : "var(--accent-red)";
      var rewardColor = rec.RewardConsistency === "CONSISTENT" ? "var(--accent-green)" : "var(--accent-red)";

      html += '<div style="margin-bottom:20px;">';
      html += '  <h4 style="color:var(--text-secondary);margin-bottom:12px;">\uD83D\uDD0D Wallet Integrity & Reconciliation</h4>';
      html += '  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;">';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Reconciliation Status</div>';
      html += '      <div style="font-size:18px;font-weight:700;color:' + recColor + ';">' + recStatus + '</div></div>';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Stored Balance</div>';
      html += '      <div style="font-size:18px;font-weight:700;">' + fmt(rec.StoredBalance || 0) + '</div></div>';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Derived Balance</div>';
      html += '      <div style="font-size:18px;font-weight:700;">' + fmt(rec.DerivedBalance || 0) + '</div></div>';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Variance</div>';
      html += '      <div style="font-size:18px;font-weight:700;color:' + (Math.abs(rec.Variance || 0) > 0.01 ? 'var(--accent-red)' : 'var(--accent-green)') + ';">' + (rec.Variance || 0) + '</div></div>';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Transaction Chain</div>';
      html += '      <div style="font-size:18px;font-weight:700;color:' + chainColor + ';">' + rec.ChainStatus + '</div></div>';
      html += '    <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--border-color);">';
      html += '      <div style="font-size:11px;color:var(--text-muted);">Reward Consistency</div>';
      html += '      <div style="font-size:18px;font-weight:700;color:' + rewardColor + ';">' + rec.RewardConsistency + '</div></div>';
      html += '  </div>';

      // Chain issues detail
      if (rec.ChainIssues && rec.ChainIssues.length > 0) {
        html += '  <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--accent-red);margin-bottom:12px;">';
        html += '    <h5 style="color:var(--accent-red);margin-bottom:8px;">\u26A0\uFE0F Chain Issues (' + rec.ChainIssues.length + ')</h5>';
        rec.ChainIssues.forEach(function(ci) {
          html += '    <div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border-color);">';
          html += '      <span class="module-id" style="font-size:10px;">' + esc(ci.TransactionID || "") + '</span>: ' + esc(ci.Issue || "");
          html += '    </div>';
        });
        html += '  </div>';
      }

      // Anomalies for this wallet
      if (integ.anomalies && integ.anomalies.length > 0) {
        html += '  <div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:12px;border:1px solid var(--accent-orange);">';
        html += '    <h5 style="color:var(--accent-orange);margin-bottom:8px;">\u26A0\uFE0F Detected Anomalies</h5>';
        integ.anomalies.forEach(function(a) {
          var sevColor = a.Severity === "HIGH" ? "var(--accent-red)" : (a.Severity === "MEDIUM" ? "var(--accent-orange)" : "var(--accent-yellow)");
          html += '    <div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-color);">';
          html += '      <span style="color:' + sevColor + ';font-weight:600;">[' + esc(a.Severity) + ']</span> ';
          html += '      <span style="color:var(--text-muted);">' + esc(a.Category) + ':</span> ';
      html += esc(a.Issue || "");
          html += '    </div>';
        });
        html += '  </div>';
      }

      html += '</div>';
    }

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

  // ============================================================
  // PHASE 5.7B: INTEGRITY MONITOR
  // ============================================================

  async function loadIntegrityView(session) {
    if (integrityView === "summary") {
      await loadIntegritySummary(session);
    } else if (integrityView === "walletrec") {
      await loadWalletReconciliation(session);
    } else if (integrityView === "txanomalies") {
      await loadTxAnomalies(session);
    } else if (integrityView === "rewardanomalies") {
      await loadRewardAnomalies(session);
    } else if (integrityView === "duplicaterewards") {
      await loadDuplicateRewards(session);
    } else if (integrityView === "campaignrec") {
      await loadCampaignReconciliation(session);
    } else if (integrityView === "anomalyexplorer") {
      await loadAnomalyExplorer(session);
    }
  }

  async function loadIntegritySummary(session) {
    var response = await fetch(getApiUrl() + "?action=economyintegritysummary&session=" + encodeURIComponent(session));
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Integrity Summary</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletIntegrityData = json.data || {};
    renderIntegritySummary(session);
  }

  function renderIntegritySummary(session) {
    var d = walletIntegrityData;
    var statusColor = d.status === "HEALTHY" ? "var(--accent-green)" : (d.status === "WARNING" ? "var(--accent-orange)" : "var(--accent-red)");
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDD0D Economy Integrity Monitor</h2>';
    html += '    <span class="module-count">' + (d.status || "UNKNOWN") + '</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._econView(\'overview\')">\u2190 Back to Overview</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin:15px 0;flex-wrap:wrap;">';
    html += '  <button class="module-btn ' + (integrityView === "summary" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'summary\')">\uD83D\uDCCA Health Summary</button>';
    html += '  <button class="module-btn ' + (integrityView === "walletrec" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'walletrec\')">\uD83D\uDCB0 Wallet Rec</button>';
    html += '  <button class="module-btn ' + (integrityView === "txanomalies" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'txanomalies\')">\uD83D\uDCB3 TX Anomalies</button>';
    html += '  <button class="module-btn ' + (integrityView === "rewardanomalies" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'rewardanomalies\')">\uD83C\uDF81 Reward Anomalies</button>';
    html += '  <button class="module-btn ' + (integrityView === "duplicaterewards" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'duplicaterewards\')">\uD83D\uDD0D Duplicate Rewards</button>';
    html += '  <button class="module-btn ' + (integrityView === "campaignrec" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'campaignrec\')">\uD83D\uDCE2 Campaign Rec</button>';
    html += '  <button class="module-btn ' + (integrityView === "anomalyexplorer" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._integrityView(\'anomalyexplorer\')">\uD83D\uDD0E Anomaly Explorer</button>';
    html += '</div>';

    // Overall status banner
    html += '<div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:16px;border:2px solid ' + statusColor + ';margin-bottom:16px;text-align:center;">';
    html += '  <div style="font-size:28px;font-weight:700;color:' + statusColor + ';">' + (d.status || "UNKNOWN") + '</div>';
    html += '  <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Overall Economy Health Status</div>';
    html += '</div>';

    // KPI cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">';
    html += kpiCard("Wallets Checked", d.walletsChecked || 0, "#5b8def");
    html += kpiCard("Wallet Mismatches", d.walletMismatches || 0, d.walletMismatches > 0 ? "var(--accent-red)" : "var(--accent-green)");
    html += kpiCard("Transactions Checked", d.transactionsChecked || 0, "#ff9f43");
    html += kpiCard("Transaction Anomalies", d.transactionAnomalies || 0, d.transactionAnomalies > 0 ? "var(--accent-red)" : "var(--accent-green)");
    html += kpiCard("Rewards Checked", d.rewardsChecked || 0, "#7c5cbf");
    html += kpiCard("Duplicate Rewards", d.duplicateRewards || 0, d.duplicateRewards > 0 ? "var(--accent-red)" : "var(--accent-green)");
    html += kpiCard("Reward/TX Mismatches", d.rewardTxMismatches || 0, d.rewardTxMismatches > 0 ? "var(--accent-orange)" : "var(--accent-green)");
    html += kpiCard("Campaigns Checked", d.campaignsChecked || 0, "#45d0e6");
    html += kpiCard("Campaign Mismatches", d.campaignMismatches || 0, d.campaignMismatches > 0 ? "var(--accent-red)" : "var(--accent-green)");
    html += kpiCard("Total Coin Variance", fmt(d.totalCoinVariance || 0), d.totalCoinVariance > 0 ? "var(--accent-orange)" : "var(--accent-green)");
    html += '</div>';

    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 <strong>Read-Only Detection:</strong> This monitor detects and reports inconsistencies. No automatic corrections are applied. Manual adjustment requires Founder permission in a controlled phase.</p>';
    html += '  <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">\u23F0 Last checked: ' + fdt(d.timestamp) + '</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadWalletReconciliation(session) {
    var url = getApiUrl() + "?action=walletreconciliation&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    if (integritySearch) url += "&search=" + encodeURIComponent(integritySearch);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Wallet Reconciliation</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderWalletReconciliation(session);
  }

  function renderWalletReconciliation(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCB0 Wallet Reconciliation</h2>';
    html += '    <span class="module-count">' + walletData.length + ' wallets</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="intSearch" class="module-input" placeholder="Search by WalletID, UserID, Name..." value="' + esc(integritySearch) + '" onkeyup="if(event.key===\'Enter\'){ window._intSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._intSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearIntSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Wallet ID</th>';
    html += '      <th>User</th>';
    html += '      <th>Stored</th>';
    html += '      <th>Derived</th>';
    html += '      <th>Variance</th>';
    html += '      <th>Credits</th>';
    html += '      <th>Debits</th>';
    html += '      <th>Txs</th>';
    html += '      <th>Status</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="9" class="module-empty">No wallets found</td></tr>';
    } else {
      walletData.forEach(function(w) {
        var statusColor = w.Status === "MATCHED" ? "var(--accent-green)" : (w.Status === "MISMATCH" ? "var(--accent-red)" : "var(--accent-orange)");
        html += '      <tr>';
        html += '        <td><span class="module-id">' + esc(w.WalletID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(w.UserID || "") + '</span><br><span style="font-size:10px;color:var(--text-muted);">' + esc(w.UserName || "") + '</span></td>';
        html += '        <td style="font-weight:600;">' + fmt(w.StoredBalance || 0) + '</td>';
        html += '        <td>' + fmt(w.DerivedBalance || 0) + '</td>';
        html += '        <td style="color:' + (Math.abs(w.Variance || 0) > 0.01 ? 'var(--accent-red)' : 'var(--accent-green)') + ';font-weight:600;">' + (w.Variance || 0) + '</td>';
        html += '        <td>' + fmt(w.Credits || 0) + '</td>';
        html += '        <td>' + fmt(w.Debits || 0) + '</td>';
        html += '        <td>' + (w.TransactionCount || 0) + '</td>';
        html += '        <td><span style="color:' + statusColor + ';font-weight:600;">' + esc(w.Status || "") + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    html += '<div style="background:var(--bg-secondary);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border-color);margin-top:10px;">';
    html += '  <p style="font-size:12px;color:var(--text-muted);">\uD83D\uDD12 Read-Only \u2014 Wallet balances are not modified by this reconciliation.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadTxAnomalies(session) {
    var url = getApiUrl() + "?action=transactionanomalies&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Transaction Anomalies</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderTxAnomalies(session);
  }

  function renderTxAnomalies(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCB3 Transaction Anomalies</h2>';
    html += '    <span class="module-count">' + walletData.length + ' issues</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Severity</th>';
    html += '      <th>Entity ID</th>';
    html += '      <th>User</th>';
    html += '      <th>Wallet</th>';
    html += '      <th>Issue</th>';
    html += '      <th>Expected</th>';
    html += '      <th>Actual</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="7" class="module-empty">\u2705 No transaction anomalies detected</td></tr>';
    } else {
      walletData.forEach(function(a) {
        var sevColor = a.Severity === "HIGH" ? "var(--accent-red)" : (a.Severity === "MEDIUM" ? "var(--accent-orange)" : "var(--accent-yellow)");
        html += '      <tr>';
        html += '        <td><span style="color:' + sevColor + ';font-weight:600;">' + esc(a.Severity || "") + '</span></td>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(a.EntityID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.RelatedUser || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.RelatedWallet || "") + '</span></td>';
        html += '        <td style="font-size:12px;">' + esc(a.Issue || "") + '</td>';
        html += '        <td style="font-size:11px;color:var(--text-muted);">' + esc(a.Expected || "") + '</td>';
        html += '        <td style="font-size:11px;color:var(--accent-red);">' + esc(a.Actual || "") + '</td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadRewardAnomalies(session) {
    var url = getApiUrl() + "?action=rewardanomalies&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Reward Anomalies</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderRewardAnomalies(session);
  }

  function renderRewardAnomalies(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83C\uDF81 Reward Anomalies</h2>';
    html += '    <span class="module-count">' + walletData.length + ' issues</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Severity</th>';
    html += '      <th>Reward ID</th>';
    html += '      <th>User</th>';
    html += '      <th>Campaign/Ad</th>';
    html += '      <th>Issue</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="5" class="module-empty">\u2705 No reward anomalies detected</td></tr>';
    } else {
      walletData.forEach(function(a) {
        var sevColor = a.Severity === "HIGH" ? "var(--accent-red)" : (a.Severity === "MEDIUM" ? "var(--accent-orange)" : "var(--accent-yellow)");
        html += '      <tr>';
        html += '        <td><span style="color:' + sevColor + ';font-weight:600;">' + esc(a.Severity || "") + '</span></td>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(a.EntityID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.RelatedUser || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.RelatedCampaign || "") + '</span></td>';
        html += '        <td style="font-size:12px;">' + esc(a.Issue || "") + '</td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadDuplicateRewards(session) {
    var url = getApiUrl() + "?action=duplicaterewards&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Duplicate Rewards</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderDuplicateRewards(session);
  }

  function renderDuplicateRewards(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDD0D Duplicate Reward Detection</h2>';
    html += '    <span class="module-count">' + walletData.length + ' groups</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>User ID</th>';
    html += '      <th>Ad/Campaign</th>';
    html += '      <th>Source</th>';
    html += '      <th>Records</th>';
    html += '      <th>Duplicates</th>';
    html += '      <th>Total Coins</th>';
    html += '      <th>Reason</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="7" class="module-empty">\u2705 No duplicate rewards detected</td></tr>';
    } else {
      walletData.forEach(function(d) {
        html += '      <tr>';
        html += '        <td><span style="font-size:11px;">' + esc(d.UserID || "") + '</span></td>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(d.AdID || d.CampaignID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(d.Source || "") + '</span></td>';
        html += '        <td style="font-weight:600;">' + (d.RecordCount || 0) + '</td>';
        html += '        <td style="color:var(--accent-red);font-weight:600;">+' + (d.DuplicateCount || 0) + '</td>';
        html += '        <td>' + fmt(d.TotalCoins || 0) + '</td>';
        html += '        <td style="font-size:11px;color:var(--text-muted);">' + esc(d.Reason || "") + '</td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadCampaignReconciliation(session) {
    var url = getApiUrl() + "?action=campaignreconciliation&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    if (integritySearch) url += "&search=" + encodeURIComponent(integritySearch);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Campaign Reconciliation</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderCampaignReconciliation(session);
  }

  function renderCampaignReconciliation(session) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDCE2 Campaign Reconciliation</h2>';
    html += '    <span class="module-count">' + walletData.length + ' campaigns</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="intSearch" class="module-input" placeholder="Search by CampaignID, Owner, Type..." value="' + esc(integritySearch) + '" onkeyup="if(event.key===\'Enter\'){ window._intSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._intSearch()">\uD83D\uDD0D Search</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearIntSearch()">\u2715 Clear</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Campaign</th>';
    html += '      <th>Owner</th>';
    html += '      <th>Pool</th>';
    html += '      <th>Remaining</th>';
    html += '      <th>Distributed</th>';
    html += '      <th>Expected Rem</th>';
    html += '      <th>Variance</th>';
    html += '      <th>Status</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="8" class="module-empty">No campaigns found</td></tr>';
    } else {
      walletData.forEach(function(c) {
        var acctColor = c.AccountingStatus === "HEALTHY" ? "var(--accent-green)" : (c.AccountingStatus === "WARNING" ? "var(--accent-orange)" : (c.AccountingStatus === "MISMATCH" ? "var(--accent-red)" : "var(--text-muted)"));
        html += '      <tr>';
        html += '        <td><span class="module-id">' + esc(c.CampaignID || "") + '</span><br><span style="font-size:10px;color:var(--text-muted);">' + esc((c.CampaignType || "").replace("PROMOTE_", "")) + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(c.OwnerUserID || "") + '</span></td>';
        html += '        <td>' + fmt(c.RewardPool || 0) + '</td>';
        html += '        <td>' + fmt(c.RemainingRewardCoins || 0) + '</td>';
        html += '        <td>' + fmt(c.RewardsDistributed || 0) + '</td>';
        html += '        <td>' + fmt(c.ExpectedRemaining || 0) + '</td>';
        html += '        <td style="color:' + (Math.abs(c.Variance || 0) > 0.01 ? 'var(--accent-red)' : 'var(--accent-green)') + ';font-weight:600;">' + (c.Variance || 0) + '</td>';
        html += '        <td><span style="color:' + acctColor + ';font-weight:600;">' + esc(c.AccountingStatus || "") + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadAnomalyExplorer(session) {
    var url = getApiUrl() + "?action=anomalyexplorer&session=" + encodeURIComponent(session) +
      "&page=" + integrityPage + "&limit=25";
    if (integritySearch) url += "&search=" + encodeURIComponent(integritySearch);
    if (integrityCategory) url += "&category=" + encodeURIComponent(integrityCategory);
    if (integritySeverity) url += "&severity=" + encodeURIComponent(integritySeverity);
    if (integrityUserId) url += "&userId=" + encodeURIComponent(integrityUserId);
    if (integrityWalletId) url += "&walletId=" + encodeURIComponent(integrityWalletId);
    if (integrityCampaignId) url += "&campaignId=" + encodeURIComponent(integrityCampaignId);
    var response = await fetch(url);
    var json = await response.json();
    if (!json || !json.success) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">\u26A0\uFE0F</span><h3>Failed to Load Anomaly Explorer</h3><p>' + (json.message || "Unknown error") + '</p></div>';
      return;
    }
    walletData = json.data.data || [];
    totalPages = json.data.totalPages || 1;
    renderAnomalyExplorer(session, json.data.filters);
  }

  function renderAnomalyExplorer(session, filters) {
    var html = "";
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">\uD83D\uDD0E Consolidated Anomaly Explorer</h2>';
    html += '    <span class="module-count">' + walletData.length + ' anomalies</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._integrityView(\'summary\')">\u2190 Back to Summary</button>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="module-filters" style="flex-wrap:wrap;">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="intSearch" class="module-input" placeholder="Search anomalies..." value="' + esc(integritySearch) + '" onkeyup="if(event.key===\'Enter\'){ window._intSearch(); }" style="min-width:150px;" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._intSearch()">\uD83D\uDD0D</button>';
    html += '    <button class="module-btn module-btn-secondary" onclick="window._clearIntSearch()">\u2715</button>';
    html += '  </div>';
    html += '  <select class="module-select" onchange="window._intCategoryChange(this.value)" style="max-width:120px;">';
    html += '    <option value="">All Categories</option>';
    if (filters && filters.categories) {
      filters.categories.forEach(function(c) {
        html += '    <option value="' + c + '"' + (integrityCategory === c ? ' selected' : '') + '>' + c + '</option>';
      });
    }
    html += '  </select>';
    html += '  <select class="module-select" onchange="window._intSeverityChange(this.value)" style="max-width:100px;">';
    html += '    <option value="">All Severity</option>';
    if (filters && filters.severities) {
      filters.severities.forEach(function(s) {
        html += '    <option value="' + s + '"' + (integritySeverity === s ? ' selected' : '') + '>' + s + '</option>';
      });
    }
    html += '  </select>';
    html += '  <input type="text" class="module-input" placeholder="UserID" value="' + esc(integrityUserId) + '" onchange="window._intUserIdChange(this.value)" style="max-width:100px;" />';
    html += '  <input type="text" class="module-input" placeholder="WalletID" value="' + esc(integrityWalletId) + '" onchange="window._intWalletIdChange(this.value)" style="max-width:100px;" />';
    html += '  <input type="text" class="module-input" placeholder="CampaignID" value="' + esc(integrityCampaignId) + '" onchange="window._intCampaignIdChange(this.value)" style="max-width:100px;" />';
    html += '</div>';
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Severity</th>';
    html += '      <th>Category</th>';
    html += '      <th>Entity</th>';
    html += '      <th>User</th>';
    html += '      <th>Issue</th>';
    html += '      <th>Expected</th>';
    html += '      <th>Actual</th>';
    html += '      <th>Diff</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (walletData.length === 0) {
      html += '      <tr><td colspan="8" class="module-empty">\u2705 No anomalies found matching filters</td></tr>';
    } else {
      walletData.forEach(function(a) {
        var sevColor = a.Severity === "HIGH" ? "var(--accent-red)" : (a.Severity === "MEDIUM" ? "var(--accent-orange)" : "var(--accent-yellow)");
        html += '      <tr>';
        html += '        <td><span style="color:' + sevColor + ';font-weight:600;">' + esc(a.Severity || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.Category || "") + '</span></td>';
        html += '        <td><span class="module-id" style="font-size:10px;">' + esc(a.EntityID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + esc(a.RelatedUser || "") + '</span></td>';
        html += '        <td style="font-size:12px;">' + esc(a.Issue || "") + '</td>';
        html += '        <td style="font-size:11px;color:var(--text-muted);">' + esc(a.Expected || "") + '</td>';
        html += '        <td style="font-size:11px;color:var(--accent-red);">' + esc(a.Actual || "") + '</td>';
        html += '        <td style="font-size:11px;font-weight:600;">' + esc(a.Difference || "") + '</td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage - 1) + ')" ' + (integrityPage <= 1 ? 'disabled' : '') + '>\u2190 Previous</button>';
    html += '  <span class="module-page-info">Page ' + integrityPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._intPage(' + (integrityPage + 1) + ')" ' + (integrityPage >= totalPages ? 'disabled' : '') + '>Next \u2192</button>';
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

  // Phase 5.7B Integrity Monitor navigation
  window._integrityView = function(view) {
    integrityView = view;
    integrityPage = 1;
    integritySearch = "";
    integrityCategory = "";
    integritySeverity = "";
    integrityUserId = "";
    integrityWalletId = "";
    integrityCampaignId = "";
    currentView = "integrity";
    render();
  };

  window._intSearch = function() {
    var input = document.getElementById("intSearch");
    integritySearch = input ? input.value.trim() : "";
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._clearIntSearch = function() {
    integritySearch = "";
    integrityCategory = "";
    integritySeverity = "";
    integrityUserId = "";
    integrityWalletId = "";
    integrityCampaignId = "";
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intPage = function(page) {
    if (page < 1 || page > totalPages) return;
    integrityPage = page;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intCategoryChange = function(value) {
    integrityCategory = value;
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intSeverityChange = function(value) {
    integritySeverity = value;
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intUserIdChange = function(value) {
    integrityUserId = value;
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intWalletIdChange = function(value) {
    integrityWalletId = value;
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  window._intCampaignIdChange = function(value) {
    integrityCampaignId = value;
    integrityPage = 1;
    loadIntegrityView(AdminAuth.getSession());
  };

  await render();
});

console.log("Admin Wallet & Economy module loaded (Phase 5.7B)");