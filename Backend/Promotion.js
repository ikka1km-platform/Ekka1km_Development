/**
 * ============================================================
 * EKKA1KM BACKEND
 * Promotion.js
 * Phase 4 - PIP Advertisement + Reward Ad Center + Promotion Engine
 * Phase 5 Prep - Dynamic Campaign Economics (Admin Dashboard)
 * Builds on Advertisements.js
 * ============================================================
 * APIs:
 *   getPipQueue()
 *   getAdvertisementCenter()
 *   startAdWatch()
 *   updateAdProgress()
 *   completeAdWatch()
 *   skipAdWatch()
 *   claimAdReward()
 *   getAdWatchProgress()
 *   getAdWatchHistory()
 *   getAvailableRewardCoins()
 *   getCampaignAnalytics()
 *   createPromotionCampaign()
 *   pauseCampaign()
 *   resumeCampaign()
 *   promoteProduct()
 *   promoteBusiness()
 *   promoteStore()
 *   promoteProperty()
 *   promoteLive()
 *   promoteNews()
 *   promoteExternalUrl()
 *   createDemoAdCampaigns()
 *   debugPip()
 * ============================================================
 */


/**
 * ============================================================
 * ENSURE SHEETS EXIST
 * ============================================================
 */
function ensurePromotionSheets() {
  var ss = getSpreadsheet();
  var sheets = [
    "AdWatchProgress",
    "AdWatchHistory",
    "AdRewards",
    "AdAnalytics",
    "PromotionCampaigns"
  ];

  sheets.forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      if (name === "AdWatchProgress") {
        s.appendRow(["ProgressID", "UserID", "CampaignID", "AdID", "TotalDuration", "WatchedSeconds", "RewardPaid", "RemainingSeconds", "RemainingReward", "Status", "LastWatchedAt", "CreatedAt"]);
      } else if (name === "AdWatchHistory") {
        s.appendRow(["WatchID", "UserID", "CampaignID", "AdID", "Status", "RewardGiven", "RewardCoins", "WatchStartTime", "WatchEndTime", "DurationWatched", "CreatedAt"]);
      } else if (name === "AdRewards") {
        s.appendRow(["RewardID", "UserID", "CampaignID", "Coins", "WalletTransactionID", "Status", "CreatedAt"]);
      } else if (name === "AdAnalytics") {
        s.appendRow(["AnalyticsID", "CampaignID", "Impressions", "Views", "UniqueViewers", "Skips", "Completions", "CompletionRate", "RewardsPaid", "TotalRewardPaid", "RemainingRewardPool", "RewardedUsersCount", "CTR", "UpdatedAt"]);
      } else if (name === "PromotionCampaigns") {
        s.appendRow(["CampaignID", "CampaignType", "OwnerUserID", "TargetType", "TargetID", "CoinsSpent", "RewardPool", "PlatformReserve", "RemainingRewardCoins", "Radius", "City", "District", "State", "Country", "Latitude", "Longitude", "Views", "Clicks", "Interested", "Shares", "StartDate", "EndDate", "Status", "CreatedDate"]);
      }
    }
  });
}


/**
 * ============================================================
 * COMPATIBILITY MAPPING
 * Maps old PromotionCampaigns schema to new expected fields
 * ============================================================
 */
function normalizeCampaign(c) {
  if (!c) return c;
  
  // Map old field names to new field names
  // Old schema: CampaignID, CampaignType, OwnerUserID, TargetType, TargetID, CoinsSpent, RewardPool, PlatformReserve, RemainingRewardCoins, Radius, City, District, State, Country, Latitude, Longitude, Views, Clicks, Interested, Shares, StartDate, EndDate, Status, CreatedDate
  
  // UserID
  if (!c.UserID && c.OwnerUserID) c.UserID = c.OwnerUserID;
  
  // Title - use CampaignType as fallback title
  if (!c.Title) c.Title = c.CampaignType || "Promotion";
  
  // Description
  if (!c.Description) c.Description = "";
  
  // AdType - derive from CampaignType
  if (!c.AdType) {
    if (c.CampaignType === "PROMOTE_PRODUCT") c.AdType = "PRODUCT";
    else if (c.CampaignType === "PROMOTE_BUSINESS") c.AdType = "BUSINESS";
    else if (c.CampaignType === "PROMOTE_PROPERTY") c.AdType = "PROPERTY";
    else if (c.CampaignType === "PROMOTE_EXTERNAL_URL") c.AdType = "URL";
    else c.AdType = "IMAGE";
  }
  
  // PromotedEntityID
  if (!c.PromotedEntityID && c.TargetID) c.PromotedEntityID = c.TargetID;
  
  // PromotedEntityType
  if (!c.PromotedEntityType && c.TargetType) c.PromotedEntityType = c.TargetType;
  
  // ExternalURL
  if (!c.ExternalURL) c.ExternalURL = "";
  
  // ImageURL
  if (!c.ImageURL) c.ImageURL = "";
  
  // VideoURL
  if (!c.VideoURL) c.VideoURL = "";
  
  // Duration - default 5 seconds for demo
  if (!c.Duration) c.Duration = 5;
  
  // RewardCoins - use RemainingRewardCoins or RewardPool
  if (!c.RewardCoins) c.RewardCoins = Number(c.RemainingRewardCoins || c.RewardPool || 5);
  
  // RewardPerSecond
  if (!c.RewardPerSecond) c.RewardPerSecond = Math.max(1, Math.round(Number(c.RewardCoins) / Math.max(Number(c.Duration), 1)));
  
  // RepeatRewardType
  if (!c.RepeatRewardType) c.RepeatRewardType = "ONCE";
  
  // PIPEnabled - ALL campaigns are PIP-enabled by default for backward compatibility
  if (!c.PIPEnabled) c.PIPEnabled = "Yes";
  
  // Featured
  if (!c.Featured) c.Featured = "No";
  
  // Priority
  if (!c.Priority) c.Priority = 0;
  
  // MaxViewsPerUser
  if (!c.MaxViewsPerUser) c.MaxViewsPerUser = 0;
  
  // TargetRadius
  if (!c.TargetRadius && c.Radius) c.TargetRadius = c.Radius;
  if (!c.TargetRadius) c.TargetRadius = "All India";
  
  // TargetCategory
  if (!c.TargetCategory) c.TargetCategory = "";
  
  // TargetCity
  if (!c.TargetCity && c.City) c.TargetCity = c.City;
  if (!c.TargetCity) c.TargetCity = "";
  
  // TargetState
  if (!c.TargetState && c.State) c.TargetState = c.State;
  if (!c.TargetState) c.TargetState = "";
  
  // TargetCountry
  if (!c.TargetCountry && c.Country) c.TargetCountry = c.Country;
  if (!c.TargetCountry) c.TargetCountry = "";
  
  // RemainingRewardPool - use RemainingRewardCoins
  if (!c.RemainingRewardPool) c.RemainingRewardPool = Number(c.RemainingRewardCoins || c.RewardPool || 0);
  
  // CampaignBudget
  if (!c.CampaignBudget) c.CampaignBudget = Number(c.RewardPool || c.CoinsSpent || 0);
  
  // RewardPerUser
  if (!c.RewardPerUser) c.RewardPerUser = Number(c.RewardCoins || 5);
  
  // MaxViews
  if (!c.MaxViews) c.MaxViews = 1000;
  
  // MaxRewardedUsers
  if (!c.MaxRewardedUsers) c.MaxRewardedUsers = 0;
  
  // CostPerView
  if (!c.CostPerView) c.CostPerView = 0;
  
  // TotalRewardPool
  if (!c.TotalRewardPool) c.TotalRewardPool = Number(c.RemainingRewardPool || c.RewardPool || 0);
  
  // TotalRewardPaid
  if (!c.TotalRewardPaid) c.TotalRewardPaid = 0;
  
  // RewardedUsersCount
  if (!c.RewardedUsersCount) c.RewardedUsersCount = 0;
  
  // Cost
  if (!c.Cost) c.Cost = Number(c.CoinsSpent || 0);
  
  // Impressions
  if (!c.Impressions) c.Impressions = 0;
  
  // CreatedAt
  if (!c.CreatedAt && c.CreatedDate) c.CreatedAt = c.CreatedDate;
  if (!c.CreatedAt) c.CreatedAt = new Date();
  
  return c;
}


