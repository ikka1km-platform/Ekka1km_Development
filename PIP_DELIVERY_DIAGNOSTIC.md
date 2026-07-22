# PIP DELIVERY DIAGNOSTIC REPORT
## PC_TEST_PIP_02 Exclusion Analysis

============================================================
## CAMPAIGN DETAILS
============================================================

CampaignID: PC_TEST_PIP_02
Status: Active
PIPEnabled: Yes
StartDate: 2026-07-23
EndDate: 2026-08-23
RemainingRewardCoins: 900
RewardPool: 1000
OwnerUserID: U001
Current User: U001 (logged in)

============================================================
## PIP ELIGIBILITY TRACE
============================================================

### Filter 1: Status Check
**Location:** Backend/Promotion.js line 315
**Code:** `if (status !== "active") return;`
**Input:** "Active" (normalized to "active")
**Expected:** Pass
**Actual:** PASS ✅

### Filter 2: PIPEnabled Check
**Location:** Backend/Promotion.js line 316
**Code:** `if (pip !== "yes" && pip !== "true") return;`
**Input:** "Yes" (normalized to "yes" by toLowerCase())
**Expected:** Pass
**Actual:** PASS ✅

### Filter 3: StartDate Check
**Location:** Backend/Promotion.js line 317
**Code:** `if (start && start > now) return;`
**Input:** StartDate = "2026-07-23"
**Parsed:** new Date("2026-07-23") = 2026-07-23T00:00:00 **UTC**
**Current Time:** 2026-07-23T00:09:57 **IST** (UTC+5:30)
**UTC Conversion:** 2026-07-23T00:09:57 IST = 2026-07-22T18:39:57 UTC
**Comparison:** 2026-07-23T00:00:00 UTC > 2026-07-22T18:39:57 UTC
**Expected:** Pass (start date is today)
**Actual:** **FAIL** ❌
**Result:** CAMPAIGN EXCLUDED

### Filter 4: EndDate Check
**Location:** Backend/Promotion.js line 318
**Code:** `if (end && end < now) return;`
**Input:** EndDate = "2026-08-23"
**Status:** Not reached (filter 3 already excluded)
**Result:** N/A

### Filter 5: Reward Pool Check
**Location:** Backend/Promotion.js line 319
**Code:** `if (remainingPool <= 0) return;`
**Input:** 900
**Expected:** Pass
**Actual:** PASS ✅ (not reached)

### Filter 6: Max Views Check
**Location:** Backend/Promotion.js line 320
**Code:** `if (maxViews > 0 && currentViews >= maxViews) return;`
**Input:** maxViews = 0, currentViews = 0
**Expected:** Pass (maxViews is 0, condition is false)
**Actual:** PASS ✅ (not reached)

============================================================
## ROOT CAUSE IDENTIFIED
============================================================

**PRIMARY ISSUE: Timezone Mismatch in Date Comparison**

**Location:** Backend/Promotion.js lines 309-318

**Problem:**
1. Google Sheets stores dates as ISO 8601 strings with UTC timezone (e.g., "2026-07-23T00:00:00Z")
2. When parsed by `new Date("2026-07-23")`, JavaScript interprets this as UTC midnight
3. Current time `new Date()` returns local time (IST in this case)
4. Comparison `start > now` compares UTC date with local date
5. UTC midnight (2026-07-23T00:00:00Z) = 2026-07-23T05:30:00 IST
6. Current time (2026-07-23T00:09:57 IST) is BEFORE UTC midnight converted to IST
7. Result: start > now evaluates to TRUE, campaign excluded

**Example Timeline:**
- Campaign StartDate: 2026-07-23T00:00:00Z (UTC)
- Converted to IST: 2026-07-23T05:30:00 IST
- Current Time: 2026-07-23T00:09:57 IST
- Comparison: 05:30:00 > 00:09:57 = TRUE
- Result: Campaign excluded because it appears to start in the future

============================================================
## SECONDARY ISSUES CHECKED
============================================================

### Owner/Self-Ad Protection
**Status:** NOT FOUND in getPipQueue()
**Finding:** Backend does NOT filter by owner
**Frontend:** No owner filtering in Ads.js
**Result:** NOT THE CAUSE ✅

### Radius/Location Filtering
**Status:** NOT FOUND in getPipQueue()
**Finding:** PIP queue does NOT filter by radius/location
**Result:** NOT THE CAUSE ✅

### Watch History Exclusion
**Status:** Used for SORTING only (lines 329-351)
**Finding:** Watch history does NOT exclude campaigns from queue
**Result:** NOT THE CAUSE ✅

### Image/Creative Validation
**Status:** NOT FOUND in getPipQueue()
**Finding:** No ImageURL validation in PIP eligibility
**Result:** NOT THE CAUSE ✅

============================================================
## COMPARISON WITH WORKING PC001
============================================================

**PC001 (Working):**
- Likely has StartDate in the past (before current date)
- Date comparison passes
- Campaign appears in PIP queue

**PC_TEST_PIP_02 (Not Working):**
- StartDate: 2026-07-23 (today)
- Date comparison fails due to timezone mismatch
- Campaign excluded from PIP queue

**Key Difference:** StartDate timing relative to timezone conversion

============================================================
## RECOMMENDED FIX
============================================================

**Location:** Backend/Promotion.js, getPipQueue() function, lines 309-318

**Solution:** Normalize dates to local time before comparison

**Change:**
```javascript
// BEFORE (lines 309-318):
var start = c.StartDate ? new Date(c.StartDate) : null;
var end = c.EndDate ? new Date(c.EndDate) : null;
var now = new Date();

if (status !== "active") return;
if (pip !== "yes" && pip !== "true") return;
if (start && start > now) return;
if (end && end < now) return;

// AFTER:
var start = c.StartDate ? new Date(c.StartDate) : null;
var end = c.EndDate ? new Date(c.EndDate) : null;
var now = new Date();

// Normalize all dates to start of day in local time for fair comparison
if (start) {
  start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
}
if (end) {
  end = new Date(end.getFullYear(), end.getMonth(), end.getDate());
}
now = new Date(now.getFullYear(), now.getMonth(), now.getDate());

if (status !== "active") return;
if (pip !== "yes" && pip !== "true") return;
if (start && start > now) return;
if (end && end < now) return;
```

**Why This Works:**
1. Strips time component from all dates
2. Uses local timezone consistently
3. Compares date-only values (year, month, day)
4. Eliminates timezone and time-of-day issues

============================================================
## SMOKE TEST PROCEDURE
============================================================

1. Apply fix to Backend/Promotion.js
2. Deploy to Google Apps Script
3. Clear browser cache
4. Open user app as U001
5. Navigate to Reward Ads page
6. Verify PC_TEST_PIP_02 appears in PIP queue
7. Verify campaign displays correctly
8. Verify ad watch flow works
9. Test with campaign StartDate in future (should be excluded)
10. Test with campaign EndDate in past (should be excluded)

============================================================
## IMPACT ASSESSMENT
============================================================

**Affected Systems:**
- PIP queue loading (getPipQueue)
- Ad delivery eligibility

**Not Affected:**
- Admin campaign management
- Reward economy
- Watch history tracking
- Analytics
- Other modules

**Risk Level:** LOW
- Fix is localized to date comparison logic
- No schema changes
- No economy changes
- Backward compatible

============================================================
## FILES TO MODIFY
============================================================

**Backend/Promotion.js**
- Function: getPipQueue()
- Lines: 309-318
- Change: Add date normalization before comparison

**No other files need modification**

============================================================
END OF DIAGNOSTIC REPORT
============================================================