/**
 * Server-side bindings for the Sahaayak API.
 *
 * Server components can't read `localStorage`, so the bearer token comes from
 * the Supabase session cookie here and is passed through to `lib/api.ts`.
 */
import { createClient } from './supabase/server';

import {
  askCase as askCaseRequest,
  createCase as createCaseRequest,
  getCase as getCaseRequest,
  getEvidence as getEvidenceRequest,
  getFacts as getFactsRequest,
  getReadiness as getReadinessRequest,
  setReminder as setReminderRequest,
  type AskResponse,
  type CaseDraft,
} from './api';
import type { CaseData, Evidence, ExtractedFact, Readiness } from './types';

export async function requireSessionToken(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to view this claim.");
  }
  return session.access_token;
}

export async function getCase(id: string): Promise<CaseData> {
  return getCaseRequest(id, await requireSessionToken());
}

export async function getReadiness(id: string): Promise<Readiness> {
  return getReadinessRequest(id, await requireSessionToken());
}

export async function getFacts(id: string): Promise<{ items: ExtractedFact[] }> {
  return getFactsRequest(id, await requireSessionToken());
}

export async function getEvidence(id: string): Promise<{ items: Evidence[] }> {
  return getEvidenceRequest(id, await requireSessionToken());
}

export async function askCase(
  id: string,
  message: string,
): Promise<AskResponse> {
  return askCaseRequest(id, message, await requireSessionToken());
}

export async function createCase(draft: CaseDraft): Promise<CaseData> {
  return createCaseRequest(draft, await requireSessionToken());
}

export async function getDecisionFlow(id: string): Promise<import('./types').DecisionFlowResponse> {
  const { getDecisionFlow: getDecisionFlowRequest } = await import('./api');
  return getDecisionFlowRequest(id, await requireSessionToken());
}


export async function setReminder(id: string, delayMinutes = 1) {
  return setReminderRequest(id, delayMinutes, await requireSessionToken());
}