import type { WoolworthsScrapedProduct } from "./scraper.js";
import type { ScrapedPrice, StoreProductRow } from "../types.js";

/**
 * Derive the special type from scraped Woolworths boolean flags.
 * Priority: isHalfPrice > hasMultiBuyDiscount > isOnSpecial (generic).
 */
function deriveSpecialType(raw: WoolworthsScrapedProduct): string | null {
  if (raw.isHalfPrice) return "half_price";
  if (raw.hasMultiBuyDiscount) return "multi_buy";
  if (raw.isOnSpecial) return "prices_dropped";
  return null;
}

/**
 * Map a scraped Woolworths product into a ScrapedPrice.
 * Returns null if the price is missing or unparseable.
 */
export function mapWoolworthsProduct(
  raw: WoolworthsScrapedProduct,
  storeProduct: StoreProductRow,
): ScrapedPrice | null {
  if (raw.price == null || !isFinite(raw.price)) {
    console.warn(
      `[WoolworthsMapper] Missing or invalid price for product ${storeProduct.id} (${raw.name})`,
    );
    return null;
  }

  const specialType = deriveSpecialType(raw);

  const isSpecial =
    specialType !== null &&
    raw.wasPrice != null &&
    raw.price < raw.wasPrice;

  return {
    productId: storeProduct.productId,
    storeId: storeProduct.storeId,
    price: raw.price.toFixed(2),
    unitPrice: raw.cupPrice != null ? raw.cupPrice.toFixed(4) : null,
    unitMeasure: raw.cupMeasure ?? null,
    isSpecial,
    specialType: isSpecial ? specialType : null,
  };
}
