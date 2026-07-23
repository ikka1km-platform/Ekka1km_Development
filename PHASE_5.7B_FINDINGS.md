# PHASE 5.7B FINDINGS — Accounting Architecture Discovery

## 1. Sheet Schemas (Current State)

### Wallet Sheet
Headers: WalletID, UserID, Balance, TotalEarned, TotalSpent, LastUpdated

### WalletTransactions Sheet
Headers: TransactionID, WalletID, UserID, Type, Reason, Source, ReferenceID, Amount, Before, After, Status, CreatedDate, CreatedBy

### AdRewardHistory Sheet
Headers: RewardID, AdID, UserID, Coins, LastWatchSecond, CoinsEarned, Completed, WatchedSeconds, CreatedAt, LastWatchedAt

### PromotionCampaigns Sheet
Headers: CampaignID, CampaignType, OwnerUserID, TargetType, TargetID, CoinsSpent, RewardPool, PlatformReserve, RemainingRewardCoins, Radius, City, District, State, Country, Latitude, Longitude, Views, Clicks, Interested, Shares, StartDate, EndDate, Status, CreatedDate, ImageURL, VideoURL, ExternalURL, Duration, RewardCoins, CreativeType, CTA, DestinationType, PageContent, Priority, Featured, PIPEnabled

### Advertisements Sheet
Headers: AdID, Title, Description, AdType, ImageURL, VideoURL, ExternalURL, RemainingRewardCoins, RewardCoinsDistributed, RewardEnabled, ShowInPIP, RewardExhausted, RewardExhaustedDate, etc.

### Users Sheet
Headers: UserID, FullName, Mobile, Email, City, State, Status, Password, CreatedDate, etc.

## 2. Coin Lifecycle (Traced from Code)

### A. Campaign Creation (createPromotionCampaign in Promotion.js)
1. User spends `campaignBudget` from wallet
2. Wallet: Balance -= campaignBudget, TotalSpent += campaignBudget
3. WalletTransaction created: Amount = -campaignBudget (debit), Type = "REWARD", Source = "PROMOTION", ReferenceID = "CAMPAIGN_{CampaignType}"
4. PromotionCampaigns row created:
   - CoinsSpent = campaignBudget
   - RewardPool = campaignBudget
   - PlatformReserve = 0 (hardcoded)
   - RemainingRewardCoins = campaignBudget

### B. Ad Watch Completion (completeAdWatch in Promotion.js)
1. Validates campaign status, reward pool > 0, no duplicate
2. Calculates finalReward = min(totalReward, rewardPerUser, remainingPool)
3. Calls creditWallet(userId, finalReward, campaignId, "Ad Reward - {Title}")
4. Updates PromotionCampaigns:
   - RemainingRewardCoins = max(0, remainingPool - finalReward) — Note: In Promotion.js this column is both `RemainingRewardCoins` and `RemainingRewardPool` depending on code path
   - TotalRewardPaid = previousTotal + finalReward
   - RewardedUsersCount += 1
   - Views += 1

### C. Wallet Credit (creditWallet in Wallet.js)
1. Reads wallet row by UserID
2. Calculates: after = before + coins
3. Updates Wallet: Balance = after, TotalEarned += coins
4. Creates WalletTransaction: Type="REWARD", Reason=reason, Source="ADVERTISEMENT", ReferenceID=referenceId, Amount=coins, Before=before, After=after, Status="SUCCESS"

### D. Legacy Reward Claim (claimReward in RewardEngine.js)
1. Validates ad exists, reward enabled
2. Calculates newCoins = watchedSeconds - alreadyEarned
3. Cap: newCoins = min(newCoins, remaining)
4. Calls creditWallet(userId, newCoins, adId, "Advertisement Reward")
5. Updates AdRewardHistory: CoinsEarned = totalEarned, Completed = "Yes"
6. Updates Advertisements: RemainingRewardCoins -= newCoins, RewardCoinsDistributed += newCoins

## 3. Entity Relationships

