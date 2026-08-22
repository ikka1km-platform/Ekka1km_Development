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
var PROMO_PROMOTION_TYPE = "Product";  // Product | Business | Property | News
var PROMO_TARGET_LOCATION = "";        // display name
var PROMO_TARGET_LAT = 0;              // latitude
var PROMO_TARGET_LNG = 0;              // longitude
var PROMO_TARGET_ID = "";          // selected listing id
var PROMO_TARGET_TITLE = "";       // selected listing title
var PROMO_TARGET_IMAGE = "";       // selected listing's existing image (for "Use existing image" creative)
var PROMO_TARGET_ITEMS = [];       // loaded listing items for the current target type (keeps image map)

// PCC audience creative + ad-view duration
var PROMO_CREATIVE_TYPE = "IMAGE";     // IMAGE | VIDEO | URL | ENTITY_IMAGE
var PROMO_IMAGE_URL = "";              // explicit audience creative image
var PROMO_VIDEO_URL = "";              // explicit audience creative video
var PROMO_EXTERNAL_URL = "";           // URL / external creative
var PROMO_MEDIA_DURATION = 0;          // actual uploaded video duration in seconds (0 = unknown)
var PROMO_AD_DURATION = "15";          // viewer ad-view seconds: 3|5|10|15|20|30

var PROMO_RADIUS = "51";               // 1|5|10|25|51|100|All India
var PROMO_DURATION = "7";              // 1|3|7|15|30  (campaign lifetime in days)
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
  PROMO_TARGET_IMAGE = "";
  PROMO_TARGET_LOCATION = "";
  PROMO_TARGET_LAT = 0;
  PROMO_TARGET_LNG = 0;
  PROMO_CREATIVE_TYPE = "IMAGE";
  PROMO_IMAGE_URL = "";
  PROMO_VIDEO_URL = "";
  PROMO_EXTERNAL_URL = "";
  PROMO_MEDIA_DURATION = 0;
  PROMO_AD_DURATION = "15";
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

  // --- 1. WHAT ARE YOU PROMOTING? (original visual design preserved) ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title" style="font-size:17px;">What are you Promoting?</div>';
  html += '<p class="promo-wizard-desc">Select the type of listing you want to promote.</p>';
  html += '<div class="promo-wizard-options">';
  var pccTypes = [
    { id: "Product",  icon: "shopping_bag",      desc: "Promote a product listing" },
    { id: "Business", icon: "store",             desc: "Promote your business" },
    { id: "Property", icon: "real_estate_agent", desc: "Promote a property" },
    { id: "News",     icon: "newspaper",         desc: "Promote a news story" }
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

  // --- 2. WHAT SHOULD THE AUDIENCE SEE? (explicit creative choice) ---
  html += renderPCCCreativeSection();

  // --- 3. AD VIEWING TIME (viewer ad-view duration, NOT campaign lifetime) ---
  html += renderPCCAdDurationSection();

  // --- 4. Target Location ---
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

  // --- 5. Radius & Campaign Lifetime (one compact horizontal row) ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title">Radius &amp; Campaign Duration</div>';
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
  html += '<label>Campaign Lifetime</label>';
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

  // --- 6. Campaign cost & wallet ---
  html += '<div class="pcc-section">';
  html += '<div class="pcc-section-title">Campaign Cost</div>';
  html += '<div id="pccWalletBlock"></div>';
  html += '</div>';

  html += '<div id="pccLaunchArea"></div>';

  html += '</div>'; // end promo-pcc-card

  container.innerHTML = html;
  setupPCCStep();
  pccInitCreativeUploads();
}



/* ==========================================================
   PCC — AUDIENCE CREATIVE (UPLOAD YOUR AD)
   Real device/gallery upload via the existing Ekka1km
   MediaUpload widget (ImageKit pipeline). No manual
   Image/Video URL entry. URL/External keeps a manual link.
   ========================================================== */
