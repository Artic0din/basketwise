import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ProductDetailPrices } from "@/components/product-detail-prices";
import { ProductDetailBasket } from "@/components/product-detail-basket";
import { PriceChart } from "@/components/price-chart";
import { getProductById } from "@/lib/queries";
import type { Metadata } from "next";

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id) || id < 1) {
    return { title: "Product Not Found - BasketWise" };
  }

  const product = await getProductById(id);
  if (!product) {
    return { title: "Product Not Found - BasketWise" };
  }

  const priceList = product.stores
    .map((s) => `${s.storeName}: $${s.price}`)
    .join(", ");

  const description = priceList
    ? `Compare prices for ${product.name} across Coles, Woolworths, and Aldi. ${priceList}.`
    : `Compare prices for ${product.name} across Coles, Woolworths, and Aldi.`;

  return {
    title: `${product.name} - BasketWise`,
    description,
    openGraph: {
      title: `${product.name} - BasketWise`,
      description,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const id = parseInt(params.id, 10);
  if (Number.isNaN(id) || id < 1) {
    notFound();
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Product header */}
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
              {product.brand && (
                <span className="text-base">{product.brand}</span>
              )}
              {product.brand && product.packSize && (
                <span className="text-muted-foreground/50">-</span>
              )}
              {product.packSize && (
                <span className="text-base">{product.packSize}</span>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            {product.category}
          </Badge>
        </div>
      </div>

      {/* Store prices section */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Store Prices</h2>
        <ProductDetailPrices stores={product.stores} />
      </section>

      {/* Price history */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Price History</h2>
        <PriceChart productId={product.id} />
      </section>

      {/* Add to basket */}
      <div className="sticky bottom-4">
        <ProductDetailBasket
          productId={product.id}
          name={product.name}
          brand={product.brand}
          packSize={product.packSize}
          stores={product.stores}
        />
      </div>
    </div>
  );
}
