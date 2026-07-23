# PERFORMANCE DIAGNOSTIC — Ekka1km

**Date:** 2026-07-23  
**Scope:** Read-only investigation of frontend API request flow, backend GAS/Sheets architecture, and loading latency  
**Status:** DIAGNOSTIC ONLY — NO FILES MODIFIED

---

## 1. EXECUTIVE SUMMARY

The Ekka1km application (Frontend: HTML/CSS/JS via VS Code Live Server, Backend: Google Apps Script, Database: Google Sheets) exhibits noticeable loading delays across both the Super Admin Dashboard and the User Application. The root cause is **not** Live Server latency but rather a combination of:

1. **Sequential API calls** — The admin module system (`admin-modules.js`) performs a session validation API call *before every module load*, then the module itself makes its own API call(s). This doubles the request chain for every navigation.
2. **Full-sheet reads on every request** — Every backend API function calls `getSheetData()` which reads the **entire sheet** via `getDataRange().getValues()`. Multiple sheets are read per request, and the same sheets are re-read across different API endpoints.
3. **No caching** — Neither frontend nor backend caches any data. Every module switch, page navigation, or filter change triggers fresh full-sheet reads.
4. **Authentication overhead** — `requireAdminSession()` reads the AdminSessions sheet on every admin API call, and `findAdminById()` reads the Admins sheet on every session validation.
5. **N+1 patterns** — Some backend functions read a sheet, then iterate rows and call other functions that re-read the same or additional sheets.

---

## 2. LIVE SERVER ANALYSIS

**Verdict: Live Server is NOT the bottleneck.**

| Layer | Typical Latency | Notes |
|-------|----------------|-------|
| HTML/static assets (Live Server) | < 5ms | Local file serving, negligible |
| Frontend JS rendering | 10–50ms | DOM manipulation, not significant |
| Google Apps Script execution | 200–2000ms | Cold start adds 1–2s |
| Google Sheets read (full sheet) | 100–1000ms per sheet | Scales with row count |
| Network round-trip (GAS) | 100–500ms | Depends on location |

The "Loading..." message appears because the frontend must wait for 1–3 sequential GAS API calls, each of which reads 1–5 full sheets. The cumulative backend processing time is the primary cause of perceived slowness.

---

## 3. ADMIN DASHBOARD REQUEST ARCHITECTURE

### 3.1 Dashboard Initialization (`dashboard.js`)

When the admin dashboard loads, the following happens **sequentially**:

```
Step 1: AdminAuth.validateSession()
  → fetch(?action=adminvalidatesession&session=TOKEN)
  → Backend: validateAdminSession()
    → findAdminSession() → reads AdminSessions sheet (full)
    → findAdminById() → reads Admins sheet (full)
    → updateSessionActivity() → writes to AdminSessions sheet

Step 2: Dashboard.loadDashboardData()
  → fetch(?action=admindashboardsummary&session=TOKEN)
  → Backend: getAdminDashboardSummary()
    → getDashboardOverviewData()
      → getSheet(Users) → getLastRow() (lightweight)
      → getSheet(Products) → getLastRow()
      → getSheet(Businesses) → getLastRow()
      → getSheet(Properties) → getLastRow()
      → getSheet(News) → getLastRow()
      → getSheet(Media) → getLastRow()
      → getSheet(Orders) → getLastRow()
      → getSheet(Live) → getLastRow()
      → getSheet(ModerationQueue) → getDataRange().getValues() (FULL READ)
      → getSheet(Users) → getDataRange().getValues() (FULL READ for cities)
    → getRevenueData()
      → getSheet(WalletTransactions) → getDataRange().getValues() (FULL READ)
      → getSheet(AdRewardHistory) → getDataRange().getValues() (FULL READ)
    → getHealthData() → lightweight (SpreadsheetApp check)
    → getLiveData()
      → getSheet(LiveViewers) → getDataRange().getValues() (FULL READ)

Step 3: Dashboard._loadCommandCenterData()
  → fetch(?action=ccdata&session=TOKEN)
  → Backend: getCommandCenterData()
    → reads multiple sheets (CommandCenter, etc.)

Step 4: AdminModules.init() → wires click handlers (no API calls)
```

