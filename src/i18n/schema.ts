/**
 * Sanatani Bandhan — i18n Translation Schema (Phase 1)
 *
 * Single source of truth for the shape of every language dictionary.
 * Per-language files in src/i18n/lang/ must satisfy this interface.
 * Extend sections here when new UI areas need translation coverage.
 */

export interface TranslationSchema {
  nav: {
    dashboard: string;
    treasury: string;
    bhandar: string;
    devotees: string;
    puja: string;
    analytics: string;
    settings: string;
    yatra: string;
    polls: string;
    dharamshala: string;
  };
  common: {
    save: string;
    cancel: string;
    search: string;
    export: string;
    download: string;
    offline: string;
    online: string;
    syncing: string;
    status: string;
    back: string;
  };
  auth: {
    accessPortal: string;
    identity: string;
    password: string;
    forgotPassword: string;
    portalSubtitle: string;
    signinTitle: string;
    signinSub: string;
    signupTitle: string;
    signupSub: string;
    registerTitle: string;
    registerSub: string;
    signinDoor: string;
    signupDoor: string;
    signinHint: string;
    signupHint: string;
    creatingAccount: string;
    signingIn: string;
    secureNote: string;
    trustOffline: string;
    trustData: string;
    trustNoAds: string;
    biometricTitle: string;
    biometricDesc: string;
    biometricButton: string;
    biometricNote: string;
    biometricFailed: string;
    qrLogin: string;
    scanPass: string;
    alignQr: string;
    closeScanner: string;
    cameraDenied: string;
    orUseCredentials: string;
    googleExpired: string;
    googleMismatch: string;
    sessionExpired: string;
    internetRequired: string;
    resetPasswordInternet: string;
    resetLinkSent: string;
    enterAdminEmail: string;
    completeLocation: string;
    fillRequired: string;
    loginSuccess: string;
    identityReconfirmed: string;
    workspaceProvisioned: string;
    masterPinVerified: string;
    language: string;
    offlineMode: string;
    close: string;
    scanId: string;
    togglePassword: string;
    useManualPassword: string;
    reconfirm: string;
    locationDetails: string;
    country: string;
    selectCountry: string;
  };
  qr: {
    expired: string;
    success: string;
    notLoggedIn: string;
    offline: string;
  };
  reg: {
    desc: string;
    step1: string;
    step2: string;
    orgName: string;
    orgType: string;
    yourName: string;
    yourPhone: string;
    officialEmail: string;
    warningTitle: string;
    warningDesc1: string;
    warningDesc2: string;
    unifiedNote: string;
  };
  actions: {
    cancel: string;
    createDynamic: string; // {X} is replaced with the org type at runtime
    deleteRecord: string;
  };
  solo: {
    minting: string;
    tabs: {
      home: string;
      sangam: string;
      sadhana: string;
      panchang: string;
      saved: string;
      giving: string;
      jyotish: string;
      marketplace: string;
      wallet: string;
      samskara: string;
      profile: string;
    };
    switchWorkspace: string;
    signOut: string;
    orgView: string;
    mySpace: string;
    switchedToOrg: string;
    switchedToPurohit: string;
    switchedToJyotish: string;
    noPurohitIdentity: string;
    noJyotishIdentity: string;
    wallet: {
      history: string;
      topUpRequests: string;
      rejectedTopUps: string;
      paymentQr: string;
      chooseMethod: string;
      enterAmount: string;
      enterTrxId: string;
      correctTrxId: string;
      trxIdHint: string;
      copyReference: string;
      yourReference: string;
      newReference: string;
      includeReference: string;
      sendExactly: string;
      editTopUp: string;
      topUpUpdated: string;
      creditedNote: string;
    };
    signup: {
      title: string;
      yourName: string;
      namePlaceholder: string;
      phone: string;
      phonePlaceholder: string;
      email: string;
      emailPlaceholder: string;
      city: string;
      cityPlaceholder: string;
      gotra: string;
      gotraPlaceholder: string;
      password: string;
      passwordHint: string;
      passwordTooShort: string;
      sanataniIdNote: string;
      googleExpired: string;
    };
    sadhana: {
      custom: string;
      observed: string;
    };
  };
}

/**
 * Metadata for a supported display language.
 */
export interface SupportedLanguage {
  /** Internal code, e.g. 'hi'. */
  code: string;
  /** Native-script display name, e.g. 'हिन्दी'. Shown in the language picker. */
  nativeName: string;
  /** English name, e.g. 'Hindi'. */
  englishName: string;
  /** BCP-47 tag for Intl APIs and the <html lang> attribute. */
  bcp47: string;
  /** Script identifier for font-stack selection. */
  script: 'latin' | 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam';
}

/**
 * Tier 1 must-have languages — covers ~85% of India's non-English
 * internet users. Tier 2 (odia, pa, as) deferred to Phase 3.
 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', bcp47: 'en', script: 'latin' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', bcp47: 'hi', script: 'devanagari' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', bcp47: 'bn', script: 'bengali' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', bcp47: 'ta', script: 'tamil' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', bcp47: 'te', script: 'telugu' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', bcp47: 'mr', script: 'devanagari' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', bcp47: 'gu', script: 'gujarati' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', bcp47: 'kn', script: 'kannada' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', bcp47: 'ml', script: 'malayalam' },
  { code: 'sa', nativeName: 'संस्कृतम्', englishName: 'Sanskrit', bcp47: 'sa', script: 'devanagari' },
];

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

/** BCP-47 tag for a language code (falls back to 'en'). */
export function bcp47For(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.bcp47 ?? 'en';
}