| Entity A | Field | Relationship | Entity B | Field |
|----------|-------|-------------|----------|-------|
| Wallet | UserID | 1:1 | Users | UserID |
| Wallet | WalletID | 1:N | WalletTransactions | WalletID |
| WalletTransactions | UserID | N:1 | Users | UserID |
| WalletTransactions | ReferenceID | N:1 | Advertisements | AdID |
| WalletTransactions | ReferenceID | N:1 | PromotionCampaigns | CampaignID |
| AdRewardHistory | AdID | N:1 | Advertisements | AdID |
| AdRewardHistory | UserID | N:1 | Users | UserID |
| PromotionCampaigns | OwnerUserID | N:1 | Users | UserID |
| AdRewards (separate sheet) | CampaignID | N:1 | PromotionCampaigns | CampaignID |
| AdRewards | UserID | N:1 | Users | UserID |
| AdWatchHistory | CampaignID | N:1 | PromotionCampaigns | CampaignID |

## 4. Accounting Rules Discovered

### Rule 1: Wallet Balance = Σ Credits - Σ Debits
- Wallet.Balance should equal sum of all positive WalletTransactions.Amount minus sum of all negative WalletTransactions.Amount for that wallet

### Rule 2: Campaign CoinsSpent = RewardPool + PlatformReserve + (RemainingRewardCoinsInitial equivalent)
- When created: CoinsSpent = RewardPool, PlatformReserve = 0, RemainingRewardCoins = RewardPool

### Rule 3: Campaign Pool Reduction = Rewards Distributed
- (RewardPool - RemainingRewardCoins) should equal TotalRewardPaid (or actual rewards distributed)
- This is the formula used in AdminEconomy.js: rewardPoolUsed = RewardPool - RemainingRewardCoins

### Rule 4: Reward Transaction → Wallet Credit = Reward Amount
- For every AdRewardHistory record with Completed="Yes", there should be a corresponding WalletTransaction with matching ReferenceID and Amount

### Rule 5: Duplicate Reward Prevention (PIP System)
- For `RepeatRewardType = "ONCE"`: A user can only be rewarded once per campaign
- Check: UserID + CampaignID in AdWatchHistory with status "completed" or "rewarded"
- Also checked in AdRewards sheet: UserID + CampaignID with status "paid"
- For legacy AdRewardHistory: UserID + AdID is the composite key (used in getRewardRecord)

### Rule 6: Balance Chain Continuity
- WalletTransactions.Before (row N) should equal WalletTransactions.After (row N-1) for the same wallet when ordered chronologically

### Rule 7: TotalEarned = Sum of Credits to Wallet
- Wallet.TotalEarned should equal sum of all positive Amount in WalletTransactions for that wallet

## 5. Duplicate Reward Uniqueness Key

From the actual code:
- **PIP system (Promotion.js)**: The uniqueness key is `UserID + CampaignID` checked in AdWatchHistory (status=completed/rewarded) and AdRewards (status=paid)
- **Legacy RewardEngine.js**: The uniqueness key is `UserID + AdID` (used in getRewardRecord to find the single reward record)

For 5.7B duplicate detection, we will use:
- PIP rewards: **UserID + CampaignID** with status completed/rewarded/paid
- Legacy rewards: **UserID + AdID** in AdRewardHistory

## 6. What We Can Reliably Reconcile

### Wallet Reconciliation
- Wallet.Balance vs sum of WalletTransactions (credits - debits)
- Wallet.TotalEarned vs sum of positive Amount in WalletTransactions
- Balance chain continuity (Before → After across transactions)

### Transaction Validation
- Duplicate TransactionIDs
- Missing/unknown UserIDs and WalletIDs
- Invalid amounts, types, statuses
- Broken BeforeBalance → AfterBalance chains

### Reward Validation
- Duplicate AdRewardHistory records (UserID + AdID)
- PIP duplicate rewards (UserID + CampaignID)
- Rewards without corresponding wallet transactions
- Wallet reward transactions without corresponding reward history
- Reward for unknown user/ad/campaign

### Campaign Reconciliation
- RewardPool vs RemainingRewardCoins + TotalRewardPaid (or actual distributed)
- PlatformReserve consistency (currently always 0)
- RemainingRewardCoins >= 0
- RemainingRewardCoins <= RewardPool
- Actual rewards distributed vs campaign pool reduction

## 7. Performance Considerations

- `getSheetData()` reads the entire sheet each time — expensive for large sheets
- Each integrity function should read all required sheets once, build lookup maps in memory
- Avoid N+1 pattern: don't call getSheetData inside loops
- Use TransactionID indexing where possible (though we don't have indexes in Sheets)

## 8. Security / Read-Only Confirmation

All 5.7B APIs MUST:
- Require admin session validation via `requireAdminSession()`
- Only read data — no write operations
- No manual adjustment capabilities
- No economy mutation APIs