/**
 * p2pService.ts — Firestore operations for in-chat P2P money requests.
 * ====================================================================
 * Collection: `p2pRequests/{requestId}` (rules: deny-by-default, parties-only
 * read, status-transition-constrained updates — see firestore.rules).
 * Each request also drops a `request_card` message into
 * `chats/{chatId}/messages` so it renders natively inside the chat thread.
 *
 * CRITICAL PRINCIPLE — coordination layer, NOT custody.
 * The app NEVER holds P2P money. `markPaid` only records the payer's own
 * bKash / Nagad / UPI reference; the transfer itself happens off-app.
 *
 * Semantics: sender = PAYER (proposes "I will send you <amount>"),
 *            receiver = PAYEE (accepts, then confirms receipt).
 * Lifecycle: pending -> accepted -> paid -> settled
 *            pending -> declined | cancelled | countered | (expired by time)
 *
 * RBAC enforcement points (client-side; firestore.rules is the hard gate):
 *  - user_to_user / user_to_org: sender must have a Sanatani profile
 *    (`sanataniProfiles/{uid}` exists). Best-effort — fails OPEN on read
 *    errors because the rules still enforce parties-only security.
 *  - org_to_user: sender must hold Trustee/Accountant(/SuperAdmin) on the
 *    org's `workspaceMembers/{orgId}_{uid}` edge. FAILS CLOSED — a failed
 *    check must never let someone impersonate an org.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { logQrScan } from "../qrIntel/qrIntelService";
import {
  formatMoney,
  type ChatMessage,
  type MoneyRequest,
  type RequestDirection,
} from "./types";
import {
  ORG_SENDER_ROLES,
  PAID_REF_MAX,
  REQUEST_NOTE_MAX,
  REQUEST_TTL_MS,
  counterDirection,
  effectiveStatus,
  normalizeAmount,
  validateAmount,
  type PaidVia,
  type RequestCurrency,
} from "./p2pLogic";
import {
  notifyMoneyMarkedPaid,
  notifyMoneyRequestAccepted,
  notifyMoneyRequestCountered,
  notifyMoneyRequestDeclined,
  notifyMoneyRequestReceived,
  notifyMoneySettled,
} from "../notifications/notifyHelpers";

export class P2PError extends Error {
  code:
    | "invalid-amount"
    | "not-verified"
    | "forbidden"
    | "bad-state"
    | "not-found"
    | "org-role";
  constructor(code: P2PError["code"], message: string) {
    super(message);
    this.name = "P2PError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// RBAC helpers
// ---------------------------------------------------------------------------

/** Sender must have a Sanatani profile (verified user). Fails open on read error. */
export async function assertVerifiedUser(uid: string): Promise<void> {
  if (!uid)
    throw new P2PError("not-verified", "Sign in to send a money request.");
  let snap;
  try {
    snap = await getDoc(doc(db, "sanataniProfiles", uid));
  } catch (e) {
    // Best-effort: the rules still enforce parties-only security.
    console.warn(
      "[p2p] profile check failed (continuing):",
      (e as Error)?.message,
    );
    return;
  }
  if (!snap.exists()) {
    throw new P2PError(
      "not-verified",
      "You need a Sanatani profile to send money requests. Create one from Solo first.",
    );
  }
}

/**
 * Sender must be Trustee / Accountant / SuperAdmin of the org.
 * FAILS CLOSED — never impersonate an org.
 */
export async function assertOrgSenderRole(
  orgId: string,
  uid: string,
): Promise<void> {
  if (!orgId || !uid) {
    throw new P2PError(
      "org-role",
      "Only a trustee or accountant can send on behalf of an org.",
    );
  }
  let snap;
  try {
    snap = await getDoc(doc(db, "workspaceMembers", `${orgId}_${uid}`));
  } catch (e) {
    throw new P2PError(
      "org-role",
      "Could not verify your org role. Please check your connection and try again.",
    );
  }
  const role = String(
    (snap.data() as { role?: unknown } | undefined)?.role ?? "",
  );
  if (!snap.exists() || !ORG_SENDER_ROLES.includes(role)) {
    throw new P2PError(
      "org-role",
      "Only a trustee or accountant of this org can send requests on its behalf.",
    );
  }
}

