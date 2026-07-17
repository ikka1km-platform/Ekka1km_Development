/**
 * ============================================================
 * EKKA1KM BACKEND
 * UserDashboard.js
 * Phase 3.4 - User Dashboard
 * V2.0 - CacheService Optimization + Property Interest + Store Analytics Events
 * ============================================================
 */

/**
 * ============================================================
 * GET USER DASHBOARD (Single Aggregated API with Caching)
 * ?action=dashboard&userId=U001
 * Cache: 60 seconds
 * ============================================================
 */
function getUserDashboard(e) {
  try {
    const userId = e && e.parameter ? e.parameter.userId || "" : "";
    
    if (!userId) {
      return error("userId required");
    }

    // Check cache
    var cache = CacheService.getScriptCache();
    var cacheKey = "dashboard_" + userId;
    var cached = cache.get(cacheKey);
    
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed) {
        return success(parsed, "Dashboard Loaded (cached)");
      }
    }

    var profile = getUserProfileSummary(userId);
    var activity = getUserActivitySummary(userId);
    var analytics = getUserAnalyticsSummary(userId);
    var recent = getRecentDashboardActivity(userId);
    var quickStats = getUserQuickStats(userId);

    var result = {
      profile: profile,
      activity: activity,
      analytics: analytics,
      recentActivity: recent,
      quickStats: quickStats
    };

    // Cache for 60 seconds
    cache.put(cacheKey, JSON.stringify(result), 60);

    return success(result, "Dashboard Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * INVALIDATE DASHBOARD CACHE
 * Call when: product/business added, interest added, promotion created, wallet updated
 * ============================================================
 */
function invalidateDashboardCache(userId) {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove("dashboard_" + userId);
  } catch (err) {
    Logger.log("invalidateDashboardCache error: " + err.toString());
  }
}


/**
 * ============================================================
 * GET USER PROFILE SUMMARY
 * ============================================================
 */
function getUserProfileSummary(userId) {
  try {
    const user = getRowById("Users", "UserID", userId);
    if (!user) return null;

    // Get wallet data - batch read once
    const walletData = getSheetData("Wallet");
    let walletBalance = 0;
    let coins = 0;

    walletData.forEach(function(w) {
      if (String(w.UserID) === String(userId)) {
        walletBalance = Number(w.Balance || 0);
        coins = Number(w.TotalEarned || 0);
      }
    });

    return {
      userId: user.UserID || "",
      name: user.FullName || user.Name || "",
      mobile: user.Mobile || user.Phone || "",
      email: user.Email || "",
      profilePhoto: user.ProfilePhoto || user.profilePhoto || "",
      verificationStatus: user.Status || user.VerificationStatus || "Pending",
      walletBalance: walletBalance,
      coins: coins,
      memberSince: user.CreatedDate || user.CreatedAt || ""
    };

  } catch (err) {
    Logger.log("getUserProfileSummary error: " + err.toString());
    return null;
  }
}


/**
 * ============================================================
 * GET USER ACTIVITY SUMMARY
 * Optimized with batch reads
 * ============================================================
 */
function getUserActivitySummary(userId) {
  try {
    var products = getSheetData("Products");
    var businesses = getSheetData("Businesses");
    var properties = getSheetData("Properties");
    var news = getSheetData("News");
    var interests = getSheetData("UserInterests") || [];
    var promotions = getSheetData("Promotions") || [];

    var productsCount = 0;
    var businessesCount = 0;
    var propertiesCount = 0;
    var newsCount = 0;
    var interestsCount = 0;
    var promotionsCount = 0;

    products.forEach(function(p) {
      if (String(p.UserID) === String(userId)) productsCount++;
    });

    businesses.forEach(function(b) {
      if (String(b.UserID) === String(userId)) businessesCount++;
    });

    properties.forEach(function(p) {
      if (String(p.UserID) === String(userId)) propertiesCount++;
    });

    news.forEach(function(n) {
      if (String(n.UserID) === String(userId)) newsCount++;
    });

    interests.forEach(function(i) {
      if (String(i.UserID) === String(userId) && String(i.Status || "Active") !== "Removed") interestsCount++;
    });

    promotions.forEach(function(p) {
      if (String(p.UserID) === String(userId)) promotionsCount++;
    });

    return {
      productsPosted: productsCount,
      businessesCreated: businessesCount,
      propertiesPosted: propertiesCount,
      newsPosted: newsCount,
      interestsCount: interestsCount,
      promotionsCount: promotionsCount
    };

  } catch (err) {
    Logger.log("getUserActivitySummary error: " + err.toString());
    return {
      productsPosted: 0, businessesCreated: 0, propertiesPosted: 0,
      newsPosted: 0, interestsCount: 0, promotionsCount: 0
    };
  }
}


