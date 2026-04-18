# BasketWise — App Brief for Seed

## The one-sentence pitch

A fast, honest, free-forever grocery comparison app for Australian shoppers that shows the real price of your whole basket across Coles, Woolworths, and Aldi — with fake-special detection, unit pricing as a first-class citizen, and architecture ready for the ACCC's mandated pricing APIs. No ads in the shopping flow, no subscription paywalls on core comparison, no affiliate funnels.

**Domains:** `basketwise.com.au` / `basketwise.app` (both available as of April 2026)

---

## Why this exists (the problem, not just the product)

Australians spend ~$240/week per family of four on groceries ($12,480/year per Canstar 2025). Coles and Woolworths hold >65% market share. The ACCC's 2025 Supermarkets Inquiry found their margins are among the highest globally, and their "Down Down" / "Prices Dropped" promotions were found to be misleading on hundreds of products. The ACCC has now formally recommended that large supermarkets publish live prices via API — meaning the legal/political wind is at the back of apps like this for the first time.

Every previous attempt to build this app in Australia has failed for one of six reasons. The whole design of BasketWise is a direct response to each of them.

### Failure mode 1: The app dies silently
- **SmartCart** (joinsmartcart.com, Chrome extension) — featured on Sunrise, had genuine momentum in 2021–2022, by January 2026 users on OzBargain were posting "Dead. RIP." The extension stopped popping up at checkout, the web version stopped loading products. No communication to users.
- **PriceHipster** — referenced in community threads as "currently broken" years before SmartCart died.

**What we learn:** These were side projects or thinly-funded startups. When the one engineer got busy or the scraper broke, there was no-one to fix it. We need an architecture that degrades gracefully and a roadmap that doesn't assume infinite free labour.

### Failure mode 2: The app gets bought or restructured and loses its soul
- **Frugl** (ASX:FGL, now under IFG) — started as a pro-consumer comparison app, pivoted to become a B2B "retail intelligence" platform selling data to the very retailers it was originally helping shoppers escape. The consumer app was outsourced to a Thai software company to "maintain" — effectively parked.

**What we learn:** Don't build a company whose only viable exit is selling data back to Coles and Woolies. Build something with a consumer revenue model that doesn't compromise the comparison.

### Failure mode 3: Bloat, ads, and the "everything app" trap
- **WiseList** — legitimately good grocery comparison buried under an AI meal planner, bill tracker, pantry organiser, to-do list, and a front page that funnels users to health insurance, home loans, and broadband comparison affiliates (Compare the Market, Aussie, Econnex). The App Store reviews show the cracks: notifications that crash the app, ads appearing on paid accounts, products that don't match (searching "watermelon" returns flavoured items first).

**What we learn:** A grocery comparison app should be a grocery comparison app. Mission creep destroys trust. Every additional feature is additional surface area to break. We ruthlessly scope to the core job.

### Failure mode 4: Subscription paywall strips the saving
- **Grocerize** gates comparison behind a $4.99/month "Plus+" paywall modal that appears before the user can browse properly. If the app saves a typical shopper $15–$30/week, a $5/month subscription is tolerable but the aggressive modal erodes trust on first contact.

**What we learn:** Core price comparison must always be free. Monetisation must come from things that don't degrade the comparison for non-paying users. TrolleyMate's model (gate household sharing tiers, not comparison) is smarter.

### Failure mode 5: The duopoly wins the scraping arms race
- Coles and Woolies both aggressively rate-limit, cloak prices behind JS challenges, and change DOM structures to break scrapers.
- A consumer-facing extension that injects into their checkout page is a particularly fragile architecture — it breaks every time they push a frontend update.

**What we learn:** Don't build on the checkout page. Build an independent app that pulls data from as many sources as possible and fails over between them. When the ACCC-recommended API mandate lands, we're ready day one.

### Failure mode 6: The app demands too much from the user
- **Frugl's original model** required users to manually enter prices — a user-generated content play that only works at massive scale and offers nothing on day one to the first user.
- Other apps require building a shopping list from scratch before showing any value.

**What we learn:** Give value in the first 10 seconds. Search "milk", see three prices. That's the magic moment. For returning users, TrolleyMate's "receipt-to-list" feature (scan a receipt, create a list instantly) is the best cold-start solution anyone's built — we adopt this for V2.

