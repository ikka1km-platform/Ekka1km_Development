/**
 * ============================================================
 * EKKA1KM BACKEND
 * Businesses.js
 * V4.2.1
 * Automatic Radius Engine Enabled
 * ============================================================
 */


/**
 * Helper to normalize business records and safely heal structural column shifts
 */
function normalizeBusinessRecord(b) {
  if (!b || typeof b !== "object") return b;

  var pincodeStr = String(b.Pincode || "").trim().toLowerCase();
  var stateStr = String(b.State || "").trim().toLowerCase();
  var latStr = String(b.Latitude || "").trim();

  // Detect structural column shift:
  // In shifted records, Pincode contains a status string ("pending", "active", etc.),
  // State contains an image URL ("http...", "https..."),
  // or Latitude contains an ISO timestamp string.
  var isShifted = (
    (pincodeStr === "pending" || pincodeStr === "approved" || pincodeStr === "active" || pincodeStr === "rejected") ||
    (stateStr.indexOf("http://") === 0 || stateStr.indexOf("https://") === 0) ||
    (latStr.indexOf("T") !== -1 && latStr.indexOf("Z") !== -1 && !isNaN(Date.parse(latStr)))
  );

  if (isShifted) {
    var rawAddress = b.Logo;
    var rawCity = b.CoverImage;
    var rawState = b.Phone;
    var rawPincode = b.WhatsApp;
    var rawLat = b.Email;
    var rawLng = b.Website;
    var rawPhone = b.Address;
    var rawLogo = b.State;
    var rawCover = b.Country;
    var rawStatus = b.Pincode;
    var rawDate = b.Latitude;

    return {
      BusinessID: String(b.BusinessID || ""),
      OwnerUserID: String(b.OwnerUserID || b.UserID || ""),
      UserID: String(b.OwnerUserID || b.UserID || ""),
      BusinessName: String(b.BusinessName || b.Title || ""),
      Title: String(b.BusinessName || b.Title || ""),
      Category: String(b.Category || ""),
      Description: String(b.Description || ""),
      Logo: (typeof rawLogo === "string" && (rawLogo.indexOf("http://") === 0 || rawLogo.indexOf("https://") === 0)) ? rawLogo : "",
      CoverImage: (typeof rawCover === "string" && (rawCover.indexOf("http://") === 0 || rawCover.indexOf("https://") === 0)) ? rawCover : "",
      Phone: String(rawPhone || ""),
      WhatsApp: (rawPincode && String(rawPincode).length === 10) ? String(rawPincode) : "",
      Email: "",
      Website: "",
      Address: String(rawAddress || ""),
      City: String(rawCity || ""),
      District: String(b.District || ""),
      State: String(rawState || ""),
      Country: "India",
      Pincode: String(rawPincode || ""),
      Latitude: parseFloat(rawLat) || "",
      Longitude: parseFloat(rawLng) || "",
      OpeningTime: String(b.OpeningTime || ""),
      ClosingTime: String(b.ClosingTime || ""),
      Status: String(rawStatus || "Active"),
      CreatedDate: rawDate || "",
      Views: b.Views || 0,
      Featured: b.Featured || "No",
      PromotionCampaignID: b.PromotionCampaignID || "",
      BusinessType: b.BusinessType || "",
      Verified: b.Verified || "",
      VerificationDate: b.VerificationDate || "",
      VerificationBy: b.VerificationBy || "",
      DistanceKm: b.DistanceKm || ""
    };
  }

  var norm = Object.assign({}, b);
  if (!norm.BusinessName && norm.Title) norm.BusinessName = norm.Title;
  if (!norm.Title && norm.BusinessName) norm.Title = norm.BusinessName;
  if (!norm.OwnerUserID && norm.UserID) norm.OwnerUserID = norm.UserID;
  if (!norm.UserID && norm.OwnerUserID) norm.UserID = norm.OwnerUserID;
  return norm;
}

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

  // Normalize all business records to heal schema shifts transparently
  data = data.map(normalizeBusinessRecord);

  // Filter by userId if provided (Businesses use OwnerUserID or UserID)
  const userId = e && e.parameter ? e.parameter.userId || "" : "";
  if (userId) {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    data = data.filter(function(b) {
      return String(b.OwnerUserID || b.UserID) === auth.userId;
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
      data = filterByRadius(
        data,
        lat,
        lng,
        radius
      );
    }
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

  let business =
    getRowById(
      "Businesses",
      "BusinessID",
      id
    );

  if (!business) {
    return error("Business not found");
  }

  business = normalizeBusinessRecord(business);

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
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const sheet =
      getSheet("Businesses");

    const p =
      e.parameter || {};

    const businessId =
      "B" +
      Utilities.getUuid()
        .substring(0, 8);

    const headers = sheet.getDataRange().getValues()[0];
    const newRow = new Array(headers.length).fill("");

    function setCol(name, val) {
      const idx = headers.indexOf(name);
      if (idx >= 0) newRow[idx] = (val !== undefined && val !== null) ? val : "";
    }

    setCol("BusinessID", businessId);
    setCol("OwnerUserID", auth.userId);
    setCol("UserID", auth.userId);
    setCol("BusinessName", p.title || p.businessName || p.name || "");
    setCol("Category", p.category || "");
    setCol("Description", p.description || "");
    setCol("Logo", p.logo || "");
    setCol("CoverImage", p.coverImage || "");
    setCol("Phone", p.phone || p.mobile || "");
    setCol("WhatsApp", p.whatsapp || "");
    setCol("Email", p.email || "");
    setCol("Website", p.website || "");
    setCol("Address", p.address || "");
    setCol("City", p.city || "");
    setCol("District", p.district || "");
    setCol("State", p.state || "");
    setCol("Country", p.country || "India");
    setCol("Pincode", p.pincode || "");
    setCol("Latitude", p.latitude || p.lat || "");
    setCol("Longitude", p.longitude || p.lng || "");
    setCol("OpeningTime", p.openingTime || p.openTime || "");
    setCol("ClosingTime", p.closingTime || p.closeTime || "");
    setCol("Status", p.status || "Pending");
    setCol("CreatedDate", new Date());

    sheet.appendRow(newRow);

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
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const p = e.parameter || {};
    const id = p.id || p.businessId || "";

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

    if (data.length < 2) {
      return error("Business not found");
    }

    const headers = data[0];
    const idIndex = headers.indexOf("BusinessID");
    let ownerIndex = headers.indexOf("OwnerUserID");
    if (ownerIndex < 0) ownerIndex = headers.indexOf("UserID");

    const targetIdCol = idIndex >= 0 ? idIndex : 0;

    for (let i = 1; i < data.length; i++) {
      if (
        String(data[i][targetIdCol]).trim() ===
        String(id).trim()
      ) {
        if (ownerIndex >= 0 && String(data[i][ownerIndex] || "").trim() !== auth.userId) {
          return error("Forbidden");
        }

        function updateField(colName, val) {
          if (val === undefined || val === null || val === "") return;
          const idx = headers.indexOf(colName);
          if (idx >= 0) {
            sheet.getRange(i + 1, idx + 1).setValue(val);
          }
        }

        updateField("BusinessName", p.title || p.businessName || p.name);
        updateField("Title", p.title || p.businessName || p.name);
        updateField("Category", p.category);
        updateField("Description", p.description);
        updateField("Address", p.address);
        updateField("City", p.city);
        updateField("District", p.district);
        updateField("State", p.state);
        updateField("Country", p.country);
        updateField("Pincode", p.pincode);
        updateField("Latitude", p.latitude || p.lat);
        updateField("Longitude", p.longitude || p.lng);
        updateField("Phone", p.phone || p.mobile);
        updateField("WhatsApp", p.whatsapp);
        updateField("Email", p.email);
        updateField("Website", p.website);
        updateField("Logo", p.logo);
        updateField("CoverImage", p.coverImage);
        updateField("OpeningTime", p.openingTime || p.openTime);
        updateField("ClosingTime", p.closingTime || p.closeTime);

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
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

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
        if (String(data[i][1] || "") !== auth.userId) return error("Forbidden");

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

