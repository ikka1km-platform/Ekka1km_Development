/*
============================================================
EKKA1KM FRONTEND
News.js
Stage 4HIJ - News Browsing & Detail Experience
V2.1
Preserves hero, breaking, standard cards, categories, share
============================================================
*/

let CURRENT_NEWS = null;
const NEWS_CATEGORIES = [
  "Breaking", "Politics", "Business", "Sports", "Technology",
  "Entertainment", "Local", "Crime", "Education", "Jobs",
  "Agriculture", "Lifestyle"
];


/*
============================================================
NAMESPACED HELPERS (Stage 4HIJ)
============================================================
*/

function newsSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}


/*
============================================================
TIME AGO HELPER (preserved existing name for backward compat)
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
LOAD NEWS WITH PROFESSIONAL CARDS — Stage 4HIJ
============================================================
*/

async function loadNews() {
  const container = document.getElementById("newsList");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">newspaper</i><p>Loading News...</p></div>';

  try {
    const response = await fetch(
      `${getApiUrl()}?action=news&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const allNews = json.data || [];

    if (allNews.length === 0) {
      container.innerHTML = '<div class="hij-empty"><i class="material-icons">newspaper</i><p>No News Found.</p></div>';
      if (typeof renderHomeNewsPreview === "function") {
        renderHomeNewsPreview(allNews);
      }
      return;
    }

    // Separate featured, breaking, and standard
    const featured = allNews.filter(n => (n.Featured || "").toLowerCase() === "yes").slice(0, 3);
    const breaking = allNews.filter(n => (n.Category || "").toLowerCase() === "breaking").slice(0, 2);
    const standard = allNews.filter(n =>
      (n.Featured || "").toLowerCase() !== "yes" &&
      (n.Category || "").toLowerCase() !== "breaking"
    );

    let html = "";

    // Category Filter Bar
    html += `
      <div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;margin-bottom:10px;white-space:nowrap;">
        <span class="badge" style="background:var(--primary);color:#fff;cursor:pointer;" onclick="loadNews()">All</span>
        ${NEWS_CATEGORIES.map(cat =>
          `<span class="badge" style="cursor:pointer;background:#e8f5e9;" onclick="loadNewsByCategory('${cat}')">${cat}</span>`
        ).join("")}
      </div>
    `;

    // Breaking News Bar
    if (breaking.length > 0) {
      html += `<div style="background:#ffebee;border-radius:12px;padding:12px;margin-bottom:12px;border-left:4px solid #d32f2f;">`;
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="background:#d32f2f;color:#fff;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;">BREAKING</span>
        <span style="font-size:11px;color:#666;">${timeAgo(breaking[0].CreatedDate)}</span>
      </div>`;
      breaking.forEach(item => {
        html += `<div style="cursor:pointer;padding:6px 0;border-bottom:1px solid #ffcdd2;" onclick='showNewsDetails(${JSON.stringify(item)})'>
          <strong style="font-size:14px;">${newsSafeRender(item.Title)}</strong>
        </div>`;
      });
      html += `</div>`;
    }

    // Hero News (Featured)
    if (featured.length > 0) {
      html += `<div class="heroNewsCard" style="position:relative;border-radius:16px;overflow:hidden;margin-bottom:15px;cursor:pointer;" onclick='showNewsDetails(${JSON.stringify(featured[0])})'>`;
      const hero = featured[0];
      html += `
        ${hero.Image
          ? `<img src="${hero.Image}" style="width:100%;height:200px;object-fit:cover;" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:200px;background:linear-gradient(135deg,var(--primary),#43a047);display:flex;align-items:center;justify-content:center;"><i class="material-icons" style="font-size:64px;color:#fff;">newspaper</i></div>`
        }
        <div style="position:absolute;bottom:0;left:0;right:0;padding:20px;background:linear-gradient(transparent,rgba(0,0,0,.8));">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <span class="badge" style="background:#ff9800;color:#fff;font-size:10px;">Featured</span>
            ${hero.Category ? `<span class="badge" style="background:#e0e0e0;font-size:10px;">${newsSafeRender(hero.Category)}</span>` : ""}
          </div>
          <h2 style="color:#fff;margin:0;font-size:18px;">${newsSafeRender(hero.Title)}</h2>
          <p style="color:rgba(255,255,255,.8);font-size:12px;margin-top:4px;">${timeAgo(hero.CreatedDate)}</p>
        </div>
      `;
      html += `</div>`;
    }

    // Standard News — Stage 4HIJ enhanced cards
    const displayNews = standard.length > 0 ? standard : allNews;
    html += '<div class="news-listing">';

    displayNews.forEach(item => {
      const hasImage = item.Image && item.Image.trim();
      const hasVideo = item.VideoURL && item.VideoURL.trim();
      const isBreaking = (item.Category || "").toLowerCase() === "breaking";
      const category = newsSafeRender(item.Category);
      const title = newsSafeRender(item.Title) || "";
      const desc = newsSafeRender(item.Description) || "";
      const city = newsSafeRender(item.City);
      const source = newsSafeRender(item.Source);
      const newsId = item.NewsID || item.id || "";

      html += `
        <div class="newsCard-hij" onclick='showNewsDetails(${JSON.stringify(item)})'>
          <div class="homePreviewCard-wishlist" data-interest-type="News" data-interest-id="${newsId}" onclick='event.stopPropagation(); toggleInterest(this, "${newsId}", "News")'>
            <i class="material-icons">favorite_border</i>
          </div>
          ${hasImage ? `
            <div class="newsCard-hij-img">
              <img src="${item.Image}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'newsCard-hij-img newsCard-hij-imgPlaceholder\\'><i class=\\'material-icons\\'>newspaper</i></div>'">
            </div>
          ` : hasVideo ? `
            <div class="newsCard-hij-img" style="position:relative;">
              <i class="material-icons" style="font-size:48px;color:var(--primary);">play_circle_filled</i>
            </div>
          ` : `
            <div class="newsCard-hij-img newsCard-hij-imgPlaceholder">
              <i class="material-icons">newspaper</i>
            </div>
          `}
          <div class="newsCard-hij-body">
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
              ${isBreaking ? `<span class="newsCard-hij-category breaking">BREAKING</span>` : ""}
              ${category && !isBreaking ? `<span class="newsCard-hij-category">${category}</span>` : ""}
              ${hasVideo ? `<span class="newsCard-hij-category" style="background:#e3f2fd;color:#1565c0;">📹 Video</span>` : ""}
            </div>
            <div class="newsCard-hij-title">${title}</div>
            ${desc ? `<div class="newsCard-hij-desc">${desc.substring(0, 120)}</div>` : ""}
            <div class="newsCard-hij-meta">
              <span>${timeAgo(item.CreatedDate)}</span>
              ${city ? `<span>· ${city}</span>` : ""}
              ${source ? `<span>· ${source}</span>` : ""}
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>'; // news-listing
    container.innerHTML = html;

    // Also render Home Local News preview from the same dataset
    if (typeof renderHomeNewsPreview === "function") {
      renderHomeNewsPreview(allNews);
    }
    // Sync wishlist hearts (list cards above + any home preview cards) to saved state
    if (typeof refreshInterestHearts === "function") refreshInterestHearts();
  } catch (err) {
    console.log(err);
    container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Unable to load news.</p></div>';
    const homeContainer = document.getElementById("homeLocalNewsContent");
    if (homeContainer) {
      homeContainer.innerHTML = '<div class="homeSection-empty">Unable to load news.</div>';
    }
  }
}


/*
HOME PREVIEW — LOCAL NEWS (Preserved)
*/

function renderHomeNewsPreview(news) {
  const container = document.getElementById("homeLocalNewsContent");
  if (!container) return;

  if (!news || news.length === 0) {
    container.innerHTML = '<div class="homeSection-empty">No local news found.</div>';
    return;
  }

  const preview = news.slice(0, 4);
  let html = '<div class="homePreviewGrid">';

  preview.forEach(item => {
    const hasImage = item.Image && item.Image.trim();
    const title = item.Title || "-";
    const timeAgoText = timeAgo(item.CreatedDate);
    const isBreaking = (item.Category || "").toLowerCase() === "breaking";

    html += `
      <div class="homePreviewCard" onclick='showNewsDetailsFromHome(${JSON.stringify(item).replace(/'/g, "\\'")})'>
        ${hasImage
          ? `<div class="homePreviewCard-img"><img src="${item.Image}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'homePreviewCard-img homePreviewCard-imgPlaceholder\\'><span class=\\'material-icons\\'>newspaper</span></div>'"></div>`
          : `<div class="homePreviewCard-img homePreviewCard-imgPlaceholder"><span class="material-icons">newspaper</span></div>`
        }
        <div class="homePreviewCard-wishlist" data-interest-type="News" data-interest-id="${item.NewsID || item.id || ""}" onclick='event.stopPropagation(); toggleInterest(this, "${item.NewsID || item.id || ""}", "News")'>
          <i class="material-icons">favorite_border</i>
        </div>
        <div class="homePreviewCard-body">
          <div class="homePreviewCard-title">${title}</div>
          <div class="homePreviewCard-meta">${timeAgoText}</div>
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
  if (typeof refreshInterestHearts === "function") refreshInterestHearts();
}

/*
HOME NEWS CARD CLICK — navigate to News page then show detail
*/

function showNewsDetailsFromHome(item) {
  // First navigate to the news page, then show detail
  openPage("news");
  // Use setTimeout to ensure the page is active before rendering detail
  setTimeout(() => {
    showNewsDetails(item);
  }, 50);
}


/*
NEWS DETAILS BY ID — open detail from a saved interest / deep link
Reuses ?action=article&id= and the existing showNewsDetails() renderer.
*/

function showNewsDetailsById(newsId) {
  if (!newsId) return;
  fetch(`${getApiUrl()}?action=article&id=${encodeURIComponent(newsId)}`)
    .then(r => r.json())
    .then(res => {
      if (res && res.success && res.data && typeof showNewsDetails === "function") {
        showNewsDetails(res.data);
      } else {
        alert("News article not found.");
      }
    })
    .catch(err => {
      console.log("News fetch error:", err);
      alert("Unable to load news details.");
    });
}


/*
LOAD NEWS BY CATEGORY
*/

async function loadNewsByCategory(category) {
  const container = document.getElementById("newsList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading " + category + " news...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=newsbycategory&category=${encodeURIComponent(category)}&limit=20`
    );
    const json = await response.json();
    const news = json.data || [];

    if (news.length === 0) {
      container.innerHTML = `<div class='card'>No ${category} news found. <button onclick="loadNews()" class="btn-gray">Back to All</button></div>`;
      return;
    }

    // Re-render using the same card style
    let html = `<button onclick="loadNews()" style="margin-bottom:10px;font-size:12px;">← All News</button>`;
    html += `<div style="font-size:16px;font-weight:600;margin-bottom:12px;">${category} News</div>`;

    news.forEach(item => {
      const hasImage = item.Image && item.Image.trim();
      const newsId = item.NewsID || item.id || "";
      html += `
        <div class="newsCard-hij" onclick='showNewsDetails(${JSON.stringify(item)})'>
          <div class="homePreviewCard-wishlist" data-interest-type="News" data-interest-id="${newsId}" onclick='event.stopPropagation(); toggleInterest(this, "${newsId}", "News")'>
            <i class="material-icons">favorite_border</i>
          </div>
          ${hasImage ? `
            <div class="newsCard-hij-img">
              <img src="${item.Image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
            </div>
          ` : `
            <div class="newsCard-hij-img newsCard-hij-imgPlaceholder">
              <i class="material-icons">newspaper</i>
            </div>
          `}
          <div class="newsCard-hij-body">
            <div class="newsCard-hij-title">${item.Title || ""}</div>
            <div class="newsCard-hij-desc">${(item.Description || "").substring(0, 80)}</div>
            <div class="newsCard-hij-meta"><span>${timeAgo(item.CreatedDate)}</span></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (typeof refreshInterestHearts === "function") refreshInterestHearts();
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load category news.</div>";
  }
}


/*
NEWS DETAILS - Full Article Page
*/

function showNewsDetails(item) {
  CURRENT_NEWS = item;

  const container = document.getElementById("newsList");
  if (!container) return;

  // Track view
  const userId = getUserId() || "";
  const trackUrl = `${getApiUrl()}?action=trackevent&eventType=NewsView&userId=${encodeURIComponent(userId)}&entityType=News&entityId=${encodeURIComponent(item.NewsID || item.id)}`;
  fetch(trackUrl).catch(() => {});

  const isOwner = userId && (String(item.UserID) === String(userId) || String(item.OwnerUserID) === String(userId));

  const hasImage = item.Image && item.Image.trim();
  const hasVideo = item.VideoURL && item.VideoURL.trim();
  const title = newsSafeRender(item.Title) || "";
  const desc = newsSafeRender(item.Description) || "";
  const category = newsSafeRender(item.Category);
  const author = newsSafeRender(item.Author);
  const city = newsSafeRender(item.City);
  const state = newsSafeRender(item.State);
  const source = newsSafeRender(item.Source);

  let html = `
    <button class="hij-backBtn" onclick="goBack()"><i class="material-icons">arrow_back</i> Back to News</button>

    <div class="card" style="padding:0;overflow:hidden;">
      ${hasImage ? `
        <div style="position:relative;">
          <img src="${item.Image}" style="width:100%;max-height:300px;object-fit:cover;" onerror="this.style.display='none'">
          ${item.Featured === "Yes" ? `<span class="badge" style="position:absolute;top:10px;left:10px;background:#ff9800;color:#fff;">Featured</span>` : ""}
        </div>
      ` : ""}

      ${hasVideo ? `
        <div style="padding:12px;">
          <video controls style="width:100%;border-radius:12px;max-height:250px;">
            <source src="${item.VideoURL}" type="video/mp4">
          </video>
        </div>
      ` : ""}

      <div style="padding:16px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
          ${category ? `<span class="badge" style="background:var(--primary);color:#fff;">${category}</span>` : ""}
          ${item.Featured === "Yes" ? `<span class="badge" style="background:#ff9800;color:#fff;">Featured</span>` : ""}
          ${hasVideo ? `<span class="badge" style="background:#e3f2fd;">📹 Video</span>` : ""}
        </div>

        <h1 style="font-size:22px;margin:0 0 8px;line-height:1.3;">${title}</h1>

        <div style="display:flex;gap:12px;font-size:12px;color:#888;margin-bottom:15px;flex-wrap:wrap;">
          ${author ? `<span>✍️ ${author}</span>` : ""}
          <span>🕐 ${timeAgo(item.CreatedDate)}</span>
          ${city ? `<span>📍 ${city}${state ? ", " + state : ""}</span>` : ""}
          ${source ? `<span>📰 ${source}</span>` : ""}
        </div>

        <div style="font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">
          ${desc}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="card">
      ${isOwner ? `
        <div style="padding:12px;background:#fff3e0;border:1px solid #ffe0b2;border-radius:10px;color:#e65100;text-align:center;font-weight:600;font-size:14px;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">info</i> You are the author of this news.
        </div>
      ` : `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="sendNewsInterest()" style="flex:1;background:#d32f2f;color:#fff;">
            <i class="material-icons" style="font-size:16px;vertical-align:middle;">favorite</i> I'm Interested
          </button>
        </div>
      `}
    </div>

    <!-- Share Buttons -->
    <div class="card">
      <h3>Share</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="shareNewsWhatsApp()" style="flex:1;background:#25D366;">
          <i class="material-icons" style="font-size:16px;vertical-align:middle;">chat</i> WhatsApp
        </button>
        <button onclick="shareNewsFacebook()" style="flex:1;background:#1877F2;">
          <i class="material-icons" style="font-size:16px;vertical-align:middle;">thumb_up</i> Facebook
        </button>
        <button onclick="shareNewsTwitter()" style="flex:1;background:#000;">
          <i class="material-icons" style="font-size:16px;vertical-align:middle;">alternate_email</i> X/Twitter
        </button>
        <button onclick="shareNewsCopyLink()" style="flex:1;background:#666;">
          <i class="material-icons" style="font-size:16px;vertical-align:middle;">link</i> Copy Link
        </button>
        <button onclick="shareNewsNative()" style="flex:1;background:var(--primary);">
          <i class="material-icons" style="font-size:16px;vertical-align:middle;">share</i> Share
        </button>
      </div>
    </div>

    <!-- Related News -->
    <div id="relatedNewsSection">
      <div class="sectionTitle">Related News</div>
      <div id="relatedNewsList"><div class="card">Loading related news...</div></div>
    </div>

    <button onclick="goBack()" class="btn-gray">
      ← Back to News
    </button>
  `;

  container.innerHTML = html;
  enterDetailView("news");

  // Load related news
  loadRelatedNews(item.NewsID || item.id);
}


/*
LOAD RELATED NEWS (Preserved)
*/

async function loadRelatedNews(newsId) {
  const container = document.getElementById("relatedNewsList");
  if (!container) return;

  try {
    const response = await fetch(
      `${getApiUrl()}?action=relatednews&id=${encodeURIComponent(newsId)}&limit=5`
    );
    const json = await response.json();
    const related = json.data || [];

    if (related.length === 0) {
      container.innerHTML = "<div class='card'>No related news.</div>";
      return;
    }

    let html = "";
    related.forEach(item => {
      html += `
        <div style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #eee;cursor:pointer;" onclick='showNewsDetails(${JSON.stringify(item)})'>
          ${item.Image ? `<img src="${item.Image}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">` : ""}
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:500;">${newsSafeRender(item.Title) || ""}</div>
            <div style="font-size:10px;color:#888;margin-top:2px;">${timeAgo(item.CreatedDate)}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load related news.</div>";
  }
}


/*
SHARE SYSTEM (Preserved)
*/

function getShareText() {
  if (!CURRENT_NEWS) return "";
  return `${CURRENT_NEWS.Title || ""}\n\n${(CURRENT_NEWS.Description || "").substring(0, 100)}...\n\nShared from Ekka1km`;
}

function shareNewsWhatsApp() {
  const text = encodeURIComponent(getShareText());
  window.open(`https://wa.me/?text=${text}`, "_blank");
  trackShare();
}

function shareNewsFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  trackShare();
}

function shareNewsTwitter() {
  const text = encodeURIComponent((CURRENT_NEWS.Title || "") + " - Shared from Ekka1km");
  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  trackShare();
}

function shareNewsCopyLink() {
  const text = getShareText();
  navigator.clipboard.writeText(text).then(() => {
    alert("News copied to clipboard!");
  }).catch(() => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("News copied to clipboard!");
  });
  trackShare();
}

function shareNewsNative() {
  if (navigator.share) {
    navigator.share({
      title: CURRENT_NEWS.Title || "",
      text: getShareText()
    });
    trackShare();
  } else {
    shareNewsCopyLink();
  }
}

function trackShare() {
  if (!CURRENT_NEWS) return;
  const userId = getUserId() || "";
  const newsId = CURRENT_NEWS.NewsID || CURRENT_NEWS.id || "";
  fetch(`${getApiUrl()}?action=trackevent&eventType=Share&userId=${encodeURIComponent(userId)}&entityType=News&entityId=${encodeURIComponent(newsId)}`).catch(() => {});
}

/*
INTEREST TOGGLE (Shared across home preview cards)
*/

function toggleInterest(element, itemId, targetType) {
  if (!element) return;

  const userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  const isActive = element.classList.contains("active");
  const icon = element.querySelector("i");

  // Optimistic UI update
  if (isActive) {
    element.classList.remove("active");
    if (icon) icon.textContent = "favorite_border";
  } else {
    element.classList.add("active");
    if (icon) icon.textContent = "favorite";
  }

  // Call backend
  const action = isActive ? "removeinterest" : "markinterested";
  const url = `${getApiUrl()}?action=${action}&userId=${encodeURIComponent(userId)}&targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(itemId)}`;

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        // Sync client cache + all visible hearts to the new saved state
        if (typeof invalidateUserInterestCache === "function") invalidateUserInterestCache();
        if (typeof refreshInterestHearts === "function") refreshInterestHearts();
      } else {
        // Revert on failure
        if (isActive) {
          element.classList.add("active");
          if (icon) icon.textContent = "favorite";
        } else {
          element.classList.remove("active");
          if (icon) icon.textContent = "favorite_border";
        }
        alert(res.message || "Failed to update interest");
      }
    })
    .catch(function(err) {
      console.log("Interest error:", err);
      // Revert on error
      if (isActive) {
        element.classList.add("active");
        if (icon) icon.textContent = "favorite";
      } else {
        element.classList.remove("active");
        if (icon) icon.textContent = "favorite_border";
      }
      alert("Error updating interest");
    });
}


/*
============================================================
INTEREST (Unified)
============================================================
*/

async function sendNewsInterest() {
  if (!requireLogin()) return;
  if (!CURRENT_NEWS) return;

  const userId = getUserId();
  const authorId = CURRENT_NEWS.UserID || CURRENT_NEWS.OwnerUserID || "";
  if (userId && authorId && String(userId) === String(authorId)) {
    alert("You cannot interact with your own news.");
    return;
  }

  const newsId = CURRENT_NEWS.NewsID || CURRENT_NEWS.id || "";

  try {
    const url = `${getApiUrl()}?action=markinterested&userId=${encodeURIComponent(userId)}&targetType=News&targetId=${encodeURIComponent(newsId)}`;
    const res = await fetch(url).then(r => r.json());
    if (res && res.success) {
      alert("Interest request sent to news author.");
    } else {
      alert(res.message || "Failed to send interest");
    }
  } catch (err) {
    alert("Error sending interest");
  }
}
