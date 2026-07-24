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
      new Date()
    ]);
    
    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        activitySheet.appendRow([
          Utilities.getUuid().substring(0, 8),
          "AnnouncerApplication",
          userId,
          "Announcer application submitted: " + departmentName + " (" + announcerId + ")",
          new Date()
        ]);
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
    
    if (String(announcer.Status).toLowerCase() === "revoked") {
      return error("Cannot activate a Revoked announcer. Create a new application.");
    }
    
    var updated = updateRow("Announcers", "AnnouncerID", announcerId, {
      Status: "Active",
      VerifiedBy: sessionResult.adminId,
      VerifiedDate: new Date(),
      UpdatedDate: new Date()
    });
    
    if (!updated) return error("Failed to update announcer");
    
    // Audit log
    try {
      var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
      if (activitySheet) {
        activitySheet.appendRow([
          Utilities.getUuid().substring(0, 8),
          "AnnouncerVerified",
          announcer.UserID,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") verified by " + sessionResult.adminId,
          new Date()
        ]);
      }
    } catch (alErr) {
      Logger.log("Audit log error: " + alErr);
    }
    
    return success({
      AnnouncerID: announcerId,
      Status: "Active"
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
        activitySheet.appendRow([
          Utilities.getUuid().substring(0, 8),
          "AnnouncerSuspended",
          announcer.UserID,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") suspended by " + sessionResult.adminId,
          new Date()
        ]);
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
        activitySheet.appendRow([
          Utilities.getUuid().substring(0, 8),
          "AnnouncerRevoked",
          announcer.UserID,
          "Announcer " + announcerId + " (" + announcer.DepartmentName + ") revoked by " + sessionResult.adminId,
          new Date()
        ]);
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