import type { TranslationSchema } from '../schema';

/**
 * mr — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
    nav: {
      dashboard: "डॅशबोर्ड",
      treasury: "खजिना (Treasury)",
      bhandar: "भांडार (Bhandar)",
      devotees: "भक्त मंडळी",
      puja: "पूजा व संकल्प",
      analytics: "विश्लेषण",
      settings: "सेटिंग्ज",
      yatra: "यात्रा रडार",
      polls: "सामुदायिक मतदान",
      dharamshala: "धर्मशाळा",
    },
    common: {
      save: "जतन करा",
      cancel: "रद्द करा",
      search: "शोधा",
      export: "निर्यात",
      download: "डाउनलोड",
      offline: "ऑफलाइन",
      online: "ऑनलाइन",
      syncing: "सिंक होत आहे",
      status: "स्थिती",
    },
    auth: {
      accessPortal: "प्रवेशद्वार",
      identity: "ईमेल, फोन किंवा ID",
      password: "पासवर्ड किंवा PIN टाका",
      forgotPassword: "पासवर्ड विसरलात?",
      portalSubtitle: "प्रशासक, सदस्य व पुरोहितांसाठी सुरक्षित लॉगिन",
    },
    qr: {
      expired: "हा QR कोड कालबाह्य झाला आहे. नवीन तयार करा.",
      success: "QR कोड यशस्वीरित्या सत्यापित.",
      notLoggedIn: "QR लॉगिनसाठी आधी साइन इन करा.",
      offline: "सत्यापित करता आले नाही. कनेक्शन तपासा व पुन्हा प्रयत्न करा.",
    },
    reg: {
      desc: "आपल्या संस्थेचे थोडक्यात वर्णन",
      step1: "पायरी 1 — संस्था तपशील",
      step2: "पायरी 2 — आपले तपशील",
      orgName: "संस्थेचे नाव",
      orgType: "संस्थेचा प्रकार",
      yourName: "आपले पूर्ण नाव",
      yourPhone: "आपला फोन नंबर",
      officialEmail: "अधिकृत ईमेल",
      warningTitle: "पुढे जाण्यापूर्वी",
      warningDesc1: "आपण एक ",
      warningDesc2: " कार्यक्षेत्र तयार करत आहात. डेमो डेटा फक्त ओळखीसाठी.",
    },
    actions: {
      cancel: "रद्द करा",
      createDynamic: "{X} कार्यक्षेत्र तयार करा",
      deleteRecord: "हटवा",
    },
  };

export default dict;
