import type { TranslationSchema } from '../schema';

/**
 * gu — Sanatani Bandhan UI dictionary (lazy-loaded).
 * Must satisfy TranslationSchema. Missing keys degrade to English via
 * the t() fallback chain (lang → en → key), never to a blank string.
 */

const dict: TranslationSchema =  {
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
  };

export default dict;
