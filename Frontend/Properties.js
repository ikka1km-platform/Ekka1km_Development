/*
============================================================
EKKA1KM FRONTEND
Properties.js
Properties + Property Details
V1.0 Trial
Guest Mode Supported
============================================================
*/

let CURRENT_PROPERTY = null;


/*
============================================================
PROPERTY VIEW ANALYTICS
============================================================
*/

function trackPropertyView() {
  if (CURRENT_PROPERTY) {
    const userId = getUserId();
    const property = CURRENT_PROPERTY;

    fetch(`${getApiUrl()}?action=trackevent&eventType=PropertyView&entityType=Property&entityId=${property.PropertyID}&userId=${userId || ""}&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`)
      .catch(err => console.log("trackPropertyView error:", err));
  }
}


/*
============================================================
LOAD PROPERTIES
============================================================
*/

async function loadProperties() {
  const container = document.getElementById("propertyList");
  if (!container) return;

  // Use shared location helpers to get effective center
  // (manual location if set, otherwise GPS)
  const lat = getCenterLat();
  const lng = getCenterLng();
  const radius = getRadius();
  const url = `${getApiUrl()}?action=properties&lat=${lat}&lng=${lng}&radius=${radius}`;

  // Debug logging
  console.log("Properties Location:");
  console.log("Lat:", lat);
  console.log("Lng:", lng);
  console.log("Radius:", radius);
  console.log("URL:", url);

  container.innerHTML = "<div class='card'>Loading Properties...</div>";

  try {
    const response = await fetch(url);
    const json = await response.json();
    const properties = (json.data && json.data.data) || [];

    if (properties.length === 0) {
      container.innerHTML = "<div class='card'>No Properties Found.</div>";
      return;
    }

    let html = "";

    properties.forEach(property => {
      html += `
        <div class="card" onclick='showPropertyDetails(${JSON.stringify(property)})' style="cursor:pointer;">

          <h3>
            ${property.Title || property.Type || "-"}
          </h3>

          <p style="font-size:20px;font-weight:700;color:var(--primary);margin-top:6px;">
            ₹ ${(property.Price || 0).toLocaleString()}
          </p>

          <p>
            ${property.Purpose || ""} ${property.Type ? `• ${property.Type}` : ""}
          </p>

          <p>
            ${property.City || ""} ${property.State ? `, ${property.State}` : ""}
          </p>

          ${property.Description
            ? `<p style="font-size:13px;color:#777;margin-top:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                ${property.Description}
              </p>`
            : ""
          }

          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            ${property.DistanceKm
              ? `<span class="badge">${property.DistanceKm} KM Away</span>`
              : ""
            }
            ${property.Bedrooms
              ? `<span class="badge">${property.Bedrooms} BHK</span>`
              : ""
            }
            ${property.Area
              ? `<span class="badge">${property.Area} sq ft</span>`
              : ""
            }
          </div>

          <button
            onclick='event.stopPropagation();showPropertyDetails(${JSON.stringify(property)})'
            style="margin-top:10px;">
            View Details
          </button>

        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load properties.</div>";
  }
}


/*
============================================================
PROPERTY DETAILS
============================================================
*/

function showPropertyDetails(property) {
  CURRENT_PROPERTY = property;
  trackPropertyView();

  const container = document.getElementById("propertyList");
  if (!container) return;

  const isLogin = !!getCurrentUser();

  let html = `
  <div class="card">

    <h2 style="margin-top:15px;">
      ${property.Title || "-"}
    </h2>

    <p style="font-size:24px;font-weight:700;color:var(--primary);margin-top:8px;">
      ₹ ${(property.Price || 0).toLocaleString()}
    </p>

    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      ${property.Purpose ? `<span class="badge">${property.Purpose}</span>` : ""}
      ${property.Type ? `<span class="badge">${property.Type}</span>` : ""}
      ${property.Bedrooms ? `<span class="badge">${property.Bedrooms} BHK</span>` : ""}
      ${property.Bathrooms ? `<span class="badge">${property.Bathrooms} Bath</span>` : ""}
      ${property.Area ? `<span class="badge">${property.Area} sq ft</span>` : ""}
      ${property.DistanceKm ? `<span class="badge">${property.DistanceKm} KM Away</span>` : ""}
    </div>

    <p style="margin-top:12px;">
      ${property.Description || ""}
    </p>

    <!-- Details Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;padding:15px;background:#f9f9f9;border-radius:12px;">
      ${property.Category ? `<div><strong>Category:</strong> ${property.Category}</div>` : ""}
      ${property.City ? `<div><strong>City:</strong> ${property.City}</div>` : ""}
      ${property.State ? `<div><strong>State:</strong> ${property.State}</div>` : ""}
      ${property.Pincode ? `<div><strong>Pincode:</strong> ${property.Pincode}</div>` : ""}
      ${property.Address ? `<div><strong>Address:</strong> ${property.Address}</div>` : ""}
      ${property.Facing ? `<div><strong>Facing:</strong> ${property.Facing}</div>` : ""}
      ${property.Floor ? `<div><strong>Floor:</strong> ${property.Floor}</div>` : ""}
      ${property.TotalFloors ? `<div><strong>Total Floors:</strong> ${property.TotalFloors}</div>` : ""}
    </div>

    <!-- Price Details -->
    <div style="margin-top:15px;padding:15px;background:#fff3e0;border-radius:12px;">
      <p style="font-size:14px;">
        <strong>Price:</strong> ₹ ${(property.Price || 0).toLocaleString()}
      </p>
      ${property.Purpose === "Rent"
        ? `<p style="font-size:14px;color:var(--primary);">Rental Property</p>`
        : property.Purpose === "Sell"
          ? `<p style="font-size:14px;color:#666;">For Sale</p>`
          : ""
      }
    </div>
  `;

  /*
  ============================================================
  LOGGED IN USER - Action Buttons
  ============================================================
  */

  if (isLogin) {
    html += `
      <button onclick="getPropertyDirections()" style="margin-top:15px;">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions
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
      <div style="margin-top:15px;padding:12px;border:1px solid #ddd;border-radius:10px;">
        <p>Login to contact the owner.</p>
        <button onclick="openPage('login')">Login</button>
        <button onclick="openPage('register')" style="background:#666;">Register</button>
      </div>
    `;
  }

  // Share button for everyone
  html += `
    <button onclick="shareProperty()">
      <i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share
    </button>

    <button onclick="loadProperties()" style="background:#666;">
      <i class="material-icons" style="font-size:18px;vertical-align:middle;">arrow_back</i> Back
    </button>
  </div>
  `;

  container.innerHTML = html;
  openPage("properties");
}


/*
============================================================
PROPERTY DIRECTIONS
============================================================
*/

function getPropertyDirections() {
  if (!CURRENT_PROPERTY) return;
  const lat = CURRENT_PROPERTY.Latitude || CURRENT_LAT;
  const lng = CURRENT_PROPERTY.Longitude || CURRENT_LNG;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}


/*
============================================================
SHARE PROPERTY
============================================================
*/

function shareProperty() {
  if (!CURRENT_PROPERTY) return;
  const text = `${CURRENT_PROPERTY.Title || ""}\n₹ ${(CURRENT_PROPERTY.Price || 0).toLocaleString()}\n${CURRENT_PROPERTY.Description || ""}\n${CURRENT_PROPERTY.City || ""}`;
  if (navigator.share) {
    navigator.share({ title: CURRENT_PROPERTY.Title, text });
  } else {
    navigator.clipboard.writeText(text);
    alert("Property details copied.");
  }
}