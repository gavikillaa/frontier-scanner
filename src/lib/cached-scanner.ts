import cache from "./cache";
import scanner, { ScanResult } from "./scanner";

const CACHE_TTL_MINUTES = 45;

/**
 * Generate cache key for a route scan
 */
function getCacheKey(origin: string, destination: string, date: string): string {
  return `scan:${origin}:${destination}:${date}`;
}

/**
 * Scan a route with caching
 */
export async function cachedScanRoute(
  origin: string,
  destination: string,
  date: string
): Promise<ScanResult> {
  const cacheKey = getCacheKey(origin, destination, date);

  // Check cache first
  const cached = cache.get<ScanResult>(cacheKey);
  if (cached) {
    console.log(`[Cache] HIT: ${origin} → ${destination} on ${date}`);
    return { ...cached, cached: true };
  }

  console.log(`[Cache] MISS: ${origin} → ${destination} on ${date}`);

  // Scan the route
  const result = await scanner.scanRoute(origin, destination, date);

  // Cache successful results (even if no flights found)
  if (!result.error) {
    cache.set(cacheKey, result, CACHE_TTL_MINUTES);
    console.log(`[Cache] STORED: ${origin} → ${destination} on ${date} (TTL: ${CACHE_TTL_MINUTES}min)`);
  }

  return result;
}

/**
 * Scan multiple routes with caching
 */
export async function cachedScanMultipleRoutes(
  routes: Array<{ origin: string; destination: string; date: string }>
): Promise<ScanResult[]> {
  const results = await Promise.all(
    routes.map((route) =>
      cachedScanRoute(route.origin, route.destination, route.date)
    )
  );

  return results;
}

/**
 * Clear cache for a specific route
 */
export function clearRouteCache(origin: string, destination: string, date: string): void {
  const cacheKey = getCacheKey(origin, destination, date);
  cache.del(cacheKey);
  console.log(`[Cache] CLEARED: ${origin} → ${destination} on ${date}`);
}

/**
 * Clear all scan caches
 */
export function clearAllScanCache(): number {
  // Note: This is a simple cleanup - in production you might want
  // a more sophisticated approach to clear only scan keys
  return cache.cleanup();
}

export const cachedScanner = {
  scanRoute: cachedScanRoute,
  scanMultipleRoutes: cachedScanMultipleRoutes,
  clearRouteCache,
  clearAllScanCache,
};

export default cachedScanner;
