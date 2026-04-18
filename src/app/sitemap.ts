import type { MetadataRoute } from "next";
import { db } from "@/db/index";
import { products } from "@/db/schema";

const BASE_URL = "https://basketwise.com.au";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/specials`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/basket`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/premium`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const allProducts = await db.select({ id: products.id }).from(products);
    productPages = allProducts.map((p) => ({
      url: `${BASE_URL}/product/${p.id}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — return static pages only
  }

  return [...staticPages, ...productPages];
}
