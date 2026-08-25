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
    html += '    <button class="module-btn module-btn-primary" id="acwOpenBtn" onclick="window._openCreateCampaignWizard()">＋ Create Campaign</button>';
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
/* ============================================================
  HELPER: SAFE FORMAT PAGE CONTENT
  Renders PageContent in the campaign detail modal. PageContent is
  expected to be a JSON string, but existing rows can contain plain
  strings (e.g. "NO"). When it parses, pretty-print it; otherwise
  return the raw string so no campaign field is silently dropped and
  no JSON.parse error bubbles up to the modal renderer.
  ============================================================ */
  function safeFormatPageContent(value) {
    if (!value) return "";
    try {
      var parsed = JSON.parse(String(value));
      return JSON.stringify(parsed, null, 2);
    } catch (err) {
      return String(value);
    }
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
    mhtml += '      <div class="profile-field"><label>Ad View Time</label><span>' + escapeHtml(String(campaign.AdDurationSeconds || campaign.Duration || "—")) + ' sec (viewer ad)</span></div>';
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
      mhtml += '      <pre style="background:var(--bg-secondary);padding:10px;border-radius:6px;font-size:11px;overflow-x:auto;margin-top:4px;color:var(--text-secondary);">' + escapeHtml(safeFormatPageContent(campaign.PageContent)) + '</pre></div>';
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

/*
============================================================
V2 - ADMIN CAMPAIGN CREATION WIZARD
============================================================
Treasury-funded admin campaign creation UI inside the
Advertisement & Promotion Control Center.

Flow:
  1. Promotion Pass        (?action=passcatalog - server authoritative)
  2. What are you promoting? (Direct Advertisement OR existing listing)
       - Direct Advertisement: no Ekka1km listing/user required; the admin is
         the actor/creator. Jumps straight to Upload Your Ad (skips owner).
       - Existing listing: -> Step 3 Campaign Owner, then target selection
         (adminproducts/businesses/properties/news)
  3. Campaign Owner        (?action=adminusers - catalog listing flow only)
  4. Upload Your Ad        (existing MediaUpload.js createUploadWidget)
  5. Ad Viewing Time       (min 3s, no artificial max; video capped at
                            detected MediaDuration)
  6. Campaign Location     (explicit selection only - never silent GPS)
  7. Campaign Radius       (1|5|10|25|51|100|All India - measured from
                            the SELECTED campaign location)
  8. Campaign Lifetime     (1|3|7|15|30 days - PCC options)
  9. Campaign Fuel         (default = Effective Coins (PriceINR × central rate); capped by
                            PromotionTreasury balance)
 10. Review & Create       (?action=admincreatecampaign with
                            idempotencyKey)

Funding source is ALWAYS the server-side Promotion Treasury.
The browser never sends fundingSource/campaignSource.
No duration-based fees (deferred feature).
============================================================
*/

var ACW = {
  open: false,
  step: 1,
  passes: [],
  pass: null,
  treasuryBalance: 0,
  owners: [],
  owner: null,
  ownerSearch: "",
  targetType: "Product",
  targets: [],
  target: null,
  targetSearch: "",
  direct: false,
  creativeMode: "",
  imageURL: "",
  videoURL: "",
  mediaDuration: null,
  externalURL: "",
  externalType: "website",
  adDuration: 3,
  locName: "",
  locCity: "",
  locDistrict: "",
  locState: "",
  lat: null,
  lng: null,
  radius: "25",
  lifetimeDays: "7",
  fuel: null,
  submitting: false,
  result: null
};

var ACW_RADIUS_OPTIONS = ["1", "5", "10", "25", "51", "100", "All India"];
var ACW_LIFETIME_OPTIONS = ["1", "3", "7", "15", "30"];
var ACW_STEP_TITLES = {
  1: "PROMOTION PASS",
  2: "WHAT ARE YOU PROMOTING?",
  3: "CAMPAIGN OWNER",
  4: "UPLOAD YOUR AD",
  5: "AD VIEWING TIME",
  6: "CAMPAIGN LOCATION & RADIUS",
  7: "CAMPAIGN LIFETIME",
  8: "CAMPAIGN FUEL",
  9: "REVIEW & CREATE"
};

window._openCreateCampaignWizard = function() {
  var session = AdminAuth.getSession();
  if (!session) {
    showToast("Session expired. Please login again.", "error");
    return;
  }
  ACW.open = true;
  ACW.step = 1;
  ACW.passes = [];
  ACW.pass = null;
  ACW.treasuryBalance = 0;
  ACW.owners = [];
  ACW.owner = null;
  ACW.ownerSearch = "";
  ACW.targetType = "Product";
  ACW.targets = [];
  ACW.target = null;
  ACW.targetSearch = "";
  ACW.direct = false;
  ACW.creativeMode = "";
  ACW.imageURL = "";
  ACW.videoURL = "";
  ACW.mediaDuration = null;
  ACW.externalURL = "";
  ACW.externalType = "website";
  ACW.adDuration = 3;
  ACW.locName = "";
  ACW.locCity = "";
  ACW.locDistrict = "";
  ACW.locState = "";
  ACW.lat = null;
  ACW.lng = null;
  ACW.radius = "25";
  ACW.lifetimeDays = "7";
  ACW.fuel = null;
  ACW.submitting = false;
  ACW.result = null;
  _acwMountModal();
  _acwLoadPassesAndTreasury();
};

function _acwSession() {
  return AdminAuth.getSession();
}
/* ACW_PART_1_END */

/*
------------------------------------------------------------
MODAL SHELL + HELPERS
------------------------------------------------------------
*/

function _acwMountModalShell() {
  _acwUnmountModal();
  var html = '';
  html += '<div class="modal-overlay" id="acwOverlay" onclick="closeModal(event)">';
  html += '  <div class="modal-content" style="max-width:760px;max-height:88vh;display:flex;flex-direction:column;">';
  html += '    <div class="modal-header">';
  html += '      <h3>🚀 Create Campaign <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(Treasury Funded)</span></h3>';
  html += '      <button class="module-btn module-btn-secondary" onclick="window._acwClose()">✕</button>';
  html += '    </div>';
  html += '    <div id="acwStepBar" style="padding:8px 20px 0 20px;font-size:11px;color:var(--text-muted);"></div>';
  html += '    <div class="modal-body" id="acwBody" style="overflow-y:auto;flex:1;">';
  html += '      <div class="module-loading"><div class="loader"></div><p>Loading wizard...</p></div>';
  html += '    </div>';
  html += '    <div class="modal-footer" id="acwFooter"></div>';
  html += '  </div>';
  html += '</div>';
  document.body.insertAdjacentHTML("beforeend", html);
}

function _acwUnmountModal() {
  var existing = document.getElementById("acwOverlay");
  if (existing) existing.remove();
}

window._acwClose = function() {
  ACW.open = false;
  _acwUnmountModal();
};

function _acwSetBody(html) {
  var body = document.getElementById("acwBody");
  if (body) body.innerHTML = html;
  _acwRenderFooter();
}

function _acwSection(title, inner) {
  return '<div style="margin-bottom:18px;">' +
    '<h4 style="margin:0 0 10px 0;font-size:13px;letter-spacing:0.5px;color:#5b8def;text-transform:uppercase;">' + title + '</h4>' +
    inner + '</div>';
}

function _acwEsc(s) {
  return escapeHtml(s);
}
/* ACW_PART_2_END */

/*
------------------------------------------------------------
DATA LOADERS
------------------------------------------------------------
*/

function _acwMountModal() {
  _acwMountModalShell();
  _acwRender();
}

async function _acwLoadPassesAndTreasury() {
  var session = _acwSession();
  var passUrl = getApiUrl() + "?action=passcatalog";
  var treasUrl = getApiUrl() + "?action=admintreasuryoverview&session=" + encodeURIComponent(session);
  try {
    var results = await Promise.all([
      fetch(passUrl).then(function(r) { return r.json(); }),
      fetch(treasUrl).then(function(r) { return r.json(); }).catch(function() { return null; })
    ]);
    var passJson = results[0];
    var treasJson = results[1];
    if (!passJson || !passJson.success) {
      _acwSetBody('<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Pass Catalog</h3><p>' + _acwEsc((passJson && passJson.message) || "Unknown error") + '</p></div>');
      return;
    }
    var rows = (passJson.data && passJson.data.data) || [];
    ACW.passes = rows.filter(function(p) {
      return String(p.Status || "").toLowerCase() === "active" || !p.Status;
    });
    if (treasJson && treasJson.success && treasJson.data) {
      ACW.treasuryBalance = Number(treasJson.data.balance || 0);
    }
    _acwRender();
  } catch (err) {
    _acwSetBody('<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Connection Error</h3><p>' + _acwEsc(err.message) + '</p></div>');
  }
}

async function _acwLoadOwners() {
  var session = _acwSession();
  var url = getApiUrl() + "?action=adminusers&session=" + encodeURIComponent(session) + "&page=1&limit=50";
  if (ACW.ownerSearch) url += "&search=" + encodeURIComponent(ACW.ownerSearch);
  var box = document.getElementById("acwOwnerList");
  if (box) box.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading users...</p></div>';
  try {
    var json = await (await fetch(url)).json();
    if (!json || !json.success) {
      if (box) box.innerHTML = '<div class="module-error"><p>' + _acwEsc((json && json.message) || "Failed to load users") + '</p></div>';
      return;
    }
    ACW.owners = json.data.data || [];
    _acwRenderOwnerList();
  } catch (err) {
    if (box) box.innerHTML = '<div class="module-error"><p>' + _acwEsc(err.message) + '</p></div>';
  }
}

async function _acwLoadTargets() {
  var session = _acwSession();
  var actionMap = { Product: "adminproducts", Business: "adminbusinesses", Property: "adminproperties", News: "adminnews" };
  var url = getApiUrl() + "?action=" + actionMap[ACW.targetType] + "&session=" + encodeURIComponent(session) + "&page=1&limit=50";
  if (ACW.targetSearch) url += "&search=" + encodeURIComponent(ACW.targetSearch);
  var box = document.getElementById("acwTargetList");
  if (box) box.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading ' + _acwEsc(ACW.targetType) + 's...</p></div>';
  try {
    var json = await (await fetch(url)).json();
    if (!json || !json.success) {
      if (box) box.innerHTML = '<div class="module-error"><p>' + _acwEsc((json && json.message) || "Failed to load targets") + '</p></div>';
      return;
    }
    ACW.targets = json.data.data || [];
    _acwRenderTargetList();
  } catch (err) {
    if (box) box.innerHTML = '<div class="module-error"><p>' + _acwEsc(err.message) + '</p></div>';
  }
}
/* ACW_PART_3_END */

/*
------------------------------------------------------------
STEP DISPATCH + FOOTER + VALIDATION
------------------------------------------------------------
*/

function _acwRender() {
  var bar = document.getElementById("acwStepBar");
  if (bar) bar.innerHTML = "Step " + ACW.step + " of 9 — " + (ACW_STEP_TITLES[ACW.step] || "");
  if (ACW.result) { _acwRenderSuccess(); return; }
  if (ACW.step === 1) _acwRenderPassStep();
  else if (ACW.step === 2) { _acwSetBody(_acwTargetStepShell()); if (ACW.targetType) _acwLoadTargets(); }
  else if (ACW.step === 3) { _acwSetBody(_acwOwnerStepShell()); _acwLoadOwners(); }
  else if (ACW.step === 4) _acwRenderCreativeStep();
  else if (ACW.step === 5) _acwRenderAdTimeStep();
  else if (ACW.step === 6) _acwRenderLocationStep();
  else if (ACW.step === 7) _acwRenderLifetimeStep();
  else if (ACW.step === 8) _acwRenderFuelStep();
  else if (ACW.step === 9) _acwRenderReviewStep();
}

function _acwRenderFooter() {
  var footer = document.getElementById("acwFooter");
  if (!footer) return;
  if (ACW.result) {
    footer.innerHTML = '<button class="module-btn module-btn-primary" onclick="window._acwDone()">✔ Done</button>';
    return;
  }
  var html = "";
  if (ACW.step > 1) html += '<button class="module-btn module-btn-secondary" onclick="window._acwBack()">← Back</button>';
  if (ACW.step < 9) html += '<button class="module-btn module-btn-primary" onclick="window._acwNext()">Next →</button>';
  else html += '<button class="module-btn module-btn-primary" id="acwCreateBtn" onclick="window._acwSubmit()">🚀 Create Campaign</button>';
  footer.innerHTML = html;
}

window._acwBack = function() {
  if (ACW.step <= 1) return;
  // Direct advertisements skip the "Campaign Owner" step entirely.
  if (ACW.step === 4 && ACW.direct) { ACW.step = 2; _acwRender(); return; }
  // Normal catalog flow: creative -> owner -> target/type.
  if (ACW.step === 4 && !ACW.direct) { ACW.step = 3; _acwRender(); return; }
  ACW.step--; _acwRender();
};

window._acwNext = function() {
  var err = _acwValidateStep(ACW.step);
  if (err) { showToast(err, "error"); return; }
  // Direct advertisements skip the mandatory "Campaign Owner" (step 3).
  if (ACW.step === 2 && ACW.direct) { ACW.step = 4; _acwRender(); return; }
  if (ACW.step < 9) { ACW.step++; _acwRender(); }
};

window._acwDone = function() {
  window._acwClose();
  render();
};
/* ACW_PART_4_END */

function _acwValidateStep(step) {
  if (step === 1 && !ACW.pass) return "No Pass selected. Please choose a Promotion Pass.";
  if (step === 2 && !ACW.direct && !ACW.target) return "No Target selected. Choose Direct Advertisement or an existing listing.";
  if (step === 3 && !ACW.direct && !ACW.owner) return "No Owner selected. Please choose the promoter/owner.";
  if (step === 4) {
    if (!ACW.creativeMode) return "Missing creative. Choose Image, Video, URL or Entity image.";
    if (ACW.creativeMode === "IMAGE" && !ACW.imageURL) return "Missing creative: upload an image first.";
    if (ACW.creativeMode === "VIDEO") {
      if (!ACW.videoURL) return "Missing creative: upload a video first.";
      if (ACW.mediaDuration !== null && ACW.mediaDuration < 3) return "Video duration is under 3 seconds and cannot be used.";
    }
    if (ACW.creativeMode === "URL" && !ACW.externalURL) return "Enter a valid external URL.";
    if (ACW.creativeMode === "ENTITY_IMAGE") {
      if (!ACW.target || !ACW.target.image) return "The selected target has no existing image to use.";
      ACW.imageURL = ACW.target.image;
    }
    if (ACW.creativeMode === "URL" && !ACW.imageURL) {
      if (ACW.target && ACW.target.image) ACW.imageURL = ACW.target.image;
      else return "Backend requires a visible image alongside URL ads. Use the target's image or upload one via Image mode first.";
    }
  }
  if (step === 5) {
    var d = Number(ACW.adDuration);
    if (!(d >= 3)) return "Ad viewing time must be at least 3 seconds.";
    if (ACW.creativeMode === "VIDEO" && ACW.mediaDuration !== null && d > ACW.mediaDuration) {
      return "Ad viewing time (" + d + " sec) cannot exceed the video duration (" + ACW.mediaDuration + " sec).";
    }
  }
  if (step === 6) {
    if ((!ACW.locName || ACW.lat === null || ACW.lng === null) && ACW.radius !== "All India") {
      return "Invalid location: select a campaign location (latitude/longitude required for radius targeting).";
    }
  }
  if (step === 8) {
    var f = parseInt(ACW.fuel, 10);
    if (isNaN(f) || f < 0) return "Invalid campaign fuel. Enter 0 or more (integer).";
    if (f > ACW.treasuryBalance) return "Campaign Fuel exceeds the available Promotion Treasury balance (" + ACW.treasuryBalance + " coins).";
  }
  return null;
}

/*
------------------------------------------------------------
STEP 1 — PROMOTION PASS
------------------------------------------------------------
*/

function _acwFmtNum(n) {
  var v = Number(n);
  if (isNaN(v)) return "0";
  return v.toLocaleString("en-US");
}

// Effective pass coin allocation from the server response (Model A):
// coinAllocation.coins = PriceINR × current central coin rate.
// Fallbacks to IncludedCoins only if the backend omits coinAllocation.
function _acwPassCoins(p) {
  if (p && p.coinAllocation && p.coinAllocation.coins != null) {
    return Number(p.coinAllocation.coins);
  }
  return Number((p && p.IncludedCoins) || 0);
}

function _acwPassCoinLabel(p) {
  if (p && p.coinAllocation && p.coinAllocation.type === "UNLIMITED") {
    return "Unlimited / dynamic allocation";
  }
  return _acwFmtNum(_acwPassCoins(p)) + " Coins";
}

function _acwRenderPassStep() {
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">Prices and coin values are server-authoritative. Selecting a pass defaults Campaign Fuel to its Included Coins.</p>';
  if (!ACW.passes.length) {
    inner += '<div class="module-error"><p>No active promotion passes found in the catalog.</p></div>';
  } else {
    inner += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;" id="acwPassGrid">';
    ACW.passes.forEach(function(p) {
      var selected = ACW.pass && String(ACW.pass.PassID) === String(p.PassID);
      var bg = selected ? "background:rgba(91,141,239,0.12);" : "";
      inner += '<div data-testid="acw-pass-card" data-passid="' + _acwEsc(p.PassID) + '" onclick="window._acwPickPass(\'' + _acwEsc(p.PassID) + '\')" ' +
        'style="cursor:pointer;border:2px solid ' + (selected ? '#5b8def' : 'var(--border-color,#333)') + ';border-radius:10px;padding:14px;' + bg + '">' +
        '<div style="font-weight:700;margin-bottom:6px;">' + _acwEsc(p.PassName || p.PassID) + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:#4caf88;">₹' + _acwEsc(_acwFmtNum(p.PriceINR || 0)) + '</div>' +
        '<div style="font-size:13px;color:#ff9f43;">' + _acwEsc(_acwPassCoinLabel(p)) + '</div>' +
        (p.DurationLabel ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">' + _acwEsc(p.DurationLabel) + '</div>' : '') +
        '</div>';
    });
    inner += '</div>';
  }
  if (ACW.pass) {
    inner += '<div style="margin-top:12px;font-size:13px;">Selected: <strong>' + _acwEsc(ACW.pass.PassName || ACW.pass.PassID) + '</strong> — ' + _acwEsc(_acwPassCoinLabel(ACW.pass)) + '</div>';
  }
  _acwSetBody(_acwSection("PROMOTION PASS", inner));
}

window._acwPickPass = function(passId) {
  var found = null;
  ACW.passes.forEach(function(p) { if (String(p.PassID) === String(passId)) found = p; });
  if (!found) { showToast("Invalid Pass", "error"); return; }
  ACW.pass = found;
  ACW.fuel = _acwPassCoins(found);
  _acwRender();
};
/* ACW_PART_5_END */

/*
------------------------------------------------------------
STEP 2 — CAMPAIGN OWNER
------------------------------------------------------------
*/

function _acwOwnerStepShell() {
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">Choose the promoter/owner this campaign belongs to. The logged-in admin is NOT used automatically.</p>';
  inner += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  inner += '<input type="text" id="acwOwnerSearch" class="module-input" placeholder="Search users by name / ID..." value="' + _acwEsc(ACW.ownerSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._acwOwnerSearchGo(); }" style="flex:1;" />';
  inner += '<button class="module-btn module-btn-primary" onclick="window._acwOwnerSearchGo()">🔍 Search</button>';
  inner += '</div>';
  inner += '<div id="acwOwnerList"><div class="module-loading"><div class="loader"></div><p>Loading users...</p></div></div>';
  if (ACW.owner) {
    inner += '<div style="margin-top:12px;font-size:13px;">Selected owner: <strong>' + _acwEsc(ACW.owner.FullName || "Unnamed User") + '</strong> <span class="module-id">' + _acwEsc(ACW.owner.UserID || "") + '</span></div>';
  }
  return _acwSection("CAMPAIGN OWNER", inner);
}

function _acwRenderOwnerList() {
  var box = document.getElementById("acwOwnerList");
  if (!box) return;
  if (!ACW.owners.length) {
    box.innerHTML = '<div class="module-error"><p>No users found.</p></div>';
    return;
  }
  var html = '<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border-color,#333);border-radius:8px;">';
  ACW.owners.forEach(function(u) {
    var selected = ACW.owner && String(ACW.owner.UserID) === String(u.UserID);
    html += '<div data-testid="acw-owner-row" data-userid="' + _acwEsc(u.UserID) + '" onclick="window._acwPickOwner(\'' + _acwEsc(u.UserID) + '\')" ' +
      'style="cursor:pointer;padding:10px 14px;border-bottom:1px solid var(--border-color,#222);' + (selected ? 'background:rgba(91,141,239,0.15);' : '') + '">' +
      '<strong>' + _acwEsc(u.FullName || u.Name || "Unnamed User") + '</strong> ' +
      '<span class="module-id">' + _acwEsc(u.UserID || "") + '</span>' +
      '</div>';
  });
  html += '</div>';
  box.innerHTML = html;
}

window._acwOwnerSearchGo = function() {
  var input = document.getElementById("acwOwnerSearch");
  ACW.ownerSearch = input ? input.value.trim() : "";
  _acwLoadOwners();
};

window._acwPickOwner = function(userId) {
  var found = null;
  ACW.owners.forEach(function(u) { if (String(u.UserID) === String(userId)) found = u; });
  if (!found) { showToast("Invalid Owner", "error"); return; }
  ACW.owner = found;
  _acwSetBody(_acwOwnerStepShell());
  _acwLoadOwners();
};
/* ACW_PART_6_END */

/*
------------------------------------------------------------
STEP 3 — WHAT ARE YOU PROMOTING?
------------------------------------------------------------
*/

function _acwTargetTitle(t) {
  return t.Title || t.Name || t.ProductName || t.BusinessName || t.NewsTitle || t.Headline || "Untitled";
}

function _acwTargetImage(t) {
  return t.ImageURL || t.imageURL || t.Logo || t.CoverImage || t.ProductImage || t.Image || "";
}

function _acwTargetIdFor(type, t) {
  return type === "Product" ? (t.ProductID || "") : type === "Business" ? (t.BusinessID || "") : type === "Property" ? (t.PropertyID || "") : (t.NewsID || "");
}

function _acwTargetStepShell() {
  var inner = "";
  var directSel = !!ACW.direct;
  inner += '<div data-testid="acw-direct-option" onclick="window._acwPickDirectAd()" style="border:2px solid ' + (directSel ? '#5b8def' : 'var(--border-color,#333)') + ';border-radius:10px;padding:14px;margin-bottom:12px;cursor:pointer;' + (directSel ? 'background:rgba(91,141,239,0.15);' : '') + '">';
  inner += '<div style="font-weight:700;">📤 Direct Advertisement</div>';
  inner += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">No Ekka1km listing required — supply the ad creative (image / video / URL) directly.</div>';
  inner += '<div style="font-size:11px;color:#4caf88;margin-top:6px;">' + (directSel ? '✔ Selected — continue to Upload Your Ad' : 'Click to skip catalog selection') + '</div>';
  inner += '</div>';
  inner += '<div style="font-size:11px;color:var(--text-muted);margin:0 0 10px 0;">— OR promote an existing listing —</div>';
  inner += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  ["Product", "Business", "Property", "News"].forEach(function(tp) {
    var sel = ACW.targetType === tp;
    inner += '<button class="module-btn ' + (sel ? 'module-btn-primary' : 'module-btn-secondary') + '" data-testid="acw-target-type" data-type="' + tp + '" onclick="window._acwPickTargetType(\'' + tp + '\')">' + tp + '</button>';
  });
  inner += '</div>';
  inner += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
  inner += '<input type="text" id="acwTargetSearch" class="module-input" placeholder="Search..." value="' + _acwEsc(ACW.targetSearch) + '" onkeyup="if(event.key===\'Enter\'){ window._acwTargetSearchGo(); }" style="flex:1;" />';
  inner += '<button class="module-btn module-btn-primary" onclick="window._acwTargetSearchGo()">🔍 Search</button>';
  inner += '</div>';
  inner += '<div id="acwTargetList"><div class="module-loading"><div class="loader"></div><p>Loading...</p></div></div>';
  if (ACW.target) {
    inner += '<div style="margin-top:12px;font-size:13px;">Selected: <strong>' + _acwEsc(ACW.target.title) + '</strong> <span class="module-id">' + _acwEsc(ACW.target.id) + '</span> (' + _acwEsc(ACW.target.type) + ')</div>';
  }
  return _acwSection("WHAT ARE YOU PROMOTING?", inner);
}

function _acwRenderTargetList() {
  var box = document.getElementById("acwTargetList");
  if (!box) return;
  if (!ACW.targets.length) {
    box.innerHTML = '<div class="module-error"><p>No records found for this type.</p></div>';
    return;
  }
  var html = '<div style="max-height:280px;overflow-y:auto;border:1px solid var(--border-color,#333);border-radius:8px;">';
  ACW.targets.forEach(function(t) {
    var id = _acwTargetIdFor(ACW.targetType, t);
    var img = _acwTargetImage(t);
    var selected = ACW.target && String(ACW.target.id) === String(id);
    html += '<div data-testid="acw-target-row" data-id="' + _acwEsc(id) + '" onclick="window._acwPickTarget(\'' + _acwEsc(id) + '\')" ' +
      'style="cursor:pointer;padding:10px 14px;border-bottom:1px solid var(--border-color,#222);display:flex;align-items:center;gap:10px;' + (selected ? 'background:rgba(91,141,239,0.15);' : '') + '">' +
      (img ? '<img src="' + _acwEsc(img) + '" style="width:38px;height:38px;object-fit:cover;border-radius:6px;" onerror="this.style.display=\'none\'" />' : '') +
      '<div><strong>' + _acwEsc(_acwTargetTitle(t)) + '</strong><br/><span class="module-id">' + _acwEsc(id) + '</span></div>' +
      '</div>';
  });
  html += '</div>';
  box.innerHTML = html;
}

window._acwPickTargetType = function(tp) {
  ACW.direct = false;
  ACW.targetType = tp;
  ACW.target = null;
  ACW.targetSearch = "";
  _acwSetBody(_acwTargetStepShell());
  _acwLoadTargets();
};

window._acwPickDirectAd = function() {
  ACW.direct = true;
  ACW.targetType = "";
  // Direct advertisement has NO catalog entity. The backend maps this into the
  // existing canonical external-URL / targetless promotion path.
  ACW.target = { type: "ExternalURL", id: "", title: "Direct Advertisement", image: "" };
  ACW.targets = [];
  ACW.targetSearch = "";
  // Reflect the selected state, then skip catalog selection to Upload Your Ad.
  _acwSetBody(_acwTargetStepShell());
  window._acwNext();
};

window._acwTargetSearchGo = function() {
  var input = document.getElementById("acwTargetSearch");
  ACW.targetSearch = input ? input.value.trim() : "";
  _acwLoadTargets();
};

window._acwPickTarget = function(id) {
  var found = null;
  ACW.targets.forEach(function(t) { if (String(_acwTargetIdFor(ACW.targetType, t)) === String(id)) found = t; });
  if (!found) { showToast("Invalid Target", "error"); return; }
  ACW.target = { type: ACW.targetType, id: id, title: _acwTargetTitle(found), image: _acwTargetImage(found) };
  _acwSetBody(_acwTargetStepShell());
  _acwLoadTargets();
};
/* ACW_PART_7_END */

/*
------------------------------------------------------------
STEP 4 — UPLOAD YOUR AD
------------------------------------------------------------
*/

var ACW_UPLOAD_COUNTER = 0;

function _acwRenderCreativeStep() {
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">Promote yourself with an image, video, or link.</p>';
  var modes = [
    { key: "IMAGE", label: "🖼 Image" },
    { key: "VIDEO", label: "🎬 Video" },
    { key: "URL", label: "🔗 URL / External" }
  ];
  // "Use target image" only makes sense when a real catalog entity is selected.
  if (!ACW.direct) modes.push({ key: "ENTITY_IMAGE", label: "🏷 Use target image" });
  inner += '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">';
  modes.forEach(function(m) {
    var sel = ACW.creativeMode === m.key;
    inner += '<button class="module-btn ' + (sel ? 'module-btn-primary' : 'module-btn-secondary') + '" data-testid="acw-creative-mode" data-mode="' + m.key + '" onclick="window._acwPickCreativeMode(\'' + m.key + '\')">' + m.label + '</button>';
  });
  inner += '</div>';
  inner += '<div id="acwCreativeArea"></div>';
  _acwSetBody(_acwSection("UPLOAD YOUR AD", inner));
  _acwRenderCreativeArea();
}

function _acwRenderCreativeArea() {
  var area = document.getElementById("acwCreativeArea");
  if (!area) return;
  var html = "";
  var uploadContainerId = "";
  if (ACW.creativeMode === "IMAGE" || ACW.creativeMode === "VIDEO") {
    if (typeof createUploadWidget === "function") {
      ACW_UPLOAD_COUNTER++;
      uploadContainerId = "acwUpload" + ACW_UPLOAD_COUNTER;
      html += '<div id="' + uploadContainerId + '"></div>';
    } else {
      html += '<div class="module-error"><p>Media upload component not loaded.</p></div>';
    }
    if (ACW.creativeMode === "IMAGE" && ACW.imageURL) {
      html += '<div style="margin-top:10px;"><img data-testid="acw-image-preview" src="' + _acwEsc(ACW.imageURL) + '" style="max-width:100%;max-height:200px;border-radius:8px;" onerror="this.style.display=\'none\'" /><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Image captured ✔</div></div>';
    }
    if (ACW.creativeMode === "VIDEO" && ACW.videoURL) {
      html += '<div style="margin-top:10px;"><video data-testid="acw-video-preview" src="' + _acwEsc(ACW.videoURL) + '" controls style="max-width:100%;max-height:220px;border-radius:8px;"></video>';
      html += '<div data-testid="acw-media-duration" style="font-size:12px;margin-top:4px;">' +
        (ACW.mediaDuration !== null ? 'Detected video duration: <strong>' + ACW.mediaDuration + ' sec</strong>' : 'Detecting video duration...') + '</div></div>';
    }
  } else if (ACW.creativeMode === "ENTITY_IMAGE") {
    if (ACW.target && ACW.target.image) {
      html += '<img data-testid="acw-entity-image" src="' + _acwEsc(ACW.target.image) + '" style="max-width:100%;max-height:200px;border-radius:8px;" onerror="this.style.display=\'none\'" />';
      html += '<div style="font-size:12px;color:#4caf88;margin-top:6px;">Using the selected target\'s existing image — no upload needed.</div>';
    } else {
      html += '<div class="module-error"><p>The selected target has no existing image. Upload an image instead.</p></div>';
    }
  } else if (ACW.creativeMode === "URL") {
    _acwRenderUrlMode();
    return;
  } else {
    html += '<div class="module-error"><p>Choose a creative option above.</p></div>';
  }
  area.innerHTML = html;

  if (uploadContainerId) {
    var isVideo = ACW.creativeMode === "VIDEO";
    createUploadWidget(uploadContainerId, {
      folder: "promotions",
      accept: isVideo ? "video/*" : "image/*",
      label: isVideo ? "Upload Ad Video (camera / gallery / file)" : "Upload Ad Image (camera / gallery / file)",
      onUpload: isVideo ? function(url) { _acwVideoUploaded(url); } : function(url) { ACW.imageURL = url; _acwRenderCreativeArea(); }
    });
  }
}
/* ACW_PART_8A_END */

function _acwRenderUrlMode() {
  var area = document.getElementById("acwCreativeArea");
  if (!area) return;
  var html = "";
  html += '<div style="margin-bottom:10px;">';
  html += '<label style="font-size:12px;color:var(--text-muted);">Link Type</label><br/>';
  html += '<select id="acwExternalType" class="module-select" style="max-width:220px;" onchange="window._acwExternalTypeChange(this.value)">';
  var types = [["website", "Website"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["other", "Other"]];
  types.forEach(function(t) {
    html += '<option value="' + t[0] + '"' + (ACW.externalType === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
  });
  html += '</select></div>';
  html += '<label style="font-size:12px;color:var(--text-muted);">External URL</label><br/>';
  html += '<input type="url" data-testid="acw-external-url" id="acwExternalUrl" class="module-input" placeholder="https://..." value="' + _acwEsc(ACW.externalURL) + '" style="width:100%;" oninput="window._acwExternalUrlInput(this.value)" />';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">A visible creative image is required alongside URL ads. The selected target\'s image is used automatically when available.</div>';
  if (ACW.imageURL) {
    html += '<div style="margin-top:8px;font-size:12px;">Visible image: <img src="' + _acwEsc(ACW.imageURL) + '" style="height:34px;border-radius:4px;vertical-align:middle;" onerror="this.style.display=\'none\'" /> ✔</div>';
  }
  area.innerHTML = html;
}

window._acwPickCreativeMode = function(mode) {
  ACW.creativeMode = mode;
  _acwRender();
};

window._acwExternalUrlInput = function(value) {
  ACW.externalURL = String(value || "").trim();
};

window._acwExternalTypeChange = function(value) {
  ACW.externalType = String(value || "website");
};

function _acwVideoUploaded(url) {
  ACW.videoURL = url;
  ACW.mediaDuration = null;
  _acwRenderCreativeArea();
  // Detect the ACTUAL duration from the uploaded video (never invented).
  var probe = document.createElement("video");
  probe.preload = "metadata";
  probe.onloadedmetadata = function() {
    var d = probe.duration;
    if (isFinite(d) && d > 0) {
      ACW.mediaDuration = Math.round(d * 10) / 10;
      if (Number(ACW.adDuration) > ACW.mediaDuration) ACW.adDuration = Math.max(3, Math.floor(ACW.mediaDuration));
    } else {
      ACW.mediaDuration = null;
    }
    _acwRenderCreativeArea();
  };
  probe.onerror = function() {
    ACW.mediaDuration = null;
    _acwRenderCreativeArea();
  };
  probe.src = url;
}
/* ACW_PART_8B_END */

/*
------------------------------------------------------------
STEP 5 — AD VIEWING TIME
------------------------------------------------------------
*/

function _acwAdTimeMax() {
  if (ACW.creativeMode === "VIDEO" && ACW.mediaDuration !== null && ACW.mediaDuration > 0) {
    return Math.max(3, Math.floor(ACW.mediaDuration));
  }
  // No artificial maximum for admin. Generous slider bound; the number
  // input accepts any value >= 3.
  return 600;
}

function _acwRenderAdTimeStep() {
  var max = _acwAdTimeMax();
  var cur = Math.min(Number(ACW.adDuration) || 3, 999999);
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">Minimum 3 seconds. No artificial maximum for admin campaigns.' +
    (ACW.creativeMode === "VIDEO" && ACW.mediaDuration !== null ? ' For VIDEO, the maximum is the actual video duration (' + ACW.mediaDuration + ' sec).' : '') + '</p>';
  inner += '<div style="font-size:28px;font-weight:700;margin-bottom:10px;" data-testid="acw-ad-duration-label" id="acwAdDurationLabel">' + cur + ' sec</div>';
  inner += '<input type="range" data-testid="acw-ad-duration-slider" id="acwAdDurationSlider" min="3" max="' + max + '" step="1" value="' + Math.min(cur, max) + '" style="width:100%;" oninput="window._acwAdTimeInput(this.value, \'slider\')" />';
  inner += '<div style="display:flex;align-items:center;gap:10px;margin-top:10px;">';
  inner += '<label style="font-size:12px;color:var(--text-muted);">Seconds:</label>';
  inner += '<input type="number" data-testid="acw-ad-duration-number" id="acwAdDurationNumber" min="3" step="1" value="' + cur + '" class="module-input" style="max-width:120px;" oninput="window._acwAdTimeInput(this.value, \'number\')" />';
  inner += '</div>';
  if (ACW.creativeMode === "VIDEO") {
    inner += ACW.mediaDuration !== null
      ? '<div style="font-size:12px;color:#4caf88;margin-top:8px;">Video MediaDuration detected: ' + ACW.mediaDuration + ' sec — ad time cannot exceed it.</div>'
      : '<div style="font-size:12px;color:#ff9f43;margin-top:8px;">Media duration not available — no cap applied (it will not be invented).</div>';
  }
  inner += '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;">Campaign Lifetime is configured separately and does not affect this value.</div>';
  _acwSetBody(_acwSection("AD VIEWING TIME", inner));
}

window._acwAdTimeInput = function(value, source) {
  var v = parseInt(value, 10);
  if (isNaN(v)) return;
  var max = _acwAdTimeMax();
  var clamped = Math.max(3, Math.floor(v));
  var overCap = false;
  if (ACW.creativeMode === "VIDEO" && ACW.mediaDuration !== null && clamped > max) {
    clamped = max;
    overCap = true;
  }
  ACW.adDuration = clamped;
  var slider = document.getElementById("acwAdDurationSlider");
  var number = document.getElementById("acwAdDurationNumber");
  var label = document.getElementById("acwAdDurationLabel");
  if (slider && source !== "slider") slider.value = Math.min(clamped, max);
  if (number && source !== "number") number.value = clamped;
  if (label) label.textContent = clamped + " sec";
  if (overCap) showToast("Ad viewing time capped at video duration (" + max + " sec)", "error");
};
/* ACW_PART_9_END */

/*
------------------------------------------------------------
STEP 6 — CAMPAIGN LOCATION & RADIUS
------------------------------------------------------------
*/

function _acwRenderLocationStep() {
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">The campaign location must be selected explicitly. The radius is measured FROM THIS location — not from the admin\'s GPS.</p>';
  inner += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  inner += '<button class="module-btn module-btn-secondary" data-testid="acw-use-current-location" onclick="window._acwUseCurrentLocation()">📍 Use Current Location</button>';
  inner += '<button class="module-btn module-btn-secondary" data-testid="acw-search-area-toggle" onclick="window._acwToggleSearchArea()">🔍 Search Another Area</button>';
  inner += '</div>';
  inner += '<div id="acwSearchAreaBox" style="display:none;margin-bottom:12px;border:1px solid var(--border-color,#333);border-radius:8px;padding:12px;">';
  inner += '<div style="display:flex;gap:8px;">';
  inner += '<input type="text" id="acwAreaSearchInput" class="module-input" placeholder="City, area or landmark..." style="flex:1;" onkeyup="if(event.key===\'Enter\'){ window._acwSearchArea(); }" />';
  inner += '<button class="module-btn module-btn-primary" data-testid="acw-search-area-btn" onclick="window._acwSearchArea()">Search</button>';
  inner += '</div>';
  inner += '<div id="acwAreaSearchResults" style="margin-top:8px;"></div>';
  inner += '</div>';
  inner += '<div id="acwLocationSummary" data-testid="acw-location-summary">' + _acwLocationSummaryHtml() + '</div>';
  inner += '<div style="margin-top:12px;">';
  inner += '<label style="font-size:12px;color:var(--text-muted);">CAMPAIGN RADIUS (from the selected location)</label><br/>';
  inner += '<select id="acwRadiusSelect" class="module-select" data-testid="acw-radius-select" style="max-width:220px;" onchange="window._acwRadiusChange(this.value)">';
  ACW_RADIUS_OPTIONS.forEach(function(r) {
    var sel = String(ACW.radius) === String(r);
    var label = r === "All India" ? "All India" : r + " KM";
    inner += '<option value="' + r + '"' + (sel ? ' selected' : '') + '>' + label + '</option>';
  });
  inner += '</select>';
  inner += '<div style="font-size:12px;margin-top:8px;" data-testid="acw-radius-summary">Campaign Radius: <strong>' + (ACW.radius === "All India" ? "All India" : ACW.radius + " KM") + '</strong></div>';
  inner += '</div>';
  _acwSetBody(_acwSection("CAMPAIGN LOCATION & RADIUS", inner));
}

function _acwLocationSummaryHtml() {
  if (ACW.locName && ACW.lat !== null && ACW.lng !== null) {
    return '<div style="border:1px solid var(--border-color,#333);border-radius:8px;padding:12px;">' +
      '<div style="font-size:12px;color:var(--text-muted);">Campaign Location</div>' +
      '<div style="font-weight:700;" data-testid="acw-location-name">' + _acwEsc(ACW.locName) + '</div>' +
      '<div style="font-size:12px;">' + _acwEsc([ACW.locCity, ACW.locDistrict, ACW.locState].filter(Boolean).join(", ")) + '</div>' +
      '<div style="font-size:12px;margin-top:6px;" data-testid="acw-location-latlng">Latitude: ' + ACW.lat + '<br/>Longitude: ' + ACW.lng + '</div>' +
      '<button class="module-btn module-btn-secondary" style="margin-top:8px;" onclick="window._acwChangeLocation()">Change Location</button>' +
      '</div>';
  }
  return '<div class="module-error"><p>No campaign location selected yet. Use Current Location or Search Another Area.</p></div>';
}
/* ACW_PART_10A_END */

window._acwUseCurrentLocation = function() {
  // Explicit admin action only — GPS is NEVER used silently.
  if (!navigator.geolocation) {
    showToast("Geolocation is not available in this browser.", "error");
    return;
  }
  showToast("Getting current location...", "success");
  navigator.geolocation.getCurrentPosition(function(pos) {
    _acwSetLocation(pos.coords.latitude, pos.coords.longitude, "Current Location");
    ACW.locCity = "";
    ACW.locDistrict = "";
    ACW.locState = "";
  }, function(err) {
    showToast("Could not get current location: " + err.message, "error");
  }, { enableHighAccuracy: true, timeout: 15000 });
};

window._acwToggleSearchArea = function() {
  var box = document.getElementById("acwSearchAreaBox");
  if (box) {
    box.style.display = box.style.display === "none" ? "block" : "none";
    if (box.style.display === "block") {
      var input = document.getElementById("acwAreaSearchInput");
      if (input) input.focus();
    }
  }
};

window._acwSearchArea = function() {
  var input = document.getElementById("acwAreaSearchInput");
  var results = document.getElementById("acwAreaSearchResults");
  if (!input || !results) return;
  var q = input.value.trim();
  if (!q) {
    results.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Please enter a city, area or landmark.</div>';
    return;
  }
  results.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Searching...</div>';
  // Same OpenStreetMap Nominatim pattern as the existing PCC location search.
  var url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(q) + "&format=json&limit=5&countrycodes=IN";
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || data.length === 0) {
        results.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">No results found. Try a different search term.</div>';
        return;
      }
      var html = "";
      data.forEach(function(place, idx) {
        var name = (place.display_name || "").split(",").slice(0, 3).join(",").trim() || place.display_name;
        html += '<div data-testid="acw-area-result" data-idx="' + idx + '" onclick="window._acwPickArea(' + idx + ')" style="cursor:pointer;padding:8px;border-bottom:1px solid var(--border-color,#222);font-size:13px;">📍 ' + _acwEsc(name) + '</div>';
      });
      results.innerHTML = html;
      results._places = data;
    })
    .catch(function(err) {
      console.log("Admin campaign location search error:", err);
      results.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Search failed. Please try again.</div>';
    });
};

window._acwPickArea = function(idx) {
  var results = document.getElementById("acwAreaSearchResults");
  var places = (results && results._places) || [];
  var place = places[idx];
  if (!place) return;
  _acwSetLocation(parseFloat(place.lat), parseFloat(place.lon), place.display_name || "Selected Location");
  var box = document.getElementById("acwSearchAreaBox");
  if (box) box.style.display = "none";
};

window._acwChangeLocation = function() {
  ACW.locName = "";
  ACW.locCity = "";
  ACW.locDistrict = "";
  ACW.locState = "";
  ACW.lat = null;
  ACW.lng = null;
  _acwRender();
};

function _acwSetLocation(lat, lng, displayName) {
  if (isNaN(lat) || isNaN(lng)) {
    showToast("Invalid location coordinates.", "error");
    return;
  }
  ACW.lat = Math.round(lat * 1000000) / 1000000;
  ACW.lng = Math.round(lng * 1000000) / 1000000;
  var parts = String(displayName || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean);
  ACW.locName = parts.slice(0, 3).join(", ") || "Selected Location";
  ACW.locCity = parts[0] || "";
  ACW.locDistrict = parts.length > 2 ? parts[parts.length - 3] : "";
  ACW.locState = parts.length > 1 ? parts[parts.length - 2] : "";
  _acwRefreshLocationSummary();
}

function _acwRefreshLocationSummary() {
  var box = document.getElementById("acwLocationSummary");
  if (box) box.innerHTML = _acwLocationSummaryHtml();
}

window._acwRadiusChange = function(value) {
  ACW.radius = String(value);
  var summary = document.querySelector("[data-testid='acw-radius-summary']");
  if (summary) summary.innerHTML = 'Campaign Radius: <strong>' + (ACW.radius === "All India" ? "All India" : ACW.radius + " KM") + '</strong>';
};
/* ACW_PART_10B_END */

/*
------------------------------------------------------------
STEP 7 — CAMPAIGN LIFETIME
------------------------------------------------------------
*/

function _acwRenderLifetimeStep() {
  var inner = "";
  inner += '<p style="font-size:12px;color:var(--text-muted);margin-top:0;">How long the campaign stays ACTIVE. This is completely separate from Ad Viewing Time (how long one viewer sees the ad).</p>';
  inner += '<label style="font-size:12px;color:var(--text-muted);">CAMPAIGN LIFETIME</label><br/>';
  inner += '<select id="acwLifetimeSelect" class="module-select" data-testid="acw-lifetime-select" style="max-width:220px;" onchange="window._acwLifetimeChange(this.value)">';
  ACW_LIFETIME_OPTIONS.forEach(function(d) {
    var sel = String(ACW.lifetimeDays) === String(d);
    inner += '<option value="' + d + '"' + (sel ? ' selected' : '') + '>' + d + ' day' + (d > 1 ? "s" : "") + '</option>';
  });
  inner += '</select>';
  inner += '<div style="font-size:12px;margin-top:8px;" data-testid="acw-lifetime-summary">Campaign Lifetime: <strong>' + ACW.lifetimeDays + ' day' + (ACW.lifetimeDays > 1 ? "s" : "") + '</strong></div>';
  _acwSetBody(_acwSection("CAMPAIGN LIFETIME", inner));
}

window._acwLifetimeChange = function(value) {
  ACW.lifetimeDays = String(value);
  var summary = document.querySelector("[data-testid='acw-lifetime-summary']");
  if (summary) summary.innerHTML = 'Campaign Lifetime: <strong>' + ACW.lifetimeDays + ' day' + (ACW.lifetimeDays > 1 ? "s" : "") + '</strong>';
};

/*
------------------------------------------------------------
STEP 8 — CAMPAIGN FUEL
------------------------------------------------------------
*/

function _acwRenderFuelStep() {
  var included = ACW.pass ? _acwPassCoins(ACW.pass) : 0;
  var fuel = parseInt(ACW.fuel, 10);
  if (isNaN(fuel)) fuel = included;
  var over = fuel > ACW.treasuryBalance;
  var inner = "";
  inner += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px;">';
  inner += '<div style="border:1px solid var(--border-color,#333);border-radius:8px;padding:10px;"><div style="font-size:11px;color:var(--text-muted);">PASS INCLUDED COINS</div><div style="font-size:18px;font-weight:700;color:#ff9f43;">' + included + '</div></div>';
  inner += '<div style="border:1px solid var(--border-color,#333);border-radius:8px;padding:10px;"><div style="font-size:11px;color:var(--text-muted);">CAMPAIGN FUEL</div><div style="font-size:18px;font-weight:700;color:#5b8def;" data-testid="acw-fuel-value">' + fuel + '</div></div>';
  inner += '<div style="border:1px solid var(--border-color,#333);border-radius:8px;padding:10px;"><div style="font-size:11px;color:var(--text-muted);">PROMOTION TREASURY AVAILABLE</div><div style="font-size:18px;font-weight:700;color:#4caf88;" data-testid="acw-treasury-value">' + ACW.treasuryBalance + '</div></div>';
  inner += '</div>';
  inner += '<label style="font-size:12px;color:var(--text-muted);">Requested Campaign Fuel (integer coins)</label><br/>';
  inner += '<input type="number" data-testid="acw-fuel-input" id="acwFuelInput" min="0" step="1" value="' + fuel + '" class="module-input" style="max-width:180px;" oninput="window._acwFuelInput(this.value)" />';
  inner += '<div data-testid="acw-fuel-feedback" style="margin-top:10px;font-size:13px;' + (over ? 'color:#ff4757;font-weight:700;' : 'color:var(--text-muted);') + '">' +
    'Available Treasury: ' + ACW.treasuryBalance + ' coins<br/>Requested Campaign Fuel: ' + fuel + ' coins' +
    (over ? '<br/>❌ Campaign Fuel exceeds the available Treasury balance.' : '<br/>✔ Within Treasury balance.') +
    '</div>';
  inner += '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;">Campaign Fuel is the exact amount debited from the Promotion Treasury. Funding source is always the Promotion Treasury — never any wallet.</div>';
  _acwSetBody(_acwSection("CAMPAIGN FUEL", inner));
}

window._acwFuelInput = function(value) {
  var v = parseInt(value, 10);
  if (isNaN(v) || v < 0) return;
  ACW.fuel = v;
  var over = v > ACW.treasuryBalance;
  var valEl = document.querySelector("[data-testid='acw-fuel-value']");
  if (valEl) valEl.textContent = v;
  var fb = document.querySelector("[data-testid='acw-fuel-feedback']");
  if (fb) {
    fb.style.color = over ? "#ff4757" : "";
    fb.style.fontWeight = over ? "700" : "";
    fb.innerHTML = 'Available Treasury: ' + ACW.treasuryBalance + ' coins<br/>Requested Campaign Fuel: ' + v + ' coins' +
      (over ? '<br/>❌ Campaign Fuel exceeds the available Treasury balance.' : '<br/>✔ Within Treasury balance.');
  }
};
/* ACW_PART_11_END */

/*
------------------------------------------------------------
STEP 9 — REVIEW & CREATE
------------------------------------------------------------
*/

function _acwReviewRow(label, value, testId) {
  return '<div style="display:flex;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px solid var(--border-color,#222);font-size:13px;">' +
    '<span style="color:var(--text-muted);white-space:nowrap;">' + label + '</span>' +
    '<span style="text-align:right;font-weight:600;"' + (testId ? ' data-testid="' + testId + '"' : '') + '>' + value + '</span></div>';
}

function _acwCreativeTypeLabel() {
  if (ACW.creativeMode === "IMAGE") return "IMAGE";
  if (ACW.creativeMode === "VIDEO") return "VIDEO";
  if (ACW.creativeMode === "URL") return "URL (external link)";
  if (ACW.creativeMode === "ENTITY_IMAGE") return "ENTITY_IMAGE (target's existing image)";
  return "-";
}

function _acwDestinationType() {
  if (ACW.creativeMode === "URL") return ACW.externalType;
  if (ACW.direct) return ""; // direct ad: no catalog entity; backend derives from the provided destination
  if (ACW.target) return String(ACW.target.type).toLowerCase();
  return "";
}

function _acwRenderReviewStep() {
  var inner = "";
  inner += '<div style="margin-bottom:6px;font-size:12px;color:#4caf88;font-weight:700;">FUNDING SOURCE: PROMOTION TREASURY</div>';
  inner += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">This campaign is funded exclusively by the platform Promotion Treasury. No admin wallet, owner wallet or personal wallet is involved.</div>';
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">OWNER</h4>';
  inner += _acwReviewRow("Owner", _acwEsc(ACW.owner ? (ACW.owner.FullName || "Unnamed User") : "-"));
  inner += _acwReviewRow("UserID", _acwEsc(ACW.owner ? ACW.owner.UserID : "-"));
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">TARGET</h4>';
  inner += _acwReviewRow("Target", _acwEsc(ACW.target ? ACW.target.title : "-"), "acw-review-target");
  inner += _acwReviewRow("Target Type", _acwEsc(ACW.target ? ACW.target.type : "-"), "acw-review-target-type");
  inner += _acwReviewRow("Target ID", _acwEsc(ACW.target ? ACW.target.id : "-"));
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">UPLOAD / CREATIVE</h4>';
  inner += _acwReviewRow("Creative Type", _acwEsc(_acwCreativeTypeLabel()), "acw-review-creative-type");
  var previewHtml = "-";
  if ((ACW.creativeMode === "IMAGE" || ACW.creativeMode === "ENTITY_IMAGE") && ACW.imageURL) {
    previewHtml = '<img src="' + _acwEsc(ACW.imageURL) + '" data-testid="acw-review-image" style="max-height:70px;border-radius:6px;vertical-align:middle;" onerror="this.style.display=\'none\'" />';
  } else if (ACW.creativeMode === "VIDEO" && ACW.videoURL) {
    previewHtml = '<video src="' + _acwEsc(ACW.videoURL) + '" data-testid="acw-review-video" controls style="max-height:90px;border-radius:6px;"></video>';
  } else if (ACW.creativeMode === "URL") {
    previewHtml = _acwEsc(ACW.externalURL);
  }
  inner += _acwReviewRow("Preview", previewHtml);
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">AD VIEWING TIME</h4>';
  inner += _acwReviewRow("Ad Viewing Time", Number(ACW.adDuration) + ' sec', "acw-review-ad-duration");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">CAMPAIGN LOCATION</h4>';
  inner += _acwReviewRow("Location", _acwEsc(ACW.locName || "-"), "acw-review-location");
  inner += _acwReviewRow("City / District / State", _acwEsc([ACW.locCity, ACW.locDistrict, ACW.locState].filter(Boolean).join(", ") || "-"));
  inner += _acwReviewRow("LATITUDE", String(ACW.lat !== null ? ACW.lat : "-"), "acw-review-lat");
  inner += _acwReviewRow("LONGITUDE", String(ACW.lng !== null ? ACW.lng : "-"), "acw-review-lng");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">RADIUS</h4>';
  inner += _acwReviewRow("Campaign Radius", (ACW.radius === "All India" ? "All India" : ACW.radius + " KM") + ' (from selected location)', "acw-review-radius");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">CAMPAIGN LIFETIME</h4>';
  inner += _acwReviewRow("Lifetime", ACW.lifetimeDays + ' days', "acw-review-lifetime");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">PROMOTION PASS</h4>';
  inner += _acwReviewRow("Pass Name", _acwEsc(ACW.pass ? (ACW.pass.PassName || ACW.pass.PassID) : "-"), "acw-review-pass-name");
  inner += _acwReviewRow("Price", ACW.pass ? ('₹' + _acwEsc(_acwFmtNum(ACW.pass.PriceINR || 0))) : "-", "acw-review-pass-price");
  inner += _acwReviewRow("Coin Allocation", ACW.pass ? _acwEsc(_acwPassCoinLabel(ACW.pass)) : "-", "acw-review-pass-coins");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">CAMPAIGN FUEL</h4>';
  inner += _acwReviewRow("Campaign Fuel", parseInt(ACW.fuel, 10) + ' coins', "acw-review-fuel");
  inner += '<h4 style="font-size:12px;color:#5b8def;margin:10px 0 4px 0;">TREASURY</h4>';
  inner += _acwReviewRow("Treasury Available", ACW.treasuryBalance + ' coins');
  inner += _acwReviewRow("Funding Source", 'PROMOTION TREASURY', "acw-review-funding");
  inner += '<div id="acwSubmitError" style="color:#ff4757;font-size:13px;margin-top:10px;display:none;"></div>';
  _acwSetBody(_acwSection("REVIEW & CREATE", inner));
}
/* ACW_PART_12_END */

/*
------------------------------------------------------------
SUBMIT — ?action=admincreatecampaign
------------------------------------------------------------
*/

window._acwSubmit = async function() {
  if (ACW.submitting) return;
  for (var s = 1; s <= 8; s++) {
    var err = _acwValidateStep(s);
    if (err) { showToast(err, "error"); ACW.step = s; _acwRender(); return; }
  }
  var session = _acwSession();
  if (!session) { showToast("Session expired. Please login again.", "error"); return; }

  ACW.submitting = true;
  var btn = document.getElementById("acwCreateBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Creating..."; }

  // A unique idempotency key per DELIBERATE submission.
  var idempotencyKey = "ACW-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);

  var params = {
    session: session,
    idempotencyKey: idempotencyKey,
    passId: ACW.pass.PassID,
    ownerUserId: ACW.direct ? "" : (ACW.owner ? ACW.owner.UserID : ""),
    targetType: ACW.direct ? "" : (ACW.target ? ACW.target.type : ""),
    targetId: ACW.direct ? "" : (ACW.target ? ACW.target.id : ""),
    creativeType: ACW.creativeMode,
    imageURL: ACW.imageURL || "",
    videoURL: ACW.videoURL || "",
    externalURL: ACW.externalURL || "",
    mediaDuration: ACW.mediaDuration !== null ? String(ACW.mediaDuration) : "",
    adDurationSeconds: String(Number(ACW.adDuration)),
    cta: "Learn More",
    destinationType: _acwDestinationType(),
    lifetimeDays: String(parseInt(ACW.lifetimeDays, 10)),
    radius: ACW.radius,
    latitude: ACW.lat !== null ? String(ACW.lat) : "",
    longitude: ACW.lng !== null ? String(ACW.lng) : "",
    pipEnabled: "Yes",
    featured: "No",
    priority: "0",
    promotionTier: "Standard",
    campaignFuel: String(parseInt(ACW.fuel, 10))
  };
  window._acwLastRequest = params;

  var url = getApiUrl() + "?action=admincreatecampaign";
  Object.keys(params).forEach(function(k) {
    url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
  });

  try {
    var json = await (await fetch(url)).json();
    ACW.submitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "🚀 Create Campaign"; }
    if (json && json.success && json.data) {
      // Idempotent duplicate responses are surfaced clearly — no resubmit.
      ACW.result = {
        idempotent: !!json.data.idempotent,
        campaignId: json.data.campaignId || "",
        passId: json.data.passId || (ACW.pass ? ACW.pass.PassID : ""),
        ownerUserId: json.data.ownerUserID || (ACW.owner ? ACW.owner.UserID : ""),
        target: ACW.target ? ACW.target.title : "",
        fuel: json.data.promotionFuel !== undefined ? Number(json.data.promotionFuel) : parseInt(ACW.fuel, 10),
        remainingFuel: json.data.remainingFuel !== undefined ? Number(json.data.remainingFuel) : null,
        location: ACW.locName || "",
        radius: ACW.radius === "All India" ? "All India" : ACW.radius + " KM"
      };
      showToast(json.message || "Admin campaign created", "success");
      _acwRender();
    } else {
      _acwShowSubmitError((json && json.message) || "Campaign creation failed.");
    }
  } catch (err) {
    ACW.submitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "🚀 Create Campaign"; }
    _acwShowSubmitError("Network failure: " + err.message);
  }
};

