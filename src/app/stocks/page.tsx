"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stock, PaginatedResponse, SearchResult, SearchMode, ValuationView } from "@/types/stock";
import { getStocks, deleteStock, bulkUpdate, searchStocks, generateEmbeddings } from "@/lib/api";
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function StocksPage() {
  const router = useRouter();

  // ── Browse state ──────────────────────────────────────────────────────────
  const [data, setData]                 = useState<PaginatedResponse<Stock> | null>(null);
  const [browseSearch, setBrowseSearch] = useState("");
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Filters
  const [valuationFilter, setValuationFilter] = useState<ValuationView | "All">("All");
  const [thesisFilter, setThesisFilter]       = useState<"All" | "Yes" | "No">("All");

  // Modal
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);

  // Delete confirmation
  const [confirmingDelete, setConfirmingDelete] = useState<Record<number, boolean>>({});
  const deleteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk edit modal
  const [bulkEditOpen, setBulkEditOpen]       = useState(false);
  const [bulkValuation, setBulkValuation]     = useState<string>("");
  const [bulkOriginatedBy, setBulkOriginatedBy] = useState("");
  const [bulkEditSaving, setBulkEditSaving]   = useState(false);
  const [bulkEditError, setBulkEditError]     = useState<string | null>(null);
  const [bulkRegenLoading, setBulkRegenLoading] = useState(false);
  const [bulkRegenDone, setBulkRegenDone]     = useState(false);

  // ── AI Search state ───────────────────────────────────────────────────────
  const [aiQuery, setAiQuery]         = useState("");
  const [aiMode, setAiMode]           = useState<SearchMode>("hybrid");
  const [compareMode, setCompareMode] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]     = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<{
    keyword: SearchResult[];
    semantic: SearchResult[];
    hybrid: SearchResult[];
  } | null>(null);

  const searchActive = searchResults !== null || compareResults !== null;

  // ── URL state: read on mount ──────────────────────────────────────────────
  const didMountSearch = useRef(false);
  useEffect(() => {
    if (didMountSearch.current) return;
    didMountSearch.current = true;
    const params  = new URLSearchParams(window.location.search);
    const q       = params.get("q");
    const m       = params.get("mode") as SearchMode | null;
    const compare = params.get("compare") === "1";
    if (q) {
      setAiQuery(q);
      if (m && (["keyword", "semantic", "hybrid"] as string[]).includes(m)) setAiMode(m);
      if (compare) setCompareMode(true);
      setTimeout(() => triggerSearch(q, m ?? "hybrid", compare), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    debounceRef.current = setTimeout(() => setPage(1), 300);
  }

  useEffect(() => {
    const timers = deleteTimers.current;
    return () => { Object.values(timers).forEach(clearTimeout); };
  }, []);

  // ── Client-side filtering on browse results ───────────────────────────────
  const filteredStocks = (data?.data ?? []).filter((s) => {
    if (valuationFilter !== "All" && s.valuation_view !== valuationFilter) return false;
    if (thesisFilter === "Yes" && !s.investment_thesis) return false;
    if (thesisFilter === "No"  &&  s.investment_thesis) return false;
    return true;
  });

  // ── AI Search ─────────────────────────────────────────────────────────────
  async function triggerSearch(q: string, mode: SearchMode, compare: boolean) {
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    setCompareResults(null);

    const params = new URLSearchParams({ q, mode });
    if (compare) params.set("compare", "1");
    window.history.pushState({}, "", `?${params}`);

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
    await triggerSearch(q, aiMode, compareMode);
  }

  function handleClearSearch() {
    setAiQuery("");
    setSearchResults(null);
    setCompareResults(null);
    setSearchError(null);
    window.history.pushState({}, "", window.location.pathname);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDeleteClick(e: React.MouseEvent, stock: Stock) {
    e.stopPropagation();
    if (!confirmingDelete[stock.id]) {
      setConfirmingDelete((prev) => ({ ...prev, [stock.id]: true }));
      deleteTimers.current[stock.id] = setTimeout(() => {
        setConfirmingDelete((prev) => { const n = { ...prev }; delete n[stock.id]; return n; });
      }, 3000);
    } else {
      clearTimeout(deleteTimers.current[stock.id]);
      setConfirmingDelete((prev) => { const n = { ...prev }; delete n[stock.id]; return n; });
      deleteStock(stock.id).then(() => fetchStocks());
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allIds = filteredStocks.map((s) => s.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleAll(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Bulk edit ─────────────────────────────────────────────────────────────
  function openBulkEdit() {
    setBulkValuation("");
    setBulkOriginatedBy("");
    setBulkEditError(null);
    setBulkRegenDone(false);
    setBulkEditOpen(true);
  }

  async function handleBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    setBulkEditError(null);
    setBulkEditSaving(true);
    const updates: Record<string, string> = {};
    if (bulkValuation.trim())     updates.valuation_view = bulkValuation.trim();
    if (bulkOriginatedBy.trim())  updates.originated_by  = bulkOriginatedBy.trim();
    try {
      await bulkUpdate(Array.from(selectedIds), updates);
      setBulkEditOpen(false);
      setSelectedIds(new Set());
      fetchStocks();
    } catch (err) {
      setBulkEditError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkEditSaving(false);
    }
  }

  async function handleBulkRegen() {
    setBulkRegenLoading(true);
    try {
      await generateEmbeddings(Array.from(selectedIds));
      setBulkRegenDone(true);
    } finally {
      setBulkRegenLoading(false);
    }
  }

  // ── Compare helpers ───────────────────────────────────────────────────────
  function sharedInCompare(id: number): number {
    if (!compareResults) return 0;
    return [compareResults.keyword, compareResults.semantic, compareResults.hybrid]
      .filter((arr) => arr.some((s) => s.id === id)).length;
  }

  const colSpan = 8; // checkbox + name + ticker + sector + valuation + thesis + price + actions

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stocks</h1>
          <div className="flex flex-wrap gap-3">
            {!searchActive && selectedIds.size > 0 && (
              <button
                onClick={openBulkEdit}
                className="whitespace-nowrap rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Bulk Edit ({selectedIds.size})
              </button>
            )}
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
                  onClick={() => setAiMode(m)}
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
                onChange={(e) => setCompareMode(e.target.checked)}
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
                onChange={(e) => setValuationFilter(e.target.value as ValuationView | "All")}
                className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {VALUATION_FILTER_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Has Thesis:</label>
              <select
                value={thesisFilter}
                onChange={(e) => setThesisFilter(e.target.value as "All" | "Yes" | "No")}
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
                          onClick={() => router.push(`/stocks/${stock.id}`)}
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
                      onClick={() => router.push(`/stocks/${stock.id}`)}
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
                    <th className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={allSelected} onChange={() => {}} onClick={toggleAll} className="rounded border-zinc-300" />
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Ticker</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Sector</th>
                    <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Valuation</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-600 dark:text-zinc-400">Thesis</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Price</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data ? (
                    <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
                  ) : filteredStocks.length > 0 ? (
                    filteredStocks.map((stock) => (
                      <tr
                        key={stock.id}
                        className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                          selectedIds.has(stock.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                        }`}
                        onClick={() => router.push(`/stocks/${stock.id}`)}
                      >
                        <td className="px-4 py-3" onClick={(e) => toggleOne(e, stock.id)}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(stock.id)}
                            onChange={() => {}}
                            className="rounded border-zinc-300"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{stock.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{stock.ticker}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{stock.sector ?? "—"}</td>
                        <td className="px-4 py-3">
                          <ValuationPill value={stock.valuation_view} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {stock.investment_thesis
                            ? <span className="text-base text-green-500" title="Has thesis">✓</span>
                            : <span className="text-base text-zinc-300 dark:text-zinc-600" title="No thesis">✗</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">{formatPrice(stock.price)}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingStock(stock); setModalOpen(true); }}
                              className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(e, stock)}
                              className={`rounded px-2.5 py-1 text-xs font-medium ${
                                confirmingDelete[stock.id]
                                  ? "bg-red-600 text-white hover:bg-red-700"
                                  : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                              }`}
                            >
                              {confirmingDelete[stock.id] ? "Confirm?" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >Previous</button>
                  <span className="flex items-center px-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Page {data.meta.current_page} of {data.meta.last_page}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
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

      {/* Bulk edit modal */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBulkEditOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bulk Edit</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Editing {selectedIds.size} stock{selectedIds.size !== 1 ? "s" : ""}. Only filled fields will be updated.
            </p>
            {bulkEditError && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{bulkEditError}</div>
            )}
            <form onSubmit={handleBulkEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Valuation Perspective</label>
                <select
                  value={bulkValuation}
                  onChange={(e) => setBulkValuation(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">— No change —</option>
                  {(["Undervalued", "Fair Value", "Overvalued", "Unknown"] as ValuationView[]).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Originated By</label>
                <input
                  type="text"
                  value={bulkOriginatedBy}
                  onChange={(e) => setBulkOriginatedBy(e.target.value)}
                  placeholder="Team member name"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Regenerate embeddings */}
              <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                {bulkRegenDone ? (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Embeddings regenerated for {selectedIds.size} stock{selectedIds.size !== 1 ? "s" : ""}.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleBulkRegen}
                    disabled={bulkRegenLoading}
                    className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                  >
                    {bulkRegenLoading ? "Regenerating…" : `Regenerate Embeddings (${selectedIds.size})`}
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setBulkEditOpen(false)} className="rounded px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" disabled={bulkEditSaving} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {bulkEditSaving ? "Saving…" : "Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
