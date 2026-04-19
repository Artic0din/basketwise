import { cn } from "@/lib/utils";
import { StoreChip } from "@/components/store-chip";
import type { StorePrice } from "@/types/product";

interface StorePriceDisplayProps {
  storePrice: StorePrice;
  isCheapest: boolean;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatUnitPrice(unitPrice: number, unitMeasure: string): string {
  return `$${unitPrice.toFixed(2)} ${unitMeasure}`;
}

function getTimeSinceUpdate(lastUpdated: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Updated just now";
  if (diffHours === 1) return "Updated 1 hour ago";
  if (diffHours < 24) return `Updated ${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Updated 1 day ago";
  return `Updated ${diffDays} days ago`;
}

export function StorePriceDisplay({
  storePrice,
  isCheapest,
}: StorePriceDisplayProps) {
  if (storePrice.price === null) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-cream-300 p-3">
        <StoreChip
          store={storePrice.storeSlug as "woolworths" | "coles" | "aldi" | "iga"}
        />
        <span className="text-sm text-ink-500">Not available</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border p-3",
        isCheapest
          ? "border-leaf-300/40 bg-leaf-50"
          : "border-cream-200 bg-white",
      )}
    >
      {/* Store chip */}
      <StoreChip
        store={storePrice.storeSlug as "woolworths" | "coles" | "aldi" | "iga"}
      />

      {/* Ticket price */}
      <span className="font-price text-xl font-bold text-ink-900">
        {formatPrice(storePrice.price)}
      </span>

      {/* Unit price */}
      {storePrice.unitPrice !== null && storePrice.unitMeasure !== null && (
        <span className="font-price text-base font-semibold text-ink-500">
          {formatUnitPrice(storePrice.unitPrice, storePrice.unitMeasure)}
        </span>
      )}

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-1">
        {storePrice.isSpecial && !storePrice.isFakeSpecial && (
          <span className="inline-flex items-center rounded-sm bg-tomato-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Special
          </span>
        )}
        {storePrice.isFakeSpecial && (
          <div className="group relative">
            <span className="inline-flex items-center rounded-sm bg-tomato-100 px-2 py-0.5 text-[10px] font-semibold text-tomato-500">
              Not actually a saving
            </span>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-lg border border-cream-200 bg-white px-2.5 py-1.5 text-[10px] text-ink-700 shadow-lg group-hover:block">
              This &quot;special&quot; price is at or above the 60-day average
              price
            </div>
          </div>
        )}
        {isCheapest && (
          <span className="inline-flex items-center rounded-sm bg-leaf-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Cheapest
          </span>
        )}
      </div>

      {/* Last updated */}
      {storePrice.lastUpdated && (
        <span className="text-[10px] text-ink-500">
          {getTimeSinceUpdate(storePrice.lastUpdated)}
        </span>
      )}
    </div>
  );
}
