/**
 * SuspendedNotice — the "account paused" screen (Step 8: Spark-native soft-ban).
 * ============================================================================
 * Dignity even in suspension: warm language, the reason, and a path to appeal.
 * Shown on the login screen when the boot check finds `users/{uid}.suspended`.
 */
import React from 'react';
import { SUPPORT_EMAIL, WHATSAPP_URL, hasWhatsApp } from '../../config/contact';
import type { SuspensionInfo } from '../../lib/softBan';

export const SuspendedNotice: React.FC<{ info: SuspensionInfo; onDismiss?: () => void }> = ({ info, onDismiss }) => {
  const appealText = encodeURIComponent('Namaste — I would like to appeal a paused account on Sanatani Bandhan.');
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-amber-200/60 bg-amber-50 p-8 text-center shadow-xl">
        <p className="text-4xl mb-3">🪔</p>
        <h1 className="text-xl font-black text-amber-900">Your account has been paused</h1>
        <p className="text-sm text-amber-800/80 mt-3 leading-relaxed">
          With care for our community, access to your account is temporarily paused.
          {info.reason ? (
            <>
              <br />
              <span className="font-semibold">Reason given:</span> {info.reason}
            </>
          ) : null}
        </p>
        <p className="text-sm text-amber-800/80 mt-3 leading-relaxed">
          If you believe this is a mistake, please reach out — every appeal is read by a human.
        </p>
        <div className="flex flex-col gap-2 mt-6">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account pause appeal')}`}
            className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-amber-600 text-white text-sm font-black px-5 py-3 hover:bg-amber-700"
          >
            ✉️ Appeal via email
          </a>
          {hasWhatsApp && (
            <a
              href={`${WHATSAPP_URL}?text=${appealText}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-amber-300 text-amber-900 text-sm font-black px-5 py-3 hover:bg-amber-100"
            >
              💬 Appeal on WhatsApp
            </a>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] rounded-xl text-amber-700 text-sm font-bold px-5 py-3 hover:bg-amber-100"
            >
              Back to sign in
            </button>
          )}
        </div>
        <p className="text-[11px] text-amber-700/60 mt-5">
          Sanatani Bandhan keeps this community safe and kind for every devotee. 🙏
        </p>
      </div>
    </div>
  );
};
