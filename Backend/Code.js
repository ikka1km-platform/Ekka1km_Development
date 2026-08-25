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

      case "createproduct":
        return createProduct(e);

      case "updateproduct":
        return updateProduct(e);

      case "deleteproduct":
        return deleteProduct(e);

      case "restoreproduct":
        return restoreProduct(e);

      // Businesses
      case "businesses":
        return getBusinesses(e);

      case "business":
        return getBusiness(e);

      case "addbusiness":
        return addBusiness(e);

      case "createbusiness":
        return createBusiness(e);

      case "updatebusiness":
        return updateBusiness(e);

      case "deletebusiness":
        return deleteBusiness(e);

      case "restorebusiness":
        return restoreBusiness(e);

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

      // OTP Login
      case "sendotp":
        return sendOtp(e);

      case "verifyotp":
        return verifyOtp(e);

      case "loginbymobile":
        return loginByMobile(e);

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

      case "adminpromotioncampaigns":
        return getAdminPromotionCampaigns(e);

      case "adminadvertisements":
        return getAdminAdvertisements(e);

      case "promotednearby":
        return getPromotedNearYou(e);

      // Promotion Pass + Platform Promotion Treasury (V2 Treasury foundation)
      case "passcatalog":
        return getPromotionPassCatalogRoute(e);

      case "adminpassupsert":
        return adminUpsertPromotionPass(e);

      case "adminseeddefaultpasses":
        return adminSeedDefaultPasses(e);

      // Admin treasury-funded campaign creation (server-side only)
      case "admincreatecampaign":
        return adminCreateCampaign(e);

      // Admin campaign lifecycle actions
      case "adminapprovecampaign":
        return adminApproveCampaign(e);
      case "adminrejectcampaign":
        return adminRejectCampaign(e);
      case "pausecampaign":
        return adminPauseCampaign(e);
      case "resumecampaign":
        return adminResumeCampaign(e);
      case "adminsuspendcampaign":
        return adminSuspendCampaign(e);
      case "adminterminatecampaign":
        return adminTerminateCampaign(e);
      case "admintogglefeatured":
        return adminToggleFeatured(e);
      case "admintogglepip":
        return adminTogglePipEnabled(e);

      case "createpasspurchase":
        return createPassPurchaseEndpoint(e);

      case "confirmpasspurchase":
        return confirmPassPurchaseEndpoint(e);

      case "mypurchasedpasses":
        return myPurchasedPassesEndpoint(e);

      case "admintreasuryoverview":
        return adminTreasuryOverview(e);

      case "admintreasuryledger":
        return adminTreasuryLedger(e);

      // Coin conversion rate (authoritative INR <-> Coin rule)
      case "admincoinrate":
        return getAdminCoinRate(e);

      case "adminupdatecoinrate":
        return updateAdminCoinRate(e);

      case "admineconomyrules":
        return getAdminEconomyRules(e);

      case "adminupdateeconomyrules":
        return updateAdminEconomyRules(e);

