/*
============================================================
EKKA1KM FRONTEND
Ads.js
Phase 4 - PIP Advertisement + Reward Ad Center + Promotion Engine
Builds on existing Ads.js V1.0

PRE-5.6 UPGRADE:
- Responsive maximum-area PIP display (adapts to viewport)
- Multi-format creative support: IMAGE, BANNER, VIDEO, PAGE
- Clickable destinations: External (safe URLs) + Internal Ekka1km content
- Promotional mini-page (PAGE creative format)
- Backward compatible with existing campaigns
- Security: URL validation, no invisible click interceptors
- Preserves existing analytics, rewards, tracking
============================================================
*/

let CURRENT_ADS = [];
let CURRENT_PIP_AD = null;
let PIP_QUEUE = [];
let PIP_QUEUE_INDEX = 0;
let AD_WATCH_TIMER = null;
let AD_WATCH_SECONDS = 0;
let CURRENT_WATCHING_CAMPAIGN = null;
let AD_CENTER_TAB = "All";
let PIP_QUEUE_LOADED = false;

/*
============================================================
LOAD ADVERTISEMENTS (existing - backward compatible)
============================================================
*/

async function loadAdvertisements() {
  const container = document.getElementById("advertisementList");
  if (!container) return;
  container.innerHTML = "<div class='card'>Loading Advertisements...</div>";
  try {
    const response = await fetch(
      getApiUrl() + "?action=advertisements&lat=" + CURRENT_LAT + "&lng=" + CURRENT_LNG + "&radius=" + getRadius()
    );
    const json = await response.json();
    CURRENT_ADS = (json.data && json.data.data) || [];
    renderAdvertisements();
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load advertisements.</div>";
  }
}

function renderAdvertisements() {
  const container = document.getElementById("advertisementList");
  if (!container) return;
  if (CURRENT_ADS.length === 0) {
    container.innerHTML = "<div class='card'>No Advertisements Found.</div>";
    return;
  }
  let html = "";
  CURRENT_ADS.forEach(function(ad) {
    html += '<div class="card">';
    if (ad.ImageURL && isValidImageUrl(ad.ImageURL)) {
      html += '<img src="' + ad.ImageURL + '" style="width:100%;border-radius:15px;margin-bottom:10px;">';
    }
    html += '<h3>' + (ad.Title || "-") + '</h3>';
    html += '<p>' + (ad.Description || "") + '</p>';
    if (ad.ExternalURL) {
      html += '<button onclick="openAdvertisement(\'' + ad.ExternalURL + '\')">Open</button>';
    }
    html += '</div>';
  });
  container.innerHTML = html;
}

function openAdvertisement(url) {
  if (!url) return;
  window.open(url, "_blank");
}

/*
============================================================
SAFE URL VALIDATION (Pre-5.6)
============================================================
*/
function isValidDestinationUrl(url) {
  if (!url || typeof url !== "string") return false;
  var trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("tel:") || trimmed.startsWith("mailto:")) return true;
  return false;
}

/*
============================================================
OPEN INTERNAL EKKA1KM DESTINATION (Pre-5.6)
============================================================
*/
function openInternalDestination(targetType, targetId) {
  if (!targetType || !targetId) return false;
  var type = String(targetType).toLowerCase();
  switch (type) {
    case "product":
      if (typeof showProductDetails === "function") {
        fetch(getApiUrl() + "?action=product&id=" + encodeURIComponent(targetId))
          .then(function(r) { return r.json(); })
          .then(function(json) {
            if (json && json.success && json.data) {
              openPage("products");
              setTimeout(function() { showProductDetails(json.data); }, 100);
            }
          })
          .catch(function(err) { console.log("Product fetch error:", err); });
        return true;
      }
      break;
    case "business":
      if (typeof showBusinessDetails === "function") {
        fetch(getApiUrl() + "?action=business&id=" + encodeURIComponent(targetId))
          .then(function(r) { return r.json(); })
          .then(function(json) {
            if (json && json.success && json.data) {
              openPage("businesses");
              setTimeout(function() { showBusinessDetails(json.data); }, 100);
            }
          })
          .catch(function(err) { console.log("Business fetch error:", err); });
        return true;
      }
      break;
    case "property":
      if (typeof showPropertyDetails === "function") {
        fetch(getApiUrl() + "?action=property&id=" + encodeURIComponent(targetId))
          .then(function(r) { return r.json(); })
          .then(function(json) {
            if (json && json.success && json.data) {
              openPage("properties");
              setTimeout(function() { showPropertyDetails(json.data); }, 100);
            }
          })
          .catch(function(err) { console.log("Property fetch error:", err); });
        return true;
      }
      break;
    case "news":
      if (typeof showNewsDetails === "function") {
        fetch(getApiUrl() + "?action=article&id=" + encodeURIComponent(targetId))
          .then(function(r) { return r.json(); })
          .then(function(json) {
            if (json && json.success && json.data) {
              openPage("news");
              setTimeout(function() { showNewsDetails(json.data); }, 100);
            }
          })
          .catch(function(err) { console.log("News fetch error:", err); });
        return true;
      }
      break;
    case "live":
      openPage("live");
      return true;
    default:
      return false;
  }
  return false;
}

