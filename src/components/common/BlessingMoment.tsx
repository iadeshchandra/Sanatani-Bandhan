import React, { useCallback } from 'react';
import { OrgLogo } from './OrgLogo';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * BlessingMoment — the full-screen "Dhanyavaad" after a donation (Pillar 5).
 * =====================================================================
 * This is the shareable moment: the org's own mark (Pillar 1 OrgLogo —
 * uploaded logo or the lotus monogram, never a broken image), a warm
 * trilingual blessing, the amount in tabular numerals, and a share
 * action. Screenshot-worthy by design: deep maroon, gold rules, diya.
 *
 * Purely presentational: props in, no data fetching, no side effects.
 * Dismisses on backdrop tap, the ✕ button, or Escape.
 */

interface BlessingMomentProps {
  open: boolean;
  onClose: () => void;
  /** Organisation display name (also feeds the monogram fallback). */
  orgName: string;
  /** Uploaded logo URL when the org has one (Pillar 1). */
  logoUrl?: string | null;
  amount?: number;
  currencySymbol?: string;
  purpose?: string;
  /** Warm contextual line, e.g. today's tithi. */
  contextLine?: string;
  /** Devotee name for the personal blessing line. */
  devoteeName?: string;
}

const tr3 = (en: string, bn: string, hi: string, lang: string) =>
  lang === 'bn' ? bn : lang === 'hi' ? hi : en;

function langNow(): string {
  try {
    const saved =
      localStorage.getItem('sanatani_lang') ||
      localStorage.getItem('sb-lang') ||
      localStorage.getItem('sanatani-lang');
    if (saved === 'bn' || saved === 'hi' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

export const BlessingMoment: React.FC<BlessingMomentProps> = ({
  open,
  onClose,
  orgName,
  logoUrl,
  amount,
  currencySymbol = '₹',
  purpose,
  contextLine,
  devoteeName,
}) => {
  const reduced = usePrefersReducedMotion();
  const lang = langNow();

  const share = useCallback(async () => {
    const text = tr3(
      `🙏 Dhanyavaad! I offered ${currencySymbol}${(amount || 0).toLocaleString('en-IN')} to ${orgName}. May the punya be shared with all.`,
      `🙏 ধন্যবাদ! আমি ${orgName}-কে ${currencySymbol}${(amount || 0).toLocaleString('en-IN')} অর্পণ করলাম। সবার মঙ্গল হোক।`,
      `🙏 धन्यवाद! मैंने ${orgName} को ${currencySymbol}${(amount || 0).toLocaleString('en-IN')} अर्पित किया। सबका कल्याण हो।`,
      lang
    );
    try {
      if (navigator.share) {
        await navigator.share({ title: tr3('Dhanyavaad 🙏', 'ধন্যবাদ 🙏', 'धन्यवाद 🙏', lang), text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  }, [amount, currencySymbol, orgName, lang]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={tr3('Blessing', 'আশীর্বাদ', 'आशीर्वाद', lang)}
      onClick={onClose}
      style={{
        background:
          'radial-gradient(120% 90% at 50% 10%, #7c2d12 0%, #431407 55%, #220a04 100%)',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {/* The card */}
        <div
          className={`relative w-full max-w-sm rounded-[32px] border border-amber-500/30 bg-[#2b1208]/80 backdrop-blur px-6 py-8 text-center shadow-2xl ${reduced ? '' : 'anim-blessing-in'}`}
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(251,191,36,0.12)' }}
        >
          {/* Diya */}
          <div className={`text-5xl mb-4 ${reduced ? '' : 'anim-diya'}`} aria-hidden="true">
            🪔
          </div>

          {/* The org's own mark */}
          <div className="flex justify-center mb-4">
            <OrgLogo name={orgName} logoUrl={logoUrl} size={88} withRing />
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/80">
            ॥ {tr3('Dhanyavaad', 'ধন্যবাদ', 'धन्यवाद', lang)} ॥
          </div>
          <h2 className="font-display text-4xl font-black text-amber-100 mt-2 leading-tight">
            {tr3('Dhanyavaad', 'ধন্যবাদ', 'धन्यवाद', lang)}
          </h2>

          {typeof amount === 'number' && amount > 0 && (
            <p className="tnum text-2xl font-black text-amber-300 mt-3">
              {currencySymbol}
              {amount.toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-sm text-amber-100/85 mt-2 font-semibold">{orgName}</p>
          {purpose && <p className="text-xs text-amber-200/60 mt-1">{purpose}</p>}

          {/* Gold rule */}
          <div className="mx-auto my-5 h-px w-40 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" aria-hidden="true" />

          <p className="text-sm text-amber-100/90 leading-relaxed">
            {tr3(
              `Your seva has been received with gratitude${devoteeName ? `, ${devoteeName}` : ''}. May it return to you a hundredfold.`,
              `আপনার সেবা কৃতজ্ঞতার সাথে গৃহীত হয়েছে${devoteeName ? `, ${devoteeName}` : ''}। শতগুণে ফিরে আসুক।`,
              `आपकी सेवा कृतज्ञता सहित स्वीकार हुई${devoteeName ? `, ${devoteeName}` : ''}। सौगुना लौटे।`,
              lang
            )}
          </p>
          {contextLine && (
            <p className="text-[11px] text-amber-200/60 mt-2 font-medium">{contextLine}</p>
          )}

          {/* Actions — all ≥44px */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={share}
              className="pressable min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-sm font-black shadow-lg shadow-amber-600/25 transition-colors"
            >
              {tr3('📤 Share', '📤 শেয়ার', '📤 साझा करें', lang)}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="pressable min-h-[48px] rounded-2xl border border-amber-500/40 bg-white/5 hover:bg-white/10 text-amber-200 text-sm font-black transition-colors"
            >
              {tr3('🙏 Pranam', '🙏 প্রণাম', '🙏 प्रणाम', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onClose}
        aria-label={tr3('Close', 'বন্ধ', 'बंद करें', lang)}
        className="pressable absolute top-4 right-4 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 text-amber-100 text-lg flex items-center justify-center border border-white/15"
      >
        ✕
      </button>
    </div>
  );
};

export default BlessingMoment;
