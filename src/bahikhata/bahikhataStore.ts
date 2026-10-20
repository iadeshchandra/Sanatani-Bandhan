import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BahiKhataData, BahiTarget, BatchActor, BatchSource, BatchState, ImportBatch,
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

const EMPTY: BahiKhataData = { batches: [], columnMaps: {} };

export function loadBahiData(ws: string): BahiKhataData {
  try {
    const raw = localStorage.getItem(storageKey(ws));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.batches)) {
        return { batches: parsed.batches, columnMaps: parsed.columnMaps || {} };
      }
    }
  } catch { /* corrupted → start clean; paper is the backup */ }
  return { batches: [], columnMaps: {} };
}

export function saveBahiData(ws: string, data: BahiKhataData): void {
  try {
    localStorage.setItem(storageKey(ws), JSON.stringify(data));
  } catch { /* quota → in-memory copy still lives in the hook */ }
}

export const newBatchId = () =>
  `bk_${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`;

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
  | 'submit' | 'withdraw' | 'approve' | 'reject' | 'reopen' | 'commit';

const LEGAL: Record<BatchState, BatchAction[]> = {
  draft: ['submit'],
  pending: ['withdraw', 'approve', 'reject'],
  approved: ['commit'],
  rejected: ['reopen'],
  committed: [],
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
  }
  return next;
}

/* ------------------------------ hook -------------------------------- */

export interface BahiStore {
  data: BahiKhataData;
  batches: ImportBatch[];
  addBatch: (b: ImportBatch) => void;
  updateBatch: (b: ImportBatch) => void;
  deleteBatch: (id: string) => void;
  rememberColumnMap: (target: BahiTarget, map: Record<string, string>) => void;
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

  return { data, batches: data.batches, addBatch, updateBatch, deleteBatch, rememberColumnMap };
}
