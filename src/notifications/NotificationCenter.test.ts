/**
 * NotificationCenter.test.ts — PHASE 1 notification brain correctness proofs.
 * ============================================================================
 * Mock the Firebase surface before any notification module loads it (same
 * pattern as src/tests/chat.test.ts). The engine, prefs and replay logic
 * are pure and tested directly; the singleton pipeline is tested through
 * injected readers + the mocked Firestore calls.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args: unknown[]) => ({ __col: args })),
  doc: jest.fn((...args: unknown[]) => ({ __doc: args })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn(),
  deleteField: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
}));

jest.mock('../firebase', () => ({ db: {} }));

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';

import {
  decideRouting,
  findGroupTarget,
  classifyReplay,
  digestOnlyDecision,
  groupedCardText,
  digestHeaderText,
  GROUP_WINDOW_MS,
  STALE_GENTLE_MS,
  type GroupCandidate,
} from './engine';
import {
  DEFAULT_PREFS,
  mergePrefs,
  isInQuietHours,
  quietHoursEndMs,
  policyAllowsPing,
  type NotificationPrefs,
} from './preferences';
import { NotificationCenter } from './NotificationCenter';
import { MemoryOutbox } from './outbox';
import type { NotifyEvent, QueuedEvent, TriText } from './types';

/* ------------------------------ fixtures ------------------------------ */

const tr = (s: string): TriText => ({ en: s, bn: `${s} (bn)`, hi: `${s} (hi)` });

const baseEvent = (over: Partial<NotifyEvent> = {}): NotifyEvent => ({
  kind: 'chat',
  priority: 'important',
  actor: { uid: 'u-rahim', name: 'Rahim' },
  title: tr('Message from Rahim'),
  body: tr('Ram Ram! Are you coming to the satsang?'),
  dedupeKey: 'chat:thread-1:msg-42',
  ...over,
});

/** 2026-10-17 at local HH:MM — timezone-independent test clock. */
const at = (h: number, m = 0): number => new Date(2026, 9, 17, h, m, 0).getTime();

const candidate = (over: Partial<GroupCandidate> = {}): GroupCandidate => ({
  id: 'n-existing',
  dedupeKey: 'other-key',
  kind: 'chat',
  priority: 'important',
  actorUid: 'u-rahim',
  createdAt: at(9, 0),
  read: false,
  groupedCount: 1,
  ...over,
});

const prefs = (over: Partial<NotificationPrefs> = {}): NotificationPrefs =>
  mergePrefs(over);

beforeEach(() => {
  jest.clearAllMocks();
});

/* --------------------------- priority engine --------------------------- */

