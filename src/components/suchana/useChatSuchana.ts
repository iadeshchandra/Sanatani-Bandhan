/**
 * useChatSuchana.ts — Chat & P2P intelligence for the Suchana feed.
 * ==================================================================
 * Subscribes to the user's chat threads and money requests, builds a
 * ChatSnapshot (threads + requests + netting suggestions from
 * p2pLedger), runs generateChatInsights(), and returns SuchanaItems
 * via the suchanaFeed.ts contract (fromModuleInsight).
 *
 * Fail-open throughout: no uid, no data, or any error → []. The feed
 * never waits on this hook.
 */
import { useEffect, useState } from 'react';
import { subscribeThreads } from '../../chat/chatService';
import { subscribeUserRequests } from '../../chat/p2pService';
import { deriveWalletEntries, suggestNetting } from '../../lib/p2pLedger';
import {
  generateChatInsights,
  type ChatSnapshot,
  type OrgRequestCount,
} from '../../lib/chatIntelligence';
import { fromModuleInsight, type SuchanaItem } from '../../lib/suchanaFeed';
import type { ChatThread, MoneyRequest } from '../../chat/types';

/** Group org-sent requests from the last 30 days, per org. */
function orgRequestCountsThisMonth(requests: MoneyRequest[]): OrgRequestCount[] {
  try {
    const cutoff = Date.now() - 30 * 86400000;
    const byOrg = new Map<string, { orgName: string; count: number }>();
    for (const r of requests || []) {
      if (!r || !r.orgId) continue;
      if ((r.createdAt || 0) < cutoff) continue;
      const cur = byOrg.get(r.orgId) || {
        orgName: r.orgName || 'Your temple',
        count: 0,
      };
      cur.count += 1;
      if (r.orgName) cur.orgName = r.orgName;
      byOrg.set(r.orgId, cur);
    }
    return [...byOrg.entries()].map(([orgId, v]) => ({
      orgId,
      orgName: v.orgName,
      count: v.count,
    }));
  } catch {
    return [];
  }
}

function buildSnapshot(
  uid: string,
  threads: ChatThread[],
  requests: MoneyRequest[]
): ChatSnapshot {
  let netting: ChatSnapshot['netting'] = [];
  try {
    const entries = deriveWalletEntries(requests || [], uid);
    netting = suggestNetting(entries).map((n) => ({ id: n.id, text: n.text }));
  } catch {
    netting = [];
  }
  return {
    uid,
    threads: (threads || []).map((t) => ({
      id: t.id,
      type: t.type,
      lastMessageAt: t.lastMessageAt,
    })),
    requests: requests || [],
    netting,
    orgRequestCounts: orgRequestCountsThisMonth(requests),
  };
}

/**
 * Live chat/P2P Suchana items for `uid`. Returns [] for anon/empty/error.
 */
export function useChatSuchana(uid: string | null | undefined): SuchanaItem[] {
  const [items, setItems] = useState<SuchanaItem[]>([]);

  useEffect(() => {
    if (!uid || uid === 'anon') {
      setItems([]);
      return;
    }
    let live = true;
    let threads: ChatThread[] = [];
    let requests: MoneyRequest[] = [];

    const emit = () => {
      if (!live) return;
      try {
        const snap = buildSnapshot(uid, threads, requests);
        const insights = generateChatInsights('solo', snap);
        setItems(insights.map(fromModuleInsight));
      } catch {
        setItems([]);
      }
    };

    const unsubs: Array<() => void> = [];
    try {
      unsubs.push(
        subscribeThreads(uid, (t) => {
          threads = Array.isArray(t) ? t : [];
          emit();
        })
      );
    } catch {
      /* fail-open */
    }
    try {
      unsubs.push(
        subscribeUserRequests(uid, (r) => {
          requests = Array.isArray(r) ? r : [];
          emit();
        })
      );
    } catch {
      /* fail-open */
    }

    return () => {
      live = false;
      for (const u of unsubs) {
        try {
          u();
        } catch {
          /* ignore */
        }
      }
    };
  }, [uid]);

  return items;
}
