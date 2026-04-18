import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { priceAlerts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const alerts = await db.query.priceAlerts.findMany({
    where: and(
      eq(priceAlerts.userId, user.id),
      eq(priceAlerts.isActive, true),
    ),
    with: {
      product: true,
      store: true,
    },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return NextResponse.json(alerts);
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
    const productId = data["productId"];
    const targetPrice = data["targetPrice"];
    const storeId = data["storeId"];

    if (typeof productId !== "number" || typeof targetPrice !== "number") {
      return NextResponse.json(
        { error: "productId and targetPrice are required" },
        { status: 400 },
      );
    }

    if (targetPrice <= 0) {
      return NextResponse.json(
        { error: "targetPrice must be positive" },
        { status: 400 },
      );
    }

    const inserted = await db
      .insert(priceAlerts)
      .values({
        userId: user.id,
        productId,
        storeId: typeof storeId === "number" ? storeId : null,
        targetPrice: targetPrice.toFixed(2),
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const alertId = request.nextUrl.searchParams.get("id");
  if (!alertId) {
    return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
  }

  const id = parseInt(alertId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
  }

  // Verify ownership
  const alert = await db.query.priceAlerts.findFirst({
    where: and(eq(priceAlerts.id, id), eq(priceAlerts.userId, user.id)),
  });

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  await db
    .update(priceAlerts)
    .set({ isActive: false })
    .where(eq(priceAlerts.id, id));

  return NextResponse.json({ message: "Alert deactivated" });
}
