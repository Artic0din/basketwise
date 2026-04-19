import type { PriceProvider, ScrapedPrice, StoreProductRow } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { WoolworthsScraper, type WoolworthsScrapedProduct } from "./scraper.js";
import { mapWoolworthsProduct } from "./mapper.js";

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
 * Normalise a product name for fuzzy matching.
 * Strips store branding, lowercases, removes extra whitespace.
 */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bwoolworths\b/gi, "")
    .replace(/\b(brand|own\s*brand)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well a scraped product name matches a target name.
 * Returns a value between 0 (no match) and 1 (exact match).
 * Uses word overlap — generous threshold since we're matching
 * "Full Cream Milk 2L" against "Woolworths Full Cream Milk 3L".
 */
function matchScore(scraped: string, target: string): number {
  const normScraped = normaliseName(scraped);
  const normTarget = normaliseName(target);

  if (normScraped === normTarget) return 1.0;

  const targetWords = normTarget.split(" ");
  const scrapedWords = new Set(normScraped.split(" "));
  let matchedWords = 0;

  for (const word of targetWords) {
    if (scrapedWords.has(word)) {
      matchedWords++;
    }
  }

  return targetWords.length > 0 ? matchedWords / targetWords.length : 0;
}

/**
 * Find the best matching scraped product for a store product name.
 * Uses a 40% threshold since we're matching across broad category results.
 */
function findBestMatch(
  pool: WoolworthsScrapedProduct[],
  storeName: string,
): WoolworthsScrapedProduct | null {
  const MIN_SCORE = 0.4;
  let bestProduct: WoolworthsScrapedProduct | null = null;
  let bestScore = 0;

  for (const result of pool) {
    const score = matchScore(result.name, storeName);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = result;
    }
  }

  return bestScore >= MIN_SCORE ? bestProduct : null;
}

/**
 * Deduplicate scraped products by normalised name, keeping the first occurrence.
 */
function deduplicateProducts(
  products: WoolworthsScrapedProduct[],
): WoolworthsScrapedProduct[] {
  const seen = new Set<string>();
  const unique: WoolworthsScrapedProduct[] = [];

  for (const product of products) {
    const key = normaliseName(product.name);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  return unique;
}

export class WoolworthsProvider implements PriceProvider {
  readonly storeName = "Woolworths";
  readonly storeSlug = "woolworths";
  private readonly scraper: WoolworthsScraper;

  constructor(rateLimiter: RateLimiter) {
    this.scraper = new WoolworthsScraper(rateLimiter);
  }

  async fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<(ScrapedPrice | null)[]> {
    // Phase 1: Bulk category searches to build a product pool
    console.info(
      `[WoolworthsProvider] Phase 1: Running ${CATEGORY_SEARCH_TERMS.length} category searches (pageSize=48)...`,
    );

    const allResults: WoolworthsScrapedProduct[] = [];

    for (let i = 0; i < CATEGORY_SEARCH_TERMS.length; i++) {
      const term = CATEGORY_SEARCH_TERMS[i]!;

      try {
        const results = await this.scraper.searchProducts(term);
        allResults.push(...results);

        console.info(
          `[WoolworthsProvider] Search ${i + 1}/${CATEGORY_SEARCH_TERMS.length}: "${term}" -> ${results.length} products (pool: ${allResults.length})`,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[WoolworthsProvider] Error searching "${term}": ${message}`,
        );
      }
    }

    // Deduplicate the pool
    const pool = deduplicateProducts(allResults);
    console.info(
      `[WoolworthsProvider] Phase 1 complete: ${pool.length} unique products in pool (${allResults.length} total before dedup)`,
    );

    // Phase 2: Fuzzy-match each store product against the pool
    console.info(
      `[WoolworthsProvider] Phase 2: Matching ${storeProducts.length} store products against pool...`,
    );

    const results: (ScrapedPrice | null)[] = [];
    let matched = 0;
    let skipped = 0;

    for (const sp of storeProducts) {
      if (!sp.storeName) {
        skipped++;
        results.push(null);
        continue;
      }

      const bestMatch = findBestMatch(pool, sp.storeName);

      if (!bestMatch) {
        console.warn(
          `[WoolworthsProvider] No match for: ${sp.storeName}`,
        );
        skipped++;
        results.push(null);
        continue;
      }

      const mapped = mapWoolworthsProduct(bestMatch, sp);
      if (mapped) {
        matched++;
        console.info(
          `[WoolworthsProvider] Matched: "${sp.storeName}" -> "${bestMatch.name}" ($${bestMatch.price?.toFixed(2) ?? "?"})`,
        );
      }
      results.push(mapped);
    }

    console.info(
      `[WoolworthsProvider] Phase 2 complete: ${matched}/${storeProducts.length} matched, ${skipped} skipped`,
    );

    return results;
  }
}
