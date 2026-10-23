/**
 * custodySync.ts — cloud sync for Cash Custody state (owner-approved
 * 2026-10-23; the FLAGGED `cashCustodyStates` proposal, implemented).
 * ============================================================================
 * Custody state (boxes, sessions, the SHA-256 chain, deposit slips,
 * roster) used to live ONLY on one device: IndexedDB + localStorage
 * hardening (src/cashcustody/custodyIdb.ts) survives quota loss, but
 * not device loss, and trustees could not oversee from a second
 * device. This module syncs ONE document per workspace —
 * `cashCustodyStates/{workspaceId}` — mirroring the
 * `workspaceSummaries` pattern (one maintained doc, finance roles
 * only, never deleted; see firestore.rules).
 *
 * Laws this module is built under:
 *  - FAIL-OPEN, ALWAYS: every public method catches. A failed read
 *    yields "no cloud copy"; a failed write is dropped silently. The
 *    counting room NEVER loses data or blocks because the cloud path
 *    failed — the on-device copies (localStorage + IndexedDB) stay
 *    canonical on this device, exactly as before this module existed.
 *  - FRESHER WINS: adoption and overwrite decisions ride the same
 *    `savedAt` stamp rule as the on-device copies
 *    (custodyIdb.pickFresherState's strict-> rule): a cloud copy is
 *    adopted only when STRICTLY fresher than the local copy.
 *  - A BROKEN CHAIN IS REFUSED: a cloud copy whose custody events fail
 *    the caller's chain verification is never adopted — the same
 *    refusal backup-restore and importJSON already apply.
 *  - DEMO_ workspaces never sync (the audit recorder's law too):
 *    demo state is disposable and must not reach a real collection.
 *  - Writes pin `savedByUid` to the writer's uid (the rules require
 *    `savedByUid == request.auth.uid`); a write with no known uid is
 *    skipped rather than sent to be denied.
 *
 * Shape of the work: THIS module is pure policy (doc build / parse /
 * adoption choice / the debounced fail-open sync engine over an
 * injected store) and unit-tested against a fake store. It imports
 * NO firebase module on purpose: the custody store is imported by
 * many node-env suites, and a static firebase import here would
 * poison all of them. The thin Firestore adapter (getDoc/setDoc,
 * like ./summaryStore.ts) lives in ./custodySyncFirestore.ts and is
 * injected by the desk component.
 */

import {
  isStampedCustodyState,
  type StampedCustodyState,
} from '../../cashcustody/custodyIdb';
import type { CashCustodyState, CustodyEvent } from '../../cashcustody/types';

export const CUSTODY_STATES_COLLECTION = 'cashCustodyStates';

/** The synced document — mirrors the approved proposal's shape. */
export interface CustodyCloudDoc {
  workspaceId: string;
  state: CashCustodyState;
  /** Device write time (ms) of the state copy. */
  savedAt: number;
  /** Firebase uid of the writer — rules pin it to request.auth.uid. */
  savedByUid: string;
  savedByName: string;
  /** Hash of the highest-seq custody event ('' chain → 'GENESIS'). */
  chainHeadHash: string;
  chainLength: number;
}

export interface CustodySyncActor {
  uid: string;
  name: string;
}

/** Head of the custody chain: highest-seq event's hash + event count. */
export function chainHeadOf(state: CashCustodyState): {
  chainHeadHash: string;
  chainLength: number;
} {
  const events = state.events || [];
  let head: CustodyEvent | undefined;
  for (const ev of events) {
    if (!head || (ev.seq ?? 0) > (head.seq ?? 0)) head = ev;
  }
  return { chainHeadHash: head ? head.hash : 'GENESIS', chainLength: events.length };
}

/** Build the cloud doc for a stamped local copy (pure). */
export function buildCustodyCloudDoc(
  workspaceId: string,
  stamped: StampedCustodyState,
  actor: CustodySyncActor
): CustodyCloudDoc {
  const head = chainHeadOf(stamped.state);
  return {
    workspaceId,
    state: stamped.state,
    savedAt: stamped.savedAt,
    savedByUid: actor.uid,
    savedByName: actor.name,
    chainHeadHash: head.chainHeadHash,
    chainLength: head.chainLength,
  };
}

