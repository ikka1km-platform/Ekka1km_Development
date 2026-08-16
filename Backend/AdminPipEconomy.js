/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminPipEconomy.js
 * V5.13.0 - PIP ECONOMY CONFIGURATION (Admin-controlled sub-mechanism)
 *
 * Consumes CONFIG.SHEETS.PIP_ECONOMY ("PIPEconomyConfig").
 * Storage model: a VERSIONED, SINGLE-ACTIVE shared economy.
 *   - One row per economy version.
 *   - Exactly one row may have Status = "Active" at any time.
 *   - The active row is the canonical economy consumed later by
 *     the Admin PIP engine and PCC (single source of truth).
 *
 * This module ONLY manages the configuration document. It does NOT
 * mutate wallets, reward distributions, campaign fuel, or PCC state.
 * ============================================================
 */

//============================================================
// CONSTANTS
//============================================================

var PIP_ECONOMY_SHEET = CONFIG.SHEETS.PIP_ECONOMY;

var PIP_ECONOMY_HEADERS = [
  "ConfigID",
  "Version",
  "Name",
  "Description",
  "Status",
  "BaseCoinsPerView",
  "RewardPerSecond",
  "MinWatchSeconds",
  "MaxRewardPerView",
  "DailyEarnCapPerUser",
  "CoinsInCirculation",
  "InflationRate",
  "ConfigJSON",
  "CreatedBy",
  "CreatedDate",
  "UpdatedBy",
  "UpdatedDate"
];

/**
 * ============================================================
 * ENSURE PIP ECONOMY CONFIG SHEET EXISTS
 * Creates the configured sheet with headers when missing.
 * Uses CONFIG.SHEETS.PIP_ECONOMY as the sheet identifier.
 * ============================================================
 */
function ensurePipEconomyConfigSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(PIP_ECONOMY_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(PIP_ECONOMY_SHEET);
    sheet.appendRow(PIP_ECONOMY_HEADERS);
  }

  // Ensure all headers exist (adds any missing columns safely).
  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0] : [];
  var changed = false;

  PIP_ECONOMY_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(h);
      headers.push(h);
      changed = true;
    }
  });

  if (changed) {
    Logger.log("PIP Economy config columns ensured for: " + PIP_ECONOMY_SHEET);
  }

  return sheet;
}

/**
 * ============================================================
 * READ ACTIVE PIP ECONOMY (internal, engine-consumable)
 * Returns the single active economy as a plain object, or the
 * defaults when none is configured. This is the canonical getter
 * that the Admin PIP engine and PCC will consume later.
 * ============================================================
 */
function getActivePipEconomy() {
  var rows = getSheetData(PIP_ECONOMY_SHEET);

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].Status || "").toLowerCase() === "active") {
      return normalizePipEconomy(rows[i]);
    }
  }

  return getPipEconomyDefaults();
}

/**
 * ============================================================
 * READ PIP ECONOMY BY CONFIG ID (internal)
 * ============================================================
 */
function getPipEconomyByConfigId(configId, rows) {
  rows = rows || getSheetData(PIP_ECONOMY_SHEET);

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ConfigID || "").trim() === String(configId || "").trim()) {
      return normalizePipEconomy(rows[i]);
    }
  }

  return null;
}
/**
 * ============================================================
 * SAFE NUMBER PARSER
 * Returns a finite number or the provided default.
 * ============================================================
 */
function pipToNumber(val, def) {
  var n = Number(val);
  if (val === undefined || val === null || String(val).trim() === "") {
    return def;
  }
  return isFinite(n) ? n : def;
}

/**
 * ============================================================
 * PIP ECONOMY DEFAULTS
 * Provides a stable baseline so the engine always has a usable
 * economy even when no row has been configured yet.
 * ============================================================
 */
