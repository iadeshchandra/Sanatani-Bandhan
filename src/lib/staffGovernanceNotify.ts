/**
 * staffGovernanceNotify.ts — NOTIFICATION WAVE 2: pure picking for
 * the governance + people events (DESIGN §2.3 / §2.4).
 * =====================================================================
 * The service half (staffGovernanceNotifyService) watches what the
 * reader's own role may already read; this half decides what is
 * news. No IO, no clock beyond the `now` it is handed.
 *
 * Sources, as the rules honestly expose them:
 *  - `resolutions` — readable by every tenant member; the board
 *    (resBoardRoles: Trustee / Manager / SuperAdmin) votes. A
 *    resolution awaiting MY vote is action news until I cast it —
 *    suppression is my own voters-map entry (L4).
 *  - `auction_lots` — readable by any staff of the workspace. The
 *    terminal states 'settled' / 'failed' are staff news (the
 *    winner's own news rides their ticket, not this).
 *  - `workspaceMembers` — readable by the member themselves (their
 *    own edge) and by the org's Trustee (the whole roster). So:
 *    role changes reach the affected member (own edge) and a
 *    trustee (roster); new joins reach a trustee. A Manager/CSO
 *    device CANNOT read other members' edges — that part of the
 *    design matrix is not reachable under the current read rules
 *    (see NOTES.md, gap G-W2-2).
 */
import {
  hasUserVoted,
  resolutionIsOpen,
  type ResolutionLike,
} from './resolutionLogic';

/* ------------------------------------------------------------------ */
/* Resolutions awaiting my vote                                        */
/* ------------------------------------------------------------------ */

export interface ResolutionDocLike extends ResolutionLike {
  id: string;
  workspaceId?: string;
  title?: string;
}

export interface ResolutionNotice {
  resolution: ResolutionDocLike;
  dedupeKey: string;
  /** The resolution's deadline — the item's premise expiry. */
  expiresAt?: number;
}

export function resolutionDedupeKey(resolutionId: string): string {
  return `resolution:${resolutionId}:pending`;
}

/**
 * A resolution is news for me while it stands open (proposed, not
 * concluded, not past its deadline) and my vote is not yet in its
 * voters map. The dedupe set makes it once-ever; the voters check
 * makes it self-suppressing the moment I vote (L4) — even across
 * devices, since the map is shared truth, not a device ledger.
 */
