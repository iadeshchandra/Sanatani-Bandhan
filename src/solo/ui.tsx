import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Solo Sanatani — shared UI primitives (locale-aware, Sanatani palette).
 *
 * LOCALE CONTRACT (user-directed): this suite follows the app locale like
 * every other desk — English default, Bengali/Hindi/Sanskrit via
 * LanguageContext. Domain terms stay Sanatani (Sadhana / Vrata / Sankalpa)
 * with English subtitles; never hardcoded to one language.
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
  const primary = safeTranslate('solo.label', en, bn, hi, sa);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

/** Locale text helpers for Solo tabs. */
export const useLocaleText = () => {
  const { currentLang, safeTranslate } = useLanguage();
  return { lang: currentLang, tr: safeTranslate };
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
    <div className={`rounded-2xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      <div className="text-xl sm:text-2xl font-extrabold mt-1 tnum">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-75">{sub}</div>}
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
      ? 'bg-amber-700 hover:bg-amber-800 text-amber-50'
      : variant === 'danger'
        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
        : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200';
  return (
    <button
      {...rest}
      className={`pressable rounded-xl px-4 py-2 text-sm font-bold transition-colors min-h-[44px] ${styles} ${className}`}
    />
  );
};

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]';

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-8 text-sm text-stone-400 font-medium">{text}</div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-extrabold text-stone-900">{title}</h3>
        <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 rounded-full min-h-[44px] min-w-[44px]" aria-label="Close">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);
