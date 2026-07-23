/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminEconomyIntegrity.js
 * PHASE 5.7B - ECONOMY RECONCILIATION & INTEGRITY MONITORING
 * READ-ONLY economy validation, detection, and anomaly visibility
 * ============================================================
 */

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

function _compareDatesAsc(a, b) {
  return _safeTimestamp(a) - _safeTimestamp(b);
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
  const rewardData = getSheetData("AdRewardHistory");
  const campaignData = getSheetData("PromotionCampaigns");
  const usersData = getSheetData(CONFIG.SHEETS.USERS);
  const adsData = getSheetData("Advertisements");

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
      var key = String(r.UserID || "") + "|" + String(r.AdID || "");
      if (!rewardKeys[key]) rewardKeys[key] = 0;
      rewardKeys[key]++;
      if (rewardKeys[key] > 1) duplicateRewards++;
    });

    // Reward/Transaction mismatches
    var rewardTxMismatches = 0;
    maps.rewardData.forEach(function(r) {
      if (String(r.Completed || "") === "Yes") {
        var ref = r.AdID || "";
        var refTxs = maps.txByRef[ref] || [];
        var found = false;
        var rCoins = Number(r.CoinsEarned || 0);
        refTxs.forEach(function(tx) {
          if (Math.abs(_getTxCoins(tx) - rCoins) < 0.01) found = true;
        });
        if (!found && rCoins > 0) rewardTxMismatches++;
      }
    });

    // Campaign accounting
    var campaignsChecked = maps.campaignData.length;
    var campMismatches = 0;
    maps.campaignData.forEach(function(c) {
      var rp = Number(c.RewardPool || 0);
      var rem = Number(c.RemainingRewardCoins || 0);
      if (rp > 0) {
        var used = rp - rem;
        if (used < -0.01 || rem < -0.01 || rem > rp + 0.01) {
          campMismatches++;
        }
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
        return _compareDatesAsc(a, b);
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

    // 1. Duplicate reward records (same UserID + AdID)
    var seenKeys = {};
    maps.rewardData.forEach(function(r) {
      var key = String(r.UserID || "") + "|" + String(r.AdID || "");
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
            RelatedCampaign: r.AdID || "",
            Issue: "Duplicate reward record - same UserID + AdID",
            Expected: "Each UserID + AdID pair should have at most 1 reward record",
            Actual: "Found " + seenKeys[key].count + " records for UserID=" + (r.UserID || "") + " AdID=" + (r.AdID || ""),
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
          RelatedCampaign: r.AdID || "",
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
      if (String(r.Completed || "") === "Yes" && Number(r.CoinsEarned || 0) > 0) {
        var ref = r.AdID || "";
        var refTxs = maps.txByRef[ref] || [];
        var foundCorresponding = false;
        refTxs.forEach(function(tx) {
          if (String(tx.UserID) === String(r.UserID) &&
              Math.abs(_getTxCoins(tx) - Number(r.CoinsEarned || 0)) < 0.01) {
            foundCorresponding = true;
          }
        });
        if (!foundCorresponding) {
          anomalies.push({
            Category: "REWARD",
            Severity: "MEDIUM",
            EntityID: r.RewardID || "",
            RelatedUser: r.UserID || "",
            RelatedCampaign: r.AdID || "",
            Issue: "Completed reward without matching wallet transaction",
            Expected: "A WalletTransaction with ReferenceID=" + (r.AdID || "") + " and Amount=" + (r.CoinsEarned || 0) + " should exist",
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
      return _compareDatesAsc({ CreatedDate: a.Timestamp }, { CreatedDate: b.Timestamp });
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
 * Explicit duplicate detection using actual uniqueness rules:
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
      var rp = Number(c.RewardPool || 0);
      var reserve = Number(c.PlatformReserve || 0);
      var remaining = Number(c.RemainingRewardCoins || 0);
      var spent = Number(c.CoinsSpent || 0);
      var rewardCoins = Number(c.RewardCoins || 0);
      var views = Number(c.Views || 0);
      var status = c.Status || "";

      // Calculate expected remaining based on reward pool and known distributions
      var expectedDistributed = rp - remaining;
      var expectedRemaining = rp - expectedDistributed;

      var campStatus = "HEALTHY";
      var campIssues = [];

      // Check: RemainingRewardCoins < 0
      if (remaining < 0) {
        campIssues.push("RemainingRewardCoins below zero: " + remaining);
        campStatus = "MISMATCH";
      }

      // Check: RemainingRewardCoins > RewardPool
      if (remaining > rp && rp > 0) {
        campIssues.push("RemainingRewardCoins (" + remaining + ") > RewardPool (" + rp + ")");
        campStatus = "MISMATCH";
      }

      // Check: CoinsSpent vs RewardPool + PlatformReserve
      if (spent > 0 && rp > 0) {
        var initialAccounting = spent - (rp + reserve);
        if (Math.abs(initialAccounting) > 0.01) {
          var warn = "CoinsSpent (" + spent + ") ≠ RewardPool (" + rp + ") + PlatformReserve (" + reserve + ") = " + (rp + reserve);
          campIssues.push(warn);
          if (campStatus === "HEALTHY") campStatus = "WARNING";
        }
      }

      // Check: Negative expected distributed = negative remaining excess
      if (expectedDistributed < 0 && rp > 0) {
        campIssues.push("Reward pool appears to have increased (negative distribution: " + expectedDistributed + ")");
        if (campStatus !== "MISMATCH") campStatus = "WARNING";
      }

      // If no transactions and no views, mark as INSUFFICIENT_DATA for accounting validation
      if (rp === 0 && remaining === 0 && spent === 0) {
        campStatus = "INSUFFICIENT_DATA";
      }

      // Get total rewards distributed from wallet transactions referencing this campaign
      var refTxs = maps.txByRef[cid] || [];
      var totalRewarded = 0;
      var rewardedTxCount = 0;
      refTxs.forEach(function(tx) {
        var coins = _getTxCoins(tx);
        if (coins > 0) {
          totalRewarded += coins;
          rewardedTxCount++;
        }
      });

      var entry = {
        CampaignID: cid,
        OwnerUserID: c.OwnerUserID || "",
        CampaignType: c.CampaignType || "",
        CoinsSpent: spent,
        RewardPool: rp,
        PlatformReserve: reserve,
        RemainingRewardCoins: remaining,
        RewardCoins: rewardCoins,
        ExpectedRemaining: Math.max(0, expectedRemaining),
        Variance: remaining - Math.max(0, expectedRemaining),
        RewardsDistributed: totalRewarded,
        RewardTxCount: rewardedTxCount,
        Views: views,
        Status: c.Status || "",
        AccountingStatus: campStatus,
        Issues: campIssues
      };

      // Search filter
      if (search) {
        if ((cid || "").toLowerCase().indexOf(search) === -1 &&
            (c.OwnerUserID || "").toLowerCase().indexOf(search) === -1 &&
            (c.CampaignType || "").toLowerCase().indexOf(search) === -1) {
          return;
        }
      }

      results.push(entry);
    });

    // Sort: MISMATCH first, then WARNING, then by variance
    results.sort(function(a, b) {
      var sev = { "MISMATCH": 0, "WARNING": 1, "HEALTHY": 2, "INSUFFICIENT_DATA": 3 };
      var sa = sev[a.AccountingStatus] || 3;
      var sb = sev[b.AccountingStatus] || 3;
      if (sa !== sb) return sa - sb;
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
    }, "Campaign Reconciliation Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CONSOLIDATED ANOMALY EXPLORER
 * One consolidated view with search/filter capabilities
 * ?action=anomalyexplorer&session=TOKEN&category=WALLET&severity=HIGH&search=TERM&page=1&limit=50
 * Categories: WALLET, TRANSACTION, REWARD, CAMPAIGN
 * ============================================================
 */
function getAnomalyExplorer(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    var filterCategory = (e.parameter.category || "").toUpperCase();
    var filterSeverity = (e.parameter.severity || "").toUpperCase();
    var filterSearch = (e.parameter.search || "").trim().toLowerCase();
    var filterUserId = (e.parameter.userId || "").trim();
    var filterWalletId = (e.parameter.walletId || "").trim();
    var filterCampaignId = (e.parameter.campaignId || "").trim();
    var filterTxId = (e.parameter.transactionId || "").trim();
    var filterRewardId = (e.parameter.rewardId || "").trim();

    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    var allAnomalies = [];

    // Gather wallet anomalies (mismatches are WALLET category)
    var walletMaps = _buildIntegrityMaps();
    walletMaps.walletData.forEach(function(w) {
      var wid = w.WalletID;
      var txs = walletMaps.txByWallet[wid] || [];
      var txDerived = 0;
      txs.forEach(function(tx) { txDerived += _signedTxCoins(tx); });
      var storedBalance = Number(w.Balance || 0);
      var variance = txDerived - storedBalance;

      if (txs.length > 0 && Math.abs(variance) > 0.01) {
        allAnomalies.push({
          Category: "WALLET",
          Severity: Math.abs(variance) > 100 ? "HIGH" : "MEDIUM",
          EntityID: wid || "",
          RelatedUser: w.UserID || "",
          RelatedWallet: wid || "",
          RelatedCampaign: "",
          Issue: "Wallet balance mismatch: stored=" + storedBalance + ", derived=" + txDerived,
          Expected: "" + storedBalance,
          Actual: "" + txDerived,
          Difference: "" + variance,
          Timestamp: w.LastUpdated || ""
        });
      }
    });

    // Gather transaction anomalies
    var txMaps = walletMaps;
    var seenTids = {};
    txMaps.txData.forEach(function(tx) {
      var tid = tx.TransactionID || "";
      if (!tid) {
        allAnomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: "MISSING",
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          RelatedCampaign: "",
          Issue: "Missing TransactionID",
          Expected: "TransactionID must not be empty",
          Actual: "(empty)",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
        return;
      }
      if (!seenTids[tid]) seenTids[tid] = 0;
      seenTids[tid]++;
      if (seenTids[tid] === 2) {
        allAnomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tid,
          RelatedUser: tx.UserID || "",
          RelatedWallet: tx.WalletID || "",
          RelatedCampaign: "",
          Issue: "Duplicate TransactionID",
          Expected: "Unique TransactionID",
          Actual: "Appears " + seenTids[tid] + " times",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
      if (!tx.UserID) {
        allAnomalies.push({
          Category: "TRANSACTION",
          Severity: "HIGH",
          EntityID: tid,
          RelatedUser: "",
          RelatedWallet: tx.WalletID || "",
          RelatedCampaign: "",
          Issue: "Missing UserID",
          Expected: "UserID required",
          Actual: "(empty)",
          Difference: "",
          Timestamp: tx.CreatedDate || tx.CreatedAt || ""
        });
      }
    });

    // Gather reward anomalies
    var rewardMaps = walletMaps;
    var seenPairs = {};
    rewardMaps.rewardData.forEach(function(r) {
      var key = String(r.UserID || "") + "|" + String(r.AdID || "");
      if (!seenPairs[key]) seenPairs[key] = 0;
      seenPairs[key]++;
      if (seenPairs[key] === 2) {
        allAnomalies.push({
          Category: "REWARD",
          Severity: "HIGH",
          EntityID: r.RewardID || "",
          RelatedUser: r.UserID || "",
          RelatedWallet: "",
          RelatedCampaign: r.AdID || "",
          Issue: "Duplicate reward (UserID+AdID)",
          Expected: "Unique (UserID, AdID) pair",
          Actual: "Multiple records found",
          Difference: "",
          Timestamp: r.CreatedAt || r.LastWatchedAt || ""
        });
      }
    });

    // Gather campaign anomalies
    var campMaps = walletMaps;
    campMaps.campaignData.forEach(function(c) {
      var rp = Number(c.RewardPool || 0);
      var remaining = Number(c.RemainingRewardCoins || 0);
      if (remaining < 0) {
        allAnomalies.push({
          Category: "CAMPAIGN",
          Severity: "HIGH",
          EntityID: c.CampaignID || "",
          RelatedUser: c.OwnerUserID || "",
          RelatedWallet: "",
          RelatedCampaign: c.CampaignID || "",
          Issue: "RemainingRewardCoins below zero",
          Expected: ">= 0",
          Actual: "" + remaining,
          Difference: "" + remaining,
          Timestamp: c.CreatedDate || ""
        });
      }
      if (remaining > rp && rp > 0) {
        allAnomalies.push({
          Category: "CAMPAIGN",
          Severity: "HIGH",
          EntityID: c.CampaignID || "",
          RelatedUser: c.OwnerUserID || "",
          RelatedWallet: "",
          RelatedCampaign: c.CampaignID || "",
          Issue: "RemainingRewardCoins exceeds RewardPool",
          Expected: "<= " + rp,
          Actual: "" + remaining,
          Difference: "" + (remaining - rp),
          Timestamp: c.CreatedDate || ""
        });
      }
    });

    // Apply filters
    var filtered = allAnomalies;
    if (filterCategory) {
      filtered = filtered.filter(function(a) { return a.Category === filterCategory; });
    }
    if (filterSeverity) {
      filtered = filtered.filter(function(a) { return a.Severity === filterSeverity; });
    }
    if (filterSearch) {
      filtered = filtered.filter(function(a) {
        return (a.EntityID || "").toLowerCase().indexOf(filterSearch) !== -1 ||
               (a.RelatedUser || "").toLowerCase().indexOf(filterSearch) !== -1 ||
               (a.Issue || "").toLowerCase().indexOf(filterSearch) !== -1;
      });
    }
    if (filterUserId) {
      filtered = filtered.filter(function(a) {
        return (a.RelatedUser || "").toLowerCase().indexOf(filterUserId.toLowerCase()) !== -1;
      });
    }
    if (filterWalletId) {
      filtered = filtered.filter(function(a) {
        return (a.RelatedWallet || "").toLowerCase().indexOf(filterWalletId.toLowerCase()) !== -1;
      });
    }
    if (filterCampaignId) {
      filtered = filtered.filter(function(a) {
        return (a.RelatedCampaign || "").toLowerCase().indexOf(filterCampaignId.toLowerCase()) !== -1;
      });
    }
    if (filterTxId) {
      filtered = filtered.filter(function(a) {
        return (a.EntityID || "").toLowerCase().indexOf(filterTxId.toLowerCase()) !== -1;
      });
    }
    if (filterRewardId) {
      filtered = filtered.filter(function(a) {
        return (a.EntityID || "").toLowerCase().indexOf(filterRewardId.toLowerCase()) !== -1;
      });
    }

    // Sort by severity then category
    filtered.sort(function(a, b) {
      var sev = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 };
      var sa = sev[a.Severity] || 2;
      var sb = sev[b.Severity] || 2;
      if (sa !== sb) return sa - sb;
      return a.Category.localeCompare(b.Category);
    });

    var total = filtered.length;
    var totalPages = Math.ceil(total / limit);
    var start = (page - 1) * limit;
    var paged = filtered.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged,
      filters: {
        categories: ["WALLET", "TRANSACTION", "REWARD", "CAMPAIGN"],
        severities: ["HIGH", "MEDIUM", "LOW"]
      }
    }, "Anomaly Explorer Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET DETAIL INTEGRITY
 * Extended wallet detail with integrity section
 * ?action=adminwalletdetailintegrity&session=TOKEN&userId=U001
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

    // Get wallet
    var wallet = maps.walletMap[userId];
    if (!wallet) {
      return error("Wallet not found for user: " + userId);
    }

    // Get transactions for this wallet
    var wid = wallet.WalletID;
    var txs = (maps.txByWallet[wid] || []).sort(function(a, b) {
      return _compareDatesAsc(a, b);
    });

    // Calculate derived balance
    var txDerived = 0;
    var credits = 0;
    var debits = 0;
    txs.forEach(function(tx) {
      var amt = _signedTxCoins(tx);
      txDerived += amt;
      if (amt > 0) credits += amt;
      else debits += Math.abs(amt);
    });

    var storedBalance = Number(wallet.Balance || 0);
    var variance = txDerived - storedBalance;

    // Wallet reconciliation status
    var walletStatus = "INSUFFICIENT_DATA";
    if (txs.length === 0) {
      walletStatus = storedBalance === 0 ? "MATCHED" : "INSUFFICIENT_DATA";
    } else if (Math.abs(variance) < 0.01) {
      walletStatus = "MATCHED";
    } else {
      walletStatus = "MISMATCH";
    }

    // Transaction chain status
    var chainBroken = false;
    var chainIssues = [];
    for (var i = 0; i < txs.length - 1; i++) {
      if (txs[i].After && txs[i + 1].Before &&
          Number(txs[i].After) !== Number(txs[i + 1].Before) &&
          (Number(txs[i].After) !== 0 || Number(txs[i + 1].Before) !== 0)) {
        chainBroken = true;
        chainIssues.push({
          TransactionID: txs[i + 1].TransactionID,
          Issue: "Before (" + txs[i + 1].Before + ") ≠ previous After (" + txs[i].After + ")"
        });
      }
    }

    // Reward consistency
    var rewards = maps.rewardByUser[userId] || [];
    var rewardTotal = 0;
    rewards.forEach(function(r) {
      rewardTotal += Number(r.CoinsEarned || 0);
    });

    var rewardsInTransactions = 0;
    txs.forEach(function(tx) {
      if (String(tx.Type || "").toUpperCase() === "REWARD" && _getTxCoins(tx) > 0) {
        rewardsInTransactions += _getTxCoins(tx);
      }
    });

    var rewardConsistent = Math.abs(rewardTotal - rewardsInTransactions) < 0.01;

    // Anomalies for this wallet/user
    var walletAnomalies = [];
    if (walletStatus === "MISMATCH") {
      walletAnomalies.push({
        Category: "WALLET",
        Severity: Math.abs(variance) > 100 ? "HIGH" : "MEDIUM",
        EntityID: wid,
        Issue: "Balance mismatch: stored=" + storedBalance + ", derived=" + txDerived,
        Expected: "" + storedBalance,
        Actual: "" + txDerived,
        Difference: "" + variance
      });
    }
    if (chainBroken) {
      walletAnomalies.push({
        Category: "TRANSACTION",
        Severity: "MEDIUM",
        EntityID: wid,
        Issue: "Balance chain broken in " + chainIssues.length + " place(s)",
        Expected: "Before=previous After",
        Actual: chainIssues[0].Issue,
        Difference: ""
      });
    }
    if (!rewardConsistent && (rewardTotal > 0 || rewardsInTransactions > 0)) {
      walletAnomalies.push({
        Category: "REWARD",
        Severity: "MEDIUM",
        EntityID: userId,
        Issue: "Reward total (" + rewardTotal + ") doesn't match reward transactions (" + rewardsInTransactions + ")",
        Expected: "" + rewardsInTransactions,
        Actual: "" + rewardTotal,
        Difference: "" + (rewardTotal - rewardsInTransactions)
      });
    }

    return success({
      wallet: {
        WalletID: wallet.WalletID || "",
        UserID: wallet.UserID || "",
        Balance: storedBalance,
        TotalEarned: Number(wallet.TotalEarned || 0),
        TotalSpent: Number(wallet.TotalSpent || 0),
        LastUpdated: wallet.LastUpdated || ""
      },
      reconciliation: {
        Status: walletStatus,
        StoredBalance: storedBalance,
        DerivedBalance: txDerived,
        Variance: variance,
        Credits: credits,
        Debits: debits,
        TransactionCount: txs.length,
        ChainStatus: chainBroken ? "BROKEN" : "OK",
        ChainIssues: chainIssues,
        RewardConsistency: rewardConsistent ? "CONSISTENT" : "INCONSISTENT",
        RewardTotal: rewardTotal,
        RewardTransactionTotal: rewardsInTransactions
      },
      anomalies: walletAnomalies,
      transactionCount: txs.length,
      rewardCount: rewards.length
    }, "Wallet Detail Integrity Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CAMPAIGN ECONOMY INTEGRITY
 * Extended campaign economy with integrity per campaign
 * ?action=campaigneconomyintegrity&session=TOKEN&campaignId=C001
 * ============================================================
 */
function getCampaignEconomyIntegrity(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const campaignId = (e.parameter.campaignId || "").trim();
    if (!campaignId) {
      return error("campaignId required");
    }

    const maps = _buildIntegrityMaps();

    var campaign = maps.campaignMap[campaignId];
    if (!campaign) {
      return error("Campaign not found: " + campaignId);
    }

    var rp = Number(campaign.RewardPool || 0);
    var reserve = Number(campaign.PlatformReserve || 0);
    var remaining = Number(campaign.RemainingRewardCoins || 0);
    var spent = Number(campaign.CoinsSpent || 0);
    var rewardCoins = Number(campaign.RewardCoins || 0);
    var views = Number(campaign.Views || 0);

    // Get actual rewards distributed via wallet transactions
    var refTxs = maps.txByRef[campaignId] || [];
    var totalRewarded = 0;
    var rewardedUsers = {};
    refTxs.forEach(function(tx) {
      var coins = _getTxCoins(tx);
      if (coins > 0) {
        totalRewarded += coins;
        if (tx.UserID) rewardedUsers[tx.UserID] = true;
      }
    });

    // Expected remaining based on reward pool
    var expectedDistributed = Math.min(totalRewarded, rp);
    var expectedRemaining = Math.max(0, rp - expectedDistributed);
    var variance = remaining - expectedRemaining;

    // Accounting issues
    var issues = [];
    if (remaining < 0) issues.push("RemainingRewardCoins is negative");
    if (remaining > rp && rp > 0) issues.push("RemainingRewardCoins exceeds RewardPool");
    if (Math.abs(variance) > 0.01) issues.push("Remaining differs from expected by " + variance);
    if (totalRewarded > rp && rp > 0) issues.push("Total rewarded (" + totalRewarded + ") exceeds RewardPool (" + rp + ")");

    var accountingStatus = "HEALTHY";
    if (issues.length > 0) {
      var hasCritical = issues.some(function(i) {
        return i.indexOf("negative") !== -1 || i.indexOf("exceeds") !== -1;
      });
      accountingStatus = hasCritical ? "MISMATCH" : "WARNING";
    }
    if (rp === 0 && remaining === 0 && spent === 0) {
      accountingStatus = "INSUFFICIENT_DATA";
    }

    return success({
      campaign: {
        CampaignID: campaignId,
        CampaignType: campaign.CampaignType || "",
        OwnerUserID: campaign.OwnerUserID || "",
        Status: campaign.Status || "",
        StartDate: campaign.StartDate || "",
        EndDate: campaign.EndDate || ""
      },
      accounting: {
        CoinsSpent: spent,
        RewardPool: rp,
        PlatformReserve: reserve,
        RemainingRewardCoins: remaining,
        RewardCoins: rewardCoins,
        RewardsDistributed: totalRewarded,
        UniqueUsersRewarded: Object.keys(rewardedUsers).length,
        ExpectedRemaining: expectedRemaining,
        ExpectedDistributed: expectedDistributed,
        Variance: variance,
        Views: views,
        AccountingStatus: accountingStatus,
        Issues: issues
      }
    }, "Campaign Economy Integrity Loaded");

  } catch (err) {
    return exception(err);
  }
}