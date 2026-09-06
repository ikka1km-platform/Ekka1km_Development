/**
 * ============================================================
 * EKKA1KM BACKEND
 * Live.js
 * V5.5.4 FINAL
 * ============================================================
 */


/**
 * ============================================================
 * GET ALL LIVE CHANNELS
 * ============================================================
 */
function getLive(e) {
  try {

    const data = getSheetData("Live");

    const result = data.filter(function (r) {
      return (
        String(r.IsLive).toLowerCase() === "yes" &&
        String(r.Status || "Active")
          .toLowerCase() !== "deleted"
      );
    });

    return success({
      count: result.length,
      data: result
    });

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET SINGLE LIVE CHANNEL
 * ============================================================
 */
function getLiveChannel(e) {
  try {

    const liveId =
      e.parameter.liveId || "";

    if (!liveId) {
      return error("liveId required");
    }

    const row =
      getRowById(
        "Live",
        "LiveID",
        liveId
      );

    if (!row) {
      return error(
        "Live channel not found"
      );
    }

    return success(row);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * FEATURED LIVE
 * ============================================================
 */
function getLiveNow(e) {
  try {

    const data =
      getSheetData("Live");

    for (let i = 0; i < data.length; i++) {

      const row = data[i];

      if (
        String(row.IsFeatured)
          .toLowerCase() === "yes" &&
        String(row.IsLive)
          .toLowerCase() === "yes"
      ) {
        return success(row);
      }
    }

    return error(
      "No featured live found"
    );

  } catch (err) {
    return exception(err);
  }
}


function getFeaturedLive(e) {
  return getLiveNow(e);
}


/**
 * ============================================================
 * PIP LIVE
 * ============================================================
 */
function getPipLive(e) {
  try {

    const data =
      getSheetData("Live");

    for (let i = 0; i < data.length; i++) {

      const row = data[i];

      if (
        String(row.AllowPIP)
          .toLowerCase() === "yes" &&
        String(row.IsLive)
          .toLowerCase() === "yes"
      ) {
        return success(row);
      }
    }

    return error(
      "No PIP live available"
    );

  } catch (err) {
    return exception(err);
  }
}


function getLiveBanner(e) {
  return getLiveNow(e);
}


/**
 * ============================================================
 * LIVE CATEGORIES
 * ============================================================
 */
function getLiveCategories(e) {
  try {

    const data =
      getSheetData("Live");

    const categories = {};

    data.forEach(function (r) {
      if (r.Category) {
        categories[r.Category] = true;
      }
    });

    return success(
      Object.keys(categories)
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LIVE BY CATEGORY
 * ============================================================
 */
function getLiveStreamsByCategory(e) {
  try {

    const category =
      e.parameter.category || "";

    const data =
      getSheetData("Live");

    const result =
      data.filter(function (r) {
        return (
          String(r.Category)
            .toLowerCase() ===
          category.toLowerCase()
        );
      });

    return success({
      count: result.length,
      data: result
    });

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LIVE BY CITY
 * ============================================================
 */
function getLiveStreamsByCity(e) {
  try {

    const city =
      e.parameter.city || "";

    const data =
      getSheetData("Live");

    const result =
      data.filter(function (r) {
        return (
          String(r.City)
            .toLowerCase() ===
          city.toLowerCase()
        );
      });

    return success({
      count: result.length,
      data: result
    });

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SUBSCRIBE LIVE
 * ============================================================
 */
function subscribeLive(e) {
  try {

    const userId =
      e.parameter.userId || "";

    const liveId =
      e.parameter.liveId || "";

    if (!userId || !liveId) {
      return error(
        "userId and liveId required"
      );
    }

    const subs =
      getSheetData(
        "LiveSubscribers"
      );

    for (let i = 0; i < subs.length; i++) {

      if (
        String(subs[i].UserID)
          === String(userId) &&
        String(subs[i].LiveID)
          === String(liveId)
      ) {
        return success(
          {},
          "Already subscribed"
        );
      }
    }

    getSheet(
      "LiveSubscribers"
    ).appendRow([
      "SUB" +
      Utilities.getUuid()
        .substring(0, 8),
      userId,
      liveId,
      new Date()
    ]);

    return success(
      {},
      "Subscribed successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UNSUBSCRIBE
 * ============================================================
 */
function unsubscribeLive(e) {
  try {

    const userId =
      e.parameter.userId || "";

    const liveId =
      e.parameter.liveId || "";

    const sheet =
      getSheet(
        "LiveSubscribers"
      );

    const data =
      sheet.getDataRange()
        .getValues();

    for (
      let i = data.length - 1;
      i >= 1;
      i--
    ) {

      if (
        String(data[i][1])
          === String(userId) &&
        String(data[i][2])
          === String(liveId)
      ) {
        sheet.deleteRow(
          i + 1
        );
      }
    }

    return success(
      {},
      "Unsubscribed"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET SUBSCRIBERS
 * ============================================================
 */
function getLiveSubscribers(e) {
  try {

    const liveId =
      e.parameter.liveId || "";

    const data =
      getSheetData(
        "LiveSubscribers"
      );

    const result =
      data.filter(function (r) {
        return (
          String(r.LiveID)
            === String(liveId)
        );
      });

    return success({
      count:
        result.length,
      data:
        result
    });

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * START WATCHING
 * ============================================================
 */
function startWatchingLive(e) {
  try {

    const userId =
      e.parameter.userId || "";

    const liveId =
      e.parameter.liveId || "";

    getSheet(
      "LiveWatchHistory"
    ).appendRow([
      "W" +
      Utilities.getUuid()
        .substring(0, 8),
      userId,
      liveId,
      new Date(),
      "",
      "",
      new Date()
    ]);

    return success(
      {},
      "Watch started"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * STOP WATCHING
 * ============================================================
 */
function stopWatchingLive(e) {
  try {

    return success(
      {},
      "Watch ended"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * WATCH HISTORY
 * ============================================================
 */
function getLiveWatchHistory(e) {
  try {

    return success(
      getSheetData(
        "LiveWatchHistory"
      )
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LIVE ANALYTICS
 * ============================================================
 */
function getLiveAnalytics(e) {
  try {

    const watch =
      getSheetData(
        "LiveWatchHistory"
      );

    const users = {};

    watch.forEach(function (r) {
      users[r.UserID] = true;
    });

    return success({
      totalViews:
        watch.length,
      uniqueUsers:
        Object.keys(users)
          .length
    });

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET ADMIN LIVE STREAMS (Phase 5.8 - Live Monitoring)
 * ?action=adminlivestreams&session=TOKEN
 * ============================================================
 */
function getAdminLiveStreams(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const streams = getSheetData(CONFIG.SHEETS.LIVE) || [];
    const viewersData = getSheetData(CONFIG.SHEETS.LIVE_VIEWERS) || [];
    const likesData = getSheetData(CONFIG.SHEETS.LIVE_LIKES) || [];
    const sharesData = getSheetData(CONFIG.SHEETS.LIVE_SHARES) || [];
    const chatData = getSheetData(CONFIG.SHEETS.LIVE_CHAT) || [];
    const modData = getSheetData(CONFIG.SHEETS.LIVE_MODERATORS) || [];
    const subData = getSheetData(CONFIG.SHEETS.LIVE_SUBSCRIBERS) || [];

    // Build metric lookup maps
    const activeViewersMap = {};
    viewersData.forEach(function(v) {
      if (v.LiveID && v.Active === true) {
        activeViewersMap[v.LiveID] = (activeViewersMap[v.LiveID] || 0) + 1;
      }
    });

    const likesMap = {};
    likesData.forEach(function(l) {
      if (l.LiveID && String(l.Type || "LIKE").toUpperCase() === "LIKE") {
        likesMap[l.LiveID] = (likesMap[l.LiveID] || 0) + 1;
      }
    });

    const sharesMap = {};
    sharesData.forEach(function(s) {
      if (s.LiveID) {
        sharesMap[s.LiveID] = (sharesMap[s.LiveID] || 0) + 1;
      }
    });

    const chatMap = {};
    chatData.forEach(function(c) {
      if (c.LiveID) {
        chatMap[c.LiveID] = (chatMap[c.LiveID] || 0) + 1;
      }
    });

    const modMap = {};
    modData.forEach(function(m) {
      if (m.LiveID) {
        modMap[m.LiveID] = (modMap[m.LiveID] || 0) + 1;
      }
    });

    const subMap = {};
    subData.forEach(function(sb) {
      if (sb.LiveID) {
        subMap[sb.LiveID] = (subMap[sb.LiveID] || 0) + 1;
      }
    });

    let totalActiveStreams = 0;
    let totalConcurrentViewers = 0;
    let totalLikes = 0;
    let totalShares = 0;
    let totalChatMessages = chatData.length;
    let totalModerators = modData.length;

    const enrichedStreams = streams.map(function(s) {
      const liveId = String(s.LiveID || "");
      const isLive = String(s.IsLive || "").toLowerCase() === "yes";
      const status = String(s.Status || "Active");
      const viewers = activeViewersMap[liveId] || Number(s.ViewerCount || 0);
      const likes = likesMap[liveId] || 0;
      const shares = sharesMap[liveId] || 0;
      const chatCount = chatMap[liveId] || 0;
      const modCount = modMap[liveId] || 0;
      const subCount = subMap[liveId] || 0;

      if (isLive && status.toLowerCase() !== "deleted") {
        totalActiveStreams++;
        totalConcurrentViewers += viewers;
      }
      totalLikes += likes;
      totalShares += shares;

      return {
        LiveID: liveId,
        Title: s.Title || "Live Stream",
        Description: s.Description || "",
        Streamer: s.Streamer || s.Announcer || s.UserID || "Streamer",
        UserID: s.UserID || "",
        Category: s.Category || "General",
        City: s.City || "",
        State: s.State || "",
        StreamURL: s.StreamURL || s.VideoURL || s.HLSUrl || "",
        ImageURL: s.ImageURL || s.Thumbnail || "",
        IsLive: isLive ? "Yes" : "No",
        IsFeatured: String(s.IsFeatured || "").toLowerCase() === "yes" ? "Yes" : "No",
        AllowPIP: String(s.AllowPIP || "").toLowerCase() === "yes" ? "Yes" : "No",
        Status: status,
        ViewerCount: viewers,
        LikeCount: likes,
        ShareCount: shares,
        ChatCount: chatCount,
        ModeratorCount: modCount,
        SubscriberCount: subCount,
        CreatedDate: s.CreatedDate || s.StartDate || ""
      };
    });

    // Sort: Live streams first, then newest
    enrichedStreams.sort(function(a, b) {
      if (a.IsLive === "Yes" && b.IsLive !== "Yes") return -1;
      if (a.IsLive !== "Yes" && b.IsLive === "Yes") return 1;
      return new Date(b.CreatedDate || 0) - new Date(a.CreatedDate || 0);
    });

    return success({
      summary: {
        totalStreams: streams.length,
        activeLiveStreams: totalActiveStreams,
        totalConcurrentViewers: totalConcurrentViewers,
        totalLikes: totalLikes,
        totalShares: totalShares,
        totalChatMessages: totalChatMessages,
        totalModerators: totalModerators
      },
      data: enrichedStreams
    }, "Admin live streams loaded successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN UPDATE LIVE STATUS (Phase 5.8)
 * ?action=adminupdatelivestatus&liveId=L001&isLive=No&status=Suspended
 * ============================================================
 */
function adminUpdateLiveStatus(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const p = e.parameter || {};
    const liveId = p.liveId || "";

    if (!liveId) {
      return error("liveId is required");
    }

    const updates = {};
    if (p.status !== undefined) updates.Status = p.status;
    if (p.isLive !== undefined) updates.IsLive = p.isLive;
    if (p.isFeatured !== undefined) updates.IsFeatured = p.isFeatured;
    if (p.allowPip !== undefined) updates.AllowPIP = p.allowPip;
    updates.UpdatedDate = new Date();

    const updated = updateRow(CONFIG.SHEETS.LIVE, "LiveID", liveId, updates);
    if (!updated) {
      return error("Live channel not found");
    }

    return success({
      liveId: liveId,
      updates: updates
    }, "Live stream status updated successfully");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADD LIVE (Admin / Creator)
 * ============================================================
 */
function addLive(e) {
  try {
    const p = e.parameter || {};
    const sheet = getSheet(CONFIG.SHEETS.LIVE);
    if (!sheet) return error("Live sheet not found");

    const liveId = "LIVE" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const title = p.title || "New Live Stream";
    const category = p.category || "General";
    const streamer = p.streamer || p.announcer || p.userId || "Host";
    const city = p.city || "";
    const isLive = p.isLive || "Yes";

    sheet.appendRow([
      liveId,
      title,
      p.description || "",
      category,
      city,
      p.streamUrl || "",
      p.imageUrl || "",
      isLive,
      p.isFeatured || "No",
      p.allowPip || "Yes",
      streamer,
      "Active",
      new Date(),
      p.userId || ""
    ]);

    return success({ liveId: liveId }, "Live stream created successfully");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UPDATE LIVE
 * ============================================================
 */
function updateLive(e) {
  return adminUpdateLiveStatus(e);
}


/**
 * ============================================================
 * DELETE LIVE (SOFT)
 * ============================================================
 */
function deleteLive(e) {
  try {
    const liveId = e.parameter.liveId || "";
    if (!liveId) return error("liveId required");

    updateRow(
      CONFIG.SHEETS.LIVE,
      "LiveID",
      liveId,
      {
        Status: "Deleted",
        IsLive: "No",
        UpdatedDate: new Date()
      }
    );

    return success({ liveId: liveId }, "Live stream deleted");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SET FEATURED LIVE
 * ============================================================
 */
function setFeaturedLive(e) {
  try {
    const liveId = e.parameter.liveId || "";
    const isFeatured = e.parameter.isFeatured || "Yes";
    if (!liveId) return error("liveId required");

    updateRow(
      CONFIG.SHEETS.LIVE,
      "LiveID",
      liveId,
      {
        IsFeatured: isFeatured,
        UpdatedDate: new Date()
      }
    );

    return success({ liveId: liveId, isFeatured: isFeatured }, "Featured status updated");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LIVE STREAMING SYSTEM — PHASE 4 / STAGE 1
 * Approved Data Model & Sheet Schema Definitions
 * ============================================================
 */

function LIVE_CHANNELS_HEADERS() {
  return [
    "YouTubeChannelID",
    "ChannelTitle",
    "ChannelCustomUrl",
    "ChannelThumbnail",
    "OAuthStatus",
    "Status",
    "ConnectedByAdminID",
    "ConnectedAt",
    "UpdatedAt"
  ];
}

function LIVE_ALLOCATIONS_HEADERS() {
  return [
    "AllocationID",
    "UserID",
    "CameraPersonName",
    "YouTubeChannelID",
    "Status",
    "AllocatedByAdminID",
    "AllocatedAt",
    "RevokedAt",
    "Notes"
  ];
}

function LIVE_SESSIONS_HEADERS() {
  return [
    "LiveSessionID",
    "CameraPersonID",
    "CameraPersonName",
    "YouTubeChannelID",
    "YouTubeBroadcastID",
    "YouTubeStreamID",
    "Latitude",
    "Longitude",
    "LocationEventID",
    "LocationEventName",
    "IsLocationOffset",
    "OffsetDistanceKm",
    "Title",
    "Description",
    "Status",
    "StartedAt",
    "EndedAt",
    "DurationSeconds",
    "CurrentViewers",
    "EkkaSampledPeak",
    "EkkaSampledAverage",
    "EkkaSampleSum",
    "EkkaSampleCount",
    "TotalViews",
    "WatchUrl",
    "EmbedUrl",
    "TerminationReason",
    "CreatedAt",
    "UpdatedAt"
  ];
}

function LIVE_LOCATIONS_HEADERS() {
  return [
    "LocationEventID",
    "DisplayName",
    "Latitude",
    "Longitude",
    "City",
    "State",
    "Category",
    "TotalSessionsCount",
    "TotalLiveSeconds",
    "LastLiveAt",
    "Status",
    "CreatedAt"
  ];
}

/**
 * Helper: Resolve or create sheet using existing utility or fallback
 */
function _getOrCreateLiveSheet(sheetName) {
  if (typeof getOrCreateSheet === "function") {
    return getOrCreateSheet(sheetName);
  }
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Helper: Ensure sheet headers safely starting at column 1 if empty
 */
function _ensureLiveSheetHeaders(sheet, requiredHeaders) {
  const added = [];
  const existingData = sheet.getDataRange().getValues();

  // If sheet has no data, or only a single empty cell at A1
  const isEmpty =
    existingData.length === 0 ||
    (existingData.length === 1 && (existingData[0].length === 0 || (existingData[0].length === 1 && String(existingData[0][0]).trim() === "")));

  if (isEmpty) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  const currentHeaders = existingData[0];
  for (let i = 0; i < requiredHeaders.length; i++) {
    const header = requiredHeaders[i];
    const index = currentHeaders.indexOf(header);
    if (index === -1) {
      sheet.getRange(1, currentHeaders.length + 1).setValue(header);
      added.push(header);
      currentHeaders.push(header);
    }
  }
  return added;
}

/**
 * Ensure individual sheets exist with authoritative headers
 */
function ensureLiveChannelsSheet() {
  const sheet = _getOrCreateLiveSheet(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels");
  _ensureLiveSheetHeaders(sheet, LIVE_CHANNELS_HEADERS());
  return sheet;
}

function ensureLiveAllocationsSheet() {
  const sheet = _getOrCreateLiveSheet(CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations");
  _ensureLiveSheetHeaders(sheet, LIVE_ALLOCATIONS_HEADERS());
  return sheet;
}

function ensureLiveSessionsSheet() {
  const sheet = _getOrCreateLiveSheet(CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions");
  _ensureLiveSheetHeaders(sheet, LIVE_SESSIONS_HEADERS());
  return sheet;
}

function ensureLiveLocationsSheet() {
  const sheet = _getOrCreateLiveSheet(CONFIG.SHEETS.LIVE_LOCATIONS || "LiveLocations");
  _ensureLiveSheetHeaders(sheet, LIVE_LOCATIONS_HEADERS());
  return sheet;
}

/**
 * ============================================================
 * INITIALIZE LIVE DATABASE
 * ?action=initializelivedatabase&session=TOKEN
 * Initializes the 4 approved Live sheets with authoritative headers.
 * Idempotent: Can be run multiple times safely without duplicate sheets or columns.
 * ============================================================
 */
function initializeLiveDatabase(e) {
  try {
    const isManualRun = !e || !e.parameter;
    if (!isManualRun) {
      const sessionResult = requireAdminSession(e);
      if (!sessionResult.valid) {
        return sessionResult.response;
      }
    }

    const result = {
      sheetsCreated: [],
      sheetsUpdated: [],
      columnsAdded: []
    };

    const definitions = [
      { name: CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", headers: LIVE_CHANNELS_HEADERS() },
      { name: CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations", headers: LIVE_ALLOCATIONS_HEADERS() },
      { name: CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions", headers: LIVE_SESSIONS_HEADERS() },
      { name: CONFIG.SHEETS.LIVE_LOCATIONS || "LiveLocations", headers: LIVE_LOCATIONS_HEADERS() }
    ];

    definitions.forEach(function (def) {
      const sheet = _getOrCreateLiveSheet(def.name);
      result.sheetsCreated.push(def.name);

      const added = _ensureLiveSheetHeaders(sheet, def.headers);
      result.sheetsUpdated.push(def.name);
      if (added && added.length > 0) {
        result.columnsAdded.push({
          sheet: def.name,
          addedColumns: added
        });
      }
    });

    return success(result, "Live database initialized successfully");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * GET LIVE DATABASE STATUS
 * ?action=livedatabasestatus&session=TOKEN
 * Diagnostic check to verify sheets, headers, and row counts.
 * ============================================================
 */
function getLiveDatabaseStatus(e) {
  try {
    const isManualRun = !e || !e.parameter;
    if (!isManualRun) {
      const sessionResult = requireAdminSession(e);
      if (!sessionResult.valid) {
        return sessionResult.response;
      }
    }

    const ss = getSpreadsheet();
    const sheets = [
      { key: "LIVE_CHANNELS", name: CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", expectedHeaders: LIVE_CHANNELS_HEADERS() },
      { key: "LIVE_ALLOCATIONS", name: CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations", expectedHeaders: LIVE_ALLOCATIONS_HEADERS() },
      { key: "LIVE_SESSIONS", name: CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions", expectedHeaders: LIVE_SESSIONS_HEADERS() },
      { key: "LIVE_LOCATIONS", name: CONFIG.SHEETS.LIVE_LOCATIONS || "LiveLocations", expectedHeaders: LIVE_LOCATIONS_HEADERS() }
    ];

    const status = sheets.map(function (item) {
      const sheet = ss.getSheetByName(item.name);
      if (!sheet) {
        return {
          sheetKey: item.key,
          sheetName: item.name,
          exists: false,
          rowCount: 0,
          columnCount: 0,
          headersValid: false,
          missingHeaders: item.expectedHeaders,
          currentHeaders: []
        };
      }

      const values = sheet.getDataRange().getValues();
      const currentHeaders = values.length > 0 ? values[0].map(String) : [];
      const missingHeaders = item.expectedHeaders.filter(function (h) {
        return currentHeaders.indexOf(h) === -1;
      });

      return {
        sheetKey: item.key,
        sheetName: item.name,
        exists: true,
        rowCount: Math.max(0, values.length - 1),
        columnCount: currentHeaders.length,
        headersValid: missingHeaders.length === 0,
        missingHeaders: missingHeaders,
        currentHeaders: currentHeaders
      };
    });

    const allValid = status.every(function (s) {
      return s.exists && s.headersValid;
    });

    return success({
      allValid: allValid,
      sheets: status
    }, allValid ? "All Live sheets verified" : "Some Live sheets missing or incomplete");
  } catch (err) {
    return exception(err);
  }
}


