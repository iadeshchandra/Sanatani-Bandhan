/**
 * SanghaInbox.tsx — the two inbox sections of the Suchana Center.
 * =====================================================================
 * Proposal A (unified notifications): "🪔 From your sangha" and
 * "🛡️ Notes from the team" were sections 2 and 3 of the long Suchana tab
 * page — effectively invisible. They now live in the 🔔 Suchana Center
 * (header bell) as their single home. This file is the ONE definition of
 * both sections; the Suchana tab keeps only guidance.
 *
 * Vocabulary law: never "Notifications" user-visibly — "From your
 * sangha" and "Notes from the team", always.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from './ui';
import { useNotifications } from '../context/NotificationContext';
import { useModerationInbox } from '../notifications/useModerationInbox';
import { orderSanghaItems } from './sanghaInboxPure';

export { orderSanghaItems };

interface SanghaInboxSectionProps {
  /** Max items shown. The center shows more than the tab ever did. */
  limit?: number;
  /** Called after an item's deep-link navigation (the center closes). */
  onAfterNavigate?: () => void;
}

export const SanghaInboxSection: React.FC<SanghaInboxSectionProps> = ({ limit = 30, onAfterNavigate }) => {
  const navigate = useNavigate();
  const { notifications: items, markAsRead, markAllAsRead } = useNotifications();
  const visible = orderSanghaItems(items, limit);
  const unreadCount = items.filter((n) => !n.isRead).length;

  if (visible.length === 0) return null;

  const openItem = (id: string, link?: string) => {
    void markAsRead(id);
    if (link) {
      try {
        navigate(link);
      } catch {
        /* dead link — the item is still marked read */
      }
    }
    onAfterNavigate?.();
  };

  return (
    <section aria-label="From your sangha">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
          <span aria-hidden>🪔</span>
          <T en="From your sangha" bn="আপনার সঙ্গ থেকে" hi="आपके संघ से" />
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 min-h-[44px] px-2"
          >
            <T en="Mark all read" bn="সব পড়া হয়েছে" hi="सभी पढ़ा हुआ" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visible.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openItem(n.id, n.link)}
            className={`w-full text-left rounded-2xl border p-3.5 transition-colors min-h-[44px] ${
              n.isRead
                ? 'bg-white border-stone-200 opacity-75'
                : 'bg-amber-50 border-amber-300 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              {!n.isRead && (
                <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-600 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.isRead ? 'font-semibold text-stone-600' : 'font-bold text-stone-900'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                {(n.groupedCount ?? 1) > 1 && (
                  <p className="text-[11px] font-semibold text-stone-400 mt-1">
                    <T
                      en={`Rang ${n.groupedCount} times — shown once, so your Suchana stays calm.`}
                      bn={`${n.groupedCount} বার এসেছে — একবারই দেখানো হলো, যাতে সূচনা শান্ত থাকে।`}
                      hi={`${n.groupedCount} बार आया — एक बार ही दिखाया, ताकि सूचना शांत रहे।`}
                    />
                  </p>
                )}
              </div>
              {n.link && (
                <span className="text-amber-600 text-lg shrink-0" aria-hidden>→</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

interface TeamNotesSectionProps {
  limit?: number;
}

export const TeamNotesSection: React.FC<TeamNotesSectionProps> = ({ limit = 10 }) => {
  const { notes, unreadCount, markNoteRead } = useModerationInbox();
  const visible = notes.slice(0, Math.max(0, limit));

  if (visible.length === 0) return null;

  return (
    <section aria-label="Notes from the team" className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
          <span aria-hidden>🛡️</span>
          <T en="Notes from the team" bn="টিমের বার্তা" hi="टीम के संदेश" />
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h2>
      </div>
      <div className="space-y-2">
        {visible.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => void markNoteRead(n.id)}
            className={`w-full text-left rounded-2xl border p-3.5 transition-colors min-h-[44px] ${
              n.read
                ? 'bg-white border-stone-200 opacity-75'
                : 'bg-amber-50 border-amber-300 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              {!n.read && (
                <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-600 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? 'font-semibold text-stone-600' : 'font-bold text-stone-900'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-3">{n.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
