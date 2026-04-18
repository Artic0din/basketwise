import { NextResponse } from "next/server";
import { getCategories } from "@/lib/queries";

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await getCategories();

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
