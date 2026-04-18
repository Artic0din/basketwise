import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { baskets, basketItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userBaskets = await db.query.baskets.findMany({
    where: eq(baskets.userId, user.id),
    with: {
      items: {
        with: {
          product: true,
          assignedStore: true,
        },
      },
    },
    orderBy: (b, { desc }) => [desc(b.updatedAt)],
  });

  return NextResponse.json(userBaskets);
}

interface BasketItemInput {
  productId: number;
  quantity: number;
  assignedStoreId: number | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const name = typeof data["name"] === "string" ? data["name"] : "My Basket";
    const items = Array.isArray(data["items"]) ? data["items"] : [];

    // Create the basket
    const inserted = await db
      .insert(baskets)
      .values({
        userId: user.id,
        name,
      })
      .returning();

    const basket = inserted[0];

    // Insert items if provided
    if (items.length > 0) {
      const validItems = items.filter(
        (item: unknown): item is BasketItemInput =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>)["productId"] === "number" &&
          typeof (item as Record<string, unknown>)["quantity"] === "number",
      );

      if (validItems.length > 0) {
        await db.insert(basketItems).values(
          validItems.map((item) => ({
            basketId: basket.id,
            productId: item.productId,
            quantity: item.quantity,
            assignedStoreId: item.assignedStoreId ?? null,
          })),
        );
      }
    }

    return NextResponse.json(basket, { status: 201 });
  } catch (error) {
    console.error("Create basket error:", error);
    return NextResponse.json(
      { error: "Failed to create basket" },
      { status: 500 },
    );
  }
}
