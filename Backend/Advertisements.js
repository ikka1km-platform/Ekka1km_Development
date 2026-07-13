/**
 * ============================================================
 * ADVERTISEMENTS APIs
 * V4.2.1
 * Automatic Radius Engine Enabled
 * ============================================================
 */


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

    return success(ad);

  } catch (err) {
    return exception(err);
  }
}


/**
 * ============================================================
 * PIP ADS API
 * ============================================================
 */
function getPipAds(e) {
  try {

    const ads =
      getSheetData(
        "Advertisements"
      );

    const now =
      new Date();

    const result = [];

    ads.forEach(function (ad) {

      const status =
        String(
          ad.Status || ""
        ).toLowerCase();

      const pip =
        String(
          ad.ShowInPIP || ""
        ).toLowerCase();

      const reward =
        String(
          ad.RewardEnabled || ""
        ).toLowerCase();

      const remaining =
        Number(
          ad.RemainingRewardCoins || 0
        );

      const start =
        ad.StartDate
          ? new Date(
              ad.StartDate
            )
          : null;

      const end =
        ad.EndDate
          ? new Date(
              ad.EndDate
            )
          : null;

      if (
        status === "active" &&
        pip === "yes" &&
        reward === "yes" &&
        remaining > 0 &&
        (!start ||
          start <= now) &&
        (!end ||
          end >= now)
      ) {
        result.push({
          AdID:
            ad.AdID,
          Title:
            ad.Title,
          Description:
            ad.Description,
          AdType:
            ad.AdType,
          ImageURL:
            ad.ImageURL,
          VideoURL:
            ad.VideoURL,
          ExternalURL:
            ad.ExternalURL,
          SkipAfterSeconds:
            ad.SkipAfterSeconds,
          DurationSeconds:
            ad.DurationSeconds,
          RewardType:
            ad.RewardType,
          RewardCoinsPerSecond:
            ad.RewardCoinsPerSecond,
          RewardCoinsPerView:
            ad.RewardCoinsPerView,
          ResumeRewardProgress:
            ad.ResumeRewardProgress,
          CampaignRadius:
            ad.CampaignRadius,
          Latitude:
            ad.Latitude,
          Longitude:
            ad.Longitude
        });
      }
    });

    const location =
      getLocationContext(e);

    const lat =
      location.lat;

    const lng =
      location.lng;

    const radius =
      location.radius;

    let finalResult =
      result;

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

