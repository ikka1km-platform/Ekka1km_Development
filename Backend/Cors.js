/**
 * ============================================================
 * EKKA1KM BACKEND
 * Cors.js
 * CORS Support for Google Apps Script
 * V1.0
 * ============================================================
 * 
 * Google Apps Script ContentService does NOT support
 * custom HTTP headers. This module provides:
 * 
 * 1. CORS preflight handler for OPTIONS requests
 * 2. Wrapper to serve JSON via text/html for CORS support
 * 
 * For POST requests with JSON body, browsers send a
 * preflight OPTIONS request. GAS returns this via
 * doOptions() -> corsPreflightResponse().
 * 
 * For maximum compatibility, frontend should send
 * POST as application/x-www-form-urlencoded or
 * multipart/form-data to avoid preflight entirely.
 * ============================================================
 */


/**
 * ============================================================
 * CORS Preflight Response
 * 
 * GAS cannot set Access-Control headers natively.
 * This returns a valid JSON response for the OPTIONS
 * preflight. Modern browsers will accept this if the
 * actual deployment permissions are set correctly:
 * 
 * Deploy as: Web App
 * Execute as: Me
 * Who has access: Anyone
 * 
 * Additionally, the ContentService output is already
 * served from a Google domain which has its own CORS
 * handling for GET/simple POST requests.
 * 
 * For POST with JSON Content-Type, the frontend must
 * avoid the preflight by NOT setting custom headers,
 * OR use mode: 'no-cors' (but then cannot read response).
 * 
 * The recommended approach is to always POST as
 * application/x-www-form-urlencoded or with no
 * explicit Content-Type header.
 * ============================================================
 */

function corsPreflightResponse() {
  return ContentService
    .createTextOutput(
      JSON.stringify({
        success: true,
        status: "CORS_PREFLIGHT",
        message: "OK"
      })
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/**
 * ============================================================
 * CORS-safe output
 * 
 * Wraps a TextOutput with additional handling.
 * In GAS, we cannot set Access-Control headers.
 * This function exists as a placeholder for future
 * proxy solutions.
 * ============================================================
 */

function corsOutput(textOutput) {
  // Google Apps Script ContentService serves from
  // script.google.com domain which has built-in
  // CORS for simple GET/POST requests.
  // 
  // For custom headers, use the form-encoded approach
  // in the frontend to avoid preflight.
  return textOutput;
}


/**
 * ============================================================
 * Parse POST body as JSON or form-encoded
 * 
 * GAS doPost(e) receives:
 * - e.postData.contents for raw body
 * - e.parameter for URL params and form-encoded data
 * 
 * This helper returns parsed data regardless of format.
 * ============================================================
 */

function parsePostData(e) {
  const params = {};

  // Collect from URL parameters
  if (e.parameter) {
    Object.keys(e.parameter).forEach(key => {
      params[key] = e.parameter[key];
    });
  }

  // Try to parse JSON body if present
  if (e.postData && e.postData.contents) {
    try {
      const json = JSON.parse(e.postData.contents);
      Object.keys(json).forEach(key => {
        params[key] = json[key];
      });
    } catch (err) {
      // Not JSON, could be form-encoded string
      const contents = e.postData.contents;
      if (contents && typeof contents === "string" && contents.includes("=")) {
        contents.split("&").forEach(pair => {
          const parts = pair.split("=");
          if (parts.length >= 2) {
            params[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join("="));
          }
        });
      }
    }
  }

  return params;
}