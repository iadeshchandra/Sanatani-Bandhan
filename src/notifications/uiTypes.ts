/**
 * notifications/uiTypes.ts — Phase 2 UI view-model over Phase 1's center.
 * =======================================================================
 * Phase 1 owns the data contract (types.ts: NotifyEvent, NotificationItem,
 * NotificationPrefs, DEFAULT_PREFS). This file is the *presentation* layer:
 * how items become grouped cards, how the header counts are derived, and
 * the display-category mapping for the filter chips.
 *
 * It does not touch Firestore, the network, or the DOM — pure functions +
 * mock data for previews (clearly marked DEV).
 */

import type { NotificationItem, NotifyKind, NotifyPriority, TriText } from './types';
import { categoryFor } from './preferences';

/* ------------------------------------------------------------------ */
/* Display categories (filter chips)                                  */
/* ------------------------------------------------------------------ */

/** The six center filter chips. 'sos' items are critical and always render
 *  in the persistent banner above the chips — they never need a filter. */
export type CenterFilter = 'all' | 'money' | 'chat' | 'suchana' | 'org' | 'blessing';

export type DisplayCategory = Exclude<CenterFilter, 'all'>;

export function displayCategoryFor(kind: NotifyKind): DisplayCategory {
  switch (kind) {
    case 'money_request':
    case 'wallet':
    case 'seva_order':
      return 'money';
    case 'chat':
      return 'chat';
    case 'suchana':
    case 'security':
      return 'suchana';
    case 'org':
      return 'org';
    case 'blessing':
      return 'blessing';
    case 'sos':
      return 'suchana'; // sos is critical — banner shows it; fallback keeps it findable
  }
}

/** Which prefs knob governs this kind — mirrors Phase 1's categoryFor but
 *  on the display side (for "why am I seeing this?" hints). */
export { categoryFor };

export const FILTER_LABELS: Record<CenterFilter, TriText> = {
  all: { en: 'All', bn: 'সব', hi: 'सभी' },
  money: { en: 'Money', bn: 'অর্থ', hi: 'धन' },
  chat: { en: 'Chat', bn: 'বার্তা', hi: 'चैट' },
  suchana: { en: 'Suchana', bn: 'সূচনা', hi: 'सूचना' },
  org: { en: 'Org', bn: 'সংগঠন', hi: 'संगठन' },
  blessing: { en: 'Blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' },
};

/* ------------------------------------------------------------------ */
/* Smart summary                                                      */
/* ------------------------------------------------------------------ */

/** Header math: critical+important unread = "needs your attention";
 *  gentle unread = "in your digest". Silent never surfaces in the header. */
export interface CenterSummary {
  attention: number;
  digest: number;
  critical: number;
}

export function summarizeForHeader(items: NotificationItem[]): CenterSummary {
  const unread = items.filter((n) => !n.read);
  const isAttention = (p: NotifyPriority) => p === 'critical' || p === 'important';
  return {
    critical: unread.filter((n) => n.priority === 'critical').length,
    attention: unread.filter((n) => isAttention(n.priority)).length,
    digest: unread.filter((n) => n.priority === 'gentle').length,
  };
}

/* ------------------------------------------------------------------ */
/* Grouped cards                                                      */
/* ------------------------------------------------------------------ */

export interface CenterGroup {
  key: string;
  category: DisplayCategory;
  /** Highest-severity priority in the group. */
  priority: NotifyPriority;
  title: TriText;
  items: NotificationItem[];
  unreadCount: number;
  latestCreatedAt: number;
}

const PRIORITY_RANK: Record<NotifyPriority, number> = {
  critical: 0,
  important: 1,
  gentle: 2,
  silent: 3,
};

function pluralTitle(count: number, singular: TriText, plural: TriText): TriText {
  return count === 1 ? singular : plural;
}

function moneyGroupTitle(n: number, name?: string): TriText {
  if (name) {
    return {
      en: n === 1 ? `Money request from ${name}` : `${n} money requests from ${name}`,
      bn: n === 1 ? `${name}-এর অর্থ অনুরোধ` : `${name}-এর ${n}টি অর্থ অনুরোধ`,
      hi: n === 1 ? `${name} से धन अनुरोध` : `${name} से ${n} धन अनुरोध`,
    };
  }
  return pluralTitle(
    n,
    { en: 'Money request', bn: 'অর্থ অনুরোধ', hi: 'धन अनुरोध' },
    { en: `${n} money requests`, bn: `${n}টি অর্থ অনুরোধ`, hi: `${n} धन अनुरोध` }
  );
}

