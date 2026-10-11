import type { ModuleRoleSOP } from './shastricTypes';

export const MODULE_ROLE_SOPS_B: Record<string, Record<string, ModuleRoleSOP>> = {
  PUROHIT_PORTAL: {
    PUROHIT: {
      moduleId: 'PUROHIT_PORTAL',
      moduleName: {
        en: 'Vedic Purohit Diary & Dakshina Portal',
        hi: 'वैदिक पुरोहित दैनिकी एवं दक्षिणा पोर्टल',
        bn: 'বৈদিক পুরোহিত ডায়েরি এবং দক্ষিণা পোর্টাল',
        sa: 'वैदिक-पुरोहित-दिनचर्या तथा दक्षिणा-विभागः',
      },
      role: 'PUROHIT',
      roleLabel: {
        en: 'Acharya / Purohit Sevadar',
        hi: 'आचार्य / पुरोहित सेवादार',
        bn: 'আচার্য / পুরোহিত সেবাদার',
        sa: 'आचार्यः / वेदविद्',
      },
      roleSummary: {
        en: 'Manages ritual assignments, performs Vedic sankalpas, and withdraws secured honorarium via DAKSHINA_ESCROW upon completing devotee pujas.',
        hi: 'पूजा अनुष्ठानों का प्रबंधन, वैदिक संकल्प उच्चारण एवं अनुष्ठान समाप्ति पर DAKSHINA_ESCROW से दक्षिणा प्राप्ति।',
        bn: 'পূজা ও যজ্ঞের শিডিউল পরিচালনা, বৈদিক সংকল্প পাঠ এবং পূজা সম্পন্ন হলে DAKSHINA_ESCROW থেকে সাম্মানিক গ্রহণ।',
        sa: 'पूजा-अनुष्ठानानां संचालनं, सङ्कल्पपाठः तथा DAKSHINA_ESCROW द्वारा दक्षिणा-स्वीकारः।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Review Scheduled Vedic Rituals & Devotee Gotras',
            hi: '१. आगामी पूजा अनुष्ठान एवं यजमान गोत्र विवरण की समीक्षा',
            bn: '১. নির্ধারিত পূজা ও যজমানের গোত্র-নক্ষত্র বিবরণ খতিয়ে দেখা',
            sa: '१. आगामि-पूजानां यजमान-गोत्रस्य च समीक्षणम्',
          },
          description: {
            en: 'Before each ritual, review devotee names, birth nakshatras, and specific sankalpa intentions logged in the portal.',
            hi: 'प्रत्येक अनुष्ठान से पूर्व यजमान के नाम, जन्म नक्षत्र एवं विशिष्ट संकल्प हेतु दर्ज विवरण का अध्ययन करें।',
            bn: 'প্রতিটি পূজার পূর্বে যজমানের নাম, জন্ম নক্ষত্র এবং বিশেষ সংকল্পের উদ্দেশ্য পোর্টাল থেকে দেখে নিন।',
            sa: 'अनुष्ठानात् पूर्वं यजमानस्य नाम, जन्म-नक्षत्रं, सङ्कल्पं च परिशीलयन्तु।',
          },
          actionRequired: {
            en: 'Check today’s calendar in Purohit Desk.',
            hi: 'पुरोहित डेस्क में आज की कार्यसूची देखें।',
            bn: 'পুরোহিত ডেস্কে আজকের সময়সূচি পরীক্ষা করুন।',
            sa: 'अद्यतन-दिनचर्यां पश्यन्तु।',
          },
          highlightedTerms: ['SANKALP'],
          complianceTag: 'Shastric Puja Sankalpa Vidhana',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Perform Seva & Complete Dakshina Escrow Payout',
            hi: '२. अनुष्ठान पूर्णता एवं दक्षिणा एस्क्रो (DAKSHINA_ESCROW) विमुक्ति',
            bn: '২. পূজা সমাপ্তি ও দক্ষিণা এসক্রো (DAKSHINA_ESCROW) থেকে অর্থ উত্তোলন',
            sa: '२. पूजा-समापनं दक्षिणा-न्यासस्य (DAKSHINA_ESCROW) विमुक्तिश्च',
          },
          description: {
            en: 'Once the pooja is solemnized and holy prasad is dispatched, mark the seva "Completed" to release guaranteed dakshina from escrow into your bank account.',
            hi: 'पूजा संपन्न होने एवं प्रसाद प्रेषण के उपरांत "Completed" चिह्नित करें, जिससे एस्क्रो से दक्षिणा सीधे आपके बैंक खाते में अंतरित हो जाए।',
            bn: 'পূজা সম্পন্ন ও প্রসাদ প্রেরণের পর "Completed" নির্বাচন করুন, যার ফলে এসক্রো তহবিল থেকে দক্ষিণা সরাসরি ব্যাংক অ্যাকাউন্টে জমা হবে।',
            sa: 'पूजा-समाप्तौ "Completed" इति कृत्वा दक्षिणां प्राप्नुवन्तु।',
          },
          actionRequired: {
            en: 'Mark booking completed to release funds.',
            hi: 'राशि विमुक्ति हेतु बुकिंग पूर्ण चिह्नित करें।',
            bn: 'টাকা প্রাপ্তির জন্য বুকিং সমাপ্ত হিসেবে মার্ক করুন।',
            sa: 'धनप्राप्तये पूर्तिं दर्शयन्तु।',
          },
          highlightedTerms: ['DAKSHINA_ESCROW'],
          complianceTag: 'Platform Fair Honorarium Guarantee',
        },
      ],
      checklistItems: [
        {
          en: 'Pure Shastric samagri checked with Bhandar storekeeper',
          hi: 'भंडार सेवादार से शुद्ध शास्त्रीय सामग्री का मिलान पूर्ण',
          bn: 'ভাণ্ডার সেবাদারের কাছ থেকে খাঁটি সামগ্রী সংগ্রহ সম্পন্ন',
          sa: 'भाण्डागारात् शुद्धानां पूजोपकरणानां प्राप्तिः',
        },
        {
          en: 'Direct electronic dakshina payout received without middleman deduction',
          hi: 'बिना किसी बिचौलिये के सीधे बैंक खाते में शत-प्रतिशत दक्षिणा प्राप्ति',
          bn: 'কোনো মধ্যস্বত্বভোগী ছাড়াই ১০০% দক্ষিণা ব্যাংক অ্যাকাউন্টে প্রাপ্তি',
          sa: 'सम्पूर्णा दक्षिणा साक्षात् बैंक-खाते प्राप्ता',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: GOSHALA_DESK
  // --------------------------------------------------------------------------
  GOSHALA_DESK: {
    SEVADAR: {
      moduleId: 'GOSHALA_DESK',
      moduleName: {
        en: 'Goshala Sanctuary & Gomata Health Records',
        hi: 'गौशाला अभयारण्य एवं गोमाता स्वास्थ्य अभिलेख',
        bn: 'গোশালা অভয়ারণ্য এবং গোমাতা স্বাস্থ্য বিবরণী',
        sa: 'गौशाला-अभयारण्यं गोमाता-स्वास्थ्य-विभागश्च',
      },
      role: 'SEVADAR',
      roleLabel: {
        en: 'Gau Sevadar / Veterinary Caretaker',
        hi: 'गौ सेवादार / पशु चिकित्सा सहायक',
        bn: 'গো সেবাদার / পশু পরিচর্যাকারী',
        sa: 'गोसेवकः / पशुरक्षकः',
      },
      roleSummary: {
        en: 'Monitors cattle diet, milk yields, herbal medicinal feedings, and logs daily health records for indigenous desi breeds (Gir, Sahiwal, Tharparkar).',
        hi: 'देशी गोवंश (गीर, साहीवाल, थारपारकर) के आहार, दुग्ध उत्पादन, पंचगव्य एवं स्वास्थ्य की दैनिक प्रविष्टि।',
        bn: 'দেশি গরুর (গির, সাহিওয়াল, থারপারকার) সুষম খাদ্য, দুধের পরিমাণ এবং দৈনিক স্বাস্থ্য পরীক্ষা তদারকি।',
        sa: 'गवां चारा-दुग्ध-स्वास्थ्य-सम्बन्धिनां दैनन्दिनानां विषयाणां लेखनम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Daily Sattvic Fodder & Panchagavya Monitoring',
            hi: '१. दैनिक सात्विक चारा एवं पंचगव्य निर्माण निगरानी',
            bn: '১. দৈনিক পুষ্টিকর ঘাস ও পঞ্চগব্য উৎপাদনের হিসাব রাখা',
            sa: '१. प्रतिदिनं सात्त्विक-घासस्य पञ्चगव्यस्य च निरीक्षणम्',
          },
          description: {
            en: 'Ensure every cow receives green fodder, jaggery, and mineral mixture, reserving pure A2 Gir ghee for Garbhagriha aartis and BHANDAR stock.',
            hi: 'सुनिश्चित करें कि प्रत्येक गाय को हरा चारा, गुड़ और खनिज मिले तथा गर्भगृह आरती व BHANDAR हेतु शुद्ध ए२ घी सुरक्षित रहे।',
            bn: 'প্রতিটি গরুর জন্য সবুজ ঘাস ও গুড় নিশ্চিত করুন এবং গর্ভগৃহের আরতি ও BHANDAR-এর জন্য খাঁটি এ২ ঘি সংরক্ষণ করুন।',
            sa: 'सर्वासु गोषु तृण-गुड़-प्रदानं तथा मन्दिर-आरती-निमित्तं गोघृत-संरक्षणम्।',
          },
          actionRequired: {
            en: 'Log feeding entries in Gau Seva Desk.',
            hi: 'गौ सेवा डेस्क में चारा वितरण दर्ज करें।',
            bn: 'গো সেবা ডেস্কে খাদ্যের হিসাব লিপিবদ্ধ করুন।',
            sa: 'गोसेवा-विभागे चारा-वितरणं लिखन्तु।',
          },
          highlightedTerms: ['BHANDAR'],
          complianceTag: 'Indigenous Breed Welfare',
        },
      ],
      checklistItems: [
        {
          en: 'RFID ear tags scanned and updated in live cattle register',
          hi: 'आर.एफ.आई.डी. टैग स्कैन कर गोमाता रजिस्टर अद्यतन',
          bn: 'আরএফআইডি ট্যাগ স্ক্যান করে গরুর রেজিস্ট্রি হালনাগাদ',
          sa: 'गो-सङ्केत-संख्यायाः अद्यतनीकरणं कृतम्',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: HUNDI_VAULT
  // --------------------------------------------------------------------------
  HUNDI_VAULT: {
    ACCOUNTANT: {
      moduleId: 'HUNDI_VAULT',
      moduleName: {
        en: 'Hundi & Golak Dual Custody Counting & Audit Vault',
        hi: 'हुंडी एवं गोलक दोहरी अभिरक्षा गणना व ऑडिट डेस्क',
        bn: 'হুন্ডি ও গোলক দ্বৈত-তত্ত্বাবধান গণনা ও অডিট ডেস্ক',
        sa: 'दानपेटिका-द्विकुञ्चिका-गणना-परीक्षण-विभागः',
      },
      role: 'ACCOUNTANT',
      roleLabel: {
        en: 'Primary Custodian / Chief Temple Accountant',
        hi: 'मुख्य अभिरक्षक / मुख्य मंदिर लेखाकार',
        bn: 'প্রধান রক্ষক / প্রধান মন্দির হিসাবরক্ষক',
        sa: 'मुख्य-कोषाधिकारी / मन्दिर-लेखाकारः',
      },
      roleSummary: {
        en: 'Responsible for breaking lead seals in witness presence, dual-key authentication, conducting denomination-wise currency counting, and auto-posting hundi cash into Treasury.',
        hi: 'साक्षी की उपस्थिति में सील तोड़ना, दोहरी कुंजी सत्यापन, मूल्यवर्ग अनुसार नोट-सिक्का गणना एवं ट्रेजरी लेजर में स्वतः प्रविष्टि दर्ज करना।',
        bn: 'সাক্ষীর উপস্থিতিতে সিল খোলা, ২-কী দ্বৈত পিন প্রমাণীকরণ, খুচরা নোট ও মুদ্রার সঠিক গণনা এবং ট্রেজারিতে সমন্বয়।',
        sa: 'साक्षिसमक्षं मुद्रोद्घाटनं, द्विकुञ्चिका-प्रमाणीकरणं, मुद्रा-गणना तथा कोष-पुस्तके समर्पणम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Lead Seal Verification & Vault Camera Check',
            hi: '१. लेड सील की प्रामाणिकता एवं सी.सी.टी.वी. रिकॉर्डिंग पुष्टि',
            bn: '১. লেড সিল নম্বর যাচাই ও সিসিটিভি সক্রিয়তা নিশ্চিতকরণ',
            sa: '१. मुद्रा-परीक्षणं तथा दूरचित्रवाहिनी-सक्रियता-जांचः',
          },
          description: {
            en: 'Inspect the physical lead seal of the Hundi box. Verify that the seal number matches the dispatch register and CCTV is recording.',
            hi: 'HUNDI दानपात्र की लेड सील का निरीक्षण करें। सुनिश्चित करें कि सील नंबर रजिस्टर से मेल खाता है और सीसीटीवी चालू है।',
            bn: 'HUNDI বক্সের সীলের নম্বর রেজিস্টারের সাথে মিলিয়ে দেখুন এবং অডিট সিসিটিভিতে রেকর্ড হচ্ছে কিনা নিশ্চিত করুন।',
            sa: 'दानपेटिकायाः मुद्रा-संख्यां पञ्जिकायां परीक्ष्य कार्यं प्रारभध्वम्।',
          },
          actionRequired: {
            en: 'Check tamper-evident seal and confirm Keyholder 1 PIN.',
            hi: 'सील अखंडता जाँचें और कीहोल्डर १ का पिन दर्ज करें।',
            bn: 'সিল অক্ষত আছে কিনা দেখে ১ম পিন দিন।',
            sa: 'प्रथम-कुञ्चिकायाः गुह्यसङ्केतं लिखन्तु।',
          },
          highlightedTerms: ['HUNDI', 'GOLAK'],
          complianceTag: 'Devaswom Dual Custody Protocol',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Denomination-Wise Currency & Bullion Tally',
            hi: '२. नोट-सिक्का एवं स्वर्ण-रजत मूल्यवर्ग वार गणना',
            bn: '২. নোট, কয়েন ও সোনা-রুপার সুনির্দিষ্ট তালিকাভুক্তিকরণ',
            sa: '२. रूप्यक-स्वर्ण-रजत-गणना-क्रमः',
          },
          description: {
            en: 'Tally ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes, all RBI coins, foreign notes, and gold/silver offerings with touch-optimized bundles.',
            hi: 'सभी भारतीय नोट, सिक्के, विदेशी मुद्रा एवं सोने-चांदी के आभूषणों की सटीक गणना करें।',
            bn: 'প্রতিটি মানের নোট ও কয়েন গণনা করে ডিজিটাল কাউন্টারে এন্ট্রি করুন।',
            sa: 'सर्वासां मुद्राणां तोलनं गणनां च संपादयन्तु।',
          },
          actionRequired: {
            en: 'Enter bundles in denomination matrix.',
            hi: 'मूल्यवर्ग सारणी में बंडल संख्या दर्ज करें।',
            bn: 'গণনা ম্যাট্রিক্সে সংখ্যা লিখুন।',
            sa: 'पत्रमुद्राणां संख्यां लिखन्तु।',
          },
          highlightedTerms: ['HUNDI'],
          complianceTag: 'RBI Currency Sorting Standard',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Dual Co-Signing & Auto-Treasury Posting',
            hi: '३. सह-हस्ताक्षर एवं केंद्रीय ट्रेजरी में प्रविष्टि',
            bn: '৩. দ্বৈত স্বাক্ষর ও মূল কোষাগারে অটো-পোস্টিং',
            sa: '३. सह-हस्ताक्षरम् तथा कोष-संयोजनम्',
          },
          description: {
            en: 'Both custodians co-sign the attestation voucher. Click "Co-Sign & Post to Treasury" to sync income under Section 115BBC audit.',
            hi: 'दोनों अभिरक्षक प्रमाणपत्र पर सह-हस्ताक्षर करें। "Post to Treasury" दबाकर राशि मुख्य लेजर में जोड़ें।',
            bn: 'উভয় রক্ষক সত্যায়নে স্বাক্ষর করে ট্রেজারিতে জমা নিশ্চিত করুন।',
            sa: 'उभौ कुञ्चिकाधारकौ हस्ताक्षरेण प्रमाणीकृत्य कोषपुस्तके योजयेताम्।',
          },
          actionRequired: {
            en: 'Generate and print the bilingual audit voucher.',
            hi: 'ऑडिट प्रमाणक मुद्रित करें।',
            bn: 'অডিট ভাউচার প্রিন্ট করুন।',
            sa: 'परीक्षणपत्रं मुद्रयन्तु।',
          },
          highlightedTerms: ['CORPUS_FUND', 'HUNDI'],
          complianceTag: 'Income Tax Sec 115BBC Compliance',
        },
      ],
      checklistItems: [
        {
          en: 'Lead seal serial number matched with Register before unlocking',
          hi: 'खोलने से पूर्व लेड सील सीरियल नंबर का रजिस्टर से मिलान पूर्ण',
          bn: 'খোলার আগে সিলের নম্বর রেজিস্টারের সাথে মিলিয়ে নেওয়া হয়েছে',
          sa: 'मुद्रायाः क्रमसंख्या पञ्जिकायां संसत्यापिता',
        },
        {
          en: 'Dual Custodian PINs entered independently without sharing credentials',
          hi: 'दोनों अभिरक्षकों ने स्वतंत्र रूप से गोपनीय पिन दर्ज किया',
          bn: 'উভয় অভিভাবক আলাদাভাবে নিজ নিজ পিন প্রদান করেছেন',
          sa: 'उभाभ्यां विश्वस्ताभ्यां पृथक्-पृथक् गुह्यसङ्केतः प्रविष्टः',
        },
        {
          en: 'Physical currency sorted, counted, and bundled under CCTV',
          hi: 'नगदी की छँटाई एवं बंडलिंग पूरी तरह सीसीटीवी की निगरानी में संपन्न',
          bn: 'সিসিটিভি ক্যামেরার অধীনে নগদ টাকা গণনা ও বান্ডিল করা হয়েছে',
          sa: 'सर्वं धनं दूरचित्रवाहिनी-दृष्टौ एव गणनम् सम्पन्नम्',
        },
        {
          en: 'Printable audit voucher signed by both keyholders and filed',
          hi: 'मुद्रित ऑडिट प्रमाणक पर दोनों कीहोल्डर्स के हस्ताक्षर सुरक्षित',
          bn: 'মুদ্রিত অডিট ভাউচারে দুই রক্ষকের স্বাক্ষর সম্পন্ন',
          sa: 'मुद्रित-प्रमाणपत्रे उभयोः हस्ताक्षरम् सुरक्षितम्',
        },
      ],
    },
    TRUSTEE: {
      moduleId: 'HUNDI_VAULT',
      moduleName: {
        en: 'Hundi & Golak Dual Custody Counting & Audit Vault',
        hi: 'हुंडी एवं गोलक दोहरी अभिरक्षा गणना व ऑडिट डेस्क',
        bn: 'হুন্ডি ও গোলক দ্বৈত-তত্ত্বাবধান গণনা ও অডিট ডেস্ক',
        sa: 'दानपेटिका-द्विकुञ्चिका-गणना-परीक्षण-विभागः',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Trustee Witness / Managing Custodian',
        hi: 'न्यासी साक्षी / प्रबंधकीय अभिरक्षक',
        bn: 'ট্রাস্টি সাক্ষী / পরিচালন রক্ষক',
        sa: 'न्यासी-साक्षी / प्रबन्धक-संरक्षकः',
      },
      roleSummary: {
        en: 'Serves as secondary custodial witness with Key 2. Exercises fiduciary oversight to prevent diversion of devotee offerings and authorizes bullion pouch seals.',
        hi: 'कुंजी २ के साथ द्वितीय साक्षी के रूप में सेवा। भक्तों के गुप्त दान की शुचिता एवं स्वर्ण-रजत आभूषणों की सुरक्षा सुनिश्चित करना।',
        bn: 'দ্বিতীয় অভিভাবক হিসাবে তদারকি, দানকৃত অলঙ্কারাদির সুরক্ষা এবং সীলমোহরের বৈধতা নিশ্চিতকরণ।',
        sa: 'द्वितीयकुञ्चिका-धारकरूपेण सर्वकार्याणां प्रत्यक्षदर्शनं संरक्षणं च न्यासिनां धर्मः।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Vault Witness Authorization (Key 2 PIN)',
            hi: '१. वॉल्ट साक्षी प्रमाणीकरण (कुंजी २ पिन)',
            bn: '১. ভল্ট সাক্ষী অনুমোদন (২য় কী পিন)',
            sa: '१. द्वितीयकुञ्चिकायाः साक्ष्याङ्कनम्',
          },
          description: {
            en: 'Verify that the Hundi box was transported intact. Input Trustee Key 2 PIN to unlock the counting table in the secure CCTV room.',
            hi: 'पुष्टि करें कि HUNDI पात्र अखंड आया है। सुरक्षित कक्ष में टेबल खोलने के लिए कुंजी २ पिन दर्ज करें।',
            bn: 'HUNDI অক্ষত অবস্থায় আনা হয়েছে দেখে ২য় পিন প্রদান করুন।',
            sa: 'दानपेटिका सुरक्षिता अस्ति इति ज्ञात्वा द्वितीय-पिन-सङ्ख्यां योजयन्तु।',
          },
          actionRequired: {
            en: 'Authorize Keyholder 2 credentials.',
            hi: 'कुंजी २ का अधिकार सत्यापित करें।',
            bn: '২য় চাবির অনুমোদন দিন।',
            sa: 'द्वितीय-अधिकारं प्रमाणीकुर्वन्तु।',
          },
          highlightedTerms: ['HUNDI'],
          complianceTag: 'Trust Deed Fiduciary Clause',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Bullion & Precious Items Inspection',
            hi: '२. स्वर्ण-रजत एवं कीमती आभूषणों का भौतिक निरीक्षण',
            bn: '২. স্বর্ণ ও রৌপ্য অলঙ্কারের প্রত্যক্ষ ওজন ও যাচাই',
            sa: '२. सुवर्ण-रौप्य-आभरणानां प्रत्यक्ष-परीक्षणम्',
          },
          description: {
            en: 'Witness digital weighing of gold chains, silver coins, and loose gemstones. Ensure precious items are packed in tamper-evident sealed pouches for RATNA_BHANDAR transfer.',
            hi: 'सोने की चेन, चांदी के छत्र व सिक्कों का वजन अपनी उपस्थिति में करवाएं और सील बंद थैली में RATNA_BHANDAR हेतु रखें।',
            bn: 'সোনার হার ও রুপার সামগ্রী নিজের সামনে মেপে RATNA_BHANDAR ভাণ্ডারে স্থানান্তরের জন্য সীল করুন।',
            sa: 'सुवर्णाभरणानां तोलनं प्रत्यक्षं दृष्ट्वा RATNA_BHANDAR विभागार्थं मुद्रां कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Review bullion weight in Tab 2.',
            hi: 'स्वर्ण-रजत वजन की पुष्टि करें।',
            bn: 'অলঙ্কারের ওজন নিশ্চিত করুন।',
            sa: 'स्वर्णभारं पश्यन्तु।',
          },
          highlightedTerms: ['RATNA_BHANDAR', 'HUNDI'],
          complianceTag: 'Sacred Bullion Custody Code',
        },
      ],
      checklistItems: [
        {
          en: 'Personal physical presence maintained throughout the entire counting session',
          hi: 'पूरी गणना प्रक्रिया के दौरान व्यक्तिगत भौतिक उपस्थिति सुनिश्चित',
          bn: 'পুরো গণনা প্রক্রিয়া চলাকালীন ব্যক্তিগত শারীরিক উপস্থিতি নিশ্চিত',
          sa: 'सम्पूर्ण-गणना-काले प्रत्यक्ष-उपस्थितिः कृता',
        },
        {
          en: 'Bullion items sealed in tamper-proof bags for transfer to Ratna Bhandar',
          hi: 'रत्न भंडार स्थानांतरण हेतु आभूषण छेड़छाड़-रोधी बैग में सीलबंद',
          bn: 'রত্ন ভাণ্ডারে স্থানান্তরের জন্য মূল্যবান দ্রব্য সীল করা হয়েছে',
          sa: 'रत्नभाण्डागारे प्रेषणाय आभरणानि मुद्रित-स्यूते सुरक्षितानि',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: RATNA_BHANDAR
  // --------------------------------------------------------------------------
  RATNA_BHANDAR: {
    TRUSTEE: {
      moduleId: 'RATNA_BHANDAR',
      moduleName: {
        en: 'Ratna Bhandar (Sacred Assets, Deity Ornaments & Bullion Vault)',
        hi: 'रत्न भंडार (भगवान के आभूषण, विग्रह एवं बहुमूल्य संपत्ति डेस्क)',
        bn: 'রত্ন ভাণ্ডার (দেববিগ্রহের অলঙ্কার, অষ্টধাতু ও অমূল্য সম্পদ ডেস্ক)',
        sa: 'रत्नभाण्डागारम् (दिव्याभरणाष्टधातुविग्रहकोषः)',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Custodian Trustee / Board Custody Lead',
        hi: 'संरक्षक न्यासी / बोर्ड अभिरक्षा प्रमुख',
        bn: 'সংরক্ষক ট্রাস্টি / বোর্ড অভিভাবক প্রধান',
        sa: 'संरक्षक-न्यासी / पञ्चप्रमुखः',
      },
      roleSummary: {
        en: 'Has primary custody of sanctum jewels, crowns, and antique vigrahas. Conducts mandatory periodic physical audits, weight verifications, and authorizes movements between Garbhagriha, Strong Room, and Bank Locker.',
        hi: 'देवताओं के मुकुट, स्वर्ण हार व विग्रहों की सर्वोच्च अभिरक्षा। अनिवार्य भौतिक ऑडिट, वजन सत्यापन तथा गर्भगृह-स्ट्रॉन्ग रूम-बैंक लॉकर स्थानांतरण का अनुमोदन।',
        bn: 'শ্রীবিগ্রহের স্বর্ণমুকুট, অলঙ্কার ও অষ্টধাতু মূর্তির সর্বোচ্চ তত্ত্বাবধান। নিয়মিত শারীরিক অডিট, ওজন পরিমাপ এবং স্থান পরিবর্তনের অনুমোদনকারী।',
        sa: 'भगवतः सुवर्णमुकुट-दिव्याभरणानां विग्रहाणां च प्रधान-संरक्षणम्। नियतकालिक-भौतिक-तोलनं तथा स्थानपरिवर्तन-स्वीकारः।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Calibrated Physical Weighing & Gross vs Net Metal Verification',
            hi: '१. कैलिब्रेटेड डिजिटल तराजू पर वास्तविक तोलन एवं सकल-शुद्ध धातु मिलान',
            bn: '১. ডিজিটাল স্কেলে বাস্তব ওজন ও খাঁটি ধাতুর অনুপাত যাচাই',
            sa: '१. सूक्ष्म-मानदण्डेन वास्तविक-तोलनं धातु-शुद्धता-परीक्षणं च',
          },
          description: {
            en: 'Weigh each sacred asset on a certified dual-range digital scale. Compare Gross Weight and Net Precious Metal Weight against the master RATNA_BHANDAR register.',
            hi: 'प्रत्येक आभूषण व विग्रह को प्रमाणित डिजिटल तराजू पर तौलें। सकल वजन और शुद्ध धातु वजन की तुलना RATNA_BHANDAR रजिस्टर से करें।',
            bn: 'প্রতিটি অলঙ্কার ও বিগ্রহ নিখুঁত ওজন মাপনীতে মেপে RATNA_BHANDAR রেজিস্টারের সাথে মিলিয়ে দেখুন।',
            sa: 'प्रतिवस्तु सूक्ष्म-मानदण्डेन तोलयित्वा RATNA_BHANDAR पञ्जिकया सह मिलयन्तु।',
          },
          actionRequired: {
            en: 'Record verified gross and net weights in grams.',
            hi: 'सत्यापित वजन ग्राम में दर्ज करें।',
            bn: 'যাচাইকৃত ওজন গ্রামে লিখুন।',
            sa: 'सत्यापित-भारं लिखन्तु।',
          },
          highlightedTerms: ['RATNA_BHANDAR'],
          complianceTag: 'Trust Act Sec 36 Asset Safety',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Trustee PIN Authentication for Audit Sign-Off',
            hi: '२. ऑडिट समापन हेतु न्यासी गोपनीय पिन प्रमाणीकरण',
            bn: '২. অডিট চূড়ান্তকরণে ট্রাস্টি গোপন পিন যাচাই',
            sa: '२. परीक्षण-समाप्तये न्यासी-गुह्यसङ्केत-प्रवेशः',
          },
          description: {
            en: 'Click "Perform Physical Audit" on the asset card. Enter your 4-digit Trustee PIN to digitally sign the affidavit confirming you inspected and weighed the item today.',
            hi: 'एसेट कार्ड पर "Perform Physical Audit" दबाएँ। आज आपने इसे स्वयं देखा व तौला है, इस आशय का शपथ पत्र पिन द्वारा प्रमाणित करें।',
            bn: '"Perform Physical Audit" এ ক্লিক করে ৪-সংখ্যার পিন দিয়ে প্রত্যয়ন করুন যে আপনি আজ এটি সচক্ষে দেখেছেন ও মেপেছেন।',
            sa: '"Perform Physical Audit" क्लिक् कृत्वा चतुर्अङ्कीयं पिन-सङ्ख्यां योजयित्वा शपथपत्रं प्रमाणीकुर्वन्तु।',
          },
          actionRequired: {
            en: 'Enter Trustee PIN and accept sworn declaration.',
            hi: 'पिन दर्ज कर घोषणा स्वीकार करें।',
            bn: 'পিন দিয়ে ঘোষণা গ্রহণ করুন।',
            sa: 'सङ्केतं दत्त्वा प्रतिज्ञां स्वीकुर्वन्तु।',
          },
          highlightedTerms: ['RATNA_BHANDAR'],
          complianceTag: 'Digital Trust Evidence Code',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Alankara Movement Protocol (Sanctum vs Safe vs Bank Locker)',
            hi: '३. श्रृंगार स्थानांतरण नियम (गर्भगृह, स्ट्रॉन्ग रूम व बैंक लॉकर)',
            bn: '৩. অলঙ্কার স্থানান্তরের বিধি (গর্ভগৃহ, স্ট্রং রুম ও ব্যাংক লকার)',
            sa: '३. आभरण-स्थानान्तरण-नियमः (गर्भगृह-सुरक्षाकक्ष-कोष-स्थानम्)',
          },
          description: {
            en: 'During major festivals (Janmashtami, Navratri, Shivratri), authorize movement of Suvarna Mukut from Strong Room to Garbhagriha Alankara, logging escort security details.',
            hi: 'प्रमुख उत्सवों में स्ट्रॉन्ग रूम से गर्भगृह में स्वर्ण मुकुट आदि लाने हेतु सुरक्षा विवरण सहित स्थानांतरण लॉग अद्यतन करें।',
            bn: 'মহোৎসবে স্ট্রং রুম থেকে গর্ভগৃহে বিগ্রহের অলঙ্কার আনয়নের সময় অবস্থান আপডেট করুন।',
            sa: 'उत्सवेषु सुरक्षाकक्षतः गर्भगृहे आभरणानयने विवरणं पञ्जीकुर्वन्तु।',
          },
          actionRequired: {
            en: 'Update current location badge in asset record.',
            hi: 'स्थान बैज अद्यतन करें।',
            bn: 'অবস্থান আপডেট করুন।',
            sa: 'स्थान-विवरणं परिवर्तयन्तु।',
          },
          highlightedTerms: ['RATNA_BHANDAR'],
          complianceTag: 'Sanctum Security Protocol',
        },
      ],
      checklistItems: [
        {
          en: 'Calibrated jewelers scale zeroed and tested with standard calibration weights',
          hi: 'स्वर्ण तराजू शून्य पर सेट एवं मानक वजन से पूर्व-परीक्षित',
          bn: 'ডিজিটাল স্বর্ণ পরিমাপক স্কেল প্রমিত বাটখারা দিয়ে পরীক্ষা করা হয়েছে',
          sa: 'मानदण्डः शुद्धतया शून्यस्थाने परीक्षितः',
        },
        {
          en: 'Net precious metal weight recorded separately from gemstones and lac',
          hi: 'रत्नों एवं लाख के वजन को घटाकर केवल शुद्ध धातु का भार दर्ज',
          bn: 'রত্ন ও ভেতরের লাক্ষার ওজন বাদ দিয়ে প্রকৃত ধাতুর ওজন লিপিবদ্ধ',
          sa: 'रत्नानि विहाय केवलं शुद्ध-धातु-भारः पृथक् लिखितः',
        },
        {
          en: 'Physical audit confirmed with personal Trustee PIN entry',
          hi: 'व्यक्तिगत न्यासी पिन दर्ज कर भौतिक ऑडिट की पुष्टि संपन्न',
          bn: 'ব্যক্তিগত ট্রাস্টি পিন দিয়ে সশরীরে উপস্থিতির অডিট সম্পন্ন',
          sa: 'व्यक्तिगत-पिन-सङ्ख्यया वास्तविक-परीक्षणं प्रमाणीकृतम्',
        },
        {
          en: 'All custody movements between Sanctum, Safe, and Bank Locker logged',
          hi: 'गर्भगृह, तिजोरी और बैंक लॉकर के मध्य आभूषणों का आवागमन पूर्णतः दर्ज',
          bn: 'গর্ভগৃহ, সেফ ও ব্যাংক লকারের মধ্যে যেকোনো স্থানান্তরের পূর্ণ বিবরণ সংরক্ষিত',
          sa: 'गर्भगृह-तिजोरी-बैंकस्थानानां मध्ये गमनागमनं पञ्जीकृतम्',
        },
      ],
    },
    ACCOUNTANT: {
      moduleId: 'RATNA_BHANDAR',
      moduleName: {
        en: 'Ratna Bhandar (Sacred Assets, Deity Ornaments & Bullion Vault)',
        hi: 'रत्न भंडार (भगवान के आभूषण, विग्रह एवं बहुमूल्य संपत्ति डेस्क)',
        bn: 'রত্ন ভাণ্ডার (দেববিগ্রহের অলঙ্কার, অষ্টধাতু ও অমূল্য সম্পদ ডেস্ক)',
        sa: 'रत्नभाण्डागारम् (दिव्याभरणाष्टधातुविग्रहकोषः)',
      },
      role: 'ACCOUNTANT',
      roleLabel: {
        en: 'Trust Accountant / Asset Registrar',
        hi: 'ट्रस्ट लेखाकार / संपत्ति पंजीयक',
        bn: 'ট্রাস্ট হিসাবরক্ষক / সম্পদ নিবন্ধক',
        sa: 'न्यास-लेखाकारः / सम्पत्ति-पञ्जीयकः',
      },
      roleSummary: {
        en: 'Maintains the permanent fixed asset ledger for precious metals and stones, reconciles book value with prevailing bullion market rates, and updates CBDT Form 10BD asset registers.',
        hi: 'बहुमूल्य धातु व रत्नों का स्थायी बहीखाता रखना, बाजार भाव से मूल्यांकन मिलाना एवं फॉर्म 10BD में संपत्ति विवरण का संधारण।',
        bn: 'মূল্যবান ধাতু ও রত্নালঙ্কারের স্থায়ী হিসাব খতিয়ান পরিচালনা এবং সিবিডিটি ফর্ম ১০বিডি অনুদান রেজিস্ট্রির সাথে সমন্বয়।',
        sa: 'स्थिर-सम्पत्ति-पञ्जिकायाः संरक्षणं, बाजारमूल्य-समीक्षा तथा आयकर-विवरणी-संयोजनम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Reconcile Book Valuation with Daily Metal Rates',
            hi: '१. दैनिक सर्राफा बाजार भाव से बहीखाता मूल्यांकन का मिलान',
            bn: '১. দৈনিক বাজারদর অনুযায়ী স্বর্ণ ও রৌপ্য অলঙ্কারের আনুমানিক মূল্য সমন্বয়',
            sa: '१. प्रतिदिनस्य स्वर्ण-रौप्य-मूल्येन सम्पत्ति-मूल्य-समीक्षणम्',
          },
          description: {
            en: 'Calculate current asset market value using active 24K/22K gold and fine silver rates while maintaining historical donation book cost.',
            hi: '२४ कैरेट व २२ कैरेट सोने तथा चांदी के चालू भाव अनुसार एसेट्स का बाजार मूल्य आकलित करें।',
            bn: 'চলতি বাজার দর হিসাব করে ট্রাস্টের ব্যালেন্স শীটের জন্য সম্পদের সঠিক মূল্য নির্ধারণ করুন।',
            sa: 'स्वर्णस्य रौप्यस्य च चालू-मूल्यम् अनुसृत्य सम्पत्ति-मूल्यं निर्धारयन्तु।',
          },
          actionRequired: {
            en: 'Review top metrics in Ratna Bhandar dashboard.',
            hi: 'डैशबोर्ड में कुल वजन व मूल्यांकन देखें।',
            bn: 'ড্যাশবোর্ডে মোট ওজন ও মূল্য পর্যবেক্ষণ করুন।',
            sa: 'डैशबोर्ड-भागे कुल-भारं मूल्यं च पश्यन्तु।',
          },
          highlightedTerms: ['RATNA_BHANDAR', 'CORPUS_FUND'],
          complianceTag: 'Institute of Chartered Accountants (ICAI) Trust Guidance',
        },
      ],
      checklistItems: [
        {
          en: 'Asset register tags matched with physical engravings / tamper tags',
          hi: 'एसेट टैग का भौतिक आभूषणों के टैग से मिलान पूर्ण',
          bn: 'এসেট রেজিস্টারের ট্যাগ নম্বরের সাথে ফিজিক্যাল ট্যাগের মিল নিশ্চিত',
          sa: 'पञ्जिका-संख्यायाः वास्तविक-टैग-संकेतेन सह मिलनम्',
        },
      ],
    },
  },
};
