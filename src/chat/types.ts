/**
 * Chat + P2P money requests — shared type contract.
 * =================================================
 * Coordination layer, NOT custody. The app NEVER holds P2P money.
 * Actual transfers happen on bKash/Nagad/UPI; the app tracks agreements.
 */

// ---------- Chat ----------

export type ChatType = 'direct' | 'org';

export interface ChatParticipant {
  uid: string;
  displayName: string;
  photoUrl?: string;
  sanataniId?: string;
  verificationTier?: string;
  /** For org threads: the org's info */
  orgId?: string;
  orgName?: string;
  orgLogoUrl?: string;
}

export interface ChatThread {
  id: string;
  type: ChatType;
  /** Sorted uids for direct; [userUid, orgId] for org threads */
  participants: string[];
  participantInfo: Record<string, ChatParticipant>;
  lastMessage?: string;
  lastMessageAt?: number;
  /** uid -> unread count */
  unreadCounts?: Record<string, number>;
  /** uid -> timestamp of last read */
  lastReadAt?: Record<string, number>;
  /** uid -> typing boolean (ephemeral, on chat doc) */
  typing?: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
  archivedBy?: string[];
}

export type MessageKind = 'text' | 'blessing' | 'request_card' | 'system' | 'receipt' | 'voice';

/** Seva Bazar Phase 2 — token-advance receipt carried by a chat message.
 * Messages are immutable (rules), so the provider's "Received ✓" is a
 * follow-up message + the order's paid→accepted transition — the card
 * itself never mutates. */
export interface ReceiptMeta {
  orderId: string;
  amount: number;
  currency: string;
  trxId: string;
  rail: string;
  providerUid: string;
  providerName: string;
}

/** For voice-note messages: the vault pointer + duration. */
export interface VoiceMeta {
  /** `vault://{fileId}` — resolved via resolveVaultUrl(). Never bytes. */
  vaultUrl: string;
  /** Recording length in milliseconds. */
  durationMs: number;
  /** Recorder's mime type, e.g. 'audio/webm'. */
  contentType: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  kind: MessageKind;
  text: string;
  /** For blessing cards */
  blessingMeta?: {
    occasion: string;
    occasionBn?: string;
    occasionHi?: string;
  };
  /** For request_card messages: the p2pRequest id */
  requestId?: string;
  /** For receipt messages: the token-advance receipt */
  receiptMeta?: ReceiptMeta;
  /** For voice-note messages: the vault pointer + duration */
  voiceMeta?: VoiceMeta;
  createdAt: number;
  /** Delivery states */
  deliveredAt?: number;
  readBy?: string[];
}

// ---------- P2P Money Requests ----------

export type RequestStatus =
  | 'pending'    // sent, awaiting response
  | 'accepted'   // agreed, awaiting payment
  | 'declined'   // refused
  | 'countered'  // receiver proposed different amount (superseded by new request)
  | 'paid'       // payer marked paid, awaiting confirmation
  | 'settled'    // receiver confirmed — complete
  | 'cancelled'  // sender cancelled
  | 'expired';   // passed expiry

export type RequestDirection = 'user_to_user' | 'org_to_user' | 'user_to_org';

export interface MoneyRequest {
  id: string;
  direction: RequestDirection;
  /** Sender (user uid, or orgId for org-sent) */
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  /** For org-sent: which trustee initiated */
  senderTrusteeId?: string;
  senderTrusteeName?: string;
  orgId?: string;
  orgName?: string;
  orgLogoUrl?: string;
  /** Receiver (user uid, or orgId for user-to-org) */
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: 'BDT' | 'INR' | 'USD';
  note: string;
  status: RequestStatus;
  /** For counter-offers: links to the superseding request */
  supersededBy?: string;
  /** For counter-offers: links to the original request */
  countersRequestId?: string;
  /** Chat thread this request lives in */
  chatId: string;
  /** Payment settlement info */
  paidAt?: number;
  paidRef?: string;      // bKash TrxID / UPI ref entered by payer
  paidVia?: 'bkash' | 'nagad' | 'upi' | 'bank' | 'platform_wallet' | 'cash' | 'other';
  settledAt?: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

// ---------- Personal Wallet (P2P ledger) ----------

export interface WalletEntry {
  requestId: string;
  direction: 'owed_to_me' | 'i_owe';
  counterpartyId: string;
  counterpartyName: string;
  counterpartyPhotoUrl?: string;
  orgId?: string;
  orgName?: string;
  amount: number;
  currency: string;
  note: string;
  status: RequestStatus;
  chatId: string;
  updatedAt: number;
}

export interface PersonalWalletSummary {
  uid: string;
  totalOwedToMe: number;
  totalIOwe: number;
  pendingSent: number;
  pendingReceived: number;
  currency: string;
  updatedAt: number;
}

// ---------- Helpers ----------

export function requestStatusLabel(status: RequestStatus, lang: 'en' | 'bn' | 'hi' = 'en'): string {
  const labels: Record<RequestStatus, [string, string, string]> = {
    pending: ['Pending', 'অপেক্ষমাণ', 'लंबित'],
    accepted: ['Accepted', 'গৃহীত', 'स्वीकृत'],
    declined: ['Declined', 'প্রত্যাখ্যাত', 'अस्वीकृत'],
    countered: ['Countered', 'পাল্টা প্রস্তাব', 'प्रतिप्रस्ताव'],
    paid: ['Paid — awaiting confirmation', 'পরিশোধিত — নিশ্চিতকরণের অপেক্ষায়', 'भुगतान — पुष्टि की प्रतीक्षा'],
    settled: ['Settled ✓', 'নিষ্পত্তি ✓', 'निपटाया ✓'],
    cancelled: ['Cancelled', 'বাতিল', 'रद्द'],
    expired: ['Expired', 'মেয়াদোত্তীর্ণ', 'समाप्त'],
  };
  const [en, bn, hi] = labels[status];
  return lang === 'bn' ? bn : lang === 'hi' ? hi : en;
}

export function formatMoney(amount: number, currency: string = 'BDT'): string {
  const symbols: Record<string, string> = { BDT: '৳', INR: '₹', USD: '$' };
  const sym = symbols[currency] || currency + ' ';
  // Negative amounts (e.g. net position) read as −₹500, never ₹-500.
  if (amount < 0) return `−${sym}${Math.abs(amount).toLocaleString('en-IN')}`;
  return `${sym}${amount.toLocaleString('en-IN')}`;
}
