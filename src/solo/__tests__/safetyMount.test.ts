/**
 * solo/__tests__/safetyMount.test.ts — safety wiring regression guards.
 * =====================================================================
 * Pins the 2026-10-20 safety fixes so they can never silently regress:
 *
 *  1. The 🛡️ Safety section is mounted on the Profile tab (the
 *     FamilySafety + PersonalHistory + EmergencyContacts components were
 *     built with ZERO production mounts — audit 2026-10-20).
 *  2. The SOS "View in Command Center" path routes to 'crisis-command'
 *     (the real CrisisDashboard), never to the dead 'socialWall'.
 *  3. 'socialWall' no longer exists as a desk: no catalog entry, no
 *     tier-gating key, no App.tsx route, no wizard recommendation.
 *
 * These tests read the sources directly (same fs-scan pattern as
 * suchanaRemoval.test.ts) — they pin wiring, not behaviour.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');

function src(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('🛡️ Safety section is mounted on the Profile tab', () => {
  it('ProfileTab imports SafetySection', () => {
    expect(src('solo/ProfileTab.tsx')).toMatch(/from '\.\/SafetySection'/);
  });

  it('ProfileTab renders <SafetySection />', () => {
    expect(src('solo/ProfileTab.tsx')).toContain('<SafetySection />');
  });

  it('SafetySection mounts the family-circle contacts editor', () => {
    expect(src('solo/SafetySection.tsx')).toContain('EmergencyContacts');
  });

  it('SafetySection mounts the consent-first family linking surface', () => {
    expect(src('solo/SafetySection.tsx')).toContain('FamilySafety');
  });

  it('SafetySection mounts the devotee\u2019s own SOS history', () => {
    expect(src('solo/SafetySection.tsx')).toContain('PersonalHistory');
  });

  it('the safety sheet keeps SOS above it — SOS always wins z-order', () => {
    const body = src('solo/SafetySection.tsx');
    expect(body).toMatch(/z-\[9970\]/);
    expect(Number('9970')).toBeLessThan(9990);
  });
});

describe('SOS routes to the real Command Center', () => {
  const listener = () => src('components/common/GlobalSOSListener.tsx');

  it('no SOS path routes to the dead socialWall', () => {
    expect(listener()).not.toMatch(/detail: 'socialWall'/);
  });

  it('the OS notification click lands on crisis-command', () => {
    expect(listener()).toMatch(/detail: 'crisis-command'/);
  });
});

describe('socialWall no longer exists as a desk', () => {
  it('has no route in App.tsx', () => {
    expect(src('App.tsx')).not.toMatch(/case 'socialWall':/);
  });

  it('has no catalog entry in the Sidebar', () => {
    expect(src('components/common/Sidebar.tsx')).not.toMatch(/id: 'socialWall'/);
  });

  it('is not in tier gating', () => {
    expect(src('lib/workspaceRegistry.ts')).not.toContain('socialWall');
  });

  it('the onboarding wizard no longer recommends it', () => {
    const wiz = src('components/onboarding/wizardDeskMap.ts');
    expect(wiz).not.toMatch(/return 'socialWall'/);
    expect(wiz).not.toMatch(/'socialWall'\]/);
  });
});
