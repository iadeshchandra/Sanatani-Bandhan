/**
 * darshan/GoLiveButton.tsx — purohit "Go Live" with sacred consent gates.
 * ============================================================================
 * NRI use case: remote family joins a ceremony via unlisted YouTube stream.
 *
 * Sacred boundaries (NON-NEGOTIABLE):
 *  1. Consent checkbox REQUIRED — "everyone in this booking consents."
 *     The button stays disabled until checked.
 *  2. Shraddha/funeral bookings trigger an EXTRA warning + explicit
 *     override checkbox. Private by default, always.
 *  3. We never start the YouTube stream ourselves — we open YouTube's
 *     "Go Live" flow (unlisted) and the purohit pastes the link back.
 *     This keeps us out of the OAuth/credential business ($0, no secrets).
 */
import React, { useState } from 'react';
import { isPrivateCeremony } from './types';
import { dt, type Lang } from './i18n';

interface Props {
  bookingId: string;
  bookingType?: string;
  lang?: Lang;
  /** Called with the pasted unlisted stream URL to share in chat. */
  onStreamLink: (url: string) => void;
}

export const GoLiveButton: React.FC<Props> = ({
  bookingId,
  bookingType,
  lang = 'en',
  onStreamLink,
}) => {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [shraddhaOverride, setShraddhaOverride] = useState(false);
  const [link, setLink] = useState('');

  const needsShraddhaGate = isPrivateCeremony(bookingType);
  const canStart = consent && (!needsShraddhaGate || shraddhaOverride);

  const share = () => {
    const url = link.trim();
    if (!url || !canStart) return;
    onStreamLink(url);
    setOpen(false);
    setLink('');
    setConsent(false);
    setShraddhaOverride(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl bg-red-700 hover:bg-red-800 text-white font-bold text-sm shadow-md"
        data-booking={bookingId}
      >
        {dt('darshan.goLive', lang)}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={dt('darshan.consentTitle', lang)}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-stone-900 mb-4">
              🙏 {dt('darshan.consentTitle', lang)}
            </h3>

            {/* Gate 1: consent checkbox (always required) */}
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer min-h-[56px]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-5 h-5 accent-amber-700"
              />
              <span className="text-sm font-semibold text-stone-800">
                {dt('darshan.consentCheck', lang)}
              </span>
            </label>

            {/* Gate 2: shraddha/funeral override (conditional) */}
            {needsShraddhaGate && (
              <div className="mt-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <p className="text-sm font-bold text-red-800 mb-3">
                  {dt('darshan.shraddhaWarning', lang)}
                </p>
                <label className="flex items-start gap-3 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    checked={shraddhaOverride}
                    onChange={(e) => setShraddhaOverride(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-red-700"
                  />
                  <span className="text-sm font-semibold text-red-900">
                    {dt('darshan.shraddhaConfirm', lang)}
                  </span>
                </label>
              </div>
            )}

            {/* Stream link */}
            <div className="mt-4">
              <p className="text-xs text-stone-500 mb-2">
                1. Open YouTube → Go Live → set to <strong>Unlisted</strong>
                <br />
                2. Paste the stream link below to share it in this chat:
              </p>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://youtu.be/…"
                inputMode="url"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 min-h-[48px] rounded-2xl border border-stone-300 text-stone-700 font-bold text-sm"
              >
                {dt('darshan.cancel', lang)}
              </button>
              <button
                type="button"
                onClick={share}
                disabled={!canStart || !link.trim()}
                className="flex-1 py-3 min-h-[48px] rounded-2xl bg-red-700 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {dt('darshan.startStream', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
