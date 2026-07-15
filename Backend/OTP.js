/**
 * ============================================================
 * EKKA1KM BACKEND
 * OTP.js
 * V5.9.0 - OTP Login System (LOCAL + MSG91 Placeholder)
 * ============================================================
 */


/**
 * ============================================================
 * SEND OTP
 * ?action=sendotp&mobile=9876543210
 * ============================================================
 */

function sendOtp(e) {
  try {

    const mobile =
      (e.parameter.mobile || "").trim();

    if (!mobile) {
      return error(
        "Mobile number is required"
      );
    }

    if (mobile.length < 10) {
      return error(
        "Invalid mobile number"
      );
    }

    const provider =
      CONFIG.OTP_PROVIDER || "LOCAL";

    if (provider === "LOCAL") {
      return localSendOtp(mobile);
    }

    if (provider === "MSG91") {
      return msg91SendOtp(mobile);
    }

    return error(
      "Unknown OTP provider: " + provider
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * VERIFY OTP
 * ?action=verifyotp&mobile=9876543210&otp=123456
 * ============================================================
 */

function verifyOtp(e) {
  try {

    const mobile =
      (e.parameter.mobile || "").trim();

    const otp =
      (e.parameter.otp || "").trim();

    if (!mobile || !otp) {
      return error(
        "Mobile and OTP are required"
      );
    }

    const provider =
      CONFIG.OTP_PROVIDER || "LOCAL";

    if (provider === "LOCAL") {
      return localVerifyOtp(mobile, otp);
    }

    if (provider === "MSG91") {
      return msg91VerifyOtp(mobile, otp);
    }

    return error(
      "Unknown OTP provider: " + provider
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * LOCAL OTP PROVIDER
 * ============================================================
 */

function localSendOtp(mobile) {

  // Generate 6-digit OTP
  const otp =
    String(
      Math.floor(
        100000 +
        Math.random() * 900000
      )
    );

  // Store in ScriptProperties with expiry
  const storeKey = "otp_" + mobile;

  const payload = {
    mobile: mobile,
    otp: otp,
    attempts: 0,
    createdAt: new Date().getTime(),
    expiresAt:
      new Date().getTime() +
      CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000
  };

  PropertiesService
    .getScriptProperties()
    .setProperty(
      storeKey,
      JSON.stringify(payload)
    );

  // Log OTP for debugging in dev mode
  console.log(
    "OTP for " + mobile + ": " + otp
  );

  return success(
    {
      mobile: mobile,
      message:
        "OTP sent successfully",
      // Never send OTP in production!
      // This is for LOCAL dev only:
      devOtp: otp
    },
    "OTP Sent Successfully"
  );
}


function localVerifyOtp(mobile, otp) {

  const storeKey = "otp_" + mobile;

  const stored =
    PropertiesService
      .getScriptProperties()
      .getProperty(storeKey);

  if (!stored) {
    return error(
      "No OTP found. Please request a new OTP."
    );
  }

  let payload;

  try {
    payload = JSON.parse(stored);
  } catch (err) {
    return error(
      "Invalid OTP data. Please request a new OTP."
    );
  }

  // Check expiry
  const now = new Date().getTime();

  if (now > payload.expiresAt) {
    // Cleanup expired OTP
    PropertiesService
      .getScriptProperties()
      .deleteProperty(storeKey);

    return error(
      "OTP has expired. Please request a new OTP."
    );
  }

  // Check max attempts
  if (payload.attempts >= CONFIG.OTP_MAX_ATTEMPTS) {
    // Cleanup after max attempts
    PropertiesService
      .getScriptProperties()
      .deleteProperty(storeKey);

    return error(
      "Maximum OTP attempts exceeded. Please request a new OTP."
    );
  }

  // Increment attempts
  payload.attempts++;

  PropertiesService
    .getScriptProperties()
    .setProperty(
      storeKey,
      JSON.stringify(payload)
    );

  // Validate OTP
  if (String(payload.otp) !== String(otp).trim()) {

    const remaining =
      CONFIG.OTP_MAX_ATTEMPTS -
      payload.attempts;

    return error(
      "Invalid OTP. " +
      remaining +
      " attempt(s) remaining."
    );
  }

  // OTP verified successfully
  // Cleanup OTP
  PropertiesService
    .getScriptProperties()
    .deleteProperty(storeKey);

  // Find or create user
  const userResult =
    findOrCreateUserByMobile(mobile);

  if (!userResult.success) {
    return error(userResult.message);
  }

  // Generate session
  const sessionToken =
    generateSessionToken();

  const userData =
    userResult.user;

  return success(
    {
      session: sessionToken,
      user: userData,
      mobile: mobile,
      isNewUser:
        userResult.isNewUser || false
    },
    "OTP Verified Successfully"
  );
}


/**
 * ============================================================
 * FIND OR CREATE USER BY MOBILE
 * ============================================================
 */

function findOrCreateUserByMobile(mobile) {

  const sheet =
    getSheet(CONFIG.SHEETS.USERS);

  const data =
    sheet.getDataRange().getValues();

  const headers = data[0];

  const mobileCol =
    headers.indexOf("Mobile");

  // Search for existing user
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (
      String(row[mobileCol]).trim() === mobile
    ) {
      // User exists - update last login
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

      // Build user object
      const user = {};

      headers.forEach((h, index) => {
        user[h] = row[index];
      });

      return {
        success: true,
        user: user,
        isNewUser: false
      };
    }
  }

  // User not found - create new user
  return createNewUserByMobile(mobile, headers, sheet);
}


/**
 * ============================================================
 * CREATE NEW USER BY MOBILE (OTP Registration)
 * ============================================================
 */

function createNewUserByMobile(mobile, headers, sheet) {

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
        row.push("User " + mobile.slice(-4));
        break;

      case "Mobile":
        row.push(mobile);
        break;

      case "Email":
        row.push("");
        break;

      case "Password":
        row.push("");
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

  const user = {};

  headers.forEach((h, index) => {
    user[h] = row[index] || "";
  });

  return {
    success: true,
    user: user,
    isNewUser: true
  };
}


/**
 * ============================================================
 * GENERATE SESSION TOKEN
 * ============================================================
 */

function generateSessionToken() {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let token = "";

  for (let i = 0; i < CONFIG.TOKEN_LENGTH; i++) {
    token +=
      chars.charAt(
        Math.floor(
          Math.random() * chars.length
        )
      );
  }

  return token;
}


/**
 * ============================================================
 * MSG91 PROVIDER (PLACEHOLDER)
 * ============================================================
 */

function msg91SendOtp(mobile) {

  // MSG91 integration placeholder
  // Will be implemented when MSG91 API key is available
  // Steps:
  // 1. Call MSG91 API to send OTP via SMS
  // 2. Store transaction ID for verification
  // 3. Return success response

  console.log(
    "MSG91 send OTP called for: " + mobile
  );

  return success(
    {
      mobile: mobile,
      message: "OTP sent via MSG91",
      provider: "MSG91"
    },
    "OTP Sent (MSG91 mode)"
  );
}


function msg91VerifyOtp(mobile, otp) {

  // MSG91 integration placeholder
  // Will be implemented when MSG91 API key is available
  // Steps:
  // 1. Call MSG91 verify API with transaction ID
  // 2. If verified, find or create user
  // 3. Return session token

  console.log(
    "MSG91 verify OTP called for: " +
    mobile +
    " OTP: " +
    otp
  );

  return error(
    "MSG91 verification not yet configured"
  );
}