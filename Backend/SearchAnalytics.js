/**
 * ============================================================
 * Search Analytics V4.8
 * ============================================================
 */

function getSearchAnalyticsSheetName_() {
  try {
    var ss = getSpreadsheet();
    if (ss && ss.getSheetByName("SearchAnalytics")) return "SearchAnalytics";
    if (ss && ss.getSheetByName("SearchAnalystics")) return "SearchAnalystics";
  } catch (e) {}
  return "SearchAnalytics";
}

function getSearchAnalyticsSheet_() {
  try {
    var ss = getSpreadsheet();
    if (!ss) return null;
    return ss.getSheetByName("SearchAnalytics") || ss.getSheetByName("SearchAnalystics") || ss.getSheetByName(getSearchAnalyticsSheetName_());
  } catch (e) {
    return null;
  }
}

function ensureSearchHistoryHeaders_(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(["SearchID", "UserID", "Keyword", "Timestamp"]);
    return;
  }
  var firstRowValues = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 4)).getValues()[0];
  var firstCell = String(firstRowValues[0] || "").trim();
  if (firstCell !== "SearchID") {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, 4).setValues([["SearchID", "UserID", "Keyword", "Timestamp"]]);
  }
}

function getSearchHistory(e) {
  try {
    var sheet = getSheet("SearchHistory");
    if (sheet) {
      ensureSearchHistoryHeaders_(sheet);
    }
    return success(
      getSheetData("SearchHistory")
    );
  } catch (err) {
    return exception(err);
  }
}


function getPopularSearches(e) {
  try {
    const data =
      getSheetData(getSearchAnalyticsSheetName_());

    const result =
      data.sort(function (a, b) {
        return (
          Number(b.SearchCount || 0) -
          Number(a.SearchCount || 0)
        );
      });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}


function getTrendingSearches(e) {
  try {
    return getPopularSearches(e);

  } catch (err) {
    return exception(err);
  }
}


function getSearchAnalytics(e) {
  try {
    return success(
      getSheetData(
        getSearchAnalyticsSheetName_()
      )
    );

  } catch (err) {
    return exception(err);
  }
}


function saveSearchHistory(
  userId,
  keyword
) {
  try {

    if (!keyword) {
      return;
    }

    var histSheet = getSheet("SearchHistory");
    if (histSheet) {
      ensureSearchHistoryHeaders_(histSheet);
      histSheet.appendRow([
        "SH" +
          Utilities.getUuid()
            .substring(0, 8),
        userId || "",
        keyword,
        new Date()
      ]);
    }

    const sheet =
      getSearchAnalyticsSheet_();

    if (!sheet) return;

    const data =
      sheet
        .getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {
      if (
        String(data[i][0])
          .toLowerCase() ===
        String(keyword)
          .toLowerCase()
      ) {

        sheet
          .getRange(i + 1, 2)
          .setValue(
            Number(
              data[i][1] || 0
            ) + 1
          );

        sheet
          .getRange(i + 1, 3)
          .setValue(
            new Date()
          );

        return;
      }
    }

    sheet.appendRow([
      keyword,
      1,
      new Date()
    ]);

  } catch (err) {
    logError(
      "SearchAnalytics",
      err
    );
  }
}

