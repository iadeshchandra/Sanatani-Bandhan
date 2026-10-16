/**
 * p2pLogic.ts — pure helpers for P2P money requests.
 * ==================================================
 * No Firebase imports: safe to unit-test in plain node.
 *
 * CRITICAL PRINCIPLE — coordination layer, NOT custody.
 * The app NEVER holds P2P money. Actual transfers happen on the users'
 * own bKash / Nagad / UPI accounts. These helpers only track agreements.
 *
 * Semantics of a MoneyRequest (payment proposal handshake):
 *   sender   = the PAYER. Proposes "I will send you <amount>".
 *   receiver = the PAYEE. Accepts / declines / counters, then confirms receipt.
 * Lifecycle: pending -> accepted -> paid -> settled
 *            pending -> declined | cancelled | countered | (expired by time)
 */

import {
  formatMoney,
  type MoneyRequest,
  type RequestDirection,
  type RequestStatus,
} from "./types";

/** Max single request — mirrors the firestore.rules create guard. */
export const MAX_REQUEST_AMOUNT = 1_000_000;

/** Requests live 48h, then read as expired (rules have no expired write path). */
export const REQUEST_TTL_MS = 48 * 60 * 60 * 1000;

/** Note length cap. */
export const REQUEST_NOTE_MAX = 280;

/** Payment-ref (bKash TrxID / UPI ref) cap. */
export const PAID_REF_MAX = 64;

export type RequestCurrency = "BDT" | "INR" | "USD";
export const REQUEST_CURRENCIES: RequestCurrency[] = ["BDT", "INR", "USD"];

export type PaidVia = "bkash" | "nagad" | "upi" | "bank" | "cash" | "other";
export const PAID_VIA_OPTIONS: PaidVia[] = [
  "bkash",
  "nagad",
  "upi",
  "bank",
  "cash",
  "other",
];

/** Org roles allowed to send a request on behalf of an org (RBAC). */
export const ORG_SENDER_ROLES = [
  "Trustee",
  "TRUSTEE",
  "Accountant",
  "ACCOUNTANT",
  "SuperAdmin",
  "SUPER_ADMIN",
];

/** Validate an amount. Returns an error message or null when valid. */
export function validateAmount(amount: number): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "Enter a valid amount.";
  }
  if (amount <= 0) {
    return "Amount must be greater than zero.";
  }
  if (amount > MAX_REQUEST_AMOUNT) {
    return `Amount cannot exceed ${formatMoney(MAX_REQUEST_AMOUNT)}.`;
  }
  return null;
}

/** Round to 2 decimals so Firestore stores a clean number. */
export function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** True when a pending request has passed its expiry (derived — never written). */
export function isRequestExpired(
  r: { status: RequestStatus; expiresAt: number },
  now = Date.now(),
): boolean {
  return r.status === "pending" && r.expiresAt <= now;
}

/**
 * Display status: pending requests past expiry read as 'expired'.
 * firestore.rules has no write path to 'expired', so this is derived only.
 */
export function effectiveStatus(
  r: { status: RequestStatus; expiresAt: number },
  now = Date.now(),
): RequestStatus {
  return isRequestExpired(r, now) ? "expired" : r.status;
}

/** Flip the direction for a counter-offer (sender <-> receiver swap). */
export function counterDirection(d: RequestDirection): RequestDirection {
  if (d === "org_to_user") return "user_to_org";
  if (d === "user_to_org") return "org_to_user";
  return "user_to_user";
}

/** Milliseconds until expiry (negative when expired). */
export function msUntilExpiry(
  r: { expiresAt: number },
  now = Date.now(),
): number {
  return r.expiresAt - now;
}

/** Compact "47h 12m" / "25m" / "expired" label parts. */
export function expiryParts(ms: number): {
  h: number;
  m: number;
  expired: boolean;
} {
  if (ms <= 0) return { h: 0, m: 0, expired: true };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { h, m, expired: false };
}

// ---------------------------------------------------------------------------
// QR payload
// ---------------------------------------------------------------------------

export const P2P_QR_SCHEME = "SB-P2P";
export const P2P_QR_VERSION = 1;

export interface ParsedRequestQR {
  requestId: string;
  amount: number;
  currency: RequestCurrency;
  receiverId: string;
}

/**
 * QR payload format (v1):
 *   SB-P2P:1:<requestId>:<amount>:<currency>:<receiverId>
 * Firestore auto-IDs are alphanumeric, so ':' is a safe separator.
 */
export function generateRequestQR(
  r: Pick<MoneyRequest, "id" | "amount" | "currency" | "receiverId">,
): string {
  return [
    P2P_QR_SCHEME,
    P2P_QR_VERSION,
    r.id,
    r.amount,
    r.currency,
    r.receiverId,
  ].join(":");
}

/** Parse + validate a scanned payload. Returns null when malformed. */
export function parseRequestQR(payload: string): ParsedRequestQR | null {
  if (typeof payload !== "string") return null;
  const parts = payload.split(":");
  if (parts.length !== 6) return null;
  const [scheme, ver, requestId, amountRaw, currency, receiverId] = parts;
  if (scheme !== P2P_QR_SCHEME || ver !== String(P2P_QR_VERSION)) return null;
  if (!requestId || !receiverId) return null;
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || validateAmount(amount) !== null) return null;
  if (!(REQUEST_CURRENCIES as string[]).includes(currency)) return null;
  return {
    requestId,
    amount,
    currency: currency as RequestCurrency,
    receiverId,
  };
}

/** Resolve the org branding that should appear on a request card. */
export function orgBrandOf(
  r: Pick<MoneyRequest, "orgId" | "orgName" | "orgLogoUrl">,
): {
  orgId?: string;
  orgName?: string;
  orgLogoUrl?: string;
} {
  if (!r.orgId) return {};
  return { orgId: r.orgId, orgName: r.orgName, orgLogoUrl: r.orgLogoUrl };
}
