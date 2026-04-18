import type { ProductWithPrices, CategoryCount } from "@/types/product";

/**
 * Mock product data for development and build verification.
 * In production, these functions will query the database via Drizzle.
 */
const MOCK_PRODUCTS: ProductWithPrices[] = [
  {
    id: 1,
    name: "Full Cream Milk 2L",
    brand: "Dairy Farmers",
    packSize: "2L",
    category: "Dairy",
    imageUrl: null,
    storePrices: [
      {
        storeSlug: "coles",
        storeName: "Coles",
        price: 3.5,
        unitPrice: 1.75,
        unitMeasure: "per L",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "woolworths",
        storeName: "Woolworths",
        price: 3.4,
        unitPrice: 1.7,
        unitMeasure: "per L",
        isSpecial: true,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "aldi",
        storeName: "Aldi",
        price: 2.99,
        unitPrice: 1.495,
        unitMeasure: "per L",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
    ],
  },
  {
    id: 2,
    name: "Wholemeal Bread 700g",
    brand: "Tip Top",
    packSize: "700g",
    category: "Bakery",
    imageUrl: null,
    storePrices: [
      {
        storeSlug: "coles",
        storeName: "Coles",
        price: 3.8,
        unitPrice: 0.54,
        unitMeasure: "per 100g",
        isSpecial: true,
        isFakeSpecial: true,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "woolworths",
        storeName: "Woolworths",
        price: 4.0,
        unitPrice: 0.57,
        unitMeasure: "per 100g",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "aldi",
        storeName: "Aldi",
        price: null,
        unitPrice: null,
        unitMeasure: null,
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: null,
      },
    ],
  },
  {
    id: 3,
    name: "Free Range Eggs 12pk",
    brand: "Sunny Queen",
    packSize: "12 pack",
    category: "Dairy",
    imageUrl: null,
    storePrices: [
      {
        storeSlug: "coles",
        storeName: "Coles",
        price: 6.5,
        unitPrice: 0.54,
        unitMeasure: "per egg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "woolworths",
        storeName: "Woolworths",
        price: 6.0,
        unitPrice: 0.5,
        unitMeasure: "per egg",
        isSpecial: true,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "aldi",
        storeName: "Aldi",
        price: 5.49,
        unitPrice: 0.46,
        unitMeasure: "per egg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
    ],
  },
  {
    id: 4,
    name: "Chicken Breast 500g",
    brand: null,
    packSize: "500g",
    category: "Meat",
    imageUrl: null,
    storePrices: [
      {
        storeSlug: "coles",
        storeName: "Coles",
        price: 9.0,
        unitPrice: 18.0,
        unitMeasure: "per kg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "woolworths",
        storeName: "Woolworths",
        price: 8.5,
        unitPrice: 17.0,
        unitMeasure: "per kg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "aldi",
        storeName: "Aldi",
        price: 7.99,
        unitPrice: 15.98,
        unitMeasure: "per kg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
    ],
  },
  {
    id: 5,
    name: "Bananas per kg",
    brand: null,
    packSize: "per kg",
    category: "Fruit & Veg",
    imageUrl: null,
    storePrices: [
      {
        storeSlug: "coles",
        storeName: "Coles",
        price: 3.9,
        unitPrice: 3.9,
        unitMeasure: "per kg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "woolworths",
        storeName: "Woolworths",
        price: 3.5,
        unitPrice: 3.5,
        unitMeasure: "per kg",
        isSpecial: true,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
      {
        storeSlug: "aldi",
        storeName: "Aldi",
        price: 3.29,
        unitPrice: 3.29,
        unitMeasure: "per kg",
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: new Date(),
      },
    ],
  },
];

/** Search products by query string with optional category filter. */
export function searchProducts(
  query: string,
  category?: string,
): ProductWithPrices[] {
  const normalised = query.toLowerCase().trim();

  let results = MOCK_PRODUCTS;

  if (normalised) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(normalised) ||
        (p.brand && p.brand.toLowerCase().includes(normalised)) ||
        p.category.toLowerCase().includes(normalised),
    );
  }

  if (category) {
    results = results.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    );
  }

  return results;
}

/** Get all categories with product counts from the current search results. */
export function getCategoryCounts(
  products: ProductWithPrices[],
): CategoryCount[] {
  const counts = new Map<string, number>();

  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/** Get all unique categories (for suggestions in search dialog). */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const product of MOCK_PRODUCTS) {
    categories.add(product.category);
  }
  return Array.from(categories).sort();
}
