# STAGE 4FG — WALLET, REWARDS, NOTIFICATIONS & ANNOUNCEMENTS
## Pre-Implementation Findings Report

---

## 1. EXISTING WALLET ARCHITECTURE

### Frontend (Frontend/Wallet.js)
- **Container**: `#walletCard` in index.html
- **Functions**: 
  - `loadWallet()` - loads balance, TotalEarned, TotalSpent
  - `loadTransactions()` - loads transaction history
  - `loadRewards()` - loads reward history
- **State**: `CURRENT_WALLET`, `CURRENT_TRANSACTIONS`, `CURRENT_REWARDS`
- **API**: `?action=wallet&userId=`, `?action=wallettransactions&userId=`, `?action=rewards&userId=`
- **Guest**: Shows locked wallet message with login/register buttons

### Backend (Backend/Wallet.js)
- **Routes**: `wallet`, `wallettransactions` (in Code.js)
- **Sheets**: "Wallet", "WalletTransactions"
- **Wallet Schema**: WalletID, UserID, Balance, TotalEarned, TotalSpent, LastUpdated
- **Transaction Schema**: TransactionID, WalletID, UserID, Type, Reason, SourceType, ReferenceId, Amount, BeforeBalance, AfterBalance, Status, CreatedDate, CreatedBy

---

## 2. EXISTING TRANSACTION/REWARD ARCHITECTURE

### Wallet Transactions
- Created by `createWalletTransaction()` in Backend/Wallet.js
- Type is hardcoded as "REWARD" 
- SourceType is hardcoded as "ADVERTISEMENT"
- Reason contains description like "Advertisement Reward"
- Status is "SUCCESS"

### Rewards
- **Backend**: Backend/RewardEngine.js
- **Route**: `rewardhistory` (in Code.js)
- **Sheet**: "AdRewardHistory"
- **Schema**: RewardID, AdID, UserID, UserName, SecondsWatched, CoinsEarned, Completed, LastWatchSecond, LastWatchedAt, CreatedAt
- **Frontend**: `loadRewards()` calls `?action=rewards&userId=`
- **Note**: Rewards are separate from wallet transactions but both contribute to balance

---

## 3. EXISTING NOTIFICATION ARCHITECTURE

### Frontend (Frontend/Notification.js)
- **Container**: `#notificationList` in index.html
- **Functions**: 
  - `loadNotifications()` - loads notifications
  - `renderNotifications()` - renders notification cards
  - `getUnreadNotificationCount()` - counts unread from `CURRENT_NOTIFICATIONS`
- **State**: `CURRENT_NOTIFICATIONS`
- **API**: `?action=notifications&userId=`
- **Guest**: Shows locked notifications message

### Backend (Backend/Notifications.js)
- **Routes**: `notifications`, `notification`, `unreadnotifications`, `createnotification`, `marknotificationread` (in Code.js)
- **Sheet**: "Notifications"
- **Schema**: NotificationID, UserID, Title, Message, Type, TargetUserID, RadiusKm, Latitude, Longitude, ImageUrl, ActionUrl, Status, CreatedDate, SentAt, Icon, Color
- **Types**: PRODUCT_INTERESTED, SELLER_RESPONSE, PROMOTION_FINISHED, ADMIN_MESSAGE, VERIFICATION_STATUS, NEWS_APPROVAL, SERVICE_ENQUIRY, STORE_FOLLOW, STORE_PRODUCT, NEWS_ALERT, SYSTEM_ALERT, direct, broadcast
- **Status**: Pending, Sent, Read
- **Read/Unread**: Backend supports `markNotificationRead()` and `getUnreadNotifications()`

---

## 4. EXISTING ANNOUNCEMENT ARCHITECTURE

### Frontend (Frontend/Announcements.js)
- **Container**: `#announcementList` in index.html
- **Functions**: 
  - `loadAnnouncements()` - loads by location/radius
  - `loadAnnouncementsByCategory()` - filters by category
  - `showAnnouncementDetail()` - shows full announcement
