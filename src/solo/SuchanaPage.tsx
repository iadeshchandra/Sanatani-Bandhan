import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlanceFeed } from '../components/suchana/GlanceFeed';
import { useGlanceFeed } from '../components/suchana/useGlanceFeed';
import { T } from './ui';
import { SOLO_TAB_IDS, SoloTabId } from './HomeTab';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import { NotificationSettings } from '../notifications/NotificationSettings';
import { DEFAULT_PREFS, mergePrefs, type NotificationPrefs } from '../notifications/preferences';
import { readPrefsDoc, writePrefsDoc } from '../notifications/delivery';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useNotifications } from '../context/NotificationContext';
import { useModerationInbox } from '../notifications/useModerationInbox';

/* SuchanaPage — the full-page Suchana tab at /app/suchana.
 * =====================================================================
 * Phase 3: the unified "what needs me" feed — personal Suchana merged
 * with per-org glance cards, RBAC-filtered by the viewer's role in each
 * org. Action taps deep-link into Home sub-tabs or org spaces.
 */
export const SuchanaPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, orgs, loading, offline, updatedAt, counts } = useGlanceFeed();
  // Quick Guide: the calm Suchana alternative — invitational only.
  const suchanaGuide = useGuide('suchana');
  const { firebaseUser } = useAuthWorkspace();
  const prefsUid = ((firebaseUser as { uid?: string } | null)?.uid || '') as string;
  // AUDIT FIX #5: the notification inbox for the solo shell. The bell/badge
  // counts these items (via NotificationContext) — previously there was no
  // surface to read them. "From your sangha" — warm, never "Notifications".
  const { notifications: sanghaItems, markAsRead, markAllAsRead } = useNotifications();
  const unreadSangha = sanghaItems.filter((n) => !n.isRead);
  // Show unread first, then recent read — max 10, no duplication with the
  // glance feed above (that feed is panjika/intelligence; this is people).
  const visibleSangha = [
    ...unreadSangha,
    ...sanghaItems.filter((n) => n.isRead),
  ].slice(0, 10);

  const openSanghaItem = (id: string, link?: string) => {
    void markAsRead(id);
    if (link) {
      try {
        navigate(link);
      } catch {
        /* dead link — the item is still marked read */
      }
    }
  };

  // AUDIT FIX #9: "Notes from the team" — owner→user messages (moderation
  // warnings, report thanks). The `messages` collection was the designed
  // channel but nothing ever read it. Warm cards, mark-read on tap.
  const { notes: teamNotes, unreadCount: unreadTeam, markNoteRead } = useModerationInbox();

  // ⚙️ — notification prefs at the point of experience. The SAME sheet
  // component Profile's "🔔 Notifications" row opens: one component,
  // two doors, zero duplication.
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => ({
    ...DEFAULT_PREFS,
    quietHours: { ...DEFAULT_PREFS.quietHours },
  }));
  const openNotifSettings = async () => {
    if (prefsUid) {
      try {
        const stored = await readPrefsDoc(prefsUid);
        setPrefs(mergePrefs(stored as Partial<NotificationPrefs> | undefined));
      } catch {
        /* offline — keep defaults */
      }
    }
    setNotifOpen(true);
  };
  const onPrefsChange = (next: NotificationPrefs) => {
    setPrefs(next);
    if (prefsUid) {
      writePrefsDoc(prefsUid, next as unknown as Record<string, unknown>).catch(() => {
        /* offline — the engine reads the stored doc when it can */
      });
    }
  };

  const onAction = (route: string) => {
    try {
      if (route.startsWith('/app/org/')) {
        navigate(route);
        return;
      }
      const id = route as SoloTabId;
      navigate(
        (SOLO_TAB_IDS as readonly string[]).includes(id) ? `/app/home/${id}` : '/app/home/panjika'
      );
    } catch {
      navigate('/app/home/panjika');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <div className="text-center mb-5 relative">
        <button
          type="button"
          onClick={openNotifSettings}
          aria-label="Notification settings"
          className="absolute right-0 top-0 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-500 hover:text-amber-700 flex items-center justify-center text-xl transition-colors"
        >
          ⚙️
        </button>
        <div className="text-4xl" aria-hidden>
          🪔
        </div>
        <h1 className="text-xl font-black text-stone-900 mt-2">
          <T en="Suchana" bn="সূচনা" hi="सूचना" />
        </h1>
        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
          <T
            en="What needs you — your practice and your organisations, in one calm stream."
            bn="আপনার কী প্রয়োজন — আপনার সাধনা ও সংগঠন, এক শান্ত ধারায়।"
            hi="आपको क्या चाहिए — आपकी साधना व संगठन, एक शांत धारा में।"
          />
        </p>
        {counts.org > 0 && (
          <p className="text-[11px] text-stone-400 mt-1">
            <T
              en={`${counts.personal} personal · ${counts.org} from your organisations`}
              bn={`${counts.personal} ব্যক্তিগত · ${counts.org} আপনার সংগঠন থেকে`}
              hi={`${counts.personal} व्यक्तिगत · ${counts.org} आपके संगठनों से`}
            />
          </p>
        )}
      </div>
      <div data-guide-anchor="suchana-feed">
        <GlanceFeed
          items={items}
          orgs={orgs}
          loading={loading}
          offline={offline}
          updatedAt={updatedAt}
          onAction={onAction}
        />
      </div>

      {/* 🛡️ Notes from the team — owner→user messages (moderation warnings,
          report thanks). AUDIT FIX #9: the `messages` collection was the
          designed channel but nothing ever surfaced it. Warm, dignified. */}
      {teamNotes.length > 0 && (
        <section aria-label="Notes from the team" className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span aria-hidden>🛡️</span>
              <T
                en="Notes from the team"
                bn="টিমের বার্তা"
                hi="टीम के संदेश"
              />
              {unreadTeam > 0 && (
                <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {unreadTeam}
                </span>
              )}
            </h2>
          </div>
          <div className="space-y-2">
            {teamNotes.slice(0, 5).map((n) => (
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
      )}

      {/* 🪔 From your sangha — the notification inbox for the solo shell.
          AUDIT FIX #5: the Suchana tab badge counts these; previously there
          was no surface to read them (emit-only). Warm cards, tappable →
          deep-link, mark-read on tap. */}
      {visibleSangha.length > 0 && (
        <section aria-label="From your sangha" className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <span aria-hidden>🪔</span>
              <T
                en="From your sangha"
                bn="আপনার সঙ্গ থেকে"
                hi="आपके संघ से"
              />
              {unreadSangha.length > 0 && (
                <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {unreadSangha.length}
                </span>
              )}
            </h2>
            {unreadSangha.length > 0 && (
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
            {visibleSangha.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openSanghaItem(n.id, n.link)}
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
                  </div>
                  {n.link && (
                    <span className="text-amber-600 text-lg shrink-0" aria-hidden>→</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="text-center mt-4">
        <TourLink guide={GUIDES.suchana} onRestart={suchanaGuide.restart} />
      </div>
      {notifOpen && (
        <NotificationSettings
          prefs={prefs}
          onChange={onPrefsChange}
          onClose={() => setNotifOpen(false)}
        />
      )}
      {/* Quick Guide: the calm alternative — invitational only. */}
      {suchanaGuide.pillVisible && (
        <TourPill guide={GUIDES.suchana} onStart={suchanaGuide.start} onDismiss={suchanaGuide.dismissPill} />
      )}
      {suchanaGuide.tourActive && <CoachMark guide={GUIDES.suchana} onFinish={suchanaGuide.finish} />}
    </div>
  );
};