describe('priority engine', () => {
  it('critical breaks through quiet hours: pings, persistent, never held', () => {
    const d = decideRouting(baseEvent({ priority: 'critical', kind: 'sos' }), prefs(), at(6, 0));
    expect(d.ping).toBe(true);
    expect(d.persistent).toBe(true);
    expect(d.holdUntil).toBeNull();
    expect(d.inApp).toBe(true);
  });

  it('critical breaks through manual DND too', () => {
    const d = decideRouting(
      baseEvent({ priority: 'critical', kind: 'sos' }),
      prefs({ dnd: true }),
      at(12, 0),
    );
    expect(d.ping).toBe(true);
    expect(d.holdUntil).toBeNull();
  });

  it('critical breaks through a category policy of off', () => {
    const d = decideRouting(
      baseEvent({ priority: 'critical', kind: 'chat' }),
      prefs({ chat: 'off' }),
      at(12, 0),
    );
    expect(d.ping).toBe(true);
  });

  it('important delivers promptly outside quiet hours', () => {
    const d = decideRouting(baseEvent(), prefs(), at(12, 0));
    expect(d.ping).toBe(true);
    expect(d.inApp).toBe(true);
    expect(d.holdUntil).toBeNull();
    expect(d.persistent).toBe(false);
  });

  it('important is held (never dropped) during quiet hours', () => {
    const now = at(6, 0); // inside default 05:00–07:00
    const d = decideRouting(baseEvent(), prefs(), now);
    expect(d.ping).toBe(false);
    expect(d.holdUntil).not.toBeNull();
    expect(d.holdReason).toBe('quiet');
    expect(d.inApp).toBe(true); // the card is still written immediately
  });

  it('important held during DND gets a dnd hold reason', () => {
    const d = decideRouting(baseEvent(), prefs({ dnd: true }), at(12, 0));
    expect(d.ping).toBe(false);
    expect(d.holdUntil).not.toBeNull();
    expect(d.holdReason).toBe('dnd');
  });

  it('important with chat=off is in-app only, no ping', () => {
    const d = decideRouting(baseEvent({ kind: 'chat' }), prefs({ chat: 'off' }), at(12, 0));
    expect(d.ping).toBe(false);
    expect(d.inApp).toBe(true);
    expect(d.holdUntil).toBeNull();
  });

  it('gentle is a digest candidate: no ping, feeds Suchana', () => {
    const d = decideRouting(baseEvent({ priority: 'gentle' }), prefs(), at(12, 0));
    expect(d.ping).toBe(false);
    expect(d.digestCandidate).toBe(true);
    expect(d.toSuchana).toBe(true);
    expect(d.inApp).toBe(true);
  });

  it('gentle with chat=digest never pings', () => {
    const d = decideRouting(
      baseEvent({ priority: 'gentle', kind: 'chat' }),
      prefs({ chat: 'digest' }),
      at(12, 0),
    );
    expect(d.ping).toBe(false);
    expect(d.digestCandidate).toBe(true);
  });

  it('silent is in-app only: no ping, no Suchana, no digest', () => {
    const d = decideRouting(baseEvent({ priority: 'silent' }), prefs(), at(12, 0));
    expect(d.ping).toBe(false);
    expect(d.inApp).toBe(true);
    expect(d.toSuchana).toBe(false);
    expect(d.digestCandidate).toBe(false);
    expect(d.persistent).toBe(false);
  });

  it('silent stays silent even outside quiet hours with instant prefs', () => {
    const d = decideRouting(
      baseEvent({ priority: 'silent', kind: 'security' }),
      prefs(),
      at(12, 0),
    );
    expect(d.ping).toBe(false);
  });
});

/* ------------------------------ quiet hours ----------------------------- */

describe('quiet hours', () => {
  it('default Brahma muhurta window 05:00–07:00 is respected', () => {
    expect(isInQuietHours(at(5, 30), DEFAULT_PREFS.quietHours)).toBe(true);
    expect(isInQuietHours(at(4, 59), DEFAULT_PREFS.quietHours)).toBe(false);
    expect(isInQuietHours(at(7, 0), DEFAULT_PREFS.quietHours)).toBe(false);
    expect(isInQuietHours(at(12, 0), DEFAULT_PREFS.quietHours)).toBe(false);
  });

  it('custom quiet hours are honoured', () => {
    const qh = { start: '22:00', end: '06:00' };
    expect(isInQuietHours(at(23, 30), qh)).toBe(true);
    expect(isInQuietHours(at(3, 0), qh)).toBe(true);
    expect(isInQuietHours(at(12, 0), qh)).toBe(false);
    expect(isInQuietHours(at(21, 59), qh)).toBe(false);
  });

  it('windows spanning midnight release at the right moment', () => {
    const qh = { start: '22:00', end: '06:00' };
    const endMs = quietHoursEndMs(at(23, 30), qh);
    expect(new Date(endMs).getHours()).toBe(6);
    expect(new Date(endMs).getMinutes()).toBe(0);
    expect(endMs).toBeGreaterThan(at(23, 30));
  });

  it('default window releases held pushes at 07:00', () => {
    const endMs = quietHoursEndMs(at(6, 15), DEFAULT_PREFS.quietHours);
    const d = new Date(endMs);
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(0);
  });

  it('garbage quiet-hours input fails open (not quiet)', () => {
    expect(isInQuietHours(at(6, 0), { start: 'nope', end: '07:00' })).toBe(false);
    expect(isInQuietHours(at(6, 0), { start: '05:00', end: '05:00' })).toBe(false);
  });
});

