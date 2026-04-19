/** Represents a single store's price for a product. */
export interface StorePrice {
  storeSlug: "coles" | "woolworths" | "aldi";
  storeName: string;
  price: number | null;
  unitPrice: number | null;
  unitMeasure: string | null;
  isSpecial: boolean;
  isFakeSpecial: boolean;
  lastUpdated: Date | null;
}

/** A product with prices from all three stores for display in a product card. */
export interface ProductWithPrices {
  id: number;
  name: string;
  brand: string | null;
  packSize: string | null;
  category: string;
  imageUrl: string | null;
  storePrices: StorePrice[];
}

/** Category with count of products, used in category filter. */
export interface CategoryCount {
  category: string;
  count: number;
}

/** Store colour configuration using BasketWise design system tokens. */
export const STORE_COLOURS: Record<
  string,
  { bg: string; text: string; pill: string }
> = {
  coles: {
    bg: "bg-[var(--store-coles)]",
    text: "text-[var(--store-coles)]",
    pill: "bg-[var(--store-coles)] text-white",
  },
  woolworths: {
    bg: "bg-[var(--store-woolies)]",
    text: "text-[var(--store-woolies)]",
    pill: "bg-[var(--store-woolies)] text-white",
  },
  aldi: {
    bg: "bg-[var(--store-aldi-blue)]",
    text: "text-[var(--store-aldi-blue)]",
    pill: "bg-[var(--store-aldi-blue)] text-white",
  },
  iga: {
    bg: "bg-[var(--store-iga)]",
    text: "text-[var(--store-iga)]",
    pill: "bg-[var(--store-iga)] text-white",
  },
};
