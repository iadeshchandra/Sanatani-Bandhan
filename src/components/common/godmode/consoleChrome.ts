/**
 * consoleChrome.ts — pure logic for the GodMode shell chrome (QUEUED #39).
 * ============================================================================
 * Everything the branded header, status strip and "Needs your hand"
 * summary show is decided HERE, from plain facts, so it is unit-testable
 * without Firebase:
 *
 *   summarizeApiHealth  stored probe results (#35) → one honest light
 *   buildHandItems      the action list, gated by the #21 role matrix
 *   handCompleteness    whether "all clear" is a claim we may make
 *   identityFor         the signed-in identity chip (name/initial/role)
 *   filterJumpEntries   quick-jump matching over desks + hand items
 *
 * HONESTY LAWS (the shell's own rules, carried into the chrome):
 *  - A fact is `undefined` until it has really been read. Unknown never
 *    renders as zero, green, or "all clear" — the UI hides it instead.
 *  - Role scoping is not cosmetic: an item exists in the output only
 *    when canAccessTab() says the role may open its desk, so an
 *    owner-only count (claims, due subscriptions, API state) can never
 *    leak to a delegated admin or moderator through the strip.
 */
import {
  API_DESCRIPTORS,
  HEALTH_LIGHT,
  healthState,
  type ApiHealthState,
  type ProbeResult,
} from '../../../apikeys/apiHealth';
import { canAccessTab, type PlatformRole } from '../../../lib/platformAdminRoles';

/* ------------------------------------------------------------ API summary */

export type ApiRollup = 'ok' | 'warn' | 'fail' | 'unknown';

export interface ApiSummary {
  rollup: ApiRollup;
  /** Status-light emoji for the rollup (🟢/🟡/🔴; '' when unknown). */
  light: string;
  /** APIs whose last probe says working. */
  okCount: number;
  /** APIs failing or quota-full (need the owner). */
  problemCount: number;
  /** APIs working but quota-near / rate-limited. */
  warnCount: number;
  /** Labels of problem APIs, registry order — for the summary row. */
  problemNames: string[];
  /** Labels of warning APIs, registry order. */
  warnNames: string[];
  /** Epoch ms of the freshest probe behind this summary (0 = none). */
  freshestAt: number;
}

/**
 * Roll the stored probe results (#35's platformConfig/apiHealth doc)
 * into one strip light. `configuredById` says which APIs have a usable
 * key on record; quota ratio is intentionally NOT used here (the strip
 * has no live usage ledger — quota-near still surfaces via the
 * rate-limited probe outcome, and the API Keys desk remains the full
 * quota view). Null inputs → rollup 'unknown' → the UI hides the chip.
 */
export function summarizeApiHealth(
  results: Record<string, ProbeResult> | null | undefined,
  configuredById: Record<string, boolean> | null | undefined,
): ApiSummary {
  const empty: ApiSummary = {
    rollup: 'unknown',
    light: '',
    okCount: 0,
    problemCount: 0,
    warnCount: 0,
    problemNames: [],
    warnNames: [],
    freshestAt: 0,
  };
  if (!results || !configuredById) return empty;

  const out: ApiSummary = { ...empty, problemNames: [], warnNames: [] };
  let sawState = false;
  for (const desc of API_DESCRIPTORS) {
    const configured = configuredById[desc.id];
    if (configured === undefined) continue; // unknown → not counted at all
    const result = results[desc.id] ?? null;
    const state: ApiHealthState = healthState(result, { configured, ratio: null });
    if (result) out.freshestAt = Math.max(out.freshestAt, result.checkedAt);
    switch (state) {
      case 'ok':
        out.okCount += 1;
        sawState = true;
        break;
      case 'failing':
      case 'quota_full':
        out.problemCount += 1;
        out.problemNames.push(desc.label);
        sawState = true;
        break;
      case 'quota_near':
        out.warnCount += 1;
        out.warnNames.push(desc.label);
        sawState = true;
        break;
      default:
        break; // untested / not_configured — neutral, never counted as ok
    }
  }
  if (!sawState) return { ...out, rollup: 'unknown', light: '' };
  out.rollup = out.problemCount > 0 ? 'fail' : out.warnCount > 0 ? 'warn' : 'ok';
  out.light =
    out.rollup === 'fail'
      ? HEALTH_LIGHT.failing
      : out.rollup === 'warn'
        ? HEALTH_LIGHT.quota_near
        : HEALTH_LIGHT.ok;
  return out;
}

/* --------------------------------------------------------- "needs a hand" */

/**
 * The shell's live facts. Every field is `undefined` until its source
 * has actually been read (or attempted and failed) — see honesty laws.
 */
export interface ConsoleFacts {
  apis?: ApiSummary;
  /** Payment claims with status 'pending' (Billing). */
  pendingClaims?: number;
  /** Subscriptions due for the #24 expiry sweep (Billing). */
  dueSubscriptions?: number;
  /** Support leads still at status 'new' (Support). */
  newSupport?: number;
}

export type HandItemId = 'claims' | 'dueSubscriptions' | 'apis' | 'support';

export interface HandItem {
  id: HandItemId;
  /** Console tab the item deep-links to. */
  tab: 'billing' | 'apikeys' | 'support';
  /** Headline count (claims/due/leads awaiting, or APIs needing attention). */
  count: number;
  label: string;
  tone: 'amber' | 'red' | 'sky';
}

