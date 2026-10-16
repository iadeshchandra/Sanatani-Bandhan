/**
 * chatIntelligence.ts — App Intelligence for Chat & P2P Money
 * ============================================================
 * State-based insights for the chat module and personal P2P money
 * requests, following the appIntelligence.ts patterns exactly:
 * pure logic, fail-open generators, trilingual IntelText, severity
 * discipline, stable dedupeKeys, role filtering.
 *
 * This module is PURE: no UI, no Firestore calls. Callers assemble a
 * ChatSnapshot (threads + requests + netting, all optional) and call
 * generateChatInsights(). The returned Insight[] is shaped exactly like
 * appIntelligence insights, so the suchanaFeed.ts contract
 * (fromModuleInsight) consumes it with zero changes.
 *
 * Money semantics (matches p2pLogic.ts):
 *   - request SENDER = the PAYER ("I owe").
 *   - request RECEIVER = the PAYEE ("owed to me").
 *   - Lifecycle: pending → accepted → paid → settled.
 * The app is a coordination layer, NEVER custody — actual transfers
 * happen on the users' own bKash / Nagad / UPI accounts.
 */

import type { Insight, IntelText, InsightSeverity } from './appIntelligence';
import { formatMoney, type MoneyRequest } from '../chat/types';
import { PANJIKA_FESTIVALS } from './panjikaFestivals';

/* ------------------------------------------------------------------ */
/* Snapshot — everything optional, every generator tolerates absence.  */
/* ------------------------------------------------------------------ */

/** Minimal thread shape the generators need (subset of ChatThread). */
export interface ChatThreadLite {
  id: string;
  type?: string;
  lastMessageAt?: number;
}

/** Netting suggestion in the loose shape callers pass in. */
export interface NettingLite {
  id: string;
  text: IntelText;
}

export interface OrgRequestCount {
  orgId: string;
  orgName: string;
  count: number;
}

export interface ChatSnapshot {
  /** Current user's uid — required for direction-aware insights. */
  uid?: string;
  threads?: ChatThreadLite[];
  requests?: MoneyRequest[];
  /** Netting suggestions (computed by the caller via p2pLedger.suggestNetting). */
  netting?: NettingLite[];
  /** Org-sent requests this month, per org. */
  orgRequestCounts?: OrgRequestCount[];
  /** Reference "now" (defaults to real now). ISO date or Date. */
  now?: string | Date;
}

/* ------------------------------------------------------------------ */
/* Small safe helpers (mirroring appIntelligence.ts)                   */
/* ------------------------------------------------------------------ */

const t3 = (en: string, bn: string, hi: string): IntelText => ({ en, bn, hi });

function asArray<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : [];
}

function toDate(v: any): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === 'string') {
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const d = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    if (v && typeof v.toDate === 'function') {
      const d = v.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    return null;
  } catch {
    return null;
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `now` until `target` (negative = past). Null-safe. */
function daysUntil(target: any, now: Date): number | null {
  const d = toDate(target);
  if (!d) return null;
  return Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000
  );
}

/** Whole days elapsed since `ts` (null-safe). */
function daysAgo(ts: any, now: Date): number | null {
  const d = toDate(ts);
  if (!d) return null;
  return Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000
  );
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: any): string {
  return typeof v === 'string' ? v : '';
}

function fmt(amount: number, currency: string): string {
  try {
    return formatMoney(num(amount), str(currency) || 'BDT');
  } catch {
    return String(num(amount));
  }
}

const DAY_MS = 86400000;

/* ------------------------------------------------------------------ */
/* 1. Onboarding — first chat                                         */
/* ------------------------------------------------------------------ */

