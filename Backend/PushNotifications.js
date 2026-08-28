/**
 * ============================================================
 * EKKA1KM BACKEND
 * PushNotifications.js
 * V7.0 - Enterprise Push Notification Engine
 * - Firebase Cloud Messaging (FCM) HTTP/v1 REST
 * - Geospatial Radius & Audience Targeting Engine
 * - Multi-recipient Batch Broadcasting
 * - Scheduled Notification Job Manager
 * - Broadcast Audit Logging & Analytics
 * ============================================================
 */

var PUSH_CONFIG = {
  ENABLED: true,
  PROVIDER: "fcm"
};

function ensurePushSubscriptionsSheet_() {
  var s = getSheet("PushSubscriptions");
  if (!s) {
    s = getSpreadsheet().insertSheet("PushSubscriptions");
    s.appendRow(["SubscriptionID", "UserID", "DeviceID", "Token", "Platform", "Status", "CreatedDate", "UpdatedDate", "LastError"]);
  }
  return s;
}

function ensurePushBroadcastsSheet_() {
  var s = getSheet("PushBroadcasts");
  if (!s) {
    s = getSpreadsheet().insertSheet("PushBroadcasts");
    s.appendRow(["BroadcastID", "AdminID", "Title", "Message", "AudienceType", "Latitude", "Longitude", "RadiusKM", "TargetCount", "SentCount", "FailedCount", "Status", "CreatedAt", "Metadata"]);
  }
  return s;
}

function ensurePushSchedulesSheet_() {
  var s = getSheet("PushSchedules");
  if (!s) {
    s = getSpreadsheet().insertSheet("PushSchedules");
    s.appendRow(["ScheduleID", "AdminID", "Title", "Message", "AudienceType", "ScheduledTime", "Status", "CreatedAt", "PayloadJSON"]);
  }
  return s;
}

/** Haversine formula to compute great-circle distance between two GPS coordinates in kilometers */
function haversineDistanceKM_(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimatePushAudience(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    var p = e.parameter || {};
    var audienceType = String(p.audienceType || "all").toLowerCase().trim();
    var targetLat = parseFloat(p.lat || 0);
    var targetLng = parseFloat(p.lng || 0);
    var radiusKM = parseFloat(p.radius || 51);
    var specificUsers = String(p.specificUsers || "").split(",").map(function(u){ return u.trim(); }).filter(Boolean);

    var sSub = ensurePushSubscriptionsSheet_();
    var subRows = sSub.getDataRange().getValues();
    var activeTokens = [];
    var userIds = {};

    for (var i = 1; i < subRows.length; i++) {
      if (String(subRows[i][5] || "").toLowerCase() === "active") {
        var uid = String(subRows[i][1] || "").trim();
        activeTokens.push({
          userId: uid,
          token: String(subRows[i][3] || "").trim()
        });
        if (uid) userIds[uid] = true;
      }
    }

    var userCoords = {};
    var sUser = getSheet("Users");
    if (sUser) {
      var uRows = sUser.getDataRange().getValues();
      var uHeaders = uRows[0] || [];
      var latCol = uHeaders.indexOf("Latitude");
      var lngCol = uHeaders.indexOf("Longitude");
      var uidCol = uHeaders.indexOf("UserID");

      for (var u = 1; u < uRows.length; u++) {
        var id = String(uRows[u][uidCol] || "").trim();
        if (id && latCol >= 0 && lngCol >= 0) {
          userCoords[id] = {
            lat: parseFloat(uRows[u][latCol]) || 0,
            lng: parseFloat(uRows[u][lngCol]) || 0
          };
        }
      }
    }

    var estimatedCount = 0;
    var eligibleDevices = 0;

    if (audienceType === "all") {
      estimatedCount = Object.keys(userIds).length || activeTokens.length;
      eligibleDevices = activeTokens.length;
    } else if (audienceType === "specific") {
      var set = {};
      specificUsers.forEach(function(u){ set[u] = true; });
      activeTokens.forEach(function(t){
        if (set[t.userId]) {
          eligibleDevices++;
          set[t.userId] = "matched";
        }
      });
      estimatedCount = specificUsers.length;
    } else if (audienceType === "location" || audienceType === "radius") {
      if (radiusKM >= 2500 || String(p.radius || "").toLowerCase() === "all") {
        estimatedCount = Object.keys(userIds).length || activeTokens.length;
        eligibleDevices = activeTokens.length;
      } else {
        var matchedUsers = {};
        activeTokens.forEach(function(t) {
          var c = userCoords[t.userId];
          if (c && c.lat && c.lng && targetLat && targetLng) {
            var dist = haversineDistanceKM_(targetLat, targetLng, c.lat, c.lng);
            if (dist <= radiusKM) {
              eligibleDevices++;
              matchedUsers[t.userId] = true;
            }
          } else {
            if (radiusKM >= 50) {
              eligibleDevices++;
              matchedUsers[t.userId] = true;
            }
          }
        });
        estimatedCount = Object.keys(matchedUsers).length || eligibleDevices;
      }
    } else {
      estimatedCount = Object.keys(userIds).length;
      eligibleDevices = activeTokens.length;
    }

    return success({
      audienceType: audienceType,
      estimatedAudience: Math.max(estimatedCount, eligibleDevices > 0 ? 1 : 0),
      activeDevices: eligibleDevices,
      radiusKM: radiusKM,
      center: { lat: targetLat, lng: targetLng }
    }, "Audience estimated successfully");

  } catch (err) {
    return exception(err);
  }
}

