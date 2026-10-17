/**
 * chat/backup/backupService.ts — the backup pipeline.
 * ====================================================
 * serialize → seal (passphrase + recovery openers) → upload → prune.
 *
 * PRIVACY CONTRACT:
 *  - The passphrase and recovery code NEVER leave this module's callers'
 *    memory. They are never written to localStorage, Firestore, or logs.
 *  - The Drive file carries two sealed envelopes (openers): one openable
 *    with the user's sealing words, one with the recovery key. Either
 *    opens the same payload.
 *  - Media: chat messages carry no binary today (text/blessing/
 *    request_card/system). If media kinds land later, store File Vault
 *    `vault://` references here — never bytes.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { ChatMessage, ChatThread } from '../types';
import {
  sealWithPassphrase,
  sealWithRecoveryCode,
  openWithPassphrase,
  openWithRecoveryCode,
  generateRecoveryCode,
  isValidEnvelope,
  type BackupEnvelope,
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
/* Payload types                                                       */
/* ------------------------------------------------------------------ */

export interface SerializedMessage {
  id: string;
  senderId: string;
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
  createdAt: number;
  deliveredAt?: number;
  readBy?: string[];
}

export interface SerializedThread {
  id: string;
  type: string;
  participants: string[];
  participantInfo: Record<string, { uid: string; displayName: string; sanataniId?: string; photoUrl?: string }>;
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
/* Serialization                                                       */
/* ------------------------------------------------------------------ */

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
      const sm: SerializedMessage = {
        id: mDoc.id,
        senderId: m.senderId,
        kind: m.kind,
        text: m.text || '',
        createdAt: m.createdAt,
      };
      if (m.blessingMeta) sm.blessingMeta = m.blessingMeta;
      if (m.requestId) {
        sm.requestId = m.requestId;
        // Best-effort snapshot of the linked money request.
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
      if (m.deliveredAt) sm.deliveredAt = m.deliveredAt;
      if (m.readBy) sm.readBy = m.readBy;
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
 * Full pipeline: serialize → seal with both openers → upload → prune.
 * The passphrase lives only in this call's memory. A fresh recovery key
 * is minted per backup and returned for one-time display.
 */
export async function performBackup(uid: string, passphrase: string): Promise<BackupResult> {
  const { threads, messageCount } = await serializeChats(uid);
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
