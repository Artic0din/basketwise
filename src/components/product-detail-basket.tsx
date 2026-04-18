"use client";

import { AddToBasket } from "@/components/add-to-basket";
import type { StorePriceInfo } from "@/lib/queries";
import type { StorePrice } from "@/types/product";

interface ProductDetailBasketProps {
  productId: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  stores: StorePriceInfo[];
}

/**
 * Client component bridge for the product detail page.
 * Converts StorePriceInfo (from server queries) to StorePrice (for basket store).
 */
export function ProductDetailBasket({
  productId,
  name,
  brand,
  packSize,
  stores,
}: ProductDetailBasketProps) {
  // Convert StorePriceInfo to StorePrice for basket compatibility
  const storePrices: StorePrice[] = stores.map((s) => ({
    storeSlug: s.storeSlug as StorePrice["storeSlug"],
    storeName: s.storeName,
    price: s.price ? parseFloat(s.price) : null,
    unitPrice: s.unitPrice ? parseFloat(s.unitPrice) : null,
    unitMeasure: s.unitMeasure,
    isSpecial: s.isSpecial,
    isFakeSpecial: s.isFakeSpecial,
    lastUpdated: s.lastUpdated ? new Date(s.lastUpdated) : null,
  }));

  return (
    <AddToBasket
      productId={productId}
      name={name}
      brand={brand}
      packSize={packSize}
      stores={storePrices}
    />
  );
}
