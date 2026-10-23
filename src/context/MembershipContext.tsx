/**
 * MembershipContext — Organisation Membership System data layer.
 * ==========================================================================
 * Two-way flow:
 *   org → user : invites  (`orgInvites`)
 *   user → org : join requests (`joinRequests`)
 * Result: `workspaceMembers/{workspaceId}_{uid}` — the rules-enforced
 * source of truth for who belongs to which organisation with what role.
 *
 * Post-membership, joinWorkspace() puts the organisation in the user's
 * switcher immediately (no re-login): it writes the membership edge, pulls
 * the workspace config into the local registry via addWorkspace(), and
 * switches — switchWorkspace() now also honours workspaceMembers records.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from './AuthWorkspaceContext';
import { useToast } from './ToastContext';
import { WorkspaceConfig } from '../types';
import {
  JoinRequest,
  JoinRequestStatus,
  OrgFollow,
  OrgInvite,
  OrgPage,
  TRUSTEE_GRANTABLE_ROLES,
  WorkspaceMembership,
} from '../types/membership';
import { resolveEdgeRole, membershipsLoadedAfterFetch } from '../lib/landingSurface';
import { normalizeMembershipDoc } from '../lib/timestamps';
import { auditRecorder } from './data/auditStore';
import { resolveActorName } from '../bahikhata/bahikhataStore';
import { grantNeedsApproval, type RoleAssignment } from '../lib/roleTemplates';
import {
  guardAccessChange,
  guardMemberRemoval,
} from '../lib/membershipAccess';
import { APPROVAL_REQUIRED, type RoleGrantPayload } from '../lib/approvals';
import { approvalService } from './data/approvalsStore';

const now = () => Date.now();
const memberDocId = (workspaceId: string, uid: string) => `${workspaceId}_${uid}`;
const joinRequestId = (orgId: string, uid: string) => `${orgId}_${uid}`;
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Syncs the public organisation page from a workspace config.
 * Called on workspace create/update (trustee-gated by rules) and lazily
 * from the directory/page views. Idempotent — safe to call repeatedly.
 *
 * Pillar 3 — PUBLIC/PRIVATE BOUNDARY: this is the ONLY path that copies
 * data from the private `workspaces/{id}` doc to the public `orgPages/{id}`
 * projection. Only the whitelisted public fields below are copied; treasury,
 * member lists, bank details, pins and admin fields are NEVER synced.
 * (Trustee-published `upcomingEvents` are written to orgPages directly and
 * preserved via merge.)
 */
export async function syncOrgPage(ws: WorkspaceConfig): Promise<void> {
  if (!ws?.id || ws.id.startsWith('DEMO_')) return; // demo sandboxes stay private
  try {
    await setDoc(
      doc(db, 'orgPages', ws.id),
      {
        orgId: ws.id,
        name: ws.name || 'Unnamed Organisation',
        type: (ws as any).type || 'Organisation',
        city: ws.city || '',
        state: ws.state || '',
        country: ws.country || '',
        about: (ws as any).tagline || (ws as any).description || '',
        tagline: (ws as any).tagline || '',
        publicSlug: (ws as any).publicSlug || '',
        logoUrl: (ws as any).logoUrl || '',
        coverUrl: (ws as any).coverUrl || '',
        addressLine: ws.address || '',
        pincode: (ws as any).pincode || '',
        phone: ws.phone || '',
        website: (ws as any).website || '',
        darshanTimings: (ws as any).darshanTimings || [],
        galleryUrls: (ws as any).galleryUrls || [],
        registrationNo: (ws as any).trustRegNumber || '',
        eightyGRegistered: !!(ws as any).trust80GRegistered,
        eightyGURN: (ws as any).trust80GURN || '',
        twelveARegistered: !!(ws as any).trust12ARegistered,
        // SECURITY P1 (Finding 3): NO `verified` here — this projection
        // used to stamp verified:true on EVERY org, so the directory's
        // verified badge meant nothing and any trustee could claim it.
        // Verification is granted only by the platform owner (GodMode /
        // console, SuperAdmin rules branch); merge keeps a granted
        // value untouched, and the rules pin trustees out of changing it.
        updatedAt: now(),
      },
      { merge: true }
    );
  } catch (e) {
    // Non-fatal: page sync is best-effort (e.g. non-trustee viewing).
    console.warn('[Membership] syncOrgPage failed (non-fatal):', e);
  }
}

interface MembershipContextType {
  // --- org pages / directory ---
  getOrgPage: (orgId: string) => Promise<OrgPage | null>;
  browseOrgPages: (filters?: { q?: string; type?: string }) => Promise<OrgPage[]>;
  ensureOrgPage: (ws: WorkspaceConfig) => Promise<void>;

