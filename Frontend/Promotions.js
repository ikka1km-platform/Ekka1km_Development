/*
============================================================
EKKA1KM FRONTEND
Promotions.js
Stage 4HIJ - Promotion Wizard & List Redesign
V2.0
Preserves ALL canonical promotion logic, coin calculations,
wallet integration, campaign logic, economy safeguards
============================================================
*/

var PROMO_STEP = 1;
var PROMO_SELECTIONS = {
  targetType: "Product",
  targetId: "",
  promotionType: "Silver",
  radius: "51",
  duration: "7",
  totalPrice: 0
};


/*
============================================================
OPEN PROMOTION WIZARD — Stage 4HIJ Redesign
============================================================
*/

function openPromotionWizard() {
  if (!requireLogin()) return;

  openPage("promotions");

  var container = document.getElementById("promotionsContent");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">trending_up</i><p>Loading promotion wizard...</p></div>';

  // Load user's products for target selection
  var userId = getUserId();
  var url = getApiUrl() + "?action=products&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var products = res && res.data ? res.data.data || [] : [];
      renderPromotionWizard(products);
    })
    .catch(function(err) {
      console.log("Promotion wizard error:", err);
      renderPromotionWizard([]);
    });
}


/*
============================================================
RENDER PROMOTION WIZARD — Stage 4HIJ Redesign
============================================================
*/

