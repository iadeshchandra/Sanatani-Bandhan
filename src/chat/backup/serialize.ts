/**
 * chat/backup/serialize.ts — pure backup serialization shapes.
 * =============================================================
 * Firebase-free by design: every function here is unit-testable under
 * jest without ESM shims. The Firestore enumeration lives in
 * backupService.ts, which re-exports these for convenience.
 *
 * BACKUP SCOPE LAW: 1:1 conversations AND group chats — messages, member
 * lists, group metadata. Voice notes keep only the vault:// pointer.
 * Nothing is silently skipped.
 */
import type { ChatMessage } from '../types';
import type { GroupMessage } from '../groups/types';
import { isValidEnvelope, type BackupEnvelope } from './crypto';

export interface SerializedMessage {
  id: string;
  senderId: string;
  /** Group chats: who spoke (1:1 chats omit this). */
  senderName?: string;
  kind: string;
  text: string;
  blessingMeta?: { occasion: string; occasionBn?: string; occasionHi?: string };
  requestId?: string;
  /** Light snapshot of the linked money request, if resolvable. */
  requestSnapshot?: {
    amount: number;
    currency: string;
    status: string;
    note: string;
  };
  /** Voice notes: the vault:// pointer only — never audio bytes. */
  voiceMeta?: { vaultUrl: string; durationMs: number; contentType: string };
  createdAt: number;
  deliveredAt?: number;
  readBy?: string[];
}

export interface SerializedGroupMember {
  uid: string;
  displayName: string;
  role: 'admin' | 'member';
}

export interface SerializedThread {
  id: string;
  /** 'direct' for 1:1 chats, 'group' for group chats. Absent in pre-group backups → 'direct'. */
  kind: 'direct' | 'group';
  type: string;
  participants: string[];
  participantInfo: Record<string, { uid: string; displayName: string; sanataniId?: string; photoUrl?: string }>;
  /** Group chats only. */
  groupName?: string;
  groupType?: string;
  groupDescription?: string;
  members?: SerializedGroupMember[];
  /** The group's invite code — the user's own data, sealed with everything else. */
  inviteCode?: string;
  createdAt: number;
  updatedAt: number;
  messages: SerializedMessage[];
}

export interface BackupPayload {
  v: 1;
  exportedAt: number;
  exportedBy: string;
  threads: SerializedThread[];
}

/**
 * Normalize the thread kind for payloads written before groups were backed up.
 * Old archives have no `kind` field — they are always 1:1 conversations.
 */
export function threadKind(t: { kind?: string }): 'direct' | 'group' {
  return t.kind === 'group' ? 'group' : 'direct';
}

/**
 * Pure: Firestore message → serialized shape. No I/O.
 * Voice notes keep only the vault:// pointer (never bytes); group messages
 * keep sender attribution.
 */
export function toSerializedMessage(docId: string, m: ChatMessage): SerializedMessage {
  const sm: SerializedMessage = {
    id: docId,
    senderId: m.senderId,
    kind: m.kind,
    text: m.text || '',
    createdAt: m.createdAt,
  };
  const maybeGroup = m as Partial<GroupMessage>;
  if (typeof maybeGroup.senderName === 'string' && maybeGroup.senderName) {
    sm.senderName = maybeGroup.senderName;
  }
  if (m.blessingMeta) sm.blessingMeta = m.blessingMeta;
  if (m.voiceMeta) {
    sm.voiceMeta = {
      vaultUrl: m.voiceMeta.vaultUrl,
      durationMs: m.voiceMeta.durationMs,
      contentType: m.voiceMeta.contentType,
    };
  }
  if (m.deliveredAt) sm.deliveredAt = m.deliveredAt;
  if (m.readBy) sm.readBy = m.readBy;
  return sm;
}

/** The file stored in the user's Drive: two openers, one payload. */
export interface BackupFile {
  v: 1;
  createdAt: number;
  chatCount: number;
  messageCount: number;
  openers: {
    passphrase: BackupEnvelope;
    recovery: BackupEnvelope;
  };
}

export function isValidBackupFile(x: unknown): x is BackupFile {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  return (
    f.v === 1 &&
    !!f.openers &&
    typeof f.openers === 'object' &&
    isValidEnvelope((f.openers as Record<string, unknown>).passphrase) &&
    isValidEnvelope((f.openers as Record<string, unknown>).recovery)
  );
}
