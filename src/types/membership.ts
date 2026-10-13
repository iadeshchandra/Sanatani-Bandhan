/**
 * membership.ts — Organisation Membership System types (Membership sprint).
 * ==========================================================================
 * Two-way flow between organisations and people:
 *   org → user : invites  (orgInvites)
 *   user → org : join requests (joinRequests)
 * Result: a workspaceMembers record — the rules-enforced source of truth
 * for "who belongs to which organisation with what role".
 *
 * Org-type-agnostic by design: every label says "organisation", never
 * "temple". The product serves mandirs, sanghas, ashrams, gurukuls,
 * goshalas, trusts and more.
 */

/** Public organisation page (global collection `orgPages/{orgId}`). */
export interface OrgPage {
  orgId: string;
  name: string;
  /** WorkspaceType string, e.g. 'Mandir' | 'Sangha' | 'Ashram' | ... */
  type: string;
  city?: string;
  state?: string;
  country?: string;
  about?: string;
  logoUrl?: string;
  coverUrl?: string;
  /** Denormalized counts (updated on follow/join). */
  followerCount?: number;
  memberCount?: number;
  /** All real (non-demo) workspaces are platform-listed. */
  verified: boolean;
  updatedAt: number;
}

/** A follower edge: `followers/{orgId}/users/{uid}`. */
export interface OrgFollow {
  uid: string;
  displayName?: string;
  followedAt: number;
}

/** Membership record — `workspaceMembers/{workspaceId}_{uid}`. */
export interface WorkspaceMembership {
  /** Deterministic: `${workspaceId}_${uid}` — one record per person per org. */
  id: string;
  workspaceId: string;
  uid: string;
  role: string;
  displayName?: string;
  email?: string;
  phone?: string;
  joinedAt: number;
  joinedVia: 'invite' | 'request' | 'creator' | 'import';
  viaInviteId?: string;
  viaRequestId?: string;
  invitedByUid?: string;
}

/** Join request — `joinRequests/{orgId}_{userUid}` (deterministic: one pending per user per org). */
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface JoinRequest {
  id: string;
  orgId: string;
  orgName: string;
  orgType: string;
  userUid: string;
  userName: string;
  userPhoto?: string;
  message: string;
  status: JoinRequestStatus;
  createdAt: number;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: number;
}

/** Org invite — `orgInvites/{inviteId}` (random id). */
export type OrgInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export interface OrgInvite {
  id: string;
  orgId: string;
  orgName: string;
  orgType: string;
  /** At least one of invitedUid / invitedEmail / invitedPhone is set. */
  invitedUid?: string;
  invitedEmail?: string;
  invitedPhone?: string;
  invitedName?: string;
  /** Role the invitee receives on accept. Never above the inviter's own. */
  role: string;
  message?: string;
  status: OrgInviteStatus;
  invitedByUid: string;
  invitedByName: string;
  createdAt: number;
  expiresAt: number;
  decidedAt?: number;
}

/**
 * Roles an inviter may grant. A Trustee may grant any operational role
 * AT or BELOW their own — never Trustee, never SuperAdmin. Only a
 * SuperAdmin (platform owner) may grant Trustee/SuperAdmin.
 */
export const TRUSTEE_GRANTABLE_ROLES = [
  'Priest',
  'Accountant',
  'Sevadar',
  'Devotee',
  'Member',
  'CSO',
  'Manager',
] as const;

export const SUPERADMIN_GRANTABLE_ROLES = [
  ...TRUSTEE_GRANTABLE_ROLES,
  'Trustee',
  'SuperAdmin',
] as const;

/** Friendly org-type labels for chips and filters (org-type-agnostic). */
export const ORG_TYPE_LABELS: Record<string, string> = {
  Mandir: 'Mandir',
  Ashram: 'Ashram',
  Goshala: 'Goshala',
  Gurukul: 'Gurukul',
  Sangha: 'Sangha',
  Samaj: 'Samaj',
  Trust: 'Trust',
  DharmadaTrust: 'Dharmada Trust',
  PurohitSabha: 'Purohit Sabha',
  MahotsavSamiti: 'Mahotsav Samiti',
  Satsang: 'Satsang',
  Yoga: 'Yoga Centre',
  Tirth: 'Tirth Kshetra',
  AkshayaPatra: 'Annakshetra',
};

export const orgTypeLabel = (t?: string): string =>
  (t && ORG_TYPE_LABELS[t]) || t || 'Organisation';
