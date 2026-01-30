import { NextResponse } from "next/server";
import cache from "@/lib/cache";

export async function GET() {
  const testKey = "test-key";
  const testValue = { message: "Hello from cache!", timestamp: Date.now() };

  // Write to cache (1 minute TTL)
  cache.set(testKey, testValue, 1);

  // Read back immediately
  const retrieved = cache.get<typeof testValue>(testKey);

  // Get cache stats
  const cacheStats = cache.stats();

  return NextResponse.json({
    success: true,
    written: testValue,
    retrieved,
    stats: cacheStats,
  });
}

export async function DELETE() {
  // Cleanup expired entries
  const cleaned = cache.cleanup();

  return NextResponse.json({
    success: true,
    cleanedEntries: cleaned,
  });
}
