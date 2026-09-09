/**
 * ============================================================
 * EKKA1KM BACKEND
 * YouTubeOAuth.js
 * V6.0.0 - Stage 3A: YouTube OAuth 2.0 Backend Foundation
 * Admin OAuth URL generation, state validation, callback handling,
 * and secure server-side token management via ScriptProperties.
 * ============================================================
 */

/**
 * ============================================================
 * CONFIGURATION & CONSTANTS
 * ============================================================
 */
const YT_OAUTH_CONSTANTS = {
  AUTH_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_ENDPOINT: "https://oauth2.googleapis.com/token",
  REVOKE_ENDPOINT: "https://oauth2.googleapis.com/revoke",
  REQUIRED_SCOPE: "https://www.googleapis.com/auth/youtube.force-ssl",
  STATE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  STATE_KEY_PREFIX: "yt_state_",
  PENDING_TOKEN_KEY_PREFIX: "YT_PENDING_TOKEN_",
  CANONICAL_EXEC_URL: "https://script.google.com/macros/s/AKfycbxYdxeTloiDx986zDV529oi1WfpoUGZ4m58s9Bl6cY92fLYe3qgqHM-mj-bim2tXxvOnw/exec"
};

/**
 * Reads YouTube OAuth credentials from ScriptProperties.
 * Throws a sanitized Error if missing. Never logs or outputs the secret.
 */
function getYouTubeOAuthSettings() {
  const properties = PropertiesService.getScriptProperties();
  const clientId = (properties.getProperty("YOUTUBE_CLIENT_ID") || "").trim();
  const clientSecret = (properties.getProperty("YOUTUBE_CLIENT_SECRET") || "").trim();

  if (!clientId) {
    throw new Error("YOUTUBE_CLIENT_ID is not configured in Script Properties");
  }
  if (!clientSecret) {
    throw new Error("YOUTUBE_CLIENT_SECRET is not configured in Script Properties");
  }

  return {
    clientId: clientId,
    clientSecret: clientSecret
  };
}

/**
 * Resolves the OAuth redirect URI with robust fallbacks:
 * 1. Explicit ScriptProperty "YOUTUBE_REDIRECT_URI" if set
 * 2. ScriptApp.getService().getUrl() if running in deployed Web App context
 * 3. Canonical active deployment /exec URL
 */
function getYouTubeRedirectUri() {
  const explicitUri = PropertiesService.getScriptProperties().getProperty("YOUTUBE_REDIRECT_URI");
  if (explicitUri && explicitUri.trim()) {
    return explicitUri.trim();
  }

  try {
    if (typeof ScriptApp !== "undefined" && ScriptApp.getService) {
      const service = ScriptApp.getService();
      if (service && typeof service.getUrl === "function") {
        const url = service.getUrl();
        if (url && url.indexOf("http") === 0) {
          return url;
        }
      }
    }
  } catch (e) {
    // Context may not support getService() in certain testing environments
  }

  return YT_OAUTH_CONSTANTS.CANONICAL_EXEC_URL;
}

/**
 * Generates a high-entropy 64-hex CSRF state token and stores it in ScriptProperties.
 * State is tied to initiating admin ID and has a strict 10-minute expiry.
 */
function generateYouTubeOAuthState(adminId) {
  const state = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const payload = {
    adminId: String(adminId || "UNKNOWN"),
    createdAt: Date.now(),
    expiresAt: Date.now() + YT_OAUTH_CONSTANTS.STATE_TTL_MS
  };

  const storeKey = YT_OAUTH_CONSTANTS.STATE_KEY_PREFIX + state;
  PropertiesService.getScriptProperties().setProperty(storeKey, JSON.stringify(payload));
  return state;
}

/**
 * Validates and atomically consumes (deletes) the state token to prevent replay attacks.
 * Returns { valid: true, adminId } or { valid: false, message }.
 */
