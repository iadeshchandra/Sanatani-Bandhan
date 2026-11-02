import React from 'react';

export type ChipTone =
  | 'neutral'
  | 'saffron'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'peacock'
  | 'stone';

interface ChipStyle {
  light: string;
  dark: string;
  selected: string;
}

/* One chip, variants by TONE never by shape (Design Elevation E2 —
   DE-05 family, taste rule 7). Light grounds use the pastel family;
   dark grounds use the translucent family (the old Badge palette).
   A selected filter chip fills with the --cta token on BOTH grounds,
   so "what is on" reads identically app-wide. */
const TONE_STYLES: Record<ChipTone, ChipStyle> = {
  neutral: {
    light: 'bg-white text-stone-600 border-stone-200',
    dark: 'bg-temple-800/70 text-temple-200 border-temple-700',
    selected: 'bg-cta text-white border-transparent shadow-md shadow-saffron-700/20',
  },
  saffron: {
    light: 'bg-saffron-50 text-saffron-800 border-saffron-200',
    dark: 'bg-saffron-500/15 text-saffron-300 border-saffron-500/30',
    selected: 'bg-cta text-white border-transparent shadow-md shadow-saffron-700/20',
  },
  amber: {
    light: 'bg-amber-100 text-amber-800 border-amber-200',
    dark: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    selected: 'bg-cta text-white border-transparent shadow-md shadow-saffron-700/20',
  },
  emerald: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    selected: 'bg-emerald-600 text-white border-transparent shadow-md',
  },
  rose: {
    light: 'bg-rose-50 text-rose-700 border-rose-200',
    dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    selected: 'bg-rose-600 text-white border-transparent shadow-md',
  },
  peacock: {
    light: 'bg-peacock-100 text-peacock-700 border-peacock-300',
    dark: 'bg-peacock-500/15 text-peacock-300 border-peacock-500/30',
    selected: 'bg-peacock-700 text-white border-transparent shadow-md',
  },
  stone: {
    light: 'bg-stone-100 text-stone-600 border-stone-200',
    dark: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
    selected: 'bg-cta text-white border-transparent shadow-md shadow-saffron-700/20',
  },
};

interface ChipProps {
  tone?: ChipTone;
  /** Ground the chip sits on (default light). */
  surface?: 'light' | 'dark';
  /** Show a small leading status dot in the tone's strong colour. */
  dot?: boolean;
  /** When onClick is provided the chip renders as a filter button.
   *  Dense class: 36px — filter rows inside desks only (DE-16). */
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

const DOT_CLASS: Record<ChipTone, string> = {
  neutral: 'bg-stone-400',
  saffron: 'bg-saffron-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  peacock: 'bg-peacock-500',
  stone: 'bg-stone-400',
};

/**
 * Chip — the one small label (status / kind / filter). Status chips
 * are spans; filter chips are buttons with `selected`. Never invent a
 * local pill — if a label needs a new meaning, add a tone here.
 */
export const Chip: React.FC<ChipProps> = ({
  tone = 'neutral',
  surface = 'light',
  dot = false,
  selected = false,
  onClick,
  className = '',
  title,
  children,
}) => {
  const styles = TONE_STYLES[tone];
  const classes = [
    'inline-flex items-center gap-1.5 rounded-full border font-black whitespace-nowrap',
    onClick
      ? 'min-h-[36px] px-3 text-xs transition-all cursor-pointer'
      : 'px-2 py-0.5 text-[10px]',
    selected ? styles.selected : surface === 'dark' ? styles.dark : styles.light,
    className,
  ].join(' ');
  const inner = (
    <>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? 'bg-white' : DOT_CLASS[tone]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={!!selected}
        onClick={onClick}
        title={title}
        className={classes}
      >
        {inner}
      </button>
    );
  }
  return (
    <span title={title} className={classes}>
      {inner}
    </span>
  );
};
