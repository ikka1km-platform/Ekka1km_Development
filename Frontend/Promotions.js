/*
============================================================
EKKA1KM FRONTEND
Promotions.js
Phase 3.7 - Promotion System
Create Promotion Wizard
============================================================
*/

/*
============================================================
OPEN PROMOTION WIZARD
============================================================
*/

function openPromotionWizard() {
  if (!requireLogin()) return;

  openPage("promotions");

  var container =
    document.getElementById(
      "promotionsContent"
    );

  container.innerHTML =
    '<div class="card" style="text-align:center;padding:30px;">' +
    "<p>Loading promotion wizard...</p></div>";

  // Load user's products, businesses, properties for target selection
  var userId = getUserId();
  var url =
    getApiUrl() +
    "?action=products&userId=" +
    encodeURIComponent(userId);

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      var products =
        res && res.data
          ? res.data.data || []
          : [];
      renderPromotionWizard(
        products
      );
    })
    .catch(function(err) {
      console.log(
        "Promotion wizard error:",
        err
      );
      renderPromotionWizard([]);
    });
}


/*
============================================================
RENDER PROMOTION WIZARD
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


function renderPromotionWizard(
  products
) {
  var container =
    document.getElementById(
      "promotionsContent"
    );

  if (!container) return;

  var html = "";

  // Step indicator
  html +=
    '<div style="display:flex;gap:8px;margin-bottom:15px;overflow-x:auto;">';
  for (
    var s = 1;
    s <= 6;
    s++
  ) {
    var active =
      s === PROMO_STEP
        ? "background:var(--primary);color:#fff;"
        : "background:#f0f0f0;color:#888;";
    html +=
      '<div style="' +
      active +
      'padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">Step ' +
      s +
      "</div>";
  }
  html += "</div>";

  if (PROMO_STEP === 1) {
    // Step 1: Select Target Type
    html +=
      '<div class="card"><h3>Step 1: Select Target</h3>';
    html +=
      '<p style="font-size:13px;color:#888;margin-bottom:12px;">What do you want to promote?</p>';
    html +=
      '<select id="promoWizTargetType">';
    html +=
      '<option value="Product">Product</option>';
    html +=
      '<option value="Business">Business</option>';
    html +=
      '<option value="Property">Property</option>';
    html += "</select>";

    html +=
      '<label style="font-size:13px;font-weight:500;display:block;margin-bottom:4px;">Select Target ID</label>';
    html +=
      '<select id="promoWizTargetId">';
    if (
      products.length > 0
    ) {
      products.forEach(
        function(p) {
          html +=
            '<option value="' +
            p.ProductID +
            '">' +
            (p.Title ||
              "Product") +
            " (₹" +
            (p.Price ||
              "0") +
            ")</option>";
        }
      );
    } else {
      html +=
        '<option value="">No products found</option>';
    }
    html += "</select>";

    html +=
      '<button onclick="promoNextStep()" style="margin-top:15px;">Next</button>';
    html += "</div>";
  } else if (
    PROMO_STEP === 2
  ) {
    // Step 2: Select Radius
    html +=
      '<div class="card"><h3>Step 2: Select Radius</h3>';
    html +=
      '<p style="font-size:13px;color:#888;margin-bottom:12px;">Choose the reach of your promotion.</p>';
    html +=
      '<select id="promoWizRadius">';
    var radii = [
      "1",
      "5",
      "10",
      "25",
      "51",
      "100",
      "All India"
    ];
    radii.forEach(
      function(r) {
        var sel =
          r ===
          PROMO_SELECTIONS.radius
            ? "selected"
            : "";
        html +=
          '<option value="' +
          r +
          '" ' +
          sel +
          ">" +
          r +
          " KM</option>";
      }
    );
    html += "</select>";
    html +=
      '<button onclick="promoNextStep()" style="margin-top:15px;">Next</button>';
    html +=
      '<button class="btn-gray" onclick="promoPrevStep()">Back</button>';
    html += "</div>";
  } else if (
    PROMO_STEP === 3
  ) {
    // Step 3: Select Duration
    html +=
      '<div class="card"><h3>Step 3: Select Duration</h3>';
    html +=
      '<p style="font-size:13px;color:#888;margin-bottom:12px;">How long should your promotion run?</p>';
    html +=
      '<select id="promoWizDuration">';
    var durations = [
      { value: "1", label: "1 Day" },
      { value: "3", label: "3 Days" },
      { value: "7", label: "7 Days" },
      { value: "15", label: "15 Days" },
      { value: "30", label: "30 Days" }
    ];
    durations.forEach(
      function(d) {
        var sel =
          d.value ===
          PROMO_SELECTIONS.duration
            ? "selected"
            : "";
        html +=
          '<option value="' +
          d.value +
          '" ' +
          sel +
          ">" +
          d.label +
          "</option>";
      }
    );
    html += "</select>";
    html +=
      '<button onclick="promoNextStep()" style="margin-top:15px;">Next</button>';
    html +=
      '<button class="btn-gray" onclick="promoPrevStep()">Back</button>';
    html += "</div>";
  } else if (
    PROMO_STEP === 4
  ) {
    // Step 4: Select Promotion Type
    html +=
      '<div class="card"><h3>Step 4: Select Promotion Type</h3>';
    html +=
      '<p style="font-size:13px;color:#888;margin-bottom:12px;">Choose your promotion tier.</p>';

    var types = [
      {
        id: "Silver",
        name: "Silver",
        desc: "Basic promotion",
        color: "#888"
      },
      {
        id: "Gold",
        name: "Gold",
        desc: "Better visibility",
        color: "#f57c00"
      },
      {
        id: "Titanium",
        name: "Titanium",
        desc: "Maximum exposure",
        color: "#0f9d58"
      }
    ];

    types.forEach(
      function(t) {
        var sel =
          t.id ===
          PROMO_SELECTIONS.promotionType
            ? "border:2px solid " +
              t.color +
              ";"
            : "border:1px solid #ddd;";
        html +=
          '<div onclick="selectPromoType(\'' +
          t.id +
          '\')" style="' +
          sel +
          'padding:15px;border-radius:12px;margin-bottom:10px;cursor:pointer;background:#f9f9f9;">' +
          '<h4 style="color:' +
          t.color +
          ';">' +
          t.name +
          "</h4>" +
          '<p style="font-size:13px;color:#888;margin:0;">' +
          t.desc +
          "</p></div>";
      }
    );

    html +=
      '<button onclick="promoNextStep()" style="margin-top:15px;">Next</button>';
    html +=
      '<button class="btn-gray" onclick="promoPrevStep()">Back</button>';
    html += "</div>";
  } else if (
    PROMO_STEP === 5
  ) {
    // Step 5: Calculate Cost
    html +=
      '<div class="card"><h3>Step 5: Calculate Cost</h3>';

    // Calculate price
    var url =
      getApiUrl() +
      "?action=calculatepromotionprice" +
      "&promotionType=" +
      encodeURIComponent(
        PROMO_SELECTIONS.promotionType
      ) +
      "&radius=" +
      encodeURIComponent(
        PROMO_SELECTIONS.radius
      ) +
      "&duration=" +
      encodeURIComponent(
        PROMO_SELECTIONS.duration
      );

    // We'll fetch and display
    html +=
      '<div id="promoPriceDisplay">';
    html +=
      '<p style="font-size:13px;color:#888;">Calculating price...</p>';
    html += "</div>";

    html +=
      '<button onclick="promoNextStep()" style="margin-top:15px;" id="promoNextBtn5">Next</button>';
    html +=
      '<button class="btn-gray" onclick="promoPrevStep()">Back</button>';
    html += "</div>";

    container.innerHTML = html;

    // Fetch price
    fetch(url)
      .then(function(r) {
        return r.json();
      })
      .then(function(res) {
        var display =
          document.getElementById(
            "promoPriceDisplay"
          );
        if (
          res &&
          res.success &&
          res.data
        ) {
          PROMO_SELECTIONS.totalPrice =
            res.data.totalPrice;
          display.innerHTML =
            '<div style="padding:15px;background:#e8f5e9;border-radius:12px;">' +
            '<p style="font-size:14px;color:#333;"><strong>Type:</strong> ' +
            res.data.promotionType +
            "</p>" +
            '<p style="font-size:14px;color:#333;"><strong>Radius:</strong> ' +
            res.data.radius +
            " KM</p>" +
            '<p style="font-size:14px;color:#333;"><strong>Duration:</strong> ' +
            res.data.duration +
            "</p>" +
            '<h2 style="color:var(--primary);margin-top:10px;">' +
            res.data.totalPrice +
            " Coins</h2>" +
            "</div>";
        } else {
          display.innerHTML =
            '<p style="color:red;">Error calculating price</p>';
        }
      })
      .catch(function(err) {
        console.log(
          "Price calc error:",
          err
        );
      });

    return;
  } else if (
    PROMO_STEP === 6
  ) {
    // Step 6: Confirm & Activate
    html +=
      '<div class="card"><h3>Step 6: Confirm & Activate</h3>';

    html +=
      '<div style="padding:15px;background:#f9f9f9;border-radius:12px;margin-bottom:15px;">';
    html +=
      '<p><strong>Target:</strong> ' +
      PROMO_SELECTIONS.targetType +
      " (" +
      PROMO_SELECTIONS.targetId +
      ")</p>";
    html +=
      '<p><strong>Type:</strong> ' +
      PROMO_SELECTIONS.promotionType +
      "</p>";
    html +=
      '<p><strong>Radius:</strong> ' +
      PROMO_SELECTIONS.radius +
      " KM</p>";
    html +=
      '<p><strong>Duration:</strong> ' +
      PROMO_SELECTIONS.duration +
      " day(s)</p>";
    html +=
      '<h2 style="color:var(--primary);margin-top:10px;">Total: ' +
      PROMO_SELECTIONS.totalPrice +
      " Coins</h2>";
    html += "</div>";

    html +=
      '<button onclick="activatePromotion()" style="background:#e65100;">Activate Campaign</button>';
    html +=
      '<button class="btn-gray" onclick="promoPrevStep()">Back</button>';
    html += "</div>";
  }

  container.innerHTML = html;
}


/*
============================================================
PROMOTION WIZARD NAVIGATION
============================================================
*/

