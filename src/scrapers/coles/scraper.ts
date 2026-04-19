import type { RateLimiter } from "../rate-limiter.js";

/**
 * Coles Online product search API base URL.
 *
 * This uses the shop.coles.com.au search API which returns JSON product data
 * including prices, unit prices, and brand info — without requiring browser
 * rendering or bypassing bot detection (PerimeterX/hCaptcha on www.coles.com.au).
 */
const COLES_API_URL =
  "https://shop.coles.com.au/search/resources/store/20601/productview/bySearchTerm";

const DEFAULT_PAGE_SIZE = 48;

/**
 * Build request headers, optionally including the Coles mobile API subscription key.
 * When COLES_API_KEY is set, the Ocp-Apim-Subscription-Key header is added
 * which may help bypass bot detection on shop.coles.com.au.
 */
function buildRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-AU,en;q=0.9",
  };

  const apiKey = process.env.COLES_API_KEY;
  if (apiKey) {
    headers["Ocp-Apim-Subscription-Key"] = apiKey;
  }

  return headers;
}

/**
 * Structured product data extracted from a Coles search result.
 */
export interface ColesScrapedProduct {
  name: string;
  price: number | null;
  wasPrice: number | null;
  unitPrice: number | null;
  unitOfMeasure: string | null;
  isSpecial: boolean;
  specialType: string | null;
}

/**
 * Raw product entry from the Coles Online search API.
 * Field names are minified single-letter keys.
 */
interface ColesApiProduct {
  /** Product name */
  n: string;
  /** Manufacturer/brand */
  m: string;
  /** Pricing object */
  p1?: {
    /** Current price (string) */
    o?: string;
    /** Original/was price (string) — equals `o` when not on special */
    l4?: string;
  };
  /** Unit price string e.g. "$1.55/ 1L" */
  u2?: string;
  /** Product attributes */
  a?: {
    /** Size/volume e.g. ["3L"] */
    O3?: string[];
    /** Unknown boolean flags */
    E1?: string[];
    W1?: string[];
    T1?: string[];
  };
  /** Part number e.g. "8150288P" */
  p?: string;
  /** SEO slug */
  s?: string;
  /** Thumbnail path */
  t?: string;
  /** Unique ID */
  u?: string;
}

interface ColesApiResponse {
  recordSetCount: string;
  recordSetTotal: string;
  catalogEntryView?: ColesApiProduct[];
}

export class ColesScraper {
  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Search Coles for a product name and return all matching results.
   * Uses the shop.coles.com.au JSON API instead of scraping HTML.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<ColesScrapedProduct[]> {
    await this.rateLimiter.acquire();

    const url = new URL(`${COLES_API_URL}/${encodeURIComponent(searchTerm)}`);
    url.searchParams.set("orderBy", "0");
    url.searchParams.set("pageNumber", "1");
    url.searchParams.set("pageSize", String(DEFAULT_PAGE_SIZE));

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.info(`[ColesScraper] Fetching: ${url.toString()}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);

        const response = await fetch(url.toString(), {
          headers: buildRequestHeaders(),
        });

        if (!response.ok) {
          console.error(
            `[ColesScraper] API returned ${response.status} for "${searchTerm}"`,
          );
          if (attempt < maxRetries) {
            const backoffMs = attempt * 5000;
            console.info(`[ColesScraper] Retrying in ${backoffMs / 1000}s...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          return [];
        }

        const text = await response.text();
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          console.error(`[ColesScraper] Got HTML instead of JSON for "${searchTerm}" (bot detection)`);
          if (attempt < maxRetries) {
            const backoffMs = attempt * 8000;
            console.info(`[ColesScraper] Retrying in ${backoffMs / 1000}s...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          return [];
        }

        const data = JSON.parse(text) as ColesApiResponse;

        if (!data.catalogEntryView || data.catalogEntryView.length === 0) {
          console.warn(
            `[ColesScraper] No products returned for "${searchTerm}"`,
          );
          return [];
        }

        console.info(
          `[ColesScraper] Found ${data.catalogEntryView.length} of ${data.recordSetTotal} total results`,
        );

        return data.catalogEntryView.map((p) => this.mapApiProduct(p));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[ColesScraper] Error searching for "${searchTerm}": ${message}`,
        );
        if (attempt < maxRetries) {
          const backoffMs = attempt * 5000;
          console.info(`[ColesScraper] Retrying in ${backoffMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        return [];
      }
    }

    return [];
  }

  /**
   * Map a raw API product entry to a ColesScrapedProduct.
   */
  private mapApiProduct(raw: ColesApiProduct): ColesScrapedProduct {
    const price = this.parsePrice(raw.p1?.o ?? null);
    const wasPrice = this.parsePrice(raw.p1?.l4 ?? null);
    const unitPriceResult = this.parseUnitPrice(raw.u2 ?? null);

    // A product is on special when the was price exists and exceeds the current price
    const isOnSpecial =
      price !== null &&
      wasPrice !== null &&
      wasPrice > price;

    const brandPrefix = raw.m ? `${raw.m} ` : "";
    const name = `${brandPrefix}${raw.n}`;

    return {
      name,
      price,
      wasPrice: isOnSpecial ? wasPrice : null,
      unitPrice: unitPriceResult.price,
      unitOfMeasure: unitPriceResult.measure,
      isSpecial: isOnSpecial,
      specialType: isOnSpecial ? "prices_dropped" : null,
    };
  }

  /**
   * Parse a price string (e.g. "4.65") into a number.
   */
  private parsePrice(text: string | null): number | null {
    if (!text) return null;
    const match = text.match(/\$?(\d+\.?\d*)/);
    if (!match?.[1]) return null;
    const value = parseFloat(match[1]);
    return isFinite(value) ? value : null;
  }

  /**
   * Parse a unit price string like "$1.55/ 1L" into price and measure.
   */
  private parseUnitPrice(
    text: string | null,
  ): { price: number | null; measure: string | null } {
    if (!text) return { price: null, measure: null };

    // Match patterns like "$1.55/ 1L" or "$2.25/ 100G" or "$2.90/ 1L"
    const match = text.match(
      /\$?(\d+\.?\d*)\s*\/?\s*(\d*\s*\w+)?/,
    );
    if (!match?.[1]) return { price: null, measure: null };

    const price = parseFloat(match[1]);
    const measure = match[2]?.trim() ?? null;

    return {
      price: isFinite(price) ? price : null,
      measure,
    };
  }
}
