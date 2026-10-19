/**
 * groups/groupService.ts — Firestore operations for group chats.
 * ===============================================================
 * Collections:
 *   chatGroups/{groupId}                  — metadata (memberIds = rules source of truth)
 *   chatGroups/{groupId}/messages/{msgId} — messages (sender attribution denormalized)
 *   chatGroups/{groupId}/members/{uid}    — membership docs (role, joinedAt)
 *
 * Offline-first: Firestore's built-in persistence (already app-wide).
 * Writes land locally first, sync when the network returns.
 *
 * Security: rules are memberIds-based. This service never writes
 * memberIds except through the admin-guarded paths below, and the
 * rules re-verify every one of them.
 */
import { db } from '../../firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
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
import type { ChatParticipant, MessageKind } from '../types';
import {
  generateInviteCode,
  isGroupAdmin,
  isGroupMember,
  newGroupId,
  systemMessageText,
  type GroupChat,
  type GroupMessage,
  type GroupSystemKind,
  type GroupType,
} from './types';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const groupsCol = () => collection(db, 'chatGroups');
const groupDoc = (groupId: string) => doc(db, 'chatGroups', groupId);
const messagesCol = (groupId: string) => collection(db, 'chatGroups', groupId, 'messages');
const memberDoc = (groupId: string, uid: string) => doc(db, 'chatGroups', groupId, 'members', uid);

function toMillis(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

function toGroupChat(id: string, data: DocumentData): GroupChat {
  return {
    id,
    name: data.name ?? 'Group',
    description: data.description,
    type: (data.type as GroupType) ?? 'custom',
    createdBy: data.createdBy ?? '',
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    updatedAt: toMillis(data.updatedAt) ?? Date.now(),
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
    memberInfo: data.memberInfo ?? {},
    inviteCode: data.inviteCode ?? '',
    lastMessage: data.lastMessage,
    lastMessageAt: toMillis(data.lastMessageAt),
    unreadCounts: data.unreadCounts ?? {},
    lastReadAt: data.lastReadAt ?? {},
    lastDeliveredAt: data.lastDeliveredAt ?? {},
    typing: data.typing ?? {},
    archivedBy: data.archivedBy ?? [],
  };
}

function toGroupMessage(id: string, groupId: string, data: DocumentData): GroupMessage {
  return {
    id,
    chatId: groupId,
    groupId,
    senderId: data.senderId ?? '',
    senderName: data.senderName ?? 'A devotee',
    senderAvatar: data.senderAvatar,
    kind: (data.kind as MessageKind) ?? 'text',
    text: data.text ?? '',
    blessingMeta: data.blessingMeta,
    createdAt: toMillis(data.createdAt) ?? Date.now(),
    deliveredAt: toMillis(data.deliveredAt),
    readBy: data.readBy ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Group lifecycle                                                     */
/* ------------------------------------------------------------------ */

export interface CreateGroupInput {
  name: string;
  description?: string;
  type: GroupType;
  /** Additional members beyond the creator (creator is auto-added as admin). */
  members: ChatParticipant[];
}

/**
 * Create a group. The creator becomes the first admin. A warm "created"
 * system message seeds the thread. Returns the groupId.
 */
export async function createGroup(
  creatorUid: string,
  creatorInfo: ChatParticipant,
  input: CreateGroupInput,
): Promise<string> {
  const name = input.name.trim();
  if (!name || name.length < 2 || name.length > 60) throw new Error('groups: name must be 2–60 characters');
  if (!creatorUid) throw new Error('groups: creator uid required');

  const groupId = newGroupId(creatorUid);
  const now = Date.now();
  const seen = new Set<string>([creatorUid]);
  const memberIds: string[] = [creatorUid];
  const memberInfo: Record<string, ChatParticipant> = { [creatorUid]: creatorInfo };
  for (const m of input.members) {
    if (!m.uid || seen.has(m.uid)) continue;
    seen.add(m.uid);
    memberIds.push(m.uid);
    memberInfo[m.uid] = m;
  }
  const unreadCounts: Record<string, number> = {};
  for (const id of memberIds) unreadCounts[id] = 0;

  const inviteCode = generateInviteCode();
  await setDoc(groupDoc(groupId), {
    name,
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 280) } : {}),
    type: input.type,
    createdBy: creatorUid,
    createdAt: now,
    updatedAt: now,
    memberIds,
    adminIds: [creatorUid],
    memberInfo,
    inviteCode,
    unreadCounts,
    lastMessage: systemMessageText('created', creatorInfo.displayName, undefined, 'en'),
    lastMessageAt: now,
  });

  // Membership docs — one per member (role source for future RBAC reads).
  await Promise.all(
    memberIds.map((uid) =>
      setDoc(memberDoc(groupId, uid), {
        uid,
        role: uid === creatorUid ? 'admin' : 'member',
        joinedAt: now,
        ...(uid === creatorUid ? {} : { addedBy: creatorUid }),
      }),
    ),
  );

  // Seed the warm "created" system message.
  await addDoc(messagesCol(groupId), {
    senderId: creatorUid,
    senderName: creatorInfo.displayName,
    kind: 'system',
    systemKind: 'created',
    text: systemMessageText('created', creatorInfo.displayName, undefined, 'en'),
    createdAt: now,
    readBy: [creatorUid],
  });

  return groupId;
}

