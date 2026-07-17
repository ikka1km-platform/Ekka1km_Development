/*
============================================================
EKKA1KM FRONTEND
Businesses.js
Businesses + Business Details
V1.1 Trial
Guest Mode Supported
============================================================
*/

let CURRENT_BUSINESS = null;


/*
============================================================
LOAD BUSINESSES
============================================================
*/

async function loadBusinesses() {

  const container =
    document.getElementById(
      "businessList"
    );

  if (!container)
    return;

  container.innerHTML =
    "<div class='card'>Loading Businesses...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=businesses&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
      );

    const json =
      await response.json();

    const businesses =
      (json.data &&
        json.data.data) ||
      [];

    if (
      businesses.length === 0
    ) {

      container.innerHTML =
        "<div class='card'>No Businesses Found.</div>";

      return;
    }

    let html = "";

    businesses.forEach(
      business => {

        html += `
        <div class="card">

          <h3>
            ${business.BusinessName || "-"}
          </h3>

          <p>
            ${business.Category || ""}
          </p>

          <p>
            ${business.Address || ""}
          </p>

          ${
            business.DistanceKm
              ? `<span class="badge">${business.DistanceKm} KM Away</span>`
              : ""
          }

          <button
            onclick='showBusinessDetails(${JSON.stringify(business)})'>
            View Details
          </button>

          <button
            onclick='openStorePage(${JSON.stringify(business)})'
            style="background:#0f9d58;">
            Visit Store
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
      "<div class='card'>Unable to load businesses.</div>";
  }
}


/*
============================================================
BUSINESS DETAILS
============================================================
*/

function showBusinessDetails(
  business
) {

  CURRENT_BUSINESS =
    business;

  const container =
    document.getElementById(
      "businessList"
    );

  const isLogin =
    !!getCurrentUser();

  const userId = getUserId();
  const isOwner = userId && (String(business.UserID) === String(userId) || String(business.OwnerUserID) === String(userId));

  let html = `
  <div class="card">

    <h2>
      ${business.BusinessName || "-"}
    </h2>

    <p>
      ${business.Category || ""}
    </p>

    <p>
      ${business.Description || ""}
    </p>

    <p>
      ${business.Address || ""}
    </p>

    <p>
      ${business.City || ""}
    </p>

    <button
      onclick="shareBusiness()">
      Share
    </button>
  `;

  /*
  ============================================================
  LOGGED IN USER
  ============================================================
  */

  if (isLogin) {
    if (isOwner) {
      html += `
        <div style="margin-top:15px;padding:12px;background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;color:#e65100;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">info</i> You are the owner of this business.
        </div>
      `;
    }

    html += `
      <button
        onclick="callBusiness()" ${isOwner ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        Call Business
      </button>

      <button
        onclick="contactBusinessOwner()" ${isOwner ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        Contact Owner
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
          Login to contact this business.
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
      onclick="loadBusinesses()"
      style="background:#666;">
      Back
    </button>

  </div>
  `;

  container.innerHTML =
    html;

  openPage(
    "businesses"
  );

  trackBusinessView();
}


/*
BUSINESS VIEW ANALYTICS
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
CALL BUSINESS
============================================================
*/

function callBusiness() {

  if (
    !requireLogin()
  ) {
    return;
  }

  if (
    !CURRENT_BUSINESS
  ) {
    return;
  }

  const mobile =
    CURRENT_BUSINESS.Mobile ||
    CURRENT_BUSINESS.Phone ||
    "";

  if (!mobile) {

    alert(
      "Business phone number not available."
    );

    return;
  }

  window.location.href =
    `tel:${mobile}`;
}


/*
============================================================
CONTACT OWNER
============================================================
*/

function contactBusinessOwner() {

  if (
    !requireLogin()
  ) {
    return;
  }

  if (
    !CURRENT_BUSINESS
  ) {
    return;
  }

  if (
    typeof notifyBusinessContact ===
    "function"
  ) {
    notifyBusinessContact(
      CURRENT_BUSINESS
    );
  }

  alert(
    "Business enquiry sent."
  );
}


/*
============================================================
SHARE BUSINESS
============================================================
*/

function shareBusiness() {

  if (
    !CURRENT_BUSINESS
  ) {
    return;
  }

  const text =
    `${CURRENT_BUSINESS.BusinessName || ""}\n${CURRENT_BUSINESS.Address || ""}`;

  if (
    navigator.share
  ) {

    navigator.share({
      title:
        CURRENT_BUSINESS.BusinessName,
      text
    });

  } else {

    navigator.clipboard
      .writeText(text);

    alert(
      "Business details copied."
    );
  }
}

