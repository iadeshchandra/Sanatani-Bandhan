/**
 * Purohit One — independent purohit identity, verification & marketplace types.
 * ============================================================================
 * A purohit is a PERSON, not a temple employee. These types back the
 * org-independent identity system: anyone can register, get verified through
 * a transparent tier pipeline, and receive ritual gigs directly from devotees
 * — seeing zero organisation data.
 *
 * TRUST MODEL ($0 constraint, documented honestly):
 * - Ratings may only be created for gigs the reviewer is party to (devotee
 *   who posted it, or purohit assigned to it). Enforced in Firestore rules
 *   via deterministic review doc IDs + in the UI.
 * - Endorsements may only be created by authenticated users naming a real
 *   workspace (rules check the workspace doc exists). Fake endorsements are
 *   publicly visible and admin-reversible.
 * - Tier auto-advancement (ORG_ENDORSED / PLATFORM_VERIFIED) is performed
 *   client-side along a strictly ordered path; the endorsement / gig / review
 *   records are the public audit trail. Server-authoritative advancement would
 *   need Cloud Functions (out of the $0 envelope) — noted as a follow-up.
 * - Real-money escrow is NOT implemented: the DAKSHINA_RELEASED status is an
 *   honest workflow state (devotee confirms receipt of service). Actual fund
 *   custody needs a licensed payment partner.
 */

/** Four-tier verification pipeline. Ordered — never skips. */
export type PurohitVerificationTier =
  | 'REGISTERED'
  | 'CREDENTIAL_VERIFIED'
  | 'ORG_ENDORSED'
  | 'PLATFORM_VERIFIED';

export const PUROHIT_TIERS: PurohitVerificationTier[] = [
  'REGISTERED',
  'CREDENTIAL_VERIFIED',
  'ORG_ENDORSED',
  'PLATFORM_VERIFIED',
];

export const PUROHIT_TIER_META: Record<
  PurohitVerificationTier,
  { label: string; labelHi: string; description: string; badge: string }
> = {
  REGISTERED: {
    label: 'Registered',
    labelHi: 'पंजीकृत',
    description: 'Identity created. Complete the credential application to proceed.',
    badge: '🪔',
  },
  CREDENTIAL_VERIFIED: {
    label: 'Credential Verified',
    labelHi: 'प्रमाणपत्र सत्यापित',
    description: 'Vedic credentials reviewed and approved by the platform.',
    badge: '📜',
  },
  ORG_ENDORSED: {
    label: 'Organisation Endorsed',
    labelHi: 'संस्था समर्थित',
    description: 'Endorsed by a registered organisation — mandir, sangha, ashram, gurukul, goshala or trust.',
    badge: '🏛️',
  },
  PLATFORM_VERIFIED: {
    label: 'Platform Verified',
    labelHi: 'मंच सत्यापित',
    description: 'Top tier — endorsed and proven through completed rituals.',
    badge: '✅',
  },
};

export const RITUAL_TYPES = [
  'Havan & Yajna',
  'Samskara & Vivah',
  'Katha & Shanti',
  'Vastu & Grihapravesh',
  'Mandir Sanctum',
] as const;
export type RitualType = (typeof RITUAL_TYPES)[number];

export const VEDIC_BRANCHES = [
  'Rigveda',
  'Yajurveda',
  'Samaveda',
  'Atharvaveda',
  'Smartha',
  'Tantrik',
] as const;

/** Org-independent purohit identity. Lives in the GLOBAL `purohits` collection. */
export interface PurohitIdentity {
  /** Universal Purohit ID, e.g. PUR-7K2Q9M */
  id: string;
  /** Firebase Auth uid of the owner. Never changes. */
  uid: string;
  displayName: string;
  phone: string;
  email?: string;
  city: string;
  state?: string;
  languages: string[];
  specializations: string[];
  experienceYears: number;
  bio?: string;
  gurukulAffiliation?: string;
  dakshinaRangeMin?: number;
  dakshinaRangeMax?: number;
  verificationTier: PurohitVerificationTier;
  ratingAggregate: number;
  ratingCount: number;
  completedGigs: number;
  /** Dual identity: linked org staff record, if accepted as temple staff. */
  linkedOrgId?: string;
  linkedOrgName?: string;
  /**
   * How this identity was created. 'devotee_upgrade' means the same human
   * also has a devotee identity in an org context — the two coexist and the
   * user switches between them with the mode switcher (not two logins).
   */
  source: 'independent' | 'devotee_upgrade';
  createdAt: number;
  updatedAt: number;
}

