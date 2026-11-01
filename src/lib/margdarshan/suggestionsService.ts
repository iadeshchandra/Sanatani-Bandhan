/**
 * lib/margdarshan/suggestionsService.ts — Your Voice Firestore I/O (J3).
 * ============================================================================
 * The shell around the pure model in suggestions.ts. Every write is
 * shaped to pass the J3 rules block exactly (ARCHITECTURE.md §19):
 *
 *  - create: the closed 16-key payload from buildSuggestionCreate,
 *    status 'received', authored by the caller (rules pin authorId).
 *  - support / withdraw: ONE writeBatch — the caller's ballot doc
 *    appears/vanishes and the parent's supporterCount moves by
 *    exactly ±1 with it (the suggAnchorOk anchor; the polls idiom).
 *  - author edit: title/body/kind/deskId only, while 'received'
 *    (rules diffKeysOnly + status pin enforce the same).
 *  - triage (SuperAdmin client path; rules are the boundary):
 *    status + appended statusHistory, hidden, official replies —
 *    only the keys the admin update branch allows.
 *
 * Reads: the public list filters hidden == false (the rules require
 * signed-out list queries to carry that filter); sorting happens
 * client-side (sortBoard) so no composite index is needed. My-list
 * filters authorId == uid, which the read rule's author disjunct
 * makes provable. The triage list reads everything — SuperAdmin
 * only; a non-admin caller's query is refused by the rules and the
 * error surfaces honestly in the desk.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  buildSuggestionCreate,
  nextStatusHistory,
  type OfficialReply,
  type Suggestion,
  type SuggestionDraftInput,
  type SuggestionStatus,
} from './suggestions';
// NOTE: suggestionSeeds is imported LAZILY inside seedSuggestionBoard
// — the seeds are trilingual content and must never ride the entry
// chunk through this service's notify-watcher importer.

export const SUGGESTIONS_COLLECTION = 'suggestions';

const BOARD_LIMIT = 200;

/* ------------------------------------------------------------------ */
/* Conversion                                                          */
/* ------------------------------------------------------------------ */