/** Fact → the desk that owns it. Single source for role gating below. */
const ITEM_TABS: Record<HandItemId, HandItem['tab']> = {
  claims: 'billing',
  dueSubscriptions: 'billing',
  apis: 'apikeys',
  support: 'support',
};

/**
 * The action list for THIS role. An item appears only when (a) the role
 * may open the owning desk (canAccessTab — the #21 matrix), (b) the fact
 * was really read, and (c) there is something to act on. Order is fixed:
 * money approvals first, then expiries, APIs, support.
 */
export function buildHandItems(
  role: PlatformRole | null | undefined,
  facts: ConsoleFacts,
): HandItem[] {
  if (!role) return [];
  const items: HandItem[] = [];
  const allowed = (id: HandItemId) => canAccessTab(role, ITEM_TABS[id]);

  if (allowed('claims') && typeof facts.pendingClaims === 'number' && facts.pendingClaims > 0) {
    items.push({
      id: 'claims',
      tab: 'billing',
      count: facts.pendingClaims,
      label: `${facts.pendingClaims} payment claim${facts.pendingClaims === 1 ? '' : 's'} awaiting approval`,
      tone: 'amber',
    });
  }
  if (
    allowed('dueSubscriptions') &&
    typeof facts.dueSubscriptions === 'number' &&
    facts.dueSubscriptions > 0
  ) {
    items.push({
      id: 'dueSubscriptions',
      tab: 'billing',
      count: facts.dueSubscriptions,
      label: `${facts.dueSubscriptions} subscription${facts.dueSubscriptions === 1 ? '' : 's'} past due for expiry`,
      tone: 'red',
    });
  }
  if (allowed('apis') && facts.apis && (facts.apis.problemCount > 0 || facts.apis.warnCount > 0)) {
    const names = [...facts.apis.problemNames, ...facts.apis.warnNames];
    const n = facts.apis.problemCount + facts.apis.warnCount;
    items.push({
      id: 'apis',
      tab: 'apikeys',
      count: n,
      label: `${n} API${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} attention — ${names.join(', ')}`,
      tone: facts.apis.problemCount > 0 ? 'red' : 'amber',
    });
  }
  if (allowed('support') && typeof facts.newSupport === 'number' && facts.newSupport > 0) {
    items.push({
      id: 'support',
      tab: 'support',
      count: facts.newSupport,
      label: `${facts.newSupport} new support message${facts.newSupport === 1 ? '' : 's'} unanswered`,
      tone: 'sky',
    });
  }
  return items;
}

/**
 * Which facts this role's summary is responsible for, and whether they
 * all arrived. "All clear" may only be claimed when every applicable
 * fact was read and came back zero/ok — a failed read narrows the
 * claim, it never fakes it.
 */
export function handCompleteness(
  role: PlatformRole | null | undefined,
  facts: ConsoleFacts,
): { applicable: HandItemId[]; loaded: HandItemId[]; complete: boolean } {
  if (!role) return { applicable: [], loaded: [], complete: false };
  const applicable = (Object.keys(ITEM_TABS) as HandItemId[]).filter((id) =>
    canAccessTab(role, ITEM_TABS[id]),
  );
  const isLoaded = (id: HandItemId): boolean => {
    switch (id) {
      case 'claims':
        return typeof facts.pendingClaims === 'number';
      case 'dueSubscriptions':
        return typeof facts.dueSubscriptions === 'number';
      case 'support':
        return typeof facts.newSupport === 'number';
      case 'apis':
        return !!facts.apis && facts.apis.rollup !== 'unknown';
    }
  };
  const loaded = applicable.filter(isLoaded);
  return { applicable, loaded, complete: loaded.length === applicable.length };
}

/* --------------------------------------------------------------- identity */

export interface ConsoleIdentity {
  /** Display name, else the email, else a neutral fallback. */
  name: string;
  /** Single-letter avatar initial. */
  initial: string;
  /** Role label for the chip ('Owner' | 'Admin' | 'Moderator'). */
  roleLabel: string;
}

export function identityFor(
  user: { displayName?: string | null; email?: string | null } | null | undefined,
  role: PlatformRole | null | undefined,
): ConsoleIdentity {
  const name =
    (user?.displayName && user.displayName.trim()) ||
    (user?.email && user.email.trim()) ||
    'Administrator';
  const roleLabel =
    role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : '';
  return { name, initial: name.charAt(0).toUpperCase() || 'A', roleLabel };
}

/* ------------------------------------------------------------ quick jump */

export interface JumpEntry {
  id: string;
  kind: 'hand' | 'tab';
  label: string;
  /** Small right-hand hint (owning desk for hand items, 'Desk' for tabs). */
  hint: string;
  /** Extra match text (tab id, synonyms) — not rendered. */
  keywords?: string;
}

/**
 * Filter quick-jump entries by a typed query: case-insensitive substring
 * over label + keywords, stable order (hand items stay first, as passed
 * in), capped so the panel stays scannable. Empty query → everything.
 */
export function filterJumpEntries(
  query: string,
  entries: readonly JumpEntry[],
  limit = 12,
): JumpEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, limit);
  return entries
    .filter(
      (e) =>
        e.label.toLowerCase().includes(q) || (e.keywords ?? '').toLowerCase().includes(q),
    )
    .slice(0, limit);
}
