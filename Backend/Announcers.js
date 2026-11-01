/**
 * ============================================================
 * EKKA1KM BACKEND
 * Announcers.js
 * V2.0 - Official Verified Announcer Authorization System
 * Announcer lifecycle: Pending → Active → Suspended / Revoked
 * ============================================================
 */

/**
 * ============================================================
 * CANONICAL RADIUS OPTIONS
 * ============================================================
 */
var ANNOUNCER_RADIUS_OPTIONS = [1, 5, 10, 25, 51, 100];
var ANNOUNCER_RADIUS_ALL_INDIA = "All India";

/**
 * ============================================================
 * VALIDATE RADIUS AGAINST MAX RADIUS
 * Returns allowed radius options for a given MaxRadius
 * ============================================================
 */
function getAllowedRadiusOptions(maxRadius) {
  if (!maxRadius) return [];

  var maxStr = String(maxRadius).trim().toLowerCase();

  // All India allows everything
  if (maxStr === "all india" || maxStr === "all" || maxStr === "india") {
    return ANNOUNCER_RADIUS_OPTIONS.concat([ANNOUNCER_RADIUS_ALL_INDIA]);
  }

  var maxNum = Number(maxRadius);
  if (isNaN(maxNum)) return [];

  var allowed = [];
  for (var i = 0; i < ANNOUNCER_RADIUS_OPTIONS.length; i++) {
    if (ANNOUNCER_RADIUS_OPTIONS[i] <= maxNum) {
      allowed.push(ANNOUNCER_RADIUS_OPTIONS[i]);
    }
  }

  return allowed;
}

/**
 * ============================================================
 * CHECK IF RADIUS IS ALLOWED FOR ANNOUNCER
 * ============================================================
 */
function isRadiusAllowed(selectedRadius, maxRadius) {
  var allowedOptions = getAllowedRadiusOptions(maxRadius);

  var selectedStr = String(selectedRadius).trim();

  for (var i = 0; i < allowedOptions.length; i++) {
    if (String(allowedOptions[i]).trim() === selectedStr) {
      return true;
    }
  }

  return false;
}

/**
 * ============================================================
 * HELPER: LOG ANNOUNCER AUDIT ACTIVITY
 * Writes canonical ActivityLogs entries:
 * [LogID, UserID, Activity, ReferenceID, IPAddress, Device, CreatedDate]
 * ============================================================
 */
function logAnnouncerActivity_(activitySheet, userId, activity, referenceId, description) {
  try {
    if (!activitySheet) return;
    var headers = activitySheet.getDataRange().getValues()[0];
    if (headers && headers.length > 0) {
      var row = headers.map(function(h) {
        switch (h) {
          case "LogID": return Utilities.getUuid().substring(0, 8);
          case "UserID": return String(userId || "");
          case "Activity": return String(activity || "");
          case "ReferenceID": return String(referenceId || description || "");
          case "IPAddress": return "";
          case "Device": return "";
          case "CreatedDate": return new Date();
          default: return "";
        }
      });
      activitySheet.appendRow(row);
    } else {
      activitySheet.appendRow([
        Utilities.getUuid().substring(0, 8),
        String(userId || ""),
        String(activity || ""),
        String(referenceId || description || ""),
        "",
        "",
        new Date()
      ]);
    }
  } catch (alErr) {
    Logger.log("logAnnouncerActivity_ error: " + alErr);
  }
}

/**
 * ============================================================
 * APPLY FOR ANNOUNCER
 * ?action=applyannouncer
 *   &userId=U001
 *   &departmentName=Indore Municipal Corporation
 *   &designation=Public Relations Officer
 *   &authorityType=Municipal Corporation
 *   &address=123 Main Street
 *   &city=Indore
 *   &district=Indore
 *   &state=Madhya Pradesh
 *   &country=India
 *   &latitude=22.7196
 *   &longitude=75.8577
 *   &maxRadius=25
 *   &proofDocument=https://ik.imagekit.io/xxx.pdf
 * ============================================================
 */
