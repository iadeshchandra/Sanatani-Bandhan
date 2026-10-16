/**
 * PipelineAnalytics — GodMode view of the remedy → ritual pipeline.
 * =====================================================================
 * "Remedies → rituals": how many prescribed remedies became booked pujas
 * (conversion rate), per-direction referral flow, credits paid from the
 * platform's contribution, and a leaderboard of guiding professionals.
 *
 * Measured with reverence — this is care becoming ritual, never sales.
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getPipelineStats,
  getTopReferrers,
  PipelineStats,
  TopReferrer,
} from '../../lib/sevaPro/pipelineAnalytics';
import { sp } from '../../lib/sevaPro/sevaProCopy';

const WINDOWS = [7, 30, 90];

export const PipelineAnalytics: React.FC = () => {
  const { currentLang } = useLanguage();

  const [windowDays, setWindowDays] = useState(30);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [top, setTop] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getPipelineStats(windowDays), getTopReferrers(20)])
      .then(([s, t]) => {
        setStats(s);
        setTop(t);
      })
      .catch(() => {
        setStats(null);
        setTop([]);
      })
      .finally(() => setLoading(false));
  }, [windowDays]);

  const pct = (r: number) => `${Math.round(r * 100)}%`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-stone-900 text-lg">{sp(currentLang, 'remedies_to_rituals')}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{sp(currentLang, 'analytics_hint')}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-stone-200 p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowDays(w)}
              className={`px-4 py-2 rounded-lg text-xs font-bold min-h-[44px] ${
                windowDays === w ? 'bg-stone-900 text-white' : 'text-stone-500'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-stone-400">Reading the sacred flow…</p>
      ) : !stats ? (
        <p className="text-sm text-stone-400">Analytics unavailable right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-2xl font-black text-amber-900">{stats.remediesPrescribed}</p>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Remedies prescribed</p>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-2xl font-black text-orange-900">{stats.gigsBookedFromRemedies}</p>
              <p className="text-[11px] font-bold text-orange-700 uppercase tracking-widest">Became rituals</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-2xl font-black text-emerald-900">{pct(stats.remedyConversionRate)}</p>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Conversion</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['jyotish-to-purohit', 'purohit-to-jyotish'] as const).map((dir) => {
              const s = stats.directions[dir];
              return (
                <div key={dir} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                  <p className="text-sm font-black text-stone-800">
                    {dir === 'jyotish-to-purohit' ? '🔮 Jyotish → Purohit' : '🪔 Purohit → Jyotish'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="font-black">{s.sent}</p><p className="text-[11px] text-stone-500">Guided</p></div>
                    <div><p className="font-black">{s.converted}</p><p className="text-[11px] text-stone-500">Received with love</p></div>
                    <div><p className="font-black">{pct(s.conversionRate)}</p><p className="text-[11px] text-stone-500">Conversion</p></div>
                    <div><p className="font-black">{s.creditsPaid.toLocaleString('en-IN')}</p><p className="text-[11px] text-stone-500">Credits paid</p></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-black text-stone-800 mb-3">💛 Most loving guides</p>
            {top.length === 0 ? (
              <p className="text-xs text-stone-400">No referrals yet — the pipeline is waiting for its first ashirvad.</p>
            ) : (
              <div className="space-y-2">
                {top.map((t, i) => (
                  <div key={t.referrerUid} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-stone-400 font-black">{i + 1}</span>
                    <span className="flex-1 font-bold text-stone-800 truncate">{t.referrerName}</span>
                    <span className="text-xs text-stone-500">{t.sent} guided</span>
                    <span className="text-xs text-stone-500">{t.converted} received</span>
                    <span className="text-xs font-black text-amber-700">
                      🪙 {t.creditsEarned.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