  // --- follows ---
  isFollowing: (orgId: string) => boolean;
  toggleFollow: (page: OrgPage) => Promise<void>;
  followerCount: (orgId: string) => Promise<number>;

  // --- join requests (user → org) ---
  requestToJoin: (page: OrgPage, message?: string) => Promise<void>;
  myJoinRequests: JoinRequest[];
  orgJoinRequests: JoinRequest[];
  decideJoinRequest: (req: JoinRequest, approve: boolean) => Promise<void>;

  // --- invites (org → user) ---
  sendInvite: (input: {
    email?: string;
    phone?: string;
    uid?: string;
    name?: string;
    role: string;
    message?: string;
    /** Blueprint B — resolved template assignment (roleTemplates),
     *  carried onto the invite and the minted edge verbatim. */
    templateId?: string | null;
    deskScope?: string[] | null;
    roleExpiresAt?: number | null;
    /** Set ONLY by the maker–checker applier after a recorded
     *  checker decision. A gated role (> Sevadar) without it throws
     *  an APPROVAL_REQUIRED error. */
    viaApproval?: boolean;
  }) => Promise<void>;
  /**
   * Blueprint B — file a maker–checker 'role.grant' request for a
   * gated grant (invite or membership edit). The change applies
   * only when a DIFFERENT Trustee/SuperAdmin approves it from the
   * Approvals panel.
   */
  requestRoleGrant: (input: {
    mode: 'invite' | 'membership';
    invite?: {
      email?: string;
      phone?: string;
      uid?: string;
      name?: string;
      message?: string;
    };
    membershipId?: string;
    targetUid?: string;
    targetName: string;
    assignment: RoleAssignment;
  }) => Promise<void>;
  /**
   * Blueprint B — edit an existing member's role / template / desk
   * scope / expiry (Trustee). Gated target roles throw
   * APPROVAL_REQUIRED unless viaApproval; continuity guards
   * (creator, last Trustee) always apply.
   */
  updateMembershipAccess: (
    m: WorkspaceMembership,
    changes: {
      role?: string;
      templateId?: string | null;
      deskScope?: string[] | null;
      roleExpiresAt?: number | null;
    },
    opts?: { viaApproval?: boolean }
  ) => Promise<void>;
  myInvites: OrgInvite[];
  orgInvites: OrgInvite[];
  respondToInvite: (invite: OrgInvite, accept: boolean) => Promise<void>;

  // --- memberships ---
  myMemberships: WorkspaceMembership[];
  /**
   * QUEUED #55 + U7: true once a workspaceMembers fetch for the
   * CURRENT user has SUCCEEDED. A failed fetch never raises this flag
   * (membershipsLoadedAfterFetch) — until then an empty myMemberships
   * means "still loading", not "no memberships" — the org landing law
   * (lib/landingSurface) holds on this signal instead of guessing a
   * role from the global fallback. Retries fire on org entry and on
   * reconnect, so a transient failure heals within the session.
   */
  membershipsLoaded: boolean;
  orgMembers: WorkspaceMembership[];
  removeMember: (m: WorkspaceMembership) => Promise<void>;
  /** Full post-membership handoff: edge → switcher → switch. No re-login. */
  joinWorkspace: (orgId: string) => Promise<boolean>;
  refreshMemberships: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);
