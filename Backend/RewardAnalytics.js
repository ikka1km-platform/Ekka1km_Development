/**
 * ============================================================
 * Reward Analytics V4.2.3
 * ============================================================
 */

function getRewardStats(e) {
  try {
    const rewards = getSheetData("AdRewardHistory");
    const ads = getSheetData("Advertisements");

    let totalCoins = 0;
    let totalRewards = rewards.length;

    const users = {};
    const rewardedAds = {};

    rewards.forEach(function (r) {
      const coins = Number(r.CoinsEarned || 0);

      totalCoins += coins;

      if (r.UserID) {
        users[r.UserID] = true;
      }

      if (r.AdID) {
        rewardedAds[r.AdID] = true;
      }
    });

    return success({
      totalCoinsDistributed: totalCoins,
      totalRewardsGiven: totalRewards,
      totalRewardedUsers: Object.keys(users).length,
      totalRewardedAds: Object.keys(rewardedAds).length,
      totalAdvertisements: ads.length
    });

  } catch (err) {
    return exception(err);
  }
}


function getUserRewardStats(e) {
  try {
    const userId = e.parameter.userId || "";

    if (!userId) {
      return error("userId required");
    }

    const rewards = getSheetData("AdRewardHistory");

    let totalCoins = 0;
    let rewardCount = 0;
    const ads = {};

    rewards.forEach(function (r) {
      if (String(r.UserID) === String(userId)) {
        rewardCount++;
        totalCoins += Number(r.CoinsEarned || 0);

        if (r.AdID) {
          ads[r.AdID] = true;
        }
      }
    });

    return success({
      userId: userId,
      totalCoins: totalCoins,
      rewardCount: rewardCount,
      adsWatched: Object.keys(ads).length
    });

  } catch (err) {
    return exception(err);
  }
}


function getAdRewardStats(e) {
  try {
    const adId = e.parameter.adId || "";

    if (!adId) {
      return error("adId required");
    }

    const rewards = getSheetData("AdRewardHistory");
    const ad = getRowById(
      "Advertisements",
      "AdID",
      adId
    );

    let coins = 0;
    let rewardCount = 0;
    const users = {};

    rewards.forEach(function (r) {
      if (String(r.AdID) === String(adId)) {
        rewardCount++;
        coins += Number(r.CoinsEarned || 0);

        if (r.UserID) {
          users[r.UserID] = true;
        }
      }
    });

    return success({
      adId: adId,
      coinsDistributed: coins,
      usersRewarded: Object.keys(users).length,
      rewardCount: rewardCount,
      remainingPool: ad
        ? Number(ad.RemainingRewardCoins || 0)
        : 0
    });

  } catch (err) {
    return exception(err);
  }
}


function getTopRewardedUsers(e) {
  try {
    const rewards = getSheetData(
      "AdRewardHistory"
    );

    const map = {};

    rewards.forEach(function (r) {
      const userId = r.UserID;

      if (!userId) return;

      if (!map[userId]) {
        map[userId] = 0;
      }

      map[userId] += Number(
        r.CoinsEarned || 0
      );
    });

    const result = [];

    for (const k in map) {
      result.push({
        userId: k,
        coins: map[k]
      });
    }

    result.sort(function (a, b) {
      return b.coins - a.coins;
    });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}


function getTopRewardedAds(e) {
  try {
    const ads =
      getSheetData("Advertisements");

    const result = [];

    ads.forEach(function (a) {
      result.push({
        adId: a.AdID,
        coins: Number(
          a.RewardCoinsDistributed || 0
        )
      });
    });

    result.sort(function (a, b) {
      return b.coins - a.coins;
    });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}


function getRewardPools(e) {
  try {
    const ads =
      getSheetData("Advertisements");

    const result = [];

    ads.forEach(function (a) {
      result.push({
        adId: a.AdID,
        remaining: Number(
          a.RemainingRewardCoins || 0
        )
      });
    });

    return success(result);

  } catch (err) {
    return exception(err);
  }
}

