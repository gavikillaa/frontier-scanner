import { Browser, Page } from "playwright";
import { z } from "zod";
import playwright from "./playwright";

// Zod schemas for type safety
export const FlightResultSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  date: z.string(),
  departTime: z.string(),
  arriveTime: z.string(),
  duration: z.string().optional(),
  stops: z.number(),
  stopLocations: z.array(z.string()).optional(),
  flightNumbers: z.array(z.string()).optional(),
  isGoWild: z.boolean(),
  taxesAndFees: z.number().nullable(),
  currency: z.string().default("USD"),
  rawPrice: z.string().optional(),
});

export type FlightResult = z.infer<typeof FlightResultSchema>;

export const ScanResultSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  date: z.string(),
  flights: z.array(FlightResultSchema),
  scannedAt: z.number(),
  cached: z.boolean().default(false),
  error: z.string().optional(),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

const FRONTIER_SEARCH_URL = "https://www.flyfrontier.com/flights";

// Concurrency control
let activeBrowsers = 0;
const MAX_BROWSERS = 2;
const browserQueue: Array<() => void> = [];

async function acquireBrowser(): Promise<void> {
  if (activeBrowsers < MAX_BROWSERS) {
    activeBrowsers++;
    return;
  }

  return new Promise((resolve) => {
    browserQueue.push(() => {
      activeBrowsers++;
      resolve();
    });
  });
}

function releaseBrowser(): void {
  activeBrowsers--;
  const next = browserQueue.shift();
  if (next) {
    next();
  }
}

/**
 * Parse time string from Frontier's format
 */
function parseTime(timeStr: string): string {
  // Remove extra whitespace and normalize
  return timeStr.trim().replace(/\s+/g, " ");
}

/**
 * Parse price from Frontier's format
 * Returns null if price cannot be determined
 */
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // Remove currency symbols and whitespace
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Check if a flight card indicates GoWild availability
 */
async function checkGoWild(element: { textContent: () => Promise<string | null> }): Promise<boolean> {
  try {
    // Look for GoWild indicators in the flight card
    const text = await element.textContent();
    const lowerText = text?.toLowerCase() || "";

    return (
      lowerText.includes("gowild") ||
      lowerText.includes("go wild") ||
      lowerText.includes("$0") ||
      lowerText.includes("pass")
    );
  } catch {
    return false;
  }
}

/**
 * Scan a single route for flights
 */
export async function scanRoute(
  origin: string,
  destination: string,
  date: string // Format: YYYY-MM-DD
): Promise<ScanResult> {
  await acquireBrowser();

  let browser: Browser | null = null;

  try {
    // Get authenticated context
    const auth = await playwright.getAuthenticatedContext();
    browser = auth.browser;
    const page = auth.page;

    // Build search URL
    const searchParams = new URLSearchParams({
      from: origin,
      to: destination,
      departure: date,
      adults: "1",
      children: "0",
      infants: "0",
      tripType: "oneway",
    });

    const searchUrl = `${FRONTIER_SEARCH_URL}?${searchParams.toString()}`;

    console.log(`[Scanner] Searching: ${origin} → ${destination} on ${date}`);
    console.log(`[Scanner] URL: ${searchUrl}`);

    // Navigate to search results
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for results to load
    await page.waitForTimeout(3000);

    // Try to find flight results
    const flights = await extractFlights(page, origin, destination, date);

    return {
      origin,
      destination,
      date,
      flights,
      scannedAt: Date.now(),
      cached: false,
    };
  } catch (error) {
    console.error(`[Scanner] Error scanning ${origin} → ${destination}:`, error);

    return {
      origin,
      destination,
      date,
      flights: [],
      scannedAt: Date.now(),
      cached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
    releaseBrowser();
  }
}

/**
 * Extract flight information from the results page
 */
async function extractFlights(
  page: Page,
  origin: string,
  destination: string,
  date: string
): Promise<FlightResult[]> {
  const flights: FlightResult[] = [];

  try {
    // Check for error messages or no flights
    const pageContent = await page.content();

    if (
      pageContent.includes("no flights") ||
      pageContent.includes("No flights available") ||
      pageContent.includes("We couldn't find")
    ) {
      console.log(`[Scanner] No flights found for ${origin} → ${destination}`);
      return [];
    }

    // Wait for flight cards to appear
    // Frontier uses various selectors - try multiple approaches
    const selectors = [
      '[data-testid="flight-card"]',
      ".flight-card",
      ".flight-result",
      '[class*="flight"]',
      '[class*="FlightCard"]',
      ".departure-flight",
    ];

    let flightCards: Array<{ textContent: () => Promise<string | null> }> = [];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        flightCards = await page.$$(selector);
        if (flightCards.length > 0) {
          console.log(`[Scanner] Found ${flightCards.length} flights using selector: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (flightCards.length === 0) {
      // Try extracting from the page structure
      console.log(`[Scanner] No flight cards found, attempting page analysis`);

      // Take a screenshot for debugging
      const screenshotPath = `data/debug-${origin}-${destination}-${date}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[Scanner] Debug screenshot saved to ${screenshotPath}`);

      return [];
    }

    // Extract data from each flight card
    for (let i = 0; i < flightCards.length; i++) {
      try {
        const card = flightCards[i];
        const cardText = await card.textContent();

        // Extract times using regex patterns
        const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi;
        const times = cardText?.match(timePattern) || [];

        // Extract stops
        const stopsPattern = /(\d+)\s*stop|nonstop|direct/i;
        const stopsMatch = cardText?.match(stopsPattern);
        let stops = 0;
        if (stopsMatch) {
          if (stopsMatch[0].toLowerCase().includes("nonstop") || stopsMatch[0].toLowerCase().includes("direct")) {
            stops = 0;
          } else {
            stops = parseInt(stopsMatch[1]) || 0;
          }
        }

        // Check for GoWild
        const isGoWild = await checkGoWild(card);

        // Extract price
        const pricePattern = /\$[\d,.]+/;
        const priceMatch = cardText?.match(pricePattern);
        const taxesAndFees = priceMatch ? parsePrice(priceMatch[0]) : null;

        const flight: FlightResult = {
          origin,
          destination,
          date,
          departTime: times[0] ? parseTime(times[0]) : "Unknown",
          arriveTime: times[1] ? parseTime(times[1]) : "Unknown",
          stops,
          isGoWild,
          taxesAndFees,
          currency: "USD",
          rawPrice: priceMatch?.[0],
        };

        flights.push(flight);
      } catch (cardError) {
        console.error(`[Scanner] Error parsing flight card ${i}:`, cardError);
      }
    }
  } catch (error) {
    console.error(`[Scanner] Error extracting flights:`, error);
  }

  return flights;
}

/**
 * Scan multiple routes in parallel (respecting concurrency limit)
 */
export async function scanMultipleRoutes(
  routes: Array<{ origin: string; destination: string; date: string }>
): Promise<ScanResult[]> {
  const results = await Promise.all(
    routes.map((route) => scanRoute(route.origin, route.destination, route.date))
  );

  return results;
}

export const scanner = {
  scanRoute,
  scanMultipleRoutes,
  FlightResultSchema,
  ScanResultSchema,
};

export default scanner;
