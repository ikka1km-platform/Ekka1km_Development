/**
 * ============================================================
 * ADVERTISEMENTS APIs
 * V4.3 - Promotion Economy V2 Integration
 * Consumes Promotion Engine V2 (Promotion.js)
 * No duplicated economy logic
 * ============================================================
 */


/**
 * ============================================================
 * NORMALIZE ADVERTISEMENT - Promotion Economy V2
 * Maps legacy Reward Economy fields to new PromotionFuel economy
 * Provides backward compatibility for existing ad records
 * ============================================================
 */
function normalizeAd(ad) {
  if (!ad) return ad;

  // ============================================================
  // LEGACY TO V2 FIELD MAPPING
  // ============================================================

  // RewardRatePerSecond (V2) - from legacy RewardCoinsPerSecond
  if (!ad.RewardRatePerSecond && ad.RewardCoinsPerSecond) {
    ad.RewardRatePerSecond = Number(ad.RewardCoinsPerSecond);
  }

  // RemainingFuel (V2) - from legacy RemainingRewardCoins
  if (ad.RemainingFuel === undefined && ad.RemainingRewardCoins !== undefined) {
    ad.RemainingFuel = Number(ad.RemainingRewardCoins || 0);
  }

  // PromotionFuel (V2) - from legacy RewardPool or CampaignBudget
  if (!ad.PromotionFuel) {
    ad.PromotionFuel = Number(ad.RewardPool || ad.CampaignBudget || 0);
  }

  // CoinsConsumed (V2) - from legacy CoinsSpent
  if (!ad.CoinsConsumed) {
    ad.CoinsConsumed = Number(ad.CoinsSpent || 0);
  }

  // RewardCoins (V2) - from legacy RewardCoinsPerView or RemainingRewardCoins
  if (!ad.RewardCoins) {
    ad.RewardCoins = Number(ad.RewardCoinsPerView || ad.RemainingRewardCoins || ad.RewardPool || 5);
  }

  // Duration (V2) - from legacy DurationSeconds
  if (!ad.Duration && ad.DurationSeconds) {
    ad.Duration = Number(ad.DurationSeconds);
  }
  if (!ad.Duration) ad.Duration = 10;

  // ============================================================
  // CALCULATED V2 FIELDS
  // ============================================================

  // RewardRatePerSecond - calculate if missing
  if (!ad.RewardRatePerSecond) {
    ad.RewardRatePerSecond = Math.max(1, Math.round((Number(ad.RewardCoins || 5) / Number(ad.Duration)) * 100) / 100);
  }

  // EstimatedViewSeconds - calculate: PromotionFuel / RewardRatePerSecond
  if (!ad.EstimatedViewSeconds) {
    var fuel = Number(ad.PromotionFuel || ad.RemainingFuel || 0);
    var rate = Number(ad.RewardRatePerSecond || 1);
    ad.EstimatedViewSeconds = rate > 0 ? Math.floor(fuel / rate) : 0;
  }

  // EstimatedViews - calculate: EstimatedViewSeconds / Duration
  if (!ad.EstimatedViews) {
    var estSec = Number(ad.EstimatedViewSeconds || 0);
    var dur = Number(ad.Duration || 10);
    ad.EstimatedViews = dur > 0 ? Math.floor(estSec / dur) : 0;
  }

  // ============================================================
  // LEGACY ALIASES (for backward compatibility in responses)
  // ============================================================

  if (!ad.RemainingRewardCoins) ad.RemainingRewardCoins = Number(ad.RemainingFuel || 0);
  if (!ad.CampaignBudget) ad.CampaignBudget = Number(ad.PromotionFuel || 0);
  if (!ad.RewardPool) ad.RewardPool = Number(ad.PromotionFuel || 0);
  if (!ad.RewardCoinsPerSecond && ad.RewardRatePerSecond) ad.RewardCoinsPerSecond = Number(ad.RewardRatePerSecond);
  if (!ad.RewardCoinsPerView && ad.RewardCoins) ad.RewardCoinsPerView = Number(ad.RewardCoins);

  return ad;
}


/**
 * ============================================================
 * GET ALL ADVERTISEMENTS
 * URL:
 * ?action=advertisements
 * ?action=advertisements&lat=26.9124&lng=75.7873&radius=51
 * ?action=advertisements&userId=U001
 * ============================================================
 */