/*
============================================================
HANDLE PIP ADVERTISEMENT CLICK (Pre-5.6)
============================================================
*/
function handlePipAdClick(campaign) {
  if (!campaign) return;
  var campaignId = campaign.CampaignID || campaign.campaignId || "";
  var userId = getUserId();
  var destinationType = campaign.DestinationType || campaign.destinationType || "None";
  var externalUrl = campaign.ExternalURL || campaign.externalURL || "";
  var targetType = campaign.TargetType || campaign.targetType || "";
  var targetId = campaign.TargetID || campaign.targetId || "";
  if (campaignId) {
    fetch(getApiUrl() + "?action=trackpipclick&userId=" + encodeURIComponent(userId || "") +
      "&campaignId=" + encodeURIComponent(campaignId) +
      "&destinationType=" + encodeURIComponent(destinationType) +
      "&entityType=" + encodeURIComponent(targetType) +
      "&entityId=" + encodeURIComponent(targetId) +
      "&destinationUrl=" + encodeURIComponent(externalUrl || ""))
      .catch(function(err) { console.log("Click track error:", err); });
  }
  if (destinationType === "External" || destinationType === "Both") {
    if (externalUrl && isValidDestinationUrl(externalUrl)) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
  }
  if (destinationType === "Internal" || destinationType === "Both") {
    if (targetType && targetId) {
      var opened = openInternalDestination(targetType, targetId);
      if (opened) return;
    }
  }
  if (externalUrl && isValidDestinationUrl(externalUrl)) {
    window.open(externalUrl, "_blank", "noopener,noreferrer");
  }
}

/*
============================================================
RESPONSIVE PIP CONTAINER (Pre-5.6)
============================================================
*/
function getOrCreatePipContainer() {
  var pip = document.getElementById("pipAdContainer");
  if (pip) {
    updatePipPositioning(pip);
    return pip;
  }
  pip = document.createElement("div");
  pip.id = "pipAdContainer";
  pip.style.position = "fixed";
  pip.style.zIndex = "99999";
  pip.style.overflow = "hidden";
  pip.style.borderRadius = "16px";
  pip.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
  pip.style.transition = "all 0.3s ease";
  pip.style.background = "#fff";
  updatePipPositioning(pip);
  document.body.appendChild(pip);
  return pip;
}

function updatePipPositioning(pip) {
  if (!pip) return;
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var headerHeight = 70;
  var bottomNavHeight = 65;
  var safeMargin = 12;
  var availableWidth = vw - (safeMargin * 2);
  var availableHeight = vh - headerHeight - bottomNavHeight - (safeMargin * 2);
  var pipWidth, pipHeight;
  if (vw < 600) {
    pipWidth = Math.min(availableWidth * 0.92, 420);
    pipHeight = Math.min(availableHeight * 0.50, 400);
  } else if (vw < 1024) {
    pipWidth = Math.min(availableWidth * 0.55, 480);
    pipHeight = Math.min(availableHeight * 0.55, 420);
  } else {
    pipWidth = Math.min(availableWidth * 0.38, 520);
    pipHeight = Math.min(availableHeight * 0.60, 480);
  }
  pipWidth = Math.max(pipWidth, 240);
  pipHeight = Math.max(pipHeight, 200);
  pip.style.width = pipWidth + "px";
  pip.style.height = "auto";
  pip.style.maxHeight = pipHeight + "px";
  pip.style.bottom = (bottomNavHeight + safeMargin) + "px";
  pip.style.right = safeMargin + "px";
  pip.style.left = "auto";
  pip.style.top = "auto";
}

/*
============================================================
LOAD PIP QUEUE
============================================================
*/
async function loadPipQueue() {
  console.log("Phase4: PIP initialization started");
  if (PIP_QUEUE_LOADED) {
    console.log("Phase4: PIP already loaded, skipping");
    return;
  }
  try {
    const apiUrl = getApiUrl();
    const userId = getUserId();
    let url = apiUrl + "?action=getpipqueue";
    if (userId) url += "&userId=" + userId;
    const response = await fetch(url);
    const responseText = await response.text();
    if (responseText.trim().startsWith("<")) {
      console.error("Phase4: Got HTML instead of JSON");
      PIP_QUEUE_LOADED = false;
      setTimeout(loadPipQueue, 3000);
      return;
    }
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Phase4: JSON parse error:", parseErr.toString());
      if (!PIP_QUEUE_LOADED) setTimeout(loadPipQueue, 3000);
      return;
    }
    if (!json || !json.success) {
      console.log("Phase4: API returned success=false");
      return;
    }
    const queue = json.data && json.data.queue ? json.data.queue : [];
    if (queue.length === 0) {
      console.log("Phase4: No ads available");
      return;
    }
    PIP_QUEUE = queue;
    PIP_QUEUE_INDEX = 0;
    PIP_QUEUE_LOADED = true;
    console.log("Phase4: Rendering PIP - showing ad 1 of", queue.length);
    showPipAdFromQueue();
  } catch (err) {
    console.error("Phase4: loadPipQueue error:", err.toString());
    if (!PIP_QUEUE_LOADED) setTimeout(loadPipQueue, 3000);
  }
}

