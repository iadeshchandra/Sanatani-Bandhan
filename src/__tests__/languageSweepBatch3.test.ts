/**
 * languageSweepBatch3.test.ts — LANGUAGE COMPLETION SWEEP Batch 3 pins
 * (the closing batch of the sweep).
 *
 *  1. DRAFT COMPLETENESS: the seven draft dictionaries (ta/te/mr/gu/kn/ml/sa)
 *     now carry EVERY key the English dictionary carries (canonical schema
 *     keys + the runtime/surfaces keys), and no prose string is left as an
 *     English copy posing as a translation — except the named stays:
 *     the 3 documented by-nature strings (spec line, placeholder pattern,
 *     TouchID/FaceID brand pair) and the 5 rule-4 keeps where hi AND bn
 *     both kept English (flag/code + acronym/brand labels).
 *
 *  2. TOAST TEMPLATES: the 44 Batch-3 toast keys exist in all 10 languages
 *     with placeholder sets identical to English, and the wired desks call
 *     them (template-literal toasts must not come back).
 *
 *  3. REGIONAL TERMS: rt() consumption — the festival-of-lights resolves
 *     per region (Deepavali in Tamil Nadu, Diwali in the Hindi belt) and
 *     the named surfaces route through rt().
 *
 *  4. LOCALE: dates/times/numbers format in the user's CHOSEN language
 *     (appLocale), never the device locale; money keeps 'en-IN'.
 *
 *  5. CRISIS: a crisis phrase in each of the 10 languages triggers the
 *     SOS detector (Batch 3 extended the keyword tables to the drafts).
 */
import * as fs from 'fs';
import * as path from 'path';

import { core as enCore } from '../i18n/lang/en/core';
import { professional as enPro } from '../i18n/lang/en/professional';
import { devoteeNs as enDev } from '../i18n/lang/en/devotee';
import { orgNs as enOrg } from '../i18n/lang/en/org';
import { ritual as enRit } from '../i18n/lang/en/ritual';
import { suites as enSuites } from '../i18n/lang/en/suites';

import { core as taCore } from '../i18n/lang/ta/core';
import { professional as taPro } from '../i18n/lang/ta/professional';
import { devoteeNs as taDev } from '../i18n/lang/ta/devotee';
import { orgNs as taOrg } from '../i18n/lang/ta/org';
import { ritual as taRit } from '../i18n/lang/ta/ritual';
import { suites as taSuites } from '../i18n/lang/ta/suites';
import { core as teCore } from '../i18n/lang/te/core';
import { professional as tePro } from '../i18n/lang/te/professional';
import { devoteeNs as teDev } from '../i18n/lang/te/devotee';
import { orgNs as teOrg } from '../i18n/lang/te/org';
import { ritual as teRit } from '../i18n/lang/te/ritual';
import { suites as teSuites } from '../i18n/lang/te/suites';
import { core as mrCore } from '../i18n/lang/mr/core';
import { professional as mrPro } from '../i18n/lang/mr/professional';
import { devoteeNs as mrDev } from '../i18n/lang/mr/devotee';
import { orgNs as mrOrg } from '../i18n/lang/mr/org';
import { ritual as mrRit } from '../i18n/lang/mr/ritual';
import { suites as mrSuites } from '../i18n/lang/mr/suites';
import { core as guCore } from '../i18n/lang/gu/core';
import { professional as guPro } from '../i18n/lang/gu/professional';
import { devoteeNs as guDev } from '../i18n/lang/gu/devotee';
import { orgNs as guOrg } from '../i18n/lang/gu/org';
import { ritual as guRit } from '../i18n/lang/gu/ritual';
import { suites as guSuites } from '../i18n/lang/gu/suites';
import { core as knCore } from '../i18n/lang/kn/core';
import { professional as knPro } from '../i18n/lang/kn/professional';
import { devoteeNs as knDev } from '../i18n/lang/kn/devotee';
import { orgNs as knOrg } from '../i18n/lang/kn/org';
import { ritual as knRit } from '../i18n/lang/kn/ritual';
import { suites as knSuites } from '../i18n/lang/kn/suites';
import { core as mlCore } from '../i18n/lang/ml/core';
import { professional as mlPro } from '../i18n/lang/ml/professional';
import { devoteeNs as mlDev } from '../i18n/lang/ml/devotee';
import { orgNs as mlOrg } from '../i18n/lang/ml/org';
import { ritual as mlRit } from '../i18n/lang/ml/ritual';
import { suites as mlSuites } from '../i18n/lang/ml/suites';
import { core as saCore } from '../i18n/lang/sa/core';
import { professional as saPro } from '../i18n/lang/sa/professional';
import { devoteeNs as saDev } from '../i18n/lang/sa/devotee';
import { orgNs as saOrg } from '../i18n/lang/sa/org';
import { ritual as saRit } from '../i18n/lang/sa/ritual';
import { suites as saSuites } from '../i18n/lang/sa/suites';

