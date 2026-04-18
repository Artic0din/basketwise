import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getProductById } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
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

    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Product detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
