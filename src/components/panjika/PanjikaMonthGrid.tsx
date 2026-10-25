import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSanctumLite } from '../common/PanchangHeader';
import { buildPanjikaMonth, type PanjikaMonthDay } from '../../lib/panjikaMonth';
import { appLocale } from '../../lib/format';
import { isFestivalOfLightsName } from '../../i18n/regionalTerms';
import type { PanjikaFestival } from '../../lib/panjikaFestivals';

/**
 * PanjikaMonthGrid — VIBE B2: the month view of the Panjika, shared by
 * the org Panchang desk and the Solo PanjikaTab (one component, one
 * engine, one truth).
 * =====================================================================
 * Each day cell carries the Gregorian date + the day's tithi (short
 * form) from the canonical engine (utils/panchang via lib/panjikaMonth)
 * and a marigold mark + name when the festival DB lists a festival that
 * day. Today wears the lamplight treatment. Tapping a day selects it:
 * the built-in detail panel shows the full tithi, nakshatra, the day's
 * festivals and the brass Abhijit muhurat chip; hosts with their own
 * day view (the org desk) pass onSelectDate and showDetail={false} and
 * the tap drives THEIR detail instead.
 *
 * Floor law: the month is computed once per (year, month) in a memo —
 * never per render — and under .sanctum-lite the glow/motion step down
 * while colours, type and layout stay identical. Day cells are full-
 * cell tap targets, ≥52px tall; on a 360px phone the 7 columns land at
 * ≈44px wide with 4px gutters (see NOTES for the target-size argument).
 */

interface PanjikaMonthGridProps {
  /** Host day-view hook (org desk drives its own detail from this). */
  onSelectDate?: (iso: string) => void;
  /** Render the built-in day detail under the grid (default true). */
  showDetail?: boolean;
  className?: string;
}