function applyAnnouncer(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) {
      return error("UserID required");
    }

    // Verify user exists
    var user = getRowById(CONFIG.SHEETS.USERS, "UserID", userId);
    if (!user) {
      return error("User not found");
    }

    var departmentName = p.departmentName || "";
    if (!departmentName) {
      return error("Department/Authority name required");
    }

    // Check for existing pending/active application from same user + authority
    var existingAnnouncers = getSheetData("Announcers") || [];
    for (var i = 0; i < existingAnnouncers.length; i++) {
      var a = existingAnnouncers[i];
      if (String(a.UserID) === String(userId) &&
          String(a.DepartmentName || "").toLowerCase() === departmentName.toLowerCase() &&
          (String(a.Status).toLowerCase() === "pending" || String(a.Status).toLowerCase() === "active")) {
        return error("You already have a " + a.Status + " application for " + departmentName);
      }
    }

    // Generate AnnouncerID
    var announcerId = "AN" + Utilities.getUuid().substring(0, 8).toUpperCase();

    var sheet = getSheet("Announcers");
    if (!sheet) {
      return error("Announcers sheet not configured. Contact admin.");
    }

    // Ensure AutoPublish header exists in Row 1 before appending new row with 23 columns
    ensureAnnouncersAutoPublishHeader();

    sheet.appendRow([
      announcerId,
      userId,
      departmentName,
      p.designation || "",
      p.authorityType || "",
      p.address || "",
      p.city || "",
      p.district || "",
      p.state || "",
      p.country || "India",
      p.latitude || "",
      p.longitude || "",
      p.maxRadius || "",
      p.proofDocument || "",
      "Pending",
      new Date(),
      "", // VerifiedBy
      "", // VerifiedDate
      "", // SuspendedDate
      "", // RevokedDate
      "", // AdminNotes
      new Date(), // UpdatedDate
      "false" // AutoPublish
    ]);

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          userId,
          "AnnouncerApplication",
          announcerId,
          "Announcer application submitted: " + departmentName + " (" + announcerId + ")"
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      Status: "Pending"
    }, "Announcer application submitted successfully. Awaiting admin verification.");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET ANNOUNCER BY ID (API route)
 * ?action=getannouncerbyid&announcerId=AN001
 * ============================================================
 */
