/*
============================================================
EKKA1KM FRONTEND
Drafts.js
Phase 4.6 - Draft System
============================================================
*/

/*
============================================================
LOAD MY DRAFTS
============================================================
*/

function loadMyDrafts(contentType) {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=loaddraft&userId=" + encodeURIComponent(userId) + "&contentType=" + encodeURIComponent(contentType);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyDrafts(res.data.data || []);
      } else {
        document.getElementById("draftsList").innerHTML = '<div class="dashboardEmpty">No drafts found</div>';
      }
    })
    .catch(function(err) {
      console.log("Load drafts error:", err);
    });
}

/*
============================================================
RENDER MY DRAFTS
============================================================
*/

function renderMyDrafts(drafts) {
  var container = document.getElementById("draftsList");
  if (!container) return;

  if (drafts.length === 0) {
    container.innerHTML = '<div class="dashboardEmpty">No drafts yet</div>';
    return;
  }

  var html = "";
  drafts.forEach(function(d) {
    html += '<div class="dashboardActivityCard">';
    html += '<div class="dashboardActivityItem">';
    html += '<div class="title">' + (d.ContentType || "Draft") + '</div>';
    html += '<div class="meta">Status: ' + (d.Status || "Saved") + "</div>";
    html += '<div class="meta" style="font-size:10px;color:#aaa;">' + (d.UpdatedDate || d.CreatedDate || "") + "</div>";
    html += '<button onclick="loadDraft(\'' + d.DraftID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Load Draft</button>';
    html += '<button class="btn-danger" onclick="deleteDraft(\'' + d.DraftID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Delete</button>';
    html += "</div></div>";
  });

  container.innerHTML = html;
}

/*
============================================================
LOAD DRAFT
============================================================
*/

function loadDraft(draftId) {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=loaddraft&userId=" + encodeURIComponent(userId) + "&draftId=" + encodeURIComponent(draftId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data && res.data.data && res.data.data.length > 0) {
        var draft = res.data.data[0];
        alert("Draft loaded! Data: " + draft.Data);
        // TODO: Populate form with draft data
      } else {
        alert("Draft not found");
      }
    })
    .catch(function(err) {
      console.log("Load draft error:", err);
    });
}

/*
============================================================
DELETE DRAFT
============================================================
*/

function deleteDraft(draftId) {
  if (!confirm("Are you sure you want to delete this draft?")) {
    return;
  }

  var url = getApiUrl() + "?action=deletedraft&draftId=" + encodeURIComponent(draftId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Draft deleted successfully");
        loadMyDrafts("Product"); // Refresh current view
      } else {
        alert(res.message || "Failed to delete draft");
      }
    })
    .catch(function(err) {
      console.log("Delete draft error:", err);
    });
}

/*
============================================================
AUTO SAVE DRAFT
============================================================
*/

function autoSaveDraft(contentType, formData) {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() + "?action=autosave&userId=" + encodeURIComponent(userId) + "&contentType=" + encodeURIComponent(contentType) + "&data=" + encodeURIComponent(JSON.stringify(formData));

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        console.log("Draft auto-saved");
      }
    })
    .catch(function(err) {
      console.log("Auto-save error:", err);
    });
}