/**
 * ============================================================
 * EKKA1KM BACKEND
 * AdminTreasury.js
 * ADMIN TREASURY-FUNDED CAMPAIGN CREATION (V2)
 *
 * Dedicated SERVER-SIDE admin flow:
 *   action=admincreatecampaign
 *
 *   Admin -> selects a Promotion Pass -> IncludedCoins is the
 *   DEFAULT campaign fuel -> admin may raise or lower fuel ->
 *   existing canonical campaign engine creates the campaign ->
 *   PromotionTreasury is DEBITED (never any user wallet).
 *
 * SECURITY
 *   - requireAdminSession + requirePermission("Treasury")
 *     (Founder role bypasses permissions by design).
 *   - The browser NEVER decides funding source. This module
 *     server-forces FundingSource/CampaignSource = "Treasury".
 *   - The PUBLIC route (createpromotion) continues rejecting
 *     admin/treasury/system funding attempts (f4a88fb).
 *
 * DURATION RULES (unchanged from 4c5c120)
 *   - Admin: minimum 3 seconds, NO artificial maximum.
 *   - VIDEO: AdDurationSeconds <= MediaDuration when available.
 *   - NO duration-fee / per-second economics (deferred concept).
 *
 * IDEMPOTENCY
 *   Deterministic ReferenceID ("ADMIN_CAMPAIGN_<key|hash>") shared
 *   by the campaign Remarks tag and the Treasury ledger so a retry
 *   can never produce a second campaign or a second debit.
 * ============================================================
 */

/** Valid promotion targets for an admin-created campaign. */
function ADMIN_CAMPAIGN_TARGET_TYPES() {
  return ["Product", "Business", "Property", "News"];
}

/** Traceability tag prefix written into the campaign Remarks column. */
function ADMIN_CAMPAIGN_REF_TAG_PREFIX() {
  return "TREASURY_REF:";
}

/**
 * DETERMINISTIC REQUEST REFERENCE
 * Stable across retries of the same logical operation. Prefers an
 * explicit idempotencyKey; otherwise hashes the campaign definition
 * (timestamps are deliberately EXCLUDED so a retry matches).
 */
function buildAdminCampaignReference(p) {
  var key = String((p && p.idempotencyKey) || "").trim();
  if (key) {
    return "ADMIN_CAMPAIGN_" + key.replace(/[^A-Za-z0-9_-]/g, "").substring(0, 60);
  }
  var basis = [
    p.ownerUserId, p.passId, p.targetType, p.targetId,
    p.creativeType, p.adDurationSeconds,
    p.imageURL, p.videoURL, p.externalURL,
    p.targetRadius, p.latitude, p.longitude, p.endDate
  ].join("|");
  // djb2-style hash (deterministic, dependency-free)
  var h = 5381;
  for (var i = 0; i < basis.length; i++) {
    h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  }
  return "ADMIN_CAMPAIGN_H" + h.toString(36).toUpperCase();
}

/** Locate an existing treasury-funded campaign by its reference tag. */
function findCampaignByTreasuryRef(ref) {
  if (!ref) return null;
  var tag = ADMIN_CAMPAIGN_REF_TAG_PREFIX() + ref;
  var rows = getSheetData("PromotionCampaigns");
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].Remarks || "").indexOf(tag) !== -1) {
      return rows[i];
    }
  }
  return null;
}

/** Validate the promoted entity exists AND belongs to the owner. */
function validateAdminCampaignTarget(targetType, targetId, ownerUserId) {
  if (ADMIN_CAMPAIGN_TARGET_TYPES().indexOf(targetType) === -1) {
    throw new Error("targetType must be one of: " + ADMIN_CAMPAIGN_TARGET_TYPES().join(", "));
  }
  var sheetName = targetType === "Product" ? "Products"
    : targetType === "Business" ? "Businesses"
    : targetType === "Property" ? "Properties"
    : "News";
  var idColumn = targetType === "News" ? "NewsID"
    : targetType === "Product" ? "ProductID"
    : targetType === "Business" ? "BusinessID"
    : "PropertyID";
  var row = getRowById(sheetName, idColumn, targetId);
  if (!row) throw new Error(targetType + " not found: " + targetId);
  var ownerId = row.UserID || row.OwnerUserID || "";
  if (String(ownerId) !== String(ownerUserId)) {
    throw new Error("Target " + targetId + " does not belong to owner " + ownerUserId);
  }
  return true;
}