function broadcastPushNotification(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;
    if (!PUSH_CONFIG.ENABLED) return error("Push notifications are disabled in config.");

    var p = e.parameter || {};
    var title = String(p.title || "").trim();
    var message = String(p.message || "").trim();
    var imageUrl = String(p.imageUrl || "").trim();
    var actionUrl = String(p.actionUrl || "").trim();
    var audienceType = String(p.audienceType || "all").toLowerCase().trim();
    var targetLat = parseFloat(p.lat || 0);
    var targetLng = parseFloat(p.lng || 0);
    var radiusKM = parseFloat(p.radius || 51);
    var priority = String(p.priority || "High").trim();
    var specificUser = String(p.userId || p.specificUsers || "").trim();

    if (!title) return error("Title is required");
    if (!message) return error("Message is required");

    var s = ensurePushSubscriptionsSheet_();
    var rows = s.getDataRange().getValues();
    var targetRows = [];

    for (var i = 1; i < rows.length; i++) {
      var status = String(rows[i][5] || "").toLowerCase();
      if (status !== "active") continue;

      var rowUid = String(rows[i][1] || "").trim();
      var token = String(rows[i][3] || "").trim();
      if (!token) continue;

      if (audienceType === "specific" || specificUser) {
        var allowed = specificUser.split(",").map(function(u){ return u.trim(); });
        if (allowed.indexOf(rowUid) === -1) continue;
      }

      targetRows.push({
        rowIndex: i,
        userId: rowUid,
        token: token
      });
    }

    if (targetRows.length === 0) {
      return success({ sent: 0, failed: 0, total: 0 }, "No active devices match the selected audience");
    }

    var sent = 0;
    var failed = 0;
    var lastErrorMsg = "";

    for (var j = 0; j < targetRows.length; j++) {
      var target = targetRows[j];
      var d = sendFcmMessage_(target.token, title, message, imageUrl, actionUrl);

      if (d.ok) {
        sent++;
        s.getRange(target.rowIndex + 1, 8).setValue(new Date());
        s.getRange(target.rowIndex + 1, 9).setValue("");

        // Also record in user's in-app Notifications center
        try {
          var sNotif = getSheet("Notifications");
          if (sNotif) {
            var nId = "NT" + Utilities.getUuid().substring(0, 8);
            sNotif.appendRow([
              nId,
              target.userId,
              title,
              message,
              "SYSTEM_ALERT",
              target.userId,
              radiusKM || "",
              targetLat || "",
              targetLng || "",
              imageUrl || "",
              actionUrl || "",
              "Delivered",
              new Date(),
              "",
              "notifications",
              "#8b5cf6"
            ]);
          }
        } catch (notifErr) {
          Logger.log("In-app notification insert error: " + notifErr);
        }
      } else {
        failed++;
        lastErrorMsg = d.error || "FCM delivery failed";
        s.getRange(target.rowIndex + 1, 8).setValue(new Date());
        s.getRange(target.rowIndex + 1, 9).setValue(lastErrorMsg);
        if (d.stale) {
          s.getRange(target.rowIndex + 1, 6).setValue("Inactive");
        }
      }
    }

    var sBroadcast = ensurePushBroadcastsSheet_();
    var broadcastId = "BC" + Utilities.getUuid().substring(0, 8);
    sBroadcast.appendRow([
      broadcastId,
      admin.adminId || "ADMIN",
      title,
      message,
      audienceType,
      targetLat,
      targetLng,
      radiusKM,
      targetRows.length,
      sent,
      failed,
      sent > 0 ? "Delivered" : "Failed",
      new Date(),
      JSON.stringify({ priority: priority, actionUrl: actionUrl, imageUrl: imageUrl, lastError: lastErrorMsg })
    ]);

    return success({
      broadcastId: broadcastId,
      sent: sent,
      failed: failed,
      total: targetRows.length,
      lastError: lastErrorMsg
    }, sent > 0 ? "Push broadcast completed" : ("FCM delivery failed: " + lastErrorMsg));

  } catch (err) {
    return exception(err);
  }
}

