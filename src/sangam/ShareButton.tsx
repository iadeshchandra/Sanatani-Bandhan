/**
 * sangam/ShareButton.tsx — Share with referral attribution (Phase 4).
 * ============================================================================
 * Every service card, gratitude post, and consultation answer gets this
 * button. Shared links carry ?ref={sharerSanataniId}; when a booking
 * follows, the sharer gets warm GENTLE recognition (no money, no points).
 */
import React, { useState } from 'react';
import { T } from '../solo/ui';
import { withReferrer } from './referrals';

export const ShareButton: React.FC<{
  path: string;
  sharerSanId: string;
  label?: React.ReactNode;
  onShared?: (url: string) => void;
}> = ({ path, sharerSanId, label, onShared }) => {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}${withReferrer(path, sharerSanId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sanatani Bandhan', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      onShared?.(url);
    } catch {
      /* user dismissed — quiet */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 min-h-[44px]"
      aria-label="Share"
    >
      <span aria-hidden>↗</span>
      {copied ? (
        <T en="Copied!" bn="কপি হয়েছে!" hi="कॉपी हो गया!" />
      ) : (
        label || <T en="Share" bn="শেয়ার" hi="शेयर" />
      )}
    </button>
  );
};
