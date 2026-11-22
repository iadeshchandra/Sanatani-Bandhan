/**
 * bootRescue.test.ts — FIX BATCH F1 (Full-App Test #2, finding F1).
 * =====================================================================
 * The three boot timings, under fake timers, against the framework-
 * free BootGate that AuthWorkspaceContext arms in its auth effect:
 *   (a) auth resolves before the bound → the rescue never fires and
 *       the normal path is untouched;
 *   (b) auth never resolves (the hang) → the rescue fires exactly
 *       once, at the bound;
 *   (c) auth resolves AFTER the rescue → no second fire, no error;
 *       the gate's work is done and the resolved state supersedes
 *       through the provider's ordinary setState paths.
 * Plus the observer-error path (rescueNow) and the provider wiring
 * contract (the gate is armed, every resolution path funnels
 * through it, the error callback rescues, cleanup disposes).
 */
import * as fs from 'fs';
import * as path from 'path';
import { BootGate, BOOT_RESCUE_MS } from '../bootRescue';

const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('BootGate — the F1 boot rescue timings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('the bound sits in the 8–12s band — a merely slow network never trips it', () => {
    expect(BOOT_RESCUE_MS).toBeGreaterThanOrEqual(8_000);
    expect(BOOT_RESCUE_MS).toBeLessThanOrEqual(12_000);
  });

  it('(a) auth resolves before the bound → the rescue never fires', () => {
    const onRescue = jest.fn();
    const gate = new BootGate(onRescue);
    gate.arm();
    jest.advanceTimersByTime(3_000);
    gate.resolve();
    jest.advanceTimersByTime(60_000);
    expect(onRescue).not.toHaveBeenCalled();
    expect(gate.status).toBe('resolved');
    expect(gate.rescued).toBe(false);
  });

  it('(b) auth never resolves → the rescue fires exactly once, at the bound', () => {
    const onRescue = jest.fn();
    const gate = new BootGate(onRescue);
    gate.arm();
    jest.advanceTimersByTime(BOOT_RESCUE_MS - 1);
    expect(onRescue).not.toHaveBeenCalled();
    expect(gate.status).toBe('pending');
    jest.advanceTimersByTime(1);
    expect(onRescue).toHaveBeenCalledTimes(1);
    expect(gate.status).toBe('rescued');
    expect(gate.rescued).toBe(true);
    jest.advanceTimersByTime(60_000);
    expect(onRescue).toHaveBeenCalledTimes(1);
  });

  it('(c) auth resolves AFTER the rescue → no second fire, no error', () => {
    const onRescue = jest.fn();
    const gate = new BootGate(onRescue);
    gate.arm();
    jest.advanceTimersByTime(BOOT_RESCUE_MS);
    expect(onRescue).toHaveBeenCalledTimes(1);
    expect(() => gate.resolve()).not.toThrow();
    jest.advanceTimersByTime(60_000);
    expect(onRescue).toHaveBeenCalledTimes(1);
    // The rescue stays on the record as a session fact.
    expect(gate.rescued).toBe(true);
  });

  it('the observer-error path (rescueNow) opens at once, disarms the timer, and cannot re-fire', () => {
    const onRescue = jest.fn();
    const gate = new BootGate(onRescue);
    gate.arm();
    gate.rescueNow();
    expect(onRescue).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    expect(onRescue).toHaveBeenCalledTimes(1);
    gate.rescueNow();
    expect(onRescue).toHaveBeenCalledTimes(1);
  });

  it('double-arm, resolve-before-arm and dispose are all safe no-ops', () => {
    const onRescue = jest.fn();
    const gate = new BootGate(onRescue);
    gate.arm();
    gate.arm();
    gate.dispose();
    jest.advanceTimersByTime(60_000);
    expect(onRescue).not.toHaveBeenCalled();

    const early = new BootGate(onRescue);
    early.resolve();
    early.arm();
    jest.advanceTimersByTime(60_000);
    expect(onRescue).not.toHaveBeenCalled();
    expect(early.status).toBe('resolved');
  });
});

describe('AuthWorkspaceContext — F1 wiring (source contract)', () => {
  const src = read('context/AuthWorkspaceContext.tsx');

  it('arms a BootGate inside the auth effect', () => {
    expect(src).toContain("from '../lib/bootRescue'");
    expect(src).toContain('new BootGate(');
    expect(src).toContain('bootGate.arm()');
    expect(src).toContain('bootGate.dispose()');
  });

  it('every resolution path funnels through finishBoot — no path clears the gate behind the gate’s back', () => {
    // finishBoot call sites: anonymous, suspended, profile-fetch
    // finally, signed-out.
    expect(src.match(/finishBoot\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    // The only raw setIsLoading(false) calls left are the gate's own
    // rescue callback and finishBoot itself.
    expect(src.match(/setIsLoading\(false\)/g)?.length ?? 0).toBe(2);
  });

  it('the auth observer carries an error callback that takes the rescue path', () => {
    expect(src).toContain('bootGate.rescueNow()');
  });

  it('exposes bootRescued on the context type and value', () => {
    expect(src).toContain('bootRescued: boolean;');
    expect(src).toContain('bootRescued,');
  });
});
