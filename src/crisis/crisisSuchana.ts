/**
 * crisisSuchana.ts — calm crisis-related Suchana cards.
 * =======================================================
 * Suchana, not notifications: ONLY positive / reassurance cards are
 * ever produced here — never scare tactics, never fear-mongering.
 * Severities are 'info' and 'nudge' exclusively; crisis content must
 * never surface as 'urgent' or 'attention' from this module.
 *
 * Feed contract: src/lib/suchanaFeed.ts (SuchanaItem). RBAC is
 * enforced before this layer — callers pass only what the viewer
 * may see (e.g. coordinator cards only to coordinators).
 */
import type { SuchanaItem } from '../lib/suchanaFeed';

export interface CrisisSuchanaInput {
  /** Number of emergency contacts the user has saved. */
  contactCount: number;
  /** True when the viewer is an org safety coordinator. */
  isCoordinator: boolean;
  /** Display name for a personal touch (optional, never PII of others). */
  displayName?: string;
}

const BASE: { source: 'module'; roles: string[]; date: null } = {
  source: 'module',
  roles: ['all'],
  date: null,
};

function text3(en: string, bn: string, hi: string) {
  return { en, bn, hi };
}

/**
 * Reassurance card: the safety circle is set up. Shown when the user
 * has at least one emergency contact. Pure comfort — "your sangha
 * holds you".
 */
export function safetyCircleReadyCard(input: CrisisSuchanaInput): SuchanaItem {
  const n = Math.max(1, input.contactCount);
  return {
    ...BASE,
    id: `crisis:contacts-ready`,
    severity: 'info',
    title: text3(
      'Your safety circle is ready 🙏',
      'আপনার নিরাপত্তা বলয় প্রস্তুত 🙏',
      'आपका सुरक्षा चक्र तैयार है 🙏'
    ),
    message: text3(
      `${n} trusted ${n === 1 ? 'contact' : 'contacts'} will hear you if you ever need help. Your sangha holds you — walk in peace.`,
      `প্রয়োজনে ${n} জন বিশ্বস্ত যোগাযোগ আপনার কথা শুনবেন। আপনার সংঘ আপনাকে ধরে রেখেছে — শান্তিতে চলুন।`,
      `आवश्यकता में ${n} विश्वस्त संपर्क आपकी सुनेंगे। आपका संघ आपको थामे है — शांति से चलें।`
    ),
    actionLabel: text3('Review contacts', 'যোগাযোগ দেখুন', 'संपर्क देखें'),
    actionRoute: 'safety',
    dedupeKey: 'crisis:contacts-ready',
  };
}

/**
 * Gentle nudge: fewer than two contacts. Warm encouragement to add
 * one more — framed as peace of mind, never as danger.
 */
export function safetyCircleNudgeCard(): SuchanaItem {
  return {
    ...BASE,
    id: `crisis:contacts-nudge`,
    severity: 'nudge',
    title: text3(
      'Your safety circle has room for one more 🧡',
      'আপনার নিরাপত্তা বলয়ে আরও একজনের জায়গা আছে 🧡',
      'आपके सुरक्षा चक्र में एक और की जगह है 🧡'
    ),
    message: text3(
      'Add a second emergency contact, so someone always answers. It takes a minute — and brings lasting peace.',
      'দ্বিতীয় জরুরি যোগাযোগ যোগ করুন, যাতে কেউ না কেউ উত্তর দেন। এক মিনিট লাগে — আর দেয় স্থায়ী শান্তি।',
      'दूसरा आपातकालीन संपर्क जोड़ें, ताकि कोई न कोई उत्तर दे। एक मिनट लगता है — और मिलती है स्थायी शांति।'
    ),
    actionLabel: text3('Add a contact', 'যোগাযোগ যোগ করুন', 'संपर्क जोड़ें'),
    actionRoute: 'safety',
    dedupeKey: 'crisis:contacts-nudge',
  };
}

/**
 * Coordinator reassurance: quiet gratitude for the safety guardian.
 * Only ever generated for the coordinator themselves (caller filters).
 */
export function coordinatorReadyCard(input: CrisisSuchanaInput): SuchanaItem {
  const name = input.displayName ? `, ${input.displayName}` : '';
  return {
    ...BASE,
    id: `crisis:coordinator-ready`,
    severity: 'info',
    title: text3(
      `You are a safety guardian${name} 🛡️`,
      `আপনি একজন নিরাপত্তা প্রহরী${name} 🛡️`,
      `आप एक सुरक्षा प्रहरी हैं${name} 🛡️`
    ),
    message: text3(
      'Your sangha rests easy knowing you are watching over them. Thank you for this quiet seva.',
      'আপনি পাহারা দিচ্ছেন জেনে আপনার সংঘ নিশ্চিন্তে থাকে। এই নীরব সেবার জন্য ধন্যবাদ।',
      'आप पहरा दे रहे हैं यह जानकर आपका संघ निश्चिंत रहता है। इस मौन सेवा हेतु धन्यवाद।'
    ),
    actionLabel: text3('Open triage view', 'ট্রায়াজ দেখুন', 'छँटाई देखें'),
    actionRoute: 'safety',
    dedupeKey: 'crisis:coordinator-ready',
  };
}

/**
 * Build the complete calm crisis Suchana set for one viewer.
 * Rules:
 *  - contactCount >= 1 → reassurance card (info)
 *  - contactCount < 2  → gentle nudge card (nudge)
 *  - isCoordinator     → guardian gratitude card (info)
 * Never emits urgent/attention. Empty input → empty array (fail-open).
 */
export function buildCrisisSuchana(input: CrisisSuchanaInput): SuchanaItem[] {
  try {
    const cards: SuchanaItem[] = [];
    const count = Number.isFinite(input.contactCount) ? Math.max(0, input.contactCount) : 0;
    if (count >= 1) cards.push(safetyCircleReadyCard({ ...input, contactCount: count }));
    if (count < 2) cards.push(safetyCircleNudgeCard());
    if (input.isCoordinator) cards.push(coordinatorReadyCard(input));
    return cards;
  } catch {
    return [];
  }
}

export default buildCrisisSuchana;
