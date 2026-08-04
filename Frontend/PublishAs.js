/*
============================================================
EKKA1KM FRONTEND
PublishAs.js
"Publish As" selector for Products & Properties

- Reuses the EXISTING businesses API (?action=businesses&userId=)
  to list the logged-in user's businesses. No fake data.
- Reuses the EXISTING posting flow (openPostForm / openPostProductForm
  / openPostPropertyForm / submitProduct / submitProperty).
- No new APIs, no routing changes, no duplicate business logic.
- Edit mode (updateProductForm / updatePropertyForm) is NOT intercepted
  and continues to open the form exactly as today.

Load order: this file MUST load AFTER Post.js, PostProduct.js and
PostProperty.js (see index.html script tags) so the wrappers below
override the original create entry points.
============================================================
*/

/* ---- Publisher selection state (in-memory, per session) ---- */
var PUBLISH_AS = {
  product:  { businessId: "", name: "Personal Listing", subtext: "Sell from your personal profile." },
  property: { businessId: "", name: "Personal Listing", subtext: "Sell from your personal profile." },
  _pending: null /* { type, onContinue, options:[{bid,name,category,city}] } */
};


/* ---- Tiny self-contained escapers (no external dependency) ---- */
function __publishAsEscHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function __publishAsEscAttr(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* ============================================================
   PUBLIC GETTERS / SETTERS
   Used by the existing submitProduct() / submitProperty() and by
   the indicator UI.
   ============================================================ */

function getPublishAsBusinessId(type) {
  var s = PUBLISH_AS[type];
  return s ? (s.businessId || "") : "";
}

function getPublishAsSubtext(type) {
  var s = PUBLISH_AS[type];
  return s ? (s.subtext || "") : "";
}

function getPublishAsName(type) {
  var s = PUBLISH_AS[type];
  return s ? (s.name || "Personal Listing") : "Personal Listing";
}

function setPublishAsChoice(type, businessId, name, subtext) {
  if (!PUBLISH_AS[type]) return;
  PUBLISH_AS[type].businessId = businessId || "";
  PUBLISH_AS[type].name = name || "Personal Listing";
  if (subtext !== undefined) PUBLISH_AS[type].subtext = subtext;
}


/* ============================================================
   LOAD THE LOGGED-IN USER'S BUSINESSES
   Reuses the existing ?action=businesses&userId= endpoint that
   MyContent.js and loadMyBusinesses() already use in production.
   ============================================================ */

function loadMyBusinessesForSelector() {
  var userId = getUserId();
  if (!userId) return Promise.resolve([]);

  var url = getApiUrl() + "?action=businesses&userId=" + encodeURIComponent(userId);

  return fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (res && res.success && res.data && res.data.data) return res.data.data;
      return [];
    })
    .catch(function (err) {
      console.log("PublishAs: load businesses error:", err);
      return [];
    });
}


/* ============================================================
   STYLES (injected once, scoped under "publishAs" prefix)
   ============================================================ */

function __publishAsInjectStyles() {
  if (document.getElementById("publishAsStyles")) return;

  var css = "";
  css += ".publishAsSelectorOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}";
  css += ".publishAsSelectorCard{background:#fff;width:100%;max-width:420px;max-height:85vh;overflow:auto;border-radius:14px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);box-sizing:border-box;}";
  css += ".publishAsSelectorTitle{font-size:16px;font-weight:700;margin-bottom:14px;color:#222;}";
  css += ".publishAsSelectorLoading{padding:24px 0;text-align:center;color:#888;}";
  css += ".publishAsOption{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s;}";
  css += ".publishAsOption:hover{background:#f7f7f7;}";
  css += ".publishAsOption input[type=radio]{margin:2px 0 0 0;accent-color:#2e7d32;}";
  css += ".publishAsOption-selected,.publishAsOption-selected:hover{background:#e8f5e9;border-color:#2e7d32;}";
  css += ".publishAsOption-icon{font-size:22px;line-height:1;}";
  css += ".publishAsOption-body{flex:1;min-width:0;}";
  css += ".publishAsOption-name{font-size:14px;font-weight:600;color:#222;}";
  css += ".publishAsOption-sub{font-size:12px;color:#666;margin-top:2px;}";
  css += ".publishAsOptionIcon{font-size:18px;}";
  css += ".publishAsOptionName{font-size:14px;color:#222;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}";
  css += ".publishAsSelectorActions{display:flex;gap:10px;margin-top:16px;}";
  css += ".publishAsSelectorActions button{flex:1;}";
  css += ".publishAsSelectorContinue{background:#1976d2;color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;}";
  css += ".publishAsIndicator{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f4f8ff;border:1px solid #d6e4ff;border-radius:10px;padding:10px 12px;margin:0 0 12px 0;}";
  css += ".publishAsIndicator-left{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}";
  css += ".publishAsIndicator-label{font-size:11px;color:#666;}";
  css += ".publishAsIndicator-value{font-size:14px;font-weight:600;color:#222;display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}";
  css += ".publishAsIndicator-change{background:transparent;border:1px solid #1976d2;color:#1976d2;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}";
  css += ".publishAsIndicator-sub{font-size:12px;color:#555;margin-top:1px;}";

  var st = document.createElement("style");
  st.id = "publishAsStyles";
  st.innerHTML = css;
  document.head.appendChild(st);
}


