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
    return { id: d.id, name: v.name, type: v.type, planId: v.planId || 'LITE', city: v.city, createdAt: tsToIso(v.createdAt), limitsBypassed: v.limitsBypassed === true };
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
  // Plan changed → drop the cached plan so new limits apply immediately.
  try {
    const { clearPlanCache } = await import('./planLimits');
    clearPlanCache();
  } catch { /* non-fatal */ }
  return { ok: true, data: { success: true } };
}

/**
 * Toggle the freemium limits bypass for a workspace.
 * When true, all plan-limit checks (devotees/seats/transactions/branches)
 * are skipped for that workspace. Owner-only. Audited.
 */
async function setLimitsBypass(workspaceId: string, bypassed: boolean): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'workspaces', workspaceId);
  await updateDoc(ref, { limitsBypassed: bypassed, updatedAt: serverTimestamp() });
  await writeAudit('workspace.limits.bypass', { workspaceId, bypassed, actorUid: uid }, 'warn', workspaceId);
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

/* --------------------------- Console 3.0: Insights --------------------------- */
/* NOTE: Console 3.0 additions (Insights, DB Explorer, Commission, Content,
 * Settings, Support) are Spark-native only for now. The Express backend has
 * no routes for these yet — when it does, add withFallback wrappers in
 * adminApi.ts the same way the 2.0 features do. Nothing here conflicts. */

const PLAN_MONTHLY_FALLBACK: Record<string, number> = { LITE: 0, STANDARD: 1499, ENTERPRISE: 4999 };

async function planPrices(): Promise<Record<string, number>> {
  try {
    const snap = await getDocs(collection(db, 'plans'));
    const prices: Record<string, number> = { ...PLAN_MONTHLY_FALLBACK };
    snap.docs.forEach((d) => {
      const v: any = d.data();
      if (v.id && typeof v.priceMonthly === 'number') prices[v.id] = v.priceMonthly;
    });
    return prices;
  } catch {
    return { ...PLAN_MONTHLY_FALLBACK };
  }
}

async function insights(): Promise<NativeResult> {
  requireOwner();
  const prices = await planPrices();
  const [usersSnap, wsSnap, subsSnap, verSnap, claimSnap, repSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), limit(2000))),
    getCountFromServer(collection(db, 'workspaces')),
    getDocs(query(collection(db, 'subscriptions'), where('status', '==', 'active'), limit(500))),
    getDocs(query(collection(db, 'verificationApplications'), limit(500))),
    getCountFromServer(query(collection(db, 'paymentClaims'), where('status', '==', 'pending'))),
    getCountFromServer(query(collection(db, 'moderationReports'), where('status', '==', 'open'))),
  ]);

  // Signups per day, last 30 days (docs without createdAt are ignored honestly).
  const dayMs = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = new Array(30).fill(0);
  let datedUsers = 0;
  usersSnap.docs.forEach((d) => {
    const v: any = d.data();
    const iso = tsToIso(v.createdAt);
    if (!iso) return;
    datedUsers++;
    const idx = Math.floor((today.getTime() - new Date(iso).setHours(0, 0, 0, 0)) / dayMs);
    if (idx >= 0 && idx < 30) buckets[29 - idx]++;
  });

  // MRR from active subscriptions.
  let mrr = 0;
  const revByMonth: Record<string, number> = {};
  subsSnap.docs.forEach((d) => {
    const v: any = d.data();
    const monthly = prices[v.planId] ?? 0;
    mrr += monthly;
    const startIso = v.startDate || tsToIso(v.updatedAt);
    if (startIso) {
      const key = startIso.slice(0, 7);
      revByMonth[key] = (revByMonth[key] || 0) + monthly;
    }
  });

  // Verification funnel.
  const funnel = { pending: 0, approved: 0, rejected: 0 };
  verSnap.docs.forEach((d) => {
    const s = (d.data() as any).status;
    if (s === 'pending') funnel.pending++;
    else if (s === 'approved') funnel.approved++;
    else if (s === 'rejected') funnel.rejected++;
  });

  return {
    ok: true,
    data: {
      ok: true,
      kpis: {
        totalUsers: usersSnap.size,
        activeWorkspaces: wsSnap.data().count,
        mrr,
        pendingActions: funnel.pending + claimSnap.data().count + repSnap.data().count,
      },
      signups30d: buckets,
      signupsDated: datedUsers,
      signupsTotal: usersSnap.size,
      revenueByMonth: revByMonth,
      verificationFunnel: funnel,
      pendingClaims: claimSnap.data().count,
      openReports: repSnap.data().count,
    },
  };
}

/* ------------------------ Console 3.0: DB Explorer ----------------------- */

const EXPLORER_COLLECTIONS = [
  'users', 'workspaces', 'workspaceMembers', 'verificationApplications',
  'paymentClaims', 'subscriptions', 'paymentMethods',
  'messages', 'messageCampaigns', 'scheduledMessages', 'messageTemplates',
  'moderationReports', 'moderationHides', 'audit_logs',
  'commissionRules', 'marketplaceTransactions', 'payouts',
  'announcements', 'siteContent', 'featureFlags', 'plans', 'platformConfig',
  'platform_leads', 'reminderQueue',
  'sanataniProfiles', 'purohitProfiles', 'jyotishProfiles',
];

/** Collections the explorer must never write to. */
const EXPLORER_READONLY = new Set(['audit_logs', 'moderationHides']);

async function explorerCollections(): Promise<NativeResult> {
  requireOwner();
  const counts = await Promise.all(
    EXPLORER_COLLECTIONS.map(async (name) => {
      try {
        const c = await getCountFromServer(collection(db, name));
        return { name, count: c.data().count, readonly: EXPLORER_READONLY.has(name) };
      } catch {
        return { name, count: -1, readonly: EXPLORER_READONLY.has(name) };
      }
    })
  );
  return { ok: true, data: { ok: true, collections: counts } };
}

async function explorerListDocs(name: string, searchQ = '', limitN = 50): Promise<NativeResult> {
  requireOwner();
  if (!EXPLORER_COLLECTIONS.includes(name)) {
    return { ok: false, error: 'Collection not in explorer allowlist.', code: 'NOT_ALLOWED' };
  }
  const snap = await getDocs(query(collection(db, name), limit(Math.min(limitN, 100))));
  let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (searchQ.trim()) {
    const q = searchQ.trim().toLowerCase();
    docs = docs.filter(
      (d) => d.id.toLowerCase().includes(q) || JSON.stringify(d).toLowerCase().includes(q)
    );
  }
  return { ok: true, data: { ok: true, docs: docs.slice(0, limitN) } };
}

async function explorerGetDoc(name: string, docId: string): Promise<NativeResult> {
  requireOwner();
  if (!EXPLORER_COLLECTIONS.includes(name)) {
    return { ok: false, error: 'Collection not in explorer allowlist.', code: 'NOT_ALLOWED' };
  }
  const snap = await getDoc(doc(db, name, docId));
  if (!snap.exists()) return { ok: false, error: 'Document not found.', code: 'NOT_FOUND' };
  return { ok: true, data: { ok: true, id: snap.id, fields: snap.data() } };
}

async function explorerSetField(name: string, docId: string, field: string, value: any): Promise<NativeResult> {
  const uid = requireOwner();
  if (!EXPLORER_COLLECTIONS.includes(name) || EXPLORER_READONLY.has(name)) {
    return { ok: false, error: 'Writes not allowed here.', code: 'NOT_ALLOWED' };
  }
  if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(field)) {
    return { ok: false, error: 'Invalid field name.', code: 'BAD_FIELD' };
  }
  await updateDoc(doc(db, name, docId), { [field]: value, updatedAt: serverTimestamp() });
  await writeAudit('db.field.set', { collection: name, docId, field }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function explorerDeleteField(name: string, docId: string, field: string): Promise<NativeResult> {
  const uid = requireOwner();
  if (!EXPLORER_COLLECTIONS.includes(name) || EXPLORER_READONLY.has(name)) {
    return { ok: false, error: 'Writes not allowed here.', code: 'NOT_ALLOWED' };
  }
  const { deleteField } = await import('firebase/firestore');
  await updateDoc(doc(db, name, docId), { [field]: deleteField(), updatedAt: serverTimestamp() });
  await writeAudit('db.field.delete', { collection: name, docId, field }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ------------------------ Console 3.0: Commission ------------------------ */

async function commissionRules(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'commissionRules'));
  const rules = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, rules } };
}

async function commissionRuleSave(rule: {
  id?: string; serviceType: 'purohit' | 'jyotishi' | 'both';
  ratePercent: number; minCommission?: number; maxCommission?: number; active: boolean;
}): Promise<NativeResult> {
  const uid = requireOwner();
  const rate = Math.min(100, Math.max(0, Number(rule.ratePercent) || 0));
  const payload = {
    serviceType: rule.serviceType,
    ratePercent: rate,
    minCommission: Math.max(0, Number(rule.minCommission) || 0),
    maxCommission: Number(rule.maxCommission) || 0,
    active: !!rule.active,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  if (rule.id) {
    await updateDoc(doc(db, 'commissionRules', rule.id), payload);
    await writeAudit('commission.rule.update', { ruleId: rule.id, ...payload, updatedAt: undefined }, 'warn');
    return { ok: true, data: { ok: true, id: rule.id } };
  }
  const ref = await addDoc(collection(db, 'commissionRules'), { ...payload, createdAt: serverTimestamp() });
  await writeAudit('commission.rule.create', { ruleId: ref.id, serviceType: rule.serviceType, ratePercent: rate }, 'warn');
  return { ok: true, data: { ok: true, id: ref.id } };
}

async function marketplaceTransactions(status = 'all', limitN = 100): Promise<NativeResult> {
  requireOwner();
  // Client-side sort/filter: avoids composite indexes.
  const snap = await getDocs(query(collection(db, 'marketplaceTransactions'), limit(Math.min(limitN, 200))));
  let txns = snap.docs.map((d) => {
    const v: any = d.data();
    return { id: d.id, ...v, createdAt: tsToIso(v.createdAt) };
  });
  if (status !== 'all') txns = txns.filter((t: any) => t.status === status);
  txns.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, transactions: txns.slice(0, limitN) } };
}

async function transactionSetStatus(id: string, status: 'released' | 'disputed' | 'pending'): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'marketplaceTransactions', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Transaction not found.', code: 'NOT_FOUND' };
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  await writeAudit('commission.txn.status', { txnId: id, status }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function payoutQueue(status = 'requested'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'payouts'), limit(200)));
  let payouts = snap.docs.map((d) => {
    const v: any = d.data();
    return { id: d.id, ...v, requestedAt: tsToIso(v.requestedAt), processedAt: tsToIso(v.processedAt) };
  });
  if (status !== 'all') payouts = payouts.filter((p: any) => p.status === status);
  payouts.sort((a: any, b: any) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
  return { ok: true, data: { ok: true, payouts } };
}

