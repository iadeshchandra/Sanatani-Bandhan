/**
 * paymentMethods.ts — geo-based payment method configuration (client).
 *
 * Reads the `paymentMethods` Firestore collection (public read for enabled
 * methods) and merges over hardcoded failover defaults, so the billing UI
 * always renders even when Firestore is unreachable.
 *
 * The owner edits every field from GodMode → Settings → Payment Methods.
 * Hardcoded values below are graceful-degradation fallbacks only.
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { PayRegion } from './geoDetect';

export type PaymentMethodType = 'bangla_qr' | 'mobile' | 'upi' | 'wise' | 'payoneer';

export interface PaymentMethodDoc {
  id: string;
  region: PayRegion;
  type: PaymentMethodType;
  label: string;
  enabled: boolean;
  /** Mobile / merchant number (bKash, Nagad, Rocket, Bangla QR merchant). */
  number?: string;
  merchantName?: string;
  qrImageUrl?: string;
  /** India UPI. */
  upiId?: string;
  /** Wise / Payoneer. */
  accountName?: string;
  accountDetails?: string;
  accountEmail?: string;
  link?: string;
  /** One step per line in Firestore; arrays in code. */
  instructionsEn: string[];
  instructionsBn: string[];
}

const lines = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(String).map((s) => s.trim()).filter(Boolean)
    : typeof v === 'string'
      ? v.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

/** Hardcoded failover — mirrors the GodMode seed. Edit via GodMode, not here. */
export const PAYMENT_METHOD_DEFAULTS: Record<string, PaymentMethodDoc> = {
  bd_banglaqr: {
    id: 'bd_banglaqr',
    region: 'BD',
    type: 'bangla_qr',
    label: 'Bangla QR (TallyPay)',
    enabled: true,
    number: '01701-987744',
    merchantName: 'AR ARTS AND COMPUTER',
    qrImageUrl: '/bangla-qr.png',
    instructionsEn: [
      'Open bKash, Nagad, Rocket or any bank app',
      'Tap "QR Scan"',
      'Scan the QR code above',
      'Enter the amount',
      'Enter your PIN to confirm',
      'Copy the Transaction ID and submit it below',
    ],
    instructionsBn: [
      'bKash, Nagad, Rocket বা যেকোনো ব্যাংক অ্যাপ খুলুন',
      '"QR স্ক্যান" বাটনে ট্যাপ করুন',
      'উপরের QR কোডটি স্ক্যান করুন',
      'টাকার পরিমাণ লিখুন',
      'নিশ্চিত করতে আপনার PIN দিন',
      'Transaction ID কপি করে নিচে সাবমিট করুন',
    ],
  },
  bd_bkash: {
    id: 'bd_bkash',
    region: 'BD',
    type: 'mobile',
    label: 'bKash / Rocket (Personal)',
    enabled: true,
    number: '01608533529',
    instructionsEn: ['Use the "Send Money" option.', 'Copy the Transaction ID and submit it below.'],
    instructionsBn: ['"Send Money" অপশন ব্যবহার করুন।', 'Transaction ID কপি করে নিচে সাবমিট করুন।'],
  },
  bd_nagad: {
    id: 'bd_nagad',
    region: 'BD',
    type: 'mobile',
    label: 'Nagad (Personal)',
    enabled: true,
    number: '01701987744',
    instructionsEn: ['Use the "Send Money" option.', 'Copy the Transaction ID and submit it below.'],
    instructionsBn: ['"Send Money" অপশন ব্যবহার করুন।', 'Transaction ID কপি করে নিচে সাবমিট করুন।'],
  },
  in_upi: {
    id: 'in_upi',
    region: 'IN',
    type: 'upi',
    label: 'UPI',
    enabled: true,
    upiId: 'sanatanibandhan@upi',
    accountName: 'Sanatani Bandhan',
    instructionsEn: [
      'Open any UPI app (GPay, PhonePe, Paytm, BHIM)',
      'Choose "Pay to UPI ID" and enter the UPI ID shown',
      'Enter the amount and your UPI PIN to confirm',
      'Copy the UTR / Transaction ID and submit it below',
    ],
    instructionsBn: [],
  },
  intl_wise: {
    id: 'intl_wise',
    region: 'INTL',
    type: 'wise',
    label: 'Wise',
    enabled: true,
    accountName: 'Adesh Chandra',
    accountDetails: '',
    link: 'https://wise.com/pay/me/adeshc',
    instructionsEn: [
      'Tap the button below to open our Wise payment page',
      'Send the plan amount in USD',
      'Copy the Wise transfer reference / Transaction ID',
      'Paste it in the claim form below and submit',
    ],
    instructionsBn: [],
  },
  intl_payoneer: {
    id: 'intl_payoneer',
    region: 'INTL',
    type: 'payoneer',
    label: 'Payoneer',
    enabled: true,
    accountName: 'Adesh Chandra',
    accountEmail: '',
    link: 'https://www.payoneer.com/',
    instructionsEn: [
      'Tap the button below to open Payoneer',
      'Send the plan amount in USD to our Payoneer account',
      'Copy the Payoneer Transaction ID',
      'Paste it in the claim form below and submit',
    ],
    instructionsBn: [],
  },
};