function promoNextStep() {
  // Save selections
  if (PROMO_STEP === 1) {
    var targetType =
      document.getElementById(
        "promoWizTargetType"
      );
    var targetId =
      document.getElementById(
        "promoWizTargetId"
      );
    if (targetType)
      PROMO_SELECTIONS.targetType =
        targetType.value;
    if (targetId)
      PROMO_SELECTIONS.targetId =
        targetId.value;
  } else if (
    PROMO_STEP === 2
  ) {
    var radius =
      document.getElementById(
        "promoWizRadius"
      );
    if (radius)
      PROMO_SELECTIONS.radius =
        radius.value;
  } else if (
    PROMO_STEP === 3
  ) {
    var duration =
      document.getElementById(
        "promoWizDuration"
      );
    if (duration)
      PROMO_SELECTIONS.duration =
        duration.value;
  }

  PROMO_STEP++;
  renderPromotionWizard([]);
}


function promoPrevStep() {
  PROMO_STEP--;
  if (PROMO_STEP < 1)
    PROMO_STEP = 1;
  renderPromotionWizard([]);
}


function selectPromoType(type) {
  PROMO_SELECTIONS.promotionType =
    type;
  renderPromotionWizard([]);
}


/*
============================================================
ACTIVATE PROMOTION
============================================================
*/

