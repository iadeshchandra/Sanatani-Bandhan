/**
 * eventPass.ts — SB-EVENT passes for festival gate check-in (EVENTS E3).
 * =====================================================================
 * Every CONFIRMED festival RSVP gains a scannable pass in the app's
 * existing devotee-pass family (utils/qrUtils): the same HMAC-signed,
 * 5-minute dynamic token the Standard-B Gate Pass uses — minted and
 * verified by `generateDynamicToken` / `verifyDynamicToken`, never a
 * new scheme. The payload binds the pass to one RSVP record:
 *
 *   { type: 'sb-event', purpose: 'SB-EVENT', wid, eventId, date,
 *     rsvpId, name, headcount }
 *
 *   wid      — the workspace (org) id
 *   eventId  — the published festival_events doc id
 *              (`${workspaceId}__${festivalKey}` — it embeds the org)
 *   date     — the occurrence day (YYYY-MM-DD) this pass admits for
 *   rsvpId   — the festival_rsvps doc id; the gate's replay identity
 *
 * GATE DECISIONS (evaluateGateScan) are pure: signature/expiry come
 * from the family verifier (readEventPassToken); event/day matching,
 * the day-scoped one-scan-once rule and the RSVP cross-check are
 * decided here so the War Room and the gate can never disagree —
 * both read the same `checkedIn` state on the same RSVP record.
 *
 * ONE-SCAN-ONCE is scoped per event + DAY (the replay registry in
 * eventGateRegistry.ts): a devotee booked for day 1 and day 3 is
 * admitted on both days, once each. The record's own `checkedInAt`
 * is the cross-device witness: if it falls on the gate day, the
 * party was already admitted today (by any gate device).
 *
 * HONEST LIMITS — the same ones the pass family already carries:
 * the signing secret ships inside the app, so the HMAC is
 * tamper-EVIDENCE (casual edits, damaged prints and screenshots past
 * the 5-minute window all fail), not a bank-grade signature. The
 * RSVP-record cross-check at the gate is the real authority: a
 * well-formed token for a cancelled or unconfirmed booking admits
 * nobody. Server-side signing stays the parked Blaze step; no
 * surface in this batch claims more than the family already does.
 */
import { generateDynamicToken, verifyDynamicToken } from '../utils/qrUtils';
import type { RsvpEntry } from './festival';

/** Pass-family type tag (mirrors QR_TYPE_VERIFY's 'sb-verify'). */
export const EVENT_PASS_TYPE = 'sb-event';
/** Pass-family purpose tag (mirrors the Gate Pass's 'Gate Pass'). */
export const EVENT_PASS_PURPOSE = 'SB-EVENT';
/** Dynamic-token lifetime — the family's 5 minutes. */
export const EVENT_PASS_VALIDITY_SECONDS = 300;

export interface EventPassPayload {
  type: typeof EVENT_PASS_TYPE;
  purpose: typeof EVENT_PASS_PURPOSE;
  /** Workspace (org) id. */
  wid: string;
  /** Published festival_events doc id. */
  eventId: string;
  /** Occurrence day this pass admits for (YYYY-MM-DD). */
  date: string;
  /** festival_rsvps doc id — the replay identity. */
  rsvpId: string;
  /** Attendee (party lead) name, as booked. */
  name: string;
  /** Party size booked on the record. */
  headcount: number;
}

export interface EventPassInput {
  workspaceId: string;
  eventId: string;
  date: string;
  rsvpId: string;
  name: string;
  headcount: number;
}

/** Build the payload a devotee's pass carries. Pure. */
export function buildEventPassPayload(input: EventPassInput): EventPassPayload {
  return {
    type: EVENT_PASS_TYPE,
    purpose: EVENT_PASS_PURPOSE,
    wid: input.workspaceId,
    eventId: input.eventId,
    date: input.date,
    rsvpId: input.rsvpId,
    name: input.name,
    headcount: input.headcount,
  };
}

/**
 * Mint the scannable token for a devotee's pass (family dynamic
 * token, 5-minute validity — the pass surface re-mints as it lapses,
 * exactly like the Standard-B gate pass).
 */
export function mintEventPassToken(
  input: EventPassInput,
  validitySeconds: number = EVENT_PASS_VALIDITY_SECONDS
): string {
  return generateDynamicToken(buildEventPassPayload(input), validitySeconds);
}

export type EventPassRead =
  | { ok: true; payload: EventPassPayload }
  | {
      ok: false;
      error:
        | 'TOKEN_EXPIRED'
        | 'SIGNATURE_MISMATCH'
        | 'INVALID_FORMAT'
        | 'NOT_AN_EVENT_PASS'
        | 'TAMPER_DETECTED';
    };

/**
 * Shape-check a decoded dynamic-token payload as an event pass.
 * Pure — separated from the token read so the shape rules are
 * testable without the verifier.
 */
