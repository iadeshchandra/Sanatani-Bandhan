import React, { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — shared UI primitives (locale-aware, Sanatani palette).
 *
 * Phase 2d3: all display strings resolve through t('suites.goshala.…')
 * with English fallback. Enum values (statuses, kinds, duties, heads,
 * plans) map to translation keys below; print tables reuse the same maps.
 */

const K = 'suites.goshala';

/** Enum value → translation key maps (shared by selects, pills, print tables). */
export const STATUS_KEY: Record<string, string> = {
  milking: `${K}.common.statusMilking`,
  dry: `${K}.common.statusDry`,
  pregnant: `${K}.common.statusPregnant`,
  sick: `${K}.common.statusSick`,
  retired: `${K}.common.statusRetired`,
  vatsa: `${K}.common.statusVatsa`,
  quarantine: `${K}.common.statusQuarantine`,
};
export const SEX_KEY: Record<string, string> = {
  cow: `${K}.nandi.sexCow`,
  bull: `${K}.nandi.sexBull`,
  vatsa: `${K}.nandi.sexVatsa`,
};
export const SOURCE_KEY: Record<string, string> = {
  rescued: `${K}.nandi.srcRescued`,
  donated: `${K}.nandi.srcDonated`,
  born: `${K}.nandi.srcBorn`,
  purchased: `${K}.nandi.srcPurchased`,
};
export const HEALTH_KIND_KEY: Record<string, string> = {
  vaccination: `${K}.swasthya.kindVaccination`,
  deworming: `${K}.swasthya.kindDeworming`,
  treatment: `${K}.swasthya.kindTreatment`,
  checkup: `${K}.swasthya.kindCheckup`,
};
export const DISPOSAL_KIND_KEY: Record<string, string> = {
  sold: `${K}.dugdha.kindSold`,
  distributed: `${K}.dugdha.kindDistributed`,
  donated: `${K}.dugdha.kindDonated`,
  consumed: `${K}.dugdha.kindConsumed`,
};
export const FODDER_KIND_KEY: Record<string, string> = {
  green: `${K}.chara.kindGreen`,
  dry: `${K}.chara.kindDry`,
  concentrate: `${K}.chara.kindConcentrate`,
  mineral: `${K}.chara.kindMineral`,
};
export const DUTY_KIND_KEY: Record<string, string> = {
  feeding: `${K}.roster.dutyFeeding`,
  cleaning: `${K}.roster.dutyCleaning`,
  milking: `${K}.roster.dutyMilking`,
  'vet-assist': `${K}.roster.dutyVetAssist`,
  security: `${K}.roster.dutySecurity`,
};
export const EXPENSE_HEAD_KEY: Record<string, string> = {
  feed: `${K}.vyaya.headFeed`,
  vet: `${K}.vyaya.headVet`,
  staff: `${K}.vyaya.headStaff`,
  maintenance: `${K}.vyaya.headMaintenance`,
  other: `${K}.vyaya.headOther`,
};
export const GRANT_STATUS_KEY: Record<string, string> = {
  applied: `${K}.grant.stApplied`,
  pending: `${K}.grant.stPending`,
  approved: `${K}.grant.stApproved`,
  received: `${K}.grant.stReceived`,
  rejected: `${K}.grant.stRejected`,
};
export const SPONSOR_PLAN_KEY: Record<string, string> = {
  monthly: `${K}.sponsorship.planMonthly`,
  quarterly: `${K}.sponsorship.planQuarterly`,
  yearly: `${K}.sponsorship.planYearly`,
  'one-time': `${K}.sponsorship.planOneTime`,
};
export const SPONSOR_STATUS_KEY: Record<string, string> = {
  active: `${K}.sponsorship.stActive`,
  expiring: `${K}.sponsorship.stExpiring`,
  expired: `${K}.sponsorship.stExpired`,
};

/** Resolve an enum value through a key map, falling back to the raw value. */
export const labelFor = (t: (key: string) => string, map: Record<string, string>, value: string): string =>
  map[value] ? t(map[value]) : value;

/** Locale-aware label. English default; Bengali/Hindi/Sanskrit via
 * LanguageContext. Domain terms stay Sanatani (Nandi / Vatsa / Gau Mata)
 * with English subtitles; never hardcoded to one language. */
export const T: React.FC<{ en: string; bn: string; hi?: string; sa?: string; className?: string }> = ({
  en,
  bn,
  hi,
  sa,
  className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('goshala.label', en, bn, hi, sa);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

/** Locale text helpers for Goshala tabs. */
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
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold" aria-label={t(`${K}.common.close`)}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/** Tab id → translation key for the tab label. */
const TAB_KEY: Record<string, string> = {
  dashboard: `${K}.common.tabDashboard`,
  nandi: `${K}.common.tabNandi`,
  swasthya: `${K}.common.tabSwasthya`,
  dugdha: `${K}.common.tabDugdha`,
  chara: `${K}.common.tabChara`,
  sponsorship: `${K}.common.tabSponsorship`,
  roster: `${K}.common.tabRoster`,
  grants: `${K}.common.tabGrants`,
  vyaya: `${K}.common.tabVyaya`,
  reports: `${K}.common.tabReports`,
};

/** English fallback labels (also used for the subtitle gloss). */
const TAB_EN: Record<string, string> = {
  dashboard: 'Dashboard',
  nandi: 'Nandi Registry',
  swasthya: 'Swasthya',
  dugdha: 'Dugdha Ledger',
  chara: 'Chara',
  sponsorship: 'Sponsorships',
  roster: 'Duty Roster',
  grants: 'Grants',
  vyaya: 'Vyaya',
  reports: 'Reports',
};

export const Tabs: React.FC<{ tabs: string[]; active: string; onChange: (id: string) => void }> = ({
  tabs, active, onChange,
}) => {
  const { t, currentLang } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-print">
      {tabs.map((id) => {
        const en = TAB_EN[id] ?? id;
        const primary = TAB_KEY[id] ? t(TAB_KEY[id]) : id;
        const showGloss = currentLang !== 'en' && primary !== en;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold border transition min-h-[44px] ${
              active === id
                ? 'bg-gradient-to-r from-amber-700 to-orange-800 text-amber-50 border-amber-800 shadow'
                : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
            }`}
          >
            <span className="font-bold">{primary}</span>
            {showGloss && <span className={`block text-[10px] font-normal ${active === id ? 'text-amber-200' : 'text-stone-400'}`}>{en}</span>}
          </button>
        );
      })}
    </div>
  );
};

/** Status pill for a Nandi's life-state (translated). */
export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const { t } = useLanguage();
  const tones: Record<string, string> = {
    milking: 'bg-emerald-100 text-emerald-800',
    dry: 'bg-stone-100 text-stone-700',
    pregnant: 'bg-sky-100 text-sky-800',
    sick: 'bg-red-100 text-red-800',
    retired: 'bg-amber-100 text-amber-800',
    vatsa: 'bg-orange-100 text-orange-800',
    quarantine: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[status] || tones.dry}`}>
      {labelFor(t, STATUS_KEY, status)}
    </span>
  );
};
