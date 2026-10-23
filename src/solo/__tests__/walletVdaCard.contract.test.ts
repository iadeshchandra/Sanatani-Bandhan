/**
 * solo/__tests__/walletVdaCard.contract.test.ts — U8b layout contract.
 * =============================================================
 * Owner screenshot (2026-10-23): on the Spoken ID card, the unclaimed
 * gloss was crushed into a ~115px sliver beside a Claim button whose
 * own bilingual gloss ("নিন → (Claim →)") made it wide enough to sit
 * under the floating SOS button. The repair, pinned here:
 *  - the gloss sits on its own full-width row and wraps safely
 *    (break-words) — it can never run off the card or clip mid-word;
 *  - the Claim button lives below the gloss, labelled in the
 *    devotee's language ONLY (tr(), never the double-gloss <T>), so
 *    it stays compact and clear of the SOS corner;
 *  - the button keeps a ≥44px touch target.
 * Source pins, the repo's established pattern for UI contracts
 * (the component's provider chain is not node-env loadable).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '../WalletVdaCard.tsx'), 'utf-8');

describe('U8b: Spoken ID card — gloss wraps, Claim is reachable', () => {
  it('the Claim label renders in one language via tr(), not the double-gloss T', () => {
    expect(SRC).toContain("tr('Claim →'");
    expect(SRC).not.toContain('<T en="Claim →"');
  });

  it('the unclaimed gloss wraps inside the card (break-words)', () => {
    const glossAt = SRC.indexOf('Claim a name@scope');
    expect(glossAt).toBeGreaterThan(-1);
    const glossTag = SRC.slice(Math.max(0, glossAt - 300), glossAt);
    expect(glossTag).toContain('break-words');
  });

  it('the Claim button is stacked below the gloss, not squeezed beside it', () => {
    const glossAt = SRC.indexOf('Claim a name@scope');
    const buttonAt = SRC.indexOf("tr('Claim →'");
    expect(buttonAt).toBeGreaterThan(glossAt);
  });

  it('the Claim button keeps a ≥44px touch target', () => {
    const buttonAt = SRC.indexOf("tr('Claim →'");
    const buttonTag = SRC.slice(Math.max(0, buttonAt - 400), buttonAt);
    expect(buttonTag).toContain('min-h-[44px]');
  });
});
