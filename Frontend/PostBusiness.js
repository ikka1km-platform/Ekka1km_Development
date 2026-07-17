/*
============================================================
EKKA1KM FRONTEND
PostBusiness.js
Phase 4.3 - Business Creation System
============================================================
*/

/*
============================================================
OPEN POST BUSINESS FORM
============================================================
*/

function openPostBusinessForm() {
  if (!requireLogin()) return;
  openPage("postBusiness");
  clearBusinessForm();
}

/*
============================================================
CLEAR BUSINESS FORM
============================================================
*/

function clearBusinessForm() {
  document.getElementById("bizName").value = "";
  document.getElementById("bizCategory").value = "";
  document.getElementById("bizDesc").value = "";
  document.getElementById("bizPhone").value = "";
  document.getElementById("bizWhatsapp").value = "";
  document.getElementById("bizEmail").value = "";
  document.getElementById("bizAddress").value = "";
  document.getElementById("bizCity").value = "";
  document.getElementById("bizState").value = "";
  document.getElementById("bizPincode").value = "";
  document.getElementById("bizOpen").value = "";
  document.getElementById("bizClose").value = "";
  document.getElementById("bizLogo").value = "";
  document.getElementById("bizCoverImage").value = "";
}

/*
============================================================
SUBMIT BUSINESS
============================================================
*/

function submitBusiness() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var name = document.getElementById("bizName").value.trim();

  if (!name) {
    alert("Business Name is required");
    return;
  }

  var formData = {
    userId: userId,
    title: name,
    category: document.getElementById("bizCategory").value.trim(),
    description: document.getElementById("bizDesc").value.trim(),
    phone: document.getElementById("bizPhone").value.trim(),
    whatsapp: document.getElementById("bizWhatsapp").value.trim(),
    email: document.getElementById("bizEmail").value.trim(),
    address: document.getElementById("bizAddress").value.trim(),
    city: document.getElementById("bizCity").value.trim(),
    state: document.getElementById("bizState").value.trim(),
    pincode: document.getElementById("bizPincode").value.trim(),
    latitude: "",
    longitude: "",
    logo: document.getElementById("bizLogo").value.trim(),
    coverImage: document.getElementById("bizCoverImage").value.trim(),
    status: "Pending"
  };

  var url = getApiUrl() + "?action=createbusiness";

  var params = new URLSearchParams();
  Object.keys(formData).forEach(function(key) {
    if (formData[key]) params.append(key, formData[key]);
  });

  fetch(url + "&" + params.toString())
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Business created successfully!");
        openPage("businesses");
      } else {
        alert(res.message || "Failed to create business");
      }
    })
    .catch(function(err) {
      console.log("Post business error:", err);
      alert("Error creating business");
    });
}

/*
============================================================
UPDATE BUSINESS
============================================================
*/

function updateBusinessForm(businessId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() + "?action=business&id=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        var business = res.data;
        openPage("postBusiness");
        
        document.getElementById("bizName").value = business.Title || "";
        document.getElementById("bizCategory").value = business.Category || "";
        document.getElementById("bizDesc").value = business.Description || "";
        document.getElementById("bizPhone").value = business.Phone || "";
        document.getElementById("bizWhatsapp").value = business.WhatsApp || "";
        document.getElementById("bizEmail").value = business.Email || "";
        document.getElementById("bizAddress").value = business.Address || "";
        document.getElementById("bizCity").value = business.City || "";
        document.getElementById("bizState").value = business.State || "";
        document.getElementById("bizPincode").value = business.Pincode || "";
        document.getElementById("bizOpen").value = business.OpeningTime || "";
        document.getElementById("bizClose").value = business.ClosingTime || "";
        document.getElementById("bizLogo").value = business.Logo || "";
        document.getElementById("bizCoverImage").value = business.CoverImage || "";

        // Store business ID for update
        document.getElementById("postBusiness").setAttribute("data-business-id", businessId);
      } else {
        alert("Business not found");
      }
    })
    .catch(function(err) {
      console.log("Load business error:", err);
    });
}

/*
============================================================
DELETE BUSINESS
============================================================
*/

function deleteBusinessConfirm(businessId) {
  if (!confirm("Are you sure you want to delete this business?")) {
    return;
  }

  var userId = getUserId();
  var url = getApiUrl() + "?action=deletebusiness&businessId=" + encodeURIComponent(businessId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Business deleted successfully");
        loadMyBusinesses();
      } else {
        alert(res.message || "Failed to delete business");
      }
    })
    .catch(function(err) {
      console.log("Delete business error:", err);
    });
}

/*
============================================================
LOAD MY BUSINESSES
============================================================
*/

function loadMyBusinesses() {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=businesses&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyBusinesses(res.data.data || []);
      }
    })
    .catch(function(err) {
      console.log("My businesses error:", err);
    });
}

/*
============================================================
RENDER MY BUSINESSES
============================================================
*/

function renderMyBusinesses(businesses) {
  var container = document.getElementById("myBusinessesList");
  if (!container) return;

  if (businesses.length === 0) {
    container.innerHTML = '<div class="dashboardEmpty">No businesses yet</div>';
    return;
  }

  var html = "";
  businesses.forEach(function(b) {
    var statusColor = b.Status === "Published" ? "#0f9d58" : b.Status === "Deleted" ? "#d32f2f" : "#888";
    html += '<div class="dashboardActivityCard">';
    html += '<div class="dashboardActivityItem">';
    html += '<div class="title">' + (b.Title || "Business") + '</div>';
    html += '<div class="meta">' + (b.Category || "") + " | " + (b.Status || "") + "</div>";
    html += '<div class="meta" style="font-size:10px;color:#aaa;">' + (b.CreatedDate || "") + "</div>";
    html += '<button onclick="updateBusinessForm(\'' + b.BusinessID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Edit</button>';
    html += '<button class="btn-danger" onclick="deleteBusinessConfirm(\'' + b.BusinessID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Delete</button>';
    html += "</div></div>";
  });

  container.innerHTML = html;
}