/* ============================================================
   "PUBLISH AS" SELECTOR MODAL
   ============================================================ */

function showPublishAsSelector(type, onContinue) {
  __publishAsInjectStyles();
  closePublishAsSelector();

  var overlay = document.createElement("div");
  overlay.id = "publishAsSelectorOverlay";
  overlay.className = "publishAsSelectorOverlay";
  overlay.innerHTML =
    '<div class="publishAsSelectorCard">' +
    '<div class="publishAsSelectorTitle">Publish this listing as</div>' +
    '<div class="publishAsSelectorLoading">Loading...</div>' +
    '</div>';
  document.body.appendChild(overlay);

  /* Backdrop click closes the selector */
  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) closePublishAsSelector();
  });

  PUBLISH_AS._pending = {
    type: type,
    onContinue: onContinue,
    options: [{ bid: "", name: "Personal Listing" }]
  };

  loadMyBusinessesForSelector().then(function (businesses) {
    /* Guard: selector may have been closed/changed while loading */
    if (!PUBLISH_AS._pending || PUBLISH_AS._pending.type !== type) return;

    var options = [{ bid: "", name: "Personal Listing", category: "", city: "" }];
    (businesses || []).forEach(function (b) {
      var bid = b.BusinessID || b.businessId || "";
      var bname = b.BusinessName || b.Title || b.Name || "Business";
      var cat = b.Category || b.category || "";
      var city = b.City || b.city || "";
      if (bid) options.push({ bid: bid, name: bname, category: cat, city: city });
    });
    PUBLISH_AS._pending.options = options;

    var current = getPublishAsBusinessId(type);

    var html = '<div class="publishAsSelectorCard">';
    html += '<div class="publishAsSelectorTitle">Publish this listing as</div>';

    options.forEach(function (o) {
      var checked = (current === o.bid) ? "checked" : "";
      var sel = checked ? " publishAsOption-selected" : "";
      var icon = o.bid ? "\uD83C\uDFEA" : "\uD83D\uDC64";
      var sub = o.bid
        ? ((o.category || "") + (o.category && o.city ? " \u2022 " : "") + (o.city || ""))
        : "Sell from your personal profile.";
      html += '<label class="publishAsOption' + sel + '">';
      html += '<input type="radio" name="publishAsChoice_' + type + '" value="' + __publishAsEscAttr(o.bid) + '" ' + checked + ' onchange="highlightPublishAsOption(this)">';
      html += '<span class="publishAsOption-icon">' + icon + '</span>';
      html += '<span class="publishAsOption-body">';
      html += '<span class="publishAsOption-name">' + __publishAsEscHtml(o.name) + '</span>';
      html += '<span class="publishAsOption-sub">' + __publishAsEscHtml(sub) + '</span>';
      html += '</span>';
      html += '</label>';
    });

    html += '<div class="publishAsSelectorActions">';
    html += '<button class="btn-gray" onclick="closePublishAsSelector()">Cancel</button>';
    html += '<button class="publishAsSelectorContinue" onclick="confirmPublishAsSelector(\'' + type + '\')">Continue</button>';
    html += '</div>';
    html += '</div>';

    overlay.innerHTML = html;
  });
}

function highlightPublishAsOption(radio) {
  var card = radio.closest(".publishAsSelectorCard");
  if (!card) return;
  var labels = card.querySelectorAll(".publishAsOption");
  for (var i = 0; i < labels.length; i++) {
    labels[i].classList.remove("publishAsOption-selected");
  }
  var lbl = radio.closest(".publishAsOption");
  if (lbl) lbl.classList.add("publishAsOption-selected");
}

function closePublishAsSelector() {
  var ov = document.getElementById("publishAsSelectorOverlay");
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  PUBLISH_AS._pending = null;
}

