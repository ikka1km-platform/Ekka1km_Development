/**
 * ============================================================
 * Dashboard Analytics V4.9
 * ============================================================
 */

function getRevenueAnalytics(e) {
  try {

    const tx =
      getSheetData(
        "WalletTransactions"
      );

    let revenue = 0;

    tx.forEach(function (t) {
      revenue += Number(
        t.Amount || 0
      );
    });

    return success({
      totalRevenue:
        revenue
    });

  } catch (err) {
    return exception(err);
  }
}


function getUserAnalytics(e) {
  try {
    return success({
      totalUsers:
        getSheetData(
          "Users"
        ).length
    });

  } catch (err) {
    return exception(err);
  }
}


function getGpsAnalytics(e) {
  try {
    return success({
      message:
        "GPS analytics coming soon"
    });

  } catch (err) {
    return exception(err);
  }
}


function getCampaignAnalytics(e) {
  try {
    return success({
      totalCampaigns:
        getSheetData(
          "Campaigns"
        ).length
    });

  } catch (err) {
    return exception(err);
  }
}


function getDailyStats(e) {
  try {
    return success(
      getSheetData(
        "DailyStats"
      )
    );

  } catch (err) {
    return exception(err);
  }
}

