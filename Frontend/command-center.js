/*
============================================================
EKKA1KM FRONTEND
command-center.js
V5.10.0 - LIVE COMMAND CENTER (Phase 5.3B)
Live Data & Analytics with Leaflet
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
    currentMode: "Standard",
    refreshInterval: 60000, // 60 seconds default
    refreshIntervals: {
      "30s": 30000,
      "60s": 60000,
      "5m": 300000
    }
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
  _data: null,
  _refreshTimer: null,


  /*
  ============================================================
  INIT
  Initialize the map and all UI components
  ============================================================
  */

  async init() {

    if (this._initialized) return;

    this._setupHeader();
    await this._loadData();
    this._initMap();
    this._setupToolbar();
    this._setupControls();
    this._setupInfoPanel();
    this._setupStatusBar();
    this._setupEvents();
    this._startAutoRefresh();

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

    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }

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
  REFRESH DATA
  Reload all data from backend
  ============================================================
  */

  async refreshData() {

    await this._loadData();
    this._renderActiveLayer();
    this._updateStatusBar();
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

    // Render layer on map
    this._renderActiveLayer();

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
  PRIVATE: LOAD DATA
  Fetches all command center data from backend
  ============================================================
  */

  async _loadData() {

    const session = AdminAuth.getSession();

    if (!session) {
      console.warn("No admin session for command center data");
      return;
    }

    try {

      const response = await fetch(
        getApiUrl() +
        "?action=ccdata" +
        "&session=" +
        encodeURIComponent(session)
      );

      const json = await response.json();

      if (json && json.success && json.data) {
        this._data = json.data;
        console.log("Command Center data loaded", json.data);
      } else {
        console.warn("Command Center data load failed:", json.message);
      }

    } catch (err) {
      console.error("Command Center data error:", err);
    }
  },


  /*
  ============================================================
  PRIVATE: RENDER ACTIVE LAYER
  Renders the currently selected layer on the map
  ============================================================
  */

  _renderActiveLayer() {

    if (!this._map || !this._data) return;

    // Clear existing markers
    this._clearMarkers();

    const layer = this._activeLayer;

    if (!layer || layer === "standard") {
      // No layer selected - just show base map
      return;
    }

    // Render based on active layer
    switch (layer) {
      case "heatmap":
        this._renderHeatMap();
        break;
      case "liveusers":
        this._renderLiveUsers();
        break;
      case "businesses":
        this._renderBusinesses();
        break;
      case "ads":
        this._renderAdvertisements();
        break;
      case "promotions":
        this._renderPromotions();
        break;
      default:
        console.log("Layer not implemented yet:", layer);
    }
  },


  /*
  ============================================================
  PRIVATE: CLEAR MARKERS
  Removes all markers from the map
  ============================================================
  */

  _clearMarkers() {

    this._markers.forEach(marker => {
      if (marker && this._map) {
        this._map.removeLayer(marker);
      }
    });

    this._markers = [];
  },


  /*
  ============================================================
  PRIVATE: RENDER HEAT MAP
  Uses leaflet.heat plugin if available, otherwise shows circles
  ============================================================
  */

  _renderHeatMap() {

    if (!this._data.heatmap || !this._map) return;

    const points = this._data.heatmap;

    // Check if leaflet.heat is available
    if (typeof L.heatLayer !== "undefined") {
      const heatPoints = points.map(p => [p.lat, p.lng, p.intensity || 1]);
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        max: 2.0
      }).addTo(this._map);
      this._layers.heatmap = heatLayer;
    } else {
      // Fallback: show as circles with opacity
      points.forEach(point => {
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 8,
          fillColor: "#ff4757",
          color: "#ff4757",
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.4
        }).addTo(this._map);
        this._markers.push(marker);
      });
    }
  },


  /*
  ============================================================
  PRIVATE: RENDER LIVE USERS
  Shows user markers with clustering support
  ============================================================
  */

  _renderLiveUsers() {

    if (!this._data.liveUsers || !this._map) return;

    const users = this._data.liveUsers;

    users.forEach(user => {
      const marker = L.marker([user.lat, user.lng])
        .addTo(this._map)
        .bindPopup(`
          <div style="font-size: 13px;">
            <strong>${user.name}</strong><br/>
            <span style="color: #666;">${user.city}, ${user.state}</span><br/>
            <small>Status: ${user.status}</small>
          </div>
        `);
      this._markers.push(marker);
    });
  },


  /*
  ============================================================
  PRIVATE: RENDER BUSINESSES
  Shows business markers with popup details
  ============================================================
  */

  _renderBusinesses() {

    if (!this._data.businesses || !this._map) return;

    const businesses = this._data.businesses;

    businesses.forEach(biz => {
      const marker = L.marker([biz.lat, biz.lng])
        .addTo(this._map)
        .bindPopup(`
          <div style="font-size: 13px; min-width: 200px;">
            <strong>${biz.name}</strong><br/>
            <span style="color: #666;">${biz.category}</span><br/>
            <small>Owner: ${biz.owner}</small><br/>
            <small>Products: ${biz.productsCount}</small><br/>
            <small>Promotion: ${biz.promotionStatus}</small>
          </div>
        `);
      this._markers.push(marker);
    });
  },


  /*
  ============================================================
  PRIVATE: RENDER ADVERTISEMENTS
  Shows ad markers with campaign details
  ============================================================
  */

  _renderAdvertisements() {

    if (!this._data.advertisements || !this._map) return;

    const ads = this._data.advertisements;

    ads.forEach(ad => {
      const marker = L.marker([ad.lat, ad.lng])
        .addTo(this._map)
        .bindPopup(`
          <div style="font-size: 13px; min-width: 200px;">
            <strong>${ad.name}</strong><br/>
            <small>Radius: ${ad.radius} km</small><br/>
            <small>Views: ${ad.views}</small><br/>
            <small>Clicks: ${ad.clicks}</small><br/>
            <small>Budget: ₹${ad.budget}</small>
          </div>
        `);
      this._markers.push(marker);
    });
  },


  /*
  ============================================================
  PRIVATE: RENDER PROMOTIONS
  Shows promotion markers (different style from businesses)
  ============================================================
  */

  _renderPromotions() {

    if (!this._data.promotions || !this._map) return;

    const promotions = this._data.promotions;

    promotions.forEach(promo => {
      const marker = L.marker([promo.lat, promo.lng])
        .addTo(this._map)
        .bindPopup(`
          <div style="font-size: 13px; min-width: 200px;">
            <strong>${promo.name}</strong><br/>
            <small>Type: ${promo.type}</small><br/>
            <small>Budget: ₹${promo.budget}</small><br/>
            <small>Status: ${promo.status}</small>
          </div>
        `);
      this._markers.push(marker);
    });
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
    const layerEl = document.getElementById("ccCurrentLayer");
    const mapStatusEl = document.getElementById("ccCurrentMapStatus");

    if (radiusEl) {
      radiusEl.textContent = this.config.currentRadius;
    }

    if (modeEl) {
      modeEl.textContent = this.config.currentMode;
    }

    if (layerEl) {
      layerEl.textContent = "None";
    }

    if (mapStatusEl) {
      mapStatusEl.textContent = "Initializing...";
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
      const zoom = this._map.getZoom();
      this._emit("zoomChange", { zoom: zoom });
      console.log("Zoom changed:", zoom);
      this._updateStatusBar();
    });

    this._map.on("load", () => {
      this._emit("mapReady", {});
      console.log("Map ready");
    });

    // Mark map as ready
    setTimeout(() => {
      this._map.invalidateSize();
      this._emit("mapReady", {});
      const mapStatusEl = document.getElementById("ccCurrentMapStatus");
      if (mapStatusEl) {
        mapStatusEl.textContent = "Ready";
      }
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
      refresh.addEventListener("click", async () => {
        await this.refreshData();
        this._emit("refresh", {});
        console.log("Command Center refresh completed");
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
    const statusRadiusEl = document.getElementById("ccStatusRadius");
    const statusZoomEl = document.getElementById("ccCurrentZoom");

    if (statusLayerEl) {
      statusLayerEl.textContent = this._activeLayer || "None";
    }

    if (statusMapEl) {
      statusMapEl.textContent = this._map ? "Ready" : "Not initialized";
    }

    if (statusRadiusEl) {
      statusRadiusEl.textContent = this.config.currentRadius;
    }

    if (statusZoomEl && this._map) {
      statusZoomEl.textContent = "Zoom " + this._map.getZoom();
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
  PRIVATE: START AUTO REFRESH
  ============================================================
  */

  _startAutoRefresh() {

    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }

    this._refreshTimer = setInterval(() => {
      this.refreshData();
    }, this.config.refreshInterval);

    console.log("Auto-refresh started:", this.config.refreshInterval / 1000, "seconds");
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

console.log("Command Center module loaded (Phase 5.3B)");