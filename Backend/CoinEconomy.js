/**
 * ============================================================
 * EKKA1KM BACKEND
 * CoinEconomy.js
 * INR <-> COIN CONVERSION RATE (AUTHORITATIVE PLATFORM RULE)
 *
 * A SINGLE, ADMIN-EDITABLE conversion configuration. It is the
 * authoritative platform rule for converting Indian Rupees (INR)
 * to platform Coins (and back).
 *
 *   CoinEconomySettings sheet holds BOTH values:
 *     INRAmount, CoinAmount  -> e.g. INRAmount=1, CoinAmount=2
 *
 *   The RATE is NOT stored as a single calculated ratio. The two
 *   values (inrAmount and coinAmount) are ALWAYS stored so that
 *   coinsPerINR and inrPerCoin can always be derived.
 *
 * HISTORY + SINGLE-ACTIVE
 *   On every update the previous Active row(s) are flipped to
 *   "Inactive" (history preserved, never deleted) and a NEW
 *   Active row is appended. Exactly ONE Active row exists.
 *
 * DO NOT modify PromotionPasses pricing (PriceINR/IncludedCoins)
 * and DO NOT touch the PromotionTreasury ledger. The rate is a
 *   configuration rule, NOT a treasury balance.
 *
 * SECURITY
 *   Only authorized Admin / Founder (requirePermission("Treasury"),
 *   resolved SERVER-SIDE) may mutate the rate. Public users are
 *   never allowed. Never trust role/isAdmin/permission from client.
 * ============================================================
 */

/** Live-schema headers for CoinEconomySettings. */
function COIN_ECONOMY_HEADERS() {
  return [
    "SettingID", "INRAmount", "CoinAmount", "RuleGroup", "RuleName",
    "ValueA", "ValueB", "UnitA", "UnitB", "Status", "UpdatedAt", "UpdatedBy"
  ];
}

/**
 * ENSURE COIN ECONOMY SETTINGS SHEET
 * Creates the config sheet + headers if missing. Header-order safe.
 */
function ensureCoinEconomySettingsSheet() {
  const sheet = getOrCreateSheet("CoinEconomySettings");
  ensureSheetHeaders(sheet, COIN_ECONOMY_HEADERS());
  return sheet;
}

/**
 * NORMALIZE AND VALIDATE an INR / Coin conversion (server-side).
 * Throws Error on invalid (zero/negative/non-finite). Rounds to a
 * sensible 2-decimal precision.
 * @returns {{inr:number, coin:number}}
 */
function _normalizeCoinConversionValues(inr, coin) {
  var i = Number(inr);
  var c = Number(coin);

  if (!isFinite(i) || !(i > 0)) {
    throw new Error("INRAmount must be a positive number.");
  }
  if (!isFinite(c) || !(c > 0)) {
    throw new Error("CoinAmount must be a positive number.");
  }

  // Sensible precision: at most two decimals (e.g. 0.5, 0.25)
  i = Math.round(i * 100) / 100;
  c = Math.round(c * 100) / 100;

  // Re-check AFTER rounding (e.g. 0.001 would round to 0)
  if (!(i > 0)) throw new Error("INRAmount must be greater than zero.");
  if (!(c > 0)) throw new Error("CoinAmount must be greater than zero.");

  return { inr: i, coin: c };
}

/**
 * BUILD THE CONVERSION RATE MODEL
 * Derives coinsPerINR / inrPerCoin from the two stored values.
 * Never returns zeros for the derived ratios.
 */
function buildCoinConversionRateModel(rec) {
  rec = rec || {};
  var inr = Number(rec.INRAmount || 0);
  var coin = Number(rec.CoinAmount || 0);
  if (!(inr > 0)) inr = 1;
  if (!(coin > 0)) coin = 2;

  return {
    settingId: String(rec.SettingID || "COIN_RATE"),
    inrAmount: inr,
    coinAmount: coin,
    coinsPerINR: Math.round((coin / inr) * 10000) / 10000,
    inrPerCoin: Math.round((inr / coin) * 10000) / 10000,
    status: String(rec.Status || "Active"),
    updatedAt: rec.UpdatedAt || "",
    updatedBy: rec.UpdatedBy || ""
  };
}
/**
 * GET SINGLE AUTHORITATIVE CONVERSION RATE
 * The ONE function any future pass creation/purchase logic should
 * call instead of hardcoding a conversion:
 *   getCoinConversionRate()
 * Returns { inrAmount, coinAmount, coinsPerINR, inrPerCoin, ... }.
 * Reuses the current Active row; falls back to the latest row; then
 * to a safe 1 INR = 2 Coins seed WITHOUT writing (write-on-update).
 */
