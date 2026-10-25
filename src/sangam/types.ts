/* Sangam — the Sanatani social layer. Type definitions.
 * =====================================================================
 * The MOAT: the ERP is the wedge into institutions, Sangam is what brings
 * every devotee back daily. Familiar social patterns, original Sanatani
 * branding — never a clone.
 *
 * Trust model: every actor is identity-anchored. Posts carry the author's
 * SAN id and (for purohit/jyotish) their verification tier, which Firestore
 * rules validate against the canonical profile — badges are never
 * client-forgivable. Organisation page posts require a trustee role edge.
 *
 * Language: Ashirvad (not "like"), Seva, Satsang. Counts are honest.
 * No ads, no data selling — stated plainly in the product.
 */

export type PostKind = 'text' | 'photo' | 'event' | 'seva' | 'shloka' | 'service_card'
  | 'consultation_answer' | 'gratitude' | 'festival_moment';

export type AuthorKind = 'devotee' | 'purohit' | 'jyotish' | 'org';

export type VerificationTier =
  | 'REGISTERED'
  | 'CREDENTIAL_VERIFIED'
  | 'ORG_ENDORSED'
  | 'PLATFORM_VERIFIED';

export interface SharedAttribution {
  postId: string;
  authorName: string;
  authorSanId: string;
}

export interface SevaDetails {
  slots: number;
  slotsTaken: number;
  hoursEach: number;
  venue: string;
  date: string; // ISO date
  contactNote?: string;
}

/* Seva Bazar Phase 1 — the service_card.
 * =====================================================================
 * A service_card is a SEVA NOTICE, not an ad. The provider shares it from
 * their Purohit/Jyotish desk; it appears in the community feed at ≤15%
 * density with zero paid placement, ever.
 *
 * Anatomy (per Seva Bazar structure §4):
 * - devotionalText: REQUIRED ≥30 chars — the human before the offer.
 * - 4:5 photo, provider name 17pt, lineage 13pt + ✓ Verified Sevak badge.
 * - ONE editorial service line (e.g. "Rudrabhishek at your home, with full samagri").
 * - Trust row: tier badge, years, blessings received.
 * - Assurance: "🛡 Dakshina Suraksha · pay after seva".
 * - Dakshina in neutral ink (never bold red, never a "deal").
 * - ONE CTA: "🙏 Ask Panditji" → provider chat thread.
 * - Cheap-signal ban (enforced in composer): no strikethroughs, no
 *   countdowns, no scarcity ("only 2 left!"), no caps, no "discount".
 */
export type ServiceCardMode = 'home' | 'temple' | 'video';

export interface ServiceCardDetails {
  /** Devotional text — the human before the offer. REQUIRED, ≥30 chars. */
  devotionalText: string;
  /** Editorial service line, e.g. "Rudrabhishek at your home, with full samagri". ONE line. */
  serviceLine: string;
  /** Suggested dakshina (neutral ink, never a "deal"). */
  dakshina: number;
  currency: 'INR' | 'BDT' | 'USD';
  /** What's included, e.g. "includes samagri, prasad for 4". */
  includes?: string;
  /** How the seva is delivered. */
  modes: ServiceCardMode[];
  /** Tithi/muhurat availability, e.g. "Available on Ekadashi & weekends". */
  availability?: string;
  /** Provider's display name (denormalized at post time). */
  providerName: string;
  /** Provider's lineage, e.g. "Kashi Shaiva parampara". */
  lineage?: string;
  /** Provider's verification tier at post time (display-only; rules validate). */
  providerTier: 'REGISTERED' | 'VERIFIED' | 'TRUSTED';
  /** Provider's role id (PUR-XXXXXX / JYO-XXXXXX). */
  providerRoleId?: string;
  /** Provider's uid — the Ask CTA opens a chat thread with this user. */
  providerUid: string;
  /** Trust signals (denormalized at post time). */
  yearsOfSeva?: number;
  blessingsReceived?: number;
  trustScore?: number;
  /** Photo: https:// URL or vault:// File Vault reference. */
  photoUrl?: string;
  /** YouTube video ID for the provider's intro demo (Phase 3). */
  demoVideoId?: string;
}

