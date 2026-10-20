/**
 * notifications/warmCopy.ts — the single source of truth for notification copy.
 * ============================================================================
 * PHASE 4 — Notification intelligence layer.
 *
 * EVERY notification string the system can emit lives here, in EN/BN/HI,
 * in the Sanatani voice: warm, dignified, calm — never corporate-cold.
 * Sacred terms (Suchana, dhanyavaad, ashirvad, dakshina, sangha) are never
 * translated. Emojis stay gentle: 🪔 🌸 🙏 📿.
 *
 * PHASE 3 INTEGRATION (import shape — this is the contract):
 *
 *   import {
 *     WARM_COPY,          // Record<WarmCopyKind, Record<string, CopyEntry>>
 *     copyFor,            // (kind, key) => CopyEntry   (safe fallback included)
 *     renderCopy,         // (entry, params, lang) => { title, body }
 *     warmCopyKeys,       // (kind) => string[]         (for UI previews/tests)
 *     type CopyEntry,
 *     type WarmCopyKind,
 *   } from './warmCopy';
 *
 *   const c = renderCopy(copyFor('money_request', 'settled'), { name: 'Rahim', amount: '৳500' }, 'bn');
 *   // → { title: '…', body: '…' }
 *
 * PLACEHOLDER CONVENTION: {name} {amount} {orgName} {festival} {count}
 * {title} {preview} {thread} {hours} {days} {place}. Params are plain
 * strings/numbers supplied by the emitter; unknown placeholders are left
 * visibly intact (see `fill` in ./types via renderCopy) so a missing param
 * never silently produces a broken sentence.
 *
 * Organized by kind: sos · chat · money_request · wallet · suchana · org ·
 * blessing · security — mirroring Phase 1's NotifyKind.
 */

import { type NotifyKind, type NotifyLang, type TriText } from './types';

export type WarmCopyKind = NotifyKind;

export interface CopyEntry {
  title: TriText;
  body: TriText;
}

const t = (en: string, bn: string, hi: string): TriText => ({ en, bn, hi });

/**
 * Fill `{placeholders}` with params. Unknown placeholders are left visibly
 * intact so a missing param never silently produces a broken sentence.
 */
function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

