import React, { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { toBnDigits } from './bn';

/* Pathshala One — shared UI primitives (locale-aware, Sanatani palette).
 *
 * All user-facing strings resolve through t('suites.pathshala.…') with
 * English fallback. Number formatting follows the locale too
 * (Bengali digits only when the app language is Bengali).
 */

/** Locale-aware label. Kept for compatibility; new code calls t() directly. */
export const T: React.FC<{ en: string; bn: string; hi?: string; className?: string }> = ({
  en,
  bn,
  hi,
  className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('pathshala.label', en, bn, hi);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

/** Locale text helpers for Pathshala tabs: translated strings + locale-aware digits. */
export const useLocaleText = () => {
  const { currentLang, safeTranslate } = useLanguage();
  const digits = useCallback(
    (n: number | string) => (currentLang === 'bn' ? toBnDigits(n) : String(n)),
    [currentLang]
  );
  return { lang: currentLang, digits, tr: safeTranslate };
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
  variant = 'primary', className = '', children, ...rest
}) => {
  const v = variant === 'primary'
    ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 hover:from-amber-800 hover:to-orange-900'
    : variant === 'danger'
      ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200';
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition min-h-[40px] disabled:opacity-50 ${v} ${className}`}
    >
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold text-stone-600 mb-1">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[40px]';

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center text-stone-500 text-sm py-8 border border-dashed border-stone-300 rounded-xl bg-stone-50">{text}</div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title, onClose, children, wide,
}) => {
  const { t } = useLanguage();
  return (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className={`relative bg-white w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-800">{title}</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label={t('suites.pathshala.common.close')}>✕</button>
      </div>
      {children}
    </div>
  </div>
  );
};

export const Tabs: React.FC<{ tabs: Array<{ id: string; en: string }>; active: string; onChange: (id: string) => void }> = ({
  tabs, active, onChange,
}) => {
  const { t, currentLang } = useLanguage();
  return (
  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
    {tabs.map((tab) => {
      const primary = t(`suites.pathshala.tabs.${tab.id}`);
      const showGloss = currentLang !== 'en' && primary !== tab.en;
      return (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold border transition min-h-[44px] ${
          active === tab.id
            ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 border-amber-800 shadow'
            : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
        }`}
      >
        <span className="font-bold">{primary}</span>
        {showGloss && <span className={`block text-[10px] font-normal ${active === tab.id ? 'text-amber-200' : 'text-stone-400'}`}>{tab.en}</span>}
      </button>
      );
    })}
  </div>
  );
};
