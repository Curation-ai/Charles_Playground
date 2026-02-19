export type ValuationView = "Undervalued" | "Fair Value" | "Overvalued" | "Unknown";

export interface Stock {
  id: number;
  name: string;
  ticker: string;
  sector: string | null;
  description: string | null;
  notes: string | null;
  tags: string[] | null;
  price: number | null;
  market_cap: number | null;
  market_cap_formatted: string | null;
  // Metadata — investment analysis
  investment_thesis: string | null;
  valuation_view: ValuationView | null;
  // Metadata — team tracking
  originated_by: string | null;
  date_added: string | null;
  last_reviewed: string | null;
  // Field population map (from StockResource)
  fields_populated: Record<string, boolean>;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
}

// Payload sent to create/update endpoints
export interface StockPayload {
  name: string;
  ticker: string;
  sector?: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  price?: number | null;
  market_cap?: number | null;
  metadata?: {
    investment_thesis?: string | null;
    valuation_view?: ValuationView | null;
    originated_by?: string | null;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

// Search — raw model response (not StockResource, so metadata is nested)
export interface SearchResult {
  id: number;
  name: string;
  ticker: string;
  sector: string | null;
  price: number | null;
  market_cap: number | null;
  similarity?: number; // present on semantic & hybrid results only
}

export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface SearchResponse {
  mode: SearchMode;
  results: SearchResult[];
}

// CSV import
export interface UploadResult {
  headers: string[];
  preview: Record<string, string>[];
  total_rows: number;
  available_fields: string[];
}

export interface PreviewResult {
  valid_count: number;
  error_count: number;
  errors: string[];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  stock_ids: number[];
  validation_errors: string[];
}
