/**
 * ============================================================
 * EKKA1KM BACKEND
 * MediaUpload.js
 * ImageKit Upload API
 * V1.3
 * ============================================================
 */

function handleUpload(e) {
  try {
    var allParams = {};

    // Query parameters
    if (e.parameter) {
      Object.keys(e.parameter).forEach(function (key) {
        allParams[key] = e.parameter[key];
      });
    }

    // POST body
    if (e.postData && e.postData.contents) {
      var rawBody = e.postData.contents;
      var contentType = (e.postData.type || "").toLowerCase();

      if (contentType.indexOf("application/json") !== -1) {
        try {
          var json = JSON.parse(rawBody);
          Object.keys(json).forEach(function (key) {
            if (!allParams[key]) {
              allParams[key] = json[key];
            }
          });
        } catch (err) {}
      } else {
        try {
          var pairs = rawBody.split("&");

          pairs.forEach(function (pair) {
            var parts = pair.split("=");

            if (parts.length >= 2) {
              var key = decodeURIComponent(
                parts[0].replace(/\+/g, " ")
              );

              var value = decodeURIComponent(
                parts.slice(1).join("=").replace(/\+/g, " ")
              );

              if (!allParams[key]) {
                allParams[key] = value;
              }
            }
          });
        } catch (err) {}
      }
    }

    var base64Data = allParams.base64 || "";
    var fileName =
      allParams.fileName ||
      allParams.filename ||
      "";

    var folder = allParams.folder || "test";

    if (!base64Data) {
      return error("No file data provided.");
    }

    if (!fileName) {
      fileName =
        "upload_" +
        Utilities.getUuid().substring(0, 8) +
        ".jpg";
    }

    folder = String(folder).replace(
      /[^a-zA-Z0-9_\/-]/g,
      ""
    );

    // Remove data URI prefix if present
    if (base64Data.indexOf("base64,") !== -1) {
      base64Data =
        base64Data.split("base64,")[1];
    }

    Logger.log(
      "Filename: " + fileName
    );
    Logger.log(
      "Base64 Length: " +
        base64Data.length
    );
    Logger.log(
      "First 50 chars: " +
        base64Data.substring(0, 50)
    );
    Logger.log(
      "Private key length: " +
        IMAGEKIT_CONFIG.PRIVATE_KEY.length
    );

    var authString =
      Utilities.base64Encode(
        IMAGEKIT_CONFIG.PRIVATE_KEY + ":"
      );

    var payload = {
      file: base64Data,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: "true"
    };

    var formBody =
      Object.keys(payload)
        .map(function (key) {
          return (
            encodeURIComponent(key) +
            "=" +
            encodeURIComponent(
              payload[key]
            )
          );
        })
        .join("&");

    var response =
      UrlFetchApp.fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "post",
          contentType:
            "application/x-www-form-urlencoded",
          headers: {
            Authorization:
              "Basic " + authString
          },
          payload: formBody,
          muteHttpExceptions: true
        }
      );

    var code =
      response.getResponseCode();
    var body =
      response.getContentText();

    Logger.log(
      "Response Code: " + code
    );
    Logger.log(
      "Response Body: " + body
    );

    if (code >= 200 && code < 300) {
      var result =
        JSON.parse(body);

      return success(
        {
          url: result.url,
          fileId: result.fileId,
          thumbnailUrl:
            result.thumbnailUrl ||
            result.url,
          name: result.name,
          size: result.size,
          fileType: result.fileType
        },
        "File uploaded successfully"
      );
    }

    return error(body);
  } catch (err) {
    Logger.log(err.toString());
    return exception(err);
  }
}

/**
 * Delete file
 */
function handleDeleteFile(e) {
  try {
    var fileId =
      e.parameter.fileId;

    if (!fileId) {
      return error(
        "fileId parameter is required"
      );
    }

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
      response.getResponseCode() ===
      200
    ) {
      return success(
        {
          fileId: fileId
        },
        "File deleted successfully"
      );
    }

    return error(
      response.getContentText()
    );
  } catch (err) {
    return exception(err);
  }
}

/**
 * ImageKit auth info
 */
function handleImageKitAuth() {
  try {
    return success(
      {
        publicKey:
          IMAGEKIT_CONFIG.PUBLIC_KEY,
        urlEndpoint:
          IMAGEKIT_CONFIG.URL_ENDPOINT
      },
      "ImageKit Auth parameters loaded"
    );
  } catch (err) {
    return exception(err);
  }
}