/**
 * ============================================================
 * GET USER ANALYTICS SUMMARY
 * Includes: PropertyInterested, StoreView, StoreShare, StoreFollow, StoreUnfollow
 * ============================================================
 */
function getUserAnalyticsSummary(userId) {
  try {
    var totalViews = 0;
    var totalEnquiries = 0;
    var followers = 0;
    var productInterestedCount = 0;
    var propertyInterestedCount = 0;
    var promotionPerformance = { views: 0, clicks: 0, interested: 0, ctr: 0 };

    // Batch read once
    var events = getSheetData("AnalyticsEvents") || [];
    var products = getSheetData("Products");
    var businesses = getSheetData("Businesses");
    var properties = getSheetData("Properties");
    
    var userProductIds = {};
    var userBusinessIds = {};
    var userPropertyIds = {};
    
    products.forEach(function(p) {
      if (String(p.UserID) === String(userId)) userProductIds[p.ProductID] = true;
    });
    
    businesses.forEach(function(b) {
      if (String(b.UserID) === String(userId)) userBusinessIds[b.BusinessID] = true;
    });

    properties.forEach(function(p) {
      if (String(p.UserID) === String(userId)) userPropertyIds[p.PropertyID] = true;
    });

    // Single pass through events
    events.forEach(function(ev) {
      var entityId = String(ev.EntityID || "");
      var eventType = String(ev.EventType || "");
      
      var isUserEntity = userProductIds[entityId] || userBusinessIds[entityId] || userPropertyIds[entityId];
      if (!isUserEntity) return;

      if (eventType === "ProductView" || eventType === "BusinessView" || eventType === "NewsView" || eventType === "StoreView") {
        totalViews++;
      }
      if (eventType === "ProductInterested") {
        productInterestedCount++;
      }
      if (eventType === "PropertyInterested") {
        propertyInterestedCount++;
      }
      if (eventType === "LeadCreated" || eventType === "BusinessEnquiry") {
        totalEnquiries++;
      }
      if (eventType === "PromotionClick") {
        promotionPerformance.clicks++;
        promotionPerformance.views++;
      }
    });

    if (promotionPerformance.views > 0) {
      promotionPerformance.ctr = ((promotionPerformance.clicks / promotionPerformance.views) * 100).toFixed(2);
    }

    // Count interests on user's items (only Active status)
    var interests = getSheetData("UserInterests") || [];
    interests.forEach(function(i) {
      if (String(i.OwnerUserID) === String(userId) && String(i.Status || "Active") !== "Removed") {
        if (i.TargetType === "Property") {
          propertyInterestedCount++;
        } else {
          productInterestedCount++;
        }
      }
    });

    // Store followers (only Active status)
    var followersData = getSheetData("BusinessFollowers") || [];
    followersData.forEach(function(f) {
      if (String(f.Status || "Active") === "Active" && String(f.BusinessID) && 
          businesses.some(function(b) { return String(b.BusinessID) === String(f.BusinessID) && String(b.UserID) === String(userId); })) {
        followers++;
      }
    });

    return {
      totalViews: totalViews,
      totalEnquiries: totalEnquiries,
      followers: followers,
      productInterestedCount: productInterestedCount,
      propertyInterestedCount: propertyInterestedCount,
      totalInterestedCount: productInterestedCount + propertyInterestedCount,
      promotionPerformance: promotionPerformance
    };

  } catch (err) {
    Logger.log("getUserAnalyticsSummary error: " + err.toString());
    return {
      totalViews: 0, totalEnquiries: 0, followers: 0,
      productInterestedCount: 0, propertyInterestedCount: 0, totalInterestedCount: 0,
      promotionPerformance: { views: 0, clicks: 0, interested: 0, ctr: 0 }
    };
  }
}


/**
 * ============================================================
 * GET RECENT DASHBOARD ACTIVITY
 * ============================================================
 */
