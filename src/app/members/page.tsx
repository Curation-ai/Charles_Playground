"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Member, INVESTOR_TYPES, MemberSearchResult } from "@/types/member";
import { PaginatedResponse, SearchMode } from "@/types/stock";
import { getMembers, deleteMember, searchMembers } from "@/lib/members-api";
import MemberModal from "@/components/MemberModal";

// ── Suspense wrapper ───────────────────────────────────────────────────────

export default function MembersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <MembersPageContent />
    </Suspense>
  );
}

// ── Page content ───────────────────────────────────────────────────────────

function MembersPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Browse state ──────────────────────────────────────────────────────────
  const [data, setData]                 = useState<PaginatedResponse<Member> | null>(null);
  const [browseSearch, setBrowseSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage]                 = useState(parseInt(searchParams.get("page") ?? "1", 10));
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter]     = useState(searchParams.get("type") ?? "All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">(
    (searchParams.get("status") ?? "All") as "All" | "Active" | "Inactive"
  );
  const [hasStocksFilter, setHasStocksFilter] = useState<"All" | "Yes" | "No">(
    (searchParams.get("hasStocks") ?? "All") as "All" | "Yes" | "No"
  );

  // Expandable row
  const [expandedId, setExpandedId] = useState<number | null>(
    parseInt(searchParams.get("expanded") ?? "0", 10) || null
  );

  // Modal
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingId, setDeletingId]       = useState<number | null>(null);

  // ── AI Search state ───────────────────────────────────────────────────────
  const [aiQuery, setAiQuery]                   = useState(searchParams.get("q") ?? "");
  const [aiMode, setAiMode]                     = useState<SearchMode>((searchParams.get("mode") ?? "hybrid") as SearchMode);
  const [searchResults, setSearchResults]       = useState<MemberSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [searchError, setSearchError]           = useState<string | null>(null);

  const searchActive = searchResults !== null;
  const lastSearchedRef = useRef<string | null>(null);

  // ── URL update helper ─────────────────────────────────────────────────────
  const updateURL = useCallback((updates: {
    search?:    string;
    page?:      number;
    type?:      string;
    status?:    string;
    hasStocks?: string;
    q?:         string;
    mode?:      string;
    expanded?:  number | null;
  }) => {
    const params = new URLSearchParams(window.location.search);

    if (updates.search !== undefined) {
      updates.search ? params.set("search", updates.search) : params.delete("search");
    }
    if (updates.page !== undefined) {
      updates.page > 1 ? params.set("page", String(updates.page)) : params.delete("page");
    }
    if (updates.type !== undefined) {
      updates.type && updates.type !== "All" ? params.set("type", updates.type) : params.delete("type");
    }
    if (updates.status !== undefined) {
      updates.status && updates.status !== "All" ? params.set("status", updates.status) : params.delete("status");
    }
    if (updates.hasStocks !== undefined) {
      updates.hasStocks && updates.hasStocks !== "All" ? params.set("hasStocks", updates.hasStocks) : params.delete("hasStocks");
    }
    if (updates.q !== undefined) {
      updates.q ? params.set("q", updates.q) : params.delete("q");
    }
    if (updates.mode !== undefined) {
      updates.mode && updates.mode !== "hybrid" ? params.set("mode", updates.mode) : params.delete("mode");
    }
    if (updates.expanded !== undefined) {
      updates.expanded != null ? params.set("expanded", String(updates.expanded)) : params.delete("expanded");
    }

    const qs = params.toString();
    router.replace(`/members${qs ? `?${qs}` : ""}`);
  }, [router]);

  // ── Sync state from URL (browser back / forward) ──────────────────────────
  useEffect(() => {
    const q    = searchParams.get("q") ?? "";
    const mode = (searchParams.get("mode") ?? "hybrid") as SearchMode;

    setBrowseSearch(searchParams.get("search") ?? "");
    setPage(parseInt(searchParams.get("page") ?? "1", 10));
    setTypeFilter(searchParams.get("type") ?? "All");
    setStatusFilter((searchParams.get("status") ?? "All") as "All" | "Active" | "Inactive");
    setHasStocksFilter((searchParams.get("hasStocks") ?? "All") as "All" | "Yes" | "No");
    setExpandedId(parseInt(searchParams.get("expanded") ?? "0", 10) || null);
    setAiQuery(q);
    setAiMode(mode);

    if (q && q !== lastSearchedRef.current) {
      runSearch(q, mode, false);
    }
    if (!q && lastSearchedRef.current) {
      lastSearchedRef.current = null;
      setSearchResults(null);
      setSearchError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Browse data fetch ─────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMembers(browseSearch || undefined, page);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [browseSearch, page]);

  useEffect(() => {
    if (!searchActive) fetchMembers();
  }, [fetchMembers, searchActive]);

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
  const filteredMembers = (data?.data ?? []).filter((m) => {
    if (typeFilter !== "All" && m.investor_type !== typeFilter) return false;
    if (statusFilter === "Active" && !m.is_active) return false;
    if (statusFilter === "Inactive" && m.is_active) return false;
    if (hasStocksFilter === "Yes" && m.stocks_count === 0) return false;
    if (hasStocksFilter === "No" && m.stocks_count > 0) return false;
    return true;
  });

  // ── Stats bar computations ────────────────────────────────────────────────
  const pageMembers   = data?.data ?? [];
  const activeCount   = pageMembers.filter((m) => m.is_active).length;
  const linkedCount   = pageMembers.filter((m) => m.stocks_count > 0).length;
  const hasBioCount   = pageMembers.filter((m) => m.bio).length;

  // Top investment_focus tags across the page
  const focusCounts: Record<string, number> = {};
  for (const m of pageMembers) {
    for (const f of m.investment_focus ?? []) {
      focusCounts[f] = (focusCounts[f] ?? 0) + 1;
    }
  }
  const topFocus = Object.entries(focusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── AI Search ─────────────────────────────────────────────────────────────
  async function runSearch(q: string, mode: SearchMode, updateUrl = true) {
    lastSearchedRef.current = q;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);

    if (updateUrl) updateURL({ q, mode });

    try {
      const res = await searchMembers(q, mode);
      setSearchResults(res.results as MemberSearchResult[]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSearch() {
    const q = aiQuery.trim();
    if (!q) return;
    await runSearch(q, aiMode);
  }

  function handleClearSearch() {
    lastSearchedRef.current = null;
    setAiQuery("");
    setSearchResults(null);
    setSearchError(null);
    updateURL({ q: "" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  function handleModeChange(mode: SearchMode) {
    setAiMode(mode);
    updateURL({ mode });
  }

  // ── Filter / page change handlers ─────────────────────────────────────────
  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
    updateURL({ type: value, page: 1 });
  }

  function handleStatusChange(value: "All" | "Active" | "Inactive") {
    setStatusFilter(value);
    setPage(1);
    updateURL({ status: value, page: 1 });
  }

  function handleHasStocksChange(value: "All" | "Yes" | "No") {
    setHasStocksFilter(value);
    setPage(1);
    updateURL({ hasStocks: value, page: 1 });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateURL({ page: newPage });
  }

  // ── Expandable row ────────────────────────────────────────────────────────
  function handleToggleExpand(id: number) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    updateURL({ expanded: next });
  }

  function goToDetail(memberId: number) {
    router.push(`/members/${memberId}?from=${encodeURIComponent(window.location.search)}`);
  }

  function handleEdit(member: Member) {
    setEditingMember(member);
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (deletingId !== id) { setDeletingId(id); return; }
    await deleteMember(id);
    setDeletingId(null);
    fetchMembers();
  }

  const colSpan = 7;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Members</h1>
          <button
            onClick={() => { setEditingMember(null); setModalOpen(true); }}
            className="whitespace-nowrap rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Member
          </button>
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
                placeholder="e.g. 'healthcare investors in London', 'fund managers focused on tech'"
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
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    aiMode === m
                      ? "bg-blue-600 text-white"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

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
              placeholder="Filter by name, company or job title…"
              value={browseSearch}
              onChange={(e) => handleBrowseSearchChange(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="All">All</option>
                {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as "All" | "Active" | "Inactive")}
                className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {["All", "Active", "Inactive"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Has Stocks:</label>
              <select
                value={hasStocksFilter}
                onChange={(e) => handleHasStocksChange(e.target.value as "All" | "Yes" | "No")}
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
        {!searchActive && data && pageMembers.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              {data.meta.total} member{data.meta.total !== 1 ? "s" : ""}
            </span>

            <span className="text-zinc-300 dark:text-zinc-700">|</span>

            <button
              onClick={() => handleStatusChange(statusFilter === "Active" ? "All" : "Active")}
              className={`transition-colors hover:text-zinc-700 dark:hover:text-zinc-200 ${
                statusFilter === "Active"
                  ? "font-semibold text-green-700 dark:text-green-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {activeCount} active
            </button>

            <button
              onClick={() => handleHasStocksChange(hasStocksFilter === "Yes" ? "All" : "Yes")}
              className={`transition-colors hover:text-zinc-700 dark:hover:text-zinc-200 ${
                hasStocksFilter === "Yes"
                  ? "font-semibold text-blue-700 dark:text-blue-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {linkedCount} linked to stocks
            </button>

            <span className="text-zinc-500 dark:text-zinc-400">
              {hasBioCount} with bio
            </span>

            {topFocus.length > 0 && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {topFocus.map(([focus, count]) => (
                    <button
                      key={focus}
                      onClick={() => {
                        const q = focus;
                        setAiQuery(q);
                        runSearch(q, aiMode);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-800 transition-opacity hover:opacity-80 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {focus} <span className="opacity-70">{count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Search results ────────────────────────────────────────────────── */}
        {searchActive && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {searchLoading ? (
              <div className="flex items-center justify-center py-16 text-zinc-400">Searching…</div>
            ) : searchResults && searchResults.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
                No members found for &quot;{aiQuery}&quot;.
              </div>
            ) : searchResults ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Job Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Focus</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Relevance</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => goToDetail(member.id)}
                      className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{member.name}</div>
                        {member.email && (
                          <div className="text-xs text-zinc-400">{member.email}</div>
                        )}
                        {!member.is_active && (
                          <span className="mt-0.5 inline-block rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{member.company ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{member.job_title ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(member.investment_focus ?? []).slice(0, 3).map((f) => (
                            <span key={f} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {member.similarity != null ? (
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {Math.round(member.similarity * 100)}%
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}

        {/* ── Browse table ──────────────────────────────────────────────────── */}
        {!searchActive && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-zinc-400">Loading…</div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
                <p className="text-sm">
                  {browseSearch || typeFilter !== "All" || statusFilter !== "All" || hasStocksFilter !== "All"
                    ? "No members match your filters."
                    : "No members yet."}
                </p>
                {!browseSearch && typeFilter === "All" && statusFilter === "All" && hasStocksFilter === "All" && (
                  <button
                    onClick={() => { setEditingMember(null); setModalOpen(true); }}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Add your first member
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <th className="w-6 px-4 py-3" />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Focus / Tags</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Stocks</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const isExpanded = expandedId === member.id;
                    const allFocusTags = [
                      ...(member.investment_focus ?? []).map((f) => ({ label: f, type: "focus" as const })),
                      ...(member.tags ?? []).map((t) => ({ label: t, type: "tag" as const })),
                    ];

                    return (
                      <>
                        <tr
                          key={member.id}
                          className="border-b border-zinc-100 dark:border-zinc-800"
                        >
                          {/* Expand toggle */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleExpand(member.id)}
                              className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          </td>

                          {/* Name */}
                          <td
                            className="cursor-pointer px-4 py-3"
                            onClick={() => goToDetail(member.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400">
                                {member.name}
                              </span>
                              {!member.is_active && (
                                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {member.company && (
                              <div className="text-xs text-zinc-400">{member.company}</div>
                            )}
                            {!member.company && member.job_title && (
                              <div className="text-xs text-zinc-400">{member.job_title}</div>
                            )}
                          </td>

                          {/* Investor type */}
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {member.investor_type ?? "—"}
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {member.location ?? "—"}
                          </td>

                          {/* Focus / Tags */}
                          <td className="px-4 py-3">
                            {allFocusTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allFocusTags.slice(0, 4).map(({ label, type }) => (
                                  <span
                                    key={`${type}-${label}`}
                                    className={`rounded-full px-2 py-0.5 text-xs ${
                                      type === "focus"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}
                                  >
                                    {label}
                                  </span>
                                ))}
                                {allFocusTags.length > 4 && (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800">
                                    +{allFocusTags.length - 4}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">—</span>
                            )}
                          </td>

                          {/* Stocks count */}
                          <td className="px-4 py-3 text-center">
                            {member.stocks_count > 0 ? (
                              <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {member.stocks_count}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(member)}
                                className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                className={`rounded px-2.5 py-1 text-xs font-medium ${
                                  deletingId === member.id
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "border border-zinc-300 text-red-500 hover:bg-red-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                }`}
                              >
                                {deletingId === member.id ? "Confirm?" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExpanded && (
                          <tr key={`${member.id}-expanded`} className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30">
                            <td />
                            <td colSpan={colSpan - 1} className="px-4 py-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                                {/* Bio preview */}
                                {member.bio && (
                                  <div className="flex-1">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Bio</p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                      {member.bio.length > 200 ? `${member.bio.slice(0, 200)}…` : member.bio}
                                    </p>
                                  </div>
                                )}

                                {/* Details column */}
                                <div className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:min-w-[180px]">
                                  {member.investor_type && (
                                    <div><span className="font-semibold">Type:</span> {member.investor_type}</div>
                                  )}
                                  {member.location && (
                                    <div><span className="font-semibold">Location:</span> {member.location}</div>
                                  )}
                                  {member.last_contact_date && (
                                    <div><span className="font-semibold">Last contact:</span> {member.last_contact_date}</div>
                                  )}
                                  {member.investment_focus && member.investment_focus.length > 0 && (
                                    <div>
                                      <p className="mb-1 font-semibold">Investment focus:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {member.investment_focus.map((f) => (
                                          <span key={f} className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                            {f}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold">Stocks:</span>{" "}
                                    {member.stocks_count > 0
                                      ? `${member.stocks_count} linked`
                                      : "none linked"}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 sm:items-end">
                                  <button
                                    onClick={() => goToDetail(member.id)}
                                    className="whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                  >
                                    View Full Details →
                                  </button>
                                  <button
                                    onClick={() => handleEdit(member)}
                                    className="whitespace-nowrap rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination */}
        {!searchActive && data && data.meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← Previous
            </button>
            <span>Page {page} of {data.meta.last_page}</span>
            <button
              onClick={() => handlePageChange(Math.min(data.meta.last_page, page + 1))}
              disabled={page === data.meta.last_page}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <MemberModal
          member={editingMember}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchMembers(); }}
        />
      )}
    </div>
  );
}
