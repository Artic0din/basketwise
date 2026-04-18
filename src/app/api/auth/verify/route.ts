import { NextResponse, type NextRequest } from "next/server";
import { verifyMagicLink, createSession } from "@/lib/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token is required" },
      { status: 400 },
    );
  }

  try {
    const email = await verifyMagicLink(token);
    await createSession(email);

    // Redirect to home page after successful auth
    const redirectUrl = new URL("/", request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Verify error:", error);

    // Redirect to home with error param
    const redirectUrl = new URL("/", request.nextUrl.origin);
    redirectUrl.searchParams.set("auth_error", "invalid_or_expired_link");
    return NextResponse.redirect(redirectUrl);
  }
}
