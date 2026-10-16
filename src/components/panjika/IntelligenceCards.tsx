/**
 * IntelligenceCards.tsx — role-aware Panjika Intelligence cards for dashboards.
 * =====================================================================
 * - UtsavReadinessCard (trustee): next major festival, countdown, interactive
 *   preparation checklist stored per workspace.
 * - AgamiSevaCard (purohit/jyotishi): upcoming demand — season openings,
 *   festival booking surges.
 * - LunarClosingCard (accountant): lunar-month closing nudge + festival
 *   donation forecast.
 *
 * Self-contained: Tailwind + lucide-react only. Devotional tone throughout.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Sparkles, MoonStar, Coins } from 'lucide-react';
import {
  generateReminders, loadIntelConfig,
  type IntelConfig, type IntelRole, type Lang3,
} from '../../lib/panjikaIntelligence';
import { checklistFor as checklistTemplateFor } from '../../lib/festivalChecklists';

function pickLang(l: Lang3, lang: string): string {
  if (lang === 'bn') return l.bn;
  if (lang === 'hi') return l.hi;
  return l.en;
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function useLang(): string {
  try {
    const v = localStorage.getItem('sb_lang') || localStorage.getItem('sanatani_lang') || 'en';
    return v.startsWith('bn') ? 'bn' : v.startsWith('hi') ? 'hi' : 'en';
  } catch { return 'en'; }
}

const cardCls =
  'rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 shadow-sm';

/* ------------------------------------------------------------------ */
/* Utsav Readiness — trustee                                           */
/* ------------------------------------------------------------------ */

