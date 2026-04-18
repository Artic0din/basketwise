import type { Browser } from "playwright";
import type { PriceProvider, ScrapedPrice, StoreProductRow } from "../types.js";
import type { RateLimiter } from "../rate-limiter.js";
import { WoolworthsScraper, type WoolworthsScrapedProduct } from "./scraper.js";
import { mapWoolworthsProduct } from "./mapper.js";

const PROGRESS_INTERVAL = 10;

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
 */
function findBestMatch(
  results: WoolworthsScrapedProduct[],
  storeName: string,
): WoolworthsScrapedProduct | null {
  const MIN_SCORE = 0.5;
  let bestProduct: WoolworthsScrapedProduct | null = null;
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

export class WoolworthsProvider implements PriceProvider {
  readonly storeName = "Woolworths";
  readonly storeSlug = "woolworths";
  private readonly scraper: WoolworthsScraper;

  constructor(browser: Browser, rateLimiter: RateLimiter) {
    this.scraper = new WoolworthsScraper(browser, rateLimiter);
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
            `[WoolworthsProvider] No results for: ${sp.storeName}`,
          );
          skipped++;
          results.push(null);
          continue;
        }

        const bestMatch = findBestMatch(searchResults, sp.storeName);

        if (!bestMatch) {
          console.warn(
            `[WoolworthsProvider] No matching product for: ${sp.storeName}`,
          );
          skipped++;
          results.push(null);
          continue;
        }

        results.push(mapWoolworthsProduct(bestMatch, sp));
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
          `Woolworths: ${count}/${storeProducts.length} scraped (${skipped} skipped)`,
        );
      }
    }

    return results;
  }
}
