import React, { useMemo, useState } from 'react';
import { useSangam, type AuthorInfo } from './sangamStore';
import { Card, Btn, AuthorLine, EmptyState, useLocaleText, T } from './ui';

/* Seva Board — organisations post seva opportunities; members volunteer.
 * =====================================================================
 * Hours volunteered accrue to the volunteer's Sanatani ID as seva karma
 * — an honest record of service, shown on their own profile only.
 * This board surfaces seva-kind posts from the feed with slot tracking.
 */

export const SevaBoardTab: React.FC<{ author: AuthorInfo }> = ({ author }) => {
  const { posts, volunteerSeva } = useSangam();
  const { tr } = useLocaleText();
  const [showMine, setShowMine] = useState(false);

  const sevaPosts = useMemo(
    () => posts.filter((p) => p.kind === 'seva' && p.status !== 'removed').sort((a, b) => b.createdAt - a.createdAt),
    [posts]
  );

  const myHours = useMemo(() => {
    let h = 0;
    for (const p of posts) {
      if (p.kind === 'seva' && (p.volunteers || []).includes(author.uid) && p.seva) h += p.seva.hoursEach;
    }
    return h;
  }, [posts, author.uid]);

  const visible = showMine ? sevaPosts.filter((p) => (p.volunteers || []).includes(author.uid)) : sevaPosts;

  return (
    <div className="space-y-4">
      <Card className="!bg-gradient-to-r !from-emerald-700 !to-teal-800 !border-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white font-extrabold text-lg">🤲 <T en="Community Board" bn="কমিউনিটি বোর্ড" hi="सामुदायिक बोर्ड" /></div>
            <div className="text-emerald-100 text-xs mt-0.5">
              {tr('Your seva karma', 'আপনার সেবা কর্ম', 'आपका सेवा कर्म')}: <span className="font-black text-white">{myHours}h</span>
              <span className="opacity-80"> · {tr('recorded to your Sanatani ID', 'আপনার সনাতনী আইডিতে', 'आपकी सनातनी ID पर')}</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-emerald-100 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)} className="w-5 h-5 accent-emerald-300" />
            {tr('My seva', 'আমার সেবা', 'मेरी सेवा')}
          </label>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="🤲"
            title={<T en={showMine ? 'No seva yet — your hands are needed' : 'No open seva right now'} bn="এখন কোনো সেবা নেই" hi="अभी कोई सेवा नहीं" />}
            body={tr('Seva appeals from the community appear here. Post one from the Feed tab.', 'সেবার আবেদন এখানে আসে।', 'सेवा निवेदन यहाँ आते हैं।')}
          />
        </Card>
      ) : (
        visible.map((p) => {
          const volunteered = (p.volunteers || []).includes(author.uid);
          const full = p.seva ? (p.volunteers || []).length >= p.seva.slots : false;
          return (
            <Card key={p.id}>
              <AuthorLine name={p.authorName} sanId={p.authorSanId} kind={p.authorKind} tier={p.authorTier} official={p.isOfficialPagePost} time={p.createdAt} uid={p.authorUid} />
              <p className="mt-2 text-[15px] text-stone-800 whitespace-pre-wrap">{p.text}</p>
              {p.seva && (
                <div className="mt-2 text-sm text-stone-600 bg-stone-50 rounded-xl px-3 py-2">
                  📍 {p.seva.venue} · 📅 {p.seva.date} · ⏱️ {p.seva.hoursEach}h · 👥 {p.seva.slotsTaken}/{p.seva.slots} {tr('volunteers', 'স্বেচ্ছাসেবক', 'स्वयंसेवक')}
                </div>
              )}
              <Btn
                variant={volunteered ? 'ghost' : 'primary'} className="w-full mt-3"
                disabled={volunteered || full}
                onClick={() => volunteerSeva(p.id, author.uid)}
              >
                {volunteered ? `✓ ${tr('You are volunteering', 'আপনি সেবা দিচ্ছেন', 'आप सेवा दे रहे हैं')}`
                  : full ? tr('Slots full', 'স্লট পূর্ণ', 'स्लॉट भरे')
                  : `🙏 ${tr('Volunteer', 'স্বেচ্ছাসেবক হোন', 'स्वयंसेवक बनें')}`}
              </Btn>
            </Card>
          );
        })
      )}
    </div>
  );
};