function getCoinConversionRate() {
  ensureCoinEconomySettingsSheet();

  var rows = getSheetData("CoinEconomySettings");
  var active = null;
  for (var i = 0; i < rows.length; i++) {
    if (_isCoinConversionRule(rows[i]) && String(rows[i].Status || "").toUpperCase() === "ACTIVE") {
      active = rows[i];
      break;
    }
  }
  if (!active) {
    for (var j = rows.length - 1; j >= 0; j--) {
      if (_isCoinConversionRule(rows[j])) {
        active = rows[j];
        break;
      }
    }
  }
  if (!active) {
    active = { SettingID: "COIN_RATE", INRAmount: 1, CoinAmount: 2, Status: "Active" };
  }
  return buildCoinConversionRateModel(active);
}

/** A legacy conversion row has no RuleName; new rows use CoinConversion. */
function _isCoinConversionRule(row) {
  return !row.RuleName || String(row.RuleName) === "CoinConversion";
}
/**
 * INTERNAL: flip ALL Active rows to "Inactive" (history preserved).
 */
function _deactivateAllActiveCoinEconomyRows(ruleName) {
  var sheet = ensureCoinEconomySettingsSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var headers = values[0];
  var statusCol = headers.indexOf("Status");
  var ruleCol = headers.indexOf("RuleName");
  if (statusCol === -1) return;

  for (var r = 1; r < values.length; r++) {
    var isTargetRule = !ruleName ||
      (ruleCol === -1 && ruleName === "CoinConversion") ||
      String(values[r][ruleCol] || "") === ruleName ||
      (ruleName === "CoinConversion" && !values[r][ruleCol]);
    if (isTargetRule && String(values[r][statusCol] || "").toUpperCase() === "ACTIVE") {
      sheet.getRange(r + 1, statusCol + 1).setValue("Inactive");
    }
  }
}

/**
 * INTERNAL: append a CoinEconomySettings row keyed by header names.
 */
function _appendCoinEconomyRow(row) {
  var headers = COIN_ECONOMY_HEADERS();
  var sheet = ensureCoinEconomySettingsSheet();
  var out = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(row, h) ? row[h] : "";
  });
  sheet.appendRow(out);
}

/**
 * INTERNAL AUDIT - record a rate change into the EXISTING
 * ActivityLogs infrastructure (reuse, not a new audit system).
 * Captures who / when / old-value -> new-value.
 */
function _auditCoinRateChange(oldRec, newRow, adminId, when) {
  try {
    var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
    if (!activitySheet) return;

    var oldInr = Number((oldRec && oldRec.INRAmount) || 1);
    var oldCoin = Number((oldRec && oldRec.CoinAmount) || 2);
    var newInr = Number((newRow && newRow.INRAmount) || 0);
    var newCoin = Number((newRow && newRow.CoinAmount) || 0);

    activitySheet.appendRow([
      Utilities.getUuid().substring(0, 8),
      "CoinRateUpdate",
      String(adminId || ""),
      "Coin conversion rate changed: INR " + oldInr + " = " + oldCoin +
        " Coins  ->  INR " + newInr + " = " + newCoin + " Coins",
      when || new Date()
    ]);
  } catch (logErr) {
    Logger.log("Coin economy audit log error: " + logErr);
  }
}
/**
 * UPDATE THE COIN CONVERSION RATE (authoritative)
 * Server-side numeric validation, script lock, history-preserving.
 * @param {number} inrAmount - positive INR amount
 * @param {number} coinAmount - positive Coin amount
 * @param {string} adminId - who is applying the change
 * @returns {object} the NEW conversion rate model
 */
