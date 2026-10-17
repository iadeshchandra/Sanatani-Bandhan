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
import type { CenterGroup } from './uiTypes';
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
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
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
        setItems(snap.docs.map((d) => toItem(d.id, d.data())));
      },
      () => {
        // Read denied / offline: show nothing, never fake data.
        setItems([]);
      },
    );
    return () => unsub();
  }, [uid]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);
  const criticalCount = useMemo(
    () => items.filter((i) => i.priority === 'critical' && !i.read && !i.acknowledged).length,
    [items],
  );

  const markRead = useMemo(
    () => async (itemId: string) => {
      if (uid) await markItemRead(uid, itemId);
    },
    [uid],
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

  const markAllRead = useMemo(
    () => async () => {
      await markIdsRead(items.filter((i) => !i.read).map((i) => i.id));
    },
    [items, markIdsRead],
  );

  const markGroupRead = useMemo(
    () => async (group: CenterGroup) => {
      await markIdsRead(group.items.filter((i) => !i.read).map((i) => i.id));
    },
    [markIdsRead],
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
