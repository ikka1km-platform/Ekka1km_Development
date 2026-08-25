/**
 * ============================================================
 * EKKA1KM BACKEND
 * PromotionPasses.js
 * PROMOTION PASS CATALOG + PASS PURCHASE RECORDS (V2)
 *
 * A "Promotion Pass" is a priced package (INR price with a
 * defined IncludedCoins count). The catalog is authoritative for
 * pricing/coin definitions. PassPurchases records WHO bought WHICH
 * pass (and the gateway/reference fields) but is NOT a payment
 * gateway. Real-money handling is intentionally NOT implemented yet.
 *
 * The catalog entry does NOT represent a successful purchase.
 * Coins only enter the authoritative PromotionTreasury keyed to a
 * purchase via confirmPassPurchase -> creditPromotionTreasury.
 *
 * No user Wallet / WalletTransactions are touched here except via
 * the treasury ledger, which is fully separate.
 * ============================================================
 * Header-based access only. No positional index reliance.
 * ============================================================
 */

/** PromotionPasses live-schema headers. */
function PROMOTION_PASSES_HEADERS() {
  return [
    "PassID",
    "PassName",
    "PriceINR",
    "IncludedCoins",
    "AllocationType",
    "DurationLabel",
    "Status",
    "CreatedDate",
    "UpdatedDate",
    "CreatedBy"
  ];
}

/** PassPurchases live-schema headers. */
function PASS_PURCHASES_HEADERS() {
  return [
    "PurchaseID",
    "UserID",
    "PassID",
    "PassName",
    "PriceINR",
    "IncludedCoins",
    "AllocationType",
    "OrderReference",
    "PaymentReference",
    "Status",
    "PurchasedAt",
    "VerifiedAt",
    "RefundedAt",
    "CreatedDate",
    "UpdatedDate",
    "CreatedBy"
  ];
}

/** Valid pass purchase status values. */
function PASS_PURCHASE_STATUS() {
  return { PENDING: "PENDING", SUCCESS: "SUCCESS", FAILED: "FAILED", REFUNDED: "REFUNDED" };
}

/**
 * PASS ALLOCATION TYPE (configuration foundation)
 *
 * Describes HOW a pass grants coins:
 *   - "FIXED"     -> IncludedCoins is a FIXED, admin-configurable amount.
 *   - "UNLIMITED" -> No fixed coin limit. Allocation is DYNAMIC / determined
 *                    by advertising need. The unlimited ALLOCATION ENGINE is
 *                    intentionally NOT implemented yet; this is only the
 *                    configuration representation. NEVER render unlimited as
 *                    "0 coins" — use coinAllocation.coins === null.
 *
 * Older catalog rows without an AllocationType column fall back to FIXED.
 */
function PASS_ALLOCATION_TYPE() {
  return { FIXED: "FIXED", UNLIMITED: "UNLIMITED" };
}

/** INTERNAL: normalize a raw allocation type to PASS_ALLOCATION_TYPE. */
function _normalizePassAllocationType(raw) {
  const v = String(raw || "").toUpperCase().trim();
  return v === "UNLIMITED" ? PASS_ALLOCATION_TYPE().UNLIMITED : PASS_ALLOCATION_TYPE().FIXED;
}

/**
 * CANONICAL PASS ALLOCATION MODEL
 * @param {object} pass - PromotionPasses catalog row (or null).
 * @returns {{type:string, coins:(number|null), includedCoins:number, label:string}}
 *   - FIXED      -> coins = the EFFECTIVE runtime allocation:
 *                   Math.round(PriceINR × current central coin rate)
 *                   (Model A — see getEffectivePassCoins). includedCoins is the
 *                   raw STORED sheet value (seed-time/historical) for introspection.
 *   - UNLIMITED  -> coins = null (no fixed cap). includedCoins is the raw stored
 *                   value ONLY for introspection; it is not a cap. The public
 *                   representation is coins === null + label, NEVER "0 coins".
 */