function getAdvertisements(e) {
  try {

    let ads =
      getSheetData("Advertisements");

    const location =
      getLocationContext(e);

    const lat =
      location.lat;

    const lng =
      location.lng;

    const radius =
      location.radius;

    if (
      lat &&
      lng &&
      radius
    ) {
      ads = filterByRadius(
        ads,
        lat,
        lng,
        radius
      );
    }

    // Normalize ads for Promotion Economy V2
    ads = ads.map(normalizeAd);

    return success({
      sheet: "Advertisements",
      count: ads.length,
      data: ads
    }, "Advertisements Loaded");

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET SINGLE ADVERTISEMENT
 * ============================================================
 */
function getAdvertisement(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error("AdID required");
    }

    const ads =
      getSheetData("Advertisements");

    const ad =
      ads.find(function (a) {
        return String(a.AdID) === String(id);
      });

    if (!ad) {
      return error(
        "Advertisement not found"
      );
    }

    // Normalize for Promotion Economy V2
    const normalizedAd = normalizeAd(ad);

    return success(normalizedAd);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * GET PIP ADS API
 * Promotion Engine V2 - Delegates to getPipQueue()
 * URL: ?action=pipads (legacy support) or ?action=getpipqueue (V2)
 * Uses Promotion Engine V2 fuel economy
 * ============================================================
 */
function getPipAds(e) {
  try {

    // Delegate to Promotion Engine V2 - no duplicated logic
    var pipResult = getPipQueue(e);
    var queue = pipResult.queue || [];

    // Map campaigns to ad format for backward compatibility
    var result = queue.map(function(campaign) {
      return {
        // Legacy ad fields
        AdID: campaign.CampaignID || "",
        Title: campaign.Title || "",
        Description: campaign.Description || "",
        AdType: campaign.AdType || "IMAGE",
        ImageURL: campaign.ImageURL || "",
        VideoURL: campaign.VideoURL || "",
        ExternalURL: campaign.ExternalURL || "",
        SkipAfterSeconds: "",
        DurationSeconds: Number(campaign.Duration || 10),
        RewardType: "Fuel",
        RewardCoinsPerSecond: Number(campaign.RewardRatePerSecond || 1),
        RewardCoinsPerView: Number(campaign.RewardCoins || 0),
        ResumeRewardProgress: campaign.RepeatRewardType !== "ONCE" ? "Yes" : "No",
        CampaignRadius: campaign.TargetRadius || campaign.CampaignRadius || "All India",
        Latitude: campaign.Latitude || "",
        Longitude: campaign.Longitude || "",

        // V2 fields
        CampaignID: campaign.CampaignID || "",
        PromotionFuel: Number(campaign.PromotionFuel || 0),
        RemainingFuel: Number(campaign.RemainingFuel || 0),
        CoinsConsumed: Number(campaign.CoinsConsumed || 0),
        RewardRatePerSecond: Number(campaign.RewardRatePerSecond || 1),
        EstimatedViewSeconds: Number(campaign.EstimatedViewSeconds || 0),
        EstimatedViews: Number(campaign.EstimatedViews || 0),

        // Creative metadata
        CreativeType: campaign.CreativeType || "IMAGE",
        CTA: campaign.CTA || "Learn More",
        DestinationType: campaign.DestinationType || "None",

        // Campaign status
        Status: campaign.Status || "Active",
        Featured: campaign.Featured || "No",
        PIPEnabled: campaign.PIPEnabled || "Yes"
      };
    });

    const location =
      getLocationContext(e);

    const lat =
      location.lat;

    const lng =
      location.lng;

    const radius =
      location.radius;

    let finalResult = result;

    if (
      lat &&
      lng &&
      radius
    ) {
      finalResult =
        filterByRadius(
          result,
          lat,
          lng,
          radius
        );
    }

    return success(
      finalResult
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * ADD ADVERTISEMENT
 * Supports Promotion Economy V2 fields
 * ============================================================
 */
function addAdvertisement(e) {
  try {

    const p =
      e.parameter;

    const sheet =
      getSheet(
        "Advertisements"
      );

    const adId =
      "AD" +
      Utilities.getUuid()
        .substring(0, 8);

    const headers =
      sheet
        .getDataRange()
        .getValues()[0];

    const row =
      headers.map(
        function (header) {

          switch (
            header
          ) {
            case "AdID":
              return adId;

            case "Views":
              return 0;

            case "Clicks":
              return 0;

            case "RewardCoinsDistributed":
              return 0;

            case "CreatedDate":
              return new Date();

            case "Status":
              return (
                p.Status ||
                "Active"
              );

            // ============================================================
            // PROMOTION ECONOMY V2 FIELDS
            // ============================================================
            case "PromotionFuel":
              return Number(p.PromotionFuel || p.RewardPool || p.CampaignBudget || 0);

            case "RemainingFuel":
              return Number(p.RemainingFuel || p.RemainingRewardCoins || p.PromotionFuel || 0);

            case "CoinsConsumed":
              return 0;

            case "RewardRatePerSecond":
              var dur = Number(p.DurationSeconds || p.Duration || 10);
              var rc = Number(p.RewardCoins || p.RewardCoinsPerView || 5);
              return dur > 0 ? Math.round((rc / dur) * 100) / 100 : 1;

            case "EstimatedViewSeconds":
              var fuel = Number(p.PromotionFuel || p.RewardPool || 0);
              var rate = Number(p.RewardRatePerSecond || 1);
              return rate > 0 ? Math.floor(fuel / rate) : 0;

            case "EstimatedViews":
              var estSec = Number(p.EstimatedViewSeconds || 0);
              var d = Number(p.DurationSeconds || p.Duration || 10);
              return d > 0 ? Math.floor(estSec / d) : 0;

            default:
              return (
                p[header] ||
                ""
              );
          }
        }
      );

    sheet.appendRow(
      row
    );

    return success(
      {
        AdID: adId
      },
      "Advertisement added successfully"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * UPDATE ADVERTISEMENT
 * Recalculates V2 derived fields when relevant fields change
 * ============================================================
 */
function updateAdvertisement(e) {
  try {

    const p =
      e.parameter;

    const id =
      p.AdID || "";

    if (!id) {
      return error(
        "AdID required"
      );
    }

    const sheet =
      getSheet(
        "Advertisements"
      );

    const data =
      sheet
        .getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {
      if (
        String(
          data[i][0]
        ) === String(id)
      ) {

        const headers =
          data[0];

        // Update direct fields
        for (
          let j = 0;
          j <
          headers.length;
          j++
        ) {
          const key =
            headers[j];

          if (
            p[key] !==
              undefined &&
            p[key] !== ""
          ) {
            sheet
              .getRange(
                i + 1,
                j + 1
              )
              .setValue(
                p[key]
              );
          }
        }

        // ============================================================
        // PROMOTION ECONOMY V2: Recalculate derived fields
        // ============================================================
        if (p.RewardCoins || p.DurationSeconds || p.Duration || p.PromotionFuel ||
            p.RewardCoinsPerView || p.RewardPool) {
          var currentRow = data[i];

          // Get current values or use provided values
          var rewardCoins = Number(
            p.RewardCoins || p.RewardCoinsPerView ||
            currentRow[headers.indexOf("RewardCoins")] ||
            currentRow[headers.indexOf("RewardCoinsPerView")] || 5
          );
          var duration = Number(
            p.DurationSeconds || p.Duration ||
            currentRow[headers.indexOf("DurationSeconds")] ||
            currentRow[headers.indexOf("Duration")] || 10
          );
          var promotionFuel = Number(
            p.PromotionFuel || p.RewardPool ||
            currentRow[headers.indexOf("PromotionFuel")] ||
            currentRow[headers.indexOf("RewardPool")] || 0
          );

          // Calculate V2 derived fields
          var rewardRatePerSecond = duration > 0 ? Math.round((rewardCoins / duration) * 100) / 100 : 1;
          var estimatedViewSeconds = rewardRatePerSecond > 0 ? Math.floor(promotionFuel / rewardRatePerSecond) : 0;
          var estimatedViews = duration > 0 ? Math.floor(estimatedViewSeconds / duration) : 0;

          // Update columns if they exist
          var rateIdx = headers.indexOf("RewardRatePerSecond");
          var estSecIdx = headers.indexOf("EstimatedViewSeconds");
          var estViewsIdx = headers.indexOf("EstimatedViews");

          if (rateIdx >= 0) sheet.getRange(i + 1, rateIdx + 1).setValue(rewardRatePerSecond);
          if (estSecIdx >= 0) sheet.getRange(i + 1, estSecIdx + 1).setValue(estimatedViewSeconds);
          if (estViewsIdx >= 0) sheet.getRange(i + 1, estViewsIdx + 1).setValue(estimatedViews);
        }

        return success(
          {},
          "Advertisement updated successfully"
        );
      }
    }

    return error(
      "Advertisement not found"
    );

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * DELETE ADVERTISEMENT
 * ============================================================
 */
function deleteAdvertisement(e) {
  try {

    const id =
      e.parameter.id || "";

    if (!id) {
      return error(
        "AdID required"
      );
    }

    const sheet =
      getSheet(
        "Advertisements"
      );

    const data =
      sheet
        .getDataRange()
        .getValues();

    for (
      let i = 1;
      i < data.length;
      i++
    ) {
      if (
        String(
          data[i][0]
        ) === String(id)
      ) {

        sheet.deleteRow(
          i + 1
        );

        return success(
          {},
          "Advertisement deleted successfully"
        );
      }
    }

    return error(
      "Advertisement not found"
    );

  } catch (err) {
    return exception(err);
  }
}