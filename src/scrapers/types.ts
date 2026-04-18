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

/** Store-agnostic contract every scraper provider must implement. */
export interface PriceProvider {
  readonly storeName: string;
  readonly storeSlug: string;
  fetchPrices(
    storeProducts: StoreProductRow[],
  ): Promise<(ScrapedPrice | null)[]>;
}

/** Aggregate stats returned after a scrape run. */
export interface ScrapeResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  durationMs: number;
}
