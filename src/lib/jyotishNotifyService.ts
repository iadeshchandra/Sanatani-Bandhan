/**
 * lib/jyotishNotifyService.ts — the watcher half of consultation Suchana.
 * ============================================================================
 * JY-FIX-B (JY-08). Pure decisions live in jyotishNotify.ts; this file
 * is the Firestore + ledger + timer shell, mirroring orderNotifyService
 * (#29) line for line in posture:
 *
 *  - Fetch: my consultations as devotee AND as jyotishi — the two
 *    party queries the rules already allow — plus the latest message
 *    of each live thread (capped, most-recent first).
 *  - Ledger: localStorage, per uid — consultationId → last status, and
 *    consultationId → last latest-message id. Per-device by design.
 *  - Baseline law: the first check records everything, rings nothing.
 *  - The ledger is saved BEFORE any bell is emitted, so a crash
 *    mid-emit never re-blasts.
 *  - Honest PWA limit: checks run on boot, on foreground, and on a
 *    jittered 60s tick while the app is open. News arrives by the
 *    user's next visit — in-app Suchana only; FCM push is Blaze-gated
 *    and untouched.
 *
 * NOTE: notifications/emit is imported LAZILY inside the checker — the
 * emit chain pulls in firebase ESM, which breaks jest at import time.
 */
