/**
 * ai/godmode/copilot.ts — GodMode Copilot pure logic.
 * =====================================================================
 * The AI advises; the human decides. This module is 100% deterministic
 * and side-effect free: keyword routing, aggregation formatting, anomaly
 * heuristics, recommendation shaping, and draft generation.
 *
 * SAFETY LAWS (enforced here and in tests):
 *  · Copilot intents fire ONLY for role 'owner'. Any other role asking
 *    gets the COPILOT_DENIED message — never data, never a summary.
 *  · The copilot NEVER performs consequential actions: no bans, no
 *    removals, no approvals, no notifications, no writes. It drafts,
 *    summarizes, recommends, explains. Every action needs a human tap.
 *  · If data is unavailable it says so. It never invents numbers.
 */

import type { IntentId, LangCode, Role } from '../types';
import { ANTI_PATTERN_ROUTER_PHRASES } from './marketingBrief';

/** The eleven copilot intents — owner-only. */
export const COPILOT_INTENTS: IntentId[] = [
  'admin_briefing',
  'admin_stats',
  'admin_moderation_help',
  'admin_anomaly',
  'admin_draft',
  'admin_terms',
  'admin_history',
  'admin_simulate',
  'admin_draft_change',
  'admin_advise',
  'admin_growth',
];

export function isCopilotIntent(intent: IntentId): boolean {
  return COPILOT_INTENTS.includes(intent);
}

/** Ironclad RBAC: only the GodMode operator may use the copilot. */
export function canUseCopilot(role: Role): boolean {
  return role === 'owner';
}

/* ------------------------------------------------------------------ */
/* Routing — deterministic keyword tables (EN / HI / BN)               */
/* ------------------------------------------------------------------ */

const BRIEFING_KW = [
  'morning briefing', 'briefing', 'what needs my attention', 'needs my attention',
  'what needs attention', 'attention', 'daily summary', 'day summary',
  'सुबह की जानकारी', 'ध्यान देने योग्य', 'সকালের ব্রিফিং', 'নজর দেওয়ার',
];

const STATS_KW = [
  'how many bookings', 'bookings this week', 'this week numbers', "week's numbers",
  'weekly numbers', 'how many users', 'active users', 'new signups', 'signups',
  'revenue', 'how many temples', 'platform stats', 'platform numbers',
  'कितनी बुकिंग', 'इस सप्ताह', 'सप्ताह के आंकड़े', 'कितने उपयोगकर्ता',
  'কত বুকিং', 'এই সপ্তাহ', 'সপ্তাহের সংখ্যা', 'কত ব্যবহারকারী',
];

const MODERATION_KW = [
  'flagged posts', 'review flagged', 'flagged content', 'moderation queue',
  'review reports', 'reported posts', 'what was flagged', 'help me moderate',
  'फ्लैग की गई', 'फ्लैग पोस्ट', 'मॉडरेशन', 'রিপোর্ট করা', 'ফ্ল্যাগ পোস্ট', 'মডারেশন',
];

const ANOMALY_KW = [
  'anything unusual', 'something unusual', 'unusual', 'anomaly', 'anomalies',
  'anything strange', 'something wrong', 'spike', 'anything off',
  'कुछ असामान्य', 'असामान्य', 'কিছু অস্বাভাবিক', 'অস্বাভাবিক',
];

const DRAFT_KW = [
  'write an announcement', 'draft an announcement', 'announcement about',
  'write a message', 'draft a message', 'help me write', 'announcement draft',
  'घोषणा लिख', 'संदेश लिख', 'ঘোষণা লিখ', 'বার্তা লিখ',
];

/* QUEUED #32 — terms / history / simulate / draft-change / advise.
 * Keywords are PLATFORM-anchored on purpose: a devotee asking "what is
 * the price of this seva?" or "how do I change the language?" must never
 * land here (they would only meet the role gate, but the anchor keeps
 * the router honest). Owner phrasing is possessive or plan-named —
 * "our terms", "Standard price", "what changed", "set Rail-1". */
