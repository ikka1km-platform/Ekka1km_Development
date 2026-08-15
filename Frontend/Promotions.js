/*
============================================================
EKKA1KM FRONTEND
Promotions.js
Stage 4M — Promotions & Campaign UX Redesign
Production-quality promotions management experience
Reuses existing backend APIs — NO backend changes required
============================================================
*/

/* ==========================================================
   STATE
   ========================================================== */
var PROMO_VIEW = "list";        // "list" | "detail" | "create" | "analytics"
var PROMO_CAMPAIGNS = [];
var PROMO_SELECTED_CAMPAIGN = null;
var PROMO_WALLET_BALANCE = 0;
var PROMO_CREATING = false;
// PCC state - single card configuration
var PROMO_PROMOTION_TYPE = "Product";  // Product | Business | Property
var PROMO_TARGET_LOCATION = "";        // display name
var PROMO_TARGET_LAT = 0;              // latitude
var PROMO_TARGET_LNG = 0;              // longitude
var PROMO_TARGET_ID = "";          // selected listing id
var PROMO_TARGET_TITLE = "";       // selected listing title

var PROMO_RADIUS = "51";               // 1|5|10|25|51|100|All India
var PROMO_DURATION = "7";              // 1|3|7|15|30
var PROMO_BASE_PRICE = 0;
var PROMO_TOTAL_PRICE = 0;
var PROMO_LOADING = false;
var PROMO_ERROR = null;

/* ==========================================================
   PROMOTION TYPE PRICING (mirrors Backend/Promotions.js)
   ========================================================== */
var PROMO_PRICES = {
  "Silver": { "1": 10, "5": 20, "10": 30, "25": 50, "51": 75, "100": 100, "All India": 200 },
  "Gold": { "1": 25, "5": 50, "10": 75, "25": 100, "51": 150, "100": 200, "All India": 400 },
  "Titanium": { "1": 50, "5": 100, "10": 150, "25": 200, "51": 300, "100": 400, "All India": 800 }
};
var PROMO_DURATION_MULTIPLIER = { "1": 1, "3": 3, "7": 7, "15": 15, "30": 30 };
var PROMO_POOL_RATIO = 0.7; // 70% goes to reward pool

/* ==========================================================
   STATUS MAPPING — professional chips
   ========================================================== */
var PROMO_STATUS_CONFIG = {
  "Active":     { label: "Running",    icon: "play_circle", color: "#0f9d58", bg: "#e6f4ea" },
  "Running":    { label: "Running",    icon: "play_circle", color: "#0f9d58", bg: "#e6f4ea" },
  "Pending":    { label: "Pending",    icon: "schedule",    color: "#f9a825", bg: "#fff8e1" },
  "Draft":      { label: "Draft",      icon: "edit_note",   color: "#757575", bg: "#f5f5f5" },
  "Paused":     { label: "Paused",     icon: "pause_circle",color: "#1565c0", bg: "#e3f2fd" },
  "Completed":  { label: "Completed",  icon: "check_circle",color: "#2e7d32", bg: "#e8f5e9" },
  "Expired":    { label: "Expired",    icon: "timer_off",   color: "#757575", bg: "#eeeeee" },
  "Cancelled":  { label: "Cancelled",  icon: "cancel",      color: "#c62828", bg: "#ffebee" },
  "Rejected":   { label: "Rejected",   icon: "block",       color: "#c62828", bg: "#ffebee" },
  "Suspended":  { label: "Suspended",  icon: "gavel",       color: "#e65100", bg: "#fff3e0" },
  "Approved":   { label: "Approved",   icon: "verified",    color: "#0f9d58", bg: "#e6f4ea" },
  "Stopped":    { label: "Stopped",    icon: "stop_circle", color: "#c62828", bg: "#ffebee" }
};

function getPromoStatusCfg(status) {
  return PROMO_STATUS_CONFIG[status] || { label: status, icon: "help", color: "#888", bg: "#f5f5f5" };
}

/* ==========================================================
   PROMOTION TYPE COLORS
   ========================================================== */
var PROMO_TYPE_COLORS = {
  "Silver":   { color: "#757575", bg: "#f5f5f5", label: "Silver" },
  "Gold":     { color: "#f57c00", bg: "#fff3e0", label: "Gold" },
  "Titanium": { color: "#0f9d58", bg: "#e6f4ea", label: "Titanium" }
};

/* ==========================================================
   MAIN ENTRY POINT
   Called when user navigates to promotions page
   ========================================================== */
function openPromotionsPage() {
  if (!requireLogin()) return;
  loadPromotionsData();
}

/* ==========================================================
   LOAD PROMOTIONS DATA
   Fetches user promotions and wallet balance
   ========================================================== */
function loadPromotionsData() {
  PROMO_LOADING = true;
  PROMO_ERROR = null;
  renderPromotionsPage();

  var userId = getUserId();
  if (!userId) {
    PROMO_LOADING = false;
    renderPromotionsPage();
    return;
  }

  // Fetch promotions and wallet in parallel
  var promoUrl = getApiUrl() + "?action=getuserpromotions&userId=" + encodeURIComponent(userId);
  var walletUrl = getApiUrl() + "?action=wallet&userId=" + encodeURIComponent(userId);

  Promise.all([
    fetch(promoUrl).then(function(r) { return r.json(); }),
    fetch(walletUrl).then(function(r) { return r.json(); })
  ])
  .then(function(results) {
    var promoRes = results[0];
    var walletRes = results[1];

    if (promoRes && promoRes.success && promoRes.data) {
      PROMO_CAMPAIGNS = (promoRes.data.data || []).map(function(c) {
        return normalizePromotion(c);
      });
      PROMO_CAMPAIGNS.sort(function(a, b) {
        var order = { "Active": 0, "Running": 0, "Pending": 1, "Paused": 2, "Draft": 3, "Completed": 4, "Expired": 5, "Cancelled": 6, "Stopped": 6 };
        var aOrd = order[a.Status] !== undefined ? order[a.Status] : 99;
        var bOrd = order[b.Status] !== undefined ? order[b.Status] : 99;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return new Date(b.CreatedDate || 0) - new Date(a.CreatedDate || 0);
      });
    } else {
      PROMO_CAMPAIGNS = [];
    }

    if (walletRes && walletRes.success && walletRes.data) {
      PROMO_WALLET_BALANCE = Number(walletRes.data.coins || walletRes.data.Balance || 0);
    }

    PROMO_LOADING = false;
    renderPromotionsPage();
  })
  .catch(function(err) {
    console.log("loadPromotionsData error:", err);
    PROMO_LOADING = false;
    PROMO_ERROR = "Failed to load promotions. Please try again.";
    renderPromotionsPage();
  });
}

/* ==========================================================
   NORMALIZE PROMOTION (map backend fields)
   ========================================================== */
