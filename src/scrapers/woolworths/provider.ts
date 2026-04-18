import type { PriceProvider, ScrapedPrice, StoreProductRow } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { WoolworthsFetcher } from "./api.js";
import { mapWoolworthsProduct } from "./mapper.js";

const PROGRESS_INTERVAL = 50;

export class WoolworthsProvider implements PriceProvider {
  readonly storeName = "Woolworths";
  readonly storeSlug = "woolworths";
  private readonly fetcher: WoolworthsFetcher;

  constructor(rateLimiter: RateLimiter) {
    this.fetcher = new WoolworthsFetcher(rateLimiter);
  }

  async fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<(ScrapedPrice | null)[]> {
    const results: (ScrapedPrice | null)[] = [];
    let skipped = 0;

    for (let i = 0; i < storeProducts.length; i++) {
      const sp = storeProducts[i]!;

      try {
        if (!sp.storeSku) {
          skipped++;
          results.push(null);
          continue;
        }

        const raw = await this.fetcher.fetchProduct(sp.storeSku);

        if (!raw) {
          skipped++;
          results.push(null);
          continue;
        }

        results.push(mapWoolworthsProduct(raw, sp));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[WoolworthsProvider] Error fetching product ${sp.id}: ${message}`,
        );
        results.push(null);
      }

      // Progress logging
      const count = i + 1;
      if (count % PROGRESS_INTERVAL === 0 || count === storeProducts.length) {
        console.info(
          `Woolworths: ${count}/${storeProducts.length} fetched (${skipped} skipped)`,
        );
      }
    }

    return results;
  }
}