**Total API calls on dashboard load: 3** (validateSession + dashboardSummary + ccdata)  
**Total full-sheet reads: 8–12** depending on CommandCenter implementation

### 3.2 Module Navigation (`admin-modules.js`)

When clicking any sidebar module (e.g., Wallet & Rewards):

```
Step 1: AdminModules.open("wallet")
  → AdminAuth.validateSession()  ← DUPLICATE! Already validated on dashboard init
    → fetch(?action=adminvalidatesession&session=TOKEN)
    → Backend: full session validation (reads AdminSessions + Admins sheets)

Step 2: AdminModules._modules["wallet"](container)
  → admin-wallet.js: render() → loadEconomySummary()
    → fetch(?action=admineconomysummary&session=TOKEN)
    → Backend: getAdminEconomySummary()
      → getSheetData("Wallet") → FULL READ
      → getSheetData("WalletTransactions") → FULL READ
      → getSheetData("AdRewardHistory") → FULL READ
      → getSheetData("PromotionCampaigns") → FULL READ
      → getSheetData(CONFIG.SHEETS.USERS) → FULL READ
```

**Total API calls per module switch: 2** (validateSession + module data)  
**Total full-sheet reads per module switch: 6–10**

### 3.3 Module-Specific Request Counts

| Module | API Calls on Open | Full Sheet Reads | Notes |
|--------|------------------|-----------------|-------|
| Dashboard | 3 | 8–12 | validateSession + summary + ccdata |
| Users | 2 | 3–5 | validateSession + adminusers |
| Advertisements | 2 | 4–6 | validateSession + adminadvertisements |
| Wallet & Rewards | 2 | 7 | validateSession + admineconomysummary (5 sheets) |
| Tasks | 2 | 3–5 | validateSession + admintasks |
| Workforce | 2 | 3–5 | validateSession + adminworkforce |

### 3.4 Duplicate/Redundant Requests

1. **Session validation on every module switch** — `AdminModules.open()` calls `AdminAuth.validateSession()` before every module load. The session was already validated during dashboard init. Since the session token is stored in localStorage and doesn't change, this is redundant for subsequent navigations within the same browser session.

2. **Same sheets read across different modules** — For example:
   - `getAdminEconomySummary()` reads Wallet, WalletTransactions, AdRewardHistory, PromotionCampaigns, Users
   - `getAdminDashboardSummary()` reads WalletTransactions, AdRewardHistory, Users
   - These are independent API calls that re-read the same sheets

3. **Wallet Explorer → Wallet Detail** — Clicking "View" on a wallet in the explorer navigates to wallet detail, which re-reads WalletTransactions and AdRewardHistory (already read by the explorer).

---

## 4. USER APP REQUEST ARCHITECTURE

### 4.1 Home/Landing Page (`App.js`)

On page load, `loadAll()` is called which triggers **sequential** function calls:

```
loadAll() calls (in order):
  1. refreshLoginUI() — localStorage only, no API
  2. loadProducts() → fetch(?action=products&...) — 1 API call
  3. loadBusinesses() → fetch(?action=businesses&...) — 1 API call
  4. loadProperties() → fetch(?action=properties&...) — 1 API call
  5. loadNews() → fetch(?action=news&...) — 1 API call
  6. loadLive() → fetch(?action=livenow&...) — 1 API call
  7. loadWallet() → fetch(?action=wallet&...) — 1 API call
  8. loadProfile() → fetch(?action=profile&...) — 1 API call
  9. loadNotifications() → fetch(?action=notifications&...) — 1 API call
  10. loadAdvertisements() → fetch(?action=advertisements&...) — 1 API call
  11. loadDashboard() → fetch(?action=dashboard&...) — 1 API call
  12. loadPipQueue() → setTimeout 2s → fetch(?action=getpipqueue&...) — 1 API call
```

**Total API calls on home page load: 11–12** (all sequential)  
**Total full-sheet reads: 15–25** (each backend function reads 1–3 sheets)

### 4.2 User App Screen Navigation

Each page switch via `openPage()` typically triggers its own data load function. For example:

| Screen | API Calls | Notes |
|--------|-----------|-------|
| Home | 11–12 | All sequential via loadAll() |
| Products | 1 | Re-fetches products |
| Businesses | 1 | Re-fetches businesses |
| Wallet | 1 | Re-fetches wallet + transactions |
| Profile | 1 | Re-fetches profile |
| Ad Center | 2+ | getAdCenter + getPipQueue |