export const useMembership = (): MembershipContextType => {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error('useMembership must be used inside MembershipProvider');
  return ctx;
};

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, activeWorkspace, currentRole, effectiveRole, addWorkspace, switchWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = firebaseUser?.uid || null;
  const userEmail = (firebaseUser?.email || '').toLowerCase();

  const [myMemberships, setMyMemberships] = useState<WorkspaceMembership[]>([]);
  const [membershipsLoaded, setMembershipsLoaded] = useState<boolean>(false);
  const membershipsLoadedForUidRef = useRef<string | null | undefined>(undefined);
  // Ref mirror of the loaded flag — the fetch-settle law
  // (membershipsLoadedAfterFetch) and the reconnect retry read the
  // CURRENT value without re-subscribing on every state change.
  const membershipsLoadedRef = useRef<boolean>(false);
  const [myJoinRequests, setMyJoinRequests] = useState<JoinRequest[]>([]);
  const [orgJoinRequests, setOrgJoinRequests] = useState<JoinRequest[]>([]);
  const [myInvites, setMyInvites] = useState<OrgInvite[]>([]);
  const [orgInvites, setOrgInvites] = useState<OrgInvite[]>([]);
  const [orgMembers, setOrgMembers] = useState<WorkspaceMembership[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);

  // ---------------------------------------------------------------
  // Blueprint A/B — membership changes are audit-stream events.
  // The recorder is fail-open and actor-bound (rules require
  // actorUid == auth.uid, so the FIREBASE uid leads — the same law
  // as DataContext's auditActor). Membership events were deferred
  // from Blueprint A to here because B restructures these paths.
  // ---------------------------------------------------------------
  const auditActor = useCallback(
    () => ({
      actorUid: uid || '',
      actorName: resolveActorName(
        [firebaseUser?.displayName],
        firebaseUser?.email || ''
      ),
      actorRole: (effectiveRole as string) || (currentRole as string) || '',
    }),
    [uid, firebaseUser, effectiveRole, currentRole]
  );

  /** ApprovalActor shape for the maker–checker service. */
  const approvalActor = useCallback(
    () => ({
      uid: uid || '',
      name: resolveActorName(
        [firebaseUser?.displayName],
        firebaseUser?.email || ''
      ),
      role: ((effectiveRole as string) || (currentRole as string) || '') as string,
    }),
    [uid, firebaseUser, effectiveRole, currentRole]
  );

  const noteMembershipAudit = useCallback(
    (input: {
      workspaceId: string;
      action: string;
      entityId: string;
      entityLabel?: string;
      summaryKey: string;
      summaryParams?: Record<string, string | number>;
    }) => {
      auditRecorder.record({
        workspaceId: input.workspaceId,
        ...auditActor(),
        action: input.action,
        entityType: 'membership',
        entityId: input.entityId,
        ...(input.entityLabel ? { entityLabel: input.entityLabel } : {}),
        summaryKey: input.summaryKey,
        ...(input.summaryParams ? { summaryParams: input.summaryParams } : {}),
      });
    },
    [auditActor]
  );

  // ---- org pages ---------------------------------------------------------
  const getOrgPage = useCallback(async (orgId: string): Promise<OrgPage | null> => {
    try {
      const snap = await getDoc(doc(db, 'orgPages', orgId));
      return snap.exists() ? ({ ...(snap.data() as any) } as OrgPage) : null;
    } catch {
      return null;
    }
  }, []);

  const browseOrgPages = useCallback(async (filters?: { q?: string; type?: string }) => {
    try {
      const snap = await getDocs(query(collection(db, 'orgPages'), orderBy('updatedAt', 'desc'), limit(200)));
      let list = snap.docs.map((d) => ({ ...(d.data() as any) } as OrgPage));
      if (filters?.type) list = list.filter((p) => p.type === filters.type);
      if (filters?.q) {
        const q = filters.q.toLowerCase();
        list = list.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q) ||
            p.about?.toLowerCase().includes(q)
        );
      }
      return list;
    } catch {
      return [];
    }
  }, []);

  const ensureOrgPage = useCallback(async (ws: WorkspaceConfig) => {
    await syncOrgPage(ws);
  }, []);

  // ---- follows ------------------------------------------------------------
  useEffect(() => {
    if (!uid) {
      setFollowingIds(new Set());
      return;
    }
    // Follows are per-org subcollections; keep a light local cache of the
    // orgs this user follows by probing membership-adjacent state is overkill
    // — instead we check on demand. Here we just reset on uid change.
    setFollowingIds(new Set());
  }, [uid]);

  const isFollowing = useCallback((orgId: string) => followingIds.has(orgId), [followingIds]);

  const toggleFollow = useCallback(
    async (page: OrgPage) => {
      if (!uid) throw new Error('Sign in to follow organisations.');
      const ref = doc(db, 'followers', page.orgId, 'users', uid);
      try {
        if (followingIds.has(page.orgId)) {
          await deleteDoc(ref);
          setFollowingIds((s) => {
            const n = new Set(s);
            n.delete(page.orgId);
            return n;
          });
          showToast(`Unfollowed ${page.name}`, 'info');
        } else {
          await setDoc(ref, {
            uid,
            displayName: firebaseUser?.displayName || '',
            followedAt: now(),
          } as OrgFollow);
          setFollowingIds((s) => new Set(s).add(page.orgId));
          showToast(`Following ${page.name} — their announcements will appear in your feed.`, 'success');
        }
      } catch (e: any) {
        showToast(e?.message || 'Could not update follow. Try again.', 'error');
        throw e;
      }
    },
    [uid, firebaseUser, followingIds, showToast]
  );

  const followerCount = useCallback(async (orgId: string): Promise<number> => {
    try {
      const snap = await getCountFromServer(collection(db, 'followers', orgId, 'users'));
      return snap.data().count;
    } catch {
      return 0;
    }
  }, []);

  // ---- memberships ----------------------------------------------------------
  const refreshMemberships = useCallback(async () => {
    // QUEUED #55: a new user invalidates the previous user's list AND
    // its loaded flag together — a stale edge must never speak for the
    // next account on a shared device. Same-user refreshes (post-join)
    // keep the flag up; only the fetch result replaces the list.
    if (membershipsLoadedForUidRef.current !== uid) {
      membershipsLoadedForUidRef.current = uid;
      membershipsLoadedRef.current = false;
      setMembershipsLoaded(false);
      setMyMemberships([]);
    }
    if (!uid) {
      setMyMemberships([]);
      membershipsLoadedRef.current = true;
      setMembershipsLoaded(true);
      return;
    }
    let fetchOk = false;
    try {
      const snap = await getDocs(query(collection(db, 'workspaceMembers'), where('uid', '==', uid)));
      // U1: normalize at the reader — creator edges store joinedAt as
      // a Firestore serverTimestamp; the raw spread let a Timestamp
      // object pose as the declared `number` and the directory card
      // printed the literal string "Invalid Date".
      setMyMemberships(snap.docs.map((d) => normalizeMembershipDoc(d.data())));
      fetchOk = true;
    } catch {
      // U7: a FAILED fetch is not an empty list. Keep whatever list we
      // already hold, and — via membershipsLoadedAfterFetch — never
      // let the failure pose as "loaded": landing holds at 'pending'
      // and the fetch is retried on org entry and on reconnect.
    }
    const nextLoaded = membershipsLoadedAfterFetch(membershipsLoadedRef.current, fetchOk);
    membershipsLoadedRef.current = nextLoaded;
    setMembershipsLoaded(nextLoaded);
  }, [uid]);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  // U7: reconnect is a retry point — a membership fetch that failed
  // on a dead connection heals itself the moment the network returns,
  // instead of trapping the session in the fallback landing.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      void refreshMemberships();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshMemberships]);

  // Org-side: live member roster for the active workspace (trustees).
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId || wsId.startsWith('DEMO_') || !isTrusteeLike) {
      setOrgMembers([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'workspaceMembers'), where('workspaceId', '==', wsId)),
      // U1: same reader normalization as refreshMemberships — one
      // coercion point for every workspaceMembers read.
      (snap) => setOrgMembers(snap.docs.map((d) => normalizeMembershipDoc(d.data()))),
      () => setOrgMembers([])
    );
    return () => unsub();
  }, [activeWorkspace?.id, isTrusteeLike]);

  const removeMember = useCallback(
    async (m: WorkspaceMembership) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can remove members.');
      if (m.uid === uid) throw new Error('You cannot remove yourself.');
      // Blueprint B continuity law: the creator's edge is the
      // provisioning record, and the last active Trustee can never
      // be removed — the workspace must keep a recovery path.
      const guard = guardMemberRemoval(orgMembers, m.uid, now(), {
        creatorUid: (activeWorkspace as { createdBy?: string } | null)?.createdBy,
      });
      if (!guard.ok) {
        throw new Error(
          guard.reason === 'CREATOR_PROTECTED'
            ? 'The workspace creator cannot be removed.'
            : 'This is the last active Trustee — appoint another Trustee before removing them.'
        );
      }
      await deleteDoc(doc(db, 'workspaceMembers', m.id));
      noteMembershipAudit({
        workspaceId: m.workspaceId,
        action: 'membership.removed',
        entityId: m.id,
        entityLabel: m.displayName || m.email || 'Member',
        summaryKey: 'org.audit.history.membershipRemoved',
      });
      showToast(`${m.displayName || 'Member'} removed from the organisation.`, 'info');
    },
    [isTrusteeLike, uid, showToast, orgMembers, activeWorkspace, noteMembershipAudit]
  );

  // ---- join requests (user → org) --------------------------------------------
  const requestToJoin = useCallback(
    async (page: OrgPage, message?: string) => {
      if (!uid) throw new Error('Sign in to request membership.');
      // Already a member?
      if (myMemberships.some((m) => m.workspaceId === page.orgId)) {
        throw new Error('You are already a member of this organisation.');
      }
      const id = joinRequestId(page.orgId, uid);
      await setDoc(doc(db, 'joinRequests', id), {
        id,
        orgId: page.orgId,
        orgName: page.name,
        orgType: page.type,
        userUid: uid,
        userName: firebaseUser?.displayName || firebaseUser?.email || 'Devotee',
        userPhoto: firebaseUser?.photoURL || '',
        message: (message || '').slice(0, 300),
        status: 'PENDING' as JoinRequestStatus,
        createdAt: now(),
      } as JoinRequest);
      showToast(`Membership request sent to ${page.name}.`, 'success');
      // refresh my requests
      try {
        const snap = await getDocs(query(collection(db, 'joinRequests'), where('userUid', '==', uid)));
        setMyJoinRequests(snap.docs.map((d) => ({ ...(d.data() as any) } as JoinRequest)));
      } catch { /* non-fatal */ }
    },
    [uid, firebaseUser, myMemberships, showToast]
  );

  // My outgoing requests (live).
  useEffect(() => {
    if (!uid) {
      setMyJoinRequests([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'joinRequests'), where('userUid', '==', uid)),
      (snap) => setMyJoinRequests(snap.docs.map((d) => ({ ...(d.data() as any) } as JoinRequest))),
      () => setMyJoinRequests([])
    );
    return () => unsub();
  }, [uid]);

  // Org-side: incoming requests for the active workspace (trustees).
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId || wsId.startsWith('DEMO_') || !isTrusteeLike) {
      setOrgJoinRequests([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'joinRequests'),
        where('orgId', '==', wsId),
        where('status', '==', 'PENDING')
      ),
      (snap) => setOrgJoinRequests(snap.docs.map((d) => ({ ...(d.data() as any) } as JoinRequest))),
      () => setOrgJoinRequests([])
    );
    return () => unsub();
  }, [activeWorkspace?.id, isTrusteeLike]);

  /** Trustee approves/rejects. Approval mints the workspaceMembers edge. */
  const decideJoinRequest = useCallback(
    async (req: JoinRequest, approve: boolean) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can decide membership requests.');
      const status: JoinRequestStatus = approve ? 'APPROVED' : 'REJECTED';
      if (approve) {
        // Mint membership first (trustee-granted), then mark the request.
        await setDoc(doc(db, 'workspaceMembers', memberDocId(req.orgId, req.userUid)), {
          id: memberDocId(req.orgId, req.userUid),
          workspaceId: req.orgId,
          uid: req.userUid,
          role: 'Devotee',
          displayName: req.userName,
          joinedAt: now(),
          joinedVia: 'request',
          viaRequestId: req.id,
          invitedByUid: uid,
        } as WorkspaceMembership);
        noteMembershipAudit({
          workspaceId: req.orgId,
          action: 'membership.requestApproved',
          entityId: memberDocId(req.orgId, req.userUid),
          entityLabel: req.userName,
          summaryKey: 'org.audit.history.membershipApproved',
          summaryParams: { role: 'Devotee' },
        });
      }
      await updateDoc(doc(db, 'joinRequests', req.id), {
        status,
        decidedBy: uid,
        decidedByName: firebaseUser?.displayName || '',
        decidedAt: now(),
      });
      showToast(
        approve ? `${req.userName} is now a member.` : `Request from ${req.userName} declined.`,
        approve ? 'success' : 'info'
      );
    },
    [isTrusteeLike, uid, firebaseUser, showToast, noteMembershipAudit]
  );

  // ---- invites (org → user) -----------------------------------------------------
  const sendInvite = useCallback(
    async (input: {
      email?: string;
      phone?: string;
      uid?: string;
      name?: string;
      role: string;
      message?: string;
      templateId?: string | null;
      deskScope?: string[] | null;
      roleExpiresAt?: number | null;
      viaApproval?: boolean;
    }) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can invite members.');
      const ws = activeWorkspace;
      if (!ws || ws.id.startsWith('DEMO_')) throw new Error('Invites need a real organisation workspace.');

      const email = (input.email || '').trim().toLowerCase();
      const phone = (input.phone || '').replace(/[^\d+]/g, '');
      const invitedUid = (input.uid || '').trim();
      if (!email && !phone && !invitedUid) throw new Error('Provide an email, phone number, or user ID.');

      // Role matrix: a Trustee may grant roles at/below their own — never
      // Trustee, never SuperAdmin. Only a SuperAdmin may grant those.
      // QUEUED #56 (audit A2-D1): normalize at WRITE — whatever the UI
      // passes, the invite (and therefore the membership edge minted
      // from it) stores a canonical role. Legacy spellings collapse to
      // their migration-map intent ('Manager' → Sevadar); unknown
      // strings resolve to the member floor (Devotee), never to a
      // string the resolver would reject downstream.
      const role = resolveEdgeRole(input.role);
      const grantable =
        currentRole === 'SuperAdmin'
          ? true
          : (TRUSTEE_GRANTABLE_ROLES as readonly string[]).includes(role);
      if (!grantable) {
        throw new Error(`You cannot grant the role "${role}". A Trustee may only invite operational roles (Priest, Accountant, Sevadar, Devotee, …).`);
      }

      // Blueprint B maker–checker gate: grants above the Sevadar line
      // never happen on one pair of eyes. The ONLY direct path is the
      // approvals applier, after a different checker has approved
      // (viaApproval). Everyone else gets APPROVAL_REQUIRED and the
      // desk files a request instead (requestRoleGrant).
      if (grantNeedsApproval(role) && !input.viaApproval) {
        const err = new Error(
          `Granting ${role} needs a second approver. The invitation will be sent once another Trustee approves it.`
        ) as Error & { code: string };
        err.code = APPROVAL_REQUIRED;
        throw err;
      }

      const ref = doc(collection(db, 'orgInvites'));
      await setDoc(ref, {
        id: ref.id,
        orgId: ws.id,
        orgName: ws.name,
        orgType: (ws as any).type || 'Organisation',
        invitedUid: invitedUid || '',
        invitedEmail: email,
        invitedPhone: phone,
        invitedName: (input.name || '').slice(0, 120),
        role,
        // Blueprint B — template assignment attributes ride onto the
        // invite and then the minted edge (rules bind only the role).
        templateId: input.templateId ?? null,
        deskScope: input.deskScope ?? null,
        roleExpiresAt: input.roleExpiresAt ?? null,
        message: (input.message || '').slice(0, 300),
        status: 'PENDING',
        invitedByUid: uid,
        invitedByName: firebaseUser?.displayName || '',
        createdAt: now(),
        expiresAt: now() + INVITE_TTL_MS,
      } as OrgInvite);
      noteMembershipAudit({
        workspaceId: ws.id,
        action: 'membership.invited',
        entityId: ref.id,
        entityLabel: (input.name || '').slice(0, 120) || email || phone || invitedUid || 'Invitee',
        summaryKey: 'org.audit.history.membershipInvited',
        summaryParams: { role },
      });
      showToast(`Invitation sent${email ? ` to ${email}` : phone ? ` to ${phone}` : ''}.`, 'success');
    },
    [isTrusteeLike, activeWorkspace, currentRole, uid, firebaseUser, showToast, noteMembershipAudit]
  );

  /**
   * Blueprint B — file the maker–checker request for a gated grant.
   * The payload carries the FULL intended change; the approvals
   * applier replays it (sendInvite / updateMembershipAccess with
   * viaApproval) only after a different checker approves.
   */
  const requestRoleGrant = useCallback(
    async (input: {
      mode: 'invite' | 'membership';
      invite?: { email?: string; phone?: string; uid?: string; name?: string; message?: string };
      membershipId?: string;
      targetUid?: string;
      targetName: string;
      assignment: RoleAssignment;
    }) => {
      const ws = activeWorkspace;
      if (!ws || ws.id.startsWith('DEMO_')) throw new Error('Approvals need a real organisation workspace.');
      if (!uid) throw new Error('Sign in to request a role grant.');
      const payload: RoleGrantPayload = {
        mode: input.mode,
        ...(input.mode === 'invite'
          ? {
              invite: {
                email: input.invite?.email || '',
                phone: input.invite?.phone || '',
                uid: input.invite?.uid || '',
                name: input.invite?.name || '',
                message: input.invite?.message || '',
                role: input.assignment.role,
                templateId: input.assignment.templateId,
                deskScope: input.assignment.deskScope,
                roleExpiresAt: input.assignment.roleExpiresAt,
              },
            }
          : {
              membershipId: input.membershipId || '',
              targetUid: input.targetUid || '',
            }),
        targetName: input.targetName,
        role: input.assignment.role,
        templateId: input.assignment.templateId,
        deskScope: input.assignment.deskScope,
        roleExpiresAt: input.assignment.roleExpiresAt,
      };
      await approvalService.request(
        {
          workspaceId: ws.id,
          workspaceName: ws.name,
          kind: 'role.grant',
          payload: payload as unknown as Record<string, unknown>,
          summary: `Role grant: ${input.assignment.role} for ${input.targetName}`,
        },
        approvalActor()
      );
      showToast('Sent for approval — a second Trustee must approve this grant.', 'success');
    },
    [activeWorkspace, uid, approvalActor, showToast]
  );

  /**
   * Blueprint B — edit an existing member's access. Direct for
   * ungated outcomes; gated target roles require viaApproval (the
   * approvals applier) — the desk catches APPROVAL_REQUIRED and
   * files requestRoleGrant instead. Continuity guards always run.
   */
  const updateMembershipAccess = useCallback(
    async (
      m: WorkspaceMembership,
      changes: {
        role?: string;
        templateId?: string | null;
        deskScope?: string[] | null;
        roleExpiresAt?: number | null;
      },
      opts?: { viaApproval?: boolean }
    ) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can change member access.');
      const targetRole = resolveEdgeRole(changes.role ?? m.role);
      // The gate fires on a genuine role CHANGE into a gated role.
      // Scope/expiry-only edits (even on a gated member) and
      // demotions stay direct: scope can only narrow a role's own
      // visibility, and reducing access must never need permission.
      const roleChanges = targetRole !== resolveEdgeRole(m.role);
      if (grantNeedsApproval(targetRole) && roleChanges && !opts?.viaApproval) {
        const err = new Error(
          `Changing a role to ${targetRole} needs a second approver.`
        ) as Error & { code: string };
        err.code = APPROVAL_REQUIRED;
        throw err;
      }
      const guard = guardAccessChange(
        orgMembers,
        m.uid,
        {
          role: changes.role !== undefined ? targetRole : undefined,
          roleExpiresAt:
            changes.roleExpiresAt !== undefined ? changes.roleExpiresAt : undefined,
        },
        now(),
        { creatorUid: (activeWorkspace as { createdBy?: string } | null)?.createdBy }
      );
      if (!guard.ok) {
        throw new Error(
          guard.reason === 'CREATOR_PROTECTED'
            ? "The workspace creator's access cannot be reduced or expired."
            : 'This is the last active Trustee — appoint another Trustee first.'
        );
      }
      const updates: Record<string, unknown> = {};
      if (changes.role !== undefined) updates.role = targetRole;
      if (changes.templateId !== undefined) updates.templateId = changes.templateId;
      if (changes.deskScope !== undefined) updates.deskScope = changes.deskScope;
      if (changes.roleExpiresAt !== undefined) updates.roleExpiresAt = changes.roleExpiresAt;
      if (Object.keys(updates).length === 0) return;
      await updateDoc(doc(db, 'workspaceMembers', m.id), updates);
      if (changes.role !== undefined && targetRole !== resolveEdgeRole(m.role)) {
        noteMembershipAudit({
          workspaceId: m.workspaceId,
          action: 'membership.roleChanged',
          entityId: m.id,
          entityLabel: m.displayName || m.email || 'Member',
          summaryKey: 'org.audit.history.membershipRoleChanged',
          summaryParams: { from: resolveEdgeRole(m.role), to: targetRole },
        });
      } else {
        noteMembershipAudit({
          workspaceId: m.workspaceId,
          action: 'membership.accessUpdated',
          entityId: m.id,
          entityLabel: m.displayName || m.email || 'Member',
          summaryKey: 'org.audit.history.membershipAccessUpdated',
          summaryParams: { fields: Object.keys(updates).join(', ') },
        });
      }
      showToast(`${m.displayName || 'Member'}'s access updated.`, 'success');
    },
    [isTrusteeLike, orgMembers, activeWorkspace, noteMembershipAudit, showToast]
  );

  // My incoming invites — matched by uid, then email, then phone-on-file.
  // (Rules enforce per-doc visibility; these queries only return my own.)
  useEffect(() => {
    if (!uid) {
      setMyInvites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const byUid = await getDocs(query(collection(db, 'orgInvites'), where('invitedUid', '==', uid), where('status', '==', 'PENDING')));
        let list = byUid.docs.map((d) => ({ ...(d.data() as any) } as OrgInvite));
        if (userEmail) {
          const byEmail = await getDocs(
            query(collection(db, 'orgInvites'), where('invitedEmail', '==', userEmail), where('status', '==', 'PENDING'))
          );
          for (const d of byEmail.docs) {
            const inv = { ...(d.data() as any) } as OrgInvite;
            if (!list.some((x) => x.id === inv.id)) list.push(inv);
          }
        }
        // Phone match: read my users-doc phone once, then query.
        try {
          const uSnap = await getDoc(doc(db, 'users', uid));
          const myPhone = String(uSnap.data()?.phone || '').replace(/[^\d+]/g, '');
          if (myPhone) {
            const byPhone = await getDocs(
              query(collection(db, 'orgInvites'), where('invitedPhone', '==', myPhone), where('status', '==', 'PENDING'))
            );
            for (const d of byPhone.docs) {
              const inv = { ...(d.data() as any) } as OrgInvite;
              if (!list.some((x) => x.id === inv.id)) list.push(inv);
            }
          }
        } catch { /* phone match best-effort */ }
        if (!cancelled) {
          // Client-side expiry filter (rules also enforce).
          setMyInvites(list.filter((i) => (i.expiresAt || 0) > now()));
        }
      } catch {
        if (!cancelled) setMyInvites([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, userEmail]);

  // Org-side: invites sent by this workspace (trustees).
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId || wsId.startsWith('DEMO_') || !isTrusteeLike) {
      setOrgInvites([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'orgInvites'), where('orgId', '==', wsId), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => setOrgInvites(snap.docs.map((d) => ({ ...(d.data() as any) } as OrgInvite))),
      () => setOrgInvites([])
    );
    return () => unsub();
  }, [activeWorkspace?.id, isTrusteeLike]);

  /**
   * Accept / decline an invite. Accept mints the workspaceMembers edge
   * (rules verify the invite is PENDING, unexpired, names me, and that the
   * granted role equals the invite's role — no self-escalation), then hands
   * off to joinWorkspace() for the immediate switcher update.
   */
  const respondToInvite = useCallback(
    async (invite: OrgInvite, accept: boolean) => {
      if (!uid) throw new Error('Sign in to respond.');
      if ((invite.expiresAt || 0) <= now()) throw new Error('This invitation has expired.');
      if (invite.status !== 'PENDING') throw new Error('This invitation is no longer pending.');

      await updateDoc(doc(db, 'orgInvites', invite.id), {
        status: accept ? 'ACCEPTED' : 'DECLINED',
        decidedAt: now(),
      } as Partial<OrgInvite>);

      if (accept) {
        await setDoc(doc(db, 'workspaceMembers', memberDocId(invite.orgId, uid)), {
          id: memberDocId(invite.orgId, uid),
          workspaceId: invite.orgId,
          uid,
          // Verbatim BY DESIGN (rules verify edge role == invite role —
          // no self-escalation). New invites are canonicalized at write
          // in sendInvite; a legacy invite still carrying 'Manager' /
          // 'Member' mints that string, and every READ path
          // (resolveEdgeRole: landing, override gate, header chip)
          // resolves it deterministically — the victim is freed without
          // breaking the rules equality check here.
          role: invite.role,
          // Blueprint B — the template assignment rides onto the edge
          // verbatim (desk scope + role expiry the trustee granted).
          templateId: invite.templateId ?? null,
          deskScope: invite.deskScope ?? null,
          roleExpiresAt: invite.roleExpiresAt ?? null,
          displayName: firebaseUser?.displayName || firebaseUser?.email || 'Member',
          email: firebaseUser?.email || '',
          joinedAt: now(),
          joinedVia: 'invite',
          viaInviteId: invite.id,
          invitedByUid: invite.invitedByUid,
        } as WorkspaceMembership);
        noteMembershipAudit({
          workspaceId: invite.orgId,
          action: 'membership.joined',
          entityId: memberDocId(invite.orgId, uid),
          entityLabel: firebaseUser?.displayName || firebaseUser?.email || 'Member',
          summaryKey: 'org.audit.history.membershipJoined',
          summaryParams: { role: resolveEdgeRole(invite.role) },
        });
        showToast(`Welcome to ${invite.orgName}!`, 'success');
        // Immediate switcher handoff (defined below; safe: executes after mount).
        await joinWorkspaceRef.current(invite.orgId);
      } else {
        showToast('Invitation declined.', 'info');
      }
      setMyInvites((list) => list.filter((i) => i.id !== invite.id));
    },
    [uid, firebaseUser, showToast, noteMembershipAudit]
  );

  // ---- post-membership handoff -----------------------------------------------------
  /**
   * Puts the organisation in the user's switcher + "My Organisations" rail
   * immediately — no re-login. Pulls the workspace config (readable now that
   * the membership edge exists) into the local registry, then switches.
   */
  const joinWorkspace = useCallback(
    async (orgId: string): Promise<boolean> => {
      if (!uid) return false;
      try {
        const wsSnap = await getDoc(doc(db, 'workspaces', orgId));
        if (wsSnap.exists()) {
          const cfg = { id: wsSnap.id, ...(wsSnap.data() as any) } as WorkspaceConfig;
          addWorkspace(cfg);
        }
      } catch (e) {
        console.warn('[Membership] workspace config fetch failed (non-fatal):', e);
      }
      await refreshMemberships();
      const ok = await switchWorkspace(orgId);
      if (ok) showToast('Organisation added to your switcher.', 'success');
      return ok;
    },
    [uid, addWorkspace, switchWorkspace, refreshMemberships, showToast]
  );
  // Ref indirection so respondToInvite (defined above) can call the handoff
  // without a useCallback ordering cycle.
  const joinWorkspaceRef = useRef(joinWorkspace);
  joinWorkspaceRef.current = joinWorkspace;

  const value = useMemo<MembershipContextType>(
    () => ({
      getOrgPage,
      browseOrgPages,
      ensureOrgPage,
      isFollowing,
      toggleFollow,
      followerCount,
      requestToJoin,
      myJoinRequests,
      orgJoinRequests,
      decideJoinRequest,
      sendInvite,
      requestRoleGrant,
      updateMembershipAccess,
      myInvites,
      orgInvites,
      respondToInvite,
      myMemberships,
      membershipsLoaded,
      orgMembers,
      removeMember,
      joinWorkspace,
      refreshMemberships,
    }),
    [
      getOrgPage, browseOrgPages, ensureOrgPage, isFollowing, toggleFollow, followerCount,
      requestToJoin, myJoinRequests, orgJoinRequests, decideJoinRequest,
      sendInvite, requestRoleGrant, updateMembershipAccess, myInvites, orgInvites, respondToInvite,
      myMemberships, membershipsLoaded, orgMembers, removeMember, joinWorkspace, refreshMemberships,
    ]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
};
