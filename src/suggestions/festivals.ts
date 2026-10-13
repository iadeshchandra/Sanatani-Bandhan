/**
 * Seva Suggestions — festival proximity calendar.
 * ============================================================================
 * HONESTY NOTE: these are widely-published approximate Gregorian dates for
 * major Hindu festivals (2026–2027). Tithi-exact dates shift by region and
 * panchang tradition — the Vedic Panchang desk is the authority. This table
 * exists only to time *suggestions* (e.g. crowd-safety modules before big
 * utsavs), never to declare religious dates.
 */

export interface FestivalDate {
  /** English name */
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
  { name: 'Maha Shivratri', hi: 'महाशिवरात्रि', bn: 'মহাশিবরাত্রি', m: 2, d: 15, y: 2026, crowdHeavy: true },
  { name: 'Holi', hi: 'होली', bn: 'হোলি', m: 3, d: 4, y: 2026, crowdHeavy: true },
  { name: 'Ram Navami', hi: 'राम नवमी', bn: 'রাম নবমী', m: 3, d: 26, y: 2026, crowdHeavy: true },
  { name: 'Janmashtami', hi: 'जन्माष्टमी', bn: 'জন্মাষ্টমী', m: 9, d: 4, y: 2026, crowdHeavy: true },
  { name: 'Ganesh Chaturthi', hi: 'गणेश चतुर्थी', bn: 'গণেশ চতুর্থী', m: 9, d: 14, y: 2026, crowdHeavy: true },
  { name: 'Navratri begins', hi: 'नवरात्रि आरंभ', bn: 'নবরাত্রি শুরু', m: 10, d: 12, y: 2026, crowdHeavy: true },
  { name: 'Durga Puja / Dussehra', hi: 'दुर्गा पूजा / दशहरा', bn: 'দুর্গা পূজা / দশেরা', m: 10, d: 20, y: 2026, crowdHeavy: true },
  { name: 'Diwali', hi: 'दीपावली', bn: 'দীপাবলি', m: 11, d: 8, y: 2026, crowdHeavy: true },
  // ---- 2027 (approximate, tithi-dependent) ----
  { name: 'Maha Shivratri', hi: 'महाशिवरात्रि', bn: 'মহাশিবরাত্রি', m: 3, d: 6, y: 2027, crowdHeavy: true },
  { name: 'Holi', hi: 'होली', bn: 'হোলি', m: 3, d: 20, y: 2027, crowdHeavy: true },
  { name: 'Ram Navami', hi: 'राम नवमी', bn: 'রাম নবমী', m: 4, d: 14, y: 2027, crowdHeavy: true },
  { name: 'Janmashtami', hi: 'जन्माष्टमी', bn: 'জন্মাষ্টমী', m: 8, d: 24, y: 2027, crowdHeavy: true },
  { name: 'Ganesh Chaturthi', hi: 'গণেশ চতুর্থী', bn: 'গণেশ চতুর্থী', m: 9, d: 3, y: 2027, crowdHeavy: true },
  { name: 'Navratri begins', hi: 'नवरात्रि आरंभ', bn: 'নবরাত্রি শুরু', m: 10, d: 1, y: 2027, crowdHeavy: true },
  { name: 'Durga Puja / Dussehra', hi: 'दुर्गा पूजा / दशहरा', bn: 'দুর্গা পূজা / দশেরা', m: 10, d: 9, y: 2027, crowdHeavy: true },
  { name: 'Diwali', hi: 'दीपावली', bn: 'দীপাবলি', m: 10, d: 28, y: 2027, crowdHeavy: true },
];

export interface UpcomingFestival extends FestivalDate {
  daysAway: number;
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

/** Human "in N days / in N weeks" phrasing, locale-aware. */
export function festivalCountdown(daysAway: number, lang?: string): string {
  const l = (lang || 'en').toLowerCase();
  const weeks = Math.round(daysAway / 7);
  if (l.startsWith('bn')) {
    if (daysAway <= 1) return 'আগামীকাল';
    if (daysAway < 7) return `${daysAway} দিন পর`;
    return `${weeks} সপ্তাহ পর`;
  }
  if (l.startsWith('hi')) {
    if (daysAway <= 1) return 'कल';
    if (daysAway < 7) return `${daysAway} दिन बाद`;
    return `${weeks} सप्ताह बाद`;
  }
  if (daysAway <= 1) return 'tomorrow';
  if (daysAway < 7) return `in ${daysAway} days`;
  return weeks <= 1 ? 'in about a week' : `in about ${weeks} weeks`;
}