import {
  collection, getDocs, limit, orderBy, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { startPollLoop } from './pollCadence';
import {
  pickJyotishNotifyEvents,
  jyotishDedupeKey,
  type JyotishConsultationLite,
  type JyotishLedger,
  type JyotishMessageLite,
  type JyotishNotifyEvent,
} from './jyotishNotify';
import type { NotifyEvent } from '../notifications/types';

const CONSULTATIONS = 'jyotishConsultations';
const FETCH_LIMIT = 100;
/** Latest-message probes per check — live threads only. */
const MESSAGE_PROBE_CAP = 20;
const CHAT_STATUSES = new Set(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DAKSHINA_RELEASED']);

const LEDGER_KEY_PREFIX = 'sb.jyotishNotify.ledger.v1.';

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

function toConsultationLite(id: string, data: Record<string, unknown>): JyotishConsultationLite {
  return {
    id,
    status: typeof data.status === 'string' ? data.status : '',
    devoteeUid: typeof data.devoteeUid === 'string' ? data.devoteeUid : '',
    ...(typeof data.assignedJyotishUid === 'string' ? { assignedJyotishUid: data.assignedJyotishUid } : {}),
    ...(typeof data.devoteeName === 'string' ? { devoteeName: data.devoteeName } : {}),
    ...(typeof data.assignedJyotishName === 'string' ? { assignedJyotishName: data.assignedJyotishName } : {}),
    ...(typeof data.consultationType === 'string' ? { consultationType: data.consultationType } : {}),
    updatedAtMs: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

export async function fetchMyConsultationsLite(uid: string): Promise<JyotishConsultationLite[]> {
  const byId = new Map<string, JyotishConsultationLite>();
  const [asDevotee, asJyotishi] = await Promise.all([
    getDocs(query(collection(db, CONSULTATIONS), where('devoteeUid', '==', uid), limit(FETCH_LIMIT))),
    getDocs(query(collection(db, CONSULTATIONS), where('assignedJyotishUid', '==', uid), limit(FETCH_LIMIT))),
  ]);
  for (const snap of [asDevotee, asJyotishi]) {
    snap.forEach((d) => {
      if (!byId.has(d.id)) byId.set(d.id, toConsultationLite(d.id, d.data() as Record<string, unknown>));
    });
  }
  return [...byId.values()];
}

/** Latest message per live thread (one read per thread, capped). */
export async function fetchLatestMessages(
  consultations: JyotishConsultationLite[]
): Promise<JyotishMessageLite[]> {
  const live = consultations
    .filter((c) => CHAT_STATUSES.has(c.status))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
    .slice(0, MESSAGE_PROBE_CAP);
  const out: JyotishMessageLite[] = [];
  await Promise.all(
    live.map(async (c) => {
      try {
        const snap = await getDocs(
          query(collection(db, CONSULTATIONS, c.id, 'messages'), orderBy('createdAt', 'desc'), limit(1))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          const senderUid = (d.data() as any).senderUid;
          if (typeof senderUid === 'string') {
            out.push({ consultationId: c.id, messageId: d.id, senderUid });
          }
        }
      } catch {
        /* one unreadable thread never blocks the others */
      }
    })
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* Ledger (fail-open: storage problems never break the app)            */
/* ------------------------------------------------------------------ */

function loadLedger(uid: string): JyotishLedger | null {
  try {
    const raw = localStorage.getItem(`${LEDGER_KEY_PREFIX}${uid}`);
    if (!raw) return null; // null = never checked → baseline run
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { s: {}, m: {} };
    return {
      s: (parsed.s && typeof parsed.s === 'object' ? parsed.s : {}) as Record<string, string>,
      m: (parsed.m && typeof parsed.m === 'object' ? parsed.m : {}) as Record<string, string>,
    };
  } catch {
    return { s: {}, m: {} }; // corrupt storage → treat as checked, never re-blast
  }
}

function saveLedger(uid: string, ledger: JyotishLedger): void {
  try {
    localStorage.setItem(`${LEDGER_KEY_PREFIX}${uid}`, JSON.stringify(ledger));
  } catch {
    /* storage unavailable — the center's dedupeKey still prevents doubles */
  }
}

/* ------------------------------------------------------------------ */
/* Copy (trilingual, sevak voice — the eventReminderService pattern)   */
/* ------------------------------------------------------------------ */

function toNotifyEvent(ev: JyotishNotifyEvent): NotifyEvent {
  const name = ev.otherName || 'Your jyotishi';
  const devotee = ev.otherName || 'The devotee';
  switch (ev.kind) {
    case 'accepted':
      return {
        kind: 'suchana',
        priority: 'important',
        title: {
          en: 'Your consultation was accepted 🙏',
          hi: 'आपका परामर्श स्वीकार हो गया 🙏',
          bn: 'আপনার পরামর্শ গৃহীত হয়েছে 🙏',
        },
        body: {
          en: `${name} has accepted your ${ev.consultationType} request. You can now chat and plan together.`,
          hi: `${name} ने आपका ${ev.consultationType} अनुरोध स्वीकार किया है। अब आप बातचीत करके योजना बना सकते हैं।`,
          bn: `${name} আপনার ${ev.consultationType} অনুরোধ গ্রহণ করেছেন। এখন আপনারা কথা বলে পরিকল্পনা করতে পারেন।`,
        },
        dedupeKey: jyotishDedupeKey(ev),
        payload: { consultationId: ev.consultationId, surface: 'jyotish-consultations' },
      };
    case 'completed':
      return {
        kind: 'suchana',
        priority: 'gentle',
        title: {
          en: 'Consultation complete 🙏',
          hi: 'परामर्श पूर्ण हुआ 🙏',
          bn: 'পরামর্শ সম্পূর্ণ হয়েছে 🙏',
        },
        body: {
          en: `${name} has completed your ${ev.consultationType} consultation. If all is well, you may offer dakshina with gratitude.`,
          hi: `${name} ने आपका ${ev.consultationType} परामर्श पूर्ण किया है। सब ठीक हो तो कृतज्ञता के साथ दक्षिणा अर्पित कर सकते हैं।`,
          bn: `${name} আপনার ${ev.consultationType} পরামর্শ সম্পূর্ণ করেছেন। সব ঠিক থাকলে কৃতজ্ঞতার সাথে দক্ষিণা অর্পণ করতে পারেন।`,
        },
        dedupeKey: jyotishDedupeKey(ev),
        payload: { consultationId: ev.consultationId, surface: 'jyotish-consultations' },
      };
    case 'dakshina':
      return {
        kind: 'suchana',
        priority: 'gentle',
        title: {
          en: 'Dakshina released 🙏',
          hi: 'दक्षिणा प्रदान हुई 🙏',
          bn: 'দক্ষিণা প্রদান হয়েছে 🙏',
        },
        body: {
          en: `${devotee} has released the dakshina for your ${ev.consultationType} consultation. Dhanyavaad for your seva.`,
          hi: `${devotee} ने आपके ${ev.consultationType} परामर्श की दक्षिणा प्रदान की है। आपकी सेवा के लिए धन्यवाद।`,
          bn: `${devotee} আপনার ${ev.consultationType} পরামর্শের দক্ষিণা প্রদান করেছেন। আপনার সেবার জন্য ধন্যবাদ।`,
        },
        dedupeKey: jyotishDedupeKey(ev),
        payload: { consultationId: ev.consultationId, surface: 'jyotish-consultations' },
      };
    case 'message':
      return {
        kind: 'chat',
        priority: 'gentle',
        title: {
          en: 'New message 💬',
          hi: 'नया संदेश 💬',
          bn: 'নতুন বার্তা 💬',
        },
        body: {
          en: `${name} sent a message in your ${ev.consultationType} consultation.`,
          hi: `${name} ने आपके ${ev.consultationType} परामर्श में संदेश भेजा है।`,
          bn: `${name} আপনার ${ev.consultationType} পরামর্শে বার্তা পাঠিয়েছেন।`,
        },
        dedupeKey: jyotishDedupeKey(ev),
        payload: { consultationId: ev.consultationId, surface: 'jyotish-consultations' },
      };
  }
}

/* ------------------------------------------------------------------ */
/* Checker + watcher                                                   */
/* ------------------------------------------------------------------ */

/** One consultation-news check. Fire-and-forget safe: never throws. */
export async function checkJyotishNotifications(uid: string): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  try {
    const consultations = await fetchMyConsultationsLite(uid);
    const latestMessages = await fetchLatestMessages(consultations);
    const ledger = loadLedger(uid);
    const baseline = ledger === null;
    const { events, nextLedger } = pickJyotishNotifyEvents({
      uid,
      consultations,
      latestMessages,
      ledger: ledger ?? { s: {}, m: {} },
      baseline,
    });

    // Persist FIRST — a crash mid-emit never re-blasts.
    saveLedger(uid, nextLedger);
    if (events.length === 0) return 0;

    const { emitNotify } = await import('../notifications/emit');
    let sent = 0;
    for (const ev of events) {
      try {
        await emitNotify(uid, toNotifyEvent(ev));
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
 * Start the consultation-news watcher: immediate run, foreground
 * re-checks, jittered ~60s poll while visible. Returns a stop fn.
 */
export function startJyotishNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkJyotishNotifications(uid);
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const stopPoll = startPollLoop(() => checkJyotishNotifications(uid), { baseMs: 60000 });

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    stopPoll();
  };
}
