/**
 * crisisTheme.ts — Crisis Command warm design system
 * ===================================================
 * The panic button must feel SAFE, not scary: warm amber glow on soft
 * cream surfaces, maroon used sparingly for "needs attention" accents.
 * Red-alarming palettes are deliberately avoided everywhere here.
 *
 * Consumed by all src/crisis/* components (Phase 4 polish pass).
 */

export const CRISIS_COLORS = {
  /** Deep amber — primary brand for safety, headings, active pill. */
  amberDeep: '#B45309',
  /** Warm amber glow — the panic button's signature. */
  amberGlow: '#D97706',
  /** Soft amber wash for tinted surfaces. */
  amberSoft: '#FDE68A',
  /** Maroon — sparse accent for attention / coordinator role. */
  maroon: '#7F1D1D',
  maroonSoft: '#FECACA',
  /** Soft cream page surfaces. */
  cream: '#FFFBEB',
  creamDeep: '#FEF3C7',
  /** Warm ink for body text on cream. */
  ink: '#451A03',
  inkSoft: '#92400E',
} as const;

export type CrisisStatus = 'active' | 'acknowledged' | 'resolved';

export interface CrisisStatusMeta {
  label: { en: string; bn: string; hi: string };
  /** Tailwind classes for the pill (warm, non-alarming). */
  pillClass: string;
  dotClass: string;
}

/**
 * Consistent status pills across PanicButton, SOSTimeline, CrisisDashboard,
 * TriageView and histories. Active = warm amber (present, held), never red.
 */
export const CRISIS_STATUS_META: Record<CrisisStatus, CrisisStatusMeta> = {
  active: {
    label: { en: 'Help on the way', bn: 'সাহায্য পথে', hi: 'सहायता मार्ग में' },
    pillClass:
      'bg-amber-100 text-amber-900 border-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.35)]',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  acknowledged: {
    label: { en: 'Someone is coming', bn: 'কেউ আসছেন', hi: 'कोई आ रहा है' },
    pillClass: 'bg-orange-100 text-[#7F1D1D] border-orange-300',
    dotClass: 'bg-[#B45309]',
  },
  resolved: {
    label: { en: 'All safe 🙏', bn: 'সবাই নিরাপদ 🙏', hi: 'सब सुरक्षित 🙏' },
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
};

/** Map a Firestore crisis_events status string onto the warm pill system. */
export function normalizeCrisisStatus(status: string | undefined | null): CrisisStatus {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed' || s === 'cancelled') return 'resolved';
  if (s === 'acknowledged' || s === 'responding' || s === 'triaged') return 'acknowledged';
  return 'active';
}

/** Warm card shell shared by crisis panels. */
export const CRISIS_CARD_CLASS =
  'rounded-3xl bg-[#FFFBEB] border border-amber-200/70 shadow-[0_8px_30px_rgba(180,83,9,0.08)]';

/** Minimum touch target (44px) — every interactive crisis element must use this. */
export const CRISIS_TOUCH_MIN = 'min-h-[44px] min-w-[44px]';