/*
============================================================
ESCAPE HTML (Pre-5.6)
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
SHOW PIP AD FROM QUEUE (Pre-5.6 multi-format)
============================================================
*/
function showPipAdFromQueue() {
  console.log("Phase4: showPipAdFromQueue - index:", PIP_QUEUE_INDEX, "of", PIP_QUEUE.length);
  if (PIP_QUEUE_INDEX >= PIP_QUEUE.length) {
    console.log("Phase4: All ads shown");
    showMoreAdsPopup();
    return;
  }
  const campaign = PIP_QUEUE[PIP_QUEUE_INDEX];
  if (!campaign) {
    console.log("Phase4: Campaign is null");
    return;
  }
  console.log("Phase4: Showing campaign:", campaign.CampaignID);
  CURRENT_PIP_AD = campaign;
  CURRENT_WATCHING_CAMPAIGN = campaign;
  AD_WATCH_SECONDS = 0;
  var pip = getOrCreatePipContainer();
  var creativeType = campaign.CreativeType || campaign.creativeType || "IMAGE";
  var rewardCoins = Number(campaign.RewardCoins || campaign.rewardCoins || 0);
  var duration = Number(campaign.Duration || campaign.duration || 10);
  var imageUrl = campaign.ImageURL || campaign.imageURL || "";
  var videoUrl = campaign.VideoURL || campaign.videoURL || "";
  var title = campaign.Title || campaign.title || "";
  var description = campaign.Description || campaign.description || "";
  var cta = campaign.CTA || campaign.cta || "Learn More";
  var destinationType = campaign.DestinationType || campaign.destinationType || "None";
  var pageContent = campaign.PageContent || campaign.pageContent || "";
  var creativeHtml = "";
  var isVideoType = creativeType === "VIDEO" && videoUrl;
  var isPageType = creativeType === "PAGE" && pageContent;
  var isBannerType = creativeType === "BANNER" && imageUrl;
  if (isVideoType) {
    creativeHtml = '<div class="pipVideoContainer" style="position:relative;width:100%;padding-top:56.25%;background:#000;border-radius:10px;overflow:hidden;margin-bottom:8px;">' +
      '<video src="' + videoUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;" controls muted playsinline preload="metadata" onclick="event.stopPropagation();"></video></div>';
  } else if (isPageType) {
    var pageData = null;
    try { pageData = JSON.parse(pageContent); } catch (e) { pageData = { heading: title, description: description, buttonText: cta }; }
    var pageHeading = pageData.heading || title;
    var pageDesc = pageData.description || description;
    var pageButtonText = pageData.buttonText || cta;
    var bgColor = pageData.backgroundColor || "#fff";
    var textColor = pageData.textColor || "#222";
    creativeHtml = '<div class="pipPageContent" style="padding:12px;background:' + bgColor + ';color:' + textColor + ';border-radius:10px;margin-bottom:8px;min-height:100px;">';
    if (imageUrl) {
      creativeHtml += '<img src="' + imageUrl + '" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px;" onerror="this.style.display=\'none\';">';
    }
    creativeHtml += '<h3 style="font-size:15px;margin:0 0 6px 0;color:' + textColor + ';">' + escapeHtml(pageHeading) + '</h3>';
    creativeHtml += '<p style="font-size:12px;margin:0 0 8px 0;color:' + textColor + ';opacity:0.8;">' + escapeHtml(pageDesc) + '</p>';
    if (cta) {
      creativeHtml += '<div class="pipCtaButton" style="text-align:center;margin-top:8px;"><span style="display:inline-block;padding:8px 20px;background:var(--primary);color:#fff;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;">' + escapeHtml(pageButtonText) + '</span></div>';
    }
    creativeHtml += '</div>';
  } else if (isBannerType) {
    creativeHtml = '<div style="width:100%;border-radius:10px;overflow:hidden;margin-bottom:8px;background:#f0f0f0;text-align:center;">' +
      '<img src="' + imageUrl + '" style="width:100%;height:auto;max-height:140px;object-fit:contain;" onerror="this.style.display=\'none\';"></div>';
  } else {
    creativeHtml = imageUrl && isValidImageUrl(imageUrl)
      ? '<img src="' + imageUrl + '" style="width:100%;max-height:160px;object-fit:contain;border-radius:10px;margin-bottom:8px;" onerror="this.style.display=\'none\';">'
      : "";
  }
  var html = '<div class="pipAdInner" style="display:flex;flex-direction:column;padding:10px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">';
  html += '<div style="flex:1;min-width:0;padding-right:8px;">';
  html += '<strong style="color:var(--primary);font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (title || "Reward Ad") + '</strong>';
  html += '<span style="font-size:10px;color:#999;">' + (PIP_QUEUE_INDEX + 1) + '/' + PIP_QUEUE.length + ' &middot; ' + creativeType + '</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
  html += '<span style="font-size:10px;font-weight:600;color:var(--primary);">&#11088; ' + rewardCoins + '</span>';
  html += '<span onclick="skipCurrentPipAd()" style="cursor:pointer;color:red;font-weight:bold;font-size:16px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,0,0,0.05);" title="Close">&#10005;</span>';
  html += '</div></div>';
  html += '<div class="pipCreativeArea" onclick="handlePipAdClick(CURRENT_PIP_AD)" style="cursor:pointer;">' + creativeHtml + '</div>';
  if (!isPageType && description) {
    html += '<p style="font-size:11px;color:#666;margin:3px 0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + escapeHtml(description) + '</p>';
  }
  if (!isPageType && cta && destinationType !== "None") {
    html += '<button onclick="event.stopPropagation();handlePipAdClick(CURRENT_PIP_AD)" style="font-size:11px;padding:5px 12px;margin:4px 0;background:var(--primary);color:#fff;border:none;border-radius:15px;cursor:pointer;font-weight:500;">' + escapeHtml(cta) + '</button>';
  }
  if (rewardCoins > 0) {
    html += '<div style="background:#e0e0e0;border-radius:10px;height:4px;margin:6px 0;overflow:hidden;">';
    html += '<div id="pipProgressBar" style="background:var(--primary);height:100%;width:0%;border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<div style="display:flex;gap:5px;">';
    html += '<button onclick="startPipAdWatch()" id="pipWatchBtn" style="flex:1;font-size:11px;padding:5px;"><i class="material-icons" style="font-size:13px;vertical-align:middle;">play_arrow</i> Watch</button>';
    html += '<button onclick="skipCurrentPipAd()" style="flex:1;font-size:11px;padding:5px;background:#666;">Skip</button></div>';
  } else {
    html += '<div style="display:flex;gap:5px;margin-top:4px;">';
    html += '<button onclick="handlePipAdClick(CURRENT_PIP_AD)" style="flex:1;font-size:11px;padding:5px;">' + escapeHtml(cta || "Learn More") + '</button>';
    html += '<button onclick="skipCurrentPipAd()" style="flex:1;font-size:11px;padding:5px;background:#666;">Skip</button></div>';
  }
  html += '</div>';
  pip.innerHTML = html;
  pip.style.display = "block";
  setTimeout(function() { updatePipPositioning(pip); }, 100);
  console.log("Phase4: PIP rendered with creative type:", creativeType);
}