function chatGroupTitle(n: number, name?: string): TriText {
  if (name) {
    return {
      en: n === 1 ? `Message from ${name}` : `${n} new messages from ${name}`,
      bn: n === 1 ? `${name}-এর বার্তা` : `${name}-এর ${n}টি নতুন বার্তা`,
      hi: n === 1 ? `${name} का संदेश` : `${name} से ${n} नए संदेश`,
    };
  }
  return pluralTitle(
    n,
    { en: 'New message', bn: 'নতুন বার্তা', hi: 'नया संदेश' },
    { en: `${n} new messages`, bn: `${n}টি নতুন বার্তা`, hi: `${n} नए संदेश` }
  );
}

/** Collapse consecutive items of the same kind+actor into one card.
 *  Phase 1's `groupedCount` is honoured when present (title already says
 *  "3 money requests…" — we keep the count in the card header). */
export function groupCenterItems(items: NotificationItem[]): CenterGroup[] {
  const byKey = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const key = `${item.kind}:${item.actor?.uid ?? 'system'}`;
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }
  const groups: CenterGroup[] = [];
  for (const [key, list] of byKey) {
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    const first = sorted[0];
    const category = displayCategoryFor(first.kind);
    const priority = sorted.reduce<NotifyPriority>(
      (acc, n) => (PRIORITY_RANK[n.priority] < PRIORITY_RANK[acc] ? n.priority : acc),
      'silent'
    );
    const count = sorted.reduce((acc, n) => acc + Math.max(1, n.groupedCount), 0);
    const name = first.actor?.name;
    let title: TriText;
    if (category === 'money') title = moneyGroupTitle(count, name);
    else if (category === 'chat') title = chatGroupTitle(count, name);
    else if (count > 1)
      title = {
        en: `${count} updates`,
        bn: `${count}টি আপডেট`,
        hi: `${count} अपडेट`,
      };
    else title = first.title;
    groups.push({
      key,
      category,
      priority,
      title,
      items: sorted,
      unreadCount: sorted.filter((n) => !n.read).length,
      latestCreatedAt: first.createdAt,
    });
  }
  return groups.sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return p !== 0 ? p : b.latestCreatedAt - a.latestCreatedAt;
  });
}

/* ------------------------------------------------------------------ */
/* Duplicate collapse (QUEUED #43)                                     */
/* ------------------------------------------------------------------ */

/**
 * The logical-notice key: two stored rows sharing it are THE SAME
 * notice that landed twice (a watcher re-fired after a relaunch, a
 * second device with its own ledger rang the same bell, storage was
 * wiped and re-armed an emitter…). The live audit found ~21 stored
 * copies of one "wallet running low" bell; they must render — and
 * count — as one.
 *
 * Primary key: the item's `dedupeKey`, the emit contract's "stable per
 * logical event" id (wallet `lowbalance:<day>`, orders
 * `order:<id>:<status>`, tithi `nudge-tithi-<obs>-d<days>`, insights
 * date-scoped…). This mirrors the center's own grouping intent
 * (findGroupTarget exact-matches dedupeKey) extended past its 30-min
 * unread-only window to the read path, where history lives.
 *
 * Fallback (no dedupeKey — legacy rows): kind + subject (a payload id)
 * + rendered title + civil day of creation.
 *
 * WORLD-READY (Exhibit 5) — FAMILY FOLDS: a few legacy emitters embedded
 * a re-fire epoch (the civil day) in the key for what is ONE continuing
 * condition, so each day's row formed its own group of one and the pile
 * the owner screenshotted survived this collapse. Those families fold
 * to their stable family key below. This is deliberately NOT a blanket
 * day-strip: for tithi buckets, order statuses and aarti slots the
 * day/bucket IS the event's identity (tomorrow's tithi reminder is a
 * different notice from today's), so those keys stay verbatim.
 */
const DEDUPE_FAMILY_FOLDS: ReadonlyArray<readonly [RegExp, string]> = [
  // Seva Wallet low balance: `lowbalance` (current) and the legacy
  // `lowbalance:<day>` rows already stored on users' accounts.
  [/^lowbalance(:.*)?$/, 'lowbalance'],
];

