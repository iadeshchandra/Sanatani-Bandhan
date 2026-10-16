/**
 * suchanaFeed.ts — Unified Suchana Contract
 * =========================================
 * MERGE CONTRACT for the future UI layer (Ajker Suchana digest, role
 * dashboards, notification center). This file defines the shared shape
 * and the merge algorithm — it builds NO UI itself.
 *
 * Two intelligence sources feed one calm stream:
 *   1. 'panjika' — time-based, role-aware reminders from
 *      panjikaIntelligence.ts (tithis, festivals, muhurats, Ekadashi…)
 *   2. 'module'  — state-based insights from appIntelligence.ts
 *      (overdue pledges, low stock, unconfirmed muhurats…)
 *
 * CONSUMER GUIDE (for the UI agent):
 *   - Call `fromPanjikaReminder(r)` / `fromModuleInsight(i)` to normalize.
 *   - Call `mergeSuchana(panjika, modules, { digest: true })` for the
 *     morning digest (cap 15, calmest first) or `{ digest: false }`
 *     for the full view (cap 50).
 *   - Render `title`/`message` via the language of choice:
 *       item.title[lang] where lang ∈ 'en' | 'bn' | 'hi'.
 *   - `actionRoute` is a routing hint: Solo tab id ('panjika',
 *     'marketplace', 'wallet', 'sangam'…) or module id ('treasury',
 *     'inventory', 'events', 'goshala'…). The UI layer resolves it.
 *   - `date` (ISO) drives "in N days" labels; may be null for
 *     timeless nudges (e.g. low balance).
 *   - `dedupeKey` is stable across runs — use it for "dismissed"
 *     persistence and to avoid re-showing seen items.
 *   - Severity order is ALWAYS urgent → attention → nudge → info,
 *     then soonest date first. The feed must feel calm, never alarming:
 *     prefer the digest cap, and never badge-count 'info' items.
 */

import type { GeneratedReminder, IntelPriority } from './panjikaIntelligence';
import type { Insight, InsightSeverity } from './appIntelligence';

export interface SuchanaText {
  en: string;
  bn: string;
  hi: string;
}

export type SuchanaSource = 'panjika' | 'module';

export type SuchanaSeverity = 'urgent' | 'attention' | 'nudge' | 'info';

export interface SuchanaItem {
  /** Unique per item instance. */
  id: string;
  /** Which intelligence layer produced this. */
  source: SuchanaSource;
  severity: SuchanaSeverity;
  /** Role ids that should see this ('all' = everyone). */
  roles: string[];
  title: SuchanaText;
  message: SuchanaText;
  actionLabel: SuchanaText;
  /** Routing hint — Solo tab id or module id (see guide above). */
  actionRoute: string;
  /** ISO date the item relates to (event date / deadline). Null = timeless. */
  date: string | null;
  /** Stable across runs — for dedupe + dismissal persistence. */
  dedupeKey: string;
}

export interface MergeOptions {
  /** true → morning digest (cap 15, calmest-first bias). Default false. */
  digest?: boolean;
  /** Override caps. Digest default 15, full-view default 50. */
  cap?: number;
}

const SEVERITY_RANK: Record<SuchanaSeverity, number> = {
  urgent: 0,
  attention: 1,
  nudge: 2,
  info: 3,
};

const PANJIKA_PRIORITY_TO_SEVERITY: Record<IntelPriority, SuchanaSeverity> = {
  high: 'attention',
  normal: 'nudge',
  gentle: 'info',
};

