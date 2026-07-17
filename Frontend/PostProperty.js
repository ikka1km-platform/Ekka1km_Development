/*
============================================================
EKKA1KM FRONTEND
PostProperty.js
Phase 4.2 - Property Posting System
============================================================
*/

/*
============================================================
OPEN POST PROPERTY FORM
============================================================
*/

function openPostPropertyForm() {
  if (!requireLogin()) return;
  openPage("postProperty");
  clearPropertyForm();
}

/*
============================================================
CLEAR PROPERTY FORM
============================================================
*/

function clearPropertyForm() {
  document.getElementById("propType").value = "Apartment";
  document.getElementById("propPurpose").value = "Sell";
  document.getElementById("propTitle").value = "";
  document.getElementById("propDesc").value = "";
  document.getElementById("propPrice").value = "";
  document.getElementById("propBedrooms").value = "";
  document.getElementById("propBathrooms").value = "";
  document.getElementById("propArea").value = "";
  document.getElementById("propImages").value = "";
  document.getElementById("propAddress").value = "";
  document.getElementById("propCity").value = "";
  document.getElementById("propDistrict").value = "";
  document.getElementById("propState").value = "";
}

/*
============================================================
SUBMIT PROPERTY
============================================================
*/

function submitProperty() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var title = document.getElementById("propTitle").value.trim();
  var price = document.getElementById("propPrice").value.trim();

  if (!title || !price) {
    alert("Title and Price are required");
    return;
  }

  var formData = {
    userId: userId,
    title: title,
    description: document.getElementById("propDesc").value.trim(),
    category: document.getElementById("propType").value,
    price: price,
    address: document.getElementById("propAddress").value.trim(),
    city: document.getElementById("propCity").value.trim(),
    state: document.getElementById("propState").value.trim(),
    pincode: "",
    latitude: "",
    longitude: "",
    image: document.getElementById("propImages").value.trim(),
    status: "Pending"
  };

  var url = getApiUrl() + "?action=createproperty";

  var params = new URLSearchParams();
  Object.keys(formData).forEach(function(key) {
    if (formData[key]) params.append(key, formData[key]);
  });

  fetch(url + "&" + params.toString())
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Property posted successfully!");
        openPage("properties");
      } else {
        alert(res.message || "Failed to post property");
      }
    })
    .catch(function(err) {
      console.log("Post property error:", err);
      alert("Error posting property");
    });
}

/*
============================================================
UPDATE PROPERTY
============================================================
*/

function updatePropertyForm(propertyId) {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() + "?action=property&id=" + encodeURIComponent(propertyId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        var property = res.data;
        openPage("postProperty");
        
        document.getElementById("propType").value = property.Type || "Apartment";
        document.getElementById("propPurpose").value = property.Purpose || "Sell";
        document.getElementById("propTitle").value = property.Title || "";
        document.getElementById("propDesc").value = property.Description || "";
        document.getElementById("propPrice").value = property.Price || "";
        document.getElementById("propBedrooms").value = property.Bedrooms || "";
        document.getElementById("propBathrooms").value = property.Bathrooms || "";
        document.getElementById("propArea").value = property.Area || "";
        document.getElementById("propImages").value = property.Images || "";
        document.getElementById("propAddress").value = property.Address || "";
        document.getElementById("propCity").value = property.City || "";
        document.getElementById("propDistrict").value = property.District || "";
        document.getElementById("propState").value = property.State || "";

        // Store property ID for update
        document.getElementById("postProperty").setAttribute("data-property-id", propertyId);
      } else {
        alert("Property not found");
      }
    })
    .catch(function(err) {
      console.log("Load property error:", err);
    });
}

/*
============================================================
DELETE PROPERTY
============================================================
*/

function deletePropertyConfirm(propertyId) {
  if (!confirm("Are you sure you want to delete this property?")) {
    return;
  }

  var userId = getUserId();
  var url = getApiUrl() + "?action=deleteproperty&propertyId=" + encodeURIComponent(propertyId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Property deleted successfully");
        loadMyProperties();
      } else {
        alert(res.message || "Failed to delete property");
      }
    })
    .catch(function(err) {
      console.log("Delete property error:", err);
    });
}

/*
============================================================
LOAD MY PROPERTIES
============================================================
*/

function loadMyProperties() {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=properties&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyProperties(res.data.data || []);
      }
    })
    .catch(function(err) {
      console.log("My properties error:", err);
    });
}

/*
============================================================
RENDER MY PROPERTIES
============================================================
*/

function renderMyProperties(properties) {
  var container = document.getElementById("myPropertiesList");
  if (!container) return;

  if (properties.length === 0) {
    container.innerHTML = '<div class="dashboardEmpty">No properties yet</div>';
    return;
  }

  var html = "";
  properties.forEach(function(p) {
    var statusColor = p.Status === "Published" ? "#0f9d58" : p.Status === "Deleted" ? "#d32f2f" : "#888";
    html += '<div class="dashboardActivityCard">';
    html += '<div class="dashboardActivityItem">';
    html += '<div class="title">' + (p.Title || "Property") + '</div>';
    html += '<div class="meta">₹' + (p.Price || "0") + " | " + (p.Status || "") + "</div>";
    html += '<div class="meta" style="font-size:10px;color:#aaa;">' + (p.CreatedDate || "") + "</div>";
    html += '<button onclick="updatePropertyForm(\'' + p.PropertyID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Edit</button>';
    html += '<button class="btn-danger" onclick="deletePropertyConfirm(\'' + p.PropertyID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Delete</button>';
    html += "</div></div>";
  });

  container.innerHTML = html;
}