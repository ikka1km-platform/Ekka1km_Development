/*
============================================================
EKKA1KM FRONTEND
Businesses.js
Stage 4HIJ - Businesses Browsing & Detail Experience
V2.0
Preserves all canonical functionality
============================================================
*/

let CURRENT_BUSINESS = null;
let CURRENT_BUSINESSES = [];

/*
============================================================
NAMESPACED HELPERS (Stage 4HIJ)
============================================================
*/

function businessSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}

/*
ESCAPE HTML
*/

function escapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  var am = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var qt = String.fromCharCode(38) + "quot;";
  var ap = String.fromCharCode(38) + "#39;";
  return s.replace(/&/g, am).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, qt).replace(/'/g, ap);
}


/*
============================================================
LOAD BUSINESSES — Stage 4HIJ Redesign
============================================================
*/

async function loadBusinesses() {
  const container = document.getElementById("businessList");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">store</i><p>Loading Businesses...</p></div>';

  try {
    const response = await fetch(
      `${getApiUrl()}?action=businesses&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const businesses = (json.data && json.data.data) || [];

    if (businesses.length === 0) {
      container.innerHTML = '<div class="hij-empty"><i class="material-icons">store</i><p>No Businesses Found.</p></div>';
      if (typeof renderHomeBusinessesPreview === "function") {
        renderHomeBusinessesPreview(businesses);
      }
      return;
    }

    let html = '<div class="business-listing">';

    businesses.forEach(business => {
      const name = businessSafeRender(business.BusinessName) || "-";
      const category = businessSafeRender(business.Category);
      const desc = businessSafeRender(business.Description);
      const address = businessSafeRender(business.Address);
      const city = businessSafeRender(business.City);
      const state = businessSafeRender(business.State);
      const distance = businessSafeRender(business.DistanceKm);
      const logo = businessSafeRender(business.Logo);
      const phone = businessSafeRender(business.Phone) || businessSafeRender(business.Mobile);
      const email = businessSafeRender(business.Email);
      const businessId = business.BusinessID || business.businessId || "";

      html += `
        <div class="businessCard" onclick='showBusinessDetailsById("${businessId}")'>
          <div class="businessCard-header">
            <div class="businessCard-logo">
              ${logo
                ? `<img src="${logo}" alt="${name}" onerror="this.parentElement.innerHTML='<span class=\\'businessCard-logoPlaceholder\\'>${name.charAt(0)}</span>'">`
                : `<span class="businessCard-logoPlaceholder">${name.charAt(0)}</span>`
              }
            </div>
            <div class="businessCard-info">
              <div class="businessCard-name">${name}</div>
              ${category ? `<div class="businessCard-category">${category}</div>` : ""}
            </div>
          </div>
          <div class="businessCard-body">
            ${desc ? `<div class="businessCard-desc">${desc}</div>` : ""}
            <div class="businessCard-details">
              ${city ? `<span class="businessCard-detail"><i class="material-icons">location_on</i> ${city}${state ? ", " + state : ""}</span>` : ""}
              ${distance ? `<span class="businessCard-detail"><i class="material-icons">near_me</i> ${distance} KM</span>` : ""}
              ${phone ? `<span class="businessCard-detail"><i class="material-icons">phone</i> ${phone}</span>` : ""}
            </div>
            <div class="businessCard-actions">
              <button class="productCard-btnPrimary" onclick='event.stopPropagation();showBusinessDetailsById("${businessId}")'>View Details</button>
              <button class="productCard-btnSecondary" onclick='event.stopPropagation();openStorePage(${JSON.stringify(business)})'>Visit Store</button>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Store businesses for detail view lookup
    CURRENT_BUSINESSES = businesses;
    
    // Also render Home preview from the same dataset
    if (typeof renderHomeBusinessesPreview === "function") {
      renderHomeBusinessesPreview(businesses);
    }
  } catch (err) {
    console.log(err);
    container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Unable to load businesses.</p></div>';
  }
}


/*
HOME PREVIEW — BUSINESSES NEAR YOU (Preserved)
*/

function renderHomeBusinessesPreview(businesses) {
  const container = document.getElementById("homeBusinessesNearYouContent");
  if (!container) return;

  if (!businesses || businesses.length === 0) {
    container.innerHTML = '<div class="homeSection-empty">No businesses found nearby.</div>';
    return;
  }

  const preview = businesses.slice(0, 4);
  let html = '<div class="homePreviewGrid">';

  preview.forEach(business => {
    const businessId = business.BusinessID || business.businessId || "";
    const name = business.BusinessName || "-";
    const category = business.Category || "";
    const distance = business.DistanceKm ? `${business.DistanceKm} KM away` : "";
    const rating = business.Rating || "";
    const logo = business.Logo || "";
    const coverImage = business.CoverImage || "";

    html += `
      <div class="homePreviewCard" onclick='showBusinessDetailsById("${businessId}")'>
        ${coverImage
          ? `<div class="homePreviewCard-img"><img src="${coverImage}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'homePreviewCard-img homePreviewCard-imgPlaceholder\\'><span class=\\'material-icons\\'>store</span></div>'"></div>`
          : `<div class="homePreviewCard-img homePreviewCard-imgPlaceholder"><span class="material-icons">store</span></div>`
        }
        <div class="homePreviewCard-wishlist" onclick='event.stopPropagation(); toggleInterest(this, "${businessId}", "Business")'>
          <i class="material-icons">favorite_border</i>
        </div>
        <div class="homePreviewCard-body">
          <div class="homePreviewCard-title">${name}</div>
          ${category ? `<div class="homePreviewCard-meta">${category}</div>` : ""}
          ${distance ? `<div class="homePreviewCard-meta">${distance}</div>` : ""}
          ${rating ? `<div class="homePreviewCard-meta">⭐ ${rating}</div>` : ""}
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}


/*
============================================================
BUSINESS DETAILS — Stage 4HIJ Redesign
============================================================
*/

function showBusinessDetailsById(businessId) {
  // Find business in loaded data first
  const business = CURRENT_BUSINESSES && CURRENT_BUSINESSES.length > 0 
    ? CURRENT_BUSINESSES.find(b => String(b.BusinessID || b.businessId) === String(businessId))
    : null;
  
  if (business) {
    showBusinessDetails(business);
  } else {
    // Fetch from server
    fetch(`${getApiUrl()}?action=business&id=${encodeURIComponent(businessId)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          showBusinessDetails(res.data);
        } else {
          alert("Business not found.");
        }
      })
      .catch(err => {
        console.log("Business fetch error:", err);
        alert("Unable to load business details.");
      });
  }
}

