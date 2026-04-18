import type { BasketItem } from "@/lib/basket-store";
// ─── Types ─────────────────────────────────────────────────────────

export interface StoreTotal {
  storeSlug: string;
  storeName: string;
  total: number;
  /** Number of items available at this store */
  availableCount: number;
}

export interface AssignedItem {
  productId: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  quantity: number;
  assignedStoreSlug: string;
  assignedStoreName: string;
  price: number;
  lineTotal: number;
}

export interface StoreBreakdown {
  storeSlug: string;
  storeName: string;
  itemCount: number;
  subtotal: number;
  items: AssignedItem[];
}

export interface OptimisationResult {
  /** Total if buying everything at one store (each store option) */
  singleStoreTotals: StoreTotal[];
  /** Cheapest single-store total (only counting stores that have ALL items) */
  cheapestSingleStoreTotal: number | null;
  /** Mix-and-match: cheapest per item across all stores */
  mixAndMatch: {
    items: AssignedItem[];
    total: number;
  };
  /** Savings: cheapest single store minus mix-and-match */
  savings: number;
  /** Items grouped by assigned store */
  storeBreakdown: StoreBreakdown[];
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Find the cheapest available price for a basket item.
 * Respects manual store assignment via assignedStoreId.
 */
function findCheapestPrice(
  item: BasketItem,
): { price: number; storeSlug: string; storeName: string } | null {
  // If user manually assigned a store, use that store's price
  if (item.assignedStoreId !== null) {
    const assigned = item.stores.find(
      (sp) => sp.storeSlug === getSlugFromId(item.assignedStoreId),
    );
    if (assigned?.price !== null && assigned?.price !== undefined) {
      return {
        price: assigned.price,
        storeSlug: assigned.storeSlug,
        storeName: assigned.storeName,
      };
    }
  }

  // Otherwise find the cheapest available price
  let cheapest: { price: number; storeSlug: string; storeName: string } | null =
    null;

  for (const sp of item.stores) {
    if (sp.price !== null && (cheapest === null || sp.price < cheapest.price)) {
      cheapest = {
        price: sp.price,
        storeSlug: sp.storeSlug,
        storeName: sp.storeName,
      };
    }
  }

  return cheapest;
}

/**
 * Get store slug from assignedStoreId.
 * Maps numeric store IDs to slugs (1=coles, 2=woolworths, 3=aldi).
 */
function getSlugFromId(storeId: number | null): string | null {
  if (storeId === null) return null;
  const storeSlugMap: Record<number, string> = { 1: "coles", 2: "woolworths", 3: "aldi" };
  return storeSlugMap[storeId] ?? null;
}

/**
 * Get the price for a specific item at a specific store.
 */
function getPriceAtStore(item: BasketItem, storeSlug: string): number | null {
  const sp = item.stores.find((s) => s.storeSlug === storeSlug);
  return sp?.price ?? null;
}

// ─── Optimiser ─────────────────────────────────────────────────────

/**
 * Pure function: optimises a basket for minimum cost.
 * No side effects, no React dependencies.
 */
export function optimiseBasket(items: BasketItem[]): OptimisationResult {
  if (items.length === 0) {
    return {
      singleStoreTotals: [],
      cheapestSingleStoreTotal: null,
      mixAndMatch: { items: [], total: 0 },
      savings: 0,
      storeBreakdown: [],
    };
  }

  const allStoreSlugs = ["coles", "woolworths", "aldi"] as const;
  const storeNameMap: Record<string, string> = {
    coles: "Coles",
    woolworths: "Woolworths",
    aldi: "Aldi",
  };

  // ── Single-store totals ───────────────────────────────────────
  const singleStoreTotals: StoreTotal[] = allStoreSlugs.map((slug) => {
    let total = 0;
    let availableCount = 0;

    for (const item of items) {
      const price = getPriceAtStore(item, slug);
      if (price !== null) {
        total += price * item.quantity;
        availableCount++;
      }
    }

    return {
      storeSlug: slug,
      storeName: storeNameMap[slug],
      total: Math.round(total * 100) / 100,
      availableCount,
    };
  });

  // Cheapest single store that has ALL items
  const totalItemCount = items.length;
  const fullCoverageStores = singleStoreTotals.filter(
    (st) => st.availableCount === totalItemCount,
  );
  const cheapestSingleStoreTotal =
    fullCoverageStores.length > 0
      ? Math.min(...fullCoverageStores.map((st) => st.total))
      : null;

  // ── Mix-and-match optimisation ────────────────────────────────
  const assignedItems: AssignedItem[] = [];

  for (const item of items) {
    const cheapest = findCheapestPrice(item);
    if (cheapest) {
      const lineTotal = Math.round(cheapest.price * item.quantity * 100) / 100;
      assignedItems.push({
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        packSize: item.packSize,
        quantity: item.quantity,
        assignedStoreSlug: cheapest.storeSlug,
        assignedStoreName: cheapest.storeName,
        price: cheapest.price,
        lineTotal,
      });
    }
  }

  const mixAndMatchTotal =
    Math.round(
      assignedItems.reduce((sum, ai) => sum + ai.lineTotal, 0) * 100,
    ) / 100;

  // ── Savings calculation ───────────────────────────────────────
  const savings =
    cheapestSingleStoreTotal !== null
      ? Math.round((cheapestSingleStoreTotal - mixAndMatchTotal) * 100) / 100
      : 0;

  // ── Store breakdown ───────────────────────────────────────────
  const breakdownMap = new Map<string, StoreBreakdown>();

  for (const ai of assignedItems) {
    const existing = breakdownMap.get(ai.assignedStoreSlug);
    if (existing) {
      existing.itemCount += 1;
      existing.subtotal =
        Math.round((existing.subtotal + ai.lineTotal) * 100) / 100;
      existing.items.push(ai);
    } else {
      breakdownMap.set(ai.assignedStoreSlug, {
        storeSlug: ai.assignedStoreSlug,
        storeName: ai.assignedStoreName,
        itemCount: 1,
        subtotal: ai.lineTotal,
        items: [ai],
      });
    }
  }

  const storeBreakdown = Array.from(breakdownMap.values()).sort(
    (a, b) => b.subtotal - a.subtotal,
  );

  return {
    singleStoreTotals,
    cheapestSingleStoreTotal,
    mixAndMatch: { items: assignedItems, total: mixAndMatchTotal },
    savings,
    storeBreakdown,
  };
}

// ─── Store ID mapping (exported for use in components) ─────────

export const STORE_ID_MAP: Record<string, number> = {
  coles: 1,
  woolworths: 2,
  aldi: 3,
};

export const STORE_SLUG_MAP: Record<number, string> = {
  1: "coles",
  2: "woolworths",
  3: "aldi",
};
