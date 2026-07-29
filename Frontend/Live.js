/*
============================================================
EKKA1KM FRONTEND
Live.js
Stage 3D-C — Live Around You
Shared dataset: ONE ?action=live request feeds both
Full Live page + Home Live preview.
============================================================
*/

let CURRENT_LIVE_DATA = [];

/*
============================================================
LOAD LIVE
?action=live
Single request reused by full page and Home preview.
============================================================
*/

async function loadLive() {

  const homeContainer =
    document.getElementById(
      "homeLiveAroundYouContent"
    );

  const liveContainer =
    document.getElementById(
      "liveList"
    );

  if (homeContainer) {
    homeContainer.innerHTML =
      '<div class="homeSection-empty">Loading live...</div>';
  }

  if (liveContainer) {
    liveContainer.innerHTML =
      '<div class="card">Loading live...</div>';
  }

  try {
    const response = await fetch(
      getApiUrl() + "?action=live"
    );

    const json = await response.json();

    const items =
      (json && json.data && json.data.data) || [];

    CURRENT_LIVE_DATA = items;

    renderHomeLivePreview(items);

    renderLivePage(items);

  } catch (err) {

    console.log("Live load error:", err);

    if (homeContainer) {
      homeContainer.innerHTML =
        '<div class="homeSection-empty">Unable to load live right now.</div>';
    }

    if (liveContainer) {
      liveContainer.innerHTML =
        '<div class="card">Unable to load live right now.</div>';
    }
  }
}

/*
============================================================
RENDER HOME LIVE PREVIEW
Max 4 cards using shared CURRENT_LIVE_DATA.
============================================================
*/

function renderHomeLivePreview(items) {

  const container =
    document.getElementById(
      "homeLiveAroundYouContent"
    );

  if (!container) return;

  const previewItems =
    (items || []).slice(0, 4);

  if (previewItems.length === 0) {
    container.innerHTML =
      '<div class="homeSection-empty">No live streams right now.</div>';
    return;
  }

  let html = '<div class="homePreviewGrid">';

  previewItems.forEach(function(item) {

    const liveId = item.LiveID || "";
    const title = escapeHtml(item.Title || "Live");
    const category = escapeHtml(item.Category || "");
    const city = escapeHtml(item.City || "");
    const imageUrl = item.ImageURL || item.Thumbnail || "";
    const isLive = String(item.IsLive || "")
      .toLowerCase() === "yes";

    html +=
      '<div class="homePreviewCard" onclick="openInternalDestination(\'live\', \'' + liveId + '\')">';

    if (imageUrl && isValidImageUrl(imageUrl)) {
      html +=
        '<div class="homePreviewCard-img">' +
          '<img src="' + imageUrl + '" onerror="this.parentElement.style.display=\'none\'">' +
        '</div>';
    }

    html += '<div class="homePreviewCard-body">';

    html += '<div class="homeSectionCard-top">';

    if (isLive) {
      html +=
        '<span class="homeSectionCard-badge liveBadge">LIVE</span>';
    }

    if (category) {
      html +=
        '<span class="homeSectionCard-badge">' +
          category +
        '</span>';
    }

    html += '</div>';

    html +=
      '<div class="homePreviewCard-title" title="' + title + '">' +
        title +
      '</div>';

    html += '<div class="homePreviewCard-meta">';

    if (city) {
      html += city;
    }

    html += '</div>';

    const viewerCount = Number(item.ViewerCount || item.viewerCount || 0);
    if (viewerCount > 0) {
      html += '<div class="homePreviewCard-meta">&#128065; ' + viewerCount.toLocaleString() + ' watching</div>';
    }

    const announcer = escapeHtml(item.Announcer || item.announcer || item.Streamer || "");
    if (announcer) {
      html += '<div class="homePreviewCard-meta">' + announcer + '</div>';
    }

    html += '<button onclick="event.stopPropagation();openLiveWatchModal(\'' + liveId + '\')" style="margin-top:6px;width:100%;padding:8px;background:var(--primary);color:#fff;border:none;border-radius:15px;cursor:pointer;font-weight:500;">Watch</button>';

    html += '</div>';
  });

  html += '</div>';

  container.innerHTML = html;
}

/*
============================================================
RENDER FULL LIVE PAGE
Uses same CURRENT_LIVE_DATA.
============================================================
*/