function _acwShowSubmitError(msg) {
  var box = document.getElementById("acwSubmitError");
  if (box) {
    box.style.display = "block";
    box.textContent = "❌ " + msg;
  } else {
    showToast(msg, "error");
  }
}

/*
------------------------------------------------------------
SUCCESS SCREEN
------------------------------------------------------------
*/

function _acwRenderSuccess() {
  var r = ACW.result;
  var inner = "";
  inner += '<div style="text-align:center;padding:10px 0 18px 0;">';
  inner += '<div style="font-size:40px;">✅</div>';
  inner += '<h3 style="margin:6px 0;" data-testid="acw-success-title">Campaign Created Successfully</h3>';
  if (r.idempotent) {
    inner += '<div style="font-size:12px;color:#ff9f43;">Duplicate request detected — showing the already-created campaign (no double debit).</div>';
  }
  inner += '</div>';
  inner += _acwReviewRow("CampaignID", _acwEsc(r.campaignId || "-"), "acw-success-campaignid");
  inner += _acwReviewRow("PassID", _acwEsc(r.passId || "-"), "acw-success-passid");
  inner += _acwReviewRow("Owner", _acwEsc(r.ownerUserId || "-"), "acw-success-owner");
  inner += _acwReviewRow("Target", _acwEsc(r.target || "-"), "acw-success-target");
  inner += _acwReviewRow("Campaign Fuel", r.fuel + ' coins', "acw-success-fuel");
  inner += _acwReviewRow("Remaining Fuel", (r.remainingFuel !== null ? r.remainingFuel + ' coins' : "-"), "acw-success-remaining");
  inner += _acwReviewRow("Campaign Location", _acwEsc(r.location || "-"), "acw-success-location");
  inner += _acwReviewRow("Radius", _acwEsc(r.radius), "acw-success-radius");
  inner += _acwReviewRow("Funding Source", 'PROMOTION TREASURY');
  _acwSetBody(inner);
}
