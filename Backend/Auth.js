/**
 * ============================================================
 * EKKA1KM BACKEND
 * Auth.js
 * V5.9.0 - Login & Register System
 * ============================================================
 */

function loginUser(e) {
  try {
    const mobile =
      (e.parameter.mobile || "").trim();

    const password =
      (e.parameter.password || "").trim();

    if (!mobile || !password) {
      return error(
        "Mobile and Password required"
      );
    }

    const sheet = getSheet(
      CONFIG.SHEETS.USERS
    );

    const data =
      sheet.getDataRange().getValues();

    const headers = data[0];

    const mobileCol =
      headers.indexOf("Mobile");

    const passwordCol =
      headers.indexOf("Password");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (
        String(row[mobileCol]).trim() === mobile &&
        String(row[passwordCol]).trim() === password
      ) {
        const user = {};

        headers.forEach((h, index) => {
          user[h] = row[index];
        });

        // update last login
        const lastLoginCol =
          headers.indexOf("LastLogin");

        if (lastLoginCol >= 0) {
          sheet
            .getRange(
              i + 1,
              lastLoginCol + 1
            )
            .setValue(new Date());
        }

        return success({
          session: createUserSession(user.UserID),
          user: buildPublicUser(user)
        }, "Login Successful");
      }
    }

    return error(
      "Invalid Mobile or Password"
    );

  } catch (err) {
    return exception(err);
  }
}



function registerUser(e) {
  try {

    const fullName =
      (e.parameter.fullName || "").trim();

    const mobile =
      (e.parameter.mobile || "").trim();

    const email =
      (e.parameter.email || "").trim();

    const password =
      (e.parameter.password || "").trim();

    if (
      !fullName ||
      !mobile ||
      !password
    ) {
      return error(
        "Full Name, Mobile and Password required"
      );
    }

    const sheet = getSheet(
      CONFIG.SHEETS.USERS
    );

    const data =
      sheet.getDataRange().getValues();

    const headers = data[0];

    const mobileCol =
      headers.indexOf("Mobile");

    // duplicate mobile check
    for (let i = 1; i < data.length; i++) {
      if (
        String(
          data[i][mobileCol]
        ).trim() === mobile
      ) {
        return error(
          "Mobile already registered"
        );
      }
    }

    const userId =
      "U" +
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyyMMddHHmmss"
      );

    const walletId =
      "W" +
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyyMMddHHmmss"
      );

    const row = [];

    headers.forEach(h => {

      switch (h) {

        case "UserID":
          row.push(userId);
          break;

        case "FullName":
          row.push(fullName);
          break;

        case "Mobile":
          row.push(mobile);
          break;

        case "Email":
          row.push(email);
          break;

        case "Password":
          row.push(password);
          break;

        case "WalletID":
          row.push(walletId);
          break;

        case "Role":
          row.push(
            CONFIG.DEFAULT_ROLE
          );
          break;

        case "Status":
          row.push(
            CONFIG.DEFAULT_STATUS
          );
          break;

        case "CreatedDate":
          row.push(
            new Date()
          );
          break;

        case "LastLogin":
          row.push(
            new Date()
          );
          break;

        case "TotalCoins":
          row.push(0);
          break;

        case "TotalEarned":
          row.push(0);
          break;

        case "TotalSpent":
          row.push(0);
          break;

        default:
          row.push("");
      }

    });

    sheet.appendRow(row);

    return success(
      {
        userId: userId,
        walletId: walletId
      },
      "Registration Successful"
    );

  } catch (err) {
    return exception(err);
  }
}



function loginByMobile(e) {
  try {
    const mobile = (e.parameter.mobile || "").trim();

    if (!mobile) {
      return error("Mobile number is required");
    }

    return error("OTP verification is required. Use verifyotp.");

  } catch (err) {
    return exception(err);
  }
}

function logoutUser(e) {
  const token = (e && e.parameter && e.parameter.session) || "";
  if (token) PropertiesService.getScriptProperties().deleteProperty("user_session_" + token);
  return success(
    {},
    "Logout Successful"
  );
}

/** User sessions are server-held; client userId is never an authority. */
function createUserSession(userId) {
  const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty("user_session_" + token, JSON.stringify({
    userId: String(userId),
    expiresAt: Date.now() + (CONFIG.SESSION_EXPIRY_HOURS || 24) * 60 * 60 * 1000
  }));
  return token;
}

function requireUserSession(e) {
  const token = String((e && e.parameter && e.parameter.session) || "").trim();
  if (!token) return { valid: false, response: error("Authentication required") };
  const key = "user_session_" + token;
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return { valid: false, response: error("Invalid or expired session") };
  try {
    const session = JSON.parse(raw);
    if (!session.userId || Date.now() > Number(session.expiresAt || 0)) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      return { valid: false, response: error("Invalid or expired session") };
    }
    return { valid: true, userId: String(session.userId) };
  } catch (err) { return { valid: false, response: error("Invalid session") }; }
}

function requireAuthenticatedUser(e) {
  const session = requireUserSession(e);
  if (!session.valid) return session;
  // Detect, rather than silently accept, an attempt to impersonate another user.
  const claimed = (e.parameter.userId || e.parameter.UserID || e.parameter.ownerUserId || e.parameter.OwnerUserID || "");
  if (claimed && String(claimed) !== session.userId) return { valid: false, response: error("Forbidden: user identity mismatch") };
  e.parameter.userId = session.userId;
  e.parameter.UserID = session.userId;
  e.parameter.ownerUserId = session.userId;
  e.parameter.OwnerUserID = session.userId;
  return session;
}

function buildPublicUser(user) {
  const result = {};
  const sensitive = { Password: true, password: true, OTP: true, AuthenticatorSecret: true, RecoveryCodes: true };
  Object.keys(user || {}).forEach(function(key) { if (!sensitive[key]) result[key] = user[key]; });
  return result;
}