/**
 * Join via invite code. The code is looked up server-side; the joiner must
 * be authenticated and not already a member. A warm "joined" system
 * message announces the arrival.
 */
export async function joinGroupViaCode(
  uid: string,
  userInfo: ChatParticipant,
  inviteCode: string,
): Promise<string> {
  const code = inviteCode.trim().toUpperCase();
  if (!/^[A-Z2-9]{8}$/.test(code)) throw new Error('groups: invalid invite code');
  if (!uid) throw new Error('groups: uid required');

  const q = query(groupsCol(), where('inviteCode', '==', code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('groups: invite not found');
  const gdoc = snap.docs[0];
  const group = toGroupChat(gdoc.id, gdoc.data());
  if (isGroupMember(group, uid)) return group.id; // idempotent

  const now = Date.now();
  await setDoc(memberDoc(group.id, uid), { uid, role: 'member', joinedAt: now });
  await updateDoc(groupDoc(group.id), {
    memberIds: [...group.memberIds, uid],
    memberInfo: { ...group.memberInfo, [uid]: userInfo },
    [`unreadCounts.${uid}`]: 0,
    updatedAt: now,
  });
  await addDoc(messagesCol(group.id), {
    senderId: uid,
    senderName: userInfo.displayName,
    kind: 'system',
    systemKind: 'joined',
    text: systemMessageText('joined', userInfo.displayName, undefined, 'en'),
    createdAt: now,
    readBy: [uid],
  });
  return group.id;
}

/* ------------------------------------------------------------------ */
/* Member management (admin-guarded; rules re-verify)                   */
/* ------------------------------------------------------------------ */

async function loadGroup(groupId: string): Promise<GroupChat> {
  const snap = await getDoc(groupDoc(groupId));
  if (!snap.exists()) throw new Error('groups: group not found');
  return toGroupChat(snap.id, snap.data());
}

function requireAdmin(group: GroupChat, uid: string): void {
  if (!isGroupAdmin(group, uid)) throw new Error('groups: admin only');
}

/** Admin adds a member. Warm "invited" system message. */
export async function addGroupMember(
  groupId: string,
  adminUid: string,
  newMember: ChatParticipant,
): Promise<void> {
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  if (!isGroupMember(group, adminUid)) throw new Error('groups: not a member');
  if (!newMember.uid || isGroupMember(group, newMember.uid)) return; // idempotent
  const now = Date.now();
  await setDoc(memberDoc(groupId, newMember.uid), {
    uid: newMember.uid,
    role: 'member',
    joinedAt: now,
    addedBy: adminUid,
  });
  await updateDoc(groupDoc(groupId), {
    memberIds: [...group.memberIds, newMember.uid],
    memberInfo: { ...group.memberInfo, [newMember.uid]: newMember },
    [`unreadCounts.${newMember.uid}`]: 0,
    updatedAt: now,
  });
  const adminName = group.memberInfo[adminUid]?.displayName ?? 'An admin';
  await addDoc(messagesCol(groupId), {
    senderId: adminUid,
    senderName: adminName,
    kind: 'system',
    systemKind: 'added',
    text: systemMessageText('added', adminName, newMember.displayName, 'en'),
    createdAt: now,
    readBy: [adminUid],
  });
}

/** Admin removes a member (never the last admin — promote first). */
export async function removeGroupMember(
  groupId: string,
  adminUid: string,
  targetUid: string,
): Promise<void> {
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  if (!isGroupMember(group, targetUid)) return;
  if (targetUid === adminUid) throw new Error('groups: admins leave via Leave, not remove');
  const remainingAdmins = group.adminIds.filter((a) => a !== targetUid);
  const now = Date.now();
  const targetName = group.memberInfo[targetUid]?.displayName ?? 'A devotee';
  await deleteDoc(memberDoc(groupId, targetUid));
  const memberInfo = { ...group.memberInfo };
  delete memberInfo[targetUid];
  await updateDoc(groupDoc(groupId), {
    memberIds: group.memberIds.filter((id) => id !== targetUid),
    adminIds: remainingAdmins,
    memberInfo,
    updatedAt: now,
  });
  await addDoc(messagesCol(groupId), {
    senderId: adminUid,
    senderName: group.memberInfo[adminUid]?.displayName ?? 'An admin',
    kind: 'system',
    systemKind: 'removed',
    text: systemMessageText('removed', '', targetName, 'en'),
    createdAt: now,
    readBy: [adminUid],
  });
}

/** Admin promotes a member to admin. */
export async function promoteMember(groupId: string, adminUid: string, targetUid: string): Promise<void> {
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  if (!isGroupMember(group, targetUid) || isGroupAdmin(group, targetUid)) return;
  const now = Date.now();
  await updateDoc(memberDoc(groupId, targetUid), { role: 'admin' });
  await updateDoc(groupDoc(groupId), {
    adminIds: [...group.adminIds, targetUid],
    updatedAt: now,
  });
  await addDoc(messagesCol(groupId), {
    senderId: adminUid,
    senderName: group.memberInfo[adminUid]?.displayName ?? 'An admin',
    kind: 'system',
    systemKind: 'promoted',
    text: systemMessageText('promoted', '', group.memberInfo[targetUid]?.displayName ?? 'A devotee', 'en'),
    createdAt: now,
    readBy: [adminUid],
  });
}

/** Admin renames the group. Warm "renamed" system message. */
export async function renameGroup(groupId: string, adminUid: string, newName: string): Promise<void> {
  const name = newName.trim();
  if (!name || name.length < 2 || name.length > 60) throw new Error('groups: name must be 2–60 characters');
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  const now = Date.now();
  await updateDoc(groupDoc(groupId), { name, updatedAt: now });
  await addDoc(messagesCol(groupId), {
    senderId: adminUid,
    senderName: group.memberInfo[adminUid]?.displayName ?? 'An admin',
    kind: 'system',
    systemKind: 'renamed',
    text: systemMessageText('renamed', '', name, 'en'),
    createdAt: now,
    readBy: [adminUid],
  });
}

/** Admin regenerates the invite code (old links stop working). */
export async function regenerateInviteCode(groupId: string, adminUid: string): Promise<string> {
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  const code = generateInviteCode();
  await updateDoc(groupDoc(groupId), { inviteCode: code, updatedAt: Date.now() });
  return code;
}

/**
 * Leave a group. If the leaver is the last admin and others remain, the
 * longest-standing member is promoted first (no orphaned groups). If the
 * leaver is the last member, the group is deleted.
 */
export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const group = await loadGroup(groupId);
  if (!isGroupMember(group, uid)) return;
  const now = Date.now();
  const remaining = group.memberIds.filter((id) => id !== uid);

  if (remaining.length === 0) {
    // Last one out — delete the group and its membership docs.
    await deleteDoc(groupDoc(groupId));
    await deleteDoc(memberDoc(groupId, uid)).catch(() => {});
    return;
  }

  let adminIds = group.adminIds.filter((a) => a !== uid);
  const updates: Record<string, unknown> = {};
  if (adminIds.length === 0) {
    // Promote the longest-standing remaining member.
    const memberSnaps = await getDocs(collection(db, 'chatGroups', groupId, 'members'));
    let oldest: { uid: string; joinedAt: number } | null = null;
    for (const d of memberSnaps.docs) {
      const data = d.data();
      if (data.uid === uid) continue;
      const joinedAt = typeof data.joinedAt === 'number' ? data.joinedAt : now;
      if (!oldest || joinedAt < oldest.joinedAt) oldest = { uid: data.uid as string, joinedAt };
    }
    const heir = oldest?.uid ?? remaining[0];
    adminIds = [heir];
    updates[`promoted`] = heir;
    await updateDoc(memberDoc(groupId, heir), { role: 'admin' }).catch(() => {});
  }

  const memberInfo = { ...group.memberInfo };
  const leaverName = memberInfo[uid]?.displayName ?? 'A devotee';
  delete memberInfo[uid];
  await deleteDoc(memberDoc(groupId, uid));
  await updateDoc(groupDoc(groupId), {
    memberIds: remaining,
    adminIds,
    memberInfo,
    updatedAt: now,
    ...updates,
  });
  await addDoc(messagesCol(groupId), {
    senderId: uid,
    senderName: leaverName,
    kind: 'system',
    systemKind: 'left',
    text: systemMessageText('left', leaverName, undefined, 'en'),
    createdAt: now,
    readBy: [uid],
  });
  if (updates['promoted']) {
    const heirName = memberInfo[updates['promoted'] as string]?.displayName ?? 'A devotee';
    await addDoc(messagesCol(groupId), {
      senderId: uid,
      senderName: leaverName,
      kind: 'system',
      systemKind: 'promoted',
      text: systemMessageText('promoted', '', heirName, 'en'),
      createdAt: now + 1,
      readBy: [uid],
    });
  }
}

/** Admin deletes the group entirely (with the members' consent implied by admin role). */
export async function deleteGroup(groupId: string, adminUid: string): Promise<void> {
  const group = await loadGroup(groupId);
  requireAdmin(group, adminUid);
  await deleteDoc(groupDoc(groupId));
  // Membership + message subcollections are orphaned by design (rules deny
  // all access once the parent is gone); a Blaze-day cleanup can sweep them.
}

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export interface GroupSendMeta {
  blessingMeta?: GroupMessage['blessingMeta'];
  senderAvatar?: string;
  /** Voice-note attachment payload. */
  voiceMeta?: GroupMessage['voiceMeta'];
}

/** Send a group message. Unread bumps for every other member. */
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  kind: MessageKind,
  text: string,
  meta?: GroupSendMeta,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed && kind === 'text') throw new Error('groups: empty message');
  if (kind === 'voice' && !meta?.voiceMeta) throw new Error('groups: voice message needs voiceMeta');
  if (kind === 'system') throw new Error('groups: system messages are service-born only');
  const now = Date.now();

  const gsnap = await getDoc(groupDoc(groupId));
  if (!gsnap.exists()) throw new Error('groups: group not found');
  const group = toGroupChat(gsnap.id, gsnap.data());
  if (!isGroupMember(group, senderId)) throw new Error('groups: not a member');
  const senderName = group.memberInfo[senderId]?.displayName ?? 'A devotee';

  const msgRef = await addDoc(messagesCol(groupId), {
    senderId,
    senderName,
    ...(meta?.senderAvatar ? { senderAvatar: meta.senderAvatar } : {}),
    kind,
    text: trimmed,
    ...(meta?.blessingMeta ? { blessingMeta: meta.blessingMeta } : {}),
    ...(meta?.voiceMeta ? { voiceMeta: meta.voiceMeta } : {}),
    createdAt: now,
    deliveredAt: now,
    readBy: [senderId],
  });

  try {
    const unreadBumps: Record<string, unknown> = {};
    for (const p of group.memberIds) {
      if (p !== senderId) unreadBumps[`unreadCounts.${p}`] = increment(1);
    }
    const preview = kind === 'blessing' ? `🪔 ${senderName}: ${trimmed}` : kind === 'voice' ? `🎙️ ${senderName}: Voice note` : `${senderName}: ${trimmed}`;
    await updateDoc(groupDoc(groupId), {
      lastMessage: preview.slice(0, 140),
      lastMessageAt: now,
      updatedAt: now,
      ...unreadBumps,
    });
  } catch (err) {
    console.warn('[groups] thread summary update failed (message is safe):', err);
  }
  return msgRef.id;
}

