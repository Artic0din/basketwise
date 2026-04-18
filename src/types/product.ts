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

/** Store colour configuration. */
export const STORE_COLOURS: Record<
  string,
  { bg: string; text: string; pill: string }
> = {
  coles: {
    bg: "bg-red-600",
    text: "text-red-600",
    pill: "bg-red-600 text-white",
  },
  woolworths: {
    bg: "bg-green-600",
    text: "text-green-600",
    pill: "bg-green-600 text-white",
  },
  aldi: {
    bg: "bg-blue-600",
    text: "text-blue-600",
    pill: "bg-blue-600 text-white",
  },
};