import { regionalTerm, isFestivalOfLightsName } from '../i18n/regionalTerms';
import { detectCrisis, CRISIS_KEYWORDS } from '../ai/crisisKeywords';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

function deepMerge(target: Record<string, any>, ...sources: Record<string, any>[]): Record<string, any> {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const key of Object.keys(src)) {
      const v = src[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const ex = target[key];
        target[key] = deepMerge(ex && typeof ex === 'object' && !Array.isArray(ex) ? ex : {}, v);
      } else target[key] = v;
    }
  }
  return target;
}
function flat(obj: any, prefix: string, out: Record<string, string>): Record<string, string> {
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const q = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, q, out);
    else if (typeof v === 'string') out[q] = v;
  }
  return out;
}
const mergeLang = (c: any, p: any, d: any, o: any, r: any, s: any) =>
  flat(deepMerge({}, c, p, d, o, r, { suites: s }), '', {});

const EN = mergeLang(enCore, enPro, enDev, enOrg, enRit, enSuites);
const DRAFTS: Record<string, Record<string, string>> = {
  ta: mergeLang(taCore, taPro, taDev, taOrg, taRit, taSuites),
  te: mergeLang(teCore, tePro, teDev, teOrg, teRit, teSuites),
  mr: mergeLang(mrCore, mrPro, mrDev, mrOrg, mrRit, mrSuites),
  gu: mergeLang(guCore, guPro, guDev, guOrg, guRit, guSuites),
  kn: mergeLang(knCore, knPro, knDev, knOrg, knRit, knSuites),
  ml: mergeLang(mlCore, mlPro, mlDev, mlOrg, mlRit, mlSuites),
  sa: mergeLang(saCore, saPro, saDev, saOrg, saRit, saSuites),
};

const prose = (s: string) => /[A-Za-z]/.test(s) && s.trim().split(/\s+/).length >= 3;
/** Identical-to-English is legitimate ONLY for these keys (see header). */
const ALLOWED_IDENTICAL = new Set([
  'org.people.darshanCheckin.fps60BullHd1080p', // spec line — no prose
  'suites.pathshala.shishya.promoteConfirm', // placeholders only
  'org.finance.ratnaBhandar.touchidFaceid', // brand pair
  'solo.wallet.regionBD', // flag + code label
  'org.access.payment.upiId', // acronym label
  'surfaces.help.whatsappBroadcaster', // product name
  'surfaces.devoteePortal.80gPdf', // acronym label
  'surfaces.vahanFleet.rtoRc', // acronym label
]);

describe('B3.1 draft dictionaries are complete — no English copies posing as translations', () => {
  for (const [code, dict] of Object.entries(DRAFTS)) {
    test(`${code}: every English key is present`, () => {
      const missing = Object.keys(EN).filter((k) => typeof dict[k] !== 'string' || dict[k].length === 0);
      expect(missing).toEqual([]);
    });
    test(`${code}: no prose string is an English copy (beyond the named stays)`, () => {
      const copies = Object.keys(EN).filter(
        (k) => dict[k] === EN[k] && prose(EN[k]) && !ALLOWED_IDENTICAL.has(k)
      );
      expect(copies).toEqual([]);
    });
  }
});

