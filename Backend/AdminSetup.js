/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminSetup.js
 * V5.10.0 - ADMIN DATABASE SETUP (Phase 5.1)
 * One-time utility to initialize Admin sheets and Founder account
 * ============================================================
 */


/**
 * ============================================================
 * INITIALIZE ADMIN DATABASE
 * ?action=initializeadmindatabase&session=TOKEN
 * Founder only. Creates Admins and AdminSessions sheets,
 * adds missing columns, and creates default Founder account.
 * ============================================================
 */

function initializeAdminDatabase(e) {

  try {

    // Check if running from Apps Script editor (manual execution)
    // or from web API (requires authentication)
    const isManualRun = !e || !e.parameter;

    if (!isManualRun) {
      // Web API execution - require Founder session
      const sessionResult = requireAdminSession(e);

      if (!sessionResult.valid) {
        return sessionResult.response;
      }

      // Verify Founder role
      const admin = sessionResult.admin;

      if (!admin || admin.Role !== "Founder") {
        return error("Only Founder can initialize admin database");
      }
    }

    const result = {
      sheetsCreated: [],
      sheetsUpdated: [],
      columnsAdded: [],
      founderCreated: false,
      founderAlreadyExists: false
    };

    // Step 1: Create/verify Admins sheet
    const adminsSheet = getOrCreateSheet("Admins");
    result.sheetsCreated.push("Admins");

    // Step 2: Create/verify AdminSessions sheet
    const sessionsSheet = getOrCreateSheet("AdminSessions");
    result.sheetsCreated.push("AdminSessions");

    // Step 3: Verify Admins sheet headers
    const adminsHeaders = [
      "AdminID",
      "AdminCode",
      "UserID",
      "FullName",
      "Photo",
      "Mobile",
      "Email",
      "EmployeeID",
      "Department",
      "Designation",
      "Role",
      "Permissions",
      "Status",
      "AuthenticatorEnabled",
      "AuthenticatorSecret",
      "RecoveryCodes",
      "LastLogin",
      "CreatedDate",
      "IsDeleted"
    ];

    const adminsUpdate = ensureSheetHeaders(adminsSheet, adminsHeaders);
    result.sheetsUpdated.push("Admins");
    result.columnsAdded.push(...adminsUpdate);

    // Step 4: Verify AdminSessions sheet headers
    const sessionsHeaders = [
      "SessionID",
      "AdminID",
      "LoginTime",
      "LogoutTime",
      "LastActivity",
      "RememberSession",
      "SessionExpiry",
      "IP",
      "Device",
      "Browser",
      "Status"
    ];

    const sessionsUpdate = ensureSheetHeaders(sessionsSheet, sessionsHeaders);
    result.sheetsUpdated.push("AdminSessions");
    result.columnsAdded.push(...sessionsUpdate);

    // Step 5: Create Founder account if not exists
    const founderExists = checkIfAdminExists("EKKA001");

    if (!founderExists) {
      const now = new Date();
      const founderRow = [
        "EKKA001",           // AdminID
        "",                  // AdminCode
        "",                  // UserID
        "Founder",           // FullName
        "",                  // Photo
        "",                  // Mobile
        "",                  // Email
        "",                  // EmployeeID
        "",                  // Department
        "Founder",           // Designation
        "Founder",           // Role
        "{}",                // Permissions (JSON)
        "Active",            // Status
        "FALSE",             // AuthenticatorEnabled
        "",                  // AuthenticatorSecret
        "",                  // RecoveryCodes
        "",                  // LastLogin
        now.toISOString(),   // CreatedDate
        "FALSE"              // IsDeleted
      ];

      adminsSheet.appendRow(founderRow);
      result.founderCreated = true;
    } else {
      result.founderAlreadyExists = true;
    }

    return success(result, "Admin database initialized successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET OR CREATE SHEET
 * Returns existing sheet or creates new one
 * ============================================================
 */

function getOrCreateSheet(sheetName) {

  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}


/**
 * ============================================================
 * ENSURE SHEET HEADERS
 * Adds missing headers to sheet without removing existing data
 * ============================================================
 */

function ensureSheetHeaders(sheet, requiredHeaders) {

  const added = [];
  const existingData = sheet.getDataRange().getValues();

  if (existingData.length > 0) {
    const currentHeaders = existingData[0];

    // Find missing columns
    for (let i = 0; i < requiredHeaders.length; i++) {
      const header = requiredHeaders[i];
      const index = currentHeaders.indexOf(header);

      if (index === -1) {
        // Column doesn't exist, add it
        sheet.getRange(1, currentHeaders.length + 1).setValue(header);
        added.push(header);
        currentHeaders.push(header);
      }
    }
  } else {
    // No data, just add headers
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
  }

  return added;
}


/**
 * ============================================================
 * CHECK IF ADMIN EXISTS
 * Checks if an admin with given AdminID exists
 * ============================================================
 */

function checkIfAdminExists(adminId) {

  try {
    const sheet = getSheet("Admins");

    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return false;

    const headers = data[0];
    const adminIdCol = headers.indexOf("AdminID");

    if (adminIdCol === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][adminIdCol] || "").trim() === adminId) {
        return true;
      }
    }

    return false;

  } catch (e) {
    return false;
  }
}