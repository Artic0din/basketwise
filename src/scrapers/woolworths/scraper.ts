import { load, type CheerioAPI } from "cheerio";
import type { Browser, Page, Response as PlaywrightResponse } from "playwright";
import { createContext, dismissPopups } from "../browser.js";
import type { RateLimiter } from "../rate-limiter.js";

const WOOLWORTHS_SEARCH_URL =
  "https://www.woolworths.com.au/shop/search/products?searchTerm=";

/**
 * Shape of the internal Woolworths search API response.
 * The frontend SPA calls this under the hood.
 */
interface WoolworthsApiSearchResult {
  Products?: Array<{
    Products?: Array<{
      Name?: string;
      Price?: number;
      WasPrice?: number;
      CupPrice?: number;
      CupMeasure?: string;
      IsOnSpecial?: boolean;
      IsHalfPrice?: boolean;
      HasMultiBuyDiscount?: boolean;
    }>;
  }>;
}

/**
 * Structured product data extracted from a Woolworths search result tile.
 */
export interface WoolworthsScrapedProduct {
  name: string;
  price: number | null;
  wasPrice: number | null;
  cupPrice: number | null;
  cupMeasure: string | null;
  isOnSpecial: boolean;
  isHalfPrice: boolean;
  hasMultiBuyDiscount: boolean;
}

/**
 * Selector strategies for Woolworths product tiles.
 */
const TILE_SELECTORS = [
  ".product-tile-v2",
  '[data-testid="product-tile"]',
  ".product-tile",
  ".shelfProductTile",
  'section[class*="product"]',
  'div[class*="productTile"]',
];

const PRICE_SELECTORS = [
  ".price",
  '[data-testid="product-price"]',
  ".product-price",
  ".primary",
  'span[class*="price-dollars"]',
];

const WAS_PRICE_SELECTORS = [
  ".was-price",
  '[data-testid="was-price"]',
  ".price-was",
  'span[class*="was"]',
];

const CUP_PRICE_SELECTORS = [
  ".price-per-cup",
  '[data-testid="price-per-cup"]',
  ".cup-price",
  'span[class*="cup"]',
  'span[class*="unit-price"]',
];

const NAME_SELECTORS = [
  ".product-title-link",
  '[data-testid="product-title"]',
  ".shelfProductTile-title",
  ".product-title",
  "h3",
  "h2",
  'a[class*="product-title"]',
];

const SPECIAL_SELECTORS = [
  ".product-tag-label",
  '[data-testid="product-tag"]',
  ".promo-tag",
  ".special-badge",
  'span[class*="special"]',
  'span[class*="save"]',
  ".half-price",
  ".multi-buy",
];

export class WoolworthsScraper {
  constructor(
    private readonly browser: Browser,
    private readonly rateLimiter: RateLimiter,
  ) {}

  /**
   * Search Woolworths for a product name and return all matching results.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<WoolworthsScrapedProduct[]> {
    await this.rateLimiter.acquire();

    const context = await createContext(this.browser);
    let page: Page | null = null;

    try {
      page = await context.newPage();

      // Set extra headers to reduce bot detection likelihood
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-AU,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      });

      const url = `${WOOLWORTHS_SEARCH_URL}${encodeURIComponent(searchTerm)}`;

      console.info(`[WoolworthsScraper] Navigating to: ${url}`);

      // Intercept the internal API response that the SPA makes
      const apiResponsePromise = new Promise<WoolworthsScrapedProduct[]>(
        (resolve) => {
          const timeout = setTimeout(() => resolve([]), 15000);

          page!.on("response", async (response: PlaywrightResponse) => {
            const reqUrl = response.url();
            if (
              reqUrl.includes("/apis/ui/Search/products") ||
              reqUrl.includes("/api/v3/ui/schemaorg/inferred/SearchResultsPage")
            ) {
              try {
                const json: unknown = await response.json();
                const products = this.parseApiResponse(
                  json as WoolworthsApiSearchResult,
                );
                if (products.length > 0) {
                  clearTimeout(timeout);
                  resolve(products);
                }
              } catch {
                // Not the right response, continue
              }
            }
          });
        },
      );

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for the page to settle
      await page.waitForTimeout(5000);

      // Dismiss any popups
      await dismissPopups(page);

      // Try API interception first (most reliable for Woolworths)
      const apiProducts = await apiResponsePromise;
      if (apiProducts.length > 0) {
        console.info(
          `[WoolworthsScraper] Got ${apiProducts.length} products via API interception`,
        );
        return apiProducts;
      }

      // Fallback: try DOM scraping
      await this.waitForProducts(page);
      const html = await page.content();
      const $ = load(html);

      return this.parseProducts($);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[WoolworthsScraper] Error searching for "${searchTerm}": ${message}`,
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
   * Parse the internal Woolworths API JSON response into structured products.
   */
  private parseApiResponse(
    data: WoolworthsApiSearchResult,
  ): WoolworthsScrapedProduct[] {
    const products: WoolworthsScrapedProduct[] = [];

    const bundles = data?.Products ?? [];
    for (const bundle of bundles) {
      const items = bundle?.Products ?? [];
      for (const item of items) {
        if (!item.Name) continue;

        products.push({
          name: item.Name,
          price: item.Price ?? null,
          wasPrice: item.WasPrice ?? null,
          cupPrice: item.CupPrice ?? null,
          cupMeasure: item.CupMeasure ?? null,
          isOnSpecial: item.IsOnSpecial ?? false,
          isHalfPrice: item.IsHalfPrice ?? false,
          hasMultiBuyDiscount: item.HasMultiBuyDiscount ?? false,
        });
      }
    }

    return products;
  }

