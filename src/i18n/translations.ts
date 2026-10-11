/**
 * Sanatani Bandhan - 10-Language Dharmic Localization Dictionaries
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
  };
}

export const translations: Record<string, TranslationSchema> = {
  en: {
    nav: {
      dashboard: "Dashboard",
      treasury: "Treasury",
      bhandar: "Smart Bhandar",
      devotees: "Devotee CRM",
      puja: "Pooja & Rituals",
      analytics: "Global Analytics",
      settings: "Settings",
      yatra: "YatraNet GIS",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      search: "Search",
      export: "Export",
      download: "Download",
      offline: "Offline",
      online: "Online",
      syncing: "Syncing",
      status: "Status",
    },
  },
  hi: {
    nav: {
      dashboard: "डैशबोर्ड",
      treasury: "कोषागार (Treasury)",
      bhandar: "भंडार (Inventory)",
      devotees: "भक्त नामावली (Devotees)",
      puja: "पूजा एवं संकल्प",
      analytics: "वैश्विक विश्लेषण",
      settings: "व्यवस्था (Settings)",
      yatra: "यात्रा रडार (YatraNet)",
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
  },
  bn: {
    nav: {
      dashboard: "ড্যাশবোর্ড",
      treasury: "তহবিল (Treasury)",
      bhandar: "ভাণ্ডার (Inventory)",
      devotees: "ভক্ত তালিকা (Devotees)",
      puja: "পূজা ও সংকল্প",
      analytics: "বিশ্ব বিশ্লেষণ",
      settings: "সেটিংস",
      yatra: "যাত্রা নেটওয়ার্ক",
    },
    common: {
      save: "সংরক্ষণ করুন",
      cancel: "বাতিল করুন",
      search: "অনুসন্ধান",
      export: "রপ্তানি",
      download: "ডাউনলোড",
      offline: "অফলাইন",
      online: "অনলাইন",
      syncing: "সিঙ্ক হচ্ছে",
      status: "অবস্থা",
    },
  },
  sa: {
    nav: {
      dashboard: "मुख्यपटलम् (Dashboard)",
      treasury: "कोषागारम् (Treasury)",
      bhandar: "भण्डारम् (Inventory)",
      devotees: "भक्तगणपञ्जिका",
      puja: "पूजार्चनविधिः",
      analytics: "वैश्विकविश्लेषणम्",
      settings: "व्यवस्थापनम्",
      yatra: "तीर्थयात्राजालम्",
    },
    common: {
      save: "संरक्ष्यताम्",
      cancel: "निरस्यताम्",
      search: "अन्वेषणम्",
      export: "बहिर्नयनम्",
      download: "अवरोहणम्",
      offline: "असम्पृक्तम्",
      online: "सम्पृक्तम्",
      syncing: "समकालीकरणम्",
      status: "स्थितिः",
    },
  },
  ta: {
    nav: {
      dashboard: "முகப்பு பலகை",
      treasury: "கருவூலம் (Treasury)",
      bhandar: "கிடங்கு (Bhandar)",
      devotees: "பக்தர்கள் விவரம்",
      puja: "பூஜை & சங்கல்பம்",
      analytics: "பகுப்பாய்வு",
      settings: "அமைப்புகள்",
      yatra: "யாத்திரை ரேடார்",
    },
    common: {
      save: "சேமிக்க",
      cancel: "ரத்து செய்",
      search: "தேடு",
      export: "ஏற்றுமதி",
      download: "பதிவிறக்கு",
      offline: "ஆஃப்லைன்",
      online: "ஆன்லைன்",
      syncing: "ஒத்திசைக்கிறது",
      status: "நிலை",
    },
  },
  te: {
    nav: {
      dashboard: "డాష్‌బోర్డ్",
      treasury: "ఖజానా (Treasury)",
      bhandar: "భండారం (Bhandar)",
      devotees: "భక్తుల వివరాలు",
      puja: "పూజలు & సంకల్పం",
      analytics: "విశ్లేషణలు",
      settings: "సెట్టింగులు",
      yatra: "యాత్ర రాడార్",
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
  },
  mr: {
    nav: {
      dashboard: "डॅशबोर्ड",
      treasury: "खजिना (Treasury)",
      bhandar: "भांडार (Bhandar)",
      devotees: "भक्त मंडळी",
      puja: "पूजा व संकल्प",
      analytics: "विश्लेषण",
      settings: "सेटिंग्ज",
      yatra: "यात्रा रडार",
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
  },
  gu: {
    nav: {
      dashboard: "ડેશબોર્ડ",
      treasury: "ખજાનો (Treasury)",
      bhandar: "ભંડાર (Bhandar)",
      devotees: "ભક્ત મંડળ",
      puja: "પૂજા અને સંકલ્પ",
      analytics: "વિશ્લેષણ",
      settings: "સેટિંગ્સ",
      yatra: "યાત્રા રડાર",
    },
    common: {
      save: "સાચવો",
      cancel: "રદ કરો",
      search: "શોધો",
      export: "નિકાસ",
      download: "ડાઉનલોડ",
      offline: "ઑફલાઇન",
      online: "ઑનલાઇન",
      syncing: "સિંક થઈ રહ્યું છે",
      status: "સ્થિતિ",
    },
  },
  kn: {
    nav: {
      dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      treasury: "ಖಜಾನೆ (Treasury)",
      bhandar: "ಭಂಡಾರ (Bhandar)",
      devotees: "ಭಕ್ತರ ಪಟ್ಟಿ",
      puja: "ಪೂಜೆ ಮತ್ತು ಸಂಕಲ್ಪ",
      analytics: "ವಿಶ್ಲೇಷಣೆ",
      settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
      yatra: "ಯಾತ್ರಾ ರಾಡಾರ್",
    },
    common: {
      save: "ಉಳಿಸಿ",
      cancel: "ರದ್ದುಮಾಡಿ",
      search: "ಹುಡುಕಿ",
      export: "ರಫ್ತು",
      download: "ಡೌನ್‌ಲೋಡ್",
      offline: "ಆಫ್‌ಲೈನ್",
      online: "ಆನ್‌ಲೈನ್",
      syncing: "ಸಿಂಕ್ ಆಗುತ್ತಿದೆ",
      status: "ಸ್ಥಿತಿ",
    },
  },
  ml: {
    nav: {
      dashboard: "ഡാഷ്‌ബോർഡ്",
      treasury: "ഖജനാവ് (Treasury)",
      bhandar: "ഭണ്ഡാരം (Bhandar)",
      devotees: "ഭക്തർ",
      puja: "പൂജ & സങ്കല്പം",
      analytics: "വിശകലനം",
      settings: "ക്രമീകരണങ്ങൾ",
      yatra: "യാത്രാ റഡാർ",
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
  },
};

export default translations;
