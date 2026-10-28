/*
============================================================
EKKA1KM FRONTEND
App.js
V2.2 - Phase 3 Dashboard + Interest + Promotion Support
============================================================
*/

let CURRENT_LAT =
  CONFIG.DEFAULT_LATITUDE;

let CURRENT_LNG =
  CONFIG.DEFAULT_LONGITUDE;

/* ============================================================
   NATIVE ANDROID PLUGIN RESOLVERS & BRIDGES
   ============================================================
   In Capacitor Android with remote server URL, native plugins are
   exported directly to window.Capacitor.Plugins[pluginName].
   We provide robust resolvers and define dynamic getters on window
   so window.EkkaNativeLocation and window.EkkaLiveBroadcaster
   reliably resolve the native plugin instance inside the APK,
   while returning null on web/Chrome.
   ============================================================ */

function isNativeAndroidApp() {
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) {
      return true;
    }
    if (window.Capacitor && typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() === "android") {
      return true;
    }
    if (window.androidBridge) {
      return true;
    }
  } catch (e) {}
  return false;
}

function getEkkaNativeLocation() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.EkkaNativeLocation) {
    return window.Capacitor.Plugins.EkkaNativeLocation;
  }
  if (window.__ekkaNativeLocationInstance) {
    return window.__ekkaNativeLocationInstance;
  }
  if (window.Capacitor && typeof window.Capacitor.registerPlugin === "function") {
    try {
      window.__ekkaNativeLocationInstance = window.Capacitor.registerPlugin("EkkaNativeLocation");
      return window.__ekkaNativeLocationInstance;
    } catch (e) {}
  }
  return null;
}

function getEkkaLiveBroadcaster() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.EkkaLiveBroadcaster) {
    return window.Capacitor.Plugins.EkkaLiveBroadcaster;
  }
  if (window.__ekkaLiveBroadcasterInstance) {
    return window.__ekkaLiveBroadcasterInstance;
  }
  if (window.Capacitor && typeof window.Capacitor.registerPlugin === "function") {
    try {
      window.__ekkaLiveBroadcasterInstance = window.Capacitor.registerPlugin("EkkaLiveBroadcaster");
      return window.__ekkaLiveBroadcasterInstance;
    } catch (e) {}
  }
  return null;
}

try {
  Object.defineProperty(window, "EkkaNativeLocation", {
    get: getEkkaNativeLocation,
    configurable: true
  });
} catch (e) {
  window.EkkaNativeLocation = getEkkaNativeLocation();
}

try {
  Object.defineProperty(window, "EkkaLiveBroadcaster", {
    get: getEkkaLiveBroadcaster,
    configurable: true
  });
} catch (e) {
  window.EkkaLiveBroadcaster = getEkkaLiveBroadcaster();
}

const _originalBrowserShare = (typeof navigator !== "undefined" && typeof navigator.share === "function")
  ? navigator.share.bind(navigator)
  : null;

function getEkkaNativeShare() {
  if (typeof window === "undefined") return null;
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
    return window.Capacitor.Plugins.Share;
  }
  if (window.__ekkaNativeShareInstance) {
    return window.__ekkaNativeShareInstance;
  }
  if (window.Capacitor && typeof window.Capacitor.registerPlugin === "function") {
    try {
      window.__ekkaNativeShareInstance = window.Capacitor.registerPlugin("Share");
      return window.__ekkaNativeShareInstance;
    } catch (e) {}
  }
  return null;
}

async function ekkaNativeShare(data) {
  const payload = {
    title: (data && data.title) || "Ekka1km",
    text: (data && data.text) || "",
    url: (data && data.url) || (typeof window !== "undefined" && window.location && window.location.href) || "",
    dialogTitle: (data && data.dialogTitle) || (data && data.title) || "Share via"
  };

  // 1. Capacitor Android App (via @capacitor/share plugin)
  let capShare = getEkkaNativeShare();
  if (!capShare && typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    await new Promise(r => setTimeout(r, 50));
    capShare = getEkkaNativeShare();
  }

  if (capShare && typeof capShare.share === "function") {
    try {
      return await capShare.share(payload);
    } catch (err) {
      const msg = String(err && (err.message || err)).toLowerCase();
      if (msg.includes("abort") || msg.includes("cancel") || msg.includes("dismiss")) {
        return { canceled: true };
      }
      throw err;
    }
  }

  // 2. Standard Web Share API (mobile Chrome / Safari)
  if (_originalBrowserShare) {
    try {
      return await _originalBrowserShare({
        title: payload.title,
        text: payload.text,
        url: payload.url
      });
    } catch (err) {
      if (err && (err.name === "AbortError" || String(err).indexOf("AbortError") !== -1)) {
        return { canceled: true };
      }
      throw err;
    }
  }

  // 3. Fallback when neither is available
  const err = new Error("NativeShareUnavailable");
  err.name = "NativeShareUnavailable";
  throw err;
}

window.ekkaNativeShare = ekkaNativeShare;

try {
  if (typeof navigator !== "undefined" && !navigator.share) {
    navigator.share = function(data) {
      return ekkaNativeShare(data);
    };
  }
} catch (_) {}

/*
============================================================
LOGIN UI
============================================================
*/

function refreshLoginUI() {

  const loggedIn =
    isLoggedIn();

  document
    .querySelectorAll(
      ".login-only"
    )
    .forEach(el => {
      el.style.display =
        loggedIn
          ? "block"
          : "none";
    });

  document
    .querySelectorAll(
      ".guest-only"
    )
    .forEach(el => {
      el.style.display =
        loggedIn
          ? "none"
          : "block";
    });

  if (typeof checkBroadcasterAllocation === "function") {
    checkBroadcasterAllocation();
  }
}


/*
============================================================
SIDE DRAWER (Stage 3E)
============================================================
*/

function openSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !backdrop) return;

  drawer.classList.add("open");
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";

  // Keep active state in sync whenever drawer opens
  updateDrawerActiveState(getCurrentPageId());
  updateDrawerNotificationBadge();
  if (typeof checkBroadcasterAllocation === "function") {
    checkBroadcasterAllocation();
  }
}

function closeSideDrawer() {
  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !backdrop) return;

  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

function navigateFromDrawer(pageId) {
  closeSideDrawer();
  setTimeout(() => {
    openPage(pageId);
    updateDrawerActiveState(pageId);
  }, 180);
}

/*
DRAWER ACTIVE STATE SYNC
Only ONE active item at a time, driven by navigation state.
*/

function updateDrawerActiveState(pageId) {
  const drawer = document.getElementById("sideDrawer");
  if (!drawer) return;

  // Remove active from all drawer items
  drawer.querySelectorAll(".sideDrawer-item").forEach(item => {
    item.classList.remove("active");
  });

  if (!pageId) return;

  // Find matching drawer item by data-page attribute
  const match = drawer.querySelector('.sideDrawer-item[data-page="' + pageId + '"]');
  if (match) {
    match.classList.add("active");
  }
}

function getCurrentPageId() {
  const activePage = document.querySelector(".page.activePage");
  return activePage ? activePage.id : "";
}

/*
DRAWER NOTIFICATION BADGE SYNC
Reuses existing unread count logic — no duplicate implementation.
*/

function updateDrawerNotificationBadge() {
  const badge = document.getElementById("drawerNotifBadge");
  if (!badge) return;

  const count = (typeof getUnreadNotificationCount === "function")
    ? getUnreadNotificationCount()
    : 0;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "inline-flex";
  } else {
    badge.textContent = "0";
    badge.style.display = "none";
  }
}

/*
DRAWER KEYBOARD NAVIGATION
Supports ArrowUp/ArrowDown/Enter/Space on menu items.
Maintains existing minimum 48px touch targets and a11y.
*/