function tsToMs(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function toSuggestion(id: string, data: DocumentData): Suggestion {
  const str = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v : fallback;
  return {
    id,
    authorId: str(data.authorId),
    authorName: str(data.authorName),
    kind: (str(data.kind, 'feature') as Suggestion['kind']),
    deskId: typeof data.deskId === 'string' ? data.deskId : null,
    title: str(data.title),
    body: str(data.body),
    language: str(data.language, 'en'),
    status: (str(data.status, 'received') as SuggestionStatus),
    statusHistory: Array.isArray(data.statusHistory)
      ? (data.statusHistory as Suggestion['statusHistory'])
      : [],
    officialReplies: Array.isArray(data.officialReplies)
      ? (data.officialReplies as OfficialReply[])
      : [],
    supporterCount:
      typeof data.supporterCount === 'number' ? data.supporterCount : 0,
    hidden: data.hidden === true,
    createdAtMs: tsToMs(data.createdAt),
    updatedAtMs: tsToMs(data.updatedAt),
    shippedVersion:
      typeof data.shippedVersion === 'string' ? data.shippedVersion : null,
    duplicateOf: typeof data.duplicateOf === 'string' ? data.duplicateOf : null,
  };
}

function snapToList(snap: QuerySnapshot<DocumentData>): Suggestion[] {
  const out: Suggestion[] = [];
  snap.forEach((d) => out.push(toSuggestion(d.id, d.data())));
  return out;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Public board: visible suggestions only (rules-provable filter). */
export function subscribePublicSuggestions(
  onItems: (items: Suggestion[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, SUGGESTIONS_COLLECTION),
    where('hidden', '==', false)
  );
  return onSnapshot(
    q,
    (snap) => onItems(snapToList(snap).slice(0, BOARD_LIMIT)),
    onError
  );
}

/** Everything, including hidden — the Triage Desk's queue. The rules
 *  refuse this for anyone but the SuperAdmin; the error is the desk's
 *  honest signal, never swallowed here. */
export function subscribeAllSuggestions(
  onItems: (items: Suggestion[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, SUGGESTIONS_COLLECTION),
    (snap) => onItems(snapToList(snap)),
    onError
  );
}

/** My own suggestions (author read includes my hidden ones). */
export function subscribeMySuggestions(
  uid: string,
  onItems: (items: Suggestion[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, SUGGESTIONS_COLLECTION),
    where('authorId', '==', uid)
  );
  return onSnapshot(q, (snap) => onItems(snapToList(snap)), onError);
}

/** One-shot fetch of my suggestions — the notify watcher's read. */
export async function fetchMySuggestions(uid: string): Promise<Suggestion[]> {
  const q = query(
    collection(db, SUGGESTIONS_COLLECTION),
    where('authorId', '==', uid)
  );
  const snap = await getDocs(q);
  return snapToList(snap);
}

/** Which of these suggestions has this user already supported?
 *  One ballot read per id (pilot volume), failures read as "not
 *  supported" for that row only — the batch anchor is the truth. */
export async function fetchMySupportedIds(
  ids: readonly string[],
  uid: string
): Promise<Set<string>> {
  const out = new Set<string>();
  await Promise.all(
    ids.slice(0, BOARD_LIMIT).map(async (id) => {
      try {
        const snap = await getDoc(
          doc(db, SUGGESTIONS_COLLECTION, id, 'supporters', uid)
        );
        if (snap.exists()) out.add(id);
      } catch {
        /* one unreadable ballot never blocks the others */
      }
    })
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* Writes — the community side                                         */
/* ------------------------------------------------------------------ */

export async function createSuggestion(
  input: SuggestionDraftInput
): Promise<string> {
  const payload = buildSuggestionCreate(input, {
    nowMs: Date.now(),
    stamp: serverTimestamp(),
  });
  const ref = await addDoc(collection(db, SUGGESTIONS_COLLECTION), payload);
  return ref.id;
}

/** Support: my ballot appears + the count moves +1, one batch. */
export async function supportSuggestion(id: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, SUGGESTIONS_COLLECTION, id, 'supporters', uid), {
    supportedAt: serverTimestamp(),
  });
  batch.update(doc(db, SUGGESTIONS_COLLECTION, id), {
    supporterCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Withdraw: my ballot vanishes + the count moves −1, one batch. */
export async function withdrawSupport(id: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, SUGGESTIONS_COLLECTION, id, 'supporters', uid));
  batch.update(doc(db, SUGGESTIONS_COLLECTION, id), {
    supporterCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Author edit — only while 'received' (the rules enforce it too). */
export async function editSuggestion(
  id: string,
  fields: { title: string; body: string; kind: SuggestionDraftInput['kind']; deskId: string | null }
): Promise<void> {
  await updateDoc(doc(db, SUGGESTIONS_COLLECTION, id), {
    title: fields.title.trim(),
    body: fields.body.trim(),
    kind: fields.kind,
    deskId: fields.deskId,
    updatedAt: serverTimestamp(),
  });
}

/** Author delete — the rules allow it only while nobody has
 *  supported the suggestion (supporters make it archive). */
export async function deleteSuggestion(id: string): Promise<void> {
  await deleteDoc(doc(db, SUGGESTIONS_COLLECTION, id));
}

/* ------------------------------------------------------------------ */
/* Writes — the Triage Desk (SuperAdmin path; rules are the wall)      */
/* ------------------------------------------------------------------ */

export async function triageSetStatusById(
  id: string,
  currentHistory: readonly Suggestion['statusHistory'][number][],
  next: SuggestionStatus,
  opts?: { shippedVersion?: string | null; duplicateOf?: string | null }
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: next,
    statusHistory: nextStatusHistory(currentHistory, next, Date.now()),
    updatedAt: serverTimestamp(),
  };
  if (opts && 'shippedVersion' in opts) updates.shippedVersion = opts.shippedVersion;
  if (opts && 'duplicateOf' in opts) updates.duplicateOf = opts.duplicateOf;
  await updateDoc(doc(db, SUGGESTIONS_COLLECTION, id), updates);
}

export async function triageSetStatus(
  current: Suggestion,
  next: SuggestionStatus,
  opts?: { shippedVersion?: string | null; duplicateOf?: string | null }
): Promise<void> {
  await triageSetStatusById(current.id, current.statusHistory, next, opts);
}

export async function triageSetHidden(id: string, hidden: boolean): Promise<void> {
  await updateDoc(doc(db, SUGGESTIONS_COLLECTION, id), {
    hidden,
    updatedAt: serverTimestamp(),
  });
}

export async function triageAddReply(
  current: Suggestion,
  text: string,
  byName: string
): Promise<void> {
  const reply: OfficialReply = { text: text.trim(), at: Date.now(), byName };
  await updateDoc(doc(db, SUGGESTIONS_COLLECTION, current.id), {
    officialReplies: [...current.officialReplies, reply],
    updatedAt: serverTimestamp(),
  });
}

/* ------------------------------------------------------------------ */
/* Seeding — the Triage Desk's "Seed the board"                        */
/* ------------------------------------------------------------------ */

export interface SeedOutcome {
  id: string;
  outcome: 'created' | 'exists';
}

/**
 * Write the roadmap seeds as real documents, through the ordinary
 * rules path: create pins status 'received' + authorId == caller,
 * so each seed is created as the team's received voice and then —
 * where its honest status is further along — moved by a triage
 * update in the same run. Fixed ids make re-runs no-ops.
 */
export async function seedSuggestionBoard(adminUid: string): Promise<SeedOutcome[]> {
  const { SUGGESTION_SEEDS, TEAM_AUTHOR_NAME } = await import('./suggestionSeeds');
  const outcomes: SeedOutcome[] = [];
  for (const seed of SUGGESTION_SEEDS) {
    const ref = doc(db, SUGGESTIONS_COLLECTION, seed.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      outcomes.push({ id: seed.id, outcome: 'exists' });
      continue;
    }
    const input: SuggestionDraftInput = {
      authorId: adminUid,
      authorName: TEAM_AUTHOR_NAME,
      kind: seed.kind,
      deskId: null,
      title: seed.title.en,
      body: seed.body.en,
      language: 'en',
    };
    const payload = buildSuggestionCreate(input, {
      nowMs: Date.now(),
      stamp: serverTimestamp(),
    });
    await setDoc(ref, payload);
    if (seed.status !== 'received') {
      await triageSetStatusById(
        seed.id,
        payload.statusHistory as Suggestion['statusHistory'],
        seed.status
      );
    }
    outcomes.push({ id: seed.id, outcome: 'created' });
  }
  return outcomes;
}
