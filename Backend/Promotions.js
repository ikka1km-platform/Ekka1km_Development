/**
 * ============================================================
 * EKKA1KM BACKEND
 * Promotions.js
 * Phase 3.7 - Promotion System
 * V2.0 - Upgraded schema, status system, scheduler, safe transactions, migration
 * ============================================================
 */


/**
 * ============================================================
 * PROMOTION PRICING
 * ============================================================
 */
var PROMOTION_PRICES = {
  "Silver": { "1": 10, "5": 20, "10": 30, "25": 50, "51": 75, "100": 100, "All India": 200 },
  "Gold": { "1": 25, "5": 50, "10": 75, "25": 100, "51": 150, "100": 200, "All India": 400 },
  "Titanium": { "1": 50, "5": 100, "10": 150, "25": 200, "51": 300, "100": 400, "All India": 800 }
};

var PROMOTION_DURATION_MULTIPLIER = { "1": 1, "3": 3, "7": 7, "15": 15, "30": 30 };


/**
 * ============================================================
 * ENSURE PROMOTIONS SHEET EXISTS
 * ============================================================
 */
function ensurePromotionsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Promotions");
  if (!sheet) {
    sheet = ss.insertSheet("Promotions");
    sheet.appendRow([
      "PromotionID", "UserID", "PromotionType", "TargetType", "TargetID",
      "Radius", "Duration", "CoinsSpent", "RewardPool", "RemainingRewardCoins",
      "City", "District", "State", "Latitude", "Longitude",
      "Status", "Views", "Clicks", "Interested", "CTR",
      "StartDate", "EndDate", "CreatedDate", "UpdatedDate"
    ]);
    Logger.log("Sheet created: Promotions with full headers");
  }
  return sheet;
}


/**
 * ============================================================
 * CALCULATE PROMOTION PRICE
 * ============================================================
 */