/** Validate creative consistency with CreativeType (same model as PCC). */
function validateAdminCampaignCreative(creativeType, p) {
  var ct = String(creativeType || "IMAGE").toUpperCase();
  if (ct === "VIDEO") {
    if (!p.videoURL) throw new Error("videoURL required for VIDEO creative");
  } else if (ct === "IMAGE") {
    if (!p.imageURL) throw new Error("imageURL required for IMAGE creative");
  } else if (ct === "ENTITY_IMAGE") {
    if (!p.imageURL) throw new Error("imageURL (entity image) required for ENTITY_IMAGE creative");
  } else if (ct === "URL") {
    if (!p.externalURL) throw new Error("externalURL required for URL creative");
    if (!p.imageURL) throw new Error("imageURL required alongside URL creative (visible creative)");
  } else {
    throw new Error("Invalid creativeType. Must be IMAGE, VIDEO, URL, or ENTITY_IMAGE.");
  }
  return ct;
}

/**
 * ============================================================
 * ADMIN: CREATE TREASURY-FUNDED CAMPAIGN
 * ?action=admincreatecampaign&session=TOKEN
 *   &ownerUserId=&passId=&campaignFuel=
 *   &targetType=&targetId=
 *   &creativeType=&imageURL=&videoURL=&externalURL=&mediaDuration=
 *   &adDurationSeconds=&cta=&destinationType=
 *   &radius=&latitude=&longitude=&lifetimeDays=
 *   &pipEnabled=&featured=&priority=&idempotencyKey=
 *
 * Authorization: requirePermission(e, "Treasury") — Founder bypass.
 * Server forces FundingSource=CampaignSource=Treasury.
 * ============================================================
 */
