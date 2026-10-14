import type { TranslationSchema } from '../schema';

/**
 * ml — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "ഡാഷ്‌ബോർഡ്",
      treasury: "ഖജനാവ് (Treasury)",
      bhandar: "ഭണ്ഡാരം (Bhandar)",
      devotees: "ഭക്തർ",
      puja: "പൂജ & സങ്കല്പം",
      analytics: "വിശകലനം",
      settings: "ക്രമീകരണങ്ങൾ",
      yatra: "യാത്രാ റഡാർ",
      polls: "സമുദായ വോട്ടെടുപ്പ്",
      dharamshala: "ധർമ്മശാല",
    },
    common: {
      save: "സംരക്ഷിക്കുക",
      cancel: "റദ്ദാക്കുക",
      search: "തിരയുക",
      export: "കയറ്റുമതി",
      download: "ഡൗൺലോഡ്",
      offline: "ഓഫ്‌ലൈൻ",
      online: "ഓൺലൈൻ",
      syncing: "സിങ്ക് ചെയ്യുന്നു",
      status: "അവസ്ഥ",
    },
    auth: {
      accessPortal: "പ്രവേശന കവാടം",
      identity: "ഇമെയിൽ, ഫോൺ അല്ലെങ്കിൽ ID",
      password: "പാസ്‌വേഡ് അല്ലെങ്കിൽ PIN നൽകുക",
      forgotPassword: "പാസ്‌വേഡ് മറന്നോ?",
      portalSubtitle: "അഡ്മിൻമാർ, അംഗങ്ങൾ, പുരോഹിതന്മാർ എന്നിവർക്കുള്ള സുരക്ഷിത ലോഗിൻ",
    },
    qr: {
      expired: "ഈ QR കോഡിന്റെ കാലാവധി കഴിഞ്ഞു. പുതിയത് ഉണ്ടാക്കുക.",
      success: "QR കോഡ് വിജയകരമായി പരിശോധിച്ചു.",
      notLoggedIn: "QR ലോഗിന് ആദ്യം സൈൻ ഇൻ ചെയ്യുക.",
      offline: "പരിശോധിക്കാനായില്ല. കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.",
    },
    reg: {
      desc: "നിങ്ങളുടെ സ്ഥാപനത്തിന്റെ ലഘു വിവരണം",
      step1: "ഘട്ടം 1 — സ്ഥാപന വിവരങ്ങൾ",
      step2: "ഘട്ടം 2 — നിങ്ങളുടെ വിവരങ്ങൾ",
      orgName: "സ്ഥാപനത്തിന്റെ പേര്",
      orgType: "സ്ഥാപന തരം",
      yourName: "നിങ്ങളുടെ മുഴുവൻ പേര്",
      yourPhone: "നിങ്ങളുടെ ഫോൺ നമ്പർ",
      officialEmail: "ഔദ്യോഗിക ഇമെയിൽ",
      warningTitle: "തുടരുന്നതിന് മുമ്പ്",
      warningDesc1: "നിങ്ങൾ ഒരു ",
      warningDesc2: " വർക്ക്‌സ്‌പേസ് ഉണ്ടാക്കുകയാണ്. ഡെമോ ഡാറ്റ പരിചയത്തിന് മാത്രം.",
    },
    actions: {
      cancel: "റദ്ദാക്കുക",
      createDynamic: "{X} വർക്ക്‌സ്‌പേസ് ഉണ്ടാക്കുക",
      deleteRecord: "നീക്കം ചെയ്യുക",
    },
  };

export default dict;
