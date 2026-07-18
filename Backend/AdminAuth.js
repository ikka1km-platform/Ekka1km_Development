/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminAuth.js
 * V5.10.0 - SUPER ADMIN AUTHENTICATION SYSTEM (Phase 5.1)
 * Admin ID + OTP Login, Session Management, Permissions
 * ============================================================
 */


/**
 * ============================================================
 * ADMIN LOGIN
 * ?action=adminlogin&adminId=EKKA001
 * Validates Admin ID, sends OTP
 * ============================================================
 */

function adminLogin(e) {
  try {

    const adminId =
      (e.parameter.adminId || "").trim().toUpperCase();

    if (!adminId) {
      return error("Admin ID is required");
    }

    // Find admin in Admins sheet
    const admin = findAdminById(adminId);

    if (!admin) {
      return error("Invalid Admin ID");
    }

    if (String(admin.Status || "").toLowerCase() !== "active") {
      return error("Admin account is inactive. Contact Founder.");
    }

    // Check soft delete
    if (String(admin.IsDeleted || "FALSE").toUpperCase() === "TRUE") {
      return error("Admin account has been deleted. Contact Founder.");
    }

    // Generate OTP using the existing OTP engine
    const otpResult = generateAdminOtp(adminId);

    if (!otpResult) {
      return error("Failed to generate OTP. Please try again.");
    }

    // Return success with admin info (no OTP in production)
    return success(
      {
        adminId: admin.AdminID,
        adminCode: admin.AdminCode || "",
        fullName: admin.FullName || "",
        role: admin.Role || "",
        message: "OTP sent to registered mobile/email",
        devOtp: CONFIG.OTP_PROVIDER === "LOCAL" ? otpResult.otp : null
      },
      "OTP Sent Successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * VERIFY ADMIN OTP
 * ?action=adminverifyotp&adminId=EKKA001&otp=123456&remember=true
 * ============================================================
 */

function verifyAdminOTP(e) {
  try {

    const adminId =
      (e.parameter.adminId || "").trim().toUpperCase();

    const otp =
      (e.parameter.otp || "").trim();

    const remember =
      (e.parameter.remember || "false").trim() === "true";

    if (!adminId || !otp) {
      return error("Admin ID and OTP are required");
    }

    // Validate admin exists
    const admin = findAdminById(adminId);

    if (!admin) {
      return error("Invalid Admin ID");
    }

    if (String(admin.Status || "").toLowerCase() !== "active") {
      return error("Admin account is inactive. Contact Founder.");
    }

    // Check soft delete
    if (String(admin.IsDeleted || "FALSE").toUpperCase() === "TRUE") {
      return error("Admin account has been deleted. Contact Founder.");
    }

    // Verify OTP using existing OTP engine
    const verified = verifyAdminOtp(adminId, otp);

    if (!verified.success) {
      return error(verified.message);
    }

    // Parse permissions
    let permissions = {};
    try {
      permissions = JSON.parse(admin.Permissions || "{}");
    } catch (e) {
      permissions = {};
    }

    // Create session
    const sessionResult = createAdminSession(
      adminId,
      remember,
      e
    );

    if (!sessionResult.success) {
      return error(sessionResult.message);
    }

    // Update last login
    updateAdminLastLogin(adminId);

    // Build admin profile (exclude sensitive fields)
    const profile = buildAdminProfile(admin);

    return success(
      {
        session: sessionResult.session,
        admin: profile,
        permissions: permissions,
        rememberSession: remember,
        sessionExpiry: sessionResult.sessionExpiry
      },
      "Admin Login Successful"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * VALIDATE ADMIN SESSION
 * ?action=adminvalidatesession&session=TOKEN
 * ============================================================
 */

function validateAdminSession(e) {
  try {

    const sessionToken =
      (e.parameter.session || "").trim();

    if (!sessionToken) {
      return unauthorized();
    }

    const session = findAdminSession(sessionToken);

    if (!session) {
      return unauthorized();
    }

    // Check if session expired or logged out
    if (String(session.Status || "").toLowerCase() !== "active") {
      return unauthorized();
    }

    // Check expiry using stored SessionExpiry
    const now = new Date().getTime();

    const sessionExpiry = session.SessionExpiry
      ? new Date(session.SessionExpiry).getTime()
      : null;

    if (sessionExpiry && now > sessionExpiry) {
      markSessionExpired(sessionToken);
      return unauthorized();
    }

    // Fallback to configured expiry if SessionExpiry is missing
    if (!sessionExpiry) {
      const sessionExpiryHours = CONFIG.SESSION_EXPIRY_HOURS || 24;
      const loginTime = new Date(session.LoginTime).getTime();
      const maxAge = sessionExpiryHours * 60 * 60 * 1000;

      if (now - loginTime > maxAge) {
        markSessionExpired(sessionToken);
        return unauthorized();
      }
    }

    // Get admin data
    const admin = findAdminById(session.AdminID);

    if (!admin) {
      return unauthorized();
    }

    if (String(admin.Status || "").toLowerCase() !== "active") {
      return unauthorized();
    }

    // Check soft delete
    if (String(admin.IsDeleted || "FALSE").toUpperCase() === "TRUE") {
      return unauthorized();
    }

    // Parse permissions
    let permissions = {};
    try {
      permissions = JSON.parse(admin.Permissions || "{}");
    } catch (e) {
      permissions = {};
    }

    // Update last activity
    updateSessionActivity(sessionToken);

    return success(
      {
        valid: true,
        admin: buildAdminProfile(admin),
        permissions: permissions,
        adminId: session.AdminID,
        session: sessionToken
      },
      "Session Valid"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LOGOUT ADMIN
 * ?action=adminlogout&session=TOKEN
 * ============================================================
 */

function logoutAdmin(e) {
  try {

    const sessionToken =
      (e.parameter.session || "").trim();

    if (!sessionToken) {
      return success(null, "Already logged out");
    }

    markSessionLoggedOut(sessionToken);

    return success(
      {
        loggedOut: true
      },
      "Logout Successful"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET ADMIN PROFILE
 * ?action=adminprofile&session=TOKEN
 * ============================================================
 */

function getAdminProfile(e) {
  try {

    const sessionResult = requireAdminSession(e);

    if (!sessionResult.valid) {
      return sessionResult.response;
    }

    const admin = findAdminById(sessionResult.adminId);

    if (!admin) {
      return error("Admin not found");
    }

    return success(
      buildAdminProfile(admin),
      "Admin Profile Loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET ADMIN PERMISSIONS
 * ?action=adminpermissions&session=TOKEN
 * ============================================================
 */

function getAdminPermissions(e) {
  try {

    const sessionResult = requireAdminSession(e);

    if (!sessionResult.valid) {
      return sessionResult.response;
    }

    const admin = findAdminById(sessionResult.adminId);

    if (!admin) {
      return error("Admin not found");
    }

    let permissions = {};
    try {
      permissions = JSON.parse(admin.Permissions || "{}");
    } catch (e) {
      permissions = {};
    }

    return success(
      {
        adminId: admin.AdminID,
        role: admin.Role || "",
        permissions: permissions
      },
      "Admin Permissions Loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


// ============================================================
// REUSABLE AUTHORIZATION HELPERS
// ============================================================


/**
 * ============================================================
 * REQUIRE ADMIN SESSION
 * Extracts session from parameters and validates it.
 * Can be embedded directly in any protected API.
 *
 * Usage:
 *   const sessionResult = requireAdminSession(e);
 *   if (!sessionResult.valid) return sessionResult.response;
 *   // Continue with sessionResult.adminId
 * ============================================================
 */

function requireAdminSession(e) {

  const sessionToken =
    (e.parameter.session || "").trim();

  if (!sessionToken) {
    return {
      valid: false,
      response: unauthorized()
    };
  }

  const session = findAdminSession(sessionToken);

  if (!session) {
    return {
      valid: false,
      response: unauthorized()
    };
  }

  if (String(session.Status || "").toLowerCase() !== "active") {
    return {
      valid: false,
      response: unauthorized()
    };
  }

  // Check expiry using stored SessionExpiry
  const now = new Date().getTime();

  const sessionExpiry = session.SessionExpiry
    ? new Date(session.SessionExpiry).getTime()
    : null;

  if (sessionExpiry && now > sessionExpiry) {
    markSessionExpired(sessionToken);
    return {
      valid: false,
      response: unauthorized()
    };
  }

  // Fallback to configured expiry if SessionExpiry is missing
  if (!sessionExpiry) {
    const sessionExpiryHours = CONFIG.SESSION_EXPIRY_HOURS || 24;
    const loginTime = new Date(session.LoginTime).getTime();
    const maxAge = sessionExpiryHours * 60 * 60 * 1000;

    if (now - loginTime > maxAge) {
      markSessionExpired(sessionToken);
      return {
        valid: false,
        response: unauthorized()
      };
    }
  }

  // Update last activity
  updateSessionActivity(sessionToken);

  return {
    valid: true,
    response: null,
    adminId: session.AdminID,
    session: sessionToken
  };
}


/**
 * ============================================================
 * GET CURRENT ADMIN
 * Returns admin data for the current session
 * ============================================================
 */

function getCurrentAdmin(e) {

  const sessionResult = requireAdminSession(e);

  if (!sessionResult.valid) {
    return {
      success: false,
      admin: null,
      response: sessionResult.response
    };
  }

  const admin = findAdminById(sessionResult.adminId);

  if (!admin) {
    return {
      success: false,
      admin: null,
      response: error("Admin not found")
    };
  }

  return {
    success: true,
    admin: admin,
    adminId: sessionResult.adminId,
    response: null
  };
}


/**
 * ============================================================
 * HAS PERMISSION
 * Checks if admin has a specific permission.
 * Founder has unrestricted access even with empty permissions {}.
 * Returns boolean
 * ============================================================
 */

function hasPermission(admin, permission) {

  if (!admin || !permission) {
    return false;
  }

  // Founder has unrestricted access regardless of Permissions content
  if (String(admin.Role || "").toUpperCase() === "FOUNDER") {
    return true;
  }

  let permissions = {};
  try {
    permissions = JSON.parse(admin.Permissions || "{}");
  } catch (e) {
    permissions = {};
  }

  return permissions[permission] === true;
}


/**
 * ============================================================
 * REQUIRE PERMISSION
 * Validates session and permission.
 * Returns { valid, response } for use in protected APIs.
 *
 * Usage:
 *   const permResult = requirePermission(e, "Products");
 *   if (!permResult.valid) return permResult.response;
 * ============================================================
 */

function requirePermission(e, permission) {

  const adminResult = getCurrentAdmin(e);

  if (!adminResult.success) {
    return {
      valid: false,
      response: adminResult.response
    };
  }

  if (!hasPermission(adminResult.admin, permission)) {
    return {
      valid: false,
      response: forbidden()
    };
  }

  return {
    valid: true,
    response: null,
    admin: adminResult.admin,
    adminId: adminResult.adminId
  };
}


/**
 * ============================================================
 * REQUIRE ROLE
 * Validates session and role.
 * Returns { valid, response } for use in protected APIs.
 *
 * Usage:
 *   const roleResult = requireRole(e, "FOUNDER");
 *   if (!roleResult.valid) return roleResult.response;
 * ============================================================
 */

function requireRole(e, role) {

  const adminResult = getCurrentAdmin(e);

  if (!adminResult.success) {
    return {
      valid: false,
      response: adminResult.response
    };
  }

  if (String(adminResult.admin.Role || "").toUpperCase() !== String(role || "").toUpperCase()) {
    return {
      valid: false,
      response: forbidden()
    };
  }

  return {
    valid: true,
    response: null,
    admin: adminResult.admin,
    adminId: adminResult.adminId
  };
}


/**
 * ============================================================
 * FIND ADMIN BY ID
 * Searches Admins sheet for matching AdminID.
 * Does NOT filter by IsDeleted - caller must check.
 * ============================================================
 */

function findAdminById(adminId) {

  const data = getSheetData(CONFIG.SHEETS.ADMINS);

  for (let i = 0; i < data.length; i++) {
    if (String(data[i].AdminID || "").trim().toUpperCase() === String(adminId || "").trim().toUpperCase()) {
      return data[i];
    }
  }

  return null;
}


/**
 * ============================================================
 * BUILD ADMIN PROFILE
 * Strips sensitive fields from admin data
 * ============================================================
 */

function buildAdminProfile(admin) {

  const sensitiveFields = [
    "AuthenticatorSecret",
    "RecoveryCodes"
  ];

  const profile = {};

  for (const key in admin) {
    if (!sensitiveFields.includes(key)) {
      profile[key] = admin[key];
    }
  }

  return profile;
}


/**
 * ============================================================
 * GENERATE ADMIN OTP
 * Uses existing OTP engine pattern.
 * Stores OTP keyed by AdminID (not mobile).
 * ============================================================
 */

function generateAdminOtp(adminId) {

  const otp = String(
    Math.floor(
      100000 + Math.random() * 900000
    )
  );

  const storeKey = "admin_otp_" + adminId;

  const payload = {
    adminId: adminId,
    otp: otp,
    attempts: 0,
    createdAt: new Date().getTime(),
    expiresAt: new Date().getTime() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000
  };

  PropertiesService
    .getScriptProperties()
    .setProperty(
      storeKey,
      JSON.stringify(payload)
    );

  console.log("Admin OTP for " + adminId + ": " + otp);

  return {
    otp: otp,
    payload: payload
  };
}


/**
 * ============================================================
 * VERIFY ADMIN OTP
 * Uses existing OTP engine pattern.
 * ============================================================
 */

function verifyAdminOtp(adminId, otp) {

  const storeKey = "admin_otp_" + adminId;

  const stored = PropertiesService
    .getScriptProperties()
    .getProperty(storeKey);

  if (!stored) {
    return {
      success: false,
      message: "No OTP found. Please request a new OTP."
    };
  }

  let payload;
  try {
    payload = JSON.parse(stored);
  } catch (err) {
    return {
      success: false,
      message: "Invalid OTP data. Please request a new OTP."
    };
  }

  // Check expiry
  const now = new Date().getTime();
  if (now > payload.expiresAt) {
    PropertiesService.getScriptProperties().deleteProperty(storeKey);
    return {
      success: false,
      message: "OTP has expired. Please request a new OTP."
    };
  }

  // Check max attempts
  if (payload.attempts >= CONFIG.OTP_MAX_ATTEMPTS) {
    PropertiesService.getScriptProperties().deleteProperty(storeKey);
    return {
      success: false,
      message: "Maximum OTP attempts exceeded. Please request a new OTP."
    };
  }

  // Increment attempts
  payload.attempts++;
  PropertiesService.getScriptProperties().setProperty(storeKey, JSON.stringify(payload));

  // Validate OTP
  if (String(payload.otp) !== String(otp).trim()) {
    const remaining = CONFIG.OTP_MAX_ATTEMPTS - payload.attempts;
    return {
      success: false,
      message: "Invalid OTP. " + remaining + " attempt(s) remaining."
    };
  }

  // OTP verified - cleanup
  PropertiesService.getScriptProperties().deleteProperty(storeKey);

  return {
    success: true,
    message: "OTP Verified"
  };
}


/**
 * ============================================================
 * CREATE ADMIN SESSION
 * Stores session in AdminSessions sheet.
 * Sheet must be pre-created manually with proper headers.
 * Stores SessionExpiry timestamp for reliable expiry checks.
 * ============================================================
 */

function createAdminSession(adminId, rememberSession, e) {

  const sessionToken = generateSessionToken();

  const sheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);

  if (!sheet) {
    return {
      success: false,
      message: "AdminSessions sheet not found. Contact system administrator."
    };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 1) {
    return {
      success: false,
      message: "AdminSessions sheet is empty or missing headers. Contact system administrator."
    };
  }

  const headers = data[0];

  // Verify required headers exist
  const requiredHeaders = ["SessionID", "AdminID", "Status", "SessionExpiry"];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return {
      success: false,
      message: "AdminSessions sheet is missing required columns: " + missingHeaders.join(", ") + ". Contact system administrator."
    };
  }

  // Calculate expiry timestamp
  const sessionExpiryHours = CONFIG.SESSION_EXPIRY_HOURS || 24;
  const expiryDate = new Date(
    new Date().getTime() + sessionExpiryHours * 60 * 60 * 1000
  );

  // If single active session, expire old sessions for this admin
  expireOldAdminSessions(adminId, sheet, headers);

  // Determine IP and device info
  const ip = (e.parameter._ip || "").trim();
  const device = (e.parameter._device || "").trim();
  const browser = (e.parameter._browser || "").trim();

  const row = [];
  headers.forEach(h => {
    switch (h) {
      case "SessionID":
        row.push(sessionToken);
        break;
      case "AdminID":
        row.push(adminId);
        break;
      case "LoginTime":
        row.push(new Date());
        break;
      case "LogoutTime":
        row.push("");
        break;
      case "LastActivity":
        row.push(new Date());
        break;
      case "SessionExpiry":
        row.push(expiryDate);
        break;
      case "RememberSession":
        row.push(rememberSession ? "Yes" : "No");
        break;
      case "IP":
        row.push(ip);
        break;
      case "Device":
        row.push(device);
        break;
      case "Browser":
        row.push(browser);
        break;
      case "Status":
        row.push("Active");
        break;
      default:
        row.push("");
    }
  });

  sheet.appendRow(row);

  return {
    success: true,
    session: sessionToken,
    sessionExpiry: expiryDate.toISOString()
  };
}


/**
 * ============================================================
 * FIND ADMIN SESSION
 * ============================================================
 */

function findAdminSession(sessionToken) {

  const sheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);

  if (!sheet) {
    return null;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return null;
  }

  const headers = data[0];
  const sessionCol = headers.indexOf("SessionID");

  if (sessionCol === -1) {
    return null;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionCol]).trim() === String(sessionToken).trim()) {
      const session = {};
      headers.forEach((h, index) => {
        session[h] = data[i][index];
      });
      return session;
    }
  }

  return null;
}


/**
 * ============================================================
 * UPDATE SESSION ACTIVITY
 * ============================================================
 */

function updateSessionActivity(sessionToken) {

  const sheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);

  if (!sheet) {
    return;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const headers = data[0];
  const sessionCol = headers.indexOf("SessionID");
  const activityCol = headers.indexOf("LastActivity");

  if (sessionCol === -1 || activityCol === -1) {
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionCol]).trim() === String(sessionToken).trim()) {
      sheet.getRange(i + 1, activityCol + 1).setValue(new Date());
      return;
    }
  }
}


/**
 * ============================================================
 * MARK SESSION LOGGED OUT
 * ============================================================
 */

function markSessionLoggedOut(sessionToken) {

  const sheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);

  if (!sheet) {
    return;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const headers = data[0];
  const sessionCol = headers.indexOf("SessionID");
  const statusCol = headers.indexOf("Status");
  const logoutCol = headers.indexOf("LogoutTime");

  if (sessionCol === -1 || statusCol === -1) {
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionCol]).trim() === String(sessionToken).trim()) {
      sheet.getRange(i + 1, statusCol + 1).setValue("LoggedOut");
      if (logoutCol >= 0) {
        sheet.getRange(i + 1, logoutCol + 1).setValue(new Date());
      }
      return;
    }
  }
}


/**
 * ============================================================
 * MARK SESSION EXPIRED
 * ============================================================
 */

function markSessionExpired(sessionToken) {

  const sheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);

  if (!sheet) {
    return;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const headers = data[0];
  const sessionCol = headers.indexOf("SessionID");
  const statusCol = headers.indexOf("Status");

  if (sessionCol === -1 || statusCol === -1) {
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][sessionCol]).trim() === String(sessionToken).trim()) {
      sheet.getRange(i + 1, statusCol + 1).setValue("Expired");
      return;
    }
  }
}


/**
 * ============================================================
 * EXPIRE OLD ADMIN SESSIONS
 * Ensures single active session per admin
 * ============================================================
 */

function expireOldAdminSessions(adminId, sheet, headers) {

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const adminCol = headers.indexOf("AdminID");
  const statusCol = headers.indexOf("Status");

  if (adminCol === -1 || statusCol === -1) {
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][adminCol]).trim() === String(adminId).trim() &&
      String(data[i][statusCol]).trim().toLowerCase() === "active"
    ) {
      sheet.getRange(i + 1, statusCol + 1).setValue("Expired");
    }
  }
}


/**
 * ============================================================
 * UPDATE ADMIN LAST LOGIN
 * ============================================================
 */

function updateAdminLastLogin(adminId) {

  const sheet = getSheet(CONFIG.SHEETS.ADMINS);

  if (!sheet) {
    return;
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const headers = data[0];
  const adminCol = headers.indexOf("AdminID");
  const lastLoginCol = headers.indexOf("LastLogin");

  if (adminCol === -1 || lastLoginCol === -1) {
    return;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][adminCol]).trim().toUpperCase() === String(adminId).trim().toUpperCase()) {
      sheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date());
      return;
    }
  }
}