# Phase 5.7C-A — Economy Control Architecture Discovery

## 1. Executive Summary

This discovery analyzed the Ekka1km economy control architecture strictly as **READ-ONLY**. No runtime files were modified. No wallet balances were changed. No transactions, rewards, or campaign records were created or mutated.

The repository exposes a single canonical wallet credit function (`creditWallet`) and a shared WalletTransactions row appender (`createWalletTransaction`). There is **no existing canonical wallet debit function**. Public `updateWallet` exists but performs signed balance mutation without negative-balance protection or transaction logging. Debit-like behavior is implemented ad-hoc in `Promotions.js` (`createPromotionTransaction`).

Reward and campaign mutations use `LockService.getScriptLock()` to mitigate concurrent writes, but wallet transaction insertion lacks locking, idempotency tokens, or duplicate detection. An admin authorization framework exists (`requireAdminSession`, `requirePermission`, `requireRole`) with Founder bypass, but no economy adjustment APIs exist yet.

A dedicated audit sheet for economy corrections does **not** exist. Existing `ActivityLogs` is used elsewhere but is not wired into economy mutation paths. The anomaly for Wallet `W001` / User `U001` (stored Balance `4635` vs transaction-derived `5335`, variance `700`) remains untouched and must remain untouched through Phase 5.7C.

## 2. Files Inspected

| File | Relevance |
|------|-----------|
| `Backend/Wallet.js` | Canonical credit, transaction creation, public balance update |
| `Backend/RewardEngine.js` | Ad reward claim flow, `claimReward` locking |
| `Backend/Promotion.js` | PIP ad reward claim flow |
| `Backend/Promotions.js` | Promotion purchase transaction with atomic rollback |
| `Backend/AdminEconomy.js` | 5.7A read-only admin wallet APIs |
| `Backend/AdminEconomyIntegrity.js` | 5.7B reconciliation, duplicate detection, compatibility helpers |
| `Backend/AdminAuth.js` | Admin session, permissions, Founder/Super Admin role checks |
| `Backend/Code.js` | API router (no economy mutation routes present) |
| `Frontend/admin-wallet.js` | Read-only admin wallet UI |
| `Backend/Users.js` | Profile APIs (no TotalCoins mutation) |

## 3. Current Wallet Mutation Architecture

### 3.1 Canonical Credit Path
`Backend/Wallet.js` → `creditWallet(userId, coins, referenceId, reason)` (lines 151–194)

1. Reads `Wallet` row by `UserID` via `getWalletRow`.
2. Computes `before = Number(wallet.Balance || 0)`.
3. Computes `after = before + Number(coins)`.
4. Updates `Wallet.Balance`, `Wallet.TotalEarned`, `Wallet.LastUpdated` via `updateRow`.
5. Calls `createWalletTransaction(wallet.WalletID, userId, coins, before, after, referenceId, reason)`.
6. Returns boolean.

**Called by:** `RewardEngine.claimReward` (ad reward credit).

### 3.2 Reward-Specific Credit Path
`Backend/RewardEngine.js` → `claimReward(e)` (lines 161–339)

* Acquires `LockService.getScriptLock()` (30s).
* Validates `Advertisements.RewardEnabled`, remaining pool, partial reward policy.
* Computes `newCoins = watched - alreadyEarned`.
* Calls `creditWallet(userId, newCoins, adId, "Advertisement Reward")`.
* Updates `AdRewardHistory` with `CoinsEarned` and `Completed = "Yes"`.
* Updates `Advertisements.RemainingRewardCoins` and `RewardCoinsDistributed`.
* Releases lock in `finally`.

### 3.3 Campaign/Promotion Debit Path
`Backend/Promotions.js` → `createPromotionTransaction(userId, promotionType, targetType, targetId, radius, duration, totalCoins)` (lines 96–169)

* Reads wallet via `getWalletRow`.
* Validates `balance >= totalCoins`.
* Deducts coins via `updateRow("Wallet", "WalletID", wallet.WalletID, { Balance: newBalance, LastUpdated: new Date() })`.
* Creates `Promotions` row.
* Calls `createWalletTransaction(wallet.WalletID, userId, -totalCoins, oldBalance, newBalance, "PROMO_" + promotionId, "Promotion - ...")`.
* On `createWalletTransaction` failure, rolls back `Wallet.Balance` to `oldBalance`.
* No `LockService` protection here.

