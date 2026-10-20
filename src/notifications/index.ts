/**
 * notifications/index.ts — Phase 2 public surface + Phase 1 wiring.
 * ==================================================================
 * Components:
 *   NotificationBell       header bell (warm amber badge; red only for critical)
 *   NotificationCenterUI   full-screen center: grouped cards, filters, summary
 *   NotificationSettings   per-category calm controls
 *   DigestView             "Your morning Suchana" — calm reading
 *   FirstRunExplainer      one-screen tier explainer (show-once)
 *
 * Hooks:
 *   useNotificationCenter(uid) — subscribes to Phase 1's Firestore schema
 *     (`notifications/{uid}/items`, newest first), loads/saves prefs through
 *     Phase 1's readPrefsDoc/writePrefsDoc, and exposes mark-read /
 *     acknowledge / mark-all-read / clear-read (read items only) wired to
 *     Phase 1's markItemRead / acknowledgeItem.
 *
 * Phase 1 owns: engine, delivery, preferences, outbox, nudge engine.
 * Phase 2 owns: everything the devotee sees (this directory's *.tsx).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { markItemRead, acknowledgeItem, readPrefsDoc, writePrefsDoc } from './delivery';
import { DEFAULT_PREFS, mergePrefs, type NotificationPrefs } from './preferences';
import type { NotificationItem } from './types';
import {
  summarizeForHeader,
  groupCenterItems,
  collapseDuplicateItems,
  collapseSiblingIds,
} from './uiTypes';

export { NotificationBell } from './NotificationBell';
export { NotificationCenterUI } from './NotificationCenterUI';
export { NotificationSettings } from './NotificationSettings';
export { DigestView } from './DigestView';
export {
  FirstRunExplainer,
  shouldShowExplainer,
  markExplainerSeen,
  EXPLAINER_SEEN_KEY,
} from './FirstRunExplainer';
export { NT, ForcedLangProvider, useNotifLang, pick } from './NT';
export {
  groupCenterItems,
  summarizeForHeader,
  timeAgo,
  displayCategoryFor,
  FILTER_LABELS,
  collapseKeyFor,
  collapseDuplicateItems,
  collapseSiblingIds,
  mockCenterItems,
  mockDigestItems,
} from './uiTypes';
export type {
  CenterFilter,
  DisplayCategory,
  CenterGroup,
  CenterSummary,
  DigestItem,
} from './uiTypes';
export type { NotificationCenterProps } from './NotificationCenterUI';
export type { NotificationSettingsProps } from './NotificationSettings';
export type { NotificationBellProps } from './NotificationBell';
export type { DigestViewProps } from './DigestView';

/* ------------------------------------------------------------------ */
/* useNotificationCenter — Phase 1 wiring for Phase 2 UI              */
/* ------------------------------------------------------------------ */

export interface NotificationCenterHandle {
  items: NotificationItem[];
  loading: boolean;
  summary: ReturnType<typeof summarizeForHeader>;
  criticalUnread: NotificationItem[];
  prefs: NotificationPrefs;
  setPrefs: (next: NotificationPrefs) => Promise<void>;
  resetPrefs: () => Promise<void>;
  markRead: (itemId: string) => Promise<void>;
  markGroupRead: (itemIds: string[]) => Promise<void>;
  acknowledge: (itemId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Marks everything read. (Deletes are denied by the rules — the
   *  notification ledger is append-only — so "clearing" empties the
   *  unread tray instead of destroying history.) */
  clearRead: () => Promise<void>;
}

/**
 * Live center state for one devotee. Usage:
 *
 *   const center = useNotificationCenter(uid);
 *   {centerOpen && (
 *     <NotificationCenterUI
 *       items={center.items}
 *       onClose={close}
 *       onMarkRead={center.markRead}
 *       onMarkGroupRead={(g) => center.markGroupRead(g.items.map(i => i.id))}
 *       onMarkAllRead={center.markAllRead}
 *       onClearRead={center.clearRead}
 *       onAcknowledge={center.acknowledge}
 *       onOpenDeepLink={(item) => navigate(item.deepLink ?? '/')}
 *       onOpenSettings={openSettings}
 *     />
 *   )}
 */
export function useNotificationCenter(uid: string | null | undefined): NotificationCenterHandle {
  const [rawItems, setRawItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefsState] = useState<NotificationPrefs>({ ...DEFAULT_PREFS });

  /* Live items — newest first. */
  useEffect(() => {
    if (!uid) {
      setRawItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'notifications', uid, 'items'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRawItems(snap.docs.map((d) => d.data() as NotificationItem));
        setLoading(false);
      },
      () => setLoading(false) // calm: a denied read shows an empty center, never a crash
    );
    return unsub;
  }, [uid]);

