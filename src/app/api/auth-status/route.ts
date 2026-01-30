import { NextResponse } from "next/server";
import playwright from "@/lib/playwright";

// GET /api/auth-status - Check if logged in
export async function GET() {
  const hasCookies = playwright.hasCookies();
  const savedCookies = playwright.getSavedCookies();

  return NextResponse.json({
    loggedIn: hasCookies,
    savedAt: savedCookies?.savedAt || null,
    cookieCount: savedCookies?.cookies.length || 0,
  });
}