export function pickResolutionNotices(
  resolutions: readonly ResolutionDocLike[],
  myUid: string,
  notified: ReadonlySet<string>,
  now: number,
): ResolutionNotice[] {
  const out: ResolutionNotice[] = [];
  for (const r of resolutions) {
    if (!r || !r.id) continue;
    const key = resolutionDedupeKey(r.id);
    if (notified.has(key)) continue;
    if (!resolutionIsOpen(r, now)) continue;
    if (hasUserVoted(r, myUid)) continue;
    out.push({
      resolution: r,
      dedupeKey: key,
      ...(typeof r.expiresAt === 'number' && r.expiresAt > now ? { expiresAt: r.expiresAt } : {}),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Auction lot outcomes — state ledger                                 */
/* ------------------------------------------------------------------ */

export type LotOutcomeStatus = 'settled' | 'failed';

export interface LotLike {
  id: string;
  workspaceId?: string;
  title?: string;
  status?: string;
}

export interface LotOutcomeNotice {
  lot: LotLike;
  status: LotOutcomeStatus;
  dedupeKey: string;
}

export function lotDedupeKey(lotId: string, status: LotOutcomeStatus): string {
  return `lot:${lotId}:${status}`;
}

/** lotId → last settled status. */
export type LotLedger = Record<string, string>;

/**
 * A lot standing at a terminal outcome is news once: first seen
 * settled/failed rings (the record may have been written while the
 * app was closed), a transition into one rings, the same outcome
 * again is silence. Non-terminal states settle silently.
 */
export function pickLotOutcomes(
  lots: readonly LotLike[],
  ledger: Readonly<LotLedger>,
): { notices: LotOutcomeNotice[]; settled: LotLedger } {
  const notices: LotOutcomeNotice[] = [];
  const settled: LotLedger = {};
  for (const lot of lots) {
    if (!lot || !lot.id || typeof lot.status !== 'string') continue;
    settled[lot.id] = lot.status;
    if (lot.status !== 'settled' && lot.status !== 'failed') continue;
    if (ledger[lot.id] === lot.status) continue;
    notices.push({
      lot,
      status: lot.status,
      dedupeKey: lotDedupeKey(lot.id, lot.status),
    });
  }
  return { notices, settled };
}

/* ------------------------------------------------------------------ */
/* Membership edges — joins + role changes                             */
/* ------------------------------------------------------------------ */

export interface MemberEdgeLike {
  workspaceId: string;
  uid: string;
  role: string;
  displayName?: string;
}

/** The ledger key for one person's edge in one workspace. */
export function memberKey(workspaceId: string, uid: string): string {
  return `${workspaceId}:${uid}`;
}

/** Local day key (YYYY-MM-DD) — the member-joined grouping grain. */
export function dayKeyOf(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function memberJoinedDedupeKey(workspaceId: string, dayKey: string): string {
  return `member:${workspaceId}:${dayKey}`;
}

export interface MemberJoinedNotice {
  workspaceId: string;
  /** Every new member this check, in roster order. */
  members: MemberEdgeLike[];
  dedupeKey: string;
}

/**
 * New joins, grouped the way DESIGN §2.4 rules them: ONE card per
 * workspace per day (dedupe `member:<ws>:<date>`) — a busy org
 * produces one morning line, not a bell per arrival. The picker
 * returns the workspaces whose roster holds uids the device has
 * never settled; the SERVICE applies the baseline law (a roster
 * first seen is history, not news) and the once-per-day ledger.
 */
export function pickMemberJoined(
  edges: readonly MemberEdgeLike[],
  known: ReadonlySet<string>,
  myUid: string,
  now: number,
): MemberJoinedNotice[] {
  const byWorkspace = new Map<string, MemberEdgeLike[]>();
  for (const e of edges) {
    if (!e || !e.workspaceId || !e.uid) continue;
    if (e.uid === myUid) continue; // my own arrival is not news to me
    if (known.has(memberKey(e.workspaceId, e.uid))) continue;
    const list = byWorkspace.get(e.workspaceId) ?? [];
    list.push(e);
    byWorkspace.set(e.workspaceId, list);
  }
  const dayKey = dayKeyOf(now);
  return [...byWorkspace.entries()].map(([workspaceId, members]) => ({
    workspaceId,
    members,
    dedupeKey: memberJoinedDedupeKey(workspaceId, dayKey),
  }));
}

/** "Asha Verma" / "Asha Verma, Ravi Das" / "Asha Verma, Ravi Das +2 more". */
export function memberNamesSummary(members: readonly MemberEdgeLike[]): string {
  const names = members.map((m) => (m.displayName || '').trim()).filter(Boolean);
  if (names.length === 0) return members.length === 1 ? 'A new member' : `${members.length} new members`;
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
}

/* ------------------------------------------------------------------ */
/* Role changes — the same picker serves both audiences                */
/* ------------------------------------------------------------------ */

export interface RoleChangeNotice {
  workspaceId: string;
  uid: string;
  name: string;
  fromRole: string;
  toRole: string;
  dedupeKey: string;
}

export function roleChangeDedupeKey(workspaceId: string, uid: string, toRole: string): string {
  return `role:${workspaceId}:${uid}:${toRole}`;
}

/**
 * An edge whose role differs from the device's settled map is a
 * role change. The service feeds it MY OWN edges (→ the affected
 * member's action-tier bell) and, on a trustee's device, the whole
 * roster (→ the trustee's info-tier bell) — same picker, same
 * dedupe shape; different inboxes, so no collision. A first-seen
 * edge is a JOIN, not a change (no from-role exists) — the service
 * baselines the map before this ever runs.
 */
export function pickRoleChanges(
  edges: readonly MemberEdgeLike[],
  prevRoles: Readonly<Record<string, string>>,
): RoleChangeNotice[] {
  const out: RoleChangeNotice[] = [];
  for (const e of edges) {
    if (!e || !e.workspaceId || !e.uid || !e.role) continue;
    const key = memberKey(e.workspaceId, e.uid);
    const prev = prevRoles[key];
    if (prev === undefined || prev === e.role) continue;
    out.push({
      workspaceId: e.workspaceId,
      uid: e.uid,
      name: (e.displayName || '').trim(),
      fromRole: prev,
      toRole: e.role,
      dedupeKey: roleChangeDedupeKey(e.workspaceId, e.uid, e.role),
    });
  }
  return out;
}

/** The settled role map after a check (every edge's current role). */
export function settledRoleMap(edges: readonly MemberEdgeLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of edges) {
    if (!e || !e.workspaceId || !e.uid || !e.role) continue;
    out[memberKey(e.workspaceId, e.uid)] = e.role;
  }
  return out;
}
