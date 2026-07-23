# PHASE 5.7A FINDINGS — Wallet & Rewards Economy Architecture

## 1. Existing Wallet Architecture

### Backend Files
- **Backend/Wallet.js** — Core wallet APIs: `getWallet()`, `getWalletTransactions()`, `updateWallet()`, `creditWallet()`, `createWalletTransaction()`
- **Backend/RewardEngine.js** — Reward processing: `getRewardHistory()`, `getReward()`, `updateRewardProgress()`, `claimReward()`
- **Backend/RewardAnalytics.js** — Reward analytics: `getRewardStats()`, `getUserRewardStats()`, `getAdRewardStats()`, `getTopRewardedUsers()`, `getTopRewardedAds()`, `getRewardPools()`
- **Backend/Promotion.js** — Campaign management with reward pool fields
- **Backend/AdminDashboard.js** — Existing dashboard summary with `getRevenueData()` that reads WalletTransactions and AdRewardHistory
- **Backend/AdminManagement.js** — Admin CRUD for users, businesses, products, properties, news, and campaign lifecycle actions
- **Backend/Utils.js** — Sheet helpers: `getSheetData()`, `getRowById()`, `updateRow()`

### Frontend Files
- **Frontend/Wallet.js** — User-facing wallet UI (loadWallet, loadTransactions, loadRewards)
- **Frontend/admin-advertisements.js** — Phase 5.6A Advertisement & Promotion Control Center (campaign explorer with economy detail)
- **Frontend/admin-modules.js** — Module registration system
- **Frontend/admin-dashboard.html** — Admin dashboard with sidebar navigation (already has "Wallet & Rewards" nav item)

## 2. Google Sheets Schemas

### Wallet Sheet
Columns: WalletID, UserID, Balance, TotalEarned, TotalSpent, LastUpdated

### WalletTransactions Sheet
Columns: TransactionID, WalletID, UserID, Type, Reason, Source, ReferenceID, Amount, Before, After, Status, CreatedDate, CreatedBy

### AdRewardHistory Sheet
Columns: RewardID, AdID, UserID, Coins, LastWatchSecond, CoinsEarned, Completed, WatchedSeconds, CreatedAt, LastWatchedAt

### PromotionCampaigns Sheet
Columns: CampaignID, CampaignType, OwnerUserID, TargetType, TargetID, CoinsSpent, RewardPool, PlatformReserve, **RemainingRewardCoins**, Radius, City, District, State, Country, Latitude, Longitude, Views, Clicks, Interested, Shares, StartDate, EndDate, Status, CreatedDate, ImageURL, VideoURL, ExternalURL, Duration, RewardCoins, CreativeType, CTA, DestinationType, PageContent, Priority, Featured, PIPEnabled

### Users Sheet
Columns: UserID, FullName, Mobile, Email, City, State, Status, etc.

## 3. Existing Reusable APIs

| Action | Function | Description |
|--------|----------|-------------|
| `wallet` | `getWallet(e)` | Get wallet by userId |
| `wallettransactions` | `getWalletTransactions(e)` | Get transactions by userId |
| `rewardhistory` | `getRewardHistory(e)` | Get all reward history |
| `rewardstats` | `getRewardStats(e)` | Aggregated reward stats |
| `userrewardstats` | `getUserRewardStats(e)` | Per-user reward stats |
| `adrewardstats` | `getAdRewardStats(e)` | Per-ad reward stats |
| `toprewardedusers` | `getTopRewardedUsers(e)` | Top users by reward coins |
| `toprewardedads` | `getTopRewardedAds(e)` | Top ads by reward coins |
| `rewardpools` | `getRewardPools(e)` | Remaining reward pools per ad |
| `admindashboardsummary` | `getAdminDashboardSummary(e)` | Dashboard summary with revenue data |
| `adminpromotioncampaigns` | `getAdminPromotionCampaigns(e)` | Admin campaign list with economy fields |
| `adminadvertisements` | `getAdminAdvertisements(e)` | Admin legacy ads list |

