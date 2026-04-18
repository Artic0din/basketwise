import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { baskets, priceRecords } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Get all user baskets with items
    const userBaskets = await db.query.baskets.findMany({
      where: eq(baskets.userId, user.id),
      with: {
        items: true,
      },
    });

    if (userBaskets.length === 0) {
      return NextResponse.json({
        totalSavings: 0,
        basketCount: 0,
        since: null,
      });
    }

    // Collect all product IDs across all baskets
    const allProductIds = [
      ...new Set(
        userBaskets.flatMap((b) => b.items.map((item) => item.productId)),
      ),
    ];

    if (allProductIds.length === 0) {
      return NextResponse.json({
        totalSavings: 0,
        basketCount: userBaskets.length,
        since: userBaskets[userBaskets.length - 1]?.createdAt ?? null,
      });
    }

    // Get latest prices per product per store
    const latestPrices = await db
      .select({
        productId: priceRecords.productId,
        storeId: priceRecords.storeId,
        price: priceRecords.price,
      })
      .from(priceRecords)
      .where(
        and(
          inArray(priceRecords.productId, allProductIds),
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
      );

    // Build price lookup: productId -> { storeId -> price }
    const priceLookup = new Map<number, Map<number, number>>();
    for (const row of latestPrices) {
      let storePrices = priceLookup.get(row.productId);
      if (!storePrices) {
        storePrices = new Map();
        priceLookup.set(row.productId, storePrices);
      }
      storePrices.set(row.storeId, parseFloat(row.price));
    }

    // Calculate savings per basket:
    // savings = (cheapest single-store total) - (mix-and-match total)
    let totalSavings = 0;

    for (const basket of userBaskets) {
      if (basket.items.length === 0) continue;

      // Per-store totals (single-store shopping)
      const storeTotals = new Map<number, number>();
      // Mix-and-match total (cheapest per item)
      let mixMatchTotal = 0;
      let hasValidPrices = false;

      for (const item of basket.items) {
        const storePrices = priceLookup.get(item.productId);
        if (!storePrices || storePrices.size === 0) continue;

        hasValidPrices = true;
        let cheapestPrice = Infinity;

        for (const [storeId, price] of storePrices) {
          const itemTotal = price * item.quantity;
          storeTotals.set(storeId, (storeTotals.get(storeId) ?? 0) + itemTotal);
          if (price < cheapestPrice) {
            cheapestPrice = price;
          }
        }

        mixMatchTotal += cheapestPrice * item.quantity;
      }

      if (!hasValidPrices) continue;

      // Find cheapest single-store total
      let cheapestStoreTotal = Infinity;
      for (const total of storeTotals.values()) {
        if (total < cheapestStoreTotal) {
          cheapestStoreTotal = total;
        }
      }

      if (cheapestStoreTotal !== Infinity) {
        const savings = cheapestStoreTotal - mixMatchTotal;
        if (savings > 0) {
          totalSavings += savings;
        }
      }
    }

    // Round to 2 decimal places
    totalSavings = Math.round(totalSavings * 100) / 100;

    const oldestBasket = userBaskets.reduce((oldest, b) =>
      b.createdAt < oldest.createdAt ? b : oldest,
    );

    return NextResponse.json({
      totalSavings,
      basketCount: userBaskets.length,
      since: oldestBasket.createdAt,
    });
  } catch (error) {
    console.error("Savings calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate savings" },
      { status: 500 },
    );
  }
}
