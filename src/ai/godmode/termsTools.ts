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
import type { LangCode } from '../types';
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
}

const SAMPLE_ORDERS = [500, 2000, 10000];

export function simulateTermsChange(terms: PlatformTerms, proposal: TermsProposal): SimulationResult {
  const lines: string[] = [];
  const candidate = buildCandidateTerms(terms, proposal);
  const fmtVal = (field: string, v: number): string =>
    field.startsWith('price')
      ? fmtMoney(v, (field.slice(-3) as Cur) || 'INR')
      : field.endsWith('Rate') || field === 'commissionPercent'
        ? `${v}%`
        : fmtLimit(v);

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
    for (const amt of SAMPLE_ORDERS) {
      const takeOld = Math.round((amt * proposal.oldValue) / 100);
      const takeNew = Math.round((amt * proposal.newValue) / 100);
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
/* admin_advise — structured strategic counsel                         */
/* ------------------------------------------------------------------ */

export interface AdviceContext {
  /** Terms-history entries in the recent window (momentum signal). */
  recentChangeCount: number;
}

/**
 * Deterministic strategic counsel: where we stand (real numbers) →
 * options → recommendation → risks, citing the owner's heuristics by
 * name. It never forecasts demand — it reasons from the brief + terms.
 */
export function composeAdvice(
  input: string,
  terms: PlatformTerms,
  adviceCtx: AdviceContext,
  lang: LangCode
): string {
  const l = lc(lang);
  const head = l === 'hi' ? '🧭 मेरी सलाह' : l === 'bn' ? '🧭 আমার পরামর্শ' : '🧭 My counsel';
  const text = (input || '').toLowerCase();
  const verdict = buildProposal(input, terms);
  const proposal = verdict?.proposal ?? null;
  const c = terms.commission;

  // — Price / commission questions with a concrete number —
  if (proposal && proposal.kind === 'plan' && proposal.field.startsWith('price')) {
    const sim = simulateTermsChange(terms, proposal);
    const raising = proposal.newValue > proposal.oldValue;
    const warnLines = sim.warnings.map((w) => `· ${w.message}`).join('\n');
    return [
      `${head} — ${proposal.fieldLabel}`,
      `Where we stand: ${proposal.fieldLabel} is ${fmtValForAdvice(proposal)} today; ${adviceCtx.recentChangeCount} terms change(s) in the recent window — ${adviceCtx.recentChangeCount > 2 ? 'the ground has moved a lot lately; let this one settle unless it is urgent.' : 'terms have been steady.'}`,
      'Options:',
      `1) Keep ${fmtValForAdvice(proposal)} — stability is itself a trust signal.`,
      `2) Move to ${proposal.newValue} — ${sim.lines[1] || ''}`,
      `3) Meet halfway at ${Math.round((proposal.oldValue + proposal.newValue) / 2)} — a gentler step you can repeat.`,
      `My recommendation: ${raising ? 'if you move, move once and say why — dignity and sustainability, never a "sale" (your never-discount-the-sacred rule). Announce it before it bites; new checkouts only.' : 'a lower price is a gift that is hard to take back — be sure the volume story is real before you give it.'}`,
      warnLines ? `Risks, from your own brief:\n${warnLines}` : 'Risks: quiet ones — watch signups on this plan for two weeks after any move.',
    ].join('\n');
  }

  if (proposal && proposal.kind === 'commission') {
    const raising = proposal.newValue > proposal.oldValue;
    return [
      `${head} — ${proposal.fieldLabel}`,
      `Where we stand: community ${c.freeRate}% · Pro Rail-1 ${c.proRail1Rate}% · Pro Rail-2 ${c.proRail2Rate}% · free-tier gig cap ${c.freeGigLimit}.`,
      'Options:',
      `1) Hold the rates — the subscription floor (Pro at ৳280/mo) is the bypass-proof income; commission is upside.`,
      `2) Move ${proposal.fieldLabel} to ${proposal.newValue}% — sample-order effects are in the simulation if you ask me to run it.`,
      'My recommendation: ' +
        (raising
          ? 'move carefully, if at all. Per your bypass-proof rule, every point of commission teaches providers to take the relationship off-platform — the Pathao lesson. If revenue must grow, grow Pro subscriptions first; they cannot be bypassed.'
          : 'lowering a rate buys goodwill cheaply when volume is real — but pair it with a Pro push so the floor grows too.'),
      'Risks: providers feel commission changes immediately and personally; surprise is the enemy (your trust-is-the-moat rule). New orders only, announced in advance.',
    ].join('\n');
  }

  // — Growth questions —
  if (/(grow|growth|revenue|income|earn|বৃদ্ধি|আয়|बढ़|आय|कमाई)/.test(text)) {
    return [
      `${head} — growing revenue without hurting temples`,
      `Where we stand: Standard ${fmtMoney(terms.plans.standard.priceMonthlyINR, 'INR')}·${fmtMoney(terms.plans.standard.priceMonthlyBDT, 'BDT')}/mo · Premium ${fmtMoney(terms.plans.premium.priceMonthlyINR, 'INR')}·${fmtMoney(terms.plans.premium.priceMonthlyBDT, 'BDT')}/mo · Pro ${fmtMoney(terms.plans.purohit_pro.priceMonthlyINR, 'INR')}·${fmtMoney(terms.plans.purohit_pro.priceMonthlyBDT, 'BDT')}/mo · commission ${c.freeRate}/${c.proRail1Rate}/${c.proRail2Rate}%.`,
      'Options:',
      '1) Grow the floor: more Pro subscriptions — bypass-proof, predictable, and it makes providers stakeholders.',
      '2) Deepen Premium value for organisations (reports, history, multi-admin) before touching its price.',
      '3) Commission last — it is upside, and raising it trains bypass.',
      'My recommendation: option 1, then 2. Per your bypass-proof rule, subscriptions are the income you keep; commission is the income you borrow.',
      'Risks: none structural — the risk is impatience. The floor compounds slowly and then all at once.',
    ].join('\n');
  }

  // — Commission "too high / too low" without a number —
  if (/commission|rate/.test(text)) {
    return [
      `${head} — are our rates right?`,
      `Where we stand: community ${c.freeRate}% · Pro Rail-1 ${c.proRail1Rate}% · Pro Rail-2 ${c.proRail2Rate}% — your law baseline is 15 / 8 / 12.`,
      'My recommendation: judge the rates against bypass, not against other platforms\' greed. If providers complete repeat bookings inside the app, the rates are right. If relationships leave after the first booking, the rates are too high — whatever the spreadsheet says.',
      'Ask me "simulate community rate at 12%" and I will show the per-order maths before you decide.',
    ].join('\n');
  }

  // — Honest scope —
  return [
    `${head}`,
    'I can counsel on pricing, commission and platform growth — grounded in your brief and the live terms.',
    'Try: "Should I raise Pro to ৳320?" · "Is our commission too high?" · "How do I grow revenue without hurting temples?"',
    'For numbers first, ask "What are our terms?" — I never advise blind.',
  ].join('\n');
}

function fmtValForAdvice(proposal: TermsProposal): string {
  if (proposal.field.startsWith('price')) {
    return fmtMoney(proposal.oldValue, proposal.field.slice(-3) as Cur);
  }
  return `${proposal.oldValue}`;
}
