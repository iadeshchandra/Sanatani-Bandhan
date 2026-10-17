/**
 * useChat.ts — React hooks over chatService.
 * =============================================================
 * - useChatThreads(uid): realtime thread list (newest first)
 * - useChatMessages(chatId): realtime messages (oldest first)
 * - useTypingIndicator(chatId, otherUid): is the other side typing?
 * - useChatUnreadTotal(uid): summed unread count for badges
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeMessages,
  subscribeNewMessages,
  subscribeThreads,
  type ChatThreadLive,
} from './chatService';
import type { ChatMessage, ChatThread } from './types';
import { notifyChatMessage } from '../notifications/notifyHelpers';

/* ------------------------------------------------------------------ */
/* Open-thread registry — the notifier stays silent for the thread the */
/* devotee is actively reading (no buzz for what is already on screen).*/
/* ------------------------------------------------------------------ */

let openChatId: string | null = null;

/** Called by the thread view on mount/unmount. */
export function markChatOpen(chatId: string | null): void {
  openChatId = chatId;
}

/** True while the given thread is on screen. */
export function isChatOpen(chatId: string): boolean {
  return openChatId === chatId;
}

export function useChatThreads(uid: string | null | undefined): {
  threads: ChatThreadLive[];
  loading: boolean;
} {
  const [threads, setThreads] = useState<ChatThreadLive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || uid === 'anon') {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeThreads(uid, (list) => {
      setThreads(list);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  return { threads, loading };
}

export function useChatMessages(chatId: string | null | undefined): {
  messages: ChatMessage[];
  loading: boolean;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeMessages(chatId, (list) => {
      setMessages(list);
      setLoading(false);
    });
    return () => unsub();
  }, [chatId]);

  return { messages, loading };
}

/** True while the given participant's typing flag is set on the thread. */
export function useTypingIndicator(
  chatId: string | null | undefined,
  otherUid: string | null | undefined,
  threads: ChatThread[],
): boolean {
  return useMemo(() => {
    if (!chatId || !otherUid) return false;
    const thread = threads.find((t) => t.id === chatId);
    return Boolean(thread?.typing?.[otherUid]);
  }, [chatId, otherUid, threads]);
}

/** Total unread across all threads — feeds the Messages badge on Solo Home. */
export function useChatUnreadTotal(uid: string | null | undefined): number {
  const { threads } = useChatThreads(uid);
  return useMemo(() => {
    if (!uid) return 0;
    return threads.reduce((sum, t) => sum + (t.unreadCounts?.[uid] ?? 0), 0);
  }, [threads, uid]);
}

/** Split threads into active + archived for one user. */
export function useArchivedSplit(
  threads: ChatThreadLive[],
  uid: string,
): { active: ChatThreadLive[]; archived: ChatThreadLive[] } {
  return useMemo(() => {
    const active: ChatThreadLive[] = [];
    const archived: ChatThreadLive[] = [];
    for (const t of threads) {
      (t.archivedBy?.includes(uid) ? archived : active).push(t);
    }
    return { active, archived };
  }, [threads, uid]);
}

/* ------------------------------------------------------------------ */
/* useChatNotify — Phase 3 notification wiring for chat.                */
/* ================================================================== */
/* Self-listen pattern (the rules are self-write-only): the recipient's */
/* own device watches its threads; new arrivals from the other side     */
/* become NotificationCenter emits. New message → IMPORTANT, blessing  */
/* card → GENTLE. Silent for the thread currently on screen.            */
/* Mount once per session (see notifications/NotificationWiring).      */
/* ------------------------------------------------------------------ */

export function useChatNotify(uid: string | null | undefined): void {
  const { threads } = useChatThreads(uid);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const threadIds = useMemo(() => threads.map((t) => t.id).sort().join(','), [threads]);

  useEffect(() => {
    if (!uid || uid === 'anon' || threadIds === '') return;
    const live = threadsRef.current;
    const unsubs = live.map((thread) =>
      subscribeNewMessages(thread.id, (arrivals) => {
        if (isChatOpen(thread.id)) return;
        const current = threadsRef.current.find((t) => t.id === thread.id);
        for (const m of arrivals) {
          if (m.senderId === uid || m.kind === 'system') continue;
          const sender = current?.participantInfo?.[m.senderId];
          const senderName = sender?.displayName || 'A devotee';
          const label =
            current?.type === 'org'
              ? sender?.orgName || current?.participantInfo?.[current.participants.find((p) => p !== uid) ?? '']?.displayName || 'chat'
              : 'chat';
          void notifyChatMessage(uid, {
            senderUid: m.senderId,
            senderName,
            senderPhoto: sender?.photoUrl,
            kind: m.kind,
            preview: m.text || (m.kind === 'blessing' ? '🪔' : ''),
            messageId: m.id,
            chatId: thread.id,
            threadLabel: label,
          });
        }
      }),
    );
    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* best-effort */
        }
      });
    };
    // Re-subscribe only when the thread SET changes, not on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, threadIds]);
}