---

## Who this is for

**Primary persona: The dual-shopper family.** Household of 2–4, spends $180–$280/week on groceries, has a Coles OR Woolies within 5 minutes and probably an Aldi within 15. Currently loyal out of inertia. Would happily split a shop across two stores if the app made it effortless. Doesn't want to clip coupons or play loyalty-point games. Wants one number: "how much am I saving by doing it this way?"

**Secondary persona: The price-sensitive solo.** Uni student, pensioner, or single-income household. Small shop, high sensitivity to unit price. Needs "cheapest per 100g" more than total-basket optimisation. Will absolutely walk to the cheaper store.

**Explicit non-persona:** We are not building for the hobbyist bargain-hunter who enjoys stacking deals, cashback portals, and Flybuys multipliers. Apps like OzBargain already serve them. Trying to serve both audiences is why WiseList feels cluttered.

---

## Core principles (non-negotiable design constraints)

1. **Free forever for the comparison.** Search, basket comparison, store-split recommendation, price history, specials, and swap suggestions are always free. No "premium tier" for these. Ever.
2. **No ads in the shopping flow.** A tasteful sponsored-product slot in a dedicated "Deals" tab is acceptable in future; an interstitial between your basket and your total is not.
3. **No affiliate funnels to unrelated products.** No insurance, no home loans, no energy switching. Those aren't groceries.
4. **Prices are dated.** Every price shown has a visible "as of" timestamp. If data is older than 48 hours, it's visually flagged, not hidden.
5. **The app never tells the user a price it knows is wrong.** If a product hasn't been scraped/refreshed in the last 7 days, it's shown as "price unknown" with the last-seen price as a historical reference. Better to admit we don't know than to mislead.
6. **Unit price is the equal citizen of total price.** Every product tile shows $/kg, $/L, or $/100g alongside ticket price at equal visual weight. Shrinkflation detection is the whole point.
7. **Own-brand vs name-brand is explicit.** When a user searches "rice bubbles", they see Kellogg's, Coles brand, Woolies Essentials, and Aldi's equivalent side by side — clearly labelled.
8. **Offline-first.** A user in the aisle at Coles with patchy 4G must be able to check their basket and see prices from the last sync.

---

## Feature scope — V1 (ship this)

### 1. Fast search
- Single search bar, universal.
- Type-ahead after 2 characters with search suggestions.
- Results show: product name, pack size, each store's price, cheapest highlighted, unit price, last-updated timestamp.
- Filter chips: store, on-special-only, brand vs private label, dietary (gluten-free, halal, vegan — just tag-based, no "health scores").
- **Do not** show 80 watermelon-flavoured items when the user searches "watermelon". Basic query intent: fresh produce matches rank above flavoured products.

