/**
 * eventGateRegistry.test.ts — replay-registry semantics (EVENTS E3).
 * Pure: a Map-backed storage adapter stands in for localStorage.
 */
import {
  loadGateRegistry,
  saveGateRegistry,
  registerScan,
  registryFirstScanAt,
  GATE_REGISTRY_STORAGE_KEY,
  type GateRegistryData,
  type GateRegistryStorage,
} from '../eventGateRegistry';

const EVENT_A = 'ws1__durga_2026-10-01';
const EVENT_B = 'ws1__kali_2026-10-20';
const RSVP = 'ws1__durga_2026-10-01__uid1';
const T1 = Date.parse('2026-10-02T07:30:00.000Z');
const T2 = Date.parse('2026-10-02T09:45:00.000Z');

describe('registerScan / registryFirstScanAt', () => {
  it('first registration admits and stamps the time', () => {
    const r = registerScan({}, EVENT_A, '2026-10-02', RSVP, T1);
    expect(r.alreadyUsed).toBe(false);
    expect(r.firstScanAt).toBe(T1);
    expect(registryFirstScanAt(r.data, EVENT_A, '2026-10-02', RSVP)).toBe(T1);
  });

  it('second registration in the same scope reads used and keeps the FIRST time', () => {
    const first = registerScan({}, EVENT_A, '2026-10-02', RSVP, T1);
    const second = registerScan(first.data, EVENT_A, '2026-10-02', RSVP, T2);
    expect(second.alreadyUsed).toBe(true);
    expect(second.firstScanAt).toBe(T1);
    expect(registryFirstScanAt(second.data, EVENT_A, '2026-10-02', RSVP)).toBe(T1);
  });

  it('scopes are per event AND per day — another day or event is a fresh admission', () => {
    let data: GateRegistryData = registerScan({}, EVENT_A, '2026-10-02', RSVP, T1).data;
    expect(registryFirstScanAt(data, EVENT_A, '2026-10-03', RSVP)).toBeNull();
    expect(registerScan(data, EVENT_A, '2026-10-03', RSVP, T2).alreadyUsed).toBe(false);
    data = registerScan(data, EVENT_A, '2026-10-03', RSVP, T2).data;
    expect(registerScan(data, EVENT_B, '2026-10-02', RSVP, T2).alreadyUsed).toBe(false);
  });

  it('does not mutate the input data', () => {
    const before: GateRegistryData = {};
    registerScan(before, EVENT_A, '2026-10-02', RSVP, T1);
    expect(before).toEqual({});
  });

  it('unknown scopes and records read as never scanned', () => {
    expect(registryFirstScanAt({}, EVENT_A, '2026-10-02', RSVP)).toBeNull();
  });
});

describe('persistence', () => {
  const mapStorage = (): GateRegistryStorage & { map: Map<string, string> } => {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
      setItem: (k, v) => { map.set(k, v); },
    };
  };

  it('save → load round-trips the registry', () => {
    const storage = mapStorage();
    const data = registerScan({}, EVENT_A, '2026-10-02', RSVP, T1).data;
    saveGateRegistry(data, storage);
    expect(storage.map.has(GATE_REGISTRY_STORAGE_KEY)).toBe(true);
    expect(loadGateRegistry(storage)).toEqual(data);
  });

  it('corrupt or shapeless stored data loads as an empty registry, never a crash', () => {
    const storage = mapStorage();
    storage.setItem(GATE_REGISTRY_STORAGE_KEY, '{not json');
    expect(loadGateRegistry(storage)).toEqual({});
    storage.setItem(GATE_REGISTRY_STORAGE_KEY, JSON.stringify(['array']));
    expect(loadGateRegistry(storage)).toEqual({});
    storage.setItem(GATE_REGISTRY_STORAGE_KEY, JSON.stringify({ 'a|b': { r1: 'oops', r2: 42 } }));
    expect(loadGateRegistry(storage)).toEqual({ 'a|b': { r2: 42 } });
  });

  it('absent storage reads empty and saves are a no-op', () => {
    expect(loadGateRegistry(null)).toEqual({});
    expect(() => saveGateRegistry({ 'a|b': { r: 1 } }, null)).not.toThrow();
  });
});
