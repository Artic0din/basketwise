import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/** Cookie/popup dismiss selectors common across AU grocery sites. */
const DISMISS_SELECTORS = [
  '[data-testid="cookie-accept"]',
  '[data-testid="close-button"]',
  'button[aria-label="Close"]',
  'button[aria-label="Accept"]',
  "#onetrust-accept-btn-handler",
  ".cookie-banner__accept",
  'button:has-text("Accept")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
];

let _browser: Browser | null = null;

/**
 * Launch a shared Chromium browser instance for scraping.
 * Reuses an existing instance if already running.
 */
export async function launchBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  const headless = process.env.HEADLESS !== "false";

  _browser = await chromium.launch({
    headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  console.info(`[Browser] Chromium launched (headless: ${headless})`);
  return _browser;
}

/**
 * Create a new browser context with anti-detection settings.
 */
export async function createContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    locale: "en-AU",
    timezoneId: "Australia/Melbourne",
    geolocation: { latitude: -37.8136, longitude: 144.9631 },
    permissions: ["geolocation"],
  });

  return context;
}

/**
 * Attempt to dismiss cookie banners and popups on a page.
 * Non-blocking: logs a warning if no dismiss button is found.
 */
export async function dismissPopups(page: Page): Promise<void> {
  for (const selector of DISMISS_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      const isVisible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        await el.click({ timeout: 2000 });
        console.info(`[Browser] Dismissed popup via: ${selector}`);
        // Wait briefly for the popup to close
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Selector not found or not clickable — try next
    }
  }
}

/**
 * Close the shared browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
    console.info("[Browser] Chromium closed");
  }
}
