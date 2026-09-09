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
  CHANNELS_ENDPOINT: "https://www.googleapis.com/youtube/v3/channels",
  REQUIRED_SCOPE: "https://www.googleapis.com/auth/youtube.force-ssl",
  STATE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  STATE_KEY_PREFIX: "yt_state_",
  PENDING_TOKEN_KEY_PREFIX: "YT_PENDING_TOKEN_",
  TOKEN_STORAGE_PREFIX: "YT_AUTH_",
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
 * Resolves the OAuth redirect URI strictly:
 * 1. Explicit ScriptProperty "YOUTUBE_REDIRECT_URI" if set (non-empty, starting with http, never /dev)
 * 2. Otherwise authoritative registered canonical deployment /exec URL.
 * Dynamic getService().getUrl() is intentionally avoided to prevent /dev leakage.
 */
function getYouTubeRedirectUri() {
  const explicitUri = PropertiesService.getScriptProperties().getProperty("YOUTUBE_REDIRECT_URI");
  if (explicitUri && explicitUri.trim()) {
    const cleanUri = explicitUri.trim();
    if (cleanUri.indexOf("/dev") === -1 && cleanUri.indexOf("http") === 0) {
      return cleanUri;
    }
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
 * Validates and atomically consumes (deletes) the state token using LockService
 * to guarantee strict one-time use and eliminate replay attacks.
 * Returns { valid: true, adminId } or { valid: false, message }.
 */
function validateAndConsumeYouTubeOAuthState(state) {
  if (!state || typeof state !== "string" || state.trim().length === 0) {
    return { valid: false, message: "Missing or invalid OAuth state parameter" };
  }

  const cleanState = state.trim();
  const storeKey = YT_OAUTH_CONSTANTS.STATE_KEY_PREFIX + cleanState;
  const properties = PropertiesService.getScriptProperties();

  // Acquire script lock for atomic consumption
  const lock = (typeof LockService !== "undefined" && LockService.getScriptLock) ? LockService.getScriptLock() : null;
  if (lock) {
    try {
      lock.waitLock(10000);
    } catch (lockErr) {
      return { valid: false, message: "Lock acquisition timeout during state validation" };
    }
  }

  try {
    const raw = properties.getProperty(storeKey);
    if (!raw) {
      return { valid: false, message: "Invalid or expired OAuth state" };
    }

    // Atomically delete property for strict one-time use
    properties.deleteProperty(storeKey);

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
  } finally {
    if (lock) {
      lock.releaseLock();
    }
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
 * STAGE 3B: YOUTUBE CHANNEL INFO FETCH
 * Queries YouTube Data API v3 for the authenticated user's channel identity.
 * GET https://www.googleapis.com/youtube/v3/channels?part=snippet,status&mine=true
 * ============================================================
 */
function fetchYouTubeChannelInfo(accessToken) {
  if (!accessToken) {
    return { success: false, error: "Access token is required to fetch channel info" };
  }

  const url = YT_OAUTH_CONSTANTS.CHANNELS_ENDPOINT + "?part=snippet,status&mine=true";
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "Authorization": "Bearer " + accessToken
    },
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  let json = {};
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    return { success: false, error: "Non-JSON response from YouTube API" };
  }

  if (statusCode !== 200) {
    const errMessage = (json.error && json.error.message) || ("YouTube API HTTP " + statusCode);
    return { success: false, error: "YouTube API error: " + errMessage };
  }

  const items = json.items || [];
  if (items.length === 0) {
    return {
      success: false,
      noChannel: true,
      error: "Google account authorized, but no YouTube channel exists for this account. Please create a channel on YouTube first."
    };
  }

  const item = items[0];
  const snippet = item.snippet || {};
  const thumbnails = snippet.thumbnails || {};
  const thumbnailUrl = (thumbnails.medium && thumbnails.medium.url) ||
                       (thumbnails.default && thumbnails.default.url) ||
                       (thumbnails.high && thumbnails.high.url) || "";

  return {
    success: true,
    channel: {
      channelId: String(item.id || "").trim(),
      channelTitle: String(snippet.title || "YouTube Channel").trim(),
      channelCustomUrl: String(snippet.customUrl || "").trim(),
      channelThumbnail: String(thumbnailUrl).trim()
    }
  };
}

/**
 * ============================================================
 * STAGE 3B: OAUTH CALLBACK HANDLER
 * Handles redirect from Google OAuth consent screen:
 * - Success: /exec?code=...&state=...
 * - Denial/Error: /exec?error=...&state=...
 * - Explicit Action: ?action=youtubeoauthcallback&code=...&state=...
 *
 * Validates state, exchanges code for tokens, resolves channel identity,
 * upserts LiveChannels, stores tokens strictly under YT_AUTH_<channelId>,
 * cleans up temporary pending tokens, and notifies admin opener window.
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

    // 3. Atomically validate and consume state with LockService
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

    // 6. Exchange code for tokens server-side
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

    // 7. Stage 3B: Query YouTube Data API v3 for channel identity
    const channelResult = fetchYouTubeChannelInfo(tokens.accessToken);
    if (!channelResult.success) {
      if (channelResult.noChannel) {
        if (isJsonRequest) return error(channelResult.error);
        return renderOAuthHtmlResponse(false, "No Channel Found", channelResult.error);
      }
      if (isJsonRequest) return error(channelResult.error);
      return renderOAuthHtmlResponse(false, "Channel Discovery Failed", channelResult.error);
    }

    const ch = channelResult.channel;
    const channelId = ch.channelId;
    const tokenKey = YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX + channelId;
    const properties = PropertiesService.getScriptProperties();

    // Preserve existing refresh token if Google omitted it on re-authorization
    const existingRaw = properties.getProperty(tokenKey);
    let existingTokenData = null;
    if (existingRaw) {
      try {
        existingTokenData = JSON.parse(existingRaw);
      } catch (parseErr) {}
    }

    const finalRefreshToken = (tokens.refreshToken && tokens.refreshToken.trim()) ||
      (existingTokenData && existingTokenData.refreshToken) || "";

    const nowIso = new Date().toISOString();
    const tokenExpiresAtMs = Date.now() + (tokens.expiresIn * 1000);
    const tokenExpiresAtIso = new Date(tokenExpiresAtMs).toISOString();

    // 8. Store tokens strictly server-side under YT_AUTH_<channelId>
    const secureTokenPayload = {
      channelId: channelId,
      refreshToken: finalRefreshToken,
      accessToken: tokens.accessToken,
      tokenExpiresAt: tokenExpiresAtMs,
      scope: tokens.scope || YT_OAUTH_CONSTANTS.REQUIRED_SCOPE,
      updatedAt: nowIso
    };
    properties.setProperty(tokenKey, JSON.stringify(secureTokenPayload));

    // 9. Upsert LiveChannels row (creates new or updates existing without duplicates)
    ensureLiveChannelsSheet();
    const existingRow = findLiveChannelById(channelId);
    const channelRow = {
      YouTubeChannelID: channelId,
      ChannelTitle: ch.channelTitle,
      ChannelCustomUrl: ch.channelCustomUrl,
      ChannelThumbnail: ch.channelThumbnail,
      OAuthStatus: "Active",
      Status: "Active",
      ConnectedByAdminID: adminId,
      ConnectedAt: (existingRow && existingRow.ConnectedAt) ? existingRow.ConnectedAt : nowIso,
      UpdatedAt: nowIso,
      LastValidatedAt: nowIso,
      TokenExpiresAt: tokenExpiresAtIso,
      ScopeGranted: tokens.scope || YT_OAUTH_CONSTANTS.REQUIRED_SCOPE,
      RevokedAt: "",
      DisconnectReason: ""
    };
    upsertLiveChannel(channelRow);

    // 10. Clean up temporary Stage 3A pending tokens
    properties.deleteProperty(YT_OAUTH_CONSTANTS.PENDING_TOKEN_KEY_PREFIX + adminId);
    properties.deleteProperty("YT_PENDING_TOKEN_LATEST");

    if (isJsonRequest) {
      return success({
        channelId: channelId,
        channelTitle: ch.channelTitle,
        channelCustomUrl: ch.channelCustomUrl,
        channelThumbnail: ch.channelThumbnail,
        oAuthStatus: "Active",
        status: "Active",
        connectedByAdminId: adminId
      }, "YouTube channel '" + ch.channelTitle + "' successfully connected");
    }

    return renderOAuthHtmlResponse(
      true,
      "YouTube Channel Connected",
      "Channel '" + ch.channelTitle + "' (" + (ch.channelCustomUrl || channelId) + ") is now connected and authorized for Ekka1km Live. You may return to the Admin Live Center.",
      { channelId: channelId, channelTitle: ch.channelTitle }
    );

  } catch (err) {
    if (isJsonRequest) return exception(err);
    return renderOAuthHtmlResponse(false, "Server Error", String(err.message || err));
  }
}

/**
 * ============================================================
 * STAGE 3C: SERVER-SIDE ACCESS TOKEN REFRESH
 * Refreshes the YouTube access token using the stored refresh token.
 * Updates ScriptProperties and LiveChannels metadata.
 * ============================================================
 */
function refreshYouTubeAccessToken(channelId) {
  if (!channelId) {
    return { success: false, error: "Channel ID required for token refresh" };
  }

  const tokenKey = YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX + channelId;
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(tokenKey);

  if (!raw) {
    updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
      OAuthStatus: "Revoked",
      DisconnectReason: "No token record in storage",
      UpdatedAt: new Date().toISOString()
    });
    return { success: false, error: "No stored token data for channel " + channelId };
  }

  let tokenData;
  try {
    tokenData = JSON.parse(raw);
  } catch (e) {
    return { success: false, error: "Corrupted token data in storage" };
  }

  if (!tokenData.refreshToken) {
    updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
      OAuthStatus: "Revoked",
      DisconnectReason: "Missing refresh token",
      UpdatedAt: new Date().toISOString()
    });
    return { success: false, error: "No refresh token available for channel " + channelId };
  }

  let settings;
  try {
    settings = getYouTubeOAuthSettings();
  } catch (err) {
    return { success: false, error: err.message };
  }

  const payload = {
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: tokenData.refreshToken,
    grant_type: "refresh_token"
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

  const nowIso = new Date().toISOString();

  if (statusCode !== 200) {
    const errorCode = json.error || ("HTTP_" + statusCode);
    const errDesc = json.error_description ? (errorCode + ": " + json.error_description) : errorCode;
    // If invalid_grant or revoked, Google authorization was revoked by account owner
    updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
      OAuthStatus: "Revoked",
      DisconnectReason: "Google token refresh failed: " + errDesc,
      UpdatedAt: nowIso
    });
    return { success: false, error: "Google token refresh failed: " + errDesc };
  }

  if (!json.access_token) {
    return { success: false, error: "Google token endpoint returned no access token" };
  }

  const expiresIn = json.expires_in || 3600;
  const tokenExpiresAtMs = Date.now() + (expiresIn * 1000);
  const tokenExpiresAtIso = new Date(tokenExpiresAtMs).toISOString();

  // Update ScriptProperties
  tokenData.accessToken = json.access_token;
  tokenData.tokenExpiresAt = tokenExpiresAtMs;
  tokenData.updatedAt = nowIso;
  properties.setProperty(tokenKey, JSON.stringify(tokenData));

  // Update LiveChannels metadata
  updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
    OAuthStatus: "Active",
    TokenExpiresAt: tokenExpiresAtIso,
    LastValidatedAt: nowIso,
    UpdatedAt: nowIso,
    DisconnectReason: ""
  });

  return {
    success: true,
    accessToken: json.access_token,
    expiresIn: expiresIn,
    tokenExpiresAt: tokenExpiresAtIso
  };
}

