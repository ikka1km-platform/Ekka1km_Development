/* Android FCM bridge via @capacitor/push-notifications. No web push. */
(function () {
  const STORAGE_KEY = "ekka1km_push_token";
  const DEVICE_KEY = "ekka1km_push_device";
  let initialized = false;
  let listenersAttached = false;
  let isAppReady = false;
  let pendingAction = null;
  let lastNotificationId = "";

  function plugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
  }
  function deviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = "android-" + Date.now() + "-" + Math.random().toString(36).slice(2); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  }
  function session() { return localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION) || ""; }
  async function registerToken(token) {
    const activeSession = session();
    if (!token || !activeSession) return;
    const url = getApiUrl() + "?action=subscribetopush&session=" + encodeURIComponent(activeSession) + "&token=" + encodeURIComponent(token) + "&deviceId=" + encodeURIComponent(deviceId()) + "&platform=android&userId=" + encodeURIComponent(typeof getUserId === "function" ? getUserId() : "");
    const response = await fetch(url);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Push registration failed");
    localStorage.setItem(STORAGE_KEY, token);
  }

  function executeAction(payload) {
    if (!payload) return;

    const actionUrl = String(payload.actionUrl || "").trim();
    const notifId = payload.notificationId || "";

    if (notifId) {
      lastNotificationId = notifId;
      window.EkkaLastNotificationId = notifId;
      if (typeof markNotificationAsRead === "function") {
        try {
          markNotificationAsRead(notifId);
        } catch (_) {}
      }
    }

    // Default to opening Notifications Center if no custom deep link is provided
    if (!actionUrl) {
      if (typeof openPage === "function") {
        openPage("notifications");
      }
      return;
    }

    if (/^https?:\/\//i.test(actionUrl)) {
      window.location.assign(actionUrl);
      return;
    }

    const parts = actionUrl.replace(/^\/?#?\/?/, "").split(/[?/#]/);
    const rawPage = (parts[0] || "").toLowerCase().trim();
    const id = parts[1] || "";

    if (rawPage === "properties" || rawPage === "property" || rawPage === "propertydetails") {
      if (typeof openPage === "function") openPage("properties");
      if (id) {
        setTimeout(function () {
          if (typeof showPropertyDetailsById === "function") {
            showPropertyDetailsById(id);
          }
        }, 350);
      }
    } else if (rawPage === "products" || rawPage === "product" || rawPage === "productdetails") {
      if (typeof openPage === "function") openPage("products");
      if (id) {
        setTimeout(function () {
          if (typeof showProductDetailsById === "function") {
            showProductDetailsById(id);
          }
        }, 350);
      }
    } else if (rawPage === "businesses" || rawPage === "business" || rawPage === "businessdetails" || rawPage === "businessprofile") {
      if (typeof openPage === "function") openPage("businesses");
      if (id) {
        setTimeout(function () {
          if (typeof showBusinessDetailsById === "function") {
            showBusinessDetailsById(id);
          }
        }, 350);
      }
    } else if (rawPage === "news" || rawPage === "newsarticle" || rawPage === "article") {
      if (typeof openPage === "function") openPage("news");
      if (id) {
        setTimeout(function () {
          if (typeof showNewsDetailsById === "function") {
            showNewsDetailsById(id);
          }
        }, 350);
      }
    } else if (rawPage === "profile" || rawPage === "userprofile") {
      if (typeof openPage === "function") openPage("profile");
    } else if (typeof openPage === "function" && rawPage) {
      openPage(rawPage);
    } else if (typeof openPage === "function") {
      openPage("notifications");
    }
  }

  function handleAction(action) {
    if (!action) return;

    const data = (action && action.notification && action.notification.data) ||
                 (action && action.data) ||
                 (action && action.notification) ||
                 {};

    const notificationId = data.notificationId || data.notificationid || data.id || (action && action.notification && action.notification.id) || "";
    const actionUrl = data.actionUrl || data.actionurl || "";

    if (notificationId) {
      lastNotificationId = String(notificationId);
      window.EkkaLastNotificationId = lastNotificationId;
    }

    const payload = {
      actionUrl: actionUrl,
      notificationId: lastNotificationId,
      raw: action
    };

    // If the app UI/router is not ready yet, buffer the action for cold start
    if (!isAppReady || typeof window.openPage !== "function") {
      pendingAction = payload;
      return;
    }

    executeAction(payload);
  }

  function consumePendingAction() {
    if (!pendingAction) return false;
    const action = pendingAction;
    pendingAction = null;
    executeAction(action);
    return true;
  }

  function hasPendingAction() {
    return pendingAction !== null;
  }

  function setAppReady(ready) {
    isAppReady = !!ready;
    if (isAppReady && pendingAction) {
      consumePendingAction();
    }
  }

  function setupNativeListeners() {
    if (listenersAttached) return;
    const push = plugin();
    if (!push) return;

    listenersAttached = true;

    push.addListener("registration", function (token) {
      registerToken(token.value).catch(function (err) {
        console.warn("Push token registration failed", err);
      });
    });

    push.addListener("registrationError", function (err) {
      console.warn("FCM registration failed", err);
    });

    push.addListener("pushNotificationReceived", function (notification) {
      window.dispatchEvent(new CustomEvent("ekkaPushReceived", { detail: notification }));
      if (typeof loadNotifications === "function") {
        try { loadNotifications(); } catch (_) {}
      }
      if (typeof updateNotificationBadge === "function" && typeof getUnreadNotificationCount === "function") {
        try { updateNotificationBadge(getUnreadNotificationCount() + 1); } catch (_) {}
      }
    });

    push.addListener("pushNotificationActionPerformed", function (action) {
      handleAction(action);
    });
  }

  async function syncTokenAndPermissions() {
    const push = plugin();
    if (!push) return;

    try {
      const permission = await push.checkPermissions();
      let receive = permission && permission.receive;
      if (receive === "prompt") {
        const req = await push.requestPermissions();
        receive = req && req.receive;
      }
      if (receive === "granted") {
        await push.register();
      }
    } catch (err) {
      console.warn("Push permissions/registration error", err);
    }
  }

  async function initialize() {
    setupNativeListeners();
    if (initialized) return;

    const push = plugin();
    if (!push) return; // Browser build: push is Android-only.

    initialized = true;
    await syncTokenAndPermissions();
  }

  async function unsubscribeOnLogout() {
    initialized = false;
    const token = localStorage.getItem(STORAGE_KEY), activeSession = session();
    if (!token || !activeSession) return;
    try {
      await fetch(getApiUrl() + "?action=unsubscribefrompush&token=" + encodeURIComponent(token));
    } catch (err) {
      console.warn("Push unsubscribe failed", err);
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  window.EkkaPush = {
    initialize: initialize,
    unsubscribeOnLogout: unsubscribeOnLogout,
    handleAction: handleAction,
    consumePendingAction: consumePendingAction,
    hasPendingAction: hasPendingAction,
    setAppReady: setAppReady,
    getLastNotificationId: function () { return lastNotificationId; }
  };

  // Attach native listeners immediately when script evaluates
  setupNativeListeners();

  window.addEventListener("ekkaUserAuthenticated", function () {
    initialize().catch(function (err) {
      console.warn("Push initialization failed", err);
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    setupNativeListeners();
    initialize().catch(function () {});
  });
})();
