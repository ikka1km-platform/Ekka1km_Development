/**
 * ============================================================
 * Search Analytics V4.8
 * ============================================================
 */

function getSearchHistory(e) {
  try {
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
      getSheetData("SearchAnalytics");

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
        "SearchAnalytics"
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

    getSheet(
      "SearchHistory"
    ).appendRow([
      "SH" +
        Utilities.getUuid()
          .substring(0, 8),
      userId || "",
      keyword,
      new Date()
    ]);

    const sheet =
      getSheet(
        "SearchAnalytics"
      );

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

