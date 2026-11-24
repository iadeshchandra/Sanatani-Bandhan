/**
 * platformNotices.ts — NOTIFICATION WAVE 4: pure picking for the
 * platform notice shelf (DESIGN §2.7).
 * =====================================================================
 * GodMode gains a voice: a SuperAdmin publishes ONE doc to the new
 * `platformNotices` collection (maintenance windows, new versions,
 * policy changes) and every signed-in user's own device self-listens
 * and rings its Suchana exactly once. Until this wave the platform
 * had NO channel to its users at all.
 *
 * The doc's words are owner-authored (title + body, one language —
 * the same honesty as org announcements: we do not machine-translate
 * an official notice). The dictionary supplies only the frame (the
 * "📣 Sanatani Bandhan" title label via surfaces.notify
 * suchana.platformNotice).
 *
 * No IO, no clock — fully unit-testable.
 */

/** The two notice kinds the rules pin: 'info' rings gentle,
 *  'important' rings at the action tier. */
export type PlatformNoticeKind = 'info' | 'important';

/** The pinned Firestore shape of one platformNotices doc. */
export interface PlatformNoticeDoc {
  title: string;
  body: string;
  kind: PlatformNoticeKind;
  /** Epoch ms the notice was published. */
  createdAt: number;
  /** Epoch ms after which the notice stops ringing; 0 = no expiry. */
  expiresAt: number;
  active: boolean;
}

/** A notice as the watcher sees it (doc + its id). */
export interface PlatformNoticeLike extends PlatformNoticeDoc {
  id: string;
}

export const PLATFORM_NOTICE_TITLE_MAX = 120;
export const PLATFORM_NOTICE_BODY_MAX = 1000;

/** The centre's dedupe key for one platform notice (DESIGN §2.7). */
export function platformNoticeKey(noticeId: string): string {
  return `platform:${noticeId}`;
}

/**
 * Is this notice live at `now`? Live = switched on by GodMode and
 * inside its window. `active` must be exactly true — the rules
 * deliberately carry no is-bool check (see RULES-DELTA), so any
 * non-true value is inert here, which is the safe direction.
 * Expiry is exclusive: at expiresAt the notice stops ringing.
 */
export function isNoticeLive(n: PlatformNoticeLike, now: number): boolean {
  if (!n || !n.id) return false;
  if (n.active !== true) return false;
  if (typeof n.expiresAt === 'number' && n.expiresAt > 0 && now >= n.expiresAt) return false;
  return true;
}

export interface PlatformNoticePick {
  notice: PlatformNoticeLike;
  dedupeKey: string;
}

/**
 * Pick the notices that should ring now: live and not already in
 * the device's seen ledger, oldest first (a returning user reads
 * the platform's news in the order it was published). `settled`
 * carries every LIVE id met this pass — the service merges it into
 * its ledger whether or not a bell rang (baseline included), so a
 * notice can never ring twice and an expired/deactivated one stops
 * being reconsidered once it has been live-seen.
 */
export function pickNewPlatformNotices(
  notices: readonly PlatformNoticeLike[],
  seen: ReadonlySet<string>,
  now: number,
): { notices: PlatformNoticePick[]; settled: string[] } {
  const live = (notices ?? []).filter((n) => isNoticeLive(n, now));
  live.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const settled: string[] = [];
  const picks: PlatformNoticePick[] = [];
  for (const n of live) {
    settled.push(n.id);
    if (seen.has(n.id)) continue;
    picks.push({ notice: n, dedupeKey: platformNoticeKey(n.id) });
  }
  return { notices: picks, settled };
}

/**
 * Validate GodMode composer input. Returns a stable error code or
 * null (codes, not prose — the composer renders its own copy).
 */
export function validatePlatformNoticeInput(input: {
  title: string;
  body?: string;
  kind: string;
}): string | null {
  const title = (input.title ?? '').trim();
  const body = (input.body ?? '').trim();
  if (title.length === 0) return 'title_required';
  if (title.length > PLATFORM_NOTICE_TITLE_MAX) return 'title_too_long';
  if (body.length > PLATFORM_NOTICE_BODY_MAX) return 'body_too_long';
  if (input.kind !== 'info' && input.kind !== 'important') return 'kind_invalid';
  return null;
}

/**
 * Build the exact Firestore doc for a notice. Whitelist-exact (the
 * rules pin this key set), no undefined values. Throws on invalid
 * input — callers validate first for friendly errors.
 */
export function buildPlatformNoticeDoc(args: {
  title: string;
  body?: string;
  kind: PlatformNoticeKind;
  createdAt: number;
  expiresAt: number;
}): PlatformNoticeDoc {
  const err = validatePlatformNoticeInput({ title: args.title, body: args.body, kind: args.kind });
  if (err) throw new Error(`Invalid platform notice: ${err}`);
  return {
    title: args.title.trim(),
    body: (args.body ?? '').trim(),
    kind: args.kind,
    createdAt: args.createdAt,
    expiresAt: Math.max(0, Math.floor(args.expiresAt) || 0),
    active: true,
  };
}