export const UtsavReadinessCard: React.FC<{ workspaceId?: string; onPlan?: () => void }> = ({
  workspaceId = 'default',
  onPlan,
}) => {
  const lang = useLang();
  const [config, setConfig] = useState<IntelConfig | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const today = useMemo(() => isoOf(new Date()), []);

  useEffect(() => {
    let live = true;
    loadIntelConfig().then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, []);

  const nextFestival = useMemo(() => {
    try {
      const rs = generateReminders('trustee', today, 90, undefined, config || undefined);
      return rs.find((r) =>
        ['durga_puja', 'diwali', 'navratri', 'rath_yatra', 'janmashtami'].includes(r.eventType)
      ) || null;
    } catch { return null; }
  }, [today, config]);

  const checklist = useMemo(
    () => (nextFestival ? checklistTemplateFor(nextFestival.eventName.en) : null),
    [nextFestival]
  );

  const storeKey = useMemo(
    () => `sb_utsav_checklist_${workspaceId}_${nextFestival?.eventDateISO || 'none'}`,
    [workspaceId, nextFestival]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch { setChecked({}); }
  }, [storeKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  if (!nextFestival) return null;
  const trusteeItems = (checklist?.items || []).filter((i) => i.role === 'trustee');
  const done = trusteeItems.filter((i) => checked[i.id]).length;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-orange-700" />
          <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
            {lang === 'bn' ? 'উৎসব প্রস্তুতি' : lang === 'hi' ? 'उत्सव तैयारी' : 'Utsav Readiness'}
          </h3>
        </div>
        <span className="text-[11px] font-bold text-orange-800 bg-orange-100 rounded-full px-2.5 py-1">
          {nextFestival.daysUntil === 0
            ? (lang === 'bn' ? 'আজ' : lang === 'hi' ? 'आज' : 'today')
            : `${nextFestival.daysUntil} ${lang === 'bn' ? 'দিন বাকি' : lang === 'hi' ? 'दिन शेष' : 'days to go'}`}
        </span>
      </div>
      <p className="text-sm font-bold text-orange-900 mt-2">
        {pickLang(nextFestival.eventName, lang)}
      </p>
      <p className="text-xs text-stone-500 mt-0.5">{pickLang(nextFestival.message, lang)}</p>

      {trusteeItems.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            {lang === 'bn' ? 'প্রস্তুতি তালিকা' : lang === 'hi' ? 'तैयारी सूची' : 'Preparation'} — {done}/{trusteeItems.length}
          </div>
          <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
              style={{ width: `${trusteeItems.length ? (done / trusteeItems.length) * 100 : 0}%` }}
            />
          </div>
          {trusteeItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full flex items-start gap-2.5 text-left rounded-xl bg-white/70 border border-amber-100 px-3 py-2.5 min-h-[44px] hover:border-amber-300"
            >
              {checked[item.id]
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-stone-300 shrink-0 mt-0.5" />}
              <span className={`text-[13px] ${checked[item.id] ? 'line-through text-stone-400' : 'text-stone-700 font-medium'}`}>
                {pickLang(item.text, lang)}
              </span>
            </button>
          ))}
        </div>
      )}

      {onPlan && (
        <button
          type="button"
          onClick={onPlan}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-orange-700 text-white text-sm font-bold hover:bg-orange-800"
        >
          {lang === 'bn' ? 'উৎসব পরিকল্পনা খুলুন →' : lang === 'hi' ? 'उत्सव योजना खोलें →' : 'Open Utsav planning →'}
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Agami Seva — purohit / jyotishi (upcoming demand)                   */
/* ------------------------------------------------------------------ */

export const AgamiSevaCard: React.FC<{
  role: 'purohit' | 'jyotishi';
  onAction?: (tab: string) => void;
}> = ({ role, onAction }) => {
  const lang = useLang();
  const [config, setConfig] = useState<IntelConfig | null>(null);
  const today = useMemo(() => isoOf(new Date()), []);

  useEffect(() => {
    let live = true;
    loadIntelConfig().then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, []);

  const reminders = useMemo(() => {
    try {
      return generateReminders(role as IntelRole, today, 45, undefined, config || undefined).slice(0, 3);
    } catch { return []; }
  }, [role, today, config]);

  if (reminders.length === 0) return null;

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-orange-700" />
        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
          {lang === 'bn' ? 'আগামী সেবা' : lang === 'hi' ? 'आगामी सेवा' : 'Agami Seva'}
        </h3>
        <span className="text-[11px] text-stone-500">
          {lang === 'bn' ? '— আসন্ন চাহিদা' : lang === 'hi' ? '— आगामी मांग' : '— upcoming demand'}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {reminders.map((r, i) => (
          <button
            key={`${r.eventType}-${i}`}
            type="button"
            onClick={() => onAction?.(r.actionTab)}
            className="w-full text-left rounded-xl bg-white/70 border border-amber-100 p-3 min-h-[44px] hover:border-amber-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-bold text-stone-800">{pickLang(r.title, lang)}</div>
              <span className="shrink-0 text-[11px] font-bold text-orange-800 bg-orange-100 rounded-full px-2 py-0.5">
                {r.daysUntil === 0 ? (lang === 'bn' ? 'আজ' : 'today') : `${r.daysUntil}d`}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{pickLang(r.message, lang)}</p>
            <div className="mt-1.5 text-xs font-bold text-orange-700">{pickLang(r.actionLabel, lang)} →</div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Lunar closing — accountant                                          */
/* ------------------------------------------------------------------ */

export const LunarClosingCard: React.FC<{ onOpenTreasury?: () => void }> = ({ onOpenTreasury }) => {
  const lang = useLang();
  const [config, setConfig] = useState<IntelConfig | null>(null);
  const today = useMemo(() => isoOf(new Date()), []);

  useEffect(() => {
    let live = true;
    loadIntelConfig().then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, []);

  const reminders = useMemo(() => {
    try {
      return generateReminders('accountant', today, 30, undefined, config || undefined).slice(0, 2);
    } catch { return []; }
  }, [today, config]);

  if (reminders.length === 0) return null;

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        {reminders[0].eventType === 'amavasya'
          ? <MoonStar className="w-5 h-5 text-orange-700" />
          : <Coins className="w-5 h-5 text-orange-700" />}
        <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
          {lang === 'bn' ? 'হিসাব-নিকাশ' : lang === 'hi' ? 'हिसाब-किताब' : 'Accounts & Closing'}
        </h3>
      </div>
      <div className="mt-3 space-y-2">
        {reminders.map((r, i) => (
          <div key={`${r.eventType}-${i}`} className="rounded-xl bg-white/70 border border-amber-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-bold text-stone-800">{pickLang(r.title, lang)}</div>
              <span className="shrink-0 text-[11px] font-bold text-orange-800 bg-orange-100 rounded-full px-2 py-0.5">
                {r.daysUntil === 0 ? (lang === 'bn' ? 'আজ' : 'today') : `${r.daysUntil}d`}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{pickLang(r.message, lang)}</p>
          </div>
        ))}
      </div>
      {onOpenTreasury && (
        <button
          type="button"
          onClick={onOpenTreasury}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-orange-700 text-white text-sm font-bold hover:bg-orange-800"
        >
          {lang === 'bn' ? 'ভাণ্ডার খুলুন →' : lang === 'hi' ? 'भंडार खोलें →' : 'Open Treasury →'}
        </button>
      )}
    </div>
  );
};