function toISODate(v: any): string | null {
  try {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return null;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

/**
 * Normalize a Panjika Intelligence reminder into the shared shape.
 * Panjika priorities map: high→attention, normal→nudge, gentle→info.
 * (Panjika reminders are foresight, never 'urgent' — urgency belongs
 * to money/safety/time-critical module states.)
 */
export function fromPanjikaReminder(r: GeneratedReminder): SuchanaItem {
  return {
    id: `panjika:${r.eventType}:${r.role}:${r.eventDateISO}`,
    source: 'panjika',
    severity: PANJIKA_PRIORITY_TO_SEVERITY[r.priority] || 'nudge',
    roles: [r.role],
    title: { en: r.title.en, bn: r.title.bn, hi: r.title.hi },
    message: { en: r.message.en, bn: r.message.bn, hi: r.message.hi },
    actionLabel: { en: r.actionLabel.en, bn: r.actionLabel.bn, hi: r.actionLabel.hi },
    actionRoute: r.actionTab,
    date: toISODate(r.eventDateISO),
    dedupeKey: `panjika:${r.eventType}:${r.role}:${r.eventDateISO}`,
  };
}

/** Normalize a module insight into the shared shape (severity passes through). */
export function fromModuleInsight(i: Insight): SuchanaItem {
  const sev: SuchanaSeverity = ((): SuchanaSeverity => {
    const s: InsightSeverity = i.severity;
    return s === 'urgent' || s === 'attention' || s === 'nudge' || s === 'info'
      ? s
      : 'info';
  })();
  return {
    id: `module:${i.id}`,
    source: 'module',
    severity: sev,
    roles: i.roles.map(String),
    title: { en: i.title.en, bn: i.title.bn, hi: i.title.hi },
    message: { en: i.message.en, bn: i.message.bn, hi: i.message.hi },
    actionLabel: { en: i.actionLabel.en, bn: i.actionLabel.bn, hi: i.actionLabel.hi },
    actionRoute: i.actionRoute,
    date: null,
    dedupeKey: i.dedupeKey.startsWith('panjika:') || i.dedupeKey.startsWith('module:')
      ? i.dedupeKey
      : `module:${i.dedupeKey}`,
  };
}

/**
 * Merge both intelligence streams into one calm, ordered feed.
 *
 * Ordering: severity (urgent→info), then soonest date first, then
 * module insights before panjika reminders at equal severity (the
 * present need outweighs the future foresight), timeless items last
 * within their severity band.
 *
 * Dedupe: first occurrence of a dedupeKey wins — module insights take
 * precedence over panjika reminders when keys collide (same real-world
 * fact should surface once, from the most concrete source).
 */
export function mergeSuchana(
  panjikaReminders: GeneratedReminder[],
  moduleInsights: Insight[],
  opts: MergeOptions = {}
): SuchanaItem[] {
  const cap = opts.cap ?? (opts.digest ? 15 : 50);
  const items: SuchanaItem[] = [];

  try {
    for (const i of moduleInsights || []) {
      try {
        items.push(fromModuleInsight(i));
      } catch { /* skip bad item */ }
    }
    for (const r of panjikaReminders || []) {
      try {
        items.push(fromPanjikaReminder(r));
      } catch { /* skip bad item */ }
    }

    items.sort((a, b) => {
      const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (s !== 0) return s;
      // Soonest date first; timeless items sink within their band.
      if (a.date && b.date) {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
      } else if (a.date) {
        return -1;
      } else if (b.date) {
        return 1;
      }
      // Same severity + same date: module (concrete) before panjika (foresight).
      if (a.source !== b.source) return a.source === 'module' ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    const seen = new Set<string>();
    const out: SuchanaItem[] = [];
    for (const it of items) {
      if (seen.has(it.dedupeKey)) continue;
      seen.add(it.dedupeKey);
      out.push(it);
      if (out.length >= cap) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Filter a merged feed to one role. Items with 'all' in roles match
 * every role. Pure and never throws.
 */
export function suchanaForRole(
  items: SuchanaItem[],
  role: string
): SuchanaItem[] {
  try {
    const rk = String(role || '').toLowerCase();
    return (items || []).filter(
      (it) =>
        it.roles.includes('all') ||
        it.roles.some((r) => String(r).toLowerCase() === rk)
    );
  } catch {
    return [];
  }
}