function renderPCCCreativeSection() {
  var h = '';
  h += '<div class="pcc-section">';
  h += '<div class="pcc-section-title">Upload Your Ad</div>';
  h += '<p class="promo-wizard-desc">Promote yourself with an image, video, or link.</p>';
  h += '<div class="promo-creative-options">';

  var opts = [
    { id: "IMAGE",        icon: "image",         label: "Image" },
    { id: "VIDEO",        icon: "videocam",      label: "Video" },
    { id: "URL",          icon: "link",          label: "URL / external" },
    { id: "ENTITY_IMAGE", icon: "photo_library", label: "Use existing " + PROMO_PROMOTION_TYPE.toLowerCase() + " image" }
  ];
  opts.forEach(function(o) {
    var sel = o.id === PROMO_CREATIVE_TYPE ? ' promo-creative-option selected' : ' promo-creative-option';
    h += '<div class="' + sel + '" onclick="pccSetCreative(\'' + o.id + '\')">';
    h += '<i class="material-icons" style="font-size:18px;">' + o.icon + '</i>';
    h += '<span>' + o.label + '</span>';
    h += '</div>';
  });
  h += '</div>';

  h += '<div class="promo-wizard-field" style="margin-bottom:0;margin-top:10px;">';
  if (PROMO_CREATIVE_TYPE === "IMAGE") {
    // Real upload through the existing Ekka1km media mechanism.
    // No manual Image URL field.
    h += '<div id="pccImageUploadWidget"></div>';
    if (PROMO_IMAGE_URL) {
      h += '<div id="pccImagePreview" style="margin-top:8px;">' + pccRenderMediaPreview(PROMO_IMAGE_URL, "image") + '</div>';
      h += '<small class="pcc-muted" style="display:block;margin-top:4px;"><i class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</i> Image uploaded. The audience sees this image for the ad viewing time.</small>';
    } else {
      h += '<small class="pcc-muted" style="display:block;margin-top:6px;">Choose an image from your camera or gallery. It uploads to Ekka1km automatically.</small>';
    }
  } else if (PROMO_CREATIVE_TYPE === "VIDEO") {
    // Real upload through the existing Ekka1km media mechanism.
    // No manual Video URL field. Actual duration is detected from
    // the uploaded video's metadata.
    h += '<div id="pccVideoUploadWidget"></div>';
    if (PROMO_VIDEO_URL) {
      h += '<div id="pccVideoPreview" style="margin-top:8px;">' + pccRenderMediaPreview(PROMO_VIDEO_URL, "video") + '</div>';
      if (PROMO_MEDIA_DURATION > 0) {
        h += '<small class="pcc-muted" style="display:block;margin-top:4px;"><i class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</i> Video uploaded — detected duration: ' + Math.round(PROMO_MEDIA_DURATION) + ' sec.</small>';
      }
    } else {
      h += '<small class="pcc-muted" style="display:block;margin-top:6px;">Choose a video from your device. Its actual duration is detected automatically (minimum 3 seconds).</small>';
    }
  } else if (PROMO_CREATIVE_TYPE === "URL") {
    h += '<label>Destination URL (website / WhatsApp / Instagram / YouTube...)</label>';
    h += '<input id="pccCreativeUrl" class="promo-wizard-input" type="url" placeholder="https://..." value="' + escapeHtml(PROMO_EXTERNAL_URL) + '" oninput="pccSyncCreativeUrl()">';
    h += '<small class="pcc-muted" style="display:block;margin-top:4px;">Viewers open this link after the ad finishes.</small>';
  } else { // ENTITY_IMAGE
    if (PROMO_TARGET_IMAGE) {
      h += '<div class="pcc-selected-note"><i class="material-icons" style="font-size:16px;vertical-align:middle;">check_circle</i> Audience sees this ' + PROMO_PROMOTION_TYPE.toLowerCase() + '\'s existing image.</div>';
      h += '<div style="margin-top:8px;">' + pccRenderMediaPreview(PROMO_TARGET_IMAGE, "image") + '</div>';
    } else {
      h += '<div class="pcc-muted">Select a ' + PROMO_PROMOTION_TYPE.toLowerCase() + ' to use its existing image. If none is available, a neutral placeholder is shown.</div>';
    }
  }
  h += '</div>';
  h += '</div>';
  return h;
}

