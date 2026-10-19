/**
 * chat/backup/ArchiveViewer.tsx — browse restored words (read-only).
 * ===================================================================
 * The archive is the user's private memory. Read, reflect — never edit,
 * never resend. New words live in live conversations.
 */
import React, { useEffect, useState } from 'react';
import { useBackupStrings } from './strings';
import { listArchivedThreads, getArchivedThread } from './archiveStore';
import type { SerializedThread } from './backupService';
import { threadKind } from './backupService';
import { groupTypeIcon } from '../groups/types';
import { ChatAvatar } from '../ChatList';
import { useLocaleText } from '../../solo/ui';

export const ArchiveViewer: React.FC = () => {
  const { tr } = useBackupStrings();
  const { lang } = useLocaleText();
  const [threads, setThreads] = useState<SerializedThread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<SerializedThread | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listArchivedThreads()
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openId) {
      setOpenThread(null);
      return;
    }
    getArchivedThread(openId).then(setOpenThread).catch(() => {});
  }, [openId]);

  if (loading) {
    return <div className="p-6 text-center text-sm text-stone-500">…</div>;
  }

  if (openThread) {
    const isGroup = threadKind(openThread) === 'group';
    const otherKey = openThread.participants[0] || '';
    const person = openThread.participantInfo[otherKey] || { uid: otherKey, displayName: 'Sanatani' };
    const headerName = isGroup ? openThread.groupName || 'Group' : person.displayName;
    return (
      <div className="flex flex-col h-full min-h-0">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="shrink-0 text-sm font-bold text-amber-800 min-h-[44px] text-left px-3"
        >
          ← {isGroup ? `${groupTypeIcon((openThread.groupType as 'family') || 'custom')} ` : ''}
          {headerName}
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-2">
          {openThread.messages.map((m) => {
            return (
              <div key={m.id} className="max-w-[85%] rounded-2xl bg-white border border-stone-200 px-3 py-2 shadow-sm">
                {isGroup && m.senderName && (
                  <p className="text-[11px] font-extrabold text-amber-800 mb-0.5">{m.senderName}</p>
                )}
                {m.voiceMeta ? (
                  <p className="text-sm text-stone-800">
                    🎙️ Voice note · {Math.round(m.voiceMeta.durationMs / 1000)}s
                  </p>
                ) : (
                  <p className="text-sm text-stone-800 whitespace-pre-wrap break-words">{m.text}</p>
                )}
                <p className="text-[10px] text-stone-400 mt-1">
                  {new Date(m.createdAt).toLocaleString(lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {m.kind === 'blessing' && m.blessingMeta ? ` · 🪔 ${m.blessingMeta.occasion}` : ''}
                  {m.requestSnapshot
                    ? ` · 💰 ${m.requestSnapshot.amount} ${m.requestSnapshot.currency} (${m.requestSnapshot.status})`
                    : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3" aria-hidden>
          📜
        </div>
        <p className="text-sm text-stone-600">{tr.archiveEmpty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="shrink-0 px-4 pb-2 text-xs text-stone-500 leading-relaxed">{tr.archiveNote}</p>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {threads.map((t) => {
          const isGroup = threadKind(t) === 'group';
          const otherKey = t.participants[0] || '';
          const person = t.participantInfo[otherKey] || { uid: otherKey, displayName: 'Sanatani' };
          const last = t.messages[t.messages.length - 1];
          const lastPreview = last
            ? last.voiceMeta
              ? `🎙️ Voice note · ${Math.round(last.voiceMeta.durationMs / 1000)}s`
              : last.text
            : '';
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 text-left min-h-[64px] border-b border-stone-100"
            >
              {isGroup ? (
                <span className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-xl shrink-0" aria-hidden>
                  {groupTypeIcon((t.groupType as 'family') || 'custom')}
                </span>
              ) : (
                <ChatAvatar person={person} size={44} />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-extrabold text-stone-900 truncate">
                  {isGroup ? t.groupName || 'Group' : person.displayName}
                </span>
                <span className="block text-xs text-stone-500 truncate">
                  {isGroup && t.members ? `👥 ${t.members.length} · ` : ''}
                  {lastPreview} · {t.messages.length}
                </span>
              </span>
              <span aria-hidden className="text-stone-400">
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
