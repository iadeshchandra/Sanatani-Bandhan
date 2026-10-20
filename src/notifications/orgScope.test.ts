/**
 * orgScope.test.ts — QUEUED #50 (audit D8) pins.
 * =====================================================================
 * Inside an org workspace, the Suchana bell + center show only that
 * org's items and the badge counts that same scoped list. Personal
 * space keeps everything. Org identity comes from payload.orgId (the
 * broadcast emitter's stamp), with the /org/{id} deep link as fallback.
 */

import {
  itemOrgId,
  scopeItemsForOrg,
  personalItems,
  unreadInScope,
  criticalUnreadInScope,
} from './orgScope';
import type { NotificationItem } from './types';

let seq = 0;
function item(partial: Partial<NotificationItem>): NotificationItem {
  seq += 1;
  return {
    id: `item-${seq}`,
    uid: 'uid-1',
    kind: 'org',
    priority: 'important',
    title: { en: 'T', bn: 'T', hi: 'T' },
    body: { en: 'B', bn: 'B', hi: 'B' },
    dedupeKey: `k-${seq}`,
    createdAt: 1_700_000_000_000 + seq,
    updatedAt: 1_700_000_000_000 + seq,
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
    ...partial,
  };
}

const mandirBroadcast = item({ payload: { orgId: 'WS-6508', announcementId: 'a1' } });
const goshalaBroadcast = item({ payload: { orgId: 'WS-2504', announcementId: 'a2' }, read: true });
const walletPersonal = item({ kind: 'wallet', payload: { requestId: 'r1' } });
const orgViaLinkOnly = item({ payload: undefined, deepLink: '/org/WS-6508' });
const sosPersonal = item({ kind: 'sos', priority: 'critical', payload: {} });

const stream = [mandirBroadcast, goshalaBroadcast, walletPersonal, orgViaLinkOnly, sosPersonal];

describe('itemOrgId', () => {
  it('reads payload.orgId first', () => {
    expect(itemOrgId(mandirBroadcast)).toBe('WS-6508');
    expect(itemOrgId(goshalaBroadcast)).toBe('WS-2504');
  });

  it('falls back to the /org/{id} deep link', () => {
    expect(itemOrgId(orgViaLinkOnly)).toBe('WS-6508');
  });

  it('personal items have no org', () => {
    expect(itemOrgId(walletPersonal)).toBeNull();
    expect(itemOrgId(sosPersonal)).toBeNull();
  });
});

describe('scopeItemsForOrg', () => {
  it('keeps only the active org’s items — identical content across orgs is impossible', () => {
    expect(scopeItemsForOrg(stream, 'WS-6508').map((i) => i.id)).toEqual(
      [mandirBroadcast.id, orgViaLinkOnly.id],
    );
    expect(scopeItemsForOrg(stream, 'WS-2504').map((i) => i.id)).toEqual([goshalaBroadcast.id]);
    expect(scopeItemsForOrg(stream, 'WS-9999')).toEqual([]);
  });

  it('no org context → nothing org-scoped (never leaks another org)', () => {
    expect(scopeItemsForOrg(stream, '')).toEqual([]);
    expect(scopeItemsForOrg(stream, null)).toEqual([]);
    expect(scopeItemsForOrg(stream, undefined)).toEqual([]);
  });
});

describe('personalItems + badge math', () => {
  it('personal space still sees every org item (scope applies only in org context)', () => {
    expect(personalItems(stream).map((i) => i.id)).toEqual([walletPersonal.id, sosPersonal.id]);
  });

  it('badge counts the scoped list exactly', () => {
    const scoped = scopeItemsForOrg(stream, 'WS-6508');
    expect(unreadInScope(scoped)).toBe(2);
    expect(unreadInScope(scopeItemsForOrg(stream, 'WS-2504'))).toBe(0); // its one item is read
    expect(criticalUnreadInScope(personalItems(stream))).toBe(1);
    expect(criticalUnreadInScope(scoped)).toBe(0);
  });
});
