/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminEconomy.js
 * PHASE 5.7A - WALLET & REWARDS ADMIN VISIBILITY FOUNDATION
 * READ-ONLY economy inspection APIs for Super Admin
 * ============================================================
 */

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

    // Campaign economy
    let totalCoinsSpent = 0;
    let totalRewardPool = 0;
    let totalPlatformReserve = 0;
    let totalRemainingRewardCoins = 0;
    let activeCampaigns = 0;
    campaignData.forEach(function(c) {
      totalCoinsSpent += Number(c.CoinsSpent || 0);
      totalRewardPool += Number(c.RewardPool || 0);
      totalPlatformReserve += Number(c.PlatformReserve || 0);
      totalRemainingRewardCoins += Number(c.RemainingRewardCoins || 0);
      if (String(c.Status || "").toLowerCase() === "active") {
        activeCampaigns++;
      }
    });

    // Platform Reserve (from all campaigns)
    const platformReserve = totalPlatformReserve;

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
      totalCoinsSpent: totalCoinsSpent,
      totalRewardPool: totalRewardPool,
      totalPlatformReserve: platformReserve,
      totalRemainingRewardCoins: totalRemainingRewardCoins,
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

    // Enrich with calculated fields
    const enriched = paged.map(function(c) {
      const rewardPoolUsed = Number(c.RewardPool || 0) - Number(c.RemainingRewardCoins || 0);
      return {
        CampaignID: c.CampaignID || "",
        CampaignType: c.CampaignType || "",
        OwnerUserID: c.OwnerUserID || "",
        CoinsSpent: Number(c.CoinsSpent || 0),
        RewardPool: Number(c.RewardPool || 0),
        PlatformReserve: Number(c.PlatformReserve || 0),
        RemainingRewardCoins: Number(c.RemainingRewardCoins || 0),
        RewardCoins: Number(c.RewardCoins || 0),
        RewardPoolUsed: Math.max(0, rewardPoolUsed),
        Views: Number(c.Views || 0),
        Clicks: Number(c.Clicks || 0),
        Status: c.Status || "",
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