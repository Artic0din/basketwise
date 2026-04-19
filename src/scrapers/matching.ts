/**
 * Shared fuzzy matching utilities and category mapping for all scraper providers.
 *
 * The matching strategy:
 * 1. Strip store names, size/quantity words, and brand prefixes
 * 2. Extract "core" product-type words
 * 3. Match on core-word overlap with a low threshold (30%) OR >= 2 matching core words
 */

/** Map search terms to product categories for auto-creation. */
export const SEARCH_TERM_CATEGORIES: Record<string, string> = {
  milk: "Dairy",
  cheese: "Dairy",
  yoghurt: "Dairy",
  butter: "Dairy",
  bread: "Bread & Bakery",
  chicken: "Meat",
  beef: "Meat",
  sausages: "Meat",
  bacon: "Meat",
  banana: "Fruit & Veg",
  potato: "Fruit & Veg",
  tomato: "Fruit & Veg",
  pasta: "Pantry",
  rice: "Pantry",
  cereal: "Pantry",
  juice: "Drinks",
  water: "Drinks",
  coffee: "Drinks",
  chips: "Snacks",
  chocolate: "Snacks",
  frozen: "Frozen",
  "ice cream": "Frozen",
  detergent: "Cleaning",
  dishwashing: "Cleaning",
  nappies: "Baby & Personal",
  shampoo: "Baby & Personal",
};

/**
 * Regex pattern matching size/quantity words that should be stripped before matching.
 * Covers patterns like: 2L, 500g, 1kg, 100ml, 12 Pack, 6pk, 750mL, etc.
 */
const SIZE_PATTERN =
  /\b\d+\s*(?:l|ml|g|kg|pk|pack|ea|ct|count|litre|litres|liter|liters|gram|grams|sheets|rolls|capsules|tablets|serve|serves)\b/gi;

/** Numeric-only words like "100", "2", "500" that are often sizes */
const BARE_NUMBER_PATTERN = /\b\d+\b/g;

/** Store brand names to strip from both sides */
const STORE_NAMES_PATTERN =
  /\b(?:coles|woolworths|woolies|aldi|macro|gold|essentials|homebrand|select)\b/gi;

/**
 * Normalise a product name for fuzzy matching.
 * Strips store branding, size/quantity words, lowercases, removes non-alpha.
 */
export function normaliseForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(STORE_NAMES_PATTERN, "")
    .replace(SIZE_PATTERN, "")
    .replace(BARE_NUMBER_PATTERN, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract core words from a normalised name, filtering out very short words
 * and common filler words that don't help matching.
 */
function extractCoreWords(normalised: string): string[] {
  const FILLER_WORDS = new Set([
    "the",
    "and",
    "or",
    "a",
    "an",
    "of",
    "in",
    "for",
    "with",
    "no",
    "low",
    "free",
    "lite",
    "style",
    "australian",
    "fresh",
    "natural",
    "original",
    "classic",
    "premium",
    "value",
    "range",
    "brand",
    "own",
  ]);

  return normalised
    .split(" ")
    .filter((w) => w.length >= 2 && !FILLER_WORDS.has(w));
}

/**
 * Score how well a scraped product name matches a target name.
 * Returns a value between 0 (no match) and 1 (perfect match).
 *
 * Uses core-word overlap after stripping sizes, store names, and filler words.
 * Checks match ratio against the SHORTER side to handle asymmetric names well.
 * e.g., "Full Cream Milk" (target) vs "Coles Full Cream Milk 2L" (scraped)
 *   -> normalised scraped: "full cream milk", target: "full cream milk" -> 1.0
 */
export function matchScore(scraped: string, target: string): number {
  const normScraped = normaliseForMatching(scraped);
  const normTarget = normaliseForMatching(target);

  if (normScraped === normTarget) return 1.0;

  const scrapedWords = extractCoreWords(normScraped);
  const targetWords = extractCoreWords(normTarget);

  if (targetWords.length === 0 || scrapedWords.length === 0) return 0;

  const scrapedSet = new Set(scrapedWords);
  let matchedCount = 0;

  for (const word of targetWords) {
    if (scrapedSet.has(word)) {
      matchedCount++;
    }
  }

  // Use the smaller side as denominator so "Full Cream Milk" matching against
  // "Full Cream Milk 2L Bottle" scores 100%, not 60%
  const denominator = Math.min(targetWords.length, scrapedWords.length);
  const ratio = matchedCount / denominator;

  return ratio;
}

/**
 * Minimum match score threshold.
 * 30% OR at least 2 matching core words qualifies as a match.
 */
const MIN_SCORE = 0.3;
const MIN_MATCHING_WORDS = 2;

/**
 * Check if a match score qualifies, considering both ratio and absolute word count.
 */
export function isQualifyingMatch(
  scraped: string,
  target: string,
): { qualifies: boolean; score: number } {
  const score = matchScore(scraped, target);

  if (score >= MIN_SCORE) {
    return { qualifies: true, score };
  }

  // Fallback: check absolute matching word count
  const normScraped = normaliseForMatching(scraped);
  const normTarget = normaliseForMatching(target);
  const scrapedSet = new Set(extractCoreWords(normScraped));
  const targetCoreWords = extractCoreWords(normTarget);

  let matchedCount = 0;
  for (const word of targetCoreWords) {
    if (scrapedSet.has(word)) {
      matchedCount++;
    }
  }

  if (matchedCount >= MIN_MATCHING_WORDS) {
    return { qualifies: true, score };
  }

  return { qualifies: false, score };
}

/**
 * Derive a category from the search term that found the product.
 */
export function categoryFromSearchTerm(searchTerm: string): string {
  const lower = searchTerm.toLowerCase().trim();
  return SEARCH_TERM_CATEGORIES[lower] ?? "Other";
}
