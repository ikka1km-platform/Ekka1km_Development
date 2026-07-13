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

    sheet.appendRow([
      id,
      p.userId || "",
      p.title || "",
      p.message || "",
      p.type || "direct",
      p.targetUserId || "",
      p.radiusKm || "",
      p.latitude || "",
      p.longitude || "",
      p.imageUrl || "",
      p.actionUrl || "",
      "Pending",
      new Date(),
      ""
    ]);

    return success(
      {
        notificationId: id
      },
      "Notification created"
    );

  } catch (err) {
    return exception(err);
  }
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

