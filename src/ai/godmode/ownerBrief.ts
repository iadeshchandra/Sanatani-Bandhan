/**
 * ai/godmode/ownerBrief.ts — the Owner Brief (QUEUED #32).
 * =====================================================================
 * The Copilot is the owner's PERSONAL AI — this module is its mind: one
 * curated, versioned home for how the owner thinks. It powers three
 * things:
 *   1. Strategic advice (admin_advise) — answers cite these heuristics.
 *   2. The simulation warning rubric (admin_simulate) — a proposed terms
 *      change is checked against the owner's own standing laws.
 *   3. Drift detection (admin_terms) — live config is compared with the
 *      LAW BASELINE so the Copilot can ask "you moved this — intended?"
 *
 * Laws for this module:
 *  · The brief NEVER supplies live numbers. Live values always come from
 *    lib/termsConfig (the owner's editable config). The baseline below
 *    is generated from termsConfig's own defaults — the same single
 *    source #31 established — so it cannot drift from the code.
 *  · When a proposal conflicts with a standing law, the Copilot says so
 *    FIRST (heuristic 5: honest disagreement) — then still helps. It
 *    advises; it never decides, and it never writes.
 */

import {
  DEFAULT_TERMS,
  tierForPlan,
  type PlatformTerms,
  type TermsPlanId,
} from '../../lib/termsConfig';
import { PLAN_PRICING } from '../../config/planPricing';

/* ------------------------------------------------------------------ */
/* The brief itself                                                    */
/* ------------------------------------------------------------------ */

export const OWNER_VISION =
  'Sanatani Bandhan is the all-in-one Sanatani life companion — built to dominate its market. ' +
  'Solo is home, organisations are destinations, Suchana is the guide. What we sell is dignity: ' +
  'a small temple must feel like Tirupati.';

export const STANDING_LAWS: string[] = [
  'Strict $0 infrastructure — no Blaze, no paid backend; never propose one.',
  'Firebase is the only production surface.',
  'Premium-first AND floor-proof: flagship polish, but everything must work at 360px, Android 8+, 2GB RAM.',
  'Sanatani vocabulary always: Dakshina (not escrow), Suchana (not notifications), Kritagyata (not ratings), Ashirvad (not likes).',
  'Institution-neutral copy across mandir, goshala, ashram, gurukul, sangha.',
  'Coordination never custody: the two wallets (Platform / Personal) never mix; money moves on user rails.',
  'Location only at the SOS moment, only with consent, never stored.',
  'Terms changes apply to NEW business only — existing subscriptions and orders keep their snapshots.',
];

export interface OwnerHeuristic {
  id: string;
  name: string;
  rule: string;
}

export const OWNER_HEURISTICS: OwnerHeuristic[] = [
  {
    id: 'bypass-proof-revenue',
    name: 'Bypass-proof revenue first',
    rule:
      'Subscription income (above all the ৳280 Pro) is the revenue floor; commission is upside. ' +
      'The Pathao lesson: a platform that lives on commission teaches its providers to bypass it. ' +
      'Any change that pushes providers off-platform is a revenue RISK, not a gain.',
  },
  {
    id: 'never-discount-the-sacred',
    name: 'Never discount the sacred',
    rule:
      'Religious services are never discounted. Price moves are framed as dignity and ' +
      'sustainability, never as sales or offers.',
  },
  {
    id: 'trust-is-the-moat',
    name: 'Trust is the moat',
    rule:
      'Changes that surprise users (silent price moves on existing subscriptions, rewritten ' +
      'history) destroy the one asset competitors cannot copy. New terms, new business only.',
  },
  {
    id: 'floor-before-flagship',
    name: 'Floor-proof before flagship',
    rule:
      'Advice touching flows or UX must keep the 2GB / Android-8 devotee in the room. ' +
      'A feature the floor cannot run is not a feature.',
  },
  {
    id: 'honest-disagreement',
    name: 'Honest disagreement',
    rule:
      'When the owner\'s ask conflicts with his own standing law, the Copilot names the ' +
      'conflict first — plainly, without softening — and only then helps him proceed ' +
      'with open eyes. Agreement is cheap; counsel is the job.',
  },
];

