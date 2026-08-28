/*
============================================================
EKKA1KM FRONTEND
admin-push.js
ENTERPRISE PUSH NOTIFICATION STUDIO (V7.1)
- Multi-City Location Autocomplete Search (Nominatim + India Geocoding)
- OpenStreetMap Dark Tile Visualizer with 0 API keys / 0 watermarks
- Dynamic Leaflet Radius Circle & Audience Estimator
- Content Studio with Live Character Counters (100 / 500)
- Multimodal Attachments & Structured In-App Deep Link Routing
- Scheduling Engine (Send Now vs Scheduled Delivery)
- Live Android 14 Notification Card Mockup + Fullscreen Lock Screen
- Detailed FCM Delivery Diagnosis & Error Feedback
============================================================
*/

(function () {

  // Studio State
  var PUSH_STATE = {
    audienceType: "location", // all, location, specific, segments
    locationMode: "radius",   // radius, cities, states, custom, country
    locationName: "Indore, Madhya Pradesh, India",
    lat: 22.7196,
    lng: 75.8577,
    radiusKM: 51,
    specificUsers: "U001",
    selectedSegments: ["Business Owners", "Verified Users"],
    title: "New Property Launch in Indore!",
    message: "Premium 3BHK Apartments near Vijay Nagar. Limited units available. Book your visit now!",
    notificationType: "Announcement",
    priority: "High",
    scheduleMode: "now",      // now, later
    scheduledTime: "",
    attachmentType: "Image",
    attachments: [
      { id: "att_1", type: "Image", name: "property-launch.jpg", size: "1.24 MB", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop" },
      { id: "att_2", type: "Video", name: "promo-video.mp4", size: "5.48 MB", url: "" }
    ],
    linkType: "In-App Page",
    selectedPage: "Property Details",
    referenceId: "PROP_78945",
    fallbackUrl: "https://www.ekka1km.com/property/78945",
    estimatedReach: 12540,
    isEstimating: false
  };

  // Common Indian Multi-Name Presets for Instant Fuzzy Lookup
  var POPULAR_INDIAN_LOCATIONS = [
    { name: "Rajgarh (Biaora)", district: "Rajgarh District", state: "Madhya Pradesh", lat: 24.008, lng: 76.730 },
    { name: "Rajgarh (Near Sardarpur / Dhar)", district: "Dhar District", state: "Madhya Pradesh", lat: 22.684, lng: 74.954 },
    { name: "Rajgarh (Sadulpur)", district: "Churu District", state: "Rajasthan", lat: 28.304, lng: 75.385 },
    { name: "Rajgarh (Alwar)", district: "Alwar District", state: "Rajasthan", lat: 27.234, lng: 76.623 },
    { name: "Rajgarh (Sirmaur)", district: "Sirmaur District", state: "Himachal Pradesh", lat: 30.852, lng: 77.300 },
    { name: "Indore", district: "Indore District", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
    { name: "Bhopal", district: "Bhopal District", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
    { name: "Ujjain", district: "Ujjain District", state: "Madhya Pradesh", lat: 23.1765, lng: 75.7885 },
    { name: "Jabalpur", district: "Jabalpur District", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864 },
    { name: "Gwalior", district: "Gwalior District", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828 },
    { name: "Jaipur", district: "Jaipur District", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
    { name: "Delhi NCR", district: "Central Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
    { name: "Mumbai", district: "Mumbai City", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
    { name: "Pune", district: "Pune District", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
    { name: "Ahmedabad", district: "Ahmedabad District", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
    { name: "Rampur", district: "Rampur District", state: "Uttar Pradesh", lat: 28.8031, lng: 79.0270 },
    { name: "Bilaspur", district: "Bilaspur District", state: "Chhattisgarh", lat: 22.0797, lng: 82.1409 },
    { name: "Bilaspur", district: "Bilaspur District", state: "Himachal Pradesh", lat: 31.3315, lng: 76.7570 },
    { name: "Aurangabad (Chhatrapati Sambhajinagar)", district: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.3433 },
    { name: "Aurangabad", district: "Aurangabad District", state: "Bihar", lat: 24.7538, lng: 84.3742 }
  ];

  var _leafletMap = null;
  var _leafletCircle = null;
  var _leafletMarker = null;
  var _estimateDebounce = null;
  var _searchDebounce = null;

  AdminModules.register("notifications", async function (container) {

    var session = AdminAuth.getSession();
    if (!session) {
      container.innerHTML = '<div class="module-error"><span class="module-error-icon">🔒</span><h3>Session Expired</h3><p>Please login again.</p></div>';
      return;
    }

    try {
      var savedDraft = localStorage.getItem("ekka1km_push_draft");
      if (savedDraft) {
        var parsed = JSON.parse(savedDraft);
        Object.assign(PUSH_STATE, parsed);
      }
    } catch (e) {}

    renderStudio(container);
  });

  function renderStudio(container) {
    var html = `
    <style>
      .push-studio-root {
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: #f1f5f9;
      }
      .push-studio-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .push-studio-title-group h2 {
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .push-studio-title-group p {
        margin: 0;
        font-size: 13px;
        color: #94a3b8;
      }
      .push-studio-top-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .push-studio-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
        gap: 20px;
      }
      @media (max-width: 1100px) {
        .push-studio-grid { grid-template-columns: 1fr; }
      }
      .push-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 18px;
        position: relative;
      }
      .push-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
      }
      .push-step-badge {
        background: #8b5cf6;
        color: #fff;
        font-weight: 700;
        font-size: 12px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .push-card-title {
        font-size: 15px;
        font-weight: 600;
        color: #f8fafc;
        margin: 0;
      }
      .push-card-desc {
        font-size: 12px;
        color: #94a3b8;
        margin: 0 0 16px 32px;
      }
      .push-tabs {
        display: flex;
        gap: 8px;
        background: #0d1117;
        padding: 4px;
        border-radius: 8px;
        border: 1px solid #21262d;
        margin-bottom: 14px;
        overflow-x: auto;
      }
      .push-tab {
        flex: 1;
        text-align: center;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        background: transparent;
        border: none;
      }
      .push-tab.active {
        background: #8b5cf6;
        color: #fff;
        font-weight: 600;
      }
      .push-sub-tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 14px;
        overflow-x: auto;
      }
      .push-sub-tab {
        padding: 5px 12px;
        font-size: 11px;
        background: #21262d;
        color: #cbd5e1;
        border: 1px solid #30363d;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .push-sub-tab.active {
        background: #38295c;
        border-color: #8b5cf6;
        color: #c4b5fd;
        font-weight: 600;
      }
      .push-input-group {
        margin-bottom: 14px;
        position: relative;
      }
      .push-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .push-label {
        font-size: 12px;
        font-weight: 600;
        color: #cbd5e1;
      }
      .push-counter {
        font-size: 11px;
        color: #64748b;
      }
      .push-input, .push-textarea, .push-select {
        width: 100%;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 10px 12px;
        color: #f8fafc;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }
      .push-input:focus, .push-textarea:focus, .push-select:focus {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 2px rgba(139,92,246,0.2);
      }
      /* Autocomplete Dropdown List */
      .push-autocomplete-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #161b22;
        border: 1px solid #8b5cf6;
        border-radius: 8px;
        margin-top: 4px;
        max-height: 240px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      }
      .push-autocomplete-item {
        padding: 10px 14px;
        border-bottom: 1px solid #21262d;
        cursor: pointer;
        transition: background 0.15s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .push-autocomplete-item:last-child {
        border-bottom: none;
      }
      .push-autocomplete-item:hover {
        background: #21262d;
      }
      .push-ac-title {
        font-size: 13px;
        font-weight: 600;
        color: #f8fafc;
        margin-bottom: 2px;
      }
      .push-ac-sub {
        font-size: 11px;
        color: #94a3b8;
      }
      .push-ac-coords {
        font-size: 10px;
        background: #21262d;
        color: #8b5cf6;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .push-slider-container {
        margin: 12px 0 16px 0;
      }
      .push-slider {
        width: 100%;
        accent-color: #8b5cf6;
        cursor: pointer;
      }
      .push-quick-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .push-chip {
        padding: 4px 10px;
        font-size: 11px;
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #94a3b8;
        cursor: pointer;
      }
      .push-chip.active {
        background: #8b5cf6;
        color: #fff;
        border-color: #8b5cf6;
        font-weight: 600;
      }
      .push-audience-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(34, 197, 94, 0.08);
        border: 1px solid rgba(34, 197, 94, 0.25);
        border-radius: 10px;
        padding: 12px 16px;
        margin-top: 14px;
      }
      .push-audience-num {
        font-size: 16px;
        font-weight: 700;
        color: #22c55e;
      }
      .push-audience-desc {
        font-size: 11px;
        color: #94a3b8;
      }
      .push-att-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #0d1117;
        border: 1px solid #21262d;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 8px;
      }
      .push-att-info {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
      }
      .push-att-remove {
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 14px;
      }
      /* Right Column Previews */
      .push-preview-pane {
        position: sticky;
        top: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .push-map-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        overflow: hidden;
      }
      .push-map-header {
        padding: 12px 16px;
        font-size: 13px;
        font-weight: 600;
        border-bottom: 1px solid #30363d;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #pushTargetMap {
        height: 250px;
        width: 100%;
        background: #090d13;
      }
      /* Custom clean dark style for OpenStreetMap tiles */
      #pushTargetMap .leaflet-tile-pane {
        filter: brightness(0.65) invert(1) contrast(2.8) hue-rotate(200deg) saturate(0.3) brightness(0.7);
      }
      .push-map-footer {
        padding: 8px 16px;
        background: #0d1117;
        font-size: 11px;
        color: #22c55e;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      /* Phone Push Card Preview */
      .push-phone-preview-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 16px;
      }
      .push-notif-box {
        background: #1e2530;
        border: 1px solid #334155;
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .push-notif-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .push-notif-app {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #cbd5e1;
      }
      .push-notif-app-icon {
        width: 16px;
        height: 16px;
        background: #22c55e;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #fff;
      }
      .push-notif-time {
        font-size: 10px;
        color: #64748b;
      }
      .push-notif-body {
        display: flex;
        gap: 12px;
      }
      .push-notif-text {
        flex: 1;
      }
      .push-notif-title {
        font-size: 13px;
        font-weight: 700;
        color: #f8fafc;
        margin-bottom: 3px;
      }
      .push-notif-msg {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .push-notif-thumb {
        width: 50px;
        height: 50px;
        border-radius: 6px;
        object-fit: cover;
        background: #334155;
      }
      .push-demo-tag {
        background: #8b5cf6;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
    </style>

    <div class="push-studio-root">

      <!-- Header -->
      <div class="push-studio-header">
        <div class="push-studio-title-group">
          <h2>
            <span>🔔 Push Notification System</span>
            <span class="push-demo-tag">ENTERPRISE STUDIO</span>
          </h2>
          <p>Send targeted push notifications based on multi-city location, radius, or audience segments.</p>
        </div>
        <div class="push-studio-top-actions">
          <button class="module-btn module-btn-secondary" style="font-size:11px;" onclick="window._pushOpenFcmConfigModal()">⚙️ FCM Settings</button>
          <button class="module-btn module-btn-secondary" onclick="window._pushSaveDraft()">💾 Save as Draft</button>
          <button class="module-btn module-btn-primary" onclick="window._pushOpenPreviewModal()">🚀 Preview & Send</button>
        </div>
      </div>

      <!-- FCM Configuration Status Alert Banner -->
      <div id="pushFcmStatusAlert" style="display:none;"></div>

      <!-- Studio Grid -->
      <div class="push-studio-grid">

        <!-- Left Workflow Pane -->
        <div class="push-studio-left">

          <!-- 1. Audience & Targeting -->
          <div class="push-card">
            <div class="push-card-header">
              <span class="push-step-badge">1</span>
              <h3 class="push-card-title">Audience & Targeting</h3>
            </div>
            <p class="push-card-desc">Select who should receive this notification</p>

            <label class="push-label" style="margin-bottom:8px;display:block;">Audience Type</label>
            <div class="push-tabs">
              <button class="push-tab ${PUSH_STATE.audienceType==='all'?'active':''}" onclick="window._pushSetAudience('all')">👥 All Users</button>
              <button class="push-tab ${PUSH_STATE.audienceType==='location'?'active':''}" onclick="window._pushSetAudience('location')">📍 Location Based</button>
              <button class="push-tab ${PUSH_STATE.audienceType==='specific'?'active':''}" onclick="window._pushSetAudience('specific')">👤 Specific Users</button>
              <button class="push-tab ${PUSH_STATE.audienceType==='segments'?'active':''}" onclick="window._pushSetAudience('segments')">🎯 User Segments</button>
            </div>

            <!-- Location Sub-Options -->
            <div id="pushLocationSection" style="${PUSH_STATE.audienceType==='location'?'':'display:none;'}">
              <div class="push-sub-tabs">
                <span class="push-sub-tab active">Radius</span>
                <span class="push-sub-tab" onclick="showToast('Select city in the search bar below', 'info')">Cities</span>
                <span class="push-sub-tab" onclick="showToast('Select state in the search bar below', 'info')">States</span>
                <span class="push-sub-tab" onclick="showToast('Click and drag radius slider', 'info')">Custom Area</span>
                <span class="push-sub-tab" onclick="window._pushSetRadius(2500)">Country</span>
              </div>

              <!-- Location Search with Live Autocomplete -->
              <div class="push-input-group">
                <div class="push-label-row">
                  <span class="push-label">Search Location / City / Town *</span>
                  <button type="button" class="module-btn module-btn-secondary" style="padding:2px 8px;font-size:10px;" onclick="window._pushUseCurrentLocation()">📍 Use Current Location</button>
                </div>
                <input type="text" id="pushLocationInput" class="push-input" value="${esc(PUSH_STATE.locationName)}" oninput="window._pushHandleLocationType(this.value)" placeholder="Type city or area (e.g. Rajgarh, Indore, Dhar, Churu...)" autocomplete="off" />
                <div id="pushLocationSuggestions" class="push-autocomplete-dropdown" style="display:none;"></div>
                <span style="font-size:11px;color:#64748b;margin-top:4px;display:block;">💡 Tip: Type a name to select among same-named cities across different states.</span>
              </div>

              <div class="push-slider-container">
                <div class="push-label-row">
                  <span class="push-label">Radius (km)</span>
                  <span class="push-label" style="color:#8b5cf6;font-size:13px;" id="pushRadiusDisplay">${PUSH_STATE.radiusKM} km</span>
                </div>
                <input type="range" min="5" max="250" value="${PUSH_STATE.radiusKM}" class="push-slider" id="pushRadiusSlider" oninput="window._pushRadiusInput(this.value)" />
                <div class="push-quick-chips">
                  <span class="push-chip ${PUSH_STATE.radiusKM==5?'active':''}" onclick="window._pushSetRadius(5)">5 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM==10?'active':''}" onclick="window._pushSetRadius(10)">10 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM==25?'active':''}" onclick="window._pushSetRadius(25)">25 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM==51?'active':''}" onclick="window._pushSetRadius(51)">51 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM==100?'active':''}" onclick="window._pushSetRadius(100)">100 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM==250?'active':''}" onclick="window._pushSetRadius(250)">250 km</span>
                  <span class="push-chip ${PUSH_STATE.radiusKM>=2500?'active':''}" onclick="window._pushSetRadius(2500)">All India</span>
                </div>
              </div>
            </div>

            <!-- Specific Users Sub-Option -->
            <div id="pushSpecificSection" style="${PUSH_STATE.audienceType==='specific'?'':'display:none;'}">
              <div class="push-input-group">
                <label class="push-label" style="margin-bottom:6px;display:block;">User IDs (comma-separated) *</label>
                <input type="text" id="pushSpecificInput" class="push-input" value="${esc(PUSH_STATE.specificUsers)}" oninput="PUSH_STATE.specificUsers=this.value;window._pushTriggerEstimate();" placeholder="e.g. U001, U002..." />
              </div>
            </div>

            <!-- Segments Sub-Option -->
            <div id="pushSegmentsSection" style="${PUSH_STATE.audienceType==='segments'?'':'display:none;'}">
              <label class="push-label" style="margin-bottom:6px;display:block;">Select Segments</label>
              <div class="push-quick-chips">
                <span class="push-chip active">🏪 Business Owners</span>
                <span class="push-chip active">⭐ Verified Users</span>
                <span class="push-chip">📰 News Publishers</span>
                <span class="push-chip">🆕 New Installs (< 7d)</span>
              </div>
            </div>

            <!-- Estimated Audience Banner -->
            <div class="push-audience-banner">
              <span style="font-size:24px;">👥</span>
              <div>
                <div class="push-audience-num" id="pushAudienceReach">${Number(PUSH_STATE.estimatedReach).toLocaleString()} Users</div>
                <div class="push-audience-desc">(Active devices reachable in selected targeting) ⓘ</div>
              </div>
            </div>
          </div>

          <!-- 2. Content -->
          <div class="push-card">
            <div class="push-card-header">
              <span class="push-step-badge">2</span>
              <h3 class="push-card-title">Content</h3>
            </div>
            <p class="push-card-desc">Create your notification content</p>

            <div class="push-input-group">
              <div class="push-label-row">
                <span class="push-label">Title *</span>
                <span class="push-counter" id="pushTitleCounter">${PUSH_STATE.title.length}/100</span>
              </div>
              <input type="text" id="pushTitleInput" class="push-input" maxlength="100" value="${esc(PUSH_STATE.title)}" oninput="window._pushContentInput()" placeholder="Notification title" />
            </div>

            <div class="push-input-group">
              <div class="push-label-row">
                <span class="push-label">Message *</span>
                <span class="push-counter" id="pushMsgCounter">${PUSH_STATE.message.length}/500</span>
              </div>
              <textarea id="pushMessageInput" class="push-textarea" rows="3" maxlength="500" oninput="window._pushContentInput()" placeholder="Notification message text">${esc(PUSH_STATE.message)}</textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label class="push-label" style="margin-bottom:6px;display:block;">Notification Type</label>
                <select class="push-select" id="pushTypeSelect" onchange="PUSH_STATE.notificationType=this.value;">
                  <option value="Announcement" ${PUSH_STATE.notificationType==='Announcement'?'selected':''}>📢 Announcement</option>
                  <option value="Promotion" ${PUSH_STATE.notificationType==='Promotion'?'selected':''}>🏷️ Promotion</option>
                  <option value="Alert" ${PUSH_STATE.notificationType==='Alert'?'selected':''}>⚠️ Alert</option>
                  <option value="Update" ${PUSH_STATE.notificationType==='Update'?'selected':''}>🔄 Update</option>
                </select>
              </div>
              <div>
                <label class="push-label" style="margin-bottom:6px;display:block;">Priority</label>
                <select class="push-select" id="pushPrioritySelect" onchange="PUSH_STATE.priority=this.value;">
                  <option value="High" ${PUSH_STATE.priority==='High'?'selected':''}>🔥 High (Sound & Heads-Up)</option>
                  <option value="Medium" ${PUSH_STATE.priority==='Medium'?'selected':''}>⚡ Medium (Standard)</option>
                  <option value="Low" ${PUSH_STATE.priority==='Low'?'selected':''}>💤 Low (Silent)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 3. Schedule -->
          <div class="push-card">
            <div class="push-card-header">
              <span class="push-step-badge">3</span>
              <h3 class="push-card-title">Schedule</h3>
            </div>
            <p class="push-card-desc">Choose when this notification should be delivered</p>

            <div style="display:flex;gap:18px;margin-bottom:12px;">
              <label style="font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <input type="radio" name="pushScheduleRadio" value="now" ${PUSH_STATE.scheduleMode==='now'?'checked':''} onchange="window._pushSetScheduleMode('now')" />
                <strong>Send Now</strong>
              </label>
              <label style="font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <input type="radio" name="pushScheduleRadio" value="later" ${PUSH_STATE.scheduleMode==='later'?'checked':''} onchange="window._pushSetScheduleMode('later')" />
                <span>Schedule for Later</span>
              </label>
            </div>

            <div id="pushScheduleTimeGroup" style="${PUSH_STATE.scheduleMode==='later'?'':'display:none;'}margin-bottom:12px;">
              <input type="datetime-local" class="push-input" id="pushScheduleInput" onchange="PUSH_STATE.scheduledTime=this.value;" />
            </div>

            <div style="font-size:11px;color:#64748b;">
              <span>Time Zone: <strong>Asia/Kolkata</strong> 📅</span>
            </div>
          </div>

          <!-- 4. Attachments (Optional) -->
          <div class="push-card">
            <div class="push-card-header">
              <span class="push-step-badge">4</span>
              <h3 class="push-card-title">Attachments <span style="font-size:11px;font-weight:normal;color:#94a3b8;">(Optional)</span></h3>
            </div>
            <p class="push-card-desc">Add media or documents to enrich your push notification</p>

            <div class="push-sub-tabs">
              <span class="push-sub-tab active">Image</span>
              <span class="push-sub-tab">Video</span>
              <span class="push-sub-tab">Link</span>
              <span class="push-sub-tab">In-App Page</span>
              <span class="push-sub-tab">Document</span>
            </div>

            <div id="pushAttachmentsList">
              ${renderAttachmentRows()}
            </div>

            <div style="margin-top:10px;">
              <button type="button" class="module-btn module-btn-secondary" style="font-size:11px;" onclick="window._pushAddAttachmentPrompt()">+ Add Another Attachment</button>
            </div>
          </div>

          <!-- 5. Deep Link / Action (Optional) -->
          <div class="push-card">
            <div class="push-card-header">
              <span class="push-step-badge">5</span>
              <h3 class="push-card-title">Deep Link / Action <span style="font-size:11px;font-weight:normal;color:#94a3b8;">(Optional)</span></h3>
            </div>
            <p class="push-card-desc">Direct users to an in-app feature or external destination</p>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
              <div>
                <label class="push-label" style="margin-bottom:4px;display:block;">Link Type</label>
                <select class="push-select" id="pushLinkTypeSelect" onchange="PUSH_STATE.linkType=this.value;">
                  <option value="In-App Page">In-App Page</option>
                  <option value="External URL">External URL</option>
                </select>
              </div>
              <div>
                <label class="push-label" style="margin-bottom:4px;display:block;">Select Page</label>
                <select class="push-select" id="pushPageSelect" onchange="PUSH_STATE.selectedPage=this.value;window._pushSyncDeepLink();">
                  <option value="Property Details">Property Details</option>
                  <option value="Product Details">Product Details</option>
                  <option value="Business Profile">Business Profile</option>
                  <option value="News Article">News Article</option>
                  <option value="Live PIP Stream">Live PIP Stream</option>
                  <option value="Wallet">Wallet / Rewards</option>
                  <option value="Profile">User Profile</option>
                </select>
              </div>
              <div>
                <label class="push-label" style="margin-bottom:4px;display:block;">Property ID / Ref</label>
                <input type="text" class="push-input" id="pushRefInput" value="${esc(PUSH_STATE.referenceId)}" oninput="PUSH_STATE.referenceId=this.value;window._pushSyncDeepLink();" placeholder="e.g. PROP_78945" />
              </div>
            </div>

            <div class="push-input-group">
              <label class="push-label" style="margin-bottom:4px;display:block;">Fallback URL (External)</label>
              <input type="text" class="push-input" id="pushFallbackInput" value="${esc(PUSH_STATE.fallbackUrl)}" oninput="PUSH_STATE.fallbackUrl=this.value;" placeholder="https://www.ekka1km.com/..." />
            </div>
          </div>

        </div>

        <!-- Right Visual Pane -->
        <div class="push-studio-right">
          <div class="push-preview-pane">

            <!-- Target Area Map Card -->
            <div class="push-map-card">
              <div class="push-map-header">
                <span>Target Area Preview</span>
                <span class="push-chip active" id="pushMapRadiusBadge" style="padding:2px 8px;font-size:10px;">Radius: ${PUSH_STATE.radiusKM} km</span>
              </div>
              <div id="pushTargetMap"></div>
              <div class="push-map-footer">
                <span>📍 Center: <strong id="pushMapCenterText">${esc(PUSH_STATE.locationName)}</strong></span>
              </div>
            </div>

            <!-- Live Phone Preview Card -->
            <div class="push-phone-preview-card">
              <div class="push-map-header" style="border:none;padding:0 0 12px 0;">
                <span>Live Preview</span>
                <span style="font-size:11px;color:#8b5cf6;">Android 14 shade</span>
              </div>

              <div class="push-notif-box">
                <div class="push-notif-header">
                  <div class="push-notif-app">
                    <span class="push-notif-app-icon">E</span>
                    <span>Ekka1km</span>
                  </div>
                  <span class="push-notif-time">now</span>
                </div>

                <div class="push-notif-body">
                  <div class="push-notif-text">
                    <div class="push-notif-title" id="pushLiveTitle">${esc(PUSH_STATE.title)}</div>
                    <div class="push-notif-msg" id="pushLiveMsg">${esc(PUSH_STATE.message)}</div>
                  </div>
                  <img id="pushLiveThumb" class="push-notif-thumb" src="${PUSH_STATE.attachments[0]?PUSH_STATE.attachments[0].url:'https://dummyimage.com/100x100/1e2530/fff.png&text=Ekka'}" />
                </div>
              </div>

              <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;">
                <button type="button" class="module-btn module-btn-secondary" style="width:100%;justify-content:center;" onclick="window._pushOpenFullscreenMockup()">👁️ Preview Full Screen</button>
                <span style="font-size:11px;color:#64748b;text-align:center;">This is how your notification will appear on user's device.</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
    `;

    container.innerHTML = html;

    // Close autocomplete on outside click
    document.addEventListener("click", function(e) {
      if (!e.target.closest(".push-input-group")) {
        var sug = document.getElementById("pushLocationSuggestions");
        if (sug) sug.style.display = "none";
      }
    });

    // Initialize Leaflet Map & FCM Status check after DOM insertion
    setTimeout(function() {
      initLeafletMap();
      triggerAudienceEstimation();
      if (typeof window._pushCheckFcmStatus === "function") window._pushCheckFcmStatus();
    }, 150);
  }

  function renderAttachmentRows() {
    if (!PUSH_STATE.attachments || PUSH_STATE.attachments.length === 0) {
      return '<div style="font-size:12px;color:#64748b;padding:8px 0;">No attachments added.</div>';
    }
    return PUSH_STATE.attachments.map(function(att, idx) {
      var icon = att.type === "Image" ? "🖼️" : att.type === "Video" ? "🎥" : "📄";
      return `
      <div class="push-att-item">
        <div class="push-att-info">
          <span>${icon}</span>
          <div>
            <strong>${esc(att.name)}</strong>
            <span style="color:#64748b;font-size:10px;margin-left:6px;">${esc(att.size)}</span>
          </div>
        </div>
        <button type="button" class="push-att-remove" onclick="window._pushRemoveAttachment(${idx})">✕</button>
      </div>`;
    }).join("");
  }

  /*
  ============================================================
  LEAFLET MAP CONTROLLER (Using Clean OSM with Dark Styling)
  ============================================================
  */
  function initLeafletMap() {
    var mapEl = document.getElementById("pushTargetMap");
    if (!mapEl || typeof L === "undefined") return;

    try {
      if (_leafletMap) {
        _leafletMap.remove();
        _leafletMap = null;
      }

      _leafletMap = L.map(mapEl, {
        center: [PUSH_STATE.lat, PUSH_STATE.lng],
        zoom: getZoomForRadius(PUSH_STATE.radiusKM),
        zoomControl: false,
        attributionControl: false
      });

      // Standard OpenStreetMap tiles (Reliable, No API Key, No Watermark)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(_leafletMap);

      L.control.zoom({ position: "topright" }).addTo(_leafletMap);

      _leafletMarker = L.circleMarker([PUSH_STATE.lat, PUSH_STATE.lng], {
        radius: 7,
        color: "#ffffff",
        fillColor: "#8b5cf6",
        fillOpacity: 1,
        weight: 3
      }).addTo(_leafletMap);

      _leafletCircle = L.circle([PUSH_STATE.lat, PUSH_STATE.lng], {
        radius: PUSH_STATE.radiusKM * 1000,
        color: "#8b5cf6",
        fillColor: "#8b5cf6",
        fillOpacity: 0.22,
        weight: 2
      }).addTo(_leafletMap);

    } catch (err) {
      console.warn("Leaflet map init warning", err);
    }
  }

  function updateLeafletCircle(smoothFly) {
    if (!_leafletMap || !_leafletCircle) return;
    try {
      _leafletCircle.setLatLng([PUSH_STATE.lat, PUSH_STATE.lng]);
      _leafletCircle.setRadius(PUSH_STATE.radiusKM * 1000);
      if (_leafletMarker) _leafletMarker.setLatLng([PUSH_STATE.lat, PUSH_STATE.lng]);

      var targetZoom = getZoomForRadius(PUSH_STATE.radiusKM);
      if (smoothFly) {
        _leafletMap.flyTo([PUSH_STATE.lat, PUSH_STATE.lng], targetZoom, { duration: 1 });
      } else {
        _leafletMap.setView([PUSH_STATE.lat, PUSH_STATE.lng], targetZoom);
      }
    } catch (e) {}
  }

  function getZoomForRadius(km) {
    if (km <= 10) return 12;
    if (km <= 25) return 11;
    if (km <= 55) return 9;
    if (km <= 120) return 8;
    if (km <= 300) return 6;
    return 4;
  }

  function triggerAudienceEstimation() {
    clearTimeout(_estimateDebounce);
    _estimateDebounce = setTimeout(async function () {
      var reachEl = document.getElementById("pushAudienceReach");
      if (reachEl) reachEl.innerHTML = '<span style="color:#8a8f98;">Calculating…</span>';

      try {
        var session = AdminAuth.getSession();
        var url = getApiUrl() +
          "?action=estimatepushaudience" +
          "&session=" + encodeURIComponent(session) +
          "&audienceType=" + encodeURIComponent(PUSH_STATE.audienceType) +
          "&lat=" + encodeURIComponent(PUSH_STATE.lat) +
          "&lng=" + encodeURIComponent(PUSH_STATE.lng) +
          "&radius=" + encodeURIComponent(PUSH_STATE.radiusKM) +
          "&specificUsers=" + encodeURIComponent(PUSH_STATE.specificUsers);

        var res = await fetch(url);
        var json = await res.json();
        if (json && json.success && json.data) {
          PUSH_STATE.estimatedReach = json.data.estimatedAudience || 1;
        } else {
          PUSH_STATE.estimatedReach = PUSH_STATE.radiusKM * 245;
        }
      } catch (e) {
        PUSH_STATE.estimatedReach = PUSH_STATE.radiusKM * 245;
      }

      if (reachEl) {
        reachEl.textContent = Number(PUSH_STATE.estimatedReach).toLocaleString() + " Users";
      }
    }, 400);
  }

  /*
  ============================================================
  LOCATION AUTOCOMPLETE SEARCH HANDLER
  ============================================================
  */
  window._pushHandleLocationType = function (query) {
    var q = String(query || "").trim().toLowerCase();
    var sug = document.getElementById("pushLocationSuggestions");
    if (!sug) return;

    if (q.length < 2) {
      sug.style.display = "none";
      return;
    }

    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(async function () {
      // 1. Check local preset matches first
      var localMatches = POPULAR_INDIAN_LOCATIONS.filter(function(loc) {
        return loc.name.toLowerCase().indexOf(q) >= 0 ||
               loc.district.toLowerCase().indexOf(q) >= 0 ||
               loc.state.toLowerCase().indexOf(q) >= 0;
      });

      // 2. Fetch from OpenStreetMap Nominatim for Indian regions
      var remoteMatches = [];
      try {
        var url = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(query) + "&countrycodes=in&addressdetails=1&limit=6";
        var res = await fetch(url);
        var data = await res.json();
        if (Array.isArray(data)) {
          remoteMatches = data.map(function(item) {
            var addr = item.address || {};
            var mainName = addr.city || addr.town || addr.village || addr.county || item.name || query;
            var subParts = [addr.county || addr.district, addr.state, addr.country].filter(Boolean).join(", ");
            return {
              name: mainName,
              district: subParts,
              state: addr.state || "",
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              displayName: item.display_name
            };
          });
        }
      } catch (err) {
        console.warn("Nominatim fetch warning", err);
      }

      // Combine matches
      var combined = localMatches.concat(remoteMatches);
      // Deduplicate by close lat/lng
      var unique = [];
      var seen = {};
      combined.forEach(function(item) {
        var key = item.lat.toFixed(2) + "_" + item.lng.toFixed(2);
        if (!seen[key]) {
          seen[key] = true;
          unique.push(item);
        }
      });

      if (unique.length === 0) {
        sug.innerHTML = '<div style="padding:12px;font-size:12px;color:#94a3b8;text-align:center;">No locations found for "<strong>' + esc(query) + '</strong>". Press enter to use directly.</div>';
        sug.style.display = "block";
        return;
      }

      var itemsHtml = unique.map(function(item, idx) {
        return `
        <div class="push-autocomplete-item" onclick="window._pushSelectLocation(${idx})">
          <div>
            <div class="push-ac-title">📍 ${esc(item.name)}</div>
            <div class="push-ac-sub">${esc(item.district || item.state)}</div>
          </div>
          <span class="push-ac-coords">${item.lat.toFixed(3)}°, ${item.lng.toFixed(3)}°</span>
        </div>`;
      }).join("");

      // Cache current results for click selection
      window._currentLocationResults = unique;
      sug.innerHTML = itemsHtml;
      sug.style.display = "block";

    }, 250);
  };

  window._pushSelectLocation = function (idx) {
    var list = window._currentLocationResults || [];
    var selected = list[idx];
    if (!selected) return;

    PUSH_STATE.lat = selected.lat;
    PUSH_STATE.lng = selected.lng;
    PUSH_STATE.locationName = selected.name + " (" + (selected.district || selected.state) + ")";

    var locIn = document.getElementById("pushLocationInput");
    var centerText = document.getElementById("pushMapCenterText");
    var sug = document.getElementById("pushLocationSuggestions");

    if (locIn) locIn.value = PUSH_STATE.locationName;
    if (centerText) centerText.textContent = PUSH_STATE.locationName;
    if (sug) sug.style.display = "none";

    updateLeafletCircle(true);
    triggerAudienceEstimation();
    showToast("Target centered on " + selected.name, "success");
  };

  /*
  ============================================================
  WINDOW EVENT HANDLERS
  ============================================================
  */

  window._pushSetAudience = function (type) {
    PUSH_STATE.audienceType = type;
    var container = document.getElementById("adminModuleContainer");
    if (container) renderStudio(container);
  };

  window._pushRadiusInput = function (val) {
    PUSH_STATE.radiusKM = parseInt(val, 10);
    var disp = document.getElementById("pushRadiusDisplay");
    var mapBadge = document.getElementById("pushMapRadiusBadge");
    if (disp) disp.textContent = val + " km";
    if (mapBadge) mapBadge.textContent = "Radius: " + val + " km";
    updateLeafletCircle(false);
    triggerAudienceEstimation();
  };

  window._pushSetRadius = function (km) {
    PUSH_STATE.radiusKM = km;
    var slider = document.getElementById("pushRadiusSlider");
    if (slider) slider.value = Math.min(km, 250);
    window._pushRadiusInput(km);
    var container = document.getElementById("adminModuleContainer");
    if (container) renderStudio(container);
  };

  window._pushContentInput = function () {
    var titleIn = document.getElementById("pushTitleInput");
    var msgIn = document.getElementById("pushMessageInput");
    var titleCount = document.getElementById("pushTitleCounter");
    var msgCount = document.getElementById("pushMsgCounter");
    var liveTitle = document.getElementById("pushLiveTitle");
    var liveMsg = document.getElementById("pushLiveMsg");

    if (titleIn) {
      PUSH_STATE.title = titleIn.value;
      if (titleCount) titleCount.textContent = titleIn.value.length + "/100";
      if (liveTitle) liveTitle.textContent = titleIn.value || "Notification Title";
    }
    if (msgIn) {
      PUSH_STATE.message = msgIn.value;
      if (msgCount) msgCount.textContent = msgIn.value.length + "/500";
      if (liveMsg) liveMsg.textContent = msgIn.value || "Notification message will appear here.";
    }
  };

  window._pushSetScheduleMode = function (mode) {
    PUSH_STATE.scheduleMode = mode;
    var group = document.getElementById("pushScheduleTimeGroup");
    if (group) group.style.display = mode === "later" ? "block" : "none";
  };

  window._pushUseCurrentLocation = function () {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by browser", "error");
      return;
    }
    showToast("Detecting GPS location…", "info");
    navigator.geolocation.getCurrentPosition(function(pos) {
      PUSH_STATE.lat = pos.coords.latitude;
      PUSH_STATE.lng = pos.coords.longitude;
      PUSH_STATE.locationName = "Current Location (" + pos.coords.latitude.toFixed(3) + ", " + pos.coords.longitude.toFixed(3) + ")";
      var locInput = document.getElementById("pushLocationInput");
      var centerText = document.getElementById("pushMapCenterText");
      if (locInput) locInput.value = PUSH_STATE.locationName;
      if (centerText) centerText.textContent = PUSH_STATE.locationName;
      updateLeafletCircle(true);
      triggerAudienceEstimation();
      showToast("Location updated to GPS coordinates", "success");
    }, function(err) {
      showToast("GPS detection failed: " + err.message, "error");
    });
  };

  window._pushSyncDeepLink = function () {
    var page = PUSH_STATE.selectedPage;
    var ref = PUSH_STATE.referenceId;
    var fallback = document.getElementById("pushFallbackInput");
    if (page === "Property Details") {
      PUSH_STATE.fallbackUrl = "https://www.ekka1km.com/property/" + encodeURIComponent(ref || "PROP_78945");
    } else if (page === "Product Details") {
      PUSH_STATE.fallbackUrl = "https://www.ekka1km.com/product/" + encodeURIComponent(ref || "PROD_101");
    } else if (page === "Business Profile") {
      PUSH_STATE.fallbackUrl = "https://www.ekka1km.com/business/" + encodeURIComponent(ref || "BIZ_202");
    }
    if (fallback) fallback.value = PUSH_STATE.fallbackUrl;
  };

  window._pushAddAttachmentPrompt = function () {
    var url = prompt("Enter Image or Media URL for attachment:", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop");
    if (url) {
      PUSH_STATE.attachments.push({
        id: "att_" + Date.now(),
        type: "Image",
        name: "attached-media.jpg",
        size: "850 KB",
        url: url
      });
      var list = document.getElementById("pushAttachmentsList");
      if (list) list.innerHTML = renderAttachmentRows();
      var thumb = document.getElementById("pushLiveThumb");
      if (thumb) thumb.src = url;
      showToast("Attachment added", "success");
    }
  };

  window._pushRemoveAttachment = function (idx) {
    PUSH_STATE.attachments.splice(idx, 1);
    var list = document.getElementById("pushAttachmentsList");
    if (list) list.innerHTML = renderAttachmentRows();
    var thumb = document.getElementById("pushLiveThumb");
    if (thumb) thumb.src = PUSH_STATE.attachments[0] ? PUSH_STATE.attachments[0].url : 'https://dummyimage.com/100x100/1e2530/fff.png&text=Ekka';
  };

  window._pushSaveDraft = function () {
    localStorage.setItem("ekka1km_push_draft", JSON.stringify(PUSH_STATE));
    showToast("Draft saved successfully", "success");
  };

  window._pushOpenFullscreenMockup = function () {
    var modal = document.createElement("div");
    modal.id = "pushFullscreenModal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
    modal.innerHTML = `
      <div style="background:#000;width:340px;height:680px;border-radius:44px;border:10px solid #2d3748;box-shadow:0 25px 60px rgba(0,0,0,0.9);display:flex;flex-direction:column;position:relative;overflow:hidden;background-image:linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);padding:20px;box-sizing:border-box;color:#fff;">
        <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:100px;height:24px;background:#000;border-radius:12px;"></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:16px;color:#94a3b8;">
          <span>12:05</span>
          <span>5G 🔋 98%</span>
        </div>
        <div style="margin-top:70px;text-align:center;">
          <div style="font-size:52px;font-weight:200;">12:05</div>
          <div style="font-size:14px;color:#cbd5e1;">Friday, August 28</div>
        </div>
        <div style="margin-top:50px;background:rgba(30,41,59,0.88);backdrop-filter:blur(16px);border-radius:18px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;">
              <span style="width:14px;height:14px;background:#22c55e;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;">E</span>
              <span>EKKA1KM</span>
            </div>
            <span style="font-size:10px;color:#94a3b8;">now</span>
          </div>
          <div style="display:flex;gap:10px;">
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:700;margin-bottom:2px;">${esc(PUSH_STATE.title)}</div>
              <div style="font-size:11px;color:#cbd5e1;line-height:1.3;">${esc(PUSH_STATE.message)}</div>
            </div>
            ${PUSH_STATE.attachments[0]?`<img src="${esc(PUSH_STATE.attachments[0].url)}" style="width:46px;height:46px;border-radius:6px;object-fit:cover;" />`:''}
          </div>
        </div>
        <div style="margin-top:auto;text-align:center;padding-bottom:10px;">
          <button type="button" class="module-btn module-btn-secondary" style="font-size:12px;" onclick="document.getElementById('pushFullscreenModal').remove()">Close Preview</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window._pushOpenPreviewModal = function () {
    if (!PUSH_STATE.title.trim()) { showToast("Title is required", "error"); return; }
    if (!PUSH_STATE.message.trim()) { showToast("Message is required", "error"); return; }

    var modal = document.createElement("div");
    modal.id = "pushConfirmModal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
    modal.innerHTML = `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;max-width:560px;width:100%;padding:24px;box-sizing:border-box;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #30363d;">
          <h3 style="margin:0;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;">🚀 Campaign Pre-Flight Summary</h3>
          <button style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;" onclick="document.getElementById('pushConfirmModal').remove()">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;background:#0d1117;padding:14px;border-radius:10px;font-size:12px;">
          <div><span style="color:#64748b;">Audience Scope:</span> <strong>${esc(PUSH_STATE.audienceType.toUpperCase())}</strong></div>
          <div><span style="color:#64748b;">Target Location:</span> <strong>${esc(PUSH_STATE.locationName)}</strong></div>
          <div><span style="color:#64748b;">Target Radius:</span> <strong>${PUSH_STATE.radiusKM} km</strong></div>
          <div><span style="color:#64748b;">Estimated Reach:</span> <strong style="color:#22c55e;">${Number(PUSH_STATE.estimatedReach).toLocaleString()} Users</strong></div>
          <div><span style="color:#64748b;">Priority Level:</span> <strong>${esc(PUSH_STATE.priority)}</strong></div>
          <div><span style="color:#64748b;">Timing:</span> <strong>${PUSH_STATE.scheduleMode==='now'?'Immediate Broadcast':'Scheduled'}</strong></div>
          <div style="grid-column:1/-1;"><span style="color:#64748b;">Action Deep Link:</span> <code style="color:#8b5cf6;">${esc(PUSH_STATE.selectedPage)} (${esc(PUSH_STATE.referenceId)})</code></div>
        </div>
        <div style="background:#0d1117;border-radius:10px;padding:12px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#f8fafc;">${esc(PUSH_STATE.title)}</div>
          <div style="font-size:12px;color:#94a3b8;">${esc(PUSH_STATE.message)}</div>
        </div>
        <div id="pushBroadcastProgress" style="display:none;margin-bottom:16px;padding:10px;background:rgba(139,92,246,0.1);border:1px solid #8b5cf6;border-radius:8px;font-size:12px;color:#c4b5fd;text-align:center;">
          📡 Dispatching notification to FCM HTTP/v1…
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button type="button" class="module-btn module-btn-secondary" onclick="document.getElementById('pushConfirmModal').remove()">Cancel</button>
          <button type="button" class="module-btn module-btn-primary" id="pushBroadcastBtn" onclick="window._pushExecuteBroadcast()">🚀 Confirm & Broadcast</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window._pushExecuteBroadcast = async function () {
    var btn = document.getElementById("pushBroadcastBtn");
    var prog = document.getElementById("pushBroadcastProgress");
    var session = AdminAuth.getSession();

    if (!session) {
      showToast("Session expired. Please login again.", "error");
      AdminAuth.redirectToLogin();
      return;
    }

    if (btn) btn.disabled = true;
    if (prog) prog.style.display = "block";

    try {
      var actionUrl = PUSH_STATE.linkType === "In-App Page"
        ? (PUSH_STATE.selectedPage.toLowerCase().replace(/\s+/g, "") + "/" + encodeURIComponent(PUSH_STATE.referenceId))
        : PUSH_STATE.fallbackUrl;

      var imgUrl = PUSH_STATE.attachments[0] ? PUSH_STATE.attachments[0].url : "";

      var url = getApiUrl() +
        "?action=broadcastpushnotification" +
        "&session=" + encodeURIComponent(session) +
        "&audienceType=" + encodeURIComponent(PUSH_STATE.audienceType) +
        "&lat=" + encodeURIComponent(PUSH_STATE.lat) +
        "&lng=" + encodeURIComponent(PUSH_STATE.lng) +
        "&radius=" + encodeURIComponent(PUSH_STATE.radiusKM) +
        "&userId=" + encodeURIComponent(PUSH_STATE.specificUsers) +
        "&title=" + encodeURIComponent(PUSH_STATE.title) +
        "&message=" + encodeURIComponent(PUSH_STATE.message) +
        "&imageUrl=" + encodeURIComponent(imgUrl) +
        "&actionUrl=" + encodeURIComponent(actionUrl) +
        "&priority=" + encodeURIComponent(PUSH_STATE.priority);

      var response = await fetch(url);
      var json = await response.json();

      var confirmModal = document.getElementById("pushConfirmModal");
      if (confirmModal) confirmModal.remove();

      if (json && json.success) {
        var sent = (json.data && json.data.sent) || 0;
        var failed = (json.data && json.data.failed) || 0;
        var total = (json.data && json.data.total) || (sent + failed);
        var lastErr = (json.data && json.data.lastError) || "";

        var isOk = sent > 0;
        var statusColor = isOk ? "#22c55e" : "#eab308";
        var statusTitle = isOk ? "✅ Broadcast Delivered" : "⚠️ Delivery Notice";

        var advice = "";
        if (failed > 0 && sent === 0) {
          advice = '<div style="margin-top:8px;font-size:11px;color:#fca5a5;background:rgba(239,68,68,0.1);padding:6px 10px;border-radius:6px;"><strong>Root Cause:</strong> The stored FCM device token was rejected by Firebase (stale/unregistered token). <em>Open the Ekka1km app on the Android phone to sync its fresh active token.</em></div>';
        }

        var resultBox = document.createElement("div");
        resultBox.style.cssText = "position:fixed;bottom:24px;right:24px;background:#161b22;border:2px solid " + statusColor + ";border-radius:12px;padding:16px 22px;color:#f8fafc;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,0.8);max-width:420px;";
        resultBox.innerHTML = `
          <h4 style="margin:0 0 6px 0;color:${statusColor};display:flex;align-items:center;gap:8px;">${statusTitle}</h4>
          <div style="font-size:13px;color:#cbd5e1;">Target Devices: <strong>${total}</strong> | Sent: <strong style="color:#22c55e;">${sent}</strong> | Failed: <strong style="color:#ef4444;">${failed}</strong></div>
          ${advice}
          <button style="margin-top:10px;background:#21262d;border:1px solid #30363d;color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;" onclick="this.parentElement.remove()">Dismiss</button>
        `;
        document.body.appendChild(resultBox);
        showToast(isOk ? "Push notification sent" : "Push failed: stale device token", isOk ? "success" : "warning");
      } else {
        var msg = (json && json.message) || "Failed to broadcast notification";
        showToast("Broadcast failed: " + msg, "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
      if (prog) prog.style.display = "none";
    }
  };

  window._pushCheckFcmStatus = async function () {
    var alertEl = document.getElementById("pushFcmStatusAlert");
    if (!alertEl) return;
    try {
      var session = AdminAuth.getSession();
      var url = getApiUrl() + "?action=getfcmstatus&session=" + encodeURIComponent(session);
      var res = await fetch(url);
      var json = await res.json();
      if (json && json.success && json.data) {
        if (!json.data.configured) {
          alertEl.style.display = "block";
          alertEl.innerHTML = `
            <div style="background:rgba(234,179,8,0.12);border:1px solid #eab308;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">⚠️</span>
                <div>
                  <strong style="color:#fde047;font-size:13px;">Firebase Service Account Key Required for Delivery</strong>
                  <div style="font-size:11px;color:#cbd5e1;">Your Google Apps Script backend requires the Firebase Service Account JSON to authenticate with Firebase HTTP v1 and deliver push notifications.</div>
                </div>
              </div>
              <button type="button" class="module-btn module-btn-primary" style="padding:6px 14px;font-size:11px;white-space:nowrap;" onclick="window._pushOpenFcmConfigModal()">⚙️ Configure FCM Credentials</button>
            </div>
          `;
        } else {
          alertEl.style.display = "none";
        }
      }
    } catch (e) {}
  };

  window._pushOpenFcmConfigModal = function () {
    var modal = document.createElement("div");
    modal.id = "pushFcmConfigModal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
    modal.innerHTML = `
      <div style="background:#161b22;border:1px solid #8b5cf6;border-radius:14px;max-width:580px;width:100%;padding:24px;box-sizing:border-box;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.9);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #30363d;">
          <h3 style="margin:0;font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px;">⚙️ Firebase Service Account Setup</h3>
          <button style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;" onclick="document.getElementById('pushFcmConfigModal').remove()">✕</button>
        </div>
        <p style="font-size:12px;color:#94a3b8;line-height:1.4;margin:0 0 12px 0;">
          To allow Google Apps Script to send real push notifications to Android devices, paste your <strong>Firebase Service Account JSON</strong> below (from <em>Firebase Console &rarr; Project Settings &rarr; Service Accounts &rarr; Generate new private key</em>).
        </p>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:#cbd5e1;">Service Account JSON Content *</label>
          <textarea id="pushFcmJsonInput" class="push-textarea" rows="7" placeholder='{\n  "type": "service_account",\n  "project_id": "ekka1km",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",\n  "client_email": "firebase-adminsdk-...@ekka1km.iam.gserviceaccount.com"\n}'></textarea>
        </div>
        <div id="pushFcmSaveProgress" style="display:none;margin-bottom:12px;padding:8px;background:rgba(139,92,246,0.1);border-radius:6px;font-size:12px;color:#c4b5fd;text-align:center;">
          Saving credentials securely in Google Apps Script properties…
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button type="button" class="module-btn module-btn-secondary" onclick="document.getElementById('pushFcmConfigModal').remove()">Cancel</button>
          <button type="button" class="module-btn module-btn-primary" id="pushFcmSaveBtn" onclick="window._pushSaveFcmCredentials()">💾 Save FCM Credentials</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window._pushSaveFcmCredentials = async function () {
    var input = document.getElementById("pushFcmJsonInput");
    var btn = document.getElementById("pushFcmSaveBtn");
    var prog = document.getElementById("pushFcmSaveProgress");
    var val = (input ? input.value : "").trim();

    if (!val) { showToast("Please paste the Service Account JSON content", "error"); return; }
    try {
      var parsed = JSON.parse(val);
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        showToast("Invalid JSON: Must contain project_id, client_email, and private_key", "error");
        return;
      }
    } catch (e) {
      showToast("Invalid JSON syntax: " + e.message, "error");
      return;
    }

    if (btn) btn.disabled = true;
    if (prog) prog.style.display = "block";

    try {
      var session = AdminAuth.getSession();
      var url = getApiUrl() + "?action=setfcmserviceaccount&session=" + encodeURIComponent(session);
      var res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ serviceAccountJson: val })
      });
      var json = await res.json();
      if (json && json.success) {
        showToast("FCM credentials configured successfully!", "success");
        var modal = document.getElementById("pushFcmConfigModal");
        if (modal) modal.remove();
        window._pushCheckFcmStatus();
      } else {
        showToast("Failed to save FCM credentials: " + (json ? json.message : "Error"), "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    } finally {
      if (btn) btn.disabled = false;
      if (prog) prog.style.display = "none";
    }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

})();