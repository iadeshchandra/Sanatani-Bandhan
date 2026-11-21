/**
 * eventGateRegistry.ts — the gate's on-device replay registry (E3).
 * =====================================================================
 * One-scan-once needs a memory that survives a page reload at a
 * crowded gate, works fully offline, and never becomes a second
 * source of truth: this registry is that memory. It records, per
 * event + day, the first scan time of each admitted RSVP record id
 * on THIS device. The RSVP record's own `checkedIn` state (written
 * through the war-room store path) remains the shared truth — the
 * registry only answers "has THIS gate already let this pass in
 * today, and when".
 *
 * Storage: localStorage `sb_event_gate_registry_v1`, shaped
 *   { "<eventId>|<date>": { "<rsvpId>": <firstScanAtMs> } }
 * All functions are pure over the data object (plus load/save
 * helpers), so the registry rules are unit-testable without a DOM.
 */

export type GateRegistryData = Record<string, Record<string, number>>;

export const GATE_REGISTRY_STORAGE_KEY = 'sb_event_gate_registry_v1';

const scopeKey = (eventId: string, date: string): string => `${eventId}|${date}`;

/** First scan time (epoch ms) for one record in one event+day scope, or null. */
export function registryFirstScanAt(
  data: GateRegistryData,
  eventId: string,
  date: string,
  rsvpId: string
): number | null {
  const scope = data[scopeKey(eventId, date)];
  if (!scope) return null;
  const at = scope[rsvpId];
  return typeof at === 'number' && Number.isFinite(at) ? at : null;
}

export interface RegisterScanResult {
  data: GateRegistryData;
  /** True when the record was already registered in this scope. */
  alreadyUsed: boolean;
  /** The FIRST scan time — the original registration wins, always. */
  firstScanAt: number;
}

/**
 * Register an admission. Registering the same record twice in one
 * scope keeps the first time (that is the whole point of the
 * registry); registering it under another day or event is a fresh
 * scope and admits cleanly.
 */
export function registerScan(
  data: GateRegistryData,
  eventId: string,
  date: string,
  rsvpId: string,
  atMs: number
): RegisterScanResult {
  const key = scopeKey(eventId, date);
  const existing = registryFirstScanAt(data, eventId, date, rsvpId);
  if (existing != null) {
    return { data, alreadyUsed: true, firstScanAt: existing };
  }
  const next: GateRegistryData = {
    ...data,
    [key]: { ...(data[key] || {}), [rsvpId]: atMs },
  };
  return { data: next, alreadyUsed: false, firstScanAt: atMs };
}

/** Minimal storage adapter (localStorage in the app, a Map in tests). */
export interface GateRegistryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function defaultStorage(): GateRegistryStorage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* storage blocked — memory-only registry */ }
  return null;
}

/** Load the registry from storage; corrupt/absent data reads as empty. */
export function loadGateRegistry(storage: GateRegistryStorage | null = defaultStorage()): GateRegistryData {
  if (!storage) return {};
  try {
    const raw = storage.getItem(GATE_REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: GateRegistryData = {};
    for (const [scope, entries] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
      const clean: Record<string, number> = {};
      for (const [rsvpId, at] of Object.entries(entries as Record<string, unknown>)) {
        if (typeof at === 'number' && Number.isFinite(at)) clean[rsvpId] = at;
      }
      if (Object.keys(clean).length > 0) out[scope] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

/** Persist the registry (best-effort — a full/blocked store never breaks the gate). */
export function saveGateRegistry(
  data: GateRegistryData,
  storage: GateRegistryStorage | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(GATE_REGISTRY_STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota/blocked → the in-memory copy still guards this session */ }
}
