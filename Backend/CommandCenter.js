/**
 * ============================================================
 * EKKA1KM BACKEND
 * CommandCenter.js
 * V5.10.0 - LIVE COMMAND CENTER DATA (Phase 5.3B)
 * Lightweight aggregation of existing analytics for map layers
 * ============================================================
 */


/**
 * ============================================================
 * COMMAND CENTER DATA
 * ?action=ccdata&session=TOKEN
 * Returns all data needed for map layers, city analytics,
 * activity feed, top cities, top categories, system health
 * ============================================================
 */

function getCommandCenterData(e) {
  try {

    const sessionResult = requireAdminSession(e);

    if (!sessionResult.valid) {
      return sessionResult.response;
    }

    const data = {
      heatmap: getHeatMapData(),
      liveUsers: getLiveUsersData(),
      businesses: getBusinessesMapData(),
      advertisements: getAdvertisementsMapData(),
      promotions: getPromotionsMapData(),
      cityAnalytics: getCityAnalyticsData(),
      activityFeed: getActivityFeedData(),
      topCities: getTopCitiesData(),
      topCategories: getTopCategoriesData(),
      systemHealth: getSystemHealthData()
    };

    return success(data, "Command Center Data Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * HEAT MAP DATA
 * Returns lat/lng/intensity pairs from user locations
 * ============================================================
 */

function getHeatMapData() {

  const points = [];

  try {
    const users = getSheetData(CONFIG.SHEETS.USERS);

    users.forEach(function(user) {
      const lat = parseFloat(user.Latitude || user.lat || 0);
      const lng = parseFloat(user.Longitude || user.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        points.push({
          lat: lat,
          lng: lng,
          intensity: 1
        });
      }
    });
  } catch (e) { /* ignore */ }

  // Also add business locations for heat map density
  try {
    const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);

    businesses.forEach(function(biz) {
      const lat = parseFloat(biz.Latitude || biz.lat || 0);
      const lng = parseFloat(biz.Longitude || biz.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        points.push({
          lat: lat,
          lng: lng,
          intensity: 2
        });
      }
    });
  } catch (e) { /* ignore */ }

  return points;
}


/**
 * ============================================================
 * LIVE USERS DATA
 * Returns active users with location info
 * ============================================================
 */

function getLiveUsersData() {

  const users = [];

  try {
    const allUsers = getSheetData(CONFIG.SHEETS.USERS);

    allUsers.forEach(function(user) {
      const lat = parseFloat(user.Latitude || user.lat || 0);
      const lng = parseFloat(user.Longitude || user.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        users.push({
          userId: user.UserID || "",
          name: user.FullName || "User",
          city: user.City || "",
          state: user.State || "",
          lat: lat,
          lng: lng,
          status: user.Status || "Active",
          lastLogin: user.LastLogin || ""
        });
      }
    });
  } catch (e) { /* ignore */ }

  return users;
}


/**
 * ============================================================
 * BUSINESSES MAP DATA
 * Returns businesses with location for map markers
 * ============================================================
 */

function getBusinessesMapData() {

  const businesses = [];

  try {
    const allBiz = getSheetData(CONFIG.SHEETS.BUSINESSES);

    allBiz.forEach(function(biz) {
      const lat = parseFloat(biz.Latitude || biz.lat || 0);
      const lng = parseFloat(biz.Longitude || biz.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        businesses.push({
          id: biz.BusinessID || biz.id || "",
          name: biz.BusinessName || biz.Name || "Business",
          category: biz.Category || "",
          owner: biz.OwnerName || biz.Owner || "",
          city: biz.City || "",
          state: biz.State || "",
          lat: lat,
          lng: lng,
          productsCount: parseInt(biz.ProductsCount || biz.productsCount || 0),
          promotionStatus: biz.PromotionStatus || biz.promotionStatus || "None",
          status: biz.Status || "Active"
        });
      }
    });
  } catch (e) { /* ignore */ }

  return businesses;
}


/**
 * ============================================================
 * ADVERTISEMENTS MAP DATA
 * Returns active ads with location
 * ============================================================
 */

function getAdvertisementsMapData() {

  const ads = [];

  try {
    const allAds = getSheetData(CONFIG.SHEETS.ADVERTISEMENTS);

    allAds.forEach(function(ad) {
      const lat = parseFloat(ad.Latitude || ad.lat || 0);
      const lng = parseFloat(ad.Longitude || ad.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        ads.push({
          id: ad.AdID || ad.id || "",
          name: ad.CampaignName || ad.Name || "Advertisement",
          radius: ad.Radius || "0",
          views: parseInt(ad.Views || ad.views || 0),
          clicks: parseInt(ad.Clicks || ad.clicks || 0),
          budget: parseFloat(ad.Budget || ad.budget || 0),
          lat: lat,
          lng: lng,
          status: ad.Status || "Active"
        });
      }
    });
  } catch (e) { /* ignore */ }

  return ads;
}


/**
 * ============================================================
 * PROMOTIONS MAP DATA
 * Returns promoted items with location
 * ============================================================
 */

function getPromotionsMapData() {

  const promotions = [];

  try {
    const allPromos = getSheetData(CONFIG.SHEETS.PROMOTION_CAMPAIGNS);

    allPromos.forEach(function(promo) {
      const lat = parseFloat(promo.Latitude || promo.lat || 0);
      const lng = parseFloat(promo.Longitude || promo.lng || 0);

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        promotions.push({
          id: promo.CampaignID || promo.id || "",
          name: promo.CampaignName || promo.Name || "Promotion",
          type: promo.Type || promo.type || "",
          budget: parseFloat(promo.Budget || promo.budget || 0),
          status: promo.Status || "Active",
          lat: lat,
          lng: lng
        });
      }
    });
  } catch (e) { /* ignore */ }

  return promotions;
}


/**
 * ============================================================
 * CITY ANALYTICS DATA
 * Aggregates per-city statistics from existing sheets
 * ============================================================
 */

function getCityAnalyticsData() {

  const cities = {};

  // Aggregate users by city
  try {
    const users = getSheetData(CONFIG.SHEETS.USERS);

    users.forEach(function(user) {
      const city = (user.City || "").trim();
      const state = (user.State || "").trim();

      if (!city) return;

      const key = city + "|" + state;

      if (!cities[key]) {
        cities[key] = {
          city: city,
          state: state,
          users: 0,
          businesses: 0,
          products: 0,
          properties: 0,
          advertisements: 0,
          promotions: 0,
          revenue: 0,
          pendingReports: 0,
          pendingApprovals: 0
        };
      }

      cities[key].users++;
    });
  } catch (e) { /* ignore */ }

  // Aggregate businesses by city
  try {
    const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);

    businesses.forEach(function(biz) {
      const city = (biz.City || "").trim();
      const state = (biz.State || "").trim();
      const key = city + "|" + state;

      if (cities[key]) {
        cities[key].businesses++;
      }
    });
  } catch (e) { /* ignore */ }

  // Aggregate products by city
  try {
    const products = getSheetData(CONFIG.SHEETS.PRODUCTS);

    products.forEach(function(prod) {
      const city = (prod.City || "").trim();
      const state = (prod.State || "").trim();
      const key = city + "|" + state;

      if (cities[key]) {
        cities[key].products++;
      }
    });
  } catch (e) { /* ignore */ }

  // Aggregate properties by city
  try {
    const properties = getSheetData(CONFIG.SHEETS.PROPERTIES);

    properties.forEach(function(prop) {
      const city = (prop.City || "").trim();
      const state = (prop.State || "").trim();
      const key = city + "|" + state;

      if (cities[key]) {
        cities[key].properties++;
      }
    });
  } catch (e) { /* ignore */ }

  // Convert to array sorted by user count
  const result = Object.values(cities);
  result.sort(function(a, b) { return b.users - a.users; });

  return result;
}


