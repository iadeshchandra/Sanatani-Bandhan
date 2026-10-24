/**
 * worldReadyBatch3.test.ts — WORLD-READINESS Batch 3 pins.
 *
 * Two laws are pinned here:
 *
 *  1. TWO-VIEW INTEGRITY: the fabricated third "Devotee view"
 *     (src/pages/DevoteePortal.tsx + its VivahEngine) is GONE, and
 *     App.tsx routes staff to the real devotee desk inside the
 *     labelled, read-only PreviewFrame instead.
 *
 *  2. ENGAGEMENT LAW (Blueprint D): no user-visible streaks, points-
 *     for-devotion, leaderboards or halls of fame in the rendered
 *     surfaces (components / pages / solo). The scan skips comment-only
 *     lines — the repo's anti-gamification statements and audit notes
 *     legitimately NAME the banned mechanics to forbid them.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) out.push(p);
  }
  return out;
}

function renderedLines(file: string): string[] {
  // Strip comments properly: full-line // comments and /* */ blocks
  // (including multi-line JSX {/* */} blocks, whose continuation lines
  // carry no marker). What remains is code + rendered copy.
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return text.split('\n').filter((line) => !line.trim().startsWith('//'));
}

describe('two-view integrity: the fabricated devotee portal is gone', () => {
  it('src/pages/DevoteePortal.tsx and VivahEngine.tsx do not exist', () => {
    expect(fs.existsSync(path.join(SRC, 'pages/DevoteePortal.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(SRC, 'components/devotee/VivahEngine.tsx'))).toBe(false);
  });

  it('App.tsx mounts PreviewFrame and never imports the old portal', () => {
    const app = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    expect(app).toContain('PreviewFrame');
    expect(app).not.toContain('pages/DevoteePortal');
  });

  it('PreviewFrame carries the labelled preview bar with an exit', () => {
    const frame = fs.readFileSync(path.join(SRC, 'components/common/PreviewFrame.tsx'), 'utf8');
    expect(frame).toContain('preview_title');
    expect(frame).toContain('preview_readonly');
    expect(frame).toContain('preview_exit');
    expect(frame).toContain('onExit');
  });
});

describe('engagement law: no scoring mechanics in rendered surfaces', () => {
  const BANNED = [
    'Punya Mudra',
    'Karma Points',
    'Hall of Fame',
    'Hall of Seva',
    'Global Karma Leaderboard',
    'Seva Karma',
    'Seva Index',
    'weeklyStreakDays',
    'karmaEarned',
    'LEADERBOARD',
  ];

  it('no banned phrase renders in components, pages or solo', () => {
    const offenders: string[] = [];
    for (const dir of ['components', 'pages', 'solo']) {
      for (const file of walk(path.join(SRC, dir))) {
        const lines = renderedLines(file);
        for (const phrase of BANNED) {
          if (lines.some((l) => l.includes(phrase))) {
            offenders.push(`${path.relative(SRC, file)} :: ${phrase}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the devotee desk no longer fabricates a person when no record exists', () => {
    const portal = fs.readFileSync(path.join(SRC, 'components/domain5/DevoteeAccountPortal.tsx'), 'utf8');
    expect(portal).not.toContain('98765 43210');
    expect(portal).not.toContain('weeklyStreakDays');
    expect(portal).not.toContain("bloodGroup: 'B+ Positive'");
  });

  it('the devotee desk invents no family, ancestors or yatra history', () => {
    const portal = fs.readFileSync(path.join(SRC, 'components/domain5/DevoteeAccountPortal.tsx'), 'utf8');
    // Invented household members, ancestors, pilgrimages and totals that
    // used to render for every devotee with no real records (G-M2 deep).
    expect(portal).not.toContain('Smt. Gayatri Devi');
    expect(portal).not.toContain('Ch. Aditya Sharma');
    expect(portal).not.toContain('Smt. Kausalya Sharma');
    expect(portal).not.toContain('Harishchandra Sharma');
    expect(portal).not.toContain('footprint-1');
    expect(portal).not.toContain('totalFamilyDonations: 45000');
    expect(portal).not.toContain('98765');
  });

  it('the seva register is a register, not a ranked ledger', () => {
    const file = path.join(SRC, 'components/domain2/KarmaLedgerDesk.tsx');
    const raw = fs.readFileSync(file, 'utf8');
    const rendered = renderedLines(file).join('\n');
    expect(raw).toContain('seva_register_title');
    expect(rendered).not.toContain('Ratna');
    expect(rendered).not.toContain('sevaIndex');
  });
});
