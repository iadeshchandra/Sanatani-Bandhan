/**
 * campus/__tests__/wizard.test.ts — unit tests for the Map Your Temple wizard logic.
 */
import {
  checkCompleteness,
  clampStep,
  countPlaced,
  createDraft,
  detectOverlaps,
  draftKey,
  haversineM,
  moveZone,
  newZoneFor,
  parseDraft,
  PRIMARY_CATEGORY,
  removeZone,
  type WizardStep,
} from '../wizardLogic';
import type { CampusZone, OrgKind } from '../types';

const zone = (over: Partial<CampusZone> & { id: string }): CampusZone => ({
  name: 'Test Zone',
  category: 'other',
  ...over,
});

describe('PRIMARY_CATEGORY', () => {
  it('covers every org kind', () => {
    const kinds: OrgKind[] = ['mandir', 'goshala', 'ashram', 'gurukul', 'sangha', 'other'];
    for (const k of kinds) {
      expect(PRIMARY_CATEGORY[k]).toBeTruthy();
    }
  });
  it('mandir primary is garbhagriha', () => {
    expect(PRIMARY_CATEGORY.mandir).toBe('garbhagriha');
  });
});

describe('haversineM', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineM(22.5726, 88.3639, 22.5726, 88.3639)).toBeCloseTo(0, 1);
  });
  it('Kolkata to Howrah is a few km', () => {
    // Kolkata (22.5726, 88.3639) → Howrah (22.5892, 88.3103): ~5.8km
    const d = haversineM(22.5726, 88.3639, 22.5892, 88.3103);
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(8000);
  });
  it('~111km per degree of latitude', () => {
    const d = haversineM(22, 88, 23, 88);
    expect(d).toBeGreaterThan(100000);
    expect(d).toBeLessThan(120000);
  });
});

describe('detectOverlaps', () => {
  it('returns empty for well-spaced zones', () => {
    const zones = [
      zone({ id: 'a', lat: 22.5726, lng: 88.3639 }),
      zone({ id: 'b', lat: 22.5736, lng: 88.3639 }), // ~111m away
    ];
    expect(detectOverlaps(zones)).toHaveLength(0);
  });
  it('flags zones within 5 metres', () => {
    const zones = [
      zone({ id: 'a', name: 'Shrine', lat: 22.5726, lng: 88.3639 }),
      zone({ id: 'b', name: 'Gate', lat: 22.57261, lng: 88.36391 }), // ~1.5m
    ];
    const w = detectOverlaps(zones);
    expect(w).toHaveLength(1);
    expect(w[0].zoneA.id).toBe('a');
    expect(w[0].zoneB.id).toBe('b');
    expect(w[0].distanceM).toBeLessThan(5);
  });
  it('ignores zones without coordinates', () => {
    const zones = [
      zone({ id: 'a', lat: 22.5726, lng: 88.3639 }),
      zone({ id: 'b' }), // no coords
    ];
    expect(detectOverlaps(zones)).toHaveLength(0);
  });
  it('ignores unnamed zones', () => {
    const zones = [
      zone({ id: 'a', lat: 22.5726, lng: 88.3639 }),
      zone({ id: 'b', name: '  ', lat: 22.57261, lng: 88.36391 }),
    ];
    expect(detectOverlaps(zones)).toHaveLength(0);
  });
});

describe('checkCompleteness', () => {
  it('blocks publish with no zones', () => {
    const r = checkCompleteness([], 'mandir');
    expect(r.canPublish).toBe(false);
    expect(r.requiredDone).toBe(0);
    expect(r.requiredTotal).toBe(2);
  });
  it('allows publish with shrine + gate placed', () => {
    const zones = [
      zone({ id: 's', name: 'Garbhagriha', category: 'garbhagriha', lat: 22.5, lng: 88.3 }),
      zone({ id: 'g', name: 'Main Gate', category: 'gate', lat: 22.51, lng: 88.31 }),
    ];
    const r = checkCompleteness(zones, 'mandir');
    expect(r.canPublish).toBe(true);
    expect(r.requiredDone).toBe(2);
  });
  it('a named-but-unplaced zone does not count', () => {
    const zones = [
      zone({ id: 's', name: 'Garbhagriha', category: 'garbhagriha' }), // no coords
      zone({ id: 'g', name: 'Main Gate', category: 'gate', lat: 22.51, lng: 88.31 }),
    ];
    const r = checkCompleteness(zones, 'mandir');
    expect(r.canPublish).toBe(false);
  });
  it('uses org-kind primary (goshala)', () => {
    const zones = [
      zone({ id: 's', name: 'Sheds', category: 'gaushala', lat: 22.5, lng: 88.3 }),
      zone({ id: 'g', name: 'Gate', category: 'gate', lat: 22.51, lng: 88.31 }),
    ];
    expect(checkCompleteness(zones, 'goshala').canPublish).toBe(true);
    // garbhagriha does NOT satisfy goshala primary
    const wrong = [
      zone({ id: 's', name: 'Shrine', category: 'garbhagriha', lat: 22.5, lng: 88.3 }),
      zone({ id: 'g', name: 'Gate', category: 'gate', lat: 22.51, lng: 88.31 }),
    ];
    expect(checkCompleteness(wrong, 'goshala').canPublish).toBe(false);
  });
  it('counts recommended comforts separately', () => {
    const zones = [
      zone({ id: 's', name: 'Garbhagriha', category: 'garbhagriha', lat: 22.5, lng: 88.3 }),
      zone({ id: 'g', name: 'Gate', category: 'gate', lat: 22.51, lng: 88.31 }),
      zone({ id: 'p', name: 'Prasad', category: 'prasad', lat: 22.52, lng: 88.32 }),
    ];
    const r = checkCompleteness(zones, 'mandir');
    expect(r.recommendedDone).toBe(1);
    expect(r.recommendedTotal).toBe(4);
    expect(r.canPublish).toBe(true); // recommended never blocks
  });
  it('every item carries an add target for one-tap fix', () => {
    const r = checkCompleteness([], 'mandir');
    for (const item of r.items) {
      expect(item.addCategory).toBeTruthy();
      expect(item.addName?.en).toBeTruthy();
    }
  });
});