/**
 * Returns the org role when it permits org sending, else null. Never throws —
 * for UI affordances only (assertOrgSenderRole is the enforcing check).
 */
export async function getOrgSenderRole(
  orgId: string,
  uid: string,
): Promise<string | null> {
  try {
    if (!orgId || !uid) return null;
    const snap = await getDoc(doc(db, "workspaceMembers", `${orgId}_${uid}`));
    if (!snap.exists()) return null;
    const role = String(
      (snap.data() as { role?: unknown } | undefined)?.role ?? "",
    );
    return ORG_SENDER_ROLES.includes(role) ? role : null;
  } catch {
    return null;
  }
}

/** Shared sender-side RBAC for create + counter flows. */
async function assertSenderAllowed(
  direction: RequestDirection,
  orgId: string | undefined,
  uid: string,
) {
  if (direction === "org_to_user") {
    await assertOrgSenderRole(orgId ?? "", uid);
  } else {
    await assertVerifiedUser(uid);
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateRequestInput {
  chatId: string;
  direction: RequestDirection;
  /** Must equal the signed-in uid (enforced by firestore.rules). */
  senderUid: string;
  senderName: string;
  senderPhotoUrl?: string;
  /** User uid, or orgId for user_to_org. */
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: RequestCurrency;
  note?: string;
  /** Org branding + accountability for org_to_user / user_to_org. */
  orgId?: string;
  orgName?: string;
  orgLogoUrl?: string;
  senderTrusteeId?: string;
  senderTrusteeName?: string;
  /** Counter-offer linkage. */
  countersRequestId?: string;
}

function validateCreateInput(input: CreateRequestInput): {
  amount: number;
  note: string;
} {
  if (!input.chatId)
    throw new P2PError("invalid-amount", "Missing chat thread.");
  if (!input.senderUid)
    throw new P2PError("forbidden", "Sign in to send a money request.");
  if (!input.receiverId)
    throw new P2PError("invalid-amount", "Choose who this request is for.");
  if (
    input.receiverId === input.senderUid &&
    input.direction === "user_to_user"
  ) {
    throw new P2PError(
      "invalid-amount",
      "You cannot send a money request to yourself.",
    );
  }
  const amountErr = validateAmount(input.amount);
  if (amountErr) throw new P2PError("invalid-amount", amountErr);
  if (!(
    input.currency === "BDT" ||
    input.currency === "INR" ||
    input.currency === "USD"
  )) {
    throw new P2PError(
      "invalid-amount",
      "Choose a currency (BDT / INR / USD).",
    );
  }
  const note = (input.note ?? "").trim().slice(0, REQUEST_NOTE_MAX);
  if (input.direction === "org_to_user" && !input.orgId) {
    throw new P2PError("org-role", "Org requests need an org selected.");
  }
  if (input.direction === "user_to_org" && !input.orgId) {
    throw new P2PError("invalid-amount", "Choose the org this request is for.");
  }
  return { amount: normalizeAmount(input.amount), note };
}

function buildRequestDoc(
  id: string,
  input: CreateRequestInput,
  amount: number,
  note: string,
  now: number,
): MoneyRequest {
  return {
    id,
    direction: input.direction,
    senderId: input.senderUid,
    senderName: input.senderName,
    senderPhotoUrl: input.senderPhotoUrl,
    senderTrusteeId: input.senderTrusteeId,
    senderTrusteeName: input.senderTrusteeName,
    orgId: input.orgId,
    orgName: input.orgName,
    orgLogoUrl: input.orgLogoUrl,
    receiverId: input.receiverId,
    receiverName: input.receiverName,
    amount,
    currency: input.currency,
    note,
    status: "pending",
    countersRequestId: input.countersRequestId,
    chatId: input.chatId,
    expiresAt: now + REQUEST_TTL_MS,
    createdAt: now,
    updatedAt: now,
  };
}

function requestCardMessage(
  requestId: string,
  r: MoneyRequest,
  senderUid: string,
  now: number,
): ChatMessage {
  return {
    id: "",
    chatId: r.chatId,
    senderId: senderUid,
    kind: "request_card",
    text: `💸 ${r.senderName} proposed sending ${formatMoney(r.amount, r.currency)} to ${r.receiverName}${r.note ? ` — ${r.note}` : ""}`,
    requestId,
    createdAt: now,
  };
}

/** Best-effort chat preview update — never blocks the request itself. */
async function touchChatPreview(
  chatId: string,
  text: string,
  now: number,
): Promise<void> {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: text.slice(0, 160),
      lastMessageAt: now,
      updatedAt: now,
    });
  } catch (e) {
    console.warn("[p2p] chat preview update skipped:", (e as Error)?.message);
  }
}

