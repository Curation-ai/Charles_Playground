import {
  Stock,
  StockPayload,
  PaginatedResponse,
  UploadResult,
  PreviewResult,
  ImportResult,
  SearchMode,
  SearchResponse,
} from "@/types/stock";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ?? body?.error ?? `API error: ${res.status} ${res.statusText}`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function apiFormFetch<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.message ?? data?.error ?? `API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

// ── Stocks ────────────────────────────────────────────────────────────────────

export function getStocks(
  search?: string,
  page?: number
): Promise<PaginatedResponse<Stock>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return apiFetch(`/stocks${qs ? `?${qs}` : ""}`);
}

export async function getStock(id: number): Promise<Stock> {
  const res = await apiFetch<{ data: Stock }>(`/stocks/${id}`);
  return res.data;
}

export async function createStock(data: StockPayload): Promise<Stock> {
  const res = await apiFetch<{ data: Stock }>("/stocks", { method: "POST", body: JSON.stringify(data) });
  return res.data;
}

export async function updateStock(id: number, data: StockPayload): Promise<Stock> {
  const res = await apiFetch<{ data: Stock }>(`/stocks/${id}`, { method: "PUT", body: JSON.stringify(data) });
  return res.data;
}

export function deleteStock(id: number): Promise<void> {
  return apiFetch(`/stocks/${id}`, { method: "DELETE" });
}

export function bulkUpdate(
  stockIds: number[],
  updates: Record<string, unknown>
): Promise<{ updated_count: number }> {
  return apiFetch("/stocks/bulk", {
    method: "PATCH",
    body: JSON.stringify({ stock_ids: stockIds, updates }),
  });
}

// ── CSV Import ────────────────────────────────────────────────────────────────

export function uploadCsv(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFormFetch("/import/upload", fd);
}

export function previewCsv(
  file: File,
  mapping: Record<string, string>
): Promise<PreviewResult> {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(mapping).forEach(([csvCol, field]) =>
    fd.append(`column_mapping[${csvCol}]`, field)
  );
  return apiFormFetch("/import/preview", fd);
}

export function executeCsv(
  file: File,
  mapping: Record<string, string>
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(mapping).forEach(([csvCol, field]) =>
    fd.append(`column_mapping[${csvCol}]`, field)
  );
  return apiFormFetch("/import/execute", fd);
}

export function searchStocks(
  query: string,
  mode: SearchMode
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, mode });
  return apiFetch(`/stocks/search?${params}`);
}

export function generateEmbeddings(
  stockIds: number[]
): Promise<{ status: string; processed: number }> {
  return apiFetch("/import/embeddings", {
    method: "POST",
    body: JSON.stringify({ stock_ids: stockIds }),
  });
}
