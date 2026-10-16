/**
 * trustScore.ts — Seva Professional shared trust score.
 * =====================================================
 * ONE score per professional (keyed by uid), spanning BOTH the purohit and
 * jyotish roles. The raw 0–100 number is an internal RANKING SIGNAL and is
 * NEVER shown to devotees — humans see warm language ("Trusted by 47
 * families"), never digits. See trustDisplayFor().
 *
 * Pure functions only — no Firestore imports, so this module is unit-testable
 * under plain jest (src/lib/__tests__/trustScore.spec.ts).
 *
 * Formula (documented & explainable; see HANDOFF.md for anti-gaming notes):
 *   score = clamp(0, 100,
 *     TIER_BASE
 *     + EXPERIENCE          (log-scaled completed sevas across both roles)
 *     + ASHIRVAD            (confidence-weighted average rating)
 *     + TEMPLE_ENDORSEMENTS (temple/org endorsements, capped)
 *     + PUNCTUALITY         (response-time bonus, neutral when unknown)
 *     - DISPUTE_PENALTY     (counts AND rate, uncapped within 15pt limit)
 *   )
 *
 * Component ceilings sum to exactly 100: 60 + 15 + 10 + 10 + 5 = 100, so the
 * breakdown always adds up to the score with no hidden math. A dispute
 * penalty (max 15) always drags the total down; no combination of bonuses can
 * offset a penalty beyond its own 15-point limit.
 */

export type VerificationTier = 'REGISTERED' | 'VERIFIED' | 'TRUSTED';

export type TrustBand = 'new' | 'growing' | 'trusted' | 'renowned';

export type DisplayLang = 'en' | 'bn' | 'hi';

/** Tier weight — the anchor of the score. Identity verification matters more than volume. */
const TIER_BASE: Record<VerificationTier, number> = {
  REGISTERED: 0,
  VERIFIED: 40,
  TRUSTED: 60,
};

/** Ceilings for the earned components. Sum of maxima = 40 (tier) + 60 = 100. */
const CEIL = {
  experience: 15,
  ashirvad: 10,
  endorsements: 10,
  punctuality: 5,
  disputePenalty: 15,
} as const;

/** Experience saturates at ~100 completed sevas (ln(1+n)/ln(101)). */
const EXPERIENCE_SATURATION = 100;

/** Ashirvad rating only earns full weight after this many reviews. */
const RATING_CONFIDENCE_FLOOR = 10;

/** Endorsements stop counting after 3 (quality > quantity). */
const ENDORSEMENT_CAP = 3;

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/**
 * Normalize whatever tier string the platform stores (legacy purohit tiers
 * like CREDENTIAL_VERIFIED / ORG_ENDORSED / PLATFORM_VERIFIED, or the Phase-2
 * unified tiers) onto the unified three-tier scale.
 */
export function normalizeTier(stored: string | null | undefined): VerificationTier {
  const t = (stored || '').toUpperCase();
  if (t === 'TRUSTED' || t === 'PLATFORM_VERIFIED') return 'TRUSTED';
  if (t === 'VERIFIED' || t === 'CREDENTIAL_VERIFIED' || t === 'ORG_ENDORSED') return 'VERIFIED';
  return 'REGISTERED';
}

/** Signal from one role doc (purohits/{id} or jyotishProfiles/{id}). */
export interface RoleTrustSignal {
  /** Stored tier string (any scheme — normalizeTier handles it). */
  verificationTier: string | null | undefined;
  /** Weighted average of received ashirvad reviews (1–5 scale). */
  ratingAggregate: number;
  /** Number of reviews behind ratingAggregate. */
  ratingCount: number;
  /** Completed sevas in this role (completedGigs / completedConsultations). */
  completedSevas: number;
}

export interface TrustScoreInput {
  purohit: RoleTrustSignal | null;
  jyotish: RoleTrustSignal | null;
  /** Temple/org endorsements across both roles. */
  endorsementCount: number;
  /** Disputes raised against the professional (marketplaceOrders status=disputed). */
  disputeCount: number;
  /** Average first-response time in hours. null/undefined = unknown (neutral). */
  avgResponseHours?: number | null;
}

