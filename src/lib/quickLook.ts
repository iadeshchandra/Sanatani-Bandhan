/**
 * quickLook.ts — TWO-MODE M1: the pure shaping behind the Personal
 * mode "My Organisations" strip and its Quick Look peek.
 * =====================================================================
 * The owner's model (approved 2026-11-23): exactly two modes —
 * Personal (everyone) and Organisation (only with an enrolment).
 * From Personal, a member may QUICK-LOOK at an organisation without
 * switching modes, scoped by the same RBAC as the console itself.
 *
 * This module is the strip's one shaping judgement, and it invents
 * nothing: every org card is a workspace for which the SHARED
 * console-door verdict (lib/orgConsoleAccess.resolveOrgConsoleAccess)
 * opens — judged per workspace, from that workspace's own evidence
 * (its workspaceMembers edge, its recorded creator, or platform
 * SuperAdmin clearance). A Devotee-floor membership does NOT surface
 * a card: the member shell itself serves devotees, and the strip is
 * the door to the Organisation mode family. Memberships whose
 * workspace config is not in the local registry are dropped (the
 * ProfileOrgHub parity rule: a card without the org's real name is
 * useless; the config joins the registry when the org is opened or
 * joined from this device).
 *
 * The peek's festival line reuses the PUBLIC discovery shaping
 * (lib/eventDiscovery.festivalCard): published, not cancelled, not
 * over — the same facts the read-free /events page shows everyone.
 * No figure is computed here; the peek carries identity, role and
 * the next festival, and says plainly that full figures live in the
 * workspace.
 */

import { resolveOrgConsoleAccess } from './orgConsoleAccess';
import {
  effectiveStartISO,
  festivalCard,
  type DiscoveryCard,
} from './eventDiscovery';
import type { FestivalEventDoc, Lang3 } from './festival';
import type { UserRole } from '../types';

/** The registry facts a card needs (a structural WorkspaceConfig slice). */
export interface QuickLookWorkspaceInfo {
  id: string;
  name: string;
  type?: string;
  logoUrl?: string;
  createdBy?: string | null;
}

/** A membership edge plus the workspace it belongs to. */
export interface QuickLookMembership {
  workspaceId: string;
  uid: string;
  role: string;
  deskScope?: string[] | null;
  roleExpiresAt?: number | null;
}

export interface OrgEnrolmentCard {
  kind: 'org';
  workspaceId: string;
  name: string;
  type?: string;
  logoUrl?: string;
  /** The per-org role the console-door verdict rests on. */
  role: UserRole;
  isActive: boolean;
}

export interface ProfessionalEnrolmentCard {
  kind: 'purohit' | 'jyotish';
  /** The minted professional identity id (PUR-XXXXXX / JYO-XXXXXX). */
  identityId: string;
  displayName?: string;
}

export type QuickLookCard = OrgEnrolmentCard | ProfessionalEnrolmentCard;

export interface ShapeOrgEnrolmentsInput {
  workspaces: readonly QuickLookWorkspaceInfo[];
  memberships: readonly QuickLookMembership[];
  /** True once the first workspaceMembers fetch has settled. */
  membershipsLoaded: boolean;
  uid: string | null;
  /** The account's global/stored role (AuthWorkspaceContext currentRole). */
  globalRole?: string | null;
  activeWorkspaceId?: string | null;
  /** Clock override for tests. */
  now?: number;
}

/**
 * One card per workspace whose console door opens for this user.
 * Active workspace first, then by name — the strip reads as "where
 * you already are, then everywhere else you serve".
 */
export function shapeOrgEnrolments(
  input: ShapeOrgEnrolmentsInput,
): OrgEnrolmentCard[] {
  const {
    workspaces,
    memberships,
    membershipsLoaded,
    uid,
    globalRole,
    activeWorkspaceId,
    now,
  } = input;

  const edgeByWorkspace = new Map<string, QuickLookMembership>();
  for (const m of memberships) {
    if (!edgeByWorkspace.has(m.workspaceId)) edgeByWorkspace.set(m.workspaceId, m);
  }

  const cards: OrgEnrolmentCard[] = [];
  for (const ws of workspaces) {
    // Demo sandboxes are previews, not enrolments — they keep their
    // own doors (the demo banner / preview switches) and never
    // surface here as organisations the user serves in.
    if (ws.id.startsWith('DEMO_')) continue;
    const edge = edgeByWorkspace.get(ws.id) ?? null;
    const verdict = resolveOrgConsoleAccess({
      workspaceId: ws.id,
      membership: edge,
      membershipsLoaded,
      globalRole,
      isCreator: !!uid && !!ws.createdBy && ws.createdBy === uid,
      creatorUid: ws.createdBy ?? null,
      now,
    });
    if (!verdict.canOpenConsole || !verdict.role) continue;
    cards.push({
      kind: 'org',
      workspaceId: ws.id,
      name: ws.name || 'Organisation',
      type: ws.type,
      logoUrl: ws.logoUrl,
      role: verdict.role,
      isActive: !!activeWorkspaceId && ws.id === activeWorkspaceId,
    });
  }

  cards.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return cards;
}

/**
 * The strip's full card list: org enrolments first (the strip's
 * namesake), then the professional workspaces (Purohit, Jyotishi) —
 * the same order the owner's model names them.
 */
export function buildQuickLookCards(
  orgCards: readonly OrgEnrolmentCard[],
  professional: readonly ProfessionalEnrolmentCard[],
): QuickLookCard[] {
  return [...orgCards, ...professional];
}

/**
 * The peek's next-festival line: the earliest upcoming published
 * festival for the workspace, shaped by the public discovery rules
 * (published only, trustee-cancelled excluded, already-over excluded;
 * an ongoing festival counts from today). Null when none qualifies —
 * the peek then says so honestly instead of inventing a date.
 */
export function pickNextFestival(
  docs: readonly FestivalEventDoc[],
  todayISO: string,
  pickTitle: (name: Lang3) => string,
): DiscoveryCard | null {
  const cards = docs
    .map((d) => festivalCard(d, todayISO, pickTitle))
    .filter((c): c is DiscoveryCard => c !== null);
  cards.sort(
    (a, b) =>
      effectiveStartISO(a, todayISO).localeCompare(effectiveStartISO(b, todayISO)) ||
      a.title.localeCompare(b.title),
  );
  return cards[0] ?? null;
}
