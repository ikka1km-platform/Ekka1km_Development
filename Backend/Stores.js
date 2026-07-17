/**
 * ============================================================
 * EKKA1KM BACKEND
 * Stores.js
 * Phase 3.5 - Store System
 * V2.0 - Soft delete, Status column, logging, migration
 * ============================================================
 */


/**
 * ============================================================
 * ENSURE BUSINESS FOLLOWERS SHEET EXISTS
 * ============================================================
 */
function ensureBusinessFollowersSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("BusinessFollowers");
  if (!sheet) {
    sheet = ss.insertSheet("BusinessFollowers");
    sheet.appendRow(["FollowID", "UserID", "BusinessID", "Status", "CreatedDate", "UpdatedDate"]);
    Logger.log("Sheet created: BusinessFollowers with headers: FollowID, UserID, BusinessID, Status, CreatedDate, UpdatedDate");
  }
  return sheet;
}


/**
 * ============================================================
 * GET STORE
 * ?action=getstore&businessId=B001
 * ============================================================
 */
function getStore(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";

    if (!businessId) {
      return error("businessId required");
    }

    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business) {
      return error("Business not found");
    }

    var owner = getRowById("Users", "UserID", business.UserID);

    // Count only Active followers
    var followers = getSheetData("BusinessFollowers") || [];
    var followerCount = 0;
    followers.forEach(function(f) {
      if (String(f.BusinessID) === String(businessId) && String(f.Status || "Active") === "Active") {
        followerCount++;
      }
    });

    var products = getSheetData("Products");
    var productsCount = 0;
    products.forEach(function(p) {
      if (String(p.UserID) === String(business.UserID)) {
        productsCount++;
      }
    });

    var userId = e.parameter.userId || "";
    var isFollowing = false;
    if (userId) {
      followers.forEach(function(f) {
        if (String(f.UserID) === String(userId) && String(f.BusinessID) === String(businessId) && String(f.Status || "Active") === "Active") {
          isFollowing = true;
        }
      });
    }

    return success({
      business: business,
      owner: owner ? {
        userId: owner.UserID,
        name: owner.FullName || owner.Name || "",
        profilePhoto: owner.ProfilePhoto || owner.profilePhoto || "",
        mobile: owner.Mobile || owner.Phone || ""
      } : null,
      followerCount: followerCount,
      productsCount: productsCount,
      isFollowing: isFollowing,
      verificationBadge: business.Status === "Active" || business.Status === "Verified"
    }, "Store Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET STORE PRODUCTS
 * ============================================================
 */
function getStoreProducts(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";
    if (!businessId) return error("businessId required");

    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business) return error("Business not found");

    var ownerUserId = business.UserID;
    var allProducts = getSheetData("Products");
    var storeProducts = [];

    allProducts.forEach(function(p) {
      if (String(p.UserID) === String(ownerUserId)) {
        storeProducts.push(p);
      }
    });

    return success({ count: storeProducts.length, data: storeProducts }, "Store products loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET STORE ANALYTICS
 * ============================================================
 */
function getStoreAnalytics(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";
    if (!businessId) return error("businessId required");

    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business) return error("Business not found");

    var ownerUserId = business.UserID;

    // Only Active followers
    var followers = getSheetData("BusinessFollowers") || [];
    var followerCount = 0;
    followers.forEach(function(f) {
      if (String(f.BusinessID) === String(businessId) && String(f.Status || "Active") === "Active") {
        followerCount++;
      }
    });

    // Count events
    var events = getSheetData("AnalyticsEvents") || [];
    var totalViews = 0;
    var totalInterested = 0;
    var totalShares = 0;
    var totalFollows = 0;

    events.forEach(function(ev) {
      if (String(ev.EntityID) === String(businessId)) {
        var et = String(ev.EventType);
        if (et === "BusinessView" || et === "StoreView") totalViews++;
        if (et === "ProductInterested" || et === "PropertyInterested") totalInterested++;
        if (et === "Share" || et === "StoreShare") totalShares++;
        if (et === "StoreFollow") totalFollows++;
      }
    });

    var products = getSheetData("Products");
    var productsCount = 0;
    products.forEach(function(p) {
      if (String(p.UserID) === String(ownerUserId)) productsCount++;
    });

    return success({
      followerCount: followerCount,
      totalViews: totalViews,
      totalInterested: totalInterested,
      totalShares: totalShares,
      totalFollows: totalFollows,
      productsCount: productsCount
    }, "Store analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * FOLLOW STORE
 * Soft delete support - reactivates if previously unfollowed
 * ============================================================
 */
function followStore(e) {
  try {
    var userId = e && e.parameter ? e.parameter.userId || "" : "";
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";

    if (!userId || !businessId) return error("userId and businessId required");

    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business) return error("Business not found");

    // Seller cannot follow own store
    if (String(business.UserID) === String(userId)) {
      return error("You cannot follow your own store.");
    }

    ensureBusinessFollowersSheet();

    var followers = getSheetData("BusinessFollowers") || [];
    var existingRow = -1;
    var sheet = getSheet("BusinessFollowers");
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && String(data[i][2]) === String(businessId)) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > 0) {
      // Reactivate if unfollowed
      sheet.getRange(existingRow, 4).setValue("Active");
      sheet.getRange(existingRow, 6).setValue(new Date());
    } else {
      var followId = "FL" + Utilities.getUuid().substring(0, 8);
      sheet.appendRow([followId, userId, businessId, "Active", new Date(), new Date()]);
    }

    // Notification
    if (business.UserID && String(business.UserID) !== String(userId)) {
      try {
        createNotification({
          parameter: {
            userId: business.UserID,
            title: "New Follower",
            message: "Someone started following your store.",
            type: "STORE_FOLLOW",
            targetUserId: userId
          }
        });
      } catch (nf) { Logger.log("Follow notification error: " + nf); }
    }

    // Track StoreFollow event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "StoreFollow", userId: userId, entityType: "Business", entityId: businessId }
        });
      }
    } catch (te) { Logger.log("Follow track error: " + te); }

    invalidateDashboardCache(userId);

    return success({ isFollowing: true }, "Store followed successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UNFOLLOW STORE (Soft delete)
 * ============================================================
 */
function unfollowStore(e) {
  try {
    var userId = e && e.parameter ? e.parameter.userId || "" : "";
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";

    if (!userId || !businessId) return error("userId and businessId required");

    var sheet = getSheet("BusinessFollowers");
    if (!sheet) return error("Not following this store");

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && String(data[i][2]) === String(businessId)) {
        // Soft delete
        sheet.getRange(i + 1, 4).setValue("Unfollowed");
        sheet.getRange(i + 1, 6).setValue(new Date());

        // Track StoreUnfollow
        try {
          if (typeof trackEvent === "function") {
            trackEvent({
              parameter: { eventType: "StoreUnfollow", userId: userId, entityType: "Business", entityId: businessId }
            });
          }
        } catch (te) { Logger.log("Unfollow track error: " + te); }

        invalidateDashboardCache(userId);

        return success({ isFollowing: false }, "Store unfollowed successfully");
      }
    }

    return error("Not following this store");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET STORE FOLLOWERS (Only Active)
 * ============================================================
 */
function getStoreFollowers(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";
    if (!businessId) return error("businessId required");

    var followers = getSheetData("BusinessFollowers") || [];
    var result = [];

    followers.forEach(function(f) {
      if (String(f.BusinessID) === String(businessId) && String(f.Status || "Active") === "Active") {
        var user = getRowById("Users", "UserID", f.UserID);
        result.push({
          followId: f.FollowID,
          userId: f.UserID,
          userName: user ? (user.FullName || user.Name || "") : "",
          profilePhoto: user ? (user.ProfilePhoto || user.profilePhoto || "") : "",
          date: f.CreatedDate
        });
      }
    });

    return success({ count: result.length, data: result }, "Store followers loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SEARCH STORES
 * ============================================================
 */
function searchStores(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var query = (p.query || "").toLowerCase().trim();
    var lat = p.lat || "";
    var lng = p.lng || "";
    var radius = p.radius || "";

    var businesses = getSheetData("Businesses");
    var result = [];

    businesses.forEach(function(b) {
      var match = true;

      if (query) {
        match = String(b.Title || "").toLowerCase().indexOf(query) !== -1 ||
                String(b.Category || "").toLowerCase().indexOf(query) !== -1 ||
                String(b.Description || "").toLowerCase().indexOf(query) !== -1 ||
                String(b.City || "").toLowerCase().indexOf(query) !== -1 ||
                String(b.Address || "").toLowerCase().indexOf(query) !== -1;
      }

      if (!match) return;
      result.push(b);
    });

    if (lat && lng && radius && typeof filterByRadius === "function") {
      result = filterByRadius(result, lat, lng, radius);
    }

    return success({ count: result.length, data: result }, "Stores loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SHARE STORE
 * ============================================================
 */
function shareStore(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";
    var userId = e && e.parameter ? e.parameter.userId || "" : "";

    if (!businessId) return error("businessId required");

    if (typeof trackEvent === "function" && userId) {
      trackEvent({
        parameter: { eventType: "StoreShare", userId: userId, entityType: "Business", entityId: businessId }
      });
    }

    return success({ shared: true }, "Store shared");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * MIGRATE BUSINESS FOLLOWERS
 * Add Status and UpdatedDate columns if missing
 * ============================================================
 */
function migrateBusinessFollowers() {
  try {
    var sheet = getSheet("BusinessFollowers");
    if (!sheet) {
      Logger.log("BusinessFollowers sheet does not exist. Nothing to migrate.");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return;

    var headers = data[0];
    var needsStatus = headers.indexOf("Status") === -1;
    var needsUpdatedDate = headers.indexOf("UpdatedDate") === -1;

    if (needsStatus || needsUpdatedDate) {
      // Rebuild header
      var newHeaders = ["FollowID", "UserID", "BusinessID", "Status", "CreatedDate", "UpdatedDate"];
      sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = row[3] !== undefined && row[3] !== "" ? row[3] : "Active";
        var updatedDate = row[5] !== undefined && row[5] !== "" ? row[5] : (row[4] || new Date());
        
        sheet.getRange(i + 1, 1).setValue(row[0] || ("FL" + Utilities.getUuid().substring(0, 8)));
        sheet.getRange(i + 1, 2).setValue(row[1] || "");
        sheet.getRange(i + 1, 3).setValue(row[2] || "");
        sheet.getRange(i + 1, 4).setValue(status);
        sheet.getRange(i + 1, 5).setValue(row[4] || new Date());
        sheet.getRange(i + 1, 6).setValue(updatedDate);
      }

      Logger.log("Migration completed: BusinessFollowers - Status and UpdatedDate columns added.");
    } else {
      Logger.log("Migration not needed: BusinessFollowers already has Status and UpdatedDate.");
    }
  } catch (err) {
    Logger.log("migrateBusinessFollowers error: " + err.toString());
  }
}