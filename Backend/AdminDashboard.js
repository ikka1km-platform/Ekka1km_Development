/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminDashboard.js
 * V5.10.0 - SUPER ADMIN DASHBOARD (Phase 5.2)
 * ============================================================
 */


/**
 * ============================================================
 * ADMIN DASHBOARD SUMMARY
 * Lightweight aggregation of existing analytics.
 * ?action=admindashboardsummary&session=TOKEN
 * ============================================================
 */

function getAdminDashboardSummary(e) {
  try {

    // Validate admin session
    const sessionResult = requireAdminSession(e);

    if (!sessionResult.valid) {
      return sessionResult.response;
    }

    // Aggregate existing analytics (reuse existing functions)
    const overview = getDashboardOverviewData();
    const revenue = getRevenueData();
    const health = getHealthData();
    const live = getLiveData();

    return success(
      {
        cards: {
          totalUsers: overview.totalUsers || 0,
          totalProducts: overview.totalProducts || 0,
          totalBusinesses: overview.totalBusinesses || 0,
          totalProperties: overview.totalProperties || 0,
          totalRevenue: revenue.totalRevenue || 0,
          coinsDistributed: revenue.coinsDistributed || 0,
          liveUsers: live.liveUsers || 0,
          activeCities: overview.activeCities || 0,
          pendingApprovals: overview.pendingApprovals || 0
        },
        systemHealth: health,
        admin: {
          adminId: sessionResult.adminId
        }
      },
      "Dashboard Summary Loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET DASHBOARD OVERVIEW DATA
 * Reuses existing sheet counts
 * ============================================================
 */

function getDashboardOverviewData() {

  const result = {
    totalUsers: 0,
    totalProducts: 0,
    totalBusinesses: 0,
    totalProperties: 0,
    totalNews: 0,
    totalMedia: 0,
    totalOrders: 0,
    totalLiveChannels: 0,
    activeCities: 0,
    pendingApprovals: 0
  };

  try {
    const usersSheet = getSheet(CONFIG.SHEETS.USERS);
    if (usersSheet) result.totalUsers = Math.max(0, usersSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const productsSheet = getSheet(CONFIG.SHEETS.PRODUCTS);
    if (productsSheet) result.totalProducts = Math.max(0, productsSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const businessesSheet = getSheet(CONFIG.SHEETS.BUSINESSES);
    if (businessesSheet) result.totalBusinesses = Math.max(0, businessesSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const propertiesSheet = getSheet(CONFIG.SHEETS.PROPERTIES);
    if (propertiesSheet) result.totalProperties = Math.max(0, propertiesSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const newsSheet = getSheet(CONFIG.SHEETS.NEWS);
    if (newsSheet) result.totalNews = Math.max(0, newsSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const mediaSheet = getSheet(CONFIG.SHEETS.MEDIA);
    if (mediaSheet) result.totalMedia = Math.max(0, mediaSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const ordersSheet = getSheet(CONFIG.SHEETS.ORDERS);
    if (ordersSheet) result.totalOrders = Math.max(0, ordersSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  try {
    const liveSheet = getSheet(CONFIG.SHEETS.LIVE);
    if (liveSheet) result.totalLiveChannels = Math.max(0, liveSheet.getLastRow() - 1);
  } catch (e) { /* ignore */ }

  // Pending approvals from ModerationQueue
  try {
    const modSheet = getSheet(CONFIG.SHEETS.MODERATION_QUEUE);
    if (modSheet) {
      const modData = modSheet.getDataRange().getValues();
      if (modData.length > 1) {
        const headers = modData[0];
        const statusCol = headers.indexOf("Status");
        if (statusCol >= 0) {
          let pending = 0;
          for (let i = 1; i < modData.length; i++) {
            if (String(modData[i][statusCol] || "").toLowerCase() === "pending") {
              pending++;
            }
          }
          result.pendingApprovals = pending;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Active cities (unique cities from Users sheet)
  try {
    const usersSheet = getSheet(CONFIG.SHEETS.USERS);
    if (usersSheet) {
      const userData = usersSheet.getDataRange().getValues();
      if (userData.length > 1) {
        const headers = userData[0];
        const cityCol = headers.indexOf("City");
        if (cityCol >= 0) {
          const cities = new Set();
          for (let i = 1; i < userData.length; i++) {
            const city = String(userData[i][cityCol] || "").trim();
            if (city) cities.add(city);
          }
          result.activeCities = cities.size;
        }
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}


/**
 * ============================================================
 * GET REVENUE DATA
 * ============================================================
 */

function getRevenueData() {

  const result = {
    totalRevenue: 0,
    coinsDistributed: 0
  };

  // Revenue from WalletTransactions
  try {
    const txSheet = getSheet("WalletTransactions");
    if (txSheet) {
      const txData = txSheet.getDataRange().getValues();
      if (txData.length > 1) {
        const headers = txData[0];
        const amountCol = headers.indexOf("Amount");
        if (amountCol >= 0) {
          let revenue = 0;
          for (let i = 1; i < txData.length; i++) {
            revenue += Number(txData[i][amountCol] || 0);
          }
          result.totalRevenue = revenue;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Coins distributed from RewardEngine
  try {
    const rewardSheet = getSheet("AdRewardHistory");
    if (rewardSheet) {
      const rewardData = rewardSheet.getDataRange().getValues();
      if (rewardData.length > 1) {
        const headers = rewardData[0];
        const coinsCol = headers.indexOf("Coins");
        if (coinsCol >= 0) {
          let coins = 0;
          for (let i = 1; i < rewardData.length; i++) {
            coins += Number(rewardData[i][coinsCol] || 0);
          }
          result.coinsDistributed = coins;
        }
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}


/**
 * ============================================================
 * GET LIVE DATA
 * ============================================================
 */

function getLiveData() {

  const result = {
    liveUsers: 0
  };

  // Live users from LiveViewers
  try {
    const viewersSheet = getSheet(CONFIG.SHEETS.LIVE_VIEWERS);
    if (viewersSheet) {
      const viewerData = viewersSheet.getDataRange().getValues();
      if (viewerData.length > 1) {
        const headers = viewerData[0];
        const statusCol = headers.indexOf("Status");
        if (statusCol >= 0) {
          let active = 0;
          for (let i = 1; i < viewerData.length; i++) {
            if (String(viewerData[i][statusCol] || "").toLowerCase() === "active") {
              active++;
            }
          }
          result.liveUsers = active;
        }
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}


/**
 * ============================================================
 * GET HEALTH DATA
 * ============================================================
 */

function getHealthData() {

  const result = {
    backendApi: "ONLINE",
    googleSheets: "ONLINE",
    imageKit: "UNKNOWN",
    smsService: "UNKNOWN",
    storage: "ONLINE",
    appVersion: CONFIG.VERSION || "5.9.0"
  };

  // Check Google Sheets connectivity
  try {
    const ss = getSpreadsheet();
    if (ss) {
      result.googleSheets = "ONLINE";
      result.storage = "ONLINE";
    }
  } catch (e) {
    result.googleSheets = "OFFLINE";
    result.storage = "OFFLINE";
  }

  // ImageKit status (placeholder)
  try {
    if (typeof getImageKitStatus === "function") {
      result.imageKit = getImageKitStatus();
    }
  } catch (e) {
    result.imageKit = "UNKNOWN";
  }

  // SMS service status
  result.smsService = CONFIG.OTP_PROVIDER === "MSG91" ? "CONFIGURED" : "LOCAL";

  return result;
}


/**
 * ============================================================
 * EXISTING FUNCTIONS (V5.7.0 - kept for backward compatibility)
 * ============================================================
 */

function getDashboardOverview(e) {
  return success(getDashboardOverviewData(), "Dashboard Overview");
}


function getDashboardUsers(e) {
  const data = getDashboardOverviewData();
  return success({
    totalUsers: data.totalUsers,
    activeUsers: data.totalUsers,
    blockedUsers: 0,
    newUsersToday: 0
  }, "Dashboard Users");
}


function getDashboardRevenue(e) {
  const data = getRevenueData();
  return success({
    totalWalletRecords: 0,
    totalRewardCoins: data.coinsDistributed,
    totalPromotions: 0
  }, "Dashboard Revenue");
}


function getDashboardLive(e) {
  const data = getLiveData();
  return success({
    totalLiveChannels: 0,
    totalSubscribers: 0,
    totalChats: 0,
    liveUsers: data.liveUsers
  }, "Dashboard Live");
}


function getDashboardHealth(e) {
  return success(getHealthData(), "System Health");
}


function getAdminAlerts(e) {
  const sheet = getSheet(CONFIG.SHEETS.ADMIN_ALERTS);
  const data = sheet ? sheet.getDataRange().getValues() : [];
  return success({
    totalAlerts: data.length > 1 ? data.length - 1 : 0,
    alerts: data.length > 1 ? data.slice(1) : []
  }, "Admin Alerts");
}


function getSystemLogs(e) {
  const sheet = getSheet(CONFIG.SHEETS.SYSTEM_LOGS);
  const data = sheet ? sheet.getDataRange().getValues() : [];
  return success({
    totalLogs: data.length > 1 ? data.length - 1 : 0,
    logs: data.length > 1 ? data.slice(1) : []
  }, "System Logs");
}