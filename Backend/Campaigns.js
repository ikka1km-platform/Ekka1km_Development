/**
 * ============================================================
 * Campaign Manager V4.5
 * ============================================================
 */

function getCampaigns(e) {
  try {
    return success(
      getSheetData("Campaigns")
    );
  } catch (err) {
    return exception(err);
  }
}


function getCampaign(e) {
  try {
    const id =
      e.parameter.campaignId || "";

    const row = getRowById(
      "Campaigns",
      "CampaignID",
      id
    );

    if (!row) {
      return error(
        "Campaign not found"
      );
    }

    return success(row);

  } catch (err) {
    return exception(err);
  }
}


function addCampaign(e) {
  try {
    const p =
      e.parameter;

    const sheet =
      getSheet("Campaigns");

    const id =
      "CP" +
      Utilities.getUuid()
        .substring(0, 8);

    sheet.appendRow([
      id,
      p.adId || "",
      p.campaignName || "",
      Number(p.budget || 0),
      Number(p.rewardBudget || 0),
      0,
      Number(p.budget || 0),
      p.startDate || "",
      p.endDate || "",
      "Active",
      new Date()
    ]);

    return success({
      campaignId: id
    });

  } catch (err) {
    return exception(err);
  }
}


function updateCampaign(e) {
  try {
    const p =
      e.parameter;

    updateRow(
      "Campaigns",
      "CampaignID",
      p.campaignId,
      {
        CampaignName:
          p.campaignName,
        Budget:
          p.budget,
        RewardBudget:
          p.rewardBudget,
        StartDate:
          p.startDate,
        EndDate:
          p.endDate,
        Status:
          p.status
      }
    );

    return success(
      {},
      "Campaign updated"
    );

  } catch (err) {
    return exception(err);
  }
}


function deleteCampaign(e) {
  try {
    return error(
      "Soft delete not implemented yet"
    );

  } catch (err) {
    return exception(err);
  }
}


function getCampaignStats(e) {
  try {
    const data =
      getSheetData("Campaigns");

    let active = 0;
    let paused = 0;
    let expired = 0;

    data.forEach(function (c) {

      const s =
        String(
          c.Status || ""
        ).toLowerCase();

      if (s === "active") {
        active++;
      }

      if (s === "paused") {
        paused++;
      }

      if (s === "expired") {
        expired++;
      }
    });

    return success({
      total:
        data.length,
      active:
        active,
      paused:
        paused,
      expired:
        expired
    });

  } catch (err) {
    return exception(err);
  }
}