function firstChatInsights(snap: ChatSnapshot): Insight[] {
  const threads = asArray(snap.threads);
  if (threads.length > 0) return [];
  return [
    {
      id: 'chat-first',
      module: 'chat',
      severity: 'info',
      roles: ['all'],
      title: t3(
        'Say hello to your sangha',
        'আপনার সঙ্ঘকে নমস্কার জানান',
        'अपने संघ को नमस्कार कहें'
      ),
      message: t3(
        'You have no conversations yet. Every chat here is with a Sanatani-ID verified person — start one from any devotee, purohit or jyotishi profile.',
        'এখনো কোনো কথোপকথন নেই। এখানকার প্রতিটি বার্তা যাচাইকৃত সনাতনী পরিচয়ের সঙ্গে — যেকোনো ভক্ত, পুরোহিত বা জ্যোতিষীর প্রোফাইল থেকে শুরু করুন।',
        'अभी कोई बातचीत नहीं है। यहाँ प्रत्येक संवाद सत्यापित सनातनी पहचान के साथ है — किसी भी भक्त, पुरोहित या ज्योतिषी की प्रोफ़ाइल से आरंभ करें।'
      ),
      actionLabel: t3('Open chat', 'চ্যাট খুলুন', 'चैट खोलें'),
      actionRoute: 'chat',
      dedupeKey: 'chat:first',
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 2. Onboarding — first money request explainer                       */
/* ------------------------------------------------------------------ */

function firstRequestInsights(snap: ChatSnapshot): Insight[] {
  const threads = asArray(snap.threads);
  const requests = asArray(snap.requests);
  if (threads.length === 0 || requests.length > 0) return [];
  return [
    {
      id: 'chat-first-request',
      module: 'chat',
      severity: 'info',
      roles: ['all'],
      title: t3(
        'Money travels with trust, not cash in chat',
        'চ্যাটে নগদ নয়, বিশ্বাসে টাকা চলে',
        'चैट में नकद नहीं, विश्वास से धन चलता है'
      ),
      message: t3(
        'You chat, but have never sent a money request. Inside any conversation you can send a request card — the other person accepts, pays on their own bKash/Nagad/UPI, and confirms. This app only keeps the honest record.',
        'আপনি কথা বলেন, কিন্তু কখনো টাকার অনুরোধ পাঠাননি। যেকোনো কথোপকথনে রিকোয়েস্ট কার্ড পাঠাতে পারেন — অপরজন গ্রহণ করে নিজের বিকাশ/নগদ/UPI-তে দেন। এই অ্যাপ শুধু সৎ হিসাব রাখে।',
        'आप बातचीत करते हैं, पर कभी धन-अनुरोध नहीं भेजा। किसी भी संवाद में अनुरोध कार्ड भेज सकते हैं — दूसरा व्यक्ति स्वीकार कर अपने bKash/Nagad/UPI से भुगतान करता है। यह ऐप केवल ईमानदार हिसाब रखता है।'
      ),
      actionLabel: t3('Learn about requests', 'অনুরোধ সম্পর্কে জানুন', 'अनुरोध के बारे में जानें'),
      actionRoute: 'chat',
      dedupeKey: 'chat:first-request',
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 3. Pending request nudges (sent + received)                         */
/* ------------------------------------------------------------------ */

function pendingRequestInsights(snap: ChatSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const uid = str(snap.uid);
  if (!uid) return out;
  const requests = asArray(snap.requests);

  try {
    const stale = requests.filter((r) => {
      if (str(r.status).toLowerCase() !== 'pending') return false;
      const age = daysAgo(r.createdAt, now);
      return age !== null && age >= 2;
    });
    // Oldest first — the longest wait deserves the first word.
    stale.sort((a, b) => num(a.createdAt) - num(b.createdAt));

    for (const r of stale.slice(0, 3)) {
      const age = daysAgo(r.createdAt, now) ?? 2;
      const amount = fmt(r.amount, r.currency);
      const dayWord =
        age === 1
          ? t3('1 day', '১ দিন', '1 दिन')
          : t3(`${age} days`, `${age} দিন`, `${age} दिन`);

      if (r.senderId === uid) {
        // I am the payer: my proposal to pay them is waiting.
        const name = str(r.receiverName) || 'them';
        out.push({
          id: `chat-pending-sent-${r.id}`,
          module: 'chat',
          severity: 'nudge',
          roles: ['all'],
          title: t3(
            'A request still waiting',
            'একটি অনুরোধ এখনো অপেক্ষমাণ',
            'एक अनुरोध अभी प्रतीक्षारत'
          ),
          message: t3(
            `Your request to send ${amount} to ${name} has waited ${dayWord.en}. A gentle nudge in chat — or cancel it if plans changed.`,
            `${name}-কে ${amount} পাঠানোর অনুরোধ ${dayWord.bn} ধরে অপেক্ষায়। চ্যাটে মৃদু স্মরণ দিন — বা পরিকল্পনা বদলালে বাতিল করুন।`,
            `${name} को ${amount} भेजने का अनुरोध ${dayWord.hi} से प्रतीक्षारत है। चैट में मृदु स्मरण दें — या योजना बदली हो तो रद्द करें।`
          ),
          actionLabel: t3('Open conversation', 'কথোপকথন খুলুন', 'बातचीत खोलें'),
          actionRoute: 'chat',
          dedupeKey: `chat:pending-sent:${r.id}`,
        });
      } else if (r.receiverId === uid) {
        // I am the payee: someone asked me, I haven't answered.
        const name = str(r.senderName) || 'Someone';
        out.push({
          id: `chat-pending-received-${r.id}`,
          module: 'chat',
          severity: 'nudge',
          roles: ['all'],
          title: t3(
            'Someone is waiting on your word',
            'কেউ আপনার উত্তরের অপেক্ষায়',
            'कोई आपके उत्तर की प्रतीक्षा में'
          ),
          message: t3(
            `${name} asked you for ${amount} ${dayWord.en} ago${r.note ? ` — "${r.note}"` : ''}. Accept, decline, or counter — a kind reply keeps trust warm.`,
            `${name} ${dayWord.bn} আগে ${amount} চেয়েছেন। গ্রহণ, প্রত্যাখ্যান বা পাল্টা প্রস্তাব — স্নেহের উত্তর বিশ্বাস বাঁচায়।`,
            `${name} ने ${dayWord.hi} पहले ${amount} माँगा था। स्वीकारें, अस्वीकारें या प्रतिप्रस्ताव दें — स्नेहिल उत्तर विश्वास बनाए रखता है।`
          ),
          actionLabel: t3('Review request', 'অনুরোধ দেখুন', 'अनुरोध देखें'),
          actionRoute: 'chat',
          dedupeKey: `chat:pending-received:${r.id}`,
        });
      }
    }
  } catch {
    /* fail-open */
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 4. Settlement reminders                                             */
/* ------------------------------------------------------------------ */

function settlementInsights(snap: ChatSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const uid = str(snap.uid);
  if (!uid) return out;
  const requests = asArray(snap.requests);

  try {
    for (const r of requests) {
      const status = str(r.status).toLowerCase();
      const amount = fmt(r.amount, r.currency);

      // Accepted but not yet marked paid — the agreement is aging.
      if (status === 'accepted') {
        const age = daysAgo(r.updatedAt, now);
        if (age === null || age < 5) continue;
        const dayWord =
          age === 1
            ? t3('1 day', '১ দিন', '1 दिन')
            : t3(`${age} days`, `${age} দিন`, `${age} दिन`);
        if (r.senderId === uid) {
          const name = str(r.receiverName) || 'them';
          out.push({
            id: `chat-settle-owe-${r.id}`,
            module: 'chat',
            severity: 'nudge',
            roles: ['all'],
            title: t3(
              'A promise awaiting fulfilment',
              'প্রতিশ্রুতি পূরণের অপেক্ষায়',
              'प्रतिश्रुति पूर्ति की प्रतीक्षा में'
            ),
            message: t3(
              `You owe ${name} ${amount} — agreed ${dayWord.en} ago. Pay on your own bKash/Nagad/UPI, then mark it paid in the request card.`,
              `আপনি ${name}-কে ${amount} দেবেন — ${dayWord.bn} আগে সম্মত। নিজের বিকাশ/নগদ/UPI-তে দিয়ে কার্ডে "পরিশোধিত" চিহ্নিত করুন।`,
              `आपको ${name} को ${amount} देना है — ${dayWord.hi} पहले सहमति हुई थी। अपने bKash/Nagad/UPI से भुगतान कर कार्ड में "भुगतान" चिह्नित करें।`
            ),
            actionLabel: t3('Open wallet', 'ওয়ালেট খুলুন', 'वॉलेट खोलें'),
            actionRoute: 'wallet',
            dedupeKey: `chat:settle-owe:${r.id}`,
          });
        } else if (r.receiverId === uid) {
          const name = str(r.senderName) || 'Someone';
          out.push({
            id: `chat-settle-wait-${r.id}`,
            module: 'chat',
            severity: 'nudge',
            roles: ['all'],
            title: t3(
              'Still awaiting their payment',
              'তাঁদের পেমেন্টের অপেক্ষায়',
              'उनके भुगतान की प्रतीक्षा में'
            ),
            message: t3(
              `${name} agreed to send you ${amount} ${dayWord.en} ago. A gentle reminder in chat is perfectly fine — trust, not pressure.`,
              `${name} ${dayWord.bn} আগে ${amount} পাঠাতে সম্মত হয়েছিলেন। চ্যাটে মৃদু স্মরণ একদম ঠিক — বিশ্বাস, চাপ নয়।`,
              `${name} ${dayWord.hi} पहले आपको ${amount} भेजने पर सहमत हुए थे। चैट में मृदु स्मरण बिल्कुल उचित है — विश्वास, दबाव नहीं।`
            ),
            actionLabel: t3('Open conversation', 'কথোপকথন খুলুন', 'बातचीत खोलें'),
            actionRoute: 'chat',
            dedupeKey: `chat:settle-wait:${r.id}`,
          });
        }
      }

      // Paid but not yet confirmed — money moved, record incomplete.
      if (status === 'paid') {
        const age = daysAgo(r.paidAt || r.updatedAt, now);
        if (age === null || age < 2) continue;
        if (r.receiverId === uid) {
          const name = str(r.senderName) || 'Someone';
          const via = str(r.paidVia);
          out.push({
            id: `chat-confirm-${r.id}`,
            module: 'chat',
            severity: 'attention',
            roles: ['all'],
            title: t3(
              'Confirm you received it',
              'পেয়েছেন কিনা নিশ্চিত করুন',
              'प्राप्ति की पुष्टि करें'
            ),
            message: t3(
              `${name} marked ${amount} as paid${via ? ` via ${via}` : ''}. If it reached you, confirm received — the record completes only with your word.`,
              `${name} ${amount} পরিশোধিত চিহ্নিত করেছেন। পৌঁছে থাকলে নিশ্চিত করুন — আপনার কথাতেই হিসাব সম্পূর্ণ হয়।`,
              `${name} ने ${amount} भुगतान चिह्नित किया है। पहुँच गया हो तो पुष्टि करें — आपके शब्द से ही हिसाब पूर्ण होता है।`
            ),
            actionLabel: t3('Confirm received', 'প্রাপ্তি নিশ্চিত করুন', 'प्राप्ति सुनिश्चित करें'),
            actionRoute: 'chat',
            dedupeKey: `chat:confirm:${r.id}`,
          });
        } else if (r.senderId === uid) {
          const name = str(r.receiverName) || 'them';
          out.push({
            id: `chat-confirm-wait-${r.id}`,
            module: 'chat',
            severity: 'info',
            roles: ['all'],
            title: t3(
              'Waiting on their confirmation',
              'তাঁদের নিশ্চিতকরণের অপেক্ষায়',
              'उनकी पुष्टि की प्रतीक्षा में'
            ),
            message: t3(
              `You marked ${amount} paid to ${name}; they haven't confirmed yet. The record will complete when they do — no action needed from you.`,
              `আপনি ${name}-কে ${amount} পরিশোধিত চিহ্নিত করেছেন; তাঁরা এখনো নিশ্চিত করেননি। তাঁরা করলেই হিসাব সম্পূর্ণ হবে।`,
              `आपने ${name} को ${amount} भुगतान चिह्नित किया; उन्होंने अभी पुष्टि नहीं की। उनके करते ही हिसाब पूर्ण होगा।`
            ),
            actionLabel: t3('Open conversation', 'কথোপকথন খুলুন', 'बातचीत खोलें'),
            actionRoute: 'chat',
            dedupeKey: `chat:confirm-wait:${r.id}`,
          });
        }
      }

      if (out.length >= 4) break;
    }
  } catch {
    /* fail-open */
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 5. Org request awareness                                            */
/* ------------------------------------------------------------------ */

function orgRequestInsights(snap: ChatSnapshot): Insight[] {
  const out: Insight[] = [];
  try {
    const counts = asArray(snap.orgRequestCounts).filter(
      (o) => num(o.count) >= 2
    );
    for (const o of counts.slice(0, 2)) {
      const name = str(o.orgName) || 'Your temple';
      out.push({
        id: `chat-org-${o.orgId}`,
        module: 'chat',
        severity: 'info',
        roles: ['all'],
        title: t3(
          'Your temple reached out this month',
          'আপনার মন্দির এই মাসে যোগাযোগ করেছে',
          'आपके मंदिर ने इस मास संपर्क किया'
        ),
        message: t3(
          `${name} sent ${o.count} money requests this month. View them together in the org ledger — every one is logged with the trustee's name.`,
          `${name} এই মাসে ${o.count}টি অনুরোধ পাঠিয়েছে। সংস্থার খাতায় একসঙ্গে দেখুন — প্রতিটিতে ট্রাস্টির নাম লেখা থাকে।`,
          `${name} ने इस मास ${o.count} अनुरोध भेजे हैं। संस्था-खाते में एक साथ देखें — प्रत्येक में ट्रस्टी का नाम दर्ज रहता है।`
        ),
        actionLabel: t3('View org requests', 'সংস্থার অনুরোধ দেখুন', 'संस्था के अनुरोध देखें'),
        actionRoute: 'chat',
        dedupeKey: `chat:org:${o.orgId}`,
      });
    }
  } catch {
    /* fail-open */
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Blessing suggestions (festival-aware)                            */
/* ------------------------------------------------------------------ */

function blessingInsights(snap: ChatSnapshot, now: Date): Insight[] {
  try {
    const upcoming = PANJIKA_FESTIVALS.filter((f) => {
      if (f.category !== 'puja' && f.category !== 'festival') return false;
      const du = daysUntil(f.date, now);
      return du !== null && du >= 0 && du <= 7;
    }).sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) return [];

    const cutoff = now.getTime() - 14 * DAY_MS;
    const recent = asArray(snap.threads).filter(
      (t) => num(t.lastMessageAt) >= cutoff
    );
    if (recent.length === 0) return [];

    const f = upcoming[0];
    const du = daysUntil(f.date, now) ?? 0;
    const when =
      du === 0
        ? t3('is today', 'আজ', 'आज है')
        : du === 1
          ? t3('is tomorrow', 'আগামীকাল', 'कल है')
          : t3(`is in ${du} days`, `${du} দিনে`, `${du} दिनों में`);
    const chatWord =
      recent.length === 1
        ? t3('1 recent conversation', '১টি সাম্প্রতিক কথোপকথন', '1 हाल की बातचीत')
        : t3(
            `${recent.length} recent conversations`,
            `${recent.length}টি সাম্প্রতিক কথোপকথন`,
            `${recent.length} हाल की बातचीत`
          );

    return [
      {
        id: `chat-blessing-${f.date}`,
        module: 'chat',
        severity: 'info',
        roles: ['all'],
        title: t3(
          'A festival nears — send a blessing',
          'উৎসব আসছে — আশীর্বাদ পাঠান',
          'उत्सव निकट है — आशीर्वाद भेजें'
        ),
        message: t3(
          `${f.nameEn} ${when.en}, and you have ${chatWord.en}. A blessing card in chat carries more warmth than any forwarded image.`,
          `${f.nameBn} ${when.bn}, আর আপনার ${chatWord.bn} আছে। চ্যাটে আশীর্বাদ-কার্ড যেকোনো ফরোয়ার্ড ছবির চেয়ে উষ্ণ।`,
          `${f.nameHi || f.nameEn} ${when.hi}, और आपकी ${chatWord.hi} हैं। चैट में आशीर्वाद-कार्ड किसी भी अग्रेषित चित्र से अधिक स्नेहिल है।`
        ),
        actionLabel: t3('Send a blessing', 'আশীর্বাদ পাঠান', 'आशीर्वाद भेजें'),
        actionRoute: 'chat',
        dedupeKey: `chat:blessing:${f.date}`,
      },
    ];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* 7. Netting suggestions → feed nudges                                */
/* ------------------------------------------------------------------ */

function nettingInsights(snap: ChatSnapshot): Insight[] {
  const out: Insight[] = [];
  try {
    for (const n of asArray(snap.netting).slice(0, 3)) {
      if (!n || !n.text) continue;
      out.push({
        id: `chat-netting-${n.id}`,
        module: 'chat',
        severity: 'nudge',
        roles: ['all'],
        title: t3(
          'Settle smarter, not harder',
          'বুদ্ধিতে মেটান, কষ্টে নয়',
          'बुद्धि से निपटाएँ, कठिनाई से नहीं'
        ),
        message: { en: n.text.en, bn: n.text.bn, hi: n.text.hi },
        actionLabel: t3('Open wallet', 'ওয়ালেট খুলুন', 'वॉलेट खोलें'),
        actionRoute: 'wallet',
        dedupeKey: `chat:netting:${n.id}`,
      });
    }
  } catch {
    /* fail-open */
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  urgent: 0,
  attention: 1,
  nudge: 2,
  info: 3,
};

type ChatGenerator = (snap: ChatSnapshot, now: Date) => Insight[];

const CHAT_GENERATORS: Array<{ key: string; fn: ChatGenerator }> = [
  { key: 'first-chat', fn: (s) => firstChatInsights(s) },
  { key: 'first-request', fn: (s) => firstRequestInsights(s) },
  { key: 'pending', fn: pendingRequestInsights },
  { key: 'settlement', fn: settlementInsights },
  { key: 'org', fn: (s) => orgRequestInsights(s) },
  { key: 'blessing', fn: blessingInsights },
  { key: 'netting', fn: (s) => nettingInsights(s) },
];

/**
 * Which checks are live vs stubbed. Stubs must never fabricate data.
 */
export const CHAT_GENERATOR_STATUS: Record<
  string,
  { live: string[]; stub: string[] }
> = {
  'first-chat': {
    live: ['no threads → suggest starting a conversation'],
    stub: [],
  },
  'first-request': {
    live: ['threads but no requests → explain request cards'],
    stub: [],
  },
  pending: {
    live: ['sent pending ≥2d → nudge or cancel', 'received pending ≥2d → kind reply'],
    stub: [],
  },
  settlement: {
    live: [
      'accepted ≥5d unpaid → settlement reminder',
      'paid ≥2d unconfirmed → confirm prompt (attention)',
    ],
    stub: [],
  },
  org: {
    live: ['org sent ≥2 requests this month → view together'],
    stub: [],
  },
  blessing: {
    live: ['puja/festival within 7d + recent chats → blessing suggestion'],
    stub: [],
  },
  netting: {
    live: ['p2pLedger netting suggestions → feed nudges'],
    stub: [],
  },
};

/**
 * Run every chat generator, filter to the caller's role, sort by
 * severity, dedupe by dedupeKey, cap at 20. Never throws.
 */
export function generateChatInsights(
  role: string,
  snapshot: ChatSnapshot
): Insight[] {
  try {
    const now = toDate(snapshot.now) || new Date();
    const roleKey = str(role).toLowerCase();
    const all: Insight[] = [];
    for (const g of CHAT_GENERATORS) {
      try {
        all.push(...g.fn(snapshot, now));
      } catch {
        // One bad generator must never kill the feed.
      }
    }
    const filtered = all.filter(
      (i) =>
        i.roles.includes('all' as never) ||
        i.roles.some((r) => str(r).toLowerCase() === roleKey)
    );
    filtered.sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    );
    const seen = new Set<string>();
    const deduped: Insight[] = [];
    for (const i of filtered) {
      if (seen.has(i.dedupeKey)) continue;
      seen.add(i.dedupeKey);
      deduped.push(i);
    }
    return deduped.slice(0, 20);
  } catch {
    return [];
  }
}
