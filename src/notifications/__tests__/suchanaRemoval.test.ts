/**
 * suchanaRemoval.test.ts — proves the dead suchanaItems rail is gone.
 * =====================================================================
 * The `notifications/{uid}/suchanaItems` collection was written on every
 * gentle emit but never read by any UI (the real Suchana feed is pure
 * local computation; gentle notifications surface in the "From your
 * sangha" inbox). These tests pin the removal so the dead rail can
 * never silently come back.
 *
 * Same Firebase mock pattern as NotificationCenter.test.ts.
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

jest.mock('../../firebase', () => ({ db: {} }));

import { setDoc } from 'firebase/firestore';
import { decideRouting, digestOnlyDecision } from '../engine';
import { deliver } from '../delivery';
import { mergePrefs, type NotificationPrefs } from '../preferences';
import type { NotifyEvent } from '../types';

const baseEvent = (over: Partial<NotifyEvent> = {}): NotifyEvent => ({
  kind: 'social',
  priority: 'gentle',
  title: { en: 'T', bn: 'T', hi: 'T' },
  body: { en: 'B', bn: 'B', hi: 'B' },
  actor: null,
  dedupeKey: 'test-key',
  deepLink: null,
  payload: {},
  ...over,
} as NotifyEvent);

const prefs = (over: Partial<NotificationPrefs> = {}): NotificationPrefs =>
  mergePrefs(over);

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

describe('suchanaItems rail removal', () => {
  it('gentle decisions carry no toSuchana key', () => {
    const d = decideRouting(baseEvent({ priority: 'gentle' }), prefs(), at(12, 0));
    expect('toSuchana' in d).toBe(false);
  });

  it('silent decisions carry no toSuchana key', () => {
    const d = decideRouting(baseEvent({ priority: 'silent' }), prefs(), at(12, 0));
    expect('toSuchana' in d).toBe(false);
  });

  it('important decisions carry no toSuchana key', () => {
    const d = decideRouting(baseEvent({ priority: 'important' }), prefs(), at(12, 0));
    expect('toSuchana' in d).toBe(false);
  });

  it('critical decisions carry no toSuchana key', () => {
    const d = decideRouting(baseEvent({ priority: 'critical' }), prefs(), at(12, 0));
    expect('toSuchana' in d).toBe(false);
  });

  it('digestOnlyDecision carries no toSuchana key', () => {
    const d = digestOnlyDecision('morning');
    expect('toSuchana' in d).toBe(false);
    // Digest still routes in-app — the inbox carries it now.
    expect(d.inApp).toBe(true);
    expect(d.ping).toBe(false);
  });

  it('deliver() source never mentions the suchana rail', () => {
    // Regression guard: if someone re-adds a suchana write to deliver(),
    // this fails loudly.
    expect(deliver.toString()).not.toMatch(/suchana/i);
  });

  it('deliver() writes only in-app + push rails for a gentle item', async () => {
    const d = decideRouting(baseEvent({ priority: 'gentle' }), prefs(), at(12, 0));
    const item = {
      id: 'n1',
      uid: 'u1',
      kind: 'social',
      priority: 'gentle',
      actor: null,
      title: { en: 'T', bn: 'T', hi: 'T' },
      body: { en: 'B', bn: 'B', hi: 'B' },
      dedupeKey: 'k1',
      deepLink: null,
      payload: {},
      expiresAt: null,
      createdAt: 1,
      updatedAt: 1,
      read: false,
      acknowledged: false,
      groupedCount: 1,
      quietHold: false,
      holdUntil: null,
      routes: [],
      decision: d,
    };
    (setDoc as jest.Mock).mockClear();
    await deliver({ uid: 'u1', item: item as any, decision: d });
    const writtenPaths = (setDoc as jest.Mock).mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    // In-app item written…
    expect(writtenPaths.some((p) => p.includes('items'))).toBe(true);
    // …but nothing under suchanaItems, ever.
    expect(writtenPaths.some((p) => p.includes('suchanaItems'))).toBe(false);
  });

  it('serialized decision object has no toSuchana field', async () => {
    const d = decideRouting(baseEvent({ priority: 'gentle' }), prefs(), at(12, 0));
    const item = {
      id: 'n2',
      uid: 'u1',
      kind: 'social',
      priority: 'gentle',
      actor: null,
      title: { en: 'T', bn: 'T', hi: 'T' },
      body: { en: 'B', bn: 'B', hi: 'B' },
      dedupeKey: 'k2',
      deepLink: null,
      payload: {},
      expiresAt: null,
      createdAt: 1,
      updatedAt: 1,
      read: false,
      acknowledged: false,
      groupedCount: 1,
      quietHold: false,
      holdUntil: null,
      routes: [],
      decision: d,
    };
    (setDoc as jest.Mock).mockClear();
    await deliver({ uid: 'u1', item: item as any, decision: d });
    const inAppCall = (setDoc as jest.Mock).mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('items')
    );
    expect(inAppCall).toBeDefined();
    const doc = inAppCall[1] as Record<string, unknown>;
    expect('toSuchana' in (doc.decision as Record<string, unknown>)).toBe(false);
  });
});
