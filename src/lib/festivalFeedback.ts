/**
 * festivalFeedback.ts — EVENTS E5: attendee feedback (pure logic +
 * thin Firestore ops).
 * =====================================================================
 * Cvent's post-event survey, Kritagyata-voiced and cut to our laws:
 *
 *  - ONLY a devotee the gate actually checked in is ever asked —
 *    eligibility is a pure function of their own RSVP record and
 *    the festival having concluded, and the firestore.rules create
 *    re-witnesses the same fact server-side (fbAttendedOk reads the
 *    caller's festival_rsvps record). Ticket holders are RSVP
 *    holders by E2's linkage, so one door covers everyone.
 *  - One record per attendee per festival — the doc id IS
 *    {festivalId}__{authorUid}, so a second submission is an edit,
 *    never a duplicate voice in the averages.
 *  - Ratings are words, not points: the surfaces render the 1–5
 *    scale as five gratitude words (surfaces.events.feedbackWord1..5).
 *    There is no score, no streak, no leaderboard, nothing public
 *    per person — free text is visible ONLY to the author and the
 *    org's staff (rules), and the only public artefact is the
 *    committee-published aggregate, which cannot exist below 5
 *    responses (a smaller average could identify a voice).
 *  - Moderation is a state ('hidden'), never a delete — the record
 *    is the trail. Hidden feedback leaves EVERY aggregate (the
 *    organiser's own included) but the author still sees their own
 *    words and the committee's response.
 *
 * No React here; the builders are unit-tested, the ops mirror
 * lib/festivalRsvp / lib/eventTickets (db: Firestore, ISO strings).
 */
import {
  doc, setDoc, updateDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  type FestivalEventDoc,
  type FestivalFeedbackSummary,
  type RsvpEntry,
} from './festival';
import { festivalConcluded } from './festivalMemory';
import { localDateOfIso } from './eventPass';

/* ------------------------------------------------------------------ */
/* 1. The record                                                       */
/* ------------------------------------------------------------------ */

export interface FeedbackAspects {
  arrangements: number;
  prasad: number;
  darshanFlow: number;
  cleanliness: number;
}

export type FeedbackAspectKey = keyof FeedbackAspects;

export const FEEDBACK_ASPECT_KEYS: readonly FeedbackAspectKey[] = [
  'arrangements', 'prasad', 'darshanFlow', 'cleanliness',
] as const;

export interface FeedbackOrgResponse {
  text: string;
  /** ISO timestamp of the response. */
  at: string;
  /** SAN display name of the responding staff member. */
  byName: string;
}

export interface EventFeedback {
  id: string;
  workspaceId: string;
  festivalId: string;
  authorUid: string;
  /** The author's SAN display name, stamped at write time. */
  authorName: string;
  aspects: FeedbackAspects;
  /** 1–5. */
  overall: number;
  /** Free text — author + org staff only, by rules. Capped at
   *  FEEDBACK_TEXT_MAX characters, in the client AND the rules. */
  text: string;
  wouldReturn: boolean;
  /** The civil day (YYYY-MM-DD) the author attended, when known. */
  attendedDay?: string;
  createdAt: string;
  updatedAt: string;
  /** Moderation state — 'hidden' leaves every aggregate. */
  state: 'visible' | 'hidden';
  orgResponse?: FeedbackOrgResponse;
}

/** The firestore.rules cap on feedback text (fbTextOk) — the two
 *  change together or not at all. */
export const FEEDBACK_TEXT_MAX = 600;

/** The privacy threshold for the public aggregate: below this many
 *  visible responses, buildFeedbackSummary refuses to produce one. */
export const FEEDBACK_PUBLISH_MIN = 5;

export function feedbackDocId(festivalId: string, authorUid: string): string {
  return `${festivalId}__${authorUid}`;
}

