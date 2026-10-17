/**
 * guide/TourPill.tsx — invitational tour triggers.
 * =================================================
 * Feature tours never auto-play. On a devotee's first visit, a gentle
 * floating pill invites them ("Take a quick tour? 🪔") — dismissible,
 * offered once, never nagging.
 *
 * `TourLink` is the quiet re-entry: a small warm text button for headers
 * and footers that (re)starts the guide on demand.
 */

import React, { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { markPillOffered } from './useGuide';
import type { GuideDef } from './guides';

export interface TourPillProps {
  guide: GuideDef;
  uid?: string;
  onStart: () => void;
  onDismiss: () => void;
  /** Extra positioning classes; defaults to bottom-center above tab bars. */
  className?: string;
}

export const TourPill: React.FC<TourPillProps> = ({
  guide,
  uid = 'anon',
  onStart,
  onDismiss,
  className = '',
}) => {
  const { t } = useLanguage();

  // The pill is offered once per devotee: record the offer on first paint
  // so navigating away and back does not re-invite forever.
  useEffect(() => {
    markPillOffered(guide.id, uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide.id, uid]);

  return (
    <div
      className={`fixed z-[150] left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-8 ${className}`}
      role="dialog"
      aria-label={t(guide.pillKey)}
    >
      <div className="flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-full bg-amber-950/95 text-amber-50 shadow-xl border border-amber-400/30 backdrop-blur-sm animate-[guidePillIn_0.45s_ease-out]">
        <button
          type="button"
          onClick={onStart}
          className="min-h-[44px] flex items-center gap-2 text-[13px] font-bold"
        >
          <Sparkles className="w-4 h-4 text-amber-300" aria-hidden />
          <span className="max-w-[52vw] truncate">{t(guide.pillKey)}</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('guide.close')}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 flex items-center justify-center text-amber-200/80"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <style>{`@keyframes guidePillIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export interface TourLinkProps {
  guide: GuideDef;
  onRestart: () => void;
  className?: string;
}

/** Quiet "🪔 Take a tour" re-entry for headers/footers. */
export const TourLink: React.FC<TourLinkProps> = ({ guide, onRestart, className = '' }) => {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onRestart}
      aria-label={`${t('guide.takeTour')}: ${t(guide.titleKey)}`}
      className={`min-h-[44px] inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 hover:text-amber-800 ${className}`}
    >
      <span aria-hidden>🪔</span>
      {t('guide.takeTour')}
    </button>
  );
};