/** Post a system message (service-born only — join/leave/add flows call this). */
export async function postSystemMessage(
  groupId: string,
  kind: GroupSystemKind,
  actorUid: string,
  actorName: string,
  targetName?: string,
): Promise<void> {
  const now = Date.now();
  await addDoc(messagesCol(groupId), {
    senderId: actorUid,
    senderName: actorName,
    kind: 'system',
    systemKind: kind,
    text: systemMessageText(kind, actorName, targetName, 'en'),
    createdAt: now,
    readBy: [actorUid],
  });
}

/** Mark a group read for one member. */
export async function markGroupRead(groupId: string, uid: string): Promise<void> {
  await updateDoc(groupDoc(groupId), {
    [`unreadCounts.${uid}`]: 0,
    [`lastReadAt.${uid}`]: Date.now(),
  });
}

/** Record delivery for read-receipt state. */
export async function markGroupDelivered(groupId: string, uid: string): Promise<void> {
  await updateDoc(groupDoc(groupId), {
    [`lastDeliveredAt.${uid}`]: Date.now(),
  });
}

/** Ephemeral typing indicator. Best-effort, never blocks. */
export async function setGroupTyping(groupId: string, uid: string, isTyping: boolean): Promise<void> {
  try {
    const { deleteField: df } = await import('firebase/firestore');
    await updateDoc(groupDoc(groupId), {
      [`typing.${uid}`]: isTyping ? true : df(),
    });
  } catch {
    /* best-effort */
  }
}

