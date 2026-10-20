import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SangamPost } from './types';
import { T } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { sevaProTierLabel } from '../lib/sevaPro/tierMapping';
import { formatServiceDakshina } from './ServiceCardPost';
import { getProviderBlessings, type ProviderBlessings } from '../lib/marketplace';

/* Seva Bazar — service_card bottom-sheet detail view.
 * =====================================================================
 * Follows the existing sheet pattern (ui.tsx Modal): fixed inset-0
 * z-[130] backdrop, rounded-t-3xl panel, ≥44px close target.
 * Still a SEVA NOTICE — warm, dignified, no cheap signals.
 */

export interface ServiceCardSheetProps {
  post: SangamPost;
  onClose: () => void;
  /** Quiet secondary — opens the provider chat thread. */
  onAsk: (post: SangamPost) => void;
  /** Primary — request this seva. */
  onRequest: (post: SangamPost) => void;
}

const MODE_LABELS = {
  home: { en: 'At your home', hi: 'आपके घर पर', bn: 'আপনার বাড়িতে' },
  temple: { en: 'At the temple', hi: 'मंदिर में', bn: 'মন্দিরে' },
  video: { en: 'Video call', hi: 'वीडियो कॉल', bn: 'ভিডিও কল' },
} as const;

function toTierLang(currentLang: string): 'en' | 'hi' | 'bn' {
  return currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
}

