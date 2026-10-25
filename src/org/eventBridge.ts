/**
 * Sanatani Bandhan — Org events → Sangam bridge (pure logic).
 * ============================================================
 * Trustees announce events twice today: once in their org's `upcomingEvents`,
 * once in Sangam Events — two separate worlds. This bridge connects them:
 * one tap shares an org event to Sangam as the org's official event.
 *
 * Design laws:
 * - Nothing automatic: the trustee always taps Share. (An org-level
 *   auto-share toggle exists, default OFF — the trustee opted in.)
 * - Dedupe: the org event stores `sangamEventId`. Sharing twice updates
 *   the existing Sangam event instead of duplicating.
 * - The Sangam event is always the org's official post
 *   (orgId + orgName + isOfficial: true), and the creator must be a trustee
 *   of that org (enforced by the sangamEvents create rule).
 * - Free-text dates ("Every Purnima") can't become point-in-time Sangam
 *   events with RSVPs — Share is only offered for concrete dates. Honest,
 *   not clever.
 *
 * All cloud writes go through the Fix #1 serializers (`toCloudEvent`) —
 * never hand-rolled field sets.
 */
import type { PublicEventItem } from '../lib/orgPublic';
import type { SangamEvent } from '../sangam/types';

/** An org event with bridge bookkeeping. `id` is stable for dedupe. */
export interface OrgEventItem extends PublicEventItem {
  id: string;
  /** sangamEvents doc id, set once the event is shared. */
  sangamEventId?: string;
}

export const MAX_ORG_EVENTS = 10;

/** Input shape accepted by the sangam store's createEvent. */
export type SangamEventInput = Omit<
  SangamEvent,
  'id' | 'creatorUid' | 'creatorName' | 'rsvpCount' | 'createdAt'
>;

/**
 * Backfill stable ids onto legacy event items (which had no id).
 * Pure — returns a new array; existing ids are preserved.
 */
export function ensureEventIds(events: PublicEventItem[]): OrgEventItem[] {
  return events.map((e, i) => {
    const withId = e as OrgEventItem;
    return withId.id
      ? withId
      : { ...e, id: `orgev-${Date.now().toString(36)}-${i}` };
  });
}

/**
 * Parse an org event's date (+ optional time) to epoch ms.
 * Accepts "YYYY-MM-DD" with optional "HH:MM" (24h) time.
 * Returns null for free-text dates like "Every Purnima" — those can't
 * become point-in-time Sangam events and are never shared.
 */
export function parseEventStart(date: string, time?: string): number | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  let hh = 9;
  let mm = 0;
  if (time) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(time.trim());
    if (tm) {
      hh = Math.min(23, parseInt(tm[1], 10));
      mm = Math.min(59, parseInt(tm[2], 10));
    }
  }
  const at = new Date(
    parseInt(y, 10),
    parseInt(mo, 10) - 1,
    parseInt(d, 10),
    hh,
    mm,
    0,
    0
  ).getTime();
  return Number.isNaN(at) ? null : at;
}

/** True when the event can be shared: titled + has a concrete date. */
export function canShareToSangam(item: OrgEventItem): boolean {
  return item.title.trim().length > 0 && parseEventStart(item.date, item.time) !== null;
}

/** True when the event is already shared to Sangam. */
export function isShared(item: OrgEventItem): boolean {
  return Boolean(item.sangamEventId);
}

/**
 * Build the createEvent input for an org event. The Sangam event carries
 * the org's identity (official post) and links back via description.
 */
export function buildSangamEventInput(
  item: OrgEventItem,
  org: { orgId: string; orgName: string }
): SangamEventInput | null {
  const startsAt = parseEventStart(item.date, item.time);
  if (!startsAt || item.title.trim().length === 0) return null;
  const when = [item.date, item.time].filter(Boolean).join(' · ');
  return {
    title: item.title.trim(),
    kind: 'utsav',
    description:
      (item.description?.trim() || '') +
      `\n\n🪔 Official event of ${org.orgName} (${when}).`,
    venue: org.orgName,
    startsAt,
    orgId: org.orgId,
    orgName: org.orgName,
    isOfficial: true,
    // EVENTS P1: a recurring org event shares as a recurring Sangam
    // event — startsAt is the first occurrence, the rule travels.
    ...(item.recurrence ? { recurrence: item.recurrence } : {}),
  };
}

/**
 * Fields the creator may update on an already-shared Sangam event.
 * Mirrors the sangamEvents update-rule whitelist exactly.
 */
export function buildSangamEventUpdate(
  item: OrgEventItem,
  org: { orgId: string; orgName: string }
): Record<string, unknown> | null {
  const input = buildSangamEventInput(item, org);
  if (!input) return null;
  return {
    title: input.title,
    kind: input.kind,
    description: input.description,
    venue: input.venue,
    startsAt: input.startsAt,
    // EVENTS P1: recurrence edits propagate through the creator
    // update path (rules whitelist carries the field) — including
    // removal, written as an explicit null the surfaces treat as
    // "no rule" like an absent field.
    recurrence: input.recurrence ?? null,
  };
}

/** Validate an event form before saving. Returns an error key or null. */
export function validateOrgEvent(input: {
  title: string;
  date: string;
}): 'title' | 'date' | null {
  if (input.title.trim().length === 0) return 'title';
  if (input.date.trim().length === 0) return 'date';
  return null;
}
