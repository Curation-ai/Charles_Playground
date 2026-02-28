"use client";

import { useState, useEffect, FormEvent } from "react";
import { Member, MemberPayload, StockLink, INVESTOR_TYPES } from "@/types/member";
import { createMember, updateMember } from "@/lib/members-api";
import { getStocks } from "@/lib/api";
import { Stock } from "@/types/stock";

type Tab = "profile" | "stocks";

const TAB_LABELS: Record<Tab, string> = {
  profile: "Profile",
  stocks:  "Stocks",
};

interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  twitter_handle: string;
  company: string;
  job_title: string;
  bio: string;
  tags: string;
  notes: string;
  investor_type: string;
  investment_focus: string;
  location: string;
  last_contact_date: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: "", email: "", phone: "", linkedin_url: "", twitter_handle: "",
  company: "", job_title: "", bio: "", tags: "", notes: "",
  investor_type: "", investment_focus: "", location: "", last_contact_date: "", is_active: true,
};

type StockLinkWithMeta = StockLink & { name: string; ticker: string };

export interface MemberModalProps {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
  initialTab?: Tab;
}

export default function MemberModal({ member, onClose, onSaved, initialTab }: MemberModalProps) {
  const isEdit = !!member;
  const [tab, setTab]       = useState<Tab>(initialTab ?? "profile");
  const [form, setForm]     = useState<FormState>(EMPTY);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Originated stock links
  const [originatedLinks, setOriginatedLinks]             = useState<StockLinkWithMeta[]>([]);
  const [originatedSearch, setOriginatedSearch]           = useState("");
  const [originatedResults, setOriginatedResults]         = useState<Stock[]>([]);
  const [searchingOriginated, setSearchingOriginated]     = useState(false);

  // Commented stock links
  const [commentedLinks, setCommentedLinks]               = useState<StockLinkWithMeta[]>([]);
  const [commentedSearch, setCommentedSearch]             = useState("");
  const [commentedResults, setCommentedResults]           = useState<Stock[]>([]);
  const [searchingCommented, setSearchingCommented]       = useState(false);

  useEffect(() => {
    setTab(initialTab ?? "profile");
    setError(null);
    if (member) {
      setForm({
        name:             member.name ?? "",
        email:            member.email ?? "",
        phone:            member.phone ?? "",
        linkedin_url:     member.linkedin_url ?? "",
        twitter_handle:   member.twitter_handle ?? "",
        company:          member.company ?? "",
        job_title:        member.job_title ?? "",
        bio:              member.bio ?? "",
        tags:             member.tags?.join(", ") ?? "",
        notes:            member.notes ?? "",
        investor_type:    member.investor_type ?? "",
        investment_focus: member.investment_focus?.join(", ") ?? "",
        location:         member.location ?? "",
        last_contact_date: member.last_contact_date ?? "",
        is_active:        member.is_active ?? true,
      });
      setOriginatedLinks(
        member.originated_stocks.map((s) => ({ stock_id: s.id, note: s.note ?? "", name: s.name, ticker: s.ticker }))
      );
      setCommentedLinks(
        member.commented_stocks.map((s) => ({ stock_id: s.id, note: s.note ?? "", name: s.name, ticker: s.ticker }))
      );
    } else {
      setForm(EMPTY);
      setOriginatedLinks([]);
      setCommentedLinks([]);
    }
    setOriginatedSearch(""); setOriginatedResults([]);
    setCommentedSearch(""); setCommentedResults([]);
  }, [member, initialTab]);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked! : value }));
  };

  // Originated stock search debounce
  useEffect(() => {
    if (!originatedSearch.trim()) { setOriginatedResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingOriginated(true);
      try {
        const res = await getStocks(originatedSearch);
        setOriginatedResults(res.data.filter(
          (s) => !originatedLinks.some((l) => l.stock_id === s.id) && !commentedLinks.some((l) => l.stock_id === s.id)
        ));
      } finally {
        setSearchingOriginated(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [originatedSearch, originatedLinks, commentedLinks]);

  // Commented stock search debounce
  useEffect(() => {
    if (!commentedSearch.trim()) { setCommentedResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingCommented(true);
      try {
        const res = await getStocks(commentedSearch);
        setCommentedResults(res.data.filter(
          (s) => !commentedLinks.some((l) => l.stock_id === s.id) && !originatedLinks.some((l) => l.stock_id === s.id)
        ));
      } finally {
        setSearchingCommented(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [commentedSearch, commentedLinks, originatedLinks]);

  function addOriginated(stock: Stock) {
    setOriginatedLinks((prev) => [...prev, { stock_id: stock.id, name: stock.name, ticker: stock.ticker, note: "" }]);
    setOriginatedSearch(""); setOriginatedResults([]);
  }
  function removeOriginated(stockId: number) {
    setOriginatedLinks((prev) => prev.filter((l) => l.stock_id !== stockId));
  }
  function updateOriginatedNote(stockId: number, note: string) {
    setOriginatedLinks((prev) => prev.map((l) => l.stock_id === stockId ? { ...l, note } : l));
  }

  function addCommented(stock: Stock) {
    setCommentedLinks((prev) => [...prev, { stock_id: stock.id, name: stock.name, ticker: stock.ticker, note: "" }]);
    setCommentedSearch(""); setCommentedResults([]);
  }
  function removeCommented(stockId: number) {
    setCommentedLinks((prev) => prev.filter((l) => l.stock_id !== stockId));
  }
  function updateCommentedNote(stockId: number, note: string) {
    setCommentedLinks((prev) => prev.map((l) => l.stock_id === stockId ? { ...l, note } : l));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload: MemberPayload = {
      name:             form.name,
      email:            form.email || null,
      phone:            form.phone || null,
      linkedin_url:     form.linkedin_url || null,
      twitter_handle:   form.twitter_handle || null,
      company:          form.company || null,
      job_title:        form.job_title || null,
      bio:              form.bio || null,
      tags:             form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      notes:            form.notes || null,
      investor_type:    form.investor_type || null,
      investment_focus: form.investment_focus ? form.investment_focus.split(",").map((t) => t.trim()).filter(Boolean) : [],
      location:         form.location || null,
      last_contact_date: form.last_contact_date || null,
      is_active:        form.is_active,
      originated_links: originatedLinks.map((l) => ({ stock_id: l.stock_id, note: l.note || undefined })),
      commented_links:  commentedLinks.map((l) => ({ stock_id: l.stock_id, note: l.note || undefined })),
    };
    try {
      if (isEdit) await updateMember(member.id, payload);
      else await createMember(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const totalStocks = originatedLinks.length + commentedLinks.length;

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
            {isEdit ? `Edit — ${member.name}` : "Add Member"}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
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
              {t === "stocks" && totalStocks > 0 && (
                <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {totalStocks}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>
            )}

            {/* ── Profile ── */}
            {tab === "profile" && (
              <>
                <Field label="Name *" name="name" value={form.name} onChange={handle} required />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company" name="company" value={form.company} onChange={handle} placeholder="e.g. Acme Capital" />
                  <Field label="Job Title" name="job_title" value={form.job_title} onChange={handle} placeholder="e.g. Portfolio Manager" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Investor type */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Investor Type</label>
                    <select
                      name="investor_type"
                      value={form.investor_type}
                      onChange={handle}
                      className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">— select —</option>
                      {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <Field label="Location" name="location" value={form.location} onChange={handle} placeholder="e.g. London, UK" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" name="email" value={form.email} onChange={handle} type="email" placeholder="john@example.com" />
                  <Field label="Phone" name="phone" value={form.phone} onChange={handle} placeholder="+44 7700 000000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="LinkedIn URL" name="linkedin_url" value={form.linkedin_url} onChange={handle} placeholder="https://linkedin.com/in/..." />
                  <Field label="Twitter / X" name="twitter_handle" value={form.twitter_handle} onChange={handle} placeholder="@handle" />
                </div>
                <Textarea
                  label="Bio / Expertise"
                  name="bio"
                  value={form.bio}
                  onChange={handle}
                  rows={3}
                  placeholder="Background, area of expertise, investment style…"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Field label="Tags" name="tags" value={form.tags} onChange={handle} placeholder="vc, fintech, deep-value" />
                    <p className="mt-0.5 text-xs text-zinc-400">Separate with commas.</p>
                  </div>
                  <div>
                    <Field label="Investment Focus" name="investment_focus" value={form.investment_focus} onChange={handle} placeholder="Healthcare, Tech, Energy" />
                    <p className="mt-0.5 text-xs text-zinc-400">Separate with commas.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Last Contact Date" name="last_contact_date" value={form.last_contact_date} onChange={handle} type="date" />
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handle}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active member</label>
                  </div>
                </div>
                <Textarea label="Notes" name="notes" value={form.notes} onChange={handle} rows={2} placeholder="How we met, context, reminders…" />
              </>
            )}

            {/* ── Stocks ── */}
            {tab === "stocks" && (
              <div className="space-y-6">
                {/* Originated */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Originated
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">— stocks this member first raised in the community</span>
                  </h3>
                  <StockSearch
                    value={originatedSearch}
                    onChange={setOriginatedSearch}
                    results={originatedResults}
                    searching={searchingOriginated}
                    onAdd={addOriginated}
                    placeholder="Search by ticker or name…"
                  />
                  <StockLinkList
                    links={originatedLinks}
                    onRemove={removeOriginated}
                    onNoteChange={updateOriginatedNote}
                    emptyText="No originated stocks yet."
                  />
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800" />

                {/* Commented On */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Commented On
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">— stocks this member has discussed or engaged with</span>
                  </h3>
                  <StockSearch
                    value={commentedSearch}
                    onChange={setCommentedSearch}
                    results={commentedResults}
                    searching={searchingCommented}
                    onAdd={addCommented}
                    placeholder="Search by ticker or name…"
                  />
                  <StockLinkList
                    links={commentedLinks}
                    onRemove={removeCommented}
                    onNoteChange={updateCommentedNote}
                    emptyText="No commented stocks yet."
                  />
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

function StockSearch({
  value, onChange, results, searching, onAdd, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  results: Stock[];
  searching: boolean;
  onAdd: (s: Stock) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Search…"}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {searching && <div className="absolute right-3 top-2.5 text-xs text-zinc-400">Searching…</div>}
      </div>
      {results.length > 0 && (
        <div className="mt-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {results.slice(0, 8).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onAdd(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-200">{s.ticker}</span>
              <span className="text-zinc-500">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StockLinkList({
  links, onRemove, onNoteChange, emptyText,
}: {
  links: StockLinkWithMeta[];
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
        <div key={link.stock_id} className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200 w-14 shrink-0">{link.ticker}</span>
          <span className="flex-1 truncate text-sm text-zinc-500">{link.name}</span>
          <input
            type="text"
            value={link.note ?? ""}
            onChange={(e) => onNoteChange(link.stock_id, e.target.value)}
            placeholder="Note (optional)"
            className="w-36 shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <button type="button" onClick={() => onRemove(link.stock_id)} className="shrink-0 text-zinc-400 hover:text-red-500 dark:hover:text-red-400">✕</button>
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
