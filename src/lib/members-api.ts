import { Member, MemberPayload, MemberSearchResult } from "@/types/member";
import { PaginatedResponse } from "@/types/stock";

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

export async function getMembers(
  search?: string,
  page = 1
): Promise<PaginatedResponse<Member>> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return apiFetch(`/members${qs ? `?${qs}` : ""}`);
}

export async function getMember(id: number): Promise<Member> {
  const res = await apiFetch<{ data: Member }>(`/members/${id}`);
  return res.data;
}

export async function createMember(payload: MemberPayload): Promise<Member> {
  const res = await apiFetch<{ data: Member }>("/members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMember(
  id: number,
  payload: Partial<MemberPayload>
): Promise<Member> {
  const res = await apiFetch<{ data: Member }>(`/members/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteMember(id: number): Promise<void> {
  await apiFetch<void>(`/members/${id}`, { method: "DELETE" });
}

export async function searchMembers(
  query: string,
  mode: string
): Promise<{ mode: string; results: MemberSearchResult[] }> {
  const params = new URLSearchParams({ q: query, mode });
  return apiFetch(`/members/search?${params}`);
}

export async function generateMemberEmbeddings(
  memberIds?: number[]
): Promise<{ status: string; processed: number }> {
  const body = memberIds ? { member_ids: memberIds } : {};
  return apiFetch("/members/embeddings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
