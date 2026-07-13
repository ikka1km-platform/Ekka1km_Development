/*
============================================================
EKKA1KM FRONTEND
Store.js
Store Page System - Business Profile + Products + Properties
V1.0
============================================================
*/

let CURRENT_STORE = null;
let STORE_PRODUCTS = [];
let STORE_PROPERTIES = [];


/*
============================================================
OPEN STORE PAGE
============================================================
*/

async function openStorePage(business) {
  CURRENT_STORE = business;

  const container = document.getElementById("storeContent");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading Store...</div>";
  openPage("store");

  const businessId = business.BusinessID || business.businessId;

  try {
    // Load products from this business
    const prodResponse = await fetch(
      `${getApiUrl()}?action=products&businessId=${encodeURIComponent(businessId)}&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const prodJson = await prodResponse.json();
    STORE_PRODUCTS = (prodJson.data && prodJson.data.data) || [];

    // Load properties from this business
    const propResponse = await fetch(
      `${getApiUrl()}?action=properties&businessId=${encodeURIComponent(businessId)}&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const propJson = await propResponse.json();
    STORE_PROPERTIES = (propJson.data && propJson.data.data) || [];

    renderStorePage();
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load store details.</div>";
  }
}


/*
============================================================
RENDER STORE PAGE
============================================================
*/

function renderStorePage() {
  const container = document.getElementById("storeContent");
  if (!container) return;

  const biz = CURRENT_STORE;
  if (!biz) return;

  const isLogin = !!getCurrentUser();
  const productCount = STORE_PRODUCTS.length;
  const propertyCount = STORE_PROPERTIES.length;

  let html = `
    <!-- Store Header -->
    <div class="storeHeader">
      <div class="storeCover">
        ${biz.CoverImage
          ? `<img src="${biz.CoverImage}" class="storeCoverImg">`
          : `<div class="storeCoverPlaceholder"></div>`
        }
      </div>

      <div class="storeInfo">
        ${biz.Logo
          ? `<img src="${biz.Logo}" class="storeLogo">`
          : `<div class="storeLogoPlaceholder">${(biz.BusinessName || "S")[0]}</div>`
        }

        <h2 class="storeName">
          ${biz.BusinessName || "Store"}
        </h2>

        <p class="storeCategory">
          ${biz.Category || ""}
        </p>

        <p class="storeStats">
          ${productCount} Products &middot; ${propertyCount} Properties
        </p>

        ${biz.DistanceKm
          ? `<span class="badge">${biz.DistanceKm} KM Away</span>`
          : ""
        }
      </div>
    </div>

    <!-- Contact Info -->
    <div class="card">
      <h3>Contact Information</h3>

      ${biz.Phone
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">phone</i> ${biz.Phone}</p>`
        : ""
      }
      ${biz.WhatsApp
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">chat</i> ${biz.WhatsApp}</p>`
        : ""
      }
      ${biz.Email
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">email</i> ${biz.Email}</p>`
        : ""
      }
      ${biz.Website
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">language</i> ${biz.Website}</p>`
        : ""
      }
      ${biz.Address
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">location_on</i> ${biz.Address}</p>`
        : ""
      }
      ${biz.City
        ? `<p><i class="material-icons" style="font-size:16px;vertical-align:middle;">location_city</i> ${biz.City}</p>`
        : ""
      }

      <div style="display:flex;gap:10px;margin-top:10px;">
        ${biz.Phone
          ? `<button onclick="callStore()" style="flex:1;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call
            </button>`
          : ""
        }
        ${biz.WhatsApp
          ? `<button onclick="whatsappStore()" style="flex:1;background:#25D366;">
              <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> WhatsApp
            </button>`
          : ""
        }
      </div>

      <button onclick="getStoreDirections()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
      </button>

      ${isLogin
        ? `<button onclick="followStore()" id="followStoreBtn" class="btn-gray">
            <i class="material-icons" style="font-size:18px;vertical-align:middle;">star</i> Follow Store
          </button>`
        : `<button onclick="openPage('login')" class="btn-gray">
            Login to Follow
          </button>`
      }
    </div>

    <!-- Description -->
    ${biz.Description
      ? `
      <div class="card">
        <h3>About</h3>
        <p>${biz.Description}</p>
      </div>`
      : ""
    }

    <!-- Timing -->
    ${biz.OpeningTime || biz.ClosingTime
      ? `
      <div class="card">
        <h3>Business Hours</h3>
        <p>Open: ${biz.OpeningTime || "N/A"}</p>
        <p>Close: ${biz.ClosingTime || "N/A"}</p>
      </div>`
      : ""
    }

    <!-- Products -->
    <div class="sectionTitle" style="margin-top:20px;">
      Products (${productCount})
    </div>

    <div id="storeProductList">
      ${productCount === 0
        ? "<div class='card'>No products from this store.</div>"
        : ""
      }
    </div>

    <!-- Properties -->
    <div class="sectionTitle" style="margin-top:20px;">
      Properties (${propertyCount})
    </div>

    <div id="storePropertyList">
      ${propertyCount === 0
        ? "<div class='card'>No properties from this store.</div>"
        : ""
      }
    </div>

    <!-- Share -->
    <div class="card">
      <button onclick="shareStore()">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share Store
      </button>
    </div>

    <button onclick="openPage('businesses')" class="btn-gray" style="margin-bottom:20px;">
      Back to Businesses
    </button>
  `;

  container.innerHTML = html;

  // Render products
  const prodContainer = document.getElementById("storeProductList");
  if (prodContainer && STORE_PRODUCTS.length > 0) {
    let prodHtml = "";
    STORE_PRODUCTS.forEach(product => {
      prodHtml += `
        <div class="product" style="cursor:pointer;" onclick='showProductDetails(${JSON.stringify(product)})'>
          ${product.ImageURL
            ? `<img src="${product.ImageURL}" style="width:100%;height:150px;object-fit:cover;border-radius:12px;margin-bottom:10px;">`
            : ""
          }
          <h3>${product.Title || "-"}</h3>
          <p>₹ ${product.Price || 0}</p>
          ${product.DistanceKm
            ? `<span class="badge">${product.DistanceKm} KM Away</span>`
            : ""
          }
        </div>
      `;
    });
    prodContainer.innerHTML = prodHtml;
  }

  // Render properties
  const propContainer = document.getElementById("storePropertyList");
  if (propContainer && STORE_PROPERTIES.length > 0) {
    let propHtml = "";
    STORE_PROPERTIES.forEach(property => {
      propHtml += `
        <div class="card" style="cursor:pointer;">
          <h3>${property.Title || "-"}</h3>
          <p>₹ ${property.Price || 0}</p>
          <p>${property.PropertyType || ""} - ${property.Purpose || ""}</p>
          ${property.Bedrooms ? `<p>${property.Bedrooms} BHK</p>` : ""}
          ${property.DistanceKm
            ? `<span class="badge">${property.DistanceKm} KM Away</span>`
            : ""
          }
        </div>
      `;
    });
    propContainer.innerHTML = propHtml;
  }
}


/*
============================================================
STORE ACTIONS
============================================================
*/

function callStore() {
  if (!CURRENT_STORE) return;
  const mobile = CURRENT_STORE.Mobile || CURRENT_STORE.Phone || "";
  if (mobile) {
    window.location.href = `tel:${mobile}`;
  } else {
    alert("Phone number not available.");
  }
}

function whatsappStore() {
  if (!CURRENT_STORE) return;
  const wa = CURRENT_STORE.WhatsApp || CURRENT_STORE.Phone || "";
  if (wa) {
    window.open(`https://wa.me/${wa.replace(/[^0-9]/g, "")}`, "_blank");
  } else {
    alert("WhatsApp number not available.");
  }
}

