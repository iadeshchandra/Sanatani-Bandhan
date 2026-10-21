import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BahiKhataData, BahiTarget, BatchActor, BatchSource, BatchState, ImportBatch,
  RegisterProfile,
} from './types';

/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — batch store. Device-local by design (Phase 1):    */
/* staging never touches the cloud, so entry needs no permission and   */
/* approval on the org's own device is the realistic flow — the        */
/* sevadar enters during the day, the trustee approves after aarti     */
/* on the same device. Same per-workspace localStorage pattern as      */
/* goshalaStore / pathshalaStore.                                      */
/* ------------------------------------------------------------------ */

const storageKey = (ws: string) => `sb_bahikhata_${ws}`;

const EMPTY: BahiKhataData = { batches: [], columnMaps: {}, registerProfiles: [] };

export function loadBahiData(ws: string): BahiKhataData {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.batches)) {
        return {
          batches: parsed.batches,
          columnMaps: parsed.columnMaps || {},
          // Phase 1 stores predate profiles — default, never crash.
          registerProfiles: Array.isArray(parsed.registerProfiles) ? parsed.registerProfiles : [],
        };
      }
    }
  } catch { /* corrupted → start clean; paper is the backup */ }
  return { batches: [], columnMaps: {}, registerProfiles: [] };
}

export function saveBahiData(ws: string, data: BahiKhataData): void {
  try {
    localStorage.setItem(storageKey(ws), JSON.stringify(data));
  } catch { /* quota → in-memory copy still lives in the hook */ }
}

export const newBatchId = () =>
  `bk_${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`;

/* ------------------------------------------------------------------ */
/* QUEUED #52 (audit D12): honest drafts + honest "entered by".        */
/*                                                                     */
/* 1) A register batch is a DRAFT only once it holds an entered row.   */
/*    Merely opening the register form used to persist a 0-row draft   */
/*    that then sat in "My batches" forever. The desk now keeps a      */
/*    fresh batch in memory and persists it the moment the first row   */
/*    lands — this predicate is the single definition of "has content" */
/*    that decision uses. (RegisterMode only ever creates a row        */
/*    object when the sevadar actually commits a row entry, so         */
/*    rows.length is an exact signal, never a guess.)                  */
/* 2) The "Entered by" name must be the actual signed-in user. The     */
/*    auth layer's generic fallback ("Acharya / Trustee               */
/*    Administrator") is a placeholder for a person, not a person —     */
/*    it must never be stamped onto a batch as its author.             */
/* ------------------------------------------------------------------ */

export const batchHasEnteredRows = (batch: Pick<ImportBatch, 'rows'>): boolean =>
  Array.isArray(batch.rows) && batch.rows.length > 0;

/** Placeholder identities that are NOT a person's name. */
export const GENERIC_ACTOR_NAMES: readonly string[] = [
  'Acharya / Trustee Administrator',
  'Trustee Administrator',
  'Staff',
  'Admin',
  'Administrator',
];

/**
 * First real name from the candidate chain wins; generic placeholders
 * are skipped as if absent. Falls back to the account email (still the
 * actual user) and only then to a warm generic.
 */
export function resolveActorName(
  candidates: Array<string | null | undefined>,
  email?: string | null
): string {
  for (const c of candidates) {
    const v = (c || '').trim();
    if (v && !GENERIC_ACTOR_NAMES.includes(v)) return v;
  }
  const em = (email || '').trim();
  if (em) return em;
  return 'Sanatani Sevak';
}

export function createBatch(args: {
  workspaceId: string;
  target: BahiTarget;
  source: BatchSource;
  label: string;
  enteredBy: BatchActor;
}): ImportBatch {
  const now = Date.now();
  return {
    id: newBatchId(),
    workspaceId: args.workspaceId,
    target: args.target,
    source: args.source,
    label: args.label,
    state: 'draft',
    enteredBy: args.enteredBy,
    createdAt: now,
    updatedAt: now,
    currentPage: 1,
    pagePhotoRefs: [],
    rows: [],
  };
}

/* ------------------------- batch state machine ---------------------- */
/* draft → pending → (approved → committed) | rejected → draft …       */
/* The machine is pure so the lifecycle is testable and every UI       */
/* surface agrees on what is legal.                                    */

export type BatchAction =
  | 'submit' | 'withdraw' | 'approve' | 'reject' | 'reopen' | 'commit' | 'undo';

