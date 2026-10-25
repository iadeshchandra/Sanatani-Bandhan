/**
 * eventReminderService.ts — RSVP reminders over the SELF-LISTEN
 * pattern (EVENTS P1-6).
 * =====================================================================
 * Firestore's rules make notification writes self-only by design
 * (see src/notifications/emit.ts), so — exactly like every other
 * Phase-3 wiring — each devotee's own device watches THEIR OWN RSVPs
 * and emits their own reminders via emitNotify(myUid, …):
 *
 *  - T-3 days / T-1 day / morning-of for every festival they hold a
 *    CONFIRMED RSVP for, and every Sangam event they are 'going' to.
 *    One reminder per stage per event, ledgered on-device; a missed
 *    stage is skipped, never burst-sent later.
 *  - Change / cancellation: when an event the devotee RSVP'd to is
 *    edited (its updatedAt advances) or disappears, one announcement
 *    is emitted — computed by lib/eventReminders.eventChangeKind,
 *    whose first-sighting-is-baseline law means installing the app
 *    never produces a flood of false "changed" notices.
 *  - Waitlist promotion: when the devotee is waitlisted for a
 *    darshan slot, the service tries the anchored claim; a landed
 *    claim is announced at once ("your place is confirmed").
 *
 * Engagement law: reminders are quiet (priority 'gentle'), capped
 * (three fixed stages per event, ever), and exist only for events
 * the devotee themselves chose to attend — no streaks, no pressure,
 * nothing for events they merely saw.
 */
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { emitNotify } from '../notifications/emit';
import type { TriText } from '../notifications/types';
import {
  dueReminders,
  eventChangeKind,
  reminderLedgerKey,
  type ReminderEventLike,
  type ReminderStage,
} from './eventReminders';

/** The service's candidate: the pure ReminderEventLike plus the
 *  display/route extras only this layer knows. */
type ReminderCandidate = ReminderEventLike & { place?: string; route?: string };
import { claimFestivalWaitlist } from './festivalRsvp';
import { occurrenceStartMs } from './eventRecurrence';
import type { FestivalEventDoc, RsvpEntry } from './festival';
import type { SangamEvent } from '../sangam/types';

const LS_SENT = 'sb_evrem_sent_v1';
const LS_SEEN = 'sb_evrem_seen_v1';
const MAX_LEDGER = 400;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — reminders simply re-derive next run */
  }
}

const TITLES = {
  reminder: {
    en: 'A gentle reminder',
    hi: 'एक हल्की याद दिलाना',
    bn: 'একটি মৃদু স্মরণ',
  } as TriText,
  changed: {
    en: 'Event details changed',
    hi: 'कार्यक्रम की जानकारी बदली',
    bn: 'অনুষ্ঠানের তথ্য বদলেছে',
  } as TriText,
  cancelled: {
    en: 'Event cancelled',
    hi: 'कार्यक्रम रद्द हुआ',
    bn: 'অনুষ্ঠান বাতিল হয়েছে',
  } as TriText,
  promoted: {
    en: 'Your darshan place is confirmed',
    hi: 'आपका दर्शन स्थान पक्का हुआ',
    bn: 'আপনার দর্শনের স্থান নিশ্চিত হয়েছে',
  } as TriText,
};

function stageWord(stage: ReminderStage): TriText {
  if (stage === 't3') return { en: 'in 3 days', hi: '3 दिन में', bn: '৩ দিন পর' };
  if (stage === 't1') return { en: 'tomorrow', hi: 'कल', bn: 'আগামীকাল' };
  return { en: 'today', hi: 'आज', bn: 'আজ' };
}

function emitStageReminder(uid: string, candidate: ReminderCandidate, stage: ReminderStage, tail: TriText): void {
  const w = stageWord(stage);
  void emitNotify(uid, {
    kind: 'suchana',
    priority: 'gentle',
    title: TITLES.reminder,
    body: {
      en: `“${candidate.title}”${candidate.place ? ` at ${candidate.place}` : ''} is ${w.en} — ${tail.en}`,
      hi: `“${candidate.title}”${candidate.place ? ` (${candidate.place})` : ''} ${w.hi} है — ${tail.hi}`,
      bn: `“${candidate.title}”${candidate.place ? ` (${candidate.place})` : ''} ${w.bn} — ${tail.bn}`,
    },
    dedupeKey: reminderLedgerKey(candidate, stage),
    ...(candidate.route ? { deepLink: candidate.route } : {}),
  });
}

/** updatedAt arrives as an ISO string, a ms number, or a Firestore
 *  Timestamp depending on which desk last wrote the doc. */
function stampMs(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Date.parse(v) || 0;
  if (v && typeof v === 'object') {
    const o = v as { toMillis?: () => number; seconds?: number };
    if (typeof o.toMillis === 'function') return o.toMillis();
    if (typeof o.seconds === 'number') return o.seconds * 1000;
  }
  return 0;
}

