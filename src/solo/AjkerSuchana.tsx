/**
 * AjkerSuchana.tsx — "Today's Briefing" morning digest for the Solo home.
 * =====================================================================
 * Warm dawn gradient, diya motif, devotional tone. This must FEEL like
 * prasad, not a notification center.
 *
 * - Today's tithi/nakshatra line (Drik engine)
 * - Today's shubh window (Abhijit ~ local solar noon)
 * - Upcoming suchana for the user's role (next 7 days, max 3, expandable)
 * - Serene blessing when nothing is upcoming — never an empty box
 */
import React, { useEffect, useMemo, useState } from 'react';
import { T, useLocaleText } from './ui';
import {
  generateReminders, blessingOfDay, getTodayDigest, loadIntelConfig,
  anniversaryReminders,
  type GeneratedReminder, type IntelConfig, type IntelRole, type Lang3,
} from '../lib/panjikaIntelligence';
import { generateAllInsights } from '../lib/appIntelligence';
import {
  mergeSuchana, suchanaForRole, type SuchanaItem,
} from '../lib/suchanaFeed';
import { buildSoloSnapshot } from '../lib/suchanaSnapshot';
import { useSoloStore } from './soloStore';

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

/** Abhijit muhurat ≈ 48 min around local solar noon; approximate from tz. */
function abhijitHint(): string {
  try {
    const tzMin = -new Date().getTimezoneOffset();
    const noonMin = 12 * 60 - (tzMin - 330); // rough IST-anchored solar noon
    const fmt = (m: number) => {
      const h = Math.floor(m / 60); const mm = Math.floor(m % 60);
      const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 === 0 ? 12 : h % 12;
      return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
    };
    return `${fmt(noonMin - 24)} – ${fmt(noonMin + 24)}`;
  } catch { return ''; }
}

