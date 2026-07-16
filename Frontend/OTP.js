/*
============================================================
EKKA1KM FRONTEND
OTP.js
V2.2 - OTP Provider Abstraction (LOCAL + MSG91)
Switch by CONFIG.OTP_PROVIDER only
============================================================
*/


/*
============================================================
OTP PROVIDER API
Provider-agnostic interface
============================================================
*/

const OTP = {

  /*
  ============================================================
  SEND OTP
  Returns: { success, message, devOtp? }
  ============================================================
  */

  async send(mobile) {

    const provider =
      CONFIG.OTP_PROVIDER || "LOCAL";

    if (provider === "LOCAL") {
      return await this._localSend(mobile);
    }

    if (provider === "MSG91") {
      return await this._msg91Send(mobile);
    }

    return {
      success: false,
      message: "Unknown OTP provider: " + provider
    };
  },


  /*
  ============================================================
  VERIFY OTP
  Returns: { success, message, session?, user?, mobile? }
  ============================================================
  */

  async verify(mobile, otp) {

    const provider =
      CONFIG.OTP_PROVIDER || "LOCAL";

    if (provider === "LOCAL") {
      return await this._localVerify(mobile, otp);
    }

    if (provider === "MSG91") {
      return await this._msg91Verify(mobile, otp);
    }

    return {
      success: false,
      message: "Unknown OTP provider: " + provider
    };
  },


  /*
  ============================================================
  RESEND OTP
  Clears old OTP and sends a new one
  ============================================================
  */

  async resend(mobile) {

    // Clear existing OTP
    this._clearLocalOtp(mobile);

    return await this.send(mobile);
  },


  /*
  ============================================================
  CLEAR LOCAL OTP
  ============================================================
  */

  _clearLocalOtp(mobile) {
    try {
      const key = CONFIG.STORAGE_KEYS.OTP_STORAGE;
      const stored = localStorage.getItem(key);

      if (stored) {
        const data = JSON.parse(stored);

        if (data.mobile === mobile) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      // Silently handle
    }
  },


  /*
  ============================================================
  LOCAL PROVIDER - SEND
  ============================================================
  */

  async _localSend(mobile) {

    try {

      // Generate 6-digit OTP
      const otp =
        String(
          Math.floor(
            100000 +
            Math.random() *
            900000
          )
        );

      // Store with expiry and attempts
      const now =
        new Date().getTime();

      const storageData = {
        mobile: mobile,
        otp: otp,
        attempts: 0,
        createdAt: now,
        expiresAt:
          now +
          CONFIG.OTP_EXPIRY_MINUTES *
          60 * 1000
      };

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.OTP_STORAGE,
        JSON.stringify(storageData)
      );

      console.log(
        "OTP storage:",
        localStorage.getItem(CONFIG.STORAGE_KEYS.OTP_STORAGE)
      );

      // Also call backend for production readiness
      try {
        const response =
          await fetch(
            getApiUrl() +
            "?action=sendotp" +
            "&mobile=" +
            encodeURIComponent(mobile)
          );
        const json =
          await response.json();
      } catch (err) {
        // Backend call is optional for LOCAL mode
        console.log(
          "Backend OTP send: " +
          (err.message || "network issue")
        );
      }

      const result = {
        success: true,
        message: "OTP sent successfully",
        devOtp: CONFIG.DEV_MODE
          ? otp
          : null,
        mobile: mobile
      };

      return result;

    } catch (err) {

      return {
        success: false,
        message: "Failed to send OTP: " +
          err.message
      };
    }
  },


  /*
  ============================================================
  LOCAL PROVIDER - VERIFY
  Verify against localStorage only.
  Then get user from backend via loginbymobile.
  If backend unavailable, return error.
  NO LOCAL TEMPORARY USER CREATION.
  ============================================================
  */

  async _localVerify(mobile, otp) {

    try {

      const stored =
        localStorage.getItem(
          CONFIG.STORAGE_KEYS.OTP_STORAGE
        );

      if (!stored) {

        return {
          success: false,
          message:
            "No OTP found. Please request a new OTP."
        };
      }

      let data;

      try {
        data = JSON.parse(stored);
      } catch (err) {

        return {
          success: false,
          message:
            "Invalid OTP data. Please request a new OTP."
        };
      }

      // Check mobile match
      if (data.mobile !== mobile) {

        return {
          success: false,
          message:
            "OTP was sent to a different number."
        };
      }

      // Check expiry
      const now =
        new Date().getTime();

      if (now > data.expiresAt) {

        localStorage.removeItem(
          CONFIG.STORAGE_KEYS.OTP_STORAGE
        );

        return {
          success: false,
          message:
            "OTP has expired. Please request a new OTP.",
          expired: true
        };
      }

      // Check max attempts
      if (
        data.attempts >=
        CONFIG.OTP_MAX_ATTEMPTS
      ) {

        localStorage.removeItem(
          CONFIG.STORAGE_KEYS.OTP_STORAGE
        );

        return {
          success: false,
          message:
            "Maximum OTP attempts exceeded. Please request a new OTP.",
          maxAttempts: true
        };
      }

      // Increment attempts
      data.attempts++;

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.OTP_STORAGE,
        JSON.stringify(data)
      );

      // Validate OTP
      if (
        String(data.otp) !== String(otp).trim()
      ) {

        const remaining =
          CONFIG.OTP_MAX_ATTEMPTS -
          data.attempts;

        return {
          success: false,
          message:
            "Invalid OTP. " +
            remaining +
            " attempt(s) remaining.",
          attemptsRemaining: remaining
        };
      }

      // OTP verified - clear local storage
      localStorage.removeItem(
        CONFIG.STORAGE_KEYS.OTP_STORAGE
      );

      // Get user from backend via loginbymobile
      // This is the ONLY source of truth for user data
      try {
        const response =
          await fetch(
            getApiUrl() +
            "?action=loginbymobile" +
            "&mobile=" +
            encodeURIComponent(mobile)
          );
        const loginResult =
          await response.json();

        if (
          loginResult &&
          loginResult.success &&
          loginResult.data &&
          loginResult.data.user
        ) {
          console.log("OTP verify: backend login success for", mobile);
          return {
            success: true,
            message: "OTP Verified Successfully",
            session: loginResult.data.session || null,
            user: loginResult.data.user,
            mobile: mobile
          };
        }

        // Backend returned an error response
        console.log("OTP verify: backend login failed:", loginResult.message);
        return {
          success: false,
          message: loginResult.message || "Backend login failed. Please try again."
        };

      } catch (err) {
        // Backend unavailable - cannot create user
        console.log("OTP verify: backend unavailable -", err.message);
        return {
          success: false,
          message: "Unable to connect to server. Please check your internet connection and try again."
        };
      }

    } catch (err) {

      return {
        success: false,
        message: "Verification failed: " +
          err.message
      };
    }
  },


  /*
  ============================================================
  MSG91 PROVIDER - SEND (PLACEHOLDER)
  ============================================================
  */

  async _msg91Send(mobile) {

    try {

      const response =
        await fetch(
          getApiUrl() +
          "?action=sendotp" +
          "&mobile=" +
          encodeURIComponent(mobile)
        );

      const json =
        await response.json();

      if (json.success || json.status === "SUCCESS") {
        return {
          success: true,
          message:
            json.message ||
            "OTP sent via MSG91",
          mobile: mobile
        };
      }

      return {
        success: false,
        message:
          json.message ||
          "Failed to send OTP via MSG91"
      };
    } catch (err) {

      return {
        success: false,
        message: "MSG91 error: " +
          err.message
      };
    }
  },


  /*
  ============================================================
  MSG91 PROVIDER - VERIFY (PLACEHOLDER)
  ============================================================
  */

  async _msg91Verify(mobile, otp) {

    try {

      const response =
        await fetch(
          getApiUrl() +
          "?action=verifyotp" +
          "&mobile=" +
          encodeURIComponent(mobile) +
          "&otp=" +
          encodeURIComponent(otp)
        );

      const json =
        await response.json();

      if (json.success || json.status === "SUCCESS") {
        return {
          success: true,
          message:
            json.message ||
            "OTP Verified",
          session:
            json.data
              ? json.data.session
              : null,
          user:
            json.data
              ? json.data.user
              : null,
          mobile: mobile
        };
      }

      return {
        success: false,
        message:
          json.message ||
          "OTP verification failed"
      };
    } catch (err) {

      return {
        success: false,
        message: "MSG91 verify error: " +
          err.message
      };
    }
  }
};


/*
============================================================
EXPORT
============================================================
*/

window.OTP = OTP;

console.log(
  "OTP Provider loaded:",
  CONFIG.OTP_PROVIDER,
  CONFIG.DEV_MODE
    ? "(Dev Mode ON)"
    : ""
);