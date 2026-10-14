/**
 * bypassGuard.ts — Anti-bypass detection for the marketplace.
 * ============================================================
 * Scans provider↔client messages for attempts to move payment/contact
 * off-platform (which would dodge the platform commission).
 *
 * PHILOSOPHY: flag for human review, NEVER auto-punish. False positives
 * are expected (e.g. "call me after the puja" is innocent). The owner
 * makes every punitive decision.
 *
 * PRIVACY: when a message is flagged, only the first 50 chars (excerpt)
 * are stored in `bypassFlags` — never the full message content.
 */

export interface BypassScanResult {
  flagged: boolean;
  reasons: string[];
  /** Severity hint for triage: 'low' | 'medium' | 'high' */
  severity: 'low' | 'medium' | 'high';
}

/* ---------------- Built-in patterns (BD/IN specific) ---------------- */

interface BuiltinPattern {
  id: string;
  label: string;
  labelBn: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high';
}

const BUILTIN_PATTERNS: BuiltinPattern[] = [
  // --- Phone numbers ---
  {
    id: 'bd_mobile',
    label: 'Bangladesh mobile number',
    labelBn: 'বাংলাদেশি মোবাইল নম্বর',
    // 01[3-9]XXXXXXXX — with optional +880 / 880 / spaces / dashes
    regex: /(?:\+?880|0)?1[3-9][\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{3}/,
    severity: 'high',
  },
  {
    id: 'in_mobile',
    label: 'Indian mobile number',
    labelBn: 'ভারতীয় মোবাইল নম্বর',
    // +91[6-9]XXXXXXXXX — require +91/91 prefix to avoid matching BD numbers
    regex: /(?:\+?91[\s-])[6-9]\d{4}[\s-]?\d{5}/,
    severity: 'high',
  },
  {
    id: 'bare_digits',
    label: 'Long digit sequence (possible number)',
    labelBn: 'দীর্ঘ সংখ্যা (সম্ভাব্য নম্বর)',
    // 10+ consecutive digits — catches obfuscated numbers like 01701 987 744
    regex: /\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d/,
    severity: 'medium',
  },
  // --- Payment bypass keywords (EN) ---
  {
    id: 'pay_direct_en',
    label: 'Direct payment language',
    labelBn: 'সরাসরি পেমেন্টের ভাষা',
    regex: /\b(pay\s+(me\s+)?directly|direct\s+payment|pay\s+outside|outside\s+(the\s+)?(app|platform|system)|send\s+money\s+(to\s+me|directly)|payment\s+(outside|direct))\b/i,
    severity: 'high',
  },
  {
    id: 'mfs_en',
    label: 'Mobile banking mention',
    labelBn: 'মোবাইল ব্যাংকিং উল্লেখ',
    regex: /\b(bkash|bikas|nagad|nogod|rocket|dbbl|upay|taka\s*(send|pathao|dibo|den)|send\s*money)\b/i,
    severity: 'medium',
  },
  // --- Payment bypass keywords (BN) ---
  {
    id: 'pay_direct_bn',
    label: 'সরাসরি পেমেন্ট (বাংলা)',
    labelBn: 'সরাসরি পেমেন্ট (বাংলা)',
    regex: /(সরাসরি\s*(পেমেন্ট|টাকা|পাঠান)|বাইরে\s*(পেমেন্ট|টাকা)|নিজে\s*(পাঠান|দিন))/,
    severity: 'high',
  },
  {
    id: 'mfs_bn',
    label: 'বিকাশ/নগদ উল্লেখ',
    labelBn: 'বিকাশ/নগদ উল্লেখ',
    regex: /(বিকাশ|নগদ|রকেট|উপায়)/,
    severity: 'medium',
  },
  // --- Contact bypass ---
  {
    id: 'contact_en',
    label: 'Off-platform contact attempt',
    labelBn: 'প্ল্যাটফর্মের বাইরে যোগাযোগের চেষ্টা',
    regex: /\b(whatsapp|whats\s*app|telegram|imo|viber|call\s+me|my\s+number|my\s+phone|contact\s+me\s+(on|at|directly)|add\s+me\s+on)\b/i,
    severity: 'medium',
  },
  {
    id: 'contact_bn',
    label: 'বাইরে যোগাযোগ (বাংলা)',
    labelBn: 'বাইরে যোগাযোগ (বাংলা)',
    regex: /(হোয়াটসঅ্যাপ|হোয়াটস\s*অ্যাপ|টেলিগ্রাম|কল\s*(করুন|দিন|করবেন)|আমার\s*নম্বর|ফোন\s*নম্বর\s*দিন)/,
    severity: 'medium',
  },
  // --- URLs / links ---
  {
    id: 'url',
    label: 'External link',
    labelBn: 'বহিরাগত লিংক',
    regex: /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|bd|in|me|link|pay)\b)/i,
    severity: 'medium',
  },
];

