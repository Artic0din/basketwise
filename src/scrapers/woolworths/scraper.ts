import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RateLimiter } from "../rate-limiter.js";

/**
 * Path to the Python fetch proxy script.
 * Uses Python's urllib to bypass PerimeterX bot detection that blocks Node.js fetch.
 */
const PYTHON_FETCH_SCRIPT = resolve(
  fileURLToPath(import.meta.url),
  "../../python/fetch.py",
);

/**
 * Structured product data extracted from a Woolworths search result.
 */
export interface WoolworthsScrapedProduct {
  name: string;
  brand: string | null;
  description: string | null;
  price: number | null;
  wasPrice: number | null;
  savingsAmount: number | null;
  cupPrice: number | null;
  cupMeasure: string | null;
  cupString: string | null;
  packageSize: string | null;
  unit: string | null;
  isOnSpecial: boolean;
  isHalfPrice: boolean;
  isNew: boolean;
  hasMultiBuyDiscount: boolean;
  stockcode: string | null;
  imageUrl: string | null;
}

/**
 * Shape of a single product returned by the Python fetch script for Woolworths.
 */
interface WoolworthsPythonProduct {
  Name?: string;
  DisplayName?: string | null;
  Brand?: string | null;
  Description?: string | null;
  Price?: number | null;
  WasPrice?: number | null;
  SavingsAmount?: number | null;
  CupPrice?: number | null;
  CupMeasure?: string | null;
  CupString?: string | null;
  PackageSize?: string | null;
  Unit?: string | null;
  IsOnSpecial?: boolean;
  IsHalfPrice?: boolean;
  IsNew?: boolean;
  HasMultiBuyDiscount?: boolean;
  Stockcode?: number | string | null;
  MediumImageFile?: string | null;
}

export class WoolworthsScraper {
  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Search Woolworths for a product name and return all matching results.
   * Delegates HTTP calls to a Python subprocess to bypass bot detection.
   */
  async searchProducts(
    searchTerm: string,
  ): Promise<WoolworthsScrapedProduct[]> {
    await this.rateLimiter.acquire();

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.info(
          `[WoolworthsScraper] Searching: "${searchTerm}"${attempt > 1 ? ` (attempt ${attempt})` : ""}`,
        );

        const stdout = await this.runPythonFetch(searchTerm);
        const parsed: WoolworthsPythonProduct[] | { error: string } =
          JSON.parse(stdout) as
            | WoolworthsPythonProduct[]
            | { error: string };

        if (!Array.isArray(parsed)) {
          const errorMsg =
            "error" in parsed ? parsed.error : "Unknown Python error";
          console.error(
            `[WoolworthsScraper] Python fetch error: ${errorMsg}`,
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

        if (parsed.length === 0) {
          console.warn(
            `[WoolworthsScraper] No products returned for "${searchTerm}"`,
          );
          return [];
        }

        console.info(
          `[WoolworthsScraper] Found ${parsed.length.toString()} products`,
        );

        return parsed
          .filter(
            (p): p is WoolworthsPythonProduct & { Name: string } =>
              typeof p.Name === "string" && p.Name.length > 0,
          )
          .map((p) => this.mapPythonProduct(p));
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
   * Spawn Python to fetch Woolworths product data.
   */
  private runPythonFetch(searchTerm: string): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      execFile(
        "python3",
        [
          PYTHON_FETCH_SCRIPT,
          "--store",
          "woolworths",
          "--query",
          searchTerm,
        ],
        { timeout: 30_000 },
        (error, stdout, stderr) => {
          if (stderr) {
            console.error(
              `[WoolworthsScraper] Python stderr: ${stderr.trim()}`,
            );
          }
          if (error) {
            reject(
              new Error(`Python process failed: ${error.message}`),
            );
            return;
          }
          resolvePromise(stdout.trim());
        },
      );
    });
  }

  /**
   * Map a Python-returned product to a WoolworthsScrapedProduct.
   */
  private mapPythonProduct(
    raw: WoolworthsPythonProduct & { Name: string },
  ): WoolworthsScrapedProduct {
    const isOnSpecial = raw.IsOnSpecial ?? false;

    return {
      name: raw.Name,
      brand: typeof raw.Brand === "string" && raw.Brand.length > 0 ? raw.Brand : null,
      description: typeof raw.Description === "string" && raw.Description.length > 0 ? raw.Description : null,
      price: raw.Price ?? null,
      wasPrice:
        isOnSpecial &&
        raw.WasPrice != null &&
        raw.WasPrice !== raw.Price
          ? raw.WasPrice
          : null,
      savingsAmount: raw.SavingsAmount ?? null,
      cupPrice: raw.CupPrice ?? null,
      cupMeasure: raw.CupMeasure ?? null,
      cupString: typeof raw.CupString === "string" && raw.CupString.length > 0 ? raw.CupString : null,
      packageSize: typeof raw.PackageSize === "string" && raw.PackageSize.length > 0 ? raw.PackageSize : null,
      unit: typeof raw.Unit === "string" && raw.Unit.length > 0 ? raw.Unit : null,
      isOnSpecial,
      isHalfPrice: raw.IsHalfPrice ?? false,
      isNew: raw.IsNew ?? false,
      hasMultiBuyDiscount: raw.HasMultiBuyDiscount ?? false,
      stockcode: raw.Stockcode != null ? String(raw.Stockcode) : null,
      imageUrl: typeof raw.MediumImageFile === "string" && raw.MediumImageFile.length > 0
        ? raw.MediumImageFile
        : null,
    };
  }
}
