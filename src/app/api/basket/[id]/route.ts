import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { baskets, basketItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const basketId = parseInt(id, 10);
  if (isNaN(basketId)) {
    return NextResponse.json({ error: "Invalid basket ID" }, { status: 400 });
  }

  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, user.id)),
    with: {
      items: {
        with: {
          product: true,
          assignedStore: true,
        },
      },
    },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  return NextResponse.json(basket);
}

interface BasketItemInput {
  productId: number;
  quantity: number;
  assignedStoreId: number | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const basketId = parseInt(id, 10);
  if (isNaN(basketId)) {
    return NextResponse.json({ error: "Invalid basket ID" }, { status: 400 });
  }

  // Verify ownership
  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, user.id)),
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const items = Array.isArray(data["items"]) ? data["items"] : null;

    if (items !== null) {
      // Delete existing items and re-insert
      await db.delete(basketItems).where(eq(basketItems.basketId, basketId));

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
            basketId,
            productId: item.productId,
            quantity: item.quantity,
            assignedStoreId: item.assignedStoreId ?? null,
          })),
        );
      }
    }

    // Update timestamp
    await db
      .update(baskets)
      .set({ updatedAt: new Date() })
      .where(eq(baskets.id, basketId));

    return NextResponse.json({ message: "Basket updated" });
  } catch (error) {
    console.error("Update basket error:", error);
    return NextResponse.json(
      { error: "Failed to update basket" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const basketId = parseInt(id, 10);
  if (isNaN(basketId)) {
    return NextResponse.json({ error: "Invalid basket ID" }, { status: 400 });
  }

  // Verify ownership before delete
  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, user.id)),
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  // Cascade delete handles basket items
  await db.delete(baskets).where(eq(baskets.id, basketId));

  return NextResponse.json({ message: "Basket deleted" });
}
