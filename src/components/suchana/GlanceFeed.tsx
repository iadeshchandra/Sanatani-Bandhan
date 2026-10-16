/**
 * GlanceFeed.tsx — "What needs me" unified feed for the Suchana tab.
 * =====================================================================
 * Merges personal Suchana (Panjika + module intelligence) with per-org
 * glance cards into one ranked stream.
 *
 * TWO TEMPLATES (never one view with hidden items):
 *  - Steward cards: decision-focused — amber accent, action counts,
 *    "needs your decision" language. For Trustee/Accountant/SuperAdmin.
 *  - Member cards: community-focused — calm cards, event/announcement
 *    language. For Priest/Sevadar/Devotee.
 * Personal cards use the serene Suchana style from SuchanaFeed.
 *
 * Sanatani vibe: 🪔 language, dawn-warm palette. Urgent = warm amber,
 * NEVER red. No badge-count anxiety.
 */
import React, { useMemo, useState } from 'react';
import { T } from '../../solo/ui';
import { useLanguage } from '../../context/LanguageContext';
import { Skeleton } from '../common/Skeleton';
import { blessingOfDay } from '../../lib/panjikaIntelligence';
import { cacheAgeText } from '../../lib/glanceCache';
import {
  filterGlanceByOrg,
  type GlanceItem,
  type GlanceAudience,
} from '../../lib/glanceFeed';
import type { SuchanaSeverity } from '../../lib/suchanaFeed';

function lang3(item: { en: string; bn: string; hi: string }, lang: string): string {
  if (lang === 'bn') return item.bn || item.en;
  if (lang === 'hi') return item.hi || item.en;
  return item.en;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function whenLabel(iso: string | null, lang: string): string | null {
  if (!iso) return null;
  try {
    const diff = Math.round(
      (new Date(iso + 'T12:00:00').getTime() - new Date(todayISO() + 'T12:00:00').getTime()) / 86400000
    );
    if (diff <= 0) return lang === 'bn' ? 'আজ' : lang === 'hi' ? 'आज' : 'today';
    if (diff === 1) return lang === 'bn' ? 'আগামীকাল' : lang === 'hi' ? 'कल' : 'tomorrow';
    const unit = lang === 'bn' ? 'দিনে' : lang === 'hi' ? 'दिन में' : 'days';
    return lang === 'bn' || lang === 'hi' ? `${diff} ${unit}` : `in ${diff} ${unit}`;
  } catch {
    return null;
  }
}

const SEVERITY_STYLE: Record<SuchanaSeverity, string> = {
  urgent: 'border-amber-300 bg-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]',
  attention: 'border-orange-200 bg-orange-50/70',
  nudge: 'border-amber-100 bg-white',
  info: 'border-stone-200 bg-stone-50/60',
};

const SEVERITY_DOT: Record<SuchanaSeverity, string> = {
  urgent: 'bg-amber-500',
  attention: 'bg-orange-400',
  nudge: 'bg-amber-300',
  info: 'bg-stone-300',
};

const AUDIENCE_ICON: Record<GlanceAudience, string> = {
  personal: '🪔',
  steward: '🏛️',
  member: '🙏',
};

/** Steward card — decision-focused layout: count-forward, action verb first. */
const StewardCard: React.FC<{
  item: GlanceItem;
  lang: string;
  when: string | null;
  onAction?: (route: string) => void;
}> = ({ item, lang, when, onAction }) => (
  <article
    className={`rounded-2xl border p-4 flex gap-3 ${SEVERITY_STYLE[item.severity]}`}
    aria-label={lang3(item.title, lang)}
  >
    <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl">
      <span aria-hidden>{AUDIENCE_ICON[item.audience]}</span>
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[item.severity]}`} aria-hidden />
        <h3 className="font-extrabold text-stone-900 text-sm leading-snug">{lang3(item.title, lang)}</h3>
      </div>
      {item.orgName && (
        <div className="text-[11px] font-bold text-amber-700 mt-0.5 truncate">🏛️ {item.orgName}</div>
      )}
      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{lang3(item.message, lang)}</p>
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {when && (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">{when}</span>
        )}
        <button
          type="button"
          onClick={() => onAction?.(item.actionRoute)}
          className="ml-auto px-4 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-xs font-black transition-colors"
        >
          {lang3(item.actionLabel, lang)}
        </button>
      </div>
    </div>
  </article>
);

/** Member card — community-focused layout: calm, invitation tone. */
const MemberCard: React.FC<{
  item: GlanceItem;
  lang: string;
  when: string | null;
  onAction?: (route: string) => void;
}> = ({ item, lang, when, onAction }) => (
  <article
    className="rounded-2xl border border-stone-200 bg-white p-4"
    aria-label={lang3(item.title, lang)}
  >
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg">
        <span aria-hidden>{AUDIENCE_ICON[item.audience]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-stone-800 text-sm leading-snug">{lang3(item.title, lang)}</h3>
        {item.orgName && (
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">{item.orgName}</div>
        )}
      </div>
      {when && (
        <span className="shrink-0 text-[11px] font-bold text-stone-500 bg-stone-100 rounded-full px-2.5 py-1">{when}</span>
      )}
    </div>
    <p className="text-xs text-stone-600 mt-2 leading-relaxed">{lang3(item.message, lang)}</p>
    <button
      type="button"
      onClick={() => onAction?.(item.actionRoute)}
      className="mt-2.5 w-full px-4 py-2 min-h-[44px] rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50 text-stone-700 text-xs font-bold transition-colors"
    >
      {lang3(item.actionLabel, lang)}
    </button>
  </article>
);

/** Personal card — serene Suchana style. */
const PersonalCard: React.FC<{
  item: GlanceItem;
  lang: string;
  when: string | null;
  onAction?: (route: string) => void;
}> = ({ item, lang, when, onAction }) => (
  <article
    className={`rounded-2xl border p-4 ${SEVERITY_STYLE[item.severity]}`}
    aria-label={lang3(item.title, lang)}
  >
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[item.severity]}`} aria-hidden />
      <h3 className="font-extrabold text-stone-900 text-sm leading-snug flex-1">{lang3(item.title, lang)}</h3>
      <span className="text-base shrink-0" aria-hidden>
        {item.source === 'panjika' ? '🗓️' : '📦'}
      </span>
    </div>
    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{lang3(item.message, lang)}</p>
    <div className="flex items-center gap-2 mt-2.5">
      {when && <span className="text-[11px] font-bold text-stone-500">{when}</span>}
      <button
        type="button"
        onClick={() => onAction?.(item.actionRoute)}
        className="ml-auto px-4 py-2 min-h-[44px] rounded-xl bg-temple-950 hover:bg-temple-900 text-amber-100 text-xs font-bold transition-colors"
      >
        {lang3(item.actionLabel, lang)}
      </button>
    </div>
  </article>
);

