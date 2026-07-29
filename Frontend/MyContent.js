/*
============================================================
EKKA1KM FRONTEND
MyContent.js
Stage 4D - Personal Content Management
Unified My Content page with tabs
============================================================
*/

let CURRENT_MY_CONTENT_FILTER = "all";
let MY_CONTENT_DATA = {
  products: [],
  businesses: [],
  properties: [],
  news: []
};

/*
============================================================
OPEN MY CONTENT
============================================================
*/

function openMyContent(filterType) {
  if (!requireLogin()) return;

  CURRENT_MY_CONTENT_FILTER = filterType || "all";
  openPage("myContent");
  loadMyContent();
}

/*
============================================================
LOAD MY CONTENT
Loads all four content types in parallel
============================================================
*/

async function loadMyContent() {
  const container = document.getElementById("myContentList");
  if (!container) return;

  container.innerHTML = '<div class="card">Loading your content...</div>';

  const userId = getUserId();
  if (!userId) {
    container.innerHTML = '<div class="dashboardEmpty">Please login to view your content.</div>';
    return;
  }

  try {
    // Load all four content types in parallel
    const [productsRes, businessesRes, propertiesRes, newsRes] = await Promise.all([
      fetch(`${getApiUrl()}?action=products&userId=${encodeURIComponent(userId)}`),
      fetch(`${getApiUrl()}?action=businesses&userId=${encodeURIComponent(userId)}`),
      fetch(`${getApiUrl()}?action=properties&userId=${encodeURIComponent(userId)}`),
      fetch(`${getApiUrl()}?action=news&userId=${encodeURIComponent(userId)}`)
    ]);

    const productsJson = await productsRes.json();
    const businessesJson = await businessesRes.json();
    const propertiesJson = await propertiesRes.json();
    const newsJson = await newsRes.json();

    MY_CONTENT_DATA.products = (productsJson.data && productsJson.data.data) || [];
    MY_CONTENT_DATA.businesses = (businessesJson.data && businessesJson.data.data) || [];
    MY_CONTENT_DATA.properties = (propertiesJson.data && propertiesJson.data.data) || [];
    MY_CONTENT_DATA.news = (newsJson.data && newsJson.data.data) || [];

    renderMyContent();
  } catch (err) {
    console.log("My Content load error:", err);
    container.innerHTML = '<div class="dashboardEmpty">Unable to load your content. Please try again.</div>';
  }
}

/*
============================================================
NORMALIZE ITEM
Ensures every item has _type and _id set correctly.
Called for every item regardless of filter branch.
============================================================
*/

function normalizeMyContentItem(item, type) {
  if (!item || typeof item !== "object") return null;
  var normalized = { ...item };
  
  if (type === "product" || type === "products") {
    normalized._type = "product";
    normalized._id = item.ProductID;
  } else if (type === "business" || type === "businesses") {
    normalized._type = "business";
    normalized._id = item.BusinessID;
  } else if (type === "property" || type === "properties") {
    normalized._type = "property";
    normalized._id = item.PropertyID;
  } else if (type === "news") {
    normalized._type = "news";
    normalized._id = item.NewsID;
  }
  
  return normalized;
}

/*
============================================================
SAFE UPPERCASE
Never throws on undefined/null/non-string values.
============================================================
*/

function safeUpperCase(value) {
  if (typeof value !== "string" || !value) return "";
  return value.toUpperCase();
}

/*
============================================================
IS VALID TEXT STATUS
Returns true only for genuine textual status values.
Rejects empty, purely numeric, and coordinate-like values.
============================================================
*/

function isValidTextStatus(value) {
  if (!value || typeof value !== "string") return false;
  var trimmed = value.trim();
  if (trimmed === "") return false;
  // Reject purely numeric values (including decimals)
  if (/^[0-9.,\s]+$/.test(trimmed)) return false;
  // Reject coordinate-like values (latitude/longitude patterns)
  if (/^-?\d+\.\d+$/.test(trimmed)) return false;
  return true;
}

/*
============================================================
IS VALID DATE
Returns true only if the value can produce a valid Date object.
============================================================
*/

