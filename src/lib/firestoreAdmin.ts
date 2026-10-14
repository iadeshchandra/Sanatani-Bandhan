/**
 * firestoreAdmin.ts — Spark-native owner operations (no server, no credit card).
 * ============================================================================
 *
 * MIGRATION PATH (read before changing):
 *
 * 1. FIRESTORE-NATIVE (this file) — works today on the free Spark plan:
 *    - Platform overview (count aggregations + recent workspaces)
 *    - User lookup by email (read-only)
 *    - Workspace list + plan changes (planId-only writes)
 *    - Verification queue: approve / reject (self-approval denied client-side)
 *    - Moderation: dismiss / hide (via moderationHides) / warn (via inbox message)
 *    - Payment claims: approve (computes subscription dates client-side) / reject
 *    - Messaging: single-user inbox delivery + campaign/scheduled records
 *    - Audit log: append-only, owner-readable
 *
 * 2. NEEDS THE EXPRESS BACKEND (deploy functions/ + set VITE_BACKEND_URL):
 *    - Disable / enable Firebase Auth users (requires Admin SDK Auth API)
 *    - Suspend user (same — Auth disable under the hood)
 *    - FCM push multicast (requires Admin SDK messaging)
 *    - Outbound email / Telegram (requires network egress — Blaze)
 *    - True cron scheduling (reminder jobs, digest dispatch)
 *    - Payment webhook HMAC verification (needs the secret server-side)
 *    These return { ok:false, code:'REQUIRES_BACKEND' } below, and the UI
 *    shows a "Requires backend" badge on just those buttons — not the tab.
 *
 * 3. PRIORITY: adminApi.ts tries the HTTP backend FIRST. Only when the fetch
 *    fails with backendDown does it fall back to this file. So migrating is
 *    just: `firebase deploy --only functions` + set VITE_BACKEND_URL.
 *    Nothing here blocks or conflicts with the deployed backend.
 *
 * SECURITY: every function calls requireOwner() — the signed-in UID must equal
 * the canonical owner UID. Firestore rules independently enforce the same
 * (see firestore.rules `isOwner()`), so a compromised client still can't
 * escalate: rules are the hard boundary, this file is convenience.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

/** Canonical platform owner. */
export const OWNER_UID = 'sxIGHmvpYUTqPnpI1bLFT1O1cA62';
export const OWNER_EMAIL = 'iadeshchandra@gmail.com';

/** True when the currently signed-in user is the platform owner. */
export function isOwnerUid(uid?: string | null): boolean {
  return !!uid && uid === OWNER_UID;
}

/** Throws unless the signed-in session belongs to the owner. */
function requireOwner(): string {
  const uid = auth.currentUser?.uid;
  if (!isOwnerUid(uid)) {
    throw new Error('OWNER_ONLY: sign in as the platform owner.');
  }
  return uid as string;
}

export interface NativeResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  /** Set when the operation genuinely needs the Express backend. */
  requiresBackend?: boolean;
}

