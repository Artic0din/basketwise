import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function getStripe(): Stripe {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  return new Stripe(secretKey);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.["userId"];
        if (userId) {
          const id = parseInt(userId, 10);
          if (!isNaN(id)) {
            // Set premium for 1 month (will be renewed by subscription)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 35); // 35 days buffer
            await db
              .update(users)
              .set({
                isPremium: true,
                premiumExpiresAt: expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(users.id, id));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Revoke premium using userId from subscription metadata
        if (subscription.metadata?.["userId"]) {
          const id = parseInt(subscription.metadata["userId"], 10);
          if (!isNaN(id)) {
            await db
              .update(users)
              .set({
                isPremium: false,
                premiumExpiresAt: null,
                updatedAt: new Date(),
              })
              .where(eq(users.id, id));
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceMetadata = invoice.metadata;
        if (invoiceMetadata?.["userId"]) {
          const id = parseInt(invoiceMetadata["userId"], 10);
          if (!isNaN(id)) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 35);
            await db
              .update(users)
              .set({
                isPremium: true,
                premiumExpiresAt: expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(users.id, id));
          }
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
