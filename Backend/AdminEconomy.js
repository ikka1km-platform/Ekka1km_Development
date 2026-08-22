/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminEconomy.js
 * PHASE 5.7C - PROMOTION ECONOMY V2 INTEGRATION
 * READ-ONLY economy inspection APIs for Super Admin
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
function normalizeCampaignForAdmin(c) {
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
 * Safely convert any date-like value to a numeric timestamp for sorting.
 * Handles: Date objects, date strings, numeric timestamps, blank/null/undefined.
 * Returns a number (0 for invalid/missing dates).
 */
function safeTimestamp(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  // String: try to parse as date
  var ts = new Date(val).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * Compare two date values for newest-first (descending) sorting.
 * Returns negative if b is newer, positive if a is newer, 0 if equal.
 */
function compareDatesDesc(a, b) {
  return safeTimestamp(b) - safeTimestamp(a);
}

/**
 * ============================================================
 * ADMIN: ECONOMY SUMMARY
 * Aggregated read-only economy overview
 * ?action=admineconomysummary&session=TOKEN
 * PROMOTION ECONOMY V2 - Uses new fuel economy fields
 * ============================================================
 */
function getAdminEconomySummary(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    // Read Wallet sheet
    const walletData = getSheetData("Wallet");
    const walletTxData = getSheetData("WalletTransactions");
    const rewardData = getSheetData("AdRewardHistory");
    const campaignData = getSheetData("PromotionCampaigns");
    const usersData = getSheetData(CONFIG.SHEETS.USERS);

    // Total Users With Wallets
    const usersWithWallets = {};
    let totalCoinBalance = 0;
    walletData.forEach(function(w) {
      if (w.UserID) {
        usersWithWallets[w.UserID] = true;
      }
      totalCoinBalance += Number(w.Balance || 0);
    });

    // Wallet Transaction counts
    let totalCredits = 0;
    let totalDebits = 0;
    let walletTxCount = walletTxData.length;
    walletTxData.forEach(function(tx) {
      const amount = Number(tx.Coins || tx.Amount || 0);
      // WalletTransactions canonical schema stores value in "Coins".
      // Positive => credits, negative => debits
      if (amount > 0) {
        totalCredits += amount;
      } else {
        totalDebits += Math.abs(amount);
      }
    });

    // Reward counts
    let totalRewardCoins = 0;
    let rewardCount = 0;
    rewardData.forEach(function(r) {
      totalRewardCoins += Number(r.CoinsEarned || 0);
      rewardCount++;
    });

    // Campaign economy - PROMOTION ECONOMY V2
    let totalCoinsConsumed = 0;
    let totalPromotionFuel = 0;
    let totalRemainingFuel = 0;
    let activeCampaigns = 0;
    campaignData.forEach(function(c) {
      // Normalize to V2
      c = normalizeCampaignForAdmin(c);
      
      totalCoinsConsumed += Number(c.CoinsConsumed || 0);
      totalPromotionFuel += Number(c.PromotionFuel || 0);
      totalRemainingFuel += Number(c.RemainingFuel || 0);
      if (String(c.Status || "").toLowerCase() === "active") {
        activeCampaigns++;
      }
    });

    // Total users count
    const totalUsers = usersData.length;

    return success({
      totalUsersWithWallets: Object.keys(usersWithWallets).length,
      totalUsers: totalUsers,
      aggregateCoinBalance: totalCoinBalance,
      walletTransactionCount: walletTxCount,
      totalCredits: totalCredits,
      totalDebits: totalDebits,
      rewardTransactionCount: rewardCount,
      totalRewardCoinsDistributed: totalRewardCoins,
      // V2: Use PromotionFuel instead of RewardPool
      totalPromotionFuel: totalPromotionFuel,
      // V2: Use CoinsConsumed instead of CoinsSpent
      totalCoinsConsumed: totalCoinsConsumed,
      // V2: Use RemainingFuel instead of RemainingRewardCoins
      totalRemainingFuel: totalRemainingFuel,
      // Legacy aliases for backward compatibility
      totalRewardPool: totalPromotionFuel,
      totalCoinsSpent: totalCoinsConsumed,
      totalRemainingRewardCoins: totalRemainingFuel,
      activeCampaignCount: activeCampaigns,
      totalCampaigns: campaignData.length
    }, "Economy Summary Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET EXPLORER
 * Search wallets by UserID, WalletID, name, mobile
 * ?action=adminwalletexplorer&session=TOKEN&search=TERM&page=1&limit=50
 * ============================================================
 */
function getAdminWalletExplorer(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    const walletData = getSheetData("Wallet");
    const usersData = getSheetData(CONFIG.SHEETS.USERS);
    const walletTxData = getSheetData("WalletTransactions");
    const rewardData = getSheetData("AdRewardHistory");

    // Build user lookup map
    const userMap = {};
    usersData.forEach(function(u) {
      userMap[u.UserID] = u;
    });

    // Build transaction count per wallet
    const txCountMap = {};
    const lastTxDateMap = {};
    walletTxData.forEach(function(tx) {
      const wid = tx.WalletID;
      if (wid) {
        txCountMap[wid] = (txCountMap[wid] || 0) + 1;
        const d = tx.CreatedDate || tx.CreatedAt;
        if (d && (!lastTxDateMap[wid] || new Date(d) > new Date(lastTxDateMap[wid]))) {
          lastTxDateMap[wid] = d;
        }
      }
    });

    // Build reward count per user
    const rewardCountMap = {};
    rewardData.forEach(function(r) {
      const uid = r.UserID;
      if (uid) {
        rewardCountMap[uid] = (rewardCountMap[uid] || 0) + 1;
      }
    });

    // Build enriched wallet list
    let enriched = walletData.map(function(w) {
      const user = userMap[w.UserID] || {};
      return {
        WalletID: w.WalletID || "",
        UserID: w.UserID || "",
        UserName: user.FullName || user.Name || "",
        Mobile: user.Mobile || "",
        Balance: Number(w.Balance || 0),
        TotalEarned: Number(w.TotalEarned || 0),
        TotalSpent: Number(w.TotalSpent || 0),
        LastUpdated: w.LastUpdated || "",
        TransactionCount: txCountMap[w.WalletID] || 0,
        RewardCount: rewardCountMap[w.UserID] || 0,
        LastTransactionDate: lastTxDateMap[w.WalletID] || ""
      };
    });

    // Apply search filter
    if (search) {
      enriched = enriched.filter(function(w) {
        return (w.WalletID || "").toLowerCase().indexOf(search) !== -1 ||
               (w.UserID || "").toLowerCase().indexOf(search) !== -1 ||
               (w.UserName || "").toLowerCase().indexOf(search) !== -1 ||
               (w.Mobile || "").indexOf(search) !== -1;
      });
    }

    // Sort by balance descending
    enriched.sort(function(a, b) {
      return b.Balance - a.Balance;
    });

    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = enriched.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Wallet Explorer Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET DETAIL
 * Full wallet detail for a specific user
 * ?action=adminwalletdetail&session=TOKEN&userId=U001
 * ============================================================
 */
function getAdminWalletDetail(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const userId = (e.parameter.userId || "").trim();
    if (!userId) {
      return error("userId required");
    }

    // Get wallet
    const walletData = getSheetData("Wallet");
    let wallet = null;
    walletData.forEach(function(w) {
      if (String(w.UserID) === String(userId)) {
        wallet = w;
      }
    });

    if (!wallet) {
      return error("Wallet not found for user: " + userId);
    }

    // Get user info
    const usersData = getSheetData(CONFIG.SHEETS.USERS);
    let user = null;
    usersData.forEach(function(u) {
      if (String(u.UserID) === String(userId)) {
        user = u;
      }
    });

    // Get transactions for this user
    const walletTxData = getSheetData("WalletTransactions");
    const transactions = walletTxData.filter(function(tx) {
      return String(tx.UserID) === String(userId);
    });
    // Sort by date descending
    transactions.sort(function(a, b) {
      return compareDatesDesc(
        a.CreatedDate || a.CreatedAt,
        b.CreatedDate || b.CreatedAt
      );
    });

    // Get rewards for this user
    const rewardData = getSheetData("AdRewardHistory");
    const rewards = rewardData.filter(function(r) {
      return String(r.UserID) === String(userId);
    });
    rewards.sort(function(a, b) {
      return compareDatesDesc(
        a.CreatedAt || a.LastWatchedAt,
        b.CreatedAt || b.LastWatchedAt
      );
    });

    return success({
      wallet: {
        WalletID: wallet.WalletID || "",
        UserID: wallet.UserID || "",
        Balance: Number(wallet.Balance || 0),
        TotalEarned: Number(wallet.TotalEarned || 0),
        TotalSpent: Number(wallet.TotalSpent || 0),
        LastUpdated: wallet.LastUpdated || ""
      },
      user: user ? {
        UserID: user.UserID || "",
        FullName: user.FullName || user.Name || "",
        Mobile: user.Mobile || "",
        Email: user.Email || "",
        City: user.City || "",
        Status: user.Status || ""
      } : null,
      transactions: transactions.slice(0, 50),
      rewards: rewards.slice(0, 50),
      transactionCount: transactions.length,
      rewardCount: rewards.length
    }, "Wallet Detail Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: WALLET TRANSACTIONS EXPLORER
 * Filtered transaction explorer
 * ?action=adminwallettransactions&session=TOKEN&search=TERM&type=TYPE&source=SOURCE&status=STATUS&page=1&limit=50
 * ============================================================
 */
function getAdminWalletTransactions(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const txType = (e.parameter.type || "").trim().toLowerCase();
    const source = (e.parameter.source || "").trim().toLowerCase();
    const status = (e.parameter.status || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let txData = getSheetData("WalletTransactions");

    // Apply filters
    if (search) {
      txData = txData.filter(function(tx) {
        return (tx.TransactionID || "").toLowerCase().indexOf(search) !== -1 ||
               (tx.UserID || "").toLowerCase().indexOf(search) !== -1 ||
               (tx.WalletID || "").toLowerCase().indexOf(search) !== -1 ||
               (tx.ReferenceID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    if (txType) {
      txData = txData.filter(function(tx) {
        return (tx.Type || "").toLowerCase() === txType;
      });
    }

    if (source) {
      txData = txData.filter(function(tx) {
        return (tx.Source || "").toLowerCase() === source;
      });
    }

    if (status) {
      txData = txData.filter(function(tx) {
        return (tx.Status || "").toLowerCase() === status;
      });
    }

    // Sort by date descending
    txData.sort(function(a, b) {
      return compareDatesDesc(
        a.CreatedDate || a.CreatedAt,
        b.CreatedDate || b.CreatedAt
      );
    });

    const total = txData.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = txData.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Wallet Transactions Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: REWARD ACTIVITY
 * Read-only reward activity view
 * ?action=adminrewardactivity&session=TOKEN&search=TERM&page=1&limit=50
 * ============================================================
 */
function getAdminRewardActivity(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let rewardData = getSheetData("AdRewardHistory");

    // Apply search filter
    if (search) {
      rewardData = rewardData.filter(function(r) {
        return (r.RewardID || "").toLowerCase().indexOf(search) !== -1 ||
               (r.UserID || "").toLowerCase().indexOf(search) !== -1 ||
               (r.AdID || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    // Sort by date descending
    rewardData.sort(function(a, b) {
      return compareDatesDesc(
        a.CreatedAt || a.LastWatchedAt,
        b.CreatedAt || b.LastWatchedAt
      );
    });

    const total = rewardData.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = rewardData.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "Reward Activity Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADMIN: CAMPAIGN ECONOMY
 * Read-only campaign economy visibility
 * ?action=admincampaigneconomy&session=TOKEN&search=TERM&page=1&limit=50
 * PROMOTION ECONOMY V2 - Uses new fuel economy fields
 * ============================================================
 */
function getAdminCampaignEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    let campaignData = getSheetData("PromotionCampaigns");

    // Apply search filter
    if (search) {
      campaignData = campaignData.filter(function(c) {
        return (c.CampaignID || "").toLowerCase().indexOf(search) !== -1 ||
               (c.OwnerUserID || "").toLowerCase().indexOf(search) !== -1 ||
               (c.CampaignType || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    // Sort by created date descending
    campaignData.sort(function(a, b) {
      return compareDatesDesc(
        a.CreatedDate,
        b.CreatedDate
      );
    });

    const total = campaignData.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = campaignData.slice(start, start + limit);

    // Enrich with calculated fields - PROMOTION ECONOMY V2
    const enriched = paged.map(function(c) {
      // Normalize to V2
      c = normalizeCampaignForAdmin(c);
      
      const coinsConsumed = Number(c.CoinsConsumed || 0);
      const promotionFuel = Number(c.PromotionFuel || 0);
      const remainingFuel = Number(c.RemainingFuel || 0);
      const fuelUsed = promotionFuel - remainingFuel;
      
      return {
        CampaignID: c.CampaignID || "",
        CampaignType: c.CampaignType || "",
        OwnerUserID: c.OwnerUserID || "",
        // V2 fields
        CoinsConsumed: coinsConsumed,
        PromotionFuel: promotionFuel,
        RemainingFuel: remainingFuel,
        RewardRatePerSecond: Number(c.RewardRatePerSecond || 0),
        EstimatedViewSeconds: Number(c.EstimatedViewSeconds || 0),
        EstimatedViews: Number(c.EstimatedViews || 0),
        RewardCoins: Number(c.RewardCoins || 0),
        // Legacy aliases for backward compatibility
        CoinsSpent: coinsConsumed,
        RewardPool: promotionFuel,
        RemainingRewardCoins: remainingFuel,
        RewardPoolUsed: Math.max(0, fuelUsed),
        Views: Number(c.Views || 0),
        Clicks: Number(c.Clicks || 0),
        Status: String(c.Status || ""),
        StartDate: c.StartDate || "",
        EndDate: c.EndDate || "",
        CreatedDate: c.CreatedDate || "",
        City: c.City || "",
        State: c.State || "",
        Country: c.Country || ""
      };
    });

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: enriched
    }, "Campaign Economy Loaded");

  } catch (err) {
    return exception(err);
  }
}