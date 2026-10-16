/**
 * p2pLedger.ts — Personal P2P wallet ledger (client).
 * ==================================================
 * Coordination layer, NOT custody. This module tracks IOUs and payment
 * agreements between people; the app NEVER holds P2P money. Actual
 * transfers happen on bKash/Nagad/UPI/bank/cash — the ledger records
 * what was agreed, marked paid, and confirmed.
 *
 * Semantics (matches the firestore.rules transitions and the chat
 * request-card flow: request → accept → mark paid → confirm received):
 *   - The SENDER of a request is the PAYER ("I owe").
 *   - The RECEIVER is the PAYEE ("owed to me").
 *   - Receiver accepts/declines, sender marks paid (with rail + ref),
 *     receiver confirms received → settled.
 *
 * PRIVACY (absolute):
 *   - fetchMyMoneyRequests() only ever queries where senderId == uid OR
 *     receiverId == uid. The server-side rules deny anything else.
 *   - deriveWalletEntries() defensively drops any request where uid is
 *     not sender or receiver — even if the caller passed foreign docs.
 *   - OrgRequestLedger is trustee-gated client-side AND server-side.
 *
 * This is a different surface from the Platform (Seva) Wallet in
 * wallet.ts — platform top-ups/marketplace are untouched here.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  MoneyRequest,
  WalletEntry,
  PersonalWalletSummary,
  RequestStatus,
  formatMoney,
} from '../chat/types';

// ---------------------------------------------------------------------------
// Entry derivation
// ---------------------------------------------------------------------------

/** Wallet entries with the presentation fields the UI needs. */
export interface LedgerEntry extends WalletEntry {
  /** True when the other side of the request is an organisation. */
  orgCounterparty: boolean;
  /** Trustee who initiated an org-sent request (org ledger). */
  trusteeName?: string;
  expiresAt: number;
  createdAt: number;
  paidVia?: MoneyRequest['paidVia'];
  paidRef?: string;
  /** I am the payer (sender). */
  iAmPayer: boolean;
}

/** Statuses where the obligation is still open. */
export const ACTIVE_STATUSES: RequestStatus[] = ['pending', 'accepted', 'paid'];

/** Statuses that are finished business — shown under History. */
export const CLOSED_STATUSES: RequestStatus[] = [
  'settled',
  'declined',
  'cancelled',
  'expired',
  'countered',
];

