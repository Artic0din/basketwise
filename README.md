# BasketWise

Australian grocery price comparison. See [BRIEF.md](./BRIEF.md) for the full product spec.

> Australian grocery price comparison app with basket optimisation, unit pricing, and automated fake-special detection across Coles, Woolworths, and Aldi.

**Type:** Application
**Skill Loadout:** PAUL (required), AEGIS (post-build audit), ui-ux-pro-max (frontend phases), tdd-workflow, frontend-design
**Quality Gates:** 80% test coverage, security scan (no HIGH/CRITICAL), WCAG AA accessibility, Core Web Vitals (LCP < 2s, CLS < 0.1)

---

## Overview

Australian families spend $12,480/year on groceries (Canstar 2025). Coles and Woolworths hold 65%+ market share and have been found by the ACCC to run misleading "discount" promotions. The ACCC's 2025 inquiry now recommends mandatory pricing APIs from supermarkets.

Every previous comparison app has either died (SmartCart, PriceHipster), pivoted to selling data (Frugl), bloated into affiliate funnels (WiseList), or paywalled core comparison (Grocerize at $4.99/mo). BasketWise occupies the "honest, fast, basket-optimised, API-ready" position that nobody else holds.

**Target user:** Dual-shopper Australian household (2-4 people, $180-280/week spend) within driving distance of both a Coles/Woolies and an Aldi. Would split their shop across two stores if the app made it effortless.

**Monetisation:** $2.99/month premium for unlimited saved lists, price alerts, household sharing, CSV export. Core search, basket, price history, and specials are always free. No ads in shopping flow. No affiliate funnels.

**Unique differentiators:**
- Automated fake-special detection using 60-day trailing average (no competitor automates this)
- Unit price at equal visual weight to ticket price
- Aldi included (Grocerize is Coles/Woolies only)
- Mix-and-match basket optimisation with per-item store override
- PriceProvider interface ready for ACCC-mandated APIs
- Every price timestamped — no stale data without warning

**Domains:** basketwise.com.au, basketwise.app (available as of 2026-04-18)

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14 + React + TypeScript | SSR for SEO on product pages, API routes for backend |
| Styling | Tailwind CSS + shadcn/ui | Fast path to polished MVP, command palette for search |
| Database | PostgreSQL (Neon) | Serverless, branching, connection pooling, full-text search |
| ORM | Drizzle ORM | Type-safe, lightweight, excellent PostgreSQL support |
| Web Hosting | Vercel | Zero-config Next.js deploys, edge caching |
| Scraper Hosting | Railway ($5/mo) | Reliable container hosting with cron |
| CI/CD | GitHub Actions | Lint, type-check, test, deploy (separate workflows for web + scraper) |

---

## Data Model

### Core Entities

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| Product | id, name, category, brand, pack_size, unit_of_measure | has many StoreProduct, PriceRecord |
| Store | id, name, slug, logo_url, website_url | has many StoreProduct, PriceRecord |
| StoreProduct | id, product_id, store_id, store_sku, store_name, store_url, barcode | belongs to Product, Store |
| PriceRecord | id, product_id, store_id, price, unit_price, unit_measure, is_special, special_type, scraped_at, date | belongs to Product, Store |
| User | id, email, is_premium, premium_expires_at | has many Basket, PriceAlert, FavouriteGroup |
| Basket | id, user_id, name | has many BasketItem |
| BasketItem | id, basket_id, product_id, quantity, assigned_store_id | belongs to Basket, Product |
| PriceAlert | id, user_id, product_id, store_id, target_price, is_active | belongs to User, Product |
| FavouriteGroup | id, user_id, name, sort_order | has many FavouriteGroupItem |
| FavouriteGroupItem | id, group_id, product_id | belongs to FavouriteGroup, Product |

### Key Constraints
- PriceRecord: composite unique on (product_id, store_id, date) — upsert per scrape
- `special_type` enum: half_price, multi_buy, prices_dropped, down_down, rollback
- `unit_measure` enum: per_kg, per_L, per_100g, per_100mL, per_unit
- StoreProduct.barcode ready for GS1/GTIN when ACCC API mandate lands
- V1: ~2,000-3,000 hand-matched canonical products. Unmatched show "price not available"
- Product matching at scrape time (ingestion pipeline), not query time

---

## API Surface

### Auth
Magic link email — no passwords. Anonymous users get full comparison via client-side cached data. Auth only for premium features.

### Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| /api/search | GET | none | Product search with prices, includes is_fake_special |
| /api/products/:id | GET | none | Product detail with store prices |
| /api/products/:id/history | GET | none | 90-day price history |
| /api/categories | GET | none | Category tree |
| /api/specials | GET | none | Current specials feed |
| /api/basket | POST, PATCH, DELETE | required | Basket CRUD |
| /api/basket/:id/optimise | GET | required | Single-store + mix-and-match totals |
| /api/auth/magic-link | POST | none | Send magic link |
| /api/auth/verify | GET | none | Verify token |
| /api/alerts | GET, POST, DELETE | required | Price alert management |
| /api/favourites | CRUD | required | Favourite group management |
| /api/health | GET | none | Scraper health (last_successful_scrape per store) |

### Caching
Edge-cache search results at Vercel with 1-hour TTL. Rate limit by IP (anon) and user token (auth).

---

## Deployment

- **Web app:** Vercel — auto-deploys from main, preview deploys on PRs
- **Database:** Neon PostgreSQL — main branch = production, dev branches for staging
- **Scraper:** Railway container — cron every 12h (Coles/Woolies), weekly (Aldi)
- **CI/CD:** GitHub Actions — lint (ESLint), type-check (tsc), test (Vitest), deploy

