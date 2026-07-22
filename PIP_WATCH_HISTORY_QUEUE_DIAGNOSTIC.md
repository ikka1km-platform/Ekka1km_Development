# PIP WATCH-HISTORY / QUEUE ELIGIBILITY DIAGNOSTIC

============================================================
## ROOT CAUSE IDENTIFIED
============================================================

**getPipQueue() does NOT filter user-specific watch history**

### Current Behavior
1. getPipQueue() returns ALL campaigns matching generic criteria (active, PIP enabled, date valid, pool > 0)
2. It does NOT check if the current user has already completed the campaign
3. User clicks "Watch" on a completed campaign
4. startAdWatch() rejects as duplicate
5. Poor UX: campaign appears in queue but can't be watched

### Why New Campaigns Appear "Already Completed"
**Not confirmed as a bug.** The duplicate detection in startAdWatch() correctly checks:
- UserID + CampaignID exact match
- Status = "completed" or "rewarded"

A new CampaignID should NOT match old history. If this occurs, possible causes:
1. CampaignID collision (unlikely with UUID-based generation)
2. User confusion about which campaign is new
3. Frontend caching old queue

============================================================
## EXISTING DUPLICATE DETECTION KEY
============================================================

**Location:** startAdWatch() lines 1047-1060

**Key:** UserID + CampaignID (exact match)

**Schema:** AdWatchHistory
```
WatchID | UserID | CampaignID | AdID | Status | RewardGiven | RewardCoins | WatchStartTime | WatchEndTime | DurationWatched | CreatedAt
```

**Check:**
```javascript
String(existingHistory[h].UserID) === String(userId) &&
String(existingHistory[h].CampaignID) === String(campaignId) &&
(String(existingHistory[h].Status) === "completed" || String(existingHistory[h].Status) === "rewarded")
```

**Also checks:** AdRewards sheet for Status === "paid"

============================================================
## THE FIX
============================================================

**Add user-specific watch history filtering to getPipQueue()**

For RewardType = ONCE campaigns:
- Check AdWatchHistory for current user + campaign
- If found with status "completed" or "rewarded", exclude from queue

For RewardType = DAILY/WEEKLY:
- Check if completed today/this week
- Exclude if already completed in current period

**Location:** Backend/Promotion.js, getPipQueue() function
**Lines:** After line 331 (after generic filters, before result.push)

============================================================
## EXPECTED BEHAVIOR AFTER FIX
============================================================

User completed PC_TEST_PIP_02:
- getPipQueue() returns: PC_TEST_PIP_03, PC_TEST_PIP_04 (excluding PC_TEST_PIP_02)
- User can watch PC_TEST_PIP_03 and PC_TEST_PIP_04

After completing PC_TEST_PIP_03:
- getPipQueue() returns: PC_TEST_PIP_04 only
- PC_TEST_PIP_02 and PC_TEST_PIP_03 excluded

Another user (U002) who hasn't watched any:
- getPipQueue() returns: PC_TEST_PIP_02, PC_TEST_PIP_03, PC_TEST_PIP_04
- All campaigns eligible

============================================================
## FILES TO MODIFY
============================================================

**Backend/Promotion.js:**
- Function: getPipQueue()
- Add: User-specific watch history filter after line 331
- Preserve: Existing priority sorting logic
- Preserve: DAILY/WEEKLY repeat logic if exists

**No other files require modification**

============================================================
## SAFETY PRESERVATION
============================================================

✅ Duplicate reward protection: Intact (startAdWatch() still validates)
✅ LockService: Intact
✅ Insufficient pool protection: Intact
✅ Negative pool prevention: Intact
✅ Wallet credit logic: Intact
✅ RemainingRewardCoins deduction: Intact
✅ View accounting: Intact
✅ Reward economics: Unchanged

============================================================
## SMOKE TEST
============================================================

1. Create 3 test campaigns: PC_TEST_PIP_02, PC_TEST_PIP_03, PC_TEST_PIP_04
2. All with RewardCoins = 5, RemainingRewardCoins = 900
3. User U001 completes PC_TEST_PIP_02
4. Call getPipQueue() for U001:
   - Expected: PC_TEST_PIP_03, PC_TEST_PIP_04 (PC_TEST_PIP_02 excluded)
5. User U001 completes PC_TEST_PIP_03
6. Call getPipQueue() for U001:
   - Expected: PC_TEST_PIP_04 only
7. User U002 (different user) calls getPipQueue():
   - Expected: All 3 campaigns (none completed by U002)
8. Verify no console errors
9. Verify PIP delivery works for eligible campaigns

============================================================
END OF DIAGNOSTIC
============================================================