/**
 * microcopy.ts — human language for the highest-traffic flows (Pillar 5).
 * =====================================================================
 * Two jobs:
 *  1. Never expose raw errors ("Error 400", Firebase codes) — wrap them
 *     in warm, actionable copy via `humanizeError()`.
 *  2. Success moments speak like a person, not a database:
 *     "🙏 Seva recorded with gratitude", never "Saved successfully".
 *
 * All strings are trilingual (EN/BN/HI) following the app's convention.
 * Usage: `const t = pickLang(lang); showToast(t(humanizeError(err)), 'error')`.
 */

export interface TriCopy {
  en: string;
  bn: string;
  hi: string;
}

/** Pick the right language string. */
export function pickLang(lang: string): (t: TriCopy) => string {
  return (t) => (lang === 'bn' ? t.bn : lang === 'hi' ? t.hi : t.en);
}

/**
 * Map any thrown error to warm, actionable copy. Unknown errors collapse
 * to a single honest line — never a stack trace, never a raw code.
 */
export function humanizeError(err: unknown): TriCopy {
  const code =
    typeof err === 'object' && err !== null
      ? String((err as { code?: unknown }).code || '')
      : '';
  const raw =
    typeof err === 'object' && err !== null
      ? String((err as { message?: unknown }).message || '')
      : String(err || '');

  // Offline / network — the most common "error" in rural Bharat.
  if (
    code === 'unavailable' ||
    /network|offline|failed to fetch|load failed|net::/i.test(raw + code)
  ) {
    return {
      en: 'No connection right now — your work is safe on this device and will sync when you are back online.',
      bn: 'এখন সংযোগ নেই — আপনার কাজ এই ডিভাইসে নিরাপদ, অনলাইনে ফিরলেই সিঙ্ক হবে।',
      hi: 'अभी कनेक्शन नहीं है — आपका कार्य इस डिवाइस पर सुरक्षित है, ऑनलाइन आते ही सिंक हो जाएगा।',
    };
  }
  // Firestore security rules — never leak rule internals.
  if (code === 'permission-denied' || /permission/i.test(raw)) {
    return {
      en: 'You do not have permission for this right now. If you believe this is a mistake, please contact your trustee.',
      bn: 'এই কাজের অনুমতি আপনার এখন নেই। ভুল মনে হলে ট্রাস্টির সাথে যোগাযোগ করুন।',
      hi: 'इस कार्य की अनुमति अभी आपके पास नहीं है। गलती लगे तो अपने ट्रस्टी से संपर्क करें।',
    };
  }
  // Auth.
  if (code === 'auth/email-already-in-use') {
    return {
      en: 'This email is already registered — try signing in instead. 🙏',
      bn: 'এই ইমেইল ইতিমধ্যে নিবন্ধিত — সাইন ইন করে দেখুন। 🙏',
      hi: 'यह ईमेल पहले से पंजीकृत है — साइन इन करके देखें। 🙏',
    };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return {
      en: 'The email or password did not match. Please try again.',
      bn: 'ইমেইল বা পাসওয়ার্ড মেলেনি। আবার চেষ্টা করুন।',
      hi: 'ईमेल या पासवर्ड मेल नहीं खाया। पुनः प्रयास करें।',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      en: 'Too many attempts — please wait a little while and try again.',
      bn: 'অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।',
      hi: 'बहुत प्रयास हो गए — थोड़ी देर रुककर पुनः प्रयास करें।',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      en: 'Could not reach the sign-in service. Please check your connection and try again.',
      bn: 'সাইন-ইন পরিষেবায় পৌঁছানো যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।',
      hi: 'साइन-इन सेवा से संपर्क नहीं हो सका। कनेक्शन जाँचकर पुनः प्रयास करें।',
    };
  }
  if (code.startsWith('auth/')) {
    return {
      en: 'Sign-in hit a snag. Please try again — and reach out if it keeps happening.',
      bn: 'সাইন-ইনে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      hi: 'साइन-इन में अड़चन आई। पुनः प्रयास करें।',
    };
  }
  // Storage quota (IndexedDB / photo uploads).
  if (/quota/i.test(raw + code)) {
    return {
      en: 'This device is running low on space. Freeing some space and retrying usually fixes this.',
      bn: 'ডিভাইসে জায়গা কম। কিছু জায়গা খালি করে আবার চেষ্টা করুন।',
      hi: 'डिवाइस में जगह कम है। कुछ जगह खाली करके पुनः प्रयास करें।',
    };
  }
  // The honest fallback — warm, no codes, no traces.
  return {
    en: 'Something did not go as planned. Please try again — your data is safe.',
    bn: 'কিছু ঠিকমতো হয়নি। আবার চেষ্টা করুন — আপনার তথ্য নিরাপদ।',
    hi: 'कुछ योजना के अनुसार नहीं हुआ। पुनः प्रयास करें — आपका डेटा सुरक्षित है।',
  };
}

/** Warm success copy for the highest-traffic flows. */
export const WARM_SUCCESS = {
  donationRecorded: (amount: string): TriCopy => ({
    en: `🙏 Seva of ${amount} recorded with gratitude`,
    bn: `🙏 ${amount} সেবা কৃতজ্ঞতার সাথে সংরক্ষিত`,
    hi: `🙏 ${amount} सेवा कृतज्ञता सहित दर्ज`,
  }),
  japaOffered: (count: string, mantra: string): TriCopy => ({
    en: `🙏 ${count} ${mantra} offered with devotion`,
    bn: `🙏 ${count} ${mantra} ভক্তিভরে অর্পিত`,
    hi: `🙏 ${count} ${mantra} भक्तिपूर्वक अर्पित`,
  }),
  bookingReceived: (pooja: string, name: string): TriCopy => ({
    en: `🙏 Sankalp received — ${pooja} for ${name}`,
    bn: `🙏 সংকল্প গৃহীত — ${name}-এর জন্য ${pooja}`,
    hi: `🙏 संकल्प प्राप्त — ${name} हेतु ${pooja}`,
  }),
  welcomeNew: (id: string): TriCopy => ({
    en: `🙏 Welcome! Your Sanatani ID: ${id}`,
    bn: `🙏 স্বাগতম! আপনার সনাতনী আইডি: ${id}`,
    hi: `🙏 स्वागत है! आपकी सनातनी आईडी: ${id}`,
  }),
} as const;
