"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stock, ValuationView } from "@/types/stock";
import { getStock, deleteStock, generateEmbeddings } from "@/lib/api";
import StockModal from "@/components/StockModal";

// ── Valuation badge config ─────────────────────────────────────────────────

const VALUATION_STYLES: Record<ValuationView, string> = {
  Undervalued: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "Fair Value": "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  Overvalued:  "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  Unknown:     "bg-gray-100 text-gray-600 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

function ValuationBadge({ value, large = false }: { value: ValuationView | null; large?: boolean }) {
  if (!value) return null;
  return (
    <span className={`inline-block rounded-full font-semibold ${large ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"} ${VALUATION_STYLES[value]}`}>
      {value}
    </span>
  );
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${Number(price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function describeContext(qs: string): string {
  if (!qs) return "Stocks";
  const p = new URLSearchParams(qs);
  const q = p.get("q");
  const valuation = p.get("valuation");
  const hasThesis = p.get("hasThesis");
  const search = p.get("search");
  if (q) return `Search: "${q}"`;
  if (valuation) return `${valuation} stocks`;
  if (hasThesis === "No") return "Missing thesis";
  if (hasThesis === "Yes") return "Stocks with thesis";
  if (search) return `"${search}"`;
  return "Stocks";
}

// ── Inner content (needs useSearchParams → must be inside Suspense) ────────

function StockDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const searchParams = useSearchParams();

  const fromSearch = searchParams.get("from") ?? "";
  const backHref   = `/stocks${fromSearch}`;

  const [stock, setStock]           = useState<Stock | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [modalTab, setModalTab]     = useState<"basics" | "investment" | "details" | "members">("basics");
  const [confirming, setConfirming] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenDone, setRegenDone]       = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const s = await getStock(Number(id));
      setStock(s);
    } catch {
      setError("Stock not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openEdit(tab: "basics" | "investment" | "details" | "members" = "basics") {
    setModalTab(tab);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await deleteStock(Number(id));
    router.push(fromSearch ? `/stocks${fromSearch}` : "/stocks");
  }

  async function handleRegenEmbedding() {
    setRegenLoading(true);
    try {
      await generateEmbeddings([Number(id)]);
      setRegenDone(true);
      load();
    } finally {
      setRegenLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">{error ?? "Stock not found."}</p>
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          ← {describeContext(fromSearch)}
        </Link>
      </div>
    );
  }

  const hasNotes = stock.description || stock.notes || (stock.tags && stock.tags.length > 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href={backHref} className="hover:text-zinc-800 dark:hover:text-zinc-200">
            ← {describeContext(fromSearch)}
          </Link>
          <span>›</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{stock.ticker}</span>
          <span className="text-zinc-400">({stock.name})</span>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stock.name}</h1>
              <span className="rounded bg-zinc-100 px-2.5 py-1 font-mono text-lg font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {stock.ticker}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              {stock.sector && <span>{stock.sector}</span>}
              {stock.price != null && <span>·</span>}
              {stock.price != null && <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatPrice(stock.price)}</span>}
              {stock.market_cap_formatted && <span>·</span>}
              {stock.market_cap_formatted && <span>{stock.market_cap_formatted} mkt cap</span>}
            </div>
            {stock.valuation_view && (
              <div className="mt-3">
                <ValuationBadge value={stock.valuation_view} large />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => openEdit("basics")}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className={`rounded px-4 py-2 text-sm font-medium ${
                confirming
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-zinc-300 bg-white text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-red-900/20"
              }`}
            >
              {confirming ? "Confirm Delete?" : "Delete"}
            </button>
          </div>
        </div>

        {/* ── Investment Thesis ─────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Investment Thesis</h2>
          </div>
          <div className="px-6 py-5">
            {stock.investment_thesis ? (
              <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{stock.investment_thesis}</p>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800/40 dark:bg-yellow-900/10">
                <span className="mt-0.5 shrink-0 text-yellow-500">⚠</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Missing Investment Thesis</p>
                  <p className="mt-0.5 text-sm text-yellow-700 dark:text-yellow-500">
                    This stock won&apos;t be discoverable by agents until a thesis is added.
                  </p>
                  <button
                    onClick={() => openEdit("investment")}
                    className="mt-2 text-sm font-medium text-yellow-800 underline hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                  >
                    Add Thesis →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Company Overview ──────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Company Overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 sm:grid-cols-3">
            {[
              { label: "Sector",     value: stock.sector ?? "—" },
              { label: "Price",      value: formatPrice(stock.price) },
              { label: "Market Cap", value: stock.market_cap_formatted ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white px-5 py-4 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Additional Notes ──────────────────────────────────────────────── */}
        {hasNotes && (
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Additional Notes</h2>
            </div>
            <div className="space-y-4 px-6 py-5">
              {stock.description && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Description</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{stock.description}</p>
                </div>
              )}
              {stock.notes && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Notes</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{stock.notes}</p>
                </div>
              )}
              {stock.tags && stock.tags.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stock.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Originated By ─────────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Originated By
              {stock.originating_members && stock.originating_members.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">
                  {stock.originating_members.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => openEdit("members")}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage links →
            </button>
          </div>
          <div className="px-6 py-5">
            {!stock.originating_members || stock.originating_members.length === 0 ? (
              <p className="text-sm text-zinc-400">No originators linked yet.</p>
            ) : (
              <div className="space-y-2">
                {stock.originating_members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <Link
                      href={`/members/${member.id}`}
                      className="flex-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {member.name}
                    </Link>
                    {member.company && (
                      <span className="text-xs text-zinc-400">{member.company}</span>
                    )}
                    {member.note && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        {member.note}
                      </span>
                    )}
                    <Link href={`/members/${member.id}`} className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Community Discussion ──────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Community Discussion
              {stock.commenting_members && stock.commenting_members.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">
                  {stock.commenting_members.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => openEdit("members")}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage links →
            </button>
          </div>
          <div className="px-6 py-5">
            {!stock.commenting_members || stock.commenting_members.length === 0 ? (
              <p className="text-sm text-zinc-400">No commenters linked yet.</p>
            ) : (
              <div className="space-y-2">
                {stock.commenting_members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <Link
                      href={`/members/${member.id}`}
                      className="flex-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {member.name}
                    </Link>
                    {member.company && (
                      <span className="text-xs text-zinc-400">{member.company}</span>
                    )}
                    {member.note && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        {member.note}
                      </span>
                    )}
                    <Link href={`/members/${member.id}`} className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Research Tracking ─────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Research Tracking</h2>
          </div>
          <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 sm:grid-cols-3">
            {[
              { label: "Originated By", value: stock.originated_by ?? "—" },
              { label: "Date Added",    value: stock.date_added ?? "—" },
              { label: "Last Reviewed", value: stock.last_reviewed ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white px-5 py-4 dark:bg-zinc-900">
                <p className="text-xs font-medium text-zinc-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
              </div>
            ))}
          </div>

          {/* Embedding warning */}
          {!stock.has_embedding && (
            <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800/40 dark:bg-yellow-900/10">
                <span className="mt-0.5 shrink-0 text-yellow-500">⚠</span>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    Embedding missing — this stock won&apos;t surface in semantic search.
                  </p>
                  {regenDone ? (
                    <p className="mt-1 text-sm font-medium text-green-700 dark:text-green-400">Embedding regenerated successfully.</p>
                  ) : (
                    <button
                      onClick={handleRegenEmbedding}
                      disabled={regenLoading}
                      className="mt-2 text-sm font-medium text-yellow-800 underline hover:text-yellow-900 disabled:opacity-50 dark:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      {regenLoading ? "Regenerating…" : "Regenerate Now →"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Edit modal */}
      {modalOpen && (
        <StockModal
          stock={stock}
          initialTab={modalTab}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Page (Suspense wrapper required for useSearchParams) ───────────────────

export default function StockDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-zinc-500">Loading…</p>
        </div>
      }
    >
      <StockDetailContent />
    </Suspense>
  );
}
