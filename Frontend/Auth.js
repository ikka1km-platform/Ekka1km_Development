/*
============================================================
EKKA1KM FRONTEND
Auth.js
V2.0 - OTP Login / Session / Logout
WhatsApp-style mobile login flow
============================================================
*/


/*
============================================================
SESSION HELPERS
============================================================
*/

function getSessionUser() {

  const data =
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.USER_NEW
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


function saveSessionUser(
  user
) {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.USER_NEW,
    JSON.stringify(user)
  );
}


function clearSessionUser() {
  console.log(
    "clearSessionUser: removing",
    CONFIG.STORAGE_KEYS.USER_NEW,
    "and",
    CONFIG.STORAGE_KEYS.SESSION
  );
  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.USER_NEW
  );
  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.SESSION
  );
}


function getSessionToken() {
  return localStorage.getItem(
    CONFIG.STORAGE_KEYS.SESSION
  );
}


function saveSessionToken(token) {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.SESSION,
    token
  );
}


function getLastMobile() {
  return localStorage.getItem(
    CONFIG.STORAGE_KEYS.LAST_MOBILE
  ) || "";
}


function saveLastMobile(mobile) {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.LAST_MOBILE,
    mobile
  );
}


/*
============================================================
BACKWARD COMPATIBLE GET USER
Checks both old (ekka_user) and new (ekka1km_user) keys
============================================================
*/

function getCurrentUser() {

  // First try new session storage
  const sessionUser =
    getSessionUser();

  if (sessionUser) {
    return sessionUser;
  }

  // Fallback to old storage
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


function getUserId() {

  const user =
    getCurrentUser();

  if (
    !user ||
    (!user.UserID && !user.userId)
  ) {
    return null;
  }

  return user.UserID ||
    user.userId;
}


function isLoggedIn() {
  return (
    getSessionToken() !== null ||
    getSessionUser() !== null ||
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.USER
    ) !== null
  );
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


function getVisitorId() {

  const user =
    getCurrentUser();

  if (
    user &&
    (user.UserID || user.userId)
  ) {
    return user.UserID ||
      user.userId;
  }

  return (
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.GUEST_ID
    ) || "Guest"
  );
}


/*
============================================================
OTP LOGIN - STEP 1: SEND OTP
============================================================
*/

async function sendLoginOTP() {

  const mobile =
    document.getElementById(
      "loginMobile"
    ).value.trim();

  if (!mobile) {
    alert(
      "Please enter your mobile number."
    );
    return;
  }

  if (mobile.length < 10) {
    alert(
      "Please enter a valid 10-digit mobile number."
    );
    return;
  }

  // Show loading state
  const sendBtn =
    document.getElementById(
      "sendOtpBtn"
    );

  const verifySection =
    document.getElementById(
      "otpVerifySection"
    );

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerText =
      "Sending OTP...";
  }

  try {

    const result =
      await OTP.send(mobile);

    if (result.success) {

      // Save mobile for auto-fill
      saveLastMobile(mobile);

      // Show OTP verification section
      if (verifySection) {
        verifySection.style.display =
          "block";
      }

      // Show developer OTP if DEV_MODE
      if (
        CONFIG.DEV_MODE &&
        result.devOtp
      ) {
        const devDisplay =
          document.getElementById(
            "devOtpDisplay"
          );

        if (devDisplay) {
          devDisplay.style.display =
            "block";
          devDisplay.innerHTML =
            "Developer OTP: <strong>" +
            result.devOtp +
            "</strong>";
        }
      }

      // Start resend timer
      startResendTimer();

      // Update status
      updateOtpStatus(
        "OTP sent to " +
        mobile +
        ". Check your phone."
      );

    } else {

      alert(
        result.message ||
        "Failed to send OTP."
      );
    }

  } catch (err) {

    console.log(err);

    alert(
      "Unable to connect. Please try again."
    );
  }

  // Restore button
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.innerText =
      "Send OTP";
  }
}


/*
============================================================
OTP LOGIN - STEP 2: VERIFY OTP
============================================================
*/

