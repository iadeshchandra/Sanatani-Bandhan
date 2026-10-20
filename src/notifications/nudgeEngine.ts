/**
 * notifications/nudgeEngine.ts — gentle suggestions, never auto-actions.
 * =====================================================================
 * PHASE 4 — Notification intelligence layer.
 *
 * A nudge SUGGESTS. It never acts on the devotee's behalf, never charges,
 * never sends. Every nudge is dismissable, quiet-hours-aware (nudges wait
 * patiently instead of firing), and fires at most once per trigger — the
 * store below guarantees they never nag twice.
 *
 * Inputs are plain signals the caller (Phase 1 scheduler / Phase 3 UI)
 * collects; this engine is pure logic + localStorage bookkeeping.
 */

import { isInQuietHours, type QuietHours } from './preferences';
import type { NotifyLang, TriText } from './types';
import { isFlagEnabled } from '../lib/platformGating';

/** Nudge kinds — suggestions only, NEVER auto-actions (standing rule). */
export type NudgeKind = 'money_reminder' | 'digest_waiting' | 'announcement_unread' | 'upcoming_tithi';

export interface NudgeAction {
  label: TriText;
  /** In-app deep link, e.g. '/wallet/requests/REQ-123'. */
  deepLink: string;
}

export interface Nudge {
  id: string;
  kind: NudgeKind;
  /** Nudges are always gentle priority — they suggest, they never demand. */
  priority: 'gentle';
  title: TriText;
  body: TriText;
  action: NudgeAction;
  dismissable: true;
}

/* ------------------------------------------------------------------ */
/* Signals — plain facts the caller already knows                      */
/* ------------------------------------------------------------------ */

export interface MoneyRequestSignal {
  id: string;
  /** Display name of the person the request was sent to. */
  name: string;
  amount?: string;
  /** Whole days since the request was created. */
  ageDays: number;
  settled: boolean;
}

export interface AnnouncementSignal {
  id: string;
  orgName: string;
  /** Whole hours since the announcement was published. */
  ageHours: number;
  /** Only members get the nudge — never outsiders. */
  isMember: boolean;
  /** Org id for the public page deep link (/org/:orgId). Optional. */
  orgId?: string;
  /** Optional deep link override; defaults to the org public page (/org/:orgId),
   * falling back to the org directory (/orgs) when orgId is unknown. */
  deepLink?: string;
}

export interface NudgeSignals {
  moneyRequests: MoneyRequestSignal[];
  /** Hours since the devotee last opened their Suchana digest; null = unknown. */
  digestUnopenedHours: number | null;
  /** How many items are waiting in the unopened digest. */
  digestPendingCount: number;
  unreadAnnouncements: AnnouncementSignal[];
  /**
   * Devotional giving layer (Phase 3): Ekadashi / Purnima / Amavasya
   * approaching within the reminder window. Optional — older callers
   * that don't know about tithis keep working unchanged.
   */
  upcomingTithis?: UpcomingTithiSignal[];
}

/** One approaching observance the devotee might give around. */
export interface UpcomingTithiSignal {
  /** Stable id, e.g. 'ekadashi-2026-11-04' — the dedupe key root. */
  id: string;
  tithi: 'Ekadashi' | 'Purnima' | 'Amavasya';
  /** Whole days from today (1 = tomorrow). */
  daysUntil: number;
  /** YYYY-MM-DD of the observance. */
  dateIso: string;
}

export interface NudgeOptions {
  now?: Date;
  lang?: NotifyLang;
  quietHours?: QuietHours;
  store?: NudgeStore;
}

/* ------------------------------------------------------------------ */
/* Store — shown/dismissed bookkeeping (the never-nag-twice guarantee) */
/* ------------------------------------------------------------------ */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface NudgeLedger {
  shown: Record<string, number>;
  dismissed: Record<string, number>;
}

const LEDGER_KEY = 'sb.notifications.nudges.v1';

function loadLedger(storage: StorageLike | null): NudgeLedger {
  if (!storage) return { shown: {}, dismissed: {} };
  try {
    const raw = storage.getItem(LEDGER_KEY);
    if (!raw) return { shown: {}, dismissed: {} };
    const parsed = JSON.parse(raw) as Partial<NudgeLedger>;
    return {
      shown: parsed.shown ?? {},
      dismissed: parsed.dismissed ?? {},
    };
  } catch {
    return { shown: {}, dismissed: {} };
  }
}