export const WARM_COPY: Record<WarmCopyKind, Record<string, CopyEntry>> = {
  /* ---------------------------------------------------------------- */
  /* SOS — the one kind allowed to interrupt. Calm, never alarming.     */
  /* ---------------------------------------------------------------- */
  sos: {
    alertSent: {
      title: t('Help is on the way 🪔', 'সাহায্য আসছে 🪔', 'सहायता आ रही है 🪔'),
      body: t(
        'Your sangha has been notified. Stay calm, stay safe — help is reaching you.',
        'আপনার সংঘকে জানানো হয়েছে। শান্ত থাকুন, নিরাপদে থাকুন — সাহায্য পৌঁছে যাচ্ছে।',
        'आपके संघ को सूचित कर दिया गया है। शांत रहें, सुरक्षित रहें — मदद आप तक पहुँच रही है।',
      ),
    },
    ackReceived: {
      title: t('{name} heard your call 🙏', '{name} আপনার ডাক শুনেছেন 🙏', '{name} ने आपकी पुकार सुनी 🙏'),
      body: t(
        'Take heart — {name} is responding to your SOS. You are not alone.',
        'ভরসা রাখুন — {name} আপনার SOS-এর জবাব দিচ্ছেন। আপনি একা নন।',
        'धैर्य रखें — {name} आपकी SOS का उत्तर दे रहे हैं। आप अकेले नहीं हैं।',
      ),
    },
    escalated: {
      title: t('Your alert is reaching further', 'আপনার সতর্কতা আরও দূরে পৌঁছাচ্ছে', 'आपका अलर्ट और दूर पहुँच रहा है'),
      body: t(
        'No response yet, so your SOS has been shared with more members nearby. Stay where it is safe.',
        'এখনও সাড়া মেলেনি, তাই আপনার SOS আশেপাশের আরও সদস্যদের জানানো হয়েছে। নিরাপদ জায়গায় থাকুন।',
        'अभी कोई जवाब नहीं मिला, इसलिए आपकी SOS आस-पास के और सदस्यों तक पहुँचाई गई है। सुरक्षित जगह पर रहें।',
      ),
    },
    resolved: {
      title: t('All is well 🙏', 'সব ঠিক আছে 🙏', 'सब कुशल है 🙏'),
      body: t(
        'The SOS has been resolved. May you stay protected, always.',
        'SOS সমাধান হয়েছে। আপনি সর্বদা সুরক্ষিত থাকুন।',
        'SOS का समाधान हो गया है। आप सदा सुरक्षित रहें।',
      ),
    },
    responderAlert: {
      title: t('🙏 {name} needs help', '🙏 {name}-এর সাহায্য দরকার', '🙏 {name} को सहायता चाहिए'),
      body: t(
        '{situation}{details} Someone near you has sent an SOS. If you can respond safely, tap "I\'m coming".',
        '{situation}{details} আপনার কাছাকাছি কেউ SOS পাঠিয়েছেন। নিরাপদে সাড়া দিতে পারলে "আমি আসছি" চাপুন।',
        '{situation}{details} आपके पास किसी ने SOS भेजा है। यदि सुरक्षित रूप से जवाब दे सकें, तो "मैं आ रहा हूँ" दबाएँ।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Chat — warm, human, never noisy.                                   */
  /* ---------------------------------------------------------------- */
  chat: {
    message: {
      title: t('{name} sent you a message', '{name} আপনাকে একটি বার্তা পাঠিয়েছেন', '{name} ने आपको एक संदेश भेजा है'),
      body: t('{preview}', '{preview}', '{preview}'),
    },
    blessingCard: {
      title: t('🌸 A blessing for you', '🌸 আপনার জন্য একটি আশীর্বাদ', '🌸 आपके लिए एक आशीर्वाद'),
      body: t(
        '{name} sent you a blessing card. Open it with a quiet heart.',
        '{name} আপনাকে একটি আশীর্বাদ-কার্ড পাঠিয়েছেন। শান্ত মনে খুলুন।',
        '{name} ने आपको एक आशीर्वाद-कार्ड भेजा है। शांत हृदय से खोलें।',
      ),
    },
    mention: {
      title: t('{name} mentioned you', '{name} আপনার নাম নিয়েছেন', '{name} ने आपका नाम लिया है'),
      body: t('In {thread}: {preview}', '{thread}-এ: {preview}', '{thread} में: {preview}'),
    },
    groupInvite: {
      title: t('You are invited to {thread} 📿', 'আপনাকে {thread}-এ আমন্ত্রণ 📿', 'आपको {thread} में आमंत्रण 📿'),
      body: t(
        '{name} added you to the satsang circle. Join when your heart is ready.',
        '{name} আপনাকে সৎসঙ্গ বৃত্তে যোগ করেছেন। মন চাইলে যোগ দিন।',
        '{name} ने आपको सत्संग मंडली में जोड़ा है। जब हृदय चाहे, जुड़ें।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Money requests — dignified language around money. Never shame.     */
  /* ---------------------------------------------------------------- */
  money_request: {
    received: {
      title: t('{name} requests {amount}', '{name} {amount} চেয়েছেন', '{name} ने {amount} का अनुरोध किया है'),
      body: t(
        'A gentle money request awaits your kind response. No hurry — respond at your ease.',
        'একটি কোমল অর্থ-অনুরোধ আপনার সদয় জবাবের অপেক্ষায়। তাড়া নেই — সুবিধামতো জবাব দিন।',
        'एक सौम्य धन-अनुरोध आपकी कृपापूर्ण प्रतिक्रिया की प्रतीक्षा में है। कोई जल्दी नहीं — सुविधानुसार उत्तर दें।',
      ),
    },
    accepted: {
      title: t('{name} accepted your request 🙏', '{name} আপনার অনুরোধ গ্রহণ করেছেন 🙏', '{name} ने आपका अनुरोध स्वीकार किया 🙏'),
      body: t(
        '{amount} is on its way. Trust, kept with grace.',
        '{amount} আসছে। বিশ্বাস রক্ষা হলো মর্যাদার সঙ্গে।',
        '{amount} आ रहा है। विश्वास गरिमा के साथ निभाया गया।',
      ),
    },
    declined: {
      title: t('{name} could not help this time', '{name} এবার সাহায্য করতে পারলেন না', '{name} इस बार सहायता नहीं कर सके'),
      body: t(
        'They declined your request of {amount}. No ill will — relationships matter more than rupees.',
        'তারা আপনার {amount}-এর অনুরোধ ফিরিয়ে দিয়েছেন। মন খারাপ করবেন না — টাকার চেয়ে সম্পর্ক বড়।',
        'उन्होंने आपके {amount} के अनुरोध को अस्वीकार किया। बुरा न मानें — रुपयों से रिश्ते बड़े हैं।',
      ),
    },
    countered: {
      title: t('{name} suggested {amount}', '{name} {amount} প্রস্তাব করেছেন', '{name} ने {amount} का प्रस्ताव रखा है'),
      body: t(
        'A counter-offer on your money request. Consider it with a calm mind.',
        'আপনার অর্থ-অনুরোধে একটি পাল্টা প্রস্তাব। শান্ত মনে বিবেচনা করুন।',
        'आपके धन-अनुरोध पर एक जवाबी प्रस्ताव। शांत मन से विचार करें।',
      ),
    },
    settled: {
      title: t('🪔 {name} has settled their obligation — dhanyavaad', '🪔 {name} তাঁর দায় মিটিয়েছেন — ধন্যবাদ', '🪔 {name} ने अपना दायित्व निभाया — धन्यवाद'),
      body: t(
        '{amount} marked as settled. A promise kept is a bond strengthened.',
        '{amount} মিটে গেছে বলে চিহ্নিত। রক্ষিত প্রতিশ্রুতি সম্পর্ককে দৃঢ় করে।',
        '{amount} चुका दिया गया। निभाया वादा बंधन को मज़बूत करता है।',
      ),
    },
    reminderSent: {
      title: t('Gentle reminder sent 🪔', 'কোমল স্মরণ পাঠানো হয়েছে 🪔', 'सौम्य स्मरण भेजा गया 🪔'),
      body: t(
        'Your reminder to {name} was delivered softly. Kindness first, always.',
        '{name}-কে আপনার স্মরণ কোমলভাবে পৌঁছে গেছে। সবসময় সদয়তা আগে।',
        '{name} को आपका स्मरण कोमलता से पहुँच गया। सदा दया पहले।',
      ),
    },
    paid: {
      title: t('{name} has sent {amount} 🙏', '{name} {amount} পাঠিয়েছেন 🙏', '{name} ने {amount} भेजा है 🙏'),
      body: t(
        'The money is on its way via {via}. Please confirm once it reaches you, so the ledger stays honest.',
        '{via}-এর মাধ্যমে অর্থ আসছে। পৌঁছালে অনুগ্রহ করে নিশ্চিত করুন, যাতে হিসাব সৎ থাকে।',
        '{via} के माध्यम से धन आ रहा है। पहुँचने पर कृपया पुष्टि करें, ताकि हिसाब ईमानदार रहे।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Wallet — the Seva Wallet and platform money.                       */
  /* ---------------------------------------------------------------- */
  wallet: {
    topupCredited: {
      title: t('Top-up credited 🙏', 'টপ-আপ জমা হয়েছে 🙏', 'टॉप-अप जमा हुआ 🙏'),
      body: t(
        '{amount} added to your Seva Wallet. Dhanyavaad for your trust.',
        'আপনার সেবা ওয়ালেটে {amount} যোগ হয়েছে। আপনার বিশ্বাসের জন্য ধন্যবাদ।',
        'आपके सेवा वॉलेट में {amount} जुड़ गया। आपके विश्वास के लिए धन्यवाद।',
      ),
    },
    topupRejected: {
      title: t('Top-up needs attention', 'টপ-আপে নজর দরকার', 'टॉप-अप पर ध्यान चाहिए'),
      body: t(
        'Your top-up of {amount} could not be verified. Please check the details and resubmit — your money is safe.',
        'আপনার {amount}-এর টপ-আপ যাচাই করা যায়নি। বিবরণ দেখে আবার জমা দিন — আপনার অর্থ নিরাপদ।',
        'आपके {amount} का टॉप-अप सत्यापित नहीं हो सका। विवरण जाँचकर पुनः जमा करें — आपका धन सुरक्षित है।',
      ),
    },
    commissionDue: {
      title: t('Seva contribution due', 'সেবা অবদান বাকি', 'सेवा योगदान बकाया'),
      body: t(
        '{amount} seva contribution is due on your completed seva. Settling it keeps your verified badge shining.',
        'সম্পন্ন সেবার জন্য {amount} সেবা অবদান বাকি। মিটিয়ে দিলে আপনার যাচাইকৃত ব্যাজ উজ্জ্বল থাকবে।',
        'पूर्ण सेवा पर {amount} सेवा योगदान बकाया है। चुकाने से आपका सत्यापित बैज चमकता रहेगा।',
      ),
    },
    lowBalance: {
      title: t('Seva Wallet is running low', 'সেবা ওয়ালেট প্রায় শেষ', 'सेवा वॉलेट लगभग खाली'),
      body: t(
        'Balance is {amount}. Top up at your convenience so your sevas never pause.',
        'ব্যালেন্স {amount}। সুবিধামতো টপ-আপ করুন, যাতে আপনার সেবা না থামে।',
        'शेष {amount} है। सुविधानुसार टॉप-अप करें ताकि आपकी सेवाएँ न रुकें।',
      ),
    },
    refundIssued: {
      title: t('Refund issued 🙏', 'ফেরত দেওয়া হয়েছে 🙏', 'धनवापसी जारी 🙏'),
      body: t(
        '{amount} has been returned to your wallet. Sorry for the trouble — dhanyavaad for your patience.',
        '{amount} আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে। অসুবিধার জন্য দুঃখিত — ধৈর্যের জন্য ধন্যবাদ।',
        '{amount} आपके वॉलेट में वापस कर दिया गया। असुविधा के लिए क्षमा — धैर्य के लिए धन्यवाद।',
      ),
    },
    payoutReceived: {
      title: t('{amount} received in your wallet 🙏', 'আপনার ওয়ালেটে {amount} পৌঁছেছে 🙏', 'आपके वॉलेट में {amount} प्राप्त हुआ 🙏'),
      body: t(
        'A payment for your completed seva has arrived. Dhanyavaad for your honest work.',
        'আপনার সম্পন্ন সেবার পারিশ্রমিক এসেছে। সৎ কাজের জন্য ধন্যবাদ।',
        'आपकी पूर्ण सेवा का भुगतान आ गया है। ईमानदार कार्य हेतु धन्यवाद।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Suchana — the morning digest. Warm, never a "notification".        */
  /* ---------------------------------------------------------------- */
  suchana: {
    morningDigest: {
      title: t('🌅 Ajker Suchana', '🌅 আজকের সূচনা', '🌅 आज की सूचना'),
      body: t(
        'Your gentle morning digest is ready — {count} things to know today.',
        'আপনার কোমল সকালের ডাইজেস্ট প্রস্তুত — আজকের {count}টি জানার বিষয়।',
        'आपका सौम्य सुबह का डाइजेस्ट तैयार है — आज जानने योग्य {count} बातें।',
      ),
    },
    festivalGreeting: {
      title: t('🌸 Shubh {festival}!', '🌸 শুভ {festival}!', '🌸 शुभ {festival}!'),
      body: t(
        '{blessing}',
        '{blessing}',
        '{blessing}',
      ),
    },
    tithiReminder: {
      title: t('📿 {title}', '📿 {title}', '📿 {title}'),
      body: t(
        'A sacred observance approaches — {title}. Prepare with a quiet heart.',
        'একটি পবিত্র পালন আসন্ন — {title}। শান্ত মনে প্রস্তুত হোন।',
        'एक पवित्र पालन निकट है — {title}। शांत हृदय से तैयारी करें।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Org — announcements, events, invitations from the devotee's orgs.  */
  /* ---------------------------------------------------------------- */
  org: {
    announcement: {
      title: t('📢 {orgName}', '📢 {orgName}', '📢 {orgName}'),
      body: t('{title}', '{title}', '{title}'),
    },
    eventRsvp: {
      title: t('You are invited: {title} 📿', 'আমন্ত্রণ: {title} 📿', 'आमंत्रण: {title} 📿'),
      body: t(
        '{orgName} invites you. Your presence would be a blessing — RSVP at your ease.',
        '{orgName} আপনাকে আমন্ত্রণ জানাচ্ছে। আপনার উপস্থিতি আশীর্বাদ হবে — সুবিধামতো জানান।',
        '{orgName} आपको आमंत्रित करता है। आपकी उपस्थिति आशीर्वाद होगी — सुविधानुसार उत्तर दें।',
      ),
    },
    newMember: {
      title: t('Welcome a new member 🌸', 'নতুন সদস্যকে স্বাগত জানান 🌸', 'नए सदस्य का स्वागत करें 🌸'),
      body: t(
        '{name} has joined {orgName}. A warm welcome makes a sangha a home.',
        '{name} {orgName}-এ যোগ দিয়েছেন। উষ্ণ অভ্যর্থনা সংঘকে ঘর বানায়।',
        '{name} {orgName} से जुड़े हैं। उष्ण स्वागत संघ को घर बनाता है।',
      ),
    },
    duesReminder: {
      title: t('A small reminder 🪔', 'একটি ছোট স্মরণ 🪔', 'एक छोटा स्मरण 🪔'),
      body: t(
        '{orgName}: your contribution of {amount} is due. No hurry — at your convenience, with a glad heart.',
        '{orgName}: আপনার {amount} অবদান বাকি। তাড়া নেই — সুবিধামতো, প্রসন্ন মনে।',
        '{orgName}: आपका {amount} योगदान बकाया है। कोई जल्दी नहीं — सुविधानुसार, प्रसन्न मन से।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Blessing — ashirvad, festival wishes, tithi greetings.             */
  /* ---------------------------------------------------------------- */
  blessing: {
    received: {
      title: t('🌸 You received an ashirvad', '🌸 আপনি একটি আশীর্বাদ পেয়েছেন', '🌸 आपको एक आशीर्वाद मिला'),
      body: t(
        '{name} sends you blessings. May they light your path.',
        '{name} আপনাকে আশীর্বাদ পাঠিয়েছেন। তা আপনার পথ আলোকিত করুক।',
        '{name} आपको आशीर्वाद भेजते हैं। वह आपके पथ को प्रकाशित करें।',
      ),
    },
    festivalBoost: {
      title: t('🌸 Shubh {festival}!', '🌸 শুভ {festival}!', '🌸 शुभ {festival}!'),
      body: t(
        'May light guide your path and dharma steady your heart. Shubh {festival}!',
        'আলো আপনার পথ দেখাক, ধর্ম আপনার হৃদয় স্থির রাখুক। শুভ {festival}!',
        'प्रकाश आपका पथ दिखाए, धर्म आपका हृदय स्थिर रखे। शुभ {festival}!',
      ),
    },
    tithiGreeting: {
      title: t('🪔 {title}', '🪔 {title}', '🪔 {title}'),
      body: t(
        'On this sacred {title}, may peace settle in your home like evening aarti smoke.',
        'এই পবিত্র {title}-এ, সন্ধ্যারতির ধোঁয়ার মতো শান্তি আপনার ঘরে নামুক।',
        'इस पवित्र {title} पर, संध्या आरती के धुएँ जैसी शांति आपके घर उतरे।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Security — protective, plain, never fear-mongering.                 */
  /* ---------------------------------------------------------------- */
  security: {
    newSignIn: {
      title: t('New sign-in noticed', 'নতুন সাইন-ইন লক্ষ্য করা গেছে', 'नया साइन-इन देखा गया'),
      body: t(
        'Your account signed in from a new device. Was this you? If not, secure your account right away.',
        'নতুন ডিভাইস থেকে আপনার অ্যাকাউন্টে সাইন-ইন হয়েছে। এটা কি আপনি ছিলেন? না হলে এখনই অ্যাকাউন্ট সুরক্ষিত করুন।',
        'नए डिवाइस से आपके खाते में साइन-इन हुआ। क्या यह आप थे? नहीं तो तुरंत खाता सुरक्षित करें।',
      ),
    },
    suspiciousBlocked: {
      title: t('Stay alert 🛡️', 'সতর্ক থাকুন 🛡️', 'सावधान रहें 🛡️'),
      body: t(
        'Unusual activity on your account was blocked. Your data is safe — no action needed.',
        'আপনার অ্যাকাউন্টে অস্বাভাবিক কার্যকলাপ আটকে দেওয়া হয়েছে। আপনার তথ্য নিরাপদ — কিছু করার দরকার নেই।',
        'आपके खाते में असामान्य गतिविधि रोक दी गई। आपका डेटा सुरक्षित है — कोई कार्रवाई ज़रूरी नहीं।',
      ),
    },
    passwordChanged: {
      title: t('Password updated', 'পাসওয়ার্ড হালনাগাদ হয়েছে', 'पासवर्ड अपडेट हुआ'),
      body: t(
        'Your password was changed just now. If this was you, all is well. If not, contact support at once.',
        'আপনার পাসওয়ার্ড এইমাত্র বদলানো হয়েছে। এটা আপনি হলে সব ঠিক আছে। না হলে এখনই সহায়তায় যোগাযোগ করুন।',
        'आपका पासवर्ड अभी बदला गया। यदि यह आप थे, तो सब ठीक है। नहीं तो तुरंत सहायता से संपर्क करें।',
      ),
    },
    roleChanged: {
      title: t('Your role was updated', 'আপনার ভূমিকা হালনাগাদ হয়েছে', 'आपकी भूमिका अपडेट हुई'),
      body: t(
        'Your role in {orgName} is now {title}. With new responsibility comes new trust — shubh kamana.',
        '{orgName}-এ আপনার ভূমিকা এখন {title}। নতুন দায়িত্বের সঙ্গে নতুন বিশ্বাস — শুভকামনা।',
        '{orgName} में आपकी भूमिका अब {title} है। नई ज़िम्मेदारी के साथ नया विश्वास — शुभकामना।',
      ),
    },
  },
  darshan_live: {
    wentLive: {
      title: t('🛕 {temple} is live', '🛕 {temple} লাইভে আছে', '🛕 {temple} लाइव है'),
      body: t(
        'Join the darshan — {temple} is streaming now.',
        'দর্শনে যোগ দিন — {temple} এখন স্ট্রিম করছে।',
        'दर्शन में जुड़ें — {temple} अभी स्ट्रीम कर रहा है।',
      ),
    },
  },
  aarti_reminder: {
    startingSoon: {
      title: t(
        '🪔 {aarti} at {temple} begins in {mins} minutes',
        '🪔 {temple}-এ {aarti} {mins} মিনিটে শুরু হবে',
        '🪔 {temple} में {aarti} {mins} मिनट में शुरू होगी',
      ),
      body: t(
        'A gentle bell before the aarti — join when you are ready.',
        'আরতির আগে একটি মৃদু ঘণ্টা — প্রস্তুত হলে যোগ দিন।',
        'आरती से पहले एक सौम्य घंटी — जब तैयार हों, जुड़ें।',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Social — community warmth. All GENTLE: never pings, never breaks   */
  /* quiet hours. Suchana, not notifications.                          */
  /* ---------------------------------------------------------------- */
  social: {
    ashirvad: {
      title: t('🪔 {names} sent Ashirvad', '🪔 {names} আশীর্বাদ পাঠিয়েছেন', '🪔 {names} ने आशीर्वाद भेजा है'),
      body: t(
        'Your post received blessings. May it bring joy to all who read it.',
        'আপনার পোস্ট আশীর্বাদ পেয়েছে। যারা পড়বেন সবার জন্য আনন্দ বয়ে আনুক।',
        'आपकी पोस्ट को आशीर्वाद मिला है। इसे पढ़ने वालों के लिए आनंद लाए।',
      ),
    },
    ashirvadMany: {
      title: t('🪔 {names} sent Ashirvad', '🪔 {names} আশীর্বাদ পাঠিয়েছেন', '🪔 {names} ने आशीर्वाद भेजा है'),
      body: t(
        'Your post is gathering blessings from the sangam. 🙏',
        'সঙ্গম থেকে আপনার পোস্টে আশীর্বাদ জমছে। 🙏',
        'संगम से आपकी पोस्ट पर आशीर्वाद जुट रहे हैं। 🙏',
      ),
    },
    comment: {
      title: t('💬 {name} commented', '💬 {name} মন্তব্য করেছেন', '💬 {name} ने टिप्पणी की है'),
      body: t(
        '"{preview}" — on your post.',
        '"{preview}" — আপনার পোস্টে।',
        '"{preview}" — आपकी पोस्ट पर।',
      ),
    },
    referralThanks: {
      title: t('🪔 You guided a family', '🪔 আপনি একটি পরিবারকে পথ দেখিয়েছেন', '🪔 आपने एक परिवार का मार्गदर्शन किया'),
      body: t(
        'A family booked seva with {provider} from your share. Sadhu!',
        '{provider}-এর কাছে আপনার শেয়ার থেকে একটি পরিবার সেবা নিল। সাধু!',
        'आपके शेयर से एक परिवार ने {provider} से सेवा ली। साधु!',
      ),
    },
    follow: {
      title: t('🙏 A new devotee follows you', '🙏 একজন নতুন ভক্ত আপনাকে অনুসরণ করছেন', '🙏 एक नए भक्त ने आपको फॉलो किया है'),
      body: t(
        'Your presence in the sangam is growing. Welcome them with warmth.',
        'সঙ্গমে আপনার উপস্থিতি বাড়ছে। উষ্ণতায় তাদের স্বাগত জানান।',
        'संगम में आपकी उपस्थिति बढ़ रही है। उन्हें स्नेह से स्वागत करें।',
      ),
    },
    rsvp: {
      title: t('📿 {names} will join {event}', '📿 {names} {event}-এ যোগ দেবেন', '📿 {names} {event} में शामिल होंगे'),
      body: t(
        'Your event is gathering hearts. Prepare with joy.',
        'আপনার অনুষ্ঠানে হৃদয় জমায়েত হচ্ছে। আনন্দে প্রস্তুতি নিন।',
        'आपके आयोजन में हृदय जुट रहे हैं। आनंद से तैयारी करें।',
      ),
    },
    rsvpMany: {
      title: t('📿 {names} will join {event}', '📿 {names} {event}-এ যোগ দেবেন', '📿 {names} {event} में शामिल होंगे'),
      body: t(
        '{count} devotees are coming to your event. The sangam gathers. 🙏',
        'আপনার অনুষ্ঠানে {count} জন ভক্ত আসছেন। সঙ্গম জমায়েত হচ্ছে। 🙏',
        'आपके आयोजन में {count} भक्त आ रहे हैं। संगम जुट रहा है। 🙏',
      ),
    },
  },

  /* ---------------------------------------------------------------- */
  /* Seva orders — the marketplace journey, told warmly (QUEUED #29).  */
  /* {seva} is the order's gigTitle; {amount} a formatted dakshina.    */
  /* Copy never names who cancelled or who raised a concern — the      */
  /* order doc does not record it, and Suchana does not invent it.     */
  /* ---------------------------------------------------------------- */
  seva_order: {
    newRequest: {
      title: t('🪔 New seva request', '🪔 নতুন সেবার অনুরোধ', '🪔 नया सेवा अनुरोध'),
      body: t(
        'A devotee seeks {seva}. Please review the request and accept when you are ready.',
        'একজন ভক্ত {seva} চান। অনুগ্রহ করে অনুরোধটি দেখুন এবং প্রস্তুত হলে গ্রহণ করুন।',
        'एक भक्त {seva} चाहते हैं। कृपया अनुरोध देखें और तैयार होने पर स्वीकार करें।',
      ),
    },
    advanceReceived: {
      title: t('🙏 Advance offered for your seva', '🙏 আপনার সেবার জন্য অগ্রিম অর্পিত', '🙏 आपकी सेवा के लिए अग्रिम अर्पित'),
      body: t(
        'The token advance for {seva} has been offered. Please confirm receipt so the muhurat is held.',
        '{seva}-এর জন্য টোকেন অগ্রিম অর্পণ করা হয়েছে। মুহূর্ত ধরে রাখতে অনুগ্রহ করে প্রাপ্তি নিশ্চিত করুন।',
        '{seva} के लिए टोकन अग्रिम अर्पित किया गया है। मुहूर्त सुरक्षित रखने के लिए कृपया प्राप्ति की पुष्टि करें।',
      ),
    },
    dakshinaReceived: {
      title: t('🙏 Your dakshina was received', '🙏 আপনার দক্ষিণা গৃহীত হয়েছে', '🙏 आपकी दक्षिणा प्राप्त हुई'),
      body: t(
        'Your dakshina of {amount} for {seva} has been received with gratitude. The seva now awaits acceptance.',
        '{seva}-এর জন্য আপনার {amount} দক্ষিণা কৃতজ্ঞতায় গৃহীত হয়েছে। সেবাটি এখন গ্রহণের অপেক্ষায়।',
        '{seva} के लिए आपकी {amount} दक्षिणा कृतज्ञता से प्राप्त हुई। सेवा अब स्वीकृति की प्रतीक्षा में है।',
      ),
    },
    sevaAccepted: {
      title: t('🪔 Your seva is confirmed', '🪔 আপনার সেবা নিশ্চিত হয়েছে', '🪔 आपकी सेवा निश्चित हुई'),
      body: t(
        '{seva} has been accepted and the muhurat is held. Prepare with a calm heart.',
        '{seva} গ্রহণ করা হয়েছে এবং মুহূর্ত সংরক্ষিত। শান্ত মনে প্রস্তুতি নিন।',
        '{seva} स्वीकार कर ली गई है और मुहूर्त सुरक्षित है। शांत हृदय से तैयारी करें।',
      ),
    },
    sevaBegun: {
      title: t('🪔 The seva has begun', '🪔 সেবা শুরু হয়েছে', '🪔 सेवा आरंभ हुई'),
      body: t(
        '{seva} is now underway. May it bring peace to your home.',
        '{seva} এখন চলমান। আপনার গৃহে শান্তি বর্ষিত হোক।',
        '{seva} अब चल रही है। आपके घर में शांति बनी रहे।',
      ),
    },
    contributionDue: {
      title: t('🙏 Seva offered — your contribution awaits', '🙏 সেবা সম্পন্ন — আপনার অবদান বাকি', '🙏 सेवा संपन्न — आपका योगदान शेष'),
      body: t(
        '{seva} has been offered. Please complete your seva contribution of {amount} to close the journey with gratitude.',
        '{seva} সম্পন্ন হয়েছে। কৃতজ্ঞতায় যাত্রা শেষ করতে অনুগ্রহ করে {amount} সেবা অবদান অর্পণ করুন।',
        '{seva} संपन्न हुई है। कृतज्ञता से यात्रा पूर्ण करने के लिए कृपया {amount} सेवा योगदान अर्पित करें।',
      ),
    },
    sevaComplete: {
      title: t('🌸 Seva complete', '🌸 সেবা সম্পূর্ণ', '🌸 सेवा पूर्ण'),
      body: t(
        '{seva} is complete. Dhanyavaad — may the blessings stay with you.',
        '{seva} সম্পূর্ণ হয়েছে। ধন্যবাদ — আশীর্বাদ আপনার সঙ্গে থাকুক।',
        '{seva} पूर्ण हुई। धन्यवाद — आशीर्वाद आपके साथ रहे।',
      ),
    },
    orderCancelled: {
      title: t('Seva booking cancelled', 'সেবার বুকিং বাতিল হয়েছে', 'सेवा बुकिंग रद्द हुई'),
      body: t(
        'The booking for {seva} stands cancelled. If this was unexpected, you can reach out through Messages.',
        '{seva}-এর বুকিংটি বাতিল হয়েছে। এটি অপ্রত্যাশিত হলে বার্তার মাধ্যমে যোগাযোগ করতে পারেন।',
        '{seva} की बुकिंग रद्द हो गई है। यदि यह अप्रत्याशित है, तो संदेशों से संपर्क कर सकते हैं।',
      ),
    },
    disputeOpened: {
      title: t('🙏 A concern was raised', '🙏 একটি উদ্বেগ জানানো হয়েছে', '🙏 एक चिंता व्यक्त की गई'),
      body: t(
        'A concern has been raised on {seva}. The Bandhan team will review it with care — nothing moves until it is resolved.',
        '{seva} নিয়ে একটি উদ্বেগ জানানো হয়েছে। বন্ধন টিম যত্নে এটি পর্যালোচনা করবে — সমাধান না হওয়া পর্যন্ত কিছুই এগোবে না।',
        '{seva} पर एक चिंता व्यक्त की गई है। बंधन टीम इसे ध्यान से देखेगी — समाधान तक कुछ आगे नहीं बढ़ेगा।',
      ),
    },
    refundSettled: {
      title: t('🪔 Dakshina returned', '🪔 দক্ষিণা ফেরত দেওয়া হয়েছে', '🪔 दक्षिणा लौटाई गई'),
      body: t(
        'The dakshina for {seva} has been returned in full. Dhanyavaad for your understanding.',
        '{seva}-এর দক্ষিণা পুরোপুরি ফেরত দেওয়া হয়েছে। আপনার বোঝাপড়ার জন্য ধন্যবাদ।',
        '{seva} की दक्षिणा पूरी लौटा दी गई है। आपकी समझ के लिए धन्यवाद।',
      ),
    },
  },
};

/**
 * Look up a copy entry. Unknown kind/key → a clearly-marked fallback entry
 * (never throws, never returns undefined — the UI always has something calm
 * to show, and the fallback text makes the gap visible in QA).
 */
export function copyFor(kind: WarmCopyKind, key: string): CopyEntry {
  const byKind = WARM_COPY[kind];
  const entry = byKind?.[key];
  if (entry) return entry;
  const missing = `[copy:${kind}/${key}]`;
  return { title: { en: missing, bn: missing, hi: missing }, body: { en: '', bn: '', hi: '' } };
}

/**
 * Fill placeholders and pick a language: the one call Phase 3 emitters use.
 *   renderCopy(copyFor('money_request', 'settled'), { name, amount }, 'bn')
 */
export function renderCopy(
  entry: CopyEntry,
  params: Record<string, string | number> = {},
  lang: NotifyLang = 'en',
): { title: string; body: string } {
  return {
    title: fill(entry.title[lang] ?? entry.title.en, params),
    body: fill(entry.body[lang] ?? entry.body.en, params),
  };
}

/** All copy keys for a kind — for settings previews, QA, and tests. */
export function warmCopyKeys(kind: WarmCopyKind): string[] {
  return Object.keys(WARM_COPY[kind] ?? {});
}