function getAnnouncerByIdRoute(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var announcerId = p.announcerId || "";

    if (!announcerId) {
      return error("AnnouncerID required");
    }

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) {
      return error("Announcer not found");
    }

    return success(announcer, "Announcer loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET MY ANNOUNCER STATUS
 * ?action=myannouncerstatus&userId=U001
 * ============================================================
 */
function getMyAnnouncerStatus(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) {
      return error("UserID required");
    }

    var announcers = getSheetData("Announcers") || [];
    var result = [];

    for (var i = 0; i < announcers.length; i++) {
      if (String(announcers[i].UserID) === String(userId)) {
        result.push(announcers[i]);
      }
    }

    return success(result, "Announcer status loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET ANNOUNCER BY ID
 * Internal helper
 * ============================================================
 */
function getAnnouncerById(announcerId) {
  return getRowById("Announcers", "AnnouncerID", announcerId);
}

/**
 * ============================================================
 * GET ACTIVE ANNOUNCER FOR USER
 * Returns the first Active announcer for a user, or null
 * ============================================================
 */
function getActiveAnnouncerForUser(userId) {
  if (!userId) return null;

  var announcers = getSheetData("Announcers") || [];

  for (var i = 0; i < announcers.length; i++) {
    if (String(announcers[i].UserID) === String(userId) &&
        String(announcers[i].Status || "").toLowerCase() === "active") {
      return announcers[i];
    }
  }

  return null;
}

/**
 * ============================================================
 * GET ALL ANNOUNCERS (Admin)
 * ?action=getallannouncers&session=TOKEN&status=Pending
 * ============================================================
 */
function getAllAnnouncers(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var statusFilter = (e.parameter.status || "").trim().toLowerCase();

    var announcers = getSheetData("Announcers") || [];
    var result = [];

    for (var i = 0; i < announcers.length; i++) {
      if (statusFilter && String(announcers[i].Status || "").toLowerCase() !== statusFilter) continue;
      result.push(announcers[i]);
    }

    // Sort by RequestedDate descending
    result.sort(function(a, b) {
      var dateA = new Date(a.RequestedDate || 0);
      var dateB = new Date(b.RequestedDate || 0);
      return dateB - dateA;
    });

    return success({
      count: result.length,
      data: result
    }, "Announcers loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: VERIFY / ACTIVATE ANNOUNCER
 * ?action=adminverifyannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminVerifyAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcerId = (e.parameter.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    if (String(announcer.Status).toLowerCase() === "active") {
      return error("Announcer is already Active");
    }

    // Check if user already has another active announcer profile
    var existingActive = getActiveAnnouncerForUser(announcer.UserID);
    if (existingActive && String(existingActive.AnnouncerID).trim() !== announcerId) {
      return error("User " + announcer.UserID + " already has another active Announcer profile (" + existingActive.AnnouncerID + ")");
    }

    var autoPubParam = e.parameter.autoPublish;
    var updates = {
      Status: "Active",
      VerifiedBy: sessionResult.adminId,
      VerifiedDate: new Date(),
      UpdatedDate: new Date()
    };
    if (autoPubParam !== undefined) {
      updates.AutoPublish = String(autoPubParam).toLowerCase() === "true" ? "true" : "false";
    }

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, updates);
    if (!updated) return error("Failed to update announcer");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          "AnnouncerVerified",
          announcerId,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") verified and activated by " + sessionResult.adminId + (autoPubParam !== undefined ? " (AutoPublish: " + updates.AutoPublish + ")" : "")
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      Status: "Active",
      AutoPublish: updates.AutoPublish !== undefined ? (updates.AutoPublish === "true") : undefined
    }, "Announcer verified and activated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: SUSPEND ANNOUNCER
 * ?action=adminsuspendannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminSuspendAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcerId = (e.parameter.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    if (String(announcer.Status).toLowerCase() !== "active") {
      return error("Only Active announcers can be suspended");
    }

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      Status: "Suspended",
      SuspendedDate: new Date(),
      UpdatedDate: new Date()
    });

    if (!updated) return error("Failed to update announcer");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          "AnnouncerSuspended",
          announcerId,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") suspended by " + sessionResult.adminId
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      Status: "Suspended"
    }, "Announcer suspended successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: REACTIVATE ANNOUNCER (from Suspended)
 * ?action=adminreactivateannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminReactivateAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcerId = (e.parameter.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    if (String(announcer.Status).toLowerCase() !== "suspended") {
      return error("Only Suspended announcers can be reactivated");
    }

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      Status: "Active",
      UpdatedDate: new Date()
    });

    if (!updated) return error("Failed to update announcer");

    return success({
      AnnouncerID: announcerId,
      Status: "Active"
    }, "Announcer reactivated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: REVOKE ANNOUNCER
 * ?action=adminrevokeannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminRevokeAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcerId = (e.parameter.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    if (String(announcer.Status).toLowerCase() === "revoked") {
      return error("Announcer is already revoked");
    }

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      Status: "Revoked",
      RevokedDate: new Date(),
      UpdatedDate: new Date()
    });

    if (!updated) return error("Failed to update announcer");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          "AnnouncerRevoked",
          announcerId,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") revoked by " + sessionResult.adminId
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      Status: "Revoked"
    }, "Announcer authorization revoked. User account remains active.");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ENSURE ANNOUNCERS AUTO-PUBLISH HEADER EXISTS
 * ============================================================
 */
function ensureAnnouncersAutoPublishHeader() {
  try {
    var sheet = getSheet("Announcers");
    if (!sheet) return;
    var values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) return;
    var headers = values[0];
    if (headers.indexOf("AutoPublish") === -1) {
      var lastHeaderCol = 0;
      for (var c = 0; c < headers.length; c++) {
        if (headers[c] !== "" && headers[c] !== null && headers[c] !== undefined) {
          lastHeaderCol = c + 1;
        }
      }
      var nextCol = (lastHeaderCol > 0 ? lastHeaderCol : headers.length) + 1;
      sheet.getRange(1, nextCol).setValue("AutoPublish");
      Logger.log("Announcers header added: AutoPublish in column " + nextCol);
    }
  } catch (err) {
    Logger.log("ensureAnnouncersAutoPublishHeader error: " + err);
  }
}

