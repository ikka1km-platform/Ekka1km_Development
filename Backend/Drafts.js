/**
 * ============================================================
 * EKKA1KM BACKEND
 * Drafts.js
 * Phase 4.6 - Draft System
 * Generic draft storage for all content types
 * ============================================================
 */

/**
 * ============================================================
 * ENSURE DRAFTS SHEET EXISTS
 * ============================================================
 */
function ensureDraftsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Drafts");
  if (!sheet) {
    sheet = ss.insertSheet("Drafts");
    sheet.appendRow(["DraftID", "UserID", "ContentType", "ContentID", "Data", "Status", "CreatedDate", "UpdatedDate"]);
    Logger.log("Sheet created: Drafts with headers: DraftID, UserID, ContentType, ContentID, Data, Status, CreatedDate, UpdatedDate");
  }
  return sheet;
}

/**
 * ============================================================
 * SAVE DRAFT
 * ?action=savedraft&userId=U001&contentType=Product&contentId=P001&data={...}
 * ============================================================
 */
function saveDraft(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var contentType = p.contentType || "";
    var contentId = p.contentId || "";
    var data = p.data || "";

    if (!userId || !contentType) {
      return error("userId and contentType required");
    }

    ensureDraftsSheet();

    var sheet = getSheet("Drafts");
    var dataRange = sheet.getDataRange().getValues();
    var existingRow = -1;

    // Check if draft exists
    for (var i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][1]) === String(userId) && 
          String(dataRange[i][2]) === String(contentType) && 
          String(dataRange[i][3]) === String(contentId)) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > 0) {
      // Update existing draft
      sheet.getRange(existingRow, 5).setValue(data);
      sheet.getRange(existingRow, 6).setValue("Saved");
      sheet.getRange(existingRow, 8).setValue(new Date());
    } else {
      // Create new draft
      var draftId = "DR" + Utilities.getUuid().substring(0, 8);
      sheet.appendRow([draftId, userId, contentType, contentId, data, "Saved", new Date(), new Date()]);
    }

    return success({ saved: true }, "Draft saved successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * LOAD DRAFT
 * ?action=loaddraft&userId=U001&contentType=Product&contentId=P001
 * ============================================================
 */
function loadDraft(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var contentType = p.contentType || "";
    var contentId = p.contentId || "";

    if (!userId || !contentType) {
      return error("userId and contentType required");
    }

    var drafts = getSheetData("Drafts") || [];
    var result = [];

    if (contentId) {
      // Load specific draft
      drafts.forEach(function(d) {
        if (String(d.UserID) === String(userId) && 
            String(d.ContentType) === String(contentType) && 
            String(d.ContentID) === String(contentId)) {
          result.push(d);
        }
      });
    } else {
      // Load all drafts for user and content type
      drafts.forEach(function(d) {
        if (String(d.UserID) === String(userId) && String(d.ContentType) === String(contentType)) {
          result.push(d);
        }
      });
    }

    result.sort(function(a, b) { return new Date(b.UpdatedDate) - new Date(a.UpdatedDate); });

    return success({ count: result.length, data: result }, "Drafts loaded");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE DRAFT
 * ?action=deletedraft&draftId=DR001
 * ============================================================
 */
function deleteDraft(e) {
  try {
    var draftId = e && e.parameter ? e.parameter.draftId || "" : "";
    if (!draftId) return error("draftId required");

    var sheet = getSheet("Drafts");
    if (!sheet) return error("Draft not found");

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(draftId)) {
        sheet.deleteRow(i + 1);
        return success({ deleted: true }, "Draft deleted successfully");
      }
    }

    return error("Draft not found");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * AUTO SAVE DRAFT
 * ?action=autosave&userId=U001&contentType=Product&data={...}
 * ============================================================
 */
function autoSaveDraft(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";
    var contentType = p.contentType || "";
    var data = p.data || "";

    if (!userId || !contentType || !data) {
      return error("userId, contentType, and data required");
    }

    ensureDraftsSheet();

    var sheet = getSheet("Drafts");
    var dataRange = sheet.getDataRange().getValues();
    var existingRow = -1;

    // Find most recent draft for this user and content type
    for (var i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][1]) === String(userId) && String(dataRange[i][2]) === String(contentType)) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > 0) {
      // Update existing draft
      sheet.getRange(existingRow, 5).setValue(data);
      sheet.getRange(existingRow, 6).setValue("AutoSaved");
      sheet.getRange(existingRow, 8).setValue(new Date());
    } else {
      // Create new draft
      var draftId = "DR" + Utilities.getUuid().substring(0, 8);
      sheet.appendRow([draftId, userId, contentType, "", data, "AutoSaved", new Date(), new Date()]);
    }

    return success({ autoSaved: true }, "Draft auto-saved");

  } catch (err) {
    return exception(err);
  }
}