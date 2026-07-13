function sendLiveMessage(e) {
  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_CHAT);

  sheet.appendRow([
    Utilities.getUuid(),
    e.parameter.liveId,
    e.parameter.userId,
    e.parameter.message,
    false,
    false,
    new Date()
  ]);

  return success({}, "Message sent");
}

function deleteLiveMessage(e) {
  const id = e.parameter.messageId;

  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_CHAT);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 5)
        .setValue(true);
      break;
    }
  }

  return success({}, "Message deleted");
}

function pinLiveMessage(e) {
  return setPin(e, true);
}

function unpinLiveMessage(e) {
  return setPin(e, false);
}

function setPin(e, value) {
  const id = e.parameter.messageId;

  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_CHAT);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 6)
        .setValue(value);
      break;
    }
  }

  return success({}, "Updated");
}

function getLiveChat(e) {
  const liveId = e.parameter.liveId;

  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_CHAT);

  const data = sheet.getDataRange().getValues();

  const result = [];

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1]) === liveId &&
      data[i][4] !== true
    ) {
      result.push({
        messageId: data[i][0],
        userId: data[i][2],
        message: data[i][3],
        isPinned: data[i][5],
        createdAt: data[i][6]
      });
    }
  }

  return success(result);
}

function addLiveModerator(e) {
  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_MODERATORS);

  sheet.appendRow([
    Utilities.getUuid(),
    e.parameter.userId,
    e.parameter.liveId,
    new Date()
  ]);

  return success({}, "Moderator added");
}

function removeLiveModerator(e) {
  return success({}, "Moderator removed");
}

function getLiveModerators(e) {
  const liveId = e.parameter.liveId;

  const sheet =
    getSheet(CONFIG.SHEETS.LIVE_MODERATORS);

  const data = sheet.getDataRange().getValues();

  const result = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === liveId) {
      result.push({
        moderatorId: data[i][0],
        userId: data[i][1]
      });
    }
  }

  return success(result);
}

