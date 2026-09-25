/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminEconomyIntegrity.js
 * PHASE 5.7C - PROMOTION ECONOMY V2 INTEGRATION
 * READ-ONLY economy validation, detection, and anomaly visibility
 * Consumes Promotion Engine V2
 * ============================================================
 */

/**
 * ============================================================
 * NORMALIZE CAMPAIGN - Promotion Economy V2
 * Maps legacy Reward Economy fields to new PromotionFuel economy
 * Provides backward compatibility for existing campaign records
 * ============================================================
 */
function normalizeCampaignForIntegrity(c) {
  if (!c) return c;

  // ============================================================
  // LEGACY TO V2 FIELD MAPPING
  // ============================================================

  // CoinsConsumed (V2) - from legacy CoinsSpent
  if (!c.CoinsConsumed) {
    c.CoinsConsumed = Number(c.CoinsSpent || 0);
  }

  // PromotionFuel (V2) - from legacy RewardPool or CampaignBudget
  if (!c.PromotionFuel) {
    c.PromotionFuel = Number(c.RewardPool || c.CampaignBudget || 0);
  }

  // RemainingFuel (V2) - from legacy RemainingRewardCoins
  if (c.RemainingFuel === undefined && c.RemainingRewardCoins !== undefined) {
    c.RemainingFuel = Number(c.RemainingRewardCoins || 0);
  }

  // RewardCoins (V2) - from legacy RewardCoins
  if (!c.RewardCoins) {
    c.RewardCoins = Number(c.RewardCoins || 0);
  }

  // RewardRatePerSecond (V2) - calculate if missing
  if (!c.RewardRatePerSecond) {
    var dur = Number(c.Duration || c.DurationSeconds || 10);
    var rc = Number(c.RewardCoins || 5);
    c.RewardRatePerSecond = dur > 0 ? Math.round((rc / dur) * 100) / 100 : 1;
  }

  // EstimatedViewSeconds (V2) - calculate: PromotionFuel / RewardRatePerSecond
  if (!c.EstimatedViewSeconds) {
    var fuel = Number(c.PromotionFuel || 0);
    var rate = Number(c.RewardRatePerSecond || 1);
    c.EstimatedViewSeconds = rate > 0 ? Math.floor(fuel / rate) : 0;
  }

  // EstimatedViews (V2) - calculate: EstimatedViewSeconds / Duration
  if (!c.EstimatedViews) {
    var estSec = Number(c.EstimatedViewSeconds || 0);
    var d = Number(c.Duration || c.DurationSeconds || 10);
    c.EstimatedViews = d > 0 ? Math.floor(estSec / d) : 0;
  }

  // ============================================================
  // LEGACY ALIASES (for backward compatibility)
  // ============================================================

  if (!c.CoinsSpent) c.CoinsSpent = Number(c.CoinsConsumed || 0);
  if (!c.RewardPool) c.RewardPool = Number(c.PromotionFuel || 0);
  if (!c.RemainingRewardCoins && c.RemainingFuel !== undefined) c.RemainingRewardCoins = Number(c.RemainingFuel || 0);

  return c;
}

/**
 * ============================================================
 * SAFE TIMESTAMP HELPERS
 * Handle Date objects, strings, numbers, null/undefined
 * ============================================================
 */
function _safeTimestamp(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  var ts = new Date(val).getTime();
  return isNaN(ts) ? 0 : ts;
}

function _compareDatesDesc(a, b) {
  return _safeTimestamp(b) - _safeTimestamp(a);
}

/**
 * ============================================================
 * INTERNAL: Canonical transaction coin value reader
 * WalletTransactions canonical schema stores value in "Coins".
 * Older code may reference "Amount". This helper safely normalizes.
 * ============================================================
 */
function _getTxCoins(tx) {
  if (!tx) return 0;
  return Number(tx.Coins || tx.Amount || 0);
}

/**
 * ============================================================
 * INTERNAL: Interpret signed coin direction from Type field
 * Credit / REWARD => +Coins
 * Debit => -Coins
 * Unknown / blank => Coins as-is (supports legacy signed storage)
 * ============================================================
 */
function _signedTxCoins(tx) {
  var raw = _getTxCoins(tx);
  var txType = (tx.Type || "").toUpperCase();
  if (!txType) return raw;
  if (txType === "DEBIT") return -Math.abs(raw);
  if (txType === "CREDIT" || txType === "REWARD") return Math.abs(raw);
  return raw;
}

/**
 * ============================================================
 * INTERNAL: Build lookup maps for performance
 * Read each required sheet as few times as practical
 * ============================================================
 */
function _buildIntegrityMaps() {
  const walletData = getSheetData("Wallet");
  const txData = getSheetData("WalletTransactions");
  const legacyRewardData = getSheetData("AdRewardHistory");
  const activeRewardData = getSheetData("AdRewards");
  const campaignData = getSheetData("PromotionCampaigns");
  const usersData = getSheetData(CONFIG.SHEETS.USERS);
  const adsData = getSheetData("Advertisements");

  // Unify rewards: active PIP rewards (AdRewards) + legacy rewards (AdRewardHistory)
  const rewardData = [];
  (activeRewardData || []).forEach(function(r) {
    rewardData.push({
      RewardID: r.RewardID || "",
      UserID: r.UserID || "",
      AdID: r.CampaignID || "",
      CampaignID: r.CampaignID || "",
      CoinsEarned: Number(r.Coins || 0),
      Coins: Number(r.Coins || 0),
      Completed: (r.Status || "").toLowerCase() === "completed" ? "Yes" : (r.Status || "Yes"),
      Status: r.Status || "Completed",
      CreatedAt: r.CreatedAt || "",
      LastWatchedAt: r.CreatedAt || "",
      WalletTransactionID: r.WalletTransactionID || "",
      Source: "AdRewards (PIP)"
    });
  });
  (legacyRewardData || []).forEach(function(r) {
    rewardData.push({
      RewardID: r.RewardID || "",
      UserID: r.UserID || "",
      AdID: r.AdID || "",
      CampaignID: r.AdID || "",
      CoinsEarned: Number(r.CoinsEarned || 0),
      Coins: Number(r.CoinsEarned || 0),
      Completed: r.Completed || "No",
      Status: r.Completed || "No",
      CreatedAt: r.CreatedAt || r.LastWatchedAt || "",
      LastWatchedAt: r.LastWatchedAt || r.CreatedAt || "",
      WalletTransactionID: "",
      Source: "AdRewardHistory (Legacy)"
    });
  });

  // User lookup
  const userMap = {};
  usersData.forEach(function(u) { userMap[u.UserID] = u; });

  // Wallet lookup by UserID
  const walletMap = {};
  walletData.forEach(function(w) { walletMap[w.UserID] = w; });

  // Wallet lookup by WalletID
  const walletByIdMap = {};
  walletData.forEach(function(w) { walletByIdMap[w.WalletID] = w; });

  // Transactions grouped by WalletID
  const txByWallet = {};
  txData.forEach(function(tx) {
    const wid = tx.WalletID;
    if (!txByWallet[wid]) txByWallet[wid] = [];
    txByWallet[wid].push(tx);
  });

  // Transactions grouped by ReferenceID
  const txByRef = {};
  txData.forEach(function(tx) {
    const ref = tx.ReferenceID || "";
    if (!txByRef[ref]) txByRef[ref] = [];
    txByRef[ref].push(tx);
  });

  // Rewards grouped by AdID
  const rewardByAd = {};
  rewardData.forEach(function(r) {
    const aid = r.AdID;
    if (!rewardByAd[aid]) rewardByAd[aid] = [];
    rewardByAd[aid].push(r);
  });

  // Rewards grouped by UserID
  const rewardByUser = {};
  rewardData.forEach(function(r) {
    const uid = r.UserID;
    if (!rewardByUser[uid]) rewardByUser[uid] = [];
    rewardByUser[uid].push(r);
  });

  // Campaign lookup by CampaignID
  const campaignMap = {};
  campaignData.forEach(function(c) { campaignMap[c.CampaignID] = c; });

  // Ad lookup by AdID
  const adMap = {};
  adsData.forEach(function(a) { adMap[a.AdID] = a; });

  // Transaction IDs set for duplicate detection
  const txIdSet = {};
  txData.forEach(function(tx) {
    const tid = tx.TransactionID || "";
    if (!txIdSet[tid]) txIdSet[tid] = 0;
    txIdSet[tid]++;
  });

  return {
    walletData: walletData,
    txData: txData,
    rewardData: rewardData,
    campaignData: campaignData,
    usersData: usersData,
    adsData: adsData,
    userMap: userMap,
    walletMap: walletMap,
    walletByIdMap: walletByIdMap,
    txByWallet: txByWallet,
    txByRef: txByRef,
    rewardByAd: rewardByAd,
    rewardByUser: rewardByUser,
    campaignMap: campaignMap,
    adMap: adMap,
    txIdSet: txIdSet
  };
}


