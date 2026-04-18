"use client";

import { useMemo } from "react";
import { Store, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useBasket } from "@/lib/basket-store";
import { optimiseBasket } from "@/lib/basket-optimiser";
import { cn } from "@/lib/utils";

/**
 * Basket summary card showing key optimisation numbers:
 * total cost, savings from splitting, and number of stores.
 */
export function BasketSummary() {
  const { items } = useBasket();

  const result = useMemo(() => optimiseBasket(items), [items]);

  if (items.length === 0) {
    return null;
  }

  const storeCount = result.storeBreakdown.length;
  const hasSavings = result.savings > 0;

  return (
    <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
      <CardContent className="p-4 sm:p-6">
        {/* Hero savings text */}
        {hasSavings && (
          <div className="mb-4 flex items-center gap-2 text-emerald-700">
            <TrendingDown className="h-5 w-5" />
            <span className="text-sm font-semibold sm:text-base">
              You save{" "}
              <span
                className={cn(
                  "text-lg font-bold tabular-nums sm:text-xl",
                  "transition-all duration-300",
                )}
              >
                ${result.savings.toFixed(2)}
              </span>{" "}
              by splitting across stores
            </span>
          </div>
        )}

        {/* Three key numbers */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {/* Mix-and-match total */}
          <div className="flex flex-col items-center gap-1 text-center">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums sm:text-xl">
              ${result.mixAndMatch.total.toFixed(2)}
            </span>
          </div>

          {/* Savings */}
          <div className="flex flex-col items-center gap-1 text-center">
            <TrendingDown
              className={cn(
                "h-4 w-4",
                hasSavings ? "text-emerald-600" : "text-muted-foreground",
              )}
            />
            <span className="text-xs text-muted-foreground">Savings</span>
            <span
              className={cn(
                "text-lg font-bold tabular-nums sm:text-xl",
                hasSavings ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              ${result.savings.toFixed(2)}
            </span>
          </div>

          {/* Store count */}
          <div className="flex flex-col items-center gap-1 text-center">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Stores</span>
            <span className="text-lg font-bold tabular-nums sm:text-xl">
              {storeCount}
            </span>
          </div>
        </div>

        {/* Cheapest single-store comparison */}
        {result.cheapestSingleStoreTotal !== null && (
          <div className="mt-3 border-t border-emerald-200 pt-3">
            <p className="text-xs text-muted-foreground text-center">
              Cheapest single store:{" "}
              <span className="font-semibold tabular-nums">
                ${result.cheapestSingleStoreTotal.toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
