/**
 * PurohitContext — data layer for the org-independent Purohit One system.
 * ======================================================================
 * Serves TWO surfaces:
 *  1. The purohit personal workspace (sessionKind === 'purohit'): profile,
 *     own gigs, applications, endorsements, reviews, availability, invites.
 *  2. The devotee marketplace (org or B2C sessions): public gig + purohit
 *     listings, posting requirements, confirming/ rating completed gigs.
 *
 * All collections here are GLOBAL (not workspace-scoped) by design — a
 * purohit belongs to no organisation. Firestore rules enforce party-scoped
 * writes; reads on marketplace collections are public.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from './AuthWorkspaceContext';
import { useToast } from './ToastContext';
import {
  GigReview,
  GigStatus,
  PurohitApplication,
  PurohitAvailability,
  PurohitEndorsement,
  PurohitIdentity,
  PurohitInvite,
  RitualGig,
  computeEffectiveTier,
  generatePurohitId,
} from '../types/purohit';

interface PurohitContextType {
  // Identity
  profile: PurohitIdentity | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<PurohitIdentity>) => Promise<void>;
  /**
   * One-shot lookup of a purohit identity by Firebase uid. Used outside the
   * purohit session (devotee account area, login detection, social feed).
   */
  fetchPurohitByUid: (targetUid: string) => Promise<PurohitIdentity | null>;
  /**
   * Mints a new Universal Purohit ID + identity doc, linked to an existing
   * Firebase account. Shared by independent signup AND the devotee upgrade
   * path — the verification pipeline is identical regardless of entry.
   */
  mintPurohitIdentity: (data: {
    uid: string;
    email?: string;
    displayName: string;
    phone: string;
    city: string;
    state?: string;
    languages: string[];
    specializations: string[];
    source: 'independent' | 'devotee_upgrade';
  }) => Promise<PurohitIdentity>;

  // Verification
  applications: PurohitApplication[];
  myApplication: PurohitApplication | null;
  submitApplication: (app: Omit<PurohitApplication, 'id' | 'uid' | 'purohitId' | 'displayName' | 'status' | 'createdAt'>) => Promise<void>;
  endorsements: PurohitEndorsement[];
  effectiveTier: import('../types/purohit').PurohitVerificationTier | null;
  claimTierAdvancement: () => Promise<void>;

  // Gigs
  openGigs: RitualGig[];
  myGigs: RitualGig[];
  myPostedGigs: RitualGig[];
  postGig: (gig: Omit<RitualGig, 'id' | 'devoteeUid' | 'devoteeName' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  acceptGig: (gig: RitualGig) => Promise<void>;
  advanceGig: (gig: RitualGig, next: GigStatus) => Promise<void>;
  cancelGig: (gig: RitualGig) => Promise<void>;

  // Reviews
  reviewsForPurohit: (purohitId: string) => Promise<GigReview[]>;
  myReceivedReviews: GigReview[];
  submitReview: (gig: RitualGig, rating: number, note: string) => Promise<void>;
  hasReviewed: (gigId: string) => boolean;

  // Availability
  availability: PurohitAvailability | null;
  saveAvailability: (slots: Record<string, boolean>) => Promise<void>;

  // Marketplace browsing (public)
  browsePurohits: (filters: { city?: string; specialization?: string; language?: string }) => Promise<PurohitIdentity[]>;
  getPurohit: (purohitId: string) => Promise<PurohitIdentity | null>;
  getEndorsements: (purohitId: string) => Promise<PurohitEndorsement[]>;
  endorsePurohit: (purohitId: string, text: string, ritualCount: number) => Promise<void>;

  // Invites (org → purohit)
  myInvites: PurohitInvite[];
  invitePurohit: (purohit: PurohitIdentity, message?: string) => Promise<void>;
  respondToInvite: (invite: PurohitInvite, accept: boolean) => Promise<void>;
}

const PurohitContext = createContext<PurohitContextType | undefined>(undefined);

export const usePurohit = (): PurohitContextType => {
  const ctx = useContext(PurohitContext);
  if (!ctx) throw new Error('usePurohit must be used inside PurohitProvider');
  return ctx;
};

const now = () => Date.now();

