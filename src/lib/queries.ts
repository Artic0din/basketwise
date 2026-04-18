import { db } from "@/db/index";
import {
  products,
  stores,
  priceRecords,
} from "@/db/schema";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────

export interface StorePriceInfo {
  storeId: number;
  storeName: string;
  storeSlug: string;
  price: string;
  unitPrice: string | null;
  unitMeasure: string | null;
  isSpecial: boolean;
  specialType: string | null;
  isFakeSpecial: boolean;
  lastUpdated: string;
}

export interface ProductSearchResult {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  packSize: string | null;
  unitOfMeasure: string | null;
  stores: StorePriceInfo[];
}

export interface CategoryCount {
  name: string;
  count: number;
}

// ─── Queries ───────────────────────────────────────────────────────

/**
 * Search products by name with optional category filter.
 * Uses SQL ILIKE for case-insensitive matching.
 */
export async function searchProducts(
  query: string,
  category: string | null,
  page: number,
  limit: number,
): Promise<{ products: ProductSearchResult[]; total: number }> {
  const offset = (page - 1) * limit;
  const searchPattern = `%${query}%`;

  const conditions = [ilike(products.name, searchPattern)];
  if (category) {
    conditions.push(eq(products.category, category));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  // Count total matches
  const countResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(products)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  if (total === 0) {
    return { products: [], total: 0 };
  }

  // Fetch matching products
  const matchedProducts = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(products.name)
    .limit(limit)
    .offset(offset);

  const productIds = matchedProducts.map((p) => p.id);

  if (productIds.length === 0) {
    return { products: [], total };
  }

  // Get store prices for matched products
  const storePrices = await getLatestPrices(productIds);

  const results: ProductSearchResult[] = matchedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    packSize: p.packSize,
    unitOfMeasure: p.unitOfMeasure,
    stores: storePrices.get(p.id) ?? [],
  }));

  return { products: results, total };
}

/**
 * Get a single product by ID with all store prices.
 */
export async function getProductById(
  id: number,
): Promise<ProductSearchResult | null> {
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  const product = result[0];
  if (!product) {
    return null;
  }

  const storePrices = await getLatestPrices([product.id]);

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    packSize: product.packSize,
    unitOfMeasure: product.unitOfMeasure,
    stores: storePrices.get(product.id) ?? [],
  };
}

/**
 * Get all distinct categories with product counts.
 */