  /**
   * Wait for product tiles to appear on the page.
   */
  private async waitForProducts(page: Page): Promise<void> {
    for (const selector of TILE_SELECTORS) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.info(`[WoolworthsScraper] Products found via: ${selector}`);
        return;
      } catch {
        // Try next selector
      }
    }
    console.warn(
      "[WoolworthsScraper] No product tiles found with known selectors. Attempting cheerio parse of full page.",
    );
  }

  /**
   * Parse product tiles from the HTML using cheerio.
   */
  private parseProducts($: CheerioAPI): WoolworthsScrapedProduct[] {
    const products: WoolworthsScrapedProduct[] = [];

    let $tiles = $("__never_match__");
    for (const selector of TILE_SELECTORS) {
      $tiles = $(selector);
      if ($tiles.length > 0) {
        console.info(
          `[WoolworthsScraper] Found ${$tiles.length} tiles via cheerio: ${selector}`,
        );
        break;
      }
    }

    if ($tiles.length === 0) {
      console.warn("[WoolworthsScraper] No product tiles found in HTML");
      return products;
    }

    $tiles.each((_index, tile) => {
      const $tile = $(tile);

      const name = this.extractText($, $tile, NAME_SELECTORS);
      const priceText = this.extractText($, $tile, PRICE_SELECTORS);
      const wasPriceText = this.extractText($, $tile, WAS_PRICE_SELECTORS);
      const cupPriceText = this.extractText($, $tile, CUP_PRICE_SELECTORS);
      const specialBadge = this.extractText($, $tile, SPECIAL_SELECTORS);

      if (!name) return;

      const price = this.parsePrice(priceText);
      const wasPrice = this.parsePrice(wasPriceText);
      const cupPriceResult = this.parseCupPrice(cupPriceText);

      const { isHalfPrice, hasMultiBuyDiscount, isOnSpecial } =
        this.classifySpecial(specialBadge, price, wasPrice);

      products.push({
        name,
        price,
        wasPrice,
        cupPrice: cupPriceResult.price,
        cupMeasure: cupPriceResult.measure,
        isOnSpecial,
        isHalfPrice,
        hasMultiBuyDiscount,
      });
    });

    console.info(`[WoolworthsScraper] Parsed ${products.length} products`);
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
   * Parse a dollar amount from text.
   */
  private parsePrice(text: string | null): number | null {
    if (!text) return null;
    const match = text.match(/\$?(\d+\.?\d*)/);
    if (!match?.[1]) return null;
    const value = parseFloat(match[1]);
    return isFinite(value) ? value : null;
  }

  /**
   * Parse cup price text like "$2.25 per 100g" into price and measure.
   */
  private parseCupPrice(
    text: string | null,
  ): { price: number | null; measure: string | null } {
    if (!text) return { price: null, measure: null };

    const match = text.match(/\$?(\d+\.?\d*)\s*(?:per\s+|\/\s*)?([\w\d]+)?/i);
    if (!match?.[1]) return { price: null, measure: null };

    const price = parseFloat(match[1]);
    const measure = match[2] ?? null;

    return {
      price: isFinite(price) ? price : null,
      measure,
    };
  }

  /**
   * Classify special types from badge text and price comparison.
   */
  private classifySpecial(
    badge: string | null,
    price: number | null,
    wasPrice: number | null,
  ): {
    isOnSpecial: boolean;
    isHalfPrice: boolean;
    hasMultiBuyDiscount: boolean;
  } {
    const lower = badge?.toLowerCase() ?? "";

    const isHalfPrice = lower.includes("half price") || lower.includes("1/2");
    const hasMultiBuyDiscount =
      lower.includes("multi buy") || lower.includes("multibuy");
    const hasSpecialBadge =
      isHalfPrice ||
      hasMultiBuyDiscount ||
      lower.includes("special") ||
      lower.includes("save") ||
      lower.includes("low price");

    const isOnSpecial =
      hasSpecialBadge &&
      price !== null &&
      wasPrice !== null &&
      price < wasPrice;

    return { isOnSpecial, isHalfPrice, hasMultiBuyDiscount };
  }
}