/*
============================================================
SKIP CURRENT PIP AD
============================================================
*/
function skipCurrentPipAd() {
  stopAdWatchTimer();
  if (CURRENT_WATCHING_CAMPAIGN && AD_WATCH_SECONDS > 0) {
    const campaignId = CURRENT_WATCHING_CAMPAIGN.CampaignID || CURRENT_WATCHING_CAMPAIGN.campaignId || "";
    const userId = getUserId();
    if (userId && campaignId) {
      fetch(getApiUrl() + "?action=skipadwatch&userId=" + userId + "&campaignId=" + campaignId + "&watchedSeconds=" + AD_WATCH_SECONDS)
        .catch(function(err) { console.log("skipAdWatch error:", err); });
    }
  }
  CURRENT_WATCHING_CAMPAIGN = null;
  AD_WATCH_SECONDS = 0;
  PIP_QUEUE_INDEX++;
  removePipContainer();
  showPipAdFromQueue();
}

/*
============================================================
START PIP AD WATCH
============================================================
*/
function startPipAdWatch() {
  if (!CURRENT_PIP_AD) return;
  const campaignId = CURRENT_PIP_AD.CampaignID || CURRENT_PIP_AD.campaignId || "";
  const userId = getUserId();
  const watchBtn = document.getElementById("pipWatchBtn");
  if (watchBtn) {
    watchBtn.disabled = true;
    watchBtn.style.opacity = "0.5";
    watchBtn.innerHTML = '<i class="material-icons" style="font-size:13px;vertical-align:middle;">hourglass_top</i> Watching...';
  }
  if (userId && campaignId) {
    fetch(getApiUrl() + "?action=startadwatch&userId=" + userId + "&campaignId=" + campaignId)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json.success) {
          startAdWatchTimer();
        } else {
          console.log("startAdWatch error:", json.message);
          if (watchBtn) {
            watchBtn.disabled = false;
            watchBtn.style.opacity = "1";
            watchBtn.innerHTML = '<i class="material-icons" style="font-size:13px;vertical-align:middle;">play_arrow</i> Watch';
          }
        }
      })
      .catch(function(err) {
        console.log("startAdWatch error:", err);
        startAdWatchTimer();
      });
  } else {
    startAdWatchTimer();
  }
}

