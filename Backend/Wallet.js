/**
 * ============================================================
 * WALLET APIs
 * ============================================================
 */

function getWallet(e) {
  try {
    const userId = e.parameter.userId || "";

    if (!userId) {
      return error("userId required");
    }

    const sheet = getSheet("Wallet");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (
        String(data[i][1]) === String(userId)
      ) {
        const wallet = {};

        headers.forEach(function (h, j) {
          wallet[h] = data[i][j];
        });

        return success(wallet);
      }
    }

    return error("Wallet not found");

  } catch (err) {
    return exception(err);
  }
}


function getWalletTransactions(e) {
  try {
    const userId = e.parameter.userId || "";

    const sheet =
      getSheet("WalletTransactions");

    const data =
      sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return success([]);
    }

    const headers = data[0];
    const transactions = [];

    for (let i = 1; i < data.length; i++) {

      if (
        !userId ||
        String(data[i][2]) === String(userId)
      ) {
        const row = {};

        headers.forEach(function (h, j) {
          row[h] = data[i][j];
        });

        transactions.push(row);
      }
    }

    return success(transactions);

  } catch (err) {
    return exception(err);
  }
}


function updateWallet(e) {
  try {

    const p = e.parameter;
    const userId = p.userId || "";
    const amount =
      Number(p.amount || 0);

    if (!userId) {
      return error("userId required");
    }

    const wallet =
      getWalletRow(userId);

    if (!wallet) {
      return error("Wallet not found");
    }

    const currentBalance =
      Number(wallet.Balance || 0);
    const newBalance =
      currentBalance + amount;

    // Negative balance protection
    if (newBalance < 0) {
      return error("Insufficient balance. Current: " + currentBalance + ", Required: " + Math.abs(amount));
    }

    updateRow(
      "Wallet",
      "WalletID",
      wallet.WalletID,
      {
        Balance: newBalance,
        LastUpdated: new Date()
      }
    );

    return success(
      {
        balance: newBalance
      },
      "Wallet Updated"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PROMOTION ECONOMY V2 - WALLET VALIDATION
 * ============================================================
 */

/**
 * Check if user can afford a PromotionFuel cost
 * Used by Promotion.js createPromotionCampaign
 * @param {string} userId - User ID
 * @param {number} promotionFuel - Required PromotionFuel amount
 * @returns {object} { canAfford: boolean, balance: number, shortfall: number }
 */
function canAffordCampaign(userId, promotionFuel) {
  const wallet = getWalletRow(userId);
  
  if (!wallet) {
    return {
      canAfford: false,
      balance: 0,
      shortfall: promotionFuel,
      reason: "Wallet not found"
    };
  }

  const balance = Number(wallet.Balance || 0);
  const cost = Number(promotionFuel || 0);

  return {
    canAfford: balance >= cost,
    balance: balance,
    shortfall: Math.max(0, cost - balance),
    reason: balance >= cost ? "Sufficient balance" : "Insufficient balance"
  };
}


/**
 * Validate wallet for PromotionFuel deduction
 * Returns detailed validation result
 * @param {string} userId - User ID
 * @param {number} promotionFuel - Required PromotionFuel amount
 * @returns {object} Validation result
 */
function validateWalletForPromotion(userId, promotionFuel) {
  const wallet = getWalletRow(userId);

  if (!wallet) {
    return {
      valid: false,
      error: "Wallet not found. Please contact support.",
      code: "WALLET_NOT_FOUND"
    };
  }

  const balance = Number(wallet.Balance || 0);
  const required = Number(promotionFuel || 0);

  if (required <= 0) {
    return {
      valid: false,
      error: "Invalid PromotionFuel amount.",
      code: "INVALID_FUEL_AMOUNT"
    };
  }

  if (balance < required) {
    return {
      valid: false,
      error: "Insufficient EkkaCoins. Required: " + required + ", Available: " + balance,
      code: "INSUFFICIENT_BALANCE",
      balance: balance,
      required: required,
      shortfall: required - balance
    };
  }

  // Negative balance protection check
  const afterDeduction = balance - required;
  if (afterDeduction < 0) {
    return {
      valid: false,
      error: "Transaction would result in negative balance.",
      code: "NEGATIVE_BALANCE_PROTECTION"
    };
  }

  return {
    valid: true,
    balance: balance,
    afterDeduction: afterDeduction,
    required: required
  };
}


/**
 * ============================================================
 * INTERNAL FUNCTIONS
 * ============================================================
 */

function getWalletRow(userId) {
  const data =
    getSheetData("Wallet");

  for (let i = 0; i < data.length; i++) {
    if (
      String(data[i].UserID) ===
      String(userId)
    ) {
      return data[i];
    }
  }

  return null;
}


function creditWallet(
  userId,
  coins,
  referenceId,
  reason
) {
  const wallet =
    getWalletRow(userId);

  if (!wallet) {
    return false;
  }

  const before =
    Number(wallet.Balance || 0);

  const after =
    before + Number(coins);

  updateRow(
    "Wallet",
    "WalletID",
    wallet.WalletID,
    {
      Balance: after,
      TotalEarned:
        Number(wallet.TotalEarned || 0)
        + Number(coins),
      LastUpdated: new Date()
    }
  );

  createWalletTransaction(
    wallet.WalletID,
    userId,
    coins,
    before,
    after,
    referenceId,
    reason
  );

  return true;
}


function createWalletTransaction(
  walletId,
  userId,
  coins,
  before,
  after,
  referenceId,
  reason
) {
  const sheet =
    getSheet("WalletTransactions");

  const transactionId =
    "WT" +
    Utilities.getUuid()
      .substring(0, 8);

  sheet.appendRow([
    transactionId,
    walletId,
    userId,
    "REWARD",
    reason || "Reward",
    "ADVERTISEMENT",
    referenceId,
    coins,
    before,
    after,
    "SUCCESS",
    new Date(),
    "SYSTEM"
  ]);
}