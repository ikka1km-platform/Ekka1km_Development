/**
 * ============================================================
 * EKKA1KM BACKEND
 * RemoteControl.js
 * V5.8.1 - AppCreator24 Remote Controls
 * ============================================================
 */


/**
 * ============================================================
 * Read Entire Sheet as JSON
 * ============================================================
 */
function getSheetDataAsJson(sheetName) {
  try {
    const sheet = getSheet(sheetName);

    if (!sheet) {
      return [];
    }

    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return [];
    }

    const headers = data[0];

    return data.slice(1).map(function (row) {
      const obj = {};

      headers.forEach(function (header, index) {
        obj[header] = row[index];
      });

      return obj;
    });

  } catch (err) {
    Logger.log(err);
    return [];
  }
}


/**
 * ============================================================
 * Deep Links
 * ============================================================
 */
function getDeepLinks() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.DEEP_LINKS
  );
}


/**
 * ============================================================
 * App Colors
 * ============================================================
 */
function getAppColors() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.APP_COLORS
  );
}


/**
 * ============================================================
 * App Navigation
 * ============================================================
 */
function getAppNavigation() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.APP_NAVIGATION
  );
}


/**
 * ============================================================
 * Social Links
 * ============================================================
 */
function getAppSocialLinks() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.APP_SOCIAL_LINKS
  );
}


/**
 * ============================================================
 * Contact Information
 * ============================================================
 */
function getContactInfo() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.CONTACT_INFO
  );
}


/**
 * ============================================================
 * App Assets
 * ============================================================
 */
function getAppAssets() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.APP_ASSETS
  );
}


/**
 * ============================================================
 * Popup Messages
 * ============================================================
 */
function getPopupMessages() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.POPUP_MESSAGES
  );
}


/**
 * ============================================================
 * Onboarding
 * ============================================================
 */
function getOnboarding() {
  return getSheetDataAsJson(
    CONFIG.SHEETS.ONBOARDING
  );
}

