# STAGE 4HIJ SCOPE FINDINGS

## 1. Evidence Found

### Direct References
**No direct evidence found in any repository file (`.md`, `.js`, `.html`) with explicit references to "Stage 4H", "Stage 4I", "Stage 4J", or "4HIJ".**

Files searched:
- All `.md` files (STAGE_4FG_*, PHASE_5.*, MYCONTENT_DIAGNOSTIC, PERFORMANCE_DIAGNOSTIC, PIP_*, REWARD_*)
- All `.js` and `.html` files (Frontend/*, Backend/*)
- Git commit log (complete history)

### Indirect Evidence — Git Commit History (Stage Sequence)
```
9571e8e (HEAD) WIP Stage 4FG UI UX implementation and regression repair
772ea7e Complete UI UX Stage 4E profile experience and current location restoration
c61c5a3 WIP UI UX Stage 4E - profile and account experience
9dbbf29 Complete UI UX Stage 4D - my content management and ownership repair
1eb5ed3 Complete UI UX Stage 4C - my content and recent activity
ae7966e Complete UI UX Stage 4B - personal dashboard foundation
e7486f5 Complete UI UX Stage 3E - home cleanup and side drawer
94b0643 Complete UI UX Stage 3D-C - live around you
4fe707a Complete UI UX Stage 3D-B - promoted near you
cfad749 Complete UI UX Stage 3C - home news and properties previews
26d2a84 Complete UI UX Stage 3B - home products and businesses previews
e080bcc Complete UI UX Stage 2 - discovery layout and radius sync
b8dc397 WIP UI UX Stage 2 - transfer checkpoint
4861a3f UI UX Stage 1 - visual design foundation
```

The alphabetical stage naming pattern (1, 2, 3B, 3C, 3D-B, 3D-C, 3E, 4B, 4C, 4D, 4E, 4FG) confirms the intended sequence. The next letters in the alphabet after 4FG are **4H**, **4I**, **4J**.

### Indirect Evidence — Stage Coverage Gaps
The completed stages leave these major user-facing experiences unaddressed by the UI/UX programme:

| Area | Status |
|------|--------|
| Products (full list page) | Functional — legacy/basic UI |
| Businesses (full list page) | Functional — legacy/basic UI |
| Properties (full list page) | Functional — legacy/basic UI |
| News (full list page) | Functional — legacy/basic UI |
| Store (per-business page) | Functional — legacy/basic UI |
| Interests (browse/manage) | Functional — legacy/basic UI |
| Promotions (wizard/list) | Functional — legacy/basic UI |
| Posting flows (all types) | Basic form layout — no UX redesign |
| Search results page | Not addressed |
| Media upload experience | Basic — functional |
| Drafts management | Basic — functional |
| Ad Center | Phase 4 enhanced — basic UI |

---

## 2. Reconstructed Stage 4H

### Original/Intended Goal
Redesign the **core Content Browsing Experience** — Products, Businesses, Properties, and News full listing pages. These are the primary discovery surfaces after the Home page previews. Stage 3B/3C addressed the **Home previews only** (small cards in home sections). The full listing pages were never redesigned.

### Features
- Enhanced Product listing cards with consistent design system
- Enhanced Business listing cards 
- Enhanced Property listing cards
- Enhanced News listing cards
- Consistent card layout, image treatment, badges
- Safe rendering for all dynamic fields
- Loading/empty/error states
- Guest-appropriate states
- Responsive card grid (mobile → desktop)
- Visual consistency with Stage 4FG design patterns

### Relevant Frontend Files
- `Frontend/Products.js` (~470 lines) — `loadProducts()`, `showProductDetails()`, `renderHomeProductsPreview()`, `CURRENT_PRODUCT`
- `Frontend/Businesses.js` (~431 lines) — `loadBusinesses()`, `showBusinessDetails()`, `CURRENT_BUSINESS`
- `Frontend/Properties.js` — `loadProperties()`, `showPropertyDetails()`
- `Frontend/News.js` — `loadNews()`, `showNewsDetail()`
- `Frontend/ProductImages.js` — Image slider/gallery component
- `Frontend/Style.css` — Existing product/business/property/news styles (basic)

### Existing APIs
- `?action=products&lat=&lng=&radius=` — Products list (already returns `json.data.data`)
- `?action=businesses&lat=&lng=&radius=` — Businesses list (already returns `json.data.data`)
- `?action=properties&lat=&lng=&radius=` — Properties list (already returns `json.data.data`)
- `?action=news&lat=&lng=&radius=` — News list (already returns flat `json.data`)

### Existing DOM/Navigation
- **Products**: `<div id="products" class="page">` → `#productList` container. Accessed via bottom nav, category shortcuts, side drawer.
- **Businesses**: `<div id="businesses" class="page">` → `#businessList` container. Accessed via category shortcuts, side drawer.
- **Properties**: `<div id="properties" class="page">` → `#propertyList` container. Accessed via category shortcuts, side drawer.
- **News**: `<div id="news" class="page">` → `#newsList` container. Accessed via bottom nav, category shortcuts, side drawer.
- All these pages activate **compact discovery bar** (`disco-compact` mode, lines 156-168 in App.js).
- Each has a `sectionTitle` and respective list container.

### Current Implementation Status
**NOT STARTED** — Products, Businesses, Properties, and News full listing pages use legacy/basic card layouts. Home previews (Stage 3B/3C) are independent.

### Evidence/Confidence Level
**HIGH** — The pattern is unambiguous: stages 3B/3C covered home previews; the corresponding full listing pages were never redesigned. Stage 4H would logically address this gap.

---

## 3. Reconstructed Stage 4I

### Original/Intended Goal
Redesign the **Store, Interests, and Promotion interaction experiences** — the secondary interaction surfaces where users engage with individual businesses (Store), manage interests, and create/view promotion campaigns.

### Features
- Store page redesign (per-business detail with products, info, follow)
- Interests listing/browsing redesign
- Promotions wizard UI redesign (create campaign)
- My Promotions list redesign
- Consistent card/category design language
- Safe rendering
- Loading/empty/error/guest states

### Relevant Frontend Files
- `Frontend/Store.js` (~478 lines) — `openStore()`, `renderStore()`, follow/unfollow
- `Frontend/Interests.js` (~316 lines) — `loadMyInterests()`, `renderMyInterests()`
- `Frontend/Promotions.js` (~736 lines) — `openPromotionWizard()`, `renderPromotionWizard()`, `loadMyPromotions()`

### Existing APIs
- `?action=getstore&businessId=` — Store data (returns business detail + products)
- `?action=getmyinterests&userId=` — User's interests
- `?action=addinterest&userId=&type=&referenceId=` — Add interest
- `?action=removeinterest&userId=&interestId=` — Remove interest
- `?action=products&userId=` — User's products (for promotion target selection)
- `?action=promotioncampaigns&userId=` — User's promotion campaigns
- `?action=createpromotioncampaign` — Create campaign (POST)

### Existing DOM/Navigation
- **Store**: `<div id="store" class="page">` → `#storeContent` container. Called from business details.
- **Interests**: `<div id="interests" class="page">` → `#interestsList` container. Not in main nav — accessed from profile/side drawer.
- **Promotions**: `<div id="promotions" class="page">` → `#promotionsContent` + `#myPromotionsList` containers. Accessed from profile/side drawer.

### Current Implementation Status
**NOT STARTED** — Store, Interests, and Promotions pages use legacy/basic UI without modern design system treatment.

### Evidence/Confidence Level
**MEDIUM-HIGH** — These are the remaining interaction pages after core content browsing (4H). The alphabetical sequencing suggests higher-complexity features (interaction flows) come after browsing redesign.

---

## 4. Reconstructed Stage 4J

### Original/Intended Goal
Final UI/UX **polish, search, posting flows, and remaining surfaces** — completing the UI/UX programme across all remaining frontend areas.

### Features
- Posting forms redesign (Product, Property, Business, News, Ad, Promotion, Announcement)
- Search results page redesign
- Drafts management UI redesign
- Media upload/library experience enhancement
- Ad Center (Reward Ads) list UI polish
- Any remaining page-level consistency fixes
- Final responsive testing across all pages
- Cross-module navigation consistency

### Relevant Frontend Files
- `Frontend/Post.js` (~700 lines) — Floating post button, menu, form openers
- `Frontend/PostProduct.js` — Product posting form
- `Frontend/PostProperty.js` — Property posting form
- `Frontend/PostBusiness.js` — Business posting form
- `Frontend/PostNews.js` — News posting form
- `Frontend/Drafts.js` — Drafts list/management
- `Frontend/MediaUpload.js` — Media upload widget
- `Frontend/MediaLibrary.js` — Media library
- `Frontend/ProductImages.js` — Product image management
- `Frontend/Ads.js` (~1010 lines) — Ad Center + PIP display
- `Frontend/Announcements.js` — (already well-designed, possibly touch-up only)
- `Frontend/Announcers.js` — Announcer panel (already well-designed)
- `Frontend/SearchLocation.js` — Search location modal (already well-designed)

### Existing APIs
- All posting APIs (`?action=products` POST with method=create, etc.)
- `?action=getmyproducts&userId=`, `?action=getmybusinesses&userId=`, etc.
- `?action=drafts&userId=`
- `?action=search&q=&lat=&lng=&radius=`
- `?action=getmyuploads&userId=` (Media)

### Existing DOM/Navigation
- **Post forms**: `#postProduct`, `#postProperty`, `#postBusiness`, `#postNews`, `#postAdvertisement`, `#postPromotion`, `#postAnnouncement` pages
- **Drafts**: `#drafts` page → `#draftsList`
- **Media**: `#mediaLibrary` page → `#mediaLibraryContent`, `#uploadTest` page → `#uploadTestWidget`
- **Ad Center**: `#adcenter` page → `#adCenterTabs` + `#adCenterList`

### Current Implementation Status
**NOT STARTED** — Posting forms remain in basic form layout. Drafts, media, search results have basic UI.

### Evidence/Confidence Level
**MEDIUM** — The pattern is less clear for J, but as the final alphabetical stage in the 4-series, it would naturally address remaining surfaces and polish. This carries the most reconstruction uncertainty.

---

## 5. Combined Stage 4HIJ Scope

### MUST IMPLEMENT

1. **Products listing page UI/UX redesign** (from 4H)
   - Enhanced product cards with design system
   - Consistent safe rendering
   - Loading/empty/error/guest states
   - Responsive grid

2. **Businesses listing page UI/UX redesign** (from 4H)
   - Enhanced business cards with design system
   - Consistent safe rendering
   - Loading/empty/error/guest states
   - Responsive grid

3. **Properties listing page UI/UX redesign** (from 4H)
   - Enhanced property cards with design system
   - Consistent safe rendering
   - Loading/empty/error/guest states
   - Responsive grid

4. **News listing page UI/UX redesign** (from 4H)
   - Enhanced news cards with design system
   - Consistent safe rendering
   - Loading/empty/error/guest states
   - Responsive grid

5. **Detail view enhancements** (from 4H)
   - Product detail view should match card design
   - Business detail view consistency
   - Property detail view consistency
   - News detail view consistency

### SHOULD IMPLEMENT

6. **Store page UI/UX redesign** (from 4I)
   - Business detail/store page with design system
   - Product showcase within store
   - Follow/unfollow visual design

7. **Interests page UI/UX redesign** (from 4I)
   - Interest cards with design system
   - Interest management UI

8. **Promotions wizard UI/UX redesign** (from 4I)
   - Campaign creation step wizard with design system
   - My Promotions list with design system
   - Campaign status display

### OUT OF SCOPE

- Backend API changes (must reuse existing)
- Database schema modifications
- Authentication architecture changes
- Discovery/location system changes
- Dashboard — must preserve existing
- Profile — must preserve existing
- Wallet — must preserve existing (Stage 4FG)
- Notifications — must preserve existing (Stage 4FG)
- My Content — must preserve existing (Stage 4D)
- Announcements — already well-designed, preserve
- Announcer Panel — already well-designed, preserve
- PIP/Advertisement system core logic — preserve
- Live module — preserve existing
- Home page — preserve existing
- Side drawer — preserve existing
- Bottom navigation — preserve existing
- Header — preserve existing
- Dashboard My Posts = 0 issue — deferred (known issue)
- Businesses/Properties historical data discrepancy — deferred

---

## 6. Existing Functionality That Must Be Preserved

### Canonical Functions/APIs

| Function | File | Purpose |
|----------|------|---------|
| `openPage(pageId)` | App.js | Core navigation — preserve routing |
| `loadProducts()` | Products.js | Load products via API — keep signature |
| `loadBusinesses()` | Businesses.js | Load businesses via API — keep signature |
| `loadProperties()` | Properties.js | Load properties via API — keep signature |
| `loadNews()` | News.js | Load news via API — keep signature |
| `showProductDetails(product)` | Products.js | Detail view entry — keep signature |
| `showBusinessDetails(business)` | Businesses.js | Detail view entry — keep signature |
| `showPropertyDetails(property)` | Properties.js | Detail view entry — keep signature |
| `showNewsDetail(news)` | News.js | Detail view entry — keep signature |
| `openStore(businessId)` | Store.js | Store page entry — keep signature |
| `loadMyInterests()` | Interests.js | Interests loading — keep signature |
| `openPromotionWizard()` | Promotions.js | Promotion wizard — keep signature |
| `loadMyPromotions()` | Promotions.js | My promotions — keep signature |
| `openPostFormWithLogin(type)` | Post.js | Post form entry — keep signature |
| `getProductImages(product)` | Products.js | Image helper — keep signature |
| `getRadius()` | App.js | Current radius — keep |
| `getCurrentUser()` | Auth.js | User auth state — keep |
| `getUserId()` | Auth.js | User ID helper — keep |
| `getApiUrl()` | Config.js | API URL — keep |
| `safeRender()` | Various | Safe rendering — reuse pattern |
| `timeAgo()` | Wallet/Notification | Time formatting — reuse pattern |

### Navigation Behavior Must Preserve
- Category shortcuts on Home → open respective pages
- Bottom nav → opens correct pages
- Side drawer → opens correct pages
- Discovery bar compact mode on listings (products/businesses/properties/news)
- Page navigation via `openPage()` with `activePage` class
- Header visibility logic (hidden on login/register)
- Bottom nav visibility logic

### Page Container IDs Must Preserve
- `#products`, `#productList`
- `#businesses`, `#businessList`
- `#properties`, `#propertyList`
- `#news`, `#newsList`
- `#store`, `#storeContent`
- `#interests`, `#interestsList`
- `#promotions`, `#promotionsContent`, `#myPromotionsList`
- `#postProduct`, `#postProperty`, `#postBusiness`, `#postNews`
- `#drafts`, `#draftsList`
- `#mediaLibrary`, `#mediaLibraryContent`

---

## 7. Files Likely To Be Modified

### Major Modifications
| File | Reason |
|------|--------|
| `Frontend/Products.js` | Enhanced listing cards, safe rendering, design system apply |
| `Frontend/Businesses.js` | Enhanced listing cards, safe rendering, design system apply |
| `Frontend/Properties.js` | Enhanced listing cards, safe rendering, design system apply |
| `Frontend/News.js` | Enhanced listing cards, safe rendering, design system apply |
| `Frontend/Store.js` | Design system apply to store page |
| `Frontend/Interests.js` | Design system apply to interests page |
| `Frontend/Promotions.js` | Design system apply to wizard + list |
| `Frontend/Style.css` | New card styles, listing grid styles, state styles |

### Minor Modifications
| File | Reason |
|------|--------|
| `Frontend/index.html` | If any new DOM elements needed (badges, etc.) |

### Files NOT To Modify
| File | Reason |
|------|--------|
| `Frontend/App.js` | Navigation and core app logic — preserve |
| `Frontend/Wallet.js` | Stage 4FG — preserve |
| `Frontend/Notification.js` | Stage 4FG — preserve |
| `Frontend/Profile.js` | Stage 4E — preserve |
| `Frontend/MyContent.js` | Stage 4D — preserve (except minor co-existing) |
| `Frontend/Post.js` | Post menu — not in scope unless 4J explicitly |
| `Frontend/PostProduct.js` | Post form — not in scope |
| `Frontend/PostProperty.js` | Post form — not in scope |
| `Frontend/PostBusiness.js` | Post form — not in scope |
| `Frontend/PostNews.js` | Post form — not in scope |
| `Frontend/Drafts.js` | Drafts — not in scope |
| `Frontend/Ads.js` | Ads/PIP — preserve |
| `Frontend/Announcements.js` | Already well-designed |
| `Frontend/Announcers.js` | Already well-designed |
| `Frontend/MediaUpload.js` | Not in scope |
| `Frontend/MediaLibrary.js` | Not in scope |
| `Frontend/ProductImages.js` | Not in scope |
| `Frontend/Live.js` | Not in scope |
| `Frontend/SearchLocation.js` | Not in scope |
| `Frontend/Auth.js` | Not in scope |
| `Frontend/OTP.js` | Not in scope |
| `Frontend/Config.js` | Not in scope |
| All `Backend/*.js` files | No backend changes |

---

## 8. Backend Changes

### Required: NONE

All reconstructed 4HIJ features can be implemented using existing backend APIs:

| Feature | Existing API | Adequate? |
|---------|-------------|-----------|
| Products listing | `?action=products&lat=&lng=&radius=` | ✅ Yes |
| Businesses listing | `?action=businesses&lat=&lng=&radius=` | ✅ Yes |
| Properties listing | `?action=properties&lat=&lng=&radius=` | ✅ Yes |
| News listing | `?action=news&lat=&lng=&radius=` | ✅ Yes |
| Product detail | `?action=product&id=` | ✅ Yes |
| Business detail | `?action=business&id=` | ✅ Yes |
| Property detail | `?action=property&id=` | ✅ Yes |
| News detail | `?action=newsitem&id=` | ✅ Yes |
| Store | `?action=getstore&businessId=` | ✅ Yes |
| Interests | `?action=getmyinterests&userId=` | ✅ Yes |
| Promotions | `?action=promotioncampaigns&userId=` | ✅ Yes |
| Promotion creation | `?action=createpromotioncampaign` (POST) | ✅ Yes |

**No new backend APIs required.** All data fields (Title, Price, Category, City, State, DistanceKm, Description, Images, Condition, Status, etc.) are already returned by existing APIs.

---

## 9. Global JS Collision Risks

### Identified Risks

| Risk | Area | Details |
|------|------|---------|
| **`safeRender()`** | Wallet.js, Notification.js | Duplicate function — both files define their own `safeRender()` with identical implementation. New modules must use namespaced version (e.g., `walletSafeRender()`, `notificationSafeRender()`, `productSafeRender()`). |
| **`timeAgo()`** | Wallet.js, Notification.js | Duplicate function — both define `timeAgo()`. Must namespaced for new modules. |
| **`CURRENT_PRODUCT`** | Products.js | Global state variable — any new module must avoid name collision. |
| **`CURRENT_BUSINESS`** | Businesses.js | Global state variable — collision risk if new module uses same name. |
| **`loadProducts()`** | Products.js | If any new module needs a `loadProducts()` function with different purpose, collision occurs. |
| **`loadBusinesses()`** | Businesses.js | Same risk as above. |
| **`loadProperties()`** | Properties.js | Same risk as above. |
| **`loadNews()`** | News.js | Same risk as above. |
| **`renderStore()`** | Store.js | Generic name — risk if another module defines it. |
| **`renderMyInterests()`** | Interests.js | Generic name. |
| **`openStore()`** | Store.js | Generic name. |
| **`getProductImages()`** | Products.js | Already exists — any new image helper must use different name. |
| **`trackProductView()`** | Products.js | Already exists. |
| **Global page loader functions** | App.js | `loadAll()`, `loadLocation()`, `loadDashboard()` — these are already in App.js and must not be duplicated. |
| **User state globals** | App.js | `CURRENT_LAT`, `CURRENT_LNG` — must not be shadowed. |

### Recommended Mitigation Strategy
New helper functions for Stage 4HIJ content modules should be namespaced:
- `contentSafeRender()` or `hijSafeRender()`
- `contentTimeAgo()` or `hijTimeAgo()`
- `renderProductCard()`, `renderBusinessCard()`, etc. (sufficiently specific)

---

## 10. CSS Collision Risks

### Identified Risks

| Risk Level | Selector | File | Reason |
|-----------|----------|------|--------|
| **HIGH** | `.card` | Style.css (global) | Used everywhere — new styles must NOT override generic `.card`. Use specific classes like `.productCard`, `.businessCard`. |
| **HIGH** | `.sectionTitle` | Style.css (global) | Used on every page — modifications affect all pages. |
| **MEDIUM** | `.badge` | Style.css (global) | Generic badge class — Stage 4FG already uses wallet-specific badges. New modules must use prefixed badges. |
| **MEDIUM** | `button` | Style.css (global) | Generic button selector — modifications affect all buttons. |
| **MEDIUM** | `input`, `select`, `textarea` | Style.css (global) | Form element overrides can affect unrelated forms. |
| **MEDIUM** | `.product` | Products.js inline / Style.css | Existing product class could conflict with new product card styles. |
| **LOW** | `.product-detail` | Style.css | Detail view container — must be careful not to break. |
| **LOW** | Image classes (`.product img`, etc.) | Style.css | Generic image selectors could affect images in redesigned cards. |

### Recommended Mitigation Strategy
- Prefix ALL new CSS classes with content area: `.hij-`, `.listing-`, `.browse-`, or per-type: `.productCard-`, `.businessCard-`
- Follow Stage 4FG pattern: `walletSummaryCard`, `notificationBadge` → use pattern `productCard`, `businessCard`
- Avoid adding new global element selectors
- Avoid modifying existing `.card`, `.sectionTitle`, `.badge` classes

---

## 11. Regression Test Matrix

After combined 4HIJ implementation, these pages/features must be smoke-tested:

### Content Browsing (4H — must test after modifications)
| Page | Test Case | Expected |
|------|-----------|----------|
| **Products** | Load listing | Cards render with correct data, no `undefined`/`null` visible |
| | Product detail | Detail view opens, image slider works, safe rendering |
| | Empty state | "No Products Found" displays when no data |
| | Error state | Error message displays on API failure |
| | Guest view | Products load without login |
| | Responsive (375px, 768px, 1440px) | No overflow, proper layout |
| **Businesses** | Same test pattern as Products | Same expectations |
| **Properties** | Same test pattern as Products | Same expectations |
| **News** | Same test pattern as Products | Same expectations |

### Existing Pages That Must NOT Regress
| Page | Test Case | Expected |
|------|-----------|----------|
| **Dashboard** | Load, wallet balance, My Posts | Dashboard loads correctly, no regression (deferred issue remains known) |
| **Profile** | Navigate, edit profile, logout | Profile displays correctly, no CSS leaks from new styles |
| **My Content** | Load, filter by type | Content loads correctly, tabs work (Products/Businesses/Properties/News) |
| **Wallet** | Balance, transactions, filter tabs | No CSS regressions from new classes |
| **Notifications** | List, badge, mark-read | Notification badge works, list renders |
| **Home** | Previews (Products, Businesses, Properties, News, Promoted, Live) | Home previews render correctly, no crashes |
| **Live** | Load live list | Live module works |
| **Location/Radius** | Change location, verify radius on all listing pages | Products/Businesses/Properties/News respect radius |
| **Side Drawer** | Open, navigate, close | Drawer opens and navigates correctly |
| **Bottom Nav** | Click each tab | Correct pages open |
| **Announcements** | Load, filter, detail | Announcements unaffected |
| **Post Something** | Open menu, select type | FAB menu opens correctly |
| **Store** | Open store from business | Store page loads |
| **Interests** | Load, manage | Interests page works |
| **Promotions** | Wizard, my campaigns | Promotion pages work |

---

## 12. Recommended Combined Implementation Order

Since 4H, 4I, and 4J are being combined, the safest internal implementation sequence is:

### Phase A — Foundation (4H core)
1. **CSS foundation**: Add new namespaced card/listing styles to Style.css (do NOT modify existing `.card`, `.sectionTitle`)
2. **Products** (`Products.js`): Redesign listing cards. This is the primary content type and highest-traffic page. Test thoroughly.
3. **Businesses** (`Businesses.js`): Redesign listing cards. Reuse patterns from Products.
4. **Properties** (`Properties.js`): Redesign listing cards. Reuse patterns.
5. **News** (`News.js`): Redesign listing cards. Reuse patterns, but note News uses flat `json.data` (not `json.data.data`).

### Phase B — Detail Views (4H completion)
6. **Product detail view** — Redesign to match card design language
7. **Business detail view** — Redesign
8. **Property detail view** — Redesign
9. **News detail view** — Redesign

### Phase C — Interaction Pages (4I)
10. **Store page** — Apply design system
11. **Interests page** — Apply design system
12. **Promotions wizard** — Apply design system (most complex — has multi-step form + data loading)

### Phase D — Polish (4J)
13. Consider posting flow consistency if time permits
14. Final responsive audit across all modified pages
15. Cross-browser testing

### Key Safety Rules During Implementation
- **Do NOT modify** `App.js`, `Wallet.js`, `Notification.js`, `Profile.js`, `MyContent.js`
- **Do NOT add** new global un-namespaced helper functions
- **Do NOT change** page container IDs (`#productList`, `#businessList`, etc.)
- **Do NOT change** function signatures that existing callers (`openPage()`, etc.) depend on
- **DO namespace** all new helper functions with `hij` or content-type prefix
- **DO prefix** all new CSS classes with content-type (e.g., `.productCard-`, `.businessCard-`)
- **DO preserve** all existing navigation paths
- **DO test** all pages in the regression matrix after each phase

---

## SUMMARY

| Aspect | Finding |
|--------|---------|
| **4H** | Products, Businesses, Properties, News full listing page redesign |
| **4I** | Store, Interests, Promotions wizard UI redesign |
| **4J** | Posting flows, Drafts, Media, Search results — final polish |
| **Combined scope** | 15 major files to modify (7 heavily), CSS additions, no backend changes |
| **Backend changes** | **NONE** — all existing APIs adequate |
| **Major risks** | Global JS function name collisions (`safeRender`, `timeAgo`), generic CSS selectors (`.card`, `.badge`), preserving existing navigation |
| **Files most likely modified** | Products.js, Businesses.js, Properties.js, News.js, Store.js, Interests.js, Promotions.js, Style.css |

---

**STOP. Do not implement Stage 4HIJ. This report is for review only.**