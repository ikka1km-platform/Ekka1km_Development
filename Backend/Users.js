/**
 * ============================================================
 * EKKA1KM BACKEND
 * Users.js
 * V6.0 - Profile Photo Support
 * ============================================================
 */

function getUsers() {
  const users = getSheetData(CONFIG.SHEETS.USERS);

  return success(
    {
      count: users.length,
      data: users
    },
    "Users Loaded"
  );
}

function getProfile(e) {
  const userId = getParam(e, "userId", "");

  if (!userId) {
    return success({}, "Profile Loaded");
  }

  const user = getRowById(
    CONFIG.SHEETS.USERS,
    "UserID",
    userId
  );

  return success(
    user || {},
    "Profile Loaded"
  );
}


/**
 * ============================================================
 * UPDATE PROFILE
 * ?action=updateprofile
 *   &userId=U001
 *   &fullName=John
 *   &email=john@test.com
 *   &city=Jaipur
 *   &state=Rajasthan
 *   &country=India
 *   &profilePhoto=https://ik.imagekit.io/xxx.jpg
 * ============================================================
 */

function updateProfile(e) {
  try {
    const userId =
      e.parameter.userId || "";

    if (!userId) {
      return error("UserID required");
    }

    const sheet =
      getSheet(CONFIG.SHEETS.USERS);

    const data =
      sheet.getDataRange().getValues();

    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(userId).trim()) {
        // Update each field dynamically by header name
        const fields = [
          "fullName", "email", "city", "state",
          "country", "profilePhoto"
        ];

        fields.forEach(function(field) {
          const value = e.parameter[field];
          if (value !== undefined && value !== "") {
            const colIndex = headers.indexOf(
              field.charAt(0).toUpperCase() + field.slice(1)
            );
            if (colIndex >= 0) {
              sheet.getRange(i + 1, colIndex + 1).setValue(value);
            }
          }
        });

        return success(
          {},
          "Profile Updated"
        );
      }
    }

    return error("User not found");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET PARAM
 * ============================================================
 */

function getParam(
  e,
  key,
  defaultValue
) {
  try {

    if (
      !e ||
      !e.parameter
    ) {
      return defaultValue || "";
    }

    const value =
      e.parameter[key];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return defaultValue || "";
    }

    return value;

  } catch (err) {
    return defaultValue || "";
  }
}