function normalizePromotion(p) {
  if (!p) return p;
  var n = {};
  
  // V2 field mapping (PromotionCampaigns sheet)
  n.PromotionID = p.PromotionID || p.campaignId || p.CampaignID || "";
  n.UserID = p.UserID || p.userId || p.OwnerUserID || "";
  n.PromotionType = p.PromotionType || p.promotionType || p.CampaignType || "Silver";
  n.TargetType = p.TargetType || p.targetType || p.PromotedEntityType || "";
  n.TargetID = p.TargetID || p.targetId || p.PromotedEntityID || "";
  n.Radius = p.Radius || p.radius || p.TargetRadius || "All India";
  n.Duration = p.Duration || p.duration || String(p.Duration || "1");
  
  // V2: Map legacy V1 fields to V2 schema
  n.CoinsSpent = Number(p.CoinsSpent || p.coinsSpent || p.CoinsConsumed || 0);
  n.RewardPool = Number(p.RewardPool || p.rewardPool || p.PromotionFuel || 0);
  n.RemainingRewardCoins = Number(p.RemainingRewardCoins || p.remainingRewardCoins || p.RemainingFuel || 0);
  
  n.Views = Number(p.Views || p.views || 0);
  n.Clicks = Number(p.Clicks || p.clicks || 0);
  n.Interested = Number(p.Interested || p.interested || 0);
  n.CTR = Number(p.CTR || p.ctr || 0);
  n.Status = p.Status || p.status || "Pending";
  n.StartDate = p.StartDate || p.startDate || p.CreatedDate || p.CreatedAt || "";
  n.EndDate = p.EndDate || p.endDate || "";
  n.CreatedDate = p.CreatedDate || p.CreatedAt || p.createdDate || "";
  n.UpdatedDate = p.UpdatedDate || p.UpdatedAt || p.updatedDate || "";
  n.City = p.City || p.city || p.TargetCity || "";
  n.State = p.State || p.state || p.TargetState || "";
  n.Featured = p.Featured || "No";
  n.PIPEnabled = p.PIPEnabled || "No";
  n.ImageURL = p.ImageURL || p.imageURL || "";
  n.Title = p.Title || p.title || p.PromotionType || "Promotion";
  n.Description = p.Description || p.description || "";

  // Calculate derived fields
  n.CoinsUsed = n.CoinsSpent;
  n.RewardDistributed = Math.max(0, n.RewardPool - n.RemainingRewardCoins);
  n.RewardRemaining = n.RemainingRewardCoins;
  n.CTR = n.Views > 0 ? Math.round((n.Clicks / n.Views) * 100) : 0;
  n.ProgressPercent = n.RewardPool > 0 ? Math.min(100, Math.round((n.RewardDistributed / n.RewardPool) * 100)) : 0;

  return n;
}

/* ==========================================================
   RENDER PROMOTIONS PAGE
   Main render function — handles all views
   ========================================================== */
function renderPromotionsPage() {
  var container = document.getElementById("promotionsContent");
  if (!container) return;

  if (PROMO_VIEW === "create") {
    renderPCCCard(container);
    return;
  }

  if (PROMO_VIEW === "detail" && PROMO_SELECTED_CAMPAIGN) {
    renderCampaignDetail(container);
    return;
  }

  if (PROMO_VIEW === "analytics" && PROMO_SELECTED_CAMPAIGN) {
    renderCampaignAnalytics(container);
    return;
  }

  renderCampaignList(container);
}

/* ==========================================================
   RENDER CAMPAIGN LIST (Main View)
   ========================================================== */
function renderCampaignList(container) {
  PROMO_VIEW = "list";

  if (PROMO_LOADING) {
    renderSkeleton(container);
    return;
  }

  if (PROMO_ERROR) {
    renderError(container);
    return;
  }

  var html = "";

  // Summary Cards
  html += renderSummaryCards();

  // Action Bar
  html += '<div class="promo-action-bar">';
  html += '<h3 class="promo-section-title">My Campaigns</h3>';
  html += '<button class="promo-btn-primary" onclick="openCreateWizard()">';
  html += '<i class="material-icons" style="font-size:18px;vertical-align:middle;">add_circle</i> Create Campaign';
  html += '</button>';
  html += '</div>';

  if (PROMO_CAMPAIGNS.length === 0) {
    html += renderEmptyState();
    container.innerHTML = html;
    return;
  }

  // Campaign Cards
  html += '<div class="promo-campaign-list">';
  PROMO_CAMPAIGNS.forEach(function(c, idx) {
    html += renderCampaignCard(c, idx);
  });
  html += '</div>';

  container.innerHTML = html;

  // Attach event listeners for expand/collapse
  document.querySelectorAll(".promo-card-toggle").forEach(function(el) {
    el.addEventListener("click", function() {
      var card = this.closest(".promo-campaign-card");
      if (card) {
        card.classList.toggle("promo-card-expanded");
        var details = card.querySelector(".promo-card-details");
        if (details) {
          details.style.display = details.style.display === "block" ? "none" : "block";
        }
      }
    });
  });
}

/* ==========================================================
   RENDER SUMMARY CARDS
   ========================================================== */
function renderSummaryCards() {
  var active = 0, scheduled = 0, completed = 0;
  var coinsSpent = 0, rewardPool = 0, remainingPool = 0;

  PROMO_CAMPAIGNS.forEach(function(c) {
    var s = String(c.Status || "");
    if (s === "Active" || s === "Running") active++;
    else if (s === "Pending" || s === "Draft") scheduled++;
    else if (s === "Completed" || s === "Expired" || s === "Cancelled" || s === "Stopped") completed++;
    coinsSpent += Number(c.CoinsSpent || 0);
    rewardPool += Number(c.RewardPool || 0);
    remainingPool += Number(c.RemainingRewardCoins || 0);
  });

  var html = '<div class="promo-summary-grid">';
  html += summaryCard("Active Campaigns", active, "play_circle", "#0f9d58", "#e6f4ea");
  html += summaryCard("Scheduled", scheduled, "schedule", "#f9a825", "#fff8e1");
  html += summaryCard("Completed", completed, "check_circle", "#2e7d32", "#e8f5e9");
  html += summaryCard("Coins Spent", coinsSpent, "account_balance_wallet", "#1565c0", "#e3f2fd");
  html += summaryCard("Reward Pool", rewardPool, "redeem", "#e65100", "#fff3e0");
  html += summaryCard("Balance", PROMO_WALLET_BALANCE, "monetization_on", "#0f9d58", "#e6f4ea");
  html += '</div>';
  return html;
}

function summaryCard(label, value, icon, color, bg) {
  var val = typeof value === "number" ? value.toLocaleString() : value;
  return '<div class="promo-summary-card" style="--summ-color:' + color + ';--summ-bg:' + bg + ';">' +
    '<div class="promo-summary-icon"><i class="material-icons" style="color:' + color + ';">' + icon + '</i></div>' +
    '<div class="promo-summary-info">' +
    '<div class="promo-summary-value">' + val + '</div>' +
    '<div class="promo-summary-label">' + label + '</div>' +
    '</div></div>';
}

/* ==========================================================
   RENDER CAMPAIGN CARD
   ========================================================== */
