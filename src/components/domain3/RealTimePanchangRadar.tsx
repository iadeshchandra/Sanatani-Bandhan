import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Clock,
  ShieldAlert,
  CheckCircle,
  Sparkles,
  Flame,
  AlertTriangle,
  Compass,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';

interface MuhuratSlot {
  id: string;
  name: string;
  sanskritName: string;
  timings: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  type: 'AUSPICIOUS' | 'INAUSPICIOUS' | 'NEUTRAL';
  description: string;
  allowedRituals: string[];
  prohibitedRituals: string[];
}

const DAILY_MUHURATS: MuhuratSlot[] = [
  {
    id: 'muh-1',
    name: 'Brahma Muhurat',
    sanskritName: 'ब्राह्म मुहूर्त',
    timings: '04:24 AM - 05:12 AM',
    status: 'COMPLETED',
    type: 'AUSPICIOUS',
    description: 'Golden hour for meditation, mantra japa, and awakening of sacred deities.',
    allowedRituals: ['Sadhana', 'Gayatri Mantra', 'Prabhat Aarti', 'Veda Recitation'],
    prohibitedRituals: ['Materialistic Samskaras', 'Commercial transactions'],
  },
  {
    id: 'muh-2',
    name: 'Abhijit Muhurat (Golden Window)',
    sanskritName: 'अभिजित् मुहूर्त',
    timings: '11:48 AM - 12:36 PM',
    status: 'ACTIVE',
    type: 'AUSPICIOUS',
    description: 'Most supreme auspicious midday Muhurat ruled by Lord Vishnu; nullifies all planetary doshas.',
    allowedRituals: ['Maha Rudrabhishek', 'Griha Pravesha', 'Maha Ganapati Homa', 'Vivah Samskara', 'All Deva Pujas'],
    prohibitedRituals: ['None - All divine auspicious works permitted'],
  },
  {
    id: 'muh-3',
    name: 'Vijaya Muhurat',
    sanskritName: 'विजय मुहूर्त',
    timings: '02:14 PM - 03:02 PM',
    status: 'UPCOMING',
    type: 'AUSPICIOUS',
    description: 'Brings victory, success in litigations, medical procedures, and enterprise launches.',
    allowedRituals: ['Shanti Pujas', 'Karya Siddhi Homa', 'New Endeavors', 'Ayurvedic Treatment'],
    prohibitedRituals: ['South-facing journeys without remedies'],
  },
  {
    id: 'muh-4',
    name: 'Rahu Kaal (Inauspicious Window)',
    sanskritName: 'राहु काल',
    timings: '04:30 PM - 06:00 PM',
    status: 'UPCOMING',
    type: 'INAUSPICIOUS',
    description: 'Period afflicted by node Rahu. General auspicious ceremonies strictly prohibited.',
    allowedRituals: ['Rahu-Ketu Shanti', 'Sarpa Dosha Nivarana', 'Durga Chandi Path'],
    prohibitedRituals: ['Griha Pravesha', 'Wedding ceremonies', 'Initiating new pujas', 'Financial investments'],
  },
  {
    id: 'muh-5',
    name: 'Godhuli & Sandhya Aarti',
    sanskritName: 'गोधूलि मुहूर्त',
    timings: '06:15 PM - 06:40 PM',
    status: 'UPCOMING',
    type: 'AUSPICIOUS',
    description: 'Auspicious twilight hour as cattle return home; beloved by Sri Lakshmi.',
    allowedRituals: ['Deepa Daan', 'Sandhya Aarti', 'Lakshmi Puja', 'Bhajan Sandhya'],
    prohibitedRituals: ['Heavy meals', 'Sleeping during dusk'],
  },
];

export const RealTimePanchangRadar: React.FC = () => {
  const [selectedMuhurat, setSelectedMuhurat] = useState<MuhuratSlot>(DAILY_MUHURATS[1]); // Abhijit active

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* UI Section 1: Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-600 animate-spin" />
              <span>Real-Time Astronomical Ephemeris</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Coordinates: Varanasi (25.31° N, 82.97° E) &bull; Drik Siddhanta Engine
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-amber-600" />
            <span>Live Panchang Ephemeris Radar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live astronomical daylight partitions, planetary hours, and automated Shastric gatekeeper governing ritual eligibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Tithi: Shukla Ekadashi</span>
          </span>
        </div>
      </div>

      {/* UI Section 2: Visual Timeline & Muhurat Radar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-600" />
              Daylight Partition Timeline (8-Part Muhurat Grid)
            </span>
            <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Current: Abhijit Active
            </span>
          </div>

          <div className="space-y-3">
            {DAILY_MUHURATS.map((muh) => {
              const isActive = muh.status === 'ACTIVE';
              const isSelected = selectedMuhurat.id === muh.id;
              const isAuspicious = muh.type === 'AUSPICIOUS';
              const isInauspicious = muh.type === 'INAUSPICIOUS';

              return (
                <div
                  key={muh.id}
                  onClick={() => setSelectedMuhurat(muh)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 shadow-md shadow-amber-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {muh.name}
                        </span>
                        <span className="text-xs font-serif text-slate-500">
                          ({muh.sanskritName})
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500 text-white animate-pulse">
                            ACTIVE NOW
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{muh.timings}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {isAuspicious ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Auspicious
                        </span>
                      ) : isInauspicious ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Inauspicious (Varjya)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-700">
                          Neutral
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 font-sans line-clamp-1">
                    {muh.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* UI Section 3: Shastric Gatekeeper Terminal */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between text-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Shastric Ritual Gatekeeper
              </span>
              <span className="text-xs font-mono text-slate-400">
                Rule Engine: Active
              </span>
            </div>

            {/* Selected Muhurat Detail Card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">
                    {selectedMuhurat.name}
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">
                    {selectedMuhurat.timings}
                  </p>
                </div>

                <div className="text-right">
                  {selectedMuhurat.type === 'AUSPICIOUS' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      UNRESTRICTED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      LOCKED
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 font-serif leading-relaxed">
                {selectedMuhurat.description}
              </p>
            </div>

            {/* Permitted Rituals List */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-mono font-extrabold uppercase text-emerald-400 flex items-center gap-1 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Permitted & Recommended Rituals:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMuhurat.allowedRituals.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                    >
                      ✓ {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prohibited Rituals List */}
              <div className="pt-2">
                <span className="text-[11px] font-mono font-extrabold uppercase text-rose-400 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Prohibited / Restricted:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMuhurat.prohibitedRituals.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold"
                    >
                      &times; {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shastric Guidance Banner */}
          <div className="mt-5 p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 text-amber-200/90 text-xs flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Shastra Rule:</strong> During Abhijit Muhurat, Sri Hari Vishnu dissolves all doshas. Griha Pravesha, Abhishek, and Satyanarayan Pujas yield maximum spiritual fruit.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimePanchangRadar;
