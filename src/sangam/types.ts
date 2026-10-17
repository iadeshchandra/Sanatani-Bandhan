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

export type PostKind = 'text' | 'photo' | 'event' | 'seva' | 'shloka';

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
  targetType: 'post' | 'comment' | 'circle' | 'event';
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
