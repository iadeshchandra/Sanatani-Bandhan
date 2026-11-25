/**
 * withTimeout.test.ts — SPLASH & GODMODE BATCH, part C.
 * =====================================================================
 * The deadline race behind the bounded GodMode role check:
 *   (a) settle before the bound → the promise's own outcome wins;
 *   (b) never settle → a TimeoutError lands exactly at the bound;
 *   (c) settle after the bound → the timeout stands, the late
 *       outcome is ignored (and a late rejection stays handled).
 */
import { withTimeout, TimeoutError, isTimeoutError } from '../withTimeout';

describe('withTimeout — the deadline race', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('(a) a value arriving before the bound resolves with that value', async () => {
    const p = withTimeout(Promise.resolve(42), 8_000);
    await expect(p).resolves.toBe(42);
    jest.advanceTimersByTime(60_000);
    await expect(p).resolves.toBe(42);
  });

  it('(a) an error arriving before the bound rejects with that error, untouched', async () => {
    const boom = new Error('registry read failed');
    const p = withTimeout(Promise.reject(boom), 8_000);
    await expect(p).rejects.toBe(boom);
    await expect(p).rejects.not.toBeInstanceOf(TimeoutError);
  });

  it('(b) a promise that never settles rejects with TimeoutError at the bound', async () => {
    const never = new Promise<string>(() => { /* hangs forever */ });
    const p = withTimeout(never, 8_000);
    let settled = false;
    void p.then(() => { settled = true; }, () => { settled = true; });
    jest.advanceTimersByTime(7_999);
    await Promise.resolve();
    expect(settled).toBe(false);
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(1);
    await assertion;
    expect(settled).toBe(true);
  });

  it('(b) the TimeoutError carries the stable sb/timeout code', async () => {
    const never = new Promise<string>(() => { /* hangs forever */ });
    const p = withTimeout(never, 100);
    const assertion = expect(p).rejects.toMatchObject({ code: 'sb/timeout' });
    jest.advanceTimersByTime(100);
    await assertion;
    const err = await p.catch((e) => e);
    expect(isTimeoutError(err)).toBe(true);
    expect(isTimeoutError(new Error('other'))).toBe(false);
    expect(isTimeoutError(null)).toBe(false);
  });

  it('(c) a late resolution after the bound does not replace the timeout', async () => {
    let resolveLate: (v: string) => void = () => {};
    const late = new Promise<string>((res) => { resolveLate = res; });
    const p = withTimeout(late, 1_000);
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(1_000);
    await assertion;
    resolveLate('too late');
    await Promise.resolve();
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });

  it('(c) a late rejection after the bound stays handled (no unhandled rejection)', async () => {
    let rejectLate: (e: Error) => void = () => {};
    const late = new Promise<string>((_res, rej) => { rejectLate = rej; });
    const p = withTimeout(late, 1_000);
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(1_000);
    await assertion;
    rejectLate(new Error('late failure'));
    await Promise.resolve();
    await expect(p).rejects.toBeInstanceOf(TimeoutError);
  });
});
