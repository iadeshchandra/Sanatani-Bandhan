import React, { useEffect, useMemo, useState } from 'react';
import { WifiOff, ShieldCheck, Ban } from 'lucide-react';

/**
 * AuthArt — the ambient "dawn" art panel for the auth scene.
 * Rotating sacred-geometry mandala, rising diya particles, staggered
 * word-reveal headline, rotating shloka carousel, honest trust badges.
 * Renders full-size on desktop; a compact band on mobile (compact=true).
 * transform/opacity animation only; honours prefers-reduced-motion.
 */

export type AuthLang = 'en' | 'hi' | 'bn';

const COPY: Record<AuthLang, {
  eyebrow: string;
  headline: string[];
  sub: string;
  quotes: { line: string; meaning: string }[];
  badges: { icon: 'wifi' | 'shield' | 'ban'; text: string }[];
}> = {
  en: {
    eyebrow: 'Sanatani Bandhan',
    headline: ['Your Dharma,', 'digitally at home.'],
    sub: 'One Sanatani identity for every sacred space — your practice, your community, your service.',
    quotes: [
      { line: 'वसुधैव कुटुम्बकम्', meaning: 'The world is one family.' },
      { line: 'धर्मो रक्षति रक्षितः', meaning: 'Dharma protects those who protect it.' },
      { line: 'तमसो मा ज्योतिर्गमय', meaning: 'Lead me from darkness to light.' },
    ],
    badges: [
      { icon: 'wifi', text: 'Offline-first' },
      { icon: 'shield', text: 'Your data stays yours' },
      { icon: 'ban', text: 'No ads, ever' },
    ],
  },
  hi: {
    eyebrow: 'सनातनी बंधन',
    headline: ['आपका धर्म,', 'अब डिजिटल घर में।'],
    sub: 'हर पवित्र स्थान के लिए एक सनातनी पहचान — आपकी साधना, आपका समुदाय, आपकी सेवा।',
    quotes: [
      { line: 'वसुधैव कुटुम्बकम्', meaning: 'संपूर्ण विश्व एक परिवार है।' },
      { line: 'धर्मो रक्षति रक्षितः', meaning: 'धर्म उसकी रक्षा करता है जो धर्म की रक्षा करता है।' },
      { line: 'तमसो मा ज्योतिर्गमय', meaning: 'मुझे अंधकार से प्रकाश की ओर ले चलो।' },
    ],
    badges: [
      { icon: 'wifi', text: 'ऑफ़लाइन-फर्स्ट' },
      { icon: 'shield', text: 'आपका डेटा आपका ही रहता है' },
      { icon: 'ban', text: 'कोई विज्ञापन नहीं' },
    ],
  },
  bn: {
    eyebrow: 'সনাতনী বন্ধন',
    headline: ['আপনার ধর্ম,', 'এখন ডিজিটাল ঘরে।'],
    sub: 'প্রতিটি পবিত্র স্থানের জন্য একটি সনাতনী পরিচয় — আপনার সাধনা, আপনার সম্প্রদায়, আপনার সেবা।',
    quotes: [
      { line: 'বসুধৈব কুটুম্বকম্', meaning: 'সমগ্র বিশ্ব এক পরিবার।' },
      { line: 'ধর্মো রক্ষতি রক্ষিতঃ', meaning: 'ধর্ম তাকেই রক্ষা করে যে ধর্মকে রক্ষা করে।' },
      { line: 'তমসো মা জ্যোতির্গময়', meaning: 'আমাকে অন্ধকার থেকে আলোর দিকে নিয়ে চলো।' },
    ],
    badges: [
      { icon: 'wifi', text: 'অফলাইন-ফার্স্ট' },
      { icon: 'shield', text: 'আপনার ডেটা আপনারই থাকে' },
      { icon: 'ban', text: 'কোনো বিজ্ঞাপন নয়' },
    ],
  },
};

const badgeIcon = (icon: 'wifi' | 'shield' | 'ban') =>
  icon === 'wifi' ? <WifiOff size={13} /> : icon === 'shield' ? <ShieldCheck size={13} /> : <Ban size={13} />;