export const GlanceFeed: React.FC<{
  items: GlanceItem[];
  orgs: Array<{ id: string; name: string }>;
  loading?: boolean;
  offline?: boolean;
  updatedAt?: number;
  onAction?: (route: string) => void;
}> = ({ items, orgs, loading, offline, updatedAt, onAction }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [orgFilter, setOrgFilter] = useState('all');

  const visible = useMemo(() => filterGlanceByOrg(items, orgFilter), [items, orgFilter]);

  const blessing = useMemo(() => {
    try {
      const b = blessingOfDay(todayISO());
      return lang3(b, lang);
    } catch {
      return lang === 'bn'
        ? 'শুভ দিন — ধর্ম আপনার সঙ্গে আছে।'
        : lang === 'hi'
          ? 'शुभ दिन — धर्म आपके साथ है।'
          : 'A blessed day — dharma walks with you.';
    }
  }, [lang]);

  if (loading) {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Loading guidance">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full mt-2 opacity-70" />
            <Skeleton className="h-3 w-2/3 mt-1.5 opacity-70" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Offline badge */}
      {offline && updatedAt && (
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-stone-500 bg-stone-100 rounded-full px-4 py-2">
          <span aria-hidden>📴</span>
          <T en="Offline" bn="অফলাইন" hi="ऑफ़लाइन" />
          <span aria-hidden>·</span>
          <span>{cacheAgeText(updatedAt, lang as 'en' | 'bn' | 'hi')}</span>
        </div>
      )}

      {/* Filter chips: All + per-org */}
      {orgs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by organisation">
          <button
            key="all"
            type="button"
            role="tab"
            aria-selected={orgFilter === 'all'}
            onClick={() => setOrgFilter('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold min-h-[44px] transition-colors ${
              orgFilter === 'all'
                ? 'bg-temple-950 text-amber-100'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
            }`}
          >
            <T en="All" bn="সব" hi="सभी" />
          </button>
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={orgFilter === o.id}
              onClick={() => setOrgFilter(o.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold min-h-[44px] max-w-[200px] truncate transition-colors ${
                orgFilter === o.id
                  ? 'bg-temple-950 text-amber-100'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
              }`}
            >
              🏛️ {o.name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-10 px-6">
          <div className="text-5xl" aria-hidden>
            🪔
          </div>
          <p className="text-sm font-bold text-stone-700 mt-4 leading-relaxed">{blessing}</p>
          <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto leading-relaxed">
            <T
              en="Nothing needs you right now. Your path is clear — tend to your practice, and Suchana will guide you when the time comes."
              bn="এই মুহূর্তে আপনার কিছু করার নেই। আপনার পথ পরিষ্কার — সাধনায় মন দিন, সময় হলে সূচনা পথ দেখাবে।"
              hi="अभी आपको कुछ नहीं करना है। आपका पथ स्पष्ट है — साधना में लगे रहें, समय आने पर सूचना मार्ग दिखाएगी।"
            />
          </p>
        </div>
      ) : (
        visible.map((item) => {
          const when = whenLabel(item.date, lang);
          if (item.audience === 'steward' && item.orgId) {
            return <StewardCard key={item.id} item={item} lang={lang} when={when} onAction={onAction} />;
          }
          if (item.audience === 'member' && item.orgId) {
            return <MemberCard key={item.id} item={item} lang={lang} when={when} onAction={onAction} />;
          }
          return <PersonalCard key={item.id} item={item} lang={lang} when={when} onAction={onAction} />;
        })
      )}
    </div>
  );
};
