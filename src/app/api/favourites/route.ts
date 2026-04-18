import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";
import { db } from "@/db/index";
import { favouriteGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const groups = await db.query.favouriteGroups.findMany({
    where: eq(favouriteGroups.userId, user.id),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
    orderBy: (g, { asc }) => [asc(g.sortOrder), asc(g.createdAt)],
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

    const inserted = await db
      .insert(favouriteGroups)
      .values({
        userId: user.id,
        name,
      })
      .returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Create favourite group error:", error);
    return NextResponse.json(
      { error: "Failed to create favourite group" },
      { status: 500 },
    );
  }
}
