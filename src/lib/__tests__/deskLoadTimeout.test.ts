/**
 * deskLoadTimeout.test.ts — UI/UX audit D-02 pins.
 * =====================================================================
 * Two org-catalog desks spun forever: their internal loading state
 * cleared only on a Firestore snapshot SUCCESS, and the error
 * callback merely logged. The desks' loading paths are fixed at the
 * source (error → honest error state + retry), and DeskLoadGuard is
 * the global backstop: one probe after DESK_LOAD_TIMEOUT_MS judges a
 * desk hung ONLY on the audited signature — the Suspense loading
 * fallback still mounted, or literally nothing but a spinner.
 * Desks with real content must never be judged hung.
 */

import { readFileSync } from 'fs';
import { resolve as pathResolve } from 'path';
import { DESK_LOAD_TIMEOUT_MS, deskHangSignature } from '../deskLoadTimeout';

describe('deskHangSignature', () => {
  it('the timeout is the audited 10s law', () => {
    expect(DESK_LOAD_TIMEOUT_MS).toBe(10_000);
  });

  it('a still-mounted loading fallback is hung, whatever else is true', () => {
    expect(
      deskHangSignature({ hasLoadingMarker: true, textLength: 21, hasSpinner: true })
    ).toBe(true);
    expect(
      deskHangSignature({ hasLoadingMarker: true, textLength: 0, hasSpinner: false })
    ).toBe(true);
  });

  it('nothing but a spinner is hung (the two audited desks)', () => {
    expect(
      deskHangSignature({ hasLoadingMarker: false, textLength: 0, hasSpinner: true })
    ).toBe(true);
  });

  it('real content is never hung — even with a spinner widget inside', () => {
    expect(
      deskHangSignature({ hasLoadingMarker: false, textLength: 450, hasSpinner: true })
    ).toBe(false);
    expect(
      deskHangSignature({ hasLoadingMarker: false, textLength: 450, hasSpinner: false })
    ).toBe(false);
  });

  it('a blank desk with no spinner is a different failure class — not judged here', () => {
    expect(
      deskHangSignature({ hasLoadingMarker: false, textLength: 0, hasSpinner: false })
    ).toBe(false);
  });
});

describe('wiring contracts (source guards)', () => {
  const root = pathResolve(__dirname, '..', '..', '..');
  const app = readFileSync(pathResolve(root, 'src', 'App.tsx'), 'utf8');
  const sadhana = readFileSync(
    pathResolve(root, 'src', 'components', 'domain5', 'PersonalSadhanaDesk.tsx'),
    'utf8'
  );
  const vivah = readFileSync(
    pathResolve(root, 'src', 'components', 'domain4', 'SanataniVivahDesk.tsx'),
    'utf8'
  );

  it('App mounts the guard and marks the Suspense fallback for the probe', () => {
    expect(app).toContain('DeskLoadGuard');
    expect(app).toContain('data-desk-loading="true"');
  });

  it('both audited desks end loading on a snapshot error, with a way out', () => {
    for (const src of [sadhana, vivah]) {
      expect(src).toContain('setLoadError(');
      expect(src).toContain('role="alert"');
      expect(src).toContain('Try again');
      expect(src).toContain('Back to Command Center');
    }
  });
});
