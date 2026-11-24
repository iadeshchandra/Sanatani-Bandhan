/**
 * useNotificationOrgs — the organisations a devotee can tune
 * (NOTIFICATION WAVE 2, DESIGN §5 per-org preferences).
 * =====================================================================
 * The per-org section lists every organisation the reader has a
 * delivery relationship with: the workspaces they belong to
 * (workspaceMembers edges — the name rides the edge) and the orgs
 * they follow (the A1 union: `user_follows/{uid}` orgIds ∪ the
 * org-side followers store; names resolved from the public
 * `orgPages/{id}` projection). Read-only and fail-soft — an empty
 * list simply hides the section.
 */
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { readFollows } from '../lib/follows';
import { fetchFollowedOrgs } from '../org/broadcastService';

export interface NotificationOrgOption {
  id: string;
  name: string;
}

async function orgPageName(orgId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'orgPages', orgId));
    const name = snap.exists() ? (snap.data() as { name?: unknown }).name : undefined;
    return typeof name === 'string' && name.trim() ? name : 'Organisation';
  } catch {
    return 'Organisation';
  }
}

export function useNotificationOrgs(uid: string | null | undefined): NotificationOrgOption[] {
  const [orgs, setOrgs] = useState<NotificationOrgOption[]>([]);
  useEffect(() => {
    if (!uid) {
      setOrgs([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const byId = new Map<string, string>();
      try {
        const snap = await getDocs(
          query(collection(db, 'workspaceMembers'), where('uid', '==', uid)),
        );
        snap.forEach((d) => {
          const m = d.data() as Record<string, unknown>;
          const ws = typeof m.workspaceId === 'string' ? m.workspaceId : '';
          if (!ws) return;
          byId.set(
            ws,
            typeof m.workspaceName === 'string' && m.workspaceName ? m.workspaceName : 'Organisation',
          );
        });
      } catch {
        /* fail-soft — the section just shows fewer orgs */
      }
      try {
        const followIds = new Set<string>();
        const state = await readFollows(uid);
        for (const id of state.orgIds) if (id) followIds.add(id);
        for (const f of await fetchFollowedOrgs(uid)) if (f.orgId) followIds.add(f.orgId);
        for (const id of followIds) {
          if (!byId.has(id)) byId.set(id, await orgPageName(id));
        }
      } catch {
        /* fail-soft */
      }
      if (!cancelled) {
        setOrgs(
          [...byId.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);
  return orgs;
}
