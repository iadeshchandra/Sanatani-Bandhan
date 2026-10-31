/**
 * JyotishContext — data layer for the org-independent Jyotish One system.
 * ======================================================================
 * Serves TWO surfaces:
 *  1. The jyotishi personal workspace (sessionKind === 'jyotish'): profile,
 *     own consultations, applications, endorsements, reviews, availability,
 *     invites, chat.
 *  2. The devotee marketplace (org / solo / B2C sessions): public
 *     consultation listings, posting requirements, booking a jyotishi,
 *     confirming / rating completed consultations.
 *
 * All collections here are GLOBAL (not workspace-scoped) by design — a
 * jyotishi belongs to no organisation. Firestore rules enforce party-scoped
 * writes AND reads: profiles are public WITHOUT contact fields (phone /
 * email live in the owner-only jyotishProfiles/{id}/private/self subdoc),
 * consultations are party-only, and the open board reads the PII-free
 * jyotishTenders projection (JY-02).
 *
 * Mirrors PurohitContext's proven architecture. Collection names:
 *   jyotishProfiles (+ /private/self), jyotishApplications,
 *   jyotishConsultations, jyotishConsultations/{id}/messages,
 *   jyotishTenders, jyotishReviews, jyotishAvailability,
 *   jyotishEndorsements, jyotishInvites, jyotishReferrals.
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
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from './AuthWorkspaceContext';
import { useToast } from './ToastContext';
import {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  settleReferralCredit,
} from '../lib/sevaPro/referrals';
import { nextProfileAggregate } from '../lib/ratingAggregate';import {
  Consultation,
  ConsultationMessage,
  ConsultationReview,
  ConsultationStatus,
  JyotishApplication,
  JyotishAvailability,
  JyotishEndorsement,
  JyotishIdentity,
  JyotishInvite,
  RemedyReferral,
  computeEffectiveTier,
  generateJyotishId,
} from '../types/jyotish';

interface JyotishContextType {
  // Identity
  profile: JyotishIdentity | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<JyotishIdentity>) => Promise<void>;
  /** One-shot lookup of a jyotishi identity by Firebase uid. */
  fetchJyotishByUid: (targetUid: string) => Promise<JyotishIdentity | null>;
  /** Mints a Universal Jyotish ID + identity doc, linked to an existing Firebase account. */
  mintJyotishIdentity: (data: {
    uid: string;
    email?: string;
    displayName: string;
    phone: string;
    city: string;
    state?: string;
    languages: string[];
    specializations: string[];
    parampara?: string;
    source: 'independent' | 'devotee_upgrade';
  }) => Promise<JyotishIdentity>;

  // Verification
  applications: JyotishApplication[];
  myApplication: JyotishApplication | null;
  submitApplication: (app: Omit<JyotishApplication, 'id' | 'uid' | 'jyotishId' | 'displayName' | 'status' | 'createdAt'>) => Promise<void>;
  endorsements: JyotishEndorsement[];
  effectiveTier: import('../types/jyotish').JyotishVerificationTier | null;
  claimTierAdvancement: () => Promise<void>;

  // Consultations
  openConsultations: Consultation[];
  myConsultations: Consultation[];
  myPostedConsultations: Consultation[];
  postConsultation: (c: Omit<Consultation, 'id' | 'devoteeUid' | 'devoteeName' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  acceptConsultation: (c: Consultation) => Promise<void>;
  advanceConsultation: (c: Consultation, next: ConsultationStatus) => Promise<void>;
  cancelConsultation: (c: Consultation) => Promise<void>;
  setSessionLink: (c: Consultation, link: string) => Promise<void>;

  // Reviews
  reviewsForJyotish: (jyotishId: string) => Promise<ConsultationReview[]>;
  myReceivedReviews: ConsultationReview[];
  submitReview: (c: Consultation, rating: number, note: string) => Promise<void>;
  hasReviewed: (consultationId: string) => boolean;

  // Availability
  availability: JyotishAvailability | null;
  saveAvailability: (slots: Record<string, boolean>) => Promise<void>;

  // Marketplace browsing (public)
  browseJyotishis: (filters: { city?: string; specialization?: string; language?: string }) => Promise<JyotishIdentity[]>;
  getJyotish: (jyotishId: string) => Promise<JyotishIdentity | null>;
  getEndorsements: (jyotishId: string) => Promise<JyotishEndorsement[]>;
  endorseJyotish: (jyotishId: string, text: string, consultationCount: number) => Promise<void>;

  // Invites (org → jyotishi)
  myInvites: JyotishInvite[];
  inviteJyotish: (jyotish: JyotishIdentity, message?: string) => Promise<void>;
  respondToInvite: (invite: JyotishInvite, accept: boolean) => Promise<void>;

  // Chat
  sendMessage: (c: Consultation, text: string) => Promise<void>;

  // Cross-referrals (jyotish ↔ purohit)
  referProfessional: (args: {
    toRoleId: string;
    toName: string;
    toKind: 'jyotish' | 'purohit';
    toTier: import('../types/jyotish').JyotishVerificationTier;
    reason: string;
    consultationId?: string;
  }) => Promise<void>;
  myReferrals: RemedyReferral[];
}

