/**
 * notifications/preferences.ts — per-category notification settings.
 * ==================================================================
 * The devotee's calm is configurable. Every category gets a policy; quiet
 * hours default to Brahma muhurta (05:00–07:00), the stillest part of the day.
 *
 * Nothing here touches the network. Pure logic + a small Firestore
 * read/write pair for persistence (owner-only doc, see rules snippet).
 */

import type { NotifyKind } from './types';

/** How promptly a category may reach the devotee. */
export type InstantPolicy = 'instant' | 'digest' | 'off';

/** Which digest window Suchana-style items join. */
export type SuchanaPolicy = 'morning' | 'evening' | 'off';

/** 24h 'HH:MM' strings, e.g. { start: '05:00', end: '07:00' }. */
export interface QuietHours {
  start: string;
  end: string;
}

export interface NotificationPrefs {
  moneyRequests: InstantPolicy;
  chat: InstantPolicy;
  suchana: SuchanaPolicy;
  blessings: boolean;
  quietHours: QuietHours;
  /** Manual do-not-disturb. Critical still breaks through. */
  dnd: boolean;
}

/** The calm defaults: everything instant except the Suchana digest. */
export const DEFAULT_PREFS: NotificationPrefs = {
  moneyRequests: 'instant',
  chat: 'instant',
  suchana: 'morning',
  blessings: true,
  quietHours: { start: '05:00', end: '07:00' },
  dnd: false,
};

/** Deep-merge a partial prefs patch over the defaults. */
export function mergePrefs(patch?: Partial<NotificationPrefs>): NotificationPrefs {
  if (!patch) return { ...DEFAULT_PREFS, quietHours: { ...DEFAULT_PREFS.quietHours } };
  return {
    ...DEFAULT_PREFS,
    ...patch,
    quietHours: { ...DEFAULT_PREFS.quietHours, ...(patch.quietHours ?? {}) },
  };
}

/** Parse 'HH:MM' → minutes since midnight. Returns null on garbage input. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Is `nowMs` inside the quiet-hours window? Handles windows that span
 * midnight (e.g. 22:00–06:00). Invalid input → not quiet (fail-open calm).
 */
export function isInQuietHours(nowMs: number, qh: QuietHours): boolean {
  const start = toMinutes(qh.start);
  const end = toMinutes(qh.end);
  if (start === null || end === null || start === end) return false;
  const d = new Date(nowMs);
  const cur = d.getHours() * 60 + d.getMinutes();
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end; // spans midnight
}

/**
 * Epoch ms when the current quiet-hours window ends (the moment a held
 * push may be released). If not currently quiet, returns nowMs.
 */
export function quietHoursEndMs(nowMs: number, qh: QuietHours): number {
  if (!isInQuietHours(nowMs, qh)) return nowMs;
  const end = toMinutes(qh.end);
  if (end === null) return nowMs;
  const d = new Date(nowMs);
  const cur = d.getHours() * 60 + d.getMinutes();
  const endDate = new Date(nowMs);
  endDate.setHours(0, 0, 0, 0);
  // If the window spans midnight and we are past midnight, the end is today;
  // otherwise it is today if end > cur, else tomorrow.
  const start = toMinutes(qh.start);
  const spansMidnight = start !== null && start > end;
  if (spansMidnight) {
    if (cur < end) endDate.setDate(endDate.getDate()); // ends later today
    else endDate.setDate(endDate.getDate() + 1);
  } else if (end <= cur) {
    endDate.setDate(endDate.getDate() + 1);
  }
  endDate.setMinutes(end);
  return endDate.getTime();
}

/**
 * Which preference category a NotifyKind belongs to.
 * sos / wallet / org / security have no toggle — priority rules them.
 */
export type PrefCategory = 'moneyRequests' | 'chat' | 'suchana' | 'blessings' | null;

export function categoryFor(kind: NotifyKind): PrefCategory {
  switch (kind) {
    case 'money_request':
      return 'moneyRequests';
    case 'chat':
      return 'chat';
    case 'suchana':
      return 'suchana';
    case 'blessing':
      return 'blessings';
    default:
      return null;
  }
}

/**
 * Does the category policy allow an immediate ping for this kind?
 * 'digest' and 'off' never ping (except critical, handled by the engine).
 */
export function policyAllowsPing(kind: NotifyKind, prefs: NotificationPrefs): boolean {
  const cat = categoryFor(kind);
  if (cat === 'moneyRequests' || cat === 'chat') return prefs[cat] === 'instant';
  if (cat === 'blessings') return prefs.blessings;
  if (cat === 'suchana') return prefs.suchana !== 'off';
  return true; // sos, wallet, org, security — no toggle
}

/** Should this kind be batched into a digest rather than pinged now? */
export function policyWantsDigest(kind: NotifyKind, prefs: NotificationPrefs): boolean {
  const cat = categoryFor(kind);
  if (cat === 'moneyRequests' || cat === 'chat') return prefs[cat] === 'digest';
  return false;
}