async function verifyLoginOTP() {

  const mobile =
    document.getElementById(
      "loginMobile"
    ).value.trim();

  const otp =
    document.getElementById(
      "otpInput"
    ).value.trim();

  if (!otp) {
    alert(
      "Please enter the OTP."
    );
    return;
  }

  if (
    otp.length !== CONFIG.OTP_LENGTH
  ) {
    alert(
      "OTP must be " +
      CONFIG.OTP_LENGTH +
      " digits."
    );
    return;
  }

  // Show loading
  const verifyBtn =
    document.getElementById(
      "verifyOtpBtn"
    );

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerText =
      "Verifying...";
  }

  try {

    const result =
      await OTP.verify(mobile, otp);

    if (result.success) {

      // Save session
      if (result.session) {
        saveSessionToken(
          result.session
        );
      }

      // Save user data (only from backend)
      if (result.user) {
        saveSessionUser(
          result.user
        );
      }

      // Save last mobile
      saveLastMobile(mobile);

      // Hide dev OTP display
      const devDisplay =
        document.getElementById(
          "devOtpDisplay"
        );

      if (devDisplay) {
        devDisplay.style.display =
          "none";
      }

      // Debug: verify session was saved
      console.log("Login success - session:", localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION));
      console.log("Login success - user:", localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW));
      console.log("Login success - isLoggedIn:", isLoggedIn());
      console.log("Login success - getCurrentUser:", getCurrentUser());

      // Update UI
      refreshLoginUI();

      alert(
        "Login Successful!"
      );

      openPage("home");

      // Force profile reload immediately
      if (typeof loadProfile === "function") {
        setTimeout(loadProfile, 100);
      }

      loadLocation();

    } else {

      alert(
        result.message ||
        "OTP verification failed."
      );
    }

  } catch (err) {

    console.log(err);

    alert(
      "Unable to verify. Please try again."
    );
  }

  // Restore button
  if (verifyBtn) {
    verifyBtn.disabled = false;
    verifyBtn.innerText =
      "Verify OTP";
  }
}


/*
============================================================
RESEND TIMER
DEV mode: 5 seconds
Production: 60 seconds
============================================================
*/

let RESEND_TIMER = null;

function startResendTimer() {

  const resendBtn =
    document.getElementById(
      "resendOtpBtn"
    );

  if (!resendBtn)
    return;

  // DEV mode: 5 second countdown for faster testing
  // Production: 60 second countdown
  let seconds =
    CONFIG.DEV_MODE ? 5 : 60;

  resendBtn.disabled = true;

  resendBtn.innerText =
    "Resend in " +
    seconds +
    "s";

  if (RESEND_TIMER) {
    clearInterval(
      RESEND_TIMER
    );
  }

  RESEND_TIMER =
    setInterval(() => {

      seconds--;

      if (seconds <= 0) {

        clearInterval(
          RESEND_TIMER
        );

        RESEND_TIMER = null;

        resendBtn.disabled = false;
        resendBtn.innerText =
          "Resend OTP";

        return;
      }

      resendBtn.innerText =
        "Resend in " +
        seconds +
        "s";

    }, 1000);
}


/*
============================================================
RESEND OTP
============================================================
*/

async function resendOTP() {

  const mobile =
    document.getElementById(
      "loginMobile"
    ).value.trim();

  if (!mobile) {
    alert(
      "Mobile number is required."
    );
    return;
  }

  const resendBtn =
    document.getElementById(
      "resendOtpBtn"
    );

  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.innerText =
      "Resending...";
  }

  try {

    const result =
      await OTP.resend(mobile);

    if (result.success) {

      // Show developer OTP if DEV_MODE
      if (
        CONFIG.DEV_MODE &&
        result.devOtp
      ) {
        const devDisplay =
          document.getElementById(
            "devOtpDisplay"
          );

        if (devDisplay) {
          devDisplay.style.display =
            "block";
          devDisplay.innerHTML =
            "Developer OTP: <strong>" +
            result.devOtp +
            "</strong>";
        }
      }

      startResendTimer();

      updateOtpStatus(
        "New OTP sent to " +
        mobile
      );

    } else {

      alert(
        result.message ||
        "Failed to resend OTP."
      );

      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.innerText =
          "Resend OTP";
      }
    }

  } catch (err) {

    console.log(err);

    alert(
      "Unable to resend OTP."
    );

    if (resendBtn) {
      resendBtn.disabled = false;
      resendBtn.innerText =
        "Resend OTP";
    }
  }
}