function renderCampaignCard(c, idx) {
  var sc = getPromoStatusCfg(c.Status);
  var tc = PROMO_TYPE_COLORS[c.PromotionType] || { color: "#888", bg: "#f5f5f5", label: c.PromotionType };
  var startDate = c.StartDate ? formatDate(c.StartDate) : "—";
  var endDate = c.EndDate ? formatDate(c.EndDate) : "—";
  var ctr = c.Views > 0 ? Math.round((c.Clicks / c.Views) * 100) + "%" : "0%";
  var progress = c.ProgressPercent || 0;

  var html = '<div class="promo-campaign-card" data-idx="' + idx + '">';

  // Card Header
  html += '<div class="promo-card-header" onclick="selectCampaign(' + idx + ')">';

  // Thumbnail
  html += '<div class="promo-card-thumb">';
  if (c.ImageURL) {
    html += '<img src="' + c.ImageURL + '" onerror="this.style.display=\'none\'" alt="">';
  } else {
    html += '<div class="promo-card-thumb-placeholder">';
    html += '<i class="material-icons">campaign</i>';
    html += '</div>';
  }
  html += '</div>';

  // Info
  html += '<div class="promo-card-info">';
  html += '<div class="promo-card-title">' + escapeHtml(c.Title || c.PromotionType + " Campaign") + '</div>';
  html += '<div class="promo-card-meta">';
  if (c.TargetType) html += '<span>' + c.TargetType + '</span>';
  if (c.Radius) html += '<span>📍 ' + c.Radius + ' KM</span>';
  html += '</div>';
  html += '<div class="promo-card-meta">';
  html += '<span>📅 ' + startDate + ' → ' + endDate + '</span>';
  html += '</div>';
  html += '</div>';

  // Status & Type
  html += '<div class="promo-card-badges">';
  html += '<span class="promo-chip" style="background:' + tc.bg + ';color:' + tc.color + ';">' + tc.label + '</span>';
  html += '<span class="promo-chip promo-chip-status" style="background:' + sc.bg + ';color:' + sc.color + ';">';
  html += '<i class="material-icons" style="font-size:14px;vertical-align:middle;">' + sc.icon + '</i> ' + sc.label;
  html += '</span>';
  html += '</div>';

  html += '</div>'; // end card-header

  // Quick Stats Row
  html += '<div class="promo-card-stats">';
  html += '<div class="promo-stat-item"><span class="promo-stat-value">' + (c.Views || 0) + '</span><span class="promo-stat-label">Views</span></div>';
  html += '<div class="promo-stat-item"><span class="promo-stat-value">' + (c.Clicks || 0) + '</span><span class="promo-stat-label">Clicks</span></div>';
  html += '<div class="promo-stat-item"><span class="promo-stat-value">' + (c.Interested || 0) + '</span><span class="promo-stat-label">Interested</span></div>';
  html += '<div class="promo-stat-item"><span class="promo-stat-value">' + ctr + '</span><span class="promo-stat-label">CTR</span></div>';
  html += '</div>';

  // Budget Row
  html += '<div class="promo-card-budget">';
  html += '<div class="promo-budget-item"><span class="promo-budget-label">Spent</span><span class="promo-budget-val">' + (c.CoinsSpent || 0) + '</span></div>';
  html += '<div class="promo-budget-item"><span class="promo-budget-label">Pool</span><span class="promo-budget-val">' + (c.RewardPool || 0) + '</span></div>';
  html += '<div class="promo-budget-item"><span class="promo-budget-label">Remaining</span><span class="promo-budget-val">' + (c.RemainingRewardCoins || 0) + '</span></div>';
  html += '</div>';

  // Featured & PIP Badges (if applicable)
  if (String(c.Featured || "").toLowerCase() === "yes") {
    html += '<span class="promo-chip promo-chip-featured" style="background:#ff6f00;color:#fff;">★ Featured</span> ';
  }
  if (String(c.PIPEnabled || "").toLowerCase() === "yes") {
    html += '<span class="promo-chip promo-chip-pip" style="background:#1565c0;color:#fff;">PIP Enabled</span>';
  }

  // Progress Bar
  html += '<div class="promo-card-progress">';
  html += '<div class="promo-progress-bar"><div class="promo-progress-fill" style="width:' + progress + '%;background:' + sc.color + ';"></div></div>';
  html += '<span class="promo-progress-text">' + progress + '%</span>';
  html += '</div>';

  // Actions
  html += '<div class="promo-card-actions">';
  html += '<button class="promo-btn-sm" onclick="event.stopPropagation();viewCampaignAnalytics(' + idx + ')"><i class="material-icons" style="font-size:16px;vertical-align:middle;">analytics</i> Analytics</button>';

  if (c.Status === "Active" || c.Status === "Running") {
    html += '<button class="promo-btn-sm promo-btn-warning" onclick="event.stopPropagation();pauseCampaignAction(\'' + c.PromotionID + '\',' + idx + ')"><i class="material-icons" style="font-size:16px;vertical-align:middle;">pause_circle</i> Pause</button>';
  }
  if (c.Status === "Paused") {
    html += '<button class="promo-btn-sm" onclick="event.stopPropagation();resumeCampaignAction(\'' + c.PromotionID + '\',' + idx + ')"><i class="material-icons" style="font-size:16px;vertical-align:middle;">play_circle</i> Resume</button>';
  }
  if (c.Status === "Active" || c.Status === "Running" || c.Status === "Paused") {
    html += '<button class="promo-btn-sm promo-btn-danger" onclick="event.stopPropagation();stopCampaignAction(\'' + c.PromotionID + '\',' + idx + ')"><i class="material-icons" style="font-size:16px;vertical-align:middle;">stop_circle</i> Stop</button>';
  }

  html += '</div>';

  // Expanded Details
  html += '<div class="promo-card-details" style="display:none;">';
  html += renderCardDetails(c);
  html += '</div>';

  html += '</div>'; // end promo-campaign-card
  return html;
}

/* ==========================================================
   RENDER CARD DETAILS (expanded section)
   ========================================================== */
