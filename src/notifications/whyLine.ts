/**
 * whyLine.ts — Blueprint D, deliverable 6: "Why am I seeing this?"
 * ============================================================================
 * Research §4's trust rule: every reminder carries its reason. A
 * notification a devotee cannot explain is a notification they will
 * learn to distrust — and an unexplained SOS erodes the one channel
 * that must stay trusted. So every card in the centre can answer,
 * in one calm line, with the CATEGORY and the CONTROL that allowed
 * it: not "the system decided", but "Chat messages are set to
 * Instant — your choice in Suchana controls".
 *
 * Pure: the line is derived from the item's own stored routing
 * decision (the centre writes the decision onto the item at emit
 * time — the item carries its reason with it) plus, when available,
 * the current prefs for naming the specific control. No new storage,
 * no per-sender work: any card, from any emitter, explains itself.
 */

import type { NotificationItem, NotifyKind, TriText } from './types';
import type { NotificationPrefs } from './preferences';

export const KIND_LABELS: Record<NotifyKind, TriText> = {
  sos: { en: 'SOS alerts', bn: 'SOS সতর্কতা', hi: 'SOS चेतावनी' },
  chat: { en: 'Chat messages', bn: 'বার্তা', hi: 'चैट संदेश' },
  money_request: { en: 'Money requests', bn: 'অর্থ অনুরোধ', hi: 'धन अनुरोध' },
  wallet: { en: 'Wallet updates', bn: 'ওয়ালেট খবর', hi: 'वॉलेट समाचार' },
  seva_order: { en: 'Seva orders', bn: 'সেবা অর্ডার', hi: 'सेवा ऑर्डर' },
  suchana: { en: 'Suchana', bn: 'সূচনা', hi: 'सूचना' },
  org: { en: 'Organisation updates', bn: 'সংগঠনের আপডেট', hi: 'संगठन अपडेट' },
  blessing: { en: 'Blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' },
  security: { en: 'Security notices', bn: 'নিরাপত্তা বিজ্ঞপ্তি', hi: 'सुरक्षा सूचनाएँ' },
  darshan_live: { en: 'Live darshan', bn: 'লাইভ দর্শন', hi: 'लाइव दर्शन' },
  aarti_reminder: { en: 'Aarti reminders', bn: 'আরতি রিমাইন্ডার', hi: 'आरती रिमाइंडर' },
  social: { en: 'Community updates', bn: 'সম্প্রদায়ের খবর', hi: 'समुदाय समाचार' },
};

type WhyItem = Pick<
  NotificationItem,
  'kind' | 'priority' | 'decision' | 'quietHold' | 'holdUntil'
>;

/**
 * The one-line answer. Order matters — the strongest truth first:
 * an SOS explains itself by safety; a cap-held card by the cap; a
 * quiet-held card by the quiet hours; a digest card by the digest
 * setting; anything else by its category being on.
 */
export function whyLine(item: WhyItem, prefs?: NotificationPrefs): TriText {
  const label = KIND_LABELS[item.kind] ?? KIND_LABELS.suchana;
  const d = item.decision;

  if (item.priority === 'critical' || item.kind === 'sos') {
    return {
      en: 'SOS always reaches you — safety is never a setting, and no control can silence it.',
      bn: 'SOS সবসময় আপনার কাছে পৌঁছায় — নিরাপত্তা কোনো সেটিং নয়, কোনো নিয়ন্ত্রণই এটি নীরব করতে পারে না।',
      hi: 'SOS हमेशा आप तक पहुँचता है — सुरक्षा कोई सेटिंग नहीं है, और कोई नियंत्रण इसे मौन नहीं कर सकता।',
    };
  }

  if (d?.suppressed === 'cap' || d?.holdReason === 'cap') {
    return {
      en: 'This waited quietly — your daily Suchana limit for the day was reached. It was held, never dropped.',
      bn: 'এটি শান্তভাবে অপেক্ষা করেছে — সেদিনের জন্য আপনার দৈনিক সূচনা সীমা পূর্ণ হয়ে গিয়েছিল। এটি আটকে রাখা হয়েছিল, কখনো ফেলে দেওয়া হয়নি।',
      hi: 'यह चुपचाप प्रतीक्षा करता रहा — उस दिन की आपकी दैनिक सूचना सीमा पूरी हो गई थी। इसे रोका गया था, कभी हटाया नहीं गया।',
    };
  }

  if (item.quietHold || d?.holdReason === 'quiet' || d?.holdReason === 'dnd') {
    return d?.holdReason === 'dnd'
      ? {
          en: 'Held quietly by your Do Not Disturb, then delivered — nothing is ever dropped.',
          bn: 'আপনার "বিরক্ত করবেন না" সেটিংয়ে শান্তভাবে আটকে ছিল, তারপর পৌঁছেছে — কিছুই কখনো ফেলে দেওয়া হয় না।',
          hi: 'आपकी "परेशान न करें" सेटिंग से चुपचाप रुका रहा, फिर पहुँचा — कुछ भी कभी हटाया नहीं जाता।',
        }
      : {
          en: 'Held quietly by your quiet hours, then delivered — nothing is ever dropped.',
          bn: 'আপনার শান্ত সময়ে শান্তভাবে আটকে ছিল, তারপর পৌঁছেছে — কিছুই কখনো ফেলে দেওয়া হয় না।',
          hi: 'आपके शांत समय में चुपचाप रुका रहा, फिर पहुँचा — कुछ भी कभी हटाया नहीं जाता।',
        };
  }

  if (d?.digestCandidate) {
    const when =
      prefs?.suchana === 'evening'
        ? { en: 'evening', bn: 'সন্ধ্যার', hi: 'शाम की' }
        : { en: 'morning', bn: 'সকালের', hi: 'सुबह की' };
    return {
      en: `Came gently with your ${when.en} Suchana digest — ${label.en} join the digest in your Suchana controls.`,
      bn: `আপনার ${when.bn} সূচনা সারসংক্ষেপের সাথে কোমলভাবে এসেছে — সূচনা নিয়ন্ত্রণে ${label.bn} সারসংক্ষেপে যোগ হয়।`,
      hi: `आपकी ${when.hi} सूचना सारांश के साथ सौम्यता से आया — सूचना नियंत्रणों में ${label.hi} सारांश में शामिल होते हैं।`,
    };
  }

  if (d?.ping) {
    return {
      en: `Shown because ${label.en} are on in your Suchana controls. You can change this anytime.`,
      bn: `দেখানো হয়েছে কারণ আপনার সূচনা নিয়ন্ত্রণে ${label.bn} চালু আছে। যেকোনো সময় বদলাতে পারেন।`,
      hi: `दिखाया गया क्योंकि आपके सूचना नियंत्रणों में ${label.hi} चालू हैं। आप कभी भी बदल सकते हैं।`,
    };
  }

  return {
    en: `${label.en} arrive silently in this centre only — no sound, no interruption, by design.`,
    bn: `${label.bn} শুধু এই কেন্দ্রেই নীরবে আসে — কোনো শব্দ নয়, কোনো ব্যাঘাত নয়, পরিকল্পনা অনুযায়ী।`,
    hi: `${label.hi} केवल इस केंद्र में मौन रूप से आते हैं — कोई ध्वनि नहीं, कोई बाधा नहीं, योजना अनुसार।`,
  };
}
