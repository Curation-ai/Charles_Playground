"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadCsv, previewCsv, executeCsv, generateEmbeddings } from "@/lib/api";
import type { UploadResult, PreviewResult, ImportResult } from "@/types/stock";

// ── Auto-suggest mapping ──────────────────────────────────────────────────────

const ALIASES: Record<string, string> = {
  // Ticker
  symbol: "ticker", "stock symbol": "ticker", "stock ticker": "ticker",
  // Name
  company: "name", "company name": "name", "stock name": "name", issuer: "name",
  // Price / market cap
  "share price": "price", "current price": "price", "last price": "price",
  "market cap": "market_cap", "mkt cap": "market_cap", marketcap: "market_cap",
  // Sector
  industry: "sector",
  // Description / notes
  about: "description", overview: "description",
  // Investment thesis
  "investment thesis": "investment_thesis", thesis: "investment_thesis",
  "why we like it": "investment_thesis", "investment case": "investment_thesis",
  // Valuation
  valuation: "valuation_view", "valuation view": "valuation_view",
  "valuation perspective": "valuation_view",
  // Team tracking
  "originated by": "originated_by", "identified by": "originated_by",
  "first mentioned by": "originated_by", "mentioned by": "originated_by",
  "added by": "originated_by",
  "date added": "date_added", added: "date_added",
  "last reviewed": "last_reviewed", reviewed: "last_reviewed",
  "date updated": "last_reviewed", updated: "last_reviewed",
};

function suggest(csvHeader: string, available: string[]): string {
  const n = csvHeader.toLowerCase().replace(/[\s_\-]+/g, " ").trim();
  if (ALIASES[n] && available.includes(ALIASES[n])) return ALIASES[n];
  const direct = available.find((f) => f.replace(/_/g, " ") === n);
  if (direct) return direct;
  const partial = available.find(
    (f) => f.replace(/_/g, " ").includes(n) || n.includes(f.replace(/_/g, " "))
  );
  return partial ?? "";
}

// ── Step indicators ───────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Upload CSV", "Map Columns", "Import"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              done   ? "bg-green-500 text-white" :
              active ? "bg-blue-600 text-white" :
                       "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
            }`}>
              {done ? "✓" : n}
            </div>
            <span className={`text-sm font-medium ${active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="mx-1 h-px w-8 bg-zinc-300 dark:bg-zinc-700" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [file, setFile]             = useState<File | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [mapping, setMapping]           = useState<Record<string, string>>({});
  const [previewing, setPreviewing]     = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);

  // Step 3
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [embedding, setEmbedding]       = useState(false);
  const [embeddingDone, setEmbeddingDone] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ── Step 1: file selection ────────────────────────────────────────────────

  async function handleFile(f: File) {
    if (!f.name.match(/\.(csv|txt)$/i)) {
      setError("Please select a CSV file (.csv or .txt).");
      return;
    }
    setError(null);
    setFile(f);
    setUploading(true);
    try {
      const result = await uploadCsv(f);
      setUploadResult(result);
      // Auto-suggest initial mapping
      const initial: Record<string, string> = {};
      result.headers.forEach((h) => {
        initial[h] = suggest(h, result.available_fields);
      });
      setMapping(initial);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  // ── Step 2: preview ───────────────────────────────────────────────────────

  async function handlePreview() {
    if (!file || !uploadResult) return;
    setError(null);
    setPreviewing(true);
    try {
      const result = await previewCsv(file, mapping);
      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  // ── Step 3: execute ───────────────────────────────────────────────────────

  async function handleImport() {
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const result = await executeCsv(file, mapping);
      setImportResult(result);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleEmbeddings() {
    if (!importResult?.stock_ids.length) return;
    setError(null);
    setEmbedding(true);
    try {
      await generateEmbeddings(importResult.stock_ids);
      setEmbeddingDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Embedding generation failed");
    } finally {
      setEmbedding(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Import Stocks</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Upload a CSV and map columns to stock fields.</p>
          </div>
          <button
            onClick={() => router.push("/stocks")}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Back to stocks
          </button>
        </div>

        <Steps current={step} />

        {error && (
          <div className="mb-5 rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Upload CSV File</h2>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
                dragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              <div className="mb-3 text-4xl text-zinc-300 dark:text-zinc-600">📄</div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {uploading ? "Uploading…" : "Drag & drop a CSV file, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-zinc-400">.csv or .txt · max 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              Need a template?{" "}
              <a
                href="http://localhost:8000/storage/templates/stocks_template.csv"
                className="text-blue-600 hover:underline dark:text-blue-400"
                target="_blank"
                rel="noreferrer"
              >
                Download stocks_template.csv
              </a>
            </p>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && uploadResult && (
          <div className="space-y-5">

            {/* Preview table */}
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Preview — first {Math.min(uploadResult.preview.length, 10)} of {uploadResult.total_rows} rows
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                      {uploadResult.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-medium text-zinc-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.preview.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                        {uploadResult.headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 max-w-[160px] truncate">{row[h] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column mapping */}
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Map Columns to Stock Fields</h2>
                <p className="mt-0.5 text-xs text-zinc-500">We've auto-suggested mappings — review and adjust as needed.</p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {uploadResult.headers.map((header) => (
                  <div key={header} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{header}</span>
                    <select
                      value={mapping[header] ?? ""}
                      onChange={(e) => setMapping((p) => ({ ...p, [header]: e.target.value }))}
                      className="w-48 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">— skip —</option>
                      {uploadResult.available_fields.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview validation results */}
            {previewResult && (
              <div className={`rounded-lg border p-4 ${
                previewResult.error_count > 0
                  ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                  : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              }`}>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✓ {previewResult.valid_count} valid rows
                  </span>
                  {previewResult.error_count > 0 && (
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      ⚠ {previewResult.error_count} error{previewResult.error_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {previewResult.errors.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {previewResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-amber-700 dark:text-amber-400">• {e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep(1); setUploadResult(null); setPreviewResult(null); setFile(null); }}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {previewing ? "Checking…" : "Preview Import"}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || (previewResult?.valid_count === 0)}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? "Importing…" : previewResult ? `Import ${previewResult.valid_count} rows` : "Import"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
        {step === 3 && importResult && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6 text-center">
              <div className="mb-3 text-5xl">✅</div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Import Complete</h2>
            </div>

            {/* Result counts */}
            <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created}</p>
                <p className="text-xs text-zinc-500">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated}</p>
                <p className="text-xs text-zinc-500">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-400">{importResult.skipped}</p>
                <p className="text-xs text-zinc-500">Skipped</p>
              </div>
            </div>

            {/* Validation errors that were skipped */}
            {importResult.validation_errors.length > 0 && (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">Rows skipped due to validation errors:</p>
                <ul className="space-y-0.5">
                  {importResult.validation_errors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-400">• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Embeddings */}
            {importResult.stock_ids.length > 0 && (
              <div className="mb-5 rounded-md border border-zinc-200 p-4 dark:border-zinc-700">
                <p className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">Generate AI Embeddings</p>
                <p className="mb-3 text-xs text-zinc-500">
                  Generate semantic search embeddings for the {importResult.stock_ids.length} imported stock{importResult.stock_ids.length !== 1 ? "s" : ""}.
                  This calls the OpenAI API and may take a moment.
                </p>
                {embeddingDone ? (
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Embeddings generated successfully</p>
                ) : (
                  <button
                    onClick={handleEmbeddings}
                    disabled={embedding}
                    className="flex items-center gap-2 rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  >
                    {embedding && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {embedding ? "Generating…" : "Generate Embeddings"}
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => router.push("/stocks")}
                className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Done — View Stocks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