/**
 * ============================================================
 * ACTIVITY FEED DATA
 * Returns recent platform activities
 * ============================================================
 */

function getActivityFeedData() {

  const activities = [];
  const now = new Date();

  // Recent users
  try {
    const users = getSheetData(CONFIG.SHEETS.USERS);
    const recent = users.slice(-20).reverse();

    recent.forEach(function(user) {
      activities.push({
        type: "user_registered",
        title: "User Registered",
        description: user.FullName || "New user",
        city: user.City || "",
        time: user.CreatedDate || "",
        icon: "👤"
      });
    });
  } catch (e) { /* ignore */ }

  // Recent businesses
  try {
    const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);
    const recent = businesses.slice(-20).reverse();

    recent.forEach(function(biz) {
      activities.push({
        type: "business_added",
        title: "Business Added",
        description: biz.BusinessName || "New business",
        city: biz.City || "",
        time: biz.CreatedDate || "",
        icon: "🏪"
      });
    });
  } catch (e) { /* ignore */ }

  // Recent products
  try {
    const products = getSheetData(CONFIG.SHEETS.PRODUCTS);
    const recent = products.slice(-20).reverse();

    recent.forEach(function(prod) {
      activities.push({
        type: "product_posted",
        title: "Product Posted",
        description: prod.ProductName || prod.Name || "New product",
        city: prod.City || "",
        time: prod.CreatedDate || "",
        icon: "📦"
      });
    });
  } catch (e) { /* ignore */ }

  // Recent properties
  try {
    const properties = getSheetData(CONFIG.SHEETS.PROPERTIES);
    const recent = properties.slice(-20).reverse();

    recent.forEach(function(prop) {
      activities.push({
        type: "property_posted",
        title: "Property Posted",
        description: prop.Title || prop.Name || "New property",
        city: prop.City || "",
        time: prop.CreatedDate || "",
        icon: "🏠"
      });
    });
  } catch (e) { /* ignore */ }

  // Recent news
  try {
    const news = getSheetData(CONFIG.SHEETS.NEWS);
    const recent = news.slice(-20).reverse();

    recent.forEach(function(article) {
      activities.push({
        type: "news_published",
        title: "News Published",
        description: article.Title || article.Headline || "News article",
        city: article.City || "",
        time: article.CreatedDate || "",
        icon: "📰"
      });
    });
  } catch (e) { /* ignore */ }

  // Sort by time (newest first)
  activities.sort(function(a, b) {
    return new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime();
  });

  // Limit to 50 items
  return activities.slice(0, 50);
}


