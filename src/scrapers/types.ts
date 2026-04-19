import type { storeProducts } from "../db/schema.js";

/** Row type inferred from the Drizzle StoreProduct table. */
export type StoreProductRow = typeof storeProducts.$inferSelect;

/** A single scraped price observation from a store provider. */
export interface ScrapedPrice {
  productId: number;
  storeId: number;
  price: string;
  unitPrice: string | null;
  unitMeasure: string | null;
  isSpecial: boolean;
  specialType: string | null;
}

/**
 * A product discovered during scraping that did not match any existing
 * canonical product. Used for auto-creation in the database.
 */
export interface DiscoveredProduct {
  /** The full product name as scraped from the store. */
  name: string;
  /** Category derived from the search term that found it. */
  category: string;
  /** Brand name if available from the scraper. */
  brand: string | null;
  /** Package size string, e.g. "2L", "500g". */
  packSize: string | null;
  /** Unit of measure, e.g. "Each", "per litre". */
  unitOfMeasure: string | null;
  /** Price in decimal string format, e.g. "4.50". */
  price: string;
  /** Unit price if available. */
  unitPrice: string | null;
  /** Unit measure if available, e.g. "per litre". */
  unitMeasure: string | null;
  /** Whether the product is currently on special. */
  isSpecial: boolean;
  /** Special type if on special. */
  specialType: string | null;
  /** Product image URL from the store CDN. */
  imageUrl: string | null;
  /** Store-specific SKU/stockcode. */
  storeSku: string | null;
}

/** Result from a provider's fetchPrices call, including discovered products. */
export interface FetchPricesResult {
  /** Matched prices for existing store products. */
  matched: (ScrapedPrice | null)[];
  /** New products discovered that didn't match any existing product. */
  discovered: DiscoveredProduct[];
  /** Map of productId -> imageUrl for matched products that have images. */
  matchedImages: Map<number, string>;
}

/** Store-agnostic contract every scraper provider must implement. */
export interface PriceProvider {
  readonly storeName: string;
  readonly storeSlug: string;
  fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<FetchPricesResult>;
}

/** Aggregate stats returned after a scrape run. */
export interface ScrapeResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  discovered: number;
  durationMs: number;
}
