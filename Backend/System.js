/**
 * ============================================================
 * System APIs V5.0
 * ============================================================
 */

function getHealth(e) {
  try {

    return success({
      status:
        "UP",
      app:
        getAppName(),
      version:
        getVersion(),
      serverTime:
        new Date()
    });

  } catch (err) {
    return exception(err);
  }
}


function getSystemInfo(e) {
  try {

    return success({
      app:
        getAppName(),
      version:
        getVersion(),
      timezone:
        Session.getScriptTimeZone()
    });

  } catch (err) {
    return exception(err);
  }
}


function getErrorLogs(e) {
  try {
    return success(
      getSheetData(
        "ErrorLogs"
      )
    );

  } catch (err) {
    return exception(err);
  }
}


function logError(
  module,
  err
) {
  try {

    getSheet(
      "ErrorLogs"
    ).appendRow([
      "ER" +
        Utilities.getUuid()
          .substring(0, 8),
      module,
      String(
        err.message || err
      ),
      String(
        err.stack || ""
      ),
      new Date()
    ]);

  } catch (e) {}
}

