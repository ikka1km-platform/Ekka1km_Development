/*
============================================================
EKKA1KM FRONTEND
Properties.js
Stage 4HIJ - Properties Browsing & Detail Experience
V2.0
Preserves all canonical functionality
============================================================
*/

let CURRENT_PROPERTY = null;

/*
============================================================
NAMESPACED HELPERS (Stage 4HIJ)
============================================================
*/

function propertySafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}

function normalizePropertyImages(images) {
  if (images === undefined || images === null) return [];
  if (Array.isArray(images)) {
    return images.map(function(item) { return String(item || "").trim(); }).filter(Boolean);
  }
  if (typeof images === "string") {
    var s = images.trim();
    if (!s) return [];
    if (s.charAt(0) === "[" && s.charAt(s.length - 1) === "]") {
      try {
        var parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map(function(item) { return String(item || "").trim(); }).filter(Boolean);
        }
      } catch (_) {}
    }
    return s.split(",").map(function(item) { return item.trim(); }).filter(Boolean);
  }
  if (typeof images === "object") {
    try {
      return Object.values(images).map(function(item) { return String(item || "").trim(); }).filter(Boolean);
    } catch (_) {
      return [];
    }
  }
  var str = String(images).trim();
  return str ? [str] : [];
}

function getFirstPropertyImage(prop) {
  if (!prop) return "";
  var raw = (prop.Images !== undefined && prop.Images !== null && prop.Images !== "")
    ? prop.Images
    : ((prop.Image !== undefined && prop.Image !== null && prop.Image !== "")
      ? prop.Image
      : ((prop.imageURL !== undefined && prop.imageURL !== null && prop.imageURL !== "")
        ? prop.imageURL
        : (prop.image || "")));
  var list = normalizePropertyImages(raw);
  return list.length > 0 ? list[0] : "";
}

/*
============================================================
PROPERTY VIEW ANALYTICS (Preserved)
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
LOAD PROPERTIES — Stage 4HIJ Redesign
============================================================
*/

