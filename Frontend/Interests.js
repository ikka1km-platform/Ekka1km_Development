/*
============================================================
EKKA1KM FRONTEND
Interests.js
Phase 3.6 - Interest System
============================================================
*/

/*
============================================================
LOAD MY INTERESTS
============================================================
*/

function loadMyInterests() {
  var userId = getUserId();
  if (!userId) {
    document.getElementById("interestsList").innerHTML =
      '<div class="card" style="text-align:center;padding:30px;">' +
      "<p>Please login to see your interests</p></div>";
    return;
  }

  var container =
    document.getElementById(
      "interestsList"
    );

  container.innerHTML =
    '<div class="card" style="text-align:center;padding:30px;">' +
    "<p>Loading interests...</p></div>";

  var url =
    getApiUrl() +
    "?action=getmyinterests" +
    "&userId=" +
    encodeURIComponent(userId);

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success &&
        res.data
      ) {
        renderMyInterests(
          res.data
        );
      } else {
        container.innerHTML =
          '<div class="card" style="text-align:center;padding:30px;">' +
          "<p>No interests found</p></div>";
      }
    })
    .catch(function(err) {
      console.log(
        "Interests error:",
        err
      );
      container.innerHTML =
        '<div class="card" style="text-align:center;padding:30px;">' +
        "<p>Error loading interests</p></div>";
    });
}


/*
============================================================
RENDER MY INTERESTS
============================================================
*/

function renderMyInterests(data) {
  var container =
    document.getElementById(
      "interestsList"
    );

  if (!container) return;

  var interests =
    data.data || [];

  if (interests.length === 0) {
    container.innerHTML =
      '<div class="card" style="text-align:center;padding:30px;">' +
      "<p>You haven't marked any interests yet.</p>" +
      '<p style="font-size:13px;color:#888;margin-top:8px;">Browse products and properties to mark them as interested.</p>' +
      "</div>";
    return;
  }

  var html = "";

  // Products Section
  var products = interests.filter(
    function(i) {
      return (
        i.targetType ===
        "Product"
      );
    }
  );

  if (products.length > 0) {
    html +=
      '<div class="dashboardSection"><h3>Interested Products (' +
      products.length +
      ")</h3>";
    products.forEach(
      function(i) {
        var target =
          i.targetData || {};
        html +=
          '<div class="dashboardActivityCard">';
        html +=
          '<div class="dashboardActivityItem">';
        html +=
          '<div class="title">' +
          (target.Title ||
            "Product") +
          "</div>";
        html +=
          '<div class="meta">₹' +
          (target.Price ||
            "0") +
          " | " +
          (target.Status ||
            "") +
          "</div>";
        html +=
          '<div class="meta" style="font-size:10px;color:#aaa;">' +
          (i.date || "") +
          "</div>";
        html +=
          '<button class="btn-gray" onclick="removeInterest(\'' +
          i.targetType +
          "','" +
          i.targetId +
          '\')" style="margin-top:8px;font-size:12px;padding:8px;">Remove Interest</button>';
        html +=
          "</div></div>";
      }
    );
    html += "</div>";
  }

  // Properties Section
  var properties =
    interests.filter(
      function(i) {
        return (
          i.targetType ===
          "Property"
        );
      }
    );

  if (properties.length > 0) {
    html +=
      '<div class="dashboardSection"><h3>Interested Properties (' +
      properties.length +
      ")</h3>";
    properties.forEach(
      function(i) {
        var target =
          i.targetData || {};
        html +=
          '<div class="dashboardActivityCard">';
        html +=
          '<div class="dashboardActivityItem">';
        html +=
          '<div class="title">' +
          (target.Title ||
            "Property") +
          "</div>";
        html +=
          '<div class="meta">₹' +
          (target.Price ||
            "0") +
          " | " +
          (target.Category ||
            "") +
          "</div>";
        html +=
          '<div class="meta" style="font-size:10px;color:#aaa;">' +
          (i.date || "") +
          "</div>";
        html +=
          '<button class="btn-gray" onclick="removeInterest(\'' +
          i.targetType +
          "','" +
          i.targetId +
          '\')" style="margin-top:8px;font-size:12px;padding:8px;">Remove Interest</button>';
        html +=
          "</div></div>";
      }
    );
    html += "</div>";
  }

  container.innerHTML = html;
}


/*
============================================================
MARK INTERESTED
============================================================
*/

function markInterested(
  targetType,
  targetId
) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url =
    getApiUrl() +
    "?action=markinterested" +
    "&userId=" +
    encodeURIComponent(userId) +
    "&targetType=" +
    encodeURIComponent(
      targetType
    ) +
    "&targetId=" +
    encodeURIComponent(targetId);

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        alert(
          "Interest marked successfully!"
        );
      } else {
        alert(
          res.message ||
            "Failed to mark interest"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Mark interest error:",
        err
      );
    });
}


/*
============================================================
REMOVE INTEREST
============================================================
*/

function removeInterest(
  targetType,
  targetId
) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url =
    getApiUrl() +
    "?action=removeinterest" +
    "&userId=" +
    encodeURIComponent(userId) +
    "&targetType=" +
    encodeURIComponent(
      targetType
    ) +
    "&targetId=" +
    encodeURIComponent(targetId);

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        loadMyInterests();
      } else {
        alert(
          res.message ||
            "Failed to remove interest"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Remove interest error:",
        err
      );
    });
}