### 3.4 Public/Generic Balance Mutation
`Backend/Wallet.js` → `updateWallet(e)` (lines 82–125)

* Reads `amount = Number(p.amount || 0)`.
* Reads wallet row.
* Computes `newBalance = Number(wallet.Balance || 0) + amount`.
* Updates `Wallet.Balance` and `Wallet.LastUpdated`.
* **Does not create a WalletTransaction.**
* **No negative-balance protection.**
* **No admin authorization required.**

## 4. Canonical Credit Function

**Function:** `creditWallet` in `Backend/Wallet.js` (lines 151–194)

**Signature:**
```js
function creditWallet(userId, coins, referenceId, reason)
```

**Behavior:**
* Reads current `Wallet.Balance`.
* Computes new balance = `before + coins`.
* Updates `Wallet.Balance`, `Wallet.TotalEarned`, `Wallet.LastUpdated`.
* Creates `WalletTransactions` via `createWalletTransaction`.
* Used only by `RewardEngine.claimReward` in current codebase.

## 5. Canonical Debit Function

**NO canonical debit function exists.**

* `updateWallet(e)` exists (lines 82–125) but:
  * is public/exposed via router (`case "wallet": return getWallet(e);` — note router does not route `updateWallet` directly in observed snippet, but function exists).
  * does not create a transaction.
  * does not validate non-negative result.
* `createPromotionTransaction` in `Backend/Promotions.js` (lines 96–169) performs an inline debit-like sequence but is campaign-specific.
* **Conclusion:** any 5.7C debit adjustment must define a new canonical debit function or reuse `createPromotionTransaction` patterns generically.

## 6. WalletTransactions Creation Path

**Function:** `createWalletTransaction(walletId, userId, coins, before, after, referenceId, reason)` in `Backend/Wallet.js` (lines 197–229)

**Row insertion:**
```js
sheet.appendRow([
  transactionId,  // "WT" + UUID(0,8)
  walletId,
  userId,
  "REWARD",       // hardcoded as "REWARD"
  reason || "Reward",
  "ADVERTISEMENT",// hardcoded as "ADVERTISEMENT"
  referenceId,
  coins,
  before,
  after,
  "SUCCESS",
  new Date(),
  "SYSTEM"
]);
```

**Key findings:**
* Type is always `"REWARD"` when created by `creditWallet`.
* Source is always `"ADVERTISEMENT"`.
* CreatedBy is always `"SYSTEM"`.
* **No caller-supplied Type or Source override** in the current helper.

## 7. Exact WalletTransactions Schema

Based on `createWalletTransaction` writes and `AdminEconomyIntegrity` reads:

| Field | Canonical/Current Writer | Notes |
|-------|--------------------------|-------|
| `TransactionID` | Written (`"WT" + UUID`) | Unique key |
| `WalletID` | Written | FK to Wallet |
| `UserID` | Written | Denormalized |
| `Type` | Written — always `"REWARD"` by current code | Credit/debit semantics may need CREDIT/DEBIT for admin adjustments |
| `Description` | Written (`reason`) | Not a formal column head; present at index 4 |
| `Source` | Written — always `"ADVERTISEMENT"` | Column head is `Source` at index 5 |
| `ReferenceID` | Written | Used for ad/campaign linkage |
| `Coins` | Written | Canonical amount field |
| `BalanceBefore` | Written | Present |
| `BalanceAfter` | Written | Present |
| `Status` | Written — always `"SUCCESS"` | Historical `"Completed"` exists; see §18 |
| `CreatedDate` | Written (`new Date()`) | Present |
| `CreatedBy` | Written — always `"SYSTEM"` | May need AdminID for 5.7C |
| `Amount` | **NOT written by current code** | Legacy fallback only |
| `BalanceBefore` alias `Before` | **Fallback** | Integrity code reads `tx.BalanceBefore || tx.Before` |
| `BalanceAfter` alias `After` | **Fallback** | Integrity code reads `tx.BalanceAfter || tx.After` |