/**
 * ============================================================
 * ADMIN: ECONOMY INTEGRITY SUMMARY
 * High-level health indicators for the Integrity Monitor
 * ?action=economyintegritysummary&session=TOKEN
 * PROMOTION ECONOMY V2 - Validates new fuel economy
 * ============================================================
 */
function getEconomyIntegritySummary(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const maps = _buildIntegrityMaps();

    // Wallet reconciliation
    var walletsChecked = 0;
    var walletMismatches = 0;
    maps.walletData.forEach(function(w) {
      walletsChecked++;
      var wid = w.WalletID;
      var txs = maps.txByWallet[wid] || [];
      var txDerived = 0;
      txs.forEach(function(tx) { txDerived += _signedTxCoins(tx); });
      var storedBalance = Number(w.Balance || 0);
      if (Math.abs(storedBalance - txDerived) > 0.01) {
        walletMismatches++;
      }
    });

    // Transaction anomalies
    var txChecked = maps.txData.length;
    var txAnomalies = 0;
    maps.txData.forEach(function(tx) {
      var tid = tx.TransactionID || "";
      if (maps.txIdSet[tid] > 1) txAnomalies++;
      else if (!tx.UserID) txAnomalies++;
      else if (!tx.WalletID) txAnomalies++;
      else if (isNaN(Number(tx.Coins || tx.Amount))) txAnomalies++;
    });

    // Duplicate rewards
    var rewardsChecked = maps.rewardData.length;
    var duplicateRewards = 0;
    var rewardKeys = {};
    maps.rewardData.forEach(function(r) {
      var key;
      if (r.Source === "AdRewardHistory (Legacy)") {
        key = "LEGACY|" + String(r.UserID || "") + "|" + String(r.AdID || "");
      } else {
        key = "ACTIVE|" + String(r.RewardID || "");
      }
      if (!rewardKeys[key]) rewardKeys[key] = 0;
      rewardKeys[key]++;
      if (rewardKeys[key] > 1) duplicateRewards++;
    });

    // Reward/Transaction mismatches
    var rewardTxMismatches = 0;
    maps.rewardData.forEach(function(r) {
      var isCompleted = (String(r.Completed || "").toLowerCase() === "yes" || String(r.Completed || "").toLowerCase() === "completed");
      if (isCompleted) {
        var rCoins = Number(r.CoinsEarned || r.Coins || 0);
        var found = false;
        if (r.WalletTransactionID && maps.txIdSet[r.WalletTransactionID]) {
          found = true;
        } else {
          var ref = r.AdID || r.CampaignID || "";
          var refTxs = maps.txByRef[ref] || [];
          refTxs.forEach(function(tx) {
            if (String(tx.UserID) === String(r.UserID) && Math.abs(_getTxCoins(tx) - rCoins) < 0.01) found = true;
          });
        }
        if (!found && rCoins > 0) rewardTxMismatches++;
      }
    });

    // Campaign accounting - PROMOTION ECONOMY V2
    var campaignsChecked = maps.campaignData.length;
    var campMismatches = 0;
    maps.campaignData.forEach(function(c) {
      // Normalize to V2
      c = normalizeCampaignForIntegrity(c);
      
      var promotionFuel = Number(c.PromotionFuel || 0);
      var remainingFuel = Number(c.RemainingFuel || 0);
      var coinsConsumed = Number(c.CoinsConsumed || 0);
      
      // V2 validation: RemainingFuel should not be negative
      if (remainingFuel < 0) {
        campMismatches++;
      }
      
      // V2 validation: RemainingFuel should not exceed PromotionFuel
      if (remainingFuel > promotionFuel && promotionFuel > 0) {
        campMismatches++;
      }
      
      // V2 validation: CoinsConsumed should not exceed PromotionFuel
      if (coinsConsumed > promotionFuel && promotionFuel > 0) {
        campMismatches++;
      }
      
      // V2 validation: CoinsConsumed + RemainingFuel should equal PromotionFuel
      var fuelBalance = coinsConsumed + remainingFuel;
      if (Math.abs(fuelBalance - promotionFuel) > 0.01 && promotionFuel > 0) {
        campMismatches++;
      }
    });

    // Total coin variance
    var totalCoinVariance = 0;
    maps.walletData.forEach(function(w) {
      var wid = w.WalletID;
      var txs = maps.txByWallet[wid] || [];
      var txDerived = 0;
      txs.forEach(function(tx) { txDerived += _signedTxCoins(tx); });
      totalCoinVariance += Math.abs(Number(w.Balance || 0) - txDerived);
    });

    var status = "HEALTHY";
    if (walletMismatches > 0 || campMismatches > 0 || duplicateRewards > 0) {
      status = "WARNING";
    }
    if (totalCoinVariance > 1000) {
      status = "MISMATCH";
    }

    return success({
      status: status,
      walletsChecked: walletsChecked,
      walletMismatches: walletMismatches,
      transactionsChecked: txChecked,
      transactionAnomalies: txAnomalies,
      rewardsChecked: rewardsChecked,
      duplicateRewards: duplicateRewards,
      rewardTxMismatches: rewardTxMismatches,
      campaignsChecked: campaignsChecked,
      campaignMismatches: campMismatches,
      totalCoinVariance: totalCoinVariance,
      timestamp: new Date().toISOString()
    }, "Economy Integrity Summary Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET RECONCILIATION
 * Check every wallet's stored balance vs transaction-derived balance
 * ?action=walletreconciliation&session=TOKEN&search=TERM&page=1&limit=50
 * Statuses: MATCHED, MISMATCH, INSUFFICIENT_DATA
 * ============================================================
 */
function getWalletReconciliation(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var results = [];

    maps.walletData.forEach(function(w) {
      var wid = w.WalletID;
      var uid = w.UserID || "";
      var txs = maps.txByWallet[wid] || [];
      var txCount = txs.length;

      var credits = 0;
      var debits = 0;
      var txDerived = 0;
      txs.forEach(function(tx) {
        var signed = _signedTxCoins(tx);
        txDerived += signed;
        if (signed > 0) credits += signed;
        else debits += Math.abs(signed);
      });

      var storedBalance = Number(w.Balance || 0);
      var variance = txDerived - storedBalance;

      var status = "INSUFFICIENT_DATA";
      if (txCount === 0) {
        status = storedBalance === 0 ? "MATCHED" : "INSUFFICIENT_DATA";
      } else if (Math.abs(variance) < 0.01) {
        status = "MATCHED";
      } else {
        status = "MISMATCH";
      }

      var lastDate = "";
      if (txCount > 0) {
        var sorted = txs.slice().sort(function(a, b) {
          return _compareDatesDesc(a, b);
        });
        lastDate = sorted[0].CreatedDate || sorted[0].CreatedAt || "";
      }

      var user = maps.userMap[uid] || {};
      var entry = {
        WalletID: wid || "",
        UserID: uid,
        UserName: user.FullName || user.Name || "",
        StoredBalance: storedBalance,
        DerivedBalance: txDerived,
        Variance: variance,
        Credits: credits,
        Debits: debits,
        TransactionCount: txCount,
        LastTransaction: lastDate,
        Status: status
      };

      if (search) {
        if ((wid || "").toLowerCase().indexOf(search) === -1 &&
            (uid || "").toLowerCase().indexOf(search) === -1 &&
            (entry.UserName || "").toLowerCase().indexOf(search) === -1) {
          return;
        }
      }

      results.push(entry);
    });

    results.sort(function(a, b) {
      if (a.Status === "MISMATCH" && b.Status !== "MISMATCH") return -1;
      if (a.Status !== "MISMATCH" && b.Status === "MISMATCH") return 1;
      return Math.abs(b.Variance) - Math.abs(a.Variance);
    });

    var total = results.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = results.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Wallet Reconciliation Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: TRANSACTION ANOMALIES
 * Detect issues in WalletTransactions
 * ?action=transactionanomalies&session=TOKEN&page=1&limit=50
 * ============================================================
 */
function getTransactionAnomalies(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var anomalies = [];

    // 1. Duplicate Transaction IDs
    var seenTids = {};
    maps.txData.forEach(function(tx) {
      var tid = tx.TransactionID || "";
      if (!tid) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: "MISSING",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          Issue: "Missing TransactionID",
          Expected: "TransactionID must not be empty",
          Actual: "(empty)",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
        return;
      }
      if (!seenTids[tid]) {
        seenTids[tid] = { count: 1, row: tx };
      } else {
        seenTids[tid].count++;
        if (seenTids[tid].count === 2) {
          anomalies.push({
            Category: "TRANSACTION",
            Severity: "HIGH",
            EntityID: tid,
            RelatedUser: tx.UserID || "",
            RelatedWallet: tx.WalletID || "",
            Issue: "Duplicate TransactionID",
            Expected: "Unique TransactionID per row",
            Actual: "Appears " + seenTids[tid].count + " times",
            Difference: "",
            Timestamp: tx.CreatedDate || tx.CreatedAt || ""
          });
        }
      }
    });

    // 2. Missing UserID
    maps.txData.forEach(function(tx) {
      if (!tx.UserID) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tx.TransactionID || "",
          RelatedUser: "",
          RelatedWallet: tx.WalletID || "",
          Issue: "Missing UserID",
          Expected: "UserID must reference a valid user",
          Actual: "(empty)",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 3. Missing WalletID
    maps.txData.forEach(function(tx) {
      if (!tx.WalletID) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID || "",
          RelatedWallet: "",
          Issue: "Missing WalletID",
          Expected: "WalletID must reference a valid wallet",
          Actual: "(empty)",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 4. Unknown UserID
    maps.txData.forEach(function(tx) {
      if (tx.UserID && !maps.userMap[tx.UserID]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID,
          RelatedWallet: tx.WalletID || "",
          Issue: "Unknown UserID - no matching user record",
          Expected: "UserID should exist in Users sheet",
          Actual: "UserID '" + tx.UserID + "' not found",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 5. Unknown WalletID
    maps.txData.forEach(function(tx) {
      if (tx.WalletID && !maps.walletByIdMap[tx.WalletID]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID,
          Issue: "Unknown WalletID - no matching wallet record",
          Expected: "WalletID should exist in Wallet sheet",
          Actual: "WalletID '" + tx.WalletID + "' not found",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 6. Invalid amount
    maps.txData.forEach(function(tx) {
      var amt = Number(tx.Coins || tx.Amount);
      if (isNaN(amt) || !isFinite(amt)) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "MEDIUM",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          Issue: "Invalid transaction amount",
          Expected: "Coins/Amount must be a valid number",
          Actual: "'" + (tx.Coins || tx.Amount) + "' is not a valid number",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 7. Broken Before/After chain
    var txByWalletSorted = {};
    maps.txData.forEach(function(tx) {
      var wid = tx.WalletID || "";
      if (!txByWalletSorted[wid]) txByWalletSorted[wid] = [];
      txByWalletSorted[wid].push(tx);
    });

    for (var wid in txByWalletSorted) {
      var walletTxs = txByWalletSorted[wid].sort(function(a, b) {
        return _compareDatesDesc(a, b);
      });

      for (var ti = 0; ti < walletTxs.length; ti++) {
        var tx = walletTxs[ti];
        var before = Number(tx.BalanceBefore || tx.Before || 0);
        var after = Number(tx.BalanceAfter || tx.After || 0);
        var amount = _signedTxCoins(tx);

        if (before !== 0 || after !== 0) {
          // Check that after = before + amount
          if (Math.abs(after - (before + amount)) > 0.01) {
            anomalies.push({
              Category: "TRANSACTION",
              Severity: "HIGH",
              EntityID: tx.TransactionID || "",
              RelatedUser: tx.UserID || "",
              RelatedWallet: wid,
              Issue: "Broken Before→After balance relationship",
              Expected: "After (" + after + ") should equal Before (" + before + ") + Coins (" + amount + ") = " + (before + amount),
              Actual: "After = " + after + ", expected " + (before + amount),
              Difference: "" + (after - (before + amount)),
              Timestamp: tx.CreatedDate || tx.CreatedAt || ""
            });
          }
        }
      }

      // Chain continuity: N.BalanceAfter should match N+1.BalanceBefore
      for (var ci = 0; ci < walletTxs.length - 1; ci++) {
        var current = walletTxs[ci];
        var next = walletTxs[ci + 1];
        var curAfter = Number(current.BalanceAfter || current.After || 0);
        var nxtBef = Number(next.BalanceBefore || next.Before || 0);
        if (curAfter !== 0 || nxtBef !== 0) {
          if (curAfter !== nxtBef) {
            anomalies.push({
              Category: "TRANSACTION",
              Severity: "MEDIUM",
              EntityID: next.TransactionID || "",
              RelatedUser: next.UserID || "",
              RelatedWallet: wid,
              Issue: "Balance chain gap - previous BalanceAfter doesn't match current BalanceBefore",
              Expected: "BalanceBefore (" + nxtBef + ") should equal previous BalanceAfter (" + curAfter + ")",
              Actual: "BalanceBefore = " + nxtBef + ", previous BalanceAfter = " + curAfter,
              Difference: "" + (nxtBef - curAfter),
              Timestamp: next.CreatedDate || next.CreatedAt || ""
            });
          }
        }
      }
    }

    // 8. Invalid transaction type
    var validTypes = { "REWARD": true, "PURCHASE": true, "REDEMPTION": true, "DEBIT": true, "CREDIT": true };
    maps.txData.forEach(function(tx) {
      var txType = (tx.Type || "").toUpperCase();
      if (txType && !validTypes[txType]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "LOW",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          Issue: "Unknown transaction type",
          Expected: "Type should be one of: REWARD, PURCHASE, REDEMPTION, DEBIT, CREDIT",
          Actual: "'" + tx.Type + "' is not a recognized type",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // 9. Reward transaction without corresponding wallet transaction (tx.Reason mismatch)
    maps.txData.forEach(function(tx) {
      var txType = (tx.Type || "").toUpperCase();
      if (txType === "REWARD") {
        var coins = _getTxCoins(tx);
        if (coins <= 0) {
          anomalies.push({
            Category: "TRANSACTION",
            Severity: "MEDIUM",
            EntityID: tx.TransactionID || "",
            RelatedUser: tx.UserID || "",
            RelatedWallet: tx.WalletID || "",
            Issue: "REWARD transaction with non-positive Coins",
            Expected: "REWARD should have Coins > 0",
            Actual: "Coins=" + coins,
            Difference: "",
            Timestamp: tx.CreatedDate || tx.CreatedAt || ""
          });
        }
      }
    });

    // 10. Invalid status
    var validStatuses = { "SUCCESS": true, "PENDING": true, "FAILED": true };
    maps.txData.forEach(function(tx) {
      var txStatus = (tx.Status || "").toUpperCase();
      if (txStatus && !validStatuses[txStatus]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "LOW",
          EntityID: tx.TransactionID || "",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          Issue: "Unknown transaction status",
          Expected: "Status should be SUCCESS, PENDING, or FAILED",
          Actual: "'" + tx.Status + "' is not a recognized status",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // Deduplicate anomalies
    var uniqueKeys = {};
    var deduped = [];
    anomalies.forEach(function(a) {
      var key = a.Category + "|" + a.EntityID + "|" + a.Issue.substring(0, 30);
      if (!uniqueKeys[key]) {
        uniqueKeys[key] = true;
        deduped.push(a);
      }
    });

    // Sort: HIGH severity first, then by category
    deduped.sort(function(a, b) {
      var sev = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 };
      var sa = sev[a.Severity] || 0;
      var sb = sev[b.Severity] || 0;
      if (sa !== sb) return sa - sb;
      return a.Category.localeCompare(b.Category);
    });

    var total = deduped.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = deduped.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Transaction Anomalies Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: REWARD ANOMALIES
 * Validate AdRewardHistory against Users, Wallets, Transactions, Campaigns
 * ?action=rewardanomalies&session=TOKEN&page=1&limit=50
 * ============================================================
 */
function getRewardAnomalies(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var anomalies = [];

    // 1. Duplicate reward records (same UserID + AdID for legacy, duplicate RewardID for active)
    var seenKeys = {};
    maps.rewardData.forEach(function(r) {
      var isLegacy = (r.Source === "AdRewardHistory (Legacy)");
      var key = isLegacy ? ("LEGACY|" + String(r.UserID || "") + "|" + String(r.AdID || "")) : ("ACTIVE|" + String(r.RewardID || ""));
      if (!r.RewardID && !isLegacy) return;
      if (!seenKeys[key]) {
        seenKeys[key] = { count: 1, records: [r] };
      } else {
        seenKeys[key].count++;
        if (seenKeys[key].count === 2) {
          anomalies.push({
            Category: "REWARD",
            Severity: "HIGH",
            EntityID: r.RewardID || "",
            RelatedUser: r.UserID || "",
            RelatedCampaign: r.AdID || r.CampaignID || "",
            Issue: isLegacy ? "Duplicate reward record - same UserID + AdID" : "Duplicate RewardID in AdRewards",
            Expected: isLegacy ? "Each UserID + AdID pair should have at most 1 reward record" : "Each RewardID should be unique",
            Actual: "Found " + seenKeys[key].count + " records for " + (isLegacy ? ("UserID=" + (r.UserID || "") + " AdID=" + (r.AdID || "")) : ("RewardID=" + r.RewardID)),
            Difference: "",
            Timestamp: r.CreatedAt || r.LastWatchedAt || ""
          });
        }
      }
    });

    // 2. Reward for unknown user
    maps.rewardData.forEach(function(r) {
      if (r.UserID && !maps.userMap[r.UserID]) {
        anomalies.push({
          Category: "REWARD",
          Severity: "HIGH",
          EntityID: r.RewardID || "",
          RelatedUser: r.UserID,
          RelatedCampaign: r.AdID || r.CampaignID || "",
          Issue: "Reward for unknown UserID",
          Expected: "UserID should exist in Users sheet",
          Actual: "UserID '" + r.UserID + "' not found",
          Difference: "",
          Timestamp: r.CreatedAt || r.LastWatchedAt || ""
        });
      }
    });

    // 3. Reward without corresponding wallet transaction
    maps.rewardData.forEach(function(r) {
      var isCompleted = (String(r.Completed || "").toLowerCase() === "yes" || String(r.Completed || "").toLowerCase() === "completed");
      if (isCompleted && Number(r.CoinsEarned || r.Coins || 0) > 0) {
        var rCoins = Number(r.CoinsEarned || r.Coins || 0);
        var foundCorresponding = false;
        if (r.WalletTransactionID && maps.txIdSet[r.WalletTransactionID]) {
          foundCorresponding = true;
        } else {
          var ref = r.AdID || r.CampaignID || "";
          var refTxs = maps.txByRef[ref] || [];
          refTxs.forEach(function(tx) {
            if (String(tx.UserID) === String(r.UserID) &&
                Math.abs(_getTxCoins(tx) - rCoins) < 0.01) {
              foundCorresponding = true;
            }
          });
        }
        if (!foundCorresponding) {
          anomalies.push({
            Category: "REWARD",
            Severity: "MEDIUM",
            EntityID: r.RewardID || "",
            RelatedUser: r.UserID || "",
            RelatedCampaign: r.AdID || r.CampaignID || "",
            Issue: "Completed reward without matching wallet transaction",
            Expected: r.WalletTransactionID ? ("Transaction " + r.WalletTransactionID + " should exist") : ("A WalletTransaction with ReferenceID=" + (r.AdID || r.CampaignID || "") + " and Amount=" + rCoins + " should exist"),
            Actual: "No matching transaction found",
            Difference: "",
            Timestamp: r.CreatedAt || r.LastWatchedAt || ""
          });
        }
      }
    });

    // Deduplicate
    var uniqueKeys = {};
    var deduped = [];
    anomalies.forEach(function(a) {
      var key = a.Category + "|" + a.EntityID + "|" + String(a.RelatedUser) + "|" + a.Issue.substring(0, 40);
      if (!uniqueKeys[key]) {
        uniqueKeys[key] = true;
        deduped.push(a);
      }
    });

    deduped.sort(function(a, b) {
      var sev = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 };
      var sa = sev[a.Severity] || 0;
      var sb = sev[b.Severity] || 0;
      if (sa !== sb) return sa - sb;
      return _compareDatesDesc({ CreatedDate: a.Timestamp }, { CreatedDate: b.Timestamp });
    });

    var total = deduped.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = deduped.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Reward Anomalies Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: DUPLICATE REWARD DETECTION
 * Explicit duplicate detection using actual uniqueness rules
 * - PIP: UserID + CampaignID (AdWatchHistory with status completed/rewarded)
 * - Legacy: UserID + AdID (AdRewardHistory)
 * ?action=duplicaterewards&session=TOKEN&page=1&limit=50
 * ============================================================
 */
function getDuplicateRewards(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var duplicates = [];

    // Check AdRewardHistory for duplicate UserID + AdID
    var seenPairs = {};
    maps.rewardData.forEach(function(r) {
      var uid = r.UserID || "";
      var aid = r.AdID || "";
      var key = uid + "|" + aid;
      if (!uid || !aid) return;
      if (!seenPairs[key]) {
        seenPairs[key] = [];
      }
      seenPairs[key].push(r);
    });

    for (var key in seenPairs) {
      if (seenPairs[key].length > 1) {
        var parts = key.split("|");
        var userId = parts[0];
        var adId = parts[1];
        var totalCoins = 0;
        seenPairs[key].forEach(function(r) {
          totalCoins += Number(r.CoinsEarned || 0);
        });

        duplicates.push({
          UserID: userId,
          AdID: adId,
          CampaignID: "",
          Source: "AdRewardHistory",
          RecordCount: seenPairs[key].length,
          TotalCoins: totalCoins,
          Records: seenPairs[key].map(function(r) {
            return { RewardID: r.RewardID, CoinsEarned: Number(r.CoinsEarned || 0), Completed: r.Completed };
          }),
          Reason: "Multiple AdRewardHistory records for same UserID+AdID",
          DuplicateCount: seenPairs[key].length - 1
        });
      }
    }

    // Check for PIP duplicates via AdWatchHistory if sheet exists
    try {
      var watchHistory = getSheetData("AdWatchHistory");
      if (watchHistory && watchHistory.length > 0) {
        var pipSeen = {};
        watchHistory.forEach(function(h) {
          var uid = h.UserID || "";
          var cid = h.CampaignID || "";
          var status = (h.Status || "").toLowerCase();
          if (!uid || !cid) return;
          if (status === "completed" || status === "rewarded") {
            var pk = uid + "|" + cid;
            if (!pipSeen[pk]) pipSeen[pk] = [];
            pipSeen[pk].push(h);
          }
        });

        for (var pk in pipSeen) {
          if (pipSeen[pk].length > 1) {
            var parts = pk.split("|");
            duplicates.push({
              UserID: parts[0],
              AdID: "",
              CampaignID: parts[1],
              Source: "AdWatchHistory (PIP)",
              RecordCount: pipSeen[pk].length,
              TotalCoins: 0,
              Records: pipSeen[pk].map(function(h) {
                return { WatchID: h.WatchID || "", Status: h.Status, RewardCoins: Number(h.RewardCoins || 0) };
              }),
              Reason: "Multiple PIP watch completions for same UserID+CampaignID",
              DuplicateCount: pipSeen[pk].length - 1
            });
          }
        }
      }
    } catch (watchErr) {
      // AdWatchHistory sheet may not exist
    }

    duplicates.sort(function(a, b) {
      return b.DuplicateCount - a.DuplicateCount;
    });

    var total = duplicates.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = duplicates.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Duplicate Rewards Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CAMPAIGN RECONCILIATION
 * Validate promotion campaign accounting
 * ?action=campaignreconciliation&session=TOKEN&search=TERM&page=1&limit=50
 * Statuses: HEALTHY, WARNING, MISMATCH, INSUFFICIENT_DATA
 * PROMOTION ECONOMY V2 - Validates new fuel economy
 * ============================================================
 */
function getCampaignReconciliation(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var results = [];
    var issues = [];

    maps.campaignData.forEach(function(c) {
      var cid = c.CampaignID || "";
      
      // Normalize to V2
      c = normalizeCampaignForIntegrity(c);
      
      var promotionFuel = Number(c.PromotionFuel || 0);
      var remainingFuel = Number(c.RemainingFuel || 0);
      var coinsConsumed = Number(c.CoinsConsumed || 0);
      var rewardCoins = Number(c.RewardCoins || 0);
      var views = Number(c.Views || 0);
      var status = c.Status || "";

      // Calculate expected remaining based on PromotionFuel and known distributions
      var expectedRemaining = promotionFuel - coinsConsumed;
      var fuelUsed = promotionFuel - remainingFuel;

      var campStatus = "HEALTHY";
      var campIssues = [];

      // V2 Check: RemainingFuel should not be negative
      if (remainingFuel < 0) {
        campIssues.push("RemainingFuel below zero: " + remainingFuel);
        campStatus = "MISMATCH";
      }

      // V2 Check: RemainingFuel should not exceed PromotionFuel
      if (remainingFuel > promotionFuel && promotionFuel > 0) {
        campIssues.push("RemainingFuel (" + remainingFuel + ") > PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }

      // V2 Check: CoinsConsumed should not exceed PromotionFuel
      if (coinsConsumed > promotionFuel && promotionFuel > 0) {
        campIssues.push("CoinsConsumed (" + coinsConsumed + ") > PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }

      // V2 Check: CoinsConsumed + RemainingFuel should equal PromotionFuel
      var fuelBalance = coinsConsumed + remainingFuel;
      if (Math.abs(fuelBalance - promotionFuel) > 0.01 && promotionFuel > 0) {
        campIssues.push("Fuel balance mismatch: CoinsConsumed (" + coinsConsumed + ") + RemainingFuel (" + remainingFuel + ") ≠ PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }

      // Legacy check: Views should be reasonable
      if (views < 0) {
        campIssues.push("Negative views: " + views);
        if (campStatus === "HEALTHY") campStatus = "WARNING";
      }

      // Legacy check: RewardCoins should be positive
      if (rewardCoins < 0) {
        campIssues.push("Negative RewardCoins: " + rewardCoins);
        if (campStatus === "HEALTHY") campStatus = "WARNING";
      }

      if (campIssues.length === 0) {
        campIssues.push("No issues detected");
      }

      var entry = {
        CampaignID: cid,
        CampaignType: c.CampaignType || "",
        OwnerUserID: c.OwnerUserID || "",
        // V2 fields
        PromotionFuel: promotionFuel,
        RemainingFuel: remainingFuel,
        CoinsConsumed: coinsConsumed,
        RewardRatePerSecond: Number(c.RewardRatePerSecond || 0),
        EstimatedViewSeconds: Number(c.EstimatedViewSeconds || 0),
        EstimatedViews: Number(c.EstimatedViews || 0),
        // Legacy aliases
        RewardPool: promotionFuel,
        RemainingRewardCoins: remainingFuel,
        CoinsSpent: coinsConsumed,
        RewardCoins: rewardCoins,
        Views: views,
        Status: status,
        Issues: campIssues,
        HealthStatus: campStatus,
        StartDate: c.StartDate || "",
        EndDate: c.EndDate || "",
        CreatedDate: c.CreatedDate || ""
      };

      if (search) {
        if ((cid || "").toLowerCase().indexOf(search) === -1 &&
            (c.OwnerUserID || "").toLowerCase().indexOf(search) === -1 &&
            (c.CampaignType || "").toLowerCase().indexOf(search) === -1) {
          return;
        }
      }

      results.push(entry);
    });

    results.sort(function(a, b) {
      var sev = { "MISMATCH": 0, "WARNING": 1, "HEALTHY": 2 };
      var sa = sev[a.HealthStatus] || 0;
      var sb = sev[b.HealthStatus] || 0;
      if (sa !== sb) return sa - sb;
      return _compareDatesDesc(a.CreatedDate, b.CreatedDate);
    });

    var total = results.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = results.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Campaign Reconciliation Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: REWARD RECONCILIATION
 * Validate reward distribution against campaigns and wallets
 * ?action=rewardreconciliation&session=TOKEN&search=TERM&page=1&limit=50
 * ============================================================
 */
function getRewardReconciliation(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const maps = _buildIntegrityMaps();
    var results = [];

    maps.rewardData.forEach(function(r) {
      var rewardId = r.RewardID || "";
      var userId = r.UserID || "";
      var adId = r.AdID || "";
      var coinsEarned = Number(r.CoinsEarned || 0);
      var completed = String(r.Completed || "").toLowerCase();
      var createdAt = r.CreatedAt || r.LastWatchedAt || "";

      // Find corresponding campaign
      var campaign = maps.campaignMap[adId] || null;
      var campaignStatus = "UNKNOWN";
      var fuelStatus = "UNKNOWN";
      
      if (campaign) {
        // Normalize campaign to V2
        campaign = normalizeCampaignForIntegrity(campaign);
        campaignStatus = campaign.Status || "UNKNOWN";
        
        var remainingFuel = Number(campaign.RemainingFuel || 0);
        fuelStatus = remainingFuel >= 0 ? "VALID" : "NEGATIVE_FUEL";
      }

      // Find corresponding transaction
      var txs = maps.txByRef[adId] || [];
      var txFound = false;
      var txCoins = 0;
      if (r.WalletTransactionID) {
        var directTx = maps.txData.find(function(t) { return String(t.TransactionID) === String(r.WalletTransactionID); });
        if (directTx) {
          txFound = true;
          txCoins = _getTxCoins(directTx);
        }
      }
      if (!txFound) {
        txs.forEach(function(tx) {
          if (String(tx.UserID) === String(userId)) {
            txFound = true;
            txCoins = _getTxCoins(tx);
          }
        });
      }

      // Determine status
      var rewardStatus = "OK";
      var issues = [];

      var isComp = (completed === "yes" || completed === "completed");
      if (isComp && !txFound) {
        rewardStatus = "MISSING_TRANSACTION";
        issues.push("Completed reward without wallet transaction");
      }

      if (txFound && Math.abs(txCoins - coinsEarned) > 0.01) {
        rewardStatus = "AMOUNT_MISMATCH";
        issues.push("Reward coins (" + coinsEarned + ") ≠ Transaction coins (" + txCoins + ")");
      }

      if (campaign && campaignStatus !== "active" && campaignStatus !== "Active") {
        rewardStatus = "CAMPAIGN_INACTIVE";
        issues.push("Reward from inactive campaign");
      }

      if (fuelStatus === "NEGATIVE_FUEL") {
        rewardStatus = "NEGATIVE_FUEL";
        issues.push("Campaign has negative RemainingFuel");
      }

      if (coinsEarned <= 0 && isComp) {
        rewardStatus = "ZERO_REWARD";
        issues.push("Completed reward with zero or negative coins");
      }

      var user = maps.userMap[userId] || {};
      var entry = {
        RewardID: rewardId,
        UserID: userId,
        UserName: user.FullName || user.Name || "",
        AdID: adId,
        CampaignID: adId,
        Source: r.Source || "",
        WalletTransactionID: r.WalletTransactionID || "",
        CoinsEarned: coinsEarned,
        Completed: completed,
        CampaignStatus: campaignStatus,
        FuelStatus: fuelStatus,
        TransactionFound: txFound,
        TransactionCoins: txCoins,
        RewardStatus: rewardStatus,
        Issues: issues,
        Timestamp: createdAt
      };

      if (search) {
        if ((rewardId || "").toLowerCase().indexOf(search) === -1 &&
            (userId || "").toLowerCase().indexOf(search) === -1 &&
            (adId || "").toLowerCase().indexOf(search) === -1 &&
            (entry.UserName || "").toLowerCase().indexOf(search) === -1) {
          return;
        }
      }

      results.push(entry);
    });

    results.sort(function(a, b) {
      var sev = { "MISSING_TRANSACTION": 0, "AMOUNT_MISMATCH": 1, "NEGATIVE_FUEL": 2, "ZERO_REWARD": 3, "CAMPAIGN_INACTIVE": 4, "OK": 5 };
      var sa = sev[a.RewardStatus] || 0;
      var sb = sev[b.RewardStatus] || 0;
      if (sa !== sb) return sa - sb;
      return _compareDatesDesc(a.Timestamp, b.Timestamp);
    });

    var total = results.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = results.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Reward Reconciliation Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET DETAIL INTEGRITY
 * Computes reconciliation, transaction chain continuity, reward consistency,
 * and detected anomalies for a specific user's wallet.
 * ?action=adminwalletdetailintegrity&session=TOKEN&userId=USERID
 * ============================================================
 */
function getAdminWalletDetailIntegrity(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const userId = (e.parameter.userId || "").trim();
    if (!userId) {
      return error("userId required");
    }

    const maps = _buildIntegrityMaps();
    const wallet = maps.walletMap[userId] || null;

    if (!wallet) {
      return error("Wallet not found for user: " + userId);
    }

    const wid = wallet.WalletID || "";
    const storedBalance = Number(wallet.Balance || 0);

    // 1. Gather all transactions belonging to this wallet/user
    const txs = maps.txByWallet[wid] || [];
    const txCount = txs.length;

    var credits = 0;
    var debits = 0;
    var txDerived = 0;

    txs.forEach(function(tx) {
      var signed = _signedTxCoins(tx);
      txDerived += signed;
      if (signed > 0) credits += signed;
      else debits += Math.abs(signed);
    });

    var variance = txDerived - storedBalance;

    var status = "INSUFFICIENT_DATA";
    if (txCount === 0) {
      status = storedBalance === 0 ? "MATCHED" : "INSUFFICIENT_DATA";
    } else if (Math.abs(variance) < 0.01) {
      status = "MATCHED";
    } else {
      status = "MISMATCH";
    }

    // 2. Transaction Chain Continuity & Validation
    var chainIssues = [];
    var anomalies = [];

    // Wallet-level anomalies
    if (status === "MISMATCH") {
      anomalies.push({
        Category: "WALLET",
        Severity: "HIGH",
        EntityID: wid,
        RelatedUser: userId,
        Issue: "Stored balance (" + storedBalance + ") does not match derived balance (" + txDerived + ") [Variance: " + variance + "]"
      });
    }
    if (storedBalance < 0) {
      anomalies.push({
        Category: "WALLET",
        Severity: "HIGH",
        EntityID: wid,
        RelatedUser: userId,
        Issue: "Negative stored wallet balance: " + storedBalance
      });
    }

    // Check individual transactions for before/after relationship and validity
    txs.forEach(function(tx) {
      var tid = tx.TransactionID || "MISSING";
      var amt = Number(tx.Coins !== undefined && tx.Coins !== "" ? tx.Coins : tx.Amount);

      if (isNaN(amt) || !isFinite(amt)) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "MEDIUM",
          EntityID: tid,
          RelatedUser: userId,
          Issue: "Invalid transaction amount: '" + (tx.Coins || tx.Amount) + "'"
        });
      }

      var before = Number(tx.BalanceBefore || tx.Before || 0);
      var after = Number(tx.BalanceAfter || tx.After || 0);
      var signedAmt = _signedTxCoins(tx);

      if (before !== 0 || after !== 0) {
        if (Math.abs(after - (before + signedAmt)) > 0.01) {
          var issueMsg = "Broken Before→After balance relationship: After (" + after + ") ≠ Before (" + before + ") + Coins (" + signedAmt + ")";
          chainIssues.push({
            TransactionID: tid,
            Issue: issueMsg
          });
          anomalies.push({
            Category: "TRANSACTION",
            Severity: "HIGH",
            EntityID: tid,
            RelatedUser: userId,
            Issue: issueMsg
          });
        }
      }

      // Check transaction status / type validity
      var validTypes = { "REWARD": true, "PURCHASE": true, "REDEMPTION": true, "DEBIT": true, "CREDIT": true };
      var txType = (tx.Type || "").toUpperCase();
      if (txType && !validTypes[txType]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "LOW",
          EntityID: tid,
          RelatedUser: userId,
          Issue: "Unrecognized transaction type: '" + tx.Type + "'"
        });
      }

      var validStatuses = { "SUCCESS": true, "PENDING": true, "FAILED": true };
      var txStatus = (tx.Status || "").toUpperCase();
      if (txStatus && !validStatuses[txStatus]) {
        anomalies.push({
          Category: "TRANSACTION",
          Severity: "LOW",
          EntityID: tid,
          RelatedUser: userId,
          Issue: "Unrecognized transaction status: '" + tx.Status + "'"
        });
      }
    });

    // Check balance chain continuity across chronological transactions (oldest to newest)
    var sortedTxsAsc = txs.slice().sort(function(a, b) {
      return _safeTimestamp(a.CreatedDate || a.CreatedAt || a.Timestamp || a.Date) -
             _safeTimestamp(b.CreatedDate || b.CreatedAt || b.Timestamp || b.Date);
    });

    for (var ci = 0; ci < sortedTxsAsc.length - 1; ci++) {
      var cur = sortedTxsAsc[ci];
      var next = sortedTxsAsc[ci + 1];
      var curAfter = Number(cur.BalanceAfter || cur.After || 0);
      var nxtBefore = Number(next.BalanceBefore || next.Before || 0);

      if (curAfter !== 0 || nxtBefore !== 0) {
        if (Math.abs(nxtBefore - curAfter) > 0.01) {
          var chainGapMsg = "Balance chain gap: previous BalanceAfter (" + curAfter + ") ≠ next BalanceBefore (" + nxtBefore + ")";
          chainIssues.push({
            TransactionID: next.TransactionID || "UNKNOWN",
            Issue: chainGapMsg
          });
          anomalies.push({
            Category: "TRANSACTION",
            Severity: "MEDIUM",
            EntityID: next.TransactionID || "UNKNOWN",
            RelatedUser: userId,
            Issue: chainGapMsg
          });
        }
      }
    }

    var chainStatus = chainIssues.length === 0 ? "OK" : "BROKEN";

    // 3. Reward Consistency Validation
    var userRewards = maps.rewardByUser[userId] || [];
    var rewardIssues = [];

    // Check for duplicate reward records
    var seenRewardKeys = {};
    userRewards.forEach(function(r) {
      var isLegacy = (r.Source === "AdRewardHistory (Legacy)");
      var key = isLegacy ? ("LEGACY|" + String(r.UserID || "") + "|" + String(r.AdID || "")) : ("ACTIVE|" + String(r.RewardID || ""));
      if (!r.RewardID && !isLegacy) return;
      if (!seenRewardKeys[key]) {
        seenRewardKeys[key] = 1;
      } else {
        seenRewardKeys[key]++;
        if (seenRewardKeys[key] === 2) {
          var dupMsg = isLegacy ? "Duplicate reward record for UserID and AdID: " + (r.AdID || "") : "Duplicate RewardID in AdRewards: " + r.RewardID;
          rewardIssues.push(dupMsg);
          anomalies.push({
            Category: "REWARD",
            Severity: "HIGH",
            EntityID: r.RewardID || "",
            RelatedUser: userId,
            Issue: dupMsg
          });
        }
      }
    });

    // Check completed rewards have matching wallet transactions
    userRewards.forEach(function(r) {
      var isCompleted = (String(r.Completed || "").toLowerCase() === "yes" || String(r.Completed || "").toLowerCase() === "completed");
      var rCoins = Number(r.CoinsEarned || r.Coins || 0);

      if (isCompleted && rCoins > 0) {
        var foundTx = false;
        if (r.WalletTransactionID && maps.txIdSet[r.WalletTransactionID]) {
          foundTx = true;
        } else {
          var ref = r.AdID || r.CampaignID || "";
          var refTxs = maps.txByRef[ref] || [];
          refTxs.forEach(function(tx) {
            if (String(tx.UserID) === String(userId) && Math.abs(_getTxCoins(tx) - rCoins) < 0.01) {
              foundTx = true;
            }
          });
        }

        if (!foundTx) {
          var missMsg = "Completed reward without matching wallet transaction (RewardID: " + (r.RewardID || "UNKNOWN") + ", Coins: " + rCoins + ")";
          rewardIssues.push(missMsg);
          anomalies.push({
            Category: "REWARD",
            Severity: "MEDIUM",
            EntityID: r.RewardID || "",
            RelatedUser: userId,
            Issue: missMsg
          });
        }
      }
    });

    var rewardConsistency = rewardIssues.length === 0 ? "CONSISTENT" : "INCONSISTENT";

    // Deduplicate anomalies by Category + EntityID + Issue
    var uniqueAnomalyKeys = {};
    var dedupedAnomalies = [];
    anomalies.forEach(function(a) {
      var aKey = a.Category + "|" + (a.EntityID || "") + "|" + (a.Issue || "").substring(0, 40);
      if (!uniqueAnomalyKeys[aKey]) {
        uniqueAnomalyKeys[aKey] = true;
        dedupedAnomalies.push(a);
      }
    });

    return success({
      reconciliation: {
        Status: status,
        StoredBalance: storedBalance,
        DerivedBalance: txDerived,
        Variance: variance,
        Credits: credits,
        Debits: debits,
        TransactionCount: txCount,
        ChainStatus: chainStatus,
        RewardConsistency: rewardConsistency,
        ChainIssues: chainIssues
      },
      anomalies: dedupedAnomalies
    }, "Wallet Detail Integrity Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CONSOLIDATED ANOMALY EXPLORER
 * Aggregates, deduplicates, filters, and paginates anomalies across
 * TRANSACTION, REWARD, WALLET, and CAMPAIGN integrity domains.
 * Composes authoritative anomaly and reconciliation generators:
 * - getTransactionAnomalies
 * - getRewardAnomalies
 * - getWalletReconciliation
 * - getCampaignReconciliation
 *
 * ?action=anomalyexplorer&session=TOKEN&page=1&limit=25
 * Filters: search, category, severity, userId, walletId, campaignId
 * ============================================================
 */
function getAnomalyExplorer(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const page = Math.max(1, parseInt(e.parameter.page || "1", 10) || 1);
    const limit = Math.max(1, parseInt(e.parameter.limit || "25", 10) || 25);
    const search = (e.parameter.search || "").trim().toLowerCase();
    const category = (e.parameter.category || "").trim().toUpperCase();
    const severity = (e.parameter.severity || "").trim().toUpperCase();
    const userId = (e.parameter.userId || "").trim().toLowerCase();
    const walletId = (e.parameter.walletId || "").trim().toLowerCase();
    const campaignId = (e.parameter.campaignId || "").trim().toLowerCase();

    // Helper to safely extract records array from authoritative GAS responses
    function _extractResponseList(res) {
      if (!res) return [];
      try {
        if (typeof res.getContent === "function") {
          var json = JSON.parse(res.getContent());
          return (json && json.success && json.data && Array.isArray(json.data.data)) ? json.data.data : [];
        }
        if (res && res.data && Array.isArray(res.data.data)) {
          return res.data.data;
        }
        return [];
      } catch (err) {
        return [];
      }
    }

    const subE = {
      parameter: {
        session: (e.parameter && e.parameter.session) || "",
        page: "1",
        limit: "10000"
      }
    };

    const allAnomalies = [];

    // 1. Transaction Domain Anomalies
    const rawTx = _extractResponseList(getTransactionAnomalies(subE));
    rawTx.forEach(function(a) {
      allAnomalies.push({
        Severity: a.Severity || "HIGH",
        Category: a.Category || "TRANSACTION",
        EntityID: a.EntityID || "",
        RelatedUser: a.RelatedUser || "",
        RelatedWallet: a.RelatedWallet || "",
        RelatedCampaign: a.RelatedCampaign || "",
        Issue: a.Issue || "",
        Expected: a.Expected || "",
        Actual: a.Actual || "",
        Difference: a.Difference != null ? String(a.Difference) : "",
        Timestamp: a.Timestamp || ""
      });
    });

    // 2. Reward Domain Anomalies
    const rawReward = _extractResponseList(getRewardAnomalies(subE));
    rawReward.forEach(function(a) {
      allAnomalies.push({
        Severity: a.Severity || "HIGH",
        Category: a.Category || "REWARD",
        EntityID: a.EntityID || "",
        RelatedUser: a.RelatedUser || "",
        RelatedWallet: a.RelatedWallet || "",
        RelatedCampaign: a.RelatedCampaign || "",
        Issue: a.Issue || "",
        Expected: a.Expected || "",
        Actual: a.Actual || "",
        Difference: a.Difference != null ? String(a.Difference) : "",
        Timestamp: a.Timestamp || ""
      });
    });

    // 3. Wallet Domain Reconciliation Anomalies
    const rawWallets = _extractResponseList(getWalletReconciliation(subE));
    rawWallets.forEach(function(w) {
      var stored = Number(w.StoredBalance || 0);
      var derived = Number(w.DerivedBalance || 0);
      var variance = Number(w.Variance || 0);
      var wid = w.WalletID || "";
      var uid = w.UserID || "";
      var ts = w.LastTransaction || "";

      if (w.Status === "MISMATCH") {
        allAnomalies.push({
          Severity: "HIGH",
          Category: "WALLET",
          EntityID: wid,
          RelatedUser: uid,
          RelatedWallet: wid,
          RelatedCampaign: "",
          Issue: "Stored balance does not match derived balance",
          Expected: "StoredBalance (" + stored + ") = DerivedBalance (" + derived + ")",
          Actual: "StoredBalance = " + stored + ", DerivedBalance = " + derived,
          Difference: String(variance),
          Timestamp: ts
        });
      } else if (w.Status === "INSUFFICIENT_DATA") {
        allAnomalies.push({
          Severity: "HIGH",
          Category: "WALLET",
          EntityID: wid,
          RelatedUser: uid,
          RelatedWallet: wid,
          RelatedCampaign: "",
          Issue: "Stored balance without any transaction history",
          Expected: "StoredBalance (" + stored + ") should be 0 when 0 transactions exist",
          Actual: "StoredBalance = " + stored + ", TransactionCount = 0",
          Difference: String(stored),
          Timestamp: ts
        });
      }

      if (stored < 0) {
        allAnomalies.push({
          Severity: "HIGH",
          Category: "WALLET",
          EntityID: wid,
          RelatedUser: uid,
          RelatedWallet: wid,
          RelatedCampaign: "",
          Issue: "Negative stored wallet balance: " + stored,
          Expected: "Balance >= 0",
          Actual: "Balance = " + stored,
          Difference: String(stored),
          Timestamp: ts
        });
      }
    });

    // 4. Campaign Domain Reconciliation Anomalies
    const rawCampaigns = _extractResponseList(getCampaignReconciliation(subE));
    rawCampaigns.forEach(function(c) {
      if (c.HealthStatus && c.HealthStatus !== "HEALTHY") {
        var cid = c.CampaignID || "";
        var uid = c.OwnerUserID || "";
        var ts = c.CreatedDate || "";
        var sev = c.HealthStatus === "MISMATCH" ? "HIGH" : "MEDIUM";
        var issues = Array.isArray(c.Issues) ? c.Issues : [c.Issues || "Accounting mismatch"];

        issues.forEach(function(iss) {
          if (!iss || iss === "No issues detected") return;
          var diffVal = Number(c.RemainingFuel || 0) < 0 ?
            c.RemainingFuel :
            (Number(c.PromotionFuel || 0) - (Number(c.CoinsConsumed || 0) + Number(c.RemainingFuel || 0)));

          allAnomalies.push({
            Severity: sev,
            Category: "CAMPAIGN",
            EntityID: cid,
            RelatedUser: uid,
            RelatedWallet: "",
            RelatedCampaign: cid,
            Issue: iss,
            Expected: "Healthy campaign accounting",
            Actual: iss,
            Difference: String(diffVal),
            Timestamp: ts
          });
        });
      }
    });

    // 5. Deduplicate across domains (Exact contract: Category + EntityID + Issue)
    const seenMap = {};
    const dedupedAnomalies = [];
    allAnomalies.forEach(function(a) {
      const dedupKey = (a.Category || "") + "|" + (a.EntityID || "") + "|" + (a.Issue || "");
      if (!seenMap[dedupKey]) {
        seenMap[dedupKey] = true;
        dedupedAnomalies.push(a);
      }
    });

    // 6. Collect available categories and severities for filters
    const availableCategories = [...new Set(dedupedAnomalies.map(function(a) { return a.Category; }))].sort();
    const availableSeverities = [...new Set(dedupedAnomalies.map(function(a) { return a.Severity; }))].sort();

    // 7. Apply filtering
    const filtered = dedupedAnomalies.filter(function(a) {
      if (category && a.Category.toUpperCase() !== category) return false;
      if (severity && a.Severity.toUpperCase() !== severity) return false;
      if (userId && a.RelatedUser.toLowerCase().indexOf(userId) === -1) return false;
      if (walletId && a.RelatedWallet.toLowerCase().indexOf(walletId) === -1) return false;
      if (campaignId && a.RelatedCampaign.toLowerCase().indexOf(campaignId) === -1) return false;

      if (search) {
        var match = (
          (a.EntityID && a.EntityID.toLowerCase().indexOf(search) !== -1) ||
          (a.Issue && a.Issue.toLowerCase().indexOf(search) !== -1) ||
          (a.RelatedUser && a.RelatedUser.toLowerCase().indexOf(search) !== -1) ||
          (a.RelatedWallet && a.RelatedWallet.toLowerCase().indexOf(search) !== -1) ||
          (a.RelatedCampaign && a.RelatedCampaign.toLowerCase().indexOf(search) !== -1) ||
          (a.Expected && a.Expected.toLowerCase().indexOf(search) !== -1) ||
          (a.Actual && a.Actual.toLowerCase().indexOf(search) !== -1) ||
          (a.Category && a.Category.toLowerCase().indexOf(search) !== -1)
        );
        if (!match) return false;
      }
      return true;
    });

    // 8. Sort: Severity HIGH (0) -> MEDIUM (1) -> LOW (2), then Timestamp descending
    const severityOrder = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 };
    filtered.sort(function(a, b) {
      var sA = severityOrder[a.Severity] !== undefined ? severityOrder[a.Severity] : 99;
      var sB = severityOrder[b.Severity] !== undefined ? severityOrder[b.Severity] : 99;
      if (sA !== sB) return sA - sB;
      var tA = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
      var tB = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
      return tB - tA;
    });

    // 9. Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    // 10. Return established contract
    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      filters: {
        categories: availableCategories,
        severities: availableSeverities
      },
      data: paged
    }, "Anomaly Explorer Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CAMPAIGN ECONOMY INTEGRITY
 * Provides per-campaign detailed accounting integrity analysis
 * as well as paginated multi-campaign integrity list views.
 * Reuses authoritative maps and V2 Promotion Fuel normalizer.
 *
 * ?action=campaigneconomyintegrity&session=TOKEN
 * Optional parameters:
 * - campaignId: Specific campaign ID for detailed single-campaign view
 * - search: Search by CampaignID, OwnerUserID, CampaignType, OwnerName
 * - status: Filter by Status or AccountingStatus
 * - page: 1-based page index (default: 1)
 * - limit: Records per page (default: 25, max: 100)
 * ============================================================
 */
function getCampaignEconomyIntegrity(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const targetId = (e.parameter && e.parameter.campaignId || "").trim();
    const search = (e.parameter && e.parameter.search || "").trim().toLowerCase();
    const statusFilter = (e.parameter && e.parameter.status || "").trim().toUpperCase();
    const page = Math.max(1, parseInt(e.parameter && e.parameter.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(e.parameter && e.parameter.limit || "25", 10) || 25));

    const maps = _buildIntegrityMaps();

    // Helper for single campaign analysis using authoritative integrity logic
    function analyzeCampaign(rawC) {
      const c = normalizeCampaignForIntegrity(rawC);
      const cid = c.CampaignID || "";
      const promotionFuel = Number(c.PromotionFuel || 0);
      const remainingFuel = Number(c.RemainingFuel || 0);
      const coinsConsumed = Number(c.CoinsConsumed || 0);
      const rewardCoins = Number(c.RewardCoins || 0);
      const views = Number(c.Views || 0);
      const owner = maps.userMap[c.OwnerUserID] || null;

      // Expected Remaining = max(0, PromotionFuel - CoinsConsumed)
      const expectedRemaining = Math.max(0, promotionFuel - coinsConsumed);
      const variance = remainingFuel - expectedRemaining;

      // Rewards aggregation
      const campaignRewards = maps.rewardByAd[cid] || [];
      var rewardsDistributed = 0;
      var uniqueUsersSet = {};
      campaignRewards.forEach(function(r) {
        var cStatus = String(r.Completed || r.Status || "").toLowerCase();
        var isCompleted = (cStatus === "yes" || cStatus === "completed" || cStatus === "paid");
        var coins = Number(r.CoinsEarned || r.Coins || 0);
        if (isCompleted && coins > 0) {
          rewardsDistributed += coins;
          if (r.UserID) uniqueUsersSet[r.UserID] = true;
        }
      });
      var uniqueUsersRewarded = Object.keys(uniqueUsersSet).length;

      // Transactions aggregation
      const campaignTxs = maps.txByRef[cid] || [];

      // Accounting & Health status determination
      var campStatus = "HEALTHY";
      var campIssues = [];

      if (remainingFuel < 0) {
        campIssues.push("RemainingFuel below zero: " + remainingFuel);
        campStatus = "MISMATCH";
      }
      if (remainingFuel > promotionFuel && promotionFuel > 0) {
        campIssues.push("RemainingFuel (" + remainingFuel + ") > PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }
      if (coinsConsumed > promotionFuel && promotionFuel > 0) {
        campIssues.push("CoinsConsumed (" + coinsConsumed + ") > PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }
      var fuelBalance = coinsConsumed + remainingFuel;
      if (Math.abs(fuelBalance - promotionFuel) > 0.01 && promotionFuel > 0) {
        campIssues.push("Fuel balance mismatch: CoinsConsumed (" + coinsConsumed + ") + RemainingFuel (" + remainingFuel + ") ≠ PromotionFuel (" + promotionFuel + ")");
        campStatus = "MISMATCH";
      }
      if (views < 0) {
        campIssues.push("Negative views: " + views);
        if (campStatus === "HEALTHY") campStatus = "WARNING";
      }
      if (rewardCoins < 0) {
        campIssues.push("Negative RewardCoins: " + rewardCoins);
        if (campStatus === "HEALTHY") campStatus = "WARNING";
      }
      if (promotionFuel === 0 && coinsConsumed === 0 && remainingFuel === 0) {
        if (campIssues.length === 0) campStatus = "INSUFFICIENT_DATA";
      }
      if (campIssues.length === 0) {
        campIssues.push("No issues detected");
      }

      return {
        c: c,
        cid: cid,
        owner: owner,
        promotionFuel: promotionFuel,
        remainingFuel: remainingFuel,
        coinsConsumed: coinsConsumed,
        rewardCoins: rewardCoins,
        views: views,
        expectedRemaining: expectedRemaining,
        variance: variance,
        rewardsDistributed: rewardsDistributed,
        uniqueUsersRewarded: uniqueUsersRewarded,
        campaignRewards: campaignRewards,
        campaignTxs: campaignTxs,
        campStatus: campStatus,
        campIssues: campIssues
      };
    }

    // 1. DETAIL MODE: campaignId is supplied
    if (targetId) {
      let campaign = maps.campaignMap[targetId];
      if (!campaign) {
        const targetLower = targetId.toLowerCase();
        campaign = (maps.campaignData || []).find(function(c) {
          return String(c.CampaignID || "").toLowerCase() === targetLower;
        });
      }
      if (!campaign) {
        return error("Campaign not found: " + targetId);
      }

      const a = analyzeCampaign(campaign);

      return success({
        campaign: {
          CampaignID: a.cid,
          CampaignType: a.c.CampaignType || "",
          OwnerUserID: a.c.OwnerUserID || "",
          OwnerName: a.owner ? (a.owner.FullName || a.owner.Name || "") : "",
          Status: a.c.Status || "Active",
          CreatedDate: a.c.CreatedDate || "",
          StartDate: a.c.StartDate || "",
          EndDate: a.c.EndDate || "",
          City: a.c.City || "",
          State: a.c.State || "",
          Country: a.c.Country || "",
          Radius: a.c.Radius || "",
          Latitude: a.c.Latitude || "",
          Longitude: a.c.Longitude || "",
          Views: Number(a.c.Views || 0),
          Clicks: Number(a.c.Clicks || 0),
          Interested: Number(a.c.Interested || 0),
          Shares: Number(a.c.Shares || 0)
        },
        accounting: {
          PromotionFuel: a.promotionFuel,
          RemainingFuel: a.remainingFuel,
          CoinsConsumed: a.coinsConsumed,
          RewardRatePerSecond: Number(a.c.RewardRatePerSecond || 0),
          EstimatedViewSeconds: Number(a.c.EstimatedViewSeconds || 0),
          EstimatedViews: Number(a.c.EstimatedViews || 0),
          RewardCoins: Number(a.c.RewardCoins || 0),
          Duration: Number(a.c.Duration || a.c.DurationSeconds || 0),
          RewardPool: a.promotionFuel,
          RemainingRewardCoins: a.remainingFuel,
          CoinsSpent: a.coinsConsumed,
          PlatformReserve: Number(a.c.PlatformReserve || 0)
        },
        reconciliation: {
          RewardsDistributed: a.rewardsDistributed,
          UniqueUsersRewarded: a.uniqueUsersRewarded,
          ExpectedRemaining: a.expectedRemaining,
          Variance: a.variance,
          AccountingStatus: a.campStatus,
          HealthStatus: a.campStatus,
          Issues: a.campIssues
        },
        rewards: {
          count: a.campaignRewards.length,
          totalCoins: a.rewardsDistributed,
          uniqueUsersRewarded: a.uniqueUsersRewarded,
          records: a.campaignRewards.slice(0, 100)
        },
        transactions: {
          count: a.campaignTxs.length,
          records: a.campaignTxs.slice(0, 100)
        }
      }, "Campaign Economy Integrity Loaded");
    }

    // 2. LIST MODE: campaignId is NOT supplied
    const results = [];
    (maps.campaignData || []).forEach(function(rawC) {
      const a = analyzeCampaign(rawC);

      // Filter by search
      if (search) {
        var matchSearch = (
          (a.cid && a.cid.toLowerCase().indexOf(search) !== -1) ||
          (a.c.OwnerUserID && a.c.OwnerUserID.toLowerCase().indexOf(search) !== -1) ||
          (a.c.CampaignType && a.c.CampaignType.toLowerCase().indexOf(search) !== -1) ||
          (a.owner && a.owner.FullName && a.owner.FullName.toLowerCase().indexOf(search) !== -1)
        );
        if (!matchSearch) return;
      }

      // Filter by status (matches Status OR AccountingStatus/HealthStatus)
      if (statusFilter) {
        var matchStatus = (
          String(a.c.Status || "").toUpperCase() === statusFilter ||
          String(a.campStatus || "").toUpperCase() === statusFilter
        );
        if (!matchStatus) return;
      }

      results.push({
        CampaignID: a.cid,
        CampaignType: a.c.CampaignType || "",
        OwnerUserID: a.c.OwnerUserID || "",
        OwnerName: a.owner ? (a.owner.FullName || a.owner.Name || "") : "",
        PromotionFuel: a.promotionFuel,
        RemainingFuel: a.remainingFuel,
        CoinsConsumed: a.coinsConsumed,
        RewardRatePerSecond: Number(a.c.RewardRatePerSecond || 0),
        EstimatedViewSeconds: Number(a.c.EstimatedViewSeconds || 0),
        EstimatedViews: Number(a.c.EstimatedViews || 0),
        RewardCoins: Number(a.c.RewardCoins || 0),
        RewardPool: a.promotionFuel,
        RemainingRewardCoins: a.remainingFuel,
        CoinsSpent: a.coinsConsumed,
        PlatformReserve: Number(a.c.PlatformReserve || 0),
        Views: Number(a.c.Views || 0),
        Clicks: Number(a.c.Clicks || 0),
        Status: a.c.Status || "",
        RewardsDistributed: a.rewardsDistributed,
        UniqueUsersRewarded: a.uniqueUsersRewarded,
        ExpectedRemaining: a.expectedRemaining,
        Variance: a.variance,
        AccountingStatus: a.campStatus,
        HealthStatus: a.campStatus,
        Issues: a.campIssues,
        StartDate: a.c.StartDate || "",
        EndDate: a.c.EndDate || "",
        CreatedDate: a.c.CreatedDate || ""
      });
    });

    // Sort: MISMATCH (0), WARNING (1), INSUFFICIENT_DATA (2), HEALTHY (3), then date desc
    results.sort(function(a, b) {
      var sev = { "MISMATCH": 0, "WARNING": 1, "INSUFFICIENT_DATA": 2, "HEALTHY": 3 };
      var sa = sev[a.HealthStatus] !== undefined ? sev[a.HealthStatus] : 9;
      var sb = sev[b.HealthStatus] !== undefined ? sev[b.HealthStatus] : 9;
      if (sa !== sb) return sa - sb;
      return _compareDatesDesc(a.CreatedDate, b.CreatedDate);
    });

    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paged = results.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Campaign Economy Integrity Loaded");

  } catch (err) {
    return exception(err);
  }
}