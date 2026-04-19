/**
 * Cross-store product matcher.
 *
 * After scraping both Woolworths and Coles, matches products across stores
 * by normalising brand + product type + package size into a match key.
 * Matched products share a single canonical Product record with separate
 * StoreProduct entries per store.
 */

/** Normalise size strings to a canonical form for comparison. */
function normaliseSize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    // "3 Litre" / "3 Litres" / "3 Liter" / "3 Liters" -> "3l"
    .replace(/(\d+)\s*(?:litre|litres|liter|liters)\b/gi, "$1l")
    // "3000ml" -> "3l" (exact multiples of 1000)
    .replace(/(\d+)ml\b/gi, (_match, num: string) => {
      const ml = parseInt(num, 10);
      if (ml >= 1000 && ml % 1000 === 0) {
        return `${(ml / 1000).toString()}l`;
      }
      return `${num}ml`;
    })
    // "1000g" -> "1kg"
    .replace(/(\d+)g\b/gi, (_match, num: string) => {
      const g = parseInt(num, 10);
      if (g >= 1000 && g % 1000 === 0) {
        return `${(g / 1000).toString()}kg`;
      }
      return `${num}g`;
    })
    // Remove remaining spaces
    .replace(/\s+/g, "");
}

/** Store names to strip from product names before matching. */
const STORE_NAMES_RE =
  /\b(?:coles|woolworths|woolies)\b/gi;

/**
 * Build a normalised match key from brand, product name, and package size.
 * Used to identify the same product across different stores.
 */
export function buildMatchKey(
  brand: string | null,
  name: string,
  packageSize: string | null,
): string {
  const parts: string[] = [];

  if (brand) {
    parts.push(brand.toLowerCase().trim());
  }

  // Clean the product name: strip store branding, normalise whitespace
  const cleanName = name
    .toLowerCase()
    .replace(STORE_NAMES_RE, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  parts.push(cleanName);

  if (packageSize) {
    parts.push(normaliseSize(packageSize));
  }

  return parts.join("|");
}

/** Represents a product from a specific store, ready for cross-matching. */
export interface CrossMatchCandidate {
  /** Original product name from the store. */
  name: string;
  /** Brand if available. */
  brand: string | null;
  /** Package size string if available. */
  packageSize: string | null;
  /** Image URL from the store CDN. */
  imageUrl: string | null;
  /** Which store this came from. */
  storeSlug: "woolworths" | "coles";
  /** Price as decimal string. */
  price: string;
  /** Unit price if available. */
  unitPrice: string | null;
  /** Unit measure if available. */
  unitMeasure: string | null;
  /** Category derived from search term. */
  category: string;
  /** Whether on special. */
  isSpecial: boolean;
  /** Special type. */
  specialType: string | null;
  /** Store-specific SKU. */
  storeSku: string | null;
}

/** Result of cross-matching: grouped by canonical product key. */
export interface CrossMatchResult {
  /** The best canonical name to use for the product. */
  canonicalName: string;
  /** Brand name. */
  brand: string | null;
  /** Package size. */
  packageSize: string | null;
  /** Best image URL (Woolworths preferred, Coles fallback). */
  imageUrl: string | null;
  /** Category. */
  category: string;
  /** Per-store data for creating StoreProduct + PriceRecord entries. */
  storeEntries: CrossMatchCandidate[];
}

/**
 * Run cross-store matching on a pool of candidates from multiple stores.
 *
 * Groups candidates by normalised match key. For matched products (appearing
 * in multiple stores), creates a single canonical entry. For unmatched products,
 * creates single-store entries that can be matched later.
 */
export function crossMatch(
  candidates: CrossMatchCandidate[],
): CrossMatchResult[] {
  const groups = new Map<string, CrossMatchCandidate[]>();

  for (const candidate of candidates) {
    const key = buildMatchKey(
      candidate.brand,
      candidate.name,
      candidate.packageSize,
    );

    const existing = groups.get(key);
    if (existing) {
      existing.push(candidate);
    } else {
      groups.set(key, [candidate]);
    }
  }

  const results: CrossMatchResult[] = [];

  for (const entries of groups.values()) {
    // Find the Woolworths entry (preferred for canonical name and image)
    const woolworthsEntry = entries.find((e) => e.storeSlug === "woolworths");
    const firstEntry = entries[0];
    if (!firstEntry) continue;

    // Prefer Woolworths name (generally cleaner), fall back to first entry
    const canonicalName = woolworthsEntry?.name ?? firstEntry.name;
    const brand = woolworthsEntry?.brand ?? firstEntry.brand;
    const packageSize = woolworthsEntry?.packageSize ?? firstEntry.packageSize;
    const category = woolworthsEntry?.category ?? firstEntry.category;

    // Image: Woolworths preferred (higher quality CDN), Coles fallback
    const imageUrl =
      woolworthsEntry?.imageUrl ??
      entries.find((e) => e.imageUrl !== null)?.imageUrl ??
      null;

    results.push({
      canonicalName,
      brand,
      packageSize,
      imageUrl,
      category,
      storeEntries: entries,
    });
  }

  return results;
}
