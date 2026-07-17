/*
============================================================
EKKA1KM FRONTEND
Ads.js
Phase 4 - PIP Advertisement + Reward Ad Center + Promotion Engine
Builds on existing Ads.js V1.0
============================================================
Features:
- PIP Queue (max 3 ads per session)
- Reward Advertisement Center
- Ad Watch Timer / Progress
- Continue Watching
- Watch All
- More Ads Popup
- Progress Bars
- Ad Categories Tabs
- Watch/Complete/Skip Rewards
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
      `${getApiUrl()}?action=advertisements&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    CURRENT_ADS = (json.data && json.data.data) || [];
    renderAdvertisements();
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load advertisements.</div>";
  }
}


/*
============================================================
RENDER ADVERTISEMENTS (existing - backward compatible)
============================================================
*/

function renderAdvertisements() {
  const container = document.getElementById("advertisementList");
  if (!container) return;

  if (CURRENT_ADS.length === 0) {
    container.innerHTML = "<div class='card'>No Advertisements Found.</div>";
    return;
  }

  let html = "";
  CURRENT_ADS.forEach(ad => {
    html += `
      <div class="card">
        ${ad.ImageURL && isValidImageUrl(ad.ImageURL) ? `<img src="${ad.ImageURL}" style="width:100%;border-radius:15px;margin-bottom:10px;">` : ""}
        <h3>${ad.Title || "-"}</h3>
        <p>${ad.Description || ""}</p>
        ${ad.ExternalURL ? `<button onclick="openAdvertisement('${ad.ExternalURL}')">Open</button>` : ""}
      </div>
    `;
  });
  container.innerHTML = html;
}


/*
============================================================
OPEN ADVERTISEMENT (existing - backward compatible)
============================================================
*/

function openAdvertisement(url) {
  if (!url) return;
  window.open(url, "_blank");
}


/*
============================================================
LOAD PIP QUEUE (Phase 4 - Enhanced)
============================================================
*/

async function loadPipQueue() {
  try {
    const userId = getUserId();
    let url = `${getApiUrl()}?action=getpipqueue`;
    if (userId) url += `&userId=${userId}`;
    
    const response = await fetch(url);
    const json = await response.json();

    if (!json.success || !json.data) {
      console.log("No PIP queue available");
      return;
    }

    const queue = json.data.queue || [];
    if (queue.length === 0) return;

    PIP_QUEUE = queue;
    PIP_QUEUE_INDEX = 0;

    // Show first PIP ad
    showPipAdFromQueue();

  } catch (err) {
    console.log("loadPipQueue error:", err);
  }
}


/*
============================================================
SHOW PIP AD FROM QUEUE
============================================================
*/