export const ServiceCardSheet: React.FC<ServiceCardSheetProps> = ({ post, onClose, onAsk, onRequest }) => {
  const card = post.serviceCard;
  const { currentLang } = useLanguage();
  const navigate = useNavigate();
  const tierLang = toTierLang(currentLang);

  // QUEUED #22 — live provider trust: blessings earned across BOTH
  // listing silos (marketplace gigs + seva notices), read fresh from
  // gigRatings. The card's own snapshot (blessingsReceived) froze at
  // post time; live data wins whenever it exists, snapshot is fallback.
  const [liveBlessings, setLiveBlessings] = React.useState<ProviderBlessings | null>(null);
  const providerUid = card?.providerUid || post.authorUid || '';

  React.useEffect(() => {
    if (!providerUid) return;
    let alive = true;
    getProviderBlessings(providerUid)
      .then((b) => { if (alive) setLiveBlessings(b); })
      .catch(() => { /* snapshot fallback renders instead */ });
    return () => { alive = false; };
  }, [providerUid]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!card) return null;

  const openProfile = providerUid
    ? () => {
        onClose();
        navigate(`/seva/pro/${providerUid}`);
      }
    : undefined;

  const tierLabel = sevaProTierLabel(card.providerTier, tierLang);

  const verificationStory =
    card.providerTier === 'TRUSTED' ? (
      <T
        en="Verified through the Seva Professional program — full platform verification and an earned record of trusted seva."
        hi="सेवा प्रोफेशनल कार्यक्रम के माध्यम से सत्यापित — पूर्ण मंच सत्यापन और विश्वसनीय सेवा का अर्जित रिकॉर्ड।"
        bn="সেবা প্রফেশনাল প্রোগ্রামের মাধ্যমে যাচাইকৃত — সম্পূর্ণ প্ল্যাটফর্ম যাচাইকরণ এবং বিশ্বস্ত সেবার অর্জিত রেকর্ড।"
      />
    ) : card.providerTier === 'VERIFIED' ? (
      <T
        en="Verified through the Seva Professional program — sacred credentials honored and confirmed."
        hi="सेवा प्रोफेशनल कार्यक्रम के माध्यम से सत्यापित — पवित्र योग्यताएँ सम्मानित और पुष्ट।"
        bn="সেবা প্রফেশনাল প্রোগ্রামের মাধ্যমে যাচাইকৃত — পবিত্র যোগ্যতা সম্মানিত ও নিশ্চিত।"
      />
    ) : (
      <T
        en="Registered with the Seva Professional program — identity confirmed, walking the path toward verification."
        hi="सेवा प्रोफेशनल कार्यक्रम में पंजीकृत — पहचान पुष्ट, सत्यापन के मार्ग पर।"
        bn="সেবা প্রফেশনাল প্রোগ্রামে নিবন্ধিত — পরিচয় নিশ্চিত, যাচাইকরণের পথে।"
      />
    );

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-temple-950/60" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto">
        {/* Header with close */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur px-4 py-3 border-b border-amber-100">
          <h3 className="text-base font-extrabold text-stone-800">
            <T en="Seva notice" hi="सेवा सूचना" bn="সেবা বিজ্ঞপ্তি" />
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Large photo */}
        {card.photoUrl && (
          <div className="w-full max-h-[320px] overflow-hidden bg-stone-100">
            <img src={card.photoUrl} alt={card.providerName} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Provider identity — the name is a door to the full Seva
              Professional profile (both silos' listings + blessings). */}
          <div className="flex items-center justify-between gap-2">
            {openProfile ? (
              <button
                type="button"
                onClick={openProfile}
                className="text-left min-h-[44px] flex items-center"
                aria-label={`${card.providerName} — view profile`}
              >
                <h2 className="text-lg font-semibold text-amber-800 underline decoration-amber-300 underline-offset-4">
                  {card.providerName} →
                </h2>
              </button>
            ) : (
              <h2 className="text-lg font-semibold text-stone-800">{card.providerName}</h2>
            )}
            <span
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                card.providerTier === 'TRUSTED'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : card.providerTier === 'VERIFIED'
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {tierLabel}
            </span>
          </div>
          {(card.lineage || card.providerRoleId) && (
            <p className="text-[13px] text-stone-500 mt-1">
              {[card.lineage, card.providerRoleId].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Verification story */}
          <p className="mt-2 text-xs text-stone-500 leading-relaxed">{verificationStory}</p>

          {/* Devotional text — full */}
          <blockquote className="mt-4 rounded-2xl bg-amber-50/60 border border-amber-100 p-4">
            <p className="text-[15px] leading-relaxed text-stone-700 italic">“{card.devotionalText}”</p>
          </blockquote>

          {/* Editorial service line */}
          <p className="mt-4 text-base font-medium text-stone-800">{card.serviceLine}</p>

          {/* What's included */}
          {card.includes && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-stone-800 mb-1">
                <T en="What's included" hi="क्या शामिल है" bn="যা অন্তর্ভুক্ত" />
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed">{card.includes}</p>
            </div>
          )}

          {/* Modes */}
          {card.modes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {card.modes.map((m) => {
                const label = MODE_LABELS[m];
                return (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-stone-600"
                  >
                    <T en={label.en} hi={label.hi} bn={label.bn} />
                  </span>
                );
              })}
            </div>
          )}

          {/* Tithi / muhurat availability */}
          {card.availability && (
            <div className="mt-4">
              <h4 className="text-sm font-bold text-stone-800 mb-1">
                <T en="Availability" hi="उपलब्धता" bn="উপলব্ধতা" />
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed">{card.availability}</p>
            </div>
          )}

          {/* Blessings received — LIVE across all sevas when the
              read-model has data (#22); the post-time snapshot only
              speaks when live data is silent. */}
          {liveBlessings && liveBlessings.count > 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-orange-50/70 border border-orange-100 px-4 py-3">
              <span aria-hidden className="text-xl">🙏</span>
              <p className="text-sm text-stone-700">
                <span className="font-bold text-amber-700">★ {liveBlessings.avg.toFixed(1)}</span>
                {' · '}
                <span className="font-bold">{liveBlessings.count}</span>{' '}
                <T en="blessings across all sevas — marketplace and notices alike" hi="सभी सेवाओं में प्राप्त आशीर्वाद — बाज़ार और सूचनाएँ दोनों से" bn="সব সেবায় প্রাপ্ত আশীর্বাদ — বাজার ও বিজ্ঞপ্তি উভয় থেকেই" />
              </p>
            </div>
          ) : typeof card.blessingsReceived === 'number' && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-orange-50/70 border border-orange-100 px-4 py-3">
              <span aria-hidden className="text-xl">🙏</span>
              <p className="text-sm text-stone-700">
                <span className="font-bold">{card.blessingsReceived}</span>{' '}
                <T en="blessings received from families served" hi="सेवित परिवारों से प्राप्त आशीर्वाद" bn="সেবিত পরিবারদের থেকে প্রাপ্ত আশীর্বাদ" />
              </p>
            </div>
          )}

          {/* Dakshina breakdown — neutral ink */}
          <div className="mt-4 rounded-2xl border border-stone-200 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-stone-500">
                <T en="Suggested dakshina" hi="सुझाई गई दक्षिणा" bn="প্রস্তাবিত দক্ষিণা" />
              </span>
              <span className="text-xl font-normal text-stone-700 tabular-nums">
                {formatServiceDakshina(card.dakshina, card.currency)}
              </span>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-800">
              <span aria-hidden>🛡</span>
              <span>
                <T
                  en="Dakshina Suraksha · pay after seva — we only coordinate, never hold your money."
                  hi="दक्षिणा सुरक्षा · सेवा के बाद भुगतान — हम केवल समन्वय करते हैं, आपका धन कभी नहीं रखते।"
                  bn="দক্ষিণা সুরক্ষা · সেবার পর প্রদান — আমরা শুধু সমন্বয় করি, আপনার অর্থ কখনো রাখি না।"
                />
              </span>
            </p>
          </div>

          {/* CTAs */}
          <button
            type="button"
            onClick={() => onRequest(post)}
            className="mt-4 w-full min-h-[44px] rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-base font-bold hover:from-orange-500 hover:to-amber-500 shadow transition-colors flex items-center justify-center gap-2"
          >
            <T en="🙏 Request this seva" hi="🙏 इस सेवा का अनुरोध करें" bn="🙏 এই সেবার অনুরোধ করুন" />
          </button>
          <button
            type="button"
            onClick={() => onAsk(post)}
            className="mt-2 w-full min-h-[44px] rounded-xl bg-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50 text-sm font-semibold transition-colors"
          >
            <T en="Ask a question" hi="प्रश्न पूछें" bn="একটি প্রশ্ন করুন" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCardSheet;
