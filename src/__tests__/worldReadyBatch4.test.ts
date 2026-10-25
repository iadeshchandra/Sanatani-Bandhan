/**
 * worldReadyBatch4.test.ts — WORLD-READINESS BATCH 4 pins (the closing
 * batch of the World-Readiness programme; register Axis G remainder).
 *
 *  1. friendlyAuthError (G-E2/G-E3): EVERY Firebase auth code in the
 *     mapper renders a dictionary sentence — never the raw code, never
 *     the SDK message — in English, Hindi, Bangla and the draft
 *     languages; unknown failures collapse to the generic/network keys.
 *  2. New dictionary keys (auth.err*, surfaces.notFound,
 *     surfaces.orgDirectory) exist, non-empty, in all 10 languages,
 *     and no draft value is an English copy posing as a translation.
 *  3. Language doors (G-L3/G-L4/G-L5/G-L6/G-L9): every shell and every
 *     remaining public surface mounts the canonical PublicLanguageButton;
 *     no private language list survives in the shells.
 *  4. G-L2: the dead FirstRunLanguageGate/LanguagePicker file is gone;
 *     NativeWelcomeSheet stands designated in App.tsx.
 *  5. G-M4: the GodMode ticker no longer claims to be live telemetry.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  AUTH_ERROR_CODE_TO_KEY,
  FRIENDLY_AUTH_ERROR_KEYS,
  friendlyAuthErrorKey,
} from '../lib/friendlyAuthError';

import { core as enCore } from '../i18n/lang/en/core';
import { core as hiCore } from '../i18n/lang/hi/core';
import { core as bnCore } from '../i18n/lang/bn/core';
import { core as taCore } from '../i18n/lang/ta/core';
import { core as teCore } from '../i18n/lang/te/core';
import { core as mrCore } from '../i18n/lang/mr/core';
import { core as guCore } from '../i18n/lang/gu/core';
import { core as knCore } from '../i18n/lang/kn/core';
import { core as mlCore } from '../i18n/lang/ml/core';
import { core as saCore } from '../i18n/lang/sa/core';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

function flat(obj: any, prefix: string, out: Record<string, string>): Record<string, string> {
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const q = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, q, out);
    else if (typeof v === 'string') out[q] = v;
  }
  return out;
}

const DICTS: Record<string, Record<string, string>> = {
  en: flat(enCore, '', {}),
  hi: flat(hiCore, '', {}),
  bn: flat(bnCore, '', {}),
  ta: flat(taCore, '', {}),
  te: flat(teCore, '', {}),
  mr: flat(mrCore, '', {}),
  gu: flat(guCore, '', {}),
  kn: flat(knCore, '', {}),
  ml: flat(mlCore, '', {}),
  sa: flat(saCore, '', {}),
};
const DRAFTS = ['ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'];

const NEW_KEYS = [
  ...FRIENDLY_AUTH_ERROR_KEYS,
  'surfaces.notFound.title', 'surfaces.notFound.body',
  'surfaces.notFound.home', 'surfaces.notFound.back',
  'surfaces.orgDirectory.back', 'surfaces.orgDirectory.title',
  'surfaces.orgDirectory.subtitle', 'surfaces.orgDirectory.searchPlaceholder',
  'surfaces.orgDirectory.all', 'surfaces.orgDirectory.emptyTitle',
  'surfaces.orgDirectory.emptyHint',
];

describe('B4.1 friendlyAuthError — the mapping table', () => {
  it('every known code maps to its pinned dictionary key', () => {
    for (const [code, key] of Object.entries(AUTH_ERROR_CODE_TO_KEY)) {
      expect(friendlyAuthErrorKey({ code })).toBe(key);
      expect(friendlyAuthErrorKey(Object.assign(new Error('x'), { code }))).toBe(key);
    }
  });

  it('every mapped key renders a real sentence in en/hi/bn and every draft', () => {
    for (const key of FRIENDLY_AUTH_ERROR_KEYS) {
      for (const [lang, dict] of Object.entries(DICTS)) {
        const s = dict[key];
        expect(typeof s).toBe('string');
        expect(s.length).toBeGreaterThan(0);
        expect(s).not.toBe(key);
        expect(s).not.toContain('auth/');
        expect(s).not.toContain('Firebase');
        void lang;
      }
    }
  });

  it('a raw SDK message can never come back — unknown failures collapse', () => {
    const raw = 'Firebase: Error (auth/some-future-code).';
    const key = friendlyAuthErrorKey({ code: 'auth/some-future-code', message: raw });
    expect(key).toBe('auth.errGeneric');
    const rendered = DICTS.en[key];
    expect(rendered).not.toContain('some-future-code');
    expect(rendered).not.toContain('Firebase');
    expect(friendlyAuthErrorKey(new Error(raw))).toBe('auth.errGeneric');
    expect(friendlyAuthErrorKey(null)).toBe('auth.errGeneric');
    expect(friendlyAuthErrorKey(undefined)).toBe('auth.errGeneric');
    expect(friendlyAuthErrorKey('boom')).toBe('auth.errGeneric');
  });

  it('network failures collapse to the network sentence, not the generic one', () => {
    expect(friendlyAuthErrorKey({ code: 'auth/network-request-failed' })).toBe('auth.errNetwork');
    expect(friendlyAuthErrorKey(new Error('Failed to fetch'))).toBe('auth.errNetwork');
    expect(friendlyAuthErrorKey({ code: 'unavailable', message: 'offline' })).toBe('auth.errNetwork');
  });

  it('the suspended-account code speaks the paused-account sentence', () => {
    expect(friendlyAuthErrorKey({ code: 'auth/user-disabled' })).toBe('auth.errUserDisabled');
    expect(DICTS.en['auth.errUserDisabled']).toMatch(/paused/i);
  });
});

describe('B4.2 new dictionary keys — completeness across all 10 languages', () => {
  it('every new key exists non-empty in every language', () => {
    for (const key of NEW_KEYS) {
      for (const dict of Object.values(DICTS)) {
        expect(typeof dict[key]).toBe('string');
        expect(dict[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('no draft value is an English copy posing as a translation', () => {
    const prose = (s: string) => /[A-Za-z]/.test(s) && s.trim().split(/\s+/).length >= 3;
    for (const key of NEW_KEYS) {
      for (const code of DRAFTS) {
        if (prose(DICTS.en[key])) expect(DICTS[code][key]).not.toBe(DICTS.en[key]);
      }
    }
  });

  it('hi/bn renderings differ from English for the prose auth keys', () => {
    for (const key of FRIENDLY_AUTH_ERROR_KEYS) {
      expect(DICTS.hi[key]).not.toBe(DICTS.en[key]);
      expect(DICTS.bn[key]).not.toBe(DICTS.en[key]);
    }
  });
});

describe('B4.3 language doors — shells and public surfaces', () => {
  const DOOR_FILES: Record<string, string> = {
    'solo/SoloWorkspaceShell.tsx': 'G-L4 Solo shell',
    'components/purohit/PurohitWorkspaceShell.tsx': 'G-L5 Purohit shell',
    'jyotish/JyotishWorkspaceShell.tsx': 'G-L5 Jyotish shell',
    'components/devotee/MemberAppShell.tsx': 'G-L9 member shell (private list removed)',
    'components/common/Header.tsx': 'G-L6/G-L9 ERP header (private lists removed)',
    'pages/CampusPage.tsx': 'G-L3 Campus',
    'components/festival/FestivalEventPage.tsx': 'G-L3 Festival event',
    'components/sevaPro/SevaCatalog.tsx': 'G-L3 Seva catalog',
    'components/sevaPro/UnifiedProfessionalProfile.tsx': 'G-L3 Professional profile',
    'social/DevoteeProfile.tsx': 'G-L3 Devotee profile (/u/:uid)',
    'sangam/shorts/ShortsViewer.tsx': 'G-L3 Shorts viewer',
    'components/org/OrgDirectory.tsx': 'G-L3 Org directory',
    'pages/NotFoundPage.tsx': 'G-L8 404',
    'components/public/PortalLogin.tsx': 'G-L9 Portal login',
    'appgrowth/GetAppPage.tsx': 'G-L9 Get-App (closed by the Language Sweep — pinned so it stays closed)',
    'pages/OrgPublicPage.tsx': 'B1 org public page (already canonical — regression pin)',
    'pages/LandingPage.tsx': 'B1 landing (already canonical — regression pin)',
  };
  for (const [file, label] of Object.entries(DOOR_FILES)) {
    it(`${label}: mounts the canonical PublicLanguageButton`, () => {
      expect(read(file)).toContain('PublicLanguageButton');
    });
  }

  it('no shell keeps a private language list', () => {
    for (const file of [
      'components/devotee/MemberAppShell.tsx',
      'components/common/Header.tsx',
      'components/public/PortalLogin.tsx',
    ]) {
      expect(read(file)).not.toContain("['en', 'hi', 'bn', 'sa']");
    }
    expect(read('components/public/PortalLogin.tsx')).not.toContain('<option value="bn">');
  });

  it('OrgDirectory chrome renders through the dictionary', () => {
    const src = read('components/org/OrgDirectory.tsx');
    expect(src).toContain("surfaces.orgDirectory.title");
    expect(src).not.toContain('Find Organisations');
    expect(src).not.toContain('No organisations found');
  });

  it('NotFoundPage renders through the dictionary, no hard-coded strings', () => {
    const src = read('pages/NotFoundPage.tsx');
    expect(src).toContain("surfaces.notFound.title");
    expect(src).not.toContain('Page not found');
    expect(src).not.toContain('Go to homepage');
  });

  it('ShortsRoute honours the chosen language (was hard-wired English)', () => {
    const src = read('sangam/shorts/ShortsRoute.tsx');
    expect(src).not.toContain('lang="en"');
    expect(src).toContain('currentLang');
  });
});

describe('B4.4 auth surfaces render through the shared mapper', () => {
  const MAPPER_FILES = [
    'components/public/PortalLogin.tsx',
    'components/public/SignupCredentialsStep.tsx',
    'components/purohit/PurohitSignupForm.tsx',
    'jyotish/JyotishSignupForm.tsx',
    'solo/SoloSignupForm.tsx',
    'components/auth/GoogleSignInButton.tsx',
  ];
  for (const file of MAPPER_FILES) {
    it(`${file}: uses friendlyAuthErrorKey`, () => {
      expect(read(file)).toContain('friendlyAuthErrorKey');
    });
  }

  it('no auth surface strips-and-shows raw Firebase text any more', () => {
    for (const file of [...MAPPER_FILES, 'lib/googleAuth.ts']) {
      expect(read(file)).not.toContain("replace('Firebase:'");
    }
    expect(read('lib/googleAuth.ts')).not.toContain('googleErrorMessage');
    expect(read('components/public/PortalLogin.tsx')).not.toContain("msg.replace('Firebase:'");
  });

  it('signup forms no longer fall through to err.message', () => {
    for (const file of [
      'components/public/SignupCredentialsStep.tsx',
      'components/purohit/PurohitSignupForm.tsx',
      'jyotish/JyotishSignupForm.tsx',
    ]) {
      expect(read(file)).not.toContain('err.message ||');
    }
  });
});

describe('B4.5 G-L2 — first-run language surface designation', () => {
  it('the dead gate/picker file is deleted', () => {
    expect(fs.existsSync(path.join(SRC, 'components/public/LanguagePicker.tsx'))).toBe(false);
  });

  it('NativeWelcomeSheet stands designated in App.tsx', () => {
    const app = read('App.tsx');
    expect(app).toContain('<NativeWelcomeSheet />');
    expect(app).toContain('designated first-run language surface');
  });
});

describe('B4.6 G-M4 — GodMode ticker tells the truth', () => {
  it('the ticker labels itself a sample feed, never live telemetry', () => {
    const src = read('admin/components/ExecutiveLiveTicker.tsx');
    expect(src).toContain('SAMPLE FEED');
    expect(src).not.toContain('LIVE TELEMETRY');
    expect(src).not.toContain('Live Hundi');
    expect(src).not.toContain('100% Uptime');
  });
});
