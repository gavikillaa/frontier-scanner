"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Button, Alert, Badge, SearchInput, Skeleton, SkeletonTable } from "@/components";

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

interface ScanResponse {
  success: boolean;
  error?: string;
  summary?: {
    totalRoutes: number;
    totalFlights: number;
    goWildFlights: number;
    cachedResults: number;
    errors: number;
  };
  flights?: FlightResult[];
}

export default function OutboundPage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportsLoading, setAirportsLoading] = useState(true);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [originSearch, setOriginSearch] = useState("");
  const [destSearch, setDestSearch] = useState("");
  const [date, setDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResponse | null>(null);
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

  // Filter airports based on search
  const filteredOrigins = useMemo(() => {
    if (!originSearch) return airports;
    const q = originSearch.toLowerCase();
    return airports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [airports, originSearch]);

  const filteredDestinations = useMemo(() => {
    if (!destSearch) return airports;
    const q = destSearch.toLowerCase();
    return airports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [airports, destSearch]);

  const toggleOrigin = (code: string) => {
    setSelectedOrigins((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleDestination = (code: string) => {
    setSelectedDestinations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllOrigins = () => {
    setSelectedOrigins(filteredOrigins.map((a) => a.code));
  };

  const selectAllDestinations = () => {
    setSelectedDestinations(filteredDestinations.map((a) => a.code));
  };

  const handleScan = async () => {
    if (selectedOrigins.length === 0) {
      setError("Please select at least one origin");
      return;
    }
    if (selectedDestinations.length === 0) {
      setError("Please select at least one destination");
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
      const res = await fetch("/api/scan/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origins: selectedOrigins,
          destinations: selectedDestinations,
          date,
          nonstopOnly,
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

  const goWildFlights = results?.flights?.filter((f) => f.isGoWild) || [];
  const regularFlights = results?.flights?.filter((f) => !f.isGoWild) || [];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Outbound Search</h1>
          <p className="text-[var(--muted)]">
            Search specific routes for GoWild availability
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Origins */}
          <Card padding="none">
            <div className="p-4 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">
                  Origins
                  <Badge variant="primary" className="ml-2">
                    {selectedOrigins.length} selected
                  </Badge>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllOrigins}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedOrigins([])}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <SearchInput
                value={originSearch}
                onChange={setOriginSearch}
                placeholder="Search airports..."
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {airportsLoading ? (
                <div className="space-y-2 p-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </div>
              ) : filteredOrigins.length === 0 ? (
                <div className="p-4 text-center text-[var(--muted)] text-sm">
                  No airports found
                </div>
              ) : (
                filteredOrigins.map((airport) => (
                  <label
                    key={`origin-${airport.code}`}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedOrigins.includes(airport.code)
                        ? "bg-[var(--primary)]/5"
                        : "hover:bg-[var(--card-border)]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrigins.includes(airport.code)}
                      onChange={() => toggleOrigin(airport.code)}
                    />
                    <span className="font-mono text-sm font-medium w-10">
                      {airport.code}
                    </span>
                    <span className="text-sm text-[var(--muted)] truncate">
                      {airport.city}{airport.state ? `, ${airport.state}` : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
          </Card>

          {/* Destinations */}
          <Card padding="none">
            <div className="p-4 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">
                  Destinations
                  <Badge variant="primary" className="ml-2">
                    {selectedDestinations.length} selected
                  </Badge>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllDestinations}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedDestinations([])}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <SearchInput
                value={destSearch}
                onChange={setDestSearch}
                placeholder="Search airports..."
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {airportsLoading ? (
                <div className="space-y-2 p-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </div>
              ) : filteredDestinations.length === 0 ? (
                <div className="p-4 text-center text-[var(--muted)] text-sm">
                  No airports found
                </div>
              ) : (
                filteredDestinations.map((airport) => (
                  <label
                    key={`dest-${airport.code}`}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedDestinations.includes(airport.code)
                        ? "bg-[var(--primary)]/5"
                        : "hover:bg-[var(--card-border)]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(airport.code)}
                      onChange={() => toggleDestination(airport.code)}
                    />
                    <span className="font-mono text-sm font-medium w-10">
                      {airport.code}
                    </span>
                    <span className="text-sm text-[var(--muted)] truncate">
                      {airport.city}{airport.state ? `, ${airport.state}` : ""}
                    </span>
                  </label>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                Travel Date
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={nonstopOnly}
                onChange={(e) => setNonstopOnly(e.target.checked)}
              />
              <span className="text-sm">Nonstop only</span>
            </label>

            <Button
              onClick={handleScan}
              loading={isScanning}
              size="lg"
              className="min-w-[160px]"
            >
              {isScanning ? "Scanning..." : "Scan Flights"}
            </Button>
          </div>
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
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
              <div>
                <p className="font-medium">Scanning routes...</p>
                <p className="text-sm text-[var(--muted)]">
                  Checking {selectedOrigins.length * selectedDestinations.length} route combinations
                </p>
              </div>
            </div>
            <div className="mt-4">
              <SkeletonTable rows={3} />
            </div>
          </Card>
        )}

        {/* Results */}
        {results && !isScanning && (
          <div className="space-y-6 animate-fadeIn">
            {/* Summary */}
            {results.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="text-center">
                  <p className="text-2xl font-bold">{results.summary.totalRoutes}</p>
                  <p className="text-sm text-[var(--muted)]">Routes Scanned</p>
                </Card>
                <Card className="text-center">
                  <p className="text-2xl font-bold">{results.summary.totalFlights}</p>
                  <p className="text-sm text-[var(--muted)]">Total Flights</p>
                </Card>
                <Card className="text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.summary.goWildFlights}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">GoWild Available</p>
                </Card>
                <Card className="text-center">
                  <p className="text-2xl font-bold">{results.summary.cachedResults}</p>
                  <p className="text-sm text-[var(--muted)]">Cached Results</p>
                </Card>
              </div>
            )}

            {/* GoWild Flights */}
            {goWildFlights.length > 0 && (
              <Card padding="none">
                <div className="p-4 border-b border-[var(--card-border)] bg-green-50 dark:bg-green-900/20">
                  <h2 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    GoWild Flights ({goWildFlights.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--card-border)]/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Depart</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Arrive</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Stops</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Taxes/Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {goWildFlights.map((flight, idx) => (
                        <tr key={idx} className="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium">
                              {flight.origin}
                            </span>
                            <span className="text-[var(--muted)] mx-1">→</span>
                            <span className="font-mono font-medium">
                              {flight.destination}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{flight.departTime}</td>
                          <td className="px-4 py-3 text-sm">{flight.arriveTime}</td>
                          <td className="px-4 py-3">
                            <Badge variant={flight.stops === 0 ? "success" : "default"}>
                              {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {flight.taxesAndFees !== null
                                ? `$${flight.taxesAndFees.toFixed(2)}`
                                : flight.rawPrice || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Regular Flights */}
            {regularFlights.length > 0 && (
              <Card padding="none">
                <div className="p-4 border-b border-[var(--card-border)]">
                  <h2 className="font-semibold flex items-center gap-2">
                    Other Flights ({regularFlights.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--card-border)]/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Depart</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Arrive</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Stops</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {regularFlights.slice(0, 20).map((flight, idx) => (
                        <tr key={idx} className="hover:bg-[var(--card-border)]/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm">
                              {flight.origin} → {flight.destination}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{flight.departTime}</td>
                          <td className="px-4 py-3 text-sm">{flight.arriveTime}</td>
                          <td className="px-4 py-3">
                            <Badge variant={flight.stops === 0 ? "success" : "default"}>
                              {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {flight.taxesAndFees !== null
                              ? `$${flight.taxesAndFees.toFixed(2)}`
                              : flight.rawPrice || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {regularFlights.length > 20 && (
                  <div className="p-3 text-center text-sm text-[var(--muted)] border-t border-[var(--card-border)]">
                    Showing 20 of {regularFlights.length} flights
                  </div>
                )}
              </Card>
            )}

            {/* No Results */}
            {results.flights && results.flights.length === 0 && (
              <Card className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[var(--card-border)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">No flights found</h3>
                <p className="text-sm text-[var(--muted)]">
                  No flights found for the selected routes and date. Try different options.
                </p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