function confirmPublishAsSelector(type) {
  var sel = document.querySelector('input[name="publishAsChoice_' + type + '"]:checked');
  var bid = sel ? sel.value : "";
  var name = "Personal Listing";

  var pending = PUBLISH_AS._pending;
  if (pending && pending.options) {
    for (var i = 0; i < pending.options.length; i++) {
      if (String(pending.options[i].bid) === String(bid)) {
        name = pending.options[i].name;
        break;
      }
    }
  }

  var sub = "";
  if (pending && pending.options) {
    for (var j = 0; j < pending.options.length; j++) {
      if (String(pending.options[j].bid) === String(bid)) {
        var oo = pending.options[j];
        sub = oo.bid
          ? ((oo.category || "") + (oo.category && oo.city ? " • " : "") + (oo.city || ""))
          : "Sell from your personal profile.";
        break;
      }
    }
  }
  setPublishAsChoice(type, bid, name, sub);
  closePublishAsSelector();

  var cb = pending ? pending.onContinue : null;
  if (typeof cb === "function") cb();
}


/* ============================================================
   COMPACT PUBLISHER INDICATOR (top of the form)
   ============================================================ */

function renderPublishAsIndicator(type) {
  var pageId = type === "product" ? "postProduct" : "postProperty";
  var page = document.getElementById(pageId);
  if (!page) return;
  __publishAsInjectStyles();

  var indId = "publishAsIndicator_" + type;
  var ind = document.getElementById(indId);
  if (!ind) {
    ind = document.createElement("div");
    ind.id = indId;
    ind.className = "publishAsIndicator";
    page.insertBefore(ind, page.firstChild);
  }

  var bid = getPublishAsBusinessId(type);
  var name = getPublishAsName(type);
  var icon = bid ? "\uD83C\uDFEA" : "\uD83D\uDC64"; /* store / person */

  var sub = getPublishAsSubtext(type);
  ind.innerHTML =
    '<div class="publishAsIndicator-left">' +
    '<div class="publishAsIndicator-label">Publish As</div>' +
    '<div class="publishAsIndicator-value"><span>' + icon + '</span><span>' + __publishAsEscHtml(name) + '</span></div>' +
    (sub ? '<div class="publishAsIndicator-sub">' + __publishAsEscHtml(sub) + '</div>' : '') +
    '</div>' +
    '<button class="publishAsIndicator-change" onclick="reopenPublishAsSelector(\'' + type + '\')">Change</button>';
}

function clearPublishAsIndicator(type) {
  var ind = document.getElementById("publishAsIndicator_" + type);
  if (ind && ind.parentNode) ind.parentNode.removeChild(ind);
}


/* ============================================================
   "CHANGE" BUTTON — reopen selector, preserve form input
   ============================================================ */

function reopenPublishAsSelector(type) {
  showPublishAsSelector(type, function () {
    /* Only refresh the indicator; do NOT reopen/clear the form so any
       already-entered data is preserved. */
    renderPublishAsIndicator(type);
  });
}


/* ============================================================
   COMPACT CARD ON FORM (no modal)
   ============================================================ */

function showPublishAsCard(type) {
  var pageId = type === "product" ? "postProduct" : "postProperty";
  var page = document.getElementById(pageId);
  if (!page) return;
  if (!page.classList.contains("activePage")) return;
  renderPublishAsIndicator(type);
}


/* ============================================================
   WRAP EXISTING CREATE ENTRY POINTS
   (runs after Post.js / PostProduct.js / PostProperty.js load)
   Edit mode (updateProductForm / updatePropertyForm) is NOT wrapped.
   ============================================================ */

(function () {
  if (window.__publishAsWrapped) return;
  window.__publishAsWrapped = true;

  var _origOpenPostForm = window.openPostForm;
  var _origOpenPostProductForm = window.openPostProductForm;
  var _origOpenPostPropertyForm = window.openPostPropertyForm;

  /* openPostForm: used by FAB menu, dashboard quick actions and
     MyContent via openPostFormWithLogin(type) -> openPostForm(type) */
  window.openPostForm = function (formType) {
    var res = _origOpenPostForm ? _origOpenPostForm(formType) : undefined;
    if (formType === "product" || formType === "property") {
      if (typeof showPublishAsCard === "function") showPublishAsCard(formType);
    }
    return res;
  };

  /* openPostProductForm: used by the "Post New Product" button on My Products */
  if (typeof _origOpenPostProductForm === "function") {
    window.openPostProductForm = function () {
      var res = _origOpenPostProductForm();
      if (typeof showPublishAsCard === "function") showPublishAsCard("product");
      return res;
    };
  }

  /* openPostPropertyForm: used by the "Post New Property" button on My Properties */
  if (typeof _origOpenPostPropertyForm === "function") {
    window.openPostPropertyForm = function () {
      var res = _origOpenPostPropertyForm();
      if (typeof showPublishAsCard === "function") showPublishAsCard("property");
      return res;
    };
  }
})();