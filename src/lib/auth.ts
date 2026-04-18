import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

// ─── Constants ────────────────────────────────────────────────────

const SESSION_COOKIE = "basketwise-session";
const MAGIC_LINK_EXPIRY = "15m";
const SESSION_EXPIRY = "30d";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

interface MagicLinkPayload extends JWTPayload {
  email: string;
  purpose: "magic-link";
}

interface SessionPayload extends JWTPayload {
  userId: number;
  email: string;
  purpose: "session";
}

export interface AuthUser {
  id: number;
  email: string;
  isPremium: boolean;
  premiumExpiresAt: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

function getBaseUrl(): string {
  const url = process.env["NEXT_PUBLIC_BASE_URL"];
  if (url) return url;
  // Fallback for local dev
  return "http://localhost:3000";
}

// ─── Magic Link ───────────────────────────────────────────────────

/**
 * Generate a magic link URL containing a signed JWT.
 * The token expires in 15 minutes.
 */
export async function generateMagicLink(email: string): Promise<string> {
  const token = await new SignJWT({ email, purpose: "magic-link" } satisfies MagicLinkPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MAGIC_LINK_EXPIRY)
    .sign(getJwtSecret());

  return `${getBaseUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;
}

/**
 * Verify a magic link token and return the email address.
 * Throws if the token is invalid or expired.
 */
export async function verifyMagicLink(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const data = payload as MagicLinkPayload;

  if (data.purpose !== "magic-link") {
    throw new Error("Invalid token purpose");
  }

  if (!data.email || typeof data.email !== "string") {
    throw new Error("Invalid token: missing email");
  }

  return data.email;
}

// ─── Session ──────────────────────────────────────────────────────

/**
 * Create or upsert a user by email, then generate a session JWT
 * and set it as an httpOnly cookie.
 */
export async function createSession(email: string): Promise<AuthUser> {
  // Upsert user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let user: typeof existing[0];

  if (existing.length > 0) {
    user = existing[0];
  } else {
    const inserted = await db
      .insert(users)
      .values({ email })
      .returning();
    user = inserted[0];
  }

  // Generate session JWT
  const sessionToken = await new SignJWT({
    userId: user.id,
    email: user.email,
    purpose: "session",
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getJwtSecret());

  // Set httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return {
    id: user.id,
    email: user.email,
    isPremium: user.isPremium,
    premiumExpiresAt: user.premiumExpiresAt,
  };
}

/**
 * Validate the session cookie from a NextRequest.
 * Returns the authenticated user or null.
 */
export async function validateSession(
  request: NextRequest,
): Promise<AuthUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const data = payload as SessionPayload;

    if (data.purpose !== "session") return null;
    if (typeof data.userId !== "number" || typeof data.email !== "string") {
      return null;
    }

    // Fetch fresh user data (premium status may have changed)
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    const user = result[0];
    if (!user) return null;

    // Check premium expiry
    const isPremium =
      user.isPremium &&
      (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

    return {
      id: user.id,
      email: user.email,
      isPremium,
      premiumExpiresAt: user.premiumExpiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Validate session from the cookies() API (for server components / route handlers
 * that don't have the NextRequest object).
 */
export async function validateSessionFromCookies(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const data = payload as SessionPayload;

    if (data.purpose !== "session") return null;
    if (typeof data.userId !== "number" || typeof data.email !== "string") {
      return null;
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    const user = result[0];
    if (!user) return null;

    const isPremium =
      user.isPremium &&
      (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

    return {
      id: user.id,
      email: user.email,
      isPremium,
      premiumExpiresAt: user.premiumExpiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