function showPipAdFromQueue() {
  if (PIP_QUEUE_INDEX >= PIP_QUEUE.length) {
    // All ads shown - show "More Ads" popup
    showMoreAdsPopup();
    return;
  }

  const campaign = PIP_QUEUE[PIP_QUEUE_INDEX];
  if (!campaign) return;

  CURRENT_PIP_AD = campaign;
  CURRENT_WATCHING_CAMPAIGN = campaign;
  AD_WATCH_SECONDS = 0;

  let pip = document.getElementById("pipAdContainer");
  if (!pip) {
    pip = document.createElement("div");
    pip.id = "pipAdContainer";
    pip.style.position = "fixed";
    pip.style.bottom = "80px";
    pip.style.right = "10px";
    pip.style.width = "200px";
    pip.style.background = "#fff";
    pip.style.borderRadius = "15px";
    pip.style.boxShadow = "0 4px 15px rgba(0,0,0,.2)";
    pip.style.zIndex = "99999";
    pip.style.overflow = "hidden";
    document.body.appendChild(pip);
  }

  const rewardCoins = Number(campaign.RewardCoins || campaign.rewardCoins || 0);
  const duration = Number(campaign.Duration || campaign.duration || 10);
  const imageUrl = campaign.ImageURL || campaign.imageURL || "";
  const title = campaign.Title || campaign.title || "";
  const description = campaign.Description || campaign.description || "";

  pip.innerHTML = `
    <div style="padding:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong style="color:var(--primary);">🎁 Reward Ad</strong>
        <div>
          <span style="font-size:11px;color:#999;margin-right:8px;">${PIP_QUEUE_INDEX + 1}/${PIP_QUEUE.length}</span>
          <span onclick="skipCurrentPipAd()" style="cursor:pointer;color:red;font-weight:bold;">✕</span>
        </div>
      </div>

      ${imageUrl && isValidImageUrl(imageUrl) ? `<img src="${imageUrl}" style="width:100%;border-radius:10px;margin-bottom:8px;">` : ""}

      <h4 style="font-size:13px;margin:5px 0;">${title}</h4>
      <p style="font-size:11px;color:#666;margin:3px 0;">${description}</p>

      <div style="font-size:12px;color:var(--primary);font-weight:600;margin:5px 0;">
        ⭐ ${rewardCoins} Coins
      </div>

      <div style="background:#e0e0e0;border-radius:10px;height:6px;margin:8px 0;overflow:hidden;">
        <div id="pipProgressBar" style="background:var(--primary);height:100%;width:0%;border-radius:10px;transition:width 0.5s;"></div>
      </div>

      <div style="display:flex;gap:5px;">
        <button onclick="startPipAdWatch()" id="pipWatchBtn" style="flex:1;font-size:12px;padding:6px;">
          <i class="material-icons" style="font-size:14px;vertical-align:middle;">play_arrow</i> Watch
        </button>
        <button onclick="skipCurrentPipAd()" style="flex:1;font-size:12px;padding:6px;background:#666;">
          Skip
        </button>
      </div>
    </div>
  `;

  pip.style.display = "block";
}


/*
============================================================
SKIP CURRENT PIP AD
============================================================
*/

