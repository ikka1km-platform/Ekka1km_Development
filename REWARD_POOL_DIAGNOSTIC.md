# REWARD POOL ACCOUNTING DIAGNOSTIC
## PC_TEST_PIP_02 RemainingRewardCoins Not Deducted

============================================================
## ROOT CAUSE IDENTIFIED
============================================================

**Field Name Mismatch Between Schema and Code**

### Database Schema (PromotionCampaigns sheet)
**Column name:** `RemainingRewardCoins` (line 2355 in Promotion.js)

### Code References
**Backend/Promotion.js normalizeCampaign() line 196:**
```javascript
if (!c.RemainingRewardPool) c.RemainingRewardPool = Number(c.RemainingRewardCoins || c.RewardPool || 0);
```

**Backend/Promotion.js completeAdWatch() line 1132-1138:**
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardPool: newRemainingPool,  // ❌ WRONG FIELD NAME
  TotalRewardPaid: newTotalPaid,
  RewardedUsersCount: newRewardedCount,
  Views: newViews,
  Status: completedStatus
});
```

**Problem:**
- Code tries to update `RemainingRewardPool` (doesn't exist in schema)
- Actual column name is `RemainingRewardCoins`
- `updateRow()` silently fails to update non-existent field
- Result: RemainingRewardCoins stays at 900 instead of becoming 895

============================================================
## EXISTING REWARD FLOW TRACE
============================================================

### 1. Frontend: User completes ad watch
**File:** Frontend/Ads.js
**Function:** `completeAdWatch()` or similar
**Action:** Calls backend `completeadwatch` API

### 2. Backend: completeAdWatch() receives request
**File:** Backend/Promotion.js
**Function:** `completeAdWatch(e)` (line 1017)
**Actions:**
- Validates user hasn't already completed (duplicate check)
- Calculates finalReward = 5 coins
- Credits wallet via `creditWallet(userId, 5, campaignId, ...)`
- Updates campaign stats
- Creates AdRewards record

### 3. Wallet Credit
**Function:** `creditWallet()` (in Wallet.js or Promotion.js)
**Action:** Adds 5 coins to user wallet
**Status:** ✅ WORKING (user received +5 coins)

### 4. Campaign Update (BROKEN)
**Function:** `completeAdWatch()` line 1132
**Code:**
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardPool: newRemainingPool,  // ❌ Should be RemainingRewardCoins
  TotalRewardPaid: newTotalPaid,
  RewardedUsersCount: newRewardedCount,
  Views: newViews,
  Status: completedStatus
});
```

**Expected:** RemainingRewardCoins = 900 - 5 = 895
**Actual:** RemainingRewardCoins stays at 900 (not updated)

### 5. Transaction Record
**File:** Backend/Promotion.js
**Function:** completeAdWatch() line 1140-1150
**Action:** Creates AdRewards record
**Status:** ✅ WORKING

============================================================
## ANSWERS TO DIAGNOSTIC QUESTIONS
============================================================

### 1. Which backend function credits the +5 coins?
**Answer:** `creditWallet()` called from `completeAdWatch()` at line 1115

### 2. Which frontend function calls that backend function?
**Answer:** Frontend/Ads.js calls `?action=completeadwatch` API endpoint

### 3. Is RemainingRewardCoins supposed to be deducted?
**Answer:** YES - Line 1118 calculates `newRemainingPool = remainingPool - finalReward`
**But:** Line 1133 tries to write to wrong field name

### 4. Is there an existing reward-engine function for campaign pool deduction?
**Answer:** YES - The logic exists in `completeAdWatch()` but uses wrong field name

### 5. Is the frontend displaying +5 optimistically or did backend confirm?
**Answer:** Backend confirmed - `creditWallet()` succeeded, AdRewards record created

### 6. Is there a WalletTransactions/AdReward record created?
**Answer:** YES - AdRewards sheet record created at line 1140-1150

### 7. Is duplicate reward protection active?
**Answer:** YES - Lines 1031-1045 check AdRewards, lines 1047-1060 check AdWatchHistory

