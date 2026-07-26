/*
============================================================
EKKA1KM FRONTEND
Profile.js
Stage 4E — Profile & Account Experience
Mobile-first identity card, account info, location,
personal navigation, and session actions.
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
      <div class="card guestProfileCard">

        <div class="profileIdentityCard">
          <div class="profileAvatarLarge">
            <span class="material-icons" style="font-size:48px;color:#ccc;">person</span>
          </div>
          <h2 style="margin-top:12px;">${guestId}</h2>
          <p class="profileLabel">Guest User</p>
          <p class="profileMeta">Total Visits: ${visits}</p>
        </div>

        <div class="profileNavSection">
          <div class="profileNavRow" onclick="openPage('login')">
            <span class="material-icons profileNavIcon">login</span>
            <span class="profileNavLabel">Login</span>
            <span class="material-icons profileNavChevron">chevron_right</span>
          </div>
          <div class="profileNavRow" onclick="openPage('register')">
            <span class="material-icons profileNavIcon">person_add</span>
            <span class="profileNavLabel">Create Account</span>
            <span class="material-icons profileNavChevron">chevron_right</span>
          </div>
          <div class="profileNavRow" onclick="openPage('home')">
            <span class="material-icons profileNavIcon">home</span>
            <span class="profileNavLabel">Continue As Guest</span>
            <span class="material-icons profileNavChevron">chevron_right</span>
          </div>
        </div>

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
    "<div class='card' style='text-align:center;padding:30px;'>Loading Profile...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=profile&userId=${userId}`
      );

    const json =
      await response.json();

    if (json.success || json.status === "SUCCESS") {
      CURRENT_PROFILE =
        json.data || {};
      renderProfile();
      return;
    }

    // Backend unavailable - use cached user data from localStorage
    console.log("Backend profile unavailable, using cached user data");
    const cached = getCurrentUser();
    if (cached) {
      CURRENT_PROFILE = cached;
      renderProfile();
      return;
    }

    container.innerHTML =
      "<div class='card' style='text-align:center;padding:30px;'>Unable to load profile.</div>";

  }
  catch (err) {

    console.log(err);

    // Backend error - use cached user data from localStorage
    const cached = getCurrentUser();
    if (cached) {
      console.log("Backend error, using cached user data");
      CURRENT_PROFILE = cached;
      renderProfile();
      return;
    }

    container.innerHTML =
      "<div class='card' style='text-align:center;padding:30px;'>Unable to load profile.</div>";
  }
}


/*
============================================================
SAFE RENDER HELPER
Prevents undefined/null/NaN/Invalid Date from displaying.
============================================================
*/

function safeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}


/*
============================================================
GET HUMAN-READABLE LOCATION
Reuses existing APP.searchCenter and localStorage for display.
============================================================
*/

function getProfileLocationDisplay() {
  // Try APP.searchCenter (set by SearchLocation.js)
  if (window.APP && APP.searchCenter && APP.searchCenter.name) {
    return safeRender(APP.searchCenter.name);
  }

  // Try cached search center from localStorage
  try {
    var cached = localStorage.getItem(CONFIG.STORAGE_KEYS.SEARCH_CENTER);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.name) {
        return safeRender(parsed.name);
      }
    }
  } catch (e) { /* silent */ }

  // Fall back to GPS text if available
  var gpsText = document.getElementById("gpsText");
  if (gpsText) {
    var text = safeRender(gpsText.textContent);
    if (text && text.indexOf("GPS:") !== -1) {
      // Return a cleaned-up version without raw coords
      return "Current Location";
    }
    if (text) return text;
  }

  return "Set your location";
}


