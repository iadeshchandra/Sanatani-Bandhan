/**
 * guide/CoachMark.tsx — the spotlight coach mark.
 * =================================================
 * A warm, non-blocking overlay: the target element is spotlighted through
 * a cutout while the rest of the screen dims. The overlay itself is
 * pointer-events:none — the devotee can always tap away; only the card
 * captures touches. Nothing here ever locks the screen.
 *
 * Steps with an anchor point at `[data-guide-anchor="…"]`; steps without
 * one render as a centered bottom card (FirstRunExplainer style).
 *
 * Accessibility: role=dialog, Escape dismisses, focus moves to the card
 * heading on step change, all targets ≥44px.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translationStatus } from '../../i18n/translationQuality';
import { TranslationSuggestionSheet } from './TranslationSuggestionSheet';
import type { GuideDef } from './guides';

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CUTOUT_PAD = 10;
const CARD_GAP = 14;
const EST_CARD_HEIGHT = 300;
/**
 * Keep-out zone for the floating PanicButton (bottom-right, ~72px + its
 * hint pill). The SOS button must stay visible and tappable even mid-tour
 * — the coach card never covers it.
 */
const KEEP_OUT_RIGHT = 124;
const KEEP_OUT_BOTTOM = 214;

function findAnchor(anchor?: string): AnchorRect | null {
  if (!anchor || typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-guide-anchor="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

export interface CoachMarkProps {
  guide: GuideDef;
  /** finish(true) when the last step's primary button is tapped. */
  onFinish: (completed: boolean) => void;
}

/** "Help us say this better" — warm, never "submit correction". */
const HELP_BETTER: Record<string, string> = {
  hi: '🙏 इसे और बेहतर कहने में हमारी मदद करें',
  bn: '🙏 এটিকে আরও ভালোভাবে বলতে আমাদের সাহায্য করুন',
};
function helpBetterCopy(lang: string): string {
  return HELP_BETTER[(lang || '').toLowerCase()] || '🙏 Help us say this better';
}

export const CoachMark: React.FC<CoachMarkProps> = ({ guide, onFinish }) => {
  const { t, currentLang } = useLanguage();
  const [stepIdx, setStepIdx] = useState(0);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [cardH, setCardH] = useState(EST_CARD_HEIGHT);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Measure the real card height so the keep-out math is exact, not estimated.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h && h > 40) setCardH((prev) => (Math.abs(prev - h) > 4 ? h : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stepIdx]);

  const step = guide.steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === guide.steps.length - 1;

  // Translation Quality System: when the shown step's wording is an
  // unreviewed draft in the devotee's language, offer a one-tap way to
  // suggest better wording. Verified languages see zero UI change.
  const stepIsDraft =
    translationStatus(currentLang, step?.titleKey || '') === 'draft' ||
    translationStatus(currentLang, step?.bodyKey || '') === 'draft';

  // Close the suggestion sheet whenever the step changes.
  useEffect(() => {
    setSuggestOpen(false);
  }, [stepIdx]);

  const measure = useCallback(() => {
    const next = findAnchor(step?.anchor);
    if (next) {
      try {
        const el = document.querySelector(`[data-guide-anchor="${step!.anchor}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {
        /* scroll is a nicety, never a blocker */
      }
    }
    // Measure after the scroll settles so the cutout sits on the element.
    window.requestAnimationFrame(() => setAnchorRect(findAnchor(step?.anchor)));
  }, [step]);

  useLayoutEffect(() => {
    measure();
  }, [measure, stepIdx]);

  useEffect(() => {
    const onResize = () => setAnchorRect(findAnchor(step?.anchor));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [step]);

  // Escape always dismisses — tours never trap the devotee.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  // Move focus to the card heading as steps change (screen readers).
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIdx]);

  const stepLabel = t('guide.stepOf')
    .replace('{n}', String(stepIdx + 1))
    .replace('{total}', String(guide.steps.length));

  // Card placement: below the anchor when there is room, else above;
  // centered bottom-sheet when there is no anchor (or it went missing).
  // The floating PanicButton's keep-out zone is never covered.
  const cardStyle: React.CSSProperties = (() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
    const cardWidth = Math.min(vw - 32, 380);
    if (anchorRect) {
      const left = Math.max(16, Math.min(anchorRect.x + anchorRect.width / 2 - cardWidth / 2, vw - cardWidth - 16));
      const hitsKeepOut = (top: number) => {
        const kx = vw - KEEP_OUT_RIGHT;
        const ky = vh - KEEP_OUT_BOTTOM;
        return left < vw && left + cardWidth > kx && top < vh && top + cardH > ky;
      };
      const belowTop = anchorRect.y + anchorRect.height + CUTOUT_PAD + CARD_GAP;
      const fitsBelow = belowTop + cardH <= vh - 16 && !hitsKeepOut(belowTop);
      if (fitsBelow) {
        return { left, top: belowTop, width: cardWidth, position: 'fixed' as const };
      }
      const aboveTop = anchorRect.y - CUTOUT_PAD - CARD_GAP - cardH;
      if (aboveTop >= 16 && !hitsKeepOut(aboveTop)) {
        return { left, top: aboveTop, width: cardWidth, position: 'fixed' as const };
      }
      // Last resort: nudge the below-anchor card up just enough to clear
      // the keep-out, clamped on-screen. The spotlight ring stays visible;
      // the card stays fully tappable.
      const nudged = Math.max(16, Math.min(belowTop, vh - KEEP_OUT_BOTTOM - cardH - 12));
      return { left, top: nudged, width: cardWidth, position: 'fixed' as const };
    }
    return {
      left: Math.max(16, (vw - cardWidth) / 2),
      bottom: 24,
      width: cardWidth,
      position: 'fixed' as const,
    };
  })();

  const cx = anchorRect ? anchorRect.x - CUTOUT_PAD : 0;
  const cy = anchorRect ? anchorRect.y - CUTOUT_PAD : 0;
  const cw = anchorRect ? anchorRect.width + CUTOUT_PAD * 2 : 0;
  const ch = anchorRect ? anchorRect.height + CUTOUT_PAD * 2 : 0;
  const maskId = `sb-guide-mask-${guide.id}`;

  return (
    <div
      className="fixed inset-0 z-[210] pointer-events-none"
      aria-hidden={false}
    >
      {/* Dim + spotlight cutout. pointer-events-none: taps pass through. */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {anchorRect && (
              <rect x={cx} y={cy} width={cw} height={ch} rx="18" fill="black" />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(28, 20, 12, 0.55)" mask={`url(#${maskId})`} />
      </svg>

      {/* Warm ring around the spotlighted element. */}
      {anchorRect && (
        <div
          aria-hidden
          className="absolute rounded-[18px] border-[3px] border-amber-300/90 shadow-[0_0_0_6px_rgba(252,211,77,0.25)]"
          style={{ left: cx, top: cy, width: cw, height: ch }}
        />
      )}

      {/* The card — the only pointer-capturing element. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-label={t(guide.titleKey)}
        className="pointer-events-auto bg-[#faf7f2] rounded-3xl shadow-2xl border border-amber-200/60 overflow-hidden"
        style={cardStyle}
      >
        <div className="px-5 pt-5 pb-4 relative">
          <button
            type="button"
            onClick={() => onFinish(false)}
            aria-label={t('guide.skip')}
            className="absolute top-3 right-3 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-700" aria-hidden>
            🪔 {stepLabel}
          </p>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-[19px] font-bold text-stone-900 mt-1.5 leading-snug outline-none"
          >
            {t(step.titleKey)}
          </h3>
          <p className="text-[14px] text-stone-600 mt-1.5 leading-relaxed">{t(step.bodyKey)}</p>
          {/* Translation Quality System: one-tap correction for draft strings. */}
          {stepIsDraft && (
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              className="mt-1 text-[13px] font-semibold text-amber-700 hover:text-amber-800 underline decoration-amber-300 underline-offset-2 min-h-[44px] text-left"
            >
              {helpBetterCopy(currentLang)}
            </button>
          )}
        </div>

        {/* Step dots */}
        {guide.steps.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 px-5" aria-hidden>
            {guide.steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === stepIdx ? 'w-6 bg-amber-600' : 'w-1.5 bg-stone-300'}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-5 pb-5 pt-3">
          {!isFirst && (
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="min-h-[48px] px-4 rounded-2xl border border-stone-300 text-stone-700 text-[14px] font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
              {t('guide.back')}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onFinish(false)}
            className="min-h-[48px] px-4 rounded-2xl text-stone-500 text-[14px] font-semibold"
          >
            {t('guide.skip')}
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onFinish(true) : setStepIdx((i) => i + 1))}
            className="min-h-[48px] px-6 rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 text-[14px] font-bold flex items-center gap-1.5 shadow-sm"
          >
            {isLast ? (
              t('guide.gotIt')
            ) : (
              <>
                {t('guide.next')}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Translation Quality System: the suggestion sheet captures taps. */}
      {suggestOpen && step && (
        <div className="pointer-events-auto">
          <TranslationSuggestionSheet
            lang={currentLang}
            lines={[
              { key: step.titleKey, kind: 'title', currentText: t(step.titleKey) },
              { key: step.bodyKey, kind: 'body', currentText: t(step.bodyKey) },
            ]}
            onClose={() => setSuggestOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
