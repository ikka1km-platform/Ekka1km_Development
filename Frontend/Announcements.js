/*
============================================================
EKKA1KM FRONTEND
Announcements.js
V2.0 - Official Verified Announcer Architecture
Hyperlocal announcements with Announcer jurisdiction and radius
============================================================
*/


/*
============================================================
ANNOUNCEMENT CATEGORIES
============================================================
*/

const ANNOUNCEMENT_CATEGORIES = [
  "General", "Community", "Public Notice", "Event",
  "Education", "Utility / Service", "Emergency / Important"
];

/*
============================================================
CANONICAL RADIUS OPTIONS
============================================================
*/

const ANNOUNCEMENT_RADIUS_OPTIONS = ["1", "5", "10", "25", "51", "100", "All India"];


/*
============================================================
TIME AGO HELPER
============================================================
*/

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return date.toLocaleDateString();
}


/*
============================================================
LOAD ANNOUNCEMENTS
============================================================
*/

async function loadAnnouncements() {
  const container = document.getElementById("announcementList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading Announcements...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=announcements&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const announcements = json.data || [];

    if (announcements.length === 0) {
      container.innerHTML = "<div class='card'>No Announcements found in your area.</div>";
      return;
    }

    let html = "";

    // Category Filter Bar
    html += `
      <div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;margin-bottom:10px;white-space:nowrap;">
        <span class="badge" style="background:var(--primary);color:#fff;cursor:pointer;" onclick="loadAnnouncements()">All</span>
        ${ANNOUNCEMENT_CATEGORIES.map(cat =>
          `<span class="badge" style="cursor:pointer;background:#e8f5e9;" onclick="loadAnnouncementsByCategory('${cat}')">${cat}</span>`
        ).join("")}
      </div>
    `;

    // Announcement Cards
    announcements.forEach(item => {
      const isImportant = (item.Priority || "").toLowerCase() === "important" || (item.Priority || "").toLowerCase() === "emergency";
      const isUrgent = (item.Priority || "").toLowerCase() === "emergency";
      const hasImage = item.Image && item.Image.trim();
      const hasEndDate = item.EndDate && item.EndDate.trim();
      
      // Announcer display
      const publisherName = item._publisherName || "";
      const isVerified = item._publisherVerified || false;
      const publisherDesignation = item._publisherDesignation || "";
      const publisherCity = item._publisherCity || "";

      html += `
        <div class="announcementCard" style="margin-bottom:12px;padding:14px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;${isUrgent ? 'border-left:4px solid #d32f2f;' : isImportant ? 'border-left:4px solid #ff9800;' : ''}" onclick='showAnnouncementDetail(${JSON.stringify(item)})'>
          <div style="display:flex;align-items:flex-start;gap:10px;">
            ${hasImage ? `
              <div style="width:70px;min-width:70px;height:70px;border-radius:10px;overflow:hidden;">
                <img src="${item.Image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
              </div>
            ` : `
              <div style="width:70px;min-width:70px;height:70px;border-radius:10px;overflow:hidden;background:#e8f5e9;display:flex;align-items:center;justify-content:center;">
                <i class="material-icons" style="font-size:30px;color:var(--primary);">campaign</i>
              </div>
            `}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
                ${isUrgent ? `<span class="badge" style="background:#d32f2f;color:#fff;font-size:9px;">URGENT</span>` : ""}
                ${isImportant ? `<span class="badge" style="background:#ff9800;color:#fff;font-size:9px;">IMPORTANT</span>` : ""}
                ${item.Category ? `<span class="badge" style="background:#e8f5e9;font-size:9px;">${item.Category}</span>` : ""}
                ${isVerified ? `<span class="badge" style="background:#0f9d58;color:#fff;font-size:9px;">✓ OFFICIAL</span>` : ""}
              </div>
              <h3 style="font-size:14px;margin:0 0 4px;line-height:1.3;">${item.Title || ""}</h3>
              ${isVerified ? `<div style="font-size:10px;color:#0f9d58;font-weight:500;margin-bottom:2px;">${publisherName}${publisherDesignation ? " · " + publisherDesignation : ""}</div>` : ""}
              <p style="font-size:12px;color:#666;margin:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                ${(item.Description || "").substring(0, 100)}
              </p>
              <div style="font-size:10px;color:#999;margin-top:6px;">
                <span>${timeAgo(item.CreatedDate)}</span>
                ${item.City ? ` · ${item.City}` : ""}
                ${item.Radius ? ` · ${item.Radius}${item.Radius === "All India" ? "" : " KM"}` : ""}
                ${hasEndDate ? ` · Ends: ${new Date(item.EndDate).toLocaleDateString()}` : ""}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load announcements.</div>";
  }
}


/*
============================================================
LOAD ANNOUNCEMENTS BY CATEGORY
============================================================
*/

async function loadAnnouncementsByCategory(category) {
  const container = document.getElementById("announcementList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading " + category + " announcements...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=announcements&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const all = json.data || [];

    const filtered = all.filter(function(item) {
      return (item.Category || "").toLowerCase() === category.toLowerCase();
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class='card'>No ${category} announcements found. <button onclick="loadAnnouncements()" class="btn-gray">Back to All</button></div>`;
      return;
    }

    let html = `<button onclick="loadAnnouncements()" style="margin-bottom:10px;font-size:12px;">← All Announcements</button>`;
    html += `<div style="font-size:16px;font-weight:600;margin-bottom:12px;">${category}</div>`;

    filtered.forEach(item => {
      html += `
        <div class="announcementCard" style="margin-bottom:10px;padding:12px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;" onclick='showAnnouncementDetail(${JSON.stringify(item)})'>
          <h4 style="font-size:13px;margin:0 0 4px;">${item.Title || ""}</h4>
          <p style="font-size:11px;color:#666;margin:0;">${(item.Description || "").substring(0, 80)}</p>
          <div style="font-size:10px;color:#999;margin-top:4px;">${timeAgo(item.CreatedDate)}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load category.</div>";
  }
}


/*
============================================================
ANNOUNCEMENT DETAIL
============================================================
*/

function showAnnouncementDetail(item) {
  const container = document.getElementById("announcementList");
  if (!container) return;

  // Track view using existing analytics infrastructure
  const userId = getUserId() || "";
  const announcementId = item.AnnouncementID || "";
  if (announcementId) {
    const trackUrl = `${getApiUrl()}?action=trackevent&eventType=AnnouncementView&userId=${encodeURIComponent(userId)}&entityType=Announcement&entityId=${encodeURIComponent(announcementId)}`;
    fetch(trackUrl).catch(() => {});
  }

  const hasImage = item.Image && item.Image.trim();
  const isImportant = (item.Priority || "").toLowerCase() === "important" || (item.Priority || "").toLowerCase() === "emergency";
  const isUrgent = (item.Priority || "").toLowerCase() === "emergency";
  const hasEndDate = item.EndDate && item.EndDate.trim();
  const hasStartDate = item.StartDate && item.StartDate.trim();
  const views = parseInt(item.Views) || 0;
  
  // Announcer info
  const publisherName = item._publisherName || "";
  const isVerified = item._publisherVerified || false;
  const publisherDesignation = item._publisherDesignation || "";
  const publisherAuthorityType = item._publisherAuthorityType || "";

  let html = `
    <div class="card" style="padding:0;overflow:hidden;">
      ${hasImage ? `
        <div style="position:relative;">
          <img src="${item.Image}" style="width:100%;max-height:250px;object-fit:cover;" onerror="this.style.display='none'">
        </div>
      ` : ""}

      <div style="padding:16px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
          ${isUrgent ? `<span class="badge" style="background:#d32f2f;color:#fff;">URGENT</span>` : ""}
          ${isImportant ? `<span class="badge" style="background:#ff9800;color:#fff;">IMPORTANT</span>` : ""}
          ${item.Category ? `<span class="badge" style="background:var(--primary);color:#fff;">${item.Category}</span>` : ""}
          ${isVerified ? `<span class="badge" style="background:#0f9d58;color:#fff;">✓ OFFICIAL</span>` : ""}
        </div>
        
        ${isVerified ? `
        <div style="margin-bottom:12px;padding:10px;background:#e8f5e9;border-radius:8px;font-size:12px;">
          <div style="font-weight:600;color:#0f9d58;">${publisherName}</div>
          ${publisherDesignation ? `<div style="color:#555;">${publisherDesignation}${publisherAuthorityType ? " · " + publisherAuthorityType : ""}</div>` : ""}
        </div>
        ` : ""}

        <h1 style="font-size:20px;margin:0 0 8px;line-height:1.3;">${item.Title || ""}</h1>

        <div style="display:flex;gap:12px;font-size:12px;color:#888;margin-bottom:15px;flex-wrap:wrap;">
          <span>🕐 ${timeAgo(item.CreatedDate)}</span>
          ${item.City ? `<span>📍 ${item.City}${item.State ? ", " + item.State : ""}</span>` : ""}
          ${item.Radius ? `<span>📡 ${item.Radius}${item.Radius === "All India" ? "" : " KM"}</span>` : ""}
          ${hasStartDate ? `<span>📅 Starts: ${new Date(item.StartDate).toLocaleDateString()}</span>` : ""}
          ${hasEndDate ? `<span>⏰ Ends: ${new Date(item.EndDate).toLocaleDateString()}</span>` : ""}
          <span>👁 ${views} ${views === 1 ? "view" : "views"}</span>
        </div>

        <div style="font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap;">
          ${item.Description || ""}
        </div>

        ${item.Address ? `<div style="margin-top:12px;font-size:12px;color:#666;"><strong>Location:</strong> ${item.Address}</div>` : ""}
      </div>
    </div>

    <button onclick="loadAnnouncements()" class="btn-gray" style="margin-top:12px;">
      ← Back to Announcements
    </button>
  `;

  container.innerHTML = html;
  openPage("announcements");
}


/*
============================================================
OPEN POST ANNOUNCEMENT FORM
V2: Detect active Announcer and load official context
============================================================
*/

async function openPostAnnouncementForm() {
  if (!requireLogin()) return;
  
  var userId = getUserId();
  
  // Check for active Announcer authorization
  try {
    var response = await fetch(getApiUrl() + "?action=myannouncerstatus&userId=" + encodeURIComponent(userId));
    var json = await response.json();
    var announcers = json.data || [];
    
    var activeAnnouncer = null;
    for (var i = 0; i < announcers.length; i++) {
      if (String(announcers[i].Status || "").toLowerCase() === "active") {
        activeAnnouncer = announcers[i];
        break;
      }
    }
    
    if (activeAnnouncer) {
      // V2: Load form with Announcer context
      openPage("postAnnouncement");
      setTimeout(function() {
        loadAnnouncerPostInfo(activeAnnouncer.AnnouncerID, activeAnnouncer);
      }, 100);
    } else {
      // No active Announcer - show regular page
      openPage("postAnnouncement");
    }
  } catch (err) {
    console.log("Error checking announcer status:", err);
    openPage("postAnnouncement");
  }
}


/*
============================================================
LOAD ANNOUNCER POST INFO
Fetches Announcer details and populates form context
============================================================
*/

async function loadAnnouncerPostInfo(announcerId, announcerData) {
  var container = document.getElementById("announcerPostContext");
  if (!container) return;
  
  var announcer = announcerData || null;
  
  // If no announcer data provided, fetch it
  if (!announcer && announcerId) {
    try {
      var response = await fetch(getApiUrl() + "?action=getannouncerbyid&announcerId=" + encodeURIComponent(announcerId));
      var json = await response.json();
      if (json.success && json.data) {
        announcer = json.data;
      }
    } catch (err) {
      console.log("Error fetching announcer:", err);
    }
  }
  
  if (!announcer) {
    container.innerHTML = "";
    return;
  }
  
  // Set hidden announcerId field
  var idField = document.getElementById("announcerIdField");
  if (idField) idField.value = announcer.AnnouncerID || "";
  
  // Build jurisdiction display
  var maxRadius = announcer.MaxRadius || "N/A";
  var allowedRadii = getAllowedRadiusOptionsDisplay(maxRadius);
  var locationStr = [announcer.City, announcer.District, announcer.State].filter(Boolean).join(", ");
  
  container.innerHTML = `
    <div style="margin-bottom:16px;padding:14px;background:#e8f5e9;border-radius:12px;border:1px solid #c8e6c9;">
      <div style="font-size:11px;color:#0f9d58;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
        OFFICIAL JURISDICTION
      </div>
      <div style="font-size:15px;font-weight:600;color:#1b5e20;margin-bottom:2px;">
        ${announcer.DepartmentName || "Official Authority"}
      </div>
      ${announcer.Designation ? `<div style="font-size:12px;color:#388e3c;margin-bottom:4px;">${announcer.Designation}</div>` : ""}
      <div style="font-size:12px;color:#555;margin-bottom:4px;">
        ${announcer.Address ? announcer.Address + ", " : ""}${locationStr}${announcer.Country ? ", " + announcer.Country : ""}
      </div>
      <div style="font-size:12px;color:#555;">
        <strong>Maximum Authorized Coverage:</strong> ${maxRadius}${maxRadius === "All India" ? "" : " KM"}
      </div>
      <div style="font-size:11px;color:#777;margin-top:4px;">
        <strong>Allowed Radii:</strong> ${allowedRadii}
      </div>
    </div>
  `;
  
  // Pre-fill and lock location fields with Announcer's authorized location
  var cityField = document.getElementById("annCity");
  if (cityField) {
    cityField.value = announcer.City || "";
    cityField.readOnly = true;
    cityField.style.background = "#f5f5f5";
    cityField.style.cursor = "not-allowed";
  }
  
  var addressField = document.getElementById("annAddress");
  if (addressField) {
    addressField.value = announcer.Address || "";
    addressField.readOnly = true;
    addressField.style.background = "#f5f5f5";
    addressField.style.cursor = "not-allowed";
  }
  
  // Populate radius selector with allowed options
  populateRadiusSelector(maxRadius);
}


/*
============================================================
GET ALLOWED RADIUS OPTIONS FOR DISPLAY
============================================================
*/

function getAllowedRadiusOptionsDisplay(maxRadius) {
  if (!maxRadius) return "N/A";
  var maxStr = String(maxRadius).trim().toLowerCase();
  if (maxStr === "all india" || maxStr === "all") return "1 KM, 5 KM, 10 KM, 25 KM, 51 KM, 100 KM, All India";
  
  var maxNum = Number(maxRadius);
  if (isNaN(maxNum)) return String(maxRadius);
  
  var options = [1, 5, 10, 25, 51, 100];
  var allowed = [];
  for (var i = 0; i < options.length; i++) {
    if (options[i] <= maxNum) allowed.push(options[i] + " KM");
  }
  if (maxNum >= 100) allowed.push("All India");
  return allowed.join(", ") || String(maxRadius);
}


/*
============================================================
POPULATE RADIUS SELECTOR
Populates the announcement radius selector based on MaxRadius
============================================================
*/

function populateRadiusSelector(maxRadius) {
  var select = document.getElementById("annRadius");
  if (!select) return;
  
  var allowedOptions = [];
  if (maxRadius) {
    var maxStr = String(maxRadius).trim().toLowerCase();
    if (maxStr === "all india" || maxStr === "all") {
      allowedOptions = ["1", "5", "10", "25", "51", "100", "All India"];
    } else {
      var maxNum = Number(maxRadius);
      if (!isNaN(maxNum)) {
        ANNOUNCEMENT_RADIUS_OPTIONS.forEach(function(opt) {
          var optNum = Number(opt);
          if (!isNaN(optNum) && optNum <= maxNum) {
            allowedOptions.push(opt);
          }
        });
        if (maxNum >= 100) {
          allowedOptions.push("All India");
        }
      }
    }
  }
  
  // Default to all options if none resolved
  if (allowedOptions.length === 0) {
    allowedOptions = ["1", "5", "10", "25", "51", "100", "All India"];
  }
  
  select.innerHTML = allowedOptions.map(function(opt) {
    var label = opt === "All India" ? "All India" : opt + " KM";
    return '<option value="' + opt + '">' + label + '</option>';
  }).join("");
}


/*
============================================================
SUBMIT ANNOUNCEMENT
V2: If active Announcer, use createannouncement path
V1 fallback: use addannouncement for regular users
============================================================
*/

async function submitAnnouncement() {
  const userId = getUserId();
  if (!userId) return;

  const title = document.getElementById("annTitle").value.trim();
  const description = document.getElementById("annDescription").value.trim();
  const category = document.getElementById("annCategory").value;
  const imageUrl = document.getElementById("annImage").value.trim();
  const startDate = document.getElementById("annStartDate").value.trim();
  const endDate = document.getElementById("annEndDate").value.trim();
  
  // Check if we have an active Announcer
  var announcerIdField = document.getElementById("announcerIdField");
  var announcerId = announcerIdField ? announcerIdField.value.trim() : "";
  var radiusSelect = document.getElementById("annRadius");
  var radius = radiusSelect ? radiusSelect.value : "";

  if (!title || !description) {
    alert("Title and Description are required.");
    return;
  }

  try {
    if (announcerId) {
      // V2 PATH: Use createannouncement with Announcer authorization
      var url = getApiUrl() + "?action=createannouncement"
        + "&userId=" + encodeURIComponent(userId)
        + "&announcerId=" + encodeURIComponent(announcerId)
        + "&title=" + encodeURIComponent(title)
        + "&description=" + encodeURIComponent(description)
        + "&category=" + encodeURIComponent(category)
        + "&image=" + encodeURIComponent(imageUrl)
        + "&startDate=" + encodeURIComponent(startDate)
        + "&endDate=" + encodeURIComponent(endDate)
        + "&radius=" + encodeURIComponent(radius);
      
      var response = await fetch(url);
      var json = await response.json();

      if (json.success || json.status === "SUCCESS") {
        alert(json.message || "Announcement created successfully!");
        clearAnnouncementForm();
        openPage("announcements");
        loadAnnouncements();
      } else {
        alert(json.message || "Failed to post announcement.");
      }
    } else {
      // V1 PATH: Legacy addannouncement for regular users (preserved for backward compatibility)
      const city = document.getElementById("annCity").value.trim();
      const address = document.getElementById("annAddress").value.trim();
      
      var url = getApiUrl() + "?action=addannouncement"
        + "&UserID=" + encodeURIComponent(userId)
        + "&Title=" + encodeURIComponent(title)
        + "&Description=" + encodeURIComponent(description)
        + "&Category=" + encodeURIComponent(category)
        + "&City=" + encodeURIComponent(city)
        + "&Image=" + encodeURIComponent(imageUrl)
        + "&Address=" + encodeURIComponent(address)
        + "&StartDate=" + encodeURIComponent(startDate)
        + "&EndDate=" + encodeURIComponent(endDate)
        + "&Latitude=" + CURRENT_LAT + "&Longitude=" + CURRENT_LNG;
      
      var response = await fetch(url);
      var json = await response.json();

      if (json.success || json.status === "SUCCESS") {
        alert("Announcement posted successfully!");
        clearAnnouncementForm();
        openPage("announcements");
        loadAnnouncements();
      } else {
        alert(json.message || "Failed to post announcement.");
      }
    }
  } catch (err) {
    console.log(err);
    alert("Unable to post announcement. Check connection.");
  }
}


/*
============================================================
CLEAR ANNOUNCEMENT FORM
Resets form fields and announcer context
============================================================
*/

function clearAnnouncementForm() {
  document.getElementById("annTitle").value = "";
  document.getElementById("annDescription").value = "";
  document.getElementById("annImage").value = "";
  document.getElementById("annStartDate").value = "";
  document.getElementById("annEndDate").value = "";
  
  // Reset announcer context
  var announcerIdField = document.getElementById("announcerIdField");
  if (announcerIdField) announcerIdField.value = "";
  
  var contextContainer = document.getElementById("announcerPostContext");
  if (contextContainer) contextContainer.innerHTML = "";
  
  // Reset location fields to editable
  var cityField = document.getElementById("annCity");
  if (cityField) {
    cityField.value = "";
    cityField.readOnly = false;
    cityField.style.background = "";
    cityField.style.cursor = "";
  }
  
  var addressField = document.getElementById("annAddress");
  if (addressField) {
    addressField.value = "";
    addressField.readOnly = false;
    addressField.style.background = "";
    addressField.style.cursor = "";
  }
  
  // Reset radius selector to full options
  var radiusSelect = document.getElementById("annRadius");
  if (radiusSelect) {
    radiusSelect.innerHTML = ANNOUNCEMENT_RADIUS_OPTIONS.map(function(opt) {
      var label = opt === "All India" ? "All India" : opt + " KM";
      return '<option value="' + opt + '">' + label + '</option>';
    }).join("");
  }
}