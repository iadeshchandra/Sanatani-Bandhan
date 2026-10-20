/**
 * ai/godmode/termsTools.ts — Copilot terms/history/simulation tools (PURE).
 * =====================================================================
 * QUEUED #32. Everything here is a pure function over #31's types
 * (lib/termsConfig) — no Firestore, no writes, fully unit-testable.
 * The executors in copilotTasks.ts fetch the real terms/history and hand
 * them here; every number in a Copilot answer is computed by this module
 * from that real data. Nothing is invented; unparseable input returns
 * null and the executor asks a clarifying question instead of guessing.
 *
 * The Copilot NEVER writes config: buildProposal only shapes a proposal;
 * the write happens when the owner saves in the Plans & Terms editor.
 */

import {
  validateCommissionTerms,
  validateTermsSet,
  type CommissionTerms,
  type PlatformTerms,
  type TermsLimits,
  type TermsPlan,
  type TermsPlanId,
} from '../../lib/termsConfig';
import type { FigureClaim, LangCode } from '../types';
import { dualAverage, dualCommission } from './accuracy';
import { checkAgainstBrief, type BriefWarning } from './ownerBrief';

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

type Cur = 'INR' | 'BDT' | 'USD';
const CUR_SYM: Record<Cur, string> = { INR: '₹', BDT: '৳', USD: '$' };
const CURRENCIES: Cur[] = ['INR', 'BDT', 'USD'];

export function fmtMoney(v: number, cur: Cur): string {
  // Non-integer prices exist in the law (Pro is $2.50) — never round them away.
  const body = Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toFixed(2);
  return `${CUR_SYM[cur]}${body}`;
}