function schedulePushNotification(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    var p = e.parameter || {};
    var scheduledTime = p.scheduledTime || "";
    if (!scheduledTime) return error("scheduledTime is required");

    var sSchedule = ensurePushSchedulesSheet_();
    var scheduleId = "SCH" + Utilities.getUuid().substring(0, 8);

    sSchedule.appendRow([
      scheduleId,
      admin.adminId || "ADMIN",
      String(p.title || "").trim(),
      String(p.message || "").trim(),
      String(p.audienceType || "all").trim(),
      new Date(scheduledTime),
      "Pending",
      new Date(),
      JSON.stringify(p)
    ]);

    return success({
      scheduleId: scheduleId,
      scheduledTime: scheduledTime
    }, "Notification scheduled successfully");

  } catch (err) {
    return exception(err);
  }
}

function getPushBroadcastHistory(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    var s = ensurePushBroadcastsSheet_();
    var data = s.getDataRange().getValues();
    var out = [];

    if (data.length > 1) {
      var headers = data[0];
      for (var i = data.length - 1; i >= 1; i--) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = data[i][j];
        }
        out.push(row);
        if (out.length >= 50) break;
      }
    }

    return success({ count: out.length, data: out }, "Broadcast history loaded");
  } catch (err) {
    return exception(err);
  }
}

function subscribeToPush(e) {
  try {
    var p = e.parameter || {};
    var userId = "";
    var a = requireAuthenticatedUser(e);
    if (a.valid) {
      userId = a.userId;
    } else if (p.userId && /^U\d+/i.test(String(p.userId).trim())) {
      userId = String(p.userId).trim();
    } else {
      return a.response;
    }

    var token = String(p.token || "").trim();
    var deviceId = String(p.deviceId || "").trim();

    if (!token || !deviceId) return error("token and deviceId are required");

    var s = ensurePushSubscriptionsSheet_();
    var rows = s.getDataRange().getValues();
    var deviceRow = -1;
    var now = new Date();

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][3] || "").trim() === token) {
        if (String(rows[i][1] || "") !== userId) return error("Forbidden: token belongs to another user");
        s.getRange(i + 1, 5, 1, 5).setValues([["android", "Active", rows[i][6], now, ""]]);
        return success({ subscriptionId: rows[i][0] }, "Push subscription refreshed");
      }
      if (String(rows[i][1] || "") === userId && String(rows[i][2] || "") === deviceId) {
        deviceRow = i;
      }
    }

    if (deviceRow >= 0) {
      s.getRange(deviceRow + 1, 4, 1, 6).setValues([[token, "android", "Active", rows[deviceRow][6], now, ""]]);
      return success({ subscriptionId: rows[deviceRow][0] }, "Push token updated");
    }

    var id = "PS" + Utilities.getUuid().substring(0, 8);
    s.appendRow([id, userId, deviceId, token, "android", "Active", now, now, ""]);
    return success({ subscriptionId: id }, "Subscribed successfully");

  } catch (err) {
    return exception(err);
  }
}

function unsubscribeFromPush(e) {
  try {
    var a = requireAuthenticatedUser(e);
    if (!a.valid) return a.response;
    var token = String((e.parameter || {}).token || "").trim();
    if (!token) return error("token is required");

    var s = getSheet("PushSubscriptions");
    if (!s) return error("Subscription not found");
    var rows = s.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][3] || "").trim() === token) {
        if (String(rows[i][1] || "") !== a.userId) return error("Forbidden");
        s.getRange(i + 1, 6).setValue("Inactive");
        s.getRange(i + 1, 8).setValue(new Date());
        return success({}, "Unsubscribed successfully");
      }
    }
    return error("Subscription not found");
  } catch (err) {
    return exception(err);
  }
}