function activatePromotion() {
  var userId = getUserId();
  if (!userId) {
    requireLogin();
    return;
  }

  var url =
    getApiUrl() +
    "?action=createpromotion" +
    "&userId=" +
    encodeURIComponent(userId) +
    "&promotionType=" +
    encodeURIComponent(
      PROMO_SELECTIONS.promotionType
    ) +
    "&targetType=" +
    encodeURIComponent(
      PROMO_SELECTIONS.targetType
    ) +
    "&targetId=" +
    encodeURIComponent(
      PROMO_SELECTIONS.targetId
    ) +
    "&radius=" +
    encodeURIComponent(
      PROMO_SELECTIONS.radius
    ) +
    "&duration=" +
    encodeURIComponent(
      PROMO_SELECTIONS.duration
    );

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
          "Promotion activated successfully! Coins spent: " +
            res.data.coinsSpent
        );
        PROMO_STEP = 1;
        openPage("dashboard");
      } else {
        alert(
          res.message ||
            "Failed to create promotion"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Activate promotion error:",
        err
      );
      alert(
        "Error creating promotion"
      );
    });
}


/*
============================================================
LOAD MY PROMOTIONS
============================================================
*/

function loadMyPromotions() {
  var userId = getUserId();
  if (!userId) return;

  var url =
    getApiUrl() +
    "?action=getuserpromotions" +
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
        renderMyPromotions(
          res.data
        );
      }
    })
    .catch(function(err) {
      console.log(
        "My promotions error:",
        err
      );
    });
}