function validateAndConsumeYouTubeOAuthState(state) {
  if (!state || typeof state !== "string" || state.trim().length === 0) {
    return { valid: false, message: "Missing or invalid OAuth state parameter" };
  }

  const cleanState = state.trim();
  const storeKey = YT_OAUTH_CONSTANTS.STATE_KEY_PREFIX + cleanState;
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(storeKey);

  if (!raw) {
    return { valid: false, message: "Invalid or expired OAuth state" };
  }

  // Atomically delete property for strict one-time use
  properties.deleteProperty(storeKey);

  try {
    const data = JSON.parse(raw);
    const now = Date.now();
    if (!data.expiresAt || now > Number(data.expiresAt)) {
      return { valid: false, message: "OAuth state has expired. Please try connecting again from Admin Center." };
    }
    return {
      valid: true,
      adminId: String(data.adminId || "")
    };
  } catch (e) {
    return { valid: false, message: "Corrupted OAuth state record" };
  }
}

/**
 * ============================================================
 * ADMIN ROUTE: GET YOUTUBE OAUTH URL
 * ?action=adminyoutubeauthurl&session=TOKEN
 * Requires valid Ekka1km Admin session.
 * Builds and returns Google OAuth 2.0 authorization URL.
 * Never includes or leaks client secret.
 * ============================================================
 */
function getYouTubeOAuthUrl(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) {
      return admin.response;
    }

    let settings;
    try {
      settings = getYouTubeOAuthSettings();
    } catch (configErr) {
      return error(configErr.message);
    }

    const redirectUri = getYouTubeRedirectUri();
    const state = generateYouTubeOAuthState(admin.adminId);

    const queryParams = [
      "client_id=" + encodeURIComponent(settings.clientId),
      "redirect_uri=" + encodeURIComponent(redirectUri),
      "response_type=code",
      "scope=" + encodeURIComponent(YT_OAUTH_CONSTANTS.REQUIRED_SCOPE),
      "access_type=offline",
      "prompt=consent",
      "state=" + encodeURIComponent(state)
    ];

    const authUrl = YT_OAUTH_CONSTANTS.AUTH_ENDPOINT + "?" + queryParams.join("&");

    return success({
      authUrl: authUrl,
      state: state,
      expiresInSeconds: Math.floor(YT_OAUTH_CONSTANTS.STATE_TTL_MS / 1000),
      redirectUri: redirectUri
    }, "YouTube OAuth authorization URL generated successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * Server-side exchange of Google OAuth authorization code for tokens.
 * Makes HTTP POST to https://oauth2.googleapis.com/token.
 * Sanitizes errors; never logs client secret or tokens.
 */
function exchangeYouTubeOAuthCode(code, redirectUri, clientId, clientSecret) {
  const payload = {
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  };

  const response = UrlFetchApp.fetch(YT_OAUTH_CONSTANTS.TOKEN_ENDPOINT, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: payload,
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    json = { error: "unparseable_response", error_description: "Non-JSON response from Google token endpoint" };
  }

  if (statusCode !== 200) {
    const errDesc = json.error_description || json.error || ("HTTP " + statusCode);
    return {
      success: false,
      error: "Google token exchange failed: " + errDesc
    };
  }

  if (!json.access_token) {
    return {
      success: false,
      error: "Google token endpoint did not return an access token"
    };
  }

  return {
    success: true,
    tokens: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || "",
      expiresIn: json.expires_in || 3600,
      scope: json.scope || "",
      tokenType: json.token_type || "Bearer"
    }
  };
}

/**
 * ============================================================
 * OAUTH CALLBACK HANDLER
 * Handles redirect from Google OAuth consent screen:
 * - Success: /exec?code=...&state=...
 * - Denial/Error: /exec?error=...&state=...
 * - Explicit Action: ?action=youtubeoauthcallback&code=...&state=...
 *
 * Validates state, exchanges code for tokens, persists tokens
 * strictly server-side in ScriptProperties, and returns clean HTML/JSON.
 * ============================================================
 */
