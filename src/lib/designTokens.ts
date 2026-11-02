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
 * variables remain the runtime source of truth; these TS constants are
 * for places that need literal values (canvas, SVG, JS-computed styles)
 * and as documentation of the canonical scale. (The alternate
 * `data-theme="classic"` indigo palette was retired in Design
 * Elevation E1 — the sanctum theme is the only theme.)
 */

/** The ONE amber — saffron. Primary brand color, CTAs, sacred highlights. */
export const AMBER = {
  50: '#FFF9F0',
  100: '#FFF0D4',
  200: '#FFE0A3',
  300: '#FFCA6B',
  400: '#FFAD2E',
  /** Bright brand accent — icons, tints, flames. Not a text ground:
   * the primary-action fill is the deepened 700 step (see CTA). */
  500: '#FF8E00',
  600: '#EB7100',
  700: '#C25300',
  800: '#993F08',
  900: '#7A340C',
  950: '#421802',
} as const;

/** The ONE primary action (Design Elevation E1; mirrors `--cta` in
 * index.css). White text on the fill measures 4.63:1 — AA for normal
 * text. On saffron-500 white measured 2.30:1 (audit DE-03). */
export const CTA = {
  fill: '#C25300',
  hover: '#993F08',
  text: '#FFFFFF',
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

/** The ONE peacock-teal — calm informational depth (mirrors the
 * `--peacock-*` CSS variables). */
export const PEACOCK = {
  100: '#D9ECEA',
  300: '#5FA8A0',
  500: '#1F6E6B',
  700: '#144E4C',
  900: '#0C3433',
} as const;

/** Kumkum — sacred/urgent accent only, never a theme (mirrors
 * `--kumkum` / `--kumkum-deep`). */
export const KUMKUM = {
  DEFAULT: '#B3271E',
  deep: '#8C1D18',
} as const;

/**
 * Chart / data-viz colours (Design Elevation E1) — the ONLY home for
 * colour literals consumed by JS (recharts props, hand-rolled SVG,
 * map markers). Every value is a sanctum token value, named by its
 * token so a palette change moves charts with the app. Surfaces and
 * classes must use the CSS tokens / Tailwind classes instead.
 */
export const CHART = {
  /** temple-200 — grid lines on light grounds. */
  grid: '#D3CFCB',
  /** temple-500 — axis labels on light grounds. */
  axisTick: '#7D756F',
  /** stone-400 — axis labels where the warm stone tone is intended. */
  axisTickWarm: '#A8A29E',
  /** temple-300 — axis labels on the dark GodMode console. */
  axisTickDark: '#B4AEA9',
  /** temple-800 — grid lines on the dark GodMode console. */
  gridDark: '#46413E',
  /** peacock-500 — positive / resolved / income series. */
  positive: '#1F6E6B',
  /** kumkum — urgent / incidents / expense series. */
  urgent: '#B3271E',
  /** amber-700 value — warning series (no CSS var exists for it). */
  warn: '#B45309',
  /** saffron-500 — japa series (the living accent as data). */
  japa: '#FF8E00',
  /** sanctum-sandal — ring tracks and warm washes. */
  track: '#F7EBD3',
  /** temple-50 — chart hover cursor wash. */
  cursor: '#F6F5F4',
  /** Donut palette — gold, peacock, brass, kumkum, peacock-light. */
  donut: ['#F59E0B', '#1F6E6B', '#C9A24B', '#B3271E', '#5FA8A0'],
  /** temple-950 — chart tooltip ground. */
  tooltipBg: '#262321',
  /** stone-700 — chart tooltip border. */
  tooltipBorder: '#44403C',
  /** brass-100 — chart tooltip text. */
  tooltipText: '#F3E5C3',
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
  /** Primary CTA button surface — the --cta token (E1). */
  ctaPrimary:
    'bg-cta hover:bg-cta-hover text-white font-black shadow-lg shadow-saffron-700/20',
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
