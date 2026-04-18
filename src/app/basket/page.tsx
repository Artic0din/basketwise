"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BasketSummary } from "@/components/basket-summary";
import { BasketCompareView } from "@/components/basket-compare-view";
import { BasketListView } from "@/components/basket-list-view";
import { useBasket } from "@/lib/basket-store";
import { cn } from "@/lib/utils";

// ─── View Toggle ─────────────────────────────────────────────────

type BasketView = "compare" | "list";

function ViewToggle({
  activeView,
  onChangeView,
}: {
  activeView: BasketView;
  onChangeView: (view: BasketView) => void;
}) {
  return (
    <div className="flex rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={() => onChangeView("compare")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors",
          activeView === "compare"
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-muted",
        )}
      >
        Compare
      </button>
      <button
        type="button"
        onClick={() => onChangeView("list")}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors",
          activeView === "list"
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-muted",
        )}
      >
        List
      </button>
    </div>
  );
}

// ─── Inner Basket Page (needs useSearchParams) ───────────────────

function BasketPageInner() {
  const { items, clearBasket } = useBasket();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawView = searchParams.get("view");
  const activeView: BasketView =
    rawView === "list" ? "list" : "compare";

  function handleChangeView(view: BasketView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h1 className="mt-4 text-2xl font-bold">Your basket is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Add products to your basket to compare prices and find the best deals.
        </p>
        <Link href="/">
          <Button className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Browse Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back to products">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Your Basket</h1>
          <Badge variant="secondary" className="text-xs">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={clearBasket}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Summary card */}
      <div className="mb-6">
        <BasketSummary />
      </div>

      {/* View toggle */}
      <div className="mb-6">
        <ViewToggle
          activeView={activeView}
          onChangeView={handleChangeView}
        />
      </div>

      {/* View content */}
      {activeView === "compare" ? (
        <BasketCompareView />
      ) : (
        <BasketListView />
      )}
    </div>
  );
}

// ─── Main Basket Page ────────────────────────────────────────────

export default function BasketPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Loading basket...
        </div>
      }
    >
      <BasketPageInner />
    </Suspense>
  );
}