/**
 * Create a money request + its in-chat `request_card` message (atomic batch).
 * Returns the new request id.
 */
export async function createRequest(
  input: CreateRequestInput,
): Promise<string> {
  const { amount, note } = validateCreateInput(input);
  await assertSenderAllowed(input.direction, input.orgId, input.senderUid);

  const now = Date.now();
  const reqRef = doc(collection(db, "p2pRequests"));
  const req = buildRequestDoc(reqRef.id, input, amount, note, now);
  // Strip undefined fields — Firestore rejects them.
  const reqData = Object.fromEntries(
    Object.entries(req).filter(([, v]) => v !== undefined),
  );

  const msgRef = doc(collection(db, "chats", input.chatId, "messages"));
  const msg = requestCardMessage(reqRef.id, req, input.senderUid, now);

  const batch = writeBatch(db);
  batch.set(reqRef, reqData);
  batch.set(msgRef, { ...msg, id: msgRef.id });
  await batch.commit();

  void touchChatPreview(input.chatId, msg.text, now);
  return reqRef.id;
}

// ---------------------------------------------------------------------------
// Transitions (each mirrors a firestore.rules update branch exactly)
// ---------------------------------------------------------------------------

async function loadRequest(requestId: string): Promise<MoneyRequest> {
  const snap = await getDoc(doc(db, "p2pRequests", requestId));
  if (!snap.exists())
    throw new P2PError("not-found", "This request no longer exists.");
  return { ...(snap.data() as MoneyRequest), id: snap.id };
}

function requireParty(
  r: MoneyRequest,
  uid: string,
  who: "sender" | "receiver",
): void {
  const ok = who === "sender" ? r.senderId === uid : r.receiverId === uid;
  if (!ok) {
    throw new P2PError(
      "forbidden",
      who === "sender"
        ? "Only the sender can do this."
        : "Only the receiver can do this.",
    );
  }
}

function requireLive(r: MoneyRequest): void {
  const eff = effectiveStatus(r);
  if (eff !== r.status) {
    throw new P2PError("bad-state", "This request has expired.");
  }
}

/** Receiver accepts or declines a pending request. */
export async function respondToRequest(
  requestId: string,
  uid: string,
  action: "accepted" | "declined",
): Promise<void> {
  const r = await loadRequest(requestId);
  requireParty(r, uid, "receiver");
  requireLive(r);
  if (r.status !== "pending") {
    throw new P2PError("bad-state", "This request was already answered.");
  }
  await updateDoc(doc(db, "p2pRequests", requestId), {
    status: action,
    updatedAt: Date.now(),
  });
  // QR Intelligence (Phase 1): a declined request is a payment that didn't happen.
  if (action === "declined") {
    void logQrScan({
      qrId: requestId,
      qrType: 'p2p',
      uid,
      outcome: 'payment_failed',
      receiverId: r.receiverId,
    });
  }
}

/**
 * Receiver counters with a new amount: the old request becomes 'countered'
 * (linked via supersededBy) and a NEW pending request is created with the
 * roles swapped (counterDirection). Atomic batch.
 */