const JyotishContext = createContext<JyotishContextType | undefined>(undefined);

export const useJyotish = (): JyotishContextType => {
  const ctx = useContext(JyotishContext);
  if (!ctx) throw new Error('useJyotish must be used inside JyotishProvider');
  return ctx;
};

const now = () => Date.now();

export const JyotishProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, activeWorkspace, currentRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const uid = firebaseUser?.uid || null;

  const [profile, setProfile] = useState<JyotishIdentity | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [openConsultations, setOpenConsultations] = useState<Consultation[]>([]);
  const [myConsultations, setMyConsultations] = useState<Consultation[]>([]);
  const [myPostedConsultations, setMyPostedConsultations] = useState<Consultation[]>([]);
  const [applications, setApplications] = useState<JyotishApplication[]>([]);
  const [endorsements, setEndorsements] = useState<JyotishEndorsement[]>([]);
  const [availability, setAvailability] = useState<JyotishAvailability | null>(null);
  const [myInvites, setMyInvites] = useState<JyotishInvite[]>([]);
  const [myReferrals, setMyReferrals] = useState<RemedyReferral[]>([]);

  // ---- Identity ---------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const q = query(collection(db, 'jyotishProfiles'), where('uid', '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const base = { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as JyotishIdentity;
        // JY-02: contact fields live in the owner-only private/self
        // subdoc — merge them into the in-memory identity (they are
        // never read from, or written back to, the public profile doc).
        try {
          const privRef = doc(db, 'jyotishProfiles', base.id, 'private', 'self');
          const priv = await getDoc(privRef);
          if (priv.exists()) {
            const pd = priv.data() as any;
            if (pd.phone) base.phone = pd.phone;
            if (pd.email) base.email = pd.email;
          } else if ((base as any).phone || (base as any).email) {
            // Legacy profile still carrying contact fields on the PUBLIC
            // doc: move them into private/self and scrub the public doc
            // (best-effort — rules permit removal, forbid change).
            await setDoc(privRef, { phone: base.phone || '', email: base.email || '', updatedAt: now() });
            await updateDoc(doc(db, 'jyotishProfiles', base.id), {
              phone: deleteField(),
              email: deleteField(),
              updatedAt: now(),
            });
          }
        } catch {
          /* contact merge is best-effort; the profile itself loaded */
        }
        setProfile(base);
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
    async (updates: Partial<JyotishIdentity>) => {
      if (!profile) return;
      // Client-side guard mirrors the rules: tier/aggregates/uid are immutable here.
      const { verificationTier, ratingAggregate, ratingCount, completedConsultations, uid: _u, id: _i, ...rest } = updates as any;
      // JY-02: phone/email are contact fields — they go to the owner-only
      // private/self subdoc, NEVER the public profile doc.
      const { phone, email, ...safe } = rest;
      if (phone !== undefined || email !== undefined) {
        await setDoc(
          doc(db, 'jyotishProfiles', profile.id, 'private', 'self'),
          {
            ...(phone !== undefined ? { phone } : {}),
            ...(email !== undefined ? { email } : {}),
            updatedAt: now(),
          },
          { merge: true }
        );
      }
      await updateDoc(doc(db, 'jyotishProfiles', profile.id), { ...safe, updatedAt: now() });
      setProfile((p) =>
        p
          ? {
              ...p,
              ...safe,
              ...(phone !== undefined ? { phone } : {}),
              ...(email !== undefined ? { email } : {}),
              updatedAt: now(),
            }
          : p
      );
      showToast('Profile updated', 'success');
    },
    [profile, showToast]
  );

  const fetchJyotishByUid = useCallback(async (targetUid: string): Promise<JyotishIdentity | null> => {
    if (!targetUid) return null;
    try {
      const snap = await getDocs(query(collection(db, 'jyotishProfiles'), where('uid', '==', targetUid), limit(1)));
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as JyotishIdentity;
    } catch {
      return null;
    }
  }, []);

  const mintJyotishIdentity = useCallback(
    async (data: {
      uid: string;
      email?: string;
      displayName: string;
      phone: string;
      city: string;
      state?: string;
      languages: string[];
      specializations: string[];
      parampara?: string;
      source: 'independent' | 'devotee_upgrade';
    }): Promise<JyotishIdentity> => {
      const existing = await fetchJyotishByUid(data.uid);
      if (existing) {
        throw new Error(`You already have a jyotishi identity (${existing.id}).`);
      }
      // Uniqueness loop: generate → check doc existence → retry on collision.
      let jyotishId = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = generateJyotishId();
        const probe = await getDoc(doc(db, 'jyotishProfiles', candidate));
        if (!probe.exists()) {
          jyotishId = candidate;
          break;
        }
      }
      if (!jyotishId) throw new Error('Could not generate a unique Jyotish ID — please try again.');
      const ts = now();
      const identity: JyotishIdentity = {
        id: jyotishId,
        uid: data.uid,
        displayName: data.displayName.trim(),
        phone: data.phone.trim(),
        email: data.email || undefined,
        city: data.city.trim(),
        state: data.state?.trim() || undefined,
        languages: data.languages,
        specializations: data.specializations,
        parampara: data.parampara?.trim() || undefined,
        experienceYears: 0,
        verificationTier: 'REGISTERED',
        ratingAggregate: 0,
        ratingCount: 0,
        completedConsultations: 0,
        source: data.source,
        createdAt: ts,
        updatedAt: ts,
      };
      // JY-02: the public profile doc is born WITHOUT contact fields;
      // phone/email go to the owner-only private/self subdoc (mirrors
      // sanataniProfiles/{uid}/private/self). Best-effort: if the subdoc
      // write fails, the owner re-saves contact from the Profile tab.
      const { phone: contactPhone, email: contactEmail, ...publicIdentity } = identity;
      await setDoc(doc(db, 'jyotishProfiles', jyotishId), publicIdentity);
      try {
        await setDoc(doc(db, 'jyotishProfiles', jyotishId, 'private', 'self'), {
          phone: contactPhone || '',
          email: contactEmail || '',
          updatedAt: ts,
        });
      } catch {
        /* identity minted; contact re-saves via updateProfile */
      }
      setProfile(identity);
      return identity;
    },
    [fetchJyotishByUid]
  );

  // ---- Verification ------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setApplications([]);
      setEndorsements([]);
      return;
    }
    const unsubApps = onSnapshot(
      query(collection(db, 'jyotishApplications'), where('jyotishId', '==', profile.id)),
      (snap) => setApplications(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as JyotishApplication))),
      () => setApplications([])
    );
    const unsubEnd = onSnapshot(
      query(collection(db, 'jyotishEndorsements'), where('jyotishId', '==', profile.id)),
      (snap) => setEndorsements(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as JyotishEndorsement))),
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
    return computeEffectiveTier(profile.verificationTier, endorsements.length, profile.completedConsultations, profile.ratingAggregate);
  }, [profile, endorsements.length]);

  const submitApplication = useCallback(
    async (app: Omit<JyotishApplication, 'id' | 'uid' | 'jyotishId' | 'displayName' | 'status' | 'createdAt'>) => {
      if (!profile || !uid) throw new Error('Not signed in as a jyotishi');
      const ref = doc(collection(db, 'jyotishApplications'));
      await setDoc(ref, {
        ...app,
        id: ref.id,
        uid,
        jyotishId: profile.id,
        displayName: profile.displayName,
        status: 'PENDING',
        createdAt: now(),
      });
      showToast('Application submitted for review', 'success');
    },
    [profile, uid, showToast]
  );

  const claimTierAdvancement = useCallback(async () => {
    if (!profile || !effectiveTier || effectiveTier === profile.verificationTier) return;
    await updateDoc(doc(db, 'jyotishProfiles', profile.id), { verificationTier: effectiveTier, updatedAt: now() });
    setProfile((p) => (p ? { ...p, verificationTier: effectiveTier } : p));
    showToast(`Tier advanced: ${effectiveTier.replace(/_/g, ' ')}`, 'success');
  }, [profile, effectiveTier, showToast]);

  // ---- Consultations ------------------------------------------------------
  // JY-02: the open board reads the PII-free jyotishTenders projection,
  // and only jyotish-profile holders subscribe (rules enforce the same).
  // The full consultation docs are party-scoped — they are never listed
  // to non-parties, so birth details / phone / notes cannot leak here.
  useEffect(() => {
    if (!profile) {
      setOpenConsultations([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishTenders'), where('status', '==', 'OPEN'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => setOpenConsultations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as unknown as Consultation))),
      () => setOpenConsultations([])
    );
    return () => unsub();
  }, [profile?.id]);

  useEffect(() => {
    if (!uid) {
      setMyConsultations([]);
      setMyPostedConsultations([]);
      return;
    }
    const unsubA = onSnapshot(
      query(collection(db, 'jyotishConsultations'), where('assignedJyotishUid', '==', uid), orderBy('updatedAt', 'desc')),
      (snap) => setMyConsultations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Consultation))),
      () => setMyConsultations([])
    );
    const unsubP = onSnapshot(
      query(collection(db, 'jyotishConsultations'), where('devoteeUid', '==', uid), orderBy('updatedAt', 'desc')),
      (snap) => setMyPostedConsultations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Consultation))),
      () => setMyPostedConsultations([])
    );
    return () => {
      unsubA();
      unsubP();
    };
  }, [uid]);

  const postConsultation = useCallback(
    async (c: Omit<Consultation, 'id' | 'devoteeUid' | 'devoteeName' | 'status' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) throw new Error('Sign in to post a consultation requirement');
      const devoteeName = (firebaseUser?.displayName as string) || firebaseUser?.email || 'Devotee';
      const ref = doc(collection(db, 'jyotishConsultations'));
      const ts = now();
      await setDoc(ref, { ...c, id: ref.id, devoteeUid: uid, devoteeName, status: 'OPEN', createdAt: ts, updatedAt: ts });
      // JY-02: the board projection — ONLY the whitelisted safe fields
      // (rules pin the list; birth details / phone / notes never copy).
      try {
        await setDoc(doc(db, 'jyotishTenders', ref.id), {
          id: ref.id,
          consultationType: c.consultationType,
          topicSummary: (c.topicSummary || '').slice(0, 200),
          mode: c.mode,
          city: c.city,
          language: c.language,
          preferredDate: c.preferredDate,
          budgetMin: c.budgetMin,
          budgetMax: c.budgetMax,
          devoteeUid: uid,
          devoteeName,
          status: 'OPEN',
          createdAt: ts,
        });
      } catch {
        /* the consultation itself posted; the board projection is
           re-creatable and its absence only hides this one listing */
      }
      showToast('Requirement posted — jyotishis can now respond', 'success');
      return ref.id;
    },
    [uid, firebaseUser, showToast]
  );

  const acceptConsultation = useCallback(
    async (c: Consultation) => {
      if (!profile || !uid) throw new Error('Not signed in as a jyotishi');
      if (c.status !== 'OPEN') throw new Error('Consultation is no longer open');
      await updateDoc(doc(db, 'jyotishConsultations', c.id), {
        status: 'ASSIGNED',
        assignedJyotishId: profile.id,
        assignedJyotishUid: uid,
        assignedJyotishName: profile.displayName,
        updatedAt: now(),
      });
      // JY-02: retire the board projection. Best-effort — a leftover
      // tender is inert (accepting against it is rules-denied once the
      // consultation is ASSIGNED) and carries no PII by construction.
      try {
        await deleteDoc(doc(db, 'jyotishTenders', c.id));
      } catch {
        /* stale tender cleanup is retryable; never blocks the accept */
      }
      showToast('Consultation accepted — coordinate with the devotee', 'success');
    },
    [profile, uid, showToast]
  );

  const advanceConsultation = useCallback(
    async (c: Consultation, next: ConsultationStatus) => {
      const allowed: Record<ConsultationStatus, ConsultationStatus[]> = {
        OPEN: ['ASSIGNED', 'CANCELLED'],
        ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: ['DAKSHINA_RELEASED'],
        DAKSHINA_RELEASED: [],
        CANCELLED: [],
      };
      if (!allowed[c.status].includes(next)) throw new Error(`Cannot move ${c.status} → ${next}`);
      await updateDoc(doc(db, 'jyotishConsultations', c.id), { status: next, updatedAt: now() });
      // JY-02: an unassigned OPEN post that gets cancelled leaves the
      // board too (direct bookings never had a tender — nothing to do).
      if (next === 'CANCELLED' && c.status === 'OPEN' && !c.assignedJyotishUid) {
        try {
          await deleteDoc(doc(db, 'jyotishTenders', c.id));
        } catch {
          /* best-effort board cleanup; the tender carries no PII */
        }
      }
      if (next === 'DAKSHINA_RELEASED' && (c as Consultation).referredBy) {
        // Seva Pro Phase 4: settle the referrer's guidance credit. Best-effort —
        // rules re-validate everything against the completed consultation.
        try {
          await settleReferralCredit({
            orderId: c.id,
            orderType: 'consultation',
            platformCommissionPercent: DEFAULT_PLATFORM_COMMISSION_PERCENT,
          });
        } catch {
          /* settlement is retryable from the referral dashboard */
        }
      }
      if (next === 'COMPLETED' && profile) {        try {
          // SECURITY P1: rules accept the +1 only with
          // lastCompletedConsultationId naming THIS consultation —
          // really the jyotishi's, really COMPLETED.
          await updateDoc(doc(db, 'jyotishProfiles', profile.id), {
            completedConsultations: (profile.completedConsultations || 0) + 1,
            lastCompletedConsultationId: c.id,
            updatedAt: now(),
          });
          setProfile((p) => (p ? { ...p, completedConsultations: (p.completedConsultations || 0) + 1, lastCompletedConsultationId: c.id } : p));
        } catch {
          /* counter write failed — non-fatal */
        }
      }
      showToast(`Consultation ${next.replace(/_/g, ' ').toLowerCase()}`, 'success');
    },
    [profile, showToast]
  );

  const cancelConsultation = useCallback(
    async (c: Consultation) => {
      await advanceConsultation(c, 'CANCELLED');
    },
    [advanceConsultation]
  );

  /** Sets the scheduled call/video session link (honest workflow-only — no telephony). */
  const setSessionLink = useCallback(
    async (c: Consultation, link: string) => {
      await updateDoc(doc(db, 'jyotishConsultations', c.id), { sessionLink: link.slice(0, 500), updatedAt: now() });
      showToast('Session link saved', 'success');
    },
    []
  );

  // ---- Reviews -------------------------------------------------------------
  const reviewDocId = (consultationId: string, reviewerUid: string, kind: 'devotee' | 'jyotish') =>
    `${consultationId}_${reviewerUid}_${kind}`;

  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [receivedReviews, setReceivedReviews] = useState<ConsultationReview[]>([]);

  const hasReviewed = useCallback((consultationId: string) => reviewedIds.has(consultationId), [reviewedIds]);

  // SECURITY P1 (Finding 1): the old absolute "recompute" write is
  // gone — it depended on rules letting ANY signed-in user set the
  // aggregate to ANY value. The aggregate now moves only inside
  // submitReview's transaction, anchored to the review being written
  // (see lib/ratingAggregate for the law the rules enforce).

  const submitReview = useCallback(
    async (c: Consultation, rating: number, note: string) => {
      if (!uid) throw new Error('Sign in to review');
      const isDevotee = c.devoteeUid === uid;
      const isJyotish = c.assignedJyotishUid === uid;
      if (!isDevotee && !isJyotish) throw new Error('You can only rate consultations you were party to.');
      if (c.status !== 'COMPLETED' && c.status !== 'DAKSHINA_RELEASED') {
        throw new Error('Ratings open after the consultation is marked complete.');
      }
      const kind = isDevotee ? 'devotee' : 'jyotish';
      const id = reviewDocId(c.id, uid, kind);
      const existing = await getDoc(doc(db, 'jyotishReviews', id));
      if (existing.exists()) throw new Error('You have already rated this consultation.');
      const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
      const payload = {
        id,
        consultationId: c.id,
        reviewerUid: uid,
        reviewerKind: kind,
        reviewerName: isDevotee ? c.devoteeName : c.assignedJyotishName || 'Jyotishi',
        rating: cleanRating,
        note: note.slice(0, 500),
        createdAt: now(),
      };
      if (isDevotee && c.assignedJyotishId) {
        // Anchored aggregate: review + the one legal aggregate step in
        // a single transaction; rules re-verify via lastReviewId.
        const profRef = doc(db, 'jyotishProfiles', c.assignedJyotishId);
        const revRef = doc(db, 'jyotishReviews', id);
        await runTransaction(db, async (tx) => {
          const profSnap = await tx.get(profRef);
          tx.set(revRef, payload);
          if (profSnap.exists()) {
            const cur = profSnap.data() as any;
            const next = nextProfileAggregate(
              Number(cur.ratingAggregate || 0),
              Number(cur.ratingCount || 0),
              cleanRating
            );
            tx.update(profRef, {
              ratingAggregate: next.ratingAggregate,
              ratingCount: next.ratingCount,
              lastReviewId: id,
              updatedAt: now(),
            });
          }
        });
      } else {
        await setDoc(doc(db, 'jyotishReviews', id), payload);
      }
      setReviewedIds((s) => new Set(s).add(c.id));
      showToast('Dhanyavaad — your rating was recorded', 'success');
    },
    [uid, showToast]
  );

  const reviewsForJyotish = useCallback(async (jyotishId: string): Promise<ConsultationReview[]> => {
    // JY-02: consultations are party-scoped in rules now, so the lookup
    // must be provably the caller's own — query by assignedJyotishUid
    // (the caller's uid ⇔ their jyotishId; this is only ever invoked
    // for the caller's own profile). A by-jyotishId query is no longer
    // rules-provable for anyone but a party/admin and would be denied.
    if (!uid) return [];
    const gsnap = await getDocs(query(collection(db, 'jyotishConsultations'), where('assignedJyotishUid', '==', uid), limit(100)));
    const cIds = new Set(gsnap.docs.map((d) => d.id));
    if (cIds.size === 0) return [];
    const rsnap = await getDocs(query(collection(db, 'jyotishReviews'), where('reviewerKind', '==', 'devotee')));
    return rsnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) } as ConsultationReview))
      .filter((r) => cIds.has(r.consultationId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [uid]);

  const myReceivedReviews = receivedReviews;

  useEffect(() => {
    if (!profile) {
      setReceivedReviews([]);
      return;
    }
    let cancelled = false;
    reviewsForJyotish(profile.id)
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
  }, [profile?.id, myConsultations.length]);

  // ---- Availability ----------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setAvailability(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'jyotishAvailability', profile.id),
      (snap) => setAvailability(snap.exists() ? ({ jyotishId: profile.id, ...(snap.data() as any) } as JyotishAvailability) : null),
      () => setAvailability(null)
    );
    return () => unsub();
  }, [profile?.id]);

  const saveAvailability = useCallback(
    async (slots: Record<string, boolean>) => {
      if (!profile) return;
      await setDoc(doc(db, 'jyotishAvailability', profile.id), { jyotishId: profile.id, slots, updatedAt: now() });
      showToast('Availability saved', 'success');
    },
    [profile, showToast]
  );

  // ---- Marketplace browsing ----------------------------------------------------
  const browseJyotishis = useCallback(
    async (filters: { city?: string; specialization?: string; language?: string }) => {
      const snap = await getDocs(query(collection(db, 'jyotishProfiles'), limit(100)));
      let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as JyotishIdentity));
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
      const rank: Record<string, number> = { PLATFORM_VERIFIED: 0, ORG_ENDORSED: 1, CREDENTIAL_VERIFIED: 2, REGISTERED: 3 };
      return list.sort(
        (a, b) => (rank[a.verificationTier] ?? 3) - (rank[b.verificationTier] ?? 3) || (b.ratingAggregate || 0) - (a.ratingAggregate || 0)
      );
    },
    []
  );

  const getJyotish = useCallback(async (jyotishId: string) => {
    const snap = await getDoc(doc(db, 'jyotishProfiles', jyotishId));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as JyotishIdentity) : null;
  }, []);

  const getEndorsements = useCallback(async (jyotishId: string) => {
    const snap = await getDocs(query(collection(db, 'jyotishEndorsements'), where('jyotishId', '==', jyotishId)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as JyotishEndorsement));
  }, []);

  const endorseJyotish = useCallback(
    async (jyotishId: string, text: string, consultationCount: number) => {
      if (!uid) throw new Error('Sign in to endorse');
      if (!activeWorkspace || activeWorkspace.id.startsWith('DEMO_')) {
        throw new Error('Endorsements need a real organisation workspace.');
      }
      const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);
      if (!isTrusteeLike) throw new Error('Only a Trustee can endorse on behalf of the organisation.');
      const ref = doc(collection(db, 'jyotishEndorsements'));
      await setDoc(ref, {
        id: ref.id,
        orgId: activeWorkspace.id,
        orgName: activeWorkspace.name,
        orgType: (activeWorkspace as any).type || (activeWorkspace as any).orgType || 'Organisation',
        jyotishId,
        endorserUid: uid,
        text: text.slice(0, 500),
        consultationCount: Math.max(0, Math.floor(consultationCount)),
        createdAt: now(),
      });
      try {
        const jsnap = await getDoc(doc(db, 'jyotishProfiles', jyotishId));
        if (jsnap.exists() && (jsnap.data() as any).verificationTier === 'CREDENTIAL_VERIFIED') {
          await updateDoc(doc(db, 'jyotishProfiles', jyotishId), { verificationTier: 'ORG_ENDORSED', updatedAt: now() });
        }
      } catch {
        /* tier sync is best-effort; admin can sync */
      }
      showToast('Endorsement recorded', 'success');
    },
    [uid, activeWorkspace, currentRole, showToast]
  );

  // ---- Invites -------------------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      setMyInvites([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishInvites'), where('jyotishId', '==', profile.id), orderBy('createdAt', 'desc')),
      (snap) => setMyInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as JyotishInvite))),
      () => setMyInvites([])
    );
    return () => unsub();
  }, [profile?.id]);

  const inviteJyotish = useCallback(
    async (jyotish: JyotishIdentity, message?: string) => {
      if (!uid) throw new Error('Sign in to invite');
      if (!activeWorkspace || activeWorkspace.id.startsWith('DEMO_')) {
        throw new Error('Invites need a real organisation workspace.');
      }
      const isTrusteeLike = ['Trustee', 'SuperAdmin'].includes(currentRole as string);
      if (!isTrusteeLike) throw new Error('Only a Trustee can invite.');
      const ref = doc(collection(db, 'jyotishInvites'));
      await setDoc(ref, {
        id: ref.id,
        jyotishId: jyotish.id,
        jyotishUid: jyotish.uid,
        jyotishName: jyotish.displayName,
        orgId: activeWorkspace.id,
        orgName: activeWorkspace.name,
        inviterUid: uid,
        message: (message || '').slice(0, 300),
        status: 'PENDING',
        createdAt: now(),
      });
      showToast(`Invitation sent to ${jyotish.displayName}`, 'success');
    },
    [uid, activeWorkspace, currentRole, showToast]
  );

  const respondToInvite = useCallback(
    async (invite: JyotishInvite, accept: boolean) => {
      if (!profile) return;
      await updateDoc(doc(db, 'jyotishInvites', invite.id), { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: now() });
      if (accept) {
        await updateDoc(doc(db, 'jyotishProfiles', profile.id), {
          linkedOrgId: invite.orgId,
          linkedOrgName: invite.orgName,
          updatedAt: now(),
        });
        setProfile((p) => (p ? { ...p, linkedOrgId: invite.orgId, linkedOrgName: invite.orgName } : p));
      }
      showToast(accept ? 'Invitation accepted' : 'Invitation declined', 'success');
    },
    [profile, showToast]
  );

  // ---- Chat ----------------------------------------------------------------------
  // Messages live at jyotishConsultations/{id}/messages. Party-scoped by
  // rules. Use the exported useConsultationMessages(consultationId) hook
  // below for the live list; sendMessage writes.

  const sendMessage = useCallback(
    async (c: Consultation, text: string) => {
      if (!uid) throw new Error('Sign in to chat');
      const trimmed = text.trim().slice(0, 1000);
      if (!trimmed) return;
      const isDevotee = c.devoteeUid === uid;
      const ref = doc(collection(db, 'jyotishConsultations', c.id, 'messages'));
      await setDoc(ref, {
        id: ref.id,
        senderUid: uid,
        senderName: isDevotee ? c.devoteeName : c.assignedJyotishName || 'Jyotishi',
        senderKind: isDevotee ? 'devotee' : 'jyotish',
        text: trimmed,
        createdAt: now(),
      });
    },
    [uid]
  );

  // ---- Cross-referrals -------------------------------------------------------------
  // A jyotishi recommends a verified purohit for remedies (upaya/parihara);
  // a purohit recommends a verified jyotishi. Both sides are badge-verified
  // before a referral can name them (UI + rules).
  useEffect(() => {
    if (!uid) {
      setMyReferrals([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishReferrals'), where('fromUid', '==', uid), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => setMyReferrals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RemedyReferral))),
      () => setMyReferrals([])
    );
    return () => unsub();
  }, [uid]);

  const referProfessional = useCallback(
    async (args: {
      toRoleId: string;
      toName: string;
      toKind: 'jyotish' | 'purohit';
      toTier: import('../types/jyotish').JyotishVerificationTier;
      reason: string;
      consultationId?: string;
    }) => {
      if (!uid) throw new Error('Sign in to refer');
      if (!profile) throw new Error('Only a registered jyotishi can refer');
      const ref = doc(collection(db, 'jyotishReferrals'));
      await setDoc(ref, {
        id: ref.id,
        consultationId: args.consultationId || '',
        fromUid: uid,
        fromName: profile.displayName,
        fromKind: 'jyotish',
        fromRoleId: profile.id,
        toRoleId: args.toRoleId,
        toName: args.toName,
        toKind: args.toKind,
        toTier: args.toTier,
        reason: args.reason.slice(0, 500),
        createdAt: now(),
      });
      showToast(`Referral sent — ${args.toName} will see it on their profile`, 'success');
    },
    [uid, profile, showToast]
  );

  // Referrals RECEIVED by this jyotishi (from purohits).
  const [receivedReferrals, setReceivedReferrals] = useState<RemedyReferral[]>([]);
  useEffect(() => {
    if (!profile) {
      setReceivedReferrals([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishReferrals'), where('toRoleId', '==', profile.id), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => setReceivedReferrals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RemedyReferral))),
      () => setReceivedReferrals([])
    );
    return () => unsub();
  }, [profile?.id]);

  const value: JyotishContextType = {
    profile,
    profileLoading,
    refreshProfile,
    updateProfile,
    fetchJyotishByUid,
    mintJyotishIdentity,
    applications,
    myApplication,
    submitApplication,
    endorsements,
    effectiveTier,
    claimTierAdvancement,
    openConsultations,
    myConsultations,
    myPostedConsultations,
    postConsultation,
    acceptConsultation,
    advanceConsultation,
    cancelConsultation,
    setSessionLink,
    reviewsForJyotish,
    myReceivedReviews,
    submitReview,
    hasReviewed,
    availability,
    saveAvailability,
    browseJyotishis,
    getJyotish,
    getEndorsements,
    endorseJyotish,
    myInvites,
    inviteJyotish,
    respondToInvite,
    sendMessage,
    referProfessional,
    myReferrals,
  };

  return <JyotishContext.Provider value={value}>{children}</JyotishContext.Provider>;
};

// Live message list for one consultation. Hook form (not on the context
// value) because it needs a per-consultation subscription.
export function useConsultationMessages(consultationId: string | null): ConsultationMessage[] {
  const [msgs, setMsgs] = useState<ConsultationMessage[]>([]);
  useEffect(() => {
    if (!consultationId) {
      setMsgs([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishConsultations', consultationId, 'messages'), orderBy('createdAt', 'asc'), limit(200)),
      (snap) => setMsgs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ConsultationMessage))),
      () => setMsgs([])
    );
    return () => unsub();
  }, [consultationId]);
  return msgs;
}

export type { ConsultationMessage };