export const AjkerSuchana: React.FC<{
  goTab: (t: 'panjika' | 'sadhana' | 'marketplace' | 'sangam') => void;
  role?: IntelRole;
  /** When provided, "view all" opens the full Suchana view instead of expanding. */
  onViewAll?: () => void;
}> = ({ goTab, role = 'solo', onViewAll }) => {
  const { lang } = useLocaleText();
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<IntelConfig | null>(null);
  const { state } = useSoloStore();

  useEffect(() => {
    let live = true;
    loadIntelConfig().then((c) => { if (live) setConfig(c); });
    return () => { live = false; };
  }, []);

  const digest = useMemo(() => getTodayDigest(new Date()), []);
  const todayISO = useMemo(() => isoOf(new Date()), []);
  const blessing = useMemo(() => blessingOfDay(todayISO), [todayISO]);
  const abhijit = useMemo(() => abhijitHint(), []);

  const reminders: GeneratedReminder[] = useMemo(() => {
    try {
      const base = generateReminders(role, todayISO, 7, undefined, config || undefined);
      const anniv = anniversaryReminders(state.samskaras || [], todayISO);
      const merged = [...anniv, ...base];
      const seen = new Set<string>();
      return merged.filter((r) => {
        const k = `${r.eventType}:${r.eventDateISO}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 6);
    } catch { return []; }
  }, [role, todayISO, config, state.samskaras]);

  /**
   * Unified Suchana: panjika foresight + module state insights, merged
   * through the suchanaFeed contract (dedupe + calm ordering + role
   * filter). This EXTENDS the digest data source — rendering below
   * stays the same warm card style.
   */
  const items: SuchanaItem[] = useMemo(() => {
    try {
      const insights = generateAllInsights(role, buildSoloSnapshot(state));
      return suchanaForRole(mergeSuchana(reminders, insights, { digest: true }), role);
    } catch {
      return [];
    }
  }, [role, reminders, state]);

  const shown = expanded ? items : items.slice(0, 3);

  /** Gentle "in N days" label from a SuchanaItem date. */
  const whenLabel = (iso: string | null): string | null => {
    if (!iso) return null;
    try {
      const diff = Math.round(
        (new Date(iso + 'T12:00:00').getTime() - new Date(todayISO + 'T12:00:00').getTime()) / 86400000
      );
      if (diff <= 0) return lang === 'bn' ? 'আজ' : lang === 'hi' ? 'आज' : 'today';
      if (diff === 1) return lang === 'bn' ? 'আগামীকাল' : lang === 'hi' ? 'कल' : 'tomorrow';
      return `${diff} ${lang === 'bn' ? 'দিন' : lang === 'hi' ? 'दिन' : 'days'}`;
    } catch { return null; }
  };

  /** Route a Suchana action into the Solo tab bar (fail-soft to panjika). */
  const routeAction = (route: string) => {
    const soloTabs = ['panjika', 'sadhana', 'marketplace', 'sangam'];
    goTab((soloTabs.includes(route) ? route : 'panjika') as any);
  };

  return (
    <div className="rounded-3xl overflow-hidden shadow-sm border border-orange-200/60">
      {/* Dawn header */}
      <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>🪔</span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
              <T en="Ajker Suchana" bn="আজকের সূচনা" hi="आज की सूचना" />
            </div>
            <div className="text-[11px] text-amber-200/70">
              <T en="Today's briefing, with blessings" bn="আশীর্বাদসহ আজকের বার্তা" hi="आशीर्वाद सहित आज का संदेश" />
            </div>
          </div>
        </div>
        {digest.tithiLine && (
          <p className="mt-3 text-sm font-semibold text-amber-100">{digest.tithiLine}</p>
        )}
        {digest.festivals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {digest.festivals.map((f) => (
              <span key={f.date + f.nameEn} className="text-[11px] font-bold bg-white/15 border border-white/20 rounded-full px-2.5 py-1">
                🎉 {lang === 'bn' ? f.nameBn : f.nameEn}
              </span>
            ))}
          </div>
        )}
        {abhijit && (
          <p className="mt-2 text-xs text-amber-200/90">
            ☀️ <T en="Abhijit muhurat" bn="অভিজিৎ মুহূর্ত" hi="अभिजित मुहूर्त" /> {abhijit} —{' '}
            <T en="ideal for new beginnings" bn="নতুন শুরুর জন্য আদর্শ" hi="नई शुरुआत हेतु आदर्श" />
          </p>
        )}
      </div>

      {/* Suchana list */}
      <div className="bg-amber-50/80 p-4 space-y-2.5">
        {shown.length === 0 ? (
          <p className="text-sm text-stone-600 italic text-center py-2">
            {pickLang(blessing, lang)}
          </p>
        ) : (
          shown.map((item) => {
            const when = whenLabel(item.date);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => routeAction(item.actionRoute)}
                className="w-full text-left rounded-2xl bg-white border border-amber-100 p-3.5 min-h-[44px] hover:border-amber-300 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-stone-800">
                    <span aria-hidden className="mr-1.5">
                      {item.source === 'module' ? '📦' : '🗓️'}
                    </span>
                    {pickLang(item.title, lang)}
                  </div>
                  {when && (
                    <span className="shrink-0 text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      {when}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{pickLang(item.message, lang)}</p>
                <div className="mt-2 text-xs font-bold text-orange-700">
                  {pickLang(item.actionLabel, lang)} →
                </div>
              </button>
            );
          })
        )}
        {items.length > 3 && (
          <button
            type="button"
            onClick={() => (onViewAll ? onViewAll() : setExpanded(!expanded))}
            className="w-full text-center text-xs font-bold text-amber-700 py-2 min-h-[44px]"
          >
            {onViewAll ? (
              lang === 'bn' ? `সব ${items.length}টি সূচনা দেখুন 🪔` : lang === 'hi' ? `सभी ${items.length} सूचनाएं देखें 🪔` : `View all ${items.length} suchana 🪔`
            ) : expanded ? (
              lang === 'bn' ? 'কমান ↑' : lang === 'hi' ? 'समेटें ↑' : 'Show less ↑'
            ) : (
              lang === 'bn' ? `আরও ${items.length - 3}টি সূচনা ↓` : lang === 'hi' ? `और ${items.length - 3} सूचनाएं ↓` : `View all ${items.length} suchana ↓`
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => goTab('panjika')}
          className="w-full text-center text-xs font-bold text-stone-500 py-1.5 min-h-[44px]"
        >
          <T en="Open full Panjika 🗓️" bn="পূর্ণ পঞ্জিকা খুলুন 🗓️" hi="पूर्ण पंजिका खोलें 🗓️" />
        </button>
      </div>
    </div>
  );
};
