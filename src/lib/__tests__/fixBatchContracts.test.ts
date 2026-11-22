/**
 * fixBatchContracts.test.ts — FIX BATCH F2/F3/F4 source contracts
 * (Full-App Test #2 findings F2, F3, F4).
 * =====================================================================
 * F2: the language sheet family's paper classes are registered in
 *     the Sandhya remap layer, scoped under the .paper-sheet hook
 *     the four sheets carry on their portal roots.
 * F3: the Treasury More menu's dismissal lives on document-level
 *     listeners (Escape + outside pointer-down, ref-scoped) IN
 *     ADDITION TO the D3 backdrop — the fix adds a dismissal path
 *     no ancestor can trap; it does not remove the D3 mount.
 * F4: /whats-new is a defined redirect route to the canonical
 *     /margdarshan/whats-new (query preserved); the rtFix-pinned
 *     publicPaths set is deliberately untouched.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('F2 — Sandhya registration for the paper sheets', () => {
  const css = read('index.css');

  it('registers the sheet paper + sticky-header classes under the .paper-sheet hook', () => {
    expect(css).toContain('[data-sandhya="on"] .paper-sheet .bg-\\[\\#faf7f2\\]');
    expect(css).toContain('[data-sandhya="on"] .paper-sheet .bg-\\[\\#faf7f2\\]\\/95');
  });

  it.each([
    'components/language/LanguagePickerSheet.tsx',
    'components/language/RegionPickerSheet.tsx',
    'components/language/NativeWelcomeSheet.tsx',
    'components/guide/TranslationSuggestionSheet.tsx',
  ])('%s carries the paper-sheet hook on its root', (rel) => {
    expect(read(rel)).toContain('paper-sheet');
  });
});

describe('F3 — Treasury More-menu dismissal', () => {
  const desk = read('components/domain2/TreasuryLedgerDesk.tsx');

  it('registers document-level Escape + pointer-down dismissal while the menu is open', () => {
    expect(desk).toContain("document.addEventListener('keydown'");
    expect(desk).toContain("e.key !== 'Escape'");
    expect(desk).toContain("document.addEventListener('pointerdown'");
    expect(desk).toContain('}, [showMoreActions]);');
  });

  it('scopes dismissal by the menu and trigger refs, attached to the real elements', () => {
    expect(desk).toContain('moreActionsMenuRef.current?.contains(target)');
    expect(desk).toContain('moreActionsBtnRef.current?.contains(target)');
    expect(desk).toContain('ref={moreActionsBtnRef}');
    expect(desk).toContain('ref={moreActionsMenuRef}');
  });

  it('returns focus to the trigger on Escape', () => {
    expect(desk).toContain('moreActionsBtnRef.current?.focus()');
  });

  it('keeps the D3 backdrop dismissal path (the fix adds to D3, never replaces it)', () => {
    expect(desk).toContain('fixed inset-0 z-40 cursor-default bg-transparent');
    expect(desk).toContain('onClick={() => setShowMoreActions(false)}');
  });
});

describe('F4 — the /whats-new alias', () => {
  const app = read('App.tsx');

  it('defines the alias route and its redirect component', () => {
    expect(app).toContain('path="/whats-new"');
    expect(app).toContain('WhatsNewAliasRedirect');
  });

  it('redirects to the canonical page, preserving the query string', () => {
    expect(app).toContain('useLocation');
    expect(app).toContain('`/margdarshan/whats-new${search}`');
  });

  it('leaves the rtFix-pinned publicPaths set untouched', () => {
    expect(read('lib/publicPaths.ts')).not.toContain("'/whats-new'");
  });
});
