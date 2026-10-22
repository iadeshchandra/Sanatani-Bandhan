/**
 * auditChain.ts — Blueprint A: the master audit stream's chain math
 * (pure logic, no React, no Firebase).
 * ============================================================================
 * ONE append-only, hash-chained event stream for every organisation
 * action (the research brief §2: one stream for everything, not
 * per-module logs; actor + role-at-the-time; before/after where cheap;
 * prev_hash / row_hash on every record).
 *
 * ALGORITHM — deliberately the codebase's existing one, not a new
 * invention: the cash-custody event log (src/cashcustody) is the app's
 * hash-chained store, and lib/auditTrail.ts already treats it as the
 * canonical chain. This module reuses its exact primitives:
 *   - the same synchronous `sha256Hex` (imported, not re-implemented);
 *   - the same GENESIS sentinel ('GENESIS') for the first link;
 *   - the same canonical form: sha256(`${prevHash}|${seq}|${ts}|…fields…`)
 *     with the monotonic seq bound into the hash so same-millisecond
 *     events cannot be reordered silently.
 * The field list differs from custody's (kind/actor/details) because
 * the forensic event shape differs — the algorithm, and therefore the
 * verification semantics, are identical: recompute every hash in seq
 * order, check every prevHash link, report the FIRST break.
 *
 * HONEST LIMITS (stated, not hidden):
 *   - createdAt is the committing device's clock at commit time; the
 *     stored document also carries a server-resolved `serverAt`
 *     (Firestore serverTimestamp, added by the store adapter, never
 *     part of the hash) so the forensic view can show both.
 *   - The chain is maintained client-side (offline-first law): two
 *     devices committing in the same instant can fork onto the same
 *     head. Verification DETECTS a fork as a break at the fork point —
 *     it cannot prevent it. In practice a workspace's writes are
 *     user-paced and the recorder serialises per workspace.
 *   - A failed audit write never blocks the underlying mutation
 *     (fail-open, loud console warning — the summaryWriter law). The
 *     chain head only advances on a LANDED write, so a dropped event
 *     leaves an absence, never a corrupted chain.
 */

import { sha256Hex } from '../cashcustody/cashCustodyStore';

/** Sentinel prevHash of the first event in a workspace chain. */
export const AUDIT_GENESIS = 'GENESIS';

/** One scalar before/after pair for a changed field (cheap digest). */
export interface AuditChange {
  from?: string | number | boolean | null;
  to?: string | number | boolean | null;
}

/**
 * One audit event — the `auditEvents/{id}` document shape (minus the
 * store-added `serverAt`). Field names follow the research schema:
 * actor_role_at_time is `actorRole` (the role the actor held in THIS
 * workspace when the action committed — roles change over time, the
 * audit preserves the role at action time).
 */
export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorUid: string;
  /** Resolved via resolveActorName at the commit point — never a
   *  fabricated placeholder identity. */
  actorName: string;
  actorRole: string;
  /** verb.object, e.g. 'treasury.created', 'devotee.updated'. */
  action: string;
  entityType: 'treasury' | 'devotee' | 'booking' | 'inventory' | 'settings' | 'workspace' | string;
  entityId: string;
  /** Human label of the record (donor name, pooja name, item name…)
   *  for plain-language rendering; never an invented value. */
  entityLabel?: string;
  /** i18n key of the plain-language template for this event. */
  summaryKey: string;
  /** Placeholder values for the template (donor, from, to, fields…). */
  summaryParams?: Record<string, string | number>;
  /** Money amount when the action is a money movement. */
  amount?: number;
  /**
   * Blueprint D — assisted mode: when the commit was made during a
   * declared assisted session, the helper who was physically helping
   * is recorded ALONGSIDE the actor (the actor stays the account
   * owner — nothing is shared or transferred between accounts; this
   * field only tells the truth about whose hands were on the device).
   * Stamped by the recorder (auditWriter) from the live session, never
   * by individual commit points. Absent on every ordinary event.
   */
  assistedBy?: { uid: string; name: string };
  /** Before/after digest for edits — scalar fields only, pruned. */
  changes?: Record<string, AuditChange>;
  /** Monotonic append order within the workspace chain. */
  seq: number;
  prevHash: string;
  hash: string;
  /** Commit time on the recording device (epoch ms). */
  createdAt: number;
}

/** What a commit point hands the recorder (chain fields are added). */
export type AuditEventInput = Omit<
  AuditEvent,
  'id' | 'seq' | 'prevHash' | 'hash' | 'createdAt'
> &
  Partial<Pick<AuditEvent, 'createdAt'>>;

/** Deterministic JSON: object keys sorted at every depth, so two
 *  computations over equal data always hash identically. */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map(
      (k) =>
        `${JSON.stringify(k)}:${stableStringify(
          (value as Record<string, unknown>)[k]
        )}`
    );
  return `{${parts.join(',')}}`;
}