/**
 * ============================================================
 * ADMIN: TOGGLE / SET ANNOUNCER AUTO-PUBLISH
 * ?action=admintoggleautopublish&session=TOKEN&announcerId=AN001&autoPublish=true
 * ============================================================
 */
function adminToggleAutoPublish(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var p = e && e.parameter ? e.parameter : {};
    var announcerId = (p.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var rawAutoPublish = p.autoPublish !== undefined ? String(p.autoPublish).trim().toLowerCase() : "";
    var autoPublishVal = (rawAutoPublish === "true" || rawAutoPublish === "1" || rawAutoPublish === "yes" || rawAutoPublish === "on") ? "true" : "false";

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    // Only Active announcers should have AutoPublish toggled
    if (String(announcer.Status || "").toLowerCase() !== "active") {
      return error("Auto-Publish can only be configured for Active announcers. Current status: " + announcer.Status);
    }

    // Ensure AutoPublish header exists in sheet
    ensureAnnouncersAutoPublishHeader();

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      AutoPublish: autoPublishVal,
      UpdatedDate: new Date()
    });

    if (!updated) return error("Failed to update announcer Auto-Publish setting");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          "AnnouncerAutoPublishUpdated",
          announcerId,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") Auto-Publish set to " + autoPublishVal + " by " + sessionResult.adminId
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      AutoPublish: autoPublishVal === "true",
      Status: announcer.Status
    }, "Announcer Auto-Publish setting updated to " + (autoPublishVal === "true" ? "ON" : "OFF"));

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET MY ANNOUNCEMENTS (for Announcer Dashboard)
 * ?action=myannouncements&userId=U001&announcerId=AN001
 * ============================================================
 */
function getMyAnnouncements(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var announcerId = p.announcerId || "";

    if (!announcerId && !userId) {
      return error("AnnouncerID or UserID required");
    }

    var announcements = getSheetData(CONFIG.SHEETS.ANNOUNCEMENTS) || [];
    var result = [];

    for (var i = 0; i < announcements.length; i++) {
      var match = false;

      if (announcerId && String(announcements[i].AnnouncerID || "") === String(announcerId)) {
        match = true;
      } else if (!announcerId && userId && String(announcements[i].UserID) === String(userId)) {
        match = true;
      }

      if (match) {
        result.push(announcements[i]);
      }
    }

    // Sort by CreatedDate descending
    result.sort(function(a, b) {
      var dateA = new Date(a.CreatedDate || 0);
      var dateB = new Date(b.CreatedDate || 0);
      return dateB - dateA;
    });

    return success(result, "My announcements loaded");

  } catch (err) {
    return exception(err);
  }
}
/**
 * ============================================================
 * ADMIN: UPDATE ANNOUNCER DETAILS (EDIT)
 * ?action=adminupdateannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminUpdateAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var p = e && e.parameter ? e.parameter : {};
    var announcerId = (p.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    var updates = {
      UpdatedDate: new Date()
    };

    if (p.departmentName !== undefined && p.departmentName.trim()) updates.DepartmentName = p.departmentName.trim();
    if (p.designation !== undefined) updates.Designation = p.designation.trim();
    if (p.authorityType !== undefined) updates.AuthorityType = p.authorityType.trim();
    if (p.city !== undefined && p.city.trim()) updates.City = p.city.trim();
    if (p.district !== undefined) updates.District = p.district.trim();
    if (p.state !== undefined) updates.State = p.state.trim();
    if (p.address !== undefined) updates.Address = p.address.trim();
    if (p.latitude !== undefined) updates.Latitude = p.latitude.trim();
    if (p.longitude !== undefined) updates.Longitude = p.longitude.trim();
    if (p.maxRadius !== undefined && p.maxRadius.trim()) updates.MaxRadius = p.maxRadius.trim();
    if (p.proofDocument !== undefined) updates.ProofDocument = p.proofDocument.trim();
    if (p.adminNotes !== undefined) updates.AdminNotes = p.adminNotes.trim();

    if (p.autoPublish !== undefined) {
      var isAuto = String(p.autoPublish).trim().toLowerCase() === "true";
      updates.AutoPublish = isAuto ? "true" : "false";
    }

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, updates);
    if (!updated) return error("Failed to update announcer record");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          "AnnouncerEdited",
          announcerId,
          "Announcer " + announcerId + " edited by " + sessionResult.adminId
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      updates: updates
    }, "Announcer record updated successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: REJECT ANNOUNCER APPLICATION / REVOKE
 * ?action=adminrejectannouncer&session=TOKEN&announcerId=AN001&reason=...
 * ============================================================
 */
function adminRejectAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var p = e && e.parameter ? e.parameter : {};
    var announcerId = (p.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var reason = (p.reason || "").trim();
    if (!reason) return error("Rejection reason is required");

    var announcer = getAnnouncerById(announcerId);
    if (!announcer) return error("Announcer not found");

    var currentStatus = String(announcer.Status || "").toLowerCase();
    if (currentStatus === "rejected" || currentStatus === "revoked") {
      return error("Announcer is already " + announcer.Status);
    }

    var isRevokingActive = (currentStatus === "active");
    var targetStatus = isRevokingActive ? "Revoked" : "Rejected";

    var adminNotes = (announcer.AdminNotes ? announcer.AdminNotes + " | " : "") +
                     (isRevokingActive ? "Revoked by " : "Rejected by ") + sessionResult.adminId + ": " + reason;

    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      Status: targetStatus,
      RevokedDate: new Date(),
      AdminNotes: adminNotes,
      UpdatedDate: new Date(),
      AutoPublish: "false"
    });

    if (!updated) return error("Failed to update announcer record");

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          announcer.UserID,
          isRevokingActive ? "AnnouncerRevoked" : "AnnouncerRejected",
          announcerId,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") " + (isRevokingActive ? "revoked" : "rejected") + " by " + sessionResult.adminId + ". Reason: " + reason
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      Status: targetStatus,
      Reason: reason
    }, "Announcer " + announcerId + " " + (isRevokingActive ? "revoked" : "rejected") + " successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: DELETE ANNOUNCER RECORD
 * ?action=admindeleteannouncer&session=TOKEN&announcerId=AN001
 * ============================================================
 */
function adminDeleteAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var announcerId = (e.parameter.announcerId || "").trim();
    if (!announcerId) return error("AnnouncerID required");

    var sheet = getSheet("Announcers");
    if (!sheet) return error("Announcers sheet not found");

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return error("Announcers sheet is empty");

    var headers = data[0];
    var idCol = headers.indexOf("AnnouncerID");
    if (idCol === -1) idCol = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() === announcerId) {
        var userId = String(data[i][1] || "");
        var deptName = String(data[i][2] || "");

        sheet.deleteRow(i + 1);

        // Audit log
        try {
          var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
          if (activitySheet) {
            logAnnouncerActivity_(
              activitySheet,
              userId,
              "AnnouncerDeleted",
              announcerId,
              "Announcer " + announcerId + " (" + deptName + ") linked to User " + userId + " DELETED by " + sessionResult.adminId
            );
          }
        } catch (alErr) {
          Logger.log("Audit log error: " + alErr);
        }

        return success({
          AnnouncerID: announcerId,
          UserID: userId
        }, "Announcer record " + announcerId + " permanently deleted");
      }
    }

    return error("Announcer " + announcerId + " not found");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: DIRECT AUTHORISE ANNOUNCER FOR USER
 * ?action=admincreateannouncer&session=TOKEN&userId=U001&...
 * ============================================================
 */
