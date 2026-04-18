import type { RateLimiter } from "../rate-limiter.js";

const ALDI_BASE_URL = "https://www.aldi.com.au";

/**
 * Parsed product data from Aldi.
 *
 * NOTE: Aldi Australia migrated to a Nuxt 3 SPA in 2025. Product pricing
 * is loaded at runtime from api.aldi.com.au which requires authentication.
 * The SSR HTML does not contain price data -- only product names and
 * category structure are available from the NUXT_DATA payload.
 *
 * Until a public pricing API is found, this scraper can only return
 * product names without prices. Price scraping is DEFERRED.
 */
export interface AldiRawProduct {
  /** Product name from the listing tile. */
  name: string;
  /** Current price in dollars (e.g. 3.49). Always null -- see NOTE above. */
  price: number | null;
  /** Unit price in dollars per unit. Always null -- see NOTE above. */
  unitPrice: number | null;
  /** Unit of measure for the unit price. Always null -- see NOTE above. */
  unitMeasure: string | null;
  /** Whether this product is listed as on-special. Always false -- see NOTE above. */
  isSpecial: boolean;
  /** Category slug the product belongs to. */
  category: string | null;
}

/**
 * Category paths for Aldi AU product pages.
 * These are the URL segments used by the Nuxt 3 SPA.
 */
export const ALDI_CATEGORIES = [
  "dairy-eggs-fridge/milk",
  "dairy-eggs-fridge/cheese",
  "dairy-eggs-fridge/yogurt",
  "dairy-eggs-fridge/eggs",
  "pantry/baking",
  "pantry/sauces",
  "pantry/rice",
  "bakery",
  "freezer",
  "drinks",
  "fresh-produce",
] as const;

export type AldiCategory = (typeof ALDI_CATEGORIES)[number];

/**
 * Scraper for Aldi Australia product listing pages.
 *
 * Aldi AU now uses a Nuxt 3 SPA. Product data is partially server-rendered
 * into a __NUXT_DATA__ script tag, but prices are loaded from a protected
 * API at runtime. This scraper extracts product names and category slugs
 * from the NUXT_DATA payload.
 *
 * LIMITATION: Prices are NOT available without the authenticated
 * api.aldi.com.au endpoint. This scraper is kept for product discovery
 * but price data will be null.
 */
export class AldiScraper {
  private readonly rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch a category page and extract product names from the NUXT_DATA payload.
   * Prices are NOT available from the SSR data.
   */
  async fetchCategoryPage(categoryPath: string): Promise<AldiRawProduct[]> {
    await this.rateLimiter.acquire();

    const url = `${ALDI_BASE_URL}/products/${categoryPath}`;

    console.info(`[AldiScraper] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(
        `[AldiScraper] HTTP ${response.status.toString()} fetching ${url}`,
      );
      return [];
    }

    const html = await response.text();
    return this.parseNuxtData(html, categoryPath);
  }

  /**
   * Fetch a single product page by its URL path.
   * Used when store_url is available on the StoreProduct row.
   *
   * NOTE: Prices are NOT available from the SSR data.
   */
  async fetchProductPage(productPath: string): Promise<AldiRawProduct | null> {
    await this.rateLimiter.acquire();

    const url = productPath.startsWith("http")
      ? productPath
      : `${ALDI_BASE_URL}${productPath}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(
        `[AldiScraper] HTTP ${response.status.toString()} fetching ${url}`,
      );
      return null;
    }

    const html = await response.text();
    const products = this.parseNuxtData(html, null);
    return products[0] ?? null;
  }

  /**
   * Parse product names from the Nuxt 3 __NUXT_DATA__ payload.
   *
   * The NUXT_DATA is a JSON array where entries reference each other by index.
   * Product names follow a pattern: "Product Name with Size" followed by
   * a URL slug like "brand-product-name-size".
   */
  private parseNuxtData(
    html: string,
    categoryPath: string | null,
  ): AldiRawProduct[] {
    const nuxtMatch = html.match(
      /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!nuxtMatch?.[1]) {
      console.warn("[AldiScraper] No __NUXT_DATA__ found in HTML");
      return [];
    }

    let entries: unknown[];
    try {
      entries = JSON.parse(nuxtMatch[1]) as unknown[];
    } catch {
      console.error("[AldiScraper] Failed to parse __NUXT_DATA__");
      return [];
    }

    const products: AldiRawProduct[] = [];

    // Product names in NUXT_DATA follow a pattern:
    // String entry "Product Name 500g" followed by slug "brand-product-name-500g"
    // The slug contains hyphens and matches the product path pattern
    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const next = entries[i + 1];

      if (
        typeof current !== "string" ||
        typeof next !== "string"
      ) {
        continue;
      }

      // Product names typically have a size/weight suffix
      // and the next entry is a URL slug (lowercase with hyphens)
      const isProductName =
        current.length > 5 &&
        current.length < 200 &&
        /[A-Z]/.test(current) &&
        /\d+\s*[gGmMlLkK]{1,2}\b/.test(current);

      const isSlug =
        next.length > 5 &&
        /^[a-z0-9-]+$/.test(next) &&
        next.includes("-");

      if (isProductName && isSlug) {
        products.push({
          name: current,
          price: null,
          unitPrice: null,
          unitMeasure: null,
          isSpecial: false,
          category: categoryPath,
        });
      }
    }

    if (products.length > 0) {
      console.info(
        `[AldiScraper] Found ${products.length.toString()} product names from NUXT_DATA`,
      );
    } else {
      console.warn(
        "[AldiScraper] No products parsed from NUXT_DATA (prices require authenticated API)",
      );
    }

    return products;
  }
}
