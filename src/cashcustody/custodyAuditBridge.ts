/**
 * custodyAuditBridge.ts — Cash Custody → Blueprint A master audit stream.
 * ============================================================================
 * The custody suite keeps its own device-local SHA-256 chain (see
 * cashCustodyStore.tsx) — that chain is the forensic record of the
 * counting room. But Blueprint A's law is ONE master stream for
 * everything (`auditEvents`, src/context/data/auditWriter.ts): trustees
 * reviewing a workspace's History / Transparency Board must see custody
 * events beside treasury, devotee and booking events, and the local
 * chain alone dies with the device.
 *
 * This bridge mirrors every appended CustodyEvent into the master
 * stream via the shared AuditRecorder:
 *   - entityType 'cashCustody', entityId = the custody event's own id;
 *   - the event's local hash + prevHash ride along as a before/after
 *     digest (`changes`), so a master-stream reader can cross-check
 *     the mirror against the device chain (lib/auditTrail.ts already
 *     treats the custody chain as canonical for provenance);
 *   - the human `details` line rides in summaryParams (truncated —
 *     the stream is an index, not a second copy of the log);
 *   - createdAt is the custody event's own timestamp, so the mirror
 *     preserves counting-room time, not mirror time.
 *
 * Actor law (Blueprint A): the recorder binds actorUid to the signed-in
 * Firebase user and DROPS actorless events; the typed counting-room
 * names (maker/checker/custodians) are preserved inside `details`,
 * never promoted to actor — a typed name is an attestation, not an
 * authenticated identity. DEMO_ workspaces are skipped by the recorder
 * itself. The recorder never throws and never blocks the mutation;
 * this bridge additionally swallows mapping errors so a custody action
 * can never fail because its mirror did.
 */

import type { AuditEventInput } from '../lib/auditChain';
import type { CustodyEvent, CustodyEventKind } from './types';

export const CUSTODY_AUDIT_ENTITY_TYPE = 'cashCustody';
export const CUSTODY_AUDIT_SUMMARY_KEY = 'org.audit.history.custodyEvent';

/** Master-stream action per custody event kind (verb.object form). */
export const CUSTODY_AUDIT_ACTION: Record<CustodyEventKind, string> = {
  box_registered: 'custody.boxRegistered',
  box_opened: 'custody.boxOpened',
  count_started: 'custody.countStarted',
  count_verified: 'custody.countVerified',
  session_closed: 'custody.sessionClosed',
  deposit_created: 'custody.depositCreated',
  deposit_confirmed: 'custody.depositConfirmed',
  seal_changed: 'custody.sealChanged',
  staff_checkin: 'custody.staffCheckin',
  staff_checkout: 'custody.staffCheckout',
};

/** Plain-language label per kind (entityLabel on the master event). */
export const CUSTODY_KIND_LABEL: Record<CustodyEventKind, string> = {
  box_registered: 'Hundi box registered',
  box_opened: 'Hundi box opened (dual custody)',
  count_started: 'Counting started',
  count_verified: 'Count verified',
  session_closed: 'Counting session closed',
  deposit_created: 'Bank deposit slip created',
  deposit_confirmed: 'Deposit posted to treasury',
  seal_changed: 'Box seal changed',
  staff_checkin: 'Counting staff check-in',
  staff_checkout: 'Counting staff check-out',
};

export interface CustodyAuditContext {
  workspaceId: string;
  /** Signed-in Firebase uid (recorder drops the event when empty). */
  actorUid: string;
  /** Resolved via resolveActorName by the caller — never fabricated. */
  actorName: string;
  actorRole: string;
}

const DETAILS_CAP = 240;

export function truncateDetails(details: string): string {
  const d = (details || '').trim();
  return d.length > DETAILS_CAP ? `${d.slice(0, DETAILS_CAP - 1)}…` : d;
}

/** Pure mapping: one custody event → one master-stream input. */
export function custodyEventToAuditInput(
  event: CustodyEvent,
  ctx: CustodyAuditContext
): AuditEventInput {
  return {
    workspaceId: ctx.workspaceId,
    actorUid: ctx.actorUid,
    actorName: ctx.actorName,
    actorRole: ctx.actorRole,
    action: CUSTODY_AUDIT_ACTION[event.kind],
    entityType: CUSTODY_AUDIT_ENTITY_TYPE,
    entityId: event.id,
    entityLabel: CUSTODY_KIND_LABEL[event.kind],
    summaryKey: CUSTODY_AUDIT_SUMMARY_KEY,
    summaryParams: {
      details: truncateDetails(event.details),
      custodyActor: event.actor,
    },
    changes: {
      custodyHash: { to: event.hash },
      custodyPrevHash: { to: event.prevHash },
      custodySeq: { to: event.seq },
    },
    createdAt: event.ts,
  };
}

/** Structural minimum of the shared recorder (AuditRecorder satisfies it). */
export interface CustodyAuditRecorder {
  record(input: AuditEventInput): void;
}

/**
 * Mirror one custody event into the master stream. Fire-and-forget:
 * never throws, never returns a promise the caller must await — the
 * custody mutation has already committed locally.
 */
export function recordCustodyEvent(
  recorder: CustodyAuditRecorder,
  event: CustodyEvent,
  ctx: CustodyAuditContext
): void {
  try {
    recorder.record(custodyEventToAuditInput(event, ctx));
  } catch (err) {
    // The recorder contract already guarantees no-throw; this guard is
    // belt-and-braces so the counting room can never break on a mirror.
    console.warn('[custody-audit] mirror failed; custody event kept locally', err);
  }
}
