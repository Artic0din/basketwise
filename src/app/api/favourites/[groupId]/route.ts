import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { favouriteGroups, favouriteGroupItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

async function getOwnedGroup(userId: number, groupId: number) {
  return db.query.favouriteGroups.findFirst({
    where: and(
      eq(favouriteGroups.id, groupId),
      eq(favouriteGroups.userId, userId),
    ),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId: groupIdStr } = await params;
  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const group = await getOwnedGroup(user.id, groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>)["name"] !== "string"
    ) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const name = ((body as Record<string, unknown>)["name"] as string).trim();
    if (name.length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 1-100 characters" },
        { status: 400 },
      );
    }

    const updated = await db
      .update(favouriteGroups)
      .set({ name })
      .where(eq(favouriteGroups.id, groupId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Update favourite group error:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
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

  const { groupId: groupIdStr } = await params;
  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const group = await getOwnedGroup(user.id, groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Cascade delete handles items
  await db.delete(favouriteGroups).where(eq(favouriteGroups.id, groupId));

  return NextResponse.json({ message: "Group deleted" });
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId: groupIdStr } = await params;
  const groupId = parseInt(groupIdStr, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const group = await getOwnedGroup(user.id, groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>)["productId"] !== "number"
    ) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    const productId = (body as Record<string, unknown>)["productId"] as number;

    const inserted = await db
      .insert(favouriteGroupItems)
      .values({
        groupId,
        productId,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Add favourite item error:", error);
    return NextResponse.json(
      { error: "Failed to add item to group" },
      { status: 500 },
    );
  }
}
