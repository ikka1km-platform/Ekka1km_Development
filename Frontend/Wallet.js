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
      <div class="card">

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
    "<div class='card'>Loading Wallet...</div>";

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
      <div class="card">

        <h2>
          💰 ${balance} Coins
        </h2>

        <p>
          Total Earned:
          ${earned}
        </p>

        <p>
          Total Spent:
          ${spent}
        </p>

        <button
          onclick="loadTransactions()">
          Transactions
        </button>

        <button
          onclick="loadRewards()">
          Rewards
        </button>

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
      "<div class='card'>Unable to load wallet.</div>";
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
          No Transactions Found.

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
        Transactions
      </div>
      `;

    CURRENT_TRANSACTIONS.forEach(
      item => {

        html += `
        <div class="card">

          <h3>
            ${item.Type || "-"}
          </h3>

          <p>
            Amount:
            ${item.Amount || 0}
          </p>

          <p>
            ${item.CreatedDate || ""}
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

