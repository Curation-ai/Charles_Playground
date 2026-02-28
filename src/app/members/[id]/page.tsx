"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Member } from "@/types/member";
import { getMember, deleteMember, generateMemberEmbeddings } from "@/lib/members-api";
import MemberModal from "@/components/MemberModal";

function describeContext(qs: string): string {
  if (!qs) return "Members";
  const p = new URLSearchParams(qs);
  const search = p.get("search");
  if (search) return `"${search}"`;
  return "Members";
}

// ── Inner content ──────────────────────────────────────────────────────────

function MemberDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const searchParams = useSearchParams();

  const fromSearch = searchParams.get("from") ?? "";
  const backHref   = `/members${fromSearch}`;

  const [member, setMember]         = useState<Member | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Embedding regen
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenDone, setRegenDone]       = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const m = await getMember(Number(id));
      setMember(m);
    } catch {
      setError("Member not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await deleteMember(Number(id));
    router.push(fromSearch ? `/members${fromSearch}` : "/members");
  }

  async function handleRegenEmbedding() {
    if (!member) return;
    setRegenLoading(true);
    try {
      await generateMemberEmbeddings([member.id]);
      setRegenDone(true);
    } catch {
      // silently fail — user can retry
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

  if (error || !member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">{error ?? "Member not found."}</p>
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          ← {describeContext(fromSearch)}
        </Link>
      </div>
    );
  }

  const totalStocks = (member.originated_stocks?.length ?? 0) + (member.commented_stocks?.length ?? 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link href={backHref} className="hover:text-zinc-800 dark:hover:text-zinc-200">
            ← {describeContext(fromSearch)}
          </Link>
          <span>›</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{member.name}</span>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{member.name}</h1>
              {!member.is_active && (
                <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                  Inactive
                </span>
              )}
            </div>

            {(member.job_title || member.company) && (
              <p className="mt-1 text-base text-zinc-500">
                {[member.job_title, member.company].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* New profile metadata */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {member.investor_type && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {member.investor_type}
                </span>
              )}
              {member.location && (
                <span className="flex items-center gap-1">
                  <span className="text-zinc-400">📍</span>
                  {member.location}
                </span>
              )}
              {member.last_contact_date && (
                <span className="text-zinc-400">
                  Last contact: {member.last_contact_date}
                </span>
              )}
            </div>

            {/* Investment focus */}
            {member.investment_focus && member.investment_focus.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.investment_focus.map((f) => (
                  <span key={f} className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Contact links */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {member.email && (
                <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {member.email}
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
                  {member.phone}
                </a>
              )}
              {member.linkedin_url && (
                <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                  LinkedIn ↗
                </a>
              )}
              {member.twitter_handle && (
                <a
                  href={`https://twitter.com/${member.twitter_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {member.twitter_handle.startsWith("@") ? member.twitter_handle : `@${member.twitter_handle}`} ↗
                </a>
              )}
            </div>

            {/* Tags */}
            {member.tags && member.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setModalOpen(true)}
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

        {/* ── Embedding warning ─────────────────────────────────────────────── */}
        {!member.has_embedding && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800/40 dark:bg-yellow-900/10">
            <span className="mt-0.5 shrink-0 text-yellow-500">⚠</span>
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Embedding missing — this member won&apos;t surface in semantic search.
              </p>
              {regenDone ? (
                <p className="mt-1 text-sm font-medium text-green-700 dark:text-green-400">Embedding regenerated successfully.</p>
              ) : (
                <button
                  onClick={handleRegenEmbedding}
                  disabled={regenLoading}
                  className="mt-2 text-sm font-medium text-yellow-800 underline hover:text-yellow-900 disabled:opacity-50 dark:text-yellow-400 dark:hover:text-yellow-300"
                >
                  {regenLoading ? "Regenerating…" : "Regenerate Embedding →"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Bio / Expertise ───────────────────────────────────────────────── */}
        {member.bio && (
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Bio / Expertise</h2>
            </div>
            <div className="px-6 py-5">
              <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{member.bio}</p>
            </div>
          </section>
        )}

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        {member.notes && (
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{member.notes}</p>
            </div>
          </section>
        )}

        {/* ── Originated Ideas ──────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Originated Ideas
              {member.originated_stocks && member.originated_stocks.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">
                  {member.originated_stocks.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage links →
            </button>
          </div>
          <div className="px-6 py-5">
            {!member.originated_stocks || member.originated_stocks.length === 0 ? (
              <p className="text-sm text-zinc-400">No stocks originated yet.</p>
            ) : (
              <div className="space-y-2">
                {member.originated_stocks.map((stock) => (
                  <div key={stock.id} className="flex items-center gap-3 rounded border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <Link
                      href={`/stocks/${stock.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 shrink-0 font-mono text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {stock.ticker}
                    </Link>
                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{stock.name}</span>
                    {stock.note && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        {stock.note}
                      </span>
                    )}
                    <Link
                      href={`/stocks/${stock.id}`}
                      className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Also Commented On ─────────────────────────────────────────────── */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Also Commented On
              {member.commented_stocks && member.commented_stocks.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">
                  {member.commented_stocks.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Manage links →
            </button>
          </div>
          <div className="px-6 py-5">
            {!member.commented_stocks || member.commented_stocks.length === 0 ? (
              <p className="text-sm text-zinc-400">No stocks commented on yet.</p>
            ) : (
              <div className="space-y-2">
                {member.commented_stocks.map((stock) => (
                  <div key={stock.id} className="flex items-center gap-3 rounded border border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    <Link
                      href={`/stocks/${stock.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 shrink-0 font-mono text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {stock.ticker}
                    </Link>
                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{stock.name}</span>
                    {stock.note && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        {stock.note}
                      </span>
                    )}
                    <Link
                      href={`/stocks/${stock.id}`}
                      className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {totalStocks === 0 && (
          <p className="mb-6 text-center text-sm text-zinc-400">
            No stocks linked yet.{" "}
            <button onClick={() => setModalOpen(true)} className="text-blue-600 hover:underline dark:text-blue-400">
              Edit this member
            </button>{" "}
            to add links.
          </p>
        )}

      </div>

      {/* Edit modal */}
      {modalOpen && (
        <MemberModal
          member={member}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Page (Suspense wrapper) ────────────────────────────────────────────────

export default function MemberDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-zinc-500">Loading…</p>
        </div>
      }
    >
      <MemberDetailContent />
    </Suspense>
  );
}
