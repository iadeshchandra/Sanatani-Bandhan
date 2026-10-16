/**
 * chatIntelligence.spec.ts — unit tests for the Chat & P2P intelligence engine.
 * Pure logic: no Firebase, no mocks needed (chatIntelligence.ts imports no
 * Firestore modules — only types + the static festival database).
 */

import {
  generateChatInsights,
  CHAT_GENERATOR_STATUS,
  type ChatSnapshot,
} from '../chatIntelligence';
import type { MoneyRequest } from '../../chat/types';

const UID = 'user-me';
const OTHER = 'user-them';
const DAY = 86400000;
const NOW = new Date('2026-11-05T12:00:00');

function req(partial: Partial<MoneyRequest> & { id: string }): MoneyRequest {
  return {
    direction: 'user_to_user',
    senderId: UID,
    senderName: 'Me',
    receiverId: OTHER,
    receiverName: 'Karim',
    amount: 500,
    currency: 'BDT',
    note: 'lunch',
    status: 'pending',
    chatId: 'chat-1',
    expiresAt: NOW.getTime() + DAY,
    createdAt: NOW.getTime() - DAY,
    updatedAt: NOW.getTime() - DAY,
    ...partial,
  } as MoneyRequest;
}

const snap = (s: Partial<ChatSnapshot>): ChatSnapshot => ({
  uid: UID,
  now: NOW,
  ...s,
});

