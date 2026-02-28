"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Stock, PaginatedResponse, SearchResult, SearchMode, ValuationView } from "@/types/stock";
import { getStocks, searchStocks } from "@/lib/api";
import StockModal from "@/components/StockModal";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${Number(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(cap: number | null): string {
  if (cap == null) return "—";
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000)     return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000)         return `$${(cap / 1_000_000).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700/60">{part}</mark>
      : part
  );
}

const VALUATION_BADGE: Record<ValuationView, string> = {
  Undervalued:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Fair Value": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Overvalued:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Unknown:      "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function ValuationPill({ value }: { value: ValuationView | null }) {
  if (!value) return <span className="text-zinc-400">—</span>;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${VALUATION_BADGE[value]}`}>
      {value}
    </span>
  );
}

const VALUATION_FILTER_OPTIONS: Array<ValuationView | "All"> = ["All", "Undervalued", "Fair Value", "Overvalued", "Unknown"];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Suspense wrapper ───────────────────────────────────────────────────────

export default function StocksPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <StocksPageContent />
    </Suspense>
  );
}

// ── Page content ───────────────────────────────────────────────────────────

function StocksPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Browse state ──────────────────────────────────────────────────────────
  const [data, setData]                 = useState<PaginatedResponse<Stock> | null>(null);
  const [browseSearch, setBrowseSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage]                 = useState(parseInt(searchParams.get("page") ?? "1", 10));
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Filters
  const [valuationFilter, setValuationFilter] = useState<ValuationView | "All">(
    (searchParams.get("valuation") ?? "All") as ValuationView | "All"
  );
  const [thesisFilter, setThesisFilter] = useState<"All" | "Yes" | "No">(
    (searchParams.get("hasThesis") ?? "All") as "All" | "Yes" | "No"
  );

  // Expandable row
  const [expandedId, setExpandedId] = useState<number | null>(
    parseInt(searchParams.get("expanded") ?? "0", 10) || null
  );

  // Modal
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  // ── AI Search state ───────────────────────────────────────────────────────
  const [aiQuery, setAiQuery]         = useState(searchParams.get("q") ?? "");
  const [aiMode, setAiMode]           = useState<SearchMode>((searchParams.get("mode") ?? "hybrid") as SearchMode);
  const [compareMode, setCompareMode] = useState(searchParams.get("compare") === "1");
  const [searchResults, setSearchResults]   = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [searchError, setSearchError]       = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<{
    keyword: SearchResult[];
    semantic: SearchResult[];
    hybrid: SearchResult[];
  } | null>(null);

  const searchActive = searchResults !== null || compareResults !== null;
  const lastSearchedRef = useRef<string | null>(null);

  // ── URL update helper ─────────────────────────────────────────────────────
  const updateURL = useCallback((updates: {
    search?:   string;
    page?:     number;
    valuation?: string;
    hasThesis?: string;
    q?:        string;
    mode?:     string;
    compare?:  boolean;
    expanded?: number | null;
  }) => {
    const params = new URLSearchParams(window.location.search);

    if (updates.search !== undefined) {
      updates.search ? params.set("search", updates.search) : params.delete("search");
    }
    if (updates.page !== undefined) {
      updates.page > 1 ? params.set("page", String(updates.page)) : params.delete("page");
    }
    if (updates.valuation !== undefined) {
      updates.valuation && updates.valuation !== "All"
        ? params.set("valuation", updates.valuation)
        : params.delete("valuation");
    }
    if (updates.hasThesis !== undefined) {
      updates.hasThesis && updates.hasThesis !== "All"
        ? params.set("hasThesis", updates.hasThesis)
        : params.delete("hasThesis");
    }
    if (updates.q !== undefined) {
      updates.q ? params.set("q", updates.q) : params.delete("q");
    }
    if (updates.mode !== undefined) {
      updates.mode && updates.mode !== "hybrid"
        ? params.set("mode", updates.mode)
        : params.delete("mode");
    }
    if (updates.compare !== undefined) {
      updates.compare ? params.set("compare", "1") : params.delete("compare");
    }
    if (updates.expanded !== undefined) {
      updates.expanded != null
        ? params.set("expanded", String(updates.expanded))
        : params.delete("expanded");
    }

    const qs = params.toString();
    router.replace(`/stocks${qs ? `?${qs}` : ""}`);
  }, [router]);

  // ── Sync state from URL (browser back / forward) ──────────────────────────
  useEffect(() => {
    const q       = searchParams.get("q") ?? "";
    const mode    = (searchParams.get("mode") ?? "hybrid") as SearchMode;
    const compare = searchParams.get("compare") === "1";

    setBrowseSearch(searchParams.get("search") ?? "");
    setPage(parseInt(searchParams.get("page") ?? "1", 10));
    setValuationFilter((searchParams.get("valuation") ?? "All") as ValuationView | "All");
    setThesisFilter((searchParams.get("hasThesis") ?? "All") as "All" | "Yes" | "No");
    setExpandedId(parseInt(searchParams.get("expanded") ?? "0", 10) || null);
    setAiQuery(q);
    setAiMode(mode);
    setCompareMode(compare);

    if (q && q !== lastSearchedRef.current) {
      runSearch(q, mode, compare, false);
    }
    if (!q && lastSearchedRef.current) {
      lastSearchedRef.current = null;
      setSearchResults(null);
      setCompareResults(null);
      setSearchError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Browse data fetch ─────────────────────────────────────────────────────
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStocks(browseSearch || undefined, page);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [browseSearch, page]);

  useEffect(() => {
    if (!searchActive) fetchStocks();
  }, [fetchStocks, searchActive]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  function handleBrowseSearchChange(value: string) {
    setBrowseSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      updateURL({ search: value, page: 1 });
    }, 300);
  }

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredStocks = (data?.data ?? []).filter((s) => {
    if (valuationFilter !== "All" && s.valuation_view !== valuationFilter) return false;
    if (thesisFilter === "Yes" && !s.investment_thesis) return false;
    if (thesisFilter === "No"  &&  s.investment_thesis) return false;
    return true;
  });

  // ── Stats bar computations (current page, pre-client-filter) ─────────────
  const pageStocks = data?.data ?? [];
  const valuationCounts = (["Undervalued", "Fair Value", "Overvalued", "Unknown"] as ValuationView[]).map(
    (v) => ({ v, count: pageStocks.filter((s) => s.valuation_view === v).length })
  ).filter(({ count }) => count > 0);
  const thesisCount  = pageStocks.filter((s) => s.investment_thesis).length;
  const needsReview  = pageStocks.filter((s) => {
    if (!s.last_reviewed) return true;
    return new Date(s.last_reviewed) < new Date(Date.now() - THIRTY_DAYS_MS);
  }).length;

  // ── AI Search ─────────────────────────────────────────────────────────────
  async function runSearch(q: string, mode: SearchMode, compare: boolean, updateUrl = true) {
    lastSearchedRef.current = q;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    setCompareResults(null);

    if (updateUrl) updateURL({ q, mode, compare });

    try {
      if (compare) {
        const [kw, sem, hyb] = await Promise.all([
          searchStocks(q, "keyword"),
          searchStocks(q, "semantic"),
          searchStocks(q, "hybrid"),
        ]);
        setCompareResults({ keyword: kw.results, semantic: sem.results, hybrid: hyb.results });
      } else {
        const res = await searchStocks(q, mode);
        setSearchResults(res.results);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSearch() {
    const q = aiQuery.trim();
    if (!q) return;
    await runSearch(q, aiMode, compareMode);
  }

  function handleClearSearch() {
    lastSearchedRef.current = null;
    setAiQuery("");
    setSearchResults(null);
    setCompareResults(null);
    setSearchError(null);
    updateURL({ q: "", compare: false });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  // ── Filter / page change handlers ─────────────────────────────────────────
  function handleValuationChange(value: ValuationView | "All") {
    setValuationFilter(value);
    setPage(1);
    updateURL({ valuation: value, page: 1 });
  }

  function handleThesisChange(value: "All" | "Yes" | "No") {
    setThesisFilter(value);
    setPage(1);
    updateURL({ hasThesis: value, page: 1 });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateURL({ page: newPage });
  }

  function handleModeChange(mode: SearchMode) {
    setAiMode(mode);
    updateURL({ mode });
  }

  function handleCompareModeChange(compare: boolean) {
    setCompareMode(compare);
    updateURL({ compare });
  }

  // ── Expandable row ────────────────────────────────────────────────────────
  function handleToggleExpand(id: number) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    updateURL({ expanded: next });
  }

  // ── Compare helpers ───────────────────────────────────────────────────────
  function sharedInCompare(id: number): number {
    if (!compareResults) return 0;
    return [compareResults.keyword, compareResults.semantic, compareResults.hybrid]
      .filter((arr) => arr.some((s) => s.id === id)).length;
  }

  // Navigate to detail page, passing current URL state as `from` context
  function goToDetail(stockId: number) {
    router.push(`/stocks/${stockId}?from=${encodeURIComponent(window.location.search)}`);
  }

  const colSpan = 6; // name + ticker + sector + valuation + thesis + price

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stocks</h1>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/stocks/import"
              className="whitespace-nowrap rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Import CSV
            </Link>
            <button
              onClick={() => { setEditingStock(null); setModalOpen(true); }}
              className="whitespace-nowrap rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Stock
            </button>
          </div>
        </div>

        {/* ── AI Search Panel ───────────────────────────────────────────────── */}
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 'undervalued healthcare stocks', 'tech companies with strong moats', 'dividend growers'"
                className="w-full rounded border border-zinc-300 px-3 py-2 pr-8 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {searchLoading && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </span>
              )}
            </div>

            <div className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
              {(["keyword", "semantic", "hybrid"] as SearchMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  disabled={compareMode}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed ${
                    aiMode === m && !compareMode
                      ? "bg-blue-600 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => handleCompareModeChange(e.target.checked)}
                className="rounded border-zinc-300"
              />
              Compare modes
            </label>

            <button
              onClick={handleSearch}
              disabled={searchLoading || !aiQuery.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Search
            </button>
            {searchActive && (
              <button
                onClick={handleClearSearch}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
            )}
          </div>

          {searchError && (
            <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {searchError}
            </div>
          )}
        </div>

        {/* ── Browse filters ────────────────────────────────────────────────── */}
        {!searchActive && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Filter by name or ticker…"
              value={browseSearch}
              onChange={(e) => handleBrowseSearchChange(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Valuation:</label>
              <select
                value={valuationFilter}
                onChange={(e) => handleValuationChange(e.target.value as ValuationView | "All")}
                className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {VALUATION_FILTER_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Has Thesis:</label>
              <select
                value={thesisFilter}
                onChange={(e) => handleThesisChange(e.target.value as "All" | "Yes" | "No")}
                className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {["All", "Yes", "No"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        {!searchActive && data && pageStocks.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {/* Total */}
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              {data.meta.total} stock{data.meta.total !== 1 ? "s" : ""}
            </span>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            {/* Valuation breakdown (clickable) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {valuationCounts.map(({ v, count }) => (
                <button
                  key={v}
                  onClick={() => handleValuationChange(valuationFilter === v ? "All" : v)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-opacity hover:opacity-80 ${VALUATION_BADGE[v]} ${valuationFilter === v ? "ring-2 ring-offset-1 ring-current" : ""}`}
                >
                  {v} <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            {/* Thesis coverage */}
            <button
              onClick={() => handleThesisChange(thesisFilter === "No" ? "All" : "No")}
              className={`text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 ${thesisFilter === "No" ? "font-semibold text-zinc-800 dark:text-zinc-100" : ""}`}
            >
              {thesisCount}/{pageStocks.length} with thesis
            </button>

            {/* Needs review */}
            {needsReview > 0 && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {needsReview} need{needsReview !== 1 ? "" : "s"} review
                </span>
              </>
            )}

            <span className="ml-auto text-zinc-400 dark:text-zinc-600">this page</span>
          </div>
        )}

        {/* ── Compare Mode View ─────────────────────────────────────────────── */}
        {compareResults && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(["keyword", "semantic", "hybrid"] as const).map((mode) => {
              const results   = compareResults[mode];
              const showScore = mode !== "keyword";
              return (
                <div key={mode} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className={`border-b px-4 py-3 ${
                    mode === "keyword"
                      ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
                      : mode === "semantic"
                      ? "border-purple-100 bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/10"
                      : "border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10"
                  }`}>
                    <h3 className="text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200">{mode}</h3>
                    <p className="text-xs text-zinc-500">{results.length} result{results.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {results.slice(0, 5).map((stock) => {
                      const shared = sharedInCompare(stock.id);
                      return (
                        <div
                          key={stock.id}
                          className={`cursor-pointer px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${shared >= 2 ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}`}
                          onClick={() => goToDetail(stock.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {highlight(stock.name, aiQuery)}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-zinc-800">
                                  {highlight(stock.ticker, aiQuery)}
                                </span>
                                {stock.sector && <span className="ml-1.5">{stock.sector}</span>}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-0.5">
                              {showScore && stock.similarity != null && (
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                  {Math.round(stock.similarity * 100)}%
                                </span>
                              )}
                              {shared >= 2 && (
                                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  ×{shared}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {results.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-zinc-400">No results</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Single Search Results Table ───────────────────────────────────── */}
        {searchResults !== null && !compareResults && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium capitalize text-zinc-800 dark:text-zinc-200">{aiMode}</span>
                {" "}search · {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{aiQuery}&rdquo;
              </p>
            </div>
            {searchResults.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No stocks match your query. Try a different search term or mode.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Ticker</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Sector</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Price</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Market Cap</th>
                    {(aiMode === "semantic" || aiMode === "hybrid") && (
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Relevance</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((stock, i) => (
                    <tr
                      key={stock.id}
                      className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                        i === 0 && aiMode !== "keyword" ? "bg-blue-50/30 dark:bg-blue-900/5" : ""
                      }`}
                      onClick={() => goToDetail(stock.id)}
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {aiMode === "keyword" ? highlight(stock.name, aiQuery) : stock.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {aiMode === "keyword" ? highlight(stock.ticker, aiQuery) : stock.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{stock.sector ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">{formatPrice(stock.price)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">{formatMarketCap(stock.market_cap)}</td>
                      {(aiMode === "semantic" || aiMode === "hybrid") && (
                        <td className="px-4 py-3 text-right">
                          {stock.similarity != null ? (
                            <span className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-xs font-semibold ${
                              stock.similarity >= 0.85
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : stock.similarity >= 0.70
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {Math.round(stock.similarity * 100)}%
                            </span>
                          ) : <span className="text-zinc-400">—</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Browse Table ──────────────────────────────────────────────────── */}
        {!searchActive && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Ticker</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Sector</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Valuation</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Thesis</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data ? (
                    <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                  ) : filteredStocks.length > 0 ? (
                    filteredStocks.map((stock) => (
                      <>
                        {/* Data row */}
                        <tr
                          key={stock.id}
                          className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${expandedId === stock.id ? "border-b-0" : ""}`}
                          onClick={() => goToDetail(stock.id)}
                        >
                          {/* Name cell with expand toggle */}
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleExpand(stock.id); }}
                                className="w-3 shrink-0 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                                title={expandedId === stock.id ? "Collapse" : "Expand thesis"}
                              >
                                {expandedId === stock.id ? "▼" : "▶"}
                              </button>
                              {stock.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{stock.ticker}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{stock.sector ?? "—"}</td>
                          <td className="px-4 py-3">
                            <ValuationPill value={stock.valuation_view} />
                          </td>
                          {/* Thesis preview (80-char excerpt) */}
                          <td className="max-w-xs px-4 py-3">
                            {stock.investment_thesis ? (
                              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                {stock.investment_thesis.length > 80
                                  ? stock.investment_thesis.slice(0, 80) + "…"
                                  : stock.investment_thesis}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">{formatPrice(stock.price)}</td>
                        </tr>

                        {/* Expanded thesis card */}
                        {expandedId === stock.id && (
                          <tr key={`${stock.id}-exp`}>
                            <td colSpan={colSpan} className="border-b border-zinc-100 bg-white px-6 pb-4 pt-0 dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                                {stock.investment_thesis ? (
                                  <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                    {stock.investment_thesis.length > 200
                                      ? stock.investment_thesis.slice(0, 200) + "…"
                                      : stock.investment_thesis}
                                  </p>
                                ) : (
                                  <p className="mb-3 text-sm italic text-zinc-400">No investment thesis added yet.</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                                  <ValuationPill value={stock.valuation_view} />
                                  {stock.originated_by && <span>By {stock.originated_by}</span>}
                                  {stock.date_added    && <span>Added {stock.date_added}</span>}
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => goToDetail(stock.id)}
                                    className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                  >
                                    View Full Details →
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-10 text-center">
                        <p className="text-zinc-500">
                          {data?.data.length === 0
                            ? <>No stocks yet. <button onClick={() => setModalOpen(true)} className="text-blue-600 hover:underline">Add your first stock</button> or <Link href="/stocks/import" className="text-blue-600 hover:underline">Import CSV</Link>.</>
                            : "No stocks match the current filters."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.meta.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Showing {data.meta.from}–{data.meta.to} of {data.meta.total} stocks
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >Previous</button>
                  <span className="flex items-center px-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Page {data.meta.current_page} of {data.meta.last_page}
                  </span>
                  <button
                    onClick={() => handlePageChange(Math.min(data.meta.last_page, page + 1))}
                    disabled={page >= data.meta.last_page}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stock modal */}
      {modalOpen && (
        <StockModal
          stock={editingStock}
          onClose={() => { setModalOpen(false); setEditingStock(null); }}
          onSaved={() => { setModalOpen(false); setEditingStock(null); fetchStocks(); }}
        />
      )}

    </div>
  );
}