/* Shared preview renderer for uploaded/entity media. */
function pccRenderMediaPreview(url, kind) {
  if (!url) return '';
  if (kind === "video") {
    return '<video src="' + escapeHtml(url) + '" controls preload="metadata" style="max-width:220px;max-height:150px;border-radius:10px;border:1px solid var(--border-color,#ddd);display:block;"></video>';
  }
  return '<img src="' + escapeHtml(url) + '" alt="preview" style="max-width:180px;max-height:120px;border-radius:10px;object-fit:cover;border:1px solid var(--border-color,#ddd);">';
}

/* Post-render init: mount the real upload widgets (existing MediaUpload.js). */
function pccInitCreativeUploads() {
  try {
    if (PROMO_CREATIVE_TYPE === "IMAGE" && document.getElementById("pccImageUploadWidget") && typeof createUploadWidget === "function") {
      createUploadWidget("pccImageUploadWidget", {
        folder: "promotions",
        accept: "image/*",
        label: "Upload your ad image (Camera / Gallery)",
        onUpload: function(url) { pccOnImageUploaded(url); }
      });
    }
    if (PROMO_CREATIVE_TYPE === "VIDEO" && document.getElementById("pccVideoUploadWidget") && typeof createUploadWidget === "function") {
      createUploadWidget("pccVideoUploadWidget", {
        folder: "promotions",
        accept: "video/*",
        label: "Upload your ad video (device / gallery)",
        onUpload: function(url) { pccOnVideoUploaded(url); }
      });
    }
  } catch (e) {}
}

/* IMAGE upload callback — captures the resulting media URL and shows a preview. */
function pccOnImageUploaded(url) {
  if (!url) return;
  PROMO_IMAGE_URL = url;
  var prev = document.getElementById("pccImagePreview");
  if (!prev) {
    prev = document.createElement("div");
    prev.id = "pccImagePreview";
    prev.style.marginTop = "8px";
    var widget = document.getElementById("pccImageUploadWidget");
    if (widget && widget.parentNode) widget.parentNode.insertBefore(prev, widget.nextSibling);
    else return;
  }
  prev.innerHTML = pccRenderMediaPreview(url, "image");
  showToast("Ad image uploaded ✅");
}

/* Actual duration detection via HTMLVideoElement metadata. Never invents a value:
   resolves 0 when duration cannot be determined. */
function pccDetectVideoDuration(url) {
  return new Promise(function(resolve) {
    try {
      var v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      var done = false;
      var finish = function(sec) {
        if (done) return;
        done = true;
        resolve((sec && isFinite(sec) && sec > 0) ? Number(sec) : 0);
      };
      v.onloadedmetadata = function() { finish(v.duration); };
      v.onerror = function() { finish(0); };
      setTimeout(function() { finish(0); }, 10000);
      v.src = url;
    } catch (e) {
      resolve(0);
    }
  });
}

/* VIDEO upload callback — detects actual duration, rejects < 3s videos,
   then captures URL + mediaDuration and shows a preview. */
function pccOnVideoUploaded(url) {
  if (!url) return;
  showToast("Checking video duration...");
  pccDetectVideoDuration(url).then(function(dur) {
    if (!dur || dur < 3) {
      // Reject: never invent a duration; do not keep the asset selected.
      PROMO_VIDEO_URL = "";
      PROMO_MEDIA_DURATION = 0;
      var prev = document.getElementById("pccVideoPreview");
      if (prev) prev.innerHTML = "";
      showToast("❌ Video rejected: duration could not be verified or is under 3 seconds.");
      return;
    }
    PROMO_VIDEO_URL = url;
    PROMO_MEDIA_DURATION = dur;
    var prev2 = document.getElementById("pccVideoPreview");
    if (!prev2) {
      prev2 = document.createElement("div");
      prev2.id = "pccVideoPreview";
      prev2.style.marginTop = "8px";
      var widget = document.getElementById("pccVideoUploadWidget");
      if (widget && widget.parentNode) widget.parentNode.insertBefore(prev2, widget.nextSibling);
      else return;
    }
    prev2.innerHTML = pccRenderMediaPreview(url, "video");
    var note = document.createElement("small");
    note.className = "pcc-muted";
    note.style.cssText = "display:block;margin-top:4px;";
    note.innerHTML = '<i class="material-icons" style="font-size:14px;vertical-align:middle;">check_circle</i> Video uploaded — detected duration: ' + Math.round(dur) + ' sec.';
    prev2.appendChild(note);
    showToast("Ad video uploaded ✅ (" + Math.round(dur) + " sec)");
    // Cap the selected ad viewing time to the actual video duration.
    pccEnforceVideoDurationCap();
  });
}

