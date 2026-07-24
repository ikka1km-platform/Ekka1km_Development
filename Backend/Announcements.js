/**
 * ============================================================
 * EKKA1KM BACKEND
 * Announcements.js
 * V1.1 - Hyperlocal Announcements Module
 * Community notices, public notices, event notices, etc.
 * Follows existing News/Products architecture patterns.
 * 
 * SECURITY:
 * - updateAnnouncement, deleteAnnouncement, restoreAnnouncement
 *   verify stored UserID matches caller-supplied UserID
 * - createAnnouncement auto-submits to ModerationQueue
 * - getAnnouncements filters to Active/Published only
 * ============================================================
 */


/**
 * Get all announcements
 * URL:
 * ?action=announcements
 * ?action=announcements&lat=26.9124&lng=75.7873&radius=51
 * ?action=announcements&userId=U001
 */
function getAnnouncements(e) {
  try {

    let announcements = [];

    const sheet =
      getSheet("Announcements");

    if (!sheet) {
      return success([], "No announcements sheet");
    }

    const data =
      sheet.getDataRange()
        .getValues();

    if (data.length <= 1) {
      return success([], "No announcements found");
    }

    const headers =
      data[0];

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      const row = {};

      headers.forEach(
        function (
          header,
          index
        ) {
          row[header] =
            data[i][index];
        }
      );

      announcements.push(row);
    }

    // Filter by status: only show Active announcements
    announcements = announcements.filter(function(item) {
      var status = String(item.Status || "Active").toLowerCase();
      return status === "active" || status === "published";
    });

    // Filter out expired announcements if EndDate exists
    var now = new Date();
    announcements = announcements.filter(function(item) {
      if (!item.EndDate || String(item.EndDate).trim() === "") return true;
      var endDate = new Date(item.EndDate);
      if (isNaN(endDate.getTime())) return true;
      return endDate >= now;
    });

    const location =
      getLocationContext(e);

    const lat =
      location.lat;

    const lng =
      location.lng;

    const radius =
      location.radius;

    if (
      lat &&
      lng &&
      radius
    ) {
      announcements = filterByRadius(
        announcements,
        lat,
        lng,
        radius
      );
    }

    // Sort by CreatedDate descending (newest first)
    announcements.sort(function(a, b) {
      var dateA = new Date(a.CreatedDate || 0);
      var dateB = new Date(b.CreatedDate || 0);
      return dateB - dateA;
    });

    return success(
      announcements,
      "Announcements loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Get single announcement
 * URL:
 * ?action=announcement&id=A001
 */
function getAnnouncement(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "AnnouncementID required"
      );
    }

    const sheet =
      getSheet("Announcements");

    if (!sheet) {
      return error("Announcements sheet not found");
    }

    const data =
      sheet.getDataRange()
        .getValues();

    const headers =
      data[0];

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(data[i][0]) ===
        String(id)
      ) {

        const announcement =
          {};

        headers.forEach(
          function (
            header,
            index
          ) {
            announcement[header] =
              data[i][index];
          }
        );

        return success(
          announcement,
          "Announcement Loaded"
        );
      }
    }

    return error(
      "Announcement not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Add Announcement (legacy direct add)
 * Used by frontend addannouncement action
 */
function addAnnouncement(e) {
  try {

    const p =
      e.parameter;

    const sheet =
      getSheet("Announcements");

    if (!sheet) {
      return error("Announcements sheet not found");
    }

    const announcementId =
      "A" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      announcementId,
      p.UserID || "",
      p.Title || "",
      p.Description || "",
      p.Category || "General",
      p.Image || "",
      p.Address || "",
      p.City || "",
      p.District || "",
      p.State || "",
      p.Country || "India",
      p.Latitude || "",
      p.Longitude || "",
      p.StartDate || "",
      p.EndDate || "",
      p.Priority || "Normal",
      "Pending",
      new Date(),
      new Date()
    ]);

    // Submit to ModerationQueue
    try {
      if (typeof submitModeration === "function") {
        submitModeration({
          parameter: {
            contentType: "Announcement",
            contentId: announcementId,
            userId: p.UserID || "",
            reason: "New announcement pending review"
          }
        });
      }
    } catch (mqErr) {
      Logger.log("ModerationQueue submission error: " + mqErr);
    }

    return success(
      {
        AnnouncementID: announcementId
      },
      "Announcement added successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Update Announcement
 * Ownership: verifies stored UserID matches caller-supplied UserID
 */
function updateAnnouncement(e) {
  try {

    const p =
      e.parameter;

    const id =
      p.AnnouncementID || "";

    if (!id) {
      return error(
        "AnnouncementID required"
      );
    }

    const callerUserId = p.UserID || "";
    if (!callerUserId) {
      return error("UserID required for ownership verification");
    }

    const sheet =
      getSheet("Announcements");

    if (!sheet) {
      return error("Announcements sheet not found");
    }

    const data =
      sheet.getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(data[i][0]) ===
        String(id)
      ) {

        // Ownership verification: stored UserID must match caller UserID
        var storedUserIdCol = data[0].indexOf("UserID");
        var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
        if (storedUserId && storedUserId !== String(callerUserId)) {
          return error("You do not have permission to update this announcement");
        }

        const headers =
          data[0];

        for (
          let j = 0;
          j < headers.length;
          j++
        ) {

          const key =
            headers[j];

          if (
            p[key] !== undefined &&
            p[key] !== ""
          ) {
            sheet
              .getRange(
                i + 1,
                j + 1
              )
              .setValue(
                p[key]
              );
          }
        }

        // Always update UpdatedDate
        var updatedDateCol = headers.indexOf("UpdatedDate");
        if (updatedDateCol !== -1) {
          sheet.getRange(i + 1, updatedDateCol + 1).setValue(new Date());
        }

        return success(
          {},
          "Announcement updated successfully"
        );
      }
    }

    return error(
      "Announcement not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Delete Announcement (soft delete)
 * Ownership: verifies stored UserID matches caller-supplied UserID
 */
function deleteAnnouncement(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "AnnouncementID required"
      );
    }

    const callerUserId = e.parameter.UserID || "";
    if (!callerUserId) {
      return error("UserID required for ownership verification");
    }

    // Verify ownership before soft delete
    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var data = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        found = true;
        var storedUserIdCol = data[0].indexOf("UserID");
        var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
        if (storedUserId && storedUserId !== String(callerUserId)) {
          return error("You do not have permission to delete this announcement");
        }
        break;
      }
    }
    if (!found) return error("Announcement not found");

    var updated = updateRow("Announcements", "AnnouncementID", id, {
      Status: "Deleted",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Announcement not found");

    return success(
      {},
      "Announcement deleted successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Restore Announcement
 * Ownership: verifies stored UserID matches caller-supplied UserID
 */
function restoreAnnouncement(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "AnnouncementID required"
      );
    }

    const callerUserId = e.parameter.UserID || "";
    if (!callerUserId) {
      return error("UserID required for ownership verification");
    }

    // Verify ownership before restore
    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var data = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        found = true;
        var storedUserIdCol = data[0].indexOf("UserID");
        var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
        if (storedUserId && storedUserId !== String(callerUserId)) {
          return error("You do not have permission to restore this announcement");
        }
        break;
      }
    }
    if (!found) return error("Announcement not found");

    var updated = updateRow("Announcements", "AnnouncementID", id, {
      Status: "Active",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Announcement not found");

    return success(
      {},
      "Announcement restored successfully"
    );

  } catch (err) {
    return exception(err);
  }
}