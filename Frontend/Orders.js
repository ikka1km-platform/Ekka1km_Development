/*
============================================================
EKKA1KM FRONTEND
Orders.js
Stage 4L - Orders / Leads UX
V1.1 - Premium Visual Polish
============================================================
*/

/*
============================================================
ORDERS / LEADS HUB
Dedicated page for My Inquiries and Leads Received
============================================================
*/

let CURRENT_ORDERS_FILTER = "inquiries";
let ORDERS_INQUIRIES_DATA = [];
let ORDERS_LEADS_DATA = [];

function openOrdersPage(initialFilter) {
  if (!requireLogin()) {
    return;
  }
  CURRENT_ORDERS_FILTER = initialFilter || "inquiries";
  openPage("orders");
  loadOrdersPage();
}

function loadOrdersPage() {
  var container = document.getElementById("ordersList");
  if (!container) return;

  var userId = getUserId();
  if (!userId) {
    container.innerHTML = '<div class="ordersGuest">Please login to view orders and leads.</div>';
    return;
  }

  renderOrdersSkeleton();

  if (CURRENT_ORDERS_FILTER === "inquiries") {
    loadMyInquiriesData();
  } else {
    loadLeadsReceivedData();
  }
}

/*
============================================================
LOAD MY INQUIRIES DATA
============================================================
*/

function loadMyInquiriesData() {
  var userId = getUserId();
  if (!userId) return;

  var url = getApiUrl() +
    "?action=getmyinterests" +
    "&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        ORDERS_INQUIRIES_DATA = (Array.isArray(res.data) ? res.data : (res.data.data || []));
        // Also load leads count for summary
        loadLeadsCountForSummary();
      } else {
        ORDERS_INQUIRIES_DATA = [];
        renderOrdersContent();
      }
    })
    .catch(function(err) {
      console.log("Orders load error:", err);
      renderOrdersError();
    });
}

/*
============================================================
LOAD LEADS COUNT FOR SUMMARY
Loads leads count in background for summary cards
============================================================
*/

function loadLeadsCountForSummary() {
  var userId = getUserId();
  if (!userId) { renderOrdersContent(); return; }

  var productsUrl = getApiUrl() + "?action=products&userId=" + encodeURIComponent(userId);
  var propertiesUrl = getApiUrl() + "?action=properties&userId=" + encodeURIComponent(userId);

  Promise.all([
    fetch(productsUrl).then(function(r) { return r.json(); }),
    fetch(propertiesUrl).then(function(r) { return r.json(); })
  ])
    .then(function(results) {
      var products = (results[0] && results[0].data && results[0].data.data) || [];
      var properties = (results[1] && results[1].data && results[1].data.data) || [];

      var targets = [];
      products.forEach(function(p) {
        if (String(p.UserID) === String(userId)) {
          targets.push({ type: "Product", id: p.ProductID });
        }
      });
      properties.forEach(function(p) {
        if (String(p.OwnerUserID) === String(userId)) {
          targets.push({ type: "Property", id: p.PropertyID });
        }
      });

      if (targets.length === 0) {
        ORDERS_LEADS_DATA = [];
        renderOrdersContent();
        return;
      }

      var limitedTargets = targets.slice(0, 20);
      var calls = limitedTargets.map(function(t) {
        return fetch(getApiUrl() + "?action=getinterestedusers" +
          "&targetType=" + encodeURIComponent(t.type) +
          "&targetId=" + encodeURIComponent(t.id))
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res && res.success && res.data) {
              var users = (Array.isArray(res.data) ? res.data : (res.data.data || []));
              return users.map(function(u) {
                return {
                  interestId: u.interestId || u.InterestID || "",
                  userId: u.userId || u.UserID || "",
                  userName: u.userName || u.UserName || u.FullName || "User",
                  profilePhoto: u.profilePhoto || u.ProfilePhoto || "",
                  date: u.date || u.Date || u.CreatedDate || "",
                  targetType: t.type,
                  targetId: t.id,
                  targetTitle: t.title,
                  targetImage: t.image
                };
              });
            }
            return [];
          })
          .catch(function() { return []; });
      });

      return Promise.all(calls).then(function(resultsArray) {
        ORDERS_LEADS_DATA = [];
        resultsArray.forEach(function(arr) {
          ORDERS_LEADS_DATA = ORDERS_LEADS_DATA.concat(arr);
        });
        ORDERS_LEADS_DATA.sort(function(a, b) {
          return new Date(b.date || 0) - new Date(a.date || 0);
        });
        renderOrdersContent();
      });
    })
    .catch(function() {
      renderOrdersContent();
    });
}