async function payoutDecide(id: string, approve: boolean, note?: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'payouts', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Payout not found.', code: 'NOT_FOUND' };
  const p: any = snap.data();
  if (p.status !== 'requested') return { ok: false, error: 'Payout is no longer pending.', code: 'STALE' };

  // Rail-2 auto-deduction: outstanding platform dues are subtracted first.
  // The math is stored line-by-line on the payout for full transparency.
  let duesDeducted = 0;
  let duesSettledIds: string[] = [];
  if (approve && p.providerUid) {
    try {
      const duesS = await getDocs(query(
        collection(db, 'platformDues'),
        where('providerUid', '==', p.providerUid),
        where('status', '==', 'pending'),
        limit(200)
      ));
      const pendingDues = duesS.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => String(a.createdAt?.toDate?.()?.toISOString?.() || '').localeCompare(String(b.createdAt?.toDate?.()?.toISOString?.() || '')));
      let remaining = Number(p.amount || 0);
      for (const d of pendingDues) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number((d as any).amount || 0));
        if (take >= Number((d as any).amount || 0)) {
          // Fully covers this due → mark settled.
          await updateDoc(doc(db, 'platformDues', (d as any).id), {
            status: 'settled', settledBy: uid, settledAt: serverTimestamp(),
            settleNote: `Auto-deducted from payout ${id}.`,
          });
          duesSettledIds.push((d as any).id);
        }
        // Partial coverage: reduce the due amount (keeps it pending).
        else {
          await updateDoc(doc(db, 'platformDues', (d as any).id), {
            amount: Number((d as any).amount || 0) - take,
            partialDeduction: take,
            updatedAt: serverTimestamp(),
          });
        }
        duesDeducted += take;
        remaining -= take;
      }
    } catch (e) { console.error('[payoutDecide] dues auto-deduction failed:', e); }
  }

  const netPayout = Math.max(0, Number(p.amount || 0) - duesDeducted);
  await updateDoc(ref, {
    status: approve ? 'approved' : 'rejected',
    processedBy: uid,
    processedAt: serverTimestamp(),
    note: (note || '').slice(0, 500),
    ...(approve && duesDeducted > 0 ? {
      requestedAmount: Number(p.amount || 0),
      duesDeducted,
      duesSettledIds,
      netAmount: netPayout,
      deductionNote: `Platform dues auto-deducted: ৳${duesDeducted}. Net payout: ৳${netPayout}.`,
    } : {}),
  });
  await writeAudit('commission.payout.decide', {
    payoutId: id, approved: approve, amount: p.amount,
    ...(duesDeducted > 0 ? { duesDeducted, netAmount: netPayout } : {}),
  }, 'warn');
  return { ok: true, data: { ok: true, duesDeducted, netAmount: netPayout } };
}

async function payoutMarkPaid(id: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'payouts', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Payout not found.', code: 'NOT_FOUND' };
  if ((snap.data() as any).status !== 'approved') {
    return { ok: false, error: 'Only approved payouts can be marked paid.', code: 'STALE' };
  }
  await updateDoc(ref, { status: 'paid', processedBy: uid, processedAt: serverTimestamp() });
  await writeAudit('commission.payout.paid', { payoutId: id }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function providerEarnings(providerId: string): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'marketplaceTransactions'), where('providerId', '==', providerId), limit(500)));
  let gross = 0, commission = 0, released = 0, pending = 0;
  snap.docs.forEach((d) => {
    const v: any = d.data();
    gross += Number(v.grossAmount) || 0;
    commission += Number(v.commissionAmount) || 0;
    if (v.status === 'released') released += Number(v.netAmount) || 0;
    else if (v.status === 'pending') pending += Number(v.netAmount) || 0;
  });
  return { ok: true, data: { ok: true, providerId, gross, commission, netReleased: released, netPending: pending, txnCount: snap.size } };
}

/* --------------------- Console 3.0: Content Manager ---------------------- */

async function announcements(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'announcements'), limit(100)));
  const items = snap.docs
    .map((d) => {
      const v: any = d.data();
      return { id: d.id, ...v, createdAt: tsToIso(v.createdAt) };
    })
    .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, announcements: items } };
}

async function announcementSave(a: {
  id?: string; title: string; body: string;
  type?: 'info' | 'warning' | 'festival'; active?: boolean;
}): Promise<NativeResult> {
  const uid = requireOwner();
  const payload = {
    title: a.title.slice(0, 200),
    body: a.body.slice(0, 2000),
    type: a.type || 'info',
    active: a.active !== false,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  if (a.id) {
    await updateDoc(doc(db, 'announcements', a.id), payload);
    await writeAudit('content.announcement.update', { id: a.id, title: payload.title }, 'info');
    return { ok: true, data: { ok: true, id: a.id } };
  }
  const ref = await addDoc(collection(db, 'announcements'), { ...payload, createdAt: serverTimestamp(), createdBy: uid });
  await writeAudit('content.announcement.create', { id: ref.id, title: payload.title }, 'info');
  return { ok: true, data: { ok: true, id: ref.id } };
}

async function announcementDelete(id: string): Promise<NativeResult> {
  requireOwner();
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'announcements', id));
  await writeAudit('content.announcement.delete', { id }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function templateSave(t: { id?: string; name: string; type: string; body: string; locale?: string }): Promise<NativeResult> {
  const uid = requireOwner();
  const payload = {
    name: t.name.slice(0, 120),
    type: t.type,
    body: t.body.slice(0, 2000),
    locale: t.locale || 'en',
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  if (t.id) {
    await updateDoc(doc(db, 'messageTemplates', t.id), payload);
    await writeAudit('content.template.update', { id: t.id, name: payload.name }, 'info');
    return { ok: true, data: { ok: true, id: t.id } };
  }
  const ref = await addDoc(collection(db, 'messageTemplates'), { ...payload, createdAt: serverTimestamp() });
  await writeAudit('content.template.create', { id: ref.id, name: payload.name }, 'info');
  return { ok: true, data: { ok: true, id: ref.id } };
}

async function templateDelete(id: string): Promise<NativeResult> {
  requireOwner();
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'messageTemplates', id));
  await writeAudit('content.template.delete', { id }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function siteContent(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'siteContent'));
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, items } };
}

async function siteContentSave(key: string, value: string): Promise<NativeResult> {
  const uid = requireOwner();
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) {
    return { ok: false, error: 'Invalid content key.', code: 'BAD_KEY' };
  }
  await setDoc(doc(db, 'siteContent', key), {
    key, value: value.slice(0, 10000), updatedAt: serverTimestamp(), updatedBy: uid,
  }, { merge: true });
  await writeAudit('content.site.save', { key }, 'info');
  return { ok: true, data: { ok: true } };
}

/* --------------------- Console 3.0: Platform Settings -------------------- */

async function featureFlags(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'featureFlags'));
  const flags = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, flags } };
}

async function featureFlagSet(key: string, enabled: boolean, description?: string): Promise<NativeResult> {
  const uid = requireOwner();
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) {
    return { ok: false, error: 'Invalid flag key.', code: 'BAD_KEY' };
  }
  await setDoc(doc(db, 'featureFlags', key), {
    key, enabled: !!enabled,
    ...(description ? { description: description.slice(0, 300) } : {}),
    updatedAt: serverTimestamp(), updatedBy: uid,
  }, { merge: true });
  await writeAudit('settings.flag.set', { key, enabled }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function plansList(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'plans'));
  const plans = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, plans } };
}

async function planSave(p: {
  id: string; name: string; priceMonthly: number; priceYearly: number;
  currency?: string; limits?: Record<string, number>; active?: boolean;
}): Promise<NativeResult> {
  const uid = requireOwner();
  if (!/^[A-Z0-9_]{1,24}$/.test(p.id)) {
    return { ok: false, error: 'Plan ID must be UPPER_SNAKE_CASE.', code: 'BAD_KEY' };
  }
  const payload = {
    id: p.id,
    name: p.name.slice(0, 80),
    priceMonthly: Math.max(0, Number(p.priceMonthly) || 0),
    priceYearly: Math.max(0, Number(p.priceYearly) || 0),
    currency: p.currency || 'INR',
    limits: p.limits || {},
    active: p.active !== false,
    updatedAt: serverTimestamp(), updatedBy: uid,
  };
  await setDoc(doc(db, 'plans', p.id), payload, { merge: true });
  await writeAudit('settings.plan.save', { id: p.id, name: payload.name }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function platformConfigGet(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDoc(doc(db, 'platformConfig', 'main'));
  return { ok: true, data: { ok: true, config: snap.exists() ? snap.data() : {} } };
}

async function platformConfigSet(patch: { maintenanceMode?: boolean; maintenanceMessage?: string }): Promise<NativeResult> {
  const uid = requireOwner();
  await setDoc(doc(db, 'platformConfig', 'main'), {
    ...(typeof patch.maintenanceMode === 'boolean' ? { maintenanceMode: patch.maintenanceMode } : {}),
    ...(typeof patch.maintenanceMessage === 'string' ? { maintenanceMessage: patch.maintenanceMessage.slice(0, 500) } : {}),
    updatedAt: serverTimestamp(), updatedBy: uid,
  }, { merge: true });
  await writeAudit('settings.config.set', { maintenanceMode: patch.maintenanceMode }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ----------------------- Console 3.0: Support Inbox ---------------------- */

async function supportLeads(status = 'all', limitN = 100): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'platform_leads'), limit(Math.min(limitN, 200))));
  let leads = snap.docs.map((d) => {
    const v: any = d.data();
    return { id: d.id, ...v, createdAt: tsToIso(v.createdAt) };
  });
  if (status !== 'all') leads = leads.filter((l: any) => (l.status || 'new') === status);
  leads.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, leads: leads.slice(0, limitN) } };
}

async function supportLeadSetStatus(id: string, status: 'new' | 'contacted' | 'resolved'): Promise<NativeResult> {
  const uid = requireOwner();
  await updateDoc(doc(db, 'platform_leads', id), {
    status, updatedAt: serverTimestamp(), handledBy: uid,
  });
  await writeAudit('support.lead.status', { leadId: id, status }, 'info');
  return { ok: true, data: { ok: true } };
}

