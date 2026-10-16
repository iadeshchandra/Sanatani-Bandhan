/**
 * Chat.tsx — the chat entry point: a full-screen overlay (not a modal).
 * =============================================================
 * Opens from the "Messages" card on Solo Home. List view first;
 * tapping a thread slides into the conversation. Full-screen so
 * conversations breathe on mobile; capped width on desktop.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { T } from '../solo/ui';
import { ChatList } from './ChatList';
import { ChatThread } from './ChatThread';
import { useChatThreads } from './useChat';
import type { ChatParticipant } from './types';

export const Chat: React.FC<{
  uid: string;
  selfInfo: ChatParticipant;
  onClose: () => void;
  /** Deep-link straight into a thread (optional). */
  initialChatId?: string;
}> = ({ uid, selfInfo, onClose, initialChatId }) => {
  const { threads, loading } = useChatThreads(uid);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId ?? null);
  const activeThread = activeChatId ? threads.find((t) => t.id === activeChatId) ?? null : null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label="Messages"
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-xl h-[100dvh] sm:h-[88vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-amber-800 via-orange-700 to-amber-800 text-amber-50 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <div className="flex-1">
            <h2 className="text-base font-extrabold">
              <T en="Messages" bn="বার্তা" hi="संदेश" />
            </h2>
            <p className="text-[11px] text-amber-200/80">
              <T
                en="Calm conversations between verified Sanatanis"
                bn="যাচাইকৃত সনাতনীদের মধ্যে শান্ত কথোপকথন"
                hi="सत्यापित सनातनियों के बीच शांत बातचीत"
              />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {activeChatId ? (
            <ChatThread
              uid={uid}
              chatId={activeChatId}
              thread={activeThread}
              onBack={() => setActiveChatId(null)}
            />
          ) : (
            <ChatList
              uid={uid}
              threads={threads}
              loading={loading}
              selfInfo={selfInfo}
              onOpen={(id) => setActiveChatId(id)}
            />
          )}
        </div>

        {/* Trust footer */}
        <div className="shrink-0 bg-white border-t border-stone-200 px-4 py-1.5 text-center text-[10px] font-semibold text-stone-400">
          <T
            en="No ads · No algorithmic noise · No fake accounts"
            bn="কোনো বিজ্ঞাপন নেই · কোনো অ্যালগরিদমিক কোলাহল নেই · কোনো ভুয়া অ্যাকাউন্ট নেই"
            hi="कोई विज्ञापन नहीं · कोई एल्गोरिदमिक शोर नहीं · कोई नकली खाता नहीं"
          />
        </div>
      </div>
    </div>
  );
};
