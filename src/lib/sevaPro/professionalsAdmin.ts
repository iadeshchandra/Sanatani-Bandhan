/**
 * professionalsAdmin.ts — GodMode operations for the Pratham Seva program.
 * ========================================================================
 * Spark-native owner ops (same posture as firestoreAdmin): every function
 * calls requireOwner() — the signed-in UID must equal OWNER_UID. All
 * mutating ops append an audit_logs entry (never throws).
 *
 * Covered operations:
 *  - listPendingApplications(): PENDING docs from purohitApplications +
 *    jyotishApplications (single-where queries, client-side merge/sort —
 *    avoids composite indexes).
 *  - approveApplication(appId, kind): honors the credentials → application
 *    APPROVED, profile tier → CREDENTIAL_VERIFIED (the canonical pipeline
 *    dialect, via tierMapping — JY-FIX-B/JY-03), welcome reward granted
 *    (freeSevasRemaining from the global config).
 *  - rejectApplication(appId, kind, reason): reason REQUIRED (applicant sees
 *    it); the GodMode UI enforces this before calling.
 *  - adjustFreeSevas / grantBonusFreeSevas / setCommissionSchedule /
 *    setBoostUntil / setTierManual (with audit note) — per-professional
 *    controls on purohits / jyotishProfiles docs.
 *  - getPrathamConfig / savePrathamConfig — the single global config doc
 *    `prathamSevaConfig/global`.
 *
 * Wire-up: add thin wrappers in src/lib/adminApi.ts (see
 * patches/adminApi.ts.patch) so the Professionals tab degrades gracefully
 * via withFallback like every other GodMode op.
 */
import {
  collection, doc, getDoc, getDocs, query, where, limit,
  updateDoc, setDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OWNER_UID, OWNER_EMAIL, isOwnerUid } from '../firestoreAdmin';
import {
  DEFAULT_PRATHAM_CONFIG, PRATHAM_CONFIG_DOC_ID, buildWelcomeRewardGrant,
  addBonusFreeSevas, sanitizeConfig, type PrathamSevaConfig,
} from './prathamSeva';
import type { SevaProTier } from './tiers';
import { sevaProTierToPurohitTier, purohitTierToSevaProTier, normalizePurohitTier } from './tierMapping';

export type ProfessionalKind = 'purohit' | 'jyotish';

const APP_COLLECTIONS: Record<ProfessionalKind, string> = {
  purohit: 'purohitApplications',
  jyotish: 'jyotishApplications',
};
const PROFILE_COLLECTIONS: Record<ProfessionalKind, string> = {
  purohit: 'purohits',
  jyotish: 'jyotishProfiles',
};
const PROFILE_ID_FIELDS: Record<ProfessionalKind, string> = {
  purohit: 'purohitId',
  jyotish: 'jyotishId',
};

function requireOwner(): string {
  const uid = auth.currentUser?.uid;
  if (!isOwnerUid(uid)) throw new Error('Owner only.');
  return OWNER_UID;
}

async function writeAudit(
  action: string,
  details: Record<string, any> = {},
  severity: 'info' | 'warn' | 'critical' = 'info'
): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actorUid: OWNER_UID,
      actorEmail: auth.currentUser?.email || OWNER_EMAIL,
      details,
      severity,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('[professionalsAdmin] audit write failed:', action, e);
  }
}

const tsIso = (v: any): string | undefined => {
  try {
    if (!v) return undefined;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return new Date(v).toISOString();
    if (v.toDate) return v.toDate().toISOString();
    return undefined;
  } catch { return undefined; }
};

export interface PendingApplication {
  id: string;
  kind: ProfessionalKind;
  profileId: string;
  applicantUid: string;
  displayName: string;
  status: string;
  /** Credential checklist payload (URLs/notes supplied by the applicant). */
  documents?: Record<string, any>;
  certificates?: string[];
  gurukulAffiliation?: string;
  idProofType?: string;
  experienceYears?: number;
  specializations?: string[];
  languages?: string[];
  city?: string;
  phone?: string;
  createdAt?: string;
}