## 4. Reward Architecture

- Rewards are tracked in **AdRewardHistory** sheet
- Each reward record links to an AdID (advertisement) and UserID
- `CoinsEarned` field tracks total coins earned per reward record
- `Completed` field indicates if reward was fully claimed ("Yes"/"No")
- Wallet credits are created via `creditWallet()` which also creates a WalletTransactions record
- `claimReward()` in RewardEngine.js handles the full reward claim flow:
  1. Validates ad exists and rewards are enabled
  2. Checks reward record exists
  3. Calculates new coins from watched seconds
  4. Checks RemainingRewardCoins on the ad
  5. Credits wallet via `creditWallet()`
  6. Updates AdRewardHistory
  7. Updates Advertisements RemainingRewardCoins

## 5. Transaction Architecture

- Transactions are stored in **WalletTransactions** sheet
- Each transaction has: TransactionID, WalletID, UserID, Type, Reason, Source, ReferenceID, Amount, Before, After, Status, CreatedDate, CreatedBy
- `createWalletTransaction()` is called by `creditWallet()` to log each credit
- The `Amount` field represents the coin amount (positive for credits)
- `Before` and `After` fields track balance before/after the transaction

## 6. Advertisement Reward Relationships

- **Advertisements** sheet has: RemainingRewardCoins, RewardCoinsDistributed, RewardEnabled, ShowInPIP, RewardExhausted
- **PromotionCampaigns** sheet has: CoinsSpent, RewardPool, PlatformReserve, RemainingRewardCoins, RewardCoins
- The field `RemainingRewardCoins` exists in both Advertisements and PromotionCampaigns
- Previous development corrected inconsistent references between `RemainingRewardCoins` and `RemainingRewardPool` in Promotion.js paths

## 7. Limitations Discovered

1. **No wallet status field** — The Wallet sheet has no Status column (Active/Inactive/Frozen)
2. **No wallet freeze/suspension** — No mechanism exists to freeze a wallet
3. **No transaction reversal** — No refund/reversal mechanism exists
4. **No economy reconciliation** — No existing function validates that wallet balances match transaction totals
5. **No platform reserve tracking** — PlatformReserve exists per campaign but no aggregate tracking
6. **No reward ledger** — No separate reward ledger; rewards are tracked in AdRewardHistory only
7. **No user reward aggregate** — No pre-calculated user reward totals; must be calculated from AdRewardHistory

## 8. Metrics That Can Be Reliably Calculated

| Metric | Source | Reliability |
|--------|--------|-------------|
| Total Users With Wallets | Wallet sheet (unique UserIDs) | High |
| Aggregate Coin Balance | Wallet sheet (sum of Balance) | High |
| Wallet Transaction Count | WalletTransactions sheet (row count) | High |
| Total Credits | WalletTransactions (sum of positive Amount) | High |
| Total Debits | WalletTransactions (sum of negative Amount) | High |
| Reward Transaction Count | AdRewardHistory (row count) | High |
| Total Reward Coins Distributed | AdRewardHistory (sum of CoinsEarned) | High |
| Total Coins Spent (Campaigns) | PromotionCampaigns (sum of CoinsSpent) | High |
| Total Reward Pool | PromotionCampaigns (sum of RewardPool) | High |
| Total Platform Reserve | PromotionCampaigns (sum of PlatformReserve) | High |
| Total Remaining Reward Coins | PromotionCampaigns (sum of RemainingRewardCoins) | High |
| Active Campaign Count | PromotionCampaigns (filter by Status=Active) | High |
| Per-user wallet detail | Wallet + Users + WalletTransactions + AdRewardHistory | High |
| Per-campaign economy | PromotionCampaigns (all financial fields) | High |

## 9. Metrics Deliberately Deferred to 5.7B

- Campaign CoinsSpent vs RewardPool + PlatformReserve + RemainingRewardCoins reconciliation
- Wallet balance vs transaction total reconciliation
- Reward pool deduction validation
- Duplicate reward detection
- End-to-end accounting chain validation