/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminEconomyReset.js
 * ONE-TIME ECONOMY RESET (Admin-only)
 *
 *   ?action=adminreseteconomy&session=TOKEN&confirm=RESET_OPENING_BALANCE_V2
 *
 * Resets the Ekka1km coin economy to a fresh state with EXACTLY 510,000
 * coins in the central PromotionTreasury:
 *
 *   1. PromotionTreasury
 *        - Clears all existing ledger data rows (header/schema preserved).
 *        - Appends exactly ONE canonical opening-balance CREDIT of 510,000 via
 *          creditPromotionTreasury() with referenceId OPENING_BALANCE_V2.
 *        - After the reset, getPromotionTreasuryBalance() returns exactly 510000.
 *
 *   2. Wallet
 *        - Zeroes Balance / TotalEarned / TotalSpent on every existing Wallet
 *          row. Wallet IDs, users and sheet structure are preserved.
 *
 *   3. WalletTransactions
 *        - Clears existing transaction/history data rows (header preserved).
 *
 *   4. AdRewardHistory
 *        - Clears existing reward-history data rows (header preserved).
 *
 * PRESERVED BY DESIGN (never cleared / never touched):
 *   - Users, Products, Businesses, Properties, News, Notifications, Admins and
 *     all other non-economy data.
 *   - PromotionPasses catalog (UNLIMITED / BASIC / PLATINUM / GOLD).
 *   - CoinEconomySettings conversion rule (1 INR = 2 Coins) and the economy-rules UI.
 *   - PromotionCampaigns / Advertisements coin-economy fields, AdRewards,
 *     AdWatchHistory and PassPurchases.
 *     Rationale: rewards are paid from per-campaign fuel and per-ad pools, not from
 *     the treasury balance (treasury is debited only at admin campaign creation).
 *     These are historical/configuration records that do NOT feed the
 *     PromotionTreasury balance or the user Wallet balance ledgers, so a fresh
 *     510,000 treasury + zeroed wallets does not require clearing them.
 *
 * SAFETY REQUIREMENTS:
 *   - Admin-only: requirePermission(e, "Treasury") (Founder role bypasses).
 *   - One-time operation: requires an explicit `confirm` token; refuses otherwise.
 *   - One-time guard: refuses to run if the OPENING_BALANCE_V2 reference already
 *     exists in the PromotionTreasury ledger (prevents re-seeding).
 *   - LockService.getScriptLock() prevents concurrent execution.
 *   - Never invoked automatically during deployment or testing.
 * ============================================================
 */

/** Unique, explicit opening-balance reference key (one-time idempotency anchor). */
function PROMOTION_TREASURY_OPENING_BALANCE_REFERENCE() {
  return "OPENING_BALANCE_V2";
}

/** The fresh-launch opening balance (coins) to seed into the PromotionTreasury. */
function PROMOTION_TREASURY_OPENING_BALANCE_COINS() {
  return 510000;
}

/** Exact confirmation token required to execute the one-time reset. */
function PROMOTION_ECONOMY_RESET_CONFIRM_TOKEN() {
  return "RESET_OPENING_BALANCE_V2";
}

/**
 * INTERNAL: Delete every data row below the header, preserving the header/schema.
 * @param {string} sheetName
 * @returns {number} number of data rows removed (0 if empty / header-only).
 */
function _clearSheetDataRows(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet) return 0;

  var range = sheet.getDataRange();
  var numRows = range.getNumRows();
  if (numRows <= 1) return 0; // empty or header-only -> nothing to clear

  var dataRows = numRows - 1;
  sheet.deleteRows(2, dataRows); // keep row 1 (header), drop all data rows
  return dataRows;
}

/**
 * INTERNAL: Zero the coin-economy fields on every existing Wallet row.
 * Uses the canonical updateRow() setter; Wallet IDs/users/structure are preserved.
 * @returns {number} number of Wallet rows updated.
 */
