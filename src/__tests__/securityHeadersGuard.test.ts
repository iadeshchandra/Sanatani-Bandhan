/**
 * securityHeadersGuard.test.ts — hosting security headers pin
 * (Security hardening batch, 2026-11-17).
 *
 * firebase.json is the app's only HTTP-header surface (Firebase
 * Hosting). This guard pins the global `/**` header block so the
 * hardening cannot silently fall out of the config:
 *
 *  - X-Content-Type-Options: nosniff — browsers must honour the
 *    declared content type (blocks MIME-sniffing attacks).
 *  - Referrer-Policy — cross-origin requests learn only the origin,
 *    never the full in-app path.
 *  - X-Frame-Options: SAMEORIGIN — the app may not be framed by
 *    other sites (clickjacking), while same-origin framing (the
 *    app's own preview surfaces) keeps working.
 *  - Permissions-Policy — camera / microphone / geolocation are
 *    usable by the app itself only (QR scanning, voice, SOS/maps);
 *    the Payment Request API is off (payments travel on external
 *    rails, never through the browser payment sheet).
 *  - Content-Security-Policy-Report-Only — the CSP runs in
 *    REPORT-ONLY mode: browsers report violations but block
 *    nothing, so the policy can be observed against real traffic
 *    before it is ever enforced. The enforcing
 *    `Content-Security-Policy` header must NOT appear until that
 *    observation step is done — this guard fails if it does.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const firebaseJson = JSON.parse(
  fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'),
) as {
  hosting: {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
};

const blocks = firebaseJson.hosting.headers;
const globalBlock = blocks.find((b) => b.source === '/**');
const headerValue = (key: string): string | undefined =>
  globalBlock?.headers.find((h) => h.key === key)?.value;

describe('hosting security headers (firebase.json)', () => {
  it('has a global /** header block', () => {
    expect(globalBlock).toBeDefined();
  });

  it('pins MIME-sniffing protection', () => {
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
  });

  it('pins a strict referrer policy', () => {
    expect(headerValue('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('pins same-origin framing only', () => {
    expect(headerValue('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('restricts device APIs to the app itself and disables Payment Request', () => {
    const policy = headerValue('Permissions-Policy') ?? '';
    expect(policy).toContain('camera=(self)');
    expect(policy).toContain('microphone=(self)');
    expect(policy).toContain('geolocation=(self)');
    expect(policy).toContain('payment=()');
  });

  it('carries a report-only CSP with a locked default and no objects', () => {
    const csp = headerValue('Content-Security-Policy-Report-Only') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('does NOT enforce a CSP yet (report-only observation comes first)', () => {
    const allKeys = blocks.flatMap((b) => b.headers.map((h) => h.key));
    expect(allKeys).not.toContain('Content-Security-Policy');
  });

  it('keeps the pre-existing cache blocks intact', () => {
    const sources = blocks.map((b) => b.source);
    expect(sources).toContain('/assets/**');
    expect(sources).toContain('/version.json');
    expect(sources).toContain('/ocr/**');
  });
});
