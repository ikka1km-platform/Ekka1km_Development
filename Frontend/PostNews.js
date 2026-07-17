/*
============================================================
EKKA1KM FRONTEND
PostNews.js
Phase 4.4 - News Posting System
============================================================
*/

/*
============================================================
OPEN POST NEWS FORM
============================================================
*/

function openPostNewsForm() {
  if (!requireLogin()) return;
  openPage("postNews");
  clearNewsForm();
}

/*
============================================================
CLEAR NEWS FORM
============================================================
*/

function clearNewsForm() {
  document.getElementById("newsTitle").value = "";
  document.getElementById("newsContent").value = "";
  document.getElementById("newsCategory").value = "";
  document.getElementById("newsSource").value = "";
  document.getElementById("newsAuthor").value = "";
  document.getElementById("newsCity").value = "";
  document.getElementById("newsState").value = "";
}

/*
============================================================
SUBMIT NEWS
============================================================
*/

function submitNews() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var title = document.getElementById("newsTitle").value.trim();
  var content = document.getElementById("newsContent").value.trim();

  if (!title || !content) {
    alert("Title and Content are required");
    return;
  }

  var formData = {
    userId: userId,
    title: title,
    description: content,
    category: document.getElementById("newsCategory").value.trim(),
    source: document.getElementById("newsSource").value.trim(),
    author: document.getElementById("newsAuthor").value.trim(),
    city: document.getElementById("newsCity").value.trim(),
    state: document.getElementById("newsState").value.trim(),
    status: "Pending"
  };

  var url = getApiUrl() + "?action=createnews";

  var params = new URLSearchParams();
  Object.keys(formData).forEach(function(key) {
    if (formData[key]) params.append(key, formData[key]);
  });

  fetch(url + "&" + params.toString())
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("News posted successfully!");
        openPage("news");
      } else {
        alert(res.message || "Failed to post news");
      }
    })
    .catch(function(err) {
      console.log("Post news error:", err);
      alert("Error posting news");
    });
}

/*
============================================================
UPDATE NEWS
============================================================
*/

function updateNewsForm(newsId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() + "?action=article&id=" + encodeURIComponent(newsId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        var news = res.data;
        openPage("postNews");
        
        document.getElementById("newsTitle").value = news.Title || "";
        document.getElementById("newsContent").value = news.Description || "";
        document.getElementById("newsCategory").value = news.Category || "";
        document.getElementById("newsSource").value = news.Source || "";
        document.getElementById("newsAuthor").value = news.Author || "";
        document.getElementById("newsCity").value = news.City || "";
        document.getElementById("newsState").value = news.State || "";

        // Store news ID for update
        document.getElementById("postNews").setAttribute("data-news-id", newsId);
      } else {
        alert("News not found");
      }
    })
    .catch(function(err) {
      console.log("Load news error:", err);
    });
}

/*
============================================================
DELETE NEWS
============================================================
*/

function deleteNewsConfirm(newsId) {
  if (!confirm("Are you sure you want to delete this news?")) {
    return;
  }

  var userId = getUserId();
  var url = getApiUrl() + "?action=deletenews&newsId=" + encodeURIComponent(newsId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("News deleted successfully");
        loadMyNews();
      } else {
        alert(res.message || "Failed to delete news");
      }
    })
    .catch(function(err) {
      console.log("Delete news error:", err);
    });
}

/*
============================================================
LOAD MY NEWS
============================================================
*/

function loadMyNews() {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=news&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyNews(res.data.data || []);
      }
    })
    .catch(function(err) {
      console.log("My news error:", err);
    });
}

/*
============================================================
RENDER MY NEWS
============================================================
*/

function renderMyNews(news) {
  var container = document.getElementById("myNewsList");
  if (!container) return;

  if (news.length === 0) {
    container.innerHTML = '<div class="dashboardEmpty">No news yet</div>';
    return;
  }

  var html = "";
  news.forEach(function(n) {
    var statusColor = n.Status === "Published" ? "#0f9d58" : n.Status === "Deleted" ? "#d32f2f" : "#888";
    html += '<div class="dashboardActivityCard">';
    html += '<div class="dashboardActivityItem">';
    html += '<div class="title">' + (n.Title || "News") + '</div>';
    html += '<div class="meta">' + (n.Category || "") + " | " + (n.Status || "") + "</div>";
    html += '<div class="meta" style="font-size:10px;color:#aaa;">' + (n.CreatedDate || "") + "</div>";
    html += '<button onclick="updateNewsForm(\'' + n.NewsID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Edit</button>';
    html += '<button class="btn-danger" onclick="deleteNewsConfirm(\'' + n.NewsID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Delete</button>';
    html += "</div></div>";
  });

  container.innerHTML = html;
}