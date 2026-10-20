/**
 * useLiveNotifications — the single live reader for the in-app center.
 * =====================================================================
 * Subscribes to the real Firestore path `notifications/{uid}/items` (the
 * path NotificationCenter.emit writes to) and exposes the items plus the
 * actions the header bell and the center UI need.
 *
 * - Signed out (no uid) → empty list, never fake data.
 * - Read failures (rules, offline) → empty list, never fake data.
 * - "Clear" never deletes: the rules deny deletes on items, so clearing
 *   marks everything read (the badge empties; history stays).
 * - QUEUED #43: stored duplicates of one logical notice (a watcher
 *   re-fired into the store — e.g. ~21 copies of one wallet-low bell)
 *   are collapsed at read time (uiTypes.collapseDuplicateItems), and
 *   the unread/critical counts are derived from THAT collapsed list —
 *   so the header badge always equals the unread in the list the
 *   devotee sees. Marking a collapsed row read marks its folded
 *   copies too, or the next snapshot would resurrect it.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { acknowledgeItem, markItemRead } from './delivery';
import {
  collapseDuplicateItems,
  collapseSiblingIds,
  type CenterGroup,
} from './uiTypes';
import type { NotificationItem } from './types';

export interface LiveNotifications {
  /** Signed-in uid, or null when signed out. */
  uid: string | null;
  /** Newest-first live items from notifications/{uid}/items. */
  items: NotificationItem[];
  unreadCount: number;
  /** Unread + unacknowledged CRITICAL items (the red badge). */
  criticalCount: number;
  markRead: (itemId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markGroupRead: (group: CenterGroup) => Promise<void>;
  /** Marks everything read (deletes are rules-denied). */
  clearRead: () => Promise<void>;
  acknowledge: (itemId: string) => Promise<void>;
}

function toItem(id: string, data: unknown): NotificationItem {
  return { ...(data as NotificationItem), id };
}

export function useLiveNotifications(): LiveNotifications {
  const { firebaseUser } = useAuthWorkspace();
  const uid = firebaseUser?.uid ?? null;
  const [rawItems, setRawItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!uid) {
      setRawItems([]);
      return undefined;
    }
    const q = query(
      collection(db, 'notifications', uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(80),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRawItems(snap.docs.map((d) => toItem(d.id, d.data())));
      },
      () => {
        // Read denied / offline: show nothing, never fake data.
        setRawItems([]);
      },
    );
    return () => unsub();
  }, [uid]);

  // The list every surface renders — stored duplicates folded (#43).
  const items = useMemo(() => collapseDuplicateItems(rawItems), [rawItems]);

  // Badge math derives from the SAME collapsed list — badge == list.
  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);
  const criticalCount = useMemo(
    () => items.filter((i) => i.priority === 'critical' && !i.read && !i.acknowledged).length,
    [items],
  );

  const markIdsRead = useMemo(
    () => async (ids: string[]) => {
      if (!uid || ids.length === 0) return;
      const batch = writeBatch(db);
      for (const id of ids.slice(0, 400)) {
        batch.update(doc(db, 'notifications', uid, 'items', id), {
          read: true,
          updatedAt: Date.now(),
        });
      }
      await batch.commit();
    },
    [uid],
  );

  const markRead = useMemo(
    () => async (itemId: string) => {
      if (!uid) return;
      // A collapsed row stands for every stored copy — mark them all,
      // or the unread copies resurrect the row on the next snapshot.
      const siblings = collapseSiblingIds(rawItems, itemId).filter(
        (id) => !rawItems.find((i) => i.id === id)?.read,
      );
      if (siblings.length === 0) return;
      if (siblings.length === 1) await markItemRead(uid, siblings[0]);
      else await markIdsRead(siblings);
    },
    [uid, rawItems, markIdsRead],
  );

  const markAllRead = useMemo(
    () => async () => {
      // Raw rows, not collapsed representatives — every stored copy.
      await markIdsRead(rawItems.filter((i) => !i.read).map((i) => i.id));
    },
    [rawItems, markIdsRead],
  );

  const markGroupRead = useMemo(
    () => async (group: CenterGroup) => {
      // Group items are collapsed representatives — expand each to its
      // stored copies before marking, same law as markRead.
      const ids = new Set<string>();
      for (const rep of group.items) {
        if (rep.read) continue;
        for (const id of collapseSiblingIds(rawItems, rep.id)) ids.add(id);
      }
      await markIdsRead(
        [...ids].filter((id) => !rawItems.find((i) => i.id === id)?.read),
      );
    },
    [rawItems, markIdsRead],
  );

  // Deletes are denied by the rules — clearing the tray means everything
  // is read. The badge empties; the history stays.
  const clearRead = markAllRead;

  const acknowledge = useMemo(
    () => async (itemId: string) => {
      if (uid) await acknowledgeItem(uid, itemId);
    },
    [uid],
  );

  return {
    uid,
    items,
    unreadCount,
    criticalCount,
    markRead,
    markAllRead,
    markGroupRead,
    clearRead,
    acknowledge,
  };
}
