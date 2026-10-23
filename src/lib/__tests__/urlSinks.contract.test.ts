/**
 * urlSinks.contract.test.ts — SECURITY P1 (Finding 2) sink contract.
 * =====================================================================
 * Every stored/user-entered URL that reaches an href / window.open sink
 * must pass through lib/safeUrl first. These pins name the sinks found
 * in the 2026-10-23 sweep: if a raw pattern returns, the suite fails
 * here instead of a devotee's (or the owner's) browser paying for it.
 *
 * Audited SAFE by construction (not pinned — no stored scheme reaches
 * the sink): wa.me/tel:/mailto: links built from constants or
 * digit-stripped values; Google Maps URLs built from coordinates or an
 * encoded address on a fixed host; blob: URLs of PDFs the app itself
 * generated; LinkManager's Play URL (strict play.google.com validator
 * at save time); <img> sources (a javascript:/data: scheme in an image
 * context cannot execute script in a modern browser).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

const SINKS: Array<{ file: string; rawPatterns: RegExp[] }> = [
  { file: 'jyotish/JyotishMarketplace.tsx', rawPatterns: [/href=\{c\.sessionLink\}/] },
  { file: 'jyotish/JyotishTabs.tsx', rawPatterns: [/href=\{c\.sessionLink\}/] },
  { file: 'components/domain3/PoojaBookingDesk.tsx', rawPatterns: [/href=\{b\.liveStreamUrl\}/] },
  { file: 'marketplace/CommissionPayScreen.tsx', rawPatterns: [/href=\{method\.link\}/] },
  { file: 'marketplace/Rail2PaymentScreen.tsx', rawPatterns: [/href=\{pm\.paymentLink\}/] },
  { file: 'solo/WalletTab.tsx', rawPatterns: [/href=\{method\.link\}/] },
  {
    file: 'components/common/godmode/AdminTabsH.tsx',
    rawPatterns: [/href=\{m\.details\?\.paymentLink\}/],
  },
  { file: 'components/common/godmode/AdminTabsB.tsx', rawPatterns: [/href=\{c\.proofUrl\}/] },
  { file: 'components/common/godmode/AdminTabsJ.tsx', rawPatterns: [/return <a href=\{v\}/] },
  {
    file: 'pages/OrgPublicPage.tsx',
    rawPatterns: [/page\.website\.startsWith\('http'\)/],
  },
  { file: 'video/VideoGuidanceSheet.tsx', rawPatterns: [/window\.open\(rememberedChannel/] },
  {
    file: 'appgrowth/GetAppPage.tsx',
    rawPatterns: [/href=\{appendPlayReferrer\(playStoreUrl/],
  },
];

describe('SECURITY P1: stored URLs reach sinks only via lib/safeUrl', () => {
  for (const { file, rawPatterns } of SINKS) {
    it(`${file} routes its stored URL through safeUrl`, () => {
      const src = read(file);
      expect(src).toMatch(/from\s+['"][^'"]*lib\/safeUrl['"]/);
      for (const p of rawPatterns) expect(src).not.toMatch(p);
    });
  }
});
