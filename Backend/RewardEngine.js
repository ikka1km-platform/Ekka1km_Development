/**
 * ============================================================
 * Reward Engine V4.2.2 FINAL
 * ============================================================
 */

function getRewardHistory(e) {
  try {
    const sheet = getSheet("AdRewardHistory");
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return success([], "No reward history");
    }

    const headers = data[0];
    const rewards = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};

      headers.forEach(function (h, j) {
        row[h] = data[i][j];
      });

      rewards.push(row);
    }

    return success(rewards);

  } catch (err) {
    return exception(err);
  }
}


function getReward(e) {
  try {
    const adId = e.parameter.adId || "";
    const userId = e.parameter.userId || "";

    const sheet = getSheet("AdRewardHistory");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (
        String(data[i][1]) === String(adId) &&
        String(data[i][2]) === String(userId)
      ) {
        const row = {};

        headers.forEach(function (h, j) {
          row[h] = data[i][j];
        });

        return success(row);
      }
    }

    return error("Reward record not found");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UPDATE REWARD PROGRESS
 * Method 1:
 * Store total watched seconds.
 * Example:
 * 5 -> 10 -> 15 -> 20
 * ============================================================
 */

function updateRewardProgress(e) {
  try {

    const p = e.parameter;

    const adId = p.adId || "";
    const userId = p.userId || "";
    const seconds =
      Number(p.secondsWatched || 0);

    if (!adId || !userId) {
      return error(
        "adId and userId required"
      );
    }

    const sheet =
      getSheet("AdRewardHistory");

    const data =
      sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][1]) === String(adId) &&
        String(data[i][2]) === String(userId)
      ) {

        sheet.getRange(i + 1, 5)
          .setValue(seconds);

        sheet.getRange(i + 1, 8)
          .setValue(seconds);

        sheet.getRange(i + 1, 9)
          .setValue(new Date());

        return success(
          {},
          "Reward progress updated"
        );
      }
    }

    const rewardId =
      "RW" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      rewardId,
      adId,
      userId,
      "",
      seconds,
      0,
      "No",
      seconds,
      new Date(),
      new Date()
    ]);

    return success(
      {
        RewardID: rewardId
      },
      "Reward progress created"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * CLAIM REWARD
 * ============================================================
 */

function claimReward(e) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const adId =
      e.parameter.adId || "";

    const userId =
      e.parameter.userId || "";

    if (!adId || !userId) {
      return error(
        "adId and userId required"
      );
    }

    const ad =
      getRowById(
        "Advertisements",
        "AdID",
        adId
      );

    if (!ad) {
      return error(
        "Advertisement not found"
      );
    }

    if (
      String(ad.RewardEnabled)
        .toLowerCase() === "false"
    ) {
      return error(
        "Rewards disabled"
      );
    }

    const reward =
      getRewardRecord(
        adId,
        userId
      );

    if (!reward) {
      return error(
        "Reward record not found"
      );
    }

    const watched =
      Number(
        reward.LastWatchSecond || 0
      );

    const alreadyEarned =
      Number(
        reward.CoinsEarned || 0
      );

    let newCoins =
      watched - alreadyEarned;

    if (newCoins <= 0) {
      return error(
        "No reward available"
      );
    }

    let remaining =
      Number(
        ad.RemainingRewardCoins || 0
      );

    if (remaining <= 0) {

      disableAdRewards(adId);

      return error(
        "Reward pool exhausted"
      );
    }

    if (newCoins > remaining) {

      const partial =
        String(
          ad.AllowPartialReward
        ).toLowerCase();

      if (
        partial !== "true" &&
        partial !== "yes"
      ) {
        return error(
          "Insufficient reward pool"
        );
      }

      newCoins = remaining;
    }

    const walletOk =
      creditWallet(
        userId,
        newCoins,
        adId,
        "Advertisement Reward"
      );

    if (!walletOk) {
      return error(
        "Wallet not found"
      );
    }

    const totalEarned =
      alreadyEarned + newCoins;

    updateRow(
      "AdRewardHistory",
      "RewardID",
      reward.RewardID,
      {
        CoinsEarned:
          totalEarned,
        Completed:
          "Yes",
        LastWatchedAt:
          new Date()
      }
    );

    remaining =
      remaining - newCoins;

    const distributed =
      Number(
        ad.RewardCoinsDistributed || 0
      ) + newCoins;

    updateRow(
      "Advertisements",
      "AdID",
      adId,
      {
        RemainingRewardCoins:
          remaining,
        RewardCoinsDistributed:
          distributed
      }
    );

    if (remaining <= 0) {
      disableAdRewards(adId);
    }

    return success(
      {
        coinsEarned:
          newCoins,
        remainingRewardCoins:
          remaining
      },
      "Reward claimed successfully"
    );

  } catch (err) {
    return exception(err);

  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * INTERNAL FUNCTIONS
 * ============================================================
 */

function getRewardRecord(
  adId,
  userId
) {
  const rewards =
    getSheetData(
      "AdRewardHistory"
    );

  for (
    let i = 0;
    i < rewards.length;
    i++
  ) {
    if (
      String(
        rewards[i].AdID
      ) === String(adId) &&
      String(
        rewards[i].UserID
      ) === String(userId)
    ) {
      return rewards[i];
    }
  }

  return null;
}


function disableAdRewards(adId) {
  updateRow(
    "Advertisements",
    "AdID",
    adId,
    {
      RewardEnabled:
        "No",
      ShowInPIP:
        "No",
      RewardExhausted:
        "Yes",
      RewardExhaustedDate:
        new Date()
    }
  );
}