async function runFestivalSide(
  db: Firestore,
  uid: string,
  nowMs: number,
  sent: Set<string>,
  seen: Record<string, number>
): Promise<void> {
  const snap = await getDocs(query(collection(db, 'festival_rsvps'), where('uid', '==', uid)));
  const candidates: ReminderCandidate[] = [];

  for (const rsvpDoc of snap.docs) {
    const rsvp = rsvpDoc.data() as RsvpEntry;
    const seenKey = `festival:${rsvp.eventId}`;
    const evSnap = await getDoc(doc(db, 'festival_events', rsvp.eventId));
    if (!evSnap.exists()) {
      if (eventChangeKind(seen[seenKey], null, nowMs) === 'cancelled') {
        void emitNotify(uid, {
          kind: 'suchana',
          priority: 'gentle',
          title: TITLES.cancelled,
          body: {
            en: 'An event you were attending has been cancelled by the organisers. Apologies for the change of plans.',
            hi: 'जिस कार्यक्रम में आप शामिल होने वाले थे, वह आयोजकों द्वारा रद्द कर दिया गया है। योजना में बदलाव के लिए क्षमा करें।',
            bn: 'আপনি যে অনুষ্ঠানে যোগ দিতে যাচ্ছিলেন, তা আয়োজকদের পক্ষ থেকে বাতিল করা হয়েছে। পরিকল্পনা বদলের জন্য দুঃখিত।',
          },
          dedupeKey: `evchg:${rsvp.eventId}:cancelled`,
        });
        delete seen[seenKey];
      }
      continue;
    }
    const ev = { id: evSnap.id, ...(evSnap.data() as object) } as FestivalEventDoc;
    const updatedMs = stampMs(ev.updatedAt);
    if (updatedMs > 0) {
      const kind = eventChangeKind(
        seen[seenKey],
        { updatedAt: updatedMs, startsAt: occurrenceStartMs(ev.dateISO, undefined), live: true },
        nowMs
      );
      if (kind === 'changed') {
        void emitNotify(uid, {
          kind: 'suchana',
          priority: 'gentle',
          title: TITLES.changed,
          body: {
            en: `“${ev.name.en}” at ${ev.orgName} has been updated by the organisers — please check the new details.`,
            hi: `“${ev.name.en}” (${ev.orgName}) की जानकारी आयोजकों ने बदल दी है — कृपया नए विवरण देखें।`,
            bn: `“${ev.name.en}” (${ev.orgName})-এর তথ্য আয়োজকরা বদলেছেন — অনুগ্রহ করে নতুন বিবরণ দেখুন।`,
          },
          dedupeKey: `evchg:${rsvp.eventId}:${updatedMs}`,
          deepLink: `/festival/${ev.workspaceId}/${ev.id}`,
        });
      }
      seen[seenKey] = updatedMs;
    }

    if ((rsvp.status || 'confirmed') === 'waitlisted' && rsvp.slotId) {
      // Try the anchored claim — it lands only when we are head of
      // the queue AND the whole party now fits.
      const claimed = await claimFestivalWaitlist(db, { eventId: rsvp.eventId, uid }).catch(() => false);
      if (claimed) {
        void emitNotify(uid, {
          kind: 'suchana',
          priority: 'gentle',
          title: TITLES.promoted,
          body: {
            en: `Good news — your place for “${ev.name.en}” (${ev.orgName}) is confirmed. A cancellation freed a place and it came to you, first in line.`,
            hi: `शुभ समाचार — “${ev.name.en}” (${ev.orgName}) के लिए आपका स्थान पक्का हो गया है। एक रद्दीकरण से जगह खाली हुई और वह पंक्ति में पहले होने के कारण आपको मिली।`,
            bn: `সুখবর — “${ev.name.en}” (${ev.orgName})-এর জন্য আপনার স্থান নিশ্চিত হয়েছে। একটি বাতিলের ফলে জায়গা খালি হয়েছে এবং লাইনে প্রথম থাকায় তা আপনার কাছেই এসেছে।`,
          },
          dedupeKey: `evprom:${rsvp.eventId}:${uid}`,
          deepLink: `/festival/${ev.workspaceId}/${ev.id}`,
        });
      }
      continue; // waitlisted devotees follow the claim path, not stage reminders
    }
    if ((rsvp.status || 'confirmed') !== 'confirmed') continue;

    candidates.push({
      eventId: ev.id,
      source: 'festival',
      title: ev.name.en,
      place: ev.orgName,
      startsAt: occurrenceStartMs(ev.dateISO, undefined),
      route: `/festival/${ev.workspaceId}/${ev.id}`,
    });
  }

  const tail: TriText = { en: 'you have a place booked.', hi: 'आपका स्थान बुक है।', bn: 'আপনার স্থান বুক করা আছে।' };
  for (const due of dueReminders(candidates, nowMs, sent)) {
    emitStageReminder(uid, due.event, due.stage, tail);
    sent.add(reminderLedgerKey(due.event, due.stage));
  }
}

