import type { ModuleRoleSOP } from './shastricTypes';

export const MODULE_ROLE_SOPS_D: Record<string, Record<string, ModuleRoleSOP>> = {
  YATRANET_GIS: {
    TRUSTEE: {
      moduleId: 'YATRANET_GIS',
      moduleName: {
        en: 'YatraNet GIS Crowd Density & Emergency SOS Command Center',
        hi: 'यात्रानेट जीआईएस भीड़ घनत्व एवं आपातकालीन एसओएस कमांड सेंटर',
        bn: 'যাত্রানেট জিআইএস ভিড় নিয়ন্ত্রণ ও জরুরি এসওএস কমান্ড সেন্টার',
        sa: 'यात्रानेट-जीआईएस जनसम्मर्द-नियन्त्रणम् एवं आपत्कालीन-कमाण्ड-केन्द्रम्',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Mandir Trustee & Complex Security Administrator',
        hi: 'मंदिर न्यासी एवं संकुल सुरक्षा प्रशासक',
        bn: 'মন্দির ট্রাস্টি ও চত্বর নিরাপত্তা প্রশাসক',
        sa: 'मन्दिर-न्यासधारी एवं संकुल-सुरक्षा-प्रशासकः',
      },
      roleSummary: {
        en: 'Monitor real-time sector crowd density heatmaps across sacred pilgrim flow corridors and swiftly dispatch Sevadars to alleviate bottlenecks around the Garbhagriha during peak Yatra seasons.',
        hi: 'तीर्थयात्री गलियारों में वास्तविक समय भीड़ घनत्व हीटमैप की निगरानी करना तथा प्रमुख यात्रा पर्वों पर गर्भगृह के संकुलन को दूर करने हेतु सेवादारों की तत्काल तैनाती करना।',
        bn: 'তীর্থযাত্রী করিডোরে রিয়েল-টাইম ভিড়ের ঘনত্ব পর্যবেক্ষণ করা এবং প্রধান যাত্রা উৎসবে গর্ভগৃহের জট নিরসনে দ্রুত সেবাদার মোতায়েন করা।',
        sa: 'तीर्थयात्रि-प्रवाहमार्गेषु जनसम्मर्दस्य प्रत्यक्ष-मानचित्रं समीक्ष्य महायात्रा-काले गर्भगृह-परितः संकुलता-निवारणाय सेवादाराणां शीघ्र-प्रेषणम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: 'Assess Live Sector Capacities & Pilgrim Flow Inflow',
            hi: 'सजीव सेक्टर क्षमता एवं यात्री प्रवेश प्रवाह का आकलन',
            bn: 'লাইভ সেক্টর ধারণক্ষমতা ও যাত্রী প্রবেশ পর্যালোচনা',
            sa: 'विभागीय-क्षमतायाः यात्रिक-प्रवेश-प्रवाहस्य च पर्यवेक्षणम्',
          },
          description: {
            en: 'Continuously audit live telemetry across all major sectors during peak YATRA. Identify sectors exceeding the critical 85% threshold to preempt stampedes or queue exhaustion.',
            hi: 'प्रमुख यात्रा (YATRA) के दौरान सभी सेक्टरों के लाइव डेटा की समीक्षा करें। भगदड़ या थकावट रोकने के लिए ८५% से अधिक क्षमता वाले क्षेत्रों की तत्काल पहचान करें।',
            bn: 'পবিত্র যাত্রা (YATRA) চলাকালীন সকল সেক্টরের ডেটা নিয়মিত পরীক্ষা করুন এবং ৮৫% অতিক্রমকারী সংকটপূর্ণ অঞ্চল শনাক্ত করুন।',
            sa: 'यात्रा-काले सर्वेषु भागेषु जनसम्मर्दं दृष्ट्वा ८५%-अतिसंमर्दयुक्तेषु क्षेत्रेषु सतर्कता विधेया।',
          },
          highlightedTerms: ['YATRA'],
          complianceTag: 'NDMA Religious Mass Gathering Guidelines',
        },
        {
          stepNumber: 2,
          title: {
            en: 'Mitigate Sanctum Bottlenecks Around the Garbhagriha',
            hi: 'गर्भगृह के सम्मुख संकुलन का तत्काल निवारण',
            bn: 'গর্ভগৃহের সম্মুখভাগে ভিড়ের জট নিরসন',
            sa: 'गर्भगृह-द्वारस्य संकुलतायाः निवारणम्',
          },
          description: {
            en: 'When the inner sanctum GARBHAGRIHA enters critical red status, trigger the Sevadar Redeployment Tool to transfer idle volunteers from green zones (e.g. Main Gate, Joota Ghar) directly to the inner sanctum barricades.',
            hi: 'जब मुख्य गर्भगृह (GARBHAGRIHA) गंभीर संकुलन (लाल क्षेत्र) में आए, तो सेवादार पुनर्नियोजन साधन का उपयोग कर हरित क्षेत्रों से स्वयंसेवकों को तुरंत गर्भगृह बैरिकेड्स पर तैनात करें।',
            bn: 'যখন প্রধান গর্ভগৃহ (GARBHAGRIHA) সংকটজনক লাল অবস্থায় পৌঁছায়, তখন গ্রিন জোন থেকে সেবাদারদের সরাসরি গর্ভগৃহে স্থানান্তরিত করুন।',
            sa: 'यदा मन्दिरस्य गर्भगृहम् (GARBHAGRIHA) अतिसंमर्दयुक्तं भवति, तदा हरितक्षेत्रेभ्यः सेवादाराः गर्भगृह-रक्षणाय योजनीयाः।',
          },
          highlightedTerms: ['GARBHAGRIHA', 'SEVADAR'],
          complianceTag: 'Sanctum Crowd Velocity & Shastric Decorum Protocol',
        },
      ],
      checklistItems: [
        {
          en: 'Garbhagriha ingress and egress gates calibrated to max safe turnover velocity',
          hi: 'गर्भगृह प्रवेश एवं निकास द्वारों की अधिकतम सुरक्षित गतिशीलता का अंशांकन',
          bn: 'গর্ভগৃহ প্রবেশ ও প্রস্থান দরজায় নিরাপদ গতিবেগ নিশ্চিতকরণ',
          sa: 'गर्भगृह-प्रवेश-निर्गम-द्वाराणां गतिशीलता सुनिश्चिता',
        },
        {
          en: 'Backup medical stretchers and first-aid points on standby across pilgrim holding bays',
          hi: 'यात्री विश्राम क्षेत्रों में बैकअप स्ट्रेचर एवं प्राथमिक चिकित्सा दल सक्रिय',
          bn: 'যাত্রী বিশ্রাম এলাকায় ব্যাকআপ স্ট্রেচার ও প্রাথমিক চিকিৎসা কেন্দ্র প্রস্তুত',
          sa: 'आपत्कालीन-चिकित्सा-शिबिराणां सज्जता प्रमाणीकृता',
        },
      ],
    },
    MANAGER: {
      moduleId: 'YATRANET_GIS',
      moduleName: {
        en: 'YatraNet GIS Crowd Density & Emergency SOS Command Center',
        hi: 'यात्रानेट जीआईएस भीड़ घनत्व एवं आपातकालीन एसओएस कमांड सेंटर',
        bn: 'যাত্রানেট জিআইএস ভিড় নিয়ন্ত্রণ ও জরুরি এসওএস কমান্ড সেন্টার',
        sa: 'यात्रानेट-जीआईएस जनसम्मर्द-नियन्त्रणम् एवं आपत्कालीन-कमाण्ड-केन्द्रम्',
      },
      role: 'MANAGER',
      roleLabel: {
        en: 'Operations Manager & Dispatch Controller',
        hi: 'परिचालन प्रबंधक एवं प्रेषण नियंत्रक',
        bn: 'পরিচালন ব্যবস্থাপক ও ডিসপ্যাচ নিয়ন্ত্রক',
        sa: 'प्रचालन-प्रबन्धकः प्रेषण-नियन्त्रकश्च',
      },
      roleSummary: {
        en: 'Coordinate on-ground volunteer deployment, oversee automated crowd heatmaps, and maintain uninterrupted devotee flow from holding zones to the sanctum.',
        hi: 'धरातलीय स्वयंसेवक तैनाती का समन्वय करना, स्वचालित भीड़ हीटमैप की निगरानी करना तथा विश्राम क्षेत्रों से गर्भगृह तक निर्बाध यात्री प्रवाह सुनिश्चित करना।',
        bn: 'অন-গ্রাউন্ড স্বেচ্ছাসেবক মোতায়েন সমন্বয় করা, ভিড়ের হিটম্যাপ তদারকি করা এবং নিরবচ্ছিন্ন দর্শন প্রবাহ বজায় রাখা।',
        sa: 'भूस्तरीय-सेवादाराणां नियोजनं कृत्वा दर्शनप्रवाहं निर्बाधं स्थापयेत्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: 'Balance Holding Bay Density with Sanctum Clearance',
            hi: 'विश्राम कक्ष एवं गर्भगृह निकासी संतुलन',
            bn: 'হোল্ডিং বে ও গর্ভগৃহ নিকাশির ভারসাম্য রক্ষা',
            sa: 'विश्रामकक्ष-गर्भगृहयोः जनप्रवाह-सन्तुलनम्',
          },
          description: {
            en: 'Adjust gate release intervals between Waiting Hall and GARBHAGRIHA based on live transit velocity to preserve peaceful devotional atmosphere.',
            hi: 'शांतिपूर्ण दर्शन वातावरण बनाए रखने के लिए विश्राम हॉल और गर्भगृह (GARBHAGRIHA) के बीच गेट खोलने के अंतराल को नियंत्रित करें।',
            bn: 'শান্তিপূর্ণ ভক্তিভাব বজায় রাখতে ওয়েটিং হল ও গর্ভগৃহের (GARBHAGRIHA) মধ্যকার গেট খোলার সময় নিয়ন্ত্রণ করুন।',
            sa: 'शान्तिपूर्ण-दर्शनाय विश्रामकक्षस्य गर्भगृहस्य च मध्ये द्वारोद्घाटनसमयं नियन्त्रयेत्।',
          },
          highlightedTerms: ['GARBHAGRIHA'],
          complianceTag: 'Mass Darshan Turnover SOP',
        },
      ],
      checklistItems: [
        {
          en: 'All CCTV and turnstile IoT counters feeding live data into YatraNet GIS',
          hi: 'सभी सीसीटीवी और टर्नस्टाइल काउंटर्स से यात्रानेट जीआईएस में लाइव डेटा प्राप्त',
          bn: 'সকল সিসিটিভি ও টার্নস্টাইল কাউন্টার থেকে লাইভ ডেটা প্রাপ্তি নিশ্চিত',
          sa: 'प्रत्यक्ष-तन्त्रांशेभ्यः यथार्थ-विवरणं प्राप्तम्',
        },
      ],
    },
    SEVADAR: {
      moduleId: 'YATRANET_GIS',
      moduleName: {
        en: 'YatraNet GIS Crowd Density & Emergency SOS Command Center',
        hi: 'यात्रानेट जीआईएस भीड़ घनत्व एवं आपातकालीन एसओएस कमांड सेंटर',
        bn: 'যাত্রানেট জিআইএস ভিড় নিয়ন্ত্রণ ও জরুরি এসওএস কমান্ড সেন্টার',
        sa: 'यात्रानेट-जीआईएस जनसम्मर्द-नियन्त्रणम् एवं आपत्कालीन-कमाण्ड-केन्द्रम्',
      },
      role: 'SEVADAR',
      roleLabel: {
        en: 'Sanctum Volunteer & First-Responder Sevadar',
        hi: 'मंदिर स्वयंसेवक एवं त्वरित अनुक्रिया सेवादार',
        bn: 'গর্ভগৃহ স্বেচ্ছাসেবক ও দ্রুত সাড়াদানকারী সেবাদার',
        sa: 'गर्भगृह-स्वयंसेवकः त्वरित-प्रतिसादक-सेवादारः',
      },
      roleSummary: {
        en: 'Execute immediate field responses to Emergency SOS alerts, administer first-aid to dehydrated pilgrims, and guide elderly devotees through queue channels with compassionate service.',
        hi: 'आपातकालीन एसओएस अलर्ट पर त्वरित धरातलीय कार्रवाई करना, अस्वस्थ तीर्थयात्रियों को प्राथमिक उपचार प्रदान करना तथा करुणापूर्वक कतार प्रबंधन संभालना।',
        bn: 'জরুরি এসওএস সতর্কতায় তাৎক্ষণিক সাড়া প্রদান করা, অসুস্থ যাত্রীদের প্রাথমিক চিকিৎসা দেওয়া এবং নিষ্ঠার সাথে লাইন পরিচালনা করা।',
        sa: 'आपत्कालीन-एसओएस-संकेतेषु त्वरित-कार्याचरणं कृत्वा अस्वस्थ-यात्रिकाणां सेवां सम्पादयेत्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: 'Acknowledge and Respond to Sector Medical SOS',
            hi: 'सेक्टर चिकित्सा एसओएस स्वीकार कर कार्रवाई करना',
            bn: 'সেক্টরের জরুরি মেডিকেল এসওএস গ্রহণ ও সাড়া প্রদান',
            sa: 'आपत्कालीन-चिकित्सा-संकेतं स्वीकृत्य साहाय्य-सम्पादनम्',
          },
          description: {
            en: 'Upon receiving a broadcasted SOS (e.g., heat exhaustion or medical distress), the assigned SEVADAR must click "Dispatch Medical Sevadars" in the command center, lock location beacons, and arrive at the sector within 120 seconds.',
            hi: 'जब आपातकालीन एसओएस प्रसारित हो, तो निर्दिष्ट सेवादार (SEVADAR) "Dispatch Medical Sevadars" पर क्लिक करें और १२० सेकंड के भीतर सहायता स्थल पर पहुँचें।',
            bn: 'মেডিকেল এসওএস সতর্কবার্তা পাওয়ামাত্র দায়িত্বপ্রাপ্ত সেবাদার (SEVADAR) কমান্ড সেন্টারে "Dispatch Medical Sevadars" ক্লিক করবেন এবং ১২০ সেকেন্ডে ঘটনাস্থলে পৌঁছাবেন।',
            sa: 'आपत्कालीन-संकेत-प्राप्तौ सेवादारेण (SEVADAR) "Dispatch Medical Sevadars" इति नुत्वा क्षणमात्रे तत्र गन्तव्यम्।',
          },
          highlightedTerms: ['SEVADAR'],
          complianceTag: 'Emergency Medical Golden Hour Standard',
        },
        {
          stepNumber: 2,
          title: {
            en: 'Assist Elderly and Differently-Abled Devotees',
            hi: 'वरिष्ठ एवं दिव्यांग तीर्थयात्रियों की सहायता',
            bn: 'প্রবীণ ও বিশেষ চাহিদাসম্পন্ন ভক্তদের সহায়তা',
            sa: 'वृद्धानां दिव्याङ्गानां च तीर्थयात्रिकाणां साहाय्यम्',
          },
          description: {
            en: 'Ensure priority passage channels are kept open for elders and wheelchair-bound devotees without disrupting the primary darshan flow.',
            hi: 'मुख्य दर्शन प्रवाह को बाधित किए बिना वरिष्ठ नागरिकों एवं दिव्यांगों के लिए विशेष सुगम पथ खुला रखें।',
            bn: 'মূল দর্শন प्रवाह ব্যাহত না করে প্রবীণ ও হুইলচেয়ার ব্যবহারকারীদের জন্য অগ্রাধিকারমূলক প্রবেশপথ উন্মুক্ত রাখুন।',
            sa: 'वृद्ध-दिव्याङ्गेभ्यः विशेष-मार्गं संरक्ष्य निर्बाधं देवदर्शनं कारयेत्।',
          },
          highlightedTerms: ['SEVADAR'],
          complianceTag: 'Seva Dharma & Narada Bhakti Sutra',
        },
      ],
      checklistItems: [
        {
          en: 'Wearable communication radio or smartphone app synced with YatraNet beacon',
          hi: 'रेडियो या मोबाइल ऐप यात्रानेट बीकन से सक्रिय रूप से कनेक्टेड',
          bn: 'ওয়াকিটকি বা মোবাইল অ্যাপ যাত্রানেটের সাথে যুক্ত',
          sa: 'सञ्चार-यन्त्रं यात्रानेट-तन्त्रेण सह संयोजितम्',
        },
        {
          en: 'Electrolyte water sachets and basic first-aid kit stocked at assigned post',
          hi: 'तैनाती स्थल पर ओआरएस घोल एवं प्राथमिक चिकित्सा किट उपलब्ध',
          bn: 'নির্ধারিত দায়িত্বস্থলে ওআরএস এবং প্রাথমিক চিকিৎসা কিট উপস্থিত',
          sa: 'प्राथमिक-चिकित्सा-पेटिका स्वस्थाने सज्जा',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // MODULE: SEVADAR_ROSTER
  // --------------------------------------------------------------------------
  SEVADAR_ROSTER: {
    TRUSTEE: {
      moduleId: 'SEVADAR_ROSTER',
      moduleName: {
        en: 'Sevadar HR Desk & Volunteer Roster',
        hi: 'सेवादार मानव संसाधन एवं स्वयंसेवक रोस्टर',
        bn: 'সেবাদার মানবসম্পদ ও স্বেচ্ছাসেবক রোস্টার',
        sa: 'सेवाव्रती-मानवसंसाधन-नामावलिः',
      },
      role: 'TRUSTEE',
      roleLabel: {
        en: 'Temple Trustee',
        hi: 'मंदिर न्यासी (ट्रस्टी)',
        bn: 'মন্দির ট্রাস্টি',
        sa: 'मन्दिर-न्यासी',
      },
      roleSummary: {
        en: 'Oversee volunteer onboarding and background vetting; approve KYC background checks for devotees performing NISHKAM_SEVA, authorize official PARICHAY_PATRA credential issuance, and allocate strategic shift assignments across Joota Ghar, Garbhagriha, and Prasadam counters.',
        hi: 'स्वयंसेवकों के पृष्ठभूमि सत्यापन का पर्यवेक्षण करें; NISHKAM_SEVA हेतु आवेदकों के केवाईसी को अनुमोदित करें, अधिकृत PARICHAY_PATRA जारी करने को मंजूरी दें, तथा जूता घर, GARBHAGRIHA एवं प्रसादम काउंटरों पर रणनीतिक शिफ्ट आवंटित करें।',
        bn: 'স্বেচ্ছাসেবকদের ব্যাকগ্রাউন্ড যাচাই তদারকি করুন; NISHKAM_SEVA-র জন্য আবেদনকারীদের কেওয়াইসি অনুমোদন করুন, অফিশিয়াল PARICHAY_PATRA প্রদানের বৈধতা দিন এবং জুতো ঘর, GARBHAGRIHA ও প্রসাদ কাউন্টারে শিফট বরাদ্দ করুন।',
        sa: 'NISHKAM_SEVA-व्रतिनां पृष्ठभूमिपरीक्षणं कुर्वन्तु; के.वाय.सी-प्रमाणीकरणम् अनुमोदयन्तु, PARICHAY_PATRA-पत्रं समर्पयन्तु, तथा पादरक्षागृहं, GARBHAGRIHA-क्षेत्रं प्रसादमवितरणं च प्रति सेवापालिं नियमयन्तु।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. KYC Background Verification & Approval',
            hi: '१. पृष्ठभूमि केवाईसी सत्यापन एवं अनुमोदन',
            bn: '১. কেওয়াইসি ব্যাকগ্রাউন্ড যাচাই ও অনুমোদন',
            sa: '१. के.वाय.सी-पृष्ठभूमिपरीक्षणम् अनुमोदनं च',
          },
          description: {
            en: 'Audit candidate identity documents, emergency contact information, and spiritual orientation. Grant KYC clearance enlisting the sevadar for consecrated NISHKAM_SEVA.',
            hi: 'आवेदक के पहचान प्रमाण एवं आपातकालीन संपर्क विवरण की जांच करें। मंदिर नियमावली के अंतर्गत पावन NISHKAM_SEVA हेतु केवाईसी अनुमोदन प्रदान करें।',
            bn: 'আবেদনকারীর পরিচয়পত্র ও যোগাযোগের তথ্য যাচাই করুন। মন্দির বিধি অনুসারে পবিত্র NISHKAM_SEVA-র জন্য কেওয়াইসি অনুমোদন দিন।',
            sa: 'अभ्यर्थिनः परिचयपत्रं परीक्ष्य पवित्रायै NISHKAM_SEVA-कार्याय के.वाय.सी-अनुमोदनं ददतु।',
          },
          actionRequired: {
            en: 'Click "Approve KYC" on pending volunteer directory records',
            hi: 'प्रतीक्षारत स्वयंसेवक सूची में "Approve KYC" पर क्लिक करें',
            bn: 'অপেক্ষমাণ তালিকায় "Approve KYC" বাটনে ক্লিক করুন',
            sa: '"Approve KYC" इत्यत्र नुदन्तु',
          },
          highlightedTerms: ['NISHKAM_SEVA', 'PARICHAY_PATRA', 'SEVADAR'],
          complianceTag: 'Trustee Governance & Vetting Protocol',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Parichay Patra (Credential Card) Authorization',
            hi: '२. परिचय पत्र (आईडी क्रेडेंशियल) अधिकृतिकरण एवं मुद्रण',
            bn: '২. পরিচয়পত্র (আইডি কার্ড) অনুমোদন ও প্রিন্ট',
            sa: '२. परिचय-पत्र-निर्माणं मुद्रणं च',
          },
          description: {
            en: 'Authorize official PARICHAY_PATRA identity credentials with tamper-proof QR verification code, emergency contact details, and blood group before perimeter duty deployment.',
            hi: 'परिसर में तैनाती से पूर्व क्यूआर कोड, आपातकालीन रक्त समूह एवं फोन नंबर युक्त अधिकृत PARICHAY_PATRA क्रेडेंशियल सृजन को प्रमाणित करें।',
            bn: 'দায়িত্বে নামার পূর্বে কিউআর কোড এবং জরুরি যোগাযোগ সংবলিত প্রাতিষ্ঠানিক PARICHAY_PATRA প্রদান নিশ্চিত করুন।',
            sa: 'दायित्वग्रहणपूर्वं सुरक्षा-क्यूआर-सहितं PARICHAY_PATRA-अभिज्ञानपत्रं मुद्रयन्तु।',
          },
          actionRequired: {
            en: 'Click "Generate Parichay Patra (ID)" to preview and trigger print',
            hi: '"Generate Parichay Patra (ID)" पर क्लिक करके पूर्वावलोकन एवं प्रिंट करें',
            bn: '"Generate Parichay Patra (ID)" বাটনে ক্লিক করে প্রিন্ট করুন',
            sa: '"Generate Parichay Patra (ID)" नुत्वा मुद्रयन्तु',
          },
          highlightedTerms: ['PARICHAY_PATRA', 'SEVADAR'],
          complianceTag: 'Statutory Identity & Perimeter Security Rule',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Strategic Shift Allocation (Joota Ghar, Garbhagriha, Prasadam)',
            hi: '३. रणनीतिक शिफ्ट आवंटन (जूता घर, गर्भगृह, प्रसादम)',
            bn: '৩. কৌশলগত শিফট বণ্টন (জুতো ঘর, গর্ভগৃহ, প্রসাদ কাউন্টার)',
            sa: '३. सेवापालि-विनियोगः (पादरक्षागृहं, गर्भगृहं, प्रसादम)',
          },
          description: {
            en: 'Deploy qualified sevadars across critical YatraNet pilgrimage sectors including Joota Ghar (footwear management), GARBHAGRIHA (inner sanctum crowd queue cadence), and Prasadam distribution to maintain seamless devotee flow.',
            hi: 'जूता घर (पादत्राण प्रबंधन), GARBHAGRIHA (गर्भगृह कतार नियमन) एवं प्रसादम वितरण जैसे संवेदनशील यात्रानेट सेक्टरों में NISHKAM_SEVA हेतु सेवादारों को शिफ्ट में नियुक्त करें।',
            bn: 'জুতো ঘর, GARBHAGRIHA (গর্ভগৃহের ভিড় নিয়ন্ত্রণ) এবং প্রসাদ বিতরণ কাউন্টারে দায়িত্বশীল সেবা নিশ্চিত করতে উপযুক্ত শিফটে সেবাদারদের নিযুক্ত করুন।',
            sa: 'पादरक्षागृहे, GARBHAGRIHA-क्षेत्रे, प्रसादमवितरणे च सम्यक् व्यवस्थापनाय सेवापालिं विनियुञ्जन्तु।',
          },
          actionRequired: {
            en: 'Assign duty shifts in the Roster panel according to peak pilgrim volume',
            hi: 'तीर्थयात्री भीड़ के अनुसार ड्यूटी रोस्टर पैनल में शिफ्ट आवंटित करें',
            bn: 'ভক্তদের ভিড় অনুযায়ী ডিউটি রোস্টারে শিফট বরাদ্দ করুন',
            sa: 'यात्रिकसङ्ख्यानुसारं कार्यतालिकायां पालिं निर्धारयन्तु',
          },
          highlightedTerms: ['GARBHAGRIHA', 'NISHKAM_SEVA', 'SEVADAR'],
          complianceTag: 'Agama Shastric Decorum & Crowd Safety',
        },
      ],
      checklistItems: [
        {
          en: '100% background KYC checks verified for sevadars deployed at sanctum sectors',
          hi: 'गर्भगृह में तैनात सभी सेवादारों का शत-प्रतिशत पृष्ठभूमि सत्यापन पूर्ण',
          bn: 'গর্ভগৃহে নিয়োজিত সকল সেবাদারের ১০০% কেওয়াইসি যাচাই নিশ্চিত',
          sa: 'गर्भगृहस्थितानां सर्वसेवकानां शतप्रतिशतं प्रमाणीकरणं सम्पन्नम्',
        },
        {
          en: 'Official PARICHAY_PATRA credentials issued with active emergency contact info',
          hi: 'आपातकालीन संपर्क विवरण युक्त आधिकारिक PARICHAY_PATRA जारी',
          bn: 'জরুরি যোগাযোগের বিবরণসহ অফিশিয়াল PARICHAY_PATRA প্রদান সম্পন্ন',
          sa: 'आपत्कालीनसम्पर्कसहितं PARICHAY_PATRA प्रदत्तम्',
        },
        {
          en: 'Fair rotation schedule enacted across Joota Ghar, Garbhagriha, and Prasadam',
          hi: 'जूता घर, गर्भगृह एवं प्रसादम के मध्य निष्पक्ष सेवा रोटेशन लागू',
          bn: 'জুতো ঘর, গর্ভগৃহ ও প্রসাদ কাউন্টারের মধ্যে নিয়মিত শিফট রোটেশন নিশ্চিত',
          sa: 'सर्वक्षेत्रेषु न्यायसम्मतं पालि-परिवर्तनं व्यवस्थापितम्',
        },
      ],
    },
    MANAGER: {
      moduleId: 'SEVADAR_ROSTER',
      moduleName: {
        en: 'Sevadar HR Desk & Volunteer Roster',
        hi: 'सेवादार मानव संसाधन एवं स्वयंसेवक रोस्टर',
        bn: 'সেবাদার মানবসম্পদ ও স্বেচ্ছাসেবক রোস্টার',
        sa: 'सेवाव्रती-मानवसंसाधन-नामावलिः',
      },
      role: 'MANAGER',
      roleLabel: {
        en: 'Operations Manager / Volunteer Head',
        hi: 'प्रचालन प्रबंधक / स्वयंसेवक प्रमुख',
        bn: 'পরিচালনা ব্যবস্থাপক / স্বেচ্ছাসেবক প্রধান',
        sa: 'प्रचालन-प्रबन्धकः / सेवाप्रमुखः',
      },
      roleSummary: {
        en: 'Manage daily volunteer schedules and KYC workflow; inspect pending background submissions for NISHKAM_SEVA candidates, trigger instant PARICHAY_PATRA badge printing, and coordinate duty shifts across Joota Ghar, Garbhagriha, and Prasadam sectors.',
        hi: 'दैनिक स्वयंसेवक कार्यक्रम एवं केवाईसी कार्यप्रवाह का प्रबंधन करें; NISHKAM_SEVA हेतु लंबित आवेदनों की जांच करें, त्वरित PARICHAY_PATRA प्रिंट करें, तथा जूता घर, GARBHAGRIHA व प्रसादम सेक्टरों में ड्यूटी शिफ्ट का समन्वय करें।',
        bn: 'দৈনিক সেবাদার সময়সূচী পরিচালনা করুন; NISHKAM_SEVA-র অপেক্ষমাণ কেওয়াইসি যাচাই করুন, তাত্ক্ষণিক PARICHAY_PATRA ব্যাজ প্রিন্ট করুন এবং জুতো ঘর, GARBHAGRIHA ও প্রসাদ কাউন্টারে দায়িত্ব সমন্বয় করুন।',
        sa: 'दैनिकसेवातालिकां प्रबन्धयन्तु; NISHKAM_SEVA-कृते के.वाय.सी-परीक्षणं कुर्वन्तु, PARICHAY_PATRA मुद्रयन्तु, पादरक्षागृहे GARBHAGRIHA-भागे प्रसादमवितरणे च पालिं निर्दिशन्तु।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. KYC Document Inspection & Verification',
            hi: '१. केवाईसी दस्तावेज निरीक्षण एवं सत्यापन',
            bn: '১. কেওয়াইসি নথিপত্র নিরীক্ষণ ও যাচাই',
            sa: '१. के.वाय.सी-प्रलेखपरीक्षणं दृढीकरणं च',
          },
          description: {
            en: 'Inspect submitted contact details, emergency phone, and identity proofs. Confirm volunteer devotion for NISHKAM_SEVA before switching status from PENDING to VERIFIED.',
            hi: 'पंजीकृत फोन नंबर, आपातकालीन संपर्क एवं पहचान दस्तावेजों का निरीक्षण करें। PENDING से VERIFIED स्थिति में बदलने से पूर्व NISHKAM_SEVA के प्रति समर्पण की पुष्टि करें।',
            bn: 'ফোন নম্বর ও জরুরি তথ্য পর্যালোচনা করুন। PENDING থেকে VERIFIED করার পূর্বে NISHKAM_SEVA-র সেবামূলক মানসিকতা যাচাই করুন।',
            sa: 'सम्पर्कविवरणं परीक्ष्य NISHKAM_SEVA-निष्ठां दृढीकृत्य प्रमाणीकरणं कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Click "Approve KYC" on pending candidates in Volunteer Directory',
            hi: 'स्वयंसेवक सूची में प्रतीक्षारत उम्मीदवारों पर "Approve KYC" दबाएं',
            bn: 'স্বেচ্ছাসেবক ডিরেক্টরিতে "Approve KYC" চাপুন',
            sa: 'प्रथमपटले "Approve KYC" नुदन्तु',
          },
          highlightedTerms: ['NISHKAM_SEVA', 'PARICHAY_PATRA'],
          complianceTag: 'Operational HR & Identity Verification SOP',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Generate and Issue Parichay Patra ID Badge',
            hi: '२. परिचय पत्र आईडी कार्ड निर्माण एवं निर्गमन',
            bn: '২. পরিচয়পত্র আইডি কার্ড তৈরি ও বিতরণ',
            sa: '२. परिचय-पत्र-वितरणम्',
          },
          description: {
            en: 'Upon successful KYC clearance, click "Generate Parichay Patra (ID)" to preview and print the authenticated credential badge containing QR verification and emergency details.',
            hi: 'सफल सत्यापन के उपरांत "Generate Parichay Patra (ID)" पर क्लिक कर मुद्रण योग्य आधिकारिक पहचान पत्र खोलें और सेवादार को सौंपें।',
            bn: 'যাচাই শেষে "Generate Parichay Patra (ID)" ক্লিক করে স্ট্যান্ডার্ড আইডি ব্যাজ প্রিন্ট করুন।',
            sa: 'सफलप्रमाणनानन्तरं मुद्रणयोग्यं PARICHAY_PATRA-पत्रं समर्पयन्तु।',
          },
          actionRequired: {
            en: 'Execute print action and issue official badge to the Sevadar',
            hi: 'मुद्रण निष्पादित करें एवं सेवादार को अधिकृत बैज प्रदान करें',
            bn: 'প্রিন্ট সম্পন্ন করে সেবাদারকে ব্যাজ হস্তান্তর করুন',
            sa: 'मुद्रणं कृत्वा सेवाव्रतिने पत्रं प्रयच्छन्तु',
          },
          highlightedTerms: ['PARICHAY_PATRA', 'SEVADAR'],
          complianceTag: 'Access Control & Badge Standard',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Shift Assignment (Joota Ghar, Garbhagriha, Prasadam)',
            hi: '३. शिफ्ट आवंटन (जूता घर, गर्भगृह, प्रसादम)',
            bn: '৩. শিফট দায়িত্ব প্রদান (জুতো ঘর, গর্ভগৃহ, প্রসাদ কাউন্টার)',
            sa: '३. कार्यक्षेत्रविनियोगः (पादरक्षागृहं, गर्भगृहं, प्रसादम)',
          },
          description: {
            en: 'Balance active shifts across key pilgrimage touchpoints: Joota Ghar (footwear cloakroom), GARBHAGRIHA (inner sanctum darshan line), and Prasadam food counters.',
            hi: 'प्रमुख तीर्थ सेवा बिंदुओं: जूता घर (सुरक्षित पादत्राण), GARBHAGRIHA (शांत कतार प्रबंधन) एवं प्रसादम वितरण काउंटरों पर सक्रिय शिफ्ट संतुलित करें।',
            bn: 'প্রধান তীর্থ কেন্দ্রগুলিতে দায়িত্ব ভাগ করুন: জুতো ঘর (জুতো সংরক্ষণ), GARBHAGRIHA (গর্ভগৃহে ভক্তদের সুশৃঙ্খল দর্শন) এবং প্রসাদ বিতরণ কাউন্টার।',
            sa: 'पादरक्षागृहे, GARBHAGRIHA-भागे, प्रसादमवितरणे च समतोल-पालिं निर्धारयन्तु।',
          },
          actionRequired: {
            en: 'Monitor sector occupancy and reassign shifts during festival surges',
            hi: 'त्योहारों की भीड़ में सेक्टर उपस्थिति की निगरानी करें और आवश्यकतानुसार शिफ्ट पुनर्वितरित करें',
            bn: 'উৎসবের সময় ভিড় সামলাতে প্রয়োজন অনুসারে শিফট পুনর্বণ্টন করুন',
            sa: 'यात्रिकोत्सवेषु उपस्थितिं दृष्ट्वा पुनर्विनियोगं कुर्वन्तु',
          },
          highlightedTerms: ['GARBHAGRIHA', 'NISHKAM_SEVA', 'SEVADAR'],
          complianceTag: 'Crowd Dynamics & YatraNet Integration',
        },
      ],
      checklistItems: [
        {
          en: 'Confirm morning, afternoon, and evening shift coverage is filled without gaps',
          hi: 'प्रातः, दोपहर एवं सायं कालीन शिफ्ट कवरेज बिना किसी अंतराल के पूर्ण होना सुनिश्चित करें',
          bn: 'সকাল, দুপুর ও সান্ধ্যকালীন শিফটের উপস্থিতি ফাঁকহীন নিশ্চিত করুন',
          sa: 'प्रातः-मध्याह्न-सायं-कालेषु सर्वपालिषु सेवकाः उपस्थिताः इति पश्यन्तु',
        },
        {
          en: 'Check that each on-duty sevadar is physically wearing their printed PARICHAY_PATRA',
          hi: 'सुनिश्चित करें कि प्रत्येक कार्यरत सेवादार अपना मुद्रित PARICHAY_PATRA पहने हुए हो',
          bn: 'অন-ডিউটি প্রত্যেক সেবাদার প্রিন্ট করা PARICHAY_PATRA ব্যাজ পরিহিত কিনা যাচাই করুন',
          sa: 'प्रत्येकः कार्यकर्ता स्वकीयं PARICHAY_PATRA-पत्रं धारयति वा न वा इति परीक्ष्यताम्',
        },
        {
          en: 'Relief sevadars briefed for peak aarti darshan queues at Garbhagriha',
          hi: 'गर्भगृह में आरती के समय अतिरिक्त सेवादारों को दर्शन कतार हेतु संक्षेपित किया गया',
          bn: 'আরতির সময় গর্ভগৃহে অতিরিক্ত সেবাদারদের পূর্ব-প্রস্তুতি সম্পন্ন',
          sa: 'आरतीसमये गर्भगृहे अतिरिक्तसेवकाः सज्जीकृताः',
        },
      ],
    },
    SEVADAR: {
      moduleId: 'SEVADAR_ROSTER',
      moduleName: {
        en: 'Sevadar HR Desk & Volunteer Roster',
        hi: 'सेवादार मानव संसाधन एवं स्वयंसेवक रोस्टर',
        bn: 'সেবাদার মানবসম্পদ ও স্বেচ্ছাসেবক रोस्टर',
        sa: 'सेवाव्रती-मानवसंसाधन-नामावलिः',
      },
      role: 'SEVADAR',
      roleLabel: {
        en: 'Devoted Sevadar (Karmayogi)',
        hi: 'समर्पित सेवादार (कर्मयोगी)',
        bn: 'নিবেদিতপ্রাণ সেবাদার (কর্মযোগী)',
        sa: 'समर्पित-सेवाव्रती',
      },
      roleSummary: {
        en: 'Perform selfless NISHKAM_SEVA with humility and devotional focus; carry your authenticated PARICHAY_PATRA badge at all times, and serve devotees at your designated post—be it Joota Ghar, Garbhagriha, or Prasadam counters.',
        hi: 'परम नम्रता एवं निष्ठा के साथ NISHKAM_SEVA करें; सदैव अपना प्रमाणित PARICHAY_PATRA धारण करें, और अपने निर्धारित स्थल—चाहे वह जूता घर हो, GARBHAGRIHA या प्रसादम वितरण—पर तीर्थयात्रियों की सेवा करें।',
        bn: 'বিনম্র শ্রদ্ধা ও ভক্তির সাথে NISHKAM_SEVA সম্পাদন করুন; সর্বদা আপনার অনুমোদিত PARICHAY_PATRA পরিধান করুন এবং নির্ধারিত সেক্টরে—জুতো ঘর, GARBHAGRIHA বা প্রসাদ কাউন্টারে ভক্তদের সেবা দিন।',
        sa: 'नम्रतया NISHKAM_SEVA-व्रतं पालयन्तु; सर्वदा प्रमाणीकृतं PARICHAY_PATRA धारयन्तु, पादरक्षागृहे, GARBHAGRIHA-भागे प्रसादमवितरणे वा निष्ठापूर्वकं सेवध्वम्।',
      },
      steps: [
        {
          stepNumber: 1,
          title: {
            en: '1. KYC Registration & Parichay Patra Collection',
            hi: '१. पंजीकरण एवं परिचय पत्र प्राप्ति',
            bn: '১. নিবন্ধন ও পরিচয়পত্র সংগ্রহ',
            sa: '१. पञ्जीकरणं परिचय-पत्र-प्राप्तिश्च',
          },
          description: {
            en: 'Submit authentic identity documents. Once verified by the Manager or Trustee, collect and wear your official PARICHAY_PATRA badge for NISHKAM_SEVA.',
            hi: 'अपने प्रामाणिक पहचान दस्तावेज प्रस्तुत करें। सत्यापन के उपरांत NISHKAM_SEVA हेतु अपना आधिकारिक PARICHAY_PATRA प्राप्त कर धारण करें।',
            bn: 'প্রয়োজনীয় পরিচয়পত্র জমা দিন। অনুমোদন শেষে NISHKAM_SEVA-র উদ্দেশ্যে অফিশিয়াল PARICHAY_PATRA গ্রহণ করে ব্যাজ পরিধান করুন।',
            sa: 'प्रमाणपत्रं प्रदर्श्य NISHKAM_SEVA-कार्याय अधिकृतं PARICHAY_PATRA प्राप्य धारयन्तु।',
          },
          actionRequired: {
            en: 'Carry physical ID badge visibly throughout duty shift',
            hi: 'ड्यूटी शिफ्ट के दौरान पहचान पत्र स्पष्ट रूप से प्रदर्शित रखें',
            bn: 'কাজের সময় আইডি ব্যাজটি দৃশ্যমান রাখুন',
            sa: 'कार्यकाले परिचयपत्रं कण्ठे धारयन्तु',
          },
          highlightedTerms: ['PARICHAY_PATRA', 'NISHKAM_SEVA'],
          complianceTag: 'Temple Credential Decorum',
        },
        {
          stepNumber: 2,
          title: {
            en: '2. Punctual Reporting at Assigned Sector',
            hi: '२. निर्धारित सेक्टर पर समयबद्ध उपस्थिति',
            bn: '২. নির্ধারিত সেক্টরে সময়মতো রিপোর্টিং',
            sa: '२. स्वक्षेत्रे समयपालनम्',
          },
          description: {
            en: 'Report 15 minutes before shift starts to Joota Ghar, GARBHAGRIHA, or Prasadam distribution counters. Perform handover from previous sevadar.',
            hi: 'शिफ्ट प्रारंभ होने से १५ मिनट पूर्व जूता घर, GARBHAGRIHA अथवा प्रसादम काउंटर पर उपस्थिति दर्ज कराएं एवं पूर्व सेवादार से चार्ज लें।',
            bn: 'শিফট শুরুর ১৫ মিনিট আগে জুতো ঘর, GARBHAGRIHA বা প্রসাদ কাউন্টারে উপস্থিত হয়ে দায়িত্ব বুঝে নিন।',
            sa: 'समयतः पूर्वं पादरक्षागृहे, GARBHAGRIHA-स्थाने, प्रसादमवितरणे वा उपस्थिताः भवन्तु।',
          },
          actionRequired: {
            en: 'Confirm shift check-in with Sector supervisor',
            hi: 'सेक्टर सुपरवाइजर के साथ शिफ्ट चेक-इन की पुष्टि करें',
            bn: 'সেক্টর সুপারের কাছে শিফট শুরুর নিশ্চিতকরণ করুন',
            sa: 'अधीक्षकस्य समीपे उपस्थितिं सूचयन्तु',
          },
          highlightedTerms: ['GARBHAGRIHA', 'SEVADAR'],
          complianceTag: 'Shift Punctuality Protocol',
        },
        {
          stepNumber: 3,
          title: {
            en: '3. Shastric Etiquette & Devotee Assistance',
            hi: '३. शास्त्रीय शिष्टाचार एवं तीर्थयात्री सहायता',
            bn: '৩. শাস্ত্রীয় শিষ্টাচার ও তীর্থযাত্রী সেবা',
            sa: '३. शास्त्रमर्यादा तीर्थयात्रिकसेवा च',
          },
          description: {
            en: 'Treat every devotee as an embodiment of the Divine. Provide special assistance to elders and physically challenged pilgrims with pure NISHKAM_SEVA dedication.',
            hi: 'प्रत्येक श्रद्धालु को नारायण स्वरूप मानकर आदर दें। वृद्धजनों एवं दिव्यांग तीर्थयात्रियों को NISHKAM_SEVA भाव से प्राथमिकता सहायता दें।',
            bn: 'প্রত্যেক ভক্তকে ভগবানের স্বরূপ ভেবে সেবা করুন। প্রবীণ ও বিশেষ চাহিদাসম্পন্ন ভক্তদের প্রতি গভীর শ্রদ্ধায় NISHKAM_SEVA প্রদান করুন।',
            sa: 'सर्वान् यात्रिकान् भगवत्स्वरूपं मत्वा NISHKAM_SEVA-भावेन वृद्धानां दिव्याङ्गानां च साहाय्यं कुर्वन्तु।',
          },
          actionRequired: {
            en: 'Maintain serene speech, calm presence, and devotional focus',
            hi: 'शांत वाणी, विनम्र व्यवहार एवं भक्तिमय भाव बनाए रखें',
            bn: 'ধৈর্যশীল ও বিনম্র আচরণ প্রদর্শন করুন',
            sa: 'शान्तवाण्या नम्रभावेन च सेवध्वम्',
          },
          highlightedTerms: ['NISHKAM_SEVA', 'SEVADAR'],
          complianceTag: 'Sanatana Seva Dharma Standard',
        },
      ],
      checklistItems: [
        {
          en: 'PARICHAY_PATRA credential clearly displayed with lanyard',
          hi: 'PARICHAY_PATRA पहचान पत्र डोरी के साथ स्पष्ट रूप से प्रदर्शित',
          bn: 'PARICHAY_PATRA ব্যাজ সঠিকভাবে গলায় পরিহিত',
          sa: 'PARICHAY_PATRA-पत्रं कण्ठे सुशोभितम्',
        },
        {
          en: 'Clean traditional attire in accordance with temple rules',
          hi: 'मंदिर मर्यादा के अनुरूप स्वच्छ पारंपरिक वस्त्र',
          bn: 'মন্দিরের নিয়ম মেনে পরিচ্ছন্ন ঐতিহ্যবাহী পোশাক পরিধান',
          sa: 'स्वच्छ-पारम्परिक-वस्त्राणि धृतानि',
        },
        {
          en: 'Active communication with Sector In-charge during heavy pilgrim surges',
          hi: 'भीड़ बढ़ने पर सेक्टर प्रभारी से निरंतर संपर्क बनाए रखना',
          bn: 'ভিড় বাড়লে সেক্টর ইন-চার্জের সাথে সার্বক্ষণিক যোগাযোগ রক্ষা',
          sa: 'अधिकसङ्घर्षे सञ्चारसंपर्कः रक्षितः',
        },
      ],
    },
  },
};


