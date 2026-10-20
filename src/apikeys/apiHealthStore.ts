/**
 * apiHealthStore.ts — persistence for the API Health desk (QUEUED #35).
 * ============================================================================
 * Health results live in ONE doc: `platformConfig/apiHealth`.
 * Rules (verified against firestore.rules, NO change needed):
 *   match /platformConfig/{configId} — create/update: isOwner();
 *   read: allowed for every configId except 'public'.
 *
 * Because that generic read is broad, this doc must NEVER contain key
 * material — only probe outcomes, latency, timestamps, and the owner's
 * editable quota assumptions. Masked key tails are computed in the UI
 * from the owner-only apiKeys docs and are never persisted here.
 *
 * Reads fail soft (empty state → the desk simply probes again); writes
 * are owner-only by rules and fail soft in the UI.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { GoodCheck, ProbeResult, QuotaAssumptions } from './apiHealth';

export interface StoredApiHealth {
  results: Record<string, ProbeResult>;
  /** Last known-good check per API (+ the key tail it ran with). */
  good: Record<string, GoodCheck>;
  assumptions: QuotaAssumptions;
  /** Epoch ms of the last save, when known. */
  updatedAtMs: number | null;
}

const EMPTY: StoredApiHealth = { results: {}, good: {}, assumptions: {}, updatedAtMs: null };

function sanitizeResult(raw: unknown): ProbeResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ProbeResult>;
  if (typeof r.apiId !== 'string' || typeof r.outcome !== 'string') return null;
  return {
    apiId: r.apiId,
    outcome: r.outcome,
    httpStatus: typeof r.httpStatus === 'number' ? r.httpStatus : null,
    latencyMs: typeof r.latencyMs === 'number' ? r.latencyMs : null,
    detail: typeof r.detail === 'string' ? r.detail : '',
    checkedAt: typeof r.checkedAt === 'number' ? r.checkedAt : 0,
    probeCostUnits: typeof r.probeCostUnits === 'number' ? r.probeCostUnits : 0,
  };
}

function sanitizeGood(raw: unknown): GoodCheck | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as { result?: unknown; keyTail?: unknown };
  const result = sanitizeResult(g.result);
  if (!result) return null;
  return { result, keyTail: typeof g.keyTail === 'string' ? g.keyTail : '' };
}

export async function loadApiHealth(): Promise<StoredApiHealth> {
  try {
    const snap = await getDoc(doc(db, 'platformConfig', 'apiHealth'));
    if (!snap.exists()) return EMPTY;
    const d = snap.data() as {
      results?: Record<string, unknown>;
      good?: Record<string, unknown>;
      assumptions?: QuotaAssumptions;
      updatedAt?: { toMillis?: () => number };
    };
    const results: Record<string, ProbeResult> = {};
    if (d.results && typeof d.results === 'object') {
      for (const [id, raw] of Object.entries(d.results)) {
        const clean = sanitizeResult(raw);
        if (clean) results[id] = clean;
      }
    }
    const good: Record<string, GoodCheck> = {};
    if (d.good && typeof d.good === 'object') {
      for (const [id, raw] of Object.entries(d.good)) {
        const clean = sanitizeGood(raw);
        if (clean) good[id] = clean;
      }
    }
    return {
      results,
      good,
      assumptions: d.assumptions && typeof d.assumptions === 'object' ? d.assumptions : {},
      updatedAtMs: typeof d.updatedAt?.toMillis === 'function' ? d.updatedAt.toMillis() : null,
    };
  } catch {
    return EMPTY;
  }
}

/** Save results + good-check history + assumptions (owner-only by rules). */
export async function saveApiHealth(
  results: Record<string, ProbeResult>,
  good: Record<string, GoodCheck>,
  assumptions: QuotaAssumptions,
): Promise<void> {
  await setDoc(
    doc(db, 'platformConfig', 'apiHealth'),
    { results, good, assumptions, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