describe('draft helpers', () => {
  it('draftKey is org-scoped', () => {
    expect(draftKey('org123')).toBe('sb_campus_draft_org123');
    expect(draftKey('org123')).not.toBe(draftKey('org456'));
  });
  it('createDraft starts at step 1 with no zones', () => {
    const d = createDraft('o1', 'My Mandir', 'mandir');
    expect(d.step).toBe(1);
    expect(d.zones).toHaveLength(0);
    expect(d.mode).toBe('geo');
  });
  it('clampStep keeps steps in 1..5', () => {
    expect(clampStep(1)).toBe(1);
    expect(clampStep(5)).toBe(5);
    expect(clampStep(0)).toBe(1);
    expect(clampStep(99)).toBe(5);
    expect(clampStep('x')).toBe(1);
    expect(clampStep(undefined)).toBe(1);
    const s: WizardStep = clampStep(3);
    expect(s).toBe(3);
  });
  it('parseDraft accepts a valid draft', () => {
    const raw = {
      orgId: 'o1', orgName: 'X', orgKind: 'mandir', mode: 'geo',
      zones: [{ id: 'z1', name: 'A', category: 'gate' }],
      layoutImageUrl: null, step: 3, updatedAt: 123,
    };
    const d = parseDraft(raw);
    expect(d?.orgId).toBe('o1');
    expect(d?.step).toBe(3);
    expect(d?.zones).toHaveLength(1);
  });
  it('parseDraft rejects garbage', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({})).toBeNull();
    expect(parseDraft({ orgId: '', zones: [] })).toBeNull();
    expect(parseDraft({ orgId: 'o1' })).toBeNull(); // zones missing
  });
  it('parseDraft filters zones without ids', () => {
    const d = parseDraft({ orgId: 'o1', zones: [{ id: 'ok' }, { noId: true }, null] });
    expect(d?.zones).toHaveLength(1);
  });
});

describe('zone helpers', () => {
  it('newZoneFor creates a stable slugged id', () => {
    const z = newZoneFor('gate', 'Main Gate');
    expect(z.id).toMatch(/^zone_main_gate_/);
    expect(z.category).toBe('gate');
    expect(z.name).toBe('Main Gate');
    expect(z.lat).toBeUndefined(); // unplaced until tapped
  });
  it('countPlaced counts only zones with coordinates', () => {
    const zones = [
      zone({ id: 'a', category: 'gate', lat: 1, lng: 1 }),
      zone({ id: 'b', category: 'gate' }),
      zone({ id: 'c', category: 'prasad', lat: 1, lng: 1 }),
    ];
    expect(countPlaced(zones, 'gate')).toBe(1);
    expect(countPlaced(zones, 'prasad')).toBe(1);
  });
  it('removeZone is pure', () => {
    const zones = [zone({ id: 'a' }), zone({ id: 'b' })];
    const out = removeZone(zones, 'a');
    expect(out).toHaveLength(1);
    expect(zones).toHaveLength(2); // original untouched
  });
  it('moveZone updates coordinates', () => {
    const zones = [zone({ id: 'a', lat: 1, lng: 1 })];
    const out = moveZone(zones, 'a', 2, 3);
    expect(out[0].lat).toBe(2);
    expect(out[0].lng).toBe(3);
    expect(zones[0].lat).toBe(1); // original untouched
  });
});