function initDrawerKeyboardNav() {
  const drawer = document.getElementById("sideDrawer");
  if (!drawer) return;

  const items = drawer.querySelectorAll(".sideDrawer-item, .sideDrawer-logout");

  items.forEach(item => {
    item.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.click();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = Array.from(items);
        const index = list.indexOf(this);
        const nextIndex = e.key === "ArrowDown"
          ? (index + 1) % list.length
          : (index - 1 + list.length) % list.length;
        list[nextIndex].focus();
      }
    });
  });
}

function refreshDrawerIdentity() {
  const nameEl = document.getElementById("drawerUserName");
  const balanceEl = document.getElementById("drawerBalance");
  const avatarEl = document.getElementById("drawerAvatar");
  const phoneEl = document.getElementById("drawerPhone");
  const emailEl = document.getElementById("drawerEmail");
  const verifEl = document.getElementById("drawerVerifBadge");
  const walletChipEl = document.getElementById("drawerWalletChip");
  if (!nameEl && !balanceEl) return;

  const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW);
  const sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
  let user = null;
  if (userData) {
    try { user = JSON.parse(userData); } catch (e) { /* silent */ }
  } else if (sessionData) {
    try { user = JSON.parse(sessionData); } catch (e) { /* silent */ }
  }

  if (nameEl) {
    nameEl.textContent = user && (user.name || user.FullName || user.Name) ? (user.name || user.FullName || user.Name) : "Guest User";
  }

  // Avatar: profile photo if available, otherwise initial
  if (avatarEl) {
    const photo = user && (user.ProfilePhoto || user.profilePhoto) ? (user.ProfilePhoto || user.profilePhoto) : "";
    const name = user && (user.name || user.FullName || user.Name) ? (user.name || user.FullName || user.Name) : "Guest User";
    const initial = (name || "G").charAt(0).toUpperCase();
    if (photo && photo.indexOf("http") === 0) {
      avatarEl.innerHTML = '<img src="' + photo + '" alt="Profile">';
      const img = avatarEl.querySelector("img");
      if (img) {
        img.onerror = function() {
          avatarEl.innerHTML = '<span class="sideDrawer-avatarInitial">' + initial + '</span>';
        };
      }
    } else {
      avatarEl.innerHTML = '<span class="sideDrawer-avatarInitial">' + initial + '</span>';
    }
  }

  // Phone
  if (phoneEl) {
    const phone = user && (user.Mobile || user.Phone || user.mobile) ? (user.Mobile || user.Phone || user.mobile) : "";
    phoneEl.textContent = phone;
    phoneEl.style.display = phone ? "block" : "none";
  }

  // Email
  if (emailEl) {
    const email = user && (user.Email || user.email) ? (user.Email || user.email) : "";
    emailEl.textContent = email;
    emailEl.style.display = email ? "block" : "none";
  }

  // Verification badge (only when status is active/verified)
  if (verifEl) {
    const status = user && (user.Status || user.VerificationStatus) ? (user.Status || user.VerificationStatus) : "";
    const isVerified = (status.toLowerCase() === "active" || status.toLowerCase() === "verified");
    verifEl.style.display = isVerified ? "inline-flex" : "none";
  }

  // Wallet / coin chip
  if (balanceEl && user) {
    const wallet = user.walletBalance || 0;
    const coins = user.coins || 0;
    balanceEl.textContent = "₹" + wallet + " | " + coins + " coins";
    if (walletChipEl) {
      walletChipEl.style.display = (wallet || coins) ? "flex" : "none";
    } else {
      balanceEl.style.display = (wallet || coins) ? "block" : "none";
    }
  }

  // Official Announcer Drawer Item Visibility (restricted exclusively to approved/active announcers)
  const announcerDrawerEl = document.getElementById("drawerAnnouncerItem");
  if (announcerDrawerEl) {
    var uid = user ? (user.UserID || user.userId || user.id || "") : "";
    if (!uid) {
      announcerDrawerEl.style.display = "none";
    } else {
      var cachedActive = localStorage.getItem("ekka_active_announcer_" + uid);
      if (cachedActive === "true") {
        announcerDrawerEl.style.display = "flex";
      } else {
        announcerDrawerEl.style.display = "none";
      }

      if (typeof getApiUrl === "function") {
        fetch(getApiUrl() + "?action=myannouncerstatus&userId=" + encodeURIComponent(uid))
          .then(function(res) { return res.json(); })
          .then(function(json) {
            var announcers = (json && json.data) || [];
            var hasActive = false;
            for (var i = 0; i < announcers.length; i++) {
              if (String(announcers[i].Status || "").toLowerCase() === "active") {
                hasActive = true;
                break;
              }
            }
            localStorage.setItem("ekka_active_announcer_" + uid, hasActive ? "true" : "false");
            if (announcerDrawerEl) {
              announcerDrawerEl.style.display = hasActive ? "flex" : "none";
            }
          })
          .catch(function() { /* silent */ });
      }
    }
  }
}


/*
============================================================
PAGE NAVIGATION — WITH INTERNAL HISTORY STACK
============================================================
*/

/*
============================================================
NAVIGATION MANAGER
Stage-based navigation engine. Single source of truth
for both the internal navigation stack and browser history.
Only this module touches history.pushState(),
history.replaceState(), history.back(), and navStack.
============================================================
*/

