/**
 * campus/ZoneQrScanSheet.tsx — scan a temple zone QR → verified check-in.
 * =======================================================================
 * A DEDICATED scanner for SB-ZONE codes — deliberately separate from the
 * security-pass QRScanner (which is built for dynamic devotee passes with
 * anti-screenshot overlays). Mixing the two would contaminate a
 * security-sensitive component with the wrong copy and wrong flows.
 *
 * ANTI-PHISHING AIR-GAP (preserved from zoneQr.ts):
 * - Accepts ONLY well-formed SB-ZONE payloads (parseZoneQr).
 * - Every scan is VERIFIED against the org's published campus map
 *   (verifyZoneQr) — a fake QR for a non-existent zone fails closed.
 * - The result screen has NO payment buttons, NO links, NO donate CTA.
 * - On success: one warm button — "Record my visit" — which opens the
 *   Tirtha check-in sheet pre-filled. Nothing else.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, CheckCircle2, ShieldAlert, RefreshCw, PenLine } from 'lucide-react';
import { parseZoneQr, verifyZoneQr, type ZoneQrVerification } from './zoneQr';

type TriCopy = { en: string; bn: string; hi: string };
const tr = (copy: TriCopy): string => {
  try {
    const lang = localStorage.getItem('sanatani_lang') || 'en';
    if (lang === 'bn') return copy.bn;
    if (lang === 'hi') return copy.hi;
  } catch {
    /* sandboxed — fall through to English */
  }
  return copy.en;
};

export interface ZoneScanSuccess {
  orgId: string;
  orgName: string;
  zoneId: string;
  zoneName: string;
}

type ScanState =
  | { kind: 'scanning' }
  | { kind: 'verifying' }
  | { kind: 'ok'; result: ZoneScanSuccess }
  | { kind: 'error'; reason: 'bad_format' | 'unknown_org' | 'unknown_zone' | 'camera' };

