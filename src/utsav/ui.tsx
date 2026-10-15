import React, { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — shared UI primitives (locale-aware, festival palette).
 *
 * LOCALE CONTRACT: English default, Bengali/Hindi via LanguageContext.
 * Domain terms stay Sanatani (Utsav / Koshadhyaksh) with English subtitles;
 * never hardcoded to one language.
 */

/** Locale-aware label. English default; Bengali/Hindi when the app locale switches. */
export const T: React.FC<{ en: string; bn: string; hi?: string; className?: string }> = ({
  en,
  bn,
  hi,
  className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('utsav.label', en, bn, hi);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

/** Locale text helpers for Utsav tabs. */
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
  <div className={`bg-white rounded-2xl border border-orange-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

export const Stat: React.FC<{ label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: 'orange' | 'emerald' | 'red' | 'amber' | 'sky' }> = ({
  label,
  value,
  sub,
  tone = 'orange',
}) => {
  const tones: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
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
      ? 'bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 hover:from-orange-600 hover:to-red-700 shadow'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-500 shadow'
        : 'bg-white text-stone-700 border border-stone-200 hover:border-orange-400';
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
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[44px]';

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-10 text-center text-sm text-stone-400">
    <div className="text-3xl mb-2">🪔</div>
    {text}
  </div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide = false,
}) => {
  const { t: tr } = useLanguage();
  return (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center no-print">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className={`relative bg-white w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-800">{title}</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label={tr('ritual.common.close')}>✕</button>
      </div>
      {children}
    </div>
  </div>
  );
};

export const Tabs: React.FC<{ tabs: Array<{ id: string }>; active: string; onChange: (id: string) => void }> = ({
  tabs,
  active,
  onChange,
}) => {
  const { t: tr } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
      {tabs.map((t) => {
        const primary = tr(`ritual.utsav.tabs.${t.id}`);
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold border transition min-h-[44px] ${
              active === t.id
                ? 'bg-gradient-to-r from-orange-700 to-red-800 text-orange-50 border-orange-800 shadow'
                : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'
            }`}
          >
            <span className="font-bold">{primary}</span>
          </button>
        );
      })}
    </div>
  );
};

/** Status pill for festivals / tasks / vendors. */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const { t: tr } = useLanguage();
  const statusLabels: Record<string, string> = {
    planned: tr('ritual.utsav.festivals.statusPlanned'),
    ongoing: tr('ritual.utsav.festivals.statusOngoing'),
    completed: tr('ritual.utsav.festivals.statusCompleted'),
    cancelled: tr('ritual.utsav.festivals.statusCancelled'),
    todo: tr('ritual.utsav.committee.statusTodo'),
    doing: tr('ritual.utsav.committee.statusDoing'),
    done: tr('ritual.utsav.committee.done'),
    quoted: tr('ritual.utsav.vendors.statusQuoted'),
    booked: tr('ritual.utsav.vendors.statusBooked'),
    paid: tr('ritual.utsav.vendors.statusPaid'),
  };
  const tones: Record<string, string> = {
    planned: 'bg-sky-100 text-sky-800',
    ongoing: 'bg-orange-100 text-orange-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-stone-100 text-stone-500',
    todo: 'bg-stone-100 text-stone-600',
    doing: 'bg-amber-100 text-amber-800',
    done: 'bg-emerald-100 text-emerald-800',
    quoted: 'bg-sky-100 text-sky-800',
    booked: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
  };
  const label = statusLabels[status] || status.replace(/-/g, ' ');
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${tones[status] || 'bg-stone-100 text-stone-600'}`}>
      {label}
    </span>
  );
};

/** INR formatter. */
export const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

/** yyyy-mm-dd → readable. */
export const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