/*
============================================================
LOAD LEADS RECEIVED DATA
============================================================
*/

function loadLeadsReceivedData() {
  var userId = getUserId();
  if (!userId) return;

  var productsUrl = getApiUrl() + "?action=products&userId=" + encodeURIComponent(userId);
  var propertiesUrl = getApiUrl() + "?action=properties&userId=" + encodeURIComponent(userId);

  Promise.all([
    fetch(productsUrl).then(function(r) { return r.json(); }),
    fetch(propertiesUrl).then(function(r) { return r.json(); })
  ])
    .then(function(results) {
      var products = (results[0] && results[0].data && results[0].data.data) || [];
      var properties = (results[1] && results[1].data && results[1].data.data) || [];

      var targets = [];
      products.forEach(function(p) {
        if (String(p.UserID) === String(userId)) {
          targets.push({ type: "Product", id: p.ProductID, title: p.Title || "Product", image: p.ImageURL || p.Image || "" });
        }
      });
      properties.forEach(function(p) {
        if (String(p.OwnerUserID) === String(userId)) {
          var title = p.Title || p.PropertyName || "Property";
          var image = "";
          if (p.Images) { image = p.Images.split(",")[0].trim(); }
          targets.push({ type: "Property", id: p.PropertyID, title: title, image: image });
        }
      });

      if (targets.length === 0) {
        ORDERS_LEADS_DATA = [];
        // Also load inquiries count for summary
        loadInquiriesCountForSummary();
        return;
      }

      var limitedTargets = targets.slice(0, 20);
      var calls = limitedTargets.map(function(t) {
        return fetch(getApiUrl() + "?action=getinterestedusers" +
          "&targetType=" + encodeURIComponent(t.type) +
          "&targetId=" + encodeURIComponent(t.id))
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res && res.success && res.data) {
              var users = (Array.isArray(res.data) ? res.data : (res.data.data || []));
              return users.map(function(u) {
                return {
                  interestId: u.interestId || u.InterestID || "",
                  userId: u.userId || u.UserID || "",
                  userName: u.userName || u.UserName || u.FullName || "User",
                  profilePhoto: u.profilePhoto || u.ProfilePhoto || "",
                  date: u.date || u.Date || u.CreatedDate || "",
                  targetType: t.type,
                  targetId: t.id,
                  targetTitle: t.title,
                  targetImage: t.image
                };
              });
            }
            return [];
          })
          .catch(function() { return []; });
      });

      return Promise.all(calls).then(function(resultsArray) {
        ORDERS_LEADS_DATA = [];
        resultsArray.forEach(function(arr) {
          ORDERS_LEADS_DATA = ORDERS_LEADS_DATA.concat(arr);
        });
        ORDERS_LEADS_DATA.sort(function(a, b) {
          return new Date(b.date || 0) - new Date(a.date || 0);
        });
        loadInquiriesCountForSummary();
      });
    })
    .catch(function() {
      renderOrdersError();
    });
}

/*
============================================================
LOAD INQUIRIES COUNT FOR SUMMARY
============================================================
*/

function loadInquiriesCountForSummary() {
  var userId = getUserId();
  if (!userId) { renderOrdersContent(); return; }

  fetch(getApiUrl() + "?action=getmyinterests&userId=" + encodeURIComponent(userId))
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        ORDERS_INQUIRIES_DATA = (Array.isArray(res.data) ? res.data : (res.data.data || []));
      } else {
        ORDERS_INQUIRIES_DATA = [];
      }
      renderOrdersContent();
    })
    .catch(function() {
      renderOrdersContent();
    });
}

/*
============================================================
RENDER ORDERS CONTENT
============================================================
*/

