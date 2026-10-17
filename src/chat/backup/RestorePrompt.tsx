/**
 * chat/backup/RestorePrompt.tsx — "We found your chat history."
 * ============================================================
 * Shown on a fresh device when a sealed backup waits in the user's Drive.
 * Words or recovery key — either opens the seal. Restored words land in
 * the device-local archive (never back into shared Firestore threads).
 */
import React, { useState } from 'react';
import { useBackupStrings, fillTemplate } from './strings';
import { restoreBackup, type BackupPayload } from './backupService';
import { saveArchive } from './archiveStore';
import type { DriveBackupFile } from './driveClient';

export const RestorePrompt: React.FC<{
  uid: string;
  file: DriveBackupFile;
  onDone: (payload: BackupPayload) => void;
  onDismiss: () => void;
}> = ({ uid, file, onDone, onDismiss }) => {
  void uid;
  const { tr, lang } = useBackupStrings();
  const [mode, setMode] = useState<'words' | 'recovery'>('words');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const date = new Date(file.createdTime).toLocaleDateString(
    lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const submit = async () => {
    if (!secret.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = await restoreBackup({
        file,
        ...(mode === 'words' ? { passphrase: secret } : { recoveryCode: secret }),
      });
      await saveArchive(payload);
      onDone(payload);
    } catch (e: unknown) {
      const kind = (e as Error).message;
      setError(kind === 'wrong-passphrase' ? tr.restoreWrongKey : tr.backupFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-label={tr.restoreFound}
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2" aria-hidden>
            📦
          </div>
          <h3 className="text-lg font-extrabold text-stone-900">{tr.restoreFound}</h3>
          <p className="text-sm text-stone-600 mt-1 leading-relaxed">
            {fillTemplate(tr.restoreDesc, { date })}
          </p>
        </div>

        <div className="flex rounded-2xl bg-stone-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('words');
              setSecret('');
              setError('');
            }}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-extrabold ${
              mode === 'words' ? 'bg-white shadow text-stone-900' : 'text-stone-500'
            }`}
          >
            🪔 {tr.passphraseTitle}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('recovery');
              setSecret('');
              setError('');
            }}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-extrabold ${
              mode === 'recovery' ? 'bg-white shadow text-stone-900' : 'text-stone-500'
            }`}
          >
            🔑 {tr.recoveryTitle}
          </button>
        </div>

        <label className="block">
          <span className="sr-only">
            {mode === 'words' ? tr.passphrasePlaceholder : tr.recoveryTitle}
          </span>
          <input
            type={mode === 'words' ? 'password' : 'text'}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={mode === 'words' ? tr.passphrasePlaceholder : tr.recoveryTitle}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            className="w-full min-h-[48px] rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-sm font-bold text-stone-600 disabled:opacity-50"
          >
            {tr.restoreLater}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !secret.trim()}
            className="flex-[2] min-h-[48px] rounded-2xl bg-gradient-to-br from-amber-700 to-orange-700 text-white text-sm font-extrabold shadow disabled:opacity-50"
          >
            {busy ? tr.backingUp : `🏠 ${tr.restoreNow}`}
          </button>
        </div>
      </div>
    </div>
  );
};
