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

    html += '<div class="card" onclick="openInternalDestination(\'live\', \'' + liveId + '\')" style="cursor:pointer;">';

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