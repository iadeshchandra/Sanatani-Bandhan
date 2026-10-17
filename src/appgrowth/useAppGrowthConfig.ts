/**
 * useAppGrowthConfig — shared config + landing-content hook for the App Growth program.
 * ==================================================================================
 * Read by BOTH the public landing page (owned by the Landing builder,
 * `GetAppPage` at `/get-app`) and the GodMode admin panel (Phase 4).
 *
 * Firestore shapes (documented contract for both builders):
 *
 *   appGrowth/config (doc)
 *   {
 *     playStoreUrl:  string   // Google Play listing URL ('' = not set)
 *     playStoreLive: boolean  // "Go live" toggle — when false, Android users see the PWA path
 *     iosMode:       'pwa' | 'appstore'   // UI keeps 'pwa' locked; field exists for a future listing
 *     appStoreUrl:   string   // future App Store URL ('' until a listing exists)
 *     content:       AppGrowthContent      // landing copy OVERRIDE; landing falls back to
 *                                          // DEFAULT_CONTENT below when a field is missing
 *     updatedAt, updatedBy
 *   }
 *
 *   appGrowthCampaigns/{id} (collection)
 *   { label: string, templeName: string, createdAt, createdBy }
 *
 *   appGrowthScans / appGrowthInstalls / appGrowthWaitlist (collections)
 *   written client-side with strict server-side validation (see firestore.rules).
 *
 * Fail-open: if Firestore is unreachable or the doc is missing, the hook returns
 * DEFAULT_CONFIG / DEFAULT_CONTENT so the landing page never breaks.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  doc, getDoc, setDoc, serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OWNER_UID } from '../lib/firestoreAdmin';

export interface Tri {
  en: string;
  bn: string;
  hi: string;
}

export const tri = (en: string, bn = '', hi = ''): Tri => ({ en, bn, hi });

export interface WhyCard {
  title: Tri;
  body: Tri;
}

export interface AppGrowthContent {
  hero: { headline: Tri; subline: Tri };
  whyCards: WhyCard[]; // exactly 4
  utilities: { title: Tri; items: Tri[] };
  howItWorks: { title: Tri; steps: Tri[] };
  benefits: { title: Tri; tabs: { role: Tri; points: Tri[] }[] };
  faq: { title: Tri; items: { q: Tri; a: Tri }[] };
  testimonial: { quote: Tri; name: Tri; role: Tri };
}

export const DEFAULT_CONTENT: AppGrowthContent = {
  hero: {
    headline: tri(
      'Carry your sacred space in your pocket',
      'আপনার পবিত্র স্থান এখন আপনার পকেটে',
      'आपका पवित्र स्थान अब आपकी जेब में',
    ),
    subline: tri(
      'Sanatani Bandhan on your phone — panchang, seva bookings, treasury transparency and your community, wherever you are.',
      'আপনার ফোনে সনাতনী বন্ধন — পঞ্জিকা, সেবা বুকিং, কোষাগারের স্বচ্ছতা ও আপনার সম্প্রদায়, যেখানেই থাকুন।',
      'आपके फ़ोन पर सनातनी बंधन — पंचांग, सेवा बुकिंग, कोष की पारदर्शिता और आपका समुदाय, आप जहाँ भी हों।',
    ),
  },
  whyCards: [
    { title: tri('Ajker Suchana', 'আজকের সূচনা', 'आज की सूचना'), body: tri('Morning digest — tithi, festivals and what matters today.', 'সকালের সংক্ষিপ্তসার — তিথি, উৎসব ও আজকের গুরুত্বপূর্ণ বিষয়।', 'सुबह का सारांश — तिथि, त्योहार और आज की महत्वपूर्ण बातें।') },
    { title: tri('Seva from anywhere', 'যেকোনো জায়গা থেকে সেবা', 'कहीं से भी सेवा'), body: tri('Book pujas, donate and track every rupee to the treasury.', 'পূজা বুক করুন, দান করুন এবং প্রতিটি টাকার হিসাব দেখুন।', 'पूजा बुक करें, दान करें और प्रत्येक रुपये का हिसाब देखें।') },
    { title: tri('Works offline', 'অফলাইনে চলে', 'ऑफ़लाइन चलता है'), body: tri('Zero-internet protocol — your data stays on your device until you connect.', 'শূন্য-ইন্টারনেট প্রোটোকল — সংযোগ না হওয়া পর্যন্ত আপনার তথ্য ডিভাইসেই থাকে।', 'शून्य-इंटरनेट प्रोटोकॉल — जुड़ने तक आपका डेटा आपके डिवाइस पर ही रहता है।') },
    { title: tri('Your community', 'আপনার সম্প্রদায়', 'आपका समुदाय'), body: tri('Sangam circles, events and your universal Sanatani ID.', 'সঙ্গম সার্কেল, অনুষ্ঠান ও আপনার সর্বজনীন সনাতনী আইডি।', 'संगम सर्कल, कार्यक्रम और आपकी सार्वभौमिक सनातनी आईडी।') },
  ],
  utilities: {
    title: tri('Everyday utilities', 'প্রতিদিনের সুবিধা', 'रोज़मर्रा की सुविधाएँ'),
    items: [
      tri('Panjika & muhurat', 'পঞ্জিকা ও মুহূর্ত', 'पंचांग व मुहूर्त'),
      tri('Donation receipts (80G)', 'দানের রসিদ (80G)', 'दान रसीद (80G)'),
      tri('Festival reminders', 'উৎসবের স্মরণিকা', 'त्योहार अनुस्मारक'),
      tri('Family samskara tracker', 'পারিবারিক সংস্কার ট্র্যাকার', 'पारिवारिक संस्कार ट्रैकर'),
    ],
  },
  howItWorks: {
    title: tri('Get the app in 30 seconds', '৩০ সেকেন্ডে অ্যাপ পান', '३० सेकंड में ऐप पाएं'),
    steps: [
      tri('Scan the QR or open the link', 'QR স্ক্যান করুন বা লিঙ্ক খুলুন', 'QR स्कैन करें या लिंक खोलें'),
      tri('Install from Play Store or add to home screen', 'প্লে স্টোর থেকে ইনস্টল করুন বা হোম স্ক্রিনে যোগ করুন', 'प्ले स्टोर से इंस्टॉल करें या होम स्क्रीन में जोड़ें'),
      tri('Sign in and receive your Sanatani ID', 'সাইন ইন করুন ও আপনার সনাতনী আইডি পান', 'साइन इन करें और अपनी सनातनी आईडी पाएं'),
    ],
  },
  benefits: {
    title: tri('Made for your role', 'আপনার ভূমিকার জন্য', 'आपकी भूमिका के लिए'),
    tabs: [
      { role: tri('Devotee', 'ভক্ত', 'भक्त'), points: [tri('Darshan timings & live updates', 'দর্শনের সময় ও লাইভ আপডেট', 'दर्शन समय व लाइव अपडेट')] },
      { role: tri('Trustee', 'ট্রাস্টি', 'ट्रस्टी'), points: [tri('Treasury & audit trail in your pocket', 'পকেটে কোষাগার ও অডিট ট্রেইল', 'जेब में कोष व ऑडिट ट्रेल')] },
      { role: tri('Purohit', 'পুরোহিত', 'पुरोहित'), points: [tri('Bookings & dakshina, managed simply', 'সহজে বুকিং ও দক্ষিণা ব্যবস্থাপনা', 'आसान बुकिंग व दक्षिणा प्रबंधन')] },
    ],
  },
  faq: {
    title: tri('Questions, answered', 'প্রশ্ন ও উত্তর', 'प्रश्न व उत्तर'),
    items: [
      { q: tri('Is it free?', 'এটা কি বিনামূল্যে?', 'क्या यह मुफ़्त है?'), a: tri('Yes — the app is free for devotees, forever.', 'হ্যাঁ — ভক্তদের জন্য অ্যাপ চিরকাল বিনামূল্যে।', 'हाँ — भक्तों के लिए ऐप हमेशा मुफ़्त है।') },
      { q: tri('Do I need internet?', 'ইন্টারনেট দরকার?', 'क्या इंटरनेट चाहिए?'), a: tri('Core features work offline and sync when you reconnect.', 'মূল সুবিধাগুলো অফলাইনে চলে, সংযোগ পেলে সিঙ্ক হয়।', 'मुख्य सुविधाएँ ऑफ़लाइन चलती हैं, जुड़ने पर सिंक होती हैं।') },
    ],
  },
  testimonial: {
    quote: tri('Our devotees book sevas from their villages now. The treasury is transparent to every trustee.', 'আমাদের ভক্তরা এখন গ্রাম থেকে সেবা বুক করে। কোষাগার প্রতিটি ট্রাস্টির কাছে স্বচ্ছ।', 'हमारे भक्त अब गाँव से सेवा बुक करते हैं। कोष प्रत्येक ट्रस्टी के लिए पारदर्शी है।'),
    name: tri('A temple trustee', 'একজন মন্দির ট্রাস্টি', 'एक मंदिर ट्रस्टी'),
    role: tri('Pilot institution', 'পাইলট প্রতিষ্ঠান', 'पायलट संस्थान'),
  },
};

export type IosMode = 'pwa' | 'appstore';

export interface AppGrowthConfig {
  playStoreUrl: string;
  playStoreLive: boolean;
  iosMode: IosMode;
  appStoreUrl: string;
  content: AppGrowthContent;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_CONFIG: AppGrowthConfig = {
  playStoreUrl: '',
  playStoreLive: false,
  iosMode: 'pwa',
  appStoreUrl: '',
  content: DEFAULT_CONTENT,
};

const CONFIG_PATH = 'appGrowth/config';

/** Deep-merge the stored content override over DEFAULT_CONTENT (never throws). */
function mergeContent(stored: unknown): AppGrowthContent {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as AppGrowthContent;
  if (!stored || typeof stored !== 'object') return base;
  const s = stored as Partial<AppGrowthContent>;
  try {
    if (s.hero) base.hero = { ...base.hero, ...s.hero };
    if (Array.isArray(s.whyCards) && s.whyCards.length === 4) base.whyCards = s.whyCards as WhyCard[];
    if (s.utilities) base.utilities = { ...base.utilities, ...s.utilities };
    if (s.howItWorks) base.howItWorks = { ...base.howItWorks, ...s.howItWorks };
    if (s.benefits) base.benefits = { ...base.benefits, ...s.benefits };
    if (s.faq) base.faq = { ...base.faq, ...s.faq };
    if (s.testimonial) base.testimonial = { ...base.testimonial, ...s.testimonial };
  } catch {
    /* fail-open: keep defaults */
  }
  return base;
}

