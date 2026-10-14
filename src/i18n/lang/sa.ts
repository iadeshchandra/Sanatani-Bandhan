import type { TranslationSchema } from '../schema';

/**
 * sa — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
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
  };

export default dict;
