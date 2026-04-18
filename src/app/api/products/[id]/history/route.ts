import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildPriceHistoryResponse } from "@/lib/queries";

const VALID_PERIODS = new Set(["1m", "3m", "all"]);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "3m";

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be one of: 1m, 3m, all" },
        { status: 400 },
      );
    }

    const data = await buildPriceHistoryResponse(id, period);

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Price history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