/** Per-component points — the score's explanation surface for providers/admins. */
export interface TrustBreakdown {
  tierBase: number;
  experience: number;
  ashirvad: number;
  endorsements: number;
  punctuality: number;
  disputePenalty: number;
}

export interface TrustResult {
  /** 0–100 internal ranking signal. NEVER render to devotees. */
  score: number;
  band: TrustBand;
  tier: VerificationTier;
  /** Combined completed sevas across both roles (drives "N sevas" copy). */
  sevasCompleted: number;
  /** Combined review count across both roles. */
  reviewCount: number;
  breakdown: TrustBreakdown;
}

/** Combined tier = the better of the two role tiers (trust is about the person, not the hat). */
function combinedTier(p: RoleTrustSignal | null, j: RoleTrustSignal | null): VerificationTier {
  const rank: Record<VerificationTier, number> = { REGISTERED: 0, VERIFIED: 1, TRUSTED: 2 };
  const pt = normalizeTier(p?.verificationTier);
  const jt = normalizeTier(j?.verificationTier);
  return rank[jt] > rank[pt] ? jt : pt;
}

function totalCompletedSevas(p: RoleTrustSignal | null, j: RoleTrustSignal | null): number {
  return (p?.completedSevas || 0) + (j?.completedSevas || 0);
}

function combinedRating(p: RoleTrustSignal | null, j: RoleTrustSignal | null): {
  avg: number; count: number;
} {
  const pc = p?.ratingCount || 0;
  const jc = j?.ratingCount || 0;
  const count = pc + jc;
  if (count === 0) return { avg: 0, count: 0 };
  const avg = ((p?.ratingAggregate || 0) * pc + (j?.ratingAggregate || 0) * jc) / count;
  return { avg, count };
}

export function computeTrustScore(input: TrustScoreInput): TrustResult {
  const { purohit, jyotish, endorsementCount, disputeCount } = input;
  const tier = combinedTier(purohit, jyotish);
  const sevasCompleted = totalCompletedSevas(purohit, jyotish);
  const { avg: ratingAvg, count: ratingCount } = combinedRating(purohit, jyotish);

  const tierBase = TIER_BASE[tier];

  // Log-scaled: early sevas matter most; padding volume yields diminishing returns.
  const experience = Math.round(
    CEIL.experience * Math.min(1, Math.log(1 + sevasCompleted) / Math.log(1 + EXPERIENCE_SATURATION))
  );

  // Ashirvad: only ratings ≥3.5 earn points, weighted by review confidence so a
  // single 5-star review can't catapult a new profile.
  const confidence = Math.min(1, ratingCount / RATING_CONFIDENCE_FLOOR);
  const ratingQuality = ratingCount > 0 ? clamp((ratingAvg - 3.5) / 1.5, 0, 1) : 0;
  const ashirvad = Math.round(CEIL.ashirvad * confidence * ratingQuality);

  // Temple endorsements: meaningful but capped — 3+ counts the same.
  const endorsements = Math.round(
    CEIL.endorsements * Math.min(1, Math.max(0, endorsementCount) / ENDORSEMENT_CAP)
  );

  // Punctuality: bonus only; unknown response time is neutral, never a penalty.
  const h = input.avgResponseHours;
  let punctuality = 0;
  if (h != null && Number.isFinite(h) && h >= 0) {
    punctuality = h <= 4 ? CEIL.punctuality : h <= 24 ? 3 : h <= 72 ? 1 : 0;
  }

  // Disputes: penalize both count AND rate (rate punishes repeat offenders
  // whose dispute count hides inside high volume).
  const rate = disputeCount / Math.max(1, sevasCompleted);
  const disputePenalty = Math.min(
    CEIL.disputePenalty,
    Math.max(0, Math.round(3 * disputeCount + 20 * rate))
  );

  const score = clamp(
    tierBase + experience + ashirvad + endorsements + punctuality - disputePenalty,
    0, 100
  );

  const band: TrustBand =
    score >= 80 ? 'renowned' : score >= 55 ? 'trusted' : score >= 30 ? 'growing' : 'new';

  return {
    score,
    band,
    tier,
    sevasCompleted,
    reviewCount: ratingCount,
    breakdown: { tierBase, experience, ashirvad, endorsements, punctuality, disputePenalty },
  };
}

