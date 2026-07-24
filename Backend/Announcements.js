/**
 * ============================================================
 * EKKA1KM BACKEND
 * Announcements.js
 * V2.0 - Official Verified Announcer Architecture
 * Announcements are official notices from verified Announcers.
 * 
 * KEY CHANGES V2.0:
 * - AnnouncerID: links to verified Announcer authorization
 * - Radius: announcement target coverage (authoritative boundary)
 * - createAnnouncement now requires Active Announcer authorization
 * - getAnnouncements uses dual-radius: user discovery ∩ announcement target
 * - Public display prefers official authority identity over private user
 *
 * SECURITY:
 * - createAnnouncement validates Announcer status, ownership, radius
 * - updateAnnouncement, deleteAnnouncement verify Announcer authorization
 * - Admin endpoints protected by requireAdminSession()
 * - getAnnouncements filters to Active/Published only
 * ============================================================
 */

/**
 * ============================================================
 * ANNOUNCEMENTS CANONICAL RADIUS OPTIONS
 * ============================================================
 */
var ANNOUNCEMENT_RADIUS_OPTIONS = ["1", "5", "10", "25", "51", "100", "All India"];

/**
 * ============================================================
 * RESOLVE ANNOUNCER IDENTITY FOR PUBLIC DISPLAY
 * Given an announcement, enrich with announcer info
 * ============================================================
 */
function resolveAnnouncerIdentity(announcement) {
  if (!announcement) return {};
  
  var announcerId = announcement.AnnouncerID || "";
  if (!announcerId) {
    return {
      publisherName: announcement.PublisherName || "Announcement",
      publisherVerified: false
    };
  }
  
  var announcer = getAnnouncerById(announcerId);
  if (!announcer) {
    return {
      publisherName: announcement.PublisherName || "Official Notice",
      publisherVerified: false
    };
  }
  
  return {
    publisherName: announcer.DepartmentName || "Official Authority",
    publisherDesignation: announcer.Designation || "",
    publisherAuthorityType: announcer.AuthorityType || "",
    publisherCity: announcer.City || "",
    publisherVerified: String(announcer.Status || "").toLowerCase() === "active",
    announcerId: announcer.AnnouncerID
  };
}

/**
 * ============================================================
 * FILTER ANNOUNCEMENTS BY RADIUS (V2 dual-radius)
 * 
 * DUAL-RADIUS RULE:
 * A user sees an announcement when the user's discovery location
 * falls within the announcement's AUTHORITATIVE target radius.
 * 
 * - Announcement target radius is the authoritative maximum boundary
 * - User discovery radius is ignored for INCLUSION purpose
 * - Instead: if user is within announcement.Radius of announcement center → visible
 * - Exception: "All India" radius → visible from anywhere
 * 
 * This prevents a 5KM announcement from being visible 100KM away
 * even if the viewer selected "All India" discovery radius.
 * ============================================================
 */
function filterAnnouncementsByDualRadius(announcements, userLat, userLng) {
  if (!announcements || !announcements.length) return [];
  if (!userLat || !userLng) return announcements;
  
  return announcements.filter(function(item) {
    var targetRadius = String(item.Radius || "").trim();
    var annLat = Number(item.Latitude);
    var annLng = Number(item.Longitude);
    
    // No radius set → fall back to normal filterByRadius behavior
    if (!targetRadius || targetRadius === "") {
      return true; // Will be filtered by existing filterByRadius
    }
    
    // All India → always visible
    if (targetRadius.toLowerCase() === "all india" || targetRadius === "0") {
      return true;
    }
    
    // No coordinates on announcement → skip radius filter
    if (!annLat || !annLng || isNaN(annLat) || isNaN(annLng)) {
      return true;
    }
    
    // Calculate distance from user to announcement center
    var distance = calculateDistance(userLat, userLng, annLat, annLng);
    var radiusNum = Number(targetRadius);
    
    if (isNaN(radiusNum)) return true;
    
    // Visible only if user is within announcement's target radius
    return distance <= radiusNum;
  });
}

/**
 * ============================================================
 * CALCULATE DISTANCE (Haversine)
 * Returns distance in kilometers between two lat/lng points
 * ============================================================
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  var R = 6371; // Earth's radius in km
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * ============================================================
 * ENRICH ANNOUNCEMENT WITH AUTHOR IDENTITY
 * Add announcer info to each announcement for public display
 * ============================================================
 */
