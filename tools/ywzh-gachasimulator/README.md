# ywzh-gachasimulator

Single-file HTML gacha simulator modeling "欢迎新船长 / 织梦弦音 / 噼噜的旧日秘藏 / 这里不散场"-style banner recruitment mechanics.

## Quick start

Double-click `ywzh-gachasimulator.html`. No build, no npm, no server. The file is self-contained (all HTML/CSS/JS in one file) with relative image paths pointing to `gacha-screenshots/icons/`.

Tested browsers: any modern Chromium/Firefox from the last 5 years.

## What's in this repo

| Path | Purpose |
|---|---|
| `ywzh-gachasimulator.html` | The whole app (~2100 lines) |
| `docs/SDD.md` | Full design document — read this before extending |
| `docs/archive/snapshot-single-pool.html` | Pre-multi-banner milestone (kept for diffing) |
| `gacha-screenshots/*.png` | Raw source screenshots used to crop icons |
| `gacha-screenshots/icons/*.png` | 55 icon PNGs referenced by the app at runtime |

## Feature quick tour

Open the app and try:

1. **🎁 招募 tab** — Click 来一杯 (single pull) or 来十杯 (10-pull). Hover any card / roster row / log line to see the per-draw tooltip. Toggle **启用首 40 抽 8 折优惠** to see button price flip live.
2. **Banner picker** (row of 4 buttons above the status bar) — switch between 欢迎新船长 / 织梦弦音 / 噼噜的旧日秘藏 / 这里不散场. Each banner has independent state, its own pity counters, its own currency icon, its own featured UP characters. 噼噜的旧日秘藏 uses "寻找" verb + shadow-only loot pool.
3. **📊 批量模拟 tab** — pick a banner from the dropdown, set N (1 to 1,000,000), hit 运行模拟. Get aggregated Monte Carlo stats: tier rates vs theoretical, pity trigger counts, featured hit rate, distribution histograms.
4. **底部规则** (collapsible footer) — full loot list for the currently-active banner. UP characters carry gold UP badges via CSS overlay (icons themselves are clean).

## Not modeled (yet)

- 每周免费 · 记忆重逢 (weekly free) — deliberately skipped; single-pull-per-week, 100% guaranteed reward, non-random.
- 噼噜的旧日秘藏 currency cost — using 1/10 as reasonable default; not confirmed against in-game numbers.

See `docs/SDD.md` § "Known Limitations / TODOs" for the full open list.

## Extending

Common tasks (add a banner, add an icon, tweak rates) are step-by-step in `docs/SDD.md` § "Common Extension Tasks".
