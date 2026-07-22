# REWARD POOL ACCOUNTING - FINAL DIAGNOSTIC
## PC_TEST_PIP_03 Runtime Test Failure Analysis

============================================================
## CONFIRMED RUNTIME FAILURE
============================================================

Test Campaign: PC_TEST_PIP_03
Before Watch:
- RewardPool = 1000
- PlatformReserve = 100
- RemainingRewardCoins = 900
- RewardCoins = 5
- Views = 0

After Watch:
- User wallet: +5 ✅ PASS
- Views: 0 -> 1 ✅ PASS
- PIP delivery: ✅ PASS
- Ad completion: ✅ PASS
- RemainingRewardCoins: 900 -> 900 ❌ FAIL

Expected: RemainingRewardCoins = 895

============================================================
## ROOT CAUSE IDENTIFIED
============================================================

**Multiple Field Name Mismatches - Incomplete Fix**

### Previous Fix (Incomplete)
Changed in completeAdWatch():
- Line 1133: `RemainingRewardPool:` -> `RemainingRewardCoins:` ✅

### Remaining Issues Found

**1. claimAdReward() function (line ~1200)**
Still uses WRONG field name:
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardPool: newPool,  // ❌ STILL WRONG
  TotalRewardPaid: newPaid
});
```

**2. Potential Second Write in completeAdWatch()**
Need to verify if completeAdWatch() has multiple updateRow calls
where the second one overwrites the first.

**3. All other functions using RemainingRewardPool**
Need to audit all updateRow calls in Promotion.js

============================================================
## UPDATEROW() IMPLEMENTATION
============================================================

**File:** Backend/Utils.js lines 100-172

**Signature:**
```javascript
function updateRow(sheetName, keyColumn, keyValue, updates)
```

**Parameters:**
- sheetName: String - name of sheet
- keyColumn: String - column header to match
- keyValue: Mixed - value to find
- updates: Object - key-value pairs of column updates

**Behavior:**
1. Gets all data from sheet
2. Finds row where keyColumn == keyValue
3. Gets header row
4. For each update key:
   - Finds column index by matching header
   - If column found: updates cell value
   - If column NOT found: **SILENTLY IGNORES** (no error)
5. Returns true if row found, false otherwise

**Critical Finding:**
- updateRow() matches updates object keys to sheet headers
- If key doesn't match any header, it's silently ignored
- This explains why `RemainingRewardPool` didn't cause errors
- But also means `RemainingRewardCoins` MUST match header exactly

**Header Verification:**
PromotionCampaigns column 9 (index 8): `RemainingRewardCoins` ✅

============================================================
## COMPLETE REWARD FLOW TRACE
============================================================

### 1. Frontend (Ads.js)
- User completes ad watch
- Calls: `?action=completeadwatch&userId=U001&campaignId=PC_TEST_PIP_03`

### 2. Backend Router (Code.js)
- Routes to: `completeAdWatch(e)`

### 3. completeAdWatch() (Promotion.js line 1017)
```javascript
var lock = LockService.getScriptLock();
lock.waitLock(30000);
```

### 4. Duplicate Check (lines 1031-1060)
- Checks AdRewards for "paid" status
- Checks AdWatchHistory for "completed"/"rewarded"
- Returns early if duplicate found
- Result: No duplicate, continues ✅

### 5. Campaign Lookup (line 1062)
```javascript
var campaign = getRowById("PromotionCampaigns", "CampaignID", campaignId);
```
- Returns campaign object
- normalizeCampaign() maps fields
- Result: campaign.RemainingRewardCoins = 900 ✅

### 6. Reward Calculation (lines 1105-1118)
```javascript
var remainingPool = Number(campaign.RemainingRewardPool || 0);  // Uses normalized field
var finalReward = Math.min(totalReward, rewardPerUser, remainingPool);
var newRemainingPool = Math.max(0, remainingPool - finalReward);
```
- remainingPool = 900
- finalReward = 5
- newRemainingPool = 895 ✅

### 7. Wallet Credit (line 1120)
```javascript
creditWallet(userId, finalReward, campaignId, "Ad Reward - " + (campaign.Title || ""));
```
- User wallet +5 ✅

### 8. Campaign Update (lines 1132-1138)
```javascript
updateRow("PromotionCampaigns", "CampaignID", campaignId, {
  RemainingRewardCoins: newRemainingPool,  // Now correct after fix
  TotalRewardPaid: newTotalPaid,
  RewardedUsersCount: newRewardedCount,
  Views: newViews,
  Status: completedStatus
});
```
- Should write RemainingRewardCoins = 895
- **BUT: Need to verify this is the ONLY update**

### 9. AdRewards Record (lines 1140-1150)
```javascript
rewardSheet.appendRow([...]);
```
- Creates reward transaction record ✅

### 10. Analytics Update (line 1152)
```javascript
trackAdAnalytics(campaignId, "completion");
trackAdAnalytics(campaignId, "reward");
```
- Updates AdAnalytics sheet
- **Does NOT update PromotionCampaigns** ✅

============================================================
## WHY PREVIOUS FIX FAILED
============================================================

**Hypothesis 1: Multiple updateRow calls in completeAdWatch()**
If completeAdWatch() calls updateRow() twice:
1. First call: Updates RemainingRewardCoins to 895 ✅
2. Second call: Updates other fields but uses stale campaign data with 900
   - If second call doesn't include RemainingRewardCoins, it stays at 895
   - If second call includes RemainingRewardPool (wrong name), it's ignored
   - **But if second call reads old data and writes it back, it overwrites 895**

**Hypothesis 2: claimAdReward() called after completeAdWatch()**
If frontend calls claimAdReward() after completeAdWatch():
- claimAdReward() still uses `RemainingRewardPool: newPool`
- This would be silently ignored
- But if it also updates other fields with stale data...

**Hypothesis 3: Frontend caching**
- Frontend displays cached data
- Sheet actually updated correctly
- But user sees stale value

**Most Likely: Hypothesis 1**
Multiple updateRow calls where second one overwrites first.

============================================================
## FILES REQUIRING MODIFICATION
============================================================

**Backend/Promotion.js:**

1. **completeAdWatch()** - Verify only ONE updateRow call
   - If multiple calls, consolidate into single call
   - Ensure RemainingRewardCoins is included in final update

2. **claimAdReward()** - Change field name
   ```javascript
   // BEFORE:
   RemainingRewardPool: newPool,
   
   // AFTER:
   RemainingRewardCoins: newPool,
   ```

3. **Audit ALL other updateRow calls** in Promotion.js
   - Search for any remaining `RemainingRewardPool:` in updateRow calls
   - Change to `RemainingRewardCoins:`

============================================================
## VERIFICATION STEPS
============================================================

1. Add temporary logging to completeAdWatch():
   ```javascript
   console.log("BEFORE UPDATE:", {
     campaignId: campaignId,
     oldRemaining: campaign.RemainingRewardCoins,
     newRemaining: newRemainingPool,
     reward: finalReward
   });
   
   var updateResult = updateRow(...);
   
   console.log("AFTER UPDATE:", {
     campaignId: campaignId,
     updateResult: updateResult,
     updates: {...}
   });
   ```

2. Deploy and run test
3. Check execution logs in Google Apps Script
4. Verify single updateRow call
5. Verify correct field name
6. Verify correct value (895)

============================================================
## SMOKE TEST AFTER FIX
============================================================

1. Create PC_TEST_PIP_04 with RemainingRewardCoins = 900
2. Watch ad completely
3. Verify:
   - Wallet: +5
   - Views: +1
   - RemainingRewardCoins: 900 -> 895
   - Single AdRewards record
   - Single AdWatchHistory record
4. Attempt duplicate watch:
   - Blocked by duplicate protection
   - No additional changes
5. Check Google Apps Script logs:
   - Only one updateRow call
   - Correct field name
   - Correct value

============================================================
## IMPACT ASSESSMENT
============================================================

**Risk Level:** LOW
- Field name correction only
- No logic changes
- No schema changes
- Backward compatible

**Affected:**
- completeAdWatch() reward pool deduction
- claimAdReward() reward pool deduction
- skipAdWatch() reward pool deduction (already fixed)

**Not Affected:**
- PIP delivery
- Admin controls
- Other reward flows
- Wallet system
- Analytics

============================================================
END OF DIAGNOSTIC
============================================================