function renderPromotionWizard(products) {
  var container = document.getElementById("promotionsContent");
  if (!container) return;

  var html = '<div class="promo-hij-wizard">';

  // Step indicator
  html += '<div style="display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding:2px 0;">';
  for (var s = 1; s <= 6; s++) {
    var active = s === PROMO_STEP ? 'background:var(--primary);color:#fff;' : 'background:#f0f0f0;color:#888;';
    html += '<div style="' + active + 'padding:6px 12px;border-radius:16px;font-size:11px;font-weight:600;white-space:nowrap;">Step ' + s + '</div>';
  }
  html += '</div>';

  if (PROMO_STEP === 1) {
    // Step 1: Select Target Type
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">1</span> Select Target</div>';
    html += '<p style="font-size:13px;color:#888;margin-bottom:12px;">What do you want to promote?</p>';

    html += '<div class="promo-hij-field">';
    html += '<label>Target Type</label>';
    html += '<select id="promoWizTargetType">';
    html += '<option value="Product">Product</option>';
    html += '<option value="Business">Business</option>';
    html += '<option value="Property">Property</option>';
    html += '</select>';
    html += '</div>';

    html += '<div class="promo-hij-field">';
    html += '<label>Select Item</label>';
    html += '<select id="promoWizTargetId">';
    if (products.length > 0) {
      products.forEach(function(p) {
        html += '<option value="' + p.ProductID + '">' + (p.Title || "Product") + " (₹" + (p.Price || "0") + ")</option>";
      });
    } else {
      html += '<option value="">No products found</option>';
    }
    html += '</select>';
    html += '</div>';

    html += '<button class="promo-hij-submit" onclick="promoNextStep()">Next Step</button>';
    html += '</div>';

  } else if (PROMO_STEP === 2) {
    // Step 2: Select Radius
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">2</span> Select Radius</div>';
    html += '<p style="font-size:13px;color:#888;margin-bottom:12px;">Choose the reach of your promotion.</p>';

    html += '<div class="promo-hij-field">';
    html += '<label>Radius</label>';
    html += '<select id="promoWizRadius">';
    var radii = ["1","5","10","25","51","100","All India"];
    radii.forEach(function(r) {
      var sel = r === PROMO_SELECTIONS.radius ? "selected" : "";
      html += '<option value="' + r + '" ' + sel + '>' + r + ' KM</option>';
    });
    html += '</select>';
    html += '</div>';

    html += '<button class="promo-hij-submit" onclick="promoNextStep()">Next Step</button>';
    html += '<button class="productCard-btnSecondary" onclick="promoPrevStep()" style="width:100%;margin-top:8px;">Back</button>';
    html += '</div>';

  } else if (PROMO_STEP === 3) {
    // Step 3: Select Duration
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">3</span> Select Duration</div>';
    html += '<p style="font-size:13px;color:#888;margin-bottom:12px;">How long should your promotion run?</p>';

    html += '<div class="promo-hij-field">';
    html += '<label>Duration</label>';
    html += '<select id="promoWizDuration">';
    var durations = [
      { value: "1", label: "1 Day" },
      { value: "3", label: "3 Days" },
      { value: "7", label: "7 Days" },
      { value: "15", label: "15 Days" },
      { value: "30", label: "30 Days" }
    ];
    durations.forEach(function(d) {
      var sel = d.value === PROMO_SELECTIONS.duration ? "selected" : "";
      html += '<option value="' + d.value + '" ' + sel + '>' + d.label + "</option>";
    });
    html += '</select>';
    html += '</div>';

    html += '<button class="promo-hij-submit" onclick="promoNextStep()">Next Step</button>';
    html += '<button class="productCard-btnSecondary" onclick="promoPrevStep()" style="width:100%;margin-top:8px;">Back</button>';
    html += '</div>';

  } else if (PROMO_STEP === 4) {
    // Step 4: Select Promotion Type
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">4</span> Select Promotion Type</div>';
    html += '<p style="font-size:13px;color:#888;margin-bottom:12px;">Choose your promotion tier.</p>';

    var types = [
      { id: "Silver", name: "Silver", desc: "Basic promotion — standard visibility", color: "#888" },
      { id: "Gold", name: "Gold", desc: "Better visibility — highlighted placement", color: "#f57c00" },
      { id: "Titanium", name: "Titanium", desc: "Maximum exposure — top placement", color: "#0f9d58" }
    ];

    types.forEach(function(t) {
      var sel = t.id === PROMO_SELECTIONS.promotionType ? 'border:2px solid ' + t.color + ';' : 'border:1px solid #ddd;';
      html += '<div onclick="selectPromoType(\'' + t.id + '\')" style="' + sel + 'padding:14px;border-radius:12px;margin-bottom:8px;cursor:pointer;background:#f9f9f9;">';
      html += '<h4 style="color:' + t.color + ';margin:0 0 4px;">' + t.name + '</h4>';
      html += '<p style="font-size:12px;color:#888;margin:0;">' + t.desc + '</p></div>';
    });

    html += '<button class="promo-hij-submit" onclick="promoNextStep()" style="margin-top:12px;">Next Step</button>';
    html += '<button class="productCard-btnSecondary" onclick="promoPrevStep()" style="width:100%;margin-top:8px;">Back</button>';
    html += '</div>';

  } else if (PROMO_STEP === 5) {
    // Step 5: Calculate Cost
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">5</span> Calculate Cost</div>';

    var calcUrl = getApiUrl() +
      "?action=calculatepromotionprice" +
      "&promotionType=" + encodeURIComponent(PROMO_SELECTIONS.promotionType) +
      "&radius=" + encodeURIComponent(PROMO_SELECTIONS.radius) +
      "&duration=" + encodeURIComponent(PROMO_SELECTIONS.duration);

    html += '<div id="promoPriceDisplay">';
    html += '<p style="font-size:13px;color:#888;">Calculating price...</p>';
    html += '</div>';

    html += '<button class="promo-hij-submit" onclick="promoNextStep()" style="margin-top:12px;" id="promoNextBtn5">Next Step</button>';
    html += '<button class="productCard-btnSecondary" onclick="promoPrevStep()" style="width:100%;margin-top:8px;">Back</button>';
    html += '</div>';

    container.innerHTML = html;

    // Fetch price
    fetch(calcUrl)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var display = document.getElementById("promoPriceDisplay");
        if (display && res && res.success && res.data) {
          PROMO_SELECTIONS.totalPrice = res.data.totalPrice;
          display.innerHTML = '<div class="promo-hij-summary">' +
            '<p><strong>Type:</strong> ' + res.data.promotionType + '</p>' +
            '<p><strong>Radius:</strong> ' + res.data.radius + ' KM</p>' +
            '<p><strong>Duration:</strong> ' + res.data.duration + ' day(s)</p>' +
            '<h2 style="color:var(--primary);margin-top:10px;">' + res.data.totalPrice + ' Coins</h2>' +
            '</div>';
        } else if (display) {
          display.innerHTML = '<p style="color:#c62828;">Error calculating price</p>';
        }
      })
      .catch(function(err) {
        console.log("Price calc error:", err);
      });

    return;

  } else if (PROMO_STEP === 6) {
    // Step 6: Confirm & Activate
    html += '<div class="promo-hij-step">';
    html += '<div class="promo-hij-stepTitle"><span class="promo-hij-stepNumber">6</span> Confirm & Activate</div>';

    html += '<div class="promo-hij-summary">';
    html += '<p><strong>Target:</strong> ' + PROMO_SELECTIONS.targetType + ' (' + PROMO_SELECTIONS.targetId + ')</p>';
    html += '<p><strong>Type:</strong> ' + PROMO_SELECTIONS.promotionType + '</p>';
    html += '<p><strong>Radius:</strong> ' + PROMO_SELECTIONS.radius + ' KM</p>';
    html += '<p><strong>Duration:</strong> ' + PROMO_SELECTIONS.duration + ' day(s)</p>';
    html += '<h2 style="color:var(--primary);margin-top:10px;">Total: ' + PROMO_SELECTIONS.totalPrice + ' Coins</h2>';
    html += '</div>';

    html += '<button class="promo-hij-submit" onclick="activatePromotion()" style="background:#e65100;">Activate Campaign</button>';
    html += '<button class="productCard-btnSecondary" onclick="promoPrevStep()" style="width:100%;margin-top:8px;">Back</button>';
    html += '</div>';
  }

  html += '</div>'; // promo-hij-wizard
  container.innerHTML = html;
}


/*
============================================================
PROMOTION WIZARD NAVIGATION (Preserved)
============================================================
*/