/*
============================================================
AD WATCH TIMER
============================================================
*/
function startAdWatchTimer() {
  if (AD_WATCH_TIMER) clearInterval(AD_WATCH_TIMER);
  AD_WATCH_SECONDS = 0;
  const duration = Number(CURRENT_PIP_AD.Duration || CURRENT_PIP_AD.duration || 10);
  AD_WATCH_TIMER = setInterval(function() {
    AD_WATCH_SECONDS++;
    const progress = Math.min(100, Math.round((AD_WATCH_SECONDS / duration) * 100));
    const progressBar = document.getElementById("pipProgressBar");
    if (progressBar) progressBar.style.width = progress + "%";
    if (AD_WATCH_SECONDS % 2 === 0) {
      const campaignId = CURRENT_PIP_AD.CampaignID || CURRENT_PIP_AD.campaignId || "";
      const userId = getUserId();
      if (userId && campaignId) {
        fetch(getApiUrl() + "?action=updateadprogress&userId=" + userId + "&campaignId=" + campaignId + "&watchedSeconds=" + AD_WATCH_SECONDS)
          .catch(function(err) { console.log("updateAdProgress error:", err); });
      }
    }
    if (AD_WATCH_SECONDS >= duration) {
      clearInterval(AD_WATCH_TIMER);
      AD_WATCH_TIMER = null;
      completeCurrentPipAd();
    }
  }, 1000);
}

function stopAdWatchTimer() {
  if (AD_WATCH_TIMER) {
    clearInterval(AD_WATCH_TIMER);
    AD_WATCH_TIMER = null;
  }
}

/*
============================================================
COMPLETE CURRENT PIP AD
============================================================
*/
function completeCurrentPipAd() {
  const campaignId = CURRENT_PIP_AD.CampaignID || CURRENT_PIP_AD.campaignId || "";
  const userId = getUserId();
  if (userId && campaignId) {
    fetch(getApiUrl() + "?action=completeadwatch&userId=" + userId + "&campaignId=" + campaignId)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json.success) {
          showRewardPopup(json.data.rewardEarned || 0, campaignId);
        }
      })
      .catch(function(err) { console.log("completeAdWatch error:", err); });
  }
  CURRENT_WATCHING_CAMPAIGN = null;
  AD_WATCH_SECONDS = 0;
  PIP_QUEUE_INDEX++;
  setTimeout(function() {
    removePipContainer();
    showPipAdFromQueue();
  }, 1500);
}

/*
============================================================
SHOW REWARD POPUP
============================================================
*/
function showRewardPopup(coins, campaignId) {
  const popup = document.createElement("div");
  popup.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999999;";
  popup.innerHTML = '<div style="background:#fff;border-radius:20px;padding:30px;text-align:center;max-width:320px;width:90%;animation:scaleIn 0.3s;">' +
    '<div style="font-size:50px;margin-bottom:10px;">&#127881;</div>' +
    '<h2 style="color:var(--primary);margin:10px 0;">+' + coins + ' Coins</h2>' +
    '<p style="color:#666;">You earned reward coins!</p>' +
    '<button onclick="this.parentElement.parentElement.remove()" style="margin-top:15px;">Awesome!</button></div>';
  document.body.appendChild(popup);
}

/*
============================================================
SHOW MORE ADS POPUP
============================================================
*/
function showMoreAdsPopup() {
  const popup = document.createElement("div");
  popup.id = "moreAdsPopup";
  popup.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999999;";
  popup.innerHTML = '<div style="background:#fff;border-radius:20px;padding:30px;text-align:center;max-width:340px;width:90%;animation:scaleIn 0.3s;">' +
    '<div style="font-size:40px;margin-bottom:10px;">&#127873;</div>' +
    '<h2 style="color:var(--primary);margin:10px 0;">More Reward Ads Available</h2>' +
    '<p style="color:#666;margin-bottom:15px;">Watch more ads and earn extra EkkaCoins!</p>' +
    '<button onclick="document.getElementById(\'moreAdsPopup\').remove();openPage(\'adcenter\');" style="margin-bottom:10px;">' +
    '<i class="material-icons" style="font-size:18px;vertical-align:middle;">visibility</i> Watch More Ads</button><br>' +
    '<button onclick="document.getElementById(\'moreAdsPopup\').remove();closeAllPopups();" style="background:#666;">' +
    '<i class="material-icons" style="font-size:18px;vertical-align:middle;">home</i> Continue To Ekka1km</button></div>';
  document.body.appendChild(popup);
}

function removePipContainer() {
  const pip = document.getElementById("pipAdContainer");
  if (pip) pip.style.display = "none";
}

function closeAllPopups() {
  const popup = document.getElementById("moreAdsPopup");
  if (popup) popup.remove();
  removePipContainer();
}

/*
============================================================
LOAD ADVERTISEMENT CENTER
============================================================
*/
async function loadAdCenter() {
  const container = document.getElementById("adCenterList");
  if (!container) return;
  container.innerHTML = "<div class='card'>Loading Reward Ads...</div>";
  const userId = getUserId();
  let url = getApiUrl() + "?action=getadcenter&lat=" + CURRENT_LAT + "&lng=" + CURRENT_LNG + "&radius=" + getRadius();
  if (userId) url += "&userId=" + userId;
  if (AD_CENTER_TAB && AD_CENTER_TAB !== "All") url += "&category=" + AD_CENTER_TAB;
  try {
    const response = await fetch(url);
    const json = await response.json();
    const ads = (json.data && json.data.data) || [];
    renderAdCenter(ads);
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load reward ads.</div>";
  }
}

