# Software Design Document — ywzh-gachasimulator

> Read this if you're a developer/agent picking up the codebase cold.
> The whole app is a single self-contained HTML file. This document describes
> its architecture, key invariants, feature inventory, and how to extend it.

---

## 1. Purpose

Interactive gacha (loot-box) simulator faithful to the in-game rules of the
"欢迎新船长 / 织梦弦音 / 噼噜的旧日秘藏 / 这里不散场" banner system. Runs entirely
in a browser with no build step. Used for:
- Personal luck simulation (do individual pulls, see outcomes)
- Rate/pity math verification (Monte Carlo batch over up to 1M banners)
- Model comparison across banners (each banner has distinct rate-up, pity, cost)

## 2. Runtime & File Layout

- **Zero dependencies**: no npm, no CDN, no server. Just `<html>` opened in-browser.
- **~2100 lines** of HTML + CSS + JS all in `ywzh-gachasimulator.html`.
- **~55 PNG icon assets** referenced via relative paths in `gacha-screenshots/icons/`.
- All source screenshots kept in `gacha-screenshots/*.png` for re-cropping.

```
project-root/
├── README.md                         # Quick-start
├── ywzh-gachasimulator.html          # ← The whole app
├── docs/
│   ├── SDD.md                        # ← This file
│   └── archive/
│       └── snapshot-single-pool.html # Pre-multi-banner milestone snapshot
└── gacha-screenshots/
    ├── Screenshot 2026-*.png         # Source screenshots (game UI captures)
    └── icons/
        ├── black-01..06.png          # Newcomer pool: 6 base SSR sailors
        ├── ps-01..12.png             # 12 SR sailors (shared across banners)
        ├── pv-01..12.png             # 12 SR shadows (shared)
        ├── bv-01..12.png             # 12 R shadows (shared)
        ├── moli.png                  # 织梦弦音 UP: 茉莉 (SSR)
        ├── heige.png                 # 织梦弦音 & 常驻 rotating SSR sailor: 黑格
        ├── pilu-01..08.png           # 噼噜的旧日秘藏 SSR shadow pool
        │                             #   pilu-01 = 安眠人偶 (UP; hi-res crop)
        │                             #   pilu-02..07 = standard 7 SSR shadows
        │                             #   pilu-08 = 破碎狂想曲 (rotating; shared with 常驻)
        ├── coin-silver.png           # 银币 currency icon (transparent bg)
        ├── coin-gold.png             # 金币 currency icon
        └── coin-pilu.png             # 噼噜的最爱 currency icon
```

## 3. Architecture

### 3.1 Central Data Model

Two top-level maps define everything the app knows:

```javascript
BANNERS = {
  newcomer:      { ... },
  dreamString:   { ... },   // 织梦弦音   — UP: 茉莉 (SSR 50/50) + 艾丝-RS / 预兆之眼-英诺森 (SR 50/50)
  piluTreasure:  { ... },   // 噼噜的旧日秘藏 — UP: 安眠人偶 (SSR 75/25) + 迷你号鲇鱼的消亡/此刻即未来 (SR 50/50)
  permanent:     { ... }    // 这里不散场
}

// Each banner's shape:
{
  id, name, category, summary,
  currency:  { key, label, iconPath },
  pity:      { black, purple },              // e.g. black=40 for newcomer, 80 for events
  rates:     { black, purpleSailor, purpleShadow, blueShadow },   // sums to ~1.00
  combined:  { black, purple, blue },        // theoretical % including pity (from game announcements)
  pools:     { black, purpleSailor, purpleShadow, blueShadow },   // arrays of item names
  featured:  null | {                        // rate-up config; null = no featured
    ssr: { items: [names], chance, tier },
    sr:  { items: [names], chance, tier, appliesToTiers: [tierA, tierB, ...] }
  },
  cost:      { single, tenPromo, tenFull },  // silver/gold/pilu-token amounts
  promo:     null | { limit },               // only newcomer has 40-draw 8折 promo
  buttons:   { single, ten } | undefined,    // per-banner verb; default = 来一杯/来十杯
  firstSsrGuaranteed: bool                   // if true, first SSR ever on this banner MUST be featured
}
```

```javascript
bannerState = {
  newcomer:      freshBannerState(),   // each holds its own full runtime state
  dreamString:   freshBannerState(),
  piluTreasure:  freshBannerState(),
  permanent:     freshBannerState()
}

// freshBannerState() shape:
{
  totalDrawn, blackObtained,
  pullsSinceLastBlack,                 // for rolling black pity
  pityBlackTriggers, pityPurpleTriggers,
  curPullIdx, curPullHasPurplePlus,    // 10-pull SR pity window (batch-scoped)
  log:         [ record, ... ],        // full draw history for this banner
  counts:      { black, purpleSailor, purpleShadow, blueShadow },
  itemCounts:  { "tier|name": count },
  itemDraws:   { "tier|name": [drawNo, ...] },     // powers per-item tooltips
  feather:     { exclusive, normal, secrets: [...] },
  singleCount, tenCount, currencySpent,
  promoEnabled,                        // per-banner promo toggle (only newcomer meaningful)
  firstSsrObtained,                    // for firstSsrGuaranteed
  lastFailedFeaturedSsr, lastFailedFeaturedSr    // for Genshin-style guaranteed-next
}
```