  /* QUEUED #43 — the exposed list folds stored duplicates of one
   * logical notice into a single row, and every count in this handle
   * (the header badge, the summary) derives from that same list:
   * badge == list, on this shell exactly as on the solo shell. */
  const items = useMemo(() => collapseDuplicateItems(rawItems), [rawItems]);

  /* Prefs — loaded once, saved through Phase 1's owner-only doc. */
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    readPrefsDoc(uid)
      .then((raw) => {
        if (alive && raw) setPrefsState(mergePrefs(raw as Partial<NotificationPrefs>));
      })
      .catch(() => {
        /* calm: keep defaults */
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  const setPrefs = useCallback(
    async (next: NotificationPrefs) => {
      setPrefsState(next);
      if (uid) {
        try {
          await writePrefsDoc(uid, next as unknown as Record<string, unknown>);
        } catch {
          /* calm: local state already reflects the choice */
        }
      }
    },
    [uid]
  );

  const resetPrefs = useCallback(async () => {
    await setPrefs({ ...DEFAULT_PREFS, quietHours: { ...DEFAULT_PREFS.quietHours } });
  }, [setPrefs]);

  const markGroupRead = useCallback(
    async (itemIds: string[]) => {
      if (!uid || itemIds.length === 0) return;
      // QUEUED #43 — ids arriving from the UI are collapsed
      // representatives; expand each to every stored copy sharing its
      // logical-notice key, or the folded copies resurrect the row as
      // unread on the next snapshot. Raw ids expand to their own set,
      // so internal callers (markAllRead) are unaffected.
      const expanded = new Set<string>();
      for (const id of itemIds) {
        for (const sid of collapseSiblingIds(rawItems, id)) expanded.add(sid);
      }
      const unread = [...expanded].filter(
        (id) => !rawItems.find((i) => i.id === id)?.read,
      );
      if (unread.length === 0) return;
      try {
        const batch = writeBatch(db);
        for (const id of unread) {
          batch.update(doc(db, 'notifications', uid, 'items', id), { read: true });
        }
        await batch.commit();
      } catch {
        /* calm */
      }
    },
    [uid, rawItems]
  );

  const markRead = useCallback(
    async (itemId: string) => {
      if (!uid) return;
      try {
        const siblings = collapseSiblingIds(rawItems, itemId).filter(
          (id) => !rawItems.find((i) => i.id === id)?.read,
        );
        if (siblings.length === 0) return;
        if (siblings.length === 1) await markItemRead(uid, siblings[0]);
        else await markGroupRead(siblings);
      } catch {
        /* calm */
      }
    },
    [uid, rawItems, markGroupRead]
  );

  const acknowledge = useCallback(
    async (itemId: string) => {
      if (!uid) return;
      try {
        await acknowledgeItem(uid, itemId);
      } catch {
        /* calm */
      }
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((i) => !i.read).map((i) => i.id);
    await markGroupRead(unreadIds);
  }, [items, markGroupRead]);

  const clearRead = useCallback(async () => {
    if (!uid) return;
    // Rules deny deletes on notification items (append-only ledger), so
    // "clear" marks everything read instead — the badge empties and the
    // history stays. Never throws: a failed batch must not break the UI.
    try {
      await markAllRead();
    } catch {
      /* calm */
    }
  }, [uid, markAllRead]);

  const summary = useMemo(() => summarizeForHeader(items), [items]);
  const criticalUnread = useMemo(
    () => items.filter((i) => i.priority === 'critical' && !i.read && !i.acknowledged),
    [items]
  );

  return {
    items,
    loading,
    summary,
    criticalUnread,
    prefs,
    setPrefs,
    resetPrefs,
    markRead,
    markGroupRead,
    acknowledge,
    markAllRead,
    clearRead,
  };
}

/** Convenience: groups memoized for render. */
export function useCenterGroups(items: NotificationItem[]) {
  return useMemo(() => groupCenterItems(items), [items]);
}
