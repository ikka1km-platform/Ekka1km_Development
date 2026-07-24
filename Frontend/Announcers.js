/*
============================================================
EKKA1KM FRONTEND
Announcers.js
V2.0 - Official Verified Announcer Application & Dashboard
============================================================
*/

function openAnnouncerPanel() {
  if (!requireLogin()) return;
  var userId = getUserId();
  if (!userId) return;
  openPage("announcerPanel");
  loadAnnouncerStatus(userId);
}

async function loadAnnouncerStatus(userId) {
  var container = document.getElementById("announcerContent");
  if (!container) return;
  container.innerHTML = "<div class='card'>Loading...</div>";
  try {
    var response = await fetch(getApiUrl() + "?action=myannouncerstatus&userId=" + encodeURIComponent(userId));
    var json = await response.json();
    var announcers = json.data || [];
    var activeAnnouncer = null;
    for (var i = 0; i < announcers.length; i++) {
      if (String(announcers[i].Status || "").toLowerCase() === "active") activeAnnouncer = announcers[i];
    }
    var html = "";
    if (announcers.length === 0) {
      html = renderNoAnnouncer();
    } else {
      for (var i = 0; i < announcers.length; i++) {
        html += renderAnnouncerCard(announcers[i]);
      }
      if (activeAnnouncer) {
        html += "<div style='height:16px'></div>";
        html += await renderAnnouncerDashboard(activeAnnouncer, userId);
      }
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = "<div class='card'>Error loading.</div>";
  }
}

function renderNoAnnouncer() {
  return '<div class="card" style="padding:20px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">📢</div><h3 style="margin:0 0 8px;">Become an Official Announcer</h3><p style="font-size:13px;color:#666;margin:0 0 16px;">Represent your department, municipality, or authority on Ekka1km.</p><button class="btn-primary" onclick="showAnnouncerApplicationForm()">Apply Now</button></div>';
}

function renderAnnouncerCard(announcer) {
  var status = String(announcer.Status || "Pending").toLowerCase();
  var statusColor = "#ff9800";
  var statusLabel = "Verification Pending";
  if (status === "active") { statusColor = "#4caf50"; statusLabel = "Active"; }
  else if (status === "suspended") { statusColor = "#ff9800"; statusLabel = "Suspended"; }
  else if (status === "revoked") { statusColor = "#f44336"; statusLabel = "Revoked"; }
  
  var allowedRadii = getAllowedRadiusDisplay(announcer.MaxRadius);
  
  var html = '<div class="card" style="padding:16px;margin-bottom:12px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
  html += '<div style="font-size:14px;font-weight:600;">' + (announcer.DepartmentName || "Announcer") + '</div>';
  html += '<div style="font-size:12px;padding:3px 10px;border-radius:12px;background:' + statusColor + '20;color:' + statusColor + ';font-weight:600;">' + statusLabel + '</div>';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#555;">';
  html += '<div><strong>Announcer ID:</strong> ' + (announcer.AnnouncerID || "") + '</div>';
  html += '<div><strong>Designation:</strong> ' + (announcer.Designation || "N/A") + '</div>';
  html += '<div><strong>Authority Type:</strong> ' + (announcer.AuthorityType || "N/A") + '</div>';
  html += '<div><strong>Location:</strong> ' + (announcer.City || "") + (announcer.State ? ", " + announcer.State : "") + '</div>';
  html += '<div><strong>Max Radius:</strong> ' + (announcer.MaxRadius || "N/A") + '</div>';
  html += '<div><strong>Allowed Radii:</strong> ' + allowedRadii + '</div>';
  html += '<div><strong>Applied:</strong> ' + formatDate(announcer.RequestedDate) + '</div>';
  if (announcer.VerifiedDate) html += '<div><strong>Verified:</strong> ' + formatDate(announcer.VerifiedDate) + '</div>';
  html += '</div>';
  
  if (status === "pending") {
    html += '<div style="margin-top:12px;padding:10px;background:#fff3e0;border-radius:8px;font-size:12px;color:#e65100;">Your application is under review. You will be notified once verified.</div>';
  } else if (status === "suspended") {
    html += '<div style="margin-top:12px;padding:10px;background:#fff3e0;border-radius:8px;font-size:12px;color:#e65100;">Announcer access is suspended. You cannot post new announcements.</div>';
  } else if (status === "revoked") {
    html += '<div style="margin-top:12px;padding:10px;background:#ffebee;border-radius:8px;font-size:12px;color:#c62828;">Announcer authorization has been revoked. Your user account remains active.</div>';
  }
  
  html += '</div>';
  return html;
}

function getAllowedRadiusDisplay(maxRadius) {
  if (!maxRadius) return "N/A";
  var maxStr = String(maxRadius).trim().toLowerCase();
  if (maxStr === "all india" || maxStr === "all") return "All India";
  var maxNum = Number(maxRadius);
  if (isNaN(maxNum)) return String(maxRadius);
  var options = [1, 5, 10, 25, 51, 100];
  var allowed = [];
  for (var i = 0; i < options.length; i++) {
    if (options[i] <= maxNum) allowed.push(options[i] + " KM");
  }
  if (maxNum >= 100) allowed.push("All India");
  return allowed.join(", ") || String(maxRadius);
}

async function renderAnnouncerDashboard(announcer, userId) {
  var html = '<div class="sectionTitle">Announcer Dashboard</div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
  html += '<button class="btn-primary" onclick="openAnnouncerCreateForm(\'' + escapeAttr(announcer.AnnouncerID || "") + '\')">Create Announcement</button>';
  html += '<button class="btn-gray" onclick="loadMyAnnouncements(\'' + escapeAttr(announcer.AnnouncerID || "") + '\',\'' + escapeAttr(userId) + '\')">My Announcements</button>';
  html += '</div>';
  
  try {
    var response = await fetch(getApiUrl() + "?action=myannouncements&announcerId=" + encodeURIComponent(announcer.AnnouncerID || ""));
    var json = await response.json();
    var announcements = json.data || [];
    
    html += '<div class="card" style="padding:12px;">';
    html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px;">Recent Announcements</div>';
    
    if (announcements.length === 0) {
      html += '<div style="font-size:12px;color:#888;">No announcements yet.</div>';
    } else {
      var limit = Math.min(5, announcements.length);
      for (var i = 0; i < limit; i++) {
        var a = announcements[i];
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;">';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (a.Title || "Untitled") + '</div>';
        html += '<div style="font-size:10px;color:#888;">' + formatDate(a.CreatedDate) + ' Radius: ' + (a.Radius || "N/A") + '</div>';
        html += '</div>';
        html += '<div style="margin-left:8px;">' + getStatusBadge(a.Status) + '</div>';
        html += '</div>';
      }
      
      if (announcements.length > 5) {
        html += '<div style="text-align:center;margin-top:8px;"><button class="btn-gray" onclick="loadMyAnnouncements(\'' + escapeAttr(announcer.AnnouncerID || "") + '\',\'' + escapeAttr(userId) + '\')">View All (' + announcements.length + ')</button></div>';
      }
    }
    html += '</div>';
  } catch (err) {
    html += '<div class="card" style="padding:12px;">Unable to load announcements.</div>';
  }
  
  return html;
}

async function loadMyAnnouncements(announcerId, userId) {
  var container = document.getElementById("announcerContent");
  if (!container) return;
  container.innerHTML = "<div class='card'>Loading...</div>";
  
  try {
    var response = await fetch(getApiUrl() + "?action=myannouncements&announcerId=" + encodeURIComponent(announcerId) + "&userId=" + encodeURIComponent(userId));
    var json = await response.json();
    var announcements = json.data || [];
    
    var html = '<button class="btn-gray" onclick="loadAnnouncerStatus(getUserId())" style="margin-bottom:10px;">Back to Dashboard</button>';
    html += '<div class="sectionTitle">My Announcements (' + announcements.length + ')</div>';
    
    if (announcements.length === 0) {
      html += '<div class="card" style="padding:20px;text-align:center;color:#888;">No announcements found.</div>';
    } else {
      announcements.forEach(function(a) {
        var views = parseInt(a.Views) || 0;
        html += '<div class="card" style="padding:12px;margin-bottom:8px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-size:14px;font-weight:500;">' + (a.Title || "Untitled") + '</div>';
        html += '<div style="font-size:11px;color:#666;margin-top:4px;">' + (a.Description || "").substring(0, 100) + '</div>';
        html += '<div style="font-size:10px;color:#999;margin-top:6px;">' + formatDate(a.CreatedDate) + ' Radius: ' + (a.Radius || "N/A") + ' Views: ' + views + '</div>';
        html += '</div>';
        html += '<div style="margin-left:8px;">' + getStatusBadge(a.Status) + '</div>';
        html += '</div></div>';
      });
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = "<div class='card'>Error loading announcements.</div>";
  }
}

function showAnnouncerApplicationForm() {
  var container = document.getElementById("announcerContent");
  if (!container) return;
  
  var html = '<button class="btn-gray" onclick="loadAnnouncerStatus(getUserId())" style="margin-bottom:10px;">Back</button>';
  html += '<div class="sectionTitle">Apply as Official Announcer</div>';
  html += '<div class="card" style="padding:16px;">';
  html += '<p style="font-size:12px;color:#666;margin:0 0 16px;">Submit your application for admin verification.</p>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Department / Authority Name *</label>';
  html += '<input id="annDeptName" class="input-field" placeholder="e.g., Indore Municipal Corporation" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Designation</label>';
  html += '<input id="annDesignation" class="input-field" placeholder="e.g., Public Relations Officer" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Authority Type</label>';
  html += '<select id="annAuthorityType" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">';
  html += '<option value="">Select type...</option>';
  html += '<option value="Municipal Corporation">Municipal Corporation</option>';
  html += '<option value="Nagar Palika">Nagar Palika</option>';
  html += '<option value="Government Department">Government Department</option>';
  html += '<option value="Police">Police</option>';
  html += '<option value="Education Authority">Education Authority</option>';
  html += '<option value="Health Authority">Health Authority</option>';
  html += '<option value="Utility Service">Utility / Service</option>';
  html += '<option value="Society / Association">Society / Association</option>';
  html += '<option value="Other">Other</option>';
  html += '</select></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">City *</label>';
  html += '<input id="annCity" class="input-field" placeholder="e.g., Indore" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">District</label>';
  html += '<input id="annDistrict" class="input-field" placeholder="e.g., Indore" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">State</label>';
  html += '<input id="annState" class="input-field" placeholder="e.g., Madhya Pradesh" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Address</label>';
  html += '<input id="annAddress" class="input-field" placeholder="Office address" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">';
  html += '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Latitude</label>';
  html += '<input id="annLat" class="input-field" placeholder="22.7196" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  html += '<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Longitude</label>';
  html += '<input id="annLng" class="input-field" placeholder="75.8577" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  html += '</div>';
  
  html += '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Maximum Jurisdiction Radius</label>';
  html += '<select id="annMaxRadius" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">';
  html += '<option value="5">5 KM</option>';
  html += '<option value="10">10 KM</option>';
  html += '<option value="25" selected>25 KM</option>';
  html += '<option value="51">51 KM</option>';
  html += '<option value="100">100 KM</option>';
  html += '<option value="All India">All India</option>';
  html += '</select></div>';
  
  html += '<div style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Proof Document URL (optional)</label>';
  html += '<input id="annProof" class="input-field" placeholder="Upload via Media Upload and paste URL" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;"></div>';
  
  html += '<button class="btn-primary" onclick="submitAnnouncerApplication()" style="width:100%;">Submit Application</button>';
  html += '</div>';
  
  container.innerHTML = html;
}

async function submitAnnouncerApplication() {
  var userId = getUserId();
  if (!userId) return;
  var deptName = document.getElementById("annDeptName").value.trim();
  var city = document.getElementById("annCity").value.trim();
  if (!deptName) { alert("Department/Authority name is required."); return; }
  if (!city) { alert("City is required."); return; }
  
  var designation = document.getElementById("annDesignation").value.trim();
  var authorityType = document.getElementById("annAuthorityType").value;
  var district = document.getElementById("annDistrict").value.trim();
  var state = document.getElementById("annState").value.trim();
  var address = document.getElementById("annAddress").value.trim();
  var lat = document.getElementById("annLat").value.trim();
  var lng = document.getElementById("annLng").value.trim();
  var maxRadius = document.getElementById("annMaxRadius").value;
  var proof = document.getElementById("annProof").value.trim();
  
  try {
    var url = getApiUrl() + "?action=applyannouncer"
      + "&userId=" + encodeURIComponent(userId)
      + "&departmentName=" + encodeURIComponent(deptName)
      + "&designation=" + encodeURIComponent(designation)
      + "&authorityType=" + encodeURIComponent(authorityType)
      + "&city=" + encodeURIComponent(city)
      + "&district=" + encodeURIComponent(district)
      + "&state=" + encodeURIComponent(state)
      + "&address=" + encodeURIComponent(address)
      + "&latitude=" + encodeURIComponent(lat)
      + "&longitude=" + encodeURIComponent(lng)
      + "&maxRadius=" + encodeURIComponent(maxRadius)
      + "&proofDocument=" + encodeURIComponent(proof);
    
    var response = await fetch(url);
    var json = await response.json();
    
    if (json.success || json.status === "SUCCESS") {
      alert("Application submitted successfully!");
      loadAnnouncerStatus(userId);
    } else {
      alert(json.message || "Failed to submit application.");
    }
  } catch (err) {
    alert("Connection error. Please try again.");
  }
}

function openAnnouncerCreateForm(announcerId) {
  openPage("postAnnouncement");
  setTimeout(function() {
    var announcerIdField = document.getElementById("announcerIdField");
    if (announcerIdField) announcerIdField.value = announcerId;
    if (typeof loadAnnouncerPostInfo === "function") loadAnnouncerPostInfo(announcerId);
  }, 300);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return String(dateStr).substring(0, 10);
  }
}

function getStatusBadge(status) {
  var s = String(status || "Pending").toLowerCase();
  var color = "#888";
  if (s === "active" || s === "published") color = "#4caf50";
  else if (s === "pending") color = "#ff9800";
  else if (s === "deleted") color = "#f44336";
  else if (s === "expired") color = "#9e9e9e";
  return '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:' + color + '20;color:' + color + ';font-weight:500;">' + (status || "Pending") + '</span>';
}

function escapeAttr(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "%27").replace(/"/g, "%22");
}