import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Cash Custody — shared UI primitives (locale-aware, Sanatani palette).
 *
 * LOCALE CONTRACT: this desk follows the app locale — English default,
 * Bengali/Hindi/Sanskrit via LanguageContext. Domain terms stay Sanatani
 * (Hundi / Golak / Dakshina) with English subtitles; never hardcoded to
 * one language.
 */

/** Locale-aware label. English default; Bengali/Hindi/Sanskrit when the app locale switches. */
export const T: React.FC<{ en: string; bn: string; hi?: string; sa?: string; className?: string }> = ({
  en, bn, hi, sa, className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('cashcustody.label', en, bn, hi, sa);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="font-normal text-[0.85em] opacity-60"> ({en})</span>}
    </span>
  );
};

export const useLocaleText = () => {
  const { currentLang, safeTranslate } = useLanguage();
  return { lang: currentLang, tr: safeTranslate };
};

/** @deprecated Hard-codes ₹. Components must bind `useInr()` from
 * hooks/useWorkspaceInr so amounts render in the workspace currency
 * (QUEUED #60). Kept only so no legacy import breaks. */
export const inr = (n: number) =>
  '₹' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

export const Stat: React.FC<{ label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: 'amber' | 'emerald' | 'red' | 'sky' }> = ({
  label, value, sub, tone = 'amber',
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
      <div className="text-xl sm:text-2xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-75">{sub}</div>}
    </div>
  );
};

export const Btn: React.FC<{
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'danger' | 'emerald'; className?: string; disabled?: boolean;
}> = ({ children, onClick, type = 'button', variant = 'primary', className = '', disabled }) => {
  const v: Record<string, string> = {
    primary: 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 hover:from-amber-800 hover:to-orange-900',
    ghost: 'bg-white text-stone-700 border border-stone-200 hover:border-amber-300',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    emerald: 'bg-emerald-700 text-white hover:bg-emerald-800',
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Field: React.FC<{
  label: React.ReactNode; children: React.ReactNode; className?: string;
}> = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 min-h-[44px]';

export const Tabs: React.FC<{ tabs: Array<{ id: string; bn: string; en: string; hi?: string; sa?: string }>; active: string; onChange: (id: string) => void }> = ({
  tabs, active, onChange,
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
      {tabs.map((t) => {
        const primary = safeTranslate(`cashcustody.tab.${t.id}`, t.en, t.bn, t.hi, t.sa);
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

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const tones: Record<string, string> = {
    sealed: 'bg-stone-100 text-stone-700 border-stone-200',
    open: 'bg-sky-100 text-sky-800 border-sky-200',
    counting: 'bg-amber-100 text-amber-800 border-amber-200',
    verified: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    closed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    deposited: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${tones[status] || tones.sealed}`}>
      {status.toUpperCase()}
    </span>
  );
};

export const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