/** Deterministic pseudo-random diya particles (no Math.random → stable SSR/hydration). */
const DIYAS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61 + 13) % 100}%`,
  delay: `${((i * 1.37) % 10).toFixed(2)}s`,
  dur: `${(9 + (i % 5) * 1.7).toFixed(2)}s`,
  size: 4 + (i % 3) * 2.5,
  drift: `${((i * 37) % 41) - 20}px`,
}));

/** Sacred-geometry mandala: concentric rings, petal circles, tick ring, ॐ heart. */
const Mandala: React.FC = () => {
  const cx = 300, cy = 300;
  const rings = [72, 112, 152, 192, 232, 268];
  const petals16 = useMemo(() => Array.from({ length: 16 }, (_, i) => (i * 360) / 16), []);
  const petals24 = useMemo(() => Array.from({ length: 24 }, (_, i) => (i * 360) / 24), []);
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => (i * 360) / 72), []);
  return (
    <svg viewBox="0 0 600 600" className="w-full h-full" aria-hidden="true" role="presentation">
      <defs>
        <radialGradient id="authMandalaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb03a" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ff8e00" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ff8e00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={292} fill="url(#authMandalaGlow)" />
      {/* Counter-rotating outer geometry */}
      <g className="auth-spin-rev">
        {rings.map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#FFD58A" strokeOpacity="0.30" strokeWidth="1" />
        ))}
        {petals24.map((deg) => (
          <ellipse
            key={'p24' + deg}
            cx={cx} cy={cy - 210} rx={17} ry={58}
            fill="none" stroke="#FFD58A" strokeOpacity="0.32" strokeWidth="1"
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        ))}
      </g>
      {/* Co-rotating inner geometry */}
      <g className="auth-spin-slow">
        {petals16.map((deg) => (
          <ellipse
            key={'p16' + deg}
            cx={cx} cy={cy - 132} rx={26} ry={64}
            fill="none" stroke="#FFCA6B" strokeOpacity="0.42" strokeWidth="1.1"
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        ))}
        {ticks.map((deg) => (
          <line
            key={'t' + deg}
            x1={cx} y1={cy - 292} x2={cx} y2={cy - 280}
            stroke="#FFE9B8" strokeOpacity="0.4" strokeWidth="1.4"
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        ))}
      </g>
      {/* Still heart */}
      <circle cx={cx} cy={cy} r={52} fill="none" stroke="#FFD58A" strokeOpacity="0.55" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={40} fill="none" stroke="#FFD58A" strokeOpacity="0.3" strokeWidth="1" />
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="64" fill="#FFE9B8" fillOpacity="0.9" fontFamily="serif">ॐ</text>
    </svg>
  );
};

interface AuthArtProps {
  lang: AuthLang;
  compact?: boolean;
  className?: string;
}

export const AuthArt: React.FC<AuthArtProps> = ({ lang, compact = false, className = '' }) => {
  const copy = COPY[lang] || COPY.en;
  const [quoteIdx, setQuoteIdx] = useState(0);
  const reduced = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced || compact) return;
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % copy.quotes.length), 6000);
    return () => clearInterval(id);
  }, [reduced, compact, copy.quotes.length]);

  if (compact) {
    return (
      <div className={`relative overflow-hidden ${className}`} aria-hidden="true">
        <div className="absolute -right-10 -top-16 w-56 h-56 opacity-60"><Mandala /></div>
        {DIYAS.slice(0, 6).map((d, i) => (
          <span key={i} className="auth-diya" style={{ left: d.left, ['--dd' as any]: d.delay, ['--dur' as any]: d.dur, ['--drift' as any]: d.drift, width: d.size, height: d.size }} />
        ))}
        <div className="relative z-10 px-6 pt-10 pb-6 text-center">
          <p className="auth-rise text-[10px] font-black tracking-[0.35em] uppercase text-saffron-300" style={{ ['--d' as any]: '0.1s' }}>{copy.eyebrow}</p>
          <h1 className="auth-rise mt-2 text-2xl font-black text-white leading-tight" style={{ ['--d' as any]: '0.22s' }}>
            {copy.headline[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-300 to-amber-200">{copy.headline[1]}</span>
          </h1>
        </div>
      </div>
    );
  }

  const words = copy.headline.join(' ').split(' ');
  return (
    <div className={`relative overflow-hidden flex-col justify-between ${className}`} aria-hidden="true">
      {/* Ambient layers */}
      <div className="auth-parallax-deep absolute inset-0 flex items-center justify-center">
        <div className="w-[130%] max-w-none aspect-square opacity-90"><Mandala /></div>
      </div>
      <div className="absolute inset-0 pointer-events-none">
        {DIYAS.map((d, i) => (
          <span key={i} className="auth-diya" style={{ left: d.left, ['--dd' as any]: d.delay, ['--dur' as any]: d.dur, ['--drift' as any]: d.drift, width: d.size, height: d.size }} />
        ))}
      </div>
      {/* Horizon glow */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(80%_60%_at_50%_100%,rgba(255,142,0,0.22),transparent_70%)] pointer-events-none" />

      <div className="auth-parallax relative z-10 flex flex-col items-center text-center px-10 pt-14">
        <p className="auth-rise text-[11px] font-black tracking-[0.45em] uppercase text-saffron-300" style={{ ['--d' as any]: '0.15s' }}>
          {copy.eyebrow}
        </p>
        <h1 className="mt-5 text-[2.9rem] leading-[1.08] font-black text-white tracking-tight max-w-md">
          {words.map((w, i) => (
            <React.Fragment key={i}>
              <span className="auth-rise inline-block mr-[0.28em]" style={{ ['--d' as any]: `${0.3 + i * 0.09}s` }}>{w}</span>
              {i < words.length - 1 ? ' ' : ''}
            </React.Fragment>
          ))}
        </h1>
        <p className="auth-rise mt-5 text-[15px] leading-relaxed text-white/65 max-w-sm font-medium" style={{ ['--d' as any]: '0.85s' }}>
          {copy.sub}
        </p>
      </div>

      <div className="relative z-10 px-10 pb-12">
        {/* Shloka carousel */}
        <div className="auth-fade relative min-h-[92px] flex items-center justify-center text-center" style={{ ['--d' as any]: '1s' }}>
          {copy.quotes.map((q, i) => (
            <div key={i} className="auth-quote" data-active={i === quoteIdx}>
              <p className="text-xl font-bold text-saffron-200 font-serif tracking-wide">{q.line}</p>
              <p className="mt-1.5 text-[13px] text-white/55 italic">{q.meaning}</p>
            </div>
          ))}
        </div>
        {/* Honest trust badges */}
        <div className="auth-fade mt-6 flex items-center justify-center gap-2.5 flex-wrap" style={{ ['--d' as any]: '1.15s' }}>
          {copy.badges.map((b) => (
            <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-white/75 backdrop-blur-sm">
              <span className="text-saffron-300">{badgeIcon(b.icon)}</span>
              {b.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
