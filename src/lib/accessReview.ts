/**
 * accessReview.ts — Blueprint D, deliverable 2: the periodic access
 * review (pure logic, no React, no Firebase).
 * ============================================================================
 * Research §1f: "periodic access review — the owner periodically sees
 * a plain list: these people can see money — still correct?" Access
 * granted in a hurry (a festival volunteer made Accountant "for the
 * weekend") quietly becomes permanent unless someone looks. This
 * module builds that look from Blueprint B's membership edges and
 * Blueprint A's audit stream:
 *
 *  - WHO has access: every workspaceMembers edge, with its EFFECTIVE
 *    role (membershipAccess — an expired grant already reads as the
 *    Devotee floor), its role template, its desk scope, its expiry.
 *  - HIGHLIGHTS (the rows a trustee should look at first):
 *      · sensitive role with NO expiry — money/ritual/security roles
 *        (Blueprint B's GATED_GRANT_ROLES) held indefinitely;
 *      · dormant — no audit-stream activity in 90 days (or none ever,
 *        with a membership older than 90 days: access granted and
 *        never used is still access);
 *      · expiring within 30 days — so a needed renewal is a calm
 *        decision, not a festival-eve surprise;
 *      · already expired — listed so the trustee knows the grant has
 *        lapsed to the floor (nothing to fix, nothing hidden).
 *
 * The review is READ-ONLY by construction: this module computes a
 * view; the card's only actions are deep-links into the member
 * editor, where Blueprint B's own guards (creator protection,
 * last-trustee continuity, maker–checker on gated grants) decide
 * what may change.
 */

import {
  expiryState,
  membershipEffectiveRole,
  type ExpiryState,
  type MembershipAccessEdge,
} from './membershipAccess';
import { GATED_GRANT_ROLES, templateById } from './roleTemplates';
import { resolveEdgeRole } from './landingSurface';

/** The slice of a workspaceMembers edge the review reads. */
export interface AccessReviewMember extends MembershipAccessEdge {
  id: string;
  displayName?: string;
  email?: string;
  templateId?: string | null;
  joinedAt?: number;
}

export const DORMANT_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
export const EXPIRING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type AccessHighlight =
  | 'sensitive-no-expiry'
  | 'dormant'
  | 'expiring-soon'
  | 'expired';

export interface AccessReviewRow {
  member: AccessReviewMember;
  /** Effective role NOW (expiry already applied — B's law). */
  effectiveRole: string;
  /** Stored role as granted (may differ from effective post-expiry). */
  grantedRole: string;
  /** Template display name key, when a template shaped the grant. */
  templateNameKey: string | null;
  /** Desk scope (null = the role's full reach). */
  deskScope: string[] | null;
  expiry: ExpiryState;
  /** Days until expiry (negative when past); null when no expiry. */
  daysToExpiry: number | null;
  /** Last audit-stream activity (epoch ms); null when none seen. */
  lastActivityAt: number | null;
  highlights: AccessHighlight[];
}

export interface AccessReview {
  rows: AccessReviewRow[];
  /** Rows needing a trustee's eyes, in highlight order. */
  flagged: AccessReviewRow[];
  counts: {
    members: number;
    sensitiveNoExpiry: number;
    dormant: number;
    expiringSoon: number;
    expired: number;
  };
}

/** Is this (effective) role one of the sensitive, money/ritual/
 *  security roles whose grant Blueprint B routes through
 *  maker–checker? The same set, for the same reason. */
export function isSensitiveRole(role: string): boolean {
  return (GATED_GRANT_ROLES as readonly string[]).includes(
    resolveEdgeRole(role)
  );
}