function isValidDate(value) {
  if (!value) return false;
  var d = new Date(value);
  return !isNaN(d.getTime());
}

/*
============================================================
RENDER MY CONTENT
============================================================
*/

function renderMyContent() {
  const container = document.getElementById("myContentList");
  if (!container) return;

  const filter = CURRENT_MY_CONTENT_FILTER;
  let items = [];

  if (filter === "all") {
    // Combine all types with canonical normalization
    items = [
      ...MY_CONTENT_DATA.products.map(function(p) { return normalizeMyContentItem(p, "product"); }),
      ...MY_CONTENT_DATA.businesses.map(function(b) { return normalizeMyContentItem(b, "business"); }),
      ...MY_CONTENT_DATA.properties.map(function(p) { return normalizeMyContentItem(p, "property"); }),
      ...MY_CONTENT_DATA.news.map(function(n) { return normalizeMyContentItem(n, "news"); })
    ];
    // Filter out any nulls from normalization
    items = items.filter(function(item) { return item !== null; });
    // Sort by date descending
    items.sort(function(a, b) {
      return new Date(b.CreatedDate || 0) - new Date(a.CreatedDate || 0);
    });
  } else {
    // Individual tab: use normalizeMyContentItem which handles both singular and plural
    var sourceArray = MY_CONTENT_DATA[filter] || [];
    items = sourceArray.map(function(item) {
      return normalizeMyContentItem(item, filter);
    });
    // Filter out any nulls from normalization
    items = items.filter(function(item) { return item !== null; });
  }

  // Build filter tabs HTML
  let tabsHtml = '<div class="myContentTabs">';
  const tabs = [
    { key: "all", label: "All" },
    { key: "products", label: "Products" },
    { key: "businesses", label: "Businesses" },
    { key: "properties", label: "Properties" },
    { key: "news", label: "News" }
  ];
  tabs.forEach(function(tab) {
    const activeClass = filter === tab.key ? "myContentTabActive" : "";
    tabsHtml += '<span class="myContentTab ' + activeClass + '" onclick="setMyContentFilter(\'' + tab.key + '\')">' + tab.label + '</span>';
  });
  tabsHtml += '</div>';

  // Build content HTML
  let contentHtml = "";

  if (items.length === 0) {
    const emptyMessages = {
      all: "You haven't posted anything yet.",
      products: "No products posted yet.",
      businesses: "No businesses created yet.",
      properties: "No properties posted yet.",
      news: "No news posted yet."
    };
    const postActions = {
      all: "openPostFormWithLogin('product')",
      products: "openPostFormWithLogin('product')",
      businesses: "openPostFormWithLogin('business')",
      properties: "openPostFormWithLogin('property')",
      news: "openPostFormWithLogin('news')"
    };
    const postLabels = {
      all: "Post Something",
      products: "Post Product",
      businesses: "Create Business",
      properties: "Post Property",
      news: "Post News"
    };

    contentHtml = '<div class="dashboardEmpty">' + (emptyMessages[filter] || emptyMessages.all) + '</div>';
    contentHtml += '<button onclick="' + (postActions[filter] || postActions.all) + '" style="margin-top:15px;">' + (postLabels[filter] || postLabels.all) + '</button>';
  } else {
    contentHtml = '<div class="myContentList">';
    items.forEach(function(item) {
      // Safe access with fallbacks - _type and _id are guaranteed by normalizeMyContentItem
      var itemType = item._type || "";
      var itemId = item._id || "";
      
      // Status: validate to reject numeric/coordinate values
      var rawStatus = item.Status || "";
      var status = isValidTextStatus(rawStatus) ? rawStatus : "";
      
      // Date: validate before formatting
      var createdDate = "";
      if (isValidDate(item.CreatedDate)) {
        createdDate = new Date(item.CreatedDate).toLocaleDateString("en-IN");
      }

      // Type-specific fields
      var title = "";
      var subtitle = "";
      var priceStr = "";
      var imageStr = "";
      var meta = [];

      if (itemType === "product") {
        title = item.Title || "Product";
        priceStr = item.Price ? '₹ ' + Number(item.Price).toLocaleString() : "";
        imageStr = item.ImageURL || item.Image || "";
        if (item.Category) meta.push(item.Category);
        if (item.City) meta.push(item.City);
      } else if (itemType === "business") {
        title = item.Title || item.BusinessName || "Business";
        subtitle = item.Category || "";
        imageStr = item.Logo || item.CoverImage || "";
        if (item.City) meta.push(item.City);
      } else if (itemType === "property") {
        title = item.Title || "Property";
        priceStr = item.Price ? '₹ ' + Number(item.Price).toLocaleString() : "";
        // Purpose: use canonical field, default to "For Sale" if not "Rent"
        var purposeLabel = item.Purpose === "Rent" ? "For Rent" : "For Sale";
        if (item.Type) meta.push(item.Type);
        if (purposeLabel) meta.push(purposeLabel);
        if (item.City) meta.push(item.City);
        var propImages = item.Images ? item.Images.split(",")[0].trim() : "";
        imageStr = propImages;
      } else if (itemType === "news") {
        title = item.Title || "News";
        subtitle = item.Category || "";
        imageStr = item.Image || "";
        if (item.City) meta.push(item.City);
        if (item.Source) meta.push(item.Source);
      }

      // Status color - only computed when status is valid
      var statusColor = "#888";
      if (status === "Published" || status === "Active") {
        statusColor = "#0f9d58";
      } else if (status === "Deleted") {
        statusColor = "#d32f2f";
      }

      contentHtml += '<div class="myContentItem">';
      contentHtml += '<div class="myContentItem-header">';
      // Use safeUpperCase - never throws
      contentHtml += '<span class="myContentItem-type">' + safeUpperCase(itemType) + '</span>';
      if (status) {
        contentHtml += '<span class="myContentItem-status" style="background:' + statusColor + ';color:#fff;">' + status + '</span>';
      }
      contentHtml += '</div>';

      // Image thumbnail
      if (imageStr) {
        contentHtml += '<div class="myContentItem-thumb"><img src="' + imageStr + '" alt="' + title + '" onerror="this.parentElement.style.display=\'none\'"></div>';
      }

      contentHtml += '<div class="myContentItem-body">';
      contentHtml += '<div class="myContentItem-title">' + title + '</div>';
      if (subtitle) {
        contentHtml += '<div class="myContentItem-subtitle">' + subtitle + '</div>';
      }
      if (priceStr) {
        contentHtml += '<div class="myContentItem-price">' + priceStr + '</div>';
      }
      if (meta.length > 0) {
        contentHtml += '<div class="myContentItem-meta">' + meta.join(" · ") + '</div>';
      }
      if (createdDate) {
        contentHtml += '<div class="myContentItem-date">' + createdDate + '</div>';
      }
      contentHtml += '</div>';

      // Actions
      contentHtml += '<div class="myContentItem-actions">';
      contentHtml += '<button onclick="viewMyContentItem(\'' + itemType + '\', \'' + itemId + '\')" title="View">View</button>';
      contentHtml += '<button onclick="editMyContentItem(\'' + itemType + '\', \'' + itemId + '\')" title="Edit">Edit</button>';
      contentHtml += '<button class="btn-danger" onclick="deleteMyContentItem(\'' + itemType + '\', \'' + itemId + '\')" title="Delete">Delete</button>';
      contentHtml += '</div>';

      contentHtml += '</div>';
    });
    contentHtml += '</div>';
  }

  container.innerHTML = tabsHtml + contentHtml;
}

