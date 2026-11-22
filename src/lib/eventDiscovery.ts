/**
 * eventDiscovery.ts — EVENTS E7: cross-org PUBLIC event discovery.
 * =====================================================================
 * Pure shaping for the read-free /events page. The page may only use
 * data that is world-readable under the current firestore.rules —
 * the investigation (~/workspace/staging/events-e7/NOTES.md) proved
 * exactly three sources, pinned here and by unit test:
 *
 *   1. `festival_events` — published docs only (read rule: published
 *      == true is the public door; the query filters on it).
 *   2. `sangamEvents` — read: if true.
 *   3. `orgPages` — read: if true; the OrgEventManager-published
 *      `upcomingEvents` list on each org's public page doc.
 *
 * Nothing behind login is shaped here: no RSVPs, no tickets, no
 * feedback, no workspace stores. Cards link ONLY to canonical public
 * routes that already exist (/festival/:orgId/:eventId, /org/:orgId);
 * a community Sangam event with no org has no public page anywhere
 * in the app, so its card carries no link rather than an invented one.
 */
import type { FestivalEventDoc, Lang3 } from './festival';
import type { SangamEvent } from '../sangam/types';
import type { PublicEventItem } from './orgPublic';
import { expandOccurrences, localTodayISO } from './eventRecurrence';

/** The ONLY collections the discovery surface may read. Guard-pinned. */
export const PUBLIC_EVENT_SOURCES = ['festival_events', 'sangamEvents', 'orgPages'] as const;

/** Per-source fetch cap — one bounded query set, never a full scan. */
export const DISCOVERY_FETCH_LIMIT = 200;

/** How far ahead a recurring series is expanded to find its next day. */
export const DISCOVERY_HORIZON_DAYS = 366;

export type DiscoveryKind = 'festival' | 'sangam' | 'org';

export interface DiscoveryCard {
  /** Stable per-source id (`festival:…`, `sangam:…`, `org:…`). */
  id: string;
  kind: DiscoveryKind;
  title: string;
  /** The hosting organisation's name (creator name for community Sangam). */
  orgName: string;
  orgId?: string;
  /** First (or next) day of the event, YYYY-MM-DD. */
  startISO: string;
  /** Last day, YYYY-MM-DD (>= startISO). */
  endISO: string;
  /** Place, ONLY when the public source itself carries one. */
  place?: string;
  /** Canonical public route — absent when no public page exists. */
  href?: string;
  /** E2: the published doc carries seva-pass tiers. */
  hasPasses: boolean;
  /** E4: the committee published a debrief summary. */
  hasDebrief: boolean;
  /** Sangam: trustee-posted official org event. */
  official?: boolean;
  /** Sangam sub-kind (utsav|katha|yatra|satsang|seva|other), data label. */
  sangamKind?: SangamEvent['kind'];
}

/** Minimal org-page shape the shaper needs (the orgPages doc + its id). */
export interface DiscoveryOrgPage {
  orgId: string;
  name?: string;
  city?: string;
  upcomingEvents?: PublicEventItem[];
}

/* ------------------------------------------------------------------ */
/* Date helpers (civil dates, local — the recurrence engine's idiom)   */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string): boolean {
  return ISO_DATE.test(s);
}

