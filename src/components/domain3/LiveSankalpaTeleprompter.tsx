import React, { useState, useEffect } from 'react';
import {
  MonitorPlay,
  Volume2,
  CheckCircle2,
  Pause,
  Play,
  BellRing,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DevoteeSankalp {
  id: string;
  name: string;
  gotra: string;
  nakshatra: string;
  rashi: string;
  intention: string;
  pujaService: string;
  recited: boolean;
}

const MOCK_DEVOTEES: DevoteeSankalp[] = [
  {
    id: 'sankalp-1',
    name: 'Sri Rajeshwar Prasad Sharma & Parivar',
    gotra: 'Kashyapa',
    nakshatra: 'Rohini (Pada 2)',
    rashi: 'Vrishabha (Taurus)',
    intention: 'Sarva Karya Siddhi, Deerghayushya, Family Health & Prosperity',
    pujaService: 'Maha Rudrabhishek with Bilva Patra',
    recited: false,
  },
  {
    id: 'sankalp-2',
    name: 'Smt. Gayatri Devi Agrawal',
    gotra: 'Vashistha',
    nakshatra: 'Pushya (Pada 4)',
    rashi: 'Karka (Cancer)',
    intention: 'Santan Sanrakshan, Mental Peace & Academic Excellence for Children',
    pujaService: 'Maha Rudrabhishek with Bilva Patra',
    recited: false,
  },
  {
    id: 'sankalp-3',
    name: 'Sri Aloknath & Meenakshi Mukherjee',
    gotra: 'Sandilya',
    nakshatra: 'Uttara Phalguni',
    rashi: 'Kanya (Virgo)',
    intention: 'Vyapar Vriddhi, Relief from Planetary Graha Dosha & Pitru Ashirvad',
    pujaService: 'Maha Rudrabhishek with Bilva Patra',
    recited: false,
  },
  {
    id: 'sankalp-4',
    name: 'Dr. Vikramaditya Somnath Shastri',
    gotra: 'Bharadvaja',
    nakshatra: 'Ardra (Pada 1)',
    rashi: 'Mithuna (Gemini)',
    intention: 'Ayur-Arogya Prapti, Victory in Noble Undertakings & Dharma Raksha',
    pujaService: 'Maha Rudrabhishek with Bilva Patra',
    recited: false,
  },
  {
    id: 'sankalp-5',
    name: 'Sri Raghavendra Kulkarni & Family',
    gotra: 'Gautama',
    nakshatra: 'Shravana (Pada 3)',
    rashi: 'Makara (Capricorn)',
    intention: 'Nirvighna Griha Nirman, Mangala Karyas & Spiritual Upliftment',
    pujaService: 'Maha Rudrabhishek with Bilva Patra',
    recited: false,
  },
];

export const LiveSankalpaTeleprompter: React.FC = () => {
  const { showToast } = useToast();
  const [devotees, setDevotees] = useState<DevoteeSankalp[]>(MOCK_DEVOTEES);
  const [activeDevoteeIndex, setActiveDevoteeIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [recitedPings, setRecitedPings] = useState<number>(0);
  const [visualPing, setVisualPing] = useState<boolean>(false);

  // Auto-scroll logic when isPlaying is true
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveDevoteeIndex((prevIndex) => {
          if (prevIndex >= devotees.length - 1) {
            setIsPlaying(false);
            return prevIndex;
          }
          return prevIndex + 1;
        });
      }, 6000); // 6 seconds per devotee
    }
    return () => clearInterval(interval);
  }, [isPlaying, devotees.length]);

  const currentDevotee = devotees[activeDevoteeIndex] || devotees[0];
  const recitedCount = devotees.filter((d) => d.recited).length;
  const progressPercent = Math.round((recitedCount / devotees.length) * 100);

  const handleMarkRecited = () => {
    setVisualPing(true);
    setTimeout(() => setVisualPing(false), 800);

    // Mark current devotee as recited
    setDevotees((prev) =>
      prev.map((d, idx) => (idx === activeDevoteeIndex ? { ...d, recited: true } : d))
    );
    setRecitedPings((prev) => prev + 1);

    showToast(
      `Sankalpa invoked for ${currentDevotee.name}. WhatsApp confirmation dispatched to devotee!`,
      'success',
      'Sanctum Audio Invocation'
    );

    // Advance to next devotee if available
    if (activeDevoteeIndex < devotees.length - 1) {
      setActiveDevoteeIndex((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (activeDevoteeIndex < devotees.length - 1) {
      setActiveDevoteeIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeDevoteeIndex > 0) {
      setActiveDevoteeIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setActiveDevoteeIndex(0);
    setIsPlaying(false);
    setDevotees(MOCK_DEVOTEES.map((d) => ({ ...d, recited: false })));
    showToast('Sankalpa Teleprompter reset to Devotee 1.', 'info', 'Teleprompter');
  };

  return (
    <div className="bg-black text-amber-500 rounded-3xl p-6 sm:p-10 border-2 border-amber-600/40 shadow-2xl space-y-8 max-w-6xl mx-auto relative overflow-hidden select-none font-sans">
      {/* Visual audio-ping halo effect on recitation */}
      {visualPing && (
        <div className="absolute inset-0 bg-amber-500/10 pointer-events-none animate-ping rounded-3xl duration-500" />
      )}

      {/* SECTION 1: HEADER & SANCTUM STATUS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span>Sanctum High-Contrast HUD</span>
            </span>
            <span className="text-xs text-amber-400/80 font-mono">
              Garbhagriha Terminal: ARCHAKA-SCREEN-01
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight flex items-center gap-2.5">
            <MonitorPlay className="w-7 h-7 text-amber-400" />
            <span>Maha Sankalpa Sanctum Teleprompter</span>
          </h1>
        </div>

        {/* Recitation Counter & Reset */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-[10px] text-amber-400/70 uppercase block font-bold">
              Progress / Invocations
            </span>
            <span className="text-base font-black text-amber-300">
              {recitedCount} / {devotees.length} ({progressPercent}%)
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 rounded-xl border border-amber-700/60 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 transition-colors cursor-pointer"
            title="Reset to Devotee 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 2: DESHA-KALA SANSKRIT PREAMBLE */}
      <div className="p-5 sm:p-6 rounded-2xl bg-amber-950/20 border border-amber-600/30 text-amber-200/90 space-y-2 relative">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-amber-900/50 pb-2">
          <span>॥ देशकाल सङ्कीर्तनम् ॥ (Vedic Desha-Kala Invocation)</span>
          <span>विक्रम संवत् २०८३ &bull; प्रमाथी नाम संवत्सरे &bull; शुक्ल पक्षे</span>
        </div>

        <p className="text-sm sm:text-base font-serif text-amber-100 leading-relaxed tracking-wide pt-1">
          ॐ तत्सत् अद्य ब्रह्मणो द्वितीयपरार्धे श्रीश्वेतवाराहकल्पे वैवस्वतमन्वन्तरे अष्टाविंशतितमे कलियुगे कलिप्रथमचरणे जम्बूद्वीपे भारतवर्षे आर्यावर्तैकदेशे पुण्यपवित्रे श्रीकाशीक्षेत्रे आनन्दवने महाश्मशाने...
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-amber-300/80 pt-2 border-t border-amber-900/40">
          <span>ऋतु: <strong>शरद्</strong></span>
          <span>&bull;</span>
          <span>मास: <strong>आश्विन</strong></span>
          <span>&bull;</span>
          <span>तिथि: <strong>एकादशी</strong></span>
          <span>&bull;</span>
          <span>नक्षत्र: <strong>श्रवण</strong></span>
          <span>&bull;</span>
          <span>मुहूर्त: <strong className="text-emerald-400">अभिजित् (Active)</strong></span>
        </div>
      </div>

      {/* SECTION 3: THE CAROUSEL - MASSIVE YAJAMAN PROMPTER */}
      <div className="p-8 sm:p-12 rounded-3xl bg-amber-950/30 border-2 border-amber-500/50 shadow-inner relative text-center space-y-6">
        <div className="flex items-center justify-between text-xs font-mono text-amber-400/80 uppercase tracking-widest pb-2 border-b border-amber-900/60">
          <span>Yajaman Record {activeDevoteeIndex + 1} of {devotees.length}</span>
          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
            {currentDevotee.recited ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> उच्चारित (Recited)
              </span>
            ) : (
              <span>Awaiting Chanting</span>
            )}
          </span>
        </div>

        {/* Massive Devotee Name */}
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-widest font-mono text-amber-400/70 font-extrabold block">
            यजमान नाम / Devotee Full Name
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-amber-300 tracking-tight leading-tight">
            {currentDevotee.name}
          </h2>
        </div>

        {/* Gotra, Nakshatra & Rashi Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-3xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-black border border-amber-600/40 text-center">
            <span className="text-[10px] font-mono text-amber-400/70 uppercase block font-bold">
              गोत्रम् / Gotra
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-serif">
              {currentDevotee.gotra}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black border border-amber-600/40 text-center">
            <span className="text-[10px] font-mono text-amber-400/70 uppercase block font-bold">
              नक्षत्रम् / Nakshatra
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-200 font-mono">
              {currentDevotee.nakshatra}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black border border-amber-600/40 text-center">
            <span className="text-[10px] font-mono text-amber-400/70 uppercase block font-bold">
              राशिः / Janma Rashi
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-200 font-mono">
              {currentDevotee.rashi}
            </span>
          </div>
        </div>

        {/* Sankalpa Intention */}
        <div className="p-4 rounded-2xl bg-black/80 border border-amber-700/50 max-w-3xl mx-auto">
          <span className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wider block font-bold mb-1">
            सङ्कल्प प्रयोजनम् / Sacred Intention & Prayer
          </span>
          <p className="text-base sm:text-lg font-bold text-amber-100 font-serif leading-relaxed">
            &ldquo;{currentDevotee.intention}&rdquo;
          </p>
          <span className="text-xs font-mono text-amber-400/80 block mt-2">
            Puja: <strong>{currentDevotee.pujaService}</strong>
          </span>
        </div>
      </div>

      {/* SECTION 4: SANCTUM ACTION CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Nav Buttons (Prev/Next) */}
        <div className="md:col-span-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeDevoteeIndex === 0}
            className="flex-1 py-3.5 px-3 rounded-2xl border border-amber-700/60 bg-amber-950/40 hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed text-amber-300 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Yajaman</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`py-3.5 px-4 rounded-2xl border font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                : 'border-amber-700/60 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Auto'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={activeDevoteeIndex === devotees.length - 1}
            className="flex-1 py-3.5 px-3 rounded-2xl border border-amber-700/60 bg-amber-950/40 hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed text-amber-300 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Giant Invocate Button */}
        <div className="md:col-span-8">
          <button
            type="button"
            onClick={handleMarkRecited}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-slate-950 font-black text-lg sm:text-xl shadow-2xl shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-3 tracking-wide"
          >
            <BellRing className="w-6 h-6 text-slate-950 animate-bounce" />
            <span>MARK RECITED (उच्चारित)</span>
            <Send className="w-5 h-5 text-slate-950" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveSankalpaTeleprompter;