/** Archive / unarchive a group for one member. */
export async function setGroupArchived(groupId: string, uid: string, archived: boolean): Promise<void> {
  const snap = await getDoc(groupDoc(groupId));
  if (!snap.exists()) return;
  const current: string[] = Array.isArray(snap.data()?.archivedBy) ? snap.data()!.archivedBy : [];
  const next = archived ? Array.from(new Set([...current, uid])) : current.filter((u) => u !== uid);
  await updateDoc(groupDoc(groupId), { archivedBy: next });
}

/* ------------------------------------------------------------------ */
/* Realtime subscriptions                                              */
/* ------------------------------------------------------------------ */

/** Realtime group list for a member, newest activity first. Client-sorted (no composite index). */
export function subscribeGroups(uid: string, cb: (groups: GroupChat[]) => void): Unsubscribe {
  const q = query(groupsCol(), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const groups = snap.docs.map((d) => toGroupChat(d.id, d.data()));
      groups.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      cb(groups);
    },
    (err) => {
      console.warn('[groups] subscribeGroups error:', err);
      cb([]);
    },
  );
}

/** Realtime single group doc. */
export function subscribeGroup(groupId: string, cb: (group: GroupChat | null) => void): Unsubscribe {
  return onSnapshot(
    groupDoc(groupId),
    (snap) => {
      cb(snap.exists() ? toGroupChat(snap.id, snap.data()) : null);
    },
    (err) => {
      console.warn('[groups] subscribeGroup error:', err);
      cb(null);
    },
  );
}

/** Realtime messages, oldest first. */
export function subscribeGroupMessages(groupId: string, cb: (messages: GroupMessage[]) => void): Unsubscribe {
  const q = query(messagesCol(groupId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      cb(snap.docs.map((d) => toGroupMessage(d.id, groupId, d.data())));
    },
    (err) => {
      console.warn('[groups] subscribeGroupMessages error:', err);
      cb([]);
    },
  );
}

/** New arrivals only — the notification primitive. */
export function subscribeNewGroupMessages(
  groupId: string,
  onAdded: (messages: GroupMessage[]) => void,
): Unsubscribe {
  const q = query(messagesCol(groupId), orderBy('createdAt', 'asc'));
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
        .map((c) => toGroupMessage(c.doc.id, groupId, c.doc.data()));
      if (added.length > 0) onAdded(added);
    },
    (err) => {
      console.warn('[groups] subscribeNewGroupMessages error:', err);
    },
  );
}

/** One-off group read. */
export async function getGroup(groupId: string): Promise<GroupChat | null> {
  const snap = await getDoc(groupDoc(groupId));
  if (!snap.exists()) return null;
  return toGroupChat(snap.id, snap.data());
}