function renderCardDetails(c) {
  var poolDistributed = Math.max(0, (c.RewardPool || 0) - (c.RemainingRewardCoins || 0));
  var html = '<div class="promo-details-grid">';

  html += '<div class="promo-detail-section">';
  html += '<h4>Campaign Info</h4>';
  html += '<div class="promo-detail-row"><span>Type</span><span>' + (c.PromotionType || "—") + '</span></div>';
  html += '<div class="promo-detail-row"><span>Target</span><span>' + (c.TargetType || "—") + ' (' + (c.TargetID || "—") + ')</span></div>';
  html += '<div class="promo-detail-row"><span>Radius</span><span>' + (c.Radius || "—") + ' KM</span></div>';
  html += '<div class="promo-detail-row"><span>Duration</span><span>' + (c.Duration || "—") + ' day(s)</span></div>';
  if (c.City) html += '<div class="promo-detail-row"><span>City</span><span>' + escapeHtml(c.City) + '</span></div>';
  html += '</div>';

  html += '<div class="promo-detail-section">';
  html += '<h4>Budget</h4>';
  html += '<div class="promo-detail-row"><span>Coins Spent</span><span>' + (c.CoinsSpent || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Reward Pool</span><span>' + (c.RewardPool || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Distributed</span><span>' + poolDistributed + '</span></div>';
  html += '<div class="promo-detail-row"><span>Remaining</span><span>' + (c.RemainingRewardCoins || 0) + '</span></div>';
  html += '</div>';

  html += '<div class="promo-detail-section">';
  html += '<h4>Performance</h4>';
  html += '<div class="promo-detail-row"><span>Views</span><span>' + (c.Views || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Clicks</span><span>' + (c.Clicks || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Interested</span><span>' + (c.Interested || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>CTR</span><span>' + (c.Views > 0 ? Math.round((c.Clicks / c.Views) * 100) + "%" : "0%") + '</span></div>';
  html += '</div>';

  html += '</div>'; // end promo-details-grid
  return html;
}

/* ==========================================================
   SELECT CAMPAIGN (navigate to detail screen)
   ========================================================== */
function selectCampaign(idx) {
  if (idx >= 0 && idx < PROMO_CAMPAIGNS.length) {
    PROMO_SELECTED_CAMPAIGN = PROMO_CAMPAIGNS[idx];
    PROMO_VIEW = "detail";
    renderPromotionsPage();
  }
}

/* ==========================================================
   RENDER CAMPAIGN DETAIL (full screen)
   ========================================================== */
function renderCampaignDetail(container) {
  var c = PROMO_SELECTED_CAMPAIGN;
  if (!c) {
    PROMO_VIEW = "list";
    renderPromotionsPage();
    return;
  }

  var sc = getPromoStatusCfg(c.Status);
  var tc = PROMO_TYPE_COLORS[c.PromotionType] || { color: "#888", bg: "#f5f5f5", label: c.PromotionType };
  var startDate = c.StartDate ? formatDate(c.StartDate) : "—";
  var endDate = c.EndDate ? formatDate(c.EndDate) : "—";
  var poolDistributed = Math.max(0, (c.RewardPool || 0) - (c.RemainingRewardCoins || 0));

  var html = '<div class="promo-detail-page">';

  // Back button
  html += '<button class="promo-btn-back" onclick="backToCampaignList()"><i class="material-icons" style="font-size:20px;vertical-align:middle;">arrow_back</i> Back to Campaigns</button>';

  // Header
  html += '<div class="promo-detail-header">';
  html += '<div class="promo-detail-title-row">';
  html += '<h2>' + escapeHtml(c.Title || c.PromotionType + " Campaign") + '</h2>';
  html += '<div class="promo-detail-badges">';
  html += '<span class="promo-chip" style="background:' + tc.bg + ';color:' + tc.color + ';">' + tc.label + '</span>';
  html += '<span class="promo-chip promo-chip-status" style="background:' + sc.bg + ';color:' + sc.color + ';">';
  html += '<i class="material-icons" style="font-size:14px;vertical-align:middle;">' + sc.icon + '</i> ' + sc.label;
  html += '</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="promo-detail-dates">' + startDate + ' → ' + endDate + '</div>';
  html += '</div>';

  // Progress
  html += '<div class="promo-detail-progress">';
  html += '<div class="promo-progress-bar promo-progress-bar-lg"><div class="promo-progress-fill" style="width:' + (c.ProgressPercent || 0) + '%;background:' + sc.color + ';"></div></div>';
  html += '<div class="promo-progress-labels">';
  html += '<span>Reward Pool: ' + (c.RewardPool || 0) + ' coins</span>';
  html += '<span>' + (c.ProgressPercent || 0) + '% distributed</span>';
  html += '<span>Remaining: ' + (c.RemainingRewardCoins || 0) + ' coins</span>';
  html += '</div>';
  html += '</div>';

  // KPI Grid
  html += '<div class="promo-kpi-grid">';
  html += kpiCard("👁 Views", c.Views || 0, "#1565c0");
  html += kpiCard("👆 Clicks", c.Clicks || 0, "#0f9d58");
  html += kpiCard("❤️ Interested", c.Interested || 0, "#e65100");
  html += kpiCard("📊 CTR", c.Views > 0 ? Math.round((c.Clicks / c.Views) * 100) + "%" : "0%", "#f9a825");
  html += kpiCard("💰 Spent", c.CoinsSpent || 0, "#c62828");
  html += kpiCard("🎁 Distributed", poolDistributed, "#2e7d32");
  html += '</div>';

  // Details Grid
  html += '<div class="promo-detail-sections">';

  html += '<div class="promo-detail-section">';
  html += '<h4>Campaign Information</h4>';
  html += '<div class="promo-detail-row"><span>Promotion Type</span><span>' + (c.PromotionType || "—") + '</span></div>';
  html += '<div class="promo-detail-row"><span>Target Type</span><span>' + (c.TargetType || "—") + '</span></div>';
  html += '<div class="promo-detail-row"><span>Target ID</span><span>' + (c.TargetID || "—") + '</span></div>';
  html += '<div class="promo-detail-row"><span>Radius</span><span>' + (c.Radius || "—") + ' KM</span></div>';
  html += '<div class="promo-detail-row"><span>Duration</span><span>' + (c.Duration || "—") + ' day(s)</span></div>';
  if (c.City) html += '<div class="promo-detail-row"><span>City</span><span>' + escapeHtml(c.City) + '</span></div>';
  if (c.State) html += '<div class="promo-detail-row"><span>State</span><span>' + escapeHtml(c.State) + '</span></div>';
  html += '</div>';

  html += '<div class="promo-detail-section">';
  html += '<h4>Budget & Rewards</h4>';
  html += '<div class="promo-detail-row"><span>Total Coins Spent</span><span>' + (c.CoinsSpent || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Reward Pool</span><span>' + (c.RewardPool || 0) + ' coins</span></div>';
  html += '<div class="promo-detail-row"><span>Coins Distributed</span><span>' + poolDistributed + ' coins</span></div>';
  html += '<div class="promo-detail-row"><span>Remaining in Pool</span><span>' + (c.RemainingRewardCoins || 0) + ' coins</span></div>';
  html += '<div class="promo-detail-row"><span>Views Generated</span><span>' + (c.Views || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Cost Per View</span><span>' + (c.Views > 0 ? Math.round((c.CoinsSpent || 0) / (c.Views || 1)) + " coins" : "—") + '</span></div>';
  html += '</div>';

  html += '<div class="promo-detail-section">';
  html += '<h4>Performance</h4>';
  html += '<div class="promo-detail-row"><span>Views</span><span>' + (c.Views || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Clicks</span><span>' + (c.Clicks || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>Interested</span><span>' + (c.Interested || 0) + '</span></div>';
  html += '<div class="promo-detail-row"><span>CTR</span><span>' + (c.Views > 0 ? Math.round((c.Clicks / c.Views) * 100) + "%" : "0%") + '</span></div>';
  html += '<div class="promo-detail-row"><span>Conversion Rate</span><span>' + (c.Views > 0 ? Math.round((c.Interested / c.Views) * 100) + "%" : "0%") + '</span></div>';
  html += '</div>';

  html += '</div>';

  // Actions
  html += '<div class="promo-detail-actions">';
  html += '<button class="promo-btn-primary" onclick="viewCampaignAnalyticsFromDetail()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">analytics</i> View Analytics</button>';
  if (c.Status === "Active" || c.Status === "Running") {
    html += '<button class="promo-btn-warning" onclick="pauseCampaignAction(\'' + c.PromotionID + '\',-1)"><i class="material-icons" style="font-size:18px;vertical-align:middle;">pause_circle</i> Pause Campaign</button>';
  }
  if (c.Status === "Paused") {
    html += '<button class="promo-btn-primary" onclick="resumeCampaignAction(\'' + c.PromotionID + '\',-1)"><i class="material-icons" style="font-size:18px;vertical-align:middle;">play_circle</i> Resume Campaign</button>';
  }
  if (c.Status === "Active" || c.Status === "Running" || c.Status === "Paused") {
    html += '<button class="promo-btn-danger" onclick="stopCampaignAction(\'' + c.PromotionID + '\',-1)"><i class="material-icons" style="font-size:18px;vertical-align:middle;">stop_circle</i> Stop Campaign</button>';
  }
  html += '<button class="promo-btn-secondary" onclick="backToCampaignList()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">arrow_back</i> Back to List</button>';
  html += '</div>';

  html += '</div>'; // end promo-detail-page
  container.innerHTML = html;
}

/* ==========================================================
   RENDER CAMPAIGN ANALYTICS
   ========================================================== */
function renderCampaignAnalytics(container) {
  var c = PROMO_SELECTED_CAMPAIGN;
  if (!c) {
    PROMO_VIEW = "list";
    renderPromotionsPage();
    return;
  }

  var poolDistributed = Math.max(0, (c.RewardPool || 0) - (c.RemainingRewardCoins || 0));
  var ctr = c.Views > 0 ? Math.round((c.Clicks / c.Views) * 100) : 0;
  var conversionRate = c.Views > 0 ? Math.round((c.Interested / c.Views) * 100) : 0;

  var html = '<div class="promo-analytics-page">';

  // Back button
  html += '<button class="promo-btn-back" onclick="backToCampaignList()"><i class="material-icons" style="font-size:20px;vertical-align:middle;">arrow_back</i> Back to Campaigns</button>';

  html += '<h2 class="promo-analytics-title">📊 Campaign Analytics</h2>';
  html += '<p class="promo-analytics-subtitle">' + escapeHtml(c.Title || c.PromotionType + " Campaign") + ' — ' + (c.PromotionType || "") + '</p>';

  // KPI Grid
  html += '<div class="promo-kpi-grid promo-kpi-grid-lg">';
  html += kpiCard("👁 Total Views", c.Views || 0, "#1565c0");
  html += kpiCard("👆 Total Clicks", c.Clicks || 0, "#0f9d58");
  html += kpiCard("❤️ Interested", c.Interested || 0, "#e65100");
  html += kpiCard("📊 CTR", ctr + "%", "#f9a825");
  html += kpiCard("🎁 Coins Distributed", poolDistributed, "#2e7d32");
  html += kpiCard("💰 Remaining Pool", c.RemainingRewardCoins || 0, "#c62828");
  html += '</div>';

  // Progress Section
  html += '<div class="promo-analytics-section">';
  html += '<h3>Campaign Progress</h3>';
  html += '<div class="promo-analytics-progress">';
  html += '<div class="promo-progress-bar promo-progress-bar-xl"><div class="promo-progress-fill" style="width:' + (c.ProgressPercent || 0) + '%;background:#0f9d58;"></div></div>';
  html += '<div class="promo-progress-labels">';
  html += '<span>💰 Budget: ' + (c.CoinsSpent || 0) + ' coins</span>';
  html += '<span>🎯 Progress: ' + (c.ProgressPercent || 0) + '%</span>';
  html += '<span>📅 ' + (c.StartDate ? formatDate(c.StartDate) : "—") + ' → ' + (c.EndDate ? formatDate(c.EndDate) : "—") + '</span>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Performance Metrics
  html += '<div class="promo-analytics-section">';
  html += '<h3>Performance Metrics</h3>';
  html += '<div class="promo-metrics-grid">';

  // CTR Chart (simple bar chart)
  html += '<div class="promo-metric-chart">';
  html += '<h4>Click-Through Rate (CTR)</h4>';
  html += '<div class="promo-chart-bar-container">';
  html += '<div class="promo-chart-bar-label">CTR</div>';
  html += '<div class="promo-chart-bar-track"><div class="promo-chart-bar-fill" style="width:' + Math.min(ctr, 100) + '%;background:#f9a825;"></div></div>';
  html += '<div class="promo-chart-bar-value">' + ctr + '%</div>';
  html += '</div>';
  html += '<div class="promo-chart-bar-container">';
  html += '<div class="promo-chart-bar-label">Conversion</div>';
  html += '<div class="promo-chart-bar-track"><div class="promo-chart-bar-fill" style="width:' + Math.min(conversionRate, 100) + '%;background:#0f9d58;"></div></div>';
  html += '<div class="promo-chart-bar-value">' + conversionRate + '%</div>';
  html += '</div>';
  html += '</div>';

  // Distribution Chart
  html += '<div class="promo-metric-chart">';
  html += '<h4>Reward Distribution</h4>';
  html += '<div class="promo-chart-bar-container">';
  html += '<div class="promo-chart-bar-label">Distributed</div>';
  html += '<div class="promo-chart-bar-track"><div class="promo-chart-bar-fill" style="width:' + (c.RewardPool > 0 ? Math.round((poolDistributed / c.RewardPool) * 100) : 0) + '%;background:#2e7d32;"></div></div>';
  html += '<div class="promo-chart-bar-value">' + poolDistributed + '</div>';
  html += '</div>';
  html += '<div class="promo-chart-bar-container">';
  html += '<div class="promo-chart-bar-label">Remaining</div>';
  html += '<div class="promo-chart-bar-track"><div class="promo-chart-bar-fill" style="width:' + (c.RewardPool > 0 ? Math.round((c.RemainingRewardCoins / c.RewardPool) * 100) : 0) + '%;background:#c62828;"></div></div>';
  html += '<div class="promo-chart-bar-value">' + (c.RemainingRewardCoins || 0) + '</div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end promo-metrics-grid
  html += '</div>';

  // Summary Stats
  html += '<div class="promo-analytics-section">';
  html += '<h3>Campaign Summary</h3>';
  html += '<div class="promo-summary-table">';
  html += '<div class="promo-summary-row"><span>Total Views</span><strong>' + (c.Views || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Total Clicks</span><strong>' + (c.Clicks || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Interested Users</span><strong>' + (c.Interested || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Click-Through Rate</span><strong>' + ctr + '%</strong></div>';
  html += '<div class="promo-summary-row"><span>Conversion Rate</span><strong>' + conversionRate + '%</strong></div>';
  html += '<div class="promo-summary-row"><span>Coins Spent</span><strong>' + (c.CoinsSpent || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Reward Pool</span><strong>' + (c.RewardPool || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Coins Distributed</span><strong>' + poolDistributed + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Remaining Rewards</span><strong>' + (c.RemainingRewardCoins || 0) + '</strong></div>';
  html += '<div class="promo-summary-row"><span>Cost Per View</span><strong>' + (c.Views > 0 ? Math.round((c.CoinsSpent || 0) / (c.Views || 1)) + " coins" : "—") + '</strong></div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="promo-detail-actions">';
  html += '<button class="promo-btn-secondary" onclick="backToCampaignList()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">arrow_back</i> Back to Campaigns</button>';
  html += '</div>';

  html += '</div>'; // end promo-analytics-page
  container.innerHTML = html;
}

/* ==========================================================
   KPI CARD
   ========================================================== */
function kpiCard(label, value, color) {
  var val = typeof value === "number" ? value.toLocaleString() : value;
  return '<div class="promo-kpi-card" style="border-left:4px solid ' + color + ';">' +
    '<div class="promo-kpi-value" style="color:' + color + ';">' + val + '</div>' +
    '<div class="promo-kpi-label">' + label + '</div></div>';
}

/* ==========================================================
   VIEW CAMPAIGN ANALYTICS
   ========================================================== */
function viewCampaignAnalytics(idx) {
  if (idx >= 0 && idx < PROMO_CAMPAIGNS.length) {
    PROMO_SELECTED_CAMPAIGN = PROMO_CAMPAIGNS[idx];
    PROMO_VIEW = "analytics";
    renderPromotionsPage();
  }
}

function viewCampaignAnalyticsFromDetail() {
  PROMO_VIEW = "analytics";
  renderPromotionsPage();
}

/* ==========================================================
   BACK TO LIST
   ========================================================== */
function backToCampaignList() {
  PROMO_VIEW = "list";
  PROMO_SELECTED_CAMPAIGN = null;
  renderPromotionsPage();
}

/* ==========================================================
   CAMPAIGN ACTIONS
   ========================================================== */
function pauseCampaignAction(id, idx) {
  if (!confirm("Pause this campaign? It will stop delivering until resumed.")) return;
  var url = getApiUrl() + "?action=pausepromotion&promotionId=" + encodeURIComponent(id);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        showToast("Campaign paused");
        loadPromotionsData();
      } else {
        showToast(res.message || "Failed to pause campaign");
      }
    })
    .catch(function(err) {
      console.log("Pause error:", err);
      showToast("Error pausing campaign");
    });
}

function resumeCampaignAction(id, idx) {
  if (!confirm("Resume this campaign?")) return;
  var url = getApiUrl() + "?action=resumepromotion&promotionId=" + encodeURIComponent(id);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        showToast("Campaign resumed");
        loadPromotionsData();
      } else {
        showToast(res.message || "Failed to resume campaign");
      }
    })
    .catch(function(err) {
      console.log("Resume error:", err);
      showToast("Error resuming campaign");
    });
}

function stopCampaignAction(id, idx) {
  if (!confirm("Stop this campaign? This action cannot be undone.")) return;
  var url = getApiUrl() + "?action=stoppromotion&promotionId=" + encodeURIComponent(id);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        showToast("Campaign stopped");
        loadPromotionsData();
      } else {
        showToast(res.message || "Failed to stop campaign");
      }
    })
    .catch(function(err) {
      console.log("Stop error:", err);
      showToast("Error stopping campaign");
    });
}

