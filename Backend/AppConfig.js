/**
 * ============================================================
 * EKKA1KM BACKEND
 * V5.8.0 - APPCREATOR24 CONFIG APIs
 * AppConfig.js
 * ============================================================
 */

function getKeyValueSheet(sheetName) {
  const rows =
    getSheetData(sheetName);

  const data = {};

  rows.forEach(row => {
    if (row.Key) {
      data[row.Key] =
        row.Value;
    }
  });

  return data;
}