/* ------------------------------------------------------------------ */
/* Law baseline + drift                                                */
/* ------------------------------------------------------------------ */

/** The pricing-law baseline: the locked FINAL defaults (2026-10-14),
 *  generated from termsConfig so there is exactly one source. */
export function lawBaselineTerms(): PlatformTerms {
  return {
    plans: JSON.parse(JSON.stringify(DEFAULT_TERMS.plans)) as PlatformTerms['plans'],
    commission: { ...DEFAULT_TERMS.commission },
    loadedAt: null,
  };
}

export interface BriefWarning {
  kind:
    | 'drift'
    | 'annual_ratio'
    | 'tier_inversion'
    | 'free_paid_tier'
    | 'pro_inversion'
    | 'bypass_risk';
  message: string;
}

/** Plan display labels — derived from the single source (planPricing
 *  `name` fields via the canonical tier for each terms plan id), so the
 *  2026-10-23 display rename ("Lite" / "Enterprise") flows into Copilot
 *  warnings automatically. Never hard-code tier names here. */
const PLAN_LABEL: Record<TermsPlanId, string> = {
  seva: PLAN_PRICING[tierForPlan('seva')].name,
  standard: PLAN_PRICING[tierForPlan('standard')].name,
  premium: PLAN_PRICING[tierForPlan('premium')].name,
  purohit_pro: PLAN_PRICING[tierForPlan('purohit_pro')].name,
};

const CUR_SYM = { INR: '₹', BDT: '৳', USD: '$' } as const;

/** Commission above this band starts teaching providers to bypass. */
export const BYPASS_RISK_FREE_RATE = 20;
export const BYPASS_RISK_PRO_RATE = 18;

/**
 * The warning rubric: check a (possibly proposed) terms snapshot against
 * the owner's brief. Pure — same input, same warnings, always.
 */
