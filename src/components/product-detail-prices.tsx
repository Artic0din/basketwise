"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STORE_COLOURS } from "@/types/product";
import type { StorePriceInfo } from "@/lib/queries";

interface ProductDetailPricesProps {
  stores: StorePriceInfo[];
}

/** Human-readable special type labels. */
const SPECIAL_TYPE_LABELS: Record<string, string> = {
  half_price: "Half Price",
  multi_buy: "Multi-Buy",
  price_drop: "Price Drop",
  member: "Member Price",
  everyday: "Everyday Low",
};

function formatPrice(price: string): string {
  return `$${parseFloat(price).toFixed(2)}`;
}

function formatUnitPrice(unitPrice: string, unitMeasure: string): string {
  return `$${parseFloat(unitPrice).toFixed(2)} ${unitMeasure}`;
}

function getTimeSinceUpdate(lastUpdated: string): string {
  const now = new Date();
  const updated = new Date(lastUpdated);
  const diffMs = now.getTime() - updated.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Updated just now";
  if (diffHours === 1) return "Updated 1 hour ago";
  if (diffHours < 24) return `Updated ${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Updated 1 day ago";
  return `Updated ${diffDays} days ago`;
}

/**
 * Store price comparison list for the product detail page.
 * Sorted by price (cheapest first), with green highlight on the best price.
 */
export function ProductDetailPrices({ stores }: ProductDetailPricesProps) {
  if (stores.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
        <p className="text-muted-foreground">
          No store prices available for this product.
        </p>
      </div>
    );
  }

  // Sort by price ascending; null prices go to the end
  const sorted = [...stores].sort((a, b) => {
    const priceA = a.price ? parseFloat(a.price) : Infinity;
    const priceB = b.price ? parseFloat(b.price) : Infinity;
    return priceA - priceB;
  });

  // The cheapest store (with a valid price) gets the "Best Price" badge
  const cheapestStoreId =
    sorted.length > 0 && sorted[0].price ? sorted[0].storeId : null;

  return (
    <div className="space-y-3">
      {sorted.map((store) => {
        const colours = STORE_COLOURS[store.storeSlug] ?? {
          bg: "bg-gray-600",
          text: "text-gray-600",
          pill: "bg-gray-600 text-white",
        };
        const isCheapest = store.storeId === cheapestStoreId;
        const specialLabel = store.specialType
          ? SPECIAL_TYPE_LABELS[store.specialType] ?? store.specialType
          : null;

        // Compute was-price and discount from the 60-day average context
        // For now we show discount badge when isSpecial and not fake
        const hasDiscount = store.isSpecial && !store.isFakeSpecial;

        return (
          <div
            key={store.storeId}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-4 transition-colors",
              isCheapest && "bg-emerald-50 border-emerald-200",
            )}
          >
            {/* Store pill */}
            <div className="flex-shrink-0">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                  colours.pill,
                )}
              >
                {store.storeName}
              </span>
            </div>

            {/* Prices */}
            <div className="flex flex-1 items-baseline gap-3">
              {store.price ? (
                <>
                  <span className="text-2xl font-bold tabular-nums">
                    {formatPrice(store.price)}
                  </span>
                  {store.unitPrice && store.unitMeasure && (
                    <span className="text-base font-semibold text-muted-foreground tabular-nums">
                      {formatUnitPrice(store.unitPrice, store.unitMeasure)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-base text-muted-foreground">
                  Not available
                </span>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
              {isCheapest && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                  Best Price
                </Badge>
              )}
              {store.isFakeSpecial && (
                <div className="group relative">
                  <Badge className="bg-rose-600 text-white hover:bg-rose-700 text-xs">
                    Not actually a saving
                  </Badge>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-52 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg group-hover:block">
                    This &quot;special&quot; price is at or above the 60-day
                    average price
                  </div>
                </div>
              )}
              {hasDiscount && specialLabel && (
                <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs">
                  {specialLabel}
                </Badge>
              )}
              {hasDiscount && !specialLabel && (
                <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs">
                  Special
                </Badge>
              )}
            </div>

            {/* Last updated */}
            {store.lastUpdated && (
              <span className="flex-shrink-0 text-xs text-muted-foreground">
                {getTimeSinceUpdate(store.lastUpdated)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