function renderAdCenter(ads) {
  const container = document.getElementById("adCenterList");
  if (!container) return;
  if (ads.length === 0) {
    container.innerHTML = "<div class='card'>No reward ads available.</div>";
    return;
  }
  let totalEarnable = 0;
  ads.forEach(function(ad) {
    if (ad.CanWatch !== false) totalEarnable += Number(ad.RewardCoins || 0);
  });
  let html = "";
  if (ads.length > 1 && totalEarnable > 0) {
    html += '<button onclick="watchAllAds()" style="margin-bottom:15px;background:linear-gradient(135deg,var(--primary),#ff6f00);padding:12px;width:100%;">' +
      '<i class="material-icons" style="font-size:20px;vertical-align:middle;">play_circle</i> Watch All &mdash; Earn ' + totalEarnable + ' Coins</button>';
  }
  ads.forEach(function(ad) {
    const totalReward = Number(ad.RewardCoins || ad.rewardCoins || 0);
    const progressPercent = Number(ad.ProgressPercent || 0);
    const canWatch = ad.CanWatch !== false;
    const remainingReward = Number(ad.RemainingReward || 0);
    const watchedSeconds = Number(ad.WatchedSeconds || 0);
    const imageUrl = ad.ImageURL || ad.imageURL || "";
    const title = ad.Title || ad.title || "";
    const desc = ad.Description || ad.description || "";
    const adType = ad.AdType || ad.adType || "IMAGE";
    const campaignType = ad.CampaignType || ad.campaignType || "";
    const campaignId = ad.CampaignID || ad.campaignId || "";
    const creativeType = ad.CreativeType || "IMAGE";
    const cta = ad.CTA || "Learn More";
    html += '<div class="card" style="margin-bottom:15px;">';
    if (imageUrl && isValidImageUrl(imageUrl)) {
      html += '<img src="' + imageUrl + '" style="width:100%;border-radius:15px;margin-bottom:10px;max-height:200px;object-fit:cover;">';
    }
    html += '<h3 style="font-size:16px;">' + title + '</h3>';
    html += '<p style="font-size:13px;color:#666;">' + desc + '</p>';
    html += '<div style="display:flex;gap:5px;margin:8px 0;flex-wrap:wrap;">';
    html += '<span class="badge" style="background:var(--primary);color:#fff;">' + adType + '</span>';
    html += '<span class="badge" style="background:#1565c0;color:#fff;">' + creativeType + '</span>';
    if (campaignType) html += '<span class="badge">' + campaignType.replace("PROMOTE_", "") + '</span>';
    if (ad.Featured === "Yes") html += '<span class="badge" style="background:#ff6f00;color:#fff;">&#11088; Featured</span>';
    if (cta) html += '<span class="badge" style="background:#333;color:#fff;">' + cta + '</span>';
    html += '</div>';
    html += '<div style="background:#f5f5f5;border-radius:12px;padding:12px;margin:10px 0;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;">';
    html += '<span style="font-size:13px;font-weight:600;">&#11088; ' + totalReward + ' Coins</span>';
    html += '<span style="font-size:12px;color:#666;">' + watchedSeconds + '/' + (ad.Duration || 10) + 's</span></div>';
    html += '<div style="background:#e0e0e0;border-radius:10px;height:8px;overflow:hidden;margin:5px 0;">';
    html += '<div id="progress_' + campaignId + '" style="background:var(--primary);height:100%;width:' + progressPercent + '%;border-radius:10px;transition:width 0.3s;"></div></div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;">';
    html += '<span>' + progressPercent + '% complete</span>';
    html += '<span>&#128176; ' + remainingReward + ' coins remaining</span></div></div>';
    if (canWatch) {
      html += '<button onclick="openAdWatchModal(\'' + campaignId + '\')" style="width:100%;">';
      html += '<i class="material-icons" style="font-size:18px;vertical-align:middle;">' + (watchedSeconds > 0 ? 'play_circle' : 'play_arrow') + '</i> ';
      html += (watchedSeconds > 0 ? 'Continue Watching' : 'Watch & Earn') + '</button>';
    } else {
      html += '<button disabled style="width:100%;opacity:0.5;"><i class="material-icons" style="font-size:18px;vertical-align:middle;">check_circle</i> Completed</button>';
    }
    html += '</div>';
  });
  container.innerHTML = html;
}

function renderAdCenterTabs() {
  const tabsContainer = document.getElementById("adCenterTabs");
  if (!tabsContainer) return;
  const tabs = ["All", "Products", "Businesses", "Stores", "Properties", "Videos", "Nearby", "Featured"];
  tabsContainer.innerHTML = tabs.map(function(tab) {
    return '<button onclick="switchAdTab(\'' + tab + '\')" style="margin:3px;font-size:12px;padding:6px 12px;' + (AD_CENTER_TAB === tab ? 'background:var(--primary);color:#fff;' : '') + '">' + tab + '</button>';
  }).join("");
}

