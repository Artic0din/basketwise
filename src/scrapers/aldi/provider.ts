import type { PriceProvider, ScrapedPrice, StoreProductRow, FetchPricesResult } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { AldiScraper } from "./scraper.js";
import { mapAldiProduct } from "./mapper.js";

const PROGRESS_INTERVAL = 50;

export class AldiProvider implements PriceProvider {
  readonly storeName = "Aldi";
  readonly storeSlug = "aldi";
  private readonly scraper: AldiScraper;

  constructor(rateLimiter: RateLimiter) {
    this.scraper = new AldiScraper(rateLimiter);
  }

  async fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<FetchPricesResult> {
    const results: (ScrapedPrice | null)[] = [];
    let skipped = 0;

    for (let i = 0; i < storeProducts.length; i++) {
      const sp = storeProducts[i]!;

      try {
        // Aldi doesn't use traditional SKUs — we use the store URL path
        // to fetch individual product pages for price data.
        if (!sp.storeUrl) {
          skipped++;
          results.push(null);
          continue;
        }

        const raw = await this.scraper.fetchProductPage(sp.storeUrl);

        if (!raw) {
          skipped++;
          results.push(null);
          continue;
        }

        results.push(mapAldiProduct(raw, sp));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[AldiProvider] Error fetching product ${sp.id.toString()}: ${message}`,
        );
        results.push(null);
      }

      // Progress logging
      const count = i + 1;
      if (count % PROGRESS_INTERVAL === 0 || count === storeProducts.length) {
        console.info(
          `Aldi: ${count.toString()}/${storeProducts.length.toString()} fetched (${skipped.toString()} skipped)`,
        );
      }
    }

    // Aldi uses individual product page fetching, no pool-based discovery
    return { matched: results, discovered: [], matchedImages: new Map() };
  }
}