/*
===========================================================
RENDER PROFILE
===========================================================
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

  // Update coins in header if present
  const totalCoins =
    Number(profile.TotalCoins || 0);

  const coinsHome =
    document.getElementById(
      "coinsHome"
    );

  if (coinsHome) {
    coinsHome.innerText =
      totalCoins;
  }

  /*
  ============================================================
  Safely extract fields
  ============================================================
  */

  var fullName = safeRender(profile.FullName) || safeRender(profile.Name) || "User";
  var mobile = safeRender(profile.Mobile) || safeRender(profile.Phone) || "";
  var email = safeRender(profile.Email) || safeRender(profile.email) || "";
  var city = safeRender(profile.City) || "";
  var state = safeRender(profile.State) || "";
  var country = safeRender(profile.Country) || "";
  var profilePhoto = safeRender(profile.ProfilePhoto) || safeRender(profile.profilePhoto) || "";
  var status = safeRender(profile.Status) || safeRender(profile.VerificationStatus) || "";

  // Verification state: only show if meaningful
  var isVerified = (status.toLowerCase() === "active" || status.toLowerCase() === "verified");
  var showVerification = isVerified || (status.length > 0 && status.toLowerCase() !== "pending");

  var initial = fullName.charAt(0).toUpperCase();

  // Avatar HTML
  var avatarHtml = "";
  if (profilePhoto && profilePhoto.indexOf("http") === 0) {
    avatarHtml = '<img src="' + profilePhoto + '" class="profileAvatarImage" alt="Profile" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div class=\\\'profileAvatarInitial\\\'>' + initial + '</div>\'">';
  } else {
    avatarHtml = '<div class="profileAvatarInitial">' + initial + '</div>';
  }

  // Verification badge
  var verifBadge = "";
  if (isVerified) {
    verifBadge = '<span class="profileVerifBadge verified">Verified</span>';
  } else if (showVerification) {
    verifBadge = '<span class="profileVerifBadge pending">' + safeRender(status) + '</span>';
  }

  // Build location display
  var locationDisplay = getProfileLocationDisplay();
  var hasProfileCity = city || state;
  var locationLine = hasProfileCity ? (city + (city && state ? ", " : "") + state) : "";

  /*
  ============================================================
  SECTION 1: IDENTITY CARD
  ============================================================
  */

  var html = '';
  html += '<div class="profileSection">';

  html += '<div class="profileIdentityCard">';
  html += '  <div class="profileAvatarWrap">' + avatarHtml + '</div>';
  html += '  <h2 class="profileName">' + fullName + '</h2>';
  html += '  <p class="profileMobile">' + mobile + '</p>';
  if (verifBadge) {
    html += '  <div class="profileVerifRow">' + verifBadge + '</div>';
  }
  html += '</div>';

  html += '</div>';

  /*
  ============================================================
  SECTION 2: ACCOUNT INFORMATION
  ============================================================
  */

  html += '<div class="profileSection">';
  html += '  <div class="profileSectionHeader">';
  html += '    <span class="material-icons profileSectionIcon">info</span>';
  html += '    <span class="profileSectionTitle">Account Information</span>';
  html += '    <span class="profileEditLink" onclick="showEditProfile()">Edit</span>';
  html += '  </div>';

  html += '  <div class="profileInfoGrid">';
  html += '    <div class="profileInfoItem">';
  html += '      <span class="profileInfoLabel">Full Name</span>';
  html += '      <span class="profileInfoValue">' + fullName + '</span>';
  html += '    </div>';
  html += '    <div class="profileInfoItem">';
  html += '      <span class="profileInfoLabel">Mobile</span>';
  html += '      <span class="profileInfoValue profileInfoReadonly">' + mobile + '</span>';
  html += '    </div>';

  if (email) {
    html += '    <div class="profileInfoItem">';
    html += '      <span class="profileInfoLabel">Email</span>';
    html += '      <span class="profileInfoValue">' + email + '</span>';
    html += '    </div>';
  }

  if (city) {
    html += '    <div class="profileInfoItem">';
    html += '      <span class="profileInfoLabel">City</span>';
    html += '      <span class="profileInfoValue">' + city + '</span>';
    html += '    </div>';
  }

  if (state) {
    html += '    <div class="profileInfoItem">';
    html += '      <span class="profileInfoLabel">State</span>';
    html += '      <span class="profileInfoValue">' + state + '</span>';
    html += '    </div>';
  }

  if (country) {
    html += '    <div class="profileInfoItem">';
    html += '      <span class="profileInfoLabel">Country</span>';
    html += '      <span class="profileInfoValue">' + country + '</span>';
    html += '    </div>';
  }

  html += '  </div>';
  html += '</div>';

  /*
  ============================================================
  SECTION 3: LOCATION
  Uses existing Stage 2 location architecture.
  ============================================================
  */

  html += '<div class="profileSection">';
  html += '  <div class="profileSectionHeader">';
  html += '    <span class="material-icons profileSectionIcon">location_on</span>';
  html += '    <span class="profileSectionTitle">Location</span>';
  html += '  </div>';

  html += '  <div class="profileLocationCard" onclick="openSearchModal()">';
  html += '    <div class="profileLocationInfo">';
  html += '      <span class="profileLocationLabel">Your Location</span>';
  html += '      <span class="profileLocationValue">' + locationDisplay + '</span>';
  if (locationLine && locationLine !== locationDisplay) {
    html += '      <span class="profileLocationSub">' + locationLine + '</span>';
  }
  html += '    </div>';
  html += '    <span class="material-icons profileLocationAction">edit_location</span>';
  html += '  </div>';

  html += '</div>';

  /*
  ============================================================
  SECTION 4: PERSONAL NAVIGATION
  Reuses existing page navigation - no data fetching.
  ============================================================
  */

  html += '<div class="profileSection">';
  html += '  <div class="profileSectionHeader">';
  html += '    <span class="material-icons profileSectionIcon">navigation</span>';
  html += '    <span class="profileSectionTitle">Personal</span>';
  html += '  </div>';

  html += '  <div class="profileNavSection">';

  html += '    <div class="profileNavRow" onclick="openPage(\'myContent\')">';
  html += '      <span class="material-icons profileNavIcon">folder</span>';
  html += '      <div class="profileNavText">';
  html += '        <span class="profileNavLabel">My Content</span>';
  html += '        <span class="profileNavDesc">Manage your posts</span>';
  html += '      </div>';
  html += '      <span class="material-icons profileNavChevron">chevron_right</span>';
  html += '    </div>';

  html += '    <div class="profileNavRow" onclick="openPage(\'wallet\')">';
  html += '      <span class="material-icons profileNavIcon">account_balance_wallet</span>';
  html += '      <div class="profileNavText">';
  html += '        <span class="profileNavLabel">Wallet</span>';
  html += '        <span class="profileNavDesc">Coins and transactions</span>';
  html += '      </div>';
  html += '      <span class="material-icons profileNavChevron">chevron_right</span>';
  html += '    </div>';

  html += '    <div class="profileNavRow" onclick="openPage(\'notifications\')">';
  html += '      <span class="material-icons profileNavIcon">notifications</span>';
  html += '      <div class="profileNavText">';
  html += '        <span class="profileNavLabel">Notifications</span>';
  html += '        <span class="profileNavDesc">Your alerts and updates</span>';
  html += '      </div>';
  html += '      <span class="material-icons profileNavChevron">chevron_right</span>';
  html += '    </div>';

  html += '    <div class="profileNavRow" onclick="openPage(\'promotions\')">';
  html += '      <span class="material-icons profileNavIcon">trending_up</span>';
  html += '      <div class="profileNavText">';
  html += '        <span class="profileNavLabel">Promotions</span>';
  html += '        <span class="profileNavDesc">Manage your promotions</span>';
  html += '      </div>';
  html += '      <span class="material-icons profileNavChevron">chevron_right</span>';
  html += '    </div>';

  html += '  </div>';
  html += '</div>';

  /*
  ============================================================
  SECTION 5: ACCOUNT / SESSION ACTIONS
  Reuses canonical logoutUser().
  ============================================================
  */

  html += '<div class="profileSection">';
  html += '  <div class="profileSectionHeader">';
  html += '    <span class="material-icons profileSectionIcon">settings</span>';
  html += '    <span class="profileSectionTitle">Account</span>';
  html += '  </div>';

  html += '  <div class="profileNavSection">';

  html += '    <div class="profileNavRow profileLogoutRow" onclick="logoutUser()">';
  html += '      <span class="material-icons profileNavIcon profileLogoutIcon">logout</span>';
  html += '      <div class="profileNavText">';
  html += '        <span class="profileNavLabel profileLogoutLabel">Logout</span>';
  html += '        <span class="profileNavDesc">Sign out of your account</span>';
  html += '      </div>';
  html += '      <span class="material-icons profileNavChevron">chevron_right</span>';
  html += '    </div>';

  html += '  </div>';
  html += '</div>';

  container.innerHTML = html;
}


