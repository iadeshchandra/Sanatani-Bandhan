import React, { useState } from 'react';
import type { SangamPost, ServiceCardDetails } from './types';
import { T } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { sevaProTierLabel } from '../lib/sevaPro/tierMapping';
import { demoEmbedUrl } from './sevaBazarVideo';

/* Seva Bazar — the service_card feed card.
 * =====================================================================
 * A service_card is a SEVA NOTICE, not an ad. Anatomy per the structure
 * doc §4 (mirrored in types.ts + serviceCard.ts cheap-signal ban):
 * - 4:5 photo, provider name 17pt, lineage 13pt + tier badge.
 * - Devotional text FIRST (the human before the offer), then ONE
 *   editorial service line.
 * - Trust row: tier badge, years of seva, blessings received.
 * - Assurance: "🛡 Dakshina Suraksha · pay after seva".
 * - Dakshina in NEUTRAL ink — stone-700, never red, never bold-deal.
 * - ONE CTA: "🙏 Ask Panditji" (≥44px).
 * No strikethroughs, countdowns, scarcity, caps — ever.
 */

export interface ServiceCardPostProps {
  post: SangamPost;
  /** "🙏 Ask Panditji" — opens the provider chat thread. */
  onAsk: (post: SangamPost) => void;
  /** Card tap — opens the ServiceCardSheet detail view. */
  onOpen: (post: SangamPost) => void;
}

function toTierLang(currentLang: string): 'en' | 'hi' | 'bn' {
  return currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
}

/** Neutral-ink money formatting for the card's currency (never "deal" styling). */
export function formatServiceDakshina(amount: number, currency: ServiceCardDetails['currency']): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

export const ServiceCardPost: React.FC<ServiceCardPostProps> = ({ post, onAsk, onOpen }) => {
  const card = post.serviceCard;
  const { currentLang } = useLanguage();
  const tierLang = toTierLang(currentLang);
  // Seva Bazar Phase 3 — inline demo video player (tap play, no fullscreen takeover).
  const [playingVideo, setPlayingVideo] = useState(false);

  if (!card) return null;

  const tierLabel = sevaProTierLabel(card.providerTier, tierLang);

  const handleCardKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(post);
    }
  };

  const handleAsk = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAsk(post);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${card.providerName} — ${card.serviceLine}`}
      onClick={() => onOpen(post)}
      onKeyDown={handleCardKey}
      className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-orange-300"
    >
      {/* 4:5 photo — or inline demo video when playing */}
      {playingVideo && card.demoVideoId ? (
        <div className="aspect-video w-full overflow-hidden bg-stone-900">
          <iframe
            src={demoEmbedUrl(card.demoVideoId)}
            title={`Intro video — ${card.providerName}`}
            className="w-full h-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        card.photoUrl && (
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
            <img
              src={card.photoUrl}
              alt={`${card.providerName}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* 🎬 Demo video play overlay — Seva Bazar Phase 3 */}
            {card.demoVideoId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayingVideo(true);
                }}
                aria-label="Play intro video"
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition min-h-[44px]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <span className="text-2xl text-amber-700 ml-1" aria-hidden>
                    ▶
                  </span>
                </span>
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
                  <T en="🎬 Watch intro" hi="🎬 परिचय देखें" bn="🎬 পরিচিতি দেখুন" />
                </span>
              </button>
            )}
          </div>
        )
      )}
      {/* Demo video without photo — compact play button */}
      {!card.photoUrl && card.demoVideoId && !playingVideo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPlayingVideo(true);
          }}
          className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-bold text-stone-700 min-h-[44px] hover:border-amber-300"
        >
          <span aria-hidden>🎬</span>
          <T en="Watch intro video" hi="परिचय वीडियो देखें" bn="পরিচিতিমূলক ভিডিও দেখুন" />
        </button>
      )}

      <div className="p-4 sm:p-5">
        {/* Provider identity */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[17px] font-semibold text-stone-800 leading-snug">{card.providerName}</h3>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
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
          <p className="text-[13px] text-stone-500 mt-0.5">
            {[card.lineage, card.providerRoleId].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* The human before the offer */}
        <p className="mt-3 text-sm leading-relaxed text-stone-700 italic">“{card.devotionalText}”</p>

        {/* ONE editorial service line */}
        <p className="mt-2 text-sm text-stone-800">{card.serviceLine}</p>

        {/* Trust row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
          {typeof card.yearsOfSeva === 'number' && (
            <span>
              <T en={`${card.yearsOfSeva} yrs of seva`} hi={`सेवा के ${card.yearsOfSeva} वर्ष`} bn={`সেবার ${card.yearsOfSeva} বছর`} />
            </span>
          )}
          {typeof card.blessingsReceived === 'number' && (
            <span>
              <span aria-hidden className="mr-1">🙏</span>
              <T
                en={`${card.blessingsReceived} blessings received`}
                hi={`${card.blessingsReceived} आशीर्वाद प्राप्त`}
                bn={`${card.blessingsReceived} আশীর্বাদ প্রাপ্ত`}
              />
            </span>
          )}
        </div>

        {/* Assurance */}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs text-emerald-800">
          <span aria-hidden>🛡</span>
          <T en="Dakshina Suraksha · pay after seva" hi="दक्षिणा सुरक्षा · सेवा के बाद भुगतान" bn="দক্ষিণা সুরক্ষা · সেবার পর প্রদান" />
        </p>

        {/* Dakshina — neutral ink, never a "deal" */}
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-xs text-stone-500">
            <T en="Suggested dakshina" hi="सुझाई गई दक्षिणा" bn="প্রস্তাবিত দক্ষিণা" />
          </span>
          <span className="text-base font-normal text-stone-700 tabular-nums">
            {formatServiceDakshina(card.dakshina, card.currency)}
          </span>
        </div>

        {/* ONE CTA */}
        <button
          type="button"
          onClick={handleAsk}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-bold hover:from-orange-500 hover:to-amber-500 shadow transition-colors flex items-center justify-center gap-2"
        >
          <T en="🙏 Ask Panditji" hi="🙏 पंडितजी से पूछें" bn="🙏 পণ্ডিতজিকে জিজ্ঞাসা করুন" />
        </button>
      </div>
    </article>
  );
};

export default ServiceCardPost;
