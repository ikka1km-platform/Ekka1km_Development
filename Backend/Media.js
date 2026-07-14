/**
 * ============================================================
 * EKKA1KM BACKEND
 * Media.js
 * V6.0 - Media Library System
 * Functions: addMedia, getMyMedia, deleteMedia
 * ============================================================
 */


/**
 * ============================================================
 * GET ALL MEDIA
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
 * SINGLE MEDIA
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


/**
 * ============================================================
 * ADD MEDIA - Record uploaded file in Media sheet
 * Called after successful ImageKit upload
 * ?action=addmedia
 *  &mediaId=M001
 *  &ownerUserId=U001
 *  &fileName=xxx.jpg
 *  &originalName=photo.jpg
 *  &fileType=image
 *  &mediaCategory=product
 *  &imageKitFileId=abc123
 *  &imageKitURL=https://ik.imagekit.io/xxx.jpg
 *  &thumbnailURL=https://ik.imagekit.io/xxx.jpg?tr=w-200
 *  &sizeKB=1024
 *  &width=800
 *  &height=600
 *  &status=Active
 * ============================================================
 */

function handleAddMedia(e) {
  try {
    var p = e.parameter;

    var sheet = getSheet(CONFIG.SHEETS.MEDIA);

    if (!sheet) {
      // Auto-create Media sheet if not found
      var ss = getSpreadsheet();
      sheet = ss.insertSheet(CONFIG.SHEETS.MEDIA);
      sheet.appendRow([
        "MediaID",
        "OwnerUserID",
        "FileName",
        "OriginalName",
        "FileType",
        "MediaCategory",
        "ImageKitFileID",
        "ImageKitURL",
        "ThumbnailURL",
        "SizeKB",
        "Width",
        "Height",
        "Duration",
        "Status",
        "CreatedDate",
        "DeletedDate"
      ]);
    }

    var mediaId = p.mediaId ||
      "M" + Utilities.getUuid().substring(0, 8);

    sheet.appendRow([
      mediaId,
      p.ownerUserId || "",
      p.fileName || "",
      p.originalName || "",
      p.fileType || "",
      p.mediaCategory || "",
      p.imageKitFileId || "",
      p.imageKitURL || "",
      p.thumbnailURL || "",
      p.sizeKB || "",
      p.width || "",
      p.height || "",
      p.duration || "",
      p.status || "Active",
      new Date(),
      ""
    ]);

    return success(
      {
        mediaId: mediaId
      },
      "Media recorded successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET MY MEDIA - Get media by owner
 * ?action=mymedia&ownerUserId=U001
 * ============================================================
 */

function handleGetMyMedia(e) {
  try {
    var ownerUserId =
      e.parameter.ownerUserId || "";

    if (!ownerUserId) {
      return error("Owner UserID required");
    }

    var sheet = getSheet(CONFIG.SHEETS.MEDIA);

    if (!sheet) {
      return success({
        count: 0,
        data: []
      }, "No media found");
    }

    var values =
      sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return success({
        count: 0,
        data: []
      }, "No media found");
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][1]).trim() === String(ownerUserId).trim()) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        data.push(row);
      }
    }

    return success(
      {
        count: data.length,
        data: data
      },
      "Media loaded"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * SEARCH MEDIA
 * ?action=searchmedia&query=xxx&ownerUserId=U001
 * ============================================================
 */

function handleSearchMedia(e) {
  try {
    var query =
      (e.parameter.query || "").toLowerCase().trim();
    var ownerUserId =
      e.parameter.ownerUserId || "";

    if (!query) {
      return handleGetMyMedia(e);
    }

    var sheet = getSheet(CONFIG.SHEETS.MEDIA);

    if (!sheet) {
      return success({
        count: 0,
        data: []
      }, "No media found");
    }

    var values =
      sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return success({
        count: 0,
        data: []
      }, "No media found");
    }

    var headers = values[0];
    var data = [];

    for (var i = 1; i < values.length; i++) {
      // Filter by owner if specified
      if (ownerUserId &&
        String(values[i][1]).trim() !== String(ownerUserId).trim()) {
        continue;
      }

      // Check if query matches any text field
      var match = false;
      for (var j = 0; j < values[i].length; j++) {
        var val = String(values[i][j] || "").toLowerCase();
        if (val.indexOf(query) !== -1) {
          match = true;
          break;
        }
      }

      if (match) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = values[i][j];
        }
        data.push(row);
      }
    }

    return success(
      {
        count: data.length,
        data: data
      },
      "Search complete"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * DELETE MEDIA - Soft delete (mark as deleted)
 * Also deletes from ImageKit
 * ?action=deletemedia&mediaId=M001
 * ============================================================
 */

function handleDeleteMedia(e) {
  try {
    var mediaId =
      e.parameter.mediaId || "";

    if (!mediaId) {
      return error("MediaID required");
    }

    var sheet = getSheet(CONFIG.SHEETS.MEDIA);

    if (!sheet) {
      return error("Media sheet not found");
    }

    var data =
      sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(mediaId).trim()) {
        var imageKitFileId = data[i][6] || "";

        // Step 1: Delete from ImageKit if fileId exists
        if (imageKitFileId) {
          var deleteResult = deleteFromImageKit(imageKitFileId);
          if (!deleteResult.success) {
            return error("Failed to delete from ImageKit. Aborted.");
          }
        }

        // Step 2: Soft delete - mark row
        var lastCol = data[i].length;
        sheet.getRange(i + 1, lastCol).setValue(new Date());

        // Also mark status as Deleted
        var statusCol = 14; // Status column index (1-based)
        if (statusCol <= lastCol) {
          sheet.getRange(i + 1, statusCol).setValue("Deleted");
        }

        return success(
          {
            mediaId: mediaId,
            deleted: true
          },
          "Media deleted successfully"
        );
      }
    }

    return error("Media not found");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * DELETE FROM IMAGEKIT - Helper function
 * ============================================================
 */

function deleteFromImageKit(fileId) {
  try {
    var authString =
      Utilities.base64Encode(
        IMAGEKIT_CONFIG.PRIVATE_KEY + ":"
      );

    var response =
      UrlFetchApp.fetch(
        "https://api.imagekit.io/v1/files/" +
          encodeURIComponent(fileId),
        {
          method: "delete",
          headers: {
            Authorization:
              "Basic " + authString
          },
          muteHttpExceptions: true
        }
      );

    if (
      response.getResponseCode() === 200 ||
      response.getResponseCode() === 204
    ) {
      return { success: true };
    }

    return {
      success: false,
      error: response.getContentText()
    };

  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}


/**
 * ============================================================
 * MEDIA ANALYTICS
 * ?action=mediaanalytics&ownerUserId=U001
 * ============================================================
 */

function handleMediaAnalytics(e) {
  try {
    var ownerUserId =
      e.parameter.ownerUserId || "";

    var sheet = getSheet(CONFIG.SHEETS.MEDIA);

    if (!sheet) {
      return success({
        totalMedia: 0,
        images: 0,
        videos: 0,
        totalSizeKB: 0
      }, "No data");
    }

    var values =
      sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return success({
        totalMedia: 0,
        images: 0,
        videos: 0,
        totalSizeKB: 0
      }, "No data");
    }

    var total = 0;
    var images = 0;
    var videos = 0;
    var totalSizeKB = 0;

    for (var i = 1; i < values.length; i++) {
      // Filter by owner if specified
      if (ownerUserId &&
        String(values[i][1]).trim() !== String(ownerUserId).trim()) {
        continue;
      }

      // Skip deleted
      var status = String(values[i][13] || "").trim();
      if (status === "Deleted") continue;

      total++;
      var fileType = String(values[i][4] || "").toLowerCase();
      if (fileType === "image" || fileType.indexOf("image") !== -1) {
        images++;
      } else if (fileType === "video" || fileType.indexOf("video") !== -1) {
        videos++;
      }

      var sizeKB = parseInt(values[i][9]) || 0;
      totalSizeKB += sizeKB;
    }

    return success({
      totalMedia: total,
      images: images,
      videos: videos,
      totalSizeKB: totalSizeKB,
      totalSizeMB: Math.round(totalSizeKB / 1024 * 100) / 100
    }, "Analytics loaded");

  } catch (err) {
    return exception(err);
  }
}