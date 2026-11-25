/**
 * bootWatchdog.test.ts — SPLASH & GODMODE BATCH, part B.
 * =====================================================================
 * The stale-copy escape decision table, plus the mirror contract:
 * the inline watchdog in index.html must carry the same constants,
 * the same guard key and the same visible copy as the tested module
 * (src/lib/bootWatchdog.ts), and main.tsx must raise the boot signal
 * the watchdog waits for. The splash-markup assertions pin part A:
 * ONE light splash — no corporate subtitle, no "Initializing Secure
 * Environment..." status line, tagline + progress bar kept.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  bootWatchAction,
  BOOT_WATCH_WARN_MS,
  BOOT_WATCH_RESET_MS,
  BOOT_ESCAPE_GUARD_KEY,
} from '../bootWatchdog';

const ROOT = path.join(__dirname, '..', '..', '..');
const readRoot = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('bootWatchAction — the escape decision table', () => {
  it('the bounds are 12s warn / 20s reset, warn before reset', () => {
    expect(BOOT_WATCH_WARN_MS).toBe(12_000);
    expect(BOOT_WATCH_RESET_MS).toBe(20_000);
    expect(BOOT_WATCH_WARN_MS).toBeLessThan(BOOT_WATCH_RESET_MS);
    expect(BOOT_ESCAPE_GUARD_KEY).toBe('sb-escape-tried');
  });

  it('a healthy boot is never disturbed, at any elapsed time', () => {
    for (const elapsedMs of [0, 5_000, BOOT_WATCH_WARN_MS, BOOT_WATCH_RESET_MS, 120_000]) {
      expect(bootWatchAction({ booted: true, guardSet: false, elapsedMs })).toBe('none');
      expect(bootWatchAction({ booted: true, guardSet: true, elapsedMs })).toBe('none');
    }
  });

  it('before the warn bound, a slow boot is left alone', () => {
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: 0 })).toBe('none');
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: BOOT_WATCH_WARN_MS - 1 })).toBe('none');
  });

  it('at the warn bound, the recovery block is offered (manual only)', () => {
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: BOOT_WATCH_WARN_MS })).toBe('show-recovery');
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: BOOT_WATCH_RESET_MS - 1 })).toBe('show-recovery');
    expect(bootWatchAction({ booted: false, guardSet: true, elapsedMs: BOOT_WATCH_WARN_MS })).toBe('show-recovery');
  });

  it('at the reset bound, exactly one automatic reset is attempted', () => {
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: BOOT_WATCH_RESET_MS })).toBe('auto-reset');
    expect(bootWatchAction({ booted: false, guardSet: false, elapsedMs: 600_000 })).toBe('auto-reset');
  });

  it('loop safety is absolute: with the guard set, never auto-reset again', () => {
    expect(bootWatchAction({ booted: false, guardSet: true, elapsedMs: BOOT_WATCH_RESET_MS })).toBe('show-recovery');
    expect(bootWatchAction({ booted: false, guardSet: true, elapsedMs: 600_000 })).toBe('show-recovery');
  });
});

describe('index.html watchdog — mirror contract (source)', () => {
  const html = readRoot('index.html');
  const splashStart = html.indexOf('id="sb-splash-screen"');
  const splashEnd = html.indexOf('<div id="root">');
  const splash = html.slice(splashStart, splashEnd);

  it('the splash block exists and is the light design (A)', () => {
    expect(splashStart).toBeGreaterThan(-1);
    expect(splash).toContain('#fafaf9');
    expect(splash).toContain('/icon-192x192.png');
    expect(splash).toContain('Sanatani Bandhan');
    expect(splash).toContain('Preserving Heritage. Empowering Devotion.');
    expect(splash).toContain('sb-progress-bar');
  });

  it('the corporate subtitle and the status line are gone from the splash (A)', () => {
    expect(splash).not.toContain('Dharmic Institution Management Platform');
    expect(splash).not.toContain('Initializing Secure Environment');
  });

  it('the watchdog mirrors the tested constants and guard key (B)', () => {
    expect(html).toContain('var WARN_MS = 12000;');
    expect(html).toContain('var RESET_MS = 20000;');
    expect(html).toContain(`var GUARD_KEY = '${BOOT_ESCAPE_GUARD_KEY}';`);
    expect(html).toContain('__SB_BOOTED__');
    expect(html).toContain('getRegistrations');
    expect(html).toContain('caches.keys');
    expect(html).toContain('sessionStorage');
  });

  it('the recovery block is in the splash DOM with honest copy and a real button (B)', () => {
    expect(splash).toContain('id="sb-splash-recovery"');
    expect(splash).toContain('This is taking longer than usual.');
    expect(splash).toContain('id="sb-splash-refresh"');
    expect(splash).toContain('Refresh the app');
    // no technical words in the visible copy
    expect(splash).not.toContain('service worker');
    expect(splash).not.toContain('Cache Storage');
  });

  it('main.tsx raises the boot signal at splash dismissal (B)', () => {
    const main = readRoot('src/main.tsx');
    expect(main).toContain('__SB_BOOTED__ = true');
  });

  it('the React gate splash is gone — no second branded boot screen (A)', () => {
    const ctx = readRoot('src/context/AuthWorkspaceContext.tsx');
    expect(ctx).not.toContain('Initializing Secure Environment');
    expect(ctx).not.toContain('Dharmic Institution Management Platform');
  });
});