function getRecentDashboardActivity(userId) {
  try {
    var result = {
      latestProducts: [],
      latestEnquiries: [],
      latestInterests: [],
      latestNotifications: []
    };

    // Batch read
    var products = getSheetData("Products");
    var notifications = getSheetData("Notifications") || [];
    var interests = getSheetData("UserInterests") || [];
    var events = getSheetData("AnalyticsEvents") || [];

    // Latest Products by user
    var userProducts = [];
    products.forEach(function(p) {
      if (String(p.UserID) === String(userId)) {
        userProducts.push({ id: p.ProductID, title: p.Title, price: p.Price, image: p.ImageURL || p.Image || "", status: p.Status, date: p.CreatedDate });
      }
    });
    userProducts.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    result.latestProducts = userProducts.slice(0, 5);

    // Latest Notifications
    var userNotifications = [];
    notifications.forEach(function(n) {
      if (String(n.UserID) === String(userId)) {
        userNotifications.push({ id: n.NotificationID, title: n.Title, message: n.Message, type: n.Type, status: n.Status, date: n.CreatedDate });
      }
    });
    userNotifications.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    result.latestNotifications = userNotifications.slice(0, 5);

    // Latest Interests (only Active)
    var userInterests = [];
    interests.forEach(function(i) {
      if (String(i.OwnerUserID) === String(userId) && String(i.Status || "Active") !== "Removed") {
        userInterests.push({ id: i.InterestID, targetType: i.TargetType, targetId: i.TargetID, userId: i.UserID, date: i.CreatedDate });
      }
    });
    userInterests.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    result.latestInterests = userInterests.slice(0, 5);

    // Latest Enquiries
    var userEnquiries = [];
    var userProductIds = {};
    products.forEach(function(p) {
      if (String(p.UserID) === String(userId)) userProductIds[p.ProductID] = true;
    });
    
    events.forEach(function(ev) {
      var entityId = String(ev.EntityID || "");
      var eventType = String(ev.EventType || "");
      if ((userProductIds[entityId]) && (eventType === "LeadCreated" || eventType === "BusinessEnquiry" || eventType === "ProductInterested" || eventType === "PropertyInterested")) {
        userEnquiries.push({ eventId: ev.EventID, userId: ev.UserID, type: eventType, entityId: entityId, date: ev.CreatedDate });
      }
    });
    userEnquiries.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    result.latestEnquiries = userEnquiries.slice(0, 5);

    return result;

  } catch (err) {
    Logger.log("getRecentDashboardActivity error: " + err.toString());
    return { latestProducts: [], latestEnquiries: [], latestInterests: [], latestNotifications: [] };
  }
}


/**
 * ============================================================
 * GET USER QUICK STATS
 * ============================================================
 */
function getUserQuickStats(userId) {
  try {
    var stats = { activeProducts: 0, pendingProducts: 0, activePromotions: 0, unreadNotifications: 0, totalSpent: 0, totalEarned: 0 };

    var products = getSheetData("Products");
    products.forEach(function(p) {
      if (String(p.UserID) === String(userId)) {
        var status = String(p.Status || "").toLowerCase();
        if (status === "active" || status === "approved") stats.activeProducts++;
        if (status === "pending") stats.pendingProducts++;
      }
    });

    var campaigns = getSheetData("Promotions") || [];
    campaigns.forEach(function(c) {
      if (String(c.UserID) === String(userId) && String(c.Status || "").toLowerCase() === "active") {
        stats.activePromotions++;
      }
    });

    var notifications = getSheetData("Notifications") || [];
    notifications.forEach(function(n) {
      if (String(n.UserID) === String(userId) && String(n.Status || "").toLowerCase() !== "read") {
        stats.unreadNotifications++;
      }
    });

    var walletData = getSheetData("Wallet");
    walletData.forEach(function(w) {
      if (String(w.UserID) === String(userId)) {
        stats.totalEarned = Number(w.TotalEarned || 0);
      }
    });

    var transactions = getSheetData("WalletTransactions") || [];
    transactions.forEach(function(t) {
      if (String(t.UserID) === String(userId) && Number(t.Amount || 0) < 0) {
        stats.totalSpent += Math.abs(Number(t.Amount || 0));
      }
    });

    return stats;

  } catch (err) {
    Logger.log("getUserQuickStats error: " + err.toString());
    return { activeProducts: 0, pendingProducts: 0, activePromotions: 0, unreadNotifications: 0, totalSpent: 0, totalEarned: 0 };
  }
}


/**
 * ============================================================
 * GET USER DASHBOARD (Alias)
 * ============================================================
 */
function getUserProfileSummaryById(userId) {
  return getUserProfileSummary(userId);
}