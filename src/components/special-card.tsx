"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBasket, type BasketItem } from "@/lib/basket-store";
import { cn } from "@/lib/utils";
import { STORE_COLOURS } from "@/types/product";

// ─── Types ───────────────────────────────────────────────────────

export interface SpecialData {
  productId: number;
  name: string;
  brand: string | null;
  category: string;
  packSize: string | null;
  storeName: string;
  storeSlug: string;
  price: number;
  wasPrice: number | null;
  unitPrice: number | null;
  specialType: string | null;
  discountPercent: number | null;
}

// ─── Discount Badge ──────────────────────────────────────────────

function DiscountBadge({ percent }: { percent: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white",
        percent >= 50 ? "bg-leaf-600" : "bg-[var(--bw-amber-500)]",
      )}
    >
      -{percent}%
    </span>
  );
}

// ─── Special Type Badge ──────────────────────────────────────────

function SpecialTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {type}
    </span>
  );
}

// ─── Special Card ────────────────────────────────────────────────

export function SpecialCard({ special }: { special: SpecialData }) {
  const { addItem, isInBasket } = useBasket();
  const inBasket = isInBasket(special.productId);

  const colours = STORE_COLOURS[special.storeSlug] ?? {
    pill: "bg-gray-600 text-white",
  };

  function handleAdd() {
    const item: BasketItem = {
      productId: special.productId,
      name: special.name,
      brand: special.brand,
      packSize: special.packSize,
      quantity: 1,
      assignedStoreId: null,
      stores: [
        {
          storeSlug: special.storeSlug as "coles" | "woolworths" | "aldi",
          storeName: special.storeName,
          price: special.price,
          unitPrice: special.unitPrice,
          unitMeasure: null,
          isSpecial: true,
          isFakeSpecial: false,
          lastUpdated: new Date(),
        },
      ],
    };
    addItem(item);
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Top row: store pill + discount badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              colours.pill,
            )}
          >
            {special.storeName}
          </span>
          {special.discountPercent !== null && special.discountPercent > 0 && (
            <DiscountBadge percent={Math.round(special.discountPercent)} />
          )}
        </div>

        {/* Product info */}
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 mb-1">
          {special.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
          {[special.brand, special.packSize].filter(Boolean).join(" - ")}
        </p>

        {/* Special type */}
        {special.specialType && (
          <div className="mb-2">
            <SpecialTypeBadge type={special.specialType} />
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold tabular-nums">
            ${special.price.toFixed(2)}
          </span>
          {special.wasPrice !== null && special.wasPrice > special.price && (
            <span className="text-sm text-muted-foreground line-through tabular-nums">
              ${special.wasPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Add to basket */}
        <Button
          variant={inBasket ? "secondary" : "default"}
          size="sm"
          className="w-full"
          onClick={handleAdd}
          disabled={inBasket}
        >
          {inBasket ? (
            "In Basket"
          ) : (
            <>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add to Basket
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
