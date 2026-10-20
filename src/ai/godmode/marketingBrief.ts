/**
 * ai/godmode/marketingBrief.ts — the Marketing Brief (QUEUED #37).
 * =====================================================================
 * The Copilot thinks with TWO minds: the Owner Brief (ownerBrief.ts —
 * vision, laws, pricing heuristics) and this one: how a digital
 * marketing expert grows THIS platform without breaking its laws.
 * The marketing mind is subordinate to the owner mind, always:
 * never discount the sacred, trust is the moat, dignity is the brand.
 *
 * Laws for this module:
 *  · It supplies NO numbers. Every figure in a growth answer comes
 *    from a live read (growthTools' snapshot); this module shapes
 *    judgement — opportunities, plays, refusals — never metrics.
 *    Industry benchmarks are not our data and are never quoted as such.
 *  · Anti-patterns are REFUSED, not debated: when the owner's ask is a
 *    bought review, a spam blast, a discounted puja — the Copilot
 *    names the conflict with his own brief first (heuristic: honest
 *    disagreement) and offers the lawful play instead.
 */

import type { LangCode } from '../types';

function lc(lang: LangCode): 'en' | 'hi' | 'bn' {
  return lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
}

/* ------------------------------------------------------------------ */
/* Growth heuristics — how this platform honestly grows                */
/* ------------------------------------------------------------------ */

export interface MarketingHeuristic {
  id: string;
  name: string;
  rule: string;
}

export const MARKETING_HEURISTICS: MarketingHeuristic[] = [
  {
    id: 'share-is-the-loop',
    name: 'The share is the growth loop',
    rule:
      'Every completed seva ends in Kritagyata, and the share that follows carries the referral. ' +
      'Growth work strengthens that moment of gratitude — it never interrupts a ritual to ask for ' +
      'marketing. A booking born of a blessing outlives any campaign.',
  },
  {
    id: 'festival-calendar-is-the-campaign-calendar',
    name: 'The panjika is the campaign calendar',
    rule:
      'Sanatani life runs on the festival calendar, so campaign beats are festival beats — ' +
      'prepared with orgs a fortnight ahead, never invented sale seasons. Festival weeks are ' +
      'the highest-intent windows of the year: families plan, book and gather.',
  },
  {
    id: 'one-temple-brings-its-devotees',
    name: 'One temple brings its devotees',
    rule:
      'Organisations are the acquisition channel. One onboarded mandir or goshala brings its ' +
      'whole register with it (Bahi-Khata digitisation) — an audience that arrives already ' +
      'trusting, because their own temple brought them. Org-led growth beats ads.',
  },
  {
    id: 'whatsapp-first',
    name: 'WhatsApp-first, always',
    rule:
      'In Bharat and Bangladesh the family WhatsApp group is the town square. Every growth ' +
      'artifact must be forwardable there in one tap — dignified, useful, personal. If it ' +
      'would embarrass a devotee to forward, it is not a growth artifact.',
  },
  {
    id: 'retention-is-rhythm',
    name: 'Retention is rhythm, not noise',
    rule:
      'Families stay because Suchana serves their life-rhythm — aarti reminders, samskara ' +
      'dates, shraddha remembrance. Usefulness retains; noise churns. A bell that cries ' +
      'wolf gets muted forever, and a muted guide guides no one.',
  },
  {
    id: 'premium-feel-is-the-brand',
    name: 'The premium feel is the brand',
    rule:
      'What we sell is dignity — a small temple feeling like Tirupati. That feeling is the ' +
      'story devotees repeat to other devotees. Never trade it for reach: no garish banners, ' +
      'no cheap tricks, no shouting. Quiet excellence is the advertisement.',
  },
  {
    id: 'profit-through-value',
    name: 'Profit through value, never by forcing',
    rule:
      'The owner’s ethical law (2026-10-20): profit grows when more people are served ' +
      'better and prices honestly reflect dignity and worth — never by forcing a user. ' +
      'No pressure mechanics, no dark patterns, no squeezing a devotee at a vulnerable ' +
      'moment: a shraddha booking is a sacred trust, not a sales funnel. When counsel ' +
      'touches profit, it travels through value — Pro worth having, Premium worth ' +
      'deepening, commission that stays beneath the bypass line.',
  },
];

/* ------------------------------------------------------------------ */
/* The market frame — who we actually compete with, and the moat       */
/* General market knowledge, labelled as such — never dressed as data. */
/* ------------------------------------------------------------------ */

export interface MarketRival {
  name: string;
  reality: string;
  ourAnswer: string;
}

