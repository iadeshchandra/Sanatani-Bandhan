import React, { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Matha One — shared UI primitives (locale-aware, saffron palette).
 *
 * LOCALE CONTRACT: all strings live under suites.matha.* and resolve via
 * t() with English fallback. Domain terms stay Sanatani (Matha / Parampara
 * / Dinacharya) per the 3-tier termbase; never hardcoded to one language.
 *
 * RESPECT RULE: a sacred institution's internal record. Tone is
 * respectful; nothing here is gamified.
 */

/** Locale text helpers for Matha tabs. */
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

export const Stat: React.FC<{ label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: 'saffron' | 'amber' | 'red' | 'sky' | 'stone' }> = ({
  label,
  value,
  sub,
  tone = 'saffron',
}) => {
  const tones: Record<string, string> = {
    saffron: 'bg-orange-50 border-orange-200 text-orange-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    sky: 'bg-sky-50 border-sky-200 text-sky-900',
    stone: 'bg-stone-50 border-stone-200 text-stone-800',
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
      ? 'bg-gradient-to-r from-orange-700 to-amber-800 text-orange-50 hover:from-orange-600 hover:to-amber-700 shadow'
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
    <div className="text-3xl mb-2">🕉️</div>
    {text}
  </div>
);

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide = false,
}) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-800">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label={t('suites.matha.common.close')}>✕</button>
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
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold border transition min-h-[44px] ${
            active === tab.id
              ? 'bg-gradient-to-r from-orange-700 to-amber-800 text-orange-50 border-orange-800 shadow'
              : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'
          }`}
        >
          {t(`suites.matha.tabs.${tab.id}`)}
        </button>
      ))}
    </div>
  );
};

/** Status pill for sannyasis / students / records. */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useLanguage();
  const tones: Record<string, string> = {
    resident: 'bg-orange-100 text-orange-800',
    itinerant: 'bg-sky-100 text-sky-800',
    mahasamadhi: 'bg-stone-200 text-stone-600',
    studying: 'bg-orange-100 text-orange-800',
    completed: 'bg-emerald-100 text-emerald-800',
    left: 'bg-stone-100 text-stone-500',
    posted: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
  };
  const key = `suites.matha.common.status.${status}`;
  const hit = t(key);
  const label = hit === key ? status.replace(/-/g, ' ') : hit;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${tones[status] || 'bg-stone-100 text-stone-600'}`}>
      {label}
    </span>
  );
};

/** INR formatter. */
/** @deprecated Hard-codes ₹. Components must bind `useInr()` from
 * hooks/useWorkspaceInr so amounts render in the workspace currency
 * (QUEUED #60). Kept only so no legacy import breaks. */
export const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

/** yyyy-mm-dd → readable. */
export const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** HH:MM → 12h readable. */
export const fmtTime = (hhmm: string) => {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

/** MM-DD → readable month-day. */
export const fmtMonthDay = (mmdd: string) => {
  if (!mmdd) return '—';
  const [m, d] = mmdd.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${names[Number(m) - 1] || ''}`;
};
