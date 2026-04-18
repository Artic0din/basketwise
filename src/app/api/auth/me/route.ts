import { NextResponse, type NextRequest } from "next/server";
import { validateSession } from "@/lib/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    isPremium: user.isPremium,
    premiumExpiresAt: user.premiumExpiresAt,
  });
}
