"use client";

import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBasket, type BasketItem } from "@/lib/basket-store";
import type { StorePrice } from "@/types/product";

interface AddToBasketProps {
  productId: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  stores: StorePrice[];
  /** Render as a compact icon button (for product cards) */
  compact?: boolean;
}

/**
 * Add-to-basket button with quantity controls.
 * Shows "Add to basket" when not in basket, quantity +/- when already added.
 */
export function AddToBasket({
  productId,
  name,
  brand,
  packSize,
  stores,
  compact = false,
}: AddToBasketProps) {
  const { addItem, removeItem, updateQuantity, isInBasket, getItem } =
    useBasket();

  const inBasket = isInBasket(productId);
  const item = getItem(productId);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const newItem: BasketItem = {
      productId,
      name,
      brand,
      packSize,
      quantity: 1,
      assignedStoreId: null,
      stores,
    };
    addItem(newItem);
  }

  function handleIncrement(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (item) {
      updateQuantity(productId, item.quantity + 1);
    }
  }

  function handleDecrement(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (item) {
      if (item.quantity <= 1) {
        removeItem(productId);
      } else {
        updateQuantity(productId, item.quantity - 1);
      }
    }
  }

  if (inBasket && item) {
    if (compact) {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleDecrement}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleIncrement}
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleDecrement}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[2rem] text-center text-lg font-semibold tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={handleIncrement}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <span className="ml-2 flex items-center gap-1 text-sm text-emerald-600">
          <Check className="h-4 w-4" />
          In basket
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={handleAdd}
        aria-label="Add to basket"
      >
        <Plus className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <Button onClick={handleAdd} className="w-full">
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Basket
    </Button>
  );
}
