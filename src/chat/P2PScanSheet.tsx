/**
 * chat/P2PScanSheet.tsx — scan a P2P payment QR → prefill a money request.
 * ========================================================================
 * A DEDICATED scanner for SB-P2P codes — deliberately separate from the
 * security-pass QRScanner (dynamic devotee passes) and the ZoneQrScanSheet
 * (temple codes). Each QR family gets its own scanner, its own copy, its
 * own flow. Mixing them contaminates security-sensitive components.
 *
 * FLOW:
 *   1. Scan → parseRequestQR (strict format gate).
 *   2. getRequest(requestId) — try to fetch the live request.
 *      - Found + pending + I'm a party → show the live MoneyRequestCard
 *        (accept / decline right here).
 *      - Found + expired → warm "this request has expired" (no crash).
 *      - Not found / no access → prefill mode: show amount + receiver,
 *        one warm button opens the RequestModal prefilled.
 *   3. The sender ALWAYS confirms before sending. Scanning never moves money.
 *
 * Design law: the QR is a shortcut, not a trust bypass.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  HandCoins,
  QrCode,
  X,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Send,
  Clock,
} from "lucide-react";
import {
  parseRequestQR,
  effectiveStatus,
  type ParsedRequestQR,
  type RequestCurrency,
} from "./p2pLogic";
import { getRequest } from "./p2pService";
import { getDevoteeProfile } from "../social/devoteeService";
import { formatMoney, type MoneyRequest } from "./types";
import MoneyRequestCard from "./MoneyRequestCard";
import RequestModal from "./RequestModal";
import { logQrScan } from "../qrIntel/qrIntelService";
import { UNKNOWN_QR_ID } from "../qrIntel/qrIntel";

type TriCopy = { en: string; bn: string; hi: string };
const tr = (copy: TriCopy): string => {
  try {
    const lang = localStorage.getItem("sanatani_lang") || "en";
    if (lang === "bn") return copy.bn;
    if (lang === "hi") return copy.hi;
  } catch {
    /* sandboxed — fall through to English */
  }
  return copy.en;
};

type ScanState =
  | { kind: "scanning" }
  | { kind: "verifying" }
  | { kind: "existing"; request: MoneyRequest }
  | { kind: "prefill"; parsed: ParsedRequestQR; receiverName: string }
  | {
      kind: "error";
      reason: "bad_format" | "expired" | "camera" | "lookup_failed";
    };

export interface P2PScanSheetProps {
  open: boolean;
  onClose: () => void;
  currentUser: { uid: string; displayName?: string; photoUrl?: string };
}

