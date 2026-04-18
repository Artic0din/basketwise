import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { priceRecords, stores } from "../db/schema.js";

/** Maximum age (in ms) before a store's scrape data is considered stale. */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoreHealth {
  name: string;
  slug: string;
  lastScrape: string | null;
  isStale: boolean;
}

interface HealthResult {
  status: "healthy" | "degraded" | "unhealthy";
  checkedAt: string;
  stores: StoreHealth[];
}

/**
 * Query the most recent PriceRecord per store and determine
 * whether each store's scrape data is within the staleness threshold.
 */
async function checkHealth(): Promise<HealthResult> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  const checkedAt = `${y}-${m}-${day}T${hours}:${mins}:${secs}`;

  // Fetch all stores
  const allStores = await db.select().from(stores);

  if (allStores.length === 0) {
    return {
      status: "unhealthy",
      checkedAt,
      stores: [],
    };
  }

  const storeHealthResults: StoreHealth[] = [];

  for (const store of allStores) {
    // Get the most recent scrape timestamp for this store
    const latestRecords = await db
      .select({ scrapedAt: priceRecords.scrapedAt })
      .from(priceRecords)
      .where(eq(priceRecords.storeId, store.id))
      .orderBy(desc(priceRecords.scrapedAt))
      .limit(1);

    const lastRecord = latestRecords[0];
    const lastScrape = lastRecord?.scrapedAt ?? null;

    let isStale = true;
    if (lastScrape) {
      const age = now.getTime() - new Date(lastScrape).getTime();
      isStale = age > STALE_THRESHOLD_MS;
    }

    storeHealthResults.push({
      name: store.name,
      slug: store.slug,
      lastScrape: lastScrape ? lastScrape.toISOString() : null,
      isStale,
    });
  }

  const staleCount = storeHealthResults.filter((s) => s.isStale).length;

  let status: HealthResult["status"];
  if (staleCount === 0) {
    status = "healthy";
  } else if (staleCount < storeHealthResults.length) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return { status, checkedAt, stores: storeHealthResults };
}

async function main(): Promise<void> {
  const result = await checkHealth();

  console.info(JSON.stringify(result, null, 2));

  // Exit 1 if any store is stale
  const hasStale = result.stores.some((s) => s.isStale);
  process.exit(hasStale ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("[Health] Fatal error:", err);
  process.exit(1);
});
