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
        '<div class="liveCard" onclick="openInternalDestination(\'live\', \'' + liveId + '\')">';

      if (imageUrl && isValidImageUrl(imageUrl)) {
        html +=
          '<div class="liveCard-img">' +
            '<img src="' + imageUrl + '">' +
          '</div>';
      } else {
        html += '<div class="liveCard-img liveCard-imgPlaceholder"><i class="material-icons">live_tv</i></div>';
      }

      html += '<div class="liveCard-body">';

      html += '<div class="homeSectionCard-top">';

      if (isLive) {
        html +=
          '<span class="liveCard-badge-live">LIVE</span>';
      }

      if (category) {
        html +=
          '<span class="liveCard-category">' +
            category +
          '</span>';
      }

      html += '</div>';

      html +=
        '<div class="liveCard-title" title="' + title + '">' +
          title +
        '</div>';

      const viewerCount = Number(item.ViewerCount || item.viewerCount || 0);
      if (viewerCount > 0) {
        html += '<div class="liveCard-meta">&#128065; ' + viewerCount.toLocaleString() + ' watching</div>';
      }

      const announcer = escapeHtml(item.Announcer || item.announcer || item.Streamer || "");
      if (announcer) {
        html += '<div class="liveCard-announcer">' + announcer + '</div>';
      }

      if (city) {
        html += '<div class="liveCard-meta">' + city + '</div>';
      }

      html += '<div class="liveCard-actions">';
      html += '<button onclick="event.stopPropagation();openLiveWatchModal(\'' + liveId + '\')">Watch</button>';
      html += '</div>';

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

    html += '<div class="liveCard" data-live-id="' + liveId + '" style="cursor:pointer;">';

    if (imageUrl && isValidImageUrl(imageUrl)) {
      html +=
        '<div class="liveCard-img">' +
          '<img src="' + imageUrl + '">' +
        '</div>';
    } else {
      html += '<div class="liveCard-img liveCard-imgPlaceholder"><i class="material-icons">live_tv</i></div>';
    }

    html += '<div class="liveCard-body">';

    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">';

    if (isLive) {
      html +=
        '<span class="liveCard-badge-live">LIVE</span>';
    }

    if (category) {
      html +=
        '<span class="liveCard-category">' +
          category +
        '</span>';
    }

    html += '</div>';

    html += '<div class="liveCard-title">' + title + '</div>';

    if (description) {
      html += '<div class="liveCard-meta">' + description + '</div>';
    }

    if (city) {
      html += '<div class="liveCard-meta">' + city + '</div>';
    }

    const viewerCount = Number(item.ViewerCount || item.viewerCount || 0);
    if (viewerCount > 0) {
      html += '<div class="liveCard-meta">&#128065; ' + viewerCount.toLocaleString() + ' watching</div>';
    }
    const announcer = escapeHtml(item.Announcer || item.announcer || item.Streamer || "");
    if (announcer) html += '<div class="liveCard-announcer">' + announcer + '</div>';
    html += '<div class="liveCard-actions"><button onclick="event.stopPropagation();openLiveWatchModal(\'' + liveId + '\')">Watch Live</button></div>';
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
