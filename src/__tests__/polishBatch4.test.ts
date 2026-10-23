/**
 * polishBatch4.test.ts — UI/UX audit Batch 4 pins for D-13, D-15,
 * D-17, D-18, D-19 and U5/U6.
 *
 * D-13: names squeezed to meaninglessness — the Header workspace name
 * was capped at 140px ("Mandir Demo Sa…") and the DemoBanner title
 * collapsed to "De…" because the banner's other items took fixed
 * space first. The name-budget rule: names get a viewport-relative
 * budget and lesser items (the created-count stat) yield first; the
 * full name stays reachable via the title attribute.
 *
 * D-15: the Dharmic AI desk opened scrolled to the bottom of itself —
 * its auto-scroll effect fired on mount. It now scrolls only after
 * the user has actually asked something.
 *
 * D-17: the "Want a warmer voice?" nudge fired the moment an answer
 * completed — the exact moment the user starts reading. It may now
 * surface only at the natural boundary of the sheet opening (no fresh
 * answer on screen), under the same honest rule (3+ uses, once ever,
 * never after dismissal).
 *
 * D-18: the role welcome banner sat above EVERY desk until dismissed.
 * Its dismissal already persisted per org+role; it is now also scoped
 * to the Command Center, the org's home.
 *
 * D-19 + U5: internal jargon in user-facing strings — the "MRR"
 * drawer badge, "Normalized MRR run-rate", "O2O Physical
 * Verification", "Live KPIs". Plain words now. GodMode (the owner's
 * own platform console, where MRR is a deliberate business metric)
 * and the dev persona rig are platform-internal surfaces and are
 * deliberately outside this sweep.
 *
 * U6: the hard-coded English "SAVED ON THIS DEVICE" pill floated
 * shell-wide over every Solo tab — including cloud-backed data its
 * own spec says it must never label. The shell mount is gone; the
 * badge stays on the local-only create-forms it was designed for,
 * and Profile keeps its properly translated instance.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
}

describe('D-13 — the name-budget rule', () => {
  it('the Header workspace name gets a viewport-relative budget, not 140px', () => {
    const header = read('src/components/common/Header.tsx');
    expect(header).toContain('max-w-[52vw] sm:max-w-[220px] lg:max-w-md');
    expect(header).not.toContain('max-w-[140px]');
    // full name remains reachable
    expect(header).toContain('title={activeWorkspace.name}');
  });

  it('the DemoBanner title has a floor and the created-count yields below 480px', () => {
    const banner = read('src/components/public/DemoBanner.tsx');
    expect(banner).toContain('min-w-[6.5rem]');
    expect(banner).toContain('hidden min-[480px]:inline sm:hidden');
  });

  it('sidebar desk rows expose the full desk name via title', () => {
    const sb = read('src/components/common/Sidebar.tsx');
    expect(sb).toContain('`${displayLabel} (${groupTitle})` : displayLabel');
  });
});

describe('D-15 — the Dharmic desk opens at the top', () => {
  it('auto-scroll is gated on the user having asked', () => {
    const desk = read('src/components/common/DharmicQueryAssistant.tsx');
    expect(desk).toContain('const userAskedRef = useRef(false);');
    expect(desk).toContain('userAskedRef.current = true;');
    expect(desk).toContain('if (!userAskedRef.current) return;');
  });
});

describe('D-17 — the voice nudge keeps to the sheet-open boundary', () => {
  it('the nudge no longer fires from inside send()', () => {
    const sheet = read('src/ai/components/AssistantSheet.tsx');
    expect(sheet).not.toContain('Fire-and-forget: the answer is already on screen');
  });

  it('the nudge check lives in the open effect, under the unchanged honest rule', () => {
    const sheet = read('src/ai/components/AssistantSheet.tsx');
    expect(sheet).toContain('sheet opening onto a fresh conversation');
    expect(sheet).toContain('countAssistantUse() < 3 || !shouldShowNudge()');
    expect(sheet).toContain('markNudgeShown();');
  });
});

describe('D-18 — the welcome banner lives on the Command Center only', () => {
  it('the hint renders only on the dashboard desk, dismissal still per org+role', () => {
    const shell = read('src/components/shell/OrgSpaceShell.tsx');
    expect(shell).toContain("showHint && deskId === 'dashboard'");
    expect(shell).toContain('hintKeyFor(orgId, displayRole)');
  });
});

describe('D-19 + U5 — plain words, no internal jargon', () => {
  it('the Recurring Seva drawer badge says Monthly, not MRR', () => {
    const sb = read('src/components/common/Sidebar.tsx');
    const row = sb.split('\n').find((l) => l.includes("id: 'recurring-seva'"));
    expect(row).toBeDefined();
    expect(row).toContain("badge: 'Monthly'");
    expect(sb).not.toContain('MRR');
  });

  it('the Recurring Seva desk speaks of active monthly mandates', () => {
    const desk = read('src/components/domain2/RecurringSevaDesk.tsx');
    expect(desk).not.toContain('MRR');
    expect(desk).toContain('From active monthly mandates');
  });

  it('the demo tour says Live numbers, not KPIs', () => {
    const tour = read('src/components/public/DemoTour.tsx');
    expect(tour).not.toContain('KPIs');
    expect(tour).toContain('Live numbers');
  });

  it('the Yatra Passport subtitle drops the O2O jargon (U5)', () => {
    const portal = read('src/pages/DevoteePortal.tsx');
    expect(portal).not.toContain('O2O');
    expect(portal).toContain('Physical Verification at Mandir Turnstiles &amp; Kiosks');
  });

  it('no language dictionary carries the jargon tokens', () => {
    const files: string[] = [];
    walk(path.join(root, 'src/i18n'), files);
    const offenders = files.filter((f) => /\b(MRR|O2O)\b/.test(fs.readFileSync(f, 'utf-8')));
    expect(offenders).toEqual([]);
  });

  it('the recurring-seva dictionary value is the plain sentence in every fragment', () => {
    const langs = ['en', 'bn', 'hi', 'gu', 'kn', 'ml', 'mr', 'sa', 'ta', 'te'];
    for (const lang of langs) {
      const frag = read(`src/i18n/lang/${lang}/org.ts`);
      expect(frag).toContain('normalizedMrrRunrate: "From active monthly mandates"');
    }
    expect(read('src/i18n/lang/en.ts')).toContain(
      'normalizedMrrRunrate: "From active monthly mandates"'
    );
  });
});

describe('U6 — no shell-wide "Saved on this device" pill', () => {
  it('the Solo shell no longer mounts the badge', () => {
    const shell = read('src/solo/SoloWorkspaceShell.tsx');
    expect(shell).not.toContain('LocalOnlyBadge');
  });

  it('the translated Profile instance stays', () => {
    const profile = read('src/solo/ProfileTab.tsx');
    expect(profile).toContain('Saved on this device');
  });

  it('the badge component itself survives for the local-only forms it was designed for', () => {
    expect(fs.existsSync(path.join(root, 'src/components/common/LocalOnlyBadge.tsx'))).toBe(true);
    const form = read('src/components/domain3/PoojaBookingDesk.tsx');
    expect(form).toContain('<LocalOnlyBadge />');
  });
});
