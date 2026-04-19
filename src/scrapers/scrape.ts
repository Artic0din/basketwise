import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { priceRecords, products, storeProducts, stores } from "../db/schema.js";
import type { DiscoveredProduct, PriceProvider, ScrapedPrice, ScrapeResult } from "./types.js";
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
 * Auto-create products from discovered (unmatched) scrape results.
 * For each discovered product:
 *   1. Check if a product with that exact name already exists
 *   2. If not, create a Product record
 *   3. Create a StoreProduct linking it to the store
 *   4. Create a PriceRecord with the scraped price
 *
 * Returns the number of products successfully created.
 */
async function autoCreateProducts(
  discovered: DiscoveredProduct[],
  storeId: number,
  database: typeof db,
  dateStr: string,
  now: Date,
): Promise<number> {
  if (discovered.length === 0) return 0;

  let created = 0;

  for (let i = 0; i < discovered.length; i += BATCH_SIZE) {
    const batch = discovered.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      try {
        // Deduplicate: check if a product with this exact name already exists
        const existing = await database
          .select({ id: products.id })
          .from(products)
          .where(eq(products.name, item.name))
          .limit(1);

        let productId: number;

        if (existing.length > 0 && existing[0] != null) {
          productId = existing[0].id;
        } else {
          // Create a new Product record
          const inserted = await database
            .insert(products)
            .values({
              name: item.name,
              category: item.category,
              brand: item.brand,
              createdAt: now,
              updatedAt: now,
            })
            .returning({ id: products.id });

          const row = inserted[0];
          if (!row) {
            console.error(`[Scraper] Failed to insert product: ${item.name}`);
            continue;
          }
          productId = row.id;
        }

        // Create StoreProduct linking this product to the store
        await database
          .insert(storeProducts)
          .values({
            productId,
            storeId,
            storeName: item.name,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();

        // Create PriceRecord with the scraped price
        await database
          .insert(priceRecords)
          .values({
            productId,
            storeId,
            price: item.price,
            unitPrice: item.unitPrice,
            unitMeasure: item.unitMeasure,
            isSpecial: item.isSpecial,
            specialType: item.specialType,
            scrapedAt: now,
            date: dateStr,
          })
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

        created++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Scraper] Auto-create failed for "${item.name}": ${message}`);
      }
    }
  }

  return created;
}

/**
 * Run a full scrape for a given provider:
 * 1. Query StoreProducts belonging to the provider's store
 * 2. Fetch prices via the provider
 * 3. Batch upsert matched prices into price_records
 * 4. Auto-create products from unmatched discovered items
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
    return { total: 0, success: 0, skipped: 0, failed: 0, discovered: 0, durationMs: 0 };
  }

  // 2. Fetch all StoreProducts for this store
  const storeProductRows = await database
    .select()
    .from(storeProducts)
    .where(eq(storeProducts.storeId, store.id));

  const total = storeProductRows.length;
  if (total === 0) {
    console.warn(`[Scraper] No store products found for ${provider.storeName} — will still discover new products`);
  }

  console.info(
    `[Scraper] Starting ${provider.storeName} scrape: ${total} existing products`,
  );

  // 3. Fetch prices from the provider (returns matched + discovered)
  const fetchResult = await provider.fetchPrices(storeProductRows);

  // 4. Filter out nulls and collect valid matched prices
  const validPrices: ScrapedPrice[] = [];
  let skipped = 0;

  for (const result of fetchResult.matched) {
    if (result === null) {
      skipped++;
    } else {
      validPrices.push(result);
    }
  }

  // 5. Batch upsert matched prices into price_records
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

  // 6. Auto-create products from discovered (unmatched) items
  const discoveredCount = await autoCreateProducts(
    fetchResult.discovered,
    store.id,
    database,
    dateStr,
    now,
  );

  if (discoveredCount > 0) {
    console.info(
      `[Scraper] Discovered ${discoveredCount} new products from ${provider.storeName}`,
    );
  }

  const success = validPrices.length - failed;
  const durationMs = Date.now() - start;

  return { total, success, skipped, failed, discovered: discoveredCount, durationMs };
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
        `[${provider.storeName}] Scrape complete: ${result.success}/${result.total} matched, ` +
          `${result.skipped} skipped, ${result.failed} failed, ` +
          `${result.discovered} discovered ` +
          `in ${(result.durationMs / 1000).toFixed(1)}s`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[${provider.storeName}] Fatal provider error: ${message}`,
      );
    }
  }

  // Report total DB counts
  try {
    const productCount = await database
      .select({ count: sql<number>`count(*)` })
      .from(products);
    const priceCount = await database
      .select({ count: sql<number>`count(*)` })
      .from(priceRecords);
    const storeProductCount = await database
      .select({ count: sql<number>`count(*)` })
      .from(storeProducts);

    console.info(
      `[Scraper] DB totals: ${String(productCount[0]?.count ?? 0)} products, ` +
        `${String(storeProductCount[0]?.count ?? 0)} store products, ` +
        `${String(priceCount[0]?.count ?? 0)} price records`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Scraper] Failed to query DB counts: ${message}`);
  }
}

/** CLI entry point -- run scrapers based on --store argument. */
async function main(): Promise<void> {
  const storeName = parseStoreArg();
  console.info(`[Scraper] BasketWise price scraper starting (store: ${storeName})...`);

  // Rate limiter: 5 seconds between requests — very polite to avoid bot detection
  const rateLimiter = new RateLimiter(5000);

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
