import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { priceRecords, storeProducts, stores } from "../db/schema.js";
import type { PriceProvider, ScrapedPrice, ScrapeResult } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { ColesProvider } from "./coles/provider.js";
import { WoolworthsProvider } from "./woolworths/provider.js";
import { AldiProvider } from "./aldi/provider.js";

const BATCH_SIZE = 50;

type StoreName = "coles" | "woolworths" | "aldi" | "all";

/**
 * Parse --store CLI argument. Defaults to "all" if not provided.
 */
function parseStoreArg(): StoreName {
  const idx = process.argv.indexOf("--store");
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return "all";
  }

  const value = process.argv[idx + 1];
  if (value === "coles" || value === "woolworths" || value === "aldi" || value === "all") {
    return value;
  }

  console.error(
    `[Scraper] Invalid --store value: ${value ?? "undefined"}. Must be coles, woolworths, aldi, or all.`,
  );
  process.exit(1);
}

/**
 * Run a full scrape for a given provider:
 * 1. Query StoreProducts belonging to the provider's store
 * 2. Fetch prices via the provider
 * 3. Batch upsert into price_records
 */
export async function runScrape(
  provider: PriceProvider,
  database: typeof db,
): Promise<ScrapeResult> {
  const start = Date.now();

  // 1. Find the store row matching this provider
  const storeRows = await database
    .select()
    .from(stores)
    .where(eq(stores.slug, provider.storeSlug));

  const store = storeRows[0];
  if (!store) {
    console.error(`[Scraper] No store found with slug: ${provider.storeSlug}`);
    return { total: 0, success: 0, skipped: 0, failed: 0, durationMs: 0 };
  }

  // 2. Fetch all StoreProducts for this store
  const storeProductRows = await database
    .select()
    .from(storeProducts)
    .where(eq(storeProducts.storeId, store.id));

  const total = storeProductRows.length;
  if (total === 0) {
    console.warn(`[Scraper] No store products found for ${provider.storeName}`);
    return { total: 0, success: 0, skipped: 0, failed: 0, durationMs: 0 };
  }

  console.info(
    `[Scraper] Starting ${provider.storeName} scrape: ${total} products`,
  );

  // 3. Fetch prices from the provider
  const results = await provider.fetchPrices(storeProductRows);

  // 4. Filter out nulls and collect valid prices
  const validPrices: ScrapedPrice[] = [];
  let skipped = 0;

  for (const result of results) {
    if (result === null) {
      skipped++;
    } else {
      validPrices.push(result);
    }
  }

  // 5. Batch upsert into price_records
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${day}`;

  let failed = 0;

  for (let i = 0; i < validPrices.length; i += BATCH_SIZE) {
    const batch = validPrices.slice(i, i + BATCH_SIZE);

    try {
      await database
        .insert(priceRecords)
        .values(
          batch.map((p) => ({
            productId: p.productId,
            storeId: p.storeId,
            price: p.price,
            unitPrice: p.unitPrice,
            unitMeasure: p.unitMeasure,
            isSpecial: p.isSpecial,
            specialType: p.specialType,
            scrapedAt: now,
            date: dateStr,
          })),
        )
        .onConflictDoUpdate({
          target: [priceRecords.productId, priceRecords.storeId, priceRecords.date],
          set: {
            price: sql`excluded.price`,
            unitPrice: sql`excluded.unit_price`,
            unitMeasure: sql`excluded.unit_measure`,
            isSpecial: sql`excluded.is_special`,
            specialType: sql`excluded.special_type`,
            scrapedAt: sql`excluded.scraped_at`,
          },
        });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Scraper] Batch upsert failed: ${message}`);
      failed += batch.length;
    }
  }

  const success = validPrices.length - failed;
  const durationMs = Date.now() - start;

  return { total, success, skipped, failed, durationMs };
}

/**
 * Run all requested providers sequentially with per-provider error isolation.
 */
async function runAllScrapers(
  providers: PriceProvider[],
  database: typeof db,
): Promise<void> {
  for (const provider of providers) {
    try {
      const result = await runScrape(provider, database);
      console.info(
        `[${provider.storeName}] Scrape complete: ${result.success}/${result.total} success, ` +
          `${result.skipped} skipped, ${result.failed} failed ` +
          `in ${(result.durationMs / 1000).toFixed(1)}s`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[${provider.storeName}] Fatal provider error: ${message}`,
      );
    }
  }
}

/** CLI entry point -- run scrapers based on --store argument. */
async function main(): Promise<void> {
  const storeName = parseStoreArg();
  console.info(`[Scraper] BasketWise price scraper starting (store: ${storeName})...`);

  // Rate limiter: 2.5 seconds between requests for polite scraping
  const rateLimiter = new RateLimiter(4000);

  const providers: PriceProvider[] = [];

  if (storeName === "coles" || storeName === "all") {
    providers.push(new ColesProvider(rateLimiter));
  }

  if (storeName === "woolworths" || storeName === "all") {
    providers.push(new WoolworthsProvider(rateLimiter));
  }

  if (storeName === "aldi" || storeName === "all") {
    providers.push(new AldiProvider(rateLimiter));
  }

  await runAllScrapers(providers, db);

  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("[Scraper] Fatal error:", err);
  process.exit(1);
});
