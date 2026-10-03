/**
 * API client for the Paytm Sahaayak backend.
 *
 * Every call carries the signed-in user's Supabase session token: the backend
 * scopes each query to the case owner, so an unauthenticated request is
 * rejected. There are no hardcoded fallback values — errors are surfaced as
 * thrown exceptions so the UI can show proper error states.
 */
import { CaseData, CaseDocument, CaseUpdateRequest, Evidence, ExtractedFact, Readiness } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Thrown when the backend rejects a request, carrying the status for the UI. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Resolve a bearer token.
 *
 * Server components pass the token read from the Supabase session cookie (see
 * `lib/api-server.ts`); client components pass `session.access_token` directly
 * so they don't need a cookie read.
 */
async function resolveToken(explicit?: string): Promise<string | null> {
  return explicit ?? null;
}

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const { token, headers, ...init } = options ?? {};
  const accessToken = await resolveToken(token);

  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new ApiError(detail.detail ?? `Request failed: ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

// ─── Cases ────────────────────────────────────────────────────

export const getCase = (id: string, token?: string) =>
  request<CaseData>(`/cases/${id}`, { token });

export const getReadiness = (id: string, token?: string) =>
  request<Readiness>(`/cases/${id}/readiness`, { token });

export const getFacts = (id: string, token?: string) =>
  request<{ items: ExtractedFact[] }>(`/cases/${id}/facts`, { token });

export type CaseDraft = {
  message: string;
  language?: string;
  patient_relation?: string | null;
  hospital_name?: string | null;
  estimated_bill?: number | null;
};

export const createCase = (draft: CaseDraft | string, token?: string) =>
  request<CaseData>('/cases', {
    method: 'POST',
    body: JSON.stringify(typeof draft === 'string' ? { message: draft } : draft),
    token,
  });

export const updateCase = (id: string, updates: CaseUpdateRequest, token?: string) =>
  request<CaseData>(`/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    token,
  });

export const transcribeAudio = async (audio: Blob, languageCode: string, token: string) => {
  const form = new FormData();
  form.append('audio', audio, `claim-intake.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : 'webm'}`);
  form.append('language_code', languageCode);
  return request<{ transcript: string; provider: string }>('/speech/transcribe', {
    method: 'POST',
    body: form,
    token,
  });
};

// ─── Evidence ─────────────────────────────────────────────────

export const getEvidence = (id: string, token?: string) =>
  request<{ items: Evidence[] }>(`/cases/${id}/evidence`, { token });

// ─── Chat ─────────────────────────────────────────────────────

export type AskResponse = {
  answer: string;
  abstained: boolean;
  evidence: Evidence[];
  source: string;
  next_best_action: string;
  readiness_score: number;
};

export const askCase = (id: string, message: string, token?: string) =>
  request<AskResponse>(`/cases/${id}/ask`, {
    method: 'POST',
    body: JSON.stringify({ message, language: 'hinglish' }),
    token,
  });

// ─── Reminders ────────────────────────────────────────────────

export const setReminder = (id: string, delayMinutes = 1, token?: string) =>
  request<{ scheduled: boolean; next_best_action: string }>(`/cases/${id}/reminders`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'missing_document_reminder',
      delay_minutes: delayMinutes,
    }),
    token,
  });

// ─── Documents ────────────────────────────────────────────────

export type DocumentSummary = Pick<
  CaseDocument,
  | 'id'
  | 'document_type'
  | 'file_name'
  | 'processing_status'
  | 'page_count'
  | 'error_message'
> & { extraction_status?: string; facts_count?: number };

export const listDocuments = (id: string, token?: string) =>
  request<{ items: DocumentSummary[] }>(`/cases/${id}/documents`, { token });

export type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string | null;
  abstained?: boolean;
  evidence?: Array<{
    document_name: string;
    page_number: number | null;
    quote: string;
    confidence: number;
  }>;
};

export const listMessages = (id: string, token?: string) =>
  request<{ items: ChatMessage[] }>(`/cases/${id}/messages`, { token });