### 2. The Basket
- Add items from search. Basket is the whole app — it's what the user returns to.
- For each basket item, show the cheapest store with a clear delta ("Save $1.40 at Aldi").
- The basket has a running total for each store and a "Maximise Savings" total that picks the cheapest option for each line.
- **Summary card at the top:** Three numbers at a glance — "Total: $X | Savings: $Y | Stores: Z". Updates live as items are added, removed, or swapped. (Validated by Bargeroo's shopping list UI.)
- The split view shows separate lists grouped by store with store logo, item count, and subtotal per store. Prominent 1-tap toggle to collapse the split into a single-store view.
- **Store pill dropdown per item:** Each item auto-assigns to the cheapest store, but the user can tap a store dropdown to manually reassign it (e.g., move everything to Coles if they don't want to drive to Aldi today). This overrides the auto-optimisation without losing it. (Validated by Bargeroo's UX — their best interaction pattern.)
- **Two views, always in sync:** A Compare view (shows savings, prices, and store assignment) and a List view (tick-off checklist for in-store use, grouped by category).
- **Smart Swaps:** For any item, a "Replace" button shows equivalent products across stores — cheaper or premium. One-tap swap, total updates instantly. (Validated by both TrolleyMate and Bargeroo as a must-have.)
- **Green highlight on best price:** In product detail, the cheapest store's row gets a green background. Instant visual hierarchy — the user's eye goes straight to the best deal. (Validated by Bargeroo's product detail UI.)

### 3. Price history (the anti-"Prices Dropped" feature)
- For each product: a 90-day sparkline chart of price at each store.
- Annotated with the word "Special" on dates the product was on promo.
- **Min/avg/max stats per store:** Shows the lowest, average, and highest price each store has ever charged. Gives instant context — "Is $4.50 actually cheap for this?" Computed from PriceRecord. (Validated by Bargeroo's price history feature.)
- **Honesty tag:** if a product was on "special" this week but the current "special price" is higher than or equal to the 60-day trailing average, the app shows a red "Not actually a saving" badge. This is the single most useful feature in the app and directly addresses the ACCC's findings on misleading discount claims.
- **This is our primary differentiator.** Bargeroo shows the chart and asks the user to judge. BasketWise does the maths and shows the badge. No other competitor automates this.

### 4. Specials & half-price feed
- A tab showing genuine half-price and ≥30% off deals across the three stores, updated weekly.
- Filter by store, category.
- "Recommended specials" surfaced based on the user's favourites.
- Tap any deal to add to basket.
- No "sponsored" items in this feed in V1.

### 5. Favourite groups
- Organise favourite products into named groups ("Weekly staples", "BBQ", "Top-ups", "Lunchboxes").
- One-tap add an entire group to the basket.
- Favourites show a notification badge when any item in the group goes on special.
- Share favourite groups via URL (no account required on the receiving end to view).
- This replaces flat "saved lists" — more flexible, more reusable, validated by TrolleyMate's favourite groups feature.

### 6. Location awareness
- User enters a postcode once.
- App filters to products stocked at nearby stores where stock data is available; falls back to national pricing where it isn't.
- Shows the nearest store of each chain with distance (walking and driving minutes, using a free routing API).

### 7. The "Handoff"
- When the user is ready to actually shop, a single button per store that exports their basket:
  - For Coles/Woolies online: opens their site with the basket items pre-searched (via deep links) since we can't legally add to their cart for them.
  - For in-store: a printable/shareable list grouped by category.
- **Do not** attempt to impersonate the user and add to cart. That's what got SmartCart in hot water as an extension and it's a scraping arms race we will lose.

### 8. Savings tracker
- Running tally of cumulative savings over time ("You've saved $847 with BasketWise this year").
- Simple chart showing weekly savings trend.
- This is retention gold — users who see their savings accumulate don't churn. Validated by TrolleyMate's "Track your wins" feature.

---

## Feature scope — V2 (roadmap, not V1)

These are validated by competitor research but add too much complexity for launch:

1. **Receipt-to-list:** Scan a receipt photo, AI extracts items, creates a shopping list instantly. Solves the cold-start problem. TrolleyMate's best feature — worth adopting but requires OCR/AI pipeline.
2. **AI receipt savings analysis:** After scanning a receipt, show "you could have saved $X by shopping at [store] for these items." Post-shop validation, not pre-shop comparison.
3. **Household sharing (premium):** Real-time shared lists for 2–6 people. Gate behind premium tier (TrolleyMate's model: $2–$6/month by household size). Free tier = 1 shopper.
4. **Barcode scanning:** Scan a product in-store, see prices at other stores instantly.
5. **Price drop alerts:** Get notified when a favourite product drops below a target price or hits a historical low.

---

## Explicitly out of scope (V1 and probably forever)

- Meal planning / recipe generation
- Pantry / fridge inventory tracking
- Bill & subscription tracking
- To-do lists
- Insurance / energy / broadband comparison affiliates
- Automatic checkout or cart injection
- Loyalty points optimisation (Flybuys/Everyday Rewards)
- Social features (following other shoppers, sharing savings publicly)
- Dietary/health scoring (this is value-laden and litigation-prone; just show tags)
- Fridge notes (TrolleyMate has this — it's scope creep)

Every one of these is how WiseList got bloated. Say no now.

---

## Data model

### Entities

**Product** — canonical item (name, category, brand, pack_size, unit_of_measure, image_url). Represents the normalised product across all stores.

**StoreProduct** — per-store SKU mapping. Maps each store's specific product name, SKU, URL, barcode (EAN/GTIN), and image to a canonical Product. Matching happens in the ingestion pipeline at scrape time, not at query time. Includes a `barcode` column ready for GS1/GTIN identifiers when the ACCC API mandate delivers standardised product data.

**Store** — Coles / Woolworths / Aldi (and eventually IGA, etc.)

**PriceRecord** — one record per product per store per day. Fields: `product_id`, `store_id`, `price`, `unit_price`, `unit_measure` (per_kg, per_L, per_100g, per_unit), `is_special`, `special_type` (half_price, multi_buy, prices_dropped, down_down, rollback, null), `scraped_at` (full timestamp), `date` (date only, indexed, used for charting). Composite unique constraint on `(product_id, store_id, date)` — upsert on each scrape so the latest price wins for that day.

**Basket** — user's shopping list (server-side for authenticated users only).

**BasketItem** — product + quantity, linked to a basket.

**FavouriteGroup** — named group of favourite products ("Weekly staples", "BBQ"). Linked to a user.

**FavouriteGroupItem** — product linked to a favourite group.

**PriceAlert** — product + store + target price + user (V2 premium feature).

**User** — email, magic link token, premium status, postcode, created_at.

### Product matching strategy

V1 starts with a curated set of ~2,000–3,000 top products hand-matched across Coles, Woolworths, and Aldi. This covers ~80% of typical baskets. Matching happens in the ingestion pipeline using product name normalisation, pack-size extraction, brand detection, and barcode (EAN/GTIN) matching where available.

Unmatched products show "price not available at this store" rather than a bad fuzzy match. Better to be honest about gaps than to show wrong comparisons.

When the ACCC API mandate delivers standardised product identifiers, the `StoreProduct.barcode` column is ready.

### Price history approach

One record per product per store per day. At 3 stores × 5,000 products × 365 days = ~5.5M rows/year. PostgreSQL handles this without issue. A separate `PriceAuditLog` table for raw scrape-level history can be added later if ACCC reporting requires intra-day resolution.

### Anonymous baskets

localStorage first, no server session for anonymous users. Basket schema in localStorage mirrors the server schema so migration is seamless. On account creation (magic link email), POST the localStorage basket to the server and clear local state. Anonymous users get the full comparison experience entirely client-side using cached price data.

---

## API surface

- `GET /api/search?q=milk` — product search with prices across stores. Includes `special_check` flag (is this "special" actually below trailing average?) to power the "Not actually a saving" badge without an extra round trip.
- `GET /api/product/:id/history` — 90-day price history for the chart.
- `POST /api/basket` / `PATCH /api/basket/:id` — basket CRUD (authenticated users only).
- `GET /api/basket/:id/optimise` — the money endpoint: returns single-store totals + mix-and-match split + savings delta + per-store item lists.
- `GET /api/product/:id/swaps` — returns similar/equivalent products across stores, sorted by price.
- `GET /api/specials?store=&category=` — current specials feed.
- `GET /api/categories` — category tree for browsing.

Auth can wait for premium features. The core comparison flow works entirely unauthenticated.

---

## Data sourcing strategy (the hard problem)

This is where the app lives or dies. Three-tier approach:

### Tier 1 (preferred): Official structured sources
- Coles and Woolworths both publish product catalogues via their own consumer apps with documented internal JSON endpoints. These change but are more stable than HTML scraping.
- Aldi publishes weekly specials as structured data on their site.
- When the ACCC's recommended supermarket pricing API lands (Recommendation 2 of the 2025 final report), integrate day one.

### Tier 2 (reliable fallback): Catalogue and site scraping
- Scheduled scrapes of each store's online grocery site, rotated across residential IPs, with polite rate limits (1 req/sec per domain) to stay below any reasonable threshold.
- Weekly catalogue PDFs parsed for specials.

### Tier 3 (last resort): Community-verified prices
- A lightweight "flag wrong price" button on every product tile.
- NOT user-submitted prices (Frugl tried that — nobody enters prices for free). Just flags that trigger re-scrape priority.

**Legal posture:** Scraping publicly displayed prices is lawful in Australia and the ACCC has now explicitly endorsed third-party price comparison. The supermarkets scrape each other. We are on the right side of both the law and the regulator.

**Architectural requirement:** All data sources are abstracted behind a single `PriceProvider` interface. When one breaks, others still work, and the app gracefully shows stale data with a warning rather than no data.

---

## The ACCC API mandate: why BasketWise's timing is perfect

The ACCC's March 2025 Supermarkets Inquiry final report (441 pages, 20 recommendations, informed by 20,000+ consumer surveys) includes Recommendation 2, which is the single most important policy development for this app category in Australian history.

**What it says:** Coles, Woolworths, Aldi, and other large supermarkets should be required to publish live, dynamic pricing data via APIs to third-party comparison services. The ACCC explicitly references the Consumer Data Right (CDR) framework as a model — meaning structured JSON, standardised schemas, documented endpoints.

**What it means for us:** The ACCC has formally acknowledged that scraping is "problematic" and that comparison apps have been forced to rely on it because supermarkets refuse to share data voluntarily. The regulator's position is that mandating API access "could materially benefit consumers and competition" and "would promote the ability of third-party price comparator businesses to develop effective models."

**Why this is an architectural decision:** Every competitor that hardcoded their scraping logic will need a significant rewrite when these APIs land. BasketWise is built from day one with a `PriceProvider` interface abstraction. Scraping is just the first implementation. When the official API drops, we swap the provider and ship — while everyone else scrambles.

**Government funding is on the table.** The ACCC noted that government funding may be required to help price comparison tools meet API access requirements. Potential grants pathway.

**Timeline expectation:** 12–24 months before mandated APIs are live, based on CDR rollout timelines in banking and energy. Build now on scraping, be ready for APIs when they arrive.

---

## Updated competitive landscape (April 2026)

### Grocerize (grocerize.com.au)
Founded by Blake Bennett (Newcastle), bank-backed (Greater Bank partnership), CommBank Brighter feature. Claims 28% average savings. Coles + Woolworths only (no Aldi). $4.99/month premium paywall with aggressive modal. "Build my shop (AI)" button signals bloat creep. Extensive media coverage (Today, 7 News, 9 News, Herald Sun).
**Vulnerability:** No Aldi, paywall on comparison, AI bloat incoming, no price history, no fake-special detection.

### TrolleyMate (trolleymate.com.au)
**Our closest direct competitor.** Trolleymate Operations Pty Ltd (Australian). Native iOS/Android app. Features: side-by-side price comparison, "Maximise Savings" auto-split, smart swaps, favourite groups, AI receipt scanning (scan → savings analysis + receipt-to-list), household sharing (up to 6), best unit price button, savings history tracking. Pricing: free tier (1 shopper, all features) / $2/mo (2 shoppers) / $4/mo (4) / $6/mo (6). Clean, focused design — "the shopping list that saves you money."
**Vulnerability:** No price history charts, no fake-special detection, no trailing-average analysis, no data freshness indicators, no web app (native only), no ACCC positioning, no political/media angle.

### Szumark (szumark.com.au)
New entrant, Channel 9 News feature. Covers 5 stores (incl. Chemist Warehouse, Priceline). iOS/Android with price history graphs and "how rare is this discount" intelligence. Offline mode.
**Vulnerability:** Specials/deals focused, not a basket comparator. No mix-and-match. Pharmacy focus dilutes grocery depth.

### WiseList
350k claimed users, 4.4★. Recently added Aldi. Heavily monetised through insurance/energy/broadband affiliate funnels.
**Vulnerability:** Feature bloat, trust erosion, ads on paid accounts, affiliate-driven incentive misalignment.

### Bargeroo (bargeroo.com.au)
Solo dev (Jans Johnson, uni student, "krydent.tech@gmail.com"). iOS/Android. 37,000+ products, 3 stores, 24hr price updates, claims $1,200+ avg annual savings. Free + Pro ($2.99/mo for ad-free). Strong UX from screenshots: summary card (Total/Savings/Stores), auto-grouped shopping list by store with subtotals, store pill dropdown per item for manual reassignment, "Replace" button on every item, green highlight on best-price row, product images, percentage discount badges, was-price strikethrough, "SPECIAL" and "Multibuy" labels. Price history charts (1mo/3mo/all-time) with min/avg/max per store. Stock checking by postcode (ad-gated). Push notifications when favourites go on sale. Active on OzBargain (March/April 2026).
**Vulnerability:** No fake-special detection (shows chart but no automated analysis), no unit price in UI, "Last updated 24 Feb 2026" visible on April screenshot (2 months stale, no staleness warning), no favourite groups, no household sharing, no web app, solo dev risk, ad-gated stock checks annoying users on OzBargain, no ACCC positioning.

### BasketWise's lane
Nobody does all five well simultaneously: (1) honest fake-special detection with automated trailing-average analysis, (2) unit price as a first-class citizen at equal visual weight, (3) mix-and-match basket optimisation across 3 stores with manual store override, (4) data freshness indicators that flag stale prices, (5) architecture ready for ACCC API mandate. Plus: we launch web-first (TrolleyMate and Bargeroo are native-only), and we position around the ACCC transparency narrative (nobody else does). Bargeroo comes closest on features but misses on honesty tooling and data freshness.

---

## Tech stack (confirmed for Seed)

- **Framework:** Next.js 14, TypeScript, Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM
- **Scraping/ingestion:** Separate worker service, decoupled from user-facing API. Writes to DB on schedule.
- **Price abstraction:** `PriceProvider` interface — scraping is the first implementation, ACCC APIs slot in later.
- **Hosting:** Start simple — Vercel for the Next.js app, managed Postgres (Neon/Supabase/Railway). Cloudflare in front for edge caching search results (15-minute TTL).
- **Auth:** Email magic link only. No social login in V1. Anonymous usage works for everything except saving favourite groups and household sharing.
- **Analytics:** Plausible or PostHog self-hosted. No Google Analytics, no Meta pixel. Privacy is a differentiator.

---

## Monetisation (how BasketWise survives without selling out)

Inspired by TrolleyMate's smarter model — gate household features, not comparison:

1. **Free tier (forever):** Full comparison, basket optimisation, price history, specials, swap suggestions, favourite groups, savings tracker. 1 shopper.
2. **BasketWise Plus ($2.99/month or $24/year):** Household sharing (up to 6 shoppers, real-time list sync), unlimited price drop alerts, CSV export, priority receipt scanning (V2). Core comparison is untouched.
3. **Anonymised aggregate data (future):** Sell trend reports (not individual user data) to journalists, researchers, and the ACCC. The Frugl business without the Frugl pivot.

**Explicitly refused:** Selling user shopping lists to brands. Affiliate deals with Coles/Woolworths for loyalty sign-ups. Insurance/broadband/energy funnels. Interstitial ads. Any deal that makes the free experience worse.

---

## Brand & tone

- **Name:** BasketWise
- **Brand family:** GridWise (energy) → SpoolWise (3D printing) → BasketWise (groceries). The "-Wise" family: tools that make you smarter about data in a specific domain.
- **Colour:** Not red (Coles) and not green (Woolies). Charcoal + a warm accent — warm mustard yellow or a confident teal. Clean, neutral, honest.
- **Voice:** Dry, honest, faintly sceptical of marketing. The tone of a mate who's done the maths. "That 'special' is the same price it was six weeks ago" is more on-brand than "Save big!!!"
- **Tagline candidates:** "Shop wise. Pay less." / "Your basket, optimised." / "The wise way to fill your basket."
- **Landing page savings calculator:** Interactive slider — user drags their weekly grocery spend, sees potential weekly and annual savings with fun equivalents ("That's like 312 coffees or 20 nights out"). Validated by Bargeroo's landing page as a strong conversion tool.
- No emoji in product copy. No "🔥 HOT DEAL 🔥".

---

## What success looks like at 12 months

- 50,000 monthly active users
- Median user saves $15/week on their basket vs a single-store shop
- 70% of product prices refreshed within the last 48 hours
- Zero instances of the app showing a price that's provably stale by more than 7 days
- One feature in the press by a mainstream outlet per quarter (ACCC fake-special detection = endless media appetite)
- A GitHub repo with an open-source price-scraper core (not the full app) — builds credibility and outsources maintenance of the scraping layer to contributors

---

## What to tell Seed (Ideate prompt)

**Project name:** BasketWise

**One-line description:** An Australian grocery price comparison web app that shows real prices across Coles, Woolworths, and Aldi with unit pricing, basket optimisation, and fake-special detection — free forever on core features, no ads in the shopping flow, no affiliate funnels.

**Problem:** Australian families spend $12,480/year on groceries (Canstar 2025). Coles and Woolworths hold 65%+ market share and have been found by the ACCC to run misleading "discount" promotions. Every previous comparison app has either died (SmartCart, PriceHipster), pivoted to selling data back to supermarkets (Frugl), bloated into an insurance affiliate funnel (WiseList), paywalled core comparison (Grocerize $4.99/mo), or lacks the transparency features that matter (TrolleyMate — no price history, no fake-special detection). The ACCC's 2025 inquiry now recommends mandatory pricing APIs from supermarkets — meaning the regulatory environment actively supports this category for the first time.

**Target user:** Dual-shopper Australian household (2–4 people, $180–280/week grocery spend) within driving distance of both a Coles/Woolies and an Aldi. Currently loyal to one store out of inertia. Would split their shop across two stores if the app made it effortless.

**Core user flow:**
1. User searches "milk" → sees prices at Coles, Woolies, Aldi side-by-side with unit price ($/L) and "last updated" timestamp
2. Adds items to basket → running total per store updates live
3. Views basket summary → sees cheapest single-store total AND a "Maximise Savings" split that picks the cheapest option per line item across stores
4. Key number at top: "Your basket at cheapest single store: $X. Split across stores: $Y. You save $Z by splitting."
5. Taps any product → sees 90-day price history chart with specials annotated. If today's "special" price is at or above the 60-day trailing average, a red "Not actually a saving" badge appears
6. When ready to shop → exports per-store lists for in-store use or deep-links to each store's online shop

**Key differentiators vs competitors:**
- Grocerize: We include Aldi. No paywall on comparison. No AI meal planning bloat.
- TrolleyMate: We have price history charts, fake-special detection, data freshness indicators, and a web app. They're native-only with no transparency features.
- WiseList: No insurance/broadband affiliate funnels. No subscription to unlock core features.
- Szumark: Full basket comparison with mix-and-match optimisation, not just specials browsing.
- All of them: Fake-special detection using trailing-average analysis. Architecture built around a PriceProvider abstraction ready for ACCC-mandated APIs.

**Tech stack:** Next.js 14, TypeScript, Tailwind CSS, PostgreSQL with Drizzle ORM. Separate scraping/ingestion worker service decoupled from the user-facing API. Price data abstracted behind a PriceProvider interface.

**Data model:** Canonical Product table with per-store StoreProduct mappings (SKU, name, URL, barcode). PriceRecord: one row per product/store/day with price, unit_price, is_special, special_type. Anonymous baskets in localStorage, server-side on auth. Favourite groups replace flat saved lists.

**Explicitly out of scope:** Meal planning, pantry tracking, bill tracking, to-do lists, insurance/energy/broadband comparison, loyalty points optimisation, social features, fridge notes, automatic cart injection.

**Monetisation:** Free tier = full comparison + 1 shopper. Plus tier ($2.99/mo) = household sharing (up to 6), price drop alerts, CSV export.

---

## Appendix: The graveyard (competitors, what happened)

| App | Launched | Status (Apr 2026) | Failure mode / vulnerability |
|---|---|---|---|
| SmartCart | 2021 | **Dead** | Single-maintainer burnout; Chrome extension arms race; invasive permissions |
| Grocerize | 2019 | **Alive & bank-backed** | Coles + Woolies only (no Aldi), $4.99/mo paywall, AI bloat creep, no price history |
| Frugl | ~2018 | **Zombie** | Pivoted to B2B data sales; consumer app outsourced to Thai firm |
| PriceHipster | ~2018 | **Dead** | Unclear — "currently broken" in 2021 threads |
| WiseList | 2018 | **Alive but bloated** | Insurance/broadband affiliate funnels; ads on paid accounts |
| TrolleyMate | ~2024 | **Alive & polished** | No price history, no fake-special detection, no web app, no ACCC angle |
| Szumark | 2024 | **Alive & growing** | Specials-focused, not basket comparator; pharmacy dilutes grocery depth |
| Bargeroo | 2025/2026 | **Alive & polished** | Solo dev, 37k products, strong UX but no fake-special detection, no unit price, stale data (2mo unwarned), no web app |
| Half Price | 2019 | **Alive, narrow** | Half-price deals only; not a basket comparator |
| Shoplytic | 2024 | **Early-stage** | Solo dev, waitlist, rough recommendation logic |
| GroceryWise | ~2024 | **Chrome extension** | Small user base; extension-only (SmartCart's failure mode) |
| Save On Groceries | ~2023 | **Alive** | Moderate traction, Google Play focused |

**Pattern:** The dead ones died from maintainer burnout and scraping fragility. The alive ones are either bloated (WiseList), narrow (Half Price, Szumark), paywalled (Grocerize), or missing transparency features (TrolleyMate, Bargeroo). Nobody occupies the "honest, fast, basket-optimised, web-first, API-ready" position. That's BasketWise.

---

## Seed update prompt (paste this before building)

Here's a consolidated update to bring Seed current before it starts generating code. Paste this as the next message in your Seed conversation:

---

**Update before we build — refinements from competitive teardowns.**

I've done visual teardowns of Grocerize, TrolleyMate, and Bargeroo (our three closest competitors). Here are the refinements to the spec based on what I've seen working in the wild:

**Shopping list UX (refined from Bargeroo screenshots):**

1. Summary card at the top of the basket: three numbers — "Total: $X | Savings: $Y | Stores: Z". Updates live. This is the first thing the user sees.
2. List grouped by store with store logo, item count, and subtotal per store section header.
3. Each item shows: product image, name, brand, pack size, current price, percentage discount, was-price crossed out, a store pill dropdown, and a "Replace" button.
4. The store pill is a **dropdown** — each item auto-assigns to the cheapest store, but the user can tap the dropdown to manually reassign to a different store. This lets someone say "actually I'm only going to Coles today" without losing the optimisation data.
5. Checkbox on each item for in-store tick-off.
6. Two views stay in sync: Compare (prices, savings, store assignment) and List (tick-off checklist grouped by category for in-store use).

**Product detail UX (refined from Bargeroo screenshots):**

1. Large product image at top.
2. Category tag, pack size, brand clearly shown.
3. "Store Prices" section lists each store vertically with: store logo, price, "Special"/"Multibuy"/"Best Price" badges, percentage discount, was-price.
4. **Green highlight background on the cheapest store row** — instant visual hierarchy.
5. "Last updated" timestamp visible on every product detail view.
6. Below the store prices: price history chart (90-day, with 1mo/3mo/all-time toggles), min/avg/max stats per store, and the "Not actually a saving" badge if the special fails the trailing-average check.

**Price history (refined):**

- Interactive chart with 1 month, 3 month, and all-time views (toggleable).
- Min/avg/max price stats per store displayed below the chart — "Lowest: $3.20 | Average: $4.10 | Highest: $5.50" for each store.
- "Not actually a saving" red badge computed automatically using 60-day trailing average. This is the feature no competitor automates — Bargeroo shows the chart but makes the user do the maths.

**Landing page:**

- Include a savings calculator: interactive slider where user drags their weekly spend ($50–$500), sees projected weekly and annual savings, with fun equivalents ("That's 312 coffees" / "20 nights out"). Validated by Bargeroo's landing page as a conversion driver.

**Data model addition:**

- Add `FavouriteGroup` and `FavouriteGroupItem` tables. Users organise favourites into named groups ("Weekly staples", "BBQ", "Top-ups") instead of flat lists. One-tap add entire group to basket.

**Key competitive positioning to keep in mind while building:**

- Bargeroo is the closest competitor on UX quality. They have 37k products, strong list management, and price history. But they have NO automated fake-special detection, NO unit price display, and their data can be 2+ months stale with no warning. We beat them on honesty.
- TrolleyMate has receipt scanning and household sharing. We don't need those for V1. We beat them on web access and price transparency.
- Grocerize has bank partnerships and media coverage. We beat them on Aldi coverage and no paywall.
- Our unique position is: the only app that automates "is this special actually a saving?" using data, shows unit price at equal visual weight, timestamps every price, and is built API-first for the ACCC mandate.

**Confirmed tech stack:** Next.js 14 / TypeScript / Tailwind / PostgreSQL (Neon) / Drizzle ORM. Scraper on Railway ($5/mo), web app on Vercel. PriceProvider interface abstraction. GitHub Actions CI/CD.

**Start building the search page and basket. Those are the two screens that prove the concept.**
