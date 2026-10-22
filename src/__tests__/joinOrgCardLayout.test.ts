/**
 * joinOrgCardLayout.test.ts — UI/UX audit U1 + U2 pins.
 * =====================================================================
 * On the owner's phone, the Orgs-tab membership cards were nameless
 * ("?" avatar), printed "· since Invalid Date", and clipped the Open
 * button ≈45px off the right edge: the action cluster was a shrink-0
 * single-line row needing ≈370px inside a ≈326px row in bilingual
 * mode (U2), the card rendered page.name with no fallback (U1-name),
 * and memberSince formatted an unconverted Firestore Timestamp
 * (U1-date; the reader fix is pinned in lib/__tests__/timestamps).
 *
 * The layout is a CSS-class contract, so — following this repo's
 * established source-guard pattern — these tests assert the class
 * and code contracts the fix is made of:
 *  - actions live on their OWN full-width wrapping row;
 *  - no shrink-0 container wraps the card actions;
 *  - the name comes from the fallback chain, never raw page.name;
 *  - memberSince refuses non-finite input, and the "since" gloss
 *    renders only when a real date exists.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(root, 'src', 'solo', 'JoinOrgScreen.tsx'), 'utf8');

describe('U2 — the action row can never clip the Open button', () => {
  it('actions render on their own full-width wrapping row', () => {
    expect(src).toContain('flex flex-wrap items-center gap-x-3 gap-y-2');
    expect(src).toContain('{renderAction(page)}');
  });

  it('no shrink-0 container wraps the card actions', () => {
    expect(src).not.toContain('<div className="shrink-0">{renderAction(page)}</div>');
  });

  it('the member and invite action clusters wrap and can shrink', () => {
    expect(src).toContain('flex flex-wrap items-center gap-2 min-w-0');
  });

  it('the identity header spans the full card width', () => {
    expect(src).toContain('flex w-full items-center gap-3 min-w-0 text-left');
  });
});

describe('U1 — name fallback and honest dates on the card', () => {
  it('the card name comes from the fallback chain (page → workspace → neutral)', () => {
    expect(src).toContain('const displayNameFor = (page: OrgPage): string =>');
    expect(src).toContain("'Unnamed Organisation'");
    expect(src).toContain('{displayNameFor(page)}');
  });

  it('memberSince refuses non-finite input instead of printing "Invalid Date"', () => {
    expect(src).toContain('!Number.isFinite(ts)');
    expect(src).toContain('Number.isNaN(d.getTime())');
  });

  it('the "since" gloss renders only when a real date exists', () => {
    expect(src).toContain('const since = memberSince(membership.joinedAt)');
    expect(src).toContain('{since && (');
  });
});
