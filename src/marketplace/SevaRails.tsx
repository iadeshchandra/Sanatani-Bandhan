/* Seva Bazar — "🪔 Seva" discovery rails.
 * =====================================================================
 * The marketplace tab is NOT a store. It is discovery: occasion rails
 * ("Ekadashi · sevas your community booked") + category chips
 * (puja/jyotish/samskara). Tapping a rail item opens the seva notice
 * detail sheet or the gig booking — the rail never checks out.
 *
 * Discovery rails, never a product grid.
 */

import React, { useState } from 'react';
import { useSangam } from '../sangam/sangamStore';
import type { AuthorInfo } from '../sangam/sangamStore';
import { ServiceCardSheet } from '../sangam/ServiceCardSheet';
import { useServiceCardAsk } from '../sangam/useServiceCardAsk';
import { Chat } from '../chat/Chat';
import type { SangamPost } from '../sangam/types';
import { nextEkadashi } from '../lib/vrataSchedule';
import { T } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_CHIPS = [
  { id: 'all', en: 'All', bn: 'সব', hi: 'सभी' },
  { id: 'Puja', en: 'Puja', bn: 'পূজা', hi: 'पूजा' },
  { id: 'Havan', en: 'Havan', bn: 'হবন', hi: 'हवन' },
  { id: 'Katha', en: 'Katha', bn: 'কথা', hi: 'कथा' },
  { id: 'Samskara', en: 'Samskara', bn: 'সংস্কার', hi: 'संस्कार' },
  { id: 'Kundli', en: 'Jyotish', bn: 'জ্যোতিষ', hi: 'ज्योतिष' },
] as const;

interface Props {
  author: AuthorInfo;
  onCategory: (cat: string) => void;
  activeCategory: string;
}

export const SevaRails: React.FC<Props> = ({ author, onCategory, activeCategory }) => {
  const { currentLang } = useLanguage();
  const { posts } = useSangam();
  const [sheetPost, setSheetPost] = useState<SangamPost | null>(null);
  const { ask, chatId, chatOpen, closeChat } = useServiceCardAsk();
  const lang = currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';

  const notices = posts
    .filter((p) => p.kind === 'service_card' && p.status === 'active' && p.serviceCard)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  const ekadashi = nextEkadashi();
  const ekadashiLabel = ekadashi
    ? ekadashi.date.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : currentLang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : '';

  return (
    <div className="space-y-3">
      {/* Occasion rail — sevas your community booked, framed by the coming Ekadashi. */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-extrabold text-stone-900">
            <T
              en={`🪔 Ekadashi ${ekadashiLabel} · sevas your community booked`}
              bn={`🪔 একাদশী ${ekadashiLabel} · আপনার সম্প্রদায় যে সেবাগুলো বুক করেছে`}
              hi={`🪔 एकादशी ${ekadashiLabel} · आपके समुदाय ने जो सेवाएँ बुक कीं`}
            />
          </h3>
        </div>
        {notices.length === 0 ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
            <div className="text-2xl mb-1" aria-hidden>🪔</div>
            <p className="text-xs text-stone-600 font-semibold">
              <T
                en="No seva notices yet — verified providers share them here first."
                bn="এখনও কোনো সেবা বিজ্ঞপ্তি নেই — যাচাইকৃত প্রদানকারীরা এখানেই প্রথম শেয়ার করেন।"
                hi="अभी कोई सेवा सूचना नहीं — सत्यापित प्रदाता सबसे पहले यहीं साझा करते हैं।"
              />
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {notices.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSheetPost(p)}
                className="snap-start shrink-0 w-56 text-left rounded-2xl bg-white border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow min-h-[44px]"
              >
                {p.serviceCard?.photoUrl ? (
                  <img
                    src={p.serviceCard.photoUrl}
                    alt=""
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-4xl" aria-hidden>
                    🪔
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[13px] font-extrabold text-stone-900 leading-snug line-clamp-2">
                    {p.serviceCard?.serviceLine}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-1">
                    {p.serviceCard?.providerName}
                    {p.serviceCard?.providerTier !== 'REGISTERED' && (
                      <span className="ml-1 text-amber-700 font-bold">
                        {p.serviceCard?.providerTier === 'TRUSTED' ? '🌟' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category chips — puja / jyotish / samskara, not a filter dropdown. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Seva categories">
        {CATEGORY_CHIPS.map((c) => {
          const active = activeCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategory(c.id)}
              className={`shrink-0 px-4 min-h-[44px] rounded-full text-xs font-black transition-colors ${
                active
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400'
              }`}
            >
              <T en={c.en} bn={c.bn} hi={c.hi} />
            </button>
          );
        })}
      </div>

      {sheetPost?.serviceCard && (
        <ServiceCardSheet
          post={sheetPost}
          onClose={() => setSheetPost(null)}
          onAsk={() => {
            const card = sheetPost.serviceCard;
            setSheetPost(null);
            if (card) ask(card, { uid: author.uid, name: author.name }, lang);
          }}
          onRequest={() => {
            const card = sheetPost.serviceCard;
            setSheetPost(null);
            if (card) ask(card, { uid: author.uid, name: author.name }, lang);
          }}
        />
      )}
      {chatOpen && chatId && (
        <Chat
          uid={author.uid}
          selfInfo={{ uid: author.uid, displayName: author.name || 'Sanatani' }}
          initialChatId={chatId}
          onClose={closeChat}
        />
      )}
    </div>
  );
};