function enrichWithAnnouncerInfo(announcement) {
  var identity = resolveAnnouncerIdentity(announcement);
  announcement._publisherName = identity.publisherName;
  announcement._publisherVerified = identity.publisherVerified;
  announcement._publisherDesignation = identity.publisherDesignation || "";
  announcement._publisherAuthorityType = identity.publisherAuthorityType || "";
  return announcement;
}

/**
 * ============================================================
 * Get all announcements
 * URL:
 * ?action=announcements
 * ?action=announcements&lat=26.9124&lng=75.7873&radius=51
 * ?action=announcements&userId=U001
 * 
 * DUAL-RADIUS BEHAVIOR:
 * 1. User discovery radius: used to getLocationContext
 * 2. Announcement target radius: authoritative coverage boundary
 * ============================================================
 */
function getAnnouncements(e) {
  try {
    var announcements = [];
    var sheet = getSheet("Announcements");
    if (!sheet) {
      return success([], "No announcements sheet");
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return success([], "No announcements found");
    }

    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      headers.forEach(function(header, index) {
        row[header] = data[i][index];
      });
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

    // Get user's discovery location context
    var location = getLocationContext(e);
    var userLat = location.lat;
    var userLng = location.lng;
    var userRadius = location.radius;

    // Apply DUAL-RADIUS filter: announcement target radius takes priority
    if (userLat && userLng) {
      announcements = filterAnnouncementsByDualRadius(announcements, userLat, userLng);
    }

    // Also apply traditional filterByRadius for backward compatibility
    // (catches announcements without Radius field)
    if (userLat && userLng && userRadius) {
      var withoutRadius = [];
      var withRadius = [];
      announcements.forEach(function(item) {
        if (item.Radius && String(item.Radius).trim() !== "") {
          withRadius.push(item);
        } else {
          withoutRadius.push(item);
        }
      });
      // Only apply traditional filter to items without Radius
      if (withoutRadius.length > 0) {
        withoutRadius = filterByRadius(withoutRadius, userLat, userLng, userRadius);
      }
      announcements = withRadius.concat(withoutRadius);
    }

    // Enrich with announcer info for public display
    announcements = announcements.map(function(item) {
      return enrichWithAnnouncerInfo(item);
    });

    // Sort by CreatedDate descending (newest first)
    announcements.sort(function(a, b) {
      var dateA = new Date(a.CreatedDate || 0);
      var dateB = new Date(b.CreatedDate || 0);
      return dateB - dateA;
    });

    return success(announcements, "Announcements loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * Get single announcement
 * URL:
 * ?action=announcement&id=A001
 * ============================================================
 */
function getAnnouncement(e) {
  try {
    var id = e.parameter.id || "";
    if (!id) {
      return error("AnnouncementID required");
    }

    var sheet = getSheet("Announcements");
    if (!sheet) {
      return error("Announcements sheet not found");
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var announcement = {};
        headers.forEach(function(header, index) {
          announcement[header] = data[i][index];
        });
        // Enrich with announcer identity for public display
        announcement = enrichWithAnnouncerInfo(announcement);
        return success(announcement, "Announcement Loaded");
      }
    }

    return error("Announcement not found");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * CREATE ANNOUNCEMENT (V2 - Authorized)
 * 
 * REQUIRES Active Announcer authorization.
 * 
 * Authorization checks:
 * 1. AnnouncerID must be provided and exist
 * 2. Announcer.UserID must match the posting UserID
 * 3. Announcer.Status must be Active
 * 4. Selected Radius must be <= Announcer.MaxRadius
 * 5. Location uses Announcer's verified location, not phone GPS
 * 
 * ?action=createannouncement
 *   &userId=U001
 *   &announcerId=AN001
 *   &title=Notice
 *   &description=Details
 *   &category=General
 *   &radius=5
 *   &image=
 *   &address=
 *   &startDate=
 *   &endDate=
 *   &priority=Normal
 * ============================================================
 */
function createAnnouncement(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var announcerId = p.announcerId || "";

    if (!userId) return error("UserID required");
    if (!announcerId) return error("AnnouncerID required");

    // ============================================================
    // AUTHORIZATION: Verify Announcer
    // ============================================================
    var announcer = getAnnouncerById(announcerId);
    if (!announcer) {
      return error("Announcer authorization not found");
    }

    // Verify ownership: Announcer.UserID must match caller
    if (String(announcer.UserID) !== String(userId)) {
      return error("You do not own this Announcer authorization");
    }

    // Verify status: must be Active
    if (String(announcer.Status || "").toLowerCase() !== "active") {
      return error("Announcer authorization is not Active. Current status: " + announcer.Status);
    }

    // Verify radius: selected radius must be allowed
    var selectedRadius = String(p.radius || "").trim();
    var maxRadius = announcer.MaxRadius || "";
    
    if (selectedRadius) {
      if (!isRadiusAllowed(selectedRadius, maxRadius)) {
        var allowedOptions = getAllowedRadiusOptions(maxRadius);
        return error("Radius " + selectedRadius + " is not allowed. Maximum radius: " + maxRadius + ". Allowed: " + allowedOptions.join(", "));
      }
    } else {
      // Default to smallest allowed radius
      var allowed = getAllowedRadiusOptions(maxRadius);
      selectedRadius = String(allowed[0] || maxRadius || "1");
    }

    // ============================================================
    // Use Announcer's verified location (NOT phone GPS)
    // ============================================================
    var annLat = announcer.Latitude || p.latitude || "";
    var annLng = announcer.Longitude || p.longitude || "";
    var annCity = announcer.City || p.city || "";
    var annDistrict = announcer.District || p.district || "";
    var annState = announcer.State || p.state || "";
    var annCountry = announcer.Country || "India";
    var annAddress = announcer.Address || p.address || "";

    // Validate posting limit
    var limitCheck = validatePostingLimit(userId, "Announcement");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var announcementId = "A" + Utilities.getUuid().substring(0, 8);
    var status = "Pending";

    sheet.appendRow([
      announcementId,
      userId,
      p.title || "",
      p.description || "",
      p.category || "General",
      p.image || "",
      annAddress,
      annCity,
      annDistrict,
      annState,
      annCountry,
      annLat,
      annLng,
      p.startDate || "",
      p.endDate || "",
      p.priority || "Normal",
      status,
      new Date(),
      new Date(),
      0,           // Views
      announcerId, // AnnouncerID
      selectedRadius // Radius
    ]);

    // Submit to ModerationQueue
    try {
      if (typeof ensureModerationQueueSheet === "function" && typeof submitModeration === "function") {
        submitModeration({
          parameter: {
            contentType: "Announcement",
            contentId: announcementId,
            userId: userId,
            reason: "New official announcement from " + (announcer.DepartmentName || "Verified Announcer") + " pending review"
          }
        });
      }
    } catch (mqErr) {
      Logger.log("ModerationQueue submission error: " + mqErr);
    }

    // Track event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: {
            eventType: "AnnouncementCreated",
            userId: userId,
            entityType: "Announcement",
            entityId: announcementId,
            eventData: JSON.stringify({announcerId: announcerId, radius: selectedRadius})
          }
        });
      }
    } catch (te) {
      Logger.log("AnnouncementCreated track error: " + te);
    }

    return success({
      AnnouncementID: announcementId,
      Status: status,
      AnnouncerID: announcerId,
      Radius: selectedRadius
    }, "Announcement created successfully. Pending moderation review.");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE ANNOUNCEMENT (V2 - Authorized)
 * 
 * Announcer must be Active to update.
 * Content may only be modified by the original Announcer.
 * Admin with valid session may also update.
 * ============================================================
 */
