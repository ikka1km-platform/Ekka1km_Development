/**
 * ============================================================
 * WALLET APIs
 * ============================================================
 */

function getWallet(e) {
  try {
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    const userId = auth.userId;

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
    const auth = requireAuthenticatedUser(e);
    if (!auth.valid) return auth.response;
    const userId = auth.userId;

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
  reason,
  type,
  source
) {
  const amount =
    Number(coins || 0);

  // Gap 3: reject non-positive or non-numeric amounts.
  if (!(amount > 0)) {
    return false;
  }

  const wallet =
    getWalletRow(userId);

  if (!wallet) {
    return false;
  }

  const before =
    Number(wallet.Balance || 0);

  const after =
    before + amount;

  // Gap 3: verify the wallet update succeeds before reporting success.
  const walletUpdated = updateRow(
    "Wallet",
    "WalletID",
    wallet.WalletID,
    {
      Balance: after,
      TotalEarned:
        Number(wallet.TotalEarned || 0)
        + amount,
      LastUpdated: new Date()
    }
  );

  if (!walletUpdated) {
    return false;
  }

  // Gap 2: forward optional type/source so credits are labelled truthfully.
  // When omitted, createWalletTransaction retains the legacy REWARD/ADVERTISEMENT
  // defaults (backward compatible).
  const txCreated = createWalletTransaction(
    wallet.WalletID,
    userId,
    amount,
    before,
    after,
    referenceId,
    reason,
    type,
    source
  );

  return txCreated;
}


function createWalletTransaction(
  walletId,
  userId,
  coins,
  before,
  after,
  referenceId,
  reason,
  type,
  source
) {
  const sheet =
    getSheet("WalletTransactions");

  if (!sheet) {
    return false;
  }

  const transactionId =
    "WT" +
    Utilities.getUuid()
      .substring(0, 8);

  try {
    sheet.appendRow([
      transactionId,
      walletId,
      userId,
      type || "REWARD",
      reason || "Reward",
      source || "ADVERTISEMENT",
      referenceId,
      coins,
      before,
      after,
      "SUCCESS",
      new Date(),
      "SYSTEM"
    ]);
    return true;
  } catch (err) {
    return false;
  }
}
/**
 * ============================================================
 * CANONICAL WALLET DEBIT (H3)
 * Deducts coins from a user's wallet with negative-balance protection
 * and records a DEBIT WalletTransactions row via the shared writer.
 * ============================================================
 * @param {string} userId - User ID
 * @param {number} coins - Positive amount to deduct
 * @param {string} referenceId - Linked entity reference (e.g. "CAMPAIGN_<id>")
 * @param {string} reason - Human-readable description
 * @param {string} source - Transaction source (defaults to "PROMOTION")
 * @returns {object} { walletId, userId, coins, before, after }
 */
function debitWallet(
  userId,
  coins,
  referenceId,
  reason,
  source
) {
  const wallet =
    getWalletRow(userId);

  if (!wallet) {
    throw new Error("Wallet not found. Please create a wallet first.");
  }

  const debitAmount =
    Number(coins || 0);

  if (debitAmount <= 0) {
    throw new Error("Invalid debit amount.");
  }

  const before =
    Number(wallet.Balance || 0);

  // Never allow negative balance
  if (before < debitAmount) {
    throw new Error("Insufficient EkkaCoins. Required: " + debitAmount + ", Available: " + before);
  }

  const after = before - debitAmount;
  if (after < 0) {
    throw new Error("Transaction would result in negative balance.");
  }

  updateRow(
    "Wallet",
    "WalletID",
    wallet.WalletID,
    {
      Balance: after,
      TotalSpent:
        Number(wallet.TotalSpent || 0)
        + debitAmount,
      LastUpdated: new Date()
    }
  );

  createWalletTransaction(
    wallet.WalletID,
    userId,
    -debitAmount,
    before,
    after,
    referenceId,
    reason,
    "DEBIT",
    source || "PROMOTION"
  );

  return {
    walletId: wallet.WalletID,
    userId: userId,
    coins: debitAmount,
    before: before,
    after: after
  };
}


/**
 * ============================================================
 * CANONICAL WALLET COMPENSATION / ADJUSTMENT (Phase 5.7C)
 * Adds coins back to a user's wallet (compensation, refund, or
 * admin adjustment) and records a truthful WalletTransactions row.
 *
 * Enforces, in order:
 *   1. LockService is ON throughout (concurrency safety).
 *   2. referenceId is REQUIRED (idempotency key).
 *   3. amount must be > 0.
 *   4. Idempotency — a (userId, referenceId) pair is applied at most once.
 *   5. Verifies the wallet update succeeds.
 *   6. Verifies the WalletTransactions append succeeds.
 *
 * Do NOT redesign Wallet / WalletTransactions and do NOT create a second
 * wallet ledger. This reuses the canonical getWalletRow / updateRow /
 * createWalletTransaction primitives.
 * ============================================================
 * @param {string} userId - Owner of the wallet being compensated.
 * @param {number} coins - POSITIVE amount to add back to the wallet.
 * @param {string} referenceId - Required idempotency key (e.g. "ADJ_<txId>").
 * @param {string} reason - Human-readable reason.
 * @param {string} type - Transaction type (defaults "CREDIT").
 * @param {string} source - Transaction source (defaults "ADJUSTMENT").
 * @returns {object} { idempotent, applied, walletId, userId, coins, before,
 *                     after, balance, type, source, referenceId }
 * @throws Error on invalid input or a failed required write.
 */
function compensateWallet(
  userId,
  coins,
  referenceId,
  reason,
  type,
  source
) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // 2. referenceId required (idempotency + traceability).
    if (!referenceId) {
      throw new Error("ReferenceID is required for a wallet compensation.");
    }

    // 3. amount must be > 0.
    const amount = Number(coins || 0);
    if (!(amount > 0)) {
      throw new Error("Compensation amount must be a positive value.");
    }

    const wallet = getWalletRow(userId);
    if (!wallet) {
      throw new Error("Wallet not found. Please create a wallet first.");
    }

    // 4. Idempotency — never apply the same compensation twice.
    if (hasWalletTransactionForReference(userId, referenceId)) {
      return {
        idempotent: true,
        applied: false,
        before: Number(wallet.Balance || 0),
        after: Number(wallet.Balance || 0),
        balance: Number(wallet.Balance || 0),
        type: type || "CREDIT",
        source: source || "ADJUSTMENT",
        referenceId: String(referenceId)
      };
    }

    const before = Number(wallet.Balance || 0);
    const after = before + amount;

    // 5. Verify the wallet update succeeds.
    const walletUpdated = updateRow("Wallet", "WalletID", wallet.WalletID, {
      Balance: after,
      LastUpdated: new Date()
    });
    if (!walletUpdated) {
      throw new Error("Wallet update failed during compensation.");
    }

    // 6. Verify the transaction append succeeds. Truthful type/source are
    // always supplied (never silent REWARD/ADVERTISEMENT defaults).
    const txCreated = createWalletTransaction(
      wallet.WalletID,
      userId,
      amount,
      before,
      after,
      referenceId,
      reason || "Wallet adjustment",
      type || "CREDIT",
      source || "ADJUSTMENT"
    );
    if (!txCreated) {
      throw new Error("Wallet transaction append failed during compensation.");
    }

    return {
      idempotent: false,
      applied: true,
      walletId: wallet.WalletID,
      userId: userId,
      coins: amount,
      before: before,
      after: after,
      balance: after,
      type: type || "CREDIT",
      source: source || "ADJUSTMENT",
      referenceId: String(referenceId)
    };
  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * H3 DUPLICATE / RETRY PROTECTION
 * Returns true if a WalletTransactions row already exists for the
 * given (userId, referenceId). Used to avoid double-deduction when a
 * campaign creation request is retried.
 * ============================================================
 */
function hasWalletTransactionForReference(userId, referenceId) {
  if (!referenceId) return false;

  const data =
    getSheetData("WalletTransactions");

  for (let i = 0; i < data.length; i++) {
    const ref =
      (data[i].ReferenceID !== undefined ? data[i].ReferenceID : data[i].ReferenceId) || "";
    if (
      String(ref) === String(referenceId) &&
      String(data[i].UserID || "") === String(userId)
    ) {
      return true;
    }
  }

  return false;
}