function skipCurrentPipAd() {
  stopAdWatchTimer();

  // Save progress if any
  if (CURRENT_WATCHING_CAMPAIGN && AD_WATCH_SECONDS > 0) {
    const campaignId = CURRENT_WATCHING_CAMPAIGN.CampaignID || CURRENT_WATCHING_CAMPAIGN.campaignId || "";
    const userId = getUserId();
    if (userId && campaignId) {
      fetch(`${getApiUrl()}?action=skipadwatch&userId=${userId}&campaignId=${campaignId}&watchedSeconds=${AD_WATCH_SECONDS}`)
        .catch(err => console.log("skipAdWatch error:", err));
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
    watchBtn.innerHTML = '<i class="material-icons" style="font-size:14px;vertical-align:middle;">hourglass_top</i> Watching...';
  }

  // Start watching on backend
  if (userId && campaignId) {
    fetch(`${getApiUrl()}?action=startadwatch&userId=${userId}&campaignId=${campaignId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          startAdWatchTimer();
        } else {
          console.log("startAdWatch error:", json.message);
          if (watchBtn) {
            watchBtn.disabled = false;
            watchBtn.style.opacity = "1";
            watchBtn.innerHTML = '<i class="material-icons" style="font-size:14px;vertical-align:middle;">play_arrow</i> Watch';
          }
        }
      })
      .catch(err => {
        console.log("startAdWatch error:", err);
        startAdWatchTimer(); // Still track locally
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

  AD_WATCH_TIMER = setInterval(() => {
    AD_WATCH_SECONDS++;
    const progress = Math.min(100, Math.round((AD_WATCH_SECONDS / duration) * 100));
    const progressBar = document.getElementById("pipProgressBar");
    if (progressBar) progressBar.style.width = progress + "%";

    // Update progress on backend every 2 seconds
    if (AD_WATCH_SECONDS % 2 === 0) {
      const campaignId = CURRENT_PIP_AD.CampaignID || CURRENT_PIP_AD.campaignId || "";
      const userId = getUserId();
      if (userId && campaignId) {
        fetch(`${getApiUrl()}?action=updateadprogress&userId=${userId}&campaignId=${campaignId}&watchedSeconds=${AD_WATCH_SECONDS}`)
          .catch(err => console.log("updateAdProgress error:", err));
      }
    }

    // Complete when reached duration
    if (AD_WATCH_SECONDS >= duration) {
      clearInterval(AD_WATCH_TIMER);
      AD_WATCH_TIMER = null;
      completeCurrentPipAd();
    }
  }, 1000);
}


/*
============================================================
STOP AD WATCH TIMER
============================================================
*/

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
    fetch(`${getApiUrl()}?action=completeadwatch&userId=${userId}&campaignId=${campaignId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          showRewardPopup(json.data.rewardEarned || 0, campaignId);
        }
      })
      .catch(err => console.log("completeAdWatch error:", err));
  }

  CURRENT_WATCHING_CAMPAIGN = null;
  AD_WATCH_SECONDS = 0;
  PIP_QUEUE_INDEX++;

  setTimeout(() => {
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
  popup.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:30px;text-align:center;max-width:320px;width:90%;animation:scaleIn 0.3s;">
      <div style="font-size:50px;margin-bottom:10px;">🎉</div>
      <h2 style="color:var(--primary);margin:10px 0;">+${coins} Coins</h2>
      <p style="color:#666;">You earned reward coins!</p>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-top:15px;">
        Awesome!
      </button>
    </div>
  `;
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
  popup.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:30px;text-align:center;max-width:340px;width:90%;animation:scaleIn 0.3s;">
      <div style="font-size:40px;margin-bottom:10px;">🎁</div>
      <h2 style="color:var(--primary);margin:10px 0;">More Reward Ads Available</h2>
      <p style="color:#666;margin-bottom:15px;">Watch more ads and earn extra EkkaCoins!</p>
      <button onclick="document.getElementById('moreAdsPopup').remove();openPage('adcenter');" style="margin-bottom:10px;">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">visibility</i> Watch More Ads
      </button>
      <br>
      <button onclick="document.getElementById('moreAdsPopup').remove();closeAllPopups();" style="background:#666;">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;">home</i> Continue To Ekka1km
      </button>
    </div>
  `;
  document.body.appendChild(popup);
}


/*
============================================================
REMOVE PIP CONTAINER
============================================================
*/

function removePipContainer() {
  const pip = document.getElementById("pipAdContainer");
  if (pip) {
    pip.style.display = "none";
  }
}


/*
============================================================
CLOSE ALL POPUPS
============================================================
*/

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
  let url = `${getApiUrl()}?action=getadcenter&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`;
  if (userId) url += `&userId=${userId}`;
  if (AD_CENTER_TAB && AD_CENTER_TAB !== "All") url += `&category=${AD_CENTER_TAB}`;

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


/*
============================================================
RENDER AD CENTER
============================================================
*/

function renderAdCenter(ads) {
  const container = document.getElementById("adCenterList");
  if (!container) return;

  if (ads.length === 0) {
    container.innerHTML = "<div class='card'>No reward ads available.</div>";
    return;
  }

  // Calculate total earnable coins for "Watch All"
  let totalEarnable = 0;
  ads.forEach(ad => {
    if (ad.CanWatch !== false) {
      totalEarnable += Number(ad.RewardCoins || 0);
    }
  });

  let html = "";

  // Watch All button if multiple ads available
  if (ads.length > 1 && totalEarnable > 0) {
    html += `
      <button onclick="watchAllAds()" style="margin-bottom:15px;background:linear-gradient(135deg,var(--primary),#ff6f00);padding:12px;width:100%;">
        <i class="material-icons" style="font-size:20px;vertical-align:middle;">play_circle</i> Watch All — Earn ${totalEarnable} Coins
      </button>
    `;
  }

  ads.forEach(ad => {
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

    html += `
      <div class="card" style="margin-bottom:15px;">
        ${imageUrl && isValidImageUrl(imageUrl) ? `<img src="${imageUrl}" style="width:100%;border-radius:15px;margin-bottom:10px;max-height:200px;object-fit:cover;">` : ""}

        <h3 style="font-size:16px;">${title}</h3>
        <p style="font-size:13px;color:#666;">${desc}</p>

        <div style="display:flex;gap:5px;margin:8px 0;flex-wrap:wrap;">
          <span class="badge" style="background:var(--primary);color:#fff;">${adType}</span>
          ${campaignType ? `<span class="badge">${campaignType.replace("PROMOTE_", "")}</span>` : ""}
          ${ad.Featured === "Yes" ? `<span class="badge" style="background:#ff6f00;color:#fff;">⭐ Featured</span>` : ""}
        </div>

        <div style="background:#f5f5f5;border-radius:12px;padding:12px;margin:10px 0;">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-size:13px;font-weight:600;">⭐ ${totalReward} Coins</span>
            <span style="font-size:12px;color:#666;">${watchedSeconds}/${ad.Duration || 10}s</span>
          </div>

          <!-- Progress Bar -->
          <div style="background:#e0e0e0;border-radius:10px;height:8px;overflow:hidden;margin:5px 0;">
            <div id="progress_${campaignId}" style="background:var(--primary);height:100%;width:${progressPercent}%;border-radius:10px;transition:width 0.3s;"></div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;">
            <span>${progressPercent}% complete</span>
            <span>💰 ${remainingReward} coins remaining</span>
          </div>
        </div>

        ${canWatch ? `
          <button onclick="openAdWatchModal('${campaignId}')" style="width:100%;">
            <i class="material-icons" style="font-size:18px;vertical-align:middle;">${watchedSeconds > 0 ? 'play_circle' : 'play_arrow'}</i>
            ${watchedSeconds > 0 ? 'Continue Watching' : 'Watch & Earn'}
          </button>
        ` : `
          <button disabled style="width:100%;opacity:0.5;">
            <i class="material-icons" style="font-size:18px;vertical-align:middle;">check_circle</i> Completed
          </button>
        `}
      </div>
    `;
  });

  container.innerHTML = html;
}


/*
============================================================
RENDER AD CENTER TABS
============================================================
*/

function renderAdCenterTabs() {
  const tabsContainer = document.getElementById("adCenterTabs");
  if (!tabsContainer) return;

  const tabs = ["All", "Products", "Businesses", "Stores", "Properties", "Videos", "Nearby", "Featured"];

  tabsContainer.innerHTML = tabs.map(tab => `
    <button onclick="switchAdTab('${tab}')" style="margin:3px;font-size:12px;padding:6px 12px;${AD_CENTER_TAB === tab ? 'background:var(--primary);color:#fff;' : ''}">
      ${tab}
    </button>
  `).join("");
}


/*
============================================================
SWITCH AD TAB
============================================================
*/

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

  // Create modal
  const modal = document.createElement("div");
  modal.id = "adWatchModal";
  modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999999;";

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:25px;max-width:400px;width:90%;text-align:center;animation:scaleIn 0.3s;">
      <div id="adWatchContent">
        <div style="font-size:30px;margin-bottom:10px;">⏳</div>
        <h3 id="adWatchTitle">Loading...</h3>
        <p id="adWatchDesc" style="color:#666;margin:10px 0;"></p>

        <!-- Timer display -->
        <div style="font-size:40px;font-weight:700;color:var(--primary);margin:15px 0;" id="adWatchTimer">0s</div>

        <!-- Progress bar -->
        <div style="background:#e0e0e0;border-radius:10px;height:10px;overflow:hidden;margin:10px 0;">
          <div id="adWatchProgressBar" style="background:var(--primary);height:100%;width:0%;border-radius:10px;transition:width 0.3s;"></div>
        </div>

        <div style="display:flex;gap:10px;margin-top:15px;">
          <button id="adWatchSkipBtn" onclick="skipAdWatchModal()" style="flex:1;background:#666;">
            <i class="material-icons" style="font-size:18px;vertical-align:middle;">skip_next</i> Skip
          </button>
          <button id="adWatchCompleteBtn" onclick="completeAdWatchModal()" style="flex:1;display:none;background:green;">
            <i class="material-icons" style="font-size:18px;vertical-align:middle;">check</i> Claim Reward
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Start watch
  fetch(`${getApiUrl()}?action=startadwatch&userId=${userId}&campaignId=${campaignId}`)
    .then(r => r.json())
    .then(json => {
      if (!json.success) {
        document.getElementById("adWatchTitle").textContent = json.message || "Cannot watch this ad";
        document.getElementById("adWatchSkipBtn").textContent = "Close";
        return;
      }

      const data = json.data;
      document.getElementById("adWatchTitle").textContent = data.title || "Reward Ad";
      document.getElementById("adWatchDesc").textContent = data.description || "Watch to earn coins";

      const totalDuration = data.totalDuration || 10;
      const totalReward = data.totalReward || 0;
      let currentSeconds = data.watchedSeconds || 0;

      // Show image/video if available
      if (data.imageURL) {
        const img = document.createElement("img");
        img.src = data.imageURL;
        img.style.cssText = "width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin:10px 0;";
        document.getElementById("adWatchContent").insertBefore(img, document.getElementById("adWatchTimer"));
      }

      // Update timer
      function updateTimer() {
        currentSeconds++;
        if (currentSeconds > totalDuration) currentSeconds = totalDuration;

        document.getElementById("adWatchTimer").textContent = currentSeconds + "s";
        const pct = Math.min(100, Math.round((currentSeconds / totalDuration) * 100));
        document.getElementById("adWatchProgressBar").style.width = pct + "%";

        // Update progress every 2 seconds
        if (currentSeconds % 2 === 0) {
          fetch(`${getApiUrl()}?action=updateadprogress&userId=${userId}&campaignId=${campaignId}&watchedSeconds=${currentSeconds}`)
            .catch(err => console.log("update error:", err));
        }

        if (currentSeconds >= totalDuration) {
          clearInterval(AD_WATCH_MODAL_INTERVAL);
          AD_WATCH_MODAL_INTERVAL = null;
          document.getElementById("adWatchTimer").textContent = "✅ Complete!";
          document.getElementById("adWatchCompleteBtn").style.display = "block";
          document.getElementById("adWatchSkipBtn").style.display = "none";

          // Auto-claim
          completeAdWatchModal();
        }
      }

      AD_WATCH_MODAL_INTERVAL = setInterval(updateTimer, 1000);
    })
    .catch(err => {
      console.log("startAdWatch error:", err);
      document.getElementById("adWatchTitle").textContent = "Error starting ad";
      document.getElementById("adWatchSkipBtn").textContent = "Close";
    });
}


/*
============================================================
SKIP AD WATCH MODAL
============================================================
*/

function skipAdWatchModal() {
  if (AD_WATCH_MODAL_INTERVAL) {
    clearInterval(AD_WATCH_MODAL_INTERVAL);
    AD_WATCH_MODAL_INTERVAL = null;
  }

  const userId = getUserId();
  const currentSeconds = parseInt(document.getElementById("adWatchTimer").textContent) || 0;

  // Find campaign ID from modal
  const campaignId = document.querySelector("#adWatchModal [data-campaign-id]")?.dataset?.campaignId || CURRENT_WATCHING_CAMPAIGN?.CampaignID || "";

  if (userId && campaignId && currentSeconds > 0) {
    fetch(`${getApiUrl()}?action=skipadwatch&userId=${userId}&campaignId=${campaignId}&watchedSeconds=${currentSeconds}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.partialReward > 0) {
          showRewardPopup(json.data.partialReward, campaignId);
        }
      })
      .catch(err => console.log("skip error:", err));
  }

  closeAdWatchModal();
}


/*
============================================================
COMPLETE AD WATCH MODAL
============================================================
*/

async function completeAdWatchModal() {
  if (AD_WATCH_MODAL_INTERVAL) {
    clearInterval(AD_WATCH_MODAL_INTERVAL);
    AD_WATCH_MODAL_INTERVAL = null;
  }

  const userId = getUserId();
  const currentSeconds = parseInt(document.getElementById("adWatchTimer").textContent) || 0;
  const campaignId = document.querySelector("#adWatchModal [data-campaign-id]")?.dataset?.campaignId || CURRENT_WATCHING_CAMPAIGN?.CampaignID || "";

  if (userId && campaignId) {
    try {
      const response = await fetch(`${getApiUrl()}?action=completeadwatch&userId=${userId}&campaignId=${campaignId}`);
      const json = await response.json();
      if (json.success) {
        showRewardPopup(json.data.rewardEarned || 0, campaignId);
        loadAdCenter(); // Refresh list
      }
    } catch (err) {
      console.log("complete error:", err);
    }
  }

  closeAdWatchModal();
}


/*
============================================================
CLOSE AD WATCH MODAL
============================================================
*/

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

  let url = `${getApiUrl()}?action=getadcenter`;
  if (userId) url += `&userId=${userId}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    const ads = (json.data && json.data.data) || [];

    if (ads.length === 0) {
      alert("No ads available to watch.");
      return;
    }

    // Queue all watchable ads
    PIP_QUEUE = ads.filter(ad => ad.CanWatch !== false);
    PIP_QUEUE_INDEX = 0;

    if (PIP_QUEUE.length === 0) {
      alert("All ads completed!");
      return;
    }

    // Start first ad in full modal mode
    openAdWatchModal(PIP_QUEUE[0].CampaignID);

  } catch (err) {
    console.log("watchAllAds error:", err);
  }
}


/*
============================================================
OPEN PAGE WRAPPER (for adcenter page)
============================================================
*/

function openAdCenterPage() {
  renderAdCenterTabs();
  loadAdCenter();
}


/*
============================================================
INIT ON APP LOAD
============================================================
*/

(function initPipOnLoad() {
  // PIP queue will be loaded when app opens
  // Call loadPipQueue() from your app's onReady or pageLoad
  if (typeof addOnAppReady === "function") {
    addOnAppReady(function() {
      setTimeout(loadPipQueue, 2000); // Wait 2 seconds after app loads
    });
  }
})();


/*
============================================================
BACKWARD COMPATIBILITY (existing functions)
============================================================
*/

// Keep original loadPipAd for backward compatibility
async function loadPipAd() {
  try {
    const response = await fetch(
      `${getApiUrl()}?action=pipads&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const ads = (json.data && json.data.data) || [];
    if (ads.length === 0) return;
    CURRENT_PIP_AD = ads[0];
    showPipAd();
  } catch (err) {
    console.log(err);
  }
}

// Keep original showPipAd for backward compatibility
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

  pip.innerHTML = `
    <div style="padding:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>Ad</strong>
        <span onclick="closePipAd()" style="cursor:pointer;color:red;">✕</span>
      </div>
      ${CURRENT_PIP_AD.ImageURL && isValidImageUrl(CURRENT_PIP_AD.ImageURL) ? `<img src="${CURRENT_PIP_AD.ImageURL}" style="width:100%;border-radius:10px;">` : ""}
      <h4 style="margin-top:10px;">${CURRENT_PIP_AD.Title || ""}</h4>
      <button onclick="openPipAd()">Open</button>
    </div>
  `;
}

// Keep original openPipAd for backward compatibility
function openPipAd() {
  if (!CURRENT_PIP_AD) return;
  if (CURRENT_PIP_AD.ExternalURL) {
    window.open(CURRENT_PIP_AD.ExternalURL, "_blank");
  }
}

// Keep original closePipAd for backward compatibility
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
  style.textContent = `
    @keyframes scaleIn {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();