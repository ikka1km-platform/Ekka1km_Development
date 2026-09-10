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
    "UpdatedAt",
    "LastValidatedAt",
    "TokenExpiresAt",
    "ScopeGranted",
    "RevokedAt",
    "DisconnectReason"
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
    "YouTubeVideoID",
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
 * LiveChannels and LiveAllocations data access helpers
 */
function findLiveChannelById(channelId) {
  if (!channelId) return null;
  return getRowById(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId);
}

function getAllLiveChannels() {
  return getSheetData(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels");
}

function upsertLiveChannel(channelData) {
  const sheet = ensureLiveChannelsSheet();
  const headers = LIVE_CHANNELS_HEADERS();
  const data = sheet.getDataRange().getValues();
  const idCol = headers.indexOf("YouTubeChannelID");
  
  const channelId = String(channelData.YouTubeChannelID || "").trim();
  if (!channelId) throw new Error("YouTubeChannelID is required for channel upsert");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === channelId) {
      // Update existing row
      for (const key in channelData) {
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(i + 1, col + 1).setValue(channelData[key]);
        }
      }
      return { created: false, channelId: channelId };
    }
  }

  // Row not found, append new
  const newRow = [];
  headers.forEach(function(h) {
    newRow.push(channelData[h] !== undefined ? channelData[h] : "");
  });
  sheet.appendRow(newRow);
  return { created: true, channelId: channelId };
}

