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
  await updateDoc(ref, {
    status: approve ? 'approved' : 'rejected',
    processedBy: uid,
    processedAt: serverTimestamp(),
    note: (note || '').slice(0, 500),
  });
  await writeAudit('commission.payout.decide', { payoutId: id, approved: approve, amount: p.amount }, 'warn');
  return { ok: true, data: { ok: true } };
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
};

export default firestoreAdmin;
