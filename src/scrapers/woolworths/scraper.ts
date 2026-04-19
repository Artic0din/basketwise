import type { RateLimiter } from "../rate-limiter.js";

/**
 * Woolworths product search API endpoint.
 *
 * This uses the woolworths.com.au internal search API which returns JSON
 * product data including prices, unit prices, and special status.
 * Requires session cookies obtained from the homepage first.
 */
const WOOLWORTHS_SEARCH_URL =
  "https://www.woolworths.com.au/apis/ui/Search/products";

const WOOLWORTHS_HOME_URL = "https://www.woolworths.com.au/";

const DEFAULT_PAGE_SIZE = 48;

const REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Content-Type": "application/json",
  "Accept-Language": "en-AU,en;q=0.9",
  Origin: "https://www.woolworths.com.au",
};

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

/**
 * Raw product entry from the Woolworths search API.
 */
interface WoolworthsApiProduct {
  Name?: string;
  DisplayName?: string;
  Price?: number;
  WasPrice?: number;
  InstoreWasPrice?: number;
  CupPrice?: number;
  CupMeasure?: string;
  CupString?: string;
  IsOnSpecial?: boolean;
  InstoreIsOnSpecial?: boolean;
  IsHalfPrice?: boolean;
  SavingsAmount?: number;
  Brand?: string;
  Stockcode?: number;
  PackageSize?: string;
}

interface WoolworthsApiProductBundle {
  Products?: WoolworthsApiProduct[];
}

interface WoolworthsApiResponse {
  Products?: WoolworthsApiProductBundle[];
  SearchResultsCount?: number;
}

export class WoolworthsScraper {
  /** Cached session cookies from the Woolworths homepage. */
  private sessionCookies: string | null = null;

  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Search Woolworths for a product name and return all matching results.
   * Uses the woolworths.com.au JSON search API with session cookies.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<WoolworthsScrapedProduct[]> {
    await this.rateLimiter.acquire();

    try {
      // Ensure we have a valid session
      if (!this.sessionCookies) {
        await this.initSession();
      }

      console.info(
        `[WoolworthsScraper] Searching: "${searchTerm}"`,
      );

      const response = await fetch(WOOLWORTHS_SEARCH_URL, {
        method: "POST",
        headers: {
          ...REQUEST_HEADERS,
          Referer: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(searchTerm)}`,
          ...(this.sessionCookies
            ? { Cookie: this.sessionCookies }
            : {}),
        },
        body: JSON.stringify({
          SearchTerm: searchTerm,
          PageSize: DEFAULT_PAGE_SIZE,
          PageNumber: 1,
          SortType: "TraderRelevance",
          Location: `/shop/search/products?searchTerm=${encodeURIComponent(searchTerm)}`,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        // Session might have expired -- retry once with fresh cookies
        if (response.status === 401 || response.status === 403) {
          console.warn(
            `[WoolworthsScraper] Session expired (${response.status.toString()}), refreshing...`,
          );
          this.sessionCookies = null;
          return this.retrySearch(searchTerm);
        }

        console.error(
          `[WoolworthsScraper] API returned ${response.status.toString()} for "${searchTerm}"`,
        );
        return [];
      }

      const data = (await response.json()) as WoolworthsApiResponse;

      const products = this.parseApiResponse(data);

      if (products.length === 0) {
        console.warn(
          `[WoolworthsScraper] No products returned for "${searchTerm}"`,
        );
        return [];
      }

      console.info(
        `[WoolworthsScraper] Found ${products.length.toString()} products` +
          (data.SearchResultsCount != null
            ? ` of ${data.SearchResultsCount.toString()} total`
            : ""),
      );

      return products;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[WoolworthsScraper] Error searching for "${searchTerm}": ${message}`,
      );
      return [];
    }
  }

  /**
   * Initialise a session by fetching the Woolworths homepage to obtain cookies.
   * The search API requires session cookies to authenticate requests.
   */
  private async initSession(): Promise<void> {
    console.info("[WoolworthsScraper] Initialising session...");

    const response = await fetch(WOOLWORTHS_HOME_URL, {
      headers: {
        Accept: "text/html",
        "User-Agent": REQUEST_HEADERS["User-Agent"]!,
        "Accept-Language": "en-AU,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `[WoolworthsScraper] Failed to init session: HTTP ${response.status.toString()}`,
      );
    }

    const setCookies = response.headers.getSetCookie();
    if (setCookies.length === 0) {
      console.warn("[WoolworthsScraper] No cookies received from homepage");
    }

    // Extract cookie name=value pairs (strip attributes like path, domain, etc.)
    this.sessionCookies = setCookies
      .map((c) => c.split(";")[0]!)
      .join("; ");

    // Consume response body to free resources
    await response.text();

    console.info(
      `[WoolworthsScraper] Session initialised (${setCookies.length.toString()} cookies)`,
    );
  }

  /**
   * Retry a search after refreshing the session.
   * Only called once to avoid infinite loops.
   */
  private async retrySearch(
    searchTerm: string,
  ): Promise<WoolworthsScrapedProduct[]> {
    await this.initSession();
    await this.rateLimiter.acquire();

    const response = await fetch(WOOLWORTHS_SEARCH_URL, {
      method: "POST",
      headers: {
        ...REQUEST_HEADERS,
        Referer: `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(searchTerm)}`,
        ...(this.sessionCookies
          ? { Cookie: this.sessionCookies }
          : {}),
      },
      body: JSON.stringify({
        SearchTerm: searchTerm,
        PageSize: DEFAULT_PAGE_SIZE,
        PageNumber: 1,
        SortType: "TraderRelevance",
        Location: `/shop/search/products?searchTerm=${encodeURIComponent(searchTerm)}`,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(
        `[WoolworthsScraper] Retry failed: HTTP ${response.status.toString()} for "${searchTerm}"`,
      );
      return [];
    }

    const data = (await response.json()) as WoolworthsApiResponse;
    return this.parseApiResponse(data);
  }

  /**
   * Parse the Woolworths API JSON response into structured products.
   */
  private parseApiResponse(
    data: WoolworthsApiResponse,
  ): WoolworthsScrapedProduct[] {
    const products: WoolworthsScrapedProduct[] = [];

    const bundles = data.Products ?? [];
    for (const bundle of bundles) {
      const items = bundle.Products ?? [];
      for (const item of items) {
        if (!item.Name) continue;

        const isOnSpecial = item.IsOnSpecial ?? false;
        const wasPrice = item.WasPrice ?? null;

        products.push({
          name: item.Name,
          price: item.Price ?? null,
          wasPrice:
            isOnSpecial && wasPrice != null && wasPrice !== item.Price
              ? wasPrice
              : null,
          cupPrice: item.CupPrice ?? null,
          cupMeasure: item.CupMeasure ?? null,
          isOnSpecial,
          isHalfPrice: item.IsHalfPrice ?? false,
          hasMultiBuyDiscount: false,
        });
      }
    }

    return products;
  }
}
