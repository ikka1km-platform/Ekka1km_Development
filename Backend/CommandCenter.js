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

    // CacheService 60s cache optimization (Phase 3C)
    const CACHE_KEY = "command_center_data";
    const CACHE_TTL = 60; // seconds
    let cache = null;

    try {
      if (typeof CacheService !== "undefined" && CacheService.getScriptCache) {
        cache = CacheService.getScriptCache();
        const cachedRaw = cache ? cache.get(CACHE_KEY) : null;
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && typeof parsed === "object" && parsed.heatmap && parsed.liveUsers && parsed.businesses) {
            return success(parsed, "Command Center Data Loaded");
          }
        }
      }
    } catch (cacheReadErr) {
      if (typeof Logger !== "undefined") {
        Logger.log("Command center cache read error: " + cacheReadErr);
      }
    }

    // Open spreadsheet ONCE for all operations in this request
    const ss = getSpreadsheet();

    function readSheetRows(sheetName) {
      if (!ss) return [];
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      const values = sheet.getDataRange().getValues();
      if (values.length === 0) return [];
      const headers = values[0];
      const result = [];
      for (let i = 1; i < values.length; i++) {
        const row = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        result.push(row);
      }
      return result;
    }

    // Read each required sheet ONCE per request using the shared spreadsheet instance
    const users = readSheetRows(CONFIG.SHEETS.USERS);
    const businesses = readSheetRows(CONFIG.SHEETS.BUSINESSES);
    const products = readSheetRows(CONFIG.SHEETS.PRODUCTS);
    const properties = readSheetRows(CONFIG.SHEETS.PROPERTIES);
    const advertisements = readSheetRows(CONFIG.SHEETS.ADVERTISEMENTS);
    const promotions = readSheetRows(CONFIG.SHEETS.PROMOTION_CAMPAIGNS);
    const news = readSheetRows(CONFIG.SHEETS.NEWS);

    const data = {
      heatmap: getHeatMapData(users, businesses),
      liveUsers: getLiveUsersData(users),
      businesses: getBusinessesMapData(businesses),
      advertisements: getAdvertisementsMapData(advertisements),
      promotions: getPromotionsMapData(promotions),
      cityAnalytics: getCityAnalyticsData(users, businesses, products, properties),
      activityFeed: getActivityFeedData(users, businesses, products, properties, news),
      topCities: getTopCitiesData(users, businesses, products),
      topCategories: getTopCategoriesData(businesses, products),
      systemHealth: getSystemHealthData()
    };

    // Store Command Center data in cache
    try {
      if (cache) {
        cache.put(CACHE_KEY, JSON.stringify(data), CACHE_TTL);
      }
    } catch (cacheWriteErr) {
      if (typeof Logger !== "undefined") {
        Logger.log("Command center cache write error: " + cacheWriteErr);
      }
    }

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

function getHeatMapData(usersData, businessesData) {

  const points = [];

  try {
    const users = Array.isArray(usersData) ? usersData : getSheetData(CONFIG.SHEETS.USERS);

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
    const businesses = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);

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

function getLiveUsersData(usersData) {

  const users = [];

  try {
    const allUsers = Array.isArray(usersData) ? usersData : getSheetData(CONFIG.SHEETS.USERS);

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

function getBusinessesMapData(businessesData) {

  const businesses = [];

  try {
    const allBiz = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);

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

function getAdvertisementsMapData(adsData) {

  const ads = [];

  try {
    const allAds = Array.isArray(adsData) ? adsData : getSheetData(CONFIG.SHEETS.ADVERTISEMENTS);

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

function getPromotionsMapData(promosData) {

  const promotions = [];

  try {
    const allPromos = Array.isArray(promosData) ? promosData : getSheetData(CONFIG.SHEETS.PROMOTION_CAMPAIGNS);

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

function getCityAnalyticsData(usersData, businessesData, productsData, propertiesData) {

  const cities = {};

  // Aggregate users by city
  try {
    const users = Array.isArray(usersData) ? usersData : getSheetData(CONFIG.SHEETS.USERS);

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
    const businesses = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);

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
    const products = Array.isArray(productsData) ? productsData : getSheetData(CONFIG.SHEETS.PRODUCTS);

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
    const properties = Array.isArray(propertiesData) ? propertiesData : getSheetData(CONFIG.SHEETS.PROPERTIES);

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

function getActivityFeedData(usersData, businessesData, productsData, propertiesData, newsData) {

  const activities = [];
  const now = new Date();

  // Recent users
  try {
    const users = Array.isArray(usersData) ? usersData : getSheetData(CONFIG.SHEETS.USERS);
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
    const businesses = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);
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
    const products = Array.isArray(productsData) ? productsData : getSheetData(CONFIG.SHEETS.PRODUCTS);
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
    const properties = Array.isArray(propertiesData) ? propertiesData : getSheetData(CONFIG.SHEETS.PROPERTIES);
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
    const news = Array.isArray(newsData) ? newsData : getSheetData(CONFIG.SHEETS.NEWS);
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

function getTopCitiesData(usersData, businessesData, productsData) {

  const cityStats = {};

  // Count users per city
  try {
    const users = Array.isArray(usersData) ? usersData : getSheetData(CONFIG.SHEETS.USERS);

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
    const businesses = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);

    businesses.forEach(function(biz) {
      const city = (biz.City || "").trim();
      if (!city || !cityStats[city]) return;
      cityStats[city].businesses++;
    });
  } catch (e) { /* ignore */ }

  // Count products per city
  try {
    const products = Array.isArray(productsData) ? productsData : getSheetData(CONFIG.SHEETS.PRODUCTS);

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

function getTopCategoriesData(businessesData, productsData) {

  const categoryStats = {};

  // Count businesses per category
  try {
    const businesses = Array.isArray(businessesData) ? businessesData : getSheetData(CONFIG.SHEETS.BUSINESSES);

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
    const products = Array.isArray(productsData) ? productsData : getSheetData(CONFIG.SHEETS.PRODUCTS);

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