export function parseEventPassPayload(decoded: unknown): EventPassRead {
  if (!decoded || typeof decoded !== 'object') return { ok: false, error: 'INVALID_FORMAT' };
  const p = decoded as Record<string, unknown>;
  if (p.type !== EVENT_PASS_TYPE || p.purpose !== EVENT_PASS_PURPOSE) {
    return { ok: false, error: 'NOT_AN_EVENT_PASS' };
  }
  const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  if (
    !str(p.wid) || !str(p.eventId) || !str(p.rsvpId) || !str(p.name) ||
    !str(p.date) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
    typeof p.headcount !== 'number' || !Number.isFinite(p.headcount) || p.headcount < 1
  ) {
    return { ok: false, error: 'TAMPER_DETECTED' };
  }
  return {
    ok: true,
    payload: {
      type: EVENT_PASS_TYPE,
      purpose: EVENT_PASS_PURPOSE,
      wid: p.wid,
      eventId: p.eventId,
      date: p.date,
      rsvpId: p.rsvpId,
      name: p.name,
      headcount: p.headcount,
    },
  };
}

/**
 * Verify a scanned token as an event pass: the family verifier
 * (signature + expiry) first, then the event-pass shape. A valid
 * family token that is not an event pass (e.g. a darshan Gate Pass)
 * reads NOT_AN_EVENT_PASS — the gate shows INVALID, never a
 * darshan admission.
 *
 * FORMAT GATE: event passes exist ONLY as signed `SBDYN:` dynamic
 * tokens — that is the sole format `mintEventPassToken` produces,
 * and there is no legacy sb-event format in the wild. The family
 * verifier additionally accepts UNSIGNED legacy payloads (raw JSON /
 * base64 JSON) for older pass kinds; the event gate deliberately
 * does not inherit those paths, so anything that is not an `SBDYN:`
 * token is INVALID_FORMAT here, before the verifier runs. (The
 * prefix literal mirrors `DYNAMIC_TOKEN_PREFIX` in qrUtils, which
 * is not exported.) This does not change the family's honesty
 * posture: a forger who extracts the in-app secret can still mint
 * signed tokens — the RSVP cross-check remains the authority.
 */
export function readEventPassToken(token: string): EventPassRead {
  if (!token || typeof token !== 'string' || !token.trim().startsWith('SBDYN:')) {
    return { ok: false, error: 'INVALID_FORMAT' };
  }
  const v = verifyDynamicToken(token);
  if (!v.valid) {
    if (v.error === 'TOKEN_EXPIRED') {
      // An expired EVENT pass is still recognisably an event pass
      // when its (untrusted, signature-unchecked) shape says so —
      // but expiry is expiry: report it as expired so the gate can
      // give the "reopen for a fresh code" guidance. The payload is
      // never trusted for admission on this path.
      return { ok: false, error: 'TOKEN_EXPIRED' };
    }
    if (v.error === 'SIGNATURE_MISMATCH') return { ok: false, error: 'SIGNATURE_MISMATCH' };
    return { ok: false, error: 'INVALID_FORMAT' };
  }
  return parseEventPassPayload(v.payload);
}

/* ------------------------------------------------------------------ */
/* Day logic                                                           */
/* ------------------------------------------------------------------ */

