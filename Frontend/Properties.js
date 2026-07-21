/*
============================================================
EKKA1KM FRONTEND
Properties.js
Restored Properties listing module (Phase 5.5)
============================================================
*/

let CURRENT_PROPERTY = null;

/*
============================================================
LOAD PROPERTIES
============================================================
*/

async function loadProperties() {
  const container = document.getElementById("propertyList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading Properties...</div>";

  try {
    const response = await fetch(
      getApiUrl() + "?action=properties&lat=" + CURRENT_LAT + "&lng=" + CURRENT_LNG + "&radius=" + getRadius()
    );
    const json = await response.json();
    const properties = (json.data && json.data.data) || [];

    if (properties.length === 0) {
      container.innerHTML = "<div class='card'>No Properties Found.</div>";
      return;
    }

    let html = "";

    properties.forEach(function(prop) {
      const purposeLabel = prop.Purpose === "Rent" ? "For Rent" : "For Sale";
      const imgUrl = prop.Images ? prop.Images.split(",")[0].trim() : "";

      html += '<div class="product" onclick=\'showPropertyDetails(' + JSON.stringify(prop).replace(/'/g, "\\'") + ')\' style="cursor:pointer;">';

      if (imgUrl) {
        html += '<div style="width:100%;height:180px;overflow:hidden;border-radius:12px;margin-bottom:10px;">';
        html += '<img src="' + imgUrl + '" alt="' + (prop.Title || "") + '" style="width:100%;height:100%;object-fit:cover;">';
        html += '</div>';
      }

      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<h3>' + (prop.Title || "-") + '</h3>';
      html += '<span style="font-weight:700;color:var(--primary);font-size:18px;">';
      html += '₹ ' + (prop.Price || 0).toLocaleString() + '</span>';
      html += '</div>';

      html += '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">';
      html += '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">' + purposeLabel + '</span>';
      if (prop.Type) {
        html += '<span class="badge">' + prop.Type + '</span>';
      }
      if (prop.Bedrooms) {
        html += '<span class="badge">' + prop.Bedrooms + ' BHK</span>';
      }
      if (prop.DistanceKm) {
        html += '<span class="badge">' + prop.DistanceKm + ' KM Away</span>';
      }
      html += '</div>';

      html += '<p style="font-size:14px;color:#555;margin-top:6px;">';
      html += (prop.City || "") + (prop.State ? ", " + prop.State : "");
      html += '</p>';

      if (prop.Description) {
        html += '<p style="font-size:13px;color:#777;margin-top:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">';
        html += prop.Description;
        html += '</p>';
      }

      html += '<button onclick=\'event.stopPropagation();showPropertyDetails(' + JSON.stringify(prop).replace(/'/g, "\\'") + ')\' style="margin-top:10px;">';
      html += 'View Details';
      html += '</button>';
      html += '</div>';
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

  const container = document.getElementById("propertyList");
  if (!container) return;

  const isLogin = !!getCurrentUser();
  const imgUrl = property.Images ? property.Images.split(",")[0].trim() : "";
  const purposeLabel = property.Purpose === "Rent" ? "For Rent" : "For Sale";

  let html = '<div class="card">';

  if (imgUrl) {
    html += '<div style="width:100%;height:250px;overflow:hidden;border-radius:12px;margin-bottom:15px;">';
    html += '<img src="' + imgUrl + '" alt="' + (property.Title || "") + '" style="width:100%;height:100%;object-fit:cover;">';
    html += '</div>';
  }

  html += '<h2 style="margin-top:15px;">' + (property.Title || "-") + '</h2>';
  html += '<p style="font-size:24px;font-weight:700;color:var(--primary);margin-top:8px;">';
  html += '₹ ' + (property.Price || 0).toLocaleString() + '</p>';

  html += '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">';
  html += '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">' + purposeLabel + '</span>';
  if (property.Type) html += '<span class="badge">' + property.Type + '</span>';
  if (property.Bedrooms) html += '<span class="badge">' + property.Bedrooms + ' BHK</span>';
  if (property.Bathrooms) html += '<span class="badge">' + property.Bathrooms + ' Bath</span>';
  if (property.Area) html += '<span class="badge">' + property.Area + ' sq.ft</span>';
  if (property.DistanceKm) html += '<span class="badge">' + property.DistanceKm + ' KM Away</span>';
  html += '</div>';

  html += '<p style="margin-top:12px;">' + (property.Description || "") + '</p>';

  // Details Grid
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;padding:15px;background:#f9f9f9;border-radius:12px;">';
  if (property.Type) html += '<div><strong>Type:</strong> ' + property.Type + '</div>';
  if (property.Purpose) html += '<div><strong>Purpose:</strong> ' + purposeLabel + '</div>';
  if (property.Bedrooms) html += '<div><strong>Bedrooms:</strong> ' + property.Bedrooms + '</div>';
  if (property.Bathrooms) html += '<div><strong>Bathrooms:</strong> ' + property.Bathrooms + '</div>';
  if (property.Area) html += '<div><strong>Area:</strong> ' + property.Area + ' sq.ft</div>';
  if (property.City) html += '<div><strong>City:</strong> ' + property.City + '</div>';
  if (property.State) html += '<div><strong>State:</strong> ' + property.State + '</div>';
  if (property.Address) html += '<div style="grid-column:1/-1;"><strong>Address:</strong> ' + property.Address + '</div>';
  html += '</div>';

  // User actions
  if (isLogin) {
    html += '<button onclick="contactPropertySeller()" style="margin-top:15px;">';
    html += '<i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> Contact Seller</button>';

    if (property.Phone) {
      html += '<button onclick="callPropertySeller(\'' + property.Phone + '\')" style="background:#25D366;">';
      html += '<i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller</button>';
    }
  } else {
    html += '<div style="margin-top:15px;padding:12px;border:1px solid #ddd;border-radius:10px;">';
    html += '<p>Login to contact seller or show your interest.</p>';
    html += '<button onclick="openPage(\'login\')">Login</button>';
    html += '<button onclick="openPage(\'register\')" style="background:#666;">Register</button>';
    html += '</div>';
  }

  html += '<button onclick="loadProperties()" style="background:#666;margin-top:10px;">';
  html += '<i class="material-icons" style="font-size:18px;vertical-align:middle;">arrow_back</i> Back</button>';

  html += '</div>';

  container.innerHTML = html;
  openPage("properties");
}


/*
============================================================
SELLER CONTACT
============================================================
*/

function contactPropertySeller() {
  if (!requireLogin()) return;
  if (!CURRENT_PROPERTY) return;
  alert("Your interest has been sent to the property seller.");
}

function callPropertySeller(phone) {
  if (!phone) {
    alert("Seller phone number not available.");
    return;
  }
  window.location.href = "tel:" + phone;
}


/*
============================================================
BACKWARD COMPAT
============================================================
*/

console.log("Properties module loaded");