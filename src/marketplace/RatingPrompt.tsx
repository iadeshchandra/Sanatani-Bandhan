/**
 * marketplace/RatingPrompt.tsx — Blessings after seva (Step 7).
 * =============================================================
 * After a devotee confirms a seva as complete, they are gently invited to
 * share blessings: 1–5 with an optional written message.
 *
 * Kritagyata framing, not e-commerce stars: "How was your experience? 🙏"
 * The numeric rating feeds GigCard/GigDetail trust display; the written
 * message may also become a gratitude post (via the existing Kritagyata
 * flow — this prompt does NOT duplicate it).
 *
 * Optional and dismissible — blessings can never feel obligatory.
 */
import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { submitGigRating, type MarketplaceOrder } from '../lib/marketplace';
import { friendlyErrorText } from '../lib/friendlyError';

type L = 'en' | 'bn' | 'hi';

const COPY: Record<string, { en: string; bn: string; hi: string }> = {
  title: { en: 'How was your experience? 🙏', bn: 'আপনার অভিজ্ঞতা কেমন ছিল? 🙏', hi: 'आपका अनुभव कैसा रहा? 🙏' },
  subtitle: { en: 'Your blessings guide other families to trusted sevaks.', bn: 'আপনার আশীর্বাদ অন্য পরিবারগুলোকে বিশ্বস্ত সেবকের কাছে পৌঁছে দেয়।', hi: 'आपका आशीर्वाद अन्य परिवारों को विश्वसनीय सेवकों तक पहुँचाता है।' },
  messagePh: { en: 'Share a few words of gratitude (optional)…', bn: 'কৃতজ্ঞতার কয়েকটি কথা লিখুন (ঐচ্ছিক)…', hi: 'कृतज्ञता के कुछ शब्द लिखें (वैकल्पिक)…' },
  share: { en: 'Share blessings', bn: 'আশীর্বাদ জানান', hi: 'आशीर्वाद साझा करें' },
  skip: { en: 'Maybe later', bn: 'পরে', hi: 'बाद में' },
  shared: { en: 'Dhanyavaad! Your blessings were shared. 🙏', bn: 'ধন্যবাদ! আপনার আশীর্বাদ পৌঁছে গেছে। 🙏', hi: 'धन्यवाद! आपका आशीर्वाद साझा हो गया। 🙏' },
};

interface Props {
  order: MarketplaceOrder;
  onDone: () => void;
}

export const RatingPrompt: React.FC<Props> = ({ order, onDone }) => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const lang = (currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en') as L;
  const t = (k: keyof typeof COPY) => COPY[k][lang];

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy || rating < 1) return;
    setBusy(true);
    try {
      await submitGigRating(order.id as string, rating, review);
      showToast(t('shared'), 'success');
      onDone();
    } catch (e: any) {
      console.error(e);
      showToast(friendlyErrorText(e, currentLang, 'save'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={onDone} role="dialog" aria-modal="true">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-black text-stone-900">{t('title')}</h3>
          <button type="button" onClick={onDone} className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center rounded-xl hover:bg-stone-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-4">{t('subtitle')}</p>

        {/* Blessing selector — 5 warm stars */}
        <div className="flex justify-center gap-1 mb-4" role="radiogroup" aria-label={t('title')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} / 5`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl hover:bg-amber-50"
            >
              <Star
                className={`w-8 h-8 transition-colors ${(hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value.slice(0, 500))}
          placeholder={t('messagePh')}
          rows={3}
          className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 min-h-[44px] text-sm outline-none focus:ring-2 focus:ring-amber-500 mb-3"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600 flex-1"
          >
            {t('skip')}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={busy || rating < 1}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40 flex-[2]"
          >
            {t('share')}
          </button>
        </div>
      </div>
    </div>
  );
};
