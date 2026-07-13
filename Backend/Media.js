/**
 * ============================================================
 * EKKA1KM BACKEND
 * Media.gs
 * V5.8.2
 * ============================================================
 */

function getMedia(e) {
  try {
    var sheet = getSheet(
      CONFIG.SHEETS.MEDIA
    );

    if (!sheet) {
      return success(
        {
          count: 0,
          data: []
        },
        "Media sheet not found"
      );
    }

    var values =
      sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return success(
        {
          count: 0,
          data: []
        },
        "Success"
      );
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      var row = {};

      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] =
          values[i][j];
      }

      data.push(row);
    }

    return success(
      {
        count: data.length,
        data: data
      },
      "Success"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * Single Media
 * ============================================================
 */

function getSingleMedia(mediaId) {
  try {
    var result =
      getMedia().getContent();

    return result;

  } catch (err) {
    return null;
  }
}