async function supportLeadReply(id: string, title: string, body: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'platform_leads', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Lead not found.', code: 'NOT_FOUND' };
  const lead: any = snap.data();
  // Reply as an internal inbox message if we can match the lead to a user by email.
  const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', (lead.email || '').toLowerCase()), limit(1)));
  if (!userSnap.empty) {
    await addDoc(collection(db, 'messages'), {
      targetUid: userSnap.docs[0].id,
      title: title.slice(0, 200),
      body: body.slice(0, 2000),
      type: 'announcement',
      createdBy: uid,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
  await updateDoc(ref, { status: 'contacted', updatedAt: serverTimestamp(), handledBy: uid });
  await writeAudit('support.lead.reply', { leadId: id, inboxDelivered: !userSnap.empty }, 'info');
  return { ok: true, data: { ok: true, inboxDelivered: !userSnap.empty } };
}

/* --------------------------- Payment methods ---------------------------- */

const PM_SEED: Record<string, Record<string, any>> = {
  bd_banglaqr: {
    region: 'BD', type: 'bangla_qr', label: 'Bangla QR (TallyPay)', enabled: true,
    number: '01701-987744', merchantName: 'AR ARTS AND COMPUTER', qrImageUrl: '/bangla-qr.png',
    instructionsEn: [
      'Open bKash, Nagad, Rocket or any bank app',
      'Tap "QR Scan"',
      'Scan the QR code above',
      'Enter the amount',
      'Enter your PIN to confirm',
      'Copy the Transaction ID and submit it below',
    ],
    instructionsBn: [
      'bKash, Nagad, Rocket বা যেকোনো ব্যাংক অ্যাপ খুলুন',
      '"QR স্ক্যান" বাটনে ট্যাপ করুন',
      'উপরের QR কোডটি স্ক্যান করুন',
      'টাকার পরিমাণ লিখুন',
      'নিশ্চিত করতে আপনার PIN দিন',
      'Transaction ID কপি করে নিচে সাবমিট করুন',
    ],
  },
  bd_bkash: {
    region: 'BD', type: 'mobile', label: 'bKash / Rocket (Personal)', enabled: true,
    number: '01608533529',
    instructionsEn: ['Use the "Send Money" option.', 'Copy the Transaction ID and submit it below.'],
    instructionsBn: ['"Send Money" অপশন ব্যবহার করুন।', 'Transaction ID কপি করে নিচে সাবমিট করুন।'],
  },
  bd_nagad: {
    region: 'BD', type: 'mobile', label: 'Nagad (Personal)', enabled: true,
    number: '01701987744',
    instructionsEn: ['Use the "Send Money" option.', 'Copy the Transaction ID and submit it below.'],
    instructionsBn: ['"Send Money" অপশন ব্যবহার করুন।', 'Transaction ID কপি করে নিচে সাবমিট করুন।'],
  },
  in_upi: {
    region: 'IN', type: 'upi', label: 'UPI', enabled: true,
    upiId: 'sanatanibandhan@upi', accountName: 'Sanatani Bandhan',
    instructionsEn: [
      'Open any UPI app (GPay, PhonePe, Paytm, BHIM)',
      'Choose "Pay to UPI ID" and enter the UPI ID shown',
      'Enter the amount and your UPI PIN to confirm',
      'Copy the UTR / Transaction ID and submit it below',
    ],
    instructionsBn: [],
  },
  intl_wise: {
    region: 'INTL', type: 'wise', label: 'Wise', enabled: true,
    accountName: 'Adesh Chandra', accountDetails: '', link: 'https://wise.com/pay/me/adeshc',
    instructionsEn: [
      'Tap the button below to open our Wise payment page',
      'Send the plan amount in USD',
      'Copy the Wise transfer reference / Transaction ID',
      'Paste it in the claim form below and submit',
    ],
    instructionsBn: [],
  },
  intl_payoneer: {
    region: 'INTL', type: 'payoneer', label: 'Payoneer', enabled: true,
    accountName: 'Adesh Chandra', accountEmail: '', link: 'https://www.payoneer.com/',
    instructionsEn: [
      'Tap the button below to open Payoneer',
      'Send the plan amount in USD to our Payoneer account',
      'Copy the Payoneer Transaction ID',
      'Paste it in the claim form below and submit',
    ],
    instructionsBn: [],
  },
};

const PM_EDITABLE_KEYS = [
  'label', 'enabled', 'number', 'merchantName', 'qrImageUrl', 'upiId',
  'accountName', 'accountDetails', 'accountEmail', 'link', 'type', 'region',
];

const pmLines = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20)
    : typeof v === 'string'
      ? v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : [];

export async function paymentMethodsList(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'paymentMethods'));
  const methods = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, methods } };
}

export async function paymentMethodSave(id: string, patch: Record<string, any>): Promise<NativeResult> {
  const uid = requireOwner();
  if (!/^[a-z0-9_]{1,40}$/.test(id)) {
    return { ok: false, error: 'Invalid method id.', code: 'BAD_KEY' };
  }
  const clean: Record<string, any> = { updatedAt: serverTimestamp(), updatedBy: uid };
  for (const k of PM_EDITABLE_KEYS) {
    if (patch[k] === undefined) continue;
    if (k === 'enabled') clean[k] = !!patch[k];
    else if (typeof patch[k] === 'string') clean[k] = patch[k].slice(0, 500);
    else clean[k] = patch[k];
  }
  if (patch.instructionsEn !== undefined) clean.instructionsEn = pmLines(patch.instructionsEn);
  if (patch.instructionsBn !== undefined) clean.instructionsBn = pmLines(patch.instructionsBn);
  await setDoc(doc(db, 'paymentMethods', id), clean, { merge: true });
  await writeAudit('settings.paymentMethod.save', { id }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Delete a payment method (owner-only). Id must match the method key format. */
export async function paymentMethodDelete(id: string): Promise<NativeResult> {
  requireOwner();
  if (!/^[a-z0-9_]{1,40}$/.test(id)) {
    return { ok: false, error: 'Invalid method id.', code: 'BAD_KEY' };
  }
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'paymentMethods', id));
  await writeAudit('settings.paymentMethod.delete', { id }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Seed default payment methods (only creates docs that don't exist). */
async function seedPaymentMethods(): Promise<NativeResult> {
  const uid = requireOwner();
  const snap = await getDocs(collection(db, 'paymentMethods'));
  const existing = new Set(snap.docs.map((d) => d.id));
  let seeded = 0;
  for (const [id, m] of Object.entries(PM_SEED)) {
    if (!existing.has(id)) {
      await setDoc(doc(db, 'paymentMethods', id), {
        ...m, updatedAt: serverTimestamp(), updatedBy: uid,
      });
      seeded++;
    }
  }
  await writeAudit('settings.paymentMethod.seed', { seeded }, 'warn');
  return { ok: true, data: { ok: true, seeded } };
}

/* ------------------------------ Plan seeding ---------------------------- */

/** Final locked pricing — workspace tiers + professional plan. */
const PLAN_SEED: Record<string, any>[] = [
  {
    id: 'seva', name: 'Seva Free',
    priceMonthlyINR: 0, priceYearlyINR: 0,
    priceMonthlyBDT: 0, priceYearlyBDT: 0,
    priceMonthlyUSD: 0, priceYearlyUSD: 0,
    limits: { maxDevotees: 100, maxTransactionsPerMonth: 500, maxSeats: 2, maxBranches: 1 },
    active: true,
  },
  {
    id: 'standard', name: 'Standard',
    priceMonthlyINR: 499, priceYearlyINR: 4999,
    priceMonthlyBDT: 700, priceYearlyBDT: 7000,
    priceMonthlyUSD: 6, priceYearlyUSD: 60,
    limits: { maxDevotees: 1000, maxTransactionsPerMonth: -1, maxSeats: 10, maxBranches: 3 },
    active: true,
  },
  {
    id: 'premium', name: 'Premium',
    priceMonthlyINR: 1999, priceYearlyINR: 19999,
    priceMonthlyBDT: 2800, priceYearlyBDT: 28000,
    priceMonthlyUSD: 24, priceYearlyUSD: 240,
    limits: { maxDevotees: -1, maxTransactionsPerMonth: -1, maxSeats: -1, maxBranches: -1 },
    active: true,
  },
  {
    id: 'purohit_pro', name: 'Purohit / Jyotishi Pro',
    priceMonthlyINR: 199, priceYearlyINR: 1990,
    priceMonthlyBDT: 280, priceYearlyBDT: 2800,
    priceMonthlyUSD: 2.5, priceYearlyUSD: 25,
    commissionPercent: 12,
    limits: { maxDevotees: -1, maxTransactionsPerMonth: -1, maxSeats: 1, maxBranches: 1 },
    active: true,
  },
];

/** Seed/refresh the canonical plans (merge — never deletes owner edits to other plans). */
async function seedPlans(): Promise<NativeResult> {
  const uid = requireOwner();
  for (const p of PLAN_SEED) {
    await setDoc(doc(db, 'plans', p.id), {
      ...p, updatedAt: serverTimestamp(), updatedBy: uid,
    }, { merge: true });
  }
  await writeAudit('settings.plans.seed', { count: PLAN_SEED.length }, 'warn');
  return { ok: true, data: { ok: true, seeded: PLAN_SEED.length } };
}

/* --------------------- Marketplace (Fiverr-like gigs) -------------------- */
/* Data model:
 * - marketplaceGigs: provider-owned service listings (public read)
 * - marketplaceOrders: client bookings w/ commission snapshot (parties + owner)
 * - marketplaceDisputes: open/resolved disputes (parties + owner)
 * - commissionOverrides: per-category / per-provider rate overrides (owner)
 * Commission snapshots at order time: rule changes never rewrite history.
 */

const ORDER_STATUSES = ['pending_payment', 'paid', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed', 'refunded'] as const;

async function marketplaceDashboard(): Promise<NativeResult> {
  requireOwner();
  const [gigsS, ordersS, disputesS] = await Promise.all([
    getDocs(query(collection(db, 'marketplaceGigs'), limit(500))),
    getDocs(query(collection(db, 'marketplaceOrders'), limit(1000))),
    getDocs(query(collection(db, 'marketplaceDisputes'), where('status', '==', 'open'), limit(200))),
  ]);
  const gigs = gigsS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const orders = ordersS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  let gmv = 0, commissionEarned = 0, activeOrders = 0;
  const byProvider: Record<string, { gmv: number; commission: number; orders: number }> = {};
  for (const o of orders) {
    const gross = Number(o.amountGross || 0);
    const comm = Number(o.commissionAmount || 0);
    if (['paid', 'accepted', 'in_progress', 'completed'].includes(o.status)) {
      gmv += gross; commissionEarned += comm;
      const p = byProvider[o.providerId] || { gmv: 0, commission: 0, orders: 0 };
      p.gmv += gross; p.commission += comm; p.orders += 1;
      byProvider[o.providerId] = p;
    }
    if (['pending_payment', 'paid', 'accepted', 'in_progress'].includes(o.status)) activeOrders++;
  }
  const topProviders = Object.entries(byProvider)
    .map(([providerId, s]) => ({ providerId, ...s }))
    .sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  return {
    ok: true,
    data: {
      ok: true,
      kpis: {
        gmv, commissionEarned, activeOrders,
        openDisputes: disputesS.size,
        activeGigs: gigs.filter((g: any) => g.active !== false).length,
        totalGigs: gigs.length,
      },
      topProviders,
    },
  };
}

async function marketplaceGigs(filter: 'all' | 'active' | 'flagged' = 'all'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'marketplaceGigs'), limit(300)));
  let gigs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsToIso((d.data() as any).createdAt) }));
  if (filter === 'active') gigs = gigs.filter((g: any) => g.active !== false);
  if (filter === 'flagged') gigs = gigs.filter((g: any) => g.flagged === true);
  return { ok: true, data: { ok: true, gigs } };
}

async function gigModerate(id: string, action: 'feature' | 'unfeature' | 'deactivate' | 'reactivate' | 'flag' | 'unflag'): Promise<NativeResult> {
  const uid = requireOwner();
  const patch: Record<string, any> = { updatedAt: serverTimestamp(), moderatedBy: uid };
  if (action === 'feature') patch.featured = true;
  if (action === 'unfeature') patch.featured = false;
  if (action === 'deactivate') patch.active = false;
  if (action === 'reactivate') patch.active = true;
  if (action === 'flag') patch.flagged = true;
  if (action === 'unflag') patch.flagged = false;
  await updateDoc(doc(db, 'marketplaceGigs', id), patch);
  await writeAudit('marketplace.gig.moderate', { gigId: id, action }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function marketplaceOrders(filters: { status?: string; providerId?: string; limit?: number } = {}): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'marketplaceOrders'), limit(Math.min(filters.limit || 200, 500))));
  let orders = snap.docs.map((d) => ({
    id: d.id, ...(d.data() as any),
    createdAt: tsToIso((d.data() as any).createdAt),
    completedAt: tsToIso((d.data() as any).completedAt),
  }));
  if (filters.status && filters.status !== 'all') orders = orders.filter((o: any) => o.status === filters.status);
  if (filters.providerId) orders = orders.filter((o: any) => o.providerId === filters.providerId);
  orders.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, orders } };
}

