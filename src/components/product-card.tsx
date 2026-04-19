import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { StoreChip } from "@/components/store-chip";
import { cn } from "@/lib/utils";
import type { ProductWithPrices } from "@/types/product";

interface ProductCardProps {
  product: ProductWithPrices;
}

/**
 * Find the cheapest store slug among available prices.
 * Returns null if no prices are available.
 */
function findCheapestStore(product: ProductWithPrices): string | null {
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

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function ProductCard({ product }: ProductCardProps) {
  const cheapestSlug = findCheapestStore(product);

  // Find the cheapest price entry for prominent display
  const cheapestEntry = product.storePrices.find(
    (sp) => sp.storeSlug === cheapestSlug,
  );

  // Build subtitle: brand + pack size
  const subtitle = [product.brand, product.packSize]
    .filter(Boolean)
    .join(" \u00B7 ");

  // Check if the cheapest is on special (genuine, not fake)
  const isOnSpecial = cheapestEntry?.isSpecial && !cheapestEntry?.isFakeSpecial;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block"
    >
      <div
        className={cn(
          "relative grid gap-3 overflow-hidden rounded-lg border border-cream-200 bg-white p-3",
          "bw-transition transition-all",
          "hover:-translate-y-0.5 hover:border-cream-300 hover:shadow-md",
        )}
      >
        {/* Save badge */}
        {isOnSpecial && (
          <span className="absolute right-2 top-2 z-10 inline-flex items-center rounded bg-tomato-500 px-2 py-1 text-[11px] font-semibold leading-none text-white">
            Special
          </span>
        )}

        {/* Product image area */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-cream-200 bg-cream-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-leaf-400">
              <ShoppingCart className="h-12 w-12 opacity-40" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <h4 className="text-[13px] font-medium leading-tight text-ink-900 line-clamp-2">
            {product.name}
          </h4>
          {subtitle && (
            <p className="mt-0.5 text-[11.5px] text-ink-500">{subtitle}</p>
          )}
        </div>

        {/* Price + store row */}
        <div className="flex items-center justify-between gap-2">
          {cheapestEntry?.price !== null && cheapestEntry?.price !== undefined ? (
            <div className="flex items-baseline gap-2">
              <span className="font-price text-base font-bold text-ink-900">
                {formatPrice(cheapestEntry.price)}
              </span>
              {cheapestEntry.unitPrice !== null &&
                cheapestEntry.unitMeasure !== null && (
                  <span className="text-[11px] text-ink-500">
                    ${cheapestEntry.unitPrice.toFixed(2)}{" "}
                    {cheapestEntry.unitMeasure}
                  </span>
                )}
            </div>
          ) : (
            <span className="text-sm text-ink-500">No price available</span>
          )}
        </div>

        {/* Store chip */}
        {cheapestSlug && (
          <div className="flex items-center justify-between gap-2">
            <StoreChip
              store={
                cheapestSlug as "woolworths" | "coles" | "aldi" | "iga"
              }
            />
          </div>
        )}
      </div>
    </Link>
  );
}
