/**
 * ============================================================
 * Search APIs
 * V4.8
 * ============================================================
 */

function search(e) {
  try {

    const keyword =
      e.parameter.keyword || "";

    const userId =
      e.parameter.userId || "";

    saveSearchHistory(
      userId,
      keyword
    );

    return success({
      keyword: keyword,
      count: 0,
      data: []
    }, "Search Loaded");

  } catch (err) {
    return exception(err);
  }
}

