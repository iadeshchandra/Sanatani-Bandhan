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

/** Public organisation page (global collection `orgPages/{orgId}`).
 *
 * Pillar 3 — this doc is the PUBLIC PROJECTION of an org. Firestore rules
 * grant public read and trustee-only write gated by a server-side
 * `hasOnly([...])` field whitelist (see ORG_PUBLIC_FIELDS in
 * src/lib/orgPublic.ts). Fields not listed there can never be published —
 * treasury, members, bank details and pins live only on `workspaces/{id}`.
 */
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

  /* ---- Pillar 3: public profile fields (all optional, trustee-curated) ---- */
  /** Short motto shown under the name, e.g. "सर्वे भवन्तु सुखिनः". */
  tagline?: string;
  /** URL-safe public slug, e.g. "dakshineswar-kali-mandir". */
  publicSlug?: string;
  /** Street address (structured parts stay in city/state/country). */
  addressLine?: string;
  pincode?: string;
  phone?: string;
  website?: string;
  /** Darshan/aarti timings as written by the trustee. */
  darshanTimings?: { label: string; time: string }[];
  /**
   * Structured daily aarti schedule (trustee-published). Drives the
   * "Daily Aarti" section + gentle "remind me" subscriptions.
   * Shape: { name, time: "HH:MM", days?: 0-6 } (see src/darshan/types.ts).
   */
  aartiSchedules?: { name: string; time: string; days?: number[] }[];
  /** Public gallery image URLs (Storage `orgGallery/{orgId}/…`). */
  galleryUrls?: string[];
  /** Trustee-published upcoming events (max 10). */
  upcomingEvents?: { title: string; date: string; time?: string; description?: string; id?: string; sangamEventId?: string; recurrence?: import('../lib/eventRecurrence').RecurrenceRule }[];
  /**
   * When true, newly published org events are shared to Sangam immediately
   * (trustee opted in; default off — nothing automatic without consent).
   */
  autoShareEvents?: boolean;
  /** Trust registration number (public). */
  registrationNo?: string;
  eightyGRegistered?: boolean;
  eightyGURN?: string;
  twelveARegistered?: boolean;
  /** Live-aarti pin (Phase 3) — trustee pins; feed shows it only while org is live. */
  pinnedAarti?: {
    orgId: string;
    orgName: string;
    enabled: boolean;
    pinnedAt: number;
    pinnedBy: string;
  };
  /**
   * Linked YouTube channel ID (24 chars, starts with "UC") for live-darshan
   * detection. Validated by parseChannelInput (src/darshan/channel.ts).
   * When present, OrgPublicPage mounts the live poller.
   */
  youtubeChannelId?: string;
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
  /**
   * Blueprint B — role-template assignment attributes (research
   * §1d: attributes instead of new roles). All additive; legacy
   * edges carry none and behave exactly as before.
   * templateId: the lib/roleTemplates template this assignment came
   * from (null/absent = a direct canonical-role assignment).
   */
  templateId?: string | null;
  /** Desk scope: canonical catalog ids this member may open, on top
   *  of (intersected with) their role's visibility. null = unscoped. */
  deskScope?: string[] | null;
  /** When the STAFF role lapses (epoch ms). Expiry degrades the
   *  role to the Devotee floor — see lib/membershipAccess. */
  roleExpiresAt?: number | null;
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
  /** Blueprint B — template assignment carried onto the minted edge
   *  verbatim at accept (the rules check binds the edge ROLE to the
   *  invite role; these attributes ride along). */
  templateId?: string | null;
  deskScope?: string[] | null;
  /** The ROLE expiry the member receives (distinct from the invite's
   *  own expiresAt TTL below). */
  roleExpiresAt?: number | null;
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
 *
 * QUEUED #56 (audit A2-D1): every entry here MUST be a canonical role
 * the resolver accepts (see resolveEdgeRole / normalizeMembershipRole
 * in src/lib/landingSurface.ts). 'Manager' and 'Member' were offered
 * here but are NOT canonical roles — the per-org override rejected
 * them, so invitees silently fell back to their GLOBAL role (a normal
 * invitee was trapped in the Devotee view of the org; a staff member
 * of another org bled that role in). There is no canonical Manager
 * tier today (ROLE_MIGRATION_MAP collapses MANAGER → Sevadar); a real
 * Manager tier is a separate proposal needing a rules delta. Legacy
 * edges already stored with 'Manager'/'Member' are resolved
 * deterministically at read time (resolveEdgeRole), so existing
 * invitees are freed without a data migration.
 */
export const TRUSTEE_GRANTABLE_ROLES = [
  'Priest',
  'Accountant',
  'Sevadar',
  'Devotee',
  'CSO',
  // Blueprint B: 'Auditor' is canonical (landingSurface) and
  // trustee-grantable; its grant is maker–checker gated and the
  // rules grant matrix carries it too (see rules DELTA).
  'Auditor',
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
