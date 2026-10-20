/**
 * SuchanaCenter.tsx — the 🔔 header bell's home for the inbox.
 * =====================================================================
 * Proposal A (unified notifications): one glance answers "did anything
 * happen?" — "🪔 From your sangha" first, "🛡️ Notes from the team"
 * second, then a single calm footer link to the guidance tab.
 *
 * The sections are the shared SanghaInbox definitions (relocated, not
 * rebuilt). Guidance stays on the Suchana tab — the bell never opens the
 * guidance modal (that conflation was the original bug).
 *
 * Vocabulary law: title/aria stays "🪔 Suchana — from your sangha".
 * Never "Notifications" user-visibly.
 */
import React from 'react';
import { X } from 'lucide-react';
import { T } from './ui';
import { useNotifications } from '../context/NotificationContext';
import { useModerationInbox } from '../notifications/useModerationInbox';
import { SanghaInboxSection, TeamNotesSection } from './SanghaInbox';

interface SuchanaCenterProps {
  isOpen: boolean;
  onClose: () => void;
  /** Footer link target — the guidance tab. */
  onGuidance: () => void;
}

export const SuchanaCenter: React.FC<SuchanaCenterProps> = ({ isOpen, onClose, onGuidance }) => {
  const { notifications } = useNotifications();
  const { notes } = useModerationInbox();
  const isEmpty = notifications.length === 0 && notes.length === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="🪔 Suchana — from your sangha"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
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
                    en="From your sangha — blessings, replies and notes"
                    bn="আপনার সঙ্গ থেকে — আশীর্বাদ, উত্তর ও বার্তা"
                    hi="आपके संघ से — आशीर्वाद, उत्तर और संदेश"
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
        {/* Inbox sections — shared definitions, relocated from the tab */}
        <div className="flex-1 overflow-y-auto p-4">
          <SanghaInboxSection limit={30} onAfterNavigate={onClose} />
          <TeamNotesSection limit={10} />
          {isEmpty && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3" aria-hidden>
                🪔
              </div>
              <p className="text-sm font-semibold text-stone-600">
                <T
                  en="All calm — nothing new from your sangha right now."
                  bn="সব শান্ত — এই মুহূর্তে আপনার সঙ্গ থেকে নতুন কিছু নেই।"
                  hi="सब शांत — इस समय आपके संघ से कुछ नया नहीं।"
                />
              </p>
            </div>
          )}
          {/* Footer — one calm link to the guidance tab */}
          <button
            type="button"
            onClick={onGuidance}
            className="w-full mt-6 min-h-[44px] rounded-2xl border border-stone-200 bg-white hover:border-amber-400 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
          >
            <T
              en="See today's guidance →"
              bn="আজকের নির্দেশনা দেখুন →"
              hi="आज का मार्गदर्शन देखें →"
            />
          </button>
        </div>
      </div>
    </div>
  );
};
