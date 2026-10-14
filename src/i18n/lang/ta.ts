import type { TranslationSchema } from '../schema';

/**
 * ta — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
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
  };

export default dict;