/** A rating the rules will accept: a whole number 1–5. */
export function feedbackRatingOk(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/* ------------------------------------------------------------------ */
/* 2. Eligibility — who is asked, and when                             */
/* ------------------------------------------------------------------ */

/**
 * The prompt's whole gate, pure: the festival has concluded, and
 * THIS devotee's own RSVP record says the gate checked them in.
 * Anyone else — no RSVP, waitlisted, booked-but-never-came — is
 * never asked. (The rules witness the same checkedIn fact on
 * create, so a tampered client cannot write feedback either.)
 */
export function feedbackPromptEligible(
  rsvp: Pick<RsvpEntry, 'checkedIn'> | null | undefined,
  ev: Pick<FestivalEventDoc, 'dateISO' | 'endDateISO'>,
  nowMs: number
): boolean {
  if (!rsvp || rsvp.checkedIn !== true) return false;
  return festivalConcluded(ev, nowMs);
}

/** The day the author was checked in, in the E3 gate-day
 *  definition (localDateOfIso of checkedInAt) — the form's default
 *  attendedDay. Null when no usable stamp exists. */
export function feedbackDefaultDay(
  rsvp: Pick<RsvpEntry, 'checkedInAt'> | null | undefined
): string | null {
  return localDateOfIso(rsvp?.checkedInAt);
}

/* ------------------------------------------------------------------ */
/* 3. Moderation filter + aggregates (the organiser's figures)         */
/* ------------------------------------------------------------------ */

/** Visible = not hidden. A record with no state (never producible
 *  through the rules, which pin state at create) counts as visible
 *  only when its state is exactly 'visible' — fail closed here:
 *  aggregates are the figures a committee may publish, so anything
 *  not plainly visible stays out. */
export function visibleFeedback(list: readonly EventFeedback[]): EventFeedback[] {
  return list.filter((f) => f.state === 'visible');
}

export interface FeedbackAggregates {
  /** Visible responses — the only ones any figure rests on. */
  count: number;
  /** count ÷ checked-in parties × 100 (rounded). Null when no
   *  party was checked in — a rate with nothing behind it is not
   *  a number (the festivalDebrief honesty law). */
  responseRatePct: number | null;
  /** Per-aspect averages (1 decimal); null when count is 0. */
  aspectAverages: Record<FeedbackAspectKey, number | null>;
  overallAverage: number | null;
  /** Share of visible respondents who would return, 0–100;
   *  null when count is 0. */
  wouldReturnPct: number | null;
}

const avg1 = (sum: number, n: number): number => Math.round((sum / n) * 10) / 10;

export function buildFeedbackAggregates(
  visible: readonly EventFeedback[],
  checkedInParties: number
): FeedbackAggregates {
  const count = visible.length;
  const aspectAverages = {} as Record<FeedbackAspectKey, number | null>;
  if (count === 0) {
    for (const k of FEEDBACK_ASPECT_KEYS) aspectAverages[k] = null;
    return {
      count: 0,
      responseRatePct: checkedInParties > 0 ? 0 : null,
      aspectAverages,
      overallAverage: null,
      wouldReturnPct: null,
    };
  }
  for (const k of FEEDBACK_ASPECT_KEYS) {
    aspectAverages[k] = avg1(visible.reduce((s, f) => s + (f.aspects?.[k] || 0), 0), count);
  }
  return {
    count,
    responseRatePct:
      checkedInParties > 0 ? Math.round((count / checkedInParties) * 100) : null,
    aspectAverages,
    overallAverage: avg1(visible.reduce((s, f) => s + (f.overall || 0), 0), count),
    wouldReturnPct: Math.round(
      (visible.filter((f) => f.wouldReturn === true).length / count) * 100
    ),
  };
}

/* ------------------------------------------------------------------ */
/* 4. The public summary — aggregates only, by shape, threshold-gated  */
/* ------------------------------------------------------------------ */

/**
 * The ONLY feedback artefact that may ever reach the public
 * festival page. Returns null below FEEDBACK_PUBLISH_MIN visible
 * responses — the threshold is enforced HERE, in the builder, so
 * no caller can publish a recognisable average by forgetting a
 * check. The returned object's key set is pinned by unit test:
 * publishedAt, count, the four aspect averages, overall,
 * wouldReturnPct — no name, no text, no per-person figure can
 * exist in this shape.
 */
export function buildFeedbackSummary(
  visible: readonly EventFeedback[],
  nowIso: string
): FestivalFeedbackSummary | null {
  if (visible.length < FEEDBACK_PUBLISH_MIN) return null;
  const agg = buildFeedbackAggregates(visible, 0);
  // count ≥ FEEDBACK_PUBLISH_MIN > 0, so every average is a number.
  return {
    publishedAt: nowIso,
    count: agg.count,
    arrangements: agg.aspectAverages.arrangements as number,
    prasad: agg.aspectAverages.prasad as number,
    darshanFlow: agg.aspectAverages.darshanFlow as number,
    cleanliness: agg.aspectAverages.cleanliness as number,
    overall: agg.overallAverage as number,
    wouldReturnPct: agg.wouldReturnPct as number,
  };
}

/* ------------------------------------------------------------------ */
/* 5. The dismissal memory — asked once, dismissible forever           */
/* ------------------------------------------------------------------ */

/**
 * The prompt shows ONCE per attendee per festival. Submitting
 * settles it (the record itself is the memory); dismissing settles
 * it too — this device's localStorage remembers the dismissal so
 * the devotee is never nagged again on this device. Pure functions
 * over the data object + load/save helpers, the eventGateRegistry
 * pattern; the memory is a courtesy, never a source of truth.
 */
export type FeedbackDismissalData = Record<string, true>;

export const FEEDBACK_DISMISSAL_STORAGE_KEY = 'sb_event_feedback_dismissed_v1';

const dismissalKey = (festivalId: string, uid: string): string =>
  `${festivalId}__${uid}`;

export function feedbackDismissedIn(
  data: FeedbackDismissalData,
  festivalId: string,
  uid: string
): boolean {
  return data[dismissalKey(festivalId, uid)] === true;
}

export function withFeedbackDismissed(
  data: FeedbackDismissalData,
  festivalId: string,
  uid: string
): FeedbackDismissalData {
  return { ...data, [dismissalKey(festivalId, uid)]: true as const };
}

export interface FeedbackDismissalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaultStorage = (): FeedbackDismissalStorage | null => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* storage can throw in private modes — memory is a courtesy */ }
  return null;
};

