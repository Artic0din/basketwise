import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { generateMagicLink } from "@/lib/auth";

// ─── Rate Limiting ────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_REQUESTS_PER_HOUR = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + ONE_HOUR_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  entry.count += 1;
  return true;
}

// ─── Route Handler ────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("email" in body) ||
      typeof (body as Record<string, unknown>)["email"] !== "string"
    ) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const email = ((body as Record<string, unknown>)["email"] as string)
      .toLowerCase()
      .trim();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Rate limit check
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const magicLinkUrl = await generateMagicLink(email);

    // Send email via Resend
    const resendApiKey = process.env["RESEND_API_KEY"];
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "BasketWise <noreply@basketwise.com.au>",
      to: email,
      subject: "Sign in to BasketWise",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Sign in to BasketWise</h2>
          <p>Click the button below to sign in. This link expires in 15 minutes.</p>
          <a href="${magicLinkUrl}"
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Sign in to BasketWise
          </a>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ message: "Check your email" });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 },
    );
  }
}
