/**
 * sangam/LiveAartiCard.tsx — Pinned live-aarti feed card (Phase 3).
 * ============================================================================
 * When a trustee-pinned org is LIVE, this card pins to the top of the
 * Sangam feed. Tap → opens the darshan viewer. Unpins automatically when
 * the stream ends (parent stops rendering when shouldShowPinnedAarti
 * returns false).
 */
import React from 'react';
import { T } from '../solo/ui';
import { liveAartiCardText } from './liveAarti';

export const LiveAartiCard: React.FC<{
  orgName: string;
  videoId?: string | null;
  title?: string;
  onWatch: (videoId: string) => void;
}> = ({ orgName, videoId, title, onWatch }) => {
  if (!videoId) return null;
  return (
    <button
      type="button"
      onClick={() => onWatch(videoId)}
      className="w-full text-left rounded-2xl overflow-hidden border-2 border-red-500 bg-gradient-to-br from-red-950 to-stone-900 shadow-lg min-h-[88px]"
      aria-label={`Watch live aarti from ${orgName}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-red-100 font-extrabold text-sm leading-snug">
            <T
              en={`🛕 ${orgName} — LIVE now`}
              bn={`🛕 ${orgName} — এখন LIVE`}
              hi={`🛕 ${orgName} — अभी LIVE`}
            />
          </p>
          {title && <p className="text-red-200/80 text-xs truncate mt-0.5">{title}</p>}
          <p className="text-red-200/70 text-xs mt-1">
            <T en="Tap to join the aarti 🙏" bn="আরতিতে যোগ দিতে ট্যাপ করুন 🙏" hi="आरती में शामिल होने के लिए टैप करें 🙏" />
          </p>
        </div>
        <span className="text-2xl shrink-0" aria-hidden>
          🪔
        </span>
      </div>
      <span className="sr-only">{liveAartiCardText(orgName, title)}</span>
    </button>
  );
};