const TERMS_KW = [
  'our terms', 'the terms', 'current terms', 'terms today', 'our prices',
  'our pricing', 'plan price', 'plan prices', 'plan limits', 'current limits',
  'standard price', 'premium price', 'pro price', 'standard plan price',
  'premium plan price', 'what do we charge', 'commission rate', 'commission rates',
  'what commission', 'our commission', 'platform commission', 'tier rates',
  'हमारी कीमत', 'हमारे दाम', 'कमीशन दर', 'हमारी शर्तें',
  'আমাদের দাম', 'আমাদের মূল্য', 'কমিশনের হার', 'আমাদের শর্ত',
];

const HISTORY_KW = [
  'what changed', 'what has changed', 'what was changed', 'change history',
  'terms history', 'who changed', 'recent changes', 'price changes',
  'last change', 'last changed', 'changes last week', 'changes this week',
  'क्या बदला', 'किसने बदला', 'পরিবর্তনের ইতিহাস', 'কী বদলেছে', 'কে বদলেছে',
];

const SIMULATE_KW = [
  'what if', 'simulate', 'simulation', 'impact of', 'what happens if',
  'if we raise', 'if we lower', 'if i raise', 'if i lower', 'run the numbers',
  'अगर बढ़ा', 'अगर घटा', 'যদি বাড়াই', 'যদি কমাই', 'প্রভাব কী হবে',
];

const DRAFT_CHANGE_KW = [
  'draft the change', 'draft a change', 'draft change', 'prepare the change',
  'change the price', 'change standard', 'change premium', 'change pro',
  'change the commission', 'set rail', 'set the price', 'set standard',
  'set premium', 'set pro', 'update the price', 'raise the price',
  'lower the price', 'raise standard', 'raise premium', 'raise pro',
  'make standard', 'make premium', 'make pro',
  'दाम बदल', 'दर बदल', 'দাম বদলাও', 'দর বদলাও',
];

const ADVISE_KW = [
  'should i', 'advise me', 'your advice', 'advise', 'strategy',
  'grow revenue', 'grow the platform', 'too high', 'too low',
  'your recommendation', 'सलाह', 'পরামর্শ', 'উপদেশ', 'কী করা উচিত', 'क्या करना चाहिए',
];

/* QUEUED #37 — growth/marketing counsel. Anchored on marketing
 * vocabulary (NOT bare 'grow' — "grow revenue" stays with admin_advise,
 * whose counsel is pricing-framed; this intent is funnel-framed).
 * The anti-pattern anchor phrases ride along so a refused tactic
 * ("buy fake reviews", "discount on puja") lands HERE, where the
 * executor refuses it with counsel, instead of drifting to advice. */
const GROWTH_KW = [
  'growth plan', 'growth strategy', 'marketing', 'marketing plan',
  'promote', 'promotion', 'campaign', 'acquisition', 'user growth',
  'get more users', 'more users', 'more devotees', 'more signups',
  'grow our reach', 'grow the user base', 'how do we grow', 'viral',
  'referral', 'referrals', 'referral program', 'onboard more',
  'onboarding', 'more temples', 'more organisations', 'more organizations',
  'brand awareness', 'app promotion',
  // Market-success counsel (addendum): positioning / moat questions
  // are growth questions — the executor adds the "Where we win" frame.
  'competitor', 'competitors', 'competition', 'our moat', 'positioning',
  'market position', 'how do we win', 'dominate the market', 'whatsapp groups',
  'user behaviour', 'user behavior', 'retention', 'why do users leave',
  'মার্কেটিং', 'প্রচার', 'অভিযান', 'আরও ব্যবহারকারী', 'আরও ভক্ত', 'রেফারেল',
  'मार्केटिंग', 'अभियान', 'प्रचार अभियान',
  ...ANTI_PATTERN_ROUTER_PHRASES,
];

