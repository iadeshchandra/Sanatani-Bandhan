import type { ModuleRoleSOP } from './shastricTypes';

export const MODULE_ROLE_SOPS_A: Record<string, Record<string, ModuleRoleSOP>> = {
  // --------------------------------------------------------------------------
  // MODULE: SMART_BHANDAR
  // --------------------------------------------------------------------------
  SMART_BHANDAR: {
    SEVADAR: {
      moduleId: 'SMART_BHANDAR',
      moduleName: {
        en: 'Smart Bhandar, Recipe BOM & Auto-Procurement',
        hi: 'स्मार्ट भंडार, रेसिपी बी.ओ.एम. एवं खरीद डेस्क',
        bn: 'স্মার্ট ভাণ্ডার, রেসিপি বি.ও.এম. এবং সংগ্রহ ডেস্ক',
        sa: 'स्मार्ट-भाण्डागारम्, सामग्रीप्रमाणं तथा क्रयविभागः',
      },
      role: 'SEVADAR',
      roleLabel: {
        en: 'Bhandar Sevadar / Storekeeper',
        hi: 'भंडार सेवादार / भंडार रक्षक',
        bn: 'ভাণ্ডার সেবাদার / পরিদর্শক',
        sa: 'भाण्डागार-सेवाव्रती',
      },
      roleSummary: {
        en: 'Responsible for physical stock verification, weighing raw grains and dairy, logging inward deliveries via GRN, and reporting low stock.',
        hi: 'सामग्री के भौतिक वजन, शुद्धता निरीक्षण, जी.आर.एन. प्रविष्टि एवं कम स्टॉक की तत्काल सूचना हेतु उत्तरदायी।',
        bn: 'পণ্যের ওজন ও শুদ্ধতা যাচাই, জি.আর.এন.-এর মাধ্যমে ভাণ্ডারে গ্রহণ এবং ঘাটতি সম্পর্কে রিপোর্ট করার দায়িত্ব।',
        sa: 'द्रव्याणां तोलनं, शुद्धता-परीक्षणं, स्वीकार-पत्र-लेखनं च भाण्डागार-रक्षकस्य मुख्यं दायित्वम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Inward Stock Weighing & Quality Check',
            hi: '१. आगमन सामग्री का भौतिक तोलन एवं शुद्धता परीक्षण',
            bn: '১. পণ্য আগমনের পর ওজন স্কেলে সঠিক পরিমাপ নিশ্চিতকরণ',
            sa: '१. आगतद्रव्याणां तोलनं शुद्धता-परीक्षणं च',
          },
          description: {
            en: 'When vendor delivers goods to BHANDAR, weigh on calibrated scale and inspect moisture, aroma, and seal.',
            hi: 'जब विक्रेता BHANDAR में सामान पहुँचाए, तो धर्मकांटे पर वजन करें और नमी, सुगंध व सील की जाँच करें।',
            bn: 'পণ্য আগমনের পর ওজন স্কেলে সঠিক পরিমাপ নিশ্চিত করুন ও BHANDAR প্রকোষ্ঠে ভেজালমুক্ত খাঁটি উপাদান যাচাই করুন।',
            sa: 'यदा विक्रेता BHANDAR स्थाने द्रव्याणि समर्पयेत्, तदा मानदण्डेन तोलनं कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Check vendor challan against physical quantity.',
            hi: 'चालान से वास्तविक वजन का मिलान करें।',
            bn: 'চালানের সাথে প্রকৃত প্রাপ্ত পরিমাণ মিলিয়ে দেখুন।',
            sa: 'चालान-पत्रेण सह वास्तविक-परिमाणस्य संमिलनम्।',
          },
          highlightedTerms: ['BHANDAR'],
          complianceTag: 'Internal Quality Protocol',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Accept GRN & Double-Entry Treasury Sync',
            hi: '२. जी.आर.एन. (GRN) स्वीकारें एवं स्वतः ट्रेजरी प्रविष्टि',
            bn: '২. চালানের সাথে আইটেম মিলিয়ে "Accept GRN" সম্পন্নকরণ',
            sa: '२. स्वीकार-पत्रम् (GRN) अङ्गीकरणं च',
          },
          description: {
            en: 'Click "Accept GRN" with valid vendor challan number. This increases physical stock and posts an expense to Treasury.',
            hi: 'चालान संख्या दर्ज कर "Accept GRN" बटन दबाएँ। इससे भौतिक स्टॉक बढ़ेगा और ट्रेजरी में खर्च दर्ज होगा।',
            bn: 'সামগ্রী গ্রহণের পর চালানের নম্বর দিয়ে "Accept GRN" বাটনে চাপ দিন, যা সরাসরি ট্রেজারি লেজারে খরচ হিসাবে যুক্ত হবে।',
            sa: '"Accept GRN" इति प्रपत्रं स्वीकृत्य भाण्डागारे संख्यावर्धनेन सह कोषव्ययं लिखन्तु।',
          },
          actionRequired: {
            en: 'Trigger 1-click GRN reconciliation in Tab 4.',
            hi: 'टैब ४ में १-क्लिक जी.आर.एन. समाधान पूरा करें।',
            bn: 'ট্যাব ৪-এ গিয়ে ১-ক্লিকে জি.আর.এন. সম্পন্ন করুন।',
            sa: 'चतुर्थ-भागे स्वीकार-पत्र-समाधानं कुर्वन्तु।',
          },
          highlightedTerms: ['GRN'],
          complianceTag: 'Mandir Ledger Protocol',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Recipe BOM Stock Reservation for Pujas',
            hi: '३. पूजा एवं अन्नदान हेतु रेसिपी बी.ओ.एम. (RECIPE_BOM) स्टॉक आरक्षण',
            bn: '৩. পূজা ও অন্নদানের জন্য রেসিপি বি.ও.এম. (RECIPE_BOM) স্টক বরাদ্দ',
            sa: '३. पूजानिमित्तं सामग्री-प्रमाणकम् (RECIPE_BOM) आरक्षणम्',
          },
          description: {
            en: 'Verify required ingredients for upcoming Sankalps using RECIPE_BOM and reserve stock so it is not consumed elsewhere.',
            hi: 'आगामी संकल्पों के लिए RECIPE_BOM के माध्यम से सामग्री जाँचें और स्टॉक आरक्षित करें।',
            bn: 'আসন্ন পূজার জন্য RECIPE_BOM ব্যবহার করে প্রয়োজনীয় উপাদান পরীক্ষা করুন এবং স্টক লক করে রাখুন।',
            sa: 'आगामि-पूजानां कृते RECIPE_BOM अनुसृत्य द्रव्याणि आरक्षितानि कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Reserve batch in Recipe Engine tab.',
            hi: 'रेसिपी इंजन टैब में बैच आरक्षित करें।',
            bn: 'রেসিপি ইঞ্জিন ট্যাবে গিয়ে ব্যাচ রিজার্ভ করুন।',
            sa: 'सामग्री-इञ्जन-भागे आरक्षणं कुर्वन्तु।',
          },
          highlightedTerms: ['RECIPE_BOM', 'SANKALP'],
          complianceTag: 'Shastric Proportion Rule',
        },
      ],
      checklistItems: [
        {
          en: 'Physical weight verified against vendor challan slip',
          hi: 'विक्रेता चालान से वास्तविक वजन का सत्यापन पूर्ण',
          bn: 'সরবরাহকারী চালানের সাথে প্রকৃত ওজন যাচাই সম্পন্ন',
          sa: 'विक्रेतृ-पत्रेण सह वास्तविक-तोलन-सत्यापनं सम्पन्नम्',
        },
        {
          en: 'GRN accepted and auto-synced to Treasury',
          hi: 'जी.आर.एन. स्वीकार कर ट्रेजरी में स्वतः प्रविष्टि दर्ज',
          bn: 'জি.আর.এন. অনুমোদিত ও ট্রেজারিতে সমন্বিত',
          sa: 'स्वीकार-पत्रम् अङ्गीकृत्य कोषविभागे संयोजितम्',
        },
        {
          en: 'Storage in labeled airtight bins in Bhandar Room',
          hi: 'भंडार कक्ष में सुरक्षित एवं नामांकित पेटियों में भंडारण',
          bn: 'ভাণ্ডার কক্ষে লেবেলযুক্ত বায়ুরোধী পাত্রে সংরক্ষণ',
          sa: 'भाण्डागारे नामचिह्नितेषु पात्रेषु संरक्षणम्',
        },
      ],
    },
    TRUSTEE: {
      moduleId: 'SMART_BHANDAR',
      moduleName: {
        en: 'Smart Bhandar, Recipe BOM & Auto-Procurement',
        hi: 'स्मार्ट भंडार, रेसिपी बी.ओ.एम. एवं खरीद डेस्क',
        bn: 'স্মার্ট ভাণ্ডার, রেসিপি বি.ও.এম. এবং সংগ্রহ ডেস্ক',
        sa: 'स्मार्ट-भाण्डागारम्, सामग्रीप्रमाणं तथा क्रयविभागः',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Master Trustee / Board Member',
        hi: 'प्रधान न्यासी / बोर्ड सदस्य',
        bn: 'প্রধান ট্রাস্টি / বোর্ড সদস্য',
        sa: 'प्रधान-न्यासी / पञ्चप्रमुखः',
      },
      roleSummary: {
        en: 'Authorizes high-value procurement orders, audits inventory consumption variances, and ensures sattvic supply chain transparency.',
        hi: 'उच्च-मूल्य खरीद आदेशों की स्वीकृति, सामग्री खपत का त्रैमासिक ऑडिट एवं आपूर्ति श्रृंखला की पवित्रता सुनिश्चित करना।',
        bn: 'উচ্চমূল্যের ক্রয়াদেশ অনুমোদন, সামগ্রী খরচের তদারকি এবং ভাণ্ডারের সততা ও স্বচ্ছতা নিশ্চিতকরণ।',
        sa: 'उच्चमूल्य-क्रयाणां स्वीकरणं, व्यय-निरीक्षणं, सात्त्विक-परंपरायाः रक्षणं च न्यासिनां कार्यम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Vendor Rate Contract & Credit Term Approval',
            hi: '१. विक्रेता दर अनुबंध एवं भुगतान शर्तों का अनुमोदन',
            bn: '১. সরবরাহকারীর দরপত্র ও বাকির মেয়াদ অনুমোদন',
            sa: '१. विक्रेतृ-दर-स्वीकरणं तथा ऋणकाल-निर्धारणम्',
          },
          description: {
            en: 'Review vendor pricing for Gir Cow Ghee, Govindobhog rice, and herbs. Ensure payment terms comply with Trust policy.',
            hi: 'देशी गाय के घी, चावल एवं हवन द्रव्यों के दरों की समीक्षा करें तथा ट्रस्ट नीति अनुसार भुगतान शर्तें तय करें।',
            bn: 'খাঁটি ঘৃত ও সুগন্ধি চালের বাজারদর যাচাই করে ট্রাস্টের নিয়ম অনুযায়ী পরিশোধের শর্ত অনুমোদন করুন।',
            sa: 'गोघृतस्य तण्डुलानां च मूल्यानि समीक्ष्य ट्रस्ट-नियमानुसारेण धनप्रदानव्यवस्थां कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Approve vendor contracts in Tab 3.',
            hi: 'टैब ३ में विक्रेता अनुबंध अनुमोदित करें।',
            bn: 'ট্যাব ৩-এ সরবরাহকারীর চুক্তি অনুমোদন করুন।',
            sa: 'तृतीयभागे विक्रेतृस्वीकृतिं कुर्वन्तु।',
          },
          highlightedTerms: ['BHANDAR'],
          complianceTag: 'Trust Governance Code',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Audit Inventory Variance & Treasury Deductions',
            hi: '२. भंडार स्टॉक अंतर एवं ट्रेजरी खर्च का मासिक ऑडिट',
            bn: '২. ভাণ্ডারের সামগ্রীর হিসাব ও ট্রেজারি ব্যয়ের অডিট',
            sa: '२. भाण्डागार-व्ययस्य तथा कोषनिर्गमस्य मासिक-परीक्षणम्',
          },
          description: {
            en: 'Match physical stock in BHANDAR against GRN postings to detect any unauthorized wastage or theft.',
            hi: 'BHANDAR के भौतिक स्टॉक का GRN प्रविष्टियों से मिलान करें ताकि किसी रिसाव या बर्बादी को रोका जा सके।',
            bn: 'BHANDAR-এর প্রকৃত স্টক এবং GRN নথির সাথে ব্যয় মিলিয়ে কোনো অপচয় হচ্ছে কিনা তা অডিট করুন।',
            sa: 'BHANDAR स्थितेन द्रव्येण सह GRN प्रपत्रं संवीक्ष्य अव्ययं निवारयन्तु।',
          },
          actionRequired: {
            en: 'Review monthly GRN reports in Tab 4.',
            hi: 'टैब ४ में मासिक जी.आर.एन. रिपोर्ट देखें।',
            bn: 'ট্যাব ৪-এ মাসিক জি.আর.এন. রিপোর্ট পর্যবেক্ষণ করুন।',
            sa: 'चतुर्थभागे प्रतिवेदनं पश्यन्तु।',
          },
          highlightedTerms: ['BHANDAR', 'GRN'],
          complianceTag: 'Statutory Trust Audit',
        },
      ],
      checklistItems: [
        {
          en: 'BHANDAR inventory insurance active and updated',
          hi: 'भंडार सामग्री का सक्रिय बीमा अद्यतन',
          bn: 'ভাণ্ডারের সামগ্রীর সুরক্ষা ও বীমা হালনাগাদ',
          sa: 'भाण्डागारद्रव्याणां सुरक्षा-व्यवस्था सम्यक् वर्तते',
        },
        {
          en: 'Quarterly physical stock-taking matches ledger balances',
          hi: 'त्रैमासिक भौतिक गणना बहीखाता से पूर्णतः मेल खाती है',
          bn: 'ত্রৈমাসিক সরাসরি গণনা খাতার হিসাবের সাথে নিখুঁতভাবে মেলে',
          sa: 'त्रैमासिक-गणनायाः कोषपत्रैः सह पूर्ण-साम्यम्',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: FORM_10BD
  // --------------------------------------------------------------------------
  FORM_10BD: {
    ACCOUNTANT: {
      moduleId: 'FORM_10BD',
      moduleName: {
        en: 'Form 10BD & 80G Statutory Compliance Desk',
        hi: 'फॉर्म १०-बी.डी. एवं ८०-जी वैधानिक अनुपालन डेस्क',
        bn: 'ফর্ম ১০বিডি এবং ৮০জি কর সমন্বয় ডেস্ক',
        sa: 'दशम-प्रपत्रम् (१०-बी.डी.) आयकर-अनुपालनविभागः',
      },
      role: 'ACCOUNTANT',
      roleLabel: {
        en: 'Chartered Accountant / Head of Finance',
        hi: 'चार्टर्ड एकाउंटेंट / मुख्य लेखाकार',
        bn: 'সনদপ্রাপ্ত হিসাবরক্ষক / অর্থ নিয়ন্ত্রক',
        sa: 'मुख्य-लेखाकारः / कोषनिरीक्षकः',
      },
      roleSummary: {
        en: 'Audits Sec 80G donations, enforces CBDT cash guardrails, verifies donor Tax IDs, and exports error-free Form 10BD CSV returns.',
        hi: '८०-जी दानों का ऑडिट, २००० रु. से अधिक नकद प्रतिबंध का अनुपालन, पैन सत्यापन एवं त्रुटिरहित १०-बी.डी. सीएसवी का निर्यात।',
        bn: '৮০জি অনুদানের হিসাব নিরীক্ষা, নগদ টাকার নিয়ম লঙ্ঘন রোধ, প্যান/আধার যাচাই এবং সিবিডিটি মানসম্মত সিএসভি তৈরি।',
        sa: '८०-जी दानानां परीक्षणं, रोख-प्रतिबन्धस्य पालनं, त्रुटिरहित-दशमप्रपत्र-निर्यातनं च।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Enforce Cash Donation Limit Guardrail (₹2,000 Sec 80G(5)(d))',
            hi: '१. नकद दान सीमा नियम का अनुपालन (अधिकतम २००० रु. धारा ८०-जी)',
            bn: '১. নগদ দানের আইনগত সীমা যাচাই (সর্বোচ্চ ₹২,০০০ ধারা ৮০জি(৫)(ডি))',
            sa: '१. रोखदान-मर्यादा-पालनम् (द्विसहस्रं रूप्यकाणि)',
          },
          description: {
            en: 'Under CBDT law, no cash donation exceeding ₹2,000 qualifies for 80G benefit. The desk flags any violation in bright red.',
            hi: 'आयकर नियमानुसार २००० रु. से अधिक का नकद दान ८०-जी में अमान्य है। डेस्क ऐसे दानों को लाल रंग में चिह्नित करती है।',
            bn: 'আয়কর বিধিমালা অনুযায়ী ₹২,০০০-এর বেশি নগদ অনুদানে ৮০জি ছাড় পাওয়া যায় না। সিস্টেমে এটি লাল সতর্কবার্তায় দেখায়।',
            sa: 'आयकरनियमानुसारेण द्विसहस्रादधिकं रोखदानं करमुक्तं न भवति।',
          },
          actionRequired: {
            en: 'Isolate or reclassify ineligible cash donations.',
            hi: 'अमान्य नकद दानों को अलग करें या सामान्य दान में बदलें।',
            bn: 'অযোগ্য নগদ অনুদানগুলো আলাদা করুন বা সাধারণ খাতে স্থানান্তর করুন।',
            sa: 'अयोग्यदानानां पृथक्करणं कुर्वन्तु।',
          },
          highlightedTerms: ['FORM_10BD'],
          complianceTag: 'Income Tax Sec 80G(5)(d)',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Donor Tax ID Verification (PAN / Aadhaar / Passport)',
            hi: '२. दानदाता कर पहचान पत्र सत्यापन (पैन / आधार / पासपोर्ट)',
            bn: '২. দানকারীর কর সনাক্তকরণ নম্বর যাচাই (প্যান / আধার / পাসপোর্ট)',
            sa: '२. दातृ-कर-अभिज्ञानपत्र-सत्यापनम्',
          },
          description: {
            en: 'Every donor record in FORM_10BD must have a verified Tax ID with correct CBDT code mapping (PAN=1, Aadhaar=2).',
            hi: 'FORM_10BD की प्रत्येक प्रविष्टि में मान्य कर पहचान संख्या एवं निर्धारित कोड (पैन=१, आधार=२) होना अनिवार्य है।',
            bn: 'FORM_10BD-এর প্রতিটি রেকর্ডে নির্ধারিত কোডসহ বৈধ ট্যাক্স আইডি (প্যান=১, আধার=২) থাকা আবশ্যক।',
            sa: 'प्रत्येकस्मिन लेखे पञ्जीकृत-कर-सङ्ख्या अनिवार्या भवति।',
          },
          actionRequired: {
            en: 'Fill missing PANs before generating the export.',
            hi: 'निर्यात से पूर्व रिक्त पैन नंबर प्रविष्ट करें।',
            bn: 'এক্সপোর্ট করার পূর্বে নিখোঁজ প্যান/আধার নম্বর পূরণ করুন।',
            sa: 'रिक्तानां पञ्जीकरण-पत्राणां पूरणं कुर्वन्तु।',
          },
          highlightedTerms: ['FORM_10BD'],
          complianceTag: 'CBDT Notification 19/2021',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. 1-Click CBDT Compliant CSV Exporter',
            hi: '३. १-क्लिक सीबीडीटी सम्मत सीएसवी (CSV) ई-फाइलिंग निर्यात',
            bn: '৩. ১-ক্লিকে সিবিডিটি অনুমোদিত সিএসভি ফাইল ডাউনলোড ও দাখিল',
            sa: '३. आयकरविभाग-सम्मत-दशमप्रपत्र-निर्यातनम्',
          },
          description: {
            en: 'Export the audited file named "Form_10BD_FY_XXXX_XXXX.csv" and upload directly to the Indian Income Tax Portal.',
            hi: '"Form_10BD_FY_XXXX_XXXX.csv" फाइल डाउनलोड करें और सीधे आयकर ई-फाइलिंग पोर्टल पर अपलोड करें।',
            bn: '"Form_10BD_FY_XXXX_XXXX.csv" ফাইলটি ডাউনলোড করে ভারতের আয়কর পোর্টালে সরাসরি আপলোড করুন।',
            sa: 'प्रपत्रं निष्कास्य साक्षात् आयकर-पटले स्थापयन्तु।',
          },
          actionRequired: {
            en: 'Click "Export CBDT Form 10BD CSV".',
            hi: '"Export CBDT Form 10BD CSV" पर क्लिक करें।',
            bn: '"Export CBDT Form 10BD CSV" বাটনে ক্লিক করুন।',
            sa: 'दशमप्रपत्रं निर्गमयन्तु।',
          },
          highlightedTerms: ['FORM_10BD', 'CORPUS_FUND'],
          complianceTag: 'Income Tax Filing Due: May 31',
        },
      ],
      checklistItems: [
        {
          en: 'Zero cash transactions above ₹2,000 in 80G bracket',
          hi: '८०-जी में २००० रु. से अधिक की कोई नकद प्रविष्टि नहीं',
          bn: '৮০জি তালিকায় ₹২,০০০-এর অধিক কোনো নগদ অনুদান নেই',
          sa: '८०-जी भागे द्विसहस्रादधिकं रोखदानं नास्ति',
        },
        {
          en: 'All donor IDs mapped to CBDT numeric codes (1-5)',
          hi: 'सभी पहचान पत्र सीबीडीटी संख्यात्मक कोड (१-५) से सुसज्जित',
          bn: 'সকল দানকারীর পরিচয়পত্র সিবিডিটি নিউমেরিক কোডে (১-৫) রূপান্তর সম্পন্ন',
          sa: 'सर्वे दातारः आयकर-संकेताङ्कैः युक्ताः सन्ति',
        },
        {
          en: 'Form 10BE certificates ready for auto-generation for donors',
          hi: 'दानदाताओं हेतु फॉर्म १०-बी.ई. प्रमाणपत्र स्वतः जारी करने के लिए तैयार',
          bn: 'দানকারীদের জন্য ১০বিই সার্টিফিকেট প্রস্তুত',
          sa: 'दानदातृभ्यः १०-बी.ई. प्रमाणपत्रं सज्जम्',
        },
      ],
    },
    TRUSTEE: {
      moduleId: 'FORM_10BD',
      moduleName: {
        en: 'Form 10BD & 80G Statutory Compliance Desk',
        hi: 'फॉर्म १०-बी.डी. एवं ८०-जी वैधानिक अनुपालन डेस्क',
        bn: 'ফর্ম ১০বিডি এবং ৮০জি কর সমন্বয় ডেস্ক',
        sa: 'दशम-प्रपत्रम् (१०-बी.डी.) आयकर-अनुपालनविभागः',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Managing Trustee / Signatory',
        hi: 'प्रबंध न्यासी / अधिकृत हस्ताक्षरकर्ता',
        bn: 'ব্যবস্থাপনা ট্রাস্টি / অনুমোদিত স্বাক্ষরকারী',
        sa: 'प्रबन्ध-न्यासी / अधिकृतहस्ताक्षरकर्ता',
      },
      roleSummary: {
        en: 'Final sign-off on Form 10BD filing with Digital Signature Certificate (DSC) on the Income Tax Portal, protecting the trust 80G tax exemption status.',
        hi: 'डिजिटल हस्ताक्षर (DSC) द्वारा आयकर पोर्टल पर फॉर्म १०-बी.डी. का अंतिम सत्यापन एवं ट्रस्ट की ८०-जी मान्यता का संरक्षण।',
        bn: 'ডিজিটাল স্বাক্ষর (ডিএসসি) দিয়ে আয়কর পোর্টালে ফর্ম ১০বিডি অনুমোদন ও ট্রাস্টের ৮০জি করছাড় বৈধ রাখা।',
        sa: 'अङ्कीय-हस्ताक्षरेण आयकर-पटले प्रपत्रस्य अन्तिम-स्वीकारः।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Review Pre-Filing Audit Report & Donation Totals',
            hi: '१. पूर्व-फाइलिंग ऑडिट रिपोर्ट एवं कुल दान राशि की समीक्षा',
            bn: '১. দাখিলের পূর্বে নিরীক্ষা রিপোর্ট ও মোট অনুদান খতিয়ে দেখা',
            sa: '१. समर्पणपूर्व-परीक्षणस्य दानराशेः च समीक्षा',
          },
          description: {
            en: 'Cross-verify total eligible donations against audited bank statements and tally ledger.',
            hi: 'बैंक खाते के विवरण एवं मुख्य बहीखाता से कुल पात्र दान राशि का मिलान करें।',
            bn: 'ব্যাংক হিসাব এবং মূল লেজারের সাথে মোট করছাড়যোগ্য অনুদানের পরিমাণ মিলিয়ে নিন।',
            sa: 'कोषपत्रेण सह सर्वस्य दानस्य साम्यं परीक्षध्वम्।',
          },
          actionRequired: {
            en: 'Approve audit summary on dashboard.',
            hi: 'डैशबोर्ड पर ऑडिट सारांश स्वीकृत करें।',
            bn: 'ড্যাশবোর্ডে নিরীক্ষা সংক্ষেপ অনুমোদন করুন।',
            sa: 'विवरणं परीक्ष्य स्वीकुर्वन्तु।',
          },
          highlightedTerms: ['FORM_10BD', 'CORPUS_FUND'],
          complianceTag: 'Trustee Fiduciary Duty',
        },
      ],
      checklistItems: [
        {
          en: 'DSC token plugged in and registered on Incometax.gov.in',
          hi: 'डीएससी टोकन सक्रिय एवं आयकर पोर्टल पर पंजीकृत',
          bn: 'ডিএসসি টোকেন আয়কর পোর্টালে নিবন্ধিত ও সক্রিয়',
          sa: 'अङ्कीय-हस्ताक्षरं आयकर-पटले पञ्जीकृतम्',
        },
        {
          en: 'Filing completed prior to May 31 to avoid ₹200/day Sec 234G penalties',
          hi: '३१ मई से पूर्व फाइलिंग पूर्ण ताकि प्रतिदिन २०० रु. अर्थदंड से बचा जा सके',
          bn: '৩১ মে-এর মধ্যে দাখিল সম্পন্ন করে প্রতিদিনের ₹২০০ জরিমানা পরিহার নিশ্চিত',
          sa: 'एकत्रिंशत्-मे-मासात् पूर्वं सर्वं सम्पन्नम्',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: FEDERATION_SWEEP
  // --------------------------------------------------------------------------
  FEDERATION_SWEEP: {
    TRUSTEE: {
      moduleId: 'FEDERATION_SWEEP',
      moduleName: {
        en: 'Federation Multi-Branch & Inter-Branch Sweeps',
        hi: 'महासंघ बहु-शाखा एवं अंतर-शाखा कोष समाहरण',
        bn: 'ফেডারেশন বহু-শাখা এবং আন্তঃশাখা তহবিল স্থানান্তর',
        sa: 'महासंघ-बहुशाखा-तथा-कोषसमाहरण-विभागः',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Master Trustee / Central Command',
        hi: 'प्रधान न्यासी / केंद्रीय कमान',
        bn: 'প্রধান ট্রাস্টি / কেন্দ্রীয় পরিষদ',
        sa: 'महासंघ-प्रमुखः',
      },
      roleSummary: {
        en: 'Sole authority to execute inter-branch CASH_SWEEP operations, sweep branch surpluses into the HQ master account, and provision new branches.',
        hi: 'शाखाओं से केंद्रीय कोष में CASH_SWEEP संचालित करने, नई शाखाओं को मान्यता देने एवं केंद्रीय तरलता बनाए रखने का एकमात्र अधिकार।',
        bn: 'আন্তঃশাখা CASH_SWEEP পরিচালনা করে শাখা কেন্দ্রের উদ্বৃত্ত প্রধান তহবিলে জমা করার এবং নতুন শাখা যুক্ত করার সর্বময় ক্ষমতা।',
        sa: 'शाखाकोषेभ्यः मुख्यकोषे CASH_SWEEP करणस्य एकमात्रम् अधिकारपदम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Monitor Multi-Branch Live Treasury Balances',
            hi: '१. सभी शाखाओं की वास्तविक रोकड़ व बैंक शेष पर दृष्टि',
            bn: '১. সমস্ত শাখা কেন্দ্রের লাইভ নগদ ও ব্যাংক ব্যালেন্স পর্যবেক্ষণ',
            sa: '१. सर्वासां शाखानां कोषशेषनिरीक्षणम्',
          },
          description: {
            en: 'Examine live revenue, expense, and net surplus across the parent HQ and all affiliate branches side-by-side.',
            hi: 'केंद्रीय मुख्यालय एवं सभी संबद्ध शाखाओं के राजस्व, व्यय और शुद्ध अधिशेष की तुलनात्मक समीक्षा करें।',
            bn: 'প্রধান কেন্দ্র এবং সমস্ত অনুমোদিত শাখাগুলোর আয়, ব্যয় ও উদ্বৃত্ত অর্থ পাশাপাশি তুলনা করে দেখুন।',
            sa: 'सर्वासां शाखानाम् आय-व्यय-अधिशेषाणां तुलनात्मक-परीक्षणम्।',
          },
          actionRequired: {
            en: 'Inspect Tab 1: Global Treasury Roll-Up.',
            hi: 'टैब १: ग्लोबल ट्रेजरी रोल-अप की जाँच करें।',
            bn: 'ট্যাব ১: গ্লোবাল ট্রেজারি রোল-আপ পর্যবেক্ষণ করুন।',
            sa: 'प्रथमभागे समग्र-कोष-विवरणं पश्यन्तु।',
          },
          highlightedTerms: ['CASH_SWEEP'],
          complianceTag: 'Consolidated Trust Ledger',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Execute Dual-Sign-Off Inter-Branch Cash Sweep',
            hi: '२. द्वैध-स्वीकृति अंतर-शाखा कोष समाहरण (CASH_SWEEP) निष्पादन',
            bn: '২. দ্বৈত অনুমোদন সাপেক্ষে আন্তঃশাখা ক্যাশ সুইপ (CASH_SWEEP) সম্পাদন',
            sa: '२. कोष-समाहरणस्य (CASH_SWEEP) प्रामाणिक-निष्पादनम्',
          },
          description: {
            en: 'When a child branch accumulates surplus cash exceeding operational limits, execute a CASH_SWEEP to the HQ Master Account via NEFT/RTGS.',
            hi: 'जब किसी शाखा में निर्धारित सीमा से अधिक रोकड़ एकत्र हो, तो NEFT/RTGS द्वारा केंद्रीय खाते में CASH_SWEEP करें।',
            bn: 'শাখা কেন্দ্রে অতিরিক্ত নগদ অর্থ জমলে NEFT/RTGS-এর মাধ্যমে কেন্দ্রীয় অ্যাকাউন্টে CASH_SWEEP সম্পন্ন করুন।',
            sa: 'अतिरिक्तं धनं मुख्यखाते समाहरन्तु।',
          },
          actionRequired: {
            en: 'Execute sweep in Tab 3 with transfer notes.',
            hi: 'टैब ३ में अंतरण विवरण के साथ स्वीप निष्पादित करें।',
            bn: 'ট্যাব ৩-এ গিয়ে প্রয়োজনীয় নোটসহ সুইপ সম্পন্ন করুন।',
            sa: 'तृतीयभागे स्वीप-कार्यं कुर्वन्तु।',
          },
          highlightedTerms: ['CASH_SWEEP'],
          complianceTag: 'Inter-Branch Transfer Authorization',
        },
      ],
      checklistItems: [
        {
          en: 'Branch cash-in-hand audited below insurance limit (₹5,00,000)',
          hi: 'शाखा में भौतिक रोकड़ ५ लाख रु. बीमा सीमा के भीतर सीमित',
          bn: 'শাখা কেন্দ্রের নগদ স্থিতি বীমা সীমার (₹৫,০০,০০০) নিচে রাখা নিশ্চিত',
          sa: 'शाखाकोषे रोखराशिः पञ्चलक्षमिता मर्यादिता',
        },
        {
          en: 'All sweeps authorized with Board Resolution reference numbers',
          hi: 'सभी कोष अंतरण बोर्ड संकल्प संदर्भ संख्या सहित पंजीकृत',
          bn: 'প্রতিটি সুইপ ট্রাস্ট বোর্ডের রেজোলিউশন নম্বরসহ লিপিবদ্ধ',
          sa: 'सर्वं समाहरणं मण्डल-स्वीकृति-सङ्ख्यया युक्तम्',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: FAMILY_MATRIMONY
  // --------------------------------------------------------------------------
  FAMILY_MATRIMONY: {
    PUROHIT: {
      moduleId: 'FAMILY_MATRIMONY',
      moduleName: {
        en: 'Vanshavali, Matrimony & Pitru Roots',
        hi: 'वंशावली, सनातन विवाह एवं पितृ मूल',
        bn: 'বংশাবলী, সনাতনী বিবাহ ও পিতৃমূল',
        sa: 'वंशावली, विवाह-मेलापकः तथा पितृमूलम्',
      },
      role: 'PUROHIT',
      roleLabel: {
        en: 'Kul-Purohit / Shastric Scholar',
        hi: 'कुल-पुरोहित / शास्त्रीय विद्वान',
        bn: 'কুল-পুরোহিত / শাস্ত্রীয় পণ্ডিত',
        sa: 'कुलपुरोहितः / वेदज्ञः',
      },
      roleSummary: {
        en: 'Verifies lineage pedigree, enforces Gotra and Pravara exogamy rules to avoid SAGOTRA alliances, computes GUNA_MILAN, and presides over PITRU_TARPANA.',
        hi: 'वंशावली सत्यापन, सगोत्र (SAGOTRA) विवाह निषेध की शास्त्रीय जाँच, ३६ गुणों का GUNA_MILAN एवं पितृ तर्पण (PITRU_TARPANA) का संचालन।',
        bn: 'বংশলতিকা যাচাই, সগোত্র (SAGOTRA) বিবাহ সম্পূর্ণ নিষিদ্ধ রাখা, ৩৬ গুণের GUNA_MILAN এবং বৈদিক পিতৃ তর্পণ (PITRU_TARPANA) পরিচালনা।',
        sa: 'गोत्र-प्रवर-परीक्षणम्, SAGOTRA-वर्जनम्, GUNA_MILAN तथा PITRU_TARPANA विधि-परिचालनम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. Strict SAGOTRA & Pravara Exogamy Enforcement',
            hi: '१. सगोत्र (SAGOTRA) एवं प्रवर वर्जना की कठोर शास्त्रीय जाँच',
            bn: '১. সগোত্র (SAGOTRA) ও প্রবর এক হলে বিবাহে কঠোর নিষেধাজ্ঞা নিশ্চিতকরণ',
            sa: '१. सगोत्र-विवाह-वर्जन-परीक्षणम् (SAGOTRA)',
          },
          description: {
            en: 'Under Dharma Shastras, bride and groom belonging to the same Rishi Gotra (SAGOTRA) or sharing common Pravaras cannot marry.',
            hi: 'धर्मशास्त्रों के अनुसार समान ऋषि गोत्र (SAGOTRA) अथवा समान प्रवर वाले वर-वधू का विवाह पूर्णतः वर्जित है।',
            bn: 'সনাতন শাস্ত্রানুসারে বর ও কনে একই ঋষি গোত্রের (SAGOTRA) হলে বা অভিন্ন প্রবর থাকলে বিবাহ শাস্ত্রবিরুদ্ধ।',
            sa: 'धर्मशास्त्रेषु समानगोत्रोत्पन्नयोः (SAGOTRA) विवाहः सर्वथा निषिद्धः।',
          },
          actionRequired: {
            en: 'Verify Gotra exogamy alert on profile preview.',
            hi: 'प्रोफाइल में सगोत्र निषेध चेतावनी अवश्य जाँचें।',
            bn: 'প্রোফাইল দেখার সময় সগোত্র সতর্কতা সতর্কতার সাথে যাচাই করুন।',
            sa: 'गोत्रनिषेध-चेतावनीं अवश्यं परीक्षध्वम्।',
          },
          highlightedTerms: ['SAGOTRA', 'GUNA_MILAN'],
          complianceTag: 'Manusmriti 3.5 & Dharmashastra',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Ashtakoot 36-Point GUNA_MILAN Computation',
            hi: '२. अष्टकूट ३६-गुण मिलान (GUNA_MILAN) गणना',
            bn: '২. অষ্টকূট ৩৬ গুণের কোষ্ঠী বিচার (GUNA_MILAN) ও সমাধান',
            sa: '२. अष्टकूट-षट्त्रिंशद्गुण-मेलनम् (GUNA_MILAN)',
          },
          description: {
            en: 'Evaluate Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, and Nadi. A score above 18 points is eligible.',
            hi: 'वर्ण, वश्य, तारा, योनि, ग्रहमैत्री, गण, भकूट और नाड़ी का मिलान करें। १८ से अधिक गुण प्राप्त होने पर ही संबंध प्रशस्त है।',
            bn: 'বর্ণ, বশ্য, তারা, যোনি, গ্রহমৈত্রী, গণ, ভকূট এবং নাড়ী বিচার করুন। ১৮-এর বেশি গুণ মিললে তবেই সম্বন্ধ উত্তম।',
            sa: 'नाडी-भकूट-गणादीनां सम्यक् विचारं कृत्वा १८ परिमिताधिकगुणान् प्राप्नुवन्तु।',
          },
          actionRequired: {
            en: 'Compute Ashtakoot score in Vivah Desk.',
            hi: 'विवाह डेस्क में अष्टकूट गुण स्कोर देखें।',
            bn: 'বিবাহ ডেস্কে গিয়ে অষ্টকূট গুণ স্কোর বিচার করুন।',
            sa: 'गुणमेलन-फलकं पश्यन्तु।',
          },
          highlightedTerms: ['GUNA_MILAN'],
          complianceTag: 'Jyotisha Shastra Rule',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Pitru Tarpana Calendar & Ancestor Oblations',
            hi: '३. पितृ तर्पण (PITRU_TARPANA) एवं श्राद्ध स्मृति कैलेंडर',
            bn: '৩. পিতৃ তর্পণ (PITRU_TARPANA) ও পূর্বপুরুষের বাৎসরিক তিথি রক্ষা',
            sa: '३. पितृ-तर्पणम् (PITRU_TARPANA) श्राद्ध-तिथिनिर्णयश्च',
          },
          description: {
            en: 'Coordinate Mahalaya and Pitru Paksha dates, providing devotees with personalized Tarpana sankalpas based on their vanshavali.',
            hi: 'पितृपक्ष एवं महालय तिथियों पर भक्तों को उनकी वंशावली अनुसार व्यक्तिगत तर्पण संकल्प कराएँ।',
            bn: 'মহালয়া ও পিতৃপক্ষে ভক্তদের বংশলতিকা অনুযায়ী কুশ-তিলাঞ্জলি সহযোগে ব্যক্তিগত তর্পণ সম্পাদন করান।',
            sa: 'पितृपक्षे महालयायां च भक्तेभ्यः वंशावल्यनुसारेण सङ्कल्पं कारयन्तु।',
          },
          actionRequired: {
            en: 'Generate Tarpana sankalpa text in Tab 3.',
            hi: 'टैब ३ में तर्पण संकल्प पाठ तैयार करें।',
            bn: 'ট্যাব ৩-এ তর্পণ সংকল্প পাঠ তৈরি করুন।',
            sa: 'तर्पण-सङ्कल्पं सज्जीकुर्वन्तु।',
          },
          highlightedTerms: ['PITRU_TARPANA', 'SANKALP'],
          complianceTag: 'Garuda Purana Shradh Vidhi',
        },
      ],
      checklistItems: [
        {
          en: 'Seven generations of paternal & five of maternal lineage verified clear of Sagotra',
          hi: 'पितृपक्ष की सात एवं मातृपक्ष की पाँच पीढ़ियों का सगोत्र दोष से मुक्त होना प्रमाणित',
          bn: 'পিতৃকুলের ৭ ও মাতৃকুলের ৫ পুরুষ সগোত্র মুক্ত বলে নিশ্চিত',
          sa: 'पितृपक्षस्य सप्त मातृपक्षस्य च पञ्च कुलेषु गोत्रदोषराहित्यम्',
        },
        {
          en: 'Nadi dosha mitigated via Mahamrityunjaya or Suvarna Daana if present',
          hi: 'नाड़ी दोष होने की स्थिति में महामृत्युंजय जप या सुवर्ण दान उपाय निर्धारित',
          bn: 'নাড়ী দোষ থাকলে শাস্ত্রমতে মহামৃত্যুঞ্জয় জপ বা দান বিধান নিশ্চিত',
          sa: 'नाडीदोषनिवारणाय महामृत्युञ्जयजप-विधानम्',
        },
      ],
    },
  },
};
