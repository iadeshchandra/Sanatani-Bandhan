/**
 * aiDiscoverability.test.ts — the lockstep guarantee for the AI-facing facts.
 *
 * public/llms.txt, public/llms-full.txt and public/ai-facts.json are the
 * canonical facts every AI assistant (ChatGPT / Gemini / Perplexity / …)
 * reads about Sanatani Bandhan. They must never drift apart: this test
 * parses all three and asserts they agree on every price figure, the
 * organisation-type list (17), the language list (10) and both contact
 * values. If a price or fact changes in one file, change all three —
 * this test is the guard that makes the drift fail loudly.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..', '..');
const llms = readFileSync(resolve(root, 'public', 'llms.txt'), 'utf8');
const llmsFull = readFileSync(resolve(root, 'public', 'llms-full.txt'), 'utf8');
const facts = JSON.parse(readFileSync(resolve(root, 'public', 'ai-facts.json'), 'utf8'));

/** Numeric tokens of a text with thousand separators removed ("4,999" → 4999). */
function numbersIn(text: string): Set<number> {
  const stripped = text.replace(/,/g, '');
  const out = new Set<number>();
  for (const m of stripped.matchAll(/\d+(?:\.\d+)?/g)) out.add(parseFloat(m[0]));
  return out;
}

function collectPrices(node: unknown, acc: number[]): number[] {
  if (typeof node === 'number') acc.push(node);
  else if (Array.isArray(node)) node.forEach((v) => collectPrices(v, acc));
  else if (node && typeof node === 'object')
    Object.values(node as Record<string, unknown>).forEach((v) => collectPrices(v, acc));
  return acc;
}

describe('AI discoverability facts — one source of truth across llms.txt / llms-full.txt / ai-facts.json', () => {
  it('ai-facts.json declares 17 organisation types and lists exactly 17', () => {
    expect(facts.organisationTypesCount).toBe(17);
    expect(facts.organisationTypes).toHaveLength(17);
  });

  it('every organisation type appears in both prose files', () => {
    for (const orgType of facts.organisationTypes as string[]) {
      expect(llms).toContain(orgType);
      expect(llmsFull).toContain(orgType);
    }
  });

  it('lists exactly 10 languages, each named in both prose files', () => {
    expect(facts.languages).toHaveLength(10);
    for (const lang of facts.languages as { code: string; name: string }[]) {
      expect(llms).toContain(lang.name);
      expect(llmsFull).toContain(lang.name);
    }
  });

  it('every price figure in ai-facts.json appears in both prose files', () => {
    const prices = collectPrices(facts.pricing.tiers, []);
    expect(prices.length).toBeGreaterThanOrEqual(20);
    const llmsNums = numbersIn(llms);
    const fullNums = numbersIn(llmsFull);
    for (const price of prices) {
      expect(llmsNums.has(price)).toBe(true);
      expect(fullNums.has(price)).toBe(true);
    }
  });

  it('marketplace commission figures agree across all three files', () => {
    const c = facts.pricing.marketplaceCommission;
    for (const pct of [c.communityPercent, c.verifiedProviderRail1Percent, c.verifiedProviderRail2Percent]) {
      expect(numbersIn(llms).has(pct)).toBe(true);
      expect(numbersIn(llmsFull).has(pct)).toBe(true);
    }
  });

  it('both contact values appear in all three files', () => {
    const { whatsapp, email } = facts.contact;
    for (const doc of [llms, llmsFull, JSON.stringify(facts)]) {
      expect(doc).toContain(whatsapp);
      expect(doc).toContain(email);
    }
  });

  it('the prose files cross-link the machine-readable facts', () => {
    expect(llms).toContain('ai-facts.json');
    expect(llms).toContain('llms-full.txt');
    expect(llmsFull).toContain('ai-facts.json');
    expect(llms).toContain(facts.url);
    expect(llmsFull).toContain(facts.url);
  });
});
