/**
 * panjikaIntelligence.ts — Panjika Intelligence engine.
 * =====================================================================
 * The Panjika stops being a calendar you check and becomes an intelligence
 * that watches over each person by their duty (dharma/role).
 *
 * Role-event matrix: (eventType × role) → reminder definition with lead
 * time, devotional copy (EN/BN/HI), action label + route, priority.
 *
 * All date resolution is local + offline: festival DB, Drik tithi engine,
 * Ekadashi finder. Pure functions — testable without Firestore.
 *
 * Language: "Suchana" not "notification", "Agami Utsav" not "upcoming
 * event". Zero corporate tone. Quiet by default.
 */

import { PANJIKA_FESTIVALS, type PanjikaFestival } from './panjikaFestivals';
import { findEkadashis } from './vrataSchedule';
import { drikTithiAt } from './drikPanchang';
import { panchangTodayLine } from '../utils/panchang';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type IntelEventType =
  | 'maha_ekadashi' | 'ekadashi' | 'purnima' | 'amavasya'
  | 'navratri' | 'diwali' | 'durga_puja' | 'saraswati_puja'
  | 'holi' | 'rath_yatra' | 'janmashtami' | 'shivaratri'
  | 'grahan_solar' | 'grahan_lunar'
  | 'wedding_season_open' | 'pitru_paksha'
  | 'makar_sankranti' | 'regional_new_year' | 'tithi_anniversary';

export type IntelRole =
  | 'trustee' | 'accountant' | 'priest'
  | 'purohit' | 'jyotishi' | 'jyotish_provider'
  | 'sevadar' | 'devotee' | 'solo';

export type IntelPriority = 'high' | 'normal' | 'gentle';

export interface Lang3 { en: string; bn: string; hi: string }

export interface ReminderDef {
  eventType: IntelEventType;
  role: IntelRole;
  /** Days BEFORE the event the suchana appears. */
  leadDays: number;
  title: Lang3;
  message: Lang3;
  actionLabel: Lang3;
  /** Solo tab id or dashboard route hint. */
  actionTab: string;
  priority: IntelPriority;
  enabled: boolean;
}

export interface IntelEvent {
  type: IntelEventType;
  /** Gregorian ISO date of the event. */
  dateISO: string;
  name: Lang3;
}

export interface GeneratedReminder extends ReminderDef {
  eventDateISO: string;
  eventName: Lang3;
  /** Days from the reference date until the event. */
  daysUntil: number;
}

/** Owner-editable config (platformConfig/panjikaIntelligence). Fail-open. */
export interface IntelConfig {
  disabledKeys: string[]; // "eventType:role"
  leadOverrides: Record<string, number>; // "eventType:role" → leadDays
}

export const reminderKey = (d: Pick<ReminderDef, 'eventType' | 'role'>) =>
  `${d.eventType}:${d.role}`;

/* ------------------------------------------------------------------ */
/* Event date resolution (local, offline)                              */
/* ------------------------------------------------------------------ */

const MAHA_EKADASHI_PATTERNS = [
  'vaikuntha', 'nirjala', 'devshayani', 'devuthani', 'devutthana', 'amalaki', 'papankusha',
];

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