/*
============================================================
BACK TO MOBILE INPUT
Allows user to change mobile number
============================================================
*/

function backToMobileInput() {

  // Hide OTP verify section
  const verifySection =
    document.getElementById(
      "otpVerifySection"
    );

  if (verifySection) {
    verifySection.style.display =
      "none";
  }

  // Hide dev OTP display
  const devDisplay =
    document.getElementById(
      "devOtpDisplay"
    );

  if (devDisplay) {
    devDisplay.style.display =
      "none";
  }

  // Hide status
  const statusEl =
    document.getElementById(
      "otpStatus"
    );

  if (statusEl) {
    statusEl.style.display =
      "none";
  }

  // Clear resend timer
  if (RESEND_TIMER) {
    clearInterval(RESEND_TIMER);
    RESEND_TIMER = null;
  }

  // Reset resend button
  const resendBtn =
    document.getElementById(
      "resendOtpBtn"
    );

  if (resendBtn) {
    resendBtn.disabled = true;
    const countdownText =
      CONFIG.DEV_MODE ? "Resend in 5s" : "Resend in 60s";
    resendBtn.innerText = countdownText;
  }

  // Clear OTP storage for this mobile
  const mobile =
    document.getElementById(
      "loginMobile"
    ).value.trim();

  if (mobile) {
    try {
      const key =
        CONFIG.STORAGE_KEYS
          .OTP_STORAGE;

      const stored =
        localStorage.getItem(key);

      if (stored) {
        const data =
          JSON.parse(stored);

        if (data.mobile === mobile) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      // Silently handle
    }
  }

  // Focus on mobile input
  const mobileInput =
    document.getElementById(
      "loginMobile"
    );

  if (mobileInput) {
    mobileInput.focus();
    mobileInput.select();
  }
}


/*
============================================================
UPDATE OTP STATUS
============================================================
*/

function updateOtpStatus(
  message
) {

  const statusEl =
    document.getElementById(
      "otpStatus"
    );

  if (statusEl) {
    statusEl.innerText = message;
    statusEl.style.display =
      "block";
  }
}


/*
============================================================
AUTO-FILL MOBILE ON LOGIN PAGE OPEN
============================================================
*/

function autoFillMobile() {

  const mobileInput =
    document.getElementById(
      "loginMobile"
    );

  if (!mobileInput)
    return;

  const lastMobile =
    getLastMobile();

  if (lastMobile) {
    mobileInput.value =
      lastMobile;

    // Auto-focus OTP if verify section visible
    const verifySection =
      document.getElementById(
        "otpVerifySection"
      );

    if (
      verifySection &&
      verifySection.style.display ===
        "block"
    ) {
      const otpInput =
        document.getElementById(
          "otpInput"
        );

      if (otpInput) {
        otpInput.focus();
      }
    }
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

  // Clear ALL user-related storage keys
  console.log("Logout: clearing all session keys");

  // New session keys
  clearSessionUser();

  // Old keys for backward compat
  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.USER
  );

  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.TOKEN
  );

  // Also clear ekka_user (old name) if it exists
  localStorage.removeItem("ekka_user");
  localStorage.removeItem("ekka_token");
  localStorage.removeItem("ekka_session");

  // Keep last mobile for auto-fill
  // Do NOT clear ekka1km_last_mobile

  console.log(
    "Session after logout:",
    localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION),
    "User after logout:",
    localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW)
  );

  refreshLoginUI();

  alert(
    "Logged Out Successfully"
  );

  openPage("home");

  loadLocation();
}


/*
============================================================
BACKWARD COMPATIBILITY
Save old functions still work
============================================================
*/

function saveCurrentUser(user) {
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