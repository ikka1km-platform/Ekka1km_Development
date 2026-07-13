/**
 * ============================================================
 * Reporting & Moderation V4.7
 * ============================================================
 */

function getReports(e) {
  try {
    return success(
      getSheetData(
        "Reports"
      )
    );
  } catch (err) {
    return exception(err);
  }
}


function getReport(e) {
  try {
    const id =
      e.parameter.reportId || "";

    const row =
      getRowById(
        "Reports",
        "ReportID",
        id
      );

    if (!row) {
      return error(
        "Report not found"
      );
    }

    return success(row);

  } catch (err) {
    return exception(err);
  }
}


function addReport(e) {
  try {
    const p =
      e.parameter;

    const id =
      "RP" +
      Utilities.getUuid()
        .substring(0, 8);

    getSheet(
      "Reports"
    ).appendRow([
      id,
      p.reporterUserId || "",
      p.targetType || "",
      p.targetId || "",
      p.reason || "",
      "Open",
      new Date(),
      ""
    ]);

    return success({
      reportId: id
    });

  } catch (err) {
    return exception(err);
  }
}


function resolveReport(e) {
  try {
    updateRow(
      "Reports",
      "ReportID",
      e.parameter.reportId,
      {
        Status:
          "Resolved",
        ResolvedAt:
          new Date()
      }
    );

    return success(
      {},
      "Report resolved"
    );

  } catch (err) {
    return exception(err);
  }
}


function blockUser(e) {
  try {
    const p =
      e.parameter;

    getSheet(
      "BlockedUsers"
    ).appendRow([
      p.userId || "",
      p.reason || "",
      new Date(),
      p.blockedBy || "Admin",
      "Blocked"
    ]);

    return success(
      {},
      "User blocked"
    );

  } catch (err) {
    return exception(err);
  }
}


function unblockUser(e) {
  try {
    updateRow(
      "BlockedUsers",
      "UserID",
      e.parameter.userId,
      {
        Status:
          "Active"
      }
    );

    return success(
      {},
      "User unblocked"
    );

  } catch (err) {
    return exception(err);
  }
}

