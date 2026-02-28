"use client";

import { useState, useEffect, FormEvent } from "react";
import { Stock, StockPayload, ValuationView } from "@/types/stock";
import { createStock, updateStock } from "@/lib/api";
import { getMembers } from "@/lib/members-api";
import { Member } from "@/types/member";

type Tab = "basics" | "investment" | "details" | "members";

const TAB_LABELS: Record<Tab, string> = {
  basics:     "Basics",
  investment: "Investment Case",
  details:    "Details",
  members:    "Members",
};

const VALUATION_OPTIONS: ValuationView[] = ["Undervalued", "Fair Value", "Overvalued", "Unknown"];

interface FormState {
  name: string;
  ticker: string;
  sector: string;
  price: string;
  market_cap: string;
  investment_thesis: string;
  valuation_view: string;
  originated_by: string;
  description: string;
  notes: string;
  tags: string;
}

const TAB_FIELDS: Record<Tab, (keyof FormState)[]> = {
  basics:     ["name", "ticker", "sector", "price", "market_cap"],
  investment: ["investment_thesis", "valuation_view"],
  details:    ["description", "notes", "tags"],
  members:    [],
};

const EMPTY: FormState = {
  name: "", ticker: "", sector: "", price: "", market_cap: "",
  investment_thesis: "", valuation_view: "",
  originated_by: "",
  description: "", notes: "", tags: "",
};

type MemberLink = { member_id: number; name: string; company: string | null; note: string };

export interface StockModalProps {
  stock: Stock | null;
  onClose: () => void;
  onSaved: () => void;
  initialTab?: Tab;
}