function sanitize(raw: DocumentData | undefined): AppGrowthConfig {
  if (!raw) return { ...DEFAULT_CONFIG, content: mergeContent(undefined) };
  return {
    playStoreUrl: typeof raw.playStoreUrl === 'string' ? raw.playStoreUrl : '',
    playStoreLive: raw.playStoreLive === true,
    iosMode: raw.iosMode === 'appstore' ? 'appstore' : 'pwa',
    appStoreUrl: typeof raw.appStoreUrl === 'string' ? raw.appStoreUrl : '',
    content: mergeContent(raw.content),
    updatedAt: raw.updatedAt,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : undefined,
  };
}

/* ---- module-level cache (60s TTL) so landing + admin share one read ---- */
let cache: { config: AppGrowthConfig; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchConfig(): Promise<AppGrowthConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.config;
  try {
    const snap = await getDoc(doc(db, CONFIG_PATH));
    const cfg = sanitize(snap.exists() ? snap.data() : undefined);
    cache = { config: cfg, at: now };
    return cfg;
  } catch {
    return { ...DEFAULT_CONFIG, content: mergeContent(undefined) }; // fail-open
  }
}

/** True when the signed-in user is the platform owner (client-side defense in depth; rules enforce). */
export function isOwnerClient(): boolean {
  return !!auth.currentUser && auth.currentUser.uid === OWNER_UID;
}

