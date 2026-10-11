import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  calculateDailyPanchang,
  STANDARD_CITIES,
  StandardCity,
  PanchangData,
} from '../../utils/panchang';

export const PanchangMuhuratDesk: React.FC = () => {
  // Location and Date state
  const [selectedCityId, setSelectedCityId] = useState<string>('varanasi');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [customLat, setCustomLat] = useState<number>(25.3176);
  const [customLon, setCustomLon] = useState<number>(82.9739);
  const [isCustomCoord, setIsCustomCoord] = useState<boolean>(false);

  // Active City
  const activeCity = useMemo<StandardCity | undefined>(() => {
    return STANDARD_CITIES.find((c) => c.id === selectedCityId);
  }, [selectedCityId]);

  // Selected date object
  const activeDate = useMemo(() => {
    if (!selectedDateStr) return new Date();
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [selectedDateStr]);

  // Coordinates used
  const activeLat = isCustomCoord ? customLat : activeCity?.lat ?? 25.3176;
  const activeLon = isCustomCoord ? customLon : activeCity?.lon ?? 82.9739;

  // Algorithmic Panchang Calculation
  const panchang: PanchangData = useMemo(() => {
    return calculateDailyPanchang(activeDate, activeLat, activeLon);
  }, [activeDate, activeLat, activeLon]);

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    setIsCustomCoord(false);
    const city = STANDARD_CITIES.find((c) => c.id === cityId);
    if (city) {
      setCustomLat(city.lat);
      setCustomLon(city.lon);
    }
  };

  const handleResetToday = () => {
    setSelectedDateStr(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-temple-950 to-saffron-950 border border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-saffron-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-saffron-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Drik Siddhanta Ephemeris Engine
              </span>
              <span className="text-xs text-amber-200/80 font-mono bg-temple-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                Vikram Samvat {panchang.vikramSamvat} • Shaka {panchang.sakaSamvat}
              </span>
              <span className="text-xs text-amber-300/70 font-serif">
                Masa: {panchang.lunarMonth}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-saffron-300">
              Vedic Panjika & Localized Muhurat Desk
            </h1>

            <p className="text-xs sm:text-sm text-amber-200/70 max-w-2xl leading-relaxed">
              Astronomical planetary hours with 8-part daylight partition for Rahu Kaal, Yamagandam, Gulika Kaal, and Abhijit Muhurat aligned to exact latitude & longitude.
            </p>
          </div>

          {/* Quick Date Control */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-temple-950/90 p-2 rounded-2xl border border-amber-500/30 shadow-inner">
            <CalendarIcon className="w-4 h-4 text-amber-400 ml-2" />
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              className="bg-transparent border-0 text-xs font-mono font-bold text-amber-100 focus:outline-none px-2 py-1 cursor-pointer"
            />
            <button
              type="button"
              onClick={handleResetToday}
              className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-[11px] font-bold flex items-center gap-1 px-2.5 cursor-pointer"
              title="Reset to Today"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>
          </div>
        </div>
      </div>

      {/* Location & Date Selector Card */}
      <div className="bg-gradient-to-b from-temple-900/90 to-temple-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-temple-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-black text-sm text-amber-200 uppercase tracking-wider">
                Geographic Location & Solar Coordinates
              </h3>
              <p className="text-[11px] text-temple-400">
                Panchang timings shift with latitude and longitude due to local solar sunrise & sunset
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsCustomCoord(!isCustomCoord)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isCustomCoord
                  ? 'bg-amber-500 text-temple-950 border-amber-400'
                  : 'bg-temple-900 text-amber-300 border-amber-500/30 hover:border-amber-400'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{isCustomCoord ? 'Using Custom GPS' : 'Custom Lat / Lon'}</span>
            </button>
          </div>
        </div>

        {/* Standard Temple Cities Chips */}
        {!isCustomCoord ? (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-temple-400 uppercase tracking-wider">
              Sacred Tirtha / City Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {STANDARD_CITIES.map((city) => {
                const isSelected = selectedCityId === city.id;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCityChange(city.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-saffron-500 text-temple-950 border-amber-300 shadow-md font-extrabold'
                        : 'bg-temple-950/80 text-amber-200/90 border-temple-800 hover:border-amber-500/50 hover:bg-temple-900'
                    }`}
                  >
                    <span>{city.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({city.lat.toFixed(1)}°N)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                value={customLat}
                onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. 25.3176"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                value={customLon}
                onChange={(e) => setCustomLon(parseFloat(e.target.value) || 0)}
                className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. 82.9739"
              />
            </div>
            <div className="flex items-end">
              <div className="p-2.5 rounded-xl bg-temple-950 border border-amber-500/20 text-[11px] text-amber-200/70 w-full flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>IST timezone (+05:30) applied to coordinates.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Overview Card: Sunrise, Sunset, Tithi, Nakshatra */}
      <div className="bg-gradient-to-r from-amber-950/70 via-temple-900 to-amber-950/70 border border-amber-500/30 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-200">
                Daily Solar & Lunar Overview
              </h2>
              <p className="text-[11px] text-temple-400 font-mono">
                {panchang.gregorianDate} • {isCustomCoord ? `Custom (${activeLat.toFixed(2)}°N, ${activeLon.toFixed(2)}°E)` : activeCity?.name}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Daylight: {panchang.dayLength}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sunrise Card */}
          <div className="p-4 rounded-2xl bg-temple-950/80 border border-amber-500/30 shadow-md relative overflow-hidden group hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Surya Udaya (Sunrise)
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-amber-100">{panchang.sunrise}</p>
            <p className="text-[11px] text-temple-400 mt-1">Start of Vedic Day & Pahar 1</p>
          </div>

          {/* Sunset Card */}
          <div className="p-4 rounded-2xl bg-temple-950/80 border border-amber-500/30 shadow-md relative overflow-hidden group hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Surya Astha (Sunset)
              </span>
              <div className="p-1.5 rounded-lg bg-saffron-500/20 text-saffron-400">
                <Moon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono text-amber-100">{panchang.sunset}</p>
            <p className="text-[11px] text-temple-400 mt-1">Total Daylight: {panchang.dayLength}</p>
          </div>

          {/* Tithi Card */}
          <div className="p-4 rounded-2xl bg-temple-950/80 border border-amber-500/30 shadow-md relative overflow-hidden group hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Tithi (Lunar Day)
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Moon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-amber-200 truncate">{panchang.tithi}</p>
            <p className="text-[11px] text-temple-300 mt-1 truncate" title={panchang.tithiDescription}>
              {panchang.tithiDescription}
            </p>
          </div>

          {/* Nakshatra Card */}
          <div className="p-4 rounded-2xl bg-temple-950/80 border border-amber-500/30 shadow-md relative overflow-hidden group hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Nakshatra (Constellation)
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-amber-200 truncate">{panchang.nakshatra}</p>
            <p className="text-[11px] text-temple-300 mt-1 truncate">
              Lord: {panchang.nakshatraLord}
            </p>
          </div>
        </div>

        {/* Extended Panchanga Row (Vaara, Yoga, Karana) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-temple-800 text-xs">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-temple-950/60 border border-temple-800">
            <span className="text-temple-400 font-bold">Vaara (Day):</span>
            <span className="font-bold text-amber-200 font-mono">{panchang.vaara} ({panchang.vaaraLord})</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-temple-950/60 border border-temple-800">
            <span className="text-temple-400 font-bold">Yoga:</span>
            <span className="font-bold text-amber-200 font-mono">{panchang.yoga}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-temple-950/60 border border-temple-800">
            <span className="text-temple-400 font-bold">Karana:</span>
            <span className="font-bold text-amber-200 font-mono">{panchang.karana}</span>
          </div>
        </div>
      </div>

      {/* Planetary Hours (Kaal) Timeline Grid */}
      <div className="bg-temple-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-temple-800">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-base text-amber-200 uppercase tracking-wider">
                Planetary Hours (8 Daylight Segments / Pahar Timeline)
              </h3>
            </div>
            <p className="text-xs text-temple-400 mt-0.5">
              Daylight divided into 8 equal parts (~90 mins each) with weekday-specific planetary rulership
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-600/80 border border-rose-400" />
              <span className="text-rose-300 font-bold">Inauspicious (Avoid)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600/80 border border-emerald-400" />
              <span className="text-emerald-300 font-bold">Auspicious (Shubh)</span>
            </div>
          </div>
        </div>

        {/* 8-Segment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {panchang.planetaryHours.map((seg) => {
            const isRahu = seg.type === 'Rahu';
            const isGulika = seg.type === 'Gulika';
            const isYama = seg.type === 'Yamaganda';
            const isInauspicious = seg.isInauspicious;

            return (
              <div
                key={seg.index}
                className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                  isRahu
                    ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/40'
                    : isYama || isGulika
                    ? 'bg-orange-950/60 border-orange-500/60 shadow-md'
                    : 'bg-temple-950/80 border-emerald-500/40 hover:border-emerald-400/80 shadow-md'
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isRahu
                        ? 'bg-rose-500/30 text-rose-200 border border-rose-400'
                        : isYama || isGulika
                        ? 'bg-orange-500/30 text-orange-200 border border-orange-400'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    }`}
                  >
                    {isRahu && <AlertTriangle className="w-3 h-3 text-rose-300" />}
                    {seg.name}
                  </span>
                  <span className="text-[10px] font-mono text-temple-400">
                    Part {seg.index} of 8
                  </span>
                </div>

                {/* Time Range */}
                <div className="mb-2">
                  <p
                    className={`text-lg font-black font-mono tracking-tight ${
                      isRahu
                        ? 'text-rose-200'
                        : isYama || isGulika
                        ? 'text-orange-200'
                        : 'text-emerald-200'
                    }`}
                  >
                    {seg.startTime} - {seg.endTime}
                  </p>
                  <p className="text-[11px] font-mono text-temple-400 mt-0.5">
                    Duration: ~{seg.durationMinutes} mins
                  </p>
                </div>

                {/* Description */}
                <p
                  className={`text-[11px] leading-relaxed mt-2 pt-2 border-t ${
                    isRahu
                      ? 'border-rose-900/60 text-rose-300/90'
                      : isYama || isGulika
                      ? 'border-orange-900/60 text-orange-300/90'
                      : 'border-emerald-900/40 text-emerald-300/80'
                  }`}
                >
                  {seg.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auspicious vs Inauspicious Summary Dual Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shubh Muhurats (Auspicious) */}
        <div className="bg-gradient-to-b from-temple-900 to-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-temple-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm text-emerald-200 uppercase tracking-wider">
                Shubh Muhurats (Auspicious Timings)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
              Divine Merit & Success
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Abhijit Muhurat */}
            <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-emerald-500/30 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <p className="font-bold text-amber-200">Abhijit Muhurat (Highest Merit)</p>
                </div>
                <p className="text-[11px] text-temple-400">
                  Solar midday conjunction; removes doshas for deals, travels & vows
                </p>
              </div>
              <p className="font-mono font-black text-emerald-400 text-sm whitespace-nowrap pl-2">
                {panchang.abhijitMuhurat}
              </p>
            </div>

            {/* Brahma Muhurat */}
            <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-emerald-500/30 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <p className="font-bold text-temple-100">Brahma Muhurat (Meditation & Sadhana)</p>
                <p className="text-[11px] text-temple-400">
                  96 to 48 mins prior to Sunrise; optimal for Sandhyavandanam
                </p>
              </div>
              <p className="font-mono font-black text-emerald-400 text-sm whitespace-nowrap pl-2">
                {panchang.brahmaMuhurat}
              </p>
            </div>

            {/* Amrit Kaal */}
            <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-emerald-500/30 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <p className="font-bold text-temple-100">Amrit Kaal</p>
                <p className="text-[11px] text-temple-400">
                  Auspicious timing for puja, medical treatment & purchase
                </p>
              </div>
              <p className="font-mono font-black text-emerald-400 text-sm whitespace-nowrap pl-2">
                {panchang.amritKaal}
              </p>
            </div>
          </div>
        </div>

        {/* Ashubh Kaal (Inauspicious Warning Grid) */}
        <div className="bg-gradient-to-b from-temple-900 to-rose-950/40 border border-rose-500/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-temple-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-black text-sm text-rose-200 uppercase tracking-wider">
                Ashubh Kaal (Inauspicious Windows)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
              Avoid Initiations
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rahu Kaal Highlight Card */}
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/60 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <p className="font-black text-rose-200">Rahu Kaal (Rahu's Period)</p>
                </div>
                <p className="text-[11px] text-rose-300/80">
                  Strictly prohibited for new ventures, signing agreements, or travel
                </p>
              </div>
              <p className="font-mono font-black text-rose-400 text-sm whitespace-nowrap pl-2">
                {panchang.rahuKaal}
              </p>
            </div>

            {/* Yamagandam */}
            <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-rose-500/30 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <p className="font-bold text-temple-100">Yamagandam (Yama's Hour)</p>
                <p className="text-[11px] text-temple-400">
                  Avoid starting long journeys or major investments
                </p>
              </div>
              <p className="font-mono font-black text-orange-400 text-sm whitespace-nowrap pl-2">
                {panchang.yamagandam}
              </p>
            </div>

            {/* Gulika Kaal */}
            <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-rose-500/30 flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <p className="font-bold text-temple-100">Gulika Kaal (Saturn Sub-Planet)</p>
                <p className="text-[11px] text-temple-400">
                  Actions started tend to repeat; avoid borrowing or concluding
                </p>
              </div>
              <p className="font-mono font-black text-orange-400 text-sm whitespace-nowrap pl-2">
                {panchang.gulikaKaal}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