function getEffectivePassCoins(pass) {
  if (!pass) return null;
  // UNLIMITED is special: dynamic allocation, never a fixed number.
  if (_normalizePassAllocationType(pass.AllocationType) === PASS_ALLOCATION_TYPE().UNLIMITED) {
    return null;
  }
  const price = Number(pass.PriceINR);
  if (isFinite(price) && price > 0) {
    // Single authoritative central rate (Backend/CoinEconomy.js). Never a
    // second conversion system; read-only — the sheet is never rewritten.
    let coinsPerINR = 1;
    try {
      coinsPerINR = Number(getCoinConversionRate().coinsPerINR) || 1;
    } catch (rateErr) {
      coinsPerINR = 1;
    }
    if (!(coinsPerINR > 0)) coinsPerINR = 1;
    return Math.max(0, Math.round(price * coinsPerINR));
  }
  // No authoritative positive PriceINR (e.g. synthetic admin-upsert return
  // models without a price). Fall back to the stored allocation for stable
  // display/introspection only.
  const stored = Math.round(Number((pass && pass.IncludedCoins) || 0));
  return stored > 0 ? stored : 0;
}

function getPassAllocation(pass) {
  const type = _normalizePassAllocationType((pass && pass.AllocationType));
  const rawCoins = Math.round(Number((pass && pass.IncludedCoins) || 0));
  if (type === "UNLIMITED") {
    return {
      type: "UNLIMITED",
      coins: null,
      includedCoins: rawCoins,
      label: "UNLIMITED / Dynamic \u00b7 no fixed coin limit"
    };
  }
  const effectiveCoins = getEffectivePassCoins(pass);
  const coins = effectiveCoins > 0 ? effectiveCoins : 0;
  return {
    type: "FIXED",
    coins: coins,
    includedCoins: rawCoins,
    label: coins + " Coins (Fixed allocation \u00b7 central rate)"
  };
}

/**
 * ENSURE PROMOTION PASSES SHEET
 * Creates the catalog sheet + headers if missing. Header-order safe.
 */
function ensurePromotionPassesSheet() {
  const sheet = getOrCreateSheet("PromotionPasses");
  ensureSheetHeaders(sheet, PROMOTION_PASSES_HEADERS());
  return sheet;
}

/**
 * ENSURE PASS PURCHASES SHEET
 * Creates the purchase sheet + headers if missing. Header-order safe.
 */
function ensurePassPurchasesSheet() {
  const sheet = getOrCreateSheet("PassPurchases");
  ensureSheetHeaders(sheet, PASS_PURCHASES_HEADERS());
  return sheet;
}

/**
 * INTERNAL: Append a pass catalog row keyed by header names.
 */
function _appendPassRow(row) {
  const headers = PROMOTION_PASSES_HEADERS();
  const sheet = ensurePromotionPassesSheet();
  const out = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(row, h) ? row[h] : "";
  });
  sheet.appendRow(out);
}

/**
 * GET PROMOTION PASS CATALOG
 * Canonical helper — returns the full pass catalog (array), each row enriched
 * with a normalized `AllocationType` and a `coinAllocation` model (so callers
 * can render UNLIMITED correctly instead of misreading IncludedCoins as "0").
 */
function getPromotionPassCatalog() {
  ensurePromotionPassesSheet();
  return getSheetData("PromotionPasses").map(function (pass) {
    var allocation = getPassAllocation(pass);
    pass.AllocationType = allocation.type;
    pass.coinAllocation = allocation;
    return pass;
  });
}

/**
 * FIND PROMOTION PASS BY ID
 * Returns the catalog row or null.
 */
function findPromotionPassById(passId) {
  if (!passId) return null;
  return getRowById("PromotionPasses", "PassID", passId);
}

/**
 * UPSERT PROMOTION PASS (catalog create/update)
 * Server-side pass helper. `data` may be the route parameter object
 * or any object with passName/passId/priceINR/includedCoins/
 * durationLabel/status keys. Used by admin setup only.
 *
 * @param {object} data
 * @param {string} actorAdminId  - admin that performed the change
 * @returns {object} { passId, created, status, includedCoins, priceINR }
 */
