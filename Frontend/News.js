/*
============================================================
EKKA1KM FRONTEND
News.js
V2.0 - Professional News System
Hero, Breaking, Standard Cards, Categories, Local, Share
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
LOAD NEWS WITH PROFESSIONAL CARDS
============================================================
*/

async function loadNews() {
  const container = document.getElementById("newsList");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading News...</div>";

  try {
    const response = await fetch(
      `${getApiUrl()}?action=news&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
    );
    const json = await response.json();
    const allNews = json.data || [];

    if (allNews.length === 0) {
      container.innerHTML = "<div class='card'>No News Found.</div>";
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
          <strong style="font-size:14px;">${item.Title || ""}</strong>
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
            ${hero.Category ? `<span class="badge" style="background:#e0e0e0;font-size:10px;">${hero.Category}</span>` : ""}
          </div>
          <h2 style="color:#fff;margin:0;font-size:18px;">${hero.Title || ""}</h2>
          <p style="color:rgba(255,255,255,.8);font-size:12px;margin-top:4px;">${timeAgo(hero.CreatedDate)}</p>
        </div>
      `;
      html += `</div>`;
    }

    // Standard News Cards
    const displayNews = standard.length > 0 ? standard : allNews;
    displayNews.forEach(item => {
      const hasImage = item.Image && item.Image.trim();
      const hasVideo = item.VideoURL && item.VideoURL.trim();
      const isBreaking = (item.Category || "").toLowerCase() === "breaking";

      html += `
        <div class="newsCard" style="display:flex;gap:12px;margin-bottom:12px;padding:12px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;" onclick='showNewsDetails(${JSON.stringify(item)})'>
          ${hasImage ? `
            <div style="width:100px;min-width:100px;height:100px;border-radius:10px;overflow:hidden;">
              <img src="${item.Image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
            </div>
          ` : hasVideo ? `
            <div style="width:100px;min-width:100px;height:100px;border-radius:10px;overflow:hidden;background:#e8f5e9;display:flex;align-items:center;justify-content:center;position:relative;">
              <i class="material-icons" style="font-size:36px;color:var(--primary);">play_circle_filled</i>
            </div>
          ` : ""}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
              ${isBreaking ? `<span class="badge" style="background:#d32f2f;color:#fff;font-size:9px;">BREAKING</span>` : ""}
              ${item.Category ? `<span class="badge" style="background:#e8f5e9;font-size:9px;">${item.Category}</span>` : ""}
              ${hasVideo ? `<span class="badge" style="background:#e3f2fd;font-size:9px;">📹 Video</span>` : ""}
            </div>
            <h3 style="font-size:14px;margin:0 0 4px;line-height:1.3;">${item.Title || ""}</h3>
            <p style="font-size:12px;color:#666;margin:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
              ${(item.Description || "").substring(0, 120)}
            </p>
            <div style="font-size:10px;color:#999;margin-top:6px;">
              ${timeAgo(item.CreatedDate)}
              ${item.City ? ` · ${item.City}` : ""}
              ${item.Source ? ` · ${item.Source}` : ""}
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load news.</div>";
  }
}


/*
============================================================
LOAD NEWS BY CATEGORY
============================================================
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
      html += `
        <div class="newsCard" style="display:flex;gap:12px;margin-bottom:12px;padding:12px;background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);cursor:pointer;" onclick='showNewsDetails(${JSON.stringify(item)})'>
          ${hasImage ? `
            <div style="width:80px;min-width:80px;height:80px;border-radius:8px;overflow:hidden;">
              <img src="${item.Image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
            </div>
          ` : ""}
          <div style="flex:1;min-width:0;">
            <h4 style="font-size:13px;margin:0 0 4px;">${item.Title || ""}</h4>
            <p style="font-size:11px;color:#666;margin:0;">${(item.Description || "").substring(0, 80)}</p>
            <div style="font-size:10px;color:#999;margin-top:4px;">${timeAgo(item.CreatedDate)}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.log(err);
    container.innerHTML = "<div class='card'>Unable to load category news.</div>";
  }
}


/*
============================================================
NEWS DETAILS - Full Article Page
============================================================
*/

function showNewsDetails(item) {
  CURRENT_NEWS = item;

  const container = document.getElementById("newsList");
  if (!container) return;

  // Track view
  const userId = getUserId() || "";
  const trackUrl = `${getApiUrl()}?action=trackevent&eventType=NewsView&userId=${encodeURIComponent(userId)}&entityType=News&entityId=${encodeURIComponent(item.NewsID || item.id)}`;
  fetch(trackUrl).catch(() => {});

  const hasImage = item.Image && item.Image.trim();
  const hasVideo = item.VideoURL && item.VideoURL.trim();

  let html = `
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
          ${item.Category ? `<span class="badge" style="background:var(--primary);color:#fff;">${item.Category}</span>` : ""}
          ${item.Featured === "Yes" ? `<span class="badge" style="background:#ff9800;color:#fff;">Featured</span>` : ""}
          ${hasVideo ? `<span class="badge" style="background:#e3f2fd;">📹 Video</span>` : ""}
        </div>

        <h1 style="font-size:22px;margin:0 0 8px;line-height:1.3;">${item.Title || ""}</h1>

        <div style="display:flex;gap:12px;font-size:12px;color:#888;margin-bottom:15px;flex-wrap:wrap;">
          ${item.Author ? `<span>✍️ ${item.Author}</span>` : ""}
          <span>🕐 ${timeAgo(item.CreatedDate)}</span>
          ${item.City ? `<span>📍 ${item.City}${item.State ? ", " + item.State : ""}</span>` : ""}
          ${item.Source ? `<span>📰 ${item.Source}</span>` : ""}
        </div>

        <div style="font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">
          ${item.Description || ""}
        </div>
      </div>
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

    <button onclick="loadNews()" class="btn-gray">
      ← Back to News
    </button>
  `;

  container.innerHTML = html;
  openPage("news");

  // Load related news
  loadRelatedNews(item.NewsID || item.id);
}


/*
============================================================
LOAD RELATED NEWS
============================================================
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
            <div style="font-size:13px;font-weight:500;">${item.Title || ""}</div>
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
============================================================
SHARE SYSTEM
============================================================
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