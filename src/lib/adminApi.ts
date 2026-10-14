/**
 * adminApi.ts — centralized backend API client for the GodMode Console 2.0.
 *
 * All backend calls go through here. Auth uses the Firebase ID token of the
 * signed-in owner (Bearer header), which the backend's requireOwner middleware
 * verifies server-side.
 *
 * BACKEND DEPLOYMENT NOTE:
 * The Cloud Functions backend must be deployed for these endpoints to work:
 *   firebase deploy --only functions
 * Set VITE_BACKEND_URL in your environment (e.g. .env file or CI secrets) to
 * the deployed functions base URL, e.g.:
 *   VITE_BACKEND_URL=https://asia-south1-shda-6245c.cloudfunctions.net/api
 * If unset, the client falls back to http://localhost:5000 (local emulator).
 * Every call degrades gracefully: unreachable backend → { ok:false, backendDown:true }
 */
import { auth } from '../firebase';
import { firestoreAdmin } from './firestoreAdmin';

/**
 * Fallback strategy: the HTTP backend is tried FIRST. Only when the fetch
 * fails with backendDown (functions not deployed / unreachable) do we fall
 * back to the Spark-native Firestore implementation. This makes migration
 * automatic: deploy functions + set VITE_BACKEND_URL and the HTTP path wins.
 */
async function withFallback<T>(
  httpCall: () => Promise<ApiResult<T>>,
  nativeCall: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const r = await httpCall();
  if (r.backendDown) {
    try {
      return await nativeCall();
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Spark-native operation failed.', code: 'NATIVE_FAILED' };
    }
  }
  return r;
}

export const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export const BACKEND_DEPLOYED_HINT =
  'Backend not deployed. Run: firebase deploy --only functions — then set VITE_BACKEND_URL to the deployed URL.';

export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  backendDown?: boolean;
  /** Set when the op genuinely needs the Express backend (Admin SDK). */
  requiresBackend?: boolean;
}

async function authedFetch<T = any>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { ok: false, error: 'Not signed in', code: 'NO_SESSION' };
    }
    const token = await user.getIdToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      return {
        ok: false,
        error: body?.message || body?.error || `Request failed (${res.status})`,
        code: body?.code || `HTTP_${res.status}`,
      };
    }
    return { ok: true, data: body };
  } catch (e: any) {
    // Network failure almost always means the functions aren't deployed.
    return { ok: false, error: BACKEND_DEPLOYED_HINT, code: 'BACKEND_DOWN', backendDown: true };
  }
}

const get = <T = any>(path: string) => authedFetch<T>(path, { method: 'GET' });
const post = <T = any>(path: string, body?: any) =>
  authedFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

/* ------------------------------- Types ---------------------------------- */

export interface PlatformOverview {
  workspaces: number;
  users: number;
  tenants: number;
  recentWorkspaces: Array<{ id: string; name?: string; type?: string; planId?: string; createdAt?: any }>;
  generatedAt: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version?: string;
  region?: string;
  uptimeSeconds?: number;
  timestamp?: string;
  checks?: Record<string, string | number>;
  /** 'spark-native' when served by firestoreAdmin instead of Cloud Functions. */
  mode?: string;
  /** False when the HTTP backend is unreachable (Spark-native mode active). */
  functionsDeployed?: boolean;
}

export interface UserRecord {
  uid: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  creationTime?: string;
  lastSignInTime?: string;
}

export interface WorkspaceRecord {
  id: string;
  name?: string;
  type?: string;
  planId?: string;
  city?: string;
  createdAt?: any;
}

export interface VerificationApplication {
  id: string;
  kind: 'purohit' | 'jyotish';
  profileId?: string;
  applicantUid?: string;
  displayName?: string;
  requestedTier?: string;
  currentTier?: string;
  status: 'pending' | 'approved' | 'rejected';
  documents?: string[];
  notes?: string;
  rejectionReason?: string;
  createdAt?: any;
}

export interface ModerationReport {
  id: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  details?: string;
  reporterUid?: string;
  status?: 'open' | 'actioned' | 'dismissed';
  createdAt?: any;
}

export interface PaymentClaim {
  id: string;
  workspaceId?: string;
  workspaceName?: string;
  plan?: string;
  period?: 'monthly' | 'yearly';
  method?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  createdAt?: any;
}

export interface AuditEntry {
  id: string;
  action?: string;
  actorUid?: string;
  actorEmail?: string;
  workspaceId?: string;
  severity?: string;
  details?: any;
  createdAt?: any;
}

export interface MessageTemplate {
  id: string;
  name?: string;
  title?: { en?: string; bn?: string; hi?: string };
  body?: { en?: string; bn?: string; hi?: string };
}

/* ------------------------------- API ------------------------------------ */