const TOAST_KEYS = [
  'surfaces.ashram.toastRoomAllocated', 'surfaces.ashram.toastRoomStatusUpdated',
  'surfaces.ashram.toastRoomAdded', 'surfaces.ashram.toastCowRegistered',
  'surfaces.devoteePortal.toastReceipt80g', 'surfaces.devoteePortal.toastSankalpaSlip',
  'surfaces.devoteePortal.toastGpsFailed', 'surfaces.devoteePortal.toastNightMode',
  'surfaces.devoteePortal.toastSolarMode', 'surfaces.devoteePortal.toastSoundOn',
  'surfaces.devoteePortal.toastSoundOff', 'surfaces.devoteePortal.toastSwitchedConsole',
  'surfaces.devoteePortal.toastHeadConsoleMode', 'surfaces.devoteePortal.toastDhyanaLogged',
  'surfaces.devoteePortal.toastPindaDaan', 'surfaces.devoteePortal.toastLanguageSet',
  'surfaces.smartBhandar.toastPoDraftFor', 'surfaces.smartBhandar.toastHeadPoDrafted',
  'surfaces.smartBhandar.toastPoDispatched', 'surfaces.smartBhandar.toastHeadPoSent',
  'surfaces.smartBhandar.toastCatalogRegistered', 'surfaces.smartBhandar.toastPoDraftCreated',
  'surfaces.familyRoots.toastMemberAddedTree', 'surfaces.familyRoots.toastHeadFamilyLineage',
  'surfaces.familyRoots.toastAlreadyRegistered', 'surfaces.familyRoots.toastAncestorAdded',
  'surfaces.purohitMgmt.toastPriestRegistered', 'surfaces.purohitMgmt.toastHeadPriestEnrolled',
  'surfaces.purohitMgmt.toastPriestAssigned', 'surfaces.purohitMgmt.toastHeadPriestAssigned',
  'surfaces.purohitMgmt.toastRosterUpdated', 'surfaces.purohitMgmt.toastDakshinaDisbursed',
  'surfaces.purohitMgmt.toastHeadHonorariumSettled',
  'surfaces.personalAccount.toastCopied', 'surfaces.personalAccount.toastSwitchedBack',
  'surfaces.personalAccount.toastHeadModeChanged', 'surfaces.personalAccount.toastCertDownloaded',
  'surfaces.personalAccount.toastLanguageSet',
  'surfaces.vahanFleet.toastOdometerMin', 'surfaces.vahanFleet.toastHeadFuelLog',
  'surfaces.vahanFleet.toastVehiclesExported', 'surfaces.vahanFleet.toastHeadCsvExport',
  'surfaces.portalLogin.toastWelcomeId', 'surfaces.portalLogin.toastGoogleLinked',
];
const placeholders = (s: string) => (s.match(/\{[^}]+\}/g) || []).sort();

describe('B3.2 toast template keys — all 10 languages, placeholders identical', () => {
  for (const key of TOAST_KEYS) {
    test(`${key}: present everywhere with en placeholders`, () => {
      expect(typeof EN[key]).toBe('string');
      for (const dict of Object.values(DRAFTS)) {
        expect(typeof dict[key]).toBe('string');
        expect(placeholders(dict[key])).toEqual(placeholders(EN[key]));
      }
    });
  }
  test('wired desks call the template keys (no template-literal toasts left)', () => {
    const sites: Record<string, string> = {
      'components/domain4/AshramGoshalaGurukulDesk.tsx': 'surfaces.ashram.toastRoomAllocated',
      'components/domain5/DevoteeAccountPortal.tsx': 'surfaces.devoteePortal.toastReceipt80g',
      'components/domain4/SmartBhandarProcurementDesk.tsx': 'surfaces.smartBhandar.toastPoDispatched',
      'components/domain6/FamilyRootsMatrimonyDesk.tsx': 'surfaces.familyRoots.toastAncestorAdded',
      'components/domain3/PurohitManagementDesk.tsx': 'surfaces.purohitMgmt.toastDakshinaDisbursed',
      'components/account/PersonalAccountDesk.tsx': 'surfaces.personalAccount.toastCopied',
      'components/domain2/VahanFleetDesk.tsx': 'surfaces.vahanFleet.toastOdometerMin',
      'components/public/PortalLogin.tsx': 'surfaces.portalLogin.toastWelcomeId',
    };
    for (const [file, key] of Object.entries(sites)) expect(read(file)).toContain(key);
  });
});