export const PurohitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, activeWorkspace, currentRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = firebaseUser?.uid || null;

  const [profile, setProfile] = useState<PurohitIdentity | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [openGigs, setOpenGigs] = useState<RitualGig[]>([]);
  const [myGigs, setMyGigs] = useState<RitualGig[]>([]);
  const [myPostedGigs, setMyPostedGigs] = useState<RitualGig[]>([]);
  const [applications, setApplications] = useState<PurohitApplication[]>([]);
  const [endorsements, setEndorsements] = useState<PurohitEndorsement[]>([]);
  const [availability, setAvailability] = useState<PurohitAvailability | null>(null);
  const [myInvites, setMyInvites] = useState<PurohitInvite[]>([]);

  // ---- Identity ---------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const q = query(collection(db, 'purohits'), where('uid', '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setProfile({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as PurohitIdentity);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<PurohitIdentity>) => {
      if (!profile) return;
      // Client-side guard mirrors the rules: tier/aggregates/uid are immutable here.
      const { verificationTier, ratingAggregate, ratingCount, completedGigs, uid: _u, id: _i, ...safe } = updates as any;
      await updateDoc(doc(db, 'purohits', profile.id), { ...safe, updatedAt: now() });
      setProfile((p) => (p ? { ...p, ...safe, updatedAt: now() } : p));
      showToast('Profile updated', 'success');
    },
    [profile, showToast]
  );

  /**
   * One-shot uid → identity lookup. Safe to call from org context because
   * `purohits` is publicly readable (marketplace requirement).
   */
  const fetchPurohitByUid = useCallback(async (targetUid: string): Promise<PurohitIdentity | null> => {
    if (!targetUid) return null;
    try {
      const snap = await getDocs(
        query(collection(db, 'purohits'), where('uid', '==', targetUid), limit(1))
      );
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as PurohitIdentity;
    } catch {
      return null;
    }
  }, []);

  /**
   * Mints the Universal Purohit ID (PUR-XXXXXX) with a uniqueness check and
   * creates the identity doc. Throws if this uid already has an identity —
   * one human, one purohit identity.
   */
  const mintPurohitIdentity = useCallback(
    async (data: {
      uid: string;
      email?: string;
      displayName: string;
      phone: string;
      city: string;
      state?: string;
      languages: string[];
      specializations: string[];
      source: 'independent' | 'devotee_upgrade';
    }): Promise<PurohitIdentity> => {
      const existing = await fetchPurohitByUid(data.uid);
      if (existing) {
        throw new Error(`You already have a purohit identity (${existing.id}).`);
      }
      // Uniqueness loop: generate → check doc existence → retry on collision.
      let purohitId = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = generatePurohitId();
        const probe = await getDoc(doc(db, 'purohits', candidate));
        if (!probe.exists()) {
          purohitId = candidate;
          break;
        }
      }
      if (!purohitId) throw new Error('Could not generate a unique Purohit ID — please try again.');
      const ts = now();
      const identity: PurohitIdentity = {
        id: purohitId,
        uid: data.uid,
        displayName: data.displayName.trim(),
        phone: data.phone.trim(),
        email: data.email || undefined,
        city: data.city.trim(),
        state: data.state?.trim() || undefined,
        languages: data.languages,
        specializations: data.specializations,
        experienceYears: 0,
        verificationTier: 'REGISTERED',
        ratingAggregate: 0,
        ratingCount: 0,
        completedGigs: 0,
        source: data.source,
        createdAt: ts,
        updatedAt: ts,
      };
      await setDoc(doc(db, 'purohits', purohitId), identity);
      setProfile(identity);
      return identity;
    },
    [fetchPurohitByUid]
  );

  // ---- Verification ------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setApplications([]);
      setEndorsements([]);
      return;
    }
    const unsubApps = onSnapshot(
      query(collection(db, 'purohitApplications'), where('purohitId', '==', profile.id)),
      (snap) =>
        setApplications(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitApplication))
        ),
      () => setApplications([])
    );
    const unsubEnd = onSnapshot(
      query(collection(db, 'endorsements'), where('purohitId', '==', profile.id)),
      (snap) =>
        setEndorsements(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitEndorsement))
        ),
      () => setEndorsements([])
    );
    return () => {
      unsubApps();
      unsubEnd();
    };
  }, [profile?.id]);

  const myApplication = useMemo(
    () => applications.slice().sort((a, b) => b.createdAt - a.createdAt)[0] || null,
    [applications]
  );

  const effectiveTier = useMemo(() => {
    if (!profile) return null;
    return computeEffectiveTier(
      profile.verificationTier,
      endorsements.length,
      profile.completedGigs,
      profile.ratingAggregate
    );
  }, [profile, endorsements.length]);

  const submitApplication = useCallback(
    async (app: Omit<PurohitApplication, 'id' | 'uid' | 'purohitId' | 'displayName' | 'status' | 'createdAt'>) => {
      if (!profile || !uid) throw new Error('Not signed in as a purohit');
      const ref = doc(collection(db, 'purohitApplications'));
      await setDoc(ref, {
        ...app,
        id: ref.id,
        uid,
        purohitId: profile.id,
        displayName: profile.displayName,
        status: 'PENDING',
        createdAt: now(),
      });
      showToast('Application submitted for review', 'success');
    },
    [profile, uid, showToast]
  );

  /** Writes the auto-advanced tier when public evidence qualifies. */
  const claimTierAdvancement = useCallback(async () => {
    if (!profile || !effectiveTier || effectiveTier === profile.verificationTier) return;
    await updateDoc(doc(db, 'purohits', profile.id), {
      verificationTier: effectiveTier,
      updatedAt: now(),
    });
    setProfile((p) => (p ? { ...p, verificationTier: effectiveTier } : p));
    showToast(`Tier advanced: ${effectiveTier.replace(/_/g, ' ')}`, 'success');
  }, [profile, effectiveTier, showToast]);

  // ---- Gigs ---------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'gigs'), where('status', '==', 'OPEN'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) =>
        setOpenGigs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RitualGig))),
      () => setOpenGigs([])
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) {
      setMyGigs([]);
      setMyPostedGigs([]);
      return;
    }
    const unsubA = onSnapshot(
      query(collection(db, 'gigs'), where('assignedPurohitUid', '==', uid), orderBy('updatedAt', 'desc')),
      (snap) => setMyGigs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RitualGig))),
      () => setMyGigs([])
    );
    const unsubP = onSnapshot(
      query(collection(db, 'gigs'), where('devoteeUid', '==', uid), orderBy('updatedAt', 'desc')),
      (snap) => setMyPostedGigs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RitualGig))),
      () => setMyPostedGigs([])
    );
    return () => {
      unsubA();
      unsubP();
    };
  }, [uid]);

  const postGig = useCallback(
    async (gig: Omit<RitualGig, 'id' | 'devoteeUid' | 'devoteeName' | 'status' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) throw new Error('Sign in to post a requirement');
      const devoteeName =
        (firebaseUser?.displayName as string) || firebaseUser?.email || 'Devotee';
      const ref = doc(collection(db, 'gigs'));
      const ts = now();
      await setDoc(ref, {
        ...gig,
        id: ref.id,
        devoteeUid: uid,
        devoteeName,
        status: 'OPEN',
        createdAt: ts,
        updatedAt: ts,
      });
      showToast('Requirement posted — purohits can now respond', 'success');
      return ref.id;
    },
    [uid, firebaseUser, showToast]
  );

  const acceptGig = useCallback(
    async (gig: RitualGig) => {
      if (!profile || !uid) throw new Error('Not signed in as a purohit');
      if (gig.status !== 'OPEN') throw new Error('Gig is no longer open');
      await updateDoc(doc(db, 'gigs', gig.id), {
        status: 'ASSIGNED',
        assignedPurohitId: profile.id,
        assignedPurohitUid: uid,
        assignedPurohitName: profile.displayName,
        updatedAt: now(),
      });
      showToast('Gig accepted — coordinate with the devotee', 'success');
    },
    [profile, uid, showToast]
  );

  const advanceGig = useCallback(
    async (gig: RitualGig, next: GigStatus) => {
      const allowed: Record<GigStatus, GigStatus[]> = {
        OPEN: ['ASSIGNED', 'CANCELLED'],
        ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: ['DAKSHINA_RELEASED'],
        DAKSHINA_RELEASED: [],
        CANCELLED: [],
      };
      if (!allowed[gig.status].includes(next)) throw new Error(`Cannot move ${gig.status} → ${next}`);
      const updates: any = { status: next, updatedAt: now() };
      await updateDoc(doc(db, 'gigs', gig.id), updates);
      if (next === 'COMPLETED' && profile) {
        // Increment completed gigs on the profile (public counter; rules allow
        // counter-only updates, recomputed from reviews by anyone).
        try {
          await updateDoc(doc(db, 'purohits', profile.id), {
            completedGigs: (profile.completedGigs || 0) + 1,
            updatedAt: now(),
          });
          setProfile((p) => (p ? { ...p, completedGigs: (p.completedGigs || 0) + 1 } : p));
        } catch {
          /* counter write failed — non-fatal */
        }
      }
      showToast(`Gig ${next.replace(/_/g, ' ').toLowerCase()}`, 'success');
    },
    [profile, showToast]
  );

  const cancelGig = useCallback(
    async (gig: RitualGig) => {
      await advanceGig(gig, 'CANCELLED');
    },
    [advanceGig]
  );

  // ---- Reviews --------------------------------------------------------------
  // ANTI-GAMING: a review doc ID is deterministic —
  // `reviews/{gigId}_{reviewerUid}_{kind}` — so each party can rate a gig at
  // most once, and rules reject ratings from non-parties.
  const reviewDocId = (gigId: string, reviewerUid: string, kind: 'devotee' | 'purohit') =>
    `${gigId}_${reviewerUid}_${kind}`;

  const [reviewedGigIds, setReviewedGigIds] = useState<Set<string>>(new Set());
  const [receivedReviews, setReceivedReviews] = useState<GigReview[]>([]);

  const hasReviewed = useCallback((gigId: string) => reviewedGigIds.has(gigId), [reviewedGigIds]);

  const recomputeAggregate = useCallback(async (purohitId: string) => {
    // Best-effort: recompute ratingAggregate/ratingCount from public reviews.
    // Anyone can verify these numbers from the reviews collection, which is
    // why rules allow counter-only updates from any signed-in user.
    try {
      const gsnap = await getDocs(
        query(collection(db, 'gigs'), where('assignedPurohitId', '==', purohitId), limit(200))
      );
      const gigIds = new Set(gsnap.docs.map((d) => d.id));
      if (gigIds.size === 0) return;
      const rsnap = await getDocs(
        query(collection(db, 'reviews'), where('reviewerKind', '==', 'devotee'), limit(500))
      );
      const mine = rsnap.docs
        .map((d) => d.data() as GigReview)
        .filter((r) => gigIds.has(r.gigId));
      if (mine.length === 0) return;
      const avg = mine.reduce((s, r) => s + (r.rating || 0), 0) / mine.length;
      await updateDoc(doc(db, 'purohits', purohitId), {
        ratingAggregate: Math.round(avg * 10) / 10,
        ratingCount: mine.length,
        updatedAt: now(),
      });
    } catch {
      /* aggregate recompute is best-effort */
    }
  }, []);

  const submitReview = useCallback(
    async (gig: RitualGig, rating: number, note: string) => {
      if (!uid) throw new Error('Sign in to review');
      const isDevotee = gig.devoteeUid === uid;
      const isPurohit = gig.assignedPurohitUid === uid;
      if (!isDevotee && !isPurohit) {
        throw new Error('You can only rate gigs you were party to.');
      }
      if (gig.status !== 'COMPLETED' && gig.status !== 'DAKSHINA_RELEASED') {
        throw new Error('Ratings open after the ritual is marked complete.');
      }
      const kind = isDevotee ? 'devotee' : 'purohit';
      const id = reviewDocId(gig.id, uid, kind);
      const existing = await getDoc(doc(db, 'reviews', id));
      if (existing.exists()) throw new Error('You have already rated this gig.');
      await setDoc(doc(db, 'reviews', id), {
        id,
        gigId: gig.id,
        reviewerUid: uid,
        reviewerKind: kind,
        reviewerName: isDevotee ? gig.devoteeName : gig.assignedPurohitName || 'Purohit',
        rating: Math.max(1, Math.min(5, Math.round(rating))),
        note: note.slice(0, 500),
        createdAt: now(),
      });
      if (isDevotee && gig.assignedPurohitId) {
        await recomputeAggregate(gig.assignedPurohitId);
      }
      setReviewedGigIds((s) => new Set(s).add(gig.id));
      showToast('Dhanyavaad — your rating was recorded', 'success');
    },
    [uid, showToast, recomputeAggregate]
  );

  const reviewsForPurohit = useCallback(async (purohitId: string): Promise<GigReview[]> => {
    // Reviews don't carry purohitId directly; resolve via the purohit's gigs.
    const gsnap = await getDocs(
      query(collection(db, 'gigs'), where('assignedPurohitId', '==', purohitId), limit(100))
    );
    const gigIds = new Set(gsnap.docs.map((d) => d.id));
    if (gigIds.size === 0) return [];
    const rsnap = await getDocs(query(collection(db, 'reviews'), where('reviewerKind', '==', 'devotee')));
    return rsnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) } as GigReview))
      .filter((r) => gigIds.has(r.gigId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  const myReceivedReviews = receivedReviews;

  // Received reviews for the signed-in purohit (refreshed as gigs change).
  useEffect(() => {
    if (!profile) {
      setReceivedReviews([]);
      return;
    }
    let cancelled = false;
    reviewsForPurohit(profile.id)
      .then((r) => {
        if (!cancelled) setReceivedReviews(r);
      })
      .catch(() => {
        if (!cancelled) setReceivedReviews([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, myGigs.length]);

  // ---- Availability -----------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setAvailability(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'purohitAvailability', profile.id),
      (snap) =>
        setAvailability(
          snap.exists() ? ({ purohitId: profile.id, ...(snap.data() as any) } as PurohitAvailability) : null
        ),
      () => setAvailability(null)
    );
    return () => unsub();
  }, [profile?.id]);

  const saveAvailability = useCallback(
    async (slots: Record<string, boolean>) => {
      if (!profile) return;
      await setDoc(doc(db, 'purohitAvailability', profile.id), {
        purohitId: profile.id,
        slots,
        updatedAt: now(),
      });
      showToast('Availability saved', 'success');
    },
    [profile, showToast]
  );

  // ---- Marketplace browsing ------------------------------------------------------
  const browsePurohits = useCallback(
    async (filters: { city?: string; specialization?: string; language?: string }) => {
      const snap = await getDocs(query(collection(db, 'purohits'), limit(100)));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitIdentity));
      if (filters.city) {
        const c = filters.city.toLowerCase();
        list = list.filter((p) => p.city?.toLowerCase().includes(c));
      }
      if (filters.specialization) {
        list = list.filter((p) => p.specializations?.includes(filters.specialization!));
      }
      if (filters.language) {
        list = list.filter((p) => p.languages?.includes(filters.language!));
      }
      // PLATFORM_VERIFIED first, then by rating.
      const rank: Record<string, number> = {
        PLATFORM_VERIFIED: 0,
        ORG_ENDORSED: 1,
        CREDENTIAL_VERIFIED: 2,
        REGISTERED: 3,
      };
      return list.sort(
        (a, b) =>
          (rank[a.verificationTier] ?? 3) - (rank[b.verificationTier] ?? 3) ||
          (b.ratingAggregate || 0) - (a.ratingAggregate || 0)
      );
    },
    []
  );

  const getPurohit = useCallback(async (purohitId: string) => {
    const snap = await getDoc(doc(db, 'purohits', purohitId));
    return snap.exists()
      ? ({ id: snap.id, ...(snap.data() as any) } as PurohitIdentity)
      : null;
  }, []);

  const getEndorsements = useCallback(async (purohitId: string) => {
    const snap = await getDocs(
      query(collection(db, 'endorsements'), where('purohitId', '==', purohitId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitEndorsement));
  }, []);

  const endorsePurohit = useCallback(
    async (purohitId: string, text: string, ritualCount: number) => {
      if (!uid) throw new Error('Sign in to endorse');
      if (!activeWorkspace || activeWorkspace.id.startsWith('DEMO_')) {
        throw new Error('Endorsements need a real organisation workspace.');
      }
      const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);
      if (!isTrusteeLike) throw new Error('Only a Trustee can endorse on behalf of the organisation.');
      const ref = doc(collection(db, 'endorsements'));
      await setDoc(ref, {
        id: ref.id,
        orgId: activeWorkspace.id,
        orgName: activeWorkspace.name,
        orgType: (activeWorkspace as any).type || (activeWorkspace as any).orgType || 'Organisation',
        purohitId,
        endorserUid: uid,
        text: text.slice(0, 500),
        ritualCount: Math.max(0, Math.floor(ritualCount)),
        createdAt: now(),
      });
      // Auto-advance the tier along the ordered path (rules enforce the path).
      try {
        const psnap = await getDoc(doc(db, 'purohits', purohitId));
        if (psnap.exists() && (psnap.data() as any).verificationTier === 'CREDENTIAL_VERIFIED') {
          await updateDoc(doc(db, 'purohits', purohitId), {
            verificationTier: 'ORG_ENDORSED',
            updatedAt: now(),
          });
        }
      } catch {
        /* tier sync is best-effort; admin can sync */
      }
      showToast('Endorsement recorded', 'success');
    },
    [uid, activeWorkspace, currentRole, showToast]
  );

  // ---- Invites ----------------------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setMyInvites([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'purohitInvites'), where('purohitId', '==', profile.id), orderBy('createdAt', 'desc')),
      (snap) =>
        setMyInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitInvite))),
      () => setMyInvites([])
    );
    return () => unsub();
  }, [profile?.id]);

  const invitePurohit = useCallback(
    async (purohit: PurohitIdentity, message?: string) => {
      if (!uid) throw new Error('Sign in to invite');
      if (!activeWorkspace || activeWorkspace.id.startsWith('DEMO_')) {
        throw new Error('Invites need a real organisation workspace.');
      }
      const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);
      if (!isTrusteeLike) throw new Error('Only a Trustee can invite.');
      const ref = doc(collection(db, 'purohitInvites'));
      await setDoc(ref, {
        id: ref.id,
        purohitId: purohit.id,
        purohitUid: purohit.uid,
        purohitName: purohit.displayName,
        orgId: activeWorkspace.id,
        orgName: activeWorkspace.name,
        inviterUid: uid,
        message: (message || '').slice(0, 300),
        status: 'PENDING',
        createdAt: now(),
      });
      showToast(`Invitation sent to ${purohit.displayName}`, 'success');
    },
    [uid, activeWorkspace, currentRole, showToast]
  );

  const respondToInvite = useCallback(
    async (invite: PurohitInvite, accept: boolean) => {
      if (!profile) return;
      await updateDoc(doc(db, 'purohitInvites', invite.id), {
        status: accept ? 'ACCEPTED' : 'DECLINED',
        respondedAt: now(),
      });
      if (accept) {
        // Dual identity: link the independent profile as org staff. Org data
        // becomes visible ONLY inside the org session — never here.
        await updateDoc(doc(db, 'purohits', profile.id), {
          linkedOrgId: invite.orgId,
          linkedOrgName: invite.orgName,
          updatedAt: now(),
        });
        setProfile((p) =>
          p ? { ...p, linkedOrgId: invite.orgId, linkedOrgName: invite.orgName } : p
        );
      }
      showToast(accept ? 'Invitation accepted' : 'Invitation declined', 'success');
    },
    [profile, showToast]
  );

  const value: PurohitContextType = {
    profile,
    profileLoading,
    refreshProfile,
    updateProfile,
    fetchPurohitByUid,
    mintPurohitIdentity,
    applications,
    myApplication,
    submitApplication,
    endorsements,
    effectiveTier,
    claimTierAdvancement,
    openGigs,
    myGigs,
    myPostedGigs,
    postGig,
    acceptGig,
    advanceGig,
    cancelGig,
    reviewsForPurohit,
    myReceivedReviews,
    submitReview,
    hasReviewed,
    availability,
    saveAvailability,
    browsePurohits,
    getPurohit,
    getEndorsements,
    endorsePurohit,
    myInvites,
    invitePurohit,
    respondToInvite,
  };

  return <PurohitContext.Provider value={value}>{children}</PurohitContext.Provider>;
};
