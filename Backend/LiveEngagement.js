function likeLive(e) {
  return saveReaction(e, "LIKE");
}

function dislikeLive(e) {
  return saveReaction(e, "DISLIKE");
}

function saveReaction(e, type) {
  const userId = e.parameter.userId;
  const liveId = e.parameter.liveId;

  if (!userId || !liveId) {
    return error("userId and liveId required");
  }

  const sheet = getSheet(CONFIG.SHEETS.LIVE_LIKES);

  const id = Utilities.getUuid();

  sheet.appendRow([
    id,
    userId,
    liveId,
    type,
    new Date()
  ]);

  return success({}, type + " saved");
}

function removeLiveReaction(e) {
  const userId = e.parameter.userId;
  const liveId = e.parameter.liveId;

  const sheet = getSheet(CONFIG.SHEETS.LIVE_LIKES);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (
      String(data[i][1]) === userId &&
      String(data[i][2]) === liveId
    ) {
      sheet.deleteRow(i + 1);
    }
  }

  return success({}, "Reaction removed");
}

function getLiveEngagement(e) {
  const liveId = e.parameter.liveId;

  const likes = getReactionCount(liveId, "LIKE");
  const dislikes = getReactionCount(liveId, "DISLIKE");
  const shares = getShareCount(liveId);

  return success({
    likes: likes,
    dislikes: dislikes,
    shares: shares
  });
}

function getReactionCount(liveId, type) {
  const sheet = getSheet(CONFIG.SHEETS.LIVE_LIKES);
  const data = sheet.getDataRange().getValues();

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][2]) === liveId &&
      String(data[i][3]) === type
    ) {
      count++;
    }
  }

  return count;
}

function shareLive(e) {
  const userId = e.parameter.userId;
  const liveId = e.parameter.liveId;
  const platform =
    e.parameter.platform || "OTHER";

  const sheet = getSheet(CONFIG.SHEETS.LIVE_SHARES);

  sheet.appendRow([
    Utilities.getUuid(),
    userId,
    liveId,
    platform,
    new Date()
  ]);

  return success({}, "Share recorded");
}

function getShareCount(liveId) {
  const sheet = getSheet(CONFIG.SHEETS.LIVE_SHARES);
  const data = sheet.getDataRange().getValues();

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === liveId) {
      count++;
    }
  }

  return count;
}

function startLiveViewer(e) {
  const sheet = getSheet(CONFIG.SHEETS.LIVE_VIEWERS);

  sheet.appendRow([
    Utilities.getUuid(),
    e.parameter.userId,
    e.parameter.liveId,
    Utilities.getUuid(),
    new Date(),
    new Date(),
    true
  ]);

  return success({}, "Viewer started");
}

function pingLiveViewer(e) {
  return success({}, "Ping received");
}

function stopLiveViewer(e) {
  return success({}, "Viewer stopped");
}

function getLiveViewers(e) {
  return getConcurrentViewers(e);
}

function getConcurrentViewers(e) {
  const liveId = e.parameter.liveId;

  const sheet = getSheet(CONFIG.SHEETS.LIVE_VIEWERS);
  const data = sheet.getDataRange().getValues();

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][2]) === liveId &&
      data[i][6] === true
    ) {
      count++;
    }
  }

  return success({
    viewers: count
  });
}

