import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import cachedScanner from "@/lib/cached-scanner";
import playwright from "@/lib/playwright";
import { ScanResult } from "@/lib/scanner";

// Request validation schema
const OutboundRequestSchema = z.object({
  origins: z.array(z.string().length(3)).min(1).max(10),
  destinations: z.array(z.string().length(3)).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nonstopOnly: z.boolean().optional().default(false),
});

// Rate limiting
let lastScanTime = 0;
const MIN_SCAN_INTERVAL_MS = 10000; // 10 seconds between scans

export async function POST(request: NextRequest) {
  try {
    // Check if logged in
    if (!playwright.hasCookies()) {
      return NextResponse.json(
        { error: "Not logged in. Please log in first." },
        { status: 401 }
      );
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;
    if (timeSinceLastScan < MIN_SCAN_INTERVAL_MS) {
      const waitTime = Math.ceil((MIN_SCAN_INTERVAL_MS - timeSinceLastScan) / 1000);
      return NextResponse.json(
        { error: `Rate limited. Please wait ${waitTime} seconds.` },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = OutboundRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { origins, destinations, date, nonstopOnly } = validationResult.data;

    // Update rate limit timestamp
    lastScanTime = now;

    // Build routes to scan
    const routes: Array<{ origin: string; destination: string; date: string }> = [];

    if (destinations && destinations.length > 0) {
      // Scan specific origin-destination pairs
      for (const origin of origins) {
        for (const dest of destinations) {
          if (origin !== dest) {
            routes.push({ origin, destination: dest, date });
          }
        }
      }
    } else {
      // For now, without destinations, we'll need to discover them
      // This is a simplified version - in a full implementation,
      // you'd scrape Frontier's route map
      return NextResponse.json(
        { error: "Please specify at least one destination" },
        { status: 400 }
      );
    }

    // Scan routes (respecting 2-browser concurrency limit)
    const results = await cachedScanner.scanMultipleRoutes(routes);

    // Filter results
    let flights = results.flatMap((r) => r.flights);

    if (nonstopOnly) {
      flights = flights.filter((f) => f.stops === 0);
    }

    // Group by route
    const groupedResults: Record<string, ScanResult> = {};
    for (const result of results) {
      const key = `${result.origin}-${result.destination}`;
      groupedResults[key] = result;
    }

    // Summary stats
    const totalFlights = flights.length;
    const goWildFlights = flights.filter((f) => f.isGoWild).length;
    const cachedCount = results.filter((r) => r.cached).length;
    const errorCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalRoutes: routes.length,
        totalFlights,
        goWildFlights,
        cachedResults: cachedCount,
        errors: errorCount,
      },
      results: Object.values(groupedResults),
      flights,
    });
  } catch (error) {
    console.error("[API] Outbound scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}

// GET endpoint for simple single-route queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    const date = searchParams.get("date");

    if (!origin || !destination || !date) {
      return NextResponse.json(
        { error: "Missing required parameters: origin, destination, date" },
        { status: 400 }
      );
    }

    // Check if logged in
    if (!playwright.hasCookies()) {
      return NextResponse.json(
        { error: "Not logged in. Please log in first." },
        { status: 401 }
      );
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;
    if (timeSinceLastScan < MIN_SCAN_INTERVAL_MS) {
      const waitTime = Math.ceil((MIN_SCAN_INTERVAL_MS - timeSinceLastScan) / 1000);
      return NextResponse.json(
        { error: `Rate limited. Please wait ${waitTime} seconds.` },
        { status: 429 }
      );
    }

    lastScanTime = now;

    const result = await cachedScanner.scanRoute(
      origin.toUpperCase(),
      destination.toUpperCase(),
      date
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[API] Outbound scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