export const ZoneQrScanSheet: React.FC<{
  onVerified: (scan: ZoneScanSuccess) => void;
  onClose: () => void;
}> = ({ onVerified, onClose }) => {
  const containerId = useRef(`zone-qr-${Math.random().toString(36).substring(2, 9)}`).current;
  const qrRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });

  const stop = useCallback(async () => {
    try {
      if (qrRef.current?.isScanning) await qrRef.current.stop();
      qrRef.current?.clear();
    } catch {
      /* best effort */
    }
    qrRef.current = null;
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

      // Gate 1: strict format parse — URLs, payment codes, garbage → bad_format.
      const parsed = parseZoneQr(decodedText);
      if (!parsed) {
        setState({ kind: 'error', reason: 'bad_format' });
        return;
      }

      // Gate 2: verify against the org's PUBLISHED map — fails closed.
      setState({ kind: 'verifying' });
      let v: ZoneQrVerification;
      try {
        v = await verifyZoneQr(decodedText);
      } catch {
        v = { ok: false, reason: 'unknown_org' };
      }
      if (v.ok === false) {
        setState({ kind: 'error', reason: v.reason });
        return;
      }
      setState({
        kind: 'ok',
        result: { orgId: v.orgId, orgName: v.orgName, zoneId: v.zoneId, zoneName: v.zoneName },
      });
    },
    [],
  );

  const rescan = useCallback(() => {
    busyRef.current = false;
    setState({ kind: 'scanning' });
    try {
      qrRef.current?.resume();
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qr = new Html5Qrcode(containerId);
        qrRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
          handleDecoded,
          () => undefined,
        );
        if (cancelled) await stop();
      } catch {
        if (!cancelled) setState({ kind: 'error', reason: 'camera' });
      }
    })();
    return () => {
      cancelled = true;
      void stop();
    };
  }, [containerId, handleDecoded, stop]);

  const errorCopy = (reason: 'bad_format' | 'unknown_org' | 'unknown_zone' | 'camera'): TriCopy => {
    switch (reason) {
      case 'bad_format':
        return {
          en: "This doesn't look like a temple code. Temple QRs start with the 🛕 mark — ask a sevadar if you're unsure.",
          bn: 'এটি মন্দিরের কোড বলে মনে হচ্ছে না। নিশ্চিত না হলে একজন সেবাদারকে জিজ্ঞাসা করুন।',
          hi: 'यह मंदिर का कोड नहीं लगता। संदेह हो तो किसी सेवादार से पूछें।',
        };
      case 'camera':
        return {
          en: "We need your camera's blessing to scan — please allow camera access and try again.",
          bn: 'স্ক্যান করতে ক্যামেরার অনুমতি দিন, তারপর আবার চেষ্টা করুন।',
          hi: 'स्कैन के लिए कैमरे की अनुमति दें, फिर पुनः प्रयास करें।',
        };
      default:
        return {
          en: "We couldn't verify this code against the temple's map. It may be old or from another temple.",
          bn: 'মন্দিরের মানচিত্রে এই কোড যাচাই করা যায়নি। এটি পুরনো বা অন্য মন্দিরের হতে পারে।',
          hi: 'मंदिर के मानचित्र में इस कोड का सत्यापन नहीं हो सका। यह पुराना या किसी अन्य मंदिर का हो सकता है।',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[9980] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-950/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[94vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                {tr({ en: 'Scan temple QR', bn: 'মন্দিরের QR স্ক্যান করুন', hi: 'मंदिर का QR स्कैन करें' })}
              </h3>
              <p className="text-[11px] text-stone-500">
                {tr({ en: 'Point at the 🛕 code near the shrine', bn: 'মন্দিরের 🛕 কোডের দিকে ধরুন', hi: 'मंदिर के 🛕 कोड की ओर इशारा करें' })}
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

        <div className="relative bg-black aspect-square">
          <div id={containerId} className="w-full h-full" />
          {state.kind === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-60 h-60 border-2 border-dashed border-amber-400/70 rounded-3xl relative">
                <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-amber-400/80 animate-pulse" />
              </div>
            </div>
          )}
          {state.kind === 'verifying' && (
            <div className="absolute inset-0 bg-stone-950/70 flex items-center justify-center">
              <p className="text-amber-200 text-sm font-bold animate-pulse">
                {tr({ en: 'Verifying with the temple… 🪔', bn: 'মন্দিরের সাথে যাচাই হচ্ছে… 🪔', hi: 'मंदिर से सत्यापित हो रहा है… 🪔' })}
              </p>
            </div>
          )}
        </div>

        {state.kind === 'ok' && (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  {tr({ en: 'Verified temple code', bn: 'যাচাইকৃত মন্দির কোড', hi: 'सत्यापित मंदिर कोड' })}
                </p>
                <p className="text-lg font-extrabold text-stone-900">{state.result.orgName}</p>
                <p className="text-sm text-stone-600">📍 {state.result.zoneName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onVerified(state.result)}
              className="mt-4 w-full min-h-[52px] rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-extrabold text-base flex items-center justify-center gap-2"
            >
              <PenLine className="w-5 h-5" />
              {tr({ en: 'Record my visit 🪔', bn: 'আমার দর্শন লিখে রাখুন 🪔', hi: 'मेरा दर्शन दर्ज करें 🪔' })}
            </button>
            <p className="text-center text-[11px] text-stone-400 mt-2">
              {tr({
                en: 'Your visit is recorded only when you confirm — nothing automatic.',
                bn: 'আপনি নিশ্চিত করলেই দর্শন লেখা হবে — স্বয়ংক্রিয় কিছু নয়।',
                hi: 'आपके पुष्टि करने पर ही दर्शन दर्ज होगा — कुछ भी स्वतः नहीं।',
              })}
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
              <p className="text-sm text-stone-700 leading-relaxed">{tr(errorCopy(state.reason))}</p>
            </div>
            <button
              type="button"
              onClick={rescan}
              className="mt-4 w-full min-h-[52px] rounded-2xl bg-stone-900 text-white font-extrabold text-base flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              {tr({ en: 'Try again', bn: 'আবার চেষ্টা করুন', hi: 'पुनः प्रयास करें' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
