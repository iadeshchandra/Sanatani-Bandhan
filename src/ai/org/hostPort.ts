/**
 * ai/org/hostPort.ts — Blueprint C: the host adapter.
 * =====================================================================
 * Builds the caller's CopilotDataPort from the app's live state.
 * DataContext's tenant-scoped datasets (treasury / devotees /
 * puja_bookings) already contain ONLY the active workspace's rows —
 * the app itself is single-workspace at a time — so the port sealed
 * over them can serve that workspace and no other. This function is
 * pure (plain data in, port out) so the sheet stays thin and the
 * whole seam is unit-testable.
 *
 * Read law for approvals (mirrors the firestore.rules read clause):
 * oversight roles (Trustee / SuperAdmin / Accountant / Auditor) see
 * the workspace's pending queue; anyone else sees only their own
 * filings.
 */

import { payoutApprovalThreshold } from '../../lib/approvals';
import {
  createMemoryPort,
  type CallerScope,
  type CopilotDataPort,
  type OrgApprovalRow,
  type OrgBookingRow,
  type OrgDevoteeRow,
  type OrgTxRow,
} from './port';

export interface HostTreasuryRow {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  devoteeName?: string;
  purpose?: string;
}

export interface HostDevoteeRow {
  id: string;
  fullName?: string;
  name?: string;
  gotra?: string;
}

export interface HostBookingRow {
  id: string;
  devoteeName: string;
  poojaName: string;
  bookingDate?: string;
  timeSlot: string;
  status: string;
}

export interface HostApprovalRow {
  id: string;
  kind: string;
  summary: string;
  amount?: number;
  requestedBy: string;
  requestedByName: string;
  requestedAt: number;
  status: string;
}

export interface HostPortInput {
  treasury: HostTreasuryRow[];
  devotees: HostDevoteeRow[];
  bookings: HostBookingRow[];
  approvals: HostApprovalRow[];
  /** False when the approvals fetch failed — the port reports
   *  "unavailable" rather than letting an executor claim "none". */
  approvalsAvailable: boolean;
  workspace: { makerCheckerPayoutThreshold?: number | null } | null;
  formatAmount: (n: number) => string;
  /** F2 windowing: treasury shows only the most recent page. */
  treasuryWindowed: boolean;
  /** True treasury row count when windowed (null = unknown). */
  treasuryTotal: number | null;
}

const OVERSIGHT_ROLES: readonly string[] = [
  'Trustee',
  'SuperAdmin',
  'Accountant',
  'Auditor',
];

export function buildOrgPort(scope: CallerScope, input: HostPortInput): CopilotDataPort {
  const treasury: OrgTxRow[] = input.treasury.map((r) => ({
    id: r.id,
    date: r.date,
    type: r.type,
    category: r.category,
    amount: r.amount,
    devoteeName: r.devoteeName,
    purpose: r.purpose,
  }));

  const devotees: OrgDevoteeRow[] = input.devotees
    .map((d) => ({
      id: d.id,
      name: (d.fullName || d.name || '').trim(),
      ...(d.gotra ? { hint: d.gotra } : {}),
    }))
    .filter((d) => d.name.length > 0);

  // Bookings without a concrete bookingDate cannot be placed on a
  // day honestly — they are excluded rather than guessed at.
  const bookings: OrgBookingRow[] = input.bookings
    .filter((b) => typeof b.bookingDate === 'string' && b.bookingDate.length >= 10)
    .map((b) => ({
      id: b.id,
      devoteeName: b.devoteeName,
      poojaName: b.poojaName,
      date: b.bookingDate as string,
      timeSlot: b.timeSlot,
      status: b.status,
    }));

  const seesQueue = OVERSIGHT_ROLES.includes(scope.workspaceRole);
  const approvals: OrgApprovalRow[] = input.approvals
    .filter((a) => a.status === 'PENDING')
    .filter((a) => seesQueue || a.requestedBy === scope.uid)
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      summary: a.summary,
      ...(a.amount != null ? { amount: a.amount } : {}),
      requestedByName: a.requestedByName,
      mine: a.requestedBy === scope.uid,
      requestedAt: a.requestedAt,
    }));

  // Windowing honesty: a windowed ledger whose loaded page is
  // smaller than the true total can understate any period sum —
  // the port says so, and executors label the answer partial.
  const treasuryComplete =
    !input.treasuryWindowed ||
    (input.treasuryTotal != null && input.treasury.length >= input.treasuryTotal);

  return createMemoryPort(scope, {
    treasury,
    devotees,
    bookings,
    approvals,
    approvalsAvailable: input.approvalsAvailable,
    threshold: payoutApprovalThreshold(input.workspace),
    formatAmount: input.formatAmount,
    treasuryComplete,
  });
}
