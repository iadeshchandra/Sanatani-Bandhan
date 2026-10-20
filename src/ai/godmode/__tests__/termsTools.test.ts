/**
 * ai/godmode/__tests__/termsTools.test.ts — QUEUED #32.
 * Pure tools: terms formatting, history diffs, change parsing,
 * simulation maths, proposal validation, advice composition.
 * Fixture values 17.5% / ৳777 are deliberate: the isolation pack asserts
 * they never reach a devotee.
 */
import {
  buildCandidateTerms,
  buildProposal,
  composeAdvice,
  diffTermsHistoryEntry,
  formatSimulation,
  formatTermsHistory,
  formatTermsSummary,
  parseTermsChange,
  simulateTermsChange,
  type TermsHistoryEntryLike,
} from '../termsTools';
import { DEFAULT_TERMS, type PlatformTerms } from '../../../lib/termsConfig';

function terms(mutate?: (t: PlatformTerms) => void): PlatformTerms {
  const t: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
  t.loadedAt = 1760000000000;
  if (mutate) mutate(t);
  return t;
}

describe('formatTermsSummary', () => {
  it('renders every plan in all three currencies with limits and commission', () => {
    const s = formatTermsSummary(terms(), 'en');
    expect(s).toMatch(/Seva/);
    expect(s).toMatch(/Standard/);
    expect(s).toMatch(/Premium/);
    expect(s).toMatch(/₹499/);
    expect(s).toMatch(/৳700/);
    expect(s).toMatch(/\$6/);
    expect(s).toMatch(/₹1,999/);
    expect(s).toMatch(/৳2,800/);
    expect(s).toMatch(/community 15%/);
    expect(s).toMatch(/Rail-1 8%/);
    expect(s).toMatch(/Rail-2 12%/);
    expect(s).toMatch(/gig cap 3/);
  });

  it('never rounds the $2.50 Pro price away', () => {
    expect(formatTermsSummary(terms(), 'en')).toMatch(/\$2\.50/);
  });

  it('is honest when the config could not be read (defaults, labelled)', () => {
    const t = terms();
    t.loadedAt = null;
    const s = formatTermsSummary(t, 'en');
    expect(s).toMatch(/locked code defaults/);
  });
});

describe('history diffing', () => {
  const planEntry: TermsHistoryEntryLike = {
    id: 'h1',
    action: 'terms.plans.save',
    at: '2026-10-19T10:30:00.000Z',
    actorEmail: 'owner@example.com',
    kind: 'plan',
    planId: 'standard',
    before: { ...DEFAULT_TERMS.plans.standard, priceMonthlyBDT: 700 },
    after: { ...DEFAULT_TERMS.plans.standard, priceMonthlyBDT: 750 },
    warnings: [],
  };

  it('renders a field-level old → new line for a price change', () => {
    const lines = diffTermsHistoryEntry(planEntry);
    expect(lines.join('\n')).toMatch(/Monthly BDT: ৳700 → ৳750/);
  });

  it('renders null-before as a first recorded state', () => {
    expect(diffTermsHistoryEntry({ ...planEntry, before: null })).toEqual([
      'First recorded state — no earlier values were captured.',
    ]);
  });

  it('renders commission diffs', () => {
    const lines = diffTermsHistoryEntry({
      id: 'h2',
      action: 'marketplace.commission.config',
      at: '2026-10-18T09:00:00.000Z',
      actorEmail: 'owner@example.com',
      kind: 'commission',
      planId: null,
      before: { freeRate: 15, proRail1Rate: 8, proRail2Rate: 12, freeGigLimit: 3 },
      after: { freeRate: 15, proRail1Rate: 8, proRail2Rate: 10, freeGigLimit: 3 },
    });
    expect(lines).toEqual(['Pro Rail-2 rate: 12% → 10%']);
  });

  it('formatTermsHistory caps the list and points at the full history', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...planEntry, id: `h${i}` }));
    const s = formatTermsHistory(many, 'en', 8);
    expect(s).toMatch(/latest 8/);
    expect(s).toMatch(/4 more/);
  });

  it('says so honestly when there is no history', () => {
    expect(formatTermsHistory([], 'en')).toMatch(/No terms changes recorded yet/);
  });
});

