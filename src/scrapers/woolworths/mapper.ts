import type { WoolworthsApiProduct } from "./api.js";
import type { ScrapedPrice, StoreProductRow } from "../types.js";

/**
 * Derive the special type from Woolworths boolean flags.
 * Priority: IsHalfPrice > HasMultiBuyDiscount > IsOnSpecial (generic).
 */
function deriveSpecialType(raw: WoolworthsApiProduct): string | null {
  if (raw.IsHalfPrice) return "half_price";
  if (raw.HasMultiBuyDiscount) return "multi_buy";
  if (raw.IsOnSpecial) return "prices_dropped";
  return null;
}

/**
 * Map a raw Woolworths API product response into a ScrapedPrice.
 * Returns null if the price is missing or unparseable.
 */
export function mapWoolworthsProduct(
  raw: WoolworthsApiProduct,
  storeProduct: StoreProductRow,
): ScrapedPrice | null {
  if (raw.Price == null || !isFinite(raw.Price)) {
    console.warn(
      `[WoolworthsMapper] Missing or invalid price for product ${storeProduct.id} (Stockcode: ${raw.Stockcode})`,
    );
    return null;
  }

  const specialType = deriveSpecialType(raw);

  const isSpecial =
    specialType !== null &&
    raw.WasPrice != null &&
    raw.Price < raw.WasPrice;

  return {
    productId: storeProduct.productId,
    storeId: storeProduct.storeId,
    price: raw.Price.toFixed(2),
    unitPrice: raw.CupPrice != null ? raw.CupPrice.toFixed(4) : null,
    unitMeasure: raw.CupMeasure ?? null,
    isSpecial,
    specialType: isSpecial ? specialType : null,
  };
}