/* ---------------------------- grouping / dedupe -------------------------- */

describe('smart grouping and dedupe', () => {
  it('exact dedupeKey match collapses into the existing card', () => {
    const t = findGroupTarget(
      [candidate({ dedupeKey: 'chat:thread-1:msg-42' })],
      baseEvent(),
      at(9, 10),
    );
    expect(t?.id).toBe('n-existing');
  });

  it('same actor + kind collapses within the 30-minute window', () => {
    const t = findGroupTarget([candidate()], baseEvent({ dedupeKey: 'fresh-key' }), at(9, 20));
    expect(t?.id).toBe('n-existing');
  });

  it('does not group across the 30-minute window', () => {
    const t = findGroupTarget(
      [candidate({ createdAt: at(9, 0) })],
      baseEvent({ dedupeKey: 'fresh-key' }),
      at(9, 0) + GROUP_WINDOW_MS + 1000,
    );
    expect(t).toBeNull();
  });

  it('does not group into read cards', () => {
    const t = findGroupTarget(
      [candidate({ read: true, dedupeKey: 'chat:thread-1:msg-42' })],
      baseEvent(),
      at(9, 10),
    );
    expect(t).toBeNull();
  });

  it('does not group across different actors', () => {
    const t = findGroupTarget(
      [candidate({ actorUid: 'u-someone-else' })],
      baseEvent({ dedupeKey: 'fresh-key' }),
      at(9, 10),
    );
    expect(t).toBeNull();
  });

  it('critical SOS never groups — every alert is its own banner', () => {
    const t = findGroupTarget(
      [candidate({ kind: 'sos', dedupeKey: 'sos:1', priority: 'critical', actorUid: 'u-x' })],
      baseEvent({ kind: 'sos', priority: 'critical', dedupeKey: 'sos:2', actor: { uid: 'u-x', name: 'X' } }),
      at(9, 10),
    );
    expect(t).toBeNull();
  });

  it('prefers the exact dedupeKey match over actor+kind', () => {
    const exact = candidate({ id: 'n-exact', dedupeKey: 'chat:thread-1:msg-42' });
    const loose = candidate({ id: 'n-loose', dedupeKey: 'other' });
    const t = findGroupTarget([loose, exact], baseEvent(), at(9, 10));
    expect(t?.id).toBe('n-exact');
  });
});

/* --------------------------- offline queue replay ------------------------ */

describe('offline queue replay', () => {
  const queued = (over: Partial<QueuedEvent>): QueuedEvent => ({
    ...baseEvent(),
    id: 'q-1',
    uid: 'u-devotee',
    queuedAt: at(8, 0),
    ...over,
  });

  it('stale gentle (>6h) goes straight to digest, never pings', () => {
    const v = classifyReplay(
      queued({ priority: 'gentle', queuedAt: at(8, 0) - STALE_GENTLE_MS - 1000 }),
      at(15, 0),
    );
    expect(v).toBe('digest');
    const d = digestOnlyDecision('morning');
    expect(d.ping).toBe(false);
    expect(d.toSuchana).toBe(true);
    expect(d.inApp).toBe(true);
  });

  it('fresh gentle (<6h) replays normally', () => {
    expect(classifyReplay(queued({ priority: 'gentle' }), at(9, 0))).toBe('replay');
  });

  it('old important replays normally — never forced to digest', () => {
    expect(
      classifyReplay(queued({ priority: 'important', queuedAt: at(0, 0) }), at(15, 0)),
    ).toBe('replay');
  });

  it('critical replays even when very old — SOS must break through', () => {
    expect(
      classifyReplay(
        queued({ priority: 'critical', kind: 'sos', queuedAt: at(0, 0) - 24 * 3600_000 }),
        at(15, 0),
      ),
    ).toBe('replay');
  });

  it('expired events are dropped quietly', () => {
    expect(
      classifyReplay(queued({ expiresAt: at(10, 0) }), at(11, 0)),
    ).toBe('drop');
  });

  it('unexpired events are never dropped by the replay classifier', () => {
    expect(
      classifyReplay(queued({ priority: 'silent', expiresAt: at(20, 0) }), at(11, 0)),
    ).toBe('replay');
  });
});

