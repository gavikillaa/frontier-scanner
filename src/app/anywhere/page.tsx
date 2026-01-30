"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Button, Alert, Badge, SearchInput, Skeleton, ProgressBar } from "@/components";

interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
}

interface FlightResult {
  origin: string;
  destination: string;
  date: string;
  departTime: string;
  arriveTime: string;
  stops: number;
  isGoWild: boolean;
  taxesAndFees: number | null;
  rawPrice?: string;
}

interface AnywhereResponse {
  success: boolean;
  error?: string;
  origin?: string;
  date?: string;
  summary?: {
    destinationsScanned: number;
    routesWithFlights: number;
    totalFlights: number;
    goWildFlights: number;
    cachedResults: number;
    errors: number;
  };
  goWildFlights?: FlightResult[];
  cheapestGoWild?: FlightResult[];
}

export default function AnywherePage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportsLoading, setAirportsLoading] = useState(true);
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [originSearch, setOriginSearch] = useState("");
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [date, setDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [maxDestinations, setMaxDestinations] = useState(20);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<AnywhereResponse | null>(null);
  const [error, setError] = useState("");

  // Get tomorrow's date as default and minimum
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    setDate(tomorrowStr);
    setMinDate(tomorrowStr);
  }, []);

  // Fetch airports
  useEffect(() => {
    setAirportsLoading(true);
    fetch("/api/airports")
      .then((res) => res.json())
      .then((data) => {
        setAirports(data.airports);
        setAirportsLoading(false);
      })
      .catch(() => {
        setError("Failed to load airports");
        setAirportsLoading(false);
      });
  }, []);

  // Filter airports for dropdown
  const filteredAirports = useMemo(() => {
    if (!originSearch) return airports;
    const q = originSearch.toLowerCase();
    return airports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [airports, originSearch]);

  const selectedAirport = airports.find((a) => a.code === selectedOrigin);

  const handleScan = async () => {
    if (!selectedOrigin) {
      setError("Please select an origin airport");
      return;
    }
    if (!date) {
      setError("Please select a date");
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError("Please select a future date");
      return;
    }

    setError("");
    setIsScanning(true);
    setResults(null);

    try {
      const res = await fetch("/api/scan/anywhere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: selectedOrigin,
          date,
          maxDestinations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Scan failed");
      } else {
        setResults(data);
      }
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsScanning(false);
    }
  };

  const getAirportName = (code: string) => {
    const airport = airports.find((a) => a.code === code);
    return airport ? airport.city : code;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">Anywhere Mode</h1>
            <Badge variant="primary">Popular</Badge>
          </div>
          <p className="text-[var(--muted)]">
            Find the cheapest GoWild flights from your origin to any destination
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Origin Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                Origin Airport
              </label>
              {airportsLoading ? (
                <Skeleton height={42} />
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowOriginDropdown(!showOriginDropdown)}
                    className="w-full px-3 py-2.5 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] text-left flex items-center justify-between hover:border-[var(--primary)] transition-colors"
                  >
                    {selectedAirport ? (
                      <span>
                        <span className="font-mono font-medium">{selectedAirport.code}</span>
                        <span className="text-[var(--muted)] ml-2">{selectedAirport.city}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">Select origin...</span>
                    )}
                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showOriginDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg max-h-64 overflow-hidden">
                      <div className="p-2 border-b border-[var(--card-border)]">
                        <SearchInput
                          value={originSearch}
                          onChange={setOriginSearch}
                          placeholder="Search airports..."
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredAirports.length === 0 ? (
                          <div className="p-4 text-center text-sm text-[var(--muted)]">
                            No airports found
                          </div>
                        ) : (
                          filteredAirports.map((airport) => (
                            <button
                              key={airport.code}
                              onClick={() => {
                                setSelectedOrigin(airport.code);
                                setShowOriginDropdown(false);
                                setOriginSearch("");
                              }}
                              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--card-border)]/50 transition-colors ${
                                selectedOrigin === airport.code ? "bg-[var(--primary)]/5" : ""
                              }`}
                            >
                              <span className="font-mono text-sm font-medium w-10">{airport.code}</span>
                              <span className="text-sm text-[var(--muted)] truncate">
                                {airport.city}{airport.state ? `, ${airport.state}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                Travel Date
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              />
            </div>

            {/* Max Destinations */}
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                Destinations to Scan
              </label>
              <select
                value={maxDestinations}
                onChange={(e) => setMaxDestinations(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              >
                <option value={10}>10 destinations (fast)</option>
                <option value={20}>20 destinations</option>
                <option value={30}>30 destinations</option>
                <option value={40}>40 destinations (slow)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleScan}
            loading={isScanning}
            size="lg"
            fullWidth
          >
            {isScanning ? "Scanning destinations..." : "Find GoWild Flights"}
          </Button>
        </Card>

        {/* Error */}
        {error && (
          <Alert
            variant="error"
            dismissible
            onDismiss={() => setError("")}
            className="mb-6"
          >
            {error}
          </Alert>
        )}

        {/* Scanning State */}
        {isScanning && (
          <Card className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--primary)] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1">Scanning {maxDestinations} destinations...</p>
                <p className="text-sm text-[var(--muted)]">
                  Looking for GoWild availability from {selectedAirport?.city || selectedOrigin}
                </p>
              </div>
            </div>
            <ProgressBar progress={0} showLabel={false} className="mb-4" />
            <p className="text-xs text-[var(--muted)] text-center">
              This may take 1-3 minutes depending on the number of destinations
            </p>
          </Card>
        )}

        {/* Results */}
        {results && !isScanning && (
          <div className="space-y-6 animate-fadeIn">
            {/* Summary Stats */}
            {results.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="text-center py-4">
                  <p className="text-3xl font-bold text-[var(--foreground)]">
                    {results.summary.destinationsScanned}
                  </p>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide mt-1">
                    Destinations
                  </p>
                </Card>
                <Card className="text-center py-4">
                  <p className="text-3xl font-bold text-[var(--foreground)]">
                    {results.summary.totalFlights}
                  </p>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide mt-1">
                    Total Flights
                  </p>
                </Card>
                <Card className="text-center py-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {results.summary.goWildFlights}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide mt-1">
                    GoWild Available
                  </p>
                </Card>
                <Card className="text-center py-4">
                  <p className="text-3xl font-bold text-[var(--foreground)]">
                    {results.summary.cachedResults}
                  </p>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide mt-1">
                    From Cache
                  </p>
                </Card>
              </div>
            )}

            {/* Cheapest GoWild Flights */}
            {results.cheapestGoWild && results.cheapestGoWild.length > 0 ? (
              <Card padding="none">
                <div className="p-4 sm:p-6 border-b border-[var(--card-border)] bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg text-green-800 dark:text-green-200 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                        </svg>
                        Cheapest GoWild Flights
                      </h2>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        From {selectedAirport?.city || selectedOrigin} on {formatDate(date)}
                      </p>
                    </div>
                    <Badge variant="success" size="md">
                      {results.cheapestGoWild.length} flights
                    </Badge>
                  </div>
                </div>

                <div className="divide-y divide-[var(--card-border)]">
                  {results.cheapestGoWild.map((flight, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 hover:bg-[var(--card-border)]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                              <span className="font-mono font-bold text-[var(--primary)]">
                                {flight.destination}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-lg">
                                {getAirportName(flight.destination)}
                              </p>
                              <p className="text-sm text-[var(--muted)]">
                                {flight.origin} → {flight.destination}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-[var(--muted)]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {flight.departTime} → {flight.arriveTime}
                            </span>
                            <Badge variant={flight.stops === 0 ? "success" : "default"}>
                              {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {flight.taxesAndFees !== null
                              ? `$${flight.taxesAndFees.toFixed(2)}`
                              : flight.rawPrice || "—"}
                          </p>
                          <p className="text-xs text-[var(--muted)]">taxes & fees</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-[var(--card-border)] flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2">No GoWild Flights Found</h3>
                <p className="text-[var(--muted)] max-w-md mx-auto">
                  No GoWild seats are currently available for this date. 
                  GoWild availability typically opens the day before departure.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Info Banner */}
        <Card className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                About GoWild Availability
              </h3>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  GoWild seats typically open the day before departure (domestic)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  International flights may have different availability windows
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  Results are cached for 45 minutes to speed up repeated scans
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
