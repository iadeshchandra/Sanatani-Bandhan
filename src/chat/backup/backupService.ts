/**
 * chat/backup/backupService.ts — the backup pipeline.
 * ====================================================
 * serialize → seal (passphrase + recovery openers) → upload → prune.
 *
 * WHAT'S BACKED UP: the user's 1:1 conversations (chats/*) AND their
 * group chats (chatGroups/*) — messages, member lists, group metadata.
 * Voice notes are backed up as File Vault `vault://` references, never
 * audio bytes. The backup never silently skips a conversation family.
 *
 * PRIVACY CONTRACT:
 *  - The passphrase and recovery code NEVER leave this module's callers'
 *    memory. They are never written to localStorage, Firestore, or logs.
 *  - The Drive file carries two sealed envelopes (openers): one openable
 *    with the user's sealing words, one with the recovery key. Either
 *    opens the same payload.
 *  - Media: chat messages carry no binary (text/blessing/
 *    request_card/system/voice). Voice notes store File Vault
 *    `vault://` references here — never bytes.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { ChatMessage, ChatThread } from '../types';
import type { GroupChat } from '../groups/types';
import {
  toSerializedMessage,
  threadKind,
  isValidBackupFile,
  type SerializedMessage,
  type SerializedThread,
  type SerializedGroupMember,
  type BackupPayload,
  type BackupFile,
} from './serialize';

/** Re-exported for existing consumers (ArchiveViewer, archiveStore, RestorePrompt). */
export type { SerializedMessage, SerializedThread, SerializedGroupMember, BackupPayload, BackupFile };
export { toSerializedMessage, threadKind, isValidBackupFile };
import {
  sealWithPassphrase,
  sealWithRecoveryCode,
  openWithPassphrase,
  openWithRecoveryCode,
  generateRecoveryCode,
} from './crypto';
import {
  requestDriveAccess,
  hasDriveAccess,
  listBackups,
  uploadBackup,
  downloadBackup,
  deleteBackup,
  backupFileName,
  type DriveBackupFile,
} from './driveClient';

/* ------------------------------------------------------------------ */
/* Payload types — pure shapes live in ./serialize (jest-safe).        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Local metadata (never the passphrase)                               */
/* ------------------------------------------------------------------ */

const META_KEY = 'sb.chatBackup.meta';
const RESTORED_KEY = 'sb.chatBackup.restored';

export type BackupSchedule = 'off' | 'daily' | 'weekly' | 'monthly';

export interface BackupMeta {
  lastBackupAt: number | null;
  lastChatCount: number;
  lastMessageCount: number;
  schedule: BackupSchedule;
  /** User completed passphrase setup at least once. */
  sealReady: boolean;
  /** Last known remote backup (for the restore prompt). */
  lastRemoteName?: string;
}

const DEFAULT_META: BackupMeta = {
  lastBackupAt: null,
  lastChatCount: 0,
  lastMessageCount: 0,
  schedule: 'off',
  sealReady: false,
};

export function readBackupMeta(): BackupMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META };
    return { ...DEFAULT_META, ...(JSON.parse(raw) as Partial<BackupMeta>) };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function writeBackupMeta(patch: Partial<BackupMeta>): BackupMeta {
  const next = { ...readBackupMeta(), ...patch };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {
    /* private mode — meta just won't persist */
  }
  return next;
}

export function markRestored(fileId: string): void {
  try {
    localStorage.setItem(RESTORED_KEY, fileId);
  } catch {
    /* ignore */
  }
}

