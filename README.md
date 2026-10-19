# ATELIER — Digital Wardrobe & Outfit Studio

A private, offline-first wardrobe for **men and women**. Catalogue every piece you own, let a transparent rules engine compose **multi-layered outfits**, and arrange them as flat-lay boards or on a mannequin. No account, no cloud, no AI, no subscription — everything runs on your phone and is stored on your device.

> A wardrobe, composed.

## What's inside

| | |
|---|---|
| **Wardrobe** | Camera / gallery import, crop, rotate, one-tap backdrop erase, auto colour suggestion, categories, sizes, brands, seasons, occasions, formality, **layer position**, warmth, favourites, laundry / worn / archived status, filters, search, cost-per-wear. |
| **Discover** | Deterministic outfit engine: colour harmony (neutral base, accent, tonal, analogous, complementary), formality coherence, pattern mixing, styling rules, seasonal **warmth balancing**, favourites and an under-used bonus — scored out of 100 with a “why this works” breakdown. Variety control, swap or remove any piece, build around a chosen garment. |
| **Layering** | Four stacking slots — **Base → Mid → Outer → Coat**. Looks can stack up to four layers (e.g. turtleneck + sweater + blazer + overcoat), with contrast and bulk-order checks. Outerwear can be shown **worn open** to reveal the layer beneath. Dresses and jumpsuits take layers too. |
| **Studio** | Flat-lay board (Classic / Editorial / Compact / Weekend, four canvas ratios) **or** mannequin mode with a men's and a women's form. Drag, resize, rotate, mirror, reorder, hide, change opacity, snap to grid, replace pieces, change backdrop, export PNG, share. |
| **Calendar** | Plan outfits per day, mark them worn (updates wear counts), add notes. |
| **Insights** | Collection stats, palette bar, most worn, waiting to be worn, best cost-per-wear. |
| **Data safety** | IndexedDB (Dexie), versioned ZIP export / restore (merge never overwrites; replace downloads a safety backup first), storage meter, persistent-storage request. |
| **Sample wardrobe** | 44 illustrated placeholder pieces for men and women so you can explore immediately. Removable in Settings. |

## Run locally

```bash
npm ci
npm run dev        # http://localhost:5173/ATELIER/
npm test           # engine, storage and backup tests
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build
```

Requires Node 20+ (Node 22 recommended).

## Deploy to GitHub Pages

1. Put these files in the root of the repository `okmantz/ATELIER` and push to `main`.
2. In the repo go to **Settings → Pages** and set **Source = GitHub Actions**.
3. Wait for the **Deploy ATELIER** workflow to go green.
4. Open `https://okmantz.github.io/ATELIER/`.

**The base path is case-sensitive.** `vite.config.ts` uses `/ATELIER/` to match the repository name. If you rename the repo, build with `VITE_BASE=/new-name/` (or edit the default in `vite.config.ts`).

> GitHub Pages hosts the *app*, not your data. Your garments and photos live only in your browser's storage. Never commit personal photos or backup `.zip` files to a public repo.

## Install on Android

1. Open the Pages URL in **Chrome**.
2. Menu **⋮ → Install app** (or **Add to Home screen**).
3. Launch ATELIER from the home screen. Open it once online so it can cache itself, then airplane mode works.

Because data is stored per browser, use the **same installed app** each time and take a backup (Settings → Export wardrobe) now and then.

## How the outfit engine works

`src/engine/`

1. **Filter** — drop laundry/archived items, other-gender items (per Style focus), items that don't suit the occasion or season.
2. **Stack** — build every valid layer stack (base / mid / outer / coat, up to your layer limit) and keep the best; then add bottoms (or none for one-pieces), shoes, and accessories greedily (one per body zone).
3. **Score** (weights editable in Settings; defaults 30 / 25 / 20 / 10 / 10 / 5): colour harmony · occasion & formality · compatibility (formality spread, pattern clash, styling rules, layer contrast/bulk) · seasonal suitability (tags + warmth budget) · personal favourites · under-used bonus.
4. **Diversify** — greedy maximal-marginal-relevance: `S_final = S_base − λ · similarity`, with a cap on shared items so you don't get thirty near-identical looks.

A single outfit never mixes men's-only and women's-only pieces; unisex pieces go with either.

## Project structure

```
src/
  app/            shell, routing, navigation, app context
  components/     GarmentCard, FilterDrawer, BottomNavigation, LayoutPreview, Sheet…
  features/       wardrobe · garment-editor · outfit-discovery · outfit-studio ·
                  mannequin-studio · calendar · statistics · settings
  engine/         color-harmony · compatibility · outfit-scorer · outfit-generator · diversity
  storage/        database (Dexie) · garments · outfits · calendar · settings · backup
  imaging/        resize/encode · crop/rotate/backdrop erase · colour sampling · export
  samples/        sample wardrobe silhouettes
  styles/         tokens · global · editorial
public/           icons, mannequin SVGs
tests/            colour, generator and storage/backup tests
.github/workflows/deploy.yml
```

## Good to know

- The **mannequin** is a styling visualisation, not a photoreal try-on: a flat photo can't wrap a body. For the best result use cut-out garments — the **Erase backdrop** tool in the editor makes transparent PNG/WebP cut-outs from plain backgrounds. Fine-tune any layer afterwards.
- Photos are resized to 1,600 px (thumbnails 360 px) and stored as WebP where supported.
- Booleans aren't valid IndexedDB keys, so favourites and similar flags are filtered in memory; indexed fields are category, status, gender, colour and dates.

## Roadmap ideas

Back-view mannequin · manual brush eraser · weather ranges · user-rated looks feeding the preference score · outfit-of-the-day reminders · multi-device sync via export/import.