---

## UI/UX

### Design System
Tailwind + shadcn/ui. Neutral base (slate/zinc). Store colours for identification only (Coles red, Woolies green, Aldi blue). Fake-special badge: rose-600 (distinct from Coles red). Best Price: emerald-500 with green row tint. BasketWise accent (mustard/teal TBD) for branding only.

### Key Views

| View | Purpose |
|------|---------|
| Search / Browse | Landing. Search bar, category sidebar, product cards with 3-store columns, unit price, special badges, timestamps |
| Product Detail | Store prices (green highlight cheapest), 90-day chart (1mo/3mo/all toggles), min/avg/max stats, fake-special badge |
| Basket Summary | Summary card (Total/Savings/Stores), store-grouped items, store pill dropdown per item, Compare + List views |
| Shopping List | In-store companion. Category-grouped, checkbox, large touch targets, mobile-first critical path |
| Specials Feed | Half-price and 30%+ deals, filterable by store/category |
| Landing Page | Savings calculator slider ($50-500/week), projected savings, fun equivalents |

### Responsive
Mobile-first mandatory. PWA with offline shopping lists in Phase 6.

---

## Security

- **Scraping:** Respectful rate limiting, cache aggressively, no copyrighted images, PriceProvider abstraction for API swap
- **Auth:** Magic link, no passwords. Email only PII — encrypt at rest
- **Input:** Parameterised queries (Drizzle). Sanitise search for XSS
- **Rate limiting:** Edge cache + IP/token rate limits
- **Privacy:** Australian Privacy Act compliance from day one. Privacy policy at launch
- **Monitoring:** last_successful_scrape per store, health endpoint, alert if >24h stale

---

## Implementation Phases

### Phase 1: Scraper Pipeline + Schema
Neon schema, Railway scraper (Coles/Woolies, then Aldi), PriceProvider interface, daily upserts, health monitoring. Seed ~500 hand-matched products. **Scraper-first: accumulate history from day one for Phase 4.**

### Phase 2: Search + Product Detail
Next.js scaffold on Vercel, shadcn/ui design system, full-text search (pg_trgm/tsvector), product card grid with 3-store prices, unit pricing, special badges, product detail with green cheapest-row highlight.

### Phase 3: Basket + Specials
localStorage basket (anonymous), summary card (Total/Savings/Stores), store-grouped items, store pill dropdown, Compare + List views, specials feed tab.

### Phase 4: Price History + Fake Special Detection
90-day Recharts chart (1mo/3mo/all toggles), min/avg/max stats, 60-day trailing average, is_fake_special computed field, "Not actually a saving" badge. **Requires 60+ days of Phase 1 scraper history.**

### Phase 5: Auth + Premium + Favourite Groups
Magic link auth, server-side basket sync, favourite groups, price alerts (email), household sharing (premium, up to 6), savings tracker, Stripe ($2.99/mo).

### Phase 6: Polish + Launch
PWA + offline lists, landing page with savings calculator, SEO + structured data, privacy policy/terms, OG social cards, Core Web Vitals audit, media outreach (ACCC angle).

**Timeline:** Phases 1-3 = core product. Phase 4 = differentiator. Phase 4 can't ship until 60 days after Phase 1 scraper starts. Phases 1-4 = launchable product.

---

## Design Decisions

1. **Canonical product table with per-store SKU mappings** — reliability over fuzzy matching. "Price not available" > bad match.
2. **Scraper-first phase ordering** — accumulate price history from day one for Phase 4's fake-special detection.
3. **One PriceRecord per product per store per day** — sufficient for consumer charts. PriceAuditLog for intra-day if ACCC needs it.
4. **localStorage baskets for anonymous users** — no server overhead, migrate on auth.
5. **Railway for scraper over NAS** — public product needs infrastructure independence.
6. **Generic category icons** — avoid copyright issues. Open Food Facts CC images for V2.
7. **Magic link auth** — no password storage, simpler, better security.
8. **is_fake_special as computed field on search** — avoids extra round trip.
9. **Neutral palette with store-only brand colours** — fake-special badge (rose-600) distinct from Coles red.
10. **PriceProvider interface abstraction** — architecture-level bet on ACCC regulatory direction.

---

## Open Questions

1. Full-text search: pg_trgm vs tsvector — need testing with real product names
2. Aldi scraping feasibility: staples vs Special Buys rotation
3. Product matching scale strategy: 500 → 5,000+ (semi-automated heuristics?)
4. BasketWise accent colour: warm mustard or teal
5. Household sharing sync: WebSockets vs SSE vs polling
6. Primary domain: basketwise.com.au vs basketwise.app

---

## Competitive Landscape

| Competitor | Status | Our Advantage |
|-----------|--------|---------------|
| Grocerize | Alive, $4.99/mo | We include Aldi, no paywall |
| WiseList | Alive, bloated | No affiliate funnels |
| Bargeroo | Alive, closest | Automated fake-special detection, unit pricing, freshness timestamps |
| TrolleyMate | Alive | Web access, price transparency |
| Szumark | Alive | Full basket comparison, not just specials |
| SmartCart | Dead | Sustainable architecture (not browser extension) |
| Frugl | Zombie | Consumer-first (not B2B data play) |

---

## References

- ACCC 2025 Supermarket Inquiry: mandatory pricing API recommendation
- Canstar 2025: $12,480/year household grocery spend
- Grocerize, Bargeroo, TrolleyMate visual teardowns (April 2026)
- Domains: basketwise.com.au, basketwise.app

---

*Graduated from SEED ideation: 2026-04-18*