## 8. BalanceBefore / BalanceAfter Accounting

**Calculation method:** Read `Wallet.Balance` first, compute `after = before + signedCoins`.

**Evidence:**
* `Backend/Wallet.js` `creditWallet`: `before = Number(wallet.Balance || 0); after = before + Number(coins);` — `coins` passed as positive from `claimReward`. Negative debits are not yet exercised by canonical helpers.
* `Backend/Promotions.js` `createPromotionTransaction`: passes `-totalCoins` to `createWalletTransaction`; before/after computed correctly before call.

**Credits:** stored as positive `Coins` with `Type = "REWARD"` (current code).

**Debits:** stored as negative `Coins` in the only observed write (`Promotions.js`).

**REWARD transactions:** use `Type = "REWARD"`.

**Corrections/reversals:** none exist.

**Partial failure:** Transaction insertion and wallet update are **sequential, not atomic**. `Promotions.js` implements manual rollback by catching `createWalletTransaction` failure and reverting `Wallet.Balance`. There is no Google Sheets transaction. A partial failure between `updateRow("Wallet", ...)` and `sheet.appendRow([...])` could leave `Wallet.Balance` updated without a corresponding transaction record.

## 9. Negative Balance Protection

**Observed protection:**
* `Backend/Promotions.js` `createPromotionTransaction`: explicit check `if (balance < totalCoins) throw new Error("Insufficient coins...");`.
* No protection in `Backend/Wallet.js` `updateWallet` or `creditWallet`.

**Conclusion:**
* Only promotion purchase path enforces non-negative balance.
* Public `updateWallet` can drive balance negative.
* Any 5.7C debit adjustment **must** include explicit negative-balance validation.

## 10. Duplicate & Idempotency Protection

### Observed Mechanisms

| Scope | Mechanism | Limitation |
|-------|-----------|------------|
| `claimReward` (ad reward) | `LockService.getScriptLock()` | Retry after lock release could still duplicate if not idempotent by data |
| `createPromotionTransaction` | No lock, single transaction call | No duplicate detection |
| `WalletTransactions` | **None** | No unique constraint, no `TransactionID` uniqueness check, no `ReferenceID` check |
| `AdRewardHistory` | none observed for duplicates | Historical duplicates exist per task notes (`RW002`, `RW003`) |

### Recommendation

Reuse `LockService.getScriptLock()` around any 5.7C adjustment, but this is insufficient for double-click/network retry without an idempotency check. The safest existing pattern is sheet lookup before insertion. A dedicated idempotency token or `AdjustmentID` in a new audit sheet is recommended.

## 11. Founder / Super Admin Authorization

**Framework:** `Backend/AdminAuth.js`

* `requireAdminSession(e)` validates `AdminSessions` sheet by session token, checks status `Active`, expiry, and calls `updateSessionActivity`.
* `getCurrentAdmin(e)` returns `{ admin, adminId }`.
* `hasPermission(admin, permission)` — Founder (`Role === "FOUNDER"`) bypasses permissions.
* `requireRole(e, role)` enforces exact role match (super admin/Super Admin not explicitly distinguishable from other roles unless a `SUPER_ADMIN` role is added).

**Evidence:**
* `AdminAuth.js` line 506: `if (String(admin.Role || "").toUpperCase() === "FOUNDER") return true;`
* `AdminAuth.js` line 583: strict role inequality check.

**Phase 5.7C implication:** use `requireAdminSession` + `requireRole(e, "FOUNDER")` or introduce `SUPER_ADMIN` as a second trusted role.

## 12. Existing Audit Infrastructure

**No dedicated economy adjustment audit system exists.**

* `ActivityLogs` sheet is referenced in `AdminAnalytics.js` for seller self-interaction protection, not economy corrections.
* `AdminSessions` records admin session metadata.
* No `AdjustmentID`, `RelatedTransactionID`, or explicit economy-correction log.

**Recommendation:** Phase 5.7C should introduce a dedicated `AdminEconomyAdjustments` sheet. Proposed schema §24.

## 13. Reward Mutation Architecture

See §3.2. `RewardEngine.claimReward` is the canonical reward mutation. It uses `creditWallet` + `AdRewardHistory` update + `Advertisements` pool update within a `LockService` block.

