/*
============================================================
EKKA1KM FRONTEND
command-center.js
V5.10.0 - LIVE COMMAND CENTER (Phase 5.3A)
India Map Foundation with Leaflet
Modular map component for future expansion
============================================================
*/


/*
============================================================
COMMAND CENTER MODULE
============================================================
*/

const CommandCenter = {

  /*
  ============================================================
  CONFIGURATION
  ============================================================
  */

  config: {
    center: [20.5937, 78.9629], // India center coordinates
    zoom: 5,
    minZoom: 4,
    maxZoom: 12,
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileAttribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    currentRadius: "51 km",
    currentMode: "Standard"
  },


  /*
  ============================================================
  STATE
  ============================================================
  */

  _map: null,
  _markers: [],
  _layers: {},
  _activeLayer: null,
  _listeners: {},
  _initialized: false,


  /*
  ============================================================
  INIT
  Initialize the map and all UI components
  ============================================================
  */

  init() {

    if (this._initialized) return;

    this._setupHeader();
    this._initMap();
    this._setupToolbar();
    this._setupControls();
    this._setupInfoPanel();
    this._setupStatusBar();
    this._setupEvents();

    this._initialized = true;

    console.log("Command Center initialized");
  },


  /*
  ============================================================
  DESTROY
  Cleanup map resources
  ============================================================
  */

  destroy() {

    if (this._map) {
      this._map.remove();
      this._map = null;
    }

    this._markers = [];
    this._layers = {};
    this._activeLayer = null;
    this._listeners = {};
    this._initialized = false;
  },


  /*
  ============================================================
  RESIZE
  Call on window resize or sidebar toggle
  ============================================================
  */

  resize() {

    if (this._map) {
      setTimeout(() => {
        this._map.invalidateSize();
      }, 300);
    }
  },


  /*
  ============================================================
  RESET VIEW
  Reset map to default India view
  ============================================================
  */

  resetView() {

    if (this._map) {
      this._map.setView(
        this.config.center,
        this.config.zoom
      );
    }
  },


  /*
  ============================================================
  TOGGLE FULLSCREEN
  ============================================================
  */

  toggleFullscreen() {

    const container = document.getElementById("panelCommandCenter");

    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },


  /*
  ============================================================
  SET LAYER
  Highlights toolbar button for selected layer
  ============================================================
  */

  setLayer(layerName) {

    this._activeLayer = layerName;

    // Update toolbar buttons
    document.querySelectorAll(".cc-toolbar-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    const btn = document.querySelector(
      `.cc-toolbar-btn[data-layer="${layerName}"]`
    );

    if (btn) {
      btn.classList.add("active");
    }

    // Update status bar
    this._updateStatusBar();

    // Emit event
    this._emit("layerChange", { layer: layerName });

    console.log("Command Center layer changed:", layerName);
  },


  /*
  ============================================================
  ON / OFF
  Event system for future modules
  ============================================================
  */

  on(event, callback) {

    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }

    this._listeners[event].push(callback);
  },


  off(event, callback) {

    if (!this._listeners[event]) return;

    this._listeners[event] = this._listeners[event]
      .filter(cb => cb !== callback);
  },


  /*
  ============================================================
  GET MAP INSTANCE
  For external modules to access the Leaflet map
  ============================================================
  */

  getMap() {
    return this._map;
  },


  /*
  ============================================================
  PRIVATE: SETUP HEADER
  ============================================================
  */

  _setupHeader() {

    const timeEl = document.getElementById("ccCurrentTime");
    const dateEl = document.getElementById("ccCurrentDate");
    const radiusEl = document.getElementById("ccCurrentRadius");
    const modeEl = document.getElementById("ccCurrentMode");

    if (radiusEl) {
      radiusEl.textContent = this.config.currentRadius;
    }

    if (modeEl) {
      modeEl.textContent = this.config.currentMode;
    }

    // Update time every second
    if (timeEl || dateEl) {
      const updateClock = () => {
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
            day: "numeric",
            month: "short",
            year: "numeric"
          });
        }
      };

      updateClock();
      setInterval(updateClock, 1000);
    }
  },


  /*
  ============================================================
  PRIVATE: INIT MAP
  Leaflet map centered on India
  ============================================================
  */

  _initMap() {

    const container = document.getElementById("ccMapContainer");

    if (!container) return;

    // Check if Leaflet is loaded
    if (typeof L === "undefined") {
      console.warn("Leaflet not loaded. Map cannot be initialized.");
      container.innerHTML = `
        <div class="placeholder-content">
          <div class="placeholder-icon">🗺️</div>
          <h3>Map Library Not Loaded</h3>
          <p>Leaflet library is required to display the map.</p>
        </div>
      `;
      return;
    }

    // Initialize Leaflet map
    this._map = L.map(container, {
      center: this.config.center,
      zoom: this.config.zoom,
      minZoom: this.config.minZoom,
      maxZoom: this.config.maxZoom,
      zoomControl: false,
      attributionControl: true
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer(this.config.tileUrl, {
      attribution: this.config.tileAttribution,
      maxZoom: this.config.maxZoom
    }).addTo(this._map);

    // Add zoom control to top-right
    L.control.zoom({
      position: "topright"
    }).addTo(this._map);

    // Map event listeners
    this._map.on("click", (e) => {
      this._emit("mapClick", {
        latlng: e.latlng,
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
      console.log("Map clicked:", e.latlng);
      this._updateInfoPanel("Selected Location", {
        lat: e.latlng.lat.toFixed(4),
        lng: e.latlng.lng.toFixed(4)
      });
    });

    this._map.on("zoomend", () => {
      this._emit("zoomChange", {
        zoom: this._map.getZoom()
      });
      console.log("Zoom changed:", this._map.getZoom());
    });

    this._map.on("load", () => {
      this._emit("mapReady", {});
      console.log("Map ready");
    });

    // Mark map as ready
    setTimeout(() => {
      this._map.invalidateSize();
      this._emit("mapReady", {});
    }, 500);

    console.log("Leaflet map initialized (India center)");
  },


  /*
  ============================================================
  PRIVATE: SETUP TOOLBAR
  ============================================================
  */

  _setupToolbar() {

    document.querySelectorAll(".cc-toolbar-btn").forEach(btn => {

      btn.addEventListener("click", () => {

        const layer = btn.getAttribute("data-layer");

        if (layer) {
          this.setLayer(layer);
        }
      });
    });
  },


  /*
  ============================================================
  PRIVATE: SETUP CONTROLS
  ============================================================
  */

  _setupControls() {

    // Zoom In
    const zoomIn = document.getElementById("ccZoomIn");
    if (zoomIn) {
      zoomIn.addEventListener("click", () => {
        if (this._map) this._map.zoomIn();
      });
    }

    // Zoom Out
    const zoomOut = document.getElementById("ccZoomOut");
    if (zoomOut) {
      zoomOut.addEventListener("click", () => {
        if (this._map) this._map.zoomOut();
      });
    }

    // Reset View
    const resetView = document.getElementById("ccResetView");
    if (resetView) {
      resetView.addEventListener("click", () => {
        this.resetView();
      });
    }

    // Refresh
    const refresh = document.getElementById("ccRefresh");
    if (refresh) {
      refresh.addEventListener("click", () => {
        this._emit("refresh", {});
        console.log("Command Center refresh requested");
      });
    }

    // Fullscreen
    const fullscreen = document.getElementById("ccFullscreen");
    if (fullscreen) {
      fullscreen.addEventListener("click", () => {
        this.toggleFullscreen();
      });
    }

    // Layer toggles (radio style)
    document.querySelectorAll(".cc-layer-toggle").forEach(toggle => {

      toggle.addEventListener("change", (e) => {

        const layer = e.target.getAttribute("data-layer");
        const checked = e.target.checked;

        if (checked && layer) {
          this.setLayer(layer);
        }

        console.log("Layer toggle:", layer, checked);
      });
    });
  },


  /*
  ============================================================
  PRIVATE: SETUP INFO PANEL
  ============================================================
  */

  _setupInfoPanel() {

    const infoEl = document.getElementById("ccLocationInfo");

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="placeholder-content placeholder-content-sm">
          <div class="placeholder-icon">📍</div>
          <p>Select any State or City on the map.</p>
          <p style="margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.3);">
            Location analytics will appear here.
          </p>
        </div>
      `;
    }
  },


  /*
  ============================================================
  PRIVATE: UPDATE INFO PANEL
  ============================================================
  */

  _updateInfoPanel(title, data) {

    const infoEl = document.getElementById("ccLocationInfo");

    if (!infoEl) return;

    let html = `<div style="padding: 4px 0;">`;

    if (title) {
      html += `<div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #fff;">${title}</div>`;
    }

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        html += `
          <div class="panel-list-item">
            <span class="item-label">${key}</span>
            <span class="item-value muted">${value}</span>
          </div>
        `;
      }
    }

    html += `</div>`;

    infoEl.innerHTML = html;
  },


  /*
  ============================================================
  PRIVATE: SETUP STATUS BAR
  ============================================================
  */

  _setupStatusBar() {

    this._updateStatusBar();
  },


  /*
  ============================================================
  PRIVATE: UPDATE STATUS BAR
  ============================================================
  */

  _updateStatusBar() {

    const statusLayerEl = document.getElementById("ccStatusLayer");
    const statusMapEl = document.getElementById("ccStatusMap");

    if (statusLayerEl) {
      statusLayerEl.textContent = this._activeLayer || "None";
    }

    if (statusMapEl) {
      statusMapEl.textContent = this._map ? "Ready" : "Not initialized";
    }
  },


  /*
  ============================================================
  PRIVATE: SETUP EVENTS
  ============================================================
  */

  _setupEvents() {

    // Listen for map ready event
    this.on("mapReady", () => {
      console.log("Event: Map Ready (logged for future integration)");
      this._updateStatusBar();
    });

    // Listen for layer changes
    this.on("layerChange", (data) => {
      console.log("Event: Layer changed to", data.layer, "(logged for future integration)");
    });

    // Listen for map clicks
    this.on("mapClick", (data) => {
      console.log("Event: Map clicked at", data.lat, data.lng, "(logged for future integration)");
    });

    // Listen for zoom changes
    this.on("zoomChange", (data) => {
      console.log("Event: Zoom changed to", data.zoom, "(logged for future integration)");
    });

    // Listen for refresh
    this.on("refresh", () => {
      console.log("Event: Refresh requested (logged for future integration)");
    });

    console.log("Command Center events registered");
  },


  /*
  ============================================================
  PRIVATE: EMIT EVENT
  ============================================================
  */

  _emit(event, data) {

    if (!this._listeners[event]) return;

    this._listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error("Command Center event error (" + event + "):", err);
      }
    });
  }
};


/*
============================================================
GLOBAL EXPORT
============================================================
*/

window.CommandCenter = CommandCenter;

console.log("Command Center module loaded (Phase 5.3A)");