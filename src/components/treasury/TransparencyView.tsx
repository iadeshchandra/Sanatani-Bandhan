import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import {
  TransparencySnapshot, formatLakhCrore, formatINRFull, formatTrailDate,
  transparencyCardText,
} from '../../lib/auditTrail';

/* ------------------------------------------------------------------ */
/* TransparencyView — the donor-safe summary.                          */
/*                                                                     */
/* RBAC BY CONSTRUCTION: this component receives ONLY a                */
/* TransparencySnapshot (purpose-level aggregates). Its props type      */
/* physically cannot carry raw ledger entries, donor names, PAN,        */
/* actor names, or reference numbers — so it is provably unable to      */
/* leak the raw ledger. Never widen these props.                       */
/* ------------------------------------------------------------------ */

const T: React.FC<{ en: string; bn: string; hi?: string }> = ({ en, bn, hi }) => {
  const { safeTranslate } = useLanguage();
  return <>{safeTranslate('auditTrail.label', en, bn, hi)}</>;
};

export const TransparencyView: React.FC<{ snapshot: TransparencySnapshot }> = ({ snapshot }) => {
  const wsCurrency = useWorkspaceCurrency();
  const [copied, setCopied] = useState(false);
  const { safeTranslate } = useLanguage();
  const s = snapshot;
  const utilPct = s.totalRaised > 0 ? Math.min(100, (s.totalUtilized / s.totalRaised) * 100) : 0;

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(transparencyCardText(s, wsCurrency.symbol));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable — the card text is still visible below */
    }
  };

  return (
    <div className="rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-temple-950 via-temple-900 to-temple-950 shadow-2xl">
      {/* Share-card header */}
      <div className="px-5 sm:px-8 pt-6 pb-5 text-center border-b border-amber-500/20">
        <div className="text-3xl mb-2">🪔</div>
        <h3 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">{s.orgName}</h3>
        <p className="text-xs sm:text-sm text-temple-300 mt-1">
          <T en="Where every rupee goes — seva transparency" bn="প্রতিটি টাকা কোথায় যায়" hi="हर रुपया कहाँ जाता है" />
        </p>
        <p className="text-[11px] text-temple-400 mt-1 tabular-nums">
          <T en="Updated" bn="হালনাগাদ" hi="अद्यतन" /> {formatTrailDate(new Date(s.generatedAt).toISOString())}
        </p>
      </div>

      {/* Totals */}
      <div className="px-5 sm:px-8 py-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
            <T en="Raised" bn="সংগৃহীত" hi="एकत्रित" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 tabular-nums mt-1">
            {formatLakhCrore(s.totalRaised, wsCurrency.symbol)}
          </div>
          <div className="text-[11px] text-emerald-200/60 tabular-nums">{formatINRFull(s.totalRaised, wsCurrency.symbol)}</div>
        </div>
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300/80">
            <T en="Utilized" bn="ব্যবহৃত" hi="उपयोग" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-300 tabular-nums mt-1">
            {formatLakhCrore(s.totalUtilized, wsCurrency.symbol)}
          </div>
          <div className="text-[11px] text-sky-200/60 tabular-nums">{formatINRFull(s.totalUtilized, wsCurrency.symbol)}</div>
        </div>
      </div>

      {/* Per-purpose progress */}
      <div className="px-5 sm:px-8 pb-5 space-y-3">
        {s.purposes.length === 0 && (
          <p className="text-sm text-temple-300 text-center py-4">
            <T en="No seva records yet." bn="এখনও কোনো রেকর্ড নেই।" hi="अभी कोई रिकॉर्ड नहीं।" />
          </p>
        )}
        {s.purposes.map((p) => {
          const pct = p.raised > 0 ? Math.min(100, (p.utilized / p.raised) * 100) : 0;
          return (
            <div key={p.purpose} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="text-sm font-bold text-amber-100">{p.purpose}</div>
                <div className="text-xs text-temple-300 tabular-nums">
                  <span className="text-emerald-300 font-bold">{formatLakhCrore(p.raised, wsCurrency.symbol)}</span>
                  {' '}<T en="raised" bn="সংগৃহীত" hi="एकत्रित" /> ·{' '}
                  <span className="text-sky-300 font-bold">{formatLakhCrore(p.utilized, wsCurrency.symbol)}</span>
                  {' '}<T en="utilized" bn="ব্যবহৃত" hi="उपयोग" />
                </div>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-white/10 overflow-hidden" role="progressbar"
                aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
                aria-label={`${p.purpose} utilization`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-temple-400 tabular-nums">
                {Math.round(pct)}% <T en="of funds utilized" bn="তহবিল ব্যবহৃত" hi="निधि उपयोग" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust footer */}
      <div className="px-5 sm:px-8 pb-6">
        <div className={`rounded-2xl border p-3.5 flex items-center gap-3 ${
          s.chainIntact === true
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : s.chainIntact === false
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-white/[0.03] border-white/10'
        }`}>
          <span className="text-2xl">{s.chainIntact === true ? '⛓️' : s.chainIntact === false ? '⚠️' : '📒'}</span>
          <div className="text-xs">
            {s.chainIntact === true && (
              <>
                <div className="font-bold text-emerald-300">
                  <T en="Custody chain verified intact" bn="হেফাজত শৃঙ্খল অক্ষত" hi="अभिरक्षा श्रृंखला अक्षत" />
                </div>
                <div className="text-emerald-200/70 tabular-nums">
                  {s.chainEvents} <T en="sealed events — tampering would break the chain" bn="সিল করা ইভেন্ট" hi="सील की गई घटनाएँ" />
                </div>
              </>
            )}
            {s.chainIntact === false && (
              <div className="font-bold text-red-300">
                <T en="Custody chain needs review — please ask the trust office" bn="শৃঙ্খল পর্যালোচনা প্রয়োজন" hi="श्रृंखला समीक्षा आवश्यक" />
              </div>
            )}
            {s.chainIntact === null && (
              <div className="text-temple-300">
                <T en="Custody log is maintained on the trust's device" bn="ট্রাস্টের ডিভাইসে লগ সংরক্ষিত" hi="लॉग ट्रस्ट के डिवाइस पर" />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={copyCard}
          className="mt-4 w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-sm shadow-xl shadow-amber-600/30 transition-all active:scale-[0.99] cursor-pointer"
        >
          {copied
            ? `✓ ${safeTranslate('auditTrail.copied', 'Summary copied — share it anywhere', 'সারসংক্ষেপ কপি হয়েছে', 'सारांश कॉपी हो गया')}`
            : `📤 ${safeTranslate('auditTrail.share', 'Copy shareable summary', 'শেয়ারযোগ্য সারসংক্ষেপ', 'साझा करने योग्य सारांश')}`}
        </button>
        <p className="text-center text-[11px] text-temple-400 mt-2">॥ सत्यमेव जयते ॥</p>
      </div>
    </div>
  );
};

export default TransparencyView;