function getPipEconomyDefaults() {
  return {
    ConfigID: "",
    Version: "1.0.0",
    Name: "Default PIP Economy",
    Description: "Default baseline economy configuration.",
    Status: "Active",
    BaseCoinsPerView: 5,
    RewardPerSecond: 1,
    MinWatchSeconds: 10,
    MaxRewardPerView: 50,
    DailyEarnCapPerUser: 100,
    CoinsInCirculation: 0,
    InflationRate: 0,
    ConfigJSON: "{}",
    CreatedBy: "SYSTEM",
    CreatedDate: "",
    UpdatedBy: "",
    UpdatedDate: ""
  };
}

/**
 * ============================================================
 * NORMALIZE PIP ECONOMY ROW
 * Ensures numeric fields are numbers and missing fields fall
 * back to defaults. Returns a safe object for consumption.
 * ============================================================
 */
function normalizePipEconomy(c) {
  if (!c) {
    return getPipEconomyDefaults();
  }

  return {
    ConfigID: c.ConfigID || "",
    Version: c.Version || "1.0.0",
    Name: c.Name || "",
    Description: c.Description || "",
    Status: c.Status || "Active",
    BaseCoinsPerView: pipToNumber(c.BaseCoinsPerView, 5),
    RewardPerSecond: pipToNumber(c.RewardPerSecond, 1),
    MinWatchSeconds: pipToNumber(c.MinWatchSeconds, 10),
    MaxRewardPerView: pipToNumber(c.MaxRewardPerView, 50),
    DailyEarnCapPerUser: pipToNumber(c.DailyEarnCapPerUser, 100),
    CoinsInCirculation: pipToNumber(c.CoinsInCirculation, 0),
    InflationRate: pipToNumber(c.InflationRate, 0),
    ConfigJSON: c.ConfigJSON || "{}",
    CreatedBy: c.CreatedBy || "SYSTEM",
    CreatedDate: c.CreatedDate || "",
    UpdatedBy: c.UpdatedBy || "",
    UpdatedDate: c.UpdatedDate || ""
  };
}

/**
 * ============================================================
 * GENERATE PIP ECONOMY CONFIG ID
 * Short unique identifier for a config version row.
 * ============================================================
 */
function generatePipEconomyId() {
  return "EC" + Utilities.getUuid().substring(0, 8).toUpperCase();
}

/**
 * ============================================================
 * BUILD UPDATES OBJECT FROM REQUEST PARAMETERS
 * Maps optional query params to the config columns, applying
 * numeric coercion for numeric fields. Unrecognized params are
 * ignored so callers cannot inject arbitrary columns.
 * ============================================================
 */
function buildPipEconomyUpdates(p) {
  var updates = {};

  var numericFields = [
    "BaseCoinsPerView",
    "RewardPerSecond",
    "MinWatchSeconds",
    "MaxRewardPerView",
    "DailyEarnCapPerUser",
    "CoinsInCirculation",
    "InflationRate"
  ];

  var scalarFields = ["Name", "Description", "ConfigJSON"];

  numericFields.forEach(function (f) {
    if (p[f] !== undefined && String(p[f]).trim() !== "") {
      updates[f] = Number(p[f]);
    }
  });

  scalarFields.forEach(function (f) {
    if (p[f] !== undefined) {
      updates[f] = p[f];
    }
    });

  return updates;
}

/**
 * ============================================================
 * SET SINGLE-ACTIVE INVARIANT
 * Ensures at most one active row in the config sheet.
 * Any row other than excludeConfigId that has Status="Active"
 * is downgraded to "Archived".
 * ============================================================
 */
function enforceSingleActivePipEconomy(excludeConfigId) {
  var sheet = getSheet(PIP_ECONOMY_SHEET);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var headers = data.length > 0 ? data[0] : [];
  var statusCol = headers.indexOf("Status");
  var idCol = headers.indexOf("ConfigID");

  if (statusCol === -1 || idCol === -1) return;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol] || "").trim() === String(excludeConfigId || "").trim()) {
      continue;
    }
    if (String(data[r][statusCol] || "").toLowerCase() === "active") {
      sheet.getRange(r + 1, statusCol + 1).setValue("Archived");
    }
  }
}

