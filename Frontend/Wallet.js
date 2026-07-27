/*
============================================================
EKKA1KM FRONTEND
Wallet.js
Wallet + Rewards + Transactions
V1.1 Trial
Guest Mode Supported
============================================================
*/

let CURRENT_WALLET = {};
let CURRENT_TRANSACTIONS = [];
let CURRENT_REWARDS = [];
let WALLET_FILTER = 'all'; // all, earned, spent


/*
SAFE RENDER HELPER (WALLET NAMESPACE)
Prevents undefined/null/NaN/Invalid Date from displaying.
*/

function walletSafeRender(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  if (val instanceof Date && isNaN(val.getTime())) return "";
  var s = String(val).trim();
  if (s === "undefined" || s === "null" || s === "NaN" || s === "Invalid Date") return "";
  return s;
}


/*
TIME AGO HELPER (WALLET NAMESPACE)
*/

function walletTimeAgo(dateStr) {
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
TRANSACTION TYPE LABEL MAPPING
Maps raw backend values to user-friendly labels.
*/

function getTransactionLabel(type, reason) {
  if (!type) return "Transaction";
  
  const typeUpper = String(type).toUpperCase();
  
  // Map common transaction types
  const typeMap = {
    "ADVERTISEMENT": "Ad Reward",
    "AD_REWARD": "Ad Reward",
    "REWARD": "Reward",
    "PROMOTION": "Promotion",
    "REDEMPTION": "Redemption",
    "PURCHASE": "Purchase",
    "REFUND": "Refund",
    "BONUS": "Bonus",
    "REFERRAL": "Referral",
    "ADMIN": "Admin Credit",
    "SYSTEM": "System"
  };
  
  // Use mapped label if available, otherwise use reason or original type
  if (typeMap[typeUpper]) {
    return typeMap[typeUpper];
  }
  
  // Fallback to reason if it exists and is meaningful
  if (reason && String(reason).trim().length > 0) {
    return String(reason).trim();
  }
  
  return type;
}


/*
SET WALLET FILTER
*/

function setWalletFilter(filter) {
  WALLET_FILTER = filter;
  if (CURRENT_TRANSACTIONS.length > 0) {
    renderFilteredTransactions();
  }
}


/*
RENDER FILTERED TRANSACTIONS
*/

function renderFilteredTransactions() {
  const container = document.getElementById("walletCard");
  if (!container) return;
  
  let filtered = CURRENT_TRANSACTIONS;
  
  if (WALLET_FILTER === 'earned') {
    filtered = CURRENT_TRANSACTIONS.filter(t => Number(t.Amount || 0) > 0);
  } else if (WALLET_FILTER === 'spent') {
    filtered = CURRENT_TRANSACTIONS.filter(t => Number(t.Amount || 0) < 0);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="sectionTitle">Transactions</div>
        <div class="walletEmptyState">
          <i class="material-icons" style="font-size:48px;color:#ccc;">receipt_long</i>
          <p>No ${WALLET_FILTER === 'all' ? '' : WALLET_FILTER + ' '}transactions found.</p>
        </div>
        <button onclick="loadWallet()" style="background:#666;">Back</button>
      </div>
    `;
    return;
  }
  
  let html = `
    <div class="sectionTitle">Transactions</div>
    <div class="walletFilterTabs">
      <button class="walletFilterTab ${WALLET_FILTER === 'all' ? 'active' : ''}" onclick="setWalletFilter('all')">All</button>
      <button class="walletFilterTab ${WALLET_FILTER === 'earned' ? 'active' : ''}" onclick="setWalletFilter('earned')">Earned</button>
      <button class="walletFilterTab ${WALLET_FILTER === 'spent' ? 'active' : ''}" onclick="setWalletFilter('spent')">Spent</button>
    </div>
  `;
  
  filtered.forEach(item => {
    const amount = Number(item.Amount || 0);
    const isCredit = amount > 0;
    const isDebit = amount < 0;
    const absAmount = Math.abs(amount);
    const label = getTransactionLabel(item.Type, item.Reason);
    const date = walletTimeAgo(item.CreatedDate);
    const status = walletSafeRender(item.Status);
    
    html += `
      <div class="card transactionCard ${isCredit ? 'transactionCredit' : ''} ${isDebit ? 'transactionDebit' : ''}">
        <div class="transactionHeader">
          <div class="transactionIcon ${isCredit ? 'iconCredit' : ''} ${isDebit ? 'iconDebit' : ''}">
            <i class="material-icons">${isCredit ? 'arrow_downward' : isDebit ? 'arrow_upward' : 'swap_horiz'}</i>
          </div>
          <div class="transactionInfo">
          <div class="transactionTitle">${walletSafeRender(label)}</div>
            <div class="transactionMeta">
              ${date ? `<span class="transactionDate">${date}</span>` : ''}
              ${status ? `<span class="transactionStatus">${walletSafeRender(status)}</span>` : ''}
            </div>
          </div>
          <div class="transactionAmount ${isCredit ? 'amountCredit' : ''} ${isDebit ? 'amountDebit' : ''}">
            ${isCredit ? '+' : ''}${isDebit ? '-' : ''}${absAmount}
          </div>
        </div>
      </div>
    `;
  });
  
  html += `<button onclick="loadWallet()" style="background:#666;">Back</button>`;
  
  container.innerHTML = html;
}


/*
============================================================
LOAD WALLET
============================================================
*/

async function loadWallet() {

  const container =
    document.getElementById(
      "walletCard"
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
      <div class="card walletGuestState">

        <h2>
          🔒 Wallet Locked
        </h2>

        <p>
          Guest:
          ${guestId}
        </p>

        <p>
          Login to access:
        </p>

        <ul style="text-align:left;">
          <li>Wallet Balance</li>
          <li>Reward Coins</li>
          <li>Transactions</li>
          <li>Coin Redemption</li>
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

    const walletHome =
      document.getElementById(
        "walletHome"
      );

    if (walletHome) {
      walletHome.innerText = "0";
    }

    return;
  }

  /*
  ============================================================
  LOGGED IN USER
  ============================================================
  */

  container.innerHTML =
    "<div class='card'><div class='walletLoadingState'>Loading Wallet...</div></div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=wallet&userId=${userId}`
      );

    const json =
      await response.json();

    CURRENT_WALLET =
      json.data || {};

    const balance =
      CURRENT_WALLET.Balance || 0;

    const earned =
      CURRENT_WALLET.TotalEarned || 0;

    const spent =
      CURRENT_WALLET.TotalSpent || 0;

    container.innerHTML =
      `
      <div class="walletSummaryCard">
        <div class="walletBalanceRow">
          <div class="walletBalanceIcon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="walletBalanceInfo">
            <div class="walletBalanceLabel">Ekka1km Coins</div>
            <div class="walletBalanceAmount">${walletSafeRender(balance)}</div>
          </div>
        </div>

        <div class="walletStatsRow">
          <div class="walletStatItem walletStatEarned">
            <div class="walletStatIcon">
              <i class="material-icons">arrow_downward</i>
            </div>
            <div class="walletStatInfo">
              <div class="walletStatValue">${walletSafeRender(earned)}</div>
              <div class="walletStatLabel">Total Earned</div>
            </div>
          </div>

          <div class="walletStatItem walletStatSpent">
            <div class="walletStatIcon">
              <i class="material-icons">arrow_upward</i>
            </div>
            <div class="walletStatInfo">
              <div class="walletStatValue">${walletSafeRender(spent)}</div>
              <div class="walletStatLabel">Total Spent</div>
            </div>
          </div>
        </div>

        <div class="walletActions">
          <button onclick="loadTransactions()" class="walletActionBtn">
            <i class="material-icons">receipt_long</i>
            Transactions
          </button>
          <button onclick="loadRewards()" class="walletActionBtn">
            <i class="material-icons">emoji_events</i>
            Rewards
          </button>
        </div>
      </div>
      `;

    const walletHome =
      document.getElementById(
        "walletHome"
      );

    if (walletHome) {
      walletHome.innerText =
        balance;
    }

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card walletErrorState'>Unable to load wallet.</div>";
  }
}


