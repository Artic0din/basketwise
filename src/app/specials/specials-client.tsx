"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SpecialCard, type SpecialData } from "@/components/special-card";

// ─── Filter State ────────────────────────────────────────────────

interface Filters {
  store: string;
  category: string;
  minDiscount: number;
}

const STORE_OPTIONS = [
  { label: "All", value: "" },
  { label: "Coles", value: "coles" },
  { label: "Woolies", value: "woolworths" },
  { label: "Aldi", value: "aldi" },
] as const;

const DISCOUNT_OPTIONS = [
  { label: "All", value: 0 },
  { label: "30%+", value: 30 },
  { label: "50%+", value: 50 },
] as const;

// ─── Specials Client ─────────────────────────────────────────────

interface SpecialsClientProps {
  categories: string[];
}

export function SpecialsClient({ categories }: SpecialsClientProps) {
  const [filters, setFilters] = useState<Filters>({
    store: "",
    category: "",
    minDiscount: 0,
  });
  const [specials, setSpecials] = useState<SpecialData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchSpecials = useCallback(
    async (currentFilters: Filters, currentPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentFilters.store) {
          params.set("store", currentFilters.store);
        }
        if (currentFilters.category) {
          params.set("category", currentFilters.category);
        }
        if (currentFilters.minDiscount > 0) {
          params.set("minDiscount", String(currentFilters.minDiscount));
        }
        params.set("page", String(currentPage));
        params.set("limit", String(limit));

        const res = await fetch(`/api/specials?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to fetch specials");
        }
        const data: { specials: SpecialData[]; total: number } =
          await res.json();
        setSpecials(data.specials);
        setTotal(data.total);
      } catch {
        setSpecials([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchSpecials(filters, page);
  }, [filters, page, fetchSpecials]);

  function handleFilterChange(key: keyof Filters, value: string | number) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Store toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          {STORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange("store", opt.value)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filters.store === opt.value
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Discount threshold */}
        <div className="flex rounded-lg border overflow-hidden">
          {DISCOUNT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange("minDiscount", opt.value)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filters.minDiscount === opt.value
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          Loading specials...
        </div>
      ) : specials.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No specials found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {specials.map((special) => (
              <SpecialCard
                key={`${special.productId}-${special.storeSlug}`}
                special={special}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
