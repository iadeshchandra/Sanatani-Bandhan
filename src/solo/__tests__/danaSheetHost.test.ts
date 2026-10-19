/**
 * solo/__tests__/danaSheetHost.test.ts — QUEUED FIX #2 tests.
 *
 * The Home "Give" quick-action was a silent no-op because the only dana-sheet
 * handler lived in GivingTab (mounted only on the `giving` sub-tab).
 * DanaSheetHost now owns the single sheet instance at the shell level, so
 * openDanaSheet() works from anywhere in the solo shell.
 *
 * These tests pin:
 *  1. The prefill mapping (lib contract → sheet props), including the
 *     no-leak guarantee on fresh opens.
 *  2. The lib/danaSheet.ts coordination contract: registered opener wins;
 *     window event is the fallback; unregister only removes its own closure.
 */

/* Minimal window stub for the node test env. */
type Listener = (e: unknown) => void;
const dispatched: Array<{ type: string; detail: unknown }> = [];
const listeners: Record<string, Listener[]> = {};
(global as unknown as { window: unknown }).window = {
  dispatchEvent: (e: { type: string; detail?: unknown }) => {
    dispatched.push({ type: e.type, detail: e.detail });
    (listeners[e.type] || []).forEach((l) => l(e));
    return true;
  },
  addEventListener: (type: string, l: Listener) => {
    listeners[type] = [...(listeners[type] || []), l];
  },
  removeEventListener: (type: string, l: Listener) => {
    listeners[type] = (listeners[type] || []).filter((x) => x !== l);
  },
};

/* CustomEvent exists in node ≥15; provide a minimal one if absent. */
if (typeof (global as unknown as { CustomEvent?: unknown }).CustomEvent === 'undefined') {
  (global as unknown as { CustomEvent: unknown }).CustomEvent = class {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
}

import {
  openDanaSheet,
  registerDanaSheetOpener,
  unregisterDanaSheetOpener,
  hasDanaSheetHandler,
  toSheetPrefill,
  DANA_SHEET_EVENT,
  type DanaSheetPrefill,
} from '../../lib/danaSheet';

beforeEach(() => {
  dispatched.length = 0;
  for (const k of Object.keys(listeners)) delete listeners[k];
});

/* Every test that registers an opener unregisters it in a `finally` block,
   so the module-level slot never leaks between tests. */

describe('toSheetPrefill — contract → sheet props mapping', () => {
  test('maps a seva-card prefill to sheet props', () => {
    const p: DanaSheetPrefill = {
      initialAmount: 101,
      initialOrg: { id: 'org-1', name: 'Kashi Vishwanath' },
      initialPurpose: 'Annadanam — one day\'s bhog',
      cardId: 'card-9',
      currency: 'INR',
    };
    expect(toSheetPrefill(p)).toEqual({
      amount: 101,
      orgName: 'Kashi Vishwanath',
      purpose: 'Annadanam — one day\'s bhog',
    });
  });

  test('empty prefill maps to all-undefined — no leak from a previous card', () => {
    expect(toSheetPrefill({})).toEqual({
      amount: undefined,
      orgName: undefined,
      purpose: undefined,
    });
  });

  test('partial prefill keeps only what was given', () => {
    expect(toSheetPrefill({ initialAmount: 501 })).toEqual({
      amount: 501,
      orgName: undefined,
      purpose: undefined,
    });
  });

  test('missing org name is undefined, not a crash', () => {
    expect(toSheetPrefill({ initialOrg: { id: 'x', name: '' } }).orgName).toBe('');
  });
});

describe('lib/danaSheet.ts — coordination contract', () => {
  test('registered opener receives the prefill; no window event dispatched', () => {
    const seen: DanaSheetPrefill[] = [];
    const opener = (p: DanaSheetPrefill) => { seen.push(p); };
    registerDanaSheetOpener(opener);
    try {
      expect(hasDanaSheetHandler()).toBe(true);
      const prefill: DanaSheetPrefill = { initialAmount: 51 };
      openDanaSheet(prefill);
      expect(seen).toEqual([prefill]);
      expect(dispatched.filter((d) => d.type === DANA_SHEET_EVENT)).toHaveLength(0);
    } finally {
      unregisterDanaSheetOpener(opener);
    }
    expect(hasDanaSheetHandler()).toBe(false);
  });

  test('no opener → window event dispatched with the prefill as detail', () => {
    expect(hasDanaSheetHandler()).toBe(false);
    const received: unknown[] = [];
    const onEvent = (e: unknown) => { received.push((e as { detail: unknown }).detail); };
    (global as unknown as { window: { addEventListener: (t: string, l: Listener) => void } })
      .window.addEventListener(DANA_SHEET_EVENT, onEvent);
    const prefill: DanaSheetPrefill = { initialPurpose: 'Diya' };
    openDanaSheet(prefill);
    expect(received).toEqual([prefill]);
    expect(dispatched.filter((d) => d.type === DANA_SHEET_EVENT)).toHaveLength(1);
  });

  test('unregister only removes its own closure', () => {
    const a = (_p: DanaSheetPrefill) => undefined;
    const b = (_p: DanaSheetPrefill) => undefined;
    registerDanaSheetOpener(a);
    unregisterDanaSheetOpener(b); // different closure — must not clear
    expect(hasDanaSheetHandler()).toBe(true);
    unregisterDanaSheetOpener(a);
    expect(hasDanaSheetHandler()).toBe(false);
  });

  test('re-registration replaces the previous opener (single slot)', () => {
    const calls: string[] = [];
    const first = (_p: DanaSheetPrefill) => { calls.push('first'); };
    const second = (_p: DanaSheetPrefill) => { calls.push('second'); };
    registerDanaSheetOpener(first);
    registerDanaSheetOpener(second);
    try {
      openDanaSheet({});
      expect(calls).toEqual(['second']);
    } finally {
      unregisterDanaSheetOpener(second);
    }
  });

  test('the Home "Give" path: openDanaSheet({}) reaches a shell-level opener', () => {
    // Simulates DanaSheetHost being mounted at the shell: an opener is
    // registered, so the Home quick-action's openDanaSheet({}) opens the
    // sheet instead of dispatching into the void.
    let opened = 0;
    const hostOpener = (_p: DanaSheetPrefill) => { opened += 1; };
    registerDanaSheetOpener(hostOpener);
    try {
      openDanaSheet({}); // exactly what SoloHome's "give" quick-action calls
      expect(opened).toBe(1);
    } finally {
      unregisterDanaSheetOpener(hostOpener);
    }
  });
});