export const MARKET_FRAME: {
  positioning: string;
  rivals: MarketRival[];
  moat: string[];
} = {
  positioning:
    'Not another temple app — the companion for a Sanatani’s whole life: sadhana at dawn, ' +
    'seva at the temple, family safety at night, shraddha when it matters most. Rivals each ' +
    'hold one slice; we hold the life.',
  rivals: [
    {
      name: 'WhatsApp groups',
      reality:
        'Where coordination actually happens today — free and familiar, but chaotic: no ' +
        'records, no trust layer, no memory; the purohit’s number is lost by next season.',
      ourAnswer:
        'We do not fight WhatsApp — we complete it. The share travels there; the booking, ' +
        'the record and the trust live here.',
    },
    {
      name: 'Paper registers (the bahi-khata)',
      reality:
        'Trusted for generations — and unsearchable, single-copy, one flood or fire from gone.',
      ourAnswer:
        'Bahi-Khata digitisation honours the paper (photo kept forever) while giving it ' +
        'search, memory and a second copy in the cloud.',
    },
    {
      name: 'Generic temple / accounting software',
      reality:
        'Bookkeeping-shaped, not life-shaped: it serves the office, never the devotee; ' +
        'no sadhana, no Sangam, no soul.',
      ourAnswer:
        'We serve both sides of the temple gate — the institution’s books AND the family’s ' +
        'whole Sanatani life — and each side feeds the other.',
    },
  ],
  moat: [
    'Trust — Kritagyata, verified providers, honest money (coordination, never custody).',
    'Ecosystem completeness — samskara to shraddha, solo to sangha, in one companion.',
    'Bahi-Khata switching cost — once a register is digitised and trusted, no org returns to paper.',
    'A growth loop powered by gratitude (the share), not by ad spend.',
  ],
};

/* ------------------------------------------------------------------ */
/* Anti-patterns — refused, with the lawful alternative                */
/* ------------------------------------------------------------------ */

export interface AntiPattern {
  id: string;
  /** Short human label for the refusal copy. */
  label: string;
  /** Why the owner's own brief forbids it. */
  why: string;
  /** The lawful play offered instead. */
  alternative: string;
}

export const ANTI_PATTERNS: AntiPattern[] = [
  {
    id: 'fake-social-proof',
    label: 'buying fake reviews, ratings or followers',
    why:
      'Trust is the moat (your own brief). Kritagyata is sacred here — a bought rating ' +
      'poisons the very well every real devotee drinks from, and platforms detect and ' +
      'punish fabricated proof.',
    alternative:
      'Ask for Kritagyata at the true moment — right after a completed seva, when ' +
      'gratitude is real — and make the share one tap. Real blessings compound; fake ones detonate.',
  },
  {
    id: 'spam-broadcasts',
    label: 'spam broadcasts and bulk blasts',
    why:
      'Suchana’s law is usefulness. Unsolicited blasts train devotees to mute us, and ' +
      'bulk WhatsApp abuse endangers the channel itself (numbers get banned). A muted ' +
      'guide guides no one — including at the next SOS.',
    alternative:
      'Speak to people who chose to listen: org pages, followers’ Suchana, and festival ' +
      'cards a family forwards because they help. Chosen reach is smaller and worth more.',
  },
  {
    id: 'discount-the-sacred',
    label: 'discounting pujas, sevas or dakshina',
    why:
      'Your never-discount-the-sacred law is absolute: a puja is not a product SKU and ' +
      'dakshina is not a price tag to be slashed. A "50% off Satyanarayan" teaches ' +
      'devotees that the sacred was overpriced yesterday.',
    alternative:
      'Deepen value at full dignity — clearer seva descriptions, preparation guidance, ' +
      'a photo from the day, a grateful follow-up. Devotees pay gladly for care; they ' +
      'resent being sold to.',
  },
  {
    id: 'dark-patterns',
    label: 'dark patterns — fake urgency, hidden charges, guilt traps',
    why:
      'Dignity is the product. Manufactured scarcity ("only 2 slots left!" when it is ' +
      'not true) and guilt-framed prompts buy one booking and spend a year of trust.',
    alternative:
      'Honest scarcity only, when it is real — a purohit truly has three slots on ' +
      'Ekadashi morning; say exactly that, plainly. Truth, calmly stated, converts.',
  },
  {
    id: 'bought-installs',
    label: 'bought installs and fake signups',
    why:
      'Numbers that lie corrupt every decision downstream — including mine: I counsel ' +
      'from your real counts, and a poisoned funnel makes my counsel worthless to you.',
    alternative:
      'Org-led onboarding (one temple brings its devotees) and the share loop. Slower ' +
      'on a chart, real in the books.',
  },
];

/**
 * Router anchor phrases for the anti-patterns (QUEUED #37): these make
 * an anti-pattern ask land on admin_growth (whose executor refuses it
 * with counsel) instead of drifting to generic advice.
 */
export const ANTI_PATTERN_ROUTER_PHRASES: string[] = [
  'fake review', 'fake reviews', 'buy reviews', 'paid reviews', 'buy followers',
  'fake followers', 'fake ratings', 'buy ratings', 'spam broadcast', 'bulk sms',
  'bulk whatsapp', 'bulk message', 'discount on puja', 'discount puja',
  'puja discount', 'puja sale', 'sale on puja', 'discount on seva',
  'fake signups', 'buy installs', 'dark pattern',
  'नकली समीक्षा', 'फ़ेक रिव्यू', 'पूजा पर छूट',
  'ভুয়া রিভিউ', 'ভুয়ো রিভিউ', 'পূজায় ছাড়', 'রিভিউ কিন',
];