function updateCoinConversionRate(inrAmount, coinAmount, adminId) {
  // Server-side validation (throws on zero/negative/non-finite)
  var v = _normalizeCoinConversionValues(inrAmount, coinAmount);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var rows = getSheetData("CoinEconomySettings");

    // Locate current active (for history/traceability + audit "old")
    var oldRec = null;
    for (var i = 0; i < rows.length; i++) {
      if (_isCoinConversionRule(rows[i]) && String(rows[i].Status || "").toUpperCase() === "ACTIVE") {
        oldRec = rows[i];
        break;
      }
    }
    if (!oldRec) {
      for (var j = rows.length - 1; j >= 0; j--) {
        if (_isCoinConversionRule(rows[j])) {
          oldRec = rows[j];
          break;
        }
      }
    }

    // Keep ONE active: deactivate any prior Active (history preserved)
    _deactivateAllActiveCoinEconomyRows("CoinConversion");

    // Append the NEW Active configuration row (stores BOTH values)
    var now = new Date();
    var newRow = {
      SettingID: "COIN_RATE",
      INRAmount: v.inr,
      CoinAmount: v.coin,
      RuleGroup: "Coin Conversion",
      RuleName: "CoinConversion",
      ValueA: v.inr,
      ValueB: v.coin,
      UnitA: "INR",
      UnitB: "Coins",
      Status: "Active",
      UpdatedAt: now,
      UpdatedBy: String(adminId || "")
    };
    _appendCoinEconomyRow(newRow);

    // Audit into the existing ActivityLogs (who/when/old->new)
    _auditCoinRateChange(oldRec, newRow, adminId, now);

    return buildCoinConversionRateModel(newRow);
  } finally {
    lock.releaseLock();
  }
}

/**
 * ADMIN: GET CURRENT COIN CONVERSION RATE
 * ?action=admincoinrate&session=TOKEN
 * Authorization: requireAdminSession (server-side), consistent with
 * adminTreasuryOverview. Read-only.
 */
function getAdminCoinRate(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const rate = getCoinConversionRate();
    return success(rate, "Current coin conversion rate loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ADMIN: UPDATE COIN CONVERSION RATE
 * ?action=adminupdatecoinrate&session=TOKEN&inrAmount=&coinAmount=
 * Authorization: requirePermission(e, "Treasury") on the SERVER.
 * Founder bypasses by design. Never trusts client-provided claims.
 */
function updateAdminCoinRate(e) {
  try {
    const permResult = requirePermission(e, "Treasury");
    if (!permResult.valid) return permResult.response;
    const adminId = permResult.adminId;

    const inr = Number(e.parameter.inrAmount);
    const coin = Number(e.parameter.coinAmount);

    if (!isFinite(inr) || !(inr > 0)) {
      return error("INRAmount must be a positive number.");
    }
    if (!isFinite(coin) || !(coin > 0)) {
      return error("CoinAmount must be a positive number.");
    }

    const model = updateCoinConversionRate(inr, coin, adminId);
    return success(model, "Coin conversion rate updated");
  } catch (err) {
    return exception(err);
  }
}

// ============================================================================
// CENTRAL ECONOMY RULES (configuration only; no wallet/treasury side effects)
// ============================================================================

function ECONOMY_RULE_DEFINITIONS() {
  return {
    TradeMaxExchangePercent: { group: "Trade Limits", unit: "%", min: 0, max: 100 },
    TradeMaxINRValue: { group: "Trade Limits", unit: "INR", min: 0, positive: true },
    PlatformChargePercent: { group: "Platform Charges", unit: "%", min: 0, max: 100 },
    PlatformFixedCharge: { group: "Platform Charges", unit: "INR", min: 0 },
    TaxPercent: { group: "Taxes", unit: "%", min: 0, max: 100 },
    DiscountPercent: { group: "Discounts", unit: "%", min: 0, max: 100 },
    BurnPercent: { group: "Burn Rules", unit: "%", min: 0, max: 100 }
  };
}

function _getActiveEconomyRule(ruleName) {
  var rows = getSheetData("CoinEconomySettings");
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].RuleName || "") === ruleName && String(rows[i].Status || "").toUpperCase() === "ACTIVE") return rows[i];
  }
  return null;
}

function _economyRuleModel(ruleName, row) {
  var def = ECONOMY_RULE_DEFINITIONS()[ruleName];
  return {
    ruleName: ruleName,
    ruleGroup: def.group,
    value: row && row.ValueA !== "" && row.ValueA != null ? Number(row.ValueA) : null,
    unit: def.unit,
    status: row ? String(row.Status || "Active") : "NotConfigured",
    updatedAt: row ? row.UpdatedAt || "" : "",
    updatedBy: row ? row.UpdatedBy || "" : ""
  };
}

function _validateEconomyRuleValue(ruleName, value) {
  var def = ECONOMY_RULE_DEFINITIONS()[ruleName];
  var n = Number(value);
  if (!def || !isFinite(n) || n < def.min || (def.positive && !(n > 0)) || (def.max != null && n > def.max)) {
    throw new Error(ruleName + " must be " + (def && def.positive ? "greater than zero" : "between " + (def ? def.min : 0) + " and " + (def && def.max != null ? def.max : "a valid number")) + ".");
  }
  return Math.round(n * 100) / 100;
}