const NavigationManager = (() => {
  // All Back transitions are handled authoritatively by the popstate handler.
  let _restoreActive = false;

  const ROOT_PAGES = new Set(["home", "login", "register"]);
  const LIST_PAGE_IDS = new Set(["businesses", "products", "properties", "news"]);
  const MAX_STACK = 50;

  const PAGE_ALIASES = {
    "propertydetails": "properties",
    "businessprofile": "businesses",
    "userprofile": "profile",
    "register": "login",
    "product": "products",
    "property": "properties",
    "article": "news"
  };

  function resolvePageAlias(pageId) {
    if (!pageId) return pageId;
    const lower = String(pageId).toLowerCase().trim();
    return PAGE_ALIASES[lower] || pageId;
  }

  let navStack = [];

  function buildStage(pageId, stage, entityId) {
    return { pageId: pageId, stage: stage, entityId: entityId || null };
  }

  function inferStage(pageId) {
    if (!pageId) return "root";
    if (ROOT_PAGES.has(pageId)) return "root";
    if (LIST_PAGE_IDS.has(pageId)) return "list";
    return "page";
  }

  function stageEquals(a, b) {
    if (!a || !b) return a === b;
    // Detail stages are distinct when they reference different entities
    // (products/detail/P1 must not be treated as products/detail/P2).
    return a.pageId === b.pageId &&
           a.stage === b.stage &&
           (a.entityId || null) === (b.entityId || null);
  }

  function getCurrentStage() {
    if (navStack.length > 0) {
      return navStack[navStack.length - 1];
    }
    return buildStage(getCurrentPageId(), inferStage(getCurrentPageId()));
  }

  function getListRestoreFn(pageId) {
    switch (pageId) {
      case "businesses": return typeof loadBusinesses === "function" ? loadBusinesses : null;
      case "products":   return typeof loadProducts   === "function" ? loadProducts   : null;
      case "properties": return typeof loadProperties === "function" ? loadProperties : null;
      case "news":       return typeof loadNews       === "function" ? loadNews       : null;
      default:           return null;
    }
  }

  function getDetailRestoreFn(pageId) {
    switch (pageId) {
      case "businesses": return typeof showBusinessDetailsById === "function" ? showBusinessDetailsById : null;
      case "products":   return typeof showProductDetailsById   === "function" ? showProductDetailsById   : null;
      case "properties": return typeof showPropertyDetailsById  === "function" ? showPropertyDetailsById  : null;
      case "news":       return typeof showNewsDetailsById      === "function" ? showNewsDetailsById      : null;
      case "store":      return typeof openStore                === "function" ? openStore                : null;
      default:           return null;
    }
  }

  function getCurrentEntityId(pageId) {
    let ent = null;
    try {
      switch (pageId) {
        case "businesses": ent = (typeof CURRENT_BUSINESS  !== "undefined" && CURRENT_BUSINESS)  ? CURRENT_BUSINESS  : null; break;
        case "products":   ent = (typeof CURRENT_PRODUCT   !== "undefined" && CURRENT_PRODUCT)   ? CURRENT_PRODUCT   : null; break;
        case "properties": ent = (typeof CURRENT_PROPERTY  !== "undefined" && CURRENT_PROPERTY)  ? CURRENT_PROPERTY  : null; break;
        case "news":       ent = (typeof CURRENT_NEWS      !== "undefined" && CURRENT_NEWS)      ? CURRENT_NEWS      : null; break;
        case "store":      ent = (typeof CURRENT_STORE     !== "undefined" && CURRENT_STORE)     ? CURRENT_STORE     : null; break;
        default:           return null;
      }
    } catch (e) {
      return null;
    }
    if (!ent) return null;
    switch (pageId) {
      case "businesses": return ent.BusinessID || ent.businessId || null;
      case "products":   return ent.ProductID   || ent.productId   || null;
      case "properties": return ent.PropertyID  || ent.propertyId  || null;
      case "news":       return ent.NewsID      || ent.newsId      || ent.id || null;
      case "store": {
        if (ent.business && (ent.business.BusinessID || ent.business.businessId)) {
          return ent.business.BusinessID || ent.business.businessId;
        }
        return ent.businessId || ent.BusinessID || null;
      }
      default:           return null;
    }
  }

  /*
  ============================================================
  URL GENERATION CENTER (single source of truth for the hash)
  Every distinct navigable screen gets a distinct URL so that the
  Android/Chrome system Back can step through them explicitly:

    root:   #home / #login / #register
    list:   #products / #businesses / #properties / #news
    detail: #products/<entityId>  (entityId is URL-encoded)

  history.state remains { pageId, stage, entityId } — the hash is for
  URL/history identity only; state stays the navigation data used by
  NavigationManager for reconcile/restore.
  ============================================================
  */
  function buildStageUrl(descriptor) {
    const d = descriptor || {};
    if (d.stage === "detail" && d.entityId) {
      if (d.pageId === "store") {
        return "/store/" + encodeURIComponent(d.entityId);
      }
      if (d.pageId === "products" || d.pageId === "product") {
        return "/product/" + encodeURIComponent(d.entityId);
      }
      if (d.pageId === "properties" || d.pageId === "property") {
        return "/property/" + encodeURIComponent(d.entityId);
      }
      if (d.pageId === "news" || d.pageId === "article") {
        return "/news/" + encodeURIComponent(d.entityId);
      }
    }
    let hash = "#" + (d.pageId || "home");
    if (d.stage === "detail" && d.entityId) {
      hash += "/" + encodeURIComponent(d.entityId);
    }
    if (window.location && window.location.pathname &&
        /^\/(?:store|product|products|property|properties|news|article)\//i.test(window.location.pathname)) {
      return "/" + hash;
    }
    return hash;
  }

  function pushHistoryState(state) {
    if (window.history && window.history.pushState) {
      try {
        const targetUrl = buildStageUrl(state);
        if (window.location.pathname === targetUrl || window.location.hash === targetUrl) {
          history.replaceState(state, "", targetUrl);
        } else {
          history.pushState(state, "", targetUrl);
        }
      } catch (e) {
        // silent
      }
    }
  }

  function replaceHistoryState(state) {
    if (window.history && window.history.replaceState) {
      try {
        history.replaceState(state, "", buildStageUrl(state));
      } catch (e) {
        // silent
      }
    }
  }

  function canGoBack() {
    // Only true when there is a previous in-app page on the stack.
    return navStack.length > 1;
  }

  function switchPage(pageId) {
    pageId = resolvePageAlias(pageId);

    const pages =
      document.querySelectorAll(
        ".page"
      );

    pages.forEach(page => {
      page.classList.remove(
        "activePage"
      );
    });

    const target =
      document.getElementById(
        pageId
      );

    if (target) {
      target.classList.add(
        "activePage"
      );
    }

    const header =
      document.getElementById(
        "appHeader"
      );

    const bottomNav =
      document.getElementById(
        "bottomNav"
      );

    const disco =
      document.getElementById(
        "globalDisco"
      );

    // Update Bottom Navigation Active State
    updateBottomNavActiveState(pageId);

    // Sync drawer active pill with current page
    updateDrawerActiveState(pageId);

    if (disco) {
      const discoPages = ["home"];
      const compactPages = ["products","businesses","properties","news","live"];

      if (discoPages.includes(pageId)) {
        disco.classList.remove("disco-compact");
        disco.classList.add("disco-full");
      } else if (compactPages.includes(pageId)) {
        disco.classList.remove("disco-full");
        disco.classList.add("disco-compact");
        syncDiscoCompact();
      } else {
        disco.classList.remove("disco-full","disco-compact");
        disco.style.display = "none";
      }
    }

    if (
      pageId === "login" ||
      pageId === "register"
    ) {
      if (header)
        header.style.display =
          "none";

      if (bottomNav)
        bottomNav.style.display =
          "none";

      if (
        typeof autoFillMobile ===
        "function"
      ) {
        autoFillMobile();
      }
    }
    else {
      if (header)
        header.style.display =
          "flex";

      if (bottomNav)
        bottomNav.style.display =
          "flex";
    }

    if (pageId === "adcenter") {
      if (typeof openAdCenterPage === "function") {
        setTimeout(openAdCenterPage, 100);
      }
    }

    if (pageId === "dashboard") {
      loadDashboard();
    }

    if (pageId === "wallet") {
      if (typeof loadWallet === "function") {
        loadWallet();
      }
    }

    if (pageId === "myContent") {
      if (typeof loadMyContent === "function") {
        loadMyContent();
      }
    }

    if (pageId === "orders") {
      if (typeof loadOrdersPage === "function") {
        loadOrdersPage();
      }
    }

    if (pageId === "promotions") {
      if (typeof openPromotionsPage === "function") {
        openPromotionsPage();
      }
    }

    if (pageId === "interests") {
      if (typeof loadMyInterests === "function") {
        loadMyInterests();
      }
    }

    if (pageId === "notifications") {
      if (typeof loadNotifications === "function") {
        loadNotifications();
      }
    }

    if (pageId === "announcements") {
      if (typeof loadAnnouncements === "function") {
        loadAnnouncements();
      }
    }

    if (pageId === "announcerPanel") {
      var userId = typeof getUserId === "function" ? getUserId() : "";
      if (typeof loadAnnouncerStatus === "function") {
        loadAnnouncerStatus(userId);
      }
    }

    if (pageId === "golive") {
      if (typeof initGoLiveStudio === "function") {
        initGoLiveStudio();
      }
    }

    if (pageId === "live") {
      if (typeof loadLive === "function") {
        loadLive();
      }
    }

    window.scrollTo(0, 0);
  }

  function pushStage(pageId, stage, entityId) {
    const descriptor = buildStage(pageId, stage, entityId);
    navStack.push(descriptor);

    if (navStack.length > MAX_STACK) {
      navStack = navStack.slice(navStack.length - MAX_STACK);
    }

    pushHistoryState(descriptor);
  }

  function enterDetailView(pageId, entityId) {
    if (entityId == null) {
      entityId = getCurrentEntityId(pageId);
    }

    const detailStage = buildStage(pageId, "detail", entityId);
    const top = navStack.length > 0 ? navStack[navStack.length - 1] : null;

    // Back-restore / idempotency guard: if this exact detail stage is already
    // the current one on top of navStack (or we are inside a Back restore),
    // do NOT create a duplicate stack/history entry; just re-render.
    if (_restoreActive || stageEquals(top, detailStage)) {
      switchPage(pageId);
      return;
    }

    const currentStage = getCurrentStage();

    // Push the list/parent stage beneath if the stack is out of sync.
    if (navStack.length === 0 || !stageEquals(top, currentStage)) {
      if (navStack.length === 0 && (!currentStage || !currentStage.pageId)) {
        pushStage("home", "root", null);
      } else {
        pushStage(currentStage.pageId, currentStage.stage, currentStage.entityId);
      }
    }

    // Push the detail stage (entity-aware).
    pushStage(pageId, "detail", entityId);

    switchPage(pageId);
  }

  function openPage(pageId) {
    pageId = resolvePageAlias(pageId);

    const current = getCurrentPageId();

    // Avoid no-op navigations
    if (current === pageId) return;

    const isRoot = ROOT_PAGES.has(pageId);

    if (isRoot) {
      // Root pages are the navigation anchor: reset the internal stack.
      const rootStage = buildStage(pageId, "root");
      navStack = [rootStage];

      // If we are already at this root hash (e.g. fresh startup at #home),
      // replace the top entry instead of adding a duplicate #home entry.
      if (location.hash === ("#" + pageId)) {
        replaceHistoryState(rootStage);
      } else {
        pushHistoryState(rootStage);
      }
    } else {
      // Non-root: push a single stage (stack + history stay 1:1).
      pushStage(pageId, inferStage(pageId));
    }

    switchPage(pageId);
  }

  function goBack() {
    // Browser history is the single authoritative back mechanism.
    // goBack() only steps history.back(); the popstate handler performs the
    // actual transition (reconcile navStack, re-render target, switchPage).
    // No direct switchPage(), no manual navStack.pop(), no suppression timer.
    if (!canGoBack()) return;
    if (window.history && history.back) {
      history.back();
    } else {
      const root = navStack[0] || buildStage("home", "root");
      switchPage(root.pageId);
    }
  }

  // Renders the resolved target stage after any Back transition.
  // Only restores a list when the TARGET is actually a list stage, and only
  // re-renders a detail (never the list) when the TARGET is a detail stage.
  function renderStage(stage) {
    switchPage(stage.pageId);

    if (stage.stage === "list") {
      const fn = getListRestoreFn(stage.pageId);
      if (fn) fn();
    } else if (stage.stage === "detail") {
      const fn = getDetailRestoreFn(stage.pageId);
      if (fn && stage.entityId) {
        _restoreActive = true;
        try {
          fn(stage.entityId);
        } catch (e) {
          // page container is already active; ignore render errors
        } finally {
          _restoreActive = false;
        }
      }
    }
  }

  // Browser back / popstate handler — the single authoritative Back transition.
  window.addEventListener(
    "popstate",
    function(e) {
      const state = e.state;
      if (!state || !state.pageId) {
        // Entry with no app state (e.g. the pre-app base URL): stay on root.
        const root = navStack[0] || buildStage("home", "root");
        replaceHistoryState(root);
        switchPage(root.pageId);
        return;
      }

      const stage = buildStage(
        state.pageId,
        state.stage || inferStage(state.pageId),
        state.entityId
      );

      // ROOT ABSORB: if the stack is anchored at an in-app root and the browser
      // reached a stale pre-root app page (e.g. after tapping bottom-nav Home
      // from deep navigation), do NOT jump back into that old page.
      if (!ROOT_PAGES.has(stage.pageId) && navStack.length <= 1) {
        const root = navStack[0] || buildStage("home", "root");
        replaceHistoryState(root);
        switchPage(root.pageId);
        return;
      }

      // Reconcile navStack to the target stage (entity-aware).
      while (navStack.length > 0 && !stageEquals(navStack[navStack.length - 1], stage)) {
        navStack.pop();
      }

      // Ensure navStack describes the visible stage
      if (navStack.length === 0 || !stageEquals(navStack[navStack.length - 1], stage)) {
        navStack.push(stage);
      }

      // Render the resolved target stage.
      renderStage(stage);
    }
  );

  // Expose public API to global scope
  window.canGoBack = canGoBack;
  window.switchPage = switchPage;
  window.enterDetailView = enterDetailView;
  window.openPage = openPage;
  window.goBack = goBack;

  return { canGoBack, switchPage, enterDetailView, openPage, goBack };
})();