export function buildAccessReview(
  members: readonly AccessReviewMember[],
  lastActivityByUid: ReadonlyMap<string, number>,
  now: number,
  creatorUid?: string
): AccessReview {
  const rows: AccessReviewRow[] = members.map((member) => {
    const guard = creatorUid ? { creatorUid } : {};
    const effectiveRole = membershipEffectiveRole(member, now, guard);
    const expiry = expiryState(member, now);
    const daysToExpiry =
      member.roleExpiresAt != null
        ? Math.ceil((member.roleExpiresAt - now) / (24 * 60 * 60 * 1000))
        : null;
    const lastActivityAt = lastActivityByUid.get(member.uid) ?? null;

    const highlights: AccessHighlight[] = [];
    // Sensitive + no expiry: the standing risk the review exists for.
    // (The workspace creator is exempt — their access is ownership,
    // not a grant, and B never lets it expire.)
    const isCreator = !!creatorUid && member.uid === creatorUid;
    if (
      !isCreator &&
      expiry === 'none' &&
      isSensitiveRole(effectiveRole)
    ) {
      highlights.push('sensitive-no-expiry');
    }
    // Dormant: no recorded activity inside the window. A member who
    // joined recently and simply hasn't acted yet is NOT dormant —
    // dormancy needs the membership itself to be old enough.
    const dormantSince =
      lastActivityAt ?? (typeof member.joinedAt === 'number' ? member.joinedAt : null);
    if (dormantSince != null && now - dormantSince >= DORMANT_AFTER_MS) {
      highlights.push('dormant');
    }
    if (
      expiry !== 'expired' &&
      member.roleExpiresAt != null &&
      member.roleExpiresAt - now <= EXPIRING_WINDOW_MS &&
      member.roleExpiresAt > now
    ) {
      highlights.push('expiring-soon');
    }
    if (expiry === 'expired') highlights.push('expired');

    const template = templateById(member.templateId);
    return {
      member,
      effectiveRole,
      grantedRole: member.role,
      templateNameKey: template ? template.nameKey : null,
      deskScope: member.deskScope ?? null,
      expiry,
      daysToExpiry,
      lastActivityAt,
      highlights,
    };
  });

  // Flagged first (sensitive-no-expiry, then dormant, then expiring,
  // then expired), alphabetical inside a tier; the full list follows
  // in the same order so the card reads as one calm document.
  const tier = (r: AccessReviewRow): number =>
    r.highlights.includes('sensitive-no-expiry')
      ? 0
      : r.highlights.includes('dormant')
        ? 1
        : r.highlights.includes('expiring-soon')
          ? 2
          : r.highlights.includes('expired')
            ? 3
            : 4;
  const nameOf = (r: AccessReviewRow) =>
    (r.member.displayName || r.member.email || r.member.uid || '').toLowerCase();
  rows.sort((a, b) => tier(a) - tier(b) || nameOf(a).localeCompare(nameOf(b)));

  const flagged = rows.filter((r) => r.highlights.length > 0);
  return {
    rows,
    flagged,
    counts: {
      members: rows.length,
      sensitiveNoExpiry: rows.filter((r) => r.highlights.includes('sensitive-no-expiry')).length,
      dormant: rows.filter((r) => r.highlights.includes('dormant')).length,
      expiringSoon: rows.filter((r) => r.highlights.includes('expiring-soon')).length,
      expired: rows.filter((r) => r.highlights.includes('expired')).length,
    },
  };
}

/** Latest audit activity per actor from a fetched event window. */
export function lastActivityByActor(
  events: readonly { actorUid: string; createdAt: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.actorUid) continue;
    const prev = map.get(e.actorUid);
    if (prev === undefined || e.createdAt > prev) map.set(e.actorUid, e.createdAt);
  }
  return map;
}

/* ----------------------- calm-cadence reminder ----------------------- */

/** The review reminder's rhythm: quarterly, and a dismissal (or a
 *  shown reminder) starts the clock — it can never nag weekly. */
export const ACCESS_REVIEW_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

export const accessReviewDismissKey = (workspaceId: string) =>
  `sb_access_review_clock_${workspaceId}`;

/** Epoch ms of the last dismissal/reminder for this workspace. */
export function accessReviewClockRead(
  workspaceId: string,
  storage: Pick<Storage, 'getItem'> | null = null
): number {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    const v = s?.getItem(accessReviewDismissKey(workspaceId));
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function accessReviewClockMark(
  workspaceId: string,
  now: number,
  storage: Pick<Storage, 'setItem'> | null = null
): void {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(accessReviewDismissKey(workspaceId), String(now));
  } catch {
    /* storage unavailable — the reminder may come again, calmly */
  }
}

/** Due when the clock has never run or a full quarter has passed. */
export function accessReviewDue(
  workspaceId: string,
  now: number,
  storage: Pick<Storage, 'getItem'> | null = null
): boolean {
  const last = accessReviewClockRead(workspaceId, storage);
  return last === 0 || now - last >= ACCESS_REVIEW_INTERVAL_MS;
}