## 14. Campaign Economy Mutation Architecture

* `Promotion.js` manages PIP ad watch/reward distribution.
* `Promotions.js` manages promotion purchase (debit path).
* `PromotionCampaigns` sheet tracks pool economics.

## 15. Recommended Correction Accounting Model

**Recommended: Compensating Transaction (Model C)**

* Original transaction remains immutable.
* New transaction records correction with positive/negative `Coins`, `Type = "CREDIT"` or `"DEBIT"`, `ReferenceID` pointing to original, and updated `BalanceBefore`/`BalanceAfter`.
* Why safest:
  * Preserves immutable ledger.
  * Matches existing `createWalletTransaction` pattern.
  * Does not require rewriting `BalanceBefore`/`BalanceAfter` chain retroactively.

## 16. Original Transaction Reference Strategy

**Existing fields:** `ReferenceType` and `ReferenceID` are present and used for ad/campaign linkage. `AdminEconomyIntegrity.js` already groups transactions by `ReferenceID`.

**Recommendation:** reuse `ReferenceID` to store the `TransactionID` being corrected. If additional clarity is needed, a new `RelatedTransactionID` column can be added, but it is **not required** for Phase 5.7C implementation.

## 17. Users.TotalCoins vs Wallet.Balance

| Field | Observed current meaning | Mutated by |
|-------|--------------------------|------------|
| `Wallet.Balance` | Authoritative spendable balance | `creditWallet`, `createPromotionTransaction`, `updateWallet` |
| `Users.TotalCoins` | Legacy/placeholder. Used in `Auth.js` and `OTP.js` schema creation as initial zero. No observed live mutation from wallet code. | None in wallet/reward paths |
| `Wallet.TotalEarned` | Cumulative credited coins | `creditWallet` only |
| `Wallet.TotalSpent` | Cumulative spent coins | `Promotion.js` inline update |

**Conclusion:** `Wallet.Balance` is authoritative for spendable balance. `Users.TotalCoins` should **not** participate in 5.7C corrections to avoid corrupting legacy semantics.

## 18. Legacy Completed Status Compatibility

**Observed:**
* `RewardEngine.js` writes `Completed = "Yes"` in `AdRewardHistory`.
* `WalletTransactions` currently uses `Status = "SUCCESS"` only.
* `AdminEconomyIntegrity.js` treats `Completed` as success-equivalent only implicitly.

**Recommendation:** Treat `"Completed"` in `AdRewardHistory` as success-equivalent at read time. Do not rewrite historical rows.

## 19. W001 700-Coin Anomaly Safety

To implement Phase 5.7C without touching the W001 anomaly:

1. **No auto-reconciliation.** The integrity monitor must remain capable of reporting the mismatch.
2. **Introduce a dry-run/preview endpoint** (`adminadjustwalletpreview`) that computes the resulting balance and lists the proposed transaction without writing.
3. **Require explicit `adminadjustwallet` confirmation call** with `confirm = true` after preview review.
4. **Test adjustments must use a separate test wallet/fixture**, not `W001` or any live anomaly.

## 20. Concurrency / Partial-Failure Risks

* `WalletTransactions` insertion and `Wallet.Balance` update are sequential sheet operations.
* Only `RewardEngine.claimReward` uses `LockService`.
* `Promotions.js` rollback is best-effort (catches transaction creation failure).
* A crash between `updateRow("Wallet", ...)` and `appendRow([...])` leaves an unreconciled state.

## 21. Existing Functions to Reuse

| Function | File | Reason |
|----------|------|--------|
| `creditWallet` | `Backend/Wallet.js` | Canonical wallet credit |
| `createWalletTransaction` | `Backend/Wallet.js` | Canonical transaction row creation (extendable) |
| `getWalletRow` | `Backend/Wallet.js` | Wallet lookup |
| `updateRow` | (shared utility) | Sheet row update |
| `requireAdminSession` | `Backend/AdminAuth.js` | Session validation |
| `requireRole` | `Backend/AdminAuth.js` | Founder/Super Admin enforcement |
| `LockService.getScriptLock()` | GAS runtime | Concurrency protection |