function switchAdTab(tab) {
  AD_CENTER_TAB = tab;
  renderAdCenterTabs();
  loadAdCenter();
}

/*
============================================================
OPEN AD WATCH MODAL
============================================================
*/
let AD_WATCH_MODAL_INTERVAL = null;

function openAdWatchModal(campaignId) {
  const userId = getUserId();
  if (!userId) {
    alert("Please login to earn rewards.");
    return;
  }
  const modal = document.createElement("div");
  modal.id = "adWatchModal";
  modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999;";
  modal.innerHTML = '<div style="background:#fff;border-radius:20px;padding:25px;max-width:400px;width:90%;text-align:center;animation:scaleIn 0.3s;">' +
    '<div id="adWatchContent">' +
    '<div style="font-size:30px;margin-bottom:10px;">&#9203;</div>' +
    '<h3 id="adWatchTitle">Loading...</h3>' +
    '<p id="adWatchDesc" style="color:#666;margin:10px 0;"></p>' +
    '<div style="font-size:40px;font-weight:700;color:var(--primary);margin:15px 0;" id="adWatchTimer">0s</div>' +
    '<div style="background:#e0e0e0;border-radius:10px;height:10px;overflow:hidden;margin:10px 0;">' +
    '<div id="adWatchProgressBar" style="background:var(--primary);height:100%;width:0%;border-radius:10px;transition:width 0.3s;"></div></div>' +
    '<div style="display:flex;gap:10px;margin-top:15px;">' +
    '<button id="adWatchSkipBtn" onclick="skipAdWatchModal()" style="flex:1;background:#666;">' +
    '<i class="material-icons" style="font-size:18px;vertical-align:middle;">skip_next</i> Skip</button>' +
    '<button id="adWatchCompleteBtn" onclick="completeAdWatchModal()" style="flex:1;display:none;background:green;">' +
    '<i class="material-icons" style="font-size:18px;vertical-align:middle;">check</i> Claim Reward</button></div></div></div>';
  document.body.appendChild(modal);
  fetch(getApiUrl() + "?action=startadwatch&userId=" + userId + "&campaignId=" + campaignId)
    .then(function(r) { return r.json(); })
    .then(function(json) {
      if (!json.success) {
        document.getElementById("adWatchTitle").textContent = json.message || "Cannot watch this ad";
        document.getElementById("adWatchSkipBtn").textContent = "Close";
        return;
      }
      const data = json.data;
      document.getElementById("adWatchTitle").textContent = data.title || "Reward Ad";
      document.getElementById("adWatchDesc").textContent = data.description || "Watch to earn coins";
      const totalDuration = data.totalDuration || 10;
      let currentSeconds = data.watchedSeconds || 0;
      if (data.imageURL) {
        const img = document.createElement("img");
        img.src = data.imageURL;
        img.style.cssText = "width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin:10px 0;";
        document.getElementById("adWatchContent").insertBefore(img, document.getElementById("adWatchTimer"));
      }
      function updateTimer() {
        currentSeconds++;
        if (currentSeconds > totalDuration) currentSeconds = totalDuration;
        document.getElementById("adWatchTimer").textContent = currentSeconds + "s";
        const pct = Math.min(100, Math.round((currentSeconds / totalDuration) * 100));
        document.getElementById("adWatchProgressBar").style.width = pct + "%";
        if (currentSeconds % 2 === 0) {
          fetch(getApiUrl() + "?action=updateadprogress&userId=" + userId + "&campaignId=" + campaignId + "&watchedSeconds=" + currentSeconds)
            .catch(function(err) { console.log("update error:", err); });
        }
        if (currentSeconds >= totalDuration) {
          clearInterval(AD_WATCH_MODAL_INTERVAL);
          AD_WATCH_MODAL_INTERVAL = null;
          document.getElementById("adWatchTimer").textContent = "&#10004; Complete!";
          document.getElementById("adWatchCompleteBtn").style.display = "block";
          document.getElementById("adWatchSkipBtn").style.display = "none";
          completeAdWatchModal();
        }
      }
      AD_WATCH_MODAL_INTERVAL = setInterval(updateTimer, 1000);
    })
    .catch(function(err) {
      console.log("startAdWatch error:", err);
      document.getElementById("adWatchTitle").textContent = "Error starting ad";
      document.getElementById("adWatchSkipBtn").textContent = "Close";
    });
}

function skipAdWatchModal() {
  if (AD_WATCH_MODAL_INTERVAL) {
    clearInterval(AD_WATCH_MODAL_INTERVAL);
    AD_WATCH_MODAL_INTERVAL = null;
  }
  const userId = getUserId();
  const currentSeconds = parseInt(document.getElementById("adWatchTimer").textContent) || 0;
  const campaignId = CURRENT_WATCHING_CAMPAIGN ? (CURRENT_WATCHING_CAMPAIGN.CampaignID || CURRENT_WATCHING_CAMPAIGN.campaignId || "") : "";
  if (userId && campaignId && currentSeconds > 0) {
    fetch(getApiUrl() + "?action=skipadwatch&userId=" + userId + "&campaignId=" + campaignId + "&watchedSeconds=" + currentSeconds)
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json.success && json.data && json.data.partialReward > 0) {
          showRewardPopup(json.data.partialReward, campaignId);
        }
      })
      .catch(function(err) { console.log("skip error:", err); });
  }
  closeAdWatchModal();
}

