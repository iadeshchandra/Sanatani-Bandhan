/**
 * Sanatani Bandhan - 10-Language Dharmic Localization Dictionaries
 *
 * P2: extended to cover every t('...') key used in the UI (auth, QR pairing,
 * registration, record actions, polls, dharamshala). The t() resolver falls
 * back currentLang -> en -> key, so a missing entry degrades to English,
 * never to a blank string.
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
  };
  auth: {
    accessPortal: string;
    identity: string;
    password: string;
    forgotPassword: string;
    portalSubtitle: string;
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
  };
  actions: {
    cancel: string;
    createDynamic: string; // {X} is replaced with the org type at runtime
    deleteRecord: string;
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
      polls: "Community Polls",
      dharamshala: "Dharamshala",
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
    auth: {
      accessPortal: "Access Portal",
      identity: "Email, Phone, or ID",
      password: "Enter Password or PIN",
      forgotPassword: "Forgot Password?",
      portalSubtitle: "Secure login for Admins, Members, and Purohits",
    },
    qr: {
      expired: "This QR code has expired. Please generate a new one.",
      success: "QR code verified successfully.",
      notLoggedIn: "Please sign in to continue with QR login.",
      offline: "Could not verify. Check your connection and try again.",
    },
    reg: {
      desc: "Brief description of your organisation",
      step1: "Step 1 — Organisation Details",
      step2: "Step 2 — Your Details",
      orgName: "Organisation Name",
      orgType: "Organisation Type",
      yourName: "Your Full Name",
      yourPhone: "Your Phone Number",
      officialEmail: "Official Email",
      warningTitle: "Before you continue",
      warningDesc1: "You are creating a ",
      warningDesc2: " workspace. Demo data is for exploration only.",
    },
    actions: {
      cancel: "Cancel",
      createDynamic: "Create {X} Workspace",
      deleteRecord: "DELETE",
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
      polls: "সম্প্রদায় ভোট",
      dharamshala: "ধর্মশালা",
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
    auth: {
      accessPortal: "প্রবেশ দ্বার",
      identity: "ইমেল, ফোন বা ID",
      password: "পাসওয়ার্ড বা PIN দিন",
      forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
      portalSubtitle: "প্রশাসক, সদস্য ও পুরোহিতদের জন্য নিরাপদ লগইন",
    },
    qr: {
      expired: "এই QR কোডের মেয়াদ শেষ। নতুন একটি তৈরি করুন।",
      success: "QR কোড সফলভাবে যাচাই হয়েছে।",
      notLoggedIn: "QR লগইনের জন্য আগে সাইন ইন করুন।",
      offline: "যাচাই করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
    },
    reg: {
      desc: "আপনার প্রতিষ্ঠানের সংক্ষিপ্ত বিবরণ",
      step1: "ধাপ ১ — প্রতিষ্ঠানের বিবরণ",
      step2: "ধাপ ২ — আপনার বিবরণ",
      orgName: "প্রতিষ্ঠানের নাম",
      orgType: "প্রতিষ্ঠানের ধরন",
      yourName: "আপনার পুরো নাম",
      yourPhone: "আপনার ফোন নম্বর",
      officialEmail: "অফিসিয়াল ইমেল",
      warningTitle: "এগিয়ে যাওয়ার আগে",
      warningDesc1: "আপনি একটি ",
      warningDesc2: " ওয়ার্কস্পেস তৈরি করছেন। ডেমো ডেটা শুধু পরিচিতির জন্য।",
    },
    actions: {
      cancel: "বাতিল করুন",
      createDynamic: "{X} ওয়ার্কস্পেস তৈরি করুন",
      deleteRecord: "মুছুন",
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
      polls: "समुदायमतदानम्",
      dharamshala: "धर्मशाला",
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
    auth: {
      accessPortal: "प्रवेशद्वारम्",
      identity: "ईमेल / दूरवाणी / परिचयः",
      password: "गुप्तशब्दं वा PIN प्रविशतु",
      forgotPassword: "गुप्तशब्दं विस्मृतम्?",
      portalSubtitle: "प्रशासकानां, सदस्यानां, पुरोहितानां च सुरक्षितं प्रवेशः",
    },
    qr: {
      expired: "अयं QR-संकेतः समाप्तः। नूतनं सृजतु।",
      success: "QR-संकेतः सफलतया सत्यापितः।",
      notLoggedIn: "QR-प्रवेशाय प्रथमं प्रविशतु।",
      offline: "सत्यापनं न जातम्। सम्पर्कं परीक्ष्य पुनः प्रयततु।",
    },
    reg: {
      desc: "संस्थायाः संक्षिप्तं विवरणम्",
      step1: "चरणम् १ — संस्थाविवरणम्",
      step2: "चरणम् २ — भवतः विवरणम्",
      orgName: "संस्थायाः नाम",
      orgType: "संस्थायाः प्रकारः",
      yourName: "भवतः पूर्णं नाम",
      yourPhone: "भवतः दूरवाणी संख्या",
      officialEmail: "आधिकारिक ईमेल",
      warningTitle: "अग्रे गमनात् पूर्वम्",
      warningDesc1: "भवान् एकं ",
      warningDesc2: " कार्यक्षेत्रं सृजति। डेमो-दत्तांशः परिचयार्थमेव।",
    },
    actions: {
      cancel: "निरस्यताम्",
      createDynamic: "{X} कार्यक्षेत्रं सृजतु",
      deleteRecord: "विलोपयतु",
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
      polls: "சமூக வாக்கெடுப்பு",
      dharamshala: "தர்மசாலா",
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
    auth: {
      accessPortal: "நுழைவு வாயில்",
      identity: "மின்னஞ்சல், தொலைபேசி அல்லது ID",
      password: "கடவுச்சொல் அல்லது PIN உள்ளிடுக",
      forgotPassword: "கடவுச்சொல் மறந்துவிட்டதா?",
      portalSubtitle: "நிர்வாகிகள், உறுப்பினர்கள், புரோகிதர்களுக்கான பாதுகாப்பான உள்நுழைவு",
    },
    qr: {
      expired: "இந்த QR குறியீடு காலாவதியானது. புதியதை உருவாக்குக.",
      success: "QR குறியீடு வெற்றிகரமாக சரிபார்க்கப்பட்டது.",
      notLoggedIn: "QR உள்நுழைவுக்கு முதலில் உள்நுழைக.",
      offline: "சரிபார்க்க முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    },
    reg: {
      desc: "உங்கள் நிறுவனத்தின் சுருக்கமான விளக்கம்",
      step1: "படி 1 — நிறுவன விவரங்கள்",
      step2: "படி 2 — உங்கள் விவரங்கள்",
      orgName: "நிறுவனத்தின் பெயர்",
      orgType: "நிறுவன வகை",
      yourName: "உங்கள் முழு பெயர்",
      yourPhone: "உங்கள் தொலைபேசி எண்",
      officialEmail: "அதிகாரப்பூர்வ மின்னஞ்சல்",
      warningTitle: "தொடர்வதற்கு முன்",
      warningDesc1: "நீங்கள் ஒரு ",
      warningDesc2: " பணியிடத்தை உருவாக்குகிறீர்கள். டெமோ தரவு அறிமுகத்திற்கு மட்டுமே.",
    },
    actions: {
      cancel: "ரத்து செய்",
      createDynamic: "{X} பணியிடத்தை உருவாக்குக",
      deleteRecord: "நீக்கு",
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
      polls: "સામુદાયિક મતદાન",
      dharamshala: "ધર્મશાળા",
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
    auth: {
      accessPortal: "પ્રવેશદ્વાર",
      identity: "ઈમેલ, ફોન અથવા ID",
      password: "પાસવર્ડ અથવા PIN દાખલ કરો",
      forgotPassword: "પાસવર્ડ ભૂલી ગયા?",
      portalSubtitle: "સંચાલકો, સભ્યો અને પુરોહિતો માટે સુરક્ષિત લૉગિન",
    },
    qr: {
      expired: "આ QR કોડની મુદત પૂરી થઈ છે. નવો બનાવો.",
      success: "QR કોડ સફળતાપૂર્વક ચકાસાયો.",
      notLoggedIn: "QR લૉગિન માટે પહેલા સાઇન ઇન કરો.",
      offline: "ચકાસી શકાયું નહીં. કનેક્શન તપાસી ફરી પ્રયાસ કરો.",
    },
    reg: {
      desc: "તમારી સંસ્થાનું સંક્ષિપ્ત વર્ણન",
      step1: "પગલું 1 — સંસ્થાની વિગતો",
      step2: "પગલું 2 — તમારી વિગતો",
      orgName: "સંસ્થાનું નામ",
      orgType: "સંસ્થાનો પ્રકાર",
      yourName: "તમારું પૂરું નામ",
      yourPhone: "તમારો ફોન નંબર",
      officialEmail: "સત્તાવાર ઈમેલ",
      warningTitle: "આગળ વધતા પહેલા",
      warningDesc1: "તમે એક ",
      warningDesc2: " વર્કસ્પેસ બનાવી રહ્યા છો. ડેમો ડેટા ફક્ત પરિચય માટે.",
    },
    actions: {
      cancel: "રદ કરો",
      createDynamic: "{X} વર્કસ્પેસ બનાવો",
      deleteRecord: "કાઢી નાખો",
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
      polls: "ಸಮುದಾಯ ಮತದಾನ",
      dharamshala: "ಧರ್ಮಶಾಲಾ",
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
    auth: {
      accessPortal: "ಪ್ರವೇಶ ದ್ವಾರ",
      identity: "ಇಮೇಲ್, ಫೋನ್ ಅಥವಾ ID",
      password: "ಪಾಸ್‌ವರ್ಡ್ ಅಥವಾ PIN ನಮೂದಿಸಿ",
      forgotPassword: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?",
      portalSubtitle: "ನಿರ್ವಾಹಕರು, ಸದಸ್ಯರು, ಪುರೋಹಿತರಿಗಾಗಿ ಸುರಕ್ಷಿತ ಲಾಗಿನ್",
    },
    qr: {
      expired: "ಈ QR ಕೋಡ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಹೊಸದನ್ನು ರಚಿಸಿ.",
      success: "QR ಕೋಡ್ ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
      notLoggedIn: "QR ಲಾಗಿನ್‌ಗಾಗಿ ಮೊದಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
      offline: "ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    },
    reg: {
      desc: "ನಿಮ್ಮ ಸಂಸ್ಥೆಯ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ",
      step1: "ಹಂತ 1 — ಸಂಸ್ಥೆಯ ವಿವರಗಳು",
      step2: "ಹಂತ 2 — ನಿಮ್ಮ ವಿವರಗಳು",
      orgName: "ಸಂಸ್ಥೆಯ ಹೆಸರು",
      orgType: "ಸಂಸ್ಥೆಯ ಪ್ರಕಾರ",
      yourName: "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು",
      yourPhone: "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ",
      officialEmail: "ಅಧಿಕೃತ ಇಮೇಲ್",
      warningTitle: "ಮುಂದುವರಿಯುವ ಮೊದಲು",
      warningDesc1: "ನೀವು ಒಂದು ",
      warningDesc2: " ಕಾರ್ಯಕ್ಷೇತ್ರವನ್ನು ರಚಿಸುತ್ತಿದ್ದೀರಿ. ಡೆಮೋ ಡೇಟಾ ಪರಿಚಯಕ್ಕಾಗಿ ಮಾತ್ರ.",
    },
    actions: {
      cancel: "ರದ್ದುಮಾಡಿ",
      createDynamic: "{X} ಕಾರ್ಯಕ್ಷೇತ್ರವನ್ನು ರಚಿಸಿ",
      deleteRecord: "ಅಳಿಸಿ",
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
  },
};

export default translations;