function saveLedger(storage: StorageLike | null, ledger: NudgeLedger): void {
  if (!storage) return;
  try {
    storage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* storage full or unavailable — nudges simply won't persist; never crash */
  }
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* non-browser / denied */
  }
  return null;
}

/** Persistent never-nag-twice bookkeeping. Injectable for tests. */
export class NudgeStore {
  private storage: StorageLike | null;
  private ledger: NudgeLedger;

  constructor(storage?: StorageLike | null) {
    this.storage = storage === undefined ? defaultStorage() : storage;
    this.ledger = loadLedger(this.storage);
  }

  wasShown(key: string): boolean {
    return key in this.ledger.shown;
  }

  wasDismissed(key: string): boolean {
    return key in this.ledger.dismissed;
  }

  /** Epoch ms when this nudge was last shown, or null. */
  lastShownAt(key: string): number | null {
    return this.ledger.shown[key] ?? null;
  }

  markShown(key: string, atMs: number = Date.now()): void {
    this.ledger.shown[key] = atMs;
    saveLedger(this.storage, this.ledger);
  }

  markDismissed(key: string): void {
    this.ledger.dismissed[key] = Date.now();
    saveLedger(this.storage, this.ledger);
  }
}

/* ------------------------------------------------------------------ */
/* Copy — Sanatani warmth, trilingual. Placeholders: {name} {days}      */
/* {count} {orgName} {hours}.                                          */
/* ------------------------------------------------------------------ */

function moneyReminderNudge(name: string, days: number): { title: TriText; body: TriText } {
  return {
    title: { en: 'A gentle reminder? 🪔', bn: 'একটি কোমল স্মরণ? 🪔', hi: 'एक सौम्य स्मरण? 🪔' },
    body: {
      en: `Your money request to ${name} is ${days} days old. A kind nudge keeps trust warm — only if you wish.`,
      bn: `${name}-কে পাঠানো আপনার অর্থ-অনুরোধের ${days} দিন হয়ে গেছে। চাইলে একটা কোমল স্মরণ পাঠাতে পারেন।`,
      hi: `${name} को भेजा गया आपका धन-अनुरोध ${days} दिन पुराना है। चाहें तो एक सौम्य स्मरण भेजें।`,
    },
  };
}

function digestWaitingNudge(count: number): { title: TriText; body: TriText } {
  return {
    title: {
      en: `${count} blessing${count === 1 ? '' : 's'} waiting in your digest 🌸`,
      bn: `আপনার ডাইজেস্টে ${count}টি আশীর্বাদ অপেক্ষা করছে 🌸`,
      hi: `आपके डाइजेस्ट में ${count} आशीर्वाद प्रतीक्षा कर रहे हैं 🌸`,
    },
    body: {
      en: 'You have not opened your Suchana in a while. Take a quiet moment — it is waiting for you.',
      bn: 'আপনি অনেকক্ষণ সুচনা খোলেননি। একটু শান্ত মুহূর্ত নিন — এটি আপনার জন্য অপেক্ষা করছে।',
      hi: 'आपने काफ़ी समय से अपनी सूचना नहीं खोली। एक शांत पल लें — वह आपकी प्रतीक्षा कर रही है।',
    },
  };
}

function announcementNudge(orgName: string, hours: number): { title: TriText; body: TriText } {
  return {
    title: {
      en: `📢 ${orgName} shared something`,
      bn: `📢 ${orgName} কিছু জানিয়েছে`,
      hi: `📢 ${orgName} ने कुछ साझा किया है`,
    },
    body: {
      en: `An announcement from ${orgName} is still unread after ${hours} hours. Have a look when you have a moment.`,
      bn: `${hours} ঘণ্টা পরেও ${orgName}-এর ঘোষণাটি পড়া হয়নি। সময় পেলে একবার দেখে নিন।`,
      hi: `${hours} घंटों के बाद भी ${orgName} की घोषणा अपठित है। जब समय मिले, एक नज़र डाल लें।`,
    },
  };
}

/**
 * Tithi-timed giving reminder — a suggestion, never a demand.
 * Warm, dismissible, no streak-shaming: dana is an offering, not a target.
 */
