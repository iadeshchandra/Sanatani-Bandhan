/**
 * ai/godmode/__tests__/marketingBrief.test.ts — QUEUED #37 (+ addendum).
 * =====================================================================
 * Pins the Copilot's growth-expert layer: the heuristics (including
 * the owner's profit-through-value law), the market frame, and the
 * anti-pattern screen — hits refuse, legitimate questions pass.
 */
import {
  ANTI_PATTERNS,
  MARKETING_HEURISTICS,
  MARKET_FRAME,
  marketingBriefForPrompt,
  marketingSummaryLines,
  refusalHeadline,
  screenAntiPattern,
} from '../marketingBrief';

describe('marketing brief: heuristics', () => {
  it('carries the seven growth heuristics, incl. the owner’s ethical law', () => {
    const ids = MARKETING_HEURISTICS.map((h) => h.id);
    expect(ids).toContain('share-is-the-loop');
    expect(ids).toContain('festival-calendar-is-the-campaign-calendar');
    expect(ids).toContain('one-temple-brings-its-devotees');
    expect(ids).toContain('whatsapp-first');
    expect(ids).toContain('retention-is-rhythm');
    expect(ids).toContain('premium-feel-is-the-brand');
    expect(ids).toContain('profit-through-value');
    const law = MARKETING_HEURISTICS.find((h) => h.id === 'profit-through-value');
    expect(law?.rule).toMatch(/never by forcing/i);
    expect(law?.rule).toMatch(/shraddha/);
  });

  it('never contradicts the owner brief: no discounting, no dark patterns', () => {
    const all = MARKETING_HEURISTICS.map((h) => h.rule).join(' ');
    expect(all).not.toMatch(/discount (a|the) puja/i);
    expect(all).toMatch(/Kritagyata/);
  });
});

describe('marketing brief: market frame', () => {
  it('names the real competitive frame — WhatsApp, paper, generic software', () => {
    const names = MARKET_FRAME.rivals.map((r) => r.name);
    expect(names).toContain('WhatsApp groups');
    expect(names).toContain('Paper registers (the bahi-khata)');
    expect(names).toContain('Generic temple / accounting software');
    expect(MARKET_FRAME.moat.join(' ')).toMatch(/Bahi-Khata/);
    expect(MARKET_FRAME.moat.join(' ')).toMatch(/Trust/);
    expect(MARKET_FRAME.positioning).toMatch(/whole life/i);
  });
});

describe('marketing brief: anti-pattern screen', () => {
  it('refuses fake social proof (EN + BN)', () => {
    expect(screenAntiPattern('Should we buy fake reviews?')?.id).toBe('fake-social-proof');
    expect(screenAntiPattern('Buy 10000 fake followers for the page')?.id).toBe('fake-social-proof');
    expect(screenAntiPattern('কিছু ভুয়া রিভিউ কিনব?')?.id).toBe('fake-social-proof');
  });

  it('refuses discounting the sacred (regex + HI)', () => {
    expect(screenAntiPattern('Give 50% off on pujas this week')?.id).toBe('discount-the-sacred');
    expect(screenAntiPattern('Give 50% discount on pujas to boost bookings')?.id).toBe('discount-the-sacred');
    expect(screenAntiPattern('पूजा पर छूट दें तो बुकिंग बढ़ेगी?')?.id).toBe('discount-the-sacred');
  });

  it('refuses spam blasts, dark patterns and bought installs', () => {
    expect(screenAntiPattern('Send a spam blast to everyone')?.id).toBe('spam-broadcasts');
    expect(screenAntiPattern('Use fake urgency and dark patterns to push bookings')?.id).toBe('dark-patterns');
    expect(screenAntiPattern('Let us buy installs to look bigger')?.id).toBe('bought-installs');
  });

  it('every anti-pattern carries a lawful alternative', () => {
    for (const ap of ANTI_PATTERNS) {
      expect(ap.alternative.length).toBeGreaterThan(20);
      expect(ap.why.length).toBeGreaterThan(20);
    }
    expect(ANTI_PATTERNS.map((a) => a.id)).toEqual([
      'fake-social-proof',
      'spam-broadcasts',
      'discount-the-sacred',
      'dark-patterns',
      'bought-installs',
    ]);
  });

  it('legitimate growth questions are NOT screened out', () => {
    expect(screenAntiPattern('Give me a growth plan')).toBeNull();
    expect(screenAntiPattern('How is the referral program doing?')).toBeNull();
    expect(screenAntiPattern('What are our terms?')).toBeNull();
    expect(screenAntiPattern('How do I grow revenue without hurting temples?')).toBeNull();
  });
});

describe('marketing brief: rendering helpers', () => {
  it('prompt block + panel summary carry the mindset and the moat', () => {
    const prompt = marketingBriefForPrompt();
    expect(prompt).toContain('Refused, always:');
    expect(prompt).toContain('Market frame (general knowledge, not our data)');
    const summary = marketingSummaryLines().join('\n');
    expect(summary).toContain('growth with dignity');
    expect(summary).toContain('WhatsApp');
    expect(summary).toContain('Profit through value, never by forcing');
  });

  it('refusal headline exists in all three panel languages', () => {
    expect(refusalHeadline('en').length).toBeGreaterThan(0);
    expect(refusalHeadline('hi').length).toBeGreaterThan(0);
    expect(refusalHeadline('bn').length).toBeGreaterThan(0);
  });
});
