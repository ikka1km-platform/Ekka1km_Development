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
      <div class="card">

        <h2>
          🔔 Notifications Locked
        </h2>

        <p>
          Guest:
          ${guestId}
        </p>

        <p>
          Login to receive:
        </p>

        <ul style="text-align:left;">
          <li>Product enquiries</li>
          <li>Business enquiries</li>
          <li>Order updates</li>
          <li>Reward notifications</li>
          <li>Wallet notifications</li>
        </ul>

        <button
          onclick="openPage('login')">
          Login
        </button>

        <button
          onclick="openPage('register')"
          style="background:#666;">
          Register
        </button>

      </div>
      `;

    return;
  }

  /*
  ============================================================
  LOGGED IN USER
  ============================================================
  */

  container.innerHTML =
    "<div class='card'>Loading Notifications...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=notifications&userId=${userId}`
      );

    const json =
      await response.json();

    CURRENT_NOTIFICATIONS =
      json.data || [];

    renderNotifications();

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load notifications.</div>";
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
      <div class="card">
        No Notifications Found.
      </div>
      `;

    return;
  }

  let html = "";

  CURRENT_NOTIFICATIONS.forEach(
    item => {

      html += `
      <div class="card">

        <h3>
          ${item.Title || "Notification"}
        </h3>

        <p>
          ${item.Message || ""}
        </p>

        <small>
          ${item.CreatedDate || ""}
        </small>

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

