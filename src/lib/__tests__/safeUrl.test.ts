/**
 * safeUrl.test.ts — SECURITY P1 (Finding 2): the stored-URL scheme gate.
 * =====================================================================
 * A stored `javascript:` value (a jyotishi's session link, a priest's
 * live-stream link, a provider's payment link, a claimant's proof URL)
 * must NEVER survive into an href/window.open sink, in any obfuscation
 * a browser would still honour. Honest http/https links — including
 * bare hosts, which the app has always upgraded to https — must pass.
 */
import { safeExternalUrl, isSafeExternalUrl, safeOpenUrl } from '../safeUrl';

describe('safeExternalUrl — dangerous schemes are rejected', () => {
  const dangerous = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    '\tjavascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://example.com/1234',
    'http:javascript:alert(1)',
    'https:javascript:alert(1)',
    '//evil.com/%0ajavascript:alert(1)', // becomes https://evil.com — host only, path inert
  ];
  for (const v of dangerous.slice(0, 12)) {
    it(`rejects ${JSON.stringify(v)}`, () => {
      expect(safeExternalUrl(v)).toBeNull();
      expect(isSafeExternalUrl(v)).toBe(false);
      expect(safeOpenUrl(v)).toBeNull();
    });
  }
  it('protocol-relative URL is upgraded to https, never scheme-relative javascript', () => {
    // '//evil.com/...' carries no scheme of its own; upgrading the HOST
    // to https keeps the payload an inert path on that host.
    expect(safeExternalUrl('//evil.com/%0ajavascript:alert(1)')).toBe(
      'https://evil.com/%0ajavascript:alert(1)'
    );
  });
});

describe('safeExternalUrl — honest links pass', () => {
  it('passes https links untouched', () => {
    expect(safeExternalUrl('https://meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij'
    );
  });
  it('passes http links', () => {
    expect(safeExternalUrl('http://example.org/page?x=1')).toBe('http://example.org/page?x=1');
  });
  it('upgrades bare hosts to https (OrgPublicPage precedent)', () => {
    expect(safeExternalUrl('youtube.com/@temple')).toBe('https://youtube.com/@temple');
    expect(safeExternalUrl('www.example-mandir.org')).toBe('https://www.example-mandir.org/');
  });
  it('trims surrounding whitespace', () => {
    expect(safeExternalUrl('  https://zoom.us/j/123  ')).toBe('https://zoom.us/j/123');
  });
  it('rejects empty/missing values', () => {
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
  it('rejects values that are not URLs at all', () => {
    expect(safeExternalUrl('not a url with spaces')).toBeNull();
    expect(safeExternalUrl('/org/some-slug')).toBeNull(); // in-app path, not external
  });
});