/**
 * ============================================================
 * TOP CITIES DATA
 * ============================================================
 */

function getTopCitiesData() {

  const cityStats = {};

  // Count users per city
  try {
    const users = getSheetData(CONFIG.SHEETS.USERS);

    users.forEach(function(user) {
      const city = (user.City || "").trim();
      if (!city) return;

      if (!cityStats[city]) {
        cityStats[city] = { city: city, users: 0, businesses: 0, products: 0, revenue: 0 };
      }

      cityStats[city].users++;
    });
  } catch (e) { /* ignore */ }

  // Count businesses per city
  try {
    const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);

    businesses.forEach(function(biz) {
      const city = (biz.City || "").trim();
      if (!city || !cityStats[city]) return;
      cityStats[city].businesses++;
    });
  } catch (e) { /* ignore */ }

  // Count products per city
  try {
    const products = getSheetData(CONFIG.SHEETS.PRODUCTS);

    products.forEach(function(prod) {
      const city = (prod.City || "").trim();
      if (!city || !cityStats[city]) return;
      cityStats[city].products++;
    });
  } catch (e) { /* ignore */ }

  // Sort by user count descending, take top 10
  const result = Object.values(cityStats);
  result.sort(function(a, b) { return b.users - a.users; });

  return result.slice(0, 10);
}


/**
 * ============================================================
 * TOP CATEGORIES DATA
 * ============================================================
 */

function getTopCategoriesData() {

  const categoryStats = {};

  // Count businesses per category
  try {
    const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);

    businesses.forEach(function(biz) {
      const cat = (biz.Category || "").trim();
      if (!cat) return;

      if (!categoryStats[cat]) {
        categoryStats[cat] = { category: cat, businesses: 0, products: 0, promotions: 0 };
      }

      categoryStats[cat].businesses++;
    });
  } catch (e) { /* ignore */ }

  // Count products per category
  try {
    const products = getSheetData(CONFIG.SHEETS.PRODUCTS);

    products.forEach(function(prod) {
      const cat = (prod.Category || "").trim();
      if (!cat || !categoryStats[cat]) return;
      categoryStats[cat].products++;
    });
  } catch (e) { /* ignore */ }

  // Sort by business count descending, take top 10
  const result = Object.values(categoryStats);
  result.sort(function(a, b) { return b.businesses - a.businesses; });

  return result.slice(0, 10);
}


/**
 * ============================================================
 * SYSTEM HEALTH DATA
 * ============================================================
 */

function getSystemHealthData() {

  const health = {
    backendApi: "ONLINE",
    googleSheets: "ONLINE",
    imageKit: "UNKNOWN",
    smsService: "UNKNOWN",
    storage: "ONLINE",
    appVersion: CONFIG.VERSION || "5.9.0"
  };

  // Check Google Sheets
  try {
    const ss = getSpreadsheet();
    if (ss) {
      health.googleSheets = "ONLINE";
      health.storage = "ONLINE";
    }
  } catch (e) {
    health.googleSheets = "OFFLINE";
    health.storage = "OFFLINE";
  }

  // ImageKit
  try {
    if (typeof getImageKitStatus === "function") {
      health.imageKit = getImageKitStatus();
    }
  } catch (e) {
    health.imageKit = "UNKNOWN";
  }

  // SMS
  health.smsService = CONFIG.OTP_PROVIDER === "MSG91" ? "CONFIGURED" : "LOCAL";

  return health;
}