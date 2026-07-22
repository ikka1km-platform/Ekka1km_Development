/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminManagement.js
 * V5.11.0 - ADMIN WORKFORCE MANAGEMENT & MODULE NAVIGATION (Phase 5.4)
 * User, Business, Product, Property, News, Workforce Management APIs
 * ============================================================
 */


/**
 * ============================================================
 * ADMIN: GET ALL USERS
 * ?action=adminusers&session=TOKEN&search=TERM&status=FILTER&page=1&limit=50
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

    // Filter by search
    if (search) {
      users = users.filter(function(u) {
        return (u.FullName || "").toLowerCase().indexOf(search) !== -1 ||
               (u.Email || "").toLowerCase().indexOf(search) !== -1 ||
               (u.Mobile || "").indexOf(search) !== -1 ||
               (u.UserID || "").toLowerCase().indexOf(search) !== -1 ||
               (u.City || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    // Filter by status
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
 * ?action=adminuserstatus&session=TOKEN&userId=U001&status=Active|Suspended|Deactivated|Deleted
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
 * ?action=adminuserdetail&session=TOKEN&userId=U001
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

    // Get wallet info
    let wallet = {};
    try {
      const walletData = getSheetData(CONFIG.SHEETS.WALLET);
      walletData.forEach(function(w) {
        if (String(w.UserID || "").trim() === userId) {
          wallet = w;
        }
      });
    } catch (e) { /* ignore */ }

    // Get product count
    let productCount = 0;
    try {
      const products = getSheetData(CONFIG.SHEETS.PRODUCTS);
      products.forEach(function(p) {
        if (String(p.UserID || p.SellerID || "").trim() === userId) {
          productCount++;
        }
      });
    } catch (e) { /* ignore */ }

    // Get business count
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
 * ?action=adminbusinesses&session=TOKEN&search=TERM&status=FILTER&page=1&limit=50
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
 * ?action=adminbusinessstatus&session=TOKEN&businessId=B001&status=Active|Rejected|Suspended|Deleted
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
 * ?action=adminproducts&session=TOKEN&search=TERM&status=FILTER&category=FILTER&page=1&limit=50
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
 * ?action=adminproductstatus&session=TOKEN&productId=P001&status=Active|Rejected|Deleted|Featured
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
 * ?action=adminproperties&session=TOKEN&search=TERM&status=FILTER&purpose=FILTER&page=1&limit=50
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
 * ?action=adminpropertystatus&session=TOKEN&propertyId=PR001&status=Active|Rejected|Deleted
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
 * ?action=adminnews&session=TOKEN&search=TERM&status=FILTER&page=1&limit=50
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
 * ?action=adminnewsstatus&session=TOKEN&newsId=N001&status=Published|Unpublished|Deleted
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
 * ADMIN: GET WORKFORCE (ADMINS LIST)
 * ?action=adminworkforce&session=TOKEN
 * ============================================================
 */

function getAdminWorkforce(e) {
  try {

    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const admins = getSheetData(CONFIG.SHEETS.ADMINS);

    // Get active sessions to determine online status
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

    // Build workforce list
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
 * ?action=adminupdateworkforce&session=TOKEN&adminId=EKKA001&role=Manager&department=Sales&designation=Sr.Manager&status=Active
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
 * ADMIN: GET CATEGORIES LIST (for filters)
 * ?action=admincategories&session=TOKEN&type=products|businesses|news
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