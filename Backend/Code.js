/**
 * ============================================================
 * EKKA1KM BACKEND
 * Code.gs
 * Main API Router
 * V5.8.3 - CORS Support
 * ============================================================
 */

function doGet(e) {
  try {
    const action = getAction(e);

    switch (action) {

      // System
      case "test":
        return success({
          app: getAppName(),
          version: getVersion(),
          serverTime: new Date()
        }, "Backend Connected");

      case "settings":
        return success(
          getAppSettings(),
          "Settings Loaded"
        );

      // Location
      case "setradius":
        return setRadius(e);

      case "getradius":
        return getRadius(e);

      case "setlocation":
        return setRadius(e);

      case "getlocation":
        return getRadius(e);

      // Products
      case "products":
        return getProducts(e);

      case "product":
        return getProduct(e);

      case "addproduct":
        return addProduct(e);

      case "updateproduct":
        return updateProduct(e);

      case "deleteproduct":
        return deleteProduct(e);

      // Businesses
      case "businesses":
        return getBusinesses(e);

      case "business":
        return getBusiness(e);

      case "addbusiness":
        return addBusiness(e);

      case "updatebusiness":
        return updateBusiness(e);

      case "deletebusiness":
        return deleteBusiness(e);

  // Users
  case "users":
    return getUsers();

  case "profile":
    return getProfile(e);

  case "updateprofile":
    return updateProfile(e);

      // Authentication
      case "login":
        return loginUser(e);

      case "register":
        return registerUser(e);

      // Wallet
      case "wallet":
        return getWallet(e);

      case "wallettransactions":
        return getWalletTransactions(e);

      // Orders
      case "orders":
        return getOrders(e);

      // Media
      case "media":
        return getMedia(e);

      // Promotions
      case "promotioncampaigns":
        return getPromotionCampaigns(e);

      // News
      case "news":
        return getNews(e);

      case "article":
        return getArticle(e);

      case "addnews":
        return addNews(e);

      case "updatenews":
        return updateNews(e);

      case "deletenews":
        return deleteNews(e);

      // Properties
      case "properties":
        return getProperties(e);

      case "property":
        return getProperty(e);

      case "addproperty":
        return addProperty(e);

      case "updateproperty":
        return updateProperty(e);

      case "deleteproperty":
        return deleteProperty(e);

      // Advertisements
      case "advertisements":
        return getAdvertisements(e);

      case "advertisement":
        return getAdvertisement(e);

      case "pipads":
        return getPipAds(e);

      case "addadvertisement":
        return addAdvertisement(e);

      case "updateadvertisement":
        return updateAdvertisement(e);

      case "deleteadvertisement":
        return deleteAdvertisement(e);

      // Reward Engine
      case "rewardhistory":
        return getRewardHistory(e);

      case "reward":
        return getReward(e);

      case "updaterewardprogress":
        return updateRewardProgress(e);

      case "claimreward":
        return claimReward(e);

      // Reward Analytics
      case "rewardstats":
        return getRewardStats(e);

      case "userrewardstats":
        return getUserRewardStats(e);

      case "adrewardstats":
        return getAdRewardStats(e);

      case "toprewardedusers":
        return getTopRewardedUsers(e);

      case "toprewardedads":
        return getTopRewardedAds(e);

      case "rewardpools":
        return getRewardPools(e);

      // Notifications
case "notifications":
  return getNotifications(e);

case "notification":
  return getNotification(e);

case "unreadnotifications":
  return getUnreadNotifications(e);

  case "createnotification":
  return createNotification(e);

case "notifications_pending":
  return getPendingNotifications(e);

case "marknotificationread":
  return markNotificationRead(e);

case "notification_sent":
  return markNotificationSent(e);



      // Campaigns
      case "campaigns":
        return getCampaigns(e);

      case "campaign":
        return getCampaign(e);

      case "campaignstats":
        return getCampaignStats(e);

      // Redemptions
      case "redemptions":
        return getRedemptions(e);

      case "redemption":
        return getRedemption(e);

      // Moderation
      case "reports":
        return getReports(e);

      case "report":
        return getReport(e);

      // Live
      case "live":
        return getLive(e);

      case "livechannel":
        return getLiveChannel(e);

      case "livenow":
        return getLiveNow(e);

      case "piplive":
        return getPipLive(e);

      case "featuredlive":
        return getFeaturedLive(e);

      case "livebanner":
        return getLiveBanner(e);

      case "livecategories":
        return getLiveCategories(e);

      case "livestreamsbycategory":
        return getLiveStreamsByCategory(e);

      case "livestreamsbycity":
        return getLiveStreamsByCity(e);

      case "livesubscribers":
        return getLiveSubscribers(e);

      case "livewatchhistory":
        return getLiveWatchHistory(e);

      case "liveanalytics":
        return getLiveAnalytics(e);
        
        case "subscribelive":
  return subscribeLive(e);

case "unsubscribelive":
  return unsubscribeLive(e);

case "startwatchinglive":
  return startWatchingLive(e);

case "stopwatchinglive":
  return stopWatchingLive(e);

  case "likelive":
  return likeLive(e);

case "dislikelive":
  return dislikeLive(e);

case "removelivereaction":
  return removeLiveReaction(e);

case "liveengagement":
  return getLiveEngagement(e);

case "sharelive":
  return shareLive(e);

case "startliveviewer":
  return startLiveViewer(e);

case "pingliveviewer":
  return pingLiveViewer(e);

case "stopliveviewer":
  return stopLiveViewer(e);

case "liveviewers":
  return getLiveViewers(e);

case "concurrentviewers":
  return getConcurrentViewers(e);

case "sendlivemessage":
  return sendLiveMessage(e);

case "deletelivemessage":
  return deleteLiveMessage(e);

case "pinlivemessage":
  return pinLiveMessage(e);

case "unpinlivemessage":
  return unpinLiveMessage(e);

case "getlivechat":
  return getLiveChat(e);

case "addlivemoderator":
  return addLiveModerator(e);

case "removelivemoderator":
  return removeLiveModerator(e);

case "getlivemoderators":
  return getLiveModerators(e);

  case "notifylivesubscribers":
  return notifyLiveSubscribers(e);

case "getlivenotifications":
  return getLiveNotifications(e);

case "marklivenotificationread":
  return markLiveNotificationRead(e);

case "liveunreadcount":
  return getLiveUnreadCount(e);

      // Search
      case "search":
        return search(e);

      case "searchhistory":
        return getSearchHistory(e);

      case "popularsearches":
        return getPopularSearches(e);

      case "trendingsearches":
        return getTrendingSearches(e);

      case "searchanalytics":
        return getSearchAnalytics(e);

      // Dashboard
      case "revenueanalytics":
        return getRevenueAnalytics(e);

      case "useranalytics":
        return getUserAnalytics(e);

      case "gpsanalytics":
        return getGpsAnalytics(e);

      case "campaignanalytics":
        return getCampaignAnalytics(e);

      case "dailystats":
        return getDailyStats(e);

      // System
      case "health":
        return getHealth(e);

      case "systeminfo":
        return getSystemInfo(e);

      case "errorlogs":
        return getErrorLogs(e);

      // Admin
      case "admin":
        return adminDashboard(e);

      case "adminstats":
        return getAdminStats(e);

      case "dashboardstats":
        return getDashboardStats(e);

      case "activitystats":
        return getActivityStats(e);

        case "dashboardoverview":
  return getDashboardOverview(e);

case "dashboardusers":
  return getDashboardUsers(e);

case "dashboardrevenue":
  return getDashboardRevenue(e);

case "dashboardlive":
  return getDashboardLive(e);

case "dashboardhealth":
  return getDashboardHealth(e);

case "adminalerts":
  return getAdminAlerts(e);

case "systemlogs":
  return getSystemLogs(e);

  /* ============================================================
 * V5.8.0 - APPCREATOR24
 * ============================================================
 */

case "appconfig":
  return success(
    getAppConfig(),
    "App Config Loaded"
  );

case "appversion":
  return success(
    getAppVersion(),
    "App Version Loaded"
  );

case "forceupdate":
  return success(
    getForceUpdate(),
    "Force Update Loaded"
  );

case "maintenance":
  return success(
    getMaintenance(),
    "Maintenance Loaded"
  );

case "dynamicmenu":
  return success(
    getDynamicMenu(),
    "Dynamic Menu Loaded"
  );

case "remoteannouncements":
  return success(
    getRemoteAnnouncements(),
    "Announcements Loaded"
  );

case "remotebanners":
  return success(
    getRemoteBanners(),
    "Remote Banners Loaded"
  );

case "featureflags":
  return success(
    getFeatureFlags(),
    "Feature Flags Loaded"
  );

  /* ============================================================
 * V5.8.1 - REMOTE CONTROLS
 * ============================================================
 */

case "deeplinks":
  return success(
    getDeepLinks(),
    "Deep Links Loaded"
  );

case "appcolors":
  return success(
    getAppColors(),
    "App Colors Loaded"
  );

case "appnavigation":
  return success(
    getAppNavigation(),
    "App Navigation Loaded"
  );

case "appsociallinks":
  return success(
    getAppSocialLinks(),
    "App Social Links Loaded"
  );

case "contactinfo":
  return success(
    getContactInfo(),
    "Contact Info Loaded"
  );

case "appassets":
  return success(
    getAppAssets(),
    "App Assets Loaded"
  );

case "popupmessages":
  return success(
    getPopupMessages(),
    "Popup Messages Loaded"
  );

case "onboarding":
  return success(
    getOnboarding(),
    "Onboarding Loaded"
  );

  case "routertest":
  return success({
    action: action,
    router: "V5.8.2"
  });

      // OTP Login
      case "sendotp":
        return sendOtp(e);

      case "verifyotp":
        return verifyOtp(e);

      case "loginbymobile":
        return loginByMobile(e);

  // Media Upload
  case "upload":
    return handleUpload(e);

  case "deletefile":
    return handleDeleteFile(e);

  case "imagekitauth":
    return handleImageKitAuth();

  // Media Library (V6.0)
  case "addmedia":
    return handleAddMedia(e);

  case "mymedia":
    return handleGetMyMedia(e);

  case "searchmedia":
    return handleSearchMedia(e);

  case "deletemedia":
    return handleDeleteMedia(e);

  case "mediaanalytics":
    return handleMediaAnalytics(e);

  // Analytics Engine (V6.0)
  case "trackevent":
    return trackEvent(e);

  case "getevents":
    return getEvents(e);

  case "engagementanalytics":
    return getEngagementAnalytics(e);

  case "growthanalytics":
    return getGrowthAnalytics(e);

  case "conversionanalytics":
    return getConversionAnalytics(e);

  case "retentionanalytics":
    return getRetentionAnalytics(e);

  // News Extensions (V6.0)
  case "relatednews":
    return getRelatedNews(e);

  case "newsbycategory":
    return getNewsByCategory(e);

  case "featurednews":
    return getFeaturedNews(e);

  case "breakingnews":
    return getBreakingNews(e);

  case "localnews":
    return getLocalNews(e);

  case "newsshares":
    return incrementNewsShare(e);

  // Push Notifications (V6.0)
  case "subscribetopush":
    return subscribeToPush(e);

  case "unsubscribefrompush":
    return unsubscribeFromPush(e);

  case "sendpushnotification":
    return sendPushNotification(e);

  case "getpushsubscription":
    return getPushSubscription(e);

  // Phase 4 - PIP Advertisement + Reward Ad Center + Promotion Engine
  case "getpipqueue":
    return getPipQueue(e);

  case "getadcenter":
    return getAdvertisementCenter(e);

  case "startadwatch":
    return startAdWatch(e);

  case "updateadprogress":
    return updateAdProgress(e);

  case "completeadwatch":
    return completeAdWatch(e);

  case "skipadwatch":
    return skipAdWatch(e);

  case "claimadreward":
    return claimAdReward(e);

  case "getadwatchprogress":
    return getAdWatchProgress(e);

  case "getadwatchhistory":
    return getAdWatchHistory(e);

  case "getavailablerewardcoins":
    return getAvailableRewardCoins(e);

  case "getcampaignanalytics":
    return getCampaignAnalytics(e);

  case "createpromotioncampaign":
    return createPromotionCampaign(e);

  case "pausecampaign":
    return pauseCampaign(e);

  case "resumecampaign":
    return resumeCampaign(e);

  case "promoteproduct":
    return promoteProduct(e);

  case "promotebusiness":
    return promoteBusiness(e);

  case "promotestore":
    return promoteStore(e);

  case "promoteproperty":
    return promoteProperty(e);

  case "promotelive":
    return promoteLive(e);

  case "promotenews":
    return promoteNews(e);

  case "promoteexternalurl":
    return promoteExternalUrl(e);

  case "promotewebsite":
    return promoteWebsite(e);

  case "createdemocampaigns":
    return createDemoAdCampaigns();

  case "debugpip":
    return debugPip(e);

      default:
        return error(
          "Invalid action : " + action
        );
    }

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CORS Preflight Handler
 * Google Apps Script does NOT set CORS headers automatically.
 * This function returns a 200 response for OPTIONS preflight.
 * The actual CORS support comes from GAS deployment config:
 * - "Execute as: Me"
 * - "Who has access: Anyone"
 * 
 * Additionally, the response is wrapped in a JavaScript
 * callback pattern for maximum compatibility.
 * ============================================================
 */
function doOptions(e) {
  return corsPreflightResponse();
}


/**
 * ============================================================
 * POST Router
 * ============================================================
 */
function doPost(e) {
  try {
    const action = getAction(e);

    switch (action) {

      case "setradius":
        return setRadius(e);

      case "setlocation":
        return setRadius(e);

      case "login":
        return loginUser(e);

      case "register":
        return registerUser(e);

      case "addproduct":
        return addProduct(e);

      case "updateproduct":
        return updateProduct(e);

      case "deleteproduct":
        return deleteProduct(e);

      case "addbusiness":
        return addBusiness(e);

      case "updatebusiness":
        return updateBusiness(e);

      case "deletebusiness":
        return deleteBusiness(e);

      case "addproperty":
        return addProperty(e);

      case "updateproperty":
        return updateProperty(e);

      case "deleteproperty":
        return deleteProperty(e);

      case "addnews":
        return addNews(e);

      case "updatenews":
        return updateNews(e);

      case "deletenews":
        return deleteNews(e);

      case "addadvertisement":
        return addAdvertisement(e);

      case "updateadvertisement":
        return updateAdvertisement(e);

      case "deleteadvertisement":
        return deleteAdvertisement(e);

      case "updaterewardprogress":
        return updateRewardProgress(e);

      case "claimreward":
        return claimReward(e);

      case "createorder":
        return createOrder(e);

      case "wallet":
        return updateWallet(e);

      case "createnotification":
  return createNotification(e);

case "marknotificationread":
  return markNotificationRead(e);

case "broadcastnotification":
  return broadcastNotification(e);

case "notification_sent":
  return markNotificationSent(e);

case "addcampaign":
  return addCampaign(e);

      case "updatecampaign":
        return updateCampaign(e);

      case "deletecampaign":
        return deleteCampaign(e);

      case "createredemption":
        return createRedemption(e);

      case "approveredemption":
        return approveRedemption(e);

      case "rejectredemption":
        return rejectRedemption(e);

      case "addreport":
        return addReport(e);

      case "resolvereport":
        return resolveReport(e);

      case "blockuser":
        return blockUser(e);

      case "unblockuser":
        return unblockUser(e);

      // Live Management
      case "addlive":
        return addLive(e);

      case "updatelive":
        return updateLive(e);

      case "deletelive":
        return deleteLive(e);

      case "setfeaturedlive":
        return setFeaturedLive(e);

      case "subscribelive":
        return subscribeLive(e);

      case "unsubscribelive":
        return unsubscribeLive(e);

      case "startwatchinglive":
        return startWatchingLive(e);

      case "stopwatchinglive":
        return stopWatchingLive(e);
case "likelive":
  return likeLive(e);

case "dislikelive":
  return dislikeLive(e);

case "removelivereaction":
  return removeLiveReaction(e);

case "liveengagement":
  return getLiveEngagement(e);

case "sharelive":
  return shareLive(e);

case "startliveviewer":
  return startLiveViewer(e);

case "pingliveviewer":
  return pingLiveViewer(e);

case "stopliveviewer":
  return stopLiveViewer(e);

case "liveviewers":
  return getLiveViewers(e);

case "concurrentviewers":
  return getConcurrentViewers(e);

case "sendlivemessage":
  return sendLiveMessage(e);

case "deletelivemessage":
  return deleteLiveMessage(e);

case "pinlivemessage":
  return pinLiveMessage(e);

case "unpinlivemessage":
  return unpinLiveMessage(e);

case "getlivechat":
  return getLiveChat(e);

case "addlivemoderator":
  return addLiveModerator(e);

case "removelivemoderator":
  return removeLiveModerator(e);

case "getlivemoderators":
  return getLiveModerators(e);

  case "notifylivesubscribers":
  return notifyLiveSubscribers(e);

case "marklivenotificationread":
  return markLiveNotificationRead(e);

case "getlivenotifications":
  return getLiveNotifications(e);

case "liveunreadcount":
  return getLiveUnreadCount(e);

      // OTP Login via POST
      case "sendotp":
        return sendOtp(e);

      case "verifyotp":
        return verifyOtp(e);

      // Media Upload via POST
      case "upload":
        return handleUpload(e);

      default:
        return error(
          "Invalid POST action : " + action
        );
    }

  } catch (err) {
    return exception(err);
  }
}


/**
 * Read action parameter safely
 */
function getAction(e) {
  if (!e || !e.parameter) {
    return "";
  }

  return String(
    e.parameter.action || ""
  )
    .trim()
    .toLowerCase();
}