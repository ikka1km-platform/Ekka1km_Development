/**
 * ============================================================
 * EKKA1KM BACKEND
 * Products.js
 * V4.2.1
 * GPS Radius Filtering Enabled
 * ImageKit Upload Fix
 * Sheet Header Alignment Fix
 * ============================================================
 */


/**
 * Get all products
 * URL:
 * ?action=products
 * ?action=products&lat=26.9124&lng=75.7873&radius=51
 */
function getProducts(e) {

  let data = getSheetData("Products");

  // Filter by userId if provided (Products use UserID)
  const userId = e && e.parameter ? e.parameter.userId || "" : "";
  if (userId) {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    data = data.filter(function(p) {
      return String(p.UserID) === auth.userId;
    });
  }

  // Skip location/radius filtering when userId is provided (personal content)
  if (!userId) {
    const location = getLocationContext(e);

    const lat = location.lat;
    const lng = location.lng;
    const radius = location.radius;

    if (lat && lng && radius) {
      data = filterByRadius(
        data,
        lat,
        lng,
        radius
      );
    }
  }

  return success(
    {
      sheet: "Products",
      count: data.length,
      data: data
    },
    "Products Loaded"
  );
}


/**
 * Get single product
 * URL:
 * ?action=product&id=P001
 */
function getProduct(e) {

  const id =
    e &&
    e.parameter &&
    e.parameter.id
      ? e.parameter.id
      : "";

  if (!id) {
    return error("Product ID required");
  }

  const product = getRowById(
    "Products",
    "ProductID",
    id
  );

  if (!product) {
    return error("Product not found");
  }

  return success(
    product,
    "Product Loaded"
  );
}


/**
 * Add product
 */
function addProduct(e) {

  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const sheet = getSheet("Products");
    const p = e.parameter || {};

    const businessId = (p.businessId || "").trim();
    if (businessId) {
      const business = getRowById("Businesses", "BusinessID", businessId);
      if (!business) return error("Business not found");
      const bizOwner = String(business.OwnerUserID || business.UserID || "").trim();
      if (bizOwner !== String(auth.userId).trim()) {
        return error("Not authorized to post products for this business");
      }
    }

    const productId =
      "P" +
      Utilities.getUuid()
        .substring(0, 8);

    const data = sheet.getDataRange().getValues();
    const headers = data.length > 0 ? data[0] : null;

    if (headers && headers.length > 0) {
      const row = headers.map(function(h) {
        switch (h) {
          case "ProductID": return productId;
          case "UserID": return auth.userId;
          case "BusinessID": return businessId || "";
          case "Title": return p.title || "";
          case "Description": return p.description || "";
          case "Price": return p.price || "";
          case "Category": return p.category || "";
          case "ImageURL": return p.imageURL || "";
          case "Latitude": return p.lat || "";
          case "Longitude": return p.lng || "";
          case "Status": return "Pending";
          case "CreatedDate": return new Date();
          case "Views": return 0;
          case "Reports": return 0;
          case "Featured": return "No";
          case "SellerName": return p.sellerName || "";
          case "Phone": return p.phone || "";
          case "WhatsApp": return p.whatsapp || "";
          case "Address": return p.address || "";
          case "City": return p.city || "";
          case "State": return p.state || "";
          case "Pincode": return p.pincode || "";
          case "Condition": return p.condition || "";
          case "Brand": return p.brand || "";
          case "Model": return p.model || "";
          case "Image2": return p.image2 || "";
          case "Image3": return p.image3 || "";
          case "VideoURL": return p.videoUrl || "";
          case "Delivery": return p.delivery || "No";
          case "COD": return p.cod || "No";
          case "Negotiable": return p.negotiable || "No";
          case "FeaturedTill": return "";
          default: return p[h] !== undefined ? p[h] : "";
        }
      });
      sheet.appendRow(row);
    } else {
      sheet.appendRow([
        productId,               // ProductID
        auth.userId,              // UserID
        businessId,              // BusinessID
        p.title || "",           // Title
        p.description || "",     // Description
        p.price || "",           // Price
        p.category || "",        // Category
        p.imageURL || "",        // ImageURL
        p.lat || "",             // Latitude
        p.lng || "",             // Longitude
        "Pending",               // Status
        new Date(),              // CreatedDate
        0,                       // Views
        0,                       // Reports
        "No",                    // Featured
        p.sellerName || "",      // SellerName
        p.phone || "",           // Phone
        p.whatsapp || "",        // WhatsApp
        p.address || "",         // Address
        p.city || "",            // City
        p.state || "",           // State
        p.pincode || "",         // Pincode
        p.condition || "",       // Condition
        p.brand || "",           // Brand
        p.model || "",           // Model
        p.image2 || "",          // Image2
        p.image3 || "",          // Image3
        p.videoUrl || "",        // VideoURL
        p.delivery || "No",      // Delivery
        p.cod || "No",           // COD
        p.negotiable || "No",    // Negotiable
        ""                       // FeaturedTill
      ]);
    }

    return success(
      {
        productId: productId
      },
      "Product Added"
    );

  } catch (err) {

    return exception(err);

  }
}


/**
 * Update product
 */
function legacyUpdateProduct(e) {

  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const id = e.parameter.id;

    if (!id) {
      return error(
        "Product ID required"
      );
    }

    const sheet = getSheet("Products");

    const data =
      sheet.getDataRange()
        .getValues();

    if (data.length <= 1) {
      return error("Product not found");
    }

    const headers = data[0];
    const userCol = headers.indexOf("UserID") >= 0 ? headers.indexOf("UserID") : 1;
    const titleIdx = headers.indexOf("Title");
    const descIdx = headers.indexOf("Description");
    const priceIdx = headers.indexOf("Price");
    const catIdx = headers.indexOf("Category");

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][0]).trim() ===
        String(id).trim()
      ) {
        if (String(data[i][userCol] || "") !== auth.userId) return error("Forbidden");

        if (e.parameter.title && titleIdx >= 0) {
          sheet.getRange(i + 1, titleIdx + 1)
            .setValue(
              e.parameter.title
            );
        }

        if (e.parameter.description && descIdx >= 0) {
          sheet.getRange(i + 1, descIdx + 1)
            .setValue(
              e.parameter.description
            );
        }

        if (e.parameter.price && priceIdx >= 0) {
          sheet.getRange(i + 1, priceIdx + 1)
            .setValue(
              e.parameter.price
            );
        }

        if (e.parameter.category && catIdx >= 0) {
          sheet.getRange(i + 1, catIdx + 1)
            .setValue(
              e.parameter.category
            );
        }

        return success(
          {},
          "Product Updated"
        );
      }
    }

    return error(
      "Product not found"
    );

  } catch (err) {

    return exception(err);

  }
}


/**
 * Delete product
 */
function legacyDeleteProduct(e) {

  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;

    const id = e.parameter.id;

    if (!id) {
      return error(
        "Product ID required"
      );
    }

    const sheet = getSheet("Products");

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
          "Product Deleted"
        );
      }
    }

    return error(
      "Product not found"
    );

  } catch (err) {

    return exception(err);

  }
}