/**
 * ============================================================
  * SAFE TIMESTAMP
 * Handles Date objects, strings, numbers, null/undefined.
 * Returns a numeric timestamp (0 for invalid/missing dates).
 * Module-prefixed to avoid colliding with AdminEconomy safeTimestamp.
 * ============================================================
 */
function _pipSafeTimestamp(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  var ts = new Date(val).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * ============================================================
 * ADMIN: GET ACTIVE PIP ECONOMY
 * ?action=adminpipeconomy&session=TOKEN
 * Returns the currently active (or default) PIP economy config.
 * ============================================================
 */
function getAdminPipEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const config = getActivePipEconomy();

    return success({ config: config }, "PIP Economy Config Loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: LIST PIP ECONOMY VERSIONS
 * ?action=adminpipeconomyversions&session=TOKEN&search=TERM&page=1&limit=50
 * ============================================================
 */
function getAdminPipEconomyVersions(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const search = (e.parameter.search || "").trim().toLowerCase();
    const page = parseInt(e.parameter.page || "1");
    const limit = parseInt(e.parameter.limit || "50");

    if (isNaN(page) || page < 1) {
      return validationError("Invalid page parameter");
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return validationError("Invalid limit parameter");
    }

    const rows = getSheetData(PIP_ECONOMY_SHEET).map(normalizePipEconomy);

    let filtered = rows;
    if (search) {
      filtered = rows.filter(function (c) {
        return (c.ConfigID || "").toLowerCase().indexOf(search) !== -1 ||
               (c.Name || "").toLowerCase().indexOf(search) !== -1 ||
               (c.Version || "").toLowerCase().indexOf(search) !== -1;
      });
    }

    // Newest versions first
    filtered.sort(function (a, b) {
            return _pipSafeTimestamp(b.CreatedDate) - _pipSafeTimestamp(a.CreatedDate);
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return success({
      count: total,
      totalPages: totalPages,
      page: page,
      limit: limit,
      data: paged
    }, "PIP Economy Versions Loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: CREATE PIP ECONOMY VERSION
 * ?action=adminpipeconomycreate&session=TOKEN&version=...&name=...
 *   &baseCoinsPerView=...&rewardPerSecond=...&...
 * A new version is created with Status="Draft" by default. Pass
 * status=active to immediately make it the live economy (all
 * other active rows are archived via the single-active invariant).
 * ============================================================
 */
function createAdminPipEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const p = e.parameter;
    const version = (p.version || "").trim();
    if (!version) {
      return validationError("Version is required");
    }

    const sheet = ensurePipEconomyConfigSheet();
    const createdDate = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_TIME_FORMAT);

    const data = sheet.getDataRange().getValues();
    const headers = data.length > 0 ? data[0] : PIP_ECONOMY_HEADERS;

    const newConfig = normalizePipEconomy({});
    newConfig.ConfigID = generatePipEconomyId();
    newConfig.Version = version;
    newConfig.Name = (p.name || "").trim();
    newConfig.Description = (p.description || "").trim();
    newConfig.Status = p.status ? String(p.status).trim() : "Draft";
    newConfig.CreatedBy = sessionResult.adminId || "SYSTEM";
    newConfig.CreatedDate = createdDate;
    newConfig.UpdatedBy = sessionResult.adminId || "";
    newConfig.UpdatedDate = createdDate;

    const overrides = buildPipEconomyUpdates(p);
    for (const k in overrides) {
      newConfig[k] = overrides[k];
    }

    if (String(newConfig.Status).toLowerCase() === "active") {
      newConfig.Status = "Active";
    }

    var row = [];
    headers.forEach(function (h) {
      row.push(newConfig[h] === undefined ? "" : newConfig[h]);
    });

    sheet.appendRow(row);

    if (String(newConfig.Status).toLowerCase() === "active") {
      enforceSingleActivePipEconomy(newConfig.ConfigID);
    }

    return created({
      config: normalizePipEconomy(newConfig),
      action: "Created"
    }, "PIP Economy version created");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: UPDATE PIP ECONOMY VERSION (PATCH)
 * ?action=adminpipeconomyupdate&session=TOKEN&configId=ECxxxx
 * Only supplied fields are written to the row. Status transitions
 * must use the activate/deactivate actions.
 * ============================================================
 */
function updateAdminPipEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const configId = (e.parameter.configId || "").trim();
    if (!configId) {
      return validationError("configId is required");
    }

    const p = e.parameter;
    const updates = buildPipEconomyUpdates(p);

    if (p.name !== undefined) updates.Name = p.name;
    if (p.description !== undefined) updates.Description = p.description;
    if (p.configJSON !== undefined) updates.ConfigJSON = p.configJSON;

    if (Object.keys(updates).length === 0) {
      return validationError("No updatable fields supplied");
    }

    updates.UpdatedBy = sessionResult.adminId || "";
        updates.UpdatedDate = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_TIME_FORMAT);

    const ok = updateRow(PIP_ECONOMY_SHEET, "ConfigID", configId, updates);

    if (!ok) {
      return notFound("PIP Economy version");
    }

    const updatedConfig = getPipEconomyByConfigId(configId);
    return updated(updatedConfig, "PIP Economy version updated");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: ACTIVATE PIP ECONOMY VERSION
 * ?action=adminpipeconomyactivate&session=TOKEN&configId=ECxxxx
 * Enforces single-active invariant: all other active rows are
 * archived, then this row becomes the single Active economy.
 * ============================================================
 */
function activateAdminPipEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const configId = (e.parameter.configId || "").trim();
    if (!configId) {
      return validationError("configId is required");
    }

    const rows = getSheetData(PIP_ECONOMY_SHEET);
    const existing = getPipEconomyByConfigId(configId, rows);

    if (!existing) {
      return notFound("PIP Economy version");
    }

    // Archive every other active row first
    enforceSingleActivePipEconomy(configId);

    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_TIME_FORMAT);
    const updates = {
      Status: "Active",
      UpdatedBy: sessionResult.adminId || "",
      UpdatedDate: now
    };

    const ok = updateRow(PIP_ECONOMY_SHEET, "ConfigID", configId, updates);
    if (!ok) {
      return exception("Failed to activate PIP Economy version");
    }

        const updatedConfig = getPipEconomyByConfigId(configId);
    return updated(updatedConfig, "PIP Economy version activated");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ============================================================
 * ADMIN: DEACTIVATE PIP ECONOMY VERSION
 * ?action=adminpipeconomydeactivate&session=TOKEN&configId=ECxxxx
 * Archives an Active version so it no longer serves as the live
 * economy. getActivePipEconomy() falls back to defaults when no
 * active row exists.
 * ============================================================
 */
function deactivateAdminPipEconomy(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const configId = (e.parameter.configId || "").trim();
    if (!configId) {
      return validationError("configId is required");
    }

    const rows = getSheetData(PIP_ECONOMY_SHEET);
    const existing = getPipEconomyByConfigId(configId, rows);

    if (!existing) {
      return notFound("PIP Economy version");
    }

    if (String(existing.Status).toLowerCase() !== "active") {
      return error("PIP Economy version is not active");
    }

    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_TIME_FORMAT);
    const updates = {
      Status: "Archived",
      UpdatedBy: sessionResult.adminId || "",
      UpdatedDate: now
    };

    const ok = updateRow(PIP_ECONOMY_SHEET, "ConfigID", configId, updates);
    if (!ok) {
      return exception("Failed to deactivate PIP Economy version");
    }

    return success({ configId: configId, Status: "Archived" }, "PIP Economy version deactivated");
  } catch (err) {
    return exception(err);
  }
}