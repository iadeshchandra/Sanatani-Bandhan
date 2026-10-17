/**
 * NotificationBell.tsx — the warm header bell for the notification center.
 * ========================================================================
 * "Blessings, not badges": the unread badge is warm amber, never alarming.
 * Deep red is reserved for CRITICAL items only (criticalCount > 0) — and
 * only then does the badge pulse gently, so an SOS is unmistakable.
 *
 * Drop-in replacement for the plain bell in Header.tsx:
 *   <NotificationBell unreadCount={unread} criticalCount={critical} onClick={openCenter} />
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { NT, useNotifLang, pick } from './NT';
import type { TriText } from './types';

export interface NotificationBellProps {
  /** Total unread (grouped count, like the center header shows). */
  unreadCount: number;
  /** Unread CRITICAL items (SOS). Red badge only when this is > 0. */
  criticalCount?: number;
  onClick: () => void;
  className?: string;
  label?: TriText;
}

const DEFAULT_LABEL: TriText = {
  en: 'Notifications',
  bn: 'বিজ্ঞপ্তি',
  hi: 'सूचनाएं',
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  criticalCount = 0,
  onClick,
  className = '',
  label = DEFAULT_LABEL,
}) => {
  const lang = useNotifLang();
  const isCritical = criticalCount > 0;
  const shown = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={pick(label, lang)}
      className={`relative w-11 h-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${className}`}
    >
      <Bell className="w-5 h-5" aria-hidden />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className={`absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-black flex items-center justify-center shadow-sm border-2 ${
            isCritical
              ? 'bg-red-600 text-white border-red-700 animate-pulse'
              : 'bg-amber-500 text-amber-950 border-amber-600/30'
          }`}
        >
          {shown}
        </span>
      )}
      {/* Screen-reader status, calmly worded */}
      <span className="sr-only">
        {unreadCount === 0 ? (
          <NT text={{ en: 'No unread notifications', bn: 'কোনো অপঠিত বিজ্ঞপ্তি নেই', hi: 'कोई अपठित सूचना नहीं' }} />
        ) : isCritical ? (
          <NT
            text={{
              en: `${unreadCount} unread notifications, including an urgent alert`,
              bn: `${unreadCount}টি অপঠিত বিজ্ঞপ্তি, যার মধ্যে জরুরি সতর্কতা রয়েছে`,
              hi: `${unreadCount} अपठित सूचनाएं, जिनमें एक आवश्यक चेतावनी है`,
            }}
          />
        ) : (
          <NT
            text={{
              en: `${unreadCount} unread notifications`,
              bn: `${unreadCount}টি অপঠিত বিজ্ঞপ্তি`,
              hi: `${unreadCount} अपठित सूचनाएं`,
            }}
          />
        )}
      </span>
    </button>
  );
};