function handleYouTubeOAuthCallback(e) {
  const params = (e && e.parameter) || {};
  const isJsonRequest = String(params.format || "").toLowerCase() === "json";

  try {
    // 1. Check for OAuth denial / cancellation by user
    if (params.error) {
      const deniedState = params.state || "";
      if (deniedState) {
        // Clean up state if provided
        validateAndConsumeYouTubeOAuthState(deniedState);
      }
      const denialMessage = "Google authorization was not granted (" + (params.error_description || params.error) + ").";
      if (isJsonRequest) {
        return error(denialMessage);
      }
      return renderOAuthHtmlResponse(false, "Authorization Cancelled", denialMessage);
    }

    const state = params.state || "";
    const code = params.code || "";

    // 2. Validate state presence
    if (!state) {
      const msg = "Missing required OAuth state parameter.";
      if (isJsonRequest) return error(msg);
      return renderOAuthHtmlResponse(false, "Authorization Error", msg);
    }

    // 3. Atomically validate and consume state
    const stateCheck = validateAndConsumeYouTubeOAuthState(state);
    if (!stateCheck.valid) {
      if (isJsonRequest) return error(stateCheck.message);
      return renderOAuthHtmlResponse(false, "Invalid State", stateCheck.message);
    }

    // 4. Validate authorization code presence
    if (!code) {
      const msg = "Missing authorization code from Google.";
      if (isJsonRequest) return error(msg);
      return renderOAuthHtmlResponse(false, "Missing Code", msg);
    }

    // 5. Retrieve settings
    let settings;
    try {
      settings = getYouTubeOAuthSettings();
    } catch (configErr) {
      if (isJsonRequest) return error(configErr.message);
      return renderOAuthHtmlResponse(false, "Configuration Error", configErr.message);
    }

    const redirectUri = getYouTubeRedirectUri();

    // 6. Exchange code for tokens
    const exchangeResult = exchangeYouTubeOAuthCode(
      code,
      redirectUri,
      settings.clientId,
      settings.clientSecret
    );

    if (!exchangeResult.success) {
      if (isJsonRequest) return error(exchangeResult.error);
      return renderOAuthHtmlResponse(false, "Token Exchange Failed", exchangeResult.error);
    }

    const tokens = exchangeResult.tokens;
    const adminId = stateCheck.adminId;

    // 7. Store tokens strictly server-side in ScriptProperties
    const storePayload = {
      adminId: adminId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn * 1000),
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      savedAt: new Date().toISOString()
    };

    const tokenStoreKey = YT_OAUTH_CONSTANTS.PENDING_TOKEN_KEY_PREFIX + adminId;
    PropertiesService.getScriptProperties().setProperty(tokenStoreKey, JSON.stringify(storePayload));

    // Also persist a canonical pending token key for Stage 3B retrieval
    PropertiesService.getScriptProperties().setProperty("YT_PENDING_TOKEN_LATEST", JSON.stringify(storePayload));

    if (isJsonRequest) {
      return success({
        adminId: adminId,
        hasRefreshToken: Boolean(tokens.refreshToken),
        scope: tokens.scope,
        expiresIn: tokens.expiresIn
      }, "YouTube OAuth tokens successfully obtained and stored server-side");
    }

    return renderOAuthHtmlResponse(
      true,
      "YouTube Channel Authorized",
      "Google OAuth 2.0 authorization succeeded. Tokens have been securely stored on the server. You may return to the Ekka1km Admin Live Center."
    );

  } catch (err) {
    if (isJsonRequest) return exception(err);
    return renderOAuthHtmlResponse(false, "Server Error", String(err.message || err));
  }
}

/**
 * ============================================================
 * ADMIN ROUTE: GET YOUTUBE OAUTH STATUS
 * ?action=adminyoutubeoauthstatus&session=TOKEN
 * Diagnostic verification for admins.
 * Verifies credentials presence and active pending tokens
 * without exposing client secret or tokens.
 * ============================================================
 */
