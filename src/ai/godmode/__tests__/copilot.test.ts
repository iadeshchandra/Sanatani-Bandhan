/**
 * ai/godmode/__tests__/copilot.test.ts — GodMode Copilot.
 * =====================================================================
 * Pure-function tests: routing, RBAC, formatting, heuristics, safety.
 * No Firestore, no network, no browser.
 */
import {
  COPILOT_INTENTS,
  isCopilotIntent,
  canUseCopilot,
  routeCopilotIntent,
  formatBriefing,
  detectAnomalies,
  formatAnomalySummary,
  recommendModeration,
  buildAnnouncementDraft,
  copilotDenied,
  formatStats,
} from '../copilot';
import { canOffer } from '../../rbac';
import type { Role } from '../../types';

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

describe('routeCopilotIntent', () => {
  it('routes briefing questions', () => {
    expect(routeCopilotIntent('What needs my attention?')).toBe('admin_briefing');
    expect(routeCopilotIntent('Give me the morning briefing')).toBe('admin_briefing');
  });
  it('routes stats questions', () => {
    expect(routeCopilotIntent('How many bookings this week?')).toBe('admin_stats');
    expect(routeCopilotIntent("Show me this week's numbers")).toBe('admin_stats');
  });
  it('routes moderation questions', () => {
    expect(routeCopilotIntent('Review flagged posts')).toBe('admin_moderation_help');
  });
  it('routes anomaly questions', () => {
    expect(routeCopilotIntent('Anything unusual?')).toBe('admin_anomaly');
    expect(routeCopilotIntent('Is something wrong with signups?')).toBe('admin_anomaly');
  });
  it('routes draft questions', () => {
    expect(routeCopilotIntent('Write an announcement about Diwali')).toBe('admin_draft');
  });
  it('returns null for non-copilot questions', () => {
    expect(routeCopilotIntent("What is today's tithi?")).toBeNull();
    expect(routeCopilotIntent('How do I give dana?')).toBeNull();
    expect(routeCopilotIntent('')).toBeNull();
  });
  it('briefing wins over stats on overlap (priority order)', () => {
    // "attention" is briefing-specific; stats keywords shouldn't steal it.
    expect(routeCopilotIntent('What needs my attention this week?')).toBe('admin_briefing');
  });

  /* QUEUED #32 — the five terms-era intents */
  it('routes terms questions (platform-anchored)', () => {
    expect(routeCopilotIntent('What are our terms?')).toBe('admin_terms');
    expect(routeCopilotIntent('What is the Standard price in taka?')).toBe('admin_terms');
    expect(routeCopilotIntent('What is our commission rate?')).toBe('admin_terms');
  });
  it('routes history questions', () => {
    expect(routeCopilotIntent('What changed in the plans last week?')).toBe('admin_history');
    expect(routeCopilotIntent('Who changed the commission?')).toBe('admin_history');
    expect(routeCopilotIntent('What changed in our terms?')).toBe('admin_history');
  });
  it('routes simulations (hypotheticals)', () => {
    expect(routeCopilotIntent('What if Standard BDT monthly becomes 750?')).toBe('admin_simulate');
    expect(routeCopilotIntent('Simulate Rail-2 at 10%')).toBe('admin_simulate');
    expect(routeCopilotIntent('What if I change Standard to 750?')).toBe('admin_simulate');
  });
  it('routes drafts (imperatives)', () => {
    expect(routeCopilotIntent('Change Standard BDT monthly to 750')).toBe('admin_draft_change');
    expect(routeCopilotIntent('Set Rail-1 to 7%')).toBe('admin_draft_change');
    expect(routeCopilotIntent('Draft the change: Premium USD yearly to 260')).toBe('admin_draft_change');
  });
  it('routes advice (consultative)', () => {
    expect(routeCopilotIntent('Should I raise Pro to ৳320?')).toBe('admin_advise');
    expect(routeCopilotIntent('Is our commission too high?')).toBe('admin_advise');
    expect(routeCopilotIntent('Advise me')).toBe('admin_advise');
    expect(routeCopilotIntent('How do I grow revenue?')).toBe('admin_advise');
  });
  it('never routes ordinary devotee questions into admin intents', () => {
    expect(routeCopilotIntent('What is the price of this seva?')).toBeNull();
    expect(routeCopilotIntent('How do I change the language?')).toBeNull();
    expect(routeCopilotIntent('What is dakshina?')).toBeNull();
    expect(routeCopilotIntent('How do I book a purohit?')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* RBAC — ironclad                                                     */
/* ------------------------------------------------------------------ */

describe('copilot RBAC', () => {
  it('exposes exactly eleven copilot intents', () => {
    expect(COPILOT_INTENTS).toHaveLength(11);
    expect(isCopilotIntent('admin_briefing')).toBe(true);
    expect(isCopilotIntent('admin_draft')).toBe(true);
    expect(isCopilotIntent('greeting')).toBe(false);
    expect(isCopilotIntent('dharma_question')).toBe(false);
  });

  it('canUseCopilot: only owner', () => {
    expect(canUseCopilot('owner')).toBe(true);
    const others: Role[] = ['devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish'];
    for (const r of others) expect(canUseCopilot(r)).toBe(false);
  });

  it('canOffer: copilot intents denied to every non-owner role', () => {
    const others: Role[] = ['devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish'];
    for (const intent of COPILOT_INTENTS) {
      for (const role of others) {
        expect(canOffer(intent, role)).toBe(false);
      }
      expect(canOffer(intent, 'owner')).toBe(true);
    }
  });

  it('denial copy is warm and never leaks data', () => {
    const d = copilotDenied('en');
    expect(d).toMatch(/GodMode/i);
    expect(d).not.toMatch(/\d+/); // no numbers, no data
  });
});

/* ------------------------------------------------------------------ */
/* Briefing formatting                                                 */
/* ------------------------------------------------------------------ */

describe('formatBriefing', () => {
  it('celebrates a calm day', () => {
    const b = formatBriefing(
      { pendingVerifications: 0, flaggedPosts: 0, openDisputes: 0, dataAvailable: true },
      'Monday',
      'en'
    );
    expect(b.calm).toBe(true);
    expect(b.headline).toMatch(/Monday/);
    expect(b.lines.join(' ')).toMatch(/calmest/i);
  });

  it('lists counts on a busy day', () => {
    const b = formatBriefing(
      { pendingVerifications: 3, flaggedPosts: 1, openDisputes: 2, dataAvailable: true },
      'Friday',
      'en'
    );
    expect(b.calm).toBe(false);
    const text = b.lines.join('\n');
    expect(text).toMatch(/3 verifications/);
    expect(text).toMatch(/1 flagged/);
    expect(text).toMatch(/2 open disputes/);
  });

  it('is honest when data is unavailable (never invents)', () => {
    const b = formatBriefing(
      { pendingVerifications: 0, flaggedPosts: 0, openDisputes: 0, dataAvailable: false },
      'Monday',
      'en'
    );
    expect(b.lines.join(' ')).toMatch(/won’t guess|will not guess|won't guess/i);
  });

  it('renders Hindi and Bangla', () => {
    const hi = formatBriefing(
      { pendingVerifications: 2, flaggedPosts: 0, openDisputes: 0, dataAvailable: true },
      'सोमवार',
      'hi'
    );
    expect(hi.headline).toMatch(/सुप्रभात/);
    const bn = formatBriefing(
      { pendingVerifications: 2, flaggedPosts: 0, openDisputes: 0, dataAvailable: true },
      'সোমবার',
      'bn'
    );
    expect(bn.headline).toMatch(/সুপ্রভাত/);
  });
});

/* ------------------------------------------------------------------ */
/* Anomaly heuristics                                                  */
/* ------------------------------------------------------------------ */

describe('detectAnomalies', () => {
  const base = {
    reportsLast24h: 2,
    reportsAvg7d: 2,
    signupsLast24h: 8,
    signupsAvg7d: 8,
    cancellationsLast7d: 2,
    cancellationsAvg7d: 2,
    dataAvailable: true,
  };

  it('finds nothing on a normal day', () => {
    expect(detectAnomalies(base)).toHaveLength(0);
  });

  it('flags a report spike ≥3× with volume', () => {
    const f = detectAnomalies({ ...base, reportsLast24h: 15, reportsAvg7d: 3 });
    expect(f.some((x) => x.kind === 'report_spike' && x.severity === 'look')).toBe(true);
  });

  it('watches a moderate report elevation', () => {
    const f = detectAnomalies({ ...base, reportsLast24h: 6, reportsAvg7d: 2.5 });
    expect(f.some((x) => x.kind === 'report_spike' && x.severity === 'watch')).toBe(true);
  });

  it('ignores tiny volumes (no crying wolf)', () => {
    const f = detectAnomalies({ ...base, reportsLast24h: 2, reportsAvg7d: 0.2 });
    expect(f.filter((x) => x.kind === 'report_spike')).toHaveLength(0);
  });

  it('flags cancellation spikes with caring framing', () => {
    const f = detectAnomalies({ ...base, cancellationsLast7d: 9, cancellationsAvg7d: 2 });
    const c = f.find((x) => x.kind === 'cancellation_spike');
    expect(c).toBeDefined();
    expect(c!.detail).toMatch(/check-in/i);
  });

  it('returns empty when data unavailable', () => {
    expect(detectAnomalies({ ...base, dataAvailable: false })).toHaveLength(0);
  });

  it('summary is calm when nothing found', () => {
    expect(formatAnomalySummary([], 'en')).toMatch(/nothing unusual/i);
  });

  it('summary lists findings when present', () => {
    const s = formatAnomalySummary(
      [{ kind: 'report_spike', severity: 'look', detail: 'Reports 3× average.' }],
      'en'
    );
    expect(s).toMatch(/Reports 3× average/);
  });
});

/* ------------------------------------------------------------------ */
/* Moderation recommendations — advise, never act                      */
/* ------------------------------------------------------------------ */

describe('recommendModeration', () => {
  it('recommends remove on ≥5 reports', () => {
    const a = recommendModeration({
      id: 'p1', kind: 'post', preview: 'spam', reportCount: 7,
      reportReasons: ['spam'], authorName: 'X',
    });
    expect(a.recommendation).toBe('remove');
    expect(a.actionLabel).toMatch(/Remove/);
  });

  it('recommends remove on safety concern with 2+ reports', () => {
    const a = recommendModeration({
      id: 'p2', kind: 'post', preview: 'hate', reportCount: 2,
      reportReasons: ['harassment'], authorName: 'X',
    });
    expect(a.recommendation).toBe('remove');
  });

  it('escalates mixed signals (3-4 reports)', () => {
    const a = recommendModeration({
      id: 'p3', kind: 'post', preview: 'maybe', reportCount: 3,
      reportReasons: ['off-topic'], authorName: 'X',
    });
    expect(a.recommendation).toBe('escalate');
  });

  it('reviews single reports gently', () => {
    const a = recommendModeration({
      id: 'p4', kind: 'post', preview: 'fine', reportCount: 1,
      reportReasons: ['disagree'], authorName: 'X',
    });
    expect(a.recommendation).toBe('review');
  });

  it('keeps unreported items', () => {
    const a = recommendModeration({
      id: 'p5', kind: 'post', preview: 'fine', reportCount: 0,
      reportReasons: [], authorName: 'X',
    });
    expect(a.recommendation).toBe('keep');
  });

  it('SAFETY: recommendation is advisory only — no execution fields', () => {
    const a = recommendModeration({
      id: 'p6', kind: 'post', preview: 'x', reportCount: 9,
      reportReasons: ['spam'], authorName: 'X',
    });
    // The advice object must not contain anything executable.
    const keys = Object.keys(a);
    expect(keys).toEqual(expect.arrayContaining(['itemId', 'recommendation', 'reasoning', 'actionLabel']));
    expect(keys).not.toContain('execute');
    expect(keys).not.toContain('delete');
    expect(keys).not.toContain('ban');
  });
});

/* ------------------------------------------------------------------ */
/* Drafts                                                              */
/* ------------------------------------------------------------------ */

describe('buildAnnouncementDraft', () => {
  it('builds a warm English draft with the topic', () => {
    const d = buildAnnouncementDraft('Diwali', 'en');
    expect(d).toMatch(/Diwali/);
    expect(d).toMatch(/🪔/);
    expect(d).toMatch(/Shubham bhavatu/);
  });

  it('falls back to a generic topic when empty', () => {
    const d = buildAnnouncementDraft('', 'en');
    expect(d).toMatch(/coming festival/);
  });

  it('renders Hindi and Bangla drafts', () => {
    expect(buildAnnouncementDraft('दिवाली', 'hi')).toMatch(/शुभं भवतु/);
    expect(buildAnnouncementDraft('দীপাবলি', 'bn')).toMatch(/শুভম্ ভবতু/);
  });
});

/* ------------------------------------------------------------------ */
/* Stats formatting                                                    */
/* ------------------------------------------------------------------ */

describe('formatStats', () => {
  it('renders numbers plainly', () => {
    const s = formatStats(
      { bookingsWeek: 12, activeUsersWeek: 340, newSignupsWeek: 25, templesMapped: 8, dataAvailable: true },
      'en'
    );
    expect(s).toMatch(/12 bookings/);
    expect(s).toMatch(/340 active/);
    expect(s).toMatch(/25 new signups/);
    expect(s).toMatch(/8 temples/);
  });

  it('is honest when unavailable', () => {
    const s = formatStats(
      { bookingsWeek: 0, activeUsersWeek: 0, newSignupsWeek: 0, templesMapped: 0, dataAvailable: false },
      'en'
    );
    expect(s).not.toMatch(/0 bookings/);
    expect(s).toMatch(/available/i);
  });
});
