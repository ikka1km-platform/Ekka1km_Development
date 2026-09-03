/*
============================================================
EKKA1KM FRONTEND
admin-modules.js
V5.11.0 - ADMIN MODULE NAVIGATION SYSTEM (Phase 5.4)
SPA-style module loader for admin management panels
============================================================
*/


/*
============================================================
ADMIN MODULES CONTROLLER
============================================================
*/

const AdminModules = {

  /*
  ============================================================
  STATE
  ============================================================
  */

  _currentModule: "dashboard",
  _modules: {},
  _cleanups: {},
  _initialized: false,


  /*
  ============================================================
  REGISTER MODULE
  Registers a module with its render function or lifecycle config
  ============================================================
  */

  register(name, renderOrConfig) {
    if (typeof renderOrConfig === "function") {
      this._modules[name] = renderOrConfig;
    } else if (renderOrConfig && typeof renderOrConfig.render === "function") {
      this._modules[name] = renderOrConfig.render;
      if (typeof renderOrConfig.cleanup === "function") {
        this._cleanups[name] = renderOrConfig.cleanup;
      }
    }
  },

  registerCleanup(name, cleanupFn) {
    if (typeof cleanupFn === "function") {
      this._cleanups[name] = cleanupFn;
    }
  },


  /*
  ============================================================
  MODULE LIFECYCLE HOOKS
  ============================================================
  */

  _leaveModule(moduleName) {
    if (!moduleName) return;

    if (this._cleanups[moduleName]) {
      try {
        this._cleanups[moduleName]();
      } catch (err) {
        console.error("Module cleanup error (" + moduleName + "):", err);
      }
    }

    if (moduleName === "dashboard") {
      if (typeof CommandCenter !== "undefined" && typeof CommandCenter.pauseAutoRefresh === "function") {
        CommandCenter.pauseAutoRefresh();
      }
    }
  },

  _enterModule(moduleName) {
    if (moduleName === "dashboard") {
      if (typeof CommandCenter !== "undefined" && typeof CommandCenter.resumeAutoRefresh === "function") {
        CommandCenter.resumeAutoRefresh();
      }
      if (typeof CommandCenter !== "undefined" && typeof CommandCenter.resize === "function") {
        CommandCenter.resize();
      }
    }
  },


  /*
  ============================================================
  OPEN MODULE
  Loads and displays a management module
  ============================================================
  */

  async open(moduleName) {

    if (!AdminAuth.isLoggedIn()) {
      AdminAuth.redirectToLogin();
      return;
    }

    if (this._currentModule === moduleName) return;

    const previousModule = this._currentModule || "dashboard";
    this._leaveModule(previousModule);

    this._currentModule = moduleName;

    // Update sidebar active state
    document.querySelectorAll(".nav-item").forEach(function(item) {
      item.classList.remove("active");
    });

    const navItem = document.querySelector(
      '.nav-item[data-module="' + moduleName + '"]'
    );
    if (navItem) {
      navItem.classList.add("active");
    }

    // Update header title
    const headerTitle = document.getElementById("headerModuleTitle");
    const labels = {
      dashboard: "Dashboard",
      users: "User Management",
      businesses: "Business Management",
      products: "Product Management",
      properties: "Property Management",
      news: "News Management",
      workforce: "Workforce Management",
      analytics: "Analytics",
      live: "Live Monitoring & Moderation",
      advertisements: "Advertisements",
      announcements: "Announcements & Moderation",
      moderation: "Moderation",
      wallet: "Wallet & Rewards",
      gps: "GPS Analytics",
      search: "Search Analytics",
      notifications: "Notifications",
      verifications: "Verifications",
      reports: "Reports & Abuse",
      settings: "Settings",
      support: "Support"
    };
    if (headerTitle) {
      headerTitle.textContent = labels[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    }

    // Show/hide dashboard content
    const dashboardContent = document.getElementById("dashboardContent");
    const moduleContainer = document.getElementById("moduleContainer");

    if (moduleName === "dashboard") {
      if (dashboardContent) dashboardContent.style.display = "block";
      if (moduleContainer) moduleContainer.style.display = "none";
      this._enterModule("dashboard");
      return;
    }

    if (dashboardContent) dashboardContent.style.display = "none";
    if (moduleContainer) {
      moduleContainer.style.display = "block";
      moduleContainer.innerHTML = '<div class="module-loading"><div class="loader"></div><p>Loading ' + (labels[moduleName] || moduleName) + '...</p></div>';
    }

    // Call registered module render function
    if (this._modules[moduleName]) {
      try {
        await this._modules[moduleName](moduleContainer);
      } catch (err) {
        console.error("Module error:", moduleName, err);
        if (moduleContainer) {
          moduleContainer.innerHTML = '<div class="module-error"><span class="module-error-icon">⚠️</span><h3>Failed to Load Module</h3><p>' + err.message + '</p></div>';
        }
      }
    } else {
      if (moduleContainer) {
        moduleContainer.innerHTML = '<div class="module-placeholder"><span class="module-placeholder-icon">🚧</span><h3>Module Under Development</h3><p>' + (labels[moduleName] || moduleName) + ' module will be available soon.</p></div>';
      }
    }
  },


  /*
  ============================================================
  INIT
  Initializes sidebar navigation and card click handlers
  ============================================================
  */

  init() {

    if (this._initialized) return;

    // Wire sidebar navigation
    document.querySelectorAll(".nav-item").forEach(function(item) {
      item.addEventListener("click", function(e) {
        e.preventDefault();
        const module = this.getAttribute("data-module");
        if (module) {
          AdminModules.open(module);
        }
        // Close sidebar on mobile
        const sidebar = document.getElementById("sidebar");
        if (sidebar && window.innerWidth <= 767) {
          sidebar.classList.remove("open");
          const overlay = document.getElementById("sidebarOverlay");
          if (overlay) overlay.classList.remove("show");
        }
      });
    });

    // Wire stat cards to open modules
    document.querySelectorAll(".stat-card").forEach(function(card) {
      card.addEventListener("click", function() {
        const module = this.getAttribute("data-module");
        if (module) {
          AdminModules.open(module);
        }
      });
    });

    this._initialized = true;
    console.log("Admin Modules navigation initialized (Phase 5.4)");
  }
};


/*
============================================================
GLOBAL EXPORT
============================================================
*/

window.AdminModules = AdminModules;

console.log("Admin Modules loaded (Phase 5.4)");