/*
============================================================
EKKA1KM FRONTEND
dashboard.js
V5.10.0 - SUPER ADMIN DASHBOARD (Phase 5.2)
Dashboard Logic, Data Loading, UI Controls
============================================================
*/


/*
============================================================
DASHBOARD CONTROLLER
============================================================
*/

const Dashboard = {

  /*
  ============================================================
  INIT
  ============================================================
  */

  async init() {

    // Check if admin is logged in
    if (!AdminAuth.isLoggedIn()) {
      AdminAuth.redirectToLogin();
      return;
    }

    // Validate session
    const sessionResult = await AdminAuth.validateSession();

    if (!sessionResult.valid) {
      AdminAuth.redirectToLogin();
      return;
    }

    // Load admin profile into UI
    this._loadAdminProfile();

    // Load dashboard data
    await this.loadDashboardData();

    // Start clock
    this._startClock();

    // Init sidebar
    this._initSidebar();

    // Init notification panel
    this._initNotifications();

    // Init command center map and load live data (Phase 5.3B)
    this._initCommandCenter();
    this._loadCommandCenterData();
  },


  /*
  ============================================================
  LOAD DASHBOARD DATA
  Fetches aggregated summary from backend
  ============================================================
  */

  async loadDashboardData() {

    this._showLoading(true);

    const session = AdminAuth.getSession();

    if (!session) {
      this._showError("No active session");
      return;
    }

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=admindashboardsummary" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success && json.data) {

        const data = json.data;

        // Update stat cards
        if (data.cards) {
          this._updateStatCards(data.cards);
        }

        // Update system health
        if (data.systemHealth) {
          this._updateSystemHealth(data.systemHealth);
        }

        this._showLoading(false);
        return;
      }

      this._showError(json.message || "Failed to load dashboard data");

    } catch (err) {
      this._showError("Connection error: " + err.message);
    }

    this._showLoading(false);
  },


  /*
  ============================================================
  TOGGLE SIDEBAR
  ============================================================
  */

  toggleSidebar() {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const mainContent = document.getElementById("mainContent");

    if (!sidebar) return;

    const isMobile = window.innerWidth <= 767;

    if (isMobile) {
      sidebar.classList.toggle("open");

      if (overlay) {
        overlay.classList.toggle("show");
      }
    } else {
      sidebar.classList.toggle("closed");
      if (mainContent) {
        mainContent.classList.toggle("expanded");
      }
    }
  },


  /*
  ============================================================
  TOGGLE NOTIFICATIONS
  ============================================================
  */

  toggleNotifications() {

    const panel = document.getElementById("notificationPanel");
    const overlay = document.getElementById("notifOverlay");

    if (!panel) return;

    panel.classList.toggle("open");

    if (overlay) {
      overlay.classList.toggle("show");
    }
  },


  /*
  ============================================================
  LOGOUT
  ============================================================
  */

  async logout() {

    const confirmed = confirm("Are you sure you want to logout?");

    if (!confirmed) return;

    await AdminAuth.logout();

    AdminAuth.redirectToLogin();
  },


  /*
  ============================================================
  PRIVATE: SHOW LOADING
  ============================================================
  */

  _showLoading(loading) {

    const loadingEl = document.getElementById("dashboardLoading");
    const contentEl = document.getElementById("dashboardContent");

    if (!loadingEl || !contentEl) return;

    loadingEl.style.display = loading ? "flex" : "none";
    contentEl.style.display = loading ? "none" : "block";
  },


  /*
  ============================================================
  PRIVATE: SHOW ERROR
  ============================================================
  */

  _showError(message) {

    const errorEl = document.getElementById("dashboardError");

    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.style.display = "block";
  },


  /*
  ============================================================
  PRIVATE: UPDATE STAT CARDS
  ============================================================
  */

  _updateStatCards(cards) {

    const mappings = [
      { key: "totalUsers", el: "statTotalUsers", icon: "purple" },
      { key: "totalProducts", el: "statTotalProducts", icon: "blue" },
      { key: "totalBusinesses", el: "statTotalBusinesses", icon: "green" },
      { key: "totalProperties", el: "statTotalProperties", icon: "orange" },
      { key: "totalRevenue", el: "statTotalRevenue", icon: "green" },
      { key: "coinsDistributed", el: "statCoinsDistributed", icon: "orange" },
      { key: "liveUsers", el: "statLiveUsers", icon: "red" },
      { key: "activeCities", el: "statActiveCities", icon: "blue" },
      { key: "pendingApprovals", el: "statPendingApprovals", icon: "purple" }
    ];

    mappings.forEach(function(m) {

      const el = document.getElementById(m.el);
      if (!el) return;

      let value = cards[m.key];

      // Format numbers
      if (typeof value === "number") {

        // Format revenue as currency
        if (m.key === "totalRevenue") {
          value = "₹" + Number(value).toLocaleString("en-IN");
        } else {
          value = Number(value).toLocaleString("en-IN");
        }
      }

      el.textContent = value || "0";
    });
  },


  /*
  ============================================================
  PRIVATE: UPDATE SYSTEM HEALTH
  ============================================================
  */

  _updateSystemHealth(health) {

    if (!health) return;

    const items = [
      { key: "backendApi", labelEl: "healthBackendLabel", dotEl: "healthBackendDot", statusEl: "healthBackendStatus" },
      { key: "googleSheets", labelEl: "healthSheetsLabel", dotEl: "healthSheetsDot", statusEl: "healthSheetsStatus" },
      { key: "imageKit", labelEl: "healthImageKitLabel", dotEl: "healthImageKitDot", statusEl: "healthImageKitStatus" },
      { key: "smsService", labelEl: "healthSmsLabel", dotEl: "healthSmsDot", statusEl: "healthSmsStatus" },
      { key: "storage", labelEl: "healthStorageLabel", dotEl: "healthStorageDot", statusEl: "healthStorageStatus" },
      { key: "appVersion", labelEl: "healthVersionLabel", dotEl: null, statusEl: "healthVersionStatus" }
    ];

    items.forEach(function(item) {

      const value = String(health[item.key] || "UNKNOWN").toLowerCase();

      // Update label
      const labelEl = document.getElementById(item.labelEl);
      if (labelEl) {
        const labels = {
          backendApi: "Backend API",
          googleSheets: "Google Sheets",
          imageKit: "ImageKit",
          smsService: "SMS Service",
          storage: "Storage",
          appVersion: "App Version"
        };
        labelEl.textContent = labels[item.key] || item.key;
      }

      // Update dot
      if (item.dotEl) {
        const dot = document.getElementById(item.dotEl);
        if (dot) {
          dot.className = "health-dot " + (value === "online" || value === "local" || value === "configured" ? "online" : value === "offline" ? "offline" : "unknown");
        }
      }

      // Update status text
      const statusEl = document.getElementById(item.statusEl);
      if (statusEl) {
        statusEl.textContent = String(health[item.key] || "UNKNOWN");
        statusEl.className = "health-status " + (value === "online" || value === "local" || value === "configured" ? "online" : value === "offline" ? "offline" : "unknown");
      }
    });
  },


  /*
  ============================================================
  PRIVATE: LOAD ADMIN PROFILE
  ============================================================
  */

  _loadAdminProfile() {

    const admin = AdminAuth.getAdminData();

    if (!admin) return;

    // Header profile
    const headerAvatar = document.getElementById("headerAvatar");
    const headerName = document.getElementById("headerName");
    const headerRole = document.getElementById("headerRole");

    if (headerAvatar) {
      const initials = (admin.FullName || admin.AdminID || "A").charAt(0).toUpperCase();
      headerAvatar.textContent = initials;
    }

    if (headerName) {
      headerName.textContent = admin.FullName || admin.AdminID || "Admin";
    }

    if (headerRole) {
      headerRole.textContent = admin.Role || "Admin";
    }

    // Sidebar footer
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarName = document.getElementById("sidebarName");
    const sidebarRole = document.getElementById("sidebarRole");

    if (sidebarAvatar) {
      const initials = (admin.FullName || admin.AdminID || "A").charAt(0).toUpperCase();
      sidebarAvatar.textContent = initials;
    }

    if (sidebarName) {
      sidebarName.textContent = admin.FullName || admin.AdminID || "Admin";
    }

    if (sidebarRole) {
      sidebarRole.textContent = admin.Role || "Admin";
    }

    // Last login display
    const lastLoginEl = document.getElementById("headerLastLogin");
    if (lastLoginEl && admin.LastLogin) {
      try {
        const date = new Date(admin.LastLogin);
        lastLoginEl.textContent = "Last login: " + date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch (e) {
        lastLoginEl.textContent = "";
      }
    }
  },


  /*
  ============================================================
  PRIVATE: START CLOCK
  ============================================================
  */

  _startClock() {

    const timeEl = document.getElementById("currentTime");
    const dateEl = document.getElementById("currentDate");

    if (!timeEl && !dateEl) return;

    function updateClock() {
      const now = new Date();

      if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      }

      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        });
      }
    }

    updateClock();
    setInterval(updateClock, 1000);
  },


  /*
  ============================================================
  PRIVATE: INIT SIDEBAR
  ============================================================
  */

  _initSidebar() {

    // Close sidebar on overlay click
    const overlay = document.getElementById("sidebarOverlay");

    if (overlay) {
      overlay.addEventListener("click", function() {
        Dashboard.toggleSidebar();
      });
    }

    // Close sidebar on escape key
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        const sidebar = document.getElementById("sidebar");
        if (sidebar && sidebar.classList.contains("open")) {
          Dashboard.toggleSidebar();
        }
      }
    });

    // Handle window resize
    window.addEventListener("resize", function() {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar) return;

      if (window.innerWidth > 767) {
        sidebar.classList.remove("open");
      }
    });
  },


  /*
  ============================================================
  PRIVATE: INIT NOTIFICATIONS
  ============================================================
  */

  _initNotifications() {

    // Close notification panel on overlay click
    const overlay = document.getElementById("notifOverlay");

    if (overlay) {
      overlay.addEventListener("click", function() {
        Dashboard.toggleNotifications();
      });
    }

    // Close on escape
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        const panel = document.getElementById("notificationPanel");
        if (panel && panel.classList.contains("open")) {
          Dashboard.toggleNotifications();
        }
      }
    });
  },


  /*
  ============================================================
  PRIVATE: LOAD COMMAND CENTER DATA
  Loads activity feed, top cities, top categories
  ============================================================
  */

  async _loadCommandCenterData() {

    const session = AdminAuth.getSession();

    if (!session) return;

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=ccdata" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success && json.data) {

        // Store city analytics for map click handler
        this._cityAnalytics = json.data.cityAnalytics || [];

        // Update activity feed
        if (json.data.activityFeed && json.data.activityFeed.length > 0) {
          this._updateActivityFeed(json.data.activityFeed);
        }

        // Update top cities
        if (json.data.topCities && json.data.topCities.length > 0) {
          this._updateTopCities(json.data.topCities);
        }

        // Update top categories
        if (json.data.topCategories && json.data.topCategories.length > 0) {
          this._updateTopCategories(json.data.topCategories);
        }

        // Update system health
        if (json.data.systemHealth) {
          this._updateSystemHealth(json.data.systemHealth);
        }
      }

    } catch (err) {
      console.error("Command Center data load error:", err);
    }
  },


  /*
  ============================================================
  PRIVATE: UPDATE ACTIVITY FEED
  ============================================================
  */

  _updateActivityFeed(activities) {

    const container = document.getElementById("activityFeedContainer");

    if (!container || !activities.length) return;

    let html = "";

    activities.slice(0, 10).forEach(function(activity) {
      html += `
        <div class="activity-feed-item">
          <span class="activity-feed-icon">${activity.icon || "📌"}</span>
          <div class="activity-feed-content">
            <div class="activity-feed-title">${activity.title || "Activity"}</div>
            <div class="activity-feed-meta">${activity.description || ""} ${activity.city ? "• " + activity.city : ""}</div>
          </div>
          <span class="item-value muted">${activity.time ? this._formatTimeAgo(activity.time) : ""}</span>
        </div>
      `;
    }.bind(this));

    container.innerHTML = html;
  },


  /*
  ============================================================
  PRIVATE: UPDATE TOP CITIES
  ============================================================
  */

  _updateTopCities(cities) {

    const container = document.getElementById("topCitiesContainer");

    if (!container || !cities.length) return;

    let html = "";

    cities.slice(0, 10).forEach(function(city, index) {
      html += `
        <div class="top-list-item">
          <span class="top-list-rank">${index + 1}</span>
          <span class="top-list-label">${city.city || "Unknown"}</span>
          <span class="top-list-value">${city.users || 0} users</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },


  /*
  ============================================================
  PRIVATE: UPDATE TOP CATEGORIES
  ============================================================
  */

  _updateTopCategories(categories) {

    const container = document.getElementById("topCategoriesContainer");

    if (!container || !categories.length) return;

    let html = "";

    categories.slice(0, 10).forEach(function(cat, index) {
      html += `
        <div class="top-list-item">
          <span class="top-list-rank">${index + 1}</span>
          <span class="top-list-label">${cat.category || "Unknown"}</span>
          <span class="top-list-value">${cat.businesses || 0} businesses</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },


  /*
  ============================================================
  PRIVATE: FORMAT TIME AGO
  ============================================================
  */

  _formatTimeAgo(timestamp) {

    if (!timestamp) return "";

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return minutes + "m ago";
      if (hours < 24) return hours + "h ago";
      if (days < 7) return days + "d ago";

      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
      });
    } catch (e) {
      return "";
    }
  },


  /*
  ============================================================
  PRIVATE: INIT COMMAND CENTER
  Initializes Leaflet map and command center components.
  Handles resize on sidebar toggle.
  ============================================================
  */

  _initCommandCenter() {

    // Wait for DOM to be fully ready
    setTimeout(function() {

      // Initialize the Command Center module
      if (typeof CommandCenter !== "undefined") {
        CommandCenter.init();
        console.log("Command Center initialized from Dashboard");
      } else {
        console.warn("CommandCenter module not loaded");
      }

      // Listen for map clicks to show city analytics
      if (typeof CommandCenter !== "undefined") {
        CommandCenter.on("mapClick", function(data) {
          Dashboard._showCityAnalytics(data.lat, data.lng);
        });
      }

      // Handle sidebar toggle to resize map
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        const observer = new MutationObserver(function() {
          if (typeof CommandCenter !== "undefined") {
            CommandCenter.resize();
          }
        });
        observer.observe(sidebar, {
          attributes: true,
          attributeFilter: ["class"]
        });
      }

      // Handle window resize
      window.addEventListener("resize", function() {
        if (typeof CommandCenter !== "undefined") {
          CommandCenter.resize();
        }
      });

    }, 100);
  },


  /*
  ============================================================
  PRIVATE: SHOW CITY ANALYTICS
  Displays city analytics when map is clicked
  ============================================================
  */

  _showCityAnalytics(lat, lng) {

    const panel = document.getElementById("panelCityAnalytics");
    const container = document.getElementById("cityAnalyticsContainer");
    const subtitle = document.getElementById("cityAnalyticsSubtitle");

    if (!panel || !container) return;

    // Find nearest city from analytics data
    let cityData = null;

    if (this._cityAnalytics && this._cityAnalytics.length > 0) {
      // Simple nearest city lookup (in production, use proper geospatial query)
      cityData = this._cityAnalytics[0];
    }

    // Show panel
    panel.style.display = "block";

    // Update subtitle
    if (subtitle) {
      subtitle.textContent = cityData ? cityData.city + ", " + cityData.state : "Selected Location";
    }

    // Build analytics HTML
    let html = "";

    if (cityData) {
      html += `
        <div class="panel-list-item">
          <span class="item-label">City</span>
          <span class="item-value">${cityData.city || "N/A"}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">State</span>
          <span class="item-value">${cityData.state || "N/A"}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Users</span>
          <span class="item-value">${cityData.users || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Businesses</span>
          <span class="item-value">${cityData.businesses || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Products</span>
          <span class="item-value">${cityData.products || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Properties</span>
          <span class="item-value">${cityData.properties || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Advertisements</span>
          <span class="item-value">${cityData.advertisements || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Promotions</span>
          <span class="item-value">${cityData.promotions || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Revenue</span>
          <span class="item-value">₹${cityData.revenue || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Pending Reports</span>
          <span class="item-value">${cityData.pendingReports || 0}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Pending Approvals</span>
          <span class="item-value">${cityData.pendingApprovals || 0}</span>
        </div>
      `;
    } else {
      html += `
        <div class="panel-list-item">
          <span class="item-label">Latitude</span>
          <span class="item-value muted">${lat.toFixed(4)}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Longitude</span>
          <span class="item-value muted">${lng.toFixed(4)}</span>
        </div>
        <div class="panel-list-item">
          <span class="item-label">Status</span>
          <span class="item-value muted">No city data available</span>
        </div>
      `;
    }

    container.innerHTML = html;
  }
};


/*
============================================================
AUTO-INIT ON DOM READY
============================================================
*/

document.addEventListener("DOMContentLoaded", function() {
  Dashboard.init();
});