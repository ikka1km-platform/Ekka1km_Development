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
        s.appendRow(["CampaignID", "UserID", "Title", "Description", "CampaignType", "AdType", "PromotedEntityID", "PromotedEntityType", "ExternalURL", "ImageURL", "VideoURL", "Duration", "RewardCoins", "RewardPerSecond", "RepeatRewardType", "PIPEnabled", "Featured", "Priority", "MaxViewsPerUser", "TargetRadius", "TargetCategory", "TargetCity", "TargetState", "TargetCountry", "Status", "Cost", "Views", "Clicks", "Impressions", "StartDate", "EndDate", "CreatedAt", "CampaignBudget", "RewardPerUser", "MaxViews", "MaxRewardedUsers", "CostPerView", "TotalRewardPool", "RemainingRewardPool", "TotalRewardPaid", "RewardedUsersCount"]);
      }
    }
  });
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

    campaigns.forEach(function(c) {
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
    });

    // Priority: partially watched > featured > priority > new
    if (userId) {
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
    }

    var limit = Math.min(result.length, 3);
    var queue = result.slice(0, limit);

    queue.forEach(function(ad) {
      trackAdAnalytics(ad.CampaignID, "impression");
    });

    return success({
      queue: queue,
      total: queue.length,
      remaining: result.length - queue.length
    }, "PIP Queue Loaded");

  } catch (err) {
    return exception(err);
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
    });

    var progressMap = {};
    if (userId) {
      var progressList = getSheetData("AdWatchProgress");
      progressList.forEach(function(pr) {
        if (String(pr.UserID) === String(userId)) {
          progressMap[pr.CampaignID] = pr;
        }
      });
    }

    var responseData = result.map(function(c) {
      var progress = progressMap[c.CampaignID] || null;
      var watched = progress ? Number(progress.WatchedSeconds || 0) : 0;
      var paid = progress ? Number(progress.RewardPaid || 0) : 0;
      var totalDuration = Number(c.Duration || 10);
      var totalReward = Number(c.RewardCoins || 0);
      var remainingReward = Math.max(0, totalReward - paid);
      var remainingSeconds = Math.max(0, totalDuration - watched);
      var remainingPool = Number(c.RemainingRewardPool || 0);
      var rewardPerUser = Number(c.RewardPerUser || 0);

      // Actual reward per user is min(RewardCoins, RewardPerUser, RemainingPool)
      var actualReward = totalReward;
      if (rewardPerUser > 0) actualReward = Math.min(actualReward, rewardPerUser);
      if (remainingPool > 0) actualReward = Math.min(actualReward, remainingPool);

      return {
        CampaignID: c.CampaignID,
        Title: c.Title,
        Description: c.Description,
        CampaignType: c.CampaignType,
        AdType: c.AdType,
        PromotedEntityID: c.PromotedEntityID,
        PromotedEntityType: c.PromotedEntityType,
        ExternalURL: c.ExternalURL,
        ImageURL: c.ImageURL,
        VideoURL: c.VideoURL,
        Duration: totalDuration,
        RewardCoins: actualReward,
        RewardPerSecond: Number(c.RewardPerSecond || 1),
        RepeatRewardType: c.RepeatRewardType || "ONCE",
        PIPEnabled: c.PIPEnabled,
        Featured: c.Featured,
        Priority: Number(c.Priority || 0),
        TargetCategory: c.TargetCategory,
        TargetCity: c.TargetCity,
        TargetState: c.TargetState,
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
    });

    return success({
      count: responseData.length,
      data: responseData
    }, "Advertisement Center Loaded");

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
      totalDuration: Number(campaign.Duration || 10),
      totalReward: Number(campaign.RewardCoins || 0),
      rewardPerSecond: Number(campaign.RewardPerSecond || 1),
      rewardPerUser: rewardPerUser,
      remainingPool: remainingPool,
      rewardCap: rewardCap,
      watchedSeconds: existingProgress ? existingProgress.WatchedSeconds : 0,
      rewardPaid: existingProgress ? existingProgress.RewardPaid : 0,
      remainingSeconds: Math.max(0, Number(campaign.Duration || 10) - (existingProgress ? existingProgress.WatchedSeconds : 0)),
      remainingReward: Math.max(0, rewardCap - (existingProgress ? existingProgress.RewardPaid : 0)),
      isResume: existingProgress !== null,
      adType: campaign.AdType || "IMAGE",
      imageURL: campaign.ImageURL || "",
      videoURL: campaign.VideoURL || "",
      externalURL: campaign.ExternalURL || "",
      title: campaign.Title || "",
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

    var totalDuration = Number(campaign.Duration || 10);
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

    // ============================================================
    // IDEMPOTENCY CHECK: Has this reward already been processed?
    // Check AdRewards for existing paid entry
    // ============================================================
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

    // Also check AdWatchHistory for completed status
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

    var totalDuration = Number(campaign.Duration || 10);
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

    // Calculate final reward capped by pool and per-user limit
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

    // Credit reward to wallet (from campaign pool)
    if (finalReward > 0) {
      creditWallet(userId, finalReward, campaignId, "Ad Reward - " + (campaign.Title || ""));
    }

    // Update campaign reward pool
    var newRemainingPool = Math.max(0, remainingPool - finalReward);
    var newTotalPaid = Number(campaign.TotalRewardPaid || 0) + finalReward;
    var newRewardedCount = rewardedCount + 1;
    var newViews = currentViews + 1;

    // Check if campaign should auto-complete
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

    // Track analytics
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
 * Saves progress and pays partial reward from campaign pool
 * Concurrency protected with LockService + idempotency check
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

    var totalDuration = Number(campaign.Duration || 10);
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

    // ============================================================
    // IDEMPOTENCY CHECK: Has this partial reward already been paid?
    // ============================================================
    var partialReward = Math.min(Math.floor(watchedSeconds * rewardPerSecond), rewardPerUser, remainingPool);
    var totalR2 = Number(campaign.RewardCoins || 0);
    partialReward = Math.min(partialReward, totalR2);

    if (partialReward > 0) {
      // Check if already paid for this watch session
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

        // Update campaign pool
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
        // Duplicate detected, return existing result
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
 * ?action=claimadreward&userId=U001&campaignId=C001
 * Concurrency protected with LockService + idempotency check
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

    // ============================================================
    // IDEMPOTENCY CHECK: Has this reward already been claimed?
    // ============================================================
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

        // Check campaign pool
        var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
        var remainingPool = campaign ? Number(campaign.RemainingRewardPool || 0) : 0;
        var actualReward = Math.min(rewardPaid, remainingPool);

        if (actualReward <= 0) {
          return error("Campaign reward pool exhausted.");
        }

        // Credit wallet
        creditWallet(userId, actualReward, campaignId, "Ad Reward Claim - " + campaignId);

        // Update campaign pool
        if (campaign) {
          var newPool = Math.max(0, remainingPool - actualReward);
          updateRow("PromotionCampaigns", "CampaignID", campaignId, {
            RemainingRewardPool: newPool,
            TotalRewardPaid: Number(campaign.TotalRewardPaid || 0) + actualReward
          });
        }

        // Create reward record
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
 * ?action=getadwatchprogress&userId=U001
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
 * ?action=getadwatchhistory&userId=U001
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
 * ?action=getavailablerewardcoins&userId=U001
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
 * ?action=getcampaignanalytics&campaignId=C001
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
 * ?action=createpromotioncampaign
 * POST with all campaign fields
 * Deducts CampaignBudget from advertiser wallet atomically
 * Creates reward pool from budget
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

    // Temporary: cost = CampaignBudget or rewardCoins
    // Phase 5: Admin Dashboard will control dynamic pricing
    var campaignBudget = Number(p.campaignBudget || p.rewardCoins || 0);
    if (campaignBudget <= 0) {
      return error("CampaignBudget or rewardCoins required");
    }

    var cost = campaignBudget; // Temp: cost = budget
    // TODO Phase 5: calculateCampaignCost(p) from Admin Dashboard settings

    // Phase 5 Prep: Store all economic fields
    var rewardPerUser = Number(p.rewardPerUser || p.rewardCoins || 0);
    var maxViews = Number(p.maxViews || 0);
    var maxRewardedUsers = Number(p.maxRewardedUsers || 0);
    var costPerView = Number(p.costPerView || 0);

    // Atomic wallet operation: Lock, check, deduct
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

      // Deduct budget from wallet
      var afterDeduction = balance - cost;
      updateRow("Wallet", "WalletID", wallet.WalletID, {
        Balance: afterDeduction,
        TotalSpent: Number(wallet.TotalSpent || 0) + cost,
        LastUpdated: new Date()
      });

      // Create wallet transaction for deduction
      createWalletTransaction(
        wallet.WalletID,
        userId,
        -cost,
        balance,
        afterDeduction,
        "CAMPAIGN_" + campaignType,
        "Promotion Campaign - " + campaignType
      );

      // Create campaign
      var sheet = getSheet("PromotionCampaigns");
      var campaignId = "C" + Utilities.getUuid().substring(0, 8);
      var now = new Date();

      // Reward pool = CampaignBudget (temp). Phase 5: pool = budget - platform fee
      var totalRewardPool = campaignBudget;
      var remainingRewardPool = campaignBudget;

      sheet.appendRow([
        campaignId,                    // CampaignID
        userId,                        // UserID
        p.title || "",                 // Title
        p.description || "",           // Description
        campaignType,                  // CampaignType
        p.adType || "IMAGE",           // AdType
        p.promotedEntityID || "",      // PromotedEntityID
        p.promotedEntityType || "",    // PromotedEntityType
        p.externalURL || "",           // ExternalURL
        p.imageURL || "",              // ImageURL
        p.videoURL || "",              // VideoURL
        Number(p.duration || 10),      // Duration
        Number(p.rewardCoins || 0),    // RewardCoins
        p.rewardPerSecond || Math.round(Number(p.rewardCoins || 0) / Math.max(Number(p.duration || 10), 1)), // RewardPerSecond
        p.repeatRewardType || "ONCE",  // RepeatRewardType
        p.pipEnabled || "Yes",         // PIPEnabled
        p.featured || "No",            // Featured
        p.priority || 0,               // Priority
        p.maxViewsPerUser || 0,        // MaxViewsPerUser
        p.targetRadius || "",          // TargetRadius
        p.targetCategory || "",        // TargetCategory
        p.targetCity || "",            // TargetCity
        p.targetState || "",           // TargetState
        p.targetCountry || "",         // TargetCountry
        "Active",                      // Status
        cost,                          // Cost
        0,                             // Views
        0,                             // Clicks
        0,                             // Impressions
        now,                           // StartDate
        p.endDate ? new Date(p.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // EndDate
        now,                           // CreatedAt
        campaignBudget,                // CampaignBudget
        rewardPerUser,                 // RewardPerUser
        maxViews,                      // MaxViews
        maxRewardedUsers,              // MaxRewardedUsers
        costPerView,                   // CostPerView
        totalRewardPool,               // TotalRewardPool
        remainingRewardPool,           // RemainingRewardPool
        0,                             // TotalRewardPaid
        0                              // RewardedUsersCount
      ]);

      // Create analytics entry
      var analyticsSheet = getSheet("AdAnalytics");
      var analyticsId = "AA" + Utilities.getUuid().substring(0, 8);
      analyticsSheet.appendRow([
        analyticsId,
        campaignId,
        0,  // Impressions
        0,  // Views
        0,  // UniqueViewers
        0,  // Skips
        0,  // Completions
        0,  // CompletionRate
        0,  // RewardsPaid
        0,  // TotalRewardPaid
        remainingRewardPool,  // RemainingRewardPool
        0,  // RewardedUsersCount
        0,  // CTR
        new Date()
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
 * ?action=pausecampaign&campaignId=C001
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
 * ?action=resumecampaign&campaignId=C001
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
 * ?action=promoteproduct&userId=U001&productId=P001&campaignBudget=2000
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
 * ?action=promotebusiness&userId=U001&businessId=B001&campaignBudget=2000
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
 * ?action=promotestore&userId=U001&storeId=S001&campaignBudget=2000
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
 * ?action=promoteproperty&userId=U001&propertyId=PR001&campaignBudget=2000
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
 * ?action=promotelive&userId=U001&liveId=L001&campaignBudget=2000
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
 * ?action=promotenews&userId=U001&newsId=N001&campaignBudget=2000
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
      maxViewsPerUser: p.maxViewsPerUser || "0",
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
 * ?action=promoteexternalurl&userId=U001&url=https://...&campaignBudget=2000
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
 * ?action=promotewebsite&userId=U001&url=https://...&campaignBudget=2000
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
 * INTERNAL: TRACK AD ANALYTICS
 * ============================================================
 */
function trackAdAnalytics(campaignId, eventType) {
  try {
    var sheet = getSheet("AdAnalytics");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var uniqueViewers = {};

    // Build unique viewer set from existing data
    for (var x = 1; x < data.length; x++) {
      if (String(data[x][1]) === String(campaignId)) {
        // We track unique viewers via campaign's RewardedUsersCount in PromotionCampaigns
        break;
      }
    }

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
          sheet.getRange(i + 1, 6).setValue(currentCompletions); // Completions
          sheet.getRange(i + 1, 7).setValue(completionRate);      // CompletionRate
        } else if (eventType === "reward") {
          sheet.getRange(i + 1, 8).setValue(Number(data[i][7] || 0) + 1); // RewardsPaid
          // TotalRewardPaid is tracked in PromotionCampaigns
          sheet.getRange(i + 1, 9).setValue(Number(data[i][8] || 0) + 1); // TotalRewardPaid (increment count)
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
 *
 * TEMPORARY IMPLEMENTATION ONLY
 * ============================================================
 * Phase 5 Admin Dashboard will control pricing.
 * DO NOT implement hardcoded pricing formulas.
 *
 * Pricing will depend on:
 * - Radius
 * - Maximum Views
 * - Reward Per User
 * - Campaign Budget
 * - Campaign Type
 * - Featured Status
 * - PIP Status
 * - Advertisement Package
 *
 * Each campaign has completely different economics.
 *
 * Examples:
 *   Campaign A: Budget=2000, Radius=25km, MaxViews=400, RewardPerUser=5
 *   Campaign B: Budget=5000, Radius=All India, MaxViews=2000, RewardPerUser=2
 *   Campaign C: Budget=1000, Radius=5km, MaxViews=100, RewardPerUser=10
 * ============================================================
 */
function calculateCampaignCost(campaign) {
  // Temporary: cost equals campaign budget
  // Phase 5: Admin Dashboard will compute price dynamically
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