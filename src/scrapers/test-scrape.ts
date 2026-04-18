/**
 * Quick test script to verify scrapers work against live APIs.
 * Run with: npx tsx src/scrapers/test-scrape.ts
 *
 * All three scrapers now use fetch() -- no browser required.
 */
import { RateLimiter } from "./rate-limiter.js";
import { ColesScraper } from "./coles/scraper.js";
import { WoolworthsScraper } from "./woolworths/scraper.js";
import { AldiScraper, ALDI_CATEGORIES } from "./aldi/scraper.js";

async function main(): Promise<void> {
  console.info("=== BasketWise Scraper Test ===\n");

  const rateLimiter = new RateLimiter(2500);

  // --- Test Coles (API-based, no browser) ---
  console.info("--- Testing Coles: searching for 'full cream milk 2L' ---");
  const colesScraper = new ColesScraper(rateLimiter);
  const colesResults = await colesScraper.searchProducts("full cream milk 2L");
  console.info(`Coles returned ${colesResults.length.toString()} results:`);
  for (const result of colesResults.slice(0, 3)) {
    console.info(
      `  - ${result.name}: $${result.price?.toFixed(2) ?? "N/A"} ` +
        `(unit: ${result.unitPrice != null ? `$${result.unitPrice.toFixed(4)}` : "N/A"} ${result.unitOfMeasure ?? ""}) ` +
        `${result.isSpecial ? `[SPECIAL: ${result.specialType ?? "unknown"}]` : ""}`,
    );
  }

  console.info("");

  // --- Test Woolworths (API-based, session cookies, no browser) ---
  console.info("--- Testing Woolworths: searching for 'full cream milk 2L' ---");
  const woolworthsScraper = new WoolworthsScraper(rateLimiter);
  const woolworthsResults = await woolworthsScraper.searchProducts(
    "full cream milk 2L",
  );
  console.info(
    `Woolworths returned ${woolworthsResults.length.toString()} results:`,
  );
  for (const result of woolworthsResults.slice(0, 3)) {
    console.info(
      `  - ${result.name}: $${result.price?.toFixed(2) ?? "N/A"} ` +
        `(cup: ${result.cupPrice != null ? `$${result.cupPrice.toFixed(4)}` : "N/A"} ${result.cupMeasure ?? ""}) ` +
        `${result.isOnSpecial ? "[SPECIAL]" : ""}` +
        `${result.isHalfPrice ? " [HALF PRICE]" : ""}`,
    );
  }

  console.info("");

  // --- Test Aldi (SSR NUXT_DATA parsing, no browser, no prices) ---
  console.info("--- Testing Aldi: fetching dairy-eggs-fridge/milk category ---");
  console.info(
    "NOTE: Aldi prices are NOT available from SSR data (requires authenticated API)",
  );
  const aldiScraper = new AldiScraper(rateLimiter);
  const aldiResults = await aldiScraper.fetchCategoryPage(ALDI_CATEGORIES[0]);
  console.info(
    `Aldi returned ${aldiResults.length.toString()} product names (prices deferred):`,
  );
  for (const result of aldiResults.slice(0, 5)) {
    console.info(
      `  - ${result.name}: price=${result.price?.toFixed(2) ?? "N/A (deferred)"}` +
        ` category=${result.category ?? "unknown"}`,
    );
  }

  console.info("\n=== Test complete ===");
}

main().catch((err: unknown) => {
  console.error("Test failed:", err);
  process.exit(1);
});
