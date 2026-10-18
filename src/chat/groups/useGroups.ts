/**
 * groups/useGroups.ts — React hooks over groupService.
 * ======================================================
 * - useGroupList(uid): realtime groups for a member (newest first)
 * - useGroup(groupId): realtime single group doc
 * - useGroupMessages(groupId): realtime messages (oldest first)
 * - useGroupTypingLabel(groupId, uid): "X is typing…" / "3 people typing…"
 * - useGroupUnreadTotal(uid): summed unread for badges
 * - useGroupNotify(uid): self-listen notification wiring (mount once)
 *
 * Open-group registry: the notifier stays silent for the group the
 * devotee is actively reading.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeGroup,
  subscribeGroupMessages,
  subscribeGroups,
  subscribeNewGroupMessages,
} from './groupService';
import type { GroupChat } from './types';
import { notifyChatMessage } from '../../notifications/notifyHelpers';
import { isChatOpen, markChatOpen } from '../useChat';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { typingLabel } from './types';
import type { ChatParticipant } from '../types';
import type { GroupMessage } from './types';

/* ------------------------------------------------------------------ */
/* Open-group registry                                                 */
/* ------------------------------------------------------------------ */

let openGroupId: string | null = null;

export function markGroupOpen(groupId: string | null): void {
  openGroupId = groupId;
  // Keep the 1:1 registry in sync so cross-notifiers stay quiet too.
  markChatOpen(groupId);
}

export function isGroupOpen(groupId: string): boolean {
  return openGroupId === groupId;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useGroupList(uid: string | null | undefined): {
  groups: GroupChat[];
  loading: boolean;
} {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || uid === 'anon') {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGroups(uid, (list) => {
      setGroups(list);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  return { groups, loading };
}

export function useGroup(groupId: string | null | undefined): {
  group: GroupChat | null;
  loading: boolean;
} {
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGroup(groupId, (g) => {
      setGroup(g);
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  return { group, loading };
}

export function useGroupMessages(groupId: string | null | undefined): {
  messages: GroupMessage[];
  loading: boolean;
} {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGroupMessages(groupId, (list) => {
      setMessages(list);
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  return { messages, loading };
}

/** Warm typing label for the group header ("X is typing…" / "3 people typing…"). */
export function useGroupTypingLabel(
  group: GroupChat | null | undefined,
  uid: string,
  lang: string,
): string | null {
  return useMemo(() => {
    if (!group) return null;
    return typingLabel(group.typing, group.memberInfo, uid, lang as 'en' | 'bn' | 'hi');
  }, [group, uid, lang]);
}

/** Total unread across all groups — feeds the Messages badge. */
export function useGroupUnreadTotal(uid: string | null | undefined): number {
  const { groups } = useGroupList(uid);
  return useMemo(() => {
    if (!uid) return 0;
    return groups.reduce((sum, g) => sum + (g.unreadCounts?.[uid] ?? 0), 0);
  }, [groups, uid]);
}

/** Split groups into active + archived for one member. */
export function useGroupArchivedSplit(
  groups: GroupChat[],
  uid: string,
): { active: GroupChat[]; archived: GroupChat[] } {
  return useMemo(() => {
    const active: GroupChat[] = [];
    const archived: GroupChat[] = [];
    for (const g of groups) {
      (g.archivedBy?.includes(uid) ? archived : active).push(g);
    }
    return { active, archived };
  }, [groups, uid]);
}

/** Build the current user's ChatParticipant from the auth workspace. */
export function useSelfParticipant(uid: string): ChatParticipant {
  const { firebaseUser, soloProfile } = useAuthWorkspace();
  return useMemo(
    () => ({
      uid,
      displayName:
        (soloProfile as { displayName?: string } | null)?.displayName ||
        (firebaseUser as { displayName?: string } | null)?.displayName ||
        'Sanatani',
      photoUrl: (firebaseUser as { photoURL?: string } | null)?.photoURL || undefined,
      sanataniId: (soloProfile as { id?: string } | null)?.id,
      verificationTier: (soloProfile as { verificationTier?: string } | null)?.verificationTier,
    }),
    [uid, firebaseUser, soloProfile],
  );
}

/* ------------------------------------------------------------------ */
/* useGroupNotify — group message → NotificationCenter wiring.         */
/* ================================================================== */
/* Same self-listen pattern as 1:1 chat: the recipient's own device    */
/* watches its groups; new arrivals become NotificationCenter emits.    */
/* Group message → IMPORTANT (someone spoke to my sangha). Silent for  */
/* the group currently on screen and for system messages.              */
/* Mount once per session (see notifications/NotificationWiring).     */
/* ------------------------------------------------------------------ */

export function useGroupNotify(uid: string | null | undefined): void {
  const { groups } = useGroupList(uid);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const groupIds = useMemo(() => groups.map((g) => g.id).sort().join(','), [groups]);

  useEffect(() => {
    if (!uid || uid === 'anon' || groupIds === '') return;
    const live = groupsRef.current;
    const unsubs = live.map((group) =>
      subscribeNewGroupMessages(group.id, (arrivals) => {
        if (isGroupOpen(group.id) || isChatOpen(group.id)) return;
        for (const m of arrivals) {
          if (m.senderId === uid || m.kind === 'system') continue;
          void notifyChatMessage(uid, {
            senderUid: m.senderId,
            senderName: m.senderName || 'A devotee',
            senderPhoto: m.senderAvatar,
            kind: m.kind,
            preview: m.text || (m.kind === 'blessing' ? '🪔' : ''),
            messageId: m.id,
            chatId: group.id,
            threadLabel: `👥 ${group.name}`,
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
    // Re-subscribe only when the group SET changes, not on every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, groupIds]);
}