export function loadFeedbackDismissals(
  storage: FeedbackDismissalStorage | null = defaultStorage()
): FeedbackDismissalData {
  if (!storage) return {};
  try {
    const raw = storage.getItem(FEEDBACK_DISMISSAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: FeedbackDismissalData = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveFeedbackDismissals(
  data: FeedbackDismissalData,
  storage: FeedbackDismissalStorage | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(FEEDBACK_DISMISSAL_STORAGE_KEY, JSON.stringify(data));
  } catch { /* a failed save only means the prompt may reappear once */ }
}

/* ------------------------------------------------------------------ */
/* 6. Firestore ops — the writes the rules are shaped for              */
/* ------------------------------------------------------------------ */

export interface FeedbackDraft {
  aspects: FeedbackAspects;
  overall: number;
  text: string;
  wouldReturn: boolean;
  attendedDay?: string;
}

/** First submission — a setDoc on the deterministic id, so a
 *  retried submit lands on the same record (and the rules' create
 *  witness runs exactly once per attendee). */
export async function submitEventFeedback(
  db: Firestore,
  input: {
    workspaceId: string;
    festivalId: string;
    authorUid: string;
    authorName: string;
    draft: FeedbackDraft;
    nowIso: string;
  }
): Promise<void> {
  const id = feedbackDocId(input.festivalId, input.authorUid);
  await setDoc(doc(db, 'event_feedback', id), {
    workspaceId: input.workspaceId,
    festivalId: input.festivalId,
    authorUid: input.authorUid,
    authorName: input.authorName,
    aspects: input.draft.aspects,
    overall: input.draft.overall,
    text: input.draft.text.slice(0, FEEDBACK_TEXT_MAX),
    wouldReturn: input.draft.wouldReturn,
    ...(input.draft.attendedDay ? { attendedDay: input.draft.attendedDay } : {}),
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    state: 'visible',
  });
}

/** The author's own edit (rules: author door, visible state only,
 *  content fields only). */
export async function editEventFeedback(
  db: Firestore,
  id: string,
  draft: FeedbackDraft,
  nowIso: string
): Promise<void> {
  await updateDoc(doc(db, 'event_feedback', id), {
    aspects: draft.aspects,
    overall: draft.overall,
    text: draft.text.slice(0, FEEDBACK_TEXT_MAX),
    wouldReturn: draft.wouldReturn,
    ...(draft.attendedDay ? { attendedDay: draft.attendedDay } : {}),
    updatedAt: nowIso,
  });
}

/** Staff moderation (rules: staff door — state and orgResponse
 *  only; the devotee's own words are unreachable from here). */
export async function setEventFeedbackState(
  db: Firestore,
  id: string,
  state: 'visible' | 'hidden',
  nowIso: string
): Promise<void> {
  await updateDoc(doc(db, 'event_feedback', id), { state, updatedAt: nowIso });
}

export async function respondToEventFeedback(
  db: Firestore,
  id: string,
  response: FeedbackOrgResponse,
  nowIso: string
): Promise<void> {
  await updateDoc(doc(db, 'event_feedback', id), {
    orgResponse: {
      text: response.text.slice(0, FEEDBACK_TEXT_MAX),
      at: response.at,
      byName: response.byName,
    },
    updatedAt: nowIso,
  });
}
