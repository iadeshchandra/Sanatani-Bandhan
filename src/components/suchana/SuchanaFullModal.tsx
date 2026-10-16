/**
 * SuchanaFullModal.tsx — The full Suchana view.
 * =================================================
 * All suchana (up to 50) with filter chips: All / Panjika / Modules /
 * Needs care. Opened from Solo home "view all" and the 🪔 header button.
 */
import React from 'react';
import { X } from 'lucide-react';
import { T } from '../../solo/ui';
import { SuchanaFeedLive } from './SuchanaFeed';

export const SuchanaFullModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  role?: string;
  onAction?: (route: string) => void;
}> = ({ isOpen, onClose, role = 'solo', onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-gradient-to-b from-amber-50 to-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 p-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                🪔
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  <T en="Suchana" bn="সূচনা" hi="सूचना" />
                </h2>
                <p className="text-xs text-amber-200/80">
                  <T
                    en="Gentle guidance for your path"
                    bn="আপনার পথের জন্য কোমল নির্দেশনা"
                    hi="आपके मार्ग हेतु कोमल मार्गदर्शन"
                  />
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          <SuchanaFeedLive role={role} mode="full" onAction={onAction} daysAhead={30} />
        </div>
      </div>
    </div>
  );
};