async function orderForceStatus(id: string, status: 'completed' | 'cancelled' | 'refunded', note?: string): Promise<NativeResult> {
  const uid = requireOwner();
  if (!['completed', 'cancelled', 'refunded'].includes(status)) {
    return { ok: false, error: 'Invalid forced status.', code: 'BAD_STATUS' };
  }
  await updateDoc(doc(db, 'marketplaceOrders', id), {
    status, ownerNote: note || '', resolvedBy: uid,
    ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
  await writeAudit('marketplace.order.force', { orderId: id, status, note: note || '' }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function marketplaceDisputes(status = 'all'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'marketplaceDisputes'), limit(200)));
  let disputes = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsToIso((d.data() as any).createdAt) }));
  if (status !== 'all') disputes = disputes.filter((d: any) => d.status === status);
  disputes.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, disputes } };
}

async function disputeResolve(id: string, resolution: 'refund_client' | 'release_provider' | 'split', splitClient = 0, splitProvider = 0, note = ''): Promise<NativeResult> {
  const uid = requireOwner();
  const dSnap = await getDoc(doc(db, 'marketplaceDisputes', id));
  if (!dSnap.exists()) return { ok: false, error: 'Dispute not found.', code: 'NOT_FOUND' };
  const d: any = dSnap.data();
  await updateDoc(doc(db, 'marketplaceDisputes', id), {
    status: 'resolved', resolution, resolvedByUid: uid, resolvedAt: serverTimestamp(),
    resolutionNote: note, splitClient, splitProvider,
  });
  // Move the underlying order to the terminal state matching the resolution.
  if (d.orderId) {
    const orderStatus = resolution === 'refund_client' ? 'refunded' : 'completed';
    await updateDoc(doc(db, 'marketplaceOrders', d.orderId), {
      status: orderStatus, disputeResolution: resolution, updatedAt: serverTimestamp(),
    });
  }
  await writeAudit('marketplace.dispute.resolve', { disputeId: id, orderId: d.orderId, resolution }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ---------------- Commission overrides (per-category / per-provider) ---------------- */
/* Resolution order for NEW orders: provider override > category override > global rule. */

async function commissionOverrides(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(collection(db, 'commissionOverrides'));
  const overrides = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { ok: true, overrides } };
}

async function commissionOverrideSave(o: {
  id?: string; scope: 'category' | 'provider'; targetId: string; ratePercent: number;
  minCommission?: number; maxCommission?: number; active?: boolean; note?: string;
}): Promise<NativeResult> {
  const uid = requireOwner();
  if (o.ratePercent < 0 || o.ratePercent > 90) {
    return { ok: false, error: 'Rate must be 0–90%.', code: 'BAD_RATE' };
  }
  const payload = {
    scope: o.scope, targetId: o.targetId, ratePercent: o.ratePercent,
    minCommission: o.minCommission || 0, maxCommission: o.maxCommission || 0,
    active: o.active !== false, note: o.note || '',
    updatedAt: serverTimestamp(), updatedBy: uid,
  };
  if (o.id) {
    await updateDoc(doc(db, 'commissionOverrides', o.id), payload);
  } else {
    await addDoc(collection(db, 'commissionOverrides'), { ...payload, createdAt: serverTimestamp() });
  }
  await writeAudit('marketplace.commission.override', { scope: o.scope, targetId: o.targetId, ratePercent: o.ratePercent }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function commissionOverrideDelete(id: string): Promise<NativeResult> {
  requireOwner();
  await updateDoc(doc(db, 'commissionOverrides', id), { active: false, updatedAt: serverTimestamp() });
  await writeAudit('marketplace.commission.override.remove', { overrideId: id }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Provider tier for commission purposes: 'pro' (active purohit_pro subscription) or 'community' (free). */
export async function getProviderTier(providerUid: string): Promise<'pro' | 'community'> {
  try {
    const snap = await getDoc(doc(db, 'subscriptions', providerUid));
    if (snap.exists()) {
      const s: any = snap.data();
      const active = s.status === 'active' && (!s.endDate || new Date(s.endDate) > new Date());
      if (active && (s.planId === 'purohit_pro' || s.planId === 'jyotishi_pro')) return 'pro';
    }
    return 'community';
  } catch {
    return 'community';
  }
}

/** Commission rate config: editable from GodMode. Defaults: free 15%, pro rail1 8%, pro rail2 12%. */
export async function getCommissionConfig(): Promise<{ freeRate: number; proRail1Rate: number; proRail2Rate: number }> {
  const defaults = { freeRate: 15, proRail1Rate: 8, proRail2Rate: 12 };
  try {
    const snap = await getDoc(doc(db, 'platformConfig', 'commission'));
    if (snap.exists()) {
      const c: any = snap.data();
      return {
        freeRate: Number(c.freeRate ?? defaults.freeRate),
        proRail1Rate: Number(c.proRail1Rate ?? defaults.proRail1Rate),
        proRail2Rate: Number(c.proRail2Rate ?? defaults.proRail2Rate),
      };
    }
  } catch { /* fall through to defaults */ }
  return defaults;
}

export async function saveCommissionConfig(cfg: { freeRate: number; proRail1Rate: number; proRail2Rate: number }): Promise<NativeResult> {
  requireOwner();
  const clean = {
    freeRate: Math.min(100, Math.max(0, Number(cfg.freeRate) || 0)),
    proRail1Rate: Math.min(100, Math.max(0, Number(cfg.proRail1Rate) || 0)),
    proRail2Rate: Math.min(100, Math.max(0, Number(cfg.proRail2Rate) || 0)),
    updatedAt: serverTimestamp(),
    updatedBy: requireOwner(),
  };
  await setDoc(doc(db, 'platformConfig', 'commission'), clean, { merge: true });
  await writeAudit('marketplace.commission.config', clean, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Panjika Intelligence config: owner-editable role-event matrix overrides.
 * Stored at platformConfig/panjikaIntelligence. Fail-open: missing doc → null. */
export interface IntelConfigDoc {
  disabledKeys: string[];
  leadOverrides: Record<string, number>;
}

export async function getIntelConfig(): Promise<IntelConfigDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'platformConfig', 'panjikaIntelligence'));
    if (!snap.exists()) return null;
    const c: any = snap.data();
    return {
      disabledKeys: Array.isArray(c.disabledKeys) ? c.disabledKeys.filter((k: any) => typeof k === 'string') : [],
      leadOverrides: c.leadOverrides && typeof c.leadOverrides === 'object' ? c.leadOverrides : {},
    };
  } catch { return null; }
}

export async function saveIntelConfig(cfg: IntelConfigDoc): Promise<NativeResult> {
  const ownerUid = requireOwner();
  const clean = {
    disabledKeys: (cfg.disabledKeys || []).filter((k) => typeof k === 'string').slice(0, 500),
    leadOverrides: Object.fromEntries(
      Object.entries(cfg.leadOverrides || {})
        .filter(([, v]) => Number.isFinite(Number(v)))
        .map(([k, v]) => [k, Math.min(90, Math.max(0, Math.round(Number(v))))])
        .slice(0, 500)
    ),
    updatedAt: serverTimestamp(),
    updatedBy: ownerUid,
  };
  await setDoc(doc(db, 'platformConfig', 'panjikaIntelligence'), clean, { merge: true });
  await writeAudit('panjika.intelligence.config', { disabled: clean.disabledKeys.length, overrides: Object.keys(clean.leadOverrides).length }, 'info');
  return { ok: true, data: { ok: true } };
}

/** Geo payment region config: owner-editable payment rails (BD / IN / INTL +
 * any custom regions). Stored at `geoPaymentConfig/config`. Every signed-in
 * user reads it to pick payment rails (see src/lib/geoDetect.ts); the client
 * fails over to DEFAULT_REGIONS when the doc is absent. */
export interface GeoRegionInput {
  id: string;
  name: string;
  currency: string;
  currencySymbol: string;
  countryCodes: string[];
  ipCountries: string[];
  enabled: boolean;
  flag?: string;
}

export interface GeoConfigInput {
  regions: GeoRegionInput[];
  defaultRegion: string;
}

export async function geoConfigSave(cfg: GeoConfigInput): Promise<NativeResult> {
  const ownerUid = requireOwner();
  const cleanRegions = (Array.isArray(cfg.regions) ? cfg.regions : [])
    .filter((r) => r && typeof r.id === 'string' && r.id.trim())
    .slice(0, 50)
    .map((r) => ({
      id: r.id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'X',
      name: String(r.name || '').slice(0, 60),
      currency: String(r.currency || '').toUpperCase().slice(0, 8),
      currencySymbol: String(r.currencySymbol || '').slice(0, 8),
      countryCodes: (Array.isArray(r.countryCodes) ? r.countryCodes : [])
        .filter((c) => typeof c === 'string')
        .map((c) => c.replace(/\D/g, '').slice(0, 8))
        .filter(Boolean)
        .slice(0, 20),
      ipCountries: (Array.isArray(r.ipCountries) ? r.ipCountries : [])
        .filter((c) => typeof c === 'string')
        .map((c) => c.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))
        .filter(Boolean)
        .slice(0, 20),
      enabled: r.enabled !== false,
      ...(typeof r.flag === 'string' && r.flag.trim()
        ? { flag: r.flag.trim().slice(0, 12) }
        : {}),
    }));
  if (cleanRegions.length === 0) {
    return { ok: false, error: 'Add at least one region before saving.', code: 'BAD_REGIONS' };
  }
  const wantDefault = String(cfg.defaultRegion || '').toUpperCase();
  const defaultRegion = cleanRegions.some((r) => r.id === wantDefault)
    ? wantDefault
    : cleanRegions[0].id;
  const clean = {
    regions: cleanRegions,
    defaultRegion,
    updatedAt: serverTimestamp(),
    updatedBy: ownerUid,
  };
  await setDoc(doc(db, 'geoPaymentConfig', 'config'), clean, { merge: true });
  await writeAudit('geo.payments.config', { regions: cleanRegions.length, defaultRegion }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Resolve the effective commission for a NEW order.
 *  Resolution order: provider override > category override > tier+rail default > fallback.
 *  Rail-1 (platform-processed) is cheaper to encourage the trackable path. */
export async function resolveCommissionRate(
  providerId: string,
  category: string,
  providerType: string,
  rail: 'rail1' | 'rail2' = 'rail1',
): Promise<{ ratePercent: number; source: string; tier: 'pro' | 'community' }> {
  try {
    const [overS, ruleS, tier, cfg] = await Promise.all([
      getDocs(query(collection(db, 'commissionOverrides'), where('active', '==', true), limit(100))),
      getDocs(collection(db, 'commissionRules')),
      getProviderTier(providerId),
      getCommissionConfig(),
    ]);
    const overrides = overS.docs.map((d) => d.data() as any);
    const prov = overrides.find((o) => o.scope === 'provider' && o.targetId === providerId);
    if (prov) return { ratePercent: Number(prov.ratePercent), source: `provider override (${prov.note || 'custom'})`, tier };
    const cat = overrides.find((o) => o.scope === 'category' && o.targetId === category);
    if (cat) return { ratePercent: Number(cat.ratePercent), source: `category override (${category})`, tier };
    const rules = ruleS.docs.map((d) => d.data() as any).filter((r) => r.active !== false);
    const rule = rules.find((r) => r.serviceType === providerType || r.serviceType === 'both') || rules[0];
    if (rule && Number(rule.ratePercent) > 0) return { ratePercent: Number(rule.ratePercent), source: 'global rule', tier };
    // Tier + rail default
    const rate = tier === 'pro' ? (rail === 'rail1' ? cfg.proRail1Rate : cfg.proRail2Rate) : cfg.freeRate;
    return { ratePercent: rate, source: `tier default (${tier}, ${rail})`, tier };
  } catch {
    return { ratePercent: 12, source: 'platform default (fallback)', tier: 'community' };
  }
}

export function computeCommission(gross: number, ratePercent: number, min = 0, max = 0): { commission: number; net: number } {
  let commission = Math.round(gross * (ratePercent / 100));
  if (min > 0) commission = Math.max(commission, min);
  if (max > 0) commission = Math.min(commission, max);
  return { commission, net: gross - commission };
}

async function providerDetail(providerId: string): Promise<NativeResult> {
  requireOwner();
  const [ordersS, payoutsS] = await Promise.all([
    getDocs(query(collection(db, 'marketplaceOrders'), where('providerId', '==', providerId), limit(500))),
    getDocs(query(collection(db, 'payouts'), where('providerUid', '==', providerId), limit(200))),
  ]);
  const orders = ordersS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const payouts = payoutsS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  let gmv = 0, commission = 0, netEarned = 0, pendingNet = 0;
  for (const o of orders) {
    const gross = Number(o.amountGross || 0);
    const comm = Number(o.commissionAmount || 0);
    const net = Number(o.providerNet ?? gross - comm);
    if (o.status === 'completed') { gmv += gross; commission += comm; netEarned += net; }
    else if (['paid', 'accepted', 'in_progress'].includes(o.status)) { gmv += gross; commission += comm; pendingNet += net; }
  }
  return { ok: true, data: { ok: true, providerId, gmv, commission, netEarned, pendingNet, orderCount: orders.length, payouts } };
}

async function marketplaceProviders(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'marketplaceOrders'), limit(1000)));
  const byProvider: Record<string, { orders: number; gmv: number; commission: number; lastOrder: string }> = {};
  for (const d of snap.docs) {
    const o: any = d.data();
    const p = byProvider[o.providerId] || { orders: 0, gmv: 0, commission: 0, lastOrder: '' };
    p.orders++;
    if (['paid', 'accepted', 'in_progress', 'completed'].includes(o.status)) {
      p.gmv += Number(o.amountGross || 0);
      p.commission += Number(o.commissionAmount || 0);
    }
    const c = tsToIso(o.createdAt) || '';
    if (c > p.lastOrder) p.lastOrder = c;
    byProvider[o.providerId] = p;
  }
  const providers = Object.entries(byProvider)
    .map(([providerId, s]) => ({ providerId, providerType: '', ...s }))
    .sort((a, b) => b.gmv - a.gmv);
  return { ok: true, data: { ok: true, providers } };
}

/* ----------------- Payment method intelligence (PART 1) ----------------- */
/* Every payment claim / upgrade request carries paymentMethodId (canonical id
 * from the paymentMethods collection). Stats aggregate by method + period. */

const METHOD_LABELS: Record<string, string> = {
  bd_banglaqr: 'Bangla QR', bd_bkash: 'bKash', bd_nagad: 'Nagad',
  in_upi: 'UPI', intl_wise: 'Wise', intl_payoneer: 'Payoneer',
};

function canonicalMethodId(raw: any): string {
  const s = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('bangla') || s.includes('tallypay') || s.includes('qr')) return 'bd_banglaqr';
  if (s.includes('bkash')) return 'bd_bkash';
  if (s.includes('nagad')) return 'bd_nagad';
  if (s.includes('rocket')) return 'bd_bkash';
  if (s.includes('upi')) return 'in_upi';
  if (s.includes('wise')) return 'intl_wise';
  if (s.includes('payoneer')) return 'intl_payoneer';
  if (s.includes('intl')) return 'intl_wise';
  return 'unknown';
}

