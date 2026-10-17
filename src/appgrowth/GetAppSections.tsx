/**
 * GetAppSections — below-fold sections of the /get-app landing page.
 * ==================================================================
 * Loaded via React.lazy so the first paint (hero + primary CTA) lands
 * in under 2s on low-end phones. Everything here is presentational and
 * trilingual via the local <Tr> primitive.
 *
 * NOTE for the Admin builder's content editor: the trust counts below
 * are HARDCODED placeholders. Wire them to live values when the
 * content-editing surface exists (TODO: appgrowth live stats).
 */
import React, { useState } from 'react';
import {
  Flame,
  Landmark,
  Sun,
  HeartHandshake,
  Receipt,
  CalendarCheck,
  ArrowLeftRight,
  Siren,
  Store,
  QrCode,
  Download,
  Sparkles,
  ShieldCheck,
  Lock,
  BadgeCheck,
  Users,
  Star,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';
import { Tr } from './tr';
import { PrivacyPolicy } from '../components/public/PrivacyPolicy';
import { TermsOfService } from '../components/public/TermsOfService';
import { WHATSAPP_URL, hasWhatsApp } from '../config/contact';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const SectionShell: React.FC<{
  id: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ id, eyebrow, title, dark, children }) => (
  <section
    id={id}
    className={`scroll-mt-20 px-5 py-14 sm:py-20 ${dark ? 'bg-[#2b1408] text-orange-50' : 'bg-[#FFF8F0] text-stone-900'}`}
  >
    <div className="mx-auto max-w-5xl">
      <p
        className={`mb-2 text-center text-[11px] font-extrabold uppercase tracking-[0.22em] ${
          dark ? 'text-amber-300' : 'text-orange-600'
        }`}
      >
        {eyebrow}
      </p>
      <h2 className="mx-auto mb-10 max-w-2xl text-center text-2xl font-black leading-tight sm:text-4xl">
        {title}
      </h2>
      {children}
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* 3. Why Sanatani Bandhan — 4 visual cards, scannable in 10s          */
/* ------------------------------------------------------------------ */

const WHY_CARDS = [
  {
    icon: Flame,
    en: 'One identity for every temple',
    bn: 'প্রতিটি মন্দিরের জন্য একটি পরিচয়',
    hi: 'हर मंदिर के लिए एक पहचान',
    enBody: 'Your Sanatani ID connects you to temples, purohits and community — one login, everywhere you belong.',
    bnBody: 'আপনার সনাতনী আইডি আপনাকে মন্দির, পুরোহিত ও সম্প্রদায়ের সাথে যুক্ত করে — একটাই লগইন, যেখানেই আপনি।',
    hiBody: 'आपकी सनातनी ID आपको मंदिरों, पुरोहितों और समुदाय से जोड़ती है — एक ही लॉगिन, जहाँ भी आप हैं।',
  },
  {
    icon: Landmark,
    en: 'Your temples, connected',
    bn: 'আপনার মন্দির, এখন সংযুক্ত',
    hi: 'आपके मंदिर, अब जुड़े हुए',
    enBody: "Follow your mandir's festivals, announcements and sevas — never miss a puja again.",
    bnBody: 'আপনার মন্দিরের উৎসব, ঘোষণা ও সেবার খবর পান — আর কোনো পূজা মিস নয়।',
    hiBody: 'अपने मंदिर के उत्सवों, घोषणाओं और सेवाओं की खबर पाएँ — अब कोई पूजा छूटेगी नहीं।',
  },
  {
    icon: Sun,
    en: 'Daily spiritual life, guided',
    bn: 'প্রতিদিনের আধ্যাত্মিক জীবন, সযত্নে',
    hi: 'रोज़ का आध्यात्मिक जीवन, सँवरकर',
    enBody: 'Panjika, ekadashi reminders, vratas and shubh muhurat — your dharma, gently guided each morning.',
    bnBody: 'পঞ্জিকা, একাদশীর স্মরণ, ব্রত ও শুভ মুহূর্ত — প্রতিটি সকালে আপনার ধর্ম, সযত্নে পরিচালিত।',
    hiBody: 'पंचांग, एकादशी स्मरण, व्रत और शुभ मुहूर्त — हर सुबह आपका धर्म, सँवरकर मार्गदर्शित।',
  },
  {
    icon: HeartHandshake,
    en: 'Community & safety',
    bn: 'সম্প্রদায় ও নিরাপত্তা',
    hi: 'समुदाय और सुरक्षा',
    enBody: 'Connect with fellow devotees — and reach family in emergencies with three-tap SOS.',
    bnBody: 'সহভক্তদের সাথে যুক্ত হোন — আর জরুরি মুহূর্তে তিন ট্যাপে পরিবারকে জানান।',
    hiBody: 'सहभक्तों से जुड़ें — और आपातकाल में तीन टैप से परिवार को सूचित करें।',
  },
];

export const WhySection: React.FC = () => (
  <SectionShell
    id="why"
    eyebrow={<Tr en="Why Sanatani Bandhan" bn="কেন সনাতনী বন্ধন" hi="क्यों सनातनी बंधन" />}
    title={<Tr en="Made for the way you already live your dharma" bn="আপনার ধর্মজীবনের জন্যই তৈরি" hi="आपके धर्मजीवन के लिए ही बना है" />}
  >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {WHY_CARDS.map((card) => (
        <div
          key={card.en}
          className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
        >
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/25">
            <card.icon className="h-6 w-6" />
          </span>
          <h3 className="mb-2 text-base font-extrabold leading-snug">
            <Tr en={card.en} bn={card.bn} hi={card.hi} />
          </h3>
          <p className="text-sm leading-relaxed text-stone-600">
            <Tr en={card.enBody} bn={card.bnBody} hi={card.hiBody} gloss={false} />
          </p>
        </div>
      ))}
    </div>
  </SectionShell>
);

/* ------------------------------------------------------------------ */
/* 4. Utilities showcase — horizontal scroll rail                       */
/* ------------------------------------------------------------------ */

const UTILITIES = [
  {
    icon: Receipt,
    en: '80G receipts in one tap',
    bn: 'এক ট্যাপে ৮০জি রসিদ',
    hi: 'एक टैप में 80G रसीद',
    enBody: 'Donations with instant, letterhead tax receipts.',
    bnBody: 'সাথে সাথে লেটারহেড ট্যাক্স রসিদসহ দান।',
    hiBody: 'तुरंत लेटरहेड टैक्स रसीद के साथ दान।',
  },
  {
    icon: CalendarCheck,
    en: 'Festival war-room',
    bn: 'উৎসব ওয়ার-রুম',
    hi: 'उत्सव वॉर-रूम',
    enBody: 'RSVP to utsavs, get checklists and prasad timings.',
    bnBody: 'উৎসবে আরএসভিপি করুন, চেকলিস্ট ও প্রসাদের সময় পান।',
    hiBody: 'उत्सवों में RSVP करें, चेकलिस्ट और प्रसाद का समय पाएँ।',
  },
  {
    icon: ArrowLeftRight,
    en: 'Money, without awkwardness',
    bn: 'বিব্রত ছাড়াই টাকার হিসাব',
    hi: 'बिना झिझक पैसों का हिसाब',
    enBody: 'Request and settle with family — graceful, never awkward.',
    bnBody: 'পরিবারের সাথে চাওয়া-দেওয়া — সৌজন্যে, কখনো বিব্রত নয়।',
    hiBody: 'परिवार के साथ माँगना-चुकाना — शालीनता से, कभी झिझक नहीं।',
  },
  {
    icon: Siren,
    en: 'SOS protection',
    bn: 'এসওএস সুরক্ষা',
    hi: 'SOS सुरक्षा',
    enBody: 'Three-tap emergency alert to family and your temple.',
    bnBody: 'তিন ট্যাপে পরিবার ও মন্দিরে জরুরি সতর্কতা।',
    hiBody: 'तीन टैप में परिवार और मंदिर को आपातकालीन चेतावनी।',
  },
  {
    icon: Store,
    en: 'Seva marketplace',
    bn: 'সেবা মার্কেটপ্লেস',
    hi: 'सेवा मार्केटप्लेस',
    enBody: 'Book verified purohits and jyotishis with honest pricing.',
    bnBody: 'সৎ মূল্যে যাচাইকৃত পুরোহিত ও জ্যোতিষী বুক করুন।',
    hiBody: 'ईमानदार मूल्य पर सत्यापित पुरोहित और ज्योतिषी बुक करें।',
  },
];

export const UtilitiesSection: React.FC = () => (
  <SectionShell
    id="utilities"
    eyebrow={<Tr en="Inside the app" bn="অ্যাপের ভেতরে" hi="ऐप के अंदर" />}
    title={<Tr en="Small utilities, daily blessings" bn="ছোট সুবিধা, প্রতিদিনের আশীর্বাদ" hi="छोटी सुविधाएँ, रोज़ का आशीर्वाद" />}
  >
    <div className="ag-no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
      {UTILITIES.map((u) => (
        <div
          key={u.en}
          className="w-[240px] shrink-0 snap-start rounded-3xl bg-[#2b1408] p-6 text-orange-50 shadow-lg sm:w-[260px]"
        >
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <u.icon className="h-5 w-5" />
          </span>
          <h3 className="mb-2 text-[15px] font-extrabold leading-snug">
            <Tr en={u.en} bn={u.bn} hi={u.hi} />
          </h3>
          <p className="text-sm leading-relaxed text-orange-100/80">
            <Tr en={u.enBody} bn={u.bnBody} hi={u.hiBody} gloss={false} />
          </p>
        </div>
      ))}
    </div>
    <p className="mt-4 text-center text-xs font-medium text-stone-500">
      <Tr en="Swipe to explore →" bn="দেখতে সোয়াইপ করুন →" hi="देखने के लिए स्वाइप करें →" gloss={false} />
    </p>
  </SectionShell>
);

/* ------------------------------------------------------------------ */
/* 5. How it works — 3 steps                                           */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: QrCode,
    en: 'Scan the QR',
    bn: 'কিউআর স্ক্যান করুন',
    hi: 'QR स्कैन करें',
    enBody: "From your temple's poster, card or a friend's phone.",
    bnBody: 'আপনার মন্দিরের পোস্টার, কার্ড বা বন্ধুর ফোন থেকে।',
    hiBody: 'अपने मंदिर के पोस्टर, कार्ड या मित्र के फ़ोन से।',
  },
  {
    icon: Download,
    en: 'Install in seconds',
    bn: 'সেকেন্ডে ইনস্টল করুন',
    hi: 'सेकंडों में इंस्टॉल करें',
    enBody: 'From the Play Store — or straight to your Home Screen on iPhone.',
    bnBody: 'প্লে স্টোর থেকে — বা আইফোনে সরাসরি হোম স্ক্রিনে।',
    hiBody: 'प्ले स्टोर से — या iPhone पर सीधे होम स्क्रीन पर।',
  },
  {
    icon: Sparkles,
    en: 'Begin your journey 🙏',
    bn: 'আপনার যাত্রা শুরু করুন 🙏',
    hi: 'अपनी यात्रा शुरू करें 🙏',
    enBody: 'One Sanatani ID — temples, festivals and community await.',
    bnBody: 'একটাই সনাতনী আইডি — মন্দির, উৎসব ও সম্প্রদায় অপেক্ষা করছে।',
    hiBody: 'एक ही सनातनी ID — मंदिर, उत्सव और समुदाय प्रतीक्षा कर रहे हैं।',
  },
];

