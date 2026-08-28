/**
 * ============================================================
 * EKKA1KM BACKEND
 * Posting.js
 * Phase 4 - Content Posting System
 * Unified CRUD for Products, Properties, Businesses, News
 * Status system: Draft, Pending, Published, Inactive, Sold, Expired, Deleted
 * Soft delete support
 * ============================================================
 */

/**
 * ============================================================
 * POSTING LIMITS
 * ============================================================
 */
var POSTING_LIMITS = {
  "Product": { daily: 20, hourly: 5 },
  "Property": { daily: 10, hourly: 3 },
  "Business": { daily: 5, hourly: 2 },
  "News": { daily: 10, hourly: 3 },
  "Announcement": { daily: 10, hourly: 3 }
};

/**
 * ============================================================
 * VALIDATE POSTING LIMITS
 * ============================================================
 */
function validatePostingLimit(userId, contentType) {
  try {
    var limits = POSTING_LIMITS[contentType];
    if (!limits) return { allowed: true };

    var now = new Date();
    var oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    var oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    var sheetName = contentType + "s"; // Products, Properties, Businesses, News
    var data = getSheetData(sheetName) || [];

    var hourlyCount = 0;
    var dailyCount = 0;

    data.forEach(function(item) {
      if (String(item.UserID) !== String(userId)) return;
      
      var createdDate = item.CreatedDate ? new Date(item.CreatedDate) : null;
      if (!createdDate) return;

      if (createdDate >= oneHourAgo) hourlyCount++;
      if (createdDate >= oneDayAgo) dailyCount++;
    });

    if (hourlyCount >= limits.hourly) {
      return { allowed: false, reason: "Hourly limit reached. Max " + limits.hourly + " " + contentType.toLowerCase() + "(s) per hour." };
    }

    if (dailyCount >= limits.daily) {
      return { allowed: false, reason: "Daily limit reached. Max " + limits.daily + " " + contentType.toLowerCase() + "(s) per day." };
    }

    return { allowed: true };

  } catch (err) {
    Logger.log("validatePostingLimit error: " + err.toString());
    return { allowed: true }; // Allow on error
  }
}

/**
 * ============================================================
 * CREATE PRODUCT
 * ?action=createproduct&userId=U001&title=iPhone&price=50000&status=Published
 * ============================================================
 */