function periodStart(period: '7d' | '30d' | '90d' | 'all'): Date | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

async function paymentMethodStats(period: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<NativeResult> {
  requireOwner();
  const since = periodStart(period);
  const [claimsS, upgradesS] = await Promise.all([
    getDocs(query(collection(db, 'paymentClaims'), limit(1000))),
    getDocs(query(collection(db, 'upgrade_requests'), limit(1000))),
  ]);
  const all: any[] = [
    ...claimsS.docs.map((d) => ({ ...(d.data() as any), _src: 'claim' })),
    ...upgradesS.docs.map((d) => ({ ...(d.data() as any), _src: 'upgrade' })),
  ];
  const byMethod: Record<string, { count: number; volume: number; approved: number; amounts: number[] }> = {};
  for (const r of all) {
    const ts = r.createdAt?.toDate?.() || r.timestamp?.toDate?.() || null;
    if (since && ts && ts < since) continue;
    const mid = r.paymentMethodId || canonicalMethodId(r.paymentMethod);
    const m = byMethod[mid] || { count: 0, volume: 0, approved: 0, amounts: [] };
    const amt = Number(r.amount || r.planPrice || 0);
    m.count++; m.volume += amt; m.amounts.push(amt);
    const st = String(r.status || '').toLowerCase();
    if (st === 'approved' || st === 'active') m.approved++;
    byMethod[mid] = m;
  }
  const methods = Object.entries(byMethod).map(([methodId, s]) => ({
    methodId,
    label: METHOD_LABELS[methodId] || methodId,
    count: s.count,
    volume: s.volume,
    avgTicket: s.count ? Math.round(s.volume / s.count) : 0,
    approvalRate: s.count ? Math.round((s.approved / s.count) * 100) : 0,
  })).sort((a, b) => b.volume - a.volume);
  return { ok: true, data: { ok: true, period, methods } };
}

async function paymentHistory(filters: { methodId?: string; status?: string; limit?: number } = {}): Promise<NativeResult> {
  requireOwner();
  const [claimsS, upgradesS] = await Promise.all([
    getDocs(query(collection(db, 'paymentClaims'), limit(500))),
    getDocs(query(collection(db, 'upgrade_requests'), limit(500))),
  ]);
  let rows: any[] = [
    ...claimsS.docs.map((d) => {
      const v: any = d.data();
      return {
        id: d.id, src: 'claim', methodId: v.paymentMethodId || canonicalMethodId(v.paymentMethod),
        amount: Number(v.amount || 0), status: v.status, applicant: v.applicantUid || v.email || '',
        trxId: v.transactionId || '', createdAt: tsToIso(v.createdAt),
      };
    }),
    ...upgradesS.docs.map((d) => {
      const v: any = d.data();
      return {
        id: d.id, src: 'upgrade', methodId: v.paymentMethodId || canonicalMethodId(v.paymentMethod),
        amount: Number(v.amount || 0), status: v.status, applicant: v.contactInfo || v.adminName || '',
        trxId: v.transactionId || '', createdAt: tsToIso(v.timestamp),
      };
    }),
  ];
  if (filters.methodId && filters.methodId !== 'all') rows = rows.filter((r) => r.methodId === filters.methodId);
  if (filters.status && filters.status !== 'all') rows = rows.filter((r) => String(r.status).toLowerCase() === filters.status.toLowerCase());
  rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, rows: rows.slice(0, filters.limit || 200) } };
}

async function exportPaymentCSV(period: '7d' | '30d' | '90d' | 'all' = 'all'): Promise<NativeResult> {
  requireOwner();
  const h = await paymentHistory({ limit: 2000 });
  if (!h.ok) return h;
  const rows: any[] = (h.data as any).rows || [];
  const since = periodStart(period);
  const filtered = since ? rows.filter((r) => !r.createdAt || new Date(r.createdAt) >= since) : rows;
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['id,source,method,amount,status,applicant,trxId,createdAt',
    ...filtered.map((r) => [r.id, r.src, r.methodId, r.amount, r.status, r.applicant, r.trxId, r.createdAt].map(esc).join(',')),
  ].join('\n');
  await writeAudit('billing.payments.export', { period, rows: filtered.length }, 'info');
  return { ok: true, data: { ok: true, csv, count: filtered.length } };
}

/* ----------------- Provider payments + anti-bypass (Spark-native) -----------------
 * - providerPaymentMethods: approve / reject / assign-platform
 * - providerInquiries: list + reply (delivered to provider inbox)
 * - bypassFlags: review queue (dismiss / warn / suspend)
 * - bypassKeywords: owner-editable detection patterns
 * - providerStrikes: issue with automatic escalation
 * --------------------------------------------------------------------------- */

async function providerPaymentQueue(status: 'pending' | 'all' = 'pending'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'providerPaymentMethods'), limit(200)));
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (status === 'pending') rows = rows.filter((r: any) => r.status === 'pending');
  rows.sort((a: any, b: any) => String(b.submittedAt?.toDate?.() || b.submittedAt || '').localeCompare(String(a.submittedAt?.toDate?.() || a.submittedAt || '')));
  return { ok: true, data: { rows } };
}

async function providerPaymentReview(
  id: string,
  action: 'approved' | 'rejected' | 'platform_assigned',
  reviewNotes = ''
): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'providerPaymentMethods', id);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Record not found.' };
  const rec: any = s.data();
  await updateDoc(ref, {
    status: action,
    reviewNotes: reviewNotes.slice(0, 500),
    reviewedByUid: uid,
    reviewedAt: serverTimestamp(),
  });
  // Notify the provider via inbox
  const titles: Record<string, string> = {
    approved: '✅ Payment method approved',
    rejected: '❌ Payment method not approved',
    platform_assigned: 'ℹ️ Platform payment method assigned',
  };
  const bodies: Record<string, string> = {
    approved: `Your own payment method has been approved.${reviewNotes ? `\n\nNote from review: ${reviewNotes}` : ''}\n\nClients will see your payment details at booking. The 12% platform commission still applies to every order.`,
    rejected: `Your payment method request was not approved.${reviewNotes ? `\n\nReason: ${reviewNotes}` : ''}\n\nYou can use the platform payment method (no setup needed) or contact the owner to discuss.`,
    platform_assigned: `The platform payment method has been assigned to your account.${reviewNotes ? `\n\nNote: ${reviewNotes}` : ''}\n\nClients pay through the platform; your net earnings (after 12% commission) are available for payout.`,
  };
  try {
    await addDoc(collection(db, 'messages'), {
      targetUid: rec.providerUid,
      title: titles[action],
      body: bodies[action],
      type: 'announcement',
      createdBy: uid,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch { /* non-fatal */ }
  await writeAudit('marketplace.payment.review', { methodId: id, providerUid: rec.providerUid, action }, 'warn');
  return { ok: true, data: { ok: true } };
}

async function providerInquiriesList(status: 'open' | 'all' = 'open'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'providerInquiries'), limit(200)));
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (status === 'open') rows = rows.filter((r: any) => r.status === 'open');
  rows.sort((a: any, b: any) => String(b.createdAt?.toDate?.() || '').localeCompare(String(a.createdAt?.toDate?.() || '')));
  return { ok: true, data: { rows } };
}