function upsertPromotionPass(data, actorAdminId) {
  ensurePromotionPassesSheet();

  const passId = String((data && (data.passId || data.PassID || "")) || "").trim();
  const passName = String((data && (data.passName || data.PassName || "")) || "").trim();
  const priceInr = Math.max(0, Math.round(Number((data && (data.priceINR || data.PriceINR)) || 0)));
  const includedCoins = Math.round(Number((data && (data.includedCoins || data.IncludedCoins)) || 0));
  const allocationType = _normalizePassAllocationType(data && (data.allocationType || data.AllocationType || data.coinAllocationType));
  const durationLabel = String((data && (data.durationLabel || data.DurationLabel || "")) || "").trim();
  const status = String((data && (data.status || data.Status || "Active")) || "Active").trim();

  if (!passName) throw new Error("Pass name is required.");
  if (allocationType === PASS_ALLOCATION_TYPE().FIXED && !(includedCoins > 0)) {
    throw new Error("IncludedCoins must be a positive whole number for a FIXED allocation pass.");
  }
  if (isNaN(priceInr) || priceInr < 0) throw new Error("Invalid PriceINR.");

  const now = new Date();
  const existing = passId ? findPromotionPassById(passId) : null;

  if (existing) {
    updateRow("PromotionPasses", "PassID", passId, {
      PassName: passName,
      PriceINR: priceInr,
      IncludedCoins: includedCoins,
      AllocationType: allocationType,
      DurationLabel: durationLabel,
      Status: status,
      UpdatedDate: now,
      CreatedBy: actorAdminId || existing.CreatedBy || ""
    });
    return {
      passId: passId,
      created: false,
      status: status,
      allocationType: allocationType,
      includedCoins: includedCoins,
      coinAllocation: getPassAllocation({ AllocationType: allocationType, IncludedCoins: includedCoins }),
      priceINR: priceInr
    };
  }

  const newPassId = passId || "PASS" + Utilities.getUuid().substring(0, 6).toUpperCase();
  _appendPassRow({
    PassID: newPassId,
    PassName: passName,
    PriceINR: priceInr,
    IncludedCoins: includedCoins,
    AllocationType: allocationType,
    DurationLabel: durationLabel,
    Status: status,
    CreatedDate: now,
    UpdatedDate: now,
    CreatedBy: actorAdminId || ""
  });

  return {
    passId: newPassId,
    created: true,
    status: status,
    allocationType: allocationType,
    includedCoins: includedCoins,
    coinAllocation: getPassAllocation({ AllocationType: allocationType, IncludedCoins: includedCoins }),
    priceINR: priceInr
  };
}

/**
 * ADMIN: UPSERT PROMOTION PASS (catalog mutation)
 * ?action=adminpassupsert&session=TOKEN&passId=...&passName=...&priceINR=...&includedCoins=...&durationLabel=...&status=...
 * Authorization: requireAdminSession (server-side).
 */
function adminUpsertPromotionPass(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;

    const result = upsertPromotionPass(e.parameter || {}, sessionResult.adminId);
    return success(result, result.created ? "Pass created" : "Pass updated");
  } catch (err) {
    return exception(err);
  }
}

/**
 * PUBLIC: PASS CATALOG LIST
 * ?action=passcatalog
 * Read-only. Returns all catalog rows including Status.
 */
