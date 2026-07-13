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