**Key finding:** Navigating back to Home re-triggers `loadAll()` which re-fetches ALL data, even if nothing changed.

---

## 5. GOOGLE APPS SCRIPT / SHEETS BOTTLENECKS

### 5.1 `getSheetData()` — The Primary Bottleneck

**File:** `Backend/Utils.js` (lines 7–53)

```javascript
function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();  // FULL SHEET READ
  // ... converts to array of objects
}
```

Every call to `getSheetData()` reads the **entire sheet** into memory. For sheets with thousands of rows, this takes 200–1000ms per call.

**Impact:** A single API endpoint like `getAdminEconomySummary()` calls `getSheetData()` **5 times**, meaning 5 full-sheet reads in one request.

### 5.2 Repeated Full-Sheet Reads of the Same Sheet

The same sheets are read multiple times across different API calls within the same user session:

| Sheet | Read By | Times Read |
|-------|---------|-----------|
| Users | getAdminEconomySummary, getAdminDashboardSummary, getAdminWalletExplorer, getAdminWalletDetail | 4+ |
| WalletTransactions | getAdminEconomySummary, getAdminDashboardSummary, getAdminWalletExplorer, getAdminWalletDetail, getAdminWalletTransactions | 5+ |
| AdRewardHistory | getAdminEconomySummary, getAdminDashboardSummary, getAdminWalletExplorer, getAdminWalletDetail, getAdminRewardActivity | 5+ |
| PromotionCampaigns | getAdminEconomySummary, getAdminCampaignEconomy | 2+ |
| AdminSessions | validateAdminSession, requireAdminSession (called by every admin API) | Every request |
| Admins | findAdminById (called by requireAdminSession) | Every request |

### 5.3 N+1 Query Patterns

**Pattern 1:** `getAdminDashboardSummary()` calls `getDashboardOverviewData()` which reads Users sheet for city counting, then `getRevenueData()` which re-reads WalletTransactions and AdRewardHistory — sheets that were already read by `getAdminEconomySummary()` in the same session.

**Pattern 2:** `getAdminWalletExplorer()` reads WalletTransactions and AdRewardHistory to build txCountMap and rewardCountMap. When user clicks "View" to see wallet detail, `getAdminWalletDetail()` re-reads the same two sheets to filter by userId.

### 5.4 `SpreadsheetApp.flush()` and Writes During Read Operations

- `requireAdminSession()` calls `updateSessionActivity()` which writes to AdminSessions sheet on **every** admin API call. This adds write latency to every read operation.
- `updateSessionActivity()` uses `sheet.getRange().setValue()` which is slow in GAS.

### 5.5 Expensive Calculations

- `getDashboardOverviewData()` reads the ModerationQueue sheet and iterates all rows to count pending approvals.
- `getDashboardOverviewData()` reads the Users sheet and iterates all rows to build a Set of unique cities.
- `getRevenueData()` reads WalletTransactions and iterates all rows summing amounts.
- `getAdminEconomySummary()` reads 5 sheets and iterates all rows for aggregation.

---

## 6. AUTHENTICATION OVERHEAD

### 6.1 Admin Authentication

Every admin API call goes through `requireAdminSession()` which:

1. Reads the **AdminSessions sheet** (full) via `findAdminSession()`
2. Reads the **Admins sheet** (full) via `findAdminById()`
3. Writes to AdminSessions sheet via `updateSessionActivity()`

**Cost per admin API call:** 2 full-sheet reads + 1 write

**Impact:** For a module that makes 1 data API call, the total is:
- 1 session validation API call (2 sheet reads + 1 write)
- 1 data API call (2 sheet reads + 1 write + N data sheet reads)
- **Total: 4+ sheet reads + 2 writes per module navigation**

### 6.2 User Authentication

User app API calls use session tokens stored in localStorage. Each user API function typically validates the session by reading the Sessions sheet or checking localStorage. The overhead is lower than admin auth but still involves sheet reads for session validation.

---

## 7. PHASE 5.7A PERFORMANCE FINDINGS

### 7.1 `getAdminEconomySummary()` — Wallet & Rewards Overview

**File:** `Backend/AdminEconomy.js` (lines 18–105)

