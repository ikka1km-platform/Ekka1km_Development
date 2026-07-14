/**
 * ============================================================
 * EKKA1KM BACKEND
 * Products.js
 * V4.1.9
 * GPS Radius Filtering Enabled
 * ============================================================
 */


/**
 * Get all products
 * URL:
 * ?action=products
 * ?action=products&lat=26.9124&lng=75.7873&radius=51
 */
function getProducts(e) {

  let data =
    getSheetData("Products");

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
    sheet: "Products",
    count: data.length,
    data: data
  }, "Products Loaded");

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

  const product =
    getRowById(
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

    const sheet =
      getSheet("Products");

    const p =
      e.parameter;

    const productId =
      "P" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      productId,
      p.userId || "",
      p.title || "",
      p.description || "",
      p.price || "",
      p.category || "",
      p.imageUrl || "",
      p.latitude || "",
      p.longitude || "",
      "Pending",
      new Date(),
      0,
      0,
      "No",
      p.sellerName || "",
      p.phone || "",
      p.whatsapp || "",
      p.address || "",
      p.city || "",
      p.state || "",
      p.pincode || "",
      p.condition || "",
      p.brand || "",
      p.model || "",
      p.image2 || "",
      p.image3 || "",
      p.image4 || "",
      p.image5 || "",
      p.videoUrl || "",
      p.delivery || "No",
      p.cod || "No",
      p.negotiable || "No",
      ""
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

    const id =
      e.parameter.id;

    if (!id) {
      return error(
        "Product ID required"
      );
    }

    const sheet =
      getSheet("Products");

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

        if (e.parameter.description) {
          sheet.getRange(i + 1, 4)
            .setValue(
              e.parameter.description
            );
        }

        if (e.parameter.price) {
          sheet.getRange(i + 1, 5)
            .setValue(
              e.parameter.price
            );
        }

        if (e.parameter.category) {
          sheet.getRange(i + 1, 6)
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

    const id =
      e.parameter.id;

    if (!id) {
      return error(
        "Product ID required"
      );
    }

    const sheet =
      getSheet("Products");

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

