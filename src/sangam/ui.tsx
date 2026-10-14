import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { AuthorKind, VerificationTier } from './types';

/* Sangam — shared UI primitives (locale-aware, saffron/indigo palette).
 *
 * LOCALE CONTRACT: English default, Bengali/Hindi via LanguageContext.
 * Domain terms stay Sanatani (Sangam / Ashirvad / Seva) with English
 * subtitles; never hardcoded to one language.
 *
 * TRUST: VerificationBadge is the single shared badge component — the
 * same tier language as Purohit One / Jyotish One. Tiers are display
 * only; Firestore rules validate them against canonical profiles.
 */

/** Locale-aware label. English default; Bengali/Hindi when the app locale switches. */
export const T: React.FC<{ en: string; bn: string; hi?: string; className?: string }> = ({
  en, bn, hi, className = '',
}) => {
  const { safeTranslate, currentLang } = useLanguage();
  const primary = safeTranslate('sangam.label', en, bn, hi);
  const showGloss = currentLang !== 'en' && primary !== en;
  return (
    <span className={className}>
      <span className="font-bold">{primary}</span>
      {showGloss && <span className="text-stone-500 font-normal text-[0.85em]"> ({en})</span>}
    </span>
  );
};

export const useLocaleText = () => {
  const { currentLang, safeTranslate } = useLanguage();
  return { lang: currentLang, tr: (en: string, bn: string, hi?: string) => safeTranslate('sangam.label', en, bn, hi) };
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-orange-100 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }> = ({
  variant = 'primary', className = '', ...rest
}) => {
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-500 shadow'
        : variant === 'soft'
          ? 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
          : 'bg-transparent text-stone-600 hover:bg-stone-100';
  return (
    <button
      {...rest}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors min-h-[44px] disabled:opacity-50 ${styles} ${className}`}
    />
  );
};

export const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold text-stone-600 mb-1">{label}</span>
    {children}
  </label>
);

export const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[44px]';

export const Modal: React.FC<{ onClose: () => void; title: React.ReactNode; children: React.ReactNode }> = ({
  onClose, title, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
    <div className="absolute inset-0 bg-temple-950/60" onClick={onClose} />
    <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold text-stone-800">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold">✕</button>
      </div>
      {children}
    </div>
  </div>
);

/** The single shared verification badge — same tier language as Purohit/Jyotish One. */
export const VerificationBadge: React.FC<{ tier?: VerificationTier; kind?: AuthorKind; official?: boolean; size?: 'sm' | 'md' }> = ({
  tier, kind, official, size = 'sm',
}) => {
  const { tr } = useLocaleText();
  if (official) {
    return (
      <span
        title={tr('Official organisation page', 'অফিসিয়াল প্রতিষ্ঠান পৃষ্ঠা', 'आधिकारिक संस्था पृष्ठ')}
        className={`inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white font-black ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      >
        <span aria-hidden>🏛️</span> {tr('OFFICIAL', 'অফিসিয়াল', 'आधिकारिक')}
      </span>
    );
  }
  if (kind !== 'purohit' && kind !== 'jyotish') return null;
  const labels: Record<VerificationTier, string> = {
    REGISTERED: tr('Registered', 'নিবন্ধিত', 'पंजीकृत'),
    CREDENTIAL_VERIFIED: tr('Verified', 'যাচাইকৃত', 'सत्यापित'),
    ORG_ENDORSED: tr('Endorsed', 'অনুমোদিত', 'समर्थित'),
    PLATFORM_VERIFIED: tr('Platform Verified', 'প্ল্যাটফর্ম যাচাইকৃত', 'मंच सत्यापित'),
  };
  const tones: Record<VerificationTier, string> = {
    REGISTERED: 'bg-stone-100 text-stone-700 border-stone-200',
    CREDENTIAL_VERIFIED: 'bg-sky-50 text-sky-800 border-sky-200',
    ORG_ENDORSED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    PLATFORM_VERIFIED: 'bg-amber-50 text-amber-800 border-amber-300',
  };
  const t = tier || 'REGISTERED';
  return (
    <span
      title={tr('Identity verified by Sanatani Bandhan', 'পরিচয় যাচাইকৃত', 'पहचान सत्यापित')}
      className={`inline-flex items-center gap-1 rounded-full border font-black ${tones[t]} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      <span aria-hidden>{t === 'PLATFORM_VERIFIED' ? '🛡️' : t === 'ORG_ENDORSED' ? '🤝' : t === 'CREDENTIAL_VERIFIED' ? '✓' : '•'}</span>
      {labels[t]}
    </span>
  );
};

/** Author line: name + SAN id + badges. Used on posts, comments, circles. */
export const AuthorLine: React.FC<{
  name: string; sanId: string; kind: AuthorKind; tier?: VerificationTier; official?: boolean; time?: number;
}> = ({ name, sanId, kind, tier, official, time }) => {
  const { tr, lang } = useLocaleText();
  const ago = (ts?: number) => {
    if (!ts) return '';
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return tr('just now', 'এইমাত্র', 'अभी');
    if (m < 60) return tr(`${m}m ago`, `${m}মি আগে`, `${m} मि पहले`);
    const h = Math.floor(m / 60);
    if (h < 24) return tr(`${h}h ago`, `${h}ঘ আগে`, `${h} घं पहले`);
    const d = Math.floor(h / 24);
    return tr(`${d}d ago`, `${d}দি আগে`, `${d} दि पहले`);
  };
  void lang;
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shrink-0" aria-hidden>
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-extrabold text-stone-800 text-sm truncate">{name}</span>
          <VerificationBadge tier={tier} kind={kind} official={official} />
        </div>
        <div className="text-[11px] text-stone-500 font-mono truncate">
          {sanId}
          {kind === 'purohit' && <span> · {tr('Purohit', 'পুরোহিত', 'पुरोहित')}</span>}
          {kind === 'jyotish' && <span> · {tr('Jyotishi', 'জ্যোতিষী', 'ज्योतिषी')}</span>}
          {time ? <span> · {ago(time)}</span> : null}
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ icon: string; title: React.ReactNode; body: React.ReactNode }> = ({ icon, title, body }) => (
  <div className="text-center py-10 px-6">
    <div className="text-4xl mb-3" aria-hidden>{icon}</div>
    <div className="font-extrabold text-stone-700 mb-1">{title}</div>
    <div className="text-sm text-stone-500 max-w-sm mx-auto">{body}</div>
  </div>
);

/** Honest offline label — the feed never pretends to be live when it isn't. */
export const SyncLabel: React.FC<{ online: boolean; lastSyncedAt: number | null }> = ({ online, lastSyncedAt }) => {
  const { tr } = useLocaleText();
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
        <span aria-hidden>📴</span> {tr('Offline — showing your saved feed', 'অফলাইন — সংরক্ষিত ফিড', 'ऑफ़लाइन — सहेजा फ़ीड')}
      </span>
    );
  }
  if (lastSyncedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
        <span aria-hidden>✓</span> {tr('Synced', 'সিঙ্কড', 'सिंक्ड')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-50 border border-stone-200 rounded-full px-2.5 py-1">
      <span aria-hidden>📱</span> {tr('On this device', 'এই ডিভাইসে', 'इस डिवाइस पर')}
    </span>
  );
};
