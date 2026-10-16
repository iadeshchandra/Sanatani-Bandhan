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
        verified: true,
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
  }) => Promise<void>;
  myInvites: OrgInvite[];
  orgInvites: OrgInvite[];
  respondToInvite: (invite: OrgInvite, accept: boolean) => Promise<void>;

  // --- memberships ---
  myMemberships: WorkspaceMembership[];
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
  const { firebaseUser, activeWorkspace, currentRole, addWorkspace, switchWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = firebaseUser?.uid || null;
  const userEmail = (firebaseUser?.email || '').toLowerCase();

  const [myMemberships, setMyMemberships] = useState<WorkspaceMembership[]>([]);
  const [myJoinRequests, setMyJoinRequests] = useState<JoinRequest[]>([]);
  const [orgJoinRequests, setOrgJoinRequests] = useState<JoinRequest[]>([]);
  const [myInvites, setMyInvites] = useState<OrgInvite[]>([]);
  const [orgInvites, setOrgInvites] = useState<OrgInvite[]>([]);
  const [orgMembers, setOrgMembers] = useState<WorkspaceMembership[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);

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
    if (!uid) {
      setMyMemberships([]);
      return;
    }
    try {
      const snap = await getDocs(query(collection(db, 'workspaceMembers'), where('uid', '==', uid)));
      setMyMemberships(snap.docs.map((d) => ({ ...(d.data() as any) } as WorkspaceMembership)));
    } catch {
      setMyMemberships([]);
    }
  }, [uid]);

  useEffect(() => {
    refreshMemberships();
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
      (snap) => setOrgMembers(snap.docs.map((d) => ({ ...(d.data() as any) } as WorkspaceMembership))),
      () => setOrgMembers([])
    );
    return () => unsub();
  }, [activeWorkspace?.id, isTrusteeLike]);

  const removeMember = useCallback(
    async (m: WorkspaceMembership) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can remove members.');
      if (m.uid === uid) throw new Error('You cannot remove yourself.');
      await deleteDoc(doc(db, 'workspaceMembers', m.id));
      showToast(`${m.displayName || 'Member'} removed from the organisation.`, 'info');
    },
    [isTrusteeLike, uid, showToast]
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
    [isTrusteeLike, uid, firebaseUser, showToast]
  );

  // ---- invites (org → user) -----------------------------------------------------
  const sendInvite = useCallback(
    async (input: { email?: string; phone?: string; uid?: string; name?: string; role: string; message?: string }) => {
      if (!isTrusteeLike) throw new Error('Only a Trustee can invite members.');
      const ws = activeWorkspace;
      if (!ws || ws.id.startsWith('DEMO_')) throw new Error('Invites need a real organisation workspace.');

      const email = (input.email || '').trim().toLowerCase();
      const phone = (input.phone || '').replace(/[^\d+]/g, '');
      const invitedUid = (input.uid || '').trim();
      if (!email && !phone && !invitedUid) throw new Error('Provide an email, phone number, or user ID.');

      // Role matrix: a Trustee may grant roles at/below their own — never
      // Trustee, never SuperAdmin. Only a SuperAdmin may grant those.
      const role = input.role;
      const grantable =
        currentRole === 'SuperAdmin'
          ? true
          : (TRUSTEE_GRANTABLE_ROLES as readonly string[]).includes(role);
      if (!grantable) {
        throw new Error(`You cannot grant the role "${role}". A Trustee may only invite operational roles (Priest, Accountant, Sevadar, Devotee, …).`);
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
        message: (input.message || '').slice(0, 300),
        status: 'PENDING',
        invitedByUid: uid,
        invitedByName: firebaseUser?.displayName || '',
        createdAt: now(),
        expiresAt: now() + INVITE_TTL_MS,
      } as OrgInvite);
      showToast(`Invitation sent${email ? ` to ${email}` : phone ? ` to ${phone}` : ''}.`, 'success');
    },
    [isTrusteeLike, activeWorkspace, currentRole, uid, firebaseUser, showToast]
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
          role: invite.role,
          displayName: firebaseUser?.displayName || firebaseUser?.email || 'Member',
          email: firebaseUser?.email || '',
          joinedAt: now(),
          joinedVia: 'invite',
          viaInviteId: invite.id,
          invitedByUid: invite.invitedByUid,
        } as WorkspaceMembership);
        showToast(`Welcome to ${invite.orgName}!`, 'success');
        // Immediate switcher handoff (defined below; safe: executes after mount).
        await joinWorkspaceRef.current(invite.orgId);
      } else {
        showToast('Invitation declined.', 'info');
      }
      setMyInvites((list) => list.filter((i) => i.id !== invite.id));
    },
    [uid, firebaseUser, showToast]
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
      myInvites,
      orgInvites,
      respondToInvite,
      myMemberships,
      orgMembers,
      removeMember,
      joinWorkspace,
      refreshMemberships,
    }),
    [
      getOrgPage, browseOrgPages, ensureOrgPage, isFollowing, toggleFollow, followerCount,
      requestToJoin, myJoinRequests, orgJoinRequests, decideJoinRequest,
      sendInvite, myInvites, orgInvites, respondToInvite,
      myMemberships, orgMembers, removeMember, joinWorkspace, refreshMemberships,
    ]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
};
