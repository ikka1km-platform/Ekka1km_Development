/*
============================================================
EKKA1KM FRONTEND
Products.js
Products + Product Details + Interest
V1.1 Trial
Guest Mode + Product View Analytics
============================================================
*/

let CURRENT_PRODUCT = null;


/*
============================================================
PRODUCT VIEW ANALYTICS
============================================================
*/

function trackProductView() {

  const key =
    CONFIG.STORAGE_KEYS.PRODUCT_VIEWS;

  const count =
    parseInt(
      localStorage.getItem(key) || "0"
    ) + 1;

  localStorage.setItem(
    key,
    count.toString()
  );
}


/*
============================================================
LOAD PRODUCTS
============================================================
*/

async function loadProducts() {

  const container =
    document.getElementById(
      "productList"
    );

  if (!container)
    return;

  container.innerHTML =
    "<div class='card'>Loading Products...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=products&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
      );

    const json =
      await response.json();

    const products =
      (json.data &&
        json.data.data) ||
      [];

    if (
      products.length === 0
    ) {

      container.innerHTML =
        "<div class='card'>No Products Found.</div>";

      return;
    }

    let html = "";

    products.forEach(
      product => {

        html += `
        <div class="product">

          <h3>
            ${product.Title || "-"}
          </h3>

          <p>
            ₹ ${product.Price || 0}
          </p>

          <p>
            ${product.City || ""}
          </p>

          ${
            product.DistanceKm
              ? `<span class="badge">${product.DistanceKm} KM Away</span>`
              : ""
          }

          <button
            onclick='showProductDetails(${JSON.stringify(product)})'>
            View Details
          </button>

        </div>
        `;
      }
    );

    container.innerHTML =
      html;

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load products.</div>";
  }
}


/*
============================================================
PRODUCT DETAILS
============================================================
*/

function showProductDetails(
  product
) {

  CURRENT_PRODUCT =
    product;

  /*
  ============================================================
  ANALYTICS
  ============================================================
  */

  trackProductView();

  const isLogin =
    !!getCurrentUser();

  let html = `
  <div class="card">

    <h2>
      ${product.Title || "-"}
    </h2>

    <p>
      Price:
      ₹ ${product.Price || 0}
    </p>

    <p>
      ${product.Description || ""}
    </p>

    <p>
      ${product.City || ""}
    </p>
  `;

  /*
  ============================================================
  LOGIN USER
  ============================================================
  */

  if (isLogin) {

    html += `
      <button
        onclick="sendInterest()">
        I'm Interested
      </button>

      <button
        onclick="requestSellerContact()">
        Contact Seller
      </button>
    `;
  }

  /*
  ============================================================
  GUEST USER
  ============================================================
  */

  else {

    html += `
      <div
        style="
          margin-top:15px;
          padding:12px;
          border:1px solid #ddd;
          border-radius:10px;
        ">

        <p>
          Login to contact seller or
          show your interest.
        </p>

        <button
          onclick="openPage('login')">
          Login
        </button>

        <button
          onclick="openPage('register')"
          style="background:#666;">
          Register
        </button>

      </div>
    `;
  }

  html += `
    <button
      onclick="loadProducts()"
      style="background:#666;">
      Back
    </button>

  </div>
  `;

  const container =
    document.getElementById(
      "productList"
    );

  container.innerHTML =
    html;

  openPage(
    "products"
  );
}


/*
============================================================
INTEREST
============================================================
*/

async function sendInterest() {

  if (
    !requireLogin()
  ) {
    return;
  }

  if (
    !CURRENT_PRODUCT
  ) {
    return;
  }

  if (
    typeof notifyProductInterest ===
    "function"
  ) {
    notifyProductInterest(
      CURRENT_PRODUCT
    );
  }

  alert(
    "Interest request sent to seller."
  );

  /*
  Future API:

  ?action=interest
  &userId=
  &productId=
  */
}


/*
============================================================
SELLER CONTACT
============================================================
*/

function requestSellerContact() {

  if (
    !requireLogin()
  ) {
    return;
  }

  if (
    !CURRENT_PRODUCT
  ) {
    return;
  }

  alert(
    "Seller contact permission request sent."
  );

  /*
  Future API:

  ?action=requestsellercontact
  */
}

