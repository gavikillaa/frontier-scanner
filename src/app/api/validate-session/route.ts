import { NextResponse } from "next/server";
import playwright from "@/lib/playwright";

// POST /api/validate-session - Validate the current session
export async function POST() {
  try {
    // Check if we have cookies first
    if (!playwright.hasCookies()) {
      return NextResponse.json(
        { valid: false, message: "Not logged in. Please log in first." },
        { status: 401 }
      );
    }

    // Validate the session
    const result = await playwright.validateSession();

    if (!result.valid) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        message: error instanceof Error ? error.message : "Failed to validate session",
      },
      { status: 500 }
    );
  }
}
