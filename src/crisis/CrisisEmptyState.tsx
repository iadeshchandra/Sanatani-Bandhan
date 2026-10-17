/**
 * CrisisEmptyState.tsx — warm empty states for crisis surfaces.
 * ==============================================================
 * Calm reassurance, never fear-mongering: "No emergencies — your
 * sangha is safe 🙏". Optional gentle action (e.g. "Add contacts").
 */
import React from 'react';
import { T } from '../solo/ui';
import { CRISIS_CARD_CLASS, CRISIS_TOUCH_MIN } from './crisisTheme';

export const CrisisEmptyState: React.FC<{
  /** Override the headline; defaults to the calm "all safe" line. */
  headline?: React.ReactNode;
  subtext?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: () => void;
  className?: string;
}> = ({ headline, subtext, actionLabel, onAction, className = '' }) => (
  <div className={`${CRISIS_CARD_CLASS} p-8 text-center ${className}`}>
    <div className="text-5xl mb-4" aria-hidden>
      🙏
    </div>
    <h3 className="text-base font-extrabold text-[#451A03]">
      {headline ?? (
        <T
          en="No emergencies — your sangha is safe 🙏"
          bn="কোনো জরুরি অবস্থা নেই — আপনার সংঘ নিরাপদ 🙏"
          hi="कोई आपात स्थिति नहीं — आपका संघ सुरक्षित है 🙏"
        />
      )}
    </h3>
    {subtext && <p className="mt-2 text-sm text-[#92400E] leading-relaxed">{subtext}</p>}
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className={`mt-5 inline-flex items-center justify-center rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold px-6 py-3 text-sm shadow-[0_4px_16px_rgba(180,83,9,0.35)] transition-colors ${CRISIS_TOUCH_MIN}`}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default CrisisEmptyState;
