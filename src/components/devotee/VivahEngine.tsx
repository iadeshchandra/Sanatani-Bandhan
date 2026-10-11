import React, { useState, useMemo } from 'react';
import {
  Heart,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  MapPin,
  Briefcase,
  Flame,
  CheckCircle2,
  Lock,
  Send,
  Info,
  SlidersHorizontal,
  BadgeCheck,
  User,
} from 'lucide-react';
import { VivahProfile } from '../../types/b2c';
import { calculateGunaMilan, AshtakootaBreakdown } from '../../utils/astrology/gunaMilan';
import { useToast } from '../../context/ToastContext';

export interface VivahEngineProps {
  currentUser?: VivahProfile;
  onBack?: () => void;
}

interface ExtendedVivahProfile extends VivahProfile {
  location: string;
  education: string;
  bio: string;
  photoUrl?: string;
  familyValues: string;
  diet: string;
}

export const VivahEngine: React.FC<VivahEngineProps> = ({
  currentUser: initialCurrentUser,
  onBack,
}) => {
  const { showToast } = useToast();

  // Current User Profile (defaults to Devotee's authenticated Kundali parameters)
  const [currentUser] = useState<VivahProfile>(
    initialCurrentUser || {
      id: 'dev-108',
      userId: 'user-somnath',
      name: 'Somnath Sharma',
      age: 28,
      gotra: 'Kashyapa',
      nakshatra: 'Rohini',
      rashi: 'Vrishabha',
      manglikStatus: 'Non-Manglik',
      profession: 'Vedic Software Engineer & Dharma Researcher',
      verified: true,
    }
  );

  // 3 Curated Matches in Feed
  const [matchProfiles] = useState<ExtendedVivahProfile[]>([
    {
      id: 'vivah-01',
      userId: 'user-ananya-401',
      name: 'Ananya Deshmukh',
      age: 26,
      gotra: 'Bharadwaja',
      nakshatra: 'Mrigashirsha',
      rashi: 'Mithuna',
      manglikStatus: 'Non-Manglik',
      profession: 'Ayurvedic Physician (BAMS, Pune)',
      education: 'MD (Dravyaguna), Tilak Ayurved Mahavidyalaya',
      location: 'Pune / Mumbai, Maharashtra',
      familyValues: 'Traditional Sanatani with modern outlook',
      diet: 'Satvik Pure Vegetarian',
      bio: 'Practicing Nadi Pariksha ayurveda with a deep devotion to Sri Rama and classical temple arts.',
      verified: true,
    },
    {
      id: 'vivah-02',
      userId: 'user-priyanka-802',
      name: 'Priyanka Sharma',
      age: 27,
      gotra: 'Kashyapa', // SAGOTRA: Triggers Vedic Exogamy Warning
      nakshatra: 'Uttara Phalguni',
      rashi: 'Kanya',
      manglikStatus: 'Non-Manglik',
      profession: 'Classical Dhrupad Vocalist & Sanskrit Faculty',
      education: 'MA in Sanskrit & Sangeet Alankar',
      location: 'Varanasi, Uttar Pradesh',
      familyValues: 'Rigorous Vedic lineage & ritual discipline',
      diet: 'Pure Vegetarian (No Onion/Garlic)',
      bio: 'Dedicated to preserving ancient Samavedic chanting traditions and Kashi cultural heritage.',
      verified: true,
    },
    {
      id: 'vivah-03',
      userId: 'user-meera-109',
      name: 'Meera Iyer',
      age: 25,
      gotra: 'Vashishta',
      nakshatra: 'Revati',
      rashi: 'Meena',
      manglikStatus: 'Anshik Manglik',
      profession: 'Vedic Mandir Conservationist & Architect',
      education: 'B.Arch (SPA Delhi), M.Sc Heritage Preservation',
      location: 'Chennai / Madurai, Tamil Nadu',
      familyValues: 'Devout Smartha tradition & temple seva',
      diet: 'Lacto-Vegetarian',
      bio: 'Restoring ancient Chola and Pandya stone temples using traditional Shilpa Shastra specifications.',
      verified: true,
    },
  ]);

  // Track connection request statuses
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  // Expanded koota breakdowns
  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});
  // Filter mode
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorable' | 'verified'>('all');

  // Handle request connect click
  const handleRequestConnect = (profile: ExtendedVivahProfile, isGotraMatch: boolean) => {
    if (isGotraMatch) {
      showToast(
        'Sagotra matches are prohibited by Shastric injunction. Connection requests are blocked.',
        'error',
        'Sagotra Injunction'
      );
      return;
    }

    setSentRequests((prev) => ({ ...prev, [profile.id]: true }));
    showToast(
      `Confidential connection proposal sent to ${profile.name}'s verified Dharmic family custodian.`,
      'success',
      'Vedic Proposal Dispatched'
    );
  };

  const toggleBreakdown = (profileId: string) => {
    setExpandedBreakdown((prev) => ({
      ...prev,
      [profileId]: !prev[profileId],
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20 text-slate-100 font-sans">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
              title="Back to Devotee Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <h1 className="text-sm font-black text-white tracking-wide">
                Sanatani Vivah
              </h1>
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono tracking-tight">
              Trusted Vedic Matchmaking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>Vedic Exogamy</span>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* BANNER / SHASTRA PRINCIPLE */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30 border border-amber-500/30 text-xs shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ashtakoota Milan &amp; Gotra Exogamy Engine</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Matches are scored across 36 astrological Gunas (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot &amp; Nadi). In accordance with Shastras, <strong>Sagotra (same gotra) marriages are prohibited</strong> to preserve healthy dharmic lineage.
          </p>
        </div>

        {/* MY PROFILE SUMMARY CARD */}
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                  My Vedic Kundali Coordinates
                </span>
                <span className="text-xs font-black text-white flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.verified && (
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                  )}
                </span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold">
              {currentUser.manglikStatus || 'Non-Manglik'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Gotra</span>
              <span className="text-amber-300 font-bold">{currentUser.gotra || 'Kashyapa'}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Nakshatra</span>
              <span className="text-white font-bold">{currentUser.nakshatra || 'Rohini'}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Rashi</span>
              <span className="text-white font-bold">{currentUser.rashi || 'Vrishabha'}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Mandir Verified Identity: <strong>#MK-88219</strong></span>
            <span className="text-amber-400 font-semibold">Active Profile ✓</span>
          </div>
        </div>

        {/* FEED FILTER PILLS */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-xs font-black text-white flex items-center gap-1">
            <span>Verified Dharmic Matches</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {matchProfiles.length}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('favorable')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeFilter === 'favorable'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Favorable
            </button>
          </div>
        </div>

        {/* MATCHES FEED */}
        <div className="space-y-4">
          {matchProfiles
            .filter((profile) => {
              if (activeFilter === 'favorable') {
                const milan = calculateGunaMilan(currentUser, profile);
                return milan.recommendation === 'Favorable';
              }
              return true;
            })
            .map((matchProfile) => {
              // Call calculateGunaMilan for each profile
              const milan = calculateGunaMilan(currentUser, matchProfile);
              const isRequested = Boolean(sentRequests[matchProfile.id]);
              const isExpanded = Boolean(expandedBreakdown[matchProfile.id]);

              return (
                <div
                  key={matchProfile.id}
                  className={`rounded-3xl p-4.5 bg-slate-900 border transition-all shadow-xl ${
                    milan.isGotraMatch
                      ? 'border-rose-900/60 bg-gradient-to-b from-rose-950/20 via-slate-900 to-slate-900'
                      : 'border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-600 to-purple-600 p-[2px] shrink-0 shadow-md">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300 font-bold text-base">
                          {matchProfile.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white">
                            {matchProfile.name}
                          </h3>
                          <span className="text-xs text-slate-400 font-mono">
                            ({matchProfile.age} yrs)
                          </span>
                          {matchProfile.verified && (
                            <span
                              title="Verified by Sri Kashi Vishwanath Purohit Trust"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-mono text-emerald-300 font-bold"
                            >
                              <BadgeCheck className="w-3 h-3 text-emerald-400" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{matchProfile.profession}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{matchProfile.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ASTROLOGICAL ATTRIBUTES GRID */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase block">Gotra</span>
                      <span className={`font-bold truncate block ${milan.isGotraMatch ? 'text-rose-400' : 'text-amber-300'}`}>
                        {matchProfile.gotra}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase block">Nakshatra</span>
                      <span className="text-white font-bold truncate block">{matchProfile.nakshatra}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase block">Rashi</span>
                      <span className="text-white font-bold truncate block">{matchProfile.rashi}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                      <span className="text-[9px] text-slate-500 uppercase block">Manglik</span>
                      <span className="text-emerald-300 font-bold truncate block">
                        {matchProfile.manglikStatus === 'Non-Manglik' ? 'No' : matchProfile.manglikStatus}
                      </span>
                    </div>
                  </div>

                  {/* PROMINENT GUNA MILAN SCORE BANNER */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                        <span className="text-xs font-black text-amber-400 tracking-wide">
                          🔥 {milan.score}/{milan.outOf} Gunas Matched
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          milan.recommendation === 'Favorable'
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {milan.recommendation}
                      </span>
                    </div>

                    {/* Progress Bar of Gunas */}
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          milan.isGotraMatch
                            ? 'bg-rose-600'
                            : milan.score >= 28
                            ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                        style={{ width: `${Math.round((milan.score / 36) * 100)}%` }}
                      />
                    </div>

                    {/* Vedic Verdict Note */}
                    {milan.shastricVerdict && (
                      <p className="text-[10px] text-slate-400 italic leading-snug">
                        {milan.shastricVerdict}
                      </p>
                    )}
                  </div>

                  {/* GOTRA WARNING BADGE IF SAME GOTRA */}
                  {milan.isGotraMatch && (
                    <div className="mt-3 p-3 rounded-2xl bg-rose-950/60 border border-rose-600/70 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-rose-300">
                          ⚠️ Same Gotra - Match Not Recommended per Shastras
                        </div>
                        <p className="text-[10px] text-rose-300/80 leading-relaxed">
                          Both profiles share the <strong>{matchProfile.gotra}</strong> gotra. Classical Vedic law strictly prevents Sagotra marriages for genetic and spiritual exogamy.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ACCORDION: 8 ASHTAKOOTA BREAKDOWN */}
                  {milan.ashtakoota && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleBreakdown(matchProfile.id)}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-amber-300 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Detailed 8-Ashtakoota Analysis</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-[10px] font-mono space-y-2 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">1. Varna (Work & Spirit):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.varna.points} / 1</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">2. Vashya (Dominance):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.vashya.points} / 2</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">3. Tara (Longevity):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.tara.points} / 3</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">4. Yoni (Physical):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.yoni.points} / 4</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">5. Graha Maitri (Mind):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.grahaMaitri.points} / 5</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">6. Gana (Temperament):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.gana.points} / 6</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">7. Bhakoot (Family):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.bhakoot.points} / 7</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-900 flex justify-between items-center">
                              <span className="text-slate-400">8. Nadi (Health/Gene):</span>
                              <span className="text-amber-300 font-bold">{milan.ashtakoota.nadi.points} / 8</span>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 pt-1 text-right">
                            Total: {milan.score} / 36 points calculated via Vedic Ephemeris
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CONNECT ACTION BUTTON */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="text-[10px] text-slate-400 font-mono">
                      <span>Root Family: </span>
                      <strong className="text-slate-200">{matchProfile.familyValues.split(' ')[0]}</strong>
                    </div>

                    {milan.isGotraMatch ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed border border-slate-700/50"
                        title="Sagotra marriages are restricted by Vedic Shastras"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sagotra Restricted</span>
                      </button>
                    ) : isRequested ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Proposal Dispatched ✓</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestConnect(matchProfile, milan.isGotraMatch)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                        <span>Request Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* SECURITY & TRUST FOOTNOTE */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Purohit &amp; Mandir Trust Custodianship</span>
          </div>
          <p className="leading-relaxed">
            All connection requests are routed through verified family elders or registered Purohit mediators. Phone numbers and private horoscope details are kept confidential until both parties give mutual consent.
          </p>
        </div>
      </div>
    </div>
  );
};