async function providerInquiryReply(id: string, reply: string): Promise<NativeResult> {
  const uid = requireOwner();
  if (!reply.trim()) return { ok: false, error: 'Reply cannot be empty.' };
  const ref = doc(db, 'providerInquiries', id);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Inquiry not found.' };
  const inq: any = s.data();
  await updateDoc(ref, { status: 'replied', ownerReply: reply.slice(0, 2000), repliedAt: serverTimestamp() });
  try {
    await addDoc(collection(db, 'messages'), {
      targetUid: inq.providerUid,
      title: `💬 Reply: ${String(inq.subject || '').slice(0, 60)}`,
      body: reply.slice(0, 2000),
      type: 'announcement',
      createdBy: uid,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch { /* non-fatal */ }
  await writeAudit('marketplace.inquiry.reply', { inquiryId: id, providerUid: inq.providerUid }, 'info');
  return { ok: true, data: { ok: true } };
}

/* ---------------- Bypass flags ---------------- */

async function bypassFlagsList(status: 'pending' | 'all' = 'pending'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'bypassFlags'), limit(300)));
  let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (status === 'pending') rows = rows.filter((r: any) => r.status === 'pending');
  rows.sort((a: any, b: any) => String(b.createdAt?.toDate?.() || '').localeCompare(String(a.createdAt?.toDate?.() || '')));
  return { ok: true, data: { rows } };
}

async function bypassFlagResolve(id: string, action: 'dismiss' | 'warn' | 'suspend_gigs'): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'bypassFlags', id);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Flag not found.' };
  const flag: any = s.data();
  await updateDoc(ref, { status: action === 'dismiss' ? 'dismissed' : 'actioned', actionTaken: action, resolvedByUid: uid, resolvedAt: serverTimestamp() });

  if (action === 'warn') {
    await issueStrikeInternal(flag.senderUid, 'bypass_attempt', flag.orderId || '', `Flagged message excerpt: "${String(flag.excerpt || '').slice(0, 80)}"`, uid);
  } else if (action === 'suspend_gigs') {
    await issueStrikeInternal(flag.senderUid, 'bypass_attempt', flag.orderId || '', `Flagged message excerpt: "${String(flag.excerpt || '').slice(0, 80)}" (owner chose suspension)`, uid);
    // Suspend all active gigs for 7 days
    try {
      const gigs = await getDocs(query(collection(db, 'marketplaceGigs'), where('providerUid', '==', flag.senderUid), limit(100)));
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      for (const g of gigs.docs) {
        await updateDoc(doc(db, 'marketplaceGigs', g.id), { active: false, suspendedUntil: until, updatedAt: serverTimestamp() });
      }
    } catch { /* non-fatal */ }
  }
  await writeAudit('marketplace.bypass.resolve', { flagId: id, action, senderUid: flag.senderUid }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Internal strike issuer with automatic escalation. */
async function issueStrikeInternal(
  providerUid: string,
  type: 'bypass_attempt' | 'payment_fraud' | 'fake_completion' | 'other',
  orderId: string,
  notes: string,
  issuedByUid: string
): Promise<{ strikeNumber: number; actionTaken: string }> {
  const existing = await getDocs(query(collection(db, 'providerStrikes'), where('providerUid', '==', providerUid), limit(50)));
  const strikeNumber = existing.size + 1;
  let actionTaken: 'warning' | 'suspension_7d' | 'review_flagged' = 'warning';
  if (strikeNumber === 2) actionTaken = 'suspension_7d';
  else if (strikeNumber >= 3) actionTaken = 'review_flagged';

  await addDoc(collection(db, 'providerStrikes'), {
    providerUid,
    type,
    orderId: orderId || '',
    notes: notes.slice(0, 500),
    strikeNumber,
    actionTaken,
    issuedByUid,
    createdAt: serverTimestamp(),
  });

  // Notify provider
  const msgs: Record<string, string> = {
    warning: `⚠️ Strike ${strikeNumber}: A marketplace policy violation was recorded on your account.\n\n${notes}\n\nPlease review the marketplace terms. Further violations lead to temporary suspension.`,
    suspension_7d: `⛔ Strike ${strikeNumber}: Your gigs have been suspended for 7 days due to repeated policy violations.\n\n${notes}\n\nContact the owner if you believe this is a mistake.`,
    review_flagged: `🚨 Strike ${strikeNumber}: Your account has been flagged for owner review due to repeated violations.\n\n${notes}\n\nThe owner will decide on further action.`,
  };
  try {
    await addDoc(collection(db, 'messages'), {
      targetUid: providerUid,
      title: `Marketplace policy — strike ${strikeNumber}`,
      body: msgs[actionTaken],
      type: 'urgent',
      createdBy: issuedByUid,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch { /* non-fatal */ }
  return { strikeNumber, actionTaken };
}

async function issueStrike(
  providerUid: string,
  type: 'bypass_attempt' | 'payment_fraud' | 'fake_completion' | 'other',
  orderId = '',
  notes = ''
): Promise<NativeResult> {
  const uid = requireOwner();
  const r = await issueStrikeInternal(providerUid, type, orderId, notes, uid);
  await writeAudit('marketplace.strike.issue', { providerUid, type, ...r }, 'critical');
  return { ok: true, data: r };
}

async function providerStrikesList(providerUid: string): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'providerStrikes'), where('providerUid', '==', providerUid), limit(50)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  rows.sort((a: any, b: any) => Number(b.strikeNumber || 0) - Number(a.strikeNumber || 0));
  return { ok: true, data: { rows, count: rows.length } };
}

/* ---------------- Bypass keyword patterns ---------------- */

async function bypassKeywordsList(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'bypassKeywords'), limit(200)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return { ok: true, data: { rows } };
}

async function bypassKeywordSave(input: { id?: string; pattern: string; label: string; severity?: 'low' | 'medium' | 'high'; active?: boolean }): Promise<NativeResult> {
  const uid = requireOwner();
  if (!input.pattern?.trim() || !input.label?.trim()) return { ok: false, error: 'Pattern and label are required.' };
  try { new RegExp(input.pattern); } catch { return { ok: false, error: 'Invalid regular expression.' }; }
  const payload = {
    pattern: input.pattern.trim().slice(0, 300),
    label: input.label.trim().slice(0, 120),
    severity: input.severity || 'medium',
    active: input.active !== false,
    updatedByUid: uid,
    updatedAt: serverTimestamp(),
  };
  if (input.id) {
    await updateDoc(doc(db, 'bypassKeywords', input.id), payload);
  } else {
    await addDoc(collection(db, 'bypassKeywords'), { ...payload, createdAt: serverTimestamp() });
  }
  await writeAudit('marketplace.bypass.keyword.save', { label: payload.label }, 'info');
  return { ok: true, data: { ok: true } };
}

async function bypassKeywordDelete(id: string): Promise<NativeResult> {
  requireOwner();
  const s = await getDoc(doc(db, 'bypassKeywords', id));
  if (!s.exists()) return { ok: false, error: 'Not found.' };
  await updateDoc(doc(db, 'bypassKeywords', id), { active: false, updatedAt: serverTimestamp() });
  await writeAudit('marketplace.bypass.keyword.delete', { id }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ------------------- Rail-2: platform dues (Layer 6) ------------------- */
/**
 * Every completed Rail-2 order creates a commission RECEIVABLE.
 * The provider owes the platform 12% (or their assigned rate) of gross.
 * Dues are settled via bKash, auto-deducted from Rail-1 payouts, and
 * auto-pause gigs when overdue past threshold + grace.
 */

export async function duesCreateForOrder(orderId: string): Promise<boolean> {
  try {
    const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
    if (!s.exists()) return false;
    const o: any = s.data();
    if (o.rail !== 'rail2') return false;
    // Idempotency: don't double-create.
    const existing = await getDocs(query(collection(db, 'platformDues'), where('orderId', '==', orderId), limit(1)));
    if (!existing.empty) return false;
    await addDoc(collection(db, 'platformDues'), {
      providerUid: o.providerUid,
      orderId,
      orderCode: o.orderCode || '',
      gigTitle: o.gigTitle || '',
      amount: Number(o.commissionAmount || 0),
      currency: o.currency || 'INR',
      ratePercent: Number(o.commissionPercent || 12),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

async function duesList(status = 'all'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'platformDues'), limit(500)));
  let dues = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsToIso((d.data() as any).createdAt), settledAt: tsToIso((d.data() as any).settledAt) }));
  if (status !== 'all') dues = dues.filter((d: any) => d.status === status);
  dues.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const totalPending = dues.filter((d: any) => d.status === 'pending').reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
  return { ok: true, data: { ok: true, dues, totalPending } };
}

async function dueSettle(id: string, note?: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'platformDues', id);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Due not found.', code: 'NOT_FOUND' };
  const d: any = s.data();
  if (d.status !== 'pending') return { ok: false, error: 'Due is not pending.', code: 'STALE' };
  await updateDoc(ref, { status: 'settled', settledBy: uid, settledAt: serverTimestamp(), settleNote: (note || '').slice(0, 500) });
  await writeAudit('rail2.due.settle', { dueId: id, providerUid: d.providerUid, amount: d.amount }, 'warn');
  // Auto-unsuspend if no more pending dues past grace.
  try { await checkDuesSuspension(d.providerUid); } catch { /* non-fatal */ }
  return { ok: true, data: { ok: true } };
}

async function dueWaive(id: string, reason: string): Promise<NativeResult> {
  requireOwner();
  if (!reason.trim()) return { ok: false, error: 'Waiver reason is required.', code: 'BAD_INPUT' };
  const ref = doc(db, 'platformDues', id);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Due not found.', code: 'NOT_FOUND' };
  const d: any = s.data();
  await updateDoc(ref, { status: 'waived', waiveReason: reason.trim().slice(0, 500), settledAt: serverTimestamp() });
  await writeAudit('rail2.due.waive', { dueId: id, providerUid: d.providerUid, amount: d.amount, reason }, 'critical');
  return { ok: true, data: { ok: true } };
}

async function duesSettingsGet(): Promise<NativeResult> {
  requireOwner();
  const s = await getDoc(doc(db, 'platformConfig', 'rail2'));
  const d: any = s.exists() ? s.data() : {};
  return {
    ok: true,
    data: {
      ok: true,
      duesThreshold: Number(d.duesThreshold ?? 2000),
      duesGraceDays: Number(d.duesGraceDays ?? 15),
    },
  };
}

