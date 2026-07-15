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

  const profilePhoto = profile.ProfilePhoto || "";

  container.innerHTML =
    `
    <div class="card">

      <div style="text-align:center;margin-bottom:15px;">
        ${profilePhoto
          ? `<img src="${profilePhoto}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);" onerror="this.style.display='none'">`
          : `<div style="width:100px;height:100px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:40px;color:var(--primary);">${(profile.FullName || "U")[0]}</div>`
        }
      </div>

      <h2 style="text-align:center;">
        ${profile.FullName || "-"}
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

  const profilePhoto = p.ProfilePhoto || "";

  container.innerHTML =
    `
    <div class="card">

      <h2>
        Edit Profile
      </h2>

      <!-- Profile Photo Upload -->
      <div style="text-align:center;margin-bottom:15px;">
        ${profilePhoto
          ? `<img src="${profilePhoto}" id="editProfilePhotoPreview" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);">`
          : `<div id="editProfilePhotoPreview" style="width:100px;height:100px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:40px;color:var(--primary);">${(p.FullName || "U")[0]}</div>`
        }
        <div style="margin-top:8px;">
          <input type="file" id="editProfilePhotoInput" accept="image/*" style="font-size:12px;" onchange="handleProfilePhotoUpload(event)">
        </div>
        <input id="editProfilePhoto" style="display:none;" value="${profilePhoto}">
      </div>

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
HANDLE PROFILE PHOTO UPLOAD
*/

async function handleProfilePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const data = await uploadMediaFile(file, "profiles");
    const imageUrl = data.url;

    const input = document.getElementById("editProfilePhoto");
    if (input) {
      input.value = imageUrl;
    }

    // Update preview
    const preview = document.getElementById("editProfilePhotoPreview");
    if (preview) {
      if (preview.tagName === "IMG") {
        preview.src = imageUrl;
      } else {
        // Replace div with img
        preview.outerHTML = `<img src="${imageUrl}" id="editProfilePhotoPreview" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);">`;
      }
    }

    alert("Profile photo uploaded!");
  } catch (err) {
    console.log(err);
    alert("Failed to upload profile photo.");
  }
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

  const profilePhoto =
    document.getElementById(
      "editProfilePhoto"
    ).value.trim();

  try {

    const url = `${getApiUrl()}?action=updateprofile`
      + `&userId=${encodeURIComponent(userId)}`
      + `&fullName=${encodeURIComponent(fullName)}`
      + `&email=${encodeURIComponent(email)}`
      + `&city=${encodeURIComponent(city)}`
      + `&state=${encodeURIComponent(state)}`
      + `&country=${encodeURIComponent(country)}`
      + `&profilePhoto=${encodeURIComponent(profilePhoto)}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      CURRENT_PROFILE.FullName = fullName;
      CURRENT_PROFILE.Email = email;
      CURRENT_PROFILE.City = city;
      CURRENT_PROFILE.State = state;
      CURRENT_PROFILE.Country = country;
      CURRENT_PROFILE.ProfilePhoto = profilePhoto;

      saveCurrentUser(CURRENT_PROFILE);

      alert("Profile updated successfully!");
      renderProfile();
    } else {
      alert(json.message || "Failed to update profile.");
    }

  }
  catch (err) {

    console.log(err);

    alert(
      "Unable to save profile."
    );
  }
}