describe('parseTermsChange', () => {
  it('parses a plan BDT monthly change', () => {
    const p = parseTermsChange('What if Standard BDT monthly becomes 750?', terms());
    expect(p).not.toBeNull();
    expect(p?.kind).toBe('plan');
    expect(p?.planId).toBe('standard');
    expect(p?.field).toBe('priceMonthlyBDT');
    expect(p?.oldValue).toBe(700);
    expect(p?.newValue).toBe(750);
  });

  it('parses rail rates, the community rate and the gig cap', () => {
    expect(parseTermsChange('Set Rail-1 to 7%', terms())?.field).toBe('proRail1Rate');
    expect(parseTermsChange('What if Rail-2 goes to 10%?', terms())?.newValue).toBe(10);
    expect(parseTermsChange('community commission to 12%', terms())?.field).toBe('freeRate');
    expect(parseTermsChange('raise the free gig limit to 5', terms())?.field).toBe('freeGigLimit');
  });

  it('parses annual USD and limit changes', () => {
    const a = parseTermsChange('Premium yearly USD to 260', terms());
    expect(a?.field).toBe('priceYearlyUSD');
    expect(a?.oldValue).toBe(240);
    const l = parseTermsChange('Standard devotee limit to 2000', terms());
    expect(l?.field).toBe('maxDevotees');
    expect(l?.limitsPatch).toEqual({ maxDevotees: 2000 });
    const u = parseTermsChange('Premium branches unlimited', terms());
    expect(u?.newValue).toBe(-1);
  });

  it('returns null — never guesses — for unpinnable input', () => {
    expect(parseTermsChange('make it cheaper somehow', terms())).toBeNull();
    expect(parseTermsChange('change the price', terms())).toBeNull();
    expect(parseTermsChange('', terms())).toBeNull();
  });
});

describe('buildProposal + validation', () => {
  it('validates a clean proposal', () => {
    const v = buildProposal('Change Standard BDT monthly to 750', terms());
    expect(v?.errors).toEqual([]);
    expect(v?.proposal.newValue).toBe(750);
  });

  it('blocks an out-of-range commission via the #31 validators', () => {
    const v = buildProposal('Set Rail-1 to 160%', terms());
    expect(v).not.toBeNull();
    expect((v?.errors.length ?? 0)).toBeGreaterThan(0);
  });

  it('carries validator warnings without blocking the draft', () => {
    const v = buildProposal('Set Rail-1 to 60%', terms());
    expect(v?.errors).toEqual([]);
    expect((v?.warnings.length ?? 0)).toBeGreaterThan(0); // Pro above community rate
  });
});

describe('simulateTermsChange', () => {
  it('does the sample-order maths for a commission change', () => {
    const proposal = parseTermsChange('Rail-2 to 10%', terms());
    expect(proposal).not.toBeNull();
    const sim = simulateTermsChange(terms(), proposal!);
    const body = sim.lines.join('\n');
    // ₹2,000 at 12% → keeps 240, provider 1,760; at 10% → 200 / 1,800.
    expect(body).toMatch(/₹2,000 order — platform keeps ₹240 → ₹200/);
    expect(body).toMatch(/provider receives ₹1,760 → ₹1,800/);
    expect(body).toMatch(/NEW orders only/);
  });

  it('checks the annual law after a monthly price change', () => {
    const proposal = parseTermsChange('Standard monthly INR to 599', terms());
    const sim = simulateTermsChange(terms(), proposal!);
    expect(sim.lines.join('\n')).toMatch(/Annual law check/);
    // 4,999 / 599 ≈ 8.3× — outside the 9–12 band → brief warning fires.
    expect(sim.warnings.some((w) => w.kind === 'annual_ratio')).toBe(true);
  });

  it('warns through the brief rubric when a proposal enters the bypass band', () => {
    const proposal = parseTermsChange('community commission to 25%', terms());
    const sim = simulateTermsChange(terms(), proposal!);
    expect(sim.warnings.some((w) => w.kind === 'bypass_risk')).toBe(true);
  });

  it('buildCandidateTerms applies only the proposed field', () => {
    const proposal = parseTermsChange('Standard BDT monthly to 750', terms());
    const cand = buildCandidateTerms(terms(), proposal!);
    expect(cand.plans.standard.priceMonthlyBDT).toBe(750);
    expect(cand.plans.standard.priceMonthlyINR).toBe(499);
    expect(cand.commission.freeRate).toBe(15);
  });

  it('formatSimulation ends with the simulation-only footer', () => {
    const proposal = parseTermsChange('Rail-2 to 10%', terms());
    const s = formatSimulation(simulateTermsChange(terms(), proposal!), 'en');
    expect(s).toMatch(/Simulation only — nothing has changed/);
  });
});

describe('composeAdvice', () => {
  it('answers a growth question with the subscription-floor strategy', () => {
    const s = composeAdvice('How do I grow revenue without hurting temples?', terms(), { recentChangeCount: 0 }, 'en');
    expect(s).toMatch(/My counsel/);
    expect(s).toMatch(/bypass-proof/);
    expect(s).toMatch(/Pro/);
  });

  it('counsels on a concrete price question with options + recommendation', () => {
    const s = composeAdvice('Should I raise Pro BDT to 320?', terms(), { recentChangeCount: 1 }, 'en');
    expect(s).toMatch(/Options:/);
    expect(s).toMatch(/My recommendation:/);
    expect(s).toMatch(/320/);
  });

  it('leads with the bypass heuristic on a commission raise', () => {
    const s = composeAdvice('Should the community commission be 20%?', terms(), { recentChangeCount: 0 }, 'en');
    expect(s).toMatch(/bypass/i);
  });

  it('is honest about scope for unrelated asks', () => {
    const s = composeAdvice('What is the meaning of life?', terms(), { recentChangeCount: 0 }, 'en');
    expect(s).toMatch(/I can counsel on pricing, commission and platform growth/);
  });
});
