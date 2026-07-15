/*
============================================================
EKKA1KM FRONTEND
MediaLibrary.js
My Uploads - Media Library System
V1.0
============================================================
*/


/*
============================================================
OPEN MEDIA LIBRARY
============================================================
*/

function openMediaLibrary() {
  openPage("mediaLibrary");
  loadMyMedia();
}


/*
============================================================
LOAD MY MEDIA
============================================================
*/

async function loadMyMedia() {
  const container = document.getElementById("mediaLibraryContent");
  if (!container) return;

  const userId = getUserId();
  if (!userId) {
    container.innerHTML = "<div class='card'>Please login to view your uploads.</div>";
    return;
  }

  container.innerHTML = "<div class='card'>Loading your media...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=mymedia&ownerUserId=${encodeURIComponent(userId)}`
    );
    const json = await response.json();
    const mediaList = (json.data && json.data.data) || [];

    renderMediaLibrary(mediaList);
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load media.</div>";
  }
}


/*
============================================================
RENDER MEDIA LIBRARY
============================================================
*/

function renderMediaLibrary(mediaList) {
  const container = document.getElementById("mediaLibraryContent");
  if (!container) return;

  if (mediaList.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:30px;">
        <i class="material-icons" style="font-size:64px;color:#ccc;">cloud_upload</i>
        <h3>No Uploads Yet</h3>
        <p>Upload images or videos from the post forms.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
      <span style="font-size:14px;color:#666;">${mediaList.length} file(s)</span>
      <input id="mediaSearchInput" placeholder="Search media..." style="flex:1;max-width:200px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;margin-left:10px;" oninput="searchMyMedia()">
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
  `;

  mediaList.forEach(media => {
    const isImage = (media.FileType || "").toLowerCase().indexOf("image") !== -1 ||
      (media.FileType || "").toLowerCase() === "image";
    const isVideo = (media.FileType || "").toLowerCase().indexOf("video") !== -1 ||
      (media.FileType || "").toLowerCase() === "video";
    const thumbnail = media.ThumbnailURL || media.ImageKitURL || "";
    const fileName = media.OriginalName || media.FileName || "Unknown";
    const sizeKB = media.SizeKB ? parseInt(media.SizeKB) : 0;
    const sizeText = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + " MB" : sizeKB + " KB";
    const createdDate = media.CreatedDate ? new Date(media.CreatedDate).toLocaleDateString() : "";

    html += `
      <div class="card" style="padding:10px;cursor:pointer;" onclick="previewMedia('${media.MediaID}')">
        <div style="width:100%;height:120px;border-radius:8px;overflow:hidden;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
          ${isVideo
            ? `<i class="material-icons" style="font-size:48px;color:#999;">videocam</i>`
            : thumbnail
            ? `<img src="${thumbnail}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'material-icons\\' style=\\'font-size:48px;color:#999;\\'>broken_image</i>';">`
            : `<i class="material-icons" style="font-size:48px;color:#999;">image</i>`
          }
        </div>
        <div style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${fileName}
        </div>
        <div style="font-size:10px;color:#888;">
          ${sizeText} ${createdDate ? "· " + createdDate : ""}
        </div>
        <div style="margin-top:6px;display:flex;gap:4px;">
          <button onclick="event.stopPropagation();copyMediaUrl('${media.ImageKitURL}')" style="font-size:10px;padding:4px 8px;flex:1;">
            Copy URL
          </button>
          <button onclick="event.stopPropagation();deleteMediaItem('${media.MediaID}')" style="font-size:10px;padding:4px 8px;background:#d32f2f;flex:1;">
            Delete
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  // Analytics section
  html += `
    <div class="card" style="margin-top:20px;">
      <h3>Media Analytics</h3>
      <div id="mediaAnalytics">Loading...</div>
    </div>
  `;

  container.innerHTML = html;

  // Load analytics
  loadMediaAnalytics();
}


/*
============================================================
SEARCH MY MEDIA
============================================================
*/

async function searchMyMedia() {
  const query = document.getElementById("mediaSearchInput").value.trim();
  const container = document.getElementById("mediaLibraryContent");
  if (!container) return;

  const userId = getUserId();
  if (!userId) return;

  if (!query) {
    loadMyMedia();
    return;
  }

  try {
    const response = await fetch(
      `${getApiUrl()}?action=searchmedia&query=${encodeURIComponent(query)}&ownerUserId=${encodeURIComponent(userId)}`
    );
    const json = await response.json();
    const mediaList = (json.data && json.data.data) || [];
    renderMediaLibrary(mediaList);
  } catch (err) {
    console.log(err);
  }
}


/*
============================================================
MEDIA ANALYTICS
============================================================
*/

async function loadMediaAnalytics() {
  const container = document.getElementById("mediaAnalytics");
  if (!container) return;

  const userId = getUserId();
  if (!userId) return;

  try {
    const response = await fetch(
      `${getApiUrl()}?action=mediaanalytics&ownerUserId=${encodeURIComponent(userId)}`
    );
    const json = await response.json();
    const data = json.data || {};

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
        <div style="padding:10px;background:#e8f5e9;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:var(--primary);">${data.totalMedia || 0}</div>
          <div style="font-size:12px;color:#666;">Total Files</div>
        </div>
        <div style="padding:10px;background:#e3f2fd;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#1976d2;">${data.images || 0}</div>
          <div style="font-size:12px;color:#666;">Images</div>
        </div>
        <div style="padding:10px;background:#fce4ec;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#d32f2f;">${data.videos || 0}</div>
          <div style="font-size:12px;color:#666;">Videos</div>
        </div>
        <div style="padding:10px;background:#fff3e0;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#e65100;">${data.totalSizeMB || "0"} MB</div>
          <div style="font-size:12px;color:#666;">Total Size</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div style='color:#888;font-size:12px;'>Unable to load analytics.</div>";
  }
}


/*
============================================================
PREVIEW MEDIA
============================================================
*/

function previewMedia(mediaId) {
  // For now, just show the URL in a prompt
  // Full preview can be enhanced later
  const card = event && event.currentTarget;
  if (!card) return;

  const urlInput = card.querySelector("input") || { value: "" };
  // Simple approach: find the image and open it
  const img = card.querySelector("img");
  if (img && img.src) {
    window.open(img.src, "_blank");
  }
}


/*
============================================================
COPY MEDIA URL
============================================================
*/

function copyMediaUrl(url) {
  if (!url) {
    alert("No URL available.");
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    alert("URL copied to clipboard!");
  }).catch(() => {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("URL copied to clipboard!");
  });
}


/*
============================================================
DELETE MEDIA ITEM
============================================================
*/

async function deleteMediaItem(mediaId) {
  if (!mediaId) return;

  if (!confirm("Are you sure you want to delete this media? This will also delete it from ImageKit.")) {
    return;
  }

  try {
    const response = await fetch(
      `${getApiUrl()}?action=deletemedia&mediaId=${encodeURIComponent(mediaId)}`
    );
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Media deleted successfully!");
      loadMyMedia();
    } else {
      alert(json.message || "Failed to delete media.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to delete media. Check connection.");
  }
}