const COPILOT_RULES: Array<{ intent: IntentId; keywords: string[] }> = [
  { intent: 'admin_briefing', keywords: BRIEFING_KW },
  { intent: 'admin_moderation_help', keywords: MODERATION_KW },
  { intent: 'admin_anomaly', keywords: ANOMALY_KW },
  { intent: 'admin_draft', keywords: DRAFT_KW },
  // #32 ordering: hypotheticals simulate ("what if…"); consultative
  // phrasing advises ("should I raise Pro…?" is counsel, NOT a draft —
  // advise is checked before the imperative draft table); imperatives
  // draft ("change Standard…"); history before terms ("what changed in
  // our terms?" asks about the past, not the present values).
  // #37: growth sits between simulate and advise — marketing-anchored
  // phrases (and anti-pattern asks) claim growth counsel before the
  // generic advise table can take them; bare "grow revenue" contains
  // no growth keyword and still lands on advise, as pinned.
  { intent: 'admin_simulate', keywords: SIMULATE_KW },
  { intent: 'admin_growth', keywords: GROWTH_KW },
  { intent: 'admin_advise', keywords: ADVISE_KW },
  { intent: 'admin_draft_change', keywords: DRAFT_CHANGE_KW },
  { intent: 'admin_history', keywords: HISTORY_KW },
  { intent: 'admin_terms', keywords: TERMS_KW },
  { intent: 'admin_stats', keywords: STATS_KW },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Route a copilot question. Returns the intent or null when nothing
 * matches — the caller falls back to the normal assistant router.
 * Priority-ordered: briefing > moderation > anomaly > draft >
 * simulate > advise > draft-change > history > terms > stats.
 */
export function routeCopilotIntent(input: string): IntentId | null {
  const text = (input || '').toLowerCase();
  for (const { intent, keywords } of COPILOT_RULES) {
    for (const kw of keywords) {
      const re = new RegExp(
        `(?<!\\p{L})${escapeRegExp(kw.toLowerCase())}(?!\\p{L})`,
        'u'
      );
      if (re.test(text)) return intent;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Briefing — pure aggregation formatting                               */
/* ------------------------------------------------------------------ */

export interface BriefingCounts {
  pendingVerifications: number;
  flaggedPosts: number;
  openDisputes: number;
  /** null when the count could not be read — honesty over invention. */
  dataAvailable: boolean;
}

export interface BriefingText {
  headline: string;
  lines: string[];
  calm: boolean;
}

/**
 * Build the warm briefing text. `dayName` is injected for testability
 * (e.g. 'Monday'). When data is unavailable, says so plainly.
 */
export function formatBriefing(
  counts: BriefingCounts,
  dayName: string,
  lang: LangCode
): BriefingText {
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  if (!counts.dataAvailable) {
    return {
      headline:
        l === 'hi'
          ? '🪔 आज का विवरण उपलब्ध नहीं है'
          : l === 'bn'
            ? '🪔 আজকের বিবরণ পাওয়া যাচ্ছে না'
            : '🪔 Today’s briefing is unavailable',
      lines: [
        l === 'hi'
          ? 'डेटा पढ़ा नहीं जा सका — कृपया कनेक्शन जाँचें और फिर पूछें। मैं अनुमान नहीं लगाऊँगा।'
          : l === 'bn'
            ? 'ডেটা পড়া যায়নি — সংযোগ পরীক্ষা করে আবার জিজ্ঞেস করুন। আমি অনুমান করব না।'
            : 'I couldn’t read the platform data — please check your connection and ask again. I won’t guess.',
      ],
      calm: true,
    };
  }
  const { pendingVerifications: v, flaggedPosts: f, openDisputes: d } = counts;
  const total = v + f + d;
  const calm = total === 0;
  const q = (n: number, en: string, hi: string, bn: string) =>
    l === 'hi' ? `${n} ${hi}` : l === 'bn' ? `${n} ${bn}` : `${n} ${en}`;
  const headline =
    l === 'hi'
      ? `🪔 सुप्रभात — ${dayName} की जानकारी`
      : l === 'bn'
        ? `🪔 সুপ্রভাত — ${dayName}র বিবরণ`
        : `🪔 Good morning — your ${dayName} briefing`;
  const lines: string[] = [
    q(v, 'verifications waiting', 'सत्यापन प्रतीक्षित', 'যাচাইকরণ অপেক্ষমাণ'),
    q(f, 'flagged posts to review', 'फ्लैग पोस्ट समीक्षा हेतु', 'ফ্ল্যাগ পোস্ট পর্যালোচনার জন্য'),
    q(d, 'open disputes', 'विवाद खुले', 'বিরোধ খোলা'),
  ];
  lines.push(
    calm
      ? l === 'hi'
        ? 'सब शांत है — हफ़्तों में सबसे शांत दिन। 🕊️'
        : l === 'bn'
          ? 'সব শান্ত — সপ্তাহের মধ্যে সবচেয়ে শান্ত দিন। 🕊️'
          : 'All quiet — the calmest day in weeks. 🕊️'
      : l === 'hi'
        ? 'एक-एक करके निपटाएँ — मैं हर कदम पर साथ हूँ। 🌼'
        : l === 'bn'
          ? 'একে একে মেটান — আমি প্রতি পদে সাথে আছি। 🌼'
          : 'Take them one at a time — I’m with you at every step. 🌼'
  );
  return { headline, lines, calm };
}

/* ------------------------------------------------------------------ */
/* Anomaly heuristics — "here's what I see", never alarmist            */
/* ------------------------------------------------------------------ */

export interface AnomalyInput {
  /** Reports in the last 24h. */
  reportsLast24h: number;
  /** Average daily reports over the trailing 7 days. */
  reportsAvg7d: number;
  /** Signups in the last 24h. */
  signupsLast24h: number;
  signupsAvg7d: number;
  /** Provider cancellations in the last 7d. */
  cancellationsLast7d: number;
  cancellationsAvg7d: number;
  dataAvailable: boolean;
}

export interface AnomalyFinding {
  /** 'report_spike' | 'signup_spike' | 'signup_drop' | 'cancellation_spike' */
  kind: string;
  severity: 'watch' | 'look';
  detail: string;
}

function spikeRatio(current: number, avg: number): number {
  if (avg <= 0) return current > 0 ? Infinity : 0;
  return current / avg;
}

/**
 * Pure anomaly scan. Thresholds are conservative by design — a copilot
 * that cries wolf gets ignored. Returns findings, calmest first.
 */
export function detectAnomalies(input: AnomalyInput): AnomalyFinding[] {
  if (!input.dataAvailable) return [];
  const out: AnomalyFinding[] = [];
  const rSpike = spikeRatio(input.reportsLast24h, input.reportsAvg7d);
  if (rSpike >= 3 && input.reportsLast24h >= 5) {
    out.push({
      kind: 'report_spike',
      severity: 'look',
      detail: `Reports are ${rSpike.toFixed(1)}× the 7-day average (${input.reportsLast24h} in 24h vs ~${Math.round(input.reportsAvg7d)}/day). Worth a glance at the moderation queue.`,
    });
  } else if (rSpike >= 2 && input.reportsLast24h >= 3) {
    out.push({
      kind: 'report_spike',
      severity: 'watch',
      detail: `Reports are running ${rSpike.toFixed(1)}× above average (${input.reportsLast24h} in 24h). Not urgent, but keep an eye on it.`,
    });
  }
  const sSpike = spikeRatio(input.signupsLast24h, input.signupsAvg7d);
  if (sSpike >= 3 && input.signupsLast24h >= 10) {
    out.push({
      kind: 'signup_spike',
      severity: 'watch',
      detail: `Signups jumped ${sSpike.toFixed(1)}× above average (${input.signupsLast24h} today). A happy surge — or worth checking the source.`,
    });
  } else if (sSpike <= 0.3 && input.signupsAvg7d >= 5) {
    out.push({
      kind: 'signup_drop',
      severity: 'watch',
      detail: `Signups are unusually low today (${input.signupsLast24h} vs ~${Math.round(input.signupsAvg7d)}/day average). May be nothing — weekends and festivals shift patterns.`,
    });
  }
  const cSpike = spikeRatio(input.cancellationsLast7d, input.cancellationsAvg7d);
  if (cSpike >= 2.5 && input.cancellationsLast7d >= 5) {
    out.push({
      kind: 'cancellation_spike',
      severity: 'look',
      detail: `Provider cancellations are ${cSpike.toFixed(1)}× the usual (${input.cancellationsLast7d} this week). A few providers may need a caring check-in.`,
    });
  }
  return out;
}

export function formatAnomalySummary(
  findings: AnomalyFinding[],
  lang: LangCode
): string {
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  if (findings.length === 0) {
    return l === 'hi'
      ? '🔍 कुछ भी असामान्य नहीं दिखा — सब अपनी लय में चल रहा है। 🌼'
      : l === 'bn'
        ? '🔍 অস্বাভাবিক কিছু দেখছি না — সব নিজের ছন্দে চলছে। 🌼'
        : '🔍 Nothing unusual on my radar — everything is moving in its own rhythm. 🌼';
  }
  const head =
    l === 'hi'
      ? '🔍 कुछ चीज़ों पर नज़र रखें:'
      : l === 'bn'
        ? '🔍 কয়েকটি বিষয়ে নজর রাখুন:'
        : '🔍 A few things worth a look:';
  return [head, ...findings.map((f) => `· ${f.detail}`)].join('\n');
}

/* ------------------------------------------------------------------ */
/* Moderation recommendations — advise, never act                       */
/* ------------------------------------------------------------------ */

export interface FlaggedItemInput {
  id: string;
  kind: string;
  /** Truncated content preview (already sanitized by the caller). */
  preview: string;
  reportCount: number;
  reportReasons: string[];
  authorName: string;
}

export type ModerationRecommendation = 'remove' | 'keep' | 'escalate' | 'review';

export interface ModerationAdvice {
  itemId: string;
  recommendation: ModerationRecommendation;
  reasoning: string;
  /** The human taps; the copilot never executes. */
  actionLabel: string;
}

/**
 * Deterministic recommendation rubric (mirrors the triage philosophy):
 *  · ≥5 reports or a safety reason (harassment/hate/scam) → remove
 *  · 3–4 reports, no safety reason → escalate (needs human eyes)
 *  · 1–2 reports, mild reasons → review (lean keep, but look)
 *  · 0 reports (shouldn't happen) → keep
 */
export function recommendModeration(
  item: FlaggedItemInput
): ModerationAdvice {
  const reasons = item.reportReasons.map((r) => r.toLowerCase());
  const safetyHit = reasons.some((r) =>
    /harass|hate|scam|fraud|threat|abuse|explicit|violence/.test(r)
  );
  let recommendation: ModerationRecommendation;
  let reasoning: string;
  if (item.reportCount >= 5 || (safetyHit && item.reportCount >= 2)) {
    recommendation = 'remove';
    reasoning = safetyHit
      ? `${item.reportCount} reports including a safety concern (${item.reportReasons[0]}). Protecting the community comes first.`
      : `${item.reportCount} reports — a clear community signal. Removal is the kindest option for everyone.`;
  } else if (item.reportCount >= 3) {
    recommendation = 'escalate';
    reasoning = `${item.reportCount} reports, mixed signals. This one deserves your eyes, not a rule.`;
  } else if (item.reportCount >= 1) {
    recommendation = 'review';
    reasoning = `Only ${item.reportCount} report${item.reportCount > 1 ? 's' : ''} (${item.reportReasons[0] || 'no reason given'}) — likely fine, but a quick look keeps trust high.`;
  } else {
    recommendation = 'keep';
    reasoning = 'No reports on this item — it only reached you by mistake.';
  }
  const actionLabel =
    recommendation === 'remove'
      ? 'Remove post'
      : recommendation === 'escalate'
        ? 'Review in Moderation'
        : recommendation === 'review'
          ? 'Take a look'
          : 'Dismiss';
  return { itemId: item.id, recommendation, reasoning, actionLabel };
}

/* ------------------------------------------------------------------ */
/* Drafts — warm, Sanatani-toned, never auto-published                  */
/* ------------------------------------------------------------------ */

/**
 * Build an announcement draft from a topic. Template-driven, warm,
 * institution-neutral. The admin edits and sends — this NEVER publishes.
 */
export function buildAnnouncementDraft(topic: string, lang: LangCode): string {
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  const t = (topic || '').trim() || (l === 'hi' ? 'आगामी उत्सव' : l === 'bn' ? 'আসন্ন উৎসব' : 'the coming festival');
  if (l === 'hi') {
    return `🪔 प्रिय साधकों,\n\n${t} के पावन अवसर पर आप सभी को हार्दिक शुभकामनाएँ।\n\nआइए, इस अवसर को भक्ति और एकता के साथ मनाएँ — मंदिर पधारें, आरती में सम्मिलित हों, और अपने अनुभव संगम पर साझा करें।\n\nशुभं भवतु। 🌼\n— सनातनी बंधन परिवार`;
  }
  if (l === 'bn') {
    return `🪔 প্রিয় সাধকগণ,\n\n${t}-এর পবিত্র উপলক্ষে আপনাদের সবাইকে আন্তরিক শুভেচ্ছা।\n\nআসুন, ভক্তি ও ঐক্যের সাথে এই উপলক্ষ উদযাপন করি — মন্দিরে আসুন, আরতিতে যোগ দিন, এবং সংগমে আপনার অভিজ্ঞতা ভাগ করুন।\n\nশুভম্ ভবতু। 🌼\n— সনাতনী বন্ধন পরিবার`;
  }
  return `🪔 Dear seekers,\n\nWarm wishes to you all on the sacred occasion of ${t}.\n\nLet us celebrate with devotion and togetherness — visit your temple, join the aarti, and share your moments on Sangam.\n\nShubham bhavatu. 🌼\n— The Sanatani Bandhan family`;
}

/** The denial copy — warm, never data. */
export function copilotDenied(lang: LangCode): string {
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  return l === 'hi'
    ? '🪔 यह GodMode का प्रश्न है — इसमें मैं केवल संस्थान प्रमुख की सहायता कर सकता हूँ।'
    : l === 'bn'
      ? '🪔 এটি GodMode-এর প্রশ্ন — এতে আমি কেবল প্রতিষ্ঠান প্রধানকে সাহায্য করতে পারি।'
      : '🪔 That’s a GodMode question — I can only help the institution head with that.';
}

/* ------------------------------------------------------------------ */
/* Stats formatting                                                     */
/* ------------------------------------------------------------------ */

export interface PlatformStats {
  bookingsWeek: number;
  activeUsersWeek: number;
  newSignupsWeek: number;
  templesMapped: number;
  dataAvailable: boolean;
}

export function formatStats(stats: PlatformStats, lang: LangCode): string {
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  if (!stats.dataAvailable) {
    return l === 'hi'
      ? '📊 आँकड़े उपलब्ध नहीं हैं — कृपया कनेक्शन जाँचकर पुनः पूछें।'
      : l === 'bn'
        ? '📊 পরিসংখ্যান পাওয়া যাচ্ছে না — সংযোগ পরীক্ষা করে আবার জিজ্ঞেস করুন।'
        : '📊 The numbers aren’t available right now — please check your connection and ask again.';
  }
  const L = {
    head:
      l === 'hi' ? '📊 इस सप्ताह की झलक:' : l === 'bn' ? '📊 এই সপ্তাহের ঝলক:' : '📊 This week at a glance:',
    bookings: l === 'hi' ? 'बुकिंग' : l === 'bn' ? 'বুকিং' : 'bookings',
    active: l === 'hi' ? 'सक्रिय साधक' : l === 'bn' ? 'সক্রিয় সাধক' : 'active seekers',
    signups: l === 'hi' ? 'नए जुड़े' : l === 'bn' ? 'নতুন যোগ' : 'new signups',
    temples: l === 'hi' ? 'मानचित्रित मंदिर' : l === 'bn' ? 'মানচিত্রিত মন্দির' : 'temples mapped',
  };
  return [
    L.head,
    `· ${stats.bookingsWeek} ${L.bookings}`,
    `· ${stats.activeUsersWeek} ${L.active}`,
    `· ${stats.newSignupsWeek} ${L.signups}`,
    `· ${stats.templesMapped} ${L.temples}`,
  ].join('\n');
}
