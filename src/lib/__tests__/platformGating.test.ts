/**
 * platformGating.test.ts — AUDIT FIX #8: safety switches must actually work.
 * Pure logic only (no firebase imports) via src/lib/platformGating.ts.
 */
import { shouldShowMaintenance, type PlatformStatus } from '../platformGating';

const ON: PlatformStatus = { maintenanceMode: true, maintenanceMessage: 'Upgrading', flags: {}, loaded: true };
const OFF: PlatformStatus = { maintenanceMode: false, maintenanceMessage: '', flags: {}, loaded: true };
const LOADING: PlatformStatus = { maintenanceMode: false, maintenanceMessage: '', flags: {}, loaded: false };

describe('shouldShowMaintenance', () => {
  test('maintenance ON + non-owner → show', () => {
    expect(shouldShowMaintenance(ON, false)).toBe(true);
  });
  test('maintenance ON + owner → bypass (GodMode stays reachable)', () => {
    expect(shouldShowMaintenance(ON, true)).toBe(false);
  });
  test('maintenance OFF → never show', () => {
    expect(shouldShowMaintenance(OFF, false)).toBe(false);
    expect(shouldShowMaintenance(OFF, true)).toBe(false);
  });
  test('still loading → never show (fail-open)', () => {
    expect(shouldShowMaintenance(LOADING, false)).toBe(false);
  });
  test('malformed status (loaded false + mode true) → fail-open, no screen', () => {
    expect(shouldShowMaintenance({ ...ON, loaded: false }, false)).toBe(false);
  });
});
