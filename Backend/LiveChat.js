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

/**
 * ============================================================
 * GET ADMIN LIVE CHAT (Phase 5.8 - Live Moderation)
 * ?action=adminlivechat&liveId=L001&session=TOKEN
 * Returns all chat messages including deleted/moderated status
 * ============================================================
 */
function getAdminLiveChat(e) {
  try {
    const admin = requireAdminSession(e);
    if (!admin.valid) return admin.response;

    const liveId = e.parameter.liveId || "";
    if (!liveId) return error("liveId required");

    const sheet = getSheet(CONFIG.SHEETS.LIVE_CHAT);
    if (!sheet) return success([], "LiveChat sheet not found");

    const data = sheet.getDataRange().getValues();
    const result = [];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === liveId) {
        result.push({
          messageId: data[i][0],
          liveId: data[i][1],
          userId: data[i][2],
          message: data[i][3],
          isDeleted: data[i][4] === true,
          isPinned: data[i][5] === true,
          createdAt: data[i][6]
        });
      }
    }

    // Sort newest first
    result.sort(function(a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return success(result, "Live chat loaded successfully");
  } catch (err) {
    return exception(err);
  }
}

function addLiveModerator(e) {
  try {
    const p = e.parameter || {};
    const userId = p.userId || "";
    const liveId = p.liveId || "";

    if (!userId || !liveId) {
      return error("userId and liveId required");
    }

    const sheet = getSheet(CONFIG.SHEETS.LIVE_MODERATORS);
    if (!sheet) return error("LiveModerators sheet not found");

    // Check duplicate
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === userId && String(data[i][2]) === liveId) {
        return success({}, "Moderator already added");
      }
    }

    const modId = "MOD" + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet.appendRow([
      modId,
      userId,
      liveId,
      new Date()
    ]);

    return success({ moderatorId: modId }, "Moderator added");
  } catch (err) {
    return exception(err);
  }
}

function removeLiveModerator(e) {
  try {
    const p = e.parameter || {};
    const liveId = p.liveId || "";
    const userId = p.userId || "";
    const moderatorId = p.moderatorId || "";

    if (!liveId && !moderatorId) {
      return error("liveId and userId or moderatorId required");
    }

    const sheet = getSheet(CONFIG.SHEETS.LIVE_MODERATORS);
    if (!sheet) return error("LiveModerators sheet not found");

    const data = sheet.getDataRange().getValues();
    let removed = false;

    for (let i = data.length - 1; i >= 1; i--) {
      const matchById = moderatorId && String(data[i][0]) === String(moderatorId);
      const matchByUserAndLive = liveId && userId && String(data[i][1]) === String(userId) && String(data[i][2]) === String(liveId);
      if (matchById || matchByUserAndLive) {
        sheet.deleteRow(i + 1);
        removed = true;
        break;
      }
    }

    if (removed) {
      return success({}, "Moderator removed");
    }
    return error("Moderator not found");
  } catch (err) {
    return exception(err);
  }
}

function getLiveModerators(e) {
  try {
    const liveId = e.parameter.liveId || "";
    if (!liveId) return error("liveId required");

    const sheet = getSheet(CONFIG.SHEETS.LIVE_MODERATORS);
    if (!sheet) return success([], "LiveModerators sheet not found");

    const data = sheet.getDataRange().getValues();
    const result = [];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) === liveId) {
        result.push({
          moderatorId: data[i][0],
          userId: data[i][1],
          liveId: data[i][2],
          createdAt: data[i][3]
        });
      }
    }

    return success(result);
  } catch (err) {
    return exception(err);
  }
}