## 22. Functions/Patterns That Must NOT Be Duplicated

* **Do not duplicate wallet balance arithmetic logic.** Reuse `getWalletRow` + explicit `before`/`after` computation inline, but do not write a parallel in-place wallet mutation outside of `creditWallet`/new debit helper.
* **Do not bypass `createWalletTransaction`.** All balance changes must create a transaction row.
* **Do not skip `requireAdminSession` / `requireRole`.** Server-side authorization is mandatory.

## 23. Proposed 5.7C Implementation File Map

| File | Responsibility | Reused Functions |
|------|----------------|------------------|
| `Backend/Wallet.js` | Add `debitWallet` (canonical debit), add `createAdminAdjustment` helper | `getWalletRow`, `createWalletTransaction`, `updateRow` |
| `Backend/AdminEconomy.js` | Add `adminAdjustWalletPreview`, `adminAdjustWallet`, `adminReverseTransaction` routes | `requireAdminSession`, `requireRole("FOUNDER")` |
| `Backend/AdminAuth.js` | Add `SUPER_ADMIN` role support if needed; reuse as-is | `requireAdminSession`, `requireRole` |
| `Backend/Code.js` | Route new actions (`adminadjustwalletpreview`, `adminadjustwallet`, `adminreversetransaction`) | Router switch |
| `Frontend/admin-wallet.js` | Add adjustment UI (preview + confirm + related transaction reference) | Existing module pattern |
| `Backend/AdminEconomyIntegrity.js` | Extend readers to support `DEBIT`/`CREDIT` alongside `REWARD` | `_getTxCoins`, `_signedTxCoins` |

## 24. Proposed Audit Schema — ONLY if Existing Infrastructure Is Insufficient

**Sheet:** `AdminEconomyAdjustments`

| Column | Purpose |
|--------|---------|
| `AdjustmentID` | Unique ID (`AJ` + UUID) |
| `WalletID` | Target wallet |
| `UserID` | Target user |
| `AdminID` | Performing admin |
| `Action` | `CREDIT_ADJUSTMENT`, `DEBIT_ADJUSTMENT`, `REVERSAL` |
| `Coins` | Absolute value |
| `Reason` | Admin-provided reason |
| `ReferenceType` | Original transaction type (`REWARD`, `DEBIT`, etc.) |
| `ReferenceID` | Original `TransactionID` if reversal |
| `BalanceBefore` | Wallet balance before |
| `BalanceAfter` | Wallet balance after |
| `RelatedTransactionID` | New wallet transaction if different from ReferenceID |
| `Status` | `PENDING`, `CONFIRMED`, `FAILED` |
| `DryRun` | `true` for previews |
| `CreatedDate` | Timestamp |

## 25. Recommended Review → Confirm → Execute Workflow

1. **Preview (READ-ONLY):** Admin selects wallet, enters delta and reason. Backend returns proposed `BalanceAfter`, proposed transaction row, validation result.
2. **Confirm:** Admin clicks confirm. Backend re-validates session and current balance (to prevent stale preview), executes visible transaction.
3. **Audit:** Backend writes `AdminEconomyAdjustments` row and returns result.

## 26. Risks / Open Questions

* **Users.TotalCoins semantics unknown.** If it is ever legacy-used elsewhere, corrections touching Wallet.Balance alone may appear inconsistent.
* **No atomic Google Sheets transaction.** Partial-failure state possible between `updateRow("Wallet")` and `sheet.appendRow(...)`.
* **Duplicate/idempotency gap.** Double-click or retry can create duplicate transactions. `LockService` helps but is not a full idempotency solution.
* **Negative balance bypass.** Public `updateWallet` can drive negative balances if reachable.
* **Canonical transaction Type.** Current `createWalletTransaction` hardcodes `REWARD`. 5.7C needs `CREDIT`/`DEBIT` type support.

## 27. Final Recommendation for Phase 5.7C-B

Implement the preview/confirm workflow with:

* New canonical `debitWallet` in `Backend/Wallet.js`.
* New `adminAdjustWalletPreview` and `adminAdjustWallet` in `Backend/AdminEconomy.js`.
* `AdminEconomyAdjustments` sheet for audit.
* Frontend adjustment UI in `Frontend/admin-wallet.js`.
* Strict server-side enforcement via `requireAdminSession` + `requireRole("FOUNDER")`.

