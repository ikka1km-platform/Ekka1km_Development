/**
 * ============================================================
 * EKKA1KM BACKEND
 * DebugAdminSetup.js
 * Debug utility to trace initializeAdminDatabase() execution
 * ============================================================
 */

function debugInitializeAdminDatabase() {
  
  console.log("=== DEBUG: initializeAdminDatabase() Execution Trace ===\n");
  
  // Step 1: Show what getSpreadsheet() returns
  console.log("STEP 1: getSpreadsheet()");
  const ss = getSpreadsheet();
  console.log("Spreadsheet URL: " + ss.getUrl());
  console.log("Spreadsheet Name: " + ss.getName());
  console.log("Spreadsheet ID: " + ss.getId());
  console.log("");
  
  // Step 2: Show existing sheets before creation
  console.log("STEP 2: Existing sheets BEFORE insertSheet()");
  const existingSheets = ss.getSheets().map(s => s.getName());
  console.log("Sheet names: " + existingSheets.join(", "));
  console.log("Admins exists: " + (ss.getSheetByName("Admins") ? "YES" : "NO"));
  console.log("AdminSessions exists: " + (ss.getSheetByName("AdminSessions") ? "YES" : "NO"));
  console.log("");
  
  // Step 3: Test getOrCreateSheet("Admins")
  console.log("STEP 3: getOrCreateSheet('Admins')");
  const adminsSheet = getOrCreateSheet("Admins");
  console.log("Returned sheet: " + (adminsSheet ? adminsSheet.getName() : "NULL"));
  console.log("Sheet URL: " + (adminsSheet ? adminsSheet.getParent().getUrl() : "N/A"));
  console.log("");
  
  // Step 4: Show all sheets after Admins creation
  console.log("STEP 4: All sheets AFTER creating Admins");
  const sheetsAfterAdmins = ss.getSheets().map(s => s.getName());
  console.log("Sheet names: " + sheetsAfterAdmins.join(", "));
  console.log("");
  
  // Step 5: Test getOrCreateSheet("AdminSessions")
  console.log("STEP 5: getOrCreateSheet('AdminSessions')");
  const sessionsSheet = getOrCreateSheet("AdminSessions");
  console.log("Returned sheet: " + (sessionsSheet ? sessionsSheet.getName() : "NULL"));
  console.log("Sheet URL: " + (sessionsSheet ? sessionsSheet.getParent().getUrl() : "N/A"));
  console.log("");
  
  // Step 6: Show all sheets after both creations
  console.log("STEP 6: All sheets AFTER creating both sheets");
  const sheetsAfterBoth = ss.getSheets().map(s => s.getName());
  console.log("Sheet names: " + sheetsAfterBoth.join(", "));
  console.log("");
  
  // Step 7: Verify checkIfAdminExists behavior
  console.log("STEP 7: checkIfAdminExists('EKKA001')");
  const founderExists = checkIfAdminExists("EKKA001");
  console.log("Founder exists: " + founderExists);
  console.log("");
  
  // Step 8: Final verification
  console.log("STEP 8: Final Verification");
  const finalAdmins = ss.getSheetByName("Admins");
  const finalSessions = ss.getSheetByName("AdminSessions");
  console.log("Admins sheet exists in spreadsheet: " + (finalAdmins ? "YES" : "NO"));
  console.log("AdminSessions sheet exists in spreadsheet: " + (finalSessions ? "YES" : "NO"));
  console.log("");
  
  console.log("=== DEBUG COMPLETE ===");
  console.log("EXACT SPREADSHEET URL WHERE SHEETS WERE CREATED: " + ss.getUrl());
  
  return {
    spreadsheetUrl: ss.getUrl(),
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    adminsCreated: !!finalAdmins,
    sessionsCreated: !!finalSessions,
    founderExists: founderExists
  };
}