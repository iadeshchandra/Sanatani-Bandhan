/**
 * Seva Professional Program — Phase 1
 * Unified professional profile data aggregator.
 * ============================================================================
 * One person can be BOTH a Purohit (purohits/{id}) and a Jyotishi
 * (jyotishProfiles/{id}) under the same Firebase Auth uid. This module fetches
 * both identity docs plus the SAN-linked Solo identity, merges ratings,
 * completed-seva counts and reviews into ONE UnifiedProfessional shape that
 * the public profile page renders.
 *
 * Design notes:
 * - Every fetch is individually guarded (Promise.allSettled semantics) so a
 *   single failing read never blanks the whole page — offline-friendly.
 * - Reviews are fetched the same way PurohitContext.reviewsForPurohit and
 *   JyotishContext.reviewsForJyotish do (gigs/consultations -> devotee
 *   reviews), but merged and sorted into one combined stream.
 * - Never mints anything. Never writes. Pure read aggregation.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type {
  ConsultationReview,
  JyotishIdentity,
} from '../../types/jyotish';
import type { GigReview, PurohitIdentity } from '../../types/purohit';

export type SpecializationKind = 'purohit' | 'jyotish';

/** One review in the combined stream, tagged with its source. */
export interface UnifiedReview {
  id: string;
  reviewerName: string;
  rating: number;
  note: string;
  createdAt: number;
  source: SpecializationKind;
  /** Warm, human label: 'Purohit seva' | 'Jyotish consultation'. */
  sourceLabel: string;
}

export interface UnifiedProfessional {
  /** Firebase Auth uid — the single key for this person. */
  uid: string;
  displayName: string;
  /** Preferred portrait (identity photo or SAN profile photo). */
  photoURL?: string;
  /** Universal Sanatani ID, e.g. SAN-XXXXXX (when the person has a Solo identity). */
  sanId?: string;
  hasPurohit: boolean;
  hasJyotish: boolean;
  purohit?: PurohitIdentity;
  jyotish?: JyotishIdentity;
  /** Merged, deduped across both specializations. */
  languages: string[];
  /** gurukulAffiliation (purohit) + parampara (jyotish), deduped. */
  traditions: string[];
  /** city/state from both identities, deduped. */
  serviceAreas: string[];
  /** Best (max) declared experience across both identities. */
  experienceYears: number;
  /** Rating weighted by ratingCount across both identities, 1 decimal. */
  combinedRating: number;
  combinedRatingCount: number;
  /** completedGigs (purohit) + completedConsultations (jyotish). */
  combinedCompletedSevas: number;
  /** Combined reviews, newest first (capped). */
  reviews: UnifiedReview[];
  /** Photos for the gallery — currently the portrait(s); grows in Phase 2. */
  photos: string[];
}

const REVIEW_CAP = 40;

/** Strip empties, trim, dedupe (case-insensitive), preserve order. */
function dedupe(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = (raw || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

async function fetchPurohitByUid(
  uid: string
): Promise<PurohitIdentity | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'purohits'), where('uid', '==', uid), limit(1))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Record<string, unknown>) } as PurohitIdentity;
  } catch {
    return null;
  }
}

async function fetchJyotishByUid(uid: string): Promise<JyotishIdentity | null> {
  try {
    const snap = await getDocs(
      query(collection(db, 'jyotishProfiles'), where('uid', '==', uid), limit(1))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Record<string, unknown>) } as JyotishIdentity;
  } catch {
    return null;
  }
}

async function fetchSanIdentity(
  uid: string
): Promise<{ sanId?: string; photoURL?: string; displayName?: string }> {
  try {
    const snap = await getDoc(doc(db, 'sanataniProfiles', uid));
    if (!snap.exists()) return {};
    const data = snap.data() as Record<string, unknown>;
    const out: { sanId?: string; photoURL?: string; displayName?: string } = {};
    const id = snap.id;
    if (typeof id === 'string' && id.startsWith('SAN-')) out.sanId = id;
    if (typeof data.photoURL === 'string' && data.photoURL) out.photoURL = data.photoURL;
    if (typeof data.displayName === 'string' && data.displayName.trim())
      out.displayName = data.displayName.trim();
    return out;
  } catch {
    return {};
  }
}

async function fetchPurohitReviews(
  purohitId: string
): Promise<UnifiedReview[]> {
  try {
    const gsnap = await getDocs(
      query(collection(db, 'gigs'), where('assignedPurohitId', '==', purohitId), limit(100))
    );
    const gigIds = new Set(gsnap.docs.map((d) => d.id));
    if (gigIds.size === 0) return [];
    const rsnap = await getDocs(
      query(collection(db, 'reviews'), where('reviewerKind', '==', 'devotee'), limit(250))
    );
    return rsnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as GigReview))
      .filter((r) => gigIds.has(r.gigId))
      .map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName || 'Devotee',
        rating: r.rating || 0,
        note: r.note || '',
        createdAt: r.createdAt || 0,
        source: 'purohit' as SpecializationKind,
        sourceLabel: 'Purohit seva',
      }));
  } catch {
    return [];
  }
}