/*
BOTTOM NAVIGATION ACTIVE STATE
*/

function updateBottomNavActiveState(pageId) {
  const bottomNav = document.getElementById("bottomNav");
  if (!bottomNav) return;

  // Remove active class from all items
  const allItems = bottomNav.querySelectorAll(".bottomNav-item");
  allItems.forEach(item => {
    item.classList.remove("active");
  });

  // Map pageId to bottom nav tab
  let activeTab = null;
  
  if (pageId === "home") {
    activeTab = "home";
  } else if (["products", "businesses", "properties"].includes(pageId)) {
    activeTab = "discover";
  } else if (pageId === "dashboard" || pageId === "myContent" || pageId === "orders") {
    activeTab = "activity";
  } else if (pageId === "wallet" || pageId === "promotions") {
    activeTab = "wallet";
  } else if (pageId === "profile" || pageId === "notifications" || pageId === "announcements") {
    // These pages don't have a dedicated bottom nav tab, keep current active or default to home
    activeTab = null;
  } else if (["login", "register", "postProduct", "postProperty", "postBusiness", "postNews", "postAdvertisement", "postPromotion", "postAnnouncement"].includes(pageId)) {
    // Post forms - keep current active or default to home
    activeTab = null;
  }

  // Set active state
  if (activeTab) {
    const activeItem = bottomNav.querySelector(`[data-page="${activeTab}"]`);
    if (activeItem) {
      activeItem.classList.add("active");
    }
  }
}


/*
============================================================
LOCATION — CANONICAL DOM UPDATE
============================================================

Reads the SINGLE canonical location object (getSavedLocation)
and pushes it to the Hero Card DOM. Every location change
(GPS, manual search, clear) funnels through this so the Hero
Card always shows the same resolved object used by the toast.
*/

function updateLocationCard() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  const saved =
    getSavedLocation();

  if (!saved) return;

  // Hero Card line 1 = Area
  if (gpsText) {
    gpsText.innerText =
      saved.area || "Current Area";
  }

  // Hero Card line 2 = City, State
  if (locationSubtitle) {
    const city = saved.city || "";
    const state = saved.state || "";
    locationSubtitle.innerText =
      (city + (state ? ", " + state : "")) ||
      "City, State";
  }
}


/*
============================================================
LOCATION — REVERSE GEOCODING (GPS)
============================================================

Resolves GPS coordinates into a named location using the same
OpenStreetMap Nominatim engine the search modal uses. On
success it writes the full resolved object into the canonical
location store and refreshes the Hero Card.
*/

