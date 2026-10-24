import React, { useEffect, useId, useRef } from 'react';
import { X, Sparkles, CheckCircle2, Clock3, Users } from 'lucide-react';

interface DemoUpsellModalProps {
  /** Quota module key (e.g. 'treasury'), or null to hide. */
  module: string | null;
  /** Plural entity label, e.g. "donations". */
  entityLabel: string;
  /** How many records the user created in this module. */
  createdCount: number;
  onClose: () => void;
  onRegister: () => void;
}

/** Module key → premium bullets that make registration irresistible. */
const PREMIUM_BULLETS: Record<string, string[]> = {
  treasury: ['Unlimited donations & expenses', 'Automatic 80G tax receipts', 'Tally Prime sync for your CA'],
  devotees: ['Unlimited devotee records', 'Family trees & household census', 'Universal Sanatani ID across temples'],
  campaigns: ['Unlimited fundraising campaigns', 'Donor analytics & gratitude walls', 'WhatsApp share + UPI collection links'],
  pooja: ['Unlimited pooja bookings', 'QR gate passes for devotees', 'Purohit scheduling & dakshina tracking'],
};

const MODULE_DISPLAY: Record<string, string> = {
  devotees: 'Devotees',
  families: 'Families',
  guests: 'Guests',
  treasury: 'Treasury',
  assets: 'Assets',
  inventory: 'Inventory',
  pooja: 'Pooja Bookings',
  goshala: 'Goshala',
  bhoomi: 'Bhoomi',
  vahan: 'Vahan Fleet',
  'seva-subscriptions': 'Recurring Seva',
  annadanam: 'Annadanam',
  resolutions: 'Resolutions',
  residentPujas: 'Resident Pujas',
  pitruRecords: 'Pitru Records',
  gurukulStudents: 'Gurukul',
  shifts: 'Sevadar Shifts',
};

const DEFAULT_BULLETS = [
  'All 49 temple desks, unlimited',
  'Your data is encrypted & backed up',
  'Priority onboarding for your trust',
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Warm, celebratory upsell shown the moment a demo user hits the free-create
 * limit. Light theme (matches the landing page) — deliberately NOT the dark
 * enterprise chrome. Dismissing keeps the app fully usable in view-only mode.
 */
export const DemoUpsellModal: React.FC<DemoUpsellModalProps> = ({
  module,
  entityLabel,
  createdCount,
  onClose,
  onRegister,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!module) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first || panel).focus();
    }, 30);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus?.();
    };
  }, [module, onClose]);

  if (!module) return null;

  const displayName = MODULE_DISPLAY[module] || module;
  const bullets = PREMIUM_BULLETS[module] || DEFAULT_BULLETS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md bg-[#FFFDF8] rounded-[1.75rem] shadow-2xl shadow-orange-900/20 border border-orange-100 max-h-[92vh] flex flex-col overflow-hidden outline-none"
      >
        {/* Festive header */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 px-6 sm:px-8 pt-8 pb-7 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl mb-4 shadow-inner">
            🎉
          </div>
          <h2 id={titleId} className="text-2xl sm:text-[1.7rem] font-black text-white tracking-tight leading-tight">
            You've added {createdCount} {entityLabel} — you're a natural!
          </h2>
          <p className="mt-2 text-orange-100 text-sm font-medium">
            {displayName} is clearly your thing. Imagine running it without limits.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto custom-scrollbar grow">
          <ul className="space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-stone-700 leading-snug">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-stone-700 leading-relaxed">
              <span className="font-extrabold text-stone-900">Everything you created comes with you</span>{' '}
              — {createdCount} {entityLabel}, migrated free, yours forever.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-2 text-xs text-stone-500 font-medium">
              <Clock3 className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              Demo workspaces auto-delete after 24 hours — don't lose your work.
            </p>
            <p className="flex items-center gap-2 text-xs text-stone-500 font-medium">
              <Users className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              Join dharmic institutions across Bharat already running on Sanatani Bandhan.
            </p>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-7 pt-1 shrink-0 space-y-3">
          <button
            type="button"
            onClick={onRegister}
            className="w-full min-h-[52px] px-8 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-base tracking-wide shadow-xl shadow-orange-500/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            CREATE FREE ACCOUNT
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            Keep exploring the demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoUpsellModal;
