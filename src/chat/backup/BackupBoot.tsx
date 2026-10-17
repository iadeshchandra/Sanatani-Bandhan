/**
 * chat/backup/BackupBoot.tsx — quiet lifecycle hooks for chat backup.
 * ===================================================================
 * Mounted once inside <Chat/>. On mount it:
 *  1. Checks the 30-day gentle nudge (self-throttled, never nagging).
 *  2. Looks for a sealed backup in the user's Drive on fresh devices and
 *     offers restore — once per remote file (dismissal is remembered per
 *     file so "Later" is respected).
 *  3. If a scheduled backup is due AND a Drive token is warm (no popup),
 *     shows a calm inline banner inviting one-tap backup — the honest
 *     PWA version of "automatic": it happens while the app is open,
 *     with the user's words, never silently.
 */
import React, { useEffect, useState } from 'react';
import { useBackupStrings, fillTemplate } from './strings';
import { RestorePrompt } from './RestorePrompt';
import {
  newestRemoteBackup,
  isBackupDue,
  readBackupMeta,
  performBackup,
  type BackupPayload,
} from './backupService';
import { hasDriveAccess, type DriveBackupFile } from './driveClient';
import { hasArchive } from './archiveStore';
import { checkBackupNudge } from './nudge';
import { PassphrasePrompt } from './PassphrasePrompt';

const DISMISSED_KEY = 'sb.chatBackup.dismissedRestore';

function dismissedFor(fileId: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === fileId;
  } catch {
    return false;
  }
}

function dismissFor(fileId: string): void {
  try {
    localStorage.setItem(DISMISSED_KEY, fileId);
  } catch {
    /* ignore */
  }
}

export const BackupBoot: React.FC<{ uid: string }> = ({ uid }) => {
  const { tr } = useBackupStrings();
  const [restoreFile, setRestoreFile] = useState<DriveBackupFile | null>(null);
  const [dueBanner, setDueBanner] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1. Gentle nudge — always safe.
      await checkBackupNudge(uid);
      if (!alive) return;

      // 2. Restore offer — only when this device holds no archive yet.
      try {
        const archived = await hasArchive();
        if (!archived && hasDriveAccess()) {
          const newest = await newestRemoteBackup();
          if (alive && newest && !dismissedFor(newest.id)) {
            setRestoreFile(newest);
          }
        }
      } catch {
        /* restore detection is best-effort */
      }
      if (!alive) return;

      // 3. Due banner — scheduled backup while the app is open.
      try {
        const meta = readBackupMeta();
        if (isBackupDue(meta) && hasDriveAccess()) {
          setDueBanner(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  const onRestored = (_payload: BackupPayload) => {
    setRestoreFile(null);
    setDoneMsg(fillTemplate(tr.restoreDone, { n: _payload.threads.length }));
  };

  const runDueBackup = async (passphrase: string) => {
    setBusy(true);
    try {
      await performBackup(uid, passphrase);
      setDueBanner(false);
      setPrompting(false);
    } catch {
      /* stays dismissible — the banner simply returns next open */
      setPrompting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {restoreFile && (
        <RestorePrompt
          uid={uid}
          file={restoreFile}
          onDone={onRestored}
          onDismiss={() => {
            dismissFor(restoreFile.id);
            setRestoreFile(null);
          }}
        />
      )}

      {dueBanner && !prompting && (
        <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            📦
          </span>
          <p className="flex-1 text-xs font-semibold text-amber-900 leading-relaxed">{tr.nudgeBody}</p>
          <button
            type="button"
            onClick={() => setPrompting(true)}
            className="min-h-[44px] px-4 rounded-2xl bg-amber-700 text-white text-xs font-extrabold shrink-0"
          >
            {tr.backupNow}
          </button>
          <button
            type="button"
            onClick={() => setDueBanner(false)}
            aria-label={tr.restoreLater}
            className="min-h-[44px] min-w-[44px] rounded-full text-stone-500 text-lg shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {prompting && (
        <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-stone-200 bg-white p-4">
          <PassphrasePrompt onSubmit={runDueBackup} onCancel={() => setPrompting(false)} busy={busy} />
        </div>
      )}

      {doneMsg && (
        <p role="status" className="mx-3 mt-2 shrink-0 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5">
          {doneMsg}
        </p>
      )}
    </>
  );
};