/**
 * ============================================================
 * GET PIP QUEUE
 * ?action=getpipqueue
 * Returns max 3 ads with priority sorting
 * Only shows campaigns with remaining reward pool
 * ============================================================
 */
function getPipQueue(e) {
  try {
    ensurePromotionSheets();
    var userId = e.parameter.userId || "";
    var campaigns = getSheetData("PromotionCampaigns");
    var now = new Date();
    var result = [];
    
    console.log("Phase4: Campaign Count:", campaigns.length);

    campaigns.forEach(function(c) {
      try {
        // Normalize old schema to new schema
        c = normalizeCampaign(c);
        
        var status = String(c.Status || "").toLowerCase();
        var pip = String(c.PIPEnabled || "").toLowerCase();
        var start = c.StartDate ? new Date(c.StartDate) : null;
        var end = c.EndDate ? new Date(c.EndDate) : null;
        var remainingPool = Number(c.RemainingRewardPool || 0);
        var maxViews = Number(c.MaxViews || 0);
        var currentViews = Number(c.Views || 0);

        if (status !== "active") return;
        if (pip !== "yes" && pip !== "true") return;
        if (start && start > now) return;
        if (end && end < now) return;
        if (remainingPool <= 0) return;
        if (maxViews > 0 && currentViews >= maxViews) return;

        result.push(c);
      } catch (campErr) {
        console.log("Phase4: Error processing campaign:", campErr.toString());
      }
    });

    // Priority: partially watched > featured > priority > new
    if (userId) {
      try {
        var progressData = getSheetData("AdWatchProgress");
        result.sort(function(a, b) {
          var aWatched = false, bWatched = false;
          progressData.forEach(function(p) {
            if (String(p.UserID) === String(userId) && String(p.CampaignID) === String(a.CampaignID) && String(p.Status) === "in_progress") aWatched = true;
            if (String(p.UserID) === String(userId) && String(p.CampaignID) === String(b.CampaignID) && String(p.Status) === "in_progress") bWatched = true;
          });
          if (aWatched && !bWatched) return -1;
          if (!aWatched && bWatched) return 1;
          var aF = String(a.Featured || "").toLowerCase() === "yes" ? 1 : 0;
          var bF = String(b.Featured || "").toLowerCase() === "yes" ? 1 : 0;
          if (aF !== bF) return bF - aF;
          var aP = Number(a.Priority || 0);
          var bP = Number(b.Priority || 0);
          if (aP !== bP) return bP - aP;
          return 0;
        });
      } catch (sortErr) {
        console.log("Phase4: Sort error:", sortErr.toString());
      }
    }

    var limit = Math.min(result.length, 3);
    var queue = result.slice(0, limit);

    queue.forEach(function(ad) {
      try {
        trackAdAnalytics(ad.CampaignID, "impression");
      } catch (trackErr) {
        console.log("Phase4: Track error:", trackErr.toString());
      }
    });

    console.log("Phase4: Queue result - total:", result.length, "queue:", queue.length);

    return success({
      queue: queue,
      total: queue.length,
      remaining: result.length - queue.length
    }, "PIP Queue Loaded");

  } catch (err) {
    console.log("Phase4: getPipQueue error:", err.toString());
    // NEVER crash - always return empty queue
    return success({
      queue: [],
      total: 0,
      remaining: 0
    }, "PIP Queue Loaded (empty)");
  }
}


/**
 * ============================================================
 * GET ADVERTISEMENT CENTER
 * ?action=getadcenter&userId=U001&category=Products&lat=26.91&lng=75.78&radius=51
 * ============================================================
 */
function getAdvertisementCenter(e) {
  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";
    var category = p.category || "";
    var lat = p.lat || "";
    var lng = p.lng || "";
    var radius = p.radius || "";

    var campaigns = getSheetData("PromotionCampaigns");
    var now = new Date();
    var result = [];

    campaigns.forEach(function(c) {
      try {
        // Normalize old schema to new schema
        c = normalizeCampaign(c);
        
        var status = String(c.Status || "").toLowerCase();
        var start = c.StartDate ? new Date(c.StartDate) : null;
        var end = c.EndDate ? new Date(c.EndDate) : null;
        var remainingPool = Number(c.RemainingRewardPool || 0);
        var maxViews = Number(c.MaxViews || 0);
        var currentViews = Number(c.Views || 0);
        var maxUsers = Number(c.MaxRewardedUsers || 0);
        var rewardedCount = Number(c.RewardedUsersCount || 0);

        if (status !== "active") return;
        if (start && start > now) return;
        if (end && end < now) return;
        if (remainingPool <= 0) return;
        if (maxViews > 0 && currentViews >= maxViews) return;
        if (maxUsers > 0 && rewardedCount >= maxUsers) return;

        if (category && String(c.TargetCategory || "") !== "" && String(c.TargetCategory) !== category) return;

        result.push(c);
      } catch (campErr) {
        console.log("Phase4: AdCenter campaign error:", campErr.toString());
      }
    });

    var progressMap = {};
    if (userId) {
      try {
        var progressList = getSheetData("AdWatchProgress");
        progressList.forEach(function(pr) {
          if (String(pr.UserID) === String(userId)) {
            progressMap[pr.CampaignID] = pr;
          }
        });
      } catch (progErr) {
        console.log("Phase4: Progress map error:", progErr.toString());
      }
    }

    var responseData = result.map(function(c) {
      try {
        var progress = progressMap[c.CampaignID] || null;
        var watched = progress ? Number(progress.WatchedSeconds || 0) : 0;
        var paid = progress ? Number(progress.RewardPaid || 0) : 0;
        var totalDuration = Number(c.Duration || 5);
        var totalReward = Number(c.RewardCoins || 0);
        var remainingReward = Math.max(0, totalReward - paid);
        var remainingSeconds = Math.max(0, totalDuration - watched);
        var remainingPool = Number(c.RemainingRewardPool || 0);
        var rewardPerUser = Number(c.RewardPerUser || 0);

        var actualReward = totalReward;
        if (rewardPerUser > 0) actualReward = Math.min(actualReward, rewardPerUser);
        if (remainingPool > 0) actualReward = Math.min(actualReward, remainingPool);

        return {
          CampaignID: c.CampaignID,
          Title: c.Title || c.CampaignType || "Promotion",
          Description: c.Description || "",
          CampaignType: c.CampaignType || "",
          AdType: c.AdType || "IMAGE",
          PromotedEntityID: c.PromotedEntityID || c.TargetID || "",
          PromotedEntityType: c.PromotedEntityType || c.TargetType || "",
          ExternalURL: c.ExternalURL || "",
          ImageURL: c.ImageURL || "",
          VideoURL: c.VideoURL || "",
          Duration: totalDuration,
          RewardCoins: actualReward,
          RewardPerSecond: Number(c.RewardPerSecond || 1),
          RepeatRewardType: c.RepeatRewardType || "ONCE",
          PIPEnabled: c.PIPEnabled || "Yes",
          Featured: c.Featured || "No",
          Priority: Number(c.Priority || 0),
          TargetCategory: c.TargetCategory || "",
          TargetCity: c.TargetCity || c.City || "",
          TargetState: c.TargetState || c.State || "",
          DistanceKm: c.DistanceKm || "",
          CampaignBudget: Number(c.CampaignBudget || 0),
          RewardPerUser: rewardPerUser,
          MaxViews: Number(c.MaxViews || 0),
          MaxRewardedUsers: Number(c.MaxRewardedUsers || 0),
          TotalRewardPool: Number(c.TotalRewardPool || 0),
          RemainingRewardPool: remainingPool,
          Views: Number(c.Views || 0),
          RewardedUsersCount: Number(c.RewardedUsersCount || 0),
          WatchedSeconds: watched,
          RewardPaid: paid,
          RemainingSeconds: remainingSeconds,
          RemainingReward: Math.min(remainingReward, remainingPool),
          ProgressPercent: totalDuration > 0 ? Math.min(100, Math.round((watched / totalDuration) * 100)) : 0,
          CanWatch: remainingSeconds > 0 && remainingPool > 0,
          Status: progress ? progress.Status : "new"
        };
      } catch (mapErr) {
        console.log("Phase4: Map error:", mapErr.toString());
        return null;
      }
    }).filter(function(item) { return item !== null; });

    return success({
      count: responseData.length,
      data: responseData
    }, "Advertisement Center Loaded");

  } catch (err) {
    console.log("Phase4: getAdvertisementCenter error:", err.toString());
    return success({
      count: 0,
      data: []
    }, "Advertisement Center Loaded (empty)");
  }
}