export async function counterOffer(
  requestId: string,
  uid: string,
  newAmount: number,
): Promise<string> {
  const old = await loadRequest(requestId);
  requireParty(old, uid, "receiver");
  requireLive(old);
  if (old.status !== "pending") {
    throw new P2PError("bad-state", "This request was already answered.");
  }
  const amountErr = validateAmount(newAmount);
  if (amountErr) throw new P2PError("invalid-amount", amountErr);

  const newDirection = counterDirection(old.direction);
  // New sender is the counter-maker (== auth uid, satisfying the create rule).
  const newSenderIsOrg = newDirection === "org_to_user";
  const newInput: CreateRequestInput = {
    chatId: old.chatId,
    direction: newDirection,
    senderUid: uid,
    senderName: newSenderIsOrg
      ? (old.orgName ?? old.senderName)
      : old.receiverName,
    receiverId: old.senderId,
    receiverName: old.senderName,
    amount: newAmount,
    currency: old.currency,
    note: old.note,
    orgId: old.orgId,
    orgName: old.orgName,
    orgLogoUrl: old.orgLogoUrl,
    // Trustee identity logged when the counter is org-sent.
    senderTrusteeId: newSenderIsOrg ? uid : undefined,
    senderTrusteeName: newSenderIsOrg ? old.receiverName : undefined,
    countersRequestId: old.id,
  };
  const { amount, note } = validateCreateInput(newInput);
  await assertSenderAllowed(newDirection, old.orgId, uid);

  const now = Date.now();
  const newRef = doc(collection(db, "p2pRequests"));
  const req = buildRequestDoc(newRef.id, newInput, amount, note, now);
  const reqData = Object.fromEntries(
    Object.entries(req).filter(([, v]) => v !== undefined),
  );
  const msgRef = doc(collection(db, "chats", old.chatId, "messages"));
  const msg = requestCardMessage(newRef.id, req, uid, now);
  msg.text = `🔁 ${req.senderName} countered with ${formatMoney(amount, old.currency)}`;

  const batch = writeBatch(db);
  batch.update(doc(db, "p2pRequests", old.id), {
    status: "countered",
    supersededBy: newRef.id,
    updatedAt: now,
  });
  batch.set(newRef, reqData);
  batch.set(msgRef, { ...msg, id: msgRef.id });
  await batch.commit();

  void touchChatPreview(old.chatId, msg.text, now);
  return newRef.id;
}

/** Sender (payer) marks the accepted request as paid — records THEIR OWN rail reference. */
export async function markPaid(
  requestId: string,
  uid: string,
  ref: string,
  via: PaidVia,
): Promise<void> {
  const r = await loadRequest(requestId);
  requireParty(r, uid, "sender");
  if (r.status !== "accepted") {
    throw new P2PError(
      "bad-state",
      "Only an accepted request can be marked as paid.",
    );
  }
  const cleanRef = (ref ?? "").trim().slice(0, PAID_REF_MAX);
  if (!cleanRef) {
    throw new P2PError(
      "invalid-amount",
      "Enter the transaction reference (bKash TrxID / UPI ref).",
    );
  }
  const viaList: PaidVia[] = ["bkash", "nagad", "upi", "bank", "cash", "other"];
  if (!viaList.includes(via)) {
    throw new P2PError("invalid-amount", "Choose how the money was sent.");
  }
  const now = Date.now();
  await updateDoc(doc(db, "p2pRequests", requestId), {
    status: "paid",
    paidRef: cleanRef,
    paidVia: via,
    paidAt: now,
    updatedAt: now,
  });
  // QR Intelligence (Phase 1): payment completed — closes the scan→payment funnel.
  // Fire-and-forget, fail-open.
  void logQrScan({
    qrId: requestId,
    qrType: 'p2p',
    uid,
    outcome: 'payment_completed',
    receiverId: r.receiverId,
  });
}

/** Receiver (payee) confirms the money arrived — request is settled. */
export async function confirmSettled(
  requestId: string,
  uid: string,
): Promise<void> {
  const r = await loadRequest(requestId);
  requireParty(r, uid, "receiver");
  if (r.status !== "paid") {
    throw new P2PError("bad-state", "There is no payment to confirm yet.");
  }
  const now = Date.now();
  await updateDoc(doc(db, "p2pRequests", requestId), {
    status: "settled",
    settledAt: now,
    updatedAt: now,
  });
}

