/**
 * ============================================================
 * EKKA1KM BACKEND
 * Location.js
 * V4.2.1
 * Automatic Radius Engine
 * ============================================================
 */

function getRequestValue(
  e,
  key,
  def
) {
  try {
    return (
      e.parameter[key] ||
      def
    );
  } catch (err) {
    return def;
  }
}


function toNumber(
  value,
  def
) {
  const n =
    Number(value);

  return isNaN(n)
    ? def
    : n;
}


/**
 * Read user preference
 */
function getUserRadiusPreference(
  userId
) {

  if (!userId) {
    return null;
  }

  const data =
    getSheetData(
      "UserPreferences"
    );

  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];

    if (
      String(
        row.UserID
      ) === String(userId)
    ) {
      return {
        lat:
          Number(
            row.Latitude
          ),
        lng:
          Number(
            row.Longitude
          ),
        radius:
          row.Radius
      };
    }
  }

  return null;
}


/**
 * Main location resolver
 */
function getLocationContext(
  e
) {

  const userId =
    getRequestValue(
      e,
      "userId",
      ""
    );

  if (userId) {

    const pref =
      getUserRadiusPreference(
        userId
      );

    if (pref) {
      return {
        lat:
          pref.lat,
        lng:
          pref.lng,
        radius:
          pref.radius
      };
    }
  }

  return {
    lat:
      toNumber(
        getRequestValue(
          e,
          "lat",
          0
        ),
        0
      ),

    lng:
      toNumber(
        getRequestValue(
          e,
          "lng",
          0
        ),
        0
      ),

    radius:
      getRequestValue(
        e,
        "radius",
        ""
      )
  };
}