**Sheets read:** 5
- Wallet (full)
- WalletTransactions (full)
- AdRewardHistory (full)
- PromotionCampaigns (full)
- Users (full)

**Iterations:** All 5 sheets are iterated fully for aggregation.

**Performance impact:** HIGH — This is the most expensive single API endpoint in Phase 5.7A. On a dataset with thousands of rows per sheet, this could take 3–8 seconds.

### 7.2 `getAdminWalletExplorer()`

**Sheets read:** 4 (Wallet, Users, WalletTransactions, AdRewardHistory)  
**Additional work:** Builds txCountMap and lastTxDateMap by iterating WalletTransactions, builds rewardCountMap by iterating AdRewardHistory.

### 7.3 `getAdminWalletDetail()`

**Sheets read:** 4 (Wallet, Users, WalletTransactions, AdRewardHistory)  
**Note:** Re-reads sheets already read by the explorer.

### 7.4 `getAdminWalletTransactions()`

**Sheets read:** 1 (WalletTransactions)  
**Performance:** Relatively lightweight — only 1 sheet.

### 7.5 `getAdminRewardActivity()`

**Sheets read:** 1 (AdRewardHistory)  
**Performance:** Relatively lightweight.

### 7.6 `getAdminCampaignEconomy()`

**Sheets read:** 1 (PromotionCampaigns)  
**Performance:** Relatively lightweight.

### 7.7 Frontend Wallet Module (`admin-wallet.js`)

**API calls per view switch:**
- Overview → Economy: 1 call (admineconomysummary)
- Explorer → Wallets: 1 call (adminwalletexplorer)
- Detail → Wallet: 1 call (adminwalletdetail)
- Transactions: 1 call (adminwallettransactions)
- Rewards: 1 call (adminrewardactivity)
- Campaigns: 1 call (admincampaigneconomy)

**Each view switch also triggers:** 1 session validation call (via AdminModules.open → AdminAuth.validateSession)

**Total per view switch: 2 API calls** (1 validation + 1 data)

---

## 8. CHROME DEVTOOLS PERFORMANCE TEST PROCEDURE

### 8.1 Setup

1. Open Chrome
2. Press F12 to open DevTools
3. Click the **Network** tab
4. Check **"Disable cache"** (for consistent testing)
5. Clear existing logs with the 🚫 button
6. Select **"All"** or **"Fetch/XHR"** filter

### 8.2 Test: Admin Dashboard Initial Load

1. Navigate to `admin-dashboard.html`
2. Observe the Network tab
3. Note each request's:
   - **Name** (URL with action parameter)
   - **Status** (200)
   - **Type** (xhr)
   - **Initiator** (which JS file triggered it)
   - **Size** (response payload size)
   - **Time** (total duration in ms)
   - **Waterfall** (visual timeline showing sequential vs parallel)
4. Click on each request → **Timing** tab → note:
   - **Queueing**
   - **Stalled**
   - **Request sent**
   - **Waiting (TTFB)** — This is the GAS processing time
   - **Content Download**

### 8.3 Test: Module Switch Latency

1. Open DevTools Network tab
2. Click a sidebar module (e.g., "Wallet & Rewards")
3. Note the waterfall — you should see:
   - First: `?action=adminvalidatesession` (session check)
   - Second: `?action=admineconomysummary` (data load)
4. Record the **total time** from click to data displayed
5. Repeat for Users, Advertisements, Tasks modules

### 8.4 Test: User App Home Load

1. Open `index.html` (or the user app URL)
2. Clear Network log
3. Reload the page
4. Count the number of XHR/fetch requests
5. Note which requests run **sequentially** (one after another in waterfall)
6. Note the **total page load time** (bottom status bar)

### 8.5 Data Collection Template

| Test Case | Request URL (action) | TTFB (ms) | Total (ms) | Sheets Read | Sequential? |
|-----------|---------------------|-----------|------------|-------------|-------------|
| Dashboard init | adminvalidatesession | | | 2 | Yes |
| Dashboard init | admindashboardsummary | | | 8–12 | Yes |
| Dashboard init | ccdata | | | 2–5 | Yes |
| Wallet module | adminvalidatesession | | | 2 | Yes |
| Wallet module | admineconomysummary | | | 5 | Yes |
| User home | products | | | 1–2 | Yes |
| User home | businesses | | | 1–2 | Yes |
| ... | ... | | | | |

