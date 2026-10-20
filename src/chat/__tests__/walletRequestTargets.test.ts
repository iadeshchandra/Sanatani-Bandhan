/**
 * chat/__tests__/walletRequestTargets.test.ts — wallet request door targets.
 * =====================================================================
 * Audit 2026-10-20, offense #9: the only door to create a money request
 * was an icon-only 🙏 button inside a chat thread; the Personal Wallet
 * could act on requests but never start one. The wallet door composes
 * to KNOWN counterparties and reuses the thread each relationship
 * already lives in — this pure derivation is what makes that safe.
 */
import { requestTargetsFromEntries } from '../walletRequestTargets';
import type { LedgerEntry } from '../../lib/p2pLedger';

const entry = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  requestId: 'req1',
  direction: 'owed_to_me',
  counterpartyId: 'user_b',
  counterpartyName: 'Bina',
  amount: 500,
  currency: 'BDT',
  note: '',
  status: 'settled',
  chatId: 'chat_b',
  updatedAt: 1000,
  orgCounterparty: false,
  expiresAt: 2000,
  createdAt: 500,
  iAmPayer: false,
  ...over,
});

describe('requestTargetsFromEntries', () => {
  it('returns no targets for an empty ledger', () => {
    expect(requestTargetsFromEntries([])).toEqual([]);
  });

  it('builds a user target carrying name, photo and the existing chatId', () => {
    const [t] = requestTargetsFromEntries([
      entry({ counterpartyPhotoUrl: 'https://x/p.jpg' }),
    ]);
    expect(t.key).toBe('user:user_b');
    expect(t.chatId).toBe('chat_b');
    expect(t.recipient).toEqual({
      id: 'user_b',
      name: 'Bina',
      photoUrl: 'https://x/p.jpg',
    });
  });

  it('dedupes a counterparty — the newest entry supplies the chatId', () => {
    const targets = requestTargetsFromEntries([
      entry({ requestId: 'old', chatId: 'chat_old', updatedAt: 1000 }),
      entry({ requestId: 'new', chatId: 'chat_new', updatedAt: 5000 }),
      entry({ requestId: 'mid', chatId: 'chat_mid', updatedAt: 3000 }),
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0].chatId).toBe('chat_new');
    expect(targets[0].lastActivityAt).toBe(5000);
  });

  it('an org counterparty becomes an org recipient (user_to_org direction)', () => {
    const [t] = requestTargetsFromEntries([
      entry({
        counterpartyId: 'org_1',
        counterpartyName: 'Kashi Mandir',
        orgCounterparty: true,
        orgId: 'org_1',
        orgName: 'Kashi Mandir',
        chatId: 'chat_org',
      }),
    ]);
    expect(t.key).toBe('org:org_1');
    expect(t.recipient.orgId).toBe('org_1');
    expect(t.recipient.orgName).toBe('Kashi Mandir');
    expect(t.recipient.id).toBe('org_1');
  });

  it('skips entries with no chatId — a request must land in a thread', () => {
    expect(requestTargetsFromEntries([entry({ chatId: '' })])).toEqual([]);
  });

  it('sorts targets by most recent activity first', () => {
    const targets = requestTargetsFromEntries([
      entry({ counterpartyId: 'u_old', counterpartyName: 'Old', chatId: 'c1', updatedAt: 100 }),
      entry({ counterpartyId: 'u_new', counterpartyName: 'New', chatId: 'c2', updatedAt: 900 }),
    ]);
    expect(targets.map((t) => t.recipient.id)).toEqual(['u_new', 'u_old']);
  });
});