function tithiNudge(tithi: UpcomingTithiSignal['tithi'], days: number): { title: TriText; body: TriText } {
  const nameBn = tithi === 'Ekadashi' ? 'একাদশী' : tithi === 'Purnima' ? 'পূর্ণিমা' : 'অমাবস্যা';
  const nameHi = tithi === 'Ekadashi' ? 'एकादशी' : tithi === 'Purnima' ? 'पूर्णिमा' : 'अमावस्या';
  const dayWord = (n: number, one: string, many: string) => (n === 1 ? one : many);
  return {
    title: {
      en: `🪔 A gentle tithi reminder`,
      bn: `🪔 একটি কোমল তিথি-স্মরণ`,
      hi: `🪔 एक सौम्य तिथि-स्मरण`,
    },
    body: {
      en: `${tithi} is in ${days} ${dayWord(days, 'day', 'days')} — a gentle reminder, if you wish, for anna-dana or any giving close to your heart. 🙏`,
      bn: `${days} দিন পর ${nameBn} — চাইলে অন্নদান বা আপনার প্রিয় কোনো দানের জন্য একটি কোমল স্মরণ। 🙏`,
      hi: `${nameHi} ${days} दिन बाद है — चाहें तो अन्नदान या प्रिय दान हेतु एक सौम्य स्मरण। 🙏`,
    },
  };
}

const ACTION_COPY: Record<NudgeKind, TriText> = {
  money_reminder: { en: 'Send gentle reminder', bn: 'কোমল স্মরণ পাঠান', hi: 'सौम्य स्मरण भेजें' },
  digest_waiting: { en: 'Open Suchana', bn: 'সুচনা খুলুন', hi: 'सूचना खोलें' },
  announcement_unread: { en: 'Read announcement', bn: 'ঘোষণা পড়ুন', hi: 'घोषणा पढ़ें' },
  upcoming_tithi: { en: 'View punya ledger', bn: 'পুণ্য-খতিয়ান দেখুন', hi: 'पुण्य-लेखा देखें' },
};

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export const MONEY_REMINDER_AFTER_DAYS = 3;
export const DIGEST_NUDGE_AFTER_HOURS = 24;
export const ANNOUNCEMENT_NUDGE_AFTER_HOURS = 48;
/** The digest nudge may re-fire at most once per this window if still unopened. */
export const DIGEST_NUDGE_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
/**
 * Tithi reminder window: an Ekadashi / Purnima / Amavasya approaching
 * within this many days earns one gentle suggestion. Never on the day
 * itself (the Panjika covers today) and never past the window.
 */
export const UPCOMING_TITHI_WITHIN_DAYS = 7;

const t = (tri: TriText, lang: NotifyLang): TriText => tri; // identity: copy is already trilingual

/**
 * Generate today's nudges. Quiet hours → empty (nudges wait, they never
 * interrupt). Every emitted nudge is recorded in the store so it can never
 * nag twice.
 */
