/**
 * chat/backup/driveClient.ts — Google Drive appDataFolder client.
 * ===============================================================
 * SCOPE DISCIPLINE: this module requests exactly one OAuth scope —
 *   https://www.googleapis.com/auth/drive.appdata
 * a NON-SENSITIVE scope granting access to a hidden per-app folder only.
 * The app can never see the user's photos, documents, or other Drive files.
 * Never broaden this. If a future feature needs more, it gets its own
 * consent screen and its own review — never piggyback here.
 *
 * Auth: incremental. The user is already signed in via Firebase; we open
 * ONE popup with a dedicated GoogleAuthProvider carrying only the Drive
 * scope, and keep the short-lived access token in sessionStorage (never
 * localStorage — it should not outlive the tab more than necessary).
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const TOKEN_KEY = 'sb.chatBackup.driveToken';
const TOKEN_EXPIRY_KEY = 'sb.chatBackup.driveTokenExp';

interface CachedToken {
  token: string;
  exp: number;
}

function readCachedToken(): CachedToken | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const exp = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0');
    if (!token || !exp) return null;
    // 5-minute safety margin before the ~60min Google expiry.
    if (Date.now() > exp - 5 * 60_000) return null;
    return { token, exp };
  } catch {
    return null;
  }
}

function cacheToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 55 * 60_000));
  } catch {
    /* sessionStorage unavailable (private mode) — token just won't persist */
  }
}

export function clearDriveToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Incremental OAuth: one popup asking ONLY for the hidden app-folder scope.
 * Returns a Drive API access token. Throws 'popup-closed' / 'auth-failed'
 * for the UI to translate gently.
 */
export async function requestDriveAccess(): Promise<string> {
  const cached = readCachedToken();
  if (cached) return cached.token;

  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_APPDATA_SCOPE);
  // Don't re-request profile/email — the user is already signed in.
  provider.setCustomParameters({ prompt: 'consent' });

  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code || '';
    if (code.includes('popup-closed') || code.includes('cancelled')) throw new Error('popup-closed');
    throw new Error('auth-failed');
  }
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;
  if (!token) throw new Error('auth-failed');
  cacheToken(token);
  return token;
}

/** Silent check: do we hold a usable token WITHOUT popping anything? */
export function hasDriveAccess(): boolean {
  return readCachedToken() !== null;
}

async function driveFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    // Token died mid-session — drop it so the next call re-prompts.
    clearDriveToken();
    throw new Error('drive-auth-expired');
  }
  return res;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

const BACKUP_NAME_PREFIX = 'sb-chat-backup-';

/** List our backup files in the hidden app folder, newest first. */
export async function listBackups(token: string): Promise<DriveBackupFile[]> {
  const q = encodeURIComponent(`name contains '${BACKUP_NAME_PREFIX}' and trashed = false`);
  const res = await driveFetch(
    token,
    `/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&pageSize=20`
  );
  if (!res.ok) throw new Error('drive-list-failed');
  const json = (await res.json()) as { files?: DriveBackupFile[] };
  return json.files || [];
}

/**
 * Upload one backup file (multipart: metadata + JSON body).
 * Name: sb-chat-backup-<ISO date>.enc.json
 */
export async function uploadBackup(token: string, fileName: string, jsonBody: string): Promise<DriveBackupFile> {
  const metadata = {
    name: fileName,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };
  const boundary = `sb_backup_${Date.now().toString(36)}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${jsonBody}\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(token, '/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error('drive-upload-failed');
  return (await res.json()) as DriveBackupFile;
}

/** Download a backup file's content as text. */
export async function downloadBackup(token: string, fileId: string): Promise<string> {
  const res = await driveFetch(token, `/drive/v3/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error('drive-download-failed');
  return res.text();
}

/** Delete a backup file (used for pruning to the last 3). */
export async function deleteBackup(token: string, fileId: string): Promise<void> {
  const res = await driveFetch(token, `/drive/v3/files/${fileId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('drive-delete-failed');
}

export function backupFileName(when: Date = new Date()): string {
  // File-safe ISO: sb-chat-backup-2026-10-17T11-30-00.enc.json
  const iso = when.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${BACKUP_NAME_PREFIX}${iso}.enc.json`;
}
