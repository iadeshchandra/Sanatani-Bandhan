/**
 * Chat.tsx — the chat entry point: a full-screen overlay (not a modal).
 * =============================================================
 * Opens from the "Messages" card on Solo Home. List view first;
 * tapping a thread slides into the conversation. Full-screen so
 * conversations breathe on mobile; capped width on desktop.
 */
import React, { useState, lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import { T } from '../solo/ui';
import { ChatList } from './ChatList';
import { ChatThread } from './ChatThread';
import { useChatThreads } from './useChat';
import { BackupSettings } from './backup/BackupSettings';
import { BackupBoot } from './backup/BackupBoot';
import type { ChatParticipant } from './types';
/* Group chats — the thread view is lazy-loaded; sheets are small dialogs. */
import { CreateGroupSheet } from './groups/CreateGroupSheet';
import { JoinGroupSheet } from './groups/JoinGroupSheet';
import { GroupInfoSheet } from './groups/GroupInfoSheet';
import { GroupList } from './groups/GroupList';
import { useGroup, useGroupList } from './groups/useGroups';

const GroupThread = lazy(() =>
  import('./groups/GroupThread').then((m) => ({ default: m.GroupThread })),
);

export const Chat: React.FC<{
  uid: string;
  selfInfo: ChatParticipant;
  onClose: () => void;
  /** Deep-link straight into a thread (optional). */
  initialChatId?: string;
  /** Seva Bazar Phase 2 — provider taps "Received ✓" on a receipt. */
  onReceiptConfirm?: (receipt: import('./types').ReceiptMeta) => void;
}> = ({ uid, selfInfo, onClose, initialChatId, onReceiptConfirm }) => {
  const { threads, loading } = useChatThreads(uid);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId ?? null);
  const [backupOpen, setBackupOpen] = useState(false);
  const activeThread = activeChatId ? threads.find((t) => t.id === activeChatId) ?? null : null;

  /* Group chats */
  const [tab, setTab] = useState<'chats' | 'groups'>('chats');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { groups, loading: groupsLoading } = useGroupList(uid);
  const { group: activeGroup } = useGroup(activeGroupId);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const openGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setTab('groups');
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label="Messages"
      // Chat is deliberately a warm-paper light surface everywhere —
      // never let the OS dark theme invert its inputs or scrollbars.
      style={{ colorScheme: 'light' }}
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
            onClick={() => setBackupOpen(true)}
            aria-label="Chat backup"
            title="Chat backup — your words are yours"
            className="h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center gap-1.5 px-3 transition-colors"
          >
            <span className="text-lg" aria-hidden>
              📦
            </span>
            <T en="Backup" bn="ব্যাকআপ" hi="बैकअप" className="text-sm" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backup lifecycle: nudge, restore offer, due banner */}
        <BackupBoot uid={uid} />

        {/* Chats / Groups tabs */}
        {!activeChatId && !activeGroupId && (
          <div className="shrink-0 flex px-4 pt-2 gap-2 bg-[#faf7f2]">
            {(['chats', 'groups'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`flex-1 rounded-xl font-bold py-2.5 min-h-[44px] text-sm transition-colors ${
                  tab === t
                    ? 'bg-amber-700 text-amber-50 shadow-sm'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {t === 'chats' ? (
                  <T en="💬 Chats" bn="💬 কথোপকথন" hi="💬 बातचीत" />
                ) : (
                  <T en="👥 Groups" bn="👥 গ্রুপ" hi="👥 समूह" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0">
          {activeGroupId ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-3xl animate-pulse" aria-hidden>
                    🪔
                  </div>
                </div>
              }
            >
              <GroupThread
                uid={uid}
                groupId={activeGroupId}
                group={activeGroup}
                onBack={() => setActiveGroupId(null)}
                onInfo={() => setInfoOpen(true)}
              />
            </Suspense>
          ) : activeChatId ? (
            <ChatThread
              uid={uid}
              chatId={activeChatId}
              thread={activeThread}
              onBack={() => setActiveChatId(null)}
              onReceiptConfirm={onReceiptConfirm}
            />
          ) : tab === 'groups' ? (
            <GroupList
              uid={uid}
              groups={groups}
              loading={groupsLoading}
              onOpen={openGroup}
              onNewGroup={() => setCreateOpen(true)}
              onJoinGroup={() => setJoinOpen(true)}
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

        {/* Chat backup settings */}
        {backupOpen && (
          <div
            className="fixed inset-0 z-[125] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            role="dialog"
            aria-label="Chat backup"
          >
            <div className="bg-[#faf7f2] w-full sm:max-w-lg h-[92dvh] sm:h-[85vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-stone-200">
                <span className="text-sm font-extrabold text-stone-800">
                  <T en="Chat Backup" bn="চ্যাট ব্যাকআপ" hi="चैट बैकअप" />
                </span>
                <button
                  type="button"
                  onClick={() => setBackupOpen(false)}
                  aria-label="Close chat backup"
                  className="w-11 h-11 min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <BackupSettings uid={uid} onClose={() => setBackupOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Group chat sheets */}
        {createOpen && (
          <CreateGroupSheet
            uid={uid}
            selfInfo={selfInfo}
            onClose={() => setCreateOpen(false)}
            onCreated={(groupId) => {
              setCreateOpen(false);
              openGroup(groupId);
            }}
          />
        )}
        {joinOpen && (
          <JoinGroupSheet
            uid={uid}
            selfInfo={selfInfo}
            onClose={() => setJoinOpen(false)}
            onJoined={(groupId) => {
              setJoinOpen(false);
              openGroup(groupId);
            }}
          />
        )}
        {infoOpen && activeGroup && (
          <GroupInfoSheet
            uid={uid}
            group={activeGroup}
            onClose={() => setInfoOpen(false)}
            onLeftOrDeleted={() => {
              setInfoOpen(false);
              setActiveGroupId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
