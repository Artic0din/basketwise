import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db/index";
import { products, stores, priceRecords } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

// ─── Constants ───────────────────────────────────────────────────

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;
const VALID_STORES = new Set(["coles", "woolworths", "aldi"]);

// ─── Helpers ─────────────────────────────────────────────────────

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseNonNegativeFloat(
  value: string | null,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

// ─── Types ───────────────────────────────────────────────────────

interface SpecialResult {
  productId: number;
  name: string;
  brand: string | null;
  category: string;
  packSize: string | null;
  storeName: string;
  storeSlug: string;
  price: number;
  wasPrice: number | null;
  unitPrice: number | null;
  specialType: string | null;
  discountPercent: number | null;
}

// ─── GET /api/specials ───────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;

    const storeFilter = searchParams.get("store");
    const categoryFilter = searchParams.get("category");
    const minDiscount = parseNonNegativeFloat(
      searchParams.get("minDiscount"),
      0,
    );
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(
      parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    // Validate store filter
    if (storeFilter && !VALID_STORES.has(storeFilter)) {
      return NextResponse.json(
        { error: "Invalid store. Valid values: coles, woolworths, aldi" },
        { status: 400 },
      );
    }

    // Build conditions: is_special = true, most recent date
    const conditions = [
      eq(priceRecords.isSpecial, true),
      eq(
        priceRecords.date,
        sql`(SELECT MAX(pr2.date) FROM price_records pr2 WHERE pr2.is_special = true)`,
      ),
    ];

    if (storeFilter) {
      conditions.push(eq(stores.slug, storeFilter));
    }

    if (categoryFilter) {
      conditions.push(eq(products.category, categoryFilter));
    }

    const whereClause = and(...conditions);

    // Count total matches
    const countResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(priceRecords)
      .innerJoin(products, eq(priceRecords.productId, products.id))
      .innerJoin(stores, eq(priceRecords.storeId, stores.id))
      .where(whereClause);

    const total = countResult[0]?.count ?? 0;

    if (total === 0) {
      return NextResponse.json({
        specials: [],
        total: 0,
        page,
        limit,
      });
    }

    // Fetch specials with product and store info
    const rows = await db
      .select({
        productId: products.id,
        name: products.name,
        brand: products.brand,
        category: products.category,
        packSize: products.packSize,
        storeName: stores.name,
        storeSlug: stores.slug,
        price: priceRecords.price,
        unitPrice: priceRecords.unitPrice,
        specialType: priceRecords.specialType,
        storeId: priceRecords.storeId,
      })
      .from(priceRecords)
      .innerJoin(products, eq(priceRecords.productId, products.id))
      .innerJoin(stores, eq(priceRecords.storeId, stores.id))
      .where(whereClause)
      .orderBy(priceRecords.price)
      .limit(limit)
      .offset(offset);

    // For each special, get the previous non-special price to compute wasPrice
    const specials: SpecialResult[] = [];

    for (const row of rows) {
      const price = parseFloat(row.price);

      // Get the most recent non-special price for this product+store
      const prevPriceResult = await db
        .select({ price: priceRecords.price })
        .from(priceRecords)
        .where(
          and(
            eq(priceRecords.productId, row.productId),
            eq(priceRecords.storeId, row.storeId),
            eq(priceRecords.isSpecial, false),
          ),
        )
        .orderBy(desc(priceRecords.date))
        .limit(1);

      const wasPrice =
        prevPriceResult[0] !== undefined
          ? parseFloat(prevPriceResult[0].price)
          : null;

      const discountPercent =
        wasPrice !== null && wasPrice > 0
          ? Math.round(((wasPrice - price) / wasPrice) * 100)
          : null;

      // Apply minDiscount filter
      if (minDiscount > 0) {
        if (discountPercent === null || discountPercent < minDiscount) {
          continue;
        }
      }

      specials.push({
        productId: row.productId,
        name: row.name,
        brand: row.brand,
        category: row.category,
        packSize: row.packSize,
        storeName: row.storeName,
        storeSlug: row.storeSlug,
        price,
        wasPrice,
        unitPrice: row.unitPrice !== null ? parseFloat(row.unitPrice) : null,
        specialType: row.specialType,
        discountPercent,
      });
    }

    // Sort by discount percentage (biggest savings first)
    specials.sort((a, b) => {
      const aDisc = a.discountPercent ?? 0;
      const bDisc = b.discountPercent ?? 0;
      return bDisc - aDisc;
    });

    return NextResponse.json({
      specials,
      total,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("Specials API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
