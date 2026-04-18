/**
 * Quick test script to verify Playwright scraping works.
 * Run with: npx tsx src/scrapers/test-scrape.ts
 */
import { launchBrowser, closeBrowser } from "./browser.js";
import { RateLimiter } from "./rate-limiter.js";
import { ColesScraper } from "./coles/scraper.js";
import { WoolworthsScraper } from "./woolworths/scraper.js";

async function main(): Promise<void> {
  console.info("=== BasketWise Scraper Test ===\n");

  const browser = await launchBrowser();
  const rateLimiter = new RateLimiter(2500);

  try {
    // Test Coles
    console.info("--- Testing Coles: searching for 'full cream milk 2L' ---");
    const colesScraper = new ColesScraper(browser, rateLimiter);
    const colesResults = await colesScraper.searchProducts("full cream milk 2L");
    console.info(`Coles returned ${colesResults.length} results:`);
    for (const result of colesResults.slice(0, 3)) {
      console.info(
        `  - ${result.name}: $${result.price?.toFixed(2) ?? "N/A"} ` +
          `(unit: ${result.unitPrice != null ? `$${result.unitPrice.toFixed(4)}` : "N/A"} ${result.unitOfMeasure ?? ""}) ` +
          `${result.isSpecial ? `[SPECIAL: ${result.specialType}]` : ""}`,
      );
    }

    console.info("");

    // Test Woolworths
    console.info("--- Testing Woolworths: searching for 'full cream milk 2L' ---");
    const woolworthsScraper = new WoolworthsScraper(browser, rateLimiter);
    const woolworthsResults = await woolworthsScraper.searchProducts("full cream milk 2L");
    console.info(`Woolworths returned ${woolworthsResults.length} results:`);
    for (const result of woolworthsResults.slice(0, 3)) {
      console.info(
        `  - ${result.name}: $${result.price?.toFixed(2) ?? "N/A"} ` +
          `(cup: ${result.cupPrice != null ? `$${result.cupPrice.toFixed(4)}` : "N/A"} ${result.cupMeasure ?? ""}) ` +
          `${result.isOnSpecial ? `[SPECIAL]` : ""}`,
      );
    }

    console.info("\n=== Test complete ===");
  } finally {
    await closeBrowser();
  }
}

main().catch((err: unknown) => {
  console.error("Test failed:", err);
  closeBrowser().catch(() => {});
  process.exit(1);
});