export interface SangamPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorSanId: string; // SAN-XXXXXX — every actor identity-anchored
  authorKind: AuthorKind;
  /** PUR-XXXXXX / JYO-XXXXXX when authorKind is purohit/jyotish. */
  authorRoleId?: string;
  /** Display-only tier; rules validate against the canonical profile. */
  authorTier?: VerificationTier;
  /** Set when posted as an Organisation Page (trustee-gated). */
  orgId?: string;
  orgName?: string;
  isOfficialPagePost: boolean;
  kind: PostKind;
  text: string;
  imageUrl?: string; // photo posts: https:// URL or vault:// File Vault reference (public tier)
  shlokaRef?: string; // shloka posts: source reference e.g. "Bhagavad Gita 2.47"
  seva?: SevaDetails; // seva posts: opportunity details
  serviceCard?: ServiceCardDetails; // service_card posts: Seva Bazar notice
  eventRef?: string; // event posts: link to a sangamEvents doc
  sharedFrom?: SharedAttribution; // shares always carry attribution
  createdAt: number;
  updatedAt?: number;
  ashirvadCount: number;
  commentCount: number;
  shareCount: number;
  /** uids that gave Ashirvad (local/demo + subcollection in cloud). */
  ashirvadBy?: string[];
  /** volunteer uids for seva posts (local/demo + subcollection in cloud). */
  volunteers?: string[];
  visibility: 'public';
  status: 'active' | 'reported' | 'removed';
  /** true when this copy lives only on this device (offline/demo). */
  localOnly?: boolean;
  /** gratitude posts: the provider being thanked (uid). */
  providerUid?: string;
  /** gratitude posts: provider's display name (denormalized). */
  providerName?: string;
  /** festival_moment posts: festival id from Panjika (e.g. 'diwali'). */
  festival?: string;
  /** consultation_answer posts: always true — devotee identity never stored. */
  anonymized?: boolean;
}

export interface SangamComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorSanId: string;
  authorKind: AuthorKind;
  authorTier?: VerificationTier;
  text: string;
  createdAt: number;
  /** Set by an author edit (QUEUED #12); drives the "edited" marker. */
  updatedAt?: number;
  localOnly?: boolean;
}

export interface SangamCircle {
  id: string;
  name: string;
  /** e.g. 'bhajan' | 'shastra' | 'seva' | 'sadhana' | 'yatra' */
  topic: string;
  description: string;
  creatorUid: string;
  creatorName: string;
  memberCount: number;
  members?: string[];
  createdAt: number;
  localOnly?: boolean;
}

/**
 * EVENTS P1 — a member's RSVP state on a Sangam event.
 * 'going' is the only state counted in rsvpCount (the anchored ±1);
 * 'interested' and 'waitlisted' live on the member's own rsvps/{uid}
 * record without moving the count. Absent record = no RSVP.
 */
export type SangamRsvpState = 'going' | 'interested' | 'waitlisted';

export interface SangamEvent {
  id: string;
  title: string;
  kind: 'utsav' | 'katha' | 'yatra' | 'satsang' | 'seva' | 'other';
  description: string;
  venue: string;
  startsAt: number;
  endsAt?: number;
  orgId?: string;
  orgName?: string;
  isOfficial: boolean; // trustee-posted org events are badged official
  creatorUid: string;
  creatorName: string;
  rsvpCount: number;
  rsvps?: string[];
  createdAt: number;
  localOnly?: boolean;
  /**
   * EVENTS P1 — hall capacity (people). Absent/0 = no limit. When the
   * going count reaches it, new RSVPs join the waitlist in order and
   * are promoted (by their own claim) as places free.
   */
  capacity?: number;
  /**
   * EVENTS P1 — recurrence rule (lib/eventRecurrence); `startsAt` is
   * the first occurrence. Surfaces expand occurrences from the rule;
   * an RSVP belongs to the series (the member joins the satsang, not
   * one date of it).
   */
  recurrence?: import('../lib/eventRecurrence').RecurrenceRule;
}

export interface SangamFollow {
  id: string; // {followerUid}_{targetType}_{targetId}
  followerUid: string;
  targetType: 'org' | 'purohit' | 'jyotish';
  targetId: string;
  targetName: string;
  createdAt: number;
}

export interface SangamReport {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetType: 'post' | 'comment' | 'circle' | 'event' | 'short' | 'video' | 'story' | 'user';
  targetId: string;
  reason: 'spam' | 'impersonation' | 'inappropriate' | 'misinformation' | 'other';
  details?: string;
  status: 'open' | 'reviewed' | 'actioned';
  createdAt: number;
}

export interface OrgPageLite {
  orgId: string;
  orgName: string;
  type: string;
  city?: string;
  about?: string;
  followerCount: number;
}

/** Seed/demo authors are clearly labeled — never impersonating real people. */
export const DEMO_AUTHOR_SUFFIX = '(community preview)';