/**
 * ============================================================
 * STAGE 3C: ADMIN ROUTE - VALIDATE YOUTUBE CHANNEL HEALTH
 * ?action=adminvalidateyoutubechannel&channelId=UC...&session=TOKEN
 * Checks token expiration, refreshes if near expiry (< 5 min),
 * performs lightweight authenticated YouTube check, updates LastValidatedAt.
 * ============================================================
 */
function adminValidateYouTubeChannel(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const channelId = String((e && e.parameter && e.parameter.channelId) || "").trim();
    if (!channelId) return error("channelId parameter is required");

    const channel = findLiveChannelById(channelId);
    if (!channel) return error("Channel not found in LiveChannels");

    const tokenKey = YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX + channelId;
    const properties = PropertiesService.getScriptProperties();
    const raw = properties.getProperty(tokenKey);

    if (!raw) {
      updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
        OAuthStatus: "Revoked",
        DisconnectReason: "No stored token record",
        UpdatedAt: new Date().toISOString()
      });
      return error("No OAuth tokens found for this channel. Reconnection required.");
    }

    let tokenData;
    try {
      tokenData = JSON.parse(raw);
    } catch (e) {
      return error("Corrupted token record");
    }

    let accessToken = tokenData.accessToken || "";
    const now = Date.now();
    const expiresAt = Number(tokenData.tokenExpiresAt || 0);

    // If token is expired or within 5 minutes of expiring, refresh now
    if (!accessToken || (expiresAt - now < 5 * 60 * 1000)) {
      const refreshResult = refreshYouTubeAccessToken(channelId);
      if (!refreshResult.success) {
        return error("Token refresh failed: " + refreshResult.error);
      }
      accessToken = refreshResult.accessToken;
    }

    // Perform lightweight authenticated validation against YouTube Data API
    const url = YT_OAUTH_CONSTANTS.CHANNELS_ENDPOINT + "?part=id&id=" + encodeURIComponent(channelId);
    const apiRes = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + accessToken },
      muteHttpExceptions: true
    });

    const statusCode = apiRes.getResponseCode();
    const nowIso = new Date().toISOString();

    if (statusCode === 200) {
      updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
        OAuthStatus: "Active",
        LastValidatedAt: nowIso,
        UpdatedAt: nowIso
      });

      return success({
        channelId: channelId,
        channelTitle: channel.ChannelTitle,
        oAuthStatus: "Active",
        status: channel.Status,
        lastValidatedAt: nowIso
      }, "YouTube channel health validated successfully");
    } else {
      updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
        OAuthStatus: "Error",
        DisconnectReason: "YouTube API check HTTP " + statusCode,
        UpdatedAt: nowIso
      });

      return error("YouTube API validation failed (HTTP " + statusCode + ")");
    }

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * STAGE 3C: ADMIN ROUTE - DISCONNECT / REVOKE YOUTUBE CHANNEL
 * ?action=admindisconnectyoutubechannel&channelId=UC...&session=TOKEN
 * Revokes authorization with Google, deletes channel token storage,
 * and marks LiveChannels record disconnected/revoked with reason.
 * ============================================================
 */