function reverseGeocodeLocation(lat, lng) {

  const url =
    "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
    lat + "&lon=" + lng + "&zoom=16&addressdetails=1";

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {

      if (!res || !res.address) {
        // Save GPS coords with a readable name even when
        // reverse geocoding returns no structured address.
        const displayName =
          (res && (res.display_name || res.name)) ||
          "Current Location";

        saveLocation(
          lat,
          lng,
          "Current Location",
          "",
          "",
          displayName
        );

        updateLocationCard();
        loadAll();
        return;
      }

      const addr = res.address;

      // Prefer a meaningful area; fall back to county/town/city
      const area =
        addr.neighbourhood ||
        addr.suburb ||
        addr.city_district ||
        addr.town_district ||
        addr.road ||
        addr.county ||
        addr.city ||
        addr.town ||
        res.name ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        "";

      const state =
        addr.state ||
        addr.state_district ||
        addr.region ||
        "";

      const name =
        area + (city ? ", " + city : "") + (state ? ", " + state : "");

      // Write the SAME resolved object used by the toast system
      saveLocation(lat, lng, area, city, state, name);

      // GPS coords already flow into discovery through
      // getEffectiveCenter()'s fallback to CURRENT_LAT/LNG.
      updateLocationCard();
      loadAll();
    })
    .catch(function() {
      // Save GPS coords even when reverse geocoding fails
      // so the location is persisted for future launches.
      saveLocation(
        lat,
        lng,
        "Current Location",
        "",
        "",
        "Current Location"
      );

      updateLocationCard();
      loadAll();
    });
}


/*
============================================================
GPS
============================================================
*/

function loadLocation() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  // Determine whether this is a first launch.
  // A first launch means no persisted location object yet.
  const savedLocationData =
    localStorage.getItem(
      CONFIG.STORAGE_KEYS.LOCATION
    );

  if (savedLocationData) {

    // Subsequent launch — use stored location immediately.
    // GPS refresh only happens when the user explicitly
    // taps "Use Current Location".
    updateLocationCard();
    loadAll();
    return;
  }

  // First launch — show the canonical fallback location
  // immediately, then attempt GPS in the background.
  updateLocationCard();

  if (
    !navigator.geolocation
  ) {

    // No geolocation support — persist the fallback
    // so future launches skip GPS auto-detection.
    const fallback =
      getSavedLocation();

    saveLocation(
      fallback.lat,
      fallback.lng,
      fallback.area,
      fallback.city,
      fallback.state,
      fallback.name ||
        fallback.area + ", " + fallback.city + ", " + fallback.state
    );

    loadAll();
    return;
  }

  navigator.geolocation
    .getCurrentPosition(

      position => {

        CURRENT_LAT =
          position.coords.latitude;

        CURRENT_LNG =
          position.coords.longitude;

        // Reverse geocode so the canonical location object
        // carries real names, not placeholders.
        reverseGeocodeLocation(
          CURRENT_LAT,
          CURRENT_LNG
        );
      },

      () => {

        // GPS failed on first launch — persist the exact
        // fallback location (Ranthambore Temple) so it is
        // reused on subsequent launches instead of Jaipur.
        const fallback =
          getSavedLocation();

        saveLocation(
          fallback.lat,
          fallback.lng,
          fallback.area,
          fallback.city,
          fallback.state,
          fallback.name ||
            fallback.area + ", " + fallback.city + ", " + fallback.state
        );

        updateLocationCard();
        loadAll();
      },

      {
        enableHighAccuracy:
          CONFIG.GPS.HIGH_ACCURACY,

        timeout:
          CONFIG.GPS.TIMEOUT,

        maximumAge:
          CONFIG.GPS.MAXIMUM_AGE
      }
    );
}


/*
============================================================
USE CURRENT LOCATION (HERO BUTTON)
============================================================

Forces a GPS refresh when the user taps the Hero Card
"Use Current Location" button. Updates the Hero Card,
persists the new coordinates/address, and refreshes all
discovery modules WITHOUT a page reload.
*/
function useCurrentLocation() {

  const gpsText =
    document.getElementById(
      "gpsText"
    );

  const locationSubtitle =
    document.getElementById(
      "locationSubtitle"
    );

  const nativeLocation =
    window.EkkaNativeLocation || null;

  if (nativeLocation) {
    useNativeCurrentLocation(
      nativeLocation,
      gpsText,
      locationSubtitle
    );
    return;
  }

  if (
    !navigator.geolocation
  ) {

    if (gpsText) {
      gpsText.innerText =
        "Area not available";
    }

    if (locationSubtitle) {
      locationSubtitle.innerText =
        "Location service unavailable";
    }

    loadAll();
    return;
  }

  // Show temporary loading state
  if (gpsText) {
    gpsText.innerText =
      "Detecting location...";
  }

  if (locationSubtitle) {
    locationSubtitle.innerText =
      "Please wait";
  }

  navigator.geolocation
    .getCurrentPosition(

      position => {

        CURRENT_LAT =
          position.coords.latitude;

        CURRENT_LNG =
          position.coords.longitude;

        reverseGeocodeLocation(
          CURRENT_LAT,
          CURRENT_LNG
        );
      },

      () => {

        // GPS failed — restore saved coordinates and
        // refresh UI/content without changing location.
        const saved =
          getSavedLocation();

        CURRENT_LAT =
          saved.lat;

        CURRENT_LNG =
          saved.lng;

        updateLocationCard();
        loadAll();
      },

      {
        enableHighAccuracy:
          CONFIG.GPS.HIGH_ACCURACY,

        timeout:
          CONFIG.GPS.TIMEOUT,

        maximumAge:
          CONFIG.GPS.MAXIMUM_AGE
      }
    );
}

/*
============================================================
USE NATIVE CURRENT LOCATION (ANDROID BRIDGE)
============================================================

Called only when window.EkkaNativeLocation is available
(inside the Android APK). Returns the same result shape
as the browser GPS success path so reverseGeocodeLocation()
and the existing location pipeline continue to work unchanged.
*/

async function useNativeCurrentLocation(
  nativeLocation,
  gpsText,
  locationSubtitle
) {

  if (gpsText) {
    gpsText.innerText =
      "Detecting location...";
  }

  if (locationSubtitle) {
    locationSubtitle.innerText =
      "Please wait";
  }

  try {

    const result =
      await nativeLocation.getCurrentLocation();

    if (
      result &&
      result.latitude != null &&
      result.longitude != null
    ) {

      CURRENT_LAT = result.latitude;
      CURRENT_LNG = result.longitude;

      reverseGeocodeLocation(
        CURRENT_LAT,
        CURRENT_LNG
      );
    } else {
      throw new Error(
        "No location data received"
      );
    }
  } catch (error) {

    console.log(
      "Native location error:",
      error
    );

    let errorMessage =
      "Location unavailable";

    const errorCode =
      error && error.code
        ? error.code
        : null;

    switch (errorCode) {
      case "PERMISSION_DENIED":
        errorMessage =
          "Location permission denied";
        break;

      case "PERMISSION_PERMANENTLY_DENIED":
        errorMessage =
          "Enable location permission in settings";
        break;

      case "LOCATION_TIMEOUT":
        errorMessage =
          "Location timed out";
        break;

      case "LOCATION_DISABLED":
        errorMessage =
          "Enable location services";
        break;

      case "LOCATION_UNAVAILABLE":
        errorMessage =
          "Location unavailable";
        break;

      default:
        errorMessage =
          "Location service unavailable";
    }

    if (gpsText) {
      gpsText.innerText = errorMessage;
    }

    if (locationSubtitle) {
      locationSubtitle.innerText = "";
    }

    // GPS failed — restore saved coordinates and
    // refresh UI/content without changing location.
    const saved =
      getSavedLocation();

    CURRENT_LAT =
      saved.lat;

    CURRENT_LNG =
      saved.lng;

    updateLocationCard();
    loadAll();
  }
}


/*
============================================================
RADIUS
============================================================
*/

