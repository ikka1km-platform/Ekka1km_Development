/**
 * ============================================================
 * EKKA1KM BACKEND
 * Treasury.js
 * PROMOTION TREASURY - APPEND-ONLY COIN LEDGER (V2)
 *
 * The PromotionTreasury ledger is the SINGLE authoritative
 * platform promotion-coins inventory. It is NOT a per-user
 * spendable wallet. Pass purchases credit it; campaign
 * creation debits it; refunds/reversals compensate with
 * new rows (never by deleting prior rows).
 *
 * IMPORTANT ACCOUNTING RULE
 *   balance = SUM(successful CREDIT/TOPUP/REFUND)
 *           - SUM(successful DEBIT/REVERSAL)
 *
 * No user Wallet / WalletTransactions / debitWallet /
 * creditWallet cells are touched by this module.
 * ============================================================
 * Header-based access only. No positional index reliance.
 * ============================================================
 */

/** Shared live-schema headers (aligned with ensureSheetHeaders). */
function PROMOTION_TREASURY_HEADERS() {
  return [
    "TreasuryTxID",
    "Domain",
    "Type",
    "PassID",
    "PurchaseID",
    "CampaignID",
    "UserID",
    "Coins",
    "BalanceBefore",
    "BalanceAfter",
    "ReferenceID",
    "Status",
    "ActorAdminID",
    "CreatedDate",
    "CreatedBy"
  ];
}

/**
 * ENSURE PROMOTION TREASURY SHEET
 * Creates the sheet + headers if missing. Header-order safe:
 * existing columns are never reordered or dropped.
 */
function ensurePromotionTreasurySheet() {
  const sheet = getOrCreateSheet("PromotionTreasury");
  ensureSheetHeaders(sheet, PROMOTION_TREASURY_HEADERS());
  return sheet;
}

/**
 * INTERNAL: Append a treasury ledger row keyed by header names.
 * Unknown keys are skipped; missing headers are left blank.
 */
function _appendTreasuryRow(row) {
  const headers = PROMOTION_TREASURY_HEADERS();
  const sheet = ensurePromotionTreasurySheet();
  const out = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(row, h) ? row[h] : "";
  });
  sheet.appendRow(out);
}

/**
 * INTERNAL: Compute the canonical treasury balance from a set of rows.
 * Only SUCCESS rows count. See accounting rule above.
 */
function _computeTreasuryBalance(rows) {
  let balance = 0;
  (rows || []).forEach(function (tx) {
    const type = String(tx.Type || "").toUpperCase();
    const status = String(tx.Status || "").toUpperCase();
    if (status !== "SUCCESS") return;
    const coins = Number(tx.Coins || 0);
    if (type === "CREDIT" || type === "TOPUP" || type === "REFUND") {
      balance += coins;
    } else if (type === "DEBIT" || type === "REVERSAL") {
      balance -= coins;
    }
    // Any other type is ignored for balance purposes.
  });
  return balance;
}

/**
 * GET PROMOTION TREASURY BALANCE
 * The ONE canonical treasury balance calculation. Any code that
 * needs "the treasury balance" MUST call this (or mirror the rule
 * above) — never maintain an independent balance.
 */
function getPromotionTreasuryBalance() {
  ensurePromotionTreasurySheet();
  return _computeTreasuryBalance(getSheetData("PromotionTreasury"));
}

/**
 * IDEMPOTENCY CHECK
 * Returns true if a ledger row already exists for the given
 * ReferenceID. Because rows are appended ONLY after a mutation
 * passes validation (never on failure), presence of a reference
 * means the mutation already succeeded.
 */
function hasPromotionTreasuryReference(referenceId) {
  if (!referenceId) return false;
  const data = getSheetData("PromotionTreasury");
  return data.some(function (tx) {
    return String(tx.ReferenceID || "") === String(referenceId);
  });
}

/**
 * INTERNAL: Core treasury mutation engine.
 * Enforces, in order:
 *   1. Acquire LockService.getScriptLock()
 *   2. Idempotency by ReferenceID (no double-apply)
 *   3. Positive coin amount required
 *   4. Read current balance from the ledger chain
 *   5. Reject any DEBIT/REVERSAL that would drive balance negative
 *   6. Compute BalanceAfter
 *   7. Append ledger row (record BalanceBefore AND BalanceAfter)
 *   8. Append-only — nothing is ever deleted
 *
 * Reversal is always a compensating NEW row, never a delete.
 *
 * @param {object} opts
 *   type        - CREDIT | DEBIT | REFUND | TOPUP | REVERSAL
 *   domain      - PASS | PROMOTION | ADMIN | SYSTEM
 *   coins       - positive whole amount (positive for ALL types; the
 *                 engine decides the sign from `type`)
 *   referenceId - REQUIRED idempotency key
 *   passId, purchaseId, campaignId, userId, actorAdminId, createdBy
 */
