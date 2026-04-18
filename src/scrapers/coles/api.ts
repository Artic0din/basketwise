import type { RateLimiter } from "../rate-limiter.js";

const COLES_API_BASE = "https://apigw.coles.com.au/digital/colesappbff";
const USER_AGENT =
  "BasketWise/1.0 (price comparison; contact@basketwise.com.au)";

/**
 * Shape of the JSON response from the Coles product API.
 * This is a best-guess based on research -- mapper may need adjustment
 * after the first real run.
 */
export interface ColesApiProduct {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  wasPrice: number | null;
  unitPrice: number | null;
  unitOfMeasure: string | null;
  promotionType: string | null;
  available: boolean;
}

export class ColesFetcher {
  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Fetch a single product by SKU from the Coles API.
   * Returns null for 404 (product not found) or unexpected errors.
   * Throws on 429 so the caller can decide to abort or retry.
   */
  async fetchProduct(sku: string): Promise<ColesApiProduct | null> {
    await this.rateLimiter.acquire();

    const apiKey = process.env.COLES_API_KEY;
    if (!apiKey) {
      throw new Error(
        "[ColesFetcher] COLES_API_KEY environment variable is not set",
      );
    }

    const url = `${COLES_API_BASE}/v2/products/${encodeURIComponent(sku)}?type=sku`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ColesFetcher] Network error for SKU ${sku}: ${message}`);
      return null;
    }

    if (response.status === 404) {
      console.warn(`[ColesFetcher] Product not found: ${sku}`);
      return null;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? "unknown";
      throw new Error(
        `[ColesFetcher] Rate limited (429). Retry-After: ${retryAfter}`,
      );
    }

    if (!response.ok) {
      console.error(
        `[ColesFetcher] HTTP ${response.status} for SKU ${sku}`,
      );
      return null;
    }

    try {
      const data: unknown = await response.json();

      // Log raw shape on first call for mapper validation
      if (this.rateLimiter.totalRequests === 1) {
        console.info(
          "[ColesFetcher] Raw response shape:",
          JSON.stringify(data).slice(0, 500),
        );
      }

      return data as ColesApiProduct;
    } catch {
      console.error(`[ColesFetcher] Failed to parse JSON for SKU ${sku}`);
      return null;
    }
  }
}
