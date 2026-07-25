/**
 * ============================================================
 * EKKA1KM BACKEND
 * Moderation.js
 * Phase 4.7 - Moderation Queue
 * Foundation for content moderation
 * ============================================================
 */

/**
 * ============================================================
 * ENSURE MODERATION QUEUE SHEET EXISTS
 * ============================================================
 */
function ensureModerationQueueSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("ModerationQueue");
  if (!sheet) {
    sheet = ss.insertSheet("ModerationQueue");
    sheet.appendRow(["QueueID", "ContentType", "ContentID", "UserID", "Reason", "Status", "CreatedDate"]);
    Logger.log("Sheet created: ModerationQueue with headers: QueueID, ContentType, ContentID, UserID, Reason, Status, CreatedDate");
  }
  return sheet;
}

/**
 * ============================================================
 * SUBMIT MODERATION
 * ?action=submitmoderation&contentType=Product&contentId=P001&userId=U001&reason=Spam
 * ============================================================
 */
function submitModeration(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var contentType = p.contentType || "";
    var contentId = p.contentId || "";
    var userId = p.userId || "";
    var reason = p.reason || "";

    if (!contentType || !contentId || !userId) {
      return error("contentType, contentId, and userId required");
    }

    ensureModerationQueueSheet();

    var sheet = getSheet("ModerationQueue");
    var queueId = "MQ" + Utilities.getUuid().substring(0, 8);

    sheet.appendRow([queueId, contentType, contentId, userId, reason, "Pending", new Date()]);

    return success({ queueId: queueId }, "Moderation submitted successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET MODERATION QUEUE
 * ?action=getmoderationqueue&status=Pending
 * ============================================================
 */
function getModerationQueue(e) {
  try {
    var status = e && e.parameter ? e.parameter.status || "" : "";

    var queue = getSheetData("ModerationQueue") || [];
    var result = [];

    queue.forEach(function(item) {
      if (status && String(item.Status) !== status) return;
      result.push(item);
    });

    result.sort(function(a, b) { return new Date(b.CreatedDate) - new Date(a.CreatedDate); });

    return success({ count: result.length, data: result }, "Moderation queue loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE MODERATION STATUS
 * ?action=updatemoderation&queueId=MQ001&status=Approved
 * ============================================================
 */
function updateModeration(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var queueId = p.queueId || "";
    var status = p.status || "";

    if (!queueId || !status) {
      return error("queueId and status required");
    }

    if (["Pending", "Approved", "Rejected", "Flagged"].indexOf(status) === -1) {
      return error("Invalid status. Must be Pending, Approved, Rejected, or Flagged");
    }

    var updated = updateRow("ModerationQueue", "QueueID", queueId, {
      Status: status
    });

    if (!updated) return error("Moderation item not found");

    // ============================================================
    // MODERATION CASCADE: If approving an Announcement, update its
    // Status to Active in the Announcements sheet
    // ============================================================
    if (status === "Approved") {
      // Get the moderation item to find the contentId and contentType
      var queueData = getSheetData("ModerationQueue") || [];
      var queueItem = null;
      for (var qi = 0; qi < queueData.length; qi++) {
        if (String(queueData[qi].QueueID) === String(queueId)) {
          queueItem = queueData[qi];
          break;
        }
      }
      
      if (queueItem && String(queueItem.ContentType || "").toLowerCase() === "announcement") {
        var contentId = queueItem.ContentID || "";
        if (contentId) {
          var annUpdated = updateRow("Announcements", "AnnouncementID", contentId, {
            Status: "Active",
            UpdatedDate: new Date()
          });
          
          if (!annUpdated) {
            // CRITICAL: Cascade failed - revert moderation status and report error
            updateRow("ModerationQueue", "QueueID", queueId, {
              Status: "Pending"
            });
            return error("Failed to activate Announcement " + contentId + ". Moderation status reverted.");
          }
          
          Logger.log("Moderation cascade: Announcement " + contentId + " set to Active");
        }
      }
    }

    return success({ queueId: queueId, status: status }, "Moderation updated successfully");

  } catch (err) {
    return exception(err);
  }
}
