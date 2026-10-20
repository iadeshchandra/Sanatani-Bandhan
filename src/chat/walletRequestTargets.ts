/**
 * chat/walletRequestTargets.ts — who can a wallet-born request go to?
 * ====================================================================
 * Discoverability fix (audit 2026-10-20, offense #9): the ONLY door to
 * create a money request was an icon-only 🙏 button inside a chat
 * thread. The Personal Wallet could act on requests but never start
 * one.
 *
 * A wallet-born request reuses the EXISTING conversation with that
 * counterparty: every ledger entry carries its chatId, so the new
 * request card lands in the same thread the relationship already lives
 * in — identical to composing from chat. Pure + jest-safe.
 */
import type { LedgerEntry } from '../lib/p2pLedger';
import type { RequestRecipient } from './RequestModal';

export interface WalletRequestTarget {
  /** Stable key: `user:<uid>` or `org:<orgId>`. */
  key: string;
  /** Ready to hand to RequestModal. */
  recipient: RequestRecipient;
  /** The existing thread this counterparty's requests live in. */
  chatId: string;
  /** Most recent ledger activity with this counterparty (epoch ms). */
  lastActivityAt: number;
}

/**
 * One target per counterparty, most-recent first. When a counterparty
 * has several entries, the newest entry's chatId wins (all entries for
 * one counterparty share a thread in practice — deterministic ids).
 */
export function requestTargetsFromEntries(
  entries: LedgerEntry[],
): WalletRequestTarget[] {
  const byKey = new Map<string, WalletRequestTarget>();
  for (const e of entries) {
    if (!e.chatId) continue;
    const isOrg = e.orgCounterparty && !!e.orgId;
    const key = isOrg ? `org:${e.orgId}` : `user:${e.counterpartyId}`;
    const prev = byKey.get(key);
    if (prev && prev.lastActivityAt >= e.updatedAt) continue;
    const recipient: RequestRecipient = isOrg
      ? {
          id: e.orgId as string,
          name: e.orgName ?? e.counterpartyName,
          orgId: e.orgId,
          orgName: e.orgName ?? e.counterpartyName,
        }
      : {
          id: e.counterpartyId,
          name: e.counterpartyName,
          photoUrl: e.counterpartyPhotoUrl,
        };
    byKey.set(key, { key, recipient, chatId: e.chatId, lastActivityAt: e.updatedAt });
  }
  return [...byKey.values()].sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}