/*
============================================================
SET MY CONTENT FILTER
============================================================
*/

function setMyContentFilter(filter) {
  CURRENT_MY_CONTENT_FILTER = filter;
  renderMyContent();
}

/*
============================================================
VIEW MY CONTENT ITEM
Reuses existing detail renderer
============================================================
*/

function viewMyContentItem(type, id) {
  if (!id) return;

  if (type === "product") {
    const product = MY_CONTENT_DATA.products.find(p => String(p.ProductID) === String(id));
    if (product) {
      showProductDetails(product);
      return;
    }
    // Fallback: fetch single product
    fetch(`${getApiUrl()}?action=product&id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          showProductDetails(res.data);
        }
      });
  } else if (type === "business") {
    const business = MY_CONTENT_DATA.businesses.find(b => String(b.BusinessID) === String(id));
    if (business) {
      showBusinessDetails(business);
      return;
    }
    fetch(`${getApiUrl()}?action=business&id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          showBusinessDetails(res.data);
        }
      });
  } else if (type === "property") {
    const property = MY_CONTENT_DATA.properties.find(p => String(p.PropertyID) === String(id));
    if (property) {
      showPropertyDetails(property);
      return;
    }
    // Property detail requires opening page then showing
    openPage("properties");
    setTimeout(() => {
      fetch(`${getApiUrl()}?action=property&id=${encodeURIComponent(id)}`)
        .then(r => r.json())
        .then(res => {
          if (res && res.success && res.data) {
            showPropertyDetails(res.data);
          }
        });
    }, 50);
  } else if (type === "news") {
    const news = MY_CONTENT_DATA.news.find(n => String(n.NewsID) === String(id));
    if (news) {
      showNewsDetails(news);
      return;
    }
    fetch(`${getApiUrl()}?action=article&id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          showNewsDetails(res.data);
        }
      });
  }
}

/*
============================================================
EDIT MY CONTENT ITEM
Reuses existing edit functions
============================================================
*/

function editMyContentItem(type, id) {
  if (!id) return;

  if (type === "product") {
    if (typeof updateProductForm === "function") {
      updateProductForm(id);
    }
  } else if (type === "business") {
    if (typeof updateBusinessForm === "function") {
      updateBusinessForm(id);
    }
  } else if (type === "property") {
    if (typeof updatePropertyForm === "function") {
      var property = MY_CONTENT_DATA.properties.find(function(p) { return String(p.PropertyID) === String(id); });
      updatePropertyForm(id, property);
    }
  } else if (type === "news") {
    if (typeof updateNewsForm === "function") {
      updateNewsForm(id);
    }
  }
}

/*
============================================================
DELETE MY CONTENT ITEM
Reuses existing delete functions + refreshes list
============================================================
*/

function deleteMyContentItem(type, id) {
  if (!id) return;

  const confirmMessages = {
    product: "Are you sure you want to delete this product?",
    business: "Are you sure you want to delete this business?",
    property: "Are you sure you want to delete this property?",
    news: "Are you sure you want to delete this news?"
  };

  if (!confirm(confirmMessages[type] || "Are you sure you want to delete this item?")) {
    return;
  }

  const userId = getUserId();
  let url = "";

  if (type === "product") {
    url = `${getApiUrl()}?action=deleteproduct&productId=${encodeURIComponent(id)}`;
  } else if (type === "business") {
    url = `${getApiUrl()}?action=deletebusiness&businessId=${encodeURIComponent(id)}`;
  } else if (type === "property") {
    url = `${getApiUrl()}?action=deleteproperty&propertyId=${encodeURIComponent(id)}`;
  } else if (type === "news") {
    url = `${getApiUrl()}?action=deletenews&newsId=${encodeURIComponent(id)}`;
  }

  if (!url) return;

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Deleted successfully");
        // Remove from local data
        if (type === "product") {
          MY_CONTENT_DATA.products = MY_CONTENT_DATA.products.filter(p => String(p.ProductID) !== String(id));
        } else if (type === "business") {
          MY_CONTENT_DATA.businesses = MY_CONTENT_DATA.businesses.filter(b => String(b.BusinessID) !== String(id));
        } else if (type === "property") {
          MY_CONTENT_DATA.properties = MY_CONTENT_DATA.properties.filter(p => String(p.PropertyID) !== String(id));
        } else if (type === "news") {
          MY_CONTENT_DATA.news = MY_CONTENT_DATA.news.filter(n => String(n.NewsID) !== String(id));
        }
        renderMyContent();
      } else {
        alert(res.message || "Failed to delete");
      }
    })
    .catch(function(err) {
      console.log("Delete error:", err);
      alert("Unable to delete. Please try again.");
    });
}

/*
============================================================
MY CONTENT PAGE INIT
============================================================
*/

function initMyContentPage() {
  // Page-specific initialization if needed
}