/**
 * ============================================================
 * DEBUG PIP
 * ?action=debugpip
 * Returns detailed diagnostics about PIP queue processing
 * ============================================================
 */
function debugPip(e) {
  try {
    ensurePromotionSheets();
    var campaigns = getSheetData("PromotionCampaigns");
    var now = new Date();
    var reasons = {
      total: campaigns.length,
      notActive: 0,
      pipDisabled: 0,
      notStarted: 0,
      expired: 0,
      noPool: 0,
      maxViewsReached: 0,
      passed: 0,
      details: []
    };

    campaigns.forEach(function(c) {
      try {
        var original = JSON.parse(JSON.stringify(c));
        c = normalizeCampaign(c);
        
        var status = String(c.Status || "").toLowerCase();
        var pip = String(c.PIPEnabled || "").toLowerCase();
        var start = c.StartDate ? new Date(c.StartDate) : null;
        var end = c.EndDate ? new Date(c.EndDate) : null;
        var remainingPool = Number(c.RemainingRewardPool || 0);
        var maxViews = Number(c.MaxViews || 0);
        var currentViews = Number(c.Views || 0);
        
        var rejected = false;
        var reason = "";
        
        if (status !== "active") { reasons.notActive++; reason = "Status not active: " + status; rejected = true; }
        else if (pip !== "yes" && pip !== "true") { reasons.pipDisabled++; reason = "PIPEnabled not yes: " + pip; rejected = true; }
        else if (start && start > now) { reasons.notStarted++; reason = "StartDate in future: " + start; rejected = true; }
        else if (end && end < now) { reasons.expired++; reason = "EndDate in past: " + end; rejected = true; }
        else if (remainingPool <= 0) { reasons.noPool++; reason = "RemainingRewardPool: " + remainingPool; rejected = true; }
        else if (maxViews > 0 && currentViews >= maxViews) { reasons.maxViewsReached++; reason = "MaxViews reached: " + currentViews + "/" + maxViews; rejected = true; }
        else { reasons.passed++; reason = "PASSED"; }
        
        reasons.details.push({
          CampaignID: c.CampaignID,
          Status: c.Status,
          PIPEnabled: c.PIPEnabled,
          RemainingRewardPool: c.RemainingRewardPool,
          StartDate: c.StartDate ? String(c.StartDate) : "",
          EndDate: c.EndDate ? String(c.EndDate) : "",
          Views: c.Views,
          MaxViews: c.MaxViews,
          passed: !rejected,
          reason: reason,
          normalized: c
        });
      } catch (detErr) {
        reasons.details.push({
          CampaignID: c.CampaignID || "unknown",
          error: detErr.toString()
        });
      }
    });

    return success(reasons, "Debug PIP Info");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * START AD WATCH
 * ?action=startadwatch&userId=U001&campaignId=C001
 * ============================================================
 */
function startAdWatch(e) {
  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";
    var campaignId = p.campaignId || "";

    if (!userId || !campaignId) {
      return error("userId and campaignId required");
    }

    var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) {
      return error("Campaign not found");
    }
    
    // Normalize
    campaign = normalizeCampaign(campaign);

    var status = String(campaign.Status || "").toLowerCase();
    if (status !== "active") {
      return error("Campaign is not active");
    }

    // Check reward pool
    var remainingPool = Number(campaign.RemainingRewardPool || 0);
    if (remainingPool <= 0) {
      return error("Campaign reward pool exhausted.");
    }

    // Check max views
    var maxViews = Number(campaign.MaxViews || 0);
    var currentViews = Number(campaign.Views || 0);
    if (maxViews > 0 && currentViews >= maxViews) {
      return error("Campaign maximum views reached.");
    }

    // Check max rewarded users
    var maxUsers = Number(campaign.MaxRewardedUsers || 0);
    var rewardedCount = Number(campaign.RewardedUsersCount || 0);

    // Check repeat reward type
    var repeatType = String(campaign.RepeatRewardType || "ONCE").toUpperCase();
    if (repeatType === "ONCE") {
      var history = getSheetData("AdWatchHistory");
      var alreadyCompleted = false;
      history.forEach(function(h) {
        if (String(h.UserID) === String(userId) && String(h.CampaignID) === String(campaignId) && (String(h.Status) === "completed" || String(h.Status) === "rewarded")) {
          alreadyCompleted = true;
        }
      });
      if (alreadyCompleted) {
        return error("You have already completed this ad. Reward type: ONCE");
      }
    } else if (repeatType === "DAILY") {
      var today = new Date().toISOString().split("T")[0];
      var hist = getSheetData("AdWatchHistory");
      var doneToday = false;
      hist.forEach(function(h) {
        if (String(h.UserID) === String(userId) && String(h.CampaignID) === String(campaignId) && (String(h.Status) === "completed" || String(h.Status) === "rewarded")) {
          var d = h.CreatedAt ? new Date(h.CreatedAt).toISOString().split("T")[0] : "";
          if (d === today) doneToday = true;
        }
      });
      if (doneToday) {
        return error("Daily limit reached. Come back tomorrow.");
      }
    } else if (repeatType === "WEEKLY") {
      var weekStart = getWeekStart();
      var hist2 = getSheetData("AdWatchHistory");
      var doneThisWeek = false;
      hist2.forEach(function(h) {
        if (String(h.UserID) === String(userId) && String(h.CampaignID) === String(campaignId) && (String(h.Status) === "completed" || String(h.Status) === "rewarded")) {
          var d = h.CreatedAt ? new Date(h.CreatedAt) : null;
          if (d && d >= weekStart) doneThisWeek = true;
        }
      });
      if (doneThisWeek) {
        return error("Weekly limit reached. Come back next week.");
      }
    }

    // Check max views per user
    var maxPerUser = Number(campaign.MaxViewsPerUser || 0);
    if (maxPerUser > 0) {
      var hist3 = getSheetData("AdWatchHistory");
      var viewCount = 0;
      hist3.forEach(function(h) {
        if (String(h.UserID) === String(userId) && String(h.CampaignID) === String(campaignId)) {
          viewCount++;
        }
      });
      if (viewCount >= maxPerUser) {
        return error("Maximum views reached for this campaign.");
      }
    }

    // Get existing progress
    var progressSheet = getSheet("AdWatchProgress");
    var progressData = progressSheet.getDataRange().getValues();
    var existingProgress = null;

    for (var i = 1; i < progressData.length; i++) {
      if (String(progressData[i][1]) === String(userId) && String(progressData[i][2]) === String(campaignId)) {
        existingProgress = {
          row: i + 1,
          ProgressID: progressData[i][0],
          WatchedSeconds: Number(progressData[i][5] || 0),
          RewardPaid: Number(progressData[i][6] || 0)
        };
        break;
      }
    }

    // Increment views
    trackAdAnalytics(campaignId, "view");
    trackAdAnalytics(campaignId, "uniqueViewer");

    // Track in watch history
    var watchId = "WH" + Utilities.getUuid().substring(0, 8);
    var historySheet = getSheet("AdWatchHistory");
    historySheet.appendRow([
      watchId,
      userId,
      campaignId,
      campaign.AdID || "",
      existingProgress ? "resumed" : "started",
      0,
      0,
      new Date(),
      null,
      existingProgress ? existingProgress.WatchedSeconds : 0,
      new Date()
    ]);

    var rewardPerUser = Number(campaign.RewardPerUser || campaign.RewardCoins || 0);
    var rewardCap = Math.min(rewardPerUser, remainingPool);

    return success({
      watchId: watchId,
      campaignId: campaignId,
      totalDuration: Number(campaign.Duration || 5),
      totalReward: Number(campaign.RewardCoins || 0),
      rewardPerSecond: Number(campaign.RewardPerSecond || 1),
      rewardPerUser: rewardPerUser,
      remainingPool: remainingPool,
      rewardCap: rewardCap,
      watchedSeconds: existingProgress ? existingProgress.WatchedSeconds : 0,
      rewardPaid: existingProgress ? existingProgress.RewardPaid : 0,
      remainingSeconds: Math.max(0, Number(campaign.Duration || 5) - (existingProgress ? existingProgress.WatchedSeconds : 0)),
      remainingReward: Math.max(0, rewardCap - (existingProgress ? existingProgress.RewardPaid : 0)),
      isResume: existingProgress !== null,
      adType: campaign.AdType || "IMAGE",
      imageURL: campaign.ImageURL || "",
      videoURL: campaign.VideoURL || "",
      externalURL: campaign.ExternalURL || "",
      title: campaign.Title || campaign.CampaignType || "Promotion",
      description: campaign.Description || ""
    }, "Ad watch started");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UPDATE AD PROGRESS
 * ?action=updateadprogress&userId=U001&campaignId=C001&watchedSeconds=5
 * Concurrency protected with LockService
 * ============================================================
 */
function updateAdProgress(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";
    var campaignId = p.campaignId || "";
    var watchedSeconds = Number(p.watchedSeconds || 0);

    if (!userId || !campaignId) {
      return error("userId and campaignId required");
    }

    var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) {
      return error("Campaign not found");
    }
    
    campaign = normalizeCampaign(campaign);

    var totalDuration = Number(campaign.Duration || 5);
    var rewardPerSecond = Number(campaign.RewardPerSecond || 1);
    var remainingPool = Number(campaign.RemainingRewardPool || 0);
    var rewardPerUser = Number(campaign.RewardPerUser || campaign.RewardCoins || 0);
    watchedSeconds = Math.min(watchedSeconds, totalDuration);

    var progressSheet = getSheet("AdWatchProgress");
    var progressData = progressSheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < progressData.length; i++) {
      if (String(progressData[i][1]) === String(userId) && String(progressData[i][2]) === String(campaignId)) {
        var oldWatched = Number(progressData[i][5] || 0);
        var newWatched = Math.max(oldWatched, watchedSeconds);
        var newReward = Math.min(Math.floor(newWatched * rewardPerSecond), rewardPerUser, remainingPool);
        var totalReward = Number(campaign.RewardCoins || 0);
        newReward = Math.min(newReward, totalReward);

        progressSheet.getRange(i + 1, 6).setValue(newWatched);
        progressSheet.getRange(i + 1, 7).setValue(newReward);
        progressSheet.getRange(i + 1, 8).setValue(Math.max(0, totalDuration - newWatched));
        progressSheet.getRange(i + 1, 9).setValue(Math.max(0, Math.min(totalReward, rewardPerUser, remainingPool) - newReward));
        progressSheet.getRange(i + 1, 10).setValue(newWatched >= totalDuration ? "completed" : "in_progress");
        progressSheet.getRange(i + 1, 11).setValue(new Date());

        found = true;
        break;
      }
    }

    if (!found) {
      var progressId = "PW" + Utilities.getUuid().substring(0, 8);
      var newR = Math.min(Math.floor(watchedSeconds * rewardPerSecond), rewardPerUser, remainingPool);
      var totalR = Number(campaign.RewardCoins || 0);
      newR = Math.min(newR, totalR);

      progressSheet.appendRow([
        progressId,
        userId,
        campaignId,
        campaign.AdID || "",
        totalDuration,
        watchedSeconds,
        newR,
        Math.max(0, totalDuration - watchedSeconds),
        Math.max(0, Math.min(totalR, rewardPerUser, remainingPool) - newR),
        watchedSeconds >= totalDuration ? "completed" : "in_progress",
        new Date(),
        new Date()
      ]);
    }

    return success({
      campaignId: campaignId,
      watchedSeconds: watchedSeconds,
      totalDuration: totalDuration,
      rewardEarned: Math.min(Math.floor(watchedSeconds * rewardPerSecond), rewardPerUser, remainingPool),
      totalReward: Number(campaign.RewardCoins || 0),
      remainingPool: remainingPool,
      progressPercent: totalDuration > 0 ? Math.min(100, Math.round((watchedSeconds / totalDuration) * 100)) : 0
    }, "Progress updated");

  } catch (err) {
    return exception(err);
  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * COMPLETE AD WATCH
 * ?action=completeadwatch&userId=U001&campaignId=C001
 * Deducts from the campaign's RemainingRewardPool
 * Concurrency protected with LockService + idempotency check
 * ============================================================
 */
function completeAdWatch(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";
    var campaignId = p.campaignId || "";

    if (!userId || !campaignId) {
      return error("userId and campaignId required");
    }

    // Idempotency check
    var existingRewards = getSheetData("AdRewards");
    for (var r = 0; r < existingRewards.length; r++) {
      if (
        String(existingRewards[r].UserID) === String(userId) &&
        String(existingRewards[r].CampaignID) === String(campaignId) &&
        String(existingRewards[r].Status) === "paid"
      ) {
        return success({
          duplicate: true,
          message: "Reward already processed.",
          rewardId: existingRewards[r].RewardID,
          coinsEarned: Number(existingRewards[r].Coins || 0)
        }, "Reward already processed.");
      }
    }

    var existingHistory = getSheetData("AdWatchHistory");
    for (var h = 0; h < existingHistory.length; h++) {
      if (
        String(existingHistory[h].UserID) === String(userId) &&
        String(existingHistory[h].CampaignID) === String(campaignId) &&
        (String(existingHistory[h].Status) === "completed" || String(existingHistory[h].Status) === "rewarded")
      ) {
        return success({
          duplicate: true,
          message: "Reward already processed.",
          coinsEarned: Number(existingHistory[h].RewardCoins || 0)
        }, "Reward already processed.");
      }
    }

    var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) {
      return error("Campaign not found");
    }
    
    campaign = normalizeCampaign(campaign);

    var totalDuration = Number(campaign.Duration || 5);
    var rewardPerSecond = Number(campaign.RewardPerSecond || 1);
    var totalReward = Number(campaign.RewardCoins || 0);
    var remainingPool = Number(campaign.RemainingRewardPool || 0);
    var rewardPerUser = Number(campaign.RewardPerUser || totalReward);
    var maxViews = Number(campaign.MaxViews || 0);
    var currentViews = Number(campaign.Views || 0);
    var maxUsers = Number(campaign.MaxRewardedUsers || 0);
    var rewardedCount = Number(campaign.RewardedUsersCount || 0);

    if (remainingPool <= 0) {
      return error("Campaign reward pool exhausted.");
    }

    var finalReward = Math.min(totalReward, rewardPerUser, remainingPool);
    var finalWatched = totalDuration;

    // Update progress
    var progressSheet = getSheet("AdWatchProgress");
    var progressData = progressSheet.getDataRange().getValues();
    for (var i = 1; i < progressData.length; i++) {
      if (String(progressData[i][1]) === String(userId) && String(progressData[i][2]) === String(campaignId)) {
        progressSheet.getRange(i + 1, 6).setValue(totalDuration);
        progressSheet.getRange(i + 1, 7).setValue(finalReward);
        progressSheet.getRange(i + 1, 8).setValue(0);
        progressSheet.getRange(i + 1, 9).setValue(0);
        progressSheet.getRange(i + 1, 10).setValue("completed");
        progressSheet.getRange(i + 1, 11).setValue(new Date());
        finalWatched = Math.max(Number(progressData[i][5] || 0), totalDuration);
        break;
      }
    }

    // Update watch history
    var historySheet = getSheet("AdWatchHistory");
    var histData = historySheet.getDataRange().getValues();
    for (var j = 1; j < histData.length; j++) {
      if (String(histData[j][1]) === String(userId) && String(histData[j][2]) === String(campaignId) && (String(histData[j][4]) === "started" || String(histData[j][4]) === "resumed")) {
        historySheet.getRange(j + 1, 5).setValue("completed");
        historySheet.getRange(j + 1, 6).setValue(1);
        historySheet.getRange(j + 1, 7).setValue(finalReward);
        historySheet.getRange(j + 1, 9).setValue(new Date());
        historySheet.getRange(j + 1, 10).setValue(finalWatched);
        break;
      }
    }

    // Credit reward to wallet
    if (finalReward > 0) {
      creditWallet(userId, finalReward, campaignId, "Ad Reward - " + (campaign.Title || ""));
    }

    // Update campaign reward pool
    var newRemainingPool = Math.max(0, remainingPool - finalReward);
    var newTotalPaid = Number(campaign.TotalRewardPaid || 0) + finalReward;
    var newRewardedCount = rewardedCount + 1;
    var newViews = currentViews + 1;

    var completedStatus = "Active";
    if (newRemainingPool <= 0) {
      completedStatus = "Completed";
    } else if (maxViews > 0 && newViews >= maxViews) {
      completedStatus = "Completed";
    } else if (maxUsers > 0 && newRewardedCount >= maxUsers) {
      completedStatus = "Completed";
    }

    updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      RemainingRewardPool: newRemainingPool,
      TotalRewardPaid: newTotalPaid,
      RewardedUsersCount: newRewardedCount,
      Views: newViews,
      Status: completedStatus
    });

    // Create reward record
    var rewardSheet = getSheet("AdRewards");
    var rewardId = "AR" + Utilities.getUuid().substring(0, 8);
    rewardSheet.appendRow([
      rewardId,
      userId,
      campaignId,
      finalReward,
      "WT" + Utilities.getUuid().substring(0, 8),
      "paid",
      new Date()
    ]);

    trackAdAnalytics(campaignId, "completion");
    trackAdAnalytics(campaignId, "reward");

    return success({
      campaignId: campaignId,
      finalWatchedSeconds: finalWatched,
      rewardEarned: finalReward,
      remainingPool: newRemainingPool,
      campaignCompleted: completedStatus !== "Active",
      rewardId: rewardId
    }, "Ad completed. " + finalReward + " coins earned!");

  } catch (err) {
    return exception(err);
  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * SKIP AD WATCH
 * ?action=skipadwatch&userId=U001&campaignId=C001&watchedSeconds=3
 * ============================================================
 */
function skipAdWatch(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";
    var campaignId = p.campaignId || "";
    var watchedSeconds = Number(p.watchedSeconds || 0);

    if (!userId || !campaignId) {
      return error("userId and campaignId required");
    }

    var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) {
      return error("Campaign not found");
    }
    
    campaign = normalizeCampaign(campaign);

    var totalDuration = Number(campaign.Duration || 5);
    var rewardPerSecond = Number(campaign.RewardPerSecond || 1);
    var remainingPool = Number(campaign.RemainingRewardPool || 0);
    var rewardPerUser = Number(campaign.RewardPerUser || campaign.RewardCoins || 0);

    // Save progress
    var progressSheet = getSheet("AdWatchProgress");
    var progressData = progressSheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < progressData.length; i++) {
      if (String(progressData[i][1]) === String(userId) && String(progressData[i][2]) === String(campaignId)) {
        var oldWatched = Math.max(Number(progressData[i][5] || 0), 0);
        var newWatched = Math.max(oldWatched, watchedSeconds);
        var newReward = Math.min(Math.floor(newWatched * rewardPerSecond), rewardPerUser, remainingPool);
        var totalReward = Number(campaign.RewardCoins || 0);
        newReward = Math.min(newReward, totalReward);

        progressSheet.getRange(i + 1, 6).setValue(newWatched);
        progressSheet.getRange(i + 1, 7).setValue(newReward);
        progressSheet.getRange(i + 1, 8).setValue(Math.max(0, totalDuration - newWatched));
        progressSheet.getRange(i + 1, 9).setValue(Math.max(0, Math.min(totalReward, rewardPerUser, remainingPool) - newReward));
        progressSheet.getRange(i + 1, 10).setValue("in_progress");
        progressSheet.getRange(i + 1, 11).setValue(new Date());

        found = true;
        break;
      }
    }

    if (!found && watchedSeconds > 0) {
      var progressId = "PW" + Utilities.getUuid().substring(0, 8);
      var newR = Math.min(Math.floor(watchedSeconds * rewardPerSecond), rewardPerUser, remainingPool);
      var totalR = Number(campaign.RewardCoins || 0);
      newR = Math.min(newR, totalR);

      progressSheet.appendRow([
        progressId,
        userId,
        campaignId,
        campaign.AdID || "",
        totalDuration,
        watchedSeconds,
        newR,
        Math.max(0, totalDuration - watchedSeconds),
        Math.max(0, Math.min(totalR, rewardPerUser, remainingPool) - newR),
        "in_progress",
        new Date(),
        new Date()
      ]);
    }

    // Update history
    var historySheet = getSheet("AdWatchHistory");
    var histData = historySheet.getDataRange().getValues();
    for (var j = 1; j < histData.length; j++) {
      if (String(histData[j][1]) === String(userId) && String(histData[j][2]) === String(campaignId) && (String(histData[j][4]) === "started" || String(histData[j][4]) === "resumed")) {
        historySheet.getRange(j + 1, 5).setValue("skipped");
        historySheet.getRange(j + 1, 6).setValue(0);
        historySheet.getRange(j + 1, 7).setValue(0);
        historySheet.getRange(j + 1, 9).setValue(new Date());
        historySheet.getRange(j + 1, 10).setValue(watchedSeconds);
        break;
      }
    }

    var partialReward = Math.min(Math.floor(watchedSeconds * rewardPerSecond), rewardPerUser, remainingPool);
    var totalR2 = Number(campaign.RewardCoins || 0);
    partialReward = Math.min(partialReward, totalR2);

    if (partialReward > 0) {
      var existingRewards = getSheetData("AdRewards");
      var alreadyPaid = false;
      for (var rx = 0; rx < existingRewards.length; rx++) {
        if (
          String(existingRewards[rx].UserID) === String(userId) &&
          String(existingRewards[rx].CampaignID) === String(campaignId) &&
          String(existingRewards[rx].Status) === "partial" &&
          Number(existingRewards[rx].Coins || 0) >= partialReward
        ) {
          alreadyPaid = true;
          break;
        }
      }

      if (!alreadyPaid) {
        creditWallet(userId, partialReward, campaignId, "Partial Ad Reward - " + (campaign.Title || ""));

        var newPool = Math.max(0, remainingPool - partialReward);
        var newPaid = Number(campaign.TotalRewardPaid || 0) + partialReward;
        updateRow("PromotionCampaigns", "CampaignID", campaignId, {
          RemainingRewardPool: newPool,
          TotalRewardPaid: newPaid
        });

        var rewardSheet = getSheet("AdRewards");
        var rewardId = "AR" + Utilities.getUuid().substring(0, 8);
        rewardSheet.appendRow([
          rewardId,
          userId,
          campaignId,
          partialReward,
          "WT" + Utilities.getUuid().substring(0, 8),
          "partial",
          new Date()
        ]);
      } else {
        return success({
          campaignId: campaignId,
          watchedSeconds: watchedSeconds,
          partialReward: partialReward,
          progressSaved: true,
          duplicate: true,
          message: "Partial reward already processed."
        }, "Progress saved. Partial reward already processed.");
      }
    }

    trackAdAnalytics(campaignId, "skip");

    return success({
      campaignId: campaignId,
      watchedSeconds: watchedSeconds,
      partialReward: partialReward,
      progressSaved: true
    }, "Progress saved. " + (partialReward > 0 ? partialReward + " coins earned!" : "No coins yet. Watch more."));

  } catch (err) {
    return exception(err);
  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * CLAIM AD REWARD
 * ============================================================
 */
function claimAdReward(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var campaignId = p.campaignId || "";

    if (!userId || !campaignId) {
      return error("userId and campaignId required");
    }

    var existingRewards = getSheetData("AdRewards");
    for (var r = 0; r < existingRewards.length; r++) {
      if (
        String(existingRewards[r].UserID) === String(userId) &&
        String(existingRewards[r].CampaignID) === String(campaignId) &&
        String(existingRewards[r].Status) === "paid"
      ) {
        return success({
          duplicate: true,
          message: "Reward already processed.",
          rewardId: existingRewards[r].RewardID,
          coinsEarned: Number(existingRewards[r].Coins || 0)
        }, "Reward already processed.");
      }
    }

    var progressSheet = getSheet("AdWatchProgress");
    var progressData = progressSheet.getDataRange().getValues();

    for (var i = 1; i < progressData.length; i++) {
      if (String(progressData[i][1]) === String(userId) && String(progressData[i][2]) === String(campaignId)) {
        var rewardPaid = Number(progressData[i][6] || 0);
        if (rewardPaid <= 0) {
          return error("No reward available to claim.");
        }

        var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
        var remainingPool = campaign ? Number(campaign.RemainingRewardPool || 0) : 0;
        var actualReward = Math.min(rewardPaid, remainingPool);

        if (actualReward <= 0) {
          return error("Campaign reward pool exhausted.");
        }

        creditWallet(userId, actualReward, campaignId, "Ad Reward Claim - " + campaignId);

        if (campaign) {
          var newPool = Math.max(0, remainingPool - actualReward);
          updateRow("PromotionCampaigns", "CampaignID", campaignId, {
            RemainingRewardPool: newPool,
            TotalRewardPaid: Number(campaign.TotalRewardPaid || 0) + actualReward
          });
        }

        var rewardSheet = getSheet("AdRewards");
        var rewardId = "AR" + Utilities.getUuid().substring(0, 8);
        rewardSheet.appendRow([
          rewardId,
          userId,
          campaignId,
          actualReward,
          "WT" + Utilities.getUuid().substring(0, 8),
          "paid",
          new Date()
        ]);

        progressSheet.getRange(i + 1, 10).setValue("claimed");

        return success({
          rewardId: rewardId,
          coinsEarned: actualReward
        }, actualReward + " coins claimed!");
      }
    }

    return error("No progress found for this campaign.");

  } catch (err) {
    return exception(err);
  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * GET AD WATCH PROGRESS
 * ============================================================
 */
function getAdWatchProgress(e) {
  try {
    var userId = e.parameter.userId || "";
    if (!userId) {
      return error("userId required");
    }

    var progressList = getSheetData("AdWatchProgress");
    var result = [];

    progressList.forEach(function(p) {
      if (String(p.UserID) === String(userId)) {
        result.push(p);
      }
    });

    return success(result, "Watch progress loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET AD WATCH HISTORY
 * ============================================================
 */
function getAdWatchHistory(e) {
  try {
    var userId = e.parameter.userId || "";
    if (!userId) {
      return error("userId required");
    }

    var history = getSheetData("AdWatchHistory");
    var result = [];

    history.forEach(function(h) {
      if (String(h.UserID) === String(userId)) {
        result.push(h);
      }
    });

    return success(result, "Watch history loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET AVAILABLE REWARD COINS
 * ============================================================
 */
function getAvailableRewardCoins(e) {
  try {
    var userId = e.parameter.userId || "";
    if (!userId) {
      return error("userId required");
    }

    var progressList = getSheetData("AdWatchProgress");
    var totalAvailable = 0;
    var pendingCount = 0;

    progressList.forEach(function(p) {
      if (String(p.UserID) === String(userId) && String(p.Status) !== "claimed" && String(p.Status) !== "completed") {
        var paid = Number(p.RewardPaid || 0);
        totalAvailable += paid;
        if (paid > 0) pendingCount++;
      }
    });

    return success({
      availableCoins: totalAvailable,
      pendingCount: pendingCount
    }, "Available rewards loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET CAMPAIGN ANALYTICS
 * ============================================================
 */
function getCampaignAnalytics(e) {
  try {
    var campaignId = e.parameter.campaignId || "";

    var analytics = getSheetData("AdAnalytics");
    var result = null;

    analytics.forEach(function(a) {
      if (String(a.CampaignID) === String(campaignId)) {
        result = a;
      }
    });

    if (!result) {
      return success({
        campaignId: campaignId,
        impressions: 0,
        views: 0,
        uniqueViewers: 0,
        skips: 0,
        completions: 0,
        completionRate: 0,
        rewardsPaid: 0,
        totalRewardPaid: 0,
        remainingRewardPool: 0,
        rewardedUsersCount: 0,
        ctr: 0
      }, "No analytics yet");
    }

    return success({
      campaignId: result.CampaignID,
      impressions: Number(result.Impressions || 0),
      views: Number(result.Views || 0),
      uniqueViewers: Number(result.UniqueViewers || 0),
      skips: Number(result.Skips || 0),
      completions: Number(result.Completions || 0),
      completionRate: Number(result.CompletionRate || 0),
      rewardsPaid: Number(result.RewardsPaid || 0),
      totalRewardPaid: Number(result.TotalRewardPaid || 0),
      remainingRewardPool: Number(result.RemainingRewardPool || 0),
      rewardedUsersCount: Number(result.RewardedUsersCount || 0),
      ctr: Number(result.CTR || 0)
    }, "Campaign analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CREATE PROMOTION CAMPAIGN
 * ============================================================
 */
function createPromotionCampaign(e) {
  try {
    ensurePromotionSheets();
    var p = e.parameter;
    var userId = p.userId || "";

    if (!userId) {
      return error("userId required");
    }

    var campaignType = p.campaignType || "";
    if (!campaignType) {
      return error("campaignType required");
    }

    var campaignBudget = Number(p.campaignBudget || p.rewardCoins || 0);
    if (campaignBudget <= 0) {
      return error("CampaignBudget or rewardCoins required");
    }

    var cost = campaignBudget;
    var rewardPerUser = Number(p.rewardPerUser || p.rewardCoins || 0);
    var maxViews = Number(p.maxViews || 0);
    var maxRewardedUsers = Number(p.maxRewardedUsers || 0);
    var costPerView = Number(p.costPerView || 0);

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      var wallet = getWalletRow(userId);
      if (!wallet) {
        return error("Wallet not found. Please create a wallet first.");
      }

      var balance = Number(wallet.Balance || 0);
      if (balance < cost) {
        return error("Insufficient EkkaCoins. Required: " + cost + ", Available: " + balance);
      }

      var afterDeduction = balance - cost;
      updateRow("Wallet", "WalletID", wallet.WalletID, {
        Balance: afterDeduction,
        TotalSpent: Number(wallet.TotalSpent || 0) + cost,
        LastUpdated: new Date()
      });

      createWalletTransaction(
        wallet.WalletID,
        userId,
        -cost,
        balance,
        afterDeduction,
        "CAMPAIGN_" + campaignType,
        "Promotion Campaign - " + campaignType
      );

      var sheet = getSheet("PromotionCampaigns");
      var campaignId = "C" + Utilities.getUuid().substring(0, 8);
      var now = new Date();

      var totalRewardPool = campaignBudget;
      var remainingRewardPool = campaignBudget;

      // Use OLD schema for backward compatibility
      sheet.appendRow([
        campaignId,                    // CampaignID
        campaignType,                  // CampaignType
        userId,                        // OwnerUserID
        p.promotedEntityType || "",    // TargetType
        p.promotedEntityID || "",      // TargetID
        cost,                          // CoinsSpent
        totalRewardPool,               // RewardPool
        0,                             // PlatformReserve
        remainingRewardPool,           // RemainingRewardCoins
        p.targetRadius || "All India", // Radius
        p.targetCity || "",            // City
        p.targetState || "",           // State
        p.targetState || "",           // District
        p.targetCountry || "",         // Country
        "",                            // Latitude
        "",                            // Longitude
        0,                             // Views
        0,                             // Clicks
        0,                             // Interested
        0,                             // Shares
        now,                           // StartDate
        p.endDate ? new Date(p.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // EndDate
        "Active",                      // Status
        now                            // CreatedDate
      ]);

      return success({
        campaignId: campaignId,
        cost: cost,
        budget: campaignBudget,
        totalRewardPool: totalRewardPool,
        remainingRewardPool: remainingRewardPool,
        balanceRemaining: afterDeduction
      }, "Promotion campaign created! Budget: " + campaignBudget + " EkkaCoins");

    } catch (err) {
      return exception(err);
    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PAUSE CAMPAIGN
 * ============================================================
 */
function pauseCampaign(e) {
  try {
    var campaignId = e.parameter.campaignId || "";
    if (!campaignId) {
      return error("campaignId required");
    }

    var updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Paused"
    });

    if (!updated) {
      return error("Campaign not found");
    }

    return success({ campaignId: campaignId }, "Campaign paused");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * RESUME CAMPAIGN
 * ============================================================
 */
function resumeCampaign(e) {
  try {
    var campaignId = e.parameter.campaignId || "";
    if (!campaignId) {
      return error("campaignId required");
    }

    var updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Active"
    });

    if (!updated) {
      return error("Campaign not found");
    }

    return success({ campaignId: campaignId }, "Campaign resumed");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE PRODUCT
 * ============================================================
 */
function promoteProduct(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var productId = p.productId || "";

    if (!userId || !productId) {
      return error("userId and productId required");
    }

    var product = getRowById("Products", "ProductID", productId);
    if (!product) {
      return error("Product not found");
    }

    var ownerId = product.UserID || product.OwnerUserID || "";
    if (String(ownerId) !== String(userId)) {
      return error("You can only promote your own products.");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_PRODUCT",
      adType: "PRODUCT",
      title: "Promote: " + (product.Title || "Product"),
      description: product.Description || "",
      promotedEntityID: productId,
      promotedEntityType: "Product",
      imageURL: product.ImageURL || product.image2 || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      targetCategory: product.Category || "",
      targetCity: product.City || "",
      targetState: product.State || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE BUSINESS
 * ============================================================
 */
function promoteBusiness(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var businessId = p.businessId || "";

    if (!userId || !businessId) {
      return error("userId and businessId required");
    }

    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business) {
      return error("Business not found");
    }

    var ownerId = business.UserID || business.OwnerUserID || "";
    if (String(ownerId) !== String(userId)) {
      return error("You can only promote your own businesses.");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_BUSINESS",
      adType: "BUSINESS",
      title: "Promote: " + (business.Title || "Business"),
      description: business.Description || "",
      promotedEntityID: businessId,
      promotedEntityType: "Business",
      imageURL: business.Logo || business.CoverImage || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      targetCategory: business.Category || "",
      targetCity: business.City || "",
      targetState: business.State || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE STORE
 * ============================================================
 */
function promoteStore(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var storeId = p.storeId || "";

    if (!userId || !storeId) {
      return error("userId and storeId required");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_STORE",
      adType: "STORE",
      title: p.title || "Store Promotion",
      description: p.description || "",
      promotedEntityID: storeId,
      promotedEntityType: "Store",
      imageURL: p.imageURL || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      targetCategory: p.targetCategory || "",
      targetCity: p.targetCity || "",
      targetState: p.targetState || "",
      externalURL: p.externalURL || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE PROPERTY
 * ============================================================
 */
function promoteProperty(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var propertyId = p.propertyId || "";

    if (!userId || !propertyId) {
      return error("userId and propertyId required");
    }

    var property = getRowById("Properties", "PropertyID", propertyId);
    if (!property) {
      return error("Property not found");
    }

    var ownerId = property.UserID || property.OwnerUserID || "";
    if (String(ownerId) !== String(userId)) {
      return error("You can only promote your own properties.");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_PROPERTY",
      adType: "PROPERTY",
      title: "Promote: " + (property.Title || "Property"),
      description: property.Description || "",
      promotedEntityID: propertyId,
      promotedEntityType: "Property",
      imageURL: property.ImageURL || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      targetCategory: property.Category || "",
      targetCity: property.City || "",
      targetState: property.State || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE LIVE
 * ============================================================
 */
function promoteLive(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var liveId = p.liveId || "";

    if (!userId || !liveId) {
      return error("userId and liveId required");
    }

    var live = getRowById("Live", "LiveID", liveId);
    if (!live) {
      return error("Live channel not found");
    }

    var ownerId = live.UserID || live.OwnerUserID || "";
    if (String(ownerId) !== String(userId)) {
      return error("You can only promote your own live channels.");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_LIVE",
      adType: "LIVE",
      title: "Promote: " + (live.Title || "Live Channel"),
      description: live.Description || "",
      promotedEntityID: liveId,
      promotedEntityType: "Live",
      imageURL: live.ImageURL || live.Thumbnail || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      targetCategory: live.Category || "",
      targetCity: live.City || "",
      targetState: live.State || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE NEWS
 * ============================================================
 */
function promoteNews(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var newsId = p.newsId || "";

    if (!userId || !newsId) {
      return error("userId and newsId required");
    }

    var news = getRowById("News", "NewsID", newsId);
    if (!news) {
      return error("News not found");
    }

    var ownerId = news.UserID || news.OwnerUserID || "";
    if (String(ownerId) !== String(userId)) {
      return error("You can only promote your own news.");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_NEWS",
      adType: "NEWS",
      title: "Promote: " + (news.Title || "News"),
      description: news.Description || "",
      promotedEntityID: newsId,
      promotedEntityType: "News",
      imageURL: news.ImageURL || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      externalURL: p.externalURL || "",
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE EXTERNAL URL
 * ============================================================
 */
function promoteExternalUrl(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var url = p.url || p.externalURL || "";

    if (!userId || !url) {
      return error("userId and url required");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_EXTERNAL_URL",
      adType: "URL",
      title: p.title || "External Link",
      description: p.description || "",
      promotedEntityID: "",
      promotedEntityType: "ExternalURL",
      imageURL: p.imageURL || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      externalURL: url,
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTE WEBSITE
 * ============================================================
 */
function promoteWebsite(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var url = p.url || p.websiteURL || "";

    if (!userId || !url) {
      return error("userId and url required");
    }

    var campaignParams = {
      userId: userId,
      campaignType: "PROMOTE_WEBSITE",
      adType: "URL",
      title: p.title || "Website",
      description: p.description || "",
      promotedEntityID: "",
      promotedEntityType: "Website",
      imageURL: p.imageURL || "",
      duration: p.duration || "10",
      rewardCoins: p.rewardCoins || "0",
      campaignBudget: p.campaignBudget || p.rewardCoins || "2000",
      rewardPerUser: p.rewardPerUser || "5",
      maxViews: p.maxViews || "400",
      maxRewardedUsers: p.maxRewardedUsers || "0",
      maxViewsPerUser: p.maxViewsPerUser || "0",
      repeatRewardType: p.repeatRewardType || "ONCE",
      pipEnabled: p.pipEnabled || "Yes",
      featured: p.featured || "No",
      externalURL: url,
      endDate: ""
    };

    var syntheticE = { parameter: campaignParams };
    return createPromotionCampaign(syntheticE);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CREATE DEMO AD CAMPAIGNS
 * ?action=createdemocampaigns
 * Creates 3 demo campaigns using OLD schema for compatibility
 * ============================================================
 */
function createDemoAdCampaigns() {
  try {
    ensurePromotionSheets();
    
    var sheet = getSheet("PromotionCampaigns");
    var data = sheet.getDataRange().getValues();
    
    // Only create demos if sheet is empty (only header row)
    if (data.length > 1) {
      return success({
        created: 0,
        message: "Campaigns already exist. Delete existing campaigns first if you want to recreate."
      }, "Demo campaigns not needed - campaigns already exist.");
    }
    
    var now = new Date();
    var futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    var created = 0;
    
    // Demo Campaign 1: Product Promotion
    sheet.appendRow([
      "CDEMO01",                    // CampaignID
      "PROMOTE_PRODUCT",            // CampaignType
      "SYSTEM",                      // OwnerUserID
      "Product",                     // TargetType
      "DEMO_PROD_001",              // TargetID
      0,                             // CoinsSpent
      5000,                          // RewardPool
      0,                             // PlatformReserve
      5000,                          // RemainingRewardCoins
      "All India",                   // Radius
      "",                            // City
      "",                            // District
      "",                            // State
      "",                            // Country
      "",                            // Latitude
      "",                            // Longitude
      0,                             // Views
      0,                             // Clicks
      0,                             // Interested
      0,                             // Shares
      now,                           // StartDate
      futureDate,                    // EndDate
      "Active",                      // Status
      now                            // CreatedDate
    ]);
    created++;
    
    // Demo Campaign 2: Business Promotion
    sheet.appendRow([
      "CDEMO02",                    // CampaignID
      "PROMOTE_BUSINESS",           // CampaignType
      "SYSTEM",                      // OwnerUserID
      "Business",                    // TargetType
      "DEMO_BIZ_001",               // TargetID
      0,                             // CoinsSpent
      5000,                          // RewardPool
      0,                             // PlatformReserve
      5000,                          // RemainingRewardCoins
      "All India",                   // Radius
      "",                            // City
      "",                            // District
      "",                            // State
      "",                            // Country
      "",                            // Latitude
      "",                            // Longitude
      0,                             // Views
      0,                             // Clicks
      0,                             // Interested
      0,                             // Shares
      now,                           // StartDate
      futureDate,                    // EndDate
      "Active",                      // Status
      now                            // CreatedDate
    ]);
    created++;
    
    // Demo Campaign 3: External URL Promotion
    sheet.appendRow([
      "CDEMO03",                    // CampaignID
      "PROMOTE_EXTERNAL_URL",       // CampaignType
      "SYSTEM",                      // OwnerUserID
      "ExternalURL",                 // TargetType
      "",                            // TargetID
      0,                             // CoinsSpent
      5000,                          // RewardPool
      0,                             // PlatformReserve
      5000,                          // RemainingRewardCoins
      "All India",                   // Radius
      "",                            // City
      "",                            // District
      "",                            // State
      "",                            // Country
      "",                            // Latitude
      "",                            // Longitude
      0,                             // Views
      0,                             // Clicks
      0,                             // Interested
      0,                             // Shares
      now,                           // StartDate
      futureDate,                    // EndDate
      "Active",                      // Status
      now                            // CreatedDate
    ]);
    created++;
    
    console.log("Phase4: Created " + created + " demo campaigns");
    
    return success({
      created: created,
      campaigns: ["CDEMO01", "CDEMO02", "CDEMO03"],
      message: created + " demo campaigns created successfully!"
    }, "Demo campaigns created!");
    
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * INTERNAL: TRACK AD ANALYTICS
 * ============================================================
 */
function trackAdAnalytics(campaignId, eventType) {
  try {
    var sheet = getSheet("AdAnalytics");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(campaignId)) {
        if (eventType === "impression") {
          sheet.getRange(i + 1, 3).setValue(Number(data[i][2] || 0) + 1);
        } else if (eventType === "view") {
          sheet.getRange(i + 1, 4).setValue(Number(data[i][3] || 0) + 1);
        } else if (eventType === "uniqueViewer") {
          sheet.getRange(i + 1, 5).setValue(Number(data[i][4] || 0) + 1);
        } else if (eventType === "skip") {
          sheet.getRange(i + 1, 6).setValue(Number(data[i][5] || 0) + 1);
        } else if (eventType === "completion") {
          var currentCompletions = Number(data[i][6] || 0) + 1;
          var currentViews = Number(data[i][3] || 0);
          var completionRate = currentViews > 0 ? Math.round((currentCompletions / currentViews) * 100) : 0;
          sheet.getRange(i + 1, 6).setValue(currentCompletions);
          sheet.getRange(i + 1, 7).setValue(completionRate);
        } else if (eventType === "reward") {
          sheet.getRange(i + 1, 8).setValue(Number(data[i][7] || 0) + 1);
          sheet.getRange(i + 1, 9).setValue(Number(data[i][8] || 0) + 1);
        }
        sheet.getRange(i + 1, 14).setValue(new Date());
        return;
      }
    }
  } catch (err) {
    Logger.log("trackAdAnalytics error: " + err.toString());
  }
}


/**
 * ============================================================
 * INTERNAL: CALCULATE CAMPAIGN COST
 * ============================================================
 */
function calculateCampaignCost(campaign) {
  return Number(campaign.CampaignBudget || campaign.rewardCoins || 0);
}


/**
 * ============================================================
 * INTERNAL: GET WEEK START (Monday)
 * ============================================================
 */
function getWeekStart() {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}