function renderOrdersContent() {
  var container = document.getElementById("ordersList");
  if (!container) return;

  var html = '';

  // Header
  html += '<div class="ordersHeader">';
  html += '<h1 class="ordersHeaderTitle">My Orders & Leads</h1>';
  html += '<p class="ordersHeaderSubtitle">Manage your inquiries and see who is interested in your listings.</p>';
  html += '</div>';

  // Summary Cards
  html += renderSummaryCards();

  // Tabs
  html += '<div class="ordersTabs">';
  html += '<div class="ordersTab ' + (CURRENT_ORDERS_FILTER === "inquiries" ? "ordersTabActive" : "") + '" onclick="switchOrdersTab(\'inquiries\')">My Inquiries</div>';
  html += '<div class="ordersTab ' + (CURRENT_ORDERS_FILTER === "leads" ? "ordersTabActive" : "") + '" onclick="switchOrdersTab(\'leads\')">Leads Received</div>';
  html += '</div>';

  // Content
  if (CURRENT_ORDERS_FILTER === "inquiries") {
    html += renderInquiriesContent();
  } else {
    html += renderLeadsContent();
  }

  // Future Ready: Recent Activity section (hidden when empty)
  html += '<div class="ordersRecentSection" style="display:none;">';
  html += '<h3 class="ordersRecentTitle">Recent Activity</h3>';
  html += '<div class="ordersRecentList"></div>';
  html += '</div>';

  container.innerHTML = html;
}

/*
============================================================
RENDER SUMMARY CARDS
============================================================
*/

