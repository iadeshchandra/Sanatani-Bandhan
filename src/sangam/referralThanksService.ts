/**
 * sangam/referralThanksService.ts — sharer thanks for share-carries-referral.
 * ============================================================================
 * QUEUED #25. Phase 4 designed the moment — "when a booking comes from a
 * shared link, the sharer gets a warm GENTLE acknowledgment" — and wrote
 * the copy (referrals.ts referralThanksCopy), but nothing ever delivered
 * it. This module is the delivery.
 *
 * Why a claim doc at all? The sharer cannot observe the booking directly:
 *  - `marketplaceOrders` reads are participant-only (client/provider/owner)
 *    — the sharer is none of those;
 *  - `notifications/{uid}/items` is self-write-only — the booker cannot
 *    write into the sharer's Suchana;
 *  - `messages` creates are owner-only.
 * So the BOOKER's device leaves one small claim row per referred booking,
 * and the SHARER's own device self-listens for claims naming it and emits
 * the thanks to its OWN inbox (the broadcastListener pattern, QUEUED #14).
 *
 * The claim carries NO money, NO order details, and never the booker's
 * name — the thanks copy names only the provider the family booked with.
 * One claim per order (doc id == orderId), so retries never double.
 *
 * ⚠️ NEW COLLECTION (QUEUED #25) — flagged for the owner per standing law.
 * Proposed rules (NOT yet in firestore.rules — until they land, claim
 * writes/reads fail closed, both sides fail open, and bookings are
 * completely unaffected; the thanks simply stays dormant):
 *
 *   match /referralClaims/{orderId} {
 *     allow read: if isSuperAdmin()
 *       || (isLoggedIn() && resource.data.get('sharerUid', '') == request.auth.uid);
 *     allow create: if isLoggedIn()
 *       && request.resource.data.get('orderId', '') == orderId
 *       && request.resource.data.get('bookerUid', '') == request.auth.uid
 *       && request.resource.data.get('sharerUid', '') != ''
 *       && request.resource.data.get('sharerUid', '') != request.auth.uid
 *       && request.resource.data.get('sharerSanId', '') != ''
 *       && request.resource.data.get('providerName', '') != ''
 *       && request.resource.data.get('createdAt', 0) is number
 *       && request.resource.data.keys().hasOnly(
 *         ['orderId', 'sharerUid', 'sharerSanId', 'bookerUid',
 *          'providerName', 'createdAt'])
 *       && exists(/databases/$(database)/documents/marketplaceOrders/$(orderId))
 *       && get(/databases/$(database)/documents/marketplaceOrders/$(orderId))
 *            .data.get('clientUid', '') == request.auth.uid
 *       && get(/databases/$(database)/documents/marketplaceOrders/$(orderId))
 *            .data.get('referredBy', '') == request.resource.data.get('sharerSanId', '');
 *     allow update, delete: if false;
 *   }
 *
 * The create rule is anchored to the real order (mirroring
 * referralAttributions): a booker can only claim thanks for an order
 * they actually placed, whose stored `referredBy` names this sharer.
 *
 * `createdAt` is epoch ms (client clock) — the orgBroadcasts convention —
 * so the watcher needs no composite index (single-field sharerUid query,
 * client-side sort/filter).
 *
 * NOTE: notifyHelpers is imported LAZILY inside the checker — the emit
 * chain pulls in firebase ESM, which breaks jest at import time. Pure
 * decisions live in referrals.ts (pickReferralThanks) and are unit-tested
 * there.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  pickReferralThanks,
  REFERRAL_THANKS_RECENCY_MS,
  type ReferralClaimLite,
} from './referrals';

const CLAIMS = 'referralClaims';
const PROFILES = 'sanataniProfiles';
const DEVOTEE_PROFILES = 'devoteeProfiles';
const CLAIM_FETCH_LIMIT = 25;

const THANKED_KEY_PREFIX = 'sb.referralThanks.thanked.v1.';
/** Ledger entries older than this are pruned (beyond the recency window). */
const LEDGER_PRUNE_MS = REFERRAL_THANKS_RECENCY_MS + 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* SAN-ID ⇄ uid resolution (sanataniProfiles is public-read)           */
/* ------------------------------------------------------------------ */

/** Resolve a sharer's Sanatani ID to their uid. Null when unresolvable. */
export async function resolveSharerUid(sanId: string): Promise<string | null> {
  const clean = (sanId || '').trim().toUpperCase();
  if (!/^SAN-[A-Z0-9]{6}$/.test(clean)) return null;
  try {
    const snap = await getDocs(
      query(collection(db, PROFILES), where('id', '==', clean), limit(1)),
    );
    if (snap.empty) return null;
    const uid = snap.docs[0].id;
    return uid || null;
  } catch {
    return null; // offline / rules — attribution is enhancement, never a blocker
  }
}

