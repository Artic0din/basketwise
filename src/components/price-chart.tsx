"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PriceStats } from "@/components/price-stats";
import type { PriceHistoryResponse } from "@/lib/queries";

// ─── Constants ────────────────────────────────────────────────────

const STORE_CHART_COLOURS: Record<string, string> = {
  coles: "#dc2626",
  woolworths: "#16a34a",
  aldi: "#2563eb",
};

const TRAILING_AVG_COLOUR = "#9ca3af";

type Period = "1m" | "3m" | "all";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "all", label: "All" },
];

// ─── Types ────────────────────────────────────────────────────────

interface ChartDataPoint {
  date: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface PriceChartProps {
  productId: number;
}

interface CustomTooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload: ChartDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadEntry[];
  label?: string;
}

// ─── Helper ───────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-AU", { month: "short" });
  return `${day} ${month}`;
}

// ─── Component ────────────────────────────────────────────────────

function PriceTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1.5 text-sm font-semibold">
        {label ? formatDateLabel(label) : ""}
      </p>
      {payload.map((entry) => {
        const isTrailingAvg = entry.dataKey.endsWith("_avg60d");
        const storeName = isTrailingAvg
          ? entry.name
          : entry.name;

        return (
          <div
            key={entry.dataKey}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{storeName}:</span>
            <span className="font-medium tabular-nums">
              ${entry.value.toFixed(2)}
            </span>
            {!isTrailingAvg &&
              entry.payload[`${entry.dataKey}_special`] !== undefined && (
                <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                  Special
                </span>
              )}
          </div>
        );
      })}
    </div>
  );
}

export function PriceChart({ productId }: PriceChartProps) {
  const [period, setPeriod] = useState<Period>("3m");
  const [data, setData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/products/${productId}/history?period=${p}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch price history (${res.status})`);
      }
      const json = (await res.json()) as PriceHistoryResponse;
      setData(json);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load price history";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void fetchHistory(period);
  }, [period, fetchHistory]);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
  }

  // Derive store slugs from the data
  const storeSlugs = data
    ? Array.from(
        new Set(
          data.history.flatMap((day) =>
            day.stores.map((s) => s.storeSlug),
          ),
        ),
      ).sort()
    : [];

  // Transform history into flat chart data
  const chartData: ChartDataPoint[] = data
    ? data.history.map((day) => {
        const point: ChartDataPoint = { date: day.date };
        for (const store of day.stores) {
          point[store.storeSlug] = parseFloat(store.price);
          point[`${store.storeSlug}_special`] = store.isSpecial
            ? true
            : undefined;
        }
        // Add trailing averages
        for (const slug of storeSlugs) {
          const trailing = data.stats[slug]?.trailingAvg60d;
          if (trailing !== null && trailing !== undefined) {
            point[`${slug}_avg60d`] = trailing;
          }
        }
        return point;
      })
    : [];

  // Compute store display names
  const storeNames: Record<string, string> = {};
  if (data) {
    for (const day of data.history) {
      for (const store of day.stores) {
        if (!storeNames[store.storeSlug]) {
          storeNames[store.storeSlug] =
            store.storeSlug.charAt(0).toUpperCase() +
            store.storeSlug.slice(1);
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Period toggles */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Period:
        </span>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      {loading && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            Loading price history...
          </p>
        </div>
      )}

      {error && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-destructive/30">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            No price history available for this period.
          </p>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip content={<PriceTooltip />} />
            <Legend />

            {/* Store price lines */}
            {storeSlugs.map((slug) => (
              <Line
                key={slug}
                type="monotone"
                dataKey={slug}
                name={storeNames[slug] ?? slug}
                stroke={STORE_CHART_COLOURS[slug] ?? "#6b7280"}
                strokeWidth={2}
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, payload } = props as {
                    cx: number;
                    cy: number;
                    payload: ChartDataPoint;
                  };
                  const isSpecial = payload[`${slug}_special`] === true;
                  if (!isSpecial) return <circle key={`${slug}-${cx}`} r={0} />;
                  return (
                    <circle
                      key={`${slug}-special-${cx}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={STORE_CHART_COLOURS[slug] ?? "#6b7280"}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                connectNulls
              />
            ))}

            {/* 60-day trailing average lines (dashed) */}
            {storeSlugs
              .filter(
                (slug) =>
                  data?.stats[slug]?.trailingAvg60d !== null &&
                  data?.stats[slug]?.trailingAvg60d !== undefined,
              )
              .map((slug) => (
                <Line
                  key={`${slug}_avg60d`}
                  type="monotone"
                  dataKey={`${slug}_avg60d`}
                  name={`${storeNames[slug] ?? slug} 60d Avg`}
                  stroke={TRAILING_AVG_COLOUR}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Price statistics table */}
      {!loading && !error && data && Object.keys(data.stats).length > 0 && (
        <PriceStats stats={data.stats} />
      )}
    </div>
  );
}