export function checkAgainstBrief(terms: PlatformTerms): BriefWarning[] {
  const out: BriefWarning[] = [];
  const base = lawBaselineTerms();

  // Drift vs the law baseline (only meaningful when the snapshot was
  // actually loaded from config — defaults compared to themselves are silent).
  if (terms.loadedAt !== null && terms.loadedAt !== undefined) {
    for (const id of Object.keys(base.plans) as TermsPlanId[]) {
      const live = terms.plans[id];
      const law = base.plans[id];
      const fields: Array<['priceMonthlyINR' | 'priceYearlyINR' | 'priceMonthlyBDT' | 'priceMonthlyUSD', 'INR' | 'BDT' | 'USD']> = [
        ['priceMonthlyINR', 'INR'],
        ['priceMonthlyBDT', 'BDT'],
        ['priceMonthlyUSD', 'USD'],
      ];
      for (const [field, cur] of fields) {
        if (live[field] !== law[field]) {
          out.push({
            kind: 'drift',
            message: `${PLAN_LABEL[id]} ${cur} monthly is ${CUR_SYM[cur]}${live[field]} — your law baseline is ${CUR_SYM[cur]}${law[field]}. Intentional?`,
          });
        }
      }
    }
    const c = terms.commission;
    const bc = base.commission;
    if (c.freeRate !== bc.freeRate || c.proRail1Rate !== bc.proRail1Rate || c.proRail2Rate !== bc.proRail2Rate) {
      out.push({
        kind: 'drift',
        message: `Commission differs from your law baseline (community ${bc.freeRate}% · Rail-1 ${bc.proRail1Rate}% · Rail-2 ${bc.proRail2Rate}%). Intentional?`,
      });
    }
  }

  // Annual ratio — the "2 months free" law means annual ≈ 10 × monthly.
  for (const id of Object.keys(terms.plans) as TermsPlanId[]) {
    const p = terms.plans[id];
    for (const cur of ['INR', 'BDT', 'USD'] as const) {
      const m = p[`priceMonthly${cur}`];
      const y = p[`priceYearly${cur}`];
      // 12× monthly = zero months free — already a breach of the law.
      if (m > 0 && (y >= 12 * m || y < 9 * m)) {
        out.push({
          kind: 'annual_ratio',
          message: `${PLAN_LABEL[id]} annual ${cur} (${CUR_SYM[cur]}${y}) breaks the "2 months free" law against monthly ${CUR_SYM[cur]}${m} — annual should be about ${CUR_SYM[cur]}${10 * m}.`,
        });
      }
    }
  }

  // Tier inversion.
  if (terms.plans.premium.priceMonthlyINR < terms.plans.standard.priceMonthlyINR) {
    out.push({
      kind: 'tier_inversion',
      message: `${PLAN_LABEL.premium} (₹${terms.plans.premium.priceMonthlyINR}/mo) is cheaper than ${PLAN_LABEL.standard} (₹${terms.plans.standard.priceMonthlyINR}/mo) — the tier order is inverted.`,
    });
  }

  // A paid plan priced at zero.
  for (const id of ['standard', 'premium', 'purohit_pro'] as TermsPlanId[]) {
    const p = terms.plans[id];
    if (p.priceMonthlyINR === 0 && p.priceMonthlyBDT === 0 && p.priceMonthlyUSD === 0) {
      out.push({
        kind: 'free_paid_tier',
        message: `${PLAN_LABEL[id]} is a PAID plan but its monthly price is 0 in every currency — it would be free.`,
      });
    }
  }

  // Pro must never cost providers MORE than community.
  const c = terms.commission;
  if (c.proRail1Rate > c.freeRate || c.proRail2Rate > c.freeRate) {
    out.push({
      kind: 'pro_inversion',
      message: `Pro rail rates (Rail-1 ${c.proRail1Rate}% · Rail-2 ${c.proRail2Rate}%) exceed the community rate (${c.freeRate}%) — Pro would punish the providers who pay us.`,
    });
  }

  // Bypass-risk band (heuristic 1).
  if (c.freeRate > BYPASS_RISK_FREE_RATE || c.proRail1Rate > BYPASS_RISK_PRO_RATE || c.proRail2Rate > BYPASS_RISK_PRO_RATE) {
    out.push({
      kind: 'bypass_risk',
      message:
        `Commission is in the bypass-risk band (community ${c.freeRate}% · Rail-1 ${c.proRail1Rate}% · Rail-2 ${c.proRail2Rate}%). ` +
        `Per your bypass-proof rule: past ~${BYPASS_RISK_FREE_RATE}%, providers learn to take the relationship off-platform — the Pathao lesson. The subscription floor matters more than this upside.`,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Prompt / panel rendering                                            */
/* ------------------------------------------------------------------ */

/** Compact DATA-block rendering of the brief — facts only, for the
 *  optional voice-warming of advice answers and the panel expander. */
export function briefForPrompt(): string {
  const b = lawBaselineTerms();
  const lines = [
    `Vision: ${OWNER_VISION}`,
    'Standing laws:',
    ...STANDING_LAWS.map((l) => `· ${l}`),
    'Owner heuristics:',
    ...OWNER_HEURISTICS.map((h) => `· ${h.name}: ${h.rule}`),
    `Pricing-law baseline: ${PLAN_LABEL.seva} free · ${PLAN_LABEL.standard} ₹${b.plans.standard.priceMonthlyINR}·৳${b.plans.standard.priceMonthlyBDT}·$${b.plans.standard.priceMonthlyUSD}/mo · ` +
      `${PLAN_LABEL.premium} ₹${b.plans.premium.priceMonthlyINR}·৳${b.plans.premium.priceMonthlyBDT}·$${b.plans.premium.priceMonthlyUSD}/mo · ` +
      `${PLAN_LABEL.purohit_pro} ₹${b.plans.purohit_pro.priceMonthlyINR}·৳${b.plans.purohit_pro.priceMonthlyBDT}·$${b.plans.purohit_pro.priceMonthlyUSD}/mo · ` +
      `annual = 2 months free · commission community ${b.commission.freeRate}% / Rail-1 ${b.commission.proRail1Rate}% / Rail-2 ${b.commission.proRail2Rate}%.`,
  ];
  return lines.join('\n');
}

/** Short lines for the panel's "My brief" expander. */
export function briefSummaryLines(): string[] {
  return [
    `🎯 ${OWNER_VISION}`,
    ...OWNER_HEURISTICS.map((h) => `· ${h.name} — ${h.rule}`),
  ];
}
