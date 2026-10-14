import type { TranslationSchema } from '../schema';

/**
 * hi — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "डैशबोर्ड",
      treasury: "कोषागार (Treasury)",
      bhandar: "भंडार (Inventory)",
      devotees: "भक्त नामावली (Devotees)",
      puja: "पूजा एवं संकल्प",
      analytics: "वैश्विक विश्लेषण",
      settings: "व्यवस्था (Settings)",
      yatra: "यात्रा रडार (YatraNet)",
      polls: "सामुदायिक मतदान",
      dharamshala: "धर्मशाला",
    },
    common: {
      save: "सहेजें",
      cancel: "रद्द करें",
      search: "खोजें",
      export: "निर्यात",
      download: "डाउनलोड",
      offline: "ऑफलाइन",
      online: "ऑनलाइन",
      syncing: "सिंक हो रहा है",
      status: "स्थिति",
    },
    auth: {
      accessPortal: "प्रवेश द्वार",
      identity: "ईमेल, फ़ोन या ID",
      password: "पासवर्ड या PIN दर्ज करें",
      forgotPassword: "पासवर्ड भूल गए?",
      portalSubtitle: "प्रशासकों, सदस्यों और पुरोहितों के लिए सुरक्षित लॉगिन",
    },
    qr: {
      expired: "यह QR कोड समाप्त हो गया है। कृपया नया बनाएँ।",
      success: "QR कोड सफलतापूर्वक सत्यापित।",
      notLoggedIn: "QR लॉगिन के लिए कृपया पहले साइन इन करें।",
      offline: "सत्यापित नहीं हो सका। अपना कनेक्शन जाँचें और पुनः प्रयास करें।",
    },
    reg: {
      desc: "आपके संगठन का संक्षिप्त विवरण",
      step1: "चरण 1 — संगठन विवरण",
      step2: "चरण 2 — आपका विवरण",
      orgName: "संगठन का नाम",
      orgType: "संगठन का प्रकार",
      yourName: "आपका पूरा नाम",
      yourPhone: "आपका फ़ोन नंबर",
      officialEmail: "आधिकारिक ईमेल",
      warningTitle: "आगे बढ़ने से पहले",
      warningDesc1: "आप एक ",
      warningDesc2: " कार्यक्षेत्र बना रहे हैं। डेमो डेटा केवल परिचय हेतु है।",
    },
    actions: {
      cancel: "रद्द करें",
      createDynamic: "{X} कार्यक्षेत्र बनाएँ",
      deleteRecord: "हटाएँ",
    },
  };

export default dict;
