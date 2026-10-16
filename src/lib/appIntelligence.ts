/**
 * appIntelligence.ts — App Intelligence Engine (state-based insights)
 * ====================================================================
 * Complements Panjika Intelligence (time-based, role-aware reminders in
 * panjikaIntelligence.ts). This layer reads each module's DATA and
 * generates calm, actionable insights: overdue pledges, low stock,
 * unconfirmed muhurats, pending approvals — the things a busy trustee
 * or sevadar would miss.
 *
 * Pure logic — no UI, no Firestore calls. Callers assemble a
 * ModuleSnapshot from their data layer and call generateAllInsights().
 *
 * Severity discipline (the system must feel calm, not alarming):
 *   'urgent'    — money / safety / time-critical only
 *   'attention' — needs a decision soon
 *   'nudge'     — gentle, can wait a few days
 *   'info'      — FYI, no action required
 *
 * All generators are fail-open: missing/empty data → no insights, never
 * a crash. Where a data source does not exist yet, the check is listed
 * in GENERATOR_STATUS as a stub with a TODO — we never fake data.
 */

import type {
  DonationRecord,
  TreasuryTransaction,
  InventoryItem,
  DevoteeMember,
  SevadarDutyShift,
  GoshalaCowRecord,
} from '../types';
import type { TopupClaim } from './wallet';
import type { MarketplaceOrder } from './marketplace';
import type { CeremonyPlan } from '../samskara/types';
import type { Festival, Task } from '../utsav/types';
import type { SangamPost, SangamEvent } from '../sangam/types';
import { PANJIKA_FESTIVALS } from './panjikaFestivals';

export interface IntelText {
  en: string;
  bn: string;
  hi: string;
}

export type InsightSeverity = 'info' | 'nudge' | 'attention' | 'urgent';

export type IntelRole =
  | 'owner'
  | 'trustee'
  | 'accountant'
  | 'priest'
  | 'purohit'
  | 'jyotishi'
  | 'sevadar'
  | 'devotee'
  | 'solo';

export interface Insight {
  id: string;
  module: string;
  severity: InsightSeverity;
  /** Roles that should see this. 'all' matches every role. */
  roles: Array<IntelRole | 'all'>;
  title: IntelText;
  message: IntelText;
  actionLabel: IntelText;
  /** Route/tab hint for the future UI layer. */
  actionRoute: string;
  /** Stable key for dedupe across runs and sources. */
  dedupeKey: string;
}

/**
 * Everything the engine needs. Callers pass whatever they have —
 * every field is optional and every generator tolerates absence.
 */
export interface ModuleSnapshot {
  donations?: DonationRecord[];
  treasury?: TreasuryTransaction[];
  inventory?: InventoryItem[];
  devotees?: DevoteeMember[];
  shifts?: SevadarDutyShift[];
  ceremonyPlans?: CeremonyPlan[];
  festivals?: Festival[];
  festivalTasks?: Task[];
  topupClaims?: TopupClaim[];
  marketplaceOrders?: MarketplaceOrder[];
  /** Loose: provider dues ledger (fail-open fields). */
  providerDues?: Array<{
    id?: string;
    providerUid?: string;
    providerName?: string;
    amount?: number;
    dueDateISO?: string;
    status?: string;
  }>;
  /** Loose: bypass-flag queue (fail-open fields). */
  bypassFlags?: Array<{ id?: string; status?: string; createdAt?: any }>;
  sangamPosts?: SangamPost[];
  sangamEvents?: SangamEvent[];
  cows?: GoshalaCowRecord[];
  /** Reference "now" (defaults to real now). ISO date or Date. */
  now?: string | Date;
}

/* ------------------------------------------------------------------ */
/* Small safe helpers                                                  */
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
      // Accept 'yyyy-mm-dd' (local) or full ISO.
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

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: any): string {
  return typeof v === 'string' ? v : '';
}

