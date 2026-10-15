/**
 * Seva Suggestions — "Recommended for you" ranking engine.
 * ============================================================================
 * Scores every not-yet-enabled module for THIS workspace and returns a ranked
 * list with a one-line, honest reason each. No fabricated statistics —
 * reasons use soft phrasing ("many", "often") and real signals only.
 *
 * i18n: reason copy resolves through the suites.seva dictionary
 * (suites.seva.recommend.reasons.*) with the t() fallback chain
 * (language → English → key). This module is hook-free on purpose, so it
 * reads the synchronously-cached dictionary via getDict(). The public API
 * (LocalizedText, RecContext, Recommendation, localizeText,
 * getRecommendations) is unchanged.
 *
 * Signals:
 *  - org-type affinity (curated per archetype, beyond registry natives)
 *  - festival proximity (crowd-safety modules before big utsavs)
 *  - workspace size (devotee count, donation volume)
 *  - recent desk usage (adjacent modules)
 */
import { getDict } from '../i18n/translations';

export interface LocalizedText {
  en: string;
  hi: string;
  bn: string;
}

export interface RecContext {
  orgType: string;
  nativeModules: string[];
  enabledModules: string[];
  devoteeCount: number;
  donationCount: number;
  daysToFestival: number | null;
  festivalName: LocalizedText | null;
  recentDeskIds: string[];
  lang?: string;
}

export interface Recommendation {
  moduleId: string;
  score: number;
  reason: LocalizedText;
}

/** Modules that should never be "recommended" (always-on, personal, or the store itself). */
const NEVER_RECOMMEND = new Set([
  'dashboard',
  'appStore',
  'masterSettings',
  'devotee-portal',
  'sadhana-karma',
  'yatraNet',
  'sanatani-vivah',
]);

/**
 * Curated affinity: modules a given org type usually needs, beyond its
 * registry natives. Conservative — only the high-confidence 90% cases.
 */
const ORG_AFFINITY: Record<string, string[]> = {
  Mandir: ['sevadar-roster', 'inventory', 'qrScanner', 'utsavPanjika'],
  Tirth: ['qrScanner', 'membership'],
  KashiKshetra: ['qrScanner', 'membership'],
  MahotsavSamiti: ['sevadar-roster', 'sandeshBroadcast', 'qrScanner'],
  Goshala: ['sevadar-roster', 'campaigns'],
  Ashram: ['sevadar-roster', 'membership', 'qrScanner'],
  Yoga: ['membership', 'sandeshBroadcast'],
  Satsang: ['membership', 'sandeshBroadcast'],
  Sangha: ['sevadar-roster', 'membership', 'sandeshBroadcast'],
  Samaj: ['sevadar-roster', 'membership', 'sandeshBroadcast'],
  Gurukul: ['bulkImport', 'membership'],
  Vidyalaya: ['bulkImport', 'sandeshBroadcast', 'membership'],
  PurohitSabha: ['membership', 'sandeshBroadcast'],
  Trust: ['sevadar-roster', 'bulkImport', 'sandeshBroadcast'],
  DharmadaTrust: ['bulkImport'],
  AkshayaPatra: ['sevadar-roster', 'vahan'],
  Purohit: ['sandeshBroadcast'],
};

/** Crowd-safety modules worth enabling ahead of a big utsav. */
const CROWD_SAFETY_MODULES = ['checkin', 'qrScanner', 'crisis-command', 'yatranet-gis', 'sevadar-roster'];

/** Modules adjacent to a desk the user already visits (gentle cross-sell). */
const ADJACENT: Record<string, string[]> = {
  treasury: ['taxReceipts', 'tally-export', 'donorCare'],
  devotees: ['donorCare', 'membership', 'bulkImport'],
  poojaBooking: ['purohitMarket', 'pitruShradh'],
  utsavPanjika: ['checkin', 'qrScanner', 'crisis-command'],
  campaigns: ['donorCare', 'sandeshBroadcast'],
  'quick-chanda-pos': ['donorCare', 'taxReceipts'],
};

/**
 * Hook-free dictionary lookup with the t() fallback chain:
 * requested language → English → undefined.
 */
function dictText(key: string, lang?: string): string | undefined {
  const l = (lang || 'en').toLowerCase();
  const segs = key.split('.');
  const read = (dict: any): string | undefined => {
    let cur: any = dict;
    for (const s of segs) {
      if (cur && typeof cur === 'object' && s in cur) cur = cur[s];
      else return undefined;
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  return read(getDict(l)) || (l === 'en' ? undefined : read(getDict('en')));
}

/** Fill {placeholders} in a template string. */
function fill(template: string, params: Record<string, string | number>): string {
  let s = template;
  for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/**
 * Build a LocalizedText reason from the suites.seva.recommend dictionary.
 * Kept as LocalizedText (en/hi/bn) for backward compatibility with
 * persisted PendingSuggestion objects and existing call sites.
 */
function reason(key: string, params: Record<string, string | number> = {}, lang?: string): LocalizedText {
  const build = (l: string) =>
    fill(dictText(`suites.seva.recommend.reasons.${key}`, l) || key, params);
  return { en: build('en'), hi: build('hi'), bn: build('bn') };
}

function tr(t: LocalizedText, lang?: string): string {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('bn')) return t.bn;
  if (l.startsWith('hi')) return t.hi;
  return t.en;
}

export function localizeText(t: LocalizedText, lang?: string): string {
  return tr(t, lang);
}

export function getRecommendations(ctx: RecContext): Recommendation[] {
  const lang = ctx.lang;
  const known = new Set([...ctx.nativeModules, ...ctx.enabledModules]);
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (moduleId: string, score: number, reason: LocalizedText) => {
    if (NEVER_RECOMMEND.has(moduleId)) return;
    if (known.has(moduleId)) return;
    if (seen.has(moduleId)) {
      const existing = out.find((r) => r.moduleId === moduleId);
      if (existing && score > existing.score) {
        existing.score = score;
        existing.reason = reason;
      }
      return;
    }
    seen.add(moduleId);
    out.push({ moduleId, score, reason });
  };

  // 1. Org-type affinity (+30)
  const affinity = ORG_AFFINITY[ctx.orgType] || [];
  for (const m of affinity) {
    push(m, 30, reason('orgAffinity', { orgType: ctx.orgType }, lang));
  }

  // 2. Festival proximity (+25, crowd-safety only)
  if (ctx.daysToFestival !== null && ctx.daysToFestival <= 45 && ctx.festivalName) {
    const fname = tr(ctx.festivalName, lang);
    const whenKey = ctx.daysToFestival <= 1 ? 'tomorrow' : 'days';
    const when = fill(
      dictText(`suites.seva.recommend.countdown.${whenKey}`, lang) || whenKey,
      { days: ctx.daysToFestival }
    );
    for (const m of CROWD_SAFETY_MODULES) {
      push(m, 25, reason('festivalCrowd', { festival: fname, when }, lang));
    }
  }

  // 3. Size signals
  if (ctx.devoteeCount >= 200) {
    push('bulkImport', 15, reason('bulkTools', { count: ctx.devoteeCount }, lang));
    push('membership', 12, reason('membership', {}, lang));
  }
  if (ctx.donationCount >= 25) {
    push('donorCare', 18, reason('donorCare', { count: ctx.donationCount }, lang));
    push('taxReceipts', 14, reason('taxReceipts', {}, lang));
  }

  // 4. Adjacent to recently used desks (+8)
  for (const deskId of ctx.recentDeskIds.slice(0, 5)) {
    for (const m of ADJACENT[deskId] || []) {
      push(m, 8, reason('adjacent', {}, lang));
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 6);
}
