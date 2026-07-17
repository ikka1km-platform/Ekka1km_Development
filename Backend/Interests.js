/**
 * ============================================================
 * EKKA1KM BACKEND
 * Interests.js
 * Phase 3.6 - Interest System
 * V2.0 - Soft delete, Status column, PropertyInterested event, migration
 * ============================================================
 */


/**
 * ============================================================
 * ENSURE USER INTERESTS SHEET EXISTS
 * ============================================================
 */
function ensureUserInterestsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("UserInterests");
  if (!sheet) {
    sheet = ss.insertSheet("UserInterests");
    sheet.appendRow(["InterestID", "UserID", "TargetType", "TargetID", "OwnerUserID", "Status", "CreatedDate", "UpdatedDate"]);
    Logger.log("Sheet created: UserInterests with headers: InterestID, UserID, TargetType, TargetID, OwnerUserID, Status, CreatedDate, UpdatedDate");
  }
  return sheet;
}


/**
 * ============================================================
 * MARK INTERESTED
 * ?action=markinterested&userId=U001&targetType=Product&targetId=P001
 * Supports: Product, Property
 * ============================================================
 */
function markInterested(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";

    if (!userId || !targetType || !targetId) {
      return error("userId, targetType, and targetId required");
    }

    if (targetType !== "Product" && targetType !== "Property") {
      return error("targetType must be Product or Property");
    }

    // Get owner of the target
    var ownerUserId = "";
    if (targetType === "Product") {
      var product = getRowById("Products", "ProductID", targetId);
      if (!product) return error("Product not found");
      ownerUserId = product.UserID || "";
    } else if (targetType === "Property") {
      var property = getRowById("Properties", "PropertyID", targetId);
      if (!property) return error("Property not found");
      ownerUserId = property.UserID || "";
    }

    // Seller cannot mark own items
    if (ownerUserId && String(userId) === String(ownerUserId)) {
      return error("You cannot mark interest in your own item.");
    }

    ensureUserInterestsSheet();

    // Check for existing interest (including soft-deleted)
    var existing = getSheetData("UserInterests") || [];
    var sheet = getSheet("UserInterests");
    var data = sheet.getDataRange().getValues();
    var existingRow = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && String(data[i][2]) === targetType && String(data[i][3]) === targetId) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > 0) {
      // Reactivate if previously removed
      sheet.getRange(existingRow, 6).setValue("Active");
      sheet.getRange(existingRow, 8).setValue(new Date());
    } else {
      var interestId = "IN" + Utilities.getUuid().substring(0, 8);
      sheet.appendRow([interestId, userId, targetType, targetId, ownerUserId, "Active", new Date(), new Date()]);
    }

    // Notify the owner
    if (ownerUserId) {
      try {
        createNotification({
          parameter: {
            userId: ownerUserId,
            title: "Someone is interested!",
            message: "A user is interested in your " + targetType.toLowerCase() + ".",
            type: "PRODUCT_INTERESTED",
            targetUserId: userId
          }
        });
      } catch (notifErr) {
        Logger.log("Interest notification error: " + notifErr.toString());
      }
    }

    // Track event (ProductInterested or PropertyInterested)
    try {
      if (typeof trackEvent === "function") {
        var eventType = targetType === "Property" ? "PropertyInterested" : "ProductInterested";
        trackEvent({
          parameter: { eventType: eventType, userId: userId, entityType: targetType, entityId: targetId }
        });
      }
    } catch (trackErr) {
      Logger.log("Interest track error: " + trackErr.toString());
    }

    invalidateDashboardCache(userId);

    return success({ isInterested: true }, "Interest marked successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * REMOVE INTEREST (Soft delete)
 * ============================================================
 */
function removeInterest(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";

    if (!userId || !targetType || !targetId) {
      return error("userId, targetType, and targetId required");
    }

    var sheet = getSheet("UserInterests");
    if (!sheet) return error("No interests found");

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && String(data[i][2]) === targetType && String(data[i][3]) === targetId) {
        // Soft delete
        sheet.getRange(i + 1, 6).setValue("Removed");
        sheet.getRange(i + 1, 8).setValue(new Date());

        invalidateDashboardCache(userId);

        return success({ isInterested: false }, "Interest removed successfully");
      }
    }

    return error("Interest not found");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET MY INTERESTS (Only Active)
 * ============================================================
 */