/** Append an audit entry. Never throws — audit failure must not break the op. */
async function writeAudit(
  action: string,
  details: Record<string, any> = {},
  severity: 'info' | 'warn' | 'critical' = 'info',
  workspaceId?: string
): Promise<void> {
  try {
    const uid = requireOwner();
    await addDoc(collection(db, 'audit_logs'), {
      action,
      actorUid: uid,
      actorEmail: auth.currentUser?.email || OWNER_EMAIL,
      details,
      severity,
      createdAt: serverTimestamp(),
      ...(workspaceId ? { workspaceId } : {}),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[firestoreAdmin] audit write failed:', action, e);
  }
}

const tsToIso = (v: any): string | undefined => {
  try {
    if (!v) return undefined;
    if (typeof v === 'string') return v;
    if (v.toDate) return v.toDate().toISOString();
    return undefined;
  } catch {
    return undefined;
  }
};

/* -------------------------------- Overview ------------------------------- */

async function overview(): Promise<NativeResult> {
  requireOwner();
  const [usersC, wsC, verC, claimC] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'workspaces')),
    getCountFromServer(query(collection(db, 'verificationApplications'), where('status', '==', 'pending'))),
    getCountFromServer(query(collection(db, 'paymentClaims'), where('status', '==', 'pending'))),
  ]);
  const recentSnap = await getDocs(query(collection(db, 'workspaces'), orderBy('createdAt', 'desc'), limit(5)));
  const recentWorkspaces = recentSnap.docs.map((d) => {
    const v: any = d.data();
    return { id: d.id, name: v.name, type: v.type, planId: v.planId, createdAt: tsToIso(v.createdAt) };
  });
  return {
    ok: true,
    data: {
      success: true,
      overview: {
        workspaces: wsC.data().count,
        users: usersC.data().count,
        tenants: wsC.data().count,
        pendingVerifications: verC.data().count,
        pendingClaims: claimC.data().count,
        recentWorkspaces,
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

async function health(): Promise<NativeResult> {
  requireOwner();
  // A lightweight read proves Firestore is reachable from this client.
  await getCountFromServer(collection(db, 'workspaces'));
  return {
    ok: true,
    data: {
      status: 'ok',
      mode: 'spark-native',
      functionsDeployed: false,
      timestamp: new Date().toISOString(),
      checks: { firestore: 'ok', auth: auth.currentUser ? 'ok' : 'signed-out', functions: 'not-deployed' },
    },
  };
}

/* --------------------------------- Users --------------------------------- */

async function lookupUser(email: string): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email), limit(1)));
  if (snap.empty) {
    return { ok: false, error: 'User not found.', code: 'NOT_FOUND' };
  }
  const d = snap.docs[0];
  const v: any = d.data();
  return {
    ok: true,
    data: {
      success: true,
      user: {
        uid: d.id,
        email: v.email,
        displayName: v.displayName || v.name,
        // Client-visible users docs don't carry Auth-level disabled state.
        disabled: false,
        emailVerified: v.emailVerified,
        creationTime: tsToIso(v.createdAt),
        lastSignInTime: tsToIso(v.lastSignInAt),
      },
    },
  };
}

const REQUIRES_BACKEND_MSG =
  'Needs the deployed backend (Firebase Auth Admin API). Deploy: firebase deploy --only functions';

async function disableUser(): Promise<NativeResult> {
  requireOwner();
  return { ok: false, code: 'REQUIRES_BACKEND', error: REQUIRES_BACKEND_MSG, requiresBackend: true };
}

async function enableUser(): Promise<NativeResult> {
  requireOwner();
  return { ok: false, code: 'REQUIRES_BACKEND', error: REQUIRES_BACKEND_MSG, requiresBackend: true };
}

/* ------------------------------- Workspaces ------------------------------ */

async function listWorkspaces(limitN = 100): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'workspaces'), orderBy('createdAt', 'desc'), limit(Math.min(limitN, 200))));
  const workspaces = snap.docs.map((d) => {
    const v: any = d.data();
    return { id: d.id, name: v.name, type: v.type, planId: v.planId || 'LITE', city: v.city, createdAt: tsToIso(v.createdAt) };
  });
  return { ok: true, data: { success: true, workspaces } };
}

async function setPlan(workspaceId: string, planId: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'workspaces', workspaceId);
  const before = await getDoc(ref);
  const prevPlan = (before.data() as any)?.planId || 'LITE';
  await updateDoc(ref, { planId, updatedAt: serverTimestamp() });
  await writeAudit('workspace.plan.change', { workspaceId, prevPlan, planId, actorUid: uid }, 'warn', workspaceId);
  return { ok: true, data: { success: true } };
}

/* ------------------------------ Verification ----------------------------- */