/* --------------------------------- prefs --------------------------------- */

describe('preferences', () => {
  it('defaults are calm: money/chat instant, suchana morning, blessings on', () => {
    expect(DEFAULT_PREFS.moneyRequests).toBe('instant');
    expect(DEFAULT_PREFS.chat).toBe('instant');
    expect(DEFAULT_PREFS.suchana).toBe('morning');
    expect(DEFAULT_PREFS.blessings).toBe(true);
    expect(DEFAULT_PREFS.quietHours).toEqual({ start: '05:00', end: '07:00' });
    expect(DEFAULT_PREFS.dnd).toBe(false);
  });

  it('mergePrefs keeps defaults for untouched categories', () => {
    const m = mergePrefs({ chat: 'digest', dnd: true });
    expect(m.chat).toBe('digest');
    expect(m.moneyRequests).toBe('instant');
    expect(m.dnd).toBe(true);
    expect(m.quietHours).toEqual({ start: '05:00', end: '07:00' });
  });

  it('mergePrefs deep-merges quietHours without clobbering', () => {
    const m = mergePrefs({ quietHours: { start: '23:00', end: '06:00' } });
    expect(m.quietHours).toEqual({ start: '23:00', end: '06:00' });
    expect(m.suchana).toBe('morning');
  });

  it('policyAllowsPing respects each category toggle', () => {
    expect(policyAllowsPing('chat', prefs({ chat: 'off' }))).toBe(false);
    expect(policyAllowsPing('money_request', prefs({ moneyRequests: 'digest' }))).toBe(false);
    expect(policyAllowsPing('blessing', prefs({ blessings: false }))).toBe(false);
    expect(policyAllowsPing('sos', prefs({ chat: 'off' }))).toBe(true);
  });
});

/* ------------------------------ trilingual copy -------------------------- */

describe('trilingual copy', () => {
  it('grouped card text is warm and trilingual for every kind', () => {
    const kinds = [
      'sos',
      'chat',
      'money_request',
      'wallet',
      'suchana',
      'org',
      'blessing',
      'security',
    ] as const;
    for (const kind of kinds) {
      const t = groupedCardText(3, 'Rahim', kind);
      expect(t.en).toContain('3');
      expect(t.en).toContain('Rahim');
      expect(t.bn.length).toBeGreaterThan(5);
      expect(t.hi.length).toBeGreaterThan(5);
      expect(t.bn).toContain('Rahim');
    }
  });

  it('digest header text is calm and trilingual', () => {
    for (const w of ['morning', 'evening'] as const) {
      const t = digestHeaderText(5, w);
      expect(t.en).toMatch(/no hurry/i);
      expect(t.bn.length).toBeGreaterThan(10);
      expect(t.hi.length).toBeGreaterThan(10);
    }
  });
});

/* ------------------------- singleton pipeline ---------------------------- */

