/**
 * marketplace/GigDetail.tsx — Full seva detail view (Step 7).
 * ============================================================
 * Tapping a GigCard opens this BEFORE booking. The gig.description
 * (up to 2000 chars, collected + searched but never displayed) finally
 * reaches devotees here, alongside blessings from other families.
 *
 * Warm, devotional framing: "🙏 N families shared gratitude" — the numeric
 * rating exists as trust infrastructure, but gratitude leads.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, Languages, ShieldCheck, ChevronLeft, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { mkt, type MktLang } from '../lib/marketplaceCopy';
import { getGigRatings, type Gig, type GigRating } from '../lib/marketplace';
import { formatMoney } from '../lib/money';

const CATEGORY_TILE: Record<string, string> = {
  Puja: '🪔', Havan: '🔥', Katha: '📖', Samskara: '🕉️', Vastu: '🏠',
  Kundli: '🔮', Horoscope: '✨', Remedy: '🌿', Consultation: '💬', Other: '🙏',
};

const COPY: Record<string, { en: string; bn: string; hi: string }> = {
  aboutSeva: { en: 'About this seva', bn: 'এই সেবা সম্পর্কে', hi: 'इस सेवा के बारे में' },
  blessings: { en: 'Blessings from families', bn: 'পরিবারগুলোর আশীর্বাদ', hi: 'परिवारों के आशीर्वाद' },
  familiesShared: { en: 'families shared gratitude', bn: 'পরিবার কৃতজ্ঞতা জানিয়েছে', hi: 'परिवारों ने कृतज्ञता जताई' },
  noBlessings: { en: 'Be the first to receive this seva and share your blessings 🙏', bn: 'প্রথম এই সেবা গ্রহণ করুন এবং আশীর্বাদ জানান 🙏', hi: 'पहले इस सेवा को प्राप्त करें और अपना आशीर्वाद साझा करें 🙏' },
  bookSeva: { en: '🙏 Request this seva', bn: '🙏 এই সেবার অনুরোধ করুন', hi: '🙏 इस सेवा का अनुरोध करें' },
  duration: { en: 'Duration', bn: 'সময়কাল', hi: 'अवधि' },
  minutes: { en: 'min', bn: 'মিনিট', hi: 'मिनट' },
  languages: { en: 'Languages', bn: 'ভাষা', hi: 'भाषाएँ' },
  category: { en: 'Category', bn: 'বিভাগ', hi: 'श्रेणी' },
  provider: { en: 'Seva provider', bn: 'সেবা প্রদানকারী', hi: 'सेवा प्रदाता' },
  viewProfile: { en: 'View profile', bn: 'প্রোফাইল দেখুন', hi: 'प्रोफ़ाइल देखें' },
  suggestedDakshina: { en: 'Suggested dakshina', bn: 'প্রস্তাবিত দক্ষিণা', hi: 'सुझाई गई दक्षिणा' },
  verified: { en: '✓ VERIFIED', bn: '✓ যাচাইকৃত', hi: '✓ सत्यापित' },
};

interface Props {
  gig: Gig;
  onBook: () => void;
  onBack: () => void;
}

export const GigDetail: React.FC<Props> = ({ gig, onBook, onBack }) => {
  const { currentLang } = useLanguage();
  const navigate = useNavigate();
  const L = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as MktLang;
  const t = (k: keyof typeof COPY) => COPY[k][L];
  // Provider profile door (audit 2026-10-20, offense #12): the provider's
  // name was dead text — devotees couldn't reach the trust profile
  // (gratitude wall, verification, other sevas) from the gig.
  const proPath = gig.providerUid ? `/seva/pro/${gig.providerUid}` : null;
  const openProfile = proPath ? () => navigate(proPath) : undefined;

  const [ratings, setRatings] = useState<GigRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await getGigRatings(gig.id as string);
        if (alive) setRatings(r);
      } catch {
        /* ratings are enhancement — the detail view stands without them */
      } finally {
        if (alive) setLoadingRatings(false);
      }
    })();
    return () => { alive = false; };
  }, [gig.id]);

  const avg = Number(gig.avgRating || 0);
  const count = Number((gig as any).ratingCount || ratings.length || 0);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onBack} role="dialog" aria-modal="true">
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-stone-100 px-4 py-3 flex items-center gap-2 rounded-t-3xl">
          <button type="button" onClick={onBack} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-stone-100" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-black text-stone-900 truncate">{gig.title}</p>
            <p className="text-[11px] text-stone-500 truncate">
              {openProfile ? (
                <button
                  type="button"
                  onClick={openProfile}
                  className="font-bold text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800"
                  aria-label={`${t('viewProfile')} — ${gig.providerName}`}
                >
                  {gig.providerName}
                </button>
              ) : (
                gig.providerName
              )}{' '}
              · {gig.category}
            </p>
          </div>
          <button type="button" onClick={onBack} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-stone-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Hero: category tile + price + trust */}
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 flex items-center justify-center text-4xl shrink-0" aria-hidden>
              {CATEGORY_TILE[gig.category] || '🙏'}
            </div>
            <div className="flex-1 min-w-0">
              {(gig as any).providerVerified && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-block mb-1">{t('verified')}</span>
              )}
              <p className="text-[11px] text-stone-500 font-bold">{t('suggestedDakshina')}</p>
              <p className="text-2xl font-black text-amber-700">{formatMoney(Number(gig.priceAmount), gig.priceCurrency)}</p>
              {avg > 0 && (
                <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="font-black text-amber-700">{avg.toFixed(1)}</span>
                  <span aria-hidden>·</span>
                  <span>🙏 {count} {t('familiesShared')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Facts */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-stone-50 rounded-xl p-2.5">
              <Clock className="w-4 h-4 mx-auto text-stone-400 mb-1" aria-hidden />
              <p className="text-[10px] text-stone-500 font-bold">{t('duration')}</p>
              <p className="text-xs font-black text-stone-800">{gig.durationMinutes} {t('minutes')}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-2.5">
              <Languages className="w-4 h-4 mx-auto text-stone-400 mb-1" aria-hidden />
              <p className="text-[10px] text-stone-500 font-bold">{t('languages')}</p>
              <p className="text-xs font-black text-stone-800 truncate">{(gig.languages || []).slice(0, 2).join(', ') || '—'}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-2.5">
              <ShieldCheck className="w-4 h-4 mx-auto text-stone-400 mb-1" aria-hidden />
              <p className="text-[10px] text-stone-500 font-bold">{t('provider')}</p>
              {openProfile ? (
                <button
                  type="button"
                  onClick={openProfile}
                  className="text-xs font-black text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800 w-full truncate"
                  aria-label={`${t('viewProfile')} — ${gig.providerName}`}
                >
                  {gig.providerType === 'purohit' ? '🪔' : '🔮'} {gig.providerName} →
                </button>
              ) : (
                <p className="text-xs font-black text-stone-800 truncate">{gig.providerType === 'purohit' ? '🪔' : '🔮'} {gig.providerName}</p>
              )}
            </div>
          </div>

          {/* Description — the 2000 chars devotees never saw */}
          {gig.description && (
            <div>
              <h3 className="text-sm font-black text-stone-900 mb-2">{t('aboutSeva')}</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{gig.description}</p>
            </div>
          )}

          {/* Blessings */}
          <div>
            <h3 className="text-sm font-black text-stone-900 mb-2">🙏 {t('blessings')}</h3>
            {loadingRatings ? (
              <p className="text-xs text-stone-400 py-4 text-center">…</p>
            ) : ratings.length === 0 ? (
              <p className="text-xs text-stone-500 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">{t('noBlessings')}</p>
            ) : (
              <div className="space-y-2">
                {ratings.map((r) => (
                  <div key={r.orderId} className="bg-stone-50 rounded-xl p-3">
                    <p className="text-xs font-black text-amber-700 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />
                      {r.rating}/5
                    </p>
                    {r.review && <p className="text-xs text-stone-700 mt-1 whitespace-pre-wrap">{r.review}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onBook}
            className="w-full min-h-[52px] rounded-2xl text-sm font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
          >
            {t('bookSeva')}
          </button>
          <p className="text-[10px] text-stone-400 text-center -mt-3">{mkt(L, 'seva')}: {gig.category}</p>
        </div>
      </div>
    </div>
  );
};
