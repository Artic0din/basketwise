"use client";

import * as React from "react";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";

interface AuthUser {
  id: number;
  email: string;
  isPremium: boolean;
  premiumExpiresAt: string | null;
}

const FREE_FEATURES = [
  "Compare prices across Coles, Woolworths, Aldi",
  "Build and optimise baskets",
  "View price history (30 days)",
  "Fake special detection",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited price alerts",
  "Extended price history (all time)",
  "Favourite product groups",
  "Savings tracker dashboard",
  "Server-synced baskets",
  "Priority scraping frequency",
  "Export basket to shopping list",
];

export default function PremiumPage() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const isSuccess = searchParams?.get("success") === "true";
  const isCancelled = searchParams?.get("cancelled") === "true";

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as AuthUser;
          setUser(data);
        }
      })
      .catch(() => {
        // Not authenticated
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = React.useCallback(async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      if (response.ok) {
        const data = (await response.json()) as { url: string | null };
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch {
      // Silently fail
    } finally {
      setCheckoutLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {isSuccess && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
          <p className="font-semibold">Welcome to BasketWise Premium!</p>
          <p className="text-sm">
            Your subscription is now active. Enjoy all premium features.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
          <p>Checkout was cancelled. You can upgrade anytime.</p>
        </div>
      )}

      <div className="mb-8 text-center">
        <Crown className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
        <h1 className="text-3xl font-bold">BasketWise Premium</h1>
        <p className="mt-2 text-muted-foreground">
          Get the most out of your grocery shopping with premium features.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Free tier */}
        <div className="rounded-lg border p-6">
          <h2 className="mb-1 text-xl font-semibold">Free</h2>
          <p className="mb-4 text-2xl font-bold">
            $0<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Premium tier */}
        <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50/50 p-6 dark:bg-yellow-950/10">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-xl font-semibold">Premium</h2>
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="mb-4 text-2xl font-bold">
            $2.99<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="mb-6 space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                {feature}
              </li>
            ))}
          </ul>
          {user?.isPremium ? (
            <div className="rounded-lg bg-green-100 px-4 py-2 text-center text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
              You are a Premium member
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? "Redirecting..."
                : user
                  ? "Upgrade for $2.99/month"
                  : "Sign in to upgrade"}
            </Button>
          )}
        </div>
      </div>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={() => {
          setShowAuthDialog(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
