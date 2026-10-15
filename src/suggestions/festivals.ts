/**
 * Seva Suggestions — festival proximity calendar.
 * ============================================================================
 * HONESTY NOTE: these are widely-published approximate Gregorian dates for
 * major Hindu festivals (2026–2027). Tithi-exact dates shift by region and
 * panchang tradition — the Vedic Panchang desk is the authority. This table
 * exists only to time *suggestions* (e.g. crowd-safety modules before big
 * utsavs), never to declare religious dates.
 *
 * i18n: festival names resolve through the suites.seva dictionary
 * (suites.seva.recommend.festivals.<key>) via getFestivalName(), with the
 * t() fallback chain (language → English → table). The name/hi/bn fields
 * stay on the table as the built-in fallback for existing call sites.
 */
import { getDict } from '../i18n/translations';

export interface FestivalDate {
  /** Dictionary key: suites.seva.recommend.festivals.<key> */
  key: string;
  /** English name (fallback) */
  name: string;
  hi: string;
  bn: string;
  /** Gregorian month (1-12), day, year */
  m: number;
  d: number;
  y: number;
  /** Big public gatherings expected — crowd-safety modules matter */
  crowdHeavy: boolean;
}

const FESTIVALS: FestivalDate[] = [
  // ---- 2026 ----
  { key: 'mahaShivratri', name: 'Maha Shivratri', hi: 'महाशिवरात्रि', bn: 'মহাশিবরাত্রি', m: 2, d: 15, y: 2026, crowdHeavy: true },
  { key: 'holi', name: 'Holi', hi: 'होली', bn: 'হোলি', m: 3, d: 4, y: 2026, crowdHeavy: true },
  { key: 'ramNavami', name: 'Ram Navami', hi: 'राम नवमी', bn: 'রাম নবমী', m: 3, d: 26, y: 2026, crowdHeavy: true },
  { key: 'janmashtami', name: 'Janmashtami', hi: 'जन्माष्टमी', bn: 'জন্মাষ্টমী', m: 9, d: 4, y: 2026, crowdHeavy: true },
  { key: 'ganeshChaturthi', name: 'Ganesh Chaturthi', hi: 'गणेश चतुर्थी', bn: 'গণেশ চতুর্থী', m: 9, d: 14, y: 2026, crowdHeavy: true },
  { key: 'navratriBegins', name: 'Navratri begins', hi: 'नवरात्रि आरंभ', bn: 'নবরাত্রি শুরু', m: 10, d: 12, y: 2026, crowdHeavy: true },
  { key: 'durgaPujaDussehra', name: 'Durga Puja / Dussehra', hi: 'दुर्गा पूजा / दशहरा', bn: 'দুর্গা পূজা / দশেরা', m: 10, d: 20, y: 2026, crowdHeavy: true },
  { key: 'diwali', name: 'Diwali', hi: 'दीपावली', bn: 'দীপাবলি', m: 11, d: 8, y: 2026, crowdHeavy: true },
  // ---- 2027 (approximate, tithi-dependent) ----
  { key: 'mahaShivratri', name: 'Maha Shivratri', hi: 'महाशिवरात्रि', bn: 'মহাশিবরাত্রি', m: 3, d: 6, y: 2027, crowdHeavy: true },
  { key: 'holi', name: 'Holi', hi: 'होली', bn: 'হোলি', m: 3, d: 20, y: 2027, crowdHeavy: true },
  { key: 'ramNavami', name: 'Ram Navami', hi: 'राम नवमी', bn: 'রাম নবমী', m: 4, d: 14, y: 2027, crowdHeavy: true },
  { key: 'janmashtami', name: 'Janmashtami', hi: 'जन्माष्टमी', bn: 'জন্মাষ্টমী', m: 8, d: 24, y: 2027, crowdHeavy: true },
  { key: 'ganeshChaturthi', name: 'Ganesh Chaturthi', hi: 'গণেশ চতুর্থী', bn: 'গণেশ চতুর্থী', m: 9, d: 3, y: 2027, crowdHeavy: true },
  { key: 'navratriBegins', name: 'Navratri begins', hi: 'नवरात्रि आरंभ', bn: 'নবরাত্রি শুরু', m: 10, d: 1, y: 2027, crowdHeavy: true },
  { key: 'durgaPujaDussehra', name: 'Durga Puja / Dussehra', hi: 'दुर्गा पूजा / दशहरा', bn: 'দুর্গা পূজা / দশেরা', m: 10, d: 9, y: 2027, crowdHeavy: true },
  { key: 'diwali', name: 'Diwali', hi: 'दीपावली', bn: 'দীপাবলি', m: 10, d: 28, y: 2027, crowdHeavy: true },
];

export interface UpcomingFestival extends FestivalDate {
  daysAway: number;
}

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
 * Localised festival name with the t() fallback chain
 * (language → English → table name). Never blank.
 */
export function getFestivalName(f: FestivalDate, lang?: string): string {
  return dictText(`suites.seva.recommend.festivals.${f.key}`, lang) || f.name;
}

/**
 * Nearest upcoming festival within `windowDays` (default 45). Prefers
 * crowd-heavy festivals when several fall in the window — those are the
 * ones where crowd-safety suggestions matter most.
 */
export function getUpcomingFestival(now: Date = new Date(), windowDays = 45): UpcomingFestival | null {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let best: UpcomingFestival | null = null;
  for (const f of FESTIVALS) {
    const t = new Date(f.y, f.m - 1, f.d).getTime();
    const daysAway = Math.round((t - startOfToday) / 86400000);
    if (daysAway < 0 || daysAway > windowDays) continue;
    const candidate: UpcomingFestival = { ...f, daysAway };
    if (!best) {
      best = candidate;
    } else if (candidate.crowdHeavy && !best.crowdHeavy) {
      best = candidate;
    } else if (candidate.crowdHeavy === best.crowdHeavy && candidate.daysAway < best.daysAway) {
      best = candidate;
    }
  }
  return best;
}

/** Human "in N days / in N weeks" phrasing, locale-aware via the dictionary. */
export function festivalCountdown(daysAway: number, lang?: string): string {
  const tpl = (k: string) => dictText(`suites.seva.recommend.countdown.${k}`, lang) || k;
  if (daysAway <= 1) return tpl('tomorrow');
  if (daysAway < 7) return fill(tpl('days'), { days: daysAway });
  const weeks = Math.round(daysAway / 7);
  if (weeks <= 1) return tpl('aboutWeek');
  return fill(tpl('weeks'), { weeks });
}
