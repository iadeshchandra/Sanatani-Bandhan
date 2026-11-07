/**
 * OrgConsoleLockSheet — the locked Org door, explained (RT-FIX, RT-01).
 * =====================================================================
 * The route/org-door audit found the DevoteeAccountPortal's locked
 * Org toggle was a non-interactive <div>: no tap feedback on touch,
 * its only explanation an HTML `title` tooltip (which never appears
 * on a phone), and no next step offered. That violates the
 * closed-door law: a closed door must explain itself and offer the
 * honest next step, never sit mute.
 *
 * This sheet is that explanation, in the portal's own sanctum
 * idiom (ivory, brass, amber — light since Design Elevation E5),
 * rendered through a body portal — the sheet opens from
 * inside the portal's sticky backdrop-blur header, and a header's
 * backdrop-filter creates a containing block that traps
 * position:fixed descendants (the fixed-overlay ancestor law; see
 * LanguagePickerSheet). Copy resolves through the dictionary
 * (surfaces.devoteePortal.orgLock* keys), in sevak voice.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Home, Sprout, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface OrgConsoleLockSheetProps {
  open: boolean;
  /** The active organisation's name, woven into the explanation. */
  orgName: string;
  onClose: () => void;
  /** Door 1 — leave to the personal Solo space (OrgSpaceShell's ← Home). */
  onGoHome: () => void;
  /** Door 2 — create an organisation of one's own (/register-org). */
  onCreateOrg: () => void;
}

export const OrgConsoleLockSheet: React.FC<OrgConsoleLockSheetProps> = ({
  open,
  orgName,
  onClose,
  onGoHome,
  onCreateOrg,
}) => {
  const { t } = useLanguage();
  if (!open) return null;

  const org = orgName || 'Sanatani Bandhan';

  return createPortal(
    <div
      className="fixed inset-0 z-[210]"
      role="dialog"
      aria-modal="true"
      aria-label={t('surfaces.devoteePortal.orgLockSheetTitle').replace('{org}', org)}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl border-t border-brass-200 text-temple-900">
        <div className="sticky top-0 bg-sanctum-ivory/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-3 border-b border-temple-200">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-temple-300/80" />
          <div className="flex items-center gap-2.5 mt-2">
            <span className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-amber-100 border border-brass-200 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-black text-temple-950 leading-snug">
                {t('surfaces.devoteePortal.orgLockSheetTitle').replace('{org}', org)}
              </h2>
              <p className="text-[12px] text-temple-600">
                {t('surfaces.devoteePortal.orgLockSheetSub')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('surfaces.devoteePortal.orgLockClose')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-temple-50 hover:bg-temple-100 border border-temple-200 flex items-center justify-center text-temple-600 shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] leading-relaxed text-temple-700">
            {t('surfaces.devoteePortal.orgLockWhy').replace('{org}', org)}
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onGoHome}
              className="w-full min-h-[60px] rounded-2xl border border-brass-200 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
            >
              <Home className="w-5 h-5 text-amber-700 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-temple-950 leading-snug">
                  {t('surfaces.devoteePortal.orgLockDoorHomeTitle')}
                </span>
                <span className="block text-[12px] text-temple-600">
                  {t('surfaces.devoteePortal.orgLockDoorHomeDesc')}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onCreateOrg}
              className="w-full min-h-[60px] rounded-2xl border border-temple-200 bg-temple-50 hover:border-brass-200 px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer"
            >
              <Sprout className="w-5 h-5 text-amber-700 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-temple-900 leading-snug">
                  {t('surfaces.devoteePortal.orgLockDoorCreateTitle')}
                </span>
                <span className="block text-[12px] text-temple-600">
                  {t('surfaces.devoteePortal.orgLockDoorCreateDesc')}
                </span>
              </span>
            </button>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl bg-temple-50 border border-temple-200 px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
            <p className="text-[12px] leading-relaxed text-temple-600">
              {t('surfaces.devoteePortal.orgLockStaffNote').replace('{org}', org)}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