async function runSangamSide(
  db: Firestore,
  uid: string,
  nowMs: number,
  sent: Set<string>,
  seen: Record<string, number>
): Promise<void> {
  const snap = await getDocs(query(collectionGroup(db, 'rsvps'), where('uid', '==', uid))).catch(() => null);
  if (!snap || snap.empty) return;
  const candidates: ReminderCandidate[] = [];

  for (const rsvpDoc of snap.docs) {
    const data = rsvpDoc.data() as { state?: string };
    const evRef = rsvpDoc.ref.parent.parent;
    if (!evRef) continue;
    const seenKey = `sangam:${evRef.id}`;
    const evSnap = await getDoc(evRef);
    if (!evSnap.exists()) {
      if (eventChangeKind(seen[seenKey], null, nowMs) === 'cancelled') {
        void emitNotify(uid, {
          kind: 'suchana',
          priority: 'gentle',
          title: TITLES.cancelled,
          body: {
            en: 'A Sangam gathering you were attending has been cancelled by its organiser.',
            hi: 'जिस संगम आयोजन में आप शामिल होने वाले थे, वह उसके आयोजक द्वारा रद्द कर दिया गया है।',
            bn: 'আপনি যে সঙ্গম আয়োজনে যোগ দিতে যাচ্ছিলেন, তা তার আয়োজক বাতিল করেছেন।',
          },
          dedupeKey: `evchg:sangam:${evRef.id}:cancelled`,
        });
        delete seen[seenKey];
      }
      continue;
    }
    const ev = { id: evSnap.id, ...(evSnap.data() as object) } as SangamEvent & { updatedAt?: number };
    const updatedMs = typeof ev.updatedAt === 'number' ? ev.updatedAt : 0;
    if (updatedMs > 0) {
      const kind = eventChangeKind(seen[seenKey], { updatedAt: updatedMs, startsAt: ev.startsAt, live: true }, nowMs);
      if (kind === 'changed') {
        void emitNotify(uid, {
          kind: 'suchana',
          priority: 'gentle',
          title: TITLES.changed,
          body: {
            en: `“${ev.title}” has been updated by its organiser — please check the new details in Sangam.`,
            hi: `“${ev.title}” की जानकारी उसके आयोजक ने बदल दी है — कृपया संगम में नए विवरण देखें।`,
            bn: `“${ev.title}”-এর তথ্য তার আয়োজক বদলেছেন — অনুগ্রহ করে সঙ্গমে নতুন বিবরণ দেখুন।`,
          },
          dedupeKey: `evchg:sangam:${evRef.id}:${updatedMs}`,
        });
      }
      seen[seenKey] = updatedMs;
    }
    if ((data.state || 'going') !== 'going') continue;
    candidates.push({
      eventId: ev.id,
      source: 'sangam',
      title: ev.title,
      place: ev.venue || ev.orgName,
      startsAt: ev.startsAt,
    });
  }

  const tail: TriText = { en: 'you are on the going list.', hi: 'आप शामिल होने वालों की सूची में हैं।', bn: 'আপনি যোগদানকারীদের তালিকায় আছেন।' };
  for (const due of dueReminders(candidates, nowMs, sent)) {
    emitStageReminder(uid, due.event, due.stage, tail);
    sent.add(reminderLedgerKey(due.event, due.stage));
  }
}

/**
 * Start the reminder loop for a signed-in devotee. Mirrors the
 * due-jobs discipline: runs at boot, again on foreground return,
 * throttled to once an hour (stages are day-granular; hourly is
 * generous). Returns a stop function.
 */
export function startEventReminders(db: Firestore, uid: string): () => void {
  let stopped = false;
  let lastRun = 0;
  const run = async () => {
    if (stopped) return;
    const nowMs = Date.now();
    if (nowMs - lastRun < 60 * 60 * 1000) return;
    lastRun = nowMs;
    try {
      const sent = new Set<string>(loadJson<string[]>(LS_SENT, []));
      const seen = loadJson<Record<string, number>>(LS_SEEN, {});
      await runFestivalSide(db, uid, nowMs, sent, seen);
      await runSangamSide(db, uid, nowMs, sent, seen);
      saveJson(LS_SENT, [...sent].slice(-MAX_LEDGER));
      saveJson(LS_SEEN, Object.fromEntries(Object.entries(seen).slice(-MAX_LEDGER)));
    } catch {
      /* reminders are a kindness, never a crash path */
    }
  };
  void run();
  const onVis = () => {
    if (document.visibilityState === 'visible') void run();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVis);
  };
}
