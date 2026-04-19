import type {
  PriceProvider,
  ScrapedPrice,
  StoreProductRow,
  FetchPricesResult,
  DiscoveredProduct,
} from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { ColesScraper, type ColesScrapedProduct } from "./scraper.js";
import { mapColesProduct } from "./mapper.js";
import {
  normaliseForMatching,
  isQualifyingMatch,
  categoryFromSearchTerm,
} from "../matching.js";

/**
 * Broad category search terms that cover all 10 product categories.
 * ~25 searches with pageSize=48 returns ~1,000+ products to match against,
 * instead of 100 individual per-product searches that trigger bot detection.
 */
const CATEGORY_SEARCH_TERMS: readonly string[] = [
  // Dairy (4)
  "milk", "cheese", "yoghurt", "butter",
  // Bread & Bakery (1)
  "bread",
  // Meat (4)
  "chicken", "beef", "sausages", "bacon",
  // Fruit & Veg (3)
  "banana", "potato", "tomato",
  // Pantry (3)
  "pasta", "rice", "cereal",
  // Drinks (3)
  "juice", "water", "coffee",
  // Snacks (2)
  "chips", "chocolate",
  // Frozen (2)
  "frozen", "ice cream",
  // Cleaning (2)
  "detergent", "dishwashing",
  // Baby & Personal (2)
  "nappies", "shampoo",
] as const;

/**
 * Find the best matching scraped product for a store product name.
 * Uses improved core-word matching with 30% threshold or 2+ matching words.
 */
function findBestMatch(
  pool: ColesScrapedProduct[],
  storeName: string,
): ColesScrapedProduct | null {
  let bestProduct: ColesScrapedProduct | null = null;
  let bestScore = 0;

  for (const result of pool) {
    const { qualifies, score } = isQualifyingMatch(result.name, storeName);
    if (qualifies && score > bestScore) {
      bestScore = score;
      bestProduct = result;
    }
  }

  return bestProduct;
}

/**
 * Deduplicate scraped products by normalised name, keeping the first occurrence.
 */
function deduplicateProducts(
  products: ColesScrapedProduct[],
): ColesScrapedProduct[] {
  const seen = new Set<string>();
  const unique: ColesScrapedProduct[] = [];

  for (const product of products) {
    const key = normaliseForMatching(product.name);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  return unique;
}

export class ColesProvider implements PriceProvider {
  readonly storeName = "Coles";
  readonly storeSlug = "coles";
  private readonly scraper: ColesScraper;

  constructor(rateLimiter: RateLimiter) {
    this.scraper = new ColesScraper(rateLimiter);
  }

  async fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<FetchPricesResult> {
    // Phase 1: Bulk category searches to build a product pool
    console.info(
      `[ColesProvider] Phase 1: Running ${CATEGORY_SEARCH_TERMS.length} category searches (pageSize=48)...`,
    );

    const allResults: ColesScrapedProduct[] = [];
    /** Track which search term found each product for category derivation. */
    const productSearchTerms = new Map<string, string>();

    for (let i = 0; i < CATEGORY_SEARCH_TERMS.length; i++) {
      const term = CATEGORY_SEARCH_TERMS[i]!;

      try {
        const results = await this.scraper.searchProducts(term);

        for (const result of results) {
          const normKey = normaliseForMatching(result.name);
          if (!productSearchTerms.has(normKey)) {
            productSearchTerms.set(normKey, term);
          }
        }

        allResults.push(...results);

        console.info(
          `[ColesProvider] Search ${i + 1}/${CATEGORY_SEARCH_TERMS.length}: "${term}" -> ${results.length} products (pool: ${allResults.length})`,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[ColesProvider] Error searching "${term}": ${message}`,
        );
      }
    }

    // Deduplicate the pool
    const pool = deduplicateProducts(allResults);
    console.info(
      `[ColesProvider] Phase 1 complete: ${pool.length} unique products in pool (${allResults.length} total before dedup)`,
    );

    // Phase 2: Fuzzy-match each store product against the pool
    console.info(
      `[ColesProvider] Phase 2: Matching ${storeProducts.length} store products against pool...`,
    );

    const results: (ScrapedPrice | null)[] = [];
    let matched = 0;
    let skipped = 0;
    const matchedPoolNames = new Set<string>();

    for (const sp of storeProducts) {
      if (!sp.storeName) {
        skipped++;
        results.push(null);
        continue;
      }

      const bestMatch = findBestMatch(pool, sp.storeName);

      if (!bestMatch) {
        console.warn(
          `[ColesProvider] No match for: ${sp.storeName}`,
        );
        skipped++;
        results.push(null);
        continue;
      }

      const mapped = mapColesProduct(bestMatch, sp);
      if (mapped) {
        matched++;
        matchedPoolNames.add(normaliseForMatching(bestMatch.name));
        console.info(
          `[ColesProvider] Matched: "${sp.storeName}" -> "${bestMatch.name}" ($${bestMatch.price?.toFixed(2) ?? "?"})`,
        );
      }
      results.push(mapped);
    }

    console.info(
      `[ColesProvider] Phase 2 complete: ${matched}/${storeProducts.length} matched, ${skipped} skipped`,
    );

    // Phase 3: Collect unmatched products for auto-creation
    const discovered: DiscoveredProduct[] = [];

    for (const product of pool) {
      if (product.price == null || !isFinite(product.price)) continue;

      const normName = normaliseForMatching(product.name);
      if (matchedPoolNames.has(normName)) continue;

      const searchTerm = productSearchTerms.get(normName) ?? "other";
      const category = categoryFromSearchTerm(searchTerm);

      discovered.push({
        name: product.name,
        category,
        brand: null,
        price: product.price.toFixed(2),
        unitPrice: product.unitPrice != null ? product.unitPrice.toFixed(4) : null,
        unitMeasure: product.unitOfMeasure ?? null,
        isSpecial: product.isSpecial,
        specialType: product.specialType,
      });
    }

    console.info(
      `[ColesProvider] Phase 3: ${discovered.length} unmatched products available for auto-creation`,
    );

    return { matched: results, discovered };
  }
}
