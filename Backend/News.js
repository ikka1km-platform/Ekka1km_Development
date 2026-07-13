/**
 * ============================================================
 * EKKA1KM BACKEND
 * News.js
 * V5.8.2
 * GPS Radius Filtering Enabled
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

