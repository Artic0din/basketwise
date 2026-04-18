"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { CategoryCount } from "@/types/product";

interface CategoryFilterProps {
  categories: CategoryCount[];
  totalCount: number;
}

export function CategoryFilter({
  categories,
  totalCount,
}: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";
  const query = searchParams.get("q") ?? "";

  function handleCategoryClick(category: string) {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (category) {
      params.set("category", category);
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <nav aria-label="Category filter">
      {/* Horizontal scrollable bar on mobile, vertical sidebar on lg+ */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
        <button
          onClick={() => handleCategoryClick("")}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground hover:bg-muted border-border",
          )}
        >
          All Categories ({totalCount})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => handleCategoryClick(cat.category)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              activeCategory.toLowerCase() === cat.category.toLowerCase()
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-muted border-border",
            )}
          >
            {cat.category} ({cat.count})
          </button>
        ))}
      </div>
    </nav>
  );
}