/* ==========================================================
   CREATE CAMPAIGN (PCC) — single-card configuration
   ========================================================== */
function pccResetState() {
  PROMO_PROMOTION_TYPE = "Product";
  PROMO_TARGET_ID = "";
  PROMO_TARGET_TITLE = "";
  PROMO_TARGET_LOCATION = "";
  PROMO_TARGET_LAT = 0;
  PROMO_TARGET_LNG = 0;
  PROMO_RADIUS = "51";
  PROMO_DURATION = "7";
  calculatePCCTotalPrice();
}

function openCreateWizard() {
  PROMO_VIEW = "create";
  PROMO_CREATING = true;
  pccResetState();
  renderPromotionsPage();
}

function pccBackToList() {
  PROMO_VIEW = "list";
  PROMO_CREATING = false;
  renderPromotionsPage();
}

function renderPCCCard(container) {
  calculatePCCTotalPrice();

  var html = '';
  html += '<button class="promo-btn-back" onclick="pccBackToList()"><i class="material-icons" style="font-size:20px;vertical-align:middle;">arrow_back</i> Back to Campaigns</button>';
  html += '<div class="promo-pcc-card">';

  html += '<div class="pcc-head">';
  html += '<h2>🚀 Create Campaign</h2>';
  html += '<p>Configure your promotion campaign on a single card.</p>';
  html += '</div>';

  // --- 1. Choose What to Promote (original visual design preserved) ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title" style="font-size:17px;">Choose What to Promote</div>';
  html += '<p class="promo-wizard-desc">Select the type of listing you want to promote.</p>';
  html += '<div class="promo-wizard-options">';
  var pccTypes = [
    { id: "Product",  icon: "shopping_bag",      desc: "Promote a product listing" },
    { id: "Business", icon: "store",             desc: "Promote your business" },
    { id: "Property", icon: "real_estate_agent", desc: "Promote a property" }
  ];
  pccTypes.forEach(function(t) {
    var cardSel = t.id === PROMO_PROMOTION_TYPE ? ' promo-option-card selected' : ' promo-option-card';
    html += '<div class="' + cardSel + '" onclick="pccSelectListingType(\'' + t.id + '\')">';
    html += '<div class="promo-option-icon"><i class="material-icons">' + t.icon + '</i></div>';
    html += '<div class="promo-option-label">' + t.id + '</div>';
    html += '<div class="promo-option-desc">' + t.desc + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="promo-wizard-field" style="margin-bottom:0;">';
  html += '<label>Select your ' + PROMO_PROMOTION_TYPE + '</label>';
  html += '<select id="pccListingSelect" class="promo-wizard-select" onchange="pccSelectTarget()">';
  html += '<option value="">Select a ' + PROMO_PROMOTION_TYPE.toLowerCase() + '...</option>';
  html += '</select>';
  html += '</div>';
  html += '<div id="pccListingNote" class="pcc-selected-note"></div>';
  html += '</div>';

  // --- 2. Target Location ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title">Target Location</div>';
  if (PROMO_TARGET_LOCATION) {
    html += '<div class="pcc-location-display">';
    html += '<i class="material-icons" style="color:var(--primary, #0f9d58);">location_on</i>';
    html += '<div class="pcc-location-info">';
    html += '<div class="pcc-location-name">' + escapeHtml(PROMO_TARGET_LOCATION) + '</div>';
    if (PROMO_TARGET_LAT && PROMO_TARGET_LNG) {
      html += '<div class="pcc-location-coords">' + PROMO_TARGET_LAT.toFixed(4) + ', ' + PROMO_TARGET_LNG.toFixed(4) + '</div>';
    }
    html += '</div>';
    html += '<button type="button" class="pcc-btn pcc-btn-ghost" onclick="pccChangeLocation()"><i class="material-icons" style="font-size:16px;vertical-align:middle;">edit_location_alt</i> Change</button>';
    html += '</div>';
  } else {
    html += '<p class="pcc-muted">Campaign target stays separate from your current discovery location.</p>';
    html += '<div class="pcc-location-actions">';
    html += '<button type="button" class="pcc-btn" onclick="pccUseCurrentLocation()"><i class="material-icons" style="font-size:16px;vertical-align:middle;">my_location</i> Use Current Location</button>';
    html += '<button type="button" class="pcc-btn" onclick="pccToggleSearch(true)"><i class="material-icons" style="font-size:16px;vertical-align:middle;">search</i> Search Location</button>';
    html += '<button type="button" class="pcc-btn" onclick="pccUseCurrentLocation()"><i class="material-icons" style="font-size:16px;vertical-align:middle;">map</i> GPS</button>';
    html += '</div>';
    html += '<div id="pccSearchBox" class="pcc-search-box" style="display:none;">';
    html += '<div class="pcc-search-row">';
    html += '<input id="pccSearchInput" class="pcc-search-input" type="text" placeholder="Search city, area or landmark (e.g. Indore)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();pccSearchLocation();}">';
    html += '<button type="button" class="pcc-btn" onclick="pccSearchLocation()">Search</button>';
    html += '</div>';
    html += '<div id="pccSearchResults" class="pcc-search-results"></div>';
    html += '</div>';
  }
  html += '</div>';

  // --- 3. Radius & Duration (one compact horizontal row) ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title">Radius &amp; Duration</div>';
  html += '<div class="pcc-duo-row">';
  html += '<div class="promo-wizard-field" style="margin-bottom:0;flex:1;">';
  html += '<label>Radius</label>';
  html += '<select id="pccRadiusSelect" class="promo-wizard-select" onchange="pccSetRadius(this.value)">';
  ["1", "5", "10", "25", "51", "100", "All India"].forEach(function(r) {
    var selected = String(r) === String(PROMO_RADIUS) ? ' selected' : '';
    var label = r === "All India" ? "All India" : r + " km";
    html += '<option value="' + r + '"' + selected + '>' + label + '</option>';
  });
  html += '</select>';
  html += '</div>';
  html += '<div class="promo-wizard-field" style="margin-bottom:0;flex:1;">';
  html += '<label>Duration</label>';
  html += '<select id="pccDurationSelect" class="promo-wizard-select" onchange="pccSetDuration(this.value)">';
  ["1", "3", "7", "15", "30"].forEach(function(d) {
    var selected = String(d) === String(PROMO_DURATION) ? ' selected' : '';
    var label = d + (d === "1" ? " day" : " days");
    html += '<option value="' + d + '"' + selected + '>' + label + '</option>';
  });
  html += '</select>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // --- 5. Campaign cost & wallet ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title">Campaign Cost</div>';
  html += '<div id="pccWalletBlock"></div>';
  html += '</div>';

  html += '<div id="pccLaunchArea"></div>';

  html += '</div>'; // end promo-pcc-card

  container.innerHTML = html;
  setupPCCStep();
}



/* ==========================================================
   PCC — PRICE CALCULATION
   ========================================================== */
function calculatePCCTotalPrice() {
  var base = 0;
  var prices = PROMO_PRICES["Silver"];
  if (prices) base = prices[PROMO_RADIUS] || 0;
  var mult = PROMO_DURATION_MULTIPLIER[PROMO_DURATION] || 1;
  PROMO_BASE_PRICE = base;
  PROMO_TOTAL_PRICE = base * mult;
  return PROMO_TOTAL_PRICE;
}

/* ==========================================================
   PCC — SETUP (lightweight init, no wizard)
   ========================================================== */
function setupPCCStep() {
  loadUserItemsForTarget();
  pccRefreshCost();
}

/* ==========================================================
   PCC — WALLET / COST REFRESH
   ========================================================== */
function pccRefreshCost() {
  calculatePCCTotalPrice();
  var sufficient = PROMO_WALLET_BALANCE >= PROMO_TOTAL_PRICE && PROMO_TOTAL_PRICE > 0;
  var balanceAfter = Math.max(0, PROMO_WALLET_BALANCE - PROMO_TOTAL_PRICE);
  var need = Math.max(0, PROMO_TOTAL_PRICE - PROMO_WALLET_BALANCE);

  pccSyncPills("pccRadiusGroup", PROMO_RADIUS);
  pccSyncPills("pccDurationGroup", PROMO_DURATION);

  var wb = document.getElementById("pccWalletBlock");
  if (wb) {
    var h = "";
    h += '<div class="pcc-cost-row"><span>Campaign Cost</span><strong>' + PROMO_TOTAL_PRICE + ' coins</strong></div>';
    h += '<div class="pcc-cost-row"><span>Wallet Balance</span><strong>' + PROMO_WALLET_BALANCE + ' coins</strong></div>';
    if (sufficient) {
      h += '<div class="pcc-cost-row pcc-balance-after"><span>Balance After</span><strong>' + balanceAfter + ' coins</strong></div>';
    } else {
      h += '<div class="pcc-insufficient">';
      h += '<div class="pcc-insufficient-title"><i class="material-icons" style="font-size:18px;vertical-align:middle;">error_outline</i> Insufficient Coins</div>';
      h += '<div class="pcc-cost-row"><span>Campaign Cost</span><strong>' + PROMO_TOTAL_PRICE + ' coins</strong></div>';
      h += '<div class="pcc-cost-row"><span>Wallet Balance</span><strong>' + PROMO_WALLET_BALANCE + ' coins</strong></div>';
      h += '<div class="pcc-cost-row pcc-need-row"><span>Need</span><strong>' + need + ' more coins</strong></div>';
      h += '<button type="button" class="pcc-btn pcc-btn-wallet" onclick="showToast(\'Coin purchase coming soon\')"><i class="material-icons" style="font-size:16px;vertical-align:middle;">add_card</i> Buy More Coins</button>';
      h += '</div>';
    }
    wb.innerHTML = h;
  }

  var la = document.getElementById("pccLaunchArea");
  if (la) {
    if (sufficient) {
      la.innerHTML = '<button type="button" class="pcc-launch" onclick="launchPCCCampaign()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">rocket_launch</i> Launch Campaign</button>';
    } else {
      la.innerHTML = '';
    }
  }
}

/* ==========================================================
   PCC — RADIUS / DURATION
   ========================================================== */
function pccSyncPills(groupId, currentVal) {
  var group = document.getElementById(groupId);
  if (!group) return;
  var btns = group.querySelectorAll(".pcc-pill");
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle("active", String(btns[i].getAttribute("data-val")) === String(currentVal));
  }
}

function pccSetRadius(val) {
  PROMO_RADIUS = String(val);
  pccRefreshCost();
}

function pccSetDuration(val) {
  PROMO_DURATION = String(val);
  pccRefreshCost();
}

/* ==========================================================
   PCC — LISTING SELECTION
   ========================================================== */
function loadUserItemsForTarget() {
  var userId = getUserId();
  if (!userId) return;

  var targetType = PROMO_PROMOTION_TYPE;
  var action = targetType === "Product" ? "products" : targetType === "Business" ? "businesses" : "properties";

  var url = getApiUrl() + "?action=" + action + "&userId=" + encodeURIComponent(userId);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var select = document.getElementById("pccListingSelect");
      if (!select) return;
      var items = [];
      if (res && res.success && res.data) {
        items = res.data.data || res.data || [];
      }
      if (items.length === 0) {
        select.innerHTML = '<option value="">No ' + targetType.toLowerCase() + 's found</option>';
        return;
      }
      var html = '<option value="">Select a ' + targetType.toLowerCase() + '...</option>';
      items.forEach(function(item) {
        var id = item.ProductID || item.BusinessID || item.PropertyID || "";
        var title = item.Title || item.Name || item.BusinessName || "Untitled";
        html += '<option value="' + id + '">' + escapeHtml(title) + '</option>';
      });
      select.innerHTML = html;
      if (PROMO_TARGET_ID) {
        select.value = PROMO_TARGET_ID;
      } else if (items.length === 1) {
        select.value = items[0].ProductID || items[0].BusinessID || items[0].PropertyID || "";
        PROMO_TARGET_ID = select.value;
        PROMO_TARGET_TITLE = items[0].Title || items[0].Name || items[0].BusinessName || "Untitled";
      }
      pccRefreshLocationNote();
    })
    .catch(function(err) {
      console.log("loadUserItems error:", err);
      var select = document.getElementById("pccListingSelect");
      if (select) select.innerHTML = '<option value="">Error loading items</option>';
    });
}