function findLiveAllocationById(allocationId) {
  if (!allocationId) return null;
  return getRowById(CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations", "AllocationID", allocationId);
}

function getAllLiveAllocations() {
  return getSheetData(CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations");
}

function getActiveAllocationsForUser(userId) {
  if (!userId) return [];
  const all = getAllLiveAllocations();
  const cleanId = String(userId).trim();
  return all.filter(function(r) {
    return String(r.UserID || "").trim() === cleanId && String(r.Status || "").toLowerCase() === "active";
  });
}

function createLiveAllocation(allocationData) {
  const sheet = ensureLiveAllocationsSheet();
  const headers = LIVE_ALLOCATIONS_HEADERS();
  const newRow = [];
  headers.forEach(function(h) {
    newRow.push(allocationData[h] !== undefined ? allocationData[h] : "");
  });
  sheet.appendRow(newRow);
  return allocationData;
}

function updateLiveAllocation(allocationId, updates) {
  return updateRow(CONFIG.SHEETS.LIVE_ALLOCATIONS || "LiveAllocations", "AllocationID", allocationId, updates);
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

/**
 * ============================================================
 * STAGE 4: YOUTUBE LIVE API V3 ENGINE & SESSION LIFECYCLE
 * ============================================================
 */

/**
 * Helper: Find LiveSession by ID
 */
function findLiveSessionById(sessionId) {
  if (!sessionId) return null;
  return getRowById(CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions", "LiveSessionID", sessionId);
}

/**
 * Helper: Get all LiveSession rows
 */
function getAllLiveSessions() {
  return getSheetData(CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions");
}

/**
 * Helper: Create new LiveSession row
 */
function createLiveSessionRow(sessionData) {
  const sheet = ensureLiveSessionsSheet();
  const headers = LIVE_SESSIONS_HEADERS();
  const newRow = [];
  headers.forEach(function(h) {
    newRow.push(sessionData[h] !== undefined ? sessionData[h] : "");
  });
  sheet.appendRow(newRow);
  return sessionData;
}

/**
 * Helper: Update LiveSession row
 */
function updateLiveSession(sessionId, updates) {
  return updateRow(CONFIG.SHEETS.LIVE_SESSIONS || "LiveSessions", "LiveSessionID", sessionId, updates);
}

/**
 * Resolves an active YouTube access token for the given channelId.
 * Checks stored token in ScriptProperties (YT_AUTH_<channelId>).
 * If expired or expiring within 5 minutes, automatically calls refreshYouTubeAccessToken(channelId).
 */
function getOrRefreshYouTubeAccessToken(channelId) {
  if (!channelId) {
    return { success: false, error: "channelId is required" };
  }

  const tokenKey = (typeof YT_OAUTH_CONSTANTS !== "undefined" && YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX) ?
    (YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX + channelId) : ("YT_AUTH_" + channelId);
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(tokenKey);

  if (!raw) {
    return { success: false, error: "No stored credentials for YouTube channel " + channelId + ". Please reconnect via Admin Center." };
  }

  let tokenData;
  try {
    tokenData = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: "Corrupted token data in storage" };
  }

  const now = Date.now();
  const expiresAt = Number(tokenData.tokenExpiresAt || 0);
  let accessToken = tokenData.accessToken || "";

  // If token is missing, expired, or expiring within 5 minutes, refresh it
  if (!accessToken || (expiresAt - now < 5 * 60 * 1000)) {
    if (typeof refreshYouTubeAccessToken !== "function") {
      return { success: false, error: "refreshYouTubeAccessToken function unavailable" };
    }
    const refreshRes = refreshYouTubeAccessToken(channelId);
    if (!refreshRes || !refreshRes.success) {
      return { success: false, error: "Token refresh failed: " + (refreshRes ? refreshRes.error : "Unknown error") };
    }
    accessToken = refreshRes.accessToken;
  }

  return {
    success: true,
    accessToken: accessToken
  };
}

/**
 * Creates a YouTube Live Broadcast via YouTube Live Streaming API v3.
 * POST https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails
 */
function createYouTubeLiveBroadcast(accessToken, title, description) {
  if (!accessToken) throw new Error("accessToken required for createYouTubeLiveBroadcast");
  if (!title) throw new Error("title required for createYouTubeLiveBroadcast");

  const url = "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails";
  const nowIso = new Date().toISOString();

  const payload = {
    snippet: {
      title: String(title).trim(),
      description: String(description || "").trim(),
      scheduledStartTime: nowIso
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      recordFromStart: true,
      enableDvr: true
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    throw new Error("Non-JSON response from YouTube liveBroadcasts.insert (HTTP " + statusCode + ")");
  }

  if (statusCode < 200 || statusCode >= 300) {
    const errMsg = (json.error && json.error.message) || ("YouTube liveBroadcasts.insert failed (HTTP " + statusCode + ")");
    throw new Error(errMsg);
  }

  return {
    id: json.id,
    videoId: json.id,
    title: (json.snippet && json.snippet.title) || title,
    status: json.status,
    contentDetails: json.contentDetails
  };
}

/**
 * Creates a dedicated, non-reusable YouTube Live Stream ingestion object.
 * POST https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,contentDetails
 */
function createYouTubeLiveStream(accessToken, title, liveSessionId) {
  if (!accessToken) throw new Error("accessToken required for createYouTubeLiveStream");

  const url = "https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,contentDetails";
  const streamTitle = "Ekka1km Stream - " + (title || "Live") + " (" + (liveSessionId || Utilities.getUuid().substring(0, 8)) + ")";

  const payload = {
    snippet: {
      title: streamTitle
    },
    cdn: {
      frameRate: "variable",
      ingestionType: "rtmp",
      resolution: "variable"
    },
    contentDetails: {
      isReusable: false
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    throw new Error("Non-JSON response from YouTube liveStreams.insert (HTTP " + statusCode + ")");
  }

  if (statusCode < 200 || statusCode >= 300) {
    const errMsg = (json.error && json.error.message) || ("YouTube liveStreams.insert failed (HTTP " + statusCode + ")");
    throw new Error(errMsg);
  }

  const cdn = json.cdn || {};
  const ingestionInfo = cdn.ingestionInfo || {};

  let ingestionAddress = ingestionInfo.rtmpsIngestionAddress || ingestionInfo.ingestionAddress || "rtmps://a.rtmps.youtube.com/live2";
  if (ingestionAddress.indexOf("rtmp://") === 0) {
    ingestionAddress = ingestionAddress.replace("rtmp://", "rtmps://");
  }

  const streamName = ingestionInfo.streamName || "";
  if (!streamName) {
    throw new Error("YouTube liveStreams did not return a streamName (stream key)");
  }

  return {
    id: json.id,
    ingestionAddress: ingestionAddress,
    streamName: streamName
  };
}

/**
 * Binds a YouTube Live Broadcast to a YouTube Live Stream.
 * POST https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id={broadcastId}&part=id,contentDetails&streamId={streamId}
 */
function bindYouTubeBroadcastToStream(accessToken, broadcastId, streamId) {
  if (!accessToken) throw new Error("accessToken required for bindYouTubeBroadcastToStream");
  if (!broadcastId) throw new Error("broadcastId required for bindYouTubeBroadcastToStream");
  if (!streamId) throw new Error("streamId required for bindYouTubeBroadcastToStream");

  const url = "https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=" +
    encodeURIComponent(broadcastId) +
    "&part=id,contentDetails&streamId=" +
    encodeURIComponent(streamId);

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      "Authorization": "Bearer " + accessToken
    },
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    throw new Error("Non-JSON response from YouTube liveBroadcasts.bind (HTTP " + statusCode + ")");
  }

  if (statusCode < 200 || statusCode >= 300) {
    const errMsg = (json.error && json.error.message) || ("YouTube liveBroadcasts.bind failed (HTTP " + statusCode + ")");
    throw new Error(errMsg);
  }

  return {
    success: true,
    broadcastId: json.id,
    boundStreamId: streamId
  };
}

/**
 * Transitions a YouTube Live Broadcast to 'complete' status.
 * POST https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id={broadcastId}&part=id,status
 * Handles already-completed broadcasts gracefully.
 */
function endYouTubeLiveBroadcast(accessToken, broadcastId) {
  if (!accessToken || !broadcastId) {
    return { success: false, error: "accessToken and broadcastId are required" };
  }

  const url = "https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=" +
    encodeURIComponent(broadcastId) +
    "&part=id,status";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      "Authorization": "Bearer " + accessToken
    },
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    json = {};
  }

  if (statusCode >= 200 && statusCode < 300) {
    return { success: true, status: (json.status && json.status.lifeCycleStatus) || "complete" };
  }

  const errMessage = (json.error && json.error.message) || responseBody;
  if (statusCode === 400 || statusCode === 409) {
    if (/redundant|already|complete|cannot transition/i.test(errMessage)) {
      return { success: true, status: "complete", note: "Broadcast was already complete" };
    }
  }

  return { success: false, error: "YouTube broadcast transition failed: " + errMessage };
}

/**
 * ============================================================
 * ROUTE: START LIVE SESSION
 * ?action=startlivesession&session=TOKEN&channelId=UC...&title=...&latitude=...&longitude=...
 * Authenticates user, verifies active allocation, verifies channel health,
 * creates YouTube broadcast + dedicated non-reusable stream, binds them,
 * persists LiveSession row in Starting state, and returns ephemeral ingestion credentials.
 * ============================================================
 */
function startLiveSession(e) {
  const lock = (typeof LockService !== "undefined" && LockService.getScriptLock) ? LockService.getScriptLock() : null;
  if (lock) {
    try {
      lock.waitLock(10000);
    } catch (lockErr) {
      return error("Lock acquisition timeout during start live session. Please retry.");
    }
  }

  try {
    // 1. Authenticate caller and derive identity strictly from session
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const userId = String(auth.userId).trim();
    if (!userId) return error("Unable to identify authenticated user");

    const p = (e && e.parameter) || {};
    const channelId = String(p.channelId || "").trim();
    const title = String(p.title || "").trim();
    const description = String(p.description || "").trim();
    const latitudeStr = String(p.latitude || "").trim();
    const longitudeStr = String(p.longitude || "").trim();
    const locationEventId = String(p.locationEventId || "").trim();
    const locationEventName = String(p.locationEventName || "").trim();

    // 2. Validate required inputs
    if (!channelId) return error("channelId parameter is required");
    if (!title) return error("title parameter is required");
    if (!latitudeStr || !longitudeStr) return error("latitude and longitude parameters are required");

    // 3. Authoritative GPS validation: latitude [-90..90], longitude [-180..180]
    const lat = parseFloat(latitudeStr);
    const lng = parseFloat(longitudeStr);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return error("Invalid latitude: must be a number between -90 and 90");
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return error("Invalid longitude: must be a number between -180 and 180");
    }

    // 4. Validate active LiveAllocation for this user and channel
    ensureLiveAllocationsSheet();
    const activeAllocations = getActiveAllocationsForUser(userId);
    const hasAllocation = activeAllocations.some(function(a) {
      return String(a.YouTubeChannelID || "").trim() === channelId;
    });
    if (!hasAllocation) {
      return error("User " + userId + " is not actively allocated to broadcast on channel " + channelId);
    }

    // 5. Validate LiveChannels row exists, Status is Active, and OAuthStatus is Active
    ensureLiveChannelsSheet();
    const channel = findLiveChannelById(channelId);
    if (!channel) {
      return error("YouTube channel " + channelId + " not found in LiveChannels registry");
    }
    const channelStatus = String(channel.Status || "").toLowerCase();
    const oauthStatus = String(channel.OAuthStatus || "").toLowerCase();
    if (channelStatus !== "active" || oauthStatus !== "active") {
      return error("Cannot start live: Channel status is " + channel.Status + " (OAuth: " + channel.OAuthStatus + ")");
    }

    // 6. Prevent duplicate active session for this broadcaster, protecting against stale starting sessions
    ensureLiveSessionsSheet();
    const existingSessions = getAllLiveSessions();
    const STALE_STARTING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
    const nowMs = Date.now();

    const hasActiveSession = existingSessions.some(function(s) {
      const sUserId = String(s.CameraPersonID || "").trim();
      if (sUserId !== userId) return false;

      const sStatus = String(s.Status || "").toLowerCase();
      if (sStatus === "active") {
        return true;
      }
      if (sStatus === "starting") {
        let createdMs = 0;
        if (s.CreatedAt instanceof Date) {
          createdMs = s.CreatedAt.getTime();
        } else if (s.CreatedAt) {
          const parsed = new Date(s.CreatedAt).getTime();
          if (!isNaN(parsed)) createdMs = parsed;
        }

        // Check if starting session is older than 3 minutes (orphaned from client/network timeout)
        const isStale = createdMs > 0 && (nowMs - createdMs) > STALE_STARTING_THRESHOLD_MS;
        if (isStale) {
          const orphanSessionId = String(s.LiveSessionID || "").trim();
          if (orphanSessionId) {
            try {
              const nowIso = new Date().toISOString();
              updateLiveSession(orphanSessionId, {
                Status: "Ended",
                EndedAt: nowIso,
                TerminationReason: "ClientTimeoutAbandoned",
                UpdatedAt: nowIso
              });
              // Attempt graceful completion of YouTube broadcast if still open
              const orphanChannelId = String(s.YouTubeChannelID || "").trim();
              const orphanBroadcastId = String(s.YouTubeBroadcastID || "").trim();
              if (orphanChannelId && orphanBroadcastId && typeof endYouTubeLiveBroadcast === "function") {
                try {
                  const tRes = getOrRefreshYouTubeAccessToken(orphanChannelId);
                  if (tRes && tRes.success) {
                    endYouTubeLiveBroadcast(tRes.accessToken, orphanBroadcastId);
                  }
                } catch (ytEndErr) {}
              }
            } catch (cleanupErr) {}
          }
          return false; // Stale starting session does not block new session
        }
        return true; // Still within 3-minute starting window
      }
      return false;
    });

    if (hasActiveSession) {
      return error("A live session is already starting or active for your account. Please end it before starting a new one.");
    }

    // 7. Acquire / refresh YouTube access token server-side
    const tokenRes = getOrRefreshYouTubeAccessToken(channelId);
    if (!tokenRes.success) {
      return error("YouTube authorization error: " + tokenRes.error);
    }
    const accessToken = tokenRes.accessToken;

    // 8. Generate authoritative LiveSessionID
    const nowIso = new Date().toISOString();
    const liveSessionId = "LS_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "_" + Math.floor(1000 + Math.random() * 9000);

    // 9. Call YouTube API: Create broadcast
    const broadcast = createYouTubeLiveBroadcast(accessToken, title, description);
    const broadcastId = broadcast.id;

    // 10. Call YouTube API: Create dedicated non-reusable stream
    const stream = createYouTubeLiveStream(accessToken, title, liveSessionId);
    const streamId = stream.id;

    // 11. Call YouTube API: Bind broadcast to stream
    bindYouTubeBroadcastToStream(accessToken, broadcastId, streamId);

    // 12. Resolve camera person display name
    let cameraPersonName = userId;
    try {
      const user = getRowById(CONFIG.SHEETS.USERS, "UserID", userId);
      if (user) cameraPersonName = String(user.FullName || user.Name || userId).trim();
    } catch (uErr) {}

    const watchUrl = "https://www.youtube.com/watch?v=" + broadcastId;
    const embedUrl = "https://www.youtube.com/embed/" + broadcastId;

    // 13. Persist LiveSession row in Starting/prepared state (never persisting stream key)
    const sessionRow = {
      LiveSessionID: liveSessionId,
      CameraPersonID: userId,
      CameraPersonName: cameraPersonName,
      YouTubeChannelID: channelId,
      YouTubeBroadcastID: broadcastId,
      YouTubeVideoID: broadcastId,
      YouTubeStreamID: streamId,
      Latitude: lat,
      Longitude: lng,
      LocationEventID: locationEventId,
      LocationEventName: locationEventName,
      IsLocationOffset: "No",
      OffsetDistanceKm: 0,
      Title: title,
      Description: description,
      Status: "Starting",
      StartedAt: "",
      EndedAt: "",
      DurationSeconds: 0,
      CurrentViewers: 0,
      EkkaSampledPeak: 0,
      EkkaSampledAverage: 0,
      EkkaSampleSum: 0,
      EkkaSampleCount: 0,
      TotalViews: 0,
      WatchUrl: watchUrl,
      EmbedUrl: embedUrl,
      TerminationReason: "",
      CreatedAt: nowIso,
      UpdatedAt: nowIso
    };
    createLiveSessionRow(sessionRow);

    // 14. Return only minimum ephemeral ingestion info over HTTPS
    return success({
      liveSessionId: liveSessionId,
      channelId: channelId,
      channelTitle: channel.ChannelTitle || "Ekka1Km LiveNews",
      broadcastId: broadcastId,
      videoId: broadcastId,
      streamId: streamId,
      rtmpsIngestionUrl: stream.ingestionAddress,
      streamKey: stream.streamName, // Ephemeral credential: RAM only
      watchUrl: watchUrl,
      embedUrl: embedUrl,
      status: "Starting"
    }, "Live broadcast and dedicated stream prepared successfully");

  } catch (err) {
    return exception(err);
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

/**
 * ============================================================
 * ROUTE: ACTIVATE LIVE SESSION
 * ?action=activatelivesession&session=TOKEN&liveSessionId=LS_...
 * Transitions session from 'Starting' to 'Active' when Android streaming
 * connection is genuinely established.
 * ============================================================
 */
function activateLiveSession(e) {
  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const userId = String(auth.userId).trim();
    const liveSessionId = String((e && e.parameter && e.parameter.liveSessionId) || "").trim();
    if (!liveSessionId) return error("liveSessionId parameter is required");

    ensureLiveSessionsSheet();
    const session = findLiveSessionById(liveSessionId);
    if (!session) return error("LiveSession not found: " + liveSessionId);

    // Verify caller owns session or is admin
    const sessionOwner = String(session.CameraPersonID || "").trim();
    if (sessionOwner !== userId) {
      const adminCheck = (typeof requireAdminSession === "function") ? requireAdminSession(e) : { valid: false };
      if (!adminCheck.valid) {
        return error("Forbidden: You are not authorized to activate this session");
      }
    }

    const currentStatus = String(session.Status || "").toLowerCase();
    if (currentStatus === "ended") {
      return error("Cannot activate a session that has already ended");
    }

    const nowIso = new Date().toISOString();
    const startedAt = session.StartedAt || nowIso;

    updateLiveSession(liveSessionId, {
      Status: "Active",
      StartedAt: startedAt,
      UpdatedAt: nowIso
    });

    return success({
      liveSessionId: liveSessionId,
      status: "Active",
      startedAt: startedAt
    }, "Live session marked Active");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ROUTE: END LIVE SESSION
 * ?action=endlivesession&session=TOKEN&liveSessionId=LS_...&terminationReason=...
 * Ends YouTube broadcast, updates LiveSessions row with EndedAt,
 * duration, and termination reason.
 * ============================================================
 */
function endLiveSession(e) {
  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const userId = String(auth.userId).trim();
    const p = (e && e.parameter) || {};
    const liveSessionId = String(p.liveSessionId || "").trim();
    const terminationReason = String(p.terminationReason || "Broadcaster ended").trim();

    if (!liveSessionId) return error("liveSessionId parameter is required");

    ensureLiveSessionsSheet();
    const session = findLiveSessionById(liveSessionId);
    if (!session) return error("LiveSession not found: " + liveSessionId);

    // Verify caller owns session or is admin
    const sessionOwner = String(session.CameraPersonID || "").trim();
    if (sessionOwner !== userId) {
      const adminCheck = (typeof requireAdminSession === "function") ? requireAdminSession(e) : { valid: false };
      if (!adminCheck.valid) {
        return error("Forbidden: You are not authorized to end this session");
      }
    }

    // If already ended, return graceful success
    if (String(session.Status || "").toLowerCase() === "ended") {
      return success({
        liveSessionId: liveSessionId,
        status: "Ended",
        startedAt: session.StartedAt || "",
        endedAt: session.EndedAt || "",
        durationSeconds: Number(session.DurationSeconds || 0),
        terminationReason: session.TerminationReason || terminationReason,
        alreadyEnded: true
      }, "Live session was already finalized");
    }

    // Call YouTube API to complete broadcast
    const channelId = String(session.YouTubeChannelID || "").trim();
    const broadcastId = String(session.YouTubeBroadcastID || "").trim();
    if (channelId && broadcastId) {
      try {
        const tokenRes = getOrRefreshYouTubeAccessToken(channelId);
        if (tokenRes && tokenRes.success) {
          endYouTubeLiveBroadcast(tokenRes.accessToken, broadcastId);
        }
      } catch (ytErr) {
        Logger.log("Notice: YouTube broadcast completion notice: " + ytErr.message);
      }
    }

    const nowIso = new Date().toISOString();
    const startIso = session.StartedAt || session.CreatedAt || nowIso;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(nowIso).getTime();
    const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

    updateLiveSession(liveSessionId, {
      Status: "Ended",
      EndedAt: nowIso,
      DurationSeconds: durationSeconds,
      TerminationReason: terminationReason,
      UpdatedAt: nowIso
    });

    return success({
      liveSessionId: liveSessionId,
      status: "Ended",
      startedAt: startIso,
      endedAt: nowIso,
      durationSeconds: durationSeconds,
      terminationReason: terminationReason
    }, "Live session ended successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ROUTE: GET MY LIVE SESSION
 * ?action=getmylivesession&session=TOKEN
 * Queries active or starting session for authenticated camera person.
 * Returns sanitized metadata without secrets or stream keys.
 * ============================================================
 */
function getMyLiveSession(e) {
  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const userId = String(auth.userId).trim();
    ensureLiveSessionsSheet();
    const all = getAllLiveSessions();
    const STALE_STARTING_THRESHOLD_MS = 3 * 60 * 1000;
    const nowMs = Date.now();

    const activeSession = all.find(function(s) {
      const sUser = String(s.CameraPersonID || "").trim();
      if (sUser !== userId) return false;

      const sStatus = String(s.Status || "").toLowerCase();
      if (sStatus === "active") return true;
      if (sStatus === "starting") {
        let createdMs = 0;
        if (s.CreatedAt instanceof Date) {
          createdMs = s.CreatedAt.getTime();
        } else if (s.CreatedAt) {
          const parsed = new Date(s.CreatedAt).getTime();
          if (!isNaN(parsed)) createdMs = parsed;
        }
        return (createdMs === 0 || (nowMs - createdMs) <= STALE_STARTING_THRESHOLD_MS);
      }
      return false;
    });

    if (!activeSession) {
      return success({
        hasActiveSession: false,
        session: null
      }, "No active live session found");
    }

    return success({
      hasActiveSession: true,
      session: {
        liveSessionId: String(activeSession.LiveSessionID || ""),
        channelId: String(activeSession.YouTubeChannelID || ""),
        broadcastId: String(activeSession.YouTubeBroadcastID || ""),
        videoId: String(activeSession.YouTubeVideoID || activeSession.YouTubeBroadcastID || ""),
        streamId: String(activeSession.YouTubeStreamID || ""),
        title: String(activeSession.Title || ""),
        description: String(activeSession.Description || ""),
        status: String(activeSession.Status || ""),
        startedAt: String(activeSession.StartedAt || ""),
        createdAt: String(activeSession.CreatedAt || ""),
        latitude: activeSession.Latitude,
        longitude: activeSession.Longitude,
        watchUrl: String(activeSession.WatchUrl || ""),
        embedUrl: String(activeSession.EmbedUrl || "")
      }
    }, "Active live session retrieved");

  } catch (err) {
    return exception(err);
  }
}