export function restoredFileId(): string | null {
  try {
    return localStorage.getItem(RESTORED_KEY);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Serialization — pure shapes in ./serialize; I/O below.             */
/* ------------------------------------------------------------------ */

/** Best-effort: attach a light snapshot of the linked money request. Never throws. */
async function enrichRequestSnapshot(sm: SerializedMessage, m: ChatMessage): Promise<void> {
  if (!m.requestId) return;
  sm.requestId = m.requestId;
  try {
    const rq = await getDoc(doc(db, 'p2pRequests', m.requestId));
    if (rq.exists()) {
      const r = rq.data() as Record<string, unknown>;
      sm.requestSnapshot = {
        amount: Number(r.amount || 0),
        currency: String(r.currency || ''),
        status: String(r.status || ''),
        note: String(r.note || ''),
      };
    }
  } catch {
    /* request unreadable — message text still backs up */
  }
}

async function serializeChats(uid: string): Promise<{ threads: SerializedThread[]; messageCount: number }> {
  const threadsSnap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid)));
  const threads: SerializedThread[] = [];
  let messageCount = 0;

  for (const tDoc of threadsSnap.docs) {
    const t = tDoc.data() as ChatThread;
    const msgsSnap = await getDocs(collection(db, 'chats', tDoc.id, 'messages'));
    const messages: SerializedMessage[] = [];
    for (const mDoc of msgsSnap.docs) {
      const m = mDoc.data() as ChatMessage;
      const sm = toSerializedMessage(mDoc.id, m);
      await enrichRequestSnapshot(sm, m);
      messages.push(sm);
    }
    messages.sort((a, b) => a.createdAt - b.createdAt);
    messageCount += messages.length;
    const info: SerializedThread['participantInfo'] = {};
    for (const [k, p] of Object.entries(t.participantInfo || {})) {
      info[k] = { uid: p.uid, displayName: p.displayName, sanataniId: p.sanataniId, photoUrl: p.photoUrl };
    }
    threads.push({
      id: tDoc.id,
      kind: 'direct',
      type: t.type,
      participants: t.participants,
      participantInfo: info,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      messages,
    });
  }
  threads.sort((a, b) => b.updatedAt - a.updatedAt);
  return { threads, messageCount };
}

/**
 * Group chats: the user's groups (memberIds array-contains uid) with their
 * messages, member lists, and group metadata. The doc's denormalized
 * memberInfo is the backup source — no extra subcollection reads.
 */
async function serializeGroups(uid: string): Promise<{ threads: SerializedThread[]; messageCount: number }> {
  const groupsSnap = await getDocs(query(collection(db, 'chatGroups'), where('memberIds', 'array-contains', uid)));
  const threads: SerializedThread[] = [];
  let messageCount = 0;

  for (const gDoc of groupsSnap.docs) {
    const g = gDoc.data() as GroupChat;
    const msgsSnap = await getDocs(collection(db, 'chatGroups', gDoc.id, 'messages'));
    const messages: SerializedMessage[] = [];
    for (const mDoc of msgsSnap.docs) {
      const m = mDoc.data() as ChatMessage;
      const sm = toSerializedMessage(mDoc.id, m);
      await enrichRequestSnapshot(sm, m);
      messages.push(sm);
    }
    messages.sort((a, b) => a.createdAt - b.createdAt);
    messageCount += messages.length;

    const memberIds = g.memberIds || [];
    const adminIds = new Set(g.adminIds || []);
    const members: SerializedGroupMember[] = memberIds.map((mid) => ({
      uid: mid,
      displayName: g.memberInfo?.[mid]?.displayName || 'Sanatani',
      role: adminIds.has(mid) ? 'admin' : 'member',
    }));
    const info: SerializedThread['participantInfo'] = {};
    for (const mid of memberIds) {
      const p = g.memberInfo?.[mid];
      if (p) info[mid] = { uid: p.uid, displayName: p.displayName, sanataniId: p.sanataniId, photoUrl: p.photoUrl };
    }
    threads.push({
      id: gDoc.id,
      kind: 'group',
      type: 'group',
      participants: memberIds,
      participantInfo: info,
      groupName: g.name,
      groupType: g.type,
      groupDescription: g.description,
      members,
      inviteCode: g.inviteCode,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      messages,
    });
  }
  threads.sort((a, b) => b.updatedAt - a.updatedAt);
  return { threads, messageCount };
}

/* ------------------------------------------------------------------ */
/* Backup                                                              */
/* ------------------------------------------------------------------ */

export interface BackupResult {
  chatCount: number;
  messageCount: number;
  fileName: string;
  /** Fresh recovery key for THIS copy — show once, then forget. */
  recoveryCode: string;
}

