/**
 * ============================================================
 * EKKA1KM BACKEND
 * Analytics.js
 * V6.1 - Seller Self-Interaction Protection
 * Tracks: ProductView, BusinessView, NewsView, VideoPlay,
 * GalleryOpen, ProductInterested, StoreFollow, Share,
 * NotificationOpen, LeadCreated, PromotionClick
 * ============================================================
 */


/**
 * ============================================================
 * TRACK EVENT
 * ?action=trackevent
 *  &eventType=NewsView
 *  &userId=U001
 *  &entityType=News
 *  &entityId=N001
 *  &eventData={"key":"value"}
 *  &lat=26.9124
 *  &lng=75.7873
 * ============================================================
 */

function trackEvent(e) {
  try {
    var p = e.parameter;

    var eventType = p.eventType || "";
    var userId = p.userId || "";
    var entityType = p.entityType || "";
    var entityId = p.entityId || "";
    var eventData = p.eventData || "";
    var lat = p.lat || "";
    var lng = p.lng || "";

    if (!eventType) {
      return error("eventType is required");
    }

    // ============================================================
    // SELLER SELF-INTERACTION PROTECTION
    // Block sellers from interacting with their own products/businesses
    // ============================================================
    if (userId) {
      var ownerUserId = "";
      var isSelfInteraction = false;

      // Determine the owner of the entity being interacted with
      if (entityType === "Product" && entityId) {
        var product = getRowById("Products", "ProductID", entityId);
        if (product) {
          ownerUserId = product.UserID || product.OwnerUserID || "";
        }
      } else if (entityType === "Business" && entityId) {
        var business = getRowById("Businesses", "BusinessID", entityId);
        if (business) {
          ownerUserId = business.UserID || business.OwnerUserID || "";
        }
      }

      // Check if the acting user is the owner
      if (ownerUserId && String(userId) === String(ownerUserId)) {
        isSelfInteraction = true;

        // For interactive events (Interest, Enquiry, Lead) - BLOCK with error
        if (
          eventType === "ProductInterested" ||
          eventType === "BusinessEnquiry" ||
          eventType === "LeadCreated"
        ) {
          return error("You cannot interact with your own product.");
        }

        // For view/tracking events (ProductView, BusinessView) - SILENTLY SKIP
        // This prevents the seller's own views from affecting analytics
        if (
          eventType === "ProductView" ||
          eventType === "BusinessView"
        ) {
          return success({ skipped: true }, "Self-view skipped");
        }

        // For PromotionClick - SILENTLY SKIP to prevent self-promotion manipulation
        if (eventType === "PromotionClick") {
          return success({ skipped: true }, "Self-promotion click skipped");
        }
      }
    }

    // Parse eventData as string
    if (eventData && typeof eventData === "object") {
      eventData = JSON.stringify(eventData);
    }

    var sheet = getSheet("AnalyticsEvents");

    if (!sheet) {
      // Auto-create sheet
      var ss = getSpreadsheet();
      sheet = ss.insertSheet("AnalyticsEvents");
      sheet.appendRow([
        "EventID",
        "UserID",
        "EventType",
        "EntityType",
        "EntityID",
        "EventData",
        "Latitude",
        "Longitude",
        "CreatedDate"
      ]);
    }

    var eventId = "EV" + Utilities.getUuid().substring(0, 8);

    sheet.appendRow([
      eventId,
      userId,
      eventType,
      entityType,
      entityId,
      eventData || "",
      lat,
      lng,
      new Date()
    ]);

    // For NewsView, increment news view count
    if (eventType === "NewsView" && entityId) {
      incrementNewsView(entityId);
    }

    // For AnnouncementView, increment announcement view count
    if (eventType === "AnnouncementView" && entityId) {
      incrementAnnouncementView(entityId);
    }

    // For Share, increment share count
    if (eventType === "Share" && entityId && entityType === "News") {
      incrementNewsShare(entityId);
    }

    return success({
      eventId: eventId
    }, "Event tracked");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * INCREMENT NEWS VIEW
 * ============================================================
 */

function incrementNewsView(newsId) {
  try {
    var sheet = getSheet("News");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var viewsCol = headers.indexOf("Views");
    if (viewsCol < 0) return;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(newsId).trim()) {
        var currentViews = parseInt(data[i][viewsCol]) || 0;
        sheet.getRange(i + 1, viewsCol + 1).setValue(currentViews + 1);
        return;
      }
    }
  } catch (err) {
    Logger.log("incrementNewsView error: " + err.toString());
  }
}


/**
 * ============================================================
 * INCREMENT ANNOUNCEMENT VIEW
 * ============================================================
 */

function incrementAnnouncementView(announcementId) {
  try {
    var sheet = getSheet("Announcements");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var viewsCol = headers.indexOf("Views");
    if (viewsCol < 0) return;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(announcementId).trim()) {
        var currentViews = parseInt(data[i][viewsCol]) || 0;
        sheet.getRange(i + 1, viewsCol + 1).setValue(currentViews + 1);
        return;
      }
    }
  } catch (err) {
    Logger.log("incrementAnnouncementView error: " + err.toString());
  }
}


/**
 * ============================================================
 * INCREMENT NEWS SHARE
 * ============================================================
 */