describe('generateChatInsights', () => {
  it('suggests starting a first chat when there are no threads', () => {
    const out = generateChatInsights('solo', snap({ threads: [], requests: [] }));
    expect(out.some((i) => i.dedupeKey === 'chat:first')).toBe(true);
  });

  it('explains request cards when there are chats but no requests', () => {
    const out = generateChatInsights(
      'solo',
      snap({ threads: [{ id: 't1' }], requests: [] })
    );
    expect(out.some((i) => i.dedupeKey === 'chat:first-request')).toBe(true);
    expect(out.some((i) => i.dedupeKey === 'chat:first')).toBe(false);
  });

  it('nudges the sender when their pending request waits >= 2 days', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        requests: [
          req({ id: 'r1', createdAt: NOW.getTime() - 3 * DAY, status: 'pending' }),
        ],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:pending-sent:r1');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('nudge');
    expect(hit!.message.en).toContain('Karim');
    expect(hit!.message.en).toMatch(/cancel/i);
  });

  it('nudges the receiver when a request to them waits >= 2 days', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        requests: [
          req({
            id: 'r2',
            senderId: OTHER,
            senderName: 'Rahim',
            receiverId: UID,
            receiverName: 'Me',
            createdAt: NOW.getTime() - 3 * DAY,
            status: 'pending',
          }),
        ],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:pending-received:r2');
    expect(hit).toBeDefined();
    expect(hit!.message.en).toContain('Rahim');
  });

  it('does not nudge for fresh pending requests (< 2 days)', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        requests: [req({ id: 'r3', createdAt: NOW.getTime() - DAY })],
      })
    );
    expect(out.some((i) => i.dedupeKey.startsWith('chat:pending'))).toBe(false);
  });

  it('reminds the payer when an accepted request is unpaid >= 5 days', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        requests: [
          req({
            id: 'r4',
            status: 'accepted',
            updatedAt: NOW.getTime() - 6 * DAY,
            receiverName: 'Karim',
          }),
        ],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:settle-owe:r4');
    expect(hit).toBeDefined();
    expect(hit!.message.en).toContain('You owe Karim');
    expect(hit!.message.en).toContain('৳500');
  });

  it('prompts confirmation (attention) when paid >= 2 days and I am receiver', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        requests: [
          req({
            id: 'r5',
            senderId: OTHER,
            senderName: 'Rahim',
            receiverId: UID,
            status: 'paid',
            paidAt: NOW.getTime() - 3 * DAY,
            paidVia: 'bkash',
          }),
        ],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:confirm:r5');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('attention');
    expect(hit!.message.en).toContain('bkash');
  });

  it('surfaces org request awareness when an org sent >= 2 requests', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        orgRequestCounts: [{ orgId: 'org-1', orgName: 'Shanti Mandir', count: 3 }],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:org:org-1');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('info');
    expect(hit!.message.en).toContain('Shanti Mandir');
  });

  it('suggests a blessing when a festival is within 7 days and chats are recent', () => {
    // Diwali / Kali Puja fall on 2026-11-08; NOW is 2026-11-05.
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1', lastMessageAt: NOW.getTime() - 2 * DAY }],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:blessing:2026-11-08');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('info');
    expect(hit!.message.en).toMatch(/blessing card/i);
  });

  it('skips the blessing suggestion when there are no recent chats', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1', lastMessageAt: NOW.getTime() - 60 * DAY }],
      })
    );
    expect(out.some((i) => i.dedupeKey.startsWith('chat:blessing'))).toBe(false);
  });

  it('turns netting suggestions into wallet nudges', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1' }],
        netting: [
          {
            id: 'pass:r1:r2',
            text: {
              en: 'Rahim owes you ৳500 and you owe Karim ৳500 — ask Rahim to pay Karim directly?',
              bn: 'bn-text',
              hi: 'hi-text',
            },
          },
        ],
      })
    );
    const hit = out.find((i) => i.dedupeKey === 'chat:netting:pass:r1:r2');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('nudge');
    expect(hit!.actionRoute).toBe('wallet');
    expect(hit!.message.en).toContain('Rahim');
  });

  it('is fail-open: empty/garbage snapshots never throw', () => {
    expect(generateChatInsights('solo', {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dedupeKey: 'chat:first' }),
      ])
    );
    expect(generateChatInsights('solo', null as any)).toEqual([]);
    expect(generateChatInsights('solo', undefined as any)).toEqual([]);
    expect(
      generateChatInsights('solo', { threads: null, requests: 'nope' } as any)
    ).toEqual(expect.any(Array));
  });

  it('caps output at 20 and dedupes by dedupeKey', () => {
    const requests = Array.from({ length: 30 }, (_, i) =>
      req({
        id: `rx${i}`,
        createdAt: NOW.getTime() - 3 * DAY,
        updatedAt: NOW.getTime() - 3 * DAY,
      })
    );
    const out = generateChatInsights(
      'solo',
      snap({ threads: [{ id: 't1' }], requests })
    );
    expect(out.length).toBeLessThanOrEqual(20);
    const keys = out.map((i) => i.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('orders urgent/attention before nudge/info', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1', lastMessageAt: NOW.getTime() - DAY }],
        requests: [
          req({
            id: 'rA',
            senderId: OTHER,
            senderName: 'Rahim',
            receiverId: UID,
            status: 'paid',
            paidAt: NOW.getTime() - 3 * DAY,
          }),
          req({ id: 'rB', createdAt: NOW.getTime() - 3 * DAY, status: 'pending' }),
        ],
      })
    );
    const rank: Record<string, number> = { urgent: 0, attention: 1, nudge: 2, info: 3 };
    const seq = out.map((i) => rank[i.severity]);
    const sorted = [...seq].sort((a, b) => a - b);
    expect(seq).toEqual(sorted);
    // The attention-level confirm prompt outranks the nudge.
    expect(out[0].dedupeKey).toBe('chat:confirm:rA');
  });

  it('CHAT_GENERATOR_STATUS documents every generator', () => {
    const keys = Object.keys(CHAT_GENERATOR_STATUS);
    expect(keys).toEqual(
      expect.arrayContaining([
        'first-chat',
        'first-request',
        'pending',
        'settlement',
        'org',
        'blessing',
        'netting',
      ])
    );
    for (const k of keys) {
      expect(Array.isArray(CHAT_GENERATOR_STATUS[k].live)).toBe(true);
      expect(Array.isArray(CHAT_GENERATOR_STATUS[k].stub)).toBe(true);
    }
  });

  it('every user-facing string is trilingual', () => {
    const out = generateChatInsights(
      'solo',
      snap({
        threads: [{ id: 't1', lastMessageAt: NOW.getTime() - DAY }],
        requests: [
          req({ id: 'r1', createdAt: NOW.getTime() - 3 * DAY, status: 'pending' }),
          req({
            id: 'r2',
            senderId: OTHER,
            senderName: 'Rahim',
            receiverId: UID,
            status: 'paid',
            paidAt: NOW.getTime() - 3 * DAY,
          }),
          req({
            id: 'r3',
            status: 'accepted',
            updatedAt: NOW.getTime() - 6 * DAY,
          }),
        ],
        orgRequestCounts: [{ orgId: 'o1', orgName: 'Mandir', count: 2 }],
        netting: [
          { id: 'n1', text: { en: 'e', bn: 'b', hi: 'h' } },
        ],
      })
    );
    expect(out.length).toBeGreaterThan(3);
    for (const i of out) {
      for (const f of [i.title, i.message, i.actionLabel] as const) {
        expect(typeof f.en).toBe('string');
        expect(f.en.length).toBeGreaterThan(0);
        expect(typeof f.bn).toBe('string');
        expect(f.bn.length).toBeGreaterThan(0);
        expect(typeof f.hi).toBe('string');
        expect(f.hi.length).toBeGreaterThan(0);
      }
    }
  });
});