export const HowItWorksSection: React.FC = () => (
  <SectionShell
    id="how"
    dark
    eyebrow={<Tr en="How it works" bn="কীভাবে কাজ করে" hi="यह कैसे काम करता है" />}
    title={<Tr en="Three steps to your digital dharma" bn="ডিজিটাল ধর্মের তিনটি ধাপ" hi="डिजिटल धर्म के तीन चरण" />}
  >
    <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.en} className="relative text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/40 bg-amber-400/10 text-amber-300">
            <step.icon className="h-7 w-7" />
          </span>
          <span className="absolute left-1/2 top-0 -translate-x-[52px] -translate-y-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-stone-900">
            {i + 1}
          </span>
          <h3 className="mb-1.5 text-base font-extrabold">
            <Tr en={step.en} bn={step.bn} hi={step.hi} />
          </h3>
          <p className="mx-auto max-w-[240px] text-sm text-orange-100/75">
            <Tr en={step.enBody} bn={step.bnBody} hi={step.hiBody} gloss={false} />
          </p>
        </li>
      ))}
    </ol>
  </SectionShell>
);

/* ------------------------------------------------------------------ */
/* 6. Trust signals                                                    */
/* ------------------------------------------------------------------ */

// TODO(appgrowth): these counts are hardcoded placeholders. The Admin
// builder's content editor should wire them to live values (e.g. from a
// public stats doc) — do NOT ship real claims without owner-verified data.
const TRUST_COUNTS = [
  { value: '500+', en: 'Temples connected', bn: 'সংযুক্ত মন্দির', hi: 'जुड़े मंदिर' },
  { value: '50,000+', en: 'Devotees', bn: 'ভক্ত', hi: 'भक्त' },
  { value: '3', en: 'Languages', bn: 'ভাষা', hi: 'भाषाएँ' },
];