function renderSummaryCards() {
  var inquiriesCount = ORDERS_INQUIRIES_DATA.length;
  var activeCount = 0;
  ORDERS_INQUIRIES_DATA.forEach(function(item) {
    var status = interestSafeRender(item.status) || interestSafeRender(item.Status) || "";
    if (String(status).toLowerCase() === "active" || !status) activeCount++;
  });
  var leadsCount = ORDERS_LEADS_DATA.length;

  var html = '';
  html += '<div class="ordersSummary">';
  html += '<div class="ordersSummaryCard">';
  html += '<div class="ordersSummaryIcon ordersSummaryIconInquiries"><i class="material-icons">shopping_bag</i></div>';
  html += '<div class="ordersSummaryInfo">';
  html += '<div class="ordersSummaryValue">' + inquiriesCount + '</div>';
  html += '<div class="ordersSummaryLabel">My Inquiries</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="ordersSummaryCard">';
  html += '<div class="ordersSummaryIcon ordersSummaryIconActive"><i class="material-icons">check_circle</i></div>';
  html += '<div class="ordersSummaryInfo">';
  html += '<div class="ordersSummaryValue">' + activeCount + '</div>';
  html += '<div class="ordersSummaryLabel">Active</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="ordersSummaryCard">';
  html += '<div class="ordersSummaryIcon ordersSummaryIconLeads"><i class="material-icons">person_add</i></div>';
  html += '<div class="ordersSummaryInfo">';
  html += '<div class="ordersSummaryValue">' + leadsCount + '</div>';
  html += '<div class="ordersSummaryLabel">Leads Received</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

/*
============================================================
RENDER INQUIRIES CONTENT
============================================================
*/

function renderInquiriesContent() {
  var items = ORDERS_INQUIRIES_DATA;

  if (items.length === 0) {
    return renderEmptyInquiries();
  }

  var html = '<div class="ordersList">';
  items.forEach(function(item) {
    html += renderInquiryCard(item);
  });
  html += '</div>';
  return html;
}

/*
============================================================
RENDER LEADS CONTENT
============================================================
*/

function renderLeadsContent() {
  var items = ORDERS_LEADS_DATA;

  if (items.length === 0) {
    return renderEmptyLeads();
  }

  var html = '<div class="ordersList">';
  items.forEach(function(item) {
    html += renderLeadCard(item);
  });
  html += '</div>';
  return html;
}

/*
============================================================
RENDER INQUIRY CARD (Premium)
============================================================
*/

function renderInquiryCard(item) {
  var targetType = interestSafeRender(item.targetType) || interestSafeRender(item.Type) || "General";
  var title = interestSafeRender(item.targetData && item.targetData.Title) || interestSafeRender(item.targetData && item.targetData.title) || interestSafeRender(item.Title) || interestSafeRender(item.title) || "Listing";
  var refId = interestSafeRender(item.targetId) || interestSafeRender(item.TargetID) || interestSafeRender(item.referenceId) || interestSafeRender(item.id) || "";
  var interestId = interestSafeRender(item.interestId) || interestSafeRender(item.InterestID) || "";
  var status = interestSafeRender(item.status) || interestSafeRender(item.Status) || "Active";
  var createdAt = interestSafeRender(item.date) || interestSafeRender(item.CreatedDate) || interestSafeRender(item.createdAt) || "";
  var image = "";

  if (item.targetData) {
    image = item.targetData.ImageURL || item.targetData.Image || item.targetData.image || "";
    if (!image && item.targetData.Images) {
      image = item.targetData.Images.split(",")[0].trim();
    }
  }
  if (!image) {
    image = interestSafeRender(item.image) || interestSafeRender(item.ImageURL) || "";
  }

  var formattedDate = "";
  if (createdAt) {
    try {
      var d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) { /* silent */ }
  }

  var statusColor = getInquiryStatusColor(status);
  var statusLabel = getInquiryStatusLabel(status);

  var price = "";
  var location = "";
  if (item.targetData) {
    if (item.targetData.Price) {
      price = "₹ " + Number(item.targetData.Price).toLocaleString("en-IN");
    }
    if (item.targetData.City) {
      location = item.targetData.City;
      if (item.targetData.State) location += ", " + item.targetData.State;
    }
  }

  var html = '';
  html += '<div class="orderCard">';

  html += '<div class="orderCardThumb">';
  if (image) {
    html += '<img src="' + escapeHtml(image) + '" alt="" onerror="this.parentElement.classList.add(\'orderCardThumbFallback\');this.style.display=\'none\'">';
  }
  if (!image) {
    html += '<div class="orderCardThumbIcon"><i class="material-icons">' + (targetType === "Property" ? "real_estate_agent" : "shopping_bag") + '</i></div>';
  }
  html += '</div>';

  html += '<div class="orderCardBody">';
  html += '<div class="orderCardTop">';
  html += '<span class="orderCardType">' + escapeHtml(targetType) + '</span>';
  html += '<span class="orderCardStatus" style="background:' + statusColor + ';color:#fff;">' + escapeHtml(statusLabel) + '</span>';
  html += '</div>';

  html += '<div class="orderCardTitle">' + escapeHtml(title) + '</div>';

  if (price) {
    html += '<div class="orderCardPrice">' + price + '</div>';
  }

  html += '<div class="orderCardMeta">';
  if (formattedDate) {
    html += '<span class="orderCardDate"><i class="material-icons">schedule</i>' + formattedDate + '</span>';
  }
  if (location) {
    html += '<span class="orderCardLocation"><i class="material-icons">location_on</i>' + escapeHtml(location) + '</span>';
  }
  html += '</div>';

  html += '<div class="orderCardActions">';
  if (refId) {
    html += '<button class="orderCardBtn" onclick="viewInterestTarget(\'' + escapeHtml(targetType) + '\',\'' + escapeHtml(refId) + '\')">View Listing</button>';
  }
  if (interestId) {
    html += '<button class="orderCardBtn orderCardBtnGhost" onclick="removeInquiryFromOrders(\'' + escapeHtml(interestId) + '\')">Remove</button>';
  }
  html += '</div>';

  html += '</div>';
  html += '</div>';

  return html;
}

/*
============================================================
RENDER LEAD CARD (Premium)
============================================================
*/

function renderLeadCard(item) {
  var targetType = escapeHtml(item.targetType || "");
  var targetTitle = escapeHtml(item.targetTitle || "Listing");
  var userName = escapeHtml(item.userName || "User");
  var profilePhoto = escapeHtml(item.profilePhoto || "");
  var date = item.date || "";
  var formattedDate = "";

  if (date) {
    try {
      var d = new Date(date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) { /* silent */ }
  }

  var html = '';
  html += '<div class="orderCard">';

  html += '<div class="orderCardThumb">';
  if (profilePhoto) {
    html += '<img src="' + profilePhoto + '" alt="" onerror="this.parentElement.classList.add(\'orderCardThumbFallback\');this.style.display=\'none\'">';
  }
  if (!profilePhoto) {
    html += '<div class="orderCardThumbIcon orderCardThumbIconLead">' + userName.charAt(0).toUpperCase() + '</div>';
  }
  html += '</div>';

  html += '<div class="orderCardBody">';
  html += '<div class="orderCardTop">';
  html += '<span class="orderCardType orderCardLeadType">Lead on ' + targetType + '</span>';
  html += '<span class="orderCardStatus" style="background:#1976d2;color:#fff;">New</span>';
  html += '</div>';

  html += '<div class="orderCardTitle">' + targetTitle + '</div>';
  html += '<div class="orderCardLeadUser">' + userName + ' is interested in this listing</div>';

  html += '<div class="orderCardMeta">';
  if (formattedDate) {
    html += '<span class="orderCardDate"><i class="material-icons">schedule</i>' + formattedDate + '</span>';
  }
  html += '</div>';

  html += '<div class="orderCardActions">';
  if (item.targetId && item.targetType) {
    html += '<button class="orderCardBtn" onclick="viewInterestTarget(\'' + targetType + '\',\'' + escapeHtml(item.targetId) + '\')">View Listing</button>';
  }
  html += '</div>';

  html += '</div>';
  html += '</div>';

  return html;
}

/*
============================================================
RENDER EMPTY INQUIRIES (Premium)
============================================================
*/

function renderEmptyInquiries() {
  var html = '';
  html += '<div class="ordersEmpty">';
  html += '<div class="ordersEmptyIcon"><i class="material-icons">favorite_border</i></div>';
  html += '<h2 class="ordersEmptyTitle">No inquiries yet</h2>';
  html += '<p class="ordersEmptyDesc">Browse nearby products and properties. When you show interest in a listing, it will appear here.</p>';
  html += '<div class="ordersEmptyActions">';
  html += '<button class="ordersEmptyBtn" onclick="openPage(\'products\')">Browse Products</button>';
  html += '<button class="ordersEmptyBtn ordersEmptyBtnSecondary" onclick="openPage(\'properties\')">Explore Properties</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

/*
============================================================
RENDER EMPTY LEADS (Premium)
============================================================
*/

function renderEmptyLeads() {
  var html = '';
  html += '<div class="ordersEmpty">';
  html += '<div class="ordersEmptyIcon"><i class="material-icons">person_search</i></div>';
  html += '<h2 class="ordersEmptyTitle">No leads yet</h2>';
  html += '<p class="ordersEmptyDesc">When people show interest in your products or properties, they will appear here as leads.</p>';
  html += '<div class="ordersEmptyActions">';
  html += '<button class="ordersEmptyBtn" onclick="openPage(\'myContent\')">Go to My Content</button>';
  html += '</div>';
  html += '</div>';
  return html;
}

/*
============================================================
RENDER SKELETON LOADING
============================================================
*/

function renderOrdersSkeleton() {
  var container = document.getElementById("ordersList");
  if (!container) return;

  var html = '';
  html += '<div class="ordersHeader">';
  html += '<h1 class="ordersHeaderTitle">My Orders & Leads</h1>';
  html += '<p class="ordersHeaderSubtitle">Manage your inquiries and see who is interested in your listings.</p>';
  html += '</div>';

  html += '<div class="ordersSummary">';
  for (var i = 0; i < 3; i++) {
    html += '<div class="ordersSummaryCard">';
    html += '<div class="ordersSummaryIcon ordersSkeletonPulse"></div>';
    html += '<div class="ordersSummaryInfo">';
    html += '<div class="ordersSkeletonPulse" style="width:40px;height:28px;border-radius:6px;margin-bottom:4px;"></div>';
    html += '<div class="ordersSkeletonPulse" style="width:80px;height:14px;border-radius:6px;"></div>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="ordersTabs">';
  html += '<div class="ordersSkeletonPulse" style="width:120px;height:40px;border-radius:20px;display:inline-block;"></div>';
  html += '<div class="ordersSkeletonPulse" style="width:140px;height:40px;border-radius:20px;display:inline-block;margin-left:10px;"></div>';
  html += '</div>';

  for (var i = 0; i < 3; i++) {
    html += '<div class="orderCard orderCardSkeleton">';
    html += '<div class="ordersSkeletonPulse" style="width:60px;height:60px;border-radius:10px;flex-shrink:0;"></div>';
    html += '<div class="orderCardBody">';
    html += '<div class="ordersSkeletonPulse" style="width:80px;height:12px;border-radius:6px;margin-bottom:8px;"></div>';
    html += '<div class="ordersSkeletonPulse" style="width:200px;height:16px;border-radius:6px;margin-bottom:6px;"></div>';
    html += '<div class="ordersSkeletonPulse" style="width:120px;height:12px;border-radius:6px;margin-bottom:12px;"></div>';
    html += '<div class="ordersSkeletonPulse" style="width:100px;height:30px;border-radius:15px;"></div>';
    html += '</div>';
    html += '</div>';
  }

  container.innerHTML = html;
}

/*
============================================================
RENDER ERROR STATE
============================================================
*/

function renderOrdersError() {
  var container = document.getElementById("ordersList");
  if (!container) return;

  var html = '';
  html += '<div class="ordersHeader">';
  html += '<h1 class="ordersHeaderTitle">My Orders & Leads</h1>';
  html += '<p class="ordersHeaderSubtitle">Manage your inquiries and see who is interested in your listings.</p>';
  html += '</div>';

  html += '<div class="ordersTabs">';
  html += '<div class="ordersTab ' + (CURRENT_ORDERS_FILTER === "inquiries" ? "ordersTabActive" : "") + '" onclick="switchOrdersTab(\'inquiries\')">My Inquiries</div>';
  html += '<div class="ordersTab ' + (CURRENT_ORDERS_FILTER === "leads" ? "ordersTabActive" : "") + '" onclick="switchOrdersTab(\'leads\')">Leads Received</div>';
  html += '</div>';

  html += '<div class="ordersError">';
  html += '<div class="ordersErrorIcon"><i class="material-icons">error_outline</i></div>';
  html += '<h2 class="ordersErrorTitle">Something went wrong</h2>';
  html += '<p class="ordersErrorDesc">We couldn\'t load your orders and leads. Check your connection and try again.</p>';
  html += '<button class="ordersEmptyBtn" onclick="loadOrdersPage()">Try Again</button>';
  html += '</div>';

  container.innerHTML = html;
}

/*
============================================================
SWITCH ORDERS TAB
============================================================
*/

function switchOrdersTab(filter) {
  CURRENT_ORDERS_FILTER = filter;
  renderOrdersSkeleton();
  if (filter === "inquiries") {
    loadMyInquiriesData();
  } else {
    loadLeadsReceivedData();
  }
}

/*
============================================================
VIEW INTEREST TARGET
============================================================
*/

function viewInterestTarget(type, id) {
  if (!id) return;
  // Delegate to the unified interest->detail navigator (handles all 4 types
  // and reuses the existing detail pages). Falls back to legacy logic if absent.
  if (typeof openInterestDetail === "function") {
    openInterestDetail(type, id);
    return;
  }
  if (type === "Product") {
    openPage("products");
    setTimeout(function() {
      fetch(getApiUrl() + "?action=product&id=" + encodeURIComponent(id))
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res && res.success && res.data && typeof showProductDetails === "function") {
            showProductDetails(res.data);
          }
        });
    }, 100);
  } else if (type === "Property") {
    openPage("properties");
    setTimeout(function() {
      fetch(getApiUrl() + "?action=property&id=" + encodeURIComponent(id))
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res && res.success && res.data && typeof showPropertyDetails === "function") {
            showPropertyDetails(res.data);
          }
        });
    }, 50);
  }
}

