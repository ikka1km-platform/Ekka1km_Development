/**
 * ============================================================
 * EKKA1KM BACKEND
 * Config.js
 * Global Configuration
 * V5.9.0 - OTP Login Support
 * ============================================================
 */

const CONFIG = {

  //============================================================
  // PROJECT
  //============================================================

  APP_NAME: "Ekka1km",

  VERSION: "5.9.0",

  SPREADSHEET_ID: "1PX5VZaxYXQJIzSwKVUxflDCI5YLDii5N",
  
  TIMEZONE: Session.getScriptTimeZone(),

  //============================================================
  // OTP SETTINGS
  //============================================================

  OTP_PROVIDER: "LOCAL",

  OTP_EXPIRY_MINUTES: 5,

  OTP_MAX_ATTEMPTS: 3,

  OTP_LENGTH: 6,

  //============================================================
  // SHEETS
  //============================================================

  SHEETS: {

    USERS: "Users",

    PRODUCTS: "Products",

    BUSINESSES: "Businesses",

    PROPERTIES: "Properties",

    NEWS: "News",

    MEDIA: "Media",

    ADVERTISEMENTS: "Advertisements",

    WALLET: "Wallet",

    WALLET_TRANSACTIONS: "WalletTransactions",

    PROMOTION_CAMPAIGNS: "PromotionCampaigns",

    ORDERS: "Orders",

    LIVE: "Live",

    LIVE_SUBSCRIBERS: "LiveSubscribers",

    LIVE_WATCH_HISTORY: "LiveWatchHistory",

    LIVE_LIKES: "LiveLikes",

    LIVE_VIEWERS: "LiveViewers",

    LIVE_SHARES: "LiveShares",

    LIVE_CHAT: "LiveChat",

    LIVE_MODERATORS: "LiveModerators",

    LIVE_NOTIFICATIONS: "LiveNotifications",

    NOTIFICATIONS: "Notifications",

    PROMOCODES: "PromoCodes",

    ACTIVITY_LOGS: "ActivityLogs",

    APP_SETTINGS: "AppSettings",

    //==========================================================
    // V5.7.0 ADMIN DASHBOARD
    //==========================================================

    ADMIN_DASHBOARD: "AdminDashboard",

    SYSTEM_LOGS: "SystemLogs",

    ADMIN_ALERTS: "AdminAlerts",

    DASHBOARD_CACHE: "DashboardCache",

    ADMIN_SESSIONS: "AdminSessions",

    //==========================================================
    // V5.8.0 APPCREATOR24
    //==========================================================

    APP_CONFIG: "AppConfig",

    APP_VERSION: "AppVersion",

    MAINTENANCE: "Maintenance",

    DYNAMIC_MENU: "DynamicMenu",

    REMOTE_ANNOUNCEMENTS: "RemoteAnnouncements",

    REMOTE_BANNERS: "RemoteBanners",

    FEATURE_FLAGS: "FeatureFlags",

    //==========================================================
    // V5.8.1 REMOTE CONTROLS
    //==========================================================

    DEEP_LINKS: "DeepLinks",

    APP_COLORS: "AppColors",

    APP_NAVIGATION: "AppNavigations",

    APP_SOCIAL_LINKS: "AppSocialLinks",

    CONTACT_INFO: "ContactInfo",

    APP_ASSETS: "AppAssets",

    POPUP_MESSAGES: "PopupMessages",

    ONBOARDING: "Onboarding"
  },

  //============================================================
  // DEFAULT VALUES
  //============================================================

  DEFAULT_RADIUS: 51,

  DEFAULT_COUNTRY: "India",

  DEFAULT_STATE: "",

  DEFAULT_CITY: "",

  DEFAULT_LANGUAGE: "en",

  DEFAULT_CURRENCY: "INR",

  DEFAULT_WALLET_BALANCE: 0,

  DEFAULT_STATUS: "Active",

  DEFAULT_ROLE: "User",

  //============================================================
  // SECURITY
  //============================================================

  TOKEN_LENGTH: 32,

  PASSWORD_MIN_LENGTH: 6,

  MAX_LOGIN_ATTEMPTS: 5,

  SESSION_EXPIRY_HOURS: 24,

  //============================================================
  // SEARCH
  //============================================================

  SEARCH_LIMIT: 100,

  //============================================================
  // PAGINATION
  //============================================================

  PAGE_SIZE: 20,

  MAX_PAGE_SIZE: 100,

  //============================================================
  // RESPONSE
  //============================================================

  SUCCESS: "SUCCESS",

  FAILED: "FAILED",

  //============================================================
  // DATE FORMAT
  //============================================================

  DATE_FORMAT: "yyyy-MM-dd",

  DATE_TIME_FORMAT: "yyyy-MM-dd HH:mm:ss"
};


/**
 * ============================================================
 * Spreadsheet
 * ============================================================
 */

function getSpreadsheet() {
  return SpreadsheetApp.openById(
    CONFIG.SPREADSHEET_ID
  );
}


/**
 * ============================================================
 * Sheet
 * ============================================================
 */

function getSheet(sheetName) {
  return getSpreadsheet()
    .getSheetByName(sheetName);
}


/**
 * ============================================================
 * Sheet Exists
 * ============================================================
 */

function sheetExists(sheetName) {
  return getSheet(sheetName) !== null;
}


/**
 * ============================================================
 * App Version
 * ============================================================
 */

function getVersion() {
  return CONFIG.VERSION;
}


/**
 * ============================================================
 * App Name
 * ============================================================
 */

function getAppName() {
  return CONFIG.APP_NAME;
}


/**
 * ============================================================
 * App Settings
 * ============================================================
 */

function getAppSettings() {
  return {
    appName: CONFIG.APP_NAME,
    version: CONFIG.VERSION,
    timezone: CONFIG.TIMEZONE,
    currency: CONFIG.DEFAULT_CURRENCY
  };
}