/* PUBLIC USER: AdDurationSeconds <= min(30, mediaDuration).
   A longer video can still be the source media — only the viewing
   time is capped at the public 30-second maximum. */
function pccEnforceVideoDurationCap() {
  if (PROMO_CREATIVE_TYPE !== "VIDEO" || !(PROMO_MEDIA_DURATION > 0)) return;
  var maxAllowed = Math.min(30, Math.round(PROMO_MEDIA_DURATION));
  var cur = Math.round(Number(PROMO_AD_DURATION) || 15);
  if (cur > maxAllowed) {
    PROMO_AD_DURATION = String(Math.max(3, maxAllowed));
    pccSyncPills("pccAdDurationGroup", PROMO_AD_DURATION);
    var inputEl = document.getElementById("pccAdDurationInput");
    if (inputEl) inputEl.value = PROMO_AD_DURATION;
    showToast("Ad viewing time adjusted to " + PROMO_AD_DURATION + " sec to fit the video.");
  }
}

/* ==========================================================
   PCC — AD VIEWING TIME (viewer ad-view duration)
   Dedicated audience-facing value. NOT campaign lifetime,
   NOT PromotionFuel, NOT EstimatedViewSeconds.
   ========================================================== */
function renderPCCAdDurationSection() {
  var h = '';
  h += '<div class="pcc-section">';
  h += '<div class="pcc-section-title">Ad Viewing Time</div>';
  h += '<p class="promo-wizard-desc">How long should each viewer watch the ad? This is the audience-facing ad duration (per view), not how long the campaign runs. Allowed range: 3–30 seconds.</p>';
  // PUBLIC USER rule: minimum 3 sec, maximum 30 sec, step 1 sec.
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
  h += '<input id="pccAdDurationInput" class="promo-wizard-input" type="number" min="3" max="30" step="1" style="width:90px;" value="' + escapeHtml(String(PROMO_AD_DURATION)) + '" oninput="pccSetAdDuration(this.value)">';
  h += '<span class="pcc-muted">sec (3–30, step 1)</span>';
  h += '</div>';
  h += '<div class="pcc-pill-group" id="pccAdDurationGroup">';
  ["3", "5", "10", "15", "20", "30"].forEach(function(s) {
    var active = String(s) === String(PROMO_AD_DURATION) ? ' pcc-pill active' : ' pcc-pill';
    h += '<button type="button" class="' + active + '" data-val="' + s + '" onclick="pccSetAdDuration(\'' + s + '\')">' + s + ' sec</button>';
  });
  h += '</div>';
  h += '<div class="pcc-muted" style="margin-top:6px;">Stored as the campaign\'s audience ad duration (AdDurationSeconds).</div>';
  h += '</div>';
  return h;
}

/* ==========================================================
   PCC — CREATIVE / AD-DURATION SETTERS
   ========================================================== */
function pccSetCreative(type) {
  // Persist any typed URL before re-rendering.
  pccSyncCreativeUrl();
  PROMO_CREATIVE_TYPE = type;
  renderPromotionsPage();
}

function pccSetAdDuration(sec) {
  // PUBLIC USER rule: clamp to 3..30, integer (step = 1 sec).
  var v = Math.round(Number(sec));
  if (!v || isNaN(v) || v <= 0) v = 15;
  v = Math.min(30, Math.max(3, v));
  // VIDEO: never exceed the actual uploaded video duration.
  if (PROMO_CREATIVE_TYPE === "VIDEO" && PROMO_MEDIA_DURATION > 0) {
    v = Math.min(v, Math.max(3, Math.round(PROMO_MEDIA_DURATION)));
  }
  PROMO_AD_DURATION = String(v);
  pccSyncPills("pccAdDurationGroup", PROMO_AD_DURATION);
  var inputEl = document.getElementById("pccAdDurationInput");
  if (inputEl && String(inputEl.value) !== PROMO_AD_DURATION) inputEl.value = PROMO_AD_DURATION;
  pccRefreshCost();
}