async function duesSettingsSave(duesThreshold: number, duesGraceDays: number): Promise<NativeResult> {
  const uid = requireOwner();
  const t = Math.max(0, Math.round(Number(duesThreshold) || 0));
  const g = Math.max(1, Math.min(90, Math.round(Number(duesGraceDays) || 15)));
  await setDoc(doc(db, 'platformConfig', 'rail2'), {
    duesThreshold: t, duesGraceDays: g, updatedAt: serverTimestamp(), updatedBy: uid,
  }, { merge: true });
  await writeAudit('rail2.settings.save', { duesThreshold: t, duesGraceDays: g }, 'warn');
  return { ok: true, data: { ok: true, duesThreshold: t, duesGraceDays: g } };
}

/**
 * Auto-pause check: if a provider's oldest pending due exceeds
 * threshold AND grace days → set duesSuspended. Clears when clean.
 * Called after settle/waive and from the Risk dashboard.
 */
async function checkDuesSuspension(providerUid: string): Promise<NativeResult> {
  requireOwner();
  const cfg = await duesSettingsGet();
  const threshold = Number((cfg.data as any).duesThreshold || 2000);
  const graceDays = Number((cfg.data as any).duesGraceDays || 15);
  const snap = await getDocs(query(collection(db, 'platformDues'), where('providerUid', '==', providerUid), where('status', '==', 'pending'), limit(200)));
  const dues = snap.docs.map((d) => ({ ...(d.data() as any), createdAt: (d.data() as any).createdAt?.toDate?.()?.getTime?.() || 0 }));
  const total = dues.reduce((s, d: any) => s + Number(d.amount || 0), 0);
  const oldest = dues.length ? Math.min(...dues.map((d: any) => d.createdAt)) : 0;
  const ageDays = oldest ? (Date.now() - oldest) / 86400000 : 0;
  const shouldSuspend = total >= threshold && ageDays >= graceDays;
  // Store on a provider profile doc (marketplaceProviders/{uid}).
  const profRef = doc(db, 'marketplaceProviders', providerUid);
  await setDoc(profRef, {
    duesSuspended: shouldSuspend,
    duesTotal: total,
    duesCheckedAt: serverTimestamp(),
    ...(shouldSuspend ? { suspendedAt: serverTimestamp(), suspendReason: 'Unpaid platform dues past grace period.' } : {}),
  }, { merge: true });
  if (shouldSuspend) {
    await writeAudit('rail2.dues.auto_suspend', { providerUid, total, ageDays: Math.round(ageDays) }, 'critical');
  }
  return { ok: true, data: { ok: true, suspended: shouldSuspend, total, ageDays: Math.round(ageDays) } };
}

async function unsuspendProvider(providerUid: string): Promise<NativeResult> {
  requireOwner();
  await setDoc(doc(db, 'marketplaceProviders', providerUid), {
    duesSuspended: false, manuallyUnsuspended: true, unsuspendedAt: serverTimestamp(),
  }, { merge: true });
  await writeAudit('rail2.dues.unsuspend', { providerUid }, 'warn');
  return { ok: true, data: { ok: true } };
}

/* ------------------- Rail-2: SMS verification (Layer 4) ------------------- */

/** Owner asks a provider to forward the bKash 16222 SMS for an order. */
async function requestSmsProof(orderId: string): Promise<NativeResult> {
  const uid = requireOwner();
  const s = await getDoc(doc(db, 'marketplaceOrders', orderId));
  if (!s.exists()) return { ok: false, error: 'Order not found.', code: 'NOT_FOUND' };
  const o: any = s.data();
  await updateDoc(doc(db, 'marketplaceOrders', orderId), {
    smsRequestedAt: serverTimestamp(), smsRequestedBy: uid, updatedAt: serverTimestamp(),
  });
  // Inbox message to provider (uses the existing `messages` collection).
  await addDoc(collection(db, 'messages'), {
    targetUid: o.providerUid,
    title: `Payment verification — order ${o.orderCode || orderId.slice(0, 8)}`,
    body: `Please forward the bKash/Nagad SMS (from 16222) for order ${o.orderCode || ''} (TrxID ${o.rail2Proof?.trxId || '—'}, amount ${o.rail2Proof?.amount || o.payableAmount || ''}). Reply to this message with the SMS text.`,
    type: 'verification_request',
    createdBy: uid,
    read: false,
    createdAt: serverTimestamp(),
  });
  await writeAudit('rail2.sms.request', { orderId, providerUid: o.providerUid }, 'info');
  return { ok: true, data: { ok: true } };
}

