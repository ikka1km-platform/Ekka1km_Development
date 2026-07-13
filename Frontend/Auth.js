/*
============================================================
EKKA1KM FRONTEND
Auth.js
Login / Register / Session / Logout
V1.1 Trial
============================================================
*/


function getCurrentUser() {

  const data =
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.USER
    );

  if (!data)
    return null;

  try {
    return JSON.parse(data);
  }
  catch (e) {
    return null;
  }
}


function saveCurrentUser(
  user
) {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.USER,
    JSON.stringify(user)
  );
}


function clearCurrentUser() {
  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.USER
  );
}


function getUserId() {

  const user =
    getCurrentUser();

  if (
    !user ||
    !user.UserID
  ) {
    return null;
  }

  return user.UserID;
}


function requireLogin() {

  if (!isLoggedIn()) {

    alert(
      "Please login first."
    );

    openPage(
      "login"
    );

    return false;
  }

  return true;
}


/*
============================================================
LOGIN
============================================================
*/

async function loginUser() {

  const mobile =
    document.getElementById(
      "loginMobile"
    ).value.trim();

  const password =
    document.getElementById(
      "loginPassword"
    ).value.trim();

  if (
    !mobile ||
    !password
  ) {
    alert(
      "Please enter Mobile and Password."
    );
    return;
  }

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=login&mobile=${encodeURIComponent(mobile)}&password=${encodeURIComponent(password)}`
      );

    const json =
      await response.json();

    if (
      json.success ||
      json.status === "SUCCESS"
    ) {

      const user =
        json.data || {};

      saveCurrentUser(
        user
      );

      refreshLoginUI();

      alert(
        "Login Successful"
      );

      openPage(
        "home"
      );

      loadLocation();
    }
    else {

      alert(
        json.message ||
        "Login Failed"
      );
    }

  }
  catch (err) {

    console.log(err);

    alert(
      "Unable to connect to server."
    );
  }
}


/*
============================================================
REGISTER
============================================================
*/

async function registerUser() {

  const fullName =
    document.getElementById(
      "regName"
    ).value.trim();

  const mobile =
    document.getElementById(
      "regMobile"
    ).value.trim();

  const email =
    document.getElementById(
      "regEmail"
    ).value.trim();

  const password =
    document.getElementById(
      "regPassword"
    ).value.trim();

  if (
    !fullName ||
    !mobile ||
    !password
  ) {
    alert(
      "Please fill all fields."
    );
    return;
  }

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=register&fullName=${encodeURIComponent(fullName)}&mobile=${encodeURIComponent(mobile)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      );

    const json =
      await response.json();

    if (
      json.success ||
      json.status === "SUCCESS"
    ) {

      alert(
        "Registration Successful"
      );

      openPage(
        "login"
      );
    }
    else {

      alert(
        json.message ||
        "Registration Failed"
      );
    }

  }
  catch (err) {

    console.log(err);

    alert(
      "Unable to connect to server."
    );
  }
}


/*
============================================================
LOGOUT
============================================================
*/

function logoutUser() {

  if (
    !confirm(
      "Do you want to logout?"
    )
  ) {
    return;
  }

  clearCurrentUser();

  refreshLoginUI();

  alert(
    "Logged Out Successfully"
  );

  openPage(
    "home"
  );

  loadLocation();
}


/*
============================================================
HELPERS
============================================================
*/

function isLoggedIn() {
  return (
    getCurrentUser() !== null
  );
}


function getVisitorId() {

  const user =
    getCurrentUser();

  if (
    user &&
    user.UserID
  ) {
    return user.UserID;
  }

  return (
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.GUEST_ID
    ) || "Guest"
  );
}

