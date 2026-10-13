import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * PreviewDataBadge — honesty label for desks that run on in-memory mock
 * data (P1). Unlike LocalOnlyBadge ("Saved on this device"), these desks
 * don't persist at all: every reload resets to the built-in sample data.
 * The badge must sit in the desk header where users can't miss it.
 */
export const PreviewDataBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 rounded-full px-3 py-1 ${className}`}
    title="This desk runs on sample data for preview. Changes are not saved."
  >
    <FlaskConical className="w-3.5 h-3.5" />
    <span>Preview — data not saved</span>
  </span>
);

export default PreviewDataBadge;
