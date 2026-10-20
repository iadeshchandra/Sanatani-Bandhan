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
import { withFallback, type ApiResult } from './apiFallback';

/** Re-exported so existing importers of withFallback/ApiResult keep working. */
export { withFallback, type ApiResult } from './apiFallback';

export const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

export const BACKEND_DEPLOYED_HINT =
  'Backend not deployed. Run: firebase deploy --only functions — then set VITE_BACKEND_URL to the deployed URL.';

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
  disableUser: (uid: string, reason?: string) =>
    withFallback(() => post(`/api/admin/users/${uid}/disable`), () => firestoreAdmin.suspendUser(uid, reason || 'Suspended by platform owner.')),
  enableUser: (uid: string) =>
    withFallback(() => post(`/api/admin/users/${uid}/enable`), () => firestoreAdmin.unsuspendUser(uid)),

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
  setLimitsBypass: (workspaceId: string, bypassed: boolean) =>
    withFallback(
      () => post(`/api/admin/workspaces/${workspaceId}/limits-bypass`, { bypassed }),
      () => firestoreAdmin.setLimitsBypass(workspaceId, bypassed)
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
    withFallback(() => post(`/api/moderation/users/${uid}/unsuspend`), () => firestoreAdmin.unsuspendUser(uid)),

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

  // Payment method intelligence (Spark-native only)
  paymentMethodStats: (period: '7d' | '30d' | '90d' | 'all' = '30d') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.paymentMethodStats(period)
    ),
  // QR Intelligence (Phase 1: aggregate scan analytics, Spark-native only)
  qrIntelDashboard: (period: '7d' | '30d' | 'all' = '30d') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.qrIntelDashboard(period)
    ),
  paymentHistory: (filters: { methodId?: string; status?: string; limit?: number } = {}) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.paymentHistory(filters)
    ),
  exportPaymentCSV: (period: '7d' | '30d' | '90d' | 'all' = 'all') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.exportPaymentCSV(period)
    ),

  // Marketplace (Spark-native; HTTP backend later)
  marketplaceDashboard: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.marketplaceDashboard()
    ),
  marketplaceGigs: (filter: 'all' | 'active' | 'flagged' = 'all') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.marketplaceGigs(filter)
    ),
  gigModerate: (id: string, action: 'feature' | 'unfeature' | 'deactivate' | 'reactivate' | 'flag' | 'unflag') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.gigModerate(id, action)
    ),
  marketplaceOrders: (filters: { status?: string; providerId?: string; limit?: number } = {}) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.marketplaceOrders(filters)
    ),
  orderForceStatus: (id: string, status: 'completed' | 'cancelled' | 'refunded', note?: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.orderForceStatus(id, status, note)
    ),
  marketplaceDisputes: (status = 'all') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.marketplaceDisputes(status)
    ),
  disputeResolve: (id: string, resolution: 'refund_client' | 'release_provider' | 'split', splitClient = 0, splitProvider = 0, note = '') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.disputeResolve(id, resolution, splitClient, splitProvider, note)
    ),
  commissionOverrides: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.commissionOverrides()
    ),
  commissionOverrideSave: (o: any) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.commissionOverrideSave(o)
    ),
  commissionOverrideDelete: (id: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.commissionOverrideDelete(id)
    ),
  commissionConfig: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      async () => {
        const cfg = await firestoreAdmin.getCommissionConfig();
        return { ok: true, data: cfg } as any;
      }
    ),
  commissionConfigSave: (cfg: { freeRate: number; proRail1Rate: number; proRail2Rate: number }) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.saveCommissionConfig(cfg)
    ),
  marketplaceProviders: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.marketplaceProviders()
    ),
  providerDetail: (providerId: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerDetail(providerId)
    ),

  // Provider payments + anti-bypass (Spark-native)
  providerPaymentQueue: (status: 'pending' | 'all' = 'pending') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerPaymentQueue(status)
    ),
  providerPaymentReview: (id: string, action: 'approved' | 'rejected' | 'platform_assigned', notes = '') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerPaymentReview(id, action, notes)
    ),
  providerInquiries: (status: 'open' | 'all' = 'open') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerInquiriesList(status)
    ),
  providerInquiryReply: (id: string, reply: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerInquiryReply(id, reply)
    ),
  bypassFlags: (status: 'pending' | 'all' = 'pending') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.bypassFlagsList(status)
    ),
  bypassFlagResolve: (id: string, action: 'dismiss' | 'warn' | 'suspend_gigs') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.bypassFlagResolve(id, action)
    ),
  issueStrike: (providerUid: string, type: 'bypass_attempt' | 'payment_fraud' | 'fake_completion' | 'other', orderId = '', notes = '') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.issueStrike(providerUid, type, orderId, notes)
    ),
  providerStrikes: (providerUid: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.providerStrikesList(providerUid)
    ),
  bypassKeywords: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.bypassKeywordsList()
    ),
  bypassKeywordSave: (input: { id?: string; pattern: string; label: string; severity?: 'low' | 'medium' | 'high'; active?: boolean }) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.bypassKeywordSave(input)
    ),
  bypassKeywordDelete: (id: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.bypassKeywordDelete(id)
    ),

  // Rail-2 payment tracking stack
  duesList: (status: string = 'all') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.duesList(status)
    ),
  dueSettle: (id: string, note?: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.dueSettle(id, note)
    ),
  dueWaive: (id: string, reason: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.dueWaive(id, reason)
    ),
  duesSettingsGet: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.duesSettingsGet()
    ),
  duesSettingsSave: (threshold: number, graceDays: number) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.duesSettingsSave(threshold, graceDays)
    ),
  checkDuesSuspension: (providerUid: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.checkDuesSuspension(providerUid)
    ),
  unsuspendProvider: (providerUid: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.unsuspendProvider(providerUid)
    ),
  requestSmsProof: (orderId: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.requestSmsProof(orderId)
    ),
  verifySms: (orderId: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.verifySms(orderId)
    ),
  riskDashboard: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.riskDashboard()
    ),
  auditPickRequestSms: (orderIds: string[]) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.auditPickRequestSms(orderIds)
    ),

  // Wallet + escrow top-up
  topupQueue: (status = 'pending') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.topupQueue(status)
    ),
  topupApprove: (id: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.topupApprove(id)
    ),
  topupReject: (id: string, reason: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.topupReject(id, reason)
    ),
  walletLookup: (uid: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.walletLookup(uid)
    ),
  walletAdjust: (uid: string, amount: number, reason: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.walletAdjust(uid, amount, reason)
    ),
  commissionPaymentsQueue: (status = 'pending') =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.commissionPaymentsQueue(status)
    ),
  commissionPaymentConfirm: (id: string) =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.commissionPaymentConfirm(id)
    ),
  platformRevenueStats: () =>
    withFallback(
      () => Promise.resolve({ ok: false, code: 'backendDown' } as any),
      () => firestoreAdmin.platformRevenueStats()
    ),

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
