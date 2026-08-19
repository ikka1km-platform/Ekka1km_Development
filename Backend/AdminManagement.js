/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminManagement.js
 * V5.11.0 - ADMIN WORKFORCE MANAGEMENT & MODULE NAVIGATION (Phase 5.4)
 * User, Business, Product, Property, News, Workforce Management APIs
 * Phase 5.6A - Added adminPromotionCampaigns, adminAdvertisements APIs
 * Phase 5.6B - Added campaign lifecycle action APIs
 * ============================================================
 */

/**
 * ============================================================
 * HELPER: NORMALIZE BOOLEAN
 * Safely converts various boolean representations to "Yes"/"No"
 * Handles: YES, Yes, yes, TRUE, True, true, 1, Y, etc.
 * ============================================================
 */
function normalizeBoolean(value, defaultValue) {
  if (!value) return defaultValue || "No";
  
  const str = String(value).trim().toLowerCase();
  
  // Truthy values
  if (["yes", "true", "1", "y", "on"].indexOf(str) !== -1) {
    return "Yes";
  }
  
  // Falsy values
  if (["no", "false", "0", "n", "off", ""].indexOf(str) !== -1) {
    return "No";
  }
  
  // If unrecognized, return default
  return defaultValue || "No";
}


/**
 * ============================================================
 * ADMIN: GET ALL USERS
 * ============================================================
 */