function getRadius() {

  const radius =
    document.getElementById(
      "radius"
    );

  if (!radius) {
    return CONFIG.DEFAULT_RADIUS;
  }

  return radius.value;
}


function syncDiscoCompact() {
  const radius = document.getElementById("radius");
  const label = document.getElementById("discoCompactRadiusLabel");
  if (radius && label) {
    label.textContent = radius.options[radius.selectedIndex].text;
  }
  const gpsText = document.getElementById("gpsText");
  const compactText = document.getElementById("discoCompactText");
  if (gpsText && compactText) {
    compactText.textContent = gpsText.textContent.replace("GPS: ","");
  }
}

function toggleDiscoRadiusPicker(forceClose) {
  const picker = document.getElementById("discoRadiusPicker");
  if (!picker) return;
  if (forceClose === true) {
    picker.classList.remove("open");
    return;
  }
  picker.classList.toggle("open");
}

function pickDiscoRadius(value) {
  const radius = document.getElementById("radius");
  if (!radius) return;
  radius.value = value;
  const event = new Event("change");
  radius.dispatchEvent(event);
  toggleDiscoRadiusPicker(true);
  syncDiscoCompact();
}

function initRadius() {

  const radius =
    document.getElementById(
      "radius"
    );

  if (!radius)
    return;

  radius.value =
    getCurrentRadius();

  radius.addEventListener(
    "change",
    () => {

      saveRadius(
        radius.value
      );

      syncDiscoCompact();

      loadAll();
    }
  );
}


/*
============================================================
LOAD EVERYTHING
============================================================
*/

function loadAll() {

  refreshLoginUI();
  refreshDrawerIdentity();

  if (
    typeof loadProducts ===
    "function"
  ) {
    loadProducts();
  }

  if (
    typeof loadBusinesses ===
    "function"
  ) {
    loadBusinesses();
  }

  if (
    typeof loadProperties ===
    "function"
  ) {
    loadProperties();
  }

  if (
    typeof loadNews ===
    "function"
  ) {
    loadNews();
  }

  if (
    typeof loadLive ===
    "function"
  ) {
    loadLive();
  }

  if (
    typeof loadAnnouncements ===
    "function"
  ) {
    loadAnnouncements();
  }

  if (
    typeof loadWallet ===
    "function"
  ) {
    loadWallet();
  }

  if (
    typeof loadProfile ===
    "function"
  ) {
    loadProfile();
  }

  if (
    typeof loadNotifications ===
    "function"
  ) {
    loadNotifications();
  }

  // Sync drawer notification badge with latest unread count
  updateDrawerNotificationBadge();

  if (
    typeof loadAdvertisements ===
    "function"
  ) {
    loadAdvertisements();
  }

  if (
    typeof loadPromotedNearYou ===
    "function"
  ) {
    loadPromotedNearYou();
  }

  if (typeof loadPipQueue === "function") {
    setTimeout(function() {
      console.log("Phase4: PIP initialization started");
      loadPipQueue();
    }, 2000);
  }
}


/*
============================================================
LOAD DASHBOARD
?action=dashboard&userId=U001
============================================================
*/

function loadDashboard() {
  const userId = typeof getUserId === "function" ? getUserId() : "";
  const session = typeof getSessionToken === "function"
    ? getSessionToken()
    : (localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION) || "");

  if (!userId || !session) {
    renderGuestDashboard();
    return;
  }

  const url = getApiUrl() +
    "?action=dashboard" +
    "&userId=" + encodeURIComponent(userId) +
    "&session=" + encodeURIComponent(session);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.success && res.data) {
        renderDashboard(res.data);
      } else if (res && (res.message === "Authentication required" || res.message === "Invalid or expired session" || res.message === "Invalid session")) {
        renderGuestDashboard();
      } else {
        var container = document.getElementById("dashboardContent");
        if (container) {
          container.innerHTML =
            '<div class="card" style="text-align:center;padding:40px 20px;">' +
            '<h3 style="margin-bottom:10px;">Unable to load dashboard</h3>' +
            '<p style="color:#666;margin-bottom:20px;">' + ((res && res.message) ? res.message : "Unable to retrieve dashboard data. Please check your connection and try again.") + '</p>' +
            '<button onclick="loadDashboard()">Retry</button>' +
            '</div>';
        }
      }
    })
    .catch(function(err) {
      console.log("Dashboard load error:", err);
      var container = document.getElementById("dashboardContent");
      if (container) {
        container.innerHTML =
          '<div class="card" style="text-align:center;padding:40px 20px;">' +
          '<h3 style="margin-bottom:10px;">Connection Issue</h3>' +
          '<p style="color:#666;margin-bottom:20px;">Unable to connect to the server. Please check your internet connection and try again.</p>' +
          '<button onclick="loadDashboard()">Retry</button>' +
          '</div>';
      }
    });
}


/*
============================================================
RENDER DASHBOARD
============================================================
*/

function renderGuestDashboard() {
  var container = document.getElementById("dashboardContent");
  if (!container) return;

  var html = '';
  html += '<div class="card" style="text-align:center;padding:40px 20px;">';
  html += '<h3 style="margin-bottom:10px;">My Dashboard</h3>';
  html += '<p style="color:#666;margin-bottom:20px;">Please login to access your personal dashboard, view your activity, and manage your content.</p>';
  html += '<button onclick="openPage(\'login\')">Login</button>';
  html += '<button onclick="openPage(\'login\')" class="btn-gray" style="margin-top:10px;">Login / Register</button>';
  html += '<button onclick="openPage(\'home\')" class="btn-gray" style="margin-top:10px;">Continue As Guest</button>';
  html += '</div>';

  container.innerHTML = html;
}

