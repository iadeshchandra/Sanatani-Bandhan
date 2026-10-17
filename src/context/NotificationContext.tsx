/**
 * NotificationContext — thin live subscription, zero fake data.
 * ===============================================================
 * The old version shipped a hardcoded in-memory seed ("Welcome to
 * Sanatani Bandhan") that showed phantom notifications. This version
 * keeps the same consumer API but reads the REAL Firestore path
 * `notifications/{uid}/items` (what NotificationCenter.emit writes to)
 * via useLiveNotifications. Signed out or on read failure the list is
 * simply empty — the context can never show fake data.
 *
 * Legacy shapes are preserved so NotificationPanel and the desks that
 * call addNotification() keep working unchanged; under the hood they
 * now hit the real notification pipeline.
 */
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useLiveNotifications } from '../notifications/useLiveNotifications';
import { useNotifLang, pick } from '../notifications/NT';
import { emitNotify } from '../notifications/emit';
import type { NotifyPriority, TriText } from '../notifications/types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const PRIORITY_TO_TYPE: Record<NotifyPriority, AppNotification['type']> = {
  critical: 'error',
  important: 'warning',
  gentle: 'info',
  silent: 'info',
};

const tri = (s: string): TriText => ({ en: s, bn: s, hi: s });

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const lang = useNotifLang();
  const live = useLiveNotifications();

  const notifications = useMemo<AppNotification[]>(
    () =>
      live.items.map((item) => ({
        id: item.id,
        title: pick(item.title, lang),
        message: pick(item.body, lang),
        timestamp: new Date(item.createdAt || Date.now()).toISOString(),
        isRead: item.read === true,
        type: PRIORITY_TO_TYPE[item.priority] ?? 'info',
        link: item.deepLink,
      })),
    [live.items, lang],
  );

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount: live.unreadCount,
      // Legacy in-memory adds now emit through the real pipeline, so the
      // bell, the center UI and the Suchana digest all see the same item.
      addNotification: (notification) => {
        if (!live.uid) return;
        const priority: NotifyPriority =
          notification.type === 'error' || notification.type === 'warning'
            ? 'important'
            : 'gentle';
        void emitNotify(live.uid, {
          kind: 'suchana',
          priority,
          title: tri(notification.title),
          body: tri(notification.message),
          dedupeKey: `legacy:${Date.now()}:${Math.random().toString(36).slice(2)}`,
          deepLink: notification.link,
        });
      },
      markAsRead: (id) => {
        void live.markRead(id).catch(() => undefined);
      },
      markAllAsRead: () => {
        void live.markAllRead().catch(() => undefined);
      },
      // Rules deny deletes on notification items — clearing the tray
      // marks everything read instead of destroying history.
      clearAll: () => {
        void live.clearRead().catch(() => undefined);
      },
    }),
    [notifications, live],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
