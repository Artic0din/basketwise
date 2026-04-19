import { Suspense } from "react";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { CategoryFilter } from "@/components/category-filter";
import { searchProducts, getCategories } from "@/lib/queries";
import type { ProductSearchResult, StorePriceInfo } from "@/lib/queries";
import type { ProductWithPrices, StorePrice, CategoryCount } from "@/types/product";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

function SearchResultsHeader({
  query,
  count,
}: {
  query: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b">
      <Search className="h-5 w-5 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">
          {query ? (
            <>
              Results for &ldquo;{query}&rdquo;
            </>
          ) : (
            "All Products"
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "product" : "products"} found
        </p>
      </div>
    </div>
  );
}

/** Map StorePriceInfo from queries.ts to StorePrice for ProductCard. */
function mapStorePrice(info: StorePriceInfo): StorePrice {
  return {
    storeSlug: info.storeSlug as "coles" | "woolworths" | "aldi",
    storeName: info.storeName,
    price: info.price ? parseFloat(info.price) : null,
    unitPrice: info.unitPrice ? parseFloat(info.unitPrice) : null,
    unitMeasure: info.unitMeasure,
    isSpecial: info.isSpecial,
    isFakeSpecial: info.isFakeSpecial,
    lastUpdated: info.lastUpdated ? new Date(info.lastUpdated) : null,
  };
}

/** Map ProductSearchResult from queries.ts to ProductWithPrices for ProductCard. */
function mapProduct(result: ProductSearchResult): ProductWithPrices {
  return {
    id: result.id,
    name: result.name,
    brand: result.brand,
    packSize: result.packSize,
    category: result.category,
    imageUrl: result.imageUrl ?? null,
    storePrices: result.stores.map(mapStorePrice),
  };
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h2 className="text-lg font-semibold">No products found</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        {query
          ? `We couldn't find any products matching "${query}". Try a different search term or browse by category.`
          : "Try searching for a product name, brand, or category."}
      </p>
    </div>
  );
}

async function SearchResults({
  query,
  category,
}: {
  query: string;
  category: string;
}) {
  // Query the database for matching products (server component, async is fine)
  const { products: dbResults, total } = await searchProducts(
    query,
    category || null,
    1,
    100,
  );
  const filteredResults = dbResults.map(mapProduct);

  // Fetch all categories with counts from the database
  const dbCategories = await getCategories();
  const categoryCounts: CategoryCount[] = dbCategories.map((c) => ({
    category: c.name,
    count: c.count,
  }));

  // Total count across all categories (for the "All" pill)
  const allCount = categoryCounts.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <SearchResultsHeader query={query} count={total} />

      <div className="flex flex-col gap-6 pt-6 lg:flex-row">
        {/* Category filter: horizontal bar on mobile, sidebar on desktop */}
        {categoryCounts.length > 0 && (
          <aside className="w-full shrink-0 lg:w-56">
            <CategoryFilter
              categories={categoryCounts}
              totalCount={allCount}
            />
          </aside>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {filteredResults.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q ?? "";
  if (query) {
    return {
      title: `Search results for '${query}' - BasketWise`,
      description: `Compare prices for '${query}' across Coles, Woolworths, and Aldi.`,
    };
  }
  return {
    title: "Search Products - BasketWise",
    description:
      "Search and compare grocery prices across Coles, Woolworths, and Aldi.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const category = params.category ?? "";

  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <span className="text-muted-foreground">Searching...</span>
          </div>
        }
      >
        <SearchResults query={query} category={category} />
      </Suspense>
    </div>
  );
}