describe('NotificationCenter pipeline (mocked Firestore)', () => {
  const setup = async (over: {
    online?: boolean | (() => boolean);
    recent?: GroupCandidate[];
    held?: Array<{ id: string; holdUntil: number | null }>;
    prefs?: Partial<NotificationPrefs>;
  } = {}) => {
    const center = NotificationCenter.fresh();
    const outbox = new MemoryOutbox();
    const onlineCfg = over.online;
    const isOnline: () => boolean = () =>
      typeof onlineCfg === 'function' ? onlineCfg() : (onlineCfg ?? true);
    await center.configure({
      uid: 'u-devotee',
      prefs: over.prefs,
      outbox,
      online: isOnline,
      listRecent: async () => over.recent ?? [],
      listHeld: async () => over.held ?? [],
    });
    return { center, outbox };
  };

  it('emit online writes the in-app item and reports delivered', async () => {
    const { center } = await setup();
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const res = await center.emit(baseEvent());
    expect(res.status).toBe('delivered');
    expect(res.itemId).toMatch(/^n_/);
    expect(setDoc).toHaveBeenCalled();
    // The in-app write carried the devotee's uid and the dedupe key.
    const docArg = (setDoc as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(docArg.uid).toBe('u-devotee');
    expect(docArg.dedupeKey).toBe('chat:thread-1:msg-42');
    expect(doc).toHaveBeenCalled();
    expect(collection).toHaveBeenCalled();
  });

  it('emit offline queues to the outbox and replays on reconnect', async () => {
    let online = false;
    const { center, outbox } = await setup({ online: () => online });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const res = await center.emit(baseEvent({ priority: 'gentle' }));
    expect(res.status).toBe('queued');
    expect(await outbox.list()).toHaveLength(1);

    // Still offline: drain must NOT consume the queue.
    const kept = await center.drainOutbox();
    expect(kept).toEqual({ replayed: 0, digested: 0, dropped: 0 });
    expect(await outbox.list()).toHaveLength(1);

    // Reconnect: the fresh gentle event replays through the normal pipeline.
    online = true;
    const done = await center.onOnline();
    expect(done.replayed).toBe(1);
    expect(await outbox.list()).toHaveLength(0);
    expect(setDoc).toHaveBeenCalled(); // in-app item was written on replay
  });

  it('emit merges into an existing card and bumps the count', async () => {
    const { center } = await setup({ recent: [candidate({ groupedCount: 2 })] });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    const res = await center.emit(baseEvent({ dedupeKey: 'fresh-key' }));
    expect(res.status).toBe('grouped');
    expect(updateDoc).toHaveBeenCalled();
    const patch = (updateDoc as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(patch.groupedCount).toBe(3);
    // Group merges never create a new in-app card.
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('drainOutbox replays important, digests stale gentle, drops expired', async () => {
    const { center, outbox } = await setup({ online: true });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const now = Date.now();
    await outbox.enqueue({
      ...baseEvent({ priority: 'important', dedupeKey: 'k-important' }),
      id: 'q-i',
      uid: 'u-devotee',
      queuedAt: now - 60_000,
    });
    await outbox.enqueue({
      ...baseEvent({ priority: 'gentle', kind: 'suchana', dedupeKey: 'k-gentle' }),
      id: 'q-g',
      uid: 'u-devotee',
      queuedAt: now - 7 * 3600_000,
    });
    await outbox.enqueue({
      ...baseEvent({ priority: 'silent', dedupeKey: 'k-expired', expiresAt: now - 1000 }),
      id: 'q-e',
      uid: 'u-devotee',
      queuedAt: now - 60_000,
    });
    const report = await center.drainOutbox();
    expect(report).toEqual({ replayed: 1, digested: 1, dropped: 1 });
    expect(await outbox.list()).toHaveLength(0);
  });

  it('flushHeld releases pushes whose hold expired and clears the hold', async () => {
    const now = Date.now();
    const { center } = await setup({
      held: [
        { id: 'n-held-1', holdUntil: now - 1000 },
        { id: 'n-held-2', holdUntil: now + 3600_000 },
      ],
    });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        id: 'n-held-1',
        uid: 'u-devotee',
        kind: 'chat',
        priority: 'important',
        title: tr('Hi'),
        body: tr('Hello'),
        dedupeKey: 'k',
        createdAt: now,
      }),
    });
    const released = await center.flushHeld(now);
    expect(released).toBe(1);
    // Push request written for the released item; hold cleared on the card.
    expect(setDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quietHold: false }),
    );
  });

  it('expired events are dropped without any write', async () => {
    const { center } = await setup();
    const res = await center.emit(baseEvent({ expiresAt: Date.now() - 1000 }));
    expect(res.status).toBe('dropped');
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('critical emitted during quiet hours still pings immediately', async () => {
    const { center } = await setup({
      prefs: { quietHours: { start: '00:00', end: '23:59' } },
    });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    const res = await center.emit(baseEvent({ priority: 'critical', kind: 'sos' }));
    expect(res.status).toBe('delivered');
    expect(res.decision.ping).toBe(true);
    expect(res.decision.holdUntil).toBeNull();
    expect(res.decision.persistent).toBe(true);
  });
});