/**
 * Full pipeline: serialize (1:1 + groups) → seal with both openers → upload → prune.
 * The passphrase lives only in this call's memory. A fresh recovery key
 * is minted per backup and returned for one-time display.
 */
export async function performBackup(uid: string, passphrase: string): Promise<BackupResult> {
  const [{ threads: chatThreads, messageCount: chatMessages }, { threads: groupThreads, messageCount: groupMessages }] =
    await Promise.all([serializeChats(uid), serializeGroups(uid)]);
  const threads = [...chatThreads, ...groupThreads].sort((a, b) => b.updatedAt - a.updatedAt);
  const messageCount = chatMessages + groupMessages;
  const payload: BackupPayload = { v: 1, exportedAt: Date.now(), exportedBy: uid, threads };
  const meta = { chatCount: threads.length, messageCount };
  const recoveryCode = generateRecoveryCode();

  const [passphraseEnv, recoveryEnv] = await Promise.all([
    sealWithPassphrase(payload, passphrase, meta),
    sealWithRecoveryCode(payload, recoveryCode, meta),
  ]);

  const file: BackupFile = {
    v: 1,
    createdAt: Date.now(),
    chatCount: threads.length,
    messageCount,
    openers: { passphrase: passphraseEnv, recovery: recoveryEnv },
  };

  const token = await requestDriveAccess();
  const name = backupFileName();
  await uploadBackup(token, name, JSON.stringify(file));
  await pruneBackups(token, 3);

  writeBackupMeta({
    lastBackupAt: Date.now(),
    lastChatCount: threads.length,
    lastMessageCount: messageCount,
    sealReady: true,
    lastRemoteName: name,
  });
  return { chatCount: threads.length, messageCount, fileName: name, recoveryCode };
}

/** Keep the newest `keep` backups; delete older ones. Never throws. */
export async function pruneBackups(token: string, keep = 3): Promise<void> {
  try {
    const files = await listBackups(token);
    for (const f of files.slice(keep)) {
      try {
        await deleteBackup(token, f.id);
      } catch {
        /* one prune failure must not break the backup */
      }
    }
  } catch {
    /* listing failed — pruning is best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface RestoreInput {
  file: DriveBackupFile;
  /** Provide exactly one of these. */
  passphrase?: string;
  recoveryCode?: string;
}

/** Download + open a backup file. Returns the decrypted payload. */
export async function restoreBackup(input: RestoreInput): Promise<BackupPayload> {
  const token = await requestDriveAccess();
  const text = await downloadBackup(token, input.file.id);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('bad-backup-file');
  }
  if (!isValidBackupFile(parsed)) throw new Error('bad-backup-file');

  let payload: unknown;
  if (input.passphrase) {
    payload = await openWithPassphrase(parsed.openers.passphrase, input.passphrase);
  } else if (input.recoveryCode) {
    payload = await openWithRecoveryCode(parsed.openers.recovery, input.recoveryCode);
  } else {
    throw new Error('no-credential');
  }
  const p = payload as BackupPayload;
  if (!p || p.v !== 1 || !Array.isArray(p.threads)) throw new Error('bad-backup-file');
  markRestored(input.file.id);
  return p;
}

/** Newest remote backup, or null. Silent (no popup) — null when no token. */
export async function newestRemoteBackup(): Promise<DriveBackupFile | null> {
  if (!hasDriveAccess()) return null;
  try {
    const token = await requestDriveAccess();
    const files = await listBackups(token);
    return files[0] || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

const DUE_MS: Record<Exclude<BackupSchedule, 'off'>, number> = {
  daily: 20 * 3600_000,
  weekly: 6 * 86400_000,
  monthly: 29 * 86400_000,
};

/** Is an automatic backup due? Pure function of meta + now. */
export function isBackupDue(meta: BackupMeta, now: number = Date.now()): boolean {
  if (meta.schedule === 'off' || !meta.sealReady) return false;
  if (!meta.lastBackupAt) return true;
  return now - meta.lastBackupAt >= DUE_MS[meta.schedule];
}