**Live alias**: `let state = bannerState[activeBanner]` — bindings re-target on `switchBanner()`.
Existing code paths like `state.totalDrawn++` continue to work without knowing about banner switching.

### 3.2 Draw Pipeline

```
User clicks 来一杯 / 来十杯
     │
     ▼
doSinglePull() or doTenPull()
     │
     ├── Increment state.singleCount / state.tenCount
     ├── Add cost to state.currencySpent
     ▼
tenPull() (if 10-pull) — resets state.curPullIdx=0, state.curPullHasPurplePlus=false
     │
     └── for i in 0..9:  drawOne(true)
              │
              ▼
       drawOne(inTenPullContext)
              │
              ├── chooseTier(inTenPullContext)  → { tier, pity }
              │     - reads currentBanner().pity.black, pity.purple
              │     - fires black pity when pullsSinceLastBlack == pity.black - 1
              │     - fires purple pity when in 10-pull batch and idx == pity.purple - 1
              │
              ├── pickItem(tier)                → { name, featured, tier }
              │     - if no featured for this tier: uniform pick from pools[tier]
              │     - if SSR featured:
              │         · firstSsrGuaranteed & !firstSsrObtained → force featured[0]
              │         · else: chance-roll OR force (from lastFailedFeaturedSsr)
              │         · winning: uniform pick from featured.items
              │         · losing: uniform pick from pools[tier], set lastFailedFeaturedSsr
              │     - if SR featured (appliesToTiers includes this tier):
              │         · same 50/50 mechanic; featured items may live in a different sub-tier
              │           → return picked.tier so counting stays consistent
              │
              ├── Update state.pullsSinceLastBlack (reset if black, else ++)
              ├── Update state.curPullIdx + curPullHasPurplePlus (only if inTenPullContext)
              ├── state.counts[actualTier]++, state.totalDrawn++
              ├── computeFeatherAndSecret(tier, name, drawNo)
              │     - tracks itemCounts, itemDraws, feather rewards, secrets
              ▼
Return record { tier, name, pity, reward, drawNo, kind, featured, first }
     │
     ▼
renderDrawGrid(pulls) + renderStatus() + renderStats() + renderLog()
```

Batch simulator (`runBatchSim`) mirrors this pipeline in pure local variables — never
touches `bannerState`. See § 5.

### 3.3 UI Structure

```
<container>
├── <h1> + <subtitle>
├── <panel>                        Main tab container
│    ├── <div class="tab-bar">
│    │    ├── button[data-tab="gacha"]    🎁 招募   (default active)
│    │    └── button[data-tab="batch"]    📊 批量模拟
│    │    (button[data-tab="trial"] 40 连试炼 is commented out; JS logic preserved)
│    │
│    ├── <div id="tab-gacha" class="tab-content">
│    │    ├── banner-picker (4 buttons, one per BANNERS entry)
│    │    ├── featured-block (dynamic: shows current banner's UP characters + summary)
│    │    ├── status-bar (8 pills: totalDrawn, pity, purplePity, blackCount,
│    │    │             pityTriggers, singleTenCounts, currencySpent, promoRemaining)
│    │    ├── promo checkbox row
│    │    └── btn-row: 来一杯 / 来十杯 / 重置本吧台记录
│    │
│    └── <div id="tab-batch" class="tab-content hidden">
│         ├── banner <select> + N <input>
│         ├── btn-row: 运行模拟 / 清空结果
│         └── <div id="batch-result">   (populated by renderBatchResult)
│
├── <panel id="panel-stats">       统计数据 — reads bannerState[activeBanner]
│    │    (hidden via switchTab when tabId != 'gacha')
│    ├── stats-grid: tier stats + feather stats
│    ├── latest-block: draw-grid (10-pull cards) + latest-hint text
│    └── stats-grid: stats-roster + log-box
│
└── <panel>                        规则与概率 · 卡池清单 (bottom, collapsible <details>)
     └── pool-black / pool-purpleSailor / pool-purpleShadow / pool-blueShadow lists
         (regenerated by renderPoolLists() on switchBanner)
```

### 3.4 Global Tooltip System

Single `<div class="global-tooltip">` appended to `<body>` on load. Elements with
`data-hover-id="tt-N"` attribute get tooltip content resolved from a `tooltipCache`
Map. Event delegation on `document.body` handles mouseover/mouseout/mousemove.