/** The signed-in user's OWN Sanatani ID (for the self-guard). Null-safe. */
export async function fetchOwnSanId(uid: string): Promise<string | null> {
  if (!uid || uid === 'anon') return null;
  try {
    const snap = await getDoc(doc(db, PROFILES, uid));
    const id = snap.exists() ? (snap.data() as { id?: unknown }).id : undefined;
    if (typeof id === 'string' && /^SAN-[A-Z0-9]{6}$/.test(id)) return id;
  } catch {
    /* fall through to the devotee profile */
  }
  try {
    const snap = await getDoc(doc(db, DEVOTEE_PROFILES, uid));
    const san = snap.exists() ? (snap.data() as { sanId?: unknown }).sanId : undefined;
    if (typeof san === 'string' && /^SAN-[A-Z0-9]{6}$/.test(san)) return san;
  } catch {
    /* no profile anywhere — attribution stays off */
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Booker side — leave the claim                                       */
/* ------------------------------------------------------------------ */

/**
 * Record that a referred booking happened, so the sharer's device can
 * thank itself later. Fire-and-forget: NEVER throws, NEVER blocks or
 * fails a booking. Second-layer self-guard: if the SAN-ID resolves to
 * the booker themselves, no claim is written (uid-level truth, beyond
 * the SAN-ID string comparison at the booking call sites).
 */
export async function recordReferralClaim(input: {
  orderId: string;
  sharerSanId: string | null | undefined;
  providerName: string;
  bookerUid: string;
}): Promise<void> {
  try {
    const { orderId, providerName, bookerUid } = input;
    const sharerSanId = (input.sharerSanId || '').trim().toUpperCase();
    if (!orderId || !bookerUid || bookerUid === 'anon') return;
    if (!/^SAN-[A-Z0-9]{6}$/.test(sharerSanId)) return;
    const sharerUid = await resolveSharerUid(sharerSanId);
    if (!sharerUid || sharerUid === bookerUid) return;
    await setDoc(doc(db, CLAIMS, orderId), {
      orderId,
      sharerUid,
      sharerSanId,
      bookerUid,
      providerName: (providerName || 'a seva provider').slice(0, 80),
      createdAt: Date.now(),
    });
  } catch {
    /* rules not landed yet / offline — the booking already succeeded;
       the thanks is a warm extra, never a reason to surface an error */
  }
}

/* ------------------------------------------------------------------ */
/* Sharer side — self-listen                                           */
/* ------------------------------------------------------------------ */

function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number };
    if (typeof v.toMillis === 'function') {
      const ms = v.toMillis();
      if (Number.isFinite(ms)) return ms;
    }
  }
  return 0;
}

/** Recent claims naming this sharer (single-field query, client sort). */
export async function fetchReferralClaims(
  sharerUid: string,
  sinceMs: number,
): Promise<ReferralClaimLite[]> {
  const snap = await getDocs(
    query(collection(db, CLAIMS), where('sharerUid', '==', sharerUid), limit(CLAIM_FETCH_LIMIT)),
  );
  const claims: ReferralClaimLite[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const createdAtMs = toEpochMs(data.createdAt);
    if (createdAtMs < sinceMs) continue;
    claims.push({
      id: d.id,
      providerName:
        typeof data.providerName === 'string' && data.providerName
          ? data.providerName
          : 'a seva provider',
      createdAtMs,
    });
  }
  return claims.sort((a, b) => a.createdAtMs - b.createdAtMs);
}

/* ------------------------------------------------------------------ */
/* Thanked ledger (fail-open: storage problems never break the app)    */
/* ------------------------------------------------------------------ */

function thankedKey(uid: string): string {
  return `${THANKED_KEY_PREFIX}${uid}`;
}

function loadThanked(uid: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(thankedKey(uid));
    if (!raw) return null; // null = never checked → baseline run
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {}; // corrupt storage → treat as checked, never re-blast
  }
}

function saveThanked(uid: string, thanked: Record<string, number>): void {
  try {
    const cutoff = Date.now() - LEDGER_PRUNE_MS;
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(thanked)) if (v > cutoff) pruned[k] = v;
    localStorage.setItem(thankedKey(uid), JSON.stringify(pruned));
  } catch {
    /* storage unavailable — the center's dedupeKey still prevents doubles */
  }
}

/* ------------------------------------------------------------------ */
/* Checker + watcher (mirrors org/broadcastListener.ts)                */
/* ------------------------------------------------------------------ */

/**
 * One thanks check for a devotee. Returns how many bells were emitted.
 * Fire-and-forget safe: never throws.
 */
export async function checkReferralThanks(
  uid: string,
  opts: { now?: number } = {},
): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  const now = opts.now ?? Date.now();
  try {
    const claims = await fetchReferralClaims(uid, now - REFERRAL_THANKS_RECENCY_MS);
    if (claims.length === 0) {
      // Still record the baseline pass so a first-ever claim later rings.
      if (loadThanked(uid) === null) saveThanked(uid, {});
      return 0;
    }
    const thanked = loadThanked(uid);
    const baseline = thanked === null;
    const { notify, markThanked } = pickReferralThanks({
      claims,
      thanked: thanked ?? {},
      now,
      baseline,
    });

    // Persist the marks FIRST — if an emit crashes midway, the devotee
    // is never re-blasted on the next check.
    saveThanked(uid, { ...(thanked ?? {}), ...markThanked });
    if (notify.length === 0) return 0;

    // Lazy: the emit chain pulls in firebase — only needed when we ring.
    const { notifyReferralThanks } = await import('../notifications/notifyHelpers');
    let sent = 0;
    for (const c of notify) {
      try {
        await notifyReferralThanks(uid, { providerName: c.providerName, claimId: c.id });
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
 * Start the sharer-thanks watcher: runs once on start, again whenever
 * the app returns to the foreground, and ticks every 60s while visible.
 * Returns a stop function.
 */
export function startReferralThanksNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkReferralThanks(uid);
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const tick =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') run();
        }, 60000)
      : null;

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    if (tick !== null) window.clearInterval(tick);
  };
}
