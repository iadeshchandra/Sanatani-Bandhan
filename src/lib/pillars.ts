/**
 * lib/pillars.ts — the FOUR PILLARS of Personal (owner decision, 2026-11-24).
 * =====================================================================
 * The top level of the app is exactly two modes (Personal |
 * Organisation — TWO-MODE law). INSIDE Personal, the home's content
 * is organised under four labelled sections, in this fixed order:
 *
 *   1. PERSONAL   — the member's own sadhana, pass and account.
 *   2. SOCIAL     — community life: feed, polls, messages, sangam.
 *   3. LOCATIONS  — organisations & places: my organisations,
 *                   followed temples, events from my orgs.
 *   4. MANAGEMENT — a doorway only: the Quick Look peek and the
 *                   Grow invitation. In Personal this pillar never
 *                   becomes the console itself.
 *
 * The pillars are SECTION ORGANISATION, never navigation: no tabs,
 * no nav layer, no desk moves. This module is the single source for
 * the pillar order and the dictionary keys of their headers, plus
 * the element→pillar maps the homes are organised by (pinned by
 * src/lib/__tests__/pillars.test.ts — if you move an element on a
 * home, move its row here and let the test judge the grouping).
 */

export type PillarId = 'personal' | 'social' | 'locations' | 'management';

export interface PillarDef {
  id: PillarId;
  /** surfaces dictionary key of the section header label. */
  titleKey: string;
}

/** The four pillars, in their one canonical order. */
export const PILLARS: readonly PillarDef[] = [
  { id: 'personal', titleKey: 'surfaces.pillars.personal' },
  { id: 'social', titleKey: 'surfaces.pillars.social' },
  { id: 'locations', titleKey: 'surfaces.pillars.locations' },
  { id: 'management', titleKey: 'surfaces.pillars.management' },
];

export const pillarDef = (id: PillarId): PillarDef =>
  PILLARS.find((p) => p.id === id) as PillarDef;

/** Rank of a pillar in the canonical order (0-based). */
export const pillarRank = (id: PillarId): number =>
  PILLARS.findIndex((p) => p.id === id);

/**
 * SoloHome (the Solo shell's Personal Home) — every element on the
 * home, in render order, with the pillar it lives under. Elements
 * that belong to two pillars sit in the EARLIER one (noted in the
 * batch NOTES): Ajker Suchana is the member's own morning briefing
 * (Personal) though it speaks of community; the Suchana/Guides doors
 * are the member's own guidance (Personal).
 */
export const SOLO_HOME_PILLAR_MAP: readonly { element: string; pillar: PillarId }[] = [
  { element: 'PanchangHeader (greeting, tithi, SAN id)', pillar: 'personal' },
  { element: 'OfflineSevakStatus strip', pillar: 'personal' },
  { element: 'SoloUsualRow ("Your usual")', pillar: 'personal' },
  { element: 'Seva Wallet glance card', pillar: 'personal' },
  { element: 'VdaHomeNudge (spoken ID claim)', pillar: 'personal' },
  { element: 'AjkerSuchana (morning briefing)', pillar: 'personal' },
  { element: 'SuggestionCards (progressive discovery)', pillar: 'personal' },
  { element: 'All Suchana / Guides entry row', pillar: 'personal' },
  { element: 'My obligations (Personal Wallet door)', pillar: 'personal' },
  { element: 'Sadhana at a glance (stats)', pillar: 'personal' },
  { element: 'My giving & receipts door', pillar: 'personal' },
  { element: 'Upcoming reminders + Quick actions', pillar: 'personal' },
  { element: 'Messages entry (sangha chat)', pillar: 'social' },
  { element: 'OrgEventsShelf ("From your orgs")', pillar: 'locations' },
  { element: 'FollowedTemplesStrip ("From your temples")', pillar: 'locations' },
  { element: 'JoinUpgrade (Grow doorway)', pillar: 'management' },
];

/**
 * MemberAppShell HOME (the member shell's Personal Home) — the home
 * BODY is the Social pillar (polls band + community feed). The other
 * pillars live in this shell's persistent chrome, by the M1 design:
 * Personal in the profile/sidebar + PORTAL/PROFILE tabs, Locations
 * in the My Organisations (Quick Look) strip, and Management as the
 * strip's peek → "Open full workspace" doorway plus the header's
 * Grow / ModeSwitch. Only the Social header is rendered in the body;
 * the map records the whole truth so the test can pin it.
 */
export const MEMBER_HOME_PILLAR_MAP: readonly { element: string; pillar: PillarId }[] = [
  { element: 'Sidebar profile card + PORTAL/PROFILE tabs (shell chrome)', pillar: 'personal' },
  { element: 'MemberPollsSection band', pillar: 'social' },
  { element: 'SanataniSocialFeed (community feed)', pillar: 'social' },
  { element: 'MyOrganisationsStrip — Quick Look cards (shell chrome)', pillar: 'locations' },
  { element: 'Quick Look peek → Open full workspace; header Grow/ModeSwitch (shell chrome)', pillar: 'management' },
];
