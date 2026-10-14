import type { TranslationSchema } from '../schema';

/**
 * te — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "డాష్‌బోర్డ్",
      treasury: "ఖజానా (Treasury)",
      bhandar: "భండారం (Bhandar)",
      devotees: "భక్తుల వివరాలు",
      puja: "పూజలు & సంకల్పం",
      analytics: "విశ్లేషణలు",
      settings: "సెట్టింగులు",
      yatra: "యాత్ర రాడార్",
      polls: "సముదాయ ఓటింగ్",
      dharamshala: "ధర్మశాల",
    },
    common: {
      save: "సేవ్ చేయండి",
      cancel: "రద్దు చేయండి",
      search: "శోధించండి",
      export: "ఎగుమతి",
      download: "డౌన్‌లోడ్",
      offline: "ఆఫ్‌లైన్",
      online: "ఆన్‌లైన్",
      syncing: "సింక్ అవుతోంది",
      status: "స్థితి",
    },
    auth: {
      accessPortal: "ప్రవేశ ద్వారం",
      identity: "ఈమెయిల్, ఫోన్ లేదా ID",
      password: "పాస్‌వర్డ్ లేదా PIN నమోదు చేయండి",
      forgotPassword: "పాస్‌వర్డ్ మర్చిపోయారా?",
      portalSubtitle: "నిర్వాహకులు, సభ్యులు, పురోహితుల కోసం సురక్షిత లాగిన్",
    },
    qr: {
      expired: "ఈ QR కోడ్ గడువు ముగిసింది. కొత్తది సృష్టించండి.",
      success: "QR కోడ్ విజయవంతంగా ధృవీకరించబడింది.",
      notLoggedIn: "QR లాగిన్ కోసం ముందుగా సైన్ ఇన్ చేయండి.",
      offline: "ధృవీకరించలేకపోయాం. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
    },
    reg: {
      desc: "మీ సంస్థ సంక్షిప్త వివరణ",
      step1: "దశ 1 — సంస్థ వివరాలు",
      step2: "దశ 2 — మీ వివరాలు",
      orgName: "సంస్థ పేరు",
      orgType: "సంస్థ రకం",
      yourName: "మీ పూర్తి పేరు",
      yourPhone: "మీ ఫోన్ నంబర్",
      officialEmail: "అధికారిక ఈమెయిల్",
      warningTitle: "ముందుకు వెళ్లే ముందు",
      warningDesc1: "మీరు ఒక ",
      warningDesc2: " వర్క్‌స్పేస్ సృష్టిస్తున్నారు. డెమో డేటా పరిచయం కోసం మాత్రమే.",
    },
    actions: {
      cancel: "రద్దు చేయండి",
      createDynamic: "{X} వర్క్‌స్పేస్ సృష్టించండి",
      deleteRecord: "తొలగించు",
    },
  };

export default dict;
