/**
 * orgGlance.ts — Per-organisation glance summaries ("what needs me")
 * ====================================================================
 * Pure logic — no UI, no Firestore calls. Callers assemble data and
 * write the resulting OrgGlanceSummary to `orgGlance/{workspaceId}`.
 *
 * DESIGN
 * ------
 * The glance feed must NEVER run full collection queries on every open.
 * Instead each org keeps ONE lightweight summary doc, refreshed when the
 * org's own dashboard loads its data (debounced). The Solo "Suchana" tab
 * reads only these summaries + the member's own memberships.
 *
 * RBAC
 * ----
 * The summary carries TWO sections: `steward` (approvals, money, ops)
 * and `member` (events, announcements). `glanceForRole()` is the single
 * enforcement point — it returns ONLY the section the caller's role may
 * see. Writers can only summarize what they themselves can read, and
 * readers re-filter by their own role, so a poisoned doc can at worst
 * show wrong counts — never leaked data.
 *
 * Roles are normalized case-insensitively. Steward = SuperAdmin,
 * Trustee, Accountant. Everyone else (Priest, Sevadar, Devotee,
 * Member…) is a member for glance purposes.
 */

import type { ModuleSnapshot } from './appIntelligence';
import { generateAllInsights, type Insight } from './appIntelligence';

/** Roles with steward-level (money/ops) visibility in the glance. */
const STEWARD_ROLES = new Set(['superadmin', 'trustee', 'accountant']);

/** Normalize any role string for comparison. */
export function normalizeRole(role: string | undefined | null): string {
  return String(role || '').trim().toLowerCase();
}

/** True when the role sees the steward (approvals/money/ops) section. */
export function isStewardRole(role: string | undefined | null): boolean {
  return STEWARD_ROLES.has(normalizeRole(role));
}

/** Steward-only insight modules (money, safety, ops decisions). */
const STEWARD_MODULES = new Set([
  'treasury',
  'donations',
  'topup',
  'dues',
  'bypass',
  'inventory',
  'hr',
  'audit',
]);

/** Member-visible insight modules (community life). */
const MEMBER_MODULES = new Set([
  'events',
  'festivals',
  'sangam',
  'samskara',
  'goshala',
  'devotees',
]);

export interface GlanceSection {
  /** Count of items needing a decision (approvals, overdue, unconfirmed). */
  actionCount: number;
  /** Count of informational items (upcoming events, announcements). */
  infoCount: number;
  /** Top 3 headline keys for preview cards (dedupeKeys of source insights). */
  headlines: string[];
  /** ISO date of the soonest dated item, if any. */
  soonestDate: string | null;
}

export interface OrgGlanceSummary {
  workspaceId: string;
  orgName: string;
  orgType: string;
  updatedAt: number;
  /** Written by a steward — null when the writer wasn't one. */
  steward: GlanceSection | null;
  /** Always present (every member can see community life). */
  member: GlanceSection;
}

function emptySection(): GlanceSection {
  return { actionCount: 0, infoCount: 0, headlines: [], soonestDate: null };
}

/**
 * Build a summary from a module snapshot. Pure — the caller supplies
 * whatever data the org dashboard already loaded. Insights are split by
 * module into steward/member sections; severity 'urgent'/'attention'
 * counts as action, 'nudge'/'info' as info.
 */
export function buildOrgGlanceSummary(
  workspaceId: string,
  orgName: string,
  orgType: string,
  snapshot: ModuleSnapshot,
  writerRole: string
): OrgGlanceSummary {
  const out: OrgGlanceSummary = {
    workspaceId,
    orgName,
    orgType,
    updatedAt: Date.now(),
    steward: null,
    member: emptySection(),
  };
  try {
    const writerIsSteward = isStewardRole(writerRole);
    // Steward section: run the engine as a steward role and keep only
    // steward-module insights. Member section: run as devotee.
    if (writerIsSteward) {
      const stewardInsights = generateAllInsights('trustee', snapshot).filter((i) =>
        STEWARD_MODULES.has(String(i.module || '').toLowerCase())
      );
      out.steward = sectionFrom(stewardInsights);
    }
    const memberInsights = generateAllInsights('devotee', snapshot).filter((i) =>
      MEMBER_MODULES.has(String(i.module || '').toLowerCase())
    );
    out.member = sectionFrom(memberInsights);
  } catch {
    /* fail-open: empty sections */
  }
  return out;
}

function sectionFrom(insights: Insight[]): GlanceSection {
  const s = emptySection();
  try {
    for (const i of insights || []) {
      if (i.severity === 'urgent' || i.severity === 'attention') s.actionCount += 1;
      else s.infoCount += 1;
      if (s.headlines.length < 3 && i.dedupeKey) s.headlines.push(i.dedupeKey);
    }
  } catch {
    /* ignore */
  }
  return s;
}

/**
 * RBAC ENFORCEMENT POINT. Returns the section a role may see:
 * stewards get both sections, members get only `member`.
 * Unknown/empty roles → member section only (fail-closed).
 */
export function glanceForRole(
  summary: OrgGlanceSummary | null | undefined,
  role: string | undefined | null
): { steward: GlanceSection | null; member: GlanceSection } {
  const fallback = { steward: null, member: emptySection() };
  if (!summary) return fallback;
  try {
    if (isStewardRole(role)) {
      return {
        steward: summary.steward,
        member: summary.member || emptySection(),
      };
    }
    return { steward: null, member: summary.member || emptySection() };
  } catch {
    return fallback;
  }
}

/**
 * Serialize for Firestore. Strips everything but plain data —
 * never throws on odd input.
 */
export function toGlanceDoc(s: OrgGlanceSummary): Record<string, unknown> {
  return {
    workspaceId: s.workspaceId,
    orgName: s.orgName,
    orgType: s.orgType,
    updatedAt: s.updatedAt,
    steward: s.steward,
    member: s.member,
  };
}

/** Parse a Firestore doc back into a summary. Fail-open → null. */
export function fromGlanceDoc(
  data: Record<string, unknown> | null | undefined
): OrgGlanceSummary | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const d = data as any;
    if (!d.workspaceId) return null;
    return {
      workspaceId: String(d.workspaceId),
      orgName: String(d.orgName || ''),
      orgType: String(d.orgType || ''),
      updatedAt: Number(d.updatedAt || 0),
      steward: d.steward || null,
      member: d.member || emptySection(),
    };
  } catch {
    return null;
  }
}
