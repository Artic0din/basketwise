"use client";

import Link from "next/link";
import { Copy, Minus, Plus, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBasket } from "@/lib/basket-store";
import {
  optimiseBasket,
  STORE_ID_MAP,
} from "@/lib/basket-optimiser";
import { cn } from "@/lib/utils";
import { STORE_COLOURS } from "@/types/product";

// ─── Store Name Map ──────────────────────────────────────────────

const STORE_NAME_MAP: Record<string, string> = {
  coles: "Coles",
  woolworths: "Woolworths",
  aldi: "Aldi",
};

// ─── Store Pill Dropdown ─────────────────────────────────────────

interface StorePillDropdownProps {
  productId: number;
  currentStoreSlug: string;
  availableStoreSlugs: string[];
  onSelect: (productId: number, storeId: number) => void;
}

function StorePillDropdown({
  productId,
  currentStoreSlug,
  availableStoreSlugs,
  onSelect,
}: StorePillDropdownProps) {
  const colours = STORE_COLOURS[currentStoreSlug] ?? {
    pill: "bg-gray-600 text-white",
  };

  return (
    <select
      value={currentStoreSlug}
      onChange={(e) => {
        const slug = e.target.value;
        const storeId = STORE_ID_MAP[slug];
        if (storeId !== undefined) {
          onSelect(productId, storeId);
        }
      }}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold appearance-none cursor-pointer",
        "border-0 outline-none focus:ring-2 focus:ring-offset-1",
        colours.pill,
      )}
      aria-label="Select store"
    >
      {availableStoreSlugs.map((slug) => (
        <option key={slug} value={slug}>
          {STORE_NAME_MAP[slug] ?? slug}
        </option>
      ))}
    </select>
  );
}

// ─── Savings Delta ───────────────────────────────────────────────

interface SavingsDeltaProps {
  productId: number;
  currentStoreSlug: string;
  stores: { storeSlug: string; price: number | null }[];
}

function SavingsDelta({ currentStoreSlug, stores }: SavingsDeltaProps) {
  const currentStorePrice = stores.find(
    (s) => s.storeSlug === currentStoreSlug,
  )?.price;

  if (currentStorePrice === null || currentStorePrice === undefined) return null;

  // Find cheapest alternative
  let cheapest: { slug: string; price: number } | null = null;
  for (const s of stores) {
    if (s.price !== null && s.storeSlug !== currentStoreSlug) {
      if (cheapest === null || s.price < cheapest.price) {
        cheapest = { slug: s.storeSlug, price: s.price };
      }
    }
  }

  if (!cheapest) return null;

  const delta = currentStorePrice - cheapest.price;
  if (delta <= 0) return null;

  return (
    <span className="text-xs text-emerald-600 font-medium">
      Save ${delta.toFixed(2)} at {STORE_NAME_MAP[cheapest.slug] ?? cheapest.slug}
    </span>
  );
}

// ─── Compare Item Row ────────────────────────────────────────────

interface CompareItemRowProps {
  productId: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
  assignedStoreSlug: string;
  availableStoreSlugs: string[];
  stores: { storeSlug: string; price: number | null }[];
}