### 8. Why did Views increment but RemainingRewardCoins did not?
**Answer:** 
- Views field name is correct in schema
- RemainingRewardPool field name is WRONG (should be RemainingRewardCoins)

### 9. What do RewardPool=1000, PlatformReserve=100, RemainingRewardCoins=900 mean?
**Answer:**
- RewardPool = Total campaign budget (1000)
- PlatformReserve = Platform's cut (100)
- RemainingRewardCoins = Distributable to users (900)
- Yes, 900 is the user reward pool

============================================================
## THE FIX
============================================================

**File:** Backend/Promotion.js
**Function:** completeAdWatch() line 1132
**Change:** Replace `RemainingRewardPool` with `RemainingRewardCoins`

**BEFORE:**
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardPool: newRemainingPool,
  TotalRewardPaid: newTotalPaid,
  RewardedUsersCount: newRewardedCount,
  Views: newViews,
  Status: completedStatus
});
```

**AFTER:**
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardCoins: newRemainingPool,
  TotalRewardPaid: newTotalPaid,
  RewardedUsersCount: newRewardedCount,
  Views: newViews,
  Status: completedStatus
});
```

**Also check:** skipAdWatch() function for same issue

============================================================
## ECONOMY SAFETY ANALYSIS
============================================================

### Current State (Broken)
- User wallet: +5 ✅
- AdRewards record: Created ✅
- Views: Incremented ✅
- RemainingRewardCoins: NOT updated ❌
- Result: Reward pool accounting is broken

### After Fix
- User wallet: +5 ✅
- AdRewards record: Created ✅
- Views: Incremented ✅
- RemainingRewardCoins: 900 → 895 ✅
- Result: Proper accounting

### Safety Checks
1. ✅ Duplicate prevention already exists
2. ✅ Insufficient pool check exists (line 1079)
3. ✅ Negative pool prevention exists (line 1118: `Math.max(0, ...)`)
4. ✅ No double credit (single creditWallet call)
5. ✅ No race conditions (LockService used)

============================================================
## DUPLICATE-REWARD SAFETY
============================================================

**Existing Protection:**
1. AdRewards sheet check (lines 1031-1045)
2. AdWatchHistory sheet check (lines 1047-1060)
3. Both check for "paid" or "completed"/"rewarded" status
4. Returns early if duplicate found

**After Fix:**
- Duplicate protection remains intact
- No changes to duplicate detection logic
- Only fix is field name for pool deduction

============================================================
## SMOKE TEST STEPS
============================================================

1. Deploy fixed Backend/Promotion.js
2. Reset PC_TEST_PIP_02 RemainingRewardCoins to 900
3. Clear AdWatchHistory and AdRewards for test user
4. Watch PC_TEST_PIP_02 ad completely
5. Verify:
   - User wallet increases by 5
   - RemainingRewardCoins decreases to 895
   - Views increments to 1
   - AdRewards record created
   - AdWatchHistory record created
6. Attempt duplicate watch:
   - Should be blocked
   - No additional wallet credit
   - No additional pool deduction
7. Test with insufficient pool (set to 3):
   - Should credit only 3 coins
   - RemainingRewardCoins should be 0
   - Campaign status should become "Completed"

============================================================
## FILES TO MODIFY
============================================================

**Backend/Promotion.js:**
- Line 1133: Change `RemainingRewardPool:` to `RemainingRewardCoins:`
- Check line 1022 in skipAdWatch() for same issue

**No other files require modification**

============================================================
## IMPACT ASSESSMENT
============================================================

**Risk Level:** LOW
- Single field name correction
- No logic changes
- No schema changes
- Backward compatible
- Isolated to reward completion flow

**Affected:**
- PIP reward completion
- Ad watch completion
- Reward pool accounting

**Not Affected:**
- PIP delivery
- Admin controls
- Other reward flows
- Wallet system
- Analytics

============================================================
END OF DIAGNOSTIC REPORT
============================================================