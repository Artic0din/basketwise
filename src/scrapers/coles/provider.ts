import type { Browser } from "playwright";
import type { PriceProvider, ScrapedPrice, StoreProductRow } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { ColesScraper, type ColesScrapedProduct } from "./scraper.js";
import { mapColesProduct } from "./mapper.js";

const PROGRESS_INTERVAL = 10;

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
 */
function matchScore(scraped: string, target: string): number {
  const normScraped = normaliseName(scraped);
  const normTarget = normaliseName(target);

  if (normScraped === normTarget) return 1.0;

  // Check if all target words appear in the scraped name
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
 * Returns null if no match exceeds the minimum threshold.
 */
function findBestMatch(
  results: ColesScrapedProduct[],
  storeName: string,
): ColesScrapedProduct | null {
  const MIN_SCORE = 0.5;
  let bestProduct: ColesScrapedProduct | null = null;
  let bestScore = 0;

  for (const result of results) {
    const score = matchScore(result.name, storeName);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = result;
    }
  }

  return bestScore >= MIN_SCORE ? bestProduct : null;
}

export class ColesProvider implements PriceProvider {
  readonly storeName = "Coles";
  readonly storeSlug = "coles";
  private readonly scraper: ColesScraper;

  constructor(browser: Browser, rateLimiter: RateLimiter) {
    this.scraper = new ColesScraper(browser, rateLimiter);
  }

  async fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<(ScrapedPrice | null)[]> {
    const results: (ScrapedPrice | null)[] = [];
    let skipped = 0;

    for (let i = 0; i < storeProducts.length; i++) {
      const sp = storeProducts[i]!;

      try {
        if (!sp.storeName) {
          skipped++;
          results.push(null);
          continue;
        }

        const searchResults = await this.scraper.searchProducts(sp.storeName);

        if (searchResults.length === 0) {
          console.warn(
            `[ColesProvider] No results for: ${sp.storeName}`,
          );
          skipped++;
          results.push(null);
          continue;
        }

        const bestMatch = findBestMatch(searchResults, sp.storeName);

        if (!bestMatch) {
          console.warn(
            `[ColesProvider] No matching product for: ${sp.storeName}`,
          );
          skipped++;
          results.push(null);
          continue;
        }

        results.push(mapColesProduct(bestMatch, sp));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[ColesProvider] Error fetching product ${sp.id}: ${message}`,
        );
        results.push(null);
      }

      // Progress logging
      const count = i + 1;
      if (count % PROGRESS_INTERVAL === 0 || count === storeProducts.length) {
        console.info(
          `Coles: ${count}/${storeProducts.length} scraped (${skipped} skipped)`,
        );
      }
    }

    return results;
  }
}