function updateAnnouncement(e) {
  try {
    var p = e.parameter;
    var id = p.AnnouncementID || "";
    if (!id) return error("AnnouncementID required");

    var callerUserId = p.UserID || "";
    if (!callerUserId) return error("UserID required");

    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // Check if this announcement has an AnnouncerID
        var storedAnnouncerIdCol = headers.indexOf("AnnouncerID");
        var storedAnnouncerId = storedAnnouncerIdCol !== -1 ? String(data[i][storedAnnouncerIdCol] || "") : "";

        if (storedAnnouncerId) {
          // V2: Verify Announcer authorization
          var announcer = getAnnouncerById(storedAnnouncerId);
          if (!announcer) {
            return error("Associated Announcer authorization not found");
          }
          // Check ownership
          if (String(announcer.UserID) !== String(callerUserId)) {
            return error("You do not have permission to update this announcement");
          }
          // Check active status
          if (String(announcer.Status || "").toLowerCase() !== "active") {
            return error("Announcer authorization is not Active. Cannot modify official announcement.");
          }
        } else {
          // Legacy: check UserID ownership
          var storedUserIdCol = data[0].indexOf("UserID");
          var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
          if (storedUserId && storedUserId !== String(callerUserId)) {
            return error("You do not have permission to update this announcement");
          }
        }

        // Apply updates
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j];
          if (p[key] !== undefined && p[key] !== "") {
            sheet.getRange(i + 1, j + 1).setValue(p[key]);
          }
        }

        // Always update UpdatedDate
        var updatedDateCol = headers.indexOf("UpdatedDate");
        if (updatedDateCol !== -1) {
          sheet.getRange(i + 1, updatedDateCol + 1).setValue(new Date());
        }

        return success({}, "Announcement updated successfully");
      }
    }

    return error("Announcement not found");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE ANNOUNCEMENT (V2 - Soft delete with Announcer check)
 * ============================================================
 */