/* ---------------- Custom owner patterns ---------------- */

export interface CustomPattern {
  id?: string;
  pattern: string; // regex source
  label: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
}

function compileCustom(p: CustomPattern): BuiltinPattern | null {
  try {
    return {
      id: `custom_${p.id || 'x'}`,
      label: p.label,
      labelBn: p.label,
      regex: new RegExp(p.pattern, 'i'),
      severity: p.severity,
    };
  } catch {
    return null; // invalid regex — skip silently
  }
}

/* ---------------- Main scan ---------------- */

/**
 * Scan a message for bypass attempts.
 * @param text message text
 * @param customPatterns owner-defined extra patterns (from bypassKeywords collection)
 */
export function scanMessage(
  text: string,
  customPatterns: CustomPattern[] = []
): BypassScanResult {
  const reasons: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' = 'low';
  const rank = { low: 0, medium: 1, high: 2 };

  if (!text || !text.trim()) return { flagged: false, reasons: [], severity: 'low' };

  const all: BuiltinPattern[] = [
    ...BUILTIN_PATTERNS,
    ...customPatterns.filter((p) => p.active !== false).map(compileCustom).filter(Boolean) as BuiltinPattern[],
  ];

  const seen = new Set<string>();
  for (const p of all) {
    // Reset lastIndex for global-safe regexes
    p.regex.lastIndex = 0;
    if (p.regex.test(text)) {
      const key = `${p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        reasons.push(p.label);
        if (rank[p.severity] > rank[maxSeverity]) maxSeverity = p.severity;
      }
    }
  }

  return { flagged: reasons.length > 0, reasons, severity: maxSeverity };
}

/** First 50 chars for the flag record — never store full message content. */
export function messageExcerpt(text: string, maxLen = 50): string {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  return t.length > maxLen ? t.slice(0, maxLen) + '…' : t;
}

/** User-facing warning shown to the sender when flagged. */
export function bypassWarningMessage(locale: 'bn' | 'en' = 'en'): string {
  return locale === 'bn'
    ? '⚠️ সতর্কতা: যোগাযোগের তথ্য বা পেমেন্টের বিবরণ শেয়ার করা মার্কেটপ্লেসের নিয়ম লঙ্ঘন করে। বারবার লঙ্ঘন করলে আপনার অ্যাকাউন্ট স্থগিত হতে পারে। অনুগ্রহ করে প্ল্যাটফর্মের ভিতরেই লেনদেন করুন।'
    : '⚠️ Warning: sharing contact or payment details violates marketplace terms. Repeated violations may suspend your account. Please keep all transactions on the platform.';
}

/* ---------------- Flag creation (sender's client) ---------------- */

import {
  collection as fsCollection,
  addDoc as fsAddDoc,
  getDocs as fsGetDocs,
  query as fsQuery,
  where as fsWhere,
  limit as fsLimit,
  serverTimestamp as fsServerTimestamp,
} from 'firebase/firestore';

/**
 * Create a bypass flag doc. Called by the SENDER's own client right after
 * sending a flagged message. Rules enforce senderUid == auth.uid.
 * Stores excerpt only — never full message content.
 */
export async function createBypassFlag(
  db: any,
  senderUid: string,
  input: {
    orderId?: string;
    chatId?: string;
    messageText: string;
    reasons: string[];
    severity: 'low' | 'medium' | 'high';
    recipientUid?: string;
  }
): Promise<string> {
  const ref = await fsAddDoc(fsCollection(db, 'bypassFlags'), {
    senderUid,
    orderId: input.orderId || '',
    chatId: input.chatId || '',
    recipientUid: input.recipientUid || '',
    excerpt: messageExcerpt(input.messageText),
    reasons: input.reasons.slice(0, 10),
    severity: input.severity,
    status: 'pending',
    createdAt: fsServerTimestamp(),
  });
  return ref.id;
}

/** Fetch owner-defined custom patterns (public read). Cached in-memory for 5 min. */
let _customCache: { at: number; patterns: CustomPattern[] } | null = null;
export async function fetchCustomPatterns(db: any): Promise<CustomPattern[]> {
  if (_customCache && Date.now() - _customCache.at < 5 * 60 * 1000) return _customCache.patterns;
  try {
    const snap = await fsGetDocs(
      fsQuery(fsCollection(db, 'bypassKeywords'), fsWhere('active', '==', true), fsLimit(200))
    );
    const patterns = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CustomPattern));
    _customCache = { at: Date.now(), patterns };
    return patterns;
  } catch {
    return [];
  }
}
