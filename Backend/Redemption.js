/**
 * ============================================================
 * Coin Redemption V4.6
 * ============================================================
 */

function getRedemptions(e) {
  try {
    return success(
      getSheetData(
        "Redemptions"
      )
    );
  } catch (err) {
    return exception(err);
  }
}


function getRedemption(e) {
  try {
    const id =
      e.parameter.redemptionId || "";

    const row = getRowById(
      "Redemptions",
      "RedemptionID",
      id
    );

    if (!row) {
      return error(
        "Redemption not found"
      );
    }

    return success(row);

  } catch (err) {
    return exception(err);
  }
}


function createRedemption(e) {
  try {
    const p =
      e.parameter;

    const id =
      "RD" +
      Utilities.getUuid()
        .substring(0, 8);

    getSheet(
      "Redemptions"
    ).appendRow([
      id,
      p.userId || "",
      p.sellerId || "",
      p.orderId || "",
      Number(p.coins || 0),
      Number(p.amount || 0),
      "Pending",
      new Date(),
      ""
    ]);

    return success({
      redemptionId: id
    });

  } catch (err) {
    return exception(err);
  }
}


function approveRedemption(e) {
  try {
    updateRow(
      "Redemptions",
      "RedemptionID",
      e.parameter.redemptionId,
      {
        Status:
          "Approved",
        ApprovedAt:
          new Date()
      }
    );

    return success(
      {},
      "Redemption approved"
    );

  } catch (err) {
    return exception(err);
  }
}


function rejectRedemption(e) {
  try {
    updateRow(
      "Redemptions",
      "RedemptionID",
      e.parameter.redemptionId,
      {
        Status:
          "Rejected"
      }
    );

    return success(
      {},
      "Redemption rejected"
    );

  } catch (err) {
    return exception(err);
  }
}

