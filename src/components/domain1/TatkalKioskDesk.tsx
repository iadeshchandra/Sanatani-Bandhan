import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Smartphone,
  UserPlus,
  Zap,
  CheckCircle2,
  Flame,
  Delete,
  RotateCcw,
  Sparkles,
  Ticket,
  Clock,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { parsePhone, phoneErrorMessage, phoneGeoForCountry, sanitizeName } from '../../utils/validation';

const COMMON_GOTRAS = [
  'Kashyapa',
  'Bharadvaja',
  'Vashistha',
  'Sandilya',
  'Gargya',
  'Agastya',
  'Atri',
  'Gautama',
  'Jamadagni',
  'Vishvamitra',
  'Parashara',
  'Harita',
  'Angirasa',
  'Vatsa',
  'Kaundinya',
];

export const TatkalKioskDesk: React.FC = () => {
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  // Geo-aware dial code (QUEUED #49): defaults from the org's country,
  // flippable at the counter for a cross-border pilgrim. BD pilgrims type
  // their full 01… national number (11 digits); IN pilgrims 10 digits.
  const [dialCode, setDialCode] = useState<'+91' | '+880'>(() =>
    phoneGeoForCountry(activeWorkspace?.country) === 'BD' ? '+880' : '+91'
  );
  const maxDigits = dialCode === '+880' ? 11 : 10;
  const [phoneNumber, setPhoneNumber] = useState('');
  const parsedPhone = parsePhone(`${dialCode}${phoneNumber}`);
  const [fullName, setFullName] = useState('');
  const [selectedGotra, setSelectedGotra] = useState('Kashyapa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPrintedPass, setLastPrintedPass] = useState<{
    id: string;
    name: string;
    phone: string;
    gotra: string;
    time: string;
  } | null>(null);

  // Recent issuances: phone -> timestamp. Same number twice within 5 minutes
  // flags a likely duplicate tap at the kiosk.
  const recentIssuances = useRef<Record<string, number>>({});
  const processTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (processTimer.current) clearTimeout(processTimer.current);
    };
  }, []);

  const handleNumpadPress = (val: string) => {
    if (phoneNumber.length < maxDigits) {
      setPhoneNumber((prev) => prev + val);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setPhoneNumber('');
    setFullName('');
    setSelectedGotra('Kashyapa');
  };

  const handleGeneratePass = () => {
    if (!parsedPhone.valid) {
      showToast(phoneErrorMessage(activeWorkspace?.country), 'warning', 'Tatkal Kiosk');
      return;
    }
    const cleanName = sanitizeName(fullName);
    if (!cleanName) {
      showToast('Please enter pilgrim full name.', 'warning', 'Tatkal Kiosk');
      return;
    }

    setIsProcessing(true);

    processTimer.current = setTimeout(() => {
      const passId = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
      const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Duplicate-pass detection: same number within 5 minutes (keyed by
      // E.164 so the same pilgrim is recognised across input formats)
      const e164 = parsedPhone.e164;
      const lastIssued = recentIssuances.current[e164];
      const minsAgo = lastIssued ? Math.round((Date.now() - lastIssued) / 60000) : null;
      recentIssuances.current[e164] = Date.now();

      setLastPrintedPass({
        id: passId,
        name: cleanName,
        phone: e164,
        gotra: selectedGotra,
        time: nowStr,
      });

      if (lastIssued && Date.now() - lastIssued < 5 * 60 * 1000) {
        showToast(
          `Pass #${passId} generated — but note a pass was already issued to ${e164} ${Math.max(1, minsAgo || 1)} min ago. Possible duplicate entry at the kiosk.`,
          'warning',
          'Possible Duplicate Pass'
        );
      } else {
        showToast(
          `Pass #${passId} generated! Thermal slip printed & WhatsApp dispatched to ${e164}.`,
          'success',
          'Tatkal Kiosk'
        );
      }

      // Reset form for next pilgrim in line
      setPhoneNumber('');
      setFullName('');
      setSelectedGotra('Kashyapa');
      setIsProcessing(false);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* SECTION 1: HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-amber-500" />
              <span>Sub-5-Second Throughput Mode</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Kiosk Station: KSK-NORTH-01 &bull; Auto-Sync: Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-8 h-8 text-amber-600" />
            <span>Tatkal (Instant) Registration Kiosk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            High-velocity touchscreen desk for rapid devotee enrollment, ESC/POS thermal pass printing, and automated WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Kiosk</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: SPLIT-SCREEN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 3: LEFT PANEL - INPUTS & GIANT VIRTUAL NUMPAD */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                Step 1: Devotee Identification
              </span>
              <span className="text-xs font-mono font-semibold text-slate-400">
                Digits: {phoneNumber.length}/{maxDigits}
              </span>
            </div>

            {/* Mobile Number Display Box */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pilgrim Mobile Number
              </label>
              <div className="flex gap-1.5 mb-1.5">
                {(['+91', '+880'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setDialCode(code)}
                    className={`min-h-[36px] px-3 rounded-lg border text-xs font-extrabold transition-colors cursor-pointer ${
                      dialCode === code
                        ? 'bg-amber-500/15 border-amber-400 text-amber-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300'
                    }`}
                  >
                    {code === '+91' ? '🇮🇳 +91' : '🇧🇩 +880'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900 flex items-center justify-between shadow-inner focus-within:border-amber-500 transition-colors">
                  <span className="text-slate-400 text-base font-normal">{dialCode}</span>
                  <span className="tracking-widest flex-1 text-center font-bold">
                    {phoneNumber || <span className="text-slate-300 font-sans text-lg font-medium">Tap numbers below</span>}
                  </span>
                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Giant Virtual Numpad */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumpadPress(digit)}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 active:scale-95 border border-slate-200 text-xl sm:text-2xl font-black text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPhoneNumber('')}
                className="h-14 sm:h-16 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 text-xs sm:text-sm font-extrabold uppercase text-rose-700 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumpadPress('0')}
                className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 active:scale-95 border border-slate-200 text-xl sm:text-2xl font-black text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 sm:h-16 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:border-rose-300 active:scale-95 border border-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                title="Backspace"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            {/* Full Name Input */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Pilgrim Full Name / Yajaman
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Anand Kumar Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: RIGHT PANEL - SHASTRIC GOTRA CLOUD & REAL-TIME PASS PREVIEW */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Step 2: Quick-Select Gotra
              </span>
              <span className="text-xs font-mono text-slate-400">
                Selected: <strong className="text-white">{selectedGotra}</strong>
              </span>
            </div>

            {/* Gotra Pill Cloud */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
              {COMMON_GOTRAS.map((gotra) => {
                const isSelected = selectedGotra === gotra;
                return (
                  <button
                    key={gotra}
                    type="button"
                    onClick={() => setSelectedGotra(gotra)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center truncate ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 scale-102 font-black'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-amber-400/50 hover:bg-slate-800'
                    }`}
                  >
                    {gotra}
                  </button>
                );
              })}
            </div>

            {/* Live Pass Preview Card */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  TATKAL ADMIT PASS PREVIEW
                </span>
                <span>ESC/POS 80mm</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-lg font-black text-white">
                    {fullName || 'Sri Devotee'}
                  </div>
                  <div className="text-xs text-amber-300 font-mono flex items-center gap-1.5">
                    <span>Gotra: <strong>{selectedGotra}</strong></span>
                    <span>&bull;</span>
                    <span>Mobile: {phoneNumber ? (parsedPhone.e164 || `${dialCode} ${phoneNumber}`) : 'Pending'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    Entry Corridor: <strong className="text-emerald-400">Gate 2 Sugam Sanctum</strong>
                  </div>
                </div>

                <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
              </div>
            </div>
          </div>

          {/* Last Printed Banner */}
          {lastPrintedPass && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Last Issued: <strong>{lastPrintedPass.name}</strong> ({lastPrintedPass.id})</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">{lastPrintedPass.time}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: FULL-WIDTH ACTION BAR */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGeneratePass}
          disabled={isProcessing}
          className={`w-full py-5 rounded-3xl font-black text-base sm:text-lg shadow-2xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-3 ${
            isProcessing
              ? 'bg-amber-600/50 text-white cursor-wait'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30'
          }`}
        >
          <Printer className="w-6 h-6 text-slate-950" />
          <span>
            {isProcessing
              ? 'Printing Thermal Slip & Dispatching WhatsApp...'
              : 'Generate Thermal Pass & Auto-Dispatch WhatsApp'}
          </span>
          <Sparkles className="w-5 h-5 text-slate-950" />
        </button>
      </div>
    </div>
  );
};

export default TatkalKioskDesk;
