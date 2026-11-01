/**
 * lib/suggestionNotifyService.ts — the watcher half of Your Voice Suchana.
 * ============================================================================
 * Margdarshan J3 loop-closure. Pure decisions live in
 * suggestionNotify.ts; this shell mirrors jyotishNotifyService line
 * for line in posture:
 *
 *  - Fetch: my own suggestions (the rules' author read path).
 *  - Ledger: localStorage, per uid — suggestionId → status /
 *    reply-count / history-length. Per-device by design.
 *  - Baseline law: the first check records everything, rings nothing.
 *  - The ledger is saved BEFORE any bell is emitted.
 *  - Copy comes from the marg.* dictionary fragments (en/hi/bn) —
 *    the same strings the board's status pills use, so the bell and
 *    the board can never call a stage by two different names.
 *  - Honest PWA limit: checks run on boot, on foreground, and on a
 *    jittered 60s tick while the app is open. In-app Suchana only;
 *    FCM push remains Blaze-gated and untouched.
 *
 * NOTE: notifications/emit is imported LAZILY inside the checker —
 * the emit chain pulls in firebase ESM, which breaks jest at import
 * time (the jyotishNotifyService lesson).
 */
import { startPollLoop } from './pollCadence';
import {
  pickSuggestionNotifyEvents,
  suggestionDedupeKey,
  type SuggestionLedger,
  type SuggestionNotifyEvent,
} from './suggestionNotify';
import { fetchMySuggestions } from './margdarshan/suggestionsService';
import type { Suggestion } from './margdarshan/suggestions';
import type { NotifyEvent } from '../notifications/types';
import { margNs as margEn } from '../i18n/lang/en/marg';
import { margNs as margHi } from '../i18n/lang/hi/marg';
import { margNs as margBn } from '../i18n/lang/bn/marg';

const LEDGER_KEY_PREFIX = 'sb.suggestionNotify.ledger.v1.';

const STATUS_LABEL_KEY: Record<string, string> = {
  received: 'voiceStatusReceived',
  'under-review': 'voiceStatusUnderReview',
  planned: 'voiceStatusPlanned',
  'in-progress': 'voiceStatusInProgress',
  shipped: 'voiceStatusShipped',
  'not-now': 'voiceStatusNotNow',
  duplicate: 'voiceStatusDuplicate',
};

type MargDict = Record<string, string | undefined>;
const DICTS: Record<'en' | 'hi' | 'bn', MargDict> = {
  en: (margEn.marg || {}) as MargDict,
  hi: (margHi.marg || {}) as MargDict,
  bn: (margBn.marg || {}) as MargDict,
};

function tri(key: string, fill?: Record<string, string>): { en: string; hi: string; bn: string } {
  const render = (lang: 'en' | 'hi' | 'bn'): string => {
    let s = DICTS[lang][key] || DICTS.en[key] || key;
    if (fill) {
      for (const [k, v] of Object.entries(fill)) s = s.split(`{${k}}`).join(v);
    }
    return s;
  };
  return { en: render('en'), hi: render('hi'), bn: render('bn') };
}

function statusLabels(status: string): { en: string; hi: string; bn: string } {
  const key = STATUS_LABEL_KEY[status] || 'voiceStatusReceived';
  const read = (lang: 'en' | 'hi' | 'bn') =>
    DICTS[lang][key] || DICTS.en[key] || status;
  return { en: read('en'), hi: read('hi'), bn: read('bn') };
}

/* ------------------------------------------------------------------ */
/* Ledger (fail-open: storage problems never break the app)            */
/* ------------------------------------------------------------------ */

function loadLedger(uid: string): SuggestionLedger | null {
  try {
    const raw = localStorage.getItem(`${LEDGER_KEY_PREFIX}${uid}`);
    if (!raw) return null; // null = never checked → baseline run
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as SuggestionLedger;
  } catch {
    return {}; // corrupt storage → treat as checked, never re-blast
  }
}

function saveLedger(uid: string, ledger: SuggestionLedger): void {
  try {
    localStorage.setItem(`${LEDGER_KEY_PREFIX}${uid}`, JSON.stringify(ledger));
  } catch {
    /* storage unavailable — the center's dedupeKey still prevents doubles */
  }
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

function toNotifyEvent(
  ev: SuggestionNotifyEvent,
  source: Suggestion
): NotifyEvent {
  const labels = statusLabels(ev.status);
  if (ev.kind === 'status') {
    return {
      kind: 'suchana',
      priority: 'gentle',
      title: tri('voiceNotifyTitle'),
      body: {
        en: tri('voiceNotifyBody', { title: ev.title, status: labels.en }).en,
        hi: tri('voiceNotifyBody', { title: ev.title, status: labels.hi }).hi,
        bn: tri('voiceNotifyBody', { title: ev.title, status: labels.bn }).bn,
      },
      dedupeKey: suggestionDedupeKey(
        ev,
        source.statusHistory.length,
        source.officialReplies.length
      ),
      payload: { suggestionId: ev.suggestionId, surface: 'margdarshan-voice' },
    };
  }
  return {
    kind: 'suchana',
    priority: 'gentle',
    title: tri('voiceNotifyTitle'),
    body: tri('voiceNotifyReplyBody', { title: ev.title }),
    dedupeKey: suggestionDedupeKey(
      ev,
      source.statusHistory.length,
      source.officialReplies.length
    ),
    payload: { suggestionId: ev.suggestionId, surface: 'margdarshan-voice' },
  };
}

/* ------------------------------------------------------------------ */
/* Checker + watcher                                                   */
/* ------------------------------------------------------------------ */

/** One loop-closure check. Fire-and-forget safe: never throws. */
export async function checkSuggestionNotifications(uid: string): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  try {
    const mine = await fetchMySuggestions(uid);
    const ledger = loadLedger(uid);
    const baseline = ledger === null;
    const { events, nextLedger } = pickSuggestionNotifyEvents({
      suggestions: mine.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        replyCount: s.officialReplies.length,
        historyLength: s.statusHistory.length,
      })),
      ledger: ledger ?? {},
      baseline,
    });

    // Persist FIRST — a crash mid-emit never re-blasts.
    saveLedger(uid, nextLedger);
    if (events.length === 0) return 0;

    const byId = new Map(mine.map((s) => [s.id, s]));
    const { emitNotify } = await import('../notifications/emit');
    let sent = 0;
    for (const ev of events) {
      const source = byId.get(ev.suggestionId);
      if (!source) continue;
      try {
        await emitNotify(uid, toNotifyEvent(ev, source));
        sent++;
      } catch {
        /* one failed bell must not stop the others */
      }
    }
    return sent;
  } catch {
    return 0; // a notification failure never breaks the product
  }
}

/**
 * Start the loop-closure watcher: immediate run, foreground
 * re-checks, jittered ~60s poll while visible. Returns a stop fn.
 */
export function startSuggestionNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkSuggestionNotifications(uid);
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const stopPoll = startPollLoop(() => checkSuggestionNotifications(uid), { baseMs: 60000 });

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    stopPoll();
  };
}