function createProduct(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) return error("userId required");

    // Validate posting limit
    var limitCheck = validatePostingLimit(userId, "Product");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    const sheet = getSheet("Products");
    const productId = "P" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Published" && status !== "Inactive" && status !== "Sold" && status !== "Expired" && status !== "Deleted") {
      status = "Pending";
    }

    var latitude = p.latitude || p.lat || "";
    var longitude = p.longitude || p.lng || "";

    sheet.appendRow([
      productId,
      userId,
      p.businessId || "",
      p.title || "",
      p.description || "",
      p.price || "",
      p.category || "",
      p.imageURL || "",
      latitude,
      longitude,
      status,
      new Date(),
      0,
      0,
      p.featured || "No",
      p.sellerName || "",
      p.phone || "",
      p.whatsapp || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.pincode || "",
      p.condition || "",
      p.brand || "",
      p.model || "",
      p.image2 || "",
      p.image3 || "",
      p.videoUrl || "",
      p.delivery || "No",
      p.cod || "No",
      p.negotiable || "No",
      p.featuredTill || ""
    ]);

    // Track event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "ProductCreated", userId: userId, entityType: "Product", entityId: productId }
        });
      }
    } catch (te) { Logger.log("ProductCreated track error: " + te); }

    return success({ productId: productId, status: status }, "Product created successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE PRODUCT
 * ============================================================
 */
function updateProduct(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var p = e && e.parameter ? e.parameter : {};
    var productId = p.productId || p.id || "";

    if (!productId) return error("productId required");

    var sheet = getSheet("Products");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var userIdIndex = headers.indexOf("UserID");
    var productRow = null;
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(productId).trim()) {
        productRow = data[i];
        rowIndex = i;
        break;
      }
    }

    if (!productRow || rowIndex < 0) {
      return error("Product not found");
    }

    // Ownership validation
    var ownerUserId = userIdIndex >= 0 ? String(productRow[userIdIndex]) : "";
    var requestingUserId = p.userId || "";
    if (requestingUserId && String(ownerUserId) !== String(requestingUserId)) {
      return error("Not authorized to update this product");
    }

    // Do not allow changing immutable fields
    var protectedFields = ["ProductID", "UserID", "CreatedDate"];

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (protectedFields.indexOf(key) >= 0) continue;
      if (p[key] === undefined || p[key] === "") continue;
      sheet.getRange(rowIndex + 1, j + 1).setValue(p[key]);
    }

    // Track event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "ProductUpdated", userId: requestingUserId, entityType: "Product", entityId: productId }
        });
      }
    } catch (te) { Logger.log("ProductUpdated track error: " + te); }

    return success({ productId: productId }, "Product updated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE PRODUCT (Soft delete)
 * ============================================================
 */
function deleteProduct(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var productId = e && e.parameter ? e.parameter.productId || e.parameter.id || "" : "";
    if (!productId) return error("productId required");
    var product = getRowById("Products", "ProductID", productId);
    if (!product || String(product.UserID || "") !== auth.userId) return error("Forbidden");

    var updated = updateRow("Products", "ProductID", productId, {
      Status: "Deleted",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Product not found");

    // Track event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "ProductDeleted", userId: "", entityType: "Product", entityId: productId }
        });
      }
    } catch (te) { Logger.log("ProductDeleted track error: " + te); }

    return success({ productId: productId }, "Product deleted successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * RESTORE PRODUCT
 * ============================================================
 */
function restoreProduct(e) {
  try {
    var productId = e && e.parameter ? e.parameter.productId || "" : "";
    if (!productId) return error("productId required");

    var updated = updateRow("Products", "ProductID", productId, {
      Status: "Pending",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Product not found");

    return success({ productId: productId }, "Product restored successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * PROPERTY FIELD RESOLVER (Header-Driven)
 * ============================================================
 */
function resolvePropertyValueByHeader(header, p, context) {
  p = p || {};
  context = context || {};
  var norm = String(header || "").trim().toLowerCase();

  if (norm === "propertyid") {
    return context.propertyId || p.propertyId || p.PropertyID || p.id || "";
  }
  if (norm === "owneruserid" || norm === "userid") {
    return context.userId || p.userId || p.ownerUserId || p.ownerUserID || p.OwnerUserID || p.UserID || "";
  }
  if (norm === "businessid") {
    return p.businessId || p.businessID || p.BusinessID || "";
  }
  if (norm === "propertytype" || norm === "type" || norm === "category") {
    return p.propertyType || p.PropertyType || p.type || p.Type || p.category || p.Category || "";
  }
  if (norm === "purpose") {
    return p.purpose || p.Purpose || "";
  }
  if (norm === "title" || norm === "name") {
    return p.title || p.Title || p.name || p.Name || "";
  }
  if (norm === "description" || norm === "desc") {
    return p.description || p.Description || p.desc || "";
  }
  if (norm === "price") {
    return p.price !== undefined ? p.price : (p.Price !== undefined ? p.Price : "");
  }
  if (norm === "bedrooms" || norm === "bedroom" || norm === "bhk") {
    return p.bedrooms !== undefined ? p.bedrooms : (p.Bedrooms !== undefined ? p.Bedrooms : (p.bedroom || ""));
  }
  if (norm === "bathrooms" || norm === "bathroom" || norm === "bath") {
    return p.bathrooms !== undefined ? p.bathrooms : (p.Bathrooms !== undefined ? p.Bathrooms : (p.bathroom || ""));
  }
  if (norm === "area") {
    return p.area !== undefined ? p.area : (p.Area !== undefined ? p.Area : "");
  }
  if (norm === "images" || norm === "image" || norm === "imageurl") {
    return p.images || p.Images || p.image || p.Image || p.imageURL || p.imageUrl || "";
  }
  if (norm === "videourl" || norm === "video") {
    return p.videoUrl || p.videoURL || p.VideoURL || p.video || "";
  }
  if (norm === "address") {
    return p.address || p.Address || "";
  }
  if (norm === "city") {
    return p.city || p.City || "";
  }
  if (norm === "district") {
    return p.district || p.District || "";
  }
  if (norm === "state") {
    return p.state || p.State || "";
  }
  if (norm === "country") {
    return p.country || p.Country || (typeof CONFIG !== "undefined" && CONFIG.DEFAULT_COUNTRY) || "India";
  }
  if (norm === "pincode" || norm === "pin") {
    return p.pincode || p.Pincode || p.pin || "";
  }
  if (norm === "latitude" || norm === "lat") {
    return p.latitude !== undefined ? p.latitude : (p.Latitude !== undefined ? p.Latitude : (p.lat !== undefined ? p.lat : ""));
  }
  if (norm === "longitude" || norm === "lng" || norm === "long") {
    return p.longitude !== undefined ? p.longitude : (p.Longitude !== undefined ? p.Longitude : (p.lng !== undefined ? p.lng : ""));
  }
  if (norm === "status") {
    return context.status || p.status || p.Status || "Pending";
  }
  if (norm === "createddate") {
    return context.now || new Date();
  }
  if (norm === "updateddate") {
    return context.isUpdate ? (context.now || new Date()) : "";
  }
  if (norm === "featured") {
    return p.featured || p.Featured || "No";
  }
  if (norm === "viewcount" || norm === "views") {
    return 0;
  }
  if (norm === "inquirycount" || norm === "inquiries") {
    return 0;
  }
  if (norm === "promotioncampaignid" || norm === "campaignid") {
    return p.promotionCampaignId || p.promotionCampaignID || p.campaignId || p.campaignID || "";
  }

  // Fallback for direct header property
  if (p[header] !== undefined) return p[header];
  var keys = Object.keys(p);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === norm) {
      return p[keys[i]];
    }
  }

  return "";
}

/**
 * Checks if an update payload specifically provided a value for a property column header.
 */
function isPropertyFieldProvided(header, p) {
  if (!p) return false;
  var norm = String(header || "").trim().toLowerCase();
  var aliasMap = {
    "propertyid": ["propertyid", "id"],
    "owneruserid": ["owneruserid", "userid", "ownerid"],
    "userid": ["owneruserid", "userid", "ownerid"],
    "businessid": ["businessid"],
    "propertytype": ["propertytype", "type", "category"],
    "type": ["propertytype", "type", "category"],
    "category": ["propertytype", "type", "category"],
    "purpose": ["purpose"],
    "title": ["title", "name"],
    "description": ["description", "desc"],
    "price": ["price"],
    "bedrooms": ["bedrooms", "bedroom", "bhk"],
    "bathrooms": ["bathrooms", "bathroom", "bath"],
    "area": ["area"],
    "images": ["images", "image", "imageurl"],
    "image": ["images", "image", "imageurl"],
    "videourl": ["videourl", "video"],
    "address": ["address"],
    "city": ["city"],
    "district": ["district"],
    "state": ["state"],
    "country": ["country"],
    "pincode": ["pincode", "pin"],
    "latitude": ["latitude", "lat"],
    "longitude": ["longitude", "lng", "long"],
    "status": ["status"],
    "featured": ["featured"],
    "promotioncampaignid": ["promotioncampaignid", "campaignid"],
    "campaignid": ["promotioncampaignid", "campaignid"]
  };

  var aliases = aliasMap[norm] || [norm];
  for (var k in p) {
    if (aliases.indexOf(k.toLowerCase()) !== -1) {
      if (p[k] !== undefined && p[k] !== "") {
        return true;
      }
    }
  }
  return false;
}

/**
 * ============================================================
 * CREATE PROPERTY
 * ============================================================
 */
function createProperty(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) return error("userId required");

    var limitCheck = validatePostingLimit(userId, "Property");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    const sheet = getSheet("Properties");
    if (!sheet) return error("Properties sheet not found");

    const propertyId = "PR" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Published" && status !== "Sold" && status !== "Rented" && status !== "Expired" && status !== "Deleted") {
      status = "Pending";
    }

    var values = sheet.getDataRange().getValues();
    var headers = values.length > 0 ? values[0] : [];
    if (headers.length === 0) {
      return error("Properties sheet headers not found");
    }

    var now = new Date();
    var context = {
      propertyId: propertyId,
      userId: userId,
      status: status,
      now: now,
      isUpdate: false
    };

    var row = headers.map(function(header) {
      return resolvePropertyValueByHeader(header, p, context);
    });

    sheet.appendRow(row);

    // Track event
    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "PropertyCreated", userId: userId, entityType: "Property", entityId: propertyId }
        });
      }
    } catch (te) { Logger.log("PropertyCreated track error: " + te); }

    return success({ propertyId: propertyId, status: status }, "Property created successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE PROPERTY
 * ============================================================
 */
function updateProperty(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var p = e && e.parameter ? e.parameter : {};
    var propertyId = p.propertyId || p.PropertyID || p.id || "";

    if (!propertyId) return error("propertyId required");

    var sheet = getSheet("Properties");
    if (!sheet) return error("Properties sheet not found");

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return error("Properties sheet empty");

    var headers = data[0];

    var userIdIndex = headers.indexOf("OwnerUserID");
    if (userIdIndex < 0) userIdIndex = headers.indexOf("UserID");
    var updatedDateIndex = headers.indexOf("UpdatedDate");
    var propertyRow = null;
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(propertyId).trim()) {
        propertyRow = data[i];
        rowIndex = i;
        break;
      }
    }

    if (!propertyRow || rowIndex < 0) {
      return error("Property not found");
    }

    // Ownership validation
    var ownerUserId = userIdIndex >= 0 ? String(propertyRow[userIdIndex]) : "";
    var requestingUserId = (p.userId || p.UserID || auth.userId || "");
    if (requestingUserId && String(ownerUserId) !== String(requestingUserId)) {
      return error("Not authorized to update this property");
    }

    // Do not allow changing immutable fields
    var protectedFields = ["PropertyID", "OwnerUserID", "CreatedDate"];

    var context = {
      propertyId: propertyId,
      userId: ownerUserId,
      status: p.status || p.Status || (headers.indexOf("Status") >= 0 ? propertyRow[headers.indexOf("Status")] : "Pending"),
      now: new Date(),
      isUpdate: true
    };

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (protectedFields.indexOf(key) >= 0) continue;
      if (isPropertyFieldProvided(key, p)) {
        var val = resolvePropertyValueByHeader(key, p, context);
        sheet.getRange(rowIndex + 1, j + 1).setValue(val);
      }
    }

    // Update UpdatedDate if the column exists
    if (updatedDateIndex >= 0) {
      sheet.getRange(rowIndex + 1, updatedDateIndex + 1).setValue(new Date());
    }

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "PropertyUpdated", userId: requestingUserId, entityType: "Property", entityId: propertyId }
        });
      }
    } catch (te) { Logger.log("PropertyUpdated track error: " + te); }

    return success({ propertyId: propertyId }, "Property updated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE PROPERTY (Soft delete)
 * ============================================================
 */
function deleteProperty(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var propertyId = e && e.parameter ? e.parameter.propertyId || "" : "";
    if (!propertyId) return error("propertyId required");
    var property = getRowById("Properties", "PropertyID", propertyId);
    if (!property || String(property.OwnerUserID || property.UserID || "") !== auth.userId) return error("Forbidden");

    var updated = updateRow("Properties", "PropertyID", propertyId, {
      Status: "Deleted",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Property not found");

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "PropertyDeleted", userId: "", entityType: "Property", entityId: propertyId }
        });
      }
    } catch (te) { Logger.log("PropertyDeleted track error: " + te); }

    return success({ propertyId: propertyId }, "Property deleted successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * RESTORE PROPERTY
 * ============================================================
 */
function restoreProperty(e) {
  try {
    var propertyId = e && e.parameter ? e.parameter.propertyId || "" : "";
    if (!propertyId) return error("propertyId required");

    var updated = updateRow("Properties", "PropertyID", propertyId, {
      Status: "Pending",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Property not found");

    return success({ propertyId: propertyId }, "Property restored successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * CREATE BUSINESS
 * ============================================================
 */
function createBusiness(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) return error("userId required");

    var limitCheck = validatePostingLimit(userId, "Business");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    const sheet = getSheet("Businesses");
    const businessId = "B" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Published" && status !== "Closed" && status !== "Deleted") {
      status = "Pending";
    }

    sheet.appendRow([
      businessId,
      userId,
      p.title || "",
      p.category || "",
      p.description || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.pincode || "",
      p.latitude || "",
      p.longitude || "",
      p.phone || "",
      p.email || "",
      p.website || "",
      p.logo || "",
      p.coverImage || "",
      status,
      new Date()
    ]);

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "BusinessCreated", userId: userId, entityType: "Business", entityId: businessId }
        });
      }
    } catch (te) { Logger.log("BusinessCreated track error: " + te); }

    return success({ businessId: businessId, status: status }, "Business created successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE BUSINESS
 * ============================================================
 */
function updateBusiness(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var p = e && e.parameter ? e.parameter : {};
    var businessId = p.businessId || p.id || "";

    if (!businessId) return error("businessId required");

    var sheet = getSheet("Businesses");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var userIdIndex = headers.indexOf("OwnerUserID");
    if (userIdIndex < 0) userIdIndex = headers.indexOf("UserID");
    var businessRow = null;
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(businessId).trim()) {
        businessRow = data[i];
        rowIndex = i;
        break;
      }
    }

    if (!businessRow || rowIndex < 0) {
      return error("Business not found");
    }

    // Ownership validation
    var ownerUserId = userIdIndex >= 0 ? String(businessRow[userIdIndex]) : "";
    var requestingUserId = p.userId || "";
    if (requestingUserId && String(ownerUserId) !== String(requestingUserId)) {
      return error("Not authorized to update this business");
    }

    // Do not allow changing immutable fields
    var protectedFields = ["BusinessID", "OwnerUserID", "CreatedDate"];

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (protectedFields.indexOf(key) >= 0) continue;
      if (p[key] === undefined || p[key] === "") continue;
      sheet.getRange(rowIndex + 1, j + 1).setValue(p[key]);
    }

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "BusinessUpdated", userId: requestingUserId, entityType: "Business", entityId: businessId }
        });
      }
    } catch (te) { Logger.log("BusinessUpdated track error: " + te); }

    return success({ businessId: businessId }, "Business updated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE BUSINESS (Soft delete)
 * ============================================================
 */
function deleteBusiness(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var businessId = e && e.parameter ? e.parameter.businessId || e.parameter.id || "" : "";
    if (!businessId) return error("businessId required");
    var business = getRowById("Businesses", "BusinessID", businessId);
    if (!business || String(business.OwnerUserID || business.UserID || "") !== auth.userId) return error("Forbidden");

    var updated = updateRow("Businesses", "BusinessID", businessId, {
      Status: "Deleted",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Business not found");

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "BusinessDeleted", userId: "", entityType: "Business", entityId: businessId }
        });
      }
    } catch (te) { Logger.log("BusinessDeleted track error: " + te); }

    return success({ businessId: businessId }, "Business deleted successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * RESTORE BUSINESS
 * ============================================================
 */
function restoreBusiness(e) {
  try {
    var businessId = e && e.parameter ? e.parameter.businessId || "" : "";
    if (!businessId) return error("businessId required");

    var updated = updateRow("Businesses", "BusinessID", businessId, {
      Status: "Pending",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("Business not found");

    return success({ businessId: businessId }, "Business restored successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * CREATE NEWS
 * ============================================================
 */
function createNews(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) return error("userId required");

    var limitCheck = validatePostingLimit(userId, "News");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    const sheet = getSheet("News");
    const newsId = "N" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Published" && status !== "Archived" && status !== "Deleted") {
      status = "Pending";
    }

    sheet.appendRow([
      newsId,
      userId,
      p.title || "",
      p.description || "",
      p.category || "",
      p.image || "",
      p.videoUrl || "",
      p.source || "",
      p.author || "",
      p.address || "",
      p.city || "",
      p.district || "",
      p.state || "",
      p.country || "",
      p.latitude || "",
      p.longitude || "",
      0,
      p.featured || "No",
      status,
      new Date()
    ]);

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "NewsCreated", userId: userId, entityType: "News", entityId: newsId }
        });
      }
    } catch (te) { Logger.log("NewsCreated track error: " + te); }

    return success({ newsId: newsId, status: status }, "News created successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * UPDATE NEWS
 * ============================================================
 */
function updateNews(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var p = e && e.parameter ? e.parameter : {};
    var newsId = p.newsId || p.id || "";

    if (!newsId) return error("newsId required");

    var sheet = getSheet("News");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var userIdIndex = headers.indexOf("UserID");
    var newsRow = null;
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(newsId).trim()) {
        newsRow = data[i];
        rowIndex = i;
        break;
      }
    }

    if (!newsRow || rowIndex < 0) {
      return error("News not found");
    }

    // Ownership validation
    var ownerUserId = userIdIndex >= 0 ? String(newsRow[userIdIndex]) : "";
    var requestingUserId = p.userId || "";
    if (requestingUserId && String(ownerUserId) !== String(requestingUserId)) {
      return error("Not authorized to update this news");
    }

    // Do not allow changing immutable fields
    var protectedFields = ["NewsID", "UserID", "CreatedDate"];

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (protectedFields.indexOf(key) >= 0) continue;
      if (p[key] === undefined || p[key] === "") continue;
      sheet.getRange(rowIndex + 1, j + 1).setValue(p[key]);
    }

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "NewsUpdated", userId: requestingUserId, entityType: "News", entityId: newsId }
        });
      }
    } catch (te) { Logger.log("NewsUpdated track error: " + te); }

    return success({ newsId: newsId }, "News updated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * DELETE NEWS (Soft delete)
 * ============================================================
 */
function deleteNews(e) {
  try {
    var auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    var newsId = e && e.parameter ? e.parameter.newsId || e.parameter.id || "" : "";
    if (!newsId) return error("newsId required");
    var news = getRowById("News", "NewsID", newsId);
    if (!news || String(news.UserID || "") !== auth.userId) return error("Forbidden");

    var updated = updateRow("News", "NewsID", newsId, {
      Status: "Deleted",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("News not found");

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "NewsDeleted", userId: "", entityType: "News", entityId: newsId }
        });
      }
    } catch (te) { Logger.log("NewsDeleted track error: " + te); }

    return success({ newsId: newsId }, "News deleted successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * RESTORE NEWS
 * ============================================================
 */
function restoreNews(e) {
  try {
    var newsId = e && e.parameter ? e.parameter.newsId || "" : "";
    if (!newsId) return error("newsId required");

    var updated = updateRow("News", "NewsID", newsId, {
      Status: "Pending",
      "UpdatedDate": new Date()
    });

    if (!updated) return error("News not found");

    return success({ newsId: newsId }, "News restored successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * CREATE ANNOUNCEMENT (V2 - Delegated to Announcements.js)
 * 
 * NOTE: The V2 createAnnouncement is now in Announcements.js
 * and requires Active Announcer authorization.
 * 
 * This function is kept as a thin wrapper for backward compatibility
 * but delegates to the V2 implementation.
 * 
 * The old behavior (any user could post) is replaced by the
 * Announcer-authorized flow.
 * 
 * For non-announcer users, use addAnnouncement (legacy).
 * ============================================================
 */
// createAnnouncement is now defined in Announcements.js (V2)
// The old Posting.js version has been removed to avoid conflicts.
// All announcement creation goes through Announcements.js authorization.
