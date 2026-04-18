import type { AldiRawProduct } from "./scraper.js";
import type { ScrapedPrice, StoreProductRow } from "../types.js";

/**
 * Map a raw Aldi HTML-scraped product into a ScrapedPrice.
 * Returns null if the price is missing or unparseable.
 */
export function mapAldiProduct(
  raw: AldiRawProduct,
  storeProduct: StoreProductRow,
): ScrapedPrice | null {
  if (raw.price == null || !isFinite(raw.price)) {
    console.warn(
      `[AldiMapper] Missing or invalid price for product ${storeProduct.id.toString()} (name: ${raw.name})`,
    );
    return null;
  }

  return {
    productId: storeProduct.productId,
    storeId: storeProduct.storeId,
    price: raw.price.toFixed(2),
    unitPrice: raw.unitPrice != null ? raw.unitPrice.toFixed(4) : null,
    unitMeasure: raw.unitMeasure ?? null,
    isSpecial: raw.isSpecial,
    specialType: raw.isSpecial ? "special_buy" : null,
  };
}
