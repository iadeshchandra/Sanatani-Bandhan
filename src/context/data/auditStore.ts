/**
 * auditStore.ts — Firestore adapter for the master audit stream
 * (policy in ./auditWriter.ts, chain math in src/lib/auditChain.ts).
 *
 * Writes use the data layer's own mechanism: a direct `setDoc` on
 * the persistence-enabled Firestore client (multi-tab IndexedDB
 * persistence queues it offline, exactly like every other DataContext
 * write), payload through stripUndefinedDeep (#45 law). The document
 * additionally carries `serverAt` (serverTimestamp) — the
 * server-resolved commit time beside the device `createdAt` that the
 * hash binds (research §2: log offline-queued actions with BOTH
 * device creation time and server sync time).
 *
 * Rules contract (prepared with this batch, owner-approved flow):
 * auditEvents — create by a workspace member with
 * actorUid == request.auth.uid (no impersonation); update/delete
 * NEVER (append-only); read by finance/oversight roles of the
 * workspace (demoPublicRead for demo sandboxes).
 *
 * Query shapes avoid composite-index requirements where possible:
 * entity history uses equality filters only (Firestore serves
 * multi-equality from single-field indexes) and sorts client-side;
 * workspace/desk reads try (workspaceId + seq) ordering and fall
 * back to an equality scan + client sort when the composite index
 * has not been built yet, so the desk degrades honestly instead of
 * erroring.
 */

import {
  collection,
  doc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AuditEvent } from '../../lib/auditChain';
import { stripUndefinedDeep } from './firestoreDoc';
import {
  AuditRecorder,
  type AuditChainHead,
  type AuditStore,
} from './auditWriter';

const COLLECTION = 'auditEvents';

/** Cap for one verification pass — disclosed to the caller so the
 *  desk can say exactly how much of the chain was verified. */
export const VERIFY_CAP = 5000;

export const firestoreAuditStore: AuditStore = {
  async readChainHead(workspaceId: string): Promise<AuditChainHead | null> {
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTION),
          where('workspaceId', '==', workspaceId),
          orderBy('seq', 'desc'),
          fsLimit(1)
        )
      );
      if (snap.empty) return null;
      const d = snap.docs[0].data() as AuditEvent;
      return { seq: d.seq, hash: d.hash };
    } catch {
      // Composite index not built yet (or offline with an empty
      // cache): fall back to an equality scan for the max seq.
      const snap = await getDocs(
        query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId))
      );
      let head: AuditChainHead | null = null;
      snap.forEach((docSnap) => {
        const d = docSnap.data() as AuditEvent;
        if (!head || (d.seq ?? -1) > head.seq) head = { seq: d.seq, hash: d.hash };
      });
      return head;
    }
  },

  async appendEvent(event: AuditEvent): Promise<void> {
    await setDoc(
      doc(db, COLLECTION, event.id),
      stripUndefinedDeep({ ...event, serverAt: serverTimestamp() })
    );
  },
};

/** The session-wide recorder singleton the commit points report to. */
export const auditRecorder = new AuditRecorder(firestoreAuditStore);

function toEvent(docSnap: { id: string; data: () => unknown }): AuditEvent {
  return { ...(docSnap.data() as AuditEvent), id: docSnap.id };
}

const bySeqDesc = (a: AuditEvent, b: AuditEvent) => (b.seq ?? 0) - (a.seq ?? 0);
const bySeqAsc = (a: AuditEvent, b: AuditEvent) => (a.seq ?? 0) - (b.seq ?? 0);

/**
 * The audit events of ONE record (entity history), newest first.
 * Equality-only filters (workspace + type + id) so no composite
 * index is required; sorted by seq client-side.
 */
export async function fetchEntityHistory(
  workspaceId: string,
  entityType: string,
  entityId: string,
  max = 100
): Promise<AuditEvent[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION),
      where('workspaceId', '==', workspaceId),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId)
    )
  );
  const events: AuditEvent[] = [];
  snap.forEach((d) => events.push(toEvent(d)));
  events.sort(bySeqDesc);
  return events.slice(0, max);
}

/**
 * The workspace's recent events for the forensic desk, newest first.
 * Tries the ordered query; falls back to an equality scan + client
 * sort when the (workspaceId, seq) composite index is absent.
 */
export async function fetchWorkspaceEvents(
  workspaceId: string,
  max = 300
): Promise<AuditEvent[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where('workspaceId', '==', workspaceId),
        orderBy('seq', 'desc'),
        fsLimit(max)
      )
    );
    const events: AuditEvent[] = [];
    snap.forEach((d) => events.push(toEvent(d)));
    return events;
  } catch {
    const snap = await getDocs(
      query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId))
    );
    const events: AuditEvent[] = [];
    snap.forEach((d) => events.push(toEvent(d)));
    events.sort(bySeqDesc);
    return events.slice(0, max);
  }
}

export interface ChainFetch {
  events: AuditEvent[];
  /** True when the workspace holds more events than the cap — the
   *  verification covered the earliest `events.length` only. */
  truncated: boolean;
}

/**
 * The chain from GENESIS upward (ascending seq), capped — the
 * verification input. Truncation is reported, never silent.
 */
export async function fetchChainForVerification(
  workspaceId: string,
  cap = VERIFY_CAP
): Promise<ChainFetch> {
  let events: AuditEvent[] = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where('workspaceId', '==', workspaceId),
        orderBy('seq', 'asc'),
        fsLimit(cap + 1)
      )
    );
    snap.forEach((d) => events.push(toEvent(d)));
  } catch {
    const snap = await getDocs(
      query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId))
    );
    snap.forEach((d) => events.push(toEvent(d)));
    events.sort(bySeqAsc);
  }
  const truncated = events.length > cap;
  return { events: events.slice(0, cap), truncated };
}