export function generateNudges(signals: NudgeSignals, opts: NudgeOptions = {}): Nudge[] {
  const now = opts.now ?? new Date();
  const lang: NotifyLang = opts.lang ?? 'en';
  const store = opts.store ?? new NudgeStore();

  if (opts.quietHours && isInQuietHours(now.getTime(), opts.quietHours)) {
    return []; // Nudges wait patiently through quiet hours.
  }

  const nudges: Nudge[] = [];

  /* 1. Money request older than 3 days — fires exactly once per request. */
  for (const req of signals.moneyRequests) {
    if (req.settled) continue;
    if (req.ageDays < MONEY_REMINDER_AFTER_DAYS) continue;
    const key = `money:${req.id}`;
    if (store.wasShown(key) || store.wasDismissed(key)) continue;
    const copy = moneyReminderNudge(req.name, req.ageDays);
    nudges.push({
      id: `nudge-money-${req.id}`,
      kind: 'money_reminder',
      priority: 'gentle',
      title: t(copy.title, lang),
      body: t(copy.body, lang),
      action: { label: ACTION_COPY.money_reminder, deepLink: '/app/home/wallet' },
      dismissable: true,
    });
    store.markShown(key, now.getTime());
  }

  /* 2. Digest unopened for 24h — at most once per 24h window. */
  if (
    signals.digestUnopenedHours != null &&
    signals.digestUnopenedHours >= DIGEST_NUDGE_AFTER_HOURS &&
    signals.digestPendingCount > 0
  ) {
    const key = 'digest';
    const last = store.lastShownAt(key);
    if (!store.wasDismissed(key) && (last == null || now.getTime() - last >= DIGEST_NUDGE_MIN_INTERVAL_MS)) {
      const copy = digestWaitingNudge(signals.digestPendingCount);
      nudges.push({
        id: `nudge-digest-${now.getTime()}`,
        kind: 'digest_waiting',
        priority: 'gentle',
        title: t(copy.title, lang),
        body: t(copy.body, lang),
        action: { label: ACTION_COPY.digest_waiting, deepLink: '/app/suchana' },
        dismissable: true,
      });
      store.markShown(key, now.getTime());
    }
  }

  /* 3. Org announcement unread after 48h — members only, once per announcement. */
  // AUDIT FIX #8: announcements_enabled kill-switch, actually wired.
  const announcementsOn = isFlagEnabled('announcements_enabled');
  for (const ann of signals.unreadAnnouncements) {
    if (!announcementsOn) break;
    if (!ann.isMember) continue;
    if (ann.ageHours < ANNOUNCEMENT_NUDGE_AFTER_HOURS) continue;
    const key = `ann:${ann.id}`;
    if (store.wasShown(key) || store.wasDismissed(key)) continue;
    const copy = announcementNudge(ann.orgName, Math.floor(ann.ageHours));
    nudges.push({
      id: `nudge-ann-${ann.id}`,
      kind: 'announcement_unread',
      priority: 'gentle',
      title: t(copy.title, lang),
      body: t(copy.body, lang),
      action: {
        label: ACTION_COPY.announcement_unread,
        deepLink: ann.deepLink ?? (ann.orgId ? `/org/${ann.orgId}` : '/orgs'),
      },
      dismissable: true,
    });
    store.markShown(key, now.getTime());
  }

  /* 4. Tithi-timed giving reminder — Ekadashi / Purnima / Amavasya within
   * the window. Never pushy, never streak-shaming. Deep link opens the
   * punya ledger.
   *
   * QUEUED #43 — the fired-ledger is keyed per LEAD-TIME BUCKET:
   * "Ekadashi is in 4 days" and "Ekadashi is in 2 days" are DIFFERENT
   * notices (the copy itself differs), so each bucket may fire once;
   * the SAME bucket must never fire twice — that repeat was the spam
   * the live audit found. The nudge id (and therefore the center
   * dedupeKey) carries the bucket, so stored rows collapse per bucket
   * at read time too. Dismissal stays observance-wide: a devotee who
   * waves one bucket away is never chased by the next one. */
  for (const ts of signals.upcomingTithis ?? []) {
    if (ts.daysUntil < 1 || ts.daysUntil > UPCOMING_TITHI_WITHIN_DAYS) continue;
    const bucketKey = `tithi:${ts.id}:${ts.daysUntil}`;
    const observanceKey = `tithi:${ts.id}`;
    if (store.wasShown(bucketKey)) continue;
    if (store.wasDismissed(bucketKey) || store.wasDismissed(observanceKey)) continue;
    const copy = tithiNudge(ts.tithi, ts.daysUntil);
    nudges.push({
      id: `nudge-tithi-${ts.id}-d${ts.daysUntil}`,
      kind: 'upcoming_tithi',
      priority: 'gentle',
      title: t(copy.title, lang),
      body: t(copy.body, lang),
      action: { label: ACTION_COPY.upcoming_tithi, deepLink: '/app/home/sadhana' },
      dismissable: true,
    });
    store.markShown(bucketKey, now.getTime());
  }

  return nudges;
}

/** The devotee dismissed a nudge — record it so it never returns. */
export function dismissNudge(nudgeId: string, store: NudgeStore): void {
  // Tithi ids carry their lead-time bucket (`nudge-tithi-<obs>-d<days>`,
  // QUEUED #43). Dismissal is observance-wide: record BOTH the bucket
  // key and the observance key, so no later bucket of the same
  // observance can chase a devotee who already waved it away.
  const tithi = /^nudge-tithi-(.+)-d(\d+)$/.exec(nudgeId);
  if (tithi) {
    store.markDismissed(`tithi:${tithi[1]}:${tithi[2]}`);
    store.markDismissed(`tithi:${tithi[1]}`);
    return;
  }
  // Map the public nudge id back to its ledger key.
  const key = nudgeId
    .replace(/^nudge-money-/, 'money:')
    .replace(/^nudge-ann-/, 'ann:')
    .replace(/^nudge-tithi-/, 'tithi:')
    .replace(/^nudge-digest-.*$/, 'digest');
  store.markDismissed(key);
}
