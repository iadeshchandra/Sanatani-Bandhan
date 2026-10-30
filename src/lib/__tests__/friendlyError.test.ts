/**
 * friendlyError.test.ts — Error-Polish batch (register G-E4/G-E5) pins.
 *
 * The defect class: outside the auth surfaces (closed by G-E2/G-E3 via
 * friendlyAuthError), a caught failure could still render its RAW SDK
 * text — a toast reading "FirebaseError: Missing or insufficient
 * permissions", an alert carrying err.message, a banner printing an
 * exception string. The cure is ONE shared mapper (lib/friendlyError)
 * feeding a small dictionary key set (`errors.*` ×10 languages), wired
 * at every display site in this batch.
 *
 * This suite pins:
 *  1. the mapper's code table, prefix stripping, auth delegation,
 *     message hints and context fallbacks;
 *  2. key completeness — every one of the 10 keys exists as a real
 *     string in all 10 languages, in BOTH dictionary assemblies
 *     (lang/<code>/core.ts fragments and lang/<code>.ts monoliths),
 *     and no non-English dictionary quietly holds the English sentence;
 *  3. the guard — the raw-display shapes this batch removed cannot
 *     reappear in src UI code outside the justified allowlist below.
 *
 * Allowlist (file-level, each entry justified):
 *  - lib/friendlyError.ts / lib/friendlyAuthError.ts — the mappers
 *    themselves; reading err.message is their whole job.
 *  - components/dev/PersonaSwitcher.tsx — a dev-only diagnostic tool;
 *    raw output is its purpose and it never ships to devotees.
 *  - crisis/SOSConfirm.tsx — the caught value is stored as a state
 *    FLAG; its render maps every value to authored copy ('auth-required'
 *    → its sentence, anything else → the authored could-not-send line).
 *    The raw text never reaches JSX there.
 * Line-level logic uses (string matching, classification, console.*,
 * diagnostic stores) are NOT display and are out of this guard's scope
 * by construction: the patterns require a UI sink on the same line.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  ERROR_CODE_TO_KEY,
  FRIENDLY_ERROR_KEYS,
  friendlyError,
  friendlyErrorKey,
  friendlyErrorText,
} from '../friendlyError';

import { core as enCore } from '../../i18n/lang/en/core';
import { core as hiCore } from '../../i18n/lang/hi/core';
import { core as bnCore } from '../../i18n/lang/bn/core';
import { core as saCore } from '../../i18n/lang/sa/core';
import { core as taCore } from '../../i18n/lang/ta/core';
import { core as teCore } from '../../i18n/lang/te/core';
import { core as mrCore } from '../../i18n/lang/mr/core';
import { core as guCore } from '../../i18n/lang/gu/core';
import { core as knCore } from '../../i18n/lang/kn/core';
import { core as mlCore } from '../../i18n/lang/ml/core';

import { loadLanguageDict } from '../../i18n/translations';

import enDict from '../../i18n/lang/en';
import hiDict from '../../i18n/lang/hi';
import bnDict from '../../i18n/lang/bn';
import saDict from '../../i18n/lang/sa';
import taDict from '../../i18n/lang/ta';
import teDict from '../../i18n/lang/te';
import mrDict from '../../i18n/lang/mr';
import guDict from '../../i18n/lang/gu';
import knDict from '../../i18n/lang/kn';
import mlDict from '../../i18n/lang/ml';

const CORES: Record<string, any> = {
  en: enCore, hi: hiCore, bn: bnCore, sa: saCore, ta: taCore,
  te: teCore, mr: mrCore, gu: guCore, kn: knCore, ml: mlCore,
};
const DICTS: Record<string, any> = {
  en: enDict, hi: hiDict, bn: bnDict, sa: saDict, ta: taDict,
  te: teDict, mr: mrDict, gu: guDict, kn: knDict, ml: mlDict,
};
const LANGS = Object.keys(CORES);
const ERROR_FIELDS = [
  'saveFailed', 'loadFailed', 'network', 'permission', 'notFound',
  'conflict', 'quota', 'sessionExpired', 'generic', 'tryAgain',
];

describe('friendlyErrorKey — the code table', () => {
  it('maps every Firestore/Functions code in the table', () => {
    for (const [code, key] of Object.entries(ERROR_CODE_TO_KEY)) {
      expect(friendlyErrorKey({ code })).toBe(key);
    }
  });

  it('strips a service prefix before matching (functions/…)', () => {
    expect(friendlyErrorKey({ code: 'functions/permission-denied' })).toBe('errors.permission');
    expect(friendlyErrorKey({ code: 'functions/not-found' })).toBe('errors.notFound');
  });

  it('delegates auth-shaped failures to the friendlyAuthError table', () => {
    expect(friendlyErrorKey({ code: 'auth/wrong-password' })).toBe('auth.errInvalidCredential');
    expect(friendlyErrorKey({ code: 'auth/network-request-failed' })).toBe('auth.errNetwork');
    expect(friendlyErrorKey({ code: 'auth/too-many-requests' })).toBe('auth.errTooManyRequests');
  });

  it('reads network shape from the message when there is no code', () => {
    expect(friendlyErrorKey(new Error('Failed to fetch'))).toBe('errors.network');
    expect(friendlyErrorKey(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('errors.network');
    expect(friendlyErrorKey({ name: 'AbortError' })).toBe('errors.network');
  });

  it('reads permission shape from a bare message string', () => {
    expect(friendlyErrorKey('Missing or insufficient permissions.')).toBe('errors.permission');
    expect(
      friendlyErrorKey(new Error('FirebaseError: Missing or insufficient permissions')),
    ).toBe('errors.permission');
  });

  it('falls back by context, and never returns raw text', () => {
    expect(friendlyErrorKey(new Error('weird internals'))).toBe('errors.generic');
    expect(friendlyErrorKey(new Error('weird internals'), 'save')).toBe('errors.saveFailed');
    expect(friendlyErrorKey(new Error('weird internals'), 'load')).toBe('errors.loadFailed');
    expect(friendlyErrorKey(null)).toBe('errors.generic');
    expect(friendlyErrorKey(undefined, 'save')).toBe('errors.saveFailed');
    expect(friendlyErrorKey(42)).toBe('errors.generic');
  });

  it('friendlyError translates through the supplied t', () => {
    const t = (k: string) => `[${k}]`;
    expect(friendlyError({ code: 'permission-denied' }, t)).toBe('[errors.permission]');
  });

  it('friendlyErrorText resolves real dictionary sentences', async () => {
    // The provider loads non-en dictionaries before rendering; mirror it.
    await loadLanguageDict('bn');
    await loadLanguageDict('hi');
    expect(friendlyErrorText({ code: 'permission-denied' }, 'en')).toBe(enCore.errors.permission);
    expect(friendlyErrorText({ code: 'permission-denied' }, 'bn')).toBe(bnCore.errors.permission);
    expect(friendlyErrorText({ code: 'permission-denied' }, 'xx')).toBe(enCore.errors.permission);
    expect(friendlyErrorText(new Error('???'), 'en')).toBe(enCore.errors.generic);
    expect(friendlyErrorText(new Error('???'), 'hi', 'save')).toBe(hiCore.errors.saveFailed);
  });
});

describe('errors.* — completeness in both dictionary assemblies ×10 languages', () => {
  it('the exported key list is exactly the 10 dotted keys', () => {
    expect([...FRIENDLY_ERROR_KEYS].sort()).toEqual(
      ERROR_FIELDS.map((f) => `errors.${f}`).sort(),
    );
  });

  for (const lang of LANGS) {
    it(`${lang}: fragment core carries all 10 keys as real strings`, () => {
      for (const f of ERROR_FIELDS) {
        const v = CORES[lang]?.errors?.[f];
        expect(typeof v).toBe('string');
        expect((v as string).length).toBeGreaterThan(0);
      }
    });

    it(`${lang}: monolith dict carries all 10 keys as real strings`, () => {
      for (const f of ERROR_FIELDS) {
        const v = DICTS[lang]?.errors?.[f];
        expect(typeof v).toBe('string');
        expect((v as string).length).toBeGreaterThan(0);
      }
    });

    if (lang !== 'en') {
      it(`${lang}: no field is a copy of the English sentence`, () => {
        for (const f of ERROR_FIELDS) {
          expect(CORES[lang].errors[f]).not.toBe(enCore.errors[f as keyof typeof enCore.errors]);
          expect(DICTS[lang].errors[f]).not.toBe(enDict.errors[f as keyof typeof enDict.errors]);
        }
      });
    }
  }
});

describe('guard — raw error text cannot reach a UI sink again', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const ALLOWLIST = new Set([
    'src/lib/friendlyError.ts',
    'src/lib/friendlyAuthError.ts',
    'src/components/dev/PersonaSwitcher.tsx',
    'src/crisis/SOSConfirm.tsx',
  ]);
  const SINK =
    /(showToast|showToastMsg|alert|setError|setFormError|setLoadError|setUploadError|setSubmitError|setStatus)\s*\(/;
  const RAW = /(err|error|e\d?)\??\.message/;

  function walkSrc(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkSrc(full, out);
      else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
    }
  }

  it('no line hands a raw .message to a toast / alert / error setter', () => {
    const files: string[] = [];
    walkSrc(path.join(root, 'src'), files);
    const offenders: string[] = [];
    for (const f of files) {
      const rel = path.relative(root, f).split(path.sep).join('/');
      if (ALLOWLIST.has(rel)) continue;
      const lines = fs.readFileSync(f, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        if (SINK.test(line) && RAW.test(line)) offenders.push(`${rel}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the persisted approvals error renders through the mapper, not raw', () => {
    const panel = fs.readFileSync(
      path.join(root, 'src/components/org/ApprovalsPanel.tsx'),
      'utf-8',
    );
    expect(panel).toContain('friendlyError(r.applyError, t)');
    expect(panel).not.toContain('{r.applyError}');
  });

  it('platformAdmins failures carry their SDK code for friendly phrasing', () => {
    const svc = fs.readFileSync(path.join(root, 'src/lib/platformAdmins.ts'), 'utf-8');
    expect(svc.match(/code: e\?\.code \|\| ''/g)).toHaveLength(3);
  });

  it('the crash boundary renders the friendly sentence, never the raw message', () => {
    const boundary = fs.readFileSync(
      path.join(root, 'src/components/common/ErrorBoundary.tsx'),
      'utf-8',
    );
    expect(boundary).toContain('friendlyErrorText');
    expect(boundary).not.toContain('this.state.error?.message');
  });
});
