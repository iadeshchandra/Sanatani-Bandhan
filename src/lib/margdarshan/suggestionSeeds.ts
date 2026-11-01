/**
 * lib/margdarshan/suggestionSeeds.ts — Your Voice launch seeds (J3).
 * ============================================================================
 * The blueprint's honest-seeding law (§12): an empty board looks
 * dead, so the board opens carrying the team's REAL roadmap items —
 * genuine plans, with statuses that match reality today, filed
 * openly under the team's own name. Nothing here is a promise with
 * a date; a status is a fact about where the item stands.
 *
 * Two lives for this data:
 *  1. BUNDLED FALLBACK — while the live `suggestions` collection is
 *     still empty (or unreachable), the board renders these items
 *     read-only so the wing is never a blank room on day one. No
 *     client write ever happens on a public visitor's behalf.
 *  2. TRIAGE SEEDING — the GodMode Triage Desk's "Seed the board"
 *     button writes them as real documents (fixed ids, safe to
 *     re-run) through the ordinary rules path, after which people
 *     can support them like any other voice.
 *
 * The stored document (when seeded) carries the English text as its
 * written language — board content is shown as its author wrote it
 * (blueprint §9). The trilingual text here serves the fallback.
 */

import type { Lang3 } from '../moduleGuides';
import type { Suggestion, SuggestionKind, SuggestionStatus } from './suggestions';

export interface SuggestionSeed {
  /** Fixed document id — re-running the seed never duplicates. */
  id: string;
  kind: SuggestionKind;
  /** Where the item honestly stands today. */
  status: SuggestionStatus;
  title: Lang3;
  body: Lang3;
}

export const TEAM_AUTHOR_NAME = 'Sanatani Bandhan team';