interface MethodsCache {
  at: number;
  methods: PaymentMethodDoc[];
}
let cache: MethodsCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function mergeOne(id: string, data: Record<string, unknown>): PaymentMethodDoc {
  const d = PAYMENT_METHOD_DEFAULTS[id];
  return {
    id,
    region: (data.region as PayRegion) || d?.region || 'INTL',
    type: (data.type as PaymentMethodType) || d?.type || 'mobile',
    label: typeof data.label === 'string' ? data.label : d?.label || id,
    enabled: data.enabled !== false,
    number: typeof data.number === 'string' ? data.number : d?.number,
    merchantName: typeof data.merchantName === 'string' ? data.merchantName : d?.merchantName,
    qrImageUrl: typeof data.qrImageUrl === 'string' ? data.qrImageUrl : d?.qrImageUrl,
    upiId: typeof data.upiId === 'string' ? data.upiId : d?.upiId,
    accountName: typeof data.accountName === 'string' ? data.accountName : d?.accountName,
    accountDetails: typeof data.accountDetails === 'string' ? data.accountDetails : d?.accountDetails,
    accountEmail: typeof data.accountEmail === 'string' ? data.accountEmail : d?.accountEmail,
    link: typeof data.link === 'string' ? data.link : d?.link,
    instructionsEn: data.instructionsEn !== undefined ? lines(data.instructionsEn) : d?.instructionsEn || [],
    instructionsBn: data.instructionsBn !== undefined ? lines(data.instructionsBn) : d?.instructionsBn || [],
  };
}

/** All payment methods: Firestore merged over defaults. Never throws. */
export async function getPaymentMethods(): Promise<PaymentMethodDoc[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.methods;
  const merged = new Map<string, PaymentMethodDoc>();
  for (const [id, d] of Object.entries(PAYMENT_METHOD_DEFAULTS)) merged.set(id, { ...d });
  try {
    const snap = await getDocs(collection(db, 'paymentMethods'));
    for (const docSnap of snap.docs) {
      merged.set(docSnap.id, mergeOne(docSnap.id, docSnap.data() as Record<string, unknown>));
    }
  } catch (e) {
    console.warn('[paymentMethods] Firestore read failed, using defaults:', e);
  }
  const methods = [...merged.values()];
  cache = { at: Date.now(), methods };
  return methods;
}

/** Enabled methods for one region, in a stable display order. */
export function methodsForRegion(methods: PaymentMethodDoc[], region: PayRegion): PaymentMethodDoc[] {
  const order: Record<string, number> = { bd_banglaqr: 0, bd_bkash: 1, bd_nagad: 2, in_upi: 0, intl_wise: 0, intl_payoneer: 1 };
  return methods
    .filter((m) => m.region === region && m.enabled)
    .sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99));
}

export function clearPaymentMethodsCache(): void {
  cache = null;
}