- **Registered from 3 sites**: `renderDrawGrid()` (cards), `renderStats()` (roster),
  `renderLog()` (log lines) — each `registerTooltip(html)` returns a fresh id.
- **Cache cleared** in `renderDrawGrid()` and `manualReset()` to prevent unbounded
  growth (each new pull re-registers all currently-visible tooltips).
- **Positioning**: `positionTooltip(e)` clamps to viewport edges, follows mouse.

### 3.5 UP Overlay (CSS-only, no baked icons)

Featured items get a gold "UP" badge via `::before` pseudo-element on `.avatar.is-up`
and `.mini-avatar.is-up`. The `upClass(name)` helper checks `isFeatured(name)` against
the active banner and appends the CSS class at 7 render sites (draw grid, roster,
log, pool lists, featured-info block, 40连试炼 rare-list & compact-grid).

**Design rule**: icon PNGs never contain the "UP" text. If a source screenshot has it
baked in (茉莉's bottom-left), the CSS badge is deliberately placed top-right to
avoid clashing.

## 4. Feature Inventory

### ✅ Shipped

| Feature | Location in code |
|---|---|
| 4 banners with distinct rules/pools/currencies | `BANNERS = { ... }` |
| Genshin-style featured rate-up (50/50 or 75/25 + guaranteed-next) | `pickItem()` |
| First-SSR-guaranteed-featured for event banners | `pickItem()` SSR branch |
| Rolling SSR pity (per-banner threshold: 40 or 80) | `chooseTier()` |
| Per-10-batch SR pity (resets each 10-pull) | `tenPull()` resets `curPullIdx` |
| 40-draw 8折 promo (newcomer only), user-toggleable | `tenPullPrice()`, `promoRemaining()`, `togglePromo()` |
| Currency icons in status pill + buttons | `.coin-icon` CSS, `renderStatus()` |
| Per-banner button verbs (来一杯 vs 寻找 N 次) | `cfg.buttons` fallback logic |
| Per-item draw-history tooltip on hover | `registerTooltip()` + event delegation |
| UP badge overlay (CSS-only, no icon variants) | `.is-up::before`, `upClass()` |
| Monte Carlo batch simulator (1 to 1M banners) | `runBatchSim()`, `renderBatchResult()` |
| Banner-scoped 统计数据 panel (hidden on batch tab) | `switchTab()` toggles `#panel-stats` |
| Full state isolation between banners | `bannerState` map |
| 40 连试炼 tab (commented out, code preserved) | search "trial" |

### ⚠️ Known Limitations / TODOs

- **每周免费 · 记忆重逢 banner not modeled**. Deliberately skipped (1-per-week guaranteed pull, non-random). Add if useful.
- **噼噜的旧日秘藏 costs not confirmed**. Currently defaults to 1/10 tokens per pull; may not match actual game.
- **茉莉 icon has game-baked "UP" text** in bottom-left corner (source screenshot artifact). Our overlay is top-right — no visual clash but the two "UP"s coexist.
- **No import/export**. All state is in-memory; page refresh wipes progress.
- **Pool lists at bottom** only show the active banner. Switching banners re-renders these.
- **Batch sim doesn't track "N draws until first UP"** style latency metrics. Adds could go in `runBatchSim()`.
- **No dark/light theme toggle**. Fixed dark theme.

## 5. Batch Simulator Details

`runBatchSim()` is a self-contained Monte Carlo that reads the selected banner's
config and runs N complete pity-cycles (40 or 80 draws each, depending on banner).
Uses only local variables — never touches `bannerState`.

Aggregates collected:
- Total draws per tier
- Black-pity trigger count (how often the 40th/80th-slot rescue fired)
- Purple-pity trigger count (how often a blue got upgraded to purple on the 10th slot)
- **Featured hit stats**: `featuredSsrHits`, `featuredSrHits`, `firstSsrIsFeatured`
- Blacks-per-banner distribution (0/1/2/3/≥4 buckets)
- Purples-per-banner distribution (0..14, ≥15 buckets)
- Aggregate feather rewards

Rendered to `#batch-result` as a two-column grid (tier rates + pity + featured on left;
histograms on right). See `renderBatchResult()`.

Performance: ~200 ms for N=1,000,000 banners (40M draws total) on modest hardware.

## 6. Common Extension Tasks

### 6.1 Add a new banner

1. Add entry to `BANNERS = { ... }`:
   ```javascript
   newBanner: {
     id: 'newBanner',
     name: '...',
     currency: { key, label, iconPath: 'gacha-screenshots/icons/coin-X.png' },
     pity:  { black: 40 or 80, purple: 10 },
     rates: { black: 0.008, purpleSailor: ..., purpleShadow: ..., blueShadow: ... },
     combined: { black, purple, blue },
     pools: { black: [...], purpleSailor: [...], purpleShadow: [...], blueShadow: [...] },
     featured: null OR { ssr: {...}, sr: {...} },
     cost: { single, tenPromo, tenFull },
     promo: null OR { limit: N },
     buttons: undefined (defaults to 来一杯/来十杯) OR { single, ten },
     firstSsrGuaranteed: false
   }
   ```
2. Add to `bannerState` init: `newBanner: freshBannerState()`.
3. Add to `BANNER_ORDER` array.
4. Add banner-picker button inside `<div class="banner-picker">` (search "banner-btn active").
5. Add `<option>` inside `<select id="batch-banner">`.
6. Register any new icons in `NEW_ICON_MAP`.

### 6.2 Add a new item icon

1. Save source screenshot into `gacha-screenshots/` (any filename).
2. Crop via PowerShell + inline C# (see project git history — `[CoinChroma]::Process`
   pattern for coin-style transparent icons; `Crop-IconCentered` for character portraits).