export function fmtStamp(iso?: string | null): string {
  if (!iso) return 'never edited (code defaults)';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'date unknown';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtLimit(v: number): string {
  return v === -1 ? '∞ unlimited' : v.toLocaleString('en-IN');
}

function lc(lang: LangCode): 'en' | 'hi' | 'bn' {
  return lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
}

/* ------------------------------------------------------------------ */
/* admin_terms — formatting                                            */
/* ------------------------------------------------------------------ */

const LIMIT_LABELS: Array<{ key: keyof TermsLimits; label: string }> = [
  { key: 'maxDevotees', label: 'devotees' },
  { key: 'maxTransactionsPerMonth', label: 'txns/mo' },
  { key: 'maxSeats', label: 'seats' },
  { key: 'maxBranches', label: 'branches' },
];

export function formatPlanLine(plan: TermsPlan): string {
  const lim = LIMIT_LABELS.map(({ key, label }) => `${label} ${fmtLimit(plan.limits[key])}`).join(' · ');
  const pro = plan.id === 'purohit_pro' ? ` · advertised commission ${plan.commissionPercent ?? 12}%` : '';
  return (
    `${plan.active === false ? '⏸ ' : ''}${plan.name} — ` +
    `${fmtMoney(plan.priceMonthlyINR, 'INR')}·${fmtMoney(plan.priceMonthlyBDT, 'BDT')}·${fmtMoney(plan.priceMonthlyUSD, 'USD')}/mo · ` +
    `${fmtMoney(plan.priceYearlyINR, 'INR')}·${fmtMoney(plan.priceYearlyBDT, 'BDT')}·${fmtMoney(plan.priceYearlyUSD, 'USD')}/yr · ${lim}${pro} · updated ${fmtStamp(plan.updatedAt)}`
  );
}

export function formatTermsSummary(terms: PlatformTerms, lang: LangCode): string {
  const l = lc(lang);
  const head =
    l === 'hi'
      ? '💰 आपकी वर्तमान शर्तें (लाइव कॉन्फ़िग से):'
      : l === 'bn'
        ? '💰 আপনার বর্তমান শর্তাবলী (লাইভ কনফিগ থেকে):'
        : '💰 Your current terms (from the live config):';
  const ids: TermsPlanId[] = ['seva', 'standard', 'premium', 'purohit_pro'];
  const lines = ids.map((id) => `· ${formatPlanLine(terms.plans[id])}`);
  const c = terms.commission;
  const comm =
    l === 'hi'
      ? `· कमीशन — समुदाय ${c.freeRate}% · प्रो रेल-1 ${c.proRail1Rate}% · प्रो रेल-2 ${c.proRail2Rate}% · मुफ़्त स्तर गिग सीमा ${c.freeGigLimit}`
      : l === 'bn'
        ? `· কমিশন — সম্প্রদায় ${c.freeRate}% · প্রো রেল-১ ${c.proRail1Rate}% · প্রো রেল-২ ${c.proRail2Rate}% · ফ্রি স্তরের গিগ সীমা ${c.freeGigLimit}`
        : `· Commission — community ${c.freeRate}% · Pro Rail-1 ${c.proRail1Rate}% · Pro Rail-2 ${c.proRail2Rate}% · free-tier gig cap ${c.freeGigLimit} active gigs`;
  const foot =
    terms.loadedAt === null
      ? l === 'hi'
        ? 'ℹ️ कॉन्फ़िग पढ़ा नहीं जा सका — ऊपर कोड-डिफ़ॉल्ट (लॉक्ड) मूल्य हैं, अनुमान नहीं।'
        : l === 'bn'
          ? 'ℹ️ কনফিগ পড়া যায়নি — উপরে কোডের ডিফল্ট (লক করা) মান, অনুমান নয়।'
          : 'ℹ️ The config could not be read just now — the values above are the locked code defaults, not a guess.'
      : '';
  return [head, ...lines, comm, foot].filter(Boolean).join('\n');
}

/* ------------------------------------------------------------------ */
/* admin_history — before/after diff rendering                         */
/* ------------------------------------------------------------------ */

/** Structural mirror of firestoreAdmin's TermsHistoryEntry (kept local
 *  so this pure module never imports the admin SDK layer). */
export interface TermsHistoryEntryLike {
  id: string;
  action: string;
  at: string | null;
  actorUid?: string | null;
  actorEmail?: string | null;
  kind: 'plan' | 'commission';
  planId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  warnings?: string[];
}

const PRICE_META: Array<{ key: string; cur: Cur; period: 'Monthly' | 'Yearly' }> = [
  { key: 'priceMonthlyINR', cur: 'INR', period: 'Monthly' },
  { key: 'priceYearlyINR', cur: 'INR', period: 'Yearly' },
  { key: 'priceMonthlyBDT', cur: 'BDT', period: 'Monthly' },
  { key: 'priceYearlyBDT', cur: 'BDT', period: 'Yearly' },
  { key: 'priceMonthlyUSD', cur: 'USD', period: 'Monthly' },
  { key: 'priceYearlyUSD', cur: 'USD', period: 'Yearly' },
];

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Field-level old → new lines for one history entry. */
export function diffTermsHistoryEntry(entry: TermsHistoryEntryLike): string[] {
  const { before, after } = entry;
  if (!after) return [];
  if (!before) return ['First recorded state — no earlier values were captured.'];
  const lines: string[] = [];
  if (entry.kind === 'commission') {
    const fields: Array<{ key: keyof CommissionTerms; label: string; pct?: boolean }> = [
      { key: 'freeRate', label: 'Community rate', pct: true },
      { key: 'proRail1Rate', label: 'Pro Rail-1 rate', pct: true },
      { key: 'proRail2Rate', label: 'Pro Rail-2 rate', pct: true },
      { key: 'freeGigLimit', label: 'Free-tier gig cap' },
    ];
    for (const f of fields) {
      const b = num(before[f.key]);
      const a = num(after[f.key]);
      if (b !== null && a !== null && b !== a) {
        lines.push(`${f.label}: ${f.pct ? `${b}%` : b} → ${f.pct ? `${a}%` : a}`);
      }
    }
    return lines;
  }
  if (typeof before['name'] === 'string' && typeof after['name'] === 'string' && before['name'] !== after['name']) {
    lines.push(`Name: ${before['name']} → ${after['name']}`);
  }
  if (before['active'] !== after['active']) {
    lines.push(`Active: ${before['active'] ? 'on' : 'off'} → ${after['active'] ? 'on' : 'off'}`);
  }
  for (const m of PRICE_META) {
    const b = num(before[m.key]);
    const a = num(after[m.key]);
    if (b !== null && a !== null && b !== a) {
      lines.push(`${m.period} ${m.cur}: ${fmtMoney(b, m.cur)} → ${fmtMoney(a, m.cur)}`);
    }
  }
  const bl = (before['limits'] || {}) as Record<string, unknown>;
  const al = (after['limits'] || {}) as Record<string, unknown>;
  for (const { key, label } of LIMIT_LABELS) {
    const b = num(bl[key]);
    const a = num(al[key]);
    if (b !== null && a !== null && b !== a) {
      lines.push(`Max ${label}: ${fmtLimit(b)} → ${fmtLimit(a)}`);
    }
  }
  const bc = num(before['commissionPercent']);
  const ac = num(after['commissionPercent']);
  if (bc !== null && ac !== null && bc !== ac) {
    lines.push(`Pro commission %: ${bc}% → ${ac}%`);
  }
  return lines;
}

export function formatTermsHistory(
  entries: TermsHistoryEntryLike[],
  lang: LangCode,
  limit = 8
): string {
  const l = lc(lang);
  if (entries.length === 0) {
    return l === 'hi'
      ? '🕰 अभी तक कोई शर्त-परिवर्तन दर्ज नहीं है। जब आप Plans & Terms में कुछ सहेजेंगे, वह यहाँ दिखेगा।'
      : l === 'bn'
        ? '🕰 এখনো কোনো শর্ত-পরিবর্তন নথিভুক্ত নেই। Plans & Terms-এ কিছু সংরক্ষণ করলেই এখানে দেখা যাবে।'
        : '🕰 No terms changes recorded yet. The moment you save something in Plans & Terms, it will appear here.';
  }
  const head =
    l === 'hi'
      ? `🕰 शर्तों का इतिहास — नवीनतम ${Math.min(limit, entries.length)} परिवर्तन:`
      : l === 'bn'
        ? `🕰 শর্তের ইতিহাস — সর্বশেষ ${Math.min(limit, entries.length)}টি পরিবর্তন:`
        : `🕰 Terms history — the latest ${Math.min(limit, entries.length)} change${entries.length === 1 ? '' : 's'}:`;
  const blocks = entries.slice(0, limit).map((e) => {
    const title =
      e.kind === 'commission'
        ? 'Commission terms'
        : (typeof e.after?.['name'] === 'string' ? (e.after['name'] as string) : e.planId || 'Plan');
    const tag = e.action === 'terms.plans.reset' ? ' (reset to defaults)' : '';
    const who = e.actorEmail || 'you';
    const diffs = diffTermsHistoryEntry(e);
    const body = diffs.length ? diffs.map((d) => `   · ${d}`).join('\n') : '   · Values saved (no field differences).';
    return `· ${title}${tag} — ${fmtStamp(e.at)} · by ${who}\n${body}`;
  });
  const more =
    entries.length > limit
      ? `\n… and ${entries.length - limit} more in Plans & Terms → Terms history (where revert lives too).`
      : '\nFull history — and revert — lives in Plans & Terms → Terms history.';
  return [head, ...blocks].join('\n') + more;
}

/* ------------------------------------------------------------------ */
/* Change parsing — simulate + draft share one deterministic parser    */
/* ------------------------------------------------------------------ */

export interface TermsProposal {
  kind: 'plan' | 'commission';
  planId?: TermsPlanId;
  /** Canonical field key, e.g. 'priceMonthlyBDT' | 'freeRate' | 'maxDevotees'. */
  field: string;
  fieldLabel: string;
  oldValue: number;
  newValue: number;
  /** Flat patch for the editor handoff (plan prices / commission fields). */
  patch: Record<string, number>;
  /** Nested limits patch (plan limit fields). */
  limitsPatch?: Record<string, number>;
}

const PLAN_MATCHERS: Array<{ id: TermsPlanId; re: RegExp }> = [
  { id: 'purohit_pro', re: /\b(purohit\s*pro|pro plan|pro)\b/ },
  { id: 'premium', re: /\bpremium\b/ },
  { id: 'standard', re: /\bstandard\b/ },
  { id: 'seva', re: /\bseva\b/ },
];

function lastNumber(text: string): number | null {
  const matches = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)/g)];
  if (matches.length === 0) return null;
  const v = Number(matches[matches.length - 1][1].replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

function detectCurrency(text: string): Cur {
  if (/(taka|bdt|৳|bangladesh)/.test(text)) return 'BDT';
  if (/(\$|dollar|usd)/.test(text)) return 'USD';
  return 'INR'; // ₹ / rupee / inr / unmarked all default to INR
}

/**
 * Parse a natural change request into a proposal against CURRENT terms.
 * Deterministic and conservative: returns null whenever the plan/field/
 * value cannot be pinned — the caller asks a clarifying question rather
 * than guessing with the owner's prices.
 */
export function parseTermsChange(input: string, terms: PlatformTerms): TermsProposal | null {
  const text = (input || '').toLowerCase();
  const value = lastNumber(text);
  if (value === null && !/unlimited/.test(text)) return null;

  // Commission shapes first — they name their field explicitly.
  if (/(gig\s*(limit|cap)|free\s*tier\s*gig)/.test(text)) {
    return {
      kind: 'commission',
      field: 'freeGigLimit',
      fieldLabel: 'Free-tier gig cap',
      oldValue: terms.commission.freeGigLimit,
      newValue: value ?? terms.commission.freeGigLimit,
      patch: { freeGigLimit: value ?? terms.commission.freeGigLimit },
    };
  }
  const rail = text.match(/rail[\s-]?([12])/);
  if (rail) {
    const field = rail[1] === '1' ? 'proRail1Rate' : 'proRail2Rate';
    return {
      kind: 'commission',
      field,
      fieldLabel: rail[1] === '1' ? 'Pro Rail-1 rate' : 'Pro Rail-2 rate',
      oldValue: terms.commission[field],
      newValue: value as number,
      patch: { [field]: value as number },
    };
  }

  const planMatch = PLAN_MATCHERS.find((p) => p.re.test(text));
  if (planMatch) {
    const plan = terms.plans[planMatch.id];
    // Pro plan's advertised commission % (not a rail rate).
    if (planMatch.id === 'purohit_pro' && /commission/.test(text)) {
      const old = plan.commissionPercent ?? 12;
      return {
        kind: 'plan',
        planId: planMatch.id,
        field: 'commissionPercent',
        fieldLabel: `${plan.name} · Advertised commission %`,
        oldValue: old,
        newValue: value as number,
        patch: { commissionPercent: value as number },
      };
    }
    // Limit fields.
    const LIMIT_MATCHERS: Array<{ key: keyof TermsLimits; label: string; re: RegExp }> = [
      { key: 'maxDevotees', label: 'Max devotees', re: /devotee/ },
      { key: 'maxTransactionsPerMonth', label: 'Max transactions / month', re: /transaction/ },
      { key: 'maxSeats', label: 'Max staff seats', re: /seat/ },
      { key: 'maxBranches', label: 'Max branches', re: /branch/ },
    ];
    const limitHit = LIMIT_MATCHERS.find((m) => m.re.test(text)) ?? null;
    if (limitHit || /limit|cap/.test(text)) {
      if (!limitHit) return null; // a limit was mentioned but not which one
      const newV = /unlimited/.test(text) ? -1 : (value as number);
      return {
        kind: 'plan',
        planId: planMatch.id,
        field: limitHit.key,
        fieldLabel: `${plan.name} · ${limitHit.label}`,
        oldValue: plan.limits[limitHit.key],
        newValue: newV,
        patch: {},
        limitsPatch: { [limitHit.key]: newV },
      };
    }
    // Price fields.
    const cur = detectCurrency(text);
    const yearly = /(annual|yearly|per year|\/yr\b|\/year\b)/.test(text);
    const field = `${yearly ? 'priceYearly' : 'priceMonthly'}${cur}`;
    const old = (plan as unknown as Record<string, number>)[field];
    return {
      kind: 'plan',
      planId: planMatch.id,
      field,
      fieldLabel: `${plan.name} · ${yearly ? 'Yearly' : 'Monthly'} · ${cur}`,
      oldValue: old,
      newValue: value as number,
      patch: { [field]: value as number },
    };
  }

  // Community / free commission rate.
  if (/commission/.test(text) && /(community|free)/.test(text)) {
    return {
      kind: 'commission',
      field: 'freeRate',
      fieldLabel: 'Community rate',
      oldValue: terms.commission.freeRate,
      newValue: value as number,
      patch: { freeRate: value as number },
    };
  }
  return null;
}

export interface ProposalVerdict {
  proposal: TermsProposal;
  errors: string[];
  warnings: string[];
}

/** Parse + validate. Errors mean the change must NOT be drafted. */
export function buildProposal(input: string, terms: PlatformTerms): ProposalVerdict | null {
  const proposal = parseTermsChange(input, terms);
  if (!proposal) return null;
  if (proposal.kind === 'plan' && proposal.planId) {
    const candidate: TermsPlan = {
      ...terms.plans[proposal.planId],
      ...proposal.patch,
      limits: { ...terms.plans[proposal.planId].limits, ...(proposal.limitsPatch || {}) },
    } as TermsPlan;
    const setMap = { ...terms.plans, [proposal.planId]: candidate };
    const v = validateTermsSet(setMap as Record<TermsPlanId, TermsPlan>);
    return { proposal, errors: v.errors, warnings: v.warnings };
  }
  const candidate: CommissionTerms = { ...terms.commission, ...proposal.patch };
  const v = validateCommissionTerms(candidate);
  return { proposal, errors: v.errors, warnings: v.warnings };
}

/** Apply a proposal to a terms snapshot (for simulation / brief checks). */
export function buildCandidateTerms(terms: PlatformTerms, proposal: TermsProposal): PlatformTerms {
  if (proposal.kind === 'plan' && proposal.planId) {
    const plan = terms.plans[proposal.planId];
    return {
      ...terms,
      plans: {
        ...terms.plans,
        [proposal.planId]: {
          ...plan,
          ...proposal.patch,
          limits: { ...plan.limits, ...(proposal.limitsPatch || {}) },
        },
      },
    };
  }
  return { ...terms, commission: { ...terms.commission, ...proposal.patch } };
}

/* ------------------------------------------------------------------ */
/* admin_simulate — pure impact maths                                  */
/* ------------------------------------------------------------------ */

export interface SimulationResult {
  proposal: TermsProposal;
  lines: string[];
  warnings: BriefWarning[];
  /**
   * QUEUED #36 — set when the two independent commission computations
   * disagree. The formatted answer then shows NEITHER figure
   * (fail-honest); the disagreeing values live here as dev metadata.
   */
  discrepancy?: {
    field: string;
    amount: number;
    rate: number;
    floatPath: number;
    integerPath: number;
  };
}

const SAMPLE_ORDERS = [500, 2000, 10000];

/** Render a proposal value the way simulation/draft text cites it. */
export function fmtProposalValue(field: string, v: number): string {
  return field.startsWith('price')
    ? fmtMoney(v, (field.slice(-3) as Cur) || 'INR')
    : field.endsWith('Rate') || field === 'commissionPercent'
      ? `${v}%`
      : fmtLimit(v);
}

export function simulateTermsChange(terms: PlatformTerms, proposal: TermsProposal): SimulationResult {
  const lines: string[] = [];
  const candidate = buildCandidateTerms(terms, proposal);
  const fmtVal = fmtProposalValue;

  lines.push(`${proposal.fieldLabel}: ${fmtVal(proposal.field, proposal.oldValue)} → ${fmtVal(proposal.field, proposal.newValue)}`);

  if (proposal.kind === 'plan' && proposal.field.startsWith('price') && proposal.planId) {
    const plan = terms.plans[proposal.planId];
    const cur = proposal.field.slice(-3) as Cur;
    const isMonthly = proposal.field.startsWith('priceMonthly');
    const monthly = isMonthly ? proposal.newValue : plan[`priceMonthly${cur}`];
    const yearly = isMonthly ? plan[`priceYearly${cur}`] : proposal.newValue;
    if (monthly > 0) {
      lines.push(
        `Annual law check: yearly ${fmtMoney(yearly, cur)} = ${(yearly / monthly).toFixed(1)} × monthly after this change (the law is 10× — "2 months free").`
      );
    }
    const delta = proposal.newValue - proposal.oldValue;
    lines.push(
      `Per subscriber: ${delta >= 0 ? '+' : ''}${fmtMoney(delta, cur)} per ${isMonthly ? 'month' : 'year'} on this plan — multiply by the plan's active subscribers for the platform effect. Applies to NEW checkouts only; existing subscriptions keep their price.`
    );
  }

  if (proposal.kind === 'commission' && proposal.field.endsWith('Rate')) {
    // QUEUED #36 — every money figure is computed TWICE (float formula
    // vs integer arithmetic, accuracy.ts). On any disagreement the
    // simulation fails honest: no sample figures are produced at all.
    for (const amt of SAMPLE_ORDERS) {
      const oldDual = dualCommission(amt, proposal.oldValue);
      const newDual = dualCommission(amt, proposal.newValue);
      const bad = !oldDual.agree ? { dual: oldDual, rate: proposal.oldValue } : !newDual.agree ? { dual: newDual, rate: proposal.newValue } : null;
      if (bad) {
        return {
          proposal,
          lines: [],
          warnings: [],
          discrepancy: {
            field: proposal.field,
            amount: amt,
            rate: bad.rate,
            floatPath: bad.dual.floatPath,
            integerPath: bad.dual.integerPath,
          },
        };
      }
      const takeOld = oldDual.value as number;
      const takeNew = newDual.value as number;
      lines.push(
        `On a ₹${amt.toLocaleString('en-IN')} order — platform keeps ₹${takeOld.toLocaleString('en-IN')} → ₹${takeNew.toLocaleString('en-IN')} · provider receives ₹${(amt - takeOld).toLocaleString('en-IN')} → ₹${(amt - takeNew).toLocaleString('en-IN')}`
      );
    }
    lines.push('Applies to NEW orders only — past orders keep their commission snapshot.');
  }

  if (proposal.field === 'freeGigLimit') {
    lines.push(
      `Community providers could hold ${proposal.newValue} active gigs (today ${proposal.oldValue}). Higher caps widen the free tier; lower caps push providers toward Pro — or away.`
    );
  }

  // Brief rubric over the candidate — drift excluded (a proposal IS drift).
  const warnings = checkAgainstBrief(candidate).filter((w) => w.kind !== 'drift');
  return { proposal, lines, warnings };
}

export function formatSimulation(sim: SimulationResult, lang: LangCode): string {
  const l = lc(lang);
  // QUEUED #36 — dual-computation disagreement: show NEITHER figure.
  // The disagreeing values are dev metadata (SimulationResult.discrepancy),
  // never owner-facing numbers.
  if (sim.discrepancy) {
    return l === 'hi'
      ? '🧮 मेरी दो स्वतंत्र गणनाएँ कमीशन के आँकड़ों पर सहमत नहीं हुईं — इसलिए मैं कोई भी आँकड़ा नहीं दिखाऊँगा। कृपया Plans & Terms → Commission में दरें सीधे जाँचें। कुछ भी बदला नहीं गया है।'
      : l === 'bn'
        ? '🧮 আমার দুটি স্বাধীন গণনা কমিশনের সংখ্যায় একমত হয়নি — তাই আমি কোনো সংখ্যাই দেখাব না। অনুগ্রহ করে Plans & Terms → Commission-এ হার সরাসরি যাচাই করুন। কিছুই বদলায়নি।'
        : '🧮 My two independent calculations of the commission disagree, so I will not show either figure. Please check the rates directly in Plans & Terms → Commission. Nothing has been changed.';
  }
  const head =
    l === 'hi' ? '🧮 परिदृश्य — यदि आप यह परिवर्तन करें:' : l === 'bn' ? '🧮 দৃশ্যকল্প — এই পরিবর্তন করলে:' : '🧮 Simulation — if you make this change:';
  const warn =
    sim.warnings.length > 0
      ? '\n⚠ Against your own brief:\n' + sim.warnings.map((w) => `· ${w.message}`).join('\n')
      : '';
  const foot =
    l === 'hi'
      ? '\nयह केवल एक परिदृश्य है — कुछ बदला नहीं गया। चाहें तो कहें "बदलाव का मसौदा बनाएँ" — मैं Plans & Terms में समीक्षा हेतु तैयार कर दूँगा।'
      : l === 'bn'
        ? '\nএটি শুধু একটি দৃশ্যকল্প — কিছু বদলায়নি। চাইলে বলুন "খসড়া তৈরি করো" — Plans & Terms-এ পর্যালোচনার জন্য সাজিয়ে দেব।'
        : '\nSimulation only — nothing has changed. If you want it, ask me to draft the change and I will prepare it in Plans & Terms for your review.';
  return [head, ...sim.lines.map((x) => `· ${x}`)].join('\n') + warn + foot;
}

/* ------------------------------------------------------------------ */
/* QUEUED #36 — figure claims: every figure an answer cites, declared  */
/* by the same module that formats it. The pipeline verifier (ask())   */
/* re-checks each claim's rendered string against the final text.      */
/* ------------------------------------------------------------------ */

const PRICE_CLAIM_META: Array<{ key: string; cur: Cur; period: 'Monthly' | 'Yearly' }> = [
  { key: 'priceMonthlyINR', cur: 'INR', period: 'Monthly' },
  { key: 'priceYearlyINR', cur: 'INR', period: 'Yearly' },
  { key: 'priceMonthlyBDT', cur: 'BDT', period: 'Monthly' },
  { key: 'priceYearlyBDT', cur: 'BDT', period: 'Yearly' },
  { key: 'priceMonthlyUSD', cur: 'USD', period: 'Monthly' },
  { key: 'priceYearlyUSD', cur: 'USD', period: 'Yearly' },
];

/** Claims for formatTermsSummary's figures (prices, limits, commission). */
export function termsFigureClaims(terms: PlatformTerms): FigureClaim[] {
  const claims: FigureClaim[] = [];
  const ids: TermsPlanId[] = ['seva', 'standard', 'premium', 'purohit_pro'];
  for (const id of ids) {
    const plan = terms.plans[id];
    for (const m of PRICE_CLAIM_META) {
      const v = (plan as unknown as Record<string, number>)[m.key];
      claims.push({
        id: `${id}.${m.key}`,
        label: `${plan.name} · ${m.period} · ${m.cur}`,
        value: v,
        rendered: fmtMoney(v, m.cur),
      });
    }
    for (const { key, label } of LIMIT_LABELS) {
      const v = plan.limits[key];
      claims.push({
        id: `${id}.limits.${key}`,
        label: `${plan.name} · Max ${label}`,
        value: v,
        rendered: v === -1 ? '∞ unlimited' : fmtLimit(v),
      });
    }
    if (id === 'purohit_pro') {
      const v = plan.commissionPercent ?? 12;
      claims.push({
        id: 'purohit_pro.commissionPercent',
        label: `${plan.name} · Advertised commission`,
        value: v,
        rendered: `${v}%`,
      });
    }
  }
  const c = terms.commission;
  const rateClaims: Array<{ key: keyof CommissionTerms; label: string }> = [
    { key: 'freeRate', label: 'Commission · Community rate' },
    { key: 'proRail1Rate', label: 'Commission · Pro Rail-1 rate' },
    { key: 'proRail2Rate', label: 'Commission · Pro Rail-2 rate' },
  ];
  for (const r of rateClaims) {
    claims.push({
      id: `commission.${r.key}`,
      label: r.label,
      value: c[r.key],
      rendered: `${c[r.key]}%`,
    });
  }
  claims.push({
    id: 'commission.freeGigLimit',
    label: 'Commission · Free-tier gig cap',
    value: c.freeGigLimit,
    rendered: `${c.freeGigLimit}`,
  });
  return claims;
}

/** Claims for formatTermsHistory: the head count + each rendered diff line. */
export function historyFigureClaims(entries: TermsHistoryEntryLike[], limit = 8): FigureClaim[] {
  if (entries.length === 0) return [];
  const claims: FigureClaim[] = [
    {
      id: 'history.shownCount',
      label: 'Terms changes shown',
      value: Math.min(limit, entries.length),
      rendered: `${Math.min(limit, entries.length)}`,
    },
  ];
  entries.slice(0, limit).forEach((e, i) => {
    for (const line of diffTermsHistoryEntry(e)) {
      claims.push({
        id: `history.${e.id || i}.diff`,
        label: 'Recorded change',
        value: 0,
        rendered: line,
      });
    }
  });
  return claims;
}

/** Claims for formatSimulation's figures (mirrors its line structure). */
export function simulationFigureClaims(terms: PlatformTerms, sim: SimulationResult): FigureClaim[] {
  if (sim.discrepancy) return [];
  const { proposal } = sim;
  const claims: FigureClaim[] = [
    {
      id: 'sim.oldValue',
      label: `${proposal.fieldLabel} · current`,
      value: proposal.oldValue,
      rendered: fmtProposalValue(proposal.field, proposal.oldValue),
    },
    {
      id: 'sim.newValue',
      label: `${proposal.fieldLabel} · proposed`,
      value: proposal.newValue,
      rendered: fmtProposalValue(proposal.field, proposal.newValue),
    },
  ];
  if (proposal.kind === 'plan' && proposal.field.startsWith('price') && proposal.planId) {
    const plan = terms.plans[proposal.planId];
    const cur = proposal.field.slice(-3) as Cur;
    const isMonthly = proposal.field.startsWith('priceMonthly');
    const monthly = isMonthly ? proposal.newValue : plan[`priceMonthly${cur}`];
    const yearly = isMonthly ? plan[`priceYearly${cur}`] : proposal.newValue;
    if (monthly > 0) {
      claims.push(
        { id: 'sim.annual.yearly', label: `${plan.name} · Yearly · ${cur}`, value: yearly, rendered: fmtMoney(yearly, cur) },
        { id: 'sim.annual.ratio', label: `${plan.name} · Annual ratio`, value: Number((yearly / monthly).toFixed(1)), rendered: (yearly / monthly).toFixed(1) }
      );
    }
    const delta = proposal.newValue - proposal.oldValue;
    claims.push({
      id: 'sim.delta',
      label: `${plan.name} · Per-subscriber change · ${cur}`,
      value: delta,
      rendered: fmtMoney(delta, cur),
    });
  }
  if (proposal.kind === 'commission' && proposal.field.endsWith('Rate')) {
    for (const amt of SAMPLE_ORDERS) {
      const takeOld = dualCommission(amt, proposal.oldValue).value;
      const takeNew = dualCommission(amt, proposal.newValue).value;
      if (takeOld === null || takeNew === null) continue;
      claims.push(
        { id: `sim.order${amt}.amount`, label: `Sample order`, value: amt, rendered: `₹${amt.toLocaleString('en-IN')}` },
        { id: `sim.order${amt}.takeOld`, label: `Platform keeps today on a ₹${amt.toLocaleString('en-IN')} order`, value: takeOld, rendered: `₹${takeOld.toLocaleString('en-IN')}` },
        { id: `sim.order${amt}.takeNew`, label: `Platform keeps after on a ₹${amt.toLocaleString('en-IN')} order`, value: takeNew, rendered: `₹${takeNew.toLocaleString('en-IN')}` },
        { id: `sim.order${amt}.providerOld`, label: `Provider receives today on a ₹${amt.toLocaleString('en-IN')} order`, value: amt - takeOld, rendered: `₹${(amt - takeOld).toLocaleString('en-IN')}` },
        { id: `sim.order${amt}.providerNew`, label: `Provider receives after on a ₹${amt.toLocaleString('en-IN')} order`, value: amt - takeNew, rendered: `₹${(amt - takeNew).toLocaleString('en-IN')}` }
      );
    }
  }
  return claims;
}

/* ------------------------------------------------------------------ */
/* admin_advise — structured strategic counsel                         */
/* ------------------------------------------------------------------ */

export interface AdviceContext {
  /**
   * Terms-history entries in the recent window (momentum signal).
   * QUEUED #36: null when the history could NOT be read — counsel must
   * abstain on momentum rather than phrase "0 changes" over missing data.
   */
  recentChangeCount: number | null;
}

/**
 * Deterministic strategic counsel: where we stand (real numbers) →
 * options → recommendation → risks, citing the owner's heuristics by
 * name. It never forecasts demand — it reasons from the brief + terms.
 * QUEUED #36: also returns the figure claims the text cites.
 */
export function composeAdviceWithClaims(
  input: string,
  terms: PlatformTerms,
  adviceCtx: AdviceContext,
  lang: LangCode
): { text: string; claims: FigureClaim[] } {
  const l = lc(lang);
  const head = l === 'hi' ? '🧭 मेरी सलाह' : l === 'bn' ? '🧭 আমার পরামর্শ' : '🧭 My counsel';
  const text = (input || '').toLowerCase();
  const verdict = buildProposal(input, terms);
  const proposal = verdict?.proposal ?? null;
  const c = terms.commission;
  const rateClaims: FigureClaim[] = [
    { id: 'commission.freeRate', label: 'Commission · Community rate', value: c.freeRate, rendered: `${c.freeRate}%` },
    { id: 'commission.proRail1Rate', label: 'Commission · Pro Rail-1 rate', value: c.proRail1Rate, rendered: `${c.proRail1Rate}%` },
    { id: 'commission.proRail2Rate', label: 'Commission · Pro Rail-2 rate', value: c.proRail2Rate, rendered: `${c.proRail2Rate}%` },
  ];

  // — Price / commission questions with a concrete number —
  if (proposal && proposal.kind === 'plan' && proposal.field.startsWith('price')) {
    const sim = simulateTermsChange(terms, proposal);
    const raising = proposal.newValue > proposal.oldValue;
    const warnLines = sim.warnings.map((w) => `· ${w.message}`).join('\n');
    // QUEUED #36 — abstention: an unreadable history is NOT "0 changes".
    const momentum =
      adviceCtx.recentChangeCount === null
        ? 'I couldn\'t read the recent change history just now, so I won\'t guess at momentum.'
        : `${adviceCtx.recentChangeCount} terms change(s) in the recent window — ${adviceCtx.recentChangeCount > 2 ? 'the ground has moved a lot lately; let this one settle unless it is urgent.' : 'terms have been steady.'}`;
    // The halfway figure is dual-computed; on disagreement it is not shown.
    const half = dualAverage(proposal.oldValue, proposal.newValue);
    const cur = proposal.field.slice(-3) as Cur;
    const claims: FigureClaim[] = [
      { id: 'advise.oldValue', label: proposal.fieldLabel, value: proposal.oldValue, rendered: fmtValForAdvice(proposal) },
      { id: 'advise.newValue', label: `${proposal.fieldLabel} · proposed`, value: proposal.newValue, rendered: `${proposal.newValue}` },
    ];
    if (adviceCtx.recentChangeCount !== null) {
      claims.push({
        id: 'advise.recentChangeCount',
        label: 'Terms changes in the recent window',
        value: adviceCtx.recentChangeCount,
        rendered: `${adviceCtx.recentChangeCount}`,
      });
    }
    if (sim.lines[1]) {
      // The annual-law line is included in option 2 — claim its figures.
      const plan = terms.plans[proposal.planId as TermsPlanId];
      const isMonthly = proposal.field.startsWith('priceMonthly');
      const monthly = isMonthly ? proposal.newValue : plan[`priceMonthly${cur}`];
      const yearly = isMonthly ? plan[`priceYearly${cur}`] : proposal.newValue;
      if (monthly > 0) {
        claims.push(
          { id: 'advise.annual.yearly', label: `${plan.name} · Yearly · ${cur}`, value: yearly, rendered: fmtMoney(yearly, cur) },
          { id: 'advise.annual.ratio', label: `${plan.name} · Annual ratio`, value: Number((yearly / monthly).toFixed(1)), rendered: (yearly / monthly).toFixed(1) }
        );
      }
    }
    if (half.agree && half.value !== null) {
      claims.push({ id: 'advise.halfway', label: `${proposal.fieldLabel} · halfway`, value: half.value, rendered: `${half.value}` });
    }
    return {
      text: [
        `${head} — ${proposal.fieldLabel}`,
        `Where we stand: ${proposal.fieldLabel} is ${fmtValForAdvice(proposal)} today; ${momentum}`,
        'Options:',
        `1) Keep ${fmtValForAdvice(proposal)} — stability is itself a trust signal.`,
        `2) Move to ${proposal.newValue} — ${sim.lines[1] || ''}`,
        half.agree
          ? `3) Meet halfway at ${half.value} — a gentler step you can repeat.`
          : '3) Meet halfway — a gentler step you can repeat.',
        `My recommendation: ${raising ? 'if you move, move once and say why — dignity and sustainability, never a "sale" (your never-discount-the-sacred rule). Announce it before it bites; new checkouts only.' : 'a lower price is a gift that is hard to take back — be sure the volume story is real before you give it.'}`,
        warnLines ? `Risks, from your own brief:\n${warnLines}` : 'Risks: quiet ones — watch signups on this plan for two weeks after any move.',
      ].join('\n'),
      claims,
    };
  }

  if (proposal && proposal.kind === 'commission') {
    const raising = proposal.newValue > proposal.oldValue;
    // QUEUED #36 — the Pro floor price is read LIVE, never hardcoded prose.
    const proFloorBdt = fmtMoney(terms.plans.purohit_pro.priceMonthlyBDT, 'BDT');
    return {
      text: [
        `${head} — ${proposal.fieldLabel}`,
        `Where we stand: community ${c.freeRate}% · Pro Rail-1 ${c.proRail1Rate}% · Pro Rail-2 ${c.proRail2Rate}% · free-tier gig cap ${c.freeGigLimit}.`,
        'Options:',
        `1) Hold the rates — the subscription floor (Pro at ${proFloorBdt}/mo) is the bypass-proof income; commission is upside.`,
        `2) Move ${proposal.fieldLabel} to ${proposal.newValue}% — sample-order effects are in the simulation if you ask me to run it.`,
        'My recommendation: ' +
          (raising
            ? 'move carefully, if at all. Per your bypass-proof rule, every point of commission teaches providers to take the relationship off-platform — the Pathao lesson. If revenue must grow, grow Pro subscriptions first; they cannot be bypassed.'
            : 'lowering a rate buys goodwill cheaply when volume is real — but pair it with a Pro push so the floor grows too.'),
        'Risks: providers feel commission changes immediately and personally; surprise is the enemy (your trust-is-the-moat rule). New orders only, announced in advance.',
      ].join('\n'),
      claims: [
        ...rateClaims,
        { id: 'commission.freeGigLimit', label: 'Commission · Free-tier gig cap', value: c.freeGigLimit, rendered: `${c.freeGigLimit}` },
        { id: 'purohit_pro.priceMonthlyBDT', label: 'Purohit Pro · Monthly · BDT', value: terms.plans.purohit_pro.priceMonthlyBDT, rendered: proFloorBdt },
        { id: 'advise.newValue', label: `${proposal.fieldLabel} · proposed`, value: proposal.newValue, rendered: `${proposal.newValue}%` },
      ],
    };
  }

  // — Growth questions —
  if (/(grow|growth|revenue|income|earn|বৃদ্ধি|আয়|बढ़|आय|कमाई)/.test(text)) {
    const s = terms.plans.standard;
    const p = terms.plans.premium;
    const pro = terms.plans.purohit_pro;
    return {
      text: [
        `${head} — growing revenue without hurting temples`,
        `Where we stand: Standard ${fmtMoney(s.priceMonthlyINR, 'INR')}·${fmtMoney(s.priceMonthlyBDT, 'BDT')}/mo · Premium ${fmtMoney(p.priceMonthlyINR, 'INR')}·${fmtMoney(p.priceMonthlyBDT, 'BDT')}/mo · Pro ${fmtMoney(pro.priceMonthlyINR, 'INR')}·${fmtMoney(pro.priceMonthlyBDT, 'BDT')}/mo · commission ${c.freeRate}/${c.proRail1Rate}/${c.proRail2Rate}%.`,
        'Options:',
        '1) Grow the floor: more Pro subscriptions — bypass-proof, predictable, and it makes providers stakeholders.',
        '2) Deepen Premium value for organisations (reports, history, multi-admin) before touching its price.',
        '3) Commission last — it is upside, and raising it trains bypass.',
        'My recommendation: option 1, then 2. Per your bypass-proof rule, subscriptions are the income you keep; commission is the income you borrow.',
        'Risks: none structural — the risk is impatience. The floor compounds slowly and then all at once.',
      ].join('\n'),
      claims: [
        { id: 'standard.priceMonthlyINR', label: 'Standard · Monthly · INR', value: s.priceMonthlyINR, rendered: fmtMoney(s.priceMonthlyINR, 'INR') },
        { id: 'standard.priceMonthlyBDT', label: 'Standard · Monthly · BDT', value: s.priceMonthlyBDT, rendered: fmtMoney(s.priceMonthlyBDT, 'BDT') },
        { id: 'premium.priceMonthlyINR', label: 'Premium · Monthly · INR', value: p.priceMonthlyINR, rendered: fmtMoney(p.priceMonthlyINR, 'INR') },
        { id: 'premium.priceMonthlyBDT', label: 'Premium · Monthly · BDT', value: p.priceMonthlyBDT, rendered: fmtMoney(p.priceMonthlyBDT, 'BDT') },
        { id: 'purohit_pro.priceMonthlyINR', label: 'Purohit Pro · Monthly · INR', value: pro.priceMonthlyINR, rendered: fmtMoney(pro.priceMonthlyINR, 'INR') },
        { id: 'purohit_pro.priceMonthlyBDT', label: 'Purohit Pro · Monthly · BDT', value: pro.priceMonthlyBDT, rendered: fmtMoney(pro.priceMonthlyBDT, 'BDT') },
        { id: 'commission.ratesCombined', label: 'Commission rates (community / Rail-1 / Rail-2)', value: c.freeRate, rendered: `${c.freeRate}/${c.proRail1Rate}/${c.proRail2Rate}%` },
      ],
    };
  }

  // — Commission "too high / too low" without a number —
  if (/commission|rate/.test(text)) {
    return {
      text: [
        `${head} — are our rates right?`,
        `Where we stand: community ${c.freeRate}% · Pro Rail-1 ${c.proRail1Rate}% · Pro Rail-2 ${c.proRail2Rate}% — your law baseline is 15 / 8 / 12.`,
        'My recommendation: judge the rates against bypass, not against other platforms\' greed. If providers complete repeat bookings inside the app, the rates are right. If relationships leave after the first booking, the rates are too high — whatever the spreadsheet says.',
        'Ask me "simulate community rate at 12%" and I will show the per-order maths before you decide.',
      ].join('\n'),
      claims: rateClaims,
    };
  }

  // — Honest scope —
  return {
    text: [
      `${head}`,
      'I can counsel on pricing, commission and platform growth — grounded in your brief and the live terms.',
      'Try: "Should I raise Pro to ৳320?" · "Is our commission too high?" · "How do I grow revenue without hurting temples?"',
      'For numbers first, ask "What are our terms?" — I never advise blind.',
    ].join('\n'),
    claims: [],
  };
}

export function composeAdvice(
  input: string,
  terms: PlatformTerms,
  adviceCtx: AdviceContext,
  lang: LangCode
): string {
  return composeAdviceWithClaims(input, terms, adviceCtx, lang).text;
}

function fmtValForAdvice(proposal: TermsProposal): string {
  if (proposal.field.startsWith('price')) {
    return fmtMoney(proposal.oldValue, proposal.field.slice(-3) as Cur);
  }
  return `${proposal.oldValue}`;
}
