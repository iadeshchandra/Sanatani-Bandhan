import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Sparkles,
  Ticket,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { verifyDynamicToken, DynamicTokenVerificationResult } from '../../utils/qrUtils';

export interface QRScannerProps {
  /** Callback fired immediately when a valid QR token is scanned and verified */
  onScanSuccess?: (payload: any) => void;
  /** Callback fired when a scanned QR is invalid, expired, or tampered */
  onScanError?: (error: string, rawText?: string) => void;
  /** Optional close callback (if rendered as a modal or desk view) */
  onClose?: () => void;
  /** Custom header title */
  title?: string;
  /** Custom subtitle */
  subtitle?: string;
  /** Milliseconds to display valid overlay before automatically resuming camera */
  autoResumeDelayMs?: number;
  /** If true, scanner keeps listening after success; if false, it stops after first valid scan */
  continuous?: boolean;
  /** Class name overrides */
  className?: string;
}

type ScanStatus = 'IDLE' | 'SCANNING' | 'VALID' | 'INVALID' | 'EXPIRED' | 'PERMISSION_DENIED';

/**
 * Synthesizes high-fidelity audio tones using Web Audio API with zero external asset dependencies
 */
const playTone = (type: 'beep' | 'buzzer') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'beep') {
      // Crisp pleasant two-tone temple chime (A5 -> E6)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Harsh error buzzer (sawtooth low buzz with stutter)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(140, now + 0.08);
      osc.frequency.setValueAtTime(110, now + 0.16);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    // Autoplay policy or unsupported audio
    console.warn('Audio synthesis note:', err);
  }
};

/**
 * Triggers hardware vibration if supported on mobile
 */
