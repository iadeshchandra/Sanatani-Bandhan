/**
 * ai/org/port.ts — Blueprint C: caller scope + the scoped data port.
 * =====================================================================
 * Research §3a.1: "Caller-scoped retrieval — security trimming BEFORE
 * the model sees anything. Copilot inherits the caller, never a
 * service god-account."
 *
 * The port is the ONLY data surface the org copilot's executors may
 * touch, and it is built ONCE by the host for exactly one
 * (workspace, caller) pair:
 *
 *  · Its methods take NO workspaceId — the workspace is baked in at
 *    construction. A foreign workspace is unrepresentable in this
 *    API, so a cross-workspace read is impossible BY CONSTRUCTION,
 *    not by a filter someone could forget. Text from the user (or
 *    from a poisoned record) can never widen it: there is no
 *    parameter to widen.
 *  · Desk scope (Blueprint B membershipAccess) is applied inside the
 *    port: a data domain the caller's desk scope excludes reads as
 *    "not visible" and its queries return nothing.
 *  · Field-level masking: devotee rows expose id + name (+ an
 *    optional non-sensitive hint like gotra). Phone numbers, PAN and
 *    bank fields are NOT part of the row types at all — the copilot
 *    can never print what it cannot hold.
 */

import type { Role } from '../types';
import { isDeskInScope } from '../../lib/membershipAccess';

/** Data domains the org copilot can read, mapped to the canonical
 *  MODULE_CATALOG desk ids Blueprint B scopes by. Approvals are
 *  finance governance, so they travel with the treasury desk. */
export type CopilotDomain = 'treasury' | 'bookings' | 'approvals' | 'notices';

export const DOMAIN_MODULE: Record<CopilotDomain, string> = {
  treasury: 'treasury',
  bookings: 'poojaBooking',
  approvals: 'treasury',
  notices: 'sandeshBroadcast',
};

/** Who is asking — resolved by the host from the REAL session
 *  (membership edge → membershipAccess effective role/scope). The
 *  role NEVER comes from user text. */
export interface CallerScope {
  /** Firebase uid of the caller. */
  uid: string;
  /** The one workspace this session is scoped to. */
  workspaceId: string;
  workspaceName: string;
  /** AI-vocabulary effective role (expiry/scope already applied). */
  role: Role;
  /** Canonical workspace role ('Trustee', 'Accountant', …) — the
   *  vocabulary lib/approvals and the audit stream speak. */
  workspaceRole: string;
  /** Blueprint B role-template id ('org-manager', …) or null. */
  templateId: string | null;
  /** Blueprint B desk scope (catalog ids); null = unscoped. */
  deskScope: string[] | null;
  /** Display name for handledBy / createdByName stamps. */
  actorName: string;
}

/* ------------------------------------------------------------------ */
/* Row shapes — deliberately narrow (see masking note above).          */
/* ------------------------------------------------------------------ */

export interface OrgTxRow {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  devoteeName?: string;
  purpose?: string;
}

export interface OrgDevoteeRow {
  id: string;
  name: string;
  /** Non-sensitive distinguisher for ambiguity prompts (e.g. gotra). */
  hint?: string;
}

export interface OrgBookingRow {
  id: string;
  devoteeName: string;
  poojaName: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  timeSlot: string;
  status: string;
}

export interface OrgApprovalRow {
  id: string;
  kind: string;
  summary: string;
  amount?: number;
  requestedByName: string;
  /** True when the caller filed this request themselves. */
  mine: boolean;
  requestedAt: number;
}

/* ------------------------------------------------------------------ */
/* The port                                                            */
/* ------------------------------------------------------------------ */

export interface CopilotDataPort {
  readonly scope: CallerScope;
  /** May the caller see this data domain at all (desk scope)? */
  canSee(domain: CopilotDomain): boolean;
  /** Workspace-currency formatter (treasuryDisplay law, #51/#60). */
  formatAmount(n: number): string;
  /** Treasury rows in [fromISO, toISO] — this workspace only, and
   *  only when the treasury domain is visible (else []). */
  treasuryInRange(fromISO: string, toISO: string): OrgTxRow[];
  /**
   * Honesty flag for windowed ledgers (F2): false when the loaded
   * window might not cover the whole period starting at fromISO —
   * executors must then label the answer as partial, never present
   * a window sum as the whole truth.
   */
  treasuryPeriodComplete(fromISO: string): boolean;
  /** True when the pending-approvals read actually succeeded — a
   *  failed read must render as "unavailable", never as "none". */
  approvalsAvailable(): boolean;
  /** Pending approval requests the caller may see (the host applies
   *  the read law: oversight roles see the workspace's queue; anyone
   *  else sees only their own filings). */
  pendingApprovals(): OrgApprovalRow[];
  /** Devotees whose name matches (case-insensitive exact/prefix). */
  findDevoteesByName(name: string): OrgDevoteeRow[];
  /** Bookings on one ISO date. */
  bookingsOn(dateISO: string): OrgBookingRow[];
  /** Maker–checker payout threshold for this workspace (lib/approvals). */
  payoutThreshold(): number;
}

export interface MemoryPortData {
  treasury?: OrgTxRow[];
  devotees?: OrgDevoteeRow[];
  bookings?: OrgBookingRow[];
  approvals?: OrgApprovalRow[];
  approvalsAvailable?: boolean;
  threshold?: number;
  formatAmount?: (n: number) => string;
  /** Test/host override for the windowing honesty flag. */
  treasuryComplete?: boolean;
}

/**
 * In-memory port over plain rows — the test double AND the shape the
 * host adapter (hostPort.ts) builds over DataContext state. All
 * scoping law lives here, once: desk-scope filtering is applied to
 * every read, so an executor cannot leak a domain the port was told
 * to hide even if it forgets to ask canSee() first (defence in depth
 * — executors still check canSee() to render the right message).
 */
export function createMemoryPort(
  scope: CallerScope,
  data: MemoryPortData = {}
): CopilotDataPort {
  const treasury = data.treasury ?? [];
  const devotees = data.devotees ?? [];
  const bookings = data.bookings ?? [];
  const approvals = data.approvals ?? [];
  const canSee = (domain: CopilotDomain): boolean =>
    isDeskInScope(DOMAIN_MODULE[domain], scope.deskScope);
  return {
    scope,
    canSee,
    formatAmount: data.formatAmount ?? ((n: number) => `₹${n}`),
    treasuryInRange(fromISO, toISO) {
      if (!canSee('treasury')) return [];
      return treasury.filter((r) => r.date >= fromISO && r.date <= toISO);
    },
    treasuryPeriodComplete() {
      return data.treasuryComplete ?? true;
    },
    approvalsAvailable() {
      return data.approvalsAvailable ?? true;
    },
    pendingApprovals() {
      if (!canSee('approvals')) return [];
      return [...approvals].sort((a, b) => b.requestedAt - a.requestedAt);
    },
    findDevoteesByName(name) {
      const q = (name || '').trim().toLowerCase();
      if (!q) return [];
      return devotees
        .filter((d) => {
          const n = d.name.trim().toLowerCase();
          return n === q || n.startsWith(q) || q.startsWith(n);
        })
        .slice(0, 6);
    },
    bookingsOn(dateISO) {
      if (!canSee('bookings')) return [];
      return bookings.filter((b) => b.date === dateISO);
    },
    payoutThreshold() {
      return data.threshold ?? 10000;
    },
  };
}

/** The org context the host attaches to AssistantCtx / TaskCtx. */
export interface OrgAssistantContext {
  scope: CallerScope;
  port: CopilotDataPort;
}