function deleteAnnouncement(e) {
  try {
    var id = e.parameter.id || "";
    if (!id) return error("AnnouncementID required");

    var callerUserId = e.parameter.UserID || "";
    if (!callerUserId) return error("UserID required for ownership verification");

    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        found = true;

        // Check if V2 Announcer-based
        var storedAnnouncerIdCol = headers.indexOf("AnnouncerID");
        var storedAnnouncerId = storedAnnouncerIdCol !== -1 ? String(data[i][storedAnnouncerIdCol] || "") : "";

        if (storedAnnouncerId) {
          var announcer = getAnnouncerById(storedAnnouncerId);
          if (!announcer || String(announcer.UserID) !== String(callerUserId)) {
            return error("You do not have permission to delete this announcement");
          }
          // Suspended/Revoked announcer can delete their own (but not create new)
        } else {
          // Legacy check
          var storedUserIdCol = headers.indexOf("UserID");
          var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
          if (storedUserId && storedUserId !== String(callerUserId)) {
            return error("You do not have permission to delete this announcement");
          }
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

    return success({}, "Announcement deleted successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * RESTORE ANNOUNCEMENT (V2)
 * ============================================================
 */
function restoreAnnouncement(e) {
  try {
    var id = e.parameter.id || "";
    if (!id) return error("AnnouncementID required");

    var callerUserId = e.parameter.UserID || "";
    if (!callerUserId) return error("UserID required for ownership verification");

    var sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        found = true;

        var storedAnnouncerIdCol = headers.indexOf("AnnouncerID");
        var storedAnnouncerId = storedAnnouncerIdCol !== -1 ? String(data[i][storedAnnouncerIdCol] || "") : "";

        if (storedAnnouncerId) {
          var announcer = getAnnouncerById(storedAnnouncerId);
          if (!announcer || String(announcer.UserID) !== String(callerUserId)) {
            return error("You do not have permission to restore this announcement");
          }
        } else {
          // Legacy check
          var storedUserIdCol = headers.indexOf("UserID");
          var storedUserId = storedUserIdCol !== -1 ? String(data[i][storedUserIdCol]) : "";
          if (storedUserId && storedUserId !== String(callerUserId)) {
            return error("You do not have permission to restore this announcement");
          }
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

    return success({}, "Announcement restored successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADD ANNOUNCEMENT (Legacy - preserved for backward compatibility)
 * Used by frontend addannouncement action
 * Normal users without Announcer authorization should use this
 * only for very basic non-official notices.
 * ============================================================
 */
function addAnnouncement(e) {
  try {
    var p = e.parameter;
    var sheet = getSheet("Announcements");
    if (!sheet) {
      return error("Announcements sheet not found");
    }

    var announcementId = "A" + Utilities.getUuid().substring(0, 8);

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
      new Date(),
      0,     // Views
      "",    // AnnouncerID
      ""     // Radius
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

    return success({
      AnnouncementID: announcementId
    }, "Announcement added successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: UPDATE ANNOUNCEMENT STATUS
 * ?action=adminannouncementstatus&session=TOKEN&announcementId=A001&status=Active
 * ============================================================
 */
function setAnnouncementStatus(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcementId = (e.parameter.announcementId || "").trim();
    var status = (e.parameter.status || "").trim();

    if (!announcementId) return error("AnnouncementID required");
    if (!status) return error("Status required");

    var validStatuses = ["Active", "Pending", "Expired", "Deleted"];
    if (validStatuses.indexOf(status) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    var updated = updateRow("Announcements", "AnnouncementID", announcementId, {
      Status: status,
      UpdatedDate: new Date()
    });

    if (!updated) return error("Announcement not found");

    return success({
      AnnouncementID: announcementId,
      Status: status
    }, "Announcement status updated to " + status);

  } catch (err) {
    return exception(err);
  }
}
