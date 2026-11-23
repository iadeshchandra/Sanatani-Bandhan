/**
 * GrowSheet — TWO-MODE M1: the honest invitation behind the mode
 * switch's empty slot.
 * =====================================================================
 * The owner's two-mode law: Organisation mode unlocks only with an
 * enrolment. A member with none must never meet a dead lock or a
 * bare error toast — the header slot offers "Grow with Sanatani
 * Bandhan" instead, and this sheet carries the same four doors the
 * Solo shell's JoinUpgrade offers, wired to the destinations that
 * already exist for org-session members:
 *
 *   · Join an organisation  → /orgs (the public directory + the
 *     join-request flow — the portal RT-02 Grow card's join door).
 *   · Create an organisation → /register-org (reuses the live
 *     signed-in session — the portal's create door).
 *   · Become a Purohit      → the existing BecomePurohitModal
 *     (org-context safe: it mints the identity and enters the
 *     purohit session itself).
 *   · Become a Jyotishi     → the existing BecomeJyotishModal.
 *
 * JoinUpgrade itself is SoloProvider-bound (useSolo throws outside
 * the solo shell), so the sheet reuses its doors and destinations
 * rather than mounting the component — same flows, no second
 * implementation of any of them.
 *
 * Rendered through a body portal in the OrgConsoleLockSheet idiom
 * (the fixed-overlay ancestor law: sheets opened from inside
 * backdrop-blur headers must not be trapped by them). The Become*
 * modals sit at z-[90], below this sheet's z-[210], so choosing a
 * professional door closes the sheet first and lets the modal stand
 * alone, exactly as it does everywhere else it is used.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sprout,
  Building2,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { BecomePurohitModal } from '../purohit/BecomePurohitModal';
import { BecomeJyotishModal } from '../../jyotish/BecomeJyotishModal';

interface GrowSheetProps {
  open: boolean;
  onClose: () => void;
}

export const GrowSheet: React.FC<GrowSheetProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const [become, setBecome] = useState<'purohit' | 'jyotish' | null>(null);

  // The professional doors: the sheet steps aside (its z-[210] would
  // cover the z-[90] modals) and the modal owns the flow from there.
  if (become === 'purohit') {
    return (
      <BecomePurohitModal
        isOpen
        onClose={() => {
          setBecome(null);
          onClose();
        }}
      />
    );
  }
  if (become === 'jyotish') {
    return (
      <BecomeJyotishModal
        isOpen
        onClose={() => {
          setBecome(null);
          onClose();
        }}
      />
    );
  }
  if (!open) return null;

  const doors: Array<{
    id: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    onTap: () => void;
  }> = [
    {
      id: 'join',
      icon: <ArrowRight className="w-5 h-5 text-amber-700" />,
      title: t('surfaces.twoMode.growJoin'),
      desc: t('surfaces.twoMode.growJoinDesc'),
      onTap: () => {
        window.location.href = '/orgs';
      },
    },
    {
      id: 'create',
      icon: <Building2 className="w-5 h-5 text-amber-700" />,
      title: t('surfaces.twoMode.growCreate'),
      desc: t('surfaces.twoMode.growCreateDesc'),
      onTap: () => {
        window.location.href = '/register-org';
      },
    },
    {
      id: 'purohit',
      icon: <BookOpen className="w-5 h-5 text-amber-700" />,
      title: t('surfaces.twoMode.growPurohit'),
      desc: t('surfaces.twoMode.growPurohitDesc'),
      onTap: () => setBecome('purohit'),
    },
    {
      id: 'jyotish',
      icon: <Sparkles className="w-5 h-5 text-amber-700" />,
      title: t('surfaces.twoMode.growJyotishi'),
      desc: t('surfaces.twoMode.growJyotishiDesc'),
      onTap: () => setBecome('jyotish'),
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[210]"
      role="dialog"
      aria-modal="true"
      aria-label={t('surfaces.twoMode.grow')}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl border-t border-brass-200 text-temple-900">
        <div className="sticky top-0 bg-sanctum-ivory/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-3 border-b border-temple-200">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-temple-300/80" />
          <div className="flex items-center gap-2.5 mt-2">
            <span className="w-9 h-9 rounded-full bg-amber-100 border border-brass-200 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-amber-700" />
            </span>
            <h3 className="flex-1 text-sm font-black text-temple-950 leading-snug">
              {t('surfaces.twoMode.grow')}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('surfaces.twoMode.close')}
              className="w-11 h-11 rounded-full bg-temple-50 text-temple-600 hover:text-temple-950 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs leading-relaxed text-temple-600">
            {t('surfaces.twoMode.growIntro')}
          </p>
          {doors.map((door) => (
            <button
              key={door.id}
              type="button"
              onClick={door.onTap}
              className="w-full flex items-center gap-3 rounded-2xl border border-temple-200 bg-white hover:border-brass-200 hover:bg-temple-50 transition-colors px-4 py-3 text-left min-h-[64px] cursor-pointer"
            >
              <span className="w-11 h-11 rounded-xl bg-amber-50 border border-brass-200 flex items-center justify-center shrink-0">
                {door.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-black text-temple-950">
                  {door.title}
                </span>
                <span className="block text-xs text-temple-500 leading-snug mt-0.5">
                  {door.desc}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
