/**
 * sangam/referrals.ts — Share-carries-referral (Phase 4).
 * ============================================================================
 * Every service card, gratitude post, and consultation answer gets a Share
 * button. Shared links carry ?ref={sharerSanataniId}. When a booking comes
 * from a shared link, the booking stores referredBy and the sharer gets a
 * warm GENTLE acknowledgment: "🪔 You guided a family to [Provider]."
 *
 * No money, no points — just warm recognition. (Monetary referral is a
 * later phase and needs real design.)
 *
 * Tracking reuses marketplaceOrders (referredBy field) — no new
 * collection. Attribution is honest and minimal.
 */

/** Extract the referrer's Sanatani ID from a shared URL. */
export function extractReferrer(urlOrQuery: string): string | null {
  try {
    const q = urlOrQuery.includes('?') ? urlOrQuery.split('?')[1] : urlOrQuery;
    const params = new URLSearchParams(q);
    const ref = (params.get('ref') || '').trim().toUpperCase();
    return /^SAN-[A-Z0-9]{6}$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

/** Append ?ref= to a shareable path. */
export function withReferrer(path: string, sharerSanId: string): string {
  const clean = (sharerSanId || '').trim().toUpperCase();
  if (!/^SAN-[A-Z0-9]{6}$/.test(clean)) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}ref=${clean}`;
}

/** Warm acknowledgment copy for the sharer (Suchana, GENTLE). */
export function referralThanksCopy(
  providerName: string,
  lang: 'en' | 'hi' | 'bn' = 'en',
): { title: string; body: string } {
  if (lang === 'bn') {
    return {
      title: '🪔 আপনি একটি পরিবারকে পথ দেখিয়েছেন',
      body: `${providerName}-এর কাছে আপনার শেয়ার থেকে একটি পরিবার সেবা নিল। সাধু!`,
    };
  }
  if (lang === 'hi') {
    return {
      title: '🪔 आपने एक परिवार का मार्गदर्शन किया',
      body: `आपके शेयर से एक परिवार ने ${providerName} से सेवा ली। साधु!`,
    };
  }
  return {
    title: '🪔 You guided a family',
    body: `A family booked seva with ${providerName} from your share. Sadhu!`,
  };
}

/** A referral must never be self-attribution. */
export function isValidReferral(sharerSanId: string, bookerSanId: string): boolean {
  const a = (sharerSanId || '').trim().toUpperCase();
  const b = (bookerSanId || '').trim().toUpperCase();
  if (!/^SAN-[A-Z0-9]{6}$/.test(a)) return false;
  if (!/^SAN-[A-Z0-9]{6}$/.test(b)) return false;
  return a !== b;
}

/* ------------------------------------------------------------------ */
/* QUEUED #25 — the self-guard, wired.                                 */
/*                                                                     */
/* isValidReferral existed since Phase 4 but was never called: both    */
/* booking paths stored whatever ?ref= carried, so a devotee could     */
/* share their own link, open it, book, and be credited as their own   */
/* referrer. resolveReferralAttribution is now THE single gate every   */
/* booking path passes through before `referredBy` is written.         */
/*                                                                     */
/* Silent-graceful law: a rejected attribution is simply absent —     */
/* the booking proceeds untouched, no error, no drama. When the        */
/* booker's own SAN-ID is unknown (profile not loaded), attribution    */
/* is dropped too: unverifiable never earns credit.                    */
/*                                                                     */
/* Honest limit: this stops SAME-ACCOUNT self-referral. A second      */
/* account on the same device/person cannot be detected client-side   */
/* and is NOT faked here — that needs server-side signals (out of      */
/* scope on Spark); the uid-level recheck in referralThanksService     */
/* (sharerUid === bookerUid → no claim) is the second layer.           */
/* ------------------------------------------------------------------ */

/**
 * Decide the `referredBy` value to store for a booking, or null.
 * @param rawRef      output of extractReferrer() (or any raw ?ref= value)
 * @param bookerSanId the booker's OWN Sanatani ID (null/unknown → null)
 */
export function resolveReferralAttribution(
  rawRef: string | null | undefined,
  bookerSanId: string | null | undefined,
): string | null {
  const ref = (rawRef || '').trim().toUpperCase();
  const booker = (bookerSanId || '').trim().toUpperCase();
  if (!ref || !booker) return null;
  return isValidReferral(ref, booker) ? ref : null;
}

/* ------------------------------------------------------------------ */
/* QUEUED #25 — sharer thanks decisions (pure).                        */
/*                                                                     */
/* The sharer hears ONE gentle Suchana note per referred booking.     */
/* The claim rows live in `referralClaims/{orderId}` (written by the   */
/* booker — see referralThanksService.ts for why, and for the rules    */
/* block the owner still has to approve). The watcher's decisions —   */
/* which claims to ring for, and which to silently mark — live here    */
/* so they are unit-testable without Firestore.                        */
/* ------------------------------------------------------------------ */

/** Claims older than this never ring (the moment has passed). */
export const REFERRAL_THANKS_RECENCY_MS = 30 * 24 * 60 * 60 * 1000;
/** Warmth, not a drumbeat: at most this many thanks bells per check. */
export const REFERRAL_THANKS_MAX_PER_CHECK = 2;

/** The claim shape the thanks watcher consumes (Firestore-free). */
export interface ReferralClaimLite {
  /** Claim doc id == the marketplace order id. */
  id: string;
  /** Provider the family booked with — the only name the copy uses. */
  providerName: string;
  /** Epoch ms the referred booking was created. */
  createdAtMs: number;
}

/** Stable dedupe key for the NotificationCenter (one bell per claim, ever). */
export function referralThanksDedupeKey(orderId: string): string {
  return `refthanks:${orderId}`;
}

/**
 * Decide a thanks check.
 * - baseline (first check on this device): ring NOTHING, mark all seen —
 *   a devotee is never blasted with thanks for pre-feature bookings.
 * - otherwise: unseen claims inside the recency window ring, oldest
 *   first, capped per check; claims beyond the cap stay UNMARKED so a
 *   later check can still ring them; stale claims are marked silently.
 * - already-thanked claims are never re-rung and need no marking.
 */
export function pickReferralThanks(input: {
  claims: ReferralClaimLite[];
  thanked: Record<string, number>;
  now: number;
  baseline: boolean;
}): { notify: ReferralClaimLite[]; markThanked: Record<string, number> } {
  const { claims, thanked, now, baseline } = input;
  const markThanked: Record<string, number> = {};
  if (baseline) {
    for (const c of claims) markThanked[c.id] = now;
    return { notify: [], markThanked };
  }
  const fresh = claims
    .filter((c) => !thanked[c.id])
    .sort((a, b) => a.createdAtMs - b.createdAtMs);
  const notify: ReferralClaimLite[] = [];
  for (const c of fresh) {
    if (now - c.createdAtMs > REFERRAL_THANKS_RECENCY_MS) {
      markThanked[c.id] = now; // too old to ring — retire it quietly
      continue;
    }
    if (notify.length < REFERRAL_THANKS_MAX_PER_CHECK) {
      notify.push(c);
      markThanked[c.id] = now;
    }
    // beyond the cap: left unmarked on purpose — a later check rings it
  }
  return { notify, markThanked };
}