function getStoreDirections() {
  if (!CURRENT_STORE) return;
  const lat = CURRENT_STORE.Latitude || CURRENT_LAT;
  const lng = CURRENT_STORE.Longitude || CURRENT_LNG;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    "_blank"
  );
}

function shareStore() {
  if (!CURRENT_STORE) return;
  const text = `${CURRENT_STORE.BusinessName || ""}\n${CURRENT_STORE.Address || ""}\n${CURRENT_STORE.City || ""}`;
  if (navigator.share) {
    navigator.share({ title: CURRENT_STORE.BusinessName, text });
  } else {
    navigator.clipboard.writeText(text);
    alert("Store details copied.");
  }
}

async function followStore() {
  if (!requireLogin()) return;
  if (!CURRENT_STORE) return;

  const userId = getUserId();
  const businessId = CURRENT_STORE.BusinessID || CURRENT_STORE.businessId;

  if (!businessId) {
    alert("Unable to follow store.");
    return;
  }

  try {
    const response = await fetch(
      `${getApiUrl()}?action=followstore&userId=${encodeURIComponent(userId)}&businessId=${encodeURIComponent(businessId)}`
    );
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("You are now following this store!");
      const btn = document.getElementById("followStoreBtn");
      if (btn) {
        btn.innerText = "Following ✓";
        btn.style.background = "#0f9d58";
      }
    } else {
      alert(json.message || "Failed to follow store.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to follow store. Check connection.");
  }
}