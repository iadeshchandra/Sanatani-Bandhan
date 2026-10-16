import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlanceFeed } from '../components/suchana/GlanceFeed';
import { useGlanceFeed } from '../components/suchana/useGlanceFeed';
import { T } from './ui';
import { SOLO_TAB_IDS, SoloTabId } from './HomeTab';

/* SuchanaPage — the full-page Suchana tab at /app/suchana.
 * =====================================================================
 * Phase 3: the unified "what needs me" feed — personal Suchana merged
 * with per-org glance cards, RBAC-filtered by the viewer's role in each
 * org. Action taps deep-link into Home sub-tabs or org spaces.
 */
export const SuchanaPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, orgs, loading, offline, updatedAt, counts } = useGlanceFeed();

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
      <div className="text-center mb-5">
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
      <GlanceFeed
        items={items}
        orgs={orgs}
        loading={loading}
        offline={offline}
        updatedAt={updatedAt}
        onAction={onAction}
      />
    </div>
  );
};
