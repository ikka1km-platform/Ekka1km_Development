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

    sheet.appendRow([
      productId,
      userId,
      p.businessId || "",
      p.title || "",
      p.description || "",
      p.price || "",
      p.category || "",
      p.imageURL || "",
      p.lat || "",
      p.lng || "",
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
    var p = e && e.parameter ? e.parameter : {};
    var productId = p.productId || p.id || "";

    if (!productId) return error("productId required");

    var sheet = getSheet("Products");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(productId).trim()) {
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j];
          if (p[key] !== undefined && p[key] !== "") {
            sheet.getRange(i + 1, j + 1).setValue(p[key]);
          }
        }

        // Track event
        try {
          if (typeof trackEvent === "function") {
            trackEvent({
              parameter: { eventType: "ProductUpdated", userId: p.userId || "", entityType: "Product", entityId: productId }
            });
          }
        } catch (te) { Logger.log("ProductUpdated track error: " + te); }

        return success({ productId: productId }, "Product updated successfully");
      }
    }

    return error("Product not found");

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
    var productId = e && e.parameter ? e.parameter.productId || e.parameter.id || "" : "";
    if (!productId) return error("productId required");

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
    const propertyId = "PR" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Published" && status !== "Sold" && status !== "Rented" && status !== "Expired" && status !== "Deleted") {
      status = "Pending";
    }

    sheet.appendRow([
      propertyId,
      userId,
      p.title || "",
      p.description || "",
      p.category || "",
      p.price || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.pincode || "",
      p.latitude || "",
      p.longitude || "",
      p.image || "",
      status,
      new Date()
    ]);

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
    var p = e && e.parameter ? e.parameter : {};
    var propertyId = p.propertyId || "";

    if (!propertyId) return error("propertyId required");

    var sheet = getSheet("Properties");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(propertyId).trim()) {
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j];
          if (p[key] !== undefined && p[key] !== "") {
            sheet.getRange(i + 1, j + 1).setValue(p[key]);
          }
        }

        try {
          if (typeof trackEvent === "function") {
            trackEvent({
              parameter: { eventType: "PropertyUpdated", userId: p.userId || "", entityType: "Property", entityId: propertyId }
            });
          }
        } catch (te) { Logger.log("PropertyUpdated track error: " + te); }

        return success({ propertyId: propertyId }, "Property updated successfully");
      }
    }

    return error("Property not found");

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
    var propertyId = e && e.parameter ? e.parameter.propertyId || "" : "";
    if (!propertyId) return error("propertyId required");

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
    var p = e && e.parameter ? e.parameter : {};
    var businessId = p.businessId || p.id || "";

    if (!businessId) return error("businessId required");

    var sheet = getSheet("Businesses");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(businessId).trim()) {
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j];
          if (p[key] !== undefined && p[key] !== "") {
            sheet.getRange(i + 1, j + 1).setValue(p[key]);
          }
        }

        try {
          if (typeof trackEvent === "function") {
            trackEvent({
              parameter: { eventType: "BusinessUpdated", userId: p.userId || "", entityType: "Business", entityId: businessId }
            });
          }
        } catch (te) { Logger.log("BusinessUpdated track error: " + te); }

        return success({ businessId: businessId }, "Business updated successfully");
      }
    }

    return error("Business not found");

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
    var businessId = e && e.parameter ? e.parameter.businessId || e.parameter.id || "" : "";
    if (!businessId) return error("businessId required");

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
    var p = e && e.parameter ? e.parameter : {};
    var newsId = p.newsId || p.id || "";

    if (!newsId) return error("newsId required");

    var sheet = getSheet("News");
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(newsId).trim()) {
        for (var j = 0; j < headers.length; j++) {
          var key = headers[j];
          if (p[key] !== undefined && p[key] !== "") {
            sheet.getRange(i + 1, j + 1).setValue(p[key]);
          }
        }

        try {
          if (typeof trackEvent === "function") {
            trackEvent({
              parameter: { eventType: "NewsUpdated", userId: p.userId || "", entityType: "News", entityId: newsId }
            });
          }
        } catch (te) { Logger.log("NewsUpdated track error: " + te); }

        return success({ newsId: newsId }, "News updated successfully");
      }
    }

    return error("News not found");

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
    var newsId = e && e.parameter ? e.parameter.newsId || e.parameter.id || "" : "";
    if (!newsId) return error("newsId required");

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
 * CREATE ANNOUNCEMENT
 * ?action=createannouncement&userId=U001&title=Notice&description=Details&category=General
 * ============================================================
 */
function createAnnouncement(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var userId = p.userId || "";

    if (!userId) return error("userId required");

    var limitCheck = validatePostingLimit(userId, "Announcement");
    if (!limitCheck.allowed) {
      return error(limitCheck.reason);
    }

    const sheet = getSheet("Announcements");
    if (!sheet) return error("Announcements sheet not found");

    const announcementId = "A" + Utilities.getUuid().substring(0, 8);

    var status = p.status || "Pending";
    if (status !== "Draft" && status !== "Pending" && status !== "Active" && status !== "Expired" && status !== "Deleted") {
      status = "Pending";
    }

    sheet.appendRow([
      announcementId,
      userId,
      p.title || "",
      p.description || "",
      p.category || "General",
      p.image || "",
      p.address || "",
      p.city || "",
      p.district || "",
      p.state || "",
      p.country || "India",
      p.latitude || "",
      p.longitude || "",
      p.startDate || "",
      p.endDate || "",
      p.priority || "Normal",
      "Pending",
      new Date(),
      new Date()
    ]);

    // Submit to ModerationQueue
    try {
      if (typeof ensureModerationQueueSheet === "function" && typeof submitModeration === "function") {
        submitModeration({
          parameter: {
            contentType: "Announcement",
            contentId: announcementId,
            userId: userId,
            reason: "New announcement pending review"
          }
        });
      }
    } catch (mqErr) {
      Logger.log("ModerationQueue submission error: " + mqErr);
    }

    try {
      if (typeof trackEvent === "function") {
        trackEvent({
          parameter: { eventType: "AnnouncementCreated", userId: userId, entityType: "Announcement", entityId: announcementId }
        });
      }
    } catch (te) { Logger.log("AnnouncementCreated track error: " + te); }

    return success({ announcementId: announcementId, status: "Pending" }, "Announcement created successfully");

  } catch (err) {
    return exception(err);
  }
}