/* ------------------------------ Read ops ------------------------------ */

/** All PENDING applications across both professions, newest first. */
export async function listPendingApplications(): Promise<PendingApplication[]> {
  requireOwner();
  const out: PendingApplication[] = [];
  for (const kind of ['purohit', 'jyotish'] as ProfessionalKind[]) {
    const snap = await getDocs(
      query(collection(db, APP_COLLECTIONS[kind]), where('status', '==', 'PENDING'), limit(100))
    );
    for (const d of snap.docs) {
      const v: any = d.data();
      out.push({
        id: d.id,
        kind,
        profileId: v[PROFILE_ID_FIELDS[kind]] || v.profileId || '',
        applicantUid: v.uid || v.applicantUid || '',
        displayName: v.displayName || '—',
        status: v.status,
        documents: v.documents || undefined,
        certificates: v.certificates || [],
        gurukulAffiliation: v.gurukulAffiliation,
        idProofType: v.idProofType,
        experienceYears: v.experienceYears,
        specializations: v.specializations || [],
        languages: v.languages || [],
        city: v.city,
        phone: v.phone,
        createdAt: tsIso(v.createdAt),
      });
    }
  }
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

export interface ProfessionalSummary {
  kind: ProfessionalKind;
  profileId: string;
  uid: string;
  displayName: string;
  verificationTier: string;
  freeSevasRemaining: number;
  completedSevasSinceVerified: number;
  boostUntil?: string;
  ratingAggregate: number;
  ratingCount: number;
  completedSevas: number;
  endorsements: number;
}

/**
 * Look up a professional by profile doc id (kind inferred from collection).
 * Used by the GodMode per-professional controls.
 */
export async function getProfessional(kind: ProfessionalKind, profileId: string): Promise<ProfessionalSummary | null> {
  requireOwner();
  const snap = await getDoc(doc(db, PROFILE_COLLECTIONS[kind], profileId));
  if (!snap.exists()) return null;
  const v: any = snap.data();
  return {
    kind,
    profileId: snap.id,
    uid: v.uid || '',
    displayName: v.displayName || '—',
    verificationTier: v.verificationTier || 'REGISTERED',
    freeSevasRemaining: Number(v.freeSevasRemaining || 0),
    completedSevasSinceVerified: Number(v.completedSevasSinceVerified || 0),
    boostUntil: tsIso(v.boostUntil),
    ratingAggregate: Number(v.ratingAggregate || 0),
    ratingCount: Number(v.ratingCount || 0),
    completedSevas: Number(v.completedGigs || v.completedConsultations || 0),
    endorsements: 0, // counted separately by callers via endorsement collections
  };
}

/* --------------------------- Decision ops ------------------------------ */

/**
 * Honor & approve: application → APPROVED, profile tier → VERIFIED,
 * welcome reward granted from the CURRENT global config.
 * Self-approval is denied (mirrors the verification pipeline).
 */
export async function approveApplication(appId: string, kind: ProfessionalKind): Promise<void> {
  const ownerUid = requireOwner();
  const appRef = doc(db, APP_COLLECTIONS[kind], appId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error('Application not found.');
  const app: any = appSnap.data();
  if (app.status !== 'PENDING') throw new Error('Application is no longer pending.');
  if (app.uid && app.uid === ownerUid) throw new Error('Self-approval is not allowed.');

  const profileId = app[PROFILE_ID_FIELDS[kind]] || app.profileId;
  if (!profileId) throw new Error('Application has no linked profile.');

  const config = await getPrathamConfig();
  const grant = buildWelcomeRewardGrant(config);
  const profileRef = doc(db, PROFILE_COLLECTIONS[kind], profileId);

  await updateDoc(appRef, {
    status: 'APPROVED',
    tier: 'VERIFIED',
    reviewedBy: ownerUid,
    reviewedAt: serverTimestamp(),
    reviewNote: 'Sacred credentials honored. Welcome to Pratham Seva.',
  });
  // Use setDoc merge so profiles that predate the reward fields still update.
  // JY-FIX-B (JY-03): the PROFILE's verificationTier speaks the canonical
  // 4-step pipeline dialect — route the program's VERIFIED through the
  // converter (→ CREDENTIAL_VERIFIED). Stamping the SevaPro dialect here
  // corrupted the ladder and crashed unguarded PUROHIT_TIER_META readers.
  // (The application doc's own `tier: 'VERIFIED'` above is the program's
  // dialect on the program's doc — that one stays.)
  await setDoc(profileRef, {
    verificationTier: sevaProTierToPurohitTier('VERIFIED'),
    ...grant,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await writeAudit('prathamSeva.approve', {
    applicationId: appId, kind, profileId,
    applicantUid: app.uid || app.applicantUid,
    freeSevasGranted: grant.freeSevasRemaining,
  });
}

/**
 * Decline with respect. `reason` is REQUIRED and shown to the applicant —
 * the GodMode UI blocks the call when empty.
 */
export async function rejectApplication(appId: string, kind: ProfessionalKind, reason: string): Promise<void> {
  const ownerUid = requireOwner();
  const clean = (reason || '').trim();
  if (!clean) throw new Error('A rejection reason is required — the applicant reads it.');
  const appRef = doc(db, APP_COLLECTIONS[kind], appId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error('Application not found.');
  const app: any = appSnap.data();
  if (app.status !== 'PENDING') throw new Error('Application is no longer pending.');

  await updateDoc(appRef, {
    status: 'REJECTED',
    rejectionReason: clean.slice(0, 500),
    reviewedBy: ownerUid,
    reviewedAt: serverTimestamp(),
  });
  await writeAudit('prathamSeva.reject', {
    applicationId: appId, kind, reason: clean.slice(0, 200),
  }, 'warn');
}

/* ----------------------- Per-professional controls ----------------------- */

async function profileRef(kind: ProfessionalKind, profileId: string) {
  const ref = doc(db, PROFILE_COLLECTIONS[kind], profileId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Professional profile not found.');
  return { ref, data: snap.data() as any };
}

/** Set (not add) the free-seva counter, with an audit trail. */
export async function adjustFreeSevas(kind: ProfessionalKind, profileId: string, next: number, note?: string): Promise<void> {
  requireOwner();
  const { ref, data } = await profileRef(kind, profileId);
  const before = Number(data.freeSevasRemaining || 0);
  const after = Math.max(0, Math.floor(Number(next) || 0));
  await updateDoc(ref, { freeSevasRemaining: after, updatedAt: serverTimestamp() });
  await writeAudit('prathamSeva.freeSevas.adjust', { kind, profileId, before, after, note: (note || '').slice(0, 200) });
}

/** Grant BONUS free sevas on top of the current counter. */
export async function grantBonusFreeSevas(kind: ProfessionalKind, profileId: string, bonus: number, note?: string): Promise<void> {
  requireOwner();
  if (!(bonus > 0)) throw new Error('Bonus must be at least 1.');
  const { ref, data } = await profileRef(kind, profileId);
  const before = Number(data.freeSevasRemaining || 0);
  const after = addBonusFreeSevas(before, bonus);
  await updateDoc(ref, { freeSevasRemaining: after, updatedAt: serverTimestamp() });
  await writeAudit('prathamSeva.freeSevas.bonus', { kind, profileId, before, after, bonus, note: (note || '').slice(0, 200) });
}

/** Override the per-professional commission schedule (eclipses the snapshot). */
export async function setCommissionSchedule(
  kind: ProfessionalKind, profileId: string, schedule: PrathamSevaConfig['commissionSchedule'], note?: string
): Promise<void> {
  requireOwner();
  const { ref } = await profileRef(kind, profileId);
  const clean = sanitizeConfig({ commissionSchedule: schedule }).commissionSchedule;
  await updateDoc(ref, {
    'prathamSevaConfigSnapshot.commissionSchedule': clean,
    updatedAt: serverTimestamp(),
  });
  await writeAudit('prathamSeva.schedule.override', { kind, profileId, schedule: clean, note: (note || '').slice(0, 200) }, 'warn');
}

/** Search-boost expiry (ISO string or null to clear). */
export async function setBoostUntil(kind: ProfessionalKind, profileId: string, untilIso: string | null): Promise<void> {
  requireOwner();
  const { ref } = await profileRef(kind, profileId);
  const payload: Record<string, any> = { updatedAt: serverTimestamp() };
  if (untilIso) {
    const t = new Date(untilIso).getTime();
    if (Number.isNaN(t) || t <= Date.now()) throw new Error('Boost expiry must be a future date.');
    payload.boostUntil = new Date(t).toISOString();
  } else {
    payload.boostUntil = null;
  }
  await updateDoc(ref, payload);
  await writeAudit('prathamSeva.boost', { kind, profileId, boostUntil: payload.boostUntil });
}

/**
 * Manual tier override — always requires an audit note, and downgrades are
 * flagged 'warn' so they stand out in the audit log.
 */
export async function setTierManual(kind: ProfessionalKind, profileId: string, tier: SevaProTier, auditNote: string): Promise<void> {
  requireOwner();
  const note = (auditNote || '').trim();
  if (!note) throw new Error('An audit note is required for a manual tier change.');
  const { ref, data } = await profileRef(kind, profileId);
  const beforeRaw = data.verificationTier || 'REGISTERED';
  // JY-FIX-B (JY-03): write the CANONICAL pipeline tier, never the raw
  // SevaPro dialect; compare ranks on the normalised stored value so a
  // legacy corrupt doc cannot fake a downgrade/upgrade direction.
  const canonical = sevaProTierToPurohitTier(tier);
  const beforeSevaPro = purohitTierToSevaProTier(normalizePurohitTier(beforeRaw));
  await updateDoc(ref, { verificationTier: canonical, updatedAt: serverTimestamp() });
  const downgrade = ['REGISTERED', 'VERIFIED', 'TRUSTED'].indexOf(tier) < ['REGISTERED', 'VERIFIED', 'TRUSTED'].indexOf(beforeSevaPro);
  await writeAudit('prathamSeva.tier.manual', { kind, profileId, before: beforeRaw, after: canonical, requestedTier: tier, note: note.slice(0, 300) }, downgrade ? 'warn' : 'info');
}

/* ------------------------------ Global config --------------------------- */

export async function getPrathamConfig(): Promise<PrathamSevaConfig> {
  requireOwner();
  const snap = await getDoc(doc(db, 'prathamSevaConfig', PRATHAM_CONFIG_DOC_ID));
  if (!snap.exists()) return { ...DEFAULT_PRATHAM_CONFIG };
  const v: any = snap.data();
  return sanitizeConfig({
    defaultFreeSevas: v.defaultFreeSevas,
    commissionSchedule: v.commissionSchedule,
    trustedBoostDays: v.trustedBoostDays,
    manualBoostDays: v.manualBoostDays,
  });
}

export async function savePrathamConfig(input: Partial<PrathamSevaConfig>): Promise<PrathamSevaConfig> {
  const ownerUid = requireOwner();
  const clean = sanitizeConfig(input);
  await setDoc(doc(db, 'prathamSevaConfig', PRATHAM_CONFIG_DOC_ID), {
    ...clean,
    updatedBy: ownerUid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await writeAudit('prathamSeva.config.save', { config: clean });
  return clean;
}

export const professionalsAdmin = {
  listPendingApplications,
  getProfessional,
  approveApplication,
  rejectApplication,
  adjustFreeSevas,
  grantBonusFreeSevas,
  setCommissionSchedule,
  setBoostUntil,
  setTierManual,
  getPrathamConfig,
  savePrathamConfig,
};