/** Next occurrence of an MM-DD birthday/anniversary within `withinDays`. */
function upcomingMonthDay(
  monthDay: string | undefined,
  now: Date,
  withinDays: number
): Date | null {
  if (!monthDay) return null;
  const m = monthDay.match(/(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  for (const yearOffset of [0, 1]) {
    const d = new Date(now.getFullYear() + yearOffset, mm - 1, dd);
    if (isNaN(d.getTime()) || d.getMonth() !== mm - 1) continue;
    const diff = Math.round(
      (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000
    );
    if (diff >= 0 && diff <= withinDays) return d;
  }
  return null;
}

function monthDayOf(isoDate: string | undefined): string | null {
  const d = toDate(isoDate);
  if (!d) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function displayName(d: DevoteeMember): string {
  return d.fullName || d.name || d.spiritualName || 'A devotee';
}

/* ------------------------------------------------------------------ */
/* 1. Treasury                                                         */
/* ------------------------------------------------------------------ */

function treasuryInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const donations = asArray(snap.donations);
  const treasury = asArray(snap.treasury);

  // Pledges overdue > 7 days
  try {
    const overdue = donations.filter((d) => {
      const st = str(d.status).toLowerCase();
      if (st !== 'pledged' && st !== 'pending') return false;
      const du = daysUntil(d.date, now);
      return du !== null && du < -7;
    });
    for (const d of overdue.slice(0, 5)) {
      const name = d.donorName || d.devoteeName || 'A donor';
      out.push({
        id: `treasury-pledge-${d.id}`,
        module: 'treasury',
        severity: 'attention',
        roles: ['owner', 'trustee', 'accountant'],
        title: t3('Pledge awaiting fulfilment', 'প্রতিশ্রুতি অপেক্ষমাণ', 'प्रतिश्रुति प्रतीक्षारत'),
        message: t3(
          `${name}'s pledged donation of ${num(d.amount).toLocaleString('en-IN')} is over a week old. A gentle follow-up keeps trust warm.`,
          `${name}-এর প্রতিশ্রুত দান এক সপ্তাহের বেশি পুরনো। মৃদু অনুসরণ আস্থা বজায় রাখে।`,
          `${name} का प्रतिश्रुत दान एक सप्ताह से अधिक पुराना है। मृदु अनुसरण विश्वास बनाए रखता है।`
        ),
        actionLabel: t3('View pledges', 'প্রতিশ্রুতি দেখুন', 'प्रतिश्रुति देखें'),
        actionRoute: 'treasury',
        dedupeKey: `pledge:${d.id}`,
      });
    }
  } catch { /* fail-open */ }

  // Large donation needing acknowledgment (no receipt yet)
  try {
    const big = donations.filter(
      (d) =>
        str(d.status).toLowerCase() === 'completed' &&
        num(d.amount) >= 10000 &&
        !d.receiptNumber
    );
    for (const d of big.slice(0, 3)) {
      const name = d.donorName || d.devoteeName || 'A donor';
      out.push({
        id: `treasury-ack-${d.id}`,
        module: 'treasury',
        severity: 'nudge',
        roles: ['owner', 'trustee', 'accountant'],
        title: t3('Generous dana deserves a receipt', 'উদার দানের প্রাপ্য রসিদ', 'उदार दान हेतु रसीद'),
        message: t3(
          `${name} gave ${num(d.amount).toLocaleString('en-IN')} but no receipt was issued yet. Acknowledgment is part of the dana.`,
          `${name} ${num(d.amount).toLocaleString('en-IN')} দিয়েছেন, কিন্তু রসিদ দেওয়া হয়নি। স্বীকৃতি দানেরই অংশ।`,
          `${name} ने ${num(d.amount).toLocaleString('en-IN')} दिया, पर रसीद जारी नहीं हुई। स्वीकृति दान का ही अंग है।`
        ),
        actionLabel: t3('Issue receipt', 'রসিদ দিন', 'रसीद दें'),
        actionRoute: 'treasury',
        dedupeKey: `ack:${d.id}`,
      });
    }
  } catch { /* fail-open */ }

  // Balance below one month of average expenses
  try {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);
    const recent = treasury.filter((t) => {
      const d = toDate(t.date);
      return d !== null && d >= startOfDay(cutoff);
    });
    const expenses = recent
      .filter((t) => str(t.type).toLowerCase() === 'expense')
      .reduce((s, t) => s + num(t.amount), 0);
    const monthlyAvg = expenses / 3;
    const balance = treasury.reduce(
      (s, t) =>
        s + (str(t.type).toLowerCase() === 'income' ? num(t.amount) : -num(t.amount)),
      0
    );
    if (monthlyAvg > 0 && balance < monthlyAvg) {
      out.push({
        id: 'treasury-low-balance',
        module: 'treasury',
        severity: 'urgent',
        roles: ['owner', 'trustee'],
        title: t3('Treasury below one month\'s expenses', 'কোষাগার এক মাসের খরচের নিচে', 'कोषागार एक मास के व्यय से नीचे'),
        message: t3(
          `Balance ${Math.round(balance).toLocaleString('en-IN')} is below the 3-month average monthly expense of ${Math.round(monthlyAvg).toLocaleString('en-IN')}. Worth a calm review.`,
          `ব্যালেন্স ${Math.round(balance).toLocaleString('en-IN')} — গড় মাসিক খরচ ${Math.round(monthlyAvg).toLocaleString('en-IN')}-এর নিচে। শান্ত পর্যালোচনা দরকার।`,
          `शेष ${Math.round(balance).toLocaleString('en-IN')} — औसत मासिक व्यय ${Math.round(monthlyAvg).toLocaleString('en-IN')} से नीचे। शांत समीक्षा उचित।`
        ),
        actionLabel: t3('Open treasury', 'কোষাগার খুলুন', 'कोषागार खोलें'),
        actionRoute: 'treasury',
        dedupeKey: 'treasury:low-balance',
      });
    }
  } catch { /* fail-open */ }

  // TODO(stub): hundi not counted in >5 days — no hundi-count record shape exists yet.
  // Needs: hundiCollections[] with { id, counterName, countedAt, status }.
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. Inventory (Bhandar)                                              */
/* ------------------------------------------------------------------ */

function inventoryInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const items = asArray(snap.inventory);

  // Below reorder level
  try {
    const low = items.filter(
      (i) => num(i.currentStock) <= num(i.minReorderLevel)
    );
    for (const i of low.slice(0, 5)) {
      out.push({
        id: `inventory-low-${i.id}`,
        module: 'inventory',
        severity: 'nudge',
        roles: ['owner', 'trustee'],
        title: t3('Bhandar running low', 'ভাণ্ডারে কমতি', 'भण्डार में कमी'),
        message: t3(
          `${i.itemName}: ${num(i.currentStock)} ${str(i.unit)} left (reorder at ${num(i.minReorderLevel)}). Supplier: ${i.supplierName || '—'}.`,
          `${i.itemName}: ${num(i.currentStock)} ${str(i.unit)} বাকি (পুনঃক্রয় ${num(i.minReorderLevel)})।`,
          `${i.itemName}: ${num(i.currentStock)} ${str(i.unit)} शेष (पुनः-क्रय ${num(i.minReorderLevel)})।`
        ),
        actionLabel: t3('Restock', 'মজুত করুন', 'भंडार करें'),
        actionRoute: 'inventory',
        dedupeKey: `inv-low:${i.id}`,
      });
    }

    // Festival-linked: major utsava within 14 days + any low stock
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 14);
    const upcoming = PANJIKA_FESTIVALS.filter((f) => {
      const d = toDate(f.date);
      return (
        d !== null &&
        d >= startOfDay(now) &&
        d <= startOfDay(horizon) &&
        (f.category === 'puja' || f.category === 'festival')
      );
    });
    if (upcoming.length > 0 && low.length > 0) {
      const f = upcoming[0];
      out.push({
        id: `inventory-festival-${f.date}`,
        module: 'inventory',
        severity: 'attention',
        roles: ['owner', 'trustee'],
        title: t3('Utsava approaching — check samagri', 'উৎসব আসছে — সামগ্রী দেখুন', 'उत्सव निकट — सामग्री देखें'),
        message: t3(
          `${f.nameEn} is on ${f.date}, and ${low.length} bhandar item(s) are below reorder level. Stock the essentials before the rush.`,
          `${f.date}-এ ${f.nameBn}, অথচ ${low.length}টি পণ্য পুনঃক্রয়-সীমার নিচে। ভিড়ের আগেই মজুত করুন।`,
          `${f.date} को ${f.nameEn}, और ${low.length} वस्तुएँ पुनः-क्रय स्तर से नीचे। भीड़ से पहले भंडार करें।`
        ),
        actionLabel: t3('Review bhandar', 'ভাণ্ডার দেখুন', 'भण्डार देखें'),
        actionRoute: 'inventory',
        dedupeKey: `inv-festival:${f.date}`,
      });
    }
  } catch { /* fail-open */ }

  // TODO(stub): perishables expiring within 7 days — InventoryItem has no
  // expiryDate field yet. Needs: expiryDate?: string on InventoryItem.
  return out;
}

/* ------------------------------------------------------------------ */
/* 3. HR / Sevadars                                                    */
/* ------------------------------------------------------------------ */

const STAFF_ROLES = new Set([
  'staff',
  'sevadar',
  'priest',
  'accountant',
  'trustee',
  'manager',
  'superadmin',
]);

function hrInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const devotees = asArray(snap.devotees);

  // Staff/sevadar birthdays this week — a small kindness, remembered
  try {
    const staff = devotees.filter((d) =>
      STAFF_ROLES.has(str(d.role).toLowerCase())
    );
    const upcoming = staff.filter((d) =>
      upcomingMonthDay(monthDayOf(d.birthDate), now, 7)
    );
    for (const d of upcoming.slice(0, 5)) {
      const md = monthDayOf(d.birthDate);
      out.push({
        id: `hr-bday-${d.id}`,
        module: 'hr',
        severity: 'info',
        roles: ['owner', 'trustee'],
        title: t3('A sevadar\'s birthday nears', 'সেবাদারের জন্মদিন আসছে', 'सेवादार का जन्मदिन निकट'),
        message: t3(
          `${displayName(d)}'s birthday is on ${md}. A blessing from the trust means the world to those who serve.`,
          `${displayName(d)}-এর জন্মদিন ${md}। সেবাদানকারীর কাছে ট্রাস্টের আশীর্বাদ অমূল্য।`,
          `${displayName(d)} का जन्मदिन ${md} को है। सेवा करने वालों हेतु ट्रस्ट का आशीर्वाद अनमोल है।`
        ),
        actionLabel: t3('View member', 'সদস্য দেখুন', 'सदस्य देखें'),
        actionRoute: 'devotees',
        dedupeKey: `hr-bday:${d.id}:${md}`,
      });
    }
  } catch { /* fail-open */ }

  // TODO(stub): salaries pending past month-end — no salary/payroll record
  // shape exists yet. Needs: staffSalaries[] with { staffId, month, dueDate, status }.
  // TODO(stub): festival volunteer roster <80% filled — no "required headcount"
  // per shift exists. Needs: requiredSevadars?: number on SevadarDutyShift
  // or a roster plan per event.
  return out;
}