/*
============================================================
REMOVE INQUIRY
============================================================
*/

function removeInquiryFromOrders(interestId) {
  if (!interestId) return;
  if (!confirm("Remove this inquiry?")) return;

  var userId = getUserId();
  if (!userId) { requireLogin(); return; }

  var url = getApiUrl() +
    "?action=removeinterest" +
    "&userId=" + encodeURIComponent(userId) +
    "&interestId=" + encodeURIComponent(interestId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        // Remove from local data and re-render
        ORDERS_INQUIRIES_DATA = ORDERS_INQUIRIES_DATA.filter(function(i) {
          return (interestSafeRender(i.interestId) || interestSafeRender(i.InterestID)) !== interestId;
        });
        renderOrdersContent();
      } else {
        alert(res.message || "Failed to remove inquiry");
      }
    })
    .catch(function(err) {
      console.log("Remove inquiry error:", err);
      alert("Error removing inquiry");
    });
}

/*
============================================================
STATUS HELPERS
============================================================
*/

function getInquiryStatusColor(status) {
  if (!status) return "#0f9d58";
  var s = String(status).toLowerCase();
  if (s === "active" || s === "completed") return "#0f9d58";
  if (s === "pending" || s === "new") return "#f9a825";
  if (s === "removed" || s === "cancelled" || s === "closed") return "#d32f2f";
  if (s === "responded" || s === "in progress") return "#1976d2";
  return "#888";
}

function getInquiryStatusLabel(status) {
  if (!status) return "";
  var s = String(status).toLowerCase();
  if (s === "active") return "Active";
  if (s === "removed") return "Removed";
  return status;
}

/*
============================================================
SAFE HELPERS
============================================================
*/

function interestSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}

function escapeHtml(str) {
  if (!str) return "";
  var d = document.createElement("div");
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}