async function loadProperties() {
  const container = document.getElementById("propertyList");
  if (!container) return;

  // Use shared location helpers to get effective center
  const lat = getCenterLat();
  const lng = getCenterLng();
  const radius = getRadius();
  const url = `${getApiUrl()}?action=properties&lat=${lat}&lng=${lng}&radius=${radius}`;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">real_estate_agent</i><p>Loading Properties...</p></div>';

  try {
    const response = await fetch(url);
    const json = await response.json();
    const properties = (json.data && json.data.data) || [];

    if (properties.length === 0) {
      container.innerHTML = '<div class="hij-empty"><i class="material-icons">real_estate_agent</i><p>No Properties Found.</p></div>';
      if (typeof renderHomePropertiesPreview === "function") {
        renderHomePropertiesPreview(properties);
      }
      return;
    }

    let html = '<div class="property-listing">';

    properties.forEach(function(prop) {
      const title = propertySafeRender(prop.Title) || "-";
      const price = (prop.Price || 0).toLocaleString();
      const purpose = prop.Purpose === "Rent" ? "For Rent" : "For Sale";
      const purposeClass = prop.Purpose === "Rent" ? "rent" : "";
      const type = propertySafeRender(prop.Type);
      const bedrooms = propertySafeRender(prop.Bedrooms);
      const bathrooms = propertySafeRender(prop.Bathrooms);
      const area = propertySafeRender(prop.Area);
      const city = propertySafeRender(prop.City);
      const state = propertySafeRender(prop.State);
      const desc = propertySafeRender(prop.Description);
      const distance = propertySafeRender(prop.DistanceKm);
      const imgUrl = getFirstPropertyImage(prop);

      html += '<div class="propertyCard" onclick=\'showPropertyDetails(' + JSON.stringify(prop).replace(/'/g, "\\'") + ')\'>';

      if (imgUrl) {
        html += '<div class="propertyCard-img"><img src="' + imgUrl + '" alt="' + title + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=\\\'propertyCard-img propertyCard-imgPlaceholder\\\'><i class=\\\'material-icons\\\'>real_estate_agent</i></div>\'"></div>';
      } else {
        html += '<div class="propertyCard-img propertyCard-imgPlaceholder"><i class="material-icons">real_estate_agent</i></div>';
      }

      html += '<div class="propertyCard-body">';
      html += '<div class="propertyCard-title">' + title + '</div>';
      html += '<div class="propertyCard-price">₹ ' + price + '</div>';
      html += '<span class="propertyCard-purpose ' + purposeClass + '">' + purpose + '</span>';

      html += '<div class="propertyCard-badges">';
      if (type) html += '<span class="propertyCard-badge">' + type + '</span>';
      if (bedrooms) html += '<span class="propertyCard-badge">' + bedrooms + ' BHK</span>';
      if (bathrooms) html += '<span class="propertyCard-badge">' + bathrooms + ' Bath</span>';
      if (area) html += '<span class="propertyCard-badge">' + area + ' sq ft</span>';
      if (distance) html += '<span class="propertyCard-badge">' + distance + ' KM</span>';
      html += '</div>';

      if (city) {
        html += '<div class="propertyCard-location">' + city + (state ? ", " + state : "") + '</div>';
      }

      if (desc) {
        html += '<div class="propertyCard-desc">' + desc + '</div>';
      }

      html += '<div class="propertyCard-actions">';
      html += '<button onclick=\'event.stopPropagation();showPropertyDetails(' + JSON.stringify(prop).replace(/'/g, "\\'") + ')\'>View Details</button>';
      html += '</div>';

      html += '</div>'; // body
      html += '</div>'; // propertyCard
    });

    html += '</div>';
    container.innerHTML = html;

    // Also render Home Properties preview from the same dataset
    if (typeof renderHomePropertiesPreview === "function") {
      renderHomePropertiesPreview(properties);
    }
  } catch (err) {
    console.log(err);
    container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Unable to load properties.</p></div>';
    const homeContainer = document.getElementById("homePropertiesNearYouContent");
    if (homeContainer) {
      homeContainer.innerHTML = '<div class="homeSection-empty">Unable to load properties.</div>';
    }
  }
}


/*
HOME PREVIEW — PROPERTIES NEAR YOU (Preserved)
*/

function renderHomePropertiesPreview(properties) {
  const container = document.getElementById("homePropertiesNearYouContent");
  if (!container) return;

  if (!properties || properties.length === 0) {
    container.innerHTML = '<div class="homeSection-empty">No properties found nearby.</div>';
    return;
  }

  const preview = properties.slice(0, 4);
  let html = '<div class="homePreviewGrid">';

  preview.forEach(prop => {
    const imgUrl = getFirstPropertyImage(prop);
    const title = prop.Title || "-";
    const price = (prop.Price || 0).toLocaleString();
    const purposeLabel = prop.Purpose === "Rent" ? "For Rent" : "For Sale";
    const type = prop.Type || "";
    const area = prop.Area ? `${prop.Area} sq ft` : "";
    const distance = prop.DistanceKm ? `${prop.DistanceKm} KM away` : "";

    html += `
      <div class="homePreviewCard" onclick='showPropertyDetailsFromHome(${JSON.stringify(prop).replace(/'/g, "\\'")})'>
        ${imgUrl
          ? `<div class="homePreviewCard-img"><img src="${imgUrl}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'homePreviewCard-img homePreviewCard-imgPlaceholder\\'><span class=\\'material-icons\\'>real_estate_agent</span></div>'"></div>`
          : `<div class="homePreviewCard-img homePreviewCard-imgPlaceholder"><span class="material-icons">real_estate_agent</span></div>`
        }
        <div class="homePreviewCard-wishlist" data-interest-type="Property" data-interest-id="${prop.PropertyID || prop.propertyId || ""}" onclick='event.stopPropagation(); toggleInterest(this, "${prop.PropertyID || prop.propertyId || ""}", "Property")'>
          <i class="material-icons">favorite_border</i>
        </div>
        <div class="homePreviewCard-body">
          <div class="homePreviewCard-title">${title}</div>
          <div class="homePreviewCard-price">₹ ${price}</div>
          <div class="homePreviewCard-meta">
            ${purposeLabel ? `<span>${purposeLabel}</span>` : ""}
            ${type ? `<span>${type}</span>` : ""}
            ${area ? `<span>${area}</span>` : ""}
          </div>
          ${distance ? `<div class="homePreviewCard-meta">${distance}</div>` : ""}
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
  if (typeof refreshInterestHearts === "function") refreshInterestHearts();
}


/*
HOME PROPERTY CARD CLICK (Preserved)
*/

function showPropertyDetailsFromHome(property) {
  openPage("properties");
  setTimeout(() => {
    showPropertyDetails(property);
  }, 50);
}


/*
PROPERTY DETAILS BY ID — open detail from a saved interest / deep link
Reuses ?action=property&id= and the existing showPropertyDetails() renderer.
*/

function showPropertyDetailsById(propertyId) {
  if (!propertyId) return;
  fetch(`${getApiUrl()}?action=property&id=${encodeURIComponent(propertyId)}`)
    .then(r => r.json())
    .then(res => {
      if (res && res.success && res.data && typeof showPropertyDetails === "function") {
        showPropertyDetails(res.data);
      } else {
        alert("Property not found.");
      }
    })
    .catch(err => {
      console.log("Property fetch error:", err);
      alert("Unable to load property details.");
    });
}


/*
============================================================
PROPERTY DETAILS — Stage 4HIJ Redesign
============================================================
*/

function showPropertyDetails(property) {
  CURRENT_PROPERTY = property;
  trackPropertyView();

  const container = document.getElementById("propertyList");
  if (!container) return;

  const isLogin = !!getCurrentUser();
  const userId = getUserId();
  const isOwner = userId && (String(property.UserID) === String(userId) || String(property.OwnerUserID) === String(userId));
  const title = propertySafeRender(property.Title) || "-";
  const price = (property.Price || 0).toLocaleString();
  const desc = propertySafeRender(property.Description);
  const purpose = property.Purpose === "Rent" ? "For Rent" : "For Sale";
  const purposeClass = property.Purpose === "Rent" ? "rent" : "";
  const type = propertySafeRender(property.Type);
  const category = propertySafeRender(property.Category);
  const bedrooms = propertySafeRender(property.Bedrooms);
  const bathrooms = propertySafeRender(property.Bathrooms);
  const area = propertySafeRender(property.Area);
  const city = propertySafeRender(property.City);
  const state = propertySafeRender(property.State);
  const pincode = propertySafeRender(property.Pincode);
  const address = propertySafeRender(property.Address);
  const distance = propertySafeRender(property.DistanceKm);
  const facing = propertySafeRender(property.Facing);
  const floor = propertySafeRender(property.Floor);
  const totalFloors = propertySafeRender(property.TotalFloors);
  const phone = propertySafeRender(property.Phone);
  const imgUrl = getFirstPropertyImage(property);

  let html = '<div class="hij-detail">';

  // Back button
  html += '<button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back to Properties</button>';

  // Image
  if (imgUrl) {
    html += '<div class="hij-detail-image"><img src="' + imgUrl + '" alt="' + title + '" onerror="this.parentElement.innerHTML=\'<i class=\\\'material-icons\\\'>real_estate_agent</i>\'"></div>';
  } else {
    html += '<div class="hij-detail-image"><i class="material-icons">real_estate_agent</i></div>';
  }

  // Title & Price
  html += '<div class="hij-detail-title">' + title + '</div>';
  html += '<div class="hij-detail-price">₹ ' + price + '</div>';

  // Badges
  html += '<div class="hij-detail-badges">';
  html += '<span class="hij-detail-badge">' + purpose + '</span>';
  if (type) html += '<span class="hij-detail-badge">' + type + '</span>';
  if (bedrooms) html += '<span class="hij-detail-badge">' + bedrooms + ' BHK</span>';
  if (bathrooms) html += '<span class="hij-detail-badge">' + bathrooms + ' Bath</span>';
  if (area) html += '<span class="hij-detail-badge">' + area + ' sq ft</span>';
  if (distance) html += '<span class="hij-detail-badge">' + distance + ' KM Away</span>';
  html += '</div>';

  // Description
  if (desc) {
    html += '<div class="hij-detail-desc">' + desc + '</div>';
  }

  // Details Grid
  html += '<div class="hij-detail-grid">';
  if (category) html += '<div class="hij-detail-gridItem"><strong>Category</strong>' + category + '</div>';
  if (type) html += '<div class="hij-detail-gridItem"><strong>Type</strong>' + type + '</div>';
  if (purpose) html += '<div class="hij-detail-gridItem"><strong>Purpose</strong>' + purpose + '</div>';
  if (bedrooms) html += '<div class="hij-detail-gridItem"><strong>Bedrooms</strong>' + bedrooms + '</div>';
  if (bathrooms) html += '<div class="hij-detail-gridItem"><strong>Bathrooms</strong>' + bathrooms + '</div>';
  if (area) html += '<div class="hij-detail-gridItem"><strong>Area</strong>' + area + ' sq.ft</div>';
  if (city) html += '<div class="hij-detail-gridItem"><strong>City</strong>' + city + '</div>';
  if (state) html += '<div class="hij-detail-gridItem"><strong>State</strong>' + state + '</div>';
  if (pincode) html += '<div class="hij-detail-gridItem"><strong>Pincode</strong>' + pincode + '</div>';
  if (facing) html += '<div class="hij-detail-gridItem"><strong>Facing</strong>' + facing + '</div>';
  if (floor) html += '<div class="hij-detail-gridItem"><strong>Floor</strong>' + floor + '</div>';
  if (totalFloors) html += '<div class="hij-detail-gridItem"><strong>Total Floors</strong>' + totalFloors + '</div>';
  if (address) html += '<div class="hij-detail-gridItem" style="grid-column:1/-1;"><strong>Address</strong>' + address + '</div>';
  html += '</div>';

  // Price Box
  html += '<div class="hij-detail-priceBox">';
  html += '<p style="font-size:14px;"><strong>Price:</strong> ₹ ' + price + '</p>';
  if (property.Purpose === "Rent") {
    html += '<p style="font-size:14px;color:var(--primary);">Rental Property</p>';
  } else {
    html += '<p style="font-size:14px;color:#666;">For Sale</p>';
  }
  html += '</div>';

  // Actions
  html += '<div class="hij-detail-actions">';

  if (isLogin) {
    if (isOwner) {
      html += `
        <div style="padding:12px;background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;color:#e65100;text-align:center;font-weight:600;font-size:14px;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">info</i> You are the owner of this property.
        </div>
      `;
    } else {
      html += '<button onclick="sendPropertyInterest()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">favorite</i> I\'m Interested</button>';
      html += '<button onclick="contactPropertySeller()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> Contact Seller</button>';
      html += '<button onclick="getPropertyDirections()"><i class="material-icons" style="font-size:18px;vertical-align:middle;">directions</i> Get Directions</button>';

      if (phone) {
        html += '<button onclick="callPropertySeller(\'' + phone + '\')" style="background:#25D366;"><i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Seller</button>';
      }
    }
  } else {
    html += '<div class="hij-detail-guest">';
    html += '<p>Login to contact the owner.</p>';
    html += '<button class="btnLogin" onclick="openPage(\'login\')">Login</button>';
    html += '<button class="btnRegister" onclick="openPage(\'register\')">Register</button>';
    html += '</div>';
  }

  // Share
  html += '<button onclick="shareProperty()" style="background:#666;"><i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share</button>';

  html += '</div>'; // actions
  html += '</div>'; // hij-detail

  container.innerHTML = html;
  enterDetailView("properties");
}


/*
============================================================
INTEREST (Unified)
============================================================
*/

async function sendPropertyInterest() {
  if (!requireLogin()) return;
  if (!CURRENT_PROPERTY) return;

  const userId = getUserId();
  const ownerId = CURRENT_PROPERTY.OwnerUserID || CURRENT_PROPERTY.UserID || "";
  if (userId && ownerId && String(userId) === String(ownerId)) {
    alert("You cannot interact with your own property.");
    return;
  }

  const propertyId = CURRENT_PROPERTY.PropertyID || CURRENT_PROPERTY.propertyId || "";

  try {
    const url = `${getApiUrl()}?action=markinterested&userId=${encodeURIComponent(userId)}&targetType=Property&targetId=${encodeURIComponent(propertyId)}`;
    const res = await fetch(url).then(r => r.json());
    if (res && res.success) {
      alert("Interest request sent to property seller.");
    } else {
      alert(res.message || "Failed to send interest");
    }
  } catch (err) {
    alert("Error sending interest");
  }
}


/*
============================================================
SELLER CONTACT (Preserved)
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
PROPERTY DIRECTIONS (Preserved)
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
SHARE PROPERTY (Preserved)
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

console.log("Properties module loaded (Stage 4HIJ)");