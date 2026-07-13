/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminDashboard.js
 * V5.7.0
 * ============================================================
 */

function getDashboardOverview(e) {
  return success({
    totalUsers:
      getSheet(CONFIG.SHEETS.USERS).getLastRow() - 1,

    totalProducts:
      getSheet(CONFIG.SHEETS.PRODUCTS).getLastRow() - 1,

    totalBusinesses:
      getSheet(CONFIG.SHEETS.BUSINESSES).getLastRow() - 1,

    totalProperties:
      getSheet(CONFIG.SHEETS.PROPERTIES).getLastRow() - 1,

    totalNews:
      getSheet(CONFIG.SHEETS.NEWS).getLastRow() - 1,

    totalMedia:
      getSheet(CONFIG.SHEETS.MEDIA).getLastRow() - 1,

    totalOrders:
      getSheet(CONFIG.SHEETS.ORDERS).getLastRow() - 1,

    totalLiveChannels:
      getSheet(CONFIG.SHEETS.LIVE).getLastRow() - 1
  }, "Dashboard Overview");
}


function getDashboardUsers(e) {
  const total =
    getSheet(CONFIG.SHEETS.USERS).getLastRow() - 1;

  return success({
    totalUsers: total,
    activeUsers: total,
    blockedUsers: 0,
    newUsersToday: 0
  }, "Dashboard Users");
}


function getDashboardRevenue(e) {
  return success({
    totalWalletRecords:
      getSheet(CONFIG.SHEETS.WALLET).getLastRow() - 1,

    totalRewardCoins: 0,

    totalPromotions:
      getSheet(
        CONFIG.SHEETS.PROMOTION_CAMPAIGNS
      ).getLastRow() - 1
  }, "Dashboard Revenue");
}


function getDashboardLive(e) {
  return success({
    totalLiveChannels:
      getSheet(CONFIG.SHEETS.LIVE).getLastRow() - 1,

    totalSubscribers:
      getSheet(
        CONFIG.SHEETS.LIVE_SUBSCRIBERS
      ).getLastRow() - 1,

    totalChats:
      getSheet(
        CONFIG.SHEETS.LIVE_CHAT
      ).getLastRow() - 1
  }, "Dashboard Live");
}


function getDashboardHealth(e) {
  return success({
    database: "ONLINE",
    api: "ONLINE",
    timestamp: new Date(),
    totalSheets:
      getSpreadsheet()
        .getSheets()
        .length
  }, "System Health");
}


function getAdminAlerts(e) {
  const sheet =
    getSheet(CONFIG.SHEETS.ADMIN_ALERTS);

  const data =
    sheet.getDataRange().getValues();

  return success({
    totalAlerts: data.length - 1,
    alerts: data.slice(1)
  }, "Admin Alerts");
}


function getSystemLogs(e) {
  const sheet =
    getSheet(CONFIG.SHEETS.SYSTEM_LOGS);

  const data =
    sheet.getDataRange().getValues();

  return success({
    totalLogs: data.length - 1,
    logs: data.slice(1)
  }, "System Logs");
}