// One-time economy reset (admin-only, explicit confirmation required)
      case "adminreseteconomy":
        return adminResetEconomy(e);

      // Admin wallet adjustment / compensation (admin-only, Treasury-protected)
      case "adminadjustwallet":
        return adminAdjustWallet(e);

      // Admin: Promotion Treasury -> user wallet funding (single shared reference)
      case "adminfundwalletfromtreasury":
        return adminFundWalletFromTreasury(e);

      // News
      case "news":
        return getNews(e);

      case "article":
        return getArticle(e);

      case "addnews":
        return addNews(e);

      case "createnews":
        return createNews(e);

      case "updatenews":
        return updateNews(e);

      case "deletenews":
        return deleteNews(e);

      case "restorenews":
        return restoreNews(e);

      // Properties
      case "properties":
        return getProperties(e);

      case "property":
        return getProperty(e);

      case "addproperty":
        return addProperty(e);

      case "createproperty":
        return createProperty(e);

      case "updateproperty":
        return updateProperty(e);

      case "deleteproperty":
        return deleteProperty(e);

      case "restoreproperty":
        return restoreProperty(e);

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

      // Announcements
      case "announcements":
        return getAnnouncements(e);

      case "announcement":
        return getAnnouncement(e);

      case "addannouncement":
        return addAnnouncement(e);

      case "createannouncement":
        return createAnnouncement(e);

      case "updateannouncement":
        return updateAnnouncement(e);

      case "deleteannouncement":
        return deleteAnnouncement(e);

      case "restoreannouncement":
        return restoreAnnouncement(e);

      // V2 Announcer System
      case "applyannouncer":
        return applyAnnouncer(e);

      case "myannouncerstatus":
        return getMyAnnouncerStatus(e);

      case "getannouncerbyid":
        return getAnnouncerByIdRoute(e);

      case "myannouncements":
        return getMyAnnouncements(e);

      case "getallannouncers":
        return getAllAnnouncers(e);

      case "adminverifyannouncer":
        return adminVerifyAnnouncer(e);

      case "adminsuspendannouncer":
        return adminSuspendAnnouncer(e);

      case "adminreactivateannouncer":
        return adminReactivateAnnouncer(e);

      case "adminrevokeannouncer":
        return adminRevokeAnnouncer(e);

      case "adminannouncementstatus":
        return setAnnouncementStatus(e);

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

      // Store System (Phase 3.5)
      case "getstore":
        return getStore(e);

      case "getstoreproducts":
        return getStoreProducts(e);

      case "getstoreproperties":
        return getStoreProperties(e);

      case "getstoreanalytics":
        return getStoreAnalytics(e);

      case "followstore":
        return followStore(e);

      case "unfollowstore":
        return unfollowStore(e);

      case "getstorefollowers":
        return getStoreFollowers(e);

      case "searchstores":
        return searchStores(e);

      case "sharestore":
        return shareStore(e);

      // Interest System (Phase 3.6)
      case "markinterested":
        return markInterested(e);

      case "removeinterest":
        return removeInterest(e);

      case "getmyinterests":
        return getMyInterests(e);

      case "getinterestcount":
        return getInterestCount(e);

      case "getinterestedusers":
        return getInterestedUsers(e);

      case "hasuserinterested":
        return hasUserInterested(e);

      // Promotion System (Phase 3.7)
      case "createpromotion":
        return createPromotion(e);

      case "getpromotion":
        return getPromotion(e);

      case "getuserpromotions":
        return getUserPromotions(e);

      case "stoppromotion":
        return stopPromotion(e);

      case "pausepromotion":
        return pausePromotion(e);

      case "resumepromotion":
        return resumePromotion(e);

      case "expirepromotion":
        return expirePromotion(e);

      case "cancelpromotion":
        return cancelPromotion(e);

      case "getpromotionanalytics":
        return getPromotionAnalytics(e);

      case "calculatepromotionprice":
        return calculatePromotionPrice(e);

      case "processpromotions":
        return processPromotions(e);

      case "migratebusinessfollowers":
        return migrateBusinessFollowers();

      case "migrateuserinterests":
        return migrateUserInterests();

      case "migratepromotions":
        return migratePromotions();

      // Drafts (Phase 4.6)
      case "savedraft":
        return saveDraft(e);

      case "loaddraft":
        return loadDraft(e);

      case "deletedraft":
        return deleteDraft(e);

      case "autosave":
        return autoSaveDraft(e);

      // Moderation (Phase 4.7)
      case "submitmoderation":
        return submitModeration(e);

      case "getmoderationqueue":
        return getModerationQueue(e);

      case "updatemoderation":
        return updateModeration(e);

      // Dashboard
      case "dashboard":
        return getUserDashboard(e);

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
      // Admin Auth (Phase 5.1)
      case "adminlogin":
        return adminLogin(e);

      case "adminverifyotp":
        return verifyAdminOTP(e);

      case "adminvalidatesession":
        return validateAdminSession(e);

      case "adminlogout":
        return logoutAdmin(e);

      case "adminprofile":
        return getAdminProfile(e);

      case "adminpermissions":
        return getAdminPermissions(e);

      case "admindashboardsummary":
        return getAdminDashboardSummary(e);

      case "ccdata":
        return getCommandCenterData(e);

      // Phase 5.4 - Admin Management
      case "adminusers":
        return getAdminUsers(e);

      case "adminuserstatus":
        return setAdminUserStatus(e);

      case "adminuserdetail":
        return getAdminUserDetail(e);

      case "adminbusinesses":
        return getAdminBusinesses(e);

      case "adminbusinessstatus":
        return setAdminBusinessStatus(e);

      case "adminproducts":
        return getAdminProducts(e);

      case "adminproductstatus":
        return setAdminProductStatus(e);

      case "adminproperties":
        return getAdminProperties(e);

      case "adminpropertystatus":
        return setAdminPropertyStatus(e);

      case "adminnews":
        return getAdminNews(e);

      case "adminnewsstatus":
        return setAdminNewsStatus(e);

      case "adminworkforce":
        return getAdminWorkforce(e);

      case "adminupdateworkforce":
        return updateAdminWorkforce(e);

      case "admincategories":
        return getAdminCategories(e);

      // Phase 5.7A - Wallet & Rewards Economy
      case "admineconomysummary":
        return getAdminEconomySummary(e);

      case "adminwalletexplorer":
        return getAdminWalletExplorer(e);

      case "adminwalletdetail":
        return getAdminWalletDetail(e);

      case "adminwallettransactions":
        return getAdminWalletTransactions(e);

      case "adminrewardactivity":
        return getAdminRewardActivity(e);

      case "admincampaigneconomy":
        return getAdminCampaignEconomy(e);

      // Phase 5.7B - Economy Reconciliation & Integrity Monitoring
      case "economyintegritysummary":
        return getEconomyIntegritySummary(e);

      case "walletreconciliation":
        return getWalletReconciliation(e);

      case "transactionanomalies":
        return getTransactionAnomalies(e);

      case "rewardanomalies":
        return getRewardAnomalies(e);

      case "duplicaterewards":
        return getDuplicateRewards(e);

      case "campaignreconciliation":
        return getCampaignReconciliation(e);

      case "anomalyexplorer":
        return getAnomalyExplorer(e);

      case "adminwalletdetailintegrity":
        return getAdminWalletDetailIntegrity(e);

      case "campaigneconomyintegrity":
        return getCampaignEconomyIntegrity(e);

      // Phase 5.5 - Task Management
      case "admintaskstats":
        return getAdminTaskStats(e);

      case "admintasks":
        return getAdminTasks(e);

      case "admintaskcreate":
        return createAdminTask(e);

      case "admintaskupdate":
        return updateAdminTask(e);

      case "admintaskdetail":
        return getAdminTaskDetail(e);

      case "admintaskdelete":
        return deleteAdminTask(e);

      case "admintaskduplicate":
        return duplicateAdminTask(e);

      case "admintaskhistory":
        return getAdminTaskHistory(e);

      case "admintaskassignees":
        return getAdminTaskAssignees(e);

      case "admintaskdepartments":
        return getAdminTaskDepartments(e);

      case "initializeadmindatabase":
        return initializeAdminDatabase(e);

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

      default:
        return error("Unknown action: " + action);
    }
  } catch (err) {
    return exception(err);
  }
}


function doPost(e) {
  // For POST requests, delegate to doGet for unified handling
  return doGet(e);
}


function getAction(e) {
  const params = e.parameter;
  return (params.action || "").toLowerCase().trim();
}


function success(data, message) {
  return {
    status: "SUCCESS",
    success: true,
    data: data,
    message: message || "Success"
  };
}


function error(message) {
  return {
    status: "ERROR",
    success: false,
    data: null,
    message: message || "Error"
  };
}


function exception(err) {
  Logger.log("Exception: " + err.toString());
  return {
    status: "EXCEPTION",
    success: false,
    data: null,
    message: "Server error: " + (err.message || err.toString())
  };
}


function getAppName() {
  return CONFIG.APP_NAME || "Ekka1km";
}


function getVersion() {
  return CONFIG.APP_VERSION || "1.0.0";
}


function getAppSettings() {
  return {
    appName: getAppName(),
    version: getVersion(),
    gpsEnabled: true,
    otpProvider: CONFIG.OTP_PROVIDER || "LOCAL",
    devMode: CONFIG.DEV_MODE || false
  };
}