function _auditEconomyRuleChange(ruleName, oldRow, newRow, adminId, when) {
  try {
    var activitySheet = getSheet(CONFIG.SHEETS.ACTIVITY_LOGS);
    if (!activitySheet) return;
    var oldValue = oldRow && oldRow.ValueA !== "" ? oldRow.ValueA : "Not configured";
    activitySheet.appendRow([
      Utilities.getUuid().substring(0, 8),
      "EconomyRuleUpdate",
      String(adminId || ""),
      ruleName + " changed: " + oldValue + " -> " + newRow.ValueA + " " + newRow.UnitA,
      when
    ]);
  } catch (logErr) {
    Logger.log("Economy rule audit log error: " + logErr);
  }
}

/** Returns the central configuration plus the existing canonical pass catalog. */
function getEconomyRules() {
  ensureCoinEconomySettingsSheet();
  var defs = ECONOMY_RULE_DEFINITIONS();
  var rules = {};
  Object.keys(defs).forEach(function (ruleName) {
    rules[ruleName] = _economyRuleModel(ruleName, _getActiveEconomyRule(ruleName));
  });
  return {
    coinConversion: getCoinConversionRate(),
    promotionPassPricing: getPromotionPassCatalog().filter(function (pass) {
      return String(pass.Status || "").toUpperCase() === "ACTIVE";
    }).map(function (pass) {
      return {
        passId: pass.PassID,
        passName: pass.PassName,
        priceINR: Number(pass.PriceINR || 0),
        includedCoins: Number(pass.IncludedCoins || 0),
        allocationType: pass.AllocationType || "FIXED",
        coinAllocation: pass.coinAllocation || getPassAllocation(pass),
        updatedAt: pass.UpdatedDate || "",
        updatedBy: pass.CreatedBy || ""
      };
    }),
    rules: rules
  };
}

function updateEconomyRules(values, adminId) {
  var defs = ECONOMY_RULE_DEFINITIONS();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var changed = [];
    Object.keys(defs).forEach(function (ruleName) {
      if (!Object.prototype.hasOwnProperty.call(values, ruleName) || values[ruleName] === "") return;
      var value = _validateEconomyRuleValue(ruleName, values[ruleName]);
      var oldRow = _getActiveEconomyRule(ruleName);
      if (oldRow && Number(oldRow.ValueA) === value) return;
      _deactivateAllActiveCoinEconomyRows(ruleName);
      var now = new Date();
      var row = {
        SettingID: "ECON_" + ruleName + "_" + Utilities.getUuid().substring(0, 8),
        RuleGroup: defs[ruleName].group,
        RuleName: ruleName,
        ValueA: value,
        UnitA: defs[ruleName].unit,
        Status: "Active",
        UpdatedAt: now,
        UpdatedBy: String(adminId || "")
      };
      _appendCoinEconomyRow(row);
      _auditEconomyRuleChange(ruleName, oldRow, row, adminId, now);
      changed.push(_economyRuleModel(ruleName, row));
    });
    return changed;
  } finally {
    lock.releaseLock();
  }
}

function getAdminEconomyRules(e) {
  try {
    var sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;
    return success(getEconomyRules(), "Economy rules loaded");
  } catch (err) {
    return exception(err);
  }
}

function updateAdminEconomyRules(e) {
  try {
    var permResult = requirePermission(e, "Treasury");
    if (!permResult.valid) return permResult.response;
    var params = e.parameter || {};
    var changed = [];
    if (Object.prototype.hasOwnProperty.call(params, "inrAmount") || Object.prototype.hasOwnProperty.call(params, "coinAmount")) {
      if (!Object.prototype.hasOwnProperty.call(params, "inrAmount") || !Object.prototype.hasOwnProperty.call(params, "coinAmount")) return error("Both INR and Coin amounts are required.");
      updateCoinConversionRate(params.inrAmount, params.coinAmount, permResult.adminId);
      changed.push("CoinConversion");
    }
    var ruleChanges = updateEconomyRules(params, permResult.adminId);
    ruleChanges.forEach(function (rule) { changed.push(rule.ruleName); });
    return success({ changed: changed, economyRules: getEconomyRules() }, "Economy rules updated");
  } catch (err) {
    return exception(err);
  }
}
