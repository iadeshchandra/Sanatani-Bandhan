/* Seva Bazar Phase 2 — booking pure logic.
 * =====================================================================
 * No Firestore, no React, no side effects. Everything here is unit
 * tested. The money engine (orders, commission, disputes) lives in
 * the EXISTING marketplace rails — this module only shapes the
 * devotee-facing booking: muhurat slots, dakshina math, validation.
 *
 * Language law: user-facing strings are built by callers (the sheet
 * uses <T en/hi/bn>). This module returns data, never copy.
 */

import { drikTithiAt } from '../lib/drikPanchang';

export type BookingMode = 'home' | 'temple' | 'video';

export type AdvanceRail = 'upi' | 'bkash' | 'nagad' | 'other';

export interface MuhuratSlot {
  /** Stable id: `slot-<yyyy-mm-dd>-morning`. */
  id: string;
  /** ISO date (yyyy-mm-dd) in the devotee's locale. */
  dateISO: string;
  /** Localised day label, e.g. "Tue, 21 Oct". */
  dayLabel: string;
  /** Real tithi prevailing that morning (Drik) — honest Panjika data. */
  tithi: string;
}

/** Shradhā steps — more, never less. Shared idiom with ExpressDanaSheet. */
export const SHRADHA_STEPS = [0, 5, 10, 25] as const;

export interface BookingDraft {
  mode: BookingMode | null;
  slotId: string | null;
  /** Sankalpa name — the only required typed field. */
  name: string;
  /** Gotra is OPTIONAL — a learned law. Never gate on it. */
  gotra: string;
  notes: string;
}

export interface BookingViolation {
  field: 'mode' | 'slot' | 'name';
  message: string;
}

const LOCALES: Record<'en' | 'hi' | 'bn', string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-BD',
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Three sensible muhurat windows: the next three mornings. Morning is the
 * most common puja window; the provider confirms the exact muhurat in
 * chat — we never invent precision we don't have. Each slot carries the
 * REAL tithi prevailing that morning (Drik computation, not a guess).
 */
export function suggestMuhuratSlots(
  now: Date = new Date(),
  lang: 'en' | 'hi' | 'bn' = 'en'
): MuhuratSlot[] {
  const locale = LOCALES[lang] ?? LOCALES.en;
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const slots: MuhuratSlot[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(9, 0, 0, 0);
    const dateISO = toISODate(d);
    const tithi = drikTithiAt(d);
    slots.push({
      id: `slot-${dateISO}-morning`,
      dateISO,
      dayLabel: fmt.format(d),
      tithi: `${tithi.paksha} ${tithi.name}`,
    });
  }
  return slots;
}

/** Dakshina math: base + shradhā extra (rounded), total. */
export function computeBookingTotal(
  dakshina: number,
  shradhaPct: number
): { base: number; extra: number; total: number } {
  const base = Math.max(0, Math.round(dakshina) || 0);
  const extra = Math.round((base * Math.max(0, shradhaPct)) / 100);
  return { base, extra, total: base + extra };
}

/**
 * Token advance: a small hold on the muhurat — 20% of the total,
 * minimum 51 (an auspicious floor), rounded to the nearest 10 so the
 * number stays clean across INR/BDT/USD.
 */
export function suggestTokenAdvance(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const raw = Math.max(51, total * 0.2);
  return Math.round(raw / 10) * 10;
}

/** Validate the booking draft. Gotra is never required. */
export function validateBookingDraft(
  draft: BookingDraft,
  lang: 'en' | 'hi' | 'bn' = 'en'
): BookingViolation[] {
  const out: BookingViolation[] = [];
  const msgs = {
    mode: {
      en: 'How shall the seva reach you — at home, at the temple, or over video?',
      hi: 'सेवा आप तक कैसे पहुँचे — घर पर, मंदिर में, या वीडियो पर?',
      bn: 'সেবা কীভাবে আপনার কাছে পৌঁছাবে — বাড়িতে, মন্দিরে, নাকি ভিডিওতে?',
    },
    slot: {
      en: 'Choose a preferred morning — Panditji will confirm the exact muhurat with you.',
      hi: 'एक पसंदीदा सुबह चुनें — पंडितजी आपसे सही मुहूर्त पक्का करेंगे।',
      bn: 'একটি পছন্দের সকাল বেছে নিন — পণ্ডিতজি আপনার সঙ্গে সঠিক মুহূর্ত ঠিক করবেন।',
    },
    name: {
      en: 'Whose name shall the sankalpa carry?',
      hi: 'संकल्प किसके नाम पर होगा?',
      bn: 'সংকল্প কার নামে হবে?',
    },
  } as const;
  if (!draft.mode) out.push({ field: 'mode', message: msgs.mode[lang] });
  if (!draft.slotId) out.push({ field: 'slot', message: msgs.slot[lang] });
  if (draft.name.trim().length < 2) out.push({ field: 'name', message: msgs.name[lang] });
  return out;
}

/** Advance rail labels (EN/HI/BN) — the WhatsApp-learned rails. */
export function advanceRailLabel(
  rail: AdvanceRail,
  lang: 'en' | 'hi' | 'bn' = 'en'
): string {
  const labels: Record<AdvanceRail, Record<'en' | 'hi' | 'bn', string>> = {
    upi: { en: 'UPI', hi: 'यूपीआई', bn: 'ইউপিআই' },
    bkash: { en: 'bKash', hi: 'बीकैश', bn: 'বিকাশ' },
    nagad: { en: 'Nagad', hi: 'नगद', bn: 'নগদ' },
    other: { en: 'Other', hi: 'अन्य', bn: 'অন্য' },
  };
  return labels[rail][lang];
}

/** Mode labels (EN/HI/BN) — shared idiom with the service card. */
export function bookingModeLabel(
  mode: BookingMode,
  lang: 'en' | 'hi' | 'bn' = 'en'
): string {
  const labels: Record<BookingMode, Record<'en' | 'hi' | 'bn', string>> = {
    home: { en: 'At your home', hi: 'आपके घर पर', bn: 'আপনার বাড়িতে' },
    temple: { en: 'At the temple', hi: 'मंदिर में', bn: 'মন্দিরে' },
    video: { en: 'Video call', hi: 'वीडियो कॉल', bn: 'ভিডিও কল' },
  };
  return labels[mode][lang];
}

/**
 * Order lifecycle for Seva Bazar (rail2), in warm words for the devotee.
 * Maps the marketplace order statuses to what the devotee actually
 * experiences. Pure — the sheet and chat read from here.
 */
export function sevaOrderStage(
  status: string
): 'awaiting_advance' | 'advance_received' | 'accepted' | 'in_seva' | 'complete' | 'unknown' {
  switch (status) {
    case 'pending_payment':
      return 'awaiting_advance';
    case 'paid':
      return 'advance_received';
    case 'accepted':
      return 'accepted';
    case 'in_progress':
      return 'in_seva';
    case 'completed':
    case 'awaiting_commission':
      return 'complete';
    default:
      return 'unknown';
  }
}
