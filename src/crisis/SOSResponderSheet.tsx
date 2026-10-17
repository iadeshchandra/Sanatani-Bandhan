/**
 * crisis/SOSResponderSheet.tsx — bottom sheet hosting the responder map.
 * =====================================================================
 * Opened from the SOS alert banner ("View map") and the coordinator
 * dashboard. Hosts SOSResponderMap with the victim's event data.
 * Closes (and unmounts the map) on dismiss.
 */
import React from 'react';
import { X } from 'lucide-react';
import { SOSResponderMap } from './SOSResponderMap';
import { crisisCopy, useCrisisT } from './crisisStrings';
import type { CrisisEvent } from './types';
import './leaflet.css';

interface Props {
  event: CrisisEvent;
  onClose: () => void;
  onAcknowledge?: () => void;
  acknowledged?: boolean;
}

export const SOSResponderSheet: React.FC<Props> = ({ event, onClose, onAcknowledge, acknowledged }) => {
  const t = useCrisisT();
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(crisisCopy.mapViewTitle)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-extrabold text-stone-900">{t(crisisCopy.mapViewTitle)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(crisisCopy.close)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-200/70 text-stone-700 hover:bg-stone-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SOSResponderMap event={event} onAcknowledge={onAcknowledge} acknowledged={acknowledged} />
        <p className="text-center text-[12px] text-stone-500 mt-4 max-w-sm mx-auto">
          {t(crisisCopy.mapFalseAlarmNote)}
        </p>
      </div>
    </div>
  );
};