- **API**: `?action=announcements&lat=&lng=&radius=`
- **No user auth required** - location-based public content
- **Categories**: General, Community, Public Notice, Event, Education, Utility / Service, Emergency / Important
- **Features**: Category filtering, priority badges (URGENT, IMPORTANT), official announcer verification

### Backend (Backend/Announcements.js + Backend/Announcers.js)
- **Routes**: announcements, announcement, addannouncement, createannouncement, etc. (in Code.js)
- **V2 Announcer System**: applyannouncer, myannouncerstatus, getannouncerbyid, etc.
- **Separate from notifications** - different data source

---

## 5. NAVIGATION CONNECTIONS

### Profile.js (Frontend/Profile.js)
- Line 403: `onclick="openPage('wallet')"` - Wallet navigation
- Line 412: `onclick="openPage('notifications')"` - Notifications navigation

### Dashboard (Frontend/App.js)
- Line 584: `onclick="openPage('wallet')"` - Quick action
- Line 587: `onclick="openPage('notifications')"` - Quick action

### Header (Frontend/index.html)
- Line 59: `onclick="openPage('notifications')"` - Notification icon

---

## 6. DESIGN SYSTEM

### CSS Variables (Frontend/Style.css)
- `--primary: #0f9d58` (green)
- `--primary-dark: #087f46`
- `--card: #ffffff`
- `--shadow: 0 4px 15px rgba(0,0,0,.08)`
- `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 18px`
- `--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-md: 15px`, `--spacing-lg: 20px`

### Existing Components
- Cards: 18px border-radius, white background, shadow
- Badges: 20px border-radius, green background
- Buttons: 12px border-radius, full width, green primary
- Section titles: 22px, bold
- Max content width: 1200px

---

## 7. KEY FINDINGS

### What Exists
✅ Wallet balance API with canonical data
✅ Transaction history API
✅ Reward history API (separate from transactions)
✅ Notification list API with read/unread status
✅ Mark notification read API
✅ Announcements API with location filtering
✅ Navigation from Profile → Wallet/Notifications
✅ Navigation from Dashboard → Wallet/Notifications
✅ Guest states for Wallet and Notifications
✅ Safe rendering helper in Profile.js (`safeRender()`)

### What Needs Enhancement
⚠️ Wallet UI is basic (just shows balance, earned, spent)
⚠️ Transactions show raw Type values (ADVERTISEMENT, REWARD, etc.)
⚠️ No visual distinction between credits and debits
⚠️ No tab filtering for transactions (All/Earned/Spent)
⚠️ Rewards displayed separately from transactions (may cause confusion)
⚠️ Notifications don't show unread/read visual state
⚠️ No notification badge/count in header
⚠️ No mark-as-read functionality in UI
⚠️ Basic empty/error states

### What NOT to Touch
❌ Backend wallet/reward/notification engines
❌ Database schemas
❌ Authentication architecture
❌ Navigation structure (header, bottom nav, drawer)
❌ Discovery/location system

---

## 8. IMPLEMENTATION STRATEGY

### Stage 4F - Wallet & Rewards
1. Enhance wallet summary card with better visual hierarchy
2. Add transaction type mapping (ADVERTISEMENT → Ad Reward, etc.)
3. Add visual distinction for credits (green) vs debits (red)
4. Add tab filtering: All / Earned / Spent
5. Integrate rewards into transaction view (they're already in wallet transactions)
6. Improve empty/error/guest states with safe rendering
7. Add proper date formatting

### Stage 4G - Notifications & Announcements
1. Add notification icon/type display
2. Add unread/read visual state (bold/unbold, dot indicator)
3. Add mark-as-read on click
4. Add notification badge to header icon
5. Improve timestamp display (time ago)
6. Keep announcements separate but ensure consistent styling
7. Improve empty/error/guest states

### Safe Rendering
- Use `safeRender()` helper from Profile.js pattern
- Prevent undefined/null/NaN/Invalid Date from displaying
- Apply to all dynamic content

### Responsive
- Mobile-first (375px base)
- Test at 768px and 1440px
- Max-width 1200px for content
- No horizontal overflow