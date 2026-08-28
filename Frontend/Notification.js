/*
============================================================
EKKA1KM FRONTEND
Notification.js
Notification Center + Seller Notifications
V1.1 Trial
Guest Mode Supported
============================================================
*/

let CURRENT_NOTIFICATIONS = [];


/*
============================================================
SAFE RENDER HELPER (NOTIFICATION NAMESPACE)
Prevents undefined/null/NaN/Invalid Date from displaying.
============================================================
*/

function notificationSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}


/*
============================================================
TIME AGO HELPER (NOTIFICATION NAMESPACE)
============================================================
*/

function notificationTimeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    return date.toLocaleDateString();
  } catch (e) {
    return "";
  }
}


/*
============================================================
UPDATE NOTIFICATION BADGE
Updates the notification badge in the header.
============================================================
*/

function updateNotificationBadge(count) {
  const badge = document.getElementById("notificationBadge");
  if (!badge) return;
  
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}


/*
============================================================
MARK NOTIFICATION AS READ
============================================================
*/

async function markNotificationAsRead(notificationId) {
  try {
    const userId = getUserId();
    if (!userId || !notificationId) return;
    
    await fetch(
      `${getApiUrl()}?action=marknotificationread&notificationId=${encodeURIComponent(notificationId)}&userId=${encodeURIComponent(userId)}`
    );
    
    // Update local state
    const notification = CURRENT_NOTIFICATIONS.find(n => n.NotificationID === notificationId);
    if (notification) {
      notification.IsRead = true;
      notification.Status = "Read";
    }
    
    // Update badge
    const unreadCount = getUnreadNotificationCount();
    updateNotificationBadge(unreadCount);
    
    // Re-render to update visual state
    renderNotifications();
  } catch (err) {
    console.log("Error marking notification as read:", err);
  }
}


/*
============================================================
LOAD NOTIFICATIONS
============================================================
*/

async function loadNotifications() {

  const container =
    document.getElementById(
      "notificationList"
    );

  if (!container)
    return;

  const userId =
    getUserId();

  /*
  ============================================================
  GUEST USER
  ============================================================
  */

  if (!userId) {

    const guestId =
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.GUEST_ID
      ) || "Guest";

    container.innerHTML =
      `
      <div class="card notificationGuestState">
        <div class="notificationGuestStateIcon">
          <i class="material-icons">notifications_off</i>
        </div>
        <h2>Notifications Locked</h2>
        <p>Guest: ${guestId}</p>
        <p>Login to receive notifications</p>
        <ul style="text-align:left;margin:15px 0;">
          <li>Product enquiries</li>
          <li>Business enquiries</li>
          <li>Order updates</li>
          <li>Reward notifications</li>
          <li>Wallet notifications</li>
        </ul>
        <button onclick="openPage('login')">Login</button>
        <button onclick="openPage('register')" style="background:#666;">Register</button>
      </div>
      `;

    updateNotificationBadge(0);

    return;
  }

  /*
  ============================================================
  LOGGED IN USER
  ============================================================
  */

    container.innerHTML =
      "<div class='card'><div class='notificationLoadingState'>Loading Notifications...</div></div>";

  try {

    const sess = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION) || "";
    const response =
      await fetch(
        `${getApiUrl()}?action=notifications&userId=${encodeURIComponent(userId)}&session=${encodeURIComponent(sess)}`
      );

    const json =
      await response.json();

    CURRENT_NOTIFICATIONS =
      json.data || [];

    renderNotifications();

    // Update badge count
    const unreadCount = getUnreadNotificationCount();
    updateNotificationBadge(unreadCount);

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card notificationErrorState'>Unable to load notifications.</div>";
  }
}


/*
============================================================
RENDER NOTIFICATIONS
============================================================
*/