/* ------------------------------------------------------------------ */
/* 4. Devotees                                                         */
/* ------------------------------------------------------------------ */

function devoteeInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const devotees = asArray(snap.devotees);

  try {
    // Birthdays in next 7 days
    const bdays = devotees.filter(
      (d) =>
        str(d.activeStatus).toLowerCase() !== 'inactive' &&
        upcomingMonthDay(monthDayOf(d.birthDate), now, 7)
    );
    for (const d of bdays.slice(0, 5)) {
      out.push({
        id: `dev-bday-${d.id}`,
        module: 'devotees',
        severity: 'info',
        roles: ['owner', 'trustee', 'sevadar'],
        title: t3('Birthday blessing due', 'জন্মদিনের আশীর্বাদ', 'जन्मदिन का आशीर्वाद'),
        message: t3(
          `${displayName(d)}'s birthday is on ${monthDayOf(d.birthDate)}. A warm wish keeps the parivar close.`,
          `${displayName(d)}-এর জন্মদিন ${monthDayOf(d.birthDate)}। উষ্ণ শুভেচ্ছা পরিবারকে কাছে রাখে।`,
          `${displayName(d)} का जन्मदिन ${monthDayOf(d.birthDate)} को है। स्नेहिल शुभकामना परिवार को जोड़े रखती है।`
        ),
        actionLabel: t3('Send blessings', 'আশীর্বাদ পাঠান', 'आशीर्वाद भेजें'),
        actionRoute: 'devotees',
        dedupeKey: `dev-bday:${d.id}`,
      });
    }

    // Anniversaries in next 7 days
    const annivs = devotees.filter(
      (d) =>
        str(d.activeStatus).toLowerCase() !== 'inactive' &&
        upcomingMonthDay(monthDayOf(d.anniversaryDate), now, 7)
    );
    for (const d of annivs.slice(0, 5)) {
      out.push({
        id: `dev-anniv-${d.id}`,
        module: 'devotees',
        severity: 'info',
        roles: ['owner', 'trustee', 'sevadar'],
        title: t3('Anniversary approaching', 'বার্ষিকী আসছে', 'वर्षगाँठ निकट'),
        message: t3(
          `${displayName(d)}'s anniversary is on ${monthDayOf(d.anniversaryDate)}.`,
          `${displayName(d)}-এর বার্ষিকী ${monthDayOf(d.anniversaryDate)}।`,
          `${displayName(d)} की वर्षगाँठ ${monthDayOf(d.anniversaryDate)} को है।`
        ),
        actionLabel: t3('Send blessings', 'আশীর্বাদ পাঠান', 'आशीर्वाद भेजें'),
        actionRoute: 'devotees',
        dedupeKey: `dev-anniv:${d.id}`,
      });
    }

    // New members joined in last 7 days — welcome pending
    const fresh = devotees.filter((d) => {
      const du = daysUntil(d.joinedDate, now);
      return du !== null && du <= 0 && du >= -7;
    });
    for (const d of fresh.slice(0, 5)) {
      out.push({
        id: `dev-welcome-${d.id}`,
        module: 'devotees',
        severity: 'nudge',
        roles: ['owner', 'trustee', 'sevadar'],
        title: t3('Welcome a new parivar member', 'নতুন সদস্যকে বরণ করুন', 'नए सदस्य का स्वागत करें'),
        message: t3(
          `${displayName(d)} joined recently. A personal welcome makes them feel at home from day one.`,
          `${displayName(d)} সম্প্রতি যোগ দিয়েছেন। ব্যক্তিগত বরণ তাঁকে ঘরের মতো লাগাবে।`,
          `${displayName(d)} हाल ही में जुड़े हैं। व्यक्तिगत स्वागत उन्हें घर जैसा अनुभव देगा।`
        ),
        actionLabel: t3('Welcome', 'বরণ করুন', 'स्वागत करें'),
        actionRoute: 'devotees',
        dedupeKey: `dev-welcome:${d.id}`,
      });
    }
  } catch { /* fail-open */ }

  // TODO(stub): members inactive 90+ days — DevoteeMember has no last-active
  // timestamp. Needs: lastActiveAt?: string on DevoteeMember.
  return out;
}

