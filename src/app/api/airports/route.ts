import { NextRequest, NextResponse } from "next/server";
import FRONTIER_AIRPORTS, { searchAirports } from "@/lib/airports";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (query) {
    const results = searchAirports(query);
    return NextResponse.json({ airports: results });
  }

  return NextResponse.json({ airports: FRONTIER_AIRPORTS });
}