function adminCreateCampaign(e) {
  try {
    ensurePromotionSheets();
    ensurePromotionPassesSheet();
    ensurePromotionTreasurySheet();

    var p = e.parameter || {};

    // ==========================================================
    // 1. ADMIN AUTHORIZATION (server-side only)
    // ==========================================================
    var permResult = requirePermission(e, "Treasury");
    if (!permResult.valid) return permResult.response;
    var actorAdminId = permResult.adminId;

    // ==========================================================
    // 2-4. OWNER / PASS / TARGET INPUT VALIDATION
    // ==========================================================
    var ownerUserId = String(p.ownerUserId || "").trim();
    var passId = String(p.passId || "").trim();
    if (!passId) return error("passId required");

    var targetType = String(p.targetType || "").trim();
    var targetId = String(p.targetId || "").trim();
    // DIRECT ADVERTISEMENT: a targetless campaign is allowed when the admin
    // supplies the creative (image/video/URL) directly and there is NO
    // mandatory Ekka1km owner. The authenticated admin is the actor/creator.
    // Real catalog promotion still requires BOTH targetType, targetId and an
    // owner who owns that listing.
    var isDirectAd = (!targetType && !targetId);
    if (!isDirectAd && (!targetType || !targetId)) {
      return error("targetType and targetId must both be supplied unless this is a Direct Advertisement");
    }
    if (!isDirectAd && !ownerUserId) {
      return error("ownerUserId required");
    }

    // ==========================================================
    // CRITICAL ALLOCATION SEQUENCE UNDER LOCK (validations,
    // fuel resolution, balance read, duplicate check).
    // NOTE: createPromotionCampaign() and debitPromotionTreasury()
    // each acquire the SAME script lock internally, so this lock is
    // released before those calls (nested acquisition would deadlock).
    // The FINAL balance authority is the negative-balance protection
    // inside the treasury mutation itself.
    // ==========================================================
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    var pass, resolvedFuel, adDurationSeconds, creativeType, referenceId;
    try {
      // ---- PASS RESOLUTION (server-side authoritative) ----
      pass = findPromotionPassById(passId);
      if (!pass) return error("Promotion Pass not found: " + passId);
      if (String(pass.Status || "").toLowerCase() !== "active") {
        return error("Promotion Pass is not active: " + passId);
      }

      // ---- OWNER VALIDATION (required only for catalog-owned campaigns;
      // Direct Advertisements have no mandatory Ekka1km user) ----
      if (!isDirectAd) {
        var owner = getRowById(CONFIG.SHEETS.USERS, "UserID", ownerUserId);
        if (!owner) return error("Owner user not found: " + ownerUserId);
      }

      // ---- TARGET VALIDATION (skipped for Direct Advertisements) ----
      if (!isDirectAd) {
        validateAdminCampaignTarget(targetType, targetId, ownerUserId);
      }

      // ---- CREATIVE VALIDATION (existing PCC media references) ----
      creativeType = validateAdminCampaignCreative(
        String(p.creativeType || "IMAGE").toUpperCase(), p
      );

      // ---- AD DURATION (established rules, reused normalizer) ----
      // Admin: >=3, no artificial max. VIDEO capped by MediaDuration
      // when available. No >120 clamp. No duration fees.
      adDurationSeconds = normalizeAdDurationSeconds(
        p.adDurationSeconds, p.duration,
        { isAdminFunded: true, creativeType: creativeType, mediaDuration: p.mediaDuration }
      );

      // ---- CAMPAIGN FUEL OVERRIDE ----
      var rawFuel = String(p.campaignFuel == null ? "" : p.campaignFuel).trim();
      if (rawFuel === "") {
        // DEFAULT campaign fuel = EFFECTIVE pass allocation:
        // PriceINR × current central coin rate (Model A, server-derived).
        // UNLIMITED has no fixed allocation -> default 0 (admin override required).
        var passAllocation = getPassAllocation(pass);
        resolvedFuel = passAllocation.type === "UNLIMITED"
          ? 0
          : Number(passAllocation.coins || 0);
      } else {
        if (!/^\d+$/.test(rawFuel)) {
          return error("campaignFuel must be an integer greater than or equal to 0");
        }
        resolvedFuel = parseInt(rawFuel, 10);
      }
      if (!(resolvedFuel >= 0)) return error("Invalid campaignFuel");

      // ---- TREASURY BALANCE READ INSIDE THE LOCK ----
      var treasuryBalance = getPromotionTreasuryBalance();
      if (resolvedFuel > treasuryBalance) {
        return error(
          "Insufficient PromotionTreasury balance. Required: " +
          resolvedFuel + ", Available: " + treasuryBalance
        );
      }

      // ---- DUPLICATE PREVENTION (inside the lock) ----
      referenceId = buildAdminCampaignReference(p);
      if (hasPromotionTreasuryReference(referenceId) ||
          findCampaignByTreasuryRef(referenceId)) {
        var dup = findCampaignByTreasuryRef(referenceId);
        return success({
          idempotent: true,
          campaignId: dup ? dup.CampaignID : "",
          ownerUserID: dup ? dup.OwnerUserID : ownerUserId,
          promotionFuel: dup ? Number(dup.PromotionFuel || 0) : resolvedFuel,
          remainingFuel: dup ? Number(dup.RemainingFuel || 0) : 0,
          passId: passId,
          fundingSource: "Treasury",
          campaignSource: "Treasury",
          treasuryReferenceId: referenceId
        }, "Admin campaign already exists (idempotent retry)");
      }
    } finally {
      lock.releaseLock();
    }
    // ==========================================================
    // CREATE CAMPAIGN VIA THE EXISTING CANONICAL ENGINE
    // Reuses normalizeAdDurationSeconds + live-schema row mapping.
    // fundingSource/campaignSource are SERVER-FORCED here — never
    // read from the browser.
    // ==========================================================
    var lifetimeDays = parseInt(p.lifetimeDays || "30", 10);
    if (!(lifetimeDays > 0)) lifetimeDays = 30;
    var endDate = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000);
    var remarks =
      "FUNDED_BY:TREASURY; PASS:" + passId + "; " +
      ADMIN_CAMPAIGN_REF_TAG_PREFIX() + referenceId +
      "; CREATED_BY_ADMIN:" + actorAdminId;

    // Map into the existing canonical promotion path. A Direct Advertisement
    // uses the same targetless shape as promoteExternalUrl()/promoteWebsite()
    // (PROMOTE_EXTERNAL_URL + ExternalURL entity). Real catalog promotion keeps
    // the existing PROMOTE_<TYPE> mapping. No second engine is introduced.
    var campaignType = isDirectAd
      ? "PROMOTE_EXTERNAL_URL"
      : ("PROMOTE_" + targetType.toUpperCase());
    var promotedEntityType = isDirectAd ? "ExternalURL" : targetType;
    var promotedEntityID = isDirectAd ? "" : targetId;
    // The campaign owner/creator. For a Direct Advertisement there is no
    // mandatory Ekka1km user — the AUTHENTICATED admin (already authorized
    // above) is the actor/owner. For a catalog listing, the selected owner is used.
    var campaignOwnerId = isDirectAd ? actorAdminId : ownerUserId;

    var v2Raw = createPromotionCampaign({
      parameter: {
        userId: campaignOwnerId,
        ownerUserID: campaignOwnerId,
        campaignType: campaignType,
        campaignSource: "Treasury",           // SERVER-FORCED (also drives isAdminFunded)
        fundingSource: "Treasury",            // SERVER-FORCED
        promotedEntityType: promotedEntityType,
        promotedEntityID: promotedEntityID,
        creativeType: creativeType,
        imageURL: p.imageURL || "",
        videoURL: p.videoURL || "",
        externalURL: p.externalURL || "",
        mediaDuration: p.mediaDuration || "",
        cta: p.cta || "Learn More",
        destinationType: p.destinationType || "",
        adDurationSeconds: String(adDurationSeconds),
        duration: String(adDurationSeconds),
        campaignBudget: String(resolvedFuel),
        promotionFuel: String(resolvedFuel),
        rewardCoins: String(p.rewardCoins || Math.floor(resolvedFuel * 0.7)),
        endDate: endDate.toISOString(),
        targetRadius: p.radius || "All India",
        targetLocation: p.targetLocation || "",
        latitude: p.latitude || "",
        longitude: p.longitude || "",
        pipEnabled: p.pipEnabled || "Yes",
        featured: p.featured || "No",
        priority: p.priority || "0",
        promotionTier: p.promotionTier || "Standard",
        remarks: remarks
      }
    });

    // Normalize engine response (TextOutput vs plain object contract).
    var v2 = v2Raw && typeof v2Raw.getContent === "function"
      ? JSON.parse(v2Raw.getContent())
      : v2Raw;

    if (!v2 || !v2.success) {
      // Creation failed BEFORE any treasury mutation -> nothing debited.
      return error((v2 && v2.message) || "Campaign creation failed");
    }
    var campaignId = v2.data && v2.data.campaignId ? v2.data.campaignId : "";

    // Zero-fuel campaigns: valid per rules, nothing to debit.
    if (!(resolvedFuel > 0)) {
      return success({
        campaignId: campaignId,
        ownerUserID: ownerUserId,
        passId: passId,
        promotionFuel: 0,
        remainingFuel: 0,
        adDurationSeconds: adDurationSeconds,
        fundingSource: "Treasury",
        campaignSource: "Treasury",
        treasuryDebit: { skipped: true, reason: "zero fuel allocation" },
        treasuryReferenceId: referenceId
      }, "Admin campaign created with zero treasury allocation");
    }

    // ==========================================================
    // TREASURY DEBIT (canonical helper; own lock + idempotency +
    // negative-balance protection). Never touches user wallets.
    // ==========================================================
    try {
      var debit = debitPromotionTreasury({
        type: "DEBIT",
        domain: "ADMIN_CAMPAIGN",
        coins: resolvedFuel,
        passId: passId,
        campaignId: campaignId,
        userId: ownerUserId,
        referenceId: referenceId,
        actorAdminId: actorAdminId,
        createdBy: "ADMIN:" + actorAdminId
      });

      if (debit && debit.idempotent) {
        // Lost a race against an identical request: roll back THIS
        // duplicate campaign row and report the original.
        removeCampaignRowByCampaignId(campaignId);
        var original = findCampaignByTreasuryRef(referenceId);
        return success({
          idempotent: true,
          campaignId: original ? original.CampaignID : campaignId,
          ownerUserID: original ? original.OwnerUserID : ownerUserId,
          promotionFuel: original ? Number(original.PromotionFuel || 0) : resolvedFuel,
          remainingFuel: original ? Number(original.RemainingFuel || 0) : resolvedFuel,
          passId: passId,
          fundingSource: "Treasury",
          campaignSource: "Treasury",
          treasuryReferenceId: referenceId
        }, "Admin campaign already created (concurrent duplicate rolled back)");
      }

      // Link the treasury transaction on the campaign for traceability.
      try {
        var camp = getRowById("PromotionCampaigns", "CampaignID", campaignId);
        updateRow("PromotionCampaigns", "CampaignID", campaignId, {
          Remarks: String((camp && camp.Remarks) || remarks) + "; TREASURY_TX:" + (debit.treasuryTxId || "")
        });
      } catch (linkErr) {}

      return success({
        campaignId: campaignId,
        ownerUserID: ownerUserId,
        passId: passId,
        passName: pass.PassName || "",
        includedCoins: Number(pass.IncludedCoins || 0),
        promotionFuel: resolvedFuel,
        remainingFuel: resolvedFuel,
        adDurationSeconds: adDurationSeconds,
        creativeType: creativeType,
        fundingSource: "Treasury",
        campaignSource: "Treasury",
        treasuryReferenceId: referenceId,
        treasuryTxId: debit.treasuryTxId,
        treasuryBalanceAfter: debit.balance
      }, "Admin treasury-funded campaign created");

    } catch (debitErr) {
      // Debit failed AFTER creation -> ROLLBACK the campaign row via the
      // existing helper. Treasury ledger rows are never deleted (append-only).
      try { removeCampaignRowByCampaignId(campaignId); } catch (rmErr) {}
      return error("Treasury debit failed, campaign rolled back: " + (debitErr && debitErr.message));
    }

  } catch (err) {
    return exception(err);
  }
}