3. Save PNG under `gacha-screenshots/icons/<name>.png`.
4. Add mapping to `NEW_ICON_MAP` (search that identifier in the HTML):
   ```javascript
   '角色名': 'gacha-screenshots/icons/<name>.png'
   ```
5. If the character is already in a `BANNERS[X].pools[tier]` array, `avatarHtml()`
   will pick up the icon automatically. If new, add to a pool first.

### 6.3 Tweak rates / pity thresholds

- All numbers live in the corresponding `BANNERS[banner].rates` / `.pity` / `.combined`.
- No code changes required; `chooseTier()` reads via `currentBanner()`.

### 6.4 Change UP mechanic (e.g. 60/40)

- Modify `BANNERS[banner].featured.ssr.chance` (or `.sr.chance`).
- Set/unset `firstSsrGuaranteed` per banner.
- `pickItem()` reads chance dynamically — no other changes needed.

### 6.5 Restore the 40 连试炼 tab

- Uncomment two blocks in HTML: the `<button class="tab-btn" data-tab="trial">` line
  and the `<div class="tab-content hidden" id="tab-trial">` block.
- All JS logic (`run40Trial`, `run40TrialBatch`, `clear40Trials`, `render40Trials`,
  `simulateBanner`) is intact and unreferenced elsewhere; just needs the DOM back.

## 7. Session History (high-level)

Milestones in the order they were built:

1. **Icon extraction pipeline** — PowerShell + System.Drawing to crop 42 newcomer-pool icons from raw screenshots. Auto-registered via `PORTRAITS[name] = path`.
2. **Layout & tabs** — Panel reordering, added tab container hosting 招募 + 40 连试炼.
3. **Draw grid + roster + log** with global tooltip system for per-item hover details.
4. **Promo toggle + rolling pity refactor** — Replaced hard 40-cap with rolling pullsSinceLastBlack. Removed "banner-closed" lockdown.
5. **Multi-banner refactor** — Introduced `BANNERS` registry, `bannerState` map, `switchBanner()`, `activeBanner` tracker. Live `state` alias preserves existing code paths.
6. **Featured rate-up** — Genshin-style 50/50 (or 75/25) + guaranteed-next-featured + first-SSR-guaranteed. Added `is-up` CSS overlay.
7. **Coin icons** — Extracted silver/gold/pilu tokens via inline-C# chroma-key (transparent bg, soft alpha edges).
8. **Button label restructure** — Dropped emoji + parenthesized price group. New format: `[coin] cost · 来一杯（1 抽）`.
9. **Per-banner button verbs** — 噼噜的旧日秘藏 uses `寻找 N 次` (via `cfg.buttons` override).
10. **Panel-hide logic** — 统计数据 panel folds on non-gacha tabs (fixes orphan display).

## 8. Continuation Notes for Next Agent

- Start by opening `ywzh-gachasimulator.html` and reading these anchor lines:
  - `BANNERS = {` → central config, all rules live here
  - `bannerState = {` → per-banner runtime state
  - `chooseTier(inTenPullContext)` → tier RNG + pity logic
  - `pickItem(tier)` → featured mechanic
  - `renderStatus()` → status bar + button labels
  - `runBatchSim()` → Monte Carlo aggregator
- **Before assuming**, ask the user about unconfirmed rules: 记忆重逢 mechanics,
  噼噜的旧日秘藏 exact currency costs, and any per-season rotating characters
  (currently 黑格 + 破碎狂想曲 in `permanent`).
- **Don't** delete the commented 40 连试炼 code — the user preserved it deliberately.
- When cropping new icons: match existing size conventions (60×60 for character
  portraits, 96×96 for coin icons with transparent bg).
- When adding UP badges: never bake into PNG; use `is-up` CSS class.