/** Credential application. Reviewed by the platform admin. */
export type PurohitApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PurohitApplication {
  id: string;
  purohitId: string;
  uid: string;
  displayName: string;
  certificates: string[];
  gurukulAffiliation?: string;
  idProofType: string;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  city: string;
  phone: string;
  status: PurohitApplicationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: number;
  reviewedAt?: number;
}

/** Marketplace gig status machine (workflow-level escrow — see header note). */
export type GigStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DAKSHINA_RELEASED'
  | 'CANCELLED';

export const GIG_STATUS_META: Record<GigStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'amber' },
  ASSIGNED: { label: 'Assigned', color: 'blue' },
  IN_PROGRESS: { label: 'In Progress', color: 'indigo' },
  COMPLETED: { label: 'Completed — awaiting devotee confirmation', color: 'emerald' },
  DAKSHINA_RELEASED: { label: 'Dakshina Released', color: 'green' },
  CANCELLED: { label: 'Cancelled', color: 'slate' },
};

export interface RitualGig {
  id: string;
  ritualType: string;
  preferredDate: string;
  city: string;
  language: string;
  budgetMin: number;
  budgetMax: number;
  notes: string;
  devoteeUid: string;
  devoteeName: string;
  devoteePhone?: string;
  status: GigStatus;
  assignedPurohitId?: string;
  assignedPurohitUid?: string;
  assignedPurohitName?: string;
  dakshinaAgreed?: number;
  createdAt: number;
  updatedAt: number;
}

export interface GigReview {
  id: string;
  gigId: string;
  reviewerUid: string;
  reviewerKind: 'devotee' | 'purohit';
  reviewerName: string;
  rating: number;
  note: string;
  createdAt: number;
}

export interface PurohitEndorsement {
  id: string;
  orgId: string;
  orgName: string;
  orgType?: string;
  purohitId: string;
  endorserUid: string;
  endorserName?: string;
  text: string;
  ritualCount: number;
  createdAt: number;
}

export interface PurohitAvailability {
  purohitId: string;
  /** e.g. { 'mon-morning': true, 'mon-evening': false, ... } */
  slots: Record<string, boolean>;
  updatedAt: number;
}

export type PurohitInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface PurohitInvite {
  id: string;
  purohitId: string;
  purohitUid: string;
  purohitName: string;
  orgId: string;
  orgName: string;
  inviterUid: string;
  message?: string;
  status: PurohitInviteStatus;
  createdAt: number;
  respondedAt?: number;
}

const PUROHIT_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generates a Universal Purohit ID like PUR-7K2Q9M (no ambiguous chars). */
export function generatePurohitId(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += PUROHIT_ID_CHARS[Math.floor(Math.random() * PUROHIT_ID_CHARS.length)];
  }
  return `PUR-${suffix}`;
}

export function tierIndex(tier: PurohitVerificationTier): number {
  return PUROHIT_TIERS.indexOf(tier);
}

/**
 * Effective tier = stored tier, auto-advanced by public evidence.
 * PLATFORM_VERIFIED needs ORG_ENDORSED + (≥1 endorsement OR ≥10 gigs @ ≥4.5).
 * This mirrors what the client writes; rules enforce the ordered path.
 */
export function computeEffectiveTier(
  stored: PurohitVerificationTier,
  endorsementCount: number,
  completedGigs: number,
  ratingAggregate: number
): PurohitVerificationTier {
  let tier = stored;
  if (tier === 'CREDENTIAL_VERIFIED' && endorsementCount >= 1) {
    tier = 'ORG_ENDORSED';
  }
  if (
    tier === 'ORG_ENDORSED' &&
    (endorsementCount >= 1 || (completedGigs >= 10 && ratingAggregate >= 4.5))
  ) {
    tier = 'PLATFORM_VERIFIED';
  }
  return tier;
}

export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAY_PARTS = ['morning', 'afternoon', 'evening'] as const;