export function isActiveStatus(status: RequestStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Split requests into owed_to_me / i_owe entries for `uid`.
 *
 * PRIVACY: any request where `uid` is neither sender nor receiver is
 * silently dropped — this is the client-side enforcement point backing
 * up the server-side rules.
 */
export function deriveWalletEntries(requests: MoneyRequest[], uid: string): LedgerEntry[] {
  if (!uid || uid === 'anon') return [];
  const out: LedgerEntry[] = [];
  for (const r of requests) {
    if (!r || typeof r !== 'object') continue;
    const iAmSender = r.senderId === uid;
    const iAmReceiver = r.receiverId === uid;
    if (!iAmSender && !iAmReceiver) continue; // privacy: not my business
    if (typeof r.amount !== 'number' || !(r.amount > 0)) continue;

    const orgSide = !!r.orgId;
    const counterpartyIsOrg = orgSide;
    const counterpartyId = iAmSender ? r.receiverId : r.senderId;
    const counterpartyName = counterpartyIsOrg
      ? r.orgName || (iAmSender ? r.receiverName : r.senderName) || '—'
      : iAmSender
        ? r.receiverName || '—'
        : r.senderName || '—';
    const counterpartyPhotoUrl = counterpartyIsOrg
      ? r.orgLogoUrl
      : iAmSender
        ? undefined
        : r.senderPhotoUrl;

    out.push({
      requestId: r.id,
      direction: iAmSender ? 'i_owe' : 'owed_to_me',
      counterpartyId,
      counterpartyName,
      counterpartyPhotoUrl,
      orgId: orgSide ? r.orgId : undefined,
      orgName: orgSide ? r.orgName : undefined,
      amount: r.amount,
      currency: r.currency || 'BDT',
      note: r.note || '',
      status: r.status,
      chatId: r.chatId || '',
      updatedAt: r.updatedAt || r.createdAt || Date.now(),
      orgCounterparty: counterpartyIsOrg,
      trusteeName: r.senderTrusteeName,
      expiresAt: r.expiresAt || 0,
      createdAt: r.createdAt || 0,
      paidVia: r.paidVia,
      paidRef: r.paidRef,
      iAmPayer: iAmSender,
    });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface WalletSummaryDetailed extends PersonalWalletSummary {
  totalsByCurrency: Record<string, { owedToMe: number; iOwe: number }>;
  activeCount: number;
  historyCount: number;
}

export function summarizeWallet(uid: string, entries: LedgerEntry[]): WalletSummaryDetailed {
  const totalsByCurrency: Record<string, { owedToMe: number; iOwe: number }> = {};
  let pendingSent = 0;
  let pendingReceived = 0;
  let activeCount = 0;
  let historyCount = 0;

  for (const e of entries) {
    if (isActiveStatus(e.status)) {
      const bucket = totalsByCurrency[e.currency] || (totalsByCurrency[e.currency] = { owedToMe: 0, iOwe: 0 });
      if (e.direction === 'owed_to_me') bucket.owedToMe += e.amount;
      else bucket.iOwe += e.amount;
      activeCount += 1;
      if (e.status === 'pending') {
        if (e.iAmPayer) pendingSent += 1;
        else pendingReceived += 1;
      }
    } else {
      historyCount += 1;
    }
  }

  // Primary currency = the one carrying the most money, so the headline
  // numbers are meaningful when a user mixes BDT/INR.
  let primaryCurrency = 'BDT';
  let primaryVolume = -1;
  for (const [cur, t] of Object.entries(totalsByCurrency)) {
    if (t.owedToMe + t.iOwe > primaryVolume) {
      primaryVolume = t.owedToMe + t.iOwe;
      primaryCurrency = cur;
    }
  }
  const primary = totalsByCurrency[primaryCurrency] || { owedToMe: 0, iOwe: 0 };

  return {
    uid,
    totalOwedToMe: primary.owedToMe,
    totalIOwe: primary.iOwe,
    pendingSent,
    pendingReceived,
    currency: primaryCurrency,
    updatedAt: Date.now(),
    totalsByCurrency,
    activeCount,
    historyCount,
  };
}

// ---------------------------------------------------------------------------
// Netting suggestions
// ---------------------------------------------------------------------------

export interface NettingSuggestion {
  id: string;
  kind: 'offset' | 'pass_through';
  currency: string;
  amount: number;
  /** Request ids involved — lets the UI deep-link each entry. */
  requestIds: string[];
  text: { en: string; bn: string; hi: string };
}

/** Amounts match "within rounding": exact, or within 1% (min 1 unit). */
function amountsMatch(a: number, b: number): boolean {
  const tol = Math.max(1, Math.round(Math.max(a, b) * 0.01));
  return Math.abs(a - b) <= tol;
}

/**
 * Find offset and pass-through netting opportunities among ACTIVE entries.
 * Example: "Rahim owes you ৳500, you owe Karim ৳500 — ask Rahim to pay
 * Karim directly?" The app never moves money; it only suggests the
 * conversation.
 */
export function suggestNetting(entries: LedgerEntry[]): NettingSuggestion[] {
  const active = entries.filter((e) => isActiveStatus(e.status));
  const out: NettingSuggestion[] = [];
  const seen = new Set<string>();

  // 1) Direct offsets: same counterparty, both directions.
  const byCounterparty = new Map<string, { owed: LedgerEntry[]; owe: LedgerEntry[] }>();
  for (const e of active) {
    const key = `${e.counterpartyId}::${e.currency}`;
    let g = byCounterparty.get(key);
    if (!g) {
      g = { owed: [], owe: [] };
      byCounterparty.set(key, g);
    }
    (e.direction === 'owed_to_me' ? g.owed : g.owe).push(e);
  }
  for (const [key, g] of byCounterparty) {
    for (const a of g.owed) {
      for (const b of g.owe) {
        if (a.requestId === b.requestId) continue;
        if (!amountsMatch(a.amount, b.amount)) continue;
        const id = `offset:${key}:${a.requestId}:${b.requestId}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const amt = Math.min(a.amount, b.amount);
        const name = a.counterpartyName;
        out.push({
          id,
          kind: 'offset',
          currency: a.currency,
          amount: amt,
          requestIds: [a.requestId, b.requestId],
          text: {
            en: `${name} owes you ${formatMoney(a.amount, a.currency)} and you owe ${name} ${formatMoney(b.amount, b.currency)} — settle the difference (${formatMoney(Math.abs(a.amount - b.amount), a.currency)}) in one payment.`,
            bn: `${name} আপনাকে ${formatMoney(a.amount, a.currency)} দেবে এবং আপনি ${name}-কে ${formatMoney(b.amount, b.currency)} দেবেন — পার্থক্য (${formatMoney(Math.abs(a.amount - b.amount), a.currency)}) একবারে মিটিয়ে নিন।`,
            hi: `${name} आपको ${formatMoney(a.amount, a.currency)} देगा और आप ${name} को ${formatMoney(b.amount, b.currency)} देंगे — अंतर (${formatMoney(Math.abs(a.amount - b.amount), a.currency)}) एक ही भुगतान में निपटा लें।`,
          },
        });
      }
    }
  }

  // 2) Pass-through: X owes me ≈ what I owe Y (X ≠ Y) → X pays Y directly.
  const owed = active.filter((e) => e.direction === 'owed_to_me');
  const owe = active.filter((e) => e.direction === 'i_owe');
  for (const a of owed) {
    for (const b of owe) {
      if (a.counterpartyId === b.counterpartyId) continue; // covered by offset
      if (a.currency !== b.currency) continue;
      if (!amountsMatch(a.amount, b.amount)) continue;
      const id = `pass:${a.requestId}:${b.requestId}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const amt = Math.min(a.amount, b.amount);
      out.push({
        id,
        kind: 'pass_through',
        currency: a.currency,
        amount: amt,
        requestIds: [a.requestId, b.requestId],
        text: {
          en: `${a.counterpartyName} owes you ${formatMoney(a.amount, a.currency)} and you owe ${b.counterpartyName} ${formatMoney(b.amount, b.currency)} — ask ${a.counterpartyName} to pay ${b.counterpartyName} directly?`,
          bn: `${a.counterpartyName} আপনাকে ${formatMoney(a.amount, a.currency)} দেবে এবং আপনি ${b.counterpartyName}-কে ${formatMoney(b.amount, b.currency)} দেবেন — ${a.counterpartyName}-কে সরাসরি ${b.counterpartyName}-কে দিতে বলুন?`,
          hi: `${a.counterpartyName} आपको ${formatMoney(a.amount, a.currency)} देगा और आप ${b.counterpartyName} को ${formatMoney(b.amount, b.currency)} देंगे — ${a.counterpartyName} से सीधे ${b.counterpartyName} को भुगतान करने को कहें?`,
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export interface EntryFilter {
  person?: string; // counterpartyId
  status?: RequestStatus | 'active' | 'history' | 'all';
  dateRange?: { from?: number; to?: number };
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}

export function filterEntries(entries: LedgerEntry[], f: EntryFilter): LedgerEntry[] {
  return entries.filter((e) => {
    if (f.person && e.counterpartyId !== f.person) return false;
    if (f.status && f.status !== 'all') {
      if (f.status === 'active' && !isActiveStatus(e.status)) return false;
      else if (f.status === 'history' && isActiveStatus(e.status)) return false;
      else if (f.status !== 'active' && f.status !== 'history' && e.status !== f.status) return false;
    }
    if (f.dateRange) {
      const t = e.updatedAt;
      if (f.dateRange.from != null && t < f.dateRange.from) return false;
      if (f.dateRange.to != null && t > f.dateRange.to) return false;
    }
    if (f.minAmount != null && e.amount < f.minAmount) return false;
    if (f.maxAmount != null && e.amount > f.maxAmount) return false;
    if (f.currency && e.currency !== f.currency) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Time-ago labels (trilingual)
// ---------------------------------------------------------------------------

export function timeAgo(ts: number, lang: 'en' | 'bn' | 'hi' = 'en', now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  const min = Math.floor(s / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const n = (v: number) => v.toLocaleString('en-IN');
  if (s < 60) return lang === 'bn' ? 'এইমাত্র' : lang === 'hi' ? 'अभी' : 'just now';
  if (min < 60)
    return lang === 'bn' ? `${n(min)} মিনিট আগে` : lang === 'hi' ? `${n(min)} मिनट पहले` : `${n(min)} min ago`;
  if (hr < 24)
    return lang === 'bn' ? `${n(hr)} ঘণ্টা আগে` : lang === 'hi' ? `${n(hr)} घंटे पहले` : `${n(hr)} hr ago`;
  if (day < 30)
    return lang === 'bn' ? `${n(day)} দিন আগে` : lang === 'hi' ? `${n(day)} दिन पहले` : `${n(day)} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  return lang === 'bn' ? `${n(mo)} মাস আগে` : lang === 'hi' ? `${n(mo)} महीने पहले` : `${n(mo)} mo ago`;
}

// ---------------------------------------------------------------------------
// Firestore service — reads and transitions
// ---------------------------------------------------------------------------

function toMoneyRequest(id: string, data: Record<string, unknown>): MoneyRequest {
  return {
    id,
    direction: (data.direction as MoneyRequest['direction']) || 'user_to_user',
    senderId: String(data.senderId || ''),
    senderName: String(data.senderName || ''),
    senderPhotoUrl: data.senderPhotoUrl ? String(data.senderPhotoUrl) : undefined,
    senderTrusteeId: data.senderTrusteeId ? String(data.senderTrusteeId) : undefined,
    senderTrusteeName: data.senderTrusteeName ? String(data.senderTrusteeName) : undefined,
    orgId: data.orgId ? String(data.orgId) : undefined,
    orgName: data.orgName ? String(data.orgName) : undefined,
    orgLogoUrl: data.orgLogoUrl ? String(data.orgLogoUrl) : undefined,
    receiverId: String(data.receiverId || ''),
    receiverName: String(data.receiverName || ''),
    amount: Number(data.amount || 0),
    currency: (data.currency as MoneyRequest['currency']) || 'BDT',
    note: String(data.note || ''),
    status: (data.status as RequestStatus) || 'pending',
    supersededBy: data.supersededBy ? String(data.supersededBy) : undefined,
    countersRequestId: data.countersRequestId ? String(data.countersRequestId) : undefined,
    chatId: String(data.chatId || ''),
    paidAt: data.paidAt ? Number(data.paidAt) : undefined,
    paidRef: data.paidRef ? String(data.paidRef) : undefined,
    paidVia: data.paidVia ? (data.paidVia as MoneyRequest['paidVia']) : undefined,
    settledAt: data.settledAt ? Number(data.settledAt) : undefined,
    expiresAt: Number(data.expiresAt || 0),
    createdAt: Number(data.createdAt || 0),
    updatedAt: Number(data.updatedAt || 0),
  };
}

/**
 * Fetch the current user's requests. PRIVACY: two uid-bound queries only —
 * the server rules guarantee nothing else is readable.
 */
export async function fetchMyMoneyRequests(uid: string): Promise<MoneyRequest[]> {
  if (!uid || uid === 'anon') return [];
  const col = collection(db, 'p2pRequests');
  const [asSender, asReceiver] = await Promise.all([
    getDocs(query(col, where('senderId', '==', uid))),
    getDocs(query(col, where('receiverId', '==', uid))),
  ]);
  const merged = new Map<string, MoneyRequest>();
  for (const snap of [asSender, asReceiver]) {
    for (const d of snap.docs) merged.set(d.id, toMoneyRequest(d.id, d.data()));
  }
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Fetch an organisation's requests. Callers MUST be trustees/accountants —
 * the rules allow org trustees to read orgId-bound requests.
 */
export async function fetchOrgMoneyRequests(orgId: string): Promise<MoneyRequest[]> {
  if (!orgId) return [];
  const snap = await getDocs(query(collection(db, 'p2pRequests'), where('orgId', '==', orgId)));
  return snap.docs
    .map((d) => toMoneyRequest(d.id, d.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// --- Status transitions (keys restricted to match firestore.rules) ---

export async function acceptMoneyRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'p2pRequests', requestId), { status: 'accepted', updatedAt: Date.now() });
}

export async function declineMoneyRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'p2pRequests', requestId), { status: 'declined', updatedAt: Date.now() });
}

export async function cancelMoneyRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'p2pRequests', requestId), { status: 'cancelled', updatedAt: Date.now() });
}

export async function markMoneyRequestPaid(
  requestId: string,
  paidVia: NonNullable<MoneyRequest['paidVia']>,
  paidRef: string,
): Promise<void> {
  await updateDoc(doc(db, 'p2pRequests', requestId), {
    status: 'paid',
    paidAt: Date.now(),
    paidRef: paidRef || '',
    paidVia,
    updatedAt: Date.now(),
  });
}

export async function confirmMoneyRequestSettled(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'p2pRequests', requestId), {
    status: 'settled',
    settledAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Platform (Seva) Wallet bridge
// ---------------------------------------------------------------------------

export interface PlatformBalance {
  balance: number;
  currency: string;
}

/** Read the user's own platform wallet balance (own-doc read is allowed). */
export async function getPlatformWalletBalance(uid: string): Promise<PlatformBalance | null> {
  if (!uid || uid === 'anon') return null;
  try {
    const snap = await getDoc(doc(db, 'wallets', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { balance: Number(d.balance || 0), currency: String(d.currency || 'BDT') };
  } catch {
    return null; // fail-open: show the option only when a balance is known
  }
}

/**
 * "Pay from Seva Wallet" — moves the obligation to platform rails.
 *
 * HONEST LIMITATION (Spark-native, no backend): client-side debits of
 * wallets/{uid} are only allowed against a real marketplace order
 * (firestore.rules walletDebitOk), so an atomic self-debit is impossible
 * here and we do NOT attempt one. Instead this records a platform
 * `spend` transaction (client-create of own type:'spend' is allowed) that
 * references the p2p request, and marks the request paid via
 * platform_wallet. The owner applies the actual balance debit from the
 * finance approval queue — the same claim→approve pattern as topupClaims.
 * The UI labels this plainly.
 */
export async function payMoneyRequestFromPlatformWallet(
  uid: string,
  req: MoneyRequest,
): Promise<string> {
  if (req.status !== 'accepted') {
    throw new Error('Request must be accepted before it can be marked paid.');
  }
  const batch = writeBatch(db);
  const txnRef = doc(collection(db, 'walletTransactions'));
  batch.set(txnRef, {
    uid,
    type: 'spend',
    amount: req.amount,
    currency: req.currency,
    note: `P2P settlement via Seva Wallet · request ${req.id} → ${req.receiverName}`,
    createdAt: Date.now(),
  });
  batch.update(doc(db, 'p2pRequests', req.id), {
    status: 'paid',
    paidAt: Date.now(),
    paidRef: txnRef.id,
    paidVia: 'platform_wallet',
    updatedAt: Date.now(),
  });
  await batch.commit();
  return txnRef.id;
}
