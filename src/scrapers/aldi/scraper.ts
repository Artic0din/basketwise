import * as cheerio from "cheerio";
import type { RateLimiter } from "../rate-limiter.js";

const ALDI_BASE_URL = "https://www.aldi.com.au/groceries/";

/** Parsed product data from an Aldi HTML listing page. */
export interface AldiRawProduct {
  /** Product name from the listing tile. */
  name: string;
  /** Current price in dollars (e.g. 3.49). */
  price: number | null;
  /** Unit price in dollars per unit (e.g. 0.87 per 100g). */
  unitPrice: number | null;
  /** Unit of measure for the unit price (e.g. "per 100g"). */
  unitMeasure: string | null;
  /** Whether this product is listed as a Special Buy or on-special. */
  isSpecial: boolean;
}

/**
 * Scraper for Aldi Australia product listing pages.
 *
 * Aldi's catalog is server-rendered HTML, so we fetch pages directly
 * via HTTP and parse with cheerio. No JS rendering is needed.
 */
export class AldiScraper {
  private readonly rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  /**
   * Fetch the product listing page for a given category path and
   * parse all product tiles from the HTML response.
   */
  async fetchCategoryPage(categoryPath: string): Promise<AldiRawProduct[]> {
    await this.rateLimiter.acquire();

    const url = `${ALDI_BASE_URL}${categoryPath}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(
        `[AldiScraper] HTTP ${response.status.toString()} fetching ${url}`,
      );
    }

    const html = await response.text();
    return this.parseProductListings(html);
  }

  /**
   * Fetch a single product page by its URL path and parse the product data.
   * Used when store_url is available on the StoreProduct row.
   */
  async fetchProductPage(productPath: string): Promise<AldiRawProduct | null> {
    await this.rateLimiter.acquire();

    const url = productPath.startsWith("http")
      ? productPath
      : `https://www.aldi.com.au${productPath}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `[AldiScraper] HTTP ${response.status.toString()} fetching ${url}`,
      );
    }

    const html = await response.text();
    const products = this.parseProductListings(html);
    return products[0] ?? null;
  }

  /**
   * Parse product tiles from an Aldi HTML page.
   *
   * Aldi uses a box-based layout with product tiles containing
   * a product name, price display, and optional unit pricing.
   */
  parseProductListings(html: string): AldiRawProduct[] {
    const $ = cheerio.load(html);
    const products: AldiRawProduct[] = [];

    // Aldi AU uses .box--product tiles on their category pages
    $(".box--product, .product-tile, [data-product]").each((_i, el) => {
      const $el = $(el);

      const name =
        $el.find(".box--description--header, .product-title, h4").first().text().trim();
      if (!name) return;

      const priceText =
        $el.find(".box--price, .product-price, .price").first().text().trim();
      const price = this.parsePrice(priceText);

      const unitPriceText =
        $el.find(".box--unitprice, .unit-price, .price-per-unit").first().text().trim();
      const { unitPrice, unitMeasure } = this.parseUnitPrice(unitPriceText);

      const isSpecial =
        $el.hasClass("special-buy") ||
        $el.find(".special-buy, .badge--special, .on-special").length > 0;

      products.push({ name, price, unitPrice, unitMeasure, isSpecial });
    });

    return products;
  }

  /** Extract a numeric dollar value from a price string like "$3.49". */
  private parsePrice(text: string): number | null {
    const match = /\$?\s*(\d+\.?\d*)/.exec(text);
    if (!match?.[1]) return null;

    const value = parseFloat(match[1]);
    return isFinite(value) ? value : null;
  }

  /** Parse unit price text like "$0.87 per 100g" into value and measure. */
  private parseUnitPrice(text: string): {
    unitPrice: number | null;
    unitMeasure: string | null;
  } {
    if (!text) return { unitPrice: null, unitMeasure: null };

    const match = /\$?\s*(\d+\.?\d*)\s*(per\s+.+|\/\s*.+)/i.exec(text);
    if (!match?.[1]) return { unitPrice: null, unitMeasure: null };

    const unitPrice = parseFloat(match[1]);
    const unitMeasure = match[2]?.trim() ?? null;

    return {
      unitPrice: isFinite(unitPrice) ? unitPrice : null,
      unitMeasure,
    };
  }
}
