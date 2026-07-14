/**
 * ============================================================
 * EKKA1KM BACKEND
 * PushNotifications.js
 * V6.0 - Push Notification Architecture
 * Architecture Only - No Firebase/OneSignal/FCM integration
 * 
 * READY FOR PRODUCTION:
 * 1. Set PUSH_ENABLED = true
 * 2. Configure provider (Firebase/OneSignal)
 * 3. Implement sendToProvider()
 * ============================================================
 */


/**
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

var PUSH_CONFIG = {
  ENABLED: false,
  PROVIDER: "firebase", // firebase, onesignal, fcm
  FIREBASE_SERVER_KEY: "",
  ONESIGNAL_APP_ID: "",
  ONESIGNAL_REST_KEY: ""
};


/**
 * ============================================================
 * SUBSCRIBE TO PUSH
 * ?action=subscribetopush
 *  &userId=U001
 *  &deviceId=xxx
 *  &token=yyy
 *  &platform=android|ios|web
 * ============================================================
 */

function subscribeToPush(e) {
  try {
    var p = e.parameter;
    var userId = p.userId || "";
    var deviceId = p.deviceId || "";
    var token = p.token || "";
    var platform = p.platform || "web";

    if (!userId || !token) {
      return error("userId and token are required");
    }

    var sheet = getSheet("PushSubscriptions");

    if (!sheet) {
      var ss = getSpreadsheet();
      sheet = ss.insertSheet("PushSubscriptions");
      sheet.appendRow([
        "SubscriptionID",
        "UserID",
        "DeviceID",
        "Token",
        "Platform",
        "Status",
        "CreatedDate"
      ]);
    }

    var existingData = sheet.getDataRange().getValues();

    // Check if already subscribed with same token
    for (var i = 1; i < existingData.length; i++) {
      if (String(existingData[i][3]).trim() === String(token).trim()) {
        // Update user ID if changed
        sheet.getRange(i + 1, 2).setValue(userId);
        return success({}, "Already subscribed");
      }
    }

    var subId = "PS" + Utilities.getUuid().substring(0, 8);

    sheet.appendRow([
      subId,
      userId,
      deviceId,
      token,
      platform,
      "Active",
      new Date()
    ]);

    return success({
      subscriptionId: subId
    }, "Subscribed successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UNSUBSCRIBE FROM PUSH
 * ?action=unsubscribefrompush
 *  &userId=U001
 *  &token=yyy
 * ============================================================
 */

function unsubscribeFromPush(e) {
  try {
    var userId = e.parameter.userId || "";
    var token = e.parameter.token || "";

    if (!token) {
      return error("token is required");
    }

    var sheet = getSheet("PushSubscriptions");

    if (!sheet) {
      return error("No subscriptions found");
    }

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][3]).trim() === String(token).trim()) {
        // Soft delete - mark as inactive
        var statusCol = 6; // Status column index (0-based)
        var lastCol = data[i].length;
        sheet.getRange(i + 1, statusCol + 1).setValue("Inactive");
        return success({}, "Unsubscribed successfully");
      }
    }

    return error("Subscription not found");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SEND PUSH NOTIFICATION
 * ?action=sendpushnotification
 *  &userId=U001
 *  &title=Hello
 *  &message=World
 *  &imageUrl=
 *  &actionUrl=
 * ============================================================
 */

function sendPushNotification(e) {
  try {
    if (!PUSH_CONFIG.ENABLED) {
      return success({}, "Push notifications are disabled. Enable PUSH_ENABLED in config.");
    }

    var p = e.parameter;
    var targetUserId = p.userId || "";
    var title = p.title || "";
    var message = p.message || "";

    if (!title) {
      return error("Title is required");
    }

    // Get user's push tokens
    var sheet = getSheet("PushSubscriptions");
    if (!sheet) {
      return error("No push subscriptions found");
    }

    var data = sheet.getDataRange().getValues();
    var tokens = [];

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][5] || "").toLowerCase();

      if (status !== "active") continue;

      // If targeting specific user
      if (targetUserId && String(data[i][1]).trim() !== String(targetUserId).trim()) {
        continue;
      }

      tokens.push({
        token: data[i][3],
        platform: data[i][4]
      });
    }

    if (tokens.length === 0) {
      return success({ sent: 0 }, "No active subscriptions found");
    }

    // Architecture: sendToProvider would be called here
    // For now, return the tokens that would receive notification
    return success({
      sent: tokens.length,
      tokens: tokens.map(function(t) { return { platform: t.platform }; }),
      notification: {
        title: title,
        message: message,
        imageUrl: p.imageUrl || "",
        actionUrl: p.actionUrl || ""
      }
    }, "Push notification prepared for delivery");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET PUSH SUBSCRIPTION
 * ?action=getpushsubscription&userId=U001
 * ============================================================
 */

function getPushSubscription(e) {
  try {
    var userId = e.parameter.userId || "";

    if (!userId) {
      return error("UserID required");
    }

    var sheet = getSheet("PushSubscriptions");

    if (!sheet) {
      return success({
        count: 0,
        data: []
      }, "No subscriptions");
    }

    var values = sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return success({
        count: 0,
        data: []
      }, "No subscriptions");
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][1]).trim() === String(userId).trim()) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        data.push(row);
      }
    }

    return success({
      count: data.length,
      data: data
    }, "Subscriptions loaded");

  } catch (err) {
    return exception(err);
  }
}