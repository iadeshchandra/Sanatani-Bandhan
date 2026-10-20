/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — CSV column mapping + field coercion. Pure.        */
/*                                                                     */
/* Office files never use our header names. The synonym table covers   */
/* English, transliterated (Naam, Fon, Jaat), Bengali script and       */
/* Hindi script spellings, so the common mandir-office files map       */
/* themselves; whatever is left is one dropdown per field, and the     */
/* mapping is remembered per target for the next file.                 */
/* ------------------------------------------------------------------ */

import type { BahiTarget } from './types';
import { TARGET_FIELDS } from './types';
import { digitsOnly, normalizeDigits, parseAmount, parseRegisterDate } from './normalize';

/** appField → header spellings (already lowercased). */
export const CSV_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'cow name', 'gai name', 'animal name', 'নাম', 'गाय का नाम'],
  fullName: ['fullname', 'full name', 'name', 'member name', 'donor name', 'naam', 'নাম', 'नाम', 'সদস্যের নাম', 'দাতার নাম'],
  tagId: ['tagid', 'tag id', 'tag', 'tag no', 'tag number', 'ear number', 'ear tag', 'number', 'ট্যাগ', 'टैग', 'কানের নম্বর'],
  breed: ['breed', 'jaat', 'জাত', 'जात', 'জাতি', 'জাতের নাম'],
  sex: ['sex', 'gender', 'ling', 'লিঙ্গ', 'लिंग'],
  ageYears: ['age', 'ageyears', 'age years', 'age (years)', 'বয়স', 'आयु', 'उम्र', 'বয়স (বছর)'],
  arrivalYear: ['arrival year', 'arrivalyear', 'came in year', 'year of arrival', 'year', 'আগমনের বছর', 'আসার বছর', 'आगमन वर्ष'],
  source: ['source', 'how came', 'how she came', 'দান/উদ্ধার', 'কীভাবে এসেছে', 'स्रोत'],
  notes: ['notes', 'note', 'remark', 'remarks', 'মন্তব্য', 'टिप्पणी'],
  phone: ['phone', 'mobile', 'mobile no', 'phone no', 'contact', 'contact no', 'fon', 'ফোন', 'মোবাইল', 'फोन', 'मोबाइल', 'মোবাইল নম্বর', 'फ़ोन नंबर'],
  gotra: ['gotra', 'গোত্র', 'गोत्र', 'গোত্রের নাম'],
  address: ['address', 'village', 'gram', 'গ্রাম', 'गांव', 'ঠিকানা', 'पता', 'village / address'],
  sevaTier: ['sevatier', 'seva tier', 'tier', 'স্তর', 'स्तर'],
  spiritualName: ['spiritualname', 'spiritual name', 'আধ্যাত্মিক নাম', 'आध्यात्मिक नाम'],
  email: ['email', 'e-mail', 'ইমেইল', 'ईमेल'],
  lifetimeDonated: ['lifetimetotal', 'lifetime donated', 'lifetime total', 'total donated', 'totaldonated', 'total', 'মোট দান', 'कुल दान', 'সর্বমোট দান'],
  donationDate: ['donation date', 'date', 'gift date', 'তারিখ', 'तारीख', 'दिनांक', 'দানের তারিখ'],
  donationAmount: ['donation amount', 'amount', 'gift amount', 'taka', 'টাকা', 'राशि', 'দান', 'দানের পরিমাণ', 'रकम'],
  purpose: ['purpose', 'occasion', 'উপলক্ষ', 'उद्देश्य', 'অবলম্বন'],
  paymentMode: ['paymentmode', 'payment mode', 'mode', 'মাধ্যম', 'कैसे दिया'],
  receiptNo: ['receiptno', 'receipt no', 'receipt', 'receipt number', 'রসিদ নং', 'रसीद', 'রসিদ নম্বর', 'रसीद नंबर'],
};

const normHeader = (h: string): string =>
  normalizeDigits(String(h || '')).trim().toLowerCase().replace(/[\s_\-]+/g, '');

const normSyn = (s: string): string => s.replace(/[\s_\-]+/g, '');

/**
 * Guess the mapping for a file's headers.
 * Returns appField → csvHeader (only confident matches). A remembered
 * mapping from a previous file wins over guessing.
 */
