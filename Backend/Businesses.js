/**
 * ============================================================
 * EKKA1KM BACKEND
 * Businesses.js
 * V4.2.1
 * Automatic Radius Engine Enabled
 * ============================================================
 */


/**
 * Get all businesses
 * URL:
 * ?action=businesses
 * ?action=businesses&lat=26.9124&lng=75.7873&radius=51
 * ?action=businesses&userId=U001
 */
function getBusinesses(e) {

  let data =
    getSheetData("Businesses");

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
    data = filterByRadius(
      data,
      lat,
      lng,
      radius
    );
  }

  return success({
    sheet: "Businesses",
    count: data.length,
    data: data
  }, "Businesses Loaded");

}


/**
 * Get single business
 * URL:
 * ?action=business&id=B001
 */
function getBusiness(e) {

  const id =
    e &&
    e.parameter &&
    e.parameter.id
      ? e.parameter.id
      : "";

  if (!id) {
    return error("Business ID required");
  }

  const business =
    getRowById(
      "Businesses",
      "BusinessID",
      id
    );

  if (!business) {
    return error("Business not found");
  }

  return success(
    business,
    "Business Loaded"
  );

}


/**
 * Add business
 */
function addBusiness(e) {

  try {

    const sheet =
      getSheet("Businesses");

    const p =
      e.parameter;

    const businessId =
      "B" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      businessId,
      p.userId || "",
      p.title || "",
      p.category || "",
      p.description || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.pincode || "",
      p.latitude || "",
      p.longitude || "",
      p.phone || "",
      p.email || "",
      p.website || "",
      "Pending",
      new Date()
    ]);

    return success(
      {
        businessId: businessId
      },
      "Business Added"
    );

  } catch (err) {

    return exception(err);

  }

}


/**
 * Update business
 */
function updateBusiness(e) {

  try {

    const id =
      e.parameter.id;

    if (!id) {
      return error(
        "Business ID required"
      );
    }

    const sheet =
      getSheet("Businesses");

    const data =
      sheet.getDataRange()
        .getValues();

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][0]).trim() ===
        String(id).trim()
      ) {

        if (e.parameter.title) {
          sheet.getRange(i + 1, 3)
            .setValue(
              e.parameter.title
            );
        }

        if (e.parameter.category) {
          sheet.getRange(i + 1, 4)
            .setValue(
              e.parameter.category
            );
        }

        if (e.parameter.description) {
          sheet.getRange(i + 1, 5)
            .setValue(
              e.parameter.description
            );
        }

        if (e.parameter.address) {
          sheet.getRange(i + 1, 6)
            .setValue(
              e.parameter.address
            );
        }

        if (e.parameter.city) {
          sheet.getRange(i + 1, 7)
            .setValue(
              e.parameter.city
            );
        }

        if (e.parameter.state) {
          sheet.getRange(i + 1, 8)
            .setValue(
              e.parameter.state
            );
        }

        if (e.parameter.pincode) {
          sheet.getRange(i + 1, 9)
            .setValue(
              e.parameter.pincode
            );
        }

        if (e.parameter.latitude) {
          sheet.getRange(i + 1, 10)
            .setValue(
              e.parameter.latitude
            );
        }

        if (e.parameter.longitude) {
          sheet.getRange(i + 1, 11)
            .setValue(
              e.parameter.longitude
            );
        }

        if (e.parameter.phone) {
          sheet.getRange(i + 1, 12)
            .setValue(
              e.parameter.phone
            );
        }

        if (e.parameter.email) {
          sheet.getRange(i + 1, 13)
            .setValue(
              e.parameter.email
            );
        }

        if (e.parameter.website) {
          sheet.getRange(i + 1, 14)
            .setValue(
              e.parameter.website
            );
        }

        return success(
          {},
          "Business Updated"
        );
      }
    }

    return error(
      "Business not found"
    );

  } catch (err) {

    return exception(err);

  }

}


/**
 * Delete business
 */
function deleteBusiness(e) {

  try {

    const id =
      e.parameter.id;

    if (!id) {
      return error(
        "Business ID required"
      );
    }

    const sheet =
      getSheet("Businesses");

    const data =
      sheet.getDataRange()
        .getValues();

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][0]).trim() ===
        String(id).trim()
      ) {

        sheet.deleteRow(
          i + 1
        );

        return success(
          {},
          "Business Deleted"
        );
      }
    }

    return error(
      "Business not found"
    );

  } catch (err) {

    return exception(err);

  }

}