function showBusinessDetails(business) {
  if (!business) return;
  CURRENT_BUSINESS = business;

  const container = document.getElementById("businessList");
  if (!container) return;

  const isLogin = !!getCurrentUser();
  const userId = getUserId();
  const isOwner = userId && (String(business.UserID) === String(userId) || String(business.OwnerUserID) === String(userId));

  const name = businessSafeRender(business.BusinessName) || "-";
  const category = businessSafeRender(business.Category);
  const desc = businessSafeRender(business.Description);
  const address = businessSafeRender(business.Address);
  const city = businessSafeRender(business.City);
  const state = businessSafeRender(business.State);
  const pincode = businessSafeRender(business.Pincode);
  const phone = businessSafeRender(business.Phone) || businessSafeRender(business.Mobile);
  const email = businessSafeRender(business.Email);
  const website = businessSafeRender(business.Website);
  const logo = businessSafeRender(business.Logo);
  const coverImage = businessSafeRender(business.CoverImage);
  const openTime = businessSafeRender(business.OpenTime) || businessSafeRender(business.OpeningTime);
  const closeTime = businessSafeRender(business.CloseTime) || businessSafeRender(business.ClosingTime);
  const distance = businessSafeRender(business.DistanceKm);

  let html = '<div class="hij-detail">';

  // Back button
  html += `<button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back to Businesses</button>`;

  // Cover + Logo
  html += '<div style="position:relative;margin-bottom:14px;">';
  if (coverImage) {
    html += `<div style="width:100%;height:140px;border-radius:var(--radius-lg);overflow:hidden;background:linear-gradient(135deg,var(--primary),#43a047);">
      <img src="${coverImage}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
    </div>`;
  } else {
    html += `<div style="width:100%;height:100px;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--primary),#43a047);"></div>`;
  }

  html += `<div style="display:flex;align-items:flex-end;gap:12px;margin-top:-40px;padding:0 14px;">`;
  if (logo) {
    html += `<div style="width:72px;height:72px;border-radius:16px;overflow:hidden;border:3px solid #fff;background:#e8f5e9;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.1);">
      <img src="${logo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
    </div>`;
  } else {
    html += `<div style="width:72px;height:72px;border-radius:16px;border:3px solid #fff;background:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.1);">
      <span style="font-size:28px;font-weight:700;color:#fff;">${name.charAt(0)}</span>
    </div>`;
  }
  html += '</div>';
  html += '</div>';

  // Name & Category
  html += `<div class="hij-detail-title">${name}</div>`;
  if (category) html += `<div style="font-size:13px;color:var(--primary);font-weight:500;margin-bottom:8px;">${category}</div>`;

  // Description
  if (desc) html += `<div class="hij-detail-desc">${desc}</div>`;

  // Details Grid
  html += '<div class="hij-detail-grid">';
  if (address) html += `<div class="hij-detail-gridItem" style="grid-column:1/-1;"><strong>Address</strong>${address}</div>`;
  if (city) html += `<div class="hij-detail-gridItem"><strong>City</strong>${city}${state ? ", " + state : ""}</div>`;
  if (pincode) html += `<div class="hij-detail-gridItem"><strong>Pincode</strong>${pincode}</div>`;
  if (distance) html += `<div class="hij-detail-gridItem"><strong>Distance</strong>${distance} KM</div>`;
  if (phone) html += `<div class="hij-detail-gridItem"><strong>Phone</strong>${phone}</div>`;
  if (email) html += `<div class="hij-detail-gridItem"><strong>Email</strong>${email}</div>`;
  if (website) html += `<div class="hij-detail-gridItem" style="grid-column:1/-1;"><strong>Website</strong>${website}</div>`;
  if (openTime) html += `<div class="hij-detail-gridItem"><strong>Opens</strong>${openTime}</div>`;
  if (closeTime) html += `<div class="hij-detail-gridItem"><strong>Closes</strong>${closeTime}</div>`;
  html += '</div>';

  // Actions
  html += '<div class="hij-detail-actions">';

  if (isLogin) {
    if (isOwner) {
      html += `
        <div style="padding:12px;background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;color:#e65100;text-align:center;font-weight:600;font-size:14px;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">info</i> You are the owner of this business.
        </div>
      `;
    } else {
      html += `
        <button onclick="sendBusinessInterest()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">favorite</i> I'm Interested
        </button>

        <button onclick="callBusiness()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">call</i> Call Business
        </button>

        <button onclick="contactBusinessOwner()">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">chat</i> Contact Owner
        </button>
      `;
    }
  } else {
    html += `
      <div class="hij-detail-guest">
        <p>Login to contact this business.</p>
        <button class="btnLogin" onclick="openPage('login')">Login</button>
        <button class="btnRegister" onclick="openPage('register')">Register</button>
      </div>
    `;
  }

  // Share
  html += `<button onclick="shareBusiness()" style="background:#666;">
    <i class="material-icons" style="font-size:18px;vertical-align:middle;">share</i> Share
  </button>`;

  html += '</div>'; // actions
  html += '</div>'; // hij-detail

  container.innerHTML = html;
  enterDetailView("businesses");
  trackBusinessView();
}