function unsubscribePushForSession(e) {
  var a = requireUserSession(e);
  if (!a.valid) return;
  var token = String((e.parameter || {}).pushToken || "").trim();
  var s = getSheet("PushSubscriptions");
  if (!token || !s) return;
  var rows = s.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][3] || "") === token && String(rows[i][1] || "") === a.userId) {
      s.getRange(i + 1, 6).setValue("Inactive");
      s.getRange(i + 1, 8).setValue(new Date());
      return;
    }
  }
}

function getPushSubscription(e) {
  try {
    var a = requireAuthenticatedUser(e);
    if (!a.valid) return a.response;
    var s = getSheet("PushSubscriptions");
    if (!s) return success({ count: 0, data: [] }, "No subscriptions");
    var rows = s.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || "") === a.userId) {
        out.push({
          subscriptionId: rows[i][0],
          deviceId: rows[i][2],
          platform: rows[i][4],
          status: rows[i][5],
          updatedDate: rows[i][7]
        });
      }
    }
    return success({ count: out.length, data: out }, "Subscriptions loaded");
  } catch (err) {
    return exception(err);
  }
}

function sendPushNotification(e) {
  return broadcastPushNotification(e);
}

function sendFcmMessage_(token, title, message, imageUrl, actionUrl) {
  try {
    var c = getFcmServiceAccount_();
    var access = getFcmAccessToken_(c);
    var payload = {
      message: {
        token: token,
        notification: {
          title: title,
          body: message
        },
        data: {
          title: title,
          body: message,
          message: message,
          actionUrl: actionUrl || "",
          imageUrl: imageUrl || ""
        },
        android: {
          priority: "HIGH",
          notification: {
            image: imageUrl || "",
            sound: "default",
            default_sound: true,
            default_vibrate_timings: true,
            notification_priority: "PRIORITY_HIGH",
            visibility: "PUBLIC"
          }
        }
      }
    };

    var r = UrlFetchApp.fetch("https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(c.project_id) + "/messages:send", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + access }
    });

    var code = r.getResponseCode();
    var body = r.getContentText();

    if (code >= 200 && code < 300) return { ok: true };
    return { ok: false, stale: /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(body), error: "FCM HTTP " + code + ": " + (body.length > 200 ? body.substring(0, 200) : body) };
  } catch (err) {
    return { ok: false, stale: false, error: String(err.message || err) };
  }
}

function getFcmServiceAccount_() {
  var raw = PropertiesService.getScriptProperties().getProperty("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON Script Property is not configured");
  var c = JSON.parse(raw);
  if (!c.project_id || !c.client_email || !c.private_key) throw new Error("FCM service account configuration is incomplete");
  return c;
}

function getFcmAccessToken_(c) {
  var now = Math.floor(Date.now() / 1000);
  var enc = function(v) { return Utilities.base64EncodeWebSafe(typeof v === "string" ? v : JSON.stringify(v)).replace(/=+$/, ""); };
  var h = enc({ alg: "RS256", typ: "JWT" });
  var claims = enc({
    iss: c.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  });
  var signature = Utilities.computeRsaSha256Signature(h + "." + claims, c.private_key);
  var assertion = h + "." + claims + "." + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "");

  var r = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion
    },
    muteHttpExceptions: true
  });

  if (r.getResponseCode() !== 200) throw new Error("Unable to obtain FCM access token");
  return JSON.parse(r.getContentText()).access_token;
}

function setFcmServiceAccount(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;
    var p = e.parameter || {};
    var raw = (e.postData && e.postData.contents) || p.serviceAccountJson || p.json;
    if (!raw) return error("serviceAccountJson is required");
    var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && parsed.serviceAccountJson) {
      parsed = typeof parsed.serviceAccountJson === "string" ? JSON.parse(parsed.serviceAccountJson) : parsed.serviceAccountJson;
    }
    if (!parsed || !parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return error("Invalid service account JSON. Must contain project_id, client_email, and private_key.");
    }
    PropertiesService.getScriptProperties().setProperty("FCM_SERVICE_ACCOUNT_JSON", JSON.stringify(parsed));
    return success({ project_id: parsed.project_id, client_email: parsed.client_email }, "FCM service account configured successfully");
  } catch (err) {
    return exception(err);
  }
}

function getFcmStatus(e) {
  try {
    var admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;
    var raw = PropertiesService.getScriptProperties().getProperty("FCM_SERVICE_ACCOUNT_JSON");
    if (!raw) return success({ configured: false }, "FCM service account not configured");
    var parsed = JSON.parse(raw);
    return success({
      configured: true,
      project_id: parsed.project_id,
      client_email: parsed.client_email
    }, "FCM configured");
  } catch (err) {
    return exception(err);
  }
}


