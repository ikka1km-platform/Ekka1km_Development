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

  // Filter by userId/OwnerUserID if provided
  // Properties use OwnerUserID for ownership
  const userId = e && e.parameter ? e.parameter.userId || "" : "";
  if (userId) {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    properties = properties.filter(function(p) {
      return String(p.OwnerUserID || p.UserID) === auth.userId;
    });
  }

  // Skip location/radius filtering when userId is provided (personal content)
  if (!userId) {
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
  }

  return success({
    sheet: "Properties",
    count: properties.length,
    data: properties
  }, "Properties Loaded");
}


/**
 * Get single property
 * URL:
 * ?action=property&id=PR001
 */
function getProperty(e) {
  const id =
    e &&
    e.parameter &&
    e.parameter.id
      ? e.parameter.id
      : (typeof e === "string" ? e : (e && e.parameter && e.parameter.propertyId ? e.parameter.propertyId : ""));

  if (!id) {
    return error("Property ID required");
  }

  const property =
    getRowById(
      "Properties",
      "PropertyID",
      id
    );

  if (!property) {
    return error("Property not found");
  }

  return success(
    property,
    "Property Loaded"
  );
}


/**
 * Add property
 */
function addProperty(e) {
  const auth = requireAuthenticatedUser(e);
  if (!auth.valid) return auth.response;
  const data = e.parameter || {};

  const sheet = getSheet("Properties");
  if (!sheet) return error("Properties sheet not found");

  const propertyId = data.PropertyID || data.propertyId || ("PR" + Utilities.getUuid().substring(0, 8));
  const status = data.Status || data.status || "Pending";
  const now = new Date();

  const values = sheet.getDataRange().getValues();
  const headers = values.length > 0 ? values[0] : [];
  if (headers.length === 0) {
    return error("Properties sheet headers not found");
  }

  const context = {
    propertyId: propertyId,
    userId: auth.userId,
    status: status,
    now: now,
    isUpdate: false
  };

  const row = headers.map(function(header) {
    return typeof resolvePropertyValueByHeader === "function"
      ? resolvePropertyValueByHeader(header, data, context)
      : "";
  });

  sheet.appendRow(row);

  return {
    success: true,
    message: "Property added successfully",
    propertyId: propertyId
  };
}


/**
 * Update property
 */
function updateProperty(e) {
  const auth = requireAuthenticatedUser(e);
  if (!auth.valid) return auth.response;
  const data = e.parameter || {};

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
      const ownerIndex = headers.indexOf("OwnerUserID") >= 0 ? headers.indexOf("OwnerUserID") : headers.indexOf("UserID");
      if (ownerIndex < 0 || String(values[i][ownerIndex] || "") !== auth.userId) return error("Forbidden");

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
function deleteProperty(e) {
  const auth = requireAuthenticatedUser(e);
  if (!auth.valid) return auth.response;
  const id = (e.parameter && (e.parameter.id || e.parameter.PropertyID)) || "";

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
      const ownerIndex = headers.indexOf("OwnerUserID") >= 0 ? headers.indexOf("OwnerUserID") : headers.indexOf("UserID");
      if (ownerIndex < 0 || String(values[i][ownerIndex] || "") !== auth.userId) return error("Forbidden");

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