function adminDisconnectYouTubeChannel(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const channelId = String((e && e.parameter && e.parameter.channelId) || "").trim();
    if (!channelId) return error("channelId parameter is required");

    const channel = findLiveChannelById(channelId);
    if (!channel) return error("Channel not found in LiveChannels");

    const tokenKey = YT_OAUTH_CONSTANTS.TOKEN_STORAGE_PREFIX + channelId;
    const properties = PropertiesService.getScriptProperties();
    const raw = properties.getProperty(tokenKey);

    if (raw) {
      try {
        const tokenData = JSON.parse(raw);
        const tokenToRevoke = tokenData.refreshToken || tokenData.accessToken;
        if (tokenToRevoke) {
          UrlFetchApp.fetch(YT_OAUTH_CONSTANTS.REVOKE_ENDPOINT + "?token=" + encodeURIComponent(tokenToRevoke), {
            method: "post",
            contentType: "application/x-www-form-urlencoded",
            muteHttpExceptions: true
          });
        }
      } catch (e) {
        // Continue even if remote revoke fails
      }
      properties.deleteProperty(tokenKey);
    }

    const nowIso = new Date().toISOString();
    updateRow(CONFIG.SHEETS.LIVE_CHANNELS || "LiveChannels", "YouTubeChannelID", channelId, {
      OAuthStatus: "Revoked",
      Status: "Disconnected",
      RevokedAt: nowIso,
      DisconnectReason: "Disconnected by admin " + (admin.adminId || ""),
      UpdatedAt: nowIso
    });

    return success({
      channelId: channelId,
      status: "Disconnected",
      oAuthStatus: "Revoked"
    }, "YouTube channel disconnected and authorization revoked successfully");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * STAGE 3D: ADMIN ROUTE - LIST CONNECTED YOUTUBE CHANNELS
 * ?action=adminyoutubechannels&session=TOKEN
 * Returns sanitized channel list for the Admin Live Center.
 * Strictly NEVER includes access_token, refresh_token, or client secret.
 * ============================================================
 */
function getAdminYouTubeChannels(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    ensureLiveChannelsSheet();
    const rows = getAllLiveChannels();

    const sanitizedChannels = [];
    const summary = {
      totalChannels: 0,
      activeHealthy: 0,
      needsAttention: 0,
      disconnected: 0
    };

    rows.forEach(function(r) {
      if (!r.YouTubeChannelID) return;

      const oAuthStatus = String(r.OAuthStatus || "Unknown");
      const status = String(r.Status || "Active");

      summary.totalChannels++;
      if (status.toLowerCase() === "disconnected" || oAuthStatus.toLowerCase() === "revoked") {
        summary.disconnected++;
      } else if (oAuthStatus.toLowerCase() === "active") {
        summary.activeHealthy++;
      } else {
        summary.needsAttention++;
      }

      sanitizedChannels.push({
        channelId: String(r.YouTubeChannelID || ""),
        channelTitle: String(r.ChannelTitle || "Untitled Channel"),
        channelCustomUrl: String(r.ChannelCustomUrl || ""),
        channelThumbnail: String(r.ChannelThumbnail || ""),
        oAuthStatus: oAuthStatus,
        status: status,
        connectedByAdminId: String(r.ConnectedByAdminID || ""),
        connectedAt: String(r.ConnectedAt || ""),
        updatedAt: String(r.UpdatedAt || ""),
        lastValidatedAt: String(r.LastValidatedAt || ""),
        tokenExpiresAt: String(r.TokenExpiresAt || ""),
        scopeGranted: String(r.ScopeGranted || ""),
        revokedAt: String(r.RevokedAt || ""),
        disconnectReason: String(r.DisconnectReason || "")
      });
    });

    return success({
      summary: summary,
      channels: sanitizedChannels
    }, "YouTube channels retrieved");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * STAGE 3E: ADMIN ALLOCATION ROUTES
 * Many-to-many junction management between Camera Persons & Channels
 * ============================================================
 */

function adminListLiveAllocations(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    ensureLiveAllocationsSheet();
    const rows = getAllLiveAllocations();
    const channels = getAllLiveChannels();
    const channelMap = {};
    channels.forEach(function(c) {
      if (c.YouTubeChannelID) channelMap[c.YouTubeChannelID] = c;
    });

    const enriched = [];
    const summary = {
      totalAllocations: 0,
      activeAllocations: 0,
      revokedAllocations: 0
    };

    rows.forEach(function(r) {
      if (!r.AllocationID) return;
      const status = String(r.Status || "Active");
      summary.totalAllocations++;
      if (status.toLowerCase() === "active") {
        summary.activeAllocations++;
      } else {
        summary.revokedAllocations++;
      }

      const ch = channelMap[r.YouTubeChannelID] || {};

      enriched.push({
        allocationId: String(r.AllocationID || ""),
        userId: String(r.UserID || ""),
        cameraPersonName: String(r.CameraPersonName || ""),
        channelId: String(r.YouTubeChannelID || ""),
        channelTitle: String(ch.ChannelTitle || r.YouTubeChannelID || ""),
        channelCustomUrl: String(ch.ChannelCustomUrl || ""),
        channelThumbnail: String(ch.ChannelThumbnail || ""),
        status: status,
        allocatedByAdminId: String(r.AllocatedByAdminID || ""),
        allocatedAt: String(r.AllocatedAt || ""),
        revokedAt: String(r.RevokedAt || ""),
        notes: String(r.Notes || "")
      });
    });

    return success({
      summary: summary,
      allocations: enriched
    }, "Live allocations retrieved");

  } catch (err) {
    return exception(err);
  }
}

function adminAllocateLiveChannel(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const p = (e && e.parameter) || {};
    const userId = String(p.userId || "").trim();
    const channelId = String(p.channelId || "").trim();
    const notes = String(p.notes || "").trim();

    if (!userId) return error("userId is required");
    if (!channelId) return error("channelId is required");

    // 1. Validate user exists
    const user = getRowById(CONFIG.SHEETS.USERS, "UserID", userId);
    if (!user) return error("User not found: " + userId);

    // 2. Validate channel exists and is active & authorized
    const channel = findLiveChannelById(channelId);
    if (!channel) return error("YouTube channel not found: " + channelId);

    const channelStatus = String(channel.Status || "").toLowerCase();
    const oauthStatus = String(channel.OAuthStatus || "").toLowerCase();

    if (channelStatus !== "active" || oauthStatus !== "active") {
      return error("Cannot allocate channel: Channel status is " + (channel.Status || "inactive") + " (OAuth: " + (channel.OAuthStatus || "Unknown") + ")");
    }

    // 3. Prevent duplicate active allocation
    ensureLiveAllocationsSheet();
    const existing = getAllLiveAllocations();
    const isDuplicate = existing.some(function(r) {
      return String(r.UserID || "").trim() === userId &&
             String(r.YouTubeChannelID || "").trim() === channelId &&
             String(r.Status || "").toLowerCase() === "active";
    });

    if (isDuplicate) {
      return error("This camera person is already actively allocated to this channel");
    }

    // 4. Generate Allocation ID and save
    const allocationId = "ALC_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "_" + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();
    const userName = String(user.FullName || user.Name || userId).trim();

    const allocationRecord = {
      AllocationID: allocationId,
      UserID: userId,
      CameraPersonName: userName,
      YouTubeChannelID: channelId,
      Status: "Active",
      AllocatedByAdminID: admin.adminId,
      AllocatedAt: nowIso,
      RevokedAt: "",
      Notes: notes
    };

    createLiveAllocation(allocationRecord);

    return success({
      allocationId: allocationId,
      userId: userId,
      cameraPersonName: userName,
      channelId: channelId,
      channelTitle: channel.ChannelTitle,
      status: "Active",
      allocatedAt: nowIso
    }, "Camera person successfully allocated to YouTube channel");

  } catch (err) {
    return exception(err);
  }
}

