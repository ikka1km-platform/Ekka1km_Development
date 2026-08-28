/* Android FCM bridge via @capacitor/push-notifications. No web push. */
(function () {
  const STORAGE_KEY = "ekka1km_push_token";
  const DEVICE_KEY = "ekka1km_push_device";
  let initialized = false;

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
  function handleAction(notification) {
    const data = (notification && notification.notification && notification.notification.data) || (notification && notification.data) || {};
    const actionUrl = data.actionUrl || data.actionurl || "";
    
    // Default to opening Notifications Center if no custom deep link is provided
    if (!actionUrl) {
      if (typeof openPage === "function") openPage("notifications");
      return;
    }
    
    if (/^https?:\/\//i.test(actionUrl)) {
      window.location.assign(actionUrl);
      return;
    }

    const parts = actionUrl.replace(/^\/?#?\/?/, "").split(/[?/#]/);
    const rawPage = (parts[0] || "").toLowerCase();
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
    } else if (rawPage === "businesses" || rawPage === "business" || rawPage === "businessdetails") {
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
    } else if (typeof openPage === "function" && rawPage) {
      openPage(rawPage);
    } else if (typeof openPage === "function") {
      openPage("notifications");
    }
  }
  async function initialize() {
    if (initialized || !session()) return;
    const push = plugin();
    if (!push) return; // Browser build: push is Android-only.
    initialized = true;
    push.addListener("registration", function (token) { registerToken(token.value).catch(function (err) { console.warn("Push token registration failed", err); }); });
    push.addListener("registrationError", function (err) { console.warn("FCM registration failed", err); });
    push.addListener("pushNotificationReceived", function (notification) {
      window.dispatchEvent(new CustomEvent("ekkaPushReceived", { detail: notification }));
      if (typeof loadNotifications === "function") {
        try { loadNotifications(); } catch (_) {}
      }
      if (typeof updateNotificationBadge === "function" && typeof getUnreadNotificationCount === "function") {
        try { updateNotificationBadge(getUnreadNotificationCount() + 1); } catch (_) {}
      }
    });
    push.addListener("pushNotificationActionPerformed", function (action) { handleAction(action); });
    const permission = await push.checkPermissions();
    if (permission.receive === "prompt") permission.receive = (await push.requestPermissions()).receive;
    if (permission.receive === "granted") await push.register();
  }
  async function unsubscribeOnLogout() {
    initialized = false;
    const token = localStorage.getItem(STORAGE_KEY), activeSession = session();
    if (!token || !activeSession) return;
    try { await fetch(getApiUrl() + "?action=unsubscribefrompush&token=" + encodeURIComponent(token)); }
    catch (err) { console.warn("Push unsubscribe failed", err); }
    localStorage.removeItem(STORAGE_KEY);
  }
  window.EkkaPush = { initialize: initialize, unsubscribeOnLogout: unsubscribeOnLogout, handleAction: handleAction };
  window.addEventListener("ekkaUserAuthenticated", function () { initialize().catch(function (err) { console.warn("Push initialization failed", err); }); });
  document.addEventListener("DOMContentLoaded", function () { initialize().catch(function () {}); });
})();