function pccSyncCreativeUrl() {
  var inp = document.getElementById("pccCreativeUrl");
  if (!inp) return;
  var val = inp.value.trim();
  if (PROMO_CREATIVE_TYPE === "IMAGE") PROMO_IMAGE_URL = val;
  else if (PROMO_CREATIVE_TYPE === "VIDEO") PROMO_VIDEO_URL = val;
  else if (PROMO_CREATIVE_TYPE === "URL") PROMO_EXTERNAL_URL = val;
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
  var action = targetType === "Product" ? "products"
    : targetType === "Business" ? "businesses"
    : targetType === "Property" ? "properties"
    : "news"; // News

  var url = getApiUrl() + "?action=" + action + "&userId=" + encodeURIComponent(userId);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var select = document.getElementById("pccListingSelect");
      if (!select) return;
      var items = [];
      if (res && res.success && res.data) {
        items = (res.data.data && res.data.data.length !== undefined) ? res.data.data : (res.data || []);
      }
      if (!Array.isArray(items)) items = [];
      PROMO_TARGET_ITEMS = items;
      if (items.length === 0) {
        select.innerHTML = '<option value="">No ' + targetType.toLowerCase() + ' found</option>';
        return;
      }
      var html = '<option value="">Select a ' + targetType.toLowerCase() + '...</option>';
      items.forEach(function(item) {
        var id = item.ProductID || item.BusinessID || item.PropertyID || item.NewsID || "";
        var title = item.Title || item.Name || item.BusinessName || item.NewsTitle || "Untitled";
        html += '<option value="' + id + '">' + escapeHtml(title) + '</option>';
      });
      select.innerHTML = html;
      if (PROMO_TARGET_ID) {
        select.value = PROMO_TARGET_ID;
      } else if (items.length === 1) {
        var first = items[0];
        select.value = first.ProductID || first.BusinessID || first.PropertyID || first.NewsID || "";
        PROMO_TARGET_ID = select.value;
        PROMO_TARGET_TITLE = first.Title || first.Name || first.BusinessName || first.NewsTitle || "Untitled";
        PROMO_TARGET_IMAGE = first.ImageURL || first.imageURL || first.Logo || first.CoverImage || "";
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
  PROMO_TARGET_IMAGE = "";
  PROMO_TARGET_ITEMS = [];
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
    PROMO_TARGET_IMAGE = "";
  } else {
    PROMO_TARGET_TITLE = text;
    // Look up the selected item's existing image in case the promoter wants
    // the audience to see the entity's own creative ("Use existing image").
    PROMO_TARGET_IMAGE = "";
    for (var i = 0; i < PROMO_TARGET_ITEMS.length; i++) {
      var it = PROMO_TARGET_ITEMS[i];
      var id = it.ProductID || it.BusinessID || it.PropertyID || it.NewsID || "";
      if (String(id) === String(PROMO_TARGET_ID)) {
        PROMO_TARGET_IMAGE = it.ImageURL || it.imageURL || it.Logo || it.CoverImage || "";
        break;
      }
    }
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

  // ---- Audience creative resolution ----
  // Q2 "What should the audience see?" drives the creative that is delivered.
  // Falls back to the promoted entity's own image where appropriate. For a
  // URL/external creative the visible creative is the entity image (or an
  // explicit image) and the destination link opens after the ad finishes.
  pccSyncCreativeUrl();
  var effectiveCreativeType = "IMAGE";
  var effectiveImageURL = "";
  var effectiveVideoURL = "";
  var effectiveExternalURL = "";

  if (PROMO_CREATIVE_TYPE === "VIDEO") {
    effectiveCreativeType = "VIDEO";
    effectiveVideoURL = PROMO_VIDEO_URL;
  } else if (PROMO_CREATIVE_TYPE === "URL") {
    effectiveCreativeType = "IMAGE";
    effectiveImageURL = PROMO_IMAGE_URL || PROMO_TARGET_IMAGE;
    effectiveExternalURL = PROMO_EXTERNAL_URL;
  } else if (PROMO_CREATIVE_TYPE === "ENTITY_IMAGE") {
    effectiveCreativeType = "IMAGE";
    effectiveImageURL = PROMO_IMAGE_URL || PROMO_TARGET_IMAGE;
  } else { // IMAGE
    effectiveCreativeType = "IMAGE";
    effectiveImageURL = PROMO_IMAGE_URL || PROMO_TARGET_IMAGE;
  }

  if (effectiveCreativeType === "VIDEO" && !effectiveVideoURL) {
    showToast("Please upload a video for the audience to see");
    return;
  }
  if (PROMO_CREATIVE_TYPE === "VIDEO") {
    // Actual uploaded-video duration must be known and >= 3 sec. Never invented.
    if (!(PROMO_MEDIA_DURATION > 0)) {
      showToast("Video duration could not be verified. Please re-upload the video.");
      return;
    }
    if (PROMO_MEDIA_DURATION < 3) {
      showToast("Uploaded video is under 3 seconds and cannot be used.");
      return;
    }
  }
  if (effectiveCreativeType === "IMAGE" && !effectiveImageURL) {
    showToast("Please provide an image URL or select a " + PROMO_PROMOTION_TYPE.toLowerCase() + " with an existing image");
    return;
  }
  if (PROMO_CREATIVE_TYPE === "URL" && !effectiveExternalURL) {
    showToast("Please provide a destination URL");
    return;
  }

  // ---- Q3 => audience-facing AD VIEWING TIME (viewer ad duration) ----
  // This is distinct from campaign lifetime (PROMO_DURATION in days), from
  // PromotionFuel, and from EstimatedViewSeconds. It is stored as the
  // dedicated AdDurationSeconds value.
  var adDuration = Number(PROMO_AD_DURATION);
  if (!adDuration || isNaN(adDuration) || adDuration <= 0) adDuration = 15;
  // PUBLIC USER rule: 3 <= AdDurationSeconds <= 30, step 1 sec.
  adDuration = Math.min(30, Math.max(3, Math.round(adDuration)));
  // VIDEO: cap at the actual uploaded video duration (mediaDuration).
  if (PROMO_CREATIVE_TYPE === "VIDEO" && PROMO_MEDIA_DURATION > 0) {
    adDuration = Math.min(adDuration, Math.max(3, Math.round(PROMO_MEDIA_DURATION)));
  }

  // Forward the full campaign definition. Field names match the existing
  // backend model (createPromotionCampaign p.* parameters) — no new names.
  var forwardCta = "Learn More";
  var forwardDestinationType = effectiveExternalURL ? "External" : "Internal";
  var forwardPipEnabled = "Yes";
  var forwardFeatured = "No";
  var forwardPriority = "0";
  var forwardMediaDuration = (PROMO_CREATIVE_TYPE === "VIDEO" && PROMO_MEDIA_DURATION > 0)
    ? String(Math.round(PROMO_MEDIA_DURATION)) : "";

  var url = getApiUrl() +
    "?action=createpromotion" +
    "&userId=" + encodeURIComponent(userId) +
    "&promotionType=Silver" +
    "&targetType=" + encodeURIComponent(PROMO_PROMOTION_TYPE) +
    "&targetId=" + encodeURIComponent(PROMO_TARGET_ID) +
    "&radius=" + encodeURIComponent(PROMO_RADIUS) +
    "&duration=" + encodeURIComponent(PROMO_DURATION) +
    "&creativeType=" + encodeURIComponent(effectiveCreativeType) +
    "&imageURL=" + encodeURIComponent(effectiveImageURL || "") +
    "&videoURL=" + encodeURIComponent(effectiveVideoURL || "") +
    "&externalURL=" + encodeURIComponent(effectiveExternalURL || "") +
    "&adDurationSeconds=" + encodeURIComponent(String(adDuration)) +
    "&mediaDuration=" + encodeURIComponent(forwardMediaDuration) +
    "&cta=" + encodeURIComponent(forwardCta) +
    "&destinationType=" + encodeURIComponent(forwardDestinationType) +
    "&pipEnabled=" + encodeURIComponent(forwardPipEnabled) +
    "&featured=" + encodeURIComponent(forwardFeatured) +
    "&priority=" + encodeURIComponent(forwardPriority) +
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