export const adminApi = {
  // Health: HTTP first (marks functionsDeployed:true), else Spark-native.
  async health(): Promise<ApiResult<HealthStatus>> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      const body = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: body?.message || 'Health check failed', backendDown: res.status === 503 };
      return { ok: true, data: { ...body, functionsDeployed: true } };
    } catch {
      try {
        return await firestoreAdmin.health();
      } catch (e: any) {
        return { ok: false, error: BACKEND_DEPLOYED_HINT, code: 'BACKEND_DOWN', backendDown: true };
      }
    }
  },

  // Overview
  overview: () =>
    withFallback(
      () => get<{ success: boolean; overview: PlatformOverview }>('/api/admin/overview'),
      () => firestoreAdmin.overview()
    ),

  // Users
  lookupUser: (email: string) =>
    withFallback(
      () => get<{ success: boolean; user: UserRecord }>(`/api/admin/users/lookup?email=${encodeURIComponent(email)}`),
      () => firestoreAdmin.lookupUser(email)
    ),
  disableUser: (uid: string) =>
    withFallback(() => post(`/api/admin/users/${uid}/disable`), () => firestoreAdmin.disableUser()),
  enableUser: (uid: string) =>
    withFallback(() => post(`/api/admin/users/${uid}/enable`), () => firestoreAdmin.enableUser()),

  // Workspaces
  listWorkspaces: (limit = 50, cursor?: string) =>
    withFallback(
      () =>
        get<{ success: boolean; workspaces: WorkspaceRecord[]; nextCursor?: string }>(
          `/api/admin/workspaces?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
        ),
      () => firestoreAdmin.listWorkspaces(limit)
    ),
  setPlan: (workspaceId: string, planId: string) =>
    withFallback(
      () => post(`/api/admin/workspaces/${workspaceId}/plan`, { planId }),
      () => firestoreAdmin.setPlan(workspaceId, planId)
    ),

  // Verification (unified — replaces the old purohitApplications client writes)
  verificationPending: (kind?: 'purohit' | 'jyotish') =>
    withFallback(
      () =>
        get<{ ok: boolean; applications: VerificationApplication[] }>(
          `/api/verification/pending${kind ? `?kind=${kind}` : ''}`
        ),
      () => firestoreAdmin.verificationPending(kind)
    ),
  verificationApprove: (id: string, tier?: string) =>
    withFallback(
      () => post(`/api/verification/${id}/approve`, tier ? { tier } : {}),
      () => firestoreAdmin.verificationApprove(id, tier)
    ),
  verificationReject: (id: string, reason: string) =>
    withFallback(
      () => post(`/api/verification/${id}/reject`, { reason }),
      () => firestoreAdmin.verificationReject(id, reason)
    ),

  // Moderation
  moderationReports: (status = 'open') =>
    withFallback(
      () => get<{ ok: boolean; reports: ModerationReport[] }>(`/api/moderation/reports?status=${status}`),
      () => firestoreAdmin.moderationReports(status)
    ),
  moderationAction: (id: string, action: 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user', note?: string) =>
    withFallback(
      () => post(`/api/moderation/reports/${id}/action`, { action, note }),
      () => firestoreAdmin.moderationAction(id, action, note)
    ),
  moderationHide: (contentId: string) =>
    withFallback(() => post(`/api/moderation/content/${contentId}/hide`), async () => ({
      ok: false, code: 'REQUIRES_BACKEND', error: 'Content hide via collection scan needs the backend.', requiresBackend: true,
    })),
  moderationUnsuspend: (uid: string) =>
    withFallback(() => post(`/api/moderation/users/${uid}/unsuspend`), async () => ({
      ok: false, code: 'REQUIRES_BACKEND', error: 'Unsuspend needs the Firebase Auth Admin API.', requiresBackend: true,
    })),

  // Billing
  paymentClaims: (status = 'pending') =>
    withFallback(
      () => get<{ ok: boolean; claims: PaymentClaim[] }>(`/api/billing/payment-claims?status=${status}`),
      () => firestoreAdmin.paymentClaims(status)
    ),
  claimApprove: (id: string) =>
    withFallback(() => post(`/api/billing/payment-claims/${id}/approve`), () => firestoreAdmin.claimApprove(id)),
  claimReject: (id: string, reason: string) =>
    withFallback(() => post(`/api/billing/payment-claims/${id}/reject`, { reason }), () => firestoreAdmin.claimReject(id, reason)),
  subscription: (workspaceId: string) =>
    withFallback(() => get(`/api/billing/subscription/${workspaceId}`), () => firestoreAdmin.subscription(workspaceId)),

  // Messaging
  sendMessage: (payload: {
    title: string;
    body: string;
    type: 'announcement' | 'reminder' | 'greeting' | 'urgent';
    audience: { kind: 'single' | 'workspace' | 'role' | 'all'; uid?: string; workspaceId?: string; role?: string };
  }) => withFallback(() => post('/api/messaging/send', payload), () => firestoreAdmin.sendMessage(payload)),
  scheduleMessage: (payload: { title: string; body: string; type: string; audience: any; sendAt: string }) =>
    withFallback(() => post('/api/messaging/schedule', payload), () => firestoreAdmin.scheduleMessage(payload)),
  messageTemplates: () =>
    withFallback(
      () => get<{ ok: boolean; templates: MessageTemplate[] }>('/api/messaging/templates'),
      () => firestoreAdmin.messageTemplates()
    ),

  // Audit
  auditLogs: (filters: { action?: string; actorUid?: string; workspaceId?: string; severity?: string; limit?: number; cursor?: string } = {}) => {
    const q = new URLSearchParams();
    if (filters.action) q.set('action', filters.action);
    if (filters.actorUid) q.set('actorUid', filters.actorUid);
    if (filters.workspaceId) q.set('workspaceId', filters.workspaceId);
    if (filters.severity) q.set('severity', filters.severity);
    if (filters.limit) q.set('limit', String(filters.limit));
    if (filters.cursor) q.set('cursor', filters.cursor);
    return withFallback(
      () => get<{ success: boolean; entries: AuditEntry[]; nextCursor?: string }>(`/api/admin/audit-logs?${q.toString()}`),
      () => firestoreAdmin.auditLogs({ action: filters.action, severity: filters.severity, limit: filters.limit })
    );
  },
};

export default adminApi;