export const SUGGESTION_SEEDS: readonly SuggestionSeed[] = [
  {
    id: 'seed-satsang-discussion',
    kind: 'feature',
    status: 'planned',
    title: {
      en: 'Satsang — a calm discussion space inside Margdarshan',
      hi: 'सत्संग — मार्गदर्शन के भीतर एक शांत चर्चा-स्थान',
      bn: 'সত্সঙ্গ — মার্গদর্শনের ভিতরে একটি শান্ত আলোচনার জায়গা',
    },
    body: {
      en: 'A fourth wing of Margdarshan where devotees and temple teams can ask questions and help each other use the app. It opens only after this suggestions board shows a living community — discussion needs daily care, and we will not open a room we cannot look after.',
      hi: 'मार्गदर्शन की चौथी शाखा, जहाँ भक्त और मंदिर-टीमें प्रश्न पूछ सकें और ऐप के उपयोग में एक-दूसरे की सहायता कर सकें। यह तभी खुलेगी जब यह सुझाव-पटल एक जीवंत समुदाय दिखाए — चर्चा को रोज़ की देखभाल चाहिए, और हम ऐसा कमरा नहीं खोलेंगे जिसकी देखभाल हम न कर सकें।',
      bn: 'মার্গদর্শনের চতুর্থ শাখা, যেখানে ভক্ত ও মন্দির-দল প্রশ্ন করতে পারবে এবং অ্যাপ ব্যবহারে একে অন্যকে সাহায্য করতে পারবে। এটি খুলবে কেবল তখনই, যখন এই প্রস্তাব-পট একটি জীবন্ত সম্প্রদায় দেখাবে — আলোচনার জন্য প্রতিদিনের যত্ন দরকার, আর যে ঘরের যত্ন আমরা নিতে পারব না, তা আমরা খুলব না।',
    },
  },
  {
    id: 'seed-native-proofreading',
    kind: 'manual-gap',
    status: 'planned',
    title: {
      en: 'Native-speaker proofreading for all ten languages',
      hi: 'सभी दस भाषाओं के लिए मातृभाषी प्रूफ़-जाँच',
      bn: 'সব দশটি ভাষার জন্য মাতৃভাষী প্রুফ-পরীক্ষা',
    },
    body: {
      en: 'The manual and the app speak ten languages. Three are fully authored; seven are careful drafts, honestly labelled as drafts. Native speakers reviewing every draft language — that human pass is planned, and until it happens the draft label stays, because we will not pretend a draft is finished work.',
      hi: 'पुस्तिका और ऐप दस भाषाओं में बोलते हैं। तीन पूरी तरह लिखी गई हैं; सात सावधानी से बने मसौदे हैं, जिन्हें ईमानदारी से मसौदा कहा गया है। हर मसौदा-भाषा की मातृभाषी समीक्षा — यह मानवीय चरण नियोजित है, और जब तक वह न हो, मसौदे का लेबल रहेगा, क्योंकि हम मसौदे को पूर्ण कार्य नहीं कहेंगे।',
      bn: 'পুস্তিকা ও অ্যাপ দশটি ভাষায় কথা বলে। তিনটি সম্পূর্ণ রচিত; সাতটি যত্নে তৈরি খসড়া, সৎভাবে খসড়া বলেই চিহ্নিত। প্রতিটি খসড়া ভাষার মাতৃভাষী পর্যালোচনা — এই মানবিক ধাপটি পরিকল্পিত, আর তা না হওয়া পর্যন্ত খসড়ার লেবেল থাকবে, কারণ খসড়াকে আমরা সম্পূর্ণ কাজ বলে ভান করব না।',
    },
  },
  {
    id: 'seed-purohit-tier-parity',
    kind: 'feature',
    status: 'under-review',
    title: {
      en: 'The same trust ladder for Purohits as for Jyotishis',
      hi: 'पुरोहितों के लिए ज्योतिषियों जैसी ही विश्वास-सीढ़ी',
      bn: 'পুরোহিতদের জন্য জ্যোতিষীদের মতোই একই বিশ্বাস-সিঁড়ি',
    },
    body: {
      en: 'Jyotishi verification now climbs a clear ladder — credentials checked, endorsements counted, each step earned. Purohit profiles deserve the same ladder, rung for rung, so a family choosing a purohit sees the same honest signs of trust. We are reviewing how the rungs map to purohit work.',
      hi: 'ज्योतिषी सत्यापन अब एक स्पष्ट सीढ़ी चढ़ता है — प्रमाणपत्र जाँचे जाते हैं, अनुशंसाएँ गिनी जाती हैं, हर पायदान कमाया जाता है। पुरोहित परिचयों को भी वही सीढ़ी मिलनी चाहिए, पायदान-दर-पायदान, ताकि पुरोहित चुनने वाले परिवार को विश्वास के वही ईमानदार संकेत दिखें। हम समीक्षा कर रहे हैं कि पायदान पुरोहित-कार्य पर कैसे बैठते हैं।',
      bn: 'জ্যোতিষী যাচাই এখন একটি স্পষ্ট সিঁড়ি বেয়ে ওঠে — যোগ্যতা পরীক্ষা হয়, সুপারিশ গোনা হয়, প্রতিটি ধাপ অর্জিত। পুরোহিত পরিচিতিগুলোরও সেই একই সিঁড়ি পাওয়া উচিত, ধাপে ধাপে, যাতে পুরোহিত বেছে নেওয়া পরিবার বিশ্বাসের একই সৎ চিহ্ন দেখতে পায়। ধাপগুলো পুরোহিতের কাজের সঙ্গে কীভাবে মেলে, তা আমরা পর্যালোচনা করছি।',
    },
  },
  {
    id: 'seed-temple-stories',
    kind: 'feature',
    status: 'received',
    title: {
      en: 'Real temple stories on the home page',
      hi: 'मुखपृष्ठ पर असली मंदिरों की कहानियाँ',
      bn: 'প্রথম পৃষ্ঠায় আসল মন্দিরের গল্প',
    },
    body: {
      en: 'The home page once carried invented praise — we removed it, because devotion deserves truth. This space waits for real temples and trusts using Sanatani Bandhan to share, in their own words, what changed for them. When the first true stories arrive, they will stand here with the temple\u2019s name on them.',
      hi: 'मुखपृष्ठ पर कभी गढ़ी हुई प्रशंसा थी — हमने उसे हटा दिया, क्योंकि भक्ति सत्य की हक़दार है। यह स्थान उन असली मंदिरों और ट्रस्टों की प्रतीक्षा करता है जो Sanatani Bandhan का उपयोग करके अपने शब्दों में बताएँ कि उनके लिए क्या बदला। जब पहली सच्ची कहानियाँ आएँगी, वे मंदिर के नाम के साथ यहाँ खड़ी होंगी।',
      bn: 'প্রথম পৃষ্ঠায় একসময় বানানো প্রশংসা ছিল — আমরা তা সরিয়ে দিয়েছি, কারণ ভক্তি সত্যের যোগ্য। এই জায়গা অপেক্ষা করছে আসল মন্দির ও ট্রাস্টদের জন্য, যারা Sanatani Bandhan ব্যবহার করে নিজেদের ভাষায় বলবে তাদের জন্য কী বদলেছে। প্রথম সত্যি গল্পগুলি এলে, সেগুলি মন্দিরের নামসহ এখানে দাঁড়াবে।',
    },
  },
  {
    id: 'seed-manual-more-languages',
    kind: 'manual-gap',
    status: 'received',
    title: {
      en: 'The full manual in every language, not just three',
      hi: 'पूरी पुस्तिका हर भाषा में, केवल तीन में नहीं',
      bn: 'সম্পূর্ণ পুস্তিকা প্রতিটি ভাষায়, শুধু তিনটিতে নয়',
    },
    body: {
      en: 'Today the whole manual — every desk page — is written in English, Hindi and Bengali; the other seven languages show English with an honest note while their translations are prepared. We have received this wish, and it stands in the open queue: each language\u2019s full manual, written properly rather than filled in quickly.',
      hi: 'आज पूरी पुस्तिका — हर कार्यस्थान-पृष्ठ — अंग्रेज़ी, हिंदी और बांग्ला में लिखी है; बाकी सात भाषाएँ एक ईमानदार टिप्पणी के साथ अंग्रेज़ी दिखाती हैं, जबकि उनके अनुवाद तैयार हो रहे हैं। यह इच्छा हमें मिली है और खुले क्रम में खड़ी है: हर भाषा की पूरी पुस्तिका, जल्दबाज़ी में भरी नहीं, ठीक से लिखी हुई।',
      bn: 'আজ সম্পূর্ণ পুস্তিকা — প্রতিটি কার্যস্থল-পৃষ্ঠা — ইংরেজি, হিন্দি ও বাংলায় লেখা; বাকি সাতটি ভাষা একটি সৎ টীকাসহ ইংরেজি দেখায়, যখন তাদের অনুবাদ তৈরি হচ্ছে। এই ইচ্ছাটি আমরা পেয়েছি এবং তা উন্মুক্ত সারিতে দাঁড়িয়ে আছে: প্রতিটি ভাষার সম্পূর্ণ পুস্তিকা, তাড়াহুড়ো করে ভরাট নয়, যথাযথভাবে লেখা।',
    },
  },
];

/** Fallback display items (read-only) for an empty/unreachable board. */
export function seedDisplayItems(lang: string): Suggestion[] {
  const l = lang === 'hi' || lang === 'bn' ? lang : 'en';
  const base = Date.UTC(2026, 10, 1, 6, 0, 0);
  return SUGGESTION_SEEDS.map((seed, i) => ({
    id: seed.id,
    authorId: 'team-roadmap',
    authorName: TEAM_AUTHOR_NAME,
    kind: seed.kind,
    deskId: null,
    title: seed.title[l],
    body: seed.body[l],
    language: l,
    status: seed.status,
    statusHistory: [{ status: seed.status, at: base - i * 3600000, byRole: 'team' }],
    officialReplies: [],
    supporterCount: 0,
    hidden: false,
    createdAtMs: base - i * 3600000,
    updatedAtMs: base - i * 3600000,
    shippedVersion: null,
    duplicateOf: null,
  }));
}
