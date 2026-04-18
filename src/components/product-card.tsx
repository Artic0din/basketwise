import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StorePriceDisplay } from "@/components/store-price";
import type { ProductWithPrices } from "@/types/product";

interface ProductCardProps {
  product: ProductWithPrices;
}

/**
 * Find the cheapest store slug among available prices.
 * Returns null if no prices are available.
 */
function findCheapestStore(
  product: ProductWithPrices,
): string | null {
  let cheapestSlug: string | null = null;
  let cheapestPrice = Infinity;

  for (const sp of product.storePrices) {
    if (sp.price !== null && sp.price < cheapestPrice) {
      cheapestPrice = sp.price;
      cheapestSlug = sp.storeSlug;
    }
  }

  return cheapestSlug;
}

export function ProductCard({ product }: ProductCardProps) {
  const cheapestSlug = findCheapestStore(product);

  // Ensure all three stores are represented in order
  const storeOrder: Array<"coles" | "woolworths" | "aldi"> = [
    "coles",
    "woolworths",
    "aldi",
  ];

  const orderedPrices = storeOrder.map((slug) => {
    const found = product.storePrices.find((sp) => sp.storeSlug === slug);
    return (
      found ?? {
        storeSlug: slug,
        storeName: slug.charAt(0).toUpperCase() + slug.slice(1),
        price: null,
        unitPrice: null,
        unitMeasure: null,
        isSpecial: false,
        isFakeSpecial: false,
        lastUpdated: null,
      }
    );
  });

  return (
    <Link
      href={`/product/${product.id}`}
      className="block transition-shadow hover:shadow-md rounded-lg"
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-tight">
            {product.name}
          </CardTitle>
          <CardDescription>
            {[product.brand, product.packSize].filter(Boolean).join(" - ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Three-store price grid: stacked on mobile, 3 columns on sm+ */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {orderedPrices.map((sp) => (
              <StorePriceDisplay
                key={sp.storeSlug}
                storePrice={sp}
                isCheapest={sp.storeSlug === cheapestSlug}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
