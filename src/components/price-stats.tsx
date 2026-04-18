"use client";

import { cn } from "@/lib/utils";
import { STORE_COLOURS } from "@/types/product";
import type { PriceStoreStats } from "@/lib/queries";

// ─── Types ────────────────────────────────────────────────────────

interface PriceStatsProps {
  stats: Record<string, PriceStoreStats>;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function getStoreName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

const STORE_ORDER = ["coles", "woolworths", "aldi"];

// ─── Component ────────────────────────────────────────────────────

/**
 * Compact stats table showing min/avg/max per store.
 */
export function PriceStats({ stats }: PriceStatsProps) {
  const orderedSlugs = STORE_ORDER.filter((slug) => slug in stats);

  if (orderedSlugs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Price Statistics
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Store</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Lowest</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Average</th>
              <th className="pb-2 pr-4 font-medium tabular-nums">Highest</th>
              <th className="pb-2 font-medium tabular-nums">60d Avg</th>
            </tr>
          </thead>
          <tbody>
            {orderedSlugs.map((slug) => {
              const s = stats[slug];
              if (!s) return null;

              const colours = STORE_COLOURS[slug] ?? {
                bg: "bg-gray-600",
                text: "text-gray-600",
                pill: "bg-gray-600 text-white",
              };

              return (
                <tr key={slug} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        colours.pill,
                      )}
                    >
                      {getStoreName(slug)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-medium tabular-nums text-emerald-600">
                    {formatPrice(s.min)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatPrice(s.avg)}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-rose-600">
                    {formatPrice(s.max)}
                  </td>
                  <td className="py-2 tabular-nums">
                    {s.trailingAvg60d !== null
                      ? formatPrice(s.trailingAvg60d)
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