function pccSelectListingType(type) {
  PROMO_PROMOTION_TYPE = type;
  PROMO_TARGET_ID = "";
  PROMO_TARGET_TITLE = "";
  renderPromotionsPage();
}

function pccSelectTarget() {
  var el = document.getElementById("pccListingSelect");
  if (!el) return;
  PROMO_TARGET_ID = el.value;
  var text = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : "";
  var isPlaceholder = (text === "Select a " + PROMO_PROMOTION_TYPE.toLowerCase() + "...");
  var isNone = (text.indexOf("No ") === 0);
  if (!PROMO_TARGET_ID || isPlaceholder || isNone) {
    PROMO_TARGET_ID = "";
    PROMO_TARGET_TITLE = "";
  } else {
    PROMO_TARGET_TITLE = text;
  }
  renderPromotionsPage();
}

function pccRefreshLocationNote() {
  var note = document.getElementById("pccListingNote");
  if (!note) return;
  if (PROMO_TARGET_ID && PROMO_TARGET_TITLE) {
    note.innerHTML = '<i class="material-icons" style="font-size:16px;vertical-align:middle;">check_circle</i> ' + escapeHtml(PROMO_TARGET_TITLE);
  } else {
    note.innerHTML = '';
  }
}

/* ==========================================================
   PCC — TARGET LOCATION
   ========================================================== */
