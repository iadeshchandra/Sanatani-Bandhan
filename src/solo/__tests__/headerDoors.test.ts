/**
 * solo/__tests__/headerDoors.test.ts — Proposal A header doors.
 * =====================================================================
 * Pins the pure logic behind the 💬 Messages / 🔔 Suchana header doors:
 * numeric badges (never bare dots, never a "0"), the CRITICAL-only red
 * pulse, and the sangha inbox's unread-first ordering.
 */

import { formatBadgeCount, shouldPulseCritical } from '../headerBadges';
import { orderSanghaItems } from '../sanghaInboxPure';

describe('formatBadgeCount — numeric badges, never dots, never zero', () => {
  it('hides the badge at zero', () => {
    expect(formatBadgeCount(0)).toBeNull();
  });

  it('hides the badge for negative counts', () => {
    expect(formatBadgeCount(-3)).toBeNull();
  });

  it('hides the badge for NaN', () => {
    expect(formatBadgeCount(Number.NaN)).toBeNull();
  });

  it('shows small counts verbatim', () => {
    expect(formatBadgeCount(1)).toBe('1');
    expect(formatBadgeCount(9)).toBe('9');
  });

  it('shows double-digit counts verbatim', () => {
    expect(formatBadgeCount(42)).toBe('42');
    expect(formatBadgeCount(99)).toBe('99');
  });

  it('caps at 99+ so the badge never overflows the header button', () => {
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(1000)).toBe('99+');
  });

  it('floors fractional counts before formatting', () => {
    expect(formatBadgeCount(5.9)).toBe('5');
  });
});

describe('shouldPulseCritical — red reserved for SOS only', () => {
  it('no pulse when no critical items are unread', () => {
    expect(shouldPulseCritical(0)).toBe(false);
  });

  it('pulses with even one unread critical item', () => {
    expect(shouldPulseCritical(1)).toBe(true);
    expect(shouldPulseCritical(7)).toBe(true);
  });

  it('no pulse for garbage counts', () => {
    expect(shouldPulseCritical(Number.NaN)).toBe(false);
    expect(shouldPulseCritical(-1)).toBe(false);
  });
});

describe('orderSanghaItems — unread first, then capped', () => {
  const item = (id: string, isRead: boolean) => ({ id, isRead });

  it('puts unread before read', () => {
    const out = orderSanghaItems([item('a', true), item('b', false), item('c', true), item('d', false)], 30);
    expect(out.map((i) => i.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('applies the cap after ordering', () => {
    const items = Array.from({ length: 40 }, (_, i) => item(String(i), i % 2 === 0));
    const out = orderSanghaItems(items, 30);
    expect(out).toHaveLength(30);
    // First 30 must be the 20 unread ones first, then read ones.
    expect(out.slice(0, 20).every((i) => !i.isRead)).toBe(true);
  });

  it('returns empty for an empty inbox', () => {
    expect(orderSanghaItems([], 30)).toEqual([]);
  });

  it('keeps relative order within the read group', () => {
    const out = orderSanghaItems([item('x', true), item('y', true), item('z', true)], 10);
    expect(out.map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });

  it('a zero limit shows nothing', () => {
    expect(orderSanghaItems([item('a', false)], 0)).toEqual([]);
  });
});
