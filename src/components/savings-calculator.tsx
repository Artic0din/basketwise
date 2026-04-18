"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAVINGS_RATE = 0.12; // 12% average savings from basket splitting
const COFFEE_PRICE = 5.5;
const NIGHT_OUT_PRICE = 80;

export function SavingsCalculator() {
  const [weeklySpend, setWeeklySpend] = React.useState(200);

  const weeklySaving = weeklySpend * SAVINGS_RATE;
  const annualSaving = weeklySaving * 52;
  const coffees = Math.round(annualSaving / COFFEE_PRICE);
  const nightsOut = Math.round(annualSaving / NIGHT_OUT_PRICE);

  return (
    <Card className="border-2">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl sm:text-2xl">
          How much could you save?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slider */}
        <div className="space-y-3">
          <label
            htmlFor="weekly-spend"
            className="block text-center text-sm text-muted-foreground"
          >
            Your weekly grocery spend
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-10 text-right">
              $50
            </span>
            <input
              id="weekly-spend"
              type="range"
              min={50}
              max={500}
              step={10}
              value={weeklySpend}
              onChange={(e) => setWeeklySpend(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-foreground"
            />
            <span className="text-sm text-muted-foreground w-12">$500</span>
          </div>
          <p className="text-center text-2xl font-bold">
            ${weeklySpend}/week
          </p>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-secondary p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              ${weeklySaving.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">saved per week</p>
          </div>
          <div className="rounded-lg bg-secondary p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              ${annualSaving.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">saved per year</p>
          </div>
        </div>

        {/* Fun equivalents */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            That&apos;s{" "}
            <span className="font-semibold text-foreground">{coffees} coffees</span>{" "}
            or{" "}
            <span className="font-semibold text-foreground">
              {nightsOut} nights out
            </span>{" "}
            a year.
          </p>
          <p className="text-xs">
            Based on 12% average savings from basket splitting across stores.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
