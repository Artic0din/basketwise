"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/lib/basket-store";
import { optimiseBasket } from "@/lib/basket-optimiser";
import { cn } from "@/lib/utils";
import { STORE_COLOURS } from "@/types/product";

// ─── Constants ───────────────────────────────────────────────────

const CHECKLIST_STORAGE_KEY = "basketwise-checklist";

// ─── Checklist Persistence ───────────────────────────────────────

function loadChecklist(): Set<number> {
  try {
    const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed as number[]);
      }
    }
  } catch {
    // Corrupt data -- start fresh
  }
  return new Set();
}

function saveChecklist(checked: Set<number>): void {
  try {
    localStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify(Array.from(checked)),
    );
  } catch {
    // Storage full or unavailable
  }
}

// ─── Export Shopping List ─────────────────────────────────────────

function exportCategoryList(
  groups: { category: string; items: { name: string; quantity: number; price: number }[] }[],
): string {
  const lines: string[] = [];
  for (const group of groups) {
    lines.push(`--- ${group.category} ---`);
    for (const item of group.items) {
      lines.push(`  ${item.quantity}x ${item.name} - $${item.price.toFixed(2)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

// ─── List View ───────────────────────────────────────────────────

export function BasketListView() {
  const { items } = useBasket();
  const result = useMemo(() => optimiseBasket(items), [items]);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  // Hydrate checklist from localStorage on mount
  useEffect(() => {
    setChecked(loadChecklist());
  }, []);

  const toggleChecked = useCallback(
    (productId: number) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        saveChecklist(next);
        return next;
      });
    },
    [],
  );

  // Group items by category from original basket items
  const categoryGroups = useMemo(() => {
    // Build a lookup from productId to assigned item for price info
    const assignedMap = new Map(
      result.mixAndMatch.items.map((ai) => [ai.productId, ai]),
    );

    // Build category groups
    const groups = new Map<
      string,
      {
        productId: number;
        name: string;
        quantity: number;
        price: number;
        storeSlug: string;
        storeName: string;
      }[]
    >();

    for (const item of items) {
      // Find the category from the original basket item stores or default
      // Items don't carry category, so we'll group by assigned store
      const assigned = assignedMap.get(item.productId);
      const storeSlug = assigned?.assignedStoreSlug ?? "unknown";
      const storeName = assigned?.assignedStoreName ?? "Unknown";
      const price = assigned?.price ?? 0;

      // Use brand as a rough category proxy -- better than nothing
      const category = item.brand ?? "Other";

      const existing = groups.get(category);
      const entry = {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price,
        storeSlug,
        storeName,
      };
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(category, [entry]);
      }
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryItems]) => ({
        category,
        items: categoryItems.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [items, result.mixAndMatch.items]);

  async function handleCopyList() {
    const text = exportCategoryList(categoryGroups);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard not available
    }
  }

  const checkedCount = items.filter((i) => checked.has(i.productId)).length;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {checkedCount}/{items.length} items
        </span>
        <Button variant="outline" size="sm" onClick={handleCopyList}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy List
        </Button>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-leaf-500 transition-all duration-300"
          style={{
            width: items.length > 0 ? `${(checkedCount / items.length) * 100}%` : "0%",
          }}
        />
      </div>

      {/* Items grouped by category */}
      {categoryGroups.map((group) => (
        <div key={group.category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {group.category}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isChecked = checked.has(item.productId);
              const colours = STORE_COLOURS[item.storeSlug] ?? {
                pill: "bg-gray-600 text-white",
              };

              return (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() => toggleChecked(item.productId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left",
                    "min-h-[44px] touch-manipulation",
                    "transition-colors duration-150",
                    isChecked
                      ? "bg-muted/50 opacity-60"
                      : "bg-background hover:bg-muted/30 active:bg-muted/50",
                  )}
                  aria-label={`${isChecked ? "Uncheck" : "Check"} ${item.name}`}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
                      "transition-colors duration-150",
                      isChecked
                        ? "border-emerald-500 bg-leaf-500 text-white"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {isChecked && <Check className="h-4 w-4" />}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-base font-medium leading-tight",
                        isChecked && "line-through",
                      )}
                    >
                      {item.quantity > 1 && (
                        <span className="font-bold mr-1">{item.quantity}x</span>
                      )}
                      {item.name}
                    </span>
                  </div>

                  {/* Store pill + price */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        colours.pill,
                      )}
                    >
                      {item.storeName}
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
