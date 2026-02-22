"use client";

import { useState, useEffect, FormEvent } from "react";
import { Stock, StockPayload, ValuationView } from "@/types/stock";
import { createStock, updateStock } from "@/lib/api";

type Tab = "basics" | "investment" | "details";

const TAB_LABELS: Record<Tab, string> = {
  basics:     "Basics",
  investment: "Investment Case",
  details:    "Details",
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
};

const EMPTY: FormState = {
  name: "", ticker: "", sector: "", price: "", market_cap: "",
  investment_thesis: "", valuation_view: "",
  originated_by: "",
  description: "", notes: "", tags: "",
};

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
    } else {
      setForm(EMPTY);
    }
  }, [stock, initialTab]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const filledCount = (t: Tab) =>
    TAB_FIELDS[t].filter((f) => form[f] !== "").length;

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