/* ------------------------------------------------------------------ */
/* 5. Seva Marketplace                                                 */
/* ------------------------------------------------------------------ */

function marketplaceInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const orders = asArray(snap.marketplaceOrders);
  const dues = asArray(snap.providerDues);
  const flags = asArray(snap.bypassFlags);

  try {
    // Disputes awaiting owner resolution — money held, both sides waiting
    const disputes = orders.filter(
      (o) => str(o.status).toLowerCase() === 'disputed'
    );
    for (const o of disputes.slice(0, 5)) {
      out.push({
        id: `mkt-dispute-${o.id}`,
        module: 'marketplace',
        severity: 'urgent',
        roles: ['owner'],
        title: t3('Dispute needs your judgment', 'বিরোধে আপনার বিচার দরকার', 'विवाद में आपका निर्णय चाहिए'),
        message: t3(
          `Seva "${o.gigTitle || 'booking'}" (${o.id}) is disputed — ${o.currency || ''} ${num(o.amountGross).toLocaleString('en-IN')} held. Both sides await a fair decision.`,
          `"${o.gigTitle || 'বুকিং'}" (${o.id}) বিরোধপূর্ণ — অর্থ আটকে আছে। উভয় পক্ষ ন্যায্য সিদ্ধান্তের অপেক্ষায়।`,
          `"${o.gigTitle || 'बुकिंग'}" (${o.id}) विवादित — राशि अटकी है। दोनों पक्ष निष्पक्ष निर्णय की प्रतीक्षा में हैं।`
        ),
        actionLabel: t3('Resolve dispute', 'বিরোধ মেটান', 'विवाद सुलझाएँ'),
        actionRoute: 'marketplace',
        dedupeKey: `mkt-dispute:${o.id}`,
      });
    }

    // Payouts pending > 3 days (fail-open on optional fields)
    const stalePayouts = orders.filter((o) => {
      if (str(o.status).toLowerCase() !== 'completed') return false;
      const r = o as unknown as Record<string, any>;
      if (r.payoutTxId || r.payoutCompletedAt) return false;
      const reqAt = r.payoutRequestedAt || o.createdAt;
      const du = daysUntil(reqAt, now);
      return du !== null && du < -3;
    });
    for (const o of stalePayouts.slice(0, 5)) {
      out.push({
        id: `mkt-payout-${o.id}`,
        module: 'marketplace',
        severity: 'attention',
        roles: ['owner'],
        title: t3('Provider payout waiting', 'প্রদানকারীর পাওনা অপেক্ষমাণ', 'प्रदाता का भुगतान प्रतीक्षारत'),
        message: t3(
          `Order ${o.id} completed over 3 days ago; the provider's dakshina settlement of ${o.currency || ''} ${num(o.providerNet).toLocaleString('en-IN')} is still pending.`,
          `অর্ডার ${o.id} ৩ দিনের বেশি আগে সম্পূর্ণ; প্রদানকারীর নিষ্পত্তি এখনো বাকি।`,
          `ऑर्डर ${o.id} 3 दिन से अधिक पहले पूर्ण; प्रदाता का निपटान अभी शेष है।`
        ),
        actionLabel: t3('Review payouts', 'পাওনা দেখুন', 'भुगतान देखें'),
        actionRoute: 'marketplace',
        dedupeKey: `mkt-payout:${o.id}`,
      });
    }

    // Overdue provider dues
    const overdue = dues.filter((d) => {
      if (str(d.status).toLowerCase() === 'settled') return false;
      const du = daysUntil(d.dueDateISO, now);
      return du !== null && du < 0;
    });
    for (const d of overdue.slice(0, 5)) {
      out.push({
        id: `mkt-due-${d.id || d.providerUid}`,
        module: 'marketplace',
        severity: 'attention',
        roles: ['owner'],
        title: t3('Seva contribution overdue', 'সেবা-অবদান বকেয়া', 'सेवा-योगदान बकाया'),
        message: t3(
          `${d.providerName || 'A provider'} owes ${num(d.amount).toLocaleString('en-IN')} (due ${d.dueDateISO || '—'}). Dues may auto-deduct from future Rail-1 payouts.`,
          `${d.providerName || 'একজন প্রদানকারী'}-এর ${num(d.amount).toLocaleString('en-IN')} বকেয়া।`,
          `${d.providerName || 'एक प्रदाता'} का ${num(d.amount).toLocaleString('en-IN')} बकाया है।`
        ),
        actionLabel: t3('Open dues', 'বকেয়া দেখুন', 'बकाया देखें'),
        actionRoute: 'marketplace',
        dedupeKey: `mkt-due:${d.id || d.providerUid}`,
      });
    }

    // Unreviewed bypass flags
    const pending = flags.filter(
      (f) => str(f.status).toLowerCase() === 'pending'
    );
    if (pending.length > 0) {
      out.push({
        id: 'mkt-bypass-queue',
        module: 'marketplace',
        severity: 'attention',
        roles: ['owner'],
        title: t3('Bypass flags awaiting review', 'বাইপাস সতর্কতা অপেক্ষমাণ', 'बायपास चेतावनी प्रतीक्षारत'),
        message: t3(
          `${pending.length} flagged message(s) need review. Flagging is a signal, never a punishment — review with a calm eye.`,
          `${pending.length}টি সতর্ক বার্তা পর্যালোচনার অপেক্ষায়।`,
          `${pending.length} चेतावनी संदेश समीक्षा हेतु प्रतीक्षारत हैं।`
        ),
        actionLabel: t3('Review flags', 'পর্যালোচনা করুন', 'समीक्षा करें'),
        actionRoute: 'marketplace',
        dedupeKey: 'mkt:bypass-queue',
      });
    }
  } catch { /* fail-open */ }

  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Seva Wallet                                                      */
