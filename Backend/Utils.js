/**
 * ============================================================
 * SHEET HELPERS
 * ============================================================
 */

function getSheetData(sheetName) {

  const sheet =
    getSheet(sheetName);

  if (!sheet) {
    return [];
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  if (
    values.length === 0
  ) {
    return [];
  }

  const headers =
    values[0];

  const data = [];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    const row = {};

    for (
      let j = 0;
      j < headers.length;
      j++
    ) {
      row[
        headers[j]
      ] = values[i][j];
    }

    data.push(row);
  }

  return data;
}


/**
 * ============================================================
 * GET SINGLE ROW BY ID
 * ============================================================
 */

function getRowById(
  sheetName,
  idColumn,
  idValue
) {
  const data =
    getSheetData(sheetName);

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    if (
      String(
        data[i][idColumn]
      ) === String(idValue)
    ) {
      return data[i];
    }
  }

  return null;
}


/**
 * ============================================================
 * UPDATE ROW
 * ============================================================
 */

function updateRow(
  sheetName,
  idColumn,
  idValue,
  updates
) {
  const sheet =
    getSheet(sheetName);

  if (!sheet) {
    return false;
  }

  const values =
    sheet
      .getDataRange()
      .getValues();

  if (
    values.length === 0
  ) {
    return false;
  }

  const headers =
    values[0];

  const idCol =
    headers.indexOf(
      idColumn
    );

  if (
    idCol === -1
  ) {
    return false;
  }

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    if (
      String(
        values[i][idCol]
      ) === String(idValue)
    ) {

      for (
        const key in updates
      ) {

        const col =
          headers.indexOf(
            key
          );

        if (
          col !== -1
        ) {
          sheet
            .getRange(
              i + 1,
              col + 1
            )
            .setValue(
              updates[key]
            );
        }
      }

      return true;
    }
  }

  return false;
}

