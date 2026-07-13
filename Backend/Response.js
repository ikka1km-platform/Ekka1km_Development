/**
 * ============================================================
 * EKKA1KM BACKEND
 * Response.gs
 * Standard API Response Functions
 * V5.8.2
 * ============================================================
 */


/**
 * ============================================================
 * JSON Output
 * ============================================================
 */
function output(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/**
 * ============================================================
 * Success Response
 * ============================================================
 */
function success(data, message) {
  return output({

    success: true,

    status: CONFIG.SUCCESS,

    message:
      message || "Success",

    timestamp:
      new Date().toISOString(),

    data:
      data === undefined
        ? null
        : data

  });
}


/**
 * ============================================================
 * Error Response
 * ============================================================
 */
function error(message) {
  return output({

    success: false,

    status: CONFIG.FAILED,

    message:
      message ||
      "Something went wrong.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * Validation Error
 * ============================================================
 */
function validationError(message) {
  return output({

    success: false,

    status:
      "VALIDATION_ERROR",

    message:
      message ||
      "Validation failed.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * Not Found
 * ============================================================
 */
function notFound(entity) {
  return output({

    success: false,

    status:
      "NOT_FOUND",

    message:
      (entity || "Record") +
      " not found.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * Unauthorized
 * ============================================================
 */
function unauthorized() {
  return output({

    success: false,

    status:
      "UNAUTHORIZED",

    message:
      "Unauthorized access.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * Forbidden
 * ============================================================
 */
function forbidden() {
  return output({

    success: false,

    status:
      "FORBIDDEN",

    message:
      "Permission denied.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * Exception Response
 * ============================================================
 */
function exception(err) {
  return output({

    success: false,

    status:
      "EXCEPTION",

    message:
      String(err),

    timestamp:
      new Date().toISOString(),

    data: null

  });
}


/**
 * ============================================================
 * List Response
 * ============================================================
 */
function listResponse(list) {

  list = list || [];

  return output({

    success: true,

    status:
      CONFIG.SUCCESS,

    count:
      list.length,

    timestamp:
      new Date().toISOString(),

    data:
      list

  });
}


/**
 * ============================================================
 * Single Record Response
 * ============================================================
 */
function singleResponse(record) {
  return output({

    success: true,

    status:
      CONFIG.SUCCESS,

    timestamp:
      new Date().toISOString(),

    data:
      record || null

  });
}


/**
 * ============================================================
 * Created Response
 * ============================================================
 */
function created(record) {
  return output({

    success: true,

    status:
      "CREATED",

    message:
      "Record created successfully.",

    timestamp:
      new Date().toISOString(),

    data:
      record || null

  });
}


/**
 * ============================================================
 * Updated Response
 * ============================================================
 */
function updated(record) {
  return output({

    success: true,

    status:
      "UPDATED",

    message:
      "Record updated successfully.",

    timestamp:
      new Date().toISOString(),

    data:
      record || null

  });
}


/**
 * ============================================================
 * Deleted Response
 * ============================================================
 */
function deleted() {
  return output({

    success: true,

    status:
      "DELETED",

    message:
      "Record deleted successfully.",

    timestamp:
      new Date().toISOString(),

    data: null

  });
}

