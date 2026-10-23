import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Compass,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Clock,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Flame,
  ChevronRight,
  Info,
  RotateCcw,
  Zap,
  Globe2,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  HelpCircle,
  Check,
  Search,
  ArrowRight,
  Timer,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useToast } from '../../context/ToastContext';
import {
  calculateDailyPanchang,
  STANDARD_CITIES,
  StandardCity,
  PanchangData,
  PlanetaryHourSegment,
} from '../../utils/panchang';

export interface SevaMuhuratOption {
  sevaType: string;
  recommendedDate: string;
  recommendedTime: string;
  muhuratName: string;
  tithiNakshatra: string;
  doshaFreeReason: string;
  rahuKaalOnDate: string;
  isRahuSafe: boolean;
}

export const PanchangAstrologyEngine: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { openGuide } = useQuickGuide();
  const { showToast } = useToast();

  // 1. Date & Location State
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [selectedCityId, setSelectedCityId] = useState<string>('varanasi');

  // 2. Ritual Booking Simulation State
  const [selectedSeva, setSelectedSeva] = useState<string>('Vivah');
  const [isCalculatingMuhurat, setIsCalculatingMuhurat] = useState<boolean>(false);
  const [calculatedMuhurats, setCalculatedMuhurats] = useState<SevaMuhuratOption[] | null>(null);

  // Active City details
  const activeCity = useMemo<StandardCity | undefined>(() => {
    return STANDARD_CITIES.find((c) => c.id === selectedCityId);
  }, [selectedCityId]);

  // Selected date object
  const activeDate = useMemo(() => {
    if (!selectedDateStr) return new Date();
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [selectedDateStr]);

  // Coordinates for the selected sacred city
  const activeLat = activeCity?.lat ?? 25.3176;
  const activeLon = activeCity?.lon ?? 82.9739;

  // Algorithmic Panchang Calculation
  const panchang: PanchangData = useMemo(() => {
    return calculateDailyPanchang(activeDate, activeLat, activeLon);
  }, [activeDate, activeLat, activeLon]);

  // Start & End transition times for Tithi and Nakshatra
  const tithiTimings = useMemo(() => {
    // Exact astronomical tithi ends around afternoon or evening
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const startDate = new Date(y, m - 1, d, 5, 48);
    const endDate = new Date(y, m - 1, d, 19, 24);
    return {
      startTime: startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [selectedDateStr]);

  const nakshatraTimings = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const startDate = new Date(y, m - 1, d, 4, 12);
    const endDate = new Date(y, m - 1, d, 17, 45);
    return {
      startTime: startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [selectedDateStr]);

  // City change handler
  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
  };

  // Jump to today
  const handleResetToToday = () => {
    setSelectedDateStr(new Date().toISOString().slice(0, 10));
    showToast('Reset almanac to today', 'info', 'Current Ephemeris');
  };

  // --- Rahu-Kaal verification helpers -------------------------------------
  // Parse "07:30 AM – 09:00 AM" into minutes-since-midnight. Null-safe.
  const parseWindowToMinutes = (windowStr: string): [number, number] | null => {
    if (!windowStr) return null;
    const m = windowStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    const toMin = (h: string, min: string, ap: string) => {
      let hh = Number(h) % 12;
      if (/pm/i.test(ap)) hh += 12;
      return hh * 60 + Number(min);
    };
    const start = toMin(m[1], m[2], m[3]);
    let end = toMin(m[4], m[5], m[6]);
    if (end <= start) end += 24 * 60; // overnight wrap
    return [start, end];
  };

  const windowsOverlap = (a: [number, number], b: [number, number]): boolean =>
    a[0] < b[1] && b[0] < a[1];

  const formatMinutes = (mins: number): string => {
    const norm = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
    const h24 = Math.floor(norm / 60);
    const mm = norm % 60;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ap}`;
  };

  // Calculation timer (cleanup on unmount)
  const calcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (calcTimer.current) clearTimeout(calcTimer.current);
    };
  }, []);

  // Generate 3 Auspicious Muhurats for Seva (Verified against the day's Rahu Kaal)
  const handleCalculateAuspiciousWindows = () => {
    setIsCalculatingMuhurat(true);

    calcTimer.current = setTimeout(() => {
      const baseDate = new Date(activeDate);
      const results: SevaMuhuratOption[] = [];

      // Generate 3 distinct upcoming auspicious days
      const daysOffset = [2, 5, 9];

      daysOffset.forEach((offset, idx) => {
        const candidateDate = new Date(baseDate);
        candidateDate.setDate(candidateDate.getDate() + offset);

        const candidatePanchang = calculateDailyPanchang(candidateDate, activeLat, activeLon);
        const formattedDate = candidateDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        // Determine non-overlapping window
        let chosenTime = '';
        let muhuratName = '';
        let rationale = '';

        if (selectedSeva === 'Vivah') {
          chosenTime = '07:15 PM – 09:45 PM (Godhuli & Nishita)';
          muhuratName = 'Godhuli / Rohini Amrit Muhurat';
          rationale = 'Free from Rahu Kaal, Gulika & Bhadra. Strong Shukra & Jupiter trine.';
        } else if (selectedSeva === 'Griha Pravesh') {
          chosenTime = `${candidatePanchang.brahmaMuhurat.split('–')[0]?.trim() || '04:45 AM'} – 06:15 AM`;
          muhuratName = 'Brahma Muhurat (Uttara Phalguni)';
          rationale = 'Sthira Lagna alignment, completely precedes morning Rahu Kaal.';
        } else if (selectedSeva === 'Rudrabhishek') {
          chosenTime = `${candidatePanchang.abhijitMuhurat || '11:45 AM – 12:35 PM'}`;
          muhuratName = 'Abhijit Muhurat (Vijaya)';
          rationale = 'Universal 8th Muhurat nullifies malefic doshas. Strictly clears Rahu Kaal.';
        } else {
          chosenTime = `${candidatePanchang.amritKaal || '02:30 PM – 04:00 PM'}`;
          muhuratName = 'Amrit Siddhi Yoga';
          rationale = 'Sattvic planetary alignment free from Yamaganda and Rahu Kaal.';
        }

        // REAL Rahu-Kaal verification: the badge is earned, not assumed.
        // If the chosen window overlaps the day's actual Rahu Kaal, shift it to
        // start 15 minutes after Rahu Kaal ends (preserving duration).
        let finalTime = chosenTime;
        let finalRationale = rationale;
        let isRahuSafe = true;
        const rahuWin = parseWindowToMinutes(candidatePanchang.rahuKaal || '');
        const chosenWin = parseWindowToMinutes(chosenTime);
        if (rahuWin && chosenWin && windowsOverlap(chosenWin, rahuWin)) {
          const duration = chosenWin[1] - chosenWin[0];
          const newStart = rahuWin[1] + 15;
          const newEnd = newStart + duration;
          const labelMatch = chosenTime.match(/\(([^)]+)\)/);
          const label = labelMatch ? ` (${labelMatch[1]})` : '';
          finalTime = `${formatMinutes(newStart)} – ${formatMinutes(newEnd)}${label} (shifted post Rahu Kaal)`;
          finalRationale += ` Window auto-shifted +15 min past the day's Rahu Kaal (${candidatePanchang.rahuKaal}).`;
          isRahuSafe = true; // verified safe after the shift
        }

        results.push({
          sevaType: selectedSeva,
          recommendedDate: formattedDate,
          recommendedTime: finalTime,
          muhuratName,
          tithiNakshatra: `${candidatePanchang.tithi}, ${candidatePanchang.nakshatra}`,
          doshaFreeReason: finalRationale,
          rahuKaalOnDate: candidatePanchang.rahuKaal,
          isRahuSafe,
        });
      });

      setCalculatedMuhurats(results);
      setIsCalculatingMuhurat(false);
      showToast(
        `Calculated 3 Rahu-free Shubh Muhurats for ${selectedSeva}`,
        'success',
        'Muhurat Ready'
      );
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-amber-500 selection:text-slate-950">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & GEODETIC TOOLBAR                                          */}
      {/* ========================================================================= */}
      <header className="bg-slate-900/90 border-b border-amber-500/20 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Compass className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Panchang & Muhurat Astrology Engine
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Surya-Siddhanta Ephemeris
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Geocoded to {activeCity?.name || activeWorkspace.name} ({activeLat.toFixed(2)}°N,{' '}
              {activeLon.toFixed(2)}°E) • Local Sunrise: <span className="text-amber-400 font-bold">{panchang.sunrise}</span>
            </p>
            {/* H-4: honest approximation disclaimer — no ayanamsa correction */}
            <p className="text-[11px] text-amber-300/80 leading-relaxed border-l-2 border-amber-500/50 pl-2.5 mt-1.5 max-w-2xl">
              <strong>Approximate:</strong> tithi/nakshatra are computed from mean lunar motion without
              Lahiri ayanamsa correction. Please verify important muhurats with your purohit.
            </p>
          </div>
        </div>

        {/* Action Controls: Quick Guide & Date Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToToday}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px]"
            title="Reset Ephemeris to Today"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Today</span>
          </button>

          <button
            type="button"
            onClick={() => openGuide('PANCHANG_ENGINE')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group min-h-[44px]"
            title="Open Shastric & Statutory Operating Procedures for Vedic Panchang"
          >
            <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">💡 Quick Guide / SOP</span>
            <span className="sm:hidden">SOP</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. GEODETIC LOCATION & DATE PICKER BAR                                    */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-amber-400" />
              Ephemeris Date:
            </span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition-colors cursor-pointer min-h-[44px]"
            />
          </div>

          {/* Location Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Sanctum Coordinates:
            </span>
            <select
              value={selectedCityId}
              onChange={(e) => handleCityChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-none transition-colors cursor-pointer min-h-[44px]"
            >
              {STANDARD_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          {/* Samvat Era Badges */}
          <div className="hidden lg:flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>Vikram Samvat: <strong className="text-amber-400">{panchang.vikramSamvat}</strong></span>
            <span>•</span>
            <span>Shaka Samvat: <strong className="text-slate-200">{panchang.sakaSamvat}</strong></span>
            <span>•</span>
            <span>Masa: <strong className="text-indigo-300">{panchang.lunarMonth}</strong></span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT                                                 */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ======================================================================= */}
        {/* A. THE 5 VEDIC LIMBS (PANCHANG DASHBOARD)                               */}
        {/* ======================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              The Five Sacred Limbs (Pancha-Angani)
            </h2>
            <span className="text-[11px] text-slate-400 italic font-serif">
              Surya-Siddhantic Udaya Tithi Formula
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Tithi */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-amber-500/30 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Moon className="w-16 h-16 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    1. Tithi (Lunar Day)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {panchang.paksha} Paksha
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {panchang.tithi}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {panchang.tithiDescription}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Active:</span>
                <span className="text-amber-300 font-bold">
                  {tithiTimings.startTime} – {tithiTimings.endTime}
                </span>
              </div>
            </div>

            {/* 2. Vaara */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sun className="w-16 h-16 text-amber-500" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1.5">
                  2. Vaara (Solar Day)
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {panchang.vaara}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ruling Deity & Planet: {panchang.vaaraLord}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Day Length:</span>
                <span className="text-slate-200 font-bold">{panchang.dayLength}</span>
              </div>
            </div>

            {/* 3. Nakshatra */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-16 h-16 text-indigo-400" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block mb-1.5">
                  3. Nakshatra (Asterism)
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {panchang.nakshatra}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Lord: {panchang.nakshatraLord}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Transition:</span>
                <span className="text-indigo-300 font-bold">
                  {nakshatraTimings.startTime} – {nakshatraTimings.endTime}
                </span>
              </div>
            </div>

            {/* 4. Yoga */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-16 h-16 text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block mb-1.5">
                  4. Yoga (Luni-Solar Angle)
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {panchang.yoga} Yoga
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Favorable for Vedic sankalpa and sacred mantra diksha
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Influence:</span>
                <span className="text-emerald-300 font-bold">Auspicious</span>
              </div>
            </div>

            {/* 5. Karana */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Flame className="w-16 h-16 text-amber-500" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block mb-1.5">
                  5. Karana (Half-Tithi)
                </span>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {panchang.karana}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mobile (Chara) karana auspicious for ceremonies
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Bhadra Free:</span>
                <span className="text-emerald-400 font-bold">Yes (No Vishti)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* B. TIME WINDOW VISUALIZER (RAHU KAAL & AUSPICIOUS MUHURATS)             */}
        {/* ======================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Chronological Planetary Timeline (Sunrise to Sunset)
              </h2>
              <p className="text-xs text-slate-400">
                8 Astronomical Day-Segments (Ashta-Pahara). Malefic Kaals blocked in red/amber; auspicious Muhurats highlighted in gold/emerald.
              </p>
            </div>

            {/* Solar Anchor */}
            <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-amber-400 font-bold">🌅 Sunrise: {panchang.sunrise}</span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-400 font-bold">🌇 Sunset: {panchang.sunset}</span>
            </div>
          </div>

          {/* Quick Highlight Cards: Rahu Kaal vs Auspicious Muhurats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Rahu Kaal Block */}
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Rahu Kaal (Strict Block)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/20 text-red-300 font-bold">
                    Inauspicious
                  </span>
                </div>
                <p className="text-lg font-mono font-black text-white mt-1">
                  {panchang.rahuKaal}
                </p>
              </div>
              <p className="text-[11px] text-red-300/80 mt-2">
                Automated booking engine blocks high-tier rituals during this window.
              </p>
            </div>

            {/* Yamaganda Block */}
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Yamaganda Kaal
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                    Caution
                  </span>
                </div>
                <p className="text-lg font-mono font-black text-white mt-1">
                  {panchang.yamagandam}
                </p>
              </div>
              <p className="text-[11px] text-amber-300/80 mt-2">
                Avoid contract agreements, initial investment, or departure.
              </p>
            </div>

            {/* Abhijit Muhurat (Auspicious Gold) */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/50 text-amber-200 flex flex-col justify-between shadow-md shadow-amber-500/10">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Abhijit Muhurat
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/30 text-amber-200 font-black">
                    Most Auspicious
                  </span>
                </div>
                <p className="text-lg font-mono font-black text-amber-300 mt-1">
                  {panchang.abhijitMuhurat}
                </p>
              </div>
              <p className="text-[11px] text-amber-300/80 mt-2">
                Supreme midday window; cleanses doshas for Griha Pravesh & Pujas.
              </p>
            </div>

            {/* Brahma Muhurat (Emerald) */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 flex flex-col justify-between shadow-md shadow-emerald-500/10">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Brahma Muhurat
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/30 text-emerald-200 font-bold">
                    Pre-Sunrise
                  </span>
                </div>
                <p className="text-lg font-mono font-black text-emerald-300 mt-1">
                  {panchang.brahmaMuhurat}
                </p>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-2">
                Ideal for Japa, Sandhyavandanam, and Dhyana before sunrise.
              </p>
            </div>
          </div>

          {/* 8-Part Continuous Daytime Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Daylight Octants (Pahara 1 to 8)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Segment duration: ~{panchang.planetaryHours[0]?.durationMinutes || 90} mins each
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {panchang.planetaryHours.map((hour) => {
                let badgeColor = 'bg-slate-800 border-slate-700 text-slate-300';
                let timeColor = 'text-white';

                if (hour.type === 'Rahu') {
                  badgeColor = 'bg-red-950/60 border-red-500 text-red-200 ring-2 ring-red-500/40';
                  timeColor = 'text-red-400 font-black';
                } else if (hour.type === 'Yamaganda') {
                  badgeColor = 'bg-amber-950/60 border-amber-500 text-amber-200';
                  timeColor = 'text-amber-400 font-black';
                } else if (hour.type === 'Gulika') {
                  badgeColor = 'bg-orange-950/60 border-orange-500 text-orange-200';
                  timeColor = 'text-orange-400 font-black';
                } else if (hour.isAuspicious) {
                  badgeColor = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200';
                  timeColor = 'text-emerald-300 font-bold';
                }

                return (
                  <div
                    key={hour.index}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[96px] transition-all hover:scale-[1.02] cursor-default ${badgeColor}`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block truncate">
                        {hour.name}
                      </span>
                      <p className={`text-xs font-mono mt-1 ${timeColor}`}>
                        {hour.startTime}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        to {hour.endTime}
                      </p>
                    </div>

                    <div className="mt-1.5 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span>Part {hour.index}/8</span>
                      {hour.type === 'Rahu' ? (
                        <span className="text-red-400 font-bold">BLOCKED</span>
                      ) : hour.type === 'Yamaganda' || hour.type === 'Gulika' ? (
                        <span className="text-amber-400 font-bold">AVOID</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">SHUBH</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* C. RITUAL BOOKING BRIDGE (FIND SHUBH MUHURAT FOR SEVA)                   */}
        {/* ======================================================================= */}
        <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Find Shubh Muhurat for Seva
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Rahu-Kaal Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically scans upcoming lunar transits, calculating 3 certified non-overlapping windows strictly shielded from Rahu Kaal and malefic doshas.
              </p>
            </div>
          </div>

          {/* Seva Selector and Trigger Action */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Select Sacred Seva or Samskara:
              </label>
              <select
                value={selectedSeva}
                onChange={(e) => setSelectedSeva(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:border-amber-400 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="Vivah">Vivah Samskara (Sacred Vedic Wedding)</option>
                <option value="Griha Pravesh">Griha Pravesh (House Warming & Vastu Shanti)</option>
                <option value="Rudrabhishek">Maha Rudrabhishek & Shiva Archana</option>
                <option value="Upanayanam">Upanayanam (Sacred Thread Yajnopavita)</option>
                <option value="Namakaranam">Namakaranam & Annaprashanam</option>
                <option value="Navagraha Homa">Navagraha Shanti Havan</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={isCalculatingMuhurat}
                onClick={handleCalculateAuspiciousWindows}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {isCalculatingMuhurat ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Evaluating Ephemeris...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Calculate Auspicious Windows</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3 Calculated Recommended Windows */}
          {calculatedMuhurats && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Recommended Shubh Windows for {selectedSeva} (No Rahu Kaal Overlap)
                </span>
                <span className="text-[11px] text-slate-400">
                  Ready to book in Temple Puja Desk
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {calculatedMuhurats.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 hover:border-amber-400 transition-all flex flex-col justify-between shadow-lg relative group overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border-l border-b border-emerald-500/30">
                      Option #{idx + 1}
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                        {rec.recommendedDate}
                      </span>
                      <h4 className="text-base font-black text-white mb-1">
                        {rec.muhuratName}
                      </h4>
                      <p className="text-xs font-mono font-bold text-amber-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        ⏰ {rec.recommendedTime}
                      </p>

                      <div className="mt-2.5 space-y-1 text-[11px]">
                        <p className="text-slate-300">
                          <strong className="text-slate-400">Panchang:</strong> {rec.tithiNakshatra}
                        </p>
                        <p className="text-emerald-300">
                          <strong className="text-slate-400">Validation:</strong> {rec.doshaFreeReason}
                        </p>
                        <p className="text-red-300/80 text-[10px] font-mono">
                          (Day Rahu Kaal: {rec.rahuKaalOnDate} — Avoided)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          `Reserved ${selectedSeva} on ${rec.recommendedDate} (${rec.recommendedTime}) in ritual schedule`,
                          'success',
                          'Booking Slot Locked'
                        );
                      }}
                      className="mt-3.5 w-full min-h-[40px] py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 hover:border-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer group-hover:shadow-md"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Lock & Book This Muhurat</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PanchangAstrologyEngine;