export default function StockModal({ stock, onClose, onSaved, initialTab }: StockModalProps) {
  const isEdit = !!stock;
  const [tab, setTab]       = useState<Tab>(initialTab ?? "basics");
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Originating member links
  const [originatingLinks, setOriginatingLinks]         = useState<MemberLink[]>([]);
  const [originatingSearch, setOriginatingSearch]       = useState("");
  const [originatingResults, setOriginatingResults]     = useState<Member[]>([]);
  const [searchingOriginating, setSearchingOriginating] = useState(false);

  // Commenting member links
  const [commentingLinks, setCommentingLinks]           = useState<MemberLink[]>([]);
  const [commentingSearch, setCommentingSearch]         = useState("");
  const [commentingResults, setCommentingResults]       = useState<Member[]>([]);
  const [searchingCommenting, setSearchingCommenting]   = useState(false);

  useEffect(() => {
    setTab(initialTab ?? "basics");
    setError(null);
    if (stock) {
      setForm({
        name:               stock.name ?? "",
        ticker:             stock.ticker ?? "",
        sector:             stock.sector ?? "",
        price:              stock.price != null ? String(stock.price) : "",
        market_cap:         stock.market_cap != null ? String(stock.market_cap) : "",
        investment_thesis:  stock.investment_thesis ?? "",
        valuation_view:     stock.valuation_view ?? "",
        originated_by:      stock.originated_by ?? "",
        description:        stock.description ?? "",
        notes:              stock.notes ?? "",
        tags:               stock.tags?.join(", ") ?? "",
      });
      setOriginatingLinks(
        (stock.originating_members ?? []).map((m) => ({
          member_id: m.id, name: m.name, company: m.company, note: m.note ?? "",
        }))
      );
      setCommentingLinks(
        (stock.commenting_members ?? []).map((m) => ({
          member_id: m.id, name: m.name, company: m.company, note: m.note ?? "",
        }))
      );
    } else {
      setForm(EMPTY);
      setOriginatingLinks([]);
      setCommentingLinks([]);
    }
    setOriginatingSearch(""); setOriginatingResults([]);
    setCommentingSearch(""); setCommentingResults([]);
  }, [stock, initialTab]);

  // Originating member search debounce
  useEffect(() => {
    if (!originatingSearch.trim()) { setOriginatingResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingOriginating(true);
      try {
        const res = await getMembers(originatingSearch);
        setOriginatingResults(res.data.filter(
          (m) => !originatingLinks.some((l) => l.member_id === m.id) && !commentingLinks.some((l) => l.member_id === m.id)
        ));
      } finally {
        setSearchingOriginating(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [originatingSearch, originatingLinks, commentingLinks]);

  // Commenting member search debounce
  useEffect(() => {
    if (!commentingSearch.trim()) { setCommentingResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingCommenting(true);
      try {
        const res = await getMembers(commentingSearch);
        setCommentingResults(res.data.filter(
          (m) => !commentingLinks.some((l) => l.member_id === m.id) && !originatingLinks.some((l) => l.member_id === m.id)
        ));
      } finally {
        setSearchingCommenting(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [commentingSearch, commentingLinks, originatingLinks]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const filledCount = (t: Tab) => {
    if (t === "members") return originatingLinks.length + commentingLinks.length;
    return TAB_FIELDS[t].filter((f) => form[f] !== "").length;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload: StockPayload = {
      name:        form.name,
      ticker:      form.ticker.toUpperCase(),
      sector:      form.sector || null,
      description: form.description || null,
      notes:       form.notes || null,
      price:       form.price ? Number(form.price) : null,
      market_cap:  form.market_cap ? Number(form.market_cap) : null,
      tags:        form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      metadata: {
        investment_thesis: form.investment_thesis || null,
        valuation_view:    (form.valuation_view as ValuationView) || null,
        originated_by:     form.originated_by || null,
      },
      originating_member_links: originatingLinks.map((l) => ({ member_id: l.member_id, note: l.note || undefined })),
      commenting_member_links:  commentingLinks.map((l) => ({ member_id: l.member_id, note: l.note || undefined })),
    };
    try {
      if (isEdit) await updateStock(stock.id, payload);
      else await createStock(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEdit ? `Edit — ${stock.ticker}` : "Add Stock"}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
            const count = filledCount(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {TAB_LABELS[t]}
                {count > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>
            )}

            {/* ── Basics ── */}
            {tab === "basics" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name *" name="name" value={form.name} onChange={handle} required />
                  <Field label="Ticker *" name="ticker" value={form.ticker} onChange={handle} required placeholder="e.g. AAPL" style={{ textTransform: "uppercase" }} />
                </div>
                <Field label="Sector" name="sector" value={form.sector} onChange={handle} placeholder="e.g. Technology" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price ($)" name="price" value={form.price} onChange={handle} type="number" step="0.01" min="0" />
                  <Field label="Market Cap" name="market_cap" value={form.market_cap} onChange={handle} type="number" min="0" />
                </div>
              </>
            )}

            {/* ── Investment Case ── */}
            {tab === "investment" && (
              <>
                <Textarea
                  label="Investment Thesis"
                  name="investment_thesis"
                  value={form.investment_thesis}
                  onChange={handle}
                  rows={5}
                  placeholder="Why we like this stock — what's the core opportunity, competitive moat, and key catalyst?"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Valuation Perspective</label>
                  <select
                    name="valuation_view"
                    value={form.valuation_view}
                    onChange={handle}
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">— Select —</option>
                    {VALUATION_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                {!isEdit && (
                  <Field label="Originated By" name="originated_by" value={form.originated_by} onChange={handle} placeholder="Team member who identified this opportunity" />
                )}
              </>
            )}

            {/* ── Details ── */}
            {tab === "details" && (
              <>
                <Textarea label="Description" name="description" value={form.description} onChange={handle} rows={3} />
                <Textarea label="Notes" name="notes" value={form.notes} onChange={handle} rows={3} />
                <Field label="Tags" name="tags" value={form.tags} onChange={handle} placeholder="mega-cap, dividend, sp500" />
                <p className="text-xs text-zinc-400">Separate tags with commas.</p>
              </>
            )}

            {/* ── Members ── */}
            {tab === "members" && (
              <div className="space-y-6">
                {/* Originators */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Originated By
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">— members who first raised this stock</span>
                  </h3>
                  <MemberSearch
                    value={originatingSearch}
                    onChange={setOriginatingSearch}
                    results={originatingResults}
                    searching={searchingOriginating}
                    onAdd={(m) => { setOriginatingLinks((p) => [...p, { member_id: m.id, name: m.name, company: m.company, note: "" }]); setOriginatingSearch(""); setOriginatingResults([]); }}
                  />
                  <MemberLinkList
                    links={originatingLinks}
                    onRemove={(id) => setOriginatingLinks((p) => p.filter((l) => l.member_id !== id))}
                    onNoteChange={(id, note) => setOriginatingLinks((p) => p.map((l) => l.member_id === id ? { ...l, note } : l))}
                    emptyText="No originators linked yet."
                  />
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800" />

                {/* Commenters */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Community Discussion
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">— members who have commented on this stock</span>
                  </h3>
                  <MemberSearch
                    value={commentingSearch}
                    onChange={setCommentingSearch}
                    results={commentingResults}
                    searching={searchingCommenting}
                    onAdd={(m) => { setCommentingLinks((p) => [...p, { member_id: m.id, name: m.name, company: m.company, note: "" }]); setCommentingSearch(""); setCommentingResults([]); }}
                  />
                  <MemberLinkList
                    links={commentingLinks}
                    onRemove={(id) => setCommentingLinks((p) => p.filter((l) => l.member_id !== id))}
                    onNoteChange={(id, note) => setCommentingLinks((p) => p.map((l) => l.member_id === id ? { ...l, note } : l))}
                    emptyText="No commenters linked yet."
                  />
                </div>
              </div>
            )}

            {/* Read-only tracking strip — edit mode only, always visible */}
            {isEdit && (
              <div className="mt-2 rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Research Tracking</p>
                <div className="flex flex-wrap gap-6">
                  {stock.originated_by && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Originated By</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{stock.originated_by}</p>
                    </div>
                  )}
                  {stock.date_added && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Added</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{stock.date_added}</p>
                    </div>
                  )}
                  {stock.last_reviewed && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Last Reviewed</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{stock.last_reviewed}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div className="flex gap-1">
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`h-1.5 w-6 rounded-full transition-colors ${tab === t ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
              <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MemberSearch({
  value, onChange, results, searching, onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  results: Member[];
  searching: boolean;
  onAdd: (m: Member) => void;
}) {
  return (
    <div className="mb-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type name or company…"
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {searching && <div className="absolute right-3 top-2.5 text-xs text-zinc-400">Searching…</div>}
      </div>
      {results.length > 0 && (
        <div className="mt-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {results.slice(0, 8).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onAdd(m)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{m.name}</span>
              {m.company && <span className="text-zinc-400">{m.company}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberLinkList({
  links, onRemove, onNoteChange, emptyText,
}: {
  links: MemberLink[];
  onRemove: (id: number) => void;
  onNoteChange: (id: number, note: string) => void;
  emptyText: string;
}) {
  if (links.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.member_id} className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <span className="flex-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">{link.name}</span>
          {link.company && <span className="shrink-0 text-xs text-zinc-400">{link.company}</span>}
          <input
            type="text"
            value={link.note}
            onChange={(e) => onNoteChange(link.member_id, e.target.value)}
            placeholder="Note (optional)"
            className="w-36 shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <button type="button" onClick={() => onRemove(link.member_id)} className="shrink-0 text-zinc-400 hover:text-red-500 dark:hover:text-red-400">✕</button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input {...props} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
    </div>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <textarea {...props} className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
    </div>
  );
}