/*
============================================================
TRANSACTIONS
============================================================
*/

async function loadTransactions() {

  const container =
    document.getElementById(
      "walletCard"
    );

  const userId =
    getUserId();

  if (!userId) {
    loadWallet();
    return;
  }

  container.innerHTML =
    "<div class='card'>Loading Transactions...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=wallettransactions&userId=${userId}`
      );

    const json =
      await response.json();

    CURRENT_TRANSACTIONS =
      json.data || [];

    if (
      CURRENT_TRANSACTIONS.length === 0
    ) {

      container.innerHTML =
        `
        <div class="card">
          <div class="sectionTitle">Transactions</div>
        <div class="walletEmptyState">
          <i class="material-icons" style="font-size:48px;color:#ccc;">receipt_long</i>
          <p>No transactions yet.</p>
        </div>
          <button onclick="loadWallet()" style="background:#666;">Back</button>
        </div>
        `;

      return;
    }

    // Use the new filtered render function
    renderFilteredTransactions();

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load transactions.</div>";
  }
}


/*
============================================================
REWARDS
============================================================
*/

async function loadRewards() {

  const container =
    document.getElementById(
      "walletCard"
    );

  const userId =
    getUserId();

  if (!userId) {
    loadWallet();
    return;
  }

  container.innerHTML =
    "<div class='card'>Loading Rewards...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=rewards&userId=${userId}`
      );

    const json =
      await response.json();

    CURRENT_REWARDS =
      json.data || [];

    if (
      CURRENT_REWARDS.length === 0
    ) {

      container.innerHTML =
        `
        <div class="card">
          No Rewards Found.

          <br><br>

          <button
            onclick="loadWallet()"
            style="background:#666;">
            Back
          </button>
        </div>
        `;

      return;
    }

    let html =
      `
      <div class="sectionTitle">
        Rewards
      </div>
      `;

    CURRENT_REWARDS.forEach(
      reward => {

        html += `
        <div class="card">

          <h3>
            ${reward.Title || "Reward"}
          </h3>

          <p>
            Coins:
            ${reward.Coins || 0}
          </p>

          <p>
            ${reward.CreatedDate || ""}
          </p>

        </div>
        `;
      }
    );

    html += `
    <button
      onclick="loadWallet()"
      style="background:#666;">
      Back
    </button>
    `;

    container.innerHTML =
      html;

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load rewards.</div>";
  }
}

