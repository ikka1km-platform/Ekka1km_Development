/**
 * ============================================================
 * EKKA1KM BACKEND
 * News.js
 * V6.0 - Professional News System
 * Support: Featured, Breaking, Categories, Related, Local
 * ============================================================
 */


/**
 * Get all news
 * URL:
 * ?action=news
 * ?action=news&lat=26.9124&lng=75.7873&radius=51
 * ?action=news&userId=U001
 */
function getNews(e) {
  try {

    let news = [];

    const sheet =
      getSheet("News");

    const data =
      sheet.getDataRange()
        .getValues();

    if (data.length <= 1) {
      return success([], "No news found");
    }

    const headers =
      data[0];

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      const row = {};

      headers.forEach(
        function (
          header,
          index
        ) {
          row[header] =
            data[i][index];
        }
      );

      news.push(row);
    }

    const location =
      getLocationContext(e);

    const lat =
      location.lat;

    const lng =
      location.lng;

    const radius =
      location.radius;

    if (
      lat &&
      lng &&
      radius
    ) {
      news = filterByRadius(
        news,
        lat,
        lng,
        radius
      );
    }

    return success(
      news,
      "Success"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Get single article
 * URL:
 * ?action=article&id=N001
 */
function getArticle(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "NewsID required"
      );
    }

    const sheet =
      getSheet("News");

    const data =
      sheet.getDataRange()
        .getValues();

    const headers =
      data[0];

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(data[i][0]) ===
        String(id)
      ) {

        const article =
          {};

        headers.forEach(
          function (
            header,
            index
          ) {
            article[header] =
              data[i][index];
          }
        );

        return success(
          article,
          "Article Loaded"
        );
      }
    }

    return error(
      "Article not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Add News
 */
function addNews(e) {
  try {

    const p =
      e.parameter;

    const sheet =
      getSheet("News");

    const newsId =
      "N" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      newsId,
      p.UserID || "",
      p.Title || "",
      p.Description || "",
      p.Category || "",
      p.Image || "",
      p.VideoURL || "",
      p.Source || "",
      p.Address || "",
      p.City || "",
      p.District || "",
      p.State || "",
      p.Country || "",
      p.Latitude || "",
      p.Longitude || "",
      0,
      p.Featured || "No",
      p.Status || "Active",
      new Date()
    ]);

    return success(
      {
        NewsID: newsId
      },
      "News added successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Update News
 */
function updateNews(e) {
  try {

    const p =
      e.parameter;

    const id =
      p.NewsID || "";

    if (!id) {
      return error(
        "NewsID required"
      );
    }

    const sheet =
      getSheet("News");

    const data =
      sheet.getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(data[i][0]) ===
        String(id)
      ) {

        const headers =
          data[0];

        for (
          let j = 0;
          j < headers.length;
          j++
        ) {

          const key =
            headers[j];

          if (
            p[key] !== undefined &&
            p[key] !== ""
          ) {
            sheet
              .getRange(
                i + 1,
                j + 1
              )
              .setValue(
                p[key]
              );
          }
        }

        return success(
          {},
          "News updated successfully"
        );
      }
    }

    return error(
      "Article not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * Delete News
 */
function deleteNews(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "NewsID required"
      );
    }

    const sheet =
      getSheet("News");

    const data =
      sheet.getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(data[i][0]) ===
        String(id)
      ) {

        sheet.deleteRow(
          i + 1
        );

        return success(
          {},
          "News deleted successfully"
        );
      }
    }

    return error(
      "Article not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET FEATURED NEWS (Hero/Breaking)
 * ?action=featurednews&limit=5
 * ============================================================
 */
function getFeaturedNews(e) {
  try {
    const limit = parseInt(e.parameter.limit) || 5;
    const allNews = loadAllNews();
    const featured = [];

    for (var i = 0; i < allNews.length && featured.length < limit; i++) {
      var item = allNews[i];
      var status = String(item.Status || "Active").toLowerCase();
      var featuredVal = String(item.Featured || "No").toLowerCase();

      if (status !== "active" && status !== "published") continue;
      if (featuredVal === "yes" || featuredVal === "true") {
        featured.push(item);
      }
    }

    return success(featured, "Featured news loaded");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET BREAKING NEWS
 * ?action=breakingnews&limit=3
 * ============================================================
 */
function getBreakingNews(e) {
  try {
    const limit = parseInt(e.parameter.limit) || 3;
    const allNews = loadAllNews();
    const breaking = [];

    for (var i = 0; i < allNews.length && breaking.length < limit; i++) {
      var item = allNews[i];
      var status = String(item.Status || "Active").toLowerCase();
      var category = String(item.Category || "").toLowerCase();

      if (status !== "active" && status !== "published") continue;

      // Breaking category or high priority
      if (category === "breaking") {
        breaking.push(item);
      }
    }

    return success(breaking, "Breaking news loaded");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET NEWS BY CATEGORY
 * ?action=newsbycategory&category=Politics&limit=10
 * ============================================================
 */
function getNewsByCategory(e) {
  try {
    var category = (e.parameter.category || "").trim().toLowerCase();
    var limit = parseInt(e.parameter.limit) || 10;

    if (!category) {
      return error("Category parameter required");
    }

    var allNews = loadAllNews();
    var result = [];

    for (var i = 0; i < allNews.length && result.length < limit; i++) {
      var item = allNews[i];
      var itemCat = String(item.Category || "").toLowerCase();
      var status = String(item.Status || "Active").toLowerCase();

      if (status !== "active" && status !== "published") continue;

      if (itemCat === category) {
        result.push(item);
      }
    }

    return success(result, "Category news loaded");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET RELATED NEWS
 * ?action=relatednews&id=N001&limit=5
 * ============================================================
 */
function getRelatedNews(e) {
  try {
    var newsId = e.parameter.id || "";
    var limit = parseInt(e.parameter.limit) || 5;

    if (!newsId) {
      return error("NewsID required");
    }

    var allNews = loadAllNews();
    var currentItem = null;
    var result = [];

    // Find current article
    for (var i = 0; i < allNews.length; i++) {
      if (String(allNews[i].NewsID || allNews[i].id) === String(newsId)) {
        currentItem = allNews[i];
        break;
      }
    }

    if (!currentItem) {
      return error("Article not found");
    }

    var currentCategory = String(currentItem.Category || "").toLowerCase();
    var currentDistrict = String(currentItem.District || "").toLowerCase();

    // Find related: same category or same district
    for (var i = 0; i < allNews.length && result.length < limit; i++) {
      var item = allNews[i];
      if (String(item.NewsID || item.id) === String(newsId)) continue;

      var status = String(item.Status || "Active").toLowerCase();
      if (status !== "active" && status !== "published") continue;

      var itemCat = String(item.Category || "").toLowerCase();
      var itemDistrict = String(item.District || "").toLowerCase();

      if (itemCat === currentCategory || itemDistrict === currentDistrict) {
        result.push(item);
      }
    }

    // Fallback: latest news
    if (result.length === 0) {
      for (var i = 0; i < allNews.length && result.length < limit; i++) {
        var item = allNews[i];
        if (String(item.NewsID || item.id) === String(newsId)) continue;
        result.push(item);
      }
    }

    return success(result, "Related news loaded");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET LOCAL NEWS (GPS-based)
 * ?action=localnews&district=Jaipur&state=Rajasthan&limit=10
 * ============================================================
 */
function getLocalNews(e) {
  try {
    var district = (e.parameter.district || "").trim().toLowerCase();
    var state = (e.parameter.state || "").trim().toLowerCase();
    var limit = parseInt(e.parameter.limit) || 10;

    var allNews = loadAllNews();
    var result = [];

    for (var i = 0; i < allNews.length && result.length < limit; i++) {
      var item = allNews[i];
      var status = String(item.Status || "Active").toLowerCase();
      if (status !== "active" && status !== "published") continue;

      var itemDistrict = String(item.District || "").toLowerCase();
      var itemState = String(item.State || "").toLowerCase();

      if (district && itemDistrict === district) {
        result.push(item);
      } else if (state && !district && itemState === state) {
        result.push(item);
      }
    }

    return success(result, "Local news loaded");
  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LOAD ALL NEWS - Helper function
 * ============================================================
 */
function loadAllNews() {
  var sheet = getSheet("News");
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var news = [];

  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    news.push(row);
  }

  // Sort by created date descending (newest first)
  news.sort(function(a, b) {
    var dateA = new Date(a.CreatedDate || 0);
    var dateB = new Date(b.CreatedDate || 0);
    return dateB - dateA;
  });

  return news;
}