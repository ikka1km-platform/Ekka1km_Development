/*
============================================================
EKKA1KM FRONTEND
PullToRefresh.js
Universal Mobile Pull-to-Refresh Gesture Engine
============================================================
*/

(function () {
  "use strict";

  const PULL_THRESHOLD = 70; // Pixels to trigger refresh
  const MAX_PULL = 120;     // Max drag distance with resistance
  let startY = 0;
  let startX = 0;
  let currentY = 0;
  let isPulling = false;
  let isRefreshing = false;
  let hasHapticFired = false;

  // Create UI Container
  let ptrContainer = null;
  let ptrIcon = null;
  let ptrText = null;

  function initUI() {
    if (document.getElementById("ekkaPtrContainer")) return;

    const style = document.createElement("style");
    style.id = "ekkaPtrStyles";
    style.textContent = `
      .ekka-ptr-container {
        position: fixed;
        top: 64px;
        left: 50%;
        transform: translate3d(-50%, -80px, 0);
        z-index: 999;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(34, 197, 94, 0.35);
        color: #f8fafc;
        padding: 8px 18px;
        border-radius: 30px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 500;
        pointer-events: none;
        transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
        opacity: 0;
      }
      .ekka-ptr-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        color: #22c55e;
        transition: transform 0.2s ease;
      }
      .ekka-ptr-icon.spinning {
        animation: ekkaPtrSpin 0.75s linear infinite;
      }
      .ekka-ptr-text {
        letter-spacing: 0.2px;
      }
      @keyframes ekkaPtrSpin {
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    ptrContainer = document.createElement("div");
    ptrContainer.id = "ekkaPtrContainer";
    ptrContainer.className = "ekka-ptr-container";
    ptrContainer.innerHTML = `
      <span class="ekka-ptr-icon" id="ekkaPtrIcon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </span>
      <span class="ekka-ptr-text" id="ekkaPtrText">Pull to refresh</span>
    `;
    document.body.appendChild(ptrContainer);

    ptrIcon = document.getElementById("ekkaPtrIcon");
    ptrText = document.getElementById("ekkaPtrText");
  }

  function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function onTouchStart(e) {
    if (isRefreshing) return;
    if (getScrollTop() > 5) return;

    const touch = e.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
    currentY = startY;
    isPulling = false;
    hasHapticFired = false;
  }

  function onTouchMove(e) {
    if (isRefreshing) return;
    if (getScrollTop() > 5) return;

    const touch = e.touches[0];
    currentY = touch.clientY;
    const deltaY = currentY - startY;
    const deltaX = Math.abs(touch.clientX - startX);

    // Prevent horizontal swipes (e.g. carousels/drawers) from triggering pull
    if (deltaX > deltaY) return;

    if (deltaY > 10 && getScrollTop() <= 0) {
      isPulling = true;
      initUI();

      // Non-linear dampening formula (feels natural & elastic)
      const pullDistance = Math.min(MAX_PULL, deltaY * 0.45);
      const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

      if (ptrContainer) {
        ptrContainer.style.opacity = Math.max(0.2, progress).toString();
        ptrContainer.style.transform = `translate3d(-50%, ${pullDistance}px, 0)`;
      }

      if (ptrIcon) {
        ptrIcon.style.transform = `rotate(${progress * 240}deg)`;
      }

      if (pullDistance >= PULL_THRESHOLD) {
        if (!hasHapticFired) {
          hasHapticFired = true;
          if (navigator.vibrate) try { navigator.vibrate(12); } catch (_) {}
        }
        if (ptrText) ptrText.textContent = "Release to refresh";
        if (ptrIcon) ptrIcon.style.color = "#4ade80";
      } else {
        hasHapticFired = false;
        if (ptrText) ptrText.textContent = "Pull down to refresh";
        if (ptrIcon) ptrIcon.style.color = "#22c55e";
      }

      // Prevent native browser overscroll bounce if pulling actively
      if (e.cancelable && deltaY > 30) {
        e.preventDefault();
      }
    }
  }

  function onTouchEnd() {
    if (!isPulling || isRefreshing) return;
    isPulling = false;

    const deltaY = currentY - startY;
    const pullDistance = Math.min(MAX_PULL, deltaY * 0.45);

    if (pullDistance >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      resetUI();
    }
  }

  async function triggerRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    initUI();

    if (ptrContainer) {
      ptrContainer.style.transform = "translate3d(-50%, 45px, 0)";
      ptrContainer.style.opacity = "1";
    }
    if (ptrIcon) {
      ptrIcon.classList.add("spinning");
    }
    if (ptrText) {
      ptrText.textContent = "Refreshing...";
    }

    try {
      await executePageRefresh();
      if (ptrText) ptrText.textContent = "Updated!";
      if (ptrIcon) {
        ptrIcon.classList.remove("spinning");
        ptrIcon.style.color = "#22c55e";
      }
    } catch (err) {
      console.warn("Pull-to-refresh error", err);
      if (ptrText) ptrText.textContent = "Refreshed";
    } finally {
      setTimeout(function () {
        resetUI();
        isRefreshing = false;
      }, 500);
    }
  }

  function resetUI() {
    if (ptrContainer) {
      ptrContainer.style.transform = "translate3d(-50%, -80px, 0)";
      ptrContainer.style.opacity = "0";
    }
    if (ptrIcon) {
      ptrIcon.classList.remove("spinning");
      ptrIcon.style.transform = "rotate(0deg)";
    }
  }

  /**
   * Intelligently dispatches refresh to active page
   */
  async function executePageRefresh() {
    let currentPage = "home";
    if (typeof getCurrentPageId === "function") {
      currentPage = getCurrentPageId();
    } else if (window.location.hash) {
      currentPage = window.location.hash.replace(/^#/, "");
    }

    const refreshTasks = [];

    // Global location / badge updates
    if (typeof loadUnreadNotificationCount === "function") refreshTasks.push(loadUnreadNotificationCount());

    switch (currentPage) {
      case "notifications":
        if (typeof loadNotifications === "function") refreshTasks.push(loadNotifications());
        break;

      case "wallet":
        if (typeof loadWalletData === "function") refreshTasks.push(loadWalletData());
        if (typeof loadWalletTransactions === "function") refreshTasks.push(loadWalletTransactions());
        break;

      case "dashboard":
        if (typeof loadDashboard === "function") refreshTasks.push(loadDashboard());
        break;

      case "products":
        if (typeof loadProducts === "function") refreshTasks.push(loadProducts());
        break;

      case "businesses":
        if (typeof loadBusinesses === "function") refreshTasks.push(loadBusinesses());
        break;

      case "properties":
        if (typeof loadProperties === "function") refreshTasks.push(loadProperties());
        break;

      case "news":
        if (typeof loadNews === "function") refreshTasks.push(loadNews());
        break;

      case "live":
        if (typeof loadLiveStreams === "function") refreshTasks.push(loadLiveStreams());
        break;

      case "orders":
        if (typeof loadOrdersPage === "function") refreshTasks.push(loadOrdersPage());
        break;

      case "myContent":
        if (typeof loadMyContent === "function") refreshTasks.push(loadMyContent());
        break;

      case "adcenter":
        if (typeof openAdCenterPage === "function") refreshTasks.push(openAdCenterPage());
        break;

      case "profile":
        if (typeof loadProfileData === "function") refreshTasks.push(loadProfileData());
        break;

      case "home":
      default:
        if (typeof loadProducts === "function") refreshTasks.push(loadProducts());
        if (typeof loadBusinesses === "function") refreshTasks.push(loadBusinesses());
        if (typeof loadProperties === "function") refreshTasks.push(loadProperties());
        if (typeof loadNews === "function") refreshTasks.push(loadNews());
        if (typeof loadNotifications === "function") refreshTasks.push(loadNotifications());
        break;
    }

    // Await all async refresh tasks or give a minimum 350ms feeling
    const minDelay = new Promise((resolve) => setTimeout(resolve, 400));
    await Promise.allSettled([...refreshTasks, minDelay]);
  }

  // Register Event Listeners
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd, { passive: true });

  // Expose global API
  window.triggerPullToRefresh = triggerRefresh;

  // Auto-init on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }
})();