const TRUST_BADGES = [
  {
    icon: BadgeCheck,
    en: 'Verified temples',
    bn: 'যাচাইকৃত মন্দির',
    hi: 'सत्यापित मंदिर',
  },
  {
    icon: Lock,
    en: 'Your data stays yours',
    bn: 'আপনার তথ্য আপনারই থাকে',
    hi: 'आपका डेटा आपका ही रहता है',
  },
  {
    icon: ShieldCheck,
    en: '80G compliant receipts',
    bn: '৮০জি অনুমোদিত রসিদ',
    hi: '80G अनुरूप रसीद',
  },
];

export const TrustSection: React.FC = () => (
  <SectionShell
    id="trust"
    eyebrow={<Tr en="Trusted & growing" bn="বিশ্বস্ত ও বর্ধনশীল" hi="विश्वसनीय और बढ़ता हुआ" />}
    title={<Tr en="A growing family of faith" bn="বিশ্বাসের বর্ধনশীল পরিবার" hi="आस्था का बढ़ता परिवार" />}
  >
    <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-6">
      {TRUST_COUNTS.map((c) => (
        <div
          key={c.en}
          className="rounded-3xl border border-orange-100 bg-white px-2 py-6 text-center shadow-sm"
        >
          <p className="text-2xl font-black text-orange-600 sm:text-4xl">{c.value}</p>
          <p className="mt-1 text-xs font-bold text-stone-600 sm:text-sm">
            <Tr en={c.en} bn={c.bn} hi={c.hi} />
          </p>
        </div>
      ))}
    </div>

    <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {TRUST_BADGES.map((b) => (
        <span
          key={b.en}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-800 sm:text-sm"
        >
          <b.icon className="h-4 w-4 shrink-0" />
          <Tr en={b.en} bn={b.bn} hi={b.hi} />
        </span>
      ))}
    </div>

    {/* Testimonial slot — intentionally empty. Per standing content rule,
        real temple names/quotes replace this only when the owner provides
        them. Never invent testimonials. */}
    <div className="mx-auto max-w-2xl rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/50 p-8 text-center">
      <MessageCircle className="mx-auto mb-3 h-8 w-8 text-orange-300" />
      <p className="text-sm font-bold text-stone-600 sm:text-base">
        <Tr
          en="Stories from our temples — coming soon."
          bn="আমাদের মন্দিরগুলোর গল্প — শীঘ্রই আসছে।"
          hi="हमारे मंदिरों की कहानियाँ — जल्द आ रही हैं।"
        />
      </p>
      <p className="mt-1 text-xs text-stone-500">
        <Tr
          en="Real voices, real temples. Never invented."
          bn="আসল কণ্ঠ, আসল মন্দির। কখনো বানানো নয়।"
          hi="असली आवाज़ें, असली मंदिर। कभी गढ़ी हुई नहीं।"
          gloss={false}
        />
      </p>
    </div>
  </SectionShell>
);