/** Local civil date (YYYY-MM-DD) of an ISO timestamp on this device. */
export function localDateOfIso(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Does this RSVP attend `day`? A record with no `days` attends every
 * festival day (EVENTS P1); a record with days attends exactly those.
 */
export function rsvpAttendsDay(
  rsvp: Pick<RsvpEntry, 'days'>,
  day: string,
  festivalDays: readonly string[]
): boolean {
  if (!festivalDays.includes(day)) return false;
  if (!rsvp.days || rsvp.days.length === 0) return true;
  return rsvp.days.includes(day);
}

/**
 * Was this party already admitted on `day`? Two witnesses, either is
 * enough: this device's replay registry (firstScanAtMs), or the
 * record's own checkedInAt falling on the gate day (another gate
 * device admitted them — the War Room state is shared).
 */
export function admittedOnDay(
  rsvp: Pick<RsvpEntry, 'checkedIn' | 'checkedInAt'>,
  day: string,
  registryFirstScanAt: number | null | undefined
): { used: boolean; firstAt: string | null } {
  if (registryFirstScanAt != null && Number.isFinite(registryFirstScanAt)) {
    return { used: true, firstAt: new Date(registryFirstScanAt).toISOString() };
  }
  if (rsvp.checkedIn && localDateOfIso(rsvp.checkedInAt) === day) {
    return { used: true, firstAt: rsvp.checkedInAt || null };
  }
  return { used: false, firstAt: null };
}

/* ------------------------------------------------------------------ */
/* The gate decision                                                   */
/* ------------------------------------------------------------------ */

export type GateOutcome =
  | 'ADMITTED'
  | 'ALREADY_USED'
  | 'WRONG_EVENT'
  | 'WRONG_DAY'
  | 'INVALID';

export interface GateDecision {
  outcome: GateOutcome;
  /** Machine reason for INVALID / detail for the others. */
  reason?:
    | 'expired'
    | 'signature'
    | 'format'
    | 'not-event-pass'
    | 'tampered'
    | 'no-record'
    | 'not-confirmed'
    | 'record-mismatch';
  /** The verified payload (present once the token itself verified). */
  payload?: EventPassPayload;
  /** When the party was first admitted today (ALREADY_USED). */
  firstAdmittedAt?: string | null;
}

export interface GateScanInput {
  /** Result of readEventPassToken on the scanned text. */
  read: EventPassRead;
  /** The event the gate is running. */
  selectedEventId: string;
  /** The day the gate is running (YYYY-MM-DD). */
  gateDay: string;
  /** All civil days of the selected festival. */
  festivalDays: readonly string[];
  /** The RSVP record the pass points at, if the gate has it loaded. */
  record: RsvpEntry | null | undefined;
  /** This device's registry first-scan time for the record + day. */
  registryFirstScanAt: number | null | undefined;
}

/**
 * Decide one scan. Order matters — cheapest, most structural checks
 * first, and a pass is only ever ADMITTED when every witness agrees:
 * signature ✓, this event ✓, this day ✓, a confirmed booking that
 * attends today ✓, not already admitted today ✓.
 */
export function evaluateGateScan(input: GateScanInput): GateDecision {
  const { read, selectedEventId, gateDay, festivalDays, record, registryFirstScanAt } = input;

  // NOTE: `=== false`, not `!read.ok` — this repo's tsconfig runs
  // without strictNullChecks, under which the negated discriminant
  // does not narrow the union.
  if (read.ok === false) {
    switch (read.error) {
      case 'TOKEN_EXPIRED':
        return { outcome: 'INVALID', reason: 'expired' };
      case 'SIGNATURE_MISMATCH':
        return { outcome: 'INVALID', reason: 'signature' };
      case 'NOT_AN_EVENT_PASS':
        return { outcome: 'INVALID', reason: 'not-event-pass' };
      case 'TAMPER_DETECTED':
        return { outcome: 'INVALID', reason: 'tampered' };
      default:
        return { outcome: 'INVALID', reason: 'format' };
    }
  }

  const payload = read.payload;

  if (payload.eventId !== selectedEventId) {
    return { outcome: 'WRONG_EVENT', payload };
  }
  if (payload.date !== gateDay || !festivalDays.includes(payload.date)) {
    return { outcome: 'WRONG_DAY', payload };
  }
  if (!record) {
    return { outcome: 'INVALID', reason: 'no-record', payload };
  }
  if (record.id !== payload.rsvpId || record.eventId !== payload.eventId) {
    return { outcome: 'INVALID', reason: 'record-mismatch', payload };
  }
  if ((record.status || 'confirmed') !== 'confirmed') {
    return { outcome: 'INVALID', reason: 'not-confirmed', payload };
  }
  if (!rsvpAttendsDay(record, gateDay, festivalDays)) {
    return { outcome: 'WRONG_DAY', payload };
  }
  const prior = admittedOnDay(record, gateDay, registryFirstScanAt);
  if (prior.used) {
    return { outcome: 'ALREADY_USED', payload, firstAdmittedAt: prior.firstAt };
  }
  return { outcome: 'ADMITTED', payload };
}

/* ------------------------------------------------------------------ */
/* Live gate counts                                                    */
/* ------------------------------------------------------------------ */

export interface GateCounts {
  expectedHeads: number;
  expectedParties: number;
  admittedHeads: number;
  admittedParties: number;
}

/**
 * Admitted vs confirmed-expected for one gate day, derived from the
 * same RSVP records the War Room reads — heads are party sizes, so
 * the gate header and the War Room's arrived/expected can be
 * reconciled by eye.
 */
export function gateCounts(
  rsvps: readonly RsvpEntry[],
  festivalDays: readonly string[],
  gateDay: string,
  registryFirstScanAt: (rsvpId: string) => number | null | undefined
): GateCounts {
  const out: GateCounts = { expectedHeads: 0, expectedParties: 0, admittedHeads: 0, admittedParties: 0 };
  for (const r of rsvps) {
    if ((r.status || 'confirmed') !== 'confirmed') continue;
    if (!rsvpAttendsDay(r, gateDay, festivalDays)) continue;
    out.expectedHeads += r.headcount || 0;
    out.expectedParties += 1;
    if (admittedOnDay(r, gateDay, registryFirstScanAt(r.id)).used) {
      out.admittedHeads += r.headcount || 0;
      out.admittedParties += 1;
    }
  }
  return out;
}

/**
 * Which day a devotee's pass should be minted for: today when they
 * attend today, else their next attending day, else their last one
 * (a concluded festival still shows the pass they used).
 */
export function pickPassDate(
  rsvp: Pick<RsvpEntry, 'days'>,
  festivalDays: readonly string[],
  today: string
): string | null {
  const attending = festivalDays.filter((d) => rsvpAttendsDay(rsvp, d, festivalDays));
  if (attending.length === 0) return null;
  if (attending.includes(today)) return today;
  const next = attending.find((d) => d > today);
  return next || attending[attending.length - 1];
}
