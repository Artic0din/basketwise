"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Folder, Search, X } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getAllCategories } from "@/lib/search";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECENT_SEARCHES_KEY = "basketwise-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string",
    ).slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const current = getRecentSearches();
    const filtered = current.filter(
      (s) => s.toLowerCase() !== trimmed.toLowerCase(),
    );
    const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // silently ignore
  }
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const categories = React.useMemo(() => getAllCategories(), []);

  React.useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  function navigateToSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function navigateToCategory(category: string) {
    onOpenChange(false);
    router.push(
      `/search?category=${encodeURIComponent(category)}`,
    );
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search for a product..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const input = e.currentTarget;
            navigateToSearch(input.value);
          }
        }}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p>No products found. Press Enter to search.</p>
          </div>
        </CommandEmpty>

        {recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((search) => (
                <CommandItem
                  key={search}
                  value={search}
                  onSelect={() => navigateToSearch(search)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {search}
                </CommandItem>
              ))}
              <CommandItem
                value="clear-recent-searches"
                onSelect={handleClearRecent}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Clear recent searches
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Popular Searches">
          <CommandItem
            value="Milk 2L"
            onSelect={() => navigateToSearch("Milk 2L")}
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            Milk 2L
          </CommandItem>
          <CommandItem
            value="Bread wholemeal"
            onSelect={() => navigateToSearch("Bread wholemeal")}
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            Bread wholemeal
          </CommandItem>
          <CommandItem
            value="Bananas per kg"
            onSelect={() => navigateToSearch("Bananas per kg")}
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            Bananas per kg
          </CommandItem>
          <CommandItem
            value="Free range eggs 12pk"
            onSelect={() => navigateToSearch("Free range eggs 12pk")}
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            Free range eggs 12pk
          </CommandItem>
          <CommandItem
            value="Chicken breast"
            onSelect={() => navigateToSearch("Chicken breast")}
          >
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            Chicken breast
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Categories">
          {categories.map((category) => (
            <CommandItem
              key={category}
              value={`category-${category}`}
              onSelect={() => navigateToCategory(category)}
            >
              <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
              {category}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