const triggerVibration = (type: 'success' | 'error') => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate([60, 40, 80]);
      } else {
        navigator.vibrate([150, 80, 150]);
      }
    }
  } catch {
    // Ignore vibration failure
  }
};

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  title = 'Sanatani Bandhan Security Scanner',
  subtitle = 'Anti-Screenshot Dynamic Pass Verification',
  autoResumeDelayMs = 2800,
  continuous = true,
  className = '',
}) => {
  const containerId = useRef(`html5-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>('SCANNING');
  const [activePayload, setActivePayload] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorchCapability, setHasTorchCapability] = useState(false);

  // Resume camera scanner after result overlay
  const resumeScanning = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.resume();
      }
    } catch (e) {
      console.warn('Could not resume scanner:', e);
    }

    setScanStatus('SCANNING');
    setActivePayload(null);
    setErrorMessage('');
    isProcessingRef.current = false;
  }, []);

  // Handle scanned decoded text
  const handleDecodedText = useCallback(
    (decodedText: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      // Pause the camera feed to freeze on the scanned code
      try {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.pause();
        }
      } catch (err) {
        console.warn('Could not pause camera frame:', err);
      }

      // Verify the dynamic token
      const result: DynamicTokenVerificationResult = verifyDynamicToken(decodedText);

      if (result.valid && result.payload) {
        // Success: Play chime & vibrate
        playTone('beep');
        triggerVibration('success');

        setScanStatus('VALID');
        setActivePayload(result.payload);

        // Notify parent
        onScanSuccess?.(result.payload);

        // Auto-resume if continuous mode enabled
        if (continuous) {
          resumeTimerRef.current = setTimeout(() => {
            resumeScanning();
          }, autoResumeDelayMs);
        }
      } else {
        // Error / Expired: Play harsh buzzer & vibrate
        playTone('buzzer');
        triggerVibration('error');

        const errType = result.error || 'INVALID_FORMAT';
        const isExp = errType === 'TOKEN_EXPIRED';

        setScanStatus(isExp ? 'EXPIRED' : 'INVALID');
        setActivePayload(result.payload || null);

        let desc = 'The scanned QR code is invalid or corrupted.';
        if (isExp) {
          desc = 'Pass has EXPIRED! Dynamic anti-screenshot token exceeded its time validity.';
        } else if (errType === 'SIGNATURE_MISMATCH' || errType === 'TAMPER_DETECTED') {
          desc = 'Security signature mismatch! Potential counterfeit or modified pass.';
        }

        setErrorMessage(desc);
        onScanError?.(errType, decodedText);

        // Auto-resume after error to let the guard scan next person quickly
        resumeTimerRef.current = setTimeout(() => {
          resumeScanning();
        }, Math.max(2200, autoResumeDelayMs - 600));
      }
    },
    [autoResumeDelayMs, continuous, onScanError, onScanSuccess, resumeScanning]
  );

  // Initialize camera scanner
  const startCamera = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch {
          // ignore cleanup error
        }
      }

      const qrScanner = new Html5Qrcode(containerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        handleDecodedText,
        () => {
          // Frame without QR code: ignore
        }
      );

      setScanStatus('SCANNING');

      // Check torch capability
      try {
        const capabilities: any = qrScanner.getRunningTrackCapabilities();
        setHasTorchCapability(Boolean(capabilities?.torch));
      } catch {
        setHasTorchCapability(false);
      }
    } catch (err: any) {
      console.error('QR Scanner init failure:', err);
      setScanStatus('PERMISSION_DENIED');
      setErrorMessage(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please enable camera access in browser settings.'
          : 'Unable to start camera stream. Verify camera is connected and not in use by another app.'
      );
    }
  }, [containerId, facingMode, handleDecodedText]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorchCapability) return;
    try {
      const nextTorch = !isTorchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch between front and back camera
  const toggleCameraFacing = async () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(console.error);
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [startCamera]);

  return (
    <div
      className={`relative w-full max-w-lg mx-auto bg-temple-950 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-temple-950 via-temple-900 to-amber-950/80 border-b border-temple-800 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-300 tracking-tight leading-tight">{title}</h3>
            <p className="text-[11px] text-temple-400 leading-tight">{subtitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {hasTorchCapability && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition-colors ${
                isTorchOn
                  ? 'bg-amber-500 text-temple-950 border-amber-400'
                  : 'bg-temple-900/80 text-temple-300 border-temple-800 hover:text-white'
              }`}
              title="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleCameraFacing}
            className="p-2 rounded-xl bg-temple-900/80 border border-temple-800 text-temple-300 hover:text-white transition-colors"
            title="Switch Camera (Front/Back)"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-temple-900/80 border border-temple-800 text-temple-400 hover:text-white transition-colors ml-1"
              title="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewfinder / Camera Feed Container */}
      <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
        {/* HTML5 QR code video destination element */}
        <div id={containerId} className="w-full h-full object-cover" />

        {/* Viewfinder Reticle Overlay during active scanning */}
        {scanStatus === 'SCANNING' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="relative w-64 h-64 border-2 border-dashed border-amber-400/60 rounded-3xl">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-pulse top-1/2 -translate-y-1/2" />
            </div>

            {/* Instruction tooltip */}
            <div className="absolute bottom-4 px-3.5 py-1.5 rounded-full bg-temple-950/85 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
              <Camera className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Align Devotee Dynamic Pass inside frame</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GREEN SUCCESS OVERLAY (Pass Valid) */}
        {/* ========================================================================= */}
        {scanStatus === 'VALID' && (
          <div className="absolute inset-0 z-30 bg-emerald-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Security Cleared
            </span>

            <h3 className="text-2xl font-black text-white tracking-tight">Darshan Pass Valid</h3>
            <p className="text-xs text-emerald-300/90 mt-0.5 max-w-xs">
              Dynamic anti-screenshot token verified. Identity & entry rights confirmed.
            </p>

            {/* Details Box */}
            <div className="mt-4 w-full bg-temple-950/80 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-temple-400">Devotee / Name:</span>
                </div>
                <span className="font-black text-xs text-emerald-200 truncate max-w-[180px]">
                  {activePayload?.name ||
                    activePayload?.fullName ||
                    activePayload?.devoteeName ||
                    activePayload?.id ||
                    'Honored Devotee'}
                </span>
              </div>

              {(activePayload?.sevaTier || activePayload?.tier) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-temple-400">Seva Tier:</span>
                  </div>
                  <span className="font-extrabold text-[11px] uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {activePayload?.sevaTier || activePayload?.tier}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-temple-400">Pass Purpose:</span>
                </div>
                <span className="font-bold text-xs text-temple-200">
                  {activePayload?.purpose || activePayload?.type || 'Sanctum Darshan & Prasad'}
                </span>
              </div>

              {activePayload?.expiresAt && (
                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-[11px]">
                  <div className="flex items-center gap-1.5 text-temple-400">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Valid Until:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300">
                    {new Date(activePayload.expiresAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="mt-4 flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={resumeScanning}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-temple-950 font-black text-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                <span>Next Devotee</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* RED ERROR OVERLAY (Pass Expired or Invalid) */}
        {/* ========================================================================= */}
        {(scanStatus === 'INVALID' || scanStatus === 'EXPIRED') && (
          <div className="absolute inset-0 z-30 bg-rose-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(244,63,94,0.35)] animate-pulse">
              {scanStatus === 'EXPIRED' ? (
                <Clock className="w-12 h-12 text-rose-400" />
              ) : (
                <XCircle className="w-12 h-12 text-rose-400" />
              )}
            </div>

            <span className="px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              Entry Rejected
            </span>

            <h3 className="text-2xl font-black text-white tracking-tight">
              {scanStatus === 'EXPIRED' ? 'Pass Expired / Timed Out' : 'Invalid QR Pass'}
            </h3>
            <p className="text-xs text-rose-300/90 mt-1 max-w-xs">{errorMessage}</p>

            {scanStatus === 'EXPIRED' && (
              <div className="mt-3 p-3 rounded-xl bg-rose-900/40 border border-rose-800 text-left text-xs text-rose-200 w-full space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Anti-Screenshot Rule Triggered
                </p>
                <p className="text-[11px] text-rose-300">
                  Static screenshots and stale passes expire automatically every 5 minutes. Advise devotee to re-open their "My Space" pass to obtain an active token.
                </p>
              </div>
            )}

            {/* Quick Rescan Button */}
            <div className="mt-4 flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={resumeScanning}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Rescan Immediately</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PERMISSION DENIED OVERLAY */}
        {/* ========================================================================= */}
        {scanStatus === 'PERMISSION_DENIED' && (
          <div className="absolute inset-0 z-30 bg-temple-950 p-6 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Camera Inaccessible</h4>
            <p className="text-xs text-temple-400 max-w-xs mb-4">{errorMessage}</p>
            <button
              type="button"
              onClick={startCamera}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera Permission</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-temple-900 border-t border-temple-800 text-[11px] text-temple-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-time Audio & Dynamic Token Engine</span>
        </div>
        <span className="text-temple-500 font-mono">HMAC-SHA256</span>
      </div>
    </div>
  );
};
