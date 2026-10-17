/**
 * SuchanaFeed.tsx — The unified Suchana feed UI.
 * =================================================
 * Renders merged Panjika + module intelligence as one calm stream.
 * Two modes:
 *   - "digest": compact, for Solo home / dashboards (top items)
 *   - "full":   filter chips (All / Panjika / Modules / Urgent), up to 50
 *
 * Sanatani vibe: 🪔 language, dawn-warm palette, generous whitespace.
 * Urgent = warm amber accent — NEVER red alarms on sacred content.
 * No badge-count anxiety, no countdown pressure.
 */
import React, { useMemo, useState } from 'react';
import { T } from '../../solo/ui';
import { useLanguage } from '../../context/LanguageContext';
import { blessingOfDay } from '../../lib/panjikaIntelligence';
import type { SuchanaItem, SuchanaSeverity } from '../../lib/suchanaFeed';
import { useSuchana } from './useSuchana';

type FeedMode = 'digest' | 'full';
type FilterKind = 'all' | 'panjika' | 'module' | 'urgent';

function lang3(item: { en: string; bn: string; hi: string }, lang: string): string {
  if (lang === 'bn') return item.bn || item.en;
  if (lang === 'hi') return item.hi || item.en;
  return item.en;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "in N days" / "today" / "tomorrow" — gentle, never alarming. */
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
  // Warm amber accent for urgent — calm, never alarming red.
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

const SOURCE_ICON: Record<string, string> = { panjika: '🗓️', module: '📦' };

/** One time-grouped section of the full feed ("Today" / "Earlier"). */
function FeedGroup({
  title,
  items,
  lang,
  onAction,
}: {
  title: React.ReactNode;
  items: SuchanaItem[];
  lang: string;
  onAction?: (route: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={typeof title === 'string' ? title : undefined}>
      <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-2 px-1">
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => {
          const when = whenLabel(item.date, lang);
          return (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 ${SEVERITY_STYLE[item.severity]}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0 mt-0.5" aria-hidden>
                  {SOURCE_ICON[item.source] || '🪔'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-stone-800 leading-snug">
                      {lang3(item.title, lang)}
                    </h4>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {when && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          {when}
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${SEVERITY_DOT[item.severity]}`}
                        aria-hidden
                      />
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    {lang3(item.message, lang)}
                  </p>
                  {onAction && item.actionRoute && (
                    <button
                      type="button"
                      onClick={() => onAction(item.actionRoute)}
                      className="mt-2.5 text-xs font-bold text-orange-700 hover:text-orange-800 min-h-[44px] px-1 -ml-1"
                    >
                      {lang3(item.actionLabel, lang)} →
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const SuchanaFeed: React.FC<{
  items: SuchanaItem[];
  mode?: FeedMode;
  onAction?: (route: string) => void;
  maxItems?: number;
}> = ({ items, mode = 'digest', onAction, maxItems }) => {  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [filter, setFilter] = useState<FilterKind>('all');

  const visible = useMemo(() => {
    let list = items || [];
    if (mode === 'full') {
      if (filter === 'panjika') list = list.filter((i) => i.source === 'panjika');
      else if (filter === 'module') list = list.filter((i) => i.source === 'module');
      else if (filter === 'urgent')
        list = list.filter((i) => i.severity === 'urgent' || i.severity === 'attention');
    }
    return typeof maxItems === 'number' ? list.slice(0, maxItems) : list;
  }, [items, mode, filter, maxItems]);

  // Time-grouping for the full view (spec §3 — "Today / Earlier").
  // Items carry only the date they relate to, so "Today" means dated
  // today or timeless; "Earlier" means the date has already passed.
  const { todayItems, earlierItems } = useMemo(() => {
    const today = todayISO();
    const t: SuchanaItem[] = [];
    const e: SuchanaItem[] = [];
    for (const item of visible) {
      if (item.date && item.date < today) e.push(item);
      else t.push(item);
    }
    return { todayItems: t, earlierItems: e };
  }, [visible]);

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

  const chips: Array<{ id: FilterKind; label: React.ReactNode }> = [
    { id: 'all', label: <T en="All" bn="সব" hi="सभी" /> },
    { id: 'panjika', label: <T en="🗓️ Panjika" bn="🗓️ পঞ্জিকা" hi="🗓️ पंजिका" /> },
    { id: 'module', label: <T en="📦 Modules" bn="📦 মডিউল" hi="📦 मॉड्यूल" /> },
    { id: 'urgent', label: <T en="⚠️ Needs care" bn="⚠️ যত্ন দরকার" hi="⚠️ ध्यान चाहिए" /> },
  ];

  return (
    <div className="space-y-2.5">
      {mode === 'full' && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Suchana filters">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold min-h-[44px] transition-colors ${
                filter === c.id
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
          <div className="text-3xl mb-2" aria-hidden>
            🪔
          </div>
          <p className="text-sm text-stone-600 italic leading-relaxed">{blessing}</p>
        </div>
      ) : mode === 'full' ? (
        <div className="space-y-5">
          <FeedGroup
            title={<T en="Today" bn="আজ" hi="आज" />}
            items={todayItems}
            lang={lang}
            onAction={onAction}
          />
          {earlierItems.length > 0 && (
            <FeedGroup
              title={<T en="Earlier" bn="আগের" hi="पहले की" />}
              items={earlierItems}
              lang={lang}
              onAction={onAction}
            />
          )}
        </div>
      ) : (
        visible.map((item) => {
          const when = whenLabel(item.date, lang);
          return (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 ${SEVERITY_STYLE[item.severity]}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0 mt-0.5" aria-hidden>
                  {SOURCE_ICON[item.source] || '🪔'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-stone-800 leading-snug">
                      {lang3(item.title, lang)}
                    </h4>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {when && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                          {when}
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${SEVERITY_DOT[item.severity]}`}
                        aria-hidden
                      />
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    {lang3(item.message, lang)}
                  </p>
                  {onAction && item.actionRoute && (
                    <button
                      type="button"
                      onClick={() => onAction(item.actionRoute)}
                      className="mt-2.5 text-xs font-bold text-orange-700 hover:text-orange-800 min-h-[44px] px-1 -ml-1"
                    >
                      {lang3(item.actionLabel, lang)} →
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};

/**
 * SuchanaFeedLive — Solo-tree wrapper that fetches its own merged data
 * via the useSuchana hook. Use inside SoloProvider.
 */
export const SuchanaFeedLive: React.FC<{
  role: string;
  mode?: FeedMode;
  onAction?: (route: string) => void;
  maxItems?: number;
  daysAhead?: number;
}> = ({ role, mode = 'digest', onAction, maxItems, daysAhead }) => {
  const { items, loading } = useSuchana(role, daysAhead ?? (mode === 'digest' ? 7 : 30));
  if (loading && items.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-center">
        <div className="text-2xl animate-pulse" aria-hidden>
          🪔
        </div>
        <p className="text-xs text-stone-500 mt-2">
          <T en="Gathering today's suchana…" bn="আজকের সূচনা সংগ্রহ হচ্ছে…" hi="आज की सूचना एकत्र हो रही है…" />
        </p>
      </div>
    );
  }
  return <SuchanaFeed items={items} mode={mode} onAction={onAction} maxItems={maxItems} />;
};
