/**
 * useChat.ts — React hooks over chatService.
 * =============================================================
 * - useChatThreads(uid): realtime thread list (newest first)
 * - useChatMessages(chatId): realtime messages (oldest first)
 * - useTypingIndicator(chatId, otherUid): is the other side typing?
 * - useChatUnreadTotal(uid): summed unread count for badges
 */
import { useEffect, useMemo, useState } from 'react';
import {
  subscribeMessages,
  subscribeThreads,
  type ChatThreadLive,
} from './chatService';
import type { ChatMessage, ChatThread } from './types';

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
