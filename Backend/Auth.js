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

        return success(
          user,
          "Login Successful"
        );
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

    const result = findOrCreateUserByMobile(mobile);

    if (!result.success) {
      return error(result.message);
    }

    // Generate session
    const sessionToken = generateSessionToken();

    const userData = result.user;

    return success(
      {
        session: sessionToken,
        user: userData,
        mobile: mobile,
        isNewUser: result.isNewUser || false
      },
      "Login Successful"
    );

  } catch (err) {
    return exception(err);
  }
}

function logoutUser(e) {
  return success(
    {},
    "Logout Successful"
  );
}