/* ------------------------------------------------------------------ */

function walletInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const claims = asArray(snap.topupClaims);

  try {
    // Top-up claims pending > 24h — someone's money is waiting
    const stale = claims.filter((c) => {
      if (str(c.status).toLowerCase() !== 'pending') return false;
      const created = toDate(c.createdAt);
      if (!created) return false;
      return now.getTime() - created.getTime() > 24 * 3600 * 1000;
    });
    for (const c of stale.slice(0, 5)) {
      out.push({
        id: `wallet-claim-${c.id}`,
        module: 'wallet',
        severity: 'attention',
        roles: ['owner'],
        title: t3('Top-up claim waiting too long', 'টপ-আপ দাবি দীর্ঘ অপেক্ষায়', 'टॉप-अप दावा दीर्घ प्रतीक्षा में'),
        message: t3(
          `A top-up of ${num(c.amount).toLocaleString('en-IN')} ${c.currency || ''} (TrxID ${c.trxId || '—'}) has waited over 24 hours. Verify and credit — trust is built on speed here.`,
          `${num(c.amount).toLocaleString('en-IN')} ${c.currency || ''} টপ-আপ ২৪ ঘণ্টার বেশি অপেক্ষায়। যাচাই করে জমা দিন।`,
          `${num(c.amount).toLocaleString('en-IN')} ${c.currency || ''} टॉप-अप 24 घंटे से अधिक प्रतीक्षारत। सत्यापित कर जमा करें।`
        ),
        actionLabel: t3('Review claims', 'দাবি দেখুন', 'दावे देखें'),
        actionRoute: 'wallet',
        dedupeKey: `wallet-claim:${c.id}`,
      });
    }

    // Recently rejected claims — follow up with the devotee
    const rejected = claims.filter((c) => {
      if (str(c.status).toLowerCase() !== 'rejected') return false;
      const du = daysUntil(c.reviewedAt || c.createdAt, now);
      return du !== null && du <= 0 && du >= -7;
    });
    if (rejected.length > 0) {
      out.push({
        id: 'wallet-rejected-week',
        module: 'wallet',
        severity: 'info',
        roles: ['owner'],
        title: t3('Rejected top-ups this week', 'এই সপ্তাহে বাতিল টপ-আপ', 'इस सप्ताह अस्वीकृत टॉप-अप'),
        message: t3(
          `${rejected.length} top-up claim(s) were rejected this week. A kind note explaining why keeps the door open.`,
          `এই সপ্তাহে ${rejected.length}টি টপ-আপ বাতিল হয়েছে। স্নেহভরে কারণ জানালে সম্পর্ক থাকে।`,
          `इस सप्ताह ${rejected.length} टॉप-अप अस्वीकृत हुए। स्नेह से कारण बताने पर संबंध बना रहता है।`
        ),
        actionLabel: t3('Follow up', 'যোগাযোগ করুন', 'संपर्क करें'),
        actionRoute: 'wallet',
        dedupeKey: 'wallet:rejected-week',
      });
    }
  } catch { /* fail-open */ }

  return out;
}

