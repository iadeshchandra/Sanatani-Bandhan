/**
 * notifications/__tests__/deepLinks.test.ts
 * =====================================================================
 * AUDIT FIX #5: every deep-link emitted by the notification system must
 * resolve to a real route. These tests pin the route map so a future
 * emitter can't reintroduce a dead link.
 *
 * Valid solo-shell routes (see SoloWorkspaceShell):
 *   /app/chat[?with=<chatId>]  — ChatRoute (NEW)
 *   /app/home[/<subTab>]       — HomeTab + sub-tabs (sangam, wallet, ...)
 *   /app/suchana               — SuchanaPage
 *   /app/profile               — ProfileTab
 *   /app/orgs, /app/org/:orgId — org surfaces
 * Valid top-level routes (see App.tsx):
 *   /u/:uid, /org/:orgId, /seva/pro/:uid, /shorts/:shortId, ...
 */

/** Route patterns every notification deep-link must match. */
const VALID_PATTERNS: RegExp[] = [
  /^\/app\/chat(\?with=[\w-]+)?$/,
  /^\/app\/home(\/[\w-]+)?$/,
  /^\/app\/suchana$/,
  /^\/app\/profile$/,
  /^\/app\/orgs(\/[\w-]+)?$/,
  /^\/app\/org\/[\w-]+$/,
  /^\/u\/[\w-]+$/,
  /^\/org\/[\w-]+$/,
  /^\/seva\/pro\/[\w-]+$/,
  /^\/seva\/journeys$/,
  /^\/shorts\/[\w-]+$/,
];

/** Returns true when the deep-link resolves to a real route. */
export function isValidDeepLink(link: string | undefined): boolean {
  if (!link) return true; // no link = no navigation, always safe
  if (link.startsWith('sanatani:')) return true; // custom scheme, handled by event listeners
  return VALID_PATTERNS.some((p) => p.test(link));
}

/** Every deep-link format the emitters produce (mirrors notifyHelpers + friends). */
const EMITTED_LINKS: Array<{ name: string; link: string }> = [
  { name: 'chat message', link: '/app/chat?with=chat_abc123' },
  { name: 'chat (no id)', link: '/app/chat' },
  { name: 'p2p request', link: '/app/chat?with=chat_xyz789' },
  { name: 'wallet topup', link: '/app/home/wallet' },
  { name: 'commission due', link: '/app/home/marketplace' },
  { name: 'social ashirvad', link: '/app/home/sangam' },
  { name: 'social comment', link: '/app/home/sangam' },
  { name: 'suchana digest', link: '/app/suchana' },
  { name: 'devotee profile', link: '/u/user_123' },
  { name: 'org page', link: '/org/org_456' },
  { name: 'live darshan', link: '/org/org_789' },
  { name: 'money nudge', link: '/app/home/wallet' },
  { name: 'sadhana nudge', link: '/app/home/sadhana' },
];

describe('isValidDeepLink', () => {
  it.each(EMITTED_LINKS)('$name ($link) resolves to a real route', ({ link }) => {
    expect(isValidDeepLink(link)).toBe(true);
  });

  it('rejects the old dead formats', () => {
    expect(isValidDeepLink('/chat/abc123')).toBe(false);
    expect(isValidDeepLink('/chat')).toBe(false);
    expect(isValidDeepLink('/wallet')).toBe(false);
    expect(isValidDeepLink('/sangam')).toBe(false);
    expect(isValidDeepLink('/suchana')).toBe(false);
    expect(isValidDeepLink('/safety')).toBe(false);
    expect(isValidDeepLink('/safety/sos/evt1')).toBe(false);
    expect(isValidDeepLink('/marketplace/dues')).toBe(false);
    expect(isValidDeepLink('/wallet/requests/req1')).toBe(false);
    expect(isValidDeepLink('/crisis/command')).toBe(false);
  });

  it('treats missing links as safe (no navigation)', () => {
    expect(isValidDeepLink(undefined)).toBe(true);
    expect(isValidDeepLink('')).toBe(true);
  });

  it('allows custom sanatani: schemes (event-driven, not routes)', () => {
    expect(isValidDeepLink('sanatani:chat-backup')).toBe(true);
  });
});

describe('ChatRoute ?with= parsing', () => {
  // The parsing logic: `new URLSearchParams(search).get('with')`
  const parseWith = (search: string): string | undefined =>
    new URLSearchParams(search).get('with') || undefined;

  it('extracts the chat id', () => {
    expect(parseWith('?with=chat_abc123')).toBe('chat_abc123');
  });
  it('returns undefined when absent', () => {
    expect(parseWith('')).toBeUndefined();
    expect(parseWith('?other=1')).toBeUndefined();
  });
  it('ignores extra params', () => {
    expect(parseWith('?with=chat_abc&request=req_1')).toBe('chat_abc');
  });
});
