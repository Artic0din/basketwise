import { db } from "./index.js";
import { products, stores, storeProducts } from "./schema.js";
import { SEED_PRODUCTS, SEED_STORE_PRODUCTS } from "./seed-products.js";

const STORES = [
  {
    name: "Coles",
    slug: "coles",
    websiteUrl: "https://www.coles.com.au",
  },
  {
    name: "Woolworths",
    slug: "woolworths",
    websiteUrl: "https://www.woolworths.com.au",
  },
  {
    name: "Aldi",
    slug: "aldi",
    websiteUrl: "https://www.aldi.com.au",
  },
] as const;

async function seed(): Promise<void> {
  // ── 1. Seed stores ──────────────────────────────────────────────────
  console.log("Seeding stores...");

  for (const store of STORES) {
    await db
      .insert(stores)
      .values(store)
      .onConflictDoNothing({ target: stores.slug });

    console.log(`  Upserted store: ${store.name}`);
  }

  // ── 2. Seed products ────────────────────────────────────────────────
  console.log("Seeding products...");

  // Check if products already exist (idempotent)
  const existingProducts = await db
    .select({ name: products.name })
    .from(products);
  const existingNames = new Set(existingProducts.map((p) => p.name));

  const newProducts = SEED_PRODUCTS.filter((p) => !existingNames.has(p.name));

  if (newProducts.length > 0) {
    await db.insert(products).values(newProducts);
  }

  console.log(`  Seeded ${SEED_PRODUCTS.length} products`);

  // ── 3. Seed store-product mappings ──────────────────────────────────
  console.log("Seeding store-product mappings...");

  // Build lookup maps: product name -> id, store slug -> id
  const allProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products);
  const productIdByName = new Map(allProducts.map((p) => [p.name, p.id]));

  const allStores = await db
    .select({ id: stores.id, slug: stores.slug })
    .from(stores);
  const storeIdBySlug = new Map(allStores.map((s) => [s.slug, s.id]));

  let mappingCount = 0;

  for (const sp of SEED_STORE_PRODUCTS) {
    const productName = SEED_PRODUCTS[sp.productIndex]?.name;
    if (!productName) {
      console.warn(`  Skipping store product with invalid productIndex: ${String(sp.productIndex)}`);
      continue;
    }

    const productId = productIdByName.get(productName);
    const storeId = storeIdBySlug.get(sp.storeSlug);

    if (!productId || !storeId) {
      console.warn(`  Skipping mapping: product="${productName ?? "unknown"}" store="${sp.storeSlug}" (missing ID)`);
      continue;
    }

    await db
      .insert(storeProducts)
      .values({
        productId,
        storeId,
        storeSku: sp.storeSku,
        storeName: sp.storeName,
      })
      .onConflictDoNothing();

    mappingCount++;
  }

  console.log(`  Seeded ${String(mappingCount)} store-product mappings`);
  console.log(`Seed complete. ${SEED_PRODUCTS.length} products with ${String(mappingCount)} store mappings.`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
