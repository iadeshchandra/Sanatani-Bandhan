/**
 * ai/__tests__/contentLint.test.ts — QUEUED #32 (H5).
 * =====================================================================
 * Content-level tripwire: everything a non-owner can ever be SHOWN —
 * every template rendered with neutral params, the dharma corpus, the
 * navigation corpus, and every module guide except the owner-gated
 * 'godmode' one — is scanned against the never-surface list. If a
 * future edit writes internal vocabulary into devotee copy, this fails
 * in CI instead of leaking in production.
 *
 * Structural id fields (guide id, relatedModules) are identifiers, not
 * copy, and are excluded — the scan covers the human-readable text.
 */
import { MODULE_GUIDES } from '../../lib/moduleGuides';
import { DHARMA_CORPUS } from '../corpus';
import { NAVIGATION_CORPUS } from '../corpus/navigation';
import { renderTemplate, templateInventory } from '../templates';
import { allowedGuides } from '../rbac';
import { scanSurface } from '../surfaceGuard';
import type { Role } from '../types';

const NEUTRAL_PARAMS: Record<string, unknown> = {
  text: 'x',
  headline: 'x',
  note: 'x',
  area: 'x',
  dayName: 'Monday',
  name: 'x',
  destination: 'x',
  guideName: 'x',
  title: 'x',
  items: [],
  count: 1,
};

describe('H5 — devotee-surface content lint', () => {
  it('every rendered template is token-free (neutral params, EN/HI/BN)', () => {
    const offenders: string[] = [];
    for (const { key } of templateInventory()) {
      // Copilot templates pass executor text through verbatim — that
      // text is owner-only by construction (gate + executor), so the
      // lint covers the devotee-reachable keys only.
      if (key.startsWith('admin_')) continue;
      for (const lang of ['en', 'hi', 'bn'] as const) {
        let rendered = '';
        try {
          rendered = renderTemplate(key, lang, NEUTRAL_PARAMS as never, 'default');
        } catch {
          continue; // a template needing bespoke params is exercised by its own suite
        }
        const hits = scanSurface(rendered);
        if (hits.length) offenders.push(`${key}/${lang}: ${hits.join(',')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the dharma corpus carries no internal vocabulary', () => {
    expect(scanSurface(JSON.stringify(DHARMA_CORPUS))).toEqual([]);
  });

  it('the navigation corpus carries no internal vocabulary', () => {
    expect(scanSurface(JSON.stringify(NAVIGATION_CORPUS))).toEqual([]);
  });

  it('module guides (except the owner-gated godmode guide) are token-free', () => {
    for (const g of MODULE_GUIDES) {
      if (g.id === 'godmode') continue;
      const copy = JSON.stringify({
        name: g.name,
        tagline: g.tagline,
        whatItIs: g.whatItIs,
        whyItMatters: g.whyItMatters,
        firstSteps: g.firstSteps,
        proTips: g.proTips,
      });
      expect({ id: g.id, hits: scanSurface(copy) }).toEqual({ id: g.id, hits: [] });
    }
  });

  it("the 'godmode' guide exists but is in NO non-owner role's guide list", () => {
    expect(MODULE_GUIDES.some((g) => g.id === 'godmode')).toBe(true);
    const nonOwners: Role[] = ['devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish'];
    for (const role of nonOwners) {
      expect(allowedGuides(role)).not.toContain('godmode');
    }
    expect(allowedGuides('owner')).toContain('godmode');
  });
});
