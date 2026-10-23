/**
 * Jyotish One — independent jyotishi identity, verification & consultation
 * marketplace types.
 * ============================================================================
 * A jyotishi is a PERSON, not an employee of any organisation — the exact
 * mirror of Purohit One's architecture. Anyone can register, get verified
 * through the same transparent 4-tier pipeline, and receive consultations
 * directly from devotees — seeing zero organisation data.
 *
 * TRUST MODEL ($0 constraint, documented honestly — same as Purohit One):
 * - Ratings may only be created for consultations the reviewer is party to
 *   (devotee who posted, or jyotishi assigned). Enforced in Firestore rules
 *   via deterministic review doc IDs + in the UI.
 * - Endorsements may only be created by Trustees of real organisations.
 * - Tier auto-advancement (ORG_ENDORSED / PLATFORM_VERIFIED) is performed
 *   client-side along a strictly ordered path; the endorsement /
 *   consultation / review records are the public audit trail.
 *   Server-authoritative advancement would need Cloud Functions (out of the
 *   $0 envelope) — noted as a follow-up.
 * - Real-money escrow is NOT implemented: DAKSHINA_RELEASED is an honest
 *   workflow state (devotee confirms receipt of the consultation). Actual
 *   fund custody needs a licensed payment partner.
 * - Call/video sessions are scheduled session links the parties arrange —
 *   no telephony is built ($0). Labelled honestly in the UI.
 */

import {
  PurohitVerificationTier,
  PUROHIT_TIERS,
  PUROHIT_TIER_META,
  tierIndex,
  computeEffectiveTier,
} from './purohit';

/** Four-tier verification pipeline — SHARED with Purohit One (org-neutral). */
export type JyotishVerificationTier = PurohitVerificationTier;
export const JYOTISH_TIERS = PUROHIT_TIERS;
export const JYOTISH_TIER_META = PUROHIT_TIER_META;
export { tierIndex, computeEffectiveTier };

/** Consultation types offered in the marketplace. */
export const CONSULTATION_TYPES = [
  'Kundli Vishleshan',
  'Muhurat Nirnaya',
  'Prashna Shastra',
  'Kundli Milan',
] as const;
export type ConsultationType = (typeof CONSULTATION_TYPES)[number];

export const CONSULTATION_TYPE_META: Record<
  ConsultationType,
  { label: string; labelHi: string; description: string; icon: string }
> = {
  'Kundli Vishleshan': {
    label: 'Kundli Vishleshan',
    labelHi: 'कुंडली विश्लेषण',
    description: 'Birth-chart reading — dashas, yogas, strengths and remedies.',
    icon: '🪐',
  },
  'Muhurat Nirnaya': {
    label: 'Muhurat Nirnaya',
    labelHi: 'मुहूर्त निर्णय',
    description: 'Auspicious timing for vivah, grihapravesh, yatra and ventures.',
    icon: '🕰️',
  },
  'Prashna Shastra': {
    label: 'Prashna Shastra',
    labelHi: 'प्रश्न शास्त्र',
    description: 'Horary astrology — answers from the chart of the question moment.',
    icon: '❓',
  },
  'Kundli Milan': {
    label: 'Kundli Milan',
    labelHi: 'कुंडली मिलान',
    description: 'Compatibility analysis for vivah — guna milan with honest caveats.',
    icon: '💞',
  },
};

export const JYOTISH_SPECIALIZATIONS = [
  'Vedic Jyotish',
  'Prashna Shastra',
  'Muhurat',
  'Kundli Milan',
  'Palmistry (Samudrika)',
  'Numerology',
  'Nadi Astrology',
  'Lal Kitab',
] as const;

/** Org-independent jyotishi identity. Lives in the GLOBAL `jyotishProfiles`. */
export interface JyotishIdentity {
  /** Universal Jyotish ID, e.g. JYO-7K2Q9M */
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
  parampara?: string;
  experienceYears: number;
  bio?: string;
  /** Consultation fee range (dakshina), informational only — no real payments. */
  feeRangeMin?: number;
  feeRangeMax?: number;
  verificationTier: JyotishVerificationTier;
  ratingAggregate: number;
  ratingCount: number;
  /** SECURITY P1 anchors: rules require these to name the review /
   *  consultation that legally moved the counters beside them. */
  lastReviewId?: string;
  completedConsultations: number;
  lastCompletedConsultationId?: string;
  /** Dual identity: linked org record, if accepted as temple staff. */
  linkedOrgId?: string;
  linkedOrgName?: string;
  /**
   * How this identity was created. 'devotee_upgrade' means the same human
   * also has a devotee/solo identity — the two coexist and the user switches
   * between them with the mode switcher (not two logins).
   */
  source: 'independent' | 'devotee_upgrade';
  createdAt: number;
  updatedAt: number;
}