/** Sender cancels a still-pending request. */
export async function cancelRequest(
  requestId: string,
  uid: string,
): Promise<void> {
  const r = await loadRequest(requestId);
  requireParty(r, uid, "sender");
  requireLive(r);
  if (r.status !== "pending") {
    throw new P2PError("bad-state", "Only a pending request can be cancelled.");
  }
  await updateDoc(doc(db, "p2pRequests", requestId), {
    status: "cancelled",
    updatedAt: Date.now(),
  });
  // QR Intelligence (Phase 1): a cancelled request is a payment that didn't happen.
  void logQrScan({
    qrId: requestId,
    qrType: 'p2p',
    uid,
    outcome: 'payment_failed',
    receiverId: r.receiverId,
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** One-shot fetch (parties-only read per rules). */
export async function getRequest(
  requestId: string,
): Promise<MoneyRequest | null> {
  try {
    const snap = await getDoc(doc(db, "p2pRequests", requestId));
    if (!snap.exists()) return null;
    return { ...(snap.data() as MoneyRequest), id: snap.id };
  } catch (e) {
    console.warn("[p2p] getRequest failed:", (e as Error)?.message);
    return null;
  }
}

/** Live subscription to a single request (for the in-chat card). */
export function subscribeRequest(
  requestId: string,
  cb: (r: MoneyRequest | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "p2pRequests", requestId),
    (snap) => {
      cb(
        snap.exists()
          ? ({ ...(snap.data() as MoneyRequest), id: snap.id } as MoneyRequest)
          : null,
      );
    },
    (e) => {
      console.warn("[p2p] subscribeRequest failed:", e?.message);
      cb(null);
    },
  );
}

/**
 * All requests where the user is sender OR receiver (two queries merged,
 * sorted by updatedAt desc). No orderBy on the queries — sorted client-side
 * so no composite index is required.
 */
export function subscribeUserRequests(
  uid: string,
  cb: (reqs: MoneyRequest[]) => void,
): Unsubscribe {
  const seen = new Map<string, MoneyRequest>();
  const emit = () => {
    cb([...seen.values()].sort((a, b) => b.updatedAt - a.updatedAt));
  };
  const onErr = (e: Error) =>
    console.warn("[p2p] subscribeUserRequests failed:", e?.message);
  const handler =
    (tag: string) =>
    (snap: {
      docChanges: () => Array<{
        type: string;
        doc: { id: string; data: () => unknown };
      }>;
    }) => {
      try {
        for (const ch of snap.docChanges()) {
          const r = {
            ...(ch.doc.data() as MoneyRequest),
            id: ch.doc.id,
          } as MoneyRequest;
          if (ch.type === "removed") seen.delete(r.id);
          else seen.set(r.id, r);
        }
        emit();
      } catch (e) {
        console.warn(
          `[p2p] ${tag} snapshot handling failed:`,
          (e as Error)?.message,
        );
      }
    };
  const colRef = collection(db, "p2pRequests");
  const u1 = onSnapshot(
    query(colRef, where("senderId", "==", uid)),
    handler("sender"),
    onErr,
  );
  const u2 = onSnapshot(
    query(colRef, where("receiverId", "==", uid)),
    handler("receiver"),
    onErr,
  );
  return () => {
    u1();
    u2();
  };
}

export type { PaidVia, RequestCurrency };
export { generateRequestQR } from "./p2pLogic";

/* --------------------------------------------------------------------------- */
/* Phase 3 notification wiring — self-listen transition watcher                */
/* =========================================================================== */
/* The rules are self-write-only, so each party's own device watches the       */
/* requests it belongs to and emits to ITSELF on lifecycle transitions:       */
/*   new request            → IMPORTANT to receiver (money_request/received)   */
/*   accepted / declined    → IMPORTANT to sender                              */
/*   countered              → IMPORTANT to the original sender                 */
/*   marked paid            → IMPORTANT to receiver                            */
/*   settled                → GENTLE to sender ("{name} has settled… 🙏")       */
/* Start once per session (see notifications/NotificationWiring). Emits are   */
/* fire-and-forget — a notification never blocks a money transition.           */
/* --------------------------------------------------------------------------- */

const VIA_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  upi: "UPI",
  bank: "bank transfer",
  platform_wallet: "Seva Wallet",
  cash: "cash",
  other: "their payment app",
};

/**
 * Watch my P2P requests and notify on transitions. Returns an unsubscribe.
 * The first snapshot is the baseline (no notifications for history).
 */
export function startP2PNotify(uid: string): Unsubscribe {
  if (!uid || uid === "anon") return () => undefined;
  const watchStart = Date.now();
  const lastStatus = new Map<string, string>();
  let baselined = false;

  const handle = (reqs: MoneyRequest[]) => {
    for (const r of reqs) {
      const prev = lastStatus.get(r.id);
      const amount = formatMoney(r.amount, r.currency);

      if (prev === undefined) {
        // First sighting. Baseline everything from history; only genuinely
        // new requests (created after the watcher started) notify.
        lastStatus.set(r.id, r.status);
        if (!baselined) continue;
        if (
          r.createdAt > watchStart &&
          r.status === "pending" &&
          r.receiverId === uid &&
          !r.countersRequestId
        ) {
          void notifyMoneyRequestReceived(uid, {
            name: r.senderName,
            otherUid: r.senderId,
            amount,
            requestId: r.id,
            chatId: r.chatId,
          });
        }
        continue;
      }

      if (prev === r.status) continue;
      lastStatus.set(r.id, r.status);
      if (prev !== "pending" && !(prev === "accepted" && r.status === "paid") && !(prev === "paid" && r.status === "settled")) {
        continue;
      }

      if (prev === "pending" && r.status === "accepted" && r.senderId === uid) {
        void notifyMoneyRequestAccepted(uid, {
          name: r.receiverName,
          otherUid: r.receiverId,
          amount,
          requestId: r.id,
          chatId: r.chatId,
        });
      } else if (prev === "pending" && r.status === "declined" && r.senderId === uid) {
        void notifyMoneyRequestDeclined(uid, {
          name: r.receiverName,
          otherUid: r.receiverId,
          amount,
          requestId: r.id,
          chatId: r.chatId,
        });
      } else if (prev === "pending" && r.status === "countered" && r.senderId === uid) {
        // The counter-offer is a NEW request (r.supersededBy); fetch it for
        // the real amount + counter-maker name. Best-effort — fall back to
        // the old request's own fields if the read fails.
        void (async () => {
          let name = r.receiverName;
          let amt = amount;
          let newId = r.id;
          try {
            if (r.supersededBy) {
              const fresh = await getRequest(r.supersededBy);
              if (fresh) {
                name = fresh.senderName;
                amt = formatMoney(fresh.amount, fresh.currency);
                newId = fresh.id;
              }
            }
          } catch {
            /* fall back to old-request fields */
          }
          await notifyMoneyRequestCountered(uid, {
            name,
            otherUid: r.receiverId,
            amount: amt,
            requestId: newId,
            chatId: r.chatId,
          });
        })();
      } else if (prev === "accepted" && r.status === "paid" && r.receiverId === uid) {
        void notifyMoneyMarkedPaid(uid, {
          name: r.senderName,
          otherUid: r.senderId,
          amount,
          requestId: r.id,
          chatId: r.chatId,
          via: VIA_LABEL[r.paidVia ?? ""] ?? VIA_LABEL.other,
        });
      } else if (prev === "paid" && r.status === "settled" && r.senderId === uid) {
        void notifyMoneySettled(uid, {
          name: r.receiverName,
          otherUid: r.receiverId,
          amount,
          requestId: r.id,
          chatId: r.chatId,
        });
      }
    }
    baselined = true;
  };

  return subscribeUserRequests(uid, handle);
}