/* ------------------------------------------------------------------ */
/* 7. Samskara                                                         */
/* ------------------------------------------------------------------ */

function samskaraInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const plans = asArray(snap.ceremonyPlans);

  try {
    for (const p of plans) {
      const du = daysUntil(p.targetDate, now);
      if (du === null || du < 0 || du > 14) continue;

      // Ceremony within 14 days without confirmed muhurat
      if (!str(p.muhuratNote).trim()) {
        out.push({
          id: `samskara-muhurat-${p.id}`,
          module: 'samskara',
          severity: du <= 7 ? 'attention' : 'nudge',
          roles: ['devotee', 'trustee', 'priest', 'solo', 'all'],
          title: t3('Ceremony needs a shubh muhurat', 'অনুষ্ঠানে শুভ মুহূর্ত দরকার', 'समारोह हेतु शुभ मुहूर्त चाहिए'),
          message: t3(
            `A samskara is planned in ${du} day(s) (${p.targetDate}) with no muhurat confirmed yet. The Panjika can find a shubh window.`,
            `${du} দিনে (${p.targetDate}) সংস্কার, কিন্তু মুহূর্ত নিশ্চিত হয়নি। পঞ্জিকা শুভ সময় খুঁজে দেবে।`,
            `${du} दिन में (${p.targetDate}) संस्कार है, पर मुहूर्त निश्चित नहीं। पञ्जिका शुभ समय खोज देगी।`
          ),
          actionLabel: t3('Find muhurat', 'মুহূর্ত খুঁজুন', 'मुहूर्त खोजें'),
          actionRoute: 'panjika',
          dedupeKey: `samskara-muhurat:${p.id}`,
        });
      }

      // Ceremony within 7 days without assigned purohit
      if (du <= 7 && !str(p.purohitName).trim()) {
        out.push({
          id: `samskara-purohit-${p.id}`,
          module: 'samskara',
          severity: 'attention',
          roles: ['devotee', 'trustee', 'priest', 'solo', 'all'],
          title: t3('No purohit assigned yet', 'পুরোহিত এখনো ঠিক হয়নি', 'पुरोहित अभी तय नहीं'),
          message: t3(
            `The samskara on ${p.targetDate} is ${du} day(s) away with no purohit assigned. Invite one from the Seva Marketplace in time.`,
            `${p.targetDate}-এর সংস্কার ${du} দিন দূরে, পুরোহিত ঠিক হয়নি। সময় থাকতে আমন্ত্রণ জানান।`,
            `${p.targetDate} का संस्कार ${du} दिन दूर है, पुरोहित तय नहीं। समय रहते आमंत्रित करें।`
          ),
          actionLabel: t3('Invite purohit', 'পুরোহিত ডাকুন', 'पुरोहित बुलाएँ'),
          actionRoute: 'marketplace',
          dedupeKey: `samskara-purohit:${p.id}`,
        });
      }
    }
  } catch { /* fail-open */ }

  return out;
}

/* ------------------------------------------------------------------ */
/* 8. Utsav / Events                                                   */
/* ------------------------------------------------------------------ */

function utsavInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const festivals = asArray(snap.festivals);
  const tasks = asArray(snap.festivalTasks);

  try {
    for (const f of festivals) {
      if (str(f.status).toLowerCase() !== 'planned') continue;
      const du = daysUntil(f.startDate, now);
      if (du === null || du < 0 || du > 14) continue;

      const mine = tasks.filter((t) => t.festivalId === f.id);
      const done = mine.filter(
        (t) => str(t.status).toLowerCase() === 'done' || str(t.status).toLowerCase() === 'completed'
      );
      const pct = mine.length === 0 ? 0 : done.length / mine.length;

      if (du <= 14 && pct < 0.5) {
        const urgentNow = du <= 3 && pct < 0.5;
        out.push({
          id: `utsav-prep-${f.id}`,
          module: 'events',
          severity: urgentNow ? 'urgent' : 'attention',
          roles: ['owner', 'trustee', 'sevadar'],
          title: t3('Utsava preparation behind', 'উৎসব-প্রস্তুতি পিছিয়ে', 'उत्सव-तैयारी पीछे'),
          message: t3(
            `"${f.name}" begins in ${du} day(s), but only ${Math.round(pct * 100)}% of tasks are done (${done.length}/${mine.length}). The devas deserve readiness.`,
            `"${f.name}" ${du} দিনে শুরু, কিন্তু মাত্র ${Math.round(pct * 100)}% কাজ শেষ।`,
            `"${f.name}" ${du} दिन में आरंभ, पर केवल ${Math.round(pct * 100)}% कार्य पूर्ण।`
          ),
          actionLabel: t3('Open checklist', 'তালিকা খুলুন', 'सूची खोलें'),
          actionRoute: 'events',
          dedupeKey: `utsav-prep:${f.id}`,
        });
      }
    }
  } catch { /* fail-open */ }

  return out;
}

