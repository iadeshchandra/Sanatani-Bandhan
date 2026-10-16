/**
 * RequestQR.tsx — scannable QR for a money request.
 * =================================================
 * Shows the request's QR payload (see generateRequestQR in p2pLogic.ts),
 * amount, recipient and expiry, plus a Share button that exports the QR as
 * a PNG via the Web Share API (WhatsApp-forwardable) with download fallback.
 */

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import { formatMoney, type MoneyRequest } from "./types";
import { expiryParts, generateRequestQR, msUntilExpiry } from "./p2pLogic";
import { T } from "../solo/ui";
import { useLanguage } from "../context/LanguageContext";

export interface RequestQRProps {
  request: MoneyRequest;
  open: boolean;
  onClose: () => void;
}

const BTN =
  "min-h-[44px] px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50";

export default function RequestQR({ request, open, onClose }: RequestQRProps) {
  const { currentLang } = useLanguage();
  const lang = (
    currentLang === "bn" || currentLang === "hi" ? currentLang : "en"
  ) as "en" | "bn" | "hi";
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const payload = generateRequestQR(request);
  const left = expiryParts(msUntilExpiry(request));
  const locale = lang === "bn" ? "bn-BD" : lang === "hi" ? "hi-IN" : "en-IN";
  const expiryText = left.expired
    ? null
    : new Date(request.expiresAt).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      });

  async function qrToPngFile(): Promise<File> {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) throw new Error("QR not ready");
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png"),
      );
      if (!blob) throw new Error("PNG export failed");
      return new File([blob], `sanatani-request-${request.id}.png`, {
        type: "image/png",
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleShare() {
    setBusy(true);
    setError(null);
    try {
      const file = await qrToPngFile();
      const text = `Money request: ${formatMoney(request.amount, request.currency)} to ${request.receiverName}`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Sanatani Bandhan — money request",
          text,
        });
      } else {
        // Fallback: download the PNG (forwardable to WhatsApp manually).
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setError("Could not share the QR. Try copying instead.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — long-press the code instead.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-amber-100">
          <h3 className="font-extrabold text-stone-900">
            <T en="Request QR" bn="অনুরোধের কিউআর" hi="अनुरोध क्यूआर" />
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-stone-100"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center space-y-3">
          <div
            ref={qrWrapRef}
            className="bg-white p-3 rounded-2xl border-2 border-amber-200 shadow-sm"
          >
            <QRCodeSVG
              value={payload}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>

          <div>
            <div className="text-3xl font-extrabold text-stone-900 tabular-nums">
              {formatMoney(request.amount, request.currency)}
            </div>
            <div className="text-sm text-stone-600 mt-1">
              <T en="to" bn="প্রাপক" hi="को" />{" "}
              <span className="font-semibold text-stone-800">
                {request.receiverName}
              </span>
            </div>
            {request.note && (
              <p className="text-sm text-stone-500 mt-1">“{request.note}”</p>
            )}
          </div>

          <div className="text-xs text-stone-500">
            {left.expired ? (
              <span className="font-bold text-stone-500">
                <T en="Expired" bn="মেয়াদোত্তীর্ণ" hi="समाप्त" />
              </span>
            ) : (
              <T
                en={`Expires ${expiryText ?? ""}`}
                bn={`মেয়াদ ${expiryText ?? ""}`}
                hi={`समाप्त ${expiryText ?? ""}`}
              />
            )}
            <div className="font-mono text-[10px] text-stone-400 mt-1 break-all px-4">
              {payload}
            </div>
          </div>

          {error && (
            <div className="w-full text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              className={`${BTN} bg-amber-500 text-white`}
              disabled={busy}
              onClick={handleShare}
            >
              {busy ? (
                "…"
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <T en="Share" bn="শেয়ার" hi="साझा करें" />
                </>
              )}
            </button>
            <button
              className={`${BTN} bg-white border border-stone-300 text-stone-700`}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? (
                <T en="Copied" bn="কপি হয়েছে" hi="कॉपी हुआ" />
              ) : (
                <T en="Copy code" bn="কোড কপি" hi="कोड कॉपी" />
              )}
            </button>
          </div>
          <p className="text-xs text-stone-400 flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <T
              en="Share sends a PNG image — forwardable to WhatsApp."
              bn="শেয়ারে একটি PNG ছবি যাবে — হোয়াটসঅ্যাপে ফরওয়ার্ড করা যাবে।"
              hi="शेयर से PNG इमेज जाएगी — WhatsApp पर फॉरवर्ड की जा सकती है।"
            />
          </p>
        </div>
      </div>
    </div>
  );
}
