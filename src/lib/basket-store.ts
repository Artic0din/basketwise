"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import React from "react";
import type { StorePrice } from "@/types/product";

// ─── Types ─────────────────────────────────────────────────────────

export interface BasketItem {
  productId: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  quantity: number;
  assignedStoreId: number | null;
  stores: StorePrice[];
}

interface BasketState {
  items: BasketItem[];
}

type BasketAction =
  | { type: "ADD_ITEM"; payload: BasketItem }
  | { type: "REMOVE_ITEM"; payload: { productId: number } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: number; quantity: number } }
  | { type: "SET_STORE"; payload: { productId: number; storeId: number } }
  | { type: "CLEAR_BASKET" }
  | { type: "HYDRATE"; payload: BasketItem[] };

interface BasketContextValue {
  items: BasketItem[];
  addItem: (item: BasketItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  setStore: (productId: number, storeId: number) => void;
  clearBasket: () => void;
  itemCount: number;
  isInBasket: (productId: number) => boolean;
  getItem: (productId: number) => BasketItem | undefined;
}

// ─── Constants ─────────────────────────────────────────────────────

const STORAGE_KEY = "basketwise-basket";

// ─── Reducer ───────────────────────────────────────────────────────

function basketReducer(state: BasketState, action: BasketAction): BasketState {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.items.find(
        (item) => item.productId === action.payload.productId,
      );
      if (exists) {
        // Increment quantity if already in basket
        return {
          items: state.items.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        items: state.items.filter(
          (item) => item.productId !== action.payload.productId,
        ),
      };
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity < 1) {
        return {
          items: state.items.filter(
            (item) => item.productId !== action.payload.productId,
          ),
        };
      }
      return {
        items: state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item,
        ),
      };
    }
    case "SET_STORE":
      return {
        items: state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, assignedStoreId: action.payload.storeId }
            : item,
        ),
      };
    case "CLEAR_BASKET":
      return { items: [] };
    case "HYDRATE":
      return { items: action.payload };
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────

const BasketContext = createContext<BasketContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────

export function BasketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(basketReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dispatch({ type: "HYDRATE", payload: parsed as BasketItem[] });
        }
      }
    } catch {
      // Corrupt localStorage — start fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Storage full or unavailable — silently fail
    }
  }, [state.items]);

  const addItem = useCallback(
    (item: BasketItem) => dispatch({ type: "ADD_ITEM", payload: item }),
    [],
  );

  const removeItem = useCallback(
    (productId: number) =>
      dispatch({ type: "REMOVE_ITEM", payload: { productId } }),
    [],
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } }),
    [],
  );

  const setStore = useCallback(
    (productId: number, storeId: number) =>
      dispatch({ type: "SET_STORE", payload: { productId, storeId } }),
    [],
  );

  const clearBasket = useCallback(
    () => dispatch({ type: "CLEAR_BASKET" }),
    [],
  );

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const isInBasket = useCallback(
    (productId: number) =>
      state.items.some((item) => item.productId === productId),
    [state.items],
  );

  const getItem = useCallback(
    (productId: number) =>
      state.items.find((item) => item.productId === productId),
    [state.items],
  );

  const value: BasketContextValue = {
    items: state.items,
    addItem,
    removeItem,
    updateQuantity,
    setStore,
    clearBasket,
    itemCount,
    isInBasket,
    getItem,
  };

  return React.createElement(BasketContext.Provider, { value }, children);
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useBasket(): BasketContextValue {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error("useBasket must be used within a BasketProvider");
  }
  return context;
}

// ─── Server Sync ──────────────────────────────────────────────────

interface ServerBasketItem {
  productId: number;
  quantity: number;
  assignedStoreId: number | null;
}

/**
 * Migrate localStorage basket to server on login.
 * Creates a new server-side basket with the current localStorage items,
 * then clears localStorage.
 */
export async function syncBasketToServer(): Promise<boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;

    const items: ServerBasketItem[] = (parsed as BasketItem[]).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      assignedStoreId: item.assignedStoreId,
    }));

    const response = await fetch("/api/basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Migrated Basket",
        items,
      }),
    });

    if (response.ok) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Clear local basket display on logout.
 * Server data is retained.
 */
export function clearLocalBasket(): void {
  localStorage.removeItem(STORAGE_KEY);
}
