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

    const sheet = getSheet("Products");
    const p = e.parameter;

    const productId =
      "P" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      productId,               // ProductID
      p.userId || "",          // UserID
      "",                      // BusinessID
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
function updateProduct(e) {

  try {

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

        if (e.parameter.title) {
          sheet.getRange(i + 1, 4)
            .setValue(
              e.parameter.title
            );
        }

        if (e.parameter.description) {
          sheet.getRange(i + 1, 5)
            .setValue(
              e.parameter.description
            );
        }

        if (e.parameter.price) {
          sheet.getRange(i + 1, 6)
            .setValue(
              e.parameter.price
            );
        }

        if (e.parameter.category) {
          sheet.getRange(i + 1, 7)
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
function deleteProduct(e) {

  try {

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