function pccUseCurrentLocation() {
  var lat = 0, lng = 0, name = "Current Location";
  if (typeof getEffectiveCenter === "function") {
    var c = getEffectiveCenter();
    if (c) { lat = c.lat || 0; lng = c.lng || 0; }
  }
  if ((!lat || !lng) && typeof getCenterLat === "function") {
    lat = getCenterLat() || 0;
    lng = getCenterLng() || 0;
  }
  if (typeof getCenterDisplayName === "function") {
    name = getCenterDisplayName() || "Current Location";
  }
  PROMO_TARGET_LAT = lat;
  PROMO_TARGET_LNG = lng;
  PROMO_TARGET_LOCATION = name || "Current Location";
  renderPromotionsPage();
}

function pccToggleSearch(show) {
  var box = document.getElementById("pccSearchBox");
  if (!box) return;
  box.style.display = show ? "block" : "none";
  if (show) {
    var input = document.getElementById("pccSearchInput");
    if (input) input.focus();
  }
}

function pccSearchLocation() {
  var input = document.getElementById("pccSearchInput");
  var results = document.getElementById("pccSearchResults");
  if (!input || !results) return;
  var q = input.value.trim();
  if (!q) {
    results.innerHTML = "<div class='pcc-muted'>Please enter a city, area or landmark.</div>";
    return;
  }
  results.innerHTML = "<div class='pcc-muted'>Searching...</div>";
  var url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(q) + "&format=json&limit=5&countrycodes=IN";
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || data.length === 0) {
        results.innerHTML = "<div class='pcc-muted'>No results found. Try a different search term.</div>";
        return;
      }
      var html = "";
      data.forEach(function(place) {
        var lat = parseFloat(place.lat);
        var lng = parseFloat(place.lon);
        var name = (place.display_name || "").split(",").slice(0, 3).join(",").trim() || place.display_name;
        var safeName = String(name).replace(/'/g, "").replace(/"/g, "");
        html += '<div class="pcc-result-item" onclick="pccPickLocation(' + lat + ',' + lng + ',\'' + safeName + '\')">';
        html += '<i class="material-icons" style="color:var(--primary,#0f9d58);">place</i>';
        html += '<span>' + (name || "") + '</span>';
        html += '</div>';
      });
      results.innerHTML = html;
    })
    .catch(function(err) {
      console.log("PCC location search error:", err);
      results.innerHTML = "<div class='pcc-muted'>Search failed. Please try again.</div>";
    });
}