/*
BUSINESS VIEW ANALYTICS (Preserved)
*/

function trackBusinessView() {
  if (CURRENT_BUSINESS) {
    const userId = getUserId();
    const business = CURRENT_BUSINESS;

    // Client-side skip for owner
    const isOwner = userId && (String(business.UserID) === String(userId) || String(business.OwnerUserID) === String(userId));
    if (isOwner) return;

    fetch(`${getApiUrl()}?action=trackevent&eventType=BusinessView&entityType=Business&entityId=${business.BusinessID}&userId=${userId || ""}&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`)
      .catch(err => console.log("trackBusinessView error:", err));
  }
}


/*
============================================================
INTEREST (Unified)
============================================================
*/

async function sendBusinessInterest() {
  if (!requireLogin()) return;
  if (!CURRENT_BUSINESS) return;

  const userId = getUserId();
  const ownerId = CURRENT_BUSINESS.OwnerUserID || CURRENT_BUSINESS.UserID || "";
  if (userId && ownerId && String(userId) === String(ownerId)) {
    alert("You cannot interact with your own business.");
    return;
  }

  const businessId = CURRENT_BUSINESS.BusinessID || CURRENT_BUSINESS.businessId || "";

  try {
    const url = `${getApiUrl()}?action=markinterested&userId=${encodeURIComponent(userId)}&targetType=Business&targetId=${encodeURIComponent(businessId)}`;
    const res = await fetch(url).then(r => r.json());
    if (res && res.success) {
      alert("Interest request sent to business owner.");
    } else {
      alert(res.message || "Failed to send interest");
    }
  } catch (err) {
    alert("Error sending interest");
  }
}


/*
============================================================
CALL BUSINESS (Preserved)
============================================================
*/

function callBusiness() {
  if (!requireLogin()) return;
  if (!CURRENT_BUSINESS) return;

  const mobile = CURRENT_BUSINESS.Mobile || CURRENT_BUSINESS.Phone || "";
  if (!mobile) {
    alert("Business phone number not available.");
    return;
  }
  window.location.href = `tel:${mobile}`;
}


/*
============================================================
CONTACT OWNER (Preserved)
============================================================
*/

function contactBusinessOwner() {
  if (!requireLogin()) return;
  if (!CURRENT_BUSINESS) return;

  if (typeof notifyBusinessContact === "function") {
    notifyBusinessContact(CURRENT_BUSINESS);
  }
  alert("Business enquiry sent.");
}


/*
============================================================
SHARE BUSINESS (Preserved)
============================================================
*/

function shareBusiness() {
  if (!CURRENT_BUSINESS) return;

  const text = `${CURRENT_BUSINESS.BusinessName || ""}\n${CURRENT_BUSINESS.Address || ""}`;

  if (navigator.share) {
    navigator.share({
      title: CURRENT_BUSINESS.BusinessName,
      text
    });
  } else {
    navigator.clipboard.writeText(text);
    alert("Business details copied.");
  }
}