function getPromotionPassCatalogRoute(e) {
  try {
    ensurePromotionPassesSheet();
    return success({
      count: getSheetData("PromotionPasses").length,
      data: getPromotionPassCatalog()
    }, "Pass catalog loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * INTERNAL: Append a PassPurchases row keyed by header names.
 */
function _appendPurchaseRow(row) {
  const headers = PASS_PURCHASES_HEADERS();
  const sheet = ensurePassPurchasesSheet();
  const out = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(row, h) ? row[h] : "";
  });
  sheet.appendRow(out);
}

/**
 * FIND PASS PURCHASE BY REFERENCE
 * Locates a purchase by its OrderReference OR PaymentReference.
 * OrderReference / PaymentReference must be unique for a successful
 * credit (used for create idempotency).
 */
function findPassPurchaseByReference(reference) {
  if (!reference) return null;
  const data = getSheetData("PassPurchases");
  for (let i = 0; i < data.length; i++) {
    if (
      String(data[i].OrderReference || "") === String(reference) ||
      String(data[i].PaymentReference || "") === String(reference)
    ) {
      return data[i];
    }
  }
  return null;
}

/**
 * GET PASS PURCHASE
 * Returns a single purchase row by PurchaseID, or null.
 */
function getPassPurchase(purchaseId) {
  if (!purchaseId) return null;
  return getRowById("PassPurchases", "PurchaseID", purchaseId);
}

/**
 * GET USER PASS PURCHASES
 * Returns all purchase rows for a user (most recent first).
 */
function getUserPassPurchases(userId) {
  if (!userId) return [];
  return getSheetData("PassPurchases")
    .filter(function (p) {
      return String(p.UserID || "") === String(userId);
    })
    .sort(function (a, b) {
      return new Date(b.PurchasedAt || b.CreatedDate || 0) - new Date(a.PurchasedAt || a.CreatedDate || 0);
    });
}

/**
 * CREATE PASS PURCHASE (record only, status = PENDING)
 * No payment gateway is touched. The coin amount is read from the
 * SERVER-SIDE PromotionPasses catalog (never trusted from the
 * client). If an identical pending/success purchase already exists
 * for the same OrderReference it is returned instead (idempotent).
 *
 * @param {object} payload - { userId, passId, orderReference, paymentReference }
 * @returns {object} { purchaseId, existing, status, includedCoins, priceINR }
 */
function createPassPurchase(payload) {
  ensurePassPurchasesSheet();
  const userId = String((payload && (payload.userId || payload.UserID || "")) || "").trim();
  const passId = String((payload && (payload.passId || payload.PassID || "")) || "").trim();
  const orderRef = String((payload && (payload.orderReference || payload.OrderReference || "")) || "").trim();
  const paymentRef = String((payload && (payload.paymentReference || payload.PaymentReference || "")) || "").trim();

  if (!userId) throw new Error("userId is required.");
  if (!passId) throw new Error("PassID is required.");

  const pass = findPromotionPassById(passId);
  if (!pass) throw new Error("Pass not found.");
  if (String(pass.Status || "").toLowerCase() !== "active") {
    throw new Error("Pass is not active.");
  }
  const allocation = getPassAllocation(pass);
  const allocationType = allocation.type;

  // Idempotent repeat-create for the same order reference.
  if (orderRef) {
    const existing = findPassPurchaseByReference(orderRef);
    if (existing) {
      return {
        purchaseId: existing.PurchaseID,
        existing: true,
        status: existing.Status,
        allocationType: String(existing.AllocationType || "FIXED"),
        includedCoins: Number(existing.IncludedCoins || 0),
        coinAllocation: getPassAllocation(existing),
        priceINR: Number(existing.PriceINR || 0)
      };
    }
  }

  const purchaseId = "PU" + Utilities.getUuid().substring(0, 8);
  const now = new Date();

  _appendPurchaseRow({
    PurchaseID: purchaseId,
    UserID: userId,
    PassID: passId,
    PassName: String(pass.PassName || ""),
    PriceINR: Number(pass.PriceINR || 0),
    IncludedCoins: allocation.type === "UNLIMITED" ? 0 : (Number(allocation.coins || 0)), // effective runtime allocation (Model A)
    AllocationType: allocationType,
    OrderReference: orderRef,
    PaymentReference: paymentRef,
    Status: "PENDING",
    PurchasedAt: now,
    VerifiedAt: "",
    RefundedAt: "",
    CreatedDate: now,
    UpdatedDate: now,
    CreatedBy: (payload && (payload.createdBy || payload.CreatedBy)) || "SYSTEM"
  });

  return {
    purchaseId: purchaseId,
    existing: false,
    status: "PENDING",
    allocationType: allocationType,
    includedCoins: allocation.type === "UNLIMITED" ? 0 : (Number(allocation.coins || 0)),
    coinAllocation: allocation,
    priceINR: Number(pass.PriceINR || 0)
  };
}

/**
 * CONFIRM PASS PURCHASE (server-side confirmation)
 * Marks the purchase SUCCESS and credits PromotionTreasury EXACTLY
 * ONCE. Coin amount is re-read from the SERVER-SIDE PromotionPasses
 * catalog — a tampered IncludedCoins value is never trusted.
 *
 * Idempotency: if the purchase is already SUCCESS, no second credit
 * is made. If the treasury already holds the ReferenceID (= PurchaseID),
 * no second credit is made.
 *
 * @param {string} purchaseId
 * @returns {object} { purchaseId, status, includedCoins, treasuryBalance,
 *                     alreadyConfirmed, idempotentCredit }
 */
function confirmPassPurchase(purchaseId) {
  ensurePassPurchasesSheet();
  ensurePromotionTreasurySheet();

  if (!purchaseId) throw new Error("PurchaseID is required.");

  const purchase = getPassPurchase(purchaseId);
  if (!purchase) throw new Error("Purchase not found.");

  const currentStatus = String(purchase.Status || "").toUpperCase();

  // Idempotent — already confirmed. Never double-credit.
  if (currentStatus === "SUCCESS") {
    return {
      purchaseId: purchaseId,
      status: "SUCCESS",
      includedCoins: Number(purchase.IncludedCoins || 0),
      treasuryBalance: getPromotionTreasuryBalance(),
      alreadyConfirmed: true,
      idempotentCredit: false
    };
  }

  if (currentStatus !== "PENDING") {
    throw new Error("Purchase cannot be confirmed. Current status: " + purchase.Status);
  }

  // Server-side, authoritative pass definition — NEVER the client's coins.
  const pass = findPromotionPassById(purchase.PassID);
  if (!pass) throw new Error("Pass not found for purchase.");

  const allocation = getPassAllocation(pass);

  // UNLIMITED allocation engine is intentionally NOT implemented yet.
  // Guard so we never credit a misleading "0 coins" / no-cap amount. This is
  // only the configuration foundation for UNLIMITED representation.
  if (allocation.type === "UNLIMITED") {
    throw new Error("UNLIMITED pass allocation is not implemented yet.");
  }

  const includedCoins = allocation.coins;
  if (!(includedCoins > 0)) throw new Error("Pass has an invalid IncludedCoins value.");

  // Credit treasury exactly once. ReferenceID = PurchaseID.
  const referenceId = String(purchase.PurchaseID);
  const creditResult = creditPromotionTreasury({
    coins: includedCoins,
    domain: "PASS",
    passId: purchase.PassID,
    purchaseId: purchaseId,
    campaignId: "",
    userId: purchase.UserID,
    referenceId: referenceId,
    createdBy: "PASS_CONFIRM"
  });

  // Mark the purchase SUCCESS (with VerifiedAt).
  const now = new Date();
  const updated = updateRow("PassPurchases", "PurchaseID", purchaseId, {
    Status: "SUCCESS",
    VerifiedAt: now,
    UpdatedDate: now
  });
  if (!updated) {
    console.log("confirmPassPurchase: failed to flip purchase row while treasury credited: " + purchaseId);
  }

  return {
    purchaseId: purchaseId,
    status: "SUCCESS",
    includedCoins: includedCoins,
    treasuryBalance: creditResult.balance,
    alreadyConfirmed: false,
    idempotentCredit: !!creditResult.idempotent
  };
}

/**
 * ROUTE: CREATE PASS PURCHASE (PENDING record)
 * ?action=createpasspurchase&userId=&passId=&orderReference=&paymentReference=
 */
function createPassPurchaseEndpoint(e) {
  try {
    const result = createPassPurchase((e && e.parameter) || {});
    return success(result, "Pass purchase created (PENDING)");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ROUTE: CONFIRM PASS PURCHASE
 * ?action=confirmpasspurchase&purchaseId=
 */
function confirmPassPurchaseEndpoint(e) {
  try {
    const purchaseId = String((e && e.parameter && e.parameter.purchaseId) || "").trim();
    const result = confirmPassPurchase(purchaseId);
    return success(result, "Pass purchase confirmed and treasury credited");
  } catch (err) {
    return exception(err);
  }
}

/**
 * ROUTE: MY PURCHASED PASSES
 * ?action=mypurchasedpasses&userId=
 */
function myPurchasedPassesEndpoint(e) {
  try {
    const userId = String((e && e.parameter && e.parameter.userId) || "").trim();
    if (!userId) return error("userId required");
    const purchases = getUserPassPurchases(userId);
    return success({ count: purchases.length, data: purchases }, "Purchased passes loaded");
  } catch (err) {
    return exception(err);
  }
}

/**
 * RETIRE LEGACY ACTIVE PASSES
 * Marks the OLD tier set (Starter / Standard / Business / Enterprise) as
 * Inactive so they are no longer active/selectable once the canonical
 * UNLIMITED / BASIC / PLATINUM / GOLD structure is activated.
 *
 * Uses the EXISTING PromotionPass Status architecture (Active -> Inactive).
 * Historical rows are NEVER deleted and historical PassPurchases are left
 * untouched — only the catalog Status flag is flipped. Idempotent: already
 * Inactive or non-matching rows are skipped.
 *
 * @param {string} actorAdminId - admin performing the retirement (audit only).
 * @returns {string[]} PassIDs retired (flipped to Inactive) this run.
 */
function _retireLegacyPasses(actorAdminId) {
  var LEGACY_NAMES = { starter: true, standard: true, business: true, enterprise: true };
  var retired = [];
  var rows = getSheetData("PromotionPasses");
  rows.forEach(function (row) {
    var name = String(row.PassName || "").trim().toLowerCase();
    if (LEGACY_NAMES[name] && String(row.Status || "Active").toUpperCase() === "ACTIVE") {
      updateRow("PromotionPasses", "PassID", row.PassID, {
        Status: "Inactive",
        UpdatedDate: new Date(),
        CreatedBy: actorAdminId || ""
      });
      retired.push(String(row.PassID || ""));
    }
  });
  return retired;
}

/**
 * THE 4-TIER PASS STRUCTURE (configuration foundation)
 * UNLIMITED ₹0 / BASIC ₹500 / PLATINUM ₹1000 / GOLD ₹1500.
 *
 * The OLD Starter/Basic/Standard/Business/Enterprise tier set must NOT be used.
 * This is the singular canonical source for the DEFAULT pass catalog:
 *
 *   - UNLIMITED: price ₹0, allocation = UNLIMITED (no fixed coin limit). The
 *     allocation engine is NOT implemented — only the configuration is.
 *   - BASIC     ₹500  -> FIXED, admin-configurable coin allocation.
 *   - PLATINUM  ₹1000 -> FIXED, admin-configurable coin allocation.
 *   - GOLD      ₹1500 -> FIXED, admin-configurable coin allocation.
 *
 * Note on the UNLIMITED row's raw IncludedCoins cell: to satisfy the existing
 * numeric column schema it is stored as 0 (a placeholder). This IS technically
 * required only to fit the schema; the allocation model getPassAllocation()
 * treats UNLIMITED as coins = null (non-fixed) and callers must render the
 * model — never the raw 0. We keep the placeholder rather than inventing a new
 * storage mechanism.
 *
 * Coin defaults for the three FIXED passes are derived ONCE at first seed from
 * the authoritative coin conversion rate (priceINR x coinsPerINR). This rate is
 * a DEFAULT/REFERENCE ONLY. Once a FIXED pass row exists, its IncludedCoins is
 * an INDEPENDENT, admin-configurable value and changing the global rate NEVER
 * overwrites it (seed skips existing rows). All values remain editable through
 * adminpassupsert.
 *
 * Seeding is IDEMPOTENT: existing canonical PassIDs are never overwritten, and
 * legacy Active tiers are retired.
 *
 * @param {string} actorAdminId - admin performing the seed (for CreatedBy).
 * @returns {{seedKey:string, created:string[], existing:string[], retired:string[]}}
 */
function seedDefaultPromotionPasses(actorAdminId) {
  ensurePromotionPassesSheet();
  ensureCoinEconomySettingsSheet();

  // Authoritative coin conversion -> reasonable FIXED defaults (reference only).
  var coinsPerINR = 1;
  try {
    coinsPerINR = Number(getCoinConversionRate().coinsPerINR) || 1;
  } catch (rateErr) {
    coinsPerINR = 1;
  }
  function fixedDefault(price) {
    return Math.max(1, Math.round(price * coinsPerINR));
  }

  var defaults = [
    { passId: "PASS_UNLIMITED", passName: "UNLIMITED", priceINR: 0,    allocationType: "UNLIMITED", includedCoins: 0,                    durationLabel: "Dynamic \u00b7 no fixed coin limit" },
    { passId: "PASS_BASIC",     passName: "BASIC",     priceINR: 500,  allocationType: "FIXED",     includedCoins: fixedDefault(500),  durationLabel: "Monthly \u00b7 fixed allocation" },
    { passId: "PASS_PLATINUM",  passName: "PLATINUM",  priceINR: 1000, allocationType: "FIXED",     includedCoins: fixedDefault(1000), durationLabel: "Monthly \u00b7 fixed allocation" },
    { passId: "PASS_GOLD",      passName: "GOLD",      priceINR: 1500, allocationType: "FIXED",     includedCoins: fixedDefault(1500), durationLabel: "Monthly \u00b7 fixed allocation" }
  ];

  var created = [];
  var existing = [];
  defaults.forEach(function (def) {
    var row = findPromotionPassById(def.passId);
    if (row) {
      existing.push(def.passId); // never clobber admin-tuned values
      return;
    }
    upsertPromotionPass(def, actorAdminId);
    created.push(def.passId);
  });

  // Activate canonical structure -> retire legacy Active tiers (never delete).
  var retired = _retireLegacyPasses(actorAdminId);

  return { seedKey: "PASS_STRUCTURE_V1", created: created, existing: existing, retired: retired };
}

/**
 * ROUTE: ADMIN SEED DEFAULT PASS STRUCTURE
 * ?action=adminseeddefaultpasses&session=TOKEN
 * Authorization: requireAdminSession (server-side). Idempotent.
 */
function adminSeedDefaultPasses(e) {
  try {
    const sessionResult = requireAdminSession(e);
    if (!sessionResult.valid) return sessionResult.response;
    const result = seedDefaultPromotionPasses(sessionResult.adminId);
    return success(result, result.created.length ? "Default pass structure seeded" : "Default pass structure already present");
  } catch (err) {
    return exception(err);
  }
}