/** Credential application. Reviewed by the platform admin. */
export type JyotishApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JyotishApplication {
  id: string;
  jyotishId: string;
  uid: string;
  displayName: string;
  certificates: string[];
  parampara?: string;
  guruName?: string;
  idProofType: string;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  city: string;
  phone: string;
  status: JyotishApplicationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  createdAt: number;
  reviewedAt?: number;
}

/** Consultation status machine (workflow-level escrow — see header note). */
export type ConsultationStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DAKSHINA_RELEASED'
  | 'CANCELLED';

export const CONSULTATION_STATUS_META: Record<ConsultationStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'amber' },
  ASSIGNED: { label: 'Assigned', color: 'blue' },
  IN_PROGRESS: { label: 'In Progress', color: 'indigo' },
  COMPLETED: { label: 'Completed — awaiting devotee confirmation', color: 'emerald' },
  DAKSHINA_RELEASED: { label: 'Dakshina Released', color: 'green' },
  CANCELLED: { label: 'Cancelled', color: 'slate' },
};

/**
 * Seva Pro Phase 4 — attribution pinned on a consultation at creation when
 * the booking came from a purohit's referral. Immutable afterwards
 * (see firestore.rules: consultationImmutableOk). Rules anchor it to a real
 * jyotishReferrals doc.
 */
export interface ConsultationReferralAttribution {
  direction: 'purohit-to-jyotish';
  referrerUid: string;
  referrerName: string;
  referrerRoleId: string;
  gigId?: string;
  referralId: string;
  reason: string;
  createdAt: number;
}

export interface Consultation {
  id: string;
  consultationType: ConsultationType;  /** Birth details for chart work (optional for Prashna). */
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  /** For Kundli Milan — partner details. */
  partnerBirthDate?: string;
  partnerBirthTime?: string;
  partnerBirthPlace?: string;
  preferredDate: string;
  /** 'chat' | 'call' | 'video' — call/video are scheduled session links ($0). */
  mode: 'chat' | 'call' | 'video';
  sessionLink?: string;
  city: string;
  language: string;
  budgetMin: number;
  budgetMax: number;
  notes: string;
  devoteeUid: string;
  devoteeName: string;
  devoteePhone?: string;
  status: ConsultationStatus;
  assignedJyotishId?: string;
  assignedJyotishUid?: string;
  assignedJyotishName?: string;
  dakshinaAgreed?: number;
  /** Seva Pro Phase 4: pinned at creation, immutable after (rules). */
  referredBy?: ConsultationReferralAttribution;
  createdAt: number;
  updatedAt: number;
}

export interface ConsultationReview {  id: string;
  consultationId: string;
  reviewerUid: string;
  reviewerKind: 'devotee' | 'jyotish';
  reviewerName: string;
  rating: number;
  note: string;
  createdAt: number;
}

export interface JyotishEndorsement {
  id: string;
  orgId: string;
  orgName: string;
  orgType?: string;
  jyotishId: string;
  endorserUid: string;
  endorserName?: string;
  text: string;
  consultationCount: number;
  createdAt: number;
}

export interface JyotishAvailability {
  jyotishId: string;
  /** e.g. { 'mon-morning': true, 'mon-evening': false, ... } */
  slots: Record<string, boolean>;
  updatedAt: number;
}

export type JyotishInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface JyotishInvite {
  id: string;
  jyotishId: string;
  jyotishUid: string;
  jyotishName: string;
  orgId: string;
  orgName: string;
  inviterUid: string;
  message?: string;
  status: JyotishInviteStatus;
  createdAt: number;
  respondedAt?: number;
}

/** In-app chat message inside a consultation (subcollection). */
export interface ConsultationMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderKind: 'devotee' | 'jyotish';
  text: string;
  createdAt: number;
}

/**
 * Cross-referral: a jyotishi recommends a verified purohit for remedies
 * (upaya/parihara), or a purohit recommends a verified jyotishi.
 * Stored in `jyotishReferrals`; visible to both parties.
 */
export interface RemedyReferral {
  id: string;
  consultationId?: string;
  fromUid: string;
  fromName: string;
  fromKind: 'jyotish' | 'purohit';
  fromRoleId: string;
  toRoleId: string;
  toName: string;
  toKind: 'jyotish' | 'purohit';
  toTier: JyotishVerificationTier;
  reason: string;
  createdAt: number;
}

const JYOTISH_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Generates a Universal Jyotish ID like JYO-7K2Q9M (no ambiguous chars). */
export function generateJyotishId(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += JYOTISH_ID_CHARS[Math.floor(Math.random() * JYOTISH_ID_CHARS.length)];
  }
  return `JYO-${suffix}`;
}
