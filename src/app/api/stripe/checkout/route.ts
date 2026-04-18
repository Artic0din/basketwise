import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { validateSession } from "@/lib/auth";

function getStripe(): Stripe {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  return new Stripe(secretKey);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.isPremium) {
    return NextResponse.json(
      { error: "You are already a premium member" },
      { status: 400 },
    );
  }

  const priceId = process.env["STRIPE_PRICE_ID"];
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/premium?success=true`,
      cancel_url: `${baseUrl}/premium?cancelled=true`,
      client_reference_id: String(user.id),
      customer_email: user.email,
      metadata: {
        userId: String(user.id),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
