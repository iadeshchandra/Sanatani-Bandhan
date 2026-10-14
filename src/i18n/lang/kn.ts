import type { TranslationSchema } from '../schema';

/**
 * kn — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
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
  };

export default dict;