function renderDashboard(data) {
  var container = document.getElementById("dashboardContent");
  if (!container) return;

  var profile = data.profile || {};
  var activity = data.activity || {};
  var quickStats = data.quickStats || {};
  var wallet = data.wallet || {};
  var orders = data.orders || [];
  var notifications = data.notifications || [];

  // My Posts aggregate from canonical realCounts
  var realCounts = data.realCounts || {};
  var myPosts =
    Number(realCounts.products || 0) +
    Number(realCounts.businesses || 0) +
    Number(realCounts.properties || 0) +
    Number(realCounts.news || 0);

  var productsCount = realCounts.products || 0;
  var businessesCount = realCounts.businesses || 0;
  var propertiesCount = realCounts.properties || 0;
  var newsCount = realCounts.news || 0;
  var liveCount = realCounts.live || 0;

  var profilePhotoHtml = profile.profilePhoto
    ? '<img class="dashboardProfilePhoto" src="' + profile.profilePhoto + '" alt="Profile">'
    : '<div class="dashboardProfilePhotoPlaceholder">' + (profile.name ? profile.name.charAt(0).toUpperCase() : "U") + '</div>';

  var verifBadge = profile.verificationStatus === "Active" || profile.verificationStatus === "Verified"
    ? '<span class="dashboardBadge verified">Verified</span>'
    : '<span class="dashboardBadge pending">Pending</span>';

  // Wallet derived values
  var availableCoins = Number((wallet && wallet.balance !== undefined) ? wallet.balance : (profile.walletBalance !== undefined ? profile.walletBalance : (profile.coins || 0)));
  var totalCoins = Number(profile.coins !== undefined ? profile.coins : availableCoins);
  var reservedCoins = Math.max(0, totalCoins - availableCoins);

  var html = '';

  // 1. PREMIUM HEADER
  html += '<div class="dashboardPremiumHeader">';
  html += '<button class="dashboardBackBtn" onclick="goBack()"><i class="material-icons">arrow_back</i></button>';
  html += '<h2 class="dashboardHeaderTitle">Dashboard</h2>';
  html += '<button class="dashboardSettingsBtn" onclick="openPage(\'profile\')"><i class="material-icons">settings</i></button>';
  html += '</div>';

  // 2. PREMIUM USER CARD WITH STATS
  html += '<div class="dashboardSection">';
  html += '<div class="dashboardProfileCard dashboardHeroCard">';
  html += '<div class="dashboardProfileHeader">';
  html += profilePhotoHtml;
  html += '<div class="dashboardProfileInfo">';
  html += '<h3>' + escapeHtml(profile.name || "User") + ' ' + verifBadge + '</h3>';
  html += '<p class="dashboardProfileContact"><i class="material-icons">phone</i> ' + escapeHtml(profile.mobile || "") + '</p>';
  html += '<p class="dashboardProfileContact"><i class="material-icons">email</i> ' + escapeHtml(profile.email || "") + '</p>';
  html += '<p class="dashboardMemberSince"><i class="material-icons">calendar_today</i> Member since ' + escapeHtml(profile.memberSince || "") + '</p>';
  html += '</div></div>';

  // Stats row inside hero card
  html += '<div class="dashboardPremiumStats">';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + totalCoins + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Coins</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + myPosts + '</div>';
  html += '<div class="dashboardPremiumStatLabel">My Posts</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + (quickStats.leads || 0) + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Leads</div>';
  html += '</div>';
  html += '<div class="dashboardPremiumStatItem">';
  html += '<div class="dashboardPremiumStatValue">' + (quickStats.orders || 0) + '</div>';
  html += '<div class="dashboardPremiumStatLabel">Orders</div>';
  html += '</div>';
  html += '</div>';

  html += '</div>';
  html += '</div>';

  // 3. QUICK ACTIONS (8 actions, 4x2 grid)
  html += '<div class="dashboardSection"><h3 class="dashboardSectionTitle">Quick Actions</h3>';
  html += '<div class="dashboardQuickActions">';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'product\')"><div class="dashboardQuickActionIcon"><i class="material-icons">shopping_bag</i></div><span>Post Product</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'business\')"><div class="dashboardQuickActionIcon"><i class="material-icons">store</i></div><span>Post Business</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'property\')"><div class="dashboardQuickActionIcon"><i class="material-icons">real_estate_agent</i></div><span>Post Property</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPostFormWithLogin(\'news\')"><div class="dashboardQuickActionIcon"><i class="material-icons">newspaper</i></div><span>Post News</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'live\')"><div class="dashboardQuickActionIcon"><i class="material-icons">live_tv</i></div><span>Go Live</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'promotions\')"><div class="dashboardQuickActionIcon"><i class="material-icons">trending_up</i></div><span>Create Promotion</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'wallet\')"><div class="dashboardQuickActionIcon"><i class="material-icons">account_balance_wallet</i></div><span>Wallet</span></div>';
  html += '<div class="dashboardQuickAction" onclick="openPage(\'invite\')"><div class="dashboardQuickActionIcon"><i class="material-icons">person_add</i></div><span>Invite & Earn</span></div>';
  html += '</div></div>';

  // 4. MY ACTIVITY (Compact rows)
  html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">My Activity</h3><span class="dashboardViewAll" onclick="openPage(\'myContent\')">View All</span></div>';
  if (myPosts === 0) {
    html += '<div class="dashboardEmpty">No activity yet. Start posting to see your content here.</div>';
  } else {
    html += '<div class="dashboardActivityListCompact">';
    if (productsCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'products\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">shopping_bag</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Products</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + productsCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + productsCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (businessesCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'businesses\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">store</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Businesses</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + businessesCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + businessesCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (propertiesCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'properties\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">real_estate_agent</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Properties</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + propertiesCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + propertiesCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (newsCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'news\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">newspaper</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">News</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + newsCount + ' Published</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + newsCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    if (liveCount > 0) {
      html += '<div class="dashboardActivityRow" onclick="openMyContent(\'live\')">';
      html += '<div class="dashboardActivityRowIcon"><i class="material-icons">live_tv</i></div>';
      html += '<div class="dashboardActivityRowContent">';
      html += '<div class="dashboardActivityRowTitle">Live</div>';
      html += '<div class="dashboardActivityRowSubtitle">' + liveCount + ' Active</div>';
      html += '</div>';
      html += '<div class="dashboardActivityRowCount">' + liveCount + '</div>';
      html += '<i class="material-icons dashboardActivityRowChevron">chevron_right</i>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  // 5. WALLET (Compact card)
  html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">My Wallet</h3><span class="dashboardViewAll" onclick="openPage(\'wallet\')">View All</span></div>';
  html += '<div class="dashboardWalletCard">';
  html += '<div class="dashboardWalletRow">';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Total Coins</div>';
  html += '<div class="dashboardWalletItemValue">' + totalCoins + '</div>';
  html += '</div>';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Available Coins</div>';
  html += '<div class="dashboardWalletItemValue">' + availableCoins + '</div>';
  html += '</div>';
  html += '<div class="dashboardWalletItem">';
  html += '<div class="dashboardWalletItemLabel">Locked / Reserve</div>';
  html += '<div class="dashboardWalletItemValue">' + reservedCoins + '</div>';
  html += '</div>';
  html += '</div>';
  html += '<button onclick="openPage(\'wallet\')" class="dashboardWalletTopupBtn"><i class="material-icons">add</i> Top Up</button>';
  html += '</div></div>';

  // 6. RECENT ORDERS (Compact list)
  if (orders.length > 0) {
    html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">Recent Orders / Leads</h3><span class="dashboardViewAll" onclick="openPage(\'orders\')">View All</span></div>';
    html += '<div class="dashboardOrdersListCompact">';
    orders.slice(0, 5).forEach(function(order) {
      var statusClass = order.type === 'lead' ? 'lead' : 'order';
      var statusLabel = order.type === 'lead' ? 'Lead' : 'Order';
      html += '<div class="dashboardOrderRow" onclick="openPage(\'orders\')">';
      html += '<div class="dashboardOrderRowThumb"><i class="material-icons">' + (order.type === 'lead' ? 'handshake' : 'receipt_long') + '</i></div>';
      html += '<div class="dashboardOrderRowInfo">';
      html += '<div class="dashboardOrderRowTitle">' + escapeHtml(order.title || "Order") + '</div>';
      html += '<div class="dashboardOrderRowTime">' + escapeHtml(order.date || "") + '</div>';
      html += '</div>';
      html += '<span class="dashboardOrderRowStatus ' + statusClass + '">' + statusLabel + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  // 7. RECENT NOTIFICATIONS (Compact list)
  if (notifications.length > 0) {
    html += '<div class="dashboardSection"><div class="dashboardSectionHeader"><h3 class="dashboardSectionTitle">Recent Notifications</h3><span class="dashboardViewAll" onclick="openPage(\'notifications\')">View All</span></div>';
    html += '<div class="dashboardNotificationsListCompact">';
    notifications.slice(0, 5).forEach(function(notif) {
      html += '<div class="dashboardNotificationRow" onclick="openPage(\'notifications\')">';
      html += '<div class="dashboardNotificationRowIcon"><i class="material-icons">' + (notif.icon || 'notifications') + '</i></div>';
      html += '<div class="dashboardNotificationRowInfo">';
      html += '<div class="dashboardNotificationRowTitle">' + escapeHtml(notif.title || "Notification") + '</div>';
      html += '</div>';
      html += '<div class="dashboardNotificationRowTime">' + escapeHtml(notif.time || "") + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  container.innerHTML = html;
}


/*
============================================================
GET USER ID
============================================================
*/

function getUserId() {
  try {
    var userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NEW);
    if (userData) {
      var user = JSON.parse(userData);
      return user.UserID || user.userId || "";
    }
    var sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (sessionData) {
      var session = JSON.parse(sessionData);
      return session.UserID || session.userId || "";
    }
  } catch (e) {
    // silent
  }
  return "";
}


/*
============================================================
OPEN POST FORM WITH LOGIN CHECK
============================================================
*/

function openPostFormWithLogin(type) {

  if (!requireLogin()) {
    return;
  }

  openPostForm(type);
}


/*
============================================================
APP START
============================================================
*/

function handleInitialDeepLink() {
  try {
    const hash = (window.location && window.location.hash) ? window.location.hash : "";
    const pathname = (window.location && window.location.pathname) ? window.location.pathname : "";
    const search = (window.location && window.location.search) ? window.location.search : "";

    // If an explicit non-entity hash was navigated to (e.g. #home, #login, #register, #notifications),
    // do not re-trigger deep linking from pathname.
    const isRootOrNonEntityHash = /^#(?:home|login|register|notifications|wallet|orders|ads|mycontent)(?:\/|\?|$)/i.test(hash);
    if (isRootOrNonEntityHash) {
      return false;
    }

    // 1. STORE
    let storeId = "";
    const storePathMatch = pathname.match(/\/store\/([a-zA-Z0-9_-]+)/i);
    if (storePathMatch && storePathMatch[1]) {
      storeId = decodeURIComponent(storePathMatch[1]);
    }
    if (!storeId && search) {
      const sp = new URLSearchParams(search);
      const qVal = sp.get("store") || sp.get("businessId");
      if (qVal && /^[a-zA-Z0-9_-]+$/.test(qVal.trim())) {
        storeId = qVal.trim();
      }
    }
    if (!storeId && hash) {
      const hashDetailMatch = hash.match(/^#store\/([a-zA-Z0-9_-]+)/i);
      if (hashDetailMatch && hashDetailMatch[1]) {
        storeId = decodeURIComponent(hashDetailMatch[1]);
      } else {
        const hashQueryMatch = hash.match(/[?&](?:store|businessId)=([a-zA-Z0-9_-]+)/i);
        if (hashQueryMatch && hashQueryMatch[1]) {
          storeId = decodeURIComponent(hashQueryMatch[1]);
        }
      }
    }
    if (storeId && typeof openStore === "function") {
      openStore(storeId);
      return true;
    }

    // 2. PRODUCT
    let productId = "";
    const productPathMatch = pathname.match(/\/(?:product|products)\/([a-zA-Z0-9_-]+)/i);
    if (productPathMatch && productPathMatch[1]) {
      productId = decodeURIComponent(productPathMatch[1]);
    }
    if (!productId && search) {
      const sp = new URLSearchParams(search);
      const qVal = sp.get("product") || sp.get("productId");
      if (qVal && /^[a-zA-Z0-9_-]+$/.test(qVal.trim())) {
        productId = qVal.trim();
      }
    }
    if (!productId && hash) {
      const hashMatch = hash.match(/^#(?:product|products)\/([a-zA-Z0-9_-]+)/i);
      if (hashMatch && hashMatch[1]) {
        productId = decodeURIComponent(hashMatch[1]);
      } else {
        const hashQueryMatch = hash.match(/[?&](?:product|productId)=([a-zA-Z0-9_-]+)/i);
        if (hashQueryMatch && hashQueryMatch[1]) {
          productId = decodeURIComponent(hashQueryMatch[1]);
        }
      }
    }
    if (productId && typeof showProductDetailsById === "function") {
      showProductDetailsById(productId);
      return true;
    }

    // 3. PROPERTY
    let propertyId = "";
    const propertyPathMatch = pathname.match(/\/(?:property|properties)\/([a-zA-Z0-9_-]+)/i);
    if (propertyPathMatch && propertyPathMatch[1]) {
      propertyId = decodeURIComponent(propertyPathMatch[1]);
    }
    if (!propertyId && search) {
      const sp = new URLSearchParams(search);
      const qVal = sp.get("property") || sp.get("propertyId");
      if (qVal && /^[a-zA-Z0-9_-]+$/.test(qVal.trim())) {
        propertyId = qVal.trim();
      }
    }
    if (!propertyId && hash) {
      const hashMatch = hash.match(/^#(?:property|properties)\/([a-zA-Z0-9_-]+)/i);
      if (hashMatch && hashMatch[1]) {
        propertyId = decodeURIComponent(hashMatch[1]);
      } else {
        const hashQueryMatch = hash.match(/[?&](?:property|propertyId)=([a-zA-Z0-9_-]+)/i);
        if (hashQueryMatch && hashQueryMatch[1]) {
          propertyId = decodeURIComponent(hashQueryMatch[1]);
        }
      }
    }
    if (propertyId && typeof showPropertyDetailsById === "function") {
      showPropertyDetailsById(propertyId);
      return true;
    }

    // 4. NEWS
    let newsId = "";
    const newsPathMatch = pathname.match(/\/(?:news|article)\/([a-zA-Z0-9_-]+)/i);
    if (newsPathMatch && newsPathMatch[1]) {
      newsId = decodeURIComponent(newsPathMatch[1]);
    }
    if (!newsId && search) {
      const sp = new URLSearchParams(search);
      const qVal = sp.get("news") || sp.get("newsId") || sp.get("article") || sp.get("articleId");
      if (qVal && /^[a-zA-Z0-9_-]+$/.test(qVal.trim())) {
        newsId = qVal.trim();
      }
    }
    if (!newsId && hash) {
      const hashMatch = hash.match(/^#(?:news|article)\/([a-zA-Z0-9_-]+)/i);
      if (hashMatch && hashMatch[1]) {
        newsId = decodeURIComponent(hashMatch[1]);
      } else {
        const hashQueryMatch = hash.match(/[?&](?:news|newsId|article|articleId)=([a-zA-Z0-9_-]+)/i);
        if (hashQueryMatch && hashQueryMatch[1]) {
          newsId = decodeURIComponent(hashQueryMatch[1]);
        }
      }
    }
    if (newsId && typeof showNewsDetailsById === "function") {
      showNewsDetailsById(newsId);
      return true;
    }

  } catch (err) {
    console.warn("handleInitialDeepLink error:", err);
  }
  return false;
}

window.addEventListener(
  "load",
  () => {

    initRadius();

    initSearchLocationUI();

    refreshLoginUI();

    refreshDrawerIdentity();

    // Initialize drawer keyboard navigation (a11y)
    initDrawerKeyboardNav();

    // Check if there is a pending push notification click action (e.g. cold start)
    let handledPendingPush = false;
    if (window.EkkaPush && typeof window.EkkaPush.hasPendingAction === "function" && window.EkkaPush.hasPendingAction()) {
      handledPendingPush = window.EkkaPush.consumePendingAction();
    }

    // Check for deep links / direct URLs (e.g. /store/:id, #store/:id, #store?store=:id, ?store=:id)
    let handledDeepLink = false;
    if (!handledPendingPush) {
      handledDeepLink = handleInitialDeepLink();
    }

    // Only default to "home" if neither notification nor deep link was handled
    if (!handledPendingPush && !handledDeepLink) {
      openPage("home");
    }

    // Mark app ready in EkkaPush so any subsequent notification clicks execute immediately
    if (window.EkkaPush && typeof window.EkkaPush.setAppReady === "function") {
      window.EkkaPush.setAppReady(true);
    }

    loadLocation();

    if (
      typeof autoFillMobile ===
      "function"
    ) {
      setTimeout(
        autoFillMobile,
        500
      );
    }
  }
);