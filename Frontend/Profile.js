/*
============================================================
EKKA1KM FRONTEND
Profile.js
Profile + Guest Profile + Edit Profile
V1.1 Trial
============================================================
*/

let CURRENT_PROFILE = {};


/*
============================================================
LOAD PROFILE
============================================================
*/

async function loadProfile() {

  const container =
    document.getElementById(
      "profileCard"
    );

  if (!container)
    return;

  const userId =
    getUserId();

  /*
  ============================================================
  GUEST USER
  ============================================================
  */

  if (!userId) {

    const guestId =
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.GUEST_ID
      ) || "Guest";

    const visits =
      parseInt(
        localStorage.getItem(
          CONFIG.STORAGE_KEYS.TOTAL_VISITS
        ) || "1"
      );

    container.innerHTML =
      `
      <div class="card">

        <h2>
          👤 ${guestId}
        </h2>

        <p>
          Guest User
        </p>

        <p>
          Total Visits:
          ${visits}
        </p>

        <p>
          You can browse products,
          businesses, news and live
          without login.
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

    return;
  }

  /*
  ============================================================
  LOGGED IN USER
  ============================================================
  */

  container.innerHTML =
    "<div class='card'>Loading Profile...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=profile&userId=${userId}`
      );

    const json =
      await response.json();

    CURRENT_PROFILE =
      json.data || {};

    renderProfile();

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load profile.</div>";
  }
}


/*
============================================================
RENDER PROFILE
============================================================
*/

function renderProfile() {

  const container =
    document.getElementById(
      "profileCard"
    );

  if (!container)
    return;

  const profile =
    CURRENT_PROFILE;

  const totalCoins =
    profile.TotalCoins || 0;

  const coinsHome =
    document.getElementById(
      "coinsHome"
    );

  if (coinsHome) {
    coinsHome.innerText =
      totalCoins;
  }

  container.innerHTML =
    `
    <div class="card">

      <h2>
        👤 ${profile.FullName || "-"}
      </h2>

      <p>
        User ID:
        ${profile.UserID || ""}
      </p>

      <p>
        Mobile:
        ${profile.Mobile || ""}
      </p>

      <p>
        Email:
        ${profile.Email || ""}
      </p>

      <p>
        City:
        ${profile.City || ""}
      </p>

      <p>
        State:
        ${profile.State || ""}
      </p>

      <p>
        Country:
        ${profile.Country || ""}
      </p>

      <p>
        Coins:
        ${totalCoins}
      </p>

      <button
        onclick="showEditProfile()">
        Edit Profile
      </button>

      <button
        onclick="logoutUser()"
        style="background:#666;">
        Logout
      </button>

    </div>
    `;
}


/*
============================================================
EDIT PROFILE SCREEN
============================================================
*/

function showEditProfile() {

  const container =
    document.getElementById(
      "profileCard"
    );

  const p =
    CURRENT_PROFILE;

  container.innerHTML =
    `
    <div class="card">

      <h2>
        Edit Profile
      </h2>

      <input
        id="editName"
        placeholder="Full Name"
        value="${p.FullName || ""}">

      <input
        id="editEmail"
        placeholder="Email"
        value="${p.Email || ""}">

      <input
        id="editCity"
        placeholder="City"
        value="${p.City || ""}">

      <input
        id="editState"
        placeholder="State"
        value="${p.State || ""}">

      <input
        id="editCountry"
        placeholder="Country"
        value="${p.Country || ""}">

      <button
        onclick="saveProfile()">
        Save Profile
      </button>

      <button
        onclick="renderProfile()"
        style="background:#666;">
        Cancel
      </button>

    </div>
    `;
}


/*
============================================================
SAVE PROFILE
============================================================
*/

async function saveProfile() {

  const userId =
    getUserId();

  if (!userId)
    return;

  const fullName =
    document.getElementById(
      "editName"
    ).value.trim();

  const email =
    document.getElementById(
      "editEmail"
    ).value.trim();

  const city =
    document.getElementById(
      "editCity"
    ).value.trim();

  const state =
    document.getElementById(
      "editState"
    ).value.trim();

  const country =
    document.getElementById(
      "editCountry"
    ).value.trim();

  try {

    /*
    Future Backend:
    ?action=updateprofile
    */

    CURRENT_PROFILE.FullName =
      fullName;

    CURRENT_PROFILE.Email =
      email;

    CURRENT_PROFILE.City =
      city;

    CURRENT_PROFILE.State =
      state;

    CURRENT_PROFILE.Country =
      country;

    saveCurrentUser(
      CURRENT_PROFILE
    );

    alert(
      "Profile updated locally."
    );

    renderProfile();

  }
  catch (err) {

    console.log(err);

    alert(
      "Unable to save profile."
    );
  }
}

