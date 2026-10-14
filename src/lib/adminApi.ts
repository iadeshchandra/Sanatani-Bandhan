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
  // Health (public — no auth needed, but we still try authed for consistency)
  async health(): Promise<ApiResult<HealthStatus>> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      const body = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: body?.message || 'Health check failed', backendDown: res.status === 503 };
      return { ok: true, data: body };
    } catch {
      return { ok: false, error: BACKEND_DEPLOYED_HINT, code: 'BACKEND_DOWN', backendDown: true };
    }
  },

  // Overview
  overview: () => get<{ success: boolean; overview: PlatformOverview }>('/api/admin/overview'),

  // Users
  lookupUser: (email: string) =>
    get<{ success: boolean; user: UserRecord }>(`/api/admin/users/lookup?email=${encodeURIComponent(email)}`),
  disableUser: (uid: string) => post(`/api/admin/users/${uid}/disable`),
  enableUser: (uid: string) => post(`/api/admin/users/${uid}/enable`),

  // Workspaces
  listWorkspaces: (limit = 50, cursor?: string) =>
    get<{ success: boolean; workspaces: WorkspaceRecord[]; nextCursor?: string }>(
      `/api/admin/workspaces?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
  setPlan: (workspaceId: string, planId: string) =>
    post(`/api/admin/workspaces/${workspaceId}/plan`, { planId }),

  // Verification (unified — replaces the old purohitApplications client writes)
  verificationPending: (kind?: 'purohit' | 'jyotish') =>
    get<{ ok: boolean; applications: VerificationApplication[] }>(
      `/api/verification/pending${kind ? `?kind=${kind}` : ''}`
    ),
  verificationApprove: (id: string, tier?: string) =>
    post(`/api/verification/${id}/approve`, tier ? { tier } : {}),
  verificationReject: (id: string, reason: string) =>
    post(`/api/verification/${id}/reject`, { reason }),

  // Moderation
  moderationReports: (status = 'open') =>
    get<{ ok: boolean; reports: ModerationReport[] }>(`/api/moderation/reports?status=${status}`),
  moderationAction: (id: string, action: 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user', note?: string) =>
    post(`/api/moderation/reports/${id}/action`, { action, note }),
  moderationHide: (contentId: string) => post(`/api/moderation/content/${contentId}/hide`),
  moderationUnsuspend: (uid: string) => post(`/api/moderation/users/${uid}/unsuspend`),

  // Billing
  paymentClaims: (status = 'pending') =>
    get<{ ok: boolean; claims: PaymentClaim[] }>(`/api/billing/payment-claims?status=${status}`),
  claimApprove: (id: string) => post(`/api/billing/payment-claims/${id}/approve`),
  claimReject: (id: string, reason: string) => post(`/api/billing/payment-claims/${id}/reject`, { reason }),
  subscription: (workspaceId: string) =>
    get(`/api/billing/subscription/${workspaceId}`),

  // Messaging
  sendMessage: (payload: {
    title: string;
    body: string;
    type: 'announcement' | 'reminder' | 'greeting' | 'urgent';
    audience: { kind: 'single' | 'workspace' | 'role' | 'all'; uid?: string; workspaceId?: string; role?: string };
  }) => post('/api/messaging/send', payload),
  scheduleMessage: (payload: { title: string; body: string; type: string; audience: any; sendAt: string }) =>
    post('/api/messaging/schedule', payload),
  messageTemplates: () => get<{ ok: boolean; templates: MessageTemplate[] }>('/api/messaging/templates'),

  // Audit
  auditLogs: (filters: { action?: string; actorUid?: string; workspaceId?: string; severity?: string; limit?: number; cursor?: string } = {}) => {
    const q = new URLSearchParams();
    if (filters.action) q.set('action', filters.action);
    if (filters.actorUid) q.set('actorUid', filters.actorUid);
    if (filters.workspaceId) q.set('workspaceId', filters.workspaceId);
    if (filters.severity) q.set('severity', filters.severity);
    if (filters.limit) q.set('limit', String(filters.limit));
    if (filters.cursor) q.set('cursor', filters.cursor);
    return get<{ success: boolean; entries: AuditEntry[]; nextCursor?: string }>(`/api/admin/audit-logs?${q.toString()}`);
  },
};

export default adminApi;
