"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Alert, Badge } from "@/components";

interface AuthStatus {
  loggedIn: boolean;
  savedAt: number | null;
  cookieCount: number;
}

interface LoginStatus {
  status: "waiting" | "logged_in" | "error" | "no_browser";
  message: string;
}

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth-status");
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setError("Failed to fetch auth status");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) {
        await fetchAuthStatus();
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [fetchAuthStatus]);

  // Poll for login status when logging in
  useEffect(() => {
    if (!isLoggingIn) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/login");
        const data: LoginStatus = await res.json();

        if (data.status === "logged_in") {
          setIsLoggingIn(false);
          setLoginMessage("");
          setSuccessMessage("Successfully logged in!");
          fetchAuthStatus();
        } else if (data.status === "error") {
          setIsLoggingIn(false);
          setLoginMessage("");
          setError(data.message);
        } else if (data.status === "no_browser") {
          setIsLoggingIn(false);
          setLoginMessage("");
        } else {
          setLoginMessage(data.message);
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoggingIn, fetchAuthStatus]);

  const handleLogin = async () => {
    setError("");
    setSuccessMessage("");
    setLoginMessage("Opening browser window...");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/login", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setIsLoggingIn(false);
        setLoginMessage("");
      } else {
        setLoginMessage("Please log in to Frontier in the browser window that opened.");
      }
    } catch {
      setError("Failed to start login flow");
      setIsLoggingIn(false);
      setLoginMessage("");
    }
  };

  const handleCancelLogin = async () => {
    try {
      await fetch("/api/login", { method: "DELETE" });
      setIsLoggingIn(false);
      setLoginMessage("");
    } catch {
      setError("Failed to cancel login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/login?action=logout", { method: "DELETE" });
      fetchAuthStatus();
      setSuccessMessage("Logged out successfully");
    } catch {
      setError("Failed to logout");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getSessionAge = (timestamp: number) => {
    const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
    if (hours < 1) return "Less than 1 hour ago";
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-[var(--muted)]">
            Manage your Frontier account connection
          </p>
        </div>

        {/* Auth Status Card */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Frontier Account</h2>
              <p className="text-sm text-[var(--muted)]">
                Connect your Frontier GoWild account to scan for flights
              </p>
            </div>
            {authLoading ? (
              <div className="w-20 h-6 bg-[var(--card-border)] rounded-full animate-pulse" />
            ) : (
              <Badge
                variant={authStatus?.loggedIn ? "success" : "error"}
                size="md"
              >
                {authStatus?.loggedIn ? "Connected" : "Not Connected"}
              </Badge>
            )}
          </div>

          {/* Status Display */}
          {authLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 bg-[var(--card-border)] rounded animate-pulse" />
              <div className="h-4 w-32 bg-[var(--card-border)] rounded animate-pulse" />
            </div>
          ) : authStatus?.loggedIn ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Account Connected
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You can now scan for GoWild flights
                  </p>
                </div>
              </div>
              {authStatus.savedAt && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-green-700 dark:text-green-300">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last login: {getSessionAge(authStatus.savedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(authStatus.savedAt)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Not Connected
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Log in to your Frontier account to start scanning
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <Alert
              variant="error"
              dismissible
              onDismiss={() => setError("")}
              className="mb-4"
            >
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert
              variant="success"
              dismissible
              autoHide={5000}
              onDismiss={() => setSuccessMessage("")}
              className="mb-4"
            >
              {successMessage}
            </Alert>
          )}

          {loginMessage && (
            <Alert variant="info" className="mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                {loginMessage}
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!authStatus?.loggedIn && !isLoggingIn && (
              <Button onClick={handleLogin} size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login to Frontier
              </Button>
            )}

            {isLoggingIn && (
              <Button onClick={handleCancelLogin} variant="secondary" size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Login
              </Button>
            )}

            {authStatus?.loggedIn && (
              <Button onClick={handleLogout} variant="danger" size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            )}
          </div>
        </Card>

        {/* How It Works Card */}
        <Card className="mb-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Login Works
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--primary)]">
                1
              </div>
              <div>
                <p className="font-medium">Click &quot;Login to Frontier&quot;</p>
                <p className="text-sm text-[var(--muted)]">
                  A browser window will open with the Frontier login page
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--primary)]">
                2
              </div>
              <div>
                <p className="font-medium">Log in with your Frontier account</p>
                <p className="text-sm text-[var(--muted)]">
                  Enter your credentials and complete any verification steps
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--primary)]">
                3
              </div>
              <div>
                <p className="font-medium">Session saved automatically</p>
                <p className="text-sm text-[var(--muted)]">
                  Once logged in, your session is saved for authenticated flight scans
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* GoWild Notes Card */}
        <Card className="bg-gradient-to-br from-zinc-50 to-slate-50 dark:from-zinc-800/50 dark:to-slate-800/50">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
            GoWild Pass Notes
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
              <p className="text-sm text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Domestic flights:</strong>{" "}
                GoWild seats typically open the day before departure
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
              <p className="text-sm text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">International flights:</strong>{" "}
                May have different availability windows
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
              <p className="text-sm text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Availability:</strong>{" "}
                Limited seats, first-come first-served basis
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
              <p className="text-sm text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Sessions:</strong>{" "}
                May expire - re-login if scans start failing
              </p>
            </li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
