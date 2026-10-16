/**
 * suchanaSnapshot.ts — Snapshot builders for the App Intelligence engine.
 * ======================================================================
 * Assembles ModuleSnapshot objects from whatever local state is cheaply
 * available. EVERYTHING here is fail-open: missing data → empty arrays,
 * never a throw. The insight engine tolerates absence by design.
 */

import type { ModuleSnapshot } from './appIntelligence';

/** Build a snapshot from the Solo (personal) store state. */
export function buildSoloSnapshot(soloState: any): ModuleSnapshot {
  const snap: ModuleSnapshot = {};
  try {
    const s = soloState || {};
    // Personal samskara dates → ceremony plans (loose shape; past dates
    // are filtered by the generator's 0..14 day window).
    const samskaras = Array.isArray(s.samskaras) ? s.samskaras : [];
    snap.ceremonyPlans = samskaras.map((sm: any, i: number) => ({
      id: String(sm.id || `solo-samskara-${i}`),
      targetDate: String(sm.dateISO || sm.date || ''),
      muhuratNote: '',
      purohitName: '',
    }));
    // Personal reminders → lightweight festival/task hints are not needed;
    // keep the snapshot minimal and honest.
  } catch {
    /* fail-open */
  }
  return snap;
}

/** Empty snapshot — engine returns [] safely. Useful for tests/fallback. */
export function emptySnapshot(): ModuleSnapshot {
  return {};
}

/**
 * Try to build a richer snapshot from well-known localStorage caches.
 * Keys are best-effort; anything unparsable is skipped silently.
 */
export function buildCachedSnapshot(): ModuleSnapshot {
  const snap: ModuleSnapshot = {};
  try {
    const read = (k: string): any => {
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };
    const pick = (v: any): any[] => (Array.isArray(v) ? v : []);
    const donations = read('sb_donations') || read('sanatani_donations');
    if (donations) snap.donations = pick(donations);
    const treasury = read('sb_treasury') || read('sanatani_treasury');
    if (treasury) snap.treasury = pick(treasury);
    const inventory = read('sb_inventory') || read('sanatani_inventory');
    if (inventory) snap.inventory = pick(inventory);
    const devotees = read('sb_devotees') || read('sanatani_devotees');
    if (devotees) snap.devotees = pick(devotees);
  } catch {
    /* fail-open */
  }
  return snap;
}