function renderLivePage(items) {

  const container =
    document.getElementById(
      "liveList"
    );

  if (!container) return;

  const liveItems = items || [];

  if (liveItems.length === 0) {
    container.innerHTML =
      '<div class="card">No live streams available right now.</div>';
    return;
  }

  let html = '<div class="livePageGrid">';

  liveItems.forEach(function(item) {

    const liveId = item.LiveID || "";
    const title = escapeHtml(item.Title || "Live");
    const description = escapeHtml(
      item.Description || ""
    );
    const category = escapeHtml(item.Category || "");
    const city = escapeHtml(item.City || "");
    const imageUrl = item.ImageURL || item.Thumbnail || "";
    const isLive = String(item.IsLive || "")
      .toLowerCase() === "yes";

    html += '<div class="card liveStreamCard" data-live-id="' + liveId + '" style="cursor:pointer;">';

    if (imageUrl && isValidImageUrl(imageUrl)) {
      html +=
        '<img src="' + imageUrl + '" style="width:100%;border-radius:15px;margin-bottom:10px;" onerror="this.style.display=\'none\'">';
    }

    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';

    if (isLive) {
      html +=
        '<span class="homeSectionCard-badge liveBadge">LIVE</span>';
    }

    if (category) {
      html +=
        '<span class="homeSectionCard-badge">' +
          category +
        '</span>';
    }

    html += '</div>';

    html += '<h3>' + title + '</h3>';

    if (description) {
      html += '<p>' + description + '</p>';
    }

    if (city) {
      html += '<p class="text-muted">' + city + '</p>';
    }

    const viewerCount = Number(item.ViewerCount || item.viewerCount || 0);
    if (viewerCount > 0) {
      html += '<div style="font-size:12px;color:#666;margin:6px 0;">&#128065; ' + viewerCount.toLocaleString() + ' watching</div>';
    }
    const announcer = escapeHtml(item.Announcer || item.announcer || item.Streamer || "");
    if (announcer) html += '<div style="font-size:12px;color:#666;">' + announcer + '</div>';
    html += '<button onclick="event.stopPropagation();openLiveWatchModal(\'' + liveId + '\')" style="width:100%;margin-top:8px;padding:9px;background:var(--primary);color:#fff;border:none;border-radius:15px;cursor:pointer;font-weight:500;">Watch Live</button>';
    html += '</div>';
  });

  html += '</div>';

  container.innerHTML = html;
}

/*
============================================================
ESCAPE HTML (pre-5.6 compatible helper)
============================================================
*/

function escapeHtml(str) {
  if (!str) return "";
  var s = String(str);
  var am = String.fromCharCode(38) + "amp;";
  var lt = String.fromCharCode(38) + "lt;";
  var gt = String.fromCharCode(38) + "gt;";
  var qt = String.fromCharCode(38) + "quot;";
  var ap = String.fromCharCode(38) + "#39;";
  return s.replace(/&/g, am).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, qt).replace(/'/g, ap);
}

/*
============================================================
VALID IMAGE URL CHECK (reused from Ads pattern)
============================================================
*/

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.trim().toLowerCase().startsWith("http");
}
/*
============================================================
LIVE WATCH MODAL
============================================================
*/
function openLiveWatchModal(liveId) {
  if (!liveId) return;
  const modal = document.createElement("div");
  modal.id = "liveWatchModal";
  modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;";
  modal.innerHTML = '<div style="background:#111;border-radius:18px;padding:12px;max-width:960px;width:94%;animation:scaleIn 0.3s;">' +
    '<div style="position:relative;width:100%;padding-top:56.25%;background:#000;border-radius:12px;overflow:hidden;">' +
    '<iframe id="liveWatchFrame" src="" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;">' +
    '<div style="color:#fff;font-weight:600;font-size:14px;" id="liveWatchTitle">Live</div>' +
    '<button onclick="closeLiveWatchModal()" style="padding:8px 12px;background:#666;color:#fff;border:none;border-radius:12px;cursor:pointer;">Close</button></div></div>';
  document.body.appendChild(modal);
  const item = CURRENT_LIVE_DATA.find(function(x){ return String(x.LiveID) === String(liveId); }) || {};
  const title = item.Title || item.title || "Live";
  document.getElementById("liveWatchTitle").textContent = title;
  const streamUrl = item.StreamURL || item.streamURL || item.VideoURL || item.VideoUrl || "";
  const embed = item.EmbedURL || item.embedURL || streamUrl;
  const frame = document.getElementById("liveWatchFrame");
  if (frame && embed) frame.src = embed;
}

function closeLiveWatchModal() {
  const modal = document.getElementById("liveWatchModal");
  if (modal) modal.remove();
}
