import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STORE_COLOURS, type StorePrice } from "@/types/product";

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
  const colours = STORE_COLOURS[storePrice.storeSlug] ?? {
    bg: "bg-gray-600",
    text: "text-gray-600",
    pill: "bg-gray-600 text-white",
  };

  if (storePrice.price === null) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 p-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            colours.pill,
          )}
        >
          {storePrice.storeName}
        </span>
        <span className="text-sm text-muted-foreground">Not available</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border p-3",
        isCheapest && "bg-emerald-50 border-emerald-200",
      )}
    >
      {/* Store pill */}
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          colours.pill,
        )}
      >
        {storePrice.storeName}
      </span>

      {/* Ticket price */}
      <span className="text-xl font-bold tabular-nums">
        {formatPrice(storePrice.price)}
      </span>

      {/* Unit price — equal visual weight (key differentiator) */}
      {storePrice.unitPrice !== null && storePrice.unitMeasure !== null && (
        <span className="text-base font-semibold text-muted-foreground tabular-nums">
          {formatUnitPrice(storePrice.unitPrice, storePrice.unitMeasure)}
        </span>
      )}

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-1">
        {storePrice.isSpecial && !storePrice.isFakeSpecial && (
          <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px]">
            Special
          </Badge>
        )}
        {storePrice.isFakeSpecial && (
          <div className="group relative">
            <Badge className="bg-rose-600 text-white hover:bg-rose-700 text-[10px]">
              Not actually a saving
            </Badge>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-48 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg group-hover:block">
              This &quot;special&quot; price is at or above the 60-day average
              price
            </div>
          </div>
        )}
      </div>

      {/* Last updated */}
      {storePrice.lastUpdated && (
        <span className="text-[10px] text-muted-foreground">
          {getTimeSinceUpdate(storePrice.lastUpdated)}
        </span>
      )}
    </div>
  );
}
