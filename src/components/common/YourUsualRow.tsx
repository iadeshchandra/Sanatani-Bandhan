import React from 'react';
import type { ComponentType } from 'react';

/**
 * YourUsualRow — VIBE B2 (presentational).
 * =====================================================================
 * A calm sanctum row under the home header: the user's own most-used
 * desks/actions as tap-to-go cards, hairline-gold ruled, lamplight on
 * the heading mark. The containers (OrgUsualRow / SoloUsualRow) decide
 * WHAT appears — from real device-local usage only — and which heading
 * is honest: "Your usual" once real opens exist, "Begin here" while
 * the row still shows the canonical starter set. This component only
 * renders; it knows nothing about where the items came from.
 *
 * Engagement law: no counts, no streaks, no scores are ever shown —
 * usage orders the row silently and stays invisible.
 */

export interface UsualItem {
  id: string;
  label: string;
  /** The catalogue icon component (lucide icons satisfy this shape). */
  Icon: ComponentType<{ className?: string }>;
}

export const YourUsualRow: React.FC<{
  heading: string;
  items: UsualItem[];
  onOpen: (id: string) => void;
}> = ({ heading, items, onOpen }) => {
  if (items.length === 0) return null;
  return (
    <section aria-label={heading} className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 34 20" className="w-4 h-4 text-brass-500 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M17 3c2.4 2.6 3.6 5.4 3.6 8.2 0 2-.8 3.9-3.6 5.8-2.8-1.9-3.6-3.8-3.6-5.8C13.4 8.4 14.6 5.6 17 3Z" />
          <path d="M6.5 6.5c3 .8 5.3 2.4 6.9 4.7 1.1 1.7 1.5 3.7.9 6.3-2.9-.5-4.7-1.6-5.9-3.2C6.9 12.2 6.3 9.5 6.5 6.5Z" />
          <path d="M27.5 6.5c-.2 3-.8 5.7-2.3 7.8-1.2 1.6-3 2.7-5.9 3.2-.6-2.6-.2-4.6.9-6.3 1.6-2.3 3.9-3.9 6.9-4.7Z" />
        </svg>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brass-600">
          {heading}
        </h2>
        <div className="hairline-gold flex-1" aria-hidden="true" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            className="flex items-center gap-2.5 shrink-0 min-h-[44px] rounded-xl bg-white/80 border border-brass-200 px-3.5 py-2 text-left shadow-sm hover:border-brass-400 hover:shadow transition-all duration-300 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-brass-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-brass-700" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold text-temple-800 whitespace-nowrap">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default YourUsualRow;