export async function getCategories(): Promise<CategoryCount[]> {
  const result = await db
    .select({
      name: products.category,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(products)
    .groupBy(products.category)
    .orderBy(products.category);

  return result;
}

/**
 * Batch query: get latest PriceRecord per product per store,
 * with fake-special detection based on 60-day trailing average.
 */
export async function getLatestPrices(
  productIds: number[],
): Promise<Map<number, StorePriceInfo[]>> {
  if (productIds.length === 0) {
    return new Map();
  }

  // Get the latest price record per product/store combination
  // using a lateral join pattern via subquery
  const latestPrices = await db
    .select({
      productId: priceRecords.productId,
      storeId: priceRecords.storeId,
      price: priceRecords.price,
      unitPrice: priceRecords.unitPrice,
      unitMeasure: priceRecords.unitMeasure,
      isSpecial: priceRecords.isSpecial,
      specialType: priceRecords.specialType,
      date: priceRecords.date,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(priceRecords)
    .innerJoin(stores, eq(priceRecords.storeId, stores.id))
    .where(
      and(
        inArray(priceRecords.productId, productIds),
        eq(
          priceRecords.date,
          sql`(
            SELECT MAX(pr2.date)
            FROM price_records pr2
            WHERE pr2.product_id = ${priceRecords.productId}
              AND pr2.store_id = ${priceRecords.storeId}
          )`,
        ),
      ),
    )
    .orderBy(priceRecords.productId, priceRecords.storeId);

  // Compute 60-day trailing averages for fake-special detection
  const sixtyDayAvg = await db
    .select({
      productId: priceRecords.productId,
      storeId: priceRecords.storeId,
      avgPrice: sql<string>`cast(avg(cast(${priceRecords.price} as numeric)) as numeric(10,2))`,
      recordCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(priceRecords)
    .where(
      and(
        inArray(priceRecords.productId, productIds),
        sql`${priceRecords.date} >= current_date - interval '60 days'`,
      ),
    )
    .groupBy(priceRecords.productId, priceRecords.storeId);

  // Build avg lookup: "productId-storeId" -> { avgPrice, recordCount }
  const avgLookup = new Map<string, { avgPrice: number; recordCount: number }>();
  for (const row of sixtyDayAvg) {
    const key = `${row.productId}-${row.storeId}`;
    avgLookup.set(key, {
      avgPrice: parseFloat(row.avgPrice),
      recordCount: row.recordCount,
    });
  }

  // Group by product ID
  const result = new Map<number, StorePriceInfo[]>();
  for (const row of latestPrices) {
    const key = `${row.productId}-${row.storeId}`;
    const avg = avgLookup.get(key);
    const currentPrice = parseFloat(row.price);

    // A special is "fake" if:
    // 1. It's marked as a special
    // 2. We have at least 7 records in the 60-day window (enough data)
    // 3. The current price >= the 60-day average (not actually cheaper)
    let isFakeSpecial = false;
    if (row.isSpecial && avg && avg.recordCount >= 7) {
      isFakeSpecial = currentPrice >= avg.avgPrice;
    }

    const storePriceInfo: StorePriceInfo = {
      storeId: row.storeId,
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      price: row.price,
      unitPrice: row.unitPrice,
      unitMeasure: row.unitMeasure,
      isSpecial: row.isSpecial,
      specialType: row.specialType,
      isFakeSpecial,
      lastUpdated: row.date,
    };

    const existing = result.get(row.productId);
    if (existing) {
      existing.push(storePriceInfo);
    } else {
      result.set(row.productId, [storePriceInfo]);
    }
  }

  return result;
}

// ─── Price History Types ──────────────────────────────────────────

export interface PriceHistoryRecord {
  date: string;
  storeId: number;
  storeSlug: string;
  storeName: string;
  price: string;
  unitPrice: string | null;
  isSpecial: boolean;
}

export interface PriceHistoryDay {
  date: string;
  stores: Array<{
    storeId: number;
    storeSlug: string;
    price: string;
    unitPrice: string | null;
    isSpecial: boolean;
  }>;
}

export interface PriceStoreStats {
  min: number;
  avg: number;
  max: number;
  trailingAvg60d: number | null;
}

export interface PriceHistoryResponse {
  productId: number;
  period: string;
  history: PriceHistoryDay[];
  stats: Record<string, PriceStoreStats>;
  isFakeSpecial: Record<string, boolean>;
}

// ─── Price History Queries ────────────────────────────────────────

/**
 * Compute trailing average over a window of prices.
 * Returns null if there are no prices.
 */
export function computeTrailingAverage(
  prices: number[],
  windowDays: number,
): number | null {
  if (prices.length === 0) return null;
  const window = prices.slice(-windowDays);
  if (window.length === 0) return null;
  const sum = window.reduce((acc, p) => acc + p, 0);
  return sum / window.length;
}

/**
 * Get raw price history records for a product within a period.
 */
export async function getPriceHistory(
  productId: number,
  periodDays: number | null,
): Promise<PriceHistoryRecord[]> {
  const conditions = [eq(priceRecords.productId, productId)];

  if (periodDays !== null) {
    conditions.push(
      sql`${priceRecords.date} >= current_date - interval '1 day' * ${periodDays}`,
    );
  }

  const whereClause =
    conditions.length === 1 ? conditions[0] : and(...conditions);

  const records = await db
    .select({
      date: priceRecords.date,
      storeId: priceRecords.storeId,
      storeSlug: stores.slug,
      storeName: stores.name,
      price: priceRecords.price,
      unitPrice: priceRecords.unitPrice,
      isSpecial: priceRecords.isSpecial,
    })
    .from(priceRecords)
    .innerJoin(stores, eq(priceRecords.storeId, stores.id))
    .where(whereClause)
    .orderBy(priceRecords.date, priceRecords.storeId);

  return records;
}

/**
 * Get min/avg/max per store for a product within a period.
 */
export async function getPriceStats(
  productId: number,
  periodDays: number | null,
): Promise<Record<string, PriceStoreStats>> {
  const conditions = [eq(priceRecords.productId, productId)];

  if (periodDays !== null) {
    conditions.push(
      sql`${priceRecords.date} >= current_date - interval '1 day' * ${periodDays}`,
    );
  }

  const whereClause =
    conditions.length === 1 ? conditions[0] : and(...conditions);

  const statsRows = await db
    .select({
      storeSlug: stores.slug,
      minPrice:
        sql<string>`cast(min(cast(${priceRecords.price} as numeric)) as numeric(10,2))`,
      avgPrice:
        sql<string>`cast(avg(cast(${priceRecords.price} as numeric)) as numeric(10,2))`,
      maxPrice:
        sql<string>`cast(max(cast(${priceRecords.price} as numeric)) as numeric(10,2))`,
    })
    .from(priceRecords)
    .innerJoin(stores, eq(priceRecords.storeId, stores.id))
    .where(whereClause)
    .groupBy(stores.slug);

  // Get 60-day trailing averages
  const trailingRows = await db
    .select({
      storeSlug: stores.slug,
      avgPrice:
        sql<string>`cast(avg(cast(${priceRecords.price} as numeric)) as numeric(10,2))`,
    })
    .from(priceRecords)
    .innerJoin(stores, eq(priceRecords.storeId, stores.id))
    .where(
      and(
        eq(priceRecords.productId, productId),
        sql`${priceRecords.date} >= current_date - interval '60 days'`,
      ),
    )
    .groupBy(stores.slug);

  const trailingLookup = new Map<string, number>();
  for (const row of trailingRows) {
    trailingLookup.set(row.storeSlug, parseFloat(row.avgPrice));
  }

  const result: Record<string, PriceStoreStats> = {};
  for (const row of statsRows) {
    result[row.storeSlug] = {
      min: parseFloat(row.minPrice),
      avg: parseFloat(row.avgPrice),
      max: parseFloat(row.maxPrice),
      trailingAvg60d: trailingLookup.get(row.storeSlug) ?? null,
    };
  }

  return result;
}

/**
 * Build the full price history response for a product.
 */
export async function buildPriceHistoryResponse(
  productId: number,
  period: string,
): Promise<PriceHistoryResponse> {
  const periodDays = period === "1m" ? 30 : period === "3m" ? 90 : null;

  const [records, stats] = await Promise.all([
    getPriceHistory(productId, periodDays),
    getPriceStats(productId, periodDays),
  ]);

  // Group records by date
  const dateMap = new Map<string, PriceHistoryDay>();
  for (const record of records) {
    let day = dateMap.get(record.date);
    if (!day) {
      day = { date: record.date, stores: [] };
      dateMap.set(record.date, day);
    }
    day.stores.push({
      storeId: record.storeId,
      storeSlug: record.storeSlug,
      price: record.price,
      unitPrice: record.unitPrice,
      isSpecial: record.isSpecial,
    });
  }

  const history = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Detect fake specials: latest special price >= 60-day average
  const isFakeSpecial: Record<string, boolean> = {};
  for (const [storeSlug, storeStats] of Object.entries(stats)) {
    if (storeStats.trailingAvg60d === null) {
      isFakeSpecial[storeSlug] = false;
      continue;
    }

    // Find the latest record for this store
    const latestForStore = [...records]
      .filter((r) => r.storeSlug === storeSlug)
      .sort((a, b) => b.date.localeCompare(a.date));

    const latest = latestForStore[0];
    if (latest && latest.isSpecial) {
      isFakeSpecial[storeSlug] =
        parseFloat(latest.price) >= storeStats.trailingAvg60d;
    } else {
      isFakeSpecial[storeSlug] = false;
    }
  }

  return {
    productId,
    period,
    history,
    stats,
    isFakeSpecial,
  };
}