function getMyInterests(e) {
  try {
    var userId = e && e.parameter ? e.parameter.userId || "" : "";
    if (!userId) return error("userId required");

    var interests = getSheetData("UserInterests") || [];
    var result = [];

    interests.forEach(function(i) {
      if (String(i.UserID) === String(userId) && String(i.Status || "Active") !== "Removed") {
        var targetData = null;
        if (i.TargetType === "Product") {
          targetData = getRowById("Products", "ProductID", i.TargetID);
        } else if (i.TargetType === "Property") {
          targetData = getRowById("Properties", "PropertyID", i.TargetID);
        }

        result.push({
          interestId: i.InterestID,
          targetType: i.TargetType,
          targetId: i.TargetID,
          targetData: targetData,
          date: i.CreatedDate
        });
      }
    });

    result.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    return success({ count: result.length, data: result }, "My interests loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET INTEREST COUNT (Only Active)
 * ============================================================
 */
function getInterestCount(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";

    if (!targetType || !targetId) return error("targetType and targetId required");

    var interests = getSheetData("UserInterests") || [];
    var count = 0;

    interests.forEach(function(i) {
      if (String(i.TargetType) === targetType && String(i.TargetID) === targetId && String(i.Status || "Active") !== "Removed") {
        count++;
      }
    });

    return success({ targetType: targetType, targetId: targetId, count: count }, "Interest count loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET INTERESTED USERS (Only Active)
 * ============================================================
 */
function getInterestedUsers(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";

    if (!targetType || !targetId) return error("targetType and targetId required");

    var interests = getSheetData("UserInterests") || [];
    var result = [];

    interests.forEach(function(i) {
      if (String(i.TargetType) === targetType && String(i.TargetID) === targetId && String(i.Status || "Active") !== "Removed") {
        var user = getRowById("Users", "UserID", i.UserID);
        result.push({
          interestId: i.InterestID,
          userId: i.UserID,
          userName: user ? (user.FullName || user.Name || "") : "",
          profilePhoto: user ? (user.ProfilePhoto || user.profilePhoto || "") : "",
          date: i.CreatedDate
        });
      }
    });

    return success({ count: result.length, data: result }, "Interested users loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * HAS USER INTERESTED
 * ============================================================
 */
function hasUserInterested(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var targetType = p.targetType || "";
    var targetId = p.targetId || "";

    if (!userId || !targetType || !targetId) return error("userId, targetType, and targetId required");

    var interests = getSheetData("UserInterests") || [];
    var isInterested = false;
    var interestId = "";

    interests.forEach(function(i) {
      if (String(i.UserID) === String(userId) && String(i.TargetType) === targetType && String(i.TargetID) === targetId && String(i.Status || "Active") !== "Removed") {
        isInterested = true;
        interestId = i.InterestID;
      }
    });

    return success({ isInterested: isInterested, interestId: interestId }, "Interest status checked");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * MIGRATE USER INTERESTS
 * Add Status, UpdatedDate columns if missing
 * ============================================================
 */
function migrateUserInterests() {
  try {
    var sheet = getSheet("UserInterests");
    if (!sheet) {
      Logger.log("UserInterests sheet does not exist. Nothing to migrate.");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 1) return;

    var headers = data[0];
    var needsStatus = headers.indexOf("Status") === -1;
    var needsUpdatedDate = headers.indexOf("UpdatedDate") === -1;

    if (needsStatus || needsUpdatedDate) {
      var newHeaders = ["InterestID", "UserID", "TargetType", "TargetID", "OwnerUserID", "Status", "CreatedDate", "UpdatedDate"];
      sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = row[5] !== undefined && row[5] !== "" ? row[5] : "Active";
        var updatedDate = row[7] !== undefined && row[7] !== "" ? row[7] : (row[6] || new Date());

        sheet.getRange(i + 1, 1).setValue(row[0] || ("IN" + Utilities.getUuid().substring(0, 8)));
        sheet.getRange(i + 1, 2).setValue(row[1] || "");
        sheet.getRange(i + 1, 3).setValue(row[2] || "");
        sheet.getRange(i + 1, 4).setValue(row[3] || "");
        sheet.getRange(i + 1, 5).setValue(row[4] || "");
        sheet.getRange(i + 1, 6).setValue(status);
        sheet.getRange(i + 1, 7).setValue(row[6] || new Date());
        sheet.getRange(i + 1, 8).setValue(updatedDate);
      }

      Logger.log("Migration completed: UserInterests - Status and UpdatedDate columns added.");
    } else {
      Logger.log("Migration not needed: UserInterests already has Status and UpdatedDate.");
    }
  } catch (err) {
    Logger.log("migrateUserInterests error: " + err.toString());
  }
}