function CompareItemRow({
  productId,
  name,
  brand,
  packSize,
  quantity,
  price,
  lineTotal,
  assignedStoreSlug,
  availableStoreSlugs,
  stores,
}: CompareItemRowProps) {
  const { updateQuantity, removeItem, setStore } = useBasket();

  return (
    <div className="flex items-center gap-3 py-3 border-b border-muted last:border-b-0">
      <div className="flex-1 min-w-0">
        <Link
          href={`/product/${productId}`}
          className="text-sm font-medium hover:underline line-clamp-1"
        >
          {name}
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {[brand, packSize].filter(Boolean).join(" - ")}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <StorePillDropdown
            productId={productId}
            currentStoreSlug={assignedStoreSlug}
            availableStoreSlugs={availableStoreSlugs}
            onSelect={setStore}
          />
          <SavingsDelta
            productId={productId}
            currentStoreSlug={assignedStoreSlug}
            stores={stores}
          />
        </div>
        {/* Price comparison across stores */}
        <div className="mt-1 flex gap-3 flex-wrap">
          {stores
            .filter((s) => s.price !== null)
            .map((s) => (
              <span
                key={s.storeSlug}
                className={cn(
                  "text-xs tabular-nums",
                  s.storeSlug === assignedStoreSlug
                    ? "font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {STORE_NAME_MAP[s.storeSlug] ?? s.storeSlug}: ${s.price?.toFixed(2)}
              </span>
            ))}
        </div>
      </div>

      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">
          ${price.toFixed(2)}
        </span>
        {quantity > 1 && (
          <span className="block text-xs text-muted-foreground">each</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() =>
            quantity <= 1
              ? removeItem(productId)
              : updateQuantity(productId, quantity - 1)
          }
          aria-label="Decrease quantity"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
          {quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => updateQuantity(productId, quantity + 1)}
          aria-label="Increase quantity"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="w-16 text-right">
        <span className="text-sm font-bold tabular-nums">
          ${lineTotal.toFixed(2)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => removeItem(productId)}
        aria-label="Remove item"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Export Shopping List ─────────────────────────────────────────

function exportShoppingList(
  storeBreakdown: { storeName: string; items: { name: string; quantity: number; price: number }[] }[],
): string {
  const lines: string[] = [];
  for (const group of storeBreakdown) {
    lines.push(`--- ${group.storeName} ---`);
    for (const item of group.items) {
      lines.push(`  ${item.quantity}x ${item.name} - $${item.price.toFixed(2)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

// ─── Compare View ────────────────────────────────────────────────

export function BasketCompareView() {
  const { items } = useBasket();
  const result = useMemo(() => optimiseBasket(items), [items]);

  const availableStoresMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of items) {
      const slugs = item.stores
        .filter((sp) => sp.price !== null)
        .map((sp) => sp.storeSlug);
      map.set(String(item.productId), slugs);
    }
    return map;
  }, [items]);

  const storesMap = useMemo(() => {
    const map = new Map<number, { storeSlug: string; price: number | null }[]>();
    for (const item of items) {
      map.set(
        item.productId,
        item.stores.map((sp) => ({ storeSlug: sp.storeSlug, price: sp.price })),
      );
    }
    return map;
  }, [items]);

  async function handleCopyList() {
    const text = exportShoppingList(result.storeBreakdown);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API not available -- fail silently
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleCopyList}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy Shopping List
        </Button>
      </div>

      {result.storeBreakdown.map((group) => {
        const colours = STORE_COLOURS[group.storeSlug] ?? {
          bg: "bg-gray-600",
          text: "text-gray-600",
          pill: "bg-gray-600 text-white",
        };

        return (
          <Card key={group.storeSlug}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                      colours.pill,
                    )}
                  >
                    {group.storeName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.itemCount} {group.itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <CardTitle className="text-base tabular-nums">
                  ${group.subtotal.toFixed(2)}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {group.items.map((ai) => (
                <CompareItemRow
                  key={ai.productId}
                  productId={ai.productId}
                  name={ai.name}
                  brand={ai.brand}
                  packSize={ai.packSize}
                  quantity={ai.quantity}
                  price={ai.price}
                  lineTotal={ai.lineTotal}
                  assignedStoreSlug={ai.assignedStoreSlug}
                  availableStoreSlugs={
                    availableStoresMap.get(String(ai.productId)) ?? [
                      ai.assignedStoreSlug,
                    ]
                  }
                  stores={storesMap.get(ai.productId) ?? []}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Single-store comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Single-Store Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {result.singleStoreTotals.map((st) => {
              const colours = STORE_COLOURS[st.storeSlug] ?? {
                text: "text-gray-600",
              };
              const allAvailable = st.availableCount === items.length;

              return (
                <div
                  key={st.storeSlug}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", colours.text)}>
                      {st.storeName}
                    </span>
                    {!allAvailable && (
                      <span className="text-xs text-muted-foreground">
                        ({st.availableCount}/{items.length} items)
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      allAvailable ? "" : "text-muted-foreground",
                    )}
                  >
                    ${st.total.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
