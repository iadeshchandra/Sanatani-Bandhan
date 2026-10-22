/**
 * privacyNotice.test.ts — Blueprint D, deliverable 7: the consent
 * check's stamp logic + the notice's completeness. Pinned:
 *   - an unseen user is due the prompt; a user who saw the current
 *     version is not; a version bump makes everyone due exactly
 *     once more;
 *   - "what changed" returns only the lines newer than seen;
 *   - the notice itself: all six sections authored in en/bn/hi
 *     (real translations, no fallbacks, no empty strings) — the
 *     other seven languages fall back per-key by the house pattern,
 *     pinned in blueprintDI18n.test.ts for the schema keys.
 */
import {
  PRIVACY_CHANGES,
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_VERSION,
  markPrivacySeen,
  privacyChangesSince,
  privacyPromptDue,
  privacySeenVersion,
} from '../privacyNotice';

const fakeStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe('the version stamp', () => {
  it('first run is due; acknowledging settles it; keys are per-user', () => {
    const s = fakeStorage();
    expect(privacySeenVersion('u-1', s)).toBe(0);
    expect(privacyPromptDue('u-1', s)).toBe(true);
    markPrivacySeen('u-1', PRIVACY_NOTICE_VERSION, s);
    expect(privacyPromptDue('u-1', s)).toBe(false);
    expect(privacyPromptDue('u-2', s)).toBe(true);
  });

  it('an older seen version is due again (the bump case)', () => {
    const s = fakeStorage();
    markPrivacySeen('u-1', PRIVACY_NOTICE_VERSION - 1, s);
    expect(privacyPromptDue('u-1', s)).toBe(true);
  });

  it('changes-since lists only versions newer than seen', () => {
    expect(privacyChangesSince(PRIVACY_NOTICE_VERSION)).toEqual([]);
    const since0 = privacyChangesSince(0);
    expect(since0.length).toBe(Object.keys(PRIVACY_CHANGES).length);
    expect(privacyChangesSince(PRIVACY_NOTICE_VERSION - 1)).toEqual(since0);
  });
});

describe('the notice content', () => {
  it('has the six promised sections, each authored in en/bn/hi', () => {
    expect(PRIVACY_NOTICE_SECTIONS.map((x) => x.id)).toEqual([
      'what',
      'where',
      'never-public',
      'publishing',
      'assisted',
      'choices',
    ]);
    for (const sec of PRIVACY_NOTICE_SECTIONS) {
      for (const lang of ['en', 'bn', 'hi'] as const) {
        expect(sec.title[lang].trim().length).toBeGreaterThan(2);
        expect(sec.body[lang].trim().length).toBeGreaterThan(40);
      }
      // real translations: the three bodies are not copies of each other
      expect(sec.body.bn).not.toBe(sec.body.en);
      expect(sec.body.hi).not.toBe(sec.body.en);
    }
  });

  it('the never-public section names the Personal Wallet; the assisted section names the session', () => {
    const never = PRIVACY_NOTICE_SECTIONS.find((x) => x.id === 'never-public')!;
    expect(never.body.en).toContain('Personal Wallet');
    const assisted = PRIVACY_NOTICE_SECTIONS.find((x) => x.id === 'assisted')!;
    expect(assisted.body.en).toContain('assisted session');
  });
});
