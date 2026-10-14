import React, { useMemo } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, EmptyState, VerificationBadge, useLocaleText, T } from './ui';
import { DEMO_AUTHOR_SUFFIX } from './types';

/* Organisation Pages — discover and follow.
 * =====================================================================
 * Devotees discover organisations → follow → join → become members.
 * Organisations reach devotees → fill events, find volunteers.
 * The flywheel. Page posts are badged OFFICIAL; only trustees can
 * post as a page (gated in Firestore rules AND in the composer).
 */

export interface PageEntry {
  orgId: string;
  orgName: string;
  type: string;
  city?: string;
  about?: string;
}

/** Clearly-labeled preview pages — discovery works before any org joins. */
const SEED_PAGES: PageEntry[] = [
  { orgId: 'seed-org-1', orgName: `Kashi Vishwanath Mandir ${DEMO_AUTHOR_SUFFIX}`, type: 'Mandir', city: 'Kashi', about: 'Daily darshan updates, festival announcements, live aarti notices.' },
  { orgId: 'seed-org-2', orgName: `Ananda Ashram ${DEMO_AUTHOR_SUFFIX}`, type: 'Ashram', city: 'Rishikesh', about: 'Satsang schedules, guest stays, and seva opportunities.' },
  { orgId: 'seed-org-3', orgName: `Gau Seva Goshala ${DEMO_AUTHOR_SUFFIX}`, type: 'Goshala', city: 'Vrindavan', about: 'Nandi care updates and gau-seva appeals.' },
];

export const PagesTab: React.FC<{ author: AuthorInfo; extraPages?: PageEntry[] }> = ({ author, extraPages }) => {
  const { follows, followTarget, unfollowTarget, isFollowing } = useSangam();
  const { tr } = useLocaleText();

  const pages = useMemo(() => {
    const seen = new Set<string>();
    const all: PageEntry[] = [];
    for (const p of [...(extraPages || []), ...SEED_PAGES]) {
      if (!seen.has(p.orgId)) { seen.add(p.orgId); all.push(p); }
    }
    return all;
  }, [extraPages]);

  const myFollows = follows.filter((f) => f.targetType === 'org' && f.followerUid === author.uid);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Organisation Pages" bn="প্রতিষ্ঠান পৃষ্ঠা" hi="संस्था पृष्ठ" /></h2>
        <p className="text-xs text-stone-500 mt-0.5">
          {tr('Follow pages for official updates. Only trustees can post as a page — impersonation is structurally hard.', 'অফিসিয়াল আপডেটের জন্য অনুসরণ করুন।', 'आधिकारिक अपडेट हेतु अनुसरण करें।')}
        </p>
      </div>

      {myFollows.length > 0 && (
        <div>
          <div className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">
            {tr('Following', 'অনুসরণ করছেন', 'अनुसरण')} ({myFollows.length})
          </div>
          <div className="space-y-2">
            {myFollows.map((f) => {
              const page = pages.find((p) => p.orgId === f.targetId);
              return (
                <Card key={f.id} className="!p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-stone-800 truncate">{f.targetName}</span>
                        <VerificationBadge official size="sm" />
                      </div>
                      {page && <div className="text-[11px] text-stone-500">{page.type}{page.city ? ` · ${page.city}` : ''}</div>}
                    </div>
                    <Btn variant="ghost" onClick={() => unfollowTarget(f.id)} className="!px-3 shrink-0">{tr('Unfollow', 'আনফলো', 'अनफॉलो')}</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-xs font-black text-stone-500 uppercase tracking-widest">
        {tr('Discover', 'আবিষ্কার', 'खोजें')}
      </div>
      {pages.length === 0 ? (
        <Card><EmptyState icon="🏛️" title={<T en="No pages yet" bn="এখনও কোনো পৃষ্ঠা নেই" hi="अभी कोई पृष्ठ नहीं" />} body={tr('Organisation pages you join will appear here.', 'প্রতিষ্ঠান পৃষ্ঠা এখানে আসবে।', 'संस्था पृष्ठ यहाँ आएंगे।')} /></Card>
      ) : (
        pages.map((p) => {
          const following = isFollowing('org', p.orgId);
          if (myFollows.some((f) => f.targetId === p.orgId)) return null;
          return (
            <Card key={p.orgId}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shrink-0" aria-hidden>
                      {p.orgName.charAt(0)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-stone-800">{p.orgName}</span>
                        <VerificationBadge official size="sm" />
                      </div>
                      <div className="text-[11px] text-stone-500">{p.type}{p.city ? ` · ${p.city}` : ''}</div>
                    </div>
                  </div>
                  {p.about && <p className="text-sm text-stone-600 mt-2">{p.about}</p>}
                </div>
                <Btn variant={following ? 'ghost' : 'primary'} onClick={() => following ? undefined : followTarget(author.uid, 'org', p.orgId, p.orgName)} disabled={following} className="!px-3 shrink-0">
                  {following ? `✓ ${tr('Following', 'অনুসরণ', 'अनुसरण')}` : tr('Follow', 'অনুসরণ করুন', 'अनुसरण करें')}
                </Btn>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};
