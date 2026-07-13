function getRadius(e) {

  const userId =
    e.parameter.userId;

  if (!userId) {
    return error(
      "UserID required"
    );
  }

  const data =
    getSheetData(
      "UserPreferences"
    );

  const row =
    data.find(
      function (r) {
        return (
          String(
            r.UserID
          ) ===
          String(userId)
        );
      }
    );

  if (!row) {
    return error(
      "Preference not found"
    );
  }

  return success(
    row,
    "Radius Loaded"
  );
}


function setRadius(e) {

  const p =
    e.parameter;

  const userId =
    p.userId;

  if (!userId) {
    return error(
      "UserID required"
    );
  }

  const sheet =
    getSheet(
      "UserPreferences"
    );

  const values =
    sheet
      .getDataRange()
      .getValues();

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    if (
      String(
        values[i][0]
      ) ===
      String(userId)
    ) {

      sheet
        .getRange(
          i + 1,
          2
        )
        .setValue(
          p.lat || ""
        );

      sheet
        .getRange(
          i + 1,
          3
        )
        .setValue(
          p.lng || ""
        );

      sheet
        .getRange(
          i + 1,
          4
        )
        .setValue(
          p.radius ||
            ""
        );

      sheet
        .getRange(
          i + 1,
          5
        )
        .setValue(
          new Date()
        );

      return success(
        {},
        "Radius Updated"
      );
    }
  }

  sheet.appendRow([
    userId,
    p.lat || "",
    p.lng || "",
    p.radius || "",
    new Date()
  ]);

  return success(
    {},
    "Radius Saved"
  );
}