/** The canonical string that is hashed — custody-chain form. */
export function auditCanonical(e: {
  prevHash: string;
  seq: number;
  createdAt: number;
  workspaceId: string;
  actorUid: string;
  action: string;
  entityType: string;
  entityId: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
  amount?: number;
  changes?: Record<string, AuditChange>;
}): string {
  const digest = stableStringify({
    summaryKey: e.summaryKey,
    summaryParams: e.summaryParams ?? {},
    amount: e.amount ?? null,
    changes: e.changes ?? {},
    entityLabel: (e as { entityLabel?: string }).entityLabel ?? null,
    // Blueprint D: the assisted-by stamp is hash-bound WHEN PRESENT —
    // and only then. Events written before assisted mode existed (or
    // outside an assisted session) canonicalize byte-identically to
    // before, so every existing chain still verifies.
    ...((e as unknown as { assistedBy?: { uid: string; name: string } })
      .assistedBy
      ? {
          assistedBy: (e as unknown as { assistedBy: { uid: string; name: string } })
            .assistedBy,
        }
      : {}),
  });
  return `${e.prevHash}|${e.seq}|${e.createdAt}|${e.workspaceId}|${e.actorUid}|${e.action}|${e.entityType}|${e.entityId}|${digest}`;
}

export function computeAuditHash(
  e: Parameters<typeof auditCanonical>[0] & { entityLabel?: string }
): string {
  return sha256Hex(auditCanonical(e));
}

/** Build a fully-chained event from an input + the current chain head. */
export function buildAuditEvent(
  input: AuditEventInput,
  head: { seq: number; hash: string } | null,
  id: string,
  createdAt: number
): AuditEvent {
  const seq = head ? head.seq + 1 : 0;
  const prevHash = head ? head.hash : AUDIT_GENESIS;
  const base = {
    ...input,
    id,
    seq,
    prevHash,
    createdAt: input.createdAt ?? createdAt,
  };
  const hash = computeAuditHash(base);
  return { ...base, hash };
}

export interface ChainVerification {
  ok: boolean;
  /** Index (in seq order) of the first broken event; -1 when intact. */
  firstBreak: number;
  /** Event id at the first break, when broken. */
  firstBreakId?: string;
  /** How many events were recomputed. */
  checked: number;
  /** True when the verified segment starts at the chain's GENESIS. */
  anchoredAtGenesis: boolean;
}

/**
 * Verify a chain segment in seq order — the custody verifyChain
 * semantics, generalised: every event's hash is recomputed from its
 * stored fields and every prevHash must equal the previous event's
 * hash. The first event's prevHash must be GENESIS when the segment
 * starts at seq 0; a later segment is verified for internal linkage
 * and reported as not genesis-anchored.
 */
export function verifyAuditChain(events: readonly AuditEvent[]): ChainVerification {
  const sorted = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const anchoredAtGenesis =
    sorted.length === 0 || (sorted[0].seq === 0 && sorted[0].prevHash === AUDIT_GENESIS);
  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const expectedPrev =
      i === 0 ? (ev.seq === 0 ? AUDIT_GENESIS : ev.prevHash) : sorted[i - 1].hash;
    if (ev.prevHash !== expectedPrev) {
      return { ok: false, firstBreak: i, firstBreakId: ev.id, checked: sorted.length, anchoredAtGenesis };
    }
    const recomputed = computeAuditHash(ev);
    if (recomputed !== ev.hash) {
      return { ok: false, firstBreak: i, firstBreakId: ev.id, checked: sorted.length, anchoredAtGenesis };
    }
  }
  return { ok: true, firstBreak: -1, checked: sorted.length, anchoredAtGenesis };
}

/**
 * Plain-language rendering of one event: the event's own summaryKey
 * template with placeholders filled from the event. `translate` is
 * the app's t() (or any key→string resolver); when the key does not
 * resolve (translate returns the key itself), falls back to a neutral
 * "Actor — action" line rather than showing a raw key.
 * Placeholders: {actor} {amount} {entity} + every summaryParams key.
 */
export function renderAuditSummary(
  event: Pick<
    AuditEvent,
    | 'actorName'
    | 'action'
    | 'summaryKey'
    | 'summaryParams'
    | 'amount'
    | 'entityLabel'
    | 'entityId'
    | 'assistedBy'
  >,
  translate: (key: string) => string,
  formatAmount: (n: number) => string
): string {
  const template = translate(event.summaryKey);
  if (!template || template === event.summaryKey) {
    return `${event.actorName} — ${event.action}`;
  }
  const values: Record<string, string> = {
    actor: event.actorName,
    entity: event.entityLabel || event.entityId,
    amount: event.amount != null ? formatAmount(event.amount) : '',
  };
  for (const [k, v] of Object.entries(event.summaryParams ?? {})) {
    values[k] = String(v);
  }
  let line = template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? values[key] : m
  );
  // Blueprint D suffixes — appended only when their template key
  // resolves (a language without the key simply shows the plain
  // line; the data is never hidden by a raw key string):
  //  - assisted sessions: "· with help from {helper}" — the helper
  //    is part of the forensic truth of the event (see AuditEvent).
  //  - practice entries: commit points mark practice rows with
  //    summaryParams.practice, so a trustee reading the stream can
  //    never mistake a practice entry for real money movement.
  if (event.assistedBy?.name) {
    const suffix = translate('org.audit.history.assistedBy');
    if (suffix && suffix !== 'org.audit.history.assistedBy') {
      line += suffix.replace(/\{(\w+)\}/g, (m, key: string) =>
        key === 'helper' ? event.assistedBy!.name : m
      );
    }
  }
  if (event.summaryParams?.practice) {
    const mark = translate('org.audit.history.practiceMark');
    if (mark && mark !== 'org.audit.history.practiceMark') {
      line += mark;
    }
  }
  return line;
}