/** Owner marks an order's payment as SMS-verified. */
async function verifySms(orderId: string): Promise<NativeResult> {
  requireOwner();
  const ref = doc(db, 'marketplaceOrders', orderId);
  const s = await getDoc(ref);
  if (!s.exists()) return { ok: false, error: 'Order not found.', code: 'NOT_FOUND' };
  await updateDoc(ref, { smsVerified: true, smsVerifiedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await writeAudit('rail2.sms.verify', { orderId }, 'info');
  return { ok: true, data: { ok: true } };
}

/* ------------------- Rail-2: risk dashboard (Layer 7) ------------------- */

async function riskDashboard(): Promise<NativeResult> {
  requireOwner();
  const [ordersS, gigsS, duesS, flagsS] = await Promise.all([
    getDocs(query(collection(db, 'marketplaceOrders'), limit(1000))),
    getDocs(query(collection(db, 'marketplaceGigs'), limit(500))),
    getDocs(query(collection(db, 'platformDues'), where('status', '==', 'pending'), limit(500))),
    getDocs(query(collection(db, 'bypassFlags'), limit(200))),
  ]);
  const orders = ordersS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const gigs = gigsS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const dues = duesS.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const d7 = now - 7 * 86400000;

  const ts = (v: any) => { try { return v?.toDate?.()?.getTime?.() || 0; } catch { return 0; } };

  // 1. High views, low orders — approximate via gig totalOrders vs a views field if present.
  const highViewsLowOrders = gigs
    .filter((g: any) => Number(g.views || 0) > 50 && Number(g.totalOrders || 0) < 2)
    .map((g: any) => ({ gigId: g.id, title: g.title, providerUid: g.providerUid, views: g.views, orders: g.totalOrders }));

  // 2. No-proof Rail-2: providers with >3 Rail-2 orders but zero submitted TrxIDs.
  const rail2ByProvider: Record<string, any[]> = {};
  for (const o of orders) {
    if ((o as any).rail !== 'rail2') continue;
    const p = (o as any).providerUid;
    (rail2ByProvider[p] = rail2ByProvider[p] || []).push(o);
  }
  const noProofRail2 = Object.entries(rail2ByProvider)
    .filter(([, os]) => os.length > 3 && os.every((o: any) => !o.rail2Proof?.trxId))
    .map(([providerUid, os]) => ({ providerUid, rail2Orders: os.length, orderIds: os.slice(0, 5).map((o: any) => o.id) }));

  // 3. Chatty non-bookers: clients with many orders in pending_payment but none paid.
  // (Message counts aren't tracked; proxy via abandoned pending_payment orders.)
  const byClient: Record<string, any[]> = {};
  for (const o of orders) {
    const c = (o as any).clientUid;
    (byClient[c] = byClient[c] || []).push(o);
  }
  const chattyNonBookers = Object.entries(byClient)
    .filter(([, os]) => os.filter((o: any) => o.status === 'pending_payment').length >= 3
      && !os.some((o: any) => ['paid', 'accepted', 'in_progress', 'completed'].includes(o.status)))
    .map(([clientUid, os]) => ({ clientUid, abandonedOrders: os.length }));

  // 4. Rating velocity: gigs with high avgRating but few completed orders (suspicious).
  const ratingVelocity = gigs
    .filter((g: any) => Number(g.avgRating || 0) >= 4.8 && Number(g.totalOrders || 0) <= 3 && Number(g.totalOrders || 0) > 0)
    .map((g: any) => ({ gigId: g.id, title: g.title, providerUid: g.providerUid, rating: g.avgRating, orders: g.totalOrders }));

  // 5. Overdue dues.
  const cfg = await duesSettingsGet().catch(() => ({ data: { duesThreshold: 2000, duesGraceDays: 15 } } as any));
  const threshold = Number((cfg.data as any).duesThreshold || 2000);
  const graceDays = Number((cfg.data as any).duesGraceDays || 15);
  const duesByProvider: Record<string, any[]> = {};
  for (const d of dues) {
    const p = (d as any).providerUid;
    (duesByProvider[p] = duesByProvider[p] || []).push(d);
  }
  const overdueDues = Object.entries(duesByProvider)
    .map(([providerUid, ds]) => {
      const total = ds.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
      const oldest = Math.min(...ds.map((d: any) => ts(d.createdAt)));
      const ageDays = oldest ? (now - oldest) / 86400000 : 0;
      return { providerUid, total, ageDays: Math.round(ageDays), count: ds.length };
    })
    .filter((r) => r.total >= threshold && r.ageDays >= graceDays);

  // Random audit picker: 10% of last week's Rail-2 orders (min 1, max 10).
  const lastWeekRail2 = orders.filter((o: any) => (o as any).rail === 'rail2' && ts((o as any).createdAt) >= now - 7 * 86400000);
  const pickN = Math.min(10, Math.max(lastWeekRail2.length > 0 ? 1 : 0, Math.ceil(lastWeekRail2.length * 0.1)));
  const shuffled = [...lastWeekRail2].sort(() => Math.random() - 0.5);
  const auditPick = shuffled.slice(0, pickN).map((o: any) => ({
    orderId: o.id, orderCode: o.orderCode, providerUid: o.providerUid,
    trxId: o.rail2Proof?.trxId || null, amount: o.rail2Proof?.amount || o.payableAmount,
  }));

  const bypassFlagCount = flagsS.size;

  return {
    ok: true,
    data: {
      ok: true,
      highViewsLowOrders, noProofRail2, chattyNonBookers, ratingVelocity, overdueDues, auditPick,
      bypassFlagCount,
      summary: {
        rail2Orders: orders.filter((o: any) => (o as any).rail === 'rail2').length,
        pendingDuesTotal: dues.reduce((s: number, d: any) => s + Number(d.amount || 0), 0),
        signals: highViewsLowOrders.length + noProofRail2.length + chattyNonBookers.length + ratingVelocity.length + overdueDues.length,
      },
    },
  };
}

/** Owner triggers SMS-proof requests for the audit-picked orders. */
async function auditPickRequestSms(orderIds: string[]): Promise<NativeResult> {
  requireOwner();
  let sent = 0;
  for (const id of orderIds.slice(0, 10)) {
    const r = await requestSmsProof(id);
    if (r.ok) sent++;
  }
  await writeAudit('rail2.audit.batch_sms', { orderIds, sent }, 'warn');
  return { ok: true, data: { ok: true, sent } };
}

/* --------------------------------- Export -------------------------------- */

/* ------------------- Wallet + escrow top-up (owner) ------------------- */

async function topupQueue(status = 'pending'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'topupClaims'), where('status', '==', status), limit(100)));
  const claims = snap.docs
    .map((d) => {
      const v: any = d.data();
      return {
        id: d.id, uid: v.uid, amount: v.amount, currency: v.currency,
        paymentMethodId: v.paymentMethodId, trxId: v.trxId, screenshotUrl: v.screenshotUrl,
        status: v.status, rejectionReason: v.rejectionReason,
        createdAt: tsToIso(v.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, claims } };
}

/** Approve a top-up: credit the user's wallet + ledger entry + audit. */
async function topupApprove(id: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'topupClaims', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Claim not found.', code: 'NOT_FOUND' };
  const claim: any = snap.data();
  if (claim.status !== 'pending') return { ok: false, error: 'Claim is no longer pending.', code: 'STALE' };
  const amount = Math.round(Number(claim.amount));
  if (!amount || amount <= 0) return { ok: false, error: 'Invalid claim amount.', code: 'BAD_AMOUNT' };

  const walletRef = doc(db, 'wallets', claim.uid);
  const walletSnap = await getDoc(walletRef);
  const before = walletSnap.exists() ? Number((walletSnap.data() as any).balance || 0) : 0;
  const w = walletSnap.exists() ? (walletSnap.data() as any) : null;
  const currency = ['BDT', 'INR', 'USD'].includes(claim.currency) ? claim.currency : 'BDT';
  if (w && w.currency && w.currency !== currency) {
    return { ok: false, error: `Currency mismatch: wallet is ${w.currency}, claim is ${currency}. Adjust manually.`, code: 'CURRENCY_MISMATCH' };
  }

  await updateDoc(ref, { status: 'approved', reviewedByUid: uid, reviewedAt: serverTimestamp() });
  await setDoc(
    walletRef,
    {
      uid: claim.uid,
      balance: before + amount,
      currency,
      totalToppedUp: Number(w?.totalToppedUp || 0) + amount,
      totalSpent: Number(w?.totalSpent || 0),
      totalReceived: Number(w?.totalReceived || 0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await addDoc(collection(db, 'walletTransactions'), {
    uid: claim.uid,
    type: 'topup',
    amount,
    currency,
    topupClaimId: id,
    note: `Top-up approved (${claim.paymentMethodId}, TrxID ${claim.trxId})`,
    createdAt: serverTimestamp(),
  });
  await writeAudit(
    'wallet.topup.approve',
    { claimId: id, uid: claim.uid, amount, currency, balanceBefore: before, balanceAfter: before + amount },
    'warn'
  );
  return { ok: true, data: { ok: true, balanceAfter: before + amount } };
}

async function topupReject(id: string, reason: string): Promise<NativeResult> {
  requireOwner();
  const ref = doc(db, 'topupClaims', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Claim not found.', code: 'NOT_FOUND' };
  const claim: any = snap.data();
  if (claim.status !== 'pending') return { ok: false, error: 'Claim is no longer pending.', code: 'STALE' };
  await updateDoc(ref, {
    status: 'rejected', rejectionReason: reason.slice(0, 500),
    reviewedByUid: requireOwner(), reviewedAt: serverTimestamp(),
  });
  await writeAudit('wallet.topup.reject', { claimId: id, uid: claim.uid, reason: reason.slice(0, 200) }, 'warn');
  return { ok: true, data: { ok: true } };
}

/** Owner view of a user's wallet + recent ledger. */
async function walletLookup(uid: string): Promise<NativeResult> {
  requireOwner();
  const walletSnap = await getDoc(doc(db, 'wallets', uid));
  const wallet = walletSnap.exists() ? { id: walletSnap.id, ...(walletSnap.data() as any) } : null;
  let txns: any[] = [];
  try {
    const snap = await getDocs(query(collection(db, 'walletTransactions'), where('uid', '==', uid), limit(50)));
    txns = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsToIso((d.data() as any).createdAt) }));
  } catch { /* fail-open on read */ }
  let user: any = null;
  try {
    const usnap = await getDoc(doc(db, 'users', uid));
    if (usnap.exists()) user = { id: usnap.id, ...(usnap.data() as any) };
  } catch { /* optional */ }
  return { ok: true, data: { ok: true, wallet, txns, user } };
}

/** Manual owner credit/debit with reason. Every adjustment is audit-logged with before/after. */
async function walletAdjust(uid: string, amount: number, reason: string): Promise<NativeResult> {
  const ownerUid = requireOwner();
  const delta = Math.round(Number(amount));
  if (!delta || delta === 0) return { ok: false, error: 'Amount must be non-zero.', code: 'BAD_AMOUNT' };
  if (!reason.trim()) return { ok: false, error: 'A reason is required.', code: 'NO_REASON' };
  const walletRef = doc(db, 'wallets', uid);
  const walletSnap = await getDoc(walletRef);
  const before = walletSnap.exists() ? Number((walletSnap.data() as any).balance || 0) : 0;
  const after = before + delta;
  if (after < 0) return { ok: false, error: 'Adjustment would make the balance negative.', code: 'NEGATIVE' };
  const w = walletSnap.exists() ? (walletSnap.data() as any) : null;
  await setDoc(
    walletRef,
    {
      uid,
      balance: after,
      currency: w?.currency || 'BDT',
      totalToppedUp: Number(w?.totalToppedUp || 0) + (delta > 0 ? delta : 0),
      totalSpent: Number(w?.totalSpent || 0),
      totalReceived: Number(w?.totalReceived || 0),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await addDoc(collection(db, 'walletTransactions'), {
    uid,
    type: 'adjustment',
    amount: Math.abs(delta),
    currency: w?.currency || 'BDT',
    note: `Owner ${delta > 0 ? 'credit' : 'debit'}: ${reason.slice(0, 300)}`,
    createdAt: serverTimestamp(),
  });
  await writeAudit(
    'wallet.adjust',
    { uid, delta, reason: reason.slice(0, 200), balanceBefore: before, balanceAfter: after, by: ownerUid },
    'critical'
  );
  return { ok: true, data: { ok: true, balanceAfter: after } };
}

/** Pending commission payments (Path B). */
async function commissionPaymentsQueue(status = 'pending'): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'commissionPayments'), where('status', '==', status), limit(100)));
  const items = snap.docs
    .map((d) => {
      const v: any = d.data();
      return {
        id: d.id, orderId: v.orderId, clientUid: v.clientUid, providerUid: v.providerUid,
        amount: v.amount, currency: v.currency, paidByUid: v.paidByUid, payerRole: v.payerRole,
        paymentMethodId: v.paymentMethodId, trxId: v.trxId, status: v.status,
        createdAt: tsToIso(v.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, payments: items } };
}

/** Confirm a commission payment → order completes (Path B gate opens). */
async function commissionPaymentConfirm(id: string): Promise<NativeResult> {
  const uid = requireOwner();
  const ref = doc(db, 'commissionPayments', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Payment not found.', code: 'NOT_FOUND' };
  const pay: any = snap.data();
  if (pay.status !== 'pending') return { ok: false, error: 'Payment is no longer pending.', code: 'STALE' };

  const orderRef = doc(db, 'marketplaceOrders', pay.orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) return { ok: false, error: 'Order not found.', code: 'ORDER_NOT_FOUND' };
  const order: any = orderSnap.data();
  if (Number(pay.amount) < Number(order.commissionAmount || 0)) {
    return { ok: false, error: `Paid ${pay.amount} is less than the ${order.commissionAmount} commission due.`, code: 'UNDERPAID' };
  }

  await updateDoc(ref, { status: 'confirmed', confirmedByUid: uid, confirmedAt: serverTimestamp() });
  await updateDoc(orderRef, { status: 'completed', commissionPaidVia: pay.id, completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  // Platform revenue ledger for the confirmed commission.
  try {
    await setDoc(doc(db, 'platformRevenue', pay.orderId), {
      orderId: pay.orderId,
      amount: Number(order.commissionAmount || 0),
      currency: order.currency || 'BDT',
      providerUid: order.providerUid,
      clientUid: order.clientUid,
      recordedBy: uid,
      via: 'commission_payment',
      createdAt: serverTimestamp(),
    });
  } catch { /* non-fatal — revenue backfill possible */ }
  await writeAudit(
    'marketplace.commission.confirm',
    { paymentId: id, orderId: pay.orderId, amount: pay.amount, paidBy: pay.paidByUid },
    'warn'
  );
  return { ok: true, data: { ok: true } };
}

/** Platform revenue dashboard: totals + recent entries. */
async function platformRevenueStats(): Promise<NativeResult> {
  requireOwner();
  const snap = await getDocs(query(collection(db, 'platformRevenue'), limit(500)));
  const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any), createdAt: tsToIso((d.data() as any).createdAt) }));
  const byCurrency: Record<string, number> = {};
  for (const e of entries) {
    const c = String(e.currency || 'BDT');
    byCurrency[c] = (byCurrency[c] || 0) + Number(e.amount || 0);
  }
  entries.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { ok: true, data: { ok: true, totals: byCurrency, count: entries.length, recent: entries.slice(0, 50) } };
}

export const firestoreAdmin = {
  isOwnerUid,
  overview,
  health,
  lookupUser,
  disableUser,
  enableUser,
  listWorkspaces,
  setPlan,
  setLimitsBypass,
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
  // Console 3.0
  insights,
  planPrices,
  explorerCollections,
  explorerListDocs,
  explorerGetDoc,
  explorerSetField,
  explorerDeleteField,
  commissionRules,
  commissionRuleSave,
  getCommissionConfig,
  saveCommissionConfig,
  getIntelConfig,
  saveIntelConfig,
  geoConfigSave,
  getProviderTier,
  marketplaceTransactions,
  transactionSetStatus,
  payoutQueue,
  payoutDecide,
  payoutMarkPaid,
  providerEarnings,
  announcements,
  announcementSave,
  announcementDelete,
  templateSave,
  templateDelete,
  siteContent,
  siteContentSave,
  featureFlags,
  featureFlagSet,
  plansList,
  planSave,
  platformConfigGet,
  platformConfigSet,
  supportLeads,
  supportLeadSetStatus,
  supportLeadReply,
  // Geo-based payment methods + plan seeding
  paymentMethodsList,
  paymentMethodSave,
  seedPaymentMethods,
  seedPlans,
  // Marketplace (Fiverr-like gigs)
  marketplaceDashboard,
  marketplaceGigs,
  gigModerate,
  marketplaceOrders,
  orderForceStatus,
  marketplaceDisputes,
  disputeResolve,
  commissionOverrides,
  commissionOverrideSave,
  commissionOverrideDelete,
  providerDetail,
  marketplaceProviders,
  // Payment method intelligence
  paymentMethodStats,
  paymentHistory,
  exportPaymentCSV,
  // Provider payments + anti-bypass
  providerPaymentQueue,
  providerPaymentReview,
  providerInquiriesList,
  providerInquiryReply,
  bypassFlagsList,
  bypassFlagResolve,
  issueStrike,
  providerStrikesList,
  bypassKeywordsList,
  bypassKeywordSave,
  bypassKeywordDelete,
  // Rail-2 payment tracking stack
  duesCreateForOrder,
  duesList,
  dueSettle,
  dueWaive,
  duesSettingsGet,
  duesSettingsSave,
  checkDuesSuspension,
  unsuspendProvider,
  requestSmsProof,
  verifySms,
  riskDashboard,
  auditPickRequestSms,
  // Wallet + escrow top-up
  topupQueue,
  topupApprove,
  topupReject,
  walletLookup,
  walletAdjust,
  commissionPaymentsQueue,
  commissionPaymentConfirm,
  platformRevenueStats,
};

export default firestoreAdmin;
