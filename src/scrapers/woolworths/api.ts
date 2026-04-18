import type { RateLimiter } from "../rate-limiter.js";

const WOOLWORTHS_API_BASE = "https://prod.mobile-api.woolworths.com.au";
const USER_AGENT =
  "BasketWise/1.0 (price comparison; contact@basketwise.com.au)";

/**
 * Shape of the JSON response from the Woolworths product API.
 * Fields based on the documented mobile BFF contract.
 */
export interface WoolworthsApiProduct {
  Stockcode: number;
  Name: string;
  Brand: string | null;
  Price: number | null;
  WasPrice: number | null;
  CupPrice: number | null;
  CupMeasure: string | null;
  IsOnSpecial: boolean;
  IsHalfPrice: boolean;
  HasMultiBuyDiscount: boolean;
  IsAvailable: boolean;
}

export class WoolworthsFetcher {
  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Fetch a single product by article ID from the Woolworths API.
   * Returns null for 404 (product not found) or unexpected errors.
   * Throws on 429 so the caller can decide to abort or retry.
   */
  async fetchProduct(
    articleId: string,
  ): Promise<WoolworthsApiProduct | null> {
    await this.rateLimiter.acquire();

    const apiKey = process.env.WOOLWORTHS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[WoolworthsFetcher] WOOLWORTHS_API_KEY environment variable is not set",
      );
    }

    const url = `${WOOLWORTHS_API_BASE}/wow/v2/products/${encodeURIComponent(articleId)}?details=true`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[WoolworthsFetcher] Network error for article ${articleId}: ${message}`,
      );
      return null;
    }

    if (response.status === 404) {
      console.warn(
        `[WoolworthsFetcher] Product not found: ${articleId}`,
      );
      return null;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? "unknown";
      throw new Error(
        `[WoolworthsFetcher] Rate limited (429). Retry-After: ${retryAfter}`,
      );
    }

    if (!response.ok) {
      console.error(
        `[WoolworthsFetcher] HTTP ${response.status} for article ${articleId}`,
      );
      return null;
    }

    try {
      const data: unknown = await response.json();

      // Log raw shape on first call for mapper validation
      if (this.rateLimiter.totalRequests === 1) {
        console.info(
          "[WoolworthsFetcher] Raw response shape:",
          JSON.stringify(data).slice(0, 500),
        );
      }

      return data as WoolworthsApiProduct;
    } catch {
      console.error(
        `[WoolworthsFetcher] Failed to parse JSON for article ${articleId}`,
      );
      return null;
    }
  }
}
