/**
 * Seva Professional Program — Phase 1
 * Professional's own view switcher.
 * ============================================================================
 * Mount this on the professional's dashboard (PurohitWorkspaceShell and/or
 * JyotishWorkspaceShell) so they can preview exactly what devotees see:
 *
 *   import { ProfessionalViewSwitcher } from '../components/sevaPro/ProfessionalViewSwitcher';
 *   <ProfessionalViewSwitcher uid={uid} />
 *
 * Modes:
 * - "Unified" — the full combined profile (default).
 * - "As Purohit" — only the purohit specialization, as a devotee browsing
 *   purohit profiles sees it.
 * - "As Jyotishi" — only the jyotish specialization.
 *
 * A warm preview banner makes it unmistakable that this is THEIR public face,
 * not an editing screen. The Book CTA is hidden in preview (they can't book
 * themselves).
 */
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { UnifiedProfessionalProfile } from './UnifiedProfessionalProfile';
import type { SpecializationKind } from '../../lib/sevaPro/profile';

type ViewMode = 'unified' | SpecializationKind;

interface ProfessionalViewSwitcherProps {
  /** Firebase Auth uid of the signed-in professional. */
  uid: string;
}

export const ProfessionalViewSwitcher: React.FC<ProfessionalViewSwitcherProps> = ({
  uid,
}) => {
  const { safeTranslate } = useLanguage();
  const tx = (en: string, bn: string, hi: string) => safeTranslate('', en, bn, hi);
  const [mode, setMode] = useState<ViewMode>('unified');

  const modes: Array<{ key: ViewMode; label: string; hint: string }> = [
    {
      key: 'unified',
      label: tx('Unified', 'একীভূত', 'एकीकृत'),
      hint: tx(
        'Both specializations together — your complete public face.',
        'উভয় বিশেষত্ব একসাথে — আপনার সম্পূর্ণ পাবলিক রূপ।',
        'दोनों विशेषज्ञताएँ एक साथ — आपका पूर्ण सार्वजनिक रूप।'
      ),
    },
    {
      key: 'purohit',
      label: tx('As Purohit', 'পুরোহিত হিসেবে', 'पुरोहित के रूप में'),
      hint: tx(
        'Exactly what a devotee sees on your purohit profile.',
        'একজন ভক্ত আপনার পুরোহিত প্রোফাইলে ঠিক যা দেখেন।',
        'एक भक्त आपकी पुरोहित प्रोफ़ाइल पर ठीक वही देखता है।'
      ),
    },
    {
      key: 'jyotish',
      label: tx('As Jyotishi', 'জ্যোতিষী হিসেবে', 'ज्योतिषी के रूप में'),
      hint: tx(
        'Exactly what a devotee sees on your jyotish profile.',
        'একজন ভক্ত আপনার জ্যোতিষ প্রোফাইলে ঠিক যা দেখেন।',
        'एक भक्त आपकी ज्योतिष प्रोफ़ाइल पर ठीक वही देखता है।'
      ),
    },
  ];

  const active = modes.find((m) => m.key === mode)!;

  return (
    <div className="space-y-3">
      {/* Preview banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          🪞
        </span>
        <div>
          <div className="text-sm font-bold text-amber-950">
            {tx(
              'Previewing your public profile',
              'আপনার পাবলিক প্রোফাইলের প্রিভিউ',
              'आपकी सार्वजनिक प्रोफ़ाइल का पूर्वावलोकन'
            )}
          </div>
          <p className="text-xs text-amber-900/80 mt-0.5">{active.hint}</p>
        </div>
      </div>

      {/* Mode toggle — segmented control, ≥44px targets */}
      <div
        className="grid grid-cols-3 gap-1 bg-stone-100 rounded-xl p-1"
        role="tablist"
        aria-label={tx('Profile view', 'প্রোফাইল ভিউ', 'प्रोफ़ाइल दृश्य')}
      >
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            onClick={() => setMode(m.key)}
            className={`min-h-[48px] rounded-lg text-sm font-bold px-2 ${
              mode === m.key
                ? 'bg-white shadow text-amber-900'
                : 'text-stone-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <UnifiedProfessionalProfile
        uidOverride={uid}
        viewSpec={mode === 'unified' ? undefined : mode}
        hideBookCta
      />
    </div>
  );
};

export default ProfessionalViewSwitcher;
