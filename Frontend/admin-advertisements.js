/*
============================================================
EKKA1KM FRONTEND
admin-advertisements.js
V5.12.0 - PHASE 5.6A ADVERTISEMENT & PROMOTION CONTROL CENTER
Campaign Explorer + Details + Overview
Read-only data from real PromotionCampaigns + legacy Advertisements
============================================================
*/

AdminModules.register("advertisements", async function(container) {

  var currentPage = 1;
  var currentSearch = "";
  var currentStatus = "";
  var currentCreativeType = "";
  var totalPages = 1;
  var campaignsData = [];
  var summaryStats = {};
  var currentDetailCampaign = null;
  var activeSubTab = "campaigns";

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
    container.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading Advertisement & Promotion Control Center...</p></div>';
    try {
      var url = getApiUrl() + "?action=adminpromotioncampaigns&session=" + encodeURIComponent(session) +
        "&page=" + currentPage + "&limit=25";
      if (currentSearch) url += "&search=" + encodeURIComponent(currentSearch);
      if (currentStatus) url += "&status=" + encodeURIComponent(currentStatus);
      if (currentCreativeType) url += "&creativeType=" + encodeURIComponent(currentCreativeType);
      var response = await fetch(url);
      var json = await response.json();
      if (!json || !json.success) {
        container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Campaigns</h3><p>' + (json.message || "Unknown error") + '</p></div>';
        return;
      }
      campaignsData = json.data.data || [];
      totalPages = json.data.totalPages || 1;
      summaryStats = json.data.stats || {};
      renderContent(session);
    } catch (err) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + escapeHtml(err.message) + '</p></div>';
    }
  }

  /*
  ============================================================
  RENDER CONTENT
  ============================================================
  */
  function renderContent(session) {
    var html = "";
    // Header
    html += '<div class="module-header">';
    html += '  <div class="module-header-left">';
    html += '    <h2 class="module-title">📢 Advertisement & Promotion Control Center</h2>';
    html += '    <span class="module-count">' + (summaryStats.totalCampaigns || 0) + ' total campaigns</span>';
    html += '  </div>';
    html += '  <div class="module-header-right">';
    html += '    <button class="module-btn module-btn-secondary" onclick="AdminModules.open(\'dashboard\')">← Back to Dashboard</button>';
    html += '  </div>';
    html += '</div>';
    // KPI Cards
    html += renderKpiCards();
    // Sub-tabs: Campaigns | Legacy Ads
    html += '<div style="display:flex;gap:8px;margin:15px 0;">';
    html += '  <button class="module-btn ' + (activeSubTab === "campaigns" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._adTab(\'campaigns\')">📢 Promotion Campaigns</button>';
    html += '  <button class="module-btn ' + (activeSubTab === "legacy" ? 'module-btn-primary' : 'module-btn-secondary') + '" onclick="window._adTab(\'legacy\')">📋 Legacy Advertisements</button>';
    html += '</div>';
    if (activeSubTab === "campaigns") {
      html += renderCampaignsTab(session);
    } else {
      html += '<div id="legacyAdsContainer"><div class="module-loading"><div class="loader"></div><p>Loading legacy advertisements...</p></div></div>';
    }
    container.innerHTML = html;
    if (activeSubTab === "legacy") {
      loadLegacyAds(session);
    }
  }

  /*
  ============================================================
  RENDER KPI CARDS
  ============================================================
  */
  function renderKpiCards() {
    var s = summaryStats;
    var ctr = s.totalViews > 0 ? ((s.totalClicks / s.totalViews) * 100).toFixed(2) : "0.00";
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">';
    html += kpiCard("📊 Total", s.totalCampaigns || 0, "#5b8def");
    html += kpiCard("🟢 Active", s.activeCount || 0, "#4caf88");
    html += kpiCard("⏸️ Paused", s.pausedCount || 0, "#ff9f43");
    html += kpiCard("⏳ Pending", s.pendingCount || 0, "#a0a0c0");
    html += kpiCard("✅ Completed", s.expiredCount || 0, "#6a6a8a");
    html += kpiCard("👁️ Views", s.totalViews || 0, "#7c5cbf");
    html += kpiCard("🖱️ Clicks", s.totalClicks || 0, "#45d0e6");
    html += kpiCard("📈 CTR", ctr + "%", "#ff4757");
    html += kpiCard("💬 Interested", s.totalInterested || 0, "#9b59b6");
    html += kpiCard("🔄 Shares", s.totalShares || 0, "#3498db");
    html += kpiCard("🪙 Coins Spent", formatNumber(s.totalCoinsSpent || 0), "#ff9f43");
    html += kpiCard("💰 Reward Pool", formatNumber(s.totalRewardPool || 0), "#4caf88");
    html += kpiCard("💎 Remaining", formatNumber(s.totalRemainingRewardCoins || 0), "#5b8def");
    html += '</div>';
    return html;
  }

  function kpiCard(label, value, color) {
    return '<div style="background:var(--bg-card);border-radius:var(--radius-sm);padding:14px;border:1px solid var(--border-color);">' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:' + color + ';">' + value + '</div></div>';
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  /*
  ============================================================
  HELPER: NORMALIZE BOOLEAN
  Safely converts various boolean representations to "Yes"/"No"
  ============================================================
  */
  function normalizeBoolean(value, defaultValue) {
    if (!value) return defaultValue || "No";
    
    const str = String(value).trim().toLowerCase();
    
    // Truthy values
    if (["yes", "true", "1", "y", "on"].indexOf(str) !== -1) {
      return "Yes";
    }
    
    // Falsy values
    if (["no", "false", "0", "n", "off", ""].indexOf(str) !== -1) {
      return "No";
    }
    
    // If unrecognized, return default
    return defaultValue || "No";
  }

  /*
  ============================================================
  RENDER CAMPAIGNS TAB
  ============================================================
  */
  function renderCampaignsTab(session) {
    var html = "";
    // Filters
    html += '<div class="module-filters">';
    html += '  <div class="module-search">';
    html += '    <input type="text" id="campSearch" class="module-input" placeholder="Search by ID, type, owner, target, city..." value="' + escapeHtml(currentSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._campSearch(); }" />';
    html += '    <button class="module-btn module-btn-primary" onclick="window._campSearch()">🔍 Search</button>';
    html += '  </div>';
    html += '  <select class="module-select" id="campStatusFilter" onchange="window._campStatusChange(this.value)">';
    html += '    <option value="">All Status</option>';
    html += '    <option value="active"' + (currentStatus === "active" ? " selected" : "") + '>Active</option>';
    html += '    <option value="paused"' + (currentStatus === "paused" ? " selected" : "") + '>Paused</option>';
    html += '    <option value="pending"' + (currentStatus === "pending" ? " selected" : "") + '>Pending</option>';
    html += '    <option value="expired"' + (currentStatus === "expired" ? " selected" : "") + '>Expired/Ended</option>';
    html += '  </select>';
    html += '  <select class="module-select" id="campCreativeFilter" onchange="window._campCreativeChange(this.value)">';
    html += '    <option value="">All Creative</option>';
    html += '    <option value="IMAGE"' + (currentCreativeType === "IMAGE" ? " selected" : "") + '>IMAGE</option>';
    html += '    <option value="BANNER"' + (currentCreativeType === "BANNER" ? " selected" : "") + '>BANNER</option>';
    html += '    <option value="VIDEO"' + (currentCreativeType === "VIDEO" ? " selected" : "") + '>VIDEO</option>';
    html += '    <option value="PAGE"' + (currentCreativeType === "PAGE" ? " selected" : "") + '>PAGE</option>';
    html += '  </select>';
    html += '</div>';
    // Table
    html += '<div class="module-table-container">';
    html += '  <table class="module-table">';
    html += '    <thead><tr>';
    html += '      <th>Campaign ID</th>';
    html += '      <th>Type</th>';
    html += '      <th>Owner</th>';
    html += '      <th>Creative</th>';
    html += '      <th>Target</th>';
    html += '      <th>Location</th>';
    html += '      <th>Status</th>';
    html += '      <th>Views</th>';
    html += '      <th>Clicks</th>';
    html += '      <th>💰 Remaining</th>';
    html += '    </tr></thead>';
    html += '    <tbody>';
    if (campaignsData.length === 0) {
      html += '      <tr><td colspan="10" class="module-empty">No campaigns found</td></tr>';
    } else {
      campaignsData.forEach(function(c) {
        var statusClass = (c.Status || "active").toLowerCase();
        var locationParts = [];
        if (c.City) locationParts.push(c.City);
        if (c.State) locationParts.push(c.State);
        if (c.Country) locationParts.push(c.Country);
        var location = locationParts.length > 0 ? locationParts.join(", ") : (c.Radius || "All India");
        var creativeBadge = getCreativeBadge(c.CreativeType || "IMAGE");
        html += '      <tr onclick="window._viewCampaign(\'' + escapeHtml(c.CampaignID) + '\')" style="cursor:pointer;">';
        html += '        <td><span class="module-id">' + escapeHtml(c.CampaignID) + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + escapeHtml((c.CampaignType || "").replace("PROMOTE_", "")) + '</span></td>';
        html += '        <td><strong>' + escapeHtml(c.OwnerName || c.OwnerUserID || "") + '</strong></td>';
        html += '        <td>' + creativeBadge + '</td>';
        html += '        <td><span style="font-size:11px;">' + escapeHtml(c.TargetType || "") + ' ' + escapeHtml(c.TargetID || "") + '</span></td>';
        html += '        <td><span style="font-size:11px;">' + escapeHtml(location) + '</span></td>';
        html += '        <td><span class="status-badge status-' + statusClass + '">' + escapeHtml(c.Status || "") + '</span></td>';
        html += '        <td>' + (c.Views || 0) + '</td>';
        html += '        <td>' + (c.Clicks || 0) + '</td>';
        html += '        <td><span style="color:var(--accent-green);font-weight:600;">' + formatNumber(c.RemainingRewardCoins || 0) + '</span></td>';
        html += '      </tr>';
      });
    }
    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';
    // Pagination
    html += '<div class="module-pagination">';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._campPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Previous</button>';
    html += '  <span class="module-page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
    html += '  <button class="module-btn module-btn-secondary" onclick="window._campPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
    html += '</div>';
    return html;
  }

  function getCreativeBadge(ct) {
    var colors = { IMAGE: "#4caf88", BANNER: "#5b8def", VIDEO: "#ff4757", PAGE: "#ff9f43" };
    var color = colors[ct] || "#a0a0c0";
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:' + color + '20;color:' + color + ';border:1px solid ' + color + '40;">' + ct + '</span>';
  }

  /*
  ============================================================
  LEGACY ADS TAB
  ============================================================
  */
  async function loadLegacyAds(session) {
    var containerEl = document.getElementById("legacyAdsContainer");
    if (!containerEl) return;
    try {
      var response = await fetch(getApiUrl() + "?action=adminadvertisements&session=" + encodeURIComponent(session) + "&page=1&limit=50");
      var json = await response.json();
      if (!json || !json.success) {
        containerEl.innerHTML = '<div class="module-error">Failed to load legacy advertisements.</div>';
        return;
      }
      var ads = json.data.data || [];
      var html = '<div class="module-table-container"><table class="module-table"><thead><tr>';
      html += '<th>Ad ID</th><th>Title</th><th>Type</th><th>Image</th><th>External URL</th><th>Status</th><th>PIP</th>';
      html += '</tr></thead><tbody>';
      if (ads.length === 0) {
        html += '<tr><td colspan="7" class="module-empty">No legacy advertisements found</td></tr>';
      } else {
        ads.forEach(function(ad) {
          html += '<tr>';
          html += '<td><span class="module-id">' + escapeHtml(ad.AdID || "") + '</span></td>';
          html += '<td>' + escapeHtml(ad.Title || "") + '</td>';
          html += '<td>' + escapeHtml(ad.AdType || "") + '</td>';
          html += '<td>' + (ad.ImageURL ? '<a href="' + escapeHtml(ad.ImageURL) + '" target="_blank" rel="noopener">🔗</a>' : "—") + '</td>';
          html += '<td>' + (ad.ExternalURL ? '<span style="font-size:11px;">' + escapeHtml(ad.ExternalURL.substring(0, 30)) + '</span>' : "—") + '</td>';
          html += '<td><span class="status-badge status-' + (ad.Status || "").toLowerCase() + '">' + escapeHtml(ad.Status || "") + '</span></td>';
          html += '<td>' + (ad.ShowInPIP === "Yes" ? "✅" : "—") + '</td>';
          html += '</tr>';
        });
      }
      html += '</tbody></table></div>';
      html += '<p style="color:var(--text-muted);font-size:12px;margin-top:10px;">Showing ' + ads.length + ' legacy advertisements (read-only).</p>';
      containerEl.innerHTML = html;
    } catch (err) {
      containerEl.innerHTML = '<div class="module-error">Error: ' + escapeHtml(err.message) + '</div>';
    }
  }

  /*
  ============================================================
  CAMPAIGN DETAIL MODAL
  ============================================================
  */
  async function showCampaignDetail(campaignId) {
    var session = AdminAuth.getSession();
    if (!session) return;
    // Find from already loaded data
    var campaign = null;
    for (var i = 0; i < campaignsData.length; i++) {
      if (campaignsData[i].CampaignID === campaignId) {
        campaign = campaignsData[i];
        break;
      }
    }
    if (!campaign) {
      showToast("Campaign not found in current view", "error");
      return;
    }
    var locationParts = [];
    if (campaign.City) locationParts.push(campaign.City);
    if (campaign.District) locationParts.push(campaign.District);
    if (campaign.State) locationParts.push(campaign.State);
    if (campaign.Country) locationParts.push(campaign.Country);
    var location = locationParts.length > 0 ? locationParts.join(", ") : (campaign.Radius || "Not specified");
    var ctr = campaign.Views > 0 ? ((campaign.Clicks / campaign.Views) * 100).toFixed(2) + "%" : "N/A";
    var interestRate = campaign.Views > 0 ? ((campaign.Interested / campaign.Views) * 100).toFixed(2) + "%" : "N/A";
    var statusLower = (campaign.Status || "").toLowerCase();
    // Normalize Featured/PIPEnabled for reliable comparison
    var featuredNormalized = normalizeBoolean(campaign.Featured, "No");
    var pipEnabledNormalized = normalizeBoolean(campaign.PIPEnabled, "Yes");
    var mhtml = '<div class="modal-overlay" onclick="closeModal(event)">';
    mhtml += '  <div class="modal-content modal-lg" onclick="event.stopPropagation()">';
    mhtml += '    <div class="modal-header">';
    mhtml += '      <h3>📢 Campaign: ' + escapeHtml(campaign.CampaignID) + '</h3>';
    mhtml += '      <button class="modal-close" onclick="closeModal()">✕</button>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-body">';
    // Two-column layout
    mhtml += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    // Left column
    mhtml += '    <div>';
    mhtml += '      <div class="profile-field"><label>Campaign ID</label><span>' + escapeHtml(campaign.CampaignID) + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Campaign Type</label><span>' + escapeHtml(campaign.CampaignType || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Owner</label><span>' + escapeHtml(campaign.OwnerName || campaign.OwnerUserID || "Unknown") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Title</label><span>' + escapeHtml(campaign.Title || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Creative Type</label><span>' + getCreativeBadge(campaign.CreativeType || "IMAGE") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>CTA</label><span>' + escapeHtml(campaign.CTA || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Destination Type</label><span>' + escapeHtml(campaign.DestinationType || "None") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Target</label><span>' + escapeHtml(campaign.TargetType || "") + ' ' + escapeHtml(campaign.TargetID || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Status</label><span class="status-badge status-' + statusLower + '">' + escapeHtml(campaign.Status || "") + '</span></div>';
    if (featuredNormalized === "Yes") {
      mhtml += '      <div class="profile-field"><label>Featured</label><span style="color:var(--accent-orange);">⭐ Yes</span></div>';
    }
    mhtml += '      <div class="profile-field"><label>PIP Enabled</label><span>' + (pipEnabledNormalized === "Yes" ? "✅" : "❌") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Priority</label><span>' + (campaign.Priority || 0) + '</span></div>';
    mhtml += '    </div>';
    // Right column
    mhtml += '    <div>';
    mhtml += '      <div class="profile-field"><label>Location</label><span>' + escapeHtml(location) + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Radius</label><span>' + escapeHtml(campaign.Radius || "All India") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Start Date</label><span>' + escapeHtml(campaign.StartDate || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>End Date</label><span>' + escapeHtml(campaign.EndDate || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Created Date</label><span>' + escapeHtml(campaign.CreatedDate || "") + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Views</label><span style="color:var(--accent-blue);font-weight:600;">' + (campaign.Views || 0) + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Clicks</label><span style="color:var(--accent-cyan);font-weight:600;">' + (campaign.Clicks || 0) + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Interested</label><span>' + (campaign.Interested || 0) + '</span></div>';
    mhtml += '      <div class="profile-field"><label>Shares</label><span>' + (campaign.Shares || 0) + '</span></div>';
    mhtml += '    </div></div>';
    
    // Phase 5.6C - Campaign Performance Section
    var shareRate = campaign.Views > 0 ? ((campaign.Shares / campaign.Views) * 100).toFixed(2) : "0.00";
    var performanceLabel = getPerformanceLabel(campaign.Views, campaign.Clicks, campaign.Interested, campaign.Shares);
    mhtml += '    <div style="margin-top:20px;padding-top:16px;border-top:2px solid var(--border-color);">';
    mhtml += '      <h4 style="margin-bottom:12px;color:var(--text-secondary);">📊 Campaign Performance</h4>';
    mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    mhtml += '        <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
    mhtml += '          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">CTR (Click-Through Rate)</div>';
    mhtml += '          <div style="font-size:20px;font-weight:700;color:var(--accent-orange);">' + ctr + '</div>';
    mhtml += '        </div>';
    mhtml += '        <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
    mhtml += '          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Interest Rate</div>';
    mhtml += '          <div style="font-size:20px;font-weight:700;color:var(--accent-purple);">' + interestRate + '</div>';
    mhtml += '        </div>';
    mhtml += '        <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
    mhtml += '          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Share Rate</div>';
    mhtml += '          <div style="font-size:20px;font-weight:700;color:var(--accent-blue);">' + shareRate + '%</div>';
    mhtml += '        </div>';
    mhtml += '        <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
    mhtml += '          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Performance</div>';
    mhtml += '          <div style="font-size:14px;font-weight:600;color:var(--text-primary);">' + performanceLabel + '</div>';
    mhtml += '        </div>';
    mhtml += '      </div>';
    mhtml += '    </div>';
    
    // Phase 5.6C - Campaign Economy Section
    var rewardPoolUsed = Number(campaign.RewardPool || 0) - Number(campaign.RemainingRewardCoins || 0);
    var rewardPoolUsage = campaign.RewardPool > 0 ? ((rewardPoolUsed / campaign.RewardPool) * 100).toFixed(2) : "0.00";
    var usageBarWidth = Math.min(100, Math.max(0, rewardPoolUsage));
    mhtml += '    <div style="margin-top:20px;padding-top:16px;border-top:2px solid var(--border-color);">';
    mhtml += '      <h4 style="margin-bottom:12px;color:var(--text-secondary);">💰 Campaign Economy</h4>';
    mhtml += '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
    mhtml += '        <div class="profile-field"><label>Coins Spent</label><span>' + formatNumber(campaign.CoinsSpent || 0) + '</span></div>';
    mhtml += '        <div class="profile-field"><label>Reward Pool</label><span>' + formatNumber(campaign.RewardPool || 0) + '</span></div>';
    mhtml += '        <div class="profile-field"><label>Platform Reserve</label><span>' + formatNumber(campaign.PlatformReserve || 0) + '</span></div>';
    mhtml += '        <div class="profile-field"><label>Reward Per View</label><span>' + (campaign.RewardCoins || 0) + '</span></div>';
    mhtml += '        <div class="profile-field"><label>Used</label><span style="color:var(--accent-orange);">' + formatNumber(rewardPoolUsed) + '</span></div>';
    mhtml += '        <div class="profile-field"><label>Remaining</label><span style="color:var(--accent-green);font-weight:600;">' + formatNumber(campaign.RemainingRewardCoins || 0) + '</span></div>';
    mhtml += '      </div>';
    mhtml += '      <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
    mhtml += '        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
    mhtml += '          <span style="font-size:11px;color:var(--text-muted);">Reward Pool Usage</span>';
    mhtml += '          <span style="font-size:11px;font-weight:600;color:var(--text-primary);">' + rewardPoolUsage + '%</span>';
    mhtml += '        </div>';
    mhtml += '        <div style="background:var(--bg-card);border-radius:4px;height:8px;overflow:hidden;">';
    mhtml += '          <div style="background:linear-gradient(90deg,var(--accent-green),var(--accent-orange));height:100%;width:' + usageBarWidth + '%;transition:width 0.3s;"></div>';
    mhtml += '        </div>';
    mhtml += '      </div>';
    mhtml += '    </div>';
    
    // Phase 5.6C - Campaign Timeline Section
    var timelineHtml = getCampaignTimeline(campaign);
    mhtml += '    <div style="margin-top:20px;padding-top:16px;border-top:2px solid var(--border-color);">';
    mhtml += '      <h4 style="margin-bottom:12px;color:var(--text-secondary);">📅 Campaign Timeline</h4>';
    mhtml += timelineHtml;
    mhtml += '    </div>';
    // Media previews section
    mhtml += '    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);">';
    mhtml += '      <h4 style="margin-bottom:10px;color:var(--text-secondary);">Creative Assets</h4>';
    if (campaign.ImageURL) {
      mhtml += '      <div style="margin-bottom:8px;"><strong>Image:</strong> <a href="' + escapeHtml(campaign.ImageURL) + '" target="_blank" rel="noopener noreferrer">View Image 🔗</a></div>';
    }
    if (campaign.VideoURL) {
      mhtml += '      <div style="margin-bottom:8px;"><strong>Video:</strong> <a href="' + escapeHtml(campaign.VideoURL) + '" target="_blank" rel="noopener noreferrer">View Video 🔗</a></div>';
    }
    if (campaign.ExternalURL) {
      mhtml += '      <div style="margin-bottom:8px;"><strong>External URL:</strong> <a href="' + escapeHtml(campaign.ExternalURL) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(campaign.ExternalURL) + '</a></div>';
    }
    if (campaign.PageContent) {
      mhtml += '      <div style="margin-bottom:8px;"><strong>Page Content (JSON):</strong>';
      mhtml += '      <pre style="background:var(--bg-secondary);padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;margin-top:4px;color:var(--text-secondary);">' + escapeHtml(JSON.stringify(JSON.parse(campaign.PageContent), null, 2)) + '</pre></div>';
    }
    mhtml += '    </div>';
    // Description
    if (campaign.Description) {
      mhtml += '    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);">';
      mhtml += '      <h4 style="margin-bottom:8px;color:var(--text-secondary);">Description</h4>';
      mhtml += '      <p style="color:var(--text-primary);font-size:13px;">' + escapeHtml(campaign.Description) + '</p>';
      mhtml += '    </div>';
    }
    // Phase 5.6B - Admin Actions Section
    mhtml += '    <div style="margin-top:20px;padding-top:16px;border-top:2px solid var(--border-color);">';
    mhtml += '      <h4 style="margin-bottom:12px;color:var(--text-secondary);">⚙️ Admin Actions</h4>';
    mhtml += '      <div style="display:flex;flex-wrap:wrap;gap:8px;">';
    // Pending actions
    if (statusLower === "pending") {
      mhtml += '        <button class="module-btn module-btn-success" onclick="window._adminApproveCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">✅ Approve</button>';
      mhtml += '        <button class="module-btn module-btn-danger" onclick="window._adminRejectCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">❌ Reject</button>';
    }
    // Active actions
    if (statusLower === "active") {
      mhtml += '        <button class="module-btn module-btn-secondary" onclick="window._adminPauseCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">⏸️ Pause</button>';
      mhtml += '        <button class="module-btn module-btn-danger" onclick="window._adminSuspendCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">🚫 Suspend</button>';
      mhtml += '        <button class="module-btn module-btn-danger" onclick="window._adminTerminateCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">⛔ Terminate</button>';
    }
    // Paused actions
    if (statusLower === "paused") {
      mhtml += '        <button class="module-btn module-btn-success" onclick="window._adminResumeCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">▶️ Resume</button>';
      mhtml += '        <button class="module-btn module-btn-danger" onclick="window._adminSuspendCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">🚫 Suspend</button>';
      mhtml += '        <button class="module-btn module-btn-danger" onclick="window._adminTerminateCampaign(\'' + escapeHtml(campaign.CampaignID) + '\')">⛔ Terminate</button>';
    }
    // Featured toggle (use normalized value)
    if (featuredNormalized === "Yes") {
      mhtml += '        <button class="module-btn module-btn-secondary" onclick="window._adminToggleFeatured(\'' + escapeHtml(campaign.CampaignID) + '\', \'No\')">⭐ Unfeature</button>';
    } else {
      mhtml += '        <button class="module-btn module-btn-secondary" onclick="window._adminToggleFeatured(\'' + escapeHtml(campaign.CampaignID) + '\', \'Yes\')">⭐ Feature</button>';
    }
    // PIP toggle (use normalized value)
    if (pipEnabledNormalized === "Yes") {
      mhtml += '        <button class="module-btn module-btn-secondary" onclick="window._adminTogglePip(\'' + escapeHtml(campaign.CampaignID) + '\', \'No\')">📺 Disable PIP</button>';
    } else {
      mhtml += '        <button class="module-btn module-btn-secondary" onclick="window._adminTogglePip(\'' + escapeHtml(campaign.CampaignID) + '\', \'Yes\')">📺 Enable PIP</button>';
    }
    mhtml += '      </div>';
    mhtml += '    </div>';
    mhtml += '    </div>';
    mhtml += '    <div class="modal-footer">';
    mhtml += '      <button class="module-btn module-btn-secondary" onclick="closeModal()">Close</button>';
    mhtml += '    </div>';
    mhtml += '  </div>';
    mhtml += '</div>';
    document.body.insertAdjacentHTML("beforeend", mhtml);
  }

  /*
  ============================================================
  GLOBAL HELPERS
  ============================================================
  */
  window._campSearch = function() {
    var input = document.getElementById("campSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 1;
    render();
  };
  window._campStatusChange = function(value) {
    currentStatus = value;
    currentPage = 1;
    render();
  };
  window._campCreativeChange = function(value) {
    currentCreativeType = value;
    currentPage = 1;
    render();
  };
  window._campPage = function(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    render();
  };
  window._viewCampaign = function(campaignId) {
    showCampaignDetail(campaignId);
  };
  window._adTab = function(tab) {
    activeSubTab = tab;
    render();
  };

  /*
  ============================================================
  PHASE 5.6B - ADMIN ACTION HANDLERS
  ============================================================
  */
  window._adminApproveCampaign = async function(campaignId) {
    var confirmed = confirm("Approve campaign " + campaignId + "?\n\nThis will activate the campaign and make it eligible for PIP delivery.");
    if (!confirmed) return;
    await executeAdminAction("adminapprovecampaign", { campaignId: campaignId }, "Campaign approved");
  };

  window._adminRejectCampaign = async function(campaignId) {
    var reason = prompt("Reject campaign " + campaignId + "?\n\nPlease provide a rejection reason (minimum 5 characters):");
    if (!reason || reason.trim().length < 5) {
      showToast("Rejection reason is required (minimum 5 characters)", "error");
      return;
    }
    var confirmed = confirm("Reject campaign " + campaignId + "?\n\nReason: " + reason);
    if (!confirmed) return;
    await executeAdminAction("adminrejectcampaign", { campaignId: campaignId, reason: reason.trim() }, "Campaign rejected");
  };

  window._adminPauseCampaign = async function(campaignId) {
    var confirmed = confirm("Pause campaign " + campaignId + "?\n\nThe campaign will stop serving through PIP immediately.");
    if (!confirmed) return;
    await executeAdminAction("pausecampaign", { campaignId: campaignId }, "Campaign paused");
  };

  window._adminResumeCampaign = async function(campaignId) {
    var confirmed = confirm("Resume campaign " + campaignId + "?\n\nThe campaign will become eligible for PIP delivery again.");
    if (!confirmed) return;
    await executeAdminAction("resumecampaign", { campaignId: campaignId }, "Campaign resumed");
  };

  window._adminSuspendCampaign = async function(campaignId) {
    var reason = prompt("Suspend campaign " + campaignId + "?\n\nPlease provide a suspension reason (minimum 5 characters):");
    if (!reason || reason.trim().length < 5) {
      showToast("Suspension reason is required (minimum 5 characters)", "error");
      return;
    }
    var confirmed = confirm("Suspend campaign " + campaignId + "?\n\nReason: " + reason + "\n\nThis will stop the campaign immediately.");
    if (!confirmed) return;
    await executeAdminAction("adminsuspendcampaign", { campaignId: campaignId, reason: reason.trim() }, "Campaign suspended");
  };

  window._adminTerminateCampaign = async function(campaignId) {
    var confirmed = confirm("TERMINATE campaign " + campaignId + "?\n\nThis action cannot be undone.\nThe campaign will stop immediately.\nAll analytics and history will be preserved.");
    if (!confirmed) return;
    var doubleConfirm = confirm("Are you absolutely sure you want to TERMINATE campaign " + campaignId + "?");
    if (!doubleConfirm) return;
    await executeAdminAction("adminterminatecampaign", { campaignId: campaignId }, "Campaign terminated");
  };

  window._adminToggleFeatured = async function(campaignId, featured) {
    var action = featured === "Yes" ? "Feature" : "Unfeature";
    var confirmed = confirm(action + " campaign " + campaignId + "?");
    if (!confirmed) return;
    await executeAdminAction("admintogglefeatured", { campaignId: campaignId, featured: featured }, "Campaign " + action.toLowerCase() + "d");
  };

  window._adminTogglePip = async function(campaignId, pipEnabled) {
    var action = pipEnabled === "Yes" ? "Enable PIP" : "Disable PIP";
    var confirmed = confirm(action + " for campaign " + campaignId + "?");
    if (!confirmed) return;
    await executeAdminAction("admintogglepip", { campaignId: campaignId, pipEnabled: pipEnabled }, "PIP " + (pipEnabled === "Yes" ? "enabled" : "disabled"));
  };

  async function executeAdminAction(action, params, successMessage) {
    var session = AdminAuth.getSession();
    if (!session) {
      showToast("Session expired. Please login again.", "error");
      return;
    }
    try {
      var url = getApiUrl() + "?action=" + action + "&session=" + encodeURIComponent(session);
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        }
      }
      var response = await fetch(url);
      var json = await response.json();
      if (json && json.success) {
        showToast(successMessage, "success");
        closeModal();
        await render();
      } else {
        showToast(json.message || "Action failed", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  }

  // Initial render
  await render();
});

/*
PHASE 5.6C - ANALYTICS HELPERS
*/

/**
 * Get performance label based on campaign metrics
 * Rules:
 * - No Activity: 0 views
 * - Getting Views: views >= 100 but low engagement
 * - Getting Engagement: click rate >= 3% or interest rate >= 2%
 * - High Engagement: click rate >= 5% AND interest rate >= 3%
 */
function getPerformanceLabel(views, clicks, interested, shares) {
  if (!views || views === 0) return "No Activity";
  
  var clickRate = (clicks / views) * 100;
  var interestRate = interested > 0 ? (interested / views) * 100 : 0;
  var shareRate = shares > 0 ? (shares / views) * 100 : 0;
  
  if (clickRate >= 5 && interestRate >= 3) return "High Engagement";
  if (clickRate >= 3 || interestRate >= 2) return "Getting Engagement";
  if (views >= 100) return "Getting Views";
  
  return "No Activity";
}

/**
 * Get campaign timeline HTML with progress bar
 */
function getCampaignTimeline(campaign) {
  var created = campaign.CreatedDate || campaign.CreatedAt || "";
  var start = campaign.StartDate || "";
  var end = campaign.EndDate || "";
  var status = campaign.Status || "Active";
  
  // Calculate campaign progress
  var progressHtml = "";
  if (start && end) {
    try {
      var startDate = new Date(start);
      var endDate = new Date(end);
      var now = new Date();
      var totalDuration = endDate - startDate;
      var elapsed = now - startDate;
      var progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;
      
      var duration = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));
      var elapsedDays = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
      
      progressHtml += '<div style="margin-top:12px;background:var(--bg-secondary);padding:12px;border-radius:var(--radius-sm);">';
      progressHtml += '  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
      progressHtml += '    <span style="font-size:11px;color:var(--text-muted);">Campaign Progress</span>';
      progressHtml += '    <span style="font-size:11px;font-weight:600;color:var(--text-primary);">' + progressPercent.toFixed(1) + '%</span>';
      progressHtml += '  </div>';
      progressHtml += '  <div style="background:var(--bg-card);border-radius:4px;height:8px;overflow:hidden;">';
      progressHtml += '    <div style="background:linear-gradient(90deg,var(--accent-blue),var(--accent-green));height:100%;width:' + progressPercent + '%;transition:width 0.3s;"></div>';
      progressHtml += '  </div>';
      progressHtml += '  <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">' + elapsedDays + ' of ' + duration + ' days elapsed</div>';
      progressHtml += '</div>';
    } catch (e) {
      // If date calculation fails, skip progress bar
    }
  }
  
  var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  html += '  <div class="profile-field"><label>Created</label><span>' + escapeHtml(created) + '</span></div>';
  html += '  <div class="profile-field"><label>Status</label><span class="status-badge status-' + status.toLowerCase() + '">' + escapeHtml(status) + '</span></div>';
  html += '  <div class="profile-field"><label>Start Date</label><span>' + escapeHtml(start) + '</span></div>';
  html += '  <div class="profile-field"><label>End Date</label><span>' + escapeHtml(end) + '</span></div>';
  html += '</div>';
  html += progressHtml;
  
  return html;
}

console.log("Admin Advertisements module loaded (Phase 5.6A + Phase 5.6C)");