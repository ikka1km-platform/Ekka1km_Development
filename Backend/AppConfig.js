/**
 * ============================================================
 * EKKA1KM BACKEND
 * V5.8.0 - APPCREATOR24 CONFIG APIs
 * AppConfig.js
 * ============================================================
 */

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(
    CONFIG.SPREADSHEET_ID
  );

  const sheet = ss.getSheetByName(
    sheetName
  );

  if (!sheet) {
    return [];
  }

  const values =
    sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];

  return values.slice(1).map(row => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  });
}


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

