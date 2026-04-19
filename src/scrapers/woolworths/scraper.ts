import type { RateLimiter } from "../rate-limiter.js";

/**
 * Woolworths website search API.
 *
 * Uses the public search API at woolworths.com.au which returns JSON
 * product data. First fetches the homepage to get session cookies,
 * then POSTs search queries. No API key required.
 */
const WOOLWORTHS_SEARCH_URL =
  "https://www.woolworths.com.au/apis/ui/Search/products";
const WOOLWORTHS_HOME_URL = "https://www.woolworths.com.au/";

const DEFAULT_PAGE_SIZE = 48;

/**
 * Structured product data extracted from a Woolworths search result.
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

interface WoolworthsApiProduct {
  Name?: string;
  Brand?: string;
  Price?: number;
  WasPrice?: number;
  CupPrice?: number;
  CupMeasure?: string;
  IsOnSpecial?: boolean;
  IsHalfPrice?: boolean;
  IsNew?: boolean;
  HasMultiBuyDiscount?: boolean;
  Stockcode?: number;
}

interface WoolworthsSearchResponse {
  Products?: Array<{ Products?: WoolworthsApiProduct[] }>;
  SearchResultsCount?: number;
}

export class WoolworthsScraper {
  private sessionCookies: string | null = null;

  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Get session cookies from the Woolworths homepage.
   */
  private async initSession(): Promise<void> {
    if (this.sessionCookies) return;

    try {
      console.info("[WoolworthsScraper] Initializing session...");
      const response = await fetch(WOOLWORTHS_HOME_URL, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        redirect: "follow",
      });

      const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
      if (setCookieHeaders.length > 0) {
        this.sessionCookies = setCookieHeaders
          .map((c) => c.split(";")[0])
          .join("; ");
        console.info(
          `[WoolworthsScraper] Session initialized (${setCookieHeaders.length} cookies)`,
        );
      } else {
        console.warn("[WoolworthsScraper] No cookies received from homepage");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[WoolworthsScraper] Session init failed: ${message}`);
    }
  }

  /**
   * Search Woolworths for a product name and return all matching results.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<WoolworthsScrapedProduct[]> {
    await this.initSession();
    await this.rateLimiter.acquire();

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.info(
          `[WoolworthsScraper] Searching: "${searchTerm}"${attempt > 1 ? ` (attempt ${attempt})` : ""}`,
        );

        const headers: Record<string, string> = {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (this.sessionCookies) {
          headers["Cookie"] = this.sessionCookies;
        }

        const body = JSON.stringify({
          SearchTerm: searchTerm,
          PageSize: DEFAULT_PAGE_SIZE,
          PageNumber: 1,
          SortType: "TraderRelevance",
          Location: `/shop/search/products?searchTerm=${encodeURIComponent(searchTerm)}`,
        });

        const response = await fetch(WOOLWORTHS_SEARCH_URL, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          console.error(
            `[WoolworthsScraper] API returned ${response.status} for "${searchTerm}"`,
          );

          // Try refreshing session on auth errors
          if (response.status === 401 || response.status === 403) {
            this.sessionCookies = null;
            await this.initSession();
          }

          if (attempt < maxRetries) {
            const backoffMs = attempt * 5000;
            console.info(
              `[WoolworthsScraper] Retrying in ${(backoffMs / 1000).toString()}s...`,
            );
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          return [];
        }

        const data = (await response.json()) as WoolworthsSearchResponse;
        const products = this.parseResponse(data);

        if (products.length === 0) {
          console.warn(
            `[WoolworthsScraper] No products returned for "${searchTerm}"`,
          );
          return [];
        }

        console.info(
          `[WoolworthsScraper] Found ${products.length} products of ${data.SearchResultsCount ?? "unknown"} total`,
        );

        return products;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[WoolworthsScraper] Error searching for "${searchTerm}": ${message}`,
        );

        if (attempt < maxRetries) {
          const backoffMs = attempt * 5000;
          console.info(
            `[WoolworthsScraper] Retrying in ${(backoffMs / 1000).toString()}s...`,
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        return [];
      }
    }

    return [];
  }

  /**
   * Parse the search API response into structured products.
   */
  private parseResponse(
    data: WoolworthsSearchResponse,
  ): WoolworthsScrapedProduct[] {
    const products: WoolworthsScrapedProduct[] = [];

    const groups = data.Products ?? [];
    for (const group of groups) {
      const items = group.Products ?? [];
      for (const item of items) {
        if (!item.Name) continue;

        const isOnSpecial = item.IsOnSpecial ?? false;

        products.push({
          name: item.Name,
          price: item.Price ?? null,
          wasPrice:
            isOnSpecial && item.WasPrice != null && item.WasPrice !== item.Price
              ? item.WasPrice
              : null,
          cupPrice: item.CupPrice ?? null,
          cupMeasure: item.CupMeasure ?? null,
          isOnSpecial,
          isHalfPrice: item.IsHalfPrice ?? false,
          hasMultiBuyDiscount: item.HasMultiBuyDiscount ?? false,
        });
      }
    }

    return products;
  }
}