const LEGAL: Record<BatchState, BatchAction[]> = {
  draft: ['submit'],
  pending: ['withdraw', 'approve', 'reject'],
  approved: ['commit'],
  rejected: ['reopen'],
  // A committed batch is immutable to every action EXCEPT undo —
  // and undo never edits history: it writes compensating entries
  // (undo.ts) and lands here, manifest intact, fully auditable.
  committed: ['undo'],
  undone: [],
};

export function canTransition(state: BatchState, action: BatchAction): boolean {
  return LEGAL[state]?.includes(action) ?? false;
}

export function applyTransition(
  batch: ImportBatch,
  action: BatchAction,
  actor: BatchActor,
  opts?: { rejectReason?: string }
): ImportBatch {
  if (!canTransition(batch.state, action)) return batch;
  const now = Date.now();
  const next: ImportBatch = { ...batch, updatedAt: now };
  switch (action) {
    case 'submit':
      next.state = 'pending';
      next.submittedAt = now;
      next.rejectReason = undefined;
      break;
    case 'withdraw':
      next.state = 'draft';
      break;
    case 'approve':
      next.state = 'approved';
      next.reviewedBy = actor;
      next.reviewedAt = now;
      break;
    case 'reject':
      next.state = 'rejected';
      next.reviewedBy = actor;
      next.reviewedAt = now;
      next.rejectReason = (opts?.rejectReason || '').trim() || 'Please check the rows and try again.';
      break;
    case 'reopen':
      // Back to the entrant as a draft, reason pinned on top (kept
      // until the next submit clears it).
      next.state = 'draft';
      break;
    case 'commit':
      next.state = 'committed';
      break;
    case 'undo':
      next.state = 'undone';
      next.undoneBy = actor;
      next.undoneAt = now;
      break;
  }
  return next;
}

/* ------------------------------ hook -------------------------------- */

export interface BahiStore {
  data: BahiKhataData;
  batches: ImportBatch[];
  registerProfiles: RegisterProfile[];
  addBatch: (b: ImportBatch) => void;
  updateBatch: (b: ImportBatch) => void;
  deleteBatch: (id: string) => void;
  rememberColumnMap: (target: BahiTarget, map: Record<string, string>) => void;
  addProfile: (p: RegisterProfile) => void;
  updateProfile: (p: RegisterProfile) => void;
  deleteProfile: (id: string) => void;
}

export function useBahiKhata(workspaceId: string): BahiStore {
  const [data, setData] = useState<BahiKhataData>(() => loadBahiData(workspaceId));
  const wsRef = useRef(workspaceId);

  useEffect(() => {
    if (wsRef.current !== workspaceId) {
      wsRef.current = workspaceId;
      setData(loadBahiData(workspaceId));
    }
  }, [workspaceId]);

  useEffect(() => {
    saveBahiData(wsRef.current, data);
  }, [data]);

  const addBatch = useCallback((b: ImportBatch) => {
    setData((d) => ({ ...d, batches: [b, ...d.batches] }));
  }, []);

  const updateBatch = useCallback((b: ImportBatch) => {
    setData((d) => ({
      ...d,
      batches: d.batches.map((x) => (x.id === b.id ? { ...b, updatedAt: Date.now() } : x)),
    }));
  }, []);

  const deleteBatch = useCallback((id: string) => {
    setData((d) => ({ ...d, batches: d.batches.filter((x) => x.id !== id) }));
  }, []);

  const rememberColumnMap = useCallback((target: BahiTarget, map: Record<string, string>) => {
    setData((d) => ({ ...d, columnMaps: { ...d.columnMaps, [target]: map } }));
  }, []);

  const addProfile = useCallback((p: RegisterProfile) => {
    setData((d) => ({ ...d, registerProfiles: [p, ...d.registerProfiles] }));
  }, []);

  const updateProfile = useCallback((p: RegisterProfile) => {
    setData((d) => ({
      ...d,
      registerProfiles: d.registerProfiles.map((x) =>
        x.id === p.id ? { ...p, updatedAt: Date.now() } : x
      ),
    }));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setData((d) => ({ ...d, registerProfiles: d.registerProfiles.filter((x) => x.id !== id) }));
  }, []);

  return {
    data, batches: data.batches, registerProfiles: data.registerProfiles,
    addBatch, updateBatch, deleteBatch, rememberColumnMap,
    addProfile, updateProfile, deleteProfile,
  };
}