function incrementNewsShare(newsId) {
  try {
    var sheet = getSheet("News");
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    // We'll store shares in a separate field if available, or just add to event
    Logger.log("News shared: " + newsId);
  } catch (err) {
    Logger.log("incrementNewsShare error: " + err.toString());
  }
}


/**
 * ============================================================
 * GET EVENTS
 * ?action=getevents&eventType=NewsView&userId=U001
 * ============================================================
 */

function getEvents(e) {
  try {
    var p = e.parameter;
    var eventType = p.eventType || "";
    var userId = p.userId || "";
    var entityType = p.entityType || "";
    var entityId = p.entityId || "";

    var sheet = getSheet("AnalyticsEvents");
    if (!sheet) {
      return success({
        count: 0,
        data: []
      }, "No events found");
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return success({
        count: 0,
        data: []
      }, "No events found");
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      var match = true;

      if (eventType && String(values[i][2]) !== eventType) match = false;
      if (userId && String(values[i][1]) !== userId) match = false;
      if (entityType && String(values[i][3]) !== entityType) match = false;
      if (entityId && String(values[i][4]) !== entityId) match = false;

      if (match) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        data.push(row);
      }
    }

    return success({
      count: data.length,
      data: data
    }, "Events loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET ENGAGEMENT ANALYTICS
 * ?action=engagementanalytics&entityType=News&entityId=N001
 * ============================================================
 */

function getEngagementAnalytics(e) {
  try {
    var p = e.parameter;
    var entityType = p.entityType || "";
    var entityId = p.entityId || "";

    var sheet = getSheet("AnalyticsEvents");
    if (!sheet) {
      return success({}, "No data");
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return success({}, "No data");
    }

    var views = 0;
    var shares = 0;
    var videoPlays = 0;
    var galleryOpens = 0;

    for (var i = 1; i < values.length; i++) {
      if (entityType && String(values[i][3]) !== entityType) continue;
      if (entityId && String(values[i][4]) !== entityId) continue;

      var eventType = String(values[i][2] || "");
      if (eventType === "NewsView" || eventType === "ProductView" || eventType === "BusinessView") views++;
      else if (eventType === "Share") shares++;
      else if (eventType === "VideoPlay") videoPlays++;
      else if (eventType === "GalleryOpen") galleryOpens++;
    }

    return success({
      views: views,
      shares: shares,
      videoPlays: videoPlays,
      galleryOpens: galleryOpens,
      entityType: entityType,
      entityId: entityId
    }, "Engagement analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET GROWTH ANALYTICS
 * ?action=growthanalytics&days=7
 * ============================================================
 */

function getGrowthAnalytics(e) {
  try {
    var days = parseInt(e.parameter.days) || 7;
    var now = new Date();
    var cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    var sheet = getSheet("AnalyticsEvents");
    if (!sheet) {
      return success({}, "No data");
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return success({}, "No data");
    }

    var dailyEvents = {};
    var eventTypeCount = {};

    for (var i = 1; i < values.length; i++) {
      var createdDate = values[i][8];
      if (!createdDate) continue;

      var d = new Date(createdDate);
      if (d < cutoff) continue;

      var dateKey = d.toISOString().split("T")[0];
      dailyEvents[dateKey] = (dailyEvents[dateKey] || 0) + 1;

      var eType = String(values[i][2] || "Unknown");
      eventTypeCount[eType] = (eventTypeCount[eType] || 0) + 1;
    }

    return success({
      days: days,
      totalEvents: Object.values(dailyEvents).reduce(function(a, b) { return a + b; }, 0),
      dailyEvents: dailyEvents,
      eventTypeBreakdown: eventTypeCount
    }, "Growth analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET CONVERSION ANALYTICS
 * ?action=conversionanalytics
 * ============================================================
 */

function getConversionAnalytics(e) {
  try {
    var sheet = getSheet("AnalyticsEvents");
    if (!sheet) {
      return success({}, "No data");
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return success({}, "No data");
    }

    var productInterested = 0;
    var leadsCreated = 0;
    var storeFollows = 0;
    var promotionClicks = 0;

    for (var i = 1; i < values.length; i++) {
      var eventType = String(values[i][2] || "");
      if (eventType === "ProductInterested") productInterested++;
      else if (eventType === "LeadCreated") leadsCreated++;
      else if (eventType === "StoreFollow") storeFollows++;
      else if (eventType === "PromotionClick") promotionClicks++;
    }

    return success({
      productInterested: productInterested,
      leadsCreated: leadsCreated,
      storeFollows: storeFollows,
      promotionClicks: promotionClicks
    }, "Conversion analytics loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET RETENTION ANALYTICS
 * ?action=retentionanalytics
 * ============================================================
 */

function getRetentionAnalytics(e) {
  try {
    var sheet = getSheet("AnalyticsEvents");
    if (!sheet) {
      return success({}, "No data");
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return success({}, "No data");
    }

    var uniqueUsers = {};

    for (var i = 1; i < values.length; i++) {
      var userId = String(values[i][1] || "");
      if (userId) {
        uniqueUsers[userId] = true;
      }
    }

    return success({
      totalUniqueUsers: Object.keys(uniqueUsers).length
    }, "Retention analytics loaded");

  } catch (err) {
    return exception(err);
  }
}