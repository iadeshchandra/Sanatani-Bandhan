import React, { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Annakshetra One — shared UI primitives (locale-aware, Sanatani palette).
 *
 * LOCALE CONTRACT: English default, Bengali/Hindi/Sanskrit via
 * LanguageContext. Domain terms stay Sanatani (Annakshetra / Bhandara /
 * Prasad) with English subtitles; never hardcoded to one language.
 */

/** Locale-aware label. English default; Bengali/Hindi/Sanskrit when the app locale switches. */
export const T: React.FC<{ en: string; bn: string; hi?: string; sa?: string; className?: string }> = ({
  en,
  bn,
  hi,
  sa,
  className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('anna.label', en, bn, hi, sa);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

/** Locale text helpers for Annakshetra tabs. */
export const useLocaleText = () => {
  const { currentLang, safeTranslate } = useLanguage();
  const digits = useCallback(
    (n: number | string) => String(n),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLang]
  );
  return { lang: currentLang, digits, tr: safeTranslate };
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

export const Stat: React.FC<{ label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: 'amber' | 'emerald' | 'red' | 'sky' }> = ({
  label,
  value,
  sub,
  tone = 'amber',
}) => {
  const tones: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    sky: 'bg-sky-50 border-sky-200 text-sky-900',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="text-2xl font-extrabold leading-tight">{value}</div>
      <div className="text-xs font-semibold opacity-80 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] opacity-70 mt-1">{sub}</div>}
    </div>
  );
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
  variant = 'primary',
  className = '',
  ...rest
}) => {
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 hover:from-amber-600 hover:to-orange-700 shadow'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-500 shadow'
        : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-400';
  return (
    <button
      {...rest}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
};

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-bold text-stone-600 mb-1.5">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 min-h-[44px]';

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-10 text-center text-sm text-stone-400">
    <div className="text-3xl mb-2">🍲</div>
    {text}
  </div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide = false,
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center no-print">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className={`relative bg-white w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-800">{title}</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label="Close">✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const Tabs: React.FC<{ tabs: Array<{ id: string; bn: string; en: string; hi?: string; sa?: string }>; active: string; onChange: (id: string) => void }> = ({
  tabs,
  active,
  onChange,
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
      {tabs.map((t) => {
        const primary = safeTranslate(`anna.tab.${t.id}`, t.en, t.bn, t.hi, t.sa);
        const showGloss = currentLang !== 'en' && primary !== t.en;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold border transition min-h-[44px] ${
              active === t.id
                ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 border-amber-800 shadow'
                : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
            }`}
          >
            <span className="font-bold">{primary}</span>
            {showGloss && <span className={`block text-[10px] font-normal ${active === t.id ? 'text-amber-200' : 'text-stone-400'}`}>{t.en}</span>}
          </button>
        );
      })}
    </div>
  );
};

/** Status pill for bhandara / menu states. */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const tones: Record<string, string> = {
    planned: 'bg-sky-100 text-sky-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-stone-100 text-stone-500',
    cooked: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    posted: 'bg-emerald-100 text-emerald-800',
  };
  const label = status.replace(/-/g, ' ');
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${tones[status] || 'bg-stone-100 text-stone-600'}`}>
      {label}
    </span>
  );
};
