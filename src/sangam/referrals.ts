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