/* ------------------------------------------------------------------ */
/* Warm display copy — what humans see instead of the raw number.      */
/* ------------------------------------------------------------------ */

const BAND_COPY: Record<TrustBand, Record<DisplayLang, (n: number) => string>> = {
  new: {
    en: () => 'New to the sangha — every master was once a beginner',
    bn: () => 'সঙ্ঘে নতুন — প্রতিটি গুরুর সূচনা এখান থেকেই',
    hi: () => 'संगम में नए — हर गुरु की शुरुआत यहीं से होती है',
  },
  growing: {
    en: () => 'Serving families with devotion',
    bn: () => 'ভক্তিভরে পরিবারগুলোর সেবায়',
    hi: () => 'भक्ति से परिवारों की सेवा में',
  },
  trusted: {
    en: (n) => `Trusted by ${n} ${n === 1 ? 'family' : 'families'}`,
    bn: (n) => `${n}টি পরিবারের আস্থা`,
    hi: (n) => `${n} परिवारों का विश्वास`,
  },
  renowned: {
    en: (n) => `Beloved of the sangha — trusted by ${n} ${n === 1 ? 'family' : 'families'}`,
    bn: (n) => `সঙ্ঘের প্রিয় — ${n}টি পরিবারের আস্থা`,
    hi: (n) => `संगम के प्रिय — ${n} परिवारों का विश्वास`,
  },
};

const SEVA_LINE: Record<DisplayLang, (n: number) => string> = {
  en: (n) => `${n} ${n === 1 ? 'seva' : 'sevas'} completed with devotion`,
  bn: (n) => `ভক্তিভরে ${n}টি সেবা সম্পন্ন`,
  hi: (n) => `भक्ति से ${n} सेवाएँ पूर्ण`,
};

const TIER_BADGE: Record<VerificationTier, Record<DisplayLang, string>> = {
  TRUSTED: {
    en: 'Trusted Seva Provider',
    bn: 'বিশ্বস্ত সেবা প্রদানকারী',
    hi: 'विश्वसनीय सेवा प्रदाता',
  },
  VERIFIED: {
    en: 'Verified Seva Provider',
    bn: 'যাচাইকৃত সেবা প্রদানকারী',
    hi: 'सत्यापित सेवा प्रदाता',
  },
  REGISTERED: {
    en: 'Registered Seva Provider',
    bn: 'নিবন্ধিত সেবা প্রদানকারী',
    hi: 'पंजीकृत सेवा प्रदाता',
  },
};

export interface TrustDisplay {
  /** Warm headline. Contains no raw score digits. */
  headline: string;
  /** Second line, e.g. "47 sevas completed with devotion". */
  sevaLine: string;
  /** Tier medallion text. */
  tierBadge: string;
  band: TrustBand;
  tier: VerificationTier;
}

/**
 * Build the devotee-facing display for a TrustResult.
 * Guarantee: the raw score never appears — only warm, human language.
 */
export function trustDisplayFor(result: TrustResult, lang: DisplayLang = 'en'): TrustDisplay {
  const l: DisplayLang = BAND_COPY.trusted[lang] ? lang : 'en';
  return {
    headline: BAND_COPY[result.band][l](result.sevasCompleted),
    sevaLine: SEVA_LINE[l](result.sevasCompleted),
    tierBadge: TIER_BADGE[result.tier][l],
    band: result.band,
    tier: result.tier,
  };
}

/**
 * Provider-facing explanation (GodMode / provider dashboard). Shows how the
 * score is composed — never shown to devotees.
 */
export function explainScore(result: TrustResult): string {
  const b = result.breakdown;
  return [
    `Trust score ${result.score}/100 (${result.tier}, ${result.band})`,
    `· Tier base: ${b.tierBase}`,
    `· Experience (log-scaled, ${result.sevasCompleted} sevas): ${b.experience}`,
    `· Ashirvad (${result.reviewCount} reviews): ${b.ashirvad}`,
    `· Temple endorsements: ${b.endorsements}`,
    `· Punctuality: ${b.punctuality}`,
    `· Dispute penalty: -${b.disputePenalty}`,
  ].join('\n');
}
