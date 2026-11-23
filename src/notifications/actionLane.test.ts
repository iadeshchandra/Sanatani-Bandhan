/**
 * actionLane.test.ts — NOTIFICATION WAVE 1 (DESIGN §4) pure pins.
 * =====================================================================
 * The Action lane is a VIEW over the same scoped items: unread
 * action-tier ('important') items only, ordered by expiry —
 * premise-dies-soonest first, no-expiry items last, newest first
 * within a group. Critical items are NOT lane items (their tier
 * has its own persistent banner); read items leave the lane.
 */
import type { NotificationItem } from './types';
import {
  actionLaneGroups,
  actionLaneItems,
  actionUnreadCount,
  isActionItem,
} from './uiTypes';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

function item(partial: Partial<NotificationItem> & { id: string }): NotificationItem {
  const baseItem: NotificationItem = {
    id: partial.id,
    uid: 'me',
    kind: 'org',
    priority: 'important',
    title: { en: partial.id, bn: partial.id, hi: partial.id },
    body: { en: 'body', bn: 'body', hi: 'body' },
    createdAt: NOW,
    updatedAt: NOW,
    read: false,
    acknowledged: false,
    groupedCount: 1,
    quietHold: false,
    holdUntil: null,
    routes: ['inapp'],
    decision: {
      ping: false,
      inApp: true,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    },
    dedupeKey: partial.id,
  };
  return Object.assign(baseItem, partial);
}

describe('isActionItem / actionUnreadCount', () => {
  it('unread important is action; read, gentle and critical are not', () => {
    expect(isActionItem(item({ id: 'a' }))).toBe(true);
    expect(isActionItem(item({ id: 'b', read: true }))).toBe(false);
    expect(isActionItem(item({ id: 'c', priority: 'gentle' }))).toBe(false);
    expect(isActionItem(item({ id: 'd', priority: 'critical' }))).toBe(false);
    expect(isActionItem(item({ id: 'e', priority: 'silent' }))).toBe(false);
  });

  it('counts only the lane over a mixed list', () => {
    const items = [
      item({ id: 'a' }),
      item({ id: 'b', read: true }),
      item({ id: 'c', priority: 'gentle' }),
      item({ id: 'd' }),
    ];
    expect(actionUnreadCount(items)).toBe(2);
  });
});

describe('actionLaneItems ordering', () => {
  it('soonest-dying premise first; no-expiry items last, newest first', () => {
    const items = [
      item({ id: 'noexp-old', createdAt: NOW - 10 * HOUR }),
      item({ id: 'exp-late', expiresAt: NOW + 48 * HOUR, createdAt: NOW - HOUR }),
      item({ id: 'noexp-new', createdAt: NOW - HOUR }),
      item({ id: 'exp-soon', expiresAt: NOW + 2 * HOUR, createdAt: NOW - 5 * HOUR }),
    ];
    expect(actionLaneItems(items).map((i) => i.id)).toEqual([
      'exp-soon',
      'exp-late',
      'noexp-new',
      'noexp-old',
    ]);
  });

  it('equal expiries fall back to newest first', () => {
    const items = [
      item({ id: 'older', expiresAt: NOW + HOUR, createdAt: NOW - 2 * HOUR }),
      item({ id: 'newer', expiresAt: NOW + HOUR, createdAt: NOW - HOUR }),
    ];
    expect(actionLaneItems(items).map((i) => i.id)).toEqual(['newer', 'older']);
  });

  it('excludes read and non-action items without mutating the input', () => {
    const items = [
      item({ id: 'keep', expiresAt: NOW + HOUR }),
      item({ id: 'read', read: true }),
      item({ id: 'gentle', priority: 'gentle' }),
    ];
    const before = items.map((i) => i.id);
    expect(actionLaneItems(items).map((i) => i.id)).toEqual(['keep']);
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe('actionLaneGroups', () => {
  it('one single-item group per lane item, in lane order', () => {
    const items = [
      item({ id: 'late', expiresAt: NOW + 48 * HOUR }),
      item({ id: 'soon', expiresAt: NOW + HOUR }),
    ];
    const groups = actionLaneGroups(items);
    expect(groups.map((g) => g.items[0].id)).toEqual(['soon', 'late']);
    expect(groups.every((g) => g.items.length === 1 && g.unreadCount === 1)).toBe(true);
    expect(groups[0].key).toBe('lane:soon');
  });
});
