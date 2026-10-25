import React, { useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { calculatePanchang, getPanchangTodayLine } from '../../utils/panchang';
import { festivalDressingToday } from '../../lib/festivalDressing';
import { isFestivalOfLightsName } from '../../i18n/regionalTerms';

/**
 * PanchangHeader — the greeting–panchang home header (VIBE B1).
 * =====================================================================
 * Design North-Star: "A temple that opens for you." Both homes (org
 * Role Home via DashboardHome, and Solo home) open with this one band:
 * a sanctum surface (ivory/sandalwood, lamplight glow, alpana
 * watermark, lotus divider) carrying —
 *
 *   · the greeting in the user's language (supplied by the caller,
 *     whose greeting logic already exists and differs per home),
 *   · the day's lead festival, when the festival DB lists one today
 *     (the greeting leads with it; the header wears its dressing),
 *   · today's tithi as a greeting ("Shubh Ekadashi" pattern),
 *   · today's Abhijit window as a small brass chip — the shubh muhurat,
 *   · the canonical panchang today-line (single source, as everywhere).
 *
 * HONESTY LAW: every sacred fact here comes from the engines — tithi +
 * muhurat from utils/panchang (the same canonical computation every
 * other surface uses), festival + dressing from the festival DB via
 * lib/festivalDressing. If the engine cannot answer, the strip simply
 * omits that element; nothing is ever invented to fill the space.
 *
 * FLOOR LAW: on low-end devices (or reduced motion) the glow and the
 * transitions step down via .sanctum-lite — colours, type and layout
 * stay identical.
 */

interface PanchangStrip {
  tithiName: string;
  tithiLine: string;
  nakshatra: string;
  abhijit: string;
  festivalName: string;
  dressing: string;
}

function usePanchangStrip(): PanchangStrip {
  const { currentLang, rt } = useLanguage();
  return useMemo<PanchangStrip>(() => {
    const dressing = festivalDressingToday();
    const f = dressing.festival;
    const festivalName = f
      ? currentLang === 'bn'
        ? f.nameBn
        : currentLang === 'hi'
          ? (f.nameHi ?? f.nameEn)
          : // English UI: the festival-of-lights takes the region's own
            // word (Deepavali in the south, Diwali in the north) via rt().
            isFestivalOfLightsName(f.nameEn)
            ? rt('festivalOfLights')
            : f.nameEn
      : '';
    try {
      const p = calculatePanchang(new Date());
      const tithiName = (p.tithi || '').trim().split(/\s+/).pop() || '';
      return {
        tithiName,
        tithiLine: getPanchangTodayLine(p),
        nakshatra: p.nakshatra || '',
        abhijit: (p.abhijitMuhurat || '').trim(),
        festivalName,
        dressing: dressing.key,
      };
    } catch {
      // The engine could not answer — degrade to greeting + festival
      // (both still real), never to invented panchang.
      return {
        tithiName: '',
        tithiLine: '',
        nakshatra: '',
        abhijit: '',
        festivalName,
        dressing: dressing.key,
      };
    }
  }, [currentLang, rt]);
}

/** Low-end step-down: fewer cores / little memory / reduced motion. */
function useSanctumLite(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  return useMemo(() => {
    if (reducedMotion) return true;
    try {
      const nav = navigator as Navigator & { deviceMemory?: number };
      if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
      if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return true;
    } catch {
      /* detection is best-effort — full treatment is the default */
    }
    return false;
  }, [reducedMotion]);
}

/** A tiny lotus, drawn — pan-Sanatani, no emoji, no image asset. */
const LotusMark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 34 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M17 3c2.4 2.6 3.6 5.4 3.6 8.2 0 2-.8 3.9-3.6 5.8-2.8-1.9-3.6-3.8-3.6-5.8C13.4 8.4 14.6 5.6 17 3Z" />
    <path d="M6.5 6.5c3 .8 5.3 2.4 6.9 4.7 1.1 1.7 1.5 3.7.9 6.3-2.9-.5-4.7-1.6-5.9-3.2C6.9 12.2 6.3 9.5 6.5 6.5Z" />
    <path d="M27.5 6.5c-.2 3-.8 5.7-2.3 7.8-1.2 1.6-3 2.7-5.9 3.2-.6-2.6-.2-4.6.9-6.3 1.6-2.3 3.9-3.9 6.9-4.7Z" />
  </svg>
);

export interface PanchangHeaderProps {
  /** Small top label (org taxonomy line / solo motto). */
  eyebrow: React.ReactNode;
  /** The time-of-day greeting line, in the user's language. */
  greetingLine?: React.ReactNode;
  /** The headline (org name / "Greeting, Name" on Solo). */
  title: React.ReactNode;
  /** Home-specific content kept under the strip (hero stats, warm lines). */
  children?: React.ReactNode;
}

export const PanchangHeader: React.FC<PanchangHeaderProps> = ({
  eyebrow,
  greetingLine,
  title,
  children,
}) => {
  const { safeTranslate } = useLanguage();
  const strip = usePanchangStrip();
  const lite = useSanctumLite();

  return (
    <header
      data-dressing={strip.dressing}
      className={`sanctum-header lamplight alpana-watermark relative overflow-hidden rounded-3xl border border-brass-200 px-5 py-5 sm:px-6 shrink-0 ${
        lite ? 'sanctum-lite' : ''
      }`}
    >
      <div className="relative z-10 flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <LotusMark className="w-5 h-5 dress-accent-text shrink-0" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-brass-600 truncate">
            {eyebrow}
          </span>
        </div>

        {greetingLine ? (
          <p className="text-sm font-semibold dress-accent-text -mb-1">{greetingLine}</p>
        ) : null}

        <div className="font-display text-2xl font-semibold text-temple-900 tracking-tight leading-snug">
          {title}
        </div>

        {strip.festivalName ? (
          <p className="font-display text-lg font-semibold dress-accent-text leading-snug">
            {strip.festivalName}
          </p>
        ) : null}

        {(strip.tithiName || strip.abhijit || strip.tithiLine) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {strip.tithiName ? (
              <span className="font-display text-base font-semibold text-temple-800">
                {safeTranslate('vibe.shubh', 'Shubh', 'শুভ', 'शुभ')} {strip.tithiName}
              </span>
            ) : null}
            {strip.abhijit ? (
              <span className="muhurat-chip inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tnum">
                {safeTranslate('vibe.shubhMuhurat', 'Shubh Muhurat', 'শুভ মুহূর্ত', 'शुभ मुहूर्त')}
                {' · '}
                {strip.abhijit}
              </span>
            ) : null}
            {strip.tithiLine ? (
              <span className="text-[11px] font-medium text-temple-500">
                {strip.tithiLine}
                {strip.nakshatra ? ` • ${strip.nakshatra} Nakshatra` : ''}
              </span>
            ) : null}
          </div>
        )}

        {children}

        <div className="lotus-divider" aria-hidden="true" />
      </div>
    </header>
  );
};

export default PanchangHeader;