function _applyTreasuryMutation(opts) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!opts || !opts.referenceId) {
      throw new Error("ReferenceID is required for a treasury mutation.");
    }

    // 2. Idempotency — already applied exactly once.
    if (hasPromotionTreasuryReference(opts.referenceId)) {
      return {
        idempotent: true,
        applied: false,
        balance: getPromotionTreasuryBalance(),
        referenceId: String(opts.referenceId)
      };
    }

    // 3. Amount
    const coins = Math.round(Number(opts.coins || 0));
    if (!(coins > 0)) {
      throw new Error("Coins must be a positive whole amount.");
    }

    // 4. Current balance from ledger chain
    const before = _computeTreasuryBalance(getSheetData("PromotionTreasury"));

    const type = String(opts.type || "").toUpperCase();

    let after;
    if (type === "CREDIT" || type === "TOPUP" || type === "REFUND") {
      after = before + coins;
    } else if (type === "DEBIT" || type === "REVERSAL") {
      // 5. Negative-balance protection
      if (before < coins) {
        throw new Error(
          "Insufficient treasury balance. Required: " + coins + ", Available: " + before
        );
      }
      after = before - coins;
    } else {
      throw new Error("Invalid treasury transaction type: " + type);
    }

    // 6+7. Append ledger row with chain-consistent Before/After.
    const row = {
      TreasuryTxID: "TRX" + Utilities.getUuid().substring(0, 8),
      Domain: String(opts.domain || "SYSTEM"),
      Type: type,
      PassID: String(opts.passId || ""),
      PurchaseID: String(opts.purchaseId || ""),
      CampaignID: String(opts.campaignId || ""),
      UserID: String(opts.userId || ""),
      Coins: coins,
      BalanceBefore: before,
      BalanceAfter: after,
      ReferenceID: String(opts.referenceId),
      Status: "SUCCESS",
      ActorAdminID: String(opts.actorAdminId || ""),
      CreatedDate: new Date(),
      CreatedBy: String(opts.createdBy || "SYSTEM")
    };
    _appendTreasuryRow(row);

    return {
      idempotent: false,
      applied: true,
      treasuryTxId: row.TreasuryTxID,
      type: type,
      domain: row.Domain,
      coins: coins,
      before: before,
      after: after,
      balance: after,
      referenceId: row.ReferenceID
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * CREDIT PROMOTION TREASURY
 * Increases the treasury balance.
 * All lock / idempotency / append-only rules apply.
 */
function creditPromotionTreasury(opts) {
  return _applyTreasuryMutation(
    Object.assign({ type: "CREDIT", domain: "SYSTEM", createdBy: "SYSTEM" }, opts || {})
  );
}

/**
 * DEBIT PROMOTION TREASURY
 * Decreases the treasury balance (coin allocation to a campaign
 * or another domain). `opts.coins` is the POSITIVE amount to
 * deduct; negative balances are rejected.
 */
function debitPromotionTreasury(opts) {
  return _applyTreasuryMutation(
    Object.assign({ type: "DEBIT", domain: "SYSTEM", createdBy: "SYSTEM" }, opts || {})
  );
}

/**
 * REFUND PROMOTION TREASURY
 * Increases the treasury balance, returning coins to the pool.
 * Never deletes the original debit/credit — always a new row.
 */
function refundPromotionTreasury(opts) {
  return _applyTreasuryMutation(
    Object.assign({ type: "REFUND", domain: "SYSTEM", createdBy: "SYSTEM" }, opts || {})
  );
}

/**
 * REVERSAL PROMOTION TREASURY
 * A compensating NEGATIVE row that reverses a prior credit/apply.
 * `opts.coins` is the POSITIVE amount being reversed OUT.
 * Adds a REVERSAL row (decrements balance). Never deletes history.
 */
function reversalPromotionTreasury(opts) {
  return _applyTreasuryMutation(
    Object.assign({ type: "REVERSAL", domain: "SYSTEM", createdBy: "SYSTEM" }, opts || {})
  );
}

/**
 * INTERNAL: Sort ledger rows newest-first by CreatedDate.
 */
function _sortTreasuryRowsDesc(rows) {
  return (rows || []).slice().sort(function (a, b) {
    return new Date(b.CreatedDate || 0) - new Date(a.CreatedDate || 0);
  });
}

/**
 * ADMIN: TREASURY OVERVIEW
 * ?action=admintreasuryoverview&session=TOKEN
 * Read-only summary of the single authoritative treasury balance.
 * Authorization: requireAdminSession (server-side).
 */
function adminTreasuryOverview(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    ensurePromotionTreasurySheet();
    const rows = getSheetData("PromotionTreasury");
    const balance = _computeTreasuryBalance(rows);

    const byType = {};
    const byDomain = {};
    let totalCredits = 0;
    let totalDebits = 0;
    rows.forEach(function (tx) {
      const type = String(tx.Type || "").toUpperCase();
      const domain = String(tx.Domain || "").toUpperCase();
      const status = String(tx.Status || "").toUpperCase();
      if (status === "SUCCESS") {
        byType[type] = (byType[type] || 0) + 1;
        byDomain[domain] = (byDomain[domain] || 0) + 1;
        const c = Number(tx.Coins || 0);
        if (type === "CREDIT" || type === "TOPUP" || type === "REFUND") totalCredits += c;
        else if (type === "DEBIT" || type === "REVERSAL") totalDebits += c;
      }
    });

    return success({
      balance: balance,
      totalTransactions: rows.length,
      totalCredits: totalCredits,
      totalDebits: totalDebits,
      byType: byType,
      byDomain: byDomain
    }, "Promotion Treasury overview loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ADMIN: TREASURY LEDGER
 * ?action=admintreasuryledger&session=TOKEN&page=1&limit=100
 * Read-only paged ledger, newest first, with live balance.
 * Authorization: requireAdminSession (server-side).
 */
function adminTreasuryLedger(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    ensurePromotionTreasurySheet();
    const rows = _sortTreasuryRowsDesc(getSheetData("PromotionTreasury"));
    const balance = _computeTreasuryBalance(rows);

    const page = Math.max(1, parseInt(e.parameter.page || "1"));
    const limit = Math.min(500, Math.max(1, parseInt(e.parameter.limit || "100")));
    const total = rows.length;
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return success({
      balance: balance,
      count: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
      data: paged
    }, "Promotion Treasury ledger loaded");
  } catch (err) {
    return exception(err);
  }
}