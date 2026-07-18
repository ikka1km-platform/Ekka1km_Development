/*
============================================================
EKKA1KM FRONTEND
admin-auth.js
V5.10.0 - SUPER ADMIN AUTHENTICATION (Phase 5.1)
Admin ID + OTP Login, Session Management, Permissions
============================================================
*/


/*
============================================================
ADMIN AUTH MODULE
============================================================
*/

const AdminAuth = {

  /*
  ============================================================
  STORAGE KEYS
  ============================================================
  */

  _keys: CONFIG.STORAGE_KEYS,


  /*
  ============================================================
  LOGIN STEP 1: SEND OTP
  Sends OTP to the admin's registered mobile/email
  ============================================================
  */

  async sendOtp(adminId) {

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=adminlogin" +
        "&adminId=" +
        encodeURIComponent(adminId)
      );

      const json = await response.json();

      if (json && json.success) {
        return {
          success: true,
          message: json.message || "OTP sent successfully",
          data: json.data || null,
          devOtp: json.data ? json.data.devOtp : null
        };
      }

      return {
        success: false,
        message: json.message || "Failed to send OTP"
      };

    } catch (err) {
      return {
        success: false,
        message: "Connection error: " + err.message
      };
    }
  },


  /*
  ============================================================
  LOGIN STEP 2: VERIFY OTP
  Verifies OTP and creates admin session
  ============================================================
  */

  async verifyOtp(adminId, otp, remember) {

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=adminverifyotp" +
        "&adminId=" +
        encodeURIComponent(adminId) +
        "&otp=" +
        encodeURIComponent(otp) +
        "&remember=" +
        (remember ? "true" : "false")
      );

      const json = await response.json();

      if (json && json.success && json.data) {

        const data = json.data;

        // Store session
        this._saveSession(data.session, data.admin, data.permissions, remember);

        return {
          success: true,
          message: json.message || "Login successful",
          session: data.session,
          admin: data.admin,
          permissions: data.permissions
        };
      }

      return {
        success: false,
        message: json.message || "OTP verification failed"
      };

    } catch (err) {
      return {
        success: false,
        message: "Connection error: " + err.message
      };
    }
  },


  /*
  ============================================================
  VALIDATE SESSION
  Checks if the current admin session is still valid
  ============================================================
  */

  async validateSession() {

    const session = this.getSession();

    if (!session) {
      return {
        valid: false
      };
    }

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=adminvalidatesession" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success && json.data && json.data.valid) {

        // Update stored admin data and permissions
        if (json.data.admin) {
          this._saveAdminData(json.data.admin);
        }

        if (json.data.permissions) {
          this._savePermissions(json.data.permissions);
        }

        return {
          valid: true,
          admin: json.data.admin,
          permissions: json.data.permissions,
          adminId: json.data.adminId
        };
      }

      // Session invalid - clear storage
      this.clearSession();

      return {
        valid: false
      };

    } catch (err) {
      // Network error - assume session is still valid if stored
      const admin = this.getAdminData();
      const permissions = this.getPermissions();

      if (admin && session) {
        return {
          valid: true,
          admin: admin,
          permissions: permissions,
          offline: true
        };
      }

      return {
        valid: false
      };
    }
  },


  /*
  ============================================================
  LOGOUT
  Ends admin session
  ============================================================
  */

  async logout() {

    const session = this.getSession();

    if (session) {
      try {
        await fetch(
          getApiUrl() +
          "?action=adminlogout" +
          "&session=" +
          encodeURIComponent(session)
        );
      } catch (err) {
        // Silently handle network errors during logout
      }
    }

    this.clearSession();

    return {
      success: true
    };
  },


  /*
  ============================================================
  GET ADMIN PROFILE
  ============================================================
  */

  async getProfile() {

    const session = this.getSession();

    if (!session) {
      return {
        success: false,
        message: "No active session"
      };
    }

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=adminprofile" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success) {
        return {
          success: true,
          admin: json.data
        };
      }

      return {
        success: false,
        message: json.message || "Failed to load profile"
      };

    } catch (err) {
      return {
        success: false,
        message: "Connection error: " + err.message
      };
    }
  },


  /*
  ============================================================
  GET ADMIN PERMISSIONS
  ============================================================
  */

  async getPermissionsFromServer() {

    const session = this.getSession();

    if (!session) {
      return {
        success: false,
        permissions: {}
      };
    }

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=adminpermissions" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success && json.data) {
        this._savePermissions(json.data.permissions || {});
        return {
          success: true,
          permissions: json.data.permissions || {},
          role: json.data.role || ""
        };
      }

      return {
        success: false,
        permissions: this.getPermissions()
      };

    } catch (err) {
      return {
        success: false,
        permissions: this.getPermissions()
      };
    }
  },


  /*
  ============================================================
  HAS PERMISSION
  Checks if admin has a specific permission
  ============================================================
  */

  hasPermission(permission) {

    const admin = this.getAdminData();

    // Founder has unrestricted access
    if (admin && String(admin.Role || "").toUpperCase() === "FOUNDER") {
      return true;
    }

    const permissions = this.getPermissions();
    return permissions[permission] === true;
  },


  /*
  ============================================================
  HAS ROLE
  Checks if admin has a specific role
  ============================================================
  */

  hasRole(role) {

    const admin = this.getAdminData();

    if (!admin || !role) {
      return false;
    }

    return String(admin.Role || "").toUpperCase() === String(role).toUpperCase();
  },


  /*
  ============================================================
  IS LOGGED IN
  Returns true if admin has an active session stored
  ============================================================
  */

  isLoggedIn() {

    const session = this.getSession();
    const admin = this.getAdminData();

    return !!(session && admin);
  },


  /*
  ============================================================
  GET SESSION
  Returns stored session token
  ============================================================
  */

  getSession() {
    return localStorage.getItem(this._keys.ADMIN_SESSION);
  },


  /*
  ============================================================
  GET ADMIN DATA
  Returns stored admin profile
  ============================================================
  */

  getAdminData() {

    const data = localStorage.getItem(this._keys.ADMIN_USER);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },


  /*
  ============================================================
  GET PERMISSIONS
  Returns stored permissions object
  ============================================================
  */

  getPermissions() {

    const data = localStorage.getItem(this._keys.ADMIN_PERMISSIONS);

    if (!data) {
      return {};
    }

    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  },


  /*
  ============================================================
  GET REMEMBER SETTING
  ============================================================
  */

  getRemember() {
    return localStorage.getItem(this._keys.ADMIN_REMEMBER) === "true";
  },


  /*
  ============================================================
  CLEAR SESSION
  Removes all admin auth data from storage
  ============================================================
  */

  clearSession() {

    localStorage.removeItem(this._keys.ADMIN_SESSION);
    localStorage.removeItem(this._keys.ADMIN_USER);
    localStorage.removeItem(this._keys.ADMIN_PERMISSIONS);
    localStorage.removeItem(this._keys.ADMIN_REMEMBER);
  },


  /*
  ============================================================
  REDIRECT TO LOGIN
  Clears session and redirects to admin login page
  ============================================================
  */

  redirectToLogin() {

    this.clearSession();

    window.location.href = "admin-login.html";
  },


  /*
  ============================================================
  REDIRECT TO DASHBOARD
  Redirects to admin dashboard (Phase 5.2)
  ============================================================
  */

  redirectToDashboard() {

    window.location.href = "admin-dashboard.html";
  },


  /*
  ============================================================
  PRIVATE: SAVE SESSION
  ============================================================
  */

  _saveSession(session, admin, permissions, remember) {

    localStorage.setItem(this._keys.ADMIN_SESSION, session);

    if (admin) {
      this._saveAdminData(admin);
    }

    if (permissions) {
      this._savePermissions(permissions);
    }

    localStorage.setItem(
      this._keys.ADMIN_REMEMBER,
      remember ? "true" : "false"
    );
  },


  /*
  ============================================================
  PRIVATE: SAVE ADMIN DATA
  ============================================================
  */

  _saveAdminData(admin) {
    localStorage.setItem(
      this._keys.ADMIN_USER,
      JSON.stringify(admin)
    );
  },


  /*
  ============================================================
  PRIVATE: SAVE PERMISSIONS
  ============================================================
  */

  _savePermissions(permissions) {
    localStorage.setItem(
      this._keys.ADMIN_PERMISSIONS,
      JSON.stringify(permissions || {})
    );
  }
};


/*
============================================================
GLOBAL EXPORT
============================================================
*/

window.AdminAuth = AdminAuth;

console.log("AdminAuth module loaded (Phase 5.1)");