async function completeAdWatchModal() {
  if (AD_WATCH_MODAL_INTERVAL) {
    clearInterval(AD_WATCH_MODAL_INTERVAL);
    AD_WATCH_MODAL_INTERVAL = null;
  }
  const userId = getUserId();
  const currentSeconds = parseInt(document.getElementById("adWatchTimer").textContent) || 0;
  const campaignId = CURRENT_WATCHING_CAMPAIGN ? (CURRENT_WATCHING_CAMPAIGN.CampaignID || CURRENT_WATCHING_CAMPAIGN.campaignId || "") : "";
  if (userId && campaignId) {
    try {
      const response = await fetch(getApiUrl() + "?action=completeadwatch&userId=" + userId + "&campaignId=" + campaignId);
      const json = await response.json();
      if (json.success) {
        showRewardPopup(json.data.rewardEarned || 0, campaignId);
        loadAdCenter();
      }
    } catch (err) {
      console.log("complete error:", err);
    }
  }
  closeAdWatchModal();
}

function closeAdWatchModal() {
  const modal = document.getElementById("adWatchModal");
  if (modal) modal.remove();
}

/*
============================================================
WATCH ALL ADS
============================================================
*/
async function watchAllAds() {
  const userId = getUserId();
  if (!userId) {
    alert("Please login to earn rewards.");
    return;
  }
  let url = getApiUrl() + "?action=getadcenter";
  if (userId) url += "&userId=" + userId;
  try {
    const response = await fetch(url);
    const json = await response.json();
    const ads = (json.data && json.data.data) || [];
    if (ads.length === 0) {
      alert("No ads available to watch.");
      return;
    }
    PIP_QUEUE = ads.filter(function(ad) { return ad.CanWatch !== false; });
    PIP_QUEUE_INDEX = 0;
    if (PIP_QUEUE.length === 0) {
      alert("All ads completed!");
      return;
    }
    openAdWatchModal(PIP_QUEUE[0].CampaignID);
  } catch (err) {
    console.log("watchAllAds error:", err);
  }
}

function openAdCenterPage() {
  console.log("Phase4: Ad Center opened");
  renderAdCenterTabs();
  loadAdCenter();
}

/*
============================================================
BACKWARD COMPATIBILITY
============================================================
*/
async function loadPipAd() {
  try {
    const response = await fetch(getApiUrl() + "?action=pipads&lat=" + CURRENT_LAT + "&lng=" + CURRENT_LNG + "&radius=" + getRadius());
    const json = await response.json();
    const ads = (json.data && json.data.data) || [];
    if (ads.length === 0) return;
    CURRENT_PIP_AD = ads[0];
    showPipAd();
  } catch (err) {
    console.log(err);
  }
}

function showPipAd() {
  if (!CURRENT_PIP_AD) return;
  let pip = document.getElementById("pipAdContainer");
  if (!pip) {
    pip = document.createElement("div");
    pip.id = "pipAdContainer";
    pip.style.position = "fixed";
    pip.style.bottom = "80px";
    pip.style.right = "10px";
    pip.style.width = "180px";
    pip.style.background = "#fff";
    pip.style.borderRadius = "15px";
    pip.style.boxShadow = "0 4px 15px rgba(0,0,0,.2)";
    pip.style.zIndex = "99999";
    pip.style.overflow = "hidden";
    document.body.appendChild(pip);
  }
  pip.innerHTML = '<div style="padding:10px">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
    '<strong>Ad</strong>' +
    '<span onclick="closePipAd()" style="cursor:pointer;color:red;">&#10005;</span></div>' +
    (CURRENT_PIP_AD.ImageURL && isValidImageUrl(CURRENT_PIP_AD.ImageURL) ? '<img src="' + CURRENT_PIP_AD.ImageURL + '" style="width:100%;border-radius:10px;">' : "") +
    '<h4 style="margin-top:10px;">' + (CURRENT_PIP_AD.Title || "") + '</h4>' +
    '<button onclick="openPipAd()">Open</button></div>';
}

function openPipAd() {
  if (!CURRENT_PIP_AD) return;
  if (CURRENT_PIP_AD.ExternalURL) {
    window.open(CURRENT_PIP_AD.ExternalURL, "_blank");
  }
}

function closePipAd() {
  const pip = document.getElementById("pipAdContainer");
  if (pip) pip.remove();
}

/*
============================================================
ANIMATION STYLE
============================================================
*/
(function addAdAnimations() {
  const style = document.createElement("style");
  style.textContent = "@keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
    " @media (max-width: 480px) { #pipAdContainer { border-radius: 12px !important; } }" +
    " .pipVideoContainer video::-webkit-media-controls { opacity: 0.8; }";
  document.head.appendChild(style);
})();