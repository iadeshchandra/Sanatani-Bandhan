/**
 * MoneyRequestCard.tsx — the in-chat money request card.
 * ======================================================
 * Renders natively inside a chat thread for `request_card` messages.
 * Subscribes live to `p2pRequests/{id}` so both parties see every
 * status transition instantly.
 *
 * Semantics: sender = PAYER (proposes "I will send you <amount>"),
 *            receiver = PAYEE (accepts/declines/counters, confirms receipt).
 * Coordination layer, NOT custody — the app never holds P2P money.
 *
 * Phase-1 ChatThread integration: render <RequestCardLoader requestId={msg.requestId}
 * currentUid={me} /> for messages with kind === 'request_card'.
 */

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  HandCoins,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  formatMoney,
  requestStatusLabel,
  type MoneyRequest,
  type RequestStatus,
} from "./types";
import {
  PAID_VIA_OPTIONS,
  effectiveStatus,
  expiryParts,
  msUntilExpiry,
  type PaidVia,
} from "./p2pLogic";
import {
  P2PError,
  cancelRequest,
  confirmSettled,
  counterOffer,
  getRequest,
  markPaid,
  respondToRequest,
  subscribeRequest,
} from "./p2pService";
import { T } from "../solo/ui";
import { useLanguage } from "../context/LanguageContext";
import RequestQR from "./RequestQR";

export interface MoneyRequestCardProps {
  request: MoneyRequest;
  currentUid: string;
  /** Show a verification badge next to a user sender (org senders are auto-badged). */
  senderVerified?: boolean;
  /** Static preview — no live subscription, no action buttons (used by RequestModal). */
  preview?: boolean;
  className?: string;
}

const PILL: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-900 border-emerald-300",
  declined: "bg-stone-200 text-stone-600 border-stone-300",
  countered: "bg-violet-100 text-violet-900 border-violet-300",
  paid: "bg-sky-100 text-sky-900 border-sky-300",
  settled: "bg-emerald-600 text-white border-emerald-700",
  cancelled: "bg-stone-200 text-stone-500 border-stone-300",
  expired: "bg-stone-200 text-stone-500 border-stone-300",
};

const BTN =
  "min-h-[44px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50";

function useNowTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Avatar({
  name,
  photoUrl,
  logo,
}: {
  name: string;
  photoUrl?: string;
  logo?: string;
}) {
  const src = logo || photoUrl;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-10 h-10 rounded-full object-cover border border-amber-200"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-extrabold">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function RailLabel({ via }: { via: PaidVia }) {
  const labels: Record<PaidVia, [string, string, string]> = {
    bkash: ["bKash", "বিকাশ", "बीकैश"],
    nagad: ["Nagad", "নগদ", "नगद"],
    upi: ["UPI", "ইউপিআই", "यूपीआई"],
    bank: ["Bank", "ব্যাংক", "बैंक"],
    cash: ["Cash", "নগদ", "नकद"],
    other: ["Other", "অন্যান্য", "अन्य"],
  };
  const [en, bn, hi] = labels[via];
  return <T en={en} bn={bn} hi={hi} />;
}

export default function MoneyRequestCard({
  request,
  currentUid,
  senderVerified = false,
  preview = false,
  className = "",
}: MoneyRequestCardProps) {
  const { currentLang } = useLanguage();
  const lang = (
    currentLang === "bn" || currentLang === "hi" ? currentLang : "en"
  ) as "en" | "bn" | "hi";
  const [live, setLive] = useState<MoneyRequest>(request);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState(String(request.amount));
  const [showPaid, setShowPaid] = useState(false);
  const [paidRef, setPaidRef] = useState("");
  const [paidVia, setPaidVia] = useState<PaidVia>("bkash");
  const [showQR, setShowQR] = useState(false);
  const [superseding, setSuperseding] = useState<MoneyRequest | null>(null);
  const now = useNowTick();

  useEffect(() => {
    setLive(request);
    setCounterAmount(String(request.amount));
  }, [request]);

  useEffect(() => {
    if (preview) return;
    const unsub = subscribeRequest(request.id, (r) => {
      if (r) setLive(r);
    });
    return unsub;
  }, [request.id, preview]);

  useEffect(() => {
    if (live.status === "countered" && live.supersededBy && !superseding) {
      getRequest(live.supersededBy).then((r) => {
        if (r) setSuperseding(r);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.status, live.supersededBy]);

  const status = effectiveStatus(live, now);
  const isSender = live.senderId === currentUid;
  const isReceiver = live.receiverId === currentUid;
  const isOrgSent = !!live.orgId;
  const left = expiryParts(msUntilExpiry(live, now));

  const locale = lang === "bn" ? "bn-BD" : lang === "hi" ? "hi-IN" : "en-IN";
  const fmtTime = (ts?: number) =>
    ts
      ? new Date(ts).toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setShowCounter(false);
      setShowPaid(false);
    } catch (e) {
      setError(
        e instanceof P2PError
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  const pillLabel = requestStatusLabel(status, lang);

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header: sender identity */}
      <div className="flex items-center gap-3 p-3 sm:p-4 pb-2">
        <Avatar
          name={live.senderName}
          photoUrl={live.senderPhotoUrl}
          logo={live.orgLogoUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-stone-900 truncate">
              {live.senderName}
            </span>
            {(isOrgSent || senderVerified) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                {isOrgSent ? (
                  <Building2 className="w-3 h-3" />
                ) : (
                  <BadgeCheck className="w-3 h-3" />
                )}
                <T en="Verified" bn="যাচাইকৃত" hi="सत्यापित" />
              </span>
            )}
          </div>
          <div className="text-xs text-stone-500 flex items-center gap-1 flex-wrap">
            {isOrgSent ? (
              <>
                <Building2 className="w-3 h-3" />
                <T
                  en="Organisation request"
                  bn="প্রতিষ্ঠানের অনুরোধ"
                  hi="संस्था का अनुरोध"
                />
                {live.senderTrusteeName && (
                  <span className="text-stone-400">
                    · <T en="by" bn="প্রেরক" hi="द्वारा" />{" "}
                    {live.senderTrusteeName}
                  </span>
                )}
              </>
            ) : (
              <>
                <HandCoins className="w-3 h-3" />
                <T
                  en="Personal request"
                  bn="ব্যক্তিগত অনুরোধ"
                  hi="व्यक्तिगत अनुरोध"
                />
              </>
            )}
          </div>
        </div>
        <span
          className={`text-xs font-bold border rounded-full px-2.5 py-1 whitespace-nowrap ${PILL[status]}`}
        >
          {pillLabel}
        </span>
      </div>

      {/* Amount */}
      <div className="px-3 sm:px-4 pb-1">
        <div className="text-3xl font-extrabold text-stone-900 tabular-nums tracking-tight">
          {formatMoney(live.amount, live.currency)}
        </div>
        <div className="text-sm text-stone-600 mt-0.5">
          <T en="to" bn="প্রাপক" hi="को" />{" "}
          <span className="font-semibold text-stone-800">
            {live.receiverName}
          </span>
        </div>
        {live.note && (
          <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
            “{live.note}”
          </p>
        )}
        {status === "pending" && !left.expired && (
          <div className="flex items-center gap-1 text-xs text-amber-700 mt-1.5">
            <Clock className="w-3.5 h-3.5" />
            <T en="Expires in" bn="মেয়াদ শেষ হবে" hi="समाप्त होगा" />{" "}
            <span className="font-bold tabular-nums">
              {left.h > 0 ? `${left.h}h ` : ""}
              {left.m}m
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 mb-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Actions */}
      {!preview && (
        <div className="p-3 sm:p-4 pt-2 space-y-2">
          {isReceiver && status === "pending" && !showCounter && (
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`${BTN} bg-emerald-600 text-white`}
                disabled={!!busy}
                onClick={() =>
                  run("accept", () =>
                    respondToRequest(live.id, currentUid, "accepted"),
                  )
                }
              >
                <Check className="w-4 h-4" />
                {busy === "accept" ? (
                  "…"
                ) : (
                  <T en="Accept" bn="গ্রহণ" hi="स्वीकार" />
                )}
              </button>
              <button
                className={`${BTN} bg-stone-200 text-stone-700`}
                disabled={!!busy}
                onClick={() => setShowCounter(true)}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <T en="Counter" bn="পাল্টা" hi="प्रति" />
              </button>
              <button
                className={`${BTN} bg-white border border-stone-300 text-stone-600`}
                disabled={!!busy}
                onClick={() =>
                  run("decline", () =>
                    respondToRequest(live.id, currentUid, "declined"),
                  )
                }
              >
                <X className="w-4 h-4" />
                {busy === "decline" ? (
                  "…"
                ) : (
                  <T en="Decline" bn="প্রত্যাখ্যান" hi="अस्वीकार" />
                )}
              </button>
            </div>
          )}

          {isReceiver && status === "pending" && showCounter && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <label className="text-xs font-bold text-violet-900">
                <T
                  en="Your counter amount"
                  bn="আপনার পাল্টা পরিমাণ"
                  hi="आपकी प्रति-राशि"
                />{" "}
                ({live.currency})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={1_000_000}
                  inputMode="decimal"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-xl border border-violet-300 px-3 text-lg font-bold tabular-nums"
                />
                <button
                  className={`${BTN} bg-violet-600 text-white`}
                  disabled={!!busy}
                  onClick={() =>
                    run("counter", async () => {
                      await counterOffer(
                        live.id,
                        currentUid,
                        Number(counterAmount),
                      );
                    })
                  }
                >
                  {busy === "counter" ? (
                    "…"
                  ) : (
                    <T en="Send" bn="পাঠান" hi="भेजें" />
                  )}
                </button>
                <button
                  className={`${BTN} bg-white border border-stone-300`}
                  onClick={() => setShowCounter(false)}
                >
                  <T en="Back" bn="ফিরে যান" hi="वापस" />
                </button>
              </div>
              <p className="text-xs text-violet-700">
                <T
                  en="This creates a new request and marks this one as countered."
                  bn="এটি একটি নতুন অনুরোধ তৈরি করবে এবং এটিকে পাল্টা হিসেবে চিহ্নিত করবে।"
                  hi="यह एक नया अनुरोध बनाएगा और इसे प्रतिप्रस्ताव के रूप में चिह्नित करेगा।"
                />
              </p>
            </div>
          )}

          {isSender && status === "accepted" && !showPaid && (
            <button
              className={`${BTN} w-full bg-amber-500 text-white`}
              disabled={!!busy}
              onClick={() => setShowPaid(true)}
            >
              <HandCoins className="w-4 h-4" />
              <T
                en="Mark as paid"
                bn="পরিশোধিত হিসেবে চিহ্নিত করুন"
                hi="भुगतान के रूप में चिह्नित करें"
              />
            </button>
          )}

          {isSender && status === "accepted" && showPaid && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-900">
                <T
                  en="Send the money on your own bKash / Nagad / UPI account first, then record the reference here."
                  bn="প্রথমে আপনার নিজের বিকাশ / নগদ / ইউপিআই অ্যাকাউন্ট থেকে টাকা পাঠান, তারপর এখানে রেফারেন্স লিখুন।"
                  hi="पहले अपने स्वयं के बीकैश / नगद / यूपीआई खाते से पैसे भेजें, फिर यहां संदर्भ दर्ज करें।"
                />
              </p>
              <div className="flex gap-2">
                <select
                  value={paidVia}
                  onChange={(e) => setPaidVia(e.target.value as PaidVia)}
                  className="min-h-[44px] rounded-xl border border-amber-300 bg-white px-2 text-sm font-semibold"
                >
                  {PAID_VIA_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v === "bkash"
                        ? "bKash"
                        : v === "nagad"
                          ? "Nagad"
                          : v === "upi"
                            ? "UPI"
                            : v === "bank"
                              ? "Bank"
                              : v === "cash"
                                ? "Cash"
                                : "Other"}
                    </option>
                  ))}
                </select>
                <input
                  value={paidRef}
                  onChange={(e) => setPaidRef(e.target.value)}
                  placeholder="TrxID / UPI ref"
                  maxLength={64}
                  className="min-h-[44px] flex-1 rounded-xl border border-amber-300 px-3 text-sm font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  className={`${BTN} flex-1 bg-amber-500 text-white`}
                  disabled={!!busy || !paidRef.trim()}
                  onClick={() =>
                    run("paid", () =>
                      markPaid(live.id, currentUid, paidRef, paidVia),
                    )
                  }
                >
                  {busy === "paid" ? (
                    "…"
                  ) : (
                    <T
                      en="Confirm sent"
                      bn="পাঠানো নিশ্চিত করুন"
                      hi="भेजना पुष्टि करें"
                    />
                  )}
                </button>
                <button
                  className={`${BTN} bg-white border border-stone-300`}
                  onClick={() => setShowPaid(false)}
                >
                  <T en="Back" bn="ফিরে যান" hi="वापस" />
                </button>
              </div>
            </div>
          )}

          {isReceiver && status === "paid" && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <p className="text-sm text-sky-900">
                <span className="font-bold">
                  <RailLabel via={(live.paidVia as PaidVia) ?? "other"} />
                </span>
                {live.paidRef && (
                  <span className="font-mono"> · {live.paidRef}</span>
                )}
              </p>
              <button
                className={`${BTN} w-full bg-sky-600 text-white`}
                disabled={!!busy}
                onClick={() =>
                  run("settle", () => confirmSettled(live.id, currentUid))
                }
              >
                <ShieldCheck className="w-4 h-4" />
                {busy === "settle" ? (
                  "…"
                ) : (
                  <T
                    en="Confirm received"
                    bn="প্রাপ্তি নিশ্চিত করুন"
                    hi="प्राप्ति की पुष्टि करें"
                  />
                )}
              </button>
            </div>
          )}

          {isSender && status === "pending" && (
            <button
              className={`${BTN} w-full bg-white border border-stone-300 text-stone-500`}
              disabled={!!busy}
              onClick={() =>
                run("cancel", () => cancelRequest(live.id, currentUid))
              }
            >
              {busy === "cancel" ? (
                "…"
              ) : (
                <T
                  en="Cancel request"
                  bn="অনুরোধ বাতিল করুন"
                  hi="अनुरोध रद्द करें"
                />
              )}
            </button>
          )}

          {/* QR + counter link */}
          <div className="flex items-center gap-2">
            <button
              className={`${BTN} flex-1 bg-white border border-amber-300 text-amber-800`}
              onClick={() => setShowQR(true)}
            >
              <QrCode className="w-4 h-4" />
              <T en="Show QR" bn="কিউআর দেখুন" hi="क्यूआर दिखाएं" />
            </button>
            {status === "countered" && superseding && (
              <span className="text-xs text-violet-700 font-semibold">
                <T
                  en="Countered with"
                  bn="পাল্টা প্রস্তাব"
                  hi="प्रतिप्रस्ताव"
                />{" "}
                <span className="tabular-nums">
                  {formatMoney(superseding.amount, superseding.currency)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* State history */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2 space-y-1 text-xs text-stone-600">
          <div className="flex justify-between gap-2">
            <span>
              <T en="Requested" bn="অনুরোধ করা হয়েছে" hi="अनुरोध किया गया" />
            </span>
            <span className="tabular-nums text-stone-500">
              {fmtTime(live.createdAt)}
            </span>
          </div>
          {live.paidAt && (
            <div className="flex justify-between gap-2">
              <span>
                <T en="Marked paid" bn="পরিশোধিত চিহ্নিত" hi="भुगतान चिह्नित" />
                {live.paidRef ? (
                  <span className="font-mono"> · {live.paidRef}</span>
                ) : null}
              </span>
              <span className="tabular-nums text-stone-500">
                {fmtTime(live.paidAt)}
              </span>
            </div>
          )}
          {live.settledAt && (
            <div className="flex justify-between gap-2">
              <span className="font-bold text-emerald-700">
                <T en="Settled" bn="নিষ্পত্তি" hi="निपटाया" /> ✓
              </span>
              <span className="tabular-nums text-stone-500">
                {fmtTime(live.settledAt)}
              </span>
            </div>
          )}
          {(status === "declined" ||
            status === "cancelled" ||
            status === "countered") && (
            <div className="flex justify-between gap-2">
              <span>{pillLabel}</span>
              <span className="tabular-nums text-stone-500">
                {fmtTime(live.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {!preview && (
        <RequestQR
          request={live}
          open={showQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

/**
 * RequestCardLoader — drop-in for the ChatThread: subscribes by requestId and
 * renders the live card. Use for messages with kind === 'request_card'.
 */
export function RequestCardLoader({
  requestId,
  currentUid,
  senderVerified,
  className,
}: {
  requestId: string;
  currentUid: string;
  senderVerified?: boolean;
  className?: string;
}) {
  const [req, setReq] = useState<MoneyRequest | null>(null);
  useEffect(() => subscribeRequest(requestId, setReq), [requestId]);
  if (!req) {
    return (
      <div
        className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 animate-pulse ${className ?? ""}`}
      >
        <div className="h-6 w-2/3 bg-amber-100 rounded mb-2" />
        <div className="h-4 w-1/3 bg-amber-100 rounded" />
      </div>
    );
  }
  return (
    <MoneyRequestCard
      request={req}
      currentUid={currentUid}
      senderVerified={senderVerified}
      className={className}
    />
  );
}