/** Local YYYY-MM-DD for an epoch-ms instant. */
export function isoFromMs(ms: number): string {
  const d = new Date(ms);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd = `${dt.getDate()}`.padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** Whole days from `fromISO` to `toISO` (negative when toISO is past). */
export function diffDaysISO(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split('-').map(Number);
  const [y2, m2, d2] = toISO.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

/** The day grouping/sorting uses: an ongoing event counts from today. */
export function effectiveStartISO(card: DiscoveryCard, todayISO: string): string {
  return card.startISO < todayISO && card.endISO >= todayISO ? todayISO : card.startISO;
}

/* ------------------------------------------------------------------ */
/* Card builders — one per public source                               */
/* ------------------------------------------------------------------ */

/**
 * A published festival doc → a card, or null when it must not be
 * listed (unpublished, cancelled by the trustee, or already over).
 * `pickTitle` resolves the Lang3 name (the page passes pickLang).
 */
export function festivalCard(
  doc: FestivalEventDoc,
  todayISO: string,
  pickTitle: (name: Lang3) => string
): DiscoveryCard | null {
  if (!doc.published) return null;
  if (doc.festivalCancelled) return null;
  if (!isISODate(doc.dateISO) || !isISODate(doc.endDateISO || doc.dateISO)) return null;
  const endISO = doc.endDateISO || doc.dateISO;
  if (endISO < todayISO) return null;
  return {
    id: `festival:${doc.id}`,
    kind: 'festival',
    title: pickTitle(doc.name),
    orgName: doc.orgName || '',
    orgId: doc.workspaceId,
    startISO: doc.dateISO,
    endISO,
    href: `/festival/${encodeURIComponent(doc.workspaceId)}/${encodeURIComponent(doc.id)}`,
    hasPasses: Array.isArray(doc.ticketTiers) && doc.ticketTiers.length > 0,
    hasDebrief: !!doc.debriefSummary,
  };
}

/**
 * A Sangam event → a card, or null when it is over. A recurring
 * series is represented by its NEXT occurrence (one card per series);
 * a series whose rule yields nothing inside the horizon falls back
 * to its raw dates. Community events (no orgId) get no href — there
 * is no public page for them anywhere in the app.
 */
export function sangamCard(ev: SangamEvent, todayISO: string): DiscoveryCard | null {
  let startISO = isoFromMs(ev.startsAt);
  let endISO = isoFromMs(ev.endsAt ?? ev.startsAt);
  if (ev.recurrence) {
    const occs = expandOccurrences(
      startISO,
      ev.recurrence,
      todayISO,
      addDaysISO(todayISO, DISCOVERY_HORIZON_DAYS)
    );
    if (occs.length > 0) {
      startISO = occs[0].date;
      endISO = occs[0].date;
    }
  }
  if (endISO < todayISO) return null;
  return {
    id: `sangam:${ev.id}`,
    kind: 'sangam',
    title: ev.title,
    orgName: ev.orgName || ev.creatorName || '',
    orgId: ev.orgId || undefined,
    startISO,
    endISO,
    place: ev.venue || undefined,
    href: ev.orgId ? `/org/${encodeURIComponent(ev.orgId)}` : undefined,
    hasPasses: false,
    hasDebrief: false,
    official: !!ev.isOfficial,
    sangamKind: ev.kind,
  };
}

/**
 * One org page's published `upcomingEvents` → cards. An item is
 * listable only when it can be placed on a calendar honestly: an ISO
 * date that has not passed, or a recurrence rule whose next
 * occurrence lands inside the horizon. Free-text dates ("Every
 * Purnima") with no rule stay on the org's own page, which renders
 * them as text — discovery never guesses a date for them.
 */
export function orgPageCards(page: DiscoveryOrgPage, todayISO: string): DiscoveryCard[] {
  const out: DiscoveryCard[] = [];
  const items = page.upcomingEvents || [];
  items.forEach((item, idx) => {
    let startISO: string | null = null;
    if (item.recurrence && isISODate(item.date)) {
      const occs = expandOccurrences(
        item.date,
        item.recurrence,
        todayISO,
        addDaysISO(todayISO, DISCOVERY_HORIZON_DAYS)
      );
      if (occs.length > 0) startISO = occs[0].date;
    } else if (isISODate(item.date) && item.date >= todayISO) {
      startISO = item.date;
    }
    if (!startISO) return;
    out.push({
      id: `org:${page.orgId}:${idx}`,
      kind: 'org',
      title: item.title,
      orgName: page.name || '',
      orgId: page.orgId,
      startISO,
      endISO: startISO,
      place: page.city || undefined,
      href: `/org/${encodeURIComponent(page.orgId)}`,
      hasPasses: false,
      hasDebrief: false,
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Assembly, grouping, filtering                                       */
/* ------------------------------------------------------------------ */

export interface DiscoveryInputs {
  festivals: FestivalEventDoc[];
  sangamEvents: SangamEvent[];
  orgPages: DiscoveryOrgPage[];
}

/** All upcoming cards across every public source, soonest first. */
export function buildDiscoveryCards(
  inputs: DiscoveryInputs,
  todayISO: string = localTodayISO(),
  pickTitle: (name: Lang3) => string = (n) => n.en
): DiscoveryCard[] {
  const cards: DiscoveryCard[] = [];
  for (const doc of inputs.festivals) {
    const c = festivalCard(doc, todayISO, pickTitle);
    if (c) cards.push(c);
  }
  for (const ev of inputs.sangamEvents) {
    const c = sangamCard(ev, todayISO);
    if (c) cards.push(c);
  }
  for (const page of inputs.orgPages) {
    cards.push(...orgPageCards(page, todayISO));
  }
  return sortCards(cards, todayISO);
}

export function sortCards(cards: DiscoveryCard[], todayISO: string): DiscoveryCard[] {
  return [...cards].sort((a, b) => {
    const ea = effectiveStartISO(a, todayISO);
    const eb = effectiveStartISO(b, todayISO);
    if (ea !== eb) return ea < eb ? -1 : 1;
    if (a.startISO !== b.startISO) return a.startISO < b.startISO ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export interface DiscoveryGroups {
  today: DiscoveryCard[];
  thisWeek: DiscoveryCard[];
  comingUp: DiscoveryCard[];
}

/** Today (incl. ongoing) / the next 7 days / everything after. */
export function groupCards(cards: DiscoveryCard[], todayISO: string): DiscoveryGroups {
  const groups: DiscoveryGroups = { today: [], thisWeek: [], comingUp: [] };
  for (const card of cards) {
    const d = diffDaysISO(todayISO, effectiveStartISO(card, todayISO));
    if (d <= 0) groups.today.push(card);
    else if (d <= 7) groups.thisWeek.push(card);
    else groups.comingUp.push(card);
  }
  return groups;
}

/** Organisation filter options, derived from the cards themselves. */
export function orgOptions(cards: DiscoveryCard[]): string[] {
  return [...new Set(cards.map((c) => c.orgName).filter((n) => n.trim() !== ''))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/** Kind filter options, derived — only kinds actually present appear. */
export function kindOptions(cards: DiscoveryCard[]): DiscoveryKind[] {
  const present = new Set(cards.map((c) => c.kind));
  return (['festival', 'sangam', 'org'] as DiscoveryKind[]).filter((k) => present.has(k));
}

export interface DiscoveryFilter {
  orgName?: string;
  kind?: DiscoveryKind;
}

export function filterCards(cards: DiscoveryCard[], filter: DiscoveryFilter): DiscoveryCard[] {
  return cards.filter(
    (c) =>
      (!filter.orgName || c.orgName === filter.orgName) &&
      (!filter.kind || c.kind === filter.kind)
  );
}
