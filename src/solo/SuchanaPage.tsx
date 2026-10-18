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