---

# Required Direct Answers

1. **What is the canonical wallet credit function?**
   `creditWallet` in `Backend/Wallet.js` (lines 151–194).

2. **What is the canonical wallet debit function?**
   NOT ESTABLISHED FROM CURRENT CODE. No canonical debit function exists. Promotions perform inline debit sequences.

3. **What function creates WalletTransactions?**
   `createWalletTransaction` in `Backend/Wallet.js` (lines 197–229).

4. **What exact WalletTransactions schema is currently used?**
   Columns written by current code: `TransactionID`, `WalletID`, `UserID`, `Type` (`REWARD`), `Description` (reason), `Source` (`ADVERTISEMENT`), `ReferenceID`, `Coins`, `BalanceBefore`, `BalanceAfter`, `Status` (`SUCCESS`), `CreatedDate`, `CreatedBy` (`SYSTEM`). Legacy fallbacks also observed: `Amount`, `Before`, `After`.

5. **How are BalanceBefore and BalanceAfter calculated?**
   `before = Number(wallet.Balance || 0)` read before mutation; `after = before + signedCoins`; then `Wallet.Balance` is set to `after`. Coins sign is determined by caller (`creditWallet` passes positive, `Promotions.js` passes negative).

6. **What prevents negative balances?**
   Only `Promotions.js createPromotionTransaction` explicitly checks `balance < totalCoins`. Public `updateWallet` and `creditWallet` have no negative-balance protection.

7. **What prevents duplicate transactions/rewards?**
   `LockService.getScriptLock()` in `RewardEngine.claimReward` and `Promotion.js` claim flows. No unique constraint or idempotency token on `WalletTransactions`. Historical duplicate rewards exist.

8. **How are Founder/Admin permissions checked?**
   `requireAdminSession(e)` + `hasPermission(admin, permission)` in `Backend/AdminAuth.js`. Founder bypasses permission checks (`Role === "FOUNDER"`). `requireRole(e, role)` enforces exact role.

9. **What existing audit-log infrastructure can be reused?**
   NOT ESTABLISHED FROM CURRENT CODE as suitable for economy adjustments. `ActivityLogs` exists but is not integrated into wallet/reward mutation. Recommend a new `AdminEconomyAdjustments` sheet.

10. **Should corrections be represented as adjustment, reversal, compensating transaction, or another model?**
    Compensating transaction (Model C). Append a new transaction with opposite sign and reference to original.

11. **How should a correction reference the original transaction?**
    Reuse `ReferenceID` to hold the original `TransactionID`. `AdminEconomyIntegrity.js` already groups by `ReferenceID`.

12. **How can retry/double-click duplicate adjustments be prevented?**
    NOT ESTABLISHED FROM CURRENT CODE for admin adjustments. Existing code relies on `LockService` for rewards only. 5.7C should add explicit lookup-based idempotency (e.g., unique `AdjustmentID` and pre-submit existence check).

13. **Should Users.TotalCoins participate in wallet corrections, or is Wallet.Balance authoritative?**
    `Wallet.Balance` is authoritative. `Users.TotalCoins` is legacy/static in this architecture and should not be updated by corrections.

14. **How should historical records with `Status=Completed` be treated?**
    Treat as success-equivalent at read time. Do not rewrite.

15. **How can 5.7C be implemented without changing the current W001 700-coin anomaly?**
    Use a dry-run preview endpoint, explicit confirm step, and test fixtures. Do not auto-reconcile or alter `W001`.

16. **Which files would need modification in the implementation stage?**
    `Backend/Wallet.js`, `Backend/AdminEconomy.js`, `Backend/Code.js`, `Frontend/admin-wallet.js`, possibly `Backend/AdminAuth.js`.

17. **Which existing functions should be reused instead of duplicated?**
    `creditWallet`, `createWalletTransaction`, `getWalletRow`, `requireAdminSession`, `hasPermission`, `requireRole`, `LockService.getScriptLock()`, `updateRow`.

---

*Discovery completed in READ-ONLY mode. No runtime files modified.*