function getYouTubeOAuthStatus(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) {
      return admin.response;
    }

    const properties = PropertiesService.getScriptProperties();
    const clientId = (properties.getProperty("YOUTUBE_CLIENT_ID") || "").trim();
    const clientSecret = (properties.getProperty("YOUTUBE_CLIENT_SECRET") || "").trim();
    const redirectUri = getYouTubeRedirectUri();

    // Mask client ID for safety (e.g., "1234...apps.googleusercontent.com")
    let maskedClientId = "";
    if (clientId.length > 12) {
      maskedClientId = clientId.substring(0, 6) + "..." + clientId.substring(clientId.length - 12);
    } else if (clientId.length > 0) {
      maskedClientId = "***configured***";
    }

    // Check if pending token exists for this admin
    const pendingKey = YT_OAUTH_CONSTANTS.PENDING_TOKEN_KEY_PREFIX + admin.adminId;
    const pendingRaw = properties.getProperty(pendingKey);
    let pendingInfo = null;

    if (pendingRaw) {
      try {
        const parsed = JSON.parse(pendingRaw);
        pendingInfo = {
          hasAccessToken: Boolean(parsed.accessToken),
          hasRefreshToken: Boolean(parsed.refreshToken),
          savedAt: parsed.savedAt || "",
          isExpired: Date.now() > Number(parsed.expiresAt || 0)
        };
      } catch (e) {
        pendingInfo = { error: "Corrupted pending token data" };
      }
    }

    return success({
      configured: Boolean(clientId && clientSecret),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      maskedClientId: maskedClientId,
      redirectUri: redirectUri,
      requiredScope: YT_OAUTH_CONSTANTS.REQUIRED_SCOPE,
      pendingToken: pendingInfo
    }, "YouTube OAuth configuration status checked");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * HTML RESPONSE RENDERER
 * Generates a clean, styled, self-closing response page for browser redirects.
 * Does not expose any secrets or tokens.
 * ============================================================
 */
function renderOAuthHtmlResponse(isSuccess, title, message) {
  const icon = isSuccess ? "&#x2705;" : "&#x26A0;&#xFE0F;";
  const headerColor = isSuccess ? "#15803d" : "#b91c1c";
  const badgeBg = isSuccess ? "#dcfce7" : "#fee2e2";
  const badgeColor = isSuccess ? "#166534" : "#991b1b";

  const safeTitle = (title || "").replace(/[<>&"]/g, function(c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
  });
  const safeMessage = (message || "").replace(/[<>&"]/g, function(c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
  });

  const html = '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + safeTitle + ' - Ekka1km</title>' +
    '<style>' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }' +
    '.card { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 480px; width: 100%; padding: 32px; text-align: center; border: 1px solid #e2e8f0; }' +
    '.icon { font-size: 48px; margin-bottom: 16px; }' +
    'h2 { margin: 0 0 12px 0; color: ' + headerColor + '; font-size: 22px; font-weight: 700; }' +
    'p { margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5; }' +
    '.badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ' + badgeBg + '; color: ' + badgeColor + '; margin-bottom: 24px; }' +
    '.btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; cursor: pointer; border: none; }' +
    '.btn:hover { background: #1d4ed8; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '  <div class="icon">' + icon + '</div>' +
    '  <h2>' + safeTitle + '</h2>' +
    '  <div class="badge">' + (isSuccess ? "OAUTH SUCCESS" : "OAUTH NOTICE") + '</div>' +
    '  <p>' + safeMessage + '</p>' +
    '  <button class="btn" onclick="if(window.opener){window.close();}else{history.back();}">Close Window</button>' +
    '</div>' +
    '<script>' +
    'try {' +
    '  if (window.opener) {' +
    '    window.opener.postMessage({ type: "EKKA_YOUTUBE_OAUTH", success: ' + (isSuccess ? 'true' : 'false') + ' }, "*");' +
    '  }' +
    '} catch(e){}' +
    '</script>' +
    '</body></html>';

  if (typeof HtmlService !== "undefined" && HtmlService.createHtmlOutput) {
    return HtmlService.createHtmlOutput(html)
      .setTitle(safeTitle + " - Ekka1km")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Fallback if HtmlService is not present
  return output({
    success: isSuccess,
    title: title,
    message: message
  });
}