function getAdminUsers(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let users = getSheetData(CONFIG.SHEETS.USERS);

    if (search) {
      users = users.filter(function(u) {
        return (u.FullName || "").toLowerCase().indexOf(search) !== -1 ||
               (u.Email || "").toLowerCase().indexOf(search) !== -1 ||
               (u.Mobile || "").indexOf(search) !== -1 ||
               (u.UserID || "").toLowerCase().indexOf(search) !== -1 ||
               (u.City || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      users = users.filter(function(u) {
        return (u.Status || "").toLowerCase() === statusFilter;
      });
    }

    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = users.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Users Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE USER STATUS
 * ============================================================
 */

function setAdminUserStatus(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const userId = (e.parameter.userId || "").trim();
    const newStatus = (e.parameter.status || "").trim();

    if (!userId || !newStatus) {
      return error("userId and status are required");
    }

    const validStatuses = ["Active", "Suspended", "Deactivated", "Deleted"];
    if (validStatuses.indexOf(newStatus) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    const updated = updateRow(CONFIG.SHEETS.USERS, "UserID", userId, {
      Status: newStatus
    });

    if (!updated) {
      return error("User not found");
    }

    return success({ userId: userId, status: newStatus }, "User status updated to " + newStatus);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET USER DETAIL
 * ============================================================
 */

function getAdminUserDetail(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const userId = (e.parameter.userId || "").trim();
    if (!userId) return error("userId required");

    const user = getRowById(CONFIG.SHEETS.USERS, "UserID", userId);
    if (!user) return error("User not found");

    let wallet = {};
    try {
      const walletData = getSheetData(CONFIG.SHEETS.WALLET);
      walletData.forEach(function(w) {
        if (String(w.UserID || "").trim() === userId) {
          wallet = w;
        }
      });
    } catch (e) { /* ignore */ }

    let productCount = 0;
    try {
      const products = getSheetData(CONFIG.SHEETS.PRODUCTS);
      products.forEach(function(p) {
        if (String(p.UserID || p.SellerID || "").trim() === userId) {
          productCount++;
        }
      });
    } catch (e) { /* ignore */ }

    let businessCount = 0;
    try {
      const businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);
      businesses.forEach(function(b) {
        if (String(b.OwnerID || b.UserID || "").trim() === userId) {
          businessCount++;
        }
      });
    } catch (e) { /* ignore */ }

    return success({
      user: user,
      wallet: wallet,
      stats: {
        products: productCount,
        businesses: businessCount
      }
    }, "User Detail Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET ALL BUSINESSES
 * ============================================================
 */

function getAdminBusinesses(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let businesses = getSheetData(CONFIG.SHEETS.BUSINESSES);

    if (search) {
      businesses = businesses.filter(function(b) {
        return (b.BusinessName || "").toLowerCase().indexOf(search) !== -1 ||
               (b.OwnerName || "").toLowerCase().indexOf(search) !== -1 ||
               (b.Category || "").toLowerCase().indexOf(search) !== -1 ||
               (b.City || "").toLowerCase().indexOf(search) !== -1 ||
               (b.BusinessID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      businesses = businesses.filter(function(b) {
        return (b.Status || "").toLowerCase() === statusFilter;
      });
    }

    const total = businesses.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = businesses.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Businesses Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE BUSINESS STATUS
 * ============================================================
 */

function setAdminBusinessStatus(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const businessId = (e.parameter.businessId || "").trim();
    const newStatus = (e.parameter.status || "").trim();

    if (!businessId || !newStatus) {
      return error("businessId and status are required");
    }

    const validStatuses = ["Active", "Rejected", "Suspended", "Deleted", "Pending"];
    if (validStatuses.indexOf(newStatus) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    const updated = updateRow(CONFIG.SHEETS.BUSINESSES, "BusinessID", businessId, {
      Status: newStatus
    });

    if (!updated) return error("Business not found");

    return success({ businessId: businessId, status: newStatus }, "Business status updated to " + newStatus);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET ALL PRODUCTS
 * ============================================================
 */

function getAdminProducts(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const categoryFilter = (e.parameter.category || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let products = getSheetData(CONFIG.SHEETS.PRODUCTS);

    if (search) {
      products = products.filter(function(p) {
        return (p.ProductName || p.Name || "").toLowerCase().indexOf(search) !== -1 ||
               (p.Category || "").toLowerCase().indexOf(search) !== -1 ||
               (p.SellerName || "").toLowerCase().indexOf(search) !== -1 ||
               (p.ProductID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      products = products.filter(function(p) {
        return (p.Status || "").toLowerCase() === statusFilter;
      });
    }

    if (categoryFilter) {
      products = products.filter(function(p) {
        return (p.Category || "").toLowerCase() === categoryFilter;
      });
    }

    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = products.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Products Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE PRODUCT STATUS
 * ============================================================
 */

function setAdminProductStatus(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const productId = (e.parameter.productId || "").trim();
    const newStatus = (e.parameter.status || "").trim();

    if (!productId || !newStatus) {
      return error("productId and status are required");
    }

    const validStatuses = ["Active", "Rejected", "Deleted", "Featured", "Pending"];
    if (validStatuses.indexOf(newStatus) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    const updated = updateRow(CONFIG.SHEETS.PRODUCTS, "ProductID", productId, {
      Status: newStatus
    });

    if (!updated) return error("Product not found");

    return success({ productId: productId, status: newStatus }, "Product status updated to " + newStatus);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET ALL PROPERTIES
 * ============================================================
 */

function getAdminProperties(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const purposeFilter = (e.parameter.purpose || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let properties = getSheetData(CONFIG.SHEETS.PROPERTIES);

    if (search) {
      properties = properties.filter(function(p) {
        return (p.Title || p.Name || "").toLowerCase().indexOf(search) !== -1 ||
               (p.Category || "").toLowerCase().indexOf(search) !== -1 ||
               (p.OwnerName || "").toLowerCase().indexOf(search) !== -1 ||
               (p.PropertyID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      properties = properties.filter(function(p) {
        return (p.Status || "").toLowerCase() === statusFilter;
      });
    }

    if (purposeFilter) {
      properties = properties.filter(function(p) {
        return (p.Purpose || "").toLowerCase() === purposeFilter;
      });
    }

    const total = properties.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = properties.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Properties Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE PROPERTY STATUS
 * ============================================================
 */

function setAdminPropertyStatus(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const propertyId = (e.parameter.propertyId || "").trim();
    const newStatus = (e.parameter.status || "").trim();

    if (!propertyId || !newStatus) {
      return error("propertyId and status are required");
    }

    const validStatuses = ["Active", "Rejected", "Deleted", "Pending"];
    if (validStatuses.indexOf(newStatus) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    const updated = updateRow(CONFIG.SHEETS.PROPERTIES, "PropertyID", propertyId, {
      Status: newStatus
    });

    if (!updated) return error("Property not found");

    return success({ propertyId: propertyId, status: newStatus }, "Property status updated to " + newStatus);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET ALL NEWS
 * ============================================================
 */

function getAdminNews(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let news = getSheetData(CONFIG.SHEETS.NEWS);

    if (search) {
      news = news.filter(function(n) {
        return (n.Title || n.Headline || "").toLowerCase().indexOf(search) !== -1 ||
               (n.Category || "").toLowerCase().indexOf(search) !== -1 ||
               (n.Author || "").toLowerCase().indexOf(search) !== -1 ||
               (n.NewsID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      news = news.filter(function(n) {
        return (n.Status || "").toLowerCase() === statusFilter;
      });
    }

    const total = news.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = news.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "News Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE NEWS STATUS
 * ============================================================
 */

function setAdminNewsStatus(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const newsId = (e.parameter.newsId || "").trim();
    const newStatus = (e.parameter.status || "").trim();

    if (!newsId || !newStatus) {
      return error("newsId and status are required");
    }

    const validStatuses = ["Published", "Unpublished", "Deleted", "Featured", "Pending"];
    if (validStatuses.indexOf(newStatus) === -1) {
      return error("Invalid status. Must be: " + validStatuses.join(", "));
    }

    const updated = updateRow(CONFIG.SHEETS.NEWS, "NewsID", newsId, {
      Status: newStatus
    });

    if (!updated) return error("News not found");

    return success({ newsId: newsId, status: newStatus }, "News status updated to " + newStatus);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET WORKFORCE
 * ============================================================
 */

function getAdminWorkforce(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const admins = getSheetData(CONFIG.SHEETS.ADMINS);

    let activeSessions = {};
    try {
      const sessionsSheet = getSheet(CONFIG.SHEETS.ADMIN_SESSIONS);
      if (sessionsSheet) {
        const sessData = sessionsSheet.getDataRange().getValues();
        if (sessData.length > 1) {
          const headers = sessData[0];
          const adminIdCol = headers.indexOf("AdminID");
          const statusCol = headers.indexOf("Status");
          const lastActivityCol = headers.indexOf("LastActivity");
          if (adminIdCol >= 0 && statusCol >= 0) {
            for (let i = 1; i < sessData.length; i++) {
              if (String(sessData[i][statusCol] || "").toLowerCase() === "active") {
                const aid = String(sessData[i][adminIdCol] || "").trim();
                const lastAct = sessData[i][lastActivityCol] || "";
                if (aid) {
                  activeSessions[aid] = {
                    online: true,
                    lastActivity: lastAct
                  };
                }
              }
            }
          }
        }
      }
    } catch (e) { /* ignore */ }

    const workforce = admins.map(function(a) {
      const session = activeSessions[a.AdminID] || {};
      return {
        adminId: a.AdminID,
        fullName: a.FullName || "",
        email: a.Email || "",
        role: a.Role || "",
        department: a.Department || "",
        designation: a.Designation || "",
        status: a.Status || "",
        online: session.online || false,
        lastActivity: session.lastActivity || a.LastLogin || "",
        permissions: a.Permissions || "{}"
      };
    });

    return success({
      count: workforce.length,
      data: workforce
    }, "Workforce Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: UPDATE WORKFORCE MEMBER
 * ============================================================
 */

function updateAdminWorkforce(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const adminId = (e.parameter.adminId || "").trim().toUpperCase();
    if (!adminId) return error("adminId required");

    const updates = {};
    const fields = ["Role", "Department", "Designation", "Status", "FullName", "Email"];
    fields.forEach(function(f) {
      const val = e.parameter[f.charAt(0).toLowerCase() + f.slice(1)];
      if (val !== undefined && val !== "") {
        updates[f] = val;
      }
    });

    if (Object.keys(updates).length === 0) {
      return error("No fields to update");
    }

    const updated = updateRow(CONFIG.SHEETS.ADMINS, "AdminID", adminId, updates);
    if (!updated) return error("Admin not found");

    return success({ adminId: adminId, updates: updates }, "Workforce member updated");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: GET CATEGORIES LIST
 * ============================================================
 */

function getAdminCategories(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const type = (e.parameter.type || "products").trim().toLowerCase();
    let sheetName = CONFIG.SHEETS.PRODUCTS;
    let categoryCol = "Category";

    if (type === "businesses") {
      sheetName = CONFIG.SHEETS.BUSINESSES;
    } else if (type === "news") {
      sheetName = CONFIG.SHEETS.NEWS;
      categoryCol = "Category";
    }

    const data = getSheetData(sheetName);
    const categories = {};
    data.forEach(function(row) {
      const cat = (row[categoryCol] || "").trim();
      if (cat) {
        categories[cat] = (categories[cat] || 0) + 1;
      }
    });

    const result = Object.keys(categories).map(function(c) {
      return { category: c, count: categories[c] };
    }).sort(function(a, b) { return b.count - a.count; });

    return success(result, "Categories Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PHASE 5.6A — ADMIN: GET PROMOTION CAMPAIGNS
 * ?action=adminpromotioncampaigns&session=TOKEN&search=TERM&status=FILTER&creativeType=FILTER&page=1&limit=20
 * Returns normalized PromotionCampaign data with owner info
 * ============================================================
 */
function getAdminPromotionCampaigns(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter.status || "").trim().toLowerCase();
    const creativeFilter = (e.parameter.creativeType || "").trim();
    const page = Math.max(1, parseInt(e.parameter.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(e.parameter.limit || "20")));

    // Get raw campaign data and normalize
    let campaigns = getSheetData("PromotionCampaigns");

    // Build user lookup map for owner resolution
    var userMap = {};
    try {
      var usersData = getSheetData(CONFIG.SHEETS.USERS);
      usersData.forEach(function(u) {
        userMap[u.UserID] = u.FullName || u.Name || u.Mobile || "";
      });
    } catch (e) { /* ignore */ }

    // Normalize and filter
    if (typeof normalizeCampaign === "function") {
      campaigns = campaigns.map(function(c) { return normalizeCampaign(c); });
    }

    if (search) {
      campaigns = campaigns.filter(function(c) {
        return String(c.CampaignID || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.CampaignType || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.TargetType || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.TargetID || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.Title || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.City || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.State || "").toLowerCase().indexOf(search) !== -1 ||
               String(c.OwnerUserID || "").toLowerCase().indexOf(search) !== -1 ||
               String(userMap[c.OwnerUserID] || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (statusFilter) {
      var statusLower = statusFilter;
      campaigns = campaigns.filter(function(c) {
        var cs = String(c.Status || "").toLowerCase();
        // Support grouping: "expired" includes Ended/Completed
        if (statusLower === "expired" || statusLower === "ended") {
          return cs === "expired" || cs === "ended" || cs === "completed";
        }
        if (statusLower === "active") {
          return cs === "active";
        }
        return cs === statusLower;
      });
    }

    if (creativeFilter) {
      campaigns = campaigns.filter(function(c) {
        return String(c.CreativeType || "").toLowerCase() === creativeFilter.toLowerCase();
      });
    }

    // Build response with owner name
    // Promotion Engine V2: Support both legacy and new fuel economy fields
    var enriched = campaigns.map(function(c) {
      // V2 compatibility mapping (same logic as normalizeCampaign in Promotion.js)
      var coinsConsumed = Number(c.CoinsConsumed || c.CoinsSpent || 0);
      var promotionFuel = Number(c.PromotionFuel || c.RewardPool || c.CampaignBudget || 0);
      var remainingFuel = Number(c.RemainingFuel || c.RemainingRewardCoins || promotionFuel || 0);
      var rewardRatePerSecond = Number(c.RewardRatePerSecond || 1);
      var duration = Number(c.Duration || 10);
      var estimatedViewSeconds = rewardRatePerSecond > 0 ? Math.floor(promotionFuel / rewardRatePerSecond) : 0;
      var estimatedViews = duration > 0 ? Math.floor(estimatedViewSeconds / duration) : 0;

      return {
        CampaignID: c.CampaignID || "",
        CampaignType: c.CampaignType || "",
        OwnerUserID: c.OwnerUserID || "",
        OwnerName: userMap[c.OwnerUserID] || c.OwnerUserID || "Unknown",
        TargetType: c.TargetType || "",
        TargetID: c.TargetID || "",
        CreativeType: c.CreativeType || "IMAGE",
        CTA: c.CTA || "",
        DestinationType: c.DestinationType || "None",
        ImageURL: c.ImageURL || "",
        VideoURL: c.VideoURL || "",
        ExternalURL: c.ExternalURL || "",
        PageContent: c.PageContent || "",
        Title: c.Title || "",
        Description: c.Description || "",
        Radius: c.Radius || c.TargetRadius || "",
        City: c.City || "",
        District: c.District || "",
        State: c.State || "",
        Country: c.Country || "",
        Latitude: c.Latitude || "",
        Longitude: c.Longitude || "",
        Views: Number(c.Views || 0),
        Clicks: Number(c.Clicks || 0),
        Interested: Number(c.Interested || 0),
        Shares: Number(c.Shares || 0),
        // V2 fields (primary)
        CoinsConsumed: coinsConsumed,
        PromotionFuel: promotionFuel,
        RemainingFuel: remainingFuel,
        RewardRatePerSecond: rewardRatePerSecond,
        EstimatedViewSeconds: estimatedViewSeconds,
        EstimatedViews: estimatedViews,
        // Legacy fields (backward compatible aliases)
        CoinsSpent: coinsConsumed,
        RewardPool: promotionFuel,
        RemainingRewardCoins: remainingFuel,
        RewardCoins: Number(c.RewardCoins || 0),
        Duration: duration,
        StartDate: c.StartDate || "",
        EndDate: c.EndDate || "",
        Status: c.Status || "",
        CreatedDate: c.CreatedDate || c.CreatedAt || "",
        Priority: Number(c.Priority || 0),
        // Normalize Featured/PIPEnabled to consistent format for frontend
        Featured: normalizeBoolean(c.Featured, "No"),
        PIPEnabled: normalizeBoolean(c.PIPEnabled, "Yes")
      };
    });

    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = enriched.slice(start, start + limit);

    // Also compute summary stats
    // Promotion Engine V2: Use V2 field names in stats
    var stats = {
      totalCampaigns: total,
      activeCount: 0,
      pausedCount: 0,
      pendingCount: 0,
      expiredCount: 0,
      completedCount: 0,
      totalViews: 0,
      totalClicks: 0,
      totalInterested: 0,
      totalShares: 0,
      totalCoinsSpent: 0,
      totalRewardPool: 0,
      totalRemainingRewardCoins: 0,
      // V2 stats fields
      totalPromotionFuel: 0,
      totalRemainingFuel: 0,
      totalCoinsConsumed: 0
    };

    enriched.forEach(function(c) {
      var s = String(c.Status || "").toLowerCase();
      if (s === "active") stats.activeCount++;
      else if (s === "paused") stats.pausedCount++;
      else if (s === "pending") stats.pendingCount++;
      else if (s === "expired" || s === "ended" || s === "completed") stats.expiredCount++;
      else stats.completedCount++;
      stats.totalViews += c.Views;
      stats.totalClicks += c.Clicks;
      stats.totalInterested += c.Interested;
      stats.totalShares += c.Shares;
      // V2 fields (also populate legacy aliases for backward compatibility)
      stats.totalCoinsSpent += c.CoinsSpent;
      stats.totalCoinsConsumed += c.CoinsConsumed;
      stats.totalRewardPool += c.RewardPool;
      stats.totalPromotionFuel += c.PromotionFuel;
      stats.totalRemainingRewardCoins += c.RemainingRewardCoins;
      stats.totalRemainingFuel += c.RemainingFuel;
    });

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged,
      stats: stats
    }, "Promotion Campaigns Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PHASE 5.6A — ADMIN: GET LEGACY ADVERTISEMENTS (read-only)
 * ?action=adminadvertisements&session=TOKEN&page=1&limit=50
 * Returns legacy Advertisements data for unified view
 * ============================================================
 */
function getAdminAdvertisements(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const page = Math.max(1, parseInt(e.parameter.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(e.parameter.limit || "50")));

    let ads = getSheetData("Advertisements");

    const total = ads.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = ads.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Advertisements Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * Phase 5.6A — ADMIN: Get promotionCampaigns (legacy route)
 * ?action=promotioncampaigns&session=TOKEN
 * Also kept for backward compatibility
 * ============================================================
 */
function getPromotionCampaigns(e) {
  return getAdminPromotionCampaigns(e);
}


/**
 * ============================================================
 * PHASE 5.6B — ADMIN: CAMPAIGN LIFECYCLE ACTIONS
 * ============================================================
 */

/**
 * ADMIN: APPROVE CAMPAIGN
 * ?action=adminapprovecampaign&session=TOKEN&campaignId=C001
 */
function adminApproveCampaign(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    if (!campaignId) return error("campaignId required");

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const currentStatus = String(campaign.Status || "").toLowerCase();
    if (currentStatus !== "pending") {
      return error("Only pending campaigns can be approved. Current status: " + campaign.Status);
    }

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Active"
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Campaign Approval:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "approve",
      previousStatus: "Pending",
      newStatus: "Active",
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, status: "Active" }, "Campaign approved and activated");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: REJECT CAMPAIGN
 * ?action=adminrejectcampaign&session=TOKEN&campaignId=C001&reason=Reason+text
 */
function adminRejectCampaign(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    const reason = (e.parameter.reason || "").trim();

    if (!campaignId) return error("campaignId required");
    if (!reason) return error("Rejection reason is required");
    if (reason.length < 5) return error("Rejection reason must be at least 5 characters");

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const currentStatus = String(campaign.Status || "").toLowerCase();
    if (currentStatus !== "pending") {
      return error("Only pending campaigns can be rejected. Current status: " + campaign.Status);
    }

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Rejected"
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Campaign Rejection:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "reject",
      previousStatus: "Pending",
      newStatus: "Rejected",
      reason: reason,
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, status: "Rejected", reason: reason }, "Campaign rejected");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: SUSPEND CAMPAIGN
 * ?action=adminsuspendcampaign&session=TOKEN&campaignId=C001&reason=Reason+text
 */
function adminSuspendCampaign(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    const reason = (e.parameter.reason || "").trim();

    if (!campaignId) return error("campaignId required");
    if (!reason) return error("Suspension reason is required");
    if (reason.length < 5) return error("Suspension reason must be at least 5 characters");

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const currentStatus = String(campaign.Status || "").toLowerCase();
    if (currentStatus !== "active" && currentStatus !== "paused") {
      return error("Only active or paused campaigns can be suspended. Current status: " + campaign.Status);
    }

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Suspended"
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Campaign Suspension:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "suspend",
      previousStatus: campaign.Status,
      newStatus: "Suspended",
      reason: reason,
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, status: "Suspended", reason: reason }, "Campaign suspended");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: TERMINATE CAMPAIGN
 * ?action=adminterminatecampaign&session=TOKEN&campaignId=C001
 */
function adminTerminateCampaign(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    if (!campaignId) return error("campaignId required");

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const currentStatus = String(campaign.Status || "").toLowerCase();
    if (currentStatus === "completed" || currentStatus === "expired" || currentStatus === "ended") {
      return error("Campaign has already ended. Status: " + campaign.Status);
    }

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Terminated"
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Campaign Termination:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "terminate",
      previousStatus: campaign.Status,
      newStatus: "Terminated",
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, status: "Terminated" }, "Campaign terminated");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: RESUME CAMPAIGN
 * ?action=adminresumecampaign&session=TOKEN&campaignId=C001
 * Promotion Engine V2: Resumes suspended/paused campaigns
 */
function adminResumeCampaign(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    if (!campaignId) return error("campaignId required");

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const currentStatus = String(campaign.Status || "").toLowerCase();
    if (currentStatus !== "suspended" && currentStatus !== "paused") {
      return error("Only suspended or paused campaigns can be resumed. Current status: " + campaign.Status);
    }

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Status: "Active"
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Campaign Resume:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "resume",
      previousStatus: campaign.Status,
      newStatus: "Active",
      timestamp: new Date()
    });

    // Promotion Engine V2: Return fuel integrity info
    var coinsConsumed = Number(campaign.CoinsConsumed || campaign.CoinsSpent || 0);
    var promotionFuel = Number(campaign.PromotionFuel || campaign.RewardPool || 0);
    var remainingFuel = Number(campaign.RemainingFuel || campaign.RemainingRewardCoins || promotionFuel || 0);

    return success({ 
      campaignId: campaignId, 
      status: "Active",
      // V2 fuel economy fields (preserved from campaign)
      promotionFuel: promotionFuel,
      remainingFuel: remainingFuel,
      coinsConsumed: coinsConsumed
    }, "Campaign resumed and activated");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: TOGGLE FEATURED
 * ?action=admintogglefeatured&session=TOKEN&campaignId=C001&featured=Yes
 */
function adminToggleFeatured(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    const featured = (e.parameter.featured || "").trim();

    if (!campaignId) return error("campaignId required");
    if (!featured) return error("featured value required (Yes/No)");

    const featuredUpper = featured.toUpperCase();
    if (featuredUpper !== "YES" && featuredUpper !== "NO") {
      return error("featured must be Yes or No");
    }

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const previousFeatured = campaign.Featured || "No";

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      Featured: featuredUpper
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin Featured Toggle:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "toggleFeatured",
      previousValue: previousFeatured,
      newValue: featuredUpper,
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, featured: featuredUpper }, "Campaign featured set to " + featuredUpper);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ADMIN: TOGGLE PIP ENABLED
 * ?action=admintogglepip&session=TOKEN&campaignId=C001&pipEnabled=Yes
 */
function adminTogglePipEnabled(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    const pipEnabled = (e.parameter.pipEnabled || "").trim();

    if (!campaignId) return error("campaignId required");
    if (!pipEnabled) return error("pipEnabled value required (Yes/No)");

    const pipUpper = pipEnabled.toUpperCase();
    if (pipUpper !== "YES" && pipUpper !== "NO") {
      return error("pipEnabled must be Yes or No");
    }

    const campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
    if (!campaign) return error("Campaign not found");

    const previousPip = campaign.PIPEnabled || "No";

    const updated = updateRow("PromotionCampaigns", "CampaignID", campaignId, {
      PIPEnabled: pipUpper
    });

    if (!updated) return error("Failed to update campaign");

    console.log("Admin PIP Toggle:", {
      adminId: sessionResult.adminId,
      campaignId: campaignId,
      action: "togglePipEnabled",
      previousValue: previousPip,
      newValue: pipUpper,
      timestamp: new Date()
    });

    return success({ campaignId: campaignId, pipEnabled: pipUpper }, "Campaign PIP enabled set to " + pipUpper);

  } catch (err) {
    return exception(err);
  }
}