/* ------------------------------------------------------------------ */
/* 9. Pathshala (stubs — data shapes not yet present)                  */
/* ------------------------------------------------------------------ */

function pathshalaInsights(_snap: ModuleSnapshot, _now: Date): Insight[] {
  // TODO(stub): fees overdue — no fee record shape exists yet.
  // Needs: studentFees[] with { studentId, term, dueDate, amount, status }.
  // TODO(stub): exams within 14 days — no exam schedule shape exists yet.
  // Needs: exams[] with { id, title, date, classLevel }.
  return [];
}

/* ------------------------------------------------------------------ */
/* 10. Goshala                                                         */
/* ------------------------------------------------------------------ */

function goshalaInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const cows = asArray(snap.cows);
  const inventory = asArray(snap.inventory);

  try {
    // Vet checkup due (>180 days)
    const due = cows.filter((c) => {
      const du = daysUntil(c.lastVetCheckup, now);
      return du === null || du < -180;
    });
    for (const c of due.slice(0, 5)) {
      out.push({
        id: `goshala-vet-${c.id}`,
        module: 'goshala',
        severity: 'nudge',
        roles: ['owner', 'trustee'],
        title: t3('Vet checkup due for gomata', 'গোমাতার চিকিৎসা বাকি', 'गोमाता की चिकित्सा शेष'),
        message: t3(
          `${c.name || 'A gomata'} (${c.tagNumber || c.cowTagId || 'untagged'}) hasn't had a vet checkup in over 6 months. Care is dharma.`,
          `${c.name || 'এক গোমাতা'}-র ৬ মাসের বেশি চিকিৎসা হয়নি। যত্নই ধর্ম।`,
          `${c.name || 'एक गोमाता'} की 6 मास से अधिक चिकित्सा नहीं हुई। देखभाल ही धर्म है।`
        ),
        actionLabel: t3('Schedule vet visit', 'চিকিৎসা ঠিক করুন', 'चिकित्सा तय करें'),
        actionRoute: 'goshala',
        dedupeKey: `goshala-vet:${c.id}`,
      });
    }

    // Fodder stock low (via bhandar fodder category)
    const fodderLow = inventory.filter(
      (i) =>
        str(i.category).toLowerCase().includes('fodder') &&
        num(i.currentStock) <= num(i.minReorderLevel)
    );
    if (fodderLow.length > 0) {
      out.push({
        id: 'goshala-fodder-low',
        module: 'goshala',
        severity: 'attention',
        roles: ['owner', 'trustee'],
        title: t3('Fodder stock low', 'খড়ের মজুত কম', 'चारे का भंडार कम'),
        message: t3(
          `${fodderLow.length} fodder item(s) below reorder level — ${fodderLow.slice(0, 3).map((i) => i.itemName).join(', ')}. Gomata should never wait for her meal.`,
          `${fodderLow.length}টি খড় পুনঃক্রয়-সীমার নিচে। গোমাতার আহারে দেরি হওয়া উচিত নয়।`,
          `${fodderLow.length} चारा वस्तुएँ पुनः-क्रय स्तर से नीचे। गोमाता को भोजन हेतु प्रतीक्षा न करनी पड़े।`
        ),
        actionLabel: t3('Restock fodder', 'খড় মজুত করুন', 'चारा भंडार करें'),
        actionRoute: 'inventory',
        dedupeKey: 'goshala:fodder-low',
      });
    }
  } catch { /* fail-open */ }

  return out;
}

/* ------------------------------------------------------------------ */
/* 11. Sangam                                                          */
/* ------------------------------------------------------------------ */