async function verificationPending(kind?: 'purohit' | 'jyotish'): Promise<NativeResult> {
  requireOwner();
  // Single where-clause only (multiple wheres need a composite index).
  // Kind filtering happens client-side below.
  const snap = await getDocs(query(collection(db, 'verificationApplications'), where('status', '==', 'pending'), limit(200)));
  const applications = snap.docs
    .map((d) => {
      const v: any = d.data();
      return {
        id: d.id, kind: v.kind, profileId: v.profileId, applicantUid: v.applicantUid,
        displayName: v.displayName, requestedTier: v.requestedTier, currentTier: v.currentTier,
        status: v.status, notes: v.notes, createdAt: tsToIso(v.createdAt),
      };
    })
    .filter((a) => !kind || a.kind === kind)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, applications } };
}

async function verificationApprove(id: string, tier?: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'verificationApplications', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Application not found.', code: 'NOT_FOUND' };
  const app: any = snap.data();
  if (app.status !== 'pending') return { ok: false, error: 'Application is no longer pending.', code: 'STALE' };
  // Self-approval is denied — mirrors the Express backend's safety check.
  if (app.applicantUid && app.applicantUid === uid) {
    return { ok: false, error: 'Self-approval is not allowed.', code: 'SELF_APPROVAL' };
  }
  const finalTier = tier || app.requestedTier || app.currentTier || 'REGISTERED';
  await updateDoc(ref, {
    status: 'approved',
    tier: finalTier,
    approvedBy: uid,
    approvedAt: serverTimestamp(),
  });
  await writeAudit('verification.approve', { applicationId: id, kind: app.kind, profileId: app.profileId, tier: finalTier });
  return { ok: true, data: { ok: true } };
}