function diffDays(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T12:00:00').getTime();
  const b = new Date(toISO + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

/** Festival matchers: eventType → name patterns (checked against nameEn). */
const FESTIVAL_MATCHERS: Partial<Record<IntelEventType, string[]>> = {
  navratri: ['navratri', 'mahalaya'],
  diwali: ['diwali', 'deepavali'],
  durga_puja: ['mahalaya', 'durga puja', 'vijayadashami', 'dussehra', 'bijoya'],
  saraswati_puja: ['saraswati puja', 'vasant panchami', 'basant panchami'],
  holi: ['holi', 'dol purnima'],
  rath_yatra: ['rath yatra'],
  janmashtami: ['janmashtami', 'krishna janmashtami'],
  shivaratri: ['shivaratri', 'maha shivaratri'],
  makar_sankranti: ['makar sankranti', 'pongal', 'magh bihu'],
  regional_new_year: ['pohela boishakh', 'ugadi', 'gudi padwa', 'puthandu', 'vishu', 'baisakhi', 'pana sankranti', 'bohag bihu'],
};

/** Known eclipses 2026–2028 (NASA/IMCCE; visible-region filtering is a UI concern). */
const GRAHAN_TABLE: Array<{ dateISO: string; type: 'grahan_solar' | 'grahan_lunar'; name: Lang3 }> = [
  { dateISO: '2026-02-17', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2026-03-03', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
  { dateISO: '2026-08-12', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2026-08-28', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
  { dateISO: '2027-02-06', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2027-02-20', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
  { dateISO: '2027-08-02', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2028-01-12', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
  { dateISO: '2028-01-26', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2028-07-06', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
  { dateISO: '2028-07-22', type: 'grahan_solar', name: { en: 'Surya Grahan', bn: 'সূর্যগ্রহণ', hi: 'सूर्य ग्रहण' } },
  { dateISO: '2028-12-31', type: 'grahan_lunar', name: { en: 'Chandra Grahan', bn: 'চন্দ্রগ্রহণ', hi: 'चंद्र ग्रहण' } },
];

function festivalEvents(type: IntelEventType, fromISO: string, toISO: string): IntelEvent[] {
  const patterns = FESTIVAL_MATCHERS[type];
  if (!patterns) return [];
  const out: IntelEvent[] = [];
  for (const f of PANJIKA_FESTIVALS) {
    if (f.date < fromISO || f.date > toISO) continue;
    const name = f.nameEn.toLowerCase();
    if (patterns.some((p) => name.includes(p))) {
      out.push({
        type,
        dateISO: f.date,
        name: { en: f.nameEn, bn: f.nameBn, hi: f.nameHi || f.nameEn },
      });
    }
  }
  return out;
}

/** Scan days for Purnima (Drik index 14) / Amavasya (Drik index 29). */
function lunarPhaseEvents(
  type: 'purnima' | 'amavasya',
  fromISO: string,
  toISO: string
): IntelEvent[] {
  const target = type === 'purnima' ? 14 : 29;
  const out: IntelEvent[] = [];
  let cur = fromISO;
  const seen = new Set<string>();
  while (cur <= toISO) {
    try {
      const t = drikTithiAt(new Date(cur + 'T12:00:00'));
      if (t.index === target) {
        const month = `${cur.slice(0, 7)}`;
        if (!seen.has(month)) {
          seen.add(month);
          out.push({
            type,
            dateISO: cur,
            name:
              type === 'purnima'
                ? { en: 'Purnima', bn: 'পূর্ণিমা', hi: 'पूर्णिमा' }
                : { en: 'Amavasya', bn: 'অমাবস্যা', hi: 'अमावस्या' },
          });
        }
      }
    } catch { /* engine hiccup — skip the day */ }
    cur = addDaysISO(cur, 1);
  }
  return out;
}

/**
 * Resolve upcoming intelligence events in [fromISO, toISO].
 * Pure function — no network, no Firestore.
 */
export function resolveIntelEvents(fromISO: string, toISO: string): IntelEvent[] {
  const events: IntelEvent[] = [];

  // Festivals from the curated DB.
  for (const type of Object.keys(FESTIVAL_MATCHERS) as IntelEventType[]) {
    events.push(...festivalEvents(type, fromISO, toISO));
  }

  // Ekadashis (Smarta dates; Vaishnava noted in the message where they differ).
  try {
    const from = new Date(fromISO + 'T12:00:00');
    const to = new Date(toISO + 'T12:00:00');
    for (const e of findEkadashis(from, to, 'bd')) {
      const isMaha = MAHA_EKADASHI_PATTERNS.some((p) =>
        e.name.toLowerCase().includes(p.replace('devutthana', 'devuthan'))
      );
      events.push({
        type: isMaha ? 'maha_ekadashi' : 'ekadashi',
        dateISO: e.smartaIso,
        name: { en: e.name, bn: e.nameBn, hi: e.name },
      });
      // Wedding season opens on Devutthana Ekadashi.
      if (e.name.toLowerCase().includes('devutthana') || e.name.toLowerCase().includes('devuthan')) {
        events.push({
          type: 'wedding_season_open',
          dateISO: e.smartaIso,
          name: { en: 'Vivah season opens', bn: 'বিবাহ মরসুম শুরু', hi: 'विवाह ऋतु आरंभ' },
        });
      }
    }
  } catch { /* vrata engine hiccup — skip */ }

  // Purnima / Amavasya from the Drik engine.
  events.push(...lunarPhaseEvents('purnima', fromISO, toISO));
  events.push(...lunarPhaseEvents('amavasya', fromISO, toISO));

  // Pitru Paksha: the 15 days ending on Mahalaya.
  for (const e of festivalEvents('durga_puja', fromISO, toISO)) {
    if (e.name.en.toLowerCase().includes('mahalaya')) {
      events.push({
        type: 'pitru_paksha',
        dateISO: addDaysISO(e.dateISO, -14),
        name: { en: 'Pitru Paksha begins', bn: 'পিতৃপক্ষ শুরু', hi: 'पितृपक्ष आरंभ' },
      });
    }
  }

  // Grahan table.
  for (const g of GRAHAN_TABLE) {
    if (g.dateISO >= fromISO && g.dateISO <= toISO) {
      events.push({ type: g.type, dateISO: g.dateISO, name: g.name });
    }
  }

  // De-duplicate by type+date, keep earliest.
  const seen = new Set<string>();
  return events
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .filter((e) => {
      const k = `${e.type}:${e.dateISO}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/* ------------------------------------------------------------------ */
/* Role-event matrix (built-in defaults; owner-editable via config)    */
/* ------------------------------------------------------------------ */

/** Role fallback chain: unknown/sparse roles inherit devotee wisdom. */
const ROLE_FALLBACK: Record<IntelRole, IntelRole> = {
  trustee: 'trustee', accountant: 'accountant', priest: 'priest',
  purohit: 'purohit', jyotishi: 'jyotishi', jyotish_provider: 'jyotishi',
  sevadar: 'sevadar', devotee: 'devotee', solo: 'devotee',
};

const L = (en: string, bn: string, hi: string): Lang3 => ({ en, bn, hi });

function def(
  eventType: IntelEventType, role: IntelRole, leadDays: number,
  title: Lang3, message: Lang3, actionLabel: Lang3, actionTab: string,
  priority: IntelPriority = 'normal'
): ReminderDef {
  return { eventType, role, leadDays, title, message, actionLabel, actionTab, priority, enabled: true };
}

export const DEFAULT_MATRIX: ReminderDef[] = [
  // ---- Durga Puja / Navratri ----
  def('durga_puja', 'trustee', 30,
    L('Sharadiya Durgotsav approaches', 'শারদীয়া দুর্গোৎসব আসন্ন', 'शारदीय दुर्गोत्सव निकट'),
    L('Confirm priest schedule, order samagri, open the volunteer roster, arrange prasad.',
      'পুরোহিতের সময়সূচি নিশ্চিত করুন, সামগ্রী অর্ডার করুন, স্বেচ্ছাসেবক তালিকা খুলুন।',
      'पुरोहित कार्यक्रम निश्चित करें, सामग्री मंगवाएं, स्वयंसेवक सूची खोलें।'),
    L('Plan Utsav', 'উৎসব পরিকল্পনা', 'उत्सव योजना'), 'utsav', 'high'),
  def('durga_puja', 'sevadar', 7,
    L('Durgotsav seva roster', 'দুর্গোৎসব সেবা তালিকা', 'दुर्गोत्सव सेवा सूची'),
    L('Volunteers are being gathered for the festival days. Offer your seva.',
      'উৎসবের দিনগুলির জন্য স্বেচ্ছাসেবক সংগ্রহ করা হচ্ছে। আপনার সেবা অর্পণ করুন।',
      'उत्सव के दिनों हेतु स्वयंसेवक जुटाए जा रहे हैं। अपनी सेवा अर्पित करें।'),
    L('View roster', 'তালিকা দেখুন', 'सूची देखें'), 'sangam'),
  def('durga_puja', 'devotee', 7,
    L('Durgotsav approaches', 'দুর্গোৎসব আসন্ন', 'दुर्गोत्सव निकट'),
    L('Prepare your home altar. Samagri checklist and katha booking inside.',
      'আপনার গৃহবেদী প্রস্তুত করুন। সামগ্রীর তালিকা ও কথা বুকিং ভিতরে।',
      'अपनी गृहवेदी तैयार करें। सामग्री सूची व कथा बुकिंग अंदर।'),
    L('Festival guide', 'উৎসব নির্দেশিকা', 'उत्सव मार्गदर्शिका'), 'panjika'),
  def('navratri', 'accountant', 14,
    L('Festival fortnight ahead', 'উৎসব পক্ষ আসন্ন', 'उत्सव पक्ष आगामी'),
    L('Navratri–Diwali historically brings 3× donation volume. Prepare receipt books and hundi counting.',
      'নবরাত্রি–দীপাবলিতে ঐতিহাসিকভাবে ৩ গুণ দান আসে। রসিদ বই ও হুন্ডি গণনা প্রস্তুত রাখুন।',
      'नवरात्रि–दीपावली में ऐतिहासिक रूप से 3 गुना दान आता है। रसीद पुस्तिका तैयार रखें।'),
    L('Open Treasury', 'ভাণ্ডার খুলুন', 'भंडार खोलें'), 'treasury'),

  // ---- Diwali / Kali Puja ----
  def('diwali', 'trustee', 21,
    L('Deepavali approaches', 'দীপাবলি আসন্ন', 'दीपावली निकट'),
    L('Deep-daan arrangement, extended darshan hours, fire-safety check for the premises.',
      'দীপদান ব্যবস্থা, বর্ধিত দর্শনের সময়, প্রাঙ্গণের অগ্নি-নিরাপত্তা পরীক্ষা।',
      'दीपदान व्यवस्था, विस्तारित दर्शन समय, परिसर की अग्नि-सुरक्षा जांच।'),
    L('Plan Utsav', 'উৎসব পরিকল্পনা', 'उत्सव योजना'), 'utsav', 'high'),
  def('diwali', 'devotee', 5,
    L('Deepavali in 5 days', '৫ দিনে দীপাবলি', '5 दिनों में दीपावली'),
    L('Lakshmi Puja samagri, diya arrangements — and book your purohit before the rush.',
      'লক্ষ্মীপূজার সামগ্রী, প্রদীপের আয়োজন — ভিড়ের আগেই পুরোহিত বুক করুন।',
      'लक्ष्मी पूजा सामग्री, दीया व्यवस्था — भीड़ से पहले पुरोहित बुक करें।'),
    L('Request Seva', 'সেবা অনুরোধ', 'सेवा अनुरोध'), 'marketplace'),

  // ---- Ekadashi ----
  def('ekadashi', 'devotee', 3,
    L('Ekadashi approaches', 'একাদশী আসন্ন', 'एकादशी निकट'),
    L('Fasting guide and parana window inside. May your vrata be steady.',
      'উপবাস নির্দেশিকা ও পারণ সময় ভিতরে। আপনার ব্রত স্থির হোক।',
      'व्रत मार्गदर्शिका व पारण समय अंदर। आपका व्रत स्थिर हो।'),
    L('View guide', 'নির্দেশিকা দেখুন', 'मार्गदर्शिका देखें'), 'panjika'),
  def('maha_ekadashi', 'devotee', 7,
    L('Maha Ekadashi approaches', 'মহা একাদশী আসন্ন', 'महा एकादशी निकट'),
    L('A great vrata approaches — Vaikuntha, Nirjala, Devshayani. Prepare with devotion.',
      'মহাব্রত আসন্ন। ভক্তিভরে প্রস্তুতি নিন।',
      'महाव्रत निकट है — भक्तिपूर्वक तैयारी करें।'),
    L('View guide', 'নির্দেশিকা দেখুন', 'मार्गदर्शिका देखें'), 'panjika', 'high'),
  def('ekadashi', 'trustee', 3,
    L('Ekadashi approaches', 'একাদশী আসন্ন', 'एकादशी निकट'),
    L('Temple prasad: no grains for the day. Inform the bhandara team.',
      'মন্দির প্রসাদ: সেদিন শস্যদানা নয়। ভাণ্ডারা দলকে জানান।',
      'मंदिर प्रसाद: उस दिन अन्न नहीं। भंडारा दल को सूचित करें।'),
    L('Announcements', 'ঘোষণা', 'घोषणा'), 'announcements'),

  // ---- Purnima / Amavasya ----
  def('purnima', 'devotee', 2,
    L('Purnima approaches', 'পূর্ণিমা আসন্ন', 'पूर्णिमा निकट'),
    L('Satyanarayan katha and the full-moon vrata. An auspicious night for japa.',
      'সত্যনারায়ণ কথা ও পূর্ণিমা ব্রত। জপের জন্য শুভ রাত্রি।',
      'सत्यनारायण कथा व पूर्णिमा व्रत। जप हेतु शुभ रात्रि।'),
    L('Book katha', 'কথা বুক করুন', 'कथा बुक करें'), 'marketplace'),
  def('amavasya', 'devotee', 2,
    L('Amavasya approaches', 'অমাবস্যা আসন্ন', 'अमावस्या निकट'),
    L('A day for pitru tarpana and remembrance. Honor those who came before.',
      'পিতৃ তর্পণ ও স্মরণের দিন। যাঁরা আগে এসেছিলেন তাঁদের সম্মান করুন।',
      'पितृ तर्पण व स्मरण का दिन। पूर्वजों का सम्मान करें।'),
    L('Panjika', 'পঞ্জিকা', 'पंजिका'), 'panjika', 'gentle'),
  def('amavasya', 'accountant', 2,
    L('Lunar month closing', 'চান্দ্র মাস সমাপ্তি', 'चांद्र मास समापन'),
    L('Amavasya marks the month boundary. Reconcile dakshina receipts and hundi entries.',
      'অমাবস্যা মাসের সীমানা। দক্ষিণার রসিদ ও হুন্ডির হিসাব মিলিয়ে নিন।',
      'अमावस्या मास की सीमा है। दक्षिणा रसीदों का मिलान करें।'),
    L('Open Treasury', 'ভাণ্ডার খুলুন', 'भंडार खोलें'), 'treasury'),

  // ---- Wedding season ----
  def('wedding_season_open', 'purohit', 14,
    L('Vivah season opens soon', 'বিবাহ মরসুম শীঘ্রই', 'विवाह ऋतु शीघ्र'),
    L('Devuthani Ekadashi reopens the auspicious season. Update your availability and sevas.',
      'দেবুত্থান একাদশীতে শুভ মরসুম পুনরায় খুলছে। আপনার উপলব্ধি হালনাগাদ করুন।',
      'देवउठान एकादशी से शुभ ऋतु पुनः खुलेगी। अपनी उपलब्धता अद्यतन करें।'),
    L('Update Sevas', 'সেবা হালনাগাদ', 'सेवा अद्यतन'), 'provider', 'high'),
  def('wedding_season_open', 'jyotishi', 14,
    L('Vivah season opens soon', 'বিবাহ মরসুম শীঘ্রই', 'विवाह ऋतु शीघ्र'),
    L('Kundali-matching consultations rise sharply. Keep slots open for yajmans.',
      'কুষ্ঠি মিলান পরামর্শ তীব্র বাড়ে। যজমানদের জন্য স্লট খোলা রাখুন।',
      'कुंडली मिलान परामर्श तीव्र बढ़ेगा। यजमानों हेतु स्लॉट रखें।'),
    L('Availability', 'উপলব্ধতা', 'उपलब्धता'), 'provider'),
  def('wedding_season_open', 'devotee', 10,
    L('Vivah season opens soon', 'বিবাহ মরসুম শীঘ্রই', 'विवाह ऋतु शीघ्र'),
    L('Planning a family wedding? Find shubh muhurats and request a purohit early.',
      'পারিবারিক বিবাহের পরিকল্পনা? শুভ মুহূর্ত খুঁজুন ও আগেই পুরোহিত অনুরোধ করুন।',
      'पारिवारिक विवाह की योजना? शुभ मुहूर्त खोजें व पुरोहित शीघ्र बुक करें।'),
    L('Find muhurat', 'মুহূর্ত খুঁজুন', 'मुहूर्त खोजें'), 'panjika'),

  // ---- Grahan ----
  def('grahan_lunar', 'jyotishi', 9,
    L('Chandra Grahan approaches', 'চন্দ্রগ্রহণ আসন্ন', 'चंद्र ग्रहण निकट'),
    L('Sutak questions will rise. Review eclipse timings for your region.',
      'সূতক প্রশ্ন বাড়বে। আপনার অঞ্চলের গ্রহণ সময় পর্যালোচনা করুন।',
      'सूतक प्रश्न बढ़ेंगे। अपने क्षेत्र का ग्रहण समय देखें।'),
    L('Consult Panjika', 'পঞ্জিকা দেখুন', 'पंजिका देखें'), 'panjika'),
  def('grahan_lunar', 'devotee', 2,
    L('Chandra Grahan approaches', 'চন্দ্রগ্রহণ আসন্ন', 'चंद्र ग्रहण निकट'),
    L('Sutak observances and japa guidance inside. A powerful night for mantra.',
      'সূতক পালন ও জপ নির্দেশিকা ভিতরে। মন্ত্রের জন্য শক্তিশালী রাত্রি।',
      'सूतक पालन व जप मार्गदर्शिका अंदर। मंत्र हेतु शक्तिशाली रात्रि।'),
    L('Grahan guide', 'গ্রহণ নির্দেশিকা', 'ग्रहण मार्गदर्शिका'), 'panjika', 'gentle'),
  def('grahan_solar', 'devotee', 2,
    L('Surya Grahan approaches', 'সূর্যগ্রহণ আসন্ন', 'सूर्य ग्रहण निकट'),
    L('Sutak begins before the eclipse. Guidance for the day inside.',
      'গ্রহণের আগেই সূতক শুরু। দিনের নির্দেশিকা ভিতরে।',
      'ग्रहण से पूर्व सूतक। दिन की मार्गदर्शिका अंदर।'),
    L('Grahan guide', 'গ্রহণ নির্দেশিকা', 'ग्रहण मार्गदर्शिका'), 'panjika', 'gentle'),

  // ---- Pitru Paksha ----
  def('pitru_paksha', 'devotee', 5,
    L('Pitru Paksha begins soon', 'পিতৃপক্ষ শীঘ্রই', 'पितृपक्ष शीघ्र'),
    L('Fifteen days of remembrance. Tarpana guidance and purohit booking inside.',
      'স্মরণের পনেরো দিন। তর্পণ নির্দেশিকা ও পুরোহিত বুকিং ভিতরে।',
      'स्मरण के पंद्रह दिन। तर्पण मार्गदर्शिका अंदर।'),
    L('Request Seva', 'সেবা অনুরোধ', 'सेवा अनुरोध'), 'marketplace'),
  def('pitru_paksha', 'purohit', 7,
    L('Pitru Paksha approaches', 'পিতৃপক্ষ আসন্ন', 'पितृपक्ष निकट'),
    L('Shradhha and tarpana bookings peak. Prepare your schedule.',
      'শ্রাদ্ধ ও তর্পণ বুকিং শীর্ষে। আপনার সময়সূচি প্রস্তুত করুন।',
      'श्राद्ध व तर्पण बुकिंग चरम पर। अपना कार्यक्रम तैयार करें।'),
    L('Update Sevas', 'সেবা হালনাগাদ', 'सेवा अद्यतन'), 'provider'),

  // ---- Saraswati Puja / Holi / Rath / Janmashtami / Shivaratri ----
  def('saraswati_puja', 'devotee', 5,
    L('Saraswati Puja approaches', 'সরস্বতী পূজা আসন্ন', 'सरस्वती पूजा निकट'),
    L('Books and instruments rest before the Devi of learning. Vidya-arambha guidance inside.',
      'বিদ্যার দেবীর সামনে বই ও বাদ্যযন্ত্র বিশ্রাম নেয়।',
      'विद्या की देवी के समक्ष पुस्तकें विश्राम करती हैं।'),
    L('Festival guide', 'উৎসব নির্দেশিকা', 'उत्सव मार्गदर्शिका'), 'panjika'),
  def('holi', 'devotee', 4,
    L('Holi approaches', 'হোলি আসন্ন', 'होली निकट'),
    L('Phalguna Purnima — the festival of colors. Holika dahan timings inside.',
      'ফাল্গুন পূর্ণিমা — রঙের উৎসব। হোলিকা দহনের সময় ভিতরে।',
      'फाल्गुन पूर्णिमा — रंगों का उत्सव। होलिका दहन समय अंदर।'),
    L('Festival guide', 'উৎসব নির্দেশিকা', 'उत्सव मार्गदर्शिका'), 'panjika'),
  def('rath_yatra', 'trustee', 14,
    L('Rath Yatra approaches', 'রথযাত্রা আসন্ন', 'रथ यात्रा निकट'),
    L('Chariot preparation, route permissions, prasad for the crowds. Begin now.',
      'রথ প্রস্তুতি, পথের অনুমতি, ভিড়ের জন্য প্রসাদ। এখনই শুরু করুন।',
      'रथ तैयारी, मार्ग अनुमति, भीड़ हेतु प्रसाद। अभी आरंभ करें।'),
    L('Plan Utsav', 'উৎসব পরিকল্পনা', 'उत्सव योजना'), 'utsav', 'high'),
  def('janmashtami', 'devotee', 4,
    L('Janmashtami approaches', 'জন্মাষ্টমী আসন্ন', 'जन्माष्टमी निकट'),
    L('The midnight birth of Krishna. Fast rules and midnight puja vidhi inside.',
      'কৃষ্ণের মধ্যরাত্রি জন্ম। উপবাস নিয়ম ও মধ্যরাত্রি পূজা বিধি ভিতরে।',
      'कृष्ण का मध्यरात्रि जन्म। व्रत नियम व पूजा विधि अंदर।'),
    L('Festival guide', 'উৎসব নির্দেশিকা', 'उत्सव मार्गदर्शिका'), 'panjika'),
  def('shivaratri', 'devotee', 4,
    L('Mahashivaratri approaches', 'মহাশিবরাত্রি আসন্ন', 'महाशिवरात्रि निकट'),
    L('The great night of Shiva. Four-prahar puja timings and fast guidance inside.',
      'শিবের মহান রাত্রি। চার প্রহর পূজার সময় ভিতরে।',
      'शिव की महान रात्रि। चार प्रहर पूजा समय अंदर।'),
    L('Festival guide', 'উৎসব নির্দেশিকা', 'उत्सव मार्गदर्शिका'), 'panjika'),

  // ---- Makar Sankranti / New Year ----
  def('makar_sankranti', 'devotee', 5,
    L('Makar Sankranti approaches', 'মকর সংক্রান্তি আসন্ন', 'मकर संक्रांति निकट'),
    L('Uttarayana begins — the Devas’ daytime. Til-gud, daan, and holy bath.',
      'উত্তরায়ণ শুরু — দেবতাদের দিন। তিল-গুড়, দান ও পবিত্র স্নান।',
      'उत्तरायण आरंभ — देवताओं का दिन। तिल-गुड़, दान व पवित्र स्नान।'),
    L('Panjika', 'পঞ্জিকা', 'पंजिका'), 'panjika'),
  def('regional_new_year', 'devotee', 7,
    L('New year approaches', 'নববর্ষ আসন্ন', 'नववर्ष निकट'),
    L('Pohela Boishakh / Ugadi / Puthandu approaches. Begin the year with punya.',
      'পহেলা বৈশাখ আসন্ন। পুণ্য দিয়ে বছর শুরু করুন।',
      'नववर्ष निकट — पुण्य से वर्षारंभ करें।'),
    L('Panjika', 'পঞ্জিকা', 'पंजिका'), 'panjika'),

  // ---- Sevadar / Priest ----
  def('navratri', 'sevadar', 7,
    L('Navratri seva roster', 'নবরাত্রি সেবা তালিকা', 'नवरात्रि सेवा सूची'),
    L('Nine nights of the Devi — volunteers needed for aarti, prasad, and crowds.',
      'দেবীর নয় রাত্রি — আরতি, প্রসাদ ও ভিড়ের জন্য স্বেচ্ছাসেবক প্রয়োজন।',
      'देवी की नौ रात्रें — आरती, प्रसाद हेतु स्वयंसेवक चाहिए।'),
    L('View roster', 'তালিকা দেখুন', 'सूची देखें'), 'sangam'),
  def('purnima', 'priest', 3,
    L('Purnima approaches', 'পূর্ণিমা আসন্ন', 'पूर्णिमा निकट'),
    L('Satyanarayan katha bookings rise. Confirm your availability with the trust.',
      'সত্যনারায়ণ কথা বুকিং বাড়ে। ট্রাস্টের সাথে উপলব্ধি নিশ্চিত করুন।',
      'सत्यनारायण कथा बुकिंग बढ़ेगी। ट्रस्ट से उपलब्धता निश्चित करें।'),
    L('Schedule', 'সময়সূচি', 'कार्यक्रम'), 'schedule'),
];

const MATRIX_BY_ROLE = new Map<IntelRole, ReminderDef[]>();
for (const d of DEFAULT_MATRIX) {
  const arr = MATRIX_BY_ROLE.get(d.role) || [];
  arr.push(d);
  MATRIX_BY_ROLE.set(d.role, arr);
}

/** Matrix entries visible to a role (with fallback chain). */
export function matrixForRole(role: IntelRole): ReminderDef[] {
  const r = ROLE_FALLBACK[role] || 'devotee';
  return MATRIX_BY_ROLE.get(r) || MATRIX_BY_ROLE.get('devotee') || [];
}

/* ------------------------------------------------------------------ */
/* Reminder generation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Generate upcoming reminders for a role.
 * A reminder appears when (eventDate − leadDays) ≤ horizon AND eventDate ≥ from.
 * Pure function — pass `now` for testability.
 */
export function generateReminders(
  role: IntelRole,
  fromISO: string,
  daysAhead = 30,
  matrix: ReminderDef[] = matrixForRole(role),
  config?: IntelConfig
): GeneratedReminder[] {
  const horizonISO = addDaysISO(fromISO, daysAhead);
  const events = resolveIntelEvents(fromISO, addDaysISO(fromISO, daysAhead + 60));
  const eventsByType = new Map<IntelEventType, IntelEvent[]>();
  for (const e of events) {
    const arr = eventsByType.get(e.type) || [];
    arr.push(e);
    eventsByType.set(e.type, arr);
  }

  const out: GeneratedReminder[] = [];
  for (const def of matrix) {
    const key = reminderKey(def);
    if (config?.disabledKeys.includes(key)) continue;
    const lead = config?.leadOverrides[key] ?? def.leadDays;
    if (!def.enabled) continue;
    const candidates = (eventsByType.get(def.eventType) || [])
      .filter((e) => e.dateISO >= fromISO)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const next = candidates[0];
    if (!next) continue;
    const notifyISO = addDaysISO(next.dateISO, -lead);
    if (notifyISO > horizonISO) continue; // too far out to mention yet
    out.push({
      ...def,
      leadDays: lead,
      eventDateISO: next.dateISO,
      eventName: next.name,
      daysUntil: diffDays(fromISO, next.dateISO),
    });
  }

  const prio: Record<IntelPriority, number> = { high: 0, normal: 1, gentle: 2 };
  return out.sort(
    (a, b) => prio[a.priority] - prio[b.priority] || a.daysUntil - b.daysUntil
  );
}

/* ------------------------------------------------------------------ */
/* Morning digest helpers                                              */
/* ------------------------------------------------------------------ */

export interface DigestToday {
  tithiLine: string;
  festivals: PanjikaFestival[];
  abhijitHint: string;
}

const BLESSINGS: Lang3[] = [
  L('॥ शुभं भूयात् ॥ — May this day be auspicious for you.',
    '॥ শুভং ভূয়াৎ ॥ — আপনার দিন শুভ হোক।',
    '॥ शुभं भूयात् ॥ — आपका दिन शुभ हो।'),
  L('Each sunrise is a new sankalpa. Begin well.',
    'প্রতিটি সূর্যোদয় নতুন সংকল্প। শুভ সূচনা করুন।',
    'प्रत्येक सूर्योदय नया संकल्प है। शुभ आरंभ करें।'),
  L('॥ तमसो मा ज्योतिर्गमय ॥ — From darkness, lead me to light.',
    '॥ তমসো মা জ্যোতির্গময় ॥ — অন্ধকার থেকে আলোর দিকে নিয়ে চলো।',
    '॥ तमसो मा ज्योतिर्गमय ॥ — अंधकार से ज्योति की ओर ले चलो।'),
];

/** Deterministic blessing of the day (stable per date). */
export function blessingOfDay(iso: string): Lang3 {
  let h = 0;
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BLESSINGS[h % BLESSINGS.length];
}

/** One-line digest for today: tithi + festivals. Fail-open. */
export function getTodayDigest(now: Date = new Date()): DigestToday {
  const iso = isoOf(now);
  let tithiLine = '';
  try {
    // QUEUED #52 (audit D12): the canonical sunrise-anchored today line
    // (utils/panchang) — the same values the header, dashboards and solo
    // home render. This used the instant-based drikTodayLine plus a
    // HARDCODED Vikram year (2083), so the digest could disagree with
    // every other surface on both tithi and year.
    tithiLine = panchangTodayLine(now);
  } catch { tithiLine = ''; }
  const festivals = PANJIKA_FESTIVALS.filter((f) => f.date === iso).slice(0, 4);
  return { tithiLine, festivals, abhijitHint: '' };
}

/* ------------------------------------------------------------------ */
/* Tithi anniversary (personal samskara reminders)                     */
/* ------------------------------------------------------------------ */

export interface UserSamskara {
  id: string;
  kind: 'vivah' | 'annaprason' | 'upanayan' | 'namkaran' | 'other';
  /** Drik tithi index 0..29 prevailing at sunrise on the samskara day. */
  tithiIndex: number;
  paksha: 'Shukla' | 'Krishna';
  label: string;
  /** Gregorian ISO of the original event (for "N years"). */
  dateISO: string;
}

const KIND_BLESSING: Record<UserSamskara['kind'], Lang3> = {
  vivah: L('May your union be blessed for a hundred autumns. 🌸',
    'আপনাদের মিলন শত শরৎ ধরে আশীর্বাদপূর্ণ হোক। 🌸',
    'आपका मिलन सौ शरदों तक आशीर्वादपूर्ण हो। 🌸'),
  annaprason: L('May the child be nourished in body and spirit. 🍚',
    'শিশু শরীরে ও আত্মায় পুষ্ট হোক। 🍚',
    'शिशु तन-मन से पोषित हो। 🍚'),
  upanayan: L('May the sacred thread guide every step. 🧵',
    'পবিত্র উপবীত প্রতিটি পদক্ষেপে পথ দেখাক। 🧵',
    'पवित्र उपवीत प्रत्येक पग पर मार्ग दिखाए। 🧵'),
  namkaran: L('May the name carry dharma always. ✨',
    'নাম সর্বদা ধর্ম বহন করুক। ✨',
    'नाम सदा धर्म धारण करे। ✨'),
  other: L('A sacred anniversary returns. 🌼',
    'এক পবিত্র বার্ষিকী ফিরে এলো। 🌼',
    'एक पवित्र वर्षगांठ लौटी है। 🌼'),
};

/** Next date (≥ from) whose sunrise tithi matches the samskara tithi. ≤400d scan. */
export function nextTithiAnniversary(s: UserSamskara, fromISO: string): string | null {
  let cur = fromISO;
  for (let i = 0; i < 400; i++) {
    try {
      const t = drikTithiAt(new Date(cur + 'T12:00:00'));
      if (t.index === s.tithiIndex) return cur;
    } catch { /* skip */ }
    cur = addDaysISO(cur, 1);
  }
  return null;
}

export function anniversaryReminders(
  samskaras: UserSamskara[],
  fromISO: string,
  leadDays = 7
): GeneratedReminder[] {
  const out: GeneratedReminder[] = [];
  for (const s of samskaras) {
    const next = nextTithiAnniversary(s, fromISO);
    if (!next) continue;
    const daysUntil = diffDays(fromISO, next);
    if (daysUntil > leadDays + 30) continue;
    const years = Math.max(0, Number(next.slice(0, 4)) - Number(s.dateISO.slice(0, 4)));
    const base: ReminderDef = {
      eventType: 'tithi_anniversary',
      role: 'devotee',
      leadDays,
      title: L(
        `Your ${s.kind} tithi returns in ${daysUntil} days`,
        `আপনার ${s.kind} তিথি ${daysUntil} দিনে ফিরছে`,
        `आपकी ${s.kind} तिथि ${daysUntil} दिनों में लौट रही है`),
      message: KIND_BLESSING[s.kind],
      actionLabel: L('Offer pranam', 'প্রণাম জানান', 'प्रणाम करें'),
      actionTab: 'sadhana',
      priority: 'gentle',
      enabled: true,
    };
    if (daysUntil <= leadDays) {
      out.push({
        ...base,
        eventDateISO: next,
        eventName: L(`${s.label}${years > 0 ? ` — ${years} years` : ''}`,
          `${s.label}${years > 0 ? ` — ${years} বছর` : ''}`,
          `${s.label}${years > 0 ? ` — ${years} वर्ष` : ''}`),
        daysUntil,
      });
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

/* ------------------------------------------------------------------ */
/* Owner config (Firestore; fail-open to built-in defaults)            */
/* ------------------------------------------------------------------ */

const LS_KEY = 'sb_panjika_intel_config_v1';

export function readLocalIntelConfig(): IntelConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Array.isArray(c.disabledKeys) && c.leadOverrides) return c as IntelConfig;
  } catch { /* ignore */ }
  return null;
}

export function writeLocalIntelConfig(c: IntelConfig): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/** Async Firestore load with local cache; returns null when unavailable (fail-open). */
export async function loadIntelConfig(): Promise<IntelConfig | null> {
  const local = readLocalIntelConfig();
  try {
    const { getIntelConfig } = await import('./firestoreAdmin');
    const remote = await getIntelConfig();
    if (remote) {
      writeLocalIntelConfig(remote);
      return remote;
    }
  } catch { /* offline or not owner — fail open */ }
  return local;
}
