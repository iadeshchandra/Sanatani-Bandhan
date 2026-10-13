import React from 'react';
import { Smartphone } from 'lucide-react';

/**
 * M-2 honesty indicator: marks create-forms whose records persist on this
 * device only (IndexedDB/localStorage) with no cloud write path. Financial
 * mutators (treasury, hundi, campaigns, rent) have real Firestore writes and
 * must NOT show this badge.
 */
export const LocalOnlyBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5 ${className}`}
    title="This record is saved on this device only and does not sync to the cloud."
  >
    <Smartphone className="w-3 h-3" />
    <span>Saved on this device</span>
  </span>
);

export default LocalOnlyBadge;
