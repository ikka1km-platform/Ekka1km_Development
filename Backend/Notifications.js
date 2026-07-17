/**
 * ============================================================
 * EKKA1KM BACKEND
 * Notifications.js
 * V5.8.2 Final
 * Push Notification & Remote Messaging System
 * ============================================================
 */

function getNotifications(e) {
  try {
    return success(
      getSheetData("Notifications")
    );
  } catch (err) {
    return exception(err);
  }
}


function getNotification(e) {
  try {
    const id =
      e.parameter.notificationId || "";

    const row = getRowById(
      "Notifications",
      "NotificationID",
      id
    );

    if (!row) {
      return error(
        "Notification not found"
      );
    }

    return success(row);

  } catch (err) {
    return exception(err);
  }
}


function createNotification(e) {
  try {
    const p = e.parameter;

    const sheet =
      getSheet("Notifications");

    const id =
      "NT" +
      Utilities.getUuid()
        .substring(0, 8);

    // Supported types with icons and colors
    var type = p.type || "SYSTEM_ALERT";

    // Seller Self-Interaction Protection
    if (type === "PRODUCT_INTERESTED" || type === "BUSINESS_ENQUIRY") {
      var targetUserId = p.targetUserId || "";
      var userId = p.userId || "";
      if (userId && targetUserId && String(userId) === String(targetUserId)) {
        return error("You cannot interact with your own product.");
      }
    }

    var icon = getNotificationIcon(type);
    var color = getNotificationColor(type);

    sheet.appendRow([
      id,
      p.userId || "",
      p.title || "",
      p.message || "",
      type,
      p.targetUserId || "",
      p.radiusKm || "",
      p.latitude || "",
      p.longitude || "",
      p.imageUrl || "",
      p.actionUrl || "",
      "Pending",
      new Date(),
      "",
      icon,
      color
    ]);

    return success(
      {
        notificationId: id,
        type: type,
        icon: icon,
        color: color
      },
      "Notification created"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET NOTIFICATION ICON BY TYPE
 * ============================================================
 */
function getNotificationIcon(type) {
  var icons = {
    "PRODUCT_INTERESTED": "shopping_bag",
    "SELLER_RESPONSE": "chat",
    "PROMOTION_FINISHED": "trending_up",
    "ADMIN_MESSAGE": "admin_panel_settings",
    "VERIFICATION_STATUS": "verified",
    "NEWS_APPROVAL": "newspaper",
    "SERVICE_ENQUIRY": "support",
    "STORE_FOLLOW": "star",
    "STORE_PRODUCT": "store",
    "NEWS_ALERT": "notifications_active",
    "SYSTEM_ALERT": "info",
    "direct": "notifications",
    "broadcast": "campaign"
  };
  return icons[type] || "notifications";
}


/**
 * ============================================================
 * GET NOTIFICATION COLOR BY TYPE
 * ============================================================
 */
function getNotificationColor(type) {
  var colors = {
    "PRODUCT_INTERESTED": "#0f9d58",
    "SELLER_RESPONSE": "#1976d2",
    "PROMOTION_FINISHED": "#e65100",
    "ADMIN_MESSAGE": "#d32f2f",
    "VERIFICATION_STATUS": "#0f9d58",
    "NEWS_APPROVAL": "#0f9d58",
    "SERVICE_ENQUIRY": "#7b1fa2",
    "STORE_FOLLOW": "#f57c00",
    "STORE_PRODUCT": "#0f9d58",
    "NEWS_ALERT": "#d32f2f",
    "SYSTEM_ALERT": "#555",
    "direct": "#1976d2",
    "broadcast": "#d32f2f"
  };
  return colors[type] || "#555";
}


function markNotificationRead(e) {
  try {
    const id =
      e.parameter.notificationId || "";

    const updated =
      updateRow(
        "Notifications",
        "NotificationID",
        id,
        {
          Status: "Read",
          SentAt: new Date()
        }
      );

    if (!updated) {
      return error(
        "Notification not found"
      );
    }

    return success(
      {},
      "Notification marked read"
    );

  } catch (err) {
    return exception(err);
  }
}


function getUnreadNotifications(e) {
  try {
    const userId =
      e.parameter.userId || "";

    const list =
      getSheetData("Notifications");

    const result = [];

    list.forEach(function (n) {

      const status =
        String(n.Status || "")
          .toLowerCase();

      if (
        String(n.UserID) ===
          String(userId) &&
        status !== "read"
      ) {
        result.push(n);
      }
    });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}


function broadcastNotification(e) {
  try {
    const users =
      getSheetData("Users");

    const p =
      e.parameter;

    const sheet =
      getSheet("Notifications");

    users.forEach(function (u) {

      sheet.appendRow([
        "NT" +
          Utilities.getUuid()
            .substring(0, 8),
        u.UserID || "",
        p.title || "",
        p.message || "",
        "broadcast",
        "",
        "",
        "",
        "",
        p.imageUrl || "",
        p.actionUrl || "",
        "Pending",
        new Date(),
        ""
      ]);

    });

    return success(
      {},
      "Broadcast completed"
    );

  } catch (err) {
    return exception(err);
  }
}


function getPendingNotifications(e) {
  try {
    const list =
      getSheetData("Notifications");

    const result = [];

    list.forEach(function (n) {

      const status =
        String(n.Status || "")
          .toLowerCase();

      if (
        status === "pending"
      ) {
        result.push(n);
      }
    });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}


function markNotificationSent(e) {
  try {
    const id =
      e.parameter.notificationId || "";

    const updated =
      updateRow(
        "Notifications",
        "NotificationID",
        id,
        {
          Status: "Sent",
          SentAt: new Date()
        }
      );

    if (!updated) {
      return error(
        "Notification not found"
      );
    }

    return success(
      {},
      "Notification marked sent"
    );

  } catch (err) {
    return exception(err);
  }
}