/* ------------------------------------------------------------------ */
/* 7. Benefits by role — tabs                                          */
/* ------------------------------------------------------------------ */

type RoleTab = 'devotee' | 'temple' | 'pro';

const ROLE_CONTENT: Record<
  RoleTab,
  {
    icon: React.ComponentType<{ className?: string }>;
    en: string;
    bn: string;
    hi: string;
    bullets: { en: string; bn: string; hi: string }[];
  }
> = {
  devotee: {
    icon: Users,
    en: 'For devotees',
    bn: 'ভক্তদের জন্য',
    hi: 'भक्तों के लिए',
    bullets: [
      { en: 'Daily panjika & festival reminders', bn: 'প্রতিদিনের পঞ্জিকা ও উৎসবের স্মরণ', hi: 'रोज़ पंचांग और उत्सव स्मरण' },
      { en: '80G donation receipts in one tap', bn: 'এক ট্যাপে ৮০জি দানের রসিদ', hi: 'एक टैप में 80G दान रसीद' },
      { en: 'Your Sanatani ID, everywhere', bn: 'আপনার সনাতনী আইডি, সর্বত্র', hi: 'आपकी सनातनी ID, हर जगह' },
      { en: 'Community & SOS safety', bn: 'সম্প্রদায় ও এসওএস নিরাপত্তা', hi: 'समुदाय और SOS सुरक्षा' },
    ],
  },
  temple: {
    icon: Landmark,
    en: 'For temples',
    bn: 'মন্দিরের জন্য',
    hi: 'मंदिरों के लिए',
    bullets: [
      { en: 'Devotee directory & treasury', bn: 'ভক্ত তালিকা ও কোষাগার', hi: 'भक्त सूची और कोषागार' },
      { en: 'Festival war-room & RSVPs', bn: 'উৎসব ওয়ার-রুম ও আরএসভিপি', hi: 'उत्सव वॉर-रूम और RSVP' },
      { en: 'Announcements in seconds', bn: 'সেকেন্ডে ঘোষণা', hi: 'सेकंडों में घोषणाएँ' },
      { en: 'Transparent audit trail', bn: 'স্বচ্ছ অডিট ট্রেইল', hi: 'पारदर्शी ऑडिट ट्रेल' },
    ],
  },
  pro: {
    icon: Star,
    en: 'For purohits & jyotishis',
    bn: 'পুরোহিত ও জ্যোতিষীদের জন্য',
    hi: 'पुरोहितों और ज्योतिषियों के लिए',
    bullets: [
      { en: 'Verified profile & bookings', bn: 'যাচাইকৃত প্রোফাইল ও বুকিং', hi: 'सत्यापित प्रोफ़ाइल और बुकिंग' },
      { en: 'Dakshina tracking', bn: 'দক্ষিণার হিসাব', hi: 'दक्षिणा का हिसाब' },
      { en: 'Remedy → ritual pipeline', bn: 'প্রতিকার → আচার পাইপলাইন', hi: 'उपाय → अनुष्ठान पाइपलाइन' },
      { en: 'Trusted by families', bn: 'পরিবারের আস্থা', hi: 'परिवारों का विश्वास' },
    ],
  },
};

