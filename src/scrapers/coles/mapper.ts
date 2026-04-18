import type { ColesScrapedProduct } from "./scraper.js";
import type { ScrapedPrice, StoreProductRow } from "../types.js";

/** Coles promotion types we recognise. */
const KNOWN_SPECIAL_TYPES = new Set([
  "half_price",
  "multi_buy",
  "prices_dropped",
  "down_down",
]);

/**
 * Map a scraped Coles product into a ScrapedPrice.
 * Returns null if the price is missing or unparseable.
 */
export function mapColesProduct(
  raw: ColesScrapedProduct,
  storeProduct: StoreProductRow,
): ScrapedPrice | null {
  if (raw.price == null || !isFinite(raw.price)) {
    console.warn(
      `[ColesMapper] Missing or invalid price for product ${storeProduct.id} (${raw.name})`,
    );
    return null;
  }

  const specialType =
    raw.specialType && KNOWN_SPECIAL_TYPES.has(raw.specialType)
      ? raw.specialType
      : null;

  const isSpecial =
    specialType !== null &&
    raw.wasPrice != null &&
    raw.price < raw.wasPrice;

  return {
    productId: storeProduct.productId,
    storeId: storeProduct.storeId,
    price: raw.price.toFixed(2),
    unitPrice: raw.unitPrice != null ? raw.unitPrice.toFixed(4) : null,
    unitMeasure: raw.unitOfMeasure ?? null,
    isSpecial,
    specialType: isSpecial ? specialType : null,
  };
}