/*
============================================================
RENDER MY PROMOTIONS
============================================================
*/

function renderMyPromotions(data) {
  var container =
    document.getElementById(
      "myPromotionsList"
    );

  if (!container) return;

  var promotions =
    data.data || [];

  if (promotions.length === 0) {
    container.innerHTML =
      '<div class="dashboardEmpty">No promotions yet</div>';
    return;
  }

  var html = "";
  promotions.forEach(
    function(p) {
      var statusColor =
        p.Status === "Active"
          ? "#0f9d58"
          : p.Status ===
            "Stopped"
          ? "#d32f2f"
          : "#888";
      html +=
        '<div class="dashboardActivityCard">';
      html +=
        '<div class="dashboardActivityItem">';
      html +=
        '<div class="title">' +
        (p.PromotionType ||
          "Promotion") +
        " - " +
        (p.TargetType ||
          "") +
        "</div>";
      html +=
        '<div class="meta">Radius: ' +
        (p.Radius || "") +
        " KM | Duration: " +
        (p.Duration || "") +
        " day(s)</div>";
      html +=
        '<div class="meta">Spent: ' +
        (p.CoinsSpent ||
          "0") +
        " coins | Status: <span style='color:" +
        statusColor +
        ";font-weight:600;'>" +
        (p.Status ||
          "") +
        "</span></div>";
      html +=
        '<div class="meta" style="font-size:10px;color:#aaa;">' +
        (p.CreatedDate ||
          "") +
        "</div>";

      if (
        p.Status === "Active"
      ) {
        html +=
          '<button class="btn-danger" onclick="stopPromotion(\'' +
          p.PromotionID +
          '\')" style="margin-top:8px;font-size:12px;padding:8px;">Stop Promotion</button>';
      }

      html +=
        "</div></div>";
    }
  );

  container.innerHTML = html;
}


/*
============================================================
STOP PROMOTION
============================================================
*/

function stopPromotion(promotionId) {
  if (
    !confirm(
      "Are you sure you want to stop this promotion?"
    )
  ) {
    return;
  }

  var url =
    getApiUrl() +
    "?action=stoppromotion" +
    "&promotionId=" +
    encodeURIComponent(
      promotionId
    );

  fetch(url)
    .then(function(r) {
      return r.json();
    })
    .then(function(res) {
      if (
        res &&
        res.success
      ) {
        loadMyPromotions();
      } else {
        alert(
          res.message ||
            "Failed to stop promotion"
        );
      }
    })
    .catch(function(err) {
      console.log(
        "Stop promotion error:",
        err
      );
    });
}