function promoNextStep() {
  // Save selections
  if (PROMO_STEP === 1) {
    var targetType = document.getElementById("promoWizTargetType");
    var targetId = document.getElementById("promoWizTargetId");
    if (targetType) PROMO_SELECTIONS.targetType = targetType.value;
    if (targetId) PROMO_SELECTIONS.targetId = targetId.value;
  } else if (PROMO_STEP === 2) {
    var radius = document.getElementById("promoWizRadius");
    if (radius) PROMO_SELECTIONS.radius = radius.value;
  } else if (PROMO_STEP === 3) {
    var duration = document.getElementById("promoWizDuration");
    if (duration) PROMO_SELECTIONS.duration = duration.value;
  }

  PROMO_STEP++;
  renderPromotionWizard([]);
}


function promoPrevStep() {
  PROMO_STEP--;
  if (PROMO_STEP < 1) PROMO_STEP = 1;
  renderPromotionWizard([]);
}


function selectPromoType(type) {
  PROMO_SELECTIONS.promotionType = type;
  renderPromotionWizard([]);
}


/*
============================================================
ACTIVATE PROMOTION (Preserved — canonical economy logic)
============================================================
*/

function activatePromotion() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url = getApiUrl() +
    "?action=createpromotion" +
    "&userId=" + encodeURIComponent(userId) +
    "&promotionType=" + encodeURIComponent(PROMO_SELECTIONS.promotionType) +
    "&targetType=" + encodeURIComponent(PROMO_SELECTIONS.targetType) +
    "&targetId=" + encodeURIComponent(PROMO_SELECTIONS.targetId) +
    "&radius=" + encodeURIComponent(PROMO_SELECTIONS.radius) +
    "&duration=" + encodeURIComponent(PROMO_SELECTIONS.duration);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        alert("Promotion activated successfully! Coins spent: " + (res.data ? res.data.coinsSpent : ""));
        PROMO_STEP = 1;
        openPage("dashboard");
      } else {
        alert(res.message || "Failed to create promotion");
      }
    })
    .catch(function(err) {
      console.log("Activate promotion error:", err);
      alert("Error creating promotion");
    });
}


/*
============================================================
LOAD MY PROMOTIONS — Stage 4HIJ Redesign
============================================================
*/

function loadMyPromotions() {
  var userId = getUserId();
  if (!userId) return;

  var container = document.getElementById("myPromotionsList");
  if (!container) return;

  container.innerHTML = '<div class="hij-loading"><i class="material-icons">trending_up</i><p>Loading promotions...</p></div>';

  var url = getApiUrl() + "?action=getuserpromotions&userId=" + encodeURIComponent(userId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderMyPromotions(res.data);
      } else {
        container.innerHTML = '<div class="hij-empty"><i class="material-icons">trending_up</i><p>No promotions yet</p></div>';
      }
    })
    .catch(function(err) {
      console.log("My promotions error:", err);
      container.innerHTML = '<div class="hij-error"><i class="material-icons">error_outline</i><p>Error loading promotions</p></div>';
    });
}


/*
============================================================
RENDER MY PROMOTIONS — Stage 4HIJ Redesign
============================================================
*/

function renderMyPromotions(data) {
  var container = document.getElementById("myPromotionsList");
  if (!container) return;

  var promotions = data.data || [];

  if (promotions.length === 0) {
    container.innerHTML = '<div class="hij-empty"><i class="material-icons">trending_up</i><p>No promotions yet</p></div>';
    return;
  }

  var html = "";
  promotions.forEach(function(p) {
    var status = p.Status || "";
    var statusClass = "";
    if (status === "Active") statusClass = "active";
    else if (status === "Pending") statusClass = "pending";
    else if (status === "Stopped" || status === "Expired" || status === "Completed") statusClass = "completed";

    html += '<div class="promotion-hij-card">';
    html += '<div class="promotion-hij-header">';
    html += '<div class="promotion-hij-title">' + (p.PromotionType || "Promotion") + ' — ' + (p.TargetType || "") + '</div>';
    html += '<span class="promotion-hij-status ' + statusClass + '">' + status + '</span>';
    html += '</div>';

    html += '<div class="promotion-hij-details">';
    html += '<span>📍 Radius: ' + (p.Radius || "") + ' KM</span>';
    html += '<span>📅 Duration: ' + (p.Duration || "") + ' day(s)</span>';
    html += '<span>💰 Spent: ' + (p.CoinsSpent || "0") + ' coins</span>';
    html += '</div>';

    html += '<div class="promotion-hij-meta">' + (p.CreatedDate || "") + '</div>';

    if (status === "Active") {
      html += '<button class="btn-danger" onclick="stopPromotion(\'' + p.PromotionID + '\')" style="margin-top:8px;font-size:12px;padding:8px;">Stop Promotion</button>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
}


/*
============================================================
STOP PROMOTION (Preserved)
============================================================
*/

function stopPromotion(promotionId) {
  if (!confirm("Are you sure you want to stop this promotion?")) return;

  var url = getApiUrl() + "?action=stoppromotion&promotionId=" + encodeURIComponent(promotionId);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success) {
        loadMyPromotions();
      } else {
        alert(res.message || "Failed to stop promotion");
      }
    })
    .catch(function(err) {
      console.log("Stop promotion error:", err);
    });
}