export function autoMapHeaders(
  target: BahiTarget,
  headers: string[],
  remembered?: Record<string, string>
): Record<string, string> {
  const fields = TARGET_FIELDS[target].map((f) => f.key);
  const headerByNorm = new Map<string, string>();
  for (const h of headers) {
    const n = normHeader(h);
    if (n && !headerByNorm.has(n)) headerByNorm.set(n, h);
  }
  const used = new Set<string>();
  const out: Record<string, string> = {};

  // Remembered mappings first — the same office sends the same file.
  if (remembered) {
    for (const f of fields) {
      const h = remembered[f];
      if (h && headers.includes(h) && !used.has(h)) { out[f] = h; used.add(h); }
    }
  }
  for (const f of fields) {
    if (out[f]) continue;
    const syns = CSV_SYNONYMS[f] || [f];
    for (const syn of syns) {
      const hit = headerByNorm.get(normSyn(syn)) || headerByNorm.get(normHeader(syn));
      if (hit && !used.has(hit)) { out[f] = hit; used.add(hit); break; }
    }
  }
  return out;
}

/** Apply appField → csvHeader mapping to parsed CSV records, producing
 *  field-keyed string records (values still raw strings). */
export function applyMapping(
  records: Record<string, string>[],
  fieldToHeader: Record<string, string>
): Record<string, string>[] {
  return records.map((rec) => {
    const out: Record<string, string> = {};
    for (const [field, header] of Object.entries(fieldToHeader)) {
      if (header) out[field] = String(rec[header] ?? '').trim();
    }
    return out;
  });
}

/**
 * Coerce field-keyed STRINGS (from the register form or a mapped CSV)
 * into typed mapped values. This is the single funnel where script
 * numerals become ASCII numbers, dates become ISO, and phones become
 * clean digit strings — dedupe and commit only ever see clean values.
 */
export function buildMappedFromFields(
  target: BahiTarget,
  fields: Record<string, string>
): Record<string, any> {
  const get = (k: string) => String(fields[k] ?? '').trim();
  const mapped: Record<string, any> = {};

  if (target === 'herd') {
    mapped.name = get('name');
    mapped.tagId = get('tagId');
    mapped.breed = get('breed');
    mapped.sex = get('sex');
    // Age/arrival stay as raw strings here — dedupe.resolveAgeArrival
    // owns the honesty rules (an arrival year must not become an age).
    mapped.ageYears = get('ageYears');
    mapped.arrivalYear = get('arrivalYear');
    mapped.source = get('source') || 'donated';
    mapped.notes = get('notes');
    return mapped;
  }

  mapped.fullName = get('fullName');
  mapped.phone = digitsOnly(get('phone'));
  mapped.gotra = get('gotra');
  mapped.address = get('address');

  if (target === 'members') {
    mapped.sevaTier = get('sevaTier');
    mapped.spiritualName = get('spiritualName');
    mapped.email = get('email');
    return mapped;
  }

  // donors
  mapped.lifetimeDonated = parseAmount(get('lifetimeDonated')) ?? 0;
  mapped.donationAmount = parseAmount(get('donationAmount')) ?? 0;
  mapped.donationDate = parseRegisterDate(get('donationDate')) || '';
  mapped.purpose = get('purpose');
  mapped.paymentMode = get('paymentMode') || 'Cash';
  mapped.receiptNo = get('receiptNo');
  return mapped;
}

/** Sex/source words as written on paper → enum values (CSV path). */
export function coerceEnumWords(target: BahiTarget, mapped: Record<string, any>): Record<string, any> {
  if (target !== 'herd') return mapped;
  const out = { ...mapped };
  const sex = String(out.sex || '').trim().toLowerCase();
  if (['cow', 'gai', 'গাই', 'गाय', 'female', 'f'].includes(sex)) out.sex = 'cow';
  else if (['bull', 'shar', 'ষাঁড়', 'साँड़', 'male', 'm', 'ox'].includes(sex)) out.sex = 'bull';
  else if (['vatsa', 'calf', 'bachhda', 'বাছুর', 'बछड़ा', 'बछड़ी'].includes(sex)) out.sex = 'vatsa';
  const src = String(out.source || '').trim().toLowerCase();
  if (['rescued', 'rescue', 'উদ্ধার', 'बचाई', 'बचाई गई'].includes(src)) out.source = 'rescued';
  else if (['born', 'born here', 'জন্ম', 'जन्म', 'जन्मी'].includes(src)) out.source = 'born';
  else if (['purchased', 'bought', 'কেনা', 'खरीदी', 'खरीदा'].includes(src)) out.source = 'purchased';
  else if (src) out.source = 'donated';
  return out;
}