function _resetAllWalletBalances() {
  var wallets = getSheetData("Wallet");
  var count = 0;

  wallets.forEach(function (w) {
    if (!w.WalletID) return;

    var updated = updateRow("Wallet", "WalletID", w.WalletID, {
      Balance: 0,
      TotalEarned: 0,
      TotalSpent: 0,
      LastUpdated: new Date()
    });

    if (updated) count++;
  });

  return count;
}
/**
 * ADMIN ROUTE: ONE-TIME ECONOMY RESET
 * ?action=adminreseteconomy&session=TOKEN&confirm=RESET_OPENING_BALANCE_V2
 * Authorization: requirePermission(e, "Treasury") — admin + Treasury permission
 * (Founder role bypasses by design).
 */
function adminResetEconomy(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // 1. Admin-only (session + Treasury permission).
    var permResult = requirePermission(e, "Treasury");
    if (!permResult.valid) return permResult.response;

    var params = (e && e.parameter) || {};
    var referenceId = PROMOTION_TREASURY_OPENING_BALANCE_REFERENCE();
    var openingBalanceCoins = PROMOTION_TREASURY_OPENING_BALANCE_COINS();
    var confirmToken = PROMOTION_ECONOMY_RESET_CONFIRM_TOKEN();

    // 2. Explicit confirmation parameter — refuse without a valid token.
    if (String(params.confirm || "").trim() !== confirmToken) {
      return error(
        "Reset refused: missing or invalid confirmation token. " +
        "Pass confirm=" + confirmToken + " to execute the one-time reset."
      );
    }

    // 3. One-time guard — refuse if the opening-balance reference already exists.
    if (hasPromotionTreasuryReference(referenceId)) {
      return error(
        "Reset refused: opening-balance reference " + referenceId +
        " already exists. This is a one-time operation."
      );
    }

    ensurePromotionTreasurySheet();

    // Record the pre-reset treasury balance for the result object.
    var treasuryBefore = getPromotionTreasuryBalance();

    // 4. Clear the PromotionTreasury ledger data rows (header/schema preserved).
    var treasuryRowsCleared = _clearSheetDataRows("PromotionTreasury");

    // 5. Clear WalletTransactions history data rows (header preserved).
    var walletTransactionsCleared = _clearSheetDataRows("WalletTransactions");

    // 6. Clear AdRewardHistory data rows (header preserved).
    var rewardHistoryCleared = _clearSheetDataRows("AdRewardHistory");

    // 7. Zero every existing Wallet balance (Wallet IDs/users preserved).
    var walletsReset = _resetAllWalletBalances();

    // 8. Seed exactly one canonical opening-balance CREDIT via the canonical
    //    Treasury.js function. Internal idempotency is safe because we cleared
    //    the ledger and already verified the reference does not exist.
    var creditResult = creditPromotionTreasury({
      type: "CREDIT",
      domain: "SYSTEM",
      coins: openingBalanceCoins,
      referenceId: referenceId,
      actorAdminId: permResult.adminId,
      createdBy: "ADMIN:" + permResult.adminId
    });

    // 9. Read the post-reset treasury balance (must be exactly 510000).
    var treasuryAfter = getPromotionTreasuryBalance();

    // 10. Detailed result object.
    return success({
      treasuryBefore: treasuryBefore,
      treasuryAfter: treasuryAfter,
      openingBalanceCoins: openingBalanceCoins,
      openingBalanceReference: referenceId,
      openingCreditApplied: !!(creditResult && creditResult.applied),
      treasuryRowsCleared: treasuryRowsCleared,
      walletsReset: walletsReset,
      walletTransactionsCleared: walletTransactionsCleared,
      rewardHistoryCleared: rewardHistoryCleared,
      // Preserved / untouched by this reset:
      campaignsTouched: 0,
      advertisementsTouched: 0,
      passPurchasesPreserved: true,
      adWatchHistoryPreserved: true,
      adRewardsPreserved: true,
      promotionPassesPreserved: true,
      coinEconomyRatePreserved: true
    }, "Economy reset complete. PromotionTreasury opening balance: " + treasuryAfter + " coins.");
  } catch (err) {
    return exception(err);
  } finally {
    lock.releaseLock();
  }
}