function isoToday(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, '0');
  const dd = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${mm}-${dd}`;
}

export const PanjikaMonthGrid: React.FC<PanjikaMonthGridProps> = ({
  onSelectDate,
  showDetail = true,
  className = '',
}) => {
  const { t, currentLang, rt } = useLanguage();
  const lite = useSanctumLite();
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selectedIso, setSelectedIso] = useState<string>(isoToday());

  const cells = useMemo(
    () => buildPanjikaMonth(view.y, view.m),
    [view.y, view.m],
  );
  const selected: PanjikaMonthDay | null = useMemo(
    () => cells.find((c) => c && c.iso === selectedIso) ?? null,
    [cells, selectedIso],
  );

  const locale = appLocale();
  const monthTitle = useMemo(() => {
    try {
      return new Date(view.y, view.m, 1).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return new Date(view.y, view.m, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
    }
  }, [view.y, view.m, locale]);

  const weekdayHeaders = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      try {
        // 2026-10-11 was a Sunday; +i walks the week in order.
        out.push(new Date(2026, 9, 11 + i).toLocaleDateString(locale, { weekday: 'short' }));
      } catch {
        out.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]);
      }
    }
    return out;
  }, [locale]);

  const festivalName = (f: PanjikaFestival): string => {
    if (currentLang === 'bn') return f.nameBn;
    if (currentLang === 'hi') return f.nameHi ?? f.nameEn;
    if (isFestivalOfLightsName(f.nameEn)) return rt('festivalOfLights');
    return f.nameEn;
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const goToday = () => {
    const n = new Date();
    setView({ y: n.getFullYear(), m: n.getMonth() });
    setSelectedIso(isoToday());
    onSelectDate?.(isoToday());
  };
  const pick = (day: PanjikaMonthDay) => {
    setSelectedIso(day.iso);
    onSelectDate?.(day.iso);
  };

  const selectedDateLine = selected
    ? (() => {
        try {
          return new Date(selected.iso + 'T12:00:00').toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        } catch {
          return selected.iso;
        }
      })()
    : '';

  return (
    <div className={`${lite ? 'sanctum-lite' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t('vibe.prevMonth')}
          className="w-11 h-11 min-w-[44px] rounded-xl bg-white/80 border border-brass-200 text-brass-700 flex items-center justify-center hover:border-brass-400 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="text-center min-w-0">
          <div className="font-display text-lg font-semibold text-temple-900 leading-tight">
            {monthTitle}
          </div>
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-bold text-brass-700 underline underline-offset-2 min-h-[28px] px-2 cursor-pointer"
          >
            {t('vibe.today')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t('vibe.nextMonth')}
          className="w-11 h-11 min-w-[44px] rounded-xl bg-white/80 border border-brass-200 text-brass-700 flex items-center justify-center hover:border-brass-400 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-temple-400 mb-1" aria-hidden="true">
        {weekdayHeaders.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthTitle}>
        {cells.map((c, i) => {
          if (!c) return <div key={`e${i}`} aria-hidden="true" />;
          const lead = c.festivals[0];
          const isSelected = c.iso === selectedIso;
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => pick(c)}
              aria-pressed={isSelected}
              aria-label={`${c.dayOfMonth} — ${c.tithiFull}${lead ? ` — ${festivalName(lead)}` : ''}`}
              className={`min-h-[52px] rounded-xl border flex flex-col items-center justify-center gap-0.5 px-0.5 py-1 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'bg-brass-500 border-brass-600 text-white shadow-md'
                  : c.isToday
                    ? 'sanctum-header lamplight border-brass-400 text-temple-900'
                    : 'bg-white/80 border-brass-100 text-temple-800 hover:border-brass-300'
              }`}
            >
              <span className="text-sm font-extrabold leading-none tnum">{c.dayOfMonth}</span>
              {c.tithiName && (
                <span className={`text-[9px] leading-tight font-semibold ${isSelected ? 'text-brass-50' : 'text-temple-400'}`}>
                  <span
                    aria-hidden="true"
                    className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle ${
                      c.paksha === 'Shukla'
                        ? isSelected ? 'bg-white' : 'bg-brass-400'
                        : isSelected ? 'border border-white bg-transparent' : 'border border-brass-400 bg-transparent'
                    }`}
                  />
                  {c.tithiName}
                </span>
              )}
              {lead && (
                <span className="flex items-center gap-1 max-w-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span className={`text-[8px] leading-tight font-bold truncate ${isSelected ? 'text-white' : 'text-brass-700'}`}>
                    {festivalName(lead)}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showDetail && selected && (
        <div className="mt-4 rounded-2xl sanctum-header lamplight border border-brass-200 p-4">
          <div className="font-display font-semibold text-temple-900">{selectedDateLine}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1.5">
            {selected.tithiFull && (
              <span className="text-sm font-semibold text-temple-800">
                {t('vibe.shubh')} {selected.tithiFull.replace(/^(Shukla|Krishna)\s+/, '')}
                <span className="text-temple-400 font-medium">
                  {' '}· {selected.tithiFull.split(/\s+/)[0]} Paksha
                </span>
              </span>
            )}
            {selected.abhijit && (
              <span className="muhurat-chip inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tnum">
                {t('vibe.shubhMuhurat')} · {selected.abhijit}
              </span>
            )}
          </div>
          {selected.nakshatra && (
            <p className="text-xs text-temple-500 mt-1.5">{selected.nakshatra} Nakshatra</p>
          )}
          {selected.festivals.length === 0 ? (
            <p className="text-sm text-temple-500 mt-2">{t('vibe.noFestival')}</p>
          ) : (
            selected.festivals.map((f, fi) => (
              <div key={fi} className="py-2 mt-1 border-t border-brass-200/70 first:border-t-0">
                <div className="font-display font-semibold text-temple-900">{festivalName(f)}</div>
                <div className="text-xs text-temple-500 mt-0.5">
                  {currentLang === 'bn' ? f.significanceBn : f.significanceEn}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PanjikaMonthGrid;
