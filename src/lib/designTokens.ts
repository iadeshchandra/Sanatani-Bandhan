/**
 * designTokens.ts — Sanatani Bandhan canonical design tokens (Pillar 5).
 * =====================================================================
 * One source of truth for the visual language. Different modules were
 * built by different agents; this file names the ONE amber, the ONE
 * maroon, the spacing / radius / shadow scales, and the sacred accents
 * every surface should draw from.
 *
 * IMPLEMENTATION NOTE: the values below mirror the CSS variables in
 * `src/index.css` (`--saffron-*`, `--temple-*`) and the Tailwind v4
 * `@theme` mappings (`saffron-*`, `temple-*`, `sanatani-orange`). The CSS
 * variables remain the runtime source of truth (they power the
 * data-theme="classic" switch); these TS constants are for places that
 * need literal values (canvas, SVG, JS-computed styles) and as
 * documentation of the canonical scale.
 */

/** The ONE amber — saffron. Primary brand color, CTAs, sacred highlights. */
export const AMBER = {
  50: '#FFF9F0',
  100: '#FFF0D4',
  200: '#FFE0A3',
  300: '#FFCA6B',
  400: '#FFAD2E',
  /** Primary CTA / brand. */
  500: '#FF8E00',
  600: '#EB7100',
  700: '#C25300',
  800: '#993F08',
  900: '#7A340C',
  950: '#421802',
} as const;

/** The ONE maroon — deep temple maroon. Headers, monograms, blessing moments. */
export const MAROON = {
  /** Monogram face, deep gradients. */
  dark: '#431407',
  /** Primary maroon. */
  DEFAULT: '#7c2d12',
  /** Soft maroon wash for light surfaces. */
  soft: '#9a3412',
} as const;

/** Sacred accents — gold rules, diya glow, auspicious markers. */
export const SACRED = {
  /** Gold rules, dividers, monogram line-work. */
  gold: '#f59e0b',
  /** Bright saffron for diya flames and active states. */
  saffronBright: '#fbbf24',
  /** Warm cream for text on maroon. */
  cream: '#fffbeb',
  /** Diya glow (radial highlight). */
  diyaGlow: 'rgba(251, 191, 36, 0.35)',
} as const;

/** Spacing scale — 4pt base. Prefer these steps over ad-hoc px values. */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/** Corner-radius scale. Cards lean large; chips lean full. */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

/** Shadow scale — warm-tinted so elevation feels lit by diyas, not neon. */
export const SHADOW = {
  sm: '0 1px 2px rgba(67, 20, 7, 0.08)',
  md: '0 4px 12px rgba(67, 20, 7, 0.10)',
  lg: '0 10px 28px rgba(67, 20, 7, 0.14)',
  xl: '0 20px 48px rgba(67, 20, 7, 0.20)',
  glowAmber: '0 8px 24px rgba(255, 142, 0, 0.25)',
} as const;

/**
 * Display serif stack — OFFLINE-SAFE system serif. Never a webfont:
 * webfonts hurt first paint on 2G and break the offline-first promise.
 * Covers Latin + Devanagari + Bengali serif fallbacks.
 */
export const FONT_DISPLAY_STACK =
  `ui-serif, Georgia, 'Times New Roman', 'Noto Serif', 'Noto Serif Devanagari', ` +
  `'Noto Serif Bengali', 'Kokila', serif`;

/** Tabular numerals for amounts, counts, IDs — columns stop jittering. */
export const TABULAR_NUMERALS = 'tabular-nums' as const;

/** Motion durations — calm, unhurried. Bigger numbers = slower, never bouncy. */
export const MOTION = {
  fast: 180,
  base: 300,
  slow: 420,
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** Tailwind class shortcuts for the most-used token applications. */
export const TOKEN_CLASSES = {
  /** Primary CTA button surface. */
  ctaPrimary:
    'bg-amber-500 hover:bg-amber-400 text-temple-950 font-black shadow-lg shadow-amber-600/20',
  /** Sacred dark surface (headers, blessing moments). */
  sacredDark: 'bg-temple-950 text-amber-100',
  /** Standard card. */
  card: 'bg-white rounded-2xl border border-amber-100 shadow-sm',
  /** Dark card (org desks). */
  cardDark: 'bg-temple-900/90 border border-temple-800 rounded-2xl',
  /** Display serif headline. */
  display: 'font-display',
  /** Tabular numerals. */
  tnum: 'tnum',
} as const;
