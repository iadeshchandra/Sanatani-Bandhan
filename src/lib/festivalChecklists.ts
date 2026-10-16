/**
 * festivalChecklists.ts — role-aware preparation checklists for major festivals.
 * =====================================================================
 * Templates in EN/BN/HI. Checklists are checkable per workspace/user with
 * the festival date as the deadline. Trustee items = logistics;
 * devotee items = home puja preparation.
 */

import type { Lang3 } from './panjikaIntelligence';

export type ChecklistRole = 'trustee' | 'devotee';

export interface ChecklistItem {
  id: string;
  role: ChecklistRole;
  text: Lang3;
}

export interface FestivalChecklist {
  /** Matches the festival DB name pattern (lowercase includes). */
  match: string;
  name: Lang3;
  items: ChecklistItem[];
}

const L = (en: string, bn: string, hi: string): Lang3 => ({ en, bn, hi });

export const FESTIVAL_CHECKLISTS: FestivalChecklist[] = [
  {
    match: 'durga puja',
    name: L('Durga Puja preparations', 'দুর্গাপূজার প্রস্তুতি', 'दुर्गा पूजा तैयारी'),
    items: [
      { id: 'dp-t1', role: 'trustee', text: L('Confirm purohit schedule for Shashthi–Dashami', 'ষষ্ঠী–দশমীর জন্য পুরোহিতের সময়সূচি নিশ্চিত করুন', 'षष्ठी–दशमी हेतु पुरोहित कार्यक्रम निश्चित करें') },
      { id: 'dp-t2', role: 'trustee', text: L('Order puja samagri & flowers in bulk', 'পূজার সামগ্রী ও ফুল পাইকারি অর্ডার করুন', 'पूजा सामग्री व फूल थोक में मंगवाएं') },
      { id: 'dp-t3', role: 'trustee', text: L('Open volunteer roster for all five days', 'পাঁচ দিনের জন্য স্বেচ্ছাসেবক তালিকা খুলুন', 'पांचों दिनों हेतु स्वयंसेवक सूची खोलें') },
      { id: 'dp-t4', role: 'trustee', text: L('Arrange prasad & bhog quantities', 'প্রসাদ ও ভোগের পরিমাণ ঠিক করুন', 'प्रसाद व भोग की मात्रा तय करें') },
      { id: 'dp-t5', role: 'trustee', text: L('Publish utsab schedule & announcements', 'উৎসবের সময়সূচি ও ঘোষণা প্রকাশ করুন', 'उत्सव कार्यक्रम व घोषणाएं प्रकाशित करें') },
      { id: 'dp-t6', role: 'trustee', text: L('Hundi & donation staff roster', 'হুন্ডি ও দান কর্মীদের তালিকা', 'हुंडी व दान कर्मियों की सूची') },
      { id: 'dp-d1', role: 'devotee', text: L('Clean & decorate the home altar', 'গৃহবেদী পরিষ্কার ও সাজান', 'गृहवेदी साफ़ व सजाएं') },
      { id: 'dp-d2', role: 'devotee', text: L('Prepare samagri: pancha upachara items', 'সামগ্রী তৈরি করুন: পঞ্চোপচার', 'सामग्री तैयार करें: पंचोपचार') },
      { id: 'dp-d3', role: 'devotee', text: L('Book purohit for Ashtami anjali', 'অষ্টমী অঞ্জলির জন্য পুরোহিত বুক করুন', 'अष्टमी अंजलि हेतु पुरोहित बुक करें') },
      { id: 'dp-d4', role: 'devotee', text: L('Plan Dashami visarjan visit', 'দশমী বিসর্জন দর্শনের পরিকল্পনা', 'दशमी विसर्जन दर्शन की योजना') },
    ],
  },
  {
    match: 'diwali',
    name: L('Diwali / Kali Puja preparations', 'দীপাবলি / কালীপূজার প্রস্তুতি', 'दीपावली / काली पूजा तैयारी'),
    items: [
      { id: 'dw-t1', role: 'trustee', text: L('Deep-daan arrangement & diya count', 'দীপদান ব্যবস্থা ও প্রদীপ সংখ্যা', 'दीपदान व्यवस्था व दीया संख्या') },
      { id: 'dw-t2', role: 'trustee', text: L('Extended darshan hours roster', 'বর্ধিত দর্শন সময়ের তালিকা', 'विस्तारित दर्शन समय सूची') },
      { id: 'dw-t3', role: 'trustee', text: L('Fire-safety check of the premises', 'প্রাঙ্গণের অগ্নি-নিরাপত্তা পরীক্ষা', 'परिसर की अग्नि-सुरक्षा जांच') },
      { id: 'dw-t4', role: 'trustee', text: L('Lakshmi Puja samagri stock', 'লক্ষ্মীপূজার সামগ্রী মজুত', 'लक्ष्मी पूजा सामग्री भंडार') },
      { id: 'dw-d1', role: 'devotee', text: L('Diyas, oil & wicks ready', 'প্রদীপ, তেল ও সলতে প্রস্তুত', 'दीये, तेल व बाती तैयार') },
      { id: 'dw-d2', role: 'devotee', text: L('Lakshmi Puja samagri list', 'লক্ষ্মীপূজার সামগ্রী তালিকা', 'लक्ष्मी पूजा सामग्री सूची') },
      { id: 'dw-d3', role: 'devotee', text: L('Charnamrita & naivedya plan', 'চরণামৃত ও নৈবেদ্য পরিকল্পনা', 'चरणामृत व नैवेद्य योजना') },
    ],
  },
  {
    match: 'saraswati puja',
    name: L('Saraswati Puja preparations', 'সরস্বতী পূজার প্রস্তুতি', 'सरस्वती पूजा तैयारी'),
    items: [
      { id: 'sp-t1', role: 'trustee', text: L('Arrange Devi murti / frame & alpona', 'দেবী মূর্তি ও আলপনার ব্যবস্থা', 'देवी मूर्ति व अल्पना व्यवस्था') },
      { id: 'sp-t2', role: 'trustee', text: L('Student gathering & hat-e-khori slot', 'শিক্ষার্থী সমাবেশ ও হাতে-খড়ি', 'छात्र समागम व हाथे-खड़ी') },
      { id: 'sp-d1', role: 'devotee', text: L('Place books & instruments before the Devi', 'দেবীর সামনে বই ও বাদ্যযন্ত্র রাখুন', 'देवी के समक्ष पुस्तकें रखें') },
      { id: 'sp-d2', role: 'devotee', text: L('Yellow flowers & sandalwood ready', 'হলুদ ফুল ও চন্দন প্রস্তুত', 'पीले फूल व चंदन तैयार') },
      { id: 'sp-d3', role: 'devotee', text: L('No-study observance for the day', 'সেদিন অধ্যয়ন বিরতি পালন', 'उस दिन अध्ययन विराम') },
    ],
  },
  {
    match: 'navratri',
    name: L('Navratri preparations', 'নবরাত্রির প্রস্তুতি', 'नवरात्रि तैयारी'),
    items: [
      { id: 'nv-t1', role: 'trustee', text: L('Nine-day aarti & kanya pujan schedule', 'নয় দিনের আরতি ও কন্যা পূজন সূচি', 'नौ दिवसीय आरती व कन्या पूजन कार्यक्रम') },
      { id: 'nv-t2', role: 'trustee', text: L('Volunteer roster for all nine nights', 'নয় রাত্রির স্বেচ্ছাসেবক তালিকা', 'नौ रात्रों हेतु स्वयंसेवक सूची') },
      { id: 'nv-t3', role: 'trustee', text: L('Prasad quantities for bhandara', 'ভাণ্ডারার প্রসাদ পরিমাণ', 'भंडारे हेतु प्रसाद मात्रा') },
      { id: 'nv-d1', role: 'devotee', text: L('Ghatasthapana items ready', 'ঘটস্থাপনার সামগ্রী প্রস্তুত', 'घटस्थापना सामग्री तैयार') },
      { id: 'nv-d2', role: 'devotee', text: L('Fast rules for nine days (if observing)', 'নয় দিনের উপবাস নিয়ম', 'नौ दिवसीय व्रत नियम') },
    ],
  },
  {
    match: 'rath yatra',
    name: L('Rath Yatra preparations', 'রথযাত্রার প্রস্তুতি', 'रथ यात्रा तैयारी'),
    items: [
      { id: 'ry-t1', role: 'trustee', text: L('Chariot repair & decoration', 'রথ মেরামত ও সাজসজ্জা', 'रथ मरम्मत व सज्जा') },
      { id: 'ry-t2', role: 'trustee', text: L('Route permissions from authorities', 'কর্তৃপক্ষের পথ অনুমতি', 'प्राधिकारियों से मार्ग अनुमति') },
      { id: 'ry-t3', role: 'trustee', text: L('Prasad & water for the crowds', 'ভিড়ের জন্য প্রসাদ ও জল', 'भीड़ हेतु प्रसाद व जल') },
      { id: 'ry-t4', role: 'trustee', text: L('Volunteer cordon along the route', 'পথে স্বেচ্ছাসেবক প্রহরা', 'मार्ग में स्वयंसेवक व्यवस्था') },
      { id: 'ry-d1', role: 'devotee', text: L('Pull the ropes with devotion — arrive early', 'ভক্তিভরে দড়ি টানুন — আগেই আসুন', 'भक्तिपूर्वक रस्सी खींचें — शीघ्र आएं') },
    ],
  },
  {
    match: 'janmashtami',
    name: L('Janmashtami preparations', 'জন্মাষ্টমীর প্রস্তুতি', 'जन्माष्टमी तैयारी'),
    items: [
      { id: 'jm-t1', role: 'trustee', text: L('Midnight puja schedule & kirtan team', 'মধ্যরাত্রি পূজা ও কীর্তন দল', 'मध्यरात्रि पूजा व कीर्तन दल') },
      { id: 'jm-t2', role: 'trustee', text: L('Jhulan decoration & cradle', 'ঝুলন সাজ ও দোলনা', 'झूलन सज्जा व पालना') },
      { id: 'jm-d1', role: 'devotee', text: L('Fast until midnight (if observing)', 'মধ্যরাত্রি পর্যন্ত উপবাস', 'मध्यरात्रि तक उपवास') },
      { id: 'jm-d2', role: 'devotee', text: L('Panchamrita ingredients ready', 'পঞ্চামৃত উপকরণ প্রস্তুত', 'पंचामृत सामग्री तैयार') },
      { id: 'jm-d3', role: 'devotee', text: L('New clothes for Laddu Gopal', 'লাড্ডু গোপালের নতুন বস্ত্র', 'लड्डू गोपाल हेतु नवीन वस्त्र') },
    ],
  },
];

/** Find the checklist template matching a festival name. */
export function checklistFor(festivalNameEn: string): FestivalChecklist | null {
  const n = festivalNameEn.toLowerCase();
  return FESTIVAL_CHECKLISTS.find((c) => n.includes(c.match)) || null;
}