describe('B3.3 regional-term adoption', () => {
  test('festival of lights follows the region for English UI', () => {
    expect(regionalTerm('festivalOfLights', 'en', 'tamil-nadu')).toBe('Deepavali');
    expect(regionalTerm('festivalOfLights', 'en', 'karnataka')).toBe('Deepavali');
    expect(regionalTerm('festivalOfLights', 'en', 'hindi-belt')).toBe('Diwali');
    expect(regionalTerm('temple', 'en', 'tamil-nadu')).toBe('kovil');
    expect(regionalTerm('temple', 'en', 'kerala')).toBe('kshetram');
  });
  test('isFestivalOfLightsName matches only the principal festival', () => {
    expect(isFestivalOfLightsName('Diwali')).toBe(true);
    expect(isFestivalOfLightsName('Deepavali')).toBe(true);
    expect(isFestivalOfLightsName('Dhanteras')).toBe(false);
    expect(isFestivalOfLightsName('Kali Puja')).toBe(false);
  });
  test('named surfaces route through rt()', () => {
    expect(read('components/common/PanchangHeader.tsx')).toContain("rt('festivalOfLights')");
    expect(read('solo/PanjikaTab.tsx')).toContain("rt('festivalOfLights')");
    expect(read('components/dashboard/FestivalJourneyCard.tsx')).toContain("rt('festivalOfLights')");
    expect(read('pages/OrgPublicPage.tsx')).toContain("rt('temple')");
    expect(read('solo/SoloHome.tsx')).toContain("rt('temple')");
  });
});

describe('B3.4 locale formats follow the chosen language; money keeps en-IN', () => {
  test('appLocale reads the persisted app language', () => {
    const fmt = read('lib/format.ts');
    expect(fmt).toContain('export function appLocale()');
    expect(fmt).toContain("'sb-lang'");
  });
  test('former device-locale leaks now pass appLocale()', () => {
    for (const f of ['utils/pdfGenerator.ts', 'components/domain1/DevoteeGrid.tsx', 'crisis/crisisFormat.ts']) {
      expect(read(f)).toContain('appLocale()');
    }
    // DataContext's only locale sites are money — they keep 'en-IN'
    expect(read('context/DataContext.tsx')).toContain("toLocaleString('en-IN')");
    // money in the PDF generator keeps the en-IN lakh/crore convention
    expect(read('utils/pdfGenerator.ts')).toContain("toLocaleString('en-IN')");
  });
});

describe('B3.5 crisis detection covers all 10 languages', () => {
  const PHRASES: Record<string, string> = {
    en: 'this is an emergency',
    hi: 'मुझे बचाओ',
    bn: 'আমাকে বাঁচান',
    ta: 'தற்கொலை',
    te: 'ఆత్మహత్య',
    mr: 'मला मरायचे आहे',
    gu: 'આત્મહત્યા',
    kn: 'ಆತ್ಮಹತ್ಯೆ',
    ml: 'ആത്മഹത്യ',
    sa: 'मां रक्षतु',
  };
  for (const [code, phrase] of Object.entries(PHRASES)) {
    test(`${code}: "${phrase}" triggers SOS`, () => {
      const hit = detectCrisis(phrase);
      expect(hit).not.toBeNull();
      expect(hit?.lang).toBe(code);
    });
  }
  test('every language table carries a real keyword set', () => {
    for (const code of Object.keys(PHRASES)) {
      expect((CRISIS_KEYWORDS as Record<string, string[]>)[code]?.length).toBeGreaterThanOrEqual(14);
    }
  });
  test('a word shared by hi/mr/sa (आत्महत्या) still triggers SOS', () => {
    // The same Devanagari word exists in all three tables; detection fires
    // (first-match language attribution is fine — the SOS path is what matters).
    expect(detectCrisis('आत्महत्या')).not.toBeNull();
  });
  test('procedural help is still not a crisis', () => {
    expect(detectCrisis('help me with dana')).toBeNull();
  });
});
