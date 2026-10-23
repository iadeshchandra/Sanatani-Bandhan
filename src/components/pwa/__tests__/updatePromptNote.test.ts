/**
 * updatePromptNote.test.ts — UI/UX audit D-09 pins (wiring half).
 *
 * The critical dialog must SHOW the update's reason, and the build
 * must not be able to ship a reason-less critical flag. The component
 * and the vite config are not jest-loadable in the node env, so these
 * are source contracts over the exact seams the logic tests cover:
 *
 *  - UpdatePrompt derives its hard-block from isEffectivelyCritical
 *    (critical AND note present) and renders criticalBodyText — the
 *    manifest's own note — in the critical branch;
 *  - vite.config.ts only emits critical:true when CRITICAL_UPDATE_NOTE
 *    is also supplied, downgrading + warning otherwise, and writes
 *    the note into version.json.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..', '..', '..');
const prompt = fs.readFileSync(path.join(root, 'src/components/pwa/UpdatePrompt.tsx'), 'utf-8');
const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf-8');

describe('D-09 — the dialog shows the reason', () => {
  it('UpdatePrompt consumes the critical-update law from lib/criticalUpdate', () => {
    expect(prompt).toContain("from '../../lib/criticalUpdate'");
    expect(prompt).toContain('isEffectivelyCritical(manifest)');
    expect(prompt).toContain('criticalBodyText(manifest, t.criticalBody)');
  });

  it('the hard-block no longer keys off the raw critical flag alone', () => {
    expect(prompt).not.toContain('manifest?.critical === true && handshakeUpdateAvailable');
  });

  it('the critical branch renders the manifest note as its body', () => {
    const branch = prompt.slice(prompt.indexOf('sb-update-critical-title'));
    expect(branch).toContain('{criticalBodyText(manifest, t.criticalBody)}');
  });
});

describe('D-09 — generator discipline (vite.config.ts)', () => {
  it('version.json gains criticalNote from CRITICAL_UPDATE_NOTE', () => {
    expect(viteConfig).toContain('CRITICAL_UPDATE_NOTE');
    expect(viteConfig).toContain('criticalNote');
  });

  it('a note-less critical request is downgraded with a loud warning', () => {
    expect(viteConfig).toContain('CRITICAL_UPDATE=true without CRITICAL_UPDATE_NOTE');
  });
});