function renderNotifications() {

  const container =
    document.getElementById(
      "notificationList"
    );

  if (!container)
    return;

  if (
    CURRENT_NOTIFICATIONS.length === 0
  ) {
    container.innerHTML =
      `
      <div class="card notificationEmptyState">
        <div class="notificationEmptyStateIcon">
          <i class="material-icons">notifications_none</i>
        </div>
        <p>No notifications yet.</p>
      </div>
      `;

    return;
  }

  let html = "";

  CURRENT_NOTIFICATIONS.forEach(
    item => {
      const isUnread = !item.IsRead && item.IsRead !== true;
      const title = notificationSafeRender(item.Title) || "Notification";
      const message = notificationSafeRender(item.Message) || "";
      const date = notificationTimeAgo(item.CreatedDate);
      const type = notificationSafeRender(item.Type) || "";
      const icon = notificationSafeRender(item.Icon) || "notifications";
      const color = notificationSafeRender(item.Color) || "#555";
      
      html += `
      <div class="card notificationCard ${isUnread ? 'notificationUnread' : 'notificationRead'}" 
           onclick="markNotificationAsRead('${item.NotificationID}')">
        <div class="notificationHeader">
          <div class="notificationIcon" style="background:${color}20;color:${color};">
            <i class="material-icons">${icon}</i>
          </div>
          <div class="notificationInfo">
            <div class="notificationTitle">${notificationSafeRender(title)}</div>
            <div class="notificationMessage">${notificationSafeRender(message)}</div>
            <div class="notificationMeta">
              ${date ? `<span class="notificationDate">${date}</span>` : ''}
              ${type ? `<span class="notificationType">${notificationSafeRender(type)}</span>` : ''}
            </div>
          </div>
          ${isUnread ? '<div class="notificationUnreadDot"></div>' : ''}
        </div>
      </div>
      `;
    }
  );

  container.innerHTML =
    html;
}


/*
============================================================
SEND SELLER NOTIFICATION
============================================================
*/

async function sendSellerNotification(
  sellerUserId,
  title,
  message
) {

  try {

    /*
    Future Backend API

    ?action=createnotification
    */

    console.log(
      "Seller Notification",
      sellerUserId,
      title,
      message
    );

  }
  catch (err) {

    console.log(err);
  }
}


/*
============================================================
PRODUCT INTEREST NOTIFICATION
============================================================
*/

function notifyProductInterest(
  product
) {

  if (!product)
    return;

  /*
  ============================================================
  LOGIN REQUIRED
  ============================================================
  */

  if (!requireLogin()) {
    return;
  }

  const sellerId =
    product.OwnerUserID ||
    product.UserID ||
    "";

  if (!sellerId)
    return;

  const userId = getUserId();
  if (userId && String(userId) === String(sellerId)) {
    alert("You cannot interact with your own product.");
    return;
  }

  const user =
    getCurrentUser();

  const buyerName =
    user?.FullName ||
    "A User";

  sendSellerNotification(
    sellerId,
    "Product Interest",
    `${buyerName} is interested in your product "${product.Title || ""}".`
  );

  alert(
    "Interest sent to seller."
  );
}


/*
============================================================
BUSINESS CONTACT NOTIFICATION
============================================================
*/

function notifyBusinessContact(
  business
) {

  if (!business)
    return;

  /*
  ============================================================
  LOGIN REQUIRED
  ============================================================
  */

  if (!requireLogin()) {
    return;
  }

  const sellerId =
    business.OwnerUserID ||
    business.UserID ||
    "";

  if (!sellerId)
    return;

  const userId = getUserId();
  if (userId && String(userId) === String(sellerId)) {
    alert("You cannot interact with your own business.");
    return;
  }

  const user =
    getCurrentUser();

  const buyerName =
    user?.FullName ||
    "A User";

  sendSellerNotification(
    sellerId,
    "Business Enquiry",
    `${buyerName} wants to contact your business "${business.BusinessName || ""}".`
  );

  alert(
    "Enquiry sent to business owner."
  );
}


/*
============================================================
UNREAD COUNT
============================================================
*/

function getUnreadNotificationCount() {

  return CURRENT_NOTIFICATIONS.filter(
    n =>
      !n.IsRead &&
      n.IsRead !== true
  ).length;
}