function pccPickLocation(lat, lng, name) {
  PROMO_TARGET_LAT = lat;
  PROMO_TARGET_LNG = lng;
  PROMO_TARGET_LOCATION = name || "Selected Location";
  renderPromotionsPage();
}

function pccChangeLocation() {
  PROMO_TARGET_LOCATION = "";
  PROMO_TARGET_LAT = 0;
  PROMO_TARGET_LNG = 0;
  renderPromotionsPage();
}

/* ==========================================================
   PCC — LAUNCH CAMPAIGN
   ========================================================== */
function launchPCCCampaign() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }
  if (!PROMO_TARGET_ID) {
    showToast("Please select a " + PROMO_PROMOTION_TYPE.toLowerCase() + " to promote");
    return;
  }
  if (!PROMO_TARGET_LOCATION) {
    showToast("Please select a target location");
    return;
  }

  calculatePCCTotalPrice();
  if (PROMO_TOTAL_PRICE <= 0) {
    showToast("Invalid campaign cost");
    return;
  }
  if (PROMO_WALLET_BALANCE < PROMO_TOTAL_PRICE) {
    showToast("Insufficient balance. Please add more coins to your wallet.");
    return;
  }

  var url = getApiUrl() +
    "?action=createpromotion" +
    "&userId=" + encodeURIComponent(userId) +
    "&promotionType=Silver" +
    "&targetType=" + encodeURIComponent(PROMO_PROMOTION_TYPE) +
    "&targetId=" + encodeURIComponent(PROMO_TARGET_ID) +
    "&radius=" + encodeURIComponent(PROMO_RADIUS) +
    "&duration=" + encodeURIComponent(PROMO_DURATION) +
    "&targetLocation=" + encodeURIComponent(PROMO_TARGET_LOCATION) +
    "&latitude=" + encodeURIComponent(PROMO_TARGET_LAT) +
    "&longitude=" + encodeURIComponent(PROMO_TARGET_LNG);

  // Show launching state
  var container = document.getElementById("promotionsContent");
  if (container) {
    container.innerHTML = '<div class="promo-loading-state"><i class="material-icons" style="font-size:48px;">rocket_launch</i><h3>Launching Campaign...</h3><p>Please wait while we process your campaign.</p></div>';
  }

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        showToast("Campaign launched successfully! 🎉");
        PROMO_VIEW = "list";
        PROMO_CREATING = false;
        loadPromotionsData();
      } else {
        // Surface the backend error normally.
        // PCC frontend launch path reached the known V2 backend failure.
        showToast((res && res.message) || "Failed to launch campaign");
        PROMO_VIEW = "create";
        renderPromotionsPage();
      }
    })
    .catch(function(err) {
      console.log("PCC launch error:", err);
      showToast("Error launching campaign");
      PROMO_VIEW = "create";
      renderPromotionsPage();
    });
}

/* ==========================================================
   EMPTY STATE
   ========================================================== */
function renderEmptyState() {
  var html = '<div class="promo-empty-state">';
  html += '<div class="promo-empty-icon"><i class="material-icons" style="font-size:64px;">campaign</i></div>';
  html += '<h3>Promote Your First Listing</h3>';
  html += '<p>Get more visibility for your products, businesses, and properties. Reach more customers and grow your presence on Ekka1km.</p>';
  html += '<ul class="promo-benefits-list">';
  html += '<li><i class="material-icons" style="font-size:18px;color:#0f9d58;">visibility</i> Increased visibility in search results</li>';
  html += '<li><i class="material-icons" style="font-size:18px;color:#0f9d58;">location_on</i> Targeted reach based on location</li>';
  html += '<li><i class="material-icons" style="font-size:18px;color:#0f9d58;">trending_up</i> Real-time performance analytics</li>';
  html += '<li><i class="material-icons" style="font-size:18px;color:#0f9d58;">redeem</i> Reward viewers with coins</li>';
  html += '</ul>';
  html += '<button class="promo-btn-primary promo-btn-lg" onclick="openCreateWizard()"><i class="material-icons" style="font-size:20px;vertical-align:middle;">add_circle</i> Create Campaign</button>';
  html += '<button class="promo-btn-secondary promo-btn-lg" onclick="openPage(\'myContent\')" style="margin-top:10px;"><i class="material-icons" style="font-size:20px;vertical-align:middle;">folder</i> Browse My Listings</button>';
  html += '</div>';
  return html;
}

/* ==========================================================
   LOADING SKELETON
   ========================================================== */
function renderSkeleton(container) {
  var html = '<div class="promo-skeleton-grid">';
  for (var i = 0; i < 6; i++) {
    html += '<div class="promo-skeleton-card"><div class="promo-skeleton-shimmer"></div></div>';
  }
  html += '</div>';
  html += '<div class="promo-skeleton-list">';
  for (var j = 0; j < 3; j++) {
    html += '<div class="promo-skeleton-item"><div class="promo-skeleton-shimmer"></div></div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

/* ==========================================================
   ERROR STATE
   ========================================================== */
function renderError(container) {
  var html = '<div class="promo-error-state">';
  html += '<div class="promo-error-icon"><i class="material-icons" style="font-size:64px;color:#c62828;">error_outline</i></div>';
  html += '<h3>Something went wrong</h3>';
  html += '<p>' + (PROMO_ERROR || "Failed to load promotions. Please try again.") + '</p>';
  html += '<button class="promo-btn-primary" onclick="loadPromotionsData()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">refresh</i> Retry</button>';
  html += '</div>';
  container.innerHTML = html;
}

/* ==========================================================
   TOAST NOTIFICATION
   ========================================================== */
function showToast(message) {
  var existing = document.getElementById("promoToast");
  if (existing) existing.remove();

  var toast = document.createElement("div");
  toast.id = "promoToast";
  toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:90%;text-align:center;animation:promoFadeIn 0.3s;";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
}

/* ==========================================================
   UTILITY FUNCTIONS
   ========================================================== */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  var amp = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var qt = String.fromCharCode(38) + "quot;";
  var ap = String.fromCharCode(38) + "#39;";
  return s.replace(/&/g, amp).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, qt).replace(/'/g, ap);
}

/* ==========================================================
   BACKWARD COMPATIBILITY
   Preserve old function names so existing navigation works
   ========================================================== */
function openPromotionWizard() {
  openCreateWizard();
}

function loadMyPromotions() {
  if (document.getElementById("promotionsContent")) {
    openPromotionsPage();
  }
}