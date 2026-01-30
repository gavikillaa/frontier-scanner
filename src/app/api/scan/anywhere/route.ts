import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import cachedScanner from "@/lib/cached-scanner";
import playwright from "@/lib/playwright";
import FRONTIER_AIRPORTS from "@/lib/airports";
import { FlightResult } from "@/lib/scanner";

// Request validation schema
const AnywhereRequestSchema = z.object({
  origin: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxDestinations: z.number().min(1).max(50).optional().default(20),
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
    const validationResult = AnywhereRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { origin, date, maxDestinations } = validationResult.data;

    // Update rate limit timestamp
    lastScanTime = now;

    // Get potential destinations (excluding origin)
    const destinations = FRONTIER_AIRPORTS
      .filter((a) => a.code !== origin.toUpperCase())
      .slice(0, maxDestinations)
      .map((a) => a.code);

    // Build routes
    const routes = destinations.map((dest) => ({
      origin: origin.toUpperCase(),
      destination: dest,
      date,
    }));

    console.log(`[Anywhere] Scanning ${routes.length} destinations from ${origin}`);

    // Scan all routes
    const results = await cachedScanner.scanMultipleRoutes(routes);

    // Collect all GoWild flights
    const goWildFlights: FlightResult[] = [];
    const allFlights: FlightResult[] = [];

    for (const result of results) {
      allFlights.push(...result.flights);
      goWildFlights.push(...result.flights.filter((f) => f.isGoWild));
    }

    // Sort GoWild flights by taxes/fees (lowest first)
    goWildFlights.sort((a, b) => {
      const aPrice = a.taxesAndFees ?? Infinity;
      const bPrice = b.taxesAndFees ?? Infinity;
      return aPrice - bPrice;
    });

    // Summary stats
    const cachedCount = results.filter((r) => r.cached).length;
    const errorCount = results.filter((r) => r.error).length;
    const routesWithFlights = results.filter((r) => r.flights.length > 0).length;

    return NextResponse.json({
      success: true,
      origin: origin.toUpperCase(),
      date,
      summary: {
        destinationsScanned: routes.length,
        routesWithFlights,
        totalFlights: allFlights.length,
        goWildFlights: goWildFlights.length,
        cachedResults: cachedCount,
        errors: errorCount,
      },
      goWildFlights,
      cheapestGoWild: goWildFlights.slice(0, 10),
      allResults: results.map((r) => ({
        destination: r.destination,
        flightCount: r.flights.length,
        goWildCount: r.flights.filter((f) => f.isGoWild).length,
        cheapestGoWild: r.flights
          .filter((f) => f.isGoWild)
          .sort((a, b) => (a.taxesAndFees ?? Infinity) - (b.taxesAndFees ?? Infinity))[0],
        cached: r.cached,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("[API] Anywhere scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
