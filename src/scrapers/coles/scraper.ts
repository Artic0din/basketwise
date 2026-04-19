import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RateLimiter } from "../rate-limiter.js";

/**
 * Path to the Python fetch proxy script.
 * Uses Python's urllib to bypass Incapsula bot detection that blocks Node.js fetch.
 */
const PYTHON_FETCH_SCRIPT = resolve(
  fileURLToPath(import.meta.url),
  "../../python/fetch.py",
);

/**
 * Structured product data extracted from a Coles search result.
 */
export interface ColesScrapedProduct {
  name: string;
  brand: string | null;
  price: number | null;
  wasPrice: number | null;
  unitPrice: number | null;
  unitOfMeasure: string | null;
  packageSize: string | null;
  sku: string | null;
  isSpecial: boolean;
  specialType: string | null;
  imageUrl: string | null;
}

/**
 * Shape of a single product returned by the Python fetch script for Coles.
 */
interface ColesPythonProduct {
  n: string;
  m: string;
  p1_o?: string | null;
  p1_l4?: string | null;
  u2?: string | null;
  p?: string | null;
  s?: string | null;
  packageSize?: string | null;
  image?: string | null;
}

export class ColesScraper {
  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Search Coles for a product name and return all matching results.
   * Delegates HTTP calls to a Python subprocess to bypass bot detection.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<ColesScrapedProduct[]> {
    await this.rateLimiter.acquire();

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.info(
          `[ColesScraper] Searching: "${searchTerm}"${attempt > 1 ? ` (attempt ${attempt})` : ""}`,
        );

        const stdout = await this.runPythonFetch(searchTerm);
        const parsed: ColesPythonProduct[] | { error: string } =
          JSON.parse(stdout) as ColesPythonProduct[] | { error: string };

        if (!Array.isArray(parsed)) {
          const errorMsg =
            "error" in parsed ? parsed.error : "Unknown Python error";
          console.error(`[ColesScraper] Python fetch error: ${errorMsg}`);
          if (attempt < maxRetries) {
            const backoffMs = attempt * 5000;
            console.info(`[ColesScraper] Retrying in ${(backoffMs / 1000).toString()}s...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          return [];
        }

        if (parsed.length === 0) {
          console.warn(
            `[ColesScraper] No products returned for "${searchTerm}"`,
          );
          return [];
        }

        console.info(
          `[ColesScraper] Found ${parsed.length.toString()} products`,
        );

        return parsed.map((p) => this.mapPythonProduct(p));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[ColesScraper] Error searching for "${searchTerm}": ${message}`,
        );
        if (attempt < maxRetries) {
          const backoffMs = attempt * 5000;
          console.info(`[ColesScraper] Retrying in ${(backoffMs / 1000).toString()}s...`);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        return [];
      }
    }

    return [];
  }

  /**
   * Spawn Python to fetch Coles product data.
   */
  private runPythonFetch(searchTerm: string): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      execFile(
        "python3",
        [PYTHON_FETCH_SCRIPT, "--store", "coles", "--query", searchTerm],
        { timeout: 30_000, env: { ...process.env } },
        (error, stdout, stderr) => {
          if (stderr) {
            console.error(`[ColesScraper] Python stderr: ${stderr.trim()}`);
          }
          if (error) {
            reject(new Error(`Python process failed: ${error.message}`));
            return;
          }
          resolvePromise(stdout.trim());
        },
      );
    });
  }

  /**
   * Map a Python-returned product to a ColesScrapedProduct.
   */
  private mapPythonProduct(raw: ColesPythonProduct): ColesScrapedProduct {
    const price = this.parsePrice(raw.p1_o ?? null);
    const wasPrice = this.parsePrice(raw.p1_l4 ?? null);
    const unitPriceResult = this.parseUnitPrice(raw.u2 ?? null);

    const isOnSpecial =
      price !== null && wasPrice !== null && wasPrice > price;

    const brandPrefix = raw.m ? `${raw.m} ` : "";
    const name = `${brandPrefix}${raw.n}`;

    return {
      name,
      brand: typeof raw.m === "string" && raw.m.length > 0 ? raw.m : null,
      price,
      wasPrice: isOnSpecial ? wasPrice : null,
      unitPrice: unitPriceResult.price,
      unitOfMeasure: unitPriceResult.measure,
      packageSize: typeof raw.packageSize === "string" && raw.packageSize.length > 0 ? raw.packageSize : null,
      sku: typeof raw.p === "string" && raw.p.length > 0 ? raw.p : null,
      isSpecial: isOnSpecial,
      specialType: isOnSpecial ? "prices_dropped" : null,
      imageUrl: typeof raw.image === "string" && raw.image.length > 0
        ? raw.image
        : null,
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

    const match = text.match(/\$?(\d+\.?\d*)\s*\/?\s*(\d*\s*\w+)?/);
    if (!match?.[1]) return { price: null, measure: null };

    const price = parseFloat(match[1]);
    const measure = match[2]?.trim() ?? null;

    return {
      price: isFinite(price) ? price : null,
      measure,
    };
  }
}