### 8.6 What to Look For

- **TTFB > 1000ms** = GAS/Sheets processing bottleneck
- **Sequential waterfall** = opportunity to parallelize
- **Duplicate request URLs** = redundant data fetching
- **Large response sizes** = full-sheet reads returning too much data

---

## 9. BOTTLENECKS RANKED

### 🔴 CRITICAL

| # | File | Function | Cause | Affected Screens | Impact |
|---|------|----------|-------|-----------------|--------|
| C1 | `Backend/Utils.js:7` | `getSheetData()` | Reads entire sheet every call | ALL | Every API reads full sheets |
| C2 | `Frontend/admin-modules.js:57` | `AdminModules.open()` | Calls `validateSession()` before every module | ALL admin modules | Doubles API calls per navigation |
| C3 | `Backend/AdminAuth.js:382` | `requireAdminSession()` | Reads AdminSessions + Admins sheets on every admin API | ALL admin APIs | 2 full-sheet reads per request |
| C4 | `Backend/AdminAuth.js:919` | `updateSessionActivity()` | Writes to sheet on every admin API call | ALL admin APIs | Adds write latency to every read |

### 🟠 HIGH

| # | File | Function | Cause | Affected Screens | Impact |
|---|------|----------|-------|-----------------|--------|
| H1 | `Backend/AdminEconomy.js:18` | `getAdminEconomySummary()` | Reads 5 full sheets in one request | Wallet & Rewards overview | 3–8s load time |
| H2 | `Backend/AdminDashboard.js:68` | `getDashboardOverviewData()` | Reads 10+ sheets sequentially | Admin Dashboard | 2–5s load time |
| H3 | `Frontend/App.js:267` | `loadAll()` | Calls 11+ API functions sequentially | User Home page | 5–15s load time |
| H4 | `Backend/AdminDashboard.js:174` | `getRevenueData()` | Reads WalletTransactions + AdRewardHistory fully | Admin Dashboard | Duplicates reads from economy summary |
| H5 | `Backend/AdminEconomy.js:115` | `getAdminWalletExplorer()` | Reads 4 sheets, then detail re-reads same sheets | Wallet Explorer → Detail | N+1 pattern |

### 🟡 MEDIUM

| # | File | Function | Cause | Affected Screens | Impact |
|---|------|----------|-------|-----------------|--------|
| M1 | `Backend/AdminDashboard.js:124` | Pending approvals count | Iterates all ModerationQueue rows | Admin Dashboard | Unnecessary full iteration |
| M2 | `Backend/AdminDashboard.js:145` | Active cities count | Iterates all Users rows | Admin Dashboard | Unnecessary full iteration |
| M3 | `Backend/AdminEconomy.js:138` | `lastTxDateMap` building | Uses `new Date(d)` comparison per row | Wallet Explorer | Minor overhead |
| M4 | `Frontend/admin-wallet.js:631` | `window._econView()` | Resets page to 1 on every view switch | Wallet module | Minor UX friction |

### 🟢 LOW

| # | File | Function | Cause | Affected Screens | Impact |
|---|------|----------|-------|-----------------|--------|
| L1 | `Backend/AdminEconomy.js:33` | `forEach` aggregations | Multiple iterations of same data | Economy Summary | Minor |
| L2 | `Frontend/dashboard.js:48` | `_startClock()` | setInterval for clock | Admin Dashboard | Negligible |
| L3 | `Frontend/App.js:342` | `setTimeout` for PIP | 2s delay before PIP load | User Home | Minor |

---

## 10. RECOMMENDED STAGED OPTIMIZATION PLAN

### PERFORMANCE P1: Remove Redundant Frontend Requests

**Goal:** Eliminate duplicate session validation calls.

**Changes needed:**
1. `Frontend/admin-modules.js` — Modify `AdminModules.open()` to skip `validateSession()` if session was recently validated (e.g., within last 5 minutes). Use a timestamp in localStorage.
2. `Frontend/dashboard.js` — Store session validation result and reuse it.

**Estimated improvement:** 50% reduction in API calls per module navigation (from 2 to 1).