async function fetchJyotishReviews(
  jyotishUid: string
): Promise<UnifiedReview[]> {
  try {
    // JY-02: consultations are party-scoped in rules — a by-jyotishId
    // listing is denied for everyone but a party/admin. Querying by
    // assignedJyotishUid is provable when the viewer IS this jyotishi
    // (their own unified profile); for third-party viewers the query
    // is denied and this degrades to [] (the public profile still
    // shows the rating aggregate/count from the profile doc itself).
    const gsnap = await getDocs(
      query(
        collection(db, 'jyotishConsultations'),
        where('assignedJyotishUid', '==', jyotishUid),
        limit(100)
      )
    );
    const cIds = new Set(gsnap.docs.map((d) => d.id));
    if (cIds.size === 0) return [];
    const rsnap = await getDocs(
      query(
        collection(db, 'jyotishReviews'),
        where('reviewerKind', '==', 'devotee'),
        limit(250)
      )
    );
    return rsnap.docs
      .map(
        (d) =>
          ({ id: d.id, ...(d.data() as Record<string, unknown>) } as ConsultationReview)
      )
      .filter((r) => cIds.has(r.consultationId))
      .map((r) => ({
        id: r.id,
        reviewerName: r.reviewerName || 'Devotee',
        rating: r.rating || 0,
        note: r.note || '',
        createdAt: r.createdAt || 0,
        source: 'jyotish' as SpecializationKind,
        sourceLabel: 'Jyotish consultation',
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch and merge both professional identities for one uid.
 * Returns null when the uid has neither identity (graceful, no throw).
 */
export async function fetchUnifiedProfessional(
  uid: string
): Promise<UnifiedProfessional | null> {
  if (!uid) return null;

  const [purohit, jyotish, san] = await Promise.all([
    fetchPurohitByUid(uid),
    fetchJyotishByUid(uid),
    fetchSanIdentity(uid),
  ]);

  if (!purohit && !jyotish) return null;

  const displayName =
    purohit?.displayName || jyotish?.displayName || san.displayName || 'Seva Professional';

  const [purohitReviews, jyotishReviews] = await Promise.all([
    purohit ? fetchPurohitReviews(purohit.id) : Promise.resolve([] as UnifiedReview[]),
    jyotish ? fetchJyotishReviews(jyotish.uid) : Promise.resolve([] as UnifiedReview[]),
  ]);
  const reviews = [...purohitReviews, ...jyotishReviews]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, REVIEW_CAP);

  // Weighted rating across both identities.
  const pCount = purohit?.ratingCount || 0;
  const jCount = jyotish?.ratingCount || 0;
  const totalCount = pCount + jCount;
  const combinedRating =
    totalCount > 0
      ? Math.round(
          (((purohit?.ratingAggregate || 0) * pCount +
            (jyotish?.ratingAggregate || 0) * jCount) /
            totalCount) *
            10
        ) / 10
      : 0;

  const languages = dedupe([
    ...(purohit?.languages || []),
    ...(jyotish?.languages || []),
  ]);

  const traditions = dedupe([
    purohit?.gurukulAffiliation,
    jyotish?.parampara,
  ]);

  const serviceAreas = dedupe([
    purohit?.city,
    purohit?.state,
    jyotish?.city,
    jyotish?.state,
  ]);

  const experienceYears = Math.max(
    purohit?.experienceYears || 0,
    jyotish?.experienceYears || 0
  );

  const photoURL =
    (purohit as unknown as { photoURL?: string } | undefined)?.photoURL ||
    (jyotish as unknown as { photoURL?: string } | undefined)?.photoURL ||
    san.photoURL;

  return {
    uid,
    displayName,
    photoURL,
    sanId: san.sanId,
    hasPurohit: !!purohit,
    hasJyotish: !!jyotish,
    ...(purohit ? { purohit } : {}),
    ...(jyotish ? { jyotish } : {}),
    languages,
    traditions,
    serviceAreas,
    experienceYears,
    combinedRating,
    combinedRatingCount: totalCount,
    combinedCompletedSevas:
      (purohit?.completedGigs || 0) + (jyotish?.completedConsultations || 0),
    reviews,
    photos: photoURL ? [photoURL] : [],
  };
}

/**
 * Warm, human honor line for a verification tier — honors, not compliance
 * stamps. e.g. "Verified Purohit · Platform Verified".
 */
export function honorLine(
  kind: SpecializationKind,
  tierLabel: string
): string {
  const role = kind === 'purohit' ? 'Purohit' : 'Jyotishi';
  return `Verified ${role} · ${tierLabel}`;
}