function calculatePromotionPrice(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var promotionType = p.promotionType || "Silver";
    var radius = p.radius || "51";
    var duration = p.duration || "1";

    if (!PROMOTION_PRICES[promotionType]) {
      return error("Invalid promotion type. Must be Silver, Gold, or Titanium");
    }

    var radiusPrices = PROMOTION_PRICES[promotionType];
    var basePrice = radiusPrices[radius];
    if (!basePrice) return error("Invalid radius for " + promotionType);

    var multiplier = PROMOTION_DURATION_MULTIPLIER[duration];
    if (!multiplier) return error("Invalid duration. Must be 1, 3, 7, 15, or 30");

    var totalPrice = basePrice * multiplier;

    return success({
      promotionType: promotionType,
      radius: radius,
      duration: duration + " day(s)",
      basePrice: basePrice,
      durationMultiplier: multiplier,
      totalPrice: totalPrice,
      currency: "Coins"
    }, "Price calculated");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CREATE PROMOTION TRANSACTION (Atomic)
 * Order: 1. Validate wallet 2. Deduct coins 3. Create promotion 4. Create transaction 5. Update analytics
 * If any step fails, rollback everything
 * ============================================================
 */
function createPromotionTransaction(userId, promotionType, targetType, targetId, radius, duration, totalCoins) {
  // Step 1: Validate wallet
  var wallet = getWalletRow(userId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  var balance = Number(wallet.Balance || 0);
  if (balance < totalCoins) {
    throw new Error("Insufficient coins. Required: " + totalCoins + ", Available: " + balance);
  }

  var oldBalance = balance;
  var newBalance = balance - totalCoins;

  // Step 2: Deduct coins
  var walletUpdated = updateRow("Wallet", "WalletID", wallet.WalletID, {
    Balance: newBalance,
    LastUpdated: new Date()
  });

  if (!walletUpdated) {
    throw new Error("Failed to update wallet");
  }

  // Step 3: Create promotion record
  var sheet = ensurePromotionsSheet();
  var promotionId = "PR" + Utilities.getUuid().substring(0, 8);
  var startDate = new Date();
  var endDate = new Date(startDate.getTime() + parseInt(duration) * 24 * 60 * 60 * 1000);

  var rewardPool = Math.floor(totalCoins * 0.7); // 70% goes to reward pool
  var remainingRewardCoins = rewardPool;

  sheet.appendRow([
    promotionId, userId, promotionType, targetType, targetId,
    radius, duration, totalCoins, rewardPool, remainingRewardCoins,
    "", "", "", "", "",
    "Active", 0, 0, 0, 0,
    startDate, endDate, new Date(), new Date()
  ]);

  // Step 4: Create wallet transaction
  try {
    createWalletTransaction(
      wallet.WalletID,
      userId,
      -totalCoins,
      oldBalance,
      newBalance,
      "PROMO_" + promotionId,
      "Promotion - " + promotionType + " " + targetType
    );
  } catch (txErr) {
    // Rollback wallet
    updateRow("Wallet", "WalletID", wallet.WalletID, {
      Balance: oldBalance,
      LastUpdated: new Date()
    });
    throw new Error("Failed to create transaction: " + txErr.toString());
  }

  // Step 5: Invalidate cache
  invalidateDashboardCache(userId);

  return {
    promotionId: promotionId,
    coinsSpent: totalCoins,
    remainingBalance: newBalance,
    startDate: startDate,
    endDate: endDate,
    status: "Active"
  };
}


/**
 * ============================================================
 * CREATE PROMOTION
 * ============================================================
 */
function createPromotion(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var promotionType = p.promotionType || "Silver";
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";
    var radius = p.radius || "51";
    var duration = p.duration || "1";

    if (!userId || !targetType || !targetId) {
      return error("userId, targetType, and targetId required");
    }

    if (["Product", "Business", "Property"].indexOf(targetType) === -1) {
      return error("targetType must be Product, Business, or Property");
    }

    if (!PROMOTION_PRICES[promotionType]) {
      return error("Invalid promotion type. Must be Silver, Gold, or Titanium");
    }

    var radiusPrices = PROMOTION_PRICES[promotionType];
    var basePrice = radiusPrices[radius];
    if (!basePrice) return error("Invalid radius for " + promotionType);

    var multiplier = PROMOTION_DURATION_MULTIPLIER[duration];
    if (!multiplier) return error("Invalid duration");

    var totalCoins = basePrice * multiplier;

    // Verify target exists and belongs to user
    if (targetType === "Product") {
      var product = getRowById("Products", "ProductID", targetId);
      if (!product) return error("Product not found");
      if (String(product.UserID) !== String(userId)) return error("You can only promote your own products");
    } else if (targetType === "Business") {
      var business = getRowById("Businesses", "BusinessID", targetId);
      if (!business) return error("Business not found");
      if (String(business.UserID) !== String(userId)) return error("You can only promote your own businesses");
    } else if (targetType === "Property") {
      var property = getRowById("Properties", "PropertyID", targetId);
      if (!property) return error("Property not found");
      if (String(property.UserID) !== String(userId)) return error("You can only promote your own properties");
    }

    // Atomic transaction
    var result = createPromotionTransaction(userId, promotionType, targetType, targetId, radius, duration, totalCoins);

    return success(result, "Promotion created successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET PROMOTION
 * ============================================================
 */
function getPromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var promotion = getRowById("Promotions", "PromotionID", promotionId);
    if (!promotion) return error("Promotion not found");

    return success(promotion, "Promotion loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET USER PROMOTIONS
 * ============================================================
 */
function getUserPromotions(e) {
  try {
    var userId = e && e.parameter ? e.parameter.userId || "" : "";
    if (!userId) return error("userId required");

    var promotions = getSheetData("Promotions") || [];
    var result = [];

    promotions.forEach(function(p) {
      if (String(p.UserID) === String(userId)) {
        result.push(p);
      }
    });

    result.sort(function(a, b) { return new Date(b.CreatedDate) - new Date(a.CreatedDate); });

    return success({ count: result.length, data: result }, "User promotions loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * STOP PROMOTION
 * ============================================================
 */
function stopPromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var updated = updateRow("Promotions", "PromotionID", promotionId, {
      Status: "Cancelled",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Promotion not found");

    return success({ promotionId: promotionId, status: "Cancelled" }, "Promotion cancelled successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PAUSE PROMOTION
 * ============================================================
 */
function pausePromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var promotion = getRowById("Promotions", "PromotionID", promotionId);
    if (!promotion) return error("Promotion not found");
    if (String(promotion.Status) !== "Active") return error("Only active promotions can be paused");

    var updated = updateRow("Promotions", "PromotionID", promotionId, {
      Status: "Paused",
      UpdatedDate: new Date()
    });

    return success({ promotionId: promotionId, status: "Paused" }, "Promotion paused successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * RESUME PROMOTION
 * ============================================================
 */
function resumePromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var promotion = getRowById("Promotions", "PromotionID", promotionId);
    if (!promotion) return error("Promotion not found");
    if (String(promotion.Status) !== "Paused") return error("Only paused promotions can be resumed");

    var updated = updateRow("Promotions", "PromotionID", promotionId, {
      Status: "Active",
      UpdatedDate: new Date()
    });

    return success({ promotionId: promotionId, status: "Active" }, "Promotion resumed successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * EXPIRE PROMOTION
 * ============================================================
 */
function expirePromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var updated = updateRow("Promotions", "PromotionID", promotionId, {
      Status: "Expired",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Promotion not found");

    return success({ promotionId: promotionId, status: "Expired" }, "Promotion expired successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CANCEL PROMOTION
 * ============================================================
 */
function cancelPromotion(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var updated = updateRow("Promotions", "PromotionID", promotionId, {
      Status: "Cancelled",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Promotion not found");

    return success({ promotionId: promotionId, status: "Cancelled" }, "Promotion cancelled successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET PROMOTION ANALYTICS
 * ============================================================
 */
function getPromotionAnalytics(e) {
  try {
    var promotionId = e && e.parameter ? e.parameter.promotionId || "" : "";
    if (!promotionId) return error("promotionId required");

    var promotion = getRowById("Promotions", "PromotionID", promotionId);
    if (!promotion) return error("Promotion not found");

    var events = getSheetData("AnalyticsEvents") || [];
    var views = 0;
    var clicks = 0;
    var interested = 0;

    events.forEach(function(ev) {
      if (String(ev.EntityID) === String(promotion.TargetID)) {
        var et = String(ev.EventType);
        if (et === "PromotionClick" || et === "ProductView" || et === "StoreView") { clicks++; views++; }
        if (et === "ProductInterested" || et === "PropertyInterested") { interested++; }
      }
    });

    var ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) : 0;

    return success({
      promotionId: promotionId,
      targetType: promotion.TargetType,
      targetId: promotion.TargetID,
      promotionType: promotion.PromotionType,
      views: views,
      clicks: clicks,
      interested: interested,
      ctr: ctr + "%",
      coinsSpent: promotion.CoinsSpent,
      rewardPool: promotion.RewardPool || 0,
      remainingRewardCoins: promotion.RemainingRewardCoins || 0,
      status: promotion.Status,
      startDate: promotion.StartDate,
      endDate: promotion.EndDate
    }, "Promotion analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROCESS PROMOTIONS (Scheduler)
 * Runs every hour via time-driven trigger
 * Responsibilities:
 *   - Activate scheduled promotions
 *   - Expire completed promotions
 *   - Update statuses
 *   - Update analytics
 * ============================================================
 */
function processPromotions() {
  try {
    var sheet = getSheet("Promotions");
    if (!sheet) {
      Logger.log("processPromotions: Promotions sheet not found");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log("processPromotions: No promotions to process");
      return;
    }

    var headers = data[0];
    var statusCol = headers.indexOf("Status");
    var startDateCol = headers.indexOf("StartDate");
    var endDateCol = headers.indexOf("EndDate");
    var updatedDateCol = headers.indexOf("UpdatedDate");

    if (statusCol < 0 || startDateCol < 0 || endDateCol < 0) {
      Logger.log("processPromotions: Required columns not found");
      return;
    }

    var now = new Date();
    var activated = 0;
    var expired = 0;

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][statusCol] || "").toLowerCase();
      var startDate = data[i][startDateCol] ? new Date(data[i][startDateCol]) : null;
      var endDate = data[i][endDateCol] ? new Date(data[i][endDateCol]) : null;

      // Activate scheduled promotions
      if (status === "scheduled" && startDate && startDate <= now) {
        sheet.getRange(i + 1, statusCol + 1).setValue("Active");
        if (updatedDateCol >= 0) {
          sheet.getRange(i + 1, updatedDateCol + 1).setValue(now);
        }
        activated++;
        Logger.log("processPromotions: Activated promotion " + data[i][0]);
      }

      // Expire completed promotions
      if ((status === "active" || status === "scheduled") && endDate && endDate < now) {
        sheet.getRange(i + 1, statusCol + 1).setValue("Expired");
        if (updatedDateCol >= 0) {
          sheet.getRange(i + 1, updatedDateCol + 1).setValue(now);
        }
        expired++;
        Logger.log("processPromotions: Expired promotion " + data[i][0]);
      }
    }

    Logger.log("processPromotions completed: " + activated + " activated, " + expired + " expired");

  } catch (err) {
    Logger.log("processPromotions error: " + err.toString());
  }
}


/**
 * ============================================================
 * MIGRATE PROMOTIONS
 * Add missing columns to existing Promotions sheet
 * ============================================================
 */
function migratePromotions() {
  try {
    var sheet = getSheet("Promotions");
    if (!sheet) {
      Logger.log("Promotions sheet does not exist. Nothing to migrate.");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return;

    var headers = data[0];
    var newHeaders = [
      "PromotionID", "UserID", "PromotionType", "TargetType", "TargetID",
      "Radius", "Duration", "CoinsSpent", "RewardPool", "RemainingRewardCoins",
      "City", "District", "State", "Latitude", "Longitude",
      "Status", "Views", "Clicks", "Interested", "CTR",
      "StartDate", "EndDate", "CreatedDate", "UpdatedDate"
    ];

    var needsMigration = false;
    newHeaders.forEach(function(h) {
      if (headers.indexOf(h) === -1) needsMigration = true;
    });

    if (!needsMigration) {
      Logger.log("Migration not needed: Promotions already has all columns.");
      return;
    }

    // Write new headers
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var newRow = [];

      newHeaders.forEach(function(h, idx) {
        var oldIdx = headers.indexOf(h);
        if (oldIdx >= 0) {
          newRow.push(row[oldIdx]);
        } else {
          // Default values for new columns
          if (h === "RewardPool") newRow.push(Math.floor(Number(row[headers.indexOf("CoinsSpent")] || 0) * 0.7));
          else if (h === "RemainingRewardCoins") newRow.push(Math.floor(Number(row[headers.indexOf("CoinsSpent")] || 0) * 0.7));
          else if (h === "City" || h === "District" || h === "State" || h === "Latitude" || h === "Longitude") newRow.push("");
          else if (h === "UpdatedDate") newRow.push(row[headers.indexOf("CreatedDate")] || new Date());
          else if (h === "Status") newRow.push(row[headers.indexOf("Status")] || "Active");
          else newRow.push("");
        }
      });

      for (var j = 0; j < newRow.length; j++) {
        sheet.getRange(i + 1, j + 1).setValue(newRow[j]);
      }
    }

    Logger.log("Migration completed: Promotions - all columns added. Preserved " + (data.length - 1) + " existing records.");

  } catch (err) {
    Logger.log("migratePromotions error: " + err.toString());
  }
}