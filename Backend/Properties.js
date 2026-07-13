/**
 * ============================================================
 * EKKA1KM BACKEND
 * Properties.js
 * V4.2.1
 * Automatic Radius Engine Enabled
 * ============================================================
 */


/**
 * Get all properties
 * URL:
 * ?action=properties
 * ?action=properties&lat=26.9124&lng=75.7873&radius=51
 * ?action=properties&userId=U001
 */
function getProperties(e) {

  let properties =
    getSheetData("Properties");

  const location =
    getLocationContext(e);

  const lat =
    location.lat;

  const lng =
    location.lng;

  const radius =
    location.radius;

  if (
    lat &&
    lng &&
    radius
  ) {
    properties = filterByRadius(
      properties,
      lat,
      lng,
      radius
    );
  }

  return success({
    sheet: "Properties",
    count: properties.length,
    data: properties
  }, "Properties Loaded");
}


/**
 * Get single property
 */
function getProperty(id) {

  const properties =
    getSheetData("Properties");

  return properties.find(function (p) {
    return String(p.PropertyID) === String(id);
  });
}


/**
 * Add property
 */
function addProperty(data) {

  const sheet =
    getSheet("Properties");

  const row = [
    data.PropertyID ||
      "PR" + Date.now(),
    data.UserID || "",
    data.Title || "",
    data.Description || "",
    data.Category || "",
    data.Price || "",
    data.Address || "",
    data.City || "",
    data.State || "",
    data.Pincode || "",
    data.Latitude || "",
    data.Longitude || "",
    data.Image || "",
    new Date()
  ];

  sheet.appendRow(row);

  return {
    success: true,
    message:
      "Property added successfully"
  };
}


/**
 * Update property
 */
function updateProperty(data) {

  const sheet =
    getSheet("Properties");

  const values =
    sheet.getDataRange()
      .getValues();

  if (values.length <= 1) {
    return {
      success: false,
      message:
        "No properties found"
    };
  }

  const headers = values[0];

  const idIndex =
    headers.indexOf(
      "PropertyID"
    );

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    if (
      String(
        values[i][idIndex]
      ) ===
      String(
        data.PropertyID
      )
    ) {

      headers.forEach(
        function (h, c) {
          if (
            data[h] !==
            undefined
          ) {
            sheet
              .getRange(
                i + 1,
                c + 1
              )
              .setValue(
                data[h]
              );
          }
        }
      );

      return {
        success: true,
        message:
          "Property updated successfully"
      };
    }
  }

  return {
    success: false,
    message:
      "Property not found"
  };
}


/**
 * Delete property
 */
function deleteProperty(id) {

  const sheet =
    getSheet("Properties");

  const values =
    sheet.getDataRange()
      .getValues();

  const headers =
    values[0];

  const idIndex =
    headers.indexOf(
      "PropertyID"
    );

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    if (
      String(
        values[i][idIndex]
      ) ===
      String(id)
    ) {

      sheet.deleteRow(
        i + 1
      );

      return {
        success: true,
        message:
          "Property deleted successfully"
      };
    }
  }

  return {
    success: false,
    message:
      "Property not found"
  };
}

