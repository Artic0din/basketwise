"use client";

import * as React from "react";
import { TrendingDown } from "lucide-react";

interface SavingsData {
  totalSavings: number;
  basketCount: number;
  since: string | null;
}

export function SavingsTracker() {
  const [data, setData] = React.useState<SavingsData | null>(null);
  const [displayAmount, setDisplayAmount] = React.useState(0);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) {
          setIsAuthenticated(true);
          return fetch("/api/savings").then((sr) =>
            sr.ok ? (sr.json() as Promise<SavingsData>) : null,
          );
        }
        return null;
      })
      .then((savingsData) => {
        if (savingsData) {
          setData(savingsData);
        }
      })
      .catch(() => {
        // Not authenticated or error
      });
  }, []);

  // Animated counter
  React.useEffect(() => {
    if (!data || data.totalSavings === 0) return;

    const target = data.totalSavings;
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      current = Math.min(current + increment, target);
      setDisplayAmount(Math.round(current * 100) / 100);

      if (step >= steps) {
        setDisplayAmount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [data]);

  if (!isAuthenticated || !data || data.totalSavings === 0) {
    return null;
  }

  const sinceDate = data.since ? new Date(data.since) : null;
  const sinceLabel = sinceDate
    ? sinceDate.toLocaleDateString("en-AU", {
        month: "short",
        year: "numeric",
      })
    : "the start";

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-green-50 px-3 py-2 text-sm dark:bg-green-950/30">
      <TrendingDown className="h-4 w-4 text-green-600" />
      <span>
        You&apos;ve saved{" "}
        <strong className="text-green-600">
          ${displayAmount.toFixed(2)}
        </strong>{" "}
        across {data.basketCount} basket{data.basketCount !== 1 ? "s" : ""} since{" "}
        {sinceLabel}
      </span>
    </div>
  );
}
