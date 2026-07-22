/*
============================================================
EKKA1KM FRONTEND
Users.js
V5.11.0 - USER MANAGEMENT MODULE (Phase 5.4)
Admin user listing via Apps Script API
============================================================
*/

const UserManagement = {
  _state: {
    loading: false,
    users: [],
    search: ""
  },

  /*
  ============================================================
  OPEN MODULE
  Renders User Management inside moduleContainer
  ============================================================
  */

  async open(container) {

    this._state.search = "";
    this._container = container;
    this._renderLoading();

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=users" +
        "&session=" +
        encodeURIComponent(AdminAuth.getSession() || "")
      );

      const json = await response.json();

      if (!json || !json.success) {
        this._renderError(json && json.message ? json.message : "Failed to load users");
        return;
      }

      this._state.users = Array.isArray(json.data) ? json.data : [];

      this._render();

    } catch (err) {
      this._renderError("Connection error: " + err.message);
    }
  },


  /*
  ============================================================
  RENDER LOADING
  ============================================================
  */

  _renderLoading() {
    if (!this._container) return;
    this._container.innerHTML =
      '<div class="module-loading">' +
        '<div class="loader"></div>' +
        '<p>Loading users...</p>' +
      '</div>';
  },


  /*
  ============================================================
  RENDER ERROR
  ============================================================
  */

  _renderError(message) {
    if (!this._container) return;
    this._container.innerHTML =
      '<div class="module-error">' +
        '<span class="module-error-icon">⚠️</span>' +
        '<h3>Failed to Load Users</h3>' +
        '<p>' + this._escapeHtml(message) + '</p>' +
      '</div>';
  },


  /*
  ============================================================
  RENDER
  ============================================================
  */

  _render() {

    if (!this._container) return;

    const users = this._state.users;
    const query = String(this._state.search || "").toLowerCase();

    const filtered = users.filter(function(u) {
      if (!query) return true;
      const hay = [
        u.UserID,
        u.FullName,
        u.Mobile,
        u.City,
        u.Status,
        u.WalletID
      ].join(" ").toLowerCase();
      return hay.indexOf(query) !== -1;
    });

    let html =
      '<div class="module-page-user-management">' +
        '<div class="module-page-header">' +
          '<h2>User Management</h2>' +
          '<p class="module-page-subtitle">' + users.length + ' user' + (users.length === 1 ? '' : 's') + ' found</p>' +
        '</div>' +

        '<div class="module-toolbar">' +
          '<input type="text" id="usermgmtSearch" placeholder="Search by UserID, name, mobile, city..." value="' + this._escapeHtml(this._state.search) + '" />' +
        '</div>';

    if (!filtered.length) {
      html +=
        '<div class="module-empty">' +
          '<span class="module-empty-icon">👥</span>' +
          '<p>No users found.</p>' +
        '</div>';
    } else {
      html +=
        '<div class="module-table-wrap">' +
          '<table class="module-table">' +
            '<thead>' +
              '<tr>' +
                '<th>UserID</th>' +
                '<th>Full Name</th>' +
                '<th>Mobile</th>' +
                '<th>City</th>' +
                '<th>Status</th>' +
                '<th>Verified</th>' +
                '<th>WalletID</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>';

      filtered.forEach(function(u) {
        const status = this._escapeHtml(String(u.Status || ""));
        const verified = this._escapeHtml(String(u.Verified || ""));
        html +=
          '<tr>' +
            '<td>' + this._escapeHtml(String(u.UserID || "")) + '</td>' +
            '<td>' + this._escapeHtml(String(u.FullName || "")) + '</td>' +
            '<td>' + this._escapeHtml(String(u.Mobile || "")) + '</td>' +
            '<td>' + this._escapeHtml(String(u.City || "")) + '</td>' +
            '<td><span class="usermgmt-status ' + this._cssClass(status) + '">' + status + '</span></td>' +
            '<td><span class="usermgmt-status ' + this._cssClass(verified) + '">' + verified + '</span></td>' +
            '<td>' + this._escapeHtml(String(u.WalletID || "")) + '</td>' +
          '</tr>';
      }, this);

      html +=
            '</tbody>' +
          '</table>' +
        '</div>';
    }

    html += '</div>';
    this._container.innerHTML = html;

    this._wireSearch();
  },


  /*
  ============================================================
  WIRE SEARCH
  ============================================================
  */

  _wireSearch() {

    const input = document.getElementById("usermgmtSearch");
    if (!input) return;

    const handler = (evt) => {
      this._state.search = evt.target.value;
      this._render();
      const again = document.getElementById("usermgmtSearch");
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    };

    input.addEventListener("input", handler);
    input.addEventListener("keyup", function(e) {
      if (e.key === "Escape") {
        this._state.search = "";
        this._render();
        const el = document.getElementById("usermgmtSearch");
        if (el) el.value = "";
      }
    }.bind(this));
  },


  /*
  ============================================================
  HELPERS
  ============================================================
  */

  _escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, '\x26amp;')
      .replace(/</g, '\x26lt;')
      .replace(/>/g, '\x26gt;')
      .replace(/"/g, '\x26quot;');
  },

  _cssClass(value) {
    const v = String(value || "").toLowerCase();
    if (v === "active" || v === "verified" || v === "yes" || v === "true") return "success";
    if (v === "inactive" || v === "blocked" || v === "pending") return "warning";
    return "muted";
  }
};


/*
============================================================
REGISTER MODULE
============================================================
*/

AdminModules.register("users", function(container) {
  return UserManagement.open(container);
});

console.log("User Management module registered (V5.11.0)");