export interface UseAppGrowthConfigResult {
  config: AppGrowthConfig;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Owner-only. Throws when the signed-in user is not the owner. Writes merge. */
  save: (patch: Partial<Omit<AppGrowthConfig, 'content'>> & { content?: AppGrowthContent }) => Promise<void>;
}

/** Shared hook: landing page and admin panel both read through this. */
export function useAppGrowthConfig(): UseAppGrowthConfigResult {
  const [config, setConfig] = useState<AppGrowthConfig>({ ...DEFAULT_CONFIG, content: mergeContent(undefined) });
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    cache = null;
    const cfg = await fetchConfig();
    if (mounted.current) {
      setConfig(cfg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchConfig().then((cfg) => {
      if (mounted.current) {
        setConfig(cfg);
        setLoading(false);
      }
    });
    return () => { mounted.current = false; };
  }, []);

  const save = useCallback(async (patch: Partial<Omit<AppGrowthConfig, 'content'>> & { content?: AppGrowthContent }) => {
    if (!isOwnerClient()) throw new Error('Only the platform owner can save App Growth settings.');
    const payload: DocumentData = {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? 'unknown',
    };
    await setDoc(doc(db, CONFIG_PATH), payload, { merge: true });
    cache = null;
    const cfg = await fetchConfig();
    if (mounted.current) setConfig(cfg);
  }, []);

  return { config, loading, refresh, save };
}

/**
 * Absolute URL the QR codes point at. Campaign attribution rides on `?c=`.
 * NOTE: this is the public landing route OWNED BY THE LANDING BUILDER
 * (`GetAppPage` at `/get-app`). The QR studio only builds links to it.
 */
export function appGrowthLink(campaignId?: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/get-app`;
  return campaignId ? `${base}?c=${encodeURIComponent(campaignId)}` : base;
}

/** Platform bucket used by the scans/installs/waitlist event collections. */
export type GrowthPlatform = 'android' | 'ios' | 'desktop' | 'unknown';
export const GROWTH_PLATFORMS: GrowthPlatform[] = ['android', 'ios', 'desktop', 'unknown'];