/*
============================================================
EDIT PROFILE SCREEN
Preserves existing ImageKit/ProfilePhoto functionality.
Mobile is read-only (no edit field).
============================================================
*/

function showEditProfile() {

  const container =
    document.getElementById(
      "profileCard"
    );

  const p =
    CURRENT_PROFILE;

  const profilePhoto = safeRender(p.ProfilePhoto) || safeRender(p.profilePhoto) || "";
  const fullName = safeRender(p.FullName) || safeRender(p.Name) || "";
  const email = safeRender(p.Email) || safeRender(p.email) || "";
  const city = safeRender(p.City) || "";
  const state = safeRender(p.State) || "";
  const country = safeRender(p.Country) || "";
  const mobile = safeRender(p.Mobile) || "";
  const initial = fullName.charAt(0).toUpperCase() || "U";

  // Avatar preview
  var avatarPreviewHtml = "";
  if (profilePhoto && profilePhoto.indexOf("http") === 0) {
    avatarPreviewHtml = '<img src="' + profilePhoto + '" id="editProfilePhotoPreview" class="editProfilePhotoPreview" alt="Profile" onerror="this.outerHTML=\'<div id=\\\'editProfilePhotoPreview\\\' class=\\\'editProfilePhotoPlaceholder\\\'>' + initial + '</div>\'">';
  } else {
    avatarPreviewHtml = '<div id="editProfilePhotoPreview" class="editProfilePhotoPlaceholder">' + initial + '</div>';
  }

  container.innerHTML =
    `
    <div class="card editProfileCard">

      <div class="editProfileHeader">
        <span class="material-icons editProfileBackIcon" onclick="renderProfile()">arrow_back</span>
        <h2 class="editProfileTitle">Edit Profile</h2>
      </div>

      <!-- Profile Photo -->
      <div class="editProfilePhotoSection">
        ${avatarPreviewHtml}
        <div class="editProfilePhotoUploadRow">
          <input type="file" id="editProfilePhotoInput" accept="image/*" style="display:none;" onchange="handleProfilePhotoUpload(event)">
          <button class="editProfilePhotoBtn" onclick="document.getElementById('editProfilePhotoInput').click()">
            <span class="material-icons" style="font-size:18px;">camera_alt</span>
            Change Photo
          </button>
        </div>
        <input id="editProfilePhoto" type="hidden" value="${profilePhoto}">
      </div>

      <!-- Editable Fields -->
      <div class="editProfileFields">

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">Full Name</label>
          <input id="editName" class="editProfileInput" placeholder="Full Name" value="${fullName}">
        </div>

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">Mobile (read-only)</label>
          <input class="editProfileInput editProfileInputReadonly" value="${mobile}" disabled>
        </div>

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">Email</label>
          <input id="editEmail" class="editProfileInput" placeholder="Email" value="${email}" type="email">
        </div>

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">City</label>
          <input id="editCity" class="editProfileInput" placeholder="City" value="${city}">
        </div>

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">State</label>
          <input id="editState" class="editProfileInput" placeholder="State" value="${state}">
        </div>

        <div class="editProfileFieldGroup">
          <label class="editProfileFieldLabel">Country</label>
          <input id="editCountry" class="editProfileInput" placeholder="Country" value="${country}">
        </div>

      </div>

      <!-- Actions -->
      <div class="editProfileActions">
        <button class="editProfileSaveBtn" onclick="saveProfile()">
          <span class="material-icons" style="font-size:18px;">check</span>
          Save Changes
        </button>
        <button class="editProfileCancelBtn" onclick="renderProfile()">
          Cancel
        </button>
      </div>

    </div>
    `;
}


/*
============================================================
HANDLE PROFILE PHOTO UPLOAD
Preserved from existing implementation - ImageKit based.
============================================================
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
        preview.outerHTML = '<img src="' + imageUrl + '" id="editProfilePhotoPreview" class="editProfilePhotoPreview" alt="Profile">';
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
Preserves existing backend endpoint.
Mobile is NOT sent (read-only).
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