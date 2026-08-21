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
 * Canonical helper — returns the full pass catalog (array).
 * Tip: read into any handler/list endpoint. Admin and public
 * callers can both use it; Status is returned per row.
 */
function getPromotionPassCatalog() {
  ensurePromotionPassesSheet();
  return getSheetData("PromotionPasses");
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
  const durationLabel = String((data && (data.durationLabel || data.DurationLabel || "")) || "").trim();
  const status = String((data && (data.status || data.Status || "Active")) || "Active").trim();

  if (!passName) throw new Error("Pass name is required.");
  if (!(includedCoins > 0)) throw new Error("IncludedCoins must be a positive whole number.");
  if (isNaN(priceInr) || priceInr < 0) throw new Error("Invalid PriceINR.");

  const now = new Date();
  const existing = passId ? findPromotionPassById(passId) : null;

  if (existing) {
    updateRow("PromotionPasses", "PassID", passId, {
      PassName: passName,
      PriceINR: priceInr,
      IncludedCoins: includedCoins,
      DurationLabel: durationLabel,
      Status: status,
      UpdatedDate: now,
      CreatedBy: actorAdminId || existing.CreatedBy || ""
    });
    return {
      passId: passId,
      created: false,
      status: status,
      includedCoins: includedCoins,
      priceINR: priceInr
    };
  }

  const newPassId = passId || "PASS" + Utilities.getUuid().substring(0, 6).toUpperCase();
  _appendPassRow({
    PassID: newPassId,
    PassName: passName,
    PriceINR: priceInr,
    IncludedCoins: includedCoins,
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
    includedCoins: includedCoins,
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

  // Idempotent repeat-create for the same order reference.
  if (orderRef) {
    const existing = findPassPurchaseByReference(orderRef);
    if (existing) {
      return {
        purchaseId: existing.PurchaseID,
        existing: true,
        status: existing.Status,
        includedCoins: Number(existing.IncludedCoins || 0),
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
    IncludedCoins: Number(pass.IncludedCoins || 0), // server-side source of truth
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
    includedCoins: Number(pass.IncludedCoins || 0),
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
  const includedCoins = Math.round(Number(pass.IncludedCoins || 0));
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