async function verificationReject(id: string, reason: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'verificationApplications', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Application not found.', code: 'NOT_FOUND' };
  const app: any = snap.data();
  if (app.status !== 'pending') return { ok: false, error: 'Application is no longer pending.', code: 'STALE' };
  await updateDoc(ref, {
    status: 'rejected',
    rejectionReason: reason.slice(0, 500),
    reviewedBy: uid,
    reviewedAt: serverTimestamp(),
  });
  await writeAudit('verification.reject', { applicationId: id, kind: app.kind, reason: reason.slice(0, 200) }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ------------------------------- Moderation ------------------------------ */

async function moderationReports(status = 'open'): Promise<NativeResult> {
  requireOwner();
  // Client-side sort: avoids the composite index a where+orderBy would need.
  const snap = await getDocs(
    query(collection(db, 'moderationReports'), where('status', '==', status), limit(100))
  );
  const reports = snap.docs
    .map((d) => {
      const v: any = d.data();
      return {
        id: d.id, targetType: v.targetType, targetId: v.targetId, reason: v.reason,
        details: v.details, reporterUid: v.reporterUid, status: v.status, createdAt: tsToIso(v.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, reports } };
}

async function moderationAction(
  id: string,
  action: 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user',
  note?: string
): Promise<NativeResult> {
  const uid = requireOwner();
  if (action === 'suspend_user') {
    // Disabling a Firebase Auth account requires the Admin SDK.
    return { ok: false, code: 'REQUIRES_BACKEND', error: REQUIRES_BACKEND_MSG, requiresBackend: true };
  }
  const ref = doc(db, 'moderationReports', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Report not found.', code: 'NOT_FOUND' };
  const rep: any = snap.data();

  if (action === 'hide_content' && rep.targetId) {
    // Record a hide directive — clients filter hidden content via this collection.
    await addDoc(collection(db, 'moderationHides'), {
      targetId: rep.targetId,
      targetType: rep.targetType || 'unknown',
      reportId: id,
      hiddenBy: uid,
      hiddenAt: serverTimestamp(),
      note: note || '',
    });
  }
  if (action === 'warn_user' && rep.targetUid) {
    // Deliver a warning straight to the user's inbox (they can read their own).
    await addDoc(collection(db, 'messages'), {
      targetUid: rep.targetUid,
      title: 'A gentle note from the Sanatani Bandhan team',
      body: note || 'Your recent content was reported by the community. Please keep Sangam respectful and dharmic.',
      type: 'reminder',
      createdBy: uid,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
  await updateDoc(ref, {
    status: action === 'dismiss' ? 'dismissed' : 'actioned',
    actionTaken: action,
    actionNote: note || '',
    resolvedBy: uid,
    resolvedAt: serverTimestamp(),
  });
  await writeAudit('moderation.action', { reportId: id, action, targetId: rep.targetId }, action === 'dismiss' ? 'info' : 'warn');
  return { ok: true, data: { ok: true } };
}

/* --------------------------------- Billing ------------------------------- */

async function paymentClaims(status = 'pending'): Promise<NativeResult> {
  requireOwner();
  // Client-side sort: avoids the composite index a where+orderBy would need.
  const snap = await getDocs(
    query(collection(db, 'paymentClaims'), where('status', '==', status), limit(100))
  );
  const claims = snap.docs
    .map((d) => {
      const v: any = d.data();
      return {
        id: d.id, workspaceId: v.workspaceId, workspaceName: v.workspaceName, plan: v.plan,
        period: v.period, method: v.method, transactionId: v.transactionId, amount: v.amount,
        currency: v.currency, proofUrl: v.proofUrl, status: v.status, notes: v.notes,
        createdAt: tsToIso(v.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, claims } };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function claimApprove(id: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'paymentClaims', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Claim not found.', code: 'NOT_FOUND' };
  const claim: any = snap.data();
  if (claim.status !== 'pending') return { ok: false, error: 'Claim is no longer pending.', code: 'STALE' };

  const start = new Date();
  const end = addMonths(start, claim.period === 'yearly' ? 12 : 1);
  const planId = claim.plan || 'STANDARD';

  await updateDoc(ref, { status: 'approved', approvedBy: uid, approvedAt: serverTimestamp() });
  // Subscription doc id = workspaceId (matches firestore.rules shape).
  await setDoc(
    doc(db, 'subscriptions', claim.workspaceId),
    {
      workspaceId: claim.workspaceId,
      planId,
      status: 'active',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      paymentMethod: claim.method,
      transactionId: claim.transactionId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await writeAudit(
    'billing.claim.approve',
    { claimId: id, workspaceId: claim.workspaceId, planId, startDate: start.toISOString(), endDate: end.toISOString() },
    'warn',
    claim.workspaceId
  );
  // Keep the workspace's own planId in sync (best-effort; rules allow owner planId-only writes).
  try {
    await updateDoc(doc(db, 'workspaces', claim.workspaceId), { planId, updatedAt: serverTimestamp() });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[firestoreAdmin] workspace planId sync failed:', e);
  }
  return { ok: true, data: { ok: true } };
}

async function claimReject(id: string, reason: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'paymentClaims', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Claim not found.', code: 'NOT_FOUND' };
  const claim: any = snap.data();
  if (claim.status !== 'pending') return { ok: false, error: 'Claim is no longer pending.', code: 'STALE' };
  await updateDoc(ref, {
    status: 'rejected',
    rejectionReason: reason.slice(0, 500),
    reviewedBy: uid,
    reviewedAt: serverTimestamp(),
  });
  await writeAudit('billing.claim.reject', { claimId: id, workspaceId: claim.workspaceId, reason: reason.slice(0, 200) }, 'warn', claim.workspaceId);
  return { ok: true, data: { ok: true } };
}

async function subscription(workspaceId: string): Promise<NativeResult> {
  requireOwner();
  const snap = await getDoc(doc(db, 'subscriptions', workspaceId));
  if (!snap.exists()) return { ok: false, error: 'No subscription found.', code: 'NOT_FOUND' };
  return { ok: true, data: { success: true, subscription: { id: snap.id, ...(snap.data() as any) } } };
}

/* -------------------------------- Messaging ------------------------------ */

async function sendMessage(payload: {
  title: string;
  body: string;
  type: 'announcement' | 'reminder' | 'greeting' | 'urgent';
  audience: { kind: 'single' | 'workspace' | 'role' | 'all'; uid?: string; workspaceId?: string; role?: string };
  templateId?: string;
}): Promise<NativeResult> {
  const uid = requireOwner();
  const base = {
    title: payload.title,
    body: payload.body,
    type: payload.type,
    audience: payload.audience,
    ...(payload.templateId ? { templateId: payload.templateId } : {}),
    createdBy: uid,
    status: 'sent',
    createdAt: serverTimestamp(),
  };
  // Record the campaign (owner-visible history).
  await addDoc(collection(db, 'messageCampaigns'), { ...base, audienceKind: payload.audience.kind });

  if (payload.audience.kind === 'single' && payload.audience.uid) {
    // True inbox delivery: the target user can read their own messages.
    await addDoc(collection(db, 'messages'), {
      targetUid: payload.audience.uid,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      createdBy: uid,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
  // NOTE: workspace / role / all fan-out (per-user inbox writes + FCM push)
  // needs the Express backend. The campaign record above is the source of
  // truth; fan-out happens on deploy.
  await writeAudit('message.send', {
    title: payload.title.slice(0, 120),
    type: payload.type,
    audienceKind: payload.audience.kind,
    fannedOut: payload.audience.kind === 'single',
  }, 'info');
  return { ok: true, data: { ok: true, fannedOut: payload.audience.kind === 'single' } };
}

async function scheduleMessage(payload: { title: string; body: string; type: string; audience: any; sendAt: string }): Promise<NativeResult> {
  const uid = requireOwner();
  await addDoc(collection(db, 'scheduledMessages'), {
    title: payload.title,
    body: payload.body,
    type: payload.type,
    audience: payload.audience,
    sendAt: payload.sendAt,
    status: 'scheduled',
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await writeAudit('message.schedule', { title: payload.title.slice(0, 120), sendAt: payload.sendAt }, 'info');
  return { ok: true, data: { ok: true } };
}

async function messageTemplates(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'messageTemplates'));
  const templates = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, templates } };
}

/* ---------------------------------- Audit -------------------------------- */

async function auditLogs(filters: { action?: string; severity?: string; limit?: number } = {}): Promise<NativeResult> {
  requireOwner();
  // No composite where+orderBy (avoids index requirements): fetch newest, filter client-side.
  const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(120)));
  let entries = snap.docs.map((d) => {
    const v: any = d.data();
    const sev = v.severity === 'warn' ? 'warning' : v.severity || 'info';
    return {
      id: d.id,
      action: v.action,
      actorUid: v.actorUid,
      actorEmail: v.actorEmail,
      workspaceId: v.workspaceId,
      severity: sev,
      details: v.details,
      createdAt: tsToIso(v.createdAt),
    };
  });
  if (filters.action) {
    const q = filters.action.toLowerCase();
    entries = entries.filter((e) => (e.action || '').toLowerCase().includes(q));
  }
  if (filters.severity) {
    entries = entries.filter((e) => e.severity === filters.severity);
  }
  return { ok: true, data: { success: true, entries: entries.slice(0, filters.limit || 50) } };
}

/* --------------------------------- Export -------------------------------- */

export const firestoreAdmin = {
  isOwnerUid,
  overview,
  health,
  lookupUser,
  disableUser,
  enableUser,
  listWorkspaces,
  setPlan,
  verificationPending,
  verificationApprove,
  verificationReject,
  moderationReports,
  moderationAction,
  paymentClaims,
  claimApprove,
  claimReject,
  subscription,
  sendMessage,
  scheduleMessage,
  messageTemplates,
  auditLogs,
};

export default firestoreAdmin;
