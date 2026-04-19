import type { PriceProvider, ScrapedPrice, StoreProductRow } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { ColesScraper, type ColesScrapedProduct } from "./scraper.js";
import { mapColesProduct } from "./mapper.js";

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
    .replace(/\bcoles\b/gi, "")
    .replace(/\b(brand|own\s*brand)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well a scraped product name matches a target name.
 * Returns a value between 0 (no match) and 1 (exact match).
 * Uses word overlap — generous threshold since we're matching
 * "Full Cream Milk 2L" against "Coles Full Cream Milk 3L".
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
  pool: ColesScrapedProduct[],
  storeName: string,
): ColesScrapedProduct | null {
  const MIN_SCORE = 0.4;
  let bestProduct: ColesScrapedProduct | null = null;
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
  products: ColesScrapedProduct[],
): ColesScrapedProduct[] {
  const seen = new Set<string>();
  const unique: ColesScrapedProduct[] = [];

  for (const product of products) {
    const key = normaliseName(product.name);
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
  ): Promise<(ScrapedPrice | null)[]> {
    // Phase 1: Bulk category searches to build a product pool
    console.info(
      `[ColesProvider] Phase 1: Running ${CATEGORY_SEARCH_TERMS.length} category searches (pageSize=48)...`,
    );

    const allResults: ColesScrapedProduct[] = [];

    for (let i = 0; i < CATEGORY_SEARCH_TERMS.length; i++) {
      const term = CATEGORY_SEARCH_TERMS[i]!;

      try {
        const results = await this.scraper.searchProducts(term);
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
        console.info(
          `[ColesProvider] Matched: "${sp.storeName}" -> "${bestMatch.name}" ($${bestMatch.price?.toFixed(2) ?? "?"})`,
        );
      }
      results.push(mapped);
    }

    console.info(
      `[ColesProvider] Phase 2 complete: ${matched}/${storeProducts.length} matched, ${skipped} skipped`,
    );

    return results;
  }
}
