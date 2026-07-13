/**
 * ============================================================
 * EKKA1KM BACKEND
 * LiveNotifications.js
 * V5.6.4
 * ============================================================
 */


/**
 * Notify all subscribers of a live stream
 */
function notifyLiveSubscribers(e) {
  try {
    const liveId = e.parameter.liveId;

    if (!liveId) {
      return error("liveId required");
    }

    const subscribersSheet =
      getSheet(CONFIG.SHEETS.LIVE_SUBSCRIBERS);

    const notificationsSheet =
      getSheet(CONFIG.SHEETS.LIVE_NOTIFICATIONS);

    const liveSheet =
      getSheet(CONFIG.SHEETS.LIVE);

    const subscribers =
      subscribersSheet.getDataRange().getValues();

    const liveData =
      liveSheet.getDataRange().getValues();

    let liveTitle = "Live Stream";

    for (let i = 1; i < liveData.length; i++) {
      if (String(liveData[i][0]) === liveId) {
        liveTitle = liveData[i][1];
        break;
      }
    }

    let count = 0;

    for (let i = 1; i < subscribers.length; i++) {

      if (String(subscribers[i][2]) === liveId) {

        notificationsSheet.appendRow([
          Utilities.getUuid(),
          subscribers[i][1],
          liveId,
          liveTitle,
          liveTitle + " is now LIVE.",
          false,
          new Date()
        ]);

        count++;
      }
    }

    return success({
      notificationsSent: count
    }, "Subscribers notified");

  } catch (err) {
    return exception(err);
  }
}


/**
 * Get notifications of user
 */
function getLiveNotifications(e) {
  try {
    const userId = e.parameter.userId;

    if (!userId) {
      return error("userId required");
    }

    const sheet =
      getSheet(CONFIG.SHEETS.LIVE_NOTIFICATIONS);

    const data =
      sheet.getDataRange().getValues();

    const result = [];

    for (let i = 1; i < data.length; i++) {

      if (String(data[i][1]) === userId) {

        result.push({
          notificationId: data[i][0],
          userId: data[i][1],
          liveId: data[i][2],
          title: data[i][3],
          message: data[i][4],
          isRead: data[i][5],
          createdAt: data[i][6]
        });
      }
    }

    return success(
      result,
      "Notifications loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Mark notification as read
 */
function markLiveNotificationRead(e) {
  try {
    const notificationId =
      e.parameter.notificationId;

    if (!notificationId) {
      return error(
        "notificationId required"
      );
    }

    const sheet =
      getSheet(CONFIG.SHEETS.LIVE_NOTIFICATIONS);

    const data =
      sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][0]) ===
        notificationId
      ) {
        sheet
          .getRange(i + 1, 6)
          .setValue(true);

        break;
      }
    }

    return success(
      {},
      "Notification marked as read"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Get unread count
 */
function getLiveUnreadCount(e) {
  try {
    const userId = e.parameter.userId;

    if (!userId) {
      return error("userId required");
    }

    const sheet =
      getSheet(CONFIG.SHEETS.LIVE_NOTIFICATIONS);

    const data =
      sheet.getDataRange().getValues();

    let count = 0;

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][1]) === userId &&
        data[i][5] !== true
      ) {
        count++;
      }
    }

    return success({
      unreadCount: count
    });

  } catch (err) {
    return exception(err);
  }
}