export const RolesSection: React.FC = () => {
  const [tab, setTab] = useState<RoleTab>('devotee');
  const tabs: RoleTab[] = ['devotee', 'temple', 'pro'];
  const active = ROLE_CONTENT[tab];

  return (
    <SectionShell
      id="roles"
      dark
      eyebrow={<Tr en="Made for everyone" bn="সবার জন্য তৈরি" hi="सबके लिए बना है" />}
      title={<Tr en="Whatever your seva, there's a home here" bn="আপনার সেবা যাই হোক, এখানে ঠাঁই আছে" hi="आपकी सेवा जो भी हो, यहाँ घर है" />}
    >
      <div className="mb-8 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Benefits by role">
        {tabs.map((t) => {
          const c = ROLE_CONTENT[t];
          const selected = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={selected}
              type="button"
              onClick={() => setTab(t)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-all ${
                selected
                  ? 'bg-amber-400 text-stone-900 shadow-lg shadow-amber-400/25'
                  : 'border border-orange-100/20 bg-white/5 text-orange-100 hover:bg-white/10'
              }`}
            >
              <c.icon className="h-4 w-4" />
              <Tr en={c.en} bn={c.bn} hi={c.hi} />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {active.bullets.map((b) => (
          <div
            key={b.en}
            className="flex items-start gap-3 rounded-2xl border border-orange-100/15 bg-white/5 p-4"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
              ✓
            </span>
            <p className="text-sm font-bold leading-snug text-orange-50">
              <Tr en={b.en} bn={b.bn} hi={b.hi} />
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

/* ------------------------------------------------------------------ */
/* 8. FAQ — 5 max, short warm answers                                  */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    en: 'Is it free?',
    bn: 'এটা কি বিনামূল্যে?',
    hi: 'क्या यह मुफ़्त है?',
    enA: 'Yes — free for every devotee, forever. Temples choose simple plans that fit their size, and most begin free.',
    bnA: 'হ্যাঁ — প্রতিটি ভক্তের জন্য চিরকাল বিনামূল্যে। মন্দিরগুলো তাদের মাপ অনুযায়ী সহজ প্ল্যান বেছে নেয়, আর বেশিরভাগ বিনামূল্যেই শুরু করে।',
    hiA: 'हाँ — हर भक्त के लिए हमेशा मुफ़्त। मंदिर अपने आकार के अनुसार सरल प्लान चुनते हैं, और अधिकांश मुफ़्त में शुरू करते हैं।',
  },
  {
    en: 'Does it work offline?',
    bn: 'এটা কি অফলাইনে চলে?',
    hi: 'क्या यह ऑफ़लाइन चलता है?',
    enA: "Yes. Your panjika, reminders and records work without internet and sync when you're back — built for villages, yatras and temple halls.",
    bnA: 'হ্যাঁ। ইন্টারনেট ছাড়াই আপনার পঞ্জিকা, স্মরণ ও রেকর্ড চলে, ফিরে এলে সিঙ্ক হয়ে যায় — গ্রাম, যাত্রা ও মন্দিরের জন্য তৈরি।',
    hiA: 'हाँ। इंटरनेट के बिना आपका पंचांग, स्मरण और रिकॉर्ड चलते हैं, लौटने पर सिंक हो जाते हैं — गाँवों, यात्राओं और मंदिरों के लिए बना है।',
  },
  {
    en: 'Is my data private?',
    bn: 'আমার তথ্য কি গোপন থাকে?',
    hi: 'क्या मेरा डेटा निजी रहता है?',
    enA: 'Your sacred data stays on your device; donations go only to temple treasuries. We never sell your data — ever.',
    bnA: 'আপনার পবিত্র তথ্য আপনার ডিভাইসেই থাকে; দান শুধু মন্দিরের কোষাগারে যায়। আমরা কখনো আপনার তথ্য বিক্রি করি না — কখনোই না।',
    hiA: 'आपका पवित्र डेटा आपके डिवाइस पर ही रहता है; दान केवल मंदिर के कोषागार में जाता है। हम आपका डेटा कभी नहीं बेचते — कभी नहीं।',
  },
  {
    en: 'Which languages are supported?',
    bn: 'কোন ভাষা সমর্থিত?',
    hi: 'कौन-सी भाषाएँ समर्थित हैं?',
    enA: 'English, Hindi and Bengali today — with sacred Sanskrit terms kept as they are. More languages are coming.',
    bnA: 'আজ ইংরেজি, হিন্দি ও বাংলা — পবিত্র সংস্কৃত শব্দ যেমন আছে তেমনই রাখা হয়। আরও ভাষা আসছে।',
    hiA: 'आज अंग्रेज़ी, हिंदी और बांग्ला — पवित्र संस्कृत शब्द जैसे हैं वैसे ही रखे जाते हैं। और भाषाएँ आ रही हैं।',
  },
  {
    en: 'Do I need internet to start?',
    bn: 'শুরু করতে কি ইন্টারনেট লাগে?',
    hi: 'शुरू करने के लिए क्या इंटरनेट चाहिए?',
    enA: 'Only once, to create your account. After that, your daily spiritual life works offline.',
    bnA: 'শুধু একবার, অ্যাকাউন্ট খুলতে। তারপর আপনার প্রতিদিনের আধ্যাত্মিক জীবন অফলাইনেই চলে।',
    hiA: 'सिर्फ़ एक बार, खाता बनाने के लिए। उसके बाद आपका रोज़ का आध्यात्मिक जीवन ऑफ़लाइन चलता है।',
  },
];

export const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SectionShell
      id="faq"
      eyebrow={<Tr en="Questions, answered warmly" bn="প্রশ্নের উষ্ণ উত্তর" hi="प्रश्नों के स्नेहिल उत्तर" />}
      title={<Tr en="Everything you're wondering" bn="যা যা জানতে চান" hi="जो भी आप जानना चाहते हैं" />}
    >
      <div className="mx-auto max-w-2xl space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.en}
              className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="text-[15px] font-extrabold text-stone-900">
                  <Tr en={f.en} bn={f.bn} hi={f.hi} />
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-orange-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5">
                  <p className="text-sm leading-relaxed text-stone-600">
                    <Tr en={f.enA} bn={f.bnA} hi={f.hiA} gloss={false} />
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
};

/* ------------------------------------------------------------------ */
/* 9. Final CTA + footer                                               */
/* ------------------------------------------------------------------ */

export const FinalCtaSection: React.FC<{ cta: React.ReactNode }> = ({ cta }) => (
  <section className="relative overflow-hidden bg-[#2b1408] px-5 py-16 text-center text-orange-50 sm:py-24">
    <div
      className="ag-diya-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background:
          'radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(251,191,36,0) 70%)',
      }}
      aria-hidden="true"
    />
    <div className="relative mx-auto max-w-2xl">
      <div className="ag-flame mx-auto mb-5 text-5xl" aria-hidden="true">
        🪔
      </div>
      <h2 className="mb-3 text-3xl font-black leading-tight sm:text-5xl">
        <Tr en="Begin your journey 🙏" bn="আপনার যাত্রা শুরু করুন 🙏" hi="अपनी यात्रा शुरू करें 🙏" gloss={false} />
      </h2>
      <p className="mx-auto mb-8 max-w-xl text-sm text-orange-100/80 sm:text-base">
        <Tr
          en="Join thousands of devotees and hundreds of temples already growing together."
          bn="ইতিমধ্যে একসাথে বেড়ে ওঠা হাজারো ভক্ত ও শত শত মন্দিরের সাথে যোগ দিন।"
          hi="पहले से साथ बढ़ रहे हज़ारों भक्तों और सैकड़ों मंदिरों से जुड़ें।"
          gloss={false}
        />
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">{cta}</div>
    </div>
  </section>
);

export const Footer: React.FC = () => {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const linkCls =
    'inline-flex min-h-[44px] items-center px-2 text-sm font-bold text-orange-100/70 transition-colors hover:text-amber-300';

  return (
    <footer className="border-t border-orange-100/10 bg-[#1c0e05] px-5 py-10 text-orange-50">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-xl shadow-lg">
            🪔
          </span>
          <div className="text-left">
            <p className="text-sm font-black tracking-wide">SANATANI BANDHAN</p>
            <p className="text-xs text-orange-100/60">
              <Tr
                en="Your entire Sanatani life, in one app."
                bn="আপনার সম্পূর্ণ সনাতনী জীবন, এক অ্যাপে।"
                hi="आपका संपूर्ण सनातनी जीवन, एक ऐप में।"
                gloss={false}
              />
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Footer">
          <a href="/contact" className={linkCls}>
            <Tr en="Contact" bn="যোগাযোগ" hi="संपर्क" />
          </a>
          {hasWhatsApp() && WHATSAPP_URL && (
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={linkCls}>
              <Tr en="WhatsApp" bn="হোয়াটসঅ্যাপ" hi="व्हाट्सऐप" gloss={false} />
            </a>
          )}
          <button type="button" onClick={() => setPrivacyOpen(true)} className={`${linkCls} cursor-pointer`}>
            <Tr en="Privacy Policy" bn="গোপনীয়তা নীতি" hi="गोपनीयता नीति" />
          </button>
          <button type="button" onClick={() => setTermsOpen(true)} className={`${linkCls} cursor-pointer`}>
            <Tr en="Terms of Service" bn="ব্যবহারের শর্তাবলী" hi="सेवा की शर्तें" />
          </button>
        </nav>

        <p className="text-xs text-orange-100/40">
          © 2026 Sanatani Bandhan · <Tr en="Made with devotion" bn="ভক্তিতে নির্মিত" hi="भक्ति से निर्मित" gloss={false} /> 🪔
        </p>
      </div>

      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
      {termsOpen && <TermsOfService onClose={() => setTermsOpen(false)} />}
    </footer>
  );
};

/* ------------------------------------------------------------------ */
/* Combined lazy chunk                                                 */
/* ------------------------------------------------------------------ */

export interface GetAppSectionsProps {
  /** The primary download CTA cluster (rendered once in hero, once here). */
  cta: React.ReactNode;
}

const GetAppSections: React.FC<GetAppSectionsProps> = ({ cta }) => (
  <>
    <WhySection />
    <UtilitiesSection />
    <HowItWorksSection />
    <TrustSection />
    <RolesSection />
    <FaqSection />
    <FinalCtaSection cta={cta} />
    <Footer />
  </>
);

export default GetAppSections;