function adminRevokeLiveAllocation(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const allocationId = String((e && e.parameter && e.parameter.allocationId) || "").trim();
    if (!allocationId) return error("allocationId is required");

    const alloc = findLiveAllocationById(allocationId);
    if (!alloc) return error("Allocation record not found");

    if (String(alloc.Status || "").toLowerCase() === "revoked") {
      return error("Allocation is already revoked");
    }

    const nowIso = new Date().toISOString();
    const updated = updateLiveAllocation(allocationId, {
      Status: "Revoked",
      RevokedAt: nowIso
    });

    if (!updated) {
      return error("Failed to update allocation record");
    }

    return success({
      allocationId: allocationId,
      status: "Revoked",
      revokedAt: nowIso
    }, "Allocation successfully revoked");

  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * STAGE 3F: AUTHORIZED CHANNEL DISCOVERY FOR CAMERA PERSONS
 * ?action=myauthorizedchannels&session=USER_TOKEN
 * Derives user identity strictly from server-held session.
 * Joins LiveAllocations with LiveChannels.
 * Excludes disconnected/revoked channels.
 * Returns only safe channel metadata (no tokens/secrets/stream keys).
 * ============================================================
 */
function getMyAuthorizedLiveChannels(e) {
  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const userId = String(auth.userId).trim();
    if (!userId) return error("Unable to identify authenticated user");

    ensureLiveAllocationsSheet();
    ensureLiveChannelsSheet();

    const activeAllocations = getActiveAllocationsForUser(userId);
    const authorizedChannels = [];
    const seenChannels = {};

    activeAllocations.forEach(function(alloc) {
      const channelId = String(alloc.YouTubeChannelID || "").trim();
      if (!channelId || seenChannels[channelId]) return;

      const channel = findLiveChannelById(channelId);
      if (!channel) return;

      const channelStatus = String(channel.Status || "").toLowerCase();
      const oauthStatus = String(channel.OAuthStatus || "").toLowerCase();

      // Exclude disconnected, revoked, or inactive channels
      if (channelStatus === "active" && oauthStatus === "active") {
        seenChannels[channelId] = true;
        authorizedChannels.push({
          channelId: channel.YouTubeChannelID,
          channelTitle: channel.ChannelTitle || "YouTube Channel",
          channelCustomUrl: channel.ChannelCustomUrl || "",
          channelThumbnail: channel.ChannelThumbnail || ""
        });
      }
    });

    return success({
      userId: userId,
      count: authorizedChannels.length,
      channels: authorizedChannels
    }, "Authorized channels retrieved successfully");

  } catch (err) {
    return exception(err);
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

    let connectedCount = 0;
    try {
      connectedCount = getAllLiveChannels().length;
    } catch (e) {}

    return success({
      configured: Boolean(clientId && clientSecret),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      maskedClientId: maskedClientId,
      redirectUri: redirectUri,
      requiredScope: YT_OAUTH_CONSTANTS.REQUIRED_SCOPE,
      pendingToken: pendingInfo,
      connectedChannelsCount: connectedCount
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
function renderOAuthHtmlResponse(isSuccess, title, message, extraData) {
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

  const payloadStr = JSON.stringify(Object.assign({
    type: "EKKA_YOUTUBE_OAUTH",
    success: isSuccess ? true : false
  }, extraData || {}));

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
    '    window.opener.postMessage(' + payloadStr + ', "*");' +
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