/**
 * Validate an unknown cloud payload into a stamped local copy (pure).
 * Returns null for anything malformed, foreign (workspace mismatch),
 * or structurally untrustworthy — the caller treats null as "no cloud
 * copy", never as an error.
 */
export function parseCustodyCloudDoc(
  raw: unknown,
  workspaceId: string
): StampedCustodyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (rec.workspaceId !== workspaceId) return null;
  if (typeof rec.savedByUid !== 'string') return null;
  const candidate = { savedAt: rec.savedAt, state: rec.state };
  return isStampedCustodyState(candidate) ? candidate : null;
}

/**
 * The adoption choice (pure): the cloud copy wins ONLY when it is
 * strictly fresher than the local copy AND its custody chain verifies
 * (`chainIntact` is the store's verifyChain === -1 check, injected so
 * this module stays free of the chain implementation). A broken or
 * stale cloud chain leaves the local copy canonical.
 */
export function chooseCustodyAdoption(
  local: StampedCustodyState,
  cloud: StampedCustodyState | null,
  chainIntact: (events: CustodyEvent[]) => boolean
): StampedCustodyState {
  if (!cloud) return local;
  if (!((cloud.savedAt || 0) > (local.savedAt || 0))) return local;
  if (!chainIntact(cloud.state.events)) return local;
  return cloud;
}

/** Storage seam — the Firestore adapter below; fakes in tests. */
export interface CustodySyncStore {
  read(workspaceId: string): Promise<unknown | null>;
  write(workspaceId: string, docData: CustodyCloudDoc): Promise<void>;
}

export interface CustodySync {
  /** Read + validate the cloud copy. NEVER throws; null = no copy. */
  pull(workspaceId: string): Promise<StampedCustodyState | null>;
  /**
   * Schedule a debounced full-state write. NEVER throws; failures
   * are dropped (the on-device copies remain canonical).
   */
  push(
    workspaceId: string,
    stamped: StampedCustodyState,
    actor: CustodySyncActor
  ): void;
  /** Fire any pending debounced write now (tests / teardown). */
  flush(workspaceId?: string): Promise<void>;
}

export function createCustodySync(
  store: CustodySyncStore,
  opts?: { debounceMs?: number }
): CustodySync {
  const debounceMs = opts?.debounceMs ?? 1000;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<
    string,
    { stamped: StampedCustodyState; actor: CustodySyncActor }
  >();

  const writeNow = async (workspaceId: string): Promise<void> => {
    const job = pending.get(workspaceId);
    if (!job) return;
    pending.delete(workspaceId);
    try {
      await store.write(
        workspaceId,
        buildCustodyCloudDoc(workspaceId, job.stamped, job.actor)
      );
    } catch {
      /* fail-open: the on-device copies remain canonical */
    }
  };

  return {
    async pull(workspaceId: string): Promise<StampedCustodyState | null> {
      if (!workspaceId || workspaceId.startsWith('DEMO_')) return null;
      try {
        const raw = await store.read(workspaceId);
        return parseCustodyCloudDoc(raw, workspaceId);
      } catch {
        return null; // offline / denied / unavailable → on-device rules
      }
    },

    push(
      workspaceId: string,
      stamped: StampedCustodyState,
      actor: CustodySyncActor
    ): void {
      if (!workspaceId || workspaceId.startsWith('DEMO_')) return;
      if (!actor || !actor.uid) return; // rules would deny an unpinned write
      pending.set(workspaceId, { stamped, actor });
      const existing = timers.get(workspaceId);
      if (existing) clearTimeout(existing);
      timers.set(
        workspaceId,
        setTimeout(() => {
          timers.delete(workspaceId);
          void writeNow(workspaceId);
        }, debounceMs)
      );
    },

    async flush(workspaceId?: string): Promise<void> {
      const ids = workspaceId ? [workspaceId] : [...pending.keys()];
      await Promise.all(
        ids.map(async (id) => {
          const t = timers.get(id);
          if (t) {
            clearTimeout(t);
            timers.delete(id);
          }
          await writeNow(id);
        })
      );
    },
  };
}

/** An inert sync (no cloud copy, writes dropped) — the provider's
 *  default when the desk does not inject the Firestore-backed one. */
export const nullCustodySync: CustodySync = {
  pull: async () => null,
  push: () => undefined,
  flush: async () => undefined,
};
