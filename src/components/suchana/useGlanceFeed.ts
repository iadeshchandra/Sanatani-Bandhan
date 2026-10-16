/**
 * useGlanceFeed.ts — Unified "what needs me" feed for the Suchana tab.
 * =====================================================================
 * Merges:
 *   1. Personal Suchana items (Panjika + module intelligence, role 'solo')
 *   2. Per-org glance cards, RBAC-filtered by the viewer's role in EACH org
 *
 * RBAC is enforced in orgGlance.glanceForRole BEFORE cards are built —
 * this hook never sees (and never renders) sections the role may not see.
 * Every Firestore read is fail-open; offline serves the localStorage cache.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useMembership } from '../../context/MembershipContext';
import { useSuchana } from './useSuchana';
import { useChatSuchana } from './useChatSuchana';
import {
  glanceForRole,
  fromGlanceDoc,
  type OrgGlanceSummary,
} from '../../lib/orgGlance';
import {
  mergeGlanceFeed,
  orgGlanceToCards,
  personalToGlance,
  type GlanceItem,
  type IntentKey,
} from '../../lib/glanceFeed';
import { loadIntentProfile } from '../../lib/intentProfile';
import { readGlanceCache, writeGlanceCache } from '../../lib/glanceCache';

export interface GlanceFeedData {
  items: GlanceItem[];
  loading: boolean;
  /** True when serving the offline cache. */
  offline: boolean;
  /** ms timestamp of the data (for "Updated X ago"). */
  updatedAt: number;
  /** Org ids the viewer belongs to (for filter chips). */
  orgs: Array<{ id: string; name: string }>;
  counts: { personal: number; org: number };
  refresh: () => void;
}

async function fetchOrgGlance(workspaceId: string): Promise<OrgGlanceSummary | null> {
  try {
    const snap = await getDoc(doc(db, 'orgGlance', workspaceId));
    if (!snap.exists()) return null;
    return fromGlanceDoc(snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function useGlanceFeed(): GlanceFeedData {
  const { firebaseUser, workspaces } = useAuthWorkspace();
  const { myMemberships } = useMembership();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';

  // Personal stream — existing engine, role 'solo', 30-day horizon.
  const personal = useSuchana('solo', 30);

  // Chat & P2P money intelligence — pending requests, settlement
  // reminders, netting nudges, blessing suggestions (fail-open).
  const chatItems = useChatSuchana(uid);

  const [intent, setIntent] = useState<IntentKey>('unknown');
  const [orgCards, setOrgCards] = useState<GlanceItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Intent profile drives prioritization.
  useEffect(() => {
    let live = true;
    loadIntentProfile(uid).then((p) => {
      if (live && p) setIntent(p.intent);
    });
    return () => {
      live = false;
    };
  }, [uid]);

  // Org stream — memberships → glance docs → RBAC-filtered cards.
  useEffect(() => {
    let live = true;
    setOrgLoading(true);
    (async () => {
      try {
        const memberships = (myMemberships || []).filter(
          (m) => m && m.workspaceId && !String(m.workspaceId).startsWith('DEMO_')
        );
        if (memberships.length === 0) {
          if (live) {
            setOrgCards([]);
            setOrgLoading(false);
          }
          return;
        }
        const wsById = new Map((workspaces || []).map((w) => [w.id, w]));
        const cards: GlanceItem[] = [];
        await Promise.all(
          memberships.map(async (m) => {
            try {
              const summary = await fetchOrgGlance(m.workspaceId);
              if (!summary) return;
              // RBAC ENFORCEMENT: only the section this role may see.
              const visible = glanceForRole(summary, m.role);
              const ws = wsById.get(m.workspaceId);
              const orgName = summary.orgName || ws?.name || m.workspaceId;
              const isSteward =
                visible.steward !== null && visible.steward !== undefined;
              if (visible.steward) {
                cards.push(
                  ...orgGlanceToCards({
                    orgId: m.workspaceId,
                    orgName,
                    orgType: summary.orgType,
                    section: visible.steward,
                    audience: 'steward',
                  })
                );
              }
              cards.push(
                ...orgGlanceToCards({
                  orgId: m.workspaceId,
                  orgName,
                  orgType: summary.orgType,
                  section: visible.member,
                  audience: isSteward ? 'steward' : 'member',
                })
              );
            } catch {
              /* one bad org never kills the feed */
            }
          })
        );
        if (live) {
          setOrgCards(cards);
          setOrgLoading(false);
          setUpdatedAt(Date.now());
        }
      } catch {
        if (live) setOrgLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [myMemberships, workspaces, refreshKey]);

  const items = useMemo(() => {
    try {
      const personalItems = [...(personal.items || []), ...chatItems].map((it) =>
        personalToGlance(it, intent)
      );
      const merged = mergeGlanceFeed(personalItems, orgCards);
      if (merged.length > 0 && uid !== 'anon') {
        writeGlanceCache(uid, merged);
        setOffline(false);
      }
      return merged;
    } catch {
      return [];
    }
  }, [personal.items, chatItems, orgCards, intent, uid]);

  // Offline fallback: serve the cache when the live feed is empty.
  const effective = useMemo(() => {
    if (items.length > 0) return { items, offline: false, updatedAt };
    if (uid === 'anon') return { items: [], offline: false, updatedAt };
    const cached = readGlanceCache(uid);
    if (cached && cached.items.length > 0) {
      return { items: cached.items, offline: true, updatedAt: cached.updatedAt };
    }
    return { items: [], offline: false, updatedAt };
  }, [items, uid, updatedAt]);

  useEffect(() => {
    if (effective.offline) setOffline(true);
  }, [effective.offline]);

  const orgs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of myMemberships || []) {
      if (!m?.workspaceId || String(m.workspaceId).startsWith('DEMO_')) continue;
      if (!seen.has(m.workspaceId)) {
        const ws = (workspaces || []).find((w) => w.id === m.workspaceId);
        seen.set(m.workspaceId, ws?.name || m.workspaceId);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [myMemberships, workspaces]);

  return {
    items: effective.items,
    loading: personal.loading || orgLoading,
    offline: effective.offline,
    updatedAt: effective.updatedAt,
    orgs,
    counts: {
      personal: (personal.items || []).length,
      org: orgCards.length,
    },
    refresh,
  };
}
