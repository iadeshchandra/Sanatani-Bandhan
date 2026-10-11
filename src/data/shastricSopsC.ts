import type { ModuleRoleSOP } from './shastricTypes';

export const MODULE_ROLE_SOPS_C: Record<string, Record<string, ModuleRoleSOP>> = {
  QUICK_CHANDA_POS: {
    SEVADAR: {
      moduleId: 'QUICK_CHANDA_POS',
      moduleName: {
        en: 'Quick Chanda Counter POS & 80G Receipting',
        hi: 'त्वरित चंदा काउंटर पी.ओ.एस. एवं 80G रसीद',
        bn: 'কুইক চাঁদা কাউন্টার পিওএস ও ৮০জি রসিদ প্রদান',
        sa: 'त्वरित-चन्दा-काउण्टर-पीओएस् तथा ८०G रसीद-विभागः',
      },
      role: 'SEVADAR',
      roleLabel: {
        en: 'Counter Sevadar / POS Cashier',
        hi: 'काउंटर सेवादार / पी.ओ.एस. खजांची',
        bn: 'কাউন্টার সেবাদার / পিওএস ক্যাশিয়ার',
        sa: 'काउण्टर-सेवादारः / पीओएस-कोषाध्यक्षः',
      },
      roleSummary: {
        en: 'Rapidly accepts voluntary CHANDA offerings at temple counters, records devotee SANKALP, collects Cash/UPI/Card payments, and prints thermal 80G receipts.',
        hi: 'मंदिर काउंटर पर भक्तों से स्वेच्छापूर्वक CHANDA स्वीकारना, SANKALP विवरण दर्ज करना, नकद/UPI/कार्ड भुगतान लेना एवं 80G रसीद तत्काल मुद्रित करना।',
        bn: 'মন্দির কাউন্টারে ভক্তদের থেকে স্বতঃস্ফূর্ত CHANDA গ্রহণ, ভক্তের SANKALP নথিভুক্তকরণ, নগদ/ইউপিআই পেমেন্ট গ্রহণ ও তাৎক্ষণিক ৮০জি রসিদ প্রদান।',
        sa: 'मन्दिरकाउण्टरे भक्तैः प्रदत्तं CHANDA स्वीकृत्य, SANKALP प्रतिज्ञां पञ्जीकृत्य, नगद/UPI द्वारा धनं स्वीकृत्य ८०G रसीदपत्रं मुद्रयितुम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Fast Devotee Lookup via Mobile',
            hi: '१. मोबाइल नंबर से त्वरित श्रद्धालु खोज',
            bn: '১. মোবাইল নম্বর দিয়ে দ্রুত ভক্ত সন্ধান',
            sa: '१. दूरभाषसंख्यया भक्तस्य त्वरित-अन्वेषणम्',
          },
          description: {
            en: 'Enter 10-digit mobile number into the lookup field. Existing devotee profiles auto-fill name, gotra, and PAN for 80G tax exemptions.',
            hi: 'श्रद्धालु का १० अंकों का मोबाइल नंबर दर्ज करें। पंजीकृत भक्त का नाम, गोत्र और 80G हेतु पैन नंबर स्वतः भर जाएगा।',
            bn: 'ভক্তের ১০ সংখ্যার মোবাইল নম্বর লিখুন। পূর্বনিবন্ধিত ভক্তদের নাম, গোত্র ও ৮০জি করমুক্তির জন্য প্যান নম্বর স্বয়ংক্রিয় পূরণ হবে।',
            sa: 'दशाङ्क-दूरभाषसंख्यां प्रविशन्तु। पूर्वपञ्जीकृत-भक्तस्य नाम, गोत्रं, ८०G कृते PAN संख्या च स्वतः समागमिष्यति।',
          },
          actionRequired: {
            en: 'Type 10 digits in devotee search input; or register new devotee in seconds.',
            hi: 'सर्च बार में १० अंक लिखें या नए भक्त का नाम तुरंत भरें।',
            bn: '১০ সংখ্যার মোবাইল টাইপ করুন বা নতুন ভক্তের তথ্য লিখুন।',
            sa: 'दशाङ्कसंख्यां लिखन्तु उत नूतनं भक्तं योजयन्तु।',
          },
          highlightedTerms: ['CHANDA', 'SANKALP'],
          complianceTag: 'CBDT Form 10BD & Rule 18AB',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Select Seva Items & Chanda Amount',
            hi: '२. सेवा मद एवं चंदा राशि चयन',
            bn: '২. সেবা আইটেম ও চাঁদার পরিমাণ নির্বাচন',
            sa: '२. सेवामदानां चन्दा-राशेश्च चयनम्',
          },
          description: {
            en: 'Tap rapid amount presets (₹101, ₹501, ₹1100, ₹5100) or pick items across General Chanda, Annadanam, Goshala Seva, or Puja Booking with consecrated PRASADAM.',
            hi: 'त्वरित राशि बटन (₹101, ₹501, ₹1100, ₹5100) दबाएं या सामान्य चंदा, अन्नदान, गौशाला सेवा अथवा PRASADAM युक्त पूजा बुकिंग चुनें।',
            bn: 'দ্রুত অঙ্কের বোতাম (₹১০১, ₹৫০১, ₹১১০০, ₹৫১০০) চাপুন অথবা অন্নদান, গোশালা বা PRASADAM সহ পূজা বুকিং কার্টে যোগ করুন।',
            sa: 'त्वरित-राशि-पिञ्जं (₹101, ₹501, ₹1100, ₹5100) नोदयन्तु अथवा सामान्य-चन्दा, अन्नदानं, गोशाला-सेवा, PRASADAM युक्त-पूजां वा चिनुत।',
          },
          actionRequired: {
            en: 'Click catalog cards or quick amount chips to build donation cart.',
            hi: 'कैटलॉग कार्ड अथवा त्वरित राशि बटन पर क्लिक कर कार्ट तैयार करें।',
            bn: 'ক্যাটালগ কার্ড বা দ্রুত বাটনে ক্লিক করে কার্ট তৈরি করুন।',
            sa: 'कार्ड-भागे क्लिक कृत्वा दान-सूचीं रचयन्तु।',
          },
          highlightedTerms: ['CHANDA', 'PRASADAM', 'SANKALP'],
          complianceTag: 'Mandir Seva Rate Schedule & Trust By-laws',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Collect Payment (Cash / UPI QR / Card)',
            hi: '३. भुगतान संग्रह (नकद / UPI क्यूआर / कार्ड)',
            bn: '৩. অর্থ পরিশোধ গ্রহণ (নগদ / ইউপিআই কিউআর / কার্ড)',
            sa: '३. धनस्वीकरणम् (नगद / UPI / कार्ड)',
          },
          description: {
            en: 'Select devotee preferred payment mode. For UPI, present the dynamic Mandir merchant QR code; for Cash, collect and verify exact tender.',
            hi: 'श्रद्धालु के पसंदीदा भुगतान माध्यम का चयन करें। UPI हेतु मंदिर मर्चेंट क्यूआर दिखाएं; नकद में सही मुद्रा प्राप्त करें।',
            bn: 'ভক্তের সুবিধাজনক পেমেন্ট মোড বেছে নিন। ইউপিআই-এর জন্য কিউআর স্ক্যান করান এবং নগদের ক্ষেত্রে সঠিক নোট বুঝে নিন।',
            sa: 'भक्तस्य इच्छानुसारं माध्यमं चिनुत। UPI कृते QR कोडं दर्शयन्तु, नगदराशौ मुद्रां परीक्ष्य स्वीकुर्वन्तु।',
          },
          actionRequired: {
            en: 'Tap Cash, UPI, or Card mode on tablet interface.',
            hi: 'टैबलेट स्क्रीन पर कैश, यूपीआई अथवा कार्ड चुनें।',
            bn: 'স্ক্রিনে ক্যাশ, ইউপিআই বা কার্ড বোতাম চাপুন।',
            sa: 'टैबलेट-पटले नगद-UPI-कार्ड विकल्पं चिनुत।',
          },
          highlightedTerms: ['CHANDA'],
          complianceTag: 'Reserve Bank of India Merchant Guidelines',
        },
        {
          stepNumber: 4,
          title: {
            en: '4. Instant Thermal 80G Receipt & Sankalp Slip',
            hi: '४. तत्काल थर्मल 80G रसीद एवं संकल्प पर्ची मुद्रण',
            bn: '৪. তাৎক্ষণিক থার্মাল ৮০জি রসিদ ও সংকল্প স্লিপ প্রিন্ট',
            sa: '४. त्वरित-थर्मल-८०G-रसीद तथा सङ्कल्प-पत्र-मुद्रणम्',
          },
          description: {
            en: 'Execute checkout to automatically post to temple treasury ledger, generate official CBDT 80G URN, and trigger high-speed thermal printing of the donation voucher.',
            hi: 'चेकआउट पूरा करते ही मंदिर मुख्य बहीखाते में प्रविष्टि हो जाएगी, 80G URN उत्पन्न होगा और थर्मल रसीद प्रिंट हो जाएगी।',
            bn: 'চেকআউট বাটনে চাপামাত্রই মন্দিরের প্রধান কোষাগারে টাকা যুক্ত হবে, ৮০জি রসিদ তৈরি হবে এবং থার্মাল প্রিন্টার থেকে প্রিন্ট বের হবে।',
            sa: 'चेकआउट-करणेन मन्दिर-कोषे प्रविष्टिः भवति, ८०G URN प्राप्यते, थर्मल-रसीदपत्रं च मुद्रितं भवति।',
          },
          actionRequired: {
            en: 'Click "Process & Print Receipt" and hand over printed thermal voucher to the devotee.',
            hi: '"Process & Print Receipt" बटन दबाएं और मुद्रित पर्ची श्रद्धालु को ससम्मान सौंपें।',
            bn: '"Process & Print Receipt" বোতাম চেপে প্রিন্ট কপিটি ভক্তের হাতে তুলে দিন।',
            sa: '"Process & Print Receipt" नोदयित्वा मुद्रितपत्रं भक्ताय सस्नेहं समर्पयन्तु।',
          },
          highlightedTerms: ['CHANDA', 'SANKALP'],
          complianceTag: 'Income Tax Act Sec 80G(5)(iv) & Form 10BD Real-Time Sync',
        },
      ],
      checklistItems: [
        {
          en: 'Devotee mobile entered and PAN validated if 80G tax receipt requested',
          hi: '80G रसीद हेतु श्रद्धालु का मोबाइल नंबर एवं वैध पैन नंबर दर्ज',
          bn: '৮০জি করমুক্তির জন্য ভক্তের সঠিক মোবাইল ও প্যান নম্বর যাচাই সম্পন্ন',
          sa: '८०G कृते भक्तस्य दूरभाषसंख्या तथा वैध-PAN संख्या निर्धारिता',
        },
        {
          en: 'Correct Seva & Chanda category selected with exact tender received',
          hi: 'सही सेवा एवं चंदा मद चयनित तथा पूर्ण राशि प्राप्त',
          bn: 'সঠিক সেবা ও চাঁদার ধরণ নির্বাচন এবং সম্পূর্ণ অর্থ গ্রহণ নিশ্চিত',
          sa: 'उचित-सेवा-वर्गस्य चयनं तथा सम्पूर्ण-धनस्वीकरणं सुनिश्चितम्',
        },
        {
          en: 'Thermal printer online and receipt handed over with sacred Prasad blessing',
          hi: 'थर्मल प्रिंटर सक्रिय एवं रसीद श्रद्धालु को प्रसाद आशीर्वाद सहित समर्पित',
          bn: 'থার্মাল প্রিন্টার সচল এবং ভক্তকে প্রসাদ আশীর্বাদসহ রসিদ প্রদান',
          sa: 'थर्मल-मुद्रकयन्त्रं सक्रियं तथा सङ्कल्प-रसीदपत्रं भक्ताय समर्पितम्',
        },
      ],
    },
    ACCOUNTANT: {
      moduleId: 'QUICK_CHANDA_POS',
      moduleName: {
        en: 'Quick Chanda Counter POS & 80G Receipting',
        hi: 'त्वरित चंदा काउंटर पी.ओ.एस. एवं 80G रसीद',
        bn: 'কুইক চাঁদা কাউন্টার পিওএস ও ৮০জি রসিদ প্রদান',
        sa: 'त्वरित-चन्दा-काउण्टर-पीओएस् तथा ८०G रसीद-विभागः',
      },
      role: 'ACCOUNTANT',
      roleLabel: {
        en: 'Chief Accountant / Revenue Auditor',
        hi: 'मुख्य लेखाकार / राजस्व लेखापरीक्षक',
        bn: 'প্রধান হিসাবরক্ষক / রাজস্ব নিরীক্ষক',
        sa: 'मुख्य-लेखाकारः / राजस्व-परीक्षकः',
      },
      roleSummary: {
        en: 'Monitors real-time counter collections, verifies daily Cash/UPI reconciliations, audits 80G PAN compliance, and ensures automated ledger posting into Treasury.',
        hi: 'काउंटर संग्रह का वास्तविक समय में निरीक्षण, दैनिक नकद व यूपीआई समाधान, 80G पैन अनुपालन जांच एवं मुख्य बहीखाता समन्वय।',
        bn: 'কাউন্টার সংগ্রহের রিয়েল-টাইম পর্যবেক্ষণ, দৈনিক ক্যাশ ও ইউপিআই সমন্বয়, ৮০জি প্যান যাচাই এবং মূল খতিয়ানে স্বয়ংক্রিয় অন্তর্ভুক্তি নিশ্চিতকরণ।',
        sa: 'काउण्टर-सङ्ग्रहस्य समीक्षणं, दैनिक-आय-व्यय-समाधानं, ८०G PAN अनुपालन-परीक्षणं च मुख्यं कर्तव्यम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Audit Real-Time Treasury Ledger Postings',
            hi: '१. वास्तविक समय ट्रेजरी बहीखाता प्रविष्टियों का सत्यापन',
            bn: '১. রিয়েল-টাইম ট্রেজারি লেজার পোস্টিং নিরীক্ষণ',
            sa: '१. वास्तविक-समय-कोष-प्रविष्टीनां परीक्षणम्',
          },
          description: {
            en: 'Each Quick Chanda transaction automatically creates a tagged income entry in Treasury under CHANDA_COLLECTION with the counter cashier identifier.',
            hi: 'प्रत्येक त्वरित चंदा लेनदेन कोषागार में काउंटर खजांची के पहचान सहित CHANDA_COLLECTION मद में दर्ज होता है।',
            bn: 'প্রতিটি কুইক চাঁদা লেনদেন স্বয়ংক্রিয়ভাবে কাউন্টার ক্যাশিয়ারের তথ্যসহ ট্রেজারিতে জমা হয়।',
            sa: 'प्रत्येकं चन्दा-व्यवहारः कोषागारे CHANDA_COLLECTION रूपेण पञ्जीकृतः भवति।',
          },
          actionRequired: {
            en: 'Review Income entries in Treasury Ledger filtered by POS Counter.',
            hi: 'ट्रेजरी लेजर में पी.ओ.एस. काउंटर फ़िल्टर कर आय प्रविष्टियों की जांच करें।',
            bn: 'ট্রেজারি লেজারে পিওএস কাউন্টারের আয় পর্যবেক্ষণ করুন।',
            sa: 'कोष-पञ्जिकायां पीओएस्-काउण्टर-आयम् अवलोकयन्तु।',
          },
          highlightedTerms: ['CHANDA', 'CORPUS_FUND'],
          complianceTag: 'Income Tax Act Sec 11 & 12',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Form 10BD Ready 80G Tax Donation Certification',
            hi: '२. फॉर्म 10BD अनुरूप 80G दान प्रमाणीकरण',
            bn: '২. ফর্ম ১০বিডি উপযোগী ৮০জি দান প্রত্যয়ন',
            sa: '२. फॉर्म 10BD अनुगुणं ८०G दान-प्रमाणीकरणम्',
          },
          description: {
            en: 'Ensure donor PAN numbers provided at POS meet CBDT 10-character checksum criteria for hassle-free annual 10BD filing.',
            hi: 'सुनिश्चित करें कि पीओएस पर दिया गया पैन नंबर वैध है ताकि वार्षिक फॉर्म 10BD में कोई बाधा न आए।',
            bn: 'নিশ্চিত করুন কাউন্টারে সংগৃহীত প্যান নম্বরটি সঠিক যাতে বার্ষিক ফর্ম ১০বিডি জমা দিতে কোনো ত্রুটি না হয়।',
            sa: 'वार्षिक-१०BD-विवरण्याः कृते दत्ता PAN संख्या शुद्धा अस्ति वा इति परीक्षन्तु।',
          },
          actionRequired: {
            en: 'Verify 80G donor tax receipts summary at day end.',
            hi: 'दिन के अंत में 80G दान रसीद सारांश की समीक्षा करें।',
            bn: 'দিনশেষে ৮০জি দান রসিদের সারসংক্ষেপ পর্যালোচনা করুন।',
            sa: 'सायं ८०G दान-रसीद-सारांशं परीक्षन्तु।',
          },
          highlightedTerms: ['CHANDA'],
          complianceTag: 'CBDT Form 10BD Statutory Rule 18AB',
        },
      ],
      checklistItems: [
        {
          en: 'POS Cash drawer reconciled with physical currency sweep at close of counter',
          hi: 'काउंटर बंद होने पर पीओएस रोकड़ का भौतिक नकदी से शत-प्रतिशत मिलान',
          bn: 'কাউন্টার বন্ধের সময় ক্যাশ ড্রয়ারের নগদ টাকার শতভাগ সমন্বয় সম্পন্ন',
          sa: 'काउण्टर-समाप्तौ भौतिक-मुद्रायाः सङ्गणक-कोषेण सह शत-प्रतिशतं मिलनम्',
        },
        {
          en: 'Merchant UPI settlement batch matches digital payment receipts',
          hi: 'मर्चेंट यूपीआई सेटलमेंट बैच का डिजिटल रसीदों से मिलान',
          bn: 'মার্চেন্ট ইউপিআই সেটেলমেন্টের সাথে ডিজিটাল পেমেন্ট রসিদের মিল নিশ্চিত',
          sa: 'UPI सेटलमेण्ट्-राशेः डिजिटल-रसीदैः सह समन्वयः सिद्धः',
        },
      ],
    },
  },
  PANCHANG_ENGINE: {
    PUROHIT: {
      moduleId: 'PANCHANG_ENGINE',
      moduleName: {
        en: 'Vedic Panchang & Muhurat Astrology Engine',
        hi: 'वैदिक पंचांग एवं मुहूर्त ज्योतिष इंजन',
        bn: 'বৈদিক পঞ্জিকা ও মুহূর্ত জ্যোতিষ ইঞ্জিন',
        sa: 'वैदिक-पञ्चाङ्गम् एवं शुभमुहूर्त-यन्त्रम्',
      },
      role: 'PUROHIT',
      roleLabel: {
        en: 'Mukhya Purohit & Jyotishacharya',
        hi: 'मुख्य पुरोहित एवं ज्योतिषाचार्य',
        bn: 'প্রধান পুরোহিত ও জ্যোতিষাচার্য',
        sa: 'मुख्यपुरोहितः एवं ज्योतिषाचार्यः',
      },
      roleSummary: {
        en: 'Determine authentic Surya-Siddhantic planetary timings based on local temple geo-coordinates, evaluate Tithi-Nakshatra sandhi, and strictly shield sacred rites from Rahu Kaal and Yamaganda.',
        hi: 'मंदिर के अक्षांश-देशांतर के आधार पर सूर्य-सिद्धांत सम्मत पंचांग की गणना करना, तिथि-नक्षत्र संधि का परीक्षण करना एवं अनुष्ठानों को राहु काल व यमघण्ट से सुरक्षित रखना।',
        bn: 'মন্দিরের ভৌগোলিক স্থানাঙ্কের ভিত্তিতে সূর্যসিদ্ধান্তীয় পঞ্জিকা গণনা, তিথি-নক্ষত্র সন্ধিক্ষণ নির্ধারণ এবং রাহু কাল ও যমগণ্ড থেকে শুভানুষ্ঠানকে সুরক্ষিত রাখা।',
        sa: 'स्थान-अक्षांशरेखा-दृष्ट्या सूर्यसिद्धान्तसम्मतं पञ्चाङ्गगणितं कृत्वा राहुकालादि-दोषेभ्यः अनुष्ठानानां रक्षणम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: 'Verify Local Solar Sunrise (Udaya Lagna) & Geo-Coordinates',
            hi: 'स्थानीय सूर्योदय (उदय लग्न) एवं अक्षांश-देशांतर की पुष्टि',
            bn: 'স্থানীয় সূর্যোদয় ও ভৌগোলিক স্থানাঙ্কের সত্যতা নিশ্চিতকরণ',
            sa: 'सूर्योदयकालस्य अक्षांशरेखायाश्च दृक्-प्रत्यक्षीकरणम्',
          },
          description: {
            en: 'Ensure latitude and longitude of the temple sanctum are accurately geocoded. The engine calculates the five planetary limbs of PANCHANG based on the precise local astronomical sunrise rather than standard civil midnight.',
            hi: 'मंदिर गर्भगृह के सटीक अक्षांश-देशांतर सुनिश्चित करें। पंचांग के पाँचों अंग मानक मध्यरात्रि के स्थान पर स्थानीय सूर्योदय काल से स्वतः आकलित होते हैं।',
            bn: 'মন্দির গর্ভগৃহের সঠিক অক্ষাংশ ও দ্রাঘিমাংশ যাচাই করুন। পঞ্জিকার পঞ্চাঙ্গ নাগরিক মধ্যরাত্রির পরিবর্তে নিখুঁত সূর্যোদয়ের ভিত্তিতে নির্ণীত হয়।',
            sa: 'मन्दिरस्य अक्षांश-रेखांशयोः परिशुद्धतां दृष्ट्वा स्थानीयसूर्योदयेनैव पञ्चाङ्ग-गणना सम्पाद्या।',
          },
          highlightedTerms: ['PANCHANG'],
          complianceTag: 'Surya Siddhanta Chapter 1 (Spashta Bhupati Vidhi)',
        },
        {
          stepNumber: 2,
          title: {
            en: 'Analyze the 5 Limbs: Tithi, Vaara, Nakshatra, Yoga, and Karana',
            hi: 'पंच अंगों का विश्लेषण: तिथि, वार, नक्षत्र, योग एवं करण',
            bn: 'পঞ্চাঙ্গের বিশ্লেষণ: তিথি, বার, নক্ষত্র, যোগ ও করণ',
            sa: 'पञ्चाङ्गानां (तिथि-वार-नक्षत्र-योग-करणानां) परीक्षणम्',
          },
          description: {
            en: 'Review the transition timings and sandhi periods of Tithi and Nakshatra. Ensure that sankalpa rituals requiring Shukla or Krishna Paksha specific deities are conducted within the active Tithi span before its termination.',
            hi: 'तिथि एवं नक्षत्र के समाप्ति काल तथा संधि-वेला की समीक्षा करें। शुक्ल अथवा कृष्ण पक्ष के अभीष्ट अनुष्ठान तिथि के समाप्त होने से पूर्व संपन्न कराएं।',
            bn: 'তিথি ও নক্ষত্রের পরিবর্তন সময় ও সন্ধিকাল পর্যবেক্ষণ করুন। বিশেষ তিথির সংকল্প পূজা তিথি সমাপ্ত হওয়ার পূর্বেই সম্পন্ন করুন।',
            sa: 'तिथेः नक्षत्रस्य च समाप्तिसमयम् अवलोक्य तदन्तः एव सङ्कल्पपूर्वकं पूजां निर्वर्तयेत्।',
          },
          highlightedTerms: ['PANCHANG', 'SANKALP'],
          complianceTag: 'Muhurta Chintamani Tithi-Prakarana',
        },
        {
          stepNumber: 3,
          title: {
            en: 'Enforce Automated Blocking for Rahu Kaal & Yamaganda',
            hi: 'राहु काल एवं यमघण्ट में अनुष्ठान पर स्वचालित रोक',
            bn: 'রাহু কাল ও যমগণ্ডে ধর্মীয় অনুষ্ঠানে স্বয়ংক্রিয় নিষেধাজ্ঞা',
            sa: 'राहुकाले यमगण्डकाले च पूजारम्भे प्रतिबन्धः',
          },
          description: {
            en: 'Strictly observe RAHU_KAAL (an 8th part of the daylight period) and Yamaganda. The system automatically restricts high-value ritual booking during this malefic window to prevent ritual doshas.',
            hi: 'दिनमान के आठवें भाग रूपी राहु काल (RAHU_KAAL) तथा यमघण्ट का कड़ाई से पालन करें। कोई भी मांगलिक संकल्प अथवा विवाह इस काल में आरम्भ न हो।',
            bn: 'দিবাভাগের অষ্টমাংশ বিশিষ্ট রাহু কাল (RAHU_KAAL) ও যমগণ্ড সতর্কতার সাথে পরিহার করুন। এই অশুভ সময়ে পূজার বুকিং সফটওয়্যারে স্বয়ংক্রিয়ভাবে অবরুদ্ধ থাকবে।',
            sa: 'दिनमानस्याष्टमांशे राहुकाले मङ्गलाचरणम् आरम्भो वा सर्वथा वर्जनीयः।',
          },
          highlightedTerms: ['RAHU_KAAL'],
          complianceTag: 'Kalavidhana & Narada Samhita',
        },
        {
          stepNumber: 4,
          title: {
            en: 'Recommend Abhijit & Brahma Muhurat for Devotee Sevas',
            hi: 'अभिजीत एवं ब्रह्म मुहूर्त में शुभ अनुष्ठान की अनुशंसा',
            bn: 'অভিজিৎ ও ব্রহ্ম মুহূর্তে শুভ সেবার সুপারিশ',
            sa: 'अभिजित्-ब्रह्ममुहूर्तेषु शुभकार्याणां प्रशस्तता',
          },
          description: {
            en: 'Utilize the auspicious MUHURAT calculator to identify midday Abhijit Muhurat (the 8th Muhurat of the day, immune to major doshas) and early morning Brahma Muhurat for Rudrabhishek, Vivah, and Griha Pravesh.',
            hi: 'अभिजीत मुहूर्त (दिन का ८वां मुहूर्त जो समस्त दोषों का शमन करता है) एवं प्रातः ब्रह्म मुहूर्त का चयन कर भक्तों को शुभ MUHURAT में संकल्प दिलाएं।',
            bn: 'অভিজিৎ মুহূর্ত এবং ব্রাহ্ম মুহূর্তের মতো পরম কল্যাণকর MUHURAT নির্বাচন করে ভক্তদের শুভ পূজার সময়সূচি নির্ধারণ করুন।',
            sa: 'सर्वदोषहरम् अभिजित्-मुहूर्तं ब्राह्ममुहूर्तं च विज्ञाय भक्तेभ्यः श्रेयस्करं कालं निर्दिशेत्।',
          },
          highlightedTerms: ['MUHURAT'],
          complianceTag: 'Brihat Samhita & Skanda Purana',
        },
      ],
      checklistItems: [
        {
          en: 'Temple sanctum GPS latitude and longitude verified against local ephemeris',
          hi: 'मंदिर गर्भगृह के जीपीएस अक्षांश-देशांतर का स्थानीय पंचांग से मिलान',
          bn: 'মন্দির গর্ভগৃহের জিপিএস স্থানাঙ্কের নির্ভুলতা যাচাইকৃত',
          sa: 'मन्दिरगर्भगृहस्य अक्षांश-रेखांशयोः स्थानिकपञ्चाङ्गेन सह समन्वयः कृतः',
        },
        {
          en: 'Rahu Kaal boundaries calculated dynamically according to daily sunrise and sunset',
          hi: 'दैनिक सूर्योदय व सूर्यास्त के अनुसार राहु काल के समय का गतिशील निर्धारण',
          bn: 'দৈনিক সূর্যোদয় ও সূর্যাস্তের ভিত্তিতে রাহু কালের সময়সীমা নির্ণীত',
          sa: 'प्रतिदिनस्य सूर्योदय-सूर्यास्ताभ्यां राहुकालस्य परिशुद्धं गणितं जातम्',
        },
        {
          en: 'Purohit confirmed active Tithi and Nakshatra prior to initiating Vedic sankalpa',
          hi: 'वैदिक संकल्प आरंभ करने से पूर्व पुरोहित द्वारा वर्तमान तिथि व नक्षत्र की पुष्टि',
          bn: 'পূজা শুরুর পূর্বে পুরোহিত কর্তৃক বর্তমান তিথি ও নক্ষত্রের পূর্ণ নিশ্চয়তা',
          sa: 'वैदिकसङ्कल्पपूर्वं पुरोहितेन प्रचलितायाः तिथेः नक्षत्रस्य च निश्चयः कृतः',
        },
      ],
    },
    TRUSTEE: {
      moduleId: 'PANCHANG_ENGINE',
      moduleName: {
        en: 'Vedic Panchang & Muhurat Astrology Engine',
        hi: 'वैदिक पंचांग एवं मुहूर्त ज्योतिष इंजन',
        bn: 'বৈদিক পঞ্জিকা ও মুহূর্ত ज्योतिष ইঞ্জিন',
        sa: 'वैदिक-पञ्चाङ्गम् एवं शुभमुहूर्त-यन्त्रम्',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Mandir Trustee & Festival Administrator',
        hi: 'मंदिर न्यासी एवं उत्सव व्यवस्थापक',
        bn: 'মন্দির ট্রাস্টি ও মহোৎসব পরিচালক',
        sa: 'मन्दिर-न्यासधारी एवं उत्सव-प्रशासकः',
      },
      roleSummary: {
        en: 'Supervise automated booking schedules, prevent scheduling sacred festivities or public pujas in Rahu Kaal, and ensure published calendar notices strictly adhere to Vedic time calculations.',
        hi: 'स्वचालित पूजा बुकिंग समय-सारिणी की निगरानी करना, राहु काल में आयोजनों को रोकना, तथा भक्तों को प्रामाणिक वैदिक मुहूर्त उपलब्ध कराना।',
        bn: 'পূজা বুকিং সময়সূচি তদারকি করা, রাহু কালে কোনো ধর্মীয় উৎসব আয়োজন নিষিদ্ধ রাখা এবং প্রামাণিক পঞ্জিকা অনুসরণ নিশ্চিত করা।',
        sa: 'पूजा-बुकिङ्ग-समयसूचीं समीक्ष्य राहुकाले कोऽपि उत्सवः न भवेदिति दृढीकृत्य प्रामाणिक-पञ्चाङ्गस्य परिपालनम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: 'Review Shastric Panchang Ephemeris & Gate Darshan Timings',
            hi: 'शास्त्रीय पंचांग एवं मंदिर दर्शन समय-सारणी का अनुमोदन',
            bn: 'পঞ্জিকা বিবরণী ও মন্দির দর্শন সময়সূচির অনুমোদন',
            sa: 'पञ्चाङ्गानुसारं मन्दिरदर्शनसमयस्य व्यवस्थापनम्',
          },
          description: {
            en: 'Confirm that temple aarti, morning opening, and evening bhoga timings sync seamlessly with PANCHANG astronomical transitions such as Sandhya Kaal and Nishita Kaal.',
            hi: 'आरती, प्रातः पटोद्घाटन एवं सांध्य भोग के समय को पंचांग (PANCHANG) के खगोलीय संधिकाल के अनुरूप अनुमोदित करें।',
            bn: 'মন্দিরের নিত্য আরতি ও ভোগ নিবেদনের সময়সূচি পঞ্জিকার (PANCHANG) খগোलीय পরিবর্তনের সাথে সমন্বয় করুন।',
            sa: 'पञ्चाङ्गोक्त-सन्ध्याकालादि-खगोलीयपरिवर्तनानुसारेण मन्दिरार्तिक-समयस्य नियमनम्।',
          },
          highlightedTerms: ['PANCHANG'],
          complianceTag: 'Agama Shastra Temple Administration Guidelines',
        },
        {
          stepNumber: 2,
          title: {
            en: 'Audit Booking Gateways for Automatic Rahu Kaal Exclusion',
            hi: 'बुकिंग पोर्टल पर राहु काल निषेध का ऑडिट',
            bn: 'বুকিং পোর্টালে রাহু काल बहिर्भूत রাখার অডিট',
            sa: 'राहुकाल-बहिष्कारस्य सङ्गणकीय-लेखापरीक्षा',
          },
          description: {
            en: 'Audit the digital booking desk to verify that devotees cannot mistakenly reserve Griha Pravesh or Vivah during RAHU_KAAL. The system must prompt alternative auspicious MUHURAT slots automatically.',
            hi: 'जाँचें कि बुकिंग प्रणाली में राहु काल (RAHU_KAAL) का समय स्वतः अवरुद्ध रहे और भक्तों को वैकल्पिक शुभ मुहूर्त (MUHURAT) स्वतः सुझाए जाएं।',
            bn: 'নিশ্চিত করুন যেন ভক্তরা ভুলবশত রাহু কালে (RAHU_KAAL) শুভপূজা বুক করতে না পারে এবং বিকল্প শুভ MUHURAT প্রদর্শিত হয়।',
            sa: 'राहुकाले भक्ताः प्रमादादपि पूजां मा कुर्युः इति सङ्गणक-प्रणाल्यां प्रतिबन्धं परीक्षेत।',
          },
          highlightedTerms: ['RAHU_KAAL', 'MUHURAT'],
          complianceTag: 'Trustee Board Religious Compliance Charter',
        },
      ],
      checklistItems: [
        {
          en: 'Festival calendar verified against local Udaya Tithi rules',
          hi: 'उत्सव पंचांग का स्थानीय उदयव्यापिनी तिथि नियमों से सत्यापन',
          bn: 'উৎসবের দিনপঞ্জিকা উদয়ব্যাপিনী তিথির নিয়মে পরীক্ষিত',
          sa: 'उत्सवपञ्जिकायाः उदयव्यापिनी-तिथिनियमानुसारेण प्रमाणीकरणम्',
        },
        {
          en: 'Temple website and digital notices updated with daily Muhurat and Rahu Kaal',
          hi: 'मंदिर सूचना पट्ट व पोर्टल पर दैनिक शुभ मुहूर्त एवं राहु काल का दैनिक अद्यतन',
          bn: 'মন্দির নোটিস বোর্ডে ও পোর্টালে প্রতিদিনের মুহূর্ত ও রাহু কাল প্রকাশ নিশ্চিত',
          sa: 'सूचनाफलके अन्तर्जाले च प्रतिदिनं शुभमुहूर्तस्य राहुकालस्य च प्रकाशनम्',
        },
      ],
    },
  },
};

