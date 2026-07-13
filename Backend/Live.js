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
 * ADD LIVE
 * ============================================================
 */
function addLive(e) {
  return error(
    "Admin panel version coming later"
  );
}


/**
 * ============================================================
 * UPDATE LIVE
 * ============================================================
 */
function updateLive(e) {
  return error(
    "Admin panel version coming later"
  );
}


/**
 * ============================================================
 * DELETE LIVE (SOFT)
 * ============================================================
 */
function deleteLive(e) {
  try {

    const liveId =
      e.parameter.liveId || "";

    updateRow(
      "Live",
      "LiveID",
      liveId,
      {
        Status:
          "Deleted",
        IsLive:
          "No"
      }
    );

    return success(
      {},
      "Live deleted"
    );

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
  return error(
    "Admin panel version coming later"
  );
}

