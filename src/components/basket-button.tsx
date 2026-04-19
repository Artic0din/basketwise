"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket } from "@/lib/basket-store";
import { cn } from "@/lib/utils";

/**
 * Floating basket button fixed to the bottom-right corner.
 * Shows item count badge and links to the basket page.
 */
export function BasketButton() {
  const { itemCount } = useBasket();

  if (itemCount === 0) {
    return null;
  }

  return (
    <Link href="/basket" className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg",
          "bg-leaf-500 hover:bg-leaf-600",
          "transition-transform hover:scale-105",
        )}
        aria-label={`View basket with ${itemCount} items`}
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6 text-white" />
          <span
            className={cn(
              "absolute -right-2.5 -top-2.5",
              "flex h-5 min-w-[1.25rem] items-center justify-center",
              "rounded-full bg-white px-1 text-xs font-bold text-leaf-700",
            )}
          >
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        </div>
      </Button>
    </Link>
  );
}
