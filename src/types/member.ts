// Lightweight stock reference returned inside a Member
export interface MemberStock {
  id: number;
  name: string;
  ticker: string;
  note: string | null;
}

// Lightweight member reference returned inside a Stock
export interface StockMember {
  id: number;
  name: string;
  company: string | null;
  note: string | null;
}

export const INVESTOR_TYPES = [
  "Retail",
  "Professional",
  "Analyst",
  "Portfolio Manager",
  "Fund Manager",
  "VC / Angel",
  "Sell-side",
] as const;

export type InvestorType = typeof INVESTOR_TYPES[number];

export interface Member {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  company: string | null;
  job_title: string | null;
  bio: string | null;
  tags: string[];
  notes: string | null;
  investor_type: string | null;
  investment_focus: string[];
  location: string | null;
  last_contact_date: string | null;
  is_active: boolean;
  has_embedding: boolean;
  originated_stocks: MemberStock[];
  commented_stocks: MemberStock[];
  stocks_count: number;
  created_at: string;
  updated_at: string;
}

export interface StockLink {
  stock_id: number;
  note?: string;
}

export interface MemberPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_handle?: string | null;
  company?: string | null;
  job_title?: string | null;
  bio?: string | null;
  tags?: string[];
  notes?: string | null;
  investor_type?: string | null;
  investment_focus?: string[];
  location?: string | null;
  last_contact_date?: string | null;
  is_active?: boolean;
  originated_links?: StockLink[];
  commented_links?: StockLink[];
}

export interface MemberSearchResult extends Omit<Member, "originated_stocks" | "commented_stocks"> {
  originated_stocks: MemberStock[];
  commented_stocks: MemberStock[];
  similarity?: number;
}