function adminCreateAnnouncer(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var p = e && e.parameter ? e.parameter : {};
    var userId = (p.userId || "").trim();
    if (!userId) return error("UserID is required");

    // Validate user exists in Users sheet
    var user = getRowById(CONFIG.SHEETS.USERS, "UserID", userId);
    if (!user) return error("User " + userId + " does not exist in the platform database");
    if (String(user.Status || "").toLowerCase() === "deleted") {
      return error("Cannot authorise a deleted user account");
    }

    // Check if user already has an active announcer profile
    var existingActive = getActiveAnnouncerForUser(userId);
    if (existingActive) {
      return error("User " + userId + " already has an active Official Announcer profile (" + existingActive.AnnouncerID + " - " + existingActive.DepartmentName + ")");
    }

    var deptName = (p.departmentName || "").trim();
    if (!deptName) return error("Department/Authority name is required");

    var city = (p.city || user.City || "").trim();
    if (!city) return error("City is required");

    var designation = (p.designation || "").trim();
    var authorityType = (p.authorityType || "").trim();
    var district = (p.district || user.District || "").trim();
    var state = (p.state || user.State || "").trim();
    var address = (p.address || user.Address || "").trim();
    var lat = (p.latitude || user.Latitude || "").trim();
    var lng = (p.longitude || user.Longitude || "").trim();
    var maxRadius = (p.maxRadius || "25").trim();
    var proof = (p.proofDocument || "Directly Authorised by Admin " + sessionResult.adminId).trim();
    var isAuto = String(p.autoPublish || "").trim().toLowerCase() === "true";
    var autoPublishStr = isAuto ? "true" : "false";
    var adminNotes = (p.adminNotes || ("Directly authorised by Admin " + sessionResult.adminId)).trim();

    // Check if user has an existing Pending or Rejected record to upgrade rather than duplicate
    var existingAnnouncers = getSheetData("Announcers") || [];
    var pendingRecord = null;
    for (var i = 0; i < existingAnnouncers.length; i++) {
      var a = existingAnnouncers[i];
      if (String(a.UserID).trim() === userId && String(a.Status).toLowerCase() !== "revoked") {
        pendingRecord = a;
        break;
      }
    }

    var announcerId = "";
    if (pendingRecord) {
      announcerId = pendingRecord.AnnouncerID;
      updateRow("Announcers", "AnnouncerID", announcerId, {
        DepartmentName: deptName,
        Designation: designation,
        AuthorityType: authorityType,
        Address: address,
        City: city,
        District: district,
        State: state,
        Latitude: lat,
        Longitude: lng,
        MaxRadius: maxRadius,
        ProofDocument: proof,
        Status: "Active",
        VerifiedBy: sessionResult.adminId,
        VerifiedDate: new Date(),
        AdminNotes: adminNotes,
        UpdatedDate: new Date(),
        AutoPublish: autoPublishStr
      });
    } else {
      announcerId = "AN" + Utilities.getUuid().substring(0, 8).toUpperCase();
      var sheet = getSheet("Announcers");
      if (!sheet) return error("Announcers sheet not found");

      ensureAnnouncersAutoPublishHeader();

      sheet.appendRow([
        announcerId,
        userId,
        deptName,
        designation,
        authorityType,
        address,
        city,
        district,
        state,
        "India",
        lat,
        lng,
        maxRadius,
        proof,
        "Active",
        new Date(), // CreatedDate
        sessionResult.adminId, // VerifiedBy
        new Date(), // VerifiedDate
        "", // SuspendedDate
        "", // RevokedDate
        adminNotes, // AdminNotes
        new Date(), // UpdatedDate
        autoPublishStr // AutoPublish
      ]);
    }

    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        logAnnouncerActivity_(
          activitySheet,
          userId,
          "AnnouncerDirectAuthorised",
          announcerId,
          "Announcer " + announcerId + " (" + deptName + ") directly authorised for User " + userId + " by " + sessionResult.adminId + " (AutoPublish: " + autoPublishStr + ")"
        );
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }

    return success({
      AnnouncerID: announcerId,
      UserID: userId,
      Status: "Active",
      AutoPublish: autoPublishStr === "true"
    }, "User " + userId + " authorised as Official Announcer (" + announcerId + ")");
  } catch (err) {
    return exception(err);
  }
}
