/**
 * ============================================================
 * Admin Analytics V4.4
 * ============================================================
 */

function getAdminStats(e) {
  try {
    return success({
      users:
        getSheetData("Users").length,

      products:
        getSheetData("Products").length,

      businesses:
        getSheetData("Businesses")
          .length,

      properties:
        getSheetData("Properties")
          .length,

      news:
        getSheetData("News").length,

      advertisements:
        getSheetData(
          "Advertisements"
        ).length,

      rewards:
        getSheetData(
          "AdRewardHistory"
        ).length
    });

  } catch (err) {
    return exception(err);
  }
}


function getDashboardStats(e) {
  return getAdminStats(e);
}


function getActivityStats(e) {
  try {
    const logs =
      getSheetData(
        "ActivityLogs"
      );

    return success({
      totalActivities:
        logs.length,
      data: logs
    });

  } catch (err) {
    return exception(err);
  }
}

