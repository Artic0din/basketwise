import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { searchProducts } from "@/lib/queries";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

function sanitizeQuery(raw: string): string {
  // Trim and limit length to prevent abuse
  return raw.trim().slice(0, 200);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;

    const rawQuery = searchParams.get("q");
    if (!rawQuery || rawQuery.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 },
      );
    }

    const query = sanitizeQuery(rawQuery);
    const category = searchParams.get("category") || null;
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(
      parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const result = await searchProducts(query, category, page, limit);

    return NextResponse.json({
      products: result.products,
      total: result.total,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
