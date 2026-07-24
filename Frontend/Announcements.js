/*
============================================================
EKKA1KM FRONTEND
Announcements.js
V1.1 - Hyperlocal Announcements Module
Community notices, public notices, event notices
View tracking via existing Analytics infrastructure
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
              </div>
              <h3 style="font-size:14px;margin:0 0 4px;line-height:1.3;">${item.Title || ""}</h3>
              <p style="font-size:12px;color:#666;margin:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                ${(item.Description || "").substring(0, 100)}
              </p>
              <div style="font-size:10px;color:#999;margin-top:6px;">
                <span>${timeAgo(item.CreatedDate)}</span>
                ${item.City ? ` · ${item.City}` : ""}
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
        </div>

        <h1 style="font-size:20px;margin:0 0 8px;line-height:1.3;">${item.Title || ""}</h1>

        <div style="display:flex;gap:12px;font-size:12px;color:#888;margin-bottom:15px;flex-wrap:wrap;">
          <span>🕐 ${timeAgo(item.CreatedDate)}</span>
          ${item.City ? `<span>📍 ${item.City}${item.State ? ", " + item.State : ""}</span>` : ""}
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
POST ANNOUNCEMENT
============================================================
*/

function openPostAnnouncementForm() {
  if (!requireLogin()) return;
  openPage("postAnnouncement");
}


async function submitAnnouncement() {
  const userId = getUserId();
  if (!userId) return;

  const title = document.getElementById("annTitle").value.trim();
  const description = document.getElementById("annDescription").value.trim();
  const category = document.getElementById("annCategory").value;
  const city = document.getElementById("annCity").value.trim();
  const imageUrl = document.getElementById("annImage").value.trim();
  const address = document.getElementById("annAddress").value.trim();
  const startDate = document.getElementById("annStartDate").value.trim();
  const endDate = document.getElementById("annEndDate").value.trim();

  if (!title || !description) {
    alert("Title and Description are required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addannouncement`
      + `&UserID=${encodeURIComponent(userId)}`
      + `&Title=${encodeURIComponent(title)}`
      + `&Description=${encodeURIComponent(description)}`
      + `&Category=${encodeURIComponent(category)}`
      + `&City=${encodeURIComponent(city)}`
      + `&Image=${encodeURIComponent(imageUrl)}`
      + `&Address=${encodeURIComponent(address)}`
      + `&StartDate=${encodeURIComponent(startDate)}`
      + `&EndDate=${encodeURIComponent(endDate)}`
      + `&Latitude=${CURRENT_LAT}&Longitude=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Announcement posted successfully!");
      document.getElementById("annTitle").value = "";
      document.getElementById("annDescription").value = "";
      document.getElementById("annCity").value = "";
      document.getElementById("annImage").value = "";
      document.getElementById("annAddress").value = "";
      document.getElementById("annStartDate").value = "";
      document.getElementById("annEndDate").value = "";
      openPage("announcements");
      loadAnnouncements();
    } else {
      alert(json.message || "Failed to post announcement.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to post announcement. Check connection.");
  }
}