/**
 * chatService.ts — Phase 1 chat foundation for Sanatani Bandhan.
 * =============================================================
 * Firestore operations for `chats/{chatId}` and `chats/{chatId}/messages/{msgId}`.
 *
 * Offline-first: relies on Firestore's built-in offline persistence
 * (already enabled app-wide). No custom queue is needed — writes land
 * locally first and sync when the network returns.
 *
 * Security: the `chats` rules in firestore.rules are participants-based
 * (read/create/update only when request.auth.uid is in `participants`;
 * the `participants` field itself is immutable). This service never
 * touches `participants` after thread creation and never rewrites
 * firestore.rules.
 */
import { db } from '../firebase';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  ChatMessage,
  ChatParticipant,
  ChatThread,
  ChatType,
  MessageKind,
} from './types';

/**
 * Live thread with the delivery-ack field used for ✓✓ "delivered" state.
 * The shared contract (types.ts) is untouched — Firestore is schemaless,
 * so this optional field simply extends what the thread doc carries.
 */
export interface ChatThreadLive extends ChatThread {
  /** uid -> timestamp the recipient's device last received messages */
  lastDeliveredAt?: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const chatsCol = () => collection(db, 'chats');
const chatDoc = (chatId: string) => doc(db, 'chats', chatId);
const messagesCol = (chatId: string) => collection(db, 'chats', chatId, 'messages');

/** Deterministic id for a direct thread: sorted uids joined. Same pair → same thread. */
export function directChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/** Deterministic id for a user ↔ organisation thread. */
export function orgChatId(userUid: string, orgId: string): string {
  return `org_${orgId}_${userUid}`;
}

function toChatThread(id: string, data: DocumentData): ChatThread {
  return {
    id,
    type: (data.type as ChatType) ?? 'direct',
    participants: data.participants ?? [],
    participantInfo: data.participantInfo ?? {},
    lastMessage: data.lastMessage,
    lastMessageAt: toMillis(data.lastMessageAt),
    unreadCounts: data.unreadCounts ?? {},
    lastReadAt: data.lastReadAt ?? {},
    lastDeliveredAt: data.lastDeliveredAt ?? {},
    typing: data.typing ?? {},
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    updatedAt: toMillis(data.updatedAt) ?? Date.now(),
    archivedBy: data.archivedBy ?? [],
  } as ChatThread;
}

function toMillis(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  // Firestore Timestamp (has toMillis)
  if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

function toChatMessage(id: string, chatId: string, data: DocumentData): ChatMessage {
  return {
    id,
    chatId,
    senderId: data.senderId ?? '',
    kind: (data.kind as MessageKind) ?? 'text',
    text: data.text ?? '',
    blessingMeta: data.blessingMeta,
    requestId: data.requestId,
    receiptMeta: data.receiptMeta,
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    deliveredAt: toMillis(data.deliveredAt),
    readBy: data.readBy ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Thread creation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Get-or-create a 1:1 thread between two users. Deterministic chatId means
 * two people can never end up with duplicate threads, even across devices.
 */
export async function getOrCreateDirectChat(
  uid1: string,
  uid2: string,
  info1: ChatParticipant,
  info2: ChatParticipant,
): Promise<string> {
  if (!uid1 || !uid2) throw new Error('chat: both uids are required');
  if (uid1 === uid2) throw new Error('chat: cannot message yourself');
  const chatId = directChatId(uid1, uid2);
  const now = Date.now();
  await setDoc(
    chatDoc(chatId),
    {
      type: 'direct',
      participants: [uid1, uid2].sort(),
      participantInfo: { [uid1]: info1, [uid2]: info2 },
      unreadCounts: { [uid1]: 0, [uid2]: 0 },
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>,
    { merge: true },
  );
  return chatId;
}

/**
 * Get-or-create a user ↔ organisation thread. The org side appears as a
 * branded participant (logo + name) and is opened on the org's devices by
 * trustee/accountant roles.
 */
export async function getOrCreateOrgChat(
  userUid: string,
  orgId: string,
  userInfo: ChatParticipant,
  orgInfo: ChatParticipant,
): Promise<string> {
  if (!userUid || !orgId) throw new Error('chat: userUid and orgId are required');
  const chatId = orgChatId(userUid, orgId);
  const now = Date.now();
  await setDoc(
    chatDoc(chatId),
    {
      type: 'org',
      participants: [userUid, orgId],
      participantInfo: { [userUid]: userInfo, [orgId]: { ...orgInfo, orgId } },
      unreadCounts: { [userUid]: 0, [orgId]: 0 },
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>,
    { merge: true },
  );
  return chatId;
}

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export interface SendMeta {
  blessingMeta?: ChatMessage['blessingMeta'];
  requestId?: string;
  /** Seva Bazar Phase 2 — token-advance receipt payload. */
  receiptMeta?: ChatMessage['receiptMeta'];
}

/**
 * Send a message: appends to the subcollection, then updates the thread's
 * lastMessage/updatedAt and bumps unread counts for every other participant.
 * Both writes are local-first (offline-safe); Firestore syncs them later.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  kind: MessageKind,
  text: string,
  meta?: SendMeta,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed && kind === 'text') throw new Error('chat: empty message');
  const now = Date.now();

  const msgRef = await addDoc(messagesCol(chatId), {
    senderId,
    kind,
    text: trimmed,
    ...(meta?.blessingMeta ? { blessingMeta: meta.blessingMeta } : {}),
    ...(meta?.requestId ? { requestId: meta.requestId } : {}),
    ...(meta?.receiptMeta ? { receiptMeta: meta.receiptMeta } : {}),
    createdAt: now,
    deliveredAt: now, // written to cloud/local → at least sent
    readBy: [senderId],
  });

  // Thread summary + unread bumps. Participants are read from the thread so
  // we bump exactly the people who should be nudged (never the sender).
  try {
    const snap = await getDoc(chatDoc(chatId));
    const data = snap.data();
    const participants: string[] = Array.isArray(data?.participants) ? data.participants : [senderId];
    const unreadBumps: Record<string, unknown> = {};
    for (const p of participants) {
      if (p !== senderId) unreadBumps[`unreadCounts.${p}`] = increment(1);
    }
    const preview = kind === 'blessing' ? `🪔 ${trimmed}` : kind === 'request_card' ? `🙏 ${trimmed}` : trimmed;
    await updateDoc(chatDoc(chatId), {
      lastMessage: preview.slice(0, 140),
      lastMessageAt: now,
      updatedAt: now,
      ...unreadBumps,
    });
  } catch (err) {
    // The message itself is already stored; a thread-summary failure must
    // never lose the message. Log and continue.
    console.warn('[chat] thread summary update failed (message is safe):', err);
  }
  return msgRef.id;
}

/** Mark a thread read: clears my unread count and records lastReadAt. */
export async function markRead(chatId: string, uid: string): Promise<void> {
  await updateDoc(chatDoc(chatId), {
    [`unreadCounts.${uid}`]: 0,
    [`lastReadAt.${uid}`]: Date.now(),
  });
}

/**
 * Record that messages have been delivered to a device: the receiving
 * client calls this when its subscription first sees newer messages.
 * Drives the ✓✓ "delivered" state without per-message writes.
 */
export async function markDelivered(chatId: string, uid: string): Promise<void> {
  await updateDoc(chatDoc(chatId), {
    [`lastDeliveredAt.${uid}`]: Date.now(),
  });
}

/** Ephemeral typing indicator stored on the chat doc (not a message). */
export async function setTyping(chatId: string, uid: string, isTyping: boolean): Promise<void> {
  try {
    await updateDoc(chatDoc(chatId), {
      [`typing.${uid}`]: isTyping,
    });
  } catch {
    // Typing is best-effort; never block the UI.
  }
}

/** Remove a stale typing flag (e.g. on unmount). */
export async function clearTyping(chatId: string, uid: string): Promise<void> {
  try {
    await updateDoc(chatDoc(chatId), {
      [`typing.${uid}`]: deleteField(),
    });
  } catch {
    /* best-effort */
  }
}

/** Archive / unarchive a thread for one user only. */
export async function setArchived(chatId: string, uid: string, archived: boolean): Promise<void> {
  const snap = await getDoc(chatDoc(chatId));
  const current: string[] = Array.isArray(snap.data()?.archivedBy) ? snap.data()!.archivedBy : [];
  const next = archived ? Array.from(new Set([...current, uid])) : current.filter((u) => u !== uid);
  await updateDoc(chatDoc(chatId), { archivedBy: next });
}

/* ------------------------------------------------------------------ */
/* Realtime subscriptions                                              */
/* ------------------------------------------------------------------ */

/**
 * Realtime thread list for a user, newest first.
 * Sorted client-side so no composite index is required.
 */
export function subscribeThreads(uid: string, cb: (threads: ChatThread[]) => void): Unsubscribe {
  const q = query(chatsCol(), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const threads = snap.docs.map((d) => toChatThread(d.id, d.data()));
      threads.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      cb(threads);
    },
    (err) => {
      console.warn('[chat] subscribeThreads error:', err);
      cb([]);
    },
  );
}

/** Realtime messages for one thread, oldest first. Single-field orderBy — no composite index needed. */
export function subscribeMessages(chatId: string, cb: (messages: ChatMessage[]) => void): Unsubscribe {
  const q = query(messagesCol(chatId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      cb(snap.docs.map((d) => toChatMessage(d.id, chatId, d.data())));
    },
    (err) => {
      console.warn('[chat] subscribeMessages error:', err);
      cb([]);
    },
  );
}

/**
 * Realtime "new arrivals" for one thread. Skips the initial snapshot
 * (history the devotee has already seen) and reports only messages added
 * afterwards — the primitive the notification layer listens on.
 * The first snapshot after mount is the baseline; catch-up syncs that
 * arrive later surface as 'added' and DO notify (the devotee hasn't
 * seen them yet).
 */
export function subscribeNewMessages(
  chatId: string,
  onAdded: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(messagesCol(chatId), orderBy('createdAt', 'asc'));
  let first = true;
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      if (first) {
        first = false;
        return;
      }
      const added = snap
        .docChanges()
        .filter((c) => c.type === 'added')
        .map((c) => toChatMessage(c.doc.id, chatId, c.doc.data()));
      if (added.length > 0) onAdded(added);
    },
    (err) => {
      console.warn('[chat] subscribeNewMessages error:', err);
    },
  );
}

/** One-off thread read (e.g. to resolve participant info for a fresh chatId). */
export async function getThread(chatId: string): Promise<ChatThreadLive | null> {
  const snap = await getDoc(chatDoc(chatId));
  if (!snap.exists()) return null;
  return toChatThread(snap.id, snap.data()) as ChatThreadLive;
}
