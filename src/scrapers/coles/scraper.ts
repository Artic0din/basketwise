import { load, type CheerioAPI } from "cheerio";
import type { Browser, Page } from "playwright";
import { createContext, dismissPopups } from "../browser.js";
import type { RateLimiter } from "../rate-limiter.js";

const COLES_SEARCH_URL = "https://www.coles.com.au/search?q=";

/**
 * Structured product data extracted from a Coles search result tile.
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
 * Selector strategies for Coles product tiles.
 * Multiple patterns are tried in order — the first match wins.
 */
const TILE_SELECTORS = [
  '[data-testid="product-tile"]',
  ".product-tile",
  ".coles-targeting-ProductTileWrapper",
  "section.product",
  'article[class*="product"]',
];

const PRICE_SELECTORS = [
  ".price__value",
  '[data-testid="product-pricing"]',
  ".product-price",
  'span[class*="price"]',
];

const WAS_PRICE_SELECTORS = [
  ".price__was",
  '[data-testid="was-price"]',
  ".was-price",
  'span[class*="was"]',
];

const UNIT_PRICE_SELECTORS = [
  ".price__calculation_method",
  '[data-testid="pricing-unit"]',
  ".unit-price",
  'span[class*="cup-price"]',
  'span[class*="unit"]',
];

const NAME_SELECTORS = [
  ".product__title",
  '[data-testid="product-title"]',
  ".product-name",
  "h3",
  "h2",
  'a[class*="product"]',
];

const SPECIAL_SELECTORS = [
  ".badge--special",
  '[data-testid="promo-badge"]',
  ".promo-badge",
  'span[class*="special"]',
  'span[class*="save"]',
  ".half-price-badge",
  ".prices-dropped",
  ".down-down",
];

export class ColesScraper {
  constructor(
    private readonly browser: Browser,
    private readonly rateLimiter: RateLimiter,
  ) {}

  /**
   * Search Coles for a product name and return all matching results.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<ColesScrapedProduct[]> {
    await this.rateLimiter.acquire();

    const context = await createContext(this.browser);
    let page: Page | null = null;

    try {
      page = await context.newPage();
      const url = `${COLES_SEARCH_URL}${encodeURIComponent(searchTerm)}`;

      console.info(`[ColesScraper] Navigating to: ${url}`);

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for the page to settle (CloudFlare, JS rendering)
      await page.waitForTimeout(3000);

      // Dismiss any popups
      await dismissPopups(page);

      // Wait for product content to appear
      await this.waitForProducts(page);

      // Get the full rendered HTML and parse with cheerio
      const html = await page.content();
      const $ = load(html);

      return this.parseProducts($);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[ColesScraper] Error searching for "${searchTerm}": ${message}`,
      );
      return [];
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      await context.close().catch(() => {});
    }
  }

  /**
   * Wait for product tiles to appear on the page.
   * Tries multiple selectors since the site may change its markup.
   */
  private async waitForProducts(page: Page): Promise<void> {
    for (const selector of TILE_SELECTORS) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.info(`[ColesScraper] Products found via: ${selector}`);
        return;
      } catch {
        // Try next selector
      }
    }
    console.warn(
      "[ColesScraper] No product tiles found with known selectors. Attempting cheerio parse of full page.",
    );
  }

  /**
   * Parse product tiles from the HTML using cheerio.
   * This hybrid approach is more robust than pure Playwright selectors.
   */
  private parseProducts($: CheerioAPI): ColesScrapedProduct[] {
    const products: ColesScrapedProduct[] = [];

    // Find product tiles using multiple selector strategies
    let $tiles = $("__never_match__");
    for (const selector of TILE_SELECTORS) {
      $tiles = $(selector);
      if ($tiles.length > 0) {
        console.info(
          `[ColesScraper] Found ${$tiles.length} tiles via cheerio: ${selector}`,
        );
        break;
      }
    }

    if ($tiles.length === 0) {
      console.warn("[ColesScraper] No product tiles found in HTML");
      return products;
    }

    $tiles.each((_index, tile) => {
      const $tile = $(tile);

      const name = this.extractText($, $tile, NAME_SELECTORS);
      const priceText = this.extractText($, $tile, PRICE_SELECTORS);
      const wasPriceText = this.extractText($, $tile, WAS_PRICE_SELECTORS);
      const unitPriceText = this.extractText($, $tile, UNIT_PRICE_SELECTORS);
      const specialBadge = this.extractText($, $tile, SPECIAL_SELECTORS);

      if (!name) return;

      const price = this.parsePrice(priceText);
      const wasPrice = this.parsePrice(wasPriceText);
      const unitPriceResult = this.parseUnitPrice(unitPriceText);

      const specialType = this.classifySpecial(specialBadge);
      const isSpecial = specialType !== null && wasPrice !== null && price !== null && price < wasPrice;

      products.push({
        name,
        price,
        wasPrice,
        unitPrice: unitPriceResult.price,
        unitOfMeasure: unitPriceResult.measure,
        isSpecial,
        specialType: isSpecial ? specialType : null,
      });
    });

    console.info(`[ColesScraper] Parsed ${products.length} products`);
    return products;
  }

  /**
   * Try multiple selectors to extract text from within a tile.
   */
  private extractText(
    _$: CheerioAPI,
    $tile: ReturnType<CheerioAPI>,
    selectors: string[],
  ): string | null {
    for (const selector of selectors) {
      const text = $tile.find(selector).first().text().trim();
      if (text) return text;
    }
    return null;
  }

  /**
   * Parse a dollar amount from text like "$4.50" or "4.50".
   */
  private parsePrice(text: string | null): number | null {
    if (!text) return null;
    const match = text.match(/\$?(\d+\.?\d*)/);
    if (!match?.[1]) return null;
    const value = parseFloat(match[1]);
    return isFinite(value) ? value : null;
  }

  /**
   * Parse unit price text like "$2.25 per litre" into price and measure.
   */
  private parseUnitPrice(
    text: string | null,
  ): { price: number | null; measure: string | null } {
    if (!text) return { price: null, measure: null };

    const match = text.match(/\$?(\d+\.?\d*)\s*(?:per\s+|\/\s*)?([\w]+)?/i);
    if (!match?.[1]) return { price: null, measure: null };

    const price = parseFloat(match[1]);
    const measure = match[2] ?? null;

    return {
      price: isFinite(price) ? price : null,
      measure,
    };
  }

  /**
   * Classify a special badge into a known type.
   */
  private classifySpecial(badge: string | null): string | null {
    if (!badge) return null;
    const lower = badge.toLowerCase();

    if (lower.includes("half price") || lower.includes("1/2")) return "half_price";
    if (lower.includes("multi buy") || lower.includes("multibuy")) return "multi_buy";
    if (lower.includes("prices dropped")) return "prices_dropped";
    if (lower.includes("down down")) return "down_down";
    if (lower.includes("special") || lower.includes("save")) return "prices_dropped";

    return null;
  }
}