export default function P2PScanSheet({
  open,
  onClose,
  currentUser,
}: P2PScanSheetProps) {
  const containerId = useRef(
    `p2p-qr-${Math.random().toString(36).substring(2, 9)}`,
  ).current;
  const qrRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [state, setState] = useState<ScanState>({ kind: "scanning" });
  const [requestOpen, setRequestOpen] = useState(false);

  const stop = useCallback(async () => {
    try {
      if (qrRef.current?.isScanning) await qrRef.current.stop();
      qrRef.current?.clear();
    } catch {
      /* best effort */
    }
    qrRef.current = null;
  }, []);

  const reset = useCallback(() => {
    busyRef.current = false;
    setState({ kind: "scanning" });
    setRequestOpen(false);
    try {
      qrRef.current?.resume();
    } catch {
      /* noop */
    }
  }, []);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        qrRef.current?.pause();
      } catch {
        /* noop */
      }

      // Gate 1: strict SB-P2P format parse.
      const parsed = parseRequestQR(decodedText);
      if (!parsed) {
        // QR Intelligence (Phase 1): log the invalid scan. Fire-and-forget,
        // fail-open — analytics never blocks the scan flow.
        void logQrScan({
          qrId: UNKNOWN_QR_ID,
          qrType: 'p2p',
          uid: currentUser.uid,
          outcome: 'invalid',
        });
        setState({ kind: "error", reason: "bad_format" });
        return;
      }
      // QR Intelligence (Phase 1): log the valid scan.
      void logQrScan({
        qrId: parsed.requestId,
        qrType: 'p2p',
        uid: currentUser.uid,
        outcome: 'parsed',
        amount: parsed.amount,
        currency: parsed.currency,
        receiverId: parsed.receiverId,
      });

      // Gate 2: try to fetch the live request.
      setState({ kind: "verifying" });
      let req: MoneyRequest | null = null;
      try {
        req = await getRequest(parsed.requestId);
      } catch {
        req = null;
      }

      if (req) {
        const status = effectiveStatus(req);
        if (status === "expired") {
          // QR Intelligence (Phase 1): the QR was valid but the request expired.
          void logQrScan({
            qrId: parsed.requestId,
            qrType: 'p2p',
            uid: currentUser.uid,
            outcome: 'expired',
            amount: parsed.amount,
            currency: parsed.currency,
            receiverId: parsed.receiverId,
          });
          setState({ kind: "error", reason: "expired" });
          return;
        }
        // Live request — show it. MoneyRequestCard handles accept/decline
        // for the receiver, and read-only display for anyone else.
        setState({ kind: "existing", request: req });
        return;
      }

      // No live request (deleted, or we have no access) → prefill mode.
      // Look up the receiver's name for a warm display.
      let receiverName = "";
      try {
        const profile = await getDevoteeProfile(parsed.receiverId);
        receiverName = profile?.displayName || "";
      } catch {
        /* fall through — name stays empty */
      }
      setState({ kind: "prefill", parsed, receiverName });
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Fresh state each time the sheet opens.
    busyRef.current = false;
    setState({ kind: "scanning" });
    setRequestOpen(false);
    (async () => {
      try {
        const qr = new Html5Qrcode(containerId);
        qrRef.current = qr;
        await qr.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          handleDecoded,
          () => undefined,
        );
        if (cancelled) await stop();
      } catch {
        if (!cancelled) setState({ kind: "error", reason: "camera" });
      }
    })();
    return () => {
      cancelled = true;
      void stop();
    };
  }, [open, containerId, handleDecoded, stop]);

  if (!open) return null;

  const errorCopy = (
    reason: "bad_format" | "expired" | "camera" | "lookup_failed",
  ): TriCopy => {
    switch (reason) {
      case "bad_format":
        return {
          en: "This doesn't look like a Sanatani Bandhan payment code 🪔. Payment codes start with the SB-P2P mark — ask the sender to show you their request QR.",
          bn: "এটি সনাতনী বন্ধনের পেমেন্ট কোড বলে মনে হচ্ছে না 🪔। প্রেরককে তাদের অনুরোধের QR দেখাতে বলুন।",
          hi: "यह सनातनी बंधन का पेमेंट कोड नहीं लगता 🪔। भेजने वाले से उनका अनुरोध QR दिखाने को कहें।",
        };
      case "expired":
        return {
          en: "This request has expired 🕰️. Money requests last 48 hours — ask the sender to create a fresh one.",
          bn: "এই অনুরোধের মেয়াদ শেষ 🕰️। টাকার অনুরোধ ৪৮ ঘণ্টা থাকে — প্রেরককে নতুন করে তৈরি করতে বলুন।",
          hi: "यह अनुरोध समाप्त हो गया है 🕰️। पैसे के अनुरोध 48 घंटे रहते हैं — भेजने वाले से नया बनाने को कहें।",
        };
      case "camera":
        return {
          en: "We need your camera's blessing to scan — please allow camera access and try again.",
          bn: "স্ক্যান করতে ক্যামেরার অনুমতি দিন, তারপর আবার চেষ্টা করুন।",
          hi: "स्कैन के लिए कैमरे की अनुमति दें, फिर पुनः प्रयास करें।",
        };
      default:
        return {
          en: "We couldn't read that code. Please try again.",
          bn: "কোডটি পড়া যায়নি। আবার চেষ্টা করুন।",
          hi: "वह कोड पढ़ा नहीं जा सका। कृपया पुनः प्रयास करें।",
        };
    }
  };

  const prefill = state.kind === "prefill" ? state : null;

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-stone-950/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                {tr({
                  en: "Scan payment code",
                  bn: "পেমেন্ট কোড স্ক্যান করুন",
                  hi: "पेमेंट कोड स्कैन करें",
                })}
              </h3>
              <p className="text-[11px] text-stone-500">
                {tr({
                  en: "Point at the sender's request QR",
                  bn: "প্রেরকের অনুরোধের QR-এর দিকে ধরুন",
                  hi: "भेजने वाले के अनुरोध QR की ओर इशारा करें",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(state.kind === "scanning" || state.kind === "verifying") && (
          <div className="relative bg-black aspect-square">
            <div id={containerId} className="w-full h-full" />
            {state.kind === "scanning" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-60 border-2 border-dashed border-amber-400/70 rounded-3xl relative">
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-amber-400/80 animate-pulse" />
                </div>
              </div>
            )}
            {state.kind === "verifying" && (
              <div className="absolute inset-0 bg-stone-950/70 flex items-center justify-center">
                <p className="text-amber-200 text-sm font-bold animate-pulse">
                  {tr({
                    en: "Reading the code… 🪔",
                    bn: "কোড পড়া হচ্ছে… 🪔",
                    hi: "कोड पढ़ा जा रहा है… 🪔",
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {state.kind === "existing" && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700">
                {tr({
                  en: "Found the live request",
                  bn: "চলমান অনুরোধ পাওয়া গেছে",
                  hi: "सक्रिय अनुरोध मिल गया",
                })}
              </p>
            </div>
            <MoneyRequestCard
              request={state.request}
              currentUid={currentUser.uid}
              senderVerified={false}
            />
            <p className="text-center text-[11px] text-stone-400 mt-3">
              {tr({
                en: "Respond above — nothing happens until you choose.",
                bn: "উপরে জবাব দিন — আপনি না চাইলে কিছুই হবে না।",
                hi: "ऊपर जवाब दें — आपके चुने बिना कुछ नहीं होगा।",
              })}
            </p>
          </div>
        )}

        {prefill && (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <HandCoins className="w-8 h-8 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  {tr({
                    en: "Payment code read",
                    bn: "পেমেন্ট কোড পড়া হয়েছে",
                    hi: "पेमेंट कोड पढ़ लिया गया",
                  })}
                </p>
                <p className="text-2xl font-extrabold text-stone-900 tabular-nums mt-1">
                  {formatMoney(prefill.parsed.amount, prefill.parsed.currency)}
                </p>
                <p className="text-sm text-stone-600 mt-0.5">
                  {tr({ en: "to", bn: "প্রাপক", hi: "को" })}{" "}
                  <span className="font-semibold text-stone-800">
                    {prefill.receiverName ||
                      tr({
                        en: "a fellow devotee",
                        bn: "একজন ভক্ত",
                        hi: "एक भक्त",
                      })}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="mt-4 w-full min-h-[52px] rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-base flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {tr({
                en: "Review & send request",
                bn: "পর্যালোচনা করে অনুরোধ পাঠান",
                hi: "समीक्षा करें और अनुरोध भेजें",
              })}
            </button>
            <p className="text-center text-[11px] text-stone-400 mt-2">
              {tr({
                en: "You'll review everything before anything is sent — scanning never moves money.",
                bn: "পাঠানোর আগে সবকিছু পর্যালোচনা করবেন — স্ক্যানে কখনো টাকা যায় না।",
                hi: "भेजने से पहले आप सब कुछ देखेंगे — स्कैन से कभी पैसे नहीं जाते।",
              })}
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              {state.reason === "expired" ? (
                <Clock className="w-8 h-8 text-amber-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
              )}
              <p className="text-sm text-stone-700 leading-relaxed">
                {tr(errorCopy(state.reason))}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-4 w-full min-h-[52px] rounded-2xl bg-stone-900 text-white font-extrabold text-base flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              {tr({ en: "Try again", bn: "আবার চেষ্টা করুন", hi: "पुनः प्रयास करें" })}
            </button>
          </div>
        )}
      </div>

      {/* Prefilled request composer — the sender always confirms. */}
      {prefill && (
        <RequestModal
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          chatId=""
          currentUser={{
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Sanatani",
            photoUrl: currentUser.photoUrl,
          }}
          recipient={{
            id: prefill.parsed.receiverId,
            name: prefill.receiverName || "Fellow devotee",
          }}
          initialAmount={prefill.parsed.amount}
          initialCurrency={prefill.parsed.currency}
          onSent={onClose}
        />
      )}
    </div>
  );
}