**Files to modify:**
- `Frontend/admin-modules.js`
- `Frontend/admin-auth.js` (add `isSessionRecentlyValidated()` helper)

### PERFORMANCE P2: Reduce Repeated Google Sheets Reads

**Goal:** Cache sheet data within a single API request to avoid re-reading the same sheet.

**Changes needed:**
1. `Backend/Utils.js` — Add a simple in-memory cache for `getSheetData()` that caches results for the duration of a single API request. Use a `Cache` object that gets cleared at the start of each `doGet()`.
2. `Backend/Code.js` — Clear the cache at the beginning of `doGet()`.

**Estimated improvement:** 40–60% reduction in sheet reads per API request.

**Files to modify:**
- `Backend/Utils.js`
- `Backend/Code.js`

### PERFORMANCE P3: Parallelize Independent Frontend API Calls

**Goal:** Fire independent API calls concurrently instead of sequentially.

**Changes needed:**
1. `Frontend/App.js` — Modify `loadAll()` to use `Promise.all()` for independent data loads (products, businesses, properties, news, live, etc.).
2. `Frontend/admin-wallet.js` — If multiple views need data, load them in parallel.

**Estimated improvement:** 3–5x faster home page load (from 11 sequential calls to ~1 round-trip of parallel calls).

**Files to modify:**
- `Frontend/App.js`
- `Frontend/admin-wallet.js` (if applicable)

### PERFORMANCE P4: Introduce Safe Short-Lived Caching

**Goal:** Cache frequently-read, rarely-changed data in the frontend.

**Changes needed:**
1. `Frontend/admin-auth.js` — Cache admin profile and permissions in memory (already in localStorage, but avoid re-fetching).
2. `Frontend/Config.js` — Add a simple TTL-based cache for API responses.
3. `Backend/AdminEconomy.js` — Consider caching economy summary for 30–60 seconds (only if data staleness is acceptable).

**Estimated improvement:** 30–50% reduction in API calls for repeated data.

**Files to modify:**
- `Frontend/Config.js` or new `Frontend/Cache.js`
- `Frontend/admin-auth.js`
- `Backend/AdminEconomy.js` (optional, with caution)

### PERFORMANCE P5: Regression & Performance Testing

**Goal:** Verify optimizations don't break functionality and measure improvement.

**Steps:**
1. Run the Chrome DevTools test procedure (Section 8) before and after each P-phase.
2. Record TTFB, total request time, and number of requests per screen.
3. Verify no regression in:
   - Wallet balances
   - Reward calculations
   - Campaign calculations
   - Authentication
   - Read-only protection
4. Test with realistic data volumes (1000+ rows per sheet).

---

## 11. FILES THAT WOULD NEED MODIFICATION DURING OPTIMIZATION

| File | P1 | P2 | P3 | P4 | Purpose |
|------|----|----|----|----|---------|
| `Frontend/admin-modules.js` | ✅ | | | | Skip redundant session validation |
| `Frontend/admin-auth.js` | ✅ | | | ✅ | Add session recency check, caching |
| `Frontend/App.js` | | | ✅ | | Parallelize loadAll() |
| `Frontend/Config.js` | | | | ✅ | Add cache utility |
| `Frontend/admin-wallet.js` | | | ✅ | | Parallel view loading if needed |
| `Backend/Utils.js` | | ✅ | | | Add request-scoped sheet cache |
| `Backend/Code.js` | | ✅ | | | Clear cache at request start |
| `Backend/AdminEconomy.js` | | | | ✅ | Optional economy summary caching |
| `Backend/AdminAuth.js` | | | | | No changes needed (auth must remain strict) |
| `Backend/AdminDashboard.js` | | | | | No changes needed (will benefit from P2 cache) |

---

## 12. ARCHITECTURE RULE COMPLIANCE

✅ **No major technology migration recommended** — All optimizations are within the current GAS/Sheets architecture.

✅ **No changes to:**
- Wallet balances
- Reward calculations
- Campaign calculations
- RemainingRewardCoins
- Transaction records
- Reward records
- PIP
- Promotion.js
- Phase 5.6
- Economy formulas
- Authentication security

✅ **Phase 5.7A remains READ-ONLY** — No mutation APIs introduced.

---

## PERFORMANCE DIAGNOSTIC COMPLETE — NO RUNTIME FILES MODIFIED