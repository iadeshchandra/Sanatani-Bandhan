/**
 * truthfulLabels.test.ts — UI/UX audit D-10 + D-14 pins.
 *
 * D-10: the Dharmic AI desk wore two different invented model names —
 * "Gemini 3.8 Flash" in its own footer, "Gemini 3.7" in the sidebar
 * badge and in RoleHome. Neither version exists. In production the
 * desk answers from its on-device guidance (no Gemini key is connected
 * for real users — the optional personal-key path lives, accurately
 * labelled "Gemini 2.5 Flash", in the account desk and is untouched).
 * The one truthful label everywhere: "On-Device AI".
 *
 * D-14: the app footer branded the product "Sanatani Bandhan
 * Enterprise" — there is no Enterprise tier (Seva / Standard /
 * Premium). The footer is now "Sanatani Bandhan" + version.
 *
 * The sweep walks all of src (tests excluded) so a sibling "Gemini 3.x"
 * can never slip back onto another surface.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

function walkSrc(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
}

describe('D-10 — one truthful AI label', () => {
  it('no surface anywhere in src claims a "Gemini 3.x" model', () => {
    const files: string[] = [];
    walkSrc(path.join(root, 'src'), files);
    const offenders = files.filter((f) => /Gemini 3\.\d/.test(fs.readFileSync(f, 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('the sidebar badge for the Dharmic desk says On-Device AI', () => {
    const sidebar = read('src/components/common/Sidebar.tsx');
    const row = sidebar.split('\n').find((l) => l.includes("id: 'dharmicAssistant'"));
    expect(row).toBeDefined();
    expect(row).toContain("badge: 'On-Device AI'");
    expect(row).not.toContain('Gemini');
  });

  it('the Dharmic desk footer says On-Device AI', () => {
    const desk = read('src/components/common/DharmicQueryAssistant.tsx');
    expect(desk).toContain('On-Device AI');
    expect(desk).not.toContain('Gemini 3');
  });

  it('RoleHome names the assistant (On-Device AI)', () => {
    const home = read('src/components/dashboard/RoleHome.tsx');
    expect(home).toContain('Dharmic AI Assistant (On-Device AI)');
    expect(home).not.toContain('Gemini 3');
  });
});

describe('D-14 — the footer brands the product, not a phantom tier', () => {
  it('Footer.tsx carries no "Enterprise" and shows Sanatani Bandhan + version', () => {
    const footer = read('src/components/common/Footer.tsx');
    expect(footer).not.toContain('Enterprise');
    expect(footer).toContain('Sanatani Bandhan v3.2.0');
  });
});