function sangamInsights(snap: ModuleSnapshot, now: Date): Insight[] {
  const out: Insight[] = [];
  const posts = asArray(snap.sangamPosts);
  const events = asArray(snap.sangamEvents);

  try {
    // Unanswered posts > 48h — someone spoke, nobody answered
    const lonely = posts.filter((p) => {
      if (str(p.status).toLowerCase() !== 'active') return false;
      if (num(p.commentCount) > 0) return false;
      const created = toDate(p.createdAt);
      if (!created) return false;
      return now.getTime() - created.getTime() > 48 * 3600 * 1000;
    });
    for (const p of lonely.slice(0, 3)) {
      const preview = str(p.text).slice(0, 60);
      out.push({
        id: `sangam-lonely-${p.id}`,
        module: 'sangam',
        severity: 'nudge',
        roles: ['owner', 'trustee', 'sevadar'],
        title: t3('A voice unanswered in Sangam', 'সঙ্গমে এক কণ্ঠ নিরুত্তর', 'संगम में एक स्वर अनुत्तरित'),
        message: t3(
          `${p.authorName || 'Someone'} wrote 2+ days ago and received no reply: "${preview}${preview.length >= 60 ? '…' : ''}" A kind word keeps the sangam warm.`,
          `${p.authorName || 'কেউ'} ২+ দিন আগে লিখেছেন, উত্তর পাননি। স্নেহের কথা সঙ্গমকে উষ্ণ রাখে।`,
          `${p.authorName || 'किसी'} ने 2+ दिन पहले लिखा, उत्तर नहीं मिला। स्नेहिल शब्द संगम को उष्ण रखते हैं।`
        ),
        actionLabel: t3('Reply kindly', 'স্নেহে উত্তর দিন', 'स्नेह से उत्तर दें'),
        actionRoute: 'sangam',
        dedupeKey: `sangam-lonely:${p.id}`,
      });
    }

    // Upcoming satsang with no RSVPs
    for (const e of events) {
      if (e.kind !== 'satsang') continue;
      const starts = toDate(e.startsAt);
      if (!starts) continue;
      const du = Math.round(
        (startOfDay(starts).getTime() - startOfDay(now).getTime()) / 86400000
      );
      if (du < 0 || du > 7) continue;
      if (num(e.rsvpCount) > 0) continue;
      out.push({
        id: `sangam-rsvp-${e.id}`,
        module: 'sangam',
        severity: 'info',
        roles: ['owner', 'trustee', 'sevadar'],
        title: t3('Satsang with no RSVPs yet', 'সৎসঙ্গে এখনো কেউ আসেনি', 'सत्संग में अभी कोई नहीं'),
        message: t3(
          `"${e.title}" is in ${du} day(s) at ${e.venue || '—'} with no RSVPs. A gentle announcement may fill the hall.`,
          `"${e.title}" ${du} দিনে, এখনো কেউ আসেনি। মৃদু ঘোষণায় হল ভরতে পারে।`,
          `"${e.title}" ${du} दिन में है, अभी कोई RSVP नहीं। मृदु घोषणा से hall भर सकता है।`
        ),
        actionLabel: t3('Announce', 'ঘোষণা করুন', 'घोषणा करें'),
        actionRoute: 'sangam',
        dedupeKey: `sangam-rsvp:${e.id}`,
      });
    }
  } catch { /* fail-open */ }

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

type Generator = (snap: ModuleSnapshot, now: Date) => Insight[];

const GENERATORS: Array<{ module: string; fn: Generator }> = [
  { module: 'treasury', fn: treasuryInsights },
  { module: 'inventory', fn: inventoryInsights },
  { module: 'hr', fn: hrInsights },
  { module: 'devotees', fn: devoteeInsights },
  { module: 'marketplace', fn: marketplaceInsights },
  { module: 'wallet', fn: walletInsights },
  { module: 'samskara', fn: samskaraInsights },
  { module: 'events', fn: utsavInsights },
  { module: 'pathshala', fn: pathshalaInsights },
  { module: 'goshala', fn: goshalaInsights },
  { module: 'sangam', fn: sangamInsights },
];

/**
 * Which checks are live vs stubbed, per module. Stubs have TODOs in the
 * generator bodies and must never fabricate data.
 */
export const GENERATOR_STATUS: Record<
  string,
  { live: string[]; stub: string[] }
> = {
  treasury: {
    live: ['pledges overdue >7d', 'large donation without receipt', 'balance < 1 month avg expenses'],
    stub: ['hundi not counted >5d (needs hundiCollections shape)'],
  },
  inventory: {
    live: ['below reorder level', 'festival-linked samagri check'],
    stub: ['perishables expiring 7d (needs expiryDate on InventoryItem)'],
  },
  hr: {
    live: ['staff/sevadar birthdays this week'],
    stub: [
      'salaries pending past month-end (needs staffSalaries shape)',
      'festival roster <80% filled (needs requiredSevadars per shift)',
    ],
  },
  devotees: {
    live: ['birthdays 7d', 'anniversaries 7d', 'new member welcome'],
    stub: ['inactive 90+ days (needs lastActiveAt on DevoteeMember)'],
  },
  marketplace: {
    live: ['disputes awaiting resolution', 'payouts pending >3d', 'overdue provider dues', 'bypass flags unreviewed'],
    stub: [],
  },
  wallet: {
    live: ['top-up claims pending >24h', 'rejected claims follow-up'],
    stub: [],
  },
  samskara: {
    live: ['ceremony 14d without muhurat', 'ceremony 7d without purohit'],
    stub: [],
  },
  events: {
    live: ['festival 14d with <50% tasks done', 'festival 3d escalation'],
    stub: [],
  },
  pathshala: {
    live: [],
    stub: [
      'fees overdue (needs studentFees shape)',
      'exams within 14d (needs exams shape)',
    ],
  },
  goshala: {
    live: ['vet checkup due >180d', 'fodder stock low (via bhandar)'],
    stub: [],
  },
  sangam: {
    live: ['unanswered posts >48h', 'satsang without RSVPs'],
    stub: [],
  },
};

/**
 * Run every generator, filter to the caller's role, sort by severity,
 * dedupe by dedupeKey, cap at 20. Never throws — worst case returns [].
 */
export function generateAllInsights(
  role: IntelRole | string,
  snapshot: ModuleSnapshot
): Insight[] {
  try {
    const now = toDate(snapshot.now) || new Date();
    const roleKey = str(role).toLowerCase();
    const all: Insight[] = [];
    for (const g of GENERATORS) {
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

/** All insights regardless of role (for owner/GodMode overviews). */
export function generateInsightsForOwner(snapshot: ModuleSnapshot): Insight[] {
  return generateAllInsights('owner', snapshot);
}
