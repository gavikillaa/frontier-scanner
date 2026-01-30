import { NextRequest, NextResponse } from "next/server";
import playwright from "@/lib/playwright";

// POST /api/login - Start login flow
export async function POST() {
  try {
    const result = await playwright.startLoginFlow();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start login flow",
      },
      { status: 500 }
    );
  }
}

// GET /api/login - Check login status
export async function GET() {
  try {
    const result = await playwright.checkLoginStatus();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check login status",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/login - Cancel login flow or logout
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "logout") {
      playwright.deleteCookies();
      return NextResponse.json({ success: true, message: "Logged out" });
    }

    await playwright.cancelLoginFlow();
    return NextResponse.json({ success: true, message: "Login cancelled" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel login",
      },
      { status: 500 }
    );
  }
}