const SCREEN_PHRASES: Record<string, string[]> = {
  'fake-social-proof': [
    'fake review', 'fake reviews', 'buy review', 'buy reviews', 'bought reviews',
    'paid review', 'paid reviews', 'fake follower', 'fake followers',
    'buy follower', 'buy followers', 'fake rating', 'fake ratings',
    'buy rating', 'fake like', 'fake likes', 'review farm',
    'नकली समीक्षा', 'फ़ेक रिव्यू', 'नकली रिव्यू',
    'ভুয়া রিভিউ', 'ভুয়ো রিভিউ', 'রিভিউ কিন', 'ভুয়া ফলোয়ার',
  ],
  'spam-broadcasts': [
    'spam broadcast', 'spam blast', 'send spam', 'bulk sms', 'bulk whatsapp',
    'bulk message', 'bulk messages', 'mass sms', 'mass message', 'message blast',
    'blast sms', 'blast to all', 'blast everyone',
    'স্প্যাম', 'বাল্ক মেসেজ', 'स्पैम', 'बल्क मैसेज',
  ],
  'discount-the-sacred': [
    'discount on puja', 'discount puja', 'puja discount', 'discount on seva',
    'seva discount', 'discount dakshina', 'discount on dakshina', 'puja sale',
    'sale on puja', 'cheap puja', 'cheap seva',
    'पूजा पर छूट', 'पूजा छूट', 'পূজায় ছাড়', 'পূজা ছাড়', 'সেবায় ছাড়',
  ],
  'dark-patterns': [
    'dark pattern', 'fake urgency', 'fake scarcity', 'guilt trip', 'guilt-trip',
  ],
  'bought-installs': [
    'buy installs', 'bought installs', 'install farm', 'fake signups',
    'fake users', 'bot users', 'bot signups', 'fake accounts',
  ],
};

const SCREEN_REGEXES: Record<string, RegExp[]> = {
  'discount-the-sacred': [
    /\d+\s*%\s*off[^.]{0,24}(puja|seva|dakshina|পূজা|সেবা|দক্ষিণা|पूजा|सेवा|दक्षिणा)/i,
    /(discount|sale|छूट|ছাড়)[^.]{0,20}(puja|seva|dakshina|পূজা|সেবা|দক্ষিণা|पूजा|सेवा|दक्षिणा)/i,
  ],
  'spam-broadcasts': [
    /\b(spam|blast)\b[^.]{0,24}\b(all|everyone|everybody|sabko|সবাইকে)\b/i,
  ],
};

/**
 * Screen an owner ask for a refused tactic. Returns the matched
 * anti-pattern or null. Deterministic; errs toward NOT refusing
 * (a miss falls through to counsel, which still names the anti-patterns
 * in its "what not to do" section).
 */
export function screenAntiPattern(input: string): AntiPattern | null {
  const text = (input || '').toLowerCase();
  for (const ap of ANTI_PATTERNS) {
    const phrases = SCREEN_PHRASES[ap.id] ?? [];
    if (phrases.some((p) => text.includes(p))) return ap;
    const res = SCREEN_REGEXES[ap.id] ?? [];
    if (res.some((re) => re.test(text))) return ap;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Rendering helpers                                                   */
/* ------------------------------------------------------------------ */

/** Compact DATA block — facts about the mindset only, for voice warming. */
export function marketingBriefForPrompt(): string {
  return [
    'Marketing heuristics (subordinate to the owner brief):',
    ...MARKETING_HEURISTICS.map((h) => `· ${h.name}: ${h.rule}`),
    `Market frame (general knowledge, not our data): ${MARKET_FRAME.positioning}`,
    'Moat: ' + MARKET_FRAME.moat.join(' '),
    'Refused, always: ' + ANTI_PATTERNS.map((a) => a.label).join('; ') + '.',
  ].join('\n');
}

/** Short lines for the panel's "My brief" expander. */
export function marketingSummaryLines(): string[] {
  return [
    '📈 Marketing mind — growth with dignity:',
    ...MARKETING_HEURISTICS.map((h) => `· ${h.name} — ${h.rule}`),
    '🏆 Our ground: against WhatsApp chaos, fragile paper and bookkeeping software ' +
      'without a soul — trust, and the whole Sanatani life in one companion.',
  ];
}

/** The refusal headline per language (body stays counsel-grade EN,
 *  matching admin_advise's convention). */
export function refusalHeadline(lang: LangCode): string {
  const l = lc(lang);
  return l === 'hi'
    ? '🚫 यह मैं नहीं करूँगा — और कारण आपके अपने ब्रीफ़ से है'
    : l === 'bn'
      ? '🚫 এটি আমি করব না — এবং কারণটি আপনার নিজের ব্রিফ থেকেই'
      : '🚫 That one I won’t do — and the reason is your own brief';
}