export function collapseKeyFor(item: NotificationItem): string {
  if (item.dedupeKey) {
    for (const [pattern, family] of DEDUPE_FAMILY_FOLDS) {
      if (pattern.test(item.dedupeKey)) return `dk:${family}`;
    }
    return `dk:${item.dedupeKey}`;
  }
  const p = (item.payload ?? {}) as Record<string, unknown>;
  const subject = [p.orderId, p.claimId, p.chatId, p.announcementId, p.requestId].find(
    (v) => typeof v === 'string' && v,
  ) as string | undefined;
  const d = new Date(item.createdAt || 0);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `fb:${item.kind}:${subject ?? ''}:${item.title?.en ?? ''}:${day}`;
}

/**
 * Fold stored duplicates into one representative row per logical
 * notice. The representative is the NEWEST copy; its `groupedCount`
 * becomes the sum across copies (the honest "this rang N times"),
 * and it counts as read ONLY when every copy is read — so the badge
 * derived from the collapsed list equals the unread the devotee
 * actually sees, and a collapsed row can never hide an unread copy.
 * Pure; newest-first order is preserved.
 */
export function collapseDuplicateItems(items: NotificationItem[]): NotificationItem[] {
  const byKey = new Map<string, NotificationItem[]>();
  for (const item of items ?? []) {
    if (!item) continue;
    const key = collapseKeyFor(item);
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }
  const out: NotificationItem[] = [];
  for (const siblings of byKey.values()) {
    if (siblings.length === 1) {
      out.push(siblings[0]);
      continue;
    }
    const sorted = [...siblings].sort((a, b) => b.createdAt - a.createdAt);
    const rep = sorted[0];
    out.push({
      ...rep,
      read: sorted.every((s) => s.read === true),
      acknowledged: sorted.every((s) => s.acknowledged === true),
      groupedCount: sorted.reduce((acc, s) => acc + Math.max(1, s.groupedCount || 1), 0),
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Every raw row id that collapses into the row `itemId` — marking a
 * collapsed row read must mark its folded copies too, or the next
 * snapshot resurrects it as unread.
 */
export function collapseSiblingIds(items: NotificationItem[], itemId: string): string[] {
  const target = (items ?? []).find((i) => i.id === itemId);
  if (!target) return [itemId];
  const key = collapseKeyFor(target);
  return items.filter((i) => collapseKeyFor(i) === key).map((i) => i.id);
}

/* ------------------------------------------------------------------ */
/* Relative time (trilingual)                                         */
/* ------------------------------------------------------------------ */

export function timeAgo(ms: number, now = Date.now()): TriText {
  const diffMin = Math.max(0, Math.round((now - ms) / 60000));
  if (diffMin < 1) return { en: 'Just now', bn: 'এইমাত্র', hi: 'अभी' };
  if (diffMin < 60)
    return { en: `${diffMin}m ago`, bn: `${diffMin} মিনিট আগে`, hi: `${diffMin} मिनट पहले` };
  const h = Math.round(diffMin / 60);
  if (h < 24) return { en: `${h}h ago`, bn: `${h} ঘণ্টা আগে`, hi: `${h} घंटे पहले` };
  const d = Math.round(h / 24);
  if (d < 7) return { en: `${d}d ago`, bn: `${d} দিন আগে`, hi: `${d} दिन पहले` };
  const w = Math.round(d / 7);
  return { en: `${w}w ago`, bn: `${w} সপ্তাহ আগে`, hi: `${w} सप्ताह पहले` };
}

/* ------------------------------------------------------------------ */
/* Digest view-model                                                  */
/* ------------------------------------------------------------------ */

/** One calm item inside the morning/evening Suchana digest. */
export interface DigestItem {
  id: string;
  kind: 'blessing' | 'tithi' | 'settlement' | 'update';
  title: TriText;
  body: TriText;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* DEV-ONLY mock data for screenshots / previews (never shipped)      */
/* ------------------------------------------------------------------ */

const NOW = Date.now();
const MIN = 60_000;

function mockItem(
  over: Partial<NotificationItem> & { id: string; kind: NotifyKind; priority: NotifyPriority }
): NotificationItem {
  return {
    uid: 'preview-user',
    createdAt: NOW - 10 * MIN,
    updatedAt: NOW - 10 * MIN,
    read: false,
    acknowledged: false,
    groupedCount: 1,
    quietHold: false,
    holdUntil: null,
    routes: ['inapp'],
    decision: {
      ping: false,
      inApp: true,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    },
    dedupeKey: `mock:${over.id}`,
    title: { en: 'Update', bn: 'আপডেট', hi: 'अपडेट' },
    body: { en: 'Something happened.', bn: 'কিছু ঘটেছে।', hi: 'कुछ हुआ।' },
    ...over,
  } as NotificationItem;
}

/** Rich mock center: critical SOS, money requests, chat, digest fodder. */
export function mockCenterItems(): NotificationItem[] {
  return [
    mockItem({
      id: 'm1',
      kind: 'sos',
      priority: 'critical',
      actor: { uid: 'u-rahim', name: 'Rahim Uddin' },
      title: { en: 'SOS — Rahim needs help', bn: 'SOS — রহিমের সাহায্য দরকার', hi: 'SOS — रहीम को मदद चाहिए' },
      body: {
        en: 'Emergency alert near Kashi Vishwanath. Tap to open the command view.',
        bn: 'কাশী বিশ্বনাথের কাছে জরুরি সতর্কতা। কমান্ড ভিউ খুলতে ট্যাপ করুন।',
        hi: 'काशी विश्वनाथ के पास आपातकालीन चेतावनी। कमांड व्यू खोलने के लिए टैप करें।',
      },
      createdAt: NOW - 4 * MIN,
      routes: ['inapp', 'push', 'persistent'],
      deepLink: '/app/suchana',
    }),
    mockItem({
      id: 'm2',
      kind: 'money_request',
      priority: 'important',
      actor: { uid: 'u-rahim', name: 'Rahim Uddin' },
      title: { en: 'Money request from Rahim Uddin', bn: 'রহিম উদ্দিনের অর্থ অনুরোধ', hi: 'रहीम उद्दीन से धन अनुरोध' },
      body: {
        en: 'Rahim requested ৳1,500 for "Diwali prasad fund".',
        bn: 'রহিম "দীপাবলি প্রসাদ তহবিল"-এর জন্য ৳1,500 চেয়েছেন।',
        hi: 'रहीम ने "दीवाली प्रसाद फंड" के लिए ৳1,500 माँगे हैं।',
      },
      createdAt: NOW - 12 * MIN,
      payload: { amount: '1500', currency: 'BDT' },
      deepLink: '/app/chat?with=chat-rahim',
    }),
    mockItem({
      id: 'm3',
      kind: 'money_request',
      priority: 'important',
      actor: { uid: 'u-rahim', name: 'Rahim Uddin' },
      title: { en: 'Money request from Rahim Uddin', bn: 'রহিম উদ্দিনের অর্থ অনুরোধ', hi: 'रहीम उद्दीन से धन अनुरोध' },
      body: {
        en: 'Rahim requested ৳800 for "Rickshaw fare — temple visit".',
        bn: 'রহিম "মন্দির দর্শন — রিকশা ভাড়া"-এর জন্য ৳800 চেয়েছেন।',
        hi: 'रहीम ने "मंदिर दर्शन — रिक्शा किराया" के लिए ৳800 माँगे हैं।',
      },
      createdAt: NOW - 26 * MIN,
      deepLink: '/app/chat?with=chat-rahim',
    }),
    mockItem({
      id: 'm4',
      kind: 'money_request',
      priority: 'important',
      actor: { uid: 'u-meera', name: 'Meera Sharma' },
      title: { en: 'Money request from Meera Sharma', bn: 'মীরা শর্মার অর্থ অনুরোধ', hi: 'मीरा शर्मा से धन अनुरोध' },
      body: {
        en: 'Meera requested ₹500 for "Bhajan sandhya flowers".',
        bn: 'মীরা "ভজন সন্ধ্যা ফুল"-এর জন্য ₹500 চেয়েছেন।',
        hi: 'मीरा ने "भजन संध्या फूल" के लिए ₹500 माँगे हैं।',
      },
      createdAt: NOW - 47 * MIN,
      deepLink: '/app/chat?with=chat-meera',
    }),
    mockItem({
      id: 'm5',
      kind: 'chat',
      priority: 'important',
      actor: { uid: 'u-meera', name: 'Meera Sharma' },
      title: { en: 'Message from Meera Sharma', bn: 'মীরা শর্মার বার্তা', hi: 'मीरा शर्मा का संदेश' },
      body: {
        en: '“The prasad list is ready — shall I share it with the group?”',
        bn: '“প্রসাদের তালিকা তৈরি — দলের সাথে শেয়ার করব?”',
        hi: '"प्रसाद की सूची तैयार है — क्या समूह के साथ साझा करूँ?"',
      },
      createdAt: NOW - 63 * MIN,
      deepLink: '/app/chat?with=chat-meera',
    }),
    mockItem({
      id: 'm6',
      kind: 'chat',
      priority: 'important',
      actor: { uid: 'u-meera', name: 'Meera Sharma' },
      title: { en: 'Message from Meera Sharma', bn: 'মীরা শর্মার বার্তা', hi: 'मीरा शर्मा का संदेश' },
      body: {
        en: '“Also, Guruji asked about Sunday’s kirtan timing.”',
        bn: '“এছাড়া, গুরুজি রবিবারের কীর্তনের সময় জানতে চেয়েছেন।”',
        hi: '"गुरुजी ने रविवार के कीर्तन के समय के बारे में पूछा है।"',
      },
      createdAt: NOW - 71 * MIN,
      deepLink: '/app/chat?with=chat-meera',
    }),
    mockItem({
      id: 'm7',
      kind: 'org',
      priority: 'important',
      actor: { uid: 'org-kashi', name: 'Kashi Vishwanath Trust' },
      title: {
        en: 'Diwali planning meeting — tomorrow 6 PM',
        bn: 'দীপাবলি পরিকল্পনা সভা — আগামীকাল সন্ধ্যা ৬টা',
        hi: 'दीवाली योजना बैठक — कल शाम 6 बजे',
      },
      body: {
        en: 'Trustees are requested to join the Diwali war-room at the mandir office.',
        bn: 'ট্রাস্টিদের মন্দির কার্যালয়ে দীপাবলি ওয়ার-রুমে যোগ দিতে অনুরোধ করা হচ্ছে।',
        hi: 'ट्रस्टियों से मंदिर कार्यालय में दीवाली वॉर-रूम में शामिल होने का अनुरोध है।',
      },
      createdAt: NOW - 3 * 60 * MIN,
      deepLink: '/org/org-kashi',
    }),
    mockItem({
      id: 'm8',
      kind: 'suchana',
      priority: 'gentle',
      title: {
        en: 'Ekadashi is day after tomorrow',
        bn: 'একাদশী পরশু',
        hi: 'एकादशी परसों है',
      },
      body: {
        en: 'Parana window 6:12–9:40 AM. Your vrat checklist is ready in Panjika.',
        bn: 'পারণা ৬:১২–৯:৪০। পঞ্জিকায় আপনার ব্রত চেকলিস্ট প্রস্তুত।',
        hi: 'पारणा 6:12–9:40। पंजिका में आपकी व्रत सूची तैयार है।',
      },
      createdAt: NOW - 5 * 60 * MIN,
      decision: {
        ping: false, inApp: true, persistent: false,
        holdUntil: null, holdReason: null, digestCandidate: true, digestWindow: 'morning',
      },
    }),
    mockItem({
      id: 'm9',
      kind: 'wallet',
      priority: 'gentle',
      title: {
        en: 'Settlement confirmed — ৳1,500 received',
        bn: 'নিষ্পত্তি নিশ্চিত — ৳1,500 পাওয়া গেছে',
        hi: 'निपटान पुष्ट — ৳1,500 प्राप्त',
      },
      body: {
        en: 'Meera confirmed receipt. Your personal ledger is now settled.',
        bn: 'মীরা প্রাপ্তি নিশ্চিত করেছেন। আপনার ব্যক্তিগত খতিয়ান এখন নিষ্পত্ত।',
        hi: 'मीरा ने प्राप्ति की पुष्टि की। आपका व्यक्तिगत बहीखाता अब निपट गया।',
      },
      createdAt: NOW - 8 * 60 * MIN,
      read: true,
      deepLink: '/app/home/wallet',
    }),
    mockItem({
      id: 'm10',
      kind: 'blessing',
      priority: 'silent',
      actor: { uid: 'u-guruji', name: 'Guruji' },
      title: {
        en: '🙏 Blessing from Guruji',
        bn: '🙏 গুরুজির আশীর্বাদ',
        hi: '🙏 गुरुजी का आशीर्वाद',
      },
      body: {
        en: '“May your home be filled with light this Diwali. Shubham bhavatu.”',
        bn: '“এই দীপাবলিতে আপনার ঘর আলোয় ভরে উঠুক। শুভম্ ভবতু।”',
        hi: '"इस दीवाली आपका घर प्रकाश से भर जाए। शुभम् भवतु।"',
      },
      createdAt: NOW - 12 * 60 * MIN,
      read: true,
    }),
    mockItem({
      id: 'm11',
      kind: 'suchana',
      priority: 'gentle',
      title: {
        en: 'Kartik month began — Tulsi vivah in 6 days',
        bn: 'কার্তিক মাস শুরু — ৬ দিনে তুলসী বিবাহ',
        hi: 'कार्तिक मास आरंभ — 6 दिन में तुलसी विवाह',
      },
      body: {
        en: 'Your Suchana has the full Kartik checklist from Panjika.',
        bn: 'পঞ্জিকা থেকে সম্পূর্ণ কার্তিক চেকলিস্ট আপনার সূচনায় রয়েছে।',
        hi: 'पंजिका से पूर्ण कार्तिक सूची आपकी सूचना में है।',
      },
      createdAt: NOW - 20 * 60 * MIN,
      read: true,
    }),
  ];
}

/** Gentle items for the digest mock. */
export function mockDigestItems(): DigestItem[] {
  return [
    {
      id: 'd1',
      kind: 'blessing',
      title: { en: '🙏 Blessing from Guruji', bn: '🙏 গুরুজির আশীর্বাদ', hi: '🙏 गुरुजी का आशीर्वाद' },
      body: {
        en: '“May your home be filled with light this Diwali. Shubham bhavatu.”',
        bn: '“এই দীপাবলিতে আপনার ঘর আলোয় ভরে উঠুক। শুভম্ ভবতু।”',
        hi: '"इस दीवाली आपका घर प्रकाश से भर जाए। शुभम् भवतु।"',
      },
      timestamp: new Date(NOW - 40 * MIN).toISOString(),
    },
    {
      id: 'd2',
      kind: 'tithi',
      title: { en: '🌙 Shukla Paksha Trayodashi', bn: '🌙 শুক্লপক্ষ ত্রয়োদশী', hi: '🌙 शुक्ल पक्ष त्रयोदशी' },
      body: {
        en: 'Auspicious for Lakshmi pujan after sunset. Ekadashi is day after tomorrow — parana 6:12–9:40 AM.',
        bn: 'সূর্যাস্তের পর লক্ষ্মী পূজনের জন্য শুভ। একাদশী পরশু — পারণা ৬:১২–৯:৪০।',
        hi: 'सूर्यास्त के बाद लक्ष्मी पूजन हेतु शुभ। एकादशी परसों — पारणा 6:12–9:40।',
      },
      timestamp: new Date(NOW - 90 * MIN).toISOString(),
    },
    {
      id: 'd3',
      kind: 'settlement',
      title: { en: '✓ Settlement confirmed', bn: '✓ নিষ্পত্তি নিশ্চিত', hi: '✓ निपटान पुष्ट' },
      body: {
        en: 'Meera confirmed receipt of ৳1,500. Your personal ledger is settled.',
        bn: 'মীরা ৳1,500 প্রাপ্তি নিশ্চিত করেছেন। আপনার ব্যক্তিগত খতিয়ান নিষ্পত্ত।',
        hi: 'मीरा ने ৳1,500 की प्राप्ति की पुष्टि की। आपका बहीखाता निपट गया।',
      },
      timestamp: new Date(NOW - 8 * 60 * MIN).toISOString(),
    },
    {
      id: 'd4',
      kind: 'update',
      title: { en: 'Kartik month began', bn: 'কার্তিক মাস শুরু', hi: 'कार्तिक मास आरंभ' },
      body: {
        en: 'Tulsi vivah in 6 days. Your full Kartik checklist waits in Panjika.',
        bn: '৬ দিনে তুলসী বিবাহ। সম্পূর্ণ কার্তিক চেকলিস্ট পঞ্জিকায় অপেক্ষা করছে।',
        hi: '6 दिन में तुलसी विवाह। पूर्ण कार्तिक सूची पंजिका में प्रतीक्षा कर रही है।',
      },
      timestamp: new Date(NOW - 20 * 60 